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
  add("other.tsx", '<Widget value={() => 1 > 0}\n storageKey="custom"/>');
  expect(check().issues).toEqual(expect.arrayContaining([expect.objectContaining({ line: 2, rule: "theme" })]));
  add("other.css", ':where(body) { font-family: Arial; }');
  add("app/page.tsx", 'export const generateMetadata = async () => ({ icons: { icon: "/wrong.svg" } });');
  expect(check().issues.map(issue => issue.rule)).toEqual(expect.arrayContaining(["rhythm", "icons"]));
});
