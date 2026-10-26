/** Pure immutable code inventories; no lifecycle, policy, subprocess or live I/O. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { chmodSync, copyFileSync, mkdirSync, symlinkSync, lstatSync, readFileSync, readdirSync, readlinkSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const HEX=/^[a-f0-9]{64}$/;
const within=(path,root)=>path===root||path.startsWith(root+sep);
const forbidden=name=>/^(?:credential\.json|signing\.key|estimates\.json|\.estimate\.lock\.json|\.env(?:\..*)?|server\.env|\.git|password\.json|state\.sqlite(?:-.*)?|api-key|\._.*)$/.test(name)||/^(?:coral|fish|jellyfish|turtle|whale)\.png$/.test(name);
export function codeManifest(root,{estimate=false,normalizeLinks=false}={}) {
 assert(isAbsolute(root)&&resolve(root)===root&&realpathSync(root)===root&&lstatSync(root).isDirectory(),'Canonical immutable code tree required');
 const files={};
 function walk(directory) {
  for(const name of readdirSync(directory).sort()) {
   assert(!forbidden(name),'Forbidden private/redistributed artifact member');
   const path=join(directory,name),key=relative(root,path),stat=lstatSync(path);
   if(stat.isDirectory())walk(path);
   else if(stat.isSymbolicLink()) {
    const target=normalizeLinks?relative(dirname(path),realpathSync(path)):readlinkSync(path),resolvedTarget=relative(root,realpathSync(path));
    assert(!isAbsolute(target)&&within(resolve(dirname(path),target),root)&&within(realpathSync(path),root),'Artifact symlink escapes immutable code');
    files[key]=estimate?'symlink:'+target:{type:'symlink',target,resolvedTarget};
   }else {assert(stat.isFile()&&stat.nlink===1,'Regular single-link code member required');files[key]=estimate?hash(readFileSync(path)):{bytes:stat.size,sha256:hash(readFileSync(path))};}
  }
 }
 walk(root);return Object.fromEntries(Object.entries(files).sort(([a],[b])=>estimate?a.localeCompare(b,'en'):a<b?-1:a>b?1:0));
}
/** Preserve the adapter's normalized in-artifact pnpm links without following
 * them into a checkout/store. This is shared packaging only, never activation. */
export function copyCodeTree(source,destination,{normalizeLinks=false}={},root=source) {
 const stat=lstatSync(source);assert(!forbidden(source.split(sep).at(-1)),'Forbidden private code member');
 if(stat.isSymbolicLink()) {assert(within(realpathSync(source),root),'Source code link escapes artifact');symlinkSync(normalizeLinks?relative(dirname(source),realpathSync(source)):readlinkSync(source),destination);}
 else if(stat.isDirectory()) {mkdirSync(destination,{mode:stat.mode&0o777});chmodSync(destination,stat.mode&0o777);for(const name of readdirSync(source))copyCodeTree(join(source,name),join(destination,name),{normalizeLinks},root);}
 else {assert(stat.isFile()&&stat.nlink===1,'Regular single-link code source required');copyFileSync(source,destination);chmodSync(destination,stat.mode&0o777);}
}

export function inspectEstimateRelease(directory,sourceRevision,release) {
 const path=join(directory,'manifest.json');assert(realpathSync(path)===path&&lstatSync(path).isFile()&&lstatSync(path).size<=2097152,'Bounded regular native manifest required');
 const manifest=JSON.parse(readFileSync(path));
 assert(manifest.schemaVersion===1&&/^[a-f0-9]{12}-[a-f0-9]{12}$/.test(manifest.releaseId)&&manifest.node==='v24.21.0'&&manifest.serverPath==='app/server.js'&&manifest.runtimeDataIncluded===false,'Native code-only release contract mismatch');
 const identity={schemaVersion:1,appId:'abestimate',artifactId:manifest.buildId,sourceRevision,ui:{version:release.version,contractVersion:release.contractVersion}};
 assert.equal(manifest.sourceCommit,sourceRevision,'Native source commit mismatch');assert.deepEqual(manifest.uiBuildIdentity,identity,'Native immutable identity mismatch');
 assert.deepEqual(codeManifest(join(directory,'app'),{estimate:true}),manifest.artifactFiles,'Native artifact file inventory mismatch');
 assert.equal(readFileSync(join(directory,'app/.next/BUILD_ID'),'utf8').trim(),manifest.buildId,'Native BUILD_ID mismatch');
 const dependency=manifest.packageVersions?.['@naeil/ui'];assert(/^file:vendor\/naeil-ui-[0-9A-Za-z.+-]+\.tgz$/.test(dependency||''),'Exact native vendored package required');assert.equal(manifest.sourceFiles?.[dependency.slice(5)],release.archiveSha256,'Native frozen package binding mismatch');
 for(const path of ['src/server/naeil-shared-session.ts','src/server/naeil-auth-client.ts'])assert(HEX.test(manifest.sourceFiles?.[path]),'Shared-session-compatible source manifest required');
 return {identity,manifest,manifestSha256:hash(readFileSync(path))};
}
export function inspectJevStandalone(directory,sourceRevision,release) {
 const identity=JSON.parse(readFileSync(join(directory,'public/.well-known/naeil-ui.json')));
 assert.deepEqual(identity,{schemaVersion:1,appId:'jev',artifactId:identity.artifactId,sourceRevision,ui:{version:release.version,contractVersion:release.contractVersion}},'Exact Jev build identity required');
 assert(/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(identity.artifactId),'Exact Jev artifact ID required');
 const buildId=readFileSync(join(directory,'.next/BUILD_ID'),'utf8').trim();assert(/^[A-Za-z0-9_-]{1,120}$/.test(buildId),'Exact Jev BUILD_ID required');
 return {identity,buildId,manifest:codeManifest(directory,{normalizeLinks:true})};
}
