# Acceptance — production receivers accepted; fleet pending

The approved design §12 remains the completion contract. All three deployed receivers are accepted; Jev and Estimate sending is enabled. Site sender activation and final fleet cross-origin/preference acceptance remain pending. [Implementation progress](implementation-progress.md) and [production-progress.json](production-progress.json) record publication, CI, deployed identities and private receipt hashes. The local evidence below remains preserved and is separate from production evidence.

Exact sources, archives and evidence hashes are in [local-final-receipt.json](local-final-receipt.json). All three apps consume `next-intl@4.14.8` and archive SHA-256 `a4a1e312f2f608358a10f9019c248af37a8172bb116d3bc506144442cb963fb4`. A final pack at Site source `455f2f9aedb108606af2f429c18281260eafd2dd` reproduced these bytes. Later documentation commits do not change package or application code.

## Production receiver and sender status

| Service | Accepted production identity | Executed production evidence | Sender state |
| --- | --- | --- | --- |
| Site | Source `09525c1cf0c82cba00ac381ea9491c58f255e694`; artifact `dpl_8mwBJsBVizByNt5sgLxgqz8ginaG` | 41 public HTTP, 29 public browser, 9 existing-session real-auth rows | Disabled; user Vercel email reauthentication and verified sender deployment pending |
| Jev | Source `5f4b1fc07415e450252444efa89f42722b491552`; artifact `jev-ui07-5f4b1fc07415` | 37 public HTTP, 9 existing-session real-auth rows; separately 2 deployed-JS/CSS fictional-backend tests | Enabled; bootstrap 05:30:12.071841–ready 05:30:13.540621 UTC |
| Estimate | Source `cf8ed5ebef085807737438521ad9db5f5c045f8b`; artifact `2a37c7a5-6b50-418f-b035-836c8ad06ceb` | 92 public HTTP, 9 existing-session real-auth rows; separately 5 deployed-JS/CSS fictional-backend tests | Enabled; bootstrap 05:30:35.948986–ready 05:30:37.526269 UTC |

All sender timestamps above are 2026-11-04. Receiver acceptance receipts are `operations/site-receiver-acceptance.json`, `operations/jev-receiver-acceptance.json` and `operations/estimate-receiver-acceptance.json`; their hashes are recorded in the public-safe progress JSON. The raw receipts, real-session details and preserved failure evidence remain private. Relative redirects and equivalent query encoding were corrected in checkers with negative tests; these corrections did not change product code.

Production observations cover live public GETs/browser rendering and read-only existing-session auth checks. Deployed-client state tests bind actual static JS/CSS to frozen artifacts, but their HTML/Flight/auth/API/model/storage are fictional and local. Production expiry, forbidden identities, upstream outages and OAuth/invitation mutations were not induced. Native sender-ready receipts establish activation. At 05:33:32.447 UTC, six authenticated desktop service × locale rows verified native Site brand/footer destinations and visible account controls with identities rechecked and no business/preference mutation (`operations/native-sender-real-auth.json`). Independent public sender proof passed 16 checks; six existing-session native-to-Site brand clicks also preserved the selected locale and authenticated account state. Final fleet cross-origin click/new-tab/copied-href and explicit preference-write acceptance remain pending; existing-session exact auth returns are recorded separately.

The final fleet checker has been directly reviewed by root and passed syntax validation and 66 offline tests. It requires 42 surface/language/viewport cases, actual opened-menu evidence, exact observed chrome destinations, and preference setter calls at the committed URL/language. Original checkers and failed evidence remain preserved. This preparation grants no deployed acceptance: all three accepted sender-on identities must be bound before live execution. Private preparation and root-review receipt hashes are recorded in the progress JSON.

The post-receiver Japanese Estimate calendar entry is reflected in the default-branch README by [PR 1](https://github.com/naeil-dev/abestimate/pull/1), merge `bc6803252543af19c7108e454c7bdd6e3d85ccf8`. Only the approved README line changed. Root verified the default-branch bytes and unchanged deployed Estimate identity; this documentation merge does not integrate the native product branch or redeploy it.

## Activation windows and legacy-hint deadlines

| Service | Receiver timing evidence, UTC on 2026-11-04 | T+90 deadline, UTC on 2027-02-02 |
| --- | --- | --- |
| Site | Integration 05:03:18; first public receiver identity observed 05:04:44.356399. Exact exposure instant is not recorded. | 05:04:44.356399, using the first recorded public observation |
| Jev | Bootstrap intent 05:12:36.450903–ready observed 05:12:37.862674 | 05:12:36.450903, using the earliest recorded activation-window timestamp |
| Estimate | Bootstrap intent 05:18:43.802592–local ready 05:18:44.750125; first public probe 05:19:25.612264 | 05:18:43.802592, using the earliest recorded activation-window timestamp |

Estimate timing uses the immutable bootstrap/ready phase records; the original acceptance receipt remains unchanged and a timing supplement binds the earlier observations. These deadlines add exactly 90 days to the recorded receiver anchors; later sender activation does not restart the period. A source search across Site/Jev/Estimate finds `legacyLocaleHint` only in its shared helper definition and tests, with no application consumer. Apps currently read no legacy storage hints, so there is no active hint reader to disable. Valid old `/en` and `lang` receiving aliases remain indefinitely; T+90 does not remove them.

## Preserved local acceptance

The following table retains the local evidence and the corresponding production scope. The status above identifies what has since been executed; a listed production scope is not a claim of full fleet completion.

| Design §12 area | Executed local evidence | Corresponding production scope |
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
- Built Storybook: Chromium 22 passed; Firefox/WebKit 28 passed and 16 whole-header cases failed at official external whale.png returning Vercel 403 challenge HTML. Initial fonts/geometry and blocked-image usability passed. This local run was not all-browser green. Later [CI run 41775023276](https://github.com/naeil-dev/naeil-ui/actions/runs/41775023276) passed 13 jobs, 1,187 browser checks (4 skipped, zero failures/flakes) and 791 units (5 existing skips); packed whole-header cases loaded official images. That resolves the image-loading verification gap in CI only. The local failure evidence remains preserved. No artwork was bundled or security control changed.

## Limits and next gate

Local browser acceptance uses synthetic auth, fictional data and isolated network destinations; the separate production observations above use actual origins and existing sessions. Site's final local build contains synthetic `NEXT_PUBLIC_SUPABASE_*`: deploy reviewed source through a production-bound Vercel build, never this local build directory. Jev/Estimate auth/origin/sender settings are runtime reads, allowing exact tested archives to use existing managed production configuration. No real account mutation, model run or business write was performed.

Estimate's broad 48-render visual/contrast matrix predates the narrow cookie fix; the successor reran 5 state/mobile/recovery cases and the final acceptance above. Implicit `/favicon.ico` returns safe 404 and logs an invalid-locale diagnostic; request attribution proves it is not a root-redirect failure. Declared SVG favicon returns 200. Jev's recovered deployed source and current source have no favicon asset or metadata declaration. Under the design §7 requirement to retain service identity, this migration preserves that baseline; it does not claim a successful Jev icon-rendering check. Adding an identity asset remains a separate product change. Clipboard coverage uses the browser API plus opening that href, not a native context menu. Navigation tables deduplicate visible destinations and reflect real menus; they do not invent links between every service pair.

The earlier LOCAL-01–05 audit remains history. [local-gap-disposition.json](local-gap-disposition.json) maps findings to final receipts and remaining production scope. Prior development identities and superseded archives are not final evidence.

Normal rollback retains an accepted receiver and disables sending/preferences. Old versions are emergency fallbacks that can reverse unprefixed-English semantics; using them retracts completion. Receiver activation windows and T+90 deadlines are recorded above. Site sender activation and final fleet acceptance remain pending. See [release preparation](release-preparation.md) and [native procedure](native-release-procedure.md).
