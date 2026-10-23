"""Synthetic code/storage/lifecycle tests. No installed Jev paths are used."""
import importlib.util
import json
import os
from pathlib import Path
import sqlite3
import tarfile
import tempfile
import unittest
from unittest.mock import patch
from types import SimpleNamespace

spec = importlib.util.spec_from_file_location('native', Path(__file__).with_name('jev-native.py'))
n = importlib.util.module_from_spec(spec)
spec.loader.exec_module(n)


class NativeTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name).resolve()

    def tearDown(self): self.temp.cleanup()

    def test_wal_backup_has_independent_restorable_snapshot(self):
        source = self.root / 'state.sqlite'
        with sqlite3.connect(source) as c:
            c.execute('PRAGMA journal_mode=WAL')
            c.execute('CREATE TABLE calls(id TEXT)')
            c.execute('INSERT INTO calls VALUES (?)', ('fictional',))
            c.commit()
            result = n.backup_verified(source, self.root / 'snapshot.sqlite', self.root / 'proof.sqlite')
            self.assertEqual(result['tableCounts'], {'calls': 1})
            with sqlite3.connect((self.root / 'snapshot.sqlite').as_uri() + '?mode=ro&immutable=1', uri=True) as b:
                self.assertEqual(b.execute('SELECT id FROM calls').fetchall(), [('fictional',)])

    def test_backup_never_overwrites_existing_destination(self):
        path = self.root / 'existing'; path.write_text('preserve')
        with self.assertRaises(n.Refusal): n.backup_verified(self.root / 'missing', path, self.root / 'proof')
        self.assertEqual(path.read_text(), 'preserve')

    def test_manifest_rejects_secret_filename_before_open(self):
        tree = self.root / 'tree'; tree.mkdir(); (tree / 'server.env').write_text('fictional')
        with self.assertRaises(n.Refusal): n.code_manifest(tree)

    def test_manifest_and_extract_preserve_internal_pnpm_links(self):
        tree = self.root / 'standalone'; (tree / 'node_modules/.pnpm/pkg').mkdir(parents=True)
        (tree / 'node_modules/.pnpm/pkg/index.js').write_text('fictional module')
        (tree / 'node_modules/pkg').symlink_to('.pnpm/pkg')
        manifest = n.code_manifest(tree)
        archive = self.root / 'standalone.tar.gz'
        with tarfile.open(archive, 'w:gz') as t: t.add(tree, arcname='standalone')
        n.validate_archive(archive, manifest)
        n.extract_code(archive, self.root / 'staged', manifest)
        self.assertEqual((self.root / 'staged/node_modules/pkg/index.js').read_text(), 'fictional module')
        self.assertTrue((self.root / 'staged/node_modules/pkg').is_symlink())

    def test_archive_traversal_and_external_links_refused(self):
        import io
        for name, target in [('standalone/../escape', None), ('standalone/link', '/outside')]:
            archive = self.root / 'bad.tar.gz'
            with tarfile.open(archive, 'w:gz') as t:
                entry = tarfile.TarInfo(name)
                if target: entry.type = tarfile.SYMTYPE; entry.linkname = target
                else: entry.size = 1
                t.addfile(entry, None if target else io.BytesIO(b'x'))
            with self.assertRaises(n.Refusal): n.validate_archive(archive, {})
        self.assertFalse((self.root / 'escape').exists())

    def setup_swap(self, **kwargs):
        ops = Fake(self.root, **kwargs)
        release = self.root / 'release'; release.mkdir()
        staged = release / 'staged-app'; staged.mkdir(); (staged / 'server.js').write_text('new')
        record = {'phase': 'staged', 'before': n.code_manifest(ops.app), 'after': n.code_manifest(staged), 'identity': {'artifactId': 'new'}, 'previousIdentity': {'artifactId': 'old'}}
        n.write_private(release / 'transaction.json', record)
        return ops, release, record

    def test_activation_preserves_old_code_and_database(self):
        ops, release, record = self.setup_swap()
        n.activate_transaction(ops, release, record)
        self.assertEqual((ops.app / 'server.js').read_text(), 'new')
        self.assertEqual((release / 'previous-app/server.js').read_text(), 'old')
        self.assertEqual((self.root / 'state.sqlite').read_text(), 'unchanged-data')
        self.assertEqual(ops.events, ['preflight', 'backup-online', 'preflight', 'idle', 'stop', 'backup-stopped', 'start', 'health-new', 'preserved'])
        self.assertEqual(json.loads((release / 'transaction.json').read_text())['phase'], 'active')

    def test_busy_refuses_without_stop_or_recovery_swap(self):
        ops, release, record = self.setup_swap(busy=True)
        with self.assertRaises(n.Deferred): n.activate_transaction(ops, release, record)
        self.assertEqual((ops.app / 'server.js').read_text(), 'old')
        self.assertNotIn('stop', ops.events)

    def test_start_failure_recovers_exact_old_code_and_retains_failed_code(self):
        ops, release, record = self.setup_swap(fail_start=True)
        with self.assertRaises(n.Refusal): n.activate_transaction(ops, release, record)
        self.assertEqual((ops.app / 'server.js').read_text(), 'old')
        self.assertEqual((release / 'failed-app/server.js').read_text(), 'new')
        self.assertEqual((self.root / 'state.sqlite').read_text(), 'unchanged-data')
        self.assertEqual(json.loads((release / 'transaction.json').read_text())['phase'], 'recovered')

    def test_changed_code_before_stop_cannot_be_swapped(self):
        ops, release, record = self.setup_swap(); (ops.app / 'server.js').write_text('concurrent')
        with self.assertRaises(n.Refusal): n.activate_transaction(ops, release, record)
        self.assertNotIn('stop', ops.events)

    def test_stopped_backup_failure_resumes_old_code(self):
        ops, release, record = self.setup_swap(fail_backup=True)
        with self.assertRaises(n.Refusal): n.activate_transaction(ops, release, record)
        self.assertEqual((ops.app / 'server.js').read_text(), 'old')
        self.assertTrue(ops.running)

    def test_surviving_process_blocks_rename_and_leaves_durable_uncertainty(self):
        ops, release, record = self.setup_swap(survives=True)
        with self.assertRaises(n.Uncertain): n.activate_transaction(ops, release, record)
        self.assertEqual((ops.app / 'server.js').read_text(), 'old')
        self.assertFalse((release / 'previous-app').exists())
        self.assertEqual(json.loads((release / 'transaction.json').read_text())['phase'], 'uncertain')

    def test_stop_or_expiry_during_online_backup_prevents_stop(self):
        for change in ['stop', 'expiry']:
            with self.subTest(change=change), tempfile.TemporaryDirectory() as d:
                root = Path(d); ops = Fake(root); release = root / 'release'; release.mkdir()
                staged = release / 'staged-app'; staged.mkdir(); (staged / 'server.js').write_text('new')
                record = {'phase': 'staged', 'before': n.code_manifest(ops.app), 'after': n.code_manifest(staged)}
                request = policy_request(root)
                backup = ops.backup
                def changed(directory, name):
                    backup(directory, name)
                    if change == 'stop': Path(request['policy']['stopFile']).touch()
                    else: request['policy']['expiresAt'] = '2000-01-01'
                ops.backup = changed
                with self.assertRaises(n.Refusal): n.activate_transaction(ops, release, record, guard=lambda: n.policy_gate(request))
                self.assertNotIn('stop', ops.events)
                self.assertEqual((ops.app / 'server.js').read_text(), 'old')

    def test_policy_rejects_disabled_scope_expiry_patch_contract_and_unapproved_rollback(self):
        request = policy_request(self.root); n.policy_gate(request)
        for update in [lambda r: r['policy'].update(enabled=False), lambda r: r['policy'].update(services=['other']), lambda r: r['policy'].update(expiresAt='2000-01-01'), lambda r: r['release'].update(version='0.8.0'), lambda r: r['policy']['patchWindow'].update(contractVersion='2'), lambda r: r.update(action='rollback')]:
            r = json.loads(json.dumps(request)); update(r)
            with self.assertRaises(n.Refusal): n.policy_gate(r)

    def test_dangling_stop_switch_is_active(self):
        request = policy_request(self.root); Path(request['policy']['stopFile']).symlink_to('missing')
        with self.assertRaises(n.Refusal): n.policy_gate(request)

    def test_dispatcher_policy_adopts_exact_current_without_predecessor_and_cannot_mutate(self):
        request = policy_request(self.root); request.update(mode='adopt', action='inspect')
        del request['policy']['schemaVersion']; del request['policy']['patchWindow']
        request['release'].update(version='0.7.1', previousVersion='0.1.0', changes=['dom', 'api'], archive={'sha256': 'e' * 64})
        artifact = {'id': 'actual-current', 'sourceRevision': 'a' * 40, 'ui': {'version': '0.7.1', 'contractVersion': '1'}, 'packageSha256': 'e' * 64}
        request.update(artifact=artifact, config={'baselineArtifact': json.loads(json.dumps(artifact))})
        n.policy_gate(request)
        for action in ['stage', 'activate', 'rollback']:
            with self.assertRaises(n.Refusal): n.policy_gate({**request, 'action': action})
        request['artifact']['sourceRevision'] = 'b' * 40
        with self.assertRaises(n.Refusal): n.policy_gate(request)

    def native_config(self):
        base = self.root / 'runtime'; base.mkdir(mode=0o700); (base / 'app').mkdir()
        env = base / 'server.env'; env.write_text('NAEIL_SUPABASE_URL=https://project.example.test\nNAEIL_SUPABASE_ANON_KEY=fictional-key\nAPP_ORIGIN=https://jev.naeil.dev\nJEV_DATA_DB=' + str(base / 'state.sqlite') + '\n'); env.chmod(0o600)
        password = base / 'password.json'; password.write_text('fictional-unused'); password.chmod(0o600)
        db = base / 'state.sqlite'
        with sqlite3.connect(db) as c: c.execute('CREATE TABLE leases(id TEXT)')
        db.chmod(0o600)
        retained = base / 'releases/current'; (retained / 'previous-app').mkdir(parents=True)
        paths = [retained, retained / 'previous-app']
        config = {'baseDirectory': str(base), 'plistPath': str(self.root / 'jev.plist'), 'nodeExecutable': '/fictional/node', 'nodeVersion': 'v22.23.2', 'label': 'dev.naeil.jev', 'port': 2466, 'appOrigin': 'https://jev.naeil.dev', 'databasePath': str(db), 'envPath': str(env), 'passwordPath': str(password), 'envKeys': ['NAEIL_SUPABASE_URL', 'NAEIL_SUPABASE_ANON_KEY', 'APP_ORIGIN', 'JEV_DATA_DB'], 'envMetadata': n.file_metadata(env), 'passwordMetadata': n.file_metadata(password), 'preserveDirectories': list(map(str, paths)), 'databaseIdentity': self.identity(db), 'preserveDirectoryIdentities': {str(p): self.identity(p) for p in paths}}
        import plistlib
        plist = {'Label': config['label'], 'ProgramArguments': [config['nodeExecutable'], '--env-file=' + str(env), str(base / 'app/server.js')], 'WorkingDirectory': str(base / 'app'), 'KeepAlive': True}
        Path(config['plistPath']).write_bytes(plistlib.dumps(plist)); config['plistSha256'] = n.sha(Path(config['plistPath']).read_bytes())
        return config

    @staticmethod
    def identity(path):
        s = path.stat(); return [s.st_dev, s.st_ino, s.st_mode & 0o777, s.st_uid]

    def test_exact_shared_session_config_and_retained_metadata_contract(self):
        config = self.native_config()
        with patch.object(n.Native, 'command', return_value=SimpleNamespace(returncode=0, stdout=config['nodeVersion'])):
            ops = n.Native(config); ops.static()
            for field in ['envMetadata', 'passwordMetadata', 'databaseIdentity']:
                changed = json.loads(json.dumps(config)); changed[field][1] += 1
                with self.assertRaises(n.Refusal): n.Native(changed).static()
            changed = json.loads(json.dumps(config)); changed['envKeys'].append('FOREIGN')
            with self.assertRaises(n.Refusal): n.Native(changed).static()
            retained = Path(config['preserveDirectories'][0]); retained.rename(retained.with_name('saved')); retained.mkdir()
            with self.assertRaises(n.Refusal): n.Native(config).static()

    def test_secret_output_file_hardlink_is_refused_before_truncation(self):
        original = self.root / 'existing'; original.write_text('untouched')
        alias = self.root / 'alias'; os.link(original, alias)
        with self.assertRaises(n.Refusal): n.write_private(alias, {'unexpected': True})
        self.assertEqual(original.read_text(), 'untouched')

    def test_idle_gate_checks_all_established_tcp_and_application_leases(self):
        config = self.native_config(); ops = n.Native(config)
        with patch.object(ops, 'ownership', return_value=123):
            with patch.object(ops, 'command', return_value=SimpleNamespace(returncode=0, stdout='p123\n')) as command:
                with self.assertRaises(n.Deferred): ops.idle()
                self.assertEqual(command.call_args.args[0], ['/usr/sbin/lsof', '-nP', '-a', '-p', '123', '-iTCP', '-sTCP:ESTABLISHED', '-Fp'])
            with sqlite3.connect(config['databasePath']) as c: c.execute('INSERT INTO leases VALUES (?)', ('fixture',))
            with patch.object(ops, 'command', return_value=SimpleNamespace(returncode=1, stdout='')):
                with self.assertRaises(n.Deferred): ops.idle()

    def artifact(self, version, name):
        tree = self.root / name / 'standalone'; (tree / 'public/.well-known').mkdir(parents=True); (tree / '.next').mkdir()
        artifact = {'id': name, 'sourceRevision': ('a' if version == '0.7.1' else 'b') * 40, 'ui': {'version': version, 'contractVersion': '1'}, 'packageSha256': 'c' * 64, 'immutable': True, 'buildId': name + '-build'}
        (tree / 'server.js').write_text(name)
        n.write_private(tree / 'public/.well-known/naeil-ui.json', n.public_identity({'id': 'jev'}, artifact))
        (tree / '.next/BUILD_ID').write_text(artifact['buildId'])
        manifest = n.code_manifest(tree); manifest_path = tree.parent / 'manifest.json'; n.write_private(manifest_path, manifest)
        archive = tree.parent / 'standalone.tar.gz'
        with tarfile.open(archive, 'w:gz') as t: t.add(tree, arcname='standalone')
        artifact.update({'path': str(archive), 'sha256': n.sha(archive.read_bytes()), 'manifestPath': str(manifest_path), 'manifestSha256': n.manifest_sha(manifest)})
        return artifact

    def test_complete_native_transaction_then_code_only_rollback_preserves_every_release(self):
        config = self.native_config(); old = self.artifact('0.7.1', 'old'); new = self.artifact('0.7.2', 'new')
        base = Path(config['baseDirectory']); (base / 'app').rmdir(); n.extract_code(Path(old['path']), base / 'app', n.artifact_manifest(old))
        request = policy_request(self.root)
        for key in ['archive', 'contract']:
            path = self.root / (key + '.json'); path.write_text('frozen synthetic ' + key)
            request['release'].setdefault(key, {}).update({'path': str(path), 'sha256': n.sha(path.read_bytes())})
        new['packageSha256'] = request['release']['archive']['sha256']
        request.update({'config': config, 'artifact': new, 'previousArtifact': old, 'attemptId': 'attempt-1', 'idempotencyKey': 'ui-0.7.2:jev', 'transactionDirectory': str(base / 'releases/ui-attempt-1')})
        request['policy'].update(rollbackApproved=True, rollbackScope='code-only')
        events = []
        class SyntheticNative(n.Native):
            def command(self, args): return SimpleNamespace(returncode=0, stdout=config['nodeVersion'])
            def ownership(self): return 123
            def idle(self): pass
            def preflight(self): self.static()
            def stop(self, **kwargs): events.append('stop')
            def start(self): self.static(); events.append('start')
            def health(self, identity):
                if json.loads((self.app / 'public/.well-known/naeil-ui.json').read_text()) != identity: raise n.Refusal('synthetic-identity')
            def ensure_running(self, identity): self.health(identity)
        with patch.object(n, 'Native', SyntheticNative):
            self.assertTrue(n.native_action({**request, 'action': 'stage'})['passed'])
            # Full config and release are bound independently of the artifact.
            changed = json.loads(json.dumps(request)); changed['config']['unexpected'] = True
            with self.assertRaises(n.Refusal): n.native_action(changed)
            self.assertEqual(events, [])
            self.assertTrue(n.native_action(request)['activated'])
            self.assertEqual(n.code_manifest(base / 'app'), n.artifact_manifest(new))
            transaction = Path(request['transactionDirectory'])
            self.assertEqual(n.code_manifest(transaction / 'previous-app'), n.artifact_manifest(old))
            self.assertTrue(n.native_action({**request, 'action': 'rollback'})['activated'])
            self.assertEqual(n.code_manifest(base / 'app'), n.artifact_manifest(old))
            self.assertEqual(n.code_manifest(transaction / 'rollback/previous-app'), n.artifact_manifest(new))
            self.assertEqual(n.code_manifest(transaction / 'previous-app'), n.artifact_manifest(old))
            self.assertEqual(json.loads((transaction / 'transaction.json').read_text())['phase'], 'rolled-back')
            self.assertEqual(events, ['stop', 'start', 'stop', 'start'])
            n.Native(config).preserved()
            for name in ['online', 'stopped']:
                self.assertTrue((transaction / (name + '-restore-proof.sqlite')).is_file())

    def test_native_private_transport_echoes_action_binding_and_generic_errors(self):
        request = {**policy_request(self.root), 'attemptId': 'attempt-1', 'idempotencyKey': 'release:jev', 'action': 'inspect'}
        incoming, outgoing = self.root / 'input.json', self.root / 'output.json'
        n.write_private(incoming, request)
        with patch.dict(os.environ, {'NAEIL_ROLLOUT_INPUT': str(incoming), 'NAEIL_ROLLOUT_OUTPUT': str(outgoing)}), patch.object(n, 'native_action', side_effect=n.Refusal('credential-or-provider-detail')):
            n.main()
        output = n.private_json(outgoing)
        self.assertEqual(output['attemptId'], request['attemptId']); self.assertEqual(output['releaseId'], request['release']['releaseId'])
        self.assertEqual(output['action'], 'inspect'); self.assertTrue(output['safe']); self.assertFalse(output['passed'])
        self.assertNotIn('credential-or-provider-detail', outgoing.read_text())


class Fake:
    def __init__(self, root, busy=False, fail_start=False, fail_backup=False, survives=False):
        self.app = root / 'app'; self.app.mkdir(); (self.app / 'server.js').write_text('old')
        (root / 'state.sqlite').write_text('unchanged-data')
        self.events = []; self.busy = busy; self.fail_start = fail_start; self.fail_backup = fail_backup; self.survives = survives; self.running = True

    def preflight(self):
        self.events.append('preflight')
        if self.busy: raise n.Deferred('busy')

    def static(self): pass
    def idle(self): self.events.append('idle')
    def backup(self, release, name):
        self.events.append('backup-' + name)
        if self.fail_backup and name == 'stopped': raise n.Refusal('backup')
    def stop(self, **kwargs):
        self.events.append('stop')
        if self.survives: raise n.Uncertain('surviving-process')
        self.running = False
    def start(self):
        self.events.append('start')
        if self.fail_start: self.fail_start = False; raise n.Refusal('startup')
        self.running = True
    def health(self, identity): self.events.append('health-' + identity['artifactId'])
    def ensure_running(self, identity):
        if not self.running: self.start()
        self.health(identity)
    def preserved(self): self.events.append('preserved')


def policy_request(root):
    return {'schemaVersion': 1, 'mode': 'standing', 'action': 'activate', 'service': {'id': 'jev'}, 'release': {'releaseId': 'ui-0.7.2', 'version': '0.7.2', 'previousVersion': '0.7.1', 'contract': {'version': '1'}, 'changes': ['fix']}, 'policy': {'schemaVersion': 1, 'enabled': True, 'approvedBy': 'fixture', 'approvalRef': 'fixture', 'expiresAt': '2099-01-01', 'services': ['jev'], 'stopFile': str(root / 'STOP'), 'patchWindow': {'approvedBy': 'fixture', 'approvalRef': 'fixture', 'reason': 'synthetic', 'startsAt': '2020-01-01', 'expiresAt': '2099-01-01', 'minVersion': '0.7.1', 'maxVersion': '0.7.9', 'services': ['jev'], 'contractVersion': '1'}}}


if __name__ == '__main__': unittest.main(verbosity=2)
