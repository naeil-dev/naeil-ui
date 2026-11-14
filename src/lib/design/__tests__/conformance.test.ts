import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, rmSync, symlinkSync } from "node:fs";
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
  return { root, check, add: (file: string, text: string) => { const path = join(root, file); mkdirSync(join(path, ".."), { recursive: true }); writeFileSync(path, text); } };
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
    const { add, check } = fixture(framework); add("violation.tsx", source);
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
  add("app/page.tsx", 'const data = { icons: [] }; const result = localeMetadata({ page: t("title"), serviceName: "Wrong" });');
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
    ["theme", 'const options = { forcedTheme: "light" };'],
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
it.each(['app/child/icon.svg', 'app/child/icon.tsx', 'app/child/apple-icon.tsx', 'app/child/favicon.ico', 'public/other/icon.png', 'public/favicon.ico'])("rejects duplicate Next icon %s", file => {
  const f = fixture('next'); expect(f.check().issues).toEqual([]); f.add(file, 'duplicate');
  expect(f.check().issues.some(i => i.rule === 'icons' && i.file.endsWith(file))).toBe(true);
});
it("allows opengraph images and rejects public duplicates in Vite", () => {
  const f = fixture('vite'); f.add('public/opengraph-image.png', 'image'); expect(f.check().issues).toEqual([]);
  f.add('public/nested/favicon.svg', 'duplicate'); expect(f.check().issues.some(i => i.rule === 'icons')).toBe(true);
});
it.each([
  ['const iconData = { icons: { icon: "/other.svg" } }; export const metadata = iconData;', 'icons'],
  ['const base = {icons: []}; const more = {...base}; export const metadata = {...more};', 'icons'],
  ['import { info } from "./unknown"; export const metadata = {...info};', 'review-needed'],
  ['export const metadata = getMetadata();', 'review-needed'],
  ['import { localeMetadata as metadataFor } from "@naeil/ui/naeil-locale/server"; const options = {service: "estimate", serviceName: "Wrong"}; metadataFor(options);', 'titles'],
  ['import { localeMetadata as metadataFor } from "@naeil/ui/naeil-locale/server"; metadataFor(unknownOptions);', 'review-needed'],
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
