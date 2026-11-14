# Changelog

## 0.15.0 — shared page rhythm and owned-service shell (Unreleased candidate)

- Tokens `ui.page-top` 48px, `ui.page-title-gap` 12px, `ui.page-header-gap` 32px, `ui.page-bottom` 96px (values from naeil.dev).
- `.ui-app-main` (fixed-header clearance + page top/bottom spacing), `.ui-page-header`, `.ui-page-description`, `.ui-page-header-actions`.
- `PageHeader` (`title`, `description`, `actions`, `titleId`) from `@naeil/ui` and `@naeil/ui/components/typography`.
- DESIGN.md "Page rhythm": dark theme default everywhere (as naeil.dev), 16px base text, naeil.dev favicon declarations, no per-page vertical padding.
- naeil.dev content pages use `.ui-app-frame .ui-app-main` (shared gutters instead of their own 24px side padding) and the shared header spacing (title 1px lower, projects description 16px instead of 18px).

- New React-only `@naeil/ui/naeil-shell`: strict `NaeilServiceShell`, `NaeilThemeProvider`, `PageHeader`, service/title helpers and `naeilIcons`. Provider-backed shell/theme/PageHeader exports from `/naeil-locale/chrome` reuse the selected messages. Unknown services throw; forbidden root/nested overrides (including spreads) are type-rejected and runtime casts are ignored with development warnings once per prop.
- Shell owns localized skip-to-main, canonical service header, focusable `main#main`, shared gutters/page rhythm and full footer; common Link/guard preserve consumer routing. Footer options are only meta/resolveHref or recorded `false` screens. Add `naeil.shell.skipToContent` in ko/ja/en and shared focus-visible skip-link styles.
- Fixed dark-default `NaeilThemeProvider` accepts children only; naeil.dev replaces its local configurable provider with it. next-themes attribute/class, theme storage, system support and transition behavior remain consistent.
- Generated server-safe `naeilIcons` from `/naeil-locale`: brand 1.1.1, exact root-file SHA-256 and ICO/SVG/apple link declarations. `build:brand` generates and `check:brand` verifies both library and CLI data from immutable kit bytes; the kit stays outside npm.
- Dependency-free Node ESM `naeil-ui-conformance` bin ships with the package. CI rejects divergent theme providers/props, direct header/footer use, frame/page/chrome CSS or base-font overrides, icon bytes/declarations and service-title overrides; line-scoped reviewed ignores are all reported. Next/Vite passing/failing fixtures cover every rule.
- Packed checks cover the standalone entry, React SSR, provider-backed Next RSC and standalone Next SSR (webpack/Turbopack), server-safe icon/title imports and installed CLI execution. Four shell Storybook stories and a browser contract cover all services at 1440/390, ko/ja/en, fresh dark under OS light/dark, skip focus, persisted theme, account action and footer=false. Frozen B1 chrome-pairs are unchanged.
- DESIGN/agent rules, shell API/CI guide, application starter and migration guidance now require using the shared shell/policy instead of reconstructing them. The stale 0.15.0 archive was withdrawn for a later re-freeze; package version stays 0.15.0. No publication/tag/workflow/deployment is part of this implementation.

Additive: existing classes, `PageTitle` and tokens are unchanged.

## 0.14.0 — owned-service identity and footer (published 2026-11-13)

Published to `latest` through protected trusted publishing; registry bytes verified on 2026-11-13. See [publication and service adoption receipts](docs/package-release.md#publication-receipts); frozen preparation files remain unchanged.

Implements the 2026-11-13 owner decision: owned-service tab titles `Page — .naeil <service>`, one shared `.naeil` favicon, and one shared full footer. Additive; omitting the new options keeps existing output, including B1 chrome comparisons.

- Identity: `naeilServiceName(service?)` and `naeilDocumentTitle(service?, page?)` from server-safe `/naeil-locale`, plus client entries `/naeil-header` and `/naeil-locale/chrome`. `localeMetadata` derives the service name from the service id when `serviceName` is omitted; `serviceName` is deprecated and still honored when passed.
- Footer: `NaeilFooter` accepts `service` (`NaeilServiceFooterProps`): always `full`, `.naeil` brand only, and only `locale`/`resolveHref`/`Link`/`onNavigate`/`meta`. Other props are rejected by type and ignored at runtime with development-only warnings. Invalid runtime ids fall back to the legacy profile.
- Locale error documents: title `<message> — .naeil <service>` (`.naeil` for main) and `<link rel="icon" href="/icon.svg">` for every service (previously `abstorm`/`Jev`/`AB Estimate` names and per-service icons).
- Docs: DESIGN.md Browser identity, migration guide favicon mapping (brand kit 1.1.1 → Next `app/favicon.ico`, `app/icon.svg`, `app/apple-icon.png`), footer/header/locale/application-layout guides.

Compatibility: no public export is removed. Services that keep passing `serviceName` keep their current titles until they remove it; owned services remove it in their adoption PRs. Error-document titles and icon links change for every locale service: serve the brand-kit `/icon.svg` before deploying 0.14.0 (Estimate previously served only `/favicon.svg`; AB Storm and Jev served none). Owned services adopt 0.14.0 through their identity PRs, not a bare dependency bump.

## 0.13.1 — publication and auto-update policy (published 2026-11-13 JST)

Published to `latest` through protected trusted publishing; registry bytes verified on 2026-11-13 JST. See [publication receipts](docs/package-release.md#publication-receipts); the frozen preparation receipt remains unchanged. The preparation notes below retain their original scope. Docs-only patch to exercise the protected npm publishing workflow and the services' auto-update flow. Since frozen 0.13.0 source `08ee159`, the only package-shipped change on main is `docs/package-release.md` from #50: same-major consumer updates, a new major for public API/header-contract breaks (including 1.0.0 for a header break while on 0.x), and protected exact-archive publication guidance.

- Component code, public APIs, header markup/geometry, styles, dependencies and chrome contract 1 are unchanged.
- Package metadata, generated `/release`, React/Next fixture versions and maintained guidance move to 0.13.1. The owner approved publication directly to `latest` for Dependabot visibility; `next` stays 0.13.0 unless separately moved. Publication, environment approval, source tag/Release and manual service deployments remain separate actions.

## 0.13.0 — design-system audit fixes and owned-service headers (published 2026-11-12)

Published to `next` on 2026-11-12; registry bytes matched the frozen archive on 2026-11-13 JST. The preparation notes below retain their original scope. Includes PR #47 (design-system audit fixes, based on the 2026-11-12 audit b17a015) and PR #48 (owned-service header profiles). Public imports, exports, types and consumer `className` overrides are preserved; changed defaults are listed under compatibility.

- Header: add opt-in `service`, `NaeilService`, `NaeilServiceHeaderProps` and readonly `naeilServices` through standalone/provider chrome entries. The DS owns lowercase service branding, product-only tabs and canonical toolbar; toolbar-only mobile sheets omit empty navigation and restore visible toolbar focus on desktop crossing. Generic Navigation exposes opt-in `omitEmptyNavigation` (default false preserves B1). Keep `NaeilHeaderProps` as the extensible legacy interface; service-first/legacy-last component overloads preserve inferred legacy props. Invalid runtime service ids fall back to the legacy profile with a development-only warning; the warning guard tolerates absent `process`. Add four service stories and matching browser contracts.
- Locale runtime: protocol-hook request-header deletions and replacements are preserved instead of restoring incoming headers (security hardening). Literal backslashes in query/fragment no longer invalidate a registered route (path backslashes still 404). A late commit after a transition timeout clears the error, `retry()` replays the latest failed request and clears an already-satisfied one. Encoded spellings of every reserved protocol segment, including service `protocolPrefixes`, are rejected. `/favicon.svg` passes as a public file; the matcher/public-file contract is documented.
- `@naeil/ui/utils` is safe to call from React Server Components. `buttonVariants`/`badgeVariants` stay on the client `/ui` barrel; call them on the server through `@naeil/ui/components/ui/button` and `/badge`. Packed Next consumers are now built with both webpack and Turbopack, including a Server Component page.
- `Button` with `aria-pressed="true"` shows a token-based pressed indicator in every variant.
- `DialogContent` caps its height to the viewport and scrolls; Toaster dismiss and action controls get 44px hit areas; Toaster follows a forced next-themes theme.
- `dark:` utilities follow the same OS-dark / `.dark` / root `.light` conditions as the theme tokens.
- Typography roles carry the DESIGN.md line heights through generated `--text-*--line-height` tokens. The contrast gate checks rendered opacity/state combinations (98 pairs), and the token test compares generated CSS with the committed file without rewriting it.
- Docs: README and guides no longer pin stale release states; Storybook guide links follow the built version tag; the `/naeil-locale` runtime is linked from entry docs and agent guidance; production login topology was removed from the shipped application-layout guide.
- Removed: the unused `tw-animate-css` runtime dependency and its `globals.css` import (kept as a devDependency only so frozen 0.7.x rollout fixtures still render); unreachable site components (hero scene, cursor, accent picker, site controls) with their three.js devDependencies; dead `src/lib/axe.ts`, `src/types/i18n.d.ts`, unused one-off scripts and `.prettierrc`. The npm package ships only the license notices the package needs (178 → 172 files).
- CI: `forbidOnly` on CI, no reuse of a stale local Storybook server, and 40-minute browser/package job limits.
- Release preparation: package metadata, generated `/release` and clean React/Next fixture versions move to 0.13.0. Publish only the reviewed frozen archive to `next`; preserve `latest=0.12.0` unless separately approved. Chrome contract 1 is unchanged: service profiles are opt-in and legacy header output is preserved. Publication, tag/Release, hosted Docs and consumer adoption remain separate maintainer actions.

Compatibility:
- Omitting `service` preserves legacy header output and overrides. `statusSlot`, `brandSuffix`, `brandSlot`, `toolbarSlot`, `subNav` and `brandLinkComponent` are deprecated for owned services, retained for compatibility. The opt-in service branch rejects brand/catalog/style escape hatches and ignores cast/JavaScript attempts with development-only warnings once per prop; root chrome markers are protected.
- Visual defaults changed: pressed Buttons; generated line heights for every type size used by the roles (`text-xs` 13/20, `text-sm` 14/22, `text-base` 16/25, `text-xl` 20/29, `text-3xl` 32/42), which also applies to consumer text without an explicit `leading-*` (explicit `leading-*` still wins); Card/Dialog/Page titles follow those roles; `DialogContent` caps its height and scrolls, so its close button scrolls with the content and non-portaled popups inside a dialog are clipped (portaled Radix popups are not); `dark:` utilities under OS dark without a theme class. Opt-outs are in the component guides.
- Apps that used tw-animate-css utilities (`animate-in`, `fade-in`, ...) only through `@naeil/ui/globals.css` must add `tw-animate-css` themselves. No owned service does (checked AB Storm, Estimate, Home, Persona, Jev).
- Package-internal Storybook tooling notices are no longer in the npm archive; they stay in the repository and the Docs preview.

## 0.12.0 — shared UI refinements and Sheet (published 2026-11-10)

Published to npm with dist-tag `next` on 2026-11-10 and promoted to `latest` on 2026-11-11. Frozen source/tag `v0.12.0`: `e03af076b725d742c4b319aca5ebb2379e2f0258`; archive SHA-256 `7f5f01407c576e3c5fa956cf76ebfb3a8ef59b58619de99da68351974aca721b` (178 files). See the [receipt](https://github.com/naeil-dev/naeil-ui/blob/main/docs/releases/0.12.0/README.md). The publication plan below is the preparation-time record.

- Add public `Sheet` primitives through `@naeil/ui/ui` and `@naeil/ui/components/ui/sheet`, using the existing Radix dialog behavior.
- Add optional `closeLabel` to `DialogContent` and `DialogFooter`; existing English defaults remain unchanged.
- Clarify error feedback versus destructive actions and test the documented error contrast. Application starters use NaeilFooter's default `full` variant; compact footer link groups align to the top unless the consumer supplies an `items-*` container override.
- Add `ui.width-workflow` (896px) and `data-ui-layout="workflow"` for workflow content within the existing application frame. Retain the locale service registration proposal as documentation only.
- Additive minor API candidate from PR #42 (`0d1cb08`) and PR #43 (`047de96`). Publish the frozen archive to `next`, preserve `latest` (0.7.2) unless separately approved, and tag the frozen source as `v0.12.0`. Promotion of 0.11.0 remains a separate owner action; publication, consumer adoption and hosted Docs are separate.

## 0.11.0 — AB Storm locale registration (published 2026-11-08)

Published to npm with dist-tag `next` on 2026-11-08 and promoted to `latest` on 2026-11-11 before 0.12.0. See the [receipt](https://github.com/naeil-dev/naeil-ui/blob/main/docs/releases/0.11.0/README.md).

- Add the exact owned `abstorm` origin and five protected UI routes to the opt-in locale runtime, with English, Korean and Japanese paths. Keep auth/API/health endpoints outside localized UI routing.
- Render localized fail-closed documents with the app’s `abstorm` identity; no favicon is declared by the current app.
- Fix generated locale declarations: JSON imports previously left variable initializers in `.d.ts` output and failed installed-consumer TypeScript checks with library checking enabled. Normalize only those declarations to ambient JSON types; runtime imports and message loading remain unchanged. Clean packed-consumer tests now import the locale API and run `tsc` without `skipLibCheck`.
- Additive public API release; existing services, default chrome/footer catalogs, messages and chrome contract 1 remain unchanged. Publish the reviewed exact archive to `next`; package publication and consumer adoption remain separate.

## 0.10.0 — shared language runtime (published 2026-11-04)

Published to npm with dist-tag `next` on 2026-11-04 (`latest` then remained 0.7.2). Source/tag `455f2f9aedb108606af2f429c18281260eafd2dd`; archive SHA-256 `a4a1e312f2f608358a10f9019c248af37a8172bb116d3bc506144442cb963fb4` (175 files).

- Add opt-in `naeil-locale` root, client, server, messages, checker and chrome entries for the owned Next applications. English uses unprefixed paths; Korean/Japanese use `/ko` and `/ja`. Strict route/protocol parsing, legacy receiving aliases, selected JSON loading, ICU validation and committed-intent preference writes share one implementation.
- Keep the transition controller above locale layouts, restore stable focus, and share document-departure protection. Consumers retain business/session state, data authorization and logical-navigation guards.
- Move canonical header/footer/account copy to one JSON source. Existing React-only imports keep standalone locale props and public overrides; the opt-in chrome entry uses the selected provider dictionary. Generic Navigation/SiteFooter and legacy Nav/Footer routing APIs remain unchanged.
- Validate all three Next consumers with exact next-intl4.14.8. Publication, receiver deployment, cross-service sending and hosted Docs have separate receipts; see [the integration guide](docs/components/naeil-locale.md).

## 0.9.0 — page-root scrollbar reservation

- Reserve one classic scrollbar gutter at the document root through both package CSS paths; overlay scrollbars reserve no space. The root `data-naeil-scrollbar-gutter="auto"` opt-out disables reservation and shared lock correction together.
- Remove duplicate Radix body margin/gap compensation under the reserved root without changing scroll prevention, modal focus or cleanup. Preserve all frame, typography and spacing tokens.
- Document the existing Japanese 320px classic signed-out login toolbar wrap, repair comparison capture ordering and verify real clean React/Next CSS consumers against frozen 0.8.0. See the [adopted acceptance contract](https://github.com/naeil-dev/naeil-ui/blob/434b7d07235316097ca3a55265ee02c1422b0cfd/docs/superpowers/specs/2026-10-29-page-root-scrollbar-gutter.md). Publication, tags, main/site merge and consumer deployments require separate approval.

## 0.8.0 — canonical Home chrome (published 2026-10-28)

Published to npm with dist-tag `next`; `latest` remained 0.7.2 at the 2026-10-29 verification. Frozen source/tag: `3f708e27d05212af7f7a5be769f13f871e8d10c7`; archive SHA-256: `6feb5a8cd50265ace584a0855432683b4127119377e08235282eaebd27081084` (139 files). Hosted Docs and service deployments require separate receipts; see the [release policy](docs/package-release.md#publication-and-deployment).

- Add `appNavigation`, `brandSuffix` and `statusSlot` for complete owned-service header compositions, plus controlled/observer mobile-sheet state on NaeilHeader and Navigation.
- Isolate canonical chrome typography from host styles and preserve mobile account/confirmation focus handoffs. Keep existing imports, slots, default catalog and consumer routing/save guards.
- Retain chrome contract version 1 and verify the Home Workspace/LoginGate profiles against the canonical 0.7.2 baseline. See [NaeilHeader](docs/components/naeil-header.md) for API and compatibility limits.

## 0.7.2 — retired project catalog (published)

Published to npm; `latest=0.7.2` at the 2026-10-29 verification. Source/tag: `40a3928e24cd2f0141be3e605eed0a75260938fd`. Registry, hosted Docs and service activation remain separate receipts.

- Narrow the canonical `NaeilHeader` project catalog to naeil-ui. Content Collector, PKM, Sustainability Analyzer and Baby Agent are retired from naeil.dev; their site pages move to `src/app/_archive/` and old URLs temporarily redirect to the project list. The project menu uses one column for a single entry. `projects`, `translations` and `currentProjectKey` overrides are unchanged.
- Release class `dom`: the standing worker adopts it only through an owner-approved `reviewedMigration` of this exact release; ordinary fix-only patches are unaffected.

## 0.7.1 — canonical service chrome (published 2026-10-23)

Published to npm at `2026-10-23T01:14:11.387Z`; `latest` was verified as `0.7.1`. This first published 0.7.x release includes the unpublished 0.7.0 scope below. Frozen package source and tag `v0.7.1`: `32108fd8e1cb1db6dae24a09f3ca72ac9a91f618`; archive SHA-256: `ecd656c595fd63516417eef58a5e2624d1f1bf928ba0465761292d05502ab3f8`. Independent download and fresh React/Next registry consumers matched the archive and all 139 files, with types, production builds and browser checks passing. Hosted Docs and standing activation require separate receipts; see the [release policy](docs/package-release.md#publication-and-deployment).

- Add canonical `NaeilHeaderAccountControl` for shared login/account/logout presentation while consumers retain session and save guards.
- Include React-only `NaeilFooter`, canonical full/compact destinations, save-navigation interception and server-safe `/release` package/contract identity from the unpublished 0.7.0 candidate.
- Preserve existing header slots and imports; include authenticated menu/busy/failure coverage and packed consumer checks.
- Preserve the approved 1600px/clamp frame, generic Navigation/SiteFooter and legacy Nav/Footer APIs. Bundled guides retain their frozen preparation snapshot; maintained guides and hosted Docs use a separately reviewed source.

## 0.7.0 — unpublished candidate

- Add React-only canonical NaeilFooter with full/compact content, localized destinations and save-navigation adapters. Preserve generic and Next Footer overrides.
- Add SiteFooter onNavigate for every group link including native external anchors.
- Add package/chrome-contract identity, independent rendered release references and fail-closed service rollout verification.
- Keep approved 1600px/clamp frame and purpose-specific content widths unchanged.


## 0.6.0 — shared application frame (2026-10-16)

- Align Navigation, SiteFooter, NaeilHeader and preserved Nav/Footer adapters with a shared 1600px maximum outer frame and responsive `clamp(16px, 2.4vw, 40px)` gutters. Add `ui-app-frame` for main composition; retain explicit classes and product token overrides.
- Increase the list content cap from 1200px to 1600px within available frame space. Reading/settings remain 640px and short forms 480px. Remove prior `max-w-7xl` or `px-6` frame overrides when adopting defaults.
- Add application-layout and consumer-agent guidance for shared header/footer selection; synchronize the standalone React example with the matching 0.6.0 archive. Existing external consumers require their own upgrades and adapter migrations.

Archive identity, registry publication and hosted deployment outcomes are recorded in the [0.6.0 release](https://github.com/naeil-dev/naeil-ui/releases/tag/v0.6.0). External application upgrades remain separate.

## 0.5.0 — shared whole header (2026-10-15)

- Add optional React-only NaeilHeader with the actual site catalog, controls, toolbar, fixed frame and responsive behavior. Site adapters consume the same module; preserve existing public compatibility imports/props.
- Include previously unpublished shared Navigation/SiteFooter and their styles. Generic /ui remains separate from the branded catalog. Official artwork remains URL-referenced, with no new redistribution claim.
- Packed React/Next, actual Storybook, site and estimate integration evidence is recorded separately; registry/site/Docs execution and exact release identities are recorded in the dated release evidence.


## 0.4.0 — brand 1.1.1 integration (2026-10-11)

Published to npm at `2026-10-11T05:36:58.047Z`; `latest` was verified as `0.4.0`. The [GitHub Release](https://github.com/naeil-dev/naeil-ui/releases/tag/v0.4.0) and tag retain merged source `e8fe5afc13788a0cac0244b72e78975812f4a2ee`, the exact npm archive and the independent brand 1.1.1 ZIP. [Registry/clean-consumer evidence](https://github.com/naeil-dev/naeil-ui/releases/download/v0.4.0/npm-publication-verification.json), [hosted Docs evidence](https://github.com/naeil-dev/naeil-ui/releases/download/v0.4.0/hosted-docs-verification.json) and [production evidence](https://github.com/naeil-dev/naeil-ui/releases/download/v0.4.0/production-verification.json) record the completed external checks.

- Connect Logo, default Nav/Footer and site login to the checksum-verified sunset/island brand kit; remove duplicated old marks.
- Preserve Logo size/className/mono and Nav brandSlot contracts. Add outlined lockup variants, grayscale tone, explicit/automatic themes and decorative accessibility support. Preserve the leading period in the official .naeil wordmark: an ending followed by tomorrow.
- Generate React artwork and site icons with build:brand; package/Storybook builds reject drift. Keep standalone SVG/PNG/icons separate from UI runtime and retain the Lato notice.
- Shared Pretendard typography, neutral tokens and existing public import paths remain unchanged.
- Publish the byte-verified npm archive; fresh registry installs in independent React/Next apps pass types, production builds and browser contracts. Deploy the same source to [hosted Docs](https://naeil-dev.github.io/naeil-ui/) in [Pages run 38114879574](https://github.com/naeil-dev/naeil-ui/actions/runs/38114879574), and verify the deployed brand on [naeil.dev](https://naeil.dev/) across 24 homepage/login conditions in Chromium/WebKit. Existing native/manual support limits remain open.


## 0.3.0 — scope frozen 2026-10-02; published 2026-10-03

Published to npm at `2026-10-03T04:14:17.028Z`; `latest` was verified as `0.3.0` that day. The [GitHub Release](https://github.com/naeil-dev/naeil-ui/releases/tag/v0.3.0), [registry/clean-consumer evidence](https://github.com/naeil-dev/naeil-ui/releases/download/v0.3.0/npm-publication-verification.json) and [Pages deployment](https://github.com/naeil-dev/naeil-ui/actions/runs/36963256014) record publication and live Docs separately from the earlier scope freeze.

- Demand-led Radix Tabs and native Textarea with exact shared deep entries, standalone guides/Docs/Usage and packed behavior checks. Native field/radio composition remains consumer-owned; no FormField/RadioGroup API or dependency added.

- Shared UI v2: approved neutral light/dark tokens, typography, density, content widths, restrained motion, and Radix Select/Switch/Checkbox. The design generation name “v2” is independent of npm versioning.
- `/ui` is the React core entry. React and ReactDOM come from the host; Next.js and next-intl are optional compatibility peers. Next themes remains a React runtime dependency.
- Preserve root brand/theme/heading names and documented shared deep imports. Replace open-ended deep exports with an explicit allowlist and compiled JavaScript/types.
- Exclude website authentication/Supabase, MDX/blog code, hero/Three/cursor scenes, application wrappers and website messages from the tarball and installed runtime dependencies. See the [migration guide](docs/design/v2-migration.md#03-package-boundary).
- Include CSS side-effect metadata, migration/design guidance and third-party notices/licenses. Verify isolated tarball consumers and add package/site/Storybook/browser CI.
- Version-scoped installation and consumer font/theme/density guidance, plus a dispatch-only hosted Docs workflow. Hosted Docs and the brand website have separate deployment scopes; native/manual coverage is recorded separately from automated browser checks.

This entry describes the 0.3.0 release scope frozen on 2026-10-02; publication on 2026-10-03 is recorded above without redating earlier implementation evidence. The historical registry baseline on 2026-10-02 was npm `latest` at `0.2.0`. Changes to the 0.x API boundary use a minor increment; there is no npm 2.0 release implied by UI v2.

## 0.2.0 — published 2026-03-22

Registry baseline: root, `/ui`, `/utils`, theme/global CSS, and declared wildcard component/lib/i18n paths. The actual 15-file tarball did not contain the source targets for its wildcard exports. It installed website dependencies and marked all files side-effect-free. These registry facts are distinct from later repository-only implementation work.
