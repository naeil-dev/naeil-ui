// Synthetic Git/source/package evidence only. No consumer or live site access.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileReference, hash, releaseIdentityDigest } from '../standing-config.mjs';
import { runtimeIndex } from '../package-runtime.mjs';

export function syntheticSite(directory, release, archiveBytes) {
  const sourceRoot = join(directory, 'site-source'); mkdirSync(sourceRoot, { mode: 0o700 });
  const git = args => execFileSync('/usr/bin/git', args, { cwd: sourceRoot, env: { PATH: '/usr/bin:/bin', GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null', GIT_AUTHOR_NAME: 'Synthetic', GIT_AUTHOR_EMAIL: 'synthetic@example.test', GIT_COMMITTER_NAME: 'Synthetic', GIT_COMMITTER_EMAIL: 'synthetic@example.test' } });
  git(['init', '-q']);
  writeFileSync(join(sourceRoot, 'README.md'), 'old synthetic site\n'); git(['add', '.']); git(['-c', 'commit.gpgsign=false', 'commit', '-qm', 'synthetic original']);
  const oldSourceRevision = git(['rev-parse', 'HEAD']).toString().trim();
  writeFileSync(join(sourceRoot, 'README.md'), 'reviewed synthetic site\n'); writeFileSync(join(sourceRoot, 'server.js'), '// independently reviewed site change\n');
  git(['add', '.']); git(['-c', 'commit.gpgsign=false', 'commit', '-qm', 'synthetic continuation']);
  const sourceRevision = git(['rev-parse', 'HEAD']).toString().trim(), treeSha = git(['rev-parse', 'HEAD^{tree}']).toString().trim();
  const files = ['README.md', 'server.js'].map(path => {
    const entry = sha => {
      const line = git(['ls-tree', sha, '--', path]).toString();
      return line ? { mode: line.slice(0, 6), sha256: hash(git(['show', `${sha}:${path}`])) } : { mode: null, sha256: null };
    };
    const old = entry(oldSourceRevision), next = entry(sourceRevision);
    return { path, oldSha256: old.sha256, newSha256: next.sha256, oldMode: old.mode, newMode: next.mode, purpose: 'Review complete synthetic site behavior and documentation delta' };
  });
  release.siteSourceRevision = oldSourceRevision;
  const path = join(directory, 'new-site-package.tgz'); writeFileSync(path, archiveBytes, { mode: 0o600 });
  const approval = { schemaVersion: 1, kind: 'standing-site-continuation-approval', service: 'naeil', repository: 'naeil-dev/naeil-ui', releaseSha256: releaseIdentityDigest(release), oldSourceRevision, sourceRevision, deploymentId: 'dpl_Continued', source: { root: sourceRoot, gitSha256: hash(readFileSync('/usr/bin/git')) }, treeSha, diffSha256: hash(git(['diff', '--no-ext-diff', '--no-textconv', '--binary', '--full-index', oldSourceRevision, sourceRevision, '--'])), files, packageProof: { schemaVersion: 1, sourceRevision, archive: fileReference(path, 64 * 1024 * 1024), runtimeSha256: hash(JSON.stringify(runtimeIndex(archiveBytes))) }, approvedBy: 'synthetic-owner', approvalRef: 'synthetic://full-site-review', approvedAt: '2020-01-01T00:00:00Z', expiresAt: '2099-01-01T00:00:00Z', revoked: false };
  return { approval, git, sourceRoot };
}
