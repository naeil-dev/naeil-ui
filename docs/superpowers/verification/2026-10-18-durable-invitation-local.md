# Durable invitation local verification — 2026-10-18

This is an unpublished local candidate for the current Vercel site and Mac mini consumers. Hosted settings, operational databases, real mail/users/grants, deployment, DNS, SSO and language scope were not changed. SQL001–003 and frozen 2026-10-17 artifacts remain unchanged. See the [design](../specs/2026-10-18-durable-invitation-design.md) and [plan](../plans/2026-10-18-durable-invitation-plan.md).

## Source and local behavior

The site now supports private `NAEIL_INVITE_CONFIG_JSON` durable configuration, bounded AES-GCM encrypted Supabase transactions, revision/owner/fence/lease checkpoints, restart recovery with the original candidate/session and distinct uncertain copy in ko/ja/en. Vercel rejects process-memory fallback. Existing secure-file configuration and fixed-recipient acceptance authority remain intact.

Explicit higher-version resend in the same browser creates a new handle/cookie/CSRF/lifetime without changing the previous row. Old envelopes and stale tab CSRF values cannot change or confirm the new transaction. Terminal uncertainty never reactivates its old proof. A verifying checkpoint response crossing absolute expiry causes zero Auth verify calls. Public recovery retains a parsed fresh envelope when create fails or the entire response loses Set-Cookie; GET is inert, explicit restaging is inert, and a separate later confirm performs verification.

## Checks executed

| Check | Result and scope |
| --- | --- |
| `pnpm test` | 29 files passed, 1 skipped; **310 passed, 5 skipped**. Skipped tests are the existing opt-in `.next-console-invite` compiled-build tests; no old build was rebuilt or overwritten. |
| `pnpm exec tsc --noEmit --incremental false` | Passed. |
| Scoped ESLint with `--max-warnings 0` | Changed invitation source, new tests/helper and updated public recovery test passed. |
| Home Ruff check, format check and Python `py_compile` | Both new focused concurrency/process harnesses passed static checks. |
| OpenSpec `validate durable-invitation-state --strict` | Passed. |
| OpenSpec `validate --specs` | 58 passed. |
| Site/Home `git diff --check` | Passed. |
| Actual local pgTAP SQL001–004 | **317 passed**, including 47 new SQL004 tests. Parent ran the exclusively owned fixture. |
| Existing separate-session concurrency | **24 passed**: 7 access and 17 invitation races. |
| New SQL004 separate-connection/process concurrency | **7 passed**, including fencing, rollback, unknown checkpoint, DB-clock lock-wait expiry and capacity races. |
| Actual local recipient harness, fresh Node process per request | **17 scenarios passed**, using actual local GoTrue, PostgREST and PostgreSQL through private pipes. Includes same-browser resend after uncertain/staged/invalid, old-row continuity, old proof/stale tab rejection, consumed OTP response loss, concurrent confirmation, checkpoint ambiguity, original session recovery, cancel/resend/expiry and no replay grant restoration. |

The two original P2 regressions were demonstrated by six failing unit cases before the backend fix. The public pending-envelope issue was demonstrated by six failing executed-script cases before its fix. Existing real-handler response-loss tests additionally assert GET → explicit same-envelope restage → separate confirm, with zero upstream authority calls before that last confirm.

The parent owns `/private/tmp/naeil-auth-durable-20261018/fixture-home` (API55521/DB55522). The harness accepted only that exact fixture and fictional recipients; cleanup removed its generated rows/users and restored service evidence. Credentials remained in memory/pipes and are absent from receipts. The subagent did not mutate or operate the fixture directly.

| Sanitized parent log | SHA256 |
| --- | --- |
| `/private/tmp/naeil-auth-durable-20261018/durable-pgtap.log` | `bd8762ee9db598d15b036a7dbc551ae8f2eb182f351d7818ce33aae09d7678bd` |
| `/private/tmp/naeil-auth-durable-20261018/base-concurrency.log` | `6f7606fc2627eba31cf7baa73da95d0135bb64b895fc04fea5070dfb52c41c62` |
| `/private/tmp/naeil-auth-durable-20261018/durable-concurrency.log` | `f739992a625f4e0e8d9726b8b7fd8508402dfa210c6cf5db791396f1113aca70` |
| `/private/tmp/naeil-auth-durable-20261018/durable-site-processes-final.log` | `d3cd18eff18a892eee878f3442f3e04f9b7e1db85c94f220bf061ac6e1af6a28` |

## Build evidence

Independent read-only source/test review closed the original P1 and all three P2 findings with no remaining blockers before the final build. The reviewer did not rerun tests or a browser; executed tests above and parent-owned compiled smoke are separate evidence.

`pnpm build` passed with Next16.1.7, `VERCEL=1`, fictional public/private settings created only in process memory, no project `.env` files and a unique project-relative dist directory. The source was uncommitted; its public source revision is deliberately `development`, not the unchanged base HEAD. Both build-generated `tsconfig.json` additions and the generated `next-env.d.ts` route reference were verified and restored to their prior bytes.

| Final local build identity | Value |
| --- | --- |
| Read-only evidence | `/private/tmp/naeil-invite-durable-p2-verify-20261018-aazyflgx/receipt.json` |
| Dist directory under evidence | `.next-durable-p2-20261018-3b6b6ef5` |
| Artifact/build ID | `durable-invite-p2-20261018-5bdb4e9f0025-a7cc5f` |
| Base HEAD, for provenance only | `02aa72e6e702bf6726659c6e7179e648eb648141` |
| Canonical source snapshot SHA256 | `5bdb4e9f00255766eefdccd9fa82fc9c3e2d774947ef309db1f54b19a2195e76` |
| Build archive SHA256 | `05c45725dc55b3cddd29bc32c3022158e69e778109f227e935782ca3ab98ac63` |
| Source archive SHA256 | `69a9e99916b24f5bf70dc6fc943d3aa6d80fd3dc2d4d55dda1bdd591b8e12a99` |
| Build manifest SHA256 | `70205d0450c747cb01ba96aba7ea5f32afb5231385f2d014adcec307e70170ea` |

`source-snapshot-before.json` and `source-snapshot-after.json` map all **218** tracked/untracked files under `src`, `public`, `messages`, `content` and the seven explicit root inputs (`package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `next.config.ts`, `mdx-components.tsx`, `postcss.config.mjs`, `tsconfig.json`). Before/after maps match exactly. The canonical snapshot hash is SHA256 of the sorted compact JSON path-to-file-SHA256 map. Source and build archives, the 1585-file build manifest and sanitized build log are included. Private service/key markers were absent from every compiled file; the runtime config identifier was absent from client assets. No secrets or environment files are in the source archive.

The earlier `/private/tmp/naeil-invite-durable-verify-20261018-nhdi07do` build (archive SHA256 `4a2b3238639ee9c4d9be90df217397320aee58ffc5ddc71ea082c7c2a0e83d30`) predates the P2 corrections and is superseded. Its immutable files were preserved. Its seven missing-config HTTP/method checks are earlier evidence only and do not establish the final candidate's compiled behavior.

## Parent final standalone HTTP/browser verification

The parent built the same reviewed 218-input source snapshot with `NAEIL_ROLLOUT_STANDALONE=1` and a unique dist directory. Generated TypeScript files were verified/restored; final TypeScript checking passed. The source hash remains `5bdb4e9f00255766eefdccd9fa82fc9c3e2d774947ef309db1f54b19a2195e76`, and public `sourceRevision` remains `development`.

- Runtime: `/private/tmp/naeil-site-durable-runtime-20261018-fudupnl5/standalone/server.js`.
- Artifact ID: `durable-invite-runtime-20261018-5bdb4e9f0025-8ef76091`.
- Archive SHA256: `30cc77f1b51d559a90bb31311d74da4b72aef071f2e71fb5751616cd43ee0d12`.
- Public Auth: fictional `http://127.0.0.1:55431` / `fixture-anon`; `productionReady:false`.
- All2726files/29internal links/archive/source218inputs matched after actual HTTP/browser execution. [Receipt](../../rollout/evidence/auth-transition-preparation-2026-10-18/site-runtime-receipt.json), [integrity](../../rollout/evidence/auth-transition-preparation-2026-10-18/site-runtime-integrity.json).

The parent executed `verify-site-artifact.py` with Home's `.venv/bin/python`, `--node /Users/jaymini/.local/bin/node`, the runtime path above as `--server`, and `--screenshots-dir /private/tmp/naeil-auth-durable-20261018/browser-final`. Its exact invocation and result are recorded in the [rollout summary](../../rollout/evidence/auth-transition-preparation-2026-10-18/summary.json).

The same17scenario assertions passed through actual compiled HTTP:88requests and one graceful restart, distinct from the fresh-process-per-request source harness. Twelve browser cases covered ko/ja/en,390/1440 andlight/dark using the actual returned script. Uncertain copy/hidden confirm, absent fragment, CSP/no-store and zero external requests/POST/runtime failures/overflow passed. The parent directly viewed ko1440light and ja390dark. [HTTP/browser result](../../rollout/evidence/auth-transition-preparation-2026-10-18/site-artifact-http-browser.json), [screenshots](../../rollout/evidence/auth-transition-preparation-2026-10-18/browser-screenshots.json).

All fixture-generated Auth/Console rows were absent and service records restored before the four owned555xx containers stopped normally with exit0. Stopped containers/volume were preserved; protected553xx and old554xx volume were unchanged during stop.55631/55632 and55521/55522 listeners are absent. [Shutdown receipt](../../rollout/evidence/auth-transition-preparation-2026-10-18/fixture-stop-receipt.json). No production process was stopped.

## Limits

GoTrue verify and a database checkpoint cannot commit atomically. Missing durable candidate after ambiguous OTP use requires administrator resend; no refresh or unrelated existing session can substitute. A worker paused after a live verifying checkpoint can start/finish an external request after its lease expires; fencing protects subsequent DB mutations and prevents a second worker from reverifying that transaction. The immediate pre-verify expiry check does not turn these separate systems into one atomic operation.

No production-ready or deployment claim follows from these local results. Hosted runtime private configuration/key consistency, ordinary OAuth, real SMTP and external HTTPS remain outside this verification. Framework-level rejected TRACE can fail before the route's protected response; existing ingress handling limits remain separate. Expiry cleanup is opportunistic, not a scheduled physical-erasure guarantee. The new Home migration remains forward-only and unpublished.
