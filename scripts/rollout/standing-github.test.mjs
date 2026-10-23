import test from 'node:test';
import assert from 'node:assert/strict';
import { GitHub } from './standing-github.mjs';

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
