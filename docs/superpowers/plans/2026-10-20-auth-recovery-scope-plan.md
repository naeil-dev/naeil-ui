# 기존 호스팅 인증 전환 실행·범위 관리 계획 — 2026-10-20

## 최신 후속 단위 — 2026-10-21 적용 입력·로컬 제어 검증

“계속 진행해줘”에 따라 [적용 준비 결과](../../rollout/evidence/auth-application-preparation-2026-10-21/report.md)를 추가했다. 고정285개 source archive를 보존했고, HTTPS 검사기는 초대 transaction을 만들 수 있는 GET을 제외한 최대64요청으로 구현했다.12개 로컬 검사만 실행했으며 실제 HTTPS 요청은0회다. 사이트 코드와 아래 정적 복귀 증거는 그대로 유지했다.

Estimate용 native 같은-PID 교체 primitive36개, CLOSED/OPEN lifecycle30개 그룹을 검증했다. 독립 검토에서 찾은 JSON 읽기 크기 제한·nonce/hash 타입 검사 두 결함을 수정한 뒤 새12개와 기존30개가 통과했다. 중앙 runner는 CLI 비활성 상태로35개, 실제 psycopg Unix socket 전송4개, 새 격리 PostgreSQL17.11에서 readback SQL13개를 통과했다. 실패 이력과 lock inode는 보존했고 새 SQL fixture는 모두 정상 종료 후 nonforced 제거했다.

**운영 준비 완료는 아니다.** 실제 writer/lock/process-start 확인·설치 wrapper·private config·CLOSE→보호 종료 절차, 중앙 owner의 독립 접속/보관·TLS/로그·fresh baseline/catalog/reconciliation, 현재 Vercel의 누락 metadata와 운영 적용이 남아 있다. 소스 archive/핵심 코드/정확한 검증 결과와 이 경계를 위 결과 문서에 함께 고정했다. 실제 배포·설정/schema/회원·권한·프로세스 적용이나 실제 계정 수용은 실행하지 않았다. 기존 계약 결정은 재질문하지 않으며, Home 별도 작업을 현재 로그인 선행조건으로 추가하지 않는다.

다음은 누락된 실제 운영 접근과 안전한 적용 수단을 연결한 뒤 사이트 relay·중앙 의존성·Estimate 실제 HTTPS/provider·저장/계정전환/재시작을 순서대로 수용하고 Jev로 가는 것이다. 아래 정적 복귀 완료 기록과 원 계획은 당시 상태를 보존한다.

## 최신 로그인 단위 — 2026-10-21 복귀 설계·로컬 구현·격리 검증 완료

사용자의 **“너 권고만 먼저 진행해줘”**를 설명한 OP01–03 묶음과 아래 정적 복귀안의 **로컬 구현·격리 검증** 승인으로 적용했고, **“필요한 작업 전부 진행해줘”**에 따라 남은 네 경로를 좁게 수정·검증했다. 같은 결정을 다시 묻지 않는다. 현재 작업은 앱 로그인 복귀이며, 아래 원 계획의 Home 회원별 권한 관리·최신 소스 이식·초대/메일 단계는 이번 범위에 포함하지 않는다. 배포·실제 설정/schema/권한·운영 프로세스 적용도 하지 않았다. 아래 10/20 후보와 체크박스는 당시 기록으로 보존한다.

세 정적 App Router 복귀 경로와 전달된 URL/Host 검사를 구현하고 wildcard rewrite/Pages API를 제거했다. 후속 수정은 `src/app/auth/return/[...rejected]/route.ts`의 **거부 전용404**와 두 기존 회귀 테스트·transport 검사기다. 이 fallback은 request/params를 읽지 않고 목적지를 고르거나 redirect하지 않는다. 정상 경로는 기존 proxy pass-through 뒤 세 literal route에서만303을 만든다. 공통 parser·고정 목적지·실패 no-code·빈 body/fragment·nonce/cookie/PKCE·중앙 권한과 기존 console 경로를 유지했다. Next16.1.7/의존성·E/H/J 제품 소스는 바꾸지 않았다.

| 새로 실행한 확인 | 결과와 한계 |
| --- | --- |
| 세 집중 테스트·실제 빌드 |342/342, scoped types 및 typegen/types/build 통과. 과거 실패 영수증은 보존 |
| 새 artifact의 유한 HTTP |129/129 통과. 이전 dot3개·`.rsc`1개 모두 빈404·다섯 보안 헤더·Location/cookie/routing metadata 없음. 새 data/Flight header3개도 정상303 보호 유지 |
| Estimate 연결 | 변경 없는 controller/finalizer16개 그룹·격리 브라우저 JS off/on16개 통과. 두 provider의 성공/취소/실패/재시도, binding/PKCE·만료/replay·장애 logout·합성 권한 회수·새 registry 재열기 확인. Auth는 합성이고 업무 저장 UI/실계정 전환의 새 수용 증거는 아님 |
| 기존 console/Jev 호환 | Home 최소 ASGI12개 그룹, Jev generator/store transport6개 통과. Home 전체 앱/브라우저나 Jev 실제 로그인 수용으로 해석하지 않음 |
| 격리 종료 | 새 서버/브라우저/registry 정상 종료, 가상 TLS 자료 정리. 사이트 runtime3219파일/23링크 동일, outbound 시도0. 기존 fixture/volume·운영 프로세스 미적용 |

**네 실패 해결:** proxy에는 canonical로 전달되지만 외부 라우팅에서 일치하지 않던 dot/`.rsc` 경로를 거부 전용 fallback이 처리한다. 합성 query를 반사하던 Next HTML404가 새 artifact에서는 보호된 빈404로 바뀌었다. 원문 복원을 주장하거나 OP02 예외를 넓히지 않았다. 정상303을 proxy로 옮기는 중간 안은 Next가 목적지를 body로 출력한다는 소스 검토 때문에 제품 반영 전에 폐기했고 실패 기록을 보존했다. 최종 독립 리뷰는 소스·빌드·HTTP·같은 artifact의 소비자 결과·종료를 확인하여 남은 로컬 결함을 찾지 못했다. 규칙·파일·검증·정책 결정·잔여 운영 조건이 확정되어 **이 복귀 단위의 설계와 로컬 검증을 완료**한다.

OP03의11개 원문/전달값 차이는 별도 열로 남겼다. static route도 Next `prepare()`의 query 재직렬화를 거치며, D12는 이번 로컬에서 literal `%` 전달로 관측되어 과거 Preview의 empty-code 결과와 다르다. TRACE는 앱 진입 전500 예외, locale redirect는 정확한 상대 주소였다. 이 분류 수정은 제품 parser 완화나 과거 실패의 통과 재분류가 아니다.

새 산출물은 [통합 결과와 한계](../../rollout/evidence/auth-static-return-fallback-2026-10-21/report.md), [129개 HTTP](../../rollout/evidence/auth-static-return-fallback-2026-10-21/http-transport.json), [소비자 결과](../../rollout/evidence/auth-static-return-fallback-2026-10-21/task-4-integration-report.md), [독립 리뷰](../../rollout/evidence/auth-static-return-fallback-2026-10-21/task-4-review.md), [보존 확인](../../rollout/evidence/auth-static-return-fallback-2026-10-21/task-4-preservation.json)이다. artifact는 `static-return-fallback-20261021-d71c8c4bb2d9`, source snapshot은 `f29c2836c59de60aab049d324bf6b3b8f983d931669fc1233e49ccfee9327ff5`이며284개 입력이 현재 소스와 일치한다. 이전 `static-return-local-20261021-99420f1f99aa`의108/126·122/126 및 실패 기록37개는 byte 단위로 보존했다.

다음 우선순위는 [Estimate 실제 수용 준비](../../rollout/evidence/auth-static-return-fallback-2026-10-21/task-4-acceptance-preparation.md)의 운영 의존성이다. 로컬 artifact는 가상 public Auth 값과 Node22.23.2로 검증한 standalone이며, 실제 Vercel 배포용 artifact나 Node24.x hosted 증거가 아니다. 현재 Estimate loaded KeepAlive/20초 종료 정책은 제한된 metadata로 다시 확인했지만 안전한 교체 수단은 아직 설계 옵션뿐이다. 독립 중앙 owner 복구와 schema/권한 적용도 미완료다. 정확한 적용·보존/복구 조건을 충족한 뒤 Estimate 실제 HTTPS/provider·저장/계정 전환/재시작을 수용하고 Jev로 간다. 양 구간 인프라의 보존 여부·접근·기간은 여전히 미확인이다.

## 아래는 2026-10-20 원 계획과 당시 검토 기록

**권고: 새 인프라 작업은 중단한 채, 기존 환경에서 Jay → Home 권한 관리 → Estimate 실제 사용까지 끝낸다.** 첫 작업은 현재 호스팅에서 성립할 로그인 복귀안 하나와 필요한 계약 변경을 함께 판단하는 것이다. 그 가능성이 확인되기 전에 서버·인증서·관측 도구부터 늘리지 않는다.

**상태:** 사용자 요청에 따른 실행 전 계획이다. 제품 구현·보안 계약 변경·운영 적용은 이번에 하지 않았다. 이 문서는 그 승인을 대신하지 않는다. 이미 승인된 범위는 재승인 없이 진행하되, 새로운 범위와 실제 적용은 아래 경계를 따른다.

**목표:** 기존 Jay 계정으로 Home의 개인 관리자 화면에서 중앙 사용권을 관리하고, 허용된 Estimate를 실제 HTTPS로 사용한다. Estimate 수용 뒤 Jev·초대로 진행한다.

**구조·기술:** 사이트 Vercel/Next·TypeScript, Estimate/Jev Mac mini, 현재 Supabase Auth/권한표, Home의 기존 Python/Console 구조를 유지한다. 로그인 복귀 중계(relay)는 현재 필수 조건이며 각 서비스가 자신의 로그인 시도와 세션을 검증한다. Home 주소는 `https://jay-macmini-2.tail165003.ts.net:2455`다.

**기준:** [독립 방향 검토](../../rollout/auth-direction-independent-review-2026-10-20.md), [기존 인증 계약](../specs/2026-10-18-exact-callback-return-design.md), [실행 순서와 보존 경계](../../rollout/auth-next-main-handoff-2026-10-19.md). 기존 명세의 당시 제안 상태보다 후속 구현·검증 기록을 우선하며, 이 계획만으로 기존 보안 조건을 폐기하지 않는다.

## 1. 완료 조건과 범위 고정

| ID | 이번 전환의 완료 조건 | 필요한 실제 근거 |
| --- | --- | --- |
| G1 | 기존 Jay를 유지하고 Home 개인 관리자가 중앙 권한표를 관리한다 | 기존 identity 연결, 관리자 접근과 비관리자 거부, 회원별 명시 권한 집행 |
| G2 | Estimate에 연결·검증·권한 부여를 순서대로 적용한다 | 실제 연결의 미허용 개인 JWT403, 별도 연결 검증, Estimate 전체 허용집합의 명시 grant, 허용 후 실제 HTTPS 로그인·사용·회수 |
| G3 | 로그인 시도 보호와 종료·전환 동작을 보존한다 | cookie binding·PKCE·nonce·취소·replay·만료, 장애 중 logout·계정 전환, 401/403/503의 해당 의미 |
| G4 | 현재 데이터와 운영 기능을 보존하고 안전하게 전환·복구한다 | Home 현재 Auto/monitoring·DB와 호환되는 후보, Estimate 저장/단일 writer/안전한 종료·재시작, 중앙 정책의 독립 복구 경로 |
| G5 | 기존 서비스 사용 흐름을 보존한다 | 저장 보호·되돌아갈 위치·계정 표시, 사이트/Jev ko/ja/en 및 Estimate ja, 기존 UI0.7.1 구성 |

현재는 이 조건들의 로컬·합성 검증 근거가 일부 있으며 **실계정 운영 수용은 미완료**다. 코드·빌드·문서·해시 일치만으로 위 표를 완료 처리하지 않는다. 새 회원 초대·실메일은 Estimate 첫 수용의 선행조건으로 추가하지 않는다.

**이번 경로에서 제외:** A2 VM, 새 TLS 진입점·sidecar·인증서 운영·DNS/tunnel 변경, 호스팅/업무 데이터 이전, 공용 UI 재설계, 자동 SSO·전역 logout·언어 동기화·Estimate 번역. 중단은 추가 작업의 중단이며 운영 서비스 종료를 뜻하지 않는다.

**계약의 경계:** 중앙 권한 집행, 고정 목적지, access/refresh token·verifier·세션 비밀의 URL 비노출, 로그인 시도 보호, 데이터·복구 요구를 유지한다. OP01의 양 구간 저장 전 query 억제와 OP02/03의 응답·원문·Host·실제 metadata 조건도 명시적 대체 결정 전까지 유효하다. 구현상 번거롭다는 이유로 테스트를 삭제하거나 parser를 완화하지 않는다.

## 2. 실행 순서

### 1단계 — 현재 호스팅에서 성립할 복귀안 하나를 결정

- [ ] 기존 실패 근거와 현재 소스를 대조하여 후보 하나만 제시한다. 현재 근거에는 기존 조건을 모두 만족하는 완성 경로가 없다. “불가능” 또는 “표준 callback으로 이미 해결”이라고 단정하지 않는다.
- [ ] 아래 세 계약을 **하나의 후보로 함께** 설명한다. 로그 조건만 먼저 완화받고 다른 차단 조건을 뒤늦게 발견하는 순서로 진행하지 않는다.

| 계약 | 후보가 답해야 할 질문 | 통과 또는 결정 기준 |
| --- | --- | --- |
| OP01: 양 구간의 query 보존 | 어떤 처리자가 code·nonce·오류 query를 볼 수 있고, 어디까지 저장을 통제할 수 있는가? | 통제 근거를 제시하거나, 통제하지 못하는 자료·경계·미확인 보존기간과 잔여 위험을 정확히 명시해 변경 결정을 받는다 |
| OP02: 앱 도달 전 응답 | 경로 정규화·메서드 처리가 만드는 응답도 필요한 상태·헤더·비노출 조건을 만족하는가? | 기존 조기 redirect/TRACE 관측을 포함하여 충족 근거 또는 대체 계약·영향을 제시한다 |
| OP03: 전달과 검증 | framework가 바꾼 query/Host와 실제 요청을 어떻게 구별하고 잘못된 입력을 거부하는가? | 현재 Next16.1.7 own initURL/503·raw Host·path/nxtPpath·고정303/빈 fragment 계약의 충족 또는 명시적 대체 근거를 제시한다 |

- [ ] 이 문서에 후보의 흐름, 변경 전/후 규칙, 유지하는 보호, 수정 파일, 최소 검증, 미확인 운영 조건을 한 묶음으로 추가한다. 기존 로그 보존을 “짧음/안전함”으로 가정하지 않는다. 무해한 health query 저장 관측을 실제 인증정보 유출로 바꾸어 설명하지 않는다.
- [ ] 첫 확인 대상은 사이트의 `next.config.ts`, `src/proxy.ts`, `src/lib/auth/service-return.ts`, `src/pages/api/internal/service-return.ts`와 아래 세 테스트, 기존 결과다. 관련 호출부와 기존 보고서에 지정된 Estimate/Home 생성기·finalizer도 읽어 전체 흐름을 확인한다. 필요한 읽기 전용 확인은 수정 범위 확대와 구별한다. 공개 지원 사실 하나가 결론을 바꿀 때만 그 사실을 좁게 확인한다. 새 observer·Preview·키·hosted probe·지원문의·공급자 비교는 자동 추가하지 않는다.

**산출물/종료:** 하나의 일관된 변경안과 채택/보류 판단. 현재 조건을 지키는 수단이면 기존 승인 범위 내 후속 작업으로 연결한다. 계약 변경이 필요하면 구체적 변경만 사용자 결정 대상으로 올린다. 후보가 성립하지 않으면 막힌 조건을 보고하고 그 분기를 멈춘다. A2로 자동 전환하지 않는다. 이 단계의 판단은 구현 완료나 운영 통과가 아니다.

### 1단계 검토 결과 — 2026-10-20 현재 호스팅 복귀안

**판정: 아래 한 후보의 계약 변경과 로컬 구현·격리 검증을 조건부 권고한다. 아직 채택·구현·운영 검증된 안은 아니다.** 인수 확인 뒤 사용자의 “승인할게 지시한대로 진행해줘”는 제시한 다음 단위인 이 1단계의 진행 승인으로 적용했다. 구체적 대체 계약이 없던 시점의 승인을 OP01–03 폐기나 운영 적용 승인으로 확대하지 않는다. 아래 원 계획의 체크박스와 과거 검증 기록은 보존한다.

| 범위 연결 | 이번 단위 |
| --- | --- |
| G2·G3·G5 → 차단 근거 | 기존 builder의 wildcard capture 주입 위험, 실제 Preview의 query 변형8건·query 유지308 18건·TRACE 헤더 불일치6건, wire Host/own metadata/양 구간 비저장 미입증 |
| 이번 허용 변경 | 이 계획의 후보 절과 `S/STATUS.md` 포인터만. 제품·의존성·소비자·fixture·운영 변경 없음 |
| 최소 확인 | 현재 소스/기존 세 테스트/저장된 결과와 E/H 생성기·finalizer 대조, 독립 읽기 검토, 문서와 신규 diff 검사. 완료된 suite·178 probe 반복 없음 |
| 멈출 조건 | 대체 계약 미채택이면 구현 보류. 새 서버·DNS·인증서·observer·Preview·키·probe로 자동 전환하지 않음 |

#### 후보의 흐름과 수정 이유

**기존 세 공개 주소에 정적 App Router handler를 두고, 플랫폼이 애플리케이션에 전달한 URL과 Host를 검증한다.** Supabase → `naeil.dev/auth/return/{abestimate,console,jev}` → 기존 서비스 callback이라는 relay와 주소는 그대로다. E/H/J가 만든 원래 nonce query, 각 서비스의 server-held verifier/S256·cookie binding·취소/replay·만료·logout·권한 집행을 유지한다. Jev route는 기존 계약 호환성만 보존하며 새 Jev 연결을 시작하지 않는다.

1. `/auth/return/abestimate`, `/auth/return/console`, `/auth/return/jev`에 각각 정적 route를 둔다. 각 파일은 코드에 고정된 자신의 서비스/경로만 공통 처리기에 넘긴다. 동적 `[service]`나 wildcard rewrite를 새로 두지 않는다.
2. 기존 `/auth/return/:path*` → internal Pages API rewrite와 그 API adapter를 제거한다. 이로써 해당 capture 주입과 앱의 private `getRequestMeta`/own `initURL`/버전 불일치503 의존을 없앤다. Next 패키지16.1.7·lockfile은 바꾸지 않는다. 이것은 두 소스 의존을 제거하는 것이며 실제 hosted 성공 증명은 아니다.
3. 기존 proxy의 전달된 return/internal namespace 보호, canonical GET 통과, 사이트 Auth/locale 우회는 유지한다. public route는 전달된 경로가 자신의 고정 경로인지 확인하고 기존 순수 parser를 재사용한다. `URLSearchParams`만으로 입력을 먼저 파싱하거나 원문처럼 재구성하지 않는다.
4. 성공은 고정 목적지에 `nonce`와 `code`만, 실패는 고정 목적지에 `nonce&error=authentication_failed`만 담아 빈 body의303을 보낸다. **실패에는 code를 절대 함께 보내지 않는다.** 모든303 Location 끝의 빈 `#`를 유지한다. relay는 cookie/Auth/DB/network/세션·권한 작업을 하지 않는다.
5. 각 route는 GET과 HEAD/POST/PUT/PATCH/DELETE/OPTIONS를 명시적으로 export한다. 지원되는 비GET은405/`Allow: GET`/Location 없음으로 종료한다. Next의 자동 HEAD→GET 및 OPTIONS204에 맡기지 않는다. route는 동적 실행·Node runtime을 명시하고 직접 작성한 응답에는 기존 다섯 보안 헤더를 유지한다.

근거는 [기존 구현·범위별 검증](../../rollout/exact-callback-return-2026-10-18.md), [builder 실패 경계](../../rollout/vercel-auth-preflight-2026-10-18.md), [실제 Preview](../../rollout/auth-preview-baseline-result-2026-10-19.md), [변형 경계 조사](../../rollout/auth-boundary-preparation-2026-10-19.md)다. 현재 Next 소스의 App Router Request adapter와 method 처리, pre-handler slash308도 직접 대조했다. 정적 route는 dynamic/rewrite일 때의 `normalizeCdnUrl` 호출 조건 하나를 피하지만 플랫폼 전체의 query 변형을 없앤다고 주장하지 않는다. literal rewrite만으로 이미 해결됐다는 안은 채택하지 않는다.

#### OP01–03을 함께 바꿔야 하는 정확한 범위

| 계약 | 현재 요구 | 제안하는 대체와 유지 조건 |
| --- | --- | --- |
| OP01 | 양 구간의 모든 관련 처리 경계에서 callback query를 저장 전에 억제 | 현재의 플랫폼/인프라 처리자가 code·nonce·provider 오류 query/URL을 내부 로그·trace·오류 자료에 보존할 가능성을 허용한다. 범위는 첫 구간 Vercel/Next 자동 처리, 둘째 구간의 기존 E Cloudflare/tunnel·Mac Next/runtime 수집과 H Tailscale Serve·Python/runtime 수집이다. 실제 보존 여부·접근 범위·기간은 미확인이고 상한을 약속하지 않는다. 새 처리자·새 수집기·새 logging 설정은 추가하지 않는다. 직접 작성/설정하는 앱 로그·추적·오류·내보내기의 callback 원문 수집 제한은 유지한다. 이 예외는 access/refresh token·verifier·세션 비밀의 URL 포함이나 그 값을 새로 수집할 허가가 아니다. |
| OP02 | 앱 이전 응답까지 정확한 상태·헤더·비반사/비노출 보장 | 앱 handler/proxy가 직접 생성하는 응답에는 기존 계약을 유지한다. 플랫폼/Next가 그 전에 만드는 slash/backslash308, malformed Host 거부, TRACE/미지원 메서드 응답은 그 보장의 예외로 인정한다. query가 Location/body에 남거나 헤더가 다를 수 있다. 관측된308은 같은 origin의 상대 정규화 경로였지만 모든 입력에 대한 보편적 증명은 아니다. 정상 제품 생성 URL은 canonical HTTPS GET만 사용한다. 이후 실제 수용에서 정상 흐름의 불필요한 redirect, 다른 origin으로의 이탈, cookie/권한 우회가 보이면 중단한다. |
| OP03 | wire 원문 query/path·raw Host 중복/철자, 실제 own `initURL`·16.1.7/503, 원래 `path`/`nxtPpath` 거부 | 검증 대상은 **플랫폼이 전달한 Request의 URL 문자열과 Host 값**이다. 전달된 Host는 정확히 `naeil.dev`만 허용하며 URL origin·forwarded/routing header·Preview hostname을 권위로 쓰지 않는다. 전달된 URL에 기존16KiB 한도·엄격한 1회 decode·nonce 유일성/43자/키 철자·중복/제어/unknown/token/routing-field 검사·code 한도를 적용한다. 앱은 `path`/`nxtPpath`를 제거하거나 복구하지 않는다. 다만 앞단이 없앤 필드, 정규화한 경로·키·값·크기·Host 중복은 원래 상태를 검증할 수 없음을 수용한다. private metadata의503 의무만 폐기하며 소비자401/403/503 의미는 유지한다. |

OP01의 둘째 구간 이름은 [보존된 ingress 조사](../../rollout/evidence/auth-a2-design-review-2026-10-19/second-hop.md)에 근거한다. E routing receipt와 Home Serve metadata는 당시 관측이며 이번에 설정을 다시 조회하지 않았다. Jev의 같은 기존 수신 경로에 대한 보존 가능성도 면제된 것으로 보지 않으며 실제 연결은 Estimate 이후다. Supabase/Auth provider의 기존 처리는 유지한다. 이번 후보가 그 내부 수집을 새로 확인하거나 제어한 것은 아니다.

무해한 health query 저장은 실제 인증정보 유출 관측이 아니다. 그러나 위 변경은 단순한 문구 정리가 아니라 **플랫폼 보존 가능성과 정규화에 따른 입력 구별·응답 보증 축소를 수용하는 보안 계약 결정**이다. PKCE는 verifier 없는 code 교환을 막지만 보존기간을 짧게 만들거나 nonce/오류 내용의 노출·로그인 시도 방해 가능성을 없애지 않는다.

원래 잘못된 입력에 대한 효과도 달라질 수 있다. 아래는 새 후보의 실행 결과가 아니라 기존 관측과 parser에서 도출한 결정 범위다.

| 입력 차이 | 이전 원문 기준 → 전달된 값 기준의 가능한 효과 |
| --- | --- |
| `%2f` → `%2F` | 철자는 달라도 decoded code 값이 같을 수 있음 |
| encoded/literal nonce 중복 → literal 두 개 | 두 개가 전달되면 계속400·relay 없음. 앞단이 중복을 없애지 않는다는 보편적 보장은 없음 |
| malformed `%` → 빈 code (기존 D12 관측) |400·시도 미선택 → 유효 nonce의 canonical 실패·소비자 시도 종료 가능 |
| 끝의 빈 query pair 제거 (기존 D30 관측) | canonical 실패 → 남은 두 필드가 유효하면 code 전달·교환 가능 |
| encoded 단일 nonce 키, dot/alias path, `nxtP*` 등 앞단 정규화/제거 | 원래 거부할 요청이 정상 전달 형태로 합쳐지면 구별 불가. 이 후보에서 해당 변형이 실제 발생한다고 단정하지 않음 |

API를 없앨 때 **전달된 URL에 아직 보이는 literal 제어문자와 `#`의400 거부를 공통 경계로 옮긴다.** 기존 helper만 호출하면 이 검사를 잃으므로 필수 수정이다. 이미 사라진 원문을 복구한다는 의미는 아니다. Home은 기존 stale-A가 새 B를 종료하는 동작과 재시작 시 개인 세션 소멸을 그대로 유지한다. Home/Jev finalizer의 오류/unknown-key 검사가 E와 같지 않으므로 relay의 실패 no-code·출력 allowlist를 보존해야 한다. E/H/J 생성기·finalizer 변경은 필요하지 않다.

#### 채택 후 로컬 구현에 한정할 파일

아래는 **후속 구현 제안 목록**이며 이번 단위의 수정 목록이 아니다. E/H/J는 읽기 전용 참조다. Home 최신 소스 이식·Estimate closed gate·중앙 복구를 이 목록에 포함하지 않는다.

| 파일 (S 기준) | 최소 변경 |
| --- | --- |
| `next.config.ts` | return wildcard rewrite만 제거. 기존 site 설정/identity·일반 routing·normalize 관련 flag 보존 |
| `src/proxy.ts` | 기존 namespace 격리/Host/메서드 보호를 유지하고 원문 보존을 주장하는 주석을 수정. 별도 전달/관측 header 추가 없음 |
| `src/lib/auth/service-return.ts` | 정적 route의 코드상 service/path binding과 전달된 URL 경계 검사를 추가. 기존 strict parser·고정 map·출력·헤더 재사용 |
| `src/app/auth/return/abestimate/route.ts`, `src/app/auth/return/console/route.ts`, `src/app/auth/return/jev/route.ts` | 세 정적 public adapter. GET 및 여섯 비GET export, 동적 실행/Node runtime |
| `src/pages/api/internal/service-return.ts` | old adapter 제거. 이전 internal namespace는 proxy에서 계속 거부 |
| `src/lib/auth/__tests__/service-return.test.ts`, `service-return-api.test.ts`, `service-return-proxy.test.ts` | 보존된 parser/namespace 회귀 유지, 정적 adapter/method/경로 binding 추가. private/raw 보증을 폐기하는 테스트는 아래 변경표로 명시하고 새 보증으로 바꿔 검증 |
| `scripts/verify-service-return-transport.mts` | 기존 유한 사례·fixture 정의를 재사용할 격리 built HTTP/브라우저 transport harness. 기존 보존 harness/fixture를 수정·재가동하지 않음 |
| 이 계획, `STATUS.md` | 실제 변경·검증·남은 조건만 갱신. 과거 명세/검증/실패 영수증은 수정하지 않음 |

#### 최소 검증과 증거의 구분

| 경계 | 채택 후 실행할 최소 확인 / 통과 기준 |
| --- | --- |
| app 계약 | 원 계획의 세 vitest 파일. 세 route의 success/error, 각 HEAD/POST/PUT/PATCH/DELETE/OPTIONS405, 고정 목적지/empty `#`/빈 body/다섯 헤더, cookie/body/Auth/DB/network 접근 없음. 전달된 잘못된 Host·path·query는 해당400/403/404 또는 code 없는 canonical 실패 |
| 변경된 OP03 | D01 정상 대조와 D03/D09/D12/D30의 원래/변환 문자열을 각각 입력하여 old-original/new-delivered 결과를 구분. RAW-01의 apostrophe/끝 공백·원래 dot path·raw Host 중복·missing own metadata 테스트는 원문 보증 폐기 사실을 남기고 전달된 입력 검증/공개 adapter 검사로 대체. 기존 실패를 새 통과로 재분류하지 않음 |
| 실제 local artifact | `pnpm check:types`, `pnpm build`, 세 정적 route 포함·wildcard rewrite/private metadata 의존 부재 검사. built HTTP에서 canonical 경로, 이전 internal 경로, 여섯 메서드, 변경 영향이 있는 기존 alias/Host/query 사례와 기존 일반 site callback/invite/언어 경로 smoke |
| relay→finalizer | 새 relay artifact와 변경 없는 E/H finalizer의 성공/취소·cookie/nonce mismatch·replay·logout 중 교환·고정 복귀·빈 fragment를 새로 소유한 격리 환경에서 확인. JS off/on redirect chain과 SameSite를 구분. 기존 Home ASGI synthetic 결과를 실제 브라우저/Auth 증거로 승격하지 않음. J는 기존 transport 호환 회귀만 |
| 플랫폼과 실계정 | 기존18개308·TRACE6개·Host 미관측 및49/8/13 기록은 그대로 보존. 이번 후보의 hosted 검증으로 쓰지 않음. 정확한 새 artifact·현재 target·보존/복구와 별도 적용 승인이 준비된 뒤 canonical HTTPS/provider·양 구간의 실제 경로와 G1–G5를 검증. Preview403만으로 canonical 성공을 주장하지 않음 |

TRACE 등 미지원 메서드는 Next handler resolution 이전/내부에서400/405가 될 수 있다. 모든 wire 메서드가 앱의 protected405를 받는다는 검증 항목을 만들지 않는다. 새 정상 callback이 변형으로 실패하거나 보호된 consumer 시도를 잘못 인증하면 구현/검증을 멈추고 그 근거로 범위를 재판단한다. 실패를 parser 완화나 추가 인프라 작업으로 이어가지 않는다.

**검토 범위:** `gpt-6.1-sol/high` 두 담당이 각각 consumer와 platform 소스/기존 근거를 읽기 전용으로 대조했다. 메인이 핵심 소스와 결론을 직접 확인하고 이 후보를 작성했으며, 별도 담당의 완성 문서 검토에서 중요한 불일치는 보고되지 않았다. 구현·빌드·새 transport 실행·외부 지원 확인은 하지 않았다. 새 동작의 통과 증거로 사용하는 검토가 아니다.

**남은 결정:** 위 OP01–03 대체를 하나의 계약으로 채택하고 이 파일 목록의 로컬 구현·격리 검증까지 진행할지 여부다. 채택하지 않으면 현재 계약과 구현을 유지하고 새 인증 활성화를 보류한다. 채택하더라도 hosted 성공·로그 비저장·운영 적격을 보증하지 않으며, 새 Preview/키/probe·배포/schema/Jay/admin/verified/grant·운영 프로세스의 승인이 아니다. 현재 Home 기능/DB 보존, Estimate 저장/안전 종료, 독립 중앙 복구는 원 계획3단계의 별도 조건으로 남는다.

### 2단계 — 결정된 범위만 구현하고 격리 검증

- [ ] 시작 시 실제 worktree·HEAD·기존 dirty 변경을 확인하고, 1단계에서 정한 파일 목록과 완료 조건을 고정한다. 기존 작업을 reset·덮어쓰기 하지 않는다. 계약이 미결정인 부분은 변경하지 않는다.
- [ ] 사이트 중계의 변경을 최소화한다. 기존 helper·의존성을 재사용하며 새 라이브러리나 일반화된 인증 framework를 만들지 않는다. Estimate/Home의 생성기·finalizer 수정이 필요하면 이유와 정확한 범위를 먼저 변경안에 포함한다. Jev 신규 연결은 여기서 확대하지 않는다.
- [ ] 바뀌는 실패 경계부터 확인한다. 사이트의 첫 검증 명령은 아래 기존 테스트다. 기대 결과는 해당 계약의 성공·거부가 모두 의도대로 동작하며 exit0인 것이다. 현재 통과를 주장하는 명령이 아니다.

```sh
pnpm exec vitest run src/lib/auth/__tests__/service-return.test.ts src/lib/auth/__tests__/service-return-api.test.ts src/lib/auth/__tests__/service-return-proxy.test.ts
```

- [ ] 실제 수정에 맞춰 `pnpm check:types`, `pnpm build`, 격리된 built HTTP/브라우저의 영향받는 요청·redirect chain·finalizer 검증을 수행한다. unit 통과로 플랫폼 원문/로그/조기 응답을 증명하지 않는다. 사용하지 않는 과거 fixture·운영 프로세스를 건드리지 않는다.
- [ ] 유지된 기존 검증은 재사용한다. 전체178 probe나 관련 없는 모든 suite를 문서 변경·안심 목적으로 반복하지 않는다. 새 결함·변경된 경계가 있을 때 필요한 범위만 넓힌다.

**산출물/종료:** 정확한 source/artifact와 변경된 동작의 검증 결과, 남은 운영 검증 목록. 후보는 운영 조건까지 해결돼야 다음 실제 적용 단계로 갈 수 있다. 로컬 성공을 Production 적격으로 승격하지 않는다.

### 3단계 — Home·Estimate·중앙 복구의 남은 최소 통합

| 작업 | 구현·준비 범위 | 통과 기준과 제한 |
| --- | --- | --- |
| Home | [현재 소스 기반 이식안](../../rollout/evidence/auth-resume-decisions-2026-10-19/home-recovery/report.md)에 따라 최신 운영 소스에 필요한 인증 부분만 통합. 적용 AGENTS/OpenSpec와 새 변경 범위를 먼저 확인 | 현재 Auto/monitoring와 DB migration graph를 보존한 격리 검증·frontend build. 옛 후보 전체 덮어쓰기·downgrade·검사 우회 금지 |
| Estimate | [기존 종료 검토](../../rollout/evidence/auth-resume-decisions-2026-10-19/estimate-stop/report.md)의 새 요청 차단/재기동 제어안을 좁게 구현·검증 | 저장 중 요청·단일 writer·종료·재시작 보존. 현재 KeepAlive/20초 설정에서 TERM만으로 충분하다고 가정하거나 강제 bootout/kill로 해결하지 않음 |
| 중앙 복구 | [기존 복구 계획](../../rollout/evidence/auth-resume-decisions-2026-10-19/owner-recovery-plan.md)의 독립 재인증·비공개 실행/보관·복구 경로를 완성 | Dashboard 현재 세션 성공과 실제 독립 복구를 구분. 비밀·개인 식별자·payload를 문서/로그에 출력하지 않음 |

- [ ] 기존 읽기 전용 준비는 재사용한다. 위 새 구현의 범위는 제안 상태이므로 실행 전에 정확한 파일·검증·보존 단위를 결정한다. 이미 승인된 독립 준비는 callback 결정 대기 중에도 수행할 수 있으나 이것을 relay 문제 해결로 보고하지 않는다.
- [ ] 각 대상에 적용되는 지침을 읽고 기존 상세 보고서의 테스트 중 새 변경이 영향을 주는 부분을 실행한다. 이 계획에서 아직 정하지 못한 callback 구현이나 Home/Estimate 파일 목록을 완성된 코드 계획으로 가장하지 않는다.

**산출물/종료:** 현재 운영본과 호환되는 후보, 실제 적용 설정, 데이터·backup·auth/config의 보존·복구 절차. 운영 상태가 바뀔 수 있으므로 실제 적용 직전에 writer·대상·보존 근거를 새로 확인한다. 광역 재조사는 하지 않는다.

### 4단계 — 준비된 변경을 순서대로 적용하고 실제 수용

- [ ] 각 적용 전에 정확한 대상·변경·artifact·검증·복구를 완성한다. 새 schema/설정, 계정·권한, push/merge/배포, 운영 프로세스 제어 등 외부 상태 변경은 해당 범위의 기존 승인이 없으면 그 구체적 적용만 승인받는다. 같은 승인 묶음의 개별 명령마다 다시 묻지 않는다. 과거 일회성 Preview/키/probe 승인은 재사용하지 않는다.
- [ ] 순서는 **canonical relay 적용·확인 → schema → 기존 Jay 등록 → Home 개인 관리자 → Estimate 실제 연결 → 연결 별도 검증 → Estimate 전체 허용집합 명시 grant → 실제 HTTPS 수용**이다. 미허용 개인 JWT403은 grant 전에 확인한다. 임시 우회 grant로 순환 검증하지 않는다.
- [ ] exact artifact의 실제 로컬 Auth/DB 허용 경로와 실제 configured connection의 미허용 개인 JWT403을 각각 확인한다. 응답 모양만으로 identity·service·정책 연결을 확인했다고 하지 않는다.
- [ ] G1–G5를 실제 계정/HTTPS에서 확인하고, 로컬만 통과한 항목과 미실행 항목은 분리한다. 참조 중인 소비자와 진행 중 로그인 시도가 있는 동안 relay를 유지한다. 중앙 정책 도입 후 password-only 복귀·lock 삭제·backup 덮어쓰기를 복구로 사용하지 않는다.

**완료:** 기존 Jay의 Home 권한 관리와 Estimate 실사용이 검증된 상태. 그때 다음 단위로 Jev·새 초대/실메일을 진행한다. 그 전에는 초대·메일 추가 작업을 먼저 확장하지 않는다.

## 3. 설계 밖으로 벗어나지 않게 하는 실행 규칙

1. **변경마다 근거를 붙인다.** 시작 전 `G번호 → 지금 막힌 증거 → 허용 파일/대상 → 최소 검증 → 멈출 조건`을 이 문서의 해당 단계에 적는다. 원래 완료 조건을 막지 않는 개선은 현재 작업에 넣지 않는다. 별도 관리 도구·문서 체계는 만들지 않는다.
2. **파일과 운영 대상에서 확인한다.** 작업 시작 상태를 기준으로 내가 만든 diff를 수정 허용 목록과 대조한다. 요청하지 않은 파일/의존성/인프라 변경은 분리하여 미적용 상태로 두며, 남의 dirty 변경을 삭제하지 않는다. 사전 목록에 들어 있지 않은 경계 변경은 “구현 세부사항”으로 통과시키지 않는다.
3. **새 발견을 자동으로 요구사항으로 만들지 않는다.** 원래 수용을 막는 결함, 구체적 보안/데이터 손실 문제, 별도 기능, 선택적 개선으로 분류한다. 앞의 두 항목은 영향받는 진행을 멈추고 필요한 수정 범위를 판단한다. 그 자체가 범위 밖 수정 권한은 아니다. 뒤의 두 항목은 보류 목록으로 보낸다.
4. **확장 시 그 분기만 멈춘다.** 새 서버·진입점·인증서·유료 자원·신뢰 경계·보안 계약·계정/권한 모델을 바꿔야 하면, 원래 목표와 막힌 증거·대안·추가 운영 책임을 짧게 보고한다. 이미 승인된 다른 독립 작업은 계속한다. 확인 요청의 근거를 사용자 지시/해당 지침과 함께 설명한다.
5. **실패를 상세 설계로 덮지 않는다.** 같은 원인으로 두 번 막히고 새 근거도 없으면 패치·조사 반복을 멈추고 접근을 재판단한다. 이름·agent·문서만 바꾸어 다시 시작하지 않는다. 이 기준은 중요한 새 결함의 수정·검증을 생략하는 횟수 제한이 아니다. 이번 계획을 위해 새 위원회나 하위 agent를 자동 생성하지 않는다.
6. **결과로 진척을 보고한다.** 매 단위마다 실제로 가능해진 사용자 행동, 남은 차단 조건, 다음 한 작업을 보고한다. 해시·테스트 개수·문서 수는 보조 근거다. 기존 기록은 보존하고 이 계획의 상태를 갱신하며, 같은 준비 보고서를 연속 생성하지 않는다.

이 규칙은 메인의 작업 선택과 diff/검증 검토에 적용한다. 설치된 자동 차단 장치가 모든 설계 이탈을 막는다고 주장하지 않는다. 새 hook·plugin·워크플로 시스템 없이 먼저 이 범위를 지킨다.

| 보류 항목 | 다시 열 조건 |
| --- | --- |
| A2 서버·TLS·인증서·DNS 전환 | 별도의 호스팅/운영 책임 변경을 사용자가 명시적으로 선택할 때 |
| Jev 신규 연결, 새 초대·실메일 | Estimate 첫 실계정 수용을 마친 뒤 해당 범위를 진행할 때 |
| SSO·전역 logout·언어 동기화·UI/인프라 일반화 | 별도 사용자 요구가 생길 때. 이번 전환의 자동 후속 작업이 아님 |

## 4. 최종 검토의 초점

| 확인할 위험 | 검증할 곳 |
| --- | --- |
| 로그 정책 선택만으로 전달·응답 문제가 해결됐다고 판단 | 1단계 OP01–03 묶음과 실제 운영 조건 |
| parser·Host·metadata 거부를 느슨하게 하여 테스트만 통과 | 2단계 소스 diff, 영향받는 잘못된 입력/HTTP/브라우저 검사 |
| 현재 Home 기능이나 Estimate 저장을 옛 후보로 덮어씀 | 3단계 현재 source/DB 대조와 저장·종료·재시작 검사 |
| 연결 검증 전에 임시 권한을 부여하거나 복구를 생략 | 4단계 적용 순서, 미허용403와 독립 복구 근거 |
| 테스트/문서 완료를 실제 인증 완료로 보고 | G1–G5의 실계정 HTTPS 수용표와 미실행 항목 |

**이번 계획 작성의 검증:** 문서 링크6개·공백 검사, 기존 STATUS 원문·HEAD 보존을 확인했다. 변경은 이 계획과 STATUS 포인터다. 제품 테스트·빌드·운영 확인은 실행하지 않았으며 위 체크박스는 후속 작업이다. 다음 작업 단위는 1단계의 복귀안 하나이며, 계획 보고 후 임의로 구현·운영 적용을 시작하지 않는다.
