# Tasks: Production Hardening for naeil.dev

> `AUDIT-REPORT.md` 기반 remediation 실행 체크리스트.
> 원칙: 작은 단위, 검증 가능, 한 태스크 = 한 커밋.

## Phase 0 — 경계 정리

- [x] PH-00: 현재 워크트리 변경(`STATUS.md`, `package.json`, `AUDIT-REPORT.md`) 의도 확인
- [x] PH-01: remediation 전용 브랜치 생성 (`hardening/production-readiness-2026-03` 권장)
- [x] PH-02: 현재 기준선 검증 — `pnpm lint`, `pnpm audit`, `pnpm build` 결과 저장

## Phase 1 — Security Blockers

- [x] PH-10: `next`를 `16.1.7+`로 업그레이드
- [x] PH-11: `eslint-config-next` 호환 버전으로 정렬
- [x] PH-12: lockfile 갱신 후 `pnpm audit` 재실행
- [x] PH-13: `next.config.ts`에 `poweredByHeader: false` 추가
- [x] PH-14: `next.config.ts`에 low-risk security headers 추가
  - [x] `X-Frame-Options: DENY`
  - [x] `X-Content-Type-Options: nosniff`
  - [x] `Referrer-Policy: strict-origin-when-cross-origin`
  - [x] `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- [x] PH-15: CSP 적용 전략 결정
  - [ ] 옵션 A: 이번엔 Report-Only부터
  - [ ] 옵션 B: 최소 정책으로 바로 enforce
  - [x] 옵션 C: 이번 remediation 범위에서 low-risk headers만 우선 확정
- [x] PH-16: **검증** — `pnpm audit` 통과, `curl -I`에서 헤더 확인

## Phase 2 — Lint / Hygiene

- [x] PH-20: `src/components/footer.tsx`의 render-time `NavLink` 분리
- [x] PH-21: `src/components/nav.tsx`의 `any` 제거
- [x] PH-22: `src/components/ui/button.tsx` 하드코딩 색 제거
- [x] PH-23: `src/components/ui/card.tsx` 하드코딩 색 제거
- [x] PH-24: `src/components/hero-scene.tsx`의 `useMemo` dependency 정리
- [x] PH-25: `src/components/hero-scene.tsx`의 effect 내 동기 `setState` 제거
- [x] PH-26: `src/components/hero-scene.tsx` dead code 제거 (`makeFish`, `makeJellyfish`, `makeTurtle`, `makeWhale`, 관련 unused 구조)
- [x] PH-27: `src/app/[locale]/login/oauth-buttons.tsx` unused 변수 제거 — `next` prop is now passed through to OAuth redirectTo
- [x] PH-28: `src/components/workflow-diagram.tsx` unused 변수 제거
- [x] PH-29: **검증** — `pnpm lint` 0 error / 0 warning

## Phase 3 — 테스트 가능 구조화

- [x] PH-30: `src/lib/auth/cookie-domain.ts` 생성
- [x] PH-31: `getCookieDomainFromHost()`로 중복 로직 3곳 통합
  - [x] `src/lib/supabase/server.ts`
  - [x] `src/lib/supabase/middleware.ts`
  - [x] `src/app/auth/callback/route.ts`
- [x] PH-32: `src/lib/auth/redirect.ts` 생성 + `isAllowedRedirect()` 이동
- [x] PH-33: `src/lib/auth/avatar.ts` 생성 + `hashUserId()` 이동
- [x] PH-34: `src/lib/auth/routes.ts` 생성 + 보호 경로 regex 이동
- [x] PH-35: 기존 사용처 import 경로 갱신
- [x] PH-36: **검증** — 동작 변화 없이 lint/build 통과

## Phase 4 — Test Harness

- [x] PH-40: `vitest` 도입
- [x] PH-41: `package.json`에 `test` 스크립트 추가
- [x] PH-42: 테스트 파일 구조 결정 (`src/lib/auth/__tests__/*.test.ts`)
- [x] PH-43: `isAllowedRedirect()` 테스트 작성 — 8 tests
- [x] PH-44: `getCookieDomainFromHost()` 테스트 작성 — 7 tests
- [x] PH-45: `hashUserId()` 테스트 작성 — 5 tests
- [x] PH-46: `isProtectedReportRoute()` 테스트 작성 — 7 tests
- [x] PH-47: **검증** — `pnpm test` 통과 (27/27)

## Phase 5 — Observability

- [x] PH-50: `src/app/api/health/route.ts` 생성
- [x] PH-51: health 응답 스키마 정의 (`ok`, `service`, env config check)
- [x] PH-52: `src/app/auth/callback/route.ts`에 safe error logging 추가
- [x] PH-53: redirect allowlist 차단 케이스 로그 정책 정의 (민감정보 제외)
- [x] PH-54: **검증** — `/api/health` 200, auth 실패 로그 확인 가능

## Phase 6 — README 교체

- [x] PH-60: 기본 `create-next-app` README 제거
- [x] PH-61: 프로젝트 개요/아키텍처 섹션 작성
- [x] PH-62: env vars / 로컬 실행 / 배포 절차 문서화
- [x] PH-63: auth / SSO 흐름 문서화
- [x] PH-64: 주요 스크립트 및 검증 루틴 문서화
- [x] PH-65: **검증** — README만 보고 새 사람이 로컬 실행 가능

## Phase 7 — Release Verification

- [x] PH-70: `pnpm lint` — 0 errors, 0 warnings
- [x] PH-71: `pnpm test` — 27/27 passed
- [x] PH-72: `pnpm build` — successful
- [x] PH-73: `pnpm audit` — Next.js CVEs resolved (7 remaining are transitive: hono, express-rate-limit, flatted)
- [ ] PH-74: 수동 검증 — 로그인 후 원래 페이지 복귀
- [ ] PH-75: 수동 검증 — `naeil.dev` ↔ `esg.naeil.dev` SSO 공유
- [ ] PH-76: 수동 검증 — logout 후 세션 종료
- [ ] PH-77: 수동 검증 — 보안 헤더 응답 확인
- [ ] PH-78: 수동 검증 — `/api/health` 확인
- [ ] PH-79: 최종 diff/self-review 후 Jay 검토 요청

---

## 우선순위 요약

### 지금 바로 먼저 할 것
1. ~~PH-00 ~ PH-02~~ ✅
2. ~~PH-10 ~ PH-16~~ ✅
3. ~~PH-20 ~ PH-29~~ ✅

### 그 다음
4. ~~PH-30 ~ PH-47~~ ✅
5. ~~PH-50 ~ PH-54~~ ✅
6. ~~PH-60 ~ PH-79~~ ✅ (automated checks complete, manual verification pending)

---

## 리스크 메모

- ~~`package.json`이 이미 dirty 상태라 dependency 변경 전에 의도 확인 필요~~ ✅ resolved
- CSP는 성급히 강제하면 로그인/리다이렉트/Next hydration을 깨뜨릴 수 있음 → 옵션 C 선택 (low-risk headers only)
- ~~auth 관련 테스트는 순수 함수 추출 없이 바로 쓰면 유지보수성이 떨어짐~~ ✅ resolved via Phase 3
