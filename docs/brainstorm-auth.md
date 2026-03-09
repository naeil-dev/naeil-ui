# Brainstorm: naeil.dev 인증 시스템

**Date:** 2026-03-05

## Idea

> naeil.dev에 로그인 기능 추가. SA 리포트를 로그인한 사용자만 볼 수 있게. 궁극적으로 관리자, 프로젝트 데모 접근, 방문자 계정, SSO 허브 전부.

## Key Questions & Answers

| Question | Answer |
|----------|--------|
| Who is this for? | 공개 회원가입 — 누구나 가입 가능 |
| What problem does it solve? | SA 리포트 등 콘텐츠 접근 제어 + 미래 SSO 허브 |
| Why now? | MVP 배포 완료, 다음 단계로 인증 기반 콘텐츠 제공 |
| Existing solutions tried? | Jay가 Supabase, CosmosDB 경험 있음 |
| Constraints? | 무료 운용 원칙, Vercel Hobby, Mac Mini 셀프호스팅 |

## Assumptions

### Validated
- SA 무거운 처리(BGE-M3, Docling, Claude)는 Mac Mini에서만 가능 (무료)
- Supabase 무료 티어(50k MAU, 500MB DB)로 당분간 충분
- Google + GitHub OAuth면 대부분 커버 가능

### Challenged
- "B: 전부 Supabase"는 ML 처리 비용 때문에 현실 불가 → 하이브리드로 결론
- 이메일+비밀번호 → 불필요한 복잡도, OAuth만으로 충분
- 비로그인 콘텐츠 범위 → A(목록만) 또는 B(요약까지), 추후 결정

## Options Explored

| Option | Pros | Cons | Complexity | Risk |
|--------|------|------|------------|------|
| A: Mac Mini 직접 | 단순, $0 | Mac Mini 의존, Auth 통합 어려움 | Low | High |
| B: Supabase 전부 | 클라우드 100% | ML처리 이전 불가, 비용 발생 | High | Med |
| C: 하이브리드 | 리포트 클라우드, Auth 자연스러움, 확장성 | DB 이중화 관리, 동기화 로직 | Med | Low |

## Devil's Advocate Findings

- DB 이중화(Mac Mini PG + Supabase PG) 동기화 로직 필요 — 복잡도 증가
- Supabase 무료 500MB 한계 — 리포트 수백 개 넘으면 유료 전환 ($25/월)
- 기존 SA API 수정 필요 — Supabase에 결과 push하는 로직 추가
- Scope creep 리스크 — "인증 + SA 리포트 표시"로 1단계 확실히 끊어야

## Decision

**Chosen:** Option C — 하이브리드 (Mac Mini 처리 + Supabase 저장/인증)
**Reason:** 무료 운용 가능, 인증+데이터 한 곳, Mac Mini 다운에도 기존 리포트 접근 가능
**Deferred:** 관리자 CMS, 블로그 시스템, 전체 SSO 허브 (Phase 2+)

## Architecture

```
Mac Mini                    Supabase                    Vercel
├─ SA Pipeline              ├─ Auth (Google/GitHub)      ├─ naeil.dev
│  PDF→Docling→BGE-M3       ├─ PostgreSQL               │  ├─ 랜딩
│  →pgvector→Claude          │  ├─ reports table         │  ├─ /sa (리포트 뷰어)
│  →Report                   │  ├─ users table           │  ├─ /login
├─ Push results ──────────→  │  └─ RLS policies          │  └─ 기타 페이지
└─ Local PostgreSQL          ├─ Storage (PDF 원본?)       └─ Supabase SDK
   (처리 중간 데이터)          └─ Realtime (미래)
```

## Phase 1 Scope (엄격히 제한)

1. Supabase 프로젝트 생성 + Auth 설정 (Google, GitHub)
2. naeil.dev에 로그인/로그아웃 UI
3. SA 리포트 테이블 (Supabase)
4. SA → Supabase push 스크립트
5. /sa 리포트 목록 + 상세 (로그인 필요)
6. 비로그인: 목록만 or 요약까지 (A/B 중 택 1)

## → Next: spec.md
