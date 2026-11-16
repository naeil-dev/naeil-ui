# Design and guidance history

These are dated records and verbatim excerpts, not current rules or status. [DESIGN.md](../../DESIGN.md) is authoritative; [STATUS.md](../../STATUS.md#current-state) records current state. Excerpts include superseded values and preparation-stage claims. They are deliberately not imported by CLAUDE.md.

### AGENTS-01 — AGENTS.md:3

Current rule: Shared UI work — status and frozen releases. Original text (verbatim; paths are relative to the original file):

```markdown
- Current published registry baseline is 0.16.0; tags verified 2026-11-15 are `latest=0.16.0`, `next=0.13.0`. Owner-approved protected `npm-publish` used OIDC/provenance and succeeded; the registry tarball returned 200 immediately and matches the frozen bytes. `v0.16.0` identifies frozen source `efb6f10`; the GitHub Release retains the SHA-256-verified tgz and `archive.json`. PR #57 merged as `5df4933`; naeil.dev production reports that source and UI 0.16.0. Hosted 0.15.0 Docs completed in run `43602056254` for reviewed source `85b1461` after rerunning a flaky WebKit job. Hosted 0.16.0 Docs completed in run `43650333623` for reviewed source `09f4f97`. Owner-approved service deployments and static/runtime conformance passed for abstorm, jev, estimate and Home; live signed-out checks confirmed desktop/mobile login presentation and Home's deliberate login-route suppression. See [publication receipts](docs/package-release.md#publication-receipts) and [service adoption](docs/package-release.md#0160-service-adoption--2026-11-15) for sources, deployments and verification scope. Frozen `docs/releases/*` files remain unchanged. [Auto-update operations](docs/rollout/auto-update.md) covers setup, patch-only service auto-merge policy (service guard migration is separate), pause and rollback; deployment stays manual. Chrome contract 1 and compatibility APIs remain unchanged.
```

### AGENTS-02 — AGENTS.md:5

Current rule: Shared UI work — account ownership. Original text (verbatim; paths are relative to the original file):

```markdown
- Published and registry-verified 0.7.1 adds `NaeilHeaderAccountControl` from `/naeil-header`. Since 0.16.0, owned apps pass session state through shell `account`; the shell supplies this shared login/account/menu presentation with its locale/Link. Shell `header.authSlot` is deprecated 0.15.0 compatibility; standalone header still uses `authSlot`. Supply the busy flag and guarded callback. Keep pending state and the request lock above the shell or standalone header so desktop/mobile copies share them. App-owned logout buttons or avatar-menu markup do not establish canonical header parity. Verify authenticated states as well as anonymous chrome.
```

### AGENTS-03 — AGENTS.md:7

Current rule: Shared UI work — shell composition and compatibility APIs. Original text (verbatim; paths are relative to the original file):

```markdown
- The first published 0.7.x release is 0.7.1, including `@naeil/ui/naeil-footer` and `/release` from the unpublished 0.7.0 candidate. Historical exact 0.12.0 was published (2026-11-10T21:39Z); its registry tarball matched the frozen archive byte for byte and tags verified 2026-11-11 are `latest=0.12.0`, `next=0.12.0` (frozen source `e03af076b725d742c4b319aca5ebb2379e2f0258`, tag `v0.12.0`, archive SHA-256 `7f5f01407c576e3c5fa956cf76ebfb3a8ef59b58619de99da68351974aca721b`, 178 files). See the [0.12.0 release receipt](docs/releases/0.12.0/README.md) and the [GitHub Release](https://github.com/naeil-dev/naeil-ui/releases/tag/v0.12.0) with its registry verification. 0.11.0 ([receipt](docs/releases/0.11.0/README.md)) and the earlier 0.10.0 [publication and service acceptance receipt](docs/design/shared-language-2026-11-04/implementation-progress.md) is historical. Read `package.json` and `npm view @naeil/ui dist-tags` from a fresh `origin/main` rather than trusting this line or an old local checkout. Historical fresh 0.7.1 React/Next registry consumers matched all 139 frozen files and passed their checks. The historical 0.7.1 service composition uses `NaeilHeader` with `NaeilFooter` for canonical destinations, preserving consumer routing/save guards; current 0.15.0 adoption uses the shell described below. Generic Navigation/SiteFooter and legacy Nav/Footer remain public. See `docs/components/naeil-footer.md` and `docs/rollout/`; hosted Docs and standing activation require separate receipts.
```

### AGENTS-04 — AGENTS.md:9

Current rule: Shared UI work — frozen releases. Original text (verbatim; paths are relative to the original file):

```markdown
- Preserve frozen 0.7.1 archive/reference bytes and source `32108fd8e1cb1db6dae24a09f3ca72ac9a91f618`; its release tag is `v0.7.1`. Maintained Docs use a separately reviewed source. Do not repack current main or move the tag to incorporate guide updates; record npm, Docs and service rollout receipts separately.
```

### AGENTS-05 — AGENTS.md:19

Current rule: Shared UI work — page rhythm. Original text (verbatim; paths are relative to the original file):

```markdown
- Page rhythm / service shell (0.15.0): owned services use `NaeilServiceShell` + root `NaeilThemeProvider` from `/naeil-shell` (standalone) or `/naeil-locale/chrome` (provider-backed), start pages with `PageHeader`, and run `naeil-ui-conformance --service <id> --framework next|vite --app <dir>` and runtime `naeil-ui-conformance --service <id> --url <origin> --routes /a,/b [--no-footer /login]` in CI (consumer-installed Playwright). Shell header inputs retain the nine documented compatibility inputs, but owned services pass account= instead of deprecated header.authSlot; runtime --no-account records matching login-page exceptions; navigation `labels` supplies accessible names. Do not rebuild frame/theme/base text/favicon policy, style reserved chrome selectors or add page padding/title sizes. Use server-safe `naeilIcons` and title helpers from `/naeil-locale`. Record any `footer={false}` screen or CLI ignore reason. See `docs/components/naeil-shell.md` and DESIGN.md "Page rhythm".
```

### AGENTS-06 — AGENTS.md:24

Current rule: Shared UI work — scrollbar policy. Original text (verbatim; paths are relative to the original file):

```markdown
- Since 0.9.0, `html { scrollbar-gutter: stable }` is the shared page-frame default in `components.css`, reached by `globals.css` or `theme.css + components.css`. Set `<html data-naeil-scrollbar-gutter="auto">` before first paint to opt out of both reservation and lock correction. Custom body edge spacing/scrollers/helper-class compensation require consumer integration or opt-out. Theme-only and JS-only imports do not set document policy.
```

### AGENTS-07 — AGENTS.md:25

Current rule: Shared UI work — scrollbar verification. Original text (verbatim; paths are relative to the original file):

```markdown
- Check classic and overlay probes, short/long frames and ordinary content through nested scroll locks; measure before any fullPage capture. Keep tokens unchanged and document the Japanese signed-out 320px classic 104px toolbar wrap (overlay 44px). See the adopted `docs/superpowers/specs/2026-10-29-page-root-scrollbar-gutter.md`; releases, main/site merge, hosted Docs and Home upgrades need separate approvals.
```

### DESIGN-09 — DESIGN.md:3

Current rule: Visual direction; Selected visual foundation. Original text (verbatim; paths are relative to the original file):

```markdown
Status: Visual direction accepted on 2026-09-29: neutral palette, Pretendard, larger text, purpose-specific widths, comfortable spacing by default, compact spacing for dense views, and short restrained transitions respecting reduced motion. Implemented in the shared package and actual-component Storybook examples. Independent review findings have been addressed; validation evidence and remaining limits are in [the verification report](https://github.com/naeil-dev/naeil-ui/blob/main/docs/design/v2-verification.md). See [the v2 specification](https://github.com/naeil-dev/naeil-ui/blob/main/docs/superpowers/specs/2026-09-29-shared-ui-v2-design.md) for scope. Publishing and deployment are separate.
```

### DESIGN-10 — DESIGN.md:13

Current rule: Reference and provenance. Original text (verbatim; paths are relative to the original file):

```markdown
- Selected by the user: Linear, on 2026-09-29.
- Source: https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/linear.app/DESIGN.md
- Workflow reference: https://www.threads.com/@automation_claire/post/Dd1GZoREhnt
- Follow-up constraints: https://www.threads.com/@automation_claire/post/Dd1GcQGkpbL
```

### DESIGN-11 — DESIGN.md:44

Current rule: Selected visual foundation. Original text (verbatim; paths are relative to the original file):

```markdown
The neutral palette, larger-text direction, Pretendard, and the reviewed content-width recommendations are selected. The user also accepted the recommended comfortable spacing, demonstrated state direction, and short transitions. Engineering and compatibility decisions are consolidated in the linked specification. These are naeil decisions, not assertions about Linear's product UI.
```

### DESIGN-12 — DESIGN.md:65

Current rule: Color and surfaces. Original text (verbatim; paths are relative to the original file):

```markdown
Use neutral surfaces, neutral selection backgrounds, and a neutral action palette as the shared default. The user selected neutral over blue and teal after comparing the revised study. Purple actions and purple selection backgrounds were rejected. Blue and teal remain comparison history, not required shipped themes. Provide complete light/dark roles and validate actual text and control states before publishing.
```

### DESIGN-13 — DESIGN.md:73

Current rule: Typography; Screen frame contract — Fonts. Original text (verbatim; paths are relative to the original file):

```markdown
Selected UI family: Pretendard for Korean and for Latin letters and digits in every language, with Noto Sans JP for Japanese glyphs (see the screen frame contract). JetBrains Mono for code and identifiers is still a proposal; it was not part of the font comparison. Font delivery must be documented for package consumers. Verify all three languages in specimens.
```

### DESIGN-14 — DESIGN.md:98

Current rule: Motion. Original text (verbatim; paths are relative to the original file):

```markdown
Use named fast (120ms) and standard (180ms) transitions for color and opacity, with at most a small movement for notifications. Reduced-motion mode removes transitions and spatial movement. Do not add default spring, bounce, magnetic, or decorative motion. Kinetics was inspected as a reference; its effects were not adopted.
```

### DESIGN-15 — DESIGN.md:117

Current rule: Owned-service header rule. Original text (verbatim; paths are relative to the original file):

```markdown
The service-header branch rejects `brandSuffix`, `statusSlot`, `brandSlot`, `toolbarSlot`, `subNav`, `brandLinkComponent`, `projects`, `projectsExternal`, `showProjects`, `showBlog`, `translations`, `className`, `containerClassName`, `style`, `brandLinkProps`, `mobileFooter` and `omitEmptyNavigation`; runtime attempts are ignored. Header `data-slot`, `data-global-header` and `data-naeil-*` markers are protected. Under the shell, the header element is shell-owned: services pass only `appNavigation`, `currentHref`, `brandHref`, `authSlot`, `labels`, `resolveHref`, `onLocaleChange`, `mobileOpen` and `onMobileOpenChange`. Navigation `labels` supplies accessible names; header `id`/`aria-*`/`dir` attributes are not shell inputs. Standalone `NaeilHeader` retains its `id`/`aria-*`/`dir` semantics for non-shell compositions; the shell's own main id/classes are fixed. Routing adapters and auth state remain consumer-owned and must not be used for styling shared chrome; since 0.16.0, owned-service account presentation comes from shell `account`. `header.authSlot` remains deprecated 0.15.0 compatibility and loses to account when both are supplied.
```

### DESIGN-16 — DESIGN.md:121

Current rule: Application frame and content widths. Original text (verbatim; paths are relative to the original file):

```markdown
On 2026-10-16 the owner approved a shared maximum application frame of **1600px**, with responsive inline gutters **clamp(16px, 2.4vw, 40px)**, after inspecting Naeil Home at mobile and desktop widths. This supersedes the prior 1280px branded-header cap and fixed 24px frame gutters. The frame includes its padding, centers on wider screens and shrinks to available space. Numeric values live in `ui.width-frame` and `ui.frame-gutter`; `.ui-app-frame`, `Navigation`, `SiteFooter`, `NaeilHeader`, and the legacy adapters use those same defaults.
```

### DESIGN-17 — DESIGN.md:125

Current rule: Application frame and content widths — scrollbar policy. Original text (verbatim; paths are relative to the original file):

```markdown
Since 0.9.0, the package implements this default once in `components.css`, through either `globals.css` or `theme.css + components.css`. Theme-only/JS-only imports do not set it. `<html data-naeil-scrollbar-gutter="auto">` opts out of both the root reservation and its Radix duplicate-compensation correction before first paint. The default profile is LTR with zero body edge spacing; custom scrollers, body margins or dependency helper classes require consumer integration/opt-out. Unsupported browsers retain existing scroll-lock compensation. See the [adopted frame contract](https://github.com/naeil-dev/naeil-ui/blob/434b7d07235316097ca3a55265ee02c1422b0cfd/docs/superpowers/specs/2026-10-29-page-root-scrollbar-gutter.md) and [consumer override guidance](docs/components/application-layout.md).
```

### DESIGN-18 — DESIGN.md:127

Current rule: Application frame and content widths — standalone header. Original text (verbatim; paths are relative to the original file):

```markdown
The optional `@naeil/ui/naeil-header` composition centralizes the actual naeil.dev brand/catalog/control/toolbar/responsive implementation approved on 2026-10-15. Official decorative image URLs remain references; no new artwork rights or redistribution is implied. See [NaeilHeader](docs/components/naeil-header.md).
```

### DESIGN-19 — DESIGN.md:131

Current rule: Application frame and content widths — locale composition. Original text (verbatim; paths are relative to the original file):

```markdown
Owned Next services under the shared locale provider import shell/provider/PageHeader/account chrome from `@naeil/ui/naeil-locale/chrome`; standalone React services use `/naeil-shell` with its account prop for account presentation (since 0.16.0). `/naeil-header` and `/naeil-footer` remain standalone React adapters (see [the locale runtime](docs/components/naeil-locale.md)).
```

### DESIGN-20 — DESIGN.md:135

Current rule: Application frame and content widths. Original text (verbatim; paths are relative to the original file):

```markdown
Content caps are reading **640px**, settings **640px**, short form **480px**, and lists **1600px** (updated from 1200px on 2026-10-16). On 2026-11-09 the owner approved a **workflow** cap of **896px** (`ui.width-workflow`, `data-ui-layout="workflow"`) for multi-step or card-choice input screens whose step cards or option grids are cramped at 640px; it matches the 848–896px main content measured on naeil.dev. Individual fields and helper text inside a workflow still follow the 640/480px caps. Owned services put purpose-specific content inside the shell's main without adding frame classes; generic compositions apply `.ui-app-frame` to their main. Lists, tables and dashboards use the space remaining after frame gutters, while narrow reading/forms stay inside that stable outer frame. `data-ui-layout="fluid"` uses the available region. At a 1920px viewport the default frame has 1520px of usable width.
```

### DESIGN-21 — DESIGN.md:137

Current rule: Application frame and content widths — overrides. Original text (verbatim; paths are relative to the original file):

```markdown
Generic/legacy compositions may deliberately override `--ui-width-frame`, `--ui-frame-gutter`, content tokens or supported `containerClassName`; apply frame overrides consistently to header, main and footer. Choose exceptions from representative tasks and sparse/dense content, and record the reason. These compatibility overrides do not apply to the owned-service shell, including through ancestors or reserved selectors; owned services keep purpose-specific widths inside main. An override is not permission to fork shared chrome. Generic/legacy compositions can keep the old list cap with `--ui-width-list: 1200px` where required. The earlier product-specific 1600px observation alone was not a shared rule; the owner's explicit 2026-10-16 decision establishes this new default.
```

### DESIGN-22 — DESIGN.md:141

Current rule: Page rhythm, theme and base text; Screen frame contract. Original text (verbatim; paths are relative to the original file):

```markdown
The owner required naeil.dev and every owned service to look the same outside their content, not only in the header and footer. Measured differences (header→title 32–92px, title→description 8–12px, content→footer 49–168px, an abstorm light-only default, Home's 14px base text, a 24px mobile title) are removed by shared values taken from naeil.dev:
```

### DESIGN-23 — DESIGN.md:143

Current rule: Page rhythm, theme and base text. Original text (verbatim; paths are relative to the original file):

```markdown
- Owned services use `NaeilServiceShell` + root `NaeilThemeProvider`; CI runs both static and runtime `naeil-ui-conformance` checks. Since 0.16.0, services supply session state through shell `account`; the shell owns localized login/account presentation with its locale/Link. Signed-out pages show login except when loginHref/currentHref pathnames match; record that screen with runtime `--no-account`. Static CI requires account= and rejects deprecated shell header.authSlot. Do not reconstruct the main frame, theme policy, base text or favicon declarations from written rules. See [the shell contract](docs/components/naeil-shell.md).
- The shell owns main's `.ui-app-frame ui-app-main`: fixed-header clearance, `ui.page-top` 48px and `ui.page-bottom` 96px. App source adds no frame classes or independent top/bottom page padding.
- Pages start with `PageHeader`: 32/42 semibold at every width, `ui.page-title-gap` 12px, 16/25 secondary description capped at reading width, end-aligned actions, `ui.page-header-gap` 32px before content.
- Shared CSS supplies 16px Pretendard base text. The root provider supplies the owner's dark default, remembered theme and system option. Generated `naeilIcons` supplies the exact brand-file digests and naeil.dev icon declarations; the conformance CLI rejects divergence.
```

### DESIGN-24 — DESIGN.md:152

Current rule: Screen frame contract. Original text (verbatim; paths are relative to the original file):

```markdown
The owner approved this contract on 2026-11-15 after an independent audit found that pages passed every check while still looking different. It closes what the shell owns in one place. Where an earlier paragraph in this document or a dated specification disagrees, this section wins. It applies to naeil.dev and every owned service alike; naeil.dev is rendered through the same shell and is not an exception.
```

### DESIGN-25 — DESIGN.md:160

Current rule: Screen frame contract — Fonts. Original text (verbatim; paths are relative to the original file):

```markdown
**Fonts.** The package delivers its fonts through one entry, `@naeil/ui/fonts.css`. Applications import that entry and do not install or import Pretendard or Noto Sans JP themselves.
- Latin letters and digits (U+0020–007E, U+00A0–00FF) render in Pretendard in every language, including inside Japanese text and Japanese chrome.
- Kana, kanji and Japanese punctuation render in Noto Sans JP. Korean renders in Pretendard.
- This replaces the earlier rule that Japanese elements use the Noto Sans JP stack for all glyphs.
- A page that needs no Japanese glyphs downloads no Japanese font file, and at most one Japanese font stylesheet.
```

### DESIGN-26 — DESIGN.md:194

Current rule: Evaluation and acceptance; STATUS.md current state. Original text (verbatim; paths are relative to the original file):

```markdown
The visual comparisons and implementation scope are accepted. Token generation, component behavior, packed consumption, and actual browser examples have been implemented and checked; see the verification report for results and limits.
```

### DESIGN-27 — DESIGN.md:198

Current rule: Brand assets and shared components. Original text (verbatim; paths are relative to the original file):

```markdown
The approved naeil sunset/island identity is managed independently under `brand/naeil/1.1.1/`. The standalone SVG/PNG/favicon kit is usable without React or this UI package. Its version is separate from the npm version; released brand directories are immutable. New artwork requires a new reviewed brand version. The official wordmark is `.naeil`; its leading period means an ending followed by tomorrow (historical decision: commit 2efb1b0, reaffirmed by the user on 2026-10-11). Keep the period in outlined lettering; standalone symbols need no extra dot.
```

### DESIGN-28 — DESIGN.md:206

Current rule: Browser identity — tab title and favicon. Original text (verbatim; paths are relative to the original file):

```markdown
Accepted on 2026-10-13; naeil.dev spelling revised to `.naeil` by the user on 2026-10-14; owned-service names, one shared favicon and one shared footer approved by the user on 2026-11-13. Browser identity is part of the shared brand/content contract. The browser owns tab typography and sizing; this is a metadata rule, not a visual component or numeric token.
```

### DESIGN-29 — DESIGN.md:208

Current rule: Browser identity — tab title and favicon. Original text (verbatim; paths are relative to the original file):

```markdown
- Use `Page name — Service name` for named pages, with one space on each side of the em dash. Put the page first so tabs remain distinguishable when titles are truncated.
- A service home/landing page may use the service name alone. A named task screen such as a dashboard keeps its page name, even when it is the application's entry route.
- The service name matches the header brand: `.naeil` for naeil.dev and `.naeil <service>` for owned services (`.naeil home`, `.naeil estimate`, `.naeil abstorm`, `.naeil jev`). The shared package derives it from the service id (`localeMetadata`, `naeilDocumentTitle`); applications do not pass their own service string. The leading period is part of the official brand spelling. This replaces the earlier `Naeil Home` spelling.
- Localize the page name with the active UI language; keep the canonical service name unchanged. Use the visible page name or content title, and append the service suffix exactly once.
- naeil.dev and every owned service use the same `.naeil` favicon from the current brand kit (`brand/naeil/1.1.1/icons/`: `favicon.ico`, `favicon.svg`, `apple-touch-icon.png`) on every route. Each service copies those unmodified files into its app and owns their serving, metadata/manifest configuration and deployment; the kit stays out of the npm package.
- Each application implements the title through its framework metadata or router and updates it on client-side navigation and language changes. Shared Navigation/Logo components do not set document metadata implicitly.
```

### DESIGN-30 — DESIGN.md:219

Current rule: Browser identity; STATUS.md current state. Original text (verbatim; paths are relative to the original file):

```markdown
This records the approved rule; it does not assert that existing service metadata has been migrated or deployed.

```

## Original historical design studies

## Historical design studies

The sections below record prototype-stage decisions and checks as they occurred. Their references to pending production work describe that earlier stage; current implementation status is above.

## Accepted direction — typography and content widths

The accepted comparison artifact is `docs/design/v2-typography-width.html`. It retains the selected neutral palette and compares font family and width independently. The original composition study remains in `docs/design/v2-preview.html`. These review screens do not modify the production library.

- Compare Pretendard (current recommendation) and Noto Sans KR with identical Korean/English text, 16px body, 14px supporting text, 20px headings, and matching weights/spacing. Both use explicitly loaded Noto Sans JP for Japanese samples; this is a shared Japanese companion, not a comparison between Japanese font candidates. Monospace font selection is outside this review.
- Let either font drive the same reading, settings, and task-table examples. Font loading status is visible; a fallback rendering must not be presented as a successful candidate comparison.
- Compare maximum outer content widths: reading 560/640/800px, settings 480/640/800px, and task lists 960/1,200px/available width. The user accepted 640px for reading and settings, and 1,200px for task lists as design defaults. These still need to be implemented as tokens. Short forms may use 480px; data-heavy layouts may need available width.
- Maximum widths shrink to available space on small screens. The comparison stage and its padding are review-page scaffolding, not a proposed universal application shell. A wide table scrolls inside its region on mobile, while reading and forms reflow.

Sources: [Pretendard](https://github.com/orioncactus/pretendard), [Noto Sans KR](https://fonts.google.com/noto/specimen/Noto+Sans+KR), and [Noto Sans JP](https://fonts.google.com/noto/specimen/Noto+Sans+JP). The prototype loads fonts through jsDelivr and Google Fonts; production delivery remains to be decided.

Browser checks at 1440px confirmed candidate font loads and all nine width choices. At 390px the three layouts fit without page-level horizontal overflow, the table retains internal scrolling, and form inputs retain 16px text. These checks support the visual review and do not replace production accessibility or cross-browser testing. Subsequent spacing/state/motion recommendations have also been accepted; production coverage and verification remain outstanding.

## Accepted direction — spacing, states, and motion

`docs/design/v2-spacing-states.html` reuses the interactive neutral composition, with an independent settings example capped at 640px and a list/detail example capped at 1,200px. It preserves 16px main text and compares comfortable/compact spacing (40/36px controls, minimum 72/60px list rows). Mobile targets keep their larger sizes.

Review controls expose normal, loading, empty, and recoverable error list states. The existing email validation/recovery, simulated save, selected task, disabled action, language combobox, dialog, and toast remain available. Scenario data is simulated and resets on reload.

The user accepted the motion recommendation: short color transitions (120ms), menu entrance opacity (120ms), and dialog/toast transitions (180ms), alongside an explicit no-motion option. OS reduced-motion settings take priority. These are our selected rules, not adaptations from Kinetics or output from Impeccable. A subsequent reference review confirmed the Select gap and retained Radix as the implementation basis; see the specification for sources. Production component coverage, accessibility checks, and polish remain outstanding.

Browser verification confirmed the 640/1,200px example widths, all four list scenarios, error retry, task creation from the empty-state action, invalid email and recovery, and simulated save completion. Density retained 16px task titles; the compact two-line rows grew above their 60px minimum to fit their content. Motion-off disabled the dialog animation. At 390px there was no page overflow and inputs remained 44px high. OS reduced-motion behavior is specified in CSS but was not separately emulated in this browser check.

## Composition study — selected neutral direction

The standalone review artifact is `docs/design/v2-preview.html`. It is a disposable HTML/CSS/JavaScript prototype; the package implementation is unchanged. Open it directly or serve it locally. The specimen uses CDN-hosted Pretendard with system fallbacks. Form saves and tasks are simulated in memory and reset on reload.

The user requested larger typography, alternatives to the purple action and selected surfaces, and a coherent language dropdown. The current study uses 16px body/control/label text, 14px supporting text, and 13px metadata. Default/compact controls are 40/36px and task rows 72/60px; mobile controls remain at least 44px. Density changes spacing, not font size.

The current preview uses the selected neutral palette and retains light/dark and density controls. Palette comparison controls have been removed. Selected surfaces are #262626 in dark mode and #ebebeb in light mode. Selected-list indicators use the accent-text role for contrast against the selected surface. The comparison values below are retained as decision history.

| Palette | Dark action / foreground | Light action / foreground | Action text contrast, dark / light |
| --- | --- | --- | --- |
| Neutral (selected default) | #e5e5e5 / #171717 | #292929 / #ffffff | 14.23 / 14.55 |
| Blue (comparison only) | #3269ce / #ffffff | #245ec7 / #ffffff | 5.19 / 6.00 |
| Teal (comparison only) | #16756b / #ffffff | #116e64 / #ffffff | 5.54 / 6.11 |

The neutral default includes hover, focus, and accent-text roles; the earlier comparisons also supplied these roles. These measured button text pairs are not a complete accessibility certification. Semantic success/warning/error colors remain distinct from the replaceable action palette.

The language control now demonstrates a styled select-only combobox and opaque listbox in the browser's popover top layer. The menu matches the trigger width, marks the selected option, and opens above when space below is insufficient. It supports arrows, Home/End, Enter/Space, Escape, Tab dismissal, and text lookup. Selection updates a hidden form value; it does not translate the page. This is a visual/interaction probe: production implementation should use the established accessible primitives and undergo assistive-technology testing.

The prototype also demonstrates a settings form, searchable task list, detail panel, new-task dialog, toast, status badges, disabled controls, and invalid/recovered input. The revised dark desktop and light mobile layouts, menu visibility, and primary button text contrast were inspected in a browser. Broader component, language, and accessibility verification belongs to implementation.

### Previous study

Study 01 proposed purple actions (#6863dc dark / #6057cf light), purple selected surfaces, 14px controls and 12px metadata, and a native language select. Those choices have been superseded by study 02 in response to user feedback. Linear remains the structural reference; its brand color is not prescribed.

### Removed section heading

```markdown
### Owned-service header rule (2026-11-12)
```

### Removed section heading

```markdown
### Page rhythm, theme and base text (2026-11-14)
```

### Removed section heading

```markdown
### Screen frame contract (2026-11-15)
```
