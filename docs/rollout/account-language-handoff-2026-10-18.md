# 인증 운영 전환 재개 인계 — 2026-10-18

> 2026-10-18 후속: 영속 초대·Home 운영 소스 조정은 구현·로컬 검증·후보 패키징까지 완료했다. 최신 artifact·종료 영수증·운영 재개 조건은 [인증 운영 전환 준비 결과](auth-transition-preparation-2026-10-18.md)를 우선한다. 아래 09:40–09:42 관측과 당시 미착수 목록은 역사적 기록이다. 실제 등록·권한·메일·hosted 설정·배포는 수행하지 않았다.

이 문서는 2026-10-18 09:39–09:42 JST의 대화·읽기 전용 확인을 반영한다. 이전 대화 없이 재개할 수 있도록 최신 결정과 정확한 중단 지점을 보완한다. 이 인계 작성은 새 구현·운영 변경의 승인이 아니다. 이번 턴에는 이 문서만 추가하며 commit/push/merge/배포·설정 변경·새 에이전트 생성·프로세스 종료를 하지 않는다.

## 사용자 결정과 승인 경계

- 목표: 최신 공통 UI0.7.1 위에 Console 중앙 회원·권한·로그인을 연결한 후보를 실제 운영 전환까지 마무리한다. 현재까지 승인된 구현·격리 검증·운영 준비는 계속할 수 있다. 실제 운영 적용은 아래 문서의 구체 대상·변경·보존/복구 조건을 갖춘 후 필요한 승인만 받는다.
- **확정된 우선순위:** 사용자는 호스팅을 당장 통합하지 않고 인증 운영 반영을 먼저 마무리하기로 했다. naeil.dev는 Vercel, Estimate/Jev는 Mac mini, 로그인 제공자는 Supabase Auth라는 현재 배치를 유지한다. 호스팅과 로그인 제공자는 다른 역할이다.
- **확정된 정책:** 최초 Console 관리자는 Jay 1명, 서비스는 회원별 명시 허용표를 사용한다. 실제 Auth UUID·본인 확인·회원 등록·서비스별 grant는 미확정/미적용이다. 관리자라는 이유로 서비스 이용 권한을 자동 부여하지 않는다.
- **제안된 다음 구현 방향:** 현재 Vercel에서 동작하도록 초대 transaction을 Supabase 등 공용 영속 저장소로 옮기고 서버 비밀 설정 공급을 보완한다. 이전 메인이 이를 다음 작업으로 안내했지만 아직 설계 확정·코드 변경·검증하지 않았다. 기존 보안 계약 안에서 설계·로컬 구현을 구체화할 수 있으며 hosted DB/비밀 설정 적용 승인은 별개다.
- **장기 제안에 그친 것:** 공개 앱을 Vercel 실행 + Supabase 업무 저장으로 통합하는 방향. 사용자는 Vercel에 열려 있었으나 이번에는 인증이 우선이라고 정했다. 앱 이전·업무 데이터 이전·유료 서비스 계약을 할 일로 추가하지 않는다.
- 실제 회원/권한 등록, 실제 메일, hosted provider/signup/callback/SMTP 변경, push/main merge/운영 배포, DNS/tunnel 변경을 포괄 승인받은 것으로 해석하지 않는다. 특히 사이트 push/main merge가 Vercel 배포를 유발할 수 있다. 인계 자체로 승인 범위를 넓히지 않는다.
- 지원 언어는 naeil.dev·Jev ko/ja/en, Estimate ja 전용이다. 자동 SSO·전역 logout·서비스 간 언어 동기화·계정별 언어 저장·견적 본문 번역·개인별 견적 데이터 분리는 승인된 추가 요구가 아니다.

## 현재 완료와 미완료

구현·로컬 통합 검증은 완료했고 인증은 미배포다. 세 앱의 공통 `NaeilHeader`/`NaeilFooter`/`NaeilHeaderAccountControl`0.7.1 운영은 유지한다. 앱별 계정 메뉴를 다시 만들거나 옛 인증 branch 전체로 덮어쓰지 않는다.

구현된 인증 상태·계정 정보·guarded logout/계정 전환·저장 보호·언어 유지와 검증 범위는 [통합 결과](account-language-integration-2026-10-17.md)의 「연결한 동작과 수정」「언어 계약」「검증 증거와 경계」를 읽는다. 정확한 실행 결과·해시·산출물·명령은 [통합 영수증](evidence/account-language-integration-2026-10-17/summary.json)과 [증거 안내](evidence/account-language-integration-2026-10-17/README.md)에 있다. 이 인계 턴에는 해당 테스트 suite를 재실행하지 않았다.

완료 주장의 한계:

- 사이트 동결 artifact는 synthetic public Auth 설정의 로컬 검증 전용이며 `productionReady:false`다. 그대로 운영에 배포하지 않는다.
- 실제 로컬 Auth/OTP/Home/SMTP capture/DB 초대 흐름20건은 통과했지만 외부 OAuth 교환은 fixture다. 실제 Google/GitHub·provider identity 연결·실제 수신함·운영 HTTPS 개인 세션 성공은 미확인이다.
- Estimate의 초기 전체 browser365건은355 pass/10 fail이었다. 수정 후 영향66건 및 selector 보완 재실행은 통과했지만 최종 전체365 재실행 기록은 없다.
- Home은 좁은 backend339·frontend911 등 기록된 범위가 통과했다. 전체 backend 기존4실패/전체 타입72진단이 남고 전체 Home green이 아니다.

**정확한 중단 지점:** 마지막 답변에서 다음 작업으로 안내한 ① Vercel 초대 지속성/비밀 공급 보완, ② Home 현재 운영 코드와 Console 변경 조정은 둘 다 착수 전이다. 운영 로그인 설정/실회원/실메일/순차 배포도 미실행이다. 현재 후보는 운영 준비 전체 완료 상태가 아니다.

## 작업 위치와 먼저 읽을 자료

아래 HEAD는 인계 확인 시점의 문서 포함 HEAD다. 실제 검증 runtime source/산출물은 통합 결과의 별도 표를 따른다.

| 대상 | 기존 통합 작업 위치 | branch / HEAD |
| --- | --- | --- |
| 사이트 | `/Users/jaymini/.paseo/worktrees/28nele6j/naeil-account-language` | `integrate/console-account-language-site` / `02aa72e6` |
| Estimate | `/Users/jaymini/.paseo/worktrees/1bnldk74/estimate-account-language` | `integrate/console-account-language-estimate` / `860e79b3` |
| Jev | `/Users/jaymini/.paseo/worktrees/3tl6a87q/jev-account-language` | `integrate/console-account-language-jev` / `2fc435a3` |
| Home | `/Users/jaymini/.paseo/worktrees/3qtenke4/naeil-home-account-language` | `integrate/console-account-language-home` / `e1422970` |

네 작업 위치는 문서 추가 전에 clean이었다. 이 문서 추가 후 사이트에만 이 새 문서가 untracked로 남으며 제품 코드는 바꾸지 않는다.

1. 이 문서, [통합 결과](account-language-integration-2026-10-17.md), [운영 전환 조건](account-language-transition-2026-10-17.md)을 전체 읽는다. 전환 조건의 「아직 해결해야 하는 운영 조건」「승인 후 전환 순서」「중단·복구」가 실행 경계다.
2. 사이트의 `AGENTS.md`, `docs/superpowers/specs/2026-10-17-console-account-language-integration.md`, 동명의 `plans/` 문서. 공유 UI를 바꿀 필요가 생기면 `DESIGN.md`와 기존 컴포넌트 계약도 읽는다.
3. Home의 `openspec/changes/naeil-console-access/baseline.md`, `baseline-manifest.json`, `invitation-contract.md`, `account-integration-verification-2026-10-17.md`. 운영 overlay 보존 위치, source 대응, 검증 명령, 실제 설정의 미확인 조건이 있다.
4. 초기 배경이 필요하면 `/Users/jaymini/.paseo/worktrees/28nele6j/pure-chicken/docs/rollout/account-language-handoff-2026-10-17.md`를 참조한다. 그 문서의 「통합 미실시」「merged CI 미완료」는 과거 상태이므로 최신 통합 결과를 우선한다.

기존 변경 보존: 관련 checkout11개 상태를 대조했고, 통합4곳과 shared checkout은 clean이었다. `/Users/jaymini/.paseo/worktrees/28nele6j/terrific-buffalo`의 `docs/design/frontend-sources.md` 수정 및 `docs/design/console-mockup/` untracked는 그대로 있다. 원본7개 전체 상태표는 기존 `original-worktrees.json`에 있다. Home 보존 worktree의 dirty 후속 파일을 운영 원본이라고 복사하지 않는다. 운영/업무 데이터·backup·실token·env 내용은 읽거나 fixture로 복사하지 않는다.

## 재개할 첫 행동과 검증

1. 위4개 checkout의 branch/HEAD/status와 새 편집 담당을 다시 대조한다. 이 문서는 의도된 미커밋 인계 자료다. 기존 동결 artifact는 보존하고 필요한 변경은 격리 위치에서 만든다.
2. 먼저 사이트의 `src/lib/auth/invite.ts`, `invite-config.ts`, `src/app/auth/invite/route.ts`와 Home의 `invitation-contract.md`를 대조한다. 현재 코드는10분 `Map` transaction과 외부 절대 경로의0600 파일에 의존한다. Vercel 공용 영속 transaction/안전한 서버 비밀 공급 설계와 로컬 검증 계획을 구체화한다. 재시작·여러 인스턴스·원자적 소비·만료·재전송/취소·애매한 실패 후 재시도·proof binding/replay를 검증한다. 일반 OAuth 성공을 초대 수락으로 바꾸거나 새 도메인을 만들지 않는다.
3. 독립적으로 Home의 두 backend/script overlay와 frontend4개 제품 소스 차이를 현재 Console 후보에 조정하고, 실제 운영 기능을 보존한 후보를 만들고 검증한다. 운영 원본 재구성 근거는 Home `baseline.md`의 「코드와 Git의 관계」「Frontend와 브랜드」다. 이 작업이 기존 auth branch 전체 배포를 의미하지 않는다.
4. 중앙 schema/policy·실제 제공자/callback/signup/SMTP·Jay UUID/회원별 허용표·운영 artifact·데이터/backup 보존·중단/복구안을 구체적으로 준비한다. 현재 운영 설정이 불명확하면 승인된 읽기 전용 확인부터 한다. 로컬 초기화용 runner를 hosted에 실행하지 않는다. 필요한 실제 적용 승인은 대상/변경이 검토 가능한 상태가 된 뒤에만 확인한다.
5. 실제 전환 시 한 서비스씩 최신 writer ownership과 데이터 보존 근거를 새로 확보하고 진행한다. Estimate 단일 writer/전용 Node24.21.0/schema3/revision, Jev SQLite/quota/stream, Home 단일 worker/session 계약을 유지한다. 수동 lock 삭제·강제 kill·이전 backup 복원·기존 편집 탭 강제 새로고침을 하지 않는다. 중앙 권한 집행 후 password-only artifact로 되돌리지 않는다.

운영 완료 기준: 승인된 실계정과 실제 HTTPS에서 Google/GitHub 로그인, 현재 중앙 권한, 익명/legacy401·거부/차단403·의존성503, revoke/outage logout, 계정 전환·저장 보호·언어 유지, 초대/실메일 및 재시작 조건을 실제 배포 artifact에 대해 확인한다. 구현·로컬 검증·패키징·배포·운영 확인을 구분하여 기록한다. 상세 조건은 운영 전환 문서를 따른다.

## 인계 직전 실행 상태와 재확인 방법

- 09:40–09:41 JST: 세 공개 `/.well-known/naeil-ui.json`은 기존0.7.1 identity와 일치했다. 사이트 source `ff372235`, Estimate `8c3e043`, Jev `35dd474`이며 전체 identity는 기존 `production-unchanged.json`과 같다. Estimate/Jev의 첫 Python HTTP 요청은403이었지만 동일 URL의 일반 `curl --fail --silent --show-error --max-time 20` 조회는 성공했다. 이 metadata 조회는 실제 인증 검증이 아니다. 재개 시 각 공개 URL을 다시 조회한다.
- Estimate `~/.local/share/estimate-app/current`는 기존 `releases/8c3e0430293d-82280965179e`를 가리켰다. 이 경로를 현재 writer/PID 검증의 대용으로 쓰지 않는다.
- 09:41 JST: Home에서 `python3 scripts/console-baseline.py`를 읽기 전용 재실행하여455/455파일 일치, stable identity, changed/missing/unexpected/refused 각0, exit0를 확인했다. 원래 `baseline-manifest.json`과 hash도 동일하다. 이 검사는 source/static 비교이며 재구성 후보의 빌드·테스트는 아니다. 재개 시 같은 검사와 overlay/source-manifest 존재를 다시 확인한다.
- 이전 소유 fixture `/private/tmp/naeil-account-language-review-20261017/fixture-home`와 보존 volume `supabase_db_naeil-account-language-20261017`, 사이트/Jev/Estimate 동결 artifact 경로는 현재 존재한다. 이 턴에 archive 전체 hash를 다시 계산하지는 않았다.
- `lsof -nP -iTCP:2482,2483,19676,19677,19678,55421,55422,55321,55322 -sTCP:LISTEN -Fpcn`에서55321/55322만 listening이었다. 다른 열거 포트에는 listener가 없었다. 이 결과는 모든 프로세스 종료의 증거가 아니다. 기존553xx는 범위 밖이며 재시작/삭제하지 않는다. fixture 과거 정리·가상 행0·volume 보존 근거는 `fixture-stop-receipt.json`에 있다. 재사용 전 ownership을 새로 확인하고 DB mutation 테스트를 동시에 돌리지 않는다.
- native collaboration 목록은 `/root`만 running이었다. 환경에 이전 이름으로 보이는 `central_auth_review`, `estimate_integration`, `jev_integration`은 현재 live 목록에 없었다. 이 조회만으로 과거 에이전트의 종료/완료 상태를 소급 확정하지 않는다. 구현/검증 완료는 해당 소비 앱 보고서에 근거한다.
- Paseo 최근72시간을 위4개 통합 cwd와 shared cwd로 조회했다. 통합 cwd에는 해당 agent0, shared cwd에는 현 메인 `3847a777-9c45-4eca-b574-26d34a727c3e`만 running, 다른4개는 idle이었다. 다른 cwd/세션 전체의 상태를 보장하지 않는다. 새 메인은 수정 전 조회를 갱신하고 담당 파일 중복을 피한다. 이 턴에 agent를 재가동·종료하지 않았고 장시간 실행 중인 tool/test도 없다.

## 새 메인의 실행 원칙

이번 작업과 이후 후속 요청의 메인으로 계획·분할·통합·최종 검증을 책임진다. 근거가 충분한 완료 작업은 반복하지 않는다. 승인된 명확한 작업은 자율적으로 끝내고 중요한 모호함·권한 부족·파괴적 조치만 확인한다. 독립 작업은 이익이 있을 때 위임하며 구현에는 가능하면 gpt-6.1-sol과 위험에 맞는 추론 수준을 쓴다. 담당 범위·수정 파일·검증 기준을 명시하고 결과를 직접 검토/검증한다. 모델/도구가 없으면 제한을 밝히고 가능한 수단으로 진행한다. 중요한 전제 변경을 알리고, 장애 시 독립 작업을 마친 뒤 미완료와 최소 재개 조건을 보고한다. 완료 후 변경 이유·검증·제약·산출물·다음 우선순위를 보고하고 진행 문서를 최소 갱신한다. 미요청 개선을 계속 실행하지 않는다.
