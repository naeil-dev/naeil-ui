# Spec: Jay Design System

> 미니멀 · 기계적 · 다크 우선의 개인 디자인 시스템. React + Tailwind + shadcn/ui 기반으로, 모든 프로젝트에 일관된 아이덴티티를 부여한다.

## Goals

- [ ] 모든 프로젝트에서 재사용 가능한 디자인 토큰 시스템 확립
- [ ] 다크 우선 + 라이트 모드 지원
- [ ] shadcn/ui 컴포넌트를 커스텀하여 고유 아이덴티티 확보
- [ ] npm 패키지로 배포 가능한 구조
- [ ] W3C DTCG 토큰 표준 준수
- [ ] 토큰을 플랫폼 독립적으로 설계 (JSON → CSS 변수 + React Native StyleSheet 변환 가능)

## Non-Goals (Phase 1 Out of Scope)

- 전용 커스텀 서체 제작 (Phase 1에서는 기존 서체 선택)
- Figma 디자인 키트
- Web Components / Vue / Svelte 포팅

## Future Phases (Phase 2+)

- **React Native 컴포넌트 라이브러리** — 토큰은 Phase 1에서 RN 호환 설계, 컴포넌트는 Phase 2+
- **랜딩 페이지 템플릿** — 컴포넌트 완성 후 쇼케이스/스타터 킷으로 제공

## Requirements

### Functional Requirements

1. **REQ-1: 디자인 토큰 시스템** (P1)
   - Given: 새 프로젝트를 시작할 때
   - When: 디자인 시스템 패키지를 import하면
   - Then: 색상, 타이포, 간격, 그림자, 라운딩 토큰이 즉시 사용 가능
   - 토큰 계층: Primitive → Semantic → Component

2. **REQ-2: 다크/라이트 테마 전환** (P1)
   - Given: 사용자가 테마를 전환할 때
   - When: 다크↔라이트 토글 클릭
   - Then: 모든 시맨틱 토큰이 자동으로 대응 값으로 전환
   - 기본값: 시스템 설정 따르되 다크 우선

3. **REQ-3: 기본 컴포넌트 세트** (P1)
   - shadcn/ui 기반, 커스텀 테마 적용
   - 최소 컴포넌트: Button, Input, Card, Dialog, Dropdown, Toast, Badge, Avatar
   - 모든 컴포넌트는 디자인 토큰만 참조 (하드코딩 금지)

4. **REQ-4: Tailwind 테마 통합** (P1)
   - Given: tailwind.config에 디자인 시스템 프리셋을 추가할 때
   - When: 빌드하면
   - Then: 모든 토큰이 Tailwind 유틸리티 클래스로 사용 가능
   - 예: `bg-brand`, `text-muted`, `space-y-spacing-4`

5. **REQ-5: 문서화 사이트** (P2)
   - 토큰 목록 + 시각적 미리보기
   - 컴포넌트별 사용 예시 + 코드 스니펫
   - 설치/시작 가이드
   - [TBD] Storybook vs 커스텀 docs 사이트 vs Next.js 페이지

6. **REQ-6: npm 패키지 배포** (P2)
   - `@jay/design-system` (또는 적절한 이름)
   - 토큰 (CSS 변수 + JS 상수) + Tailwind 프리셋 + 컴포넌트
   - 시맨틱 버저닝 (semver)

### Non-Functional Requirements

- **일관성**: 모든 색상/간격/타이포는 토큰을 통해서만 사용
- **접근성**: WCAG 2.1 AA 준수 (최소 대비 4.5:1), Radix 접근성 기본 제공
- **성능**: CSS-only 토큰 (JS 런타임 의존 없음), Tailwind purge 적용
- **호환성**: React 18+, Next.js 14+, Node 18+
- **멀티플랫폼 토큰**: JSON 기반 토큰 → Style Dictionary로 CSS/RN/iOS 등 자동 변환 가능한 구조

## 디자인 원칙 (Design Principles)

1. **Precision** — 모든 값은 의도적이다. "대충 이 정도"는 없다.
2. **Zero Noise** — 장식은 0. 있는 것은 전부 기능이 있다.
3. **Dark First** — 다크 모드가 기본. 라이트는 지원하되 주인공이 아님.
4. **Mechanical** — 유기적/손글씨/일러스트가 아닌, 기계적 정밀함.

## 디자인 토큰 구조 (초안)

### 색상 시스템
```
Primitive:   --gray-50 ~ --gray-950, --accent-50 ~ --accent-950
Semantic:    --color-bg-primary, --color-bg-secondary, --color-bg-elevated
             --color-text-primary, --color-text-secondary, --color-text-muted
             --color-border-default, --color-border-subtle
             --color-accent, --color-accent-hover, --color-accent-muted
Component:   --button-bg, --button-text, --card-bg, --input-border 등
```

### 타이포그래피
```
--font-sans: [TBD — 기하학적 산세리프 선택 필요]
--font-mono: [TBD — 코딩용 모노스페이스]
--font-size-xs ~ --font-size-4xl (scale)
--font-weight-normal: 400
--font-weight-medium: 500
--font-weight-bold: 700
--line-height-tight / --line-height-normal / --line-height-relaxed
```

### 간격
```
4px 기반 스케일: 0, 1(4px), 2(8px), 3(12px), 4(16px), 5(20px), 6(24px), 8(32px), 10(40px), 12(48px), 16(64px)
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

- 악센트 색상이 다크/라이트 모드 모두에서 충분한 대비를 가지는가?
- 다크 모드에서 elevation(계층) 구분 — 그림자 대신 밝기 차이 사용?
- 컴포넌트에서 토큰을 우회(하드코딩)하는 것을 어떻게 방지?
- 기존 shadcn 스타일과 커스텀 토큰 충돌 시 어떻게 처리?

## Constraints

- **Tech stack**: React + Next.js + TypeScript + Tailwind CSS + shadcn/ui (Radix Primitives)
- **Budget**: $0 (무료 도구만)
- **개발자**: 1인
- **토큰 표준**: W3C DTCG spec 2025.10 준수

## Success Criteria

1. [ ] 디자인 토큰 JSON + CSS 변수 정의 완료
2. [ ] Tailwind 프리셋 — 새 프로젝트에서 config 한 줄로 적용 가능
3. [ ] 다크/라이트 모드 전환 동작
4. [ ] 핵심 8개 컴포넌트 커스텀 완료 (shadcn 기반)
5. [ ] 데모 페이지 — 모든 토큰 + 컴포넌트 시각적 확인
6. [ ] npm publish 가능 상태

## Open Questions

- [ ] 서체 선택: Geist? Inter? 다른 기하학적 산세리프?
- [ ] 악센트 색상: 블루? 보라? 그린? 모노크롬만?
- [ ] 패키지 이름 / 브랜드 네이밍
- [ ] 문서화 방식: Storybook vs 커스텀 Next.js docs
- [ ] 모노레포 구조: 토큰 / 컴포넌트 분리 여부
