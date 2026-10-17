import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { assertFrozen, digest, policyGate } from './rollout.mjs';

/** Runs only in a provisioned clean bot worktree. Never switches an owner checkout. */
export function updateConsumer(context, { root = process.cwd(), install } = {}) {
  const config = context.adapterOptions?.update;
  assert.equal(config?.enabled, true, 'Consumer updater is disabled');
  assert(isAbsolute(config.worktree || '') && realpathSync(config.worktree) === realpathSync(root), 'Reviewed dedicated update worktree required');
  root = realpathSync(root);
  const regular = (relative, directory = false, optional = false) => {
    let stat;
    try { stat = lstatSync(join(root, relative)); } catch (error) { if (optional && error.code === 'ENOENT') return; throw error; }
    assert(!stat.isSymbolicLink() && (directory ? stat.isDirectory() : stat.isFile() && stat.nlink === 1), `Non-symlink ${directory ? 'directory' : 'single-link file'} required: ${relative}`);
    assert.equal(realpathSync(join(root, relative)), join(root, relative), `Path escapes reviewed checkout: ${relative}`);
  };
  regular('package.json'); regular('pnpm-lock.yaml'); regular('vendor', true); regular('node_modules', true, true);
  assertFrozen(context.release);
  assert.equal(policyGate(context.release, context.service, context.policy).state, 'eligible', 'Current rollout approval required');
  assert(!existsSync(context.policy.stopFile), 'Stop switch is active');
  const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  assert.equal(git(['branch', '--show-current']), config.branch, 'Dedicated bot branch mismatch');
  assert(config.branch?.startsWith('rollout/'), 'Updater requires an explicitly provisioned rollout/ branch');
  assert.equal(git(['status', '--porcelain', '--untracked-files=normal']), '', 'Updater requires a clean dedicated checkout');
  const pkgPath = join(root, 'package.json'), pkg = JSON.parse(readFileSync(pkgPath));
  assert.equal(pkg.packageManager, config.packageManager, 'Consumer package manager pin changed');
  assert(/^pnpm@\d+\.\d+\.\d+$/.test(config.packageManager), 'This bounded updater supports pinned pnpm consumers');
  const dependency = pkg.dependencies?.['@naeil/ui'];
  assert(/^file:vendor\/naeil-ui-[0-9A-Za-z.+-]+\.tgz$/.test(dependency || ''), 'Exact vendored UI dependency required');
  regular(dependency.slice(5));
  const archiveMetadata = path => JSON.parse(execFileSync('/usr/bin/tar', ['-xOf', path, 'package/package.json'], { encoding: 'utf8', maxBuffer: 1024 * 1024 }));
  const old = archiveMetadata(join(root, dependency.slice(5))), next = archiveMetadata(context.release.archive.path);
  assert.equal(old.name, '@naeil/ui'); assert.equal(next.name, '@naeil/ui'); assert.equal(next.version, context.release.version);
  assert([context.release.previousVersion, context.release.version].includes(old.version), 'Consumer drifted from the reviewed predecessor; explicit migration required');
  const vendor = `vendor/naeil-ui-${context.release.version}.tgz`;
  regular(vendor, false, true);
  const nextDependency = `file:${vendor}`;
  const oldMatches = old.version === next.version && digest(readFileSync(join(root, dependency.slice(5)))) === context.release.archive.sha256;
  const integrity = `sha512-${createHash('sha512').update(readFileSync(context.release.archive.path)).digest('base64')}`;
  const runInstall = () => {
    if (install) return install({ root, integrity, version: next.version });
    const version = execFileSync('pnpm', ['--version'], { cwd: root, encoding: 'utf8' }).trim();
    assert.equal(`pnpm@${version}`, config.packageManager, 'Installed package manager differs from reviewed pin');
    execFileSync('pnpm', ['install', '--no-frozen-lockfile', '--ignore-scripts'], { cwd: root, stdio: 'inherit' });
    execFileSync('pnpm', ['install', '--frozen-lockfile', '--ignore-scripts'], { cwd: root, stdio: 'inherit' });
  };
  if (!oldMatches) {
    assert.equal(old.version, context.release.previousVersion, 'Same-version archive changed; immutable release violation');
    mkdirSync(join(root, 'vendor'), { recursive: true });
    if (existsSync(join(root, vendor))) assert.equal(digest(readFileSync(join(root, vendor))), context.release.archive.sha256, 'Existing immutable vendor archive differs');
    else writeFileSync(join(root, vendor), readFileSync(context.release.archive.path), { flag: 'wx' });
    pkg.dependencies['@naeil/ui'] = nextDependency;
    writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  }
  runInstall();
  assert(readFileSync(join(root, 'pnpm-lock.yaml'), 'utf8').includes(`integrity: ${integrity}`), 'Installed lock does not bind frozen UI bytes');
  const installed = JSON.parse(readFileSync(join(root, 'node_modules/@naeil/ui/package.json')));
  assert.equal(installed.name, '@naeil/ui'); assert.equal(installed.version, next.version);
  assert(!existsSync(context.policy.stopFile), 'Stop switch is active');
  assert.equal(policyGate(context.release, context.service, context.policy).state, 'eligible', 'Approval expired during update');
  // Clean entry ensures these changes belong to this operation. Failures retain
  // evidence; no reset, checkout, unrelated file staging or automatic replay.
  const changes = execFileSync('git', ['status', '--porcelain', '-z', '--untracked-files=all'], { cwd: root }).toString().split('\0').filter(Boolean).map(line => line.slice(3));
  const allowed = new Set(['package.json', 'pnpm-lock.yaml', vendor]);
  assert(changes.every(path => allowed.has(path)), 'Install changed files outside the reviewed dependency scope');
  if (changes.length) {
    git(['add', '--', ...changes]);
    git(['-c', 'user.name=Naeil UI rollout', '-c', 'user.email=ui-rollout@naeil.dev', 'commit', '-m', `chore: consume @naeil/ui ${next.version}`]);
  }
  assert.equal(git(['status', '--porcelain', '--untracked-files=normal']), '', 'Update commit left a dirty checkout');
  return { releaseId: context.release.releaseId, serviceId: context.service.id, idempotencyKey: context.idempotencyKey, uiVersion: next.version, archiveSha256: context.release.archive.sha256, dependencyExact: true, sourceRevision: git(['rev-parse', 'HEAD']) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    assert(process.env.NAEIL_ROLLOUT_INPUT && process.env.NAEIL_ROLLOUT_OUTPUT, 'Structured coordinator I/O required');
    const result = updateConsumer(JSON.parse(readFileSync(process.env.NAEIL_ROLLOUT_INPUT)));
    writeFileSync(process.env.NAEIL_ROLLOUT_OUTPUT, JSON.stringify(result, null, 2), { mode: 0o600 });
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
