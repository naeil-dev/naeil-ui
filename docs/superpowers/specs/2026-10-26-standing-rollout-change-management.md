# Standing rollout 변경 관리 재설계

상태: 사용자가 2026-10-26 A 방향의 구현·격리 검증을 승인했다. 구현은 별도 브랜치에서 진행 중이다. 운영 설치·정책/state 전환·재개·main 머지는 별도 승인 대상이며, STOP을 유지한다.

최신 검증: `2bf65cf`의 hosted CI 두 job과 v5의 사이트 읽기 전용 검증(9경로·72조건)은 통과했다. Estimate는 smoke까지 통과한 뒤 E2E 셸 위임 실행에서, Jev는 오프라인 설치·엄격한 의존성 변경 검사 통과 후 단위 검사의 Python 위임 실행에서 중단됐다. 두 소비자의 전체 수용 검증은 미완료이며, 정확한 실행 파일 핀 교정과 새 격리 root 검증이 남아 있다. 보존 대상은 삭제하지 않으며 현재 저장 공간 부족으로 전체 재검증을 대기한다. 자세한 근거와 재개 조건은 [구현 계획](../plans/2026-10-26-standing-rollout-a.md#progress-evidence)에 기록한다.

구현 검토에서 확인한 남은 범위: 첫 실행 세대는 정확한 0.7.2와 한 번의 Estimate 후속 시도에 묶인다. §6의 채택된 소스 기록 재사용과 후속 candidate 준비는 구현했지만, §6·§12의 다음 dependency-only 릴리스를 실제 worker로 실행하는 절차는 아직 충족하지 않았다. 현재 승인 기간 안의 0.7.3도 이 세대로 자동 배포할 수 없다. 이 요구를 삭제하거나 완료로 간주하지 않으며, 새 candidate·config·generation·attempt를 결합하는 별도 후속 절차가 필요하다. 이번 0.7.2 복구 수정에서 기존 실행 제한을 완화하지 않는다.

기준: main `40a3928e24cd2f0141be3e605eed0a75260938fd`, 설치된 r5는 PR [#26](https://github.com/naeil-dev/naeil-ui/pull/26)의 `f2bef4b8f66831c07a4f601ae8ceeece41ebc408`이다. 기존 [standing 설계](2026-10-23-standing-ui-release.md), [운영 지침](../../rollout/standing-rollout.md), [reviewedMigration 설명](../../rollout/automation.md#proposed-policy-pending-approval)을 대체하는 구현이 아니라 다음 변경의 제안이다. 시각은 별도 표기 없으면 UTC다.

## 1. 결론과 승인할 범위

권고는 **검증 기대값, 소비자 소스 승인, 로봇 실행 세대를 분리하고, 같은 공개 0.7.2의 남은 반영을 완료하는 것**이다. 현재 확인된 실패는 패키지 결함보다 검증·운영 변경을 수용하는 절차의 문제다. 새 버전을 만들어도 같은 테스트와 state 문제가 남는다. 실제 패키지 결함이 발견되면 그때 새 버전으로 대체한다.

첫 구현은 다음에 한정한다.

1. 크기 때문에 읽을 수 없는 state의 보존·전환과 STOP/상태 관측 복구.
2. 릴리스별 기대값을 받는 검사기와 소비자 테스트, 격리된 소비자 사전검사.
3. 정확한 소비자 소스 승인 및 실행 세대 교체 절차. 기존 실패 시도는 불변으로 남긴다.
4. 0.7.2를 이어갈 정확한 계획과 재개 전 검증. 사이트 SHA가 바뀌면 별도 승인된 사이트 검증 기록을 사용한다.

대체/건너뛰기는 아래 상태 모델에 정의하되, 첫 구현에서 자동 skip 기능은 만들지 않는다. 경보 전달은 제안만 한다. 수신자·채널 연결, 로봇 재설치, main 머지, 재개는 이 문서 작성의 실행 범위가 아니다.

## 2. 재확인한 사실과 인계 정정

2026-10-26 01:49–01:50에 비밀값 없이 읽기 전용으로 확인했다.

| 항목 | 관측 |
| --- | --- |
| main / PR #26 | main은 위 SHA, #26은 OPEN·미머지·기존 CI 성공 |
| 공개 서비스 | naeil은 0.7.2, Estimate·Jev는 0.7.1. public identity가 마지막 검증된 artifact/source와 일치 |
| health | naeil `/ko` 200, Estimate·Jev public 및 localhost `/api/health` 200 |
| 기존 기록 | 0.7.2 naeil `production-verified`, Estimate `gate-failed`, Jev 미시작. Estimate는 source mutation만 시도했고 runtime mutation은 false |
| 보존 대상 | Estimate `rollout/standing`의 `c2407a91e00a2507203e2dbd8f2a505bdfd131b9`, candidates와 detached worktree, operations 기록 |
| 기존 승인 | 0.7.2의 세 서비스 `reviewedMigration` 만료는 `2026-11-01T21:00:00Z` |
| 실행 상태 | launchd 등록·300초 주기, 관측 시 실행 중 아님·마지막 exit 1. dispatcher lock 및 Estimate running lock/operation marker 없음 |
| STOP | `~/.local/share/naeil-ui-rollout/STOP`, 0600, **2026-10-26T01:50:23Z 생성**. 설정의 stopFile과 일치 |

추가 장애: `state.json`은 **2,926,952 bytes**, 정규 단일 링크·소유자 일치·0600이다. r5의 `readPrivateJSON` 기본 상한 **2,097,152 bytes**를 넘어 `inspect`와 정기 poll 모두 읽기 검사에서 실패한다. config/trustedFiles 검증은 통과한다. summary는 `2026-10-25T22:35:14.734Z` 이후 갱신되지 않았고 stderr에는 일반 오류만 반복된다. 권한 문제로 단정하거나 chmod로 해결할 문제가 아니다.

현재 구현은 state를 읽은 뒤 STOP을 확인한다. 따라서 **STOP 파일의 적용은 확인했지만 dispatcher summary의 `stopped` 전환은 확인할 수 없다**. 지금은 state 읽기 실패가 배포를 막고 있고, 정상 읽기가 복구되어도 존재하는 STOP이 다음 단계 시작을 막아야 한다. 이번 작업에서 state·정책을 수정하거나 poll/reconcile을 호출하지 않았다.

추가로 r5의 `loadConfig`와 `inactiveState`만 읽기 전용으로 호출해 **`stopped` 판정**을 확인했다. 이는 full poll 성공과 다르다. STOP 생성 전후 state와 standing config의 SHA256은 동일하다.

인계 정정: Jev 원본 `shared-chrome.spec.ts`에는 0.7.1 literal이 있지만 r5의 `jev-candidate.mjs`가 해시 고정된 복사본에서 버전·contract·account reference를 치환한다. Jev가 0.7.2에서 실패했다고 단정하지 않는다. **미실행이며, 원문/치환 개수/전체 fixture 해시에 의존하는 유지보수 부담이 있다**는 것이 확인된 사실이다.

HTTP 관측에서 기본 Python User-Agent는 native public endpoint에 403을 받았고 일반 브라우저 User-Agent로는 200이었다. localhost도 동일한 artifact를 반환했다. 이는 health/identity 관측이며 인증 브라우저 전체 검증을 새로 수행한 결과가 아니다.

운영 근거는 공개 저장소 밖 `~/.local/share/naeil-operations/20261026/standing-redesign/stop-created.json`에 있다. 쿠키·토큰·비공개 설정·raw state는 PR에 넣지 않는다.

## 3. 실패를 만든 결합

| 결합 | 현재 근거 | 바꿀 원칙 |
| --- | --- | --- |
| 카탈로그 변경 = 검사기 수정 | main `checkMenu`는 이미지 5개 고정. #26은 버전 경계로 5/1을 선택 | 검토된 릴리스 기대 데이터와 일반 검사 로직 분리. 알 수 없는 버전을 임의로 1개로 간주하지 않음 |
| 카탈로그 변경 = 소비자 테스트 수정 | Estimate 두 suite는 옛 5개 URL, `/ja/cc`, 두 열의 실제 점유를 고정 | 메뉴 내용은 릴리스 기대값, focus·guard·저장·수정키 동작은 소비자 불변 조건 |
| 테스트 수정 = 소비자 전체 승인 재설치 | 두 adapter가 reviewed source 이후 package/lock/vendor만 허용. Jev는 fixture 전체 해시도 고정 | 자동 dependency lane은 유지하고, 정확한 새 소스 승인을 별도 기록으로 교체 |
| 로봇 교체 = 진행 중 binding 파괴 | dispatcher binding에 release, automation, trustedFiles, PATH, policy, services가 함께 포함 | 과거 binding 보존, 승인된 후속 attempt와 새 실행 세대로 연결 |
| main 문서 머지 = 사이트 검증 이탈 | site는 Git/Vercel 자동 배포. 캐시 재검증은 과거 artifact/source를 요구 | package 불변성과 현재 사이트 deployment 검증을 구분하되, 새 SHA는 정확히 다시 승인·검증 |
| 영수증 축적 = 상태 읽기 불능 | state에 전체 request/result/검증 자료·history를 중복 포함 | 작은 상태 인덱스와 크기 제한된 독립 영수증. writer와 reader의 공통 상한 |
| 정기 job 존재 = 누군가 감시 | notifier 미설정. state 읽기 실패는 summary도 갱신 못 함 | 운영 의도·job 생존·배포 진행·사람에게 전달 여부를 각각 관측 |

근거 코드: `scripts/verify-ui-production.mjs`, `standing-dispatcher.mjs`의 `poll`/`inspect`/`reconcile`, `standing-config.mjs`의 `readPrivateJSON`, `estimate-standing-adapter.mjs`의 `cleanCheckout`/E2E 호출, `jev-standing-adapter.mjs`의 sourceCheck, `jev-candidate.mjs`, `update-consumer.mjs`. 경로 앞 `scripts/rollout/`은 생략했다. 실제 테스트 literal은 보존된 consumer clone에서 읽기만 했다.

## 4. 유지할 경계

- 공개 0.7.1·0.7.2의 npm bytes, tag, Release assets, references는 불변이다. 기존 release.json을 고쳐 승인이나 새 메타데이터를 끼워 넣지 않는다.
- 자동 lane은 지정된 세 서비스, 순서 naeil → Estimate → Jev, exact UI archive, 제한된 dependency delta를 유지한다. 0.x minor, API/contract/DOM/frame/guard 변경의 별도 검토를 없애지 않는다.
- auth·dirty/save·stream·수정키 navigation guard, 실제 account UI, package provenance, 독립 render reference, artifact identity, ownership·lock·marker·데이터 보존 검사를 약화하지 않는다.
- live DOM이나 설치된 패키지가 보여주는 값을 그대로 expected로 삼지 않는다. package 자체의 선언은 일관성 검사에 쓰고 승인된 기대값은 독립 입력으로 둔다.
- STOP은 새 단계 진입을 막는다. 이미 native stop이 시작된 전환은 기존의 제한된 완료/복구 규칙을 따른다. uncertain invocation을 재실행하거나 marker/lock을 삭제해 진행하지 않는다.
- private 설정은 본 단계에서 읽기만 한다. 운영 서비스, 소비자 저장소 push, Home Console와 인계 5절의 보류 작업은 범위 밖이다. Paseo 재시작이 필요한 단계는 시작 전에 사용자에게 알린다.

## 5. 릴리스 기대값과 소비자 사전검사

### 5.1 검증 입력

일반 검사기는 검토된 `expectations` 데이터를 받아 메뉴의 정확한 항목 ID·순서·locale별 URL·접근 가능한 이름·이미지 URL을 검사한다. 수량은 그 목록에서 계산한다. 빈 목록이나 누락된 locale, 중복 ID, 선언되지 않은 외부 URL은 실패한다. responsive layout은 승인된 배치 규칙과 frozen geometry를 사용한다. 항목 하나로 두 열이 채워지지 않는 것은 실패로 취급하지 않되, target 크기·넘침·focus·정렬 검사는 유지한다.

`resolveHref`, `currentProjectHref`, `projects` 등의 기존 공개 consumer override는 유지한다. 세 서비스에서 실제 승인된 routing profile을 exact consumer source/config와 묶고, 기대 URL은 canonical data와 그 profile로 계산한다. live href를 다시 expected로 쓰거나 승인 없는 override를 자동 채택하지 않는다. actual 수집과 expected 공급은 별개 경로로 유지한다.

기대 데이터는 `releaseId`, UI version/contract, source SHA, archive/chrome/account reference digest와 묶는다. schema version은 UI public contract version과 별개다. 새로운 데이터 형식을 기존 worker가 임의 해석하지 않고 미지원 schema로 차단한다. 데이터에 명령, 실행 경로, selector 코드, 승인 플래그를 담지 않는다.

향후 릴리스는 검토된 선언과 Storybook 독립 캡처를 함께 검증한 기대 데이터를 release 준비 단계에서 고정한다. 렌더러에서 자동 추출한 내용만 검토 없이 승인하지 않는다. 패키지 export를 새로 추가할지는 구현 시 최소 변경으로 정한다. 공개 API 추가는 이 설계의 전제가 아니다.

0.7.1/0.7.2는 공개 assets를 수정할 수 없고 기존 chrome reference에는 카탈로그 목록이 없다. 따라서 **정확한 기존 release digest에만 대응하는 검토된 호환 입력**을 automation의 비실행 데이터로 둔다. 0.7.1의 다섯 항목과 0.7.2의 `design` 한 항목을 명시하고 각 승인·출처를 기록한다. 미래 버전으로 범위를 확장하는 `>=0.7.2 → 1` 규칙은 제거 대상이다. #26은 임시 보완이며 이번 문서 PR에 포함하거나 머지하지 않는다.

데이터 schema 테스트만으로 통과를 주장하지 않는다. 승인 expected를 고정하고 실제 렌더의 누락·추가·재정렬·잘못된 locale URL/이름/이미지·숨겨진 중복·잘못된 열 배치를 변조해 각각 실패를 확인한다. 수량만 같은 잘못된 메뉴도 실패해야 한다. 0.7.2 한 항목의 승인된 실제 1열 배치와 단순히 두 열을 채울 필요가 없다는 조건을 구분한다. provenance 단계의 미승인 expected/version/digest/schema 거부는 별도로 검사한다.

### 5.2 소비자 테스트

Estimate의 standing fixture를 확장해 동일하게 검증된 기대 데이터를 제공한다. 일반 개발 테스트는 그 소비자에서 명시적으로 고정한 reviewed fixture를 사용한다. 입력이 없거나 mismatched이면 standing 실행은 실패해야 하며 현재 DOM에서 기대값을 추정하지 않는다.

Jev는 원문 문자열 치환을 장기 API로 유지하지 않는다. 소비자 테스트가 명시적 fixture 입력을 받도록 검토된 소스 변경을 만든다. 기존 harness는 해당 승인 소스까지만 지원하며 예전 자료는 보존한다. suite 전체를 건너뛰거나 문자열 교체 범위를 자동 확장하지 않는다.

공통 내용의 변경은 한 기대 데이터로 해결하되, 소비자 guard와 업무 테스트는 소비자 소유다. 실제 존재하는 프로젝트 링크를 기대 데이터에서 선택해 primary/수정키/새 창/취소/저장 동작을 계속 검사한다. app routing, auth, logout busy state 및 desktop/mobile의 공유 lock도 기존 검증 범위를 유지한다.

### 5.3 사전검사

릴리스 후보를 고정한 뒤 **모든 선택 소비자**의 검토된 소스에 대해 별도 임시 checkout에서 install·정적 검사·build·isolated E2E·package parity를 먼저 수행한다. 현재 `rollout/standing` checkout, 운영 data, session, native activate를 사용하지 않는다. release가 제공하는 임의 명령 대신 승인된 adapter/harness만 실행한다.

결과는 package/reference digests, consumer source·lockfile·test/harness digests, automation generation, 검사 목록과 결과를 묶는다. 입력이 하나라도 바뀌면 재사용하지 않는다. 미래에는 publication gate로 삼는다. Git/Vercel main push와 npm publication은 별도 시스템이므로 이것이 세 서비스의 원자적 배포를 뜻하지 않는다. 이미 공개된 0.7.2에는 **재개 전 사전검사**로 적용한다. preflight 통과도 실제 activation 직전 ownership/data/identity 재검사를 생략하지 않는다.

현재 updater/adapter/observer는 STOP 아래 실행을 거부하고 일부는 운영 ledger/native inspect까지 함께 수행한다. 그대로 호출하거나 `ignoreStop`, 다른 stopFile, 가짜 enabled 정책으로 우회하지 않는다. 첫 구현에 **격리 candidate 준비·검증 진입점**을 둔다. 승인된 build/test/package 함수만 공유하고, 허용된 임시 디렉터리 밖 쓰기·운영 state/ledger/marker/baseline·native lifecycle·운영 data/배포 credential 접근은 불가능하게 한다. preflight 실행 승인은 배포 승인과 구분한다. site의 provenance/브라우저 검증도 별도의 읽기 전용 모드로 둔다. 기존 승인된 세션 갱신 저장은 허용하되 rollout state나 서비스 runtime은 바꾸지 않는다. STOP 존재 중 preflight/검증 성공과 **운영 native 호출 및 운영 rollout 파일 쓰기 0회**를 함께 검증한다.

`reviewedBaseSha`는 검토된 소비자 코드 기준이고 `candidateSourceSha`는 거기에 허용된 UI dependency delta를 적용한 정확한 실행 commit이다. 임시 checkout에서 candidate commit을 **한 번** 만들고 보존해 검사한다. 후속 실행 checkout은 같은 Git object·tree·lockfile을 받아야 한다. updater를 다시 실행해 내용만 같은 다른 SHA를 만들지 않는다. 사전검사 후 변경되면 다시 검사한다. 검사된 immutable artifact까지 동일 bytes로 넘기는 것이 기본이며, 재빌드했다면 source 수준의 적합성 결과만 재사용하고 새 artifact에 대한 package·identity·실제 isolated E2E를 다시 수행한다. native 단계 직전에는 실제 predecessor를 별도로 검증한다.

## 6. 소비자 reviewed source의 갱신

소스 핀은 제거하지 않는다. 한번 검토된 오래된 SHA를 무한히 유지하거나 매번 private config 전체를 다시 설치하는 두 선택을 피하고, 서비스별 **정확한 source approval 기록**을 제안한다.

| 입력 | 승인 범위 |
| --- | --- |
| source | 기존 reviewed base SHA, 새 reviewed base SHA, repository identity, diff digest, 승인된 변경 파일/목적 |
| 실행 코드 | package scripts, lifecycle scripts, lockfile, build config, adapter/native bridge, test harness의 변경 유무와 검토 |
| 지원 범위 | 소비자, fixture schema, public contract version, 허용된 dependency-only delta. 임의의 미래 소스 변경은 불허 |
| 검사/채택 | 정확한 새 base의 검토, 승인자·근거·채택 가능 만료. 실제 candidate/package/reference digest는 별도 attempt에 결합 |

기본 dependency-only 자동 경로는 그대로 둔다. 테스트 수정도 실행 코드 변경이므로 `tests/**`를 무조건 허용하지 않는다. source approval은 실행 중 attempt를 바꾸지 않고 다음 attempt에서만 사용한다. 서비스 하나의 source 갱신이 다른 서비스나 정책 권한을 넓히지 않는다.

일반 application main을 자동 pull하거나 최신 SHA를 자동 승인하지 않는다. 새 소스의 배포 가능성과 실제 runtime predecessor는 별개다. source rebase가 native runtime이 이미 배포되었다는 증거가 되지 않는다.

base 채택 승인 만료는 **아직 채택하지 않은 전환**을 막는다. 유효한 기간에 채택한 exact base의 검토 기록은 이후에도 provenance로 남는다. 그 base 위의 다음 dependency-only patch는 별도 source 재승인 없이 현재 유효한 standing window와 release별 승인 조건으로 실행할 수 있다. 실행 권한의 만료/철회는 계속 적용되며, base 기록이 배포 권한을 대신하지 않는다. 새 test/build/app 소스, 지원하지 않는 fixture schema/contract, 달라진 trusted 실행 코드는 새 검토가 필요하다.

Estimate `c2407a9`는 보존하고 reset/rebase하지 않는다. 후속 구현에서는 별도 review branch/checkout에서 수정하며, 승인 시 정확한 descendant 또는 명시적인 source 대응 기록을 만든다. 필터된 Estimate history의 SHA correspondence도 유지한다. 원본 기록과 새 checkout을 혼동하지 않는다.

이번 예: 보존된 `c2407a9`에서 별도 descendant로 fixture API를 고친 reviewed base를 검토한다. 이미 포함된 0.7.2 vendor/lock이 frozen bytes와 맞으면 그 정확한 commit을 candidate로 고정할 수 있다. isolated preflight 후 같은 candidate/artifact를 새 attempt에 넘긴다. runtime predecessor는 계속 운영 중인 0.7.1 artifact이며, source에 0.7.2가 있다고 이를 0.7.2 배포 성공으로 간주하지 않는다.

## 7. 실행 세대와 진행 중 변경

### 7.1 신원 분리

| 신원 | 의미 |
| --- | --- |
| Release identity | 공개 tag/assets/manifest/package/reference의 불변 digest. 로컬 경로 제외 |
| Automation generation | reviewed code/adapter/verifier/trusted executable closure, PATH, state schema |
| Authorization identity | 서비스 범위, patch window, reviewed migration, source/site 승인, 만료 |
| Attempt identity | 특정 generation·authorization·source·release·실제 predecessor에 묶인 일회 시도 |

모든 실행 시도에는 네 신원을 기록한다. runtime path나 실행 파일 핀은 generation 안에서 엄격히 검사한다. 분리한다는 이유로 trust 검사를 없애지 않는다. 같은 release를 다시 시도해도 새 attempt ID를 만들며, idempotency key와 service ledger가 과거 실패를 무시하거나 runtime mutation을 중복 수행하지 않도록 후속 시도 관계를 검증한다.

### 7.2 승인된 전환 절차

아래 이름은 **제안하는 작업 종류**이며 현재 사용 가능한 CLI 명령이 아니다.

1. STOP과 quiescence를 확인한다. dispatcher뿐 아니라 native adapter/child process/marker/ledger와 live identity를 확인한다. 파일 lock 부재만으로 완료를 추정하지 않는다. 승인된 전환에는 구 launcher의 재진입 차단도 포함한다. STOP 중에도 r5는 state를 쓰므로 순간적인 process 부재만으로 snapshot이 고정되지 않는다.
2. 읽기 전용 transition plan을 만든다. old/new generation, 전체 trusted closure 변화, source/policy 차이, 상태 변환, 유지/재검증할 증거, 서비스별 실제 predecessor를 표시한다.
3. exact plan digest를 승인받는다. state/lock/identity가 계획 생성 후 바뀌면 다시 계획·승인이 필요하다.
4. 원본 state와 모든 영수증을 보존하고, 원래 binding을 남긴 후 새로운 epoch/attempt가 이전 기록을 참조하게 한다. `delete binding`이나 과거 result 덮어쓰기는 지원하지 않는다.
5. 새 generation의 계획 검사, STOP 상태 관측, 이행 검사와 preflight를 수행한다. 설치 승인과 **STOP 해제·배포 재개 승인**을 별개로 기록한다.

| 과거 상태 | 후속 처리 |
| --- | --- |
| proven pre-mutation deferral | 승인·입력 유효성 확인 후 새 attempt |
| source만 변경된 gate failure | runtimeMutation=false, retained output 결합, lock/marker/process 부재, live predecessor 일치 후 source 승인과 새 attempt |
| runtime mutation 시도/uncertain/invoking | 재실행 불가. 원 generation/native recovery 근거로 실제 완료 여부부터 확인 |
| production-verified | 역사적 성공은 보존. 새 verifier/reference/route/source와 호환되는지 판정하고 현재 상태를 다시 검증 |
| 승인 만료 | 자동 연장 불가. 새 만료를 가진 별도 승인 기록 필요 |

자동 재설치와 자동 rebind는 하지 않는다. interruption 후에는 적용된 plan digest와 phase를 확인해 이어가며 중복 변환/실행을 거부한다. 실패한 state migration으로 실행이 가능해지면 안 된다.

전환은 옛/new state root 밖의 한 control directory에서 단일 writer 권한을 잡는다. 구 launchd job의 재시작을 승인된 방식으로 막고 기존 child가 안전한 종결점에 도달했음을 확인한 뒤 snapshot을 만든다. 이때 exact old generation/state digest를 비교하고, 새 generation·config digest·state root를 한 active pointer로 atomic 전환한다. 구 r5는 generation fence를 이해하지 못하므로 새 설정/디렉터리에 접근시켜 차단을 기대하지 않는다. 새 launcher는 모든 쓰기·dispatch 전에 active generation을 검사한다. 작은 transition journal에 plan digest와 prepared/imported/validated/cutover phase를 기록한다. 구 job 재활성화는 계획 밖이며 STOP을 유지한다. cutover 전 crash는 old pointer+STOP, cutover 후 crash는 new pointer+STOP에서 각각 검사 후 이어간다. runtime mutation 이후 옛 state로 단순 복귀하지 않는다.

기존 `reviewedMigration`과 그 published tuple은 수정하지 않는다. 발행 후 승인 갱신이 필요하면 이전 approval digest, exact release digest, 새 generation/attempt 범위, 유효 기간, 명시적 대체 관계를 가진 **새 승인 기록**을 만든다. 이는 현 r5의 prepublication binding 규칙을 우회하는 수정이 아니라 검토된 v2 전환 경로다. 원본 승인은 역사적 근거이고 새 실행에는 유효한 새 승인이 필요하다. 구현 때 두 운영 문서에 적용 우선순위를 갱신한다. 11월 1일 전에 끝난다고 가정하지 않는다.

Estimate 재시도는 같은 release/service idempotency key와 **새 attempt ID + 검증된 `priorAttemptId`**를 사용해 기존 ledger의 source-only 실패와 연결한다. 새 key로 과거 이력을 숨기지 않는다. native baseline/marker/ledger는 importer가 초기화하거나 다시 쓰지 않는다. service ledger 전환은 별도 adapter 검증과 기존 결과 보존을 거치며 uncertain/runtime-mutated 기록에는 이 경로를 허용하지 않는다.

## 8. state 저장과 상태 관측

전체 request/result를 state 안에 반복 삽입하지 않는다. 작은 versioned index에는 release/service/attempt 상태, identity, artifact ID, 영수증의 canonical relative path·SHA256·길이만 둔다. 큰 검증 결과와 history는 별도 불변 파일로 기록한다. 경로 escape·symlink·다중 링크·owner/mode·크기·해시·schema를 검사한다.

공통 writer/reader 상한과 크기 예산을 둔다. writer는 rename 전에 읽기 가능한 크기인지 확인한다. 영수증을 먼저 fsync하고 그 뒤 index를 atomic replace한다. 중단 뒤 참조되지 않은 파일은 보존·관측하며 자동 성공이나 삭제로 처리하지 않는다. 무제한 inline history는 없고, release별 index와 history 분할로 장기 운용에서도 상한을 유지한다. active state가 늘어나는 속도와 migration의 수치 기준은 구현 plan에서 정한다.

**실행 전 기록이 완료되어야 child를 시작한다.** attempt의 `invoking` 영수증과 이를 가리키는 index를 모두 fsync한 뒤 dispatch한다. 둘 중 하나만 durable인 시점에 중단되면 실행 여부를 보수적으로 uncertain으로 취급하며 재실행하지 않는다. terminal output은 검증·영속화 후 index에 반영한다. output은 있으나 index가 invoking이면 bound output을 대조하여 종결할 수 있지만 child를 다시 시작하지 않는다. 새 파일 저장 구조에서도 이 순서를 수용 시험으로 검증한다.

0.7.2 state의 전환은 일반 reader 상한을 무한히 올리는 방식이 아니다. STOP 아래에서 exact 원본 digest·길이와 제한된 상한을 가진 **일회 offline importer**로 읽고, 보존 원본을 건드리지 않은 새 디렉터리에 v2를 만든다. 모든 과거 attempt/binding/output/reference 링크를 대조하고 승인된 atomic cutover 뒤에만 새 generation이 읽는다. importer 재실행은 같은 결과로 멱등적이어야 한다. 검증 실패나 crash면 STOP 유지, 원본 보존, 실행 차단이다.

과거 request의 absolute output/archive/reference 경로와 bytes를 재작성하지 않는다. 새 index는 old epoch의 승인된 evidence root·길이·digest를 통해 해당 원본을 참조한다. 예전 `current stateDirectory/runs` 경계만 검사하는 reader는 v2의 epoch별 root 검증으로 교체하며 임의 외부 경로는 계속 거부한다. dispatcher index만 이행하고 소비자 source, native marker/baseline/ledger, 보존 artifact는 원위치에 둔다. 새 receipt는 새 root에만 쓴다.

크기 예산은 index뿐 아니라 단일 receipt, invocation input/output, release summary, operator status, monitor history에도 적용한다. 큰 manifest/reference는 검증된 별도 파일로 분리하고 transport에는 bounded reference를 전달한다. old-state importer의 유한 상한 외에 일반 무제한 reader는 만들지 않는다. summary/monitor는 최근·active 항목만 bounded index에 담고 과거 자료는 별도 history로 보존한다. 각 예산의 boundary/초과 시험을 구현 plan에 포함한다.

state를 못 읽어도 별도 작은 operator status를 남길 수 있어야 한다. trust/config의 안전한 최소 검사 후 STOP 의도를 관측하고, 실행 state의 오류를 `state-unreadable` 또는 `state-too-large`로 함께 기록한다. `stopped`로 덮어서 오류가 사라진 것처럼 보이지 않게 한다. 이를 위해 state를 복구하거나 우회하여 배포해서는 안 된다.

이 로컬 status를 읽는 inspect/monitor schema 호환까지 첫 구현 범위다. 상태 기록 자체가 실패하면 고정 reason code와 exit status를 최소 fallback으로 남긴다. 외부 수신자·전달·생존 감시 설치만 §11의 제안으로 남는다. 현재 monitor도 일부 state 읽기 오류를 `state-unavailable`로 처리하므로 그것이 반드시 함께 죽었다고 주장하지 않는다.

## 9. 사이트 SHA와 현재 검증

naeil의 과거 0.7.2 성공은 `dpl_FeF4E7wF2prnPixVT3dRPKsm3ksy`/`40a3928`에 대한 사실이다. main에 문서 또는 로봇 코드를 머지해도 새 Git/Vercel deployment가 생길 수 있다. 같은 package runtime만 증명해서 사이트 전체가 안전하다고 간주하지 않는다. auth·route·server 동작은 npm archive 바깥에도 있다.

제안하는 **site continuation approval**은 공개 release.json을 바꾸지 않고 package release와 별개의 새 site source/deployment에 대한 private 승인 기록이다. exact old/new SHA, 전체 사이트 변경 검토, main ancestry, exact-SHA push CI, Git/Vercel deployment provenance, emitted live identity, package runtime parity와 최신 protected/public production 검증을 요구한다. 문서-only라도 정확한 변경 범위를 검토한다. branch명이나 `latest`를 허용하지 않는다.

이 기록이 있으면 과거 naeil receipt를 성공으로 보존하고 현재 서비스 head에 새 검증을 연결한다. native 단계의 선행 조건은 그 새 head의 유효한 검증이다. 과거 artifact를 새 artifact로 덮지 않는다. 승인 없는 site 이동은 `site-revision-not-approved`로 멈춘다. 사이트 코드 rollback을 자동 수행하지 않는다.

구체적으로 published `release.siteSourceRevision`과 `siteArchive`는 원본대로 둔다. 별도 `siteTarget`은 exact 새 source/deployment, 그 소스에서 생성한 별도 package archive·runtime proof digest, 승인 digest를 담는다. 과거 siteArchive를 새 SHA의 증거로 재명명하지 않는다. observer의 CI/deployment/identity 검사, dispatcher의 `assertServiceResult`, fresh/cached production 재검증은 모두 검증된 `siteTarget`을 사용한다. `siteTarget`이 없으면 기존 published site identity만 허용한다. native adapter와 Python bridge의 `reviewedMigration`에는 원본 release tuple을 전달한다. site 승인은 package 변경 분류나 native 승인 만료를 해제할 수 없다. native dispatch 직전에도 현재 site identity가 승인 target인지 확인하고, 증거가 만료되거나 verifier/reference/route가 바뀌면 재검증한다.

현재 r5에는 이 경로가 없다. 구현 코드를 main에 머지해 0.7.2 재개 전에 site가 이동한다면 필요한 경로다. PR만 열어 둔 상태에서는 운영 main SHA를 바꾸지 않는다.

## 10. 멈춘 0.7.2 처리 선택지

| 선택 | 이점 | 비용·조건 | 권고 |
| --- | --- | --- | --- |
| A. 같은 0.7.2 완료 | 공개 package/asset 그대로, 실제 목적에 필요한 변경 최소화 | state 전환, 소비자 테스트/source 승인, generation 전환, 필요 시 site continuation, 승인 유효성 확인 | **기본 권고** |
| B. 새 정식 버전으로 대체 | 실제 package 결함이나 새로운 의도된 변경을 담을 수 있음 | 새 publication 검증과 각 서비스의 혼합 predecessor 경로 검토, 0.7.2 실패 역사 보존. 현재 문제도 먼저 해결해야 함 | 실제 package 수정이 필요할 때 |
| C. STOP 장기 유지 | 현재 안정 서비스 유지 | 혼합 버전과 승인 만료, 수동 상태 확인 부담 지속 | 구현을 미룰 때 명시적으로 선택 |

B를 선택해도 0.7.2를 완료로 조작하거나 `currentVersion`만 올리지 않는다. 0.7.2는 `superseded`라는 운영 결정으로 남으며 **실패가 성공으로 바뀌지 않는다**. naeil 0.7.2→target, Estimate/Jev 0.7.1→target 각각의 실제 artifact·source·archive·contract·데이터/rollback 호환 경로를 승인한다. 기존 consecutive patch 규칙을 무조건 해제하지 않고 정확한 transition만 예외로 인정한다. 새 package의 `previousVersion`을 편의상 거짓으로 쓰지 않는다.

향후 global `currentVersion`은 모든 서비스가 같은 릴리스를 검증했을 때의 요약이다. 서비스별 verified head와 미완료 release 기록이 진실의 근거다. skipped/superseded release의 tag/assets도 계속 immutability audit 대상이다. supersede에도 uncertain native 시도를 먼저 해결해야 한다.

## 11. 멈춤을 사람이 모르는 문제 — 제안만

기존 monitor의 blocked/expiry/stale/STOP 기준을 활용하되 관측을 네 축으로 나눈다: 의도(`running`/`paused-by-owner`), worker heartbeat, rollout 진행/실패, 전달 성공 여부. STOP에는 이유·생성 시각·담당자·다음 검토 시점을 연결하는 별도 작은 기록을 둘 수 있다. 계획된 정지는 장애와 다르게 표시하지만 진행 중 실패와 state 오류는 계속 보여준다.

launcher는 dispatcher가 시작·완료했는지와 exit code를 작은 별도 heartbeat에 남기고, state를 읽지 못하는 경우에도 제한된 실패 관측을 남겨야 한다. monitor 자체가 dispatcher state 상한 때문에 함께 실패하면 알려야 하므로 같은 full-state reader에 의존하지 않는다. launcher 자체가 실행되지 않는 문제는 같은 launchd 프로세스 안의 monitor만으로 감지할 수 없고 외부 생존 확인 또는 독립 타이머가 필요하다.

후보 정책: 새 blocked/uncertain/state-unreadable은 최초 1회 즉시, 반복은 기존 24시간 간격, stale 기준 20분, 승인 14일 전/만료, planned STOP은 약속한 재검토 시점에 알림. 기존 monitor의 문서화된 기본값과 새로운 paused semantics의 차이를 구현 전에 확정한다.

수신자·채널·야간 규칙·전달 실패 시 대체 경로는 사용자 선택 사항이다. payload에는 service/release/reason/since/로컬 영수증 위치만 넣고 로그·토큰·계정 정보는 넣지 않는다. **이번 단계에서는 외부 알림을 보내거나 notifier를 설치하지 않는다.**

## 12. 승인 후 구현 순서와 검증 기준

| 단계 | 작업과 통과 조건 |
| --- | --- |
| 1. 관측/state | 보존 fixture로 2MiB 초과를 재현. offline importer와 작은 index, inspect/monitor 호환 검증. STOP+깨진/큰 state에서도 실행 0회·관측 가능. 구 writer 재진입, cutover crash, 오래된 절대 경로 receipt, 모든 JSON 크기 경계, durable invoking barrier 검사 |
| 2. 기대 입력 | 0.7.1/0.7.2 호환 입력, unknown schema/version/digest mismatch 거부. 누락/중복/오래된 카탈로그 링크, wrong version/account reference 등 negative case가 실제로 실패 |
| 3. 소비자 소스 | 독립 review checkout의 Estimate·Jev fixture API 변경. STOP 아래 preflight 중 운영 쓰기/native 호출 0회. 동일 candidate SHA/tree/lock/artifact 전달, mismatch 차단. package parity, unit/type/lint/build, 실제 isolated E2E. 기존 guard/account/locale/theme/mobile/desktop 범위 유지 |
| 4. 실행 전환 | generation/source/policy diff plan 검증. 기존 binding 보존. 채택 base의 다음 dependency-only patch 재사용, 실행 승인 만료/철회, old receipt 재사용 조건, expire/drift/uncertain/native marker/동일 key 새 attempt, interruption 복구를 negative case로 검사 |
| 5. 사이트 | 새 exact SHA의 전체 변경/provenance/runtime parity·live protected/public 검증. 과거 receipt를 덮지 않고 새 승인 없으면 native 진행 불가 |
| 6. 0.7.2 재개 | 세 서비스 preflight 결과와 exact transition plan을 사용자에게 제시. 별도 운영 변경 승인과 STOP 해제 승인 이후 naeil → Estimate → Jev 실제 관측 |

단위 테스트나 mocked adapter 성공을 운영 배포 성공으로 보고하지 않는다. package behavior를 바꾸는 경우 해당 package tests, contrast, 실제 Storybook 결과와 packed consumption을 확인한다. 테스트/harness/로봇 변경만 하는 경우에도 해당 실제 소비자 테스트와 frozen package parity는 필요하다. 새 디자인 변경이나 요청되지 않은 테스트 확대는 하지 않는다.

본 문서 PR 검증은 문서 diff·링크·소스 근거와 독립 검토, 원본 운영 파일 보존 확인이다. 코드 변경이 없으므로 이미 완료된 0.7.2 publication/registry/Storybook 검증을 반복하지 않는다. PR workflow가 수행하는 기존 CI는 별도로 결과를 기록한다.

## 13. 독립 검토와 결정 기록

2026-10-26에 같은 205행 초안을 GPT-6.1 Sol(high)과 GPT-6 Astra(high)에 제공했다. 두 검토자는 서로의 결과를 보지 않고 저장소 소스와 대조했다. 운영 관측은 메인의 근거를 사용했고 private config/state나 서비스에는 접근하지 않았다. 두 모델 모두 Critical 없음, A안 조건부 권고였다. Sol은 High 2·Medium 4, Astra는 High 3·Medium 3을 제시했다. 이는 구현·운영 안전성 인증이 아니라 설계 검토다.

| 독립 지적 | 반영과 이유 |
| --- | --- |
| 두 모델: STOP만으로 구 worker 쓰기를 막을 수 없음 | §7.2에 scheduler 재진입 차단, 단일 writer, generation/config/state active pointer와 crash journal 추가 |
| Sol: receipt 분리 후 dispatch 전 저장 장벽 누락 | §8에 intent+invoking index fsync 전 launch 금지, crash/uncertain 재실행 금지 추가 |
| 두 모델: 운영 adapter로 STOP 아래 preflight 불가 | §5.3에 별도 격리 진입점과 site 읽기 전용 검증, native/운영 쓰기 0회 조건 추가 |
| Astra: 임시 checkout과 실행 checkout의 SHA 불일치 가능 | §5.3/6에 reviewed base와 candidate SHA 분리, commit 한 번 생성·그대로 전달, 재빌드 시 artifact 검증 재실행 추가 |
| 두 모델: source 승인 부담 재발 | §6에 base 채택과 attempt 결합 분리, 다음 dependency-only patch 재사용·만료 의미 명시 |
| 두 모델: site continuation과 원본 승인 충돌 | §7.2/9에 새 승인 대체 관계, 원본 tuple 불변, 별도 siteTarget/proof와 observer/dispatcher/cache/native 입력 규칙 명시 |
| Astra: 과거 absolute receipt 경로 및 JSON 상한 누락 | §8에 epoch별 evidence root, native ledger 보존, transport/summary/monitor 예산과 로컬 reader 호환 포함 |
| Sol: expected 독립성의 실제 회귀 증명 | §5.1에 고정 expected 아래 DOM 변조 실패와 승인 routing override 보존 명시 |

지적을 이유 없이 기각한 항목은 없다. 범용 rebind/skip 엔진과 외부 경보 설치는 두 리뷰의 최소 범위 권고에 따라 후속 선택으로 유지한다. 숫자 상한, 정확한 v2 schema, 전환 crash matrix와 파일별 구현 범위는 방향 승인 후 구현 plan에서 확정한다. 사용자 승인 전 구현·설치·재개하지 않는다.

원문과 입력 hash는 private operations의 `standing-redesign/review-sol.md`, `review-astra.md`, `review-input.json`에 보존했다. 문서 검증은 로컬 링크 대상·diff 형식·운영 원본 해시 보존 확인이며, 실제 실행 검증을 했다고 해석하지 않는다.

두 모델은 보완된 동일 v2도 다시 읽고 각자의 High/Medium 지적이 모두 설계 수준에서 해소되었으며 남은 설계 blocker가 없다고 확인했다. v2 원본과 재확인 기록도 operations에 보존한다. 수치·schema·crash matrix 확정 및 실제 구현 검증은 다음 단계에 남는다.
