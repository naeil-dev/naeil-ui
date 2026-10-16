import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { digest } from './rollout.mjs';

const read = file => JSON.parse(readFileSync(file, 'utf8'));
const run = (cwd, file, args, env = {}) => execFileSync(file, args, { cwd, stdio: 'inherit', env: { ...process.env, ...env } });
function noEnvironmentFiles(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    assert(!/^\.env(?:\.|$)/.test(entry.name), 'Standalone artifact contains an environment file; secrets must be injected at runtime');
    if (entry.isDirectory()) noEnvironmentFiles(join(directory, entry.name));
  }
}

export async function packageStandalone(root, artifactDirectory) {
  assert(isAbsolute(artifactDirectory), 'Explicit absolute artifact store required');
  assert(existsSync(join(root, '.next/standalone/server.js')), 'Real Next standalone server missing; build with NAEIL_ROLLOUT_STANDALONE=1');
  const identity = read(join(root, '.next/naeil-rollout-build.json'));
  assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), identity.sourceRevision, 'Packaging source revision differs from build receipt');
  assert.equal(execFileSync('git', ['status', '--porcelain', '--untracked-files=normal'], { cwd: root, encoding: 'utf8' }).trim(), '', 'Packaging requires clean source; source/public assets changed after build');
  assert.equal(readFileSync(join(root, '.next/BUILD_ID'), 'utf8').trim(), identity.artifactId, 'Standalone build identity drift');
  mkdirSync(artifactDirectory, { recursive: true });
  const temporary = mkdtempSync(join(artifactDirectory, '.package-'));
  try {
    const app = join(temporary, 'app'); cpSync(join(root, '.next/standalone'), app, { recursive: true });
    cpSync(join(root, '.next/static'), join(app, '.next/static'), { recursive: true });
    if (existsSync(join(root, 'public'))) cpSync(join(root, 'public'), join(app, 'public'), { recursive: true });
    noEnvironmentFiles(app);
    writeFileSync(join(app, 'naeil-artifact-identity.json'), JSON.stringify(identity, null, 2));
    const tarball = join(temporary, 'app.tar.gz'); run(temporary, 'tar', ['-czf', tarball, '-C', app, '.']);
    const sha256 = digest(readFileSync(tarball)); const path = join(artifactDirectory, `${sha256}.tar.gz`);
    if (existsSync(path)) assert.equal(digest(readFileSync(path)), sha256, 'Existing immutable artifact changed');
    else renameSync(tarball, path);
    return { id: identity.artifactId, sha256, immutable: true, storageRef: pathToFileURL(path).href, path, sourceRevision: identity.sourceRevision, ui: identity.ui };
  } finally { rmSync(temporary, { recursive: true, force: true }); }
}

export async function main() {
  const step = process.argv[2]; assert(step, 'Explicit adapter step required');
  assert(process.env.NAEIL_ROLLOUT_INPUT && process.env.NAEIL_ROLLOUT_OUTPUT, 'Coordinator JSON input/output required');
  const input = read(process.env.NAEIL_ROLLOUT_INPUT); const root = process.cwd();
  const output = { releaseId: input.release.releaseId, serviceId: input.service.id, idempotencyKey: input.idempotencyKey };
  const options = input.adapterOptions || {};
  if (['deploy', 'activate', 'rollback'].includes(step)) throw new Error(`naeil ${step} is intentionally blocked: configure a reviewed app-owned Vercel/prebuilt or standalone platform bridge, immutable previous artifact and explicit activation/rollback approval; no operation was attempted`);
  const revision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  assert.equal(revision, input.release.sourceRevision, 'Naeil website and frozen UI must use the same reviewed source');
  assert.equal(execFileSync('git', ['status', '--porcelain', '--untracked-files=normal'], { cwd: root, encoding: 'utf8' }).trim(), '', 'App-owned release checkout must be clean');
  assert.equal(read(join(root, 'package.json')).version, input.release.version, 'Naeil source UI version mismatch');
  if (step === 'update') {
    const scratch = mkdtempSync(join(tmpdir(), 'naeil-site-archive-'));
    try {
      const packed = JSON.parse(execFileSync('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', scratch], { cwd: root, encoding: 'utf8' }))[0];
      assert.equal(digest(readFileSync(join(scratch, packed.filename))), input.release.archive.sha256, 'Website source does not match the frozen UI archive bytes');
      Object.assign(output, { uiVersion: input.release.version, archiveSha256: input.release.archive.sha256, dependencyExact: true, sourceRevision: revision, mode: 'same-reviewed-package-source' });
    } finally { rmSync(scratch, { recursive: true, force: true }); }
  } else if (step === 'test') {
    for (const command of ['test', 'check:types', 'lint', 'check:brand', 'check:contrast']) run(root, 'pnpm', [command]);
    run(root, 'pnpm', ['check:package'], { NAEIL_UI_EXPECTED_ARCHIVE_SHA256: input.release.archive.sha256 });
    output.passed = true;
  } else if (step === 'build') {
    const identity = { schemaVersion: 1, appId: input.service.id, artifactId: `naeil-${randomUUID()}`, sourceRevision: revision, ui: { version: input.release.version, contractVersion: input.release.contract.version } };
    run(root, 'pnpm', ['build'], { NAEIL_ROLLOUT_STANDALONE: '1', NAEIL_APP_ARTIFACT_ID: identity.artifactId, VERCEL_GIT_COMMIT_SHA: revision });
    assert.equal(readFileSync(join(root, '.next/BUILD_ID'), 'utf8').trim(), identity.artifactId, 'Next did not compile expected artifact id');
    const emitted = read(join(root, '.next/server/app/.well-known/naeil-ui.json.body'));
    assert.deepEqual(emitted, identity, 'Built public identity does not match frozen app artifact');
    writeFileSync(join(root, '.next/naeil-rollout-build.json'), JSON.stringify(identity, null, 2)); output.passed = true;
  } else if (step === 'package') {
    assert(isAbsolute(options.previousArtifactPath || ''), 'Reviewed previous immutable artifact pointer must be configured before packaging/deployment');
    output.previousArtifact = read(options.previousArtifactPath);
    output.artifact = await packageStandalone(root, options.artifactDirectory);
  } else throw new Error(`Unsupported naeil adapter step: ${step}`);
  writeFileSync(process.env.NAEIL_ROLLOUT_OUTPUT, JSON.stringify(output, null, 2), { mode: 0o600 });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(error => { console.error(error.message); process.exitCode = 1; });
