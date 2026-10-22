# 인증 통합 메인 재개 — 2026-10-18 저녁

[인계](auth-main-handoff-2026-10-18-evening.md)를 전체 읽고 실제 상태·명세·코드를 대조했다. 이번 범위는 읽기 전용 재조회, OP-01–03 재검토, 작은 격리 변환 실험, 운영 적용 단위 구체화다. **제품 코드·운영 설정·계정·권한·메일·프로세스·배포는 변경하지 않았다.** 추가 공급자 문의는 하지 않았으며 사람 답변 대기가 아니다. 아래 수정/정책 후보는 미선정·미적용이다.

## 현재 상태와 담당

19:00–19:03 JST 관측. [새 상태 영수증](evidence/auth-main-resumption-2026-10-18/state-observation.json), [이전 증거 대조](evidence/auth-main-resumption-2026-10-18/manifest-check.json).

- shared/S/E/J/H HEAD는 각각 `9f83816`, `02aa72e`, `860e79b`, `2fc435a`, `e142297`로 인계와 같다. S/E/J/H의 기존 dirty 구현을 보존했다. 원본7개 worktree HEAD/status도 일치하며 terrific-buffalo의 source-log/mockup을 그대로 두었다. 조회11개 경로의 `git diff --check`는0이다.
- 세 공개 UI identity는 모두 기존 source/artifact 및 UI0.7.1/contract1과 일치한다. Home pinned container의 운영 소스455/455개가 일치하고 identityStable=true다. Estimate current 링크도 기존 `8c3e0430293d-82280965179e`다. 로그인·writer·데이터 보존의 신규 검증을 뜻하지 않는다.
- 보존 archive/receipt/spec13개는 이번에 전체 SHA256을 다시 계산해 일치했다. 문의/사전검증/exact-return manifest의18/112/150개 파일과 relatedFiles3/4/83개도 일치했다. 기존 manifest를 수정하지 않았다.
- exact-return8개와 durable4개 container는 정확한 ID/name/start/status를 조회했으며 기존 exited 상태다. protected553xx4개는 기존 running 상태다. 지정15포트 조회에서는55321/55322만 listening이었다. fixture ownership을 승계해 조작하지 않았고 volume 내용/전체 process 범위는 재검증하지 않았다.
- 위 다섯 cwd의 Paseo 조회에는 새 메인 `279e0cfe-67dc-471a-af4d-1bd40bddc9dd`만 running, 이전 메인과 다른6명은 idle, S/E/J/H별 에이전트는0이었다. native 목록은 위임 전 root만 running이었다. 이후 `relay_review`, `operations_review`를 `gpt-6.1-sol/high`로 위임했다. 두 담당은 제품 편집 권한 없이 조사했고 메인은 결과·소스·격리 실험을 직접 검토했다. 모델/도구 제한은 관측되지 않았으나 serving model identity를 별도 인증한 것은 아니다. 관측 범위 밖 세션의 무작업은 보장하지 않는다.
- 비공개 계정 검토표는 존재/0600만 재확인했다. 기존 UUID 확인은 유효한 선행 근거로 유지하고 값을 대화/Git로 복사하지 않았다. 이번에 실계정이나 현재 앱 세션을 재조회한 것은 아니다.

## OP-01: 사실, 위험, 재검토할 조건

현재 확정된 사실은 **기존 production health 요청의 무해한 query가 Request Logs Search Params에 표시된 것**이다. 실제 인증 code/nonce/token 유출 관측은 아니다. 미배포 relay의 로그나 두 번째 service hop의 로그, 모든 내부 저장소의 보관기간은 아직 확인하지 않았다. 조용한 stdout·trace sampling0·drain 없음·no-store/no-referrer로 이 공백을 메울 수 없다.

정상 성공 query는 일회용 code와 nonce다. PKCE verifier·access/refresh token·개인 세션은 서비스에 남고, 최종 서비스가 cookie binding/nonce/교환/현재 권한을 검증한다. 따라서 로그의 code만으로 곧바로 토큰을 교환할 수 있다는 결론은 틀리다. 반대로 PKCE만으로 로그 저장을 무조건 허용할 수도 없다. 로그 열람자는 로그인 활동을 연결할 수 있고, 다른 세션/verifier 침해와 결합될 수 있다. 피해 브라우저를 bound callback으로 유도할 수 있는 공격 조건에서는 시도 소모/방해도 검토해야 한다. 특히 Home stale A→B 소모는 기존 제한이다. provider 오류 설명이나 임의 입력은 앱에서 고정 오류로 바꾸기 **전에** 플랫폼에 도달하므로 정상 code/nonce만의 로그라고 단정하지 않는다.

보관·접근 근거는 다음 수준이다.

| 근거 | 알 수 있는 것 | 아직 알 수 없는 것 |
| --- | --- | --- |
| [보존 Runtime Logs 문서](evidence/vercel-auth-preflight-2026-10-18/platform-source/logs-runtime.md)의 Search Params/Log sharing/Limits | 팀 구성원과 로그 링크 공유 가능; Hobby 관측 창1시간, Pro1일; 업그레이드 시 과거1일 조회 가능하다고 명시 | Hobby1시간 뒤 모든 내부 사본이 삭제된다는 보장 아님. 현재 실제 팀원/토큰/integration별 접근 권한은 미확인 |
| 실제 프로젝트 관측 Hobby, drain0, tracing rule0 | 당시 표시된 요금제·설정·로그인된 관리 세션의 열람 가능 | 플랫폼 내부 접근/보관·다른 exporter·서비스 hop 로그의 부재를 보장하지 않음 |
| [Log Drains 문서](evidence/vercel-auth-preflight-2026-10-18/platform-source/logs-reference.md)의 `proxy.path` | 내보낸 경로가 query를 포함할 수 있음 | drain을 끄는 것이 앞선 플랫폼 저장을 막는다는 근거 없음 |

원래 명세53행의 **양 hop app/tracing/ingress/platform query 비노출**은 그대로다. 다음 세 방향을 구분한다.

1. **원래 조건 유지:** 현재 호스팅 경로에서 충족 근거가 없으므로 활성화 보류를 유지한다. 추가 문의를 재개하거나 부재 증명을 기다리는 작업으로 바꾸지 않는다.
2. **구조를 유지하는 명시적 정책 재검토 후보:** 정상 code/nonce 등 플랫폼 request metadata의 제한적 보존을 허용할지 별도 결정한다. 허용 대상 로그/필드, 팀·토큰·integration 접근자, 조회/내보내기/보관 범위, provider 오류 및 비정상 query, 두 service hop의 통제를 명시해야 한다. 앱이 token/verifier/cookie/전체 URL을 기록하지 않는 조건은 유지한다. Hobby1시간을 물리 삭제 보장으로 쓰지 않고 알려지지 않은 공급자 내부 보관의 잔여 위험을 드러낸다. **승인되거나 기존 명세를 대체한 정책이 아니다.** 이것을 택하더라도 OP-02/03과 실HTTPS 검증은 남는다.
3. **전송 구조 재검토:** 저장 전 query를 없애려면 최초 ingress에 도착하는 요청 자체를 바꿔야 한다. 받은 뒤 rewrite/redaction은 충분하지 않다. fragment-only·정적 타origin callback·form_post는 현재 계약과 동등한 검증된 해결안이 아니다. 새 구조는 provider 성공/오류의 정확한 시도 상관관계와 PKCE/cookie binding을 다시 명세·검토해야 하며 자동 구현하지 않는다.

가장 작은 후속 검토는2의 구체적 위험 수용 여부를 판단할 수 있도록 실제 접근·보관 범위를 정리하는 것이다. 이는 정책 변경 선택이나 운영 적용 승인 요청을 대신하지 않는다. 이번 자료만으로 보안 조건 충족/면제를 선언하지 않는다.

## OP-02/03: 최소 수정·검증안

| 항목 | 이미 확인된 문제 | 최소 후보·통과 기준 |
| --- | --- | --- |
| OP-02 | Next 앱 이전 중복 slash/backslash가 query-bearing308을 생성. 직접 function TRACE405는 별도 dispatch TRACE500을 해소하지 않음 | protected namespace의 Raw Path/Method 기반 ingress Deny 후보. 기존 기록의 malformed path·TRACE를 HTTP/1.1/2에서 보내 redirect를 따르지 않고 status/Location/Refresh/cache/security headers/request ID를 비교. 라우트/앱 middleware 이후 거부는 해결로 인정하지 않음. WAF denial header 설정 가능성과 WAF 자체 logging도 별도 검증 |
| OP-03 | cached builder wildcard rewrite가 `?path=$1`을 생성. 그것을 function 입력에 넣으면 strict parser가 canonical failure로 닫힘 | `/auth/return/jev`, `/abestimate`, `/console`의 세 literal rewrite로 capture 자체 제거. 사용자 `path`/`nxtPpath`를 제거·허용하지 않음. 완전한 build에서 emitted destination/query/header·middleware 순서 확인 후 실제 CDN→middleware→function 원문 입력 검증 |

### 이번에 추가한 좁은 실험

[격리 변환 결과](evidence/auth-main-resumption-2026-10-18/literal-rewrite-probe/result.json), [실행/실패 기록](evidence/auth-main-resumption-2026-10-18/literal-rewrite-probe/execution.json), [하네스](evidence/auth-main-resumption-2026-10-18/literal-rewrite-probe/probe.cjs)를 보존했다. cached `@vercel/next4.16.1`의 동일 bundled `convertRewrites`를 Node24.21.0으로 실행했다. 원 wildcard는 `/api/internal/service-return?path=$1`, 세 literal은 모두 query 없는 `/api/internal/service-return`을 반환했다. OS network 금지·새 scratch만 쓰기 허용·VM 빈 env/`url`만 require한 범위다. 첫 sandbox 경로 `/var`→`/private/var` 보고서 쓰기 실패는 보존하고 새 경로 실행 exit0과 구분한다.

메인이 하네스·builder936행 이후 원문·입출력·sandbox·해시를 직접 확인했다. 전체 builder/build/라우팅/handler는 실행하지 않았다. 후속 regex 치환·rewritten header·실제 request query 병합·Host/initURL은 검증하지 않았다. 따라서 **OP-03의 작은 수정 후보를 뒷받침한 증거이며 hosted 문제 해결이나 배포 artifact가 아니다.** 제품 `next.config.ts`는 그대로다.

후속 로컬 수정 범위는 `next.config.ts`와 그 routing 회귀만이다. parser/adapter의 raw Host=`naeil.dev`, own initURL descriptor, Next16.1.7 pin/503, 원문 query 엄격 검사, 고정303/빈`#`, 넓은 alias 거부, E/J/H finalizer는 유지한다. 새 source identity로 완전한 산출물을 만들고 변경된 routing 회귀만 우선 실행한다. 원본 동결 후보를 수정하지 않는다.

실제 hosting 검사에는 별도 synthetic-only diagnostic artifact가 필요하다. 정상 Preview는 제품 Host403을 확인할 뿐 성공303 증거가 아니다. 진단 응답은 descriptor 유무/type, Host 개수/분류, 합성 입력 길이/hash/equality만 허용하고 원문 URL/header echo·실code/provider 호출·redirect following은 제외한다. 실제 builder/runtime/Node24/Fluid 및 public Auth fingerprint를 확정해 clean Build Output과 정확한 요청 vector/수를 동결한 후에만 배포 승인안을 제시한다. 최종 성공303은 별도 승인된 canonical `naeil.dev` 전달에서 확인해야 한다. Preview Host 허용이나 forwarded Host 신뢰로 제품 경계를 넓히지 않는다.

## 독립 운영 준비·승인 단위

이 표는 적용 준비다. 현재값은 이전 읽기 전용 관측이며 **실행 직전에 같은 프로젝트/branch/role·행·writer를 새로 확인**한다. 운영 계정값·비밀을 이 문서에 삽입하지 않는다.

| 단위 | 정확한 변경 후보와 사전/사후조건 | 보존·중단·복구 |
| --- | --- | --- |
| schema001–004 | `dathsxdsaxooifnxjket/main Production`; 기존 [SQL 후보](evidence/auth-transition-preparation-2026-10-18/hosted-schema-apply-candidate.sql) SHA256 `4f8eb80ec90c0b2f7fa9339f3e29bca9274257c8513d2276d8639e94be13ac73`. 객체 부재/owner/의존성 재확인 후 단일 transaction. 사후12table/35function/6SELECT policy/1trigger/서비스2행 active+unverified, 회원·관리자·grant0 대조 | statement10초/lock2초/idle30초. 실패는 transaction 취소, commit 불명은 catalog 조회 후 판단. reset/DROP/일괄 재실행 금지. 네 embedded migration bytes는 독립 대조 일치. wrapper 자체 DB 실행은 아직 없음 |
| signup | 같은 프로젝트 `Allow new users to sign up` ON→OFF만. Email/Google/GitHub와 기존 Site URL/callback3개 유지. ESG/Work 최초 가입도 차단됨을 적용 결정에 포함. 기존 로그인·관리 초대 경로의 실검증 필요 | 다른 provider/identity를 변경하지 않음. 재개방도 정책 변경이므로 자동 rollback하지 않음 |
| 사이트 비밀 | Vercel `naeils-projects/design-system` Production 서버 전용 `NAEIL_INVITE_CONFIG_JSON`; `siteOrigin`, `supabaseUrl`, `anonKey`, `serviceRoleKey`, `transactionStore:"supabase"`, 별도32byte `encryptionKey`. 파일 설정과 동시 공급 금지 | 값 전달/보관 담당·복구 저장 위치와 등록 영수증을 적용 전에 확정. 모든 instance/호환 복구 artifact에서 동일 키 보존. `NEXT_PUBLIC_*`·Git·로그·bundle 유입 금지. 미공급/오류는503 |
| Home 설정/SMTP |2455 유지. `console_supabase_url`, `console_supabase_anon_key`, `console_origin`, `console_invitation_config_file`. 외부0600/runtime UID 소유/단일 link/부모 포함 symlink 없음인 파일. JSON은 `siteOrigin`, `serviceRoleKey`, `smtp.{host,port,tlsMode,username,password,fromEmail}` | 실제 host/container mount 경로·sender/domain/provider·SMTP endpoint/TLS·승인 수신함/횟수 미확정. `ssl`/`starttls` 인증서 검증 유지. Supabase custom SMTP만 바꿔서는 Home 직접 전송이 준비되지 않음. 기존 Home 인증·data/config 보존 |
| 실메일 | Home `generate_link`와 직접 SMTP를 구분. 승인된 한정 수신함/횟수로 실제 도착·수락 확인 | DATA250은 inbox 도착 증거 아님. timeout/응답 불명은 unknown 유지, 자동 재발송 금지. 재발송은 명시적 새 version |
| Jay bootstrap | 비공개 검토표의 기존 UUID만 owner transaction으로 active member/sole initial admin에 등록하는 안. 새 Auth 계정/identity 없음. 현재 대상 identity, 관리자/회원/권한 충돌 부재를 먼저 확인하고 둘 중 한 insert라도 실패하면 전체 취소. 서비스 grant는 이 단계에 넣지 않음 | `ON CONFLICT UPDATE`로 blocked/기존 admin을 덮어쓰지 않음. unknown commit은 읽기 전용 재조회. 정확한 guarded SQL·운영 owner 복구 수단의 검토/격리 검증은 아직 남음. 정상 앱 service-role을 owner bootstrap 권한으로 오인하지 않음 |
| 서비스 연결/grant | `jev`/`jev.naeil.dev`, `abestimate`/`abestimate.naeil.dev` 각각 실제 artifact의 개인 JWT/고정 service ID 권한 집행 증거로만 verified 설정. 이후 Jay의 명시 grant. `console_set_access`는 전체 허용 집합 교체이므로 현재 version+새 operation ID+의도한 전체 set을 고정 | unverified grant 차단 trigger 우회 금지. 두 서비스 순차 적용 시 두 번째 set에서 첫 허용을 누락하지 않음. 일반 관리 RPC는 Jay 개인 admin JWT. 불명 응답은 동일 operation/body 조회·재시도, 감사 기록 보존 |
| 서비스 전환 | [최신 S/E/J/H 후보](exact-callback-return-2026-10-18.md#동결-산출물) 사용. S standalone은 Vercel 배포본 아님. Home은 현 base+narrow overlay 유지. 한 서비스씩 직전 writer/모든 data·backup/auth/config·artifact/source map 확인 | graceful stop/자연 lock 해제/단일 writer만. 옛 PID/helper 승인·강제 kill·lock 삭제·backup 복원 금지. central enforcement 이후 password-only 복구 금지. 호환 검증 artifact/전진 수정이 없으면 보호 경로 중단 |

schema 적용과 Jay 등록, service verified와 grant는 각각 다른 작업이다. 실제 적용 approval은 대상/전후값/산출물·보존·복구가 완성된 단위로만 확인한다. 지금은 빈 SMTP·비밀 공급·bootstrap 복구안을 추정으로 채워 일괄 승인을 요청하지 않는다.

## 다음 우선순위와 완료 경계

1. OP-03 literal rewrite 후보의 완전한 격리 build/routing 검증을 준비하고 OP-01 정책 재검토 자료·OP-02 실제 ingress 검증안을 병행한다. 기존 suite를 반복해 platform 근거로 삼지 않는다.
2. 실제 접근/보관 범위와 secret 공급/SMTP/Jay guarded bootstrap·연결/grant/호환 복구안을 구체화한다. 공급자 문의 재개나 계정 UUID/Home 주소 재확인은 할 일이 아니다.
3. 대상별 승인 뒤 schema/설정·relay를 먼저 검증하고 Home/소비 앱을 한 서비스씩 전환한다. relay는 참조 앱과 진행 중 시도가 없어질 때까지 유지한다. 직전 writer·데이터·backup·auth 보존 조회는 이번 인계 확인으로 대체하지 않는다.
4. 실제 artifact·승인된 실계정·HTTPS에서 로그인/초대,401·403·503,권한 회수/장애 logout,계정 전환·저장 보호·언어·재시작이 확인되어야 운영 완료다. 사이트/Jev ko/ja/en, Estimate ja를 유지한다. 자동 SSO·전역 logout·언어 동기화·견적 번역은 추가하지 않는다.

구현·로컬 검증의 기존 완료 범위는 [exact-return 결과](exact-callback-return-2026-10-18.md)를 유지한다. 이번에 배포·실provider·실메일·실HTTPS 검증이 추가된 것은 없다. Estimate 전체 browser365 재실행 없음, Home 광역 backend4실패/type72진단, E/J segmented 통합 및 Home synthetic ASGI 한계도 그대로다. 현 메인은 이후 계획·분할·통합·최종 검증을 이어받는다.
