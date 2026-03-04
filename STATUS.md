# naeil-ui (Design System) — STATUS

**Phase**: 프로젝트 페이지 템플릿 통일 + 성능 최적화 1차 완료
**Last Updated**: 2026-03-03 17:42 JST
**Channel**: Dev-sub3 (-5048860554)

## 결정 사항
- 스택: React 19 + Next.js 16 + TypeScript + Tailwind CSS v4 + shadcn/ui (Radix)
- 접근법: shadcn/ui 시작 → 점진적 커스텀 (Option C)
- 토큰: W3C DTCG 표준, 2단계 (Primitive → Semantic), Component 레이어는 20개+ 시 도입
- 색상 공간: OKLCH (shadcn v4 + Tailwind v4 정합)
- 테마: 다크 우선 (user > system > dark fallback) + 라이트 지원
- 디자인 DNA: 미니멀 · 기계적 · 모노크롬 · 단일 악센트 · 장식 제로
- 레퍼런스: Linear, Vercel(Geist), Warp, **Resend.com**, **Raycast.com**
- 네이밍: `naeil-ui`
- 서체: Pretendard (본문+UI) + JetBrains Mono/Geist Mono (코드)
- 악센트 색상: 프로젝트별 주입 — CC=green, PKM=purple, Baby=amber, naeil-ui=blue
- 구조: 단일 패키지 → 성장 시 pnpm workspace 분리
- Tailwind 통합: v4 CSS-first (`@theme` + `@import`), JS preset 안 씀
- 토큰 매핑: shadcn 표준 변수명에 매핑
- 컴포넌트: Toast → Sonner 교체 (shadcn v4)

### 3D 히어로 결정 사항 (최종)
- **기술**: React Three Fiber (Three.js) — Spline/영상/CSS 3D 아님, 무료+풀컨트롤
- **최종 컨셉**: Sunset landscape + gradient glow sun (아크+바운싱ㄴ에서 진화)
- **Sun style: Multi-color gradient shader** — 5-stop GLSL radial gradient
- **확정 palette: 夕焼け** — `[0xdc2626, 0xea580c, 0xeab308, 0x0d9488, 0x0e7490]` (red→orange→yellow→teal→cyan)
- **Gradient shader 아키텍처**: 2-layer (r=3.5 full spectrum peak=0.55 + r=0.5 center punch peak=0.50), quadratic `(1-d²)` alpha falloff, `THREE.AdditiveBlending`
- **2개 variant 유지**: 3-Circle + 夕焼け (나머지 전부 제거)
- **subtitle**: "Build · Ship · Iterate" (모든 로케일 영어 유지)
- **HorizonLine**: COO 제거 추천 (warm gradient과 색상 충돌) — **Jay 결정 대기**

### 진화 과정 (탐색 기록)
- 추상 오브젝트 → 아크/호라이즌 → 한글 문자 → 빛 효과 → 바운싱ㄴ in 아크 → sun variants
- 5개 frame shape 거부 (Pointed/Portal/Chevron/Hex/Parabola)
- 10개 sun/glow variant → Glow + 3-Circle만 남김
- 9개 parametric glow variant 전부 거부
- Gradient glow shader 방향 전환 → Jay "좋은데?"
- 단색 → 3-stop → 5-stop GLSL shader 진화
- 14개 gradient palette 탐색 후 夕焼け 확정

## 현재 상태
- brainstorm.md ✅
- spec.md ✅ (3모델 교차 검증 반영)
- plan.md ✅ (3모델 교차 검증 반영)
- tasks.md ✅ (59 태스크)
- Phase 1~6 ✅ MVP 완료 — 커밋 `6417acb`
- Route Groups ✅ — 커밋 `384b3f2`
- i18n (next-intl) ✅ — 커밋 `2385cc3`
- 히어로 체크포인트 — 커밋 `782985d`
- **히어로 씬 확정** — 커밋 `8252a3e` (sunset landscape + sea life PNG sprites)
- **Nav 디자인 조사 완료** — Vercel스타일(A안) 추천, Jay 방향 선택 대기

### 히어로 씬 최종 구성 (커밋 `8252a3e`)
- 6 레이어 (전부 기본 ON): Glow, Mountain, BaseLine, Water, Clouds, SeaLife
- SeaLife: 5개 PNG 스프라이트 (Lissajous 자유 수영)
  - 물고기(CC/green), 해파리(PKM/purple), 거북이(Baby/amber), 고래(naeil-ui/blue), 다이버(Jay/white)
- 이미지: `/public/images/` — diver.png, fish.png, jellyfish.png, turtle.png, whale.png
- hero page.tsx: text/CTA 블록 주석 처리 상태

### Nav Bar 구현 (Vercel-style A plan)
- **max-w-7xl** (1280px) — Linear/Resend 기준 매칭
- **h-16** (64px) — Resend(58px)/Raycast(58-76px) 레인지
- Logo+links 좌측 그룹, locale switcher 우측
- scroll-responsive: transparent → bg-background/80 backdrop-blur-md + border-b border-border/40
- text-[15px] font-medium, text-muted-foreground → text-foreground hover
- Nav CSS 벤치마크 (실측): Linear 1250px, Vercel ~1150px, Raycast 1204px, Resend 1280px

### Logo: C08-B4 (ㄴ Horizon Sunrise)
- ㄴ 하단 = 수평선, 반원 그라데이션 해(yellow→red) 떠오름
- strokeLinecap="square" + strokeLinejoin="miter" (mechanical DNA)
- `src/components/logo.tsx`: size prop (default 20), mono prop, stroke: currentColor, gradient sun #eab308→#dc2626
- Nav 통합: `<Logo size={20} />` + "naeil" wordmark, gap-2.5
- 저작권 안전: ㄴ은 기본 한글 자모, "ㄴ+sun" 조합 충돌 없음
- **사이징 이슈**: Jay가 너무 작다고 지적 → Resend h-6~h-7(22-40px), Raycast 24px 벤치마크 → 24-28px로 증가 필요

### Locale Switcher (컴팩트 리디자인)
- Globe SVG icon + 2-letter codes (EN/KO/JA) 드롭다운
- 기존 w-24 outline Button 의존성 제거

### 디자인 탐색 아카이브
- `public/logo-concepts.html`: 4 concept groups (A-D), 24 C-series, C08 30-variant deep dive (6축)
- 레퍼런스 조사 컬: Linear/Vercel/Raycast/Resend CSS 값 추출

## 완료 내역
### Phase 1 — 프로젝트 셋업
- Next.js 16.1.6 + React 19.2.3, Tailwind v4 CSS-first
- shadcn v4 init (OKLCH, tw-animate-css, New York)
- Pretendard + JetBrains Mono 폰트

### Phase 2 — 디자인 토큰
- DTCG JSON 토큰 6종, Style Dictionary v4 빌드, `dist/theme.css` + `dist/tokens.ts`

### Phase 3+4 — 테마 통합 + 시스템
- `globals.css` 14줄 리팩토링, next-themes ThemeProvider, ThemeToggle + AccentPicker, WCAG 16/16

### Phase 5 — 핵심 컴포넌트
- shadcn 7개 + Button 커스텀 + ESLint 커스텀 룰

### Phase 6 — 데모 페이지
- 토큰/컴포넌트/악센트 쇼케이스 — 커밋 `6417acb`

### 랜딩페이지 확장
- Route Groups, i18n (next-intl 3개국어), Nav/Footer, Projects 그리드, Stack 섹션
- 3D 히어로: R3F 스택, ~15+ 변형 탐색, 夕焼け gradient shader 확정
- 히어로 텍스트/CTA 제거 → 스크롤 힌트(∨∨)만 유지 (`4cafd7f`)
- .naeil 리브랜딩 (`2efb1b0`)
- Built with Stack 섹션 제거 (`ea57f36`)
- Nav/Footer: Design System → Blog (`8b2911d`)
- Footer 리디자인: compact 2-column (`c13a7c0`, `f997cb3`)
- Projects hover dropdown: Vercel-style mega menu + 바다 동물 아이콘 (`c0bffbd`)
- Bento Grid 프로젝트 카드 (`a5a4f6f`)
- 모바일 반응형 레이아웃 (`93405a6`)
- 파일 정리: logo-concepts.html, project-cards-compare.html 삭제 (`a3459f9`)
- Footer: tagline "Tomorrow starts here." 통일, © 제거 (`9eaffdc`, `a142337`)
- Theme toggle: Nav에 sun/moon 아이콘 (`23ed51d`)
- **라이트 모드 = 朝焼け(일출)** 테마 구현 (`6fa8229`, `42de662`) — Jay 아이디어
- BaseLine 디폴트 OFF (`85f3a70`)

## 주요 파일
- `src/components/hero-scene.tsx` — 3D 히어로 (~11KB, 2 variants, GLSL shader, landscape)
- `src/components/nav.tsx` — 네비게이션 바
- `src/components/footer.tsx` — 푸터
- `src/app/[locale]/(hub)/page.tsx` — 랜딩 페이지 (hero text/CTA 주석 처리 상태)
- `messages/en.json`, `ko.json`, `ja.json` — 번역 파일

## 미커밋 변경 파일
- `src/components/nav.tsx` — 완전 리라이트 (Vercel-style)
- `src/components/logo.tsx` — NEW (C08-B4 ㄴ Horizon Sunrise)
- `src/components/locale-switcher.tsx` — 리라이트 (Globe icon + compact)
- `public/logo-concepts.html` — 디자인 탐색 페이지

## 프로젝트 페이지 구현 상태

### 완료 (2026-03-03 업데이트 포함)
- `WorkflowDiagram` SVG DAG 컴포넌트 (호버 툴팁, 모바일 폴백, 접근성) — `02aa16f`
- `ProjectLayout` Hero 리디자인 + 템플릿 통일
- CC 페이지: 실제 아키텍처 반영 (PostgreSQL+pgvector, 11노드 DAG, i18n 3개국어)
- PKM / Baby Agent / Blog: Coming Soon 페이지 템플릿 적용
- Design 쇼케이스: Hero + Nav/Footer 통합, Heading Primitives 섹션 추가
- 전체 콘텐츠 페이지 route group 재구성: `(content)/layout.tsx`에서 `pt-28` 단일 관리
- 전역 Nav/Footer를 `[locale]/layout.tsx`로 이동 (페이지별 중복 제거)
- 아이콘 5종 512×512 정규화 (fish/jellyfish/whale/turtle/diver)
- h1/h2 공통 typography 컴포넌트 도입 (`PageTitle`, `SectionTitle`)
- **성능 최적화 1차 완료** — `ea7c985`
  - HeroScene 동적 로딩 (lazy import)
  - IntersectionObserver 기반 뷰포트 진입 시 3D 마운트
  - 모바일/저사양 성능 프로파일(low/medium/high) 적용
  - DPR/antialias/powerPreference/frameloop 적응 설정
  - low-tier SeaLife lite 모드 + sun geometry segment 축소
  - production에서 `preserveDrawingBuffer` 비활성
- **최종 QA(레이아웃/타이포 통일) 완료**
  - 대상: `/cc`, `/pkm`, `/baby-agent`, `/design`, `/projects`
  - 모바일/태블릿/데스크톱 3뷰포트 검증, h1/h2/카드 정렬 확인
  - Hero 정렬 보정: `md:items-center` → `md:items-start` (`4cac73e`)
- **Blog Hero 통일 완료**
  - diver 아이콘 적용 + 프로젝트 Hero 구조와 동일화 (`c86529c`)

### 키 결정
- Hero: Option A (부유 동물, 글로우 없음)
- Architecture: LangGraph 스타일 인터랙티브 DAG + 호버 툴팁
- README vs Site 역할 분리 (C 접근법)
- No MDX: TSX 템플릿 + data 객체
- PKM/Baby/Blog: Option C (클릭 가능 + Coming Soon 페이지)

### 성능 최적화 (Phase 6.5) — 전체 완료
- **P0**: demand frameloop + FPS cap + pointer-events-none + preserveDrawingBuffer prod off (`70dd27b`)
- **P0**: `useSceneProfile` adaptive quality tiers (low/medium/high, 24/35/45fps) (`583a865`)
- **P1**: DPR cap + antialias tier + viewport pause (IntersectionObserver) (`f8eb7ab`)
- **P2**: ContextGuard + ResourceCleanup (no gl.dispose) + prefers-reduced-motion fallback (`3f77e84`)
- Three.js dynamic import 시도→Turbopack 호환 불가→직접 import 유지

### Lighthouse Audit — 완료
- a11y: `<html lang>`, `<main>` landmark, contrast fix, aria-label (`1bb1bb8`)
- SEO: hreflang/canonical 절대 URL (`0c23337`)
- 결과: Perf 98, A11y 100, BP 100, SEO ~91 (dev server)
- 남은 이슈: 전부 dev-server artifact → prod에서 해결

### 다음
1. **59개 태스크 현황 정리** — Jay "남은 작업은?" 질문 대응 (tasks.md 기반)
2. CC 카피 최종 확정 (Opus/Codex/Gemini 중 선택/혼합)
3. Phase 7~8 (P2): Storybook + npm 패키징
4. 실콘텐츠 전환 시 PKM/Baby/Blog 데이터 채우기

## Dev Server
- Next.js 16.1.6 + Turbopack
- Jay 직접 실행: `cd ~/projects/design-system && pnpm dev --hostname 0.0.0.0`
- Tailscale 프리뷰: `http://100.99.98.114:3000`
