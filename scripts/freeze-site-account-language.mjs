import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, readlinkSync, realpathSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, relative, resolve, sep } from 'node:path';

// Freeze a local verification artifact only. It embeds fictional public Auth
// settings and must never be activated as a production configuration.
const root = process.cwd();
const dist = '.next-console-invite';
const git = (...args) => execFileSync('git', args, { encoding:'utf8' }).trim();
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const sourceRevision = git('rev-parse', 'HEAD');
assert.equal(git('status', '--porcelain'), '', 'Commit reviewed source before freezing');
const identity = JSON.parse(readFileSync(join(dist, 'server/app/.well-known/naeil-ui.json.body'), 'utf8'));
assert.equal(identity.sourceRevision, sourceRevision);
assert.deepEqual(identity.ui, {version:'0.7.1',contractVersion:'1'});
assert.equal(readFileSync(join(dist, 'BUILD_ID'), 'utf8').trim(), identity.artifactId);
const destination = join(homedir(), '.local/share/naeil-ui-rollout/consumer-candidates/naeil-account-language', sourceRevision);
assert(!existsSync(destination), 'Never overwrite a frozen artifact');
mkdirSync(destination, {recursive:true});
const app = join(destination, 'standalone');
cpSync(join(dist, 'standalone'), app, {recursive:true, verbatimSymlinks:true});
cpSync(join(dist, 'static'), join(app, dist, 'static'), {recursive:true});
cpSync('public', join(app, 'public'), {recursive:true});
const files = [], links = [];
function inventory(directory) {
  for (const name of readdirSync(directory).sort()) {
    assert(!/^\.env(?:\.|$)/.test(name), 'Environment files must not enter the artifact');
    const path = join(directory, name), rel = relative(app, path);
    const stat = lstatSync(path);
    if (stat.isSymbolicLink()) {
      assert(realpathSync(path).startsWith(resolve(app) + sep), 'Artifact link escapes runtime');
      links.push({path:rel,target:readlinkSync(path)});
    } else if (stat.isDirectory()) inventory(path);
    else {
      assert(stat.isFile(), 'Unsupported runtime file');
      files.push({path:rel,size:stat.size,sha256:sha(readFileSync(path))});
    }
  }
}
inventory(app);
const archive = join(destination, 'standalone.tar.gz');
execFileSync('tar', ['-czf', archive, '-C', app, '.']);
const receipt = {
  schemaVersion:1, scope:'local-synthetic-auth-verification-only', productionReady:false,
  sourceRevision, sourceWorktree:root, identity, node:process.version,
  publicAuthOrigin:'http://127.0.0.1:55431',
  uiArchiveSha256:sha(readFileSync('docs/rollout/frozen/naeil-ui-0.7.1.tgz')),
  archive:{path:archive,sha256:sha(readFileSync(archive))}, files, links,
};
writeFileSync(join(destination, 'receipt.json'), JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({destination,sourceRevision,identity,files:files.length,links:links.length,archiveSha256:receipt.archive.sha256}));
