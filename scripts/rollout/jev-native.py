#!/usr/bin/env python3
"""Parameterized code-only Jev lifecycle. Invoked through private JSON files only.

Actions: inspect, stage, activate, rollback. No action executes on import. Never
restore/initialize operating data, alter config, signal an unowned process, force
kill or erase uncertainty. The JS dispatcher holds the durable operation lock.
"""
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath
import hashlib
import json
import os
import plistlib
import re
import shutil
import sqlite3
import stat
import subprocess
import tarfile
import time
import urllib.request
from urllib.parse import urlparse


class Refusal(RuntimeError): pass
class Deferred(Refusal): pass
class Uncertain(Refusal): pass


def require(condition, code):
    if not condition:
        error = Refusal(code); error.reason_code = code
        raise error


def sha(data): return hashlib.sha256(data).hexdigest()
def canonical(value): return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode()
def manifest_sha(value): return sha(canonical(value))


def date(value):
    try:
        parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
        return parsed.replace(tzinfo=timezone.utc).timestamp() if parsed.tzinfo is None else parsed.timestamp()
    except (ValueError, TypeError, AttributeError): return 0


def release_fingerprint(release):
    # Match rollout.mjs releaseIdentity/JSON.stringify insertion order exactly.
    value = {**release, 'archive': {k: v for k, v in release.get('archive', {}).items() if k != 'path'}, 'contract': {k: v for k, v in release['contract'].items() if k != 'path'}}
    return sha(json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode())


def policy_gate(request):
    policy, release, service = request['policy'], request['release'], request['service']['id']
    now = time.time()
    require(policy.get('schemaVersion') in [None, 1] and policy.get('enabled') is True and all(isinstance(policy.get(key), str) and policy[key].strip() for key in ['approvedBy', 'approvalRef']) and date(policy.get('expiresAt')) > now, 'standing-approval')
    require(service == 'jev' and service in policy.get('services', []), 'standing-service-scope')
    stop = Path(policy.get('stopFile', ''))
    require(stop.is_absolute() and not stop.exists() and not stop.is_symlink(), 'stop-switch')
    if request.get('mode') == 'adopt':
        artifact = request['artifact']
        require(request['action'] == 'inspect' and artifact == request['config']['baselineArtifact'], 'adopt-current-inspection-only')
        require(release['version'] == '0.7.1' and release['contract']['version'] == '1' and artifact['ui'] == {'version': '0.7.1', 'contractVersion': '1'} and artifact['packageSha256'] == release['archive']['sha256'], 'adopt-exact-current-binding')
        return
    require(request.get('mode') == 'standing', 'explicit-native-standing-mode')
    if request['action'] == 'rollback': require(policy.get('rollbackApproved') is True and policy.get('rollbackScope') == 'code-only', 'code-only-rollback-approval')
    version = lambda value: tuple(map(int, value.split('.'))) if isinstance(value, str) and re.fullmatch(r'(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)', value) else ()
    before, after = version(release.get('previousVersion')), version(release.get('version'))
    require(len(before) == 3 and len(after) == 3 and before[:2] == after[:2] == (0, 7) and after[2] == before[2] + 1, 'consecutive-patch-required')
    migration = policy.get('reviewedMigration')
    migrated = isinstance(migration, dict) and all(isinstance(migration.get(key), str) and migration[key].strip() for key in ['approvedBy', 'approvalRef', 'reason']) and date(migration.get('expiresAt')) > now and all(migration.get(key) == release.get(key) for key in ['releaseId', 'version', 'sourceRevision', 'siteSourceRevision', 'changes']) and migration.get('archiveSha256') == release['archive']['sha256'] and migration.get('contractSha256') == release['contract']['sha256'] and service in migration.get('services', [])
    require((release.get('changes') == ['fix'] or migrated) and release['contract']['version'] == '1', 'fix-only-contract1-required')
    window = policy.get('patchWindow')
    require(isinstance(window, dict), 'active-patch-window-required')
    if 'startsAt' in window: require(0 < date(window['startsAt']) <= now, 'patch-window-not-active')
    if 'expiresAt' in window: require(date(window['expiresAt']) > now, 'patch-window-expired')
    low, high = version(window.get('minVersion')), version(window.get('maxVersion'))
    require(len(low) == 3 and len(high) == 3 and low[:2] == high[:2] == after[:2] and low[2] <= after[2] <= high[2], 'patch-window-version')
    require(window.get('contractVersion') == release['contract']['version'] and ('services' not in window or service in window['services']), 'patch-window-contract-service')


def execution_gate(request):
    """The local caller owns the single release approval and machine lock.

    No legacy policy is manufactured. An invocation already in flight completes
    its durable transaction; cancellation is enforced at the caller's boundary.
    """
    if request.get('mode') != 'local':
        policy_gate(request)
        return
    require(not any(key in request for key in ['policy', 'generation', 'generationSha256', 'sourceAdoption']), 'legacy-authority-in-local-request')
    require(re.fullmatch('[a-f0-9]{64}', request.get('planSha256', '')) is not None, 'exact-local-plan-required')
    require(request['service']['id'] == 'jev' and request['action'] in ['inspect', 'inspect-transaction', 'deploy', 'rollback'], 'local-native-action')
    release = request['release']
    require(re.fullmatch(r'0\.7\.(0|[1-9]\d*)', release.get('version', '')) is not None and release['contract']['version'] == '1', 'local-supported-release')
    require(request['config'].get('privateFiles') == 'metadata-only', 'local-private-metadata-only')


def frozen_release(release):
    for key in ['archive', 'contract'] + (['account'] if release.get('account') else []):
        entry = release[key]; path = Path(entry['path'])
        require(path.is_absolute(), 'frozen-release-path'); regular(path)
        require(sha(path.read_bytes()) == entry['sha256'], 'frozen-release-digest')


def path_identity(path):
    s = path.stat(); return [s.st_dev, s.st_ino, s.st_mode & 0o777, s.st_uid]


def regular(path):
    require(path.is_file() and not path.is_symlink() and path.stat().st_nlink == 1 and path.stat().st_uid == os.getuid(), 'regular-owned-file-required')


def private_directory(path):
    require(path.is_absolute(), 'absolute-directory-required')
    path.mkdir(parents=True, exist_ok=True, mode=0o700)
    s = path.lstat()
    require(stat.S_ISDIR(s.st_mode) and not path.is_symlink() and s.st_uid == os.getuid() and not s.st_mode & 0o077, 'private-directory-required')


def write_private(path, value):
    flags = os.O_WRONLY | os.O_CREAT | os.O_NOFOLLOW
    fd = os.open(path, flags, 0o600)
    try:
        s = os.fstat(fd)
        require(stat.S_ISREG(s.st_mode) and s.st_nlink == 1 and s.st_uid == os.getuid(), 'private-result-required')
        os.fchmod(fd, 0o600)
        os.ftruncate(fd, 0)
        with os.fdopen(fd, 'w', closefd=False) as f:
            f.write(json.dumps(value, indent=2) + '\n'); f.flush(); os.fsync(f.fileno())
    finally: os.close(fd)


def record_phase(directory, record, phase):
    record['phase'] = phase
    temporary = directory / 'transaction.next.json'
    require(not temporary.exists() and not temporary.is_symlink(), 'unfinished-record-write')
    write_private(temporary, record)
    temporary.rename(directory / 'transaction.json')
    fd = os.open(directory, os.O_RDONLY)
    try: os.fsync(fd)
    finally: os.close(fd)


def forbidden(name):
    return bool(re.fullmatch(r'(?:\.env(?:\..*)?|server\.env|password\.json|state\.sqlite(?:-.*)?|api-key|tests|test-results|playwright-report|(?:coral|fish|jellyfish|turtle|whale)\.png)', name))


def code_manifest(root):
    require(root.is_dir() and not root.is_symlink(), 'real-app-directory-required')
    root = root.resolve()
    result = {}
    for path in sorted(root.rglob('*')):
        require(not forbidden(path.name), 'forbidden-code-member')
        name = str(path.relative_to(root))
        if path.is_symlink():
            target = os.readlink(path)
            require(not Path(target).is_absolute(), 'absolute-code-link')
            resolved = path.resolve(strict=True)
            require(resolved.is_relative_to(root), 'escaping-code-link')
            result[name] = {'type': 'symlink', 'target': target, 'resolvedTarget': str(resolved.relative_to(root))}
        elif path.is_file():
            regular(path)
            data = path.read_bytes(); result[name] = {'bytes': len(data), 'sha256': sha(data)}
        else: require(path.is_dir(), 'unsupported-code-member')
    return result


def validate_archive(archive, manifest):
    regular(archive)
    with tarfile.open(archive) as tar:
        seen, all_names = set(), set()
        for entry in tar:
            path = PurePosixPath(entry.name)
            require(not path.is_absolute() and '..' not in path.parts and path.parts and path.parts[0] == 'standalone', 'archive-path')
            require(not any(forbidden(part) for part in path.parts), 'archive-forbidden-member')
            require(entry.name not in all_names, 'duplicate-archive-member'); all_names.add(entry.name)
            require(entry.isdir() or entry.isfile() or entry.issym(), 'archive-member-type')
            if entry.isdir(): continue
            name = str(PurePosixPath(*path.parts[1:]))
            require(name in manifest and name not in seen, 'unexpected-archive-member'); seen.add(name)
            expected = manifest[name]
            if entry.issym():
                require(expected.get('type') == 'symlink' and entry.linkname == expected['target'] and not PurePosixPath(entry.linkname).is_absolute(), 'archive-link')
                # Resolve lexically within the root before creating any link.
                parts = list(PurePosixPath(name).parent.parts)
                for part in PurePosixPath(entry.linkname).parts:
                    if part == '..': require(bool(parts), 'archive-link-escape'); parts.pop()
                    elif part != '.': parts.append(part)
                require('/'.join(parts) == expected['resolvedTarget'], 'archive-link-target')
            else:
                require(expected.get('type') != 'symlink', 'archive-regular-type')
                data = tar.extractfile(entry).read()
                require(expected == {'bytes': len(data), 'sha256': sha(data)}, 'archive-bytes')
        require(seen == set(manifest), 'archive-missing-member')


def extract_code(archive, destination, manifest):
    validate_archive(archive, manifest)
    require(not destination.exists() and not destination.is_symlink(), 'existing-stage')
    destination.mkdir(mode=0o700)
    with tarfile.open(archive) as tar:
        for entry in tar:
            if not entry.isfile(): continue
            name = str(PurePosixPath(*PurePosixPath(entry.name).parts[1:]))
            output = destination / name
            output.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
            with output.open('xb') as f: f.write(tar.extractfile(entry).read())
            output.chmod(entry.mode & 0o777)
        for name, expected in manifest.items():
            if expected.get('type') == 'symlink':
                output = destination / name
                output.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
                output.symlink_to(expected['target'])
    require(code_manifest(destination) == manifest, 'extracted-code-mismatch')


def fingerprint(conn):
    require(conn.execute('PRAGMA integrity_check').fetchall() == [('ok',)], 'database-integrity')
    schema = conn.execute("SELECT type,name,tbl_name,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name").fetchall()
    counts, tables = {}, {}
    for (name,) in conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"):
        quoted = '"' + name.replace('"', '""') + '"'
        # Row material stays in memory only; no values, identifiers or sessions
        # are written to the receipt or emitted on failure.
        rows = sorted(repr(tuple(row)) for row in conn.execute('SELECT * FROM ' + quoted))
        counts[name] = len(rows); tables[name] = sha(canonical(rows))
    return {'integrity': 'ok', 'tableCounts': counts, 'logicalSha256': sha(canonical([schema, tables]))}


def readonly(path): return sqlite3.connect(path.resolve().as_uri() + '?mode=ro', uri=True, timeout=5)


def backup_verified(source, backup, proof):
    require(not backup.exists() and not backup.is_symlink() and not proof.exists() and not proof.is_symlink(), 'existing-backup')
    regular(source)
    with closing(readonly(source)) as incoming:
        incoming.execute('BEGIN'); expected = fingerprint(incoming)
        with closing(sqlite3.connect(backup)) as outgoing:
            os.chmod(backup, 0o600); incoming.backup(outgoing)
            require(fingerprint(outgoing) == expected, 'backup-mismatch')
    with closing(readonly(backup)) as incoming:
        with closing(sqlite3.connect(proof)) as outgoing:
            os.chmod(proof, 0o600); incoming.backup(outgoing)
            require(fingerprint(outgoing) == expected, 'scratch-restore-mismatch')
    with closing(sqlite3.connect(backup.resolve().as_uri() + '?mode=ro&immutable=1', uri=True)) as standalone:
        require(fingerprint(standalone) == expected, 'backup-not-independent')
    return expected


def file_metadata(path):
    regular(path); s = path.stat()
    require(s.st_uid == os.getuid() and not s.st_mode & 0o077, 'protected-file-ownership')
    # Nanosecond timestamps exceed JavaScript's exact JSON-number range.
    return [s.st_dev, s.st_ino, s.st_size, str(s.st_mtime_ns), s.st_mode & 0o777, s.st_uid]


def private_json(path):
    file_metadata(path)
    require(path.stat().st_size <= 8 * 1024 * 1024, 'private-json-size')
    return json.loads(path.read_text())


def artifact_manifest(artifact):
    require(artifact.get('immutable') is True, 'immutable-artifact-required')
    require(re.fullmatch('[a-f0-9]{64}', artifact.get('packageSha256', '')) is not None, 'frozen-ui-archive-binding')
    archive, path = Path(artifact['path']), Path(artifact['manifestPath'])
    require(archive.is_absolute() and path.is_absolute(), 'absolute-artifact-paths')
    regular(archive); regular(path)
    require(sha(archive.read_bytes()) == artifact['sha256'], 'artifact-archive-digest')
    manifest = json.loads(path.read_text())
    require(manifest_sha(manifest) == artifact['manifestSha256'], 'artifact-manifest-digest')
    validate_archive(archive, manifest)
    return manifest


def public_identity(service, artifact):
    return {'schemaVersion': 1, 'appId': service.get('appId', service.get('identity', {}).get('appId', service['id'])), 'artifactId': artifact['id'], 'sourceRevision': artifact['sourceRevision'], 'ui': artifact['ui']}


class Native:
    def __init__(self, config):
        self.config = config
        for key in ['baseDirectory', 'plistPath', 'nodeExecutable', 'databasePath', 'envPath', 'passwordPath']:
            require(Path(config[key]).is_absolute(), 'absolute-native-path-required')
        self.base = Path(config['baseDirectory']); self.app = self.base / 'app'
        require(self.base.resolve() == self.base and not self.base.is_symlink(), 'real-native-base-required')
        self.domain = f'gui/{os.getuid()}'
        require(config['label'] == 'dev.naeil.jev' and config['port'] == 2466, 'reviewed-native-service-required')
        self.label = self.domain + '/' + config['label']; self.plist = Path(config['plistPath'])
        self.db = Path(config['databasePath'])
        require(self.base.is_dir() and self.base.stat().st_uid == os.getuid(), 'native-base-owner')
        self.database_identity = config['databaseIdentity']
        self.retained = config['preserveDirectoryIdentities']
        require(set(self.retained) == set(config['preserveDirectories']) and len(self.retained) >= 2, 'retained-path-pins-required')

    def command(self, args):
        return subprocess.run(args, capture_output=True, text=True, timeout=20, env={'PATH': '/usr/bin:/bin:/usr/sbin:/sbin', 'HOME': str(Path.home()), 'NODE_PATH': '', 'NODE_OPTIONS': ''}, shell=False)

    def static(self):
        regular(self.plist)
        data = self.plist.read_bytes(); require(sha(data) == self.config['plistSha256'], 'plist-changed')
        plist = plistlib.loads(data)
        argv = [self.config['nodeExecutable'], '--env-file=' + self.config['envPath'], str(self.app / 'server.js')]
        require(plist.get('Label') == self.config['label'] and plist.get('ProgramArguments') == argv and plist.get('WorkingDirectory') == str(self.app) and plist.get('KeepAlive') is True, 'plist-contract')
        version = self.command([self.config['nodeExecutable'], '--version'])
        require(version.returncode == 0 and version.stdout.strip() == self.config['nodeVersion'], 'native-node-version')
        for key, metadata_key in [('envPath', 'envMetadata'), ('passwordPath', 'passwordMetadata')]:
            require(file_metadata(Path(self.config[key])) == self.config[metadata_key], 'protected-metadata-changed')
        if self.config.get('privateFiles') == 'metadata-only':
            # Local rollout pins protected descriptors without parsing sessions,
            # tokens or .env bytes. Configuration identity is owner provisioned.
            self.preserved()
            return
        values = {}
        # Never log raw parser errors or values. Full file metadata is pinned.
        for line in Path(self.config['envPath']).read_text().splitlines():
            line = line.strip()
            if not line or line.startswith('#'): continue
            if line.startswith('export '): line = line[7:]
            require('=' in line, 'unsupported-env-syntax')
            key, value = line.split('=', 1); key = key.strip(); value = value.strip()
            require(re.fullmatch('[A-Za-z_][A-Za-z0-9_]*', key) is not None and key not in values, 'env-key-contract')
            if len(value) >= 2 and value[0] in ['"', "'"] and value[-1] == value[0]: value = value[1:-1]
            values[key] = value
        require(sorted(values) == sorted(self.config['envKeys']), 'env-keys-changed')
        require('JEV_PASSWORD_FILE' not in values and 'NEXT_MANUAL_SIG_HANDLE' not in values, 'legacy-or-manual-signal-config')
        require(bool(values.get('NAEIL_SUPABASE_ANON_KEY')) and bool(values.get('NAEIL_SUPABASE_URL')), 'shared-session-keys-required')
        supabase = urlparse(values['NAEIL_SUPABASE_URL'])
        require(supabase.scheme == 'https' and bool(supabase.netloc) and not supabase.username and not supabase.password, 'shared-session-url')
        require(values.get('APP_ORIGIN', 'https://jev.naeil.dev') == self.config['appOrigin'], 'application-origin-changed')
        require(Path(values.get('JEV_DATA_DB', str(Path.home() / '.local/share/jev/state.sqlite'))) == self.db, 'database-config-changed')
        self.preserved()

    def preserved(self):
        for key, metadata_key in [('envPath', 'envMetadata'), ('passwordPath', 'passwordMetadata')]:
            require(file_metadata(Path(self.config[key])) == self.config[metadata_key], 'protected-metadata-changed')
        regular(self.db)
        require(self.db.resolve() == self.db and path_identity(self.db) == self.database_identity and not self.db.stat().st_mode & 0o077, 'database-path-replaced')
        for path, expected in self.retained.items():
            p = Path(path); require(p.is_absolute() and p.is_dir() and not p.is_symlink() and p.resolve() == p and p.stat().st_uid == os.getuid() and path_identity(p) == expected, 'retained-release-changed')

    def listener(self):
        output = self.command(['/usr/sbin/lsof', '-nP', '-iTCP:2466', '-sTCP:LISTEN', '-Fp'])
        require(output.returncode in (0, 1), 'listener-inspection')
        pids = sorted({int(row[1:]) for row in output.stdout.splitlines() if row.startswith('p')})
        require(len(pids) <= 1, 'multiple-listeners')
        if not pids: return None
        pid = pids[0]; self.owned_process(pid)
        return pid

    def owned_process(self, pid):
        result = self.command(['/bin/ps', '-p', str(pid), '-o', 'uid=,ppid=,comm='])
        require(result.returncode == 0, 'process-inspection')
        fields = result.stdout.strip().split(None, 2)
        require(len(fields) == 3 and int(fields[0]) == os.getuid() and int(fields[1]) == 1 and fields[2].startswith('next-server'), 'process-owner')
        cwd = self.command(['/usr/sbin/lsof', '-a', '-p', str(pid), '-d', 'cwd', '-Fn'])
        require(cwd.returncode == 0 and 'n' + str(self.app) in cwd.stdout.splitlines(), 'process-cwd')

    def job(self):
        result = self.command(['/bin/launchctl', 'list']); require(result.returncode == 0, 'launchd-inspection')
        rows = [row.split() for row in result.stdout.splitlines() if row.split()[-1:] == [self.config['label']]]
        require(len(rows) <= 1, 'duplicate-job')
        return (False, None) if not rows else (True, None if rows[0][0] == '-' else int(rows[0][0]))

    def app_pids(self):
        result = self.command(['/usr/sbin/lsof', '-a', '-u', str(os.getuid()), '-d', 'cwd', '-Fpn'])
        require(result.returncode in (0, 1), 'app-process-inspection')
        current, pids = None, []
        for row in result.stdout.splitlines():
            if row.startswith('p'): current = int(row[1:])
            elif row == 'n' + str(self.app): require(current is not None, 'process-metadata'); pids.append(current)
        return sorted(set(pids))

    def ownership(self):
        pid = self.listener()
        require(pid is not None and self.job() == (True, pid) and self.app_pids() == [pid], 'job-listener-ownership')
        return pid

    def idle(self):
        pid = self.ownership()
        sockets = self.command(['/usr/sbin/lsof', '-nP', '-a', '-p', str(pid), '-iTCP', '-sTCP:ESTABLISHED', '-Fp'])
        require(sockets.returncode in (0, 1), 'socket-inspection')
        if sockets.returncode != 1 or sockets.stdout.strip(): raise Deferred('app-connections-busy')
        with closing(readonly(self.db)) as conn:
            count = conn.execute('SELECT count(*) FROM leases').fetchone()[0]
        if count: raise Deferred('app-leases-busy')

    def preflight(self):
        self.static(); self.idle(); time.sleep(0.5); self.idle()

    def backup(self, release, name):
        report = backup_verified(self.db, release / f'{name}-state.sqlite', release / f'{name}-restore-proof.sqlite')
        write_private(release / f'{name}-backup.json', report)

    def stop(self, allow_unhealthy=False):
        pid = self.listener(); registered, job_pid = self.job(); pids = self.app_pids()
        require(not pids or registered and pids == [job_pid], 'unowned-app-process')
        if pid is not None:
            require(registered and job_pid == pid, 'stop-ownership')
            self.idle()
        else:
            require(allow_unhealthy, 'missing-listener')
            if pids: self.owned_process(job_pid)
        if registered:
            # launchd applies its own ExitTimeOut. We issue no forced signal and
            # never rename code until job/listener/processes have disappeared.
            try:
                stopped = self.command(['/bin/launchctl', 'bootout', self.label])
                if stopped.returncode != 0: raise Uncertain('bootout-incomplete')
            except Exception: raise Uncertain('bootout-uncertain') from None
        deadline = time.monotonic() + 60
        while time.monotonic() < deadline:
            if not self.app_pids() and self.listener() is None and not self.job()[0]: return
            time.sleep(0.25)
        raise Uncertain('owned-process-survived')

    def start(self):
        self.static()
        require(not self.app_pids() and self.listener() is None and not self.job()[0], 'startup-ownership')
        for _ in range(5):
            if self.command(['/bin/launchctl', 'bootstrap', self.domain, str(self.plist)]).returncode == 0: return
            time.sleep(1)
        raise Refusal('bootstrap-failed')

    def health(self, identity):
        deadline = time.monotonic() + 30
        while time.monotonic() < deadline:
            try:
                self.ownership()
                with urllib.request.urlopen('http://127.0.0.1:2466/api/health', timeout=2) as response:
                    require(response.status == 200 and json.load(response).get('ok') is True, 'health')
                with urllib.request.urlopen('http://127.0.0.1:2466/.well-known/naeil-ui.json', timeout=2) as response:
                    require(response.status == 200 and json.load(response) == identity, 'served-identity')
                return
            except Exception: time.sleep(0.5)
        raise Refusal('local-health-identity')

    def ensure_running(self, identity):
        if not self.job()[0]: self.start()
        self.health(identity)


def activate_transaction(ops, release, record, guard=lambda: None):
    require(record['phase'] == 'staged', 'transaction-not-staged')
    staged, previous = release / 'staged-app', release / 'previous-app'
    require(not previous.exists() and not previous.is_symlink(), 'existing-recovery-code')
    require(code_manifest(ops.app) == record['before'] and code_manifest(staged) == record['after'], 'pre-swap-code-changed')
    stopped = False
    try:
        guard(); ops.preflight()
        backup_directory = release
        backup_names = [f'{stage}-{suffix}' for stage in ['online', 'stopped'] for suffix in ['state.sqlite', 'restore-proof.sqlite', 'backup.json']]
        if record.get('backupAttempts') or any((release / name).exists() or (release / name).is_symlink() for name in backup_names):
            # A proven pre-stop deferral can retry the same staged transaction.
            # Retain its original backup/proof/report bytes and give this attempt
            # a new destination instead of weakening backup_verified's no-clobber.
            attempts = record.setdefault('backupAttempts', [])
            require(isinstance(attempts, list) and len(attempts) < 1000 and attempts == [f'backup-attempt-{index + 2}' for index in range(len(attempts))], 'backup-attempt-binding')
            name = f'backup-attempt-{len(attempts) + 2}'; backup_directory = release / name
            require(not backup_directory.exists() and not backup_directory.is_symlink(), 'backup-attempt-exists')
            private_directory(backup_directory); attempts.append(name); record_phase(release, record, 'staged')
        ops.backup(backup_directory, 'online'); guard(); ops.preflight(); ops.idle(); guard()
        record_phase(release, record, 'stopping'); stopped = True; ops.stop()
        record_phase(release, record, 'stopped'); ops.backup(backup_directory, 'stopped')
        guard(); ops.static()
        require(code_manifest(ops.app) == record['before'] and code_manifest(staged) == record['after'], 'code-changed-while-stopping')
        record_phase(release, record, 'swapping'); ops.app.rename(previous); staged.rename(ops.app)
        record_phase(release, record, 'starting'); guard(); ops.start(); ops.health(record['identity'])
        require(code_manifest(ops.app) == record['after'], 'active-code-changed')
        ops.preserved(); record_phase(release, record, 'active')
    except Uncertain:
        record_phase(release, record, 'uncertain'); raise
    except BaseException as error:
        if not stopped: raise
        try:
            if previous.exists():
                require(code_manifest(previous) == record['before'], 'recovery-code-changed')
                ops.stop(allow_unhealthy=True)
                if ops.app.exists():
                    failed = release / 'failed-app'; require(not failed.exists() and not failed.is_symlink(), 'existing-failed-code')
                    ops.app.rename(failed)
                previous.rename(ops.app); ops.start(); ops.health(record['previousIdentity'])
            else: ops.ensure_running(record['previousIdentity'])
            require(code_manifest(ops.app) == record['before'], 'recovered-code-changed')
            ops.preserved(); record_phase(release, record, 'recovered')
        except BaseException:
            record_phase(release, record, 'uncertain'); raise Uncertain('recovery-incomplete') from None
        recovered = Refusal('activation-failed-current-code-recovered')
        recovered.recovered_identity = record['previousIdentity']
        raise recovered from error


def transaction_record(request, ops):
    release = Path(request['transactionDirectory'])
    require(release.parent == ops.base / 'releases' and release.name == 'ui-' + request['attemptId'], 'transaction-directory')
    require(release.parent.is_dir() and not release.parent.is_symlink() and release.parent.resolve() == release.parent and release.parent.stat().st_uid == os.getuid(), 'release-parent-ownership')
    require(release.is_dir() and not release.is_symlink(), 'real-transaction-directory')
    record = private_json(release / 'transaction.json')
    for key in ['attemptId', 'idempotencyKey', 'releaseId', 'serviceId']:
        expected = request['release']['releaseId'] if key == 'releaseId' else request['service']['id'] if key == 'serviceId' else request[key]
        require(record[key] == expected, 'transaction-binding')
    require(record['artifact'] == request['artifact'] and record['previousArtifact'] == request['previousArtifact'], 'transaction-artifact-binding')
    if request.get('mode') == 'local': require(record.get('planSha256') == request['planSha256'], 'transaction-plan-binding')
    require(record['configSha256'] == sha(canonical(request['config'])) and record['releaseFingerprint'] == release_fingerprint(request['release']), 'transaction-config-release-binding')
    return release, record


def transaction_binding(record):
    return sha(canonical({key: record.get(key) for key in ['schemaVersion', 'releaseId', 'serviceId', 'attemptId', 'idempotencyKey', 'planSha256', 'configSha256', 'releaseFingerprint', 'before', 'after', 'identity', 'previousIdentity', 'artifact', 'previousArtifact']}))


def latest_rollback(release, record):
    attempts = record.get('rollbackAttempts', [])
    require(isinstance(attempts, list) and len(attempts) <= 1000 and attempts == ['rollback' if index == 0 else f'rollback-{index + 1}' for index in range(len(attempts))], 'rollback-attempt-binding')
    if not attempts:
        require(not (release / 'rollback').exists() and not (release / 'rollback').is_symlink(), 'unbound-rollback-attempt')
        return None, None
    path = release / attempts[-1]
    require(path.is_dir() and not path.is_symlink(), 'rollback-attempt-directory')
    recovery = private_json(path / 'transaction.json')
    require(recovery.get('transactionBindingSha256') == transaction_binding(record) and recovery.get('action') == 'rollback' and recovery.get('attemptDirectory') == path.name, 'rollback-attempt-binding')
    require(recovery['before'] == record['after'] and recovery['after'] == record['before'] and recovery['identity'] == record['previousIdentity'] and recovery['previousIdentity'] == record['identity'], 'rollback-target-binding')
    return path, recovery


def transaction_journal(release, record):
    paths = ['transaction.json']
    rollback, _ = latest_rollback(release, record)
    if rollback: paths.append(str(rollback.relative_to(release) / 'transaction.json'))
    result = {}
    for name in paths:
        private_json(release / name)
        result[name] = sha((release / name).read_bytes())
    return result


def inspect_transaction(request, ops, release, record):
    artifact = request.get('inspectionArtifact')
    require(artifact in [record['previousArtifact'], record['artifact']], 'transaction-inspection-artifact')
    expected = record['before'] if artifact == record['previousArtifact'] else record['after']
    require(code_manifest(ops.app) == expected, 'transaction-inspection-code')
    identity = public_identity(request['service'], artifact)
    require(json.loads((ops.app / 'public/.well-known/naeil-ui.json').read_text()) == identity, 'transaction-inspection-identity')
    require((ops.app / '.next/BUILD_ID').read_text().strip() == artifact['buildId'], 'transaction-inspection-build')
    journal = transaction_journal(release, record)
    ops.ownership(); ops.health(identity); ops.preserved()
    require(code_manifest(ops.app) == expected and transaction_journal(release, record) == journal, 'transaction-inspection-drift')
    return {'schemaVersion': 1, 'passed': True, 'safe': True, 'action': 'inspect-transaction', 'planSha256': request['planSha256'], 'releaseId': record['releaseId'], 'serviceId': 'jev', 'attemptId': request['attemptId'], 'idempotencyKey': request['idempotencyKey'], 'artifact': artifact, 'journal': journal, 'identity': identity}


def reconciliation_proof(request, ops, release, record):
    reference = request.get('rollbackReconciliation')
    require(isinstance(reference, dict) and set(reference) == {'path', 'sha256'} and re.fullmatch('[a-f0-9]{64}', reference.get('sha256', '')) is not None, 'rollback-reconciliation-required')
    path = Path(reference['path']); require(path.is_absolute() and path.resolve() == path and path.stat().st_size <= 2 * 1024 * 1024, 'rollback-reconciliation-file')
    proof = private_json(path); require(sha(path.read_bytes()) == reference['sha256'], 'rollback-reconciliation-digest')
    expected = {'schemaVersion': 1, 'kind': 'rollback-reconciliation', 'planSha256': request['planSha256'], 'releaseId': record['releaseId'], 'serviceId': 'jev', 'transactionId': request['attemptId'], 'stage': 'rollback-inspect', 'status': 'observed', 'artifact': record['artifact']}
    require(all(proof.get(key) == value for key, value in expected.items()), 'rollback-reconciliation-binding')
    inspection = inspect_transaction({**request, 'inspectionArtifact': record['artifact']}, ops, release, record)
    observed = proof.get('nativeInspection', {})
    require(isinstance(observed, dict) and set(observed).issubset(set(inspection) | {'outcome'}) and observed.get('outcome', 'completed') == 'completed' and all(observed.get(key) == value for key, value in inspection.items()), 'rollback-reconciliation-journal-drift')
    return reference


def local_rollback(request, ops, release, record):
    rollback, recovery = latest_rollback(release, record)
    # A known completed swap whose receipt was lost is reconciled by observing
    # its exact predecessor, never by stopping or swapping code a second time.
    if record['phase'] == 'rolled-back' or recovery and recovery['phase'] == 'active':
        inspect_transaction({**request, 'inspectionArtifact': record['previousArtifact']}, ops, release, record)
        if record['phase'] != 'rolled-back': record_phase(release, record, 'rolled-back')
        return
    inspect_transaction({**request, 'inspectionArtifact': record['artifact']}, ops, release, record)
    proof = None
    # A bound staged/recovered attempt already established that no unresolved
    # mutation remains, even if the original deployment journal was incomplete.
    if (not recovery and record['phase'] != 'active') or (recovery and recovery['phase'] not in ['staged', 'recovered']):
        if not request.get('rollbackReconciliation'): raise Uncertain('rollback-attempt-uncertain')
        proof = reconciliation_proof(request, ops, release, record)
    if record['phase'] != 'active':
        # Preserve the interrupted deployment journal before appending recovery
        # attempts. This is a fresh exact-predecessor rollback, never deploy replay.
        raw = (release / 'transaction.json').read_bytes()
        preserved = release / ('deploy-uncertain-' + sha(raw) + '.json')
        if preserved.exists() or preserved.is_symlink():
            private_json(preserved); require(preserved.read_bytes() == raw, 'deployment-journal-preservation')
        else:
            with open(preserved, 'xb') as stream:
                os.chmod(preserved, 0o600); stream.write(raw); stream.flush(); os.fsync(stream.fileno())
            fd = os.open(release, os.O_RDONLY)
            try: os.fsync(fd)
            finally: os.close(fd)
    # Every explicit retry gets its own backups, proofs and failed-code paths.
    # Original transaction code and every prior attempt remain untouched.
    attempts = record.setdefault('rollbackAttempts', []); name = 'rollback' if not attempts else f'rollback-{len(attempts) + 1}'
    rollback = release / name; require(not rollback.exists() and not rollback.is_symlink(), 'rollback-attempt-exists')
    retained = release / 'previous-app'; require(code_manifest(retained) == record['before'], 'rollback-retained-predecessor-changed')
    attempts.append(name); record_phase(release, record, record['phase']); private_directory(rollback)
    recovery = {'phase': 'preparing', 'action': 'rollback', 'attemptDirectory': name, 'transactionBindingSha256': transaction_binding(record), 'before': record['after'], 'after': record['before'], 'identity': record['previousIdentity'], 'previousIdentity': record['identity']}
    if proof: recovery['reconciliation'] = proof
    record_phase(rollback, recovery, 'preparing'); shutil.copytree(retained, rollback / 'staged-app', symlinks=True)
    require(code_manifest(rollback / 'staged-app') == record['before'], 'rollback-staged-predecessor-changed')
    record_phase(rollback, recovery, 'staged'); activate_transaction(ops, rollback, recovery)
    record_phase(release, record, 'rolled-back')


def native_action(request):
    require(request.get('schemaVersion') == 1 and request['service']['id'] == 'jev', 'native-envelope')
    require(re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._-]{0,119}', request['attemptId']) is not None, 'native-attempt-id')
    local = request.get('mode') == 'local'
    execution_gate(request)
    if local:
        if request['action'] not in ['rollback', 'inspect-transaction']: frozen_release(request['release'])
        guard = lambda: None
    else:
        guard = lambda: (policy_gate(request), frozen_release(request['release']))
        guard()
    ops = Native(request['config']); ops.static()
    action = request['action']
    artifact = request['artifact']; manifest = artifact_manifest(artifact) if action not in ['rollback', 'inspect-transaction'] else None
    expected_identity = public_identity(request['service'], artifact)
    if action == 'inspect-transaction':
        require(local, 'transaction-inspection-local-only')
        release, record = transaction_record(request, ops)
        return inspect_transaction(request, ops, release, record)
    if action == 'inspect':
        require(code_manifest(ops.app) == manifest, 'current-code-does-not-match-artifact')
        require(json.loads((ops.app / 'public/.well-known/naeil-ui.json').read_text()) == expected_identity, 'current-identity')
        require((ops.app / '.next/BUILD_ID').read_text().strip() == artifact['buildId'], 'current-build')
        ops.ownership(); ops.health(expected_identity); ops.preserved()
        return {'passed': True, 'safe': True, 'identity': expected_identity}
    release = Path(request['transactionDirectory'])
    require(release.parent == ops.base / 'releases' and release.name == 'ui-' + request['attemptId'], 'transaction-directory')
    require(release.parent.is_dir() and not release.parent.is_symlink() and release.parent.resolve() == release.parent and release.parent.stat().st_uid == os.getuid(), 'release-parent-ownership')
    if action != 'rollback':
        require(artifact['ui'] == {'version': request['release']['version'], 'contractVersion': request['release']['contract']['version']}, 'target-ui-binding')
        require(artifact['packageSha256'] == request['release']['archive']['sha256'], 'target-ui-archive-binding')
        require(request['previousArtifact']['ui'] == {'version': request['release']['previousVersion'], 'contractVersion': request['release']['contract']['version']}, 'previous-verified-ui-binding')
    # A proven busy deferral can retain staged code. The caller permits this
    # retry only after a not-started receipt; unknown intents are never replayed.
    reuse_staged = local and action == 'deploy' and (release.exists() or release.is_symlink())
    if action in ['stage', 'deploy'] and not reuse_staged:
        require(not release.exists() and not release.is_symlink(), 'transaction-exists')
        previous = request['previousArtifact']; before = artifact_manifest(previous)
        require(code_manifest(ops.app) == before, 'predecessor-code-changed'); ops.ownership()
        guard(); private_directory(release)
        record = {'schemaVersion': 1, 'releaseId': request['release']['releaseId'], 'serviceId': 'jev', 'idempotencyKey': request['idempotencyKey'], 'attemptId': request['attemptId'], 'configSha256': sha(canonical(request['config'])), 'releaseFingerprint': release_fingerprint(request['release']), 'phase': 'preparing', 'before': before, 'after': manifest, 'identity': expected_identity, 'previousIdentity': public_identity(request['service'], previous), 'artifact': artifact, 'previousArtifact': previous}
        if local: record['planSha256'] = request['planSha256']
        record_phase(release, record, 'preparing')
        extract_code(Path(artifact['path']), release / 'staged-app', manifest)
        require(json.loads((release / 'staged-app/public/.well-known/naeil-ui.json').read_text()) == expected_identity, 'staged-identity')
        require((release / 'staged-app/.next/BUILD_ID').read_text().strip() == artifact['buildId'], 'staged-build')
        record_phase(release, record, 'staged')
        if action == 'stage': return {'passed': True, 'safe': True}
    require(action in ['activate', 'deploy', 'rollback'], 'unknown-native-action')
    require(release.is_dir() and not release.is_symlink(), 'real-transaction-directory')
    release, record = transaction_record(request, ops)
    if action in ['activate', 'deploy']: activate_transaction(ops, release, record, guard)
    elif local: local_rollback(request, ops, release, record)
    else:
        require(record['phase'] == 'active' and code_manifest(ops.app) == record['after'], 'rollback-active-code')
        previous = request['previousArtifact']; old = artifact_manifest(previous)
        rollback = release / 'rollback'; require(not rollback.exists() and not rollback.is_symlink(), 'rollback-already-attempted')
        private_directory(rollback); extract_code(Path(previous['path']), rollback / 'staged-app', old)
        recovery = {'phase': 'staged', 'before': record['after'], 'after': old, 'identity': record['previousIdentity'], 'previousIdentity': record['identity']}
        record_phase(rollback, recovery, 'staged'); activate_transaction(ops, rollback, recovery, guard)
        record_phase(release, record, 'rolled-back')
    return {'passed': True, 'safe': True, 'activated': True}


def main():
    os.umask(0o077)
    request = private_json(Path(os.environ['NAEIL_ROLLOUT_INPUT']))
    output = Path(os.environ['NAEIL_ROLLOUT_OUTPUT'])
    binding = {key: request[key] for key in ['schemaVersion', 'attemptId', 'idempotencyKey']}
    if request.get('mode') == 'local': binding['planSha256'] = request['planSha256']
    binding.update({'releaseId': request['release']['releaseId'], 'serviceId': request['service']['id'], 'action': request['action']})
    try: result = native_action(request)
    except Deferred: result = {'passed': False, 'safe': True, 'deferred': True, 'reason': 'native-busy-deferred', 'outcome': 'not-started'}
    except Uncertain: result = {'passed': False, 'safe': False, 'reason': 'native-state-uncertain', 'outcome': 'unknown'}
    except BaseException as error:
        # Determine safety from the durable record, never from a raw exception.
        safe = request['action'] in ['inspect', 'inspect-transaction', 'stage']
        phase = None
        transaction = Path(request.get('transactionDirectory', '/nonexistent')) / 'transaction.json'
        if transaction.exists():
            try:
                record = private_json(transaction)
                if request.get('mode') == 'local' and request['action'] == 'rollback' and record.get('rollbackAttempts'):
                    _, record = latest_rollback(transaction.parent, record)
                phase = record.get('phase')
                safe = phase in ['preparing', 'staged', 'recovered', 'rolled-back']
                if request.get('mode') == 'local' and request['action'] == 'rollback' and not record.get('rollbackAttempts') and record.get('action') != 'rollback' and phase == 'active': safe = True
            except Exception: safe = False
        result = {'passed': False, 'safe': safe, 'reason': 'native-operation-refused'}
        if request.get('mode') == 'local':
            known = isinstance(error, Refusal)
            recovered_identity = getattr(error, 'recovered_identity', None)
            recovered_artifact = next((artifact for artifact in [request.get('previousArtifact'), request.get('artifact')] if artifact and public_identity(request['service'], artifact) == recovered_identity), None)
            recovered = known and phase == 'recovered' and recovered_artifact is not None
            known_safe = known and (safe or request['action'] in ['inspect', 'inspect-transaction'])
            result.update({'safe': known_safe, 'outcome': 'failed' if recovered else 'not-started' if known_safe else 'unknown', 'phase': phase})
            if recovered: result.update({'recovered': True, 'artifact': recovered_artifact})
            code = getattr(error, 'reason_code', 'native-operation-refused')
            result['reasonCode'] = code if re.fullmatch('[a-z][a-z0-9-]{0,99}', code) else 'native-operation-refused'
    if request.get('mode') == 'local':
        result.setdefault('outcome', 'completed' if result.get('passed') is True else 'unknown')
    write_private(output, {**binding, **result})


if __name__ == '__main__':
    try: main()
    except BaseException: raise SystemExit('Jev native transport refused; inspect durable private state.') from None
