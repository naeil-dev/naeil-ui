import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

const source = readFileSync(new URL('./build-chrome-fixtures.ts', import.meta.url), 'utf8');
const script = source.match(/<script>(const q=[\s\S]*?)\$\{name !==/)[1];
function render(css, hostile = false) {
  let html = '';
  runInNewContext(script, { URLSearchParams, location: { search: '?' + new URLSearchParams({ css, ...(hostile ? { hostile: '' } : {}) }) }, document: { write: value => { html += value; } } });
  return html;
}
test('chrome fixture CSS query permits only the existing stylesheet variants', () => {
  for (const css of ['globals', 'split', 'globals-no-correction', 'split-no-correction', 'globals-guard-false', 'split-guard-false', 'theme-only', 'js-only']) {
    assert.equal(render(css), `<link rel="stylesheet" href="${css}.css">`);
  }
  assert.equal(render('split', true), '<link rel="stylesheet" href="split-hostile.css">');
});
test('hostile CSS query cannot inject markup or an outside stylesheet', () => {
  for (const value of ['\"><img src=x onerror=alert(1)>', '../../outside', 'https://example.invalid/style', 'SPLIT', '']) {
    assert.equal(render(value), '<link rel="stylesheet" href="globals.css">');
  }
});
