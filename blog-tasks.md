# Tasks: naeil.dev/blog

## Phase 1: 블로그 UI + MDX 렌더링

- [ ] T001: MDX 라이브러리 PoC ← REQ-PAGE-2
  - @next/mdx + Next.js 16 App Router 호환성 테스트
  - 대안 후보: @next/mdx, mdx-bundler, 직접 remark/rehype 파이프라인
  - 샘플 MDX 파일 렌더링 확인 (순수 Markdown, JSX 미사용)
  - PoC 결과로 최종 라이브러리 확정
  - 필요 시 gray-matter, reading-time 설치

- [ ] T002: content/blog 디렉토리 + 샘플 MDX + 용어집 생성
  - `content/blog/en/2026-03-30.mdx` (샘플 영어)
  - `content/blog/ko/2026-03-30.mdx` (샘플 한국어)
  - `content/blog/ja/2026-03-30.mdx` (샘플 일본어)
  - `content/blog/glossary.json` (번역 용어집 초기 버전)
  - frontmatter: Frontmatter Schema 준수 (spec 참조)
  - depends: T001

- [ ] T003: src/lib/blog.ts — MDX 로딩 유틸 ← REQ-PAGE-1, REQ-PAGE-2
  - `getAllPosts(locale)`: 해당 언어 전체 글 목록 (frontmatter만)
  - `getPost(locale, slug)`: 단일 글 (MDX 본문 포함)
  - gray-matter로 frontmatter 파싱
  - reading-time으로 읽기 시간 계산
  - 날짜 내림차순 정렬
  - depends: T001, T002

- [ ] T004: 블로그 목록 페이지 구현 ← REQ-PAGE-1
  - `src/app/[locale]/(content)/blog/page.tsx` 수정 (Coming Soon → 실제 목록)
  - 글 카드: 제목, 날짜, 카테고리 태그, 한 줄 요약, 읽기 시간
  - 페이지네이션 (10개/페이지)
  - 빈 상태: "No posts yet" 메시지
  - depends: T003

- [ ] T005: 블로그 상세 페이지 구현 ← REQ-PAGE-2
  - `src/app/[locale]/(content)/blog/[slug]/page.tsx` 신규
  - MDX 렌더링 (순수 Markdown, 커스텀 컴포넌트는 렌더러에서 주입)
  - My Stack ⭐ 하이라이트 스타일
  - 소스 링크 (원문 URL)
  - 언어 전환 링크 (en/ko/ja)
  - 이전/다음 글 네비게이션
  - depends: T003

- [ ] T006: SEO 메타태그 + sitemap ← REQ-PAGE-3
  - generateMetadata()로 OG 태그 (title, description)
  - JSON-LD Article schema
  - sitemap.ts에 블로그 글 동적 추가
  - canonical URL (영어 = canonical)
  - hreflang 태그 (en/ko/ja)
  - SEO 필드 빌드 시 검증 (누락 체크)
  - depends: T004, T005

- [ ] T007: i18n 메시지 추가
  - messages/en.json, ko.json, ja.json에 blogPage 키 업데이트
  - "Read more", "Published on", "minutes read" 등
  - depends: T004

## Phase 2: 생성 파이프라인

- [ ] T008: Content Collector에 Digest JSON export 추가 ← REQ-EXPORT-1
  - Digest v2 완료 시 `data/digest-latest.json` 생성
  - 포함: 선택 아이템 (title, content, url, category, my_stack, scores, sourceLinks)
  - design-system에서 참조 가능한 경로 설정
  - depends: Digest v2 운영 중

- [ ] T009: scripts/generate-blog.py — Digest JSON → MDX 생성 ← REQ-GEN-1, REQ-GEN-2, REQ-GEN-3
  - Digest JSON 파일 읽기 (DB 직접 접근 X)
  - 사전 품질 게이트 (아이템 >= 3, headlines/research >= 1)
  - 이전 3일 포스트 제목/요약을 컨텍스트로 제공 (중복 방지)
  - Sonnet 4 API 호출 → 순수 Markdown 영어 MDX 생성
  - 사후 품질 게이트:
    - 글 길이 >= 500 words
    - Groundedness 검증 (Digest 원문 대비)
    - URL 유효성 (HEAD 요청)
    - 금지 패턴 필터
  - 재시도 1회 (API 에러 시, backoff)
  - frontmatter 자동 생성 (Frontmatter Schema 준수)
  - MDX 파일 저장 → content/blog/en/YYYY-MM-DD.mdx
  - depends: T003, T008

- [ ] T010: scripts/translate-blog.py — 영어 → 한/일 번역 ← REQ-I18N-1
  - 영어 MDX 파일 읽기
  - glossary.json 로드하여 용어 일관성 보장
  - Sonnet 4로 한국어 번역 → content/blog/ko/YYYY-MM-DD.mdx
  - Sonnet 4로 일본어 번역 → content/blog/ja/YYYY-MM-DD.mdx
    - です/ます체 통일, 카타카나/한자 규칙 프롬프트에 명시
  - frontmatter title, summary만 번역, 나머지 유지
  - Markdown 구조 보존 검증
  - 재시도 1회 (API 에러 시)
  - 부분 실패: 번역 실패 시 영어만 발행 + 알림
  - depends: T009

- [ ] T011: 생성 품질 검증 — 5건 수동 확인
  - generate-blog.py dry-run 5일분
  - 영어 원문 품질 + groundedness 확인
  - 한/일 번역 자연스러움 + 용어 일관성 확인
  - 프롬프트 튜닝 (필요 시)
  - depends: T009, T010

## Phase 3: 자동 발행

- [ ] T012: scripts/publish-blog.sh — git push 자동화 ← REQ-PUB-1
  - MDX 파일 존재 확인
  - idempotency: 같은 날짜 이미 커밋됐으면 skip
  - `git add content/blog/ && git commit -m "blog: auto-generate YYYY-MM-DD" && git push`
  - 변경 없으면 skip (git diff 체크)
  - depends: T010

- [ ] T013: 발행 모드 구현 (auto/review) ← REQ-PUB-2
  - BLOG_MODE 환경변수
  - auto: 생성 → 발행 → 알림
  - review: 생성 → 텔레그램 프리뷰 → Jay 👍 → 발행 / 👎 → 스킵 / 12시간 무응답 → 스킵
  - depends: T012

- [ ] T014: 텔레그램 알림 ← REQ-PUB-3
  - 발행 완료: 제목 + URL
  - 스킵: 사유
  - 에러: 에러 상세
  - review 모드: 프리뷰 텍스트 + 승인 버튼
  - depends: T012

- [ ] T015: Digest 후속 트리거 설정
  - Digest 완료 시 이벤트 기반으로 blog 파이프라인 호출
  - LaunchAgent 또는 Digest 스크립트 끝에 hook 추가
  - depends: T012, T013, T014

- [ ] T016: review 모드 2주 운영 → auto 전환
  - 2주간 매일 결과 확인
  - 품질 안정 확인 후 BLOG_MODE=auto 전환
  - depends: T015

## Phase 4: 개선 (P2)

- [ ] T017: @vercel/og 동적 OG 이미지 생성
  - 블로그 제목 + 카테고리 기반 자동 이미지
  - 빌드 타임 정적 생성 (Vercel Hobby 이미지 제한 고려)
  - depends: T016

- [ ] T018: RSS 피드 생성 (/blog/feed.xml)
  - 표준 RSS 2.0 / Atom
  - depends: T016

- [ ] T019: PKM 지식 블로그 발행 연동 ← REQ-PKM-1
  - PKM에서 태그 기반 블로그 발행
  - depends: T016

---

## Completed

(완료된 태스크는 여기로 이동)
