# A2 인증 ingress 별도 설계 검토 — 2026-10-19

**설계 검토는 완료했다. A2를 현재 운영 가능한 안으로 채택하지 않는다.** `naeil.dev`의 수신 지점만 소유 TLS로 바꾸는 안은 E/J의 둘째 hop 저장 경계를 해결하지 못한다. Jay→Estimate의 최소 확장 후보는 **naeil.dev·Estimate의 소유 TLS 수신 지점 + 기존 Mac 앱 + 기존 Home2455 통제**이며, Jev ingress 전환은 Estimate 수용 뒤다. 실제 운영 대상·양 hop 수집 통제·Vercel 연계·전환/복구는 아직 확정되지 않았다. 플랫폼 전체의 불가능을 입증한 것은 아니다.

사용자의 “응 계속 진행해줘”는 직전 [인수 보고](auth-main-intake-2026-10-19.md)의 A2 별도 설계 검토 허용으로 적용했다. 설계 채택, 새 구현/격리 실행, 자원 생성, 인증서/DNS/tunnel 변경, 배포·계정·프로세스 적용으로 확대하지 않았다. 이번 산출물은 검토 문서와 안전한 읽기 전용 metadata 영수증이다.

## 이번에 확인한 것

| 항목 | 검증된 사실 | 그 사실로 닫히지 않는 조건 |
| --- | --- | --- |
| Next 전달 경로 | 설치된16.1.7 소스에서 정상 custom-server `handle(req,res)`와 literal rewrite3개의 조건부 경로를 추적했다. 실제 own data-string `initURL`이 내부 API 선택 전 원문 path/query를 담을 수 있다. 메인이 핵심 호출부와 API를 직접 대조했다. | 별도 relay 전용 normal build가 필요하다. 아직 구현/실행하지 않았고 현재 S는 wildcard다. 실제 artifact의 metadata·Host·조기 응답·수집 통제는 미입증이다. [상세](evidence/auth-a2-design-review-2026-10-19/next-dispatch.md) |
| Home 실제 TLS 구성 | 21:14 JST exact-target `tailscale serve status --json` 허용 필드만 보존했다. 기존 `jay-macmini-2.tail165003.ts.net:2455`의 HTTPS Serve→`http://127.0.0.1:2455`, root handler1개, 해당 Funnel=false다. CLI/daemon 보고 버전은 모두1.102.2다. | 앱 요청/health/probe나 로그는 읽지 않았다. 구성과 보고 버전 일치가 설치 byte parity·로그 비저장·인증서 보관/복구를 증명하지 않는다. [영수증](evidence/auth-a2-design-review-2026-10-19/home-ingress.json) |
| E/J 둘째 hop | 저장된 운영 영수증은 Cloudflare proxied 원격관리 tunnel→Mac loopback E2473/J2466을 가리킨다. Cloudflare 방문자 TLS와 origin TLS는 별개다. | 현재 원격 설정을 재조회한 것은 아니다. Logpull retention 끄기, Logpush 필드 제외, connector debug 억제는 각각 제한된 기능이며 전체 저장 전 억제를 보장하지 않는다. [경계별 표](evidence/auth-a2-design-review-2026-10-19/second-hop.md) |
| Vercel 연계 | 10/18 저장된 계정 관측은 Hobby다. 현재 공식 문서는 자체 프록시의 Verified Proxy Advanced를 Enterprise 수동 등록 대상으로 명시한다. | 계정 plan은 이번에 live 재조회하지 않았다. 기본 HTTPS 프록시가 기술적으로 불가능하다는 뜻은 아니다. 지원되는 trust/client-IP 경로, 가용성 및 계약 조건이 현재 plan에서 확보됐다고 약속할 수 없다. [공식 요건](https://vercel.com/docs/security/reverse-proxy), [저장 관측](evidence/auth-main-continuation-2026-10-18/platform/access-partial-observation.json) |

이전 baseline178·49원문/8다름/13미관측·Home merge revision·Estimate predecessor 정적 감사는 재사용한다. OP01의 양성 관측은 무해한 health-query 저장이며 실제 인증정보 유출 관측이 아니다. 기존 observer10건·Preview·provider inquiry·사람 답변 대기를 다시 만들지 않았다.

## 조건부 구성과 탈락한 단축안

1. 소유 HTTPS listener가 `naeil.dev`의 첫 TLS 종료점이 된다. raw request target와 raw Host를 URL 재구성 전에 검사하고, 보호 경로의 alias/internal/non-GET/모호한 입력은 완전한 거부 응답으로 끝낸다. 일반 사이트로 보내서 정규화하게 하지 않는다.
2. 정확한 세 callback GET만 동일 request/response로 Next16.1.7의 공개 custom-server handler에 전달한다. relay 전용 normal build, literal rewrite3개, site proxy/i18n/basePath 없는 별도 경계를 사용한다. 기존 parser/API·고정303/빈 fragment·E/J/H finalizer는 보존한다.
3. **원문 보존의 기준은 실제 Next own `initURL`이다.** Next는 이후 `req.url`을 내부 정규화한다. 최종 handler의 `req.url`까지 원문과 같다고 주장하지 않는다. ingress의 사전 재작성, 직접 API 호출 후 metadata 주입, `app.render`, 세 번째 parsedUrl 인자, standalone 서버 개조는 이 후보가 아니다.
4. raw Host 계약 그대로의 가장 작은 후보는 HTTP/1.1이다. H1-only는 아직 선택되지 않은 가용성 조건이다. HTTP/2 `:authority`를 Host로 만들어 넣는 것은 보존 증거가 아니며, H2 지원은 별도 적격 경로가 필요하다. Node parser/Expect/CONNECT/Upgrade/오류 경계까지 포함해야 한다.
5. 일반 사이트 요청은 loop가 없는 명시적 Vercel upstream으로 전달한다. `/auth/callback`, `/auth/invite`, SSR/session epoch, ESG/Work, 언어/정적 자산/저장 보호를 유지한다. callback query는 이 upstream에 보내지 않는다.
6. Estimate도 현재 Cloudflare TLS 종료 경계를 벗어나는 안을 택한다면 **그 hostname 전체**를 소유 ingress로 받아야 한다. 고정 callback URL과 Mac compute/data는 유지하고, 별도로 검토한 인증·암호화 채널로 같은 finalizer에 전달한다. Home은 확인된 private Serve2455 주소를 그대로 두고 daemon/app 수집 경계를 통제한다. Jev도 나중에 같은 조건을 충족해야 하지만 첫 Estimate 전환의 선행 작업으로 만들지 않는다.

첫 단계에는 Jev 생성기만 미전환하는 것으로 부족하다. `/auth/return/jev`가 미해결 둘째 hop으로 전달되지 않도록 새 ingress에서 명시적으로 비활성화하는 조건이 필요하다. 검토 후보는 기존 보호 헤더를 갖춘 empty503, no forwarding/consumption이다. 세 parser 목적지와 향후 고정303 계약은 보존하되 이 단계별 admission은 아직 채택/구현하지 않았다. Jev 수용 준비 후 별도로 활성화한다.

DNS와 SNI는 TLS 안의 URL path를 볼 수 없다. 따라서 “callback만 새 TLS 서버로 보내되 동일 hostname의 나머지는 기존 ingress”라는 DNS 변경은 성립하지 않는다. 기존 Cloudflare 앞/뒤에 local HTTPS를 더 붙여도 이미 TLS를 종료한 첫 경계는 사라지지 않는다. 이번에 TCP 전달 상품, 새 터널이나 공개 Funnel을 대안으로 채택하지 않았다.

| 검토안 | 운영 판정 | 다음 범위에 미치는 영향 |
| --- | --- | --- |
| A2 첫 hop만 변경, E/J ingress 유지 | OP01 미충족 상태 유지. 채택 보류 | Next 구현만 시작해도 이 구조적 조건은 닫히지 않는다. |
| naeil.dev+Estimate부터 소유 TLS ingress로 확대 | 첫 전환의 **조건부 설계 후보**, 운영 적격 아님 | 두 hostname 전체 진입점·인증서·가용성 책임과 Home 수집 통제를 준비한다. Jev는 첫 수용 뒤 별도 전환하며 새 인증 활성화를 앞당기지 않는다. 최종 세 공개 도메인에서도 E/J 앱·데이터와 사이트 Vercel 배치는 유지 가능하지만 실제 채널·host는 미선정이다. |
| 기존 모든 ingress 유지 | 새로운 완전한 지원 통제가 제시되기 전 활성화 보류 | 이미 끝난 조사/합성 suite를 반복하거나 PKCE·사후 redaction·query 삭제를 예외로 삼지 않는다. |

## 운영 대상·인증서·Vercel origin

**현재 영수증에서 public443을 운영할 수 있다고 검증된 소유 host는 선정되지 않았다.** 기존 Mac의 inbound 공인 경로·80/443 여유·전원/회선 복구를 가정하지 않는다. 새 소유 서버도 생성·구매·제품 선정하지 않았다. 어느 쪽이든 실제 host ID, 고정 egress, public ingress, 독립 제어/복구 경로, private backhaul와 운영 소유자를 산출물에 묶어야 한다. 이는 모든 외부 자원을 조사했다는 뜻이 아니다.

Vercel origin은 해당 project에 배정된 도메인과 일치하는 Host/SNI·인증서 검증을 사용해야 한다. public `naeil.dev` DNS로 다시 연결하면 자기 자신으로 loop할 수 있다. 같은 Host를 유지하는 origin 연결과 별도 origin hostname은 사이트 auth/SSR의 동작이 다를 수 있으므로 동등하다고 가정하지 않는다. 사용할 origin 이름/연결 방법은 아직 선택·검증하지 않았다. 외부 cache는 추가하지 않는 후보이며 Vercel validation 경로와 일반 방문자 회귀를 유지해야 한다. [공식 origin/validation 지침](https://vercel.com/kb/guide/can-i-use-a-proxy-on-top-of-my-vercel-deployment)

자체 프록시의 지원 등록에는 static egress·원 client IP 전달·outbound SNI·예측 가능한 origin이 요구된다. Enterprise 전환이나 공급자 문의를 자동 후속 작업으로 만들지 않았다. Hobby에서 요청이 한 번 성공하는 관측도 지원 등록·가용성 보장의 대체가 아니다. [공식 plan/등록 요건](https://vercel.com/docs/security/reverse-proxy)

새 ingress의 인증서 자동 발급/갱신은 별도 설계 대상이다. HTTP-01은80, DNS-01은 검증 TXT 및 자동화 권한이 필요하다. 현재 Vercel과 같은 hostname을 유지하는 origin 인증서는 Vercel의80/ACME 예외도 보존해야 한다. challenge 소유권·routing 충돌·만료 전 갱신·실패 시 fail-closed·공개 certificate fingerprint와 비공개 key의 최소 접근/독립 복구를 정해야 한다. private key/credential을 읽거나 옮기지 않았고 사용자에게 요청하지 않았다. Home의 기존 Serve 자동 인증서도 이 공개 도메인의 인증서 대체가 아니다. [ACME 요건](https://letsencrypt.org/docs/challenge-types/), [Vercel validation 경로](https://vercel.com/kb/guide/can-i-use-a-proxy-on-top-of-my-vercel-deployment)

## 저장 전 통제와 전환/복구

- 각 TLS 종료점, HTTP/parser 오류, proxy/tunnel, Next tracing/error/debug hook, Home Serve/Go logger, Uvicorn, supervisor/stdout/stderr, OS crash/core, exporter에 대해 **수집을 만들기 전의 정확한 기능·설정·artifact**가 필요하다. `quiet`, debug OFF, upload OFF, 로그 export 필드 제외, 출력 후 redaction을 서로 같은 보장으로 취급하지 않는다. 상세 표의 일부 지원 기능은 있으나 전 경계의 적용 증거는 없다.
- Next 실제 소스에는 URL을 넣는 span/error 경로가 있다. Home의 확인된 Serve 구성도 오류 출력/업로드 통제가 확인됐다는 뜻은 아니다. 합성 query가 저장되지 않은 한 번의 관측만으로 비저장을 증명할 수 없다.
- 새 로그는 static route category/status class/시간·개수와 artifact/config/certificate fingerprint 같은 허용 필드만 생성하는 후보로 한정한다. query·code·nonce·요청 header·Location·요청 유래 오류/stack을 기록하지 않는다. 보관 기간·접근자·독립 복구 위치는 아직 미확정이며 비밀 경로를 문서에 채우지 않는다.
- 적용 전 authoritative DNS/remote tunnel version·대상 항목/순서·redirect rule·인증서 갱신 구성·app artifact와 모든 data/backup/auth/config를 각 소유자가 새로 보존해야 한다. 과거 backup이나 현재 PID를 새 적용 권한으로 재사용하지 않는다.
- DNS 캐시·기존 TLS 연결은 구/신 ingress를 겹치게 한다. TTL 대기만으로 모든 복귀가 새 경로를 쓴다고 보장할 수 없다. 기존 실제 시도가 없고, 승인된 수용 대상의 구 연결/경로가 제거되며, callback이 미해결 구 경계에 도달하지 않는 전환 조건을 구체화하기 전 새 실제 시도를 시작하지 않는다. 현재 general-release 전환 증거는 없다.
- 활성화 뒤 장애 복구는 같은 보안 정책의 ingress/artifact 유지·forward fix 또는 새 시도 중단이다. 구 Vercel/Cloudflare query 수집 경로로 DNS를 되돌리는 것을 안전한 rollback으로 쓰지 않는다. 참조 앱/진행 중 시도가 있으면 호환 relay/finalizer를 유지하며 기존 세션·중앙 정책을 보존한다.
- 독립 제어/복구 경로 없이 Home2455를 중지하지 않는다. 강제kill·lock 삭제·backup 복원·중앙 정책 후 password-only rollback은 없다. Home Auto/monitoring 이식, Estimate closed gate와 중앙 private recovery의 별도 미완료 조건도 그대로다.

## 다음 결정과 검증 경계

**지금은 A2 구현이나 새 observer를 시작할 근거가 부족하다.** 다음에 A2를 더 진행하려면 먼저 naeil.dev·Estimate의 hostname 전체 ingress까지 확장할지, 실제 운영 host/연결과 Vercel 지원 조건을 어떤 범위에서 확보할지를 결정해야 한다. Home2455의 현재 수집 경계 통제도 함께 필요하며 Jev ingress는 첫 수용의 조건이 아니다. 이 보고서는 그 확대를 권한으로 간주하지 않는다. 현재 범위를 유지하는 선택이면 relay 활성화 보류가 명확한 종료점이다.

확대가 별도로 선택되더라도 구현 전에 named host/channel/origin/protocol·첫 단계 활성 경계의 모든 collector 통제·Jev 비활성 admission·보존/복구/transition을 묶은 구체적 설계가 필요하다. Jev 전용 수집 통제는 그 서비스의 후속 활성화 조건이다. 해당 구성이 성립할 때만 [Next 보고서의 유한 검증군](evidence/auth-a2-design-review-2026-10-19/next-dispatch.md)을 구현/격리 검증 단위로 제시한다. 실제 own metadata6 canonical 사례, 기존 raw-query 구분, 조기 alias/method/Node event, Host/metadata 실패와 수집 경계가 수정 선택을 바꾸는 검증이다. 세 parser 경로의 격리 검증과 단계별 공개 admission 검증을 구분한다. 기존 hosted178을 다시 돌리거나 승인되지 않은10건 observer를 자동 추가하지 않는다.

이후 선택한 제품/설정·보존/복구 완성→각 적용 승인→relay canonical 검증→schema·기존 Jay→Home 개인 관리자→Estimate 실제 연결→별도 verified→Estimate 명시 grant→실HTTPS 수용 순서는 유지한다. exact artifact의 실제 로컬 Auth/DB 허용경로와 실제 연결의 미허용 개인 JWT403을 분리한다. Jev·새 초대는 뒤이며 새 초대 준비로 Jay를 막지 않는다. 기존 언어·Google/UUID·단일 초기 관리자/명시 권한표·자동 SSO/전역 logout/언어 동기화/견적 번역 금지를 보존한다.

## 작업·검증 영수증

독립 담당2명은 `gpt-6.1-sol`/high 설정으로 Next 정적 경로와 둘째 hop을 각각 검토했다. 모델 serving 내부 identity는 별도 증명하지 않았다. 파일 소유권은 각 상세 보고서 한 개로 제한했고 메인은 통합·실제 Home projection·핵심 소스/저장 topology 대조·최종 diff/hash 검증을 맡았다. public 공식 문서와 version-bound 로컬 소스를 구분했으며 설치 소스와 public tag의 binary parity를 주장하지 않는다.

새 파일·기존 보호 hash·5cwd HEAD/status·문서 link·공백 검사 결과는 [verification.json](evidence/auth-a2-design-review-2026-10-19/verification.json)에 기록한다. 이번에는 기능 코드·dependency·config·DB·fixture/volume을 변경하지 않았고, 빌드·기능 suite·앱 probe·실계정/provider/메일·배포를 실행하지 않았다. UI0.7.1 운영과 새 인증 전환은 별개이며 네 서비스의 실제 HTTPS 수용/Production 적격은 미완료다.
