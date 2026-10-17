# Status — 2026-10-17 three-service deployment in progress

Owner explicitly excludes Home as well as Baby and authorizes one-time deployment of **naeil.dev, Estimate and Jev**. The three verified local candidates cover336 independent render conditions. Standing automation stays disabled; the remaining unknown services are not part of this deployment request. [Deployment plan and outcome](docs/rollout/deployment-2026-10-17.md). No new production completion is claimed until the live receipts below are recorded.

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
