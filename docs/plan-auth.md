# Plan: naeil.dev 인증 시스템

> spec-auth.md 기반. 4 Phase, 의존성 순서대로 진행.

## Phase 1: Supabase 셋업 + Auth 기반 (REQ-1, 2, 7, 8)

**목표:** 로그인/로그아웃이 동작하는 최소 인프라

**설계 결정:**
- `@supabase/ssr` 쿠키 기반 — App Router SSR 호환, localStorage 사용 안 함
- PKCE flow — OAuth 보안 표준
- middleware.ts에서 세션 자동 갱신 — 매 요청마다 쿠키 리프레시
- Supabase 클라이언트 2종: `createBrowserClient` (클라이언트), `createServerClient` (서버/미들웨어)

**작업:**
1. Supabase 프로젝트 생성 (Jay 수동) + env 설정
2. Google OAuth + GitHub OAuth 설정 (Jay 수동)
3. `@supabase/supabase-js`, `@supabase/ssr` 설치
4. Supabase 유틸 생성 (`lib/supabase/client.ts`, `server.ts`, `middleware.ts`)
5. middleware.ts — 세션 갱신 로직 (기존 next-intl 미들웨어와 결합)
6. /login 페이지 — Google/GitHub 버튼, i18n, 다크/라이트
7. /auth/callback route handler — code exchange + 리다이렉트
8. 로그아웃 Server Action

**DoD:**
- [ ] Google/GitHub 로그인 → 세션 생성 → /로 리다이렉트
- [ ] 로그아웃 → 세션 파기 → /로 리다이렉트
- [ ] 미들웨어에서 세션 쿠키 자동 갱신

---

## Phase 2: Nav 인증 UI + 보호 라우트 (REQ-3, 5 일부)

**목표:** 로그인 상태가 UI에 반영 + 비로그인 사용자 리다이렉트

**설계 결정:**
- Nav 서버 컴포넌트에서 `getUser()` 호출 — SSR에서 인증 상태 확인
- Avatar + DropdownMenu (기존 shadcn/naeil-ui 활용)
- 보호 라우트: `/sa/reports/[id]` — 미들웨어 or 레이아웃에서 체크
- return URL 패턴: `/login?next=/sa/reports/xxx`

**작업:**
1. Nav에 인증 상태 분기 (서버 컴포넌트 → user prop 전달)
2. 로그인 버튼 / Avatar+드롭다운 조건부 렌더링
3. Avatar 컴포넌트 — Google/GitHub 프로필 이미지 표시
4. 보호 라우트 미들웨어 패턴 (`/sa/reports/:id` 매칭)
5. 비로그인 → /login?next= 리다이렉트 로직
6. /login 페이지 next 파라미터 처리 (로그인 후 원래 페이지로)

**DoD:**
- [ ] 로그인 시 Nav에 아바타 표시, 비로그인 시 "로그인" 버튼
- [ ] /sa/reports/[id] 비로그인 접근 → /login으로 리다이렉트 (return URL 보존)
- [ ] 로그인 후 return URL로 정확히 돌아감

---

## Phase 3: 리포트 동기화 파이프라인 (REQ-6)

**목표:** Mac Mini SA 리포트 → Supabase 자동 동기화

**설계 결정:**
- Python 스크립트 (`sync_reports.py`) — 기존 SA 환경 활용
- Supabase REST API + service_role 키 (서버 전용, RLS 우회)
- upsert 기반 (company_name + year unique) — 중복 방지
- SA 로컬 PostgreSQL에서 완료된 리포트 조회 → Supabase로 push
- sections JSONB: SA 현재 출력 구조 기반 매핑

**작업:**
1. SA 로컬 DB 리포트 스키마 분석 (현재 출력 형태 확인)
2. Supabase reports 테이블 생성 + RLS 정책 적용
3. `sync_reports.py` 작성 — 로컬 PG → Supabase REST upsert
4. sections JSONB 변환 로직 (SA 출력 → 프론트 소비 가능한 구조)
5. 동기화 테스트 (기존 리포트 수동 실행)
6. LaunchAgent 또는 SA 파이프라인 후처리 hook 설정

**DoD:**
- [ ] `python sync_reports.py` 실행 → Supabase에 리포트 데이터 반영
- [ ] 중복 실행 시 upsert (에러 없이 업데이트)
- [ ] service_role 키 안전하게 관리 (.env, 클라이언트 미노출)

---

## Phase 4: 리포트 UI (REQ-4, 5)

**목표:** naeil.dev에서 SA 리포트 목록/상세 열람

**설계 결정:**
- SSR 기반 — `createServerClient`로 Supabase 직접 쿼리 (API 프록시 불필요)
- 목록: 카드 그리드, 기업명+연도+등급+섹터 표시
- 상세: 탭 구조 (개요 / 환경 / 사회 / 거버넌스), 기존 SA 리포트 뷰어 스타일 참고
- 비로그인 목록 접근: Option A(목록 표시 + 클릭 시 로그인 유도) 우선 구현

**작업:**
1. /sa/reports 목록 페이지 (SSR, Supabase 쿼리)
2. 리포트 카드 컴포넌트 (등급 뱃지, 섹터 태그)
3. /sa/reports/[id] 상세 페이지 (SSR, 보호 라우트)
4. 섹션별 탭 UI (환경/사회/거버넌스)
5. 점수 시각화 (프로그레스 바 or 레이더 차트)
6. 빈 상태 UI ("아직 리포트가 없습니다")
7. 비로그인 목록 접근 시 로그인 유도 오버레이/배너
8. i18n 메시지 추가 (리포트 관련 ko/en/ja)

**DoD:**
- [ ] /sa/reports 목록 정상 표시 (Supabase 데이터)
- [ ] /sa/reports/[id] 상세 정상 표시 (섹션별 탭)
- [ ] 비로그인 사용자 로그인 유도 작동
- [ ] 다크/라이트 + 모바일 반응형

---

## Phase 순서 근거

```
Phase 1 (Auth 기반) → 모든 것의 전제 조건
  ↓
Phase 2 (UI 반영) → Auth가 있어야 UI 분기 가능
  ↓
Phase 3 (동기화) → Phase 2와 독립적이지만, 실 데이터 필요 전 UI 프레임 먼저
  ↓
Phase 4 (리포트 UI) → Auth + 데이터 둘 다 필요
```

Phase 2와 3은 **병렬 가능** — Auth 기반만 있으면 독립적으로 진행 가능.

## 비용

| 항목 | 비용 |
|------|------|
| Supabase Free | $0 (500MB DB, 50k MAU) |
| Vercel Hobby | $0 (기존) |
| Google OAuth | $0 |
| GitHub OAuth | $0 |
| **합계** | **$0** |

## 리스크

| 리스크 | 확률 | 완화 |
|--------|------|------|
| next-intl + Supabase 미들웨어 충돌 | 중 | 미들웨어 체이닝 패턴 사전 검증 |
| SA 리포트 JSONB 구조 불일치 | 중 | Phase 3에서 실 데이터 기반 매핑 |
| Supabase Free 용량 초과 | 낮 | 리포트 수백 개까지 여유, 모니터링 |
| OAuth 설정 실수 | 낮 | Supabase 대시보드 + 공식 문서 따라가기 |
