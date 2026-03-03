# Project Detail Pages — Spec

## Overview

4개 프로젝트(CC, PKM, naeil-ui, Baby Agent)의 상세 페이지를 공통 레이아웃 + 프로젝트별 데이터로 구성한다.

**디자인 원칙**: 미니멀 · 기계적 · 모노크롬 + 단일 악센트 · 장식 제로
**콘텐츠 원칙**: 쇼케이스 (기술 문서 아님). README와 역할 분리 — 사이트는 "왜, 뭐가 특별한가", README는 "어떻게 쓰는가".

---

## Sections (순서)

```
1. Hero         — 바다동물 부유 애니메이션 + 프로젝트명 + 태그라인
2. Overview     — 왜 만들었나 (2-3 문단)
3. Features     — 핵심 기능 3-6개 그리드
4. Architecture — LangGraph 스타일 인터랙티브 워크플로우 DAG
5. Stack        — 기술 아이콘 나열
6. Links        — GitHub · Demo · Blog
```

**포함하지 않는 것**: Status/Roadmap, 스크린샷, 설치 가이드 (README 영역)

---

## 1. Hero

### 레이아웃
- **좌측**: 프로젝트명 (h1) + 한줄 태그라인 + 태그 + 링크 버튼
- **우측**: 바다동물 이미지 (200-240px), 부유 애니메이션
- **모바일**: 세로 스택 (동물 상단, 텍스트 하단)

### 바다동물 비주얼
- 기존 PNG 에셋 사용 (`/public/images/`)
  - CC: `fish.png` (green)
  - PKM: `jellyfish.png` (purple)
  - naeil-ui: `whale.png` (blue)
  - Baby Agent: `turtle.png` (amber)
- **글로우 없음** — 이미지만 단독으로
- CSS `float` 애니메이션: `translateY(-12px)`, 4s ease-in-out infinite
- `filter: drop-shadow(...)` 미세한 악센트 컬러 그림자만 (선택, 없어도 OK)

### 타이포그래피
- 프로젝트명: `text-4xl font-bold tracking-tight` (lg: `text-5xl`)
- 태그라인: `text-lg text-muted-foreground`, max-w-lg
- 태그: 기존 pill 스타일 유지 (`rounded-full border px-2.5 py-1 text-[11px]`)

### 링크 버튼
- Primary: `GitHub →` (악센트 bg)
- Ghost: `Documentation` or `Live Demo` (border only)
- 프로젝트에 따라 1-2개

### 간격
- `pt-28 pb-16` (Nav 아래 여백 포함)
- `max-w-4xl mx-auto px-6`

---

## 2. Overview

### 콘텐츠
- 2-3 문단, 자연어 서술
- "왜 만들었나" + "뭘 해결하나" + "특별한 점" (예: 무료 운영)
- i18n: 3개국어 번역 (en/ko/ja)

### 스타일
- `text-sm leading-7 text-muted-foreground`
- `max-w-2xl`
- 문단 간격: `whitespace-pre-line` (번역 파일에 `\n\n`)

---

## 3. Features

### 레이아웃
- 3-column 그리드 (lg), 2-column (sm), 1-column (mobile)
- 카드 당: 이모지 아이콘 + 제목 + 설명 (1-2줄)
- 3-6개 (프로젝트에 따라)

### 카드 스타일
- `rounded-2xl border p-6`
- 테마 반응: `border-black/[0.06] dark:border-white/[0.06]`
- 호버: `hover:border-black/[0.12] dark:hover:border-white/[0.12]`
- 배경: `bg-black/[0.02] dark:bg-white/[0.02]`

### 아이콘
- 이모지 유지 (SVG 아이콘으로 전환은 나중에 선택적)
- `text-2xl mb-3`

---

## 4. Architecture (핵심 신규 컴포넌트)

### 컨셉
LangGraph Studio 스타일 인터랙티브 워크플로우 다이어그램.
- 세로 방향 (위→아래) DAG
- 노드 = 시스템 구성 요소
- 엣지 = 데이터 흐름 (SVG bezier curve)
- 분기/합류 지원

### 컴포넌트: `<WorkflowDiagram />`

```tsx
interface WorkflowNode {
  id: string;
  label: string;
  type: 'source' | 'process' | 'storage' | 'output' | 'ai';
  position: { x: number; y: number }; // % 기반 (반응형)
  detail: {
    description: string;  // 한줄 설명
    tech: string[];       // 사용 기술 태그
    meta?: string;        // "30min interval", "~18s/item" 등
  };
}

interface WorkflowEdge {
  from: string;     // node id
  to: string;       // node id
  label?: string;   // 엣지 라벨 (선택)
  animated?: boolean; // 점선 애니메이션 (선택)
}

interface WorkflowDiagramProps {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  accent: string;   // 프로젝트 악센트 컬러
}
```

### 노드 비주얼
- 둥근 사각형: `rounded-lg border px-4 py-2.5`
- 기본 상태: `bg-background border-border` + 라벨 텍스트
- **타입별 보더 색상**:
  - `source`: muted (기본 border)
  - `process`: accent 10% border
  - `ai`: accent 20% border + accent dim bg
  - `storage`: muted
  - `output`: accent 15% border
- 폰트: `text-[13px] font-medium font-mono`

### 엣지 비주얼
- SVG `<path>` — cubic bezier curve
- 색상: `accent` at 15% opacity
- 선 두께: 1.5px
- 화살표: 끝점에 작은 삼각형 마커 (`<marker>`)
- 라벨: 엣지 중간에 `text-[10px] text-muted-foreground`
- `animated` 옵션: `stroke-dasharray` + CSS 애니메이션

### 호버 인터랙션
1. **노드 호버 시**:
   - 해당 노드: border 밝아짐 + 미세 scale(1.02)
   - 연결된 엣지: opacity 강조 (15% → 40%)
   - 비연결 노드/엣지: opacity 줄임 (dim 처리)
   - **툴팁 표시**: 노드 옆/아래에 팝오버
2. **툴팁 콘텐츠**:
   - description (한줄)
   - tech 태그들 (pill 형태)
   - meta (있으면, muted 텍스트)
3. **툴팁 스타일**:
   - `rounded-lg border bg-popover p-3 shadow-md`
   - `max-w-[240px]`
   - 삼각형 꼬리 (CSS triangle) 노드 방향으로
   - 진입/퇴장: opacity + translateY 트랜지션 (150ms)

### 반응형
- **Desktop (md+)**: 풀 DAG, 호버 툴팁
- **Mobile**: 세로 파이프라인으로 폴백 (Pipeline 스타일 #4)
  - 호버 대신 탭으로 상세 토글
  - 노드를 세로로 나열, 선으로 연결

### CC 워크플로우 데이터 (예시)

```
Nodes:
  sources   — "Content Sources"  (source)   [top, spread horizontally]
  collector — "Collector"        (process)  [row 2, center]
  classifier— "AI Classifier"   (ai)       [row 3, left]
  dedup     — "Deduplicator"    (process)  [row 3, right]
  storage   — "SQLite Storage"  (storage)  [row 4, center]
  generator — "Digest Generator" (ai)      [row 5, center]
  html      — "HTML Report"     (output)   [row 6, left]
  line      — "LINE Summary"    (output)   [row 6, right]

Edges:
  sources → collector
  collector → classifier
  collector → dedup
  classifier → storage
  dedup → storage
  storage → generator
  generator → html
  generator → line
```

### 위치 계산
- 노드 position은 `{ x: number, y: number }` (0-100 기준, % 상대 좌표)
- 컨테이너: `relative`, 노드는 `absolute` 배치
- 엣지 SVG: 컨테이너와 같은 크기, `pointer-events: none`
- bezier 제어점: from.y와 to.y의 중간점 (세로 방향이므로 `C(fx, mid, tx, mid)`)

---

## 5. Stack

### 레이아웃
- flex wrap, gap-2
- 각 항목: 아이콘(이모지) + 이름 in pill

### 스타일
- `rounded-lg border px-3 py-2 text-[13px]`
- `border-black/[0.06] dark:border-white/[0.06]`
- 아이콘: `text-base`
- 이름: `text-muted-foreground`

---

## 6. Links

### 기존 Hero 안에 포함
- Hero의 링크 버튼으로 충분
- 별도 섹션은 만들지 않음 (Hero에 GitHub + Demo/Docs 버튼)
- Footer 전에 추가 CTA가 필요하면 나중에 검토

---

## Data Model (최종)

```tsx
export interface ProjectData {
  // Identity
  slug: string;              // 'cc' | 'pkm' | 'naeil-ui' | 'baby-agent'
  icon: string;              // '/images/fish.png'
  name: string;              // i18n
  description: string;       // 한줄 태그라인, i18n
  accent: string;            // OKLCH 악센트 컬러

  // Links
  github?: string;
  demo?: string;
  blog?: string;

  // Content
  overview: string;          // 2-3 문단, i18n
  features: ProjectFeature[];
  workflow: WorkflowData;    // NEW — Architecture
  stack: ProjectStackItem[];
}

export interface ProjectFeature {
  icon: string;              // 이모지
  title: string;             // i18n
  description: string;       // i18n
}

export interface WorkflowData {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface WorkflowNode {
  id: string;
  label: string;
  type: 'source' | 'process' | 'storage' | 'output' | 'ai';
  position: { x: number; y: number };
  detail: {
    description: string;     // i18n
    tech: string[];
    meta?: string;           // i18n (선택)
  };
}

export interface WorkflowEdge {
  from: string;
  to: string;
  label?: string;
  animated?: boolean;
}

export interface ProjectStackItem {
  icon: string;
  name: string;
}
```

### 기존 `flow` → `workflow` 마이그레이션
- 기존 `flow: ProjectFlowStep[]` (선형 4단계) → `workflow: WorkflowData` (DAG) 교체
- CC 페이지의 기존 flow 데이터를 workflow 형태로 변환

---

## 변경 파일 목록

### 수정
- `src/components/project-layout.tsx` — Hero 리디자인 + Architecture 섹션 교체
- `src/app/[locale]/(cc)/cc/page.tsx` — workflow 데이터 추가
- `messages/en.json` — workflow 노드 description 추가
- `messages/ko.json` — 동일
- `messages/ja.json` — 동일

### 신규
- `src/components/workflow-diagram.tsx` — 인터랙티브 DAG 컴포넌트
- `src/app/[locale]/(pkm)/pkm/page.tsx` — PKM 상세 페이지 (ProjectLayout 사용)
- naeil-ui, baby-agent 라우트 + 페이지 (추후)

### 삭제
- 없음

---

## 구현 순서

1. `WorkflowDiagram` 컴포넌트 (SVG + 호버 인터랙션)
2. `ProjectLayout` Hero 리디자인 (부유 동물)
3. `ProjectLayout` Architecture 섹션 교체 (flow → workflow)
4. CC 데이터 마이그레이션 (flow → workflow)
5. i18n 번역 업데이트
6. PKM 페이지 데이터 작성 + 적용
7. 반응형 (모바일 파이프라인 폴백)
8. naeil-ui, baby-agent 페이지 (확장)

---

## 접근성

- 노드: `role="button"`, `aria-label`, `tabindex="0"`
- 키보드: Tab으로 노드 순회, Enter/Space로 툴팁 토글
- 툴팁: `role="tooltip"`, `aria-describedby` 연결
- 모바일: 호버 대신 탭 인터랙션
- 부유 애니메이션: `prefers-reduced-motion: reduce` 시 정지
- SVG 엣지: `aria-hidden="true"` (장식적 요소)

---

## 제약/미결정

- [ ] 노드 position 값은 구현 시 시각적으로 조정 필요 (스펙에서 정확한 px 정하기 어려움)
- [ ] 이모지 아이콘 → SVG 아이콘 전환은 별도 이터레이션
- [ ] naeil-ui는 "이 사이트 자체"라는 메타적 성격 — Overview/Features 톤이 다를 수 있음
- [ ] Baby Agent는 아직 초기 — 콘텐츠 밀도가 다른 프로젝트보다 낮을 수 있음
