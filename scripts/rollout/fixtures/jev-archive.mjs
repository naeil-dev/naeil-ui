import { gzipSync } from 'node:zlib';
import { hash } from '../rollout-io.mjs';
export function tarEntry(name, bytes = Buffer.alloc(0), type = '0', link = '') {
  bytes = Buffer.from(bytes); const header = Buffer.alloc(512);
  header.write(name); header.write('0000644\0', 100); header.write(`${bytes.length.toString(8).padStart(11, '0')}\0`, 124); header.fill(32, 148, 156); header.write(type, 156); header.write(link, 157); header.write('ustar\0', 257); header.write('00', 263);
  header.write(`${[...header].reduce((a, b) => a + b).toString(8).padStart(6, '0')}\0 `, 148);
  return Buffer.concat([header, bytes, Buffer.alloc((512 - bytes.length % 512) % 512)]);
}
export function pax(values) {
  return Buffer.concat(Object.entries(values).map(([key, value]) => {
    const body = Buffer.concat([Buffer.from(`${key}=`), Buffer.from(value), Buffer.from('\n')]); let length = body.length + 2;
    while (Buffer.byteLength(`${length} `) + body.length !== length) length = Buffer.byteLength(`${length} `) + body.length;
    return Buffer.concat([Buffer.from(`${length} `), body]);
  }));
}
export function syntheticJevArchive(identity, change = entries => entries) {
  const contents = { 'server.js': '// synthetic immutable code', '.next/BUILD_ID': 'synthetic-build', 'public/.well-known/naeil-ui.json': JSON.stringify(identity) };
  const manifest = Object.fromEntries(Object.entries(contents).map(([path, bytes]) => [path, { bytes: Buffer.byteLength(bytes), sha256: hash(bytes) }]));
  manifest['server-link.js'] = { type: 'symlink', target: 'server.js', resolvedTarget: 'server.js' };
  const entries = [tarEntry('standalone/', '', '5'), tarEntry('standalone/.next/', '', '5'), tarEntry('standalone/public/', '', '5'), tarEntry('standalone/public/.well-known/', '', '5')];
  for (const [path, bytes] of Object.entries(contents)) {
    entries.push(tarEntry('PaxHeaders/member', pax({ mtime: '1792960000.123', 'LIBARCHIVE.xattr.com.apple.provenance': 'AQI=', 'SCHILY.xattr.com.apple.provenance': Buffer.from([0x01, 0x00, 0xff, 0x00, 0x02]), path: 'standalone/' + path }), 'x'), tarEntry('standalone/placeholder', bytes));
  }
  entries.push(tarEntry('PaxHeaders/link', pax({ linkpath: 'server.js' }), 'x'), tarEntry('standalone/server-link.js', '', '2', 'placeholder'));
  return { bytes: gzipSync(Buffer.concat([...change(entries), Buffer.alloc(1024)])), manifest };
}
