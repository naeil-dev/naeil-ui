import test from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, existsSync, linkSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { hash } from './rollout-io.mjs';
import { GitHub, GitHubUnavailable, materializeRelease } from './release-discovery.mjs';

const revision = '0123456789abcdef0123456789abcdef01234567';
const comparePath = `/repos/naeil-dev/naeil-ui/compare/main...${revision}`;

for (const status of ['identical', 'behind']) {
  test(`mainAncestor accepts ${status} trusted main history through the actual API route`, async () => {
    const calls = [];
    const github = new GitHub({ token: 'fixture', fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return Response.json({ status, merge_base_commit: { sha: revision } });
    } });
    await github.mainAncestor(revision);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, `https://api.github.com${comparePath}`);
    assert.equal(calls[0].options.redirect, 'error');
  });
}

test('mainAncestor still rejects ahead, diverged and mismatched merge-base responses', async () => {
  for (const comparison of [
    { status: 'ahead', merge_base_commit: { sha: revision } },
    { status: 'diverged', merge_base_commit: { sha: revision } },
    { status: 'behind', merge_base_commit: { sha: 'f'.repeat(40) } },
  ]) {
    const github = new GitHub({ token: 'fixture', fetchImpl: async () => Response.json(comparison) });
    await assert.rejects(github.mainAncestor(revision), /Release\/app source must belong to trusted main history/);
  }
});

test('API rejects traversal, foreign routes and every unexpected dotted comparison before fetching', async () => {
  let calls = 0;
  const github = new GitHub({ token: 'fixture', fetchImpl: async () => { calls++; return Response.json({}); } });
  for (const path of [
    '/repos/naeil-dev/naeil-ui/../secrets',
    '/repos/naeil-dev/naeil-ui/releases/../../secrets',
    `/repos/foreign/naeil-ui/compare/main...${revision}`,
    `/repos/naeil-dev/naeil-ui-other/compare/main...${revision}`,
    `https://attacker.example${comparePath}`,
    `//attacker.example${comparePath}`,
    `/repos/naeil-dev/naeil-ui/compare/release...${revision}`,
    `/repos/naeil-dev/naeil-ui/compare/${revision}...main`,
    `/repos/naeil-dev/naeil-ui/compare/main..${revision}`,
    `/repos/naeil-dev/naeil-ui/compare/main....${revision}`,
    comparePath.slice(0, -1),
    `${comparePath}0`,
    `/repos/naeil-dev/naeil-ui/compare/main...${revision.toUpperCase()}`,
    `${comparePath}/../releases`,
    `${comparePath}?per_page=100`,
    `${comparePath}#fragment`,
    `${comparePath}\n`,
    `${comparePath}%2f..%2freleases`,
  ]) await assert.rejects(github.api(path), /Unexpected GitHub API route/, path);
  assert.equal(calls, 0);
});

test('mainAncestor rejects invalid revisions without fetching', async () => {
  let calls = 0;
  const github = new GitHub({ token: 'fixture', fetchImpl: async () => { calls++; return Response.json({}); } });
  for (const value of ['main', revision.slice(1), `${revision}0`, revision.toUpperCase(), `${revision}/../releases`]) {
    await assert.rejects(github.mainAncestor(value));
  }
  assert.equal(calls, 0);
});

test('ordinary repository API routes retain fixed HTTPS origin and redirect refusal', async () => {
  const github = new GitHub({ token: 'fixture', fetchImpl: async (url, options) => {
    assert.equal(url, 'https://api.github.com/repos/naeil-dev/naeil-ui/releases?per_page=100&page=1');
    assert.equal(options.redirect, 'error');
    return Response.json([{ id: 1 }]);
  } });
  assert.deepEqual(await github.releases(), [{ id: 1 }]);
});

test('F15 latest exact workflow cancellation is rerunnable and never falls back to old success', async () => {
  const run = { id: 10, head_sha: revision, head_branch: 'main', event: 'push', path: '.github/workflows/verify.yml', status: 'completed', conclusion: 'success', run_attempt: 1 };
  let latest = { ...run, id: 11, conclusion: 'cancelled' };
  const github = new GitHub({ fetchImpl: async () => Response.json({ workflow_runs: [run, latest, { ...run, id: 12, event: 'pull_request' }] }) });
  assert.equal((await github.workflow(revision, '.github/workflows/verify.yml')).state, 'cancelled');
  latest = { ...latest, conclusion: 'success', run_attempt: 2 };
  assert.equal((await github.workflow(revision, '.github/workflows/verify.yml')).state, 'success');
  latest.conclusion = 'failure'; assert.equal((await github.workflow(revision, '.github/workflows/verify.yml')).state, 'failed');
});

test('expectations downloads enforce their own bound while streaming, below the archive allowance',async()=>{
 const bytes=Buffer.alloc(2097153);
 const github=new GitHub({fetchImpl:async()=>new Response(bytes)});
 const asset={browser_download_url:'https://github.com/naeil-dev/naeil-ui/releases/download/v0.7.42/expectations.json',size:bytes.length};
 await assert.rejects(github.asset(asset,{maxBytes:2097152}),/size limit/);
});

test('awaited asset download cannot cross a cancelled local write guard to write frozen assets or snapshot',async t=>{
 const root=realpathSync(mkdtempSync(join(tmpdir(),'standing-materialize-')));chmodSync(root,0o700);t.after(()=>rmSync(root,{recursive:true,force:true}));
 const version='0.7.2',sourceRevision='a'.repeat(40),asset=name=>({id:name.length,name,size:3,browser_download_url:'https://github.com/naeil-dev/naeil-ui/releases/download/v'+version+'/'+name});
 const assets=['rollout-manifest.json','ui.tgz','chrome.json','account.json'].map(asset),item={id:42,tag_name:'v'+version,author:{login:'synthetic'},published_at:'2026-01-01',assets};
 const bytes=Buffer.from('pkg'),release={schemaVersion:1,releaseId:'synthetic',version,previousVersion:'0.7.1',sourceRevision,siteSourceRevision:sourceRevision,siteRuntimeSha256:'b'.repeat(64),changes:['fix'],archive:{url:assets[1].browser_download_url,sha256:hash(bytes)},contract:{url:assets[2].browser_download_url,sha256:'c'.repeat(64),version:'1'},account:{url:assets[3].browser_download_url,sha256:'d'.repeat(64)}};
 let current=true,downloads=0;const github={asset:async selected=>{downloads++;if(selected===assets[0])return Buffer.from(JSON.stringify(release));current=false;return bytes;},tagRevision:async()=>sourceRevision,mainAncestor:async()=>{}};
 await assert.rejects(()=>materializeRelease(item,{stateDirectory:root,trustedPublishers:['synthetic']},github,undefined,{beforeWrite:()=>assert(current,'local write cancelled during download')}),/local write cancelled/);
 assert.equal(downloads,2);assert.deepEqual(readdirSync(join(root,'releases/42')),[]);assert(!existsSync(join(root,'releases/42/snapshot.json')));
});

import { declaration } from './fixtures/reviewed-expectations.mjs';
import { syntheticArchive } from './fixtures/release.mjs';
import { runtimeIndex } from './package-runtime.mjs';

function releaseFixture(t) {
 const root=realpathSync(mkdtempSync(join(tmpdir(),'local-materialization-')));chmodSync(root,0o700);t.after(()=>rmSync(root,{recursive:true,force:true}));
 const version='0.7.42',sourceRevision='a'.repeat(40),siteSourceRevision='b'.repeat(40),archive=syntheticArchive(version),archiveSha256=hash(archive),ui={version,contractVersion:'1'};
 const reference=Buffer.from(JSON.stringify({schemaVersion:1,kind:'independent-release-render',frozen:true,sourceRevision,archiveSha256,ui,cases:[{}]}));
 const account=Buffer.from(JSON.stringify({schemaVersion:1,kind:'independent-account-render',sourceRevision,archiveSha256,ui,cases:[{}]}));
 const url=name=>`https://github.com/naeil-dev/naeil-ui/releases/download/v${version}/${name}`;
 const manifest={schemaVersion:1,releaseId:'synthetic-0.7.42',version,previousVersion:'0.7.41',sourceRevision,siteSourceRevision,siteRuntimeSha256:hash(JSON.stringify(runtimeIndex(archive))),archive:{url:url('package.tgz'),sha256:archiveSha256},siteArchive:{url:url('site.tgz'),sha256:archiveSha256},contract:{version:'1',url:url('chrome.json'),sha256:hash(reference)},account:{url:url('account.json'),sha256:hash(account)},changes:['fix']};
 const expectations=Buffer.from(JSON.stringify(declaration(manifest)));manifest.expectations={url:url('expectations.json'),sha256:hash(expectations)};
 const data=new Map(Object.entries({'package.tgz':archive,'site.tgz':archive,'chrome.json':reference,'account.json':account,'expectations.json':expectations,'rollout-manifest.json':Buffer.from(JSON.stringify(manifest))}).map(([name,bytes])=>[url(name),bytes]));
 const assets=[...data].map(([url,bytes],index)=>({id:index+1,name:new URL(url).pathname.split('/').at(-1),size:bytes.length,digest:'sha256:'+hash(bytes),browser_download_url:url}));
 const item={id:42,tag_name:'v'+version,author:{login:'synthetic'},draft:false,prerelease:false,published_at:'2026-10-29T00:00:00Z',assets};
 const config={stateDirectory:root,trustedPublishers:['synthetic']},ancestry=[];
 const github={asset:async asset=>data.get(asset.browser_download_url),tagRevision:async()=>sourceRevision,mainAncestor:async revision=>{ancestry.push(revision);}};
 const changeManifest=change=>{change(manifest);const bytes=Buffer.from(JSON.stringify(manifest)),asset=assets.find(a=>a.name==='rollout-manifest.json');data.set(asset.browser_download_url,bytes);asset.size=bytes.length;asset.digest='sha256:'+hash(bytes);};
 return {root,item,config,github,data,manifest,ancestry,changeManifest,run:existing=>materializeRelease(item,config,github,existing)};
}

test('materialization binds trusted publisher, published state, exact tag, sources and asset hashes',async t=>{
 for(const cause of ['publisher','draft','prerelease','tag','archive','site-source','missing-asset']){
  const f=releaseFixture(t);
  if(cause==='publisher')f.item.author.login='outsider';if(cause==='draft')f.item.draft=true;if(cause==='prerelease')f.item.prerelease=true;
  if(cause==='tag')f.github.tagRevision=async()=>'f'.repeat(40);
  if(cause==='archive')f.changeManifest(value=>{value.archive.sha256='f'.repeat(64);});
  if(cause==='site-source')f.changeManifest(value=>{delete value.siteSourceRevision;});
  if(cause==='missing-asset')f.item.assets=f.item.assets.filter(asset=>asset.name!=='account.json');
  await assert.rejects(f.run());assert(!existsSync(join(f.root,'releases/42/snapshot.json')));
 }
 const f=releaseFixture(t),snapshot=await f.run();assert.deepEqual(f.ancestry,[f.manifest.sourceRevision,f.manifest.siteSourceRevision]);assert(snapshot.expectationsSha256);assert.equal(snapshot.approval,undefined);
 const path=join(f.root,'releases/42/snapshot.json'),before=readFileSync(path);assert.deepEqual(await f.run(snapshot),snapshot);assert.deepEqual(readFileSync(path),before);
 f.item.assets[0].id++;await assert.rejects(f.run(snapshot),/changed/);assert.deepEqual(readFileSync(path),before);
});
test('cached tag and manifest bytes cannot be replaced after a successful materialization',async t=>{
 for(const cause of ['tag','manifest']){
  const f=releaseFixture(t),snapshot=await f.run();
  if(cause==='tag')f.github.tagRevision=async()=>'f'.repeat(40);
  else {const asset=f.item.assets.find(a=>a.name==='rollout-manifest.json');f.data.set(asset.browser_download_url,Buffer.from(JSON.stringify({...f.manifest,changes:['dom']})));}
  await assert.rejects(f.run(snapshot),/Tag|tag|manifest/);
 }
});
test('cached frozen assets reject symlinks, hardlinks, public permissions and changed bytes',async t=>{
 for(const cause of ['symlink','hardlink','permission','bytes']){
  const f=releaseFixture(t),snapshot=await f.run(),path=join(f.root,'releases/42/archive.tgz');
  const before=readFileSync(join(f.root,'releases/42/snapshot.json'));
  if(['symlink','hardlink'].includes(cause)){const other=join(f.root,'copied');writeFileSync(other,readFileSync(path),{mode:0o600});unlinkSync(path);if(cause==='symlink')symlinkSync(other,path);else linkSync(other,path);}
  else if(cause==='permission')chmodSync(path,0o644);else writeFileSync(path,'changed');
  await assert.rejects(f.run(snapshot));assert.deepEqual(readFileSync(join(f.root,'releases/42/snapshot.json')),before);
 }
});
test('release listing paginates and release assets refuse foreign redirects',async()=>{
 let calls=0;const github=new GitHub({fetchImpl:async url=>{calls++;return Response.json(new URL(url).searchParams.get('page')==='1'?Array.from({length:100},(_,id)=>({id})):[{id:100}]);}});
 assert.equal((await github.releases()).length,101);assert.equal(calls,2);
 const redirect=new GitHub({fetchImpl:async()=>new Response('',{status:302,headers:{location:'https://attacker.example/archive'}})});
 await assert.rejects(redirect.asset({browser_download_url:'https://github.com/naeil-dev/naeil-ui/releases/download/v0.7.42/package.tgz',size:0}));
 for(const response of [()=>{throw Error('private provider failure');},()=>new Response('',{status:429})])await assert.rejects(new GitHub({fetchImpl:response}).releases(),GitHubUnavailable);
});
