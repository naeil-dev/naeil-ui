import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { runtimeIndex, compareRuntime } from './package-runtime.mjs';
const archive = readFileSync(new URL('../../docs/rollout/frozen/naeil-ui-0.7.1.tgz', import.meta.url));

function fixture(metadata = {}, extra = {}) {
  const pkg = { name: '@naeil/ui', version: '0.7.1', exports: { '.': './dist/main.js' }, ...metadata };
  const chunks = [];
  for (const [name, value] of Object.entries({ 'package.json': JSON.stringify(pkg), 'dist/main.js': 'export const version = 1;', ...extra })) {
    const bytes = Buffer.from(value), header = Buffer.alloc(512);
    header.write(`package/${name}`);
    header.write('0000644\0', 100);
    header.write(bytes.length.toString(8).padStart(11, '0') + '\0', 124);
    header.write('0', 156);
    header.fill(32, 148, 156);
    const checksum = [...header].reduce((sum, byte) => sum + byte, 0);
    header.write(checksum.toString(8).padStart(6, '0') + '\0 ', 148);
    chunks.push(header, bytes, Buffer.alloc((512 - bytes.length % 512) % 512));
  }
  return gzipSync(Buffer.concat([...chunks, Buffer.alloc(1024)]));
}

test('resolver and platform metadata cannot redirect an otherwise identical runtime', () => {
  const baseline = runtimeIndex(fixture());
  for (const [key, value] of Object.entries({ browser: { './dist/main.js': false }, main: './dist/other.js', module: './dist/other.js', imports: { '#internal': './dist/other.js' }, types: './dist/other.d.ts', typesVersions: { '*': { '*': ['other.d.ts'] } }, optionalDependencies: { extra: '1.0.0' }, engines: { node: '>=30' }, os: ['linux'], cpu: ['x64'], bin: './dist/main.js' })) {
    assert.throws(() => compareRuntime(baseline, runtimeIndex(fixture({ [key]: value }))), /metadata/, key);
  }
});

test('documentation exceptions never hide executable files or similar filename prefixes', () => {
  const baseline = runtimeIndex(fixture());
  assert.doesNotThrow(() => compareRuntime(baseline, runtimeIndex(fixture({}, { 'README.md': 'Updated guide', 'docs/components/layout.md': 'Updated guide' }))));
  for (const name of ['README.md.js', 'DESIGN.md.cjs', 'CHANGELOG.md.mjs', 'docs/runtime.js']) {
    assert.throws(() => compareRuntime(baseline, runtimeIndex(fixture({}, { [name]: 'export default true;' }))), /runtime/, name);
  }
});
test('frozen package runtime includes export closure, styles, contract and dependency metadata', () => {
  const index = runtimeIndex(archive);
  assert(index.files['dist/components/naeil-header.js']);
  assert(index.files['src/styles/theme.css']);
  assert(index.files['contracts/naeil-chrome.v1.json']);
  assert(!index.files['README.md']);
  assert.equal(index.package.version, '0.7.1');
  assert.equal(index.package.exports['./naeil-footer'].import, './dist/components/naeil-footer.js');
  assert.doesNotThrow(() => compareRuntime(index, structuredClone(index)));
});
test('changed runtime bytes, exports or omitted runtime files fail the site/package comparison', () => {
  const baseline = runtimeIndex(archive);
  const bytes = structuredClone(baseline); bytes.files['dist/components/naeil-header.js'].sha256 = '0'.repeat(64);
  assert.throws(() => compareRuntime(baseline, bytes), /runtime/);
  const exports = structuredClone(baseline); delete exports.package.exports['./naeil-footer'];
  assert.throws(() => compareRuntime(baseline, exports), /metadata/);
  const missing = structuredClone(baseline); delete missing.files['src/styles/theme.css'];
  assert.throws(() => compareRuntime(baseline, missing), /runtime/);
});

test('consumer frozen parity includes exact package.json and documentation bytes', async () => {
 const { frozenPackageIndex } = await import('./package-runtime.mjs');
 const { syntheticArchive } = await import('./fixtures/release.mjs');
 const before=frozenPackageIndex(syntheticArchive('0.7.42','export const synthetic = true;','reviewed docs'));
 const after=frozenPackageIndex(syntheticArchive('0.7.42','export const synthetic = true;','changed docs'));
 assert(before['package.json']);assert(before['README.md']);assert.notEqual(before['README.md'].sha256,after['README.md'].sha256);assert.deepEqual(before['dist/index.js'],after['dist/index.js']);
});
