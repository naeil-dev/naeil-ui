# Acceptance contract — Naeil Home on the complete NaeilHeader / NaeilFooter (0.8.0)

Status: **draft for review** (2026-10-28). Source base `40a3928` (origin/main). Owner-approved direction: Home renders the complete `NaeilHeader` and `NaeilFooter`; it does not compose header parts. This document fixes the scope and the gates before any code is written. Implementation, publication, main merge and Home deployment are separate steps with separate approvals.

## 1. Baselines

| Id | What | Identity |
| --- | --- | --- |
| B1 | Package baseline — what a default consumer sees today | `@naeil/ui@0.7.2` registry tarball, `sha512-QlFPjSZdBIDqVxRy930RlmNyztQG0SzvkOp4E64Sw950mNtH1XlyPXPh/4PJ8p4ki9CpFREbglyB5DJOEg1C4w==`, source `40a3928` |
| B2 | Official screen | `https://naeil.dev/{ko,en,ja}` serving `data-naeil-ui-version="0.7.2"`, `data-naeil-ui-contract="1"` (observed 2026-10-28 10:13 JST) |
| B3 | Approved Home product parts | Home production image `fda72ac5` (Home main `5b39c839`, #136): placement of the `Home` qualifier, readiness dot and footer version row |

New renders are never promoted to expected values on their own. A new baseline image is fixed only after a person has checked that the differences from B1/B2 are exactly the allowed ones in §3. The 0.7.1/0.7.2 references stay untouched.

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

1. **Omitted = unchanged.** With none of the new props, the DOM, computed styles, geometry and behavior equal B1 for every existing prop combination (catalog/blog, `subNav`, `projects`, `translations`, `resolveHref`, `brandSlot`, `brandLinkProps`, `brandLinkComponent`, `toolbarSlot`, `currentProjectKey`). The only permitted DOM additions are the data attributes of §4 on chrome roots and portals.
2. **Order.** catalog → blog → `appNavigation` → flat `subNav`. Home passes `showProjects={false} showBlog={false}`. `appNavigation` items reach `Navigation` unchanged (id, columns, href, active, icon, description, badge, external, target).
3. **Brand.** `brandSlot` keeps overriding the whole brand content; then `brandSuffix` is ignored (documented). Without `brandSlot`, the package renders Logo + suffix inside the brand link and owns its size, weight, gap and optical alignment. The accessible name stays overridable via `brandLinkProps["aria-label"]` (Home passes `Naeil Home`).
4. **Status.** `statusSlot` renders exactly once, after the brand link and outside it, in the header row at every width (desktop and below 48rem), never inside the sheet. No status wrapper is rendered when it is omitted.
5. **Sheet.** `mobileOpen`/`onMobileOpenChange` follow the Radix controlled/uncontrolled convention: both omitted → internal state as today. Controlled or not, the sheet closes on route change (`currentHref`), on crossing to the desktop layout, on Escape/close/overlay and on ordinary link selection, reporting each through `onMobileOpenChange(false)`. Modified clicks never close it.
6. **Toolbar.** Home uses the default toolbar (theme, locale, separator, `authSlot` = `NaeilHeaderAccountControl`). `toolbarSlot` is not a migration path.
7. **Footer.** `NaeilFooter` API is unchanged; Home keeps `variant="full"`, `Link`, `meta`.
8. **Package does not know** authentication, unsaved state or pending logout; Home keeps the request lock and busy state above the header (existing AGENTS rule).

## 3. Allowed differences (Home vs B1/B2) — exactly four

| # | Part | Home owns | Package owns |
| --- | --- | --- | --- |
| D1 | Menu items | data: `AI` group (대시보드 `/`, API 키 `/keys`, 모델 연결 `/connections`, Auto `/auto`; icons, descriptions) and `Console` `/console` | trigger/link/popover/sheet rendering, styles, interaction |
| D2 | `Home` qualifier | the string and the brand accessible name | font, size, gap, optical center (B3: 14px, 4px gap, ink center within 0.25px of the wordmark center) |
| D3 | Readiness dot | content: 8px dot, ok/down/checking color, accessible status text | slot position (B3: 8px after the brand link, vertically centered) |
| D4 | Footer version row | the `meta` text | the meta row's rendering (existing) |

Everything else — header height 65px, frame (1600 / `clamp(16px, 2.4vw, 40px)`), brand 28px, toolbar order/size/spacing/separator, 44px targets, account and locale menus, popover and sheet, footer content/columns, colors, typography, focus rings — must equal B1/B2 under matching viewport, theme and locale. Anything not in this table is a defect, not a fifth difference.

## 4. Package-owned typography and portal markers

Today header/footer typography is inherited from the host `body` (`globals.css` base layer). A host with a different body font, size, line-height or smoothing changes the chrome; Home works around it with a selector that guesses the locale portal by its ko+en+ja options (`frontend/src/styles/chrome.css:7-20` in Home). The package takes this over:

- Stable markers: `data-naeil-chrome` on the header root, the footer root and every portal NaeilHeader opens (navigation popover, sheet, account menu, locale menu); additionally `data-naeil-locale-menu` on the locale `SelectContent`. Generic `Navigation`/`Select`/`DropdownMenu` used without NaeilHeader get no marker and no new styles.
- On marked roots the package sets: `font-family: var(--font-sans)` with the `:lang(ja)` Noto Sans JP override, `font-size: var(--text-base)`, `line-height: var(--leading-normal)`, antialiased smoothing, and the line-heights of text utilities the chrome itself uses (e.g. the sheet title `text-xl`), so host Tailwind theme values cannot change them.
- Font files stay consumer-supplied (unchanged policy, `docs/design/v2-migration.md:131`). No Shadow DOM, provider, global reset or `!important`. No promise to win against arbitrary stronger host CSS; the supported host conditions (layers, role/element selectors in host `@layer base`, both `globals.css` and `theme.css + components.css` paths) are documented in `docs/components/naeil-header.md`.

## 5. Mobile dirty logout (Home flow the API must allow)

1. Operator opens the sheet, opens the account menu, chooses 로그아웃 while a draft is dirty.
2. Home sets `mobileOpen=false`, then calls its existing `requestNavigation` (no hidden `Dialog.Close`).
3. Exactly one dialog is visible — the discard confirmation — and it owns focus; the sheet's focus trap is gone.
4. Cancel: draft retained, no logout request, focus is not trapped. Discard: one logout request; busy state until it settles; failure allows retry; duplicate activation sends nothing.

The package proves steps 2–3 with a fake guard (callback order, single dialog, focus); Home proves 1–4 with its real guard and API.

## 6. Gates

### Package (step 3, on the frozen archive)

| Gate | Matrix / content | Pass |
| --- | --- | --- |
| P1 Compatibility | packed tarball in the React (no Next) and Next fixtures; all existing props of rule 2.1 | build + tests green; default-profile DOM/computed styles equal B1 apart from §4 markers |
| P2 Home profile | `appNavigation` AI+Console, `statusSlot`, `brandSuffix="Home"`, controlled sheet | ids/order/`aria-current`/accessible names; D2/D3 placement equals B3 |
| P3 Visual vs approved baseline | ko/en/ja × light/dark × 320/390/1440 and both sides of the 48rem container boundary; closed, open AI popover, open sheet, open account menu, open locale menu; header + footer | geometry within 0.01px and computed color/background/border/font-family/size/weight/line-height/letter-spacing/opacity/smoothing equal to B1, except D1–D4; no page overflow; 44px targets |
| P4 Host-CSS independence | a hostile host fixture with Home-like body font/size/line-height/smoothing, role-based `menuitem` sizing, its own Tailwind theme; plus a body `Select` containing ko/en/ja options | chrome equals P3 results; the body Select and body menus keep host styles (zero chrome rule matches) |
| P5 Interaction | controlled and uncontrolled sheet; Escape and focus return; viewport change while open and while a guard is pending; reopen; cancel/fail/retry callbacks; modified and middle clicks | as rule 2.5 and §5 steps 2–3 |
| P6 Provenance | exact source SHA, tarball sha512, fixture build ids, baseline images | recorded in the release evidence; independent review verdict "merge" |
| P7 Docs | `docs/components/naeil-header.md`, `application-layout.md`, `package-release.md` stop calling 0.7.1 current and the five-project catalog; new props and host conditions documented | review |

### Home (step 4, real CSS and product paths)

H1 dirty draft guards brand, AI child, Console, footer link and mobile logout with exactly one confirmation; cancel keeps the draft · H2 logout failure → retry; duplicate click → one request · H3 readiness shows unreachable after a failed poll (no cached green) · H4 theme `relaydock-theme` persistence and storage failure, two tabs · H5 ko/en/ja switch · H6 direct comparison against B2 naeil.dev at 1440/390/320 × light/dark × ko/en/ja for the common parts, differences limited to D1–D4 · H7 existing vitest suite, typecheck, lint, build.

H6 is the owner-facing acceptance; counts of passing tests or a single screenshot are not.

## 7. Versioning and release

- `0.8.0`: API + DOM/style contract change. `contractVersion` stays `1` (frame, footer destinations and header height do not change); if any of those invariants changes, stop and decide a contract change separately.
- `scripts/rollout/prepare-release.mjs` only accepts consecutive stable 0.7.x. 0.8.0 uses the manual exact-archive path in `docs/package-release.md`; the standing `release.json` and rollout policy are not edited to pass it.
- Separate explicit approvals: npm publish, tag, GitHub release, naeil-ui `main` merge (Vercel deploys naeil.dev), Home production deploy. naeil.dev, Estimate and Jev stay on 0.7.2; STOP stays.

## 8. Out of scope

React-only shared Logo entry (optional, only with packed-bundle proof), SSO, Home body redesign, the standing-rollout redesign (`feat/standing-rollout-b-20261028`), naeil.dev/Estimate/Jev migration, STOP removal.
