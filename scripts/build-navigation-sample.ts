import { createRequire } from "node:module";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { installedNotice } from "./bundled-notices";

// Repackage the actual reviewed stories/components, without a second UI implementation.
const require = createRequire(import.meta.url);
const { build } = createRequire(require.resolve("tsup"))("esbuild");
const postcss = createRequire(require.resolve("@tailwindcss/postcss"))(
  "postcss",
);
const tailwind = require("@tailwindcss/postcss");
const projectIcons = Object.fromEntries(
  Object.entries({
    collector: "coral",
    pkm: "jellyfish",
    design: "whale",
    sa: "fish",
    baby: "turtle",
  }).map(([id, file]) => [
    id,
    `data:image/png;base64,${readFileSync(`public/images/${file}.png`).toString("base64")}`,
  ]),
);
const result = await build({
  stdin: {
    contents: `
      import React, { useEffect, useRef } from 'react';
      import { createRoot } from 'react-dom/client';
      import { ThemeProvider, useTheme } from 'next-themes';
      import { NavigationExample } from './src/components/ui/navigation.stories';
      const mode = document.documentElement.dataset.example;
      const initialTheme = document.documentElement.dataset.initialTheme;
      const projectIcons = ${JSON.stringify(projectIcons)};
      function ThemeBridge() {
        const { setTheme, resolvedTheme } = useTheme();
        const initialized = useRef(false);
        useEffect(() => {
          if (!initialized.current) { initialized.current = true; setTheme(initialTheme); }
          const receive = event => {
            if (event.source === parent && event.data?.type === 'sample-theme') setTheme(event.data.theme);
          };
          addEventListener('message', receive);
          return () => removeEventListener('message', receive);
        }, [setTheme]);
        useEffect(() => { if (resolvedTheme) parent.postMessage({type:'sample-theme-change',theme:resolvedTheme},'*'); }, [resolvedTheme]);
        return null;
      }
      createRoot(document.getElementById('root')).render(
        <ThemeProvider attribute="class" defaultTheme={initialTheme} enableSystem={false} storageKey="naeil-navigation-sample-theme">
          <ThemeBridge /><NavigationExample home={mode !== 'website'} long={mode === 'long'} projectIcons={projectIcons} />
        </ThemeProvider>
      );
    `,
    loader: "tsx",
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  minify: true,
  format: "iife",
  platform: "browser",
  define: { "process.env.NODE_ENV": '"production"' },
  metafile: true,
});
const compiled = await postcss([tailwind()]).process(
  `
  @import "tailwindcss" source(none);
  @source "../src";
  @import "../src/styles/theme.css";
  @import "../src/styles/components.css";
  @custom-variant dark (&:is(.dark *));
  @layer base {
    * { @apply border-border; }
    body { @apply bg-background text-foreground font-sans text-base leading-normal antialiased; }
  }
`,
  { from: resolve("scripts/navigation-sample.css") },
);
const font = readFileSync(
  "node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2",
).toString("base64");
const css = `@font-face{font-family:Pretendard;font-style:normal;font-weight:100 900;font-display:swap;src:url(data:font/woff2;base64,${font}) format('woff2')}\n${compiled.css}`;
const roots = new Set<string>();
for (const file of Object.keys(result.metafile.inputs)) {
  if (!file.includes("node_modules/")) continue;
  let directory = dirname(resolve(file));
  while (directory !== dirname(directory)) {
    if (existsSync(resolve(directory, "package.json"))) {
      const pkg = JSON.parse(
        readFileSync(resolve(directory, "package.json"), "utf8"),
      );
      if (pkg.name) {
        roots.add(directory);
        break;
      }
    }
    directory = dirname(directory);
  }
}
const notices = [...roots].map(installedNotice);
const payload = JSON.stringify({
  js: result.outputFiles[0].text,
  css,
}).replaceAll("<", "\\u003c");
const licenseText = [
  readFileSync("LICENSE", "utf8"),
  readFileSync("licenses/Pretendard-OFL.txt", "utf8"),
  readFileSync("licenses/Lato-OFL.txt", "utf8"),
  ...notices.map(
    (pkg) =>
      `${pkg.name}@${pkg.version}\n${pkg.notices.map((notice) => notice.text).join("\n")}`,
  ),
].join("\n\n");
const escape = (text: string) =>
  text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const html = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>naeil · Navigation & Footer 샘플</title>
<style>
@font-face{font-family:Pretendard;font-style:normal;font-weight:100 900;font-display:swap;src:url(data:font/woff2;base64,${font}) format('woff2')}
*{box-sizing:border-box}body{margin:0;background:#f0f1f3;color:#23252b;font:16px/1.55 Pretendard,sans-serif}button,select{font:inherit}header{padding:24px 32px;background:#fff;border-bottom:1px solid #d8dbe2}h1{font-size:24px;margin:0 0 4px;font-weight:600}p{margin:0;color:#60636d}form{display:flex;align-items:end;flex-wrap:wrap;gap:16px;margin-top:20px}label{display:grid;gap:4px;font-size:14px}select,button{min-height:44px;padding:8px 12px;border:1px solid #7f8591;border-radius:8px;background:#fff;color:#23252b}label select{min-width:0;width:100%}button{cursor:pointer}button:focus-visible,select:focus-visible{outline:2px solid #555d70;outline-offset:3px}.stage{padding:24px;overflow:auto}iframe{display:block;margin:0 auto;background:#f7f8fa;border:1px solid #d8dbe2;min-height:760px;width:100%;max-width:100%;border-radius:8px}details{padding:16px 32px;font-size:14px}pre{white-space:pre-wrap;font-size:12px;max-height:320px;overflow:auto}#hint{font-size:14px;margin-top:12px}@media(max-width:600px){header{padding:20px}h1{font-size:20px}.stage{padding:12px}form{gap:12px}label{flex:1;min-width:120px}iframe{min-height:780px}}
</style></head><body>
<header><h1>Navigation & Footer</h1><p>지금 만든 공통 컴포넌트를 직접 눌러보는 샘플입니다. Naeil Home 운영 화면에는 아직 적용되지 않았습니다.</p>
<form onsubmit="return false">
<label>구성<select id="example"><option value="website">웹사이트형 · 프로젝트 2열</option><option value="home">Naeil Home형 · 기능 1열</option><option value="long">긴 메뉴 이름</option></select></label>
<label>화면 폭<select id="width"><option value="full">현재 화면</option><option value="390">모바일 · 390px</option><option value="320">작은 모바일 · 320px</option><option value="1440">데스크톱 · 1440px</option></select></label>
<label>테마<select id="theme"><option value="light">밝게</option><option value="dark">어둡게</option></select></label>
<button type="button" id="reset">처음으로</button></form>
<p id="hint">프로젝트 또는 AI 메뉴를 눌러 비교해보세요. 모바일에서는 오른쪽 메뉴 버튼으로 열 수 있습니다.</p></header>
<main class="stage"><iframe id="preview" title="공통 네비게이션과 푸터 작동 예시"></iframe></main>
<details><summary>포함된 오픈소스 라이선스</summary><pre>${escape(licenseText)}</pre></details>
<script type="application/json" id="bundle">${payload}</script>
<script>
const payload=JSON.parse(document.getElementById('bundle').textContent);
const preview=document.getElementById('preview');
const example=document.getElementById('example');
const theme=document.getElementById('theme');
function render(){
  const js=payload.js.replace(/<\\/script/gi,'<\\\\/script');
  preview.srcdoc='<!doctype html><html lang="ko" class="'+theme.value+'" data-example="'+example.value+'" data-initial-theme="'+theme.value+'"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+payload.css+'</style></head><body><div id="root"></div><script>'+js+'<'+ '/script></body></html>';
}
example.addEventListener('change',render);
theme.addEventListener('change',()=>{preview.contentWindow.postMessage({type:'sample-theme',theme:theme.value},'*')});
addEventListener('message',event=>{if(event.source===preview.contentWindow && event.data?.type==='sample-theme-change' && ['light','dark'].includes(event.data.theme)) theme.value=event.data.theme});
document.getElementById('width').addEventListener('change',event=>{preview.style.width=event.target.value==='full'?'100%':event.target.value+'px'});
document.getElementById('reset').addEventListener('click',render);
render();
</script></body></html>`;
const destination = "docs/design/navigation-footer-sample.html";
writeFileSync(destination, html);
console.log(
  `${destination}: ${(Buffer.byteLength(html) / 1024 / 1024).toFixed(1)} MB; self-contained React/CSS/font + ${notices.length} package notices`,
);
