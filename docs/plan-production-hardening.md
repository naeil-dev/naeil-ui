# Plan: Production Hardening for naeil.dev

> 목적: `AUDIT-REPORT.md`의 🔴 Must Fix + 🟡 Should Fix 항목을 빠짐없이 수정하여 `❌ Not Ready` → `✅ Production Ready`로 끌어올린다.

## 목표

- Next.js 런타임 취약점 제거
- 보안 헤더 적용
- 현재 ESLint 오류/경고 정리
- 인증/리다이렉트/SSO 핵심 경로 테스트 추가
- 최소 운영 관측성(health check + auth error logging) 확보
- README를 실제 프로젝트 기준으로 교체
- 최종 검증 루틴 고정

## 현재 전제

### 현재 워크트리 상태
- `STATUS.md` 수정됨
- `package.json` 수정됨
- `AUDIT-REPORT.md` 신규

즉, **바로 구현부터 들어가면 기존 미커밋 변경과 remediation 변경이 섞인다.**
먼저 작업 경계를 분리해야 한다.

## 범위

### In scope
- audit report의 전 항목 중 아래 6개 묶음
  1. Security blocker: Next.js 업그레이드
  2. Security header 적용
  3. ESLint 에러/경고 정리 + dead code 제거
  4. Test harness + critical-path unit tests
  5. Observability 최소 구축
  6. README 교체

### Out of scope
- SA 프로젝트 기능 개발
- 디자인 확장/새 컴포넌트 추가
- Storybook 신규 구축
- npm publish 흐름 자체 완성

## 구현 전략

큰 원칙은 단순하다:

`보안 패치 → 저위험 코드정리 → 테스트 가능 구조화 → 테스트 추가 → 운영 훅 추가 → 문서화 → 최종 검증`

이 순서로 가야 한다.

- 보안 패치가 제일 먼저
- lint 오류를 먼저 줄여야 테스트 작성 시 잡음이 줄어듦
- 테스트 전에 순수 함수 분리를 먼저 해야 테스트가 쉬워짐
- observability는 코드가 안정화된 뒤 최소 삽입
- README는 마지막에 실제 구현 반영 후 작성

## Phase 0 — 작업 경계 정리

### 목적
기존 미커밋 변경과 remediation 작업을 분리한다.

### 권장 방식
1. 현재 `STATUS.md`, `package.json` 변경 의도 확인
2. 별도 브랜치 생성
   - 예: `hardening/production-readiness-2026-03`
3. remediation 작업은 이 브랜치에서만 진행

### 이유
- `package.json`에는 publish 관련 변경이 이미 있어 remediation diff와 섞이면 검토가 어려움
- 보안 패치/테스트/문서화는 성격이 달라 한 PR로 섞으면 위험함

---

## Phase 1 — Security Blockers

### 1-1. Next.js 업그레이드

#### 변경 대상
- `package.json`
- `pnpm-lock.yaml`

#### 작업
- `next`를 `16.1.7+`로 올린다
- `eslint-config-next`도 같은 메이저/호환 버전으로 맞춘다
- `pnpm audit` 재확인

#### 검증
- `pnpm install`
- `pnpm audit`
- `pnpm build`

### 1-2. Security Headers

#### 변경 대상
- `next.config.ts`

#### 기본 적용 헤더
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `poweredByHeader: false`

#### CSP 전략
CSP는 “한 줄 추가”로 끝나는 작업이 아니다.
Next.js hydration / next/image / Supabase OAuth redirect / inline style/script 영향을 같이 봐야 한다.

따라서 2단계로 간다:
1. **이번 remediation에서는 low-risk headers를 먼저 확정 적용**
2. CSP는 `Report-Only` 또는 최소 허용정책으로 별도 검증 후 적용

즉, "보안 헤더 전체"의 핵심은 이번에 바로 잡되, **엄격 CSP는 테스트 후 강제**가 맞다.

#### 검증
- `curl -I https://naeil.dev`
- 로그인 페이지 iframe 차단 여부 확인

---

## Phase 2 — Engineering Hygiene / Lint Fixes

### 2-1. Footer render-time component 제거

#### 문제
`src/components/footer.tsx` 안에서 `NavLink`를 렌더 중 정의하고 있어 React Compiler 규칙 위반.

#### 방향
- `NavLink`를 컴포넌트 바깥으로 뺀다
- 혹은 `FooterNavLink`로 분리한다
- `linksExternal`, `Link`를 props로 넘기도록 단순화

### 2-2. Nav `any` 제거

#### 문제
`src/components/nav.tsx`의 Link prop 타입에 `[key: string]: any`

#### 방향
- 허용 props를 명시적으로 좁힌다
- 최소한 `React.ComponentPropsWithoutRef<"a">` 호환 타입 또는 명시적 인터페이스로 교체

### 2-3. hero-scene 경고/에러 정리

#### 문제
- `useMemo` dependency 불일치
- effect 내부 동기 `setState`
- 사용하지 않는 `makeFish`, `makeJellyfish`, `makeTurtle`, `makeWhale`

#### 방향
- `layers` 계산 구조를 정리해서 memo dependency를 일치시킨다
- reduced-motion 초기값 계산을 effect 바깥 초기 state initializer로 옮긴다
- PNG sprite로 이미 대체된 dead code 제거

### 2-4. Hardcoded color 제거

#### 대상
- `src/components/ui/button.tsx`
- `src/components/ui/card.tsx`

#### 방향
- 토큰/semantic class만 쓰도록 변경
- dark mode elevated 카드 색은 새 semantic token 또는 기존 token 조합으로 표현

### 2-5. 미사용 변수 정리

#### 대상
- `src/app/[locale]/login/oauth-buttons.tsx`
- `src/components/workflow-diagram.tsx`
- `hero-scene.tsx` 내 미사용 코드

#### 검증
- `pnpm lint` 0 에러, 가능하면 0 warning

---

## Phase 3 — 테스트 가능한 구조로 재정리

현재 핵심 로직이 route/component 파일 안에 흩어져 있어서 테스트 쓰기가 불편하다.
먼저 **순수 함수 추출**을 한다.

### 추출 후보

#### 3-1. Redirect allowlist
- 현재: `src/app/auth/callback/route.ts` 내부 `isAllowedRedirect`
- 목표: `src/lib/auth/redirect.ts`
- export: `isAllowedRedirect(url: string): boolean`

#### 3-2. Cookie domain 계산
- 현재 중복 위치:
  - `src/lib/supabase/server.ts`
  - `src/lib/supabase/middleware.ts`
  - `src/app/auth/callback/route.ts`
- 목표: `src/lib/auth/cookie-domain.ts`
- export: `getCookieDomainFromHost(host: string | null | undefined): string | undefined`

#### 3-3. Avatar 해시
- 현재: `src/components/auth-slot.tsx` 내부 `hashUserId`
- 목표: `src/lib/auth/avatar.ts`
- export: `hashUserId(id: string, size?: number): number`

#### 3-4. 보호 라우트 matcher
- 현재: `proxy.ts` 내부 regex
- 목표: `src/lib/auth/routes.ts`
- export: `PROTECTED_REPORT_ROUTE`, `isProtectedReportRoute(pathname: string)`

### 이유
테스트 가능한 구조를 먼저 만들면 이후 unit test가 훨씬 간단해진다.

---

## Phase 4 — Test Harness + Critical Path Tests

## 테스트 정책
이번 remediation의 목표는 “전체 테스트 프레임워크 완성”이 아니라 **생산 사고 리스크가 큰 경로의 최소 방어선 확보**다.

### 4-1. 도구
#### 최소 도구
- `vitest`
- 필요 시 `jsdom`
- 필요 시 `@testing-library/react`

### 4-2. 필수 테스트 대상

#### Auth / Redirect
- `isAllowedRedirect`
  - `/login`, `/sa/reports/123` 허용
  - `https://naeil.dev/x` 허용
  - `https://esg.naeil.dev/x` 허용
  - `https://evil.com` 차단
  - malformed URL 차단

#### Cookie Domain
- `naeil.dev` → `.naeil.dev`
- `esg.naeil.dev` → `.naeil.dev`
- `foo.bar.naeil.dev` → `.naeil.dev`
- `localhost` / `127.0.0.1` → `undefined`

#### Avatar Hash
- 동일 user id면 항상 동일 index
- index 범위가 animal 배열 길이 안에 있음
- 빈 문자열/짧은 문자열 edge case 확인

#### Protected Route Matcher
- `/sa/reports/123` 보호됨
- `/en/sa/reports/123` 보호됨
- `/sa/reports` 보호 안 됨
- `/sa` 보호 안 됨
- `/blog` 보호 안 됨

### 4-3. 검증 기준
- `pnpm test` 성공
- 최소 4개 핵심 영역 테스트 통과

---

## Phase 5 — Observability 최소 구축

### 5-1. Health Check

#### 대상
- `src/app/api/health/route.ts`

#### 목적
- 앱 자체가 살아있는지 확인
- 필요 시 Supabase URL/env 존재 여부 포함

#### 응답 예시
```json
{ "ok": true, "service": "naeil-ui" }
```

### 5-2. Auth callback 에러 로깅

#### 대상
- `src/app/auth/callback/route.ts`

#### 방향
- `exchangeCodeForSession` 실패 시 최소 `console.error` 남김
- redirect allowlist 차단 케이스도 디버그 가능하게 남김
- 민감정보(code/token)는 로그 금지

### 5-3. 선택 항목
- 외부 에러 트래킹(Sentry 등)은 별도 판단
- 이번 remediation에서는 **health + safe error logging**만으로도 최소 기준 충족 가능

---

## Phase 6 — README 교체

### 대상
- `README.md`

### 반드시 들어갈 내용
1. 프로젝트 개요 (`naeil.dev` / shared `@naeil/ui`)
2. 기술 스택
3. 요구 환경 (Node, pnpm)
4. env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
5. 로컬 실행
6. auth / SSO 구조 설명
7. 폴더 구조
8. 주요 스크립트 (`dev`, `build`, `lint`, `test`, `build:tokens`, `check:contrast`)
9. 배포 개요 (Vercel)
10. 수동 검증 체크리스트

---

## Phase 7 — 최종 검증 루틴

### 자동 검증
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `pnpm audit`

### 수동 검증
1. `https://naeil.dev` 접속
2. locale 전환 확인
3. `/login?next=/sa/reports/test` 진입
4. Google/GitHub 로그인 후 원래 경로 복귀 확인
5. `esg.naeil.dev`에서 로그인 상태 공유 확인
6. logout 후 세션 종료 확인
7. `curl -I https://naeil.dev`로 보안 헤더 확인
8. `/api/health` 200 확인

---

## 권장 커밋 분리

1. `chore(security): upgrade next and add security headers`
2. `refactor(ui): fix lint violations and remove dead code`
3. `test(auth): add critical path unit tests`
4. `feat(ops): add health endpoint and auth error logging`
5. `docs: replace default README with project documentation`

이렇게 나누면 문제 생겨도 되돌리기 쉽다.

## 완료 기준

다음을 모두 만족하면 remediation 준비가 끝난 게 아니라, **실제 remediation 완료 기준**이 된다:

- `pnpm audit`에서 Next.js runtime CVE 제거
- `pnpm lint` 통과
- `pnpm test` 통과
- `pnpm build` 통과
- 보안 헤더 응답 확인
- auth / redirect / SSO 수동 확인
- README 실제 내용으로 교체
