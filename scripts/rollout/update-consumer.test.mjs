import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, renameSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { digest } from './rollout.mjs';
import { updateConsumer } from './update-consumer.mjs';

function fixture(t) {
 const outer=mkdtempSync(join(tmpdir(),'ui-consumer-update-')),root=join(outer,'checkout');mkdirSync(root);
 t.after(()=>rmSync(outer,{recursive:true,force:true}));
 const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
 git(['init','-q','-b','rollout/test']);git(['config','user.name','Fixture']);git(['config','user.email','fixture@example.test']);
 writeFileSync(join(root,'.gitignore'),'node_modules/\n');
 const archive=version=>{const pack=join(outer,version);mkdirSync(join(pack,'package'),{recursive:true});writeFileSync(join(pack,'package/package.json'),JSON.stringify({name:'@naeil/ui',version}));const path=join(outer,`ui-${version}.tgz`);execFileSync('/usr/bin/tar',['-czf',path,'-C',pack,'package']);return path;};
 mkdirSync(join(root,'vendor'));writeFileSync(join(root,'vendor/naeil-ui-0.7.0.tgz'),readFileSync(archive('0.7.0')));
 writeFileSync(join(root,'package.json'),JSON.stringify({name:'fixture',packageManager:'pnpm@10.30.3',dependencies:{'@naeil/ui':'file:vendor/naeil-ui-0.7.0.tgz'}}));
 writeFileSync(join(root,'pnpm-lock.yaml'),'old lock\n');git(['add','.']);git(['commit','-qm','baseline']);
 const path=archive('0.7.1'),sha256=digest(readFileSync(path)),sourceRevision='b'.repeat(40);
 const referencePath=join(outer,'reference.json');const reference=JSON.stringify({schemaVersion:1,kind:'independent-release-render',frozen:true,sourceRevision,archiveSha256:sha256,ui:{version:'0.7.1',contractVersion:'1'}});writeFileSync(referencePath,reference);
 const context={release:{schemaVersion:1,releaseId:'ui-0.7.1',version:'0.7.1',previousVersion:'0.7.0',sourceRevision,archive:{path,url:'https://example.test/ui-0.7.1.tgz',sha256},contract:{version:'1',path:referencePath,sha256:digest(reference)},changes:['fix']},service:{id:'estimate'},policy:{schemaVersion:1,enabled:true,approvedBy:'fixture',approvalRef:'fixture',expiresAt:'2099-01-01',services:['estimate'],stopFile:join(outer,'STOP'),maxEvidenceAgeSeconds:3600,patchWindow:{minVersion:'0.7.1',maxVersion:'0.7.9',contractVersion:'1',services:['estimate'],approvedBy:'fixture',approvalRef:'fixture',reason:'Fictional test window',startsAt:'2026-01-01',expiresAt:'2099-01-01'}},adapterOptions:{update:{enabled:true,worktree:resolve(root),branch:'rollout/test',packageManager:'pnpm@10.30.3'}},idempotencyKey:'ui-0.7.1:estimate'};
 const install=({root,integrity,version})=>{writeFileSync(join(root,'pnpm-lock.yaml'),`integrity: ${integrity}\n`);mkdirSync(join(root,'node_modules/@naeil/ui'),{recursive:true});writeFileSync(join(root,'node_modules/@naeil/ui/package.json'),JSON.stringify({name:'@naeil/ui',version}));};
 return {root,git,context,install,run:()=>updateConsumer(context,{root,install})};
}
test('exact archive update commits only dependency/lock/vendor in a real isolated git worktree and is idempotent',t=>{
 const f=fixture(t),before=f.git(['rev-parse','HEAD']),result=f.run();assert.notEqual(result.sourceRevision,before);
 assert.equal(result.archiveSha256,f.context.release.archive.sha256);assert.equal(f.git(['status','--porcelain']),'');
 assert.deepEqual(f.git(['diff-tree','--no-commit-id','--name-only','-r','HEAD']).split('\n').sort(),['package.json','pnpm-lock.yaml','vendor/naeil-ui-0.7.1.tgz']);
 assert.equal(f.run().sourceRevision,result.sourceRevision);
});
test('disabled policy, dirty checkout and unprovisioned owner branch refuse before install',t=>{
 const f=fixture(t);f.context.adapterOptions.update.enabled=false;assert.throws(f.run,/disabled/);f.context.adapterOptions.update.enabled=true;
 f.context.policy.enabled=false;assert.throws(f.run,/approval/);f.context.policy.enabled=true;
 writeFileSync(join(f.root,'owner.txt'),'owner change');assert.throws(f.run,/clean/);rmSync(join(f.root,'owner.txt'));
 f.context.adapterOptions.update.branch='main';assert.throws(f.run,/branch/);
});
test('wrong lock integrity and unexpected install changes cannot produce an update commit',t=>{
 const f=fixture(t),before=f.git(['rev-parse','HEAD']);
 assert.throws(()=>updateConsumer(f.context,{root:f.root,install:()=>{}}),/lock/);assert.equal(f.git(['rev-parse','HEAD']),before);
 const g=fixture(t),old=g.git(['rev-parse','HEAD']);
 assert.throws(()=>updateConsumer(g.context,{root:g.root,install:args=>{g.install(args);writeFileSync(join(g.root,'unreviewed.js'),'bad')}}),/outside/);
 assert.equal(g.git(['rev-parse','HEAD']),old);
});
test('tracked symlinks cannot redirect package, lock or archive mutations outside the checkout',t=>{
 for(const target of ['package.json','pnpm-lock.yaml','vendor']) {
  const f=fixture(t),outside=join(f.root,'..',`outside-${target}`);
  renameSync(join(f.root,target),outside);symlinkSync(outside,join(f.root,target));f.git(['add','-A']);f.git(['commit','-qm','symlink fixture']);
  const before=f.git(['rev-parse','HEAD']);
  assert.throws(f.run,/Non-symlink/);assert.equal(f.git(['rev-parse','HEAD']),before);
  assert.equal(f.git(['status','--porcelain']),'');
 }
});
test('real pinned pnpm updates a fictional archive under CI and then passes frozen verification',t=>{
 const f=fixture(t);
 execFileSync('pnpm',['install','--no-frozen-lockfile','--ignore-scripts'],{cwd:f.root,env:{...process.env,CI:'true'},stdio:'pipe'});
 f.git(['add','pnpm-lock.yaml']);f.git(['commit','-qm','real frozen predecessor']);
 const previousCI=process.env.CI;process.env.CI='true';
 try {
  const result=updateConsumer(f.context,{root:f.root});assert.equal(result.uiVersion,'0.7.1');
  assert.equal(f.git(['status','--porcelain']),'');
  assert.equal(updateConsumer(f.context,{root:f.root}).sourceRevision,result.sourceRevision);
 } finally { if(previousCI===undefined)delete process.env.CI;else process.env.CI=previousCI; }
});
