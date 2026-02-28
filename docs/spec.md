# Spec: naeil-ui

> 미니멀 · 기계적 · 다크 우선의 개인 디자인 시스템. React + Tailwind v4 + shadcn/ui 기반으로, 모든 프로젝트에 일관된 아이덴티티를 부여한다.

## Goals

- [ ] 모든 프로젝트에서 재사용 가능한 디자인 토큰 시스템 확립
- [ ] 다크 우선 + 라이트 모드 지원
- [ ] shadcn/ui (v4 adapted) 컴포넌트를 커스텀하여 고유 아이덴티티 확보
- [ ] npm 패키지로 배포 가능한 구조
- [ ] W3C DTCG 토큰 표준 준수
- [ ] 토큰을 멀티플랫폼 변환 차단하지 않는 구조로 설계 (JSON 기반, SD 변환 가능)

## Non-Goals (Phase 1 Out of Scope)

- 전용 커스텀 서체 제작 (Phase 1에서는 기존 서체 선택)
- Figma 디자인 키트
- Web Components / Vue / Svelte 포팅
- React Native 실제 변환/검증 (Phase 2+에서 수행)

## Future Phases (Phase 2+)

- **React Native 컴포넌트 라이브러리** — 토큰은 Phase 1에서 SD 멀티플랫폼 차단 없는 구조로 설계, RN 변환 검증 및 컴포넌트는 Phase 2+
- **랜딩 페이지 템플릿** — 컴포넌트 완성 후 쇼케이스/스타터 킷으로 제공

## Requirements

### Functional Requirements

1. **REQ-1: 디자인 토큰 시스템** (P1)
   - Given: 새 프로젝트를 시작할 때
   - When: 디자인 시스템 패키지를 import하면
   - Then: 색상, 타이포, 간격, 그림자, 라운딩 토큰이 즉시 사용 가능
   - 토큰 계층: Primitive → Semantic (Phase 1에서는 2단계, Component 레이어는 컴포넌트 20개+ 시 도입)

2. **REQ-2: 다크/라이트 테마 전환** (P1)
   - Given: 사용자가 테마를 전환할 때
   - When: 다크↔라이트 토글 클릭
   - Then: 모든 시맨틱 토큰이 자동으로 대응 값으로 전환
   - 우선순위: user override > system preference > fallback dark

3. **REQ-3: 기본 컴포넌트 세트** (P1)
   - shadcn/ui (Tailwind v4 adapted) 기반, 커스텀 테마 적용
   - 최소 컴포넌트: Button, Input, Card, Dialog, Dropdown, Sonner (Toast 대체), Badge, Avatar
   - 모든 컴포넌트는 디자인 토큰만 참조 (하드코딩 금지)
   - shadcn v4 변경사항 반영: OKLCH 색상, `tw-animate-css`, `data-slot`, `forwardRef` 제거 (React 19)
   - 토큰 매핑 전략: naeil-ui 시맨틱 토큰을 shadcn 표준 변수명(`--primary`, `--ring` 등)에 매핑 (코드 수정 최소화)

4. **REQ-4: Tailwind v4 테마 통합** (P1)
   - Given: 소비 프로젝트의 CSS에 naeil-ui 테마를 import할 때
   - When: `@import "naeil-ui/theme.css"` 한 줄 추가
   - Then: 모든 토큰이 Tailwind 유틸리티 클래스로 사용 가능
   - v4 CSS-first 설정: `@theme` 블록으로 토큰 → Tailwind 유틸리티 매핑
   - 예: `bg-accent`, `text-muted`, `rounded-sm`

5. **REQ-5: 문서화 (Storybook)** (P2)
   - 토큰 목록 + 시각적 미리보기
   - 컴포넌트별 사용 예시 + 코드 스니펫
   - 설치/시작 가이드
   - Storybook 사용 (컴포넌트 개발과 문서가 한 흐름)

6. **REQ-6: npm 패키지 배포** (P2)
   - `naeil-ui`
   - 토큰 CSS (`theme.css`) + JS 상수 + 컴포넌트
   - 시맨틱 버저닝 (semver)
   - 검증: `npm pack` + exports 필드 + type declarations + peerDependencies 정상 확인

### Non-Functional Requirements

- **일관성**: 모든 색상/간격/타이포는 토큰을 통해서만 사용
- **접근성**: WCAG 2.1 AA 준수 (최소 대비 4.5:1), Radix 접근성 기본 제공
- **성능**: CSS-only 토큰 (JS 런타임 의존 없음), Tailwind v4 자동 트리쉐이킹 활용
- **호환성**: React 19+, Next.js 15+, Node 18+
- **멀티플랫폼 토큰**: JSON 기반 DTCG 토큰 → Style Dictionary로 CSS/RN/iOS 등 변환 가능한 구조 (Phase 1에서는 CSS 출력만, RN 차단하지 않는 설계)

## 프로젝트 구조

```
naeil-ui/
├── src/
│   ├── tokens/        # DTCG JSON 토큰 소스
│   ├── components/    # UI 컴포넌트 (shadcn 커스텀)
│   └── utils/         # 헬퍼
├── dist/
│   └── theme.css      # SD 빌드 산출물 (@theme 포함)
├── docs/              # spec, plan, brainstorm
├── stories/           # Storybook 스토리
├── style-dictionary.config.ts
├── package.json
└── tsconfig.json
```

단일 패키지로 시작. 컴포넌트 20개+ 초과 시 `@naeil-ui/tokens`, `@naeil-ui/components`로 pnpm workspace 분리.

## 디자인 원칙 (Design Principles)

1. **Precision** — 모든 값은 의도적이다. "대충 이 정도"는 없다.
2. **Zero Noise** — 장식은 0. 있는 것은 전부 기능이 있다.
3. **Dark First** — 다크 모드가 기본. 라이트는 지원하되 주인공이 아님.
4. **Mechanical** — 유기적/손글씨/일러스트가 아닌, 기계적 정밀함.

## 디자인 토큰 구조

### 색상 시스템

색상 공간: **OKLCH** 사용 (shadcn v4 + Tailwind v4 정합, 지각적 균일성으로 다크/라이트 팔레트 생성에 유리)

```
Primitive:   --gray-50 ~ --gray-950, --accent-50 ~ --accent-950 (OKLCH 값)
Semantic:    --color-bg-primary, --color-bg-secondary, --color-bg-elevated
             --color-text-primary, --color-text-secondary, --color-text-muted
             --color-border-default, --color-border-subtle
             --color-accent, --color-accent-hover, --color-accent-muted
```

Phase 1에서는 Primitive → Semantic 2단계. Component 레이어(`--button-bg` 등)는 컴포넌트 20개+ 시 도입.

**악센트 색상 전략**: 디자인 시스템은 악센트 시맨틱 토큰 슬롯(`--color-accent` 계열)만 정의. 실제 색상 값은 각 프로젝트가 Primitive 레벨에서 주입. 기본값으로 뉴트럴 블루 제공.

### 타이포그래피
```
--font-sans: "Pretendard Variable", Pretendard, -apple-system, system-ui, sans-serif
--font-mono: "JetBrains Mono", "Geist Mono", ui-monospace, monospace
--font-size-xs ~ --font-size-4xl (scale)
--font-weight-normal: 400
--font-weight-medium: 500
--font-weight-bold: 700
--line-height-tight / --line-height-normal / --line-height-relaxed
```

### 간격
```
4px 기반 스케일: 0, 1(4px), 2(8px), 3(12px), 4(16px), 5(20px), 6(24px), 8(32px), 10(40px), 12(48px), 16(64px)
(7, 9, 11, 13~15 누락은 의도적 — Tailwind 기본 스케일과 유사한 비선형 확장)
```

### 기타
```
--radius-none: 0
--radius-sm: 2px
--radius-md: 4px
--radius-lg: 8px (최대 — 과도한 라운딩 금지)
--shadow-sm / --shadow-md (다크 모드: 미니멀 그림자 + elevation으로 구분)
```

## Edge Cases

- 악센트 색상이 다크/라이트 모드 모두에서 충분한 대비를 가지는가? → WCAG contrast 자동 체크로 검증
- 다크 모드에서 elevation(계층) 구분 — 그림자 대신 밝기 차이 사용?
- 컴포넌트에서 토큰을 우회(하드코딩)하는 것을 어떻게 방지? → lint rule로 강제
- 기존 shadcn 스타일과 커스텀 토큰 충돌 시 어떻게 처리? → shadcn 표준 변수명에 매핑하여 충돌 방지
- 타겟 브라우저가 OKLCH / `@property`를 지원하는가? → 모던 브라우저 타겟, polyfill 불필요

## Constraints

- **Tech stack**: React 19 + Next.js 15 + TypeScript + Tailwind CSS v4 + shadcn/ui (Radix Primitives)
- **Budget**: $0 (무료 도구만)
- **개발자**: 1인
- **토큰 표준**: W3C DTCG spec 2025.10 준수

## Success Criteria

1. [ ] 디자인 토큰 DTCG JSON + CSS 변수(`theme.css`) 정의 완료
2. [ ] Tailwind v4 테마 — 소비 프로젝트에서 `@import "naeil-ui/theme.css"` 한 줄로 적용 가능
3. [ ] 다크/라이트 모드 전환 동작 (user > system > dark fallback)
4. [ ] 핵심 8개 컴포넌트 커스텀 완료 (shadcn v4 기반)
5. [ ] 데모 페이지 — 모든 토큰 + 컴포넌트 시각적 확인
6. [ ] npm publish 가능 상태 (`npm pack` + exports + type declarations + peerDeps 검증)

## Resolved Questions

- [x] 서체: Pretendard (본문+UI) + JetBrains Mono/Geist Mono (코드)
- [x] 악센트 색상: 프로젝트별 주입 (시맨틱 슬롯만 정의, 기본값 뉴트럴 블루)
- [x] 패키지 이름: `naeil-ui`
- [x] 문서화: Storybook
- [x] 구조: 단일 패키지 → 성장 시(컴포넌트 20개+) pnpm workspace로 분리
- [x] 색상 공간: OKLCH (shadcn v4 + Tailwind v4 정합)
- [x] Tailwind 통합: v4 CSS-first (`@theme` + `@import`), JS preset 사용 안 함
- [x] 토큰 계층: Phase 1은 Primitive → Semantic 2단계, Component 레이어는 후기 도입
- [x] 토큰 매핑: shadcn 표준 변수명에 매핑 (코드 수정 최소화)
