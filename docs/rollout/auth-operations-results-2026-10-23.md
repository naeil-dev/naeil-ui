# 운영 마무리 결과 — 2026-10-23

사용자가 요청한 6단계를 완료했다. 원본 [인계 문서](auth-operations-handoff-2026-10-23.md)는 수정하지 않고 로컬 미추적 상태로 보존했다. 아래는 이번 실행의 직접 검증과 독립 리뷰를 종합한 결과이며 비밀값은 포함하지 않는다.

## 1. 비공개 원격 보관과 복원

| 대상 | 비공개 저장소 | 최신 / 운영 소스 | 새 GitHub clone 검증 |
| --- | --- | --- | --- |
| Estimate | https://github.com/naeil-dev/abestimate | main `78ca9e1`(대응표 포함), 원본 최신 투영 `43ef286`, 운영 tag `248d4f7` | 최신·운영 frozen install/build 통과, fsck 통과 |
| Jev | https://github.com/naeil-dev/jev | main `e1f1cee`, 운영 tag `552f3ec` | 최신 build/types/lint/85tests, 운영 build 및 fsck 통과 |

- 두 저장소 모두 PRIVATE, 소유 계정 ADMIN, default branch main이다. 운영 tag는 `production/shared-session-20261022`다.
- Estimate 원본에는 trace 76개와 소스·네트워크 사본이 있었다. 사용자가 승인한 별도 이력으로 `docs/evidence/**`만 제외했다. 원본 Git·refs·bundle은 그대로다. 130개 commit의 부모 관계·작성 정보·메시지를 유지하고 SHA 대응표를 `docs/archive/source-history.json`에 보관했다. 최신 379개/운영 374개 보존 파일의 blob·mode는 원본과 정확히 같다. 원본과 별도 이력이므로 원본 저장소의 origin을 이 원격으로 바꾸지 않았다.
- Estimate 후보의 640tests/types/lint도 통과했다. 새 clone 빌드는 과거 운영 artifact의 BUILD_ID/전체 bytes 재현 주장과 구분한다. 실제 업무 DB와 비밀 설정은 원격에 포함하지 않았다.
- 보고서·로그·복원 clone: `/Users/jaymini/.local/share/naeil-repo-bundles/20261023-operations/remote-archive.md`.

## 2. DNS·callback·공유 인증

- Cloudflare 전체 DNS 9개를 대조했다. apex는 Vercel, `abestimate`, `baby`, `digest`, `esg`, `jev`, `line`, `trip`, `work`는 소유 계정의 mac-mini tunnel이다. 위임 NS·와일드카드는 없다. DNS는 변경하지 않았다.
- 실제 remote tunnel 10개 경로에서 Estimate2473/Jev2466 및 기존 baby/digest/trip을 확인했다. esg/work/line과 DNS가 없는 chat 두 경로는 503이다. 로컬 tunnel config는 과거 자료이므로 실제 remote 설정을 우선했다. `services.json`의 활성/제외 분류와 대조했으며 범위 밖 dormant 서비스는 재개하지 않았다.
- 운영 ingress가 503인 esg/work callback만 제거했다. Supabase 허용 목록은 `https://naeil.dev/auth/callback` 1개, Site URL은 `https://naeil.dev`다. Home relay는 같은 origin 허용 규칙으로 동작하며 wildcard를 추가하지 않았다. 실제 Google/GitHub Home 복귀도 확인했다.
- 실제 공유 cookie 두 chunk의 domain=`naeil.dev`(브라우저 정규화), path=`/`, Secure=true, SameSite=Lax, partitioned=false를 값 없이 확인했다.
- Google/GitHub 실제 로그인 → 원래 서비스 복귀 → 세 사이트 공유 로그인 통과. Estimate·Jev·사이트 각각에서 로그아웃한 뒤 세 사이트가 함께 익명 상태임을 확인했다.
- 권한 회수 시 두 서비스 보호 경로403, 복원 시 재로그인 없이200을 Home UI와 함께 검증했다. Home은 별도 tailnet 개인 세션을 사용하며 공유 cookie 범위 밖이다. 두 계정은 병합하지 않았다.

## 3. Estimate 실제 저장·보호·재시작

- 초기 data 전체22파일을 백업하고 별도 복원 사본의 전체 SHA256 일치를 확인했다. 위치: `/Users/jaymini/.local/share/estimate-local-preservation/operations-20261023-062712/`.
- 시험 견적 `__OPS_20261023_PERSISTENCE__` 1개만 UI에서 생성했다. 날짜·RR·경비를 저장하고 금액12345→23456 수정, 새로고침, 사이트 로그아웃 후 GitHub 재로그인, 동일 release 정상 재시작 후 유지됨을 확인했다.
- 잘못된 raw 금액 입력은 이동과 헤더 로그아웃을 모두 차단했고 입력값·세션이 유지됐다. 유효한 값으로 복구해 저장했다.
- 재시작 전 추가 backup·복원 검증 후 launchd bootout/bootstrap을 사용했다. 기존 소유 lock이 자연 해제됐고 정지0.065초, 새 PID89085, 동일 release `d7cf07ac8703-299ddf258ebe`, health200이다. 강제 kill/lock 삭제/기존 데이터 복원 덮어쓰기는 없었다.
- 시험 견적만 UI에서 삭제했다. 최종 revision216이며 기존 견적2개·회사·설정·schema가 초기 backup과 정확히 같다.

## 4. Home Console 배포·권한 관리

- 별도 Home 담당은 Auto 변경을 별도 local worktree/mock5183에서만 수행하고 운영 container/port/volume을 변경하지 않는다고 회신했다. 기존 dirty worktree와 Paseo 세션은 건드리지 않았다.
- 운영 baked Python375개와 일치하는 source를 `07c52c9d`로 보존한 뒤 관리 기능만 `c1401698`에 통합했다. 격리 worktree는 `/Users/jaymini/projects/naeil-home-console-operations`, branch는 `integrate/console-operations-20261023`이다. 배포·수용 문서까지 포함한 HEAD는 `9e8f6f39`(clean)이며 Home source push/merge는 하지 않았다.
- 독립 리뷰에 blocker가 없었다. backend156, 실제 로컬 Auth/PostgREST/DB5, frontend942, types/lint/build 및 별도 리뷰117backend+57frontend 통과. 배포 수용 후 OpenSpec을 archive했고 strict61specs가 통과했다. 이 로컬 검증은 아래 운영 인증 시험과 구분한다.
- 중앙 관리 RPC7개와 private helper4개의 정의 MD5가 검증된 로컬 fixture와 정확히 같았다. schema migration 없이 기존 중앙 권한표를 사용했다.
- 첫 시도는 정상 종료·백업 후 복원 검사의 SQLite 읽기가 WAL/SHM을 만들어 엄격한 파일 동일성 검사에 실패했다. 원본 container를 즉시 다시 시작해 ready200을 확인했다. 실제 archive의 별도 복원 및 WAL-mode fixture로 immutable 검사 보완을 검증한 뒤 재시도했다.
- 두 번째 정상 종료2.14초(exit0) 후 fresh1.54GB archive를 새 volume에 복원했다. 10개 entry의 bytes/mode/uid/gid/link/mtime가 같고 SQLite quick_check=ok였다. archive SHA256: `2d442477bee91f48794a9158898f7863800cba9730d5085e79ede118bd6f5332`.
- 현행 container `0382b29837ab`, image `5d20a19076af`, volume `relaydock-data-console-20261023-v2`, 기존2455/1455 port다. 원본은 `relaydock-before-console-20261023`과 `relaydock-data-auto-20261022`에 보존했다. 첫 실패 clone·복구 자료도 유지했다.
- 실제 tailnet에서 기존 Home 로그인, dashboard, Auto 설정·이력, settings dialog를 확인했다. Google 관리자 로그인으로 회원2·서비스2·audit가 표시됐다. 일반 GitHub 계정의 두 권한을 UI로 회수→Estimate `/estimates`·Jev `/`403, UI로 원래 권한 복원→같은 공유 세션200을 확인했다. Jev identity 전용 `/api/session`200은 보호 경로403과 구분한다.
- 일반 GitHub Home 로그인은 callback403, 관리 members/services API403과 UI 거부를 확인했다. 거부 상태의 Console 로그아웃도 정상 복구됐고 마지막에는 Google 관리자 화면으로 돌아왔다.
- 중앙 before/after private snapshot 비교: 기존 회원2·관리자1·서비스2와 원래 권한 집합 보존. 시험 일반회원의 version1→3과 관리자 actor의 set_access audit2개만 추가됐다. 관리자 본인 권한과 회원 상태는 변경하지 않았다.
- 실제 화면: `/Users/jaymini/.local/share/naeil-operations/20261023/home-console-admin-final.png`. 수용·복구 상세는 Home의 `openspec/changes/archive/2026-10-23-deploy-console-management/context.md`.
- 현행 복구 절차는 `home-console-control-v2.py`와 `home-console-private-v2` receipt를 사용한다. 첫 시도 스크립트는 현행 복구용이 아니다.

## 5. CI 안정화·병합·운영 반영

- 이전 실패 로그에서 Ubuntu Azure apt mirror 다운로드가24분43초를 소모해25분 job 제한에 도달한 원인을 확인했다.
- [PR14](https://github.com/naeil-dev/naeil-ui/pull/14)에서 두 job을 버전·digest 고정 Playwright 공식 이미지로 전환했다. 이미지/lock 버전 일치와 실제 브라우저 시작을 검사하고 GitHub mount 소유권을 좁게 보정했다. 기존 package/site·Storybook/browser·packed consumption 검증과25분 제한은 유지했다.
- PR 자동 run39857722513 attempt1 SUCCESS. 병합 SHA `041c3c4`의 [main 자동 run39859416335](https://github.com/naeil-dev/naeil-ui/actions/runs/39859416335)도 attempt1 SUCCESS: package/site4분23초, Storybook/browser11분50초, 실제3브라우저380passed/4skipped. 수동 재실행 없음.
- 해당 SHA의 Vercel 성공 배포와 운영 artifact `dpl_EstMuQk1R5FbEoP6y8kgYmh6L55a`가 일치한다. UI0.7.1/contract1 유지. 공개 `sourceRevision=development`만으로 SHA를 증명하지 않고 GitHub 배포 상태와 교차 확인했다.
- 보고서: `/Users/jaymini/.local/share/naeil-repo-bundles/20261023-operations/ci-stability.md`.

## 6. Jev 재시작·지정 휴지통 정리·최종 상태

- Jev online/stopped SQLite backup을 각각 별도 DB로 복원해 integrity와 전체 논리 digest 일치를 확인했다. lease/TCP0 확인 후 같은 release를 정상 bootout/bootstrap했다. PID85823→4658, env-file·plist·launchd 부모에서 JEV_PASSWORD_FILE 키가 없음을 값 없이 확인했다. 현재/직전 code·DB·password.json은 보존했고 모델 호출은 하지 않았다.
- 원격 복원·Estimate·Home 운영 검증 뒤 기존 cleanup-manifest의 정확한33개 trash 대상(Estimate26release+control, Jev6release)만 영구 삭제했다. 다른 휴지통 항목과 현행/직전 release·업무 데이터·복구 자료는 보존했다. 삭제 전후 Estimate 업무 파일 hash도 같았다.
- 최종 사이트·Estimate·Jevhealth·Homeready 모두200. 인증된 Estimate state, Jev root/session, Home 관리자services 모두200. 익명 Estimate/Jev307→중앙 로그인, 폐기된 앱 relay404, 정상 형식 nonce의 Console relay303을 확인했다.
- 기존 인계·미추적 evidence·UI0.7.1 동결 자료와 이번 백업/실패 복구 자료는 보존됐다. fresh-penguin은 원래 branch/HEAD0bed043을 유지하며 원본 인계와 이 결과 문서만 미추적이다.

## 산출물과 후속 우선순위

기계 판독 결과와 private receipt: `/Users/jaymini/.local/share/naeil-operations/20261023/progress.json`. 같은 폴더에 `estimate-restart.json`, `console-state-before.json`, `console-state-after.json`, `home-console-private-v2/`, `jev-restart-20261022T214850Z/receipt.json`, `cleanup-complete.json`이 있다. 비밀 설정과 중앙 snapshot은600/700 권한으로 보관한다.

이번 6단계의 필수 미완료 작업은 없다. Google/GitHub 두 계정은 유지한다. 이후 별도 결정 대상은 계정 병합 필요성과 Home 통합 branch의 정식 원격 검토·병합이다. 현재 운영 source와 복구 절차는 위 경로에 고정돼 있으며 추가 UI/SMTP/가입 정책 작업은 진행하지 않는다.

2026-10-23 사용자 후속 지시로 현재 마감 범위를 `naeil-ui`로 한정했다. Home Console 통합 branch의 원격 push·PR 검토·병합은 별도 요청까지 보류한다. `naeil-ui` PR14의 MERGED 상태와 main 자동 run39859416335의 attempt1 SUCCESS를 GitHub에서 재확인했으며, 이번 `naeil-ui` 범위에 추가 필수 작업은 없다.

완료 선언은 위 6단계 운영 작업에 한정하며, `naeil-ui` 전체에 미완료 항목이 없다는 뜻은 아니다. 같은 날 후속 확인에서 열린 PR·이슈는 각각 0개였지만 npm 및 GitHub Release 최신은 여전히0.6.0이고, 운영에 적용한0.7.1의 공개 게시는 이뤄지지 않았다. `policy.json`의 상시 rollout도 `enabled:false`다. 공개 게시와 상시 rollout은 이번 범위 밖이며, 기존 `verification.md`·`automation.md`·`inventory.md`에는 이번에 완료한 인증·DNS 검증 전의 설명이 남아 있어 최신 결과와의 문서 정합성 정리가 남는다. 이 확인은 모든 과거 worktree와 기능 backlog에 대한 전수 감사가 아니다.

## 후속 승인: 문서·공식 게시·상시 자동 배포

2026-10-23 사용자가 세 항목을 모두 필수로 지정해 실행을 승인했다. 앞 문단의 범위 밖 판단은 이 후속 지시로 대체한다. Home Console/Baby는 계속 보류한다. 새 구현은 `../ui-release-continuous-rollout` 작업공간의 `feat/ui-release-continuous-rollout-20261023`에서 진행하며 원본 인계와 frozen0.7.1 bytes를 보존한다. 문서·정확한 npm/GitHub0.7.1 게시·현재 공유 인증을 보존하는 naeil/Estimate/Jev 상시 rollout을 각각 검증한다. 현재 구현 중이며 게시/운영 활성화가 완료됐다는 뜻은 아니다. 설계와 진행은 새 작업공간의 `docs/superpowers/specs/2026-10-23-standing-ui-release.md` 및 대응 plan에 기록한다.

## 후속 완료: 2026-10-23 12:10 JST

유지 문서·동결 npm 0.7.1/GitHub Release/Hosted Storybook 게시·naeil.dev → Estimate → Jev 상시 배포를 완료했다. PR15와 PR16을 병합했고, 사용자의 후속 선택대로 사이트도 새 main `c92daa3b0677d1bd77a4ea6329df3006f7ca30e4`로 배포했다. npm/tag의 동결 source `32108fd`와 최초 게시 자료의 바이트·asset ID는 보존했다. Docs는 별도로 검증한 `e876c814` 게시본이다.

실제 dispatcher에서 세 서비스 18개 화면 상태·144개 조합을 검증해 현행 0.7.1 기준 등록을 마쳤다. Estimate/Jev 재시작이나 코드 전환 없이 PID·identity·health를 보존했다. `dev.naeil.ui-standing-rollout`의 300초 예약을 등록하고 최초 poll 및 약 304초 뒤 실제 timer poll이 모두 exit 0으로 끝난 것을 확인했다. 자동 범위는 연속 0.7.2–0.7.99 fix-only/contract1이며 승인 만료는 2027-01-21 00:00 UTC다. 실제 미래 patch의 update/rollback은 아직 실행하지 않았고 Home Console/Baby는 후속 범위에서 제외했다.

상세 변경 이유·CI/운영 근거·보존 자료·중지/복구 경로·다음 우선순위: [최종 결과](/Users/jaymini/.local/share/naeil-operations/20261023/ui-release-results.md). 기계 판독 상태는 같은 폴더의 `progress.json`, 실제 등록 receipt는 `~/.local/share/naeil-ui-rollout/standing/dispatcher/runs/421357348/receipt.json`이다. 위 후속 착수 문단의 진행 중 상태는 이 완료 기록으로 대체한다.
