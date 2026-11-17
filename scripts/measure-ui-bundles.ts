/** Compare packed archives with: pnpm exec tsx scripts/measure-ui-bundles.ts archive.tgz output-dir
 * Separate production builds prevent other probe pages contaminating shared chunks.
 * Reports all initial page JS (including framework runtime), CSS separately; gzip level 9,
 * each unique asset once. No source aliases, optimizePackageImports or externals.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { gzipSync } from "node:zlib";

const archive = resolve(process.argv[2]);
const out = resolve(process.argv[3]);
assert(existsSync(archive), "Supply a packed archive and output directory");
mkdirSync(out, {recursive:true});
const scenarios = {
  button: 'import {Button} from "@naeil/ui/ui"; export default function Probe(){return <Button>Probe</Button>}',
  dialog: 'import {Button,Dialog,DialogTrigger,DialogContent,DialogTitle} from "@naeil/ui/ui"; export default function Probe(){return <Dialog><DialogTrigger asChild><Button>Open</Button></DialogTrigger><DialogContent><DialogTitle>Probe</DialogTitle></DialogContent></Dialog>}',
  shell: 'import {Button,Dialog,DialogTrigger,DialogContent,DialogTitle} from "@naeil/ui/ui"; import {NaeilServiceShell,PageHeader} from "@naeil/ui/naeil-shell"; export default function Probe(){return <NaeilServiceShell service="home" locale="en" account={{status:"signed-out",loginHref:"/login"}}><PageHeader title="Probe"/><Dialog><DialogTrigger asChild><Button>Open</Button></DialogTrigger><DialogContent><DialogTitle>Probe</DialogTitle></DialogContent></Dialog></NaeilServiceShell>}',
};
const results: object[] = [];
const env = {...process.env, NEXT_TELEMETRY_DISABLED:"1"};
function run(cwd:string, command:string, args:string[], log:string) {
  try { writeFileSync(join(out, log), execFileSync(command,args,{cwd,env,encoding:"utf8",stdio:["ignore","pipe","pipe"]})); }
  catch(error) { const failure = error as {stdout?:string;stderr?:string}; writeFileSync(join(out,log), `${failure.stdout}\n${failure.stderr}`); throw error; }
}
for (const framework of ["vite", "next"] as const) {
  const cwd = join(out,framework);
  mkdirSync(cwd,{recursive:true});
  const source = framework === "vite" ? "examples/react" : "scripts/fixtures/next";
  const pkg = JSON.parse(readFileSync(join(source,"package.json"),"utf8"));
  pkg.dependencies["@naeil/ui"] = `file:${archive}`;
  // Match the maintained repository's installed lock baseline instead of letting
  // today's ^ ranges silently change React/Radix between the two archives.
  const version = (name:string) => JSON.parse(readFileSync(join("node_modules",name,"package.json"),"utf8")).version;
  for(const name of ["react","react-dom"]) pkg.dependencies[name] = version(name);
  const runtime = Object.keys(JSON.parse(readFileSync("package.json","utf8")).dependencies);
  pkg.overrides = Object.fromEntries([...runtime,"react","react-dom"].map(name=>[name,version(name)]));
  writeFileSync(join(cwd,"package.json"),JSON.stringify(pkg,null,2));
  // Retain the generated lock as part of the receipt, use exact same lock for a rerun.
  run(cwd,"npm",["install","--ignore-scripts","--no-audit","--no-fund"],`${framework}-install.log`);
  writeFileSync(join(cwd,"globals.css"),'@import "tailwindcss"; @import "@naeil/ui/theme.css"; @import "@naeil/ui/components.css"; @source "./node_modules/@naeil/ui/dist";');
  if(framework === "next") {
    cpSync(join(source,"tsconfig.json"),join(cwd,"tsconfig.json"));
    mkdirSync(join(cwd,"app"),{recursive:true});

    writeFileSync(join(cwd,"next.config.mjs"),'export default {poweredByHeader:false};');
    writeFileSync(join(cwd,"postcss.config.mjs"),'export default {plugins:{"@tailwindcss/postcss":{}}};');
  } else {
    writeFileSync(join(cwd,"vite.config.mjs"),'import {defineConfig} from "vite"; import tailwindcss from "@tailwindcss/vite"; export default defineConfig({plugins:[tailwindcss()]});');
    writeFileSync(join(cwd,"index.html"),'<!doctype html><html><head></head><body><div id="root"></div><script type="module" src="/main.tsx"></script></body></html>');
  }
  for(const [scenario,code] of Object.entries(scenarios)) {
    if(framework === "next") {
      writeFileSync(join(cwd,"app/layout.tsx"),`import "../globals.css"; import "@naeil/ui/fonts.css"; import {NaeilThemeScript} from "@naeil/ui/theme-bootstrap"; ${scenario === "shell" ? 'import {NaeilThemeProvider} from "@naeil/ui/naeil-shell";' : ''} export default function Layout({children}:{children:React.ReactNode}){return <html lang="en" suppressHydrationWarning><head><NaeilThemeScript/></head><body>${scenario === "shell" ? '<NaeilThemeProvider>{children}</NaeilThemeProvider>' : '{children}'}</body></html>}`);
      writeFileSync(join(cwd,"app/page.tsx"),`"use client";\n${code}`);
    }
    else {
      writeFileSync(join(cwd,"probe.tsx"),`import React from "react";\n${code}`);
      writeFileSync(join(cwd,"main.tsx"),`import React from "react"; import {createRoot} from "react-dom/client"; import "./globals.css"; import "@naeil/ui/fonts.css"; ${scenario === "shell" ? 'import {NaeilThemeProvider} from "@naeil/ui/naeil-shell";' : ''} import Probe from "./probe"; createRoot(document.getElementById("root")!).render(${scenario === "shell" ? '<NaeilThemeProvider><Probe/></NaeilThemeProvider>' : '<Probe/>'});`);
    }
    for(const compiler of framework === "next" ? ["webpack","turbopack"] : ["vite"]) {
      rmSync(join(cwd,framework === "next" ? ".next" : "dist"),{recursive:true,force:true});
      run(cwd,"npm",framework === "next" ? ["run",compiler === "webpack" ? "build" : "build:turbopack"] : ["exec","vite","build"],`${compiler}-${scenario}.log`);
      const html = readFileSync(join(cwd,framework === "next" ? ".next/server/app/index.html" : "dist/index.html"),"utf8");
      const urls = [...new Set([...html.matchAll(/(?:src|href)="([^"?#]+\.(?:js|css))(?:\?[^"#]*)?"/g)].map(m=>m[1]))];
      const files = urls.map(url=>{
        const file = framework === "next" ? join(cwd,".next",url.replace(/^\/_next\//,"")) : join(cwd,"dist",url.replace(/^\//,""));
        const bytes = readFileSync(file);
        return {url,raw:bytes.length,gzip:gzipSync(bytes,{level:9}).length,sha256:createHash("sha256").update(bytes).digest("hex")};
      });
      assert(files.some(f=>f.url.endsWith(".js")),"Missing page JS");
      const sum = (ext:string,key:"raw"|"gzip")=>files.filter(f=>f.url.endsWith(ext)).reduce((n,f)=>n+f[key],0);
      const result = {compiler,scenario,js:{raw:sum(".js","raw"),gzip:sum(".js","gzip")},css:{raw:sum(".css","raw"),gzip:sum(".css","gzip")},files};
      results.push(result); console.log(JSON.stringify(result));
      writeFileSync(join(out,`${compiler}-${scenario}.html`),html);
    }
  }
}
writeFileSync(join(out,"results.json"),JSON.stringify({archive,sha256:createHash("sha256").update(readFileSync(archive)).digest("hex"),node:process.version,gzipLevel:9,results},null,2));
