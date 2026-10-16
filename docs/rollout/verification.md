# Shared UI rollout verification — 2026-10-16

**Local implementation and frozen candidate verification are complete for the site, estimate and the proven Baby frontend. Production convergence is incomplete.** No new publication, push/merge, production replacement, standing activation, DNS/tunnel/auth change or private dataset access occurred. The completed 0.6.0 release is unchanged. The read-only coordinator plan has live actions disabled; aggregation returns `complete:false` and DNS inventory unresolved.

## Implemented and frozen

Canonical `NaeilFooter` centralizes EN/KO/JA home/Projects/Blog/GitHub destinations in full/compact variants. All canonical anchors use the supplied Link and navigation interception; generic SiteFooter, legacy Footer and intentional overrides remain public. Header/footer expose UI/contract metadata, and applications expose only build-bound public identity fields. Estimate removes divergent outer gutters and preserves list1440/settings640/short-form480 behavior. Baby preserves its PIN/API boundary and Korean-only controls. The package's five official image URLs remain external references.

| Candidate | Frozen source | Artifact identity | Scope |
| --- | --- | --- | --- |
| UI0.7.0 / contract1 | `3b13e9534cfe7a83caa59c0df6e49b755cdce89c` | archive `f15f9a06020edb14aa41b74e07f7925c970c55adbd733bdf8adcf3942535693d` | Unpublished package; 164631 bytes,138 files |
| Independent Storybook reference | Same UI source | `6c8511f3fa4770a3a5653a7efdc4689d9afa3e94781d8406fc6b433123dfd771` | 48 cases: 3 locales ×4 widths ×2 themes ×2 footer variants |
| naeil local standalone | Same UI source | `naeil-ui07-3b13e95-review`; tar `1e032bcf84bc9afaaef2a0046c369af8f8977cc02edf419ab71628d985226579` | Local compatibility artifact, **not** a Vercel prebuilt deployment payload |
| Estimate | `cc4b6dee738eafb6d6f97000de4ba8b4b15f8c02` | release `cc4b6dee738e-fbed79a686e1`; build `73b8972b-918f-42c3-9fb3-4bb7fdc6ecf5` | Immutable standalone app/source package; synthetic data only |
| Baby frontend | `a516d875a30fe7d4285df0a88c77b4531434f135` | `sha256-47960e5718a189076350379dc337076cf6f6b5670afaf8bec54b47cf46b4d287`; tar `cd15106b3e9b4f282fb1a8f5a4c7479645d72ae5671da14577e009e5b4b27bf3` | Static dist only; complete backend image is not frozen |

[release.json](release.json) binds source/archive/reference. Both inputs are included under [frozen/](frozen/). Its GitHub asset URLs are intended future publication locations, not live receipts. The archive is also retained in the local SHA-addressed candidate store. Consumer artifact paths, hashes and build identities are in [site receipt](evidence/naeil-candidate-artifact.json), [estimate receipt](evidence/estimate-candidate-receipt.json) and [Baby receipt](evidence/baby-candidate-receipt.json). Baby's separate evidence commit is `09b8bc6`; later documentation/config commits do not silently change frozen application source.

## Executed checks

- Shared:80/80 units, types, token consistency, contrast, package/site/Storybook builds. Lint has zero errors and one historical logo-study warning. Final archive boundary plus separate actual-tarball React/Next installation, typecheck, builds, SSR, browser/fonts and server-safe release metadata passed. No repository alias substitutes for packed consumption.
- Actual Storybook:17 Docs checks and the frozen48-case reference passed. Full three-engine browser run recorded352 passes,4 expected conditional skips and4 Firefox assertions at43.999969px against44px. A0.001px serialization tolerance fixed the assertions; the separate focused Firefox run passed5/5. These are distinct runs, not a fabricated356-pass run. WebKit's font readiness hang was corrected by loading/checking required faces.
- Coordinator/platform/updater/geometry:40/40 tests. Real pinned pnpm under `CI=true` updated fictional archives and then passed frozen installation. Tracked manifest/lock/vendor symlinks are rejected. Synthetic platform interruption, stop/expiry, partial-failure, exact identity/reference, wrong CSS override and redirect rejection checks passed; no real Vercel/native activation was executed.
- Estimate final source:616/616 unit tests in42 files, types/lint/build/package pass. Final immutable candidate passes61/61 smoke,17/17 integrity,32/32 header/footer E2E and a further17/17 integrity check after browser execution. All use dedicated Node24.21.0 and fresh temporary data. Current E2E covers invalid raw drafts, flush-before-navigation, save401/409/503, modified clicks, menu focus/touch and responsive frame behavior. Existing wider synthetic checks cover autosave/logout and company/calendar workflows; their separate scope is retained in estimate's evidence.
- Baby:lint/build,9 synthetic browser cases and an isolated FastAPI/Starlette check of the actual mounting/middleware block pass. All family API requests were intercepted with empty synthetic fixtures. Full application import/startup, backend test suite and real PIN/provider auth are unverified.

The final independent comparison uses the same frozen reference, exact identity before/after and actual menu/theme/font behavior:

| Candidate | Actual local coverage | Result |
| --- | --- | --- |
| naeil |30 canonical destinations across EN/KO/JA ×390/768/1440/1920 ×light/dark |240 conditions pass; [first15 routes](evidence/naeil-render-verification.json), [remaining15](evidence/naeil-additional-render-verification.json) |
| Estimate |login/list/settings/editor/compare/calendar ×same4 widths ×light/dark, JA |48 conditions pass; [receipt](evidence/estimate-render-verification.json) |
| Baby |PIN login and synthetic dashboard ×same4 widths ×light/dark, KO |16 conditions pass; [receipt](evidence/baby-render-verification.json) |

At1920/light every checked route deliberately receives the wrong1280px/24px consumer override; the independent contract rejects it. Expectations never come from consumer CSS tokens. Local checks carry `scope:local-synthetic-candidate` and `productionVerified:false`; they are not operational receipts. English site destinations are unprefixed under next-intl's default-locale policy; registered `/en/...` aliases have explicit expected destinations. Alias redirect coverage is separate from destination rendering.

Main opened final frozen reference and consumer screenshots as well as earlier full-page Storybook/estimate/Baby captures. Representative shared-chrome images are under [screenshots/](evidence/screenshots/); complete local render captures are retained at `~/.local/share/naeil-ui-rollout/comparisons/3b13e95/`. Impeccable context/harden/craft guidance and its final changed-shared-UI detector were actually used; the detector returned no findings. No external design source was adopted. Aside attach to the existing Cloudflare login tab timed out at `Page.enable`; authenticated DNS discovery is unperformed.

## Review and corrections

Three native collaboration workers used **GPT-6.1-Sol/high**, with separate implementation/review scopes for estimate, inventory/Baby and rollout automation. This was native collaboration, not a claimed Paseo model run. Main inspected actual diffs, logs, identities and images and integrated fixes.

Resolved findings include canonical brand44px hit area; client-only metadata breaking a Next server fixture; consumer h2 style leakage; login redirect false positives; reference/archive/source binding; forced themes masking provider failure; and packaging a changed checkout under an old build identity. Later independent reviews found unmanifested Vercel cwd configuration, stale Estimate rollback configuration and updater CI/symlink failures. All were corrected and independently rechecked. A final integration check also separates the website checkout from the automation/config commit and generates ignored package output before archive comparison; the fresh exact-source adapter probe passed real frozen installation/package generation and reproduced the exact archive digest. A separate reviewer checked this final wiring and23 coordinator tests passed. [Probe receipt](evidence/naeil-exact-source-update.json). Vercel rejection probes and8 tests pass; Estimate activate→rollback regression uses unchanged coordinator mappings and preserves newer synthetic data.

The first local standalone host used127.0.0.1, while next-intl normalized its internal rewrite tolocalhost; running the isolated server with matchinglocalhost fixed the local redirect loop without changing product routing. The font checker now accepts registered static/variable Pretendard faces in the approved stack and rejects unrelated or missing fallback fonts, with real browser regressions. Estimate's initial integrity checker incorrectly required an unbundled UI package.json; its corrected verifier binds frozen source/archive/lock/literal release metadata/build identity instead. A new clean commit/build/package includes that fix; the earlier6e182c6 candidate is superseded, not presented as final.

Raw command output is gzip-compressed byte-for-byte under [evidence/](evidence/), including earlier failures. Browser report/harness bytes are retained too. Current final source and artifact receipts identify exactly which later runs passed.

## Actual production and remaining gates

| Service | Last established operating state | This work |
| --- | --- | --- |
| naeil.dev / hosted Storybook |UI0.6.0/source549c501; Vercel7110237014 / Pages7110742787 |0.7.0 frozen locally; absent new production identity prevents asserting current convergence |
| abestimate |UI0.5.0, current `b305c0432420-4928a714c529`, sourceb305c043 |Final0.7.0 candidate verified; current pointer rechecked unchanged |
| Baby |Pre-migration dashboard, no shared package; frontend source reproduced |Frontend candidate verified; backend revision/image/deployment unresolved |
| Jev |Installed UI0.2.0, release20261005T000213Z; dirty source snapshot |Exact reproducible source unresolved |
| Home |Operating origin/source unresolved; candidate asset differs from running asset |Not migrated |
| Trip/Work/Digest/LINE/ESG |Access/unavailable/unknown underlying UI |Not implicitly exempted or restarted |

[Registry](services.json) retains11 surfaces/61 entries and incomplete remote DNS discovery. [Plan](../superpowers/plans/2026-10-16-shared-ui-rollout.md) lists the remaining source/adoption and operational work. The disabled bridges still need real runner/platform context, prior verified artifacts, legacy predecessor/bootstrap, production-safe protected-route verification and native operational exercises. Estimate standing transition-config/approval issuance and previous-artifact pointer maintenance are not connected; manual preparation is not unattended activation.

The proposed standing policy is a bounded same-contract patch window, real app gates, serial activation, first-failure stop and explicitly authorized code-only rollback. The0.7.0 minor/frame/DOM/guard migration needs its own exact-artifact approval; a patch window cannot authorize it. No owner approval is inferred from the old0.6.0 release or an unanswered preference question. Publish/deploy approval should be requested only after those concrete operational inputs are ready. Full-provider OAuth, native assistive technology, physical devices, production rollback/reboot and full protected production screens remain unverified.
