# Exact callback return implementation plan

> Agent workflow: use subagent-driven development for disjoint worktree tasks, with root integration and independent security review. User authorized local implementation/isolated validation by “계속 해서 진행해줘” after the concrete design request. No additional implementation approval is needed.

**Goal:** Preserve nonce-bound cancellation and PKCE while supporting the observed GoTrue redirect validator.

**Architecture:** Services keep their transactions/finalizers. Authorization redirects to three fixed naeil.dev return routes, which forward only nonce plus code or canonical failure to fixed consumer callbacks. No site session, exchange, transaction or grant authority is added.

**Stack:** Next16/TypeScript, FastAPI/Python, existing test runners and isolated standalone/container artifacts.

**Spec:** [Reviewed design](../specs/2026-10-18-exact-callback-return-design.md), reviewed SHA256 `7da4163bd9743ec75c599b4d214ceb33dc34ad0f7fc54f7fac79636c0a680a66`. Preserve this reviewed document; this plan records its subsequent implementation authorization. Home address was explicitly confirmed unchanged.

**Implementation adjustment:** Real built HTTP showed that Next16.1.7 rewrites the query before both proxy and App Route `Request` construction. The local implementation therefore uses a narrow Pages API adapter at `src/pages/api/internal/service-return.ts` behind the fixed public-route rewrite. It reads only the framework's own `initURL` metadata, pins the exact Next version, rejects missing metadata, validates raw Host/path, and sends original query text to the pure parser before URL serialization. Public internal-API requests reject. This preserves the selected fixed-hop architecture and hosting; it is a local implementation choice, not authorization to alter Vercel settings. The private API's actual Vercel behavior, pre-dispatch slash/backslash/TRACE handling and query tracing/log redaction remain operational activation gates. Superseded failed candidates stay immutable.

## Global constraints

- Existing isolated S/E/J/H worktrees and prior dirty work/artifacts remain; no shared UI0.7.1 changes or broad branch replacement.
- No hosted mutations, real users/grants/mail, push/merge/deploy, DNS/tunnel or production process operations. No force-kill, lock deletion or backup restore.
- Final targets: `https://jev.naeil.dev/auth/callback`, `https://abestimate.naeil.dev/auth/callback`, `https://jay-macmini-2.tail165003.ts.net:2455/api/console/auth/callback`.
- GET303 only; every Location explicitly ends in empty `#`. HEAD and other supported methods405/no Location/Allow GET. No-store/no-referrer and all spec security headers on failures too.
- Strict raw query limit16384 UTF-8 bytes; strict one-time form decode, decoded nonce multiplicity before canonical raw `nonce` name and43 base64url value, then other fields. Code/error values max4096 characters. Unknown/token/mixed/duplicate/control fields with a valid nonce become canonical failure; size/decode/nonce failures400 without redirect.
- No arbitrary targets, Host/forwarded-header authority, cookies/Auth/DB/network/transaction operations in relay or its middleware. No new runtime test flags.
- Preserve E Japanese-only, J/site ko/ja/en, current finalizers/expiry/logout/recovery/save guards. Home stale callback clearing behavior remains a documented existing limit.
- Evidence root: `/private/tmp/naeil-exact-return-20261018-pqjb9hzp`; root owns shared integration/fixture lifecycle. Each delegate owns only its worktree task and newly allocated test processes.
- Failing regression first, focused meaningful checks, then affected project suites. Do not repeat unrelated completed broad suites; keep known Home baseline failures/Estimate historical browser gap explicit.

## Review focus

1. Browser fragment inheritance after error and malformed canonical failure: inspect serialized Location and actual redirect chain.
2. HEAD, OPTIONS, trailing slash, encoded/Next aliases and unknown services: no accidental callback consumption, weak308 or app-shell/Auth execution.
3. Actual GoTrue error redirect construction, not only success or a fixture bypass of validator.
4. Cookie mismatch, replaced/stale attempts, replay and logout during exchange: unchanged finalizer authority and no session resurrection.
5. Deployment lifetime and platform logging: local success does not establish redaction or actual hosted OAuth; relay must outlive referencing consumers and pending attempts.

## Task 1: Site relay (site implementer)

Files: new `src/lib/auth/service-return.ts`, `src/pages/api/internal/service-return.ts` (the initial App Route was superseded after real HTTP failures), focused tests under `src/lib/auth/__tests__/`; narrow `src/proxy.ts` and `next.config.ts` changes for protected namespace. Own new verification document `docs/superpowers/verification/2026-10-18-exact-return-site.md` and temporary task1 evidence. Do not edit durable-invite sources or root rollout docs.

Interface: export `createServiceReturnHandler({siteAuthority, destinations})` as a pure testable factory returning `(request: Pick<Request, "url" | "method" | "headers">) => Response`, plus production handler with fixed constants. Injection exists only in code-level test harnesses; deployed route always uses fixed map. Factory rejects noncanonical paths and raw Host. No runtime environment override for destinations.

- [x] RED: success for each service has exact encoded nonce/code target and literal trailing `#`; bound provider error becomes only nonce+`error=authentication_failed`+`#`.
- [x] RED/GREEN: spec parser matrix, invalid/missing/alias nonce400; bound malformed input canonical failure; zero cookie/network work; HEAD/all supported methods405.
- [x] Protect exact namespace and aliases before site Auth/locale middleware; keep existing site/invite behavior.
- [x] Run site unit/type/scoped lint and real built HTTP with methods/paths/raw Host/security headers. Isolate build root and preserve generated files/prior frozen artifacts. Use prior offline public-config build harness as reference, never mutate prior root.
- [x] Freeze candidate with actual public URL/key only, exact source/hash identity, no private configuration. Report Webpack/font constraints and TRACE pre-dispatch limitation honestly. Root owns cross-service browser integration.

## Task 2: Estimate/Jev generators (consumer implementer)

Files: E/J `src/server/naeil-auth-client.ts`; focused `tests/server/naeil-auth.test.ts`/`tests/server/domain-access.test.ts` (E), `tests/integration/domain-access.test.ts` (J) and narrowly needed tests; new verification docs. Existing finalizer/store/UI/business source is out of scope.

Interface: unchanged provider authorization API, `redirect_to` becomes `https://naeil.dev/auth/return/abestimate?nonce=...` or `/jev?nonce=...`; same nonce, S256 challenge, Google account chooser, provider options. No configurable fallback to direct callback.

- [x] Read each repo's instructions/spec/verification; RED exact redirect target while preserving nonce/challenge/provider behavior.
- [x] Implement narrow generator changes, keep finalizer bytes unchanged.
- [x] Exercise cancellation consumes once/no exchange; replay, wrong binding, swapped nonce/code, stale A after B, expiry/restart, logout during exchange, saved return/language. Test transport may import pure site factory after it exists; no product token import.
- [x] Run appropriate unit/integration/type/lint and bounded actual local HTTP tests. Do not use protected553xx or preserved fixture mutation.
- [x] Package new isolated immutable candidates with unique identity and source mapping using repo tooling; do not overwrite old releases or commit/push. If tooling requires clean commits, use temporary source copies and report exact development mapping instead of forging revision. Preserve E dedicated Node24.21.0 and all data/writer contracts.

## Task 3: Home generator/OpenSpec (Home implementer)

Files: `app/modules/console/api.py` authorization URL only; focused console tests; new `openspec/changes/exact-console-auth-return/` before code. Preserve prior reconciliation and invitation files.

Interface: original nonce/verifier/challenge/personal binding; `redirect_to=https://naeil.dev/auth/return/console?nonce=...`. Final callback remains exact configured Home2455 origin and existing handler.

- [x] Write proposal/context/normative spec/tasks; RED expected authorization redirect.
- [x] Change only generator transport. Test success/cancellation, missing binding/nonce/replay, stale A clearing current B as existing behavior, expired/restarted/logout attempt, and exact Host/port handling.
- [x] Run focused Console tests/types/lint and strict OpenSpec validation. No repeat of unrelated broad frontend/backend suites.
- [x] Create new narrow overlay runtime image from preserved current production base with updated reviewed app source, isolated network-none/read-only/tmpfs smoke. Preserve all prior archives and baseline455 sources; no production container operation.

## Task 4: Root integration and upstream compatibility

Files: new `docs/rollout/exact-callback-return-2026-10-18.md`, sibling evidence directory; root-owned temporary harnesses. Minimal updates to prior preparation/transition indexes only after results.

- [x] Record fresh HEAD/status/file hashes, public identities, fixture/process ownership before edits (done in worktrees-before.json; only553xx listens among protected fixture ports).
- [x] Independently execute pinned GoTrue validation/error/success behavior using isolated fictional fixture or exact public source, retaining hashes and distinguishing local behavior from hosted OAuth.
- [x] Cross built relay redirect with actual consumer finalizers via local fictional transport and browser navigation (JS disabled included). Verify empty fragment, Lax bindings, cancellation/reuse, saved return and no site cookies/authority.
- [x] Independently review all diffs/new artifacts; commission focused security review, resolve material findings with regression evidence.
- [x] Record exact source/artifact/test scope, operational logging/origin/TRACE and real OAuth/mail/HTTPS gaps, relay-first deployment/retention recovery requirements. Final diff/JSON/link/privacy/hash/preservation checks. No product test repetition solely for documentation updates.

## Execution ledger

The existing worktrees are isolated and not main. User's explicit autonomous execution and delegation override repeated skill approval/commit/serial-workflow prompts: disjoint tasks may proceed in parallel, uncommitted snapshots are preserved and reviewed directly. Root never edits a delegate's owned files concurrently. No historical fixture cleanup helper will be replayed.

## Completed local scope and remaining activation gates

All checked tasks refer to local implementation, bounded verification and retained evidence. See [final rollout result](../../rollout/exact-callback-return-2026-10-18.md). Site90 protected HTTP cases pass; framework pre-dispatch slash/backslash308 and TRACE500 remain outside that protected set. Estimate7 and Jev7 integration cases are separate segmented runs, not one full green execution; Home7 uses actual relay HTTP plus ASGI with synthetic Auth, not a browser. Independent RAW-01 repair and final source/artifact/integration review are complete. Actual Vercel private metadata/Host preservation, ingress and query logging, real provider/mail/HTTPS, deployment and rights application remain uncompleted operational gates. No hosted or production mutation was authorized by these checkboxes.
