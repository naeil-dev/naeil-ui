import assert from 'node:assert/strict';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const metadata = ['name', 'version', 'type', 'exports', 'sideEffects', 'dependencies', 'peerDependencies', 'peerDependenciesMeta', 'browser', 'main', 'module', 'imports', 'types', 'typesVersions', 'optionalDependencies', 'engines', 'os', 'cpu', 'bin'];

/** Read npm's regular-file ustar format without extracting anything. Other
 * archive encodings/types fail closed and require explicit publisher review. */
export function runtimeIndex(archive) {
  const tar = gunzipSync(archive, { maxOutputLength: 32 * 1024 * 1024 });
  const files = {}, all = new Set();
  let pkg;
  for (let offset = 0; offset + 512 <= tar.length;) {
    const header = tar.subarray(offset, offset + 512);
    if (header.every(byte => byte === 0)) break;
    const string = (start, size) => header.subarray(start, start + size).toString('utf8').replace(/\0.*$/s, '');
    const octal = (start, size) => {
      const value = string(start, size).trim();
      assert(/^[0-7]+$/.test(value), 'Unsupported tar numeric field');
      return parseInt(value, 8);
    };
    const checksum = [...header].reduce((sum, byte, index) => sum + (index >= 148 && index < 156 ? 32 : byte), 0);
    assert.equal(checksum, octal(148, 8), 'Tar header checksum mismatch');
    const name = [string(345, 155), string(0, 100)].filter(Boolean).join('/');
    assert(name.startsWith('package/') && !name.split('/').some(value => ['.', '..', ''].includes(value)) && !name.includes('\\'), 'Unsafe package archive path');
    assert(!all.has(name), 'Duplicate package archive path'); all.add(name);
    assert(['0', ''].includes(string(156, 1)), 'Only regular npm package files supported');
    const size = octal(124, 12), mode = octal(100, 8) & 0o777;
    assert(offset + 512 + size <= tar.length, 'Truncated package archive');
    const bytes = tar.subarray(offset + 512, offset + 512 + size);
    const path = name.slice(8);
    if (path === 'package.json') pkg = JSON.parse(bytes);
    else if (!/^(?:README\.md|DESIGN\.md|CHANGELOG\.md|docs\/.+\.md)$/.test(path)) files[path] = { sha256: hash(bytes), mode, size };
    offset += 512 + Math.ceil(size / 512) * 512;
  }
  assert(pkg && pkg.name === '@naeil/ui', 'Expected shared UI package missing');
  assert(Object.keys(files).some(path => path.startsWith('dist/')), 'Public runtime closure missing');
  for (const entry of Object.values(pkg.exports)) for (const path of Object.values(typeof entry === 'string' ? { import: entry } : entry)) {
    assert(typeof path === 'string' && path.startsWith('./') && files[path.slice(2)], 'Public export target missing from runtime index');
  }
  return { schemaVersion: 1, package: Object.fromEntries(metadata.filter(key => key in pkg).map(key => [key, pkg[key]])), files: Object.fromEntries(Object.entries(files).sort(([a], [b]) => a.localeCompare(b))) };
}

export function compareRuntime(expected, actual) {
  assert.deepEqual(actual.package, expected.package, 'Site/package runtime metadata mismatch');
  assert.deepEqual(actual.files, expected.files, 'Site/package public runtime bytes mismatch');
  return { passed: true, runtimeSha256: hash(JSON.stringify(expected)), files: Object.keys(expected.files).length, documentationDifferencesAllowed: ['README.md', 'DESIGN.md', 'CHANGELOG.md', 'docs/**/*.md'] };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  assert.equal(process.argv.length, 4, 'Usage: node package-runtime.mjs FROZEN.tgz SITE_PACK.tgz');
  console.log(JSON.stringify(compareRuntime(runtimeIndex(readFileSync(process.argv[2])), runtimeIndex(readFileSync(process.argv[3])))));
}
