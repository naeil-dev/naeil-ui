# Local integration evidence

The [result](../../account-language-integration-2026-10-17.md), [transition boundaries](../../account-language-transition-2026-10-17.md) and [combined receipt](summary.json) distinguish the deployed UI0.7.1 baseline from the unpublished authentication integration.

## Site

Runtime source: `2b2835667792bb83af3fa959bdcc774e1ac49471`. The later evidence/status commit does not change that artifact. The exact UI archive, package files, tokens and shared header/account/footer implementations are unchanged from `9f83816`.

- `site-unit.log`:260 passing unit cases. The five opt-in cases are separately executed in `site-invite-next.log`.
- `site-slot.log`:two shared pending-controller regressions.
- `site-lint.log`, `site-types.log`, `site-build.log`:successful checks; lint retains two historical warnings.
- `site-browser-summary.json`:56 checks against the frozen standalone. Auth/provider transport is synthetic; the actual app, SDK, server actions, cookies and browser run normally. Six representative screenshots are retained in `screenshots/`.
- `site-artifact-receipt.json`:every packaged file/link and archive SHA256. This artifact embeds fictional public Auth settings and is **not an operational deployment artifact**.
- `site-integrity.json`:all packaged files/links and the archive remain unchanged after preview execution. Six generated Next image-cache files appeared only in the extracted running directory; they are not in the frozen archive.
- `site-recovery-late-return.log` and `site-recovery-late-return-after.log`:independent RED/GREEN for a late callback deleting a newer login's return state. The test was unchanged between those runs. `site-recovery-independent-after-tests.log` records62 related independent tests.
- `site-recovery-reviewed-sha256.json`:the13 files at independent review time. Root subsequently changed only recovery-toast layout in `auth-slot.tsx` and added the invite favicon; final built-browser evidence covers both. Authentication binding/return logic is identical to the reviewed version.

Browser reproduction with the retained artifact, from the site checkout:

```sh
NAEIL_ACCOUNT_TEST_ARTIFACT=/Users/jaymini/.local/share/naeil-ui-rollout/consumer-candidates/naeil-account-language/2b2835667792bb83af3fa959bdcc774e1ac49471 \
  node scripts/site-account-language.mjs
```

The harness refuses existing listeners and owns only localhost2482/127.0.0.1:55431. It creates and removes its own mode0600 fictional invitation config outside the repository. Do not run it while the actual invitation suite owns2482. The separate five-case command is `NAEIL_INVITE_PRODUCTION_TEST=1 pnpm exec vitest run src/lib/auth/__tests__/invite-production.test.ts` and uses the corresponding `.next-console-invite` build.

The standalone was built with explicit `NAEIL_APP_ARTIFACT_ID=naeil-account-2b2835667792`, `VERCEL_GIT_COMMIT_SHA=2b2835667792bb83af3fa959bdcc774e1ac49471`, `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:55431`, `NEXT_PUBLIC_SUPABASE_ANON_KEY=fixture-anon`, `NAEIL_INVITE_DIST_DIR=.next-console-invite` and `NAEIL_ROLLOUT_STANDALONE=1`. The Next-generated tsconfig formatting/dist-type delta was checked and restored before freezing. `scripts/freeze-site-account-language.mjs` refuses a dirty source, mismatched identity or an existing candidate destination.

## Other consumers and central fixture

`independent-review.md`, `home-independent-regression.log` and the Estimate/Jev integrity JSON record the main agent's additional checks. Their complete suites and exact commands remain in each consumer's linked report; this directory does not relabel earlier tests as newly executed ones.

`original-worktrees.json` records the seven original branch/HEAD/status snapshots, rechecked unchanged after integration. `production-unchanged.json` records read-only public identities, and `site-merged-ci.json` closes the previous UI deployment's outstanding CI observation. Neither is production authentication acceptance.

The actual local Auth/Postgres fixture is the newly owned55421/55422 project. Its private connection file and generated tokens are excluded from evidence. `actual-invitation-final.json`/`.log` record20 passing actual-local cases against the frozen standalone; `fixture-counts-after-final-invitation.json` and `fixture-stop-receipt.json` record empty fictional tables, restored services, preserved volume and shutdown of only the newly owned environment. The original553xx stack stayed unchanged. One unrelated container had already stopped before our cleanup; its observation is distinguished in the receipt. Logs retained here trim trailing whitespace; build-log indentation tabs are expanded; raw local command logs remain under `/tmp` or `/private/tmp/naeil-account-language-review-20261017`.
