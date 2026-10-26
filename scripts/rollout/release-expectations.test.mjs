import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, realpathSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { hash } from './standing-config.mjs';

// Hand-declared synthetic future input; no renderer or compatibility helper authors it.
import {futureRelease,declaration} from './fixtures/reviewed-expectations.mjs';
function privateAsset(t, value) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'expectations-'))); t.after(() => rmSync(root, {recursive:true,force:true}));
  const path = join(root, 'expectations.json'), bytes = Buffer.from(JSON.stringify(value)); writeFileSync(path, bytes, {mode:0o600});
  return {path, sha256:hash(bytes)};
}

test('future versions require independently reviewed frozen declarations and support them without code tables', async t => {
  const { loadReleaseExpectations, expectedProjects } = await import('./release-expectations.mjs');
  assert.throws(() => loadReleaseExpectations(futureRelease), /expectations|declaration/i);
  const release = { ...futureRelease, expectations: privateAsset(t, declaration()) };
  const result = loadReleaseExpectations(release);
  assert.equal(expectedProjects(result, 'ja', 'https://jev.naeil.dev')[0].href, 'https://naeil.dev/ja/design');
  assert(Object.isFrozen(result.locales.ja[0]));
  assert.throws(() => loadReleaseExpectations({...release, expectations:{...release.expectations,sha256:'f'.repeat(64)}}), /digest/);
});

test('schema, tuple, review, locale completeness and routing overrides fail closed', async t => {
  const { loadReleaseExpectations } = await import('./release-expectations.mjs');
  const mutations = [d=>d.schemaVersion=2, d=>d.frozen=false, d=>d.review.approvalRef='', d=>d.review.sourceCitations=[],
    ...['sourceRevision','archiveSha256','chromeSha256','accountSha256','contractVersion','releaseId','version'].map(key=>d=>d.release[key]='wrong'),
    d=>delete d.locales.ja, d=>d.locales.ko=[], d=>d.locales.en.push({...d.locales.en[0]}), d=>d.locales.en[0].name='', d=>d.locales.en[0].href='javascript:bad', d=>d.layout.desktopColumns=3];
  for (const mutate of mutations) { const data=declaration(); mutate(data); assert.throws(()=>loadReleaseExpectations({...futureRelease,expectations:privateAsset(t,data)})); }
  const release={...futureRelease,expectations:privateAsset(t,declaration())};
  assert.throws(()=>loadReleaseExpectations(release,{profile:{id:'unreviewed',sha256:'f'.repeat(64)}}),/profile/i);
  assert.throws(()=>loadReleaseExpectations(release,{profile:{id:'__proto__',sha256:hash('{}')}}),/profile/i);
});

test('reviewed exact profile requires its digest and retains independent content', async t => {
  const { loadReleaseExpectations, expectedProjects } = await import('./release-expectations.mjs');
  const data=declaration(), profile={ review:{approvedBy:'Owner',approvalRef:'consumer-source-sha',sourceCitations:['synthetic reviewed consumer']},locales:structuredClone(data.locales) };
  for(const locale of ['en','ko','ja']) profile.locales[locale][0].href='/design';
  data.profiles.local=profile; const release={...futureRelease,expectations:privateAsset(t,data)};
  const sha256=hash(JSON.stringify(profile));
  assert.equal(expectedProjects(loadReleaseExpectations(release,{profile:{id:'local',sha256}}),'ja','https://example.test')[0].href,'https://example.test/design');
  assert.throws(()=>loadReleaseExpectations(release,{profile:{id:'local',sha256:'f'.repeat(64)}}),/profile/i);
});

test('explicit declarations cannot opt unsupported release contracts or executable schema fields into operation',async t=>{
 const {loadReleaseExpectations}=await import('./release-expectations.mjs');
 for(const change of [{version:'0.8.0'},{sourceRevision:'main'},{contract:{version:'2',sha256:'c'.repeat(64)}},{archive:{sha256:'bad'}}]){
  const release={...futureRelease,...change};release.expectations=privateAsset(t,declaration(release));
  assert.throws(()=>loadReleaseExpectations(release));
 }
 for(const mutate of [d=>d.command={file:'/bin/sh'},d=>d.review.notes={selector:'body'},d=>d.locales.en[0].selector='a']){
  const data=declaration();mutate(data);assert.throws(()=>loadReleaseExpectations({...futureRelease,expectations:privateAsset(t,data)}));
 }
});
