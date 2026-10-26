import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { constants, closeSync, existsSync, fstatSync, lstatSync, openSync, readSync, readFileSync, readdirSync, readlinkSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { createServer } from 'node:net';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const HEX = /^[a-f0-9]{64}$/;
const under = (path, root) => path === root || path.startsWith(root + sep);
const canonical = path => typeof path === 'string' && isAbsolute(path) && resolve(path) === path && realpathSync(path) === path;
const quote = value => JSON.stringify(value);
export const ROLE_PORTS = Object.freeze({ estimateAuth:42481, estimateHttp:42482, estimateE2E:2480, estimateSmoke:2481, estimateContender:42483, jevIdentity:42484, jevE2E:2467 });

/** Consumer-controlled source bytes are read inside the sandbox with this bounded
 * descriptor reader. NOFOLLOW/NONBLOCK reject links and special files before I/O. */
export function readBoundedSource(path,root,maxBytes=2097152,allowRootOwner=false) {
  assert(isAbsolute(root)&&resolve(root)===root&&realpathSync(root)===root,'Canonical source root required');
  assert(isAbsolute(path)&&resolve(path)===path&&path.startsWith(root+sep),'Contained source path required');
  assert(Number.isSafeInteger(maxBytes)&&maxBytes>0&&maxBytes<=1073741824,'Bounded source read required');
  assert.equal(realpathSync(path),path,'Source symlink refused');
  const fd=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);
  try {
    const before=fstatSync(fd),current=lstatSync(path);
    assert(before.isFile()&&before.nlink===1&&(before.uid===process.getuid()||(allowRootOwner&&before.uid===0))&&before.size<=maxBytes,'Owned bounded regular single-link source required');
    assert.equal(realpathSync(path),path,'Source path changed');assert(current.isFile()&&current.dev===before.dev&&current.ino===before.ino,'Source descriptor identity changed');
    const bytes=Buffer.alloc(before.size+1);let count=0,n;
    while(count<bytes.length&&(n=readSync(fd,bytes,count,bytes.length-count,count))>0)count+=n;
    const after=fstatSync(fd);
    assert(count===before.size&&count<=maxBytes&&after.size===before.size&&after.mtimeMs===before.mtimeMs&&after.ctimeMs===before.ctimeMs&&after.nlink===1,'Source grew or changed during bounded read');
    return bytes.subarray(0,count);
  }finally{closeSync(fd);}
}

export function networkManifest(service, overrides = {}) {
  assert(['estimate','jev'].includes(service),'Unsupported preflight service');
  const names = Object.keys(ROLE_PORTS).filter(name=>name.startsWith(service));
  assert(Object.keys(overrides).every(name=>names.includes(name)),'Unknown network role');
  const roles = Object.fromEntries(names.map(name=>[name,overrides[name] ?? ROLE_PORTS[name]]));
  assert(Object.values(roles).every(port=>Number.isSafeInteger(port)&&port>0&&port<=65535),'Exact valid role port required');
  assert.equal(new Set(Object.values(roles)).size,names.length,'Duplicate role endpoint');
  assert.equal(roles[`${service}E2E`],service==='estimate'?2480:2467,'Canonical E2E port required');
  if(service==='estimate') assert.equal(roles.estimateSmoke,2481,'Canonical smoke port required');
  return {schemaVersion:1,host:'127.0.0.1',protocol:'tcp',roles};
}

/** Hash every runtime/read-only tree member. Symlinks may only resolve inside the tree. */
export function treeManifest(root) {
  assert(canonical(root)&&lstatSync(root).isDirectory(),'Canonical tree required');
  const result=[];
  function walk(directory) {
    for(const name of readdirSync(directory).sort()) {
      const path=join(directory,name),stat=lstatSync(path),member=relative(root,path);
      if(stat.isDirectory()) {result.push({path:member,type:'directory',mode:stat.mode&0o777});walk(path);}
      else if(stat.isSymbolicLink()) {assert(under(realpathSync(path),root),'Tree symlink escapes root');result.push({path:member,link:readlinkSync(path)});}
      else {assert(stat.isFile()&&stat.nlink===1,'Regular single-link tree members required');result.push({path:member,sha256:hash(readBoundedSource(path,root,1073741824,true)),bytes:stat.size,mode:stat.mode&0o777});}
    }
  }
  walk(root);return result;
}
export const treeDigest = root => hash(JSON.stringify(treeManifest(root)));

export function sanitizedEnvironment({executionPath,tmp,cache}, inherited = process.env) {
  const env={PATH:executionPath,TMPDIR:tmp,XDG_CACHE_HOME:cache, npm_config_cache:join(cache,'npm'), PNPM_HOME:join(cache,'pnpm'), NEXT_TELEMETRY_DISABLED:'1',COPYFILE_DISABLE:'1',GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null',GIT_OPTIONAL_LOCKS:'0'};
  for(const key of ['HOME','USER','LOGNAME','LANG','LC_ALL','LC_CTYPE','TZ']) if(inherited[key]) env[key]=inherited[key];
  return env;
}

export function createSandbox(spec,{platform=process.platform}={}) {
  assert.equal(platform,'darwin','Enforced preflight requires supported macOS sandbox; no fallback');
  assert.equal(spec.schemaVersion,1);assert(canonical(spec.root),'Canonical isolated root required');
  assert(spec.executables?.[spec.runtime] && spec.executables?.['/usr/bin/sandbox-exec'],'Explicit pinned runtime and sandbox-exec required');
  assert(typeof spec.executionPath==='string'&&spec.executionPath.split(':').every(p=>isAbsolute(p)&&resolve(p)===p),'Explicit execution PATH required');
  for(const [path,digest] of Object.entries(spec.executables)) {
    assert(canonical(path)&&lstatSync(path).isFile()&&HEX.test(digest),'Canonical pinned executable required');
    assert.equal(hash(readFileSync(path)),digest,'Pinned executable bytes changed');
    assert(!under(path,spec.root),'Executable must be outside mutable isolated root');
  }
  assert(Array.isArray(spec.writable)&&spec.writable.length>=4&&Array.isArray(spec.readOnly)&&spec.readOnly.length>=2,'Distinct checkout/output/tmp/cache and immutable input/artifact roots required');
  const roots=[...spec.writable,...spec.readOnly];
  for(const path of roots) {assert(canonical(path)&&lstatSync(path).isDirectory()&&under(path,spec.root)&&path!==spec.root,'Explicit isolated child root required');}
  for(let a=0;a<roots.length;a++) for(let b=a+1;b<roots.length;b++) assert(!under(roots[a],roots[b])&&!under(roots[b],roots[a]),'Distinct roots must not overlap');
  for(const entry of spec.readable ?? []) {
    assert(canonical(entry.path)&&HEX.test(entry.sha256),'Pinned runtime read closure required');
    assert(!under(spec.root,entry.path)&&!roots.some(root=>under(entry.path,root)),'Runtime read closure overlaps mutable roots');
    assert.equal(lstatSync(entry.path).isDirectory()?treeDigest(entry.path):hash(readFileSync(entry.path)),entry.sha256,'Runtime read closure changed');
  }
  const manifest=networkManifest(spec.endpoints?.roles?.estimateE2E!==undefined?'estimate':'jev',spec.endpoints?.roles);
  assert.deepEqual(spec.endpoints,manifest,'Exact network manifest required');
  const ancestors=new Set(['/','/usr','/private','/Users','/var','/etc']);
  for(const path of [...roots,...Object.keys(spec.executables),...(spec.readable??[]).map(e=>e.path)]) for(let parent=dirname(path);parent!=='/';parent=dirname(parent)) ancestors.add(parent);
  const readable=[...roots,...(spec.readable??[]).map(e=>e.path)];
  const system=['/System','/usr/lib','/usr/share','/private/var/db/dyld','/dev'];
  const rules=['(version 1)','(allow default)','(deny file-read*)','(deny file-write*)','(deny network*)','(deny process-exec*)','(deny signal)','(allow signal (target self) (target same-sandbox))','(allow file-read-metadata)',
    `(allow file-read* ${[...ancestors].sort().map(p=>`(literal ${quote(p)})`).join(' ')})`,
    `(allow file-read* ${system.map(p=>`(subpath ${quote(p)})`).join(' ')} ${readable.map(p=>`(subpath ${quote(p)})`).join(' ')} ${Object.keys(spec.executables).map(p=>`(literal ${quote(p)})`).join(' ')})`,
    `(allow file-write* ${spec.writable.map(p=>`(subpath ${quote(p)})`).join(' ')})`,
    '(allow file-write-data (literal "/dev/null"))',
    `(allow process-exec* ${Object.keys(spec.executables).filter(p=>p!=='/usr/bin/sandbox-exec').map(p=>`(literal ${quote(p)})`).join(' ')})`];
  const selected=spec.roles??Object.keys(manifest.roles);
  assert(Array.isArray(selected)&&selected.every(role=>Object.hasOwn(manifest.roles,role))&&new Set(selected).size===selected.length,'Exact approved stage roles required');
  for(const role of selected) {
    const port=manifest.roles[role];
    rules.push(`(allow network-bind (local tcp ${quote(`localhost:${port}`)}))`,`(allow network-inbound (local tcp ${quote(`localhost:${port}`)}))`,`(allow network-outbound (remote tcp ${quote(`localhost:${port}`)}))`);
  }
  const profile=rules.join('\n')+'\n';
  return Object.freeze({spec:structuredClone(spec),profile,profileSha256:hash(profile),networkSha256:hash(JSON.stringify(manifest))});
}

export async function executeSandbox(sandbox, command) {
  const {spec}=sandbox;
  assert(spec.executables[command.file]&&command.file!=='/usr/bin/sandbox-exec','Command requires approved pinned executable');
  for(const [path,digest] of Object.entries(spec.executables)) assert.equal(hash(readFileSync(path)),digest,'Pinned executable bytes changed');
  for(const entry of spec.readable??[]) assert.equal(lstatSync(entry.path).isDirectory()?treeDigest(entry.path):hash(readFileSync(entry.path)),entry.sha256,'Pinned runtime/helper closure changed');
  assert(Array.isArray(command.args)&&command.args.every(arg=>typeof arg==='string'),'Exact argv required');
  const cwd=command.cwd??spec.writable[0];assert(canonical(cwd)&&spec.writable.some(root=>under(cwd,root)),'Command cwd must be isolated writable checkout');
  const env=sanitizedEnvironment({executionPath:spec.executionPath,tmp:spec.writable[2],cache:spec.writable[3]});
  for(const [key,value] of Object.entries(command.env??{})) {
    assert(/^(?:NAEIL_|ESTIMATE_|JEV_|RELEASE_INTEGRITY_EVIDENCE_PATH$|ESBUILD_BINARY_PATH$|LUNA_KEY_FILE$|DATA_DIR$|APP_ORIGIN$|PORT$|HOSTNAME$|NODE_ENV$|PLAYWRIGHT_|E2E_REPORT_PATH$|SHARED_HEADER_EVIDENCE_DIR$|SHELL_EVIDENCE_DIR$|NAVIGATION_EVIDENCE_DIR$|COMPANY_LAYOUT_EVIDENCE_DIR$|LAYOUT_EVIDENCE_DIR$|CI$)/.test(key),'Unapproved preflight environment key');
    assert(typeof value==='string','Explicit environment values required');
    if(key==='ESBUILD_BINARY_PATH')assert(spec.executables[value]&&value!=='/usr/bin/sandbox-exec'&&!under(value,spec.root),'ESBUILD_BINARY_PATH requires a pinned external executable');
    if(key==='RELEASE_INTEGRITY_EVIDENCE_PATH')assert(isAbsolute(value)&&resolve(value)===value&&under(value,spec.writable[1])&&realpathSync(dirname(value))===dirname(value),'Release integrity evidence requires canonical isolated output path');
    env[key]=value;
  }
  const timeout=command.timeoutMs??120000;assert(Number.isSafeInteger(timeout)&&timeout>0&&timeout<=10800000,'Bounded timeout required');
  return await new Promise(resolveResult=>{
    const child=spawn('/usr/bin/sandbox-exec',['-p',sandbox.profile,command.file,...command.args],{cwd,env,stdio:['ignore','pipe','pipe'],detached:true});
    let stdout=Buffer.alloc(0),stderr=Buffer.alloc(0),failed=false;
    const kill=()=>{failed=true;try{process.kill(-child.pid,'SIGKILL');}catch{}};
    const timer=setTimeout(kill,timeout);
    for(const [stream,name] of [[child.stdout,'stdout'],[child.stderr,'stderr']]) stream.on('data',bytes=>{
      if(name==='stdout') stdout=Buffer.concat([stdout,bytes]);else stderr=Buffer.concat([stderr,bytes]);
      if(stdout.length+stderr.length>2097152) kill();
    });
    child.once('error',()=>{failed=true;});
    child.once('close',(exitCode,signal)=>{
      clearTimeout(timer);try{process.kill(-child.pid,'SIGKILL');}catch{}
      resolveResult({exitCode:failed||signal||exitCode===null?1:exitCode,signal,stdout:stdout.toString(),stderr:stderr.toString(),stdoutSha256:hash(stdout),stderrSha256:hash(stderr)});
    });
  });
}

/** Runs only synthetic canaries; never opens an operational path or production endpoint. */
export async function verifySandbox(sandbox,{outsideRead,immutableFile,nativeExecutable}) {
  const {spec}=sandbox;
  assert(canonical(outsideRead)&&canonical(immutableFile)&&canonical(nativeExecutable),'Canonical synthetic probe files required');
  assert(spec.readOnly.some(root=>under(immutableFile,root)),'Immutable input canary required');
  assert(![...spec.writable,...spec.readOnly,...(spec.readable??[]).map(e=>e.path)].some(root=>under(outsideRead,root)||under(nativeExecutable,root)),'Outside synthetic probes must be inaccessible');
  const artifactCanary=join(spec.readOnly[1],'isolation-artifact-canary');if(!existsSync(artifactCanary))writeFileSync(artifactCanary,'immutable-synthetic-artifact',{mode:0o600,flag:'wx'});
  const outsideServer=createServer(socket=>socket.end('synthetic'));
  await new Promise((resolveReady,reject)=>{outsideServer.once('error',reject);outsideServer.listen(0,'127.0.0.1',resolveReady);});
  const forbiddenPort=outsideServer.address().port;
  const unrelated=spawn(spec.runtime,['-e',"process.on('SIGTERM',()=>process.exit(42));console.log('ready');setInterval(()=>{},1000)"],{env:sanitizedEnvironment({executionPath:spec.executionPath,tmp:spec.writable[2],cache:spec.writable[3]}),stdio:['ignore','pipe','pipe']});
  const unrelatedClosed=new Promise(resolveClose=>unrelated.once('close',resolveClose));
  const port=Object.values(spec.endpoints.roles)[0];
  const code=`
  const fs=require('node:fs'),cp=require('node:child_process'),net=require('node:net');
  const checks=[];function ok(name,passed){checks.push({name,passed:passed===true});}
  function denied(fn){try{fn();return false;}catch(e){return ['EPERM','EACCES'].includes(e.code);}}
  ok('allowed-write',(fs.writeFileSync(${quote(join(spec.writable[1],'sandbox-canary'))},'synthetic'),true));
  ok('outside-read',denied(()=>fs.readFileSync(${quote(outsideRead)})));
  ok('outside-write',denied(()=>fs.writeFileSync(${quote(join(dirname(outsideRead),'write-probe'))},'bad')));
  ok('immutable-input-write',denied(()=>fs.writeFileSync(${quote(immutableFile)},'bad')));
  ok('immutable-artifact-write',denied(()=>fs.writeFileSync(${quote(artifactCanary)},'bad')));
  const child=cp.spawnSync(process.execPath,['-e',${quote(`try{require('fs').readFileSync(${quote(outsideRead)});process.exit(2)}catch(e){process.exit(['EPERM','EACCES'].includes(e.code)?0:3)}`)}]);
  ok('child-inherits-denial',child.status===0);
  const native=cp.spawnSync(${quote(nativeExecutable)},[]);ok('native-exec',!!native.error&&['EPERM','EACCES'].includes(native.error.code));
  const unapproved=cp.spawnSync('/usr/bin/true',[]);ok('unapproved-exec',!!unapproved.error&&['EPERM','EACCES'].includes(unapproved.error.code));
  ok('sanitized-environment',!process.env.PREFLIGHT_SYNTHETIC_SECRET&&!process.env.NODE_OPTIONS&&!process.env.SSH_AUTH_SOCK);
  ok('unrelated-signal',denied(()=>process.kill(${unrelated.pid},'SIGTERM')));
  function connect(port,host){return new Promise(resolve=>{const s=net.connect({port,host});s.once('connect',()=>{s.destroy();resolve('connected')});s.once('error',e=>resolve(e.code));setTimeout(()=>{s.destroy();resolve('timeout')},1500).unref();});}
  (async()=>{
    const owned=cp.spawn(process.execPath,['-e',"console.log('ready');setInterval(()=>{},1000)"],{stdio:['ignore','pipe','pipe']});
    owned.stdout.once('data',()=>owned.kill('SIGTERM'));
    ok('own-child-cleanup',await new Promise(r=>{owned.once('error',()=>r(false));owned.once('close',(code,signal)=>r(signal==='SIGTERM'));}));
    ok('outside-listener', ['EPERM','EACCES'].includes(await connect(${forbiddenPort},'127.0.0.1')));
    ok('external-network', ['EPERM','EACCES'].includes(await connect(443,'192.0.2.1')));
    const bind=await new Promise(r=>{const s=net.createServer();s.once('error',e=>r(e.code));s.listen(${forbiddenPort},'127.0.0.1',()=>s.close(()=>r('bound')));});ok('unapproved-bind',['EPERM','EACCES'].includes(bind));
    const s=net.createServer(c=>c.end('synthetic'));await new Promise((r,j)=>{s.once('error',j);s.listen(${port},'127.0.0.1',r)});
    ok('exact-loopback',await connect(${port},'127.0.0.1')==='connected');await new Promise(r=>s.close(r));
    console.log(JSON.stringify(checks));process.exitCode=checks.every(c=>c.passed)?0:1;
  })().catch(()=>process.exitCode=1);`;
  try {
    await new Promise((ready,reject)=>{const timer=setTimeout(()=>reject(new Error('Synthetic signal canary failed to start')),5000);unrelated.once('error',error=>{clearTimeout(timer);reject(error);});unrelated.stdout.once('data',()=>{clearTimeout(timer);ready();});});
    const result=await executeSandbox(sandbox,{file:spec.runtime,args:['-e',code],timeoutMs:15000});
    let checks;try{checks=JSON.parse(result.stdout);}catch{throw new Error(`Sandbox enforcement probe failed (exit ${result.exitCode}; output ${result.stdoutSha256}; error ${result.stderrSha256})`);}
    assert.equal(result.exitCode,0,`Sandbox boundary denied incorrectly: ${checks.filter(c=>!c.passed).map(c=>c.name).join(', ')}`);
    assert(checks.length===15&&checks.every(c=>c.passed)&&unrelated.exitCode===null&&unrelated.signalCode===null,'All sandbox boundaries must be proven before consumer execution');
    return {schemaVersion:1,passed:true,profileSha256:sandbox.profileSha256,networkSha256:sandbox.networkSha256,runtimeSha256:spec.executables[spec.runtime],checks,stdoutSha256:result.stdoutSha256,stderrSha256:result.stderrSha256};
  } finally {unrelated.kill('SIGKILL');await unrelatedClosed;await new Promise(resolveClose=>outsideServer.close(resolveClose));}
}
