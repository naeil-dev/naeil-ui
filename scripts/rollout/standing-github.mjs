import assert from 'node:assert/strict';
import { closeSync, existsSync, fsyncSync, openSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { atomicJSON, fingerprint, hash, HEX, privateDirectory, readPrivateBytes, readPrivateJSON, REVISION, VERSION } from './standing-config.mjs';

export class GitHubUnavailable extends Error {
  constructor() { super('Trusted release service unavailable before dispatch'); this.name = 'GitHubUnavailable'; }
}

async function bounded(response, maximum) {
  if ([401, 403, 408, 429].includes(response.status) || response.status >= 500) throw new GitHubUnavailable();
  assert(response.ok, 'Trusted HTTPS request failed');
  const chunks = []; let length = 0;
  for await (const chunk of response.body) {
    length += chunk.length;
    if (length > maximum) throw new Error('Trusted response exceeds size limit');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export class GitHub {
  constructor({ repository = 'naeil-dev/naeil-ui', fetchImpl = fetch, token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN } = {}) {
    assert.equal(repository, 'naeil-dev/naeil-ui'); this.repository = repository; this.fetch = fetchImpl; this.token = token;
  }
  async request(url, options) {
    try { return await this.fetch(url, options); } catch { throw new GitHubUnavailable(); }
  }
  async api(path) {
    assert(path.startsWith(`/repos/${this.repository}/`) && !path.includes('..'), 'Unexpected GitHub API route');
    const response = await this.request(`https://api.github.com${path}`, { redirect: 'error', signal: AbortSignal.timeout(30000), headers: { accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28', ...(this.token ? { authorization: `Bearer ${this.token}` } : {}) } });
    return JSON.parse((await bounded(response, 8 * 1024 * 1024)).toString('utf8'));
  }
  async pages(path) {
    const result = [];
    for (let page = 1; page <= 20; page++) {
      const values = await this.api(`${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`);
      assert(Array.isArray(values), 'Expected paginated GitHub list'); result.push(...values);
      if (values.length < 100) return result;
    }
    throw new Error('GitHub pagination bound reached; refusing partial release history');
  }
  releases() { return this.pages(`/repos/${this.repository}/releases`); }
  async tagRevision(tag) {
    let item = (await this.api(`/repos/${this.repository}/git/ref/tags/${encodeURIComponent(tag)}`)).object;
    for (let count = 0; count < 5; count++) {
      assert(REVISION.test(item?.sha), 'Invalid release tag object');
      if (item.type === 'commit') return item.sha;
      assert.equal(item.type, 'tag', 'Release tag must resolve to a commit');
      item = (await this.api(`/repos/${this.repository}/git/tags/${item.sha}`)).object;
    }
    throw new Error('Annotated tag nesting limit reached');
  }
  async mainAncestor(revision) {
    assert.match(revision, REVISION);
    const comparison = await this.api(`/repos/${this.repository}/compare/main...${revision}`);
    assert(['identical', 'behind'].includes(comparison.status) && comparison.merge_base_commit?.sha === revision, 'Release/app source must belong to trusted main history');
  }
  async workflow(revision, path) {
    assert.match(revision, REVISION); assert.equal(path, '.github/workflows/verify.yml');
    const response = await this.api(`/repos/${this.repository}/actions/runs?head_sha=${revision}&event=push&branch=main&per_page=100`);
    const runs = (response.workflow_runs || []).filter(run => run.head_sha === revision && run.head_branch === 'main' && run.event === 'push' && run.path?.split('@')[0] === path).sort((a, b) => b.id - a.id);
    if (!runs.length || runs[0].status !== 'completed') return { state: 'pending' };
    return { state: runs[0].conclusion === 'success' ? 'success' : 'failed', id: runs[0].id, attempt: runs[0].run_attempt };
  }
  async asset(asset) {
    const expected = `https://github.com/${this.repository}/releases/download/`;
    let url = new URL(asset.browser_download_url);
    assert(url.href.startsWith(expected) && !url.username && !url.password, 'Unexpected release asset URL');
    const origins = new Set(['https://github.com', 'https://release-assets.githubusercontent.com', 'https://objects.githubusercontent.com']);
    for (let count = 0; count < 6; count++) {
      assert(url.protocol === 'https:' && origins.has(url.origin) && !url.username && !url.password, 'Unexpected release asset redirect');
      const response = await this.request(url.href, { redirect: 'manual', signal: AbortSignal.timeout(60000) });
      if ([301, 302, 303, 307, 308].includes(response.status)) { assert(response.headers.get('location'), 'Missing asset redirect'); url = new URL(response.headers.get('location'), url); continue; }
      const bytes = await bounded(response, 64 * 1024 * 1024);
      assert.equal(bytes.length, asset.size, 'Release asset size changed');
      if (asset.digest) assert.equal(asset.digest, `sha256:${hash(bytes)}`, 'GitHub asset digest mismatch');
      return bytes;
    }
    throw new Error('Release asset redirect bound reached');
  }
}

export function releaseMetadata(item) {
  assert(Number.isSafeInteger(item.id) && item.id > 0 && typeof item.tag_name === 'string', 'Invalid GitHub release');
  assert(Array.isArray(item.assets) && item.assets.length <= 100, 'Bounded explicit release asset inventory required');
  return { id: item.id, tag: item.tag_name, author: item.author?.login, publishedAt: item.published_at, assets: item.assets.map(asset => ({ id: asset.id, name: asset.name, size: asset.size, digest: asset.digest || null, url: asset.browser_download_url })).sort((a, b) => a.name.localeCompare(b.name)) };
}

export function assertManifest(release, item) {
  assert(release.schemaVersion === 1 && VERSION.test(release.version) && item.tag_name === `v${release.version}`, 'Exact stable0.7.x manifest/tag required');
  assert(/^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/.test(release.releaseId), 'Invalid release ID');
  assert(VERSION.test(release.previousVersion) && REVISION.test(release.sourceRevision) && REVISION.test(release.siteSourceRevision), 'Separate exact package/site revisions required');
  assert(Array.isArray(release.changes) && release.changes.length > 0 && release.changes.every(change => ['internal', 'fix', 'docs', 'frame', 'dom', 'guard', 'contract', 'api'].includes(change)), 'Reviewed change classification required');
  assert.equal(release.contract?.version, '1', 'Only chrome contract1 supported');
  const account = release.account || release.accountReference;
  assert.match(release.siteRuntimeSha256, HEX, 'Exact reviewed site runtime digest required');
  if (release.siteSourceRevision !== release.sourceRevision) assert(release.siteArchive, 'Different reviewed site source requires its independently packed package asset');
  for (const entry of [release.archive, release.contract, account, ...(release.siteArchive ? [release.siteArchive] : [])]) {
    assert(entry && HEX.test(entry.sha256) && typeof entry.url === 'string', 'Frozen archive/chrome/account inputs required');
    const matches = item.assets.filter(asset => asset.browser_download_url === entry.url);
    assert.equal(matches.length, 1, 'Frozen input must be an exact asset of this published release');
  }
  // Only data crosses the release boundary. Local paths and action configuration
  // are assigned by the trusted dispatcher, never accepted from an asset.
  const entry = value => ({ sha256: value.sha256, url: value.url, ...(value.version ? { version: value.version } : {}) });
  return { schemaVersion: 1, releaseId: release.releaseId, version: release.version, previousVersion: release.previousVersion, sourceRevision: release.sourceRevision, siteSourceRevision: release.siteSourceRevision, siteRuntimeSha256: release.siteRuntimeSha256, archive: entry(release.archive), contract: entry(release.contract), account: entry(account), siteArchive: entry(release.siteArchive || release.archive), changes: release.changes };
}

export function assertPolicyRelease(release, config, currentVersion) {
  const baseline = config.baseline;
  if (currentVersion === null) {
    assert.equal(release.version, baseline.version, 'Exact baseline must be adopted before future patches');
    for (const [key, value] of Object.entries({ releaseId: baseline.releaseId, sourceRevision: baseline.sourceRevision })) assert.equal(release[key], value, 'Baseline provenance mismatch');
    for (const [entry, key] of [['archive', 'archiveSha256'], ['contract', 'referenceSha256'], ['account', 'accountReferenceSha256']]) assert.equal(release[entry].sha256, baseline[key], 'Baseline frozen bytes mismatch');
    return 'adopt';
  }
  const patch = value => Number(value.split('.')[2]);
  assert.equal(release.previousVersion, currentVersion, 'Release predecessor differs from last completed selected-scope baseline');
  assert.equal(patch(release.version), patch(currentVersion) + 1, 'Consecutive patches required; never skip a missing release');
  assert.deepEqual(release.changes, ['fix'], 'Unattended releases must declare fix only');
  const window = config.policy.patchWindow;
  assert(Date.parse(window.startsAt) <= Date.now() && Date.parse(window.expiresAt) > Date.now(), 'Approved patch window is not active');
  assert(patch(release.version) >= patch(window.minVersion) && patch(release.version) <= patch(window.maxVersion), 'Release outside approved patch window');
  return 'standing';
}

export async function materializeRelease(item, config, github, existing) {
  assert(!item.draft && !item.prerelease && config.trustedPublishers.includes(item.author?.login) && item.published_at, 'Published release from an authorized publisher required');
  const metadata = releaseMetadata(item), metadataHash = fingerprint(metadata);
  if (existing) assert.equal(existing.metadataHash, metadataHash, 'Previously observed release assets changed');
  const directory = join(config.stateDirectory, 'releases', String(item.id)); privateDirectory(directory, true);
  const manifestName = config.manifestAsset || 'rollout-manifest.json';
  assert(['rollout-manifest.json', 'release.json'].includes(manifestName), 'Fixed manifest asset name required');
  const manifests = item.assets.filter(asset => asset.name === manifestName); assert.equal(manifests.length, 1, 'Exactly one version-specific rollout manifest required');
  const cachedPath = join(directory, 'snapshot.json');
  const snapshot = existsSync(cachedPath) ? readPrivateJSON(cachedPath) : null;
  if (snapshot) assert.equal(snapshot.metadataHash, metadataHash, 'Frozen release metadata changed');
  const manifestBytes = await github.asset(manifests[0]), manifestHash = hash(manifestBytes);
  if (snapshot) assert.equal(snapshot.manifestHash, manifestHash, 'Frozen release manifest changed');
  const release = assertManifest(JSON.parse(manifestBytes), item);
  const tagSha = await github.tagRevision(item.tag_name); assert.equal(tagSha, release.sourceRevision, 'Tag moved or does not match package source');
  if (existing?.tagSha) assert.equal(tagSha, existing.tagSha, 'Previously observed release tag moved');
  await github.mainAncestor(tagSha); await github.mainAncestor(release.siteSourceRevision);
  for (const [kind, entry] of [['archive', release.archive], ['contract', release.contract], ['account', release.account], ['siteArchive', release.siteArchive]]) {
    const asset = item.assets.find(asset => asset.browser_download_url === entry.url);
    const bytes = await github.asset(asset); assert.equal(hash(bytes), entry.sha256, 'Frozen input digest mismatch');
    const path = join(directory, ['archive', 'siteArchive'].includes(kind) ? `${kind}.tgz` : `${kind}.json`);
    if (existsSync(path)) assert.equal(hash(readPrivateBytes(path)), entry.sha256, 'Stored frozen asset changed');
    else { const fd = openSync(path, 'wx', 0o600); try { writeFileSync(fd, bytes); fsyncSync(fd); } finally { closeSync(fd); } }
    entry.path = path;
  }
  const reference = readPrivateJSON(release.contract.path), account = readPrivateJSON(release.account.path);
  assert(reference.kind === 'independent-release-render' && reference.frozen === true && reference.schemaVersion === 1, 'Independent frozen chrome reference required');
  assert(account.kind === 'independent-account-render' && account.schemaVersion === 1, 'Independent account reference required');
  for (const value of [reference, account]) {
    assert.equal(value.sourceRevision, release.sourceRevision); assert.equal(value.archiveSha256, release.archive.sha256);
    assert.deepEqual(value.ui, { version: release.version, contractVersion: '1' }); assert(value.cases?.length, 'Reference render cases required');
  }
  const result = { metadataHash, manifestHash, tagSha, release };
  atomicJSON(cachedPath, result); return result;
}
