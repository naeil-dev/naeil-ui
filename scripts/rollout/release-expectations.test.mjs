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

const release072 = {
  releaseId: 'naeil-ui-0.7.2', version: '0.7.2', sourceRevision: '40a3928e24cd2f0141be3e605eed0a75260938fd',
  archive: { sha256: 'b7919ed182307c5c3b48515f68567b0e4f51c611c86b7acf8861e769f596e2ec' },
  contract: { version: '1', sha256: '4600e13950a5a0bdf3c3581d6c331db756da603e890ada43c812c9cbd07dd9d2' },
  account: { sha256: 'e5491696d32ed825b90bd79db55cc21ab8ef181e8a2262beb0293d94da8f51ab' },
};
const naeilNextIntlProfile = {
  id: 'naeil-next-intl-en-default', sha256: '62582d03fdc065939b818ce3252aa37537b874c982693793c64ccc72ae1a2928',
};

test('naeil next-intl default English profile requires the exact reviewed ID/digest and preserves canonical content', async () => {
  const { loadReleaseExpectations } = await import('./release-expectations.mjs');
  const canonical = loadReleaseExpectations(release072);
  assert(canonical.profiles[naeilNextIntlProfile.id], 'Reviewed naeil next-intl profile required');
  assert.equal(hash(JSON.stringify(canonical.profiles[naeilNextIntlProfile.id])), naeilNextIntlProfile.sha256);
  const selected = loadReleaseExpectations(release072, { profile: naeilNextIntlProfile });
  assert.deepEqual(selected.profile, naeilNextIntlProfile);
  assert.deepEqual(selected.locales, {
    ...canonical.locales,
    en: [{ ...canonical.locales.en[0], href: 'https://naeil.dev/design' }],
  });
  assert.deepEqual(selected.release, canonical.release);
  assert.deepEqual(selected.layout, canonical.layout);
  assert.equal(canonical.profile, null);
  assert.equal(canonical.locales.en[0].href, 'https://naeil.dev/en/design');
  assert.equal(canonical.locales.ko[0].href, 'https://naeil.dev/ko/design');
  assert.equal(canonical.locales.ja[0].href, 'https://naeil.dev/ja/design');
  assert(Object.isFrozen(selected.locales.en[0]));
  assert.throws(() => loadReleaseExpectations(release072, {
    profile: { ...naeilNextIntlProfile, sha256: '0'.repeat(64) },
  }), /profile digest mismatch/);
  assert.throws(() => loadReleaseExpectations(release072, {
    profile: { ...naeilNextIntlProfile, id: 'unreviewed-next-intl-default' },
  }), /Unapproved routing profile/);
});

test('naeil next-intl default English catalog allows only the selected exact hrefs and retains strict content checks', async () => {
  const { loadReleaseExpectations, expectedProjects, assertProjectCatalog } = await import('./release-expectations.mjs');
  const canonical = loadReleaseExpectations(release072);
  const selected = loadReleaseExpectations(release072, { profile: naeilNextIntlProfile });
  const layout = { ...selected.layout, columns: 1 };
  // Independent synthetic observations of the source-declared site routing.
  const hrefs = { en: 'https://naeil.dev/design', ko: 'https://naeil.dev/ko/design', ja: 'https://naeil.dev/ja/design' };
  for (const locale of ['en', 'ko', 'ja']) {
    const actual = { x: 0, width: 240, columns: 1, declaredColumns: 1, items: [{
      href: hrefs[locale], name: 'naeil-ui', image: 'https://naeil.dev/images/whale.png',
      x: 0, y: 0, width: 240, height: 80, visible: true,
    }] };
    const expected = expectedProjects(selected, locale, 'https://naeil.dev');
    assert.doesNotThrow(() => assertProjectCatalog(actual, expected, layout));
    if (locale === 'en') {
      assert.throws(() => assertProjectCatalog(actual, expectedProjects(canonical, locale, 'https://naeil.dev'), layout), /Project 0 href mismatch/);
    } else {
      assert.doesNotThrow(() => assertProjectCatalog(actual, expectedProjects(canonical, locale, 'https://naeil.dev'), layout));
    }
    for (const [key, value] of [
      ['href', locale === 'en' ? 'https://naeil.dev/en/design' : 'https://naeil.dev/design'],
      ['name', 'Wrong project'], ['image', 'https://naeil.dev/images/fish.png'],
    ]) {
      const wrong = structuredClone(actual); wrong.items[0][key] = value;
      assert.throws(() => assertProjectCatalog(wrong, expected, layout), new RegExp(`Project 0 ${key} mismatch`));
    }
  }
});
