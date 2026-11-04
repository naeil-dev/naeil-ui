import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../..');
const require=createRequire(import.meta.url);
const {build}=createRequire(require.resolve('tsup'))('esbuild');
const postcss=createRequire(require.resolve('@tailwindcss/postcss'))('postcss');
const tailwind=require('@tailwindcss/postcss');

// Read immutable Git objects into disposable local source. Never repack, edit,
// fetch or execute a published archive, consumer script, live app or service.
export async function frozenHeaderRender(sourceRevision) {
  const directory=realpathSync(mkdtempSync(join(tmpdir(),'frozen-header-')));
  try {
    const archive=execFileSync('git',['archive',sourceRevision,'src','package.json'],{cwd:root,maxBuffer:16*1024*1024});
    execFileSync('tar',['-xf','-','-C',directory],{input:archive});
    symlinkSync(join(root,'node_modules'),join(directory,'node_modules'),'dir');
    const result=await build({absWorkingDir:directory,write:false,bundle:true,format:'iife',platform:'browser',jsx:'automatic',minify:true,
      stdin:{resolveDir:directory,loader:'jsx',contents:`import React from 'react';import{createRoot}from'react-dom/client';import{ThemeProvider}from'next-themes';import{NaeilHeader}from'./src/components/naeil-header';const{locale,theme}=window.fixture;createRoot(document.getElementById('root')).render(<ThemeProvider attribute="class" defaultTheme={theme} enableSystem={false}><NaeilHeader locale={locale}/></ThemeProvider>);`}});
    const globals=join(directory,'src/styles/globals.css');
    const css=await postcss([tailwind({base:directory,optimize:false})]).process(readFileSync(globals,'utf8'),{from:globals});
    return {script:result.outputFiles[0].text,css:css.css};
  } finally {rmSync(directory,{recursive:true,force:true})}
}
