# Invitation session delivery Implementation Plan

> Historical PR35 implementation plan. The November 4 closeout integrates its reviewed history into current multilingual main with invitation acceptance still disabled. The original no-merge scope below records the November 2 task. The separately authorized closeout includes main integration and its resulting Site deployment, with exact-source verification; it does not authorize opening invitation acceptance or mail delivery.

## Current dormant integration status — 2026-11-04

- Home [PR183 / SQL011](https://github.com/naeil-dev/naeil-home/pull/183) merged as `7405904454b7cdd4ec27340c82fc79bffd9be9b8`; Home [PR184 / local H5](https://github.com/naeil-dev/naeil-home/pull/184) merged as `c9c4f5f9acfd0ad40e7416ef2ef25d74c1fe8ca9`. The isolated real Home → GoTrue → compiled-site acceptance was for historical site `ed9e620cef0d9ac6e8380d9645c72a827a4fd903`, not this multilingual integration or hosted C.
- Hosted SQL011 and legacy writer/row drain completed November 3. Operational receipts `stage05-ingress-writer-hold-receipt.json` and `stage05-result-080.json` record the hold/drain and committed SQL011 with `liveLegacy=0`. They are private operational evidence and are not copied into Git. Do not repeat the migration or drain blindly.
- Current code keeps strict `NAEIL_INVITE_ACCEPT_ENABLED === "true"` opt-in at both handler and slash-alias entrypoints, catalog-backed en/ko/ja paused screens, the locale sender gate, and independent receipt/browser cookie headers. Anonymous GET/HEAD only bootstrap; POST status reads recovery state. All production flags and the independent C ingress deny remain held.
- Outstanding activation work: approved SMTP/provider/DNS and delivery configuration, invitation-specific ingress rate protection including aliases, redacted exact-deployment public/private Auth alignment, and actual receipt/proof/session/consumer canary on the final hosted source. The existing Next-Action/login/change-password rate rule does not protect ordinary invitation JSON POSTs. Stable shared private AES remains an activation invariant. This integration changes no mail, configuration, database, WAF or activation gate; the resulting paused Site deployment is verified separately under the closeout plan.
- NullMX and the existing B/D observation schedule are separate deferred work. Historical SQL011/H5 evidence is retained; current-source local tests below do not claim hosted acceptance.



## November 4 integration verification

- Full serial Vitest: 839 passed; the six compiled-production tests are separately opt-in and then passed against the rebuilt `.next-console-invite` artifact. The owned process used fictional public Auth settings, a temporary 0600 fake D config and an isolated fake RPC transport; no inherited operational secrets or real mail/DB/Auth requests were used.
- Catalog, type and lint checks passed; lint retained three unrelated existing warnings. Webpack production build passed with Next’s offline Google-font seam. This is functional compiled-route evidence, not a visual font/Storybook or hosted acceptance claim.
- Added combined checks for all three catalog states/actions, localized login/receipt-only service links with sender gate on/off, language changes during lost-delivery/account-switch recovery, paused locale fallback, retained staged rows across OFF/ON, and separate HTML receipt/browser cookies. A negative control using the old collapsed Set-Cookie copy failed all three locale cases; restoring independent appends passed.
- Compiled tests cover default-off canonical/slash GET/HEAD/POST with complete fake config and zero upstream/cookies, inert GET/HEAD/CSP, exact Host/Origin, response-loss/restart delivery without OTP/record/accept replay, and foreign browser denial. Ordinary UI `/ko/` follows the current locale proxy’s 307; the protocol slash alias retains 308.
- The existing Next16 TRACE predispatch500/missing-header limitation remains recorded; the independently held production ingress is not opened. Test-owned port2482/processes and fake config were cleaned up.

**Goal:** Confirm existing invitations and deliver the recipient shared session without repeating OTP after response loss.
**Architecture:** Inert GET/HEAD bootstrap; explicit POST preflight plus Home SQL011 proof admission. Keep session credentials only in the existing AES-GCM SQL005 payload and install through the existing shared cookie mechanism; terminal complete rows allow delivery-only retry.
**Spec:** Owner design-final-v2 §§1/3/4 and Astra v5 §§1/4 (evaluations console-access-design-20261101); Home main02591189 SQL003/005/006/009.

## Global Constraints
- Edit only site-s1. No proxy.ts/callback edits (S2-owned), shared UI/rollout/STOP changes, secrets, hosted requests, merge or deployment.
- Home exception explicitly authorized: separate console-admission worktree, SQL011, existing durable-invitation-state delta, ≤300 net lines, own pr2 fixture only.
- Preserve random fresh transaction handles, ten-minute absolute expiry, fenced checkpoints, OTP once and uncertainty. No tokens/proof in URLs/logs/DTOs.
- Serialize heavy tests with the pgrep guard; use fake upstream/config and compiled previews, not H5 live end-to-end.

## Review Focus
- Concurrent proof copies serialize through Home preflight/admission locks; UNIQUE is defense-in-depth. No process map authorizes delivery.
- GET/HEAD never allocate SQL rows; invalid preflight never consumes capacity.
- Creator/closed/version/proof terminal conflicts explain invalidity; gateway/service-role errors remain503.
- Lost responses recover without a second OTP; encrypted credentials expire. Different signed-in users require explicit switch consent; only invitation-authorized links are offered.

### Task1: Home proof admission prerequisite
- [x] Add OpenSpec delta and forward SQL011 console_invite_tx_admit; preflight first, unique proof hash, old RPCs/ACL unchanged; return canonical handleHash plus existing row envelope. Test pgTAP/independent connections, rollback/expiry/races; open separate unmerged Home PR.
### Task2: Site handler/store/session
- [x] Red tests for inert bootstrap, preflight ordering, terminal mapping; implement POST-only admission and encrypted canonical handle readback in invite.ts/invite-store.ts. Keep status recovery POST-only.
- [x] Extend candidate/verified/complete ciphertext with refresh credentials; isolate session cookie adapter in invite-session.ts reusing site-session.ts policy. Verify current user, require explicit switch, deliver session after accept and retry delivery only.
- [x] Update invite-page.ts for account switch/session delivery, truthful complete copy and allowed next links; no shared chrome edits.
### Task3: Evidence and PR
- [x] Run full site Vitest serial, lint/types/site build and owned compiled-route tests with fake upstream; preserve generic diagnostics and preview launch contract for H5. Record red→green, counts, Home dependency and cleanup; push/open [site PR35](https://github.com/naeil-dev/naeil-ui/pull/35), merge neither.

## Contract / activation gate
- SQL011 is required by the protocol and is now merged/applied as recorded above. Code integration and the completed historical prerequisite do not authorize deployment or opening C.
- `console_invite_tx_admit(invite_id,version,nonce_hash,token_hash_hash,handle_hash,payload)` validates SQL003 preflight and atomically reuses an unexpired proof row; only the service role can execute it. The site decrypts the canonical random handle and checks its returned hash.
- GET/HEAD only issue host-only bootstrap/browser cookies and HMAC CSRF. Explicit POST stages/reads state; complete transactions retain AT/RT only inside SQL005 AES-GCM ciphertext for their remaining ten-minute window. Delivery retries never call OTP/record/accept again. Expired credentials fall back to normal sign-in.
- Configure the same Supabase project URL/anon key as the existing site's public Auth configuration. Keep service-role/AES keys private, identical across instances; do not put them in `NEXT_PUBLIC_*`. Receipt cookie stays host-only; Auth uses the existing `.naeil.dev` SSR policy. No new setting/dependency.
- Different validated current users require an explicit account switch. Only the receipt's JEV/AB Estimate links can be offered; `next` can select only those exact URLs. Accepted-result readback never restores revoked grants.
- SQL005 only allows candidate after verifying; trigger-first readback takes the same phase path without calling OTP. Lost verification remains uncertain and requires re-invitation.

## Local verification / H5 handoff
- `pnpm install --frozen-lockfile`; full serial host Node: `node node_modules/vitest/vitest.mjs run --maxWorkers=1 --no-file-parallelism`; then `pnpm lint` and `pnpm check:types`.
- Build an owned compiled preview: `NAEIL_INVITE_DIST_DIR=.next-console-invite pnpm build --webpack` with fake public Supabase settings. Offline font mocking uses Next's `NEXT_FONT_GOOGLE_MOCKED_RESPONSES` seam and an existing local font (no source/lock changes).
- `NAEIL_INVITE_PRODUCTION_TEST=1 node node_modules/vitest/vitest.mjs run src/lib/auth/__tests__/invite-production.test.ts --maxWorkers=1 --no-file-parallelism` owns port2482, an ephemeral fake HTTP Auth/PostgREST seam, a 0600 fake config and its child Next process. It restarts Next while retaining only encrypted RPC rows; cleanup stops all owned resources. Probe asserts no OTP/accept after response loss/restart.
- Activation still requires invitation-specific ingress edge rate-limit verification and confirming that the completed legacy writer closure/drain has not drifted. The November 3 drain is already complete (legacy proof identity was encrypted and could not be indexed by SQL011). Old completed rows without refresh credentials fall back to sign-in; old staged rows can resume after page reload.
- These route/compiled-route contracts are distinct from the historical successful Home→GoTrue H5 above. A renewed real local H5 on the final candidate would strengthen source-bound evidence; hosted activation still requires its own final-source canary with trigger-first/provenance, delivery response loss and actual shared-session consumption.

## Review correction: browser-owned delivery
Admission reuse prevents another OTP attempt; it never grants delivery authority. A separate host-only random HttpOnly/Secure/Lax browser cookie is established before confirmation and never replaced by stage. Only its SHA256 is encrypted at the first verifying checkpoint. Candidate/verified/complete recovery and session delivery require that same binding; other/missing/legacy bindings get normal sign-in, even after explicit account-switch consent. The original browser still needs switch consent if its signed-in account changed.
A registration-complete recipient with a spent OTP gets durable sign-in guidance, not re-invitation. The owner accepts up to approximately950 net lines on this same PR for the P1 correction and regressions; optional old-version copy is deferred.

Successful session delivery clears only the browser-binding cookie. Whole-response loss retains that cookie for delivery-only retry; deliberate logout after a received success cannot reinstall the stored session. Foreign candidate recovery is rejected before claiming/recording/accepting, legacy unbound rows require sign-in, and recover() GET preserves an existing binding.

### H5 token contract correction
GoTrue [v2.197.0 legacy generation](https://github.com/supabase/auth/blob/v2.197.0/internal/models/refresh_token.go#L163-L167) uses SecureAlphanumeric(12): [lowercase unpadded Base32](https://github.com/supabase/auth/blob/v2.197.0/internal/crypto/crypto.go#L159-L173), exactly `[a-z2-7]{12}`. Its [stateless format](https://github.com/supabase/auth/blob/v2.197.0/internal/crypto/refresh_tokens.go#L21-L24) encodes version0 + UUID16 + uvarint1–9 + signature16 + checksum4: 38–46 bytes, canonical unpadded Base64URL (51–62 characters). Both formats are present in v2.197.0 and unchanged in upstream master `a7e97d665b9ea03853edb66d014bcde323f7894b`; the latest published release checked was v2.197.0. OTP response and durable readback share one syntax validator; GoTrue remains the authority for signature/checksum validity.
Access tokens are variable-length signed JWTs ([SignJWT](https://github.com/supabase/auth/blob/v2.197.0/internal/tokens/service.go#L892-L918)); no minimum/signature-length assumption is imposed. The 16KiB ceiling is a local resource bound, not an asserted GoTrue format. UUID sub/session_id, finite numeric expiry, recipient match and fresh GoTrue user confirmation remain required. Route regressions exercise HS256/ES256/RS256-shaped tokens and reject malformed claims. Invitation nonce/token_hash bounds accept Home's URL-safe nonce and GoTrue's SHA224 hex hash. Read-only inspection of S2 password-server/password-policy found no refresh-token length check: the SDK owns password/session handling, and server identity checks use UUIDs plus authenticated `/user`. S2 files were not changed.
