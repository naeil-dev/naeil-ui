import assert from 'node:assert/strict';
import { closeSync, fsyncSync, mkdirSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { compareRuntime, runtimeIndex } from './package-runtime.mjs';
import { hash, REVISION, VERSION } from './standing-config.mjs';
import { assertManifest } from './standing-github.mjs';

const origin = version => `https://github.com/naeil-dev/naeil-ui/releases/download/v${version}/`;
const json = bytes => JSON.parse(bytes.toString('utf8'));
const encode = value => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const names = version => ({ archive: `naeil-ui-${version}.tgz`, siteArchive: `naeil-site-package-${version}.tgz`, contract: `naeil-chrome-${version}.json`, account: `naeil-account-${version}.json` });

export function assertReference(reference, kind, { version, sourceRevision, archiveSha256 }) {
  assert.equal(reference.schemaVersion, 1, 'Reference schema1 required');
  assert.equal(reference.kind, kind, 'Independent reference kind required');
  assert.equal(reference.frozen, true, 'Frozen reference required');
  assert.equal(reference.sourceRevision, sourceRevision, 'Reference source mismatch');
  assert.equal(reference.archiveSha256, archiveSha256, 'Reference archive mismatch');
  assert.deepEqual(reference.ui, { version, contractVersion: '1' }, 'Reference UI mismatch');
  assert(Array.isArray(reference.cases) && reference.cases.length > 0, 'Nonempty reference cases required');
}

/** Local preparation only: remote CI, main ancestry, clean packing and deployed
 * site provenance remain publisher/observer gates, never inferred from a SHA. */
export function prepareRelease(input) {
  const { version, previousVersion, sourceRevision, siteSourceRevision, outputDirectory } = input;
  assert(VERSION.test(version) && VERSION.test(previousVersion), 'Exact stable0.7.x versions required');
  assert.equal(Number(version.split('.')[2]), Number(previousVersion.split('.')[2]) + 1, 'Consecutive patch versions required');
  assert(REVISION.test(sourceRevision) && REVISION.test(siteSourceRevision), 'Full lowercase40-hex revisions required');
  for (const key of ['archivePath', 'siteArchivePath', 'chromeReferencePath', 'accountReferencePath', 'outputDirectory']) assert(typeof input[key] === 'string' && input[key].length, `Explicit ${key} required`);
  const files = { archive: readFileSync(input.archivePath), siteArchive: readFileSync(input.siteArchivePath), contract: readFileSync(input.chromeReferencePath), account: readFileSync(input.accountReferencePath) };
  const expected = runtimeIndex(files.archive), actual = runtimeIndex(files.siteArchive);
  assert.equal(expected.package.version, version, 'Archive version mismatch');
  const comparison = compareRuntime(expected, actual);
  const provenance = { version, sourceRevision, archiveSha256: hash(files.archive) };
  assertReference(json(files.contract), 'independent-release-render', provenance);
  assertReference(json(files.account), 'independent-account-render', provenance);
  const assetNames = names(version);
  const entries = Object.fromEntries(Object.entries(files).map(([key, bytes]) => [key, { url: origin(version) + assetNames[key], sha256: hash(bytes), ...(key === 'contract' ? { version: '1' } : {}) }]));
  const manifest = { schemaVersion: 1, releaseId: input.releaseId || `naeil-ui-${version}`, version, previousVersion, sourceRevision, siteSourceRevision, siteRuntimeSha256: comparison.runtimeSha256, ...entries, changes: input.changes };
  assertManifest(manifest, { tag_name: `v${version}`, assets: Object.values(entries).map(entry => ({ browser_download_url: entry.url })) });
  const verification = { schemaVersion: 1, checkedAt: new Date().toISOString(), packageSourceRevision: sourceRevision, siteSourceRevision, frozenArchiveSha256: entries.archive.sha256, siteArchiveSha256: entries.siteArchive.sha256, siteRuntimeSha256: comparison.runtimeSha256, comparison, siteArchiveIsSeparateEvidence: true, sourceProvenance: 'caller-supplied; verify clean exact-SHA packing, main CI and deployment separately' };
  // Exclusive directory creation also refuses symlinks and existing empty dirs.
  const directory = resolve(outputDirectory); mkdirSync(directory, { mode: 0o700 });
  const write = (name, bytes) => { const fd = openSync(join(directory, name), 'wx', 0o600); try { writeFileSync(fd, bytes); fsyncSync(fd); } finally { closeSync(fd); } };
  for (const [key, bytes] of Object.entries(files)) write(assetNames[key], bytes);
  write('release.json', encode(manifest)); write('site-runtime-verification.json', encode(verification));
  return { manifest, directory };
}

/** Listing is a JSON array of {name,url,size,digest}; digest is GitHub's
 * sha256:<hex>. Check the draft before publication, including both JSON assets. */
export function checkDraft(directory, listing) {
  assert(Array.isArray(listing) && listing.length <= 100, 'Bounded draft asset listing required');
  const manifest = json(readFileSync(join(directory, 'release.json'))), prefix = origin(manifest.version);
  const entries = ['archive', 'siteArchive', 'contract', 'account'].map(key => manifest[key]);
  for (const entry of entries) {
    assert(entry && entry.url.startsWith(prefix), 'Version-scoped asset URL required');
    const name = entry.url.slice(prefix.length);
    assert(/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name) && basename(name) === name, 'Plain release asset name required');
    assert.equal(hash(readFileSync(join(directory, name))), entry.sha256, 'Local manifest asset digest mismatch');
  }
  assertManifest(manifest, { tag_name: `v${manifest.version}`, assets: listing.map(asset => ({ browser_download_url: asset.url })) });
  const required = [...new Set(entries.map(entry => entry.url.slice(prefix.length))), 'release.json', 'site-runtime-verification.json'];
  for (const name of required) {
    const matches = listing.filter(asset => asset.name === name || asset.url === prefix + name);
    assert.equal(matches.length, 1, 'Each local asset must map to exactly one draft asset');
    const asset = matches[0], bytes = readFileSync(join(directory, name));
    assert.equal(asset.name, name, 'Draft asset name mismatch'); assert.equal(asset.url, prefix + name, 'Draft asset URL mismatch');
    assert.equal(asset.size, bytes.length, 'Draft asset size mismatch'); assert.equal(asset.digest, `sha256:${hash(bytes)}`, 'Draft asset digest mismatch');
  }
  return { passed: true, assets: required.length, version: manifest.version };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [action, input, listing] = process.argv.slice(2);
  try {
    assert((action === 'prepare' && input && !listing) || (action === 'check' && input && listing), 'Usage: node prepare-release.mjs prepare INPUT.json | check OUTPUT_DIRECTORY DRAFT_ASSETS.json');
    const result = action === 'prepare' ? prepareRelease(json(readFileSync(input))) : checkDraft(resolve(input), json(readFileSync(listing)));
    console.log(JSON.stringify(result));
  } catch (error) { console.error(`Release preparation/check failed: ${error.code || 'validation'}; inspect local inputs and assertion with the exported API`); process.exitCode = 1; }
}
