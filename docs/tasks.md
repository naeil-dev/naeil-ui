# Tasks: naeil-ui

> plan.md Phase 1~8을 실행 가능한 단위 태스크로 분해.

## Phase 1: 프로젝트 셋업

- [ ] T01: Next.js 15 + TypeScript + pnpm으로 `naeil-ui` 프로젝트 초기화
- [ ] T02: Tailwind CSS v4 설정 (CSS-first, `tailwind.config.ts` 없음)
- [ ] T03: shadcn/ui 초기화 (`npx shadcn@latest init`, v4 adapted)
- [ ] T04: 디렉토리 구조 생성 (`src/tokens/`, `src/components/`, `src/utils/`, `dist/`, `stories/`)
- [ ] T05: Pretendard Variable 폰트 설치 + CSS 설정
- [ ] T06: JetBrains Mono 설치 + CSS 설정
- [ ] T07: ESLint + Prettier 기본 설정
- [ ] T08: Git 초기화 + `.gitignore` + 초기 커밋
- [ ] T09: **검증** — `pnpm dev` → Pretendard 렌더링 + shadcn Button 1개 추가 렌더링 확인

## Phase 2: 디자인 토큰

- [ ] T10: `src/tokens/color.json` — Primitive 색상 (gray-50~950, accent-50~950, OKLCH 값)
- [ ] T11: `src/tokens/typography.json` — 폰트 패밀리, 사이즈 스케일, 웨이트, 라인하이트
- [ ] T12: `src/tokens/spacing.json` — 4px 기반 스케일
- [ ] T13: `src/tokens/radius.json` — none/sm(2px)/md(4px)/lg(8px)
- [ ] T14: `src/tokens/shadow.json` — sm/md, 다크 모드용 미니멀 값
- [ ] T15: `src/tokens/semantic.json` — Semantic 매핑 (bg-primary, text-muted 등, 다크/라이트 분리)
- [ ] T16: Style Dictionary v4 설치 + DTCG 파서 헬로월드 검증
- [ ] T17: SD 커스텀 포맷터 작성 — `@theme inline` 블록 포함 CSS 출력 (`dist/theme.css`)
- [ ] T18: SD JS 상수 출력 설정 (`dist/tokens.ts`)
- [ ] T19: `pnpm build:tokens` 스크립트 추가
- [ ] T20: **검증** — `pnpm build:tokens` → `dist/theme.css`에 `@theme inline` + 모든 CSS 변수 확인

## Phase 3: Tailwind v4 테마 통합

- [x] T21: `dist/theme.css`에 토큰 → Tailwind 유틸리티 매핑 확인 (색상, 타이포, 라운딩)
- [x] T22: shadcn 표준 변수명 매핑 — naeil-ui 시맨틱 토큰 → `--primary`, `--secondary`, `--ring`, `--border` 등
- [x] T23: 프로젝트 내 `globals.css`에서 `@import "theme.css"` 연결
- [x] T24: **검증** — Tailwind 클래스(`bg-accent`, `text-muted`, `font-sans`)가 올바른 CSS 변수 참조 + shadcn 컴포넌트 정상 렌더링

## Phase 4: 테마 시스템

- [x] T25: `semantic.json`에 다크/라이트 모드별 OKLCH 값 정의
- [x] T26: SD 빌드 출력에 `:root`(다크) + `.light` + `prefers-color-scheme` 폴백 반영
- [x] T27: `next-themes` 설치 + ThemeProvider 설정
- [x] T28: 악센트 CSS 변수 오버라이드 메커니즘 구현 + 기본값 뉴트럴 블루 (OKLCH)
- [x] T29: WCAG 4.5:1 대비 자동 검증 스크립트 작성 (다크/라이트 양쪽)
- [x] T30: **검증** — 테마 토글 시 모든 시맨틱 토큰 즉시 전환 + 악센트 오버라이드 동작 + contrast 통과

## Phase 5: 핵심 컴포넌트

- [ ] T31: `npx shadcn@latest add button input card dialog dropdown-menu sonner badge avatar` (Toast → Sonner)
- [ ] T32: Button 커스텀 — 디자인 DNA 적용, 5 variants
- [ ] T33: Input 커스텀 — 포커스 링 accent 기반
- [ ] T34: Card 커스텀 — elevation 구분 (다크: 밝기 차이)
- [ ] T35: Dialog 커스텀 — 오버레이 + 모션
- [ ] T36: Dropdown Menu 커스텀 — 키보드 내비게이션 확인
- [ ] T37: Sonner 커스텀 — 토큰 적용, 위치/스타일
- [ ] T38: Badge 커스텀 — 3 variants
- [ ] T39: Avatar 커스텀 — 폴백 처리
- [ ] T40: 포커스 링 스타일 통일 (모든 컴포넌트 accent 기반)
- [ ] T41: 하드코딩 방지 lint rule 설정 (색상 값 직접 사용 금지)
- [ ] T42: **검증** — `grep` 하드코딩 0건 + 키보드 내비게이션 + 렌더링 정상

## Phase 6: 데모 페이지

- [ ] T43: 토큰 쇼케이스 — 색상 팔레트(OKLCH), 타이포 스케일, 간격, 라운딩, 그림자
- [ ] T44: 컴포넌트 쇼케이스 — 8개 전체 variant + 다크/라이트 토글
- [ ] T45: 악센트 데모 — 2~3개 악센트 색상 전환 셀렉터
- [ ] T46: **검증** — 데모 페이지에서 모든 토큰 + 컴포넌트 시각 확인 + 스크린샷 기록

## Phase 7: Storybook (P2)

- [ ] T47: Storybook 설치 + Next.js / Tailwind v4 연동 설정
- [ ] T48: 다크/라이트 전환 데코레이터 설정
- [ ] T49: 8개 컴포넌트 `.stories.tsx` 작성 (variants + states + Controls)
- [ ] T50: 토큰 문서 페이지 (MDX)
- [ ] T51: `@storybook/addon-a11y` 설치 + WCAG 자동 검증
- [ ] T52: `storybook build` → 정적 배포 설정
- [ ] T53: **검증** — 모든 스토리 렌더링 + a11y 경고 0건 + 빌드 성공

## Phase 8: npm 패키지 (P2)

- [ ] T54: tsup/unbuild 빌드 설정 — CJS + ESM, `exports` 필드 (`theme.css`, `components/*`, `tokens`)
- [ ] T55: `package.json` 메타데이터 — name, license, peerDependencies, type declarations
- [ ] T56: 트리쉐이킹 테스트 — 미사용 컴포넌트 번들 미포함 확인
- [ ] T57: `npm pack --dry-run` → 아카이브 내용 검증
- [ ] T58: npm publish + GitHub Release + changelog
- [ ] T59: **검증** — 새 프로젝트에서 `npm install naeil-ui` → `@import` → 컴포넌트 사용 E2E 확인

---

**총 59 태스크** | MVP (Phase 1~6): T01~T46 | P2 (Phase 7~8): T47~T59
