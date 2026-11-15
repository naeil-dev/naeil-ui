import { spawnSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// Runtime imports in src/app, src/proxy.ts, src/i18n, src/lib/blog.ts,
// src/lib/supabase and their shared components. These include devDependencies:
// the deployed Next site is built with --prod=false. Update when imports change.
// CSS/font delivery and build/lint/Storybook/CLI tooling are not runtime roots.
export const siteRuntimeRoots = new Set([
  'next', 'react', 'react-dom', 'next-intl', '@supabase/ssr', '@supabase/supabase-js',
  'class-variance-authority', 'clsx', 'lucide-react', 'next-themes', 'radix-ui',
  'sonner', 'tailwind-merge', 'server-only',
  'gray-matter', 'reading-time', 'remark', 'remark-html',
]);

export function runtimeFindings(report) {
  if (report.error || !report.advisories || typeof report.advisories !== 'object' || Array.isArray(report.advisories)) {
    throw new Error('Full dependency audit did not return an advisories object');
  }
  return Object.values(report.advisories).flatMap(advisory => {
    if (!['critical', 'high'].includes(advisory.severity)) return [];
    if (!Array.isArray(advisory.findings) || !advisory.findings.length) throw new Error('Audit finding has no dependency paths');
    const paths = advisory.findings.flatMap(finding => {
      if (!Array.isArray(finding.paths) || !finding.paths.length || finding.paths.some(path => typeof path !== 'string' || !/^\.>[^>]+/.test(path))) {
        throw new Error('Unexpected audit dependency path format');
      }
      return finding.paths.filter(path => siteRuntimeRoots.has(path.split('>')[1]));
    });
    return paths.length ? [{
      id: advisory.github_advisory_id || advisory.id,
      module: advisory.module_name, severity: advisory.severity, paths,
    }] : [];
  });
}

export function main() {
  // Full tree, deliberately without --prod. A nonzero audit exit can mean
  // dev-tool advisories; decide from paths instead of forwarding that exit.
  const audit = spawnSync('pnpm', ['audit', '--json'], { encoding: 'utf8', timeout: 120_000, maxBuffer: 16 * 1024 * 1024 });
  if (audit.error || audit.signal || ![0, 1].includes(audit.status)) throw new Error('Could not complete full dependency audit');
  const findings = runtimeFindings(JSON.parse(audit.stdout));
  for (const finding of findings) console.error(JSON.stringify(finding));
  console.log(`Site runtime audit: ${findings.length} critical/high advisories (full dependency tree scanned).`);
  return findings.length ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  try { process.exitCode = main(); }
  catch (error) { console.error(`Site runtime audit failed: ${error.message}`); process.exitCode = 2; }
}
