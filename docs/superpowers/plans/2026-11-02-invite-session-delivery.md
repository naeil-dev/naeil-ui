# Invitation session delivery Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this approved plan task-by-task; no deployment or merge.

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
- Requires [Home PR183 SQL011](https://github.com/naeil-dev/naeil-home/pull/183) before this site image activates. Neither PR authorizes deployment.
- `console_invite_tx_admit(invite_id,version,nonce_hash,token_hash_hash,handle_hash,payload)` validates SQL003 preflight and atomically reuses an unexpired proof row; only the service role can execute it. The site decrypts the canonical random handle and checks its returned hash.
- GET/HEAD only issue host-only bootstrap/browser cookies and HMAC CSRF. Explicit POST stages/reads state; complete transactions retain AT/RT only inside SQL005 AES-GCM ciphertext for their remaining ten-minute window. Delivery retries never call OTP/record/accept again. Expired credentials fall back to normal sign-in.
- Configure the same Supabase project URL/anon key as the existing site's public Auth configuration. Keep service-role/AES keys private, identical across instances; do not put them in `NEXT_PUBLIC_*`. Receipt cookie stays host-only; Auth uses the existing `.naeil.dev` SSR policy. No new setting/dependency.
- Different validated current users require an explicit account switch. Only the receipt's JEV/AB Estimate links can be offered; `next` can select only those exact URLs. Accepted-result readback never restores revoked grants.
- SQL005 only allows candidate after verifying; trigger-first readback takes the same phase path without calling OTP. Lost verification remains uncertain and requires re-invitation.

## Local verification / H5 handoff
- `pnpm install --frozen-lockfile`; full serial host Node: `node node_modules/vitest/vitest.mjs run --maxWorkers=1 --no-file-parallelism`; then `pnpm lint` and `pnpm check:types`.
- Build an owned compiled preview: `NAEIL_INVITE_DIST_DIR=.next-console-invite pnpm build --webpack` with fake public Supabase settings. Offline font mocking uses Next's `NEXT_FONT_GOOGLE_MOCKED_RESPONSES` seam and an existing local font (no source/lock changes).
- `NAEIL_INVITE_PRODUCTION_TEST=1 node node_modules/vitest/vitest.mjs run src/lib/auth/__tests__/invite-production.test.ts --maxWorkers=1 --no-file-parallelism` owns port2482, an ephemeral fake HTTP Auth/PostgREST seam, a 0600 fake config and its child Next process. It restarts Next while retaining only encrypted RPC rows; cleanup stops all owned resources. Probe asserts no OTP/accept after response loss/restart.
- Activation also requires ingress edge rate-limit verification and draining legacy create-only writers/rows for the ten-minute window (their proof identity is encrypted and cannot be indexed by SQL011). Old completed rows without refresh credentials fall back to sign-in; old staged rows can resume after page reload.
- These are route/compiled-route contracts, not real hosted or Home→GoTrue E2E evidence. H5 must run the Home SQL011 fixture with compiled site instances, shared private config, trigger-first/provenance checks, delivery response loss and actual shared-session consumption.

## Review correction: browser-owned delivery
Admission reuse prevents another OTP attempt; it never grants delivery authority. A separate host-only random HttpOnly/Secure/Lax browser cookie is established before confirmation and never replaced by stage. Only its SHA256 is encrypted at the first verifying checkpoint. Candidate/verified/complete recovery and session delivery require that same binding; other/missing/legacy bindings get normal sign-in, even after explicit account-switch consent. The original browser still needs switch consent if its signed-in account changed.
A registration-complete recipient with a spent OTP gets durable sign-in guidance, not re-invitation. The owner accepts up to approximately950 net lines on this same PR for the P1 correction and regressions; optional old-version copy is deferred.
