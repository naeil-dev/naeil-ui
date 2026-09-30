# frontend-reference-workflow v2 마지막 범위 제한 확인

대상: `/Users/jaymini/.paseo/worktrees/28nele6j/spiky-kolibri`의 고정된 미커밋 수정본. HEAD: `82456d93061e875ea554fa8567537a920cee3361`. 확인일: 2026-09-30.

**최종 판정: READY FOR INSTALLATION — 마지막 필수 R1–R3은 해결됐으며 이번 제한 범위에서 남은 must-fix는 없다.** 실제 Node 25/25·Python 7/7 검사가 모두 exit 0으로 통과했다. 이 판정은 아래 해시의 소스를 사용자 스킬 경로에 설치할 준비 여부다. 실제 설치·게시·제품 UI 준수·두 모델 공동 승인까지 수행하거나 보장한 판정이 아니다.

설치본이 이전 기준본인 상태는 의도된 설치 경계로 받아들였다. 설치본을 변경하지 않았으며, 기존 두 보고서도 보존했다. 종합 리뷰를 다시 시작하지 않고 요청된 네 가지 보완과 직접 관련된 회귀만 판단했다.

## 마지막 지적의 폐쇄 근거

| 항목 | 현재 소스와 직접 실행 확인 | 판정 |
|---|---|---|
| Sol R1 / Opus N1: native scrollbar보다 작은 page overflow | `browser-check.cjs:214`가 documentElement.clientWidth와 비교한다. 원래 독립 800×600 fixture의 +8px는 clientWidth 785 / scrollWidth 793 / 실제 scrollLeft 8px에서 이제 **overflow:true, needs-work, exit 1**이다. +0px는 pass/exit 0, +24px는 needs-work/exit 1로 정상 구분한다. 새 +8px 및 긴 100vw 페이지 회귀 검사도 통과했다. | resolved |
| Sol R2 / Opus N3: 준비 중 origin 이동 및 부정확한 finalURL | `browser-check.cjs:544-562`가 main-frame framenavigated에서 origin 이탈을 sticky하게 저장한다. 최초 navigation, ready 완료, audit 종료, landmark 종료의 `:570,575,577,591`에서 다시 검사하며 finalURL을 갱신한다. catch `:598`이 origin 오류를 우선한다. 원래 delayed cross-origin probe는 이제 **blocked/exit 1**, 실제 다른 포트의 `/target`을 finalURL로 기록한다. delayed same-origin 정상 이동은 현재 회귀 검사에서 pass/exit 0이며 최종 경로를 기록하고 query/fragment를 제외한다. | resolved |
| Sol R3: config mutation 간 key 오염 | `layout-comparison.test.cjs:87-90`의 run(runConfig), `:229-232`의 매번 새 structuredClone으로 검사한다. falsy fallback 한 줄을 `/tmp` 복사본에서 다시 도입하면 해당 config 회귀 검사가 **실제로 exit 1 / 0 !== 2**로 실패한다. | resolved |
| Opus N2: font weight/style 과잉 보장 | `references/verification.md:57,63`은 web font availability만 확인하고 exact weight/style matching은 범위 밖이라고 명시한다. 근접 400 face 또는 synthetic bold가 700 요청을 충족할 수 있다는 한계도 명시했다. 이는 docs clarification이며 실제 exact-face 측정을 추가했다고 주장하지 않는다. | resolved by accurate scope documentation |

추가로 이번 origin 수정에 바로 관련된 **이탈 후 복귀** fixture를 실행했다. 원래 origin `/start` → 다른 origin `/transit` → 원래 origin `/final`로 돌아온 뒤 ready가 되는 경우에도 **blocked/exit 1**, origin 안전 메시지가 유지됐다. finalURL은 돌아온 `/final`로 갱신됐고 query/fragment는 제외됐다. 따라서 단순히 검사 순간의 origin만 확인해 이탈을 잊는 구현이 아니다. 네트워크 접촉 전 차단을 주장하지는 않으며, 승인된 origin 밖에서 얻은 감사 결과를 성공으로 채택하지 않는 보장이다.

## 직접 실행한 검사

| 명령/방법 | 관측 결과 |
|---|---|
| `node --test skills/frontend-reference-workflow/tests/*.test.cjs` | 25 tests, pass 25, fail 0, skipped 0; exit 0 |
| `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s skills/frontend-reference-workflow/tests -p 'test_*.py'` | 7 tests; OK; exit 0 |
| `node /tmp/frontend-v2-sol-final-regression-probe.cjs` | 원래 +0/+8/+24 overflow 및 delayed cross-origin 독립 재현; harness exit 0, 대상 판정은 위 표와 같음 |
| `node /tmp/frontend-v2-sol-final-sticky-probe.cjs` | origin 이탈 후 복귀에서도 blocked 및 안전한 최종 URL 확인; harness exit 0 |
| 현재 helper의 `/tmp` 복사본에 falsy-rules 결함 한 줄 재삽입 후 targeted test | `rejects invalid comparisons` test 실패, exit 1, `0 !== 2` |
| 현재 helper의 `/tmp` 복사본에 innerWidth overflow 비교 한 줄 재삽입 후 targeted test | `page overflow includes widths` test 실패, exit 1, `/small-overflow`, `false !== true` |
| `final-fix-hashes.json` 대 현재 파일의 직접 SHA-256 계산 | 11/11 일치 |

Mutation 실패는 실제 수정본의 실패가 아니라, 퇴행을 회귀 검사가 검출한다는 양성 증거다. 자체 실행 결과를 `/tmp/frontend-v2-sol-final-mutations.json`에 남겼으며 repository의 `final-mutations.json` 결과를 그대로 승인 근거로 대신하지 않았다.

요청된 `docs/design/v2-dual-review-evidence/final-red.log`, `final-browser-tests.log`, `final-mcp-tests.log`, `final-mutations.json`도 읽었다. 각각 수정 전 overflow/delayed-navigation 실패, 보고된 25/7 통과, 두 mutation 검출을 기록한다. 이번 판정은 별도로 직접 다시 실행한 결과에 근거한다.

## 정확한 파일 identity

다음은 `skills/frontend-reference-workflow/` 기준 현재 수정본 SHA-256이다. `final-fix-hashes.json`의 모든 항목을 실제 파일과 대조했다.

| 파일 | SHA-256 |
|---|---|
| `.gitignore` | `862263fa1f46c20f0d1e4dac5ffcc75abd55c08211b2c3864c5f8764b9d87793` |
| `SKILL.md` | `88d3175d50d0b7066a7b3e89d718b123b515f27be5b8410fc304268a2946c779` |
| `agents/openai.yaml` | `7d5c0506f2f4efee8fa1c1fd41629cc325803cb6c87b76216282a27db9531765` |
| `references/layout.md` | `40eb129fcdf1871fcc3cef9c0d0e062c207aeca35f14eb61c00b36a121802d1a` |
| `references/tools.md` | `d111c540890d6e8fb99030bdc417204f49a1770f1ddf3f767731ea21ca4906a2` |
| `references/verification.md` | `e027413583b6c849e821d1445e11d4960e97035e10e2a0010c79a841d3a754ad` |
| `scripts/browser-check.cjs` | `90d5dacbc9c5f29e7cbcab5c2ec341a38ae3d893e0c4726b8084145184403338` |
| `scripts/twenty_first.py` | `6c547e44de60a907c1412386eb7ed44818d5f99c4736127d6477b5b5fda3a69f` |
| `tests/browser-check.test.cjs` | `9df425dc2ca93047b96f15055470756b5509d99613d444069e54bbe0801ea518` |
| `tests/layout-comparison.test.cjs` | `fd8d2ac6b8dc0ed4e2d7b2ae3c49f78f612585ffc464ed3d9f3c34e7c7ab6de5` |
| `tests/test_mcp_client.py` | `8f180ad90086814b9545d0186a78db15ee521ac5c0b26eb421b5c3228da3d5c4` |

시작/종료 identity 확인 파일: `/tmp/frontend-v2-sol-final-start-hashes.json`, `/tmp/frontend-v2-sol-final-identity-check.json`. 자체 probe의 config/report/results는 `/tmp/frontend-v2-sol-final-*.json`과 실행한 `.cjs`에 보존했다.

검토 중 `docs/design/frontend-v2-dual-review.md` 한 파일의 해시 변경을 감지했다. 이를 고정돼 있었다고 주장하지 않는다. 마지막 판정 대상인 위 11개 스킬/helper/test 파일은 검토 내내 그대로였으며 제시된 identity와 일치한다. 기존 `/tmp/frontend-v2-comprehensive-sol.md`와 `/tmp/frontend-v2-comprehensive-sol-rereview.md`도 변경되지 않았다.

## 제한과 설치 준비 여부

외부/API/키 접근, repository 및 설치본 수정, 설치, subagent 실행은 하지 않았다. 모든 브라우저 이동은 localhost 격리 fixture이며 Python MCP 검사는 fake stdio subprocess다. 마지막 수정 밖의 새 기능·제품 UI·전체 디자인 탐색은 하지 않았다.

기존 초기 Medium/Low 지적의 폐쇄 판정은 앞선 재리뷰와 그 이후 유지된 회귀 결과를 따른다. 이번 마지막 R1–R3과 관련 보완을 직접 확인했으므로 **이 SHA-256 수정본은 설치 준비가 됐다**. 설치 후 실제 배포 파일 일치 확인은 별도 단계이며 아직 실행하지 않았다.
