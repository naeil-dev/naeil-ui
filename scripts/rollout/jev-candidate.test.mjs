import test from 'node:test';
import assert from 'node:assert/strict';
import { parameterizeTests } from './jev-candidate.mjs';

const shared = 'expect(header).toHaveAttribute("data-naeil-ui-version", "0.7.1"); expect(footer).toHaveAttribute("data-naeil-ui-contract", "1"); expect(identity).toMatchObject({ui: {version: "0.7.1", contractVersion: "1"}});';
const account = 'const bytes = readFileSync("vendor/naeil-account-0.7.1.json"); expect(hash(bytes)).toBe("158dd3bca9d5c4dd8068cf97d70de1c65d7b187f3057f9388409a7685b447bc5"); expect(hash(renderer)).toBe("709fa8c39f035d7c803c69e8207a3ed44c0ce37271835db6c645439a373c2e2d");';

test('candidate expectations derive version, contract and independent account digest from release', () => {
  const actual = parameterizeTests(shared, account);
  assert(actual.shared.includes('rolloutRelease.version'));
  assert(actual.shared.includes('rolloutRelease.contract.version'));
  assert(!actual.shared.includes('"0.7.1"'));
  assert(actual.account.includes('readFileSync(rolloutRelease.account.path)'));
  assert(actual.account.includes('toBe(rolloutRelease.account.sha256)'));
  assert(actual.account.includes('709fa8c39f035d7c803c69e8207a3ed44c0ce37271835db6c645439a373c2e2d'));
  assert(shared.includes('"0.7.1"')); // Source text stays untouched.
});

test('changed historical test shapes require review rather than skipping assertions', () => {
  for (const [s, a] of [[shared.replace('"0.7.1"', '"0.7.2"'), account], [shared, account.replace('158dd3b', 'foreign')], [shared + shared, account]]) assert.throws(() => parameterizeTests(s, a));
});

import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,realpathSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {prepareCandidateHarness,fixtureManifest,assertCandidateHarness} from './jev-candidate.mjs';
import {declaration} from './fixtures/reviewed-expectations.mjs';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
function apiFixture(t){
 const root=realpathSync(mkdtempSync(join(tmpdir(),'jev-fixture-api-')));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const worktree=join(root,'source');mkdirSync(join(worktree,'tests/e2e'),{recursive:true});mkdirSync(join(worktree,'tests/fixtures'));mkdirSync(join(worktree,'node_modules'));mkdirSync(join(worktree,'.next/standalone/.next'),{recursive:true});
 const shared='import {loadStandingReference} from "../fixtures/standing-ui-reference.mjs"; const standing=loadStandingReference(uiRelease);';
 const account='const accountReference=loadStandingReference(uiRelease).account;';
 writeFileSync(join(worktree,'tests/e2e/shared-chrome.spec.ts'),shared);writeFileSync(join(worktree,'tests/e2e/account-control.spec.ts'),account);writeFileSync(join(worktree,'tests/fixtures/standing-ui-reference.mjs'),'export const fixtureAPI=2;');writeFileSync(join(worktree,'playwright.config.ts'),'export default {};');writeFileSync(join(worktree,'.next/standalone/.next/BUILD_ID'),'synthetic-build\n');
 const release={releaseId:'naeil-ui-0.7.42',version:'0.7.42',sourceRevision:'a'.repeat(40),archive:{sha256:'b'.repeat(64)},contract:{version:'1',sha256:'c'.repeat(64)},account:{path:join(root,'account.json')}};
 const put=(path,data)=>writeFileSync(path,JSON.stringify(data),{mode:0o600});
 put(release.account.path,{schemaVersion:1,kind:'independent-account-render',frozen:true,sourceRevision:release.sourceRevision,archiveSha256:release.archive.sha256,ui:{version:release.version,contractVersion:'1'},cases:[{render:{uiVersion:release.version}}]});release.account.sha256=digest(readFileSync(release.account.path));
 release.expectations={path:join(root,'expectations.json')};const expected=declaration(release);put(release.expectations.path,expected);release.expectations.sha256=digest(readFileSync(release.expectations.path));
 const reference=ref=>({...ref,bytes:readFileSync(ref.path).length});
 const transport={schemaVersion:2,kind:'standing-ui-reference',release:expected.release,account:reference(release.account),expectations:reference(release.expectations),routingProfile:null};
 const fixturePath=join(root,'fixture.json');put(fixturePath,transport);
 const options={schemaVersion:2,fixturesSha256:digest(JSON.stringify(fixtureManifest(worktree))),fixturePath};
 return {root,worktree,release,options,transport,put,directory:join(root,'harness'),sourceRevision:'d'.repeat(40)};
}
test('explicit schema2 harness preserves exact approved source bytes and returns mandatory mode transport',t=>{
 const f=apiFixture(t);const original=fixtureManifest(f.worktree);
 const harness=prepareCandidateHarness(f.release,f.worktree,f.directory,f.sourceRevision,f.options);
 assert.deepEqual(fixtureManifest(harness.directory),original);assert.deepEqual(harness.receipt.parameterizedFiles,{});
 assert.equal(harness.receipt.fixtureAPI,'schema2');assert.equal(harness.receipt.expectationsSha256,f.release.expectations.sha256);
 assert.deepEqual(harness.env,{NAEIL_UI_STANDING_MODE:'schema2',NAEIL_UI_STANDING_FIXTURE:f.options.fixturePath});
 assertCandidateHarness(harness);writeFileSync(join(f.directory,'tests/e2e/shared-chrome.spec.ts'),'changed');assert.throws(()=>assertCandidateHarness(harness),/changed/i);
});
test('schema2 rejects source drift, transport mismatch and unsupported profiles before copying',t=>{
 for(const change of [f=>f.options.fixturesSha256='0'.repeat(64),f=>f.transport.schemaVersion=1,f=>f.transport.release.chromeSha256='0'.repeat(64),f=>f.transport.account.bytes++,f=>f.transport.routingProfile={id:'__proto__',sha256:'0'.repeat(64)},f=>f.options.command='ignored']){
  const f=apiFixture(t);change(f);f.put(f.options.fixturePath,f.transport);
  assert.throws(()=>prepareCandidateHarness(f.release,f.worktree,f.directory,f.sourceRevision,f.options));assert(!existsSync(f.directory));
 }
});
test('legacy rewriting refuses an arbitrary caller pin even when it exactly matches the source manifest',t=>{
 const f=apiFixture(t);
 assert.throws(()=>prepareCandidateHarness(f.release,f.worktree,f.directory,f.sourceRevision,f.options.fixturesSha256),/legacy|historical/i);
 assert(!existsSync(f.directory));
});

test('schema2 harness rechecks exact standing transport and reference bytes after browser gates',t=>{
 for(const change of [f=>f.put(f.options.fixturePath,{...f.transport,kind:'changed'}),f=>writeFileSync(f.transport.expectations.path,'changed'),f=>writeFileSync(f.transport.account.path,'changed')]){
  const f=apiFixture(t);const harness=prepareCandidateHarness(f.release,f.worktree,f.directory,f.sourceRevision,f.options);
  change(f);assert.throws(()=>assertCandidateHarness(harness),/fixture|reference|transport|digest/i);
 }
});
