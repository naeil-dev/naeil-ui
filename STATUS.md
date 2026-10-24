# Status — 2026-10-23 shared-login follow-up complete; production rebuilt from main

The production site source is merged into `main` (PR #12, `e757f8d`), and Production rebuilt from `main` with the shared login intact (anonymous Estimate/Jev 307 to `naeil.dev/login?next=`, console relay 303, retired relays 404, signed in across all three services in the browser). Estimate/Jev commits are archived as local bundles only (no git remote yet). Old Estimate/Jev releases and the unused control wrapper are moved to `~/.Trash/naeil-cleanup-20261022/`; health 200. The service login contract is in [application layout](docs/components/application-layout.md#shared-naeildev-login-services-on-naeildev). [Handoff §3/§9](docs/rollout/auth-sso-handoff-2026-10-22.md).

---

# Status — 2026-10-22 shared .naeil.dev login live on naeil.dev, Estimate and Jev; user browser acceptance pending

naeil.dev (`8b2a4e7`, `dpl_14tRFTnp8…`) writes the default Supabase session cookie with `Domain=.naeil.dev`; Estimate (`d7cf07a`) and Jev (`552f3ec`) verify it server-side with `getUser()` plus the central `access_decision`, redirect anonymous users to `naeil.dev/login?next=`, and clear the shared cookie on logout. App session registries, relay/PKCE flows and Jev passwords are removed; only the Home Console relay remains. Jev is a verified service; Jay's Jev grant and Google/GitHub cross-service login/logout acceptance are pending. [Handoff §3](docs/rollout/auth-sso-handoff-2026-10-22.md).

---

# Status — 2026-10-22 Estimate Google/GitHub return accepted; save confirmation and Jev pending

**Operating update:** The user confirmed the actual Estimate list after both Google and GitHub login. Exact release47c01d7c49f6-913e9847deb4 remains admitted through the CLOSED controller with no automatic reopen. A fresh genuine session supported one revoke and one regrant, each independently reconciled; current member version3 has [abestimate]. The exact configured client/PostgREST denied access after revoke and allowed it after regrant and restart; this is separate from a public browser cookie-request HTTP-status capture. A controlled restart used one TERM and one explicit OPEN, preserved all21 business/backup files and the real session, and reached generation10 with matching native identity/job/listener. Twenty-four finite actual-HTTPS requests passed Google/GitHub synthetic error-return, binding, replay and retry checks; no provider UI cancellation or code exchange was performed by that sender. The user's restart-without-login and new-test-estimate save/reload confirmation is pending; the existing question is not repeated. Jev package, verification adapter and process-control preparation are local only; no Jev process or grant changed. [Current evidence and remaining acceptance](docs/rollout/auth-live-login-progress-2026-10-21.md). Earlier snapshots below remain historical.

**Pre-transition snapshot:** The user reset the DB password and supplied it privately. Verified-TLS owner authentication succeeded; no further password input is needed. The exact schema envelope and existing-subject bootstrap were each applied once and separately accepted through fresh authenticated read-only reconciliation. There is exactly one active version-zero member/administrator, zero grants and two active/unverified services. Existing Auth/catalog metadata is preserved. The mandatory session-only logging protection passed actual effective readback and independent scoped review before private binding. No Estimate/Jev operating-process application has occurred. Estimate's exact-return source was frozen in an isolated local commit and release47c01d7c49f6-913e9847deb4 was installed at a distinct path; main verified all2958 app entries and341 packaged sources, while current remains unchanged. Final recorded smoke15/15 and before/after integrity17/17 match the accepted artifact; main matched all79 package evidence hashes, independently reran the corrected listener parser39/39, and confirmed actual Mac listener/writer/loaded-job agreement without signaling. Local package and control corrections are accepted; fresh preservation/transition admission and genuine Google authentication remain pending. Initial-handoff and service-activation reviews found no scoped blocker; genuine personal login and configured denial remain prerequisites. [Current application, evidence and next conditions](docs/rollout/auth-live-login-progress-2026-10-21.md). Site relay deployment and19/19 hosted correction checks remain valid; real Google/GitHub acceptance is incomplete. Earlier snapshots below remain historical.

---

# Status — 2026-10-21 application inputs and local controls verified; live login pending

Continued the authorized local follow-up: preserved the exact285-file Vercel source package, implemented a fixed64-request hosted sender (12 local tests; zero HTTPS requests), and verified the dedicated Node24.21 native replacement primitive (36 cases) plus one-use CLOSED/OPEN lifecycle (30 groups). Independent review identified bounded JSON I/O and regex type-coercion defects; main fixed both, with12 focused regressions and the30 lifecycle groups passing afterward. The disabled central runner passes35 tests, actual psycopg wire behavior passes4 and new isolated PostgreSQL17.11 readbacks pass13. All owned SQL fixtures exited normally and were removed nonforced; original fixtures/locks/evidence remain protected. No product-source, actual configuration/schema/member/grant, deployment, current or operating-process change was made in this follow-up. Actual writer/start/lock readiness, installed control/private-config/stop orchestration, independent central owner access and live Vercel metadata/application remain incomplete. [Current evidence, artifact and minimum next conditions](docs/rollout/evidence/auth-application-preparation-2026-10-21/report.md). Earlier snapshots below remain historical.

---

# Status — 2026-10-21 static login relay locally complete; actual HTTPS acceptance pending

The user's “너 권고만 먼저 진행해줘” authorized the bundled OP01–03 recommendation and local implementation/isolated verification; “필요한 작업 전부 진행해줘” authorized the bounded follow-up fix. Three static return routes replace the wildcard/Pages adapter. A rejection-only fallback now returns protected empty404 for all four former dot/.rsc HTML404 failures, without broadening OP02. Focused342 tests, typegen/types/build and129/129 HTTP cases pass. The same new artifact passes synthetic Estimate16 controller +16 browser, Home12 minimal-ASGI and Jev6 transport checks within their stated limits. Independent review found no remaining local defect. Owned runtimes stopped cleanly; five HEADs and unrelated protected sources remain unchanged. Local design/implementation/isolated verification are complete. Deployment, actual settings/schema/grants, operating-process application and real-provider HTTPS acceptance remain incomplete. Home administration/source transplant is separate. See the [current result and next conditions](docs/superpowers/plans/2026-10-20-auth-recovery-scope-plan.md) and [durable evidence](docs/rollout/evidence/auth-static-return-fallback-2026-10-21/report.md). Earlier snapshots below are unchanged historical records.

---

# Status — 2026-10-21 login-scope handoff refreshed; contract decision still pending

[Login-scope handoff, section 8](docs/rollout/auth-login-main-handoff-2026-10-20.md) records the 06:04–06:05 JST five-root/protected-file and agent checks. The candidate is still unimplemented; the next unresolved item is adoption of the bundled callback contract changes. Preserve the login-only scope and complete authorized work autonomously; Home administration is a separate task. Only handoff documentation was updated; earlier records follow unchanged.

---

# Status — 2026-10-20 login-only successor handoff; contract decision still pending

[Latest login-scope handoff](docs/rollout/auth-login-main-handoff-2026-10-20.md) records the user's correction: the immediate work is Jev/Estimate Google/GitHub login return, not Home Console administration or source transplant. The existing callback candidate/file/test plan is prepared but not adopted or implemented. This handoff adds no approval. Five-root HEAD/status, 71 protected files and current agent visibility were checked at 19:41–19:42 JST; no product/operational work or successor creation occurred. Earlier snapshots follow unchanged.

---

# Status — 2026-10-20 current-hosting callback candidate prepared; contract decision pending

Authorized step1 of the [current execution plan](docs/superpowers/plans/2026-10-20-auth-recovery-scope-plan.md) now contains one static App Router relay candidate, exact proposed files, changed OP01–03 guarantees and finite verification. Existing consumer generators/finalizers remain compatible without edits. Platform query retention and retention periods remain unknown; early platform responses and normalized input cannot inherit the former raw-request guarantees. The replacement contract and local implementation remain pending explicit adoption. Only this pointer and the plan changed; no product implementation, tests/builds, probe or operational application occurred. A2 remains stopped and real-account acceptance remains incomplete. Earlier snapshots follow unchanged.

---

# Status — 2026-10-20 successor-main handoff prepared; no new execution approval

[Latest handoff, scoped state and restart boundary](docs/rollout/auth-main-handoff-2026-10-20.md) records the 08:09–08:10 JST source, agent and runtime-metadata checks. The current-hosting plan remains proposed for follow-up execution; A2 stays stopped and actual authentication acceptance remains incomplete. This handoff adds no contract, implementation or operational approval. No successor agent was created. Earlier snapshots follow unchanged.

---

# Status — 2026-10-20 execution and scope-control plan prepared

[Current-hosting execution plan and scope boundaries](docs/superpowers/plans/2026-10-20-auth-recovery-scope-plan.md) fixes the first delivery at existing Jay → Home administration/central grants → Estimate real-account acceptance. The first proposed unit is one coherent callback candidate covering OP01–03; further A2 work remains stopped. The plan defines permitted changes, stopping rules and staged verification/application. It does not approve a contract relaxation, new implementation or operational application. Only this pointer and the plan were added; authentication acceptance remains incomplete. Earlier snapshots follow unchanged.

---

# Status — 2026-10-20 independent direction review complete; further A2 work stopped

[Independent Astra/Opus review and explicit decision boundary](docs/rollout/auth-direction-independent-review-2026-10-20.md) recommends current hosting first and a bounded reconsideration of callback/logging contracts. A2 is preserved as a conditional contingency, not the next implementation task. No policy relaxation or new implementation/operational application is authorized by the review. OP02/03, current Home integration, safe Estimate shutdown and independent central recovery remain unresolved. Only review documents/safe receipts and this pointer changed; real-account HTTPS acceptance is still incomplete. Earlier snapshots follow unchanged.

---

# Status — 2026-10-19 A2 stage1 concrete design prepared; no operational adoption

[Concrete stage1 design and finite implementation boundary](docs/rollout/auth-a2-stage1-design-2026-10-19.md) selects a proposed Tokyo Linux ingress, explicit Vercel origin routing, raw-TCP/TLS Home2455 and Estimate backhaul, certificate custody, producer controls and same-policy recovery. Fresh narrow metadata confirms current Vercel Hobby/domain bindings and free candidate Mac ports. The effective tailnet authorization, certificate permissions, Vercel support/acceptance, Mac crash collection and safe retirement of old Home TLS connections remain adoption gates. Only design documents and read-only metadata changed; no implementation, probe, purchase, DNS/certificate, process or account application occurred.

# Earlier — 2026-10-19 A2 design review complete; operational adoption remains on hold

[A2 findings and decision boundaries](docs/rollout/auth-a2-design-review-2026-10-19.md) identify a conditional pinned Next custom-server dispatch and confirm existing Home HTTPS Serve2455 through a narrow read-only metadata projection. A first-hop-only A2 does not close E/J second-hop collection. Extending owned ingress to naeil.dev+Estimate first, Home collection controls, an actual operating target, Vercel support conditions and same-policy transition/recovery remain unresolved; Jev follows Estimate acceptance. Only design-review documents/safe metadata changed; no implementation, probe, infrastructure or operational application occurred.

# Earlier — 2026-10-19 successor main intake verified; relay scope decision remains

[Intake evidence and concrete decision boundary](docs/rollout/auth-main-intake-2026-10-19.md) records matching five-root HEAD/status, protected hashes and exact28-fixture metadata/ownership receipts. The new main owns follow-up coordination. No complete current-hosting OP01 control is established; A2 remains an unselected, unapproved hosting-scope expansion. Home transplant, Estimate closed gate and private central recovery retain their separate pending conditions. Only documentation/safe receipts changed; no implementation, observer, operational application or real-account acceptance occurred.

# Earlier — 2026-10-19 next-main handoff prepared

[Latest handoff and execution sequence](docs/rollout/auth-next-main-handoff-2026-10-19.md) records the 20:26–20:27 JST scoped state checks and the conversation's clarified priority: relay operational design is the first cutover decision; independent Home/Estimate/recovery preparation may proceed within its actual authorization. The handoff adds no implementation, design-change or operational approval. No successor agent was created.

# Earlier — 2026-10-19 new main resumed; decision and recovery preparation

[Current decision table and operations preparation](docs/rollout/auth-resume-decisions-2026-10-19.md) records the new main's ownership, matching protected sources/fixtures, OP01–03 choices and preserved approval boundaries. The observer remains on hold. No authentication implementation or operational application was performed.

Fresh Home metadata identifies a different running image and actual DB head `20261017_000000_merge_auto_monitoring`, absent from the retained candidate; its former production parity cannot authorize a transition. A scoped current-source auth transplant proposal preserves Auto/monitoring and the newer migration graph; it is not implemented. A bounded Supabase catalog read established current independent Dashboard/postgres privileges, while private execution, durable reauthentication/custody and full recovery remain unresolved. Estimate's exact predecessor path audit supports early-pointer isolation under its current launch settings; the proposed closed gate for loaded KeepAlive/20-second stop policy still needs a separate design/implementation decision and validation. See the linked evidence and concrete scope/acceptance decisions; local/preparation results are not real-account HTTPS acceptance.

# Earlier — 2026-10-19 two-model direction review complete; rollout plan proposed

**Handoff:** [Current read-only state, ownership and restart instructions](docs/rollout/auth-direction-handoff-2026-10-19.md). No new implementation or operational authorization was added by the handoff request.

Operational authentication remains incomplete: OP01–03, independent DB-owner recovery and the current Estimate stop procedure remain open. Opus 5.5 and GPT-6 Astra independently reviewed the direction and reconciled material disagreements. The recommendation is to hold the new checkpoint and prepare concrete supported remedies alongside Home/Estimate preservation, recovery and stop procedures. See the [integrated proposal, owners, acceptance and approval boundaries](docs/rollout/auth-direction-review-2026-10-19.md).

Next proposed deliverables are the Jay→Estimate decision table and parallel operations package, followed by exact production artifacts and separately approved application. This review does not approve new implementation, changed security policy or operational actions. Existing completed evidence is retained; no code, tests, hosted configuration, account/grant or process change was made.

# Earlier — 2026-10-19 query-boundary investigation and local observation proposal prepared

Static artifact tracing identified a pre-proxy query serializer that reproduces three of four changed forms in four pure Node22 comparisons; the D12 empty-value change and the middleware-to-API handoff remain unexplained. The API captures own initURL before its later normalizer. Saved redirect bodies also differ from the direct Next clean-URL body. A separately identified single API-entry checkpoint, closed same-request comparison and future10-case proposal have been independently reviewed as preparation. No new observer/schema/artifact or hosted operation was created. Local implementation still needs the concrete scope decision; deployment/probe/WAF/logs/real-account authority is separate. See [findings, reviewed proposal and preservation evidence](docs/rollout/auth-boundary-preparation-2026-10-19.md). Baseline49 original /8 different /13 unobserved and both-hop/Host/ingress acceptance gates remain; existing Jay→Estimate with Home/central policy/relay stays first.

# Earlier — 2026-10-19 approved protected Preview baseline completed; acceptance remains blocked

The reviewed one-key/baseline178/exact-key-removal unit was explicitly approved and completed. All178 HTTPS attempts finished; exact-key absence and owned-sender exit were recorded, with no retry, redirect following or separate recovery. Independent review and root checks match the saved counts and bindings. Acceptance remains open:18 query-preserving308s, six TRACE405 header mismatches, diagnostic metadata49 original /8 different /13 unobserved, raw-Host/provenance and two-hop non-exposure limits. Product403 shape is not handler provenance. No WAF, logs, further probes, Production or real-account transition was authorized or applied. See [actual results, evidence and next preparation scope](docs/rollout/auth-preview-baseline-result-2026-10-19.md). Existing Jay→Estimate remains first with Home/central policy/relay dependencies intact. The one-time approval is consumed; source S still retains the wildcard candidate.

# Earlier — 2026-10-19 protected Preview baseline ready for application approval

The bounded executor, header inputs, source/runtime freeze and separate fresh-approval key-recovery helper are prepared and independently reviewed. Two recovery integration/environment findings were corrected; no unresolved Critical/Important defect was demonstrated in the final reviewed sources. Saved control47/root21/sender24 and corrected recovery79 checks are distinguished from affected checks and ten new offline dormant/template checks. Actual credential consumption by this executor, key generation/revocation and hosted baseline178 remain unapproved and unexecuted. See [application, preservation/recovery and evidence](docs/rollout/auth-preview-baseline-readiness-2026-10-19.md). Existing Jay→Estimate remains first; Home/central policy/relay, real Auth/HTTPS and operational transition conditions remain open.

# Earlier — 2026-10-19 protected authentication Previews created

The approved dedicated Vercel CLI login and two frozen Preview creations completed. Both diagnostic-v2 and product-literal Previews were READY in the recorded scoped readbacks; existing Production and protection settings were unchanged. All178 loopback TLS wire cases passed and their saved evidence was independently checked. Hosted probes, protection-bypass credentials and operational authentication cutover remain unapplied. The current CLI cannot enforce the required one-attempt/no-redirect mutation transport; the protected HTTPS executor/header freeze remains unfinished. See [results, evidence and exact remaining conditions](docs/rollout/auth-preview-created-2026-10-19.md). The following sections are historical checkpoints; source S still retains the wildcard candidate.

# Status — 2026-10-17 Console account/language integration verified locally

**The existing UI0.7.1 production rollout remains complete and unchanged. The new authentication integration is implemented and locally verified in isolated worktrees; it has not been pushed, merged or deployed.** Site runtime source is `2b2835667792bb83af3fa959bdcc774e1ac49471`; Estimate is `72e22fc74bcc8db266c8b844fe852b914e4ec36a`; Jev is `2b3a31140e12ec88677942a8749b39a55af2503a`. Home received narrow authentication/logout corrections at `51482f6c16cf3fca33648990998378629574fcbb`.

All three retain the shared header/footer/account control. Integrated sessions, verified account display, guarded logout/account switching and save/recovery preservation are covered by current app tests. Site/Jev support ko/ja/en within each service; Estimate remains Japanese-only. Site logout outage recovery and late refresh/callback/return-state races were corrected. The owner confirmed Jay as the sole intended initial administrator and an explicit per-member service allow table; no real identity or grant was registered.

Site260 unit +5 built-Next invitation +2 shared-slot +56 frozen-browser checks pass. Estimate712 unit,62 smoke and608 actual-local Auth/DB pass; its initial full365 browser run and final affected-case reruns are distinguished in the report. Jev125 unit/46 browser/76 actual-local pass. Home339 scoped backend/911 frontend/6 actual-local/25 recovery-browser pass; its known whole-backend/type failures remain. The final frozen-site invitation chain passes20 actual-local cases. Owned554xx fixtures/previews are stopped after cleanup, preserving the volume and the historical553xx environment.

See [implementation and verification](docs/rollout/account-language-integration-2026-10-17.md), [exact source/artifact receipt](docs/rollout/evidence/account-language-integration-2026-10-17/summary.json), and [transition review](docs/rollout/account-language-transition-2026-10-17.md). Site artifacts embed synthetic public Auth settings and are local-verification-only. Home current-source/overlay reconciliation, an operational invitation runtime, hosted providers/callbacks/signup/SMTP, verified UUIDs and production HTTPS acceptance remain open. Automatic SSO, cross-service language synchronization and Estimate body translation are not assumed.

## Earlier UI deployment and handoff

# Status — 2026-10-17 account-control correction deployed

**Handoff:** The owner closed this UI rollout task and requested a new agent for right-hand login/account and language work. The [handoff prompt](docs/rollout/account-language-handoff-2026-10-17.md) maps the separately implemented Console authentication branches to the latest deployed UI. Console Tasks1–6 have recorded local implementation/verification; provider/operational conditions and Task7 transition remain open. The authentication candidates still use older UI0.4.0/0.2.0 and must be reconciled without reverting canonical header/account UI. Locale policy beyond current site/Jev ko/ja/en and Estimate ja-only remains to be defined. [Read-only handoff identity check](docs/rollout/evidence/account-language-handoff-2026-10-17.json) at2026-10-17T06:52:16.680Z matches all three production receipts. No new agent, test suite, authentication change or deployment was started for this handoff.

**naeil.dev, Estimate and Jev now serve UI0.7.1/contract1 and one canonical account/login/menu presentation.** Site PR11 merged as `ff37223`, Production7134744798; Estimate source `8c3e043`, release `8c3e0430293d-82280965179e`; Jev source `35dd474`, release `20261017T040900Z-ui071`. App authentication, locale support and Estimate save/logout guards remain consumer-owned.

PR CI passes85 units, package/site checks and380 browser cases with4 expected conditional skips; exact CI package bytes match the frozen archive. Consumer acceptance passes633 Estimate units,68 incumbent browser cases,9 frozen account cases and61 smoke checks; Jev69 units/27 frozen browser cases. Twelve matching Japanese authenticated presentation cases use actual app adapters with isolated/synthetic session data. Production acceptance separately passes56 anonymous login/frame conditions and exact public identities. Native transitions preserve current data/config and previous code; no live rollback was exercised.

See [correction outcome and limits](docs/rollout/account-correction-2026-10-17.md), [final receipt](docs/rollout/evidence/account-correction-2026-10-17/summary.json), [spec](docs/superpowers/specs/2026-10-17-shared-account-correction.md) and [plan](docs/superpowers/plans/2026-10-17-shared-account-correction.md). Home/Baby remain excluded. Protected production sessions, native AT/devices and real-provider OAuth remain unverified; standing unattended rollout stays disabled. No npm or hosted Storybook publication occurred. The duplicate merged-source CI is recorded separately and does not replace the successful identical-tree PR checks.

## Earlier three-service deployment

# Status — 2026-10-17 three-service deployment complete; standing rollout disabled

**naeil.dev, Estimate and Jev now serve canonical NaeilHeader/NaeilFooter, UI0.7.0/contract1.** Site Production7133974289 serves merge `b82f12d`; Estimate current is `cc4b6dee738e-fbed79a686e1`; Jev release is `20261017T024200Z-ui07`, source `7e1eb717`. Public acceptance passes280 independent-reference conditions: site248, Estimate8 and Jev24. Exact public artifact identities, provider/runtime bindings, assets/guards, complete render measurements and representative images are in [the deployment outcome](docs/rollout/deployment-2026-10-17.md) and [machine-readable receipt](docs/rollout/evidence/deployment-2026-10-17/summary.json).

Green PR CI and merged-source CI passed; the reviewed Git tree is preserved. Main executed independently reviewed one-time native transitions with fresh Estimate byte preservation and Jev current-code recovery capture. All47 rollout/verifier tests pass after correcting CI browser ordering and a Japanese/Latin font-subset verification race. A transient website connection timeout is retained separately from the successful31-route rerun.

Home and Baby are excluded. Protected production workflows, real-provider/OAuth, native-device/AT and live rollback/reboot remain unverified; isolated authenticated candidate evidence stays separate. Standing automatic rollout is disabled, authoritative DNS/unknown-service discovery is incomplete, and this task did not publish npm or hosted Storybook. The requested three-service deployment is complete; the wider unattended rollout objective is not. No user tabs were reloaded.

## Earlier four-service preparation checkpoint (scope superseded)

# Status — 2026-10-17 shared UI rollout scope correction

Local `feat/shared-ui-rollout` retains frozen unpublished UI0.7.0 source `3b13e95`, archive `f15f9a…`, reference `6c8511…`. The site, Estimate (`cc4b6de`), Home frontend (`c1bbb924`) and Jev (`7e1eb717`) now consume canonical header/footer in verified local candidates. Home operating frontend was independently reproduced; Jev source was recovered against its deployed manifest. Independent reference comparisons cover400 in-scope consumer conditions, with scopes and exact receipts in [verification](docs/rollout/verification.md).

Release coordination, exact identity/render/state checks and disabled platform/recovery bridges are implemented;45 automation/verifier tests pass. Jev's first isolated startup exposed inherited worktree dependencies masking a broken package. Those earlier results were retracted; the corrected sealed runtime passes fresh startup,20 browser tests and post-runtime integrity. Home's verified OpenSpec change is archived. Documentation commits remain separate from frozen app source.

**Production convergence remains incomplete.** Last verified naeil.dev/Storybook is0.6.0 at549c501; Estimate current remains0.5.0/b305c043; Jev installed0.2.0 and the Home original image is unchanged. No publication, push/merge, production activation, private dataset access or standing automation occurred. The [registry](docs/rollout/services.json) retains10 active surfaces/67 route-state entries plus one explicitly excluded historical service, incomplete DNS, unavailable/Access services, Home backend provenance and unconfigured deployment/verification gates. See [policy/automation](docs/rollout/automation.md), [spec](docs/superpowers/specs/2026-10-16-shared-ui-rollout.md) and [remaining plan](docs/superpowers/plans/2026-10-16-shared-ui-rollout.md).

Owner correction on2026-10-17: Baby Dashboard at baby.naeil.dev is a different service and is withdrawn from this rollout. Its isolated local changes and earlier16-condition evidence are preserved as out-of-scope history, with no production change or deployment task. The earlier five-consumer/416-condition progress claim is corrected to four consumers/400 conditions.

## Earlier preparation checkpoint (superseded by recorded 0.6.0 publication)

# Status — 2026-10-15 shared whole header verified locally

The actual website header now has one optional React-only package composition, used directly by the site adapter and the estimate package consumer. Generic Navigation and old Next Nav APIs remain supported; no generated token changes. Shared units65/65, types, contrast, package/site builds, provisional clean packed React/Next and actual Storybook62/62 pass; full lint has0errors/1historical warning after excluding retained generated trace viewers. Sixteen matching JA/KO viewport/theme comparisons retain actual captures and no measured anchor differences over1px. [Verification and limits](docs/evidence/shared-naeil-header-2026-10-15/verification.md), [independent source/image review](docs/evidence/shared-naeil-header-2026-10-15/independent-review.md).

Owner explicitly authorized package publication, reviewed main integration and naeil.dev deployment. Final frozen archive/CI/registry/site/estimate runtime checks are still pending here; no external completion is claimed. [Contract](docs/superpowers/specs/2026-10-15-shared-naeil-header.md), [plan](docs/superpowers/plans/2026-10-15-shared-naeil-header.md).

## Historical status

# naeil-ui (Design System) — Status

> Status: Complete ✅
> 최종 업데이트: 2026-06-28

## 프로젝트 완료 요약
- **@naeil/ui@0.2.0** npm publish 완료
- 인증 시스템 Phase 1+2 완료, SSO 통합 완료
- Production hardening + a11y 검증 완료
- Vercel 프로덕션: https://naeil.dev
- GitHub: naeil-dev/naeil-ui (private)
- npm: https://www.npmjs.com/package/@naeil/ui

## 완료된 작업
- **Phase 1-6**: 컴포넌트 라이브러리, 테마, i18n, 3D hero scene
- **Phase 7**: axe-core a11y 검증 + InteractiveButton/Input props controls
- **Phase 8**: tsup build + npm 패키지 설정 + @naeil/ui@0.2.0 publish
- **M5-lite Storybook baseline**: local Storybook 10 설정, `Button`/`Card`/`Badge` stories, `pnpm run build:storybook` 검증
- **인증 시스템 Phase 1 (A04-A09)**: Supabase Auth — @supabase/ssr 쿠키, PKCE, proxy.ts 미들웨어, /login, /auth/callback, logout
- **인증 시스템 Phase 2 (A11-A16)**: Nav AuthSlot (동물아바타 해시), NavServerWrapper, 보호라우트
- **SSO 통합**: 쿠키 domain .naeil.dev (esg/work/line은 2026-10-24 퇴역, 로그인 복귀 허용 목록에서 제거)
- **리다이렉트 버그 수정**: Google 로그인 후 원래 페이지 복귀 (Jay 테스트 통과)
- **네비/풋터 production 버그 수정**: Tailwind 클래스 정상 동작 확인

## 기술 스택
- Next.js 16.1.6, next-intl 4.8.3, @supabase/ssr 0.9.0
- React 19, Tailwind CSS v4, Radix UI, React Three Fiber
- Vercel Hobby (무료), Supabase Free

## Supabase 설정
- 프로젝트: dathsxdsaxooifnxjket.supabase.co
- Providers: Google OAuth, GitHub OAuth
- Site URL: https://naeil.dev
- Redirect URLs: naeil.dev/auth/callback (esg/work callback은 2026-10-23 제거)

## 디자인 결정
- 동물 아바타: user ID 해시로 결정적 배정 (coral/fish/jellyfish/turtle/whale/diver)
- Auth 위치: toolbarSlot 맨 오른쪽 [🌙] [EN] | [로그인/🐢]
- 중앙 로그인: 서비스(예: jev.naeil.dev) → naeil.dev/login → OAuth → 쿠키(.naeil.dev) → 복귀

## 참고
- Phase 3~4 (리포트 동기화 + UI)는 SA 프로젝트 범위 (~/Projects/sustainability-analyzer/)
