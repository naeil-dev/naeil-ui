import assert from 'node:assert/strict';

// Parse pnpm's block layout without reserializing YAML: all unapproved bytes,
// including resolution/peer details, must survive exactly. Unknown shapes fail
// closed rather than broadening the dependency-only preparation scope.
function blocks(text, indent) {
  const pattern = new RegExp(`^ {${indent}}(\\S.*?):(?:[ \\r\\n]|$)`);
  const result = { prefix: '', entries: [] }, seen = new Set();
  for (const line of text.match(/[^\n]*\n|[^\n]+$/g) || []) {
    const match = line.match(pattern);
    if (match) {
      assert(!seen.has(match[1]), 'Duplicate lockfile entry'); seen.add(match[1]);
      result.entries.push({ key: match[1], text: line });
    } else {
      assert(!line.trim() || line.startsWith(' '.repeat(indent + 1)), 'Unsupported lockfile layout');
      if (result.entries.length) result.entries.at(-1).text += line;
      else result.prefix += line;
    }
  }
  return result;
}

function body(entry, indent, transform) {
  const end = entry.text.indexOf('\n');
  assert(end >= 0 && entry.text.slice(0, end).trim() === `${entry.key}:`, 'Block mapping required');
  return entry.text.slice(0, end + 1) + transform(blocks(entry.text.slice(end + 1), indent));
}

const uiDependency = key => ['@naeil/ui', "'@naeil/ui'", '"@naeil/ui"'].includes(key);
const uiResolution = key => /^(?:['"])?@naeil\/ui@/.test(key);
const joinBlocks = (value, transform = entry => entry.text) => value.prefix + value.entries.map(transform).join('');

function unrelatedImporterBytes(importer) {
  return body(importer, 4, groups => joinBlocks(groups, group => {
    if (!['dependencies', 'devDependencies', 'optionalDependencies'].includes(group.key)) return group.text;
    return body(group, 6, deps => joinBlocks({ ...deps, entries: deps.entries.filter(entry => !uiDependency(entry.key)) }));
  }));
}

function unrelatedLockBytes(bytes) {
  const sections = blocks(bytes.toString(), 0);
  assert(sections.entries.some(entry => entry.key === 'lockfileVersion'), 'Lockfile version required');
  return joinBlocks(sections, section => {
    if (['packages', 'snapshots'].includes(section.key)) return body(section, 2, value => joinBlocks({ ...value, entries: value.entries.filter(entry => !uiResolution(entry.key)) }));
    if (section.key !== 'importers') return section.text;
    return body(section, 2, importers => joinBlocks(importers, unrelatedImporterBytes));
  });
}

/** Only the UI dependency and its own pnpm importer/package/snapshot blocks may change. */
export function assertDependencyDelta(before, after) {
  try {
    const withoutUI = bytes => {
      const pkg = JSON.parse(bytes.toString());
      assert(typeof pkg.dependencies?.['@naeil/ui'] === 'string', 'UI dependency required');
      delete pkg.dependencies['@naeil/ui'];
      return pkg;
    };
    assert.deepEqual(withoutUI(before.packageJSON), withoutUI(after.packageJSON));
    assert.equal(unrelatedLockBytes(before.lockfile), unrelatedLockBytes(after.lockfile));
  } catch {
    // Keep the checkout as-is for review; do not dump package/config contents.
    throw new Error('Dependency graph changed beyond @naeil/ui; review required');
  }
}

/** Pure dependency-only preparation shared with STOP-safe isolated preflight.
 * This grants no operational authorization and performs no writes or installs. */
export function dependencyTarget(packageJSON, {version,previousVersion,existingVersion,existingArchiveSha256,archiveSha256}) {
  const pkg=JSON.parse(packageJSON.toString());
  assert(/^0\.7\.(0|[1-9]\d*)$/.test(version),'Bounded UI version required');
  assert(/^file:vendor\/naeil-ui-[0-9A-Za-z.+-]+\.tgz$/.test(pkg.dependencies?.['@naeil/ui']||''),'Exact vendored UI dependency required');
  assert([previousVersion,version].includes(existingVersion),'Consumer drifted from reviewed predecessor');
  const unchanged=existingVersion===version&&existingArchiveSha256===archiveSha256;
  if(!unchanged) assert.equal(existingVersion,previousVersion,'Same-version archive changed; immutable release violation');
  const vendor=`vendor/naeil-ui-${version}.tgz`;
  if(!unchanged)pkg.dependencies['@naeil/ui']=`file:${vendor}`;
  return {unchanged,vendor,packageJSON:unchanged?Buffer.from(packageJSON):Buffer.from(`${JSON.stringify(pkg,null,2)}\n`)};
}
