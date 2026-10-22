# 인증 통합 메인 인계 — 2026-10-19

최신 인계 관측: [방향 검토 이후 새 메인 인계](auth-direction-handoff-2026-10-19.md). 17:16 JST부터 지정 경로·담당·보호 소스·fixture만 대조했고 인계 자료를 저장했다. 새 구현·운영 적용·에이전트 생성은 없다. 실제 재개 지점과 승인/제안 구분은 이 최신 인계를 따른다.

최신 방향 검토: [Opus 5.5·GPT-6 Astra 종합 검토와 실행 계획 제안](auth-direction-review-2026-10-19.md). 두 모델의 독립·교차 검토 결과, 새 한 지점 관측은 현재 보류하고 OP01–03 충족 수단·결정표와 Home/Estimate 보존·복구·종료안을 병행해 구체화할 것을 권고했다. 기존 Jay→Estimate, Home·중앙 정책·relay 및 보안 조건은 유지한다. 이번은 검토·제안이며 새 구현·설계 변경·운영 적용 승인이 아니다. 원 증거와 아래 역사 기록을 보존한다.

직전 조사: [query 변형 경계 조사와 최소 로컬 진단 후보안](auth-boundary-preparation-2026-10-19.md). middleware serializer는 네 변형 중 세 가지의 로컬 후보이나 전달 연결과 D12는 미입증이다. 새 한 지점 관측의 구체적 로컬 준비 범위를 독립 검토했고 구현 결정은 남았다. 새 observer/schema/artifact·hosted 적용은 없으며 기존49/8/13과 양 hop/Host/ingress 조건을 유지한다.

직전 후속: [2026-10-19 승인된 Preview baseline178 실행·정확한 키 회수 결과](auth-preview-baseline-result-2026-10-19.md). 해당 일회성 적용은 승인 후 완료됐으나 query 보존308·헤더 불일치·metadata 변형 및 양 hop 비노출 조건 때문에 운영 수용은 미완료다. 새 WAF/로그/probe/Production 적용 승인은 없다. 이전 [실행 준비](auth-preview-baseline-readiness-2026-10-19.md)와 [Preview 생성 결과](auth-preview-created-2026-10-19.md)는 각 시점 기록으로 보존한다. 아래는 인계 당시 기록이며 최신 적용 결과가 우선한다.

이 문서는 새 메인에게 현재 순서 전체와 후속 요청을 넘기기 위한 기록이다. 인계 요청은 새 구현·설계 변경·운영 적용 승인이 아니다. 이번 턴은 파일/증거/담당/실행 상태의 읽기 전용 확인과 이 문서·증거 저장만 수행했다. 새 에이전트 생성, 후속 구현, 추가 기능 검사, 운영 변경, 프로세스 제어는 하지 않았다. 이전 문서와 manifest는 보존했다.

## 최신 대화와 실행 우선순위

사용자는 “naeil.dev는 이미 Vercel이고 메일 초대도 하지 않았나, 왜 이 작업이 필요한가”라고 물었고 쉬운 설명을 요청했다. 메인은 기존 운영과 새 통합 후보를 혼동하게 설명한 점을 정정했다. 이어 사용자가 올바른 다음 작업을 물었을 때 메인은 아래 순서를 제시했고, 사용자는 **현재 순서 작업 전부를 새 메인에게 인계**하도록 요청했다.

1. 기존 Vercel·Supabase·Jay 계정을 유지하고, **기존 Jay → AB Estimate 한 서비스**의 인증 전환에 필요한 실제 배포물·설정·보존/복구안을 먼저 완성한다. Home 개인 관리자·중앙 회원/권한·고정 callback relay 등 선행 의존성은 생략하지 않는다.
2. 대상/전후 변경/산출물/보존·복구가 구체화된 각 적용만 승인받는다. 승인 후 relay 먼저 검증하고 실제 HTTPS에서 Estimate의 로그인·권한 허용/차단·회수·계정 전환·저장 보호를 확인한다.
3. 그다음 Jev와 새 회원 초대로 확장하고 전체 완료 기준을 확인한다. 새 초대 메일 준비를 기존 Jay 계정의 로그인 전환 **준비**를 막는 선행조건으로 만들지 않는다. 최종 목표에서 초대·실메일 검증을 삭제한 것은 아니다.

이는 작업 우선순위다. 새 schema/비밀/회원/권한/배포를 실제 적용하거나 기존 보안 조건을 완화한 승인이 아니다. “Estimate만 간단히 연결”을 이유로 중앙 정책·Home 관리자 선행조건·현재 권한 검사·데이터 보호를 우회하지 않는다. 새 메인의 첫 산출물은 이 한 서비스 기준의 구체적 적용안이며, 이미 통과한 suite 반복 자체를 진척으로 삼지 않는다.

### 메일에 관한 사실·미확인·제안 구분

- **확인된 사실:** 보존된 운영 조회에서는 Supabase built-in email 사용 상태였다. 현 공개 사이트 identity가 가리키는 source `ff372235cda3091fd392dc0c4f53932825428f2c`에는 Google/GitHub OAuth와 `/auth/callback`이 있다. 그 source에서 새 `/auth/invite` 및 메일 초대 발송 구현은 확인되지 않았다. `git grep`로 본 코드 범위의 사실이며 Supabase 관리 화면에서 수동 발송한 적이 없다는 뜻은 아니다.
- **별도 새 구현:** H의 `app/modules/console/invitations.py`는 Auth `generate_link`로 증명을 만들고 별도 SMTP로 `/auth/invite#...` 링크를 보낸다. S의 새 초대 수락 경로와 중앙 회원·서비스 권한은 현재 후보다. Home의 [초대 계약](/Users/jaymini/.paseo/worktrees/3qtenke4/naeil-home-account-language/openspec/changes/naeil-console-access/invitation-contract.md)을 따른다.
- **미확인:** 사용자가 기억하는 기존 초대 메일의 실제 발송 화면/주체/링크 흐름은 확인되지 않았다. built-in email 설정만으로 실메일 초대 흐름을 검증했다고 쓰지 않는다. 범위를 정한 기존 코드·설정의 읽기 전용 확인으로 먼저 좁히고, 여전히 구분되지 않으면 발송했던 화면만 짧게 확인한다. 실제 수신함/토큰/개인 식별자를 대화나 Git에 복사하지 않는다.
- **검토할 제안:** 기존 메일 발송을 재사용할 수 있는지 확인한다. 별도 메일 시스템이 통합의 보편적 필수조건이라고 단정하지 않는다. 다만 현재 Home 후보는 직접 SMTP에 의존하므로 이를 없애거나 Supabase 발송으로 교체하는 새 설계·구현은 승인되지 않았다. 현재 초대 계약의 보안/수락/재발송/불확실 상태 조건을 유지한 채 필요성을 설명하고, 변경이 필요하면 구체적 차이를 제시한다.
- “실메일 미검증”은 **새 통합 초대 흐름**을 실제 메일·HTTPS로 끝까지 검증하지 않았다는 뜻이다. 기존 서비스의 메일 기능이 없거나 고장났다는 판정이 아니다.

## 목표·승인 경계

naeil.dev·AB Estimate·Jev·Home Console의 인증 운영 전환을 현재 호스팅에서 완료한다. 사이트=Vercel, E/J=Mac mini, 로그인=Supabase Auth. Home은 `https://jay-macmini-2.tail165003.ts.net:2455` 유지 확정. 전체 Vercel/업무 데이터 이전은 제외한다.

기존 승인된 구현·격리 검증·운영 준비·읽기 전용 조사는 반복 승인 없이 진행할 수 있다. 실제 hosted schema/설정, 비밀 등록, 회원/권한, 실메일, push/main merge/배포, DNS/tunnel, 운영 프로세스 제어는 포괄 승인되지 않았다. 정확한 적용 단위의 대상·변경·산출물·보존/복구를 완성한 뒤 적용만 승인받는다.

Jay 1명 초기 관리자와 회원별 명시 허용표를 유지한다. Google·기존 UUID·두 서비스 허용 의향은 확인됐으나 등록/grant는 미적용이다. 다시 계정을 만들거나 의향/UUID를 재질문하지 않는다. 비공개 운영 검토표 위치·0600·용도는 [운영 준비 결과](auth-transition-preparation-2026-10-18.md)의 「Jay」「운영 적용 전 검토표」를 따른다. 비밀·실제 식별자를 공개하지 않는다. signup OFF는 ESG/Work의 새 계정 최초 가입에도 영향을 준다.

## 실제 위치·보호할 변경

| 역할 | 경로 | HEAD |
| --- | --- | --- |
| shared / 메인 cwd | `/Users/jaymini/.paseo/worktrees/28nele6j/pure-chicken` | `9f83816f973618aa77c2bba56b6fa9319ef1fc3d` |
| S | `/Users/jaymini/.paseo/worktrees/28nele6j/naeil-account-language` | `02aa72e6e702bf6726659c6e7179e648eb648141` |
| E | `/Users/jaymini/.paseo/worktrees/1bnldk74/estimate-account-language` | `860e79b3f47f9fe33028879adb50fdc75a94b6b8` |
| J | `/Users/jaymini/.paseo/worktrees/3tl6a87q/jev-account-language` | `2fc435a35910bbca758802909ed46f81c3cda874` |
| H | `/Users/jaymini/.paseo/worktrees/3qtenke4/naeil-home-account-language` | `e14229709ffbe7bed791e69eb780b9f7096605c5` |

S/E/J/H의 `integrate/console-account-language-{site,estimate,jev,home}`에는 미커밋 후보 구현이 있다. HEAD만 checkout하면 구현을 잃는다. 기존 11경로와 원본 branch/dirty 상세는 [저녁 인계](auth-main-handoff-2026-10-18-evening.md)의 「현재 작업 위치와 보호할 변경」 및 그 original-worktrees 연결을 따른다. terrific-buffalo의 source-log/mockup, 기존 dirty 소스와 모든 fixture/volume을 보호한다. 공유 UI0.7.1은 운영 중이며 이번 목표로 UI를 다시 설계하지 않는다.

각 target의 AGENTS.md/STATUS.md와 `/Users/jaymini/AGENTS.md`를 따른다. H는 OpenSpec SSOT이며 `openspec/changes/naeil-console-access/{baseline.md,baseline-manifest.json,invitation-contract.md}`와 `durable-invitation-state/`, `reconcile-home-production-source/`, `exact-console-auth-return/`를 읽는다. UI를 실제로 바꿀 때만 DESIGN.md와 연결된 UI 명세까지 적용한다.

## 읽을 순서와 근거

1. 이 문서 전체 — 최신 대화·순서·관측과 승인 경계.
2. [10/18 후속](auth-main-continuation-2026-10-18.md) 전체 — 최신 literal build/운영 후보/플랫폼 한계. 그 [메인 검토 보완](evidence/auth-main-continuation-2026-10-18/root-review-decisions.md)은 배포와 service verified의 순환 선행조건을 만들지 않도록 반드시 읽는다.
3. [10/18 재개](auth-main-resumption-2026-10-18.md)의 OP-01–03/운영표와 [저녁 인계](auth-main-handoff-2026-10-18-evening.md)의 경로/재조회 방법. 최신 결과가 과거 상태보다 우선이다.
4. [exact callback](exact-callback-return-2026-10-18.md)의 검증/동결 산출물/남은 운영 조건과 [Vercel preflight](vercel-auth-preflight-2026-10-18.md)의 OP/어댑터. 연결된 `docs/superpowers/specs/2026-10-18-exact-callback-return-design.md`, `2026-10-18-durable-invitation-design.md` 및 대상별 명세를 따른다.
5. [운영 준비](auth-transition-preparation-2026-10-18.md)의 완료 범위/운영 검토표와 [전환 순서](account-language-transition-2026-10-17.md)의 중단·복구. 최신 우선순위는 이 문서지만 기존 안전 의존성은 유지한다.

## 구현·검증·운영의 경계와 중단 지점

- 인증, 계정 전환/저장/언어 보호, 영속 초대, Home 운영 소스 조정, 고정 callback relay의 구현·로컬 검증은 기존 결과 문서대로 완료됐다. 새 운영 인증 배포·실provider·새 초대 실메일·실계정 HTTPS 수용 검증은 미완료다.
- literal rewrite는 scratch의 `next.config.ts`와 routing 회귀2개에 한정한 후보다. Webpack 전체 compile와 83 tests/70 보호 HTTP/10 emitted 검사를 통과했다. **S 제품은 아직 wildcard이며 literal 미반영**이다. standalone/수동 builder 출력은 Vercel 배포본이 아니다. 정확한 source/archive/hash/명령은 `evidence/auth-main-continuation-2026-10-18/literal-build/{report.md,artifact-identities.json,candidate.patch,safe-evidence-manifest.json}`를 따른다.
- 지원 CLI build는 local Project Settings 부재로 실패했다. 기본 Turbopack은148초 동안 진행이 없어 소유 PID를 SIGTERM으로 종료했으며 원인은 미확정이다. 단순 성공 Webpack 결과로 둘을 닫지 않는다. 정확한 settings/build/runtime 입력과 깨끗한 배포 artifact·실행 가능한 synthetic diagnostic이 아직 없다. 진단 schema/요청표만 있으며 최대280 요청은 미실행이다.
- raw Host=`naeil.dev`, Next16.1.7 own initURL/503, strict parser, 고정303/빈 `#`, E/J/H finalizer를 보존한다. `path`/`nxtPpath` 제거·허용, Preview/forwarded Host 허용으로 우회하지 않는다.
- OP-01은 무해한 health query의 로그 저장 관측이며 실제 인증정보 유출 관측이 아니다. 양 hop query 비노출 명세는 유지한다. PKCE로 로그 허용을 단정하지 않는다. 접근/보관 확인은 부분적이다. 공급자 추가 문의는 중단됐고 사람 케이스/답변 대기를 재개하지 않는다.
- OP-02의 앱 이전 slash/backslash308·TRACE는 남아 있고 WAF Deny는 미검증 후보다. OP-03의 wildcard capture query와 제어 입력 실패는 확인됐으나 hosted 장애는 확인되지 않았다. literal의 로컬 성공은 실제 CDN 전달 증거가 아니다.
- schema guarded envelope/Jay bootstrap/동일 대상 owner recovery는 **적용 후보**다. 새 PostgreSQL의126검사는 fictional Auth schema/JWT-claim 모의이며 실제 GoTrue·서명 JWT·hosted 증거가 아니다. 메인의 DB 직접 재조회는 DB 종료 후라 실패했고 이를 독립 통과로 세지 않는다. SQL/해시는 `evidence/auth-main-continuation-2026-10-18/operations/operations-review.md`와 manifest에 있다.
- 실제 SMTP 발신/수신/횟수, 비밀 공급·보관 담당, Home mount/UID, owner 복구 접근/보관은 미확정이다. 기존 질문에 답이 없었다는 것을 승인이나 선택으로 처리하지 않는다. 현재 후보의 Home 직접 SMTP와 Supabase SMTP는 별개다.
- 유지할 이전 한계: Estimate 전체 browser365 미재실행, Home backend4실패/type72진단, E/J segmented 통합·Home synthetic ASGI. 상세와 범위는 기존 결과 문서에 있다.

## 2026-10-19 관측과 담당

06:10–06:13 JST 인계 조회다. [상태 원문](evidence/auth-main-handoff-2026-10-19/state-observation.json), [담당·Home](evidence/auth-main-handoff-2026-10-19/agents-home-observation.json), [공개 identity 대조](evidence/auth-main-handoff-2026-10-19/public-followup.json), [최종 정적 확인](evidence/auth-main-handoff-2026-10-19/final-checks.json)을 따른다.

- 11경로 HEAD/status는 직전 후속 결과와 일치했고 diff-check0이었다. S225 입력·원 archive/receipt/spec13개·이전5개 manifest의 열거 파일/관련 파일 해시는 일치했다. 인계 저장 후 추가되는 것은 이 문서와 새 증거 폴더뿐이다.
- native 현재 메인만 running; `literal_build`, `operations_prep`, `platform_prep`는 모두 **이번 재조회에서도 completed**였다. 각각 scratch literal build/routing, scratch SQL/운영표, 읽기 전용 접근/ingress 계획을 담당했고 제품 편집권은 없었다. `gpt-6.1-sol/high`로 위임한 기록이 있다. 새 작업을 맡길 때 범위를 새로 지정한다.
- Paseo의 shared/S/E/J/H 5개 cwd 조회는 현 메인 `1554a9ca-8573-4e12-91b1-6cb528c0534f`만 running, shared의 다른8명 idle, S/E/J/H별0명이다. 같은5개 cwd terminal 조회는0이었다. 알려진 build/runtime/docker-client PID6개는 현재 없으며 지정18포트 중55321/55322만 listening이다. 다른 세션/포트/프로세스까지 무작업이라고 보장하지 않는다. 메인은 인계 기록만 작성 중이며 남은 tool/test 실행을 새 메인에게 위임하지 않는다.
- exact8/durable4 container는 기존 exited, 보호553xx4개는 기존 running이다. 새 `naeil-auth-ops-20261018-igri1ekq`는 **idle running**이며 `docker top`에는 sleep 하나뿐이다. DB smart stop의 과거 exit0은 lifecycle 영수증 근거다. network none/read-only/bind·volume·published port0. 종료됐다고 쓰거나 임의 정리하지 않는다.
- 공개 세 UI identity는 UI0.7.1/contract1과 source/artifact가 동일하다. Python 요청은 E/J에서 HTTPError였고 상태코드는 기록하지 못했다. 기존 curl 방식의 한 번 대조는 양쪽 성공했다. 원인 미확정이며 로그인 장애로 단정하지 않는다. 첫 비교가 prior wrapper와 identity를 비교한 오류는 원값을 남기고 `correctedIdentityMatches`로 수정했다. Home manifest-listed 소스455/455와 identityStable=true, Estimate current 링크도 동일하다. 이는 로그인/writer/data 검증을 대신하지 않는다.
- scratch `/private/tmp/naeil-auth-main-20261018-igri1ekq`는 존재하고0700이다. 미래 접근은 보장되지 않는다. 전체 build/map에는 generated bypass 값이 있으므로 Git/외부/대화로 복사하지 않는다. 저장된 safe evidence를 우선하고 사용할 artifact는 다시 해시 대조한다.
- 이전 Aside 작업은 요청 모델 사용 불가로 기본 모델을 썼고 범위 밖 민감 탭 query가 도구 transcript에 출력되어 중단됐다. 값을 새 raw/Git/대화로 옮기지 않았다. transcript 보관·소유 탭 정리는 미확인이다. 광역 탭 목록/브라우저 inventory를 재개하지 않는다. 필요한 특정 화면만 범위를 정해 읽는다.

재조회는 `collaboration.list_agents`, Paseo `list_agents({cwd,includeArchived:false,limit:100})`/`list_terminals({cwd})`, 각 repo의 `git rev-parse HEAD`, `git status --short`, `git diff --check`를 쓴다. 컨테이너의 정확한 ID는 상태 JSON에서 얻어 `docker inspect --format`의 identity/state/network/mount/owner 필드 및 필요시 `docker top`만 읽는다. 전역 docker/volume 내용을 탐색하거나 옛 PID로 제어하지 않는다. 공개 URL/포트/보존 명령은 [저녁 인계](auth-main-handoff-2026-10-18-evening.md)의 「실행 상태와 재확인 방법」 및 이번 JSON의 실제 입력을 따른다. H의 `python3 scripts/console-baseline.py`는 manifest-listed 소스만 비교하는 읽기 전용 도구다.

## 재개·적용·완료 기준

시작 직후 HEAD/status·담당·artifact hash·fixture 소유권을 최신 관측과 대조한다. 차이가 있으면 이유와 소유자를 확인하고 기존 작업을 덮어쓰지 않는다. 그 뒤 **literal 후보와 지원되는 Vercel Project Settings/build 입력을 대조하여, 기존 Jay→Estimate 연결의 배포 artifact·설정·보존/복구안을 완성하는 것**이 첫 구체 행동이다. 무조건 credential/env pull/login/link를 실행하지 않는다. 기존 schema/owner/Jay/service verification/grant 및 Home 관리자 의존성을 한 서비스의 적용표로 연결한다. 메일 재사용 검토는 별도 트랙이며 새 아키텍처로 자동 교체하지 않는다.

Preview deployment ID/hostname은 생성 후 얻는 출력이다. 먼저 존재하는 project/team·Preview·동결 artifact digest·보호·alias 금지를 승인 단위로 묶고, 생성된 ID/hostname을 확인해 probe 요청표를 다시 바인딩·해시한다. 현재는 적격 artifact가 없으므로 blanket 배포 승인을 요청하지 않는다. probe/WAF 적용도 필요한 단위만 구체화한다. 실제 personal JWT/고정service ID 증거, service verified, 명시 grant의 구분은 메인 검토 보완을 따른다. 유효하지만 미허용인 개인 JWT의403으로 검증할 수 있는 부분을 활용하되 임시 bypass grant나 verified 없이 grant를 허용하지 않는다.

승인 후 relay부터 검증한다. 서비스별 전환 직전 현재 writer 및 모든 data/backup/auth/config를 새로 확인·보존한다. 과거 PID·일회성 helper/cleanup 승인을 재사용하지 않는다. 강제kill·lock 삭제·backup 복원 금지. 중앙 정책 적용 뒤 password-only rollback 금지. relay는 참조 앱/진행 중 로그인 시도가 없어질 때까지 유지한다.

완료는 실제 artifact·승인된 실계정·HTTPS에서 로그인/초대,401/403/503,권한 회수·장애 logout,계정 전환·저장 보호·언어·재시작이 확인될 때다. 사이트/Jev ko/ja/en·Estimate ja를 유지한다. 자동 SSO·전역 logout·언어 동기화·견적 번역은 추가하지 않는다. 준비 완료/로컬 통과와 전체 운영 완료를 구분한다.

새 메인은 현재 작업과 이후 요청의 계획·분할·통합·최종 검증을 맡는다. 근거 충분한 완료 작업은 반복하지 않고 승인 범위는 자율 완료한다. 중요한 모호함·권한 부족·파괴적 조치만 확인한다. 실익 있는 독립 조사/구현/테스트/리뷰는 파일·범위·검증 기준을 정해 위임하고 가능하면 gpt-6.1-sol과 위험에 맞는 추론 수준을 쓴다. 결과를 직접 검토·검증하며 도구/모델 한계·전제 변경을 알린다. 막히면 독립 작업 후 미완료·최소 재개 조건을 보고한다. 완료 후 변경·이유·검증·제약·산출물·다음 우선순위를 보고하고 문서를 최소 갱신하며 미요청 개선을 실행하지 않는다.
