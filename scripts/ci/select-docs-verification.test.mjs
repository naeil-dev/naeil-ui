import assert from 'node:assert/strict';
import test from 'node:test';
import { selectDocsVerification } from './select-docs-verification.mjs';

const repository = 'naeil-dev/naeil-ui';
const sha = 'a'.repeat(40);
const good = { id: 41, head_sha: sha, head_branch: 'main', event: 'push', status: 'completed', conclusion: 'success', path: '.github/workflows/verify.yml', head_repository: { full_name: repository }, html_url: 'https://github.com/naeil-dev/naeil-ui/actions/runs/41' };
const artifact = { id: 72, name: 'storybook-preview', expired: false, size_in_bytes: 1234 };
function select(runs = [good], artifacts = [artifact], calls = []) {
  return selectDocsVerification({ repository, sha, request: async path => {
    calls.push(path);
    return path.includes('/artifacts?') ? { artifacts } : { workflow_runs: runs };
  } });
}

test('selects the exact successful main push run and its preview artifact', async () => {
  const calls = [];
  assert.deepEqual(await select([good], [artifact], calls), { runId: 41, artifactId: 72, runUrl: good.html_url });
  assert.match(calls[0], /workflows\/verify.yml\/runs\?head_sha=a{40}&branch=main&event=push&status=success/);
  assert.match(calls[1], /runs\/41\/artifacts/);
});

test('rejects untrusted or incomplete verification even if API filtering returns it', async () => {
  for (const mismatch of [
    { head_sha: 'b'.repeat(40) }, { head_branch: 'topic' }, { event: 'pull_request' },
    { status: 'in_progress' }, { conclusion: 'failure' }, { conclusion: 'cancelled' },
    { path: '.github/workflows/other.yml' }, { head_repository: { full_name: 'fork/naeil-ui' } },
  ]) await assert.rejects(select([{ ...good, ...mismatch }]), /No successful push-to-main/);
  await assert.rejects(select([]), /No successful push-to-main/);
});

test('requires a single available nonempty preview from the selected run', async () => {
  for (const artifacts of [[], [artifact, artifact], [{ ...artifact, expired: true }], [{ ...artifact, size_in_bytes: 0 }], [{ ...artifact, name: 'other' }]]) {
    await assert.rejects(select([good], artifacts), /Expected one unexpired/);
  }
});

test('chooses newest eligible success; does not fall back when its artifact is gone', async () => {
  const calls = [];
  await assert.rejects(select([{ ...good, id: 40 }, good], [], calls), /rerun Verify/);
  assert.equal(calls.length, 2);
  assert.match(calls[1], /runs\/41\/artifacts/);
});

test('rejects malformed SHA before any request, and propagates API failures', async () => {
  await assert.rejects(selectDocsVerification({ repository, sha: 'main', request: () => assert.fail('request should not run') }), /full lowercase/);
  await assert.rejects(selectDocsVerification({ repository, sha, request: () => { throw new Error('HTTP 403'); } }), /HTTP 403/);
});
