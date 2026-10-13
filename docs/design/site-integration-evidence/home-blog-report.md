# Home and blog implementation

Date: 2026-10-13. Scope: naeil.dev home project area, blog index, article content and application-owned MarkdownRenderer. Implementation follows the main task contract in `../naeil-site-integration-2026-10-13.md`. Dedicated project bodies and `/design` were not edited by this worker. The sunset hero component and its assets were preserved.

## Changes

- Added a visually hidden home h1 containing the canonical service name. Kept the incumbent hero and animal imagery. The project composition now uses shared SectionTitle and Badge, 16px component titles, 14px supporting descriptions and shared 13px badges, semantic project headings, a real ArrowUpRight icon, explicit focus and short color transitions. Project accents consume the existing `--project-*` roles.
- Retained the 896px outer cap of the home and blog index. This is an intentional application composition choice for a sparse project catalog and an editorial list with summaries; 1200px is the shared list default, not a required application width. Navigation/footer framing remains separately owned by the main integration.
- Blog index uses PageTitle, shared neutral badges, 20px article headings, 16px summaries, 13px date/reading metadata and a quiet static incumbent diver illustration. Removed its decorative float and shadow.
- Article has a border-box 640px outer reading cap including its token-owned 24px gutters. Its title is 32/42px semibold; reading text is 16/30px. Reading time is localized from numeric minutes rather than the reading-time library's English string. Translated language links use locale-aware routing, hrefLang/lang and aria-current. Back/source/language controls have at least 44px targets.
- Blog metadata uses the shared `siteMetadata`/`siteUrl` application helper. Article alternates include only available content locales; article JSON-LD uses the localized route and escapes `<` before embedding. The helper and translation dictionaries are owned by the frame/metadata worker.
- MarkdownRenderer is server-renderable. It removes the duplicate leading title when it matches the article title, demotes remaining content h1 headings, gives links persistent underlines and explicit focus, styles paragraphs/lists/headings/code/images/tables without relying on an uninstalled typography plugin, and contains wide code/table overflow locally. Code/table scroll regions are keyboard-focusable and translated; simple table headers receive column scope. Source links preserve their incumbent `_blank` behavior with noopener/noreferrer.
- All changes to page and markdown styling are in `src/app/home-blog.module.css`, separate from package styles and generated tokens.

## Evidence and verification boundary

Source/code inspection used DESIGN.md, the migration guide, the Navigation contract, the current target source and shared Badge/typography source. Main ran Impeccable context once for the task; this worker did not rerun it. The installed polish, distill and craft-floor references were read and their relevant hierarchy, readability, restrained motion and focus procedures were applied within the approved direction. No external design search/tool, asset-generation tool or browser was run by this worker. Main owns the integrated build, browser comparison and frontend-sources record.

`pnpm exec eslint 'src/app/[locale]/(landing)/page.tsx' 'src/app/[locale]/(content)/blog/page.tsx' 'src/app/[locale]/(content)/blog/[slug]/page.tsx' src/components/blog/MarkdownRenderer.tsx` passed after the final edits (exit 0). `git diff --check` passed (exit 0). Source search confirms no transition-all, project lift, tiny text overrides, English library readingTime.text or diver float remain in the owned files.

Integrated type/build validation, actual localized light/dark desktop/mobile rendering, computed contrast, focus/keyboard behavior and overflow are pending the main task's browser evidence. This implementation does not assert those checks passed. A direct getPost smoke check for the incumbent English 2026-03-30 fixture returned hasTitle=true, hasCode=true, hasMyStackTag=false and retainsMyStackCopy=false. The existing remark-html sanitizer removes the custom MyStack block including its text; this inherited content-loss finding remains open. The renderer wrapper support remains available for trusted rendered HTML, but the content pipeline was not widened in this scope.

## Checked file hashes (SHA-256)

- landing/page.tsx: `96f6c8832bc71fc9636f7a5e519a606987e13454a2d759ed1ccb67bc147e7d3b`
- blog/page.tsx: `54c32ae83952ed92f633d0180bd4261ff11bbbe477ad51b3ca3b1b5822bdf18b`
- blog/[slug]/page.tsx: `12ac2a24c4b948abd3a33e1f13d67f15c0b53f90733764af04bd9ebce48487ef`
- MarkdownRenderer.tsx: `f678081c93d143725ec2547da5b1e7ce4a576cc60ba1898eeb2b0d818436a59c`
- home-blog.module.css: `3797be018aa4abc16d1f95d7a988606e5f613cae92fdfae415f11d3fc56e8872`

Repository reference workflow read: `skills/frontend-reference-workflow/SKILL.md`, revision 2026-10-02.1, SHA-256 `ecada9f24d5ebbce5ac207d5225200ca2d76d08ea9f9f1d3b46d4e956a17d7b8`. Installed `/Users/jaymini/.agents/skills/impeccable/SKILL.md`, version 4.4.0, SHA-256 `6eeec6ef2028388a17de9f17a56c9cb7dbc7c8e7e1a8c15b831b0ba3e42168ac`. Read references: polish `81666fc7f783b4e3514db6554e713dc0479bd9cdedb06e93d15f8b579aae869a`; distill `ea8432c90c30ecb0426662a681ead5c0941113079704e1a766cda09e85b15b4f`; craft-floor `e802e4f7bdc89050a9c0f2ca506e1d493a2316e6e810c0336c57aa073717ef3e`.

## Production-preview fixes

Main's actual production preview found the blog index calling readingTime in the wrong namespace and an article static-generation request-context failure. Corrected the index to call blogPost.readingTime and removed the article's empty generateStaticParams so request-time rendering can access the root/auth request context. Main owns the rebuild and production recheck.

The inherited MyStack content loss is now addressed in src/lib/blog.ts: custom callouts are converted to ordinary localized Markdown blockquotes before the existing sanitized remark-html pipeline. Raw HTML remains sanitized. A real incumbent English/Korean post test confirms callout text preservation; a fixture verifies strong/list/link Markdown plus Japanese label while rejecting script markup and javascript URLs. pnpm exec vitest run src/lib/blog.test.ts passed 2 tests, and scoped ESLint including blog.ts/blog.test.ts passed. This supersedes the unresolved MyStack statement above; final file hashes will be captured by main after production verification.

## Independent review and actual axe corrections

Addressed the three source review findings together: the article now uses border-box outer max640, back/language controls use the shared 16px/normal line-height tokens, and represented type/weight/spacing values in the site module consume existing foundation variables. Exact heading line heights 29px/42px remain explicit DESIGN composition values; asset measures, sparse896px index composition and content-responsive breakpoints remain site-owned. Actual axe found duplicate named regions on blog index; intro is now a neutral div and only the article-list section carries blog-title labeling.

Workflow provenance correction: repository entrypoint is revision2026-10-02.1 with the recorded ecada9 hash; installed entrypoint was read at revision2026-10-05.1. These are distinct files.

After this review correction wave, scoped ESLint (including blog library/test) and git diff --check pass. Checked module hash `66847f468cd5039c11bf83aa724d2e8e27ba810e6070f985fd6ea06455634a16`; blog index hash `5269754a49d7cc6a54d69352750511506fe553ab32d6000e99d0921df15b93d0`. Earlier hashes describe prior implementation and are superseded for these files. Main owns fresh rendered outer-width/control/landmark confirmation.
Installed workflow `/Users/jaymini/.agents/skills/frontend-reference-workflow/SKILL.md` (2026-10-05.1) SHA-256: `0fff5fb30befa108e21e04ecad045fa8524f34692454a96445bfe32690ddc1b5`.
