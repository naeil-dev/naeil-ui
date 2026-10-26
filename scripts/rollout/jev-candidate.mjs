/** Run the reviewed Jev behavior suite against release-bound expectations.
 * Schema2 copies exact reviewed source without rewriting. The historical
 * literal adapter remains restricted to the immutable original fixture hash.
 */
import assert from 'node:assert/strict';
import { cpSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, symlinkSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {JSON_LIMITS,readPrivateBytes} from './standing-config.mjs';
import {loadReleaseExpectations,selectExpectationProfile} from './release-expectations.mjs';

export const REVIEWED_FIXTURE_SHA256 = 'f35c241851f35bec1f4d5cbdfceec460a381b9ba20b64cb1c74165a82ba45367';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const prefix = 'import { readFileSync as rolloutRead } from "node:fs";\nconst rolloutRelease = JSON.parse(rolloutRead(process.env.JEV_CANDIDATE_RELEASE, "utf8"));\n';

function replaceExact(source, pattern, count, replacement) {
  assert.equal([...source.matchAll(pattern)].length, count, 'Historical candidate assertion changed; review fixture provenance');
  return source.replace(pattern, replacement);
}

export function parameterizeTests(shared, account) {
  assert(!shared.includes('rolloutRelease') && !account.includes('rolloutRelease'), 'Candidate fixture already parameterized');
  shared = replaceExact(shared, /"0\.7\.1"/g, 2, 'rolloutRelease.version');
  shared = replaceExact(shared, /("data-naeil-ui-contract",\s*)"1"/g, 1, '$1rolloutRelease.contract.version');
  shared = replaceExact(shared, /contractVersion: "1"/g, 1, 'contractVersion: rolloutRelease.contract.version');
  account = replaceExact(account, /"vendor\/naeil-account-0\.7\.1\.json"/g, 1, 'rolloutRelease.account.path');
  account = replaceExact(account, /"158dd3bca9d5c4dd8068cf97d70de1c65d7b187f3057f9388409a7685b447bc5"/g, 1, 'rolloutRelease.account.sha256');
  return { shared: prefix + shared, account: prefix + account };
}

export function fixtureManifest(worktree) {
  const tests = join(worktree, 'tests'); assert(lstatSync(tests).isDirectory() && !lstatSync(tests).isSymbolicLink(), 'Real candidate test directory required');
  const files = {};
  function walk(directory, prefix = '') {
    for (const name of readdirSync(directory).sort()) {
      const path = join(directory, name), stat = lstatSync(path), key = prefix + name;
      assert(!stat.isSymbolicLink(), 'Candidate test symlink refused');
      if (stat.isDirectory()) walk(path, `${key}/`);
      else { assert(stat.isFile() && stat.nlink === 1, 'Regular candidate test required'); files[key] = hash(readFileSync(path)); }
    }
  }
  walk(join(worktree, 'tests'), 'tests/');
  const config = join(worktree, 'playwright.config.ts'); assert(lstatSync(config).isFile() && !lstatSync(config).isSymbolicLink());
  files['playwright.config.ts'] = hash(readFileSync(config));
  return Object.fromEntries(Object.entries(files).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0));
}

export function assertCandidateHarness(harness) {
  if(harness.receipt.fixtureAPI==='schema2'){
    const bytes=readPrivateBytes(harness.env.NAEIL_UI_STANDING_FIXTURE,JSON_LIMITS.transport);
    assert.equal(hash(bytes),harness.receipt.fixtureSha256,'Standing transport digest changed during browser gates');
    const fixture=JSON.parse(bytes);
    for(const ref of [fixture.account,fixture.expectations]){
      const bytes=readPrivateBytes(ref.path,JSON_LIMITS.evidence);
      assert.equal(bytes.length,ref.bytes,'Standing reference size changed');assert.equal(hash(bytes),ref.sha256,'Standing reference digest changed');
    }
  }
  assert.deepEqual(fixtureManifest(harness.directory), { ...harness.receipt.originalFiles, ...harness.receipt.parameterizedFiles }, 'Candidate harness changed during browser gates');
}

export function prepareCandidateHarness(release, worktree, directory, sourceRevision, expectedFixtures = REVIEWED_FIXTURE_SHA256) {
  assert(isAbsolute(worktree) && isAbsolute(directory), 'Absolute candidate paths required');
  assert(/^[a-f0-9]{40}$/.test(sourceRevision), 'Reviewed candidate source pin required');
  const schema2=expectedFixtures&&typeof expectedFixtures==='object';
  let fixturePath,fixtureSha256,expectationsSha256;
  if(schema2){
    assert(Object.keys(expectedFixtures).every(key=>['schemaVersion','fixturesSha256','fixturePath'].includes(key))&&expectedFixtures.schemaVersion===2,'Explicit schema2 harness options required');
    assert(/^[a-f0-9]{64}$/.test(expectedFixtures.fixturesSha256),'Reviewed schema2 fixture pin required');
    fixturePath=expectedFixtures.fixturePath;
    const bytes=readPrivateBytes(fixturePath,JSON_LIMITS.transport),fixture=JSON.parse(bytes);
    assert(Object.keys(fixture).every(key=>['schemaVersion','kind','release','account','expectations','routingProfile'].includes(key))&&fixture.schemaVersion===2&&fixture.kind==='standing-ui-reference'&&Object.hasOwn(fixture,'routingProfile'),'Explicit schema2 standing transport required');
    const expected=loadReleaseExpectations(release);
    assert.deepEqual(fixture.release,expected.release,'Standing transport release tuple mismatch');
    for(const [key,sha256] of [['account',release.account.sha256],['expectations',expected.sha256]]){
      const reference=fixture[key];
      assert(reference&&Object.keys(reference).every(key=>['path','sha256','bytes'].includes(key))&&Number.isSafeInteger(reference.bytes)&&reference.bytes>0&&reference.bytes<=JSON_LIMITS.evidence,'Bounded standing reference required');
      const bytes=readPrivateBytes(reference.path,JSON_LIMITS.evidence);
      assert.equal(bytes.length,reference.bytes,'Standing reference byte count mismatch');assert.equal(hash(bytes),sha256,'Standing reference content mismatch');assert.equal(reference.sha256,sha256,'Standing reference release digest mismatch');
    }
    selectExpectationProfile(expected,fixture.routingProfile??undefined);
    fixtureSha256=hash(bytes);expectationsSha256=expected.sha256;
  }else assert.equal(expectedFixtures,REVIEWED_FIXTURE_SHA256,'Legacy harness requires the exact immutable historical fixture hash');
  const reviewedHash=schema2?expectedFixtures.fixturesSha256:REVIEWED_FIXTURE_SHA256;
  const files = fixtureManifest(worktree), fixturesSha256 = hash(JSON.stringify(files));
  assert.equal(fixturesSha256, reviewedHash, 'Candidate fixture source drift; review before rollout');
  assert(release.account && isAbsolute(release.account.path), 'Independent account reference required');
  const bytes = schema2?readPrivateBytes(release.account.path,JSON_LIMITS.evidence):readFileSync(release.account.path), account = JSON.parse(bytes);
  assert.equal(hash(bytes), release.account.sha256, 'Candidate account reference digest mismatch');
  assert.equal(account.kind, 'independent-account-render'); assert.equal(account.sourceRevision, release.sourceRevision);
  assert.equal(account.archiveSha256, release.archive.sha256); assert.deepEqual(account.ui, { version: release.version, contractVersion: release.contract.version });
  if(schema2){
    assert(account.schemaVersion===1&&Array.isArray(account.cases)&&account.cases.length>0,'Independent frozen account cases required');
    assert(account.frozen===true||(release.version==='0.7.1'&&release.account.sha256==='158dd3bca9d5c4dd8068cf97d70de1c65d7b187f3057f9388409a7685b447bc5'),'Frozen account reference required');
    for(const entry of account.cases)assert.equal(entry.render?.uiVersion,release.version,'Account render version mismatch');
  }
  mkdirSync(directory, { mode: 0o700 }); assert.equal(realpathSync(directory), directory, 'Candidate harness symlink escape');
  cpSync(join(worktree, 'tests'), join(directory, 'tests'), { recursive: true, dereference: false, errorOnExist: true, force: false });
  cpSync(join(worktree, 'playwright.config.ts'), join(directory, 'playwright.config.ts'), { errorOnExist: true, force: false });
  assert.deepEqual(fixtureManifest(directory), files, 'Candidate fixture copy changed source');
  const sharedPath = join(directory, 'tests/e2e/shared-chrome.spec.ts'), accountPath = join(directory, 'tests/e2e/account-control.spec.ts');
  let parameterizedFiles={};
  if(!schema2){
    const parameterized=parameterizeTests(readFileSync(sharedPath,'utf8'),readFileSync(accountPath,'utf8'));
    writeFileSync(sharedPath,parameterized.shared);writeFileSync(accountPath,parameterized.account);
    parameterizedFiles={'tests/e2e/shared-chrome.spec.ts':hash(parameterized.shared),'tests/e2e/account-control.spec.ts':hash(parameterized.account)};
  }
  symlinkSync(join(worktree, 'node_modules'), join(directory, 'node_modules'));
  writeFileSync(join(directory, 'package.json'), '{"private":true,"type":"module"}\n', { mode: 0o600, flag: 'wx' });
  // Copied access tests resolve the Next data route from ./.next/BUILD_ID; use the packaged build's ID.
  const buildId = readFileSync(join(worktree, '.next/standalone/.next/BUILD_ID'), 'utf8').trim(); assert(/^[A-Za-z0-9_-]{1,120}$/.test(buildId), 'Built candidate BUILD_ID required');
  mkdirSync(join(directory, '.next'), { mode: 0o700 }); writeFileSync(join(directory, '.next/BUILD_ID'), buildId + '\n', { mode: 0o600, flag: 'wx' });
  const releasePath = join(directory, 'frozen-release.json'); writeFileSync(releasePath, JSON.stringify(release), { mode: 0o600, flag: 'wx' });
  const receipt = { schemaVersion: schema2?2:1, fixtureAPI:schema2?'schema2':'legacy', ...(schema2?{fixtureSha256,expectationsSha256}:{}), sourceRevision, buildId, fixturesSha256, helperSha256: hash(readFileSync(fileURLToPath(import.meta.url))), archiveSha256: release.archive.sha256, referenceSha256: release.contract.sha256, accountReferenceSha256: release.account.sha256, originalFiles: files, parameterizedFiles };
  writeFileSync(join(directory, 'harness-receipt.json'), JSON.stringify(receipt, null, 2), { mode: 0o600, flag: 'wx' });
  return { directory, configPath: join(directory, 'playwright.config.ts'), releasePath, receipt, ...(schema2?{env:{NAEIL_UI_STANDING_MODE:'schema2',NAEIL_UI_STANDING_FIXTURE:fixturePath}}:{}) };
}
