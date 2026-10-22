# 인증 운영 전환 메인 재개·결정 준비 — 2026-10-19

**새 메인이 인수했고 후속 요청도 이어 맡는다. 운영 전환은 미완료이며, 이번에는 읽기 전용 조사와 적용·구조 검토 준비만 진행했다.** 새 인증 구현, observer, schema/hosted 설정, 비밀·회원·grant·메일, 배포·DNS/tunnel·운영 프로세스 변경은 없다. 인계의 일회성 Vercel 승인들은 소비된 상태로 유지한다.

기존 [방향 검토](auth-direction-review-2026-10-19.md)와 [인계](auth-direction-handoff-2026-10-19.md)를 기준으로 추가 진단을 보류하고 OP01–03 결정표, Home/DB 복구, Estimate 종료 준비를 병행했다. **새로 발견된 Home 운영 이미지·DB revision 변경** 때문에 과거 후보의 운영본 일치 근거를 현재 적용에 재사용할 수 없다.

## 인수·직접 대조

- 지정5cwd HEAD는 인계와 일치하고 diff-check0. shared/E/J/H status도 일치했다. S의 추가 status는 직전 인계문·state 폴더였다. 원 인계문 hash 차이는 이미 공지된 최신 인계 링크 한 문단을 제외하면 기존 hash와 일치했다. 처음 stdout 개행 차이로 생긴 비교 false는 값을 정규화해 정정했고 실제 HEAD drift로 처리하지 않았다.
- S 보호 구현16파일, 경계 조사 manifest26파일의 hash/byte가 모두 일치했다. 종합 계획 등9artifact 중8개 일치, 나머지1개는 위 링크 차이다. E의 동결 manifest 및 선언 source289개도 메인이 직접 대조해 일치했다. E의 embedded identity는 여전히 development이며 Production 적격 증거로 바꾸지 않았다.
- 지정된28fixture는 identity/name/state/network/readOnly/mount-count/port 투영이 인계와 일치했다. older SQL은 DB가 종료된 뒤 sleep만 남은 running container이며, 종료/삭제로 기록하지 않는다. 기존 fixture/volume과 terrific-buffalo는 보존한다.
- 최초 Paseo5cwd 조회에서는 현 메인1명 running, 기존 리뷰/이전 메인6명 idle, terminal0이었다. 인계의 다른 과거 담당이 이번 비보관 목록에 나타나지 않은 이유와 범위 밖 활동은 미확인이다. native는 인수 당시 root만 반환했다. 이후 아래3명에게 명시적 소유 범위로 위임했다.
- 세 기존 scratch는 존재/0700이었다. 이번 준비에서 전체 archive/runtime을 다시 검증하지 않았으므로 실제 사용 전 기록된 manifest 대조가 필요하다.

[최초 상태](evidence/auth-resume-decisions-2026-10-19/initial-state.json), [담당](evidence/auth-resume-decisions-2026-10-19/agents-initial.json), [이전 manifest26](evidence/auth-resume-decisions-2026-10-19/prior-manifest-check.json), [메인 대조](evidence/auth-resume-decisions-2026-10-19/root-delegate-checks.json).

## OP01–03: 수단·부족한 근거·선택 변화

| 조건 | 실제 검토할 수단 | 아직 없는 근거와 결과별 선택 |
| --- | --- | --- |
| OP01 양 hop 저장 전 query 비노출 | 현재 증거에는 해당 project/양 hop 전체에 적용할 **이름 있는 완전한 억제 기능이 없다**. tracing/drain/UI 숨김은 대체물이 아니다 | 저장 전 억제의 정확한 기능·범위·실제 설정 근거가 확보되면 기존 relay를 유지해 적용 준비. 일부 파이프라인만 제어되면 활성화 보류. 수단 미확인은 Vercel 전체 불가능의 증거가 아니다 |
| OP02 pre-app redirect·method·보안 헤더 | C2 Raw Path/Method WAF Deny, 또는 C3 Build Output의 terminal method/status/header route | 정확한 처리 순서·원문 matcher·완전한 응답 계약·일반 방문자 경로가 필요. 조기 거부와 헤더가 모두 충족될 때만 해당 수단 선택. 늦게 처리되거나 Deny 헤더가 부족하면 그 후보로는 해당308/TRACE를 해결했다고 하지 않음 |
| OP03 원 query·raw Host·실제 handler | C1 기존 literal rewrite, 조건부 A1 canonical callback의 locale/session middleware 제외와 동등한 조기 거부 경로 | literal은 capture query 주입만 해결한다. literal 진단에서도8변형이 있었으므로 전체 byte 보존 해결책이 아니다. 원문이 own-initURL 전 소실되면 전달 계층을 고쳐야 하고 parser에서 복구하지 않는다. 실제 raw Host=naeil.dev·제품303/거부 출처 근거가 없으면 relay 수용 보류 |

[상세 결정표](evidence/auth-resume-decisions-2026-10-19/relay-decisions/report.md)는 각 후보의 대상·보안 차이·검증·보존/복구를 적었다. A1도 OP01 해결책은 아니다. 새 한 지점/10건은 현재 어떤 지원 가능한 수정안을 고르게 할지 정해지지 않아 **계속 보류**한다. baseline178과 기존 suite는 반복하지 않았다.

OP01의 대안 구조 A2도 구체화했다. 별도 소유 TLS ingress와 같은 요청 경로의 Next16.1.7 relay가 canonical callback을 처리하고 일반 사이트는 Vercel upstream으로 넘기는 안이다. Vercel의 첫 hop 처리 경계를 제거하지만 **canonical ingress·relay 운영을 바꾸므로 현재 호스팅 범위 밖**이다. 둘째 hop 수집 제어, 실제 Next dispatch/raw Host, 공개443·인증서·Vercel origin·DNS 전환과 같은 query-free 복구도 미입증이다. 채택·구현·인프라 조사는 하지 않았다. 현재 범위를 유지하면 A2를 추진하지 않는다. 범위 확장 검토를 선택하더라도 그것은 운영 적용 승인이 아니다.

OP01은 health-query 저장 관측이지 실인증정보 유출 관측이 아니다. strict parser, raw Host=naeil.dev, Next16.1.7 own data-string initURL/503, path/nxtPpath 거부, 고정303/빈 fragment와 E/J/H finalizer를 보존한다. PKCE·Preview/forwarded Host·query 제거로 우회하지 않는다.

## Home: 실제 운영 변경과 적용 차단

현재 exact-name relaydock은 container `be39742b…`, image `59c4329f…`, source label `e618fa43…`이며 기존 container `88cf5550…`와 그 image `b0187528…`는 이전 버전으로 보존돼 있다. 같은 volume과 loopback2455 binding을 확인했다. 현재 container의 시작 시각은09:45 JST로 인계보다 앞선다. 이번에 발견한 차이를 인계 이후 발생한 변경이라고 단정하지 않는다. Home의 공개 주소는 `https://jay-macmini-2.tail165003.ts.net:2455` 그대로 유지한다. 외부 HTTPS를 이번에 재검사한 것은 아니다.

실제 bound DB를 mode=ro/BEGIN/metadata SELECT/ROLLBACK으로 읽었고, current image의 migration 상수와 내부 대조해 **`20261017_000000_merge_auto_monitoring`**을 확인했다. 현재 image graph head이며 기존 H 후보 graph에는 없다. 두 부모는 auto_history_index와 기존 claude_monthly_usage다. 메인이 해당 current-image migration source hash를 직접 재대조했다.

기존 exact 후보는 unknown/schema-ahead에서 startup을 거부한다. migration utility는 그 검사 전에 sentinel write-lock을 취하므로 read-only 검증용으로 실행하면 안 된다. migration 비활성화도 app-init의 schema-ahead 거부를 해결하지 않는다. downgrade/stamp/backup 복원/검사 우회는 하지 않는다.

재조정안은 **현재2.0.0-beta.2/e618 source와 image 기반을 보존해 기존 인증만 옮긴 새 후보**다. 현재 image의 지정 backend29파일이 source label과 일치했고, 메인은 그중 main/dependencies/merge revision3파일을 직접 재해시했다. 지정 source39파일도 Git blob과 대조했다. 현재 migration26개는 과거23개에 Auto/index/merge3개가 추가된 그래프이며 기존 revision 수정·삭제는 없다. 이는 지정 파일의 근거이고 전체 runtime/dependency/frontend 일치 증거는 아니다.

수정 범위는 backend5파일의 좁은 통합과 Console12파일 추가, frontend Auto/Console 공존 통합이다. Auto context/router, app-version middleware의 현재 외곽 순서, current migration/models/product 코드를 보존한다. en/ko에는 Console158키를 더하고 current147키를 보존하며 공통 변경 값 충돌은 없다. 이전 static/archive를 덮어쓰지 않고 병합한 최신 frontend를 새로 build/freeze해야 한다. [정확한 파일 범위·검증안](evidence/auth-resume-decisions-2026-10-19/home-recovery/source-compatibility.json)을 작성했으며 새 OpenSpec 범위/별도 작업공간의 구현·빌드는 아직 하지 않았다. 현재 runtime의 graceful 종료·일관된 보존·동일 정책 복구 절차도 실제 전환 전에 별도로 완성해야 한다.

[Home 결과·보존안](evidence/auth-resume-decisions-2026-10-19/home-recovery/report.md), [현재 identity·revision·정적 startup 근거](evidence/auth-resume-decisions-2026-10-19/home-recovery/metadata.json).

## 중앙 DB owner: 실제 권한은 확인, 복구 전체는 미완료

메인이 Aside의 **새 소유 탭1개**에서 같은 Supabase project/main Production을 확인하고 비공개 값이 없는 metadata SQL2개를 실행했다. 직접 postgres/current=session, effective DB owner, CREATE/USAGE, Auth 두 테이블 SELECT/UPDATE, bypass RLS, digest EXECUTE가 확인됐다. Home Console 개인 권한과 독립된 현재 Dashboard 세션의 사용 가능 근거다. Console schema는 없고 table0이므로 미래12table 소유권을 미리 통과시키지 않는다.

logging은 ddl/error, 일반 parameter=-1, error parameter=0, pgaudit none이다. 네 logging parameter의 SET 권한 검사는 false였다. DDL-only를 모든 SELECT 기록으로 오해하지 않되, 이 세션이 임의로 logging을 끌 수 있다고 가정하지 않는다. 현재 설정하의 parameterized private runner와 오류/관리-plane 비노출, 현재 자격증명의 독립 재인증·복구 보관은 아직 미확인이다. Owner 표시나 이번 SELECT 성공만으로 복구 전체를 통과시키지 않는다.

구체적 실행 선택은 현재 schema/bootstrap/recovery SQL bytes를 보존한 독립 direct PostgreSQL private runner를 준비하고, 실제 가능한 credential 공급·binding·logging/오류·receipt 경로를 확인하는 것이다. 그 경로가 별도 hosted 설정을 필요로 하면 정확한 설정 적용 단위를 먼저 완성한다. Dashboard에 실제 UUID를 붙여 넣거나 service-role/Home JWT로 대체하지 않는다. 사용자에게 키·경로·UUID를 찾아오게 하지 않는다.

[실제 안전한 metadata](evidence/auth-resume-decisions-2026-10-19/owner-access.json), [복구 실행·보관안](evidence/auth-resume-decisions-2026-10-19/owner-recovery-plan.md). 실복구·schema/Jay mutation·credential/env pull·새 로그인은 없었다. 소유 탭/bridge는 종료했고 비공개 raw DOM·로그를 저장하지 않았다.

## Estimate: loaded job에서 출발하는 제어안

현재 loaded job 자체에서 KeepAlive/RunAtLoad, exit timeout20을 확인했다. 단순 bootout/stop/remove와 TERM만으로는 무강제 종료+재기동 억제를 입증할 수 없다. [기존 정정](evidence/auth-main-preparation-2026-10-19/estimate-operations/final-application-plan/stop-policy-followup/correction.md)이 계속 우선하며 과거 종료 성공·disk plist 편집은 대체 근거가 아니다.

구체안은 loaded script path의 current를 **별도의 immutable closed-by-default gate**로 연결해 다음 KeepAlive 시작이 writer를 열지 않게 한 뒤 signal-only TERM을 쓰는 것이다. 이후에도 CLOSED를 먼저 durable commit하고 종료해 최초 전환/보호 중단을 같은 구조로 다룬다. job은 loaded/parked로 남으며 bootout하지 않는다. 별도 control state, 직렬 admission/exec, 정확한 경로·artifact·설정 검증이 필요하고, 오류 시 password-only로 되돌아가지 않는다.

현재 predecessor의 **경로 정적 감사는 완료**했다. 정확한 manifest에 code/JSON1570개·내부 symlink84개·원 source14개가 일치하고, Node24.21.0 기본 realpath→Next dir/dist/static→동적 chunk 경로가 보존된 immutable release를 가리킨다. current를 다시 따라 읽는 serving/config/data 경로 반례는 없었다. 메인은 manifest와 핵심15파일 hash, server/Next/chunk 경로 연결을 직접 대조했다. [정적 감사](evidence/auth-resume-decisions-2026-10-19/estimate-stop/path-audit.json)는 이 predecessor·현재 launch flags·구버전 파일 보존에 한정되며, 실제 링크 교체나 process-memory 검증은 아니다. source/flags/manifest/current target이 달라지면 해당 근거를 다시 판단한다.

남은 것은 gate 구현과 전용 Node의 실제 exec/lock/재시작 검증, 비공개 보존·실행 단위다. 이것은 **기존 세 환경변수 추가안보다 넓은 새 제어 설계**이며 구현·사용 승인은 없다. 경로 감사 완료를 전체 종료 절차의 실행 가능 증거로 확대하지 않는다. [제어안·처음/이후 종료·보존/복구](evidence/auth-resume-decisions-2026-10-19/estimate-stop/report.md), [loaded metadata](evidence/auth-resume-decisions-2026-10-19/estimate-stop/metadata.json).

## 공통 보존과 다음 적용 순서

제안 보관은 `/Users/jaymini/.local/share/naeil-auth-preservation/<새 승인 operation-id>`, uid501·directory0700/file0600이다. root는 아직 없고 live capture도 하지 않았다. 전환 직전에 writer와 모든 data/main/**모든 backup**/기존 auth·개인 auth/config·plist·link·exact runtime을 새로 보존하고, 정상 종료 후 마지막 write/자연 lock 해제를 다시 대조한다. 변경 중인 copy를 일관된 backup으로 인정하지 않는다. private manifest/receipt는 앱 로그인 없이 복구 담당이 접근할 수 있어야 한다. 같은 Mac 보존과 외부 재해복구를 구분하고 자동 정리·삭제·backup 복원은 하지 않는다.

다음은 현재 조건별 최소 재개 사항이다.

1. 현재 호스팅에서 OP01의 구체적 억제 수단과 OP02/03 전달·응답 제어를 확정하거나, A2 같은 **별도 범위 결정**을 한다. 공급자 문의·사람 답변 대기·observer 자동 추가는 없다.
2. 구체화한 Home 현재 source/migration 보존·인증 이식안과 Estimate closed gate 제어안을 각각 결정한다. 중앙 private runner·독립 재인증/보관 수단은 아직 실제 사용 가능한 경로까지 확정되지 않았다. 이미 가능한 읽기 전용 준비에는 재승인을 요구하지 않되, 새 구현/설계 변경은 기존 인계 권한으로 실행하지 않는다.
3. 그 선택에 고정된 정직한 clean/committed Production artifact와 정확한 설정·보존/복구가 완성되면 **각 적용만** 승인받는다. S는 아직 wildcard, literal은 scratch/Preview다. 현재 blanket 운영 승인을 요청할 단계가 아니다.
4. 승인 후 relay canonical 검증→schema→기존 Jay 등록→Home 개인 관리자→Estimate 실제 연결→별도 verified→Estimate만의 전체 허용집합 명시 grant→실계정 HTTPS 수용 순서를 유지한다. exact artifact의 실제 로컬 Auth/DB 허용경로와 실제 configured connection의 유효하지만 미허용인 개인 JWT403을 분리해 순환 조건을 만들지 않는다.
5. Estimate 수용 뒤 Jev·새 초대로 확장한다. 기본 Supabase 메일과 새 Home SMTP 초대는 별개이고, 새 초대 준비는 기존 Jay 준비를 막지 않는다. 최종 수용은 실제 artifact/계정/HTTPS의 로그인·초대·401/403/503·회수/장애 logout·계정 전환·저장 보호·언어·재시작이다.

Jay 단일 초기 관리자·기존 Google/UUID·의향은 재질문하지 않는다. 중앙 정책 뒤 password-only rollback은 금지하고 참조 앱/진행 중 시도가 없어질 때까지 relay를 유지한다. 사이트/Jev ko/ja/en·Estimate ja, 자동 SSO·전역 logout·언어 동기화·견적 번역 금지를 유지한다.

## 담당·검증 한계

native `home_recovery`, `estimate_stop`, `relay_decisions`를 gpt-6.1-sol/high로 요청해 각각 소유 evidence 하위 폴더만 맡겼다. 메인이 보고서·query·원 근거를 읽고 source/manifest hash를 직접 대조했으며 중앙 browser metadata는 직접 수행했다. 모델 내부 serving identity는 별도 attestation이 아니다. 새 suite·provider·메일·HTTPS/probe는 실행하지 않았다. 기존 Estimate 전체 browser365 미재실행, Home backend4/type72 및 E/J segmented/Home synthetic ASGI 한계는 소급 종료하지 않는다.

세 위임 작업과 Home/Estimate 추가 근거의 [좁은 교차 검토](evidence/auth-resume-decisions-2026-10-19/integration-review.md)를 완료했다. 최종 지정5cwd 조회도 현 Paseo 메인만 running·나머지6명 idle·terminal0이었고 native 세 담당은 completed였다. 범위 밖/과거 native 담당 상태는 여전히 미확인이다. [최종 검증 영수증](evidence/auth-resume-decisions-2026-10-19/final-verification.json)과 [새 산출물 manifest](evidence/auth-resume-decisions-2026-10-19/manifest.json)는 문서·상태·hash 검증이며 운영 수용 증거가 아니다.

이번 문서·안전 evidence 및 STATUS의 최신 연결만 갱신한다. 원 증거·manifest·dirty 제품 구현·현 운영 data/설정/서비스는 보존한다.
