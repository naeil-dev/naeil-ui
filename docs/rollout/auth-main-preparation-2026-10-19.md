# 인증 통합 준비 후속 — 2026-10-19

새 메인이 [10/19 인계](auth-main-handoff-2026-10-19.md), [10/18 후속](auth-main-continuation-2026-10-18.md), [메인 검토 보완](evidence/auth-main-continuation-2026-10-18/root-review-decisions.md)을 이어 수행한 결과다. **지원되는 Vercel Preview 산출물과 업로드 준비는 완료했다. 운영 인증 전환은 미완료이며 실제 적용 승인은 아직 없다.** 기존 Jay→Estimate가 우선이고 Home 개인 관리자·중앙 정책·relay를 생략하지 않는다. Jev와 새 회원 초대는 후속이다.

이번 저장은 이 문서와 `evidence/auth-main-preparation-2026-10-19/`뿐이다. 제품 소스·운영 설정·schema·회원·grant·메일·배포·프로세스·DNS/tunnel은 바꾸지 않았다. S는 여전히 wildcard이고 literal은 scratch 후보다. 원본 dirty 변경, 기존 증거와 fixture/volume을 보존했다.

## 이번에 달라진 근거

| 항목 | 새 결과 | 적용 범위와 한계 |
| --- | --- | --- |
| 실제 Vercel 입력 | 기존 design-system/naeils-projects의 Project Settings를 특정 화면과 동일 project 메타데이터 GET으로 확인. nextjs, Node24.x, build/install/dev/output/root는 실제 null, Fluid 켜짐. | 환경/credential pull·설정 수정 없음. CLI가 직렬화하는 입력과 실제 hosted Fluid 동작은 구분한다. |
| 제품 지원 빌드 | CLI50.33.1, Next16.1.7 기본 Turbopack, Linux x64/Node24.21.0의 기본 설치·빌드 및 공식 `--standalone`이 exit0. | 과거 Darwin148초 정체 원인은 여전히 미확정. 성공한 새 Linux 경로가 과거 원인을 설명하지 않는다. |
| 제품 실행 | 실제 built Next/실제 emitted launcher/별도 모델링한 middleware+literal 경로에서39 HTTP 검사, compiled adapter4검사 통과. | CDN routing을 실행한 결과가 아니다. raw Host, own data initURL/503, `path`·`nxtPpath` 실패 처리, 고정303·빈 `#` 보존. |
| 진단 수정과 실행 | 기존 진단의12개400은 Next의 req.url 재직렬화와 유한 허용표 불일치였다. 원본 own initURL은 보존됨. 별도 v2의 고정 합성 표현표를 검토·빌드했고34검사 통과, 실제28응답이 동결 schema 통과. | 제품 parser/Host를 바꾸지 않았다. D20/D21은 Node의 handler 이전431이며 metadata 관측 성공이 아니다. HTTP2·실제 CDN은 미실행. |
| Estimate verification SQL | 새 network-none PostgreSQL17.11에서 기존 후보 그대로17검사 통과. 재실행 거부·조건 거부·rollback·readback 포함. | fictional service table 검사. Auth/JWT/PostgREST/hosted 증거가 아니며 실제 verified/grant는 미적용. |
| Home·Estimate 운영 준비 | Home32 migration 관련 경로와 기존 DB 기본값 보존, 신규 migration head 없음. Estimate 실제 direct LaunchAgent와 세 설정 추가 위치를 확인. | 실제 DB revision/복구 보관은 아직 미확인. 아래 native 종료 제한 때문에 운영 적용안은 실행 적격이 아니다. |

제품 public identity는 UI0.7.1/contract1, artifactId `supported-literal-20261019-c570c8b9d05e2c47`, sourceRevision **development**다. E의 기존 후보도 development다. Production clean/committed 검사나 identity를 우회·위조하지 않았다. Preview 검토용 산출물 확보와 Production 배포 적격 판정은 별개다.

제품의 기본 산출물은 source-relative 참조가 있어 보존한 뒤 공식 standalone으로 새 출력했다. 제품2119파일+58링크/3980 file-map 참조, 진단v2 754파일+21링크/790참조가 archive 내부에 존재한다. 메인이 압축파일 각 멤버의 bytes/링크와 실제 출력·config·전체 해시를 독립 대조했다. 제품 source225 입력은 모두 보존됐고, scratch에서 빌드가 생성한 next-env.d.ts 차이만 별도 기록했다.

세부: [빌드 보고](evidence/auth-main-preparation-2026-10-19/supported-build/report.md), [진단v2](evidence/auth-main-preparation-2026-10-19/supported-build/diagnostic-v2/report.md), [진단 원인/패치](evidence/auth-main-preparation-2026-10-19/synthetic-diagnostic/candidate-normalized-request-v2/review.md), [메인 artifact 대조](evidence/auth-main-preparation-2026-10-19/root-supported-artifact-review.json), [SQL17검사](evidence/auth-main-preparation-2026-10-19/estimate-operations/verification-state-20261019/report.md).

## 검토 가능한 첫 적용 단위: 보호된 Preview 두 개 생성

이 절은 **승인 요청 대상이며 승인 기록이 아니다**. 실제 생성·probe·보호 변경을 실행하지 않았다.

| 대상 | 동결 archive SHA256 | 준비 상태 |
| --- | --- | --- |
| 제품 literal Preview | `127208fc6ce7a616b1f87e8dd1840d2487b57991eacca89180cdb082a088be39` | 지원 standalone Build Output, 현재 source/테스트/원 archive 보존 |
| synthetic diagnostic v2 Preview | `257077b992ccedac7ce349a9e4397ea440927d186987aedbb2b1e67f26c34df1` | 별도 최소 Next 앱, 제품 Auth 입력 없음, 고정 합성 입력만 관측 |

실제 private staging은 `/private/tmp/naeil-auth-main-20261019-3dog9mjl/preview-stage/{product,diagnostic-v2}`다. 각 폴더에는 검증한 `.vercel/output`과 실제 nonsecret project binding만 있다. env 파일·Git 저장소·alias 설정은 없고 양쪽 `builds.json.target=preview`다. 새 추출물의 전체 파일/링크/closure를 재검증했다. 상세 경로·config/inventory/tool 해시와 실행하지 않은 argv는 [준비 영수증](evidence/auth-main-preparation-2026-10-19/preview-stage-receipt.json)에 있다. 이 폴더나 archive 전체를 Git에 복사하지 않는다.

적용 범위는 다음으로 한정한다.

- 기존 project/team에 위 각 산출물을 한 번씩, **최대2개 Preview**로 업로드하고 생성 상태를 조회한다. production 승격, naeil.dev/custom domain/수동 alias 배정, 새 프로젝트, Git push/merge, provider/Auth 호출, 실계정·실메일·업무 데이터 요청은 제외한다. 진단부터 생성하고 오류·대상 불일치·불확실 commit이면 중단한다.
- 기존 Standard Protection(`all_except_custom_domains`), Require Log In, 기존30일 retention과 runtime 설정을 유지한다. 기존 공개 사이트와 E/J/H는 전환하지 않는다. 새로운 bypass secret/예외/OPTIONS 허용/WAF 규칙은 생성하지 않는다.
- 지원 CLI50.33.1의 `deploy --prebuilt --target=preview --scope=naeils-projects --json --no-wait --cwd <위 정확한 폴더>`를 기존 인증이 이용 가능한 경우에만 쓴다. 실제 실행은 별도 승인 후다. token 값을 argv/로그에 넣지 않고 raw 로그/응답을 공개하지 않는다. login/link/pull/env pull이나 설정 자동 확정은 실행하지 않는다. 인증 또는 추가 설정이 필요하면 해당 단계에서 중단한다.
- CLI는 Preview에서 `--skip-domain`을 거부한다. 그 옵션으로 보호한다고 쓰지 않는다. Gitless staging에는 branch/alias 입력이 없고 production/custom alias 작업은 범위 밖이다. 플랫폼이 생성하는 Preview hostname은 결과이며, 뜻하지 않은 domain/alias 효과가 있으면 성공으로 처리하거나 임의 복구하지 않는다.
- 산출물·현 production identity·설정 관측·생성 ID/hostname/상태·업로드 해시를 보존한다. 실패/통신 단절이면 ID와 같은 대상의 읽기 전용 조회로 결과를 조정한 뒤 결정한다. 무작정 새 배포를 반복하지 않는다. 기존 production을 바꾸지 않으므로 이 단계에 데이터 복원이나 production rollback은 없다. Preview 삭제/취소도 자동 cleanup에 포함하지 않으며 필요하면 정확한 생성 ID로 별도 결정한다.

생성 ID와 hostname은 사전 입력이 아니다. 생성 후 [기존 동결 요청표](evidence/auth-main-continuation-2026-10-18/platform/probe-freeze.json)에 실제 두 대상을 바인딩·재해시하고, 보호된 raw probe 접근과 최대280 합성 요청의 범위를 구체화한 다음 그 실행만 별도 승인받는다. Preview에서 제품의 canonical303 성공을 기대하거나 Preview/forwarded Host를 허용하지 않는다. canonical 실HTTPS303·consumer finalizer는 별도 운영 gate다.

현재 `autoExposeSystemEnvs=true`를 읽었지만 diagnostic의 실제 VERCEL_URL 주입은 아직 검증 전이다. 화면에는 automation bypass secret·보호 예외가 없었다. pinned CLI의 `vercel curl`은 token이 없으면 **생성 API를 호출할 수 있고 debug가 token을 출력할 수 있음**을 소스로 확인했으므로 읽기 전용 확인 명령으로 쓰지 않는다. protected raw probe 접근법은 미확정이며 보호를 끄거나 우회값을 query로 보내는 방식은 포함하지 않는다. [보호 설정](evidence/auth-main-preparation-2026-10-19/protection-settings-observation.json), [CLI 검토](evidence/auth-main-preparation-2026-10-19/preview-access-code-review.json).

## Jay→Estimate 적용·보존·복구 연결

기존 비공개 검토표의 Google·UUID·두 서비스 의향은 확정 사항으로 유지한다. 계정을 재생성하거나 이 세 사실을 재질문하지 않았다. 기존 공개키는 fingerprint로만 대조했고 값은 evidence에 넣지 않았다.

| 단계 | 준비한 정확한 단위 | 아직 필요한 실제 근거/적용 |
| --- | --- | --- |
| 중앙 schema·owner recovery | 기존 original/guarded envelope·bootstrap·readback·동일 sole-admin recovery 해시 보존 | 같은 hosted project/branch/owner·독립 복구 접근·보관 담당·private runner/logging. schema/Jay/signup OFF는 각각 적용 승인. signup OFF의 ESG/Work 최초 가입 영향 유지. |
| canonical relay | 위 literal artifact와 diagnostic/probe 준비 | OP-01–03와 실제 호스팅·양 hop query 비노출 확인 후 별도 production 적용. relay를 먼저 검증하고 참조 앱/진행 중 시도가 없어질 때까지 유지. |
| Home 개인 관리자 | 정확한 보존 이미지와 현 production base 일치. 기존 volume·password·single worker 유지. public Console 설정3개 공급안 | 실제 DB reference/revision·현재 writer/data/config/backup 보존·secret custody·이미지 적용·기존 Jay의 personal JWT 관리자 확인. Home URL 변경 없음. |
| Estimate 후보 연결 | 정확한 기존 E manifest `9ef6706972ab32954bd59467dddf2b2f18ef686597a71edc804519f75659431d`, runtime map `b6cb736cbf26cbd0bc0f1a686b4d8cac0f5da3ebfeb34220f557e9ed0917a391` 대조 | Production 적격 판정, 아래 무강제종료 절차, 새 보존/복구 경로·담당, 당시 writer/lock/config·전체 data/backup/auth, 개별 적용 승인. |
| verified→grant | `abestimate` active/unverified/null-time 한 행만 바꾸는 별도 guarded SQL와 readback,17검사. grant 없음 | exact runtime의 실제 personal-JWT/고정service 근거와 실제 configured connection 검토 후 verified 적용; 이어 Home 개인 관리자의 현재 전체 허용집합을 Estimate만으로 명시 grant. |
| 실HTTPS 수용 | 기존 동결 시나리오와 ja-only·저장/계정 전환 보호 유지 | 허용/401/403/503,회수·장애 logout,계정 전환·저장 보호·언어·재시작을 승인된 실제 계정과 artifact로 확인. 이후 Jev·새 초대. |

검증→배포의 순환 선행조건을 만들지 않는다. exact runtime의 실제 local Auth/DB 근거와 실제 configured connection 근거는 구분하며, 허용되지 않은 유효 개인 JWT의403으로 grant 전 연결을 확인할 수 있다. 임시 bypass grant나 verified 없이 grant를 허용하지 않는다. 실제 허용 HTTPS 성공은 명시 grant 뒤 최종 필수 항목이다.

Estimate의 실제 설정 공급 위치는 wrapper가 아닌 owner501/0600 LaunchAgent plist다. `NAEIL_SUPABASE_URL`, 기존 project의 public `NAEIL_SUPABASE_ANON_KEY`, 제안 `PERSONAL_AUTH_DIR=/Users/jaymini/.local/share/estimate/personal-auth` **세 항목 추가**만 준비했다. 해당 개인 저장소와 새 release 설치 경로는 만들지 않았다. 기존 DATA_DIR/auth/signing/config를 그대로 보존하고 모든 business backup을 포함한 새 capture가 필요하다. [운영 준비 상세](evidence/auth-main-preparation-2026-10-19/estimate-operations/report.md), [실제 설정 대조](evidence/auth-main-preparation-2026-10-19/estimate-operations/pass3-report.md).

**Native 종료 절차는 미해결이다.** 메인이 현 plist의 `ExitTimeOut=20`, KeepAlive/RunAtLoad=true를 확인했다. 설치된 macOS manual은 종료 시 SIGTERM 후 timeout에 SIGKILL을 보낼 수 있다고 명시한다. 따라서 초안의 `bootout`을 “강제 종료 없는 종료”로 승인해서는 안 된다. `disable`이 이미 loaded된 KeepAlive의 재기동까지 억제한다는 근거도 확보하지 못했고, 디스크 plist 수정만으로 live policy가 바뀐다고 보지 않는다. [종료 정책 보완](evidence/auth-main-preparation-2026-10-19/estimate-operations/final-application-plan/stop-policy-followup/correction.md)이 [원 절차 초안](evidence/auth-main-preparation-2026-10-19/estimate-operations/final-application-plan/procedure.md)의 stop/recovery 명령보다 우선한다. 어떤 명령도 실행하지 않았다.

중앙 권한 적용 뒤 password-only predecessor로 돌아가는 복구는 금지다. 현 data/backup/auth/config를 보존한 같은 중앙 정책 artifact의 forward fix 또는 검증된 무강제종료 방식의 보호 중단이 필요하다. 잠금 삭제·backup 복원·과거 PID/one-time helper 재사용은 없다. 현재는 이 종료 방식과 보관 담당·경로가 빠져 있어 Estimate 설치 승인을 요청하지 않는다.

사용자는 보관/복구 담당 질문을 이해하기 어렵다고 답했다. 기술 경로·키를 사용자가 찾아오게 하지 않고 메인이 보관안을 제안하기로 정정했다. 제안은 `/Users/jaymini/.local/share/naeil-auth-preservation/<새 승인 operation-id>`에 directory0700/file0600으로 전환 당시 자료를 보존하는 것이다. 후보 root는 없고 기존 조상 경로의 symlink 부재만 확인했으며 생성·복사는 하지 않았다. 같은 Mac의 전환 보존안이지 외부 재해 복구가 아니다. Supabase의 해당 project URL/General 설정과 SQL Editor 링크 접근은 특정 새 탭에서 확인했지만, Owner 문구가 보이는 것만으로 실제 DB owner 인증/복구 능력을 검증했다고 하지 않는다. SQL 실행·권한/설정 변경 없이 각 소유 탭을 닫았다. 사용자의 답을 승인이나 복구 사실로 처리하지 않았다. [보관 제안과 접근 범위](evidence/auth-main-preparation-2026-10-19/preservation-proposal-and-admin-access.json).

Home 후보는 기존23개 revision과 head `20261012_000000_claude_monthly_usage`를 유지한다. 현재 entrypoint는 기본적으로 migration utility를 호출하므로 “startup write-free”라고 부르지 않는다. 실제 DB 대상이 비공개로 식별되면 기존 승인된 읽기 전용 조사 범위에서 revision metadata를 확인할 수 있다. [미실행 recipe](evidence/auth-main-preparation-2026-10-19/estimate-operations/final-application-plan/home-revision-check.md)의 별도 승인 표현은 읽기 전용 조사까지 반복 승인하라는 새 요구가 아니다. 실제 stop/capture/migration에는 기존 적용 경계가 유지된다.

## 메일·미완료·보존

Supabase의 **기본 메일 설정**과 Home 후보의 **새 통합 초대 발송**은 다르다. 후보는 `generate_link`로 증명을 만들고 직접 SMTP로 초대 링크를 보낸다. ordinary Home 개인 관리자 login/member 조회/access 변경에는 invitation SMTP/config가 필요 없다. 새 초대 메일 준비가 기존 Jay 연결 준비를 막지 않는다. 기존 메일의 실제 발송 주체는 여전히 미확인이고, built-in 설정만으로 기존 또는 새 실메일 검증 완료라고 하지 않는다. 직접 SMTP를 기존 발송으로 교체하거나 relay를 바꾸는 구현은 하지 않았다.

OP-01은 health query 로그 관측이며 인증정보 유출 관측이 아니다. 양 hop query 비노출은 남아 있고 PKCE로 허용하지 않는다. 공급자 문의/답변 대기를 재개하지 않았다. OP-02 slash/backslash308·TRACE/WAF 후보, OP-03 실제 hosted 전달도 여전히 열려 있다. local output/runtime 통과로 닫지 않는다. 기존 Estimate 전체365 browser 미재실행·Home backend4/type72·E/J segmented/Home ASGI 한계도 유지한다.

실행 전후11 worktree HEAD/status가 일치했고 diff-check0이었다. 메인이 E2929 regular files+29 internal links와 새 Vercel 압축/출력을 대조했다. 기존 exact8/durable4/보호553xx4와 예전 idle operations fixture 상태가 보존됐다. 새 build/runtime10 container는 전부 exited, 새 SQL fixture도 smart shutdown/exit0다. 초기 설치 중단·하네스 실패는 실패 기록 그대로 남겼다. 내부 unused network와 모든 container/volume을 보존했고 임의 cleanup은 없다. 최종 담당 조회 범위는 shared/S/E/J/H의5cwd뿐이며 이 메인1명 running·나머지8명 idle·terminal0이었다. 범위 밖은 미확인이다.

위임은 `gpt-6.1-sol/high` 세 담당에 파일 범위를 나눴고 메인이 결과/patch/manifest/실행 harness/소유권을 검토했다. 빌드 최초 public dependency/font 다운로드는 제한된 proxy 경로였으며 network-none이라고 부르지 않는다. 진단v2 재빌드와 HTTP/SQL 검증은 network-none였다. 현재 메인 scratch는 `/private/tmp/naeil-auth-main-20261019-3dog9mjl`/0700이며 미래 보존은 보장되지 않는다.

Aside의 필요한 특정 설정 화면만 사용했고 광역 탭 조회는 하지 않았다. 첫 REPL/화면 출력에 계정·avatar 표시 식별자가 나왔으나 새 파일/Git에 복사하지 않았고 이후 출력은 가렸다. 이번 소유 탭/REPL은 종료했다. 과거 민감 query transcript 사건과 transcript 보관/과거 탭 정리는 여전히 미확인이다. [도구 범위](evidence/auth-main-preparation-2026-10-19/browser-scope-and-limits.json).

다음 순서는 구체화한 Preview 생성의 별도 승인→생성 대상에 probe/access 계획 바인딩→hosted 증거 확인이다. 독립적으로 native 무강제종료 방식과 비공개 보관/복구 사실을 해결한다. 이후 각 schema/Jay/설정/relay/Home/Estimate/verified/grant 적용만 승인받고 실제 HTTPS 수용을 완료한 뒤 Jev·새 회원 초대로 확장한다. 이 문서는 전환 완료 선언이 아니다.
