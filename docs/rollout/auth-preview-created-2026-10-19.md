# 보호된 Preview 생성 완료 — 2026-10-19

최신 후속: [승인된 baseline178 실행·키 회수 결과](auth-preview-baseline-result-2026-10-19.md). [실행 준비와 독립 검토](auth-preview-baseline-readiness-2026-10-19.md) 이후 해당 일회성 검사만 승인·완료됐다. 운영 인증 전환과 WAF/새 probe/로그 적용은 여전히 미완료·미승인이다. 아래의 배포 당시 관측과 승인 범위는 보존한다.

[Preview 생성 승인](auth-preview-application-2026-10-19.md)과 [작업 전용 CLI 로그인 승인](auth-preview-login-2026-10-19.md)을 이어 수행했다. **Vercel CLI 로그인과 동결된 진단v2·제품 Preview 두 개 생성은 완료했다. 두 배포 모두 READY이며 기존 Production 대상과 보호 설정은 유지됐다. 운영 인증 전환과 실제 hosted 검증은 아직 미완료다.**

## 로그인과 적용 결과

첫 수동 확인용 요청은 사용자 화면에 보이지 않은 상태로 08:58 JST에 exit1로 끝났다. 09:14 JST의 같은 config·같은 project GET도 인증 부재를 확인했다. REPL의 tab-open 관측을 사용자 화면 표시의 근거로 삼을 수 없음을 정정한다. 사용자가 Mac mini에서 보고 있음을 확인한 뒤 문서화된 Aside URL 열기와 macOS 앱 활성화를 사용했고, 사용자가 Vercel 화면이 보인다고 답한 다음 새 공식 승인 화면을 열었다. 09:16 JST CLI exit0, auth.json0600, 실제 project GET 성공을 확인했다. 같은 승인을 다시 요청하지 않았다.

전용 config는 `/Users/jaymini/.local/share/naeil-auth-operator/vercel-preview-20261019`다. credential 내용·공식 승인 URL/code·raw 브라우저/CLI 응답은 출력하거나 이 증거에 복사하지 않았다. 기본 CLI 인증을 덮어쓰지 않았고, token 수동 생성·env pull·설정 변경은 없다. 과거 실패 영수증은 보존했다. 사용자 화면의 Vercel 탭을 자동으로 닫지 않았으며 이전 소유 탭 정리·과거 transcript 보관 문제도 해결됐다고 하지 않는다. 광역 탭 조회는 하지 않았다.

| 대상 | 실제 배포 ID | 정확한 hostname | 확인 결과 |
| --- | --- | --- | --- |
| diagnostic-v2 | `dpl_EVnJYLaEu8fFypLjZDW9REq6pQ1h` | `design-system-88888u1l5-naeils-projects.vercel.app` | READY, 동일 project/team, Preview 명령·비Production target |
| product literal | `dpl_fni2kq9fbRPsZBWwu4U8Ao8ytCuR` | `design-system-ht3x2ljv4-naeils-projects.vercel.app` | READY, 동일 project/team, Preview 명령·비Production target |

CLI50.33.1의 승인된 `deploy --prebuilt --target=preview --scope=naeils-projects --json --no-wait`를 각각 한 번 호출했다. 두 생성 시도 모두 성공했고 재시도는 없다. 진단 READY와 project/team/보호/alias 및 기존 Production 불변을 먼저 검토한 뒤 제품을 생성했다. 각 deployment GET의 `target=null`, `alias=[]`, `aliasAssigned=true`를 그대로 보존했다. aliasAssigned 플래그를 custom domain 배정으로 해석하지 않으며 수동 alias 명령은 실행하지 않았다.

09:16–09:19 JST의 project GET에서 nextjs/Node24.x, build/install/dev/output/root=null, directoryListing=false, `all_except_custom_domains`, autoExposeSystemEnvs=true가 일치했다. Production ID·hostname·READY/target도 전후 동일했다. 이 결과는 플랫폼의 배포 상태와 설정 근거이며 보호 계층 통과·실제 함수 응답·실provider/HTTPS 성공의 증거가 아니다.

## 산출물과 검증 준비

제품 archive SHA256는 `127208fc6ce7a616b1f87e8dd1840d2487b57991eacca89180cdb082a088be39`, 진단은 `257077b992ccedac7ce349a9e4397ea440927d186987aedbb2b1e67f26c34df1`다. 업로드 전후 archive·stage의 모든 파일/내부 링크·config/project binding·업로더 해시를 대조했다. 제품2119파일+58링크, 진단754파일+21링크가 그대로다. 기존 빌드/테스트는 반복하지 않았다. S는 여전히 wildcard이고 literal은 scratch 후보이며 제품 sourceRevision=development의 Production 적격 한계도 유지된다.

원 동결 요청표를 보존한 별도 바인딩본에 위 실제 두 대상과 archive/config/inventory 해시를 연결했다. baseline178건(진단70+ingress102+제품6)의 원 rawTarget/method/protocol을 대조하고, 대문자·중복·누락 Host 및 HTTP2 authority 불일치를 보존했다. absolute-form은 해당 진단 hostname으로 구체화하고 모든 wire target 길이/해시를 다시 계산했다. after-rule102건은 같은 ingress 바인딩 파일을 쓰며 전체 상한은280건이다. 이 단계의 hosted probe는0건이다.

격리된 loopback TLS 수신기에 baseline178건을 한 번 전송한 기록도 확보했다. HTTP1.1 93건·HTTP2 85건의 path bytes/해시·method·ordinary header·중복/누락 Host·absolute-form·authority·SNI·ALPN이 모두 계획과 일치했다. 두 소유 서버는 정상 close했고 run-end socket0/listener=false다. 메인은 verifier 전체 소스,6개 manifest 파일 해시와178개 수신 기록을 독립 대조했다. 제품 placeholder 이름 누락으로 서버 시작 전 종료한 첫 preflight는 별도 보존했다. 이 결과를 얻기 위해 기존 제품 테스트나178건을 다시 실행하지 않았다.

이 verifier는127.0.0.1의 자신이 만든 port만 연결하며 hosted 실행 모드나 credential hook이 없다. HTTP1 raw 수신기의128KiB buffer는 기존 런타임의 D20/D21 handler 이전431을 대체하지 않는다. HTTP2는 수신 header field/ALPN 검증이며 HPACK 압축 bytes의 결정성 검증은 아니다. 공개·hosted 요청과 credential 사용은0이다. test TLS key/cert/config는 비공개 scratch에 남기고 증거에 복사하지 않았다.

바인딩은 실행 승인이 아니다. 보호 접근 수단·완성된 요청 헤더·실제 hosted sender·자신의 request ID만 보는 증거 범위는 아래 조건이 남는다. CLI 로그인 자체를 보호된 HTTP 접근 증거로 쓰거나 `vercel curl`의 자동 bypass 발급을 읽기 전용 작업으로 실행하지 않는다. WAF는 별도 snapshot/Preview hostname 범위/규칙/order/보존·신규 ID만 제거하는 복구안을 완성한 뒤 별도 적용 대상이다. 아직 없는 WAF ID를 baseline 준비의 선행조건으로 삼지 않는다.

## 보호 접근의 공식 계약과 남은 실행 조건

공개 [Vercel 자동화 접근 문서](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation)와 [공식 REST API](https://vercel.com/docs/rest-api/projects/update-protection-bypass-for-automation), 그 페이지가 연결한 [OpenAPI](https://vercel.com/openapi.json)를 읽었다. 기존 로컬 소스 검토의 미확정 부분 중 다음은 공식 근거로 해소됐다. 계정 API·비밀 조회·새 키 생성은 하지 않았다.

- 자동화 키는 **프로젝트 모든 배포에 회수될 때까지** 유효하다. 두 Preview로 제한되는 키나 자동 만료 키라고 설명하지 않는다. 실행기의 hostname 제한은 사용 범위 제한이다.
- 생성은 같은 project/team의 `PATCH /v1/projects/{idOrName}/protection-bypass`에 `{"generate":{"note":"naeil-auth-preview-baseline-20261019"}}`를 제안한다. OAuth2 인증에는 `generate.secret`을 공급하지 않는다. 새 키1개만 식별하고 기존 키는 재사용/회수하지 않는 조건이다.
- 회수는 같은 endpoint에 `{"revoke":{"secret":"<새 키의 비공개 참조>","regenerate":false}}`다. OpenAPI에서 regenerate는 필수 boolean이며 false는 대체 키 생성을 요구하지 않는다. 응답 불확실 시 재생성하지 않고 좁은 readback으로 조정해야 한다. control-plane의 부재 확인과 edge에서 즉시 거부됨은 별도 근거다.
- 최초 단독 키는 향후 build의 `VERCEL_AUTOMATION_BYPASS_SECRET` 대상으로 지정된다. 기존 artifact를 다시 빌드하지 않으며 env pull이나 환경변수 별도 설정을 포함하지 않는다. 키는 deployment protection 외 일부 firewall/system/bot 검사도 통과시키므로 그 결과로 일반 비인증 WAF 동작을 증명할 수 없다.
- 헤더 `x-vercel-protection-bypass`만 후보로 둔다. query credential, bypass cookie, 사용자 브라우저 cookie/token 추출은 제외한다. 공식 shareable-link 문서는 query 방식이므로 대안으로 선택하지 않았다. 헤더의 모든 플랫폼 저장소 비노출은 이번 문서 조사로 입증되지 않았다.

고정 CLI의 `api`는 전용 config·stdin JSON을 지원하지만 공개 옵션으로 retry0/no-redirect를 고정할 수 없다. 기본 fetch는3회 retry를 허용하고 redirect를 따른다. `--raw`도 JSON 재직렬화이며 non2xx 원문 응답을 그대로 돌려주지 않는다. 따라서 표준 CLI를 그대로 사용한 키 발급·회수 실행안은 완성됐다고 하지 않는다. 내부 모듈 patch/import, 인증 파일 추출, proxy 주입 또는 이 조건 완화는 하지 않았다. 새 전용 REST 실행기가 필요한지는 다음 적용안에서 구체적으로 검토할 사항이며 기존 로그인 승인을 그 방식의 자동 승인으로 확대하지 않는다.

자신의 로그 조회는 exact project/team/deployment/request ID·고정60초 이내 구간·page0 한 번으로 한정한 초안이다. `logs --json`도 `logs[0]`/`events[0]`만 보여 주고 `--limit`은 서버 응답량/요청수 상한이 아니다. scope 조회·retry·redirect·인증 refresh도 있어 별도 전송 통제가 필요하다. HTTP 응답 `x-vercel-id`와 로그 `requestId`의 대응은 미확정이며 임의 변환/광역 조회로 보충하지 않는다. 기존178건 중 자체 요청을 사후 상관하는 계획으로, 아직 존재하지 않는 request ID나 로그 row를 baseline 생성의 선행조건으로 삼지 않는다. 상관 근거가 없으면 로그 조회0회·증거 불완전으로 남긴다. 모든 sink 비노출 또는 삭제를 주장하지 않는다.

**최소 재개 조건:** 비밀을 출력/argv/query에 넣지 않고 정확한 새 키만 한 번 생성·회수할 실행 수단, 보호 헤더를 포함한 hosted sender와 응답 안전 투영의 검증·동결이 필요하다. 그 구체적인 적용 단위가 완성된 뒤에만 키 생성+baseline178건+새 키 회수의 승인을 요청한다. 현재 approvalReady=false이며 실제 hosted probe·로그 조회·키 생성/회수는 모두0이다. API 조회/실패를 포함한 상한도 같은 단위에서 고정한다. WAF 변경+after-rule102건은 여전히 별도다.

## 보존과 남은 전환 범위

기존 준비·적용·로그인 manifest3개 및260개 증거 파일의 해시가 일치했고,11개 작업 폴더의 HEAD/status는 이번 메인의 rollout 문서 추가 외에 일치했다. diff-check도 모두 통과했다. fixture/volume·dirty 소스·terrific-buffalo 자료·기존 data/backup/auth/config·운영 프로세스는 제어하거나 정리하지 않았다. 이번 단계에서 기존 fixture 상태를 다시 조회한 것은 아니다. 새 CLI 인증은 승인된 전용 경로에 그대로 보존한다.

schema/Jay/verified/grant·Home 이미지/설정·Estimate 설치·relay Production 전환·실메일·DNS/tunnel·push/main merge는 실행하지 않았다. 기존 Jay→Estimate 우선, Home 개인 관리자·중앙 정책·relay 선행 의존성 및 무강제종료/전환 보존/독립 DB owner 복구 공백은 [기존 준비 보고서](auth-main-preparation-2026-10-19.md)대로 남는다. 새 초대 메일 준비는 기존 Jay 연결의 선행조건이 아니다.

다음 적용 단위는 보호된 Preview의 baseline 합성 HTTPS 검증이다. 접근·전송·증거 범위까지 구체화한 뒤 그 적용만 승인 대상으로 삼는다. OP-01 양 hop query 비노출, OP-02 slash/backslash308·TRACE/WAF, OP-03 hosted 전달은 이번 READY 결과로 닫지 않는다. 실제 계정의 로그인/초대·401/403/503·회수/장애 logout·계정 전환/저장 보호/언어/재시작까지 완료되기 전에는 운영 전환 완료라고 하지 않는다.

안전한 산출물: [증거 manifest](evidence/auth-preview-created-2026-10-19/manifest.json), [배포 후 프로젝트](evidence/auth-preview-created-2026-10-19/project-after.json), [배포 후 파일 대조](evidence/auth-preview-created-2026-10-19/postdeploy-artifacts.json), [요청표 바인딩](evidence/auth-preview-created-2026-10-19/bound-probe-plan/binding.json), [로컬 전송 독립 대조](evidence/auth-preview-created-2026-10-19/main-review/offline-wire-review.json), [공식 계약](evidence/auth-preview-created-2026-10-19/official-access-contract/findings.json), [CLI 실행 한계](evidence/auth-preview-created-2026-10-19/cli-api-execution-review/report.md), [자체 로그 검토](evidence/auth-preview-created-2026-10-19/own-request-log-preparation/report.md), [보존 대조](evidence/auth-preview-created-2026-10-19/created-preservation-check.json).
