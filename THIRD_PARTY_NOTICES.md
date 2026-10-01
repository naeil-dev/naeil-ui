# Third-party notices and provenance

Original repository software is MIT licensed. Upstream code and fonts retain their notices. Brand names/logos and assets with unknown provenance are not relicensed by the repository's MIT notice.

## Copied/adapted component code

Setup commit `8e614421eee6a1a3c6b148fe12d5af2b8446abab` explicitly records shadcn/ui and its Button. Commit `2965e3b976002056a1181305ea7b93543cf64f51` adds the eight-family customization (Avatar, Badge, Button, Card, Dialog, DropdownMenu, Input, Sonner). Current `src/components/ui/` files are customized descendants and newer Radix wrappers. No exact upstream registry revision was recorded; this notice does not invent one. Preserve the following shadcn notice when distributing adapted components.

Original license read 2026-10-02: https://github.com/shadcn-ui/ui/blob/main/LICENSE.md. It matches the installed shadcn package notice.

```text
MIT License

Copyright (c) 2023 shadcn

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Fonts

Shared package styles declare families; consumers own font delivery. The website imports Pretendard Variable from `pretendard`; Storybook imports Pretendard static CSS and `@fontsource/noto-sans-jp` 400/500/600. Both installed packages carry SIL Open Font License 1.1. Exact installed notices are preserved in [Pretendard](licenses/Pretendard-OFL.txt) and [Noto Sans JP](licenses/Noto-Sans-JP-OFL.txt). Keep the notice/license when redistributing font files; modified fonts must follow reserved-name rules.

The site's `src/app/layout.tsx` separately requests JetBrains Mono via `next/font/google`; no copied font binary is tracked here. Before redistributing fetched site-build fonts, retain the original license/notice supplied with that font (https://github.com/JetBrains/JetBrainsMono). This audit did not inspect the fetched Google font binary/license and does not certify a deployed site's font-notice bundle. Prototype HTML uses external CDNs separately from packed UI styles.

## Dependencies and references

Radix, Sonner, Lucide, React, Next.js and other npm dependencies carry licenses in their own distributions. They are not newly attributed as copied sources here; preserve their notices if bundling their code. DESIGN.md's Linear analysis is design reference material, not an official Linear specification or a component license. The optional workflow grants no blanket license to 21st catalog code; inspect each retrieved original before adoption.

## Website-only assets: unresolved provenance

`public/images/`, `public/svg/`, and `public/coral-concepts.html` contain brand/hero art. History records additions and normalization (`8252a3e`, `9a15ff0`, `e57c21c`) but does not establish each original artist, generation service, source license or redistribution permission. No such provenance is invented here. `public/next.svg`, `public/vercel.svg` and other starter SVGs entered during Next.js setup; logos remain the respective owners' marks. These assets are outside shared UI requirements and the current npm file allowlist. Establish their rights or replace them before a separate public asset/site redistribution claim. This unresolved site-art audit is not package release approval.
