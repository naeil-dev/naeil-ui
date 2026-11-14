import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, rmSync, symlinkSync, renameSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
import { checkConformance } from "../../../../bin/naeil-ui-conformance.mjs";
import { conformanceFixture } from "../../../../scripts/conformance-fixture";
const roots: string[] = [];
function fixture(framework: "next" | "vite") {
  const root = mkdtempSync(join(tmpdir(), "naeil-conformance-")); roots.push(root);
  conformanceFixture(root, framework);
  const check = () => checkConformance({ service: "estimate", framework, app: root });
  return { root, check, add: (file: string, text: string | Uint8Array) => { const path = join(root, file); mkdirSync(join(path, ".."), { recursive: true }); writeFileSync(path, text); } };
}
afterEach(() => roots.splice(0).forEach(root => rmSync(root, { force: true, recursive: true })));
describe.each(["next", "vite"] as const)("%s conformance fixture", framework => {
  it("accepts the shell, root policy, exact icons and title", () => {
    expect(fixture(framework).check().issues).toEqual([]);
  });
  it.each([
    ["theme", 'import { ThemeProvider as AppTheme } from "next-themes";'],
    ["theme", 'import {ThemeProvider} from "@naeil/ui/components/theme-provider";'],
    ["theme", '<NaeilThemeProvider defaultTheme="light" forcedTheme="light" storageKey="custom" />'],
    ["chrome", 'import {NaeilHeader as Header} from "@naeil/ui/naeil-header"; const x = <Header/>;'],
    ["chrome", '<NaeilFooter service="home" locale="en"/>'],
    ["rhythm", '<main className="ui-app-frame ui-app-main"/>'],
    ["icons", '<link rel="icon" href="/other.svg"/>'],
    ["titles", 'localeMetadata({ service: "estimate", serviceName: "Wrong" })'],
  ])("rejects %s source fixture: %s", (rule, source) => {
    const { add, check } = fixture(framework);
    add(rule === 'titles' && framework === 'next' ? 'app/page.tsx' : 'violation.tsx', rule === 'titles' && framework === 'next' ? `export const metadata = ${source};` : source);
    expect(check().issues).toEqual(expect.arrayContaining([expect.objectContaining({ rule, line: 1 })]));
  });
  it.each(['.ui-app-frame', '.ui-page-header', '.ui-site-footer', '.naeil-header', '[data-naeil-header]', '[data-slot="site-footer"]', '[data-slot="navigation"]', 'html', 'body', ':root', '@layer base { html, body'])('rejects rhythm CSS fixture %s', selector => {
    const { add, check } = fixture(framework); add("violation.css", `${selector} { font-size: 14px; font-family: Arial; }${selector.startsWith('@') ? '}' : ''}`);
    expect(check().issues.some(issue => issue.rule === 'rhythm')).toBe(true);
  });
  it("rejects missing or altered brand icon bytes", () => {
    const { root, check } = fixture(framework);
    const base = join(root, framework === "next" ? "app" : "public");
    rmSync(join(base, "favicon.ico")); writeFileSync(join(base, "icon.svg"), "wrong");
    expect(check().issues.filter(issue => issue.rule === "icons")).toHaveLength(2);
  });
  it("reports every explicit comment exception with a reason; only the next line is ignored", () => {
    const { add, check } = fixture(framework);
    add("exception.tsx", '// naeil-conformance-ignore chrome: Recorded legacy screen during migration\n<NaeilHeader />\n<NaeilFooter />');
    const result = check();
    expect(result.ignores).toEqual([expect.objectContaining({ line: 1, rule: "chrome", reason: "Recorded legacy screen during migration" })]);
    expect(result.issues.filter(issue => issue.rule === "chrome")).toEqual([expect.objectContaining({ line: 3 })]);
    add("exception.tsx", '{/* naeil-conformance-ignore chrome: Recorded Home login exception */}\n<NaeilHeader />');
    expect(check().issues).toEqual([]);
    expect(check().ignores[0].reason).toBe('Recorded Home login exception');
  });
  it("excludes output/tests and does not treat comments as source usage or violations", () => {
    const { add, check } = fixture(framework);
    for (const file of ["tests/app.tsx", "src/App.test.tsx", "e2e/app.tsx", ".next/server/app.js", "dist/app.js", "node_modules/pkg/app.js"]) add(file, '<NaeilHeader forcedTheme="light"/>');
    add("comments.tsx", '// <NaeilHeader defaultTheme="light"/>\n/* localeMetadata({serviceName: "Wrong"}) */\nconst url="https://naeil.dev/";');
    expect(check().issues).toEqual([]);
  });
  it("requires an actual shell and theme usage", () => {
    const { add, check } = fixture(framework);
    add(framework === "next" ? "app/layout.tsx" : "src/App.tsx", '// <NaeilServiceShell />');
    expect(check().issues.map(issue => issue.rule)).toEqual(expect.arrayContaining(["theme", "chrome"]));
  });
  it("prints file:line diagnostics and returns the correct CLI exit code", () => {
    const { root, add } = fixture(framework);
    const run = () => spawnSync(process.execPath, ['bin/naeil-ui-conformance.mjs', '--service', 'estimate', '--framework', framework, '--app', root], { encoding: 'utf8' });
    expect(run().status).toBe(0);
    add('bad.tsx', '<NaeilHeader />');
    const result = run(); expect(result.status).toBe(1); expect(result.stderr).toContain('bad.tsx:1 chrome');
  });
});
it("checks Next metadata and Vite link order, extra attributes, duplicates and initial titles", () => {
  const next = fixture("next"); next.add("app/page.tsx", 'export const metadata = { icons: { icon: "/wrong.svg" } };');
  expect(next.check().issues[0].rule).toBe("icons");
  for (const mutate of [
    (text: string) => text.replace('href="/favicon.ico"', 'media="all" href="/favicon.ico"'),
    (text: string) => text.replace('</head>', '<link rel="shortcut icon" href="/icon.svg"></head>'),
    (text: string) => text.replace('type="image/x-icon"', 'type="image/svg+xml"'),
    (text: string) => text.replace('href="/favicon.ico"', 'href="/icon.svg"'),
  ]) {
    const vite = fixture("vite"); vite.add("index.html", mutate(readFileSync(join(vite.root, "index.html"), "utf8")));
    expect(vite.check().issues.some(issue => issue.rule === "icons")).toBe(true);
  }
  const vite = fixture("vite"); vite.add("index.html", readFileSync(join(vite.root, "index.html"), "utf8").replace('.naeil estimate', 'Estimate'));
  expect(vite.check().issues.some(issue => issue.rule === "titles")).toBe(true);
});

it("runs through the installed-bin style symlink as well as a realpath", () => {
  const { root } = fixture("vite");
  const link = join(root, "naeil-ui-conformance");
  symlinkSync(join(process.cwd(), "bin/naeil-ui-conformance.mjs"), link);
  const result = spawnSync(process.execPath, [link, "--help"], { encoding: "utf8" });
  expect(result.status).toBe(0); expect(result.stdout).toContain("--framework next|vite");
});
it("checks nested metadata calls without rejecting unrelated product icons", () => {
  const { add, check } = fixture("next");
  add("app/page.tsx", 'const data = { icons: [] }; export const metadata = localeMetadata({ page: t("title"), serviceName: "Wrong" });');
  expect(check().issues.map(issue => issue.rule)).toEqual(["titles"]);
  add("app/page.tsx", 'export async function generateMetadata() { const description = t("description"); return { icons: { icon: "/other.svg" } }; }');
  expect(check().issues.map(issue => issue.rule)).toEqual(["icons"]);
});

it("does not confuse storage variable assignments or string ignore examples with props/comments", () => {
  const { add, check } = fixture("vite");
  add("src/other.tsx", 'const storageKey = "filters"; const sample = "// naeil-conformance-ignore chrome: not a comment";\n<NaeilHeader/>');
  const result = check();
  expect(result.ignores).toEqual([]); expect(result.issues.map(issue => issue.rule)).toEqual(["chrome"]);
});
it("checks multiline JSX props, CSS selector functions and arrow metadata functions", () => {
  const { add, check } = fixture("next");
  add("other.tsx", '<CustomThemeProvider value={() => 1 > 0}\n storageKey="custom"/>');
  expect(check().issues).toEqual(expect.arrayContaining([expect.objectContaining({ line: 2, rule: "theme" })]));
  add("other.css", ':where(body) { font-family: Arial; }');
  add("app/page.tsx", 'export const generateMetadata = async () => ({ icons: { icon: "/wrong.svg" } });');
  expect(check().issues.map(issue => issue.rule)).toEqual(expect.arrayContaining(["rhythm", "icons"]));
});

// r3 regressions: each mutation starts from the same passing framework fixture.
describe.each(["next", "vite"] as const)("%s r3 source policy", framework => {
  it.each([
    ["theme", 'export { ThemeProvider as AppTheme } from "next-themes";'],
    ["theme", 'import { ThemeProvider as AppTheme } from "@naeil/ui";'],
    ["theme", 'export { ThemeProvider as X } from "@naeil/ui/components/theme-provider";'],
    ["theme", 'const options = { forcedTheme: "light" }; <NaeilThemeProvider {...options}/>;'],
    ["theme", 'document.documentElement.classList.add("light");'],
    ["theme", 'document.documentElement.setAttribute("class", "light");'],
    ["theme", 'document.documentElement.style.colorScheme = "light";'],
    ["chrome", 'import * as Chrome from "@naeil/ui/naeil-locale/chrome"; const x = <Chrome.NaeilHeader />;'],
    ["chrome", 'import * as Chrome from "@naeil/ui/naeil-footer"; const Footer = Chrome.NaeilFooter; const x = <Footer />;'],
    ["chrome", '<main />'], ["chrome", '<section role={"main"} />'], ["chrome", '<div id="main" />'],
    ["rhythm", 'import { PageHeader as Heading } from "@naeil/ui/naeil-shell"; const x = <Heading className="title" />;'],
    ["rhythm", 'import * as Chrome from "@naeil/ui/naeil-shell"; const x = <Chrome.PageHeader style={{margin: 2}} />;'],
    ["rhythm", '<div className={cn("panel", { "ui-app-frame": wide })} />'],
    ["rhythm", '<div className={clsx(active && "ui-app-main")} />'],
  ])("rejects %s: %s", (rule, source) => {
    const f = fixture(framework); expect(f.check().issues).toEqual([]);
    f.add("src/violation.tsx", source);
    expect(f.check().issues).toEqual(expect.arrayContaining([expect.objectContaining({rule})]));
  });
  it.each([
    ':root { --ui-page-top: 1px }', '.product { --text-body: 12px; }', '.product { --spacing-4: 2px; }',
    '.product { --radius-panel: 0; }', '.product { --background: pink; --muted-foreground: red; }', '.product { --color-background: pink; }',
    'main { padding: 0 }', 'h1, .title { font-size: 24px }', 'body > header { height: 20px }',
    ':where(footer) { margin: 0 }', ':root { font: 14px Arial }', 'html { line-height: 1 }',
  ])("rejects protected CSS: %s", css => {
    const f = fixture(framework); expect(f.check().issues).toEqual([]); f.add('src/product.css', css);
    expect(f.check().issues.some(i => i.rule === 'rhythm')).toBe(true);
  });
  it("accepts unrelated storage props, class substrings, data and product selectors", () => {
    const f = fixture(framework);
    f.add('src/filters.tsx', '<FilterTable storageKey="filters" defaultTheme="dense" className={cn("custom-ui-app-frame-settings")} data-example="ui-app-main"/>; const data = "ui-app-frame";');
    f.add('src/product.css', '.custom-ui-app-frame-settings { --product-gap: 3px; padding: 1px } .main-heading { color: red }');
    expect(f.check().issues).toEqual([]);
  });
  it("requires shared CSS and accepts the split imports", () => {
    const f = fixture(framework);
    const entry = framework === 'next' ? 'app/layout.tsx' : 'src/main.tsx';
    const text = readFileSync(join(f.root, entry), 'utf8');
    f.add(entry, text.replace(/import ['"]@naeil\/ui\/globals.css['"];?/, ''));
    expect(f.check().issues.some(i => i.rule === 'rhythm')).toBe(true);
    f.add(entry, 'import "@naeil/ui/theme.css"; import "@naeil/ui/components.css";'+text);
    expect(f.check().issues).toEqual([]);
  });
  it("requires a reachable shell with the matching literal service", () => {
    const f = fixture(framework);
    const file = framework === 'next' ? 'app/layout.tsx' : 'src/App.tsx';
    const text = readFileSync(join(f.root, file), 'utf8');
    f.add(file, text.replace('service="estimate"', 'service="home"'));
    expect(f.check().issues.some(i => i.rule === 'chrome' && /service/.test(i.message))).toBe(true);
    f.add(file, text.replace(/<NaeilServiceShell[\s\S]*?<\/NaeilServiceShell>/, '<div/>'));
    f.add('src/unreachable.tsx', text);
    expect(f.check().issues.some(i => i.rule === 'chrome' && /reachable/.test(i.message))).toBe(true);
    f.add(file, text.replaceAll('NaeilServiceShell', 'ServiceShell').replace('import { NaeilThemeProvider, ServiceShell,', 'import { NaeilThemeProvider, NaeilServiceShell as ServiceShell,').replace('import { ServiceShell,', 'import { NaeilServiceShell as ServiceShell,'));
    expect(f.check().issues).toEqual([]);
    f.add(file, 'import * as Chrome from "@naeil/ui/naeil-shell"; import "@naeil/ui/globals.css"; export default function Layout(){return <Chrome.NaeilServiceShell service={"estimate"} locale="en"/>;}');
    expect(f.check().issues).toEqual([]);
  });
});
  it.each(['app/child/icon.svg', 'app/child/icon.tsx', 'app/child/apple-icon.tsx', 'app/child/favicon.ico', 'public/favicon.ico'])("rejects duplicate Next icon %s", file => {
  const f = fixture('next'); expect(f.check().issues).toEqual([]); f.add(file, 'duplicate');
  expect(f.check().issues.some(i => i.rule === 'icons' && i.file.endsWith(file))).toBe(true);
});
it("allows product icon directories and rejects root public duplicates in Vite", () => {
  const f = fixture('vite'); f.add('public/opengraph-image.png', 'image'); expect(f.check().issues).toEqual([]);
  f.add('public/product-icons/icon.svg', 'product image'); expect(f.check().issues).toEqual([]);
  f.add('public/favicon.svg', 'duplicate'); expect(f.check().issues.some(i => i.rule === 'icons')).toBe(true);
});
it.each([
  ['const iconData = { icons: { icon: "/other.svg" } }; export const metadata = iconData;', 'icons'],
  ['const base = {icons: []}; const more = {...base}; export const metadata = {...more};', 'icons'],
  ['import { info } from "./unknown"; export const metadata = {...info};', 'review-needed'],
  ['export const metadata = getMetadata();', 'review-needed'],
  ['import { localeMetadata as metadataFor } from "@naeil/ui/naeil-locale/server"; const options = {service: "estimate", serviceName: "Wrong"}; export const metadata = metadataFor(options);', 'titles'],
  ['import { localeMetadata as metadataFor } from "@naeil/ui/naeil-locale/server"; export const metadata = metadataFor(unknownOptions);', 'review-needed'],
])("resolves metadata or asks for review: %s", (source, expected) => {
  const f = fixture('next'); expect(f.check().issues).toEqual([]); f.add('app/page.tsx', source);
  expect(f.check().issues.some(i => expected === 'review-needed' ? /review-needed/.test(i.message) : i.rule === expected)).toBe(true);
});
it("accepts resolved locale metadata aliases, spreads and product icon data", () => {
  const f = fixture('next');
  f.add('app/page.tsx', 'import { localeMetadata as metadataFor } from "@naeil/ui/naeil-locale/server"; const options = {service: "estimate", page: t("title")}; const base = {description: "ok"}; export const metadata = {...base, ...metadataFor(options)}; const product = {icons: []};');
  expect(f.check().issues).toEqual([]);
});
it.each(['export default {base: "/nested/"}', 'export default defineConfig({base: path})'])("rejects Vite non-root/unresolved base: %s", source => {
  const f = fixture('vite'); f.add('vite.config.ts', source); expect(f.check().issues.length).toBeGreaterThan(0);
});
it.each(['export default {}', 'export default defineConfig({base: "/"})'])("accepts Vite root base: %s", source => {
  const f = fixture('vite'); f.add('vite.config.ts', source); expect(f.check().issues).toEqual([]);
});

it.each([
  'export const generateMetadata = async (): Promise<Metadata> => ({icons: {icon: "/wrong.svg"}});',
  'export const generateMetadata = makeMetadata;',
  'export const metadata = localeMetadata({service: "estimate"}) && {icons: {icon: "/wrong.svg"}};',
])('requires inspection/review of every metadata expression: %s', source => {
  const f = fixture('next'); expect(f.check().issues).toEqual([]); f.add('app/page.tsx', source);
  expect(f.check().issues.some(i => i.rule === 'icons')).toBe(true);
});
it('accepts typed metadata arrows with resolved objects', () => {
  const f = fixture('next');
  f.add('app/page.tsx', 'const info = {description: "ok"}; export const generateMetadata = async (): Promise<Metadata> => info;');
  expect(f.check().issues).toEqual([]);
});
it('does not mistake source strings for shell adoption or JSX violations', () => {
  const f = fixture('next');
  f.add('app/layout.tsx', 'import "@naeil/ui/globals.css"; const example = \'<NaeilServiceShell service="estimate"/>\'; export default function Layout(){return <html><body><div>Missing shell</div></body></html>;}');
  expect(f.check().issues.some(i => i.rule === 'chrome')).toBe(true);
  f.add('src/sample.tsx', 'const examples = [\'<NaeilHeader/>\', "<main>"];');
  expect(f.check().issues.some(i => i.file.endsWith('sample.tsx'))).toBe(false);
});
it('distinguishes product data attributes, JSX text apostrophes and document reads from writes', () => {
  const f = fixture('next');
  f.add('src/product.tsx', '<div className="product" data-example="ui-app-frame">Don\'t change this <span>label</span></div>; document.documentElement.classList.contains("dark"); const theme = document.documentElement.className;');
  expect(f.check().issues).toEqual([]);
  f.add('src/product.tsx', 'document.documentElement.className = "light";');
  expect(f.check().issues.some(i => i.rule === 'theme')).toBe(true);
});
it.each(['const base="/nested/"; export default {base};', 'export default {"base": prefix};'])('rejects shorthand/unresolved Vite base: %s', source => {
  const f = fixture('vite'); f.add('vite.config.ts', source); expect(f.check().issues.some(i => i.rule === 'chrome')).toBe(true);
});

describe('r4 source analysis boundaries', () => {
  it('distinguishes selector-list commas inside scoped functions from qualified global roots', () => {
    const f = fixture('next');
    f.add('src/product.css', '.article :is(header, footer) {padding:4px} .article :where(header, h1) {padding:4px}');
    expect(f.check().issues).toEqual([]);
    for (const selector of ['body.dark > header', 'html[data-locale="ja"] body > h1', ':where(body) footer']) {
      f.add('src/product.css', `${selector} {padding:4px}`);
      expect(f.check().issues.some(i => i.rule === 'rhythm')).toBe(true);
    }
  });
  it('does not treat descendant JSX attributes inside a spread as PageHeader props', () => {
    const f = fixture('next');
    f.add('src/content.tsx', '<PageHeader {...{title:"Title",actions:<button className="button">Action</button>}}/>');
    expect(f.check().issues).toEqual([]);
    f.add('src/content.tsx', '<PageHeader {...{title:"Title",actions:<button className="button">Action</button>,style:{margin:0}}}/>');
    expect(f.check().issues.some(i => i.rule === 'rhythm')).toBe(true);
  });
  it.each([
    'const identity={icons:[]}; export {identity as metadata};',
    'export {identity as metadata} from "../src/metadata";',
    'export {make as generateMetadata} from "../src/metadata";',
  ])('recognizes route metadata export lists/re-exports: %s', source => {
    const f = fixture('next'); f.add('app/page.tsx', source);
    f.add('src/metadata.ts', 'export const identity={icons:[]}; export const make=()=>({icons:[]});');
    expect(f.check().issues.some(i => i.rule === 'icons')).toBe(true);
  });
  it.each([
    'export async function generateMetadata(){const example="return {icons: []}";return {description:"ok"};}',
    'export async function generateMetadata(){function unrelated(){return {icons:[]}}return {description:"ok"};}',
    'export async function generateMetadata(){const unrelated=()=>localeMetadata({serviceName:"Product"});return {description:"ok"};}',
  ])('ignores strings and uncalled nested metadata functions: %s', source => {
    const f = fixture('next'); f.add('app/page.tsx', source);
    expect(f.check().issues).toEqual([]);
    f.add('src/metadata.ts', source.replace('generateMetadata', 'make'));
    f.add('app/page.tsx', 'import {make} from "../src/metadata"; export const generateMetadata=make;');
    expect(f.check().issues).toEqual([]);
  });
  it.each(['const props = {className: "override"}; <PageHeader {...props}/>;', 'const props = {style: {margin: 0}}; <PageHeader {...props}/>;', '<PageHeader {...{className: "override"}}/>;'])('rejects PageHeader presentation props in spreads: %s', source => {
    const f = fixture('next'); f.add('src/content.tsx', source);
    expect(f.check().issues.some(i => i.rule === 'rhythm')).toBe(true);
  });
  it('allows forcedTheme product data and scoped article elements but rejects provider spreads and global selectors', () => {
    const f = fixture('next');
    f.add('src/product.tsx', 'const data = {name: "forcedTheme", forcedTheme: "example"}; const label = "forcedTheme"; <FilterTable forcedTheme="dense"/>;');
    f.add('src/product.css', '.article header {padding: 4px} .article h1 {color:red} .article footer {margin:2px}');
    f.add('public/product-icons/icon.svg', 'product image');
    expect(f.check().issues).toEqual([]);
    f.add('src/product.tsx', 'const options = {forcedTheme: "light"}; <CustomThemeProvider {...options}/>;');
    expect(f.check().issues.some(i => i.rule === 'theme')).toBe(true);
    f.add('src/product.css', 'body > header {padding: 4px}');
    expect(f.check().issues.some(i => i.rule === 'rhythm')).toBe(true);
  });
  it.each(['app/nested/icon.svg/route.ts', 'app/(owned)/nested/favicon.ico/route.ts', 'app/ja/apple-icon-120/route.tsx'])('rejects directory route icon handler %s', file => {
    const f = fixture('next'); f.add(file, 'export function GET() {}');
    expect(f.check().issues.some(i => i.rule === 'icons')).toBe(true);
  });
  it.each(['actions', 'description'])('allows descendant styling in PageHeader %s while rejecting its own props', slot => {
    const f = fixture('next');
    f.add('src/content.tsx', `<PageHeader title="Title" ${slot}={<GuardedLink className="button" style={{display: "flex"}}>Open</GuardedLink>} />`);
    expect(f.check().issues).toEqual([]);
    f.add('src/content.tsx', `<PageHeader ${slot}={<GuardedLink className="button"/>} className="override" />`);
    expect(f.check().issues.some(i => i.rule === 'rhythm')).toBe(true);
  });
  it('ignores unrelated local metadata and non-route metadata exports', () => {
    const f = fixture('next');
    f.add('src/session.ts', 'const metadata = user.user_metadata; export function session() { return metadata; }');
    f.add('src/catalog.ts', 'export const metadata = {icons: []}; localeMetadata({serviceName: "Product"});');
    f.add('app/page.tsx', 'const metadata = user.user_metadata; const sample = "export const metadata = unknown"; export default function Page() { return <div/>; }');
    f.add('app/ui.ts', 'export const metadata = unknown;');
    expect(f.check().issues).toEqual([]);
  });
  it.each([
    'export const metadata = createPageMetadata();',
    'export async function generateMetadata() { return createPageMetadata(); }',
    'export const generateMetadata = async () => createPageMetadata();',
    'export const generateMetadata = createPageMetadata;',
  ])('inspects imported helper metadata: %s', route => {
    const f = fixture('next');
    f.add('app/page.tsx', `import { pageMetadata as createPageMetadata } from "../src/metadata"; ${route}`);
    f.add('src/metadata.ts', 'import {localeMetadata as localized} from "@naeil/ui/naeil-locale/server"; export async function pageMetadata() { return localized({service: "estimate", page: "Page"}); }');
    expect(f.check().issues).toEqual([]);
    f.add('src/metadata.ts', 'export function pageMetadata() { return {icons: {icon: "/wrong.svg"}}; }');
    expect(f.check().issues.some(i => i.rule === 'icons' && !/review-needed/.test(i.message))).toBe(true);
    f.add('src/metadata.ts', 'import {localeMetadata as localized} from "@naeil/ui/naeil-locale/server"; export function pageMetadata() { return localized({service: "estimate", serviceName: "Wrong"}); }');
    expect(f.check().issues.some(i => i.rule === 'titles')).toBe(true);
    rmSync(join(f.root, 'src/metadata.ts'));
    expect(f.check().issues.some(i => /review-needed/.test(i.message))).toBe(true);
  });
  it('follows helper re-exports and ignores unrelated metadata in the helper module', () => {
    const f = fixture('next');
    f.add('app/page.tsx', 'import {pageMetadata} from "../src/metadata"; export const generateMetadata = pageMetadata;');
    f.add('src/metadata.ts', 'export { makeMetadata as pageMetadata } from "./identity"; const metadata = user.user_metadata;');
    f.add('src/identity.ts', 'import {localeMetadata} from "@naeil/ui/naeil-locale/server"; export const makeMetadata = async () => localeMetadata({service: "estimate"});');
    expect(f.check().issues).toEqual([]);
    f.add('src/identity.ts', 'export const makeMetadata = () => ({icons: []});');
    expect(f.check().issues.some(i => i.rule === 'icons')).toBe(true);
  });
  it('resolves default and local callable helper forms without certifying cycles', () => {
    const f = fixture('next');
    f.add('app/page.tsx', 'import make from "../src/metadata"; const wrap = () => make(); export const generateMetadata = () => wrap();');
    f.add('src/metadata.ts', 'import {localeMetadata} from "@naeil/ui/naeil-locale/server"; export default async function metadataForPage() { return localeMetadata({service: "estimate"}); }');
    expect(f.check().issues).toEqual([]);
    f.add('src/metadata.ts', 'export default async function metadataForPage() { return {icons: []}; }');
    expect(f.check().issues.some(i => i.rule === 'icons')).toBe(true);
    f.add('src/metadata.ts', 'const cycle = () => cycle(); export default cycle;');
    expect(f.check().issues.some(i => /review-needed/.test(i.message))).toBe(true);
  });
  it('diagnoses a root icon handler directory instead of attempting to read it as bytes', () => {
    const f = fixture('next'); rmSync(join(f.root, 'app/icon.svg'));
    f.add('app/icon.svg/route.ts', 'export function GET() {}');
    expect(f.check().issues.some(i => i.rule === 'icons' && /directory-based/.test(i.message))).toBe(true);
  });
  it('allows canonical-byte public aliases and unreferenced historical assets, while rejecting different root aliases and declarations', () => {
    const f = fixture('next');
    f.add('public/apple-touch-icon.png', readFileSync(join(f.root, 'app/apple-icon.png')));
    f.add('public/favicon.svg', readFileSync(join(f.root, 'app/icon.svg')));
    f.add('public/brand/naeil/1.0.1/icons/favicon.ico', 'historical bytes');
    f.add('public/brand/naeil/1.0.1/icons/favicon-transparent.png', 'historical transparent bytes');
    expect(f.check().issues).toEqual([]);
    f.add('public/favicon.svg', 'different bytes');
    expect(f.check().issues.some(i => i.rule === 'icons')).toBe(true);
    rmSync(join(f.root, 'public/favicon.svg'));
    f.add('app/page.tsx', 'export const metadata = {icons: {icon: "/brand/naeil/1.0.1/icons/favicon.ico"}};');
    expect(f.check().issues.some(i => i.rule === 'icons')).toBe(true);
    f.add('app/page.tsx', '<link rel="icon" href="/brand/naeil/1.0.1/icons/favicon-transparent.png"/>');
    expect(f.check().issues.some(i => i.rule === 'icons')).toBe(true);
  });
  it.each(['layout', 'page', 'template', 'route'])('checks only exported %s route metadata roots, retaining object/spread bypass coverage', file => {
    const f = fixture('next');
    f.add(`app/(owned)/nested/${file}.tsx`, 'const base = {icons: []}; export const metadata = {...base};');
    expect(f.check().issues.some(i => i.rule === 'icons')).toBe(true);
    f.add(`app/(owned)/nested/${file}.tsx`, 'export const metadata = localeMetadata({service:"estimate"}) && {icons: []};');
    expect(f.check().issues.some(i => i.rule === 'icons')).toBe(true);
  });
  it('finds parent tsconfig paths with --app src for graph and metadata helpers', () => {
    const f = fixture('next');
    mkdirSync(join(f.root, 'src'), {recursive: true}); renameSync(join(f.root, 'app'), join(f.root, 'src/app'));
    f.add('tsconfig.json', '{ "compilerOptions": {"baseUrl": ".", "paths": {"@/*": ["src/*"]}}}');
    f.add('src/app/layout.tsx', 'import "@naeil/ui/globals.css"; import {Shell} from "@/chrome"; export default Shell;');
    f.add('src/chrome.tsx', 'import {NaeilServiceShell} from "@naeil/ui/naeil-shell"; export const Shell = () => <NaeilServiceShell service="estimate" locale="en"/>;');
    f.add('src/app/page.tsx', 'import {pageMetadata} from "@/metadata"; export const generateMetadata = pageMetadata;');
    f.add('src/metadata.ts', 'import {localeMetadata} from "@naeil/ui/naeil-locale/server"; export const pageMetadata = () => localeMetadata({service: "estimate"});');
    const check = () => checkConformance({service: 'estimate', framework: 'next', app: join(f.root, 'src')});
    expect(check().issues).toEqual([]);
    f.add('src/metadata.ts', 'export const pageMetadata = () => ({icons: []});');
    expect(check().issues.some(i => i.rule === 'icons')).toBe(true);
    rmSync(join(f.root, 'src/chrome.tsx'));
    expect(check().issues.some(i => i.rule === 'chrome')).toBe(true);
  });
  it('also checks project-root public icon aliases when --app is src', () => {
    const f = fixture('next'); mkdirSync(join(f.root, 'src'), {recursive:true}); renameSync(join(f.root, 'app'), join(f.root, 'src/app'));
    f.add('tsconfig.json', '{"compilerOptions":{}}');
    const check = () => checkConformance({service:'estimate', framework:'next', app:join(f.root,'src')});
    f.add('public/apple-touch-icon.png', readFileSync(join(f.root, 'src/app/apple-icon.png')));
    expect(check().issues).toEqual([]);
    f.add('public/apple-touch-icon.png', 'noncanonical root alias');
    expect(check().issues.some(i => i.rule === 'icons')).toBe(true);
  });
  it.each(['next', 'vite'] as const)('resolves %s jsconfig baseUrl and paths, including JSONC and relative extends', framework => {
    const f = fixture(framework);
    f.add('config/base.json', '{"compilerOptions": {"baseUrl": "../src", "paths": {"@chrome": ["chrome"]}}}');
    f.add('jsconfig.json', '{ // application config\n "extends": "./config/base.json",\n}');
    const entry = framework === 'next' ? 'app/layout.tsx' : 'src/App.tsx';
    f.add(entry, 'import "@naeil/ui/globals.css"; import {Shell} from "@chrome"; export default Shell;');
    f.add('src/chrome.tsx', 'import {NaeilServiceShell} from "@naeil/ui/naeil-shell"; export const Shell = () => <NaeilServiceShell service="estimate" locale="en"/>;');
    expect(f.check().issues).toEqual([]);
    f.add(entry, 'import "@naeil/ui/globals.css"; import {Shell} from "chrome"; export default Shell;');
    expect(f.check().issues).toEqual([]);
  });
});
