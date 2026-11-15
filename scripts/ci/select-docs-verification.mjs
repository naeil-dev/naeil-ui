import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// Promotion accepts only this repository's completed push-to-main Verify run.
// A preview upload by itself (or a successful PR run) is insufficient.
export async function selectDocsVerification({ repository, sha, request }) {
  if (!/^[a-f0-9]{40}$/.test(sha ?? '')) throw new Error('reviewed_sha must be a full lowercase commit SHA');
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository ?? '')) throw new Error('Invalid repository');
  const base = `/repos/${repository}/actions`;
  const { workflow_runs: runs } = await request(`${base}/workflows/verify.yml/runs?head_sha=${sha}&branch=main&event=push&status=success&per_page=100`);
  const eligible = runs.filter(run => run.head_sha === sha
    && run.head_branch === 'main' && run.event === 'push'
    && run.status === 'completed' && run.conclusion === 'success'
    && run.path === '.github/workflows/verify.yml'
    && run.head_repository?.full_name === repository);
  eligible.sort((a, b) => b.id - a.id);
  if (!eligible.length) throw new Error('No successful push-to-main Verify run for the reviewed SHA; run Verify on that commit first');
  // Never fall back silently to another run if this run's artifact has expired.
  const run = eligible[0];
  const { artifacts } = await request(`${base}/runs/${run.id}/artifacts?per_page=100`);
  const previews = artifacts.filter(artifact => artifact.name === 'storybook-preview');
  if (previews.length !== 1 || previews[0].expired || !(previews[0].size_in_bytes > 0)) {
    throw new Error('Expected one unexpired storybook-preview artifact; rerun Verify on the reviewed main commit');
  }
  return { runId: run.id, artifactId: previews[0].id, runUrl: run.html_url };
}

async function main() {
  const { GITHUB_REPOSITORY: repository, REVIEWED_SHA: sha, GITHUB_TOKEN: token, GITHUB_OUTPUT: output } = process.env;
  const result = await selectDocsVerification({ repository, sha, request: async path => {
    const response = await fetch(`https://api.github.com${path}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`GitHub verification lookup failed (${response.status})`);
    return response.json();
  } });
  appendFileSync(output, `run_id=${result.runId}\nartifact_id=${result.artifactId}\n`);
  console.log(`Promoting ${sha} from Verify ${result.runUrl}, artifact ${result.artifactId}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
