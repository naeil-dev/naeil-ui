# naeil-ui (Design System) — Status

> Status: Active
> 최종 업데이트: 2026-03-15

## 현재 상태
- **인증 시스템 Phase 1+2 완료**, SSO 통합 완료
- Vercel 프로덕션: https://naeil.dev
- GitHub: naeil-dev/naeil-ui (private)

## 인증 시스템 (auth)
- **Phase 1 (A04-A09) ✅**: Supabase Auth 기반 — @supabase/ssr 쿠키, PKCE, proxy.ts 미들웨어, /login, /auth/callback, logout
- **Phase 2 (A11-A16) ✅**: Nav AuthSlot (동물아바타 해시), NavServerWrapper, 보호라우트 (/sa/reports/:id)
- **SSO 통합 ✅**: 쿠키 domain .naeil.dev, esg.naeil.dev 연동 완료
- **리다이렉트 버그**: ✅ 해결 완료 (5e0d95c, bbb3eaf) — Jay 실제 테스트 통과 (2026-03-16)
- Phase 3~4 (리포트 동기화 + UI) → SA 프로젝트 쪽 작업

## Supabase 설정
- 프로젝트: dathsxdsaxooifnxjket.supabase.co
- Providers: Google OAuth, GitHub OAuth
- Site URL: https://naeil.dev
- Redirect URLs: naeil.dev/auth/callback, esg.naeil.dev/auth/callback
- Vercel env: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY

## 기술 스택
- Next.js 16.1.6, next-intl 4.8.3, @supabase/ssr 0.9.0
- @naeil/ui 패키지 — SA frontend과 공유 (Nav, Footer, 테마, 로케일)
- Vercel Hobby (무료), Supabase Free

## 디자인 결정
- 동물 아바타: user ID 해시로 결정적 배정 (coral/fish/jellyfish/turtle/whale/diver)
- Auth 위치: toolbarSlot 맨 오른쪽 [🌙] [EN] | [로그인/🐢]
- 비로그인: ghost 텍스트 링크, 로그인: Avatar + DropdownMenu
- 중앙 로그인: esg.naeil.dev → naeil.dev/login → OAuth → 쿠키(.naeil.dev) → 복귀

## 해결 완료 (2026-03-15)
- [x] 네비/풋터 production 버그 — Tailwind 클래스 정상 동작 확인 (Playwright 검증)
- [x] Vercel 배포 에러 — dist/theme.css → src/styles/theme.css 이동 (6183769)

## 해결 완료 (2026-03-16)
- [x] 리다이렉트 버그 — Google 로그인 후 원래 페이지 복귀 정상 동작 (Jay 테스트 통과)

## 남은 작업
- Phase 3~4는 SA 프로젝트 범위 (~/Projects/sustainability-analyzer/)
