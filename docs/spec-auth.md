# Spec: naeil.dev 인증 시스템

> Supabase 기반 인증 + SA 리포트 열람 — naeil.dev의 첫 번째 사용자 인터랙션 레이어.

## Goals

- [ ] 공개 회원가입 (Google/GitHub OAuth) 구현
- [ ] SA 리포트를 로그인 사용자에게만 제공
- [ ] Mac Mini → Supabase 리포트 동기화 파이프라인 구축
- [ ] 향후 SSO 허브/관리자 기능 확장 가능한 구조

## Non-Goals (Out of Scope — Phase 1)

- 관리자 CMS / 블로그 작성 기능
- 이메일+비밀번호 인증
- 결제/구독 시스템
- 다른 프로젝트(PKM, Baby Agent) 인증 통합
- SA 분석 파이프라인 변경 (기존 Mac Mini 처리 유지)
- 사용자 프로필 편집 (이름, 아바타 등)

## Requirements

### Functional Requirements

1. **REQ-1: OAuth 로그인** (P1)
   - Given: 비로그인 사용자
   - When: "Google로 로그인" 또는 "GitHub로 로그인" 클릭
   - Then: OAuth 플로우 → 성공 시 세션 생성, 이전 페이지로 리다이렉트
   - Note: Supabase Auth + `@supabase/ssr` 쿠키 기반 (localStorage 사용 안 함)

2. **REQ-2: 로그아웃** (P1)
   - Given: 로그인된 사용자
   - When: 로그아웃 클릭
   - Then: 세션 파기, 홈으로 리다이렉트

3. **REQ-3: Nav 인증 상태 표시** (P1)
   - Given: 로그인 상태
   - When: 모든 페이지
   - Then: Nav에 사용자 아바타(Avatar 컴포넌트) + 드롭다운(로그아웃)
   - Given: 비로그인 상태
   - When: 모든 페이지
   - Then: Nav에 "로그인" 버튼

4. **REQ-4: SA 리포트 목록** (P1)
   - Given: 로그인 사용자
   - When: /sa/reports 접근
   - Then: Supabase에서 리포트 목록 조회 (기업명, 연도, 평가등급, 생성일)
   - Given: 비로그인 사용자
   - When: /sa/reports 접근
   - Then: 리포트 목록 표시 + 클릭 시 로그인 유도 (Option A) [TBD: A or B 최종 선택]

5. **REQ-5: SA 리포트 상세** (P1)
   - Given: 로그인 사용자
   - When: 리포트 클릭
   - Then: 상세 페이지 (평가 결과, 섹션별 점수, 비교표, 원문 인용)
   - Given: 비로그인 사용자
   - When: 리포트 URL 직접 접근
   - Then: 로그인 페이지로 리다이렉트 (return URL 보존)

6. **REQ-6: SA → Supabase 리포트 동기화** (P1)
   - Given: Mac Mini에서 SA 리포트 생성 완료
   - When: 동기화 스크립트 실행 (수동 또는 cron)
   - Then: 리포트 데이터가 Supabase reports 테이블에 upsert
   - Note: Mac Mini → Supabase 단방향. Supabase service_role 키 사용.

7. **REQ-7: /login 페이지** (P1)
   - Given: 비로그인 사용자
   - When: /login 접근
   - Then: Google/GitHub 로그인 버튼 + naeil 브랜딩
   - Design: 미니멀, 중앙 정렬, 다크/라이트 대응

8. **REQ-8: OAuth Callback 처리** (P1)
   - Given: OAuth 제공자에서 리다이렉트
   - When: /auth/callback 도달
   - Then: Supabase 세션 교환 + 쿠키 설정 + 원래 페이지로 리다이렉트

### Non-Functional Requirements

- **Performance**: 로그인 플로우 3초 이내 완료 (OAuth 제공자 응답 제외)
- **Security**:
  - HTTP-only 쿠키 (XSS 방어)
  - PKCE flow (OAuth 보안 강화)
  - Supabase RLS로 테이블 접근 제어
  - service_role 키는 Mac Mini 서버에서만 사용 (클라이언트 노출 금지)
- **Compatibility**: 데스크톱 Chrome/Safari/Firefox + 모바일 Safari/Chrome
- **i18n**: 로그인 UI ko/en/ja 지원 (기존 next-intl 활용)

## Key Entities

| Entity | Key Attributes | Relationships |
|--------|---------------|---------------|
| User | id (uuid), email, name, avatar_url, provider, created_at | Supabase auth.users 자동 관리 |
| Report | id, company_name, year, sector, overall_grade, summary, sections (jsonb), created_at, updated_at | 독립 — 모든 로그인 사용자 읽기 가능 |

### reports 테이블 스키마 (초안)

```sql
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  year int not null,
  sector text,
  overall_grade text,          -- A+, A, B+, B, C, D
  summary text,                -- 리포트 요약 (1-2문단)
  sections jsonb,              -- 섹션별 상세 (환경/사회/거버넌스)
  source_file text,            -- 원본 PDF 파일명
  analyzed_at timestamptz,     -- SA 분석 완료 시간
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(company_name, year)
);

-- RLS: 로그인 사용자만 읽기
alter table public.reports enable row level security;
create policy "Authenticated users can read reports"
  on public.reports for select
  to authenticated
  using (true);
```

## Edge Cases

- OAuth 제공자 장애 시 → 에러 메시지 표시 + 다른 제공자로 유도
- 같은 이메일로 Google/GitHub 각각 가입 시 → Supabase 자동 계정 연결 (설정 필요)
- 세션 만료 중 리포트 페이지 접근 → 자동 리프레시 실패 시 로그인 리다이렉트
- SA 동기화 중 Supabase 다운 → 재시도 로직 + 에러 로그
- reports 테이블 비어있을 때 → "아직 리포트가 없습니다" 빈 상태 UI
- Mac Mini 리포트 삭제 시 → Supabase에서도 삭제할지? [TBD]

## Tech Stack

| 레이어 | 기술 |
|--------|------|
| Auth | Supabase Auth (Google + GitHub OAuth) |
| SSR 통합 | `@supabase/ssr` (쿠키 기반, App Router) |
| DB | Supabase PostgreSQL (reports 테이블) |
| 프론트 | Next.js 16 App Router (기존 naeil.dev) |
| 동기화 | Python 스크립트 (Mac Mini → Supabase REST API) |
| 보안 | RLS, PKCE, HTTP-only 쿠키 |

## Architecture

```
┌─ Mac Mini ─────────────────────┐
│ SA Pipeline                    │
│ PDF→Docling→BGE-M3→Claude      │
│         ↓                      │
│ Local PostgreSQL               │
│         ↓                      │
│ sync_reports.py ──────────────────→ Supabase PostgreSQL
└────────────────────────────────┘       ↑
                                         │ @supabase/ssr
┌─ Vercel (naeil.dev) ──────────┐       │
│ /login          → Auth UI      │───────┘
│ /auth/callback  → Token 교환   │
│ /sa/reports     → 목록 (SSR)   │
│ /sa/reports/[id]→ 상세 (SSR)   │
│ middleware.ts   → 세션 갱신     │
└────────────────────────────────┘
```

## Constraints

- **비용**: $0 (Supabase Free: 500MB DB, 50k MAU, 1GB Storage)
- **Timeline**: 제대로 — Phase별 진행, 급하지 않음
- **Dependencies**: Supabase 프로젝트 생성 (Jay 계정), Google Cloud Console OAuth 설정, GitHub OAuth App 설정

## Success Criteria

1. [ ] Google/GitHub 로그인으로 naeil.dev 회원가입 + 로그인 가능
2. [ ] 로그인 사용자만 SA 리포트 상세 열람 가능
3. [ ] Mac Mini SA 리포트가 Supabase에 자동 동기화
4. [ ] 비로그인 사용자에게 로그인 유도 UI 정상 작동
5. [ ] 모바일/데스크톱 + 다크/라이트 정상
6. [ ] ko/en/ja 로그인 UI 지원

## Open Questions

- [ ] 비로그인 콘텐츠 범위: Option A(목록만) vs Option B(요약까지) — 구현 시 결정
- [ ] Mac Mini 리포트 삭제 시 Supabase 동기화 정책 (soft delete? 유지?)
- [ ] reports.sections JSONB 구조 상세 — SA 현재 출력 형태 기반으로 결정
- [ ] Supabase 프로젝트 리전 — Northeast Asia (Tokyo) 또는 Southeast Asia (Singapore)
- [ ] 동기화 주기 — 리포트 생성 시 즉시? 주기적 cron?
