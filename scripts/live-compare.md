# Read-only production acceptance comparison

```sh
pnpm compare:live --out /private/tmp/naeil-live-review
node --test scripts/live-compare.test.mjs
```

Defaults: installed Google Chrome, fresh signed-out context per condition, DPR 1,
and a unique OS temp output directory. `--out` must be outside this repository.
`--channel chromium` selects an already-installed browser; nothing is installed.

The fixed audit matrix is five sites × ko/ja/en × 1440×900 and 390×844 × OS
light/dark × short/long/error. The four services have no audited signed-out long
route: those 48 rows are unmeasured. No authenticated business route is invented.
Home always uses **https://jay-macmini-2.tail165003.ts.net:2455/console**, with
browser language preference. An unreachable proxy is unmeasured; no fallback.
The 404 probes remain real measured documents, even when chrome is absent.

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
- Optional footer product status/version: `.ui-site-footer-meta`.

Both sides use the **union** of measured actual/reference rectangles, including
real text Range rectangles when the suffix overflows its tight line-height box,
rounded outward only to device pixels. No visual heuristics or padding guesses. A missing
required marker makes the band unmeasured. Optional absent slots are explicitly
recorded. Footer comparison crops to the shared brand/column bottoms plus the
real frame bottom padding, excluding optional meta's extra flex row/gap.
Full-height **unmasked** diff images remain supporting evidence and never count.
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

CDP `CSS.getPlatformFontsForNode` records actually rendered families/glyph counts.
Digits are sought first in footer meta, then chrome, then ordinary body text,
then remaining visible text. A real digit substring is temporarily wrapped in a
font-neutral inline span, preserving its parent's computed font properties;
CDP measures that exact substring, and the original text is restored. No sample
text is invented. The parent text/selector and method are retained. A page with
no rendered digits is unmeasured; absence from chrome alone is not sufficient.

Body size/line-height expects 16/25; short footer-to-viewport 0px; long
content-to-footer 96px. Home login intentionally has no footer. The terminal
content algorithm reuses runtime conformance with a catalog `main` fallback.
Missing body metrics on raw errors remain visible (`normal`, Times), not a pass.

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
used. An HTTP 429 response gets at most one read-only retry after Retry-After
(capped at 60s; default 60s); a persistently limited state is unmeasured and the
first response/title observation is retained. Other measured rows still report
their independent contract failures. Missing baseline comparisons remain –.

## Output and counting

`comparison.md`: header/policy, item × site rollup, **distinct observable causes**,
and one compact ✓/✗/– row per condition with screenshot/detail links.
`rows/<id>.json`: full values, masks, geometry/styles and pixel references.
`comparison.json`: aggregate machine-readable data, rollup, grouped causes and
all rows. `screenshots/`, `bands/`, `diffs/`: PNG evidence outside git.

Distinct IDs group identical observations across sites/locales/widths/OS
schemes, independent of numeric variation. They are not claims about code root
causes. For example, missing frame and missing-footer gap on the same bare
error document share one cause; 180 repetitions do not become 180 defects.
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
long routes are invented. This change does not modify package contracts, CI,
service applications, publication or deployments.
