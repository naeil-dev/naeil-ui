#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { naeilIcons } from './naeil-icons.generated.mjs';

const services = ['abstorm', 'home', 'estimate', 'jev'];
const rules = new Set(['theme', 'chrome', 'rhythm', 'icons', 'titles']);
const excluded = /^(?:node_modules|\.next|\.git|dist|build|out|coverage|storybook-static|test-results|playwright-report|__tests__|__mocks__|tests?|e2e)$/;
const sourceFile = /\.(?:[cm]?[jt]sx?|css|html)$/;
const testFile = /\.(?:test|spec|stories)\.[^.]+$|(?:^|[-.])test[-.]harness\./;
// Keep line positions, literals and URLs; remove JS/CSS/HTML comments only.
function withoutComments(text) {
  return text.replace(/("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(\/\*[\s\S]*?\*\/|\/\/[^\n]*|<!--[\s\S]*?-->)/g,
    (all, literal) => literal ?? all.replace(/[^\n]/g, ' '));
}
// Balanced call/object ranges keep nested expressions from truncating metadata checks.
function closing(text, start, open, close) {
  let depth = 0, quote = '';
  for (let i = start; i < text.length; i++) {
    const char = text[i];
    if (quote) { if (char === '\\') i++; else if (char === quote) quote = ''; continue; }
    if ('"\'`'.includes(char)) { quote = char; continue; }
    if (char === open) depth++;
    if (char === close && --depth === 0) return i;
  }
  return text.length;
}
function* openingTags(text) {
  for (const match of text.matchAll(/<([A-Za-z_$][\w.$-]*)\b/g)) {
    let braces = 0, quote = '', end = match.index + match[0].length;
    for (; end < text.length; end++) {
      const char = text[end];
      if (quote) { if (char === '\\') end++; else if (char === quote) quote = ''; continue; }
      if ('"\'`'.includes(char)) { quote = char; continue; }
      if (char === '{') braces++;
      if (char === '}') braces--;
      if (char === '>' && braces === 0) break;
    }
    yield { name: match[1], index: match.index, text: text.slice(match.index, end + 1) };
  }
}
function attributes(tag) {
  const result = {};
  for (const match of tag.replace(/=\{\s*(["'])(.*?)\1\s*\}/g, '=$1$2$1').replace(/^<\/?[\w.-]+/, '').replace(/\/?\s*>$/, '').matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g))
    result[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? '';
  return result;
}
function sameAttributes(a, b) {
  return Object.keys(a).length === Object.keys(b).length && Object.entries(b).every(([key, value]) => a[key] === value);
}

/** Static adoption gate, not a JS/CSS interpreter or a replacement for browser QA. */
export function checkConformance({ service, framework, app }) {
  if (!services.includes(service)) throw new Error(`--service must be ${services.join('|')}`);
  if (!['next', 'vite'].includes(framework)) throw new Error('--framework must be next|vite');
  const root = resolve(app);
  if (!existsSync(root)) throw new Error(`App directory does not exist: ${root}`);
  const files = [];
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory() && !excluded.test(entry.name) && !entry.name.startsWith('.')) walk(join(dir, entry.name));
      else if (entry.isFile() && sourceFile.test(entry.name) && !testFile.test(entry.name)) files.push(join(dir, entry.name));
    }
  }
  walk(root);
  files.sort();
  const issues = [], ignores = [], sources = new Map();
  for (const file of files) {
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
  }
  function report(file, offset, rule, message) {
    const source = sources.get(file);
    const line = source ? source.text.slice(0, offset).split('\n').length : 1;
    if (!source?.exemptions.has(`${line}:${rule}`)) issues.push({ file, line, rule, message });
  }
  let shell = false, theme = false;
  const iconLinks = [];
  for (const [file, { text }] of sources) {
    const scan = (regex, rule, message) => { for (const match of text.matchAll(regex)) report(file, match.index, rule, message); };
    // Resolve named import aliases as well as conventional component spellings.
    const shellNames = new Set(['NaeilServiceShell']), themeNames = new Set(['NaeilThemeProvider']);
    const headerNames = new Set(['NaeilHeader', 'NaeilFooter']);
    for (const imported of text.matchAll(/import\s*\{([^}]+)\}\s*from\s*["']([^"']+)["']/g)) {
      for (const binding of imported[1].split(',')) {
        const [name, alias] = binding.trim().split(/\s+as\s+/);
        if (name === 'ThemeProvider' && ['next-themes', '@naeil/ui/components/theme-provider'].includes(imported[2]))
          report(file, imported.index, 'theme', 'Use NaeilThemeProvider at the app root');
        if (name === 'NaeilServiceShell') shellNames.add(alias ?? name);
        if (name === 'NaeilThemeProvider') themeNames.add(alias ?? name);
        if (['NaeilHeader', 'NaeilFooter'].includes(name)) headerNames.add(alias ?? name);
      }
    }
    scan(/import\s+(?:[\w$]+|\*\s+as\s+[\w$]+)\s+from\s*["'](?:next-themes|@naeil\/ui\/components\/theme-provider)["']/g, 'theme', 'Import NaeilThemeProvider instead of another theme provider');
    for (const tag of openingTags(text)) {
      if (shellNames.has(tag.name)) shell = true;
      if (themeNames.has(tag.name)) theme = true;
      if (headerNames.has(tag.name)) report(file, tag.index, 'chrome', 'Use NaeilServiceShell instead of direct header/footer JSX');
      for (const attr of tag.text.matchAll(/\b(?:defaultTheme|forcedTheme|storageKey)\s*=/g))
        report(file, tag.index + attr.index, 'theme', 'Theme policy belongs to NaeilThemeProvider');
    }
    scan(/\bui-app-(?:main|frame)\b/g, 'rhythm', 'The shell owns main/frame classes');
    if (/\.css$/.test(file)) {
      for (const block of text.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        const selector = block[1];
        if (/\.ui-app-|\.ui-page-|\.ui-site-footer|\.naeil-header|\[\s*data-naeil-|\[\s*data-slot\s*=\s*["']?(?:site-footer|navigation)\b/.test(selector))
          report(file, block.index + selector.search(/\S/), 'rhythm', 'Do not style shared frame, page or chrome selectors');
        if (/(?:^|[\s,>+~(])(?:html|body|:root)(?=[\s,.#:[>+~)]|$)/.test(selector) && /(?:^|[;{}\s])font-(?:size|family)\s*:/.test(block[2]))
          report(file, block.index + selector.search(/\S/), 'rhythm', 'Use the shared body font and size');
      }
    }
    if (framework === 'next') {
      for (const metadata of text.matchAll(/(?:\bmetadata\s*(?::[^=;]+)?=\s*|\b(?:async\s+)?function\s+generateMetadata\s*\([^)]*\)[^{]*|\b(?:const|let)\s+generateMetadata\s*=[^;]*?=>\s*(?:\(\s*)?)(\{)/g)) {
        const start = metadata.index + metadata[0].lastIndexOf('{');
        const body = text.slice(start, closing(text, start, '{', '}') + 1);
        for (const icon of body.matchAll(/(?:\bicons|["\']icons["\'])\s*:/g)) report(file, start + icon.index, 'icons', 'Use Next root icon files without metadata icons overrides');
      }
    }
    for (const match of text.matchAll(/\blocaleMetadata\s*\(/g)) {
      const start = match.index + match[0].lastIndexOf('(');
      const call = text.slice(start, closing(text, start, '(', ')') + 1);
      const serviceName = /(?:\bserviceName|["\']serviceName["\'])\s*:/.exec(call);
      if (serviceName) report(file, start + serviceName.index, 'titles', 'localeMetadata derives the name from service; remove serviceName');
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
  if (!shell) report(anchor, 0, 'chrome', 'Render at least one NaeilServiceShell');
  if (!theme && !shell) report(anchor, 0, 'theme', 'Render NaeilThemeProvider (or NaeilServiceShell)');
  let iconRoot = join(root, 'public');
  if (framework === 'next') iconRoot = existsSync(join(root, 'app')) ? join(root, 'app') : existsSync(join(root, 'src/app')) ? join(root, 'src/app') : root;
  for (const [name, digest] of Object.entries(naeilIcons.files)) {
    const file = join(iconRoot, name);
    if (!existsSync(file)) report(file, 0, 'icons', `Missing brand ${naeilIcons.brandVersion} icon`);
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
export function main(args = process.argv.slice(2)) {
  try {
    if (args.includes('--help')) { console.log('naeil-ui-conformance --service abstorm|home|estimate|jev --framework next|vite --app <dir>'); return 0; }
    const options = {};
    for (let i = 0; i < args.length; i += 2) {
      const key = args[i].replace(/^--/, '');
      if (!['service', 'framework', 'app'].includes(key) || !args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`Invalid argument: ${args[i]}`);
      options[key] = args[i + 1];
    }
    if (!options.app) throw new Error('--app is required');
    const report = checkConformance(options);
    for (const item of report.ignores) console.log(`${relative(report.root, item.file) || basename(item.file)}:${item.line} ignore ${item.rule}: ${item.reason}`);
    for (const item of report.issues) console.error(`${relative(report.root, item.file) || basename(item.file)}:${item.line} ${item.rule} ${item.message}`);
    console.log(`naeil-ui-conformance: ${report.issues.length ? 'FAIL' : 'PASS'} (${report.issues.length} violations, ${report.ignores.length} ignores)`);
    return report.issues.length ? 1 : 0;
  } catch (error) { console.error(`naeil-ui-conformance: ${error.message}`); return 1; }
}
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) process.exitCode = main();
