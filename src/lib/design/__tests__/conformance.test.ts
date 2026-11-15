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
describe.each(['next','vite'] as const)('%s static adoption only', framework => {
  it('accepts imported shell usage with account', () => expect(fixture(framework).check().issues).toEqual([]));
  it('fails when the entry no longer imports or uses a shell, even if an unreachable module does', () => {
    const f=fixture(framework);
    f.add(framework==='next'?'app/layout.tsx':'src/App.tsx', 'export default function App(){return <div/>}');
    f.add('unreachable.tsx','import {NaeilServiceShell} from "@naeil/ui/naeil-shell"; <NaeilServiceShell account={account}/>');
    expect(f.check().issues).toEqual([expect.objectContaining({rule:'chrome',message:expect.stringContaining('Import and use')})]);
  });
  it('does not count shell JSX without a package import as adoption', () => {
    const f=fixture(framework), path=framework==='next'?'app/layout.tsx':'src/App.tsx';
    f.add(path,'const NaeilServiceShell=()=><div/>; export default ()=><NaeilServiceShell account={account}/>');
    expect(f.check().issues).toHaveLength(1);
  });
  it.each(['NaeilServiceShell as Shell','* as Chrome'])('fails missing explicit account on %s, including unreachable modules', imported => {
    const f=fixture(framework), name=imported.startsWith('*')?'Chrome.NaeilServiceShell':'Shell';
    f.add('other.tsx',`import ${imported.startsWith('*')?imported:'{'+imported+'}'} from '@naeil/ui/naeil-shell'; <${name} {...props}/>`);
    expect(f.check().issues).toEqual([expect.objectContaining({rule:'chrome',message:expect.stringContaining('account=')})]);
    f.add('other.tsx',`import ${imported.startsWith('*')?imported:'{'+imported+'}'} from '@naeil/ui/naeil-shell'; <${name} account={account}/>`);
    expect(f.check().issues).toEqual([]);
  });
  it('removes the three reproduced false positives and the old presentation rules', () => {
    const f=fixture(framework);
    f.add('extra.tsx', `const sample='document.documentElement.classList.add("light")';
      const NaeilHeader=()=> <div/>; <NaeilHeader/>;
      <CustomThemeProvider storageKey="filters"/>; <main/>; <PageHeader style={custom}/>;`);
    f.add('vite.config.ts', 'export default {plugins:[plugin({base:"/assets/"})]}');
    f.add('styles.css','body{line-height:24px}.naeil-header{color:red}');
    f.add('app/page.tsx','export const generateMetadata=async(params)=>custom(params)');
    expect(f.check().issues).toEqual([]);
  });
  it('reports reviewable next-line account exceptions and invalid ignore configuration', () => {
    const f=fixture(framework);
    f.add('other.tsx', `import {NaeilServiceShell} from '@naeil/ui/naeil-shell';
// naeil-conformance-ignore chrome: Recorded migration exception
<NaeilServiceShell/>;
<NaeilServiceShell/>;`);
    expect(f.check().issues).toEqual([expect.objectContaining({line:4,rule:'chrome'})]);
    expect(f.check().ignores).toEqual([expect.objectContaining({line:2,reason:'Recorded migration exception'})]);
    f.add('other.tsx','// naeil-conformance-ignore unknown: invalid rule');
    expect(f.check().issues).toEqual([expect.objectContaining({rule:'config'})]);
    // Old rule names remain accepted for existing migration comments, but enforce nothing.
    f.add('other.tsx','// naeil-conformance-ignore theme: Legacy reviewed comment');
    expect(f.check().issues).toEqual([]);
  });
  it('excludes comments, dependencies and test output from adoption', () => {
    const f=fixture(framework), entry=framework==='next'?'app/layout.tsx':'src/App.tsx';
    f.add(entry,'// import {NaeilServiceShell} from "@naeil/ui/naeil-shell"; <NaeilServiceShell account={account}/>');
    for(const path of ['node_modules/x/index.tsx','src/App.test.tsx','dist/main.js','e2e/page.tsx']) f.add(path,'import {NaeilServiceShell} from "@naeil/ui/naeil-shell"; <NaeilServiceShell account={account}/>');
    expect(f.check().issues).toHaveLength(1);
  });
  it('returns CLI success/failure and file:line diagnostics', () => {
    const f=fixture(framework);
    const run=()=>spawnSync(process.execPath,['bin/naeil-ui-conformance.mjs','--service','estimate','--framework',framework,'--app',f.root],{encoding:'utf8'});
    expect(run().status).toBe(0);
    f.add('bad.tsx','import {NaeilServiceShell} from "@naeil/ui/naeil-shell"; <NaeilServiceShell/>');
    expect(run().status).toBe(1); expect(run().stderr).toContain('bad.tsx:1 chrome');
  });
});
it('supports installed-bin symlinks and rejects invalid static options', () => {
  const f=fixture('vite'), link=join(f.root,'naeil-ui-conformance');
  symlinkSync(join(process.cwd(),'bin/naeil-ui-conformance.mjs'),link);
  expect(spawnSync(process.execPath,[link,'--help']).status).toBe(0);
  expect(()=>checkConformance({service:'unknown',framework:'vite',app:f.root})).toThrow('--service');
  expect(()=>checkConformance({service:'estimate',framework:'unknown',app:f.root})).toThrow('--framework');
  expect(()=>checkConformance({service:'estimate',framework:'vite',app:join(f.root,'absent')})).toThrow('does not exist');
  expect(readFileSync(join(f.root,'index.html'),'utf8')).toContain('script');
});
