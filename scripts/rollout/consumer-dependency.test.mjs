import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dependencyLock } from './fixtures/dependency-lock.mjs';
import { assertDependencyDelta, dependencyTarget } from './consumer-dependency.mjs';

const deltaError = /Dependency graph changed beyond @naeil\/ui; review required/;
const packageBytes = version => JSON.stringify({ name: 'consumer', scripts: { build: 'next build' }, dependencies: { '@naeil/ui': `file:vendor/naeil-ui-${version}.tgz`, react: '19.2.3' } });
const beforeDelta = () => ({ packageJSON: packageBytes('0.7.0'), lockfile: dependencyLock() });
const afterDelta = () => ({ packageJSON: packageBytes('0.7.1'), lockfile: dependencyLock('0.7.1', 'sha512-after') });

test('dependency delta accepts only UI importer, tarball and peer-suffixed snapshot changes', () => {
 assert.doesNotThrow(() => assertDependencyDelta(beforeDelta(), afterDelta()));
 assert.doesNotThrow(() => assertDependencyDelta(beforeDelta(), beforeDelta()));
});
for (const [name, change] of [
 ['new transitive package', lock => lock.replace('snapshots:', '  unexpected@1.0.0:\n    resolution: {integrity: sha512-extra}\n\nsnapshots:')],
 ['another dependency version', lock => lock.replace('version: 19.2.3', 'version: 19.3.0')],
 ['another package resolution', lock => lock.replace('sha512-react-fixture', 'sha512-changed')],
 ['another package snapshot', lock => lock.replace('react@19.2.3: {}', 'react@19.2.3:\n    dependencies:\n      unexpected: 1.0.0')],
 ['another peer resolution', lock => lock.replace('react@19.2.3: {}', "'react@19.2.3(peer@2.0.0)': {}")],
 ['settings', lock => lock.replace('autoInstallPeers: true', 'autoInstallPeers: false')],
 ['lockfile version', lock => lock.replace("'9.0'", "'9.1'")],
 ['new top-level section', lock => lock + '\noverrides:\n  react: 19.3.0\n'],
 ['removed package', lock => lock.replace(/  react@19.2.3:\n    resolution:.*\n    engines:.*\n\n/, '')],
 ['duplicate section', lock => lock + '\nsettings:\n  autoInstallPeers: true\n'],
]) test(`dependency delta rejects ${name}`, () => {
 const after = afterDelta(); after.lockfile = change(after.lockfile);
 assert.throws(() => assertDependencyDelta(beforeDelta(), after), deltaError);
});
for (const [name, change] of [
 ['script', pkg => { pkg.scripts.build = 'unreviewed'; }],
 ['other dependency', pkg => { pkg.dependencies.react = '19.3.0'; }],
 ['new dependency', pkg => { pkg.dependencies.extra = '1.0.0'; }],
 ['removed UI dependency', pkg => { delete pkg.dependencies['@naeil/ui']; }],
]) test(`dependency delta rejects package.json ${name} changes`, () => {
 const after = afterDelta(), pkg = JSON.parse(after.packageJSON); change(pkg); after.packageJSON = JSON.stringify(pkg);
 assert.throws(() => assertDependencyDelta(beforeDelta(), after), deltaError);
});
test('dependency delta checks each workspace importer and preserves their other blocks', () => {
 const workspace = lock => lock.replace('\npackages:', "\n  apps/second:\n    dependencies:\n      '@naeil/ui':\n        specifier: file:vendor/ui.tgz\n        version: file:vendor/ui.tgz(react@19.2.3)\n      react:\n        specifier: 19.2.3\n        version: 19.2.3\n\npackages:");
 const before = beforeDelta(), after = afterDelta(); before.lockfile = workspace(before.lockfile); after.lockfile = workspace(after.lockfile).replaceAll('vendor/ui.tgz', 'vendor/new-ui.tgz');
 assert.doesNotThrow(() => assertDependencyDelta(before, after));
 after.lockfile = after.lockfile.replace('specifier: 19.2.3', 'specifier: 19.3.0');
 assert.throws(() => assertDependencyDelta(before, after), deltaError);
});

test('dependency target keeps exact package bytes on reuse and rejects same-version replacement or unrelated predecessors', () => {
 const bytes=Buffer.from(packageBytes('0.7.1')),release={version:'0.7.1',previousVersion:'0.7.0',existingVersion:'0.7.1',existingArchiveSha256:'a'.repeat(64),archiveSha256:'a'.repeat(64)};
 assert.deepEqual(dependencyTarget(bytes,release),{unchanged:true,vendor:'vendor/naeil-ui-0.7.1.tgz',packageJSON:bytes});
 const changed=dependencyTarget(Buffer.from(packageBytes('0.7.0')),{...release,existingVersion:'0.7.0'});assert.equal(changed.unchanged,false);assert.equal(JSON.parse(changed.packageJSON).dependencies['@naeil/ui'],'file:vendor/naeil-ui-0.7.1.tgz');
 for(const update of [{existingArchiveSha256:'b'.repeat(64)},{existingVersion:'0.6.0'},{version:'0.8.0'}])assert.throws(()=>dependencyTarget(bytes,{...release,...update}));
 assert.throws(()=>dependencyTarget(Buffer.from(JSON.stringify({dependencies:{'@naeil/ui':'file:../outside.tgz'}})),release),/vendored/);
});
