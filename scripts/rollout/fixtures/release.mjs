import { gzipSync } from 'node:zlib';

// Synthetic local bytes only; never a publishable package candidate.
export function syntheticArchive(version = '0.7.42', runtime = 'export const synthetic = true;', docs = '') {
  const chunks = [];
  for (const [name, value] of Object.entries({ 'package.json': JSON.stringify({ name: '@naeil/ui', version, exports: { '.': './dist/index.js' } }), 'dist/index.js': runtime, 'README.md': docs })) {
    const bytes = Buffer.from(value), header = Buffer.alloc(512);
    header.write(`package/${name}`); header.write('0000644\0', 100);
    header.write(`${bytes.length.toString(8).padStart(11, '0')}\0`, 124); header.fill(32, 148, 156); header.write('0', 156);
    header.write(`${[...header].reduce((a, b) => a + b).toString(8).padStart(6, '0')}\0 `, 148);
    chunks.push(header, bytes, Buffer.alloc((512 - bytes.length % 512) % 512));
  }
  return gzipSync(Buffer.concat([...chunks, Buffer.alloc(1024)]));
}
