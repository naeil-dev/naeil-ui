# Plan: naeil-ui

> spec.md의 요구사항을 실행 가능한 단계로 분해한 구현 계획.

## Phase 개요

| Phase | 내용 | 대응 요구사항 | 산출물 |
|-------|------|--------------|--------|
| 1 | 프로젝트 셋업 | — | 동작하는 Next.js 15 + Tailwind v4 + shadcn 프로젝트 |
| 2 | 디자인 토큰 | REQ-1 | DTCG JSON → `theme.css` (`@theme` 포함) 빌드 파이프라인 |
| 3 | Tailwind v4 테마 통합 | REQ-4 | `@import "naeil-ui/theme.css"` 한 줄로 적용 |
| 4 | 테마 시스템 | REQ-2 | 다크/라이트 전환 + 악센트 주입 |
| 5 | 핵심 컴포넌트 | REQ-3 | 8개 컴포넌트 커스텀 완료 |
| 6 | 데모 페이지 | Success #5 | 토큰 + 컴포넌트 시각적 검증 |
| 7 | Storybook | REQ-5 (P2) | 컴포넌트별 스토리 + 문서 |
| 8 | npm 패키지 | REQ-6 (P2) | 배포 가능한 패키지 |

---

## Phase 1: 프로젝트 셋업

**목표**: 빈 프로젝트에서 개발 시작할 수 있는 상태까지.

1. Next.js 15 + TypeScript + pnpm으로 `naeil-ui` 프로젝트 초기화
2. Tailwind CSS v4 설정 (CSS-first, `tailwind.config.ts` 없음)
3. shadcn/ui 초기화 (`npx shadcn@latest init`) — v4 adapted 버전
4. 프로젝트 구조 생성:
   ```
   naeil-ui/
   ├── src/
   │   ├── tokens/        # DTCG JSON 소스
   │   ├── components/    # shadcn 커스텀 컴포넌트
   │   └── utils/
   ├── dist/              # SD 빌드 산출물
   ├── docs/
   ├── stories/
   ├── style-dictionary.config.ts
   └── package.json
   ```
5. Pretendard Variable 폰트 설치 (`pretendard` npm 또는 CDN)
6. JetBrains Mono 설치
7. ESLint + Prettier 기본 설정
8. Git 초기화 + `.gitignore`

**DoD (완료 기준)**:
- `pnpm dev` → 빈 페이지에서 Pretendard 폰트 렌더링 확인
- shadcn Button 컴포넌트 1개 추가 → 정상 렌더링 확인
- `tailwind.config.ts` 파일 없음 (v4 CSS-first 확인)

---

## Phase 2: 디자인 토큰

**목표**: W3C DTCG 표준 JSON 토큰 → `@theme` 포함 CSS 파일 자동 빌드 파이프라인.

1. **토큰 JSON 정의** (`src/tokens/`)
   - `color.json` — Primitive 색상 (gray-50~950, accent-50~950, OKLCH 값)
   - `typography.json` — 폰트 패밀리, 사이즈 스케일, 웨이트, 라인하이트
   - `spacing.json` — 4px 기반 스케일
   - `radius.json` — none/sm(2px)/md(4px)/lg(8px)
   - `shadow.json` — sm/md
   - `semantic.json` — Semantic 매핑 (bg-primary, text-muted 등, 다크/라이트 분리)

2. **Style Dictionary v4 설정**
   - `style-dictionary.config.ts` 작성
   - DTCG 파서 사용
   - **커스텀 포맷터**: `@theme inline` 블록 포함 CSS 출력 → `dist/theme.css`
   - JS 상수 출력 → `dist/tokens.ts`
   - 빌드 스크립트: `pnpm build:tokens`

3. **토큰 타입 안전성**
   - 생성된 `tokens.ts`에서 TypeScript 상수로 export
   - 토큰 키 자동완성 지원

**DoD**:
- `pnpm build:tokens` 성공
- `dist/theme.css`에 `@theme inline` 블록 + 모든 CSS 변수 존재
- `dist/tokens.ts`에 TypeScript 상수 export 확인

---

## Phase 3: Tailwind v4 테마 통합

**목표**: 소비 프로젝트에서 CSS import 한 줄로 naeil-ui 토큰이 Tailwind 유틸리티로 사용 가능.

1. **테마 CSS 패키징**
   - `dist/theme.css`에 `@theme inline` 블록으로 토큰 → Tailwind 유틸리티 매핑
   - 색상: `bg-accent`, `text-primary`, `border-subtle` 등
   - 타이포: `font-sans` → Pretendard, `font-mono` → JetBrains Mono
   - 라운딩: `rounded-sm/md/lg` → 토큰 값

2. **소비 프로젝트 통합 확인**
   ```css
   /* 소비 프로젝트의 globals.css */
   @import "naeil-ui/theme.css";
   ```

3. **shadcn 변수 매핑**
   - naeil-ui 시맨틱 토큰을 shadcn 표준 변수명(`--primary`, `--secondary`, `--ring`, `--border` 등)에 매핑
   - shadcn 컴포넌트 코드 수정 최소화

**DoD**:
- `@import "naeil-ui/theme.css"` 한 줄로 Tailwind 유틸리티 (`bg-accent`, `text-muted`) 동작 확인
- shadcn 컴포넌트가 매핑된 토큰을 정상 참조

---

## Phase 4: 테마 시스템

**목표**: 다크/라이트 전환 + 프로젝트별 악센트 색상 주입.

1. **다크/라이트 토큰 매핑**
   - `semantic.json`에 다크/라이트 모드별 OKLCH 값 정의
   - SD 빌드 시 `:root` (다크 기본) + `.light` 클래스 분리 출력
   - `prefers-color-scheme: light` 미디어 쿼리 폴백
   - 우선순위: user override > system preference > fallback dark

2. **테마 전환 유틸리티**
   - `next-themes` 연동 (shadcn 기본 패턴)
   - localStorage 영속화

3. **악센트 주입 메커니즘**
   - 소비 프로젝트에서 CSS 변수 오버라이드:
     ```css
     :root { --accent-500: oklch(0.65 0.2 250); }
     ```
   - 기본값: 뉴트럴 블루 (OKLCH)

4. **WCAG 대비 검증**
   - 다크/라이트 양쪽에서 accent on bg-primary → 4.5:1 이상
   - 자동 contrast 체크 스크립트 작성

**DoD**:
- 테마 토글 시 모든 시맨틱 토큰 즉시 전환 확인
- 악센트 CSS 변수 오버라이드로 색상 변경 동작
- WCAG 4.5:1 대비 자동 검증 통과

---

## Phase 5: 핵심 컴포넌트

**목표**: shadcn/ui 8개 컴포넌트를 naeil-ui 토큰으로 커스텀.

1. **shadcn 컴포넌트 추가**
   - Button, Input, Card, Dialog, Dropdown Menu, Sonner, Badge, Avatar
   - (`tw-animate-css` 사용, Toast 대신 Sonner)

2. **커스텀 적용 (컴포넌트별)**
   - shadcn 표준 변수에 매핑했으므로 대부분 자동 적용
   - 추가 조정: 디자인 DNA 반영 (장식 제거, 기계적 느낌, 모노크롬 톤)
   - 라운딩, 그림자, 포커스 링 → 토큰 기반 통일

3. **Variant 설계**
   - Button: `default`, `secondary`, `ghost`, `destructive`, `outline`
   - Badge: `default`, `secondary`, `outline`
   - 나머지: shadcn 기본 variant + 토큰 적용

4. **접근성 확인**
   - Radix 기본 접근성 유지 (키보드 내비게이션, ARIA)
   - 포커스 링 스타일 통일 (accent 기반)

**DoD**:
- 8개 컴포넌트 모두 렌더링 정상
- `grep -r "oklch\|hsl\|rgb\|#[0-9a-fA-F]" src/components/` → 하드코딩 색상 0건 (토큰 변수만 사용)
- 키보드 내비게이션 동작 확인

---

## Phase 6: 데모 페이지

**목표**: 모든 토큰 + 컴포넌트를 한눈에 확인할 수 있는 쇼케이스. (Storybook 전까지 사실상의 문서 역할)

1. **토큰 쇼케이스** (`app/page.tsx` 또는 별도 route)
   - 색상 팔레트 (Primitive + Semantic, 다크/라이트, OKLCH)
   - 타이포 스케일 (xs ~ 4xl, 웨이트별)
   - 간격 시각화
   - 라운딩 + 그림자

2. **컴포넌트 쇼케이스**
   - 8개 컴포넌트 전체 variant 나열
   - 다크/라이트 전환 토글 포함

3. **악센트 데모**
   - 2~3개 다른 악센트 색상으로 전환하는 셀렉터
   - 같은 컴포넌트가 악센트만 바뀌는 걸 시각적으로 보여줌

**DoD**:
- 데모 페이지에서 모든 토큰 + 컴포넌트 시각 확인 (Success Criteria #5)
- 다크/라이트 + 악센트 전환 동작
- 스크린샷 촬영하여 기록

---

## Phase 7: Storybook (P2)

**목표**: 컴포넌트별 인터랙티브 문서.

1. Storybook 설치 + Next.js / Tailwind v4 연동 설정
2. 다크/라이트 전환 데코레이터 설정
3. 컴포넌트별 `.stories.tsx` 작성 (8개)
   - 모든 variant + 상태(hover, disabled, loading)
   - Controls 패널로 props 인터랙티브 조절
4. 토큰 문서 페이지 (MDX)
5. `@storybook/addon-a11y` 설치 + WCAG 자동 검증
6. `storybook build` → 정적 배포 설정

**DoD**:
- 모든 컴포넌트 스토리 렌더링 정상
- a11y 애드온 경고 0건
- `storybook build` 성공

---

## Phase 8: npm 패키지 (P2)

**목표**: `npm install naeil-ui`로 즉시 사용 가능.

1. **빌드 설정**
   - tsup 또는 unbuild로 CJS + ESM 번들
   - `exports` 필드: `naeil-ui/theme.css`, `naeil-ui/components/*`, `naeil-ui/tokens`
   - 트리쉐이킹 지원

2. **패키지 메타데이터**
   - `name: "naeil-ui"`, `license: "MIT"`
   - `peerDependencies: { react, tailwindcss }`

3. **퍼블리시**
   - npm 계정 설정
   - `pnpm publish` → npmjs.com
   - GitHub Release + changelog

**DoD**:
- `npm pack` → 정상 아카이브 생성
- exports 필드에서 `theme.css`, `components/*`, `tokens` 접근 가능
- type declarations 포함 확인
- peerDependencies 정상 설정

---

## 리스크 & 대응

| 리스크 | 확률 | 영향 | 대응 |
|--------|------|------|------|
| SD v4 커스텀 포맷터(`@theme` 출력) 작성 난이도 | 중 | 중 | SD v4 DTCG 파서 내장. 복잡하면 Phase 2에서 수동 CSS로 시작 → SD 점진 도입 |
| Tailwind v4 공유 테마 패턴 미성숙 | 중 | 중 | v4 생태계 사례 아직 적음. `@import` + `@theme inline` 방식이 v4-native 접근. 문제 시 `@config`로 레거시 JS config 폴백 |
| shadcn v4 adapted 변경사항 | 낮 | 중 | 복사 기반이라 초기 버전 핀 후 주기적 업데이트 점검 |
| Pretendard CJK 서브셋 용량 | 중 | 낮 | Variable 웹폰트 + `unicode-range` 서브셋. 또는 CDN |
| 1인 개발 Phase 8까지 동력 유지 | 중 | 높 | Phase 6까지가 실용 MVP. 7-8은 실제 프로젝트 사용 후 필요 시 |
| OKLCH 브라우저 호환성 | 낮 | 낮 | 모든 모던 브라우저 지원 완료. 레거시 브라우저 미타겟 |

## 우선순위 요약

```
[MVP — 이것만 해도 쓸 수 있다]
Phase 1~6: 셋업 → 토큰 → 테마 통합 → 테마 시스템 → 컴포넌트 → 데모

[확장 — 쓰면서 필요할 때]
Phase 7~8: Storybook → npm 패키지
```
