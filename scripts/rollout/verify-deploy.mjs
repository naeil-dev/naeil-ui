import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { assertReference, verifyIdentity } from './rollout.mjs';

// Expected identity comes from the frozen app artifact, never observed production.
export async function main(args = process.argv.slice(2)) {
  assert.equal(args.length, 12, 'Usage: scripts/verify-deploy.sh --origin URL --expected identity.json --routes routes.json --release release.json --reference frozen-reference.json --output RESULT_DIR');
  const flags = Object.fromEntries(args.reduce((pairs, value, index) => index % 2 ? pairs : [...pairs, [value, args[index + 1]]], []));
  for (const flag of ['--origin', '--expected', '--routes', '--release', '--reference', '--output']) assert(typeof flags[flag] === 'string' && flags[flag], `Required ${flag}`);
  assert.equal(Object.keys(flags).length, 6, 'Unknown or duplicate deployment verification option');
  const release = JSON.parse(readFileSync(flags['--release'], 'utf8'));
  assertReference(release, readFileSync(flags['--reference']));
  const expected = JSON.parse(readFileSync(flags['--expected'], 'utf8'));
  const routes = JSON.parse(readFileSync(flags['--routes'], 'utf8'));
  assert.equal(expected.ui?.version, release.version, 'Expected production UI version differs from release');
  assert.equal(expected.ui?.contractVersion, release.contract.version, 'Expected production contract differs from release');
  assert(Array.isArray(routes) && routes.length > 0, 'Nonempty explicit route inventory required');
  await verifyIdentity(flags['--origin'], expected);
  const { verifyProduction } = await import('../verify-ui-production.mjs');
  const result = await verifyProduction({ release, origin: flags['--origin'], identity: expected, routes, referencePath: resolve(flags['--reference']), outputDir: resolve(flags['--output']) });
  await verifyIdentity(flags['--origin'], expected);
  console.log(JSON.stringify({ status: 'production-verified', ...result }, null, 2));
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(error => { console.error(`Deployment verification failed: ${error.message}`); process.exitCode = 1; });
