import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { captureAccountReference } from './capture-account-reference.mjs';
import { syntheticArchive } from './fixtures/release.mjs';
import { hash } from './standing-config.mjs';

async function fixture(t) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'account-reference-'))); chmodSync(root, 0o700);
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const version = '0.7.42', sourceRevision = 'a'.repeat(40), archive = syntheticArchive(version), archivePath = join(root, 'synthetic.tgz'); writeFileSync(archivePath, archive);
  const build = { schemaVersion: 1, frozen: true, sourceRevision, ui: { version, contractVersion: '1' } };
  const font = readFileSync(new URL('../../node_modules/pretendard/dist/web/static/woff2/Pretendard-Regular.woff2', import.meta.url)).toString('base64');
  const html = `<html lang="ja"><style>
    @font-face{font-family:'Noto Sans JP';src:url(data:font/woff2;base64,${font})}body{margin:0}button{font-family:'Noto Sans JP'}
    [data-naeil-account-trigger]{width:44px;height:44px;padding:0}.naeil-header-account-avatar{display:inline-flex;width:32px;height:32px}svg{width:16px;height:16px}
    [data-naeil-account-menu]{width:224px;padding:4px}[role=menuitem]{font-size:16px}
    [data-mobile]{display:none}@media(max-width:767px){[data-mobile]{display:block}header:not(.open) [data-naeil-account-trigger]{display:none}}
    </style><header data-naeil-header data-naeil-ui-version="${version}"><button data-mobile>メニュー</button><button data-naeil-account-trigger><span class="naeil-header-account-avatar"><svg></svg></span></button></header><div data-naeil-account-menu hidden><button role="menuitem">Synthetic action</button></div><script>
    document.documentElement.className = location.search.includes('theme:dark') ? 'dark' : 'light';
    document.querySelector('[data-mobile]').onclick = () => document.querySelector('header').classList.add('open');
    document.querySelector('[data-naeil-account-trigger]').onclick = () => document.querySelector('[data-naeil-account-menu]').hidden = false;
    </script></html>`;
  const server = createServer((request, response) => {
    response.setHeader('content-type', request.url === '/naeil-release.json' ? 'application/json' : 'text/html; charset=utf-8');
    response.end(request.url === '/naeil-release.json' ? JSON.stringify(build) : html);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); t.after(() => new Promise(resolve => server.close(resolve)));
  const input = { origin: `http://127.0.0.1:${server.address().port}`, archivePath, sourceRevision, version, outputPath: join(root, 'account.json') };
  return { root, input, build, archive };
}

test('account capture CLI generates four frozen archive/source-bound cases with real local Chromium', async t => {
  const f = await fixture(t), config = join(f.root, 'input.json'); writeFileSync(config, JSON.stringify(f.input));
  const { stdout } = await promisify(execFile)(process.execPath, [new URL('./capture-account-reference.mjs', import.meta.url).pathname, config]);
  assert.equal(JSON.parse(stdout).cases, 4);
  const result = JSON.parse(readFileSync(f.input.outputPath));
  assert.equal(result.kind, 'independent-account-render'); assert.equal(result.frozen, true); assert.equal(result.archiveSha256, hash(f.archive)); assert.equal(result.sourceRevision, f.input.sourceRevision);
  assert.equal(result.cases.length, 4); assert.equal(statSync(f.input.outputPath).mode & 0o777, 0o600);
  assert.deepEqual(result.cases.map(sample => [sample.width, sample.theme]), [[390, 'light'], [390, 'dark'], [1440, 'light'], [1440, 'dark']]);
});

test('account capture refuses nonlocal sites, foreign package/build source, unfrozen build and overwrite', async t => {
  const f = await fixture(t);
  await assert.rejects(captureAccountReference({ ...f.input, origin: 'https://naeil.dev' }), /Loopback/);
  await assert.rejects(captureAccountReference({ ...f.input, version: '0.7.43' }), /archive version/);
  for (const change of [{ sourceRevision: 'b'.repeat(40) }, { frozen: false }, { ui: { version: '0.7.43', contractVersion: '1' } }]) {
    const saved = structuredClone(f.build); Object.assign(f.build, change);
    await assert.rejects(captureAccountReference(f.input)); Object.assign(f.build, saved);
  }
  writeFileSync(f.input.outputPath, 'preserved');
  await assert.rejects(captureAccountReference(f.input), /EEXIST/);
  assert.equal(readFileSync(f.input.outputPath, 'utf8'), 'preserved');
});
