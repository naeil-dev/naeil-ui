# Standing rollout — 검증 비용 교정과 세대 재전환 설계안

상태: B 코드·fixture 테스트 구현, 2026-10-28. 운영 적용·승인·활성화는 미수행이다. migration 후속 승인은 기록 검증까지만 구현했고 native 실행 연장은 아래 §4의 제약으로 중단했다. 상위 계약은 [change-management spec](2026-10-26-standing-rollout-change-management.md) §7이다.

## 1. 발생한 문제

2026-10-27 resume 후 첫 poll에서 naeil 재검증(`reverify-4b5e7a59…`)이 20분 `timeoutMs`에 걸렸다(21:13:23→21:33:25Z). epoch는 `blocked: cached-evidence-reverification-failed`이고 Estimate는 `deferred`, Jev는 `not-started`다. native 변경은 없었다. STOP은 원위치로 돌아왔다.

원인: 브라우저 동작마다 실행되는 fence가 trusted closure 680개 파일(약 770MB)을 매번 전부 다시 해시했다. 측정값은 `assertGenerationFence` 약 0.86초에 실행 검사가 더해져 동작당 1.4초 이상이다. 약 1000개 동작이면 20분을 넘긴다. standalone 검증은 fence가 가벼워 약 10분이었다.

현재 코드로는 고칠 수 없다. `applyTransition`은 완료된 `transition.json`이 있으면 거부하고, 전환 kind는 legacy r5 → 0.7.2 continuation 하나뿐이다. timeout 값은 active pointer가 고정한 config bytes 안에 있다.

## 2. A — 해시 비용 교정 (구현됨, 이 브랜치)

`standing-config.mjs`의 `fileDigest`가 `dev/ino/size/mtimeNs/ctimeNs`가 같을 때만 이전 digest를 재사용한다. `assertTrustedFiles`와 `automationDigest`, 그리고 이 둘을 부르는 모든 fence가 이 경로를 쓴다. 쓰기·rename·chmod는 ctime을 바꾸고, 비특권 프로세스는 ctime을 되돌릴 수 없다. 해시를 읽는 동안 메타데이터가 바뀌면 캐시하지 않는다. 680개 확인은 735ms에서 20ms가 됐다.

제한: root 권한의 시각 위조는 탐지 범위 밖이다. 그런 위협 모델이 필요하면 단계 경계마다 전체 재해시를 추가한다.

## 3. B — 세대 재전환(`standing-generation-rebind`)

A는 automation bytes를 바꾸므로 새 operational generation이 필요하다. 따라서 완료된 active generation에서 새 generation으로 넘어가는 경로가 반드시 있어야 한다.

| 결정 | 구현 |
| --- | --- |
| 출발점 | `phase:completed` journal과 일치하는 현재 `active.json`만 허용. 미완료 journal은 기존 recovery 경로다. |
| 상태 | 새 epoch 디렉터리에 현재 epoch의 schema2 state/evidence를 byte-exact로 import한다. 이전 epoch는 읽기 전용으로 보존한다. |
| 이전 journal | 새 plan 디렉터리에 immutable 사본을 남긴 뒤 `transition.json`을 새 journal로 교체한다. 이전 plan/approval/pointer 사슬은 `predecessor` 참조로 검증한다. |
| 차단 해소 | 허용 범위는 하나뿐이다. naeil의 verify-only 중단(`cached-evidence-reverification-failed`, 이후 poll이 남은 verify `pending-intent.json`을 보고 재분류한 `uncertain`/`interrupted-verification` 포함)이고, Estimate/Jev가 `deferred`/`not-started`(runtime mutation 없음)인 경우다. 기록과 intent는 history에 보존하고 naeil은 fresh 검증을 요구한다. 그 밖의 blocked/uncertain/runtime-mutated 상태는 거부한다. |
| quiescence | 기존 probe를 그대로 쓴다. STOP 유지, launcher `disable`과 `bootout`(label 미등록 code 113과 명시적 disabled override 둘 다), ps/lsof/marker 부재, control lock 단일 보유. launcher는 자기 automation root가 active config와 같아야 하고 이전 generation의 reader는 rebind kind를 거부하므로, 완료 후에는 이전 plist를 보존하고 새 automation root를 가리키는 plist를 설치해 bootstrap·enable한다. apply가 완료되지 않았다면 이전 plist만 다시 bootstrap한다. |
| 승인 | 새 kind `standing-generation-rebind-approval`. 이전 pointer digest, plan digest, release digest, 새 generation, 승인자/근거/기간/revoked를 결합한다. |
| launcher/reader | `readActiveGeneration`이 continuation과 rebind 두 kind만 허용하고 predecessor 사슬을 검증한다. |
| timeout | naeil 검증 `timeoutMs`를 40분으로 올려 여유를 둔다. 세션 조건(제한시간+5분 < 토큰 수명)을 지킨다. |

`planTransition`/`applyTransition`/`recoverTransition`이 기존 phase·control lease·guard·quiescence 경로를 함께 쓴다. 새 kind는 `standing-generation-rebind`다. 기존 입력에 `predecessor: {pointer, journal, plan, approval}` exact file references와 `old.inventory`, `old.pendingIntent`(reference 또는 null)를 추가한다. `standingEpochInventory`는 schema2 evidence와 해당 epoch 안의 참조된 dispatcher 영수증의 읽기 전용 inventory를 만들며, 별도 immutable JSON reference를 plan에 결합한다. 파일·index·pending intent가 바뀌면 거부한다.

승인은 `standing-generation-rebind-approval`이며 `schemaVersion`, `previousPointerSha256`, `planSha256`, `releaseSha256`, `generationSha256`, `approvedBy`, `approvalRef`, `approvedAt`, `expiresAt`, `revoked`를 정확히 결합한다. 완료 journal의 newPointer가 현재 pointer와 같아야 한다. 미완료 journal에는 기존 exact recovery 승인이 필요하다. journal 교체 전 중단도 predecessor journal/pointer를 결합한 recovery로 이어갈 수 있다.

`control/transitions/<planSha256>/predecessor-{pointer,journal,plan,approval}.json`은 원본 bytes 사본이다. `historical-state.json`, `historical-inventory.json`, `historical-pending-intent.json`과 기존 native baseline/ledger 사본도 남긴다. schema2 evidence는 새 epoch에 byte-exact 복사하고 `imported-root.json`은 원래 index bytes를 유지한다. 새 실행 index만 epoch와 provenance를 변경한다. 이전 epoch와 legacy root의 절대 영수증 경로는 bounded `epochs` inventory로 검증하며 원본을 고쳐 쓰지 않는다. partial import는 재변환하지 않고 보존·거부한다.

차단 해소에는 하나의 정확한 naeil `verify` marker와 invoking verification intent가 필요하다. historical production-verified request/result와 이전 continuation provenance도 함께 검사한다. Estimate의 미실행 deferred 또는 증명된 pre-mutation deferred만 허용하고 Jev는 미시작이어야 한다. 새 Estimate attempt는 이전에 허용된 미실행 attempt와 달라야 하며 같은 key와 검증된 priorAttemptId를 유지한다. 원래 naeil service/intent/blocked/generation 기록은 history로 보존하고, 새 epoch의 pending marker와 active verification intent를 제거한다. naeil provenance는 새 plan/approval/generation에 결합하며 fresh 검증을 요구한다.

reader는 continuation 또는 rebind 두 kind만 받고 최대 64개의 predecessor 연결을 continuation까지 검증한다. 이전 승인 만료는 역사적 사본 읽기를 막지 않으며 현재 실행에는 현재 승인·원본 migration·정책 만료를 계속 적용한다. 새 epoch의 dispatcher lock/pending-intent 부재와 생성 후 새 state root의 lsof 검사도 기존 probe에 추가한다. STOP은 항상 0600으로 유지한다. 코드는 native 작업이나 launchctl 변경 명령을 실행하지 않는다.

40분은 새 운영 config의 `services.naeil.verification.command.timeoutMs: 2400000`으로 넣을 값이다. 코드에 새 기본값을 하드코딩하지 않았다. 기존 3시간 이내 validation은 이 값을 허용하며 dispatcher가 해당 config 값을 verifier로 전달하는 테스트를 추가했다.

## 4. migration 기한

원 `reviewedMigration` 만료는 2026-11-01T21:00Z이고 연장하지 않는다. 그 전에 재전환과 배포가 끝나지 않으면 spec §7.2의 **후속 승인 기록**이 필요하다. 이 기록은 이전 approval digest, release digest, 새 generation/attempt 범위, 새 만료, 명시적 대체 관계를 담는다. 원 tuple은 수정하지 않는다. 이 기능도 B 구현 범위에 포함한다.

구현 한계: `rollout.mjs`의 `assertMigrationFollowup(release, previousApproval, record, scope)`는 별도 `standing-migration-followup-approval` 기록을 검증한다. `previousApprovalSha256`, exact `releaseSha256`, `generationSha256`, 서비스별 `attempts`, `services`, `supersedes`(이전 승인 digest), 승인자/근거/승인일/새 만료/revoked를 결합한다. 이 검증 성공은 실행 권한이 아니다. record를 policy에 붙여도 만료된 원본을 유효하게 만들지 않는다.

실행 연장을 막는 구체적 조건은 이 저장소 `scripts/rollout/jev-native.py:69–70`의 `policy_gate`: `date(migration.get('expiresAt')) > now`와 `fix-only-contract1-required`다. Jev adapter는 원 policy를 native bridge에 전달하고 `updaterPolicy`도 원 `reviewedMigration` tuple을 사용한다. Estimate adapter의 `standingPolicy`/`policyGate`, dispatcher release gate, standing-config admission 및 transition guard도 원 승인 검사를 유지한다. consumer 저장소/Estimate bridge는 접근하지 않았다. 허용 범위 밖인 Python/native 프로토콜을 수정하지 않고 실행 연장 항목을 중단했다. owner의 별도 native 승인 프로토콜 결정과 검토 전에는 **원본 만료가 실행의 상한**이다. follow-up 기록 우선순위를 실행에 반영한 것으로 해석하면 안 된다.

## 5. 순서와 검증 기준

2026-10-28 코드 검증: Node v22.23.2의 `npm run test:rollout` 종료 0, 총 713개 중 pass 712 / fail 0 / skip 1 / cancelled 0. skip은 `NAEIL_TEST_PNPM_10_30_3`의 exact pnpm.cjs 미지정에 따른 기존 offline-cache 통합 시험이며 새 의존성을 설치하지 않았다. 로컬 HTTP·Chromium fixture는 sandbox listen EPERM 후 승인된 환경에서 실행했다. 변경된 8개 `.mjs`의 ESLint는 0 errors / 기존 warnings 4개이며 Markdown 2개는 설정 미적용 경고다. 기존 A 코드·시험은 보존했다. 이 결과는 live rebind, native 서비스 재검증, owner 승인 또는 활성화 영수증이 아니다.

1. B 구현과 단위 테스트(rebind 정상, 각 거부 사유, interruption/recovery, reader 사슬 검증, 후속 migration 승인). 전체 `test:rollout` PASS.
2. 독립 Spec/Quality 리뷰.
3. 새 generation으로 Estimate(실제 12단계·E2E)와 Jev(실제 10단계) 재검증. 이전 v8 결과는 승계하지 않는다.
4. 정확한 rebind plan·config·packet과 명령/복구 경계를 작성하고 owner 승인(site, rebind, launcher disable·bootout, 새 plist 설치·bootstrap, migration 후속 승인).
5. rebind → STOP 유지 poll 확인 → 별도 resume 승인 → naeil → Estimate → Jev.

A2(0.7.3+ 자동 실행)는 계속 Important/unmet/deferred/not waived다. merge·push·npm·외부 알림은 별도 지시 없이 하지 않는다.
