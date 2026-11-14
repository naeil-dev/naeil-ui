#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { naeilIcons } from './naeil-icons.generated.mjs';

const services = ['abstorm', 'home', 'estimate', 'jev'];
const rules = new Set(['theme', 'chrome', 'rhythm', 'icons', 'titles']);
const excluded = /^(?:node_modules|\.next|\.git|dist|build|out|coverage|storybook-static|test-results|playwright-report|__tests__|__mocks__|tests?|e2e)$/;
const sourceFile = /\.(?:[cm]?[jt]sx?|css|html)$/;
const testFile = /\.(?:test|spec|stories)\.[^.]+$|(?:^|[-.])test[-.]harness\./;
import { withoutComments, closing, openingTags, attributes, bindings, imports, objectResolver, hasFrameClass, splitTop, spreads, targetsGlobalElement } from './conformance-source.mjs';
import { projectResolver } from './conformance-project.mjs';
import { checkNextMetadata } from './conformance-metadata.mjs';
function sameAttributes(a, b) {
  return Object.keys(a).length === Object.keys(b).length && Object.entries(b).every(([key, value]) => a[key] === value);
}

/** Static adoption gate, not a JS/CSS interpreter or a replacement for browser QA. */
export function checkConformance({ service, framework, app }) {
  if (!services.includes(service)) throw new Error(`--service must be ${services.join('|')}`);
  if (!['next', 'vite'].includes(framework)) throw new Error('--framework must be next|vite');
  const root = resolve(app);
  if (!existsSync(root)) throw new Error(`App directory does not exist: ${root}`);
  const files = [], assets = [];
  const resolveImport = projectResolver(root), publicRoot = join(resolveImport.projectRoot, 'public');
  function walk(dir, scanSources = true) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory() && !excluded.test(entry.name) && !entry.name.startsWith('.')) walk(join(dir, entry.name), scanSources);
      else if (entry.isFile()) { assets.push(join(dir, entry.name)); if (scanSources && sourceFile.test(entry.name) && !testFile.test(entry.name)) files.push(join(dir, entry.name)); }
    }
  }
  walk(root);
  if (!publicRoot.startsWith(root + '/') && existsSync(publicRoot)) walk(publicRoot, false);
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
  let shell = false, theme = false;
  const cssImports = new Set(), iconLinks = [];
  for (const [file, { text }] of sources) {
    const scan = (regex, rule, message) => { for (const match of text.matchAll(regex)) report(file, match.index, rule, message); };
    const names = bindings(text), inspect = objectResolver(text, names);
    for (const name of imports(text)) cssImports.add(name);
    for (const m of text.matchAll(/@import\s*["']([^"']+)["']/g)) cssImports.add(m[1]);
    const providerModules = ['next-themes', '@naeil/ui', '@naeil/ui/components/theme-provider'];
    for (const m of text.matchAll(/\b(import|export)\s*([^;]*?)\s*from\s*["']([^"']+)["']/g)) {
      if (!providerModules.includes(m[3])) continue;
      if (/\bThemeProvider\b/.test(m[2]) || m[1] === 'export' && /\*/.test(m[2]) || m[3] !== '@naeil/ui' && !m[2].includes('{'))
        report(file, m.index, 'theme', 'Use NaeilThemeProvider instead of importing/re-exporting ThemeProvider');
      const ns = /\*\s+as\s+(\w+)/.exec(m[2]);
      if (ns && new RegExp(`\\b${ns[1]}\\.ThemeProvider\\b`).test(text)) report(file, m.index, 'theme', 'Use NaeilThemeProvider');
    }
    scan(/document\s*\.\s*documentElement\s*\.\s*(?:classList\s*\.\s*(?:(?:add|remove|toggle|replace)\s*\(|value\s*=)|className\s*(?:=(?!=)|\+=|\|\|=|\?\?=)|setAttribute\s*\(\s*["']class["'])|\bcolorScheme\s*(?:=|\+=|\|\|=|\?\?=)|\.setProperty\s*\(\s*["']color-scheme["']/g, 'theme', 'Do not write document theme classes or colorScheme');
    for (const tag of openingTags(text)) {
      const positions = {}, name = names.get(tag.name), attrs = attributes(tag.text, positions);
      if (name === 'NaeilServiceShell') {
        if (attrs.service !== service) report(file, tag.index, 'chrome', `Shell service must be the literal "${service}"${attrs.service === undefined ? ' (review-needed: unresolved service)' : ''}`);
        else if (reachable.has(file)) shell = true;
      }
      if (name === 'NaeilThemeProvider' && reachable.has(file)) theme = true;
      if (['NaeilHeader', 'NaeilFooter'].includes(name)) report(file, tag.index, 'chrome', 'Use NaeilServiceShell instead of direct header/footer JSX');
      if (tag.name === 'main' || attrs.role === 'main' || attrs.id === 'main') report(file, tag.index, 'chrome', 'The shell owns main, role="main" and id="main"');
      const spreadKeys = new Set(spreads(tag.text).flatMap(value => [...inspect(value).keys]));
      if (name === 'PageHeader' && (['style', 'classname'].some(key => Object.hasOwn(attrs, key)) || ['style', 'className'].some(key => spreadKeys.has(key)))) report(file, tag.index, 'rhythm', 'Owned-service PageHeader accepts no style/className overrides');
      if (name === 'NaeilThemeProvider' || /ThemeProvider$/.test(tag.name)) {
        const own = ['defaulttheme', 'storagekey', 'forcedtheme'].find(key => Object.hasOwn(attrs, key));
        if (own || ['defaultTheme', 'storageKey', 'forcedTheme'].some(key => spreadKeys.has(key)))
          report(file, tag.index + (positions[own] ?? 0), 'theme', 'Theme policy belongs to NaeilThemeProvider');
      }
    }
    if (!/\.(?:css|html)$/.test(file)) {
      const offset = hasFrameClass(text);
      if (offset >= 0) report(file, offset, 'rhythm', 'The shell owns main/frame class tokens');
    }
    if (/\.css$/.test(file)) {
      scan(/--(?:ui-[\w-]+|text-[\w-]+|spacing-[\w-]+|radius-[\w-]+|color-[\w-]+|(?:background|foreground|border|input|ring|card|popover|primary|secondary|muted|accent|destructive|success|warning|error|info|canvas|surface|action|focus|neutral|sidebar|chart)(?:-[\w-]+)?)\s*:/g, 'rhythm', 'Do not redefine shared design tokens');
      for (const block of text.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        const selector = block[1];
        if (/\.ui-app-|\.ui-page-|\.ui-site-footer|\.naeil-header|\[\s*data-naeil-|\[\s*data-slot\s*=\s*["']?(?:site-footer|navigation)\b/.test(selector)
          || targetsGlobalElement(selector))
          report(file, block.index + selector.search(/\S/), 'rhythm', 'Do not style shared frame, page, chrome or global main/h1/header/footer selectors');
        if (/(?:^|[\s,>+~(])(?:html|body|:root)(?=[\s,.#:[>+~)]|$)/.test(selector) && /(?:^|[;{}\s])(?:font(?:-(?:size|family))?|line-height)\s*:/.test(block[2]))
          report(file, block.index + selector.search(/\S/), 'rhythm', 'Use the shared body typography');
      }
    }
    if (framework === 'next' && file.startsWith(nextApp + '/') && /^(?:layout|page|template|route)\.[cm]?[jt]sx?$/.test(basename(file)))
      checkNextMetadata(file, {load, resolveImport, report});
    if (framework === 'vite') for (const match of text.matchAll(/\b([\w$.]+)\s*\(/g)) {
      if (names.get(match[1]) !== 'localeMetadata') continue;
      const start = match.index + match[0].length - 1;
      const args = splitTop(text.slice(start + 1, closing(text, start)));
      const result = inspect(args[0] ?? '');
      if (result.keys.has('serviceName')) report(file, match.index, 'titles', 'localeMetadata derives the name from service; remove serviceName');
      if (result.unresolved) report(file, match.index, 'titles', 'review-needed: cannot resolve localeMetadata options');
    }
    if (framework === 'vite' && /^vite\.config\./.test(basename(file))) for (const m of text.matchAll(/(?:\bbase|["']base["'])\s*(?::\s*|(?=[,}]))/g)) {
      const value = /^["']\/["'](?=\s*[,}\n]|\s*$)/.test(text.slice(m.index + m[0].length));
      if (!value) report(file, m.index, 'chrome', 'Vite base must be / (review-needed if unresolved)');
    }
    for (const link of text.matchAll(/<link\b[^>]*>/gi)) {
      const attrs = attributes(link[0]);
      if (attrs.rel && /(?:^|\s)(?:icon|apple-touch-icon|apple-touch-icon-precomposed)(?:\s|$)/i.test(attrs.rel)) {
        if (framework === 'vite' && file === join(root, 'index.html')) iconLinks.push({ file, offset: link.index, attrs });
        else report(file, link.index, 'icons', 'No additional icon link declarations');
      }
    }
  }
  const anchor = files.find(file => /(?:layout|main|App)\.[jt]sx?$/.test(file)) ?? files[0] ?? join(root, 'index.html');
  if (!shell) report(anchor, 0, 'chrome', 'Render a reachable NaeilServiceShell with the matching service from a framework entry');
  if (!theme && !shell) report(anchor, 0, 'theme', 'Render NaeilThemeProvider (or NaeilServiceShell)');
  if (!cssImports.has('@naeil/ui/globals.css') && !(cssImports.has('@naeil/ui/theme.css') && cssImports.has('@naeil/ui/components.css'))) report(anchor, 0, 'rhythm', 'Import @naeil/ui/globals.css or both theme.css and components.css');
  let iconRoot = join(root, 'public');
  if (framework === 'next') iconRoot = existsSync(join(root, 'app')) ? join(root, 'app') : existsSync(join(root, 'src/app')) ? join(root, 'src/app') : root;
  for (const file of assets) {
    const routeIcon = framework === 'next' && file.startsWith(nextApp + '/') && relative(nextApp, file).split('/').slice(0, -1).some(part => /^(?:favicon|icon|apple-icon)(?:[.\d-].*)?$/i.test(part));
    const inIcons = file.startsWith(nextApp + '/') && framework === 'next' || dirname(file) === publicRoot;
    if (routeIcon && /^route\.[cm]?[jt]sx?$/.test(basename(file))) report(file, 0, 'icons', 'Remove directory-based route icon handlers');
    if (inIcons && /^(?:favicon|icon|apple-icon|apple-touch-icon)(?:[.\d-].*)?$/i.test(basename(file)) && !(dirname(file) === iconRoot && Object.hasOwn(naeilIcons.files, basename(file)))) {
      const canonicalBytes = Object.values(naeilIcons.files).includes(createHash('sha256').update(readFileSync(file)).digest('hex'));
      if (/\.[cm]?[jt]sx?$/.test(file) || !canonicalBytes) report(file, 0, 'icons', 'Icon aliases must match canonical bytes; dynamic icons are forbidden');
    }
  }
  for (const [name, digest] of Object.entries(naeilIcons.files)) {
    const file = join(iconRoot, name);
    if (!assets.includes(file)) report(file, 0, 'icons', `Missing brand ${naeilIcons.brandVersion} icon`);
    else if (createHash('sha256').update(readFileSync(file)).digest('hex') !== digest) report(file, 0, 'icons', `Icon must match brand ${naeilIcons.brandVersion} SHA-256 ${digest}`);
  }
  if (framework === 'vite') {
    const index = join(root, 'index.html');
    const text = sources.get(index)?.text ?? '';
    if (iconLinks.length !== naeilIcons.links.length || iconLinks.some((link, i) => !sameAttributes(link.attrs, naeilIcons.links[i] ?? {})))
      report(index, iconLinks[0]?.offset ?? 0, 'icons', 'index.html icon links must equal naeilIcons.links in order and attribute set');
    const title = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(text);
    if (title?.[1] !== `.naeil ${service}`) report(index, title?.index ?? 0, 'titles', `Initial title must be .naeil ${service}`);
  }
  return { root, issues, ignores };
}
export async function main(args = process.argv.slice(2)) {
  try {
    if (args.includes('--help')) { console.log('naeil-ui-conformance --service abstorm|home|estimate|jev --framework next|vite --app <dir>\nnaeil-ui-conformance --service <id> --url <origin> --routes /a,/b [--no-footer /login] [--app <consumer-dir>] [--storage-state <file>] [--header name:value] [--expect-status /unknown=404] [--allow-redirect /old=/new] [--wait-for /route=<selector>]\n--header, --expect-status, --allow-redirect and --wait-for are repeatable. Measurement waits for network idle and no aria-busy region in main.'); return 0; }
    const options = {};
    for (let i = 0; i < args.length; i += 2) {
      const key = args[i].replace(/^--/, '');
      if (!['service', 'framework', 'app', 'url', 'routes', 'no-footer', 'storage-state', 'header', 'expect-status', 'allow-redirect', 'wait-for'].includes(key) || !args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`Invalid argument: ${args[i]}`);
      if (['header', 'expect-status', 'allow-redirect', 'wait-for'].includes(key)) (options[key] ??= []).push(args[i + 1]);
      else options[key] = args[i + 1];
    }
    if (!services.includes(options.service)) throw new Error(`--service must be ${services.join('|')}`);
    if (options.url) {
      if (!options.routes) throw new Error('--routes is required with --url');
      const {checkRuntimeConformance} = await import('./conformance-runtime.mjs');
      const rows = await checkRuntimeConformance({...options, routes: options.routes.split(','), noFooter: options['no-footer']?.split(',') ?? [], storageState: options['storage-state'], headers: options.header, expectStatus: options['expect-status'], allowRedirect: options['allow-redirect'], waitFor: options['wait-for']});
      console.table(rows.map(row => ({route: row.route, viewport: row.viewport, scheme: row.scheme, result: row.errors.length ? 'FAIL' : 'PASS', details: row.errors.join('; ')})));
      const failures = rows.filter(row => row.errors.length).length;
      console.log(`naeil-ui-conformance runtime: ${failures ? 'FAIL' : 'PASS'} (${rows.length} checks, ${failures} failures)`);
      return failures ? 1 : 0;
    }
    if (['routes','no-footer','storage-state','header','expect-status','allow-redirect','wait-for'].some(key => options[key])) throw new Error('Runtime route/auth/status/redirect options require --url');
    if (!options.app) throw new Error('--app is required');
    const report = checkConformance(options);
    for (const item of report.ignores) console.log(`${relative(report.root, item.file) || basename(item.file)}:${item.line} ignore ${item.rule}: ${item.reason}`);
    for (const item of report.issues) console.error(`${relative(report.root, item.file) || basename(item.file)}:${item.line} ${item.rule} ${item.message}`);
    console.log(`naeil-ui-conformance: ${report.issues.length ? 'FAIL' : 'PASS'} (${report.issues.length} violations, ${report.ignores.length} ignores)`);
    return report.issues.length ? 1 : 0;
  } catch (error) { console.error(`naeil-ui-conformance: ${error.message}`); return error.exitCode ?? 1; }
}
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) process.exitCode = await main();
