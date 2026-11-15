# Read-only production comparison

Run from this worktree with installed dependencies and Google Chrome:

```sh
pnpm compare:live
pnpm compare:live --out /private/tmp/naeil-live-review
node --test scripts/live-compare.test.mjs
```

No dependencies or browsers are installed by the script. `--channel chromium`
selects an already installed Playwright Chromium instead. `--help` prints usage.
Output defaults to a unique OS temporary directory. Output inside the repository
is rejected. Evidence must not be committed.

The audited public addresses are fixed in `SITES` in `live-compare.mjs`:
naeil.dev, abstorm.naeil.dev, abestimate.naeil.dev, jev.naeil.dev, and
**https://jay-macmini-2.tail165003.ts.net:2455/console**. Home always uses that
Tailscale proxy. An unreachable proxy produces “재지 않음/not measured” with a
reason, without falling back to localhost or another origin.

The matrix is ko/ja/en × 1440×900 and 390×844 × OS light/dark × short/long.
Supplementary audited error routes run under both OS schemes as well. There are
180 rows, of which 48 service long-page rows have no signed-out audited route.
Home's locale is selected by browser language preference; no locale control is
clicked. Requested versus rendered language is checked explicitly.

Every row uses a fresh context, DPR 1, blocked service workers/WebSockets, and a
request guard aborting methods other than GET/HEAD. Navigation (30s), fonts and
browser operations (15s), network idle (8s), and icon fetches (10s) are bounded.
No login, form submission or state-changing click is performed. HTTP 404 is
measured as a rendered page rather than treated as a navigation exception.

For a later owner-provided session, scope each opaque state file explicitly:

```sh
pnpm compare:live --storage-state jev=/absolute/path/session.json
```

The script passes the filename directly to Playwright, never parses or logs
contents, and never records raw browser/parser errors. In that context all
cross-origin requests (including redirects, fonts and sibling subdomains) are
aborted to prevent sending credentials to another origin. Such blocking can
leave measurements incomplete. Browser cookie/localStorage origin policies
still apply. The report labels this as supplied signed-in state, not proof of
successful authentication, and records shared account-state markers. It does
not label a remembered theme as a first visit. No authenticated routes are
invented; owner-approved long routes would need a separate route-list change.

`comparison.md` contains one table and the difference count; `comparison.json`
contains values, declared icon links, response status/type/size/SHA-256, rendered
CDP font families and glyph counts, requested/final URLs, versions, timestamps,
and image paths. `screenshots/`, `bands/` and `diffs/` retain PNG evidence.

Counts are **individual differing check cells**, not unique defects. Each OS,
language and viewport counts separately. Missing checks are never passes:
exit 1 means differences, exit 2 means incomplete without differences or a
fatal setup failure, and exit 0 requires all checks measured and matching.
Absent script-isolated Latin/digit/Japanese samples are explicitly unmeasured.
Mixed-script CDP results cannot reliably assign individual glyphs to families;
the raw body sample remains in JSON, with its verdict marked unmeasured.

The footer gap reuses runtime conformance's terminal visible content algorithm,
with a plain `main` fallback for naeil.dev. Short-page bottom gap expects 0px;
long-page content-to-footer expects 96px (0.5px numeric tolerance). Home login
intentionally has no footer. Bare error pages fail frame and theme checks.

Pixel comparison uses the naeil.dev short page at the same locale, viewport,
OS scheme and actual theme, aligned at the bands' top-left. It uses exact RGBA,
no masks, and counts unequal dimensions as differing pixels. Red indicates a
channel delta >16, amber 1–16. **Intentional service names, catalog navigation,
account presentation and version metadata can differ too.** Read the images;
the count alone does not identify regressions. Reference self-comparisons are
labeled with both image paths. A different actual locale/theme is unmeasured,
never compared under a misleading requested condition.

Declared icon metadata is compared as well as canonical paths. Playwright 1.63
itself aborts exact `/favicon.ico` requests before user route handlers, so icons
use anonymous Node GETs to the exact canonical/declared addresses with only the
browser User-Agent, never browser cookies or storage state. Each GET has a 10s
timeout; redirects are recorded without following them. Transport failures and
missing baselines are unmeasured rather than asserted as byte differences.
A measured missing icon is a difference even if another format provides a
browser fallback.

This script implements plan stage 3's live comparison only. It does not change
package contracts, runtime conformance, service CI, deployments or audit history.
