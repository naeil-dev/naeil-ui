# naeil-ui (Design System) — Status

> Status: Active
> 최종 업데이트: 2026-03-05

## 현재 상태
**MVP 완료 + 프로덕션 배포 완료**

Phase 1~6 (T01~T46) 전체 완료. https://naeil.dev 라이브. Vercel Hobby + GitHub 자동 배포.

## 완료 Phase
- **Phase 1** (T01-T09): Next.js 16 + Tailwind v4 + shadcn + Pretendard/JetBrains Mono
- **Phase 2** (T10-T20): DTCG 디자인 토큰 (OKLCH, semantic, 다크/라이트)
- **Phase 3** (T21-T24): Tailwind v4 테마 통합 (@theme inline)
- **Phase 4** (T25-T30): 테마 시스템 (next-themes, accent 오버라이드, WCAG 검증)
- **Phase 5** (T31-T42): 컴포넌트 커스텀 (DNA 적용, focus ring 통일, lint 스크립트)
- **Phase 6** (T43-T46): 데모 페이지 완료 (토큰+컴포넌트 쇼케이스, 악센트 피커)

## 랜딩 사이트 (tasks.md 밖)
- 3D 히어로 씬 (Three.js/R3F, 다크=sunset/라이트=sunrise)
- 프로젝트 페이지 6개: CC(상세), SA(상세), PKM/Baby Agent/Blog(Coming Soon), Design(쇼케이스)
- Nav 드롭다운 + Footer + i18n (ko/en/ja)
- 성능 최적화 P0~P2 + Lighthouse 감사 (Perf 98, A11y 100, BP 100)
- 아이콘 6종: fish(CC), coral(SA), jellyfish(PKM), whale(naeil-ui), turtle(Baby Agent), diver(Blog)

## 프로젝트-색상 매핑
| 프로젝트 | 동물 | 악센트 OKLCH |
|---------|------|-------------|
| CC | 물고기 | oklch(0.723 0.219 149) green |
| SA | 산호 | oklch(0.704 0.140 181) teal |
| PKM | 해파리 | oklch(0.627 0.265 303) purple |
| naeil-ui | 고래 | oklch(0.623 0.214 259) blue |
| Baby Agent | 거북이 | oklch(0.769 0.188 70.08) amber |
| Blog | 다이버 | — |

## 배포
- **프로덕션**: https://naeil.dev (Vercel Hobby, 무료)
- **GitHub**: github.com/naeil-dev/naeil-ui (private)
- GitHub push → 자동 배포
- DNS: Cloudflare A레코드 `@ → 216.198.79.1` (Proxy OFF)

## 남은 작업
- **인증 시스템** (A01~A28): Supabase Auth + SA 리포트 열람 — plan/tasks 작성 완료, Phase 1 착수 대기 (Jay A01~A03 수동 설정 필요)
  - docs: `brainstorm-auth.md`, `spec-auth.md`, `plan-auth.md`, `tasks-auth.md`
- **Phase 7** (T47-T53): Storybook (P2)
- **Phase 8** (T54-T59): npm 패키지 배포 (P2)
- Three.js 번들 분리 (Turbopack 대기)
- PKM/Baby Agent 상세 페이지 (프로젝트 준비 시)

## 기술 스택
- Next.js 16 + React 19 + TypeScript
- Tailwind CSS v4 (CSS-first, @theme inline)
- shadcn/ui (Radix Primitives)
- Three.js + React Three Fiber (3D 히어로)
- next-intl (i18n: ko/en/ja)
- OKLCH 색상 공간, DTCG 토큰 표준

## 채널
- Dev-sub3

## 프로젝트 경로
- `~/projects/design-system`
- 도메인: `https://naeil.dev`

## GitHub username 변경
- `jaymini1022` → `naeil-dev` (2026-03-04)
- 전 프로젝트 remote + 사이트 링크 업데이트 완료

## 최근 커밋
- `ae3ddc5` GitHub 링크 naeil-dev 업데이트 + SA 페이지 + Phase 6
- `d2eca1b` Phase 5 컴포넌트 DNA 커스텀 (T32-T42)
- `0c23337` SEO absolute URLs
- `1bb1bb8` Lighthouse a11y+seo
