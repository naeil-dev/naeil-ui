# Vercel 인증 전환 사전 검증 — 2026-10-18

**읽기 전용 운영 조사와 격리 어댑터 검증을 마쳤다. 현재 후보의 인증 활성화는 보류한다.** 실제 Vercel 프로젝트가 무해한 테스트 query를 요청 로그에 보존하는 것을 확인했다. 이는 검토된 query 비노출 계약을 충족했다는 주장을 막는 근거다. 배포 가능한 새 Vercel artifact는 만들지 않았으며 제품 코드·운영 설정·실계정·권한은 변경하지 않았다.

후속 사용자 승인으로 [비공개 문의를 전송했다](vercel-support-inquiry-2026-10-18.md). 지원 AI 답변은 받았으나 사람 담당자용 CDN 접수 폼은 팀 권한·지원 요금제 오류로 거부됐다. 아래 준비 당시의 미발송 기록은 역사적 상태이며, 현재 접수 상태와 최소 재개 조건은 후속 문서를 따른다.

[이전 로컬 구현 결과](exact-callback-return-2026-10-18.md), [이번 실행 계획](../superpowers/plans/2026-10-18-vercel-auth-preflight-plan.md), [독립 플랫폼 검토](evidence/vercel-auth-preflight-2026-10-18/platform-review.md), [어댑터 담당 보고서](evidence/vercel-auth-preflight-2026-10-18/adapter-probe-report.md)를 함께 읽는다. 기존 제품 suite는 반복하지 않았다.

## 확인한 운영 경계

| 조건 | 이번 근거와 판정 | 남은 최소 조건 |
| --- | --- | --- |
| OP-01: 두 hop의 query/authorization URL 비노출 | 현재 production의 `/api/health`에 보낸 가상 marker가 Vercel Request Logs의 Search Params에 남았다. 활성화 보류 | 실제 프로젝트의 관련 로그 저장 전에 query를 억제하는 공급자 지원 기능·보장, 또는 명시적인 보안 계약·아키텍처 재검토 |
| OP-02: 앱 도달 전 ingress 보호 | 실제 Next minimal launcher에서도 중복 slash/backslash가 query-bearing308을 반환했다. 로컬 TRACE405는 앞서 확인한 다른 dispatch 층의 TRACE500을 해소하지 않는다 | 실제 ingress에서 raw path/method 거부 순서·응답·보안 헤더·cache·로그를 별도 승인 후 검증 |
| OP-03: Vercel 원문 전달·artifact | 빌더가 `?path=$1` rewrite를 방출한다. 이 값을 function 입력에 넣으면 strict relay가 인증 실패로 닫힌다. 실제 CDN 입력은 미관측 | 선택된 빌더/런타임의 clean artifact와 실제 proxy→middleware→function 원문 전달 검증 |

### OP-01의 실제 관측과 한계

2026-10-18 14:56:19 JST에 쿠키·Authorization 없이 다음 요청을 한 번 보냈고 redirect는 따라가지 않았다.

`GET https://naeil.dev/api/health?naeil_probe=preflight-20261018-p11twp61`

응답은200, `x-vercel-id`는 `hnd1::iad1::m26mm-1792302978751-c6eb9bd9c123`였다. 기존 로그인된 Vercel UI에서 이 request ID만 조회했으며 같은 Host·경로·User-Agent와 `naeil_probe=preflight-20261018-p11twp61`가 Search Params에 표시됐다. [요청 영수증](evidence/vercel-auth-preflight-2026-10-18/public-canary-request.json)과 [가린 로그 화면 기록](evidence/vercel-auth-preflight-2026-10-18/browser/vercel-canary-log.txt)을 보존했다. 실제 code/token/nonce/회원 정보는 사용하지 않았다.

이는 **현재 health 요청의 query 값이 플랫폼에 보존·표시된 증거**다. 아직 배포하지 않은 인증 경로, 원문 인코딩의 byte 단위 보존, 전체 보관 기간, 다른 서비스 로그까지 확인한 것은 아니다. 인증 경로 전용 공급자 정책이 존재할 가능성을 단정적으로 배제하지 않지만 현재 확인된 지원 근거는 없다.

[Runtime Logs 문서](https://vercel.com/docs/logs/runtime)는 Search Params를, [Log Drains 문서](https://vercel.com/docs/drains/reference/logs)는 query를 포함하는 `proxy.path`를 명시한다. trace sampling0%, drain 해제, 앱 stdout 비활성화, 수신 후 redaction, Web Analytics 필터는 앞선 플랫폼 저장을 막는다는 근거가 아니다. 문서·pinned source의 URL/시각/SHA는 [source manifest](evidence/vercel-auth-preflight-2026-10-18/platform-source/manifest.json)에 있다.

## 실제 프로젝트와 후보 identity

읽기 전용으로 기존 인증 UI의 프로젝트·production 설정·환경변수 이름만 확인했다. 새 로그인이나 secret reveal은 하지 않았다. [설정 관측 영수증](evidence/vercel-auth-preflight-2026-10-18/project-observation.json).

| 항목 | 관측 |
| --- | --- |
| 프로젝트 | `naeils-projects/design-system`, Hobby, `prj_4hVsBkRsOG53udir9ZZ8OgFKStT5` |
| 현재 production | `dpl_7zTs8hNcVMTZ7D8YMDsc2j5kYpnx`, `main`/`ff37223`, `design-system-9ez7hpbya-naeils-projects.vercel.app` |
| 도메인 | `naeil.dev`, `design-system-red-five.vercel.app` |
| 빌드 | Next.js preset, build/install/output override 꺼짐, root 빈 값, Basic2vCPU/8GB |
| 런타임 | Node24.x, Fluid Compute 켜짐, iad1,1vCPU/2GB; 현재 production 설정 panel에서도 확인 |
| 보호 | Standard Protection, 보이는 bypass secret/exception 없음, OPTIONS allowlist 꺼짐 |
| 관측 설정 | tracing sampling rule0, drain 없음; 모든 내부 파이프라인 부재를 뜻하지 않음 |
| Firewall | 활성, Custom Rule0, system bypass0, IP block0, Bot Protection Off |
| 환경변수 | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`만 Project 목록에 보임, 둘 다 All Environments. linked Shared0. 값은 열지 않음 |

`NAEIL_INVITE_CONFIG_JSON`/`NAEIL_INVITE_CONFIG_FILE`은 현재 목록에 없다. 영속 초대의 server-only 설정 등록은 향후 대상별 승인 항목이다. 현재 UI 목록은 과거 deployment의 환경 snapshot을 증명하지 않는다. 실제 hosted builder 버전·bundled-server/instrumentation flag·빌드 로그는 미확정이다. CLI login/link/pull이나 credential 파일 열람은 하지 않았다.

사이트 소스는 `/Users/jaymini/.paseo/worktrees/28nele6j/naeil-account-language`, HEAD `02aa72e6e702bf6726659c6e7179e648eb648141`의 기존 dirty 후보다. 메인 cwd `/Users/jaymini/.paseo/worktrees/28nele6j/pure-chicken`은 HEAD `9f83816f973618aa77c2bba56b6fa9319ef1fc3d`, clean 상태를 유지한다. 새 commit은 없다.

| 보존한 사이트 후보 | identity |
| --- | --- |
| root | `/private/tmp/naeil-site-exact-return-g7cbcwl7` |
| artifact | `exact-return-20261018-2b6a8414d4a4-25e940f7` |
| source223 snapshot | `2b6a8414d4a4c11d5620f54c751c7f1cc2a9d7797ea0ff95c55417c513bfc21f` |
| standalone SHA256 | `a7748577a7f38320434ab2cdfe0da53fe127ea5d0f1112ce3670ec376abe432b` |
| receipt SHA256 | `0113cf2f3926a059407b54cea14c59e23c4670029df40cbe4252d064a6d13b62` |

이전 후보는 Node22 로컬 standalone 검증 산출물이다. Node24 프로젝트 설정과 같다고 취급하지 않는다. immutable 검토 명세 SHA `7da4163bd9743ec75c599b4d214ceb33dc34ad0f7fc54f7fac79636c0a680a66`도 유지했다.

## 어댑터·패키징 검증

새 root `/private/tmp/naeil-vercel-preflight-20261018-p11twp61`에서 기존 runtime을 APFS clone했다. hardlink는 사용하지 않았다. cached CLI50.33.1의 `@vercel/next@4.16.1`/build-utils13.8.1과 Node24.21.0으로 OS sandbox·outbound 금지 상태에서 실행했다. 설치와 전체 재빌드는 하지 않았다.

지원되는 `builder.build()`를 호출했지만 install 생략·compile no-op·기존 outputDirectory를 사용한 **진단용 반환 모델**이다. 처음 누락된 middleware trace, clone 쓰기 권한, original absolute appDir로 인한21개 escaping file key 실패를 보존했다. 정확한 frozen trace 복사와 clone의 `relativeAppDir: '.'` 조정 후 최종 모델은1238entries/36Lambdas/75routes, API707files, escaping key0을 반환했다. Node24.x/local arm64 값이며 실제 hosted architecture로 간주하지 않는다.

`.vercel/output/config.json`과 deployable function tree는 생성되지 않았다. 이 모델이나 이전 standalone archive는 배포 승인 대상 artifact가 아니다. clean artifact에는 실제 프로젝트 기본 build/install/output/root, 고정된 공개 Auth 입력 fingerprint, 완전한 trace와 선택된 runtime 설정이 필요하다.

생성된 API launcher는 실제 실행 fixture와 byte 단위로 동일하며 SHA256은 `bdd38b73158f9c60c365af3d8b02b042b23775353762d56128bdfc5b875c3e6d`다. 메인이 [원본38응답과 metadata](evidence/vercel-auth-preflight-2026-10-18/adapter-probe/http-results.json), emitted route와 hash109개를 직접 대조했다. [메인 검토](evidence/vercel-auth-preflight-2026-10-18/adapter-root-review.json).

| 제어한 function 입력 | 결과 |
| --- | --- |
| public exact path + matched internal route header + raw Host `naeil.dev` | 세 서비스 모두303, fixed callback, 명시적 빈 fragment `#` |
| public path만 전달 | minimal mode404; CDN route engine을 실행한 것이 아님 |
| internal URL로 바꿈 |404; 원문 public path가 없어도 성공하는 fallback 없음 |
| public path에 `path=jev`/`nxtPpath=jev` 추가 | initURL에는 남고 이후 req.url에서는 제거됨.303 `error=authentication_failed` |
| Preview Host, forwarded Host 위조 |403; 일반 Preview에서 exact 후보의 성공을 검증할 수 없음 |
| 중복 Host·port·대문자 Host | loopback raw representation에서403 |
| HEAD/POST/OPTIONS/TRACE 직접 dispatch |405/Allow GET/Location 없음 |
| 중복 slash/backslash | 앱 이전 query-bearing308 재현 |
| apostrophe/percent/plus·code 경계·malformed query | 보존·분류 관측; 전체90-case suite 반복을 뜻하지 않음 |

응답 분포는303×11/308×3/400×4/403×6/404×10/405×4다. middleware route9가 rewrite route10보다 앞서고 별도 Lambda로 방출된다. 이 fixture는 전체 플랫폼 라우팅이나 별도 middleware를 먼저 실행하지 않았다. 따라서 `path=$1`은 **방출된 경로에 근거한 가용성 위험**이며 hosted callback 실패가 확인된 것은 아니다. 엄격한 parser를 완화하거나 routing query를 임의로 제거하는 제품 수정은 하지 않았다.

## 다음 조치와 승인 단위

1. **공급자 확인을 먼저 한다.** [비공개 지원 문의 초안](evidence/vercel-auth-preflight-2026-10-18/provider-inquiry-draft.md)을 준비했으며 발송하지 않았다. query가 UI에서 가려지거나 export에서 제외되는 수준이 아니라 저장 전에 억제되는지, Hobby/현재 프로젝트에서 지원되는지, ingress/WAF/redirect·rewrite 실패/runtime/tracing/error/drain 전체에 어떤 보장이 있는지 확인한다. 지원 문의 발송 자체는 사용자의 명시적 지시가 필요하다. 유료 변경도 승인되지 않았다.
2. 지원 기능이 없다면 **기존 호스팅을 유지하는 범위에서 보안 계약과 두 hop 전송 설계를 명시적으로 재검토**한다. 코드/nonce를 로그 허용 대상으로 몰래 재분류하거나 애플리케이션 로그만으로 요구사항을 좁히지 않는다. 다른 구조를 이번 조사에 이어 자동 구현하지 않는다.
3. OP-01을 해결하고 현 설계를 계속 쓰기로 한 뒤 clean source-mapped artifact를 만든다. target은 위 프로젝트이며 public build input은 fingerprint로, server-only 설정은 별도 안전한 등록안으로 관리한다. artifact hash와 정확한 변경안을 갖추기 전에는 preview/production 배포를 승인 요청하지 않는다.
4. 첫 hosted 검증 후보는 **가상 값만 사용하는 보호된 별도 diagnostic Preview**다. 응답은 initURL own descriptor 유무/type, raw Host 수·분류, 입력 길이/hash/fixture 일치 여부만 반환한다. 원문 URL/header echo·로그·실code·계정·provider 호출·redirect following은 제외한다. artifact와 요청 수·정확한 vector·로그 조회 범위를 먼저 고정하고 배포와 조회만 좁게 승인받는다. 진단 후보 성공은 제품 후보 성공과 구분한다.
5. ingress 변경은 별도 승인안으로 분리한다. 문서상 가능한 WAF Raw Path/Method+Deny를 검토하되 실제 matcher/order·보안 헤더·cache·WAF 로그를 확인해야 한다. rule0인 현재 상태를 보존하고, 승인된 새 rule ID만 되돌릴 수 있게 전후 snapshot과 제거 조건을 준비한다. query-bearing308·약한 denial 응답이 남으면 전환을 멈춘다.
6. exact 후보 성공은 실제 `naeil.dev` authority에 연결된 승인된 artifact에서 기존90사례와 protocol/Host/ingress/log matrix로 확인한다. Preview Host 허용이나 forwarded authority 위조로 대체하지 않는다. relay가 먼저 배포·검증된 후 소비 앱을 서비스별로 전환하고, 소비 앱 및 진행 중 시도가 사라질 때까지 relay를 유지한다.

이번에는 schema001–004·provider/callback/signup/SMTP·server secret·Jay 실제 UUID/sole admin/두 서비스 grant를 적용하지 않았다. 이전 검토표와 사용자 의향을 유지한다. Home은 확인된 `https://jay-macmini-2.tail165003.ts.net:2455` 그대로다. 보류한 정적 callback3개나 wildcard를 추가하지 않았다.

서비스 전환 직전에 현재 writer/업무 데이터/backup/인증 설정을 새로 확인한다. 과거 PID·일회성 승인을 재사용하지 않는다. relay를 참조하는 소비 앱이 있으면 relay 없는 사이트로 rollback하지 않으며, 중앙 정책 적용 후 password-only artifact로 돌아가지 않는다. 현재 production identity 보존은 향후 무조건적인 rollback 승인이 아니다.

## 보존·산출물과 미완료

메인 재대조에서 artifact/명세13개 해시, 사이트223·Estimate289·Jev169·Home56 source map, 원본7worktree HEAD/status, Home 운영455파일이 일치했다. Jev의 이전 test-only 차이는 기존 기록대로 유지했다. 이전 fixture8개는 종료 상태와 identity가 유지됐으며 이번 probe는 소유 PID를 확인한 SIGTERM/exit0 후 listener가 없다. 운영 process·기존553xx·lock·backup은 조작하지 않았다. [최종 보존 확인](evidence/vercel-auth-preflight-2026-10-18/final-artifact-preservation.json).

독립 어댑터·플랫폼 검토는 요청된 `gpt-6.1-sol`로 위임했고 메인이 결과를 직접 대조했다. 모델 사용 제한은 관측되지 않았으며 도구 인터페이스가 모델 내부 identity를 별도로 인증하는 것은 아니다. 현재 환경의 cached builder를 사용했으므로 hosted builder 선택과 동일하다는 보장은 없다. Aside의 기존 로그인으로 설정을 읽고 소유 tab/session만 닫았다.

증거는 [목록과 사용 경계](evidence/vercel-auth-preflight-2026-10-18/README.md), [기계 판독 요약](evidence/vercel-auth-preflight-2026-10-18/summary.json), [해시 manifest](evidence/vercel-auth-preflight-2026-10-18/evidence-manifest.json)에 있다. 원본 packaging map의 로컬 generated bypass token은 저장소 복사에서 제외했다. 실제 secret·회원 식별자·운영 데이터는 새 증거에 넣지 않았다. 이전 보고서에는 최신 결과 링크만 추가하고 기존 manifest 원본을 보존한 뒤 해당 문서 항목만 갱신했다.

**완료:** 프로젝트 관측, 로컬 어댑터/패키징 가능성 검증, 독립 검토, 다음 검증·승인안 준비. **미완료:** 배포 가능한 Vercel artifact, OP-01–03 운영 조건, 실제 provider/메일/HTTPS 및 권한·저장 보호·언어·재시작 운영 검증. Estimate 전체 browser 재실행 및 Home 기존 광역 검사 한계도 이전 결과대로 남는다. 최소 재개 조건은 공급자 지원 근거 확보 또는 사용자가 검토할 명시적인 계약·아키텍처 변경 방향이다.
