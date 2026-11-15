import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const cwd = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Catch lost child stderr/exit status without needing a built app or a browser.
test('a failed app reports its output and exit status and leaves uploadable startup evidence', () => {
  const root = mkdtempSync(join(tmpdir(), 'site-startup-test-'));
  try {
    const artifact = join(root, 'artifact'), evidence = join(root, 'evidence');
    mkdirSync(join(artifact, 'standalone'), { recursive: true });
    writeFileSync(join(artifact, 'receipt.json'), JSON.stringify({
      scope: 'local-synthetic-auth-verification-only', publicAuthOrigin: 'http://127.0.0.1:55431',
    }));
    writeFileSync(join(artifact, 'standalone/server.js'), `
process.stdout.write('startup stdout sentinel\\n');
process.stderr.write('missing build sentinel\\n');
process.exit(23);
`);
    const result = spawnSync(process.execPath, ['scripts/site-account-language.mjs'], {
      cwd, encoding: 'utf8', timeout: 30000,
      env: { ...process.env, NAEIL_ACCOUNT_TEST_ARTIFACT: artifact, NAEIL_ACCOUNT_EVIDENCE: evidence,
        NAEIL_LANGUAGE_ACCEPTANCE: '0', NAEIL_LANGUAGE_ACCEPTANCE_ONLY: '0' },
    });
    assert.ifError(result.error);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /missing build sentinel/);
    assert.match(result.stderr, /startup stdout sentinel/);
    assert.match(result.stderr, /exit code 23/);
    const startup = JSON.parse(readFileSync(join(evidence, 'startup.json'), 'utf8'));
    assert.equal(startup.status, 'failed');
    assert.equal(startup.exitCode, 23);
    assert.match(readFileSync(join(evidence, 'server.log'), 'utf8'), /missing build sentinel/);
    assert.match(readFileSync(join(evidence, 'server.stdout.log'), 'utf8'), /startup stdout sentinel/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
