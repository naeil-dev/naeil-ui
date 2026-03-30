# Spec: naeil.dev/blog — AI Tech Blog (Auto-publishing)

> Digest v2의 큐레이션 콘텐츠를 기반으로, 매일 자동으로 3개 국어 블로그 글을 생성·발행하는 시스템.

## Background

- Content Collector가 매일 23개 소스에서 AI/기술 뉴스를 수집·분류·스코어링
- Digest v2가 카테고리별(Headlines/Research/Tools/Quick Bits) 동적 선택
- 현재 Digest는 LINE 메시지 + digest.naeil.dev HTML로만 전달
- 이 콘텐츠를 블로그 형태로 재가공하면 SEO + 아카이브 + 외부 공유 가능

## Goals

- [ ] Digest 콘텐츠 기반 블로그 글 자동 생성 (영어 원문)
- [ ] 한국어/일본어 자동 번역
- [ ] naeil.dev/blog에 카테고리별 섹션으로 발행
- [ ] 품질 게이트: 양적 + 팩트 검증 (groundedness + URL 유효성)
- [ ] 완전 자동 파이프라인 (초기 2주는 반자동 검증)

## Non-Goals (Out of Scope)

- 댓글/소셜 기능
- 뉴스레터 구독 시스템 (나중에 별도 검토)
- RSS 피드 생성 (Phase 4로 검토)
- 회사/일상 콘텐츠 (AI/기술 전용)
- Digest 발송 방식 변경 (LINE + HTML 유지)

---

## Requirements

### 1. 블로그 글 생성

**REQ-GEN-1: Digest → 블로그 글 변환** (P1)
- Given: Digest v2 파이프라인이 당일 선택된 아이템을 JSON으로 export했을 때
- When: 블로그 생성 파이프라인이 실행되면
- Then: 영어 원문 블로그 글 1편을 순수 Markdown (.mdx 확장자, JSX 미사용) 파일로 생성
- 입력: **Digest JSON export 파일** (cross-project DB 직접 접근 X)
- 모델: **Sonnet 4** (anthropic/claude-sonnet-4-20250514, Max 플랜)
- LLM 출력: **순수 Markdown만** (JSX 컴포넌트 금지). 커스텀 컴포넌트는 MDX 렌더러에서 주입

**REQ-GEN-2: 글 톤 & 스타일** (P1)
- 대상: AI 초보 개발자 (Digest와 동일)
- 톤: 친근하지만 전문적. 기술 용어에 쉬운 설명 병기
- 각 아이템에 "왜 중요한지" + "체크 포인트" 포함
- My Stack ⭐ 아이템은 별도 하이라이트
- 중복 방지: 이전 3일 포스트 제목/요약을 컨텍스트로 제공하여 차별화 유도

**REQ-GEN-3: 품질 게이트** (P1)

사전 게이트 (생성 전):
- 선택된 아이템 >= 3개
- headlines 또는 research 카테고리 >= 1개

사후 게이트 (생성 후):
- 생성된 글 길이 >= 500 words
- **Groundedness 검증**: 생성된 본문의 핵심 주장이 Digest 원문 데이터에 존재하는지 교차 검증
- **URL 유효성**: 본문에 포함된 URL이 실제 존재하는지 HEAD 요청으로 확인
- **금지 패턴 필터**: 존재하지 않는 GitHub 리포 링크, 허위 버전 번호 등 탐지
- **Digest에 없는 신규 사실 금지** (hallucination 방지)

미달 시: 블로그 스킵, 텔레그램으로 "오늘은 발행 기준 미달 — [사유]" 알림

### 2. 다국어 번역

**REQ-I18N-1: 영어 → 한국어/일본어 번역** (P1)
- Given: 영어 원문 MDX가 생성됐을 때
- When: 번역 파이프라인이 실행되면
- Then: 한국어, 일본어 MDX 파일 각 1개 생성
- 모델: **Sonnet 4** (Max 플랜)
- 규칙:
  - frontmatter: title, summary만 번역. date, categories, tags, slug 유지
  - 기술 용어는 원어 병기 (예: "임베딩(Embedding)")
  - 용어집(glossary) 적용: 고유명사/기술 용어 일관성 보장
  - 자연스러운 문체 (번역체 금지)
  - 일본어: です/ます체 통일, 카타카나 vs 한자 규칙 명시
  - MDX 구조(헤딩, 코드블록 등) 유지

**REQ-I18N-2: 파일 구조** (P1)
```
content/blog/
  en/2026-03-30.mdx
  ko/2026-03-30.mdx
  ja/2026-03-30.mdx
  glossary.json        ← 번역 용어집
```

### 3. 블로그 페이지 구현

**REQ-PAGE-1: 블로그 목록 페이지** (P1)
- URL: /blog (+ /ko/blog, /ja/blog)
- 최신 글 목록 (제목, 날짜, 카테고리 태그, 한 줄 요약)
- 페이지네이션 (10개/페이지)

**REQ-PAGE-2: 블로그 상세 페이지** (P1)
- URL: /blog/[slug] (+ /ko/blog/[slug], /ja/blog/[slug])
- MDX 렌더링 (순수 Markdown, 커스텀 컴포넌트는 렌더러에서 주입)
- My Stack ⭐ 아이템 하이라이트 스타일
- 소스 링크 (원문 URL)
- 언어 전환 링크 (en/ko/ja)

**REQ-PAGE-3: SEO** (P1)
- Open Graph 메타태그 (title, description)
- JSON-LD 구조화 데이터 (Article schema)
- sitemap.xml에 블로그 글 포함
- canonical URL 설정 (영어 = canonical)
- hreflang 태그 (en/ko/ja 상호 참조)

### 4. 자동 발행 파이프라인

**REQ-PUB-1: 자동 발행 흐름** (P1)
```
Digest 완료 (이벤트 트리거, 시간 고정 X)
  ↓
Digest JSON export 생성 (Content Collector 측)
  ↓
사전 품질 게이트 (아이템 수, 카테고리)
  ↓ Pass
Sonnet 4로 영어 블로그 글 생성
  ↓
사후 품질 게이트 (길이, groundedness, URL 유효성)
  ↓ Pass
Sonnet 4로 한/일 번역
  ↓
MDX 파일 3개 생성 (content/blog/en,ko,ja)
  ↓
git commit + push → Vercel 자동 배포
  (idempotency: 날짜별 1회, 변경 없으면 skip)
  ↓
텔레그램 알림
```
- 예상 소요: Digest 완료 후 ~15-20분
- Digest → Blog 연결: Digest가 JSON 파일 export → Blog generator가 JSON 소비

**REQ-PUB-2: 발행 모드** (P1)
- `BLOG_MODE=auto`: 완전 자동 (품질 게이트 통과 시 즉시 발행)
- `BLOG_MODE=review`: 반자동
  - 초안 생성 → 텔레그램으로 프리뷰 텍스트 전송
  - Jay가 👍 반응 → 자동 발행 트리거
  - Jay가 👎 반응 → 스킵 + 사유 기록
  - 12시간 이내 무응답 → 자동 스킵
- 초기 2주: `review` 모드
- 안정화 후: `auto` 모드

**REQ-PUB-3: 텔레그램 알림** (P1)
- 발행 완료: "📝 Blog published: [title] — naeil.dev/blog/[slug]"
- 스킵: "📝 Blog skipped today — [사유]"
- 에러: "📝 Blog pipeline failed — [에러 상세]"
- review 모드: 프리뷰 + 👍/👎 버튼

### 5. Digest JSON Export (Content Collector 측)

**REQ-EXPORT-1: Digest → JSON export** (P1)
- Given: Digest v2 파이프라인이 완료됐을 때
- When: 발행할 아이템이 있으면
- Then: `data/digest-latest.json` 파일로 export
- 포함 데이터: 선택된 아이템 (title, content, url, category, my_stack, scores)
- design-system 프로젝트에서 이 파일을 읽어감 (symlink 또는 경로 참조)

### 6. PKM 연동

**REQ-PKM-1: PKM 지식 블로그 발행** (P2)
- Phase 2 — Digest 자동 발행 안정화 후

---

## Key Entities

| Entity | 위치 | 비고 |
|--------|------|------|
| 블로그 MDX 파일 | `content/blog/{lang}/{slug}.mdx` | git 관리, 순수 Markdown |
| Digest JSON export | CC `data/digest-latest.json` | CC에서 export, Blog에서 소비 |
| 용어집 | `content/blog/glossary.json` | 번역 용어 일관성 |
| 블로그 목록 페이지 | `src/app/[locale]/blog/page.tsx` | Next.js |
| 블로그 상세 페이지 | `src/app/[locale]/blog/[slug]/page.tsx` | MDX 렌더 |
| 생성 스크립트 | `scripts/generate-blog.py` | Sonnet 4 호출, JSON 입력 |
| 번역 스크립트 | `scripts/translate-blog.py` | Sonnet 4 호출, 용어집 참조 |
| 발행 스크립트 | `scripts/publish-blog.sh` | git push 자동화 |

### Frontmatter Schema
```yaml
---
title: string          # 필수, 각 locale별 번역
date: YYYY-MM-DD       # 필수, 전 locale 동일
slug: YYYY-MM-DD       # 필수, 전 locale 동일
summary: string        # 필수, 각 locale별 번역
categories: string[]   # 필수, 전 locale 동일 (headlines, research, tools, quick)
tags: string[]         # 필수, 전 locale 동일
myStack: boolean       # My Stack 아이템 포함 여부
digestId: number       # Digest run ID (소스 추적)
sourceLinks: string[]  # 원문 URL 목록
locale: en|ko|ja       # 해당 파일의 언어
canonical: string      # 영어 URL (en이 canonical)
---
```

---

## Edge Cases

- **Digest 아이템 0건**: 블로그 스킵 + 알림
- **Sonnet 4 API 에러**: 재시도 1회 (backoff) → 실패 시 스킵 + 알림
- **번역 실패**: 영어만 발행 (한/일은 다음 날 재시도)
- **Vercel 배포 실패**: git push는 성공, 배포 실패 → 텔레그램 알림
- **중복 발행 방지**: 같은 날짜 slug 이미 존재하면 skip (idempotency)
- **연말연시 등 수집 극소**: 품질 게이트에서 자동 스킵
- **부분 실패**: 영문 생성 OK + 번역 실패 → 영문만 발행, 번역 실패 알림

---

## Constraints

- **Tech stack**: Next.js 16, next-intl, MDX (@next/mdx 또는 호환 대안 — PoC 후 확정), @naeil/ui
- **생성 모델**: Sonnet 4 (Max 플랜, $0 추가)
- **Hosting**: Vercel Hobby (무료)
- **CI/CD**: git push → Vercel 자동 배포
- **비용**: $0 추가
- **출처 정책**: 원문 링크 필수 포함, 본문 직접 인용은 1-2문장 이내, 나머지는 재가공
- **커밋 규칙**: `blog: auto-generate YYYY-MM-DD` 패턴 통일
- **단계적 도입**: Phase 1(블로그 UI) → Phase 2(생성) → Phase 3(자동화) → Phase 4(개선)

---

## Success Criteria

1. [ ] 매일 (또는 콘텐츠 있는 날) 3개국어 블로그 자동 발행
2. [ ] 품질 게이트: 저품질 글 발행률 < 5%
3. [ ] SEO: 1개월 후 구글 검색에 블로그 글 인덱싱 확인
4. [ ] 페이지 로드 < 2초 (Vercel 기준)
5. [ ] Jay 만족도: "읽을 만하고, 수동 개입 거의 없다"

---

## Open Questions (resolved)

- [x] 생성 모델 → Sonnet 4 (Max 플랜)
- [x] 원문 언어 → 영어
- [x] 사이트 구조 → naeil.dev/blog (서브도메인 X)
- [x] MDX 라이브러리 → ~~next-mdx-remote~~ **archived 상태** → @next/mdx 또는 대안 (PoC 태스크에서 확정)
- [x] OG 이미지 → Phase 1은 텍스트 OG만, Phase 4에서 @vercel/og 동적 이미지
- [x] 품질 게이트 → 양적 게이트 + groundedness 검증 + URL 유효성 (리뷰 합의)
- [x] DB 접근 → cross-project DB 직접 접근 X → Digest JSON export 방식 (리뷰 합의)
- [x] LLM 출력 → 순수 Markdown (JSX 금지), 렌더러에서 컴포넌트 주입 (리뷰 합의)
- [x] Review mode UX → 텔레그램 프리뷰 → 👍/👎 → 12시간 무응답 시 스킵 (리뷰 합의)
