# naeil-ui (Design System) — Status

> Status: Complete ✅
> 최종 업데이트: 2026-03-23

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
