# 인증 운영 전환 준비 — 2026-10-18

이 문서는 [이전 인계](account-language-handoff-2026-10-18.md) 이후의 로컬 작업을 기록한다. 현재 호스팅과 운영 UI0.7.1은 유지한다. 실제 회원·권한 등록, 실메일, hosted 설정, push/merge/배포, DNS/tunnel 변경은 수행하지 않았다. [운영 전환 순서와 복구 조건](account-language-transition-2026-10-17.md)은 계속 적용된다.

> 후속 최신 결과: 사용자의 “계속 해서 진행해줘”에 따라 고정 return 경로를 로컬 구현·검증했다. [callback 구현·통합 결과](exact-callback-return-2026-10-18.md)의 새 산출물과 범위를 우선한다. 아래 설계 선택 전 기록과 과거 artifact는 당시 근거로 보존한다. 실제 Vercel/ingress/logging·실계정 HTTPS 조건은 남아 있으며 운영 적용은 미실시다.

## 현재 결과

- 사이트: Supabase 영속 초대 transaction과 서버 전용 JSON 설정 후보의 구현·로컬 검증을 완료했다. SQL001–003의 수락 권한은 유지하고 SQL004를 추가했다. 동일 브라우저 재전송 복구·checkpoint 응답 지연 중 만료·응답/cookie 유실 보완 후 독립 리뷰의 P1과 P2 세 건을 닫았다. 가상 설정 standalone을 동결하고 실제 HTTP·재시작·브라우저 검증을 통과했다. 별도의 실제 공개 설정 빌드는 아래의 무결성·기본 익명 HTTP 범위만 확인했다. 운영 적용은 미실시다.
- Home: 운영 backend/script overlay 및 frontend 차이를 Console 후보와 조정했다. 운영 이미지에 허용한 소스18개와 정적 파일34개만 추가하는 로컬 이미지를 만들었다. 기존 bundle을 보존했다. 현재 운영 코드455개는 변경하지 않았다.
- Estimate/Jev: nonce query와 hosted callback allowlist 불일치를 발견해 정적 callback 세 개 추가안을 보류했다. 이후 승인된 고정 return 경로를 Home과 함께 구현하고 새 후보 및 로컬 통합 결과를 위 후속 문서에 기록했다. 실제 hosting/로그/HTTPS 조건이 남아 있으므로 운영 전환 준비 완료로 취급하지 않는다.
- Jay: 사용자가 지정한 이메일과 일치하는 기존 Auth 사용자1명 및 이메일 확인된 Google identity를 읽기 전용으로 확인했다. 실제 UUID는 Git 밖 `/Users/jaymini/.local/share/naeil-auth-rollout/2026-10-18/operator-review.json`(0600)에 기록했다. 새 Auth 계정은 필요하지 않다. 이 조회는 현재 사용자의 앱 세션을 검증하거나 회원/관리자/서비스 권한을 적용한 것이 아니다. Google 및 Jev·AB Estimate 모두 허용하는 의향은 확인됐으며 실제 적용 승인은 남아 있다.

## 초대 지속성과 보안 계약

자세한 설계는 [durable invitation design](../superpowers/specs/2026-10-18-durable-invitation-design.md), Home SSOT는 `/Users/jaymini/.paseo/worktrees/3qtenke4/naeil-home-account-language/openspec/changes/durable-invitation-state/`다.

호스트 전용 무작위 cookie는 DB에 SHA256으로만 식별하며, proof/CSRF/검증 후보/JWT는 별도32바이트 키의 AES-256-GCM으로 암호화한다. 서버 전용 RPC, RLS, 직접 table 권한 회수,10분 절대 만료,30초 lease, revision/fence로 프로세스 간 처리를 직렬화한다. Vercel은 영속 설정이 없으면503이며 메모리 저장으로 대체하지 않는다. 기존0600 파일은 로컬 호환 경로로 남긴다.

OTP를 호출하기 전에 `verifying`를 저장하고, 응답을 받으면 candidate→verified→recorded→complete를 checkpoint한다. 후보/JWT가 저장된 실패는 새 프로세스에서 같은 증명으로 재개한다. OTP는 소비됐지만 응답 또는 candidate 저장 결과를 복구할 수 없는 경우는 `uncertain`이다. 자동 재검증이나 자동 메일 재전송을 하지 않고 관리자에게 명시적 재전송을 요청한다. ko/ja/en에서 별도 안내를 표시한다. 일반 OAuth/기존 로그인은 초대 수락 권한이 아니다.

동일 초대 ID의 높은 version으로 명시적 재전송을 받은 경우 새 transaction/cookie/CSRF로 분리하고 이전 행을 변경하지 않는다. 오래된 탭과 증명은 새 transaction을 승인하지 못한다. 새 create 또는 cookie 응답이 유실돼도 브라우저에 새 envelope를 보존하고 상태 확인 → 명시적 재준비 → 별도 수락 순서를 유지한다. 서로 다른 초대 ID 교체는 이번 범위에 추가하지 않았다. OTP와 DB는 하나의 원자적 트랜잭션이 아니며, 불확실한 OTP 소비는 자동 복구 성공으로 처리하지 않는다.

키는 모든 인스턴스와 인증을 유지하는 복구 후보에서 동일해야 한다. 키 회전/분실은 진행 중 초대를 복구 불가로 만들 수 있으므로 별도 계획이 필요하다. 만료는 DB에서 즉시 집행하지만 물리 행 삭제는 접근/새 생성 때 수행한다. 주기적인 정리 작업이 이미 운영된다고 주장하지 않는다.

## Home 조정과 산출물

`status_reading/repository.py`, toast/accounts 동작은 동결한 운영 소스와 일치시켰다. ko/en에는 누락된 `subscriptions.batchTitle`만 더하고 Console 문구를 유지했다. settings 생성기의 다섯 GitHub URL은 이미 바뀐 정식 `naeil-dev/naeil-home/`를 유지했다. Home 프레임 전체 이전이나 옛 인증 branch 전체 배포는 포함하지 않는다.

| 대상 | 로컬 후보와 근거 | 운영 준비 상태 |
| --- | --- | --- |
| Home 이미지 | `sha256:7401d764d020e94d43e3fd797171392b002ae85214924ac6f3d22e4184524383` | 패키징/격리 smoke 완료, 미배포 |
| Home archive | `/private/tmp/naeil-home-runtime-candidate-20261018-1l8088sn/home-console-reconciled-image.tar.gz`, SHA256 `867911053af5e2f0e8a1de2fd8adc5ac22cf9179a9597c6ed81a267dd2488311` | `productionReady:false` |
| 사이트 가상 설정 standalone | `durable-invite-runtime-20261018-5bdb4e9f0025-8ef76091`; `/private/tmp/naeil-site-durable-runtime-20261018-fudupnl5/standalone.tar.gz`, SHA256 `30cc77f1b51d559a90bb31311d74da4b72aef071f2e71fb5751616cd43ee0d12` | 동결·HTTP/브라우저/재시작 검증 완료, `productionReady:false`; 로컬 가상 설정 전용 |
| 사이트 실제 공개 설정 standalone | `public-auth-candidate-20261018-5bdb4e9f0025-5a6f6552`; `/private/tmp/naeil-site-public-auth-candidate-ezl7049b/standalone.tar.gz`, SHA256 `d563360f94f1d94bd16d5ebd38f68238e207075cb727dec4e89b3f2ad6f31e78` | 빌드·동결·메인 독립 무결성 및 기본 익명 HTTP14대상 확인. 인증/브라우저 미검증, Vercel 배포 artifact 아님, `productionReady:false` |
| Estimate | `72e22fc74bcc-4ceff0a23fa2`, artifact hash `45d0c6c51499477e98517f64fc67b6c1c635eafa4677436f1e5db690bd6a16d3` | 기존 [통합 영수증](evidence/account-language-integration-2026-10-17/summary.json) 유지 |
| Jev | `jev-ui07-2b3a31140e12`, archive SHA256 `61916868ce188b33778036d8a99b859332c5267f8df09e9891d139e576b8a86c` | 기존 통합 영수증 유지 |

Home 전체 소스/패키징/테스트 기록은 `openspec/changes/reconcile-home-production-source/verification.md`와 같은 change의 `evidence/runtime-{inputs,artifact,smoke}.json`을 따른다. 메인이 archive37개 레이어의 digest를 직접 계산하고 정확한 운영 base36개+허용 overlay1개, 최종469개 파일,52개 overlay 파일,53개 context 파일을 확인했다. [독립 확인](evidence/auth-transition-preparation-2026-10-18/home-runtime-independent.json).

사이트 최종 [영수증](evidence/auth-transition-preparation-2026-10-18/site-runtime-receipt.json)과 [무결성 결과](evidence/auth-transition-preparation-2026-10-18/site-runtime-integrity.json)는 runtime2726파일·내부 링크29개·archive·source218개를 대조한다. source mapping SHA256은 `5bdb4e9f00255766eefdccd9fa82fc9c3e2d774947ef309db1f54b19a2195e76`이다. 미커밋 소스이므로 공개 `sourceRevision`은 `development`이며 base HEAD를 실제 빌드 revision으로 가장하지 않는다. 공개 Auth 설정은 `http://127.0.0.1:55431`/`fixture-anon`인 가상 로컬 값이다. 기존 동결 artifact는 모두 보존했다.

후속 실제 공개 설정 빌드는 같은218개 source와 같은 source archive를 사용했다. 공개 사이트 script의 유일한 project/publishable-key 결합과 새 compiled key fingerprint를 메인이 독립 대조했고, runtime3203파일·내부 링크23개·압축본·inventory가 일치했다. [직접 실행 결과](evidence/auth-transition-preparation-2026-10-18/site-public-auth-independent.json)와 [검증 명령](evidence/auth-transition-preparation-2026-10-18/verify-public-auth-candidate.py)을 남겼다. 원본 두 동결 root와 영수증도 그대로다. 키 원문은 로그·영수증에 기록하지 않았다.

새 빌드는 `next build --webpack`으로 실행했다. OS에서 모든 network를 금지하고 기존 동결 폰트6개의 정확한 bytes를 offline response로 공급했다. font-face 의미와 bytes를 대조했지만 Google CSS 응답 원문 동일성은 증명하지 않는다. 이전 Turbopack 빌드와 compiler가 다르며, 이전17개 HTTP/12개 browser 결과를 새 후보의 실행 근거로 재사용하지 않는다. private 초대 설정·실제 OAuth·SMTP·운영 HTTPS는 이 빌드에서 검증하지 않았다.

후속 [기본 HTTP 결과](evidence/auth-transition-preparation-2026-10-18/site-public-auth-http-smoke.json)는 새 임시 clone에서 익명 로그인3개 언어200, private 설정 없는 초대 두 경로503, binding 없는 callback3개307, identity와 실제 연결 정적 자산5개를 확인했다(중복 제외14대상). OS는 정확한 loopback listener의 bind/inbound만 허용하고 outbound 예외는 없었으며, 최종 runtime Node guard 이벤트는0이었다. 앞선 격리 하네스의 DNS/origin 가정 실패 및 core9개 통과 후 직접 HTML font-link 탐색 실패를 보존하고, 정적 자산만 별도 보완했다. 이를 한 번의 전체 suite 통과로 바꾸어 표현하지 않는다. 소유 서버는 새 ownership 확인 후 SIGTERM/exit0으로 종료했고, [메인 확인](evidence/auth-transition-preparation-2026-10-18/site-public-auth-smoke-independent.json)에서 source218·현재/이전 archive·clone hash와 종료를 대조했다. 실제 Auth/초대 transaction/DB/메일/브라우저 검증은 없다.

이 smoke에서 canonical `/auth/invite`503의 `Vary`에는 Cookie가 없고 slash alias에는 있었다. 양쪽 모두 no-store/no-referrer이며 응답에 cookie/token/transaction이 없었지만 전체 header parity를 검증했다고 주장하지 않는다. 실제 설정을 공급한 후보와 ingress 검증에서 이 차이를 재확인해야 한다.

## 검증 증거와 한계

새 fixture는 `/private/tmp/naeil-auth-durable-20261018/fixture-home`, project `naeil-auth-durable-20261018`, loopback55521/55522다. 메인이 단독으로 DB mutation과 프로세스 수명을 담당했다. 기존553xx 및 보존554xx volume은 별개다.

- SQL004 추가 전 RED를 확인했고, 추가 후 실제 pgTAP317개, 기존 경쟁 검증24개와 신규 별도 프로세스 경쟁 검증7개를 통과했다.
- 사이트 suite310개 통과, 기존 opt-in compiled-build5개 skip. TypeScript·변경 파일 ESLint·신규 Python harness 검사·OpenSpec strict 검증을 통과했다. [상세 검증](../superpowers/verification/2026-10-18-durable-invitation-local.md).
- 실제 로컬 GoTrue/PostgREST/DB와 매 요청 새 Node 프로세스로 최종17개 초대 흐름을 통과했다. `/user`·receipt·acceptance 응답 유실, candidate 저장 전후 실패, 실제 OTP 응답 유실, 동시 수락, 취소·재전송·만료, 오래된 JWT와 fresh receipt 분리, 권한 회수 뒤 acceptance replay를 포함한다. 같은 브라우저의 uncertain/staged/invalid→재전송v2와 오래된 행/탭 격리, verifying 응답이 만료를 넘긴 뒤 OTP 호출0도 확인했다.
- 최종 동결 standalone의 실제 HTTP에서도 같은17개 시나리오 assertion을 통과했다. HTTP88요청과 소유 프로세스의 정상 재시작1회를 검증했다. 이 실행을 매 요청 새 프로세스 검증으로 세지 않는다. ko/ja/en ×390/1440 ×light/dark의 실제 브라우저12경우에서 반환된 script, uncertain 안내, 숨긴 confirm, fragment 부재, CSP/no-store, 외부 요청/POST/runtime 오류/가로 overflow0을 확인했다. [HTTP·브라우저 영수증](evidence/auth-transition-preparation-2026-10-18/site-artifact-http-browser.json), [스크린샷 위치·해시](evidence/auth-transition-preparation-2026-10-18/browser-screenshots.json). 메인은 ko1440light와 ja390dark를 직접 확인했다.
- Home: backend status/API/settings1902개, Console39개, frontend204개, mock browser2개, scoped axe 위반/미완료0. 메인 별도 regression3개와 파일 출처 대조도 통과했다. 정적 build/type/lint/scoped Python 검사와 OpenSpec 검증 결과는 Home 기록을 따른다.
- Home 전체 runtime smoke는 network none/read-only/새 tmpfs/host bind·published port 없음, 단일 worker에서 수행했다.469파일, import/startup, health·Home/Console·401 등12개 HTTP 항목과 현재/보존 asset20개를 확인하고 정상 종료했다. 실제 운영 데이터나 hosted 설정을 사용하지 않았다.
- 읽기 전용 catalog 검토 SQL은 새 로컬 fixture에서725행, 예상12table/35function 누락0으로 실행됐다. [로컬 기준](evidence/auth-transition-preparation-2026-10-18/catalog-baseline-local.json)은 hosted 실행 증거가 아니다.

최종 fixture 정리에서 Auth 사용자와 서비스 외 Console11table은 모두0행이고, 두 서비스는 active/unverified/verified_at null의 최초 상태였다. 새555xx의 네 container는 소유권을 새로 검증한 뒤 `SIGTERM`과 무제한 정상 종료 대기로 모두 exit0 종료했다. 강제 종료/삭제 없이 정지 container와 volume을 보존했다. 기존553xx 네 container는 종료 전후 동일하며 기존554xx volume도 보존됐다.55421/55422/55521/55522/55631/55632 listener는 없다. [일회성 종료 코드](evidence/auth-transition-preparation-2026-10-18/stop-owned-fixture.py), [종료 영수증](evidence/auth-transition-preparation-2026-10-18/fixture-stop-receipt.json). 이후 재사용은 새 ownership·구성·포트 확인이 필요하다.

최종 공개 세 서비스의 UI0.7.1 identity, Home455/455 기준 파일, Estimate current 링크, 원본7개 worktree HEAD/status가 모두 기존 값과 일치했다. 통합 Estimate/Jev와 shared checkout은 clean이며 이번 변경은 사이트와 Home에만 있다. 운영 데이터·backup·보안 파일은 이 검증에 읽거나 복사하지 않았다. [공개 identity](evidence/auth-transition-preparation-2026-10-18/public-identities-final.json), [운영 보존 관측](evidence/auth-transition-preparation-2026-10-18/preservation-final.json), [worktree 목록](evidence/auth-transition-preparation-2026-10-18/worktrees-final.json).

기존 한계는 남긴다. Estimate 최종 전체 browser365개 재실행은 미실시다. Home 기존 광역 backend4실패/전체 type72진단을 이번 좁은 검증으로 종료하지 않는다. 실제 Google/GitHub·identity 연결·SMTP 수신함·운영 HTTPS 인증 검증은 미완료다. Next16 TRACE의 dispatch 전500은 실제 ingress에서 차단 확인이 필요하다.

## 새 callback 호환성 문제와 설계 선택

실제 GoTrue v2.197.0의 공개 원문과 세 client를 대조한 [독립 리뷰](evidence/auth-transition-preparation-2026-10-18/callback-compatibility-review.md)에서 두 가지를 확인했다. 정적 callback 경로는 매번 달라지는 nonce query와 일치하지 않는다. nonce를 fragment로 옮기면 PKCE 성공 복귀에서는 유지되지만, provider 취소/오류 시 GoTrue가 fragment를 덮어쓴다. 이 경우 Jev/Estimate가 해당 취소 시도를 소비하는 기존 계약을 보존할 수 없다. 메인도 success/error 처리 원문을 독립 확인했다. 이는 실제 hosted OAuth를 실행한 결과가 아니라, 관측 버전에 고정한 소스·설정 불일치다.

따라서 단순 callback 추가나 fragment-only bridge를 구현·승인 대상으로 확정하지 않았다. [새 설계 제안](../superpowers/specs/2026-10-18-exact-callback-return-design.md)은 `Supabase → naeil.dev의 서비스별 고정 return 경로 → 해당 서비스 callback`으로 nonce query와 code/error를 전달한다. 최종 서비스만 기존 PKCE verifier·cookie binding·현재 권한을 검증한다. 사이트는 code 교환·세션 공유·권한 부여 없이 고정303 전달만 담당한다. SiteURL/기존3개 callback을 유지하며 wildcard는 없다.

[후속 설계 리뷰](evidence/auth-transition-preparation-2026-10-18/callback-relay-design-review.md)는 설계 SHA256 `7da4163bd9743ec75c599b4d214ceb33dc34ad0f7fc54f7fac79636c0a680a66`을 검토했다. 모든303의 명시적 빈 fragment `#`, HEAD405/Location 없음, 입력 검사 순서, 활성 소비자가 참조하는 동안 중계 경로를 유지하는 복구 조건이 명시돼 설계 수준의 지적은 닫혔다. 메인은 보고서·설계 해시와 기존 callback/Next method 처리를 직접 대조했다. [반영 기록](evidence/auth-transition-preparation-2026-10-18/callback-relay-review-closure.json)은 당시 설계 검토다. 이후 실제 로컬303/브라우저·기존 finalizer 회귀는 위 최신 결과의 제한된 범위로 완료했고 hosted logging은 아직 미검증이다.

당시 제안은 naeil.dev에 로그인 code가 거치는 경로와 장애·logging 의존성을 더하므로 사용자 선택까지 구현을 보류했다. 후속 “계속 해서 진행해줘”로 해당 범위의 로컬 구현·격리 검증이 승인되어 완료됐다. 운영 배포·설정·권한 적용 승인은 포함하지 않는다. Home은 nonce 검증 전에 현재 transaction을 지우므로 오래된 복귀가 새 대기 시도를 종료하는 기존 한계가 남는다. 이번 변경이 이를 해결했다고 표현하지 않는다.

2026-10-18 사용자 확인: Home Console은 현재 `https://jay-macmini-2.tail165003.ts.net:2455`를 유지한다. 최종 callback 대상은 이 origin의 `/api/console/auth/callback`이다. 주소 확인과 이후 별도의 로컬 구현 계속 요청을 구분한다. 운영 적용 승인은 아니다. 기존 검토본의 bytes는 보존하며 실제 설정과의 대조는 활성화 전에 수행한다.

## 운영 적용 전 검토표

아래는 준비 순서이며 실행 승인이 아니다. 현재 값을 확인할 수 없는 항목에 대해 변경 전/후를 추정해 승인받지 않는다.

2026-10-18 후속 조회에서는 **기존 로그인 세션으로 실제 관리 화면과 SQL 조회가 작동했다**. 로컬 브라우저 프로필을 명시했으며 재로그인·재시작·설정 변경은 하지 않았다. 이전 `Page.enable` 실패의 정확한 원인은 확정하지 않는다. 새 로그인이나 새 탭이 필요하다는 이전 안내는 철회 상태를 유지한다.

인증된 `dathsxdsaxooifnxjket` / `main Production`과 공개 사이트의 Auth 좌표를 독립적으로 대조했다. [읽기 전용 결과](evidence/auth-transition-preparation-2026-10-18/hosted-readonly-observation.json)에 따르면 중앙 Console schema는 아직 없다: table0/12, function0/35, private schema 부재다.24개 catalog 결과를 단일 JSON으로 모아213행(로컬 checksum 상수4행 포함)을 확인했다. Auth 필수 타입·함수·crypto 의존성은 호환됐다. `BEGIN READ ONLY`와 `ROLLBACK`만 사용했고 원본 결과는 Git 밖0600 파일로 보관했다. Jay 조회는 별도 쿼리로 지정 이메일에 한정했으며 token/session 값이나 다른 사용자는 읽지 않았다.

| 대상 | 현재 근거 | 준비한 변경/다음 확인 | 보존·복구 조건 |
| --- | --- | --- | --- |
| 중앙 schema/정책 | hosted Console 객체 없음, 필수 Auth/crypto 의존성 확인 | SQL001–004 원문을 묶은 [단일 transaction 후보](evidence/auth-transition-preparation-2026-10-18/hosted-schema-apply-candidate.sql), SHA256 `4f8eb80ec90c0b2f7fa9339f3e29bca9274257c8513d2276d8639e94be13ac73`. 미실행. 적용 직전 부재/role/대상을 다시 확인 | 기존 Auth/업무 데이터 DML 없음. Auth FK 잠금은2초 제한. 실패 시 transaction 취소, commit 응답 불확실 시 catalog부터 확인하고 재실행하지 않음. reset/link/push/bootstrap/DROP 복구 금지 |
| provider/signup | Email/Google/GitHub enabled, 신규가입 ON, 수동 linking/anonymous OFF, email 확인 ON | 제공자는 유지하고 `Allow new users to sign up`만 OFF로 바꾸는 안. 프로젝트 공통 설정이므로 ESG/Work를 포함한 새 계정의 최초 가입도 차단됨. 기존 로그인과 초대 경로는 실제 검증 필요 | 기존 provider identity/설정 보존. 이메일로 identity 자동 병합 금지. 가입을 다시 여는 복구도 보안 정책 변경이므로 자동 실행하지 않음 |
| callback | Site URL `https://naeil.dev`; allowlist는 사이트·ESG·Work의 `/auth/callback`3개. 실제 GoTrue v2.197.0은 타 origin의 query까지 allowlist와 비교 | **정적 callback3개 추가안 보류 유지.** 기존 nonce/PKCE·cookie binding을 유지하는 same-SiteURL 고정 relay의 로컬 구현·검증은 완료. 실제 Vercel metadata/ingress/query logging 및 Home2455 runtime 대조는 남음 | 기존3개/Site URL 유지, wildcard/nonce 삭제로 우회 금지. relay를 먼저 배포하고 활성 소비자/시도 수명 동안 보존. 승인 없이 hosted 변경하지 않음 |
| SMTP | Supabase는 현재 built-in email 사용. Home 직접 SMTP는 미공급 | sender/domain/TLS·전송 제공자·승인된 수신함·실메일 횟수 결정이 필요. 이번 schema/callback 안에 SMTP 변경·발송은 포함하지 않음 | generate_link와 실제 발송 구분. timeout은 unknown, 자동 재발송 금지 |
| Vercel secret | 운영 미공급 | production 서버 전용 `NAEIL_INVITE_CONFIG_JSON`: `siteOrigin`, 실제 `supabaseUrl`, `anonKey`, `serviceRoleKey`, `transactionStore:"supabase"`, 별도 `encryptionKey`. `NEXT_PUBLIC_*`에 비밀 저장 금지 | 외부 파일과 JSON 충돌 거부. 키/환경 값을 Git·로그·공개 bundle에 넣지 않음. runtime key 보존 |
| Jay | 기존 사용자1명, 확인된 Google 이메일·기존 로그인 기록·실제 UUID 확인; 차단/삭제 없음 | 비공개 검토표의 기존 UUID를 활성회원/sole admin 후보로 사용. 서비스별 실제 연결 검증 뒤 Jev·AB Estimate 명시 grant를 별도 적용 승인 | 새 Auth 사용자/identity 생성·병합 없음. 현재 앱 세션의 본인 확인과 실HTTPS 검증은 별도. 기존 UUID/차단/권한을 덮어쓰지 않음 |
| Home 후보 | 기존 base 위 narrow overlay 이미지 준비 | 실제 단일 worker 설정·개인 관리자 config·Home 세션과 별도 인증을 검토 | 현재 container/writer와 data/config 보존 영수증을 전환 직전에 새로 확보 |
| 사이트/Estimate/Jev | 인증 미배포. 실제 공개 설정의 사이트 standalone 로컬 빌드·무결성 확인 완료 | 실제 Vercel 배포 artifact와 runtime 검증 필요. callback 호환성 보완 뒤 각 서비스의 exact artifact와 현재 writer/보존안을 확인하여 순차 전환 | 과거 PID/일회성 승인 재사용 금지. graceful stop만 사용. lock 삭제/강제 kill/backup 복원 금지 |

적용 후보의 원문4개는 기존 검증 checksum과 byte 단위로 일치한다. 생성 대상은 private schema1개, table12개, function35개, SELECT RLS policy6개, 신규 grant trigger1개 및 서비스 등록2행이다. 두 서비스는 `active=true`, `unverified`, `verified_at=NULL`이며 회원·관리자·grant·초대는 생성하지 않는다. SQL001은 `auth.users`에 대한 FK2개와 내부 참조 무결성 의존성을 더하므로 Auth writer 잠금 영향을 고려한다. 적용 후보 자체는 hosted/local 어느 DB에도 실행하지 않았다. 원본001–004의 기존 격리 검증과 새 wrapper의 원문·transaction 검사를 구분한다.

승인을 받으면 먼저 같은 프로젝트/branch/role와 Console 객체 부재를 새로 확인하고 현재 설정 및 데이터·backup 보존 근거를 확보한다. 검토된 SQL 전체를 한 transaction으로 정확히 전달하고 모든 오류에서 중단한다. 성공 뒤 catalog/RLS/ACL을 대조한다. commit 여부가 불확실하면 읽기 전용 조회로 실제 상태를 확인하며 무조건 재실행하거나 생성 객체를 삭제하지 않는다. 서비스의 `verified`는 실제 artifact와 고정 service ID의 개인 JWT 권한 집행을 확인한 운영 증거이며, 단순 HTTP200이나 schema 적용으로 설정하지 않는다.

Home 초대는 Supabase `generate_link`로 링크를 준비한 뒤 Home의 별도 SMTP 전송을 사용한다. Supabase Auth의 custom SMTP 설정만으로 이 경로가 준비되지는 않는다. Home의 `console_invitation_config_file`에는 외부0600 파일로 `siteOrigin`, `serviceRoleKey`, `smtp.{host,port,tlsMode,username,password,fromEmail}`을 공급해야 한다. 운영은 인증서 검증을 하는 `ssl` 또는 `starttls`를 사용하며 loopback capture는 로컬 테스트 전용이다. 관리 API의 일반 요청은 개인 JWT를 사용하고 service role을 관리자 인증으로 대체하지 않는다.

## 승인 후 완료 조건

정확한 schema/환경/UUID/메일/artifact 변경안과 복구안을 완성한 뒤 해당 적용만 승인받는다. 현재 데이터·backup·보안 파일과 당시 writer를 새로 확인하고 한 서비스씩 전환한다. 중앙 권한 집행 뒤 password-only artifact로 rollback하지 않는다. 동일 중앙 정책을 집행하는 검증된 후보나 전진 수정이 없으면 보호 경로를 중단한다.

운영 완료는 실제 배포 artifact와 승인된 실계정·HTTPS에서 로그인/초대,401·403·503, revoke/outage logout, 계정 전환·저장 보호·언어 유지·재시작을 확인한 뒤 기록한다. 로컬 구현·격리 검증·패키징 성공은 이 완료 조건을 대신하지 않는다.

## 다음 재개 지점

고정 return 경로의 로컬 구현·검증은 완료됐으므로 다음은 [최신 결과](exact-callback-return-2026-10-18.md)의 실제 Vercel artifact/adapter·ingress/logging 검증안이다. 기존 정적 callback 추가안은 승인 대상으로 제시하지 않는다. schema 후보는 미승인/미적용이며 signup OFF는 같은 프로젝트의 ESG/Work 최초 가입에도 영향을 준다. Jay의 기존 UUID 등록안, 실제 서비스 연결/허용표, Home 직접 SMTP·비밀 공급과 서비스별 전환은 각각 준비와 필요한 승인을 이어간다. 이미 완료한 로컬 제품 구현을 반복하지 않는다.

구현은 `gpt-6.1-sol` 담당 두 명(초대 max, Home high), 독립 읽기 전용 보안 리뷰는 별도 `gpt-6.1-sol` max가 수행했다. 메인은 변경 검토·전용 fixture mutation/lifecycle·최종 standalone 빌드/HTTP/브라우저·양 archive 무결성·운영 보존 대조를 수행했다. [기계 판독 요약](evidence/auth-transition-preparation-2026-10-18/summary.json)과 [증거 해시 목록](evidence/auth-transition-preparation-2026-10-18/evidence-manifest.json)을 다음 인계에서 사용한다.

후속 문서·해시·개인정보 제외·작업 위치 보존 검사는 [continuation-final-checks.json](evidence/auth-transition-preparation-2026-10-18/continuation-final-checks.json)에 별도로 기록한다. 기존 `final-checks.json`은 당시 결과로 보존하며, 이번 문서 갱신을 제품 suite 재실행이나 운영 인증 완료로 세지 않는다.
