# 인증 운영 전환 새 메인 인계와 실행 순서 — 2026-10-19

**인계 확인·기록만 수행했다. 이번 요청과 직전의 설명·계획 질문은 새 구현·설계 변경·운영 적용 승인이 아니다.** 새 메인이 이 작업과 이후 후속 요청의 계획·분할·통합·최종 검증을 맡는다. 이 메인의 남은 작업은 인계 프롬프트 전달뿐이다.

## 처음 읽을 문서

1. 이 문서 전체와 [현재 상태](evidence/auth-next-main-handoff-2026-10-19/state.json), [담당 상태](evidence/auth-next-main-handoff-2026-10-19/activity.json). 정확한5cwd·HEAD·status·fixture ID·관측 시각은 영수증에 있다.
2. [최신 직접 조사·결정 준비](auth-resume-decisions-2026-10-19.md) 전체. OP01–03 표, Home 현재 source 이식 범위, 중앙 DB owner와 실제 복구의 차이, Estimate 정적 경로 감사, 공통 보존·적용 순서를 따른다. 세 담당의 상세 report와 root 검증·교차 검토는 이 문서에서 연결된다.
3. [방향 검토](auth-direction-review-2026-10-19.md) 전체와 [이전 인계](auth-direction-handoff-2026-10-19.md)의 승인·보호·재조회 부분. 이어 [원 인계](auth-main-handoff-2026-10-19.md), [10/18 후속](auth-main-continuation-2026-10-18.md), [메인 검토 보완](evidence/auth-main-continuation-2026-10-18/root-review-decisions.md)의 정책·검증 순서·복구 경계를 읽는다. 역사적 미확인 상태보다 최신의 범위가 명시된 실제 결과를 우선한다.
4. 각 대상 AGENTS/STATUS와 Home OpenSpec. H에는 root STATUS가 없었다. Home 기준은 H의 `openspec/changes/naeil-console-access/{baseline.md,invitation-contract.md,specs/console-access/spec.md}`, `durable-invitation-state/`, `reconcile-home-production-source/`, `exact-console-auth-return/`다. 새 운영본 이식은 기존 H 전체 덮어쓰기가 아니다.

## 목표와 승인 경계

현재 호스팅에서 기존 Jay의 Google 계정으로 먼저 Estimate에 로그인하고, Home 개인 관리자 화면에서 중앙 접근권을 관리한다. 그다음 Jev와 새 초대/실메일을 연결한다. 사이트=Vercel, Estimate/Jev=Mac mini, 계정=현재 Supabase Auth를 유지한다. Home 주소는 `https://jay-macmini-2.tail165003.ts.net:2455`다. 호스팅·업무 데이터 이전은 범위 밖이다.

- 기존 Google·기존 UUID·두 서비스 의향은 비공개로 확인됐고 등록/grant는 미적용이다. 재질문·새 계정 생성·실제 식별자/비밀 공개를 하지 않는다. Jay 단일 초기 관리자, 회원별 명시 허용표와 비공개 검토표를 유지한다.
- 기존에 승인된 구현·격리 검증·운영 준비·읽기 전용 조사는 재승인 없이 수행한다. 새 범위인 Home 현재 운영본 이식, Estimate control gate, A2 ingress 확장은 각각 제안 상태다. 대화 중의 설명 요청이나 이번 인계를 그 구현 승인으로 해석하지 않는다.
- 실제 schema/hosted 설정·비밀 등록·회원/권한·실메일·push/main merge/배포·DNS/tunnel·운영 프로세스 제어는 정확한 대상·변경·artifact·보존/복구를 완성한 후 각 적용만 승인받는다. 포괄 운영 승인을 먼저 요구하지 않는다.
- Vercel 전용 로그인, 보호 Preview2개, 한 키 생성→baseline178→회수 승인은 소비됐다. 새 로그인/키/Preview/probe/복구에 재사용하지 않는다.
- 강제kill·lock 삭제·backup 복원·옛 PID/일회성 승인 재사용을 금지한다. 중앙 정책 뒤 password-only rollback을 하지 않는다. 참조 앱과 진행 중 시도가 없어질 때까지 relay를 유지한다.
- 사이트/Jev ko/ja/en·Estimate ja를 유지한다. 자동 SSO·전역 logout·언어 동기화·견적 번역은 추가하지 않는다. 새 Home SMTP 초대와 Supabase 기본 메일은 별개이며 미확인 기존 발송 경로로 바꾸지 않는다. 새 초대 준비로 기존 Jay 준비를 막지 않는다.

## 대화에서 분명히 한 상태와 설명 원칙

**네 서비스 모두 이번 새 통합 인증의 운영 전환 완료 상태가 아니다.** 운영 중인 UI0.7.1과 인증 전환을 구분한다. 완료 근거는 인증/계정/저장/언어·Home/relay 구현 및 각 범위의 로컬 검증, 지원 Linux 빌드, Preview, 합성 HTTPS178이다. 실제 schema/Jay/관리자/verified/grant/provider·실계정 HTTPS·실메일은 미완료다. S는 wildcard이고 literal은 scratch/Preview에만 있으며 Production 적격은 미확정이다.

사용자는 용어 위주의 반복 설명으로 상태와 다음 행동을 이해하기 어려워했고, 표준 방식이 있는데 작업이 헤매는 것 같다고 지적했다. 설명은 역할과 실제 결과로 한다. relay는 naeil.dev 안의 로그인 복귀 처리, Home은 회원별 서비스 사용권을 설정하는 관리자 화면, 실제 권한표는 Supabase에 있으며 각 서비스가 확인한다. 각 서비스 주소·세션은 따로 유지된다.

서로 다른 도메인이라는 사실만으로 custom relay가 필요한 것은 아니다. 공식 Supabase 안내는 등록된 `redirectTo`와 PKCE로 앱에 돌아오는 방식을 제공한다. 이번 relay는 기존 로그인 시도 nonce·cookie·취소 처리 계약과 당시 GoTrue의 cross-origin query 포함 allowlist 검사 사이의 충돌 때문에 추가한 선택이다. [선택 근거](../superpowers/specs/2026-10-18-exact-callback-return-design.md)의 첫 상태 문구는 역사적 제안 시점이므로 최신 구현 상태와 혼동하지 않는다.

이 대화에서 공식 [Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)와 [SSR advanced guide](https://supabase.com/docs/guides/auth/server-side/advanced-guide)를 공개 웹 도구로 확인했다. 이것은 표준 동작 설명 근거이며 실제 hosted 설정·콜백 수용 검증이 아니다. 표준 문서를 근거로 기존 계약/relay를 자동 삭제·약화시키지 않는다.

## 정확한 중단 지점과 첫 행동

**핵심 경로는 relay의 운영 방식 결정 앞에서 멈춰 있다.** 기본 인증 설계/구현이 없는 것이 아니며, 현재 호스팅에서 추가 relay의 요구 조건을 모두 만족시키는 제품·설정이 확정되지 않은 상태다. Home/Estimate 새 구현을 먼저 시작하면 이 문제가 풀리는 것처럼 설명했던 우선순위는 정정했다. 독립 준비는 병행할 수 있지만 relay 운영 적합성 결정이 첫 전환의 선행조건이다.

재개 첫 행동은 state/activity와 정확한5cwd·HEAD/status·보호 hash·담당·fixture 소유권을 대조한 다음, 아래 기존 결정표를 기준으로 **현재 제약 안에서 적용할 정확한 운영 수단이 제시됐는지 판단하고 필요한 구조 결정을 구체적으로 올리는 것**이다. 같은 공개 문서·baseline·리뷰를 이유 없이 반복하거나 새 observer부터 만들지 않는다.

- [OP01–03 수단/결정표와 A1/A2](evidence/auth-resume-decisions-2026-10-19/relay-decisions/report.md): OP01의 완전한 저장 전 query 억제 수단은 현재 근거에 없다. OP02 WAF/Build Output의 처리 순서·헤더, OP03 literal/dispatch의 원문·raw Host·handler 근거도 열려 있다. literal은 routing capture 주입만 제거하며 hosted literal에서도 변형8건이 있었다.
- OP01은 무해한 health-query 저장 관측이다. 실제 인증정보 유출 관측으로 바꾸지 않는다. 지원 수단 미확인을 플랫폼 전체 불가능으로 단정하지 않는다. C1–C3/A1은 완전한 OP01 해결안이 아니다.
- A2는 소유 TLS ingress/relay로 canonical callback을 받고 일반 사이트를 Vercel upstream으로 보내는 구체적 대안이다. 사이트 앱이 Vercel에 남아도 canonical ingress·relay 운영이 바뀌므로 현재 호스팅 범위 밖이다. 채택·구현·인프라 조사·DNS 변경은 미승인이다. 둘째 hop 비노출, exact Next dispatch, 접근성/인증서/origin/복구도 미입증이다. 현 범위 유지 시 자동 추진하지 않는다.
- 새로운 수단을 확인한다면 그 결과가 어떤 실제 수정 선택을 바꾸는지 먼저 한정한다. 수단이 없으면 지원 문의·사람 답변 대기·임의 추가 probe로 넘기지 말고, 이미 구체화한 범위 변경과 남은 입증 의무를 결정 사항으로 제시한다. 한 지점/10건 observer는 보류·미승인이다.
- 양 hop 비노출, strict parser, raw Host=naeil.dev, Next16.1.7 own data-string initURL/503, path/nxtPpath 거부, 고정303/빈 fragment와 E/J/H finalizer를 보존한다. PKCE·Preview/forwarded Host·query 삭제를 우회책으로 쓰지 않는다.

## 병행 준비와 이후 실행 순서

| 작업 | 이미 확보한 근거 | 남은 적용 조건 |
| --- | --- | --- |
| Home | 실제 DB revision `20261017_000000_merge_auto_monitoring`, current2.0.0-beta.2/e618 graph26, 지정 image/source29일치와 메인 직접 대조. 옛 후보는 이 revision을 몰라 거부하며 migration utility는 검사 전에 write lock을 취함 | 현재 Auto/monitoring/graph를 보존하는 auth 이식 범위는 report/source-compatibility에 구체화. 별도 결정 후 새 OpenSpec/격리 후보·통합 검증·frontend build/freeze·현재 runtime 종료/보존안을 완성. old image/static/archive 덮어쓰기·downgrade/stamp/검사 우회 없음 |
| 중앙 복구 | 같은 Supabase project/main Production의 현재 Dashboard 세션에서 direct postgres·실제 schema/Auth 관련 catalog 권한 확인. Console schema/table은 없음 | 현재 세션 성공은 독립 재인증·비공개 runner/custody·복구 성공이 아님. 실제 logging 설정에 맞는 private execution 경로·보관을 확정하고 schema 적용 후12table 소유권을 별도 확인. 사용자에게 기술 경로/키/UUID를 찾아오게 하지 않음 |
| Estimate | 현재 loaded KeepAlive/RunAtLoad/exit timeout20. 구버전1570코드·84symlink·14원 source 및 메인 핵심15파일 검증으로 early current 교체의 정적 경로 전제는 충족 | closed gate는 새 제어 설계. 별도 결정 후 gate/admission/exec/재시작을 격리 검증하고 새 설정·artifact·보존 단위 완성. TERM만으로 재기동 억제 불가, bootout은 숨은 KILL deadline이 있어 미적격. 정적 경로 검증을 실제 종료 성공으로 쓰지 않음 |

상세 파일 범위·검증 기준·보존/복구는 [Home report](evidence/auth-resume-decisions-2026-10-19/home-recovery/report.md), [owner recovery plan](evidence/auth-resume-decisions-2026-10-19/owner-recovery-plan.md), [Estimate report](evidence/auth-resume-decisions-2026-10-19/estimate-stop/report.md)를 읽는다. 제안 비공개 보관 root는 `/Users/jaymini/.local/share/naeil-auth-preservation/<fresh-approved-operation-id>`이며 생성·live capture는 하지 않았다. uid501/0700/0600의 같은 Mac 전환 보존안이지 외부 재해복구는 아니다.

선택한 설계 범위가 확정되면 기존 구현 근거를 재사용하면서 변경된 통합 부분만 검증하고, 정직한 Production 적격 source/artifact·설정·복구를 완성한다. 실제 전환 직전에 writer와 모든 data/backup/auth/config를 새로 보존한다. 각 적용 승인 후 **relay canonical 검증→schema→기존 Jay 등록→Home 개인 관리자→Estimate 실제 연결→별도 verified→Estimate만의 전체 허용집합 명시 grant→실계정 HTTPS 수용** 순서다.

검증 순환을 만들지 않는다. exact artifact의 실제 로컬 Auth/DB 허용경로와 실제 configured connection의 유효하지만 미허용인 개인 JWT403은 서로 다른 증거다. 후자는 실제 identity/service/정책 집행에 연결해야 하고 응답 형태만으로 통과하지 않는다. verified 전 임시 bypass grant는 없다.

Estimate 수용 뒤 Jev와 새 초대로 확장한다. 완료는 승인된 실제 artifact·실계정·HTTPS에서 로그인/초대·실메일·401/403/503·권한 회수/장애 logout·계정 전환·저장 보호·언어·재시작을 확인했을 때다. 로컬/합성 검증으로 대체하지 않는다.

## 이번 인계에서 재확인한 실행 상태

2026-10-19 **20:26~20:27 JST** 관측이다. [state.json](evidence/auth-next-main-handoff-2026-10-19/state.json)의 status/hash는 새 인계문과 STATUS 링크를 저장하기 전이다.

- 정확한5cwd HEAD/status는 이전 최종 영수증과 일치, diff-check0. 이전 재개 manifest21파일·보호 구현16파일·경계 manifest26파일 hash/byte 일치. 원 인계 등9artifact도 재개 당시 bytes와 일치했다. 이후 이 인계·새 evidence를 추가하고 STATUS에는 최신 링크만 넣는다. 과거 manifest는 당시 STATUS snapshot을 가리키므로 새 링크 이후의 차이를 product drift로 오인하지 않는다.
- 지정28fixture의 ID/name/state/network/readOnly/mount-count/port는 이전 관측과 일치. older SQL의 정확한 ID를 `docker top -eo pid,comm`으로 읽으면 sleep만 남아 있다. running을 삭제/종료 완료로 쓰지 않는다. 세 기존 scratch는 존재/0700이며 전체 archive/runtime을 다시 해시하지 않았다.
- Home exact-name의 current ID/image/revision label/start/mount/loopback ports는 최신 Home 보고서와 일치. DB는 이번에 다시 읽지 않았으므로 actual revision 근거는 앞선 mode=ro metadata 영수증이다. Home은09:45 JST에 이미 시작됐으며17:16 이전 인계 이후 변경됐다고 단정하지 않는다.
- Estimate loaded job은 running/KeepAlive/RunAtLoad/exit timeout20, current link는 같은 immutable predecessor다. 기록 PID는 관측일 뿐 제어 권한이 아니다. 이번 확인은 단일 writer/lock 소유권·capture의 증거가 아니다.
- Paseo5cwd에서 이 메인1명만 running, 기존6명 idle, terminal0. native `home_recovery`, `estimate_stop`, `relay_decisions`는 모두 completed로 재확인했다. 각 담당의 수정 소유권은 이전 재개 evidence의 동명 하위 폴더였고, relay 담당은 교차 검토 문서에도 추가했다. 새 지시·생성·중단·회수는 없다. 과거 native3명과 범위 밖 활동은 미확인이다.
- 새 provider/실메일/HTTPS/probe·DB query·credential/env pull·광역 탭 조회는 하지 않았다. 이전 소유 Aside 탭/bridge 정상 종료는 기존 영수증 근거이며 과거 민감 transcript 보관·정리는 여전히 미확인이다.

재개 시 정확한5cwd의 `git rev-parse HEAD`, `git status --short`, `git diff --check`, Paseo `list_agents({cwd,includeArchived:false,limit:100})`/`list_terminals({cwd})`와 native list를 사용한다. fixture/운영 컨테이너는 state의 정확한 ID 또는 이미 알려진 exact-name만 metadata projection으로 조회한다. loaded job은 `/bin/launchctl print gui/501/dev.naeil.estimate`를 메모리에서 allowlist 투영하고 raw env/config를 출력하지 않는다. DB는 필요할 때 기존 bounded read-only recipe를 새 actual binding에 적용하며 app import/migration utility를 대신 실행하지 않는다. dirty source·terrific-buffalo·fixture/volume과 범위 밖 자원을 보호한다.

## 새 메인의 실행 원칙

명확한 기존 승인 범위는 자율 완료하고 중요한 모호함·권한 부족·파괴적 조치만 구체적으로 확인한다. 실익 있는 독립 조사·구현·검증·리뷰는 파일·범위·완료 기준을 정해 위임하고 구현은 가능하면 gpt-6.1-sol과 위험에 맞는 추론 수준을 쓴다. 불가하면 도구/모델 한계를 알리고 가능한 수단을 쓴다. 메인은 위임 결과를 직접 대조하고 충돌을 막으며 중요한 진행/전제 변경을 알린다. 완료 근거를 반복하지 않고, 장애 시 가능한 독립 작업 뒤 미완료·최소 재개 조건을 보고한다. 완료 후 변경·이유·검증·제약·산출물·다음 순서를 보고하고 문서를 최소 갱신한다. 미요청 개선은 실행하지 않는다.

이번에는 [paseo-handoff 스킬](/Users/jaymini/.agents/skills/paseo-handoff/SKILL.md)의 인계 문맥 정리만 적용했다. 사용자의 명시적 요청에 따라 새 에이전트 생성과 후속 구현/운영 변경은 하지 않았다.
