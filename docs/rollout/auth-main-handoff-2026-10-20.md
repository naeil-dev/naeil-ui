# 인증 전환 새 메인 인계 — 2026-10-20

**이번 요청은 인수인계 프롬프트 작성이다. 새 설계·구현·보안 계약 변경·운영 적용 승인이 아니다.** 새 메인이 이후 요청의 계획·분할·통합·최종 검증을 맡는다. 현 메인은 필요한 읽기 전용 상태 확인과 이 문서/STATUS 포인터만 작성했다. 새 agent 생성·기존 agent 지시/종료·서비스 변경은 하지 않았다.

## 목표·중단 지점·승인 경계

기존 Jay의 Google 계정으로 Home 개인 관리자/중앙 권한표를 사용하고 Estimate를 실제 HTTPS로 사용하는 것이 첫 완료 목표다. Estimate 수용 후 Jev·새 초대/실메일로 진행한다. 사이트 Vercel, Estimate/Jev Mac mini, 현재 Supabase, Home `https://jay-macmini-2.tail165003.ts.net:2455`를 유지한다. 기존 identity/UUID·Jay 단일 초기 관리자·회원별 명시 권한 의향은 이미 확인됐으므로 계정 재생성·불필요한 재질문·식별자 공개를 하지 않는다.

현재 중단점은 **로그인 복귀 중계의 운영 가능성과 필요한 계약 변경을 결정하기 전**이다. [실행 계획](../superpowers/plans/2026-10-20-auth-recovery-scope-plan.md)은 보고 완료됐으나 이후 새 실행 승인은 없다. 첫 후속 단위는 그 계획의 1단계: 현재 호스팅 복귀안 하나에 OP01–03의 충족/변경·보호·검증·잔여 운영 조건을 함께 묶는 것이다. 인계 직후에는 계획·소스·승인 경계의 읽기 전용 대조부터 한다. 계획 보고나 이 인계만으로 새 후보 구현/정책 변경을 시작하지 않는다.

| 구분 | 이어받을 경계 |
| --- | --- |
| 기존 승인 | 기록된 로컬 구현·격리 검증·읽기 전용 조사·운영 준비의 명확한 범위. 이미 끝난 작업을 재실행하거나 같은 승인을 반복 요청하지 않는다 |
| 제안·미승인 | 새 callback 대체 계약, Home 현재 운영 소스에 대한 새 auth 이식, Estimate 새 closed gate. 실행 범위·파일·검증을 구체화한 뒤 실제 권한과 대조한다 |
| 실제 적용 | schema/hosted 설정·비밀 등록·회원/권한·실메일·push/merge/배포·운영 프로세스 등은 대상·artifact·보존/복구가 준비된 구체적 범위에 기존 승인이 있는지 확인. 없으면 그 적용만 승인받는다 |
| 중단/제외 | A2 VM/TLS sidecar/인증서/DNS/유료 인프라의 후속 작업. 자동 SSO·전역 logout·언어 동기화·Estimate 번역·UI 재설계·데이터 이전도 현재 범위 밖 |

relay와 nonce/cookie/PKCE·취소/replay·고정 목적지·access/refresh token·verifier 비노출·중앙 권한·데이터/복구 요구는 유지한다. OP01 양 구간 query 저장 전 억제, OP02/03 조기 응답·원문·raw Host·실제 Next16.1.7 own initURL/503·path/nxtPpath 거부·고정303/빈 fragment도 명시적 대체 결정 전까지 유효하다. OP01을 바꿔도 OP02/03이 자동 해결되지 않는다. 무해한 health query 저장만 관측됐으며 실제 인증정보 유출이나 공급자의 짧은 보존기간은 확인되지 않았다.

Vercel 전용 로그인·보호 Preview2개·키 생성/178회 baseline/회수의 일회성 승인은 소비됐다. 새 observer/Preview/키/probe로 재사용하지 않는다. 강제 kill/bootout, lock 삭제, backup 덮어쓰기, password-only 복귀, 비밀/credential/`.env` 읽기·출력은 하지 않는다. dirty 소스·fixture/volume·scratch·terrific-buffalo 등 범위 밖 자원을 보존한다.

## 먼저 읽을 자료

1. 대상별 AGENTS와 STATUS. [현재 계획](../superpowers/plans/2026-10-20-auth-recovery-scope-plan.md) 전체: G1–G5, 1–4단계, 범위 관리 규칙과 검토 초점. 이 계획이 최신 우선순위이며 구체적 callback 구현은 아직 정해지지 않았다.
2. [독립 방향 검토](auth-direction-independent-review-2026-10-20.md)의 ‘방향이 어긋난 지점’, ‘유지할 목적과 재검토할 계약’, ‘권고 방향과 가장 작은 결정’. 첫 A2 검토의 허용과 채택 보류 뒤 불필요한 상세화를 구별한다. Astra/Opus의 초기 오류·철회가 있으므로 종합/교차 결론을 읽는다.
3. [10/19 인계](auth-next-main-handoff-2026-10-19.md)의 ‘목표와 승인 경계’, ‘병행 준비와 이후 실행 순서’, ‘재개 시’ 절차. 여기서 연결한 [Home](evidence/auth-resume-decisions-2026-10-19/home-recovery/report.md), [Estimate 종료](evidence/auth-resume-decisions-2026-10-19/estimate-stop/report.md), [중앙 복구](evidence/auth-resume-decisions-2026-10-19/owner-recovery-plan.md)를 실제 해당 작업 전에 읽는다. Home에는 root STATUS가 없었으며 해당 AGENTS/OpenSpec와 현재 운영 소스 기준을 확인한다.
4. [기존 callback 명세](../superpowers/specs/2026-10-18-exact-callback-return-design.md), [구현/범위별 검증 결과](exact-callback-return-2026-10-18.md), [실제 Preview 결과](auth-preview-baseline-result-2026-10-19.md). 최초 명세의 proposed 표기는 과거 시점이며 후속 구현 기록과 함께 읽는다. 현재 S 소스는 wildcard, literal 후보는 scratch/Preview에만 있다. literal은 path capture만 제거하며 query 변형·Host·조기 응답·로그 문제를 해결한 것이 아니다.

로컬 인증/권한/저장 보호·relay 구현과 해당 범위의 검증, 지원 빌드·Preview·합성 HTTPS 기록은 존재한다. 실제 schema/Jay 등록·Home 관리자·Estimate verified/grant·실계정 HTTPS/실메일은 미완료다. UI0.7.1 운영과 새 인증 전환 완료를 혼동하지 않는다. Home 현재 DB가 옛 후보보다 앞선다는 기존 조사, Estimate KeepAlive/20초 종료 제한, 독립 중앙 재인증/비공개 실행·복구 미완료는 별도 차단 조건이다.

## 2026-10-20 08:09–08:10 JST 재확인

다음은 인계 문서/새 STATUS 포인터 저장 전 관측이다. 원문 baseline과 보호 목록은 [review-baseline.json](evidence/auth-direction-independent-review-2026-10-20/review-baseline.json)의 `repositories`, `protectedFiles`; 이전 검증은 [verification.json](evidence/auth-direction-independent-review-2026-10-20/verification.json)이다.

| 역할 | 실제 경로 | HEAD | git status 항목 수 |
| --- | --- | --- | --- |
| 공유 UI/현재 메인 cwd | `/Users/jaymini/.paseo/worktrees/28nele6j/pure-chicken` | `9f83816f973618aa77c2bba56b6fa9319ef1fc3d` | 0 |
| S: 사이트/인증 문서 | `/Users/jaymini/.paseo/worktrees/28nele6j/naeil-account-language` | `02aa72e6e702bf6726659c6e7179e648eb648141` | 72 |
| E: Estimate | `/Users/jaymini/.paseo/worktrees/1bnldk74/estimate-account-language` | `860e79b3f47f9fe33028879adb50fdc75a94b6b8` | 6 |
| J: Jev | `/Users/jaymini/.paseo/worktrees/3tl6a87q/jev-account-language` | `2fc435a35910bbca758802909ed46f81c3cda874` | 3 |
| H: Home 후보 | `/Users/jaymini/.paseo/worktrees/3qtenke4/naeil-home-account-language` | `e14229709ffbe7bed791e69eb780b9f7096605c5` | 21 |

5개 root/HEAD 일치, 각각 `git diff --check` exit0. 보호71파일은 모두 baseline의 actual hash와 일치했다. S의 status 차이는 독립 방향 리뷰 본문과10/20계획의2추가뿐이며 기존 항목 소실은 없다. 다른4root의 status는 동일하다. STATUS에는 이미 리뷰/계획 포인터가 추가돼 있으므로 오래된 전체 hash와의 차이를 제품 변경으로 취급하지 않는다.

이번 확인의 계획 SHA256은 `09d6e1541b6bc151f15d985e3122e0fdf35143183602482a8839b815bc2bb3b1`, 독립 리뷰 본문은 `f59e7ac8d96a173045b0debf92dc3464dfcbab14f54af6acf8ec63332eadaeef`다. 이번 추가 전 STATUS는22901bytes/SHA256 `9ab599f9a08fc9730df76f185b4548187af16a170f69d651e1ced3d907e24f60`다. 기존 내용을 보존하고 새 포인터만 앞에 추가한다.

| 실행 대상 | 이번 직접 관측 | 검증하지 않은 것 |
| --- | --- | --- |
| Home exact-name `relaydock` | running, ID `be39742bd33b…`, image `59c4329fad2f…`, revision label `e618fa439a55…`, started `2026-10-19T00:45:54.47221852Z`, unless-stopped, loopback1455/2455. 이전 인수 metadata와 동일 | 현재 DB revision·writer·health·데이터 capture·인증 수용 |
| Estimate `gui/501/dev.naeil.estimate` | running, PID74774, KeepAlive/RunAtLoad true, exit timeout20. `current`는 `/Users/jaymini/.local/share/estimate-app/releases/8c3e0430293d-82280965179e`로 동일 | writer/lock 소유권·안전한 실제 종료·HTTPS 로그인 |
| 기존 fixture28개·scratch3개 | 이번에는 재조회하지 않음. [이전 runtime](evidence/auth-main-intake-2026-10-19/runtime.json)의 2026-10-19 20:58 JST 관측과 소유권만 역사적 근거로 유지 | 현재 상태·정리 완료. 이전 older SQL은 sleep 프로세스만 관측됐지만 container는 running이었음 |

동적 상태를 현재 권한·기능 완료로 사용하지 않는다. 재개 시 필요한 대상만 위 `runtime.json`의 `methods`대로 metadata allowlist 투영한다. Docker exact ID/name만 사용하고 raw env/config/log를 읽거나 출력하지 않는다. launchctl 출력은 메모리에서 state/pid/exit timeout/KeepAlive/RunAtLoad만 투영하며 현재 symlink를 확인한다. fixture를 사용할 일이 생기기 전에는 전체 inventory·suite를 반복할 필요가 없다.

## 에이전트와 동시 편집 경계

08:09 JST에 위5cwd별 Paseo `list_agents(includeArchived:false,limit:100)`/`list_terminals`를 직접 확인했다. shared에8명: 현 메인 `bd9c10a5-7125-41ba-af19-5b7fff882724`만 running이며 담당은 이 인계 문서/STATUS다. 기존7명은 idle이고 다른4cwd에는0명, terminal은5cwd 모두0개다. idle은 완료/종료 증거가 아니므로 재지시·정리하지 않는다. 기존7명 식별/역할은 [이전 activity](evidence/auth-next-main-handoff-2026-10-19/activity.json)와 대조할 수 있다.

- native 현재 조회에 보인 `/root/a2_next_dispatch`, `/root/a2_second_hop`, `/root/direction_review_astra`는 모두 completed. 각각 A2 Next/relay 검토 문서, A2 둘째 구간 검토 문서, 독립 리뷰를 담당했으며 현재 편집 작업은 관측되지 않았다. A2 관련 결과는 역사적 자료이고 재개 지시가 아니다.
- `/root/runtime_intake`와 더 이전 native 담당은 이번 목록에 보이지 않았다. 과거 결과만 근거이며 현재 접근/실행 상태를 새로 확인했다고 하지 않는다.
- 이번 독립 리뷰의 Paseo Opus `b06194b8-d7a3-4dda-b927-3418db2c44f9`, 실패한 Astra 첫 시도 `0268c8b5-8b74-4c63-bcf7-c09a9af777fc`는 exact ID 조회로 closed+archivedAt 존재를 확인했다. 결과/사용량 보존은 [review-completion.json](evidence/auth-direction-independent-review-2026-10-20/review-completion.json). 다른 이전 작업자는 건드리지 않았다.

새 메인은 수정 전에 해당 cwd의 agent/terminal과 접근 가능한 native 목록을 재확인한다. 이전 메인의 인계 완료와 파일 소유 범위를 대조하고 같은 파일을 동시 편집하지 않는다. 도구가 과거 native를 보여주지 않으면 미확인으로 남기고 이미 보존된 결과를 읽는다. 강제 종료·재생성으로 해결하지 않는다.

## 재개와 완료 판단

첫 행동은 현재 계획과 위5root의 HEAD/status/보호 목록·담당 상태를 좁게 대조하고, 기존 승인 안의 읽기 전용 확인을 마치는 것이다. 새로운 차이가 없으면 완료 근거를 다시 생산하지 않는다. 다음 제안 단위인 계획1단계의 계약 결정/후속 실행 지시가 없는 상태를 명시한다. 허용된 후속 요청이 오면 현재 호스팅 후보 하나를 평가하고, 부족한 승인만 구체적인 변경안과 함께 확인한다. A2·새 observer·보안 완화로 자동 진입하지 않는다.

이후 승인된 범위의 최소 구현/검증 → 현재 Home·Estimate·독립 복구 준비 → 각 실제 적용 순서다. 최종 순서는 계획4단계의 canonical relay → schema → 기존 Jay → Home 관리자 → Estimate 실제 연결/미허용 개인 JWT403 → 별도 verified → Estimate 전체 허용집합의 명시 grant → 실계정 HTTPS다. 로컬 허용 경로와 실제 미허용403은 다른 증거이며 임시 bypass grant를 사용하지 않는다. G1–G5의 실제 동작을 확인한 뒤 Jev·초대/실메일로 진행한다.

새 메인은 계획의 `G번호→차단 증거→수정 파일/대상→최소 검증→멈출 조건`과 자신의 신규 diff로 범위를 관리한다. 새 기능/선택적 개선은 보류하고, 같은 원인으로 두 번 막힌 뒤 새 근거가 없으면 접근을 재판단한다. 중요한 새 결함의 검증을 생략하는 횟수 제한으로 쓰지 않는다. 새 위원회/보고서를 자동 추가하지 않는다.

승인된 명확한 작업은 자율 완료하고 중요한 모호함·권한 부족·파괴적 조치만 확인한다. 분리할 실익이 있는 조사·구현·테스트·리뷰는 담당/파일/검증 기준을 정해 위임하며 구현은 가능하면 gpt-6.1-sol과 위험에 맞는 추론 수준을 사용한다. 불가하면 한계를 밝히고 가능한 수단으로 진행한다. 위임 결과는 메인이 직접 검토·검증한다. 전제 변경과 실제 진척을 알리고, 막히면 가능한 독립 작업 뒤 미완료와 최소 재개 조건을 보고한다. 완료 후 변경·이유·검증·제약·산출물·다음 우선순위를 보고하고 문서를 최소 갱신한다. 미요청 개선은 이어서 실행하지 않는다.

최종 확인에서5개 HEAD와 다른4root의 status가 보존됐고 각 `git diff --check`는 exit0이었다. S에는 이 인계문만 신규 status 항목으로 추가됐다. 이 문서의 로컬 링크15개·공백 검사, 기존 계획/독립 리뷰/검증/완료 기록의 hash, 이전 STATUS22901bytes 원문 보존도 통과했다. 보호71파일은 앞선08:09 대조 결과이며 문서 편집 후 다시 읽지는 않았다. 제품 테스트·빌드·DB/계정/로그 조회·hosted probe·운영 변경은 수행하지 않았다. `paseo-handoff` 스킬은 문맥 정리만 사용했으며 사용자 지시에 따라 후속 agent를 만들지 않았다.
