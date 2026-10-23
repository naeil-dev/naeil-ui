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
