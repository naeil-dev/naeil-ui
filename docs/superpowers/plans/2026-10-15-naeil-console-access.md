> **Historical record preserved on 2026-11-04.** Original body below is unchanged from `35f750357f90fe24ec0ca8c51b8e98b89facd997`. This is a dated design/verification record, not an active execution plan or current deployment status. See the [project closeout index](../../design/project-closeout-2026-11-04.md) for disposition and current boundaries.

# Naeil Console Domain Access Implementation Plan

> **For agentic workers:** 사용 가능한 subagent 도구로 구현·독립 리뷰를 분리하고 메인 에이전트가 실제 diff와 실행 결과를 확인한다. 기반 구현 세션에는 관련 superpowers skill이 없어 사용자 승인에 따라 직접 위임했다. 후속 Task 2 세션에는 skill이 제공되어 `subagent-driven-development`로 구현·독립 리뷰를 실행한다. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Console에서 회원의 JEV·AB Estimate 접근을 관리하고, 허용된 AB Estimate 회원은 동일한 기존 견적 작업 공간을 사용한다.

**Architecture:** Supabase Auth의 고정 사용자 ID와 중앙 권한 DB를 사용한다. Home의 Console은 개인 관리자 인증을 추가하며 각 서비스는 자신의 서버에서 요청마다 서비스 권한을 확인한다. AB Estimate의 공용 JSON 저장소·계산·revision/backup 구조는 유지한다.

**Tech Stack:** Home Python/FastAPI + React/Vite/Bun, Supabase Auth/PostgreSQL, JEV·AB Estimate Next.js/TypeScript, 각 프로젝트의 pytest/Vitest/Playwright. AB Estimate는 전용 Node 24.21.0, pnpm 10.30.3을 유지한다.

**Spec:** [기능 설계](../specs/2026-10-15-naeil-console-access-design.md), [실제 구성 확인](../specs/2026-10-15-naeil-console-access-review.md).

## Global Constraints

- Console 한 페이지, AI 옆 메뉴, 내부 탭/사이드바 추가 없음.
- 서비스 ID는 `jev`, `abestimate`; 신규 회원·신규 서비스는 기본 접근 불가.
- 전체 차단이 서비스 허용보다 우선하며 관리자 본인 전체 차단은 거부.
- 보호 요청마다 최신 권한 확인, 장기 권한 캐시 없음. 미인증 401 / 권한 없음 403 / 권한 조회 장애 503.
- 앱 초대 수락 가능 기간 7일. 인증 링크 수명과 별도로 관리.
- 초대 수락 전 권한 부여 없음. 외부 회원 메일은 custom SMTP 검증 후 사용.
- AB Estimate 공용 데이터·설정·백업 보존, 개인별 저장소/역할/읽기 전용 권한 추가 없음.
- 관리자 자격 증명은 서버에만 보관. 토큰·비밀 키·실제 견적을 Git/로그/브라우저 번들에 포함하지 않음.
- 실제 데이터와 운영 2455/2466/2473에서 테스트하지 않음. 기존 미배포 UI 변경을 함께 배포하지 않음.
- 이 계획은 구현·검증 대상이다. 운영 배포와 실제 회원 권한 부여는 검증된 결과와 별도 전환 절차에 따른다.

## Review Focus

1. 같은 견적을 두 회원이 동시에 저장: 하나만 성공, 다른 요청은 충돌로 표시하고 재조회 — Task 5.
2. 초대 취소/재발송 직후 이전 링크 사용: 인증 세션이 생겨도 권한 활성화 금지 — Task 6.
3. 새로고침/세션 갱신 후 권한 회수: 기존 쿠키가 남아도 다음 요청부터 거부 — Tasks 4–5.
4. Home 로그인은 됐지만 개인 관리자 인증이 없음: Console API는 거부, AI 기능은 유지 — Task 2.
5. 공유 비밀번호의 기존 세션으로 새 로그인 우회: 서비스 요청 거부, 기존 업무 데이터 보존 — Tasks 4–5.

## 실행 단위와 파일 소유권

현재 UI 저장소는 설계·목업의 보관 위치다. 이 저장소의 공유 `@naeil/ui` 패키지에 권한/DB 기능을 넣지 않는다.

| 작업 단위 | 기준 저장소 | 책임 |
| --- | --- | --- |
| 중앙 정책·Console | `naeil-home` | SQL 이력, 관리 API, 관리자 인증, 관리 UI |
| JEV 연결 | `jev`의 실제 앱 브랜치 | 로그인, 모델 실행 전 권한 확인 |
| Estimate 연결 | `estimate`의 실제 앱 브랜치 | 로그인, 공용 상태·백업 접근 제한 |
| 초대 수락 | `naeil-ui` 웹사이트 영역 + Home | 공개 수락 페이지와 관리 측 발송/취소 |

Task 0에서 확정한 배포 소스에 격리 작업 디렉터리를 만든다. 아래 경로는 해당 저장소 루트 기준이며, 새 경로는 제안 경로다. 기존 파일이 배포 기준에서 다르면 책임에 맞는 실제 경로를 계획에 반영한 후 수정한다. Home에서는 `openspec/changes/naeil-console-access/{proposal.md,tasks.md,specs/console-access/spec.md}`를 먼저 작성하고 기능 문서는 OpenSpec에 연결한다.

## Task 0A: 운영 기준과 독립 DB 검증 환경

**Files:** Home `openspec/changes/naeil-console-access/context.md`; 각 저장소 `docs/ops/console-access-baseline.md` (Home은 OpenSpec context에 통합).

**Interfaces:** 배포 기준 커밋/아티팩트, 보호 경로 목록, 공통 인증 사용자 UUID, 도메인별 정확한 콜백 URL, 격리 테스트 환경을 후속 작업에 제공한다.

- [x] Home image `b0187528b7e2`의 소스·브랜딩을 매핑했다. `b92a9a5d` + 동결 코드 overlay 2개 + 정적 artifact가 운영 파일 455/455와 일치한다. 단일 Git commit과 동일하다는 의미는 아니다. Home `openspec/changes/naeil-console-access/baseline.md`와 manifest 참조.
- [x] JEV 설치 BUILD_ID `5c8klC9uqKrC2wNSEzuke`, Estimate 설치 sourceCommit `8f2f7379b160` / BUILD_ID `XHoWgRKnyYCDclMzrqKLu`를 재확인했다. JEV의 전체 sourceCommit 대응은 아직 미확정이며 이를 인증 구현 기준으로 오해하지 않는다.
- [x] 격리 worktree `/Users/jaymini/projects/naeil-home-console-access`, branch `feature/naeil-console-access`, base `b92a9a5d`를 준비했다. 기존 Home/JEV/Estimate/UI의 다른 작업은 보존한다.
- [x] 공식 Supabase CLI `2.121.0`을 checksum 고정하여 worktree `.local/`에 설치하고 DB-only Postgres 17.11 + 공식 GoTrue Auth schema를 `127.0.0.1:55322`에 구성했다. 운영 link/push/reset, 이메일·모델 호출 없음.
- [x] SQL subject/관리자/권한/버전/멱등성 계약을 먼저 Home OpenSpec에 작성했다. 기존 SQLite application backend와 외부 Supabase 권한 저장소를 분리하는 명세를 추가했다.

## Task 0B: 앱 연결에 필요한 후속 인증 실험 (미완료)

OAuth·초대·SMTP는 Task 1의 RLS/트랜잭션 검증과 독립적이다. 외부 계정·메일 발신 설정이 준비되지 않았으므로 이를 DB 구현의 선행 차단 조건에서 분리했다. 아래 실험은 Task 2/4/5/6의 해당 흐름을 완료하기 전에 실제로 검증해야 하며, SQL fixture 통과를 이 항목들의 성공으로 표시하지 않는다.

- [ ] 보호 경로를 코드에서 열거하고, 인증/콜백/초대/거부 안내 경로는 별도로 정리한다. 각 경로의 데이터·스트림·파일 접근도 포함한다.
- [ ] 격리 인증 환경에서 host-only 세션 + 각 앱 OAuth 콜백 방식을 시험한다. 각 앱은 같은 Supabase 사용자 UUID를 받되 자동 SSO를 출시 조건으로 삼지 않는다. Tailscale Home의 개인 관리자 세션도 동일하게 별도 검증한다.
- [ ] 테스트 계정으로 공개 생성 차단 상태의 관리자 초대/수락/동일 계정 OAuth 연결을 검증한다. fixture 성공만으로 외부 제공자 검증을 대체하지 않는다. 외부 발송이나 OAuth 계정 사용에 필요한 입력이 없으면 독립 가능한 DB/fixture 작업을 진행하고 실제 성공으로 기록하지 않는다.
- [ ] 결과와 정확한 콜백/세션 계약을 context에 기록하고 문서 변경만 커밋한다. 이 단계 전에는 특정 Supabase 링크 형태나 계정 연결 동작을 구현 사실로 고정하지 않는다.

## Task 1: 중앙 권한 데이터와 원자적 변경

**Files (Home, new):** `supabase/config.toml`, `supabase/migrations/202610150001_console_access.sql`, `supabase/tests/{console_access.test.sql,concurrency.py}`, `scripts/console-{db,baseline}.py`, `supabase/environment.md`, `openspec/changes/naeil-console-access/`.

**Interfaces:**

- `access_decision(p_service_id text) → text`: `auth.uid()`로 자기 상태만 판단. `allowed | member_inactive | service_inactive | not_granted` 반환. DB/인증 장애는 권한 없음과 구분.
- `console_set_access(p_user_id uuid, p_services text[], p_expected_version bigint, p_operation_id uuid) → jsonb`: 인증된 관리자만 호출, 전체 서비스 집합을 원자적으로 교체하고 version/감사 기록 반환.
- `console_set_member_status(p_user_id uuid, p_blocked boolean, p_expected_version bigint, p_operation_id uuid) → jsonb`: 관리자 자기 차단 거부, 차단 시 grants 보존.
- 테이블: `console_members`, `console_admins`, `console_services`, `console_grants`, `console_audit`, `console_operations`. 일반 회원의 다른 회원 조회/변경 금지. actor는 요청 JSON이 아닌 검증된 `auth.uid()`.

- [x] SQL 테스트를 먼저 작성했다. 최초 CLI 실행에서 함수 부재 `42883`와 테이블 부재로 실패했으며, 오류를 성공으로 처리하지 않았다.
- [x] 고정된 local-only runner `python3 scripts/console-db.py test`가 실제 `supabase test db --local`을 호출한다. 공식 Auth/RLS/함수를 사용하며 인메모리 mock으로 대체하지 않는다.
- [x] 여섯 `console_*` 테이블, Auth user FK, 명시적 SQL privileges/RLS, subject-only `access_decision`, 관리자 RPC를 구현했다. 고정 서비스 두 개 외 회원/관리자/grants seed 없음. grants 보존 차단, pending 활성화 금지, 성공 audit/operation 원자성, stale version/operation 충돌, 현재 관리자 검사 후 retry를 구현했다.
- [x] 최종 migration으로 로컬 DB를 clean rebuild한 뒤 실제 pgTAP104개와 독립 session 동시성7개를 메인이 직접 통과시켰다. 신규서비스 기본 거부, 전체차단/복구·회수, 모든 client 역할 DML/EXECUTE 거부, 위조 claims, conflict/retry, audit 실패 rollback 검증 포함. 기존 Home 인증6개, canonical OpenSpec58개와 strict change 검증도 통과했다. 독립 리뷰의 P2 두 건(관리기록 self-target 공개, 다차원 input 오류)은 수정·회귀 검증했다.
- [x] Home 커밋 `f5fd22f4f0b2f3f6643c933d7c1ff8b42286b139`에 SQL·테스트·로컬 도구·OpenSpec·검증 기록을 함께 저장했다. 브랜치 `feature/naeil-console-access`, 미배포·미push 상태다.

진행 증거와 최종 테스트 수·리뷰 결과는 Home `openspec/changes/naeil-console-access/verification.md`에 기록한다. RPC는 text 결정과 immutable JSON receipt를 반환하고 PT401/403/404/409/422를 구분한다. HTTP 401/403/503 매핑과 실서비스 보호는 후속 Task의 검증 대상이다. OpenSpec change는 미완료 후속 연동 때문에 archive하지 않는다.

## Task 2: Home 개인 관리자 인증과 회원 관리 API

진행 단위: 기존 Home 격리 브랜치에서 관리 API를 구현한다. 외부 OAuth·Tailscale callback/메일의 미검증 경계는 유지한다. 서버에 보관한 토큰과 opaque host-only 세션, 정확한 Origin/CSRF, 매 요청 현재 관리자 확인을 사용한다. 최초 세션 저장소는 최대 1,000개·최대 8시간의 단일 프로세스 메모리이며 재시작하면 재로그인이 필요하다. 다중 worker/영속 세션 연속성은 배포 준비에서 별도 판단한다. 로컬 Auth 비밀번호 fixture는 공개 로그인 API로 노출하지 않는다.

Task 1에 없는 최소 조회 계약은 신규 forward migration으로 추가한다: 관리자 전용 회원/email/name·서비스·기록 RPC, keyset pagination과 연결 검증 상태. 기존 active와 연결 확인을 혼동하지 않으며 미검증 서비스의 신규 grant는 트랜잭션 안에서 거부한다. 기존 grants 조회·회수는 유지한다. 테스트에서만 가상 서비스 연결을 verified로 설정한다. 알 수 없는 회원은 기존 PT404와 맞춰 HTTP404로 반환한다. 실제 구현/증거는 Home OpenSpec에 기록한다.

**Files (Home):** new `app/modules/console/{api.py,schemas.py,auth.py,repository.py,service.py}`, `tests/integration/test_console_access.py`; modify `app/main.py`의 router 등록 및 필요한 설정 정의. 실제 등록 파일은 Task 0 기준을 따른다.

**Interfaces:** `require_console_admin(request: Request) → ConsolePrincipal(user_id: UUID)`; Home 세션과 Task 0에서 검증한 별도 개인 세션 모두 필요. RPC는 검증한 관리자 토큰으로 호출하며 사용자 입력 actor를 사용하지 않는다.

API 계약:

- `GET /api/console/members?search=&service=&cursor=`: 최대 50명, nextCursor. 상세 `GET /api/console/members/{id}`는 version과 grants 반환.
- `GET /api/console/services`: 도메인·활성·연결 검증 상태.
- `PUT /api/console/members/{id}/access`: `{services, expectedVersion, operationId}`.
- `PUT /api/console/members/{id}/status`: `{blocked, expectedVersion, operationId}`.
- `GET /api/console/audit?cursor=`: 최근 10건과 다음 cursor.
- 인증/권한 실패 401/403, 버전/작업 충돌 409, 잘못된 입력 422, 저장소 장애 503. 세션 관련 응답은 no-store.

- [x] 기존 pytest client 패턴과 실제 로컬 Auth/PostgREST 테스트로 Home 단독 세션/일반 회원/관리자/위조 actor/Origin/CSRF/장애를 검증한다. 실제 외부 OAuth 교환만 명시적인 seam에서 대체하며 모델·이메일은 호출하지 않는다.
- [x] 최초 실제 Home 로그인 후 보호 members 요청이401 대신404로 실패함을 확인한 뒤 구현했다. 관리 SQL의 함수·컬럼 부재, 로그 가림·잘못된 상위 응답 처리도 실패를 먼저 관찰했다.
- [x] 서버 보관 토큰·PKCE·Home에 묶인 opaque 세션과 개인 JWT 기반 관리 API, 관리자 조회 RPC/연결 검증 forward migration002를 구현했다. 요청마다 Auth 사용자와 현재 관리자 권한을 확인한다. service-role을 사용하지 않는다.
- [x] 기존 Home 인증·실제 JWT/REST·RPC 원자성·HTTP 상태·개인 actor와 기존 인증/취소/스트림 경계 회귀를 검증했다. 광역 실행의 기존 실패와 미해결 불안정성은 아래 증거에 별도로 남긴다.
- [x] 환경 `5f77df567ac2a05ddb630ca84c964472211afd03`, 앱/API·SQL·테스트·OpenSpec `1b766bf078de482a40d5653f874785d7a82fa964`로 커밋했다. 같은 격리 브랜치·worktree에 보존하며 push/merge/배포는 수행하지 않았다.

Task 2 로컬 백엔드 구현·검증을 완료했다. 명령·결과·한계는 Home `openspec/changes/naeil-console-access/management-verification.md`에 기록했다. 메인이 최종 관련 회귀2049개·실제 로컬 HTTP5개, clean rebuild 후 pgTAP144개·독립 session 동시성7개를 직접 통과시켰다. Ruff/변경 범위 타입 검사, OpenSpec58개와 strict 검증도 통과했다. 운영 identity와455개 hash 일치, fixture 잔여0, 두 서비스 미검증 상태를 재확인했다.

광역 Python 실행은8750 PASS/7 FAIL에서99% 정체 후 중단됐다. 이번 순서/취소 회귀는 수정하고 위2049개로 재검증했다. 기존 기준에서도 실패하는 Alembic2건·취소 규칙1건·오래된 TrustedProxy 순서 단정1건, 전체 타입72건은 보존했다. 병렬 실행의 deadline 실패와 worker crash는 원인 미확정이며, 해당 두 파일은 기준/현재에서 각각111개가 직렬 통과했다. 이 결과를 전체 회귀 성공으로 표현하지 않는다.

`gpt-6.1-sol/high`에 구현·환경/권한 독립 리뷰·실패 비교를 분리 위임했고 `gpt-6-astra/high`가 전체 브랜치와 최종 등록 수정을 검토했다. 추가 ASGI 수정은 Paseo의 `gpt-6.1-sol/max`로 범위를 한정해 재검토했다. 비밀 가림·오류 분류·로컬 설정 guard·취소/스트림·기존 최상위 인증 순서 지적을 수정했고 미해결 코드 리뷰 지적은 없다. 실제 Google/GitHub·Tailscale callback/초대·SMTP E2E, 세션 영속/다중 worker 연속성은 미검증/미지원 경계다. 다음은 Task3의 Console 한 페이지 연결이다.

## Task 3: 기존 Home 프레임에 Console 한 페이지 연결

**Files (Home):** new `frontend/src/features/console/{console-page.tsx,member-panel.tsx,api.ts,console-page.test.tsx}`; modify `frontend/src/components/header.tsx`, 실제 앱 진입/라우팅 파일, `frontend/src/i18n/locales/{ko,en}.json`.

**Interfaces:** Task 2의 API만 소비한다. 회원 상세는 `version` 기반 저장, 도메인 스위치는 저장 전 draft. 이 단계는 기존 회원 관리가 독립적으로 동작하는 결과이며 아직 초대 기능이 완료된 화면으로 표시하지 않는다.

- [x] Vitest/MSW 테스트 작성: 검색·도메인 필터·상세·전체 차단, 409 충돌 시 덮어쓰지 않음, 503에서 draft 보존, 중복 저장 방지, 본인 전체 차단 불가. AB Estimate 설명은 ‘허용된 회원은 같은 견적과 설정을 공유합니다’.
- [x] `cd frontend`에서 `bun run test src/features/console/console-page.test.tsx`로 실패 확인.
- [x] 기존 Header/컴포넌트와 승인된 목업 구성을 적용한다. AI 옆 Console, 내부 탭 없음, 초대/기록은 하단. 미연결 서비스와 아직 미구현 초대를 실제 사용 가능한 것으로 표시하지 않는다. 상태 정상/최근 로그인 시각을 추정하지 않는다.
- [x] 동일 테스트, `bun run typecheck`, `bun run lint`, `bun run build` 실행. 브라우저에서 같은 viewport/theme/language의 AI와 Console Header 위치 비교, 모바일·키보드·미저장 변경 확인, 양 테마 대비 검사. 사용한 디자인 도구만 기록.
- [x] 화면·테스트·OpenSpec 변경을 커밋한다.

Task 3 로컬 UI 구현·검증을 Home `b27f79808e08d8a82e9b70ea3f6a052e0f5190d0`에 커밋했다. AI 옆 Console과 내부 탭 없는 회원 목록, 검색·도메인 필터·페이지 단위 조회, 오른쪽 상세·권한 draft 저장·전체 차단/해제·관리 기록을 실제 Task 2 API 계약에 연결했다. 개인401은 Home 인증과 분리하고409는 최신 상태를 명시적으로 검토하며503은 동일 작업 ID/version/payload로 재시도한다. 기존 미검증 허용은 유지/회수 가능하고 새 허용은 막는다. 초대는 사용 불가로 표시한다. 공유 @naeil/ui 패키지나 백엔드/SQL은 수정하지 않았다.

메인이 Bun1.3.14 전체 프런트엔드862개(그중 Console23개), 타입·lint·build, OpenSpec58개/strict, mock Chromium36개 화면·18개 동작·추가 수동 판단4개, 프레임135개 및 구현 전후90개 비교를 직접 통과시켰다. 초기 모바일 숨긴 표 제목·스위치 중복 이동·정확한 한국어 문구·필터 라벨 지적과 full-suite에서 나온 mock 경로 계약 누락을 수정하고 독립 재리뷰 승인을 받았다. `gpt-6.1-sol/high`가 구현·UI/계약 리뷰를 맡았고 마지막 두 mock 파일은 Paseo의 `gpt-6.1-sol/max`로 별도 검토했다. 실행·재현·캡처·axe 수동 판단·제약은 Home `openspec/changes/naeil-console-access/console-ui-verification.md`와 같은 경로 `evidence/console-ui/`에 기록했다.

UI 브라우저 검증은 허구의 HTTP fixture를 사용하며 실제 SQL/RLS 검증은 앞선 Task1/2 결과와 구별한다. 실제 OAuth/개인 세션 연결·초대·메일·가입 정책·서비스 서버 집행·Safari/Firefox/스크린리더는 이번에 검증하지 않았다. 운영455개 파일 hash와 identity는 그대로이며 실제 회원·권한·데이터·2455 서비스는 변경하지 않았다. push/merge/배포 없이 같은 격리 브랜치를 보존한다. 다음은 Task4 JEV 연결이며 이번 완료 범위를 자동 확장하지 않는다.

## Task 4: JEV 공통 로그인과 서비스 접근 검사

**Files (JEV isolated `/Users/jaymini/projects/jev-console-access`):** new `src/server/naeil-{access,session-store,auth-client}.ts`, `src/proxy.ts`, `src/app/auth/callback/route.ts`, `src/app/api/session/route.ts`, `tests/integration/domain-access.test.ts`; modify `src/server/session.ts`, login/logout routes, 최소 로그인/거부 안내 UI·번역·클라이언트 CSRF 연결, `src/server/{comparison,decision}.ts`, 테스트 fixture/smoke. 기존 원본 dirty 디렉터리는 읽기 전용이다.

**Spec:** 격리 JEV `docs/superpowers/specs/2026-10-15-naeil-access.md`; 출처 `docs/ops/console-access-baseline.{md,json}`. 기준 커밋 `7332327`은 111개 현재 source를 독립 저장소에 보존한 snapshot import이며 운영 Git commit이 아니다. 기존 10/8 after-app-source의 파일별 hash와 동일하며 운영 source-hashes와17개 차이가 있으므로 배포 근거로 사용하지 않는다.

**Interfaces:** `requireNaeilAccess(): Promise<{userId: string, sessionId: string}>`; 서버 상수 `jev`에 대해 Task1 결정 함수를 검증된 개인 JWT로 매 보호 요청마다 호출한다. sessionId는 별도 opaque 개인 세션 handle의 hash로 quota/lease·refresh/restart에서 유지한다. 사용자 UUID와 혼동하지 않는다. 세션은 기존0600 SQLite에 별도 테이블/host-only 개인 cookie로 저장하고24시간 절대 만료, 단일 프로세스 refresh 직렬화+삭제 세션 복원 방지를 적용한다. legacy password cookie/rows는 새 권한을 만들지 않는다.

**HTTP contract:** `GET /api/session` preauth/CSRF 및 identity-only 상태; `POST /api/login {provider:'google'|'github',returnTo?}` exact Origin+CSRF → authorizationUrl; `GET /auth/callback` 단회10분 PKCE S256+cookie/nonce binding → 서버에 저장한 `/` 또는 `/?lang=ko|ja|en`; `POST /api/logout` 로컬 삭제 우선, 권한 회수/장애 뒤에도 가능. 새 모델 POST도 Origin+CSRF. 개인 JWT/refresh는 서버만 보관하며 client actor/user/service 입력을 신뢰하지 않는다. UI는 기존 공유 frame/locale/theme를 재사용한다.

- [x] 격리 source·운영 artifact 식별과 보호 route/page/RSC/API 목록·인증 계약을 기록하고 baseline 테스트를 실행한다. Task0B 외부 OAuth 미검증은 로컬 구현 선행조건에서 분리한다.
- [x] `pnpm test tests/integration/domain-access.test.ts`로 실패 확인: JEV 허용·AB만 허용403·무세션401·조회 장애503·회수/차단/해제·legacy session 거부·고정서비스/검증subject·denial 시 quota/model0.
- [x] 개인 서버 세션·PKCE·refresh/logout/callback race·strict redirect/Origin/CSRF와 모든 보호 실행 지점을 구현한다. 새 요청마다 재검사하며 이미 시작한 스트림 소급 종료는 제외한다. 기존 quota/lease/settlement/로그아웃 규칙과 저장 데이터 보존.
- [x] 같은 focused 테스트, 전체 `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm test:e2e`, `pnpm smoke:fixture` 실행. 실제 local GoTrue/Auth+PostgREST+DB와 fixture 모델로 허용/회수/refresh/restart/두 브라우저 컨텍스트를 검증한다. OAuth code exchange만 test-only seam으로 대체할 수 있으며 제품 password/token-import 우회 API는 금지한다. DB fixture와 서비스 연결상태를 정확히 복구한다.
- [x] 독립 spec/quality 리뷰·메인 직접 검증·증거와 변경 커밋을 남긴다. Google/GitHub OAuth·계정 연결·실 HTTPS 쿠키·콜백 등록·SMTP·초대 성공과 구분한다. 운영 비밀번호/DB/배포/실회원 grant는 변경하지 않는다.

**구현 결과 (2026-10-15):** 제품 최종 수정 `13f282962d3747d4e4c4c2b998f2fdc3bca397b6`, 계약·영구 증거 커밋 `36002aa`, Home OpenSpec 기록 `20559174`. 최종 OpenSpec strict 및 전체 명세 58개 검사를 통과했다. 원본 dirty JEV는 건드리지 않았으며 111개 snapshot source와 설치 runtime 245개·LaunchAgent, Home 455개 hash 보존을 확인했다. 이 snapshot은 운영 배포 원본과 동일하다는 뜻이 아니다. 실행 명령·제약·리뷰·SHA256 증거는 격리 JEV `docs/ops/console-access-verification.md`와 `docs/ops/evidence/console-access/`에 있다.

메인이 최종 코드에서 focused 35개/전체 103개, typecheck·lint·build, Chromium 20개, fixture smoke, 실제 로컬 Auth/PostgREST/DB 73개 검사를 직접 통과시켰다. `gpt-6.1-sol/high`가 출처/계약 조사·구현·독립 리뷰를 나눠 담당했다. 리뷰의 페이지 최종 상태, gateway 오류의 세션 오분류, 만료 CSRF 복구 세 건을 수정하고 spec/quality 재승인을 받았다. root document/RSC는 응답 상태를 소유하는 Node proxy에서 요청마다 한 번 최신 검사를 수행하며, 두 모델 API도 각각 검사한다. API 401/403/503과 익명 페이지의 307 로그인 안내를 구분하고 위조 헤더·Next 별칭을 검증했다.

실제 로컬 검사는 외부 PKCE code 교환만 시험 프로세스에서 fictional password fixture로 연결한다. Google/GitHub OAuth·identity linking·실 HTTPS 쿠키/SSO·호스팅 콜백·SMTP·초대·가입 정책·유료 모델·운영 배포의 성공을 뜻하지 않는다. 최종 fixture 행은 0이고 서비스 연결 필드는 정확히 복구했다. 이번 작업으로 운영 코드·계정·권한·데이터를 변경하지 않았고 push/merge/배포도 없다. Estimate는 다른 작업으로 `3bffa256`→`e4884db`로 진행했으므로 Task5에서 source/artifact를 다시 확인한다. 다음은 공용 견적·설정·백업과 revision 검사를 보존하는 Task5다.

## Task 5: AB Estimate 공통 로그인과 공용 견적 보존

**Files (isolated Estimate `/Users/jaymini/.paseo/worktrees/1bnldk74/estimate-console-access`):** new server `naeil-{access,auth-client,session-store,session}.ts`, `src/proxy.ts`, API login/callback/auth-complete, auth client helper and `tests/server/domain-access.test.ts`, `tests/e2e/shared-domain-access.spec.ts`, `tests/fixtures/` local harness. Modify existing runtime/config/instrumentation/http/page-session, session/state/backup APIs, login/reauth/transport/save/backup/logout controls and Japanese copy, protected page/layout duplicate guards, package/e2e/smoke fixtures only as needed. Keep business domain/store/calculation and pinned UI implementation unchanged.

**Spec:** isolated Estimate `docs/superpowers/specs/2026-10-15-naeil-access.md` (exact normative lifecycle/HTTP/client/security/test contract). `docs/ops/console-access-baseline.{md,json}` records source/runtime provenance. Source base `e4884db` matches237 installed source entries and1605 selected installed code/static hashes; original navigation correction is excluded/preserved. Existing baseline38files/581serial tests PASS. No original source/build or operational data/auth contents are copied.

**Interfaces:** `requireNaeilAccess(request:Request):Promise<{userId:string}>`; fixed `abestimate`, current verified personal JWT, API401/403/503. Preserve actual schema3 GET/PATCH state and GET/POST backup envelopes, same runtime.store, serialized revision checks, atomic backup/restore. Auth-only runtime uses separate0700/0600 bounded atomic JSON registry, singlewriterlock, no new DB/businessschema. Root page families have one response-owning fresh Node proxy check; every API checks independently. Persistent24h opaque host-only personal cookie has no legacy fallback; strict PKCE/Origin/CSRF and conditional refresh/callback prevent deleted-session resurrection. Reauthentication occurs in a new tab with explicit recheck, preserving original raw draft/export/conflicts and allowing deliberate logout after denied save.

- [x] Confirm frozen source/operational mapping, isolated Node24.21.0 install and baseline; write Home OpenSpec and exact auth/shared-workspace contract before behavior changes. Read `task-5-contract-research.md` only for rationale, normative spec wins.
- [x] Write `tests/server/domain-access.test.ts` and run `pnpm test tests/server/domain-access.test.ts` to observe meaningful behavioral RED: retired password cannot create identity; denial/missing/legacy identity never opens or writes business storage; fixed service/current personal identity and all four business methods guard before work.
- [x] Implement auth-only registry/client/HTTP/cookies/PKCE/current service checks, single response-owning page enforcement and identity-only recovery/logout. Test registry corruption/permissions/uncertainwrite, refresh/restart/absoluteexpiry/races, exact callbacks/redirect/CSRF and gateway401classification. No test bypass in product env/API/imports or packaged static.
- [x] Update minimal login/denied/outage/newtab reauth and fresh-CSRF transport; explicit403/503 preserve draft/restorefile and known businesswrite outcomes. Test export/accountswitch when denieddirty, explicit identity+state recovery and changedrevision conflict; preserve existing save/asyncnavigation guards and UI frame.
- [x] Add actual local GoTrue/PostgREST/DB acceptance with distinct A/B allowedcontexts and JEV-only/no-grant/blockeddenial: same initial UUID/revision/settings, A-save→B-read, two same-revision mutations200/409, shared download/restore and stale conflict, same-cookie revoke/block/unblock/service changes, page/document/RSC/prefetch/aliases/forgedheaders, refresh/restart/local-firstlogout. Hash fixture main/allbackups around denial series. Use owned Home55321/55322; only externalPKCEexchange may be seam, no real mail/models/hosted use; stop owned children then restore exact registry fields/delete only fictional rows.
- [x] Run focused tests and all `pnpm test --no-file-parallelism`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, standalone `pnpm test:e2e` and `pnpm smoke` sequentially on dedicated runtime. Default e2e uses2480; smoke/local2481 sequentially; no existing2470–2476listeners reused/stopped. Keep historical business assertions; update password fixture setup for personal identities. Record exact direct commands, failures/corrections/results and permanent sanitized hashes/screenshots.
- [x] Independent spec/quality review, batched fixes/re-review, main direct validation, OpenSpec strict/all-specs and source/runtime preservation check. Commit only owned implementation/evidence/contracts and central records. ActualOAuth/accountlinking/HTTPS/SSO/hostedcallbacks/SMTP/invites/signup/paidmodels/deployment remain unverified; Task5 ends with completion report and Task6 remains separate.

**완료 기록 (2026-10-15):** 최종 제품 변경은 Estimate `25eaa34`, source/test 동결은 `a941722`(마지막 변경은 로컬 mobile 메뉴 fixture만), 계약·영구 증거는 `af7d6eab3ae46e6cdfc56179ec487d1c0912d0f1`, Home OpenSpec 기록은 `8708d643`이다. 메인이 focused114/전체649unit, typecheck/lint/build, 전체Chromium299, synthetic smoke62, 실제 로컬Auth/PostgREST/DB591을 직접 통과시켰다. 별도 gpt-6.1-sol/high 구현·독립 리뷰의 fsync/invalid-draft/account-switch/hydrated403·503 지적과 smoke redirect 검사를 수정·재승인했다. 초기 domainRED9 stdout은 영구 파일이 없어 복원하지 않았고 후속 실제RED/GREEN 및 초기284PASS/4FAIL와 최종299PASS 결과를 구분해 보존했다. 정확한 명령·결과·리뷰·화면·SHA256·한계는 Estimate `docs/ops/console-access-verification.md`를 따른다.

최종 시험 행0·서비스 active/unverified/verified_atNULL을 정확히 복구했고 포트2480/2481은 비었다. Home455/455/JEV245/245, Estimate 초기·후속 운영 코드 각1605/1605와 원본233source hash를 확인했다. 이번 작업은 운영 데이터/auth/env 내용을 읽거나 실제 권한·설정·메일·배포를 변경하지 않았다. 단, **다른 작업자**가 navigation source61eb4ef/release61eb4efd1f38-5d035aab79fc를 별도 배포했다. 접근 제어 branch의 e4884db 기준에는 그 변경이 없으므로 향후 배포 전 병합·통합 검증이 필요하다. OAuth/linking/실HTTPS·SSO/초대·SMTP·가입 차단은 미검증이며 Task6/7은 별도다.

## Task 6: 초대 생성·발송·수락·취소

**Files (Home):** new `supabase/migrations/202610150003_console_invites.sql`, `supabase/tests/console_invites.test.sql`, `app/modules/console/invitations.py`, `tests/integration/test_console_invitations.py`, `frontend/src/features/console/invite-dialog.tsx`; extend Console API/schema/page.

**Files (naeil site):** new `src/app/auth/invite/route.ts`, `src/lib/auth/invite.ts`, `src/lib/auth/__tests__/invite.test.ts`; modify `src/lib/auth/redirect.ts` and its tests, existing cookie utilities only where needed by measured failures.

**Interfaces:** 관리 API `POST /api/console/invitations`는 `{email,services,operationId}`를 받는다. `GET`은 상태/만료를 반환하고 `POST /{id}/resend`, `/cancel`은 expectedVersion/operationId를 요구한다. 수락 RPC `accept_console_invite(p_invite_id uuid,p_version bigint,p_nonce text) → jsonb`는 auth.uid(), 준비된 수신자 ID, 현재 version, 만료, 일회용 비밀의 hash, 활성 초대 상태를 한 트랜잭션에서 검증하고 grants+활성화+audit를 함께 저장한다. 이메일 확인은 검증된 사용자와 정확한 초대 version/nonce를 연결해야 하며 일반 OAuth 로그인만으로 초대 증명 없이 수락할 수 없다.

- [x] 가상 이메일/fixture로 테스트 작성: 신규/기존 회원, 중복 대기, 빈 서비스, 중단 서비스, 불명확한 발송 결과, 재발송, 취소/수락 경합, 7일 경계, 이전 version/nonce, 다른 사용자의 수락. 발송 요청 성공과 수신함 도착은 구분한다.
- [x] `python3 scripts/console-db.py test`(소유권·포트·로컬 설정을 확인하는 runner)와 `.venv/bin/python -m pytest tests/integration/test_console_invitations.py -q`로 실패 확인. 사이트에서는 `pnpm test src/lib/auth/__tests__/invite.test.ts`를 실행한다.
- [x] Task 0에서 확인한 Supabase 초대/인증 방식을 구현한다. 메일 인증 비밀과 앱 초대 증명을 분리하고 인증 후 현재 앱 초대를 재검사한다. DB outbox/operation ID로 중복 발송을 억제하며 불명확한 결과를 자동 성공이나 무제한 재발송으로 처리하지 않는다. 초기 제한은 대상 이메일당60초1회, 관리자당1시간10회이며 DB에서 원자적으로 검사한다. 제공자의 더 엄격한 제한도 따른다.
- [x] UI에 발송 중/실패/수락 대기/수락/취소/만료, 재발송/취소, 공용 데이터 설명을 연결한다. 승인되지 않은 실제 수신자에게 자동 발송하는 테스트를 만들지 않는다.
- [x] 위 테스트·프론트 테스트·사이트 인증 테스트 실행. 복귀 주소는 HTTPS와 등록된 정확한 호스트로 제한하고 `//host`, 다른 포트, 잘못된 URL을 거부하는 회귀 테스트를 포함한다.
- [x] 격리 SMTP capture/owned TLS와 로컬 signup OFF를 검증하고 초대 기능·테스트·계약을 커밋한다. 외부 SMTP 수신함·Google/GitHub/linking·hosted 가입 설정은 별도 준비/승인 단계로 남긴다. 로컬 성공을 해당 E2E 성공으로 표시하지 않는다.

Task6 진행 기록: Home `8708d643`와 site `ff1c5b6`에서 격리 구현을 시작했다. 로컬 GoTrue v2.197.0에서 신규 invite 생성→검증→재사용 거부, 기존 confirmed Auth-only 계정 recovery의 동일 UUID, missing recovery404와 공개 signup422를 실제 확인하고 fixture를 정리했다. 생성 API는 메일을 보내지 않는다. 현재 초대 version/nonce/Auth fingerprint와 실제 검증 세션을 묶는 서버 전용 receipt를 수락 RPC 앞에 추가한다. 세부 계약·로컬 제약은 Home OpenSpec `invitation-contract.md`가 기준이며, 일반 OAuth·실 SMTP·hosted 가입 제한은 여전히 미검증/미변경이다. 이 관측은 인증 preflight 근거이며 후속 전체 검증과 구분한다.

Task6 로컬 완료: Home DB `5c7a62e6`, API/SMTP `7eec243f`, UI `56a149f6`; site 수락 화면 `ede9f7b`와 오류 복구 `bb83a99`. 현재 관리자 JWT·정확한 operation/version, 발송/lifecycle 분리, 실제 검증 세션에 묶인 receipt와 수신자 JWT의 원자적 수락을 구현했다. 미확정 오류는 동일 작업/증명을 보존하며 명시적 상태 복구 후 별도 확인으로 이어진다. 일반401/403/404 또는 잘못된 오류코드 배열이 소비된 OTP의 복구를 지우지 않는다. DB/감사 원자성·멱등성과 기본 접근 불가 규칙을 유지한다.

메인이 real DB270·별도연결24·runner32, Home frontend906/backend227, 최종 site191+production5, actual local Auth→Home→captureSMTP→site→PostgREST/RLS/DB20, 공개 화면72·관리 화면46+4/오류복구9를 직접 확인했다. 독립 `gpt-6.1-sol` 구현·리뷰와 `gpt-6-astra/high` 최종 리뷰 지적을 RED/GREEN·scoped 재승인으로 종결했다. 명령·원본 실패/최종 결과·도구/모델·검증 한계·SHA256은 Home OpenSpec `invitation-verification.md`와 `evidence/invitations/`를 따른다. Home 영구 검증·재현 harness·증거 커밋은 `dd8fa93c`이며, 이 기록을 포함한 중앙 커밋이 계획/검토 동기화 milestone이다.

시험 identity/Console/초대 행0, 정확한 서비스 unverified 복구, 소유한 preview 종료와2482/2483/19676 해제, Home455/455·원본 source-log/목업 보존을 확인했다. 기존 unrelated Auth audit129행은 지우지 않았다. 이번 작업은 실제 회원/권한/데이터·hosted signup/callback·실 수신자 메일·운영 배포를 변경하지 않았다. 외부 PKCE 교환만 fixture seam이며 real OAuth/linking/실HTTPS/SSO·실SMTP inbox는 미검증이다. 단일worker/재시작 연속성, TRACE ingress, 이전 Estimate navigation 브랜치 통합도 운영 전 조건이다. Task7은 별도이며 자동 시작/운영 전환으로 확대하지 않는다.

## Task 7: 전체 검증과 운영 전환 준비

**Files:** 각 서비스 `docs/ops/console-access-release.md`, Home OpenSpec context/tasks, 중앙 spec의 검증 결과 링크.

**Interfaces:** 릴리스 산출물, 초기 관리자/기존 회원 권한의 명시적 표, 서비스 연결 상태, 중단/복구 절차.

- [ ] 구현 범위를 설계 완료 조건 1–13에 대응시킨다. 미검증 제공자·메일·기존 쿠키 전환을 통과로 표시하지 않는다.
- [ ] 사용자 A/B/C, 개인 관리자, Home만 로그인, 기존 비밀번호 쿠키, DB 장애 조합을 격리 환경에서 실행한다. 두 서비스 사이에 권한이 전이되지 않는지와 기존 AI 화면 영향을 확인한다.
- [ ] Home의 `openspec validate --specs`, change strict 검증, 기존 인증 회귀 테스트를 통과시킨다. 공유 UI 패키지 변경이 필요해진 경우에만 해당 패키지의 Storybook/packed consumption 검증을 추가한다.
- [ ] 운영 변경 전에 데이터 보존, 초기 허용표, 새 로그인 안내, 필요한 콜백/SMTP 설정, 서비스별 전환 순서를 검토 가능한 결과로 정리한다. 기존 인증 사용자 전원에게 초기 권한을 일괄 부여하지 않는다.
- [ ] 승인된 운영 전환에서는 기존 데이터/설정/백업을 유지하며 서비스별로 업데이트한다. 연결 검증을 통과한 뒤에만 Console에 적용 완료를 표시한다. 공개 가입 중단은 초대 수락 준비와 검증을 맞춰 수행한다.
- [ ] 기존 비밀번호 인증만 하는 버전으로 자동 복구해 새 권한을 우회하게 하지 않는다. 복구가 필요하면 보호 경로를 중단하고 데이터를 유지한 채 권한 검사가 유효한 산출물로 돌아간다.
- [ ] 실제 수행/미수행 항목을 기록하고 커밋한다. 배포 전이라면 ‘구현 완료·미배포’로 명시한다.

## 계획 자체 검토

설계 완료 조건 13개를 Tasks 1–7에서 다룬다. 초대 토큰 계약과 아직 확정하지 못한 Home 배포 원본은 Task 0의 구체적인 검증 산출물이며, 추측으로 운영 계약을 만들지 않는다. 저장소별 산출물을 만들고 DB/API 계약→UI→JEV→Estimate→초대의 의존 순서를 따른다. 공용 데이터 방침은 확인되었고, 특정 실제 사용자에게 접근 권한을 주는 작업은 아직 수행하지 않았다.
