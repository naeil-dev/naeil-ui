# Plan: naeil.dev/blog

## Approach

기존 Next.js 16 프로젝트(design-system)에 블로그 섹션을 추가한다. MDX 파일 기반 정적 생성 + Content Collector의 Digest v2 결과를 Sonnet 4로 블로그 글 변환 + 3개국어 자동 발행.

핵심 전략: **블로그 UI 먼저 → 생성 파이프라인 → 자동화 연결** 순서.

## Tech Stack

| 컴포넌트 | 선택 | 이유 |
|----------|------|------|
| 프레임워크 | Next.js 16 (기존) | 추가 인프라 불필요 |
| MDX 처리 | @next/mdx 또는 호환 대안 (PoC 후 확정) | next-mdx-remote archived → 대안 필요 |
| i18n | next-intl (기존) | en/ko/ja 이미 구현 |
| 디자인 | @naeil/ui (기존) | 일관된 UI |
| 글 생성 | Sonnet 4 | Max 플랜, $0 추가 |
| 번역 | Sonnet 4 | 동일 |
| Hosting | Vercel Hobby (기존) | git push → 자동 배포 |
| SEO | Next.js metadata API | 내장 기능 |

## Phases

### Phase 1: 블로그 UI + 수동 발행 (P1)
- What: MDX 라이브러리 PoC + 렌더링, 목록/상세 페이지, SEO, 3개국어 라우팅
- Dependencies: 없음
- Estimated effort: **medium**
- 목표: "MDX 파일 넣으면 블로그에 보인다"

### Phase 2: 생성 파이프라인 (P1)
- What: Digest → Sonnet 4 → MDX 생성 + 번역 스크립트
- Dependencies: Phase 1, Digest v2 운영 중
- Estimated effort: **medium**
- 목표: "스크립트 실행하면 블로그 글이 만들어진다"

### Phase 3: 자동 발행 (P1)
- What: Digest 후 자동 실행 + git push + 알림
- Dependencies: Phase 2
- Estimated effort: **small**
- 목표: "내가 안 해도 블로그가 올라간다"

### Phase 4: 개선 (P2)
- What: OG 이미지, PKM 연동, RSS 피드
- Dependencies: Phase 3 안정화
- Estimated effort: **medium**

## Architecture

### 콘텐츠 흐름

```
Content Collector (수집 + 분류)
  ↓
Digest v2 (스코어링 + 선택)
  ↓
Digest JSON export (data/digest-latest.json)
  ↓
Blog Generator (scripts/generate-blog.py)
  ├─ 사전 품질 게이트
  ├─ Sonnet 4 → 영어 MDX 생성 (순수 Markdown)
  ├─ 사후 품질 게이트 (groundedness, URL 유효성)
  ├─ Sonnet 4 → 한국어 번역 (용어집 참조)
  └─ Sonnet 4 → 일본어 번역 (용어집 참조)
  ↓
content/blog/{en,ko,ja}/YYYY-MM-DD.mdx
  ↓
git commit + push
  ↓
Vercel 자동 배포
  ↓
naeil.dev/blog/YYYY-MM-DD (live)
```

### 파일 구조 (design-system 프로젝트)

```
content/
  blog/
    en/
      2026-03-30.mdx
      2026-03-31.mdx
    ko/
      2026-03-30.mdx
    ja/
      2026-03-30.mdx

src/app/[locale]/(content)/blog/
  page.tsx          ← 목록 페이지 (기존 Coming Soon → 실제 구현)
  [slug]/
    page.tsx        ← 상세 페이지 (신규)

src/lib/
  blog.ts           ← MDX 로딩 + 파싱 유틸

scripts/
  generate-blog.py  ← Digest → MDX 생성
  translate-blog.py ← 영어 → 한/일 번역
  publish-blog.sh   ← git push 자동화
```

### 자동화 타이밍

```
09:05 JST  Digest v2 실행 (LaunchAgent, 기존)
~09:08     Digest 완료 → JSON export (이벤트 트리거)
~09:09     Blog Generator 실행
           ├─ 사전 품질 게이트 (~1초)
           ├─ 글 생성 (Sonnet 4, ~60초)
           ├─ 사후 품질 게이트 (groundedness + URL, ~30초)
           ├─ 번역 2건 (Sonnet 4, 각 ~60초)
           └─ git push → Vercel 배포 (~60초)
~09:25 JST 텔레그램 알림
```

## Testing Strategy

| 유형 | 대상 | 방법 |
|------|------|------|
| UI | 블로그 페이지 | 브라우저 수동 검증 (3개 언어) |
| 생성 | generate-blog.py | dry-run → 출력 검증 |
| 번역 | translate-blog.py | 번역 품질 수동 확인 (초기 5건) |
| SEO | 메타태그, sitemap | Lighthouse + Google Search Console |
| E2E | 전체 파이프라인 | review 모드로 2주 검증 |

## Risks

| 위험 | 영향 | 완화 |
|------|------|------|
| Sonnet 4 생성 품질 불안정 | 저품질 글 발행 | 품질 게이트 + review 모드 2주 |
| 번역 어색함 | 한/일 독자 이탈 | 번역 프롬프트 튜닝 + 초기 수동 확인 |
| Vercel 빌드 시간 증가 | 배포 지연 | MDX는 정적 생성, 영향 미미 |
| 매일 git push 노이즈 | git history 오염 | blog/ 전용 커밋 메시지 패턴 |
| Digest 스킵 날 블로그 없음 | 콘텐츠 공백 | 정상 동작, 빈 날은 빈 게 맞음 |

## Decisions

| 결정 | 선택 | 대안 | 이유 |
|------|------|------|------|
| 블로그 위치 | naeil.dev/blog | blog.naeil.dev | SEO 유리, 관리 단순 |
| MDX 라이브러리 | @next/mdx 또는 대안 (PoC) | next-mdx-remote (archived) | next-mdx-remote 미지원, PoC로 확정 |
| 콘텐츠 저장 | git (MDX 파일) | CMS (Notion, Sanity) | $0, 자동화 간단, 버전 관리 |
| 생성 모델 | Sonnet 4 | Gemini | Max 플랜 포함, 품질 우수 |
| 원문 언어 | 영어 | 한국어 | 소스가 영어, 번역 정확도 높음 |
| 자동화 | Level 1 (완전 자동) | Level 2/3 | Jay 요청, 초기 review 모드로 안전망 |
| OG 이미지 | Phase 2 | Phase 1 | 핵심 아님, 나중에 @vercel/og |
