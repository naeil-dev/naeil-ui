import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runtimeFindings } from './audit-site-runtime.mjs';

const advisory = (severity, paths, module = 'next') => ({
  severity, module_name: module, github_advisory_id: 'GHSA-fixture', findings: [{ paths }],
});
test('includes direct and transitive site runtimes even when declared as devDependencies', () => {
  const results = runtimeFindings({ advisories: {
    next: advisory('high', ['.>next']),
    supabase: advisory('critical', ['.>@supabase/ssr>@supabase/supabase-js>@supabase/realtime-js>ws'], 'ws'),
    blog: advisory('high', ['.>gray-matter>js-yaml', '.>eslint>js-yaml'], 'js-yaml'),
  } });
  assert.equal(results.length, 3);
  assert.deepEqual(results[2].paths, ['.>gray-matter>js-yaml']);
});
test('ignores build-only paths and lower severities, including Next under a tool root', () => {
  assert.deepEqual(runtimeFindings({ advisories: {
    storybook: advisory('critical', ['.>storybook']),
    tool: advisory('high', ['.>@storybook/nextjs-vite>next']),
    lint: advisory('high', ['.>eslint-config-next>@next/eslint-plugin-next>glob']),
    next: advisory('moderate', ['.>next']),
  } }), []);
});
test('accepts a clean full audit but fails closed on registry errors or malformed paths', () => {
  assert.deepEqual(runtimeFindings({ advisories: {} }), []);
  for (const report of [{ error: { message: 'registry unavailable' } }, {}, { advisories: { next: advisory('high', ['next']) } }, { advisories: { next: advisory('high', []) } }]) {
    assert.throws(() => runtimeFindings(report));
  }
});
