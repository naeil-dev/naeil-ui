/** Pure immutable code inventories; no lifecycle, policy, subprocess or live I/O. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { chmodSync, copyFileSync, mkdirSync, symlinkSync, lstatSync, readFileSync, readdirSync, readlinkSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { gunzipSync } from 'node:zlib';
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

/** Inspect the original retained standalone.tar.gz without extraction. Match
 * jev-native.py's manifest/standalone namespace; accept only inert observed PAX
 * fields. No archive member, link or metadata can become a filesystem action. */
export function inspectJevArchive(archive, manifest, sourceRevision, release) {
 const tar=gunzipSync(archive,{maxOutputLength:1073741824}),seen=new Set(),directories=new Set(),contents=new Map(),links=new Map();
 let offset=0,pending=null,ended=false;
 const pax=bytes=>{
  const values={},decoder=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true});let position=0;
  while(position<bytes.length){
   const space=bytes.indexOf(32,position);assert(space>position,'Invalid PAX length');const digits=bytes.subarray(position,space).toString();assert(/^[1-9]\d*$/.test(digits),'Invalid PAX length');
   const length=Number(digits),end=position+length;assert(Number.isSafeInteger(length)&&end<=bytes.length&&end>space+2&&bytes[end-1]===10,'Truncated PAX field');
   const record=bytes.subarray(space+1,end-1),equal=record.indexOf(61);assert(equal>0,'Invalid PAX record');
   const key=decoder.decode(record.subarray(0,equal));assert(['path','linkpath','mtime','LIBARCHIVE.xattr.com.apple.provenance','SCHILY.xattr.com.apple.provenance'].includes(key)&&!Object.hasOwn(values,key),'Unsupported/duplicate PAX field');
   if(key.startsWith('LIBARCHIVE.xattr.')||key.startsWith('SCHILY.xattr.')){
    // Retained BSD tar provenance values are opaque binary, including NUL.
    // Discard their bytes; only presence matters for duplicate detection.
    values[key]=true;
   }else{
    const value=decoder.decode(record.subarray(equal+1));assert(!value.includes('\0'),'Invalid PAX authority field');
    if(key==='mtime')assert(/^-?\d+(?:\.\d+)?$/.test(value),'Invalid PAX time');
    else assert(value.length>0,'Empty PAX path/linkpath');
    values[key]=value;
   }
   position=end;
  }
  return values;
 };
 while(offset+512<=tar.length){
  const header=tar.subarray(offset,offset+512);
  if(header.every(byte=>byte===0)){assert(!pending&&tar.subarray(offset).every(byte=>byte===0),'Incomplete PAX or trailing archive bytes');ended=true;break;}
  const string=(start,length)=>header.subarray(start,start+length).toString('utf8').replace(/\0.*$/s,'');
  const octal=(start,length)=>{const value=string(start,length).trim();assert(/^[0-7]+$/.test(value),'Unsupported tar numeric field');const number=parseInt(value,8);assert(Number.isSafeInteger(number),'Unsafe tar number');return number;};
  assert.equal([...header].reduce((sum,byte,index)=>sum+(index>=148&&index<156?32:byte),0),octal(148,8),'Archive header checksum mismatch');
  const size=octal(124,12),start=offset+512,end=start+size,type=string(156,1);assert(end<=tar.length,'Truncated archive member');const bytes=tar.subarray(start,end);offset=start+Math.ceil(size/512)*512;
  if(type==='x'){assert(!pending&&size<=262144,'Bounded single PAX header required');pending=pax(bytes);continue;}
  assert(['','0','2','5'].includes(type),'Unsupported archive member type');
  const metadata=pending||{};pending=null;
  const raw=metadata.path||[string(345,155),string(0,100)].filter(Boolean).join('/'),path=type==='5'?raw.replace(/\/$/,''):raw;
  assert(path==='standalone'||path.startsWith('standalone/'),'Archive escaped standalone prefix');
  const parts=path.split('/');assert(!parts.some(part=>['','.','..'].includes(part)||part.includes('\\')||forbidden(part)),'Unsafe/private archive path');
  const name=parts.slice(1).join('/');assert(!seen.has(name)&&seen.size<100000,'Duplicate/excessive archive members');seen.add(name);
  if(type==='5'){assert(size===0,'Directory payload prohibited');directories.add(name);continue;}
  assert(name&&Object.hasOwn(manifest,name),'Unexpected archive member');const expected=manifest[name];
  if(type==='2'){
   const target=metadata.linkpath||string(157,100);assert(size===0&&expected.type==='symlink'&&target===expected.target&&!isAbsolute(target)&&!target.includes('\\'),'Archive link mismatch');
   const resolved=name.split('/').slice(0,-1);
   for(const part of target.split('/')){if(part==='..'){assert(resolved.length,'Archive link escape');resolved.pop();}else if(part&&part!=='.')resolved.push(part);}
   assert.equal(resolved.join('/'),expected.resolvedTarget,'Archive link target mismatch');links.set(name,resolved.join('/'));
  }else{
   assert.deepEqual(expected,{bytes:size,sha256:hash(bytes)},'Archive member bytes mismatch');contents.set(name,bytes);
  }
 }
 assert(ended&&offset<=tar.length,'Incomplete archive termination');
 assert.deepEqual([...contents.keys(),...links.keys()].sort(),Object.keys(manifest).sort(),'Missing archive member');
 for(const name of [...contents.keys(),...links.keys(),...directories])for(let parent=dirname(name);parent!=='.';parent=dirname(parent))assert(!links.has(parent)&&!contents.has(parent),'Archive member descends through a non-directory');
 for(const target of links.values())assert(!links.has(target)&&(contents.has(target)||directories.has(target)||[...seen].some(name=>name.startsWith(target+'/'))),'Archive link target is missing or indirect');
 const identityBytes=contents.get('public/.well-known/naeil-ui.json'),buildBytes=contents.get('.next/BUILD_ID');
 assert(identityBytes&&identityBytes.length<=4096&&buildBytes&&buildBytes.length<=4096,'Archived public identity/BUILD_ID missing or oversized');
 const identity=JSON.parse(identityBytes),buildId=buildBytes.toString('utf8').trim();
 assert.deepEqual(identity,{schemaVersion:1,appId:'jev',artifactId:identity.artifactId,sourceRevision,ui:{version:release.version,contractVersion:release.contractVersion}},'Archived Jev build identity mismatch');
 assert(/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(identity.artifactId)&&/^[A-Za-z0-9_-]{1,120}$/.test(buildId),'Exact archived Jev build IDs required');
 return {identity,buildId,manifest};
}
