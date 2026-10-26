import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chmodSync, existsSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { hash } from './standing-config.mjs';
import {declaration} from './fixtures/reviewed-expectations.mjs';
import {loadReleaseExpectations} from './release-expectations.mjs';
import { materializeRelease, assertManifest } from './standing-github.mjs';
import { checkDraft, prepareRelease } from './prepare-release.mjs';
import { syntheticArchive } from './fixtures/release.mjs';

function fixture(t) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'prepare-release-'))); chmodSync(root, 0o700);
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const put = (name, bytes) => { const path = join(root, name); writeFileSync(path, typeof bytes === 'object' && !Buffer.isBuffer(bytes) ? JSON.stringify(bytes) : bytes); return path; };
  const archive = syntheticArchive(), sourceRevision = 'a'.repeat(40), version = '0.7.42';
  const reference = { schemaVersion: 1, kind: 'independent-release-render', frozen: true, sourceRevision, archiveSha256: hash(archive), ui: { version, contractVersion: '1' }, cases: [{}] };
  const input = { version, previousVersion: '0.7.41', sourceRevision, siteSourceRevision: 'b'.repeat(40), archivePath: put('package.tgz', archive), siteArchivePath: put('site.tgz', syntheticArchive(version, undefined, 'Maintained docs')), chromeReferencePath: put('chrome.json', reference), accountReferencePath: put('account.json', { ...reference, kind: 'independent-account-render' }), changes: ['fix'], outputDirectory: join(root, 'assets') };
  input.expectationsPath=put('reviewed-expectations.json', declaration({releaseId:`naeil-ui-${version}`,version,sourceRevision,archive:{sha256:hash(archive)},contract:{version:'1',sha256:hash(readFileSync(input.chromeReferencePath))},account:{sha256:hash(readFileSync(input.accountReferencePath))}}));
  const listing = () => readdirSync(input.outputDirectory).map(name => { const bytes = readFileSync(join(input.outputDirectory, name)); return { name, url: `https://github.com/naeil-dev/naeil-ui/releases/download/v${version}/${name}`, size: bytes.length, digest: `sha256:${hash(bytes)}` }; });
  return { root, input, put, listing };
}

test('prepares owner-only assets accepted by the real manifest contract and checks draft bytes', t => {
  const f = fixture(t), { manifest } = prepareRelease(f.input), listing = f.listing();
  assert.equal(assertManifest(manifest, { tag_name: `v${manifest.version}`, assets: listing.map(asset => ({ browser_download_url: asset.url })) }).siteRuntimeSha256, manifest.siteRuntimeSha256);
  assert.equal(statSync(f.input.outputDirectory).mode & 0o777, 0o700);
  for (const name of readdirSync(f.input.outputDirectory)) assert.equal(statSync(join(f.input.outputDirectory, name)).mode & 0o777, 0o600);
  assert.equal(checkDraft(f.input.outputDirectory, listing).assets, 7);
  const receipt = JSON.parse(readFileSync(join(f.input.outputDirectory, 'site-runtime-verification.json')));
  assert.equal(receipt.expectationsSha256,hash(readFileSync(f.input.expectationsPath)));
  assert.equal(receipt.comparison.passed, true); assert.equal(receipt.siteRuntimeSha256, manifest.siteRuntimeSha256);
  assert.throws(() => prepareRelease(f.input), /EEXIST/);
  assert.deepEqual(readFileSync(join(f.input.outputDirectory, 'naeil-ui-0.7.42.tgz')), readFileSync(f.input.archivePath));
});

test('bad revisions, versions, runtime metadata/bytes and change classification fail before output creation', t => {
  const f = fixture(t);
  for (const change of [{ sourceRevision: 'main' }, { siteSourceRevision: 'b'.repeat(39) }, { version: '0.7.43' }, { version: '0.8.0' }, { previousVersion: '0.7.40' }, { changes: [] }, { changes: ['unknown'] }]) {
    assert.throws(() => prepareRelease({ ...f.input, ...change })); assert(!existsSync(f.input.outputDirectory));
  }
  f.put('site.tgz', syntheticArchive('0.7.42', 'export const drift = true;'));
  assert.throws(() => prepareRelease(f.input), /runtime bytes/);
  f.put('site.tgz', syntheticArchive('0.7.43'));
  assert.throws(() => prepareRelease(f.input), /metadata/);
});

test('references must bind schema, frozen kind, package source/archive/UI and nonempty cases', t => {
  const f = fixture(t);
  for (const key of ['chromeReferencePath', 'accountReferencePath']) {
    const baseline = JSON.parse(readFileSync(f.input[key]));
    for (const change of [{ schemaVersion: 2 }, { kind: 'consumer-render' }, { frozen: false }, { sourceRevision: 'b'.repeat(40) }, { archiveSha256: 'f'.repeat(64) }, { ui: { version: '0.7.43', contractVersion: '1' } }, { ui: { version: '0.7.42', contractVersion: '2' } }, { cases: [] }, { cases: {} }]) {
      writeFileSync(f.input[key], JSON.stringify({ ...baseline, ...change }));
      assert.throws(() => prepareRelease(f.input)); assert(!existsSync(f.input.outputDirectory));
    }
    writeFileSync(f.input[key], JSON.stringify(baseline));
  }
});

test('draft check rejects absent, ambiguous, mismatched name/URL/size/digest and altered local files', t => {
  const f = fixture(t); prepareRelease(f.input); const listing = f.listing();
  assert.throws(() => checkDraft(f.input.outputDirectory, listing.slice(1)));
  assert.throws(() => checkDraft(f.input.outputDirectory, [...listing, listing[0]]));
  for (const [key, value] of [['name', 'foreign.json'], ['url', listing[0].url.replace('/v0.7.42/', '/v0.7.43/')], ['size', 1], ['digest', 'sha256:' + 'f'.repeat(64)]]) {
    const changed = structuredClone(listing); changed[0][key] = value; assert.throws(() => checkDraft(f.input.outputDirectory, changed));
  }
  writeFileSync(join(f.input.outputDirectory, 'naeil-ui-0.7.42.tgz'), 'altered');
  assert.throws(() => checkDraft(f.input.outputDirectory, listing), /digest mismatch/);
});

test('current-schema documentation example passes assertManifest after explicit placeholder substitution', () => {
  const example = readFileSync(new URL('../../docs/rollout/release.example.json', import.meta.url), 'utf8');
  const replacements = { REPLACE_VERSION: '0.7.42', REPLACE_PREVIOUS_VERSION: '0.7.41', REPLACE_PACKAGE_40_HEX_REVISION: 'a'.repeat(40), REPLACE_SITE_40_HEX_REVISION: 'b'.repeat(40) };
  const manifest = JSON.parse(Object.entries(replacements).reduce((value, [key, replacement]) => value.replaceAll(key, replacement), example).replace(/REPLACE_[A-Z_]+_64_HEX_SHA256/g, 'c'.repeat(64)));
  const item = { tag_name: `v${manifest.version}`, assets: ['archive', 'siteArchive', 'contract', 'account'].map(key => ({ browser_download_url: manifest[key].url })) };
  assert.doesNotThrow(() => assertManifest(manifest, item));
  assert.deepEqual(manifest.changes, ['fix']); assert(!example.includes('"path"'));
});

test('parameterized prepare/check CLI runs entirely on synthetic local files', t => {
  const f = fixture(t), input = f.put('input.json', f.input);
  const cli = new URL('./prepare-release.mjs', import.meta.url);
  const prepared = JSON.parse(execFileSync(process.execPath, [cli.pathname, 'prepare', input])); assert.equal(prepared.manifest.version, f.input.version);
  const listing = f.put('listing.json', f.listing());
  assert.equal(JSON.parse(execFileSync(process.execPath, [cli.pathname, 'check', f.input.outputDirectory, listing])).passed, true);
});


test('future reviewed asset prepares/materializes without table entries and substitutions/missing inputs fail before use', async t => {
  const f=fixture(t);
  assert.throws(()=>prepareRelease({...f.input,expectationsPath:undefined}),/expectations/i);
  assert(!existsSync(f.input.outputDirectory));
  const {manifest}=prepareRelease(f.input), listing=f.listing();
  assert.equal(manifest.expectations.url,'https://github.com/naeil-dev/naeil-ui/releases/download/v0.7.42/naeil-expectations-0.7.42.json');
  const item={id:42,tag_name:'v0.7.42',author:{login:'owner'},published_at:'2026-10-26T00:00:00Z',assets:listing.map((asset,i)=>({...asset,id:i+1,browser_download_url:asset.url}))};
  const config={stateDirectory:f.root,trustedPublishers:['owner'],manifestAsset:'release.json'};
  const github={asset:async asset=>readFileSync(join(f.input.outputDirectory,asset.name)),tagRevision:async()=>f.input.sourceRevision,mainAncestor:async()=>{}};
  const result=await materializeRelease(item,config,github);
  assert.equal(loadReleaseExpectations(result.release).locales.en[0].name,'naeil-ui');
  assert.equal(result.expectationsSha256,manifest.expectations.sha256);
  const absent=structuredClone(item);absent.assets=absent.assets.filter(asset=>!asset.name.startsWith('naeil-expectations'));
  await assert.rejects(materializeRelease(absent,{...config,stateDirectory:join(f.root,'missing')},github),/exact asset/);
  const changed={...github,asset:async asset=>asset.name.startsWith('naeil-expectations')?Buffer.from('{}'):github.asset(asset)};
  await assert.rejects(materializeRelease(item,config,changed),/digest/);
});

test('preparation rejects tuple/schema/review mismatch before creating assets', t=>{
  const f=fixture(t), baseline=JSON.parse(readFileSync(f.input.expectationsPath));
  for(const mutate of [d=>d.schemaVersion=9,d=>d.release.chromeSha256='f'.repeat(64),d=>d.review.approvedBy='',d=>delete d.locales.ja]) {
    const d=structuredClone(baseline);mutate(d);writeFileSync(f.input.expectationsPath,JSON.stringify(d));
    assert.throws(()=>prepareRelease(f.input));assert(!existsSync(f.input.outputDirectory));
  }
});

test('materialization never rewrites an existing legacy snapshot to attach new bindings',async t=>{
  const f=fixture(t);prepareRelease(f.input);const listing=f.listing();
  const item={id:42,tag_name:'v0.7.42',author:{login:'owner'},published_at:'2026-10-26T00:00:00Z',assets:listing.map((a,i)=>({...a,id:i+1,browser_download_url:a.url}))};
  const config={stateDirectory:f.root,trustedPublishers:['owner'],manifestAsset:'release.json'};
  const github={asset:async a=>readFileSync(join(f.input.outputDirectory,a.name)),tagRevision:async()=>f.input.sourceRevision,mainAncestor:async()=>{}};
  await materializeRelease(item,config,github);
  const snapshotPath=join(f.root,'releases','42','snapshot.json'),legacy=JSON.parse(readFileSync(snapshotPath));
  delete legacy.expectationsSha256;writeFileSync(snapshotPath,JSON.stringify(legacy));
  const before=readFileSync(snapshotPath),result=await materializeRelease(item,config,github);
  assert.match(result.expectationsSha256,/^[a-f0-9]{64}$/);assert.deepEqual(readFileSync(snapshotPath),before);
  legacy.expectationsSha256='f'.repeat(64);writeFileSync(snapshotPath,JSON.stringify(legacy));
  await assert.rejects(materializeRelease(item,config,github),/expectations/i);
});

test('draft validation cannot bypass independent declaration review or omit future expectations',t=>{
 const f=fixture(t);const {manifest}=prepareRelease(f.input);
 const manifestPath=join(f.input.outputDirectory,'release.json');
 const missing=structuredClone(manifest);delete missing.expectations;writeFileSync(manifestPath,JSON.stringify(missing));
 assert.throws(()=>checkDraft(f.input.outputDirectory,f.listing()),/expectations|declaration/i);
 const changed=JSON.parse(readFileSync(f.input.expectationsPath));changed.review.approvedBy='';
 const bytes=Buffer.from(JSON.stringify(changed));writeFileSync(join(f.input.outputDirectory,'naeil-expectations-0.7.42.json'),bytes);
 manifest.expectations.sha256=hash(bytes);writeFileSync(manifestPath,JSON.stringify(manifest));
 assert.throws(()=>checkDraft(f.input.outputDirectory,f.listing()),/review/i);
});
