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
- **SSO 통합**: 쿠키 domain .naeil.dev, esg.naeil.dev 연동
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
- Redirect URLs: naeil.dev/auth/callback, esg.naeil.dev/auth/callback

## 디자인 결정
- 동물 아바타: user ID 해시로 결정적 배정 (coral/fish/jellyfish/turtle/whale/diver)
- Auth 위치: toolbarSlot 맨 오른쪽 [🌙] [EN] | [로그인/🐢]
- 중앙 로그인: esg.naeil.dev → naeil.dev/login → OAuth → 쿠키(.naeil.dev) → 복귀

## 참고
- Phase 3~4 (리포트 동기화 + UI)는 SA 프로젝트 범위 (~/Projects/sustainability-analyzer/)
