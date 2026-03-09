# Tasks: naeil.dev 인증 시스템

> plan-auth.md 기반. 총 28 태스크, 4 Phase.

## Phase 1: Supabase 셋업 + Auth 기반

| ID | Task | REQ | Owner | Status |
|----|------|-----|-------|--------|
| A01 | Supabase 프로젝트 생성 + SUPABASE_URL, SUPABASE_ANON_KEY env 설정 | - | Jay | ⬜ |
| A02 | Google OAuth 설정 (Google Cloud Console → Supabase Auth Providers) | REQ-1 | Jay | ⬜ |
| A03 | GitHub OAuth App 설정 (GitHub Settings → Supabase Auth Providers) | REQ-1 | Jay | ⬜ |
| A04 | `@supabase/supabase-js` + `@supabase/ssr` 설치 | - | CTO | ⬜ |
| A05 | Supabase 클라이언트 유틸 생성 (`lib/supabase/client.ts`, `server.ts`, `middleware.ts`) | REQ-1 | CTO | ⬜ |
| A06 | middleware.ts 통합 — next-intl + Supabase 세션 갱신 체이닝 | REQ-8 | CTO | ⬜ |
| A07 | /[locale]/login 페이지 — Google/GitHub 버튼, i18n, 다크/라이트, 브랜딩 | REQ-7 | CTO | ⬜ |
| A08 | /auth/callback Route Handler — code exchange + next 파라미터 리다이렉트 | REQ-8 | CTO | ⬜ |
| A09 | 로그아웃 Server Action + 클라이언트 호출 | REQ-2 | CTO | ⬜ |
| A10 | Phase 1 E2E 검증 — Google 로그인 → 세션 → 로그아웃 플로우 | - | Jay | ⬜ |

**Blocked:** A04~A09 ← A01~A03 (Supabase + OAuth 설정 먼저)

---

## Phase 2: Nav 인증 UI + 보호 라우트

| ID | Task | REQ | Owner | Status |
|----|------|-----|-------|--------|
| A11 | Nav 서버 컴포넌트 — getUser() 호출 + 인증 상태 prop 전달 | REQ-3 | CTO | ⬜ |
| A12 | Nav 로그인 버튼 / Avatar+DropdownMenu 조건부 렌더링 | REQ-3 | CTO | ⬜ |
| A13 | Avatar 컴포넌트 — OAuth 프로필 이미지 표시 (fallback: 이니셜) | REQ-3 | CTO | ⬜ |
| A14 | 보호 라우트 미들웨어 — `/sa/reports/:id` 패턴 매칭 + 리다이렉트 | REQ-5 | CTO | ⬜ |
| A15 | /login next 파라미터 처리 — 로그인 후 원래 페이지로 복귀 | REQ-5 | CTO | ⬜ |
| A16 | i18n 메시지 추가 — 로그인/로그아웃/프로필 관련 ko/en/ja | REQ-7 | CTO | ⬜ |
| A17 | Phase 2 검증 — Nav 상태 전환 + 보호 라우트 리다이렉트 테스트 | - | Jay | ⬜ |

**Blocked:** A11~A16 ← A10 (Phase 1 완료)

---

## Phase 3: 리포트 동기화 파이프라인

| ID | Task | REQ | Owner | Status |
|----|------|-----|-------|--------|
| A18 | SA 로컬 DB 리포트 스키마 분석 — 현재 테이블/컬럼 확인 | REQ-6 | Mini | ⬜ |
| A19 | Supabase reports 테이블 생성 + RLS 정책 적용 (SQL) | REQ-6 | Jay | ⬜ |
| A20 | sections JSONB 매핑 설계 — SA 출력 → 프론트 소비 구조 정의 | REQ-6 | Mini | ⬜ |
| A21 | sync_reports.py 작성 — 로컬 PG → Supabase REST upsert | REQ-6 | CTO | ⬜ |
| A22 | 동기화 테스트 — 기존 리포트 수동 실행 + Supabase 확인 | REQ-6 | Jay | ⬜ |
| A23 | 자동화 설정 — SA 파이프라인 후처리 hook 또는 LaunchAgent cron | REQ-6 | Mini | ⬜ |

**Blocked:** A19 ← A01, A21 ← A18+A20

---

## Phase 4: 리포트 UI

| ID | Task | REQ | Owner | Status |
|----|------|-----|-------|--------|
| A24 | /sa/reports 목록 페이지 — SSR, Supabase 쿼리, 카드 그리드 | REQ-4 | CTO | ⬜ |
| A25 | 리포트 카드 컴포넌트 — 등급 뱃지, 섹터 태그, 기업명/연도 | REQ-4 | CTO | ⬜ |
| A26 | /sa/reports/[id] 상세 페이지 — 탭 (개요/환경/사회/거버넌스) | REQ-5 | CTO | ⬜ |
| A27 | 비로그인 목록 접근 시 로그인 유도 배너/오버레이 | REQ-4 | CTO | ⬜ |
| A28 | 빈 상태 UI + i18n 메시지 추가 (리포트 관련) | REQ-4,5 | CTO | ⬜ |

**Blocked:** A24~A28 ← A17 + A22 (Auth UI + 실 데이터 필요)

---

## 의존성 그래프

```
A01 (Supabase 생성) ──→ A04~A09 (Auth 구현) ──→ A10 (검증)
A02 (Google OAuth)  ─┘                              ↓
A03 (GitHub OAuth) ──┘                          A11~A17 (Nav UI)
                                                     ↓
A01 ──→ A19 (테이블)                            A24~A28 (리포트 UI)
A18 (스키마 분석) ──→ A20 (매핑) ──→ A21 (sync) ──→ A22 (테스트) ─┘
```

## Owner 범례

| Owner | 역할 |
|-------|------|
| Jay | 수동 설정 (Supabase, OAuth, 검증) |
| CTO | 코드 구현 (Claude Code 위임) |
| Mini | 분석/설계/자동화 |

## 우선순위

Phase 1 → **즉시 착수 가능** (Jay가 A01~A03 먼저)
Phase 2, 3 → Phase 1 후 **병렬 가능**
Phase 4 → Phase 2+3 완료 후
