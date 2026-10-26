import assert from 'node:assert/strict';
import test from 'node:test';
import { syntheticJevArchive, tarEntry, pax } from './fixtures/jev-archive.mjs';

const identity = { schemaVersion: 1, appId: 'jev', artifactId: 'synthetic-jev', sourceRevision: 'a'.repeat(40), ui: { version: '0.7.1', contractVersion: '1' } };
const release = { version: '0.7.1', contractVersion: '1' };
const load = () => import('./consumer-artifact.mjs');
test('T7 read-only Jev archive inspection supports the original standalone prefix, binary-NUL PAX xattrs, directories and internal links', async () => {
  const { inspectJevArchive } = await load(), f = syntheticJevArchive(identity); assert.equal(typeof inspectJevArchive, 'function');
  assert.deepEqual(inspectJevArchive(f.bytes, f.manifest, identity.sourceRevision, release), { identity, buildId: 'synthetic-build', manifest: f.manifest });
});
test('T7 archived Jev code rejects dangerous members, duplicates, missing/changed bytes, metadata abuse and identity drift', async () => {
  const { inspectJevArchive } = await load(); assert.equal(typeof inspectJevArchive, 'function');
  for (const entry of [tarEntry('../escape', 'bad'), tarEntry('standalone/../escape', 'bad'), tarEntry('standalone/.env', 'bad'), tarEntry('standalone/hard', '', '1', 'server.js'), tarEntry('standalone/char', '', '3'), tarEntry('standalone/server.js', 'duplicate'), tarEntry('standalone/server-link.js', '', '2', '../../escape'), tarEntry('PaxHeaders/abuse', pax({ path: '/outside' }), 'x'), tarEntry('PaxHeaders/unknown', pax({ 'unknown.execution': 'bad' }), 'x'), tarEntry('PaxHeaders/nulpath', pax({ path: 'standalone/server.js\0/escape' }), 'x'), tarEntry('PaxHeaders/nullink', pax({ linkpath: 'server.js\0/escape' }), 'x'), tarEntry('PaxHeaders/duplicate', Buffer.concat([pax({mtime:'123'}),pax({mtime:'456'})]), 'x')]) {
    const f = syntheticJevArchive(identity, entries => [entry, ...entries]);
    assert.throws(() => inspectJevArchive(f.bytes, f.manifest, identity.sourceRevision, release));
  }
  const f = syntheticJevArchive(identity);
  for (const changed of [manifest => { delete manifest['server.js']; }, manifest => { manifest['server.js'].sha256 = 'f'.repeat(64); }, manifest => { manifest['missing.js'] = manifest['server.js']; }, manifest => { manifest['server-link.js'].resolvedTarget = '../escape'; }]) {
    const manifest = structuredClone(f.manifest); changed(manifest); assert.throws(() => inspectJevArchive(f.bytes, manifest, identity.sourceRevision, release));
  }
  assert.throws(() => inspectJevArchive(f.bytes, f.manifest, 'b'.repeat(40), release));
  assert.throws(() => inspectJevArchive(f.bytes.subarray(0, f.bytes.length - 10), f.manifest, identity.sourceRevision, release));
});
test('T7 archived PAX authority fields remain strict while only supported inert xattrs are binary', async () => {
  const { inspectJevArchive } = await load();
  for (const fields of [
    pax({ path: 'standalone/server.js\0/escape' }),
    pax({ linkpath: 'server.js\0/escape' }),
    pax({ mtime: '123\0.456' }),
    pax({ path: Buffer.from([0xff]) }),
    pax({ linkpath: Buffer.from([0xff]) }),
    pax({ 'path\0': 'standalone/server.js' }),
    pax({ '\uFEFFpath': 'standalone/server.js' }),
    pax({ path: '\uFEFFstandalone/server.js' }),
    pax({ path: '' }),
    pax({ linkpath: '' }),
    Buffer.concat([pax({ mtime: '123' }), pax({ mtime: '456' })]),
    Buffer.concat([pax({ 'SCHILY.xattr.com.apple.provenance': Buffer.from([0]) }), pax({ 'SCHILY.xattr.com.apple.provenance': Buffer.from([1]) })])
  ]) {
    const f = syntheticJevArchive(identity, entries => [tarEntry('PaxHeaders/invalid', fields, 'x'), ...entries]);
    assert.throws(() => inspectJevArchive(f.bytes, f.manifest, identity.sourceRevision, release));
  }
});
