# 인증 메인 재개 후속 — 2026-10-18

[19시 재개 기록](auth-main-resumption-2026-10-18.md)과 [저녁 인계](auth-main-handoff-2026-10-18-evening.md)를 실제 환경과 대조하고 승인된 격리 검증·운영 준비를 진행했다. **제품 코드와 운영 설정은 변경하지 않았다.** literal rewrite는 새 scratch에서만 검증한 후보이며 S의 wildcard는 그대로다. 보안 정책·대체 전송 구조를 선정하거나 공급자 문의를 재개하지 않았다. 실제 인증 전환은 미완료다.

## 인수·보존 확인

21:17 JST [최초 상태](evidence/auth-main-continuation-2026-10-18/state-observation.json), 21:31 JST [fixture·worktree 대조](evidence/auth-main-continuation-2026-10-18/final-state-observation.json), 이 후속 문서 저장 후 [최종 정적 검증](evidence/auth-main-continuation-2026-10-18/final-checks.json)의 관측 범위를 구분한다. 새 산출물은 [증거 manifest](evidence/auth-main-continuation-2026-10-18/evidence-manifest.json)에 고정한다.

- shared/S/E/J/H HEAD는 각각 `9f83816`/`02aa72e`/`860e79b`/`2fc435a`/`e142297`로 같다. 11경로의 HEAD와 기존 dirty 작업을 보존했다. S의 최초 상태는 이전 재개 문서·증거 폴더 추가까지 반영한 최종 상태와 일치한다. 이번 저장소 변경은 이 후속 문서와 새 증거 폴더뿐이다.
- 공개 naeil.dev·Estimate·Jev UI identity는 이전 source/artifact와 UI0.7.1/contract1 그대로다. Home 운영 소스455/455, identityStable=true; Estimate current 링크도 같다. 새 로그인·writer·업무 데이터 보존 검증을 뜻하지 않는다.
- 원 archive/receipt/명세13개 SHA256, 이전 문의/사전검증/exact-return/재개 manifest는 모두 일치한다. 원 manifest를 수정하지 않았다. terrific-buffalo source-log/mockup, 기존 fixture/volume·dirty 소스를 보존했다.
- exact8/durable4 container의 exited 상태, protected553xx4개의 running 상태가 유지됐다. 지정15포트에서는55321/55322만 listening이다. volume 내용과 범위 밖 프로세스는 조회하지 않았다.
- shared와 S/E/J/H의 Paseo 조회에서는 현 메인만 running, 나머지8명 idle, S/E/J/H별0명이었다. 새 native 담당3명 `literal_build`, `operations_prep`, `platform_prep`는 `gpt-6.1-sol/high`로 작업하고 완료 알림을 반환했으며 최종 native 목록도 completed였다. 메인은 코드·하네스·산출물·해시를 직접 검토했다. 다른 세션 전체의 무작업이나 serving model 내부 identity를 보장하지 않는다.
- 비공개 검토표는 존재/0600만 확인했고 내용을 열거나 복사하지 않았다. 운영 SQL에는 실제 UUID·이메일을 넣지 않았다. 기존 Google/두 서비스 의향과 Home2455 결정은 재질문할 사항이 아니다. 브라우저 transcript 노출의 별도 한계는 아래에 기록한다.

## Literal rewrite 후보: 전체 로컬 컴파일과 라우팅

[후보 patch](evidence/auth-main-continuation-2026-10-18/literal-build/candidate.patch), [담당 보고서](evidence/auth-main-continuation-2026-10-18/literal-build/report.md), [메인 대조](evidence/auth-main-continuation-2026-10-18/root-build-review.json).

새 root는 `/private/tmp/naeil-auth-main-20261018-igri1ekq`다. 후보의 제품 차이는 `next.config.ts`의 wildcard를 세 literal beforeFiles rewrite로 바꾸는 것뿐이며 routing 회귀2개를 추가했다. parser·Pages adapter·proxy, E/J/H finalizer는 동일 bytes다. raw Host=`naeil.dev`, Next16.1.7 own initURL/503, strict query, 고정303/빈 `#`, alias 거부를 보존한다. `path`/`nxtPpath` 제거·허용이나 Preview/forwarded Host 허용은 없다.

| 새 검증 | 결과·경계 |
| --- | --- |
| 회귀 RED→GREEN | 기존 wildcard에서1실패/1통과 → routing2+adapter45+proxy36, 총83통과 |
| 실제 fresh compile | 이전 .next 없이 Next16.1.7 Webpack 전체 compile/type/static generation/trace 및 builder packaging 완료 |
| emitted routing |78routes, middleware10→literal11–13; 세 destination 모두 query 없는 internal 경로.10검사 통과 |
| 실제 fresh-built Next HTTP | 보호33통과, 별도 slash308·TRACE500 관측2개. 후자는 해결로 세지 않음 |
| emitted middleware/API + 라우팅 모델 | 보호33통과. CDN route engine을 실행한 것은 아니며 모델 TRACE500은 Web Request 생성 실패 |
| 직접 emitted API |4통과. 합계70개의 보호 HTTP 검사이며 hosted/CDN 성공 증거가 아님 |
| 수명·격리 | build/runtime outbound guard 기록0, OS deny-network. 새 HTTP 서버3개 SIGTERM/exit0·listener 종료 |

후보 source226 mapping SHA256은 `c570c8b9d05e2c47aebb0d068306b6e7e731bc311f6e00b98e013d880af3fb4a`, artifact는 `literal-return-20261018-c570c8b9d05e2c47`이다. local output1981파일/52links/26traces, archive SHA256 `319f2da721865c1966faeea034425dcec2dccc43f440604de723adfbeecfc443`. [정확한 산출물 목록](evidence/auth-main-continuation-2026-10-18/literal-build/artifact-identities.json)을 따른다.

**Vercel 배포 적격 artifact가 아니다.** cached CLI50.33.1/@vercel-next4.16.1/build-utils13.8.1, Node24.21.0 darwin-arm64, 설치 생략, Webpack override, offline font CSS 재구성이라는 차이가 있다. CLI의 writeBuildResult로 tree를 만들었지만 config.json은 builder 반환값을 조합했다. 실제 hosted builder/Fluid/input 전달과 동일하다고 볼 수 없다. 공개 Auth fingerprint는 기존 동결 후보에서 복구·새 client chunk와 대조했으며 비밀은 공급하지 않았다.

별도 supported CLI build는 local Project Settings 부재로 exit1이었다. 요청된 pull/login/link/token 조회는 실행하지 않았다. 별도 default Turbopack은148초 동안 optimized-build 시작 이후 진전이 없어 정확한 소유 PID를 SIGTERM으로 종료(exit143)했다. 원인은 미확정이며 lock은 자연히 사라졌고 삭제하지 않았다. 두 실패를 성공한 Webpack 검증과 구분한다. 원본 S225입력·이전 동결 archive는 그대로다. 생성된 bypass 값이 있는 전체 output/map은0700 scratch에만 보존하고 Git 증거는 safe manifest47파일만 복사했다.

## 로그·ingress 준비와 남은 조건

[접근 관측](evidence/auth-main-continuation-2026-10-18/platform/access-partial-observation.json), [검증안](evidence/auth-main-continuation-2026-10-18/platform/ingress-diagnostic-approval-scaffold.md), [합성 요청표](evidence/auth-main-continuation-2026-10-18/platform/probe-freeze.json).

- OP-01: 기존 무해한 health query의 로그 표시가 확정 사실이며 인증 code/nonce/token 유출 관측은 아니다. 양 hop app/tracing/ingress/platform query 비노출 명세는 유지한다. PKCE, Hobby1시간 조회 창, drain0으로 저장 허용·물리 삭제를 단정하지 않는다.
- 새 안전한 접근 관측은 Vercel 화면의 visible member1/Owner1뿐이다. 현재 세션 role·초대·token/integration·공유 링크·내부 보관 및 E/J Cloudflare/tunnel/local log, Home Tailscale/runtime log 범위는 미확인이다.
- OP-02: Raw Path/Method+Preview hostname/environment의 Deny2규칙 후보와 원문 HTTP/1.1/2 요청표를 준비했다. matcher/order·WAF 자체 로그·denial headers는 미검증이다. query-free403이어도 기존405/Allow·no-store/no-referrer/CSP 조건 충족을 자동 인정하지 않는다.
- OP-03: literal은 local capture query 위험의 좁은 검증 후보다. 실제 CDN→middleware→function·canonical authority303 검증은 남는다. 일반 Preview403을 성공303 증거로 세지 않는다.
- 최대280개 **미실행** 요청: 기존 제품 Preview403 6, 진단70, ingress 변경 전102/후102. redirect following·자동 재시도·provider·실code·app cookie는0이다. descriptor/Host 개수·분류/합성 길이·hash·equality만 반환하는 diagnostic contract/schema를 작성했지만 **diagnostic executable artifact는 아직 없다**.280개는 둘째 hop 검증을 포함하지 않는다.

배포와 probe의 순서는 [메인 검토 보완](evidence/auth-main-continuation-2026-10-18/root-review-decisions.md)을 우선한다. 새 deployment ID/hostname은 배포 후 생성되는 결과이므로 생성 전에 존재해야 한다는 조건을 만들지 않는다. 배포 승인에는 실제 project/team·Preview target·동결 artifact digest·보호·alias 금지를 묶고, 반환된 exact ID/hostname을 확인한 뒤 요청표를 바인딩/재해시해 probe와 WAF 적용 단위를 별도로 검토한다. 지금은 적격 artifact·실행 진단물이 없어 배포 적용 승인을 요청할 단계가 아니다.

Aside 조사에는 제한이 있었다. 요청 모델을 사용할 수 없어 브라우저 작업만 기본 모델로 실행했다. 위임 중 범위 밖 민감한 탭 query가 도구 transcript에 출력되어 조사를 중단했다. 값을 대화/Git/새 raw 파일에 복사하지 않았으며 실제 인증 relay 유출 근거와 혼동하지 않는다. Aside 내부 transcript 보관 및 소유 탭 정리는 미확인이다. 광역 탭 조회를 재개하지 않는다. 이 한계 때문에 접근 조사가 완료됐다고 쓰지 않는다.

## 운영 적용 후보

[운영 검토표와 SQL](evidence/auth-main-continuation-2026-10-18/operations/operations-review.md), [후보 해시](evidence/auth-main-continuation-2026-10-18/operations/final-checks.json).

| 단위 | 이번에 구체화한 내용 | 적용 전 남은 입력 |
| --- | --- | --- |
| schema001–004 | 원 `4f8eb80e…` bytes 보존·새 DB 실행. 별도 guarded envelope `494a4ee2…`: 같은4migration에 owner/context/객체 부재·12table/35function/6policy/1trigger·권한/RLS/초기행 검사 | 실제 project/branch/owner 재조회, private runner·logging·복구 접근. 기존 후보를 몰래 대체하지 않음 |
| Jay 최초 등록 | target 비공개 binding, 기존 Google identity 재검사, sorted table locks, 회원+sole admin 단일 transaction, grant0; upsert 없음 | 실제 owner 복구 접근·담당·보관. 계정 재생성/UUID 재확인 요청 아님 |
| owner 복구 후보 | 별도 사고 승인용. 같은 sole inactive admin·이미 active인 회원·expected version만 복구; blocked/다른admin/누락 거부 | 사고 당시 상태와 별도 적용 결정. 자동 rollback 아님 |
| 서비스 verified/grant | exact artifact의 실제 JWT/Auth/PostgREST·고정service ID 통합 증거 검토→별도 verified→Jay 개인 JWT의 전체 허용set. 두 번째 set에서 첫 grant 보존 | 실제 연결/설정·운영 evidence와 target/version/op ID. 이 SQL-only JWT-claim 모의만으로 verified 설정 금지 |
| signup OFF | 같은 프로젝트 ON→OFF만, provider/Site URL/callback3개 유지 | ESG/Work 최초 가입도 차단되는 영향 포함 적용 결정 |
| Vercel/Home 비밀 | JSON key·scope·파일0600/UID/link/symlink·암호화 key 보존·복구 조건을 명시 | 실제 secret 담당·공급/보관 위치, Home mount/path/UID |
| SMTP/실메일 | Home generate_link+직접 SMTP와 Supabase SMTP를 분리. TLS/unknown·새version 재발송·수신 증거 조건 | 제공자·발신자·수신함·횟수 미확정. 질문은 정보 확인이며 발송 승인 아님 |

새 PostgreSQL17.11 fixture에서85+41=126검사가 통과했다. 원 SQL/guarded 정의 일치, 실패 전체 rollback, blocked/기존admin 보존, 서로 다른 subject 동시 bootstrap 단1commit, unknown-ack 읽기 재대조, grant full-set/version/replay, 제한된 owner 복구를 검증했다. Auth는 최소 fictional schema이며 실제 GoTrue·signed JWT·provider·hosted 검증이 아니다. discard-ack는 모의다. 기존317suite를 반복하지 않았다.

메인은 SQL 원문·경쟁/실패 하네스·결과·migration bytes를 검토했다. 별도 직접 DB readback은 담당의 정상 DB 종료 **이후**여서 socket 부재로 실패했다. [실패 영수증](evidence/auth-main-continuation-2026-10-18/root-sql-review.json)을 보존하고 독립 실행 성공으로 세지 않는다. 이를 덮기 위한 fixture 재시작은 하지 않았다.

새 container `naeil-auth-ops-20261018-igri1ekq`(`31110627df36…`)의 PostgreSQL은 smart shutdown exit0으로 종료됐다. PID1 `sleep infinity`는 SIGTERM을 무시해 **container는 idle running**이다. root가 process 목록에 sleep 하나만 있음을 확인했다. network none/read-only/host bind·volume·published port0이다. 대기 Docker client만 소유 확인 후 종료했으며 강제kill·ptrace·lock 삭제는 하지 않았다. [수명 영수증](evidence/auth-main-continuation-2026-10-18/operations/fixture-lifecycle.json)을 후속 담당이 승계한다. 기존 fixture와 이 새 idle container를 혼동하지 않는다.

## 다음 우선순위·완료 경계

1. 현재 literal 후보/실패 원인을 바탕으로 정확한 local Project Settings와 지원되는 builder/default build 입력을 안전하게 확보하고, project에 맞는 clean artifact와 별도 synthetic diagnostic을 준비한다. credential/env pull이나 broad browser inventory를 자동 실행하지 않는다. 원 source는 보호하고 필요한 변경만 새 identity로 검토한다.
2. OP-01 실제 양 hop 접근/보관 범위와 OP-02 ingress 응답을 구체화한다. 원 조건의 충족 증거 또는 사용자의 명시적인 정책/구조 재검토 결정 없이 활성화하지 않는다. 추가 공급자 문의·사람 답변 대기는 할 일이 아니다.
3. SMTP·비밀 공급/보관·owner 복구·mount 등 누락 입력을 채우고 준비된 각 단위의 **적용만** 승인받는다. schema·signup·Jay·verified·grant·메일·배포를 묶지 않는다.
4. 승인 후 relay 먼저 검증하고 서비스별 전환 직전에 writer·모든 data/backup/auth/config를 새로 보존한다. 과거 PID/cleanup/helper 승인 재사용·강제kill·lock삭제·backup복원 금지. central enforcement 뒤 password-only rollback 금지. 참조 앱/진행 중 시도가 없어질 때까지 relay 유지.
5. 실제 artifact·승인된 실계정·HTTPS의 로그인/초대,401/403/503,회수/장애 logout,계정 전환·저장 보호·언어·재시작까지 확인해야 운영 완료다. 사이트/Jev ko/ja/en·Estimate ja 유지. 자동SSO/전역logout/언어동기화/견적번역은 추가하지 않는다.

기존 Estimate 전체 browser365 미재실행, Home backend4실패/type72진단, E/J segmented 통합과 Home synthetic ASGI 한계는 그대로다. 새 로컬 결과로 이전 운영 공백을 종료하지 않는다. 이 메인이 후속 계획·위임·통합·최종 검증을 이어받는다.
