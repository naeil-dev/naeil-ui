# Acceptance — final local candidates, not deployed

The approved design §12 remains the completion contract. This table records executed local evidence; every production row still needs a deployment receipt. No publication, push, merge, tag, deployment or sender activation has occurred.

Exact sources, archives and evidence hashes are in [local-final-receipt.json](local-final-receipt.json). All three apps consume `next-intl@4.14.8` and archive SHA-256 `a4a1e312f2f608358a10f9019c248af37a8172bb116d3bc506144442cb963fb4`. A final pack at Site source `455f2f9aedb108606af2f429c18281260eafd2dd` reproduced these bytes. Later documentation commits do not change package or application code.

| Design §12 area | Executed local evidence | Remaining deployed acceptance |
| --- | --- | --- |
| One URL | Common parser/builder and registered routes; canonical en/ko/ja; no newly generated `/en` or `lang`; exact generated destinations | Public identities and all language paths |
| Entry and preference | URL beats cookies/browser hints; actual cookie setter drop/throw; two live tabs, passive visits, history/reload/prefetch/auth return; duplicate host/domain cookies, cleanup and expiry on isolated HTTPS hostnames | Real production origins and cookie domain |
| Direct entry/server | Built document/Flight, deep-link reload, provider/html/title agreement; marker spoofing and Next 16 stripped-Flight classification | Production build, ingress and cache behavior |
| Common implementation | Shared server/provider/controller/loader/chrome, exact next-intl, packed dependency/context boundary; no independent locale history engine | Registry download and deployed-source identity |
| Dictionaries | Common `naeil` and app JSON; shared ICU/key/type/namespace gates; Site 238 keys and Estimate 753 keys per locale; invitation 29 keys × 3 moved without transport changes | Runtime missing-key observations |
| Connections | Site 48 rendered edges × 3 opening modes per sender mode plus invitation exits; Jev 28 navigation observations per mode; Estimate 30 action/guard rows, 99 internal-link interactions and 27 visible chrome interactions per mode. Separate all-pair builder contracts | Actual cross-origin click/new-tab/copied-href and central-login return matrix |
| Compatibility | Single-hop legacy `lang` and `/en`, invalid/duplicate rejection, filters/query/hash, exact returns; protocol aliases rejected | Public receivers and old entry links |
| Work lifetime | Jev streams/readers/prompt/results; Estimate raw invalid input, undo/redo, dialogs, selection/revision/document snapshots; no locale-only save/abort/reset/refresh; stale/new payload/session changes | Deployed artifacts with isolated fictional network fixtures and authenticated read-only checks |
| Full wording | Entire Estimate UI; three-language screen/aria/title checks; error keys follow committed locale; user input/results/document language remain data | Deployed rendering and missing-key observations |
| History/routing | Common replace/popstate and guard distinction; pending/rapid choice, held/failed RSC, expired recovery, beforeunload cancel/confirm, OAuth return; supported/unsupported Navigation API | Actual deployment/browser observations; confirmed document exit is not stream preservation |
| Auth boundary | Site full auth suite; Jev protected root/recovery; Estimate 9 protected routes × 3 locales × 5 identities × document/Flight = 270 rows per mode plus 12 rotation rows. Exact invite/relay/return and encoded/nested/prefixed defenses | Real session/returns and permitted account states; synthetic 403/503 are not production-provider outage tests |
| Search | Actual canonical/hreflang/x-default/sitemap/HTTP Link/cache; all 6 missing-translation selector pairs use list/original fallback; missing translation 404. Sitemap/assets stay static; user routes retain baseline dynamism | Deployed HTML/head/cache and sitemap |
| UI/storage | Final Site 223/223; Jev/Estimate locale/state/metadata checks; contrast, packed React/Next and actual Storybook below | Production desktop/mobile/account states/preferences; external-artwork limit |
| Rollback | Independent emergency baselines: Site 40, Jev 64, Estimate 165 probes; frozen artifacts and reviewed native switch/recovery proposal | Fresh ownership/installed-code/latest-data preservation, exposure time and recovery receipts |
| Home/scope | Home excluded by design; Baby explicitly excluded. Cloudflare inventory complete: 4 DNS records, 1 healthy tunnel, 3 public routes; no additional UI found in inspected zone/account | Recheck if operational inventory changes |

## Final local gates

- Shared/Site: 791 units passed, 5 existing skips; types, contrast and full lint passed (3 inherited warnings). Exact 175-file boundary and clean packed React/Next build/types/SSR/browser checks passed. Final Site build `naeil-language-455f2f9aedb1`: 82 sender-off + 82 sender-on + 59 original visual/auth/focused = **223/223**. This includes the corrected nested password-change title template.
- Jev product source `5f4b1fc07415e450252444efa89f42722b491552`, build `G2swU7GBFotEIQR2tJRGv`: 137 units; 26 receiver/20 sender RSC checks; additional 16/16 gap suites, 10 proxy and 1 public-origin-over-loopback ingress check. Tests/docs HEAD `4a35845358f32780df7f7ccba38e0c732ec11063` leaves product bytes unchanged.
- Estimate product source `cf8ed5ebef085807737438521ad9db5f5c045f8b`, artifact `2a37c7a5-6b50-418f-b035-836c8ad06ceb`: 729 units, 23 sender-on and 28 sender-off/state tests, 16 integrity and 62 smoke checks passed. Tests/docs HEAD `a5c0cd24e5019c613009cd5e786eedd6c917d99a` leaves product bytes unchanged. The successor fixes confirmed refreshed-cookie loss through stale `NextResponse.cookies`. Failing `cdff34f` bytes/receipt remain preserved and are not the release candidate.
- Built Storybook: Chromium 22 passed; Firefox/WebKit 28 passed and 16 whole-header cases failed at official external whale.png returning Vercel 403 challenge HTML. Initial fonts/geometry and blocked-image usability passed. This is an external-image verification limit, not an all-browser-green result. No artwork was bundled or security control changed.

## Limits and next gate

Browser acceptance uses synthetic auth, fictional data and isolated network destinations. Site's final local build contains synthetic `NEXT_PUBLIC_SUPABASE_*`: deploy reviewed source through a production-bound Vercel build, never this local build directory. Jev/Estimate auth/origin/sender settings are runtime reads, allowing exact tested archives to use existing managed production configuration. No real account mutation, model run or business write was performed.

Estimate's broad 48-render visual/contrast matrix predates the narrow cookie fix; the successor reran 5 state/mobile/recovery cases and the final acceptance above. Implicit `/favicon.ico` returns safe 404 and logs an invalid-locale diagnostic; request attribution proves it is not a root-redirect failure. Declared SVG favicon returns 200. Jev preserves its deployed baseline's lack of a favicon. Clipboard coverage uses the browser API plus opening that href, not a native context menu. Navigation tables deduplicate visible destinations and reflect real menus; they do not invent links between every service pair.

The earlier LOCAL-01–05 audit remains history. [local-gap-disposition.json](local-gap-disposition.json) maps findings to final receipts and remaining production scope. Prior development identities and superseded archives are not final evidence.

Normal rollback retains an accepted receiver and disables sending/preferences. Old versions are emergency fallbacks that can reverse unprefixed-English semantics; using them retracts completion. Production activation and T+90 sunset timestamps are not assigned. See [release preparation](release-preparation.md) and [native procedure](native-release-procedure.md).
