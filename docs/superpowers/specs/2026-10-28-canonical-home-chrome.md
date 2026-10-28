# Acceptance contract — Naeil Home on the complete NaeilHeader / NaeilFooter (0.8.0)

Status: **draft rev 3** (2026-10-28) — astra reviews 1 and 2 applied. Source base `40a3928` (origin/main). Owner-approved direction: Home renders the complete `NaeilHeader` and `NaeilFooter`; it does not compose header parts. This document fixes the scope and the gates before any code is written. Implementation, publication, main merge and Home deployment are separate steps with separate approvals.

## 1. Baselines

| Id | What | Identity |
| --- | --- | --- |
| B1 | Package baseline — what a default consumer sees today | `@naeil/ui@0.7.2` registry tarball, `sha512-QlFPjSZdBIDqVxRy930RlmNyztQG0SzvkOp4E64Sw950mNtH1XlyPXPh/4PJ8p4ki9CpFREbglyB5DJOEg1C4w==` (archive sha256 `b7919ed182307c5c3b48515f68567b0e4f51c611c86b7acf8861e769f596e2ec`, 139 files), tag `v0.7.2` = `40a3928`. Rendered by the existing React and Next packed fixtures and by the naeil.dev / Estimate / Jev default profiles (catalog, blog, `subNav`, `projectsExternal`, `toolbarSlot`, signed-in and signed-out account) |
| B2 | Official screen | `https://naeil.dev/{ko,en,ja}` serving `data-naeil-ui-version="0.7.2"`, `data-naeil-ui-contract="1"` (observed 2026-10-28 10:13 JST). Captured once at the start of step 3 (HTML + screenshots + measured numbers, with date and Vercel deployment id) and frozen; a later "then-current" site never replaces it without owner approval |
| B3 | Approved Home product parts | Home production image `fda72ac5` (Home main `5b39c839`, #136), measured by the existing Home harness (`frontend/test/chrome-parity/measure.ts`, ink-center method in its README): qualifier 14px, 4px gap, ink center within 0.25px of the wordmark; readiness dot 8px, 8px after the brand link. The measured numbers are recorded with the step-3 evidence |

Every comparison records: source SHA, CSS import path (`globals.css` or `theme.css + components.css`), font files, browser + version, DPR, viewport and container width, locale, theme, authentication state (signed-in, signed-out, busy) and interaction state (closed, current, hover, focus, open). New renders are never promoted to expected values on their own; a new baseline is fixed only after a person has checked that the differences from B1/B2 are exactly the allowed ones in §3. The 0.7.1/0.7.2 references stay untouched.

Tolerances: 0.01 CSS px for corresponding elements rendered in the same browser/DPR/fonts (paired comparison, e.g. package fixture vs package fixture, Home vs package Home profile); the contract's 1px (`contracts/naeil-chrome.v1.json`) for frame measurements across environments (e.g. Home vs B2 captured naeil.dev); 0.25px for the B3 ink center. Computed text styles must be equal in all cases.

## 2. API (additive; 0.8.0)

```ts
interface NaeilHeaderProps {            // existing props unchanged
  appNavigation?: NavigationItem[];     // existing NavigationLink | NavigationGroup
  statusSlot?: React.ReactNode;         // outside the brand link, one row with it, every width
  brandSuffix?: string;                 // product qualifier after the default Logo, e.g. "Home"
  mobileOpen?: boolean;                 // controlled sheet (with onMobileOpenChange)
  onMobileOpenChange?: (open: boolean) => void;
}
interface NavigationProps {             // inherited by NaeilHeader
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}
```

Rules:

1. **Omitted = unchanged.** With none of the new props, on the canonical host (B1 fixtures and default profiles), computed styles, geometry and behavior equal B1 for every existing prop combination (catalog/blog, `subNav`, `projects`, `translations`, `resolveHref`, `brandSlot`, `brandLinkProps`, `brandLinkComponent`, `toolbarSlot`, `currentProjectKey`). Permitted DOM differences, normalized before comparison: the §4 markers, `lang` attributes required by §4, `data-naeil-ui-version="0.8.0"`, and Radix-generated ids. The intended change of chrome typography on a hostile host is judged by P4, not by this rule. The B1 style comparison runs on canonical fixtures whose document language equals the header locale. Where an existing fixture's document language differs from the locale (e.g. `examples/react` `lang="en"` with locale `ja`), the Japanese font stack and dependent metrics that follow from the new `lang=locale` guarantee are the intended language correction: they are excluded from B1 equality and verified instead by a check that chrome and every portal use the correct Japanese stack regardless of the document language.
2. **Order.** catalog → blog → `appNavigation` → flat `subNav`. Home passes `showProjects={false} showBlog={false}`. `appNavigation` items reach `Navigation` unchanged (id, columns, href, active, icon, description, badge, external, target).
3. **Brand.** `brandSlot` keeps overriding the whole brand content; then `brandSuffix` is ignored (documented). Without `brandSlot`, the package renders Logo + suffix inside the brand link and owns its size, weight, gap and optical alignment. The accessible name stays overridable via `brandLinkProps["aria-label"]` (Home passes `Naeil Home`).
4. **Status.** `statusSlot` renders exactly once, after the brand link and outside it, in the header row at every width (desktop and below 48rem), never inside the sheet. No status wrapper is rendered when it is omitted.
5. **Sheet.** `mobileOpen`/`onMobileOpenChange` follow the Radix controlled/uncontrolled convention: `mobileOpen` undefined → internal state as today, and `onMobileOpenChange` alone observes it. Controlled or not, the sheet closes on route change (`currentHref`), on crossing to the desktop layout, on Escape/close/overlay and on ordinary link selection; `onMobileOpenChange` fires exactly once per actual state transition (never for a no-op). Modified and middle clicks never close it. Escape closes only the topmost layer: an open account or locale menu inside the sheet closes first, the sheet on the next Escape.
6. **Toolbar.** Home uses the default toolbar (theme, locale, separator, `authSlot` = `NaeilHeaderAccountControl`). `toolbarSlot` is not a migration path.
7. **Footer.** `NaeilFooter` API is unchanged; Home keeps `variant="full"`, `Link`, `meta`.
8. **Package does not know** authentication, unsaved state or pending logout; Home keeps the request lock and busy state above the header (existing AGENTS rule).

## 3. Allowed differences (Home vs B1/B2) — exactly four

| # | Part | Home owns | Package owns |
| --- | --- | --- | --- |
| D1 | Menu items | data: `AI` group (대시보드 `/`, API 키 `/keys`, 모델 연결 `/connections`, Auto `/auto`; icons, descriptions) and `Console` `/console`. Includes what that data derives: desktop item widths and the x of later items, popover and sheet list height and wrapping, and therefore the y of the mobile sheet toolbar and of portals opened from it | trigger/link/popover/sheet rendering, styles, interaction; the common toolbar's order, sizes and internal gaps stay identical |
| D2 | `Home` qualifier | the string, the brand accessible name `Naeil Home`, the brand destination `/` | font, size, gap, optical center (B3) |
| D3 | Readiness dot | content: 8px dot, ok/down/checking color, accessible status text | slot position (B3: 8px after the brand link, vertically centered) |
| D4 | Footer version row | the `meta` text; the resulting increase of total footer height | the meta row's rendering (existing) |

Everything else — header height 65px, frame (1600 / `clamp(16px, 2.4vw, 40px)`), brand 28px, toolbar order/size/spacing/separator, 44px targets, account and locale menus, popover and sheet, footer content/columns, colors, typography, focus rings — must equal B1/B2 under matching viewport, theme and locale. Anything not in this table is a defect, not a fifth difference. Guarded navigation, logout and auth callbacks are consumer behavior, verified by the Home gates, not visual differences.

Correspondence for comparison: Home `AI` trigger ↔ canonical `Projects` trigger; Home AI entries ↔ canonical catalog entries (entry box, icon box, title/description styles; count differs per D1); Home `Console` ↔ canonical `Blog`. Compared per pair: box size, padding, gaps, baseline offset, computed text styles, current/hover/focus states. Whole-header comparisons use the same authentication state on both sides (signed-in fixture for the canonical side; the public naeil.dev B2 capture is signed-out and is compared with a signed-out Home or for the frame and controls only).

## 4. Package-owned typography and portal markers

Today header/footer typography is inherited from the host `body` (`globals.css` base layer), and descendants use Tailwind utilities that the host compiles with its own theme. Home therefore repairs it (`frontend/src/styles/chrome.css:7-20`, guessing the locale portal by its ko+en+ja options) and its `@theme` (`index.css:52-67`: other `--text-*--line-height`, other `--font-sans`) and unlayered role rules (`dashboard-v2.css:79-82`) would otherwise reach the chrome. Setting `font-family: var(--font-sans)` on a root is not enough: the host can redefine the variable, and descendant utilities beat inherited values (Tailwind 4.2.1 compiles `.text-xl` from the host `@theme`). The package takes this over:

- **Markers.** `data-naeil-chrome` on the header root, the footer root and the actual Content element of every portal NaeilHeader opens (navigation popover, sheet, account menu, locale menu); additionally `data-naeil-locale-menu` on the locale `SelectContent`. Generic `Navigation`/`Select`/`DropdownMenu` used without NaeilHeader get no marker and no new styles.
- **Final values, not inheritance.** Inside marked elements the package guarantees the canonical font stack (package-defined, not the host `--font-sans`), and the font-size, weight, line-height and letter-spacing of every text element it renders (sheet title, group labels, entry title/description, triggers, account label/items, locale options, footer tagline/labels/links/meta), plus antialiased smoothing — with selectors scoped to the markers and not dependent on host theme variables or host-compiled utilities.
- **Language.** Japanese uses the Noto Sans JP stack. The package must not rely on the document language reaching portals: header/footer roots and every marked portal carry `lang` equal to the header `locale` (locale options keep their own `lang`).
- **Supported host.** Both `globals.css` and `theme.css + components.css`; a host `@theme`/`@theme inline` with different type tokens and font stack; unlayered host element/role selectors of the specificity in Home (`:root[attr] [role="menuitem"]`, `[role="dialog"] p`). Not promised: host rules using `!important` or IDs aimed at chrome; documented in `docs/components/naeil-header.md`.
- Font files stay consumer-supplied (unchanged policy, `docs/design/v2-migration.md:131`). No Shadow DOM, provider, global reset or `!important`.
- Body `Select`/menus/dialogs of the host remain exactly as the host styles them.

## 5. Mobile dirty logout (Home flow the API must allow)

1. Operator opens the sheet, opens the account menu, chooses 로그아웃 while a draft is dirty.
2. Home closes the controlled sheet and runs its existing `requestNavigation` (no hidden `Dialog.Close`).
3. Accepted when the focus handoff is complete, not when setters were called in order: exactly one dialog — the discard confirmation — is open; focus is inside it and Tab cycles inside it; this still holds after the account menu's and the sheet's close animations and their `onCloseAutoFocus` have run, with normal and reduced motion. No late focus return into the closed sheet or onto a hidden trigger.
4. Cancel: draft retained, no logout request, focus returns to the visible mobile menu trigger (or, if the layout switched to desktop meanwhile, to the visible account trigger). Discard: one logout request; busy state until it settles; failure allows retry; duplicate activation sends nothing.
5. Resize to desktop and reopen while the guard is pending: no second confirmation, no second request.

Home's confirmation stores `document.activeElement` on open and focuses it on cancel (`frontend/src/components/ui/modal.tsx:48-54`), so the element it captures must be one that survives. Whether the package needs a small focus hook (e.g. suppressing close-auto-focus when the sheet is closed programmatically) is decided by the failing P5 check, not assumed. The package proves 2–5 with a fake guard that mimics this modal; Home proves 1–5 with its real guard and API.

## 6. Gates

### Package (step 3, on the frozen archive)

| Gate | Matrix / content | Pass |
| --- | --- | --- |
| P1 Compatibility | packed tarball in the React (no Next) and Next fixtures and the naeil.dev / Estimate / Jev default profiles; all existing props of rule 2.1; existing frame gate incl. 1920/2560 (`e2e/frame.spec.ts`) and `contracts/naeil-chrome.v1.json` | build + tests green; computed styles/geometry equal B1 after the rule 2.1 normalization |
| P2 Home profile | `appNavigation` AI+Console, `statusSlot`, `brandSuffix="Home"`, controlled sheet | ids/order/`aria-current`/accessible names; D2/D3 placement equals B3 |
| P3 Visual vs approved baseline | ko/en/ja × light/dark × 320/390/1440/1920 and both sides of the 48rem container boundary; signed-in and signed-out; closed, current, hover, focus, open AI popover, open sheet, open account menu, open locale menu; header + footer; first paint before fonts settle is excluded only after fonts and finite animations finish | per §1 tolerances and §3 correspondence: geometry and computed color/background/border/font-family/size/weight/line-height/letter-spacing/opacity/smoothing equal to B1, except D1–D4; no page overflow; 44px targets |
| P4 Host-CSS independence | hostile host fixture = Home's actual `index.css` theme tokens, unlayered `dashboard-v2.css` role rules and body font/size/line-height/smoothing, under both CSS import paths; plus a body `Select` with ko/en/ja options and a body menu/dialog | chrome text elements equal P3 final computed values; body Select/menu/dialog keep host styles (zero chrome rule matches); written to fail on 0.7.2 before implementation |
| P5 Interaction | controlled, uncontrolled and observer-only sheet; callback count per transition; nested Escape; focus return; viewport change while open and while a guard is pending; reopen; cancel/fail/retry; modified and middle clicks; normal and reduced motion | rule 2.5 and §5 steps 2–5 |
| P6 Provenance | exact source SHA, tarball sha512, fixture build ids, baseline images | recorded in the release evidence; independent review verdict "merge" |
| P7 Docs | `docs/components/naeil-header.md`, `application-layout.md`, `package-release.md` stop calling 0.7.1 current and the five-project catalog; new props and host conditions documented | review |

### Home (step 4, real CSS and product paths)

H1 dirty draft guards brand, AI child, Console, footer link and mobile logout with exactly one confirmation; cancel keeps the draft · H2 logout failure → retry; duplicate click → one request · H3 readiness shows unreachable after a failed poll (no cached green) · H4 theme `relaydock-theme` persistence and storage failure, two tabs · H5 ko/en/ja switch · H6 direct comparison against B2 naeil.dev at 1440/390/320 × light/dark × ko/en/ja for the common parts, differences limited to D1–D4 · H7 existing vitest suite, typecheck, lint, build.

H4 also covers first paint (no theme flash) and two tabs. H6 is the owner-facing acceptance; counts of passing tests or a single screenshot are not.

Where the checks run: P1–P5 are added to the existing tools (vitest, `e2e/` Playwright, `scripts/check-consumers.ts` packed fixtures); P4/P5 and the Home profile in P2 are written first and must fail on 0.7.2 (`40a3928`), then pass on the implementation and again on the frozen archive in step 3. H1–H7 run in Home after pinning the exact verified version.

## 7. Versioning and release

- `0.8.0`: API + DOM/style contract change. `contractVersion` stays `1` only if every invariant in `contracts/naeil-chrome.v1.json` (frame, header height, brand heights, desktop brand reservation, footer variants/paths/github, viewports) still passes; otherwise stop and decide a contract change separately.
- `scripts/rollout/prepare-release.mjs` only accepts consecutive stable 0.7.x. 0.8.0 uses the manual exact-archive path in `docs/package-release.md`; the standing `release.json` and rollout policy are not edited to pass it.
- Separate explicit approvals: npm publish, tag, GitHub release (all from the frozen reviewed SHA/archive), naeil-ui `main` merge, Home production deploy.
- naeil.dev imports the header from this repository's source (`src/components/nav-wrapper.tsx`), so merging to `main` upgrades naeil.dev to the 0.8.0 source (default profile; must equal B1 by P1/P3). The merge is held until the owner approves that site impact and timing. Estimate and Jev stay on 0.7.2; STOP stays.
- Rollback: the package is never unpublished or overwritten. Home's source rollback is a consistent revert of its adapter, CSS and manifest/lock together (re-pinning 0.7.2 alone breaks the new props); its operational rollback is the image-only path (previous image on a verified clone of current data).

## 8. Out of scope

React-only shared Logo entry (optional, only with packed-bundle proof), SSO, Home body redesign, the standing-rollout redesign (`feat/standing-rollout-b-20261028`), naeil.dev/Estimate/Jev migration, STOP removal.
