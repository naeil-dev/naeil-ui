#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const services = ['abstorm', 'home', 'estimate', 'jev', 'storm'];
const rules = new Set(['theme', 'chrome', 'rhythm', 'icons', 'titles']);
const excluded = /^(?:node_modules|\.next|\.git|dist|build|out|coverage|storybook-static|test-results|playwright-report|__tests__|__mocks__|tests?|e2e)$/;
const sourceFile = /\.(?:[cm]?[jt]sx?|css|html)$/;
const testFile = /\.(?:test|spec|stories)\.[^.]+$|(?:^|[-.])test[-.]harness\./;
import { withoutComments, openingTags, attributes, bindings, imports } from './conformance-source.mjs';
import { projectResolver } from './conformance-project.mjs';
/** Static adoption gate, not a JS/CSS interpreter or a replacement for browser QA. */
export function checkConformance({ service, framework, app }) {
  if (!services.includes(service)) throw new Error(`--service must be ${services.join('|')}`);
  if (!['next', 'vite'].includes(framework)) throw new Error('--framework must be next|vite');
  const root = resolve(app);
  if (!existsSync(root)) throw new Error(`App directory does not exist: ${root}`);
  const files = [];
  const resolveImport = projectResolver(root);
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory() && !excluded.test(entry.name) && !entry.name.startsWith('.')) walk(join(dir, entry.name));
      else if (entry.isFile() && sourceFile.test(entry.name) && !testFile.test(entry.name)) files.push(join(dir, entry.name));
    }
  }
  walk(root);
  files.sort();
  const issues = [], ignores = [], sources = new Map();
  function load(file) {
    if (sources.has(file)) return sources.get(file);
    if (!sourceFile.test(file) || !existsSync(file)) return;
    const raw = readFileSync(file, 'utf8');
    const lines = raw.split('\n');
    const exemptions = new Map();
    lines.forEach((line, index) => {
      // The escape hatch must be a comment, with a nonempty reviewable reason.
      const match = line.match(/^\s*(?:\/\/|\/\*|<!--|\{\/\*)\s*naeil-conformance-ignore\s+([\w-]+):\s*(.*?)\s*(?:\*\/\}?|-->)?\s*$/);
      if (!match) return;
      const [, rule, reason] = match;
      if (!rules.has(rule) || !reason) issues.push({ file, line: index + 1, rule: 'config', message: 'Ignore requires a known rule and a reason' });
      else { exemptions.set(`${index + 2}:${rule}`, true); ignores.push({ file, line: index + 1, rule, reason }); }
    });
    sources.set(file, { text: withoutComments(raw), exemptions });
    return sources.get(file);
  }
  for (const file of files) load(file);
  function report(file, offset, rule, message) {
    const source = sources.get(file);
    const line = source ? source.text.slice(0, offset).split('\n').length : 1;
    if (!source?.exemptions.has(`${line}:${rule}`)) issues.push({ file, line, rule, message });
  }
  const reachable = new Set();
  function visit(file) {
    if (reachable.has(file) || !load(file)) return;
    reachable.add(file);
    for (const name of imports(sources.get(file).text)) {
      const target = resolveImport(file, name);
      if (target) visit(target);
    }
  }
  const nextApp = existsSync(join(root, 'app')) ? join(root, 'app') : existsSync(join(root, 'src/app')) ? join(root, 'src/app') : root;
  if (framework === 'next') for (const file of files) {
    if (file.startsWith(nextApp + '/') && /^layout\.[cm]?[jt]sx?$/.test(basename(file))) visit(file);
  }
  else {
    const index = sources.get(join(root, 'index.html'))?.text ?? '';
    for (const tag of openingTags(index)) if (tag.name === 'script') {
      const src = attributes(tag.text).src;
      if (src) visit(resolve(root, src.replace(/^\//, '')));
    }
  }
  let shell = false;
  for (const [file, {text}] of sources) {
    const names = bindings(text);
    // Existing lexical bindings are intentionally bounded, not an interpreter.
    // Require an actual package import before considering adoption evidence.
    if (!imports(text).some(name => name === '@naeil/ui/naeil-shell' || name === '@naeil/ui/naeil-locale/chrome')) continue;
    for (const tag of openingTags(text)) {
      if (names.get(tag.name) !== 'NaeilServiceShell') continue;
      const expressions = {};
      attributes(tag.text, {}, expressions);
      if (reachable.has(file)) shell = true;
      if (!Object.hasOwn(expressions, 'account'))
        report(file, tag.index, 'chrome', 'Every NaeilServiceShell must pass account=; the shell owns account presentation');
    }
  }
  const anchor = files.find(file => /(?:layout|main|App)\.[jt]sx?$/.test(file)) ?? files[0] ?? join(root, 'index.html');
  if (!shell) report(anchor, 0, 'chrome', 'Import and use a reachable NaeilServiceShell from a framework entry');
  return { root, issues, ignores };
}
export async function main(args = process.argv.slice(2)) {
  try {
    if (args.includes('--help')) { console.log('naeil-ui-conformance --service storm|abstorm|home|estimate|jev --framework next|vite --app <dir>\nnaeil-ui-conformance --service <id> --url <origin> --routes /a,/b [--no-footer /login] [--no-account /login,/gate] [--app <consumer-dir>] [--storage-state <file>] [--header name:value] [--expect-status /unknown=404] [--allow-redirect /old=/new] [--wait-for /route=<selector>]\n--no-account, --header, --expect-status, --allow-redirect and --wait-for are repeatable. Measurement waits for fonts and no aria-busy region; network idle is best effort.'); return 0; }
    const options = {};
    for (let i = 0; i < args.length; i += 2) {
      const key = args[i].replace(/^--/, '');
      if (!['service', 'framework', 'app', 'url', 'routes', 'no-footer', 'no-account', 'storage-state', 'header', 'expect-status', 'allow-redirect', 'wait-for'].includes(key) || !args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`Invalid argument: ${args[i]}`);
      if (['no-account', 'header', 'expect-status', 'allow-redirect', 'wait-for'].includes(key)) (options[key] ??= []).push(args[i + 1]);
      else options[key] = args[i + 1];
    }
    if (!services.includes(options.service)) throw new Error(`--service must be ${services.join('|')}`);
    if (options.url) {
      if (!options.routes) throw new Error('--routes is required with --url');
      const {checkRuntimeConformance} = await import('./conformance-runtime.mjs');
      const rows = await checkRuntimeConformance({...options, routes: options.routes.split(','), noFooter: options['no-footer']?.split(',') ?? [], noAccount: options['no-account']?.flatMap(value => value.split(',')) ?? [], storageState: options['storage-state'], headers: options.header, expectStatus: options['expect-status'], allowRedirect: options['allow-redirect'], waitFor: options['wait-for']});
      console.table(rows.map(row => ({route: row.route, viewport: row.viewport, scheme: row.scheme, accounts:row.measurements?.accountCount, fonts:row.measurements?.renderedFonts?.status === 'measured' ? row.measurements.renderedFonts.fonts.map(font => `${font.familyName} (${font.glyphCount})`).join(', ') : 'not measured', result: row.errors.length ? 'FAIL' : 'PASS', details: row.errors.join('; ')})));
      const failures = rows.filter(row => row.errors.length).length;
      console.log(`naeil-ui-conformance runtime: ${failures ? 'FAIL' : 'PASS'} (${rows.length} checks, ${failures} failures)`);
      return failures ? 1 : 0;
    }
    if (['routes','no-footer','no-account','storage-state','header','expect-status','allow-redirect','wait-for'].some(key => options[key])) throw new Error('Runtime route/auth/status/redirect options require --url');
    if (!options.app) throw new Error('--app is required');
    const report = checkConformance(options);
    for (const item of report.ignores) console.log(`${relative(report.root, item.file) || basename(item.file)}:${item.line} ignore ${item.rule}: ${item.reason}`);
    for (const item of report.issues) console.error(`${relative(report.root, item.file) || basename(item.file)}:${item.line} ${item.rule} ${item.message}`);
    console.log(`naeil-ui-conformance: ${report.issues.length ? 'FAIL' : 'PASS'} (${report.issues.length} violations, ${report.ignores.length} ignores)`);
    return report.issues.length ? 1 : 0;
  } catch (error) { console.error(`naeil-ui-conformance: ${error.message}`); return error.exitCode ?? 1; }
}
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) process.exitCode = await main();
