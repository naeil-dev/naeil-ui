# 인증 callback 고정 복귀 경로 — 2026-10-18

사용자가 승인한 고정 복귀 경로의 로컬 구현·격리 검증·후보 패키징을 완료했다. 독립 리뷰에서 발견한 원문 query 변형 문제는 수정 후 재검증했다. **인증 운영 배포와 실제 회원·관리자·서비스 권한 적용은 하지 않았다.** 실제 Vercel 동작·ingress·로그 보호와 실계정 HTTPS 검증은 아래 운영 조건으로 남아 있다. [이전 준비 결과](auth-transition-preparation-2026-10-18.md)의 영속 초대와 Home 조정은 보존했다.

후속 [Vercel 사전 검증 결과](vercel-auth-preflight-2026-10-18.md)에서 현재 production health query의 플랫폼 로그 보존과 빌더 rewrite의 가용성 위험을 확인했다. 인증 활성화는 보류하며, 다음 단계는 해당 문서의 공급자 지원 확인 또는 명시적 계약·아키텍처 재검토를 따른다. 아래 로컬 결과와 동결 artifact는 그대로 보존한다.

## 변경과 소스

Jev·Estimate·Home은 Supabase의 `redirect_to`만 각각 `https://naeil.dev/auth/return/jev`, `/abestimate`, `/console`로 바꾸고 기존 nonce query를 유지한다. 사이트는 고정된 서비스 callback으로 GET303 전달만 한다. 기존 verifier/S256·cookie binding·최종 세션 생성·권한 검사는 각 서비스에 그대로 남는다. 자동 SSO·전역 logout·언어 동기화·견적 본문 번역·공통 UI 변경은 없다.

Home 대상은 사용자가 확인한 `https://jay-macmini-2.tail165003.ts.net:2455/api/console/auth/callback`이다. 모든303 Location은 명시적 빈 fragment `#`로 끝난다. GoTrue 오류 fragment가 다음 hop으로 상속되지 않는다. HEAD와 앱에 도달하는 비GET 요청은405/Location 없음이다. 원문 query16384바이트·code4096문자 제한, canonical nonce, 엄격한 decode/중복/오류 검사와 no-store/no-referrer 등 응답 경계를 검증했다. 사이트 relay는 cookie/Auth/DB/network/권한 작업을 하지 않는다.

| 담당 범위 | 작업 위치와 실제 HEAD | 최종 제품 변경 |
| --- | --- | --- |
| 사이트 | `/Users/jaymini/.paseo/worktrees/28nele6j/naeil-account-language` · `02aa72e6e702bf6726659c6e7179e648eb648141` | 순수 parser, 좁은 Pages API adapter, namespace 보호와 rewrite |
| Estimate | `/Users/jaymini/.paseo/worktrees/1bnldk74/estimate-account-language` · `860e79b3f47f9fe33028879adb50fdc75a94b6b8` | authorization URL 생성기만 변경 |
| Jev | `/Users/jaymini/.paseo/worktrees/3tl6a87q/jev-account-language` · `2fc435a35910bbca758802909ed46f81c3cda874` | authorization URL 생성기만 변경 |
| Home | `/Users/jaymini/.paseo/worktrees/3qtenke4/naeil-home-account-language` · `e14229709ffbe7bed791e69eb780b9f7096605c5` | 기존 조정 후보 위 Console authorization URL 한 곳 변경 |

메인 작업 위치 `/Users/jaymini/.paseo/worktrees/28nele6j/pure-chicken`의 HEAD는 `9f83816f973618aa77c2bba56b6fa9319ef1fc3d`이며 clean이다. 새 commit은 없다. 소스·테스트·문서는 미커밋 검토 snapshot이며 제품 identity의 `development`를 실제 clean revision으로 가장하지 않는다. 구현3개 담당과 독립 리뷰는 `gpt-6.1-sol`로 수행했고 메인이 통합·fixture·원문/산출물 검토와 최종 보존 확인을 맡았다. 모델 제한은 없었다.

### Next 원문 처리 보완

실제 standalone HTTP에서 Next16.1.7의 proxy와 App Router가 handler 전에 query를 정규화하는 것을 재현했다. 최종 adapter는 `src/pages/api/internal/service-return.ts`에서 Next의 private `getRequestMeta(req).initURL` own data descriptor만 읽는다. 버전 불일치/metadata 부재는503, 원문 Host 중복·비canonical path·직접 internal API 접근은 거부한다. `req.url`, `req.query`, 외부 routing header로 대체하지 않는다.

`new Request`로 다시 만들면 apostrophe가 확장되고 끝 공백이 잘리는 독립 리뷰 지적도 수정했다. 현재는 원문 문자열을 구조적 request 입력으로 parser에 직접 전달한다. [보안 리뷰](evidence/exact-callback-return-2026-10-18/security-review.md)의 RAW-01은 RED 회귀 및 새 immutable 후보로 종료했다. private API에 대한 로컬 증거이며 실제 Vercel 지원을 뜻하지 않는다. [검토된 명세](../superpowers/specs/2026-10-18-exact-callback-return-design.md)의 당시 bytes/SHA256 `7da4163bd9743ec75c599b4d214ceb33dc34ad0f7fc54f7fac79636c0a680a66`은 보존하고, 승인·구현 조정은 [실행 계획](../superpowers/plans/2026-10-18-exact-callback-return-plan.md)에 기록했다.

## 검증 결과와 범위

| 대상 | 최종 확인 | 근거 |
| --- | --- | --- |
| 사이트 |479 tests 통과/기존5 skips; relay 관련169; type/lint/build·무결성; 실제 원문 HTTP90사례와 기존 경로7 smoke | [담당 보고서](evidence/exact-callback-return-2026-10-18/task1-report.md), [HTTP 결과](evidence/exact-callback-return-2026-10-18/site/http-verification.json) |
| Estimate |724 tests/50files; type/lint/build/패키징·제한된 실제HTTP 통과 | [담당 보고서](evidence/exact-callback-return-2026-10-18/task2-report.md) |
| Jev |132 tests/17files; type/lint/build/패키징·제한된 실제HTTP 통과; 동결 후 명시적 transport mapping을 추가한 test-only 최종46사례 통과 | 같은 담당 보고서. 동결 runtime은 변경 없음 |
| Home |focused135 tests; type/Ruff/format·OpenSpec strict 및 main58spec 통과; network-none/read-only/tmpfs 이미지 smoke | [담당 보고서](evidence/exact-callback-return-2026-10-18/task3-report.md) |
| 로컬 실제 GoTrue |v2.197.0의 query/fragment/relay 및 PKCE10사례 통과 | [실행 결과](evidence/exact-callback-return-2026-10-18/upstream-runtime-result.json) |
| Estimate·Jev 통합 |각7사례, 실제 로컬PKCE 교환 총6회·브라우저 redirect chain8개 | [구간별 합산 결과](evidence/exact-callback-return-2026-10-18/cross-service-integration-result.json) |
| Home 통합 |실제 built site HTTP → 실제 Home ASGI finalizer7사례 통과 | [별도 보고서](evidence/exact-callback-return-2026-10-18/home-relay/report.md), [요약](evidence/exact-callback-return-2026-10-18/home-relay/summary.json) |

Estimate·Jev는 **한 번의 전체 성공 실행이 아니다**. `cross-service-run-9ag0Dq`에서 Estimate7사례 완료 후 Jev의 `SameSite=lax` 표기를 대소문자 구분한 harness assertion이 실패했다. assertion만 수정하고 `cross-service-run-UxhdoV`에서 Jev7사례를 따로 완료했다. 원래 첫 실행의 `passed:false`와 두 원본 해시를 보존했다. 성공/취소를 JavaScript off/on에서 확인하고401·미허용403·의존성 장애503/로컬 logout/세션 부활 없음·잘못된 binding·동시 finalizer 단일 교환·replay·저장된 경로/언어/hash·cookie 회전을 확인했다.

브라우저는 별도 Chrome155 프로필이며 OS sandbox로 IP 연결을 전용 loopback proxy에 제한했다. 두 정책의 직접 외부 TCP 시도가 EPERM으로 거부된 [별도 영수증](evidence/exact-callback-return-2026-10-18/sandbox-network-probe-result.json)도 남겼다. proxy는 고정 host만 로컬 built 서버와 Auth로 전달하고 background CONNECT를 거부한다. 테스트 TLS는 임시 self-signed 인증서와 브라우저 인증서 검사 해제를 사용했다. 실제 운영 HTTPS가 아니다. 최초 bootstrap/login POST는 harness, 최종 saved destination은 inert landing이다. 전체 앱 로그인UI/편집/저장 guard browser suite를 다시 실행한 것으로 세지 않는다.

성공은 실제 로컬 email PKCE/SMTP capture와 공통 성공 경로를 사용했다. 취소는 실제 GoTrue의 dummy-provider 오류 생성 경로에 가상 거부를 넣었다. Google/GitHub 실제 identity 인증은 하지 않았다. Home7사례는 Google/GitHub·취소·오류·wrong2456→2455·staleA가B를 종료하는 기존 동작을 검사했지만 exchange/user/RPC는 synthetic이다. Home 브라우저/SameSite/실TLS/실제GoTrue 교환 증거는 아니다. Home의 프로세스 재시작 시 개인 세션 소멸과 staleA-clearsB 한계는 그대로다.

## 동결 산출물

증거 root는 `/private/tmp/naeil-exact-return-20261018-pqjb9hzp`다. [기계 판독 요약](evidence/exact-callback-return-2026-10-18/summary.json), [최종 원문·archive 대조](evidence/exact-callback-return-2026-10-18/final-artifact-preservation.json), [증거 해시](evidence/exact-callback-return-2026-10-18/evidence-manifest.json)를 함께 사용한다.

| 대상 | 사용할 후보 | 식별자와 SHA256 |
| --- | --- | --- |
| 사이트 | `/private/tmp/naeil-site-exact-return-g7cbcwl7/standalone.tar.gz` | artifact `exact-return-20261018-2b6a8414d4a4-25e940f7`; archive `a7748577a7f38320434ab2cdfe0da53fe127ea5d0f1112ce3670ec376abe432b`; receipt `0113cf2f3926a059407b54cea14c59e23c4670029df40cbe4252d064a6d13b62` |
| Estimate | root 아래 `task2/estimate-final-source/release/860e79b3f47f-94b7803f25a0` | artifact `e3916abe-760d-4827-ac44-b83396f0d92e`; manifest `9ef6706972ab32954bd59467dddf2b2f18ef686597a71edc804519f75659431d`; source archive `e1da0b53ecbd818b977377c41b6c13a9a7ed157339f0cc6c901e99b30dcc876f` |
| Jev | root 아래 `task2/jev-candidate/standalone.tar.gz` | artifact `jev-exact-return-development-cbedff00-5be8-4b8c-9726-940991cf0da4`; archive `6e6aaff4133b463de2162c4dc31ee5cd8f3c9e609e51ccf24597379e05148281`; receipt `dc08c640108acf5af3759792ef785849de154ce0f3fa24c213aad891a366cbb6` |
| Home | root 아래 `task3/runtime/home-console-exact-return-image.tar.gz` | image `sha256:8599c7f1a6837afb40de1f7011ab0f5226508ef188360ebd799c814c48c76275`; archive `1dfed44d6e09949982f7e0ce6be222aa67f13d1da5953a4cc6900c58ca3623fe` |

독립 리뷰에서 사이트 runtime3211files/24links/source223, Estimate runtime2958/source289, Jev runtime2161/source169, Home 원래36layers+overlay1·runtime469/overlay52를 대조했다. 메인은 마지막으로 archive·receipt13개와 현재 source map을 직접 재대조했다. Jev의 동결 이후 test-only 차이는 원본/최종 해시로 명시했으며 runtime 차이가 아니다. Home 새 overlay의 이전 조정 후보 대비 제품 차이는 Console API 한 곳뿐이다.

사이트는 실제 공개 Auth 설정의 fingerprint로 로컬 빌드한 standalone이다. Vercel Build Output/운영 적격 artifact가 아니다. offline Webpack/font 입력 제약을 유지한다. 앞선 사이트 실패 후보4개와 Estimate AppleDouble metadata가 있던 첫 archive, 모든 이전 인증/UI artifact를 보존했다. 실패 후보를 다시 성공으로 기록하지 않는다.

## 실패 이력과 보존

[이전 통합 시도](evidence/exact-callback-return-2026-10-18/integration-earlier-attempts.json)에 harness 실패를 남겼다. 처음 Playwright interception이 redirect 요청을 전부 가로채지 못해 가상 GET chain2개가 공개 naeil.dev의 아직 없는 return 경로에 도달했을 가능성이 있다. 무효한 로컬 가상 code/nonce만 사용했고 실계정·운영 권한·설정 변경은 없다. 해당 시도는 통과/격리 증거에서 제외하며, 이후 OS sandbox·loopback proxy로 제한한 실행과 구분한다.

Node fetch의 Host 처리, 설치된 Chrome 경로, 로컬 email cap429, sandbox IPC 설정, 디스크 ENOSPC, cookie 표기 assertion 문제도 보존했다. 제품 코드를 바꿔 우회하지 않았다. 로컬 fixture만 email cap100으로 조정했다. 디스크 부족 때 현재 소유권·종료 상태를 확인한 이번 작업의 disposable runtime 복제21개만 삭제했고 원본 artifact·로그·보존 fixture는 남겼다. [삭제 영수증](evidence/exact-callback-return-2026-10-18/disposable-clone-cleanup.json).

가상 사용자9명은 이번 fixture의 소유 ledger만 대조하여 정리했다. 종료 전 users/flows/members/admins/grants/operations/audit는0, 서비스2행은 기존 unverified/active 상태 그대로다. [종료 기록](evidence/exact-callback-return-2026-10-18/fixture-final-stop.json)에 신규/대체 container8개 보존·정지를 기록했다. Kong/Auth/PostgREST/DB는 SIGTERM exit0; 기본 SIGTERM을 무시한 전용 SMTP2개는 연결이 없음을 확인하고 Python의 SIGINT handler로 종료(exit130)했다. SIGKILL·lock 삭제·기존 fixture/운영 process 조작은 없다. network는 일반 bridge이며 `internal` 격리라고 주장하지 않는다. host 공개는127.0.0.1:55821/55822로 제한했다. 재개 때 과거 PID·종료 helper를 재실행하지 말고 소유권을 새로 확인한다.

마지막 읽기 전용 확인에서 Home 운영455/455, Estimate current 링크와 원본7worktree HEAD/status가 유지됐다. terrific-buffalo의 source-log/mockup dirty 상태도 보존했다. 운영 업무 데이터·backup·보안 파일 내용은 읽거나 복사하지 않았다. 공개 UI identity는2026-10-18 14:16JST 관측에서 세 서비스 모두 UI0.7.1/contract1과 기존 revision 그대로다. [공개 결과](evidence/exact-callback-return-2026-10-18/public-identities-final.json). 모든 세션에 다른 agent가 없다고 보장하지 않는다.

## 남은 운영 조건과 다음 순서

1. **실제 Vercel artifact/adapter 검증:** pinned Next16.1.7의 private `initURL`·raw Host·원문 path/query 보존을 실제 선택된 hosting에서90사례 기준으로 확인한다. 로컬 성공으로 대체하지 않는다. metadata 부재는503으로 닫히지만 로그인이 불가능하므로 활성화 조건은 충족되지 않는다.
2. **실제 ingress와 로그 보호:** Next dispatch 전 중복 slash/backslash의 query-bearing308 및 TRACE500은 앱 보호에 도달하지 않는다. 실제 ingress에서 안전한 거부/응답을 검증한다. Next 자체가 `req.url`을 trace의 `http.target` 등에 담는 경로가 있으므로 stdout이 조용하다는 이유로 query 비노출을 주장하지 않는다. 두 hop의 platform/ingress/tracing/error 로그가 전체 authorization URL/query를 남기지 않는 근거가 필요하다. 충족할 수 없으면 활성화를 멈추고 설계를 다시 검토한다.
3. 검토표의 schema001–004·signup·SMTP·server-only secret·기존 Jay UUID/sole admin/명시 grant 적용안을 각각 구체화하고 필요한 대상별 승인을 받는다. Google/두 서비스 허용 의향과 기존 사용자 확인은 완료했지만 실제 등록·권한은 미적용이다. 기존 Site URL/callback3개를 유지하는 설계이며, 보류한 정적 callback3개 추가나 wildcard를 적용하지 않는다.
4. 승인된 전환에서는 relay를 소비 앱보다 먼저 배포·검증하고, 참조하는 소비 앱과 진행 중 시도가 모두 사라질 때까지 유지한다. relay 없는 예전 사이트는 호환 rollback 후보가 아니다. 서비스별 실제 writer/데이터·backup·인증 설정 보존을 직전에 확인한다. 중앙 정책 집행 뒤 password-only rollback은 금지한다.
5. 실제 배포 artifact와 승인된 계정/수신함/HTTPS에서 로그인·초대,401/403/503,권한 회수/장애 logout,계정 전환·저장 보호·언어·재시작을 확인해야 운영 완료다. Estimate 전체365 browser 재실행 미완료, Home 기존 광역 backend4실패/type72진단은 이번 범위로 닫지 않았다.

다음 우선순위는1–2의 실제 Vercel 배포 후보·ingress/logging 검증안을 만드는 것이다. hosted 변경·배포 자체는 별도 구체 승인 대상이며, 완료한 로컬 제품 suite를 문서 갱신 때문에 반복하지 않는다.
