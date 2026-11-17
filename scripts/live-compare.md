# Read-only production acceptance comparison

```sh
pnpm compare:live --out /private/tmp/naeil-live-review
node --test scripts/live-compare.test.mjs
```

Defaults: installed Google Chrome, fresh signed-out context per condition, DPR 1,
and a unique OS temp output directory. `--out` must be outside this repository.
`--channel chromium` selects an already-installed browser; nothing is installed.

The fixed audit matrix is five sites × ko/ja/en × 1440×900 and 390×844 × OS
light/dark × short/long/error, plus naeil's `/{locale}/blog/does-not-exist`
as `error-blog` (192 conditions total). The four services have no audited signed-out long
route: those 48 rows are unmeasured. No authenticated business route is invented.
Home always uses **https://jay-macmini-2.tail165003.ts.net:2455/console**, with
browser language preference. An unreachable proxy is unmeasured; no fallback.
The 404 probes remain real measured documents. React not-found screens require
the full frame; positively identified locale-layer fallbacks use the D6 contract.

All browser requests except GET/HEAD are aborted, and service workers/WebSockets
are blocked. No login, submit or state-changing click is performed. Navigation
has a 30s timeout, fonts/CDP/browser operations 15s, network-idle 8s, icon GETs
10s. Title/lang/theme/h1 must be stable for 600ms, with a visible h1 on framed
pages (bounded at 15s). The title is re-read at the end of measurement too,
with both snapshots retained. A service error state is not presumed to be
a transient hydration error; same-origin document/fetch response paths and
statuses are retained without bodies, cookies or query strings.

## Intended differences and masks

`live-compare-chrome.mjs` defines the complete policy and source-owned selectors.
Every row records exact CSS rectangles, selector, required/optional status,
frame measurements and element styles before any screenshot can scroll.

- Service suffix: `.naeil-header-brand-suffix`; required on service headers,
  intentionally absent on the catalog.
- App/catalog navigation: `.ui-navigation-desktop`; marker required even if
  empty/hidden. No service or catalog tab text is a pixel acceptance target.
- State-dependent toolbar placement: `[data-app-toolbar]`; required. This band
  region is masked because Home login suppresses account and moves the other
  controls. Theme, locale and same-state account geometry/styles are each checked
  separately, so masking placement does not suppress those invariant checks.
- Account state: `[data-naeil-account-state]`, plus optional
  `.naeil-header-separator`; Home login has an explicit account suppression.

Both sides use the **union** of measured actual/reference rectangles, including
real text Range rectangles when the suffix overflows its tight line-height box,
rounded outward only to device pixels. No visual heuristics or padding guesses. A missing
required marker makes the band unmeasured. Optional absent slots are explicitly
recorded. Footer comparison has **no masks or height cropping**: the entire
footer band and extra height count. Raw supporting diff images never count.
The counted `footerMeta` check requires no non-empty meta row on every site;
absent/empty passes, and non-empty reports its text. The public meta API remains
available to standalone/generic compositions and existing consumers, while
owned services leave it empty.
Comparison-only band captures snap their origin to integer CSS pixels, removing
raster-phase changes caused by a page's fractional content height. The relative layout offset
is recorded and restored (not a compositor transform); original viewport/band images remain untouched.
The counted pixel metric uses the audit's **channel delta >16** tolerance for
GPU/antialias noise. All nonzero pixels are still recorded: red >16, amber 1–16.
Computed colors/styles separately catch semantic color changes below that noise
threshold. Neither a tolerance nor normalization adds an unlisted mask.

Symbol and outlined `.naeil` wordmark use the generated artwork's active
`data-naeil-brand`/`data-naeil-variant`/`data-naeil-palette` marker hierarchy.
Their relative geometry and styles are checked separately. Toolbar theme uses
`data-slot=button`, locale `data-naeil-focus-id=locale-control`, account
`data-naeil-account-state`. Footer brand, columns, labels and links use shared
SiteFooter markers/classes. Missing/ambiguous markers are unmeasured.

Positions are relative to frame left/right/top edges; absolute footer position
and service suffix width do not enter the comparison. Theme/locale subtract the
**measured** trailing account reservation from the frame's right content edge.
Geometry and resolved layout lengths use 0.5px tolerance; other listed computed
styles compare exactly. Zero-width/unpainted border colors are retained in raw
computed styles but excluded from comparison (they cannot paint a difference). Different
account states have no same-state reference and are unmeasured. Controls hidden
in a closed mobile menu are unmeasured; this script does not open that menu.

## Fonts, icons and page checks

CDP `CSS.getPlatformFontsForNode` records actually rendered families/glyph counts
per script run. U+0020–007E and U+00A0–00FF (including `·`) expect Pretendard;
Japanese kana/kanji/punctuation outside those ranges expect Noto Sans JP.
A mixed Japanese body sample checks each run independently. Digits are sought
first in footer meta, then chrome, ordinary body and remaining visible text.
Only real text is copied into temporary fixed-position probes with the source's
resolved typography. No original text is changed, and probes cannot reflow the
page. Fonts are measured last, after all geometry/screenshots/icons/identity
checks; the probes are then removed. Source selectors, exact runs and CDP
families are retained. No invented sample text or aggregate mixed-font verdict.

Body size/line-height expects 16/25; short footer-to-viewport 0px; long
content-to-footer 96px. Home login intentionally has no footer. The terminal
content algorithm reuses runtime conformance with a catalog `main` fallback.
Missing body metrics on raw errors remain visible (`normal`, Times), not a pass.

D6 classification requires no shell/main/React root, a direct `body > h1`
matching the HTTP error status, a direct message paragraph and the locale-layer
`ul > li > a[lang]` structure. Detection does not depend on passing lang, title
or style requirements. Evidence is retained in `document.evidence`. A bare Home
proxy 404 has no such structure and retains all ordinary checks.

The separate fallback item set is **colours / stack / metrics / links / lang /
title**, plus the existing icon response check. Colours require an opaque dark
computed background (relative luminance ≤0.1), light foreground (≥0.5), contrast
≥7 and `color-scheme: dark`. Stack requires declared Pretendard before Noto Sans
JP plus system/sans fallbacks; loaded webfonts are not required. Body is 16/25;
ko/ja/en home links must be nonempty and same-origin (`/` is the default English
home alias); lang/title retain their
normal rules. Frame/gap, theme class, rendered fonts and chrome comparisons are
explicitly **not required (fallback document, D6)**, shown as `n/r` in the header,
rollup and each row, separate from unmeasured. D6-only checks are n/r on ordinary
documents. An informational, uncounted line records framed/fallback/unframed
unknown/error routes per site so the owner can decide whether to frame them.

Playwright 1.63 aborts exact `/favicon.ico` requests before user routing. Icon
status/SHA-256 collection therefore uses anonymous Node GETs to the exact
canonical and declared addresses, with browser User-Agent only: no cookies,
state, authorization or followed redirects. Missing optional `type`/`sizes` and
cache-busting query differences are notes, not file-byte or HTTP failures.
Transport/baseline failure is unmeasured; real 404s and wrong hashes differ.
A baseline icon must itself be HTTP 200 with an image MIME type: an HTTP error
or security challenge body can never become a reference hash. A real 404
is still reported if the reference is unavailable.

A Vercel HTTP 403 security checkpoint pauses that origin for the rest of the
run, records its conditions as unmeasured, and prevents its content or hashes
from becoming a baseline. No checkpoint bypass or stale/alternate baseline is
used. An HTTP 429 response makes the row unmeasured, with response path/status
and Retry-After retained. There are no automatic retries. Other measured rows still report
their independent contract failures. Missing baseline comparisons remain –.

## Output and counting

`comparison.md`: header/policy, item × site rollup, **distinct observable causes**,
and one compact ✓/✗/–/n/r row per condition with screenshot/detail links.
`rows/<id>.json`: full values, masks, geometry/styles and pixel references.
`comparison.json`: aggregate machine-readable data, rollup, grouped causes and
all rows. `screenshots/`, `bands/`, `diffs/`: PNG evidence outside git.

Distinct IDs group identical observations across sites/locales/widths/OS
schemes, independent of numeric variation. They are not claims about code root
causes. For example, missing frame and missing-footer gap on the same bare
non-fallback error document share one cause; matrix repetitions do not become
separate defects. A footer pixel failure shares the `footer-meta` cause only
when the row has non-empty meta and every above-tolerance changed pixel lies
inside measured meta boxes or extra height explained by measured meta flow with unchanged frame styles. This is diagnostic
attribution only: all pixels/height remain counted, and any change outside that
footprint keeps a separate pixel cause.
Per-check-cell counts remain secondary, with partial coverage explicit.
Exit 1: distinct differences >0; exit 2: incomplete without differences or setup
failure; exit 0: measured complete and matching. Unmasked diffs never count.

## Optional owner-provided session (present, live use unverified)

```sh
pnpm compare:live --storage-state jev=/absolute/path/session.json
```

Playwright alone consumes the opaque file; the script never parses, copies or
logs contents and never emits raw browser/parser errors. All cross-origin
browser requests (even sibling subdomains/redirects) are blocked with supplied
state, which can leave fonts/assets unmeasured. Icon GETs remain anonymous.
Supplied state is not proof of authentication; shared account-state markers
are recorded. Remembered theme is not labeled as first visit. No authenticated
long routes are invented. The comparison does not modify service applications, publish packages or deploy.

Supplied-state rows retain remembered themes. The report records each rendered theme and counts `sharedTheme` mismatches between naeil.dev-domain sites under the same OS scheme. A missing peer stays unmeasured. Home is excluded because its registrable host cannot share the cookie; fresh signed-out first-visit checks are unchanged.
