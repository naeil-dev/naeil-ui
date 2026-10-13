# Independent home/blog review — 2026-10-13

Reviewer: frame_metadata worker; this is a review of another worker's implementation, not its own frame/metadata changes. Scope: `/tmp/naeil-home-blog-review.diff`, current home/blog/Markdown source, `home-blog.module.css`, worker report and main integration contract. No implementation edits or repeated test suites were performed. Existing `after-home-light-1440.png` and `after-blog-dark-390.png` were inspected; the home capture shows the incumbent hero only, not the lower project area. Article screenshots were unavailable while the main-reported runtime error was being fixed.

## Actionable findings

1. **P2 — Reading width contradicts the documented outer-width contract.** `home-blog.module.css:203` explicitly sets `.article { box-sizing: content-box; max-width: var(--ui-width-reading); padding-inline:24px }`, giving a 688px outer article at desktop. Shared v2 spec section 2 says the 640px width is the outer maximum, and the migration's reading attribute uses that token as an outer cap. Use border-box with a 640px cap and update the worker report; or retain an explicit product override only if the main documents a concrete accepted exception. Recheck article geometry at desktop and 320/390px after the change. The 896px home/index outer cap is explained as an incumbent product composition and is not a shared-token error.
2. **P2 — Back/language control text remains 14px.** `.textLink` defines 14/22px and `.languages` passes 14/22px to `.languageLink`. The task and DESIGN typography specify labels/controls at 16/25px. Apply body/control token size and line height to `.backLink` and `.languageLink`; the noninteractive language heading/source supporting copy can retain its supporting role. Touch heights already use the 44px token, and source/back link lengths provide adequate widths for existing fixtures.
3. **P2 — New site typography duplicates token-owned numeric foundations.** The module defines role sizes 13/14/16/20/32px and common spacing directly while the repository requires `src/tokens/*.json` to remain the numeric foundation. For represented values consume `--text-xs/sm/base/xl/3xl`, `--leading-normal/relaxed`, weight/spacing variables. Keep explicit purpose-specific composition choices and non-tokenized optical/image measures site-owned; do not edit generated theme CSS. Exact 20/29px and 32/42px heading line heights can remain documented DESIGN composition overrides if no role token expresses them. This makes the website follow future shared foundation updates rather than only matching today's values.

## Known findings already assigned by main

- Blog list called `blogPage.readingTime`, while the key belongs to `blogPost`. The inspected 390px screenshot visibly renders the missing key. Owner has changed the source to postT("readingTime"); fresh production rebuild remains necessary.
- Article route returned 500 with DYNAMIC_SERVER_USAGE in main production smoke. The owner has removed the empty generateStaticParams declaration in the current source and is rechecking a real production article. The source review cannot claim runtime closure.
- MyStack author copy is removed by the inherited remark-html custom-element sanitization. Owner is preserving it without widening unsafe HTML and adding a regression test. Body-copy preservation is required before completion. The raw localized fixture content and both sourceLinks were inspected.

## Positive assessment

The home retains all five project identities, links/statuses/images, hero component and text. It adds an unobtrusive h1, semantic project headings, shared badges, visible focus and restrained reduced-motion-aware interactions. Home/index layout remains independent of the wider application frame. Blog cards contain one native link without nested interactive controls. Dates now include machine-readable values and deterministic UTC formatting; list/article metadata and factual taxonomy are preserved. Article source links retain external destinations, noopener/noreferrer and visible underlines. Language links use locale-aware destinations, lang/hrefLang and aria-current. Markdown styling supplies readable lists/headings, local code/table scrolling, focusable labeled regions, safe label escaping and column scope for the current simple table transformation. JSON-LD escapes `<`. UI labels are localized while content taxonomy remains unchanged.

Status: **changes requested** for the three source findings; production/runtime and MyStack corrections need the main's fresh verification. The review does not substitute for contrast, full viewport/language/theme/browser or assistive-technology checks.

## Inspected current-source hashes

- `src/app/[locale]/(landing)/page.tsx`: `96f6c8832bc71fc9636f7a5e519a606987e13454a2d759ed1ccb67bc147e7d3b`
- `src/app/[locale]/(content)/blog/page.tsx`: `0eb27f84db12b96102e9a58207c281626fec21da4d6d40bf1ceee8ecb97760e5`
- `src/app/[locale]/(content)/blog/[slug]/page.tsx`: `90601b2782f615649b620b811a8139d72ab20fcf7d45500bf31e019d63a319c9`
- `src/components/blog/MarkdownRenderer.tsx`: `f678081c93d143725ec2547da5b1e7ce4a576cc60ba1898eeb2b0d818436a59c`
- `src/app/home-blog.module.css`: `3797be018aa4abc16d1f95d7a988606e5f613cae92fdfae415f11d3fc56e8872`

## Correction re-review

Reviewed the owner's latest source without making home/blog edits. All three requested source corrections are present: `.article` now border-box with token cap640; `.backLink`/`.languageLink` explicitly use base/normal control typography; the module's represented type/weight/spacing values consume existing token variables. Explicit29px/42px heading composition and site-specific asset/grid breakpoint measures remain documented exceptions. Blog index's intro is now an unlabeled div; only its article-list section is a region named by blog-title, addressing the source cause of landmark-unique without hiding a duplicate from axe.

Current corrected module SHA-256 `66847f468cd5039c11bf83aa724d2e8e27ba810e6070f985fd6ea06455634a16`; current corrected blog index SHA-256 `5269754a49d7cc6a54d69352750511506fe553ab32d6000e99d0921df15b93d0` (owner hashes checked against source). Source review findings are closed. Fresh browser geometry/landmark and production runtime checks remain owned by main; prior screenshots predate these fixes and do not prove them.

Callout correction source review: `getPost` now converts MyStack author text into ordinary localized Markdown blockquotes before the same sanitized remark-html pipeline. The new two tests cover real English/Korean author copy and a Japanese fixture with formatted text/list/safe link, rejecting script and javascript URLs. No sanitizer opt-out was introduced; the main-reported content-loss finding is addressed in source, with actual render confirmation still part of main's production checks. Reviewer read these tests but did not rerun them.
