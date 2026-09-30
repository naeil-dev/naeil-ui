# frontend-reference-workflow v2 독립 Sol 재리뷰

대상: `/Users/jaymini/.paseo/worktrees/28nele6j/spiky-kolibri`. HEAD는 `82456d93061e875ea554fa8567537a920cee3361`이며, 검토 대상은 **커밋 이후 미커밋 수정본**이다. SKILL/checker revision은 `2026-09-30.2`다. 아래 SHA-256이 이번 판정의 정확한 소스를 지정한다.

## 판정

**기존 Medium 3건과 Low 3건은 모두 해결됐다. 그러나 새로 확립한 must-fix Medium 3건 때문에 최종 검사기 승인은 계속 보류한다.** 실제 회귀 테스트는 **Node 23/23, Python 7/7, 각각 exit 0**으로 통과했다. 통과 사실과 별개로 현재 helper의 거짓 성공 두 경로 및 설정 회귀 검사 오염을 독립 fixture/mutation으로 재현했다.

이 보고서는 내 실제 소스 검토와 실행에 근거한다. 다른 모델의 일반적 승인이나 dispositions 문서를 코드 검증으로 대체하지 않았다. `docs/design/frontend-v2-dual-review.md`는 처리 의도를 확인하는 데만 사용했고 다른 리뷰 원문은 읽지 않았다. 이 판정은 스킬/helper 준비도이며 제품 UI·패키지·출시 승인과 다르다.

설치본이 이전 기준을 유지하는 것은 **계획된 설치 경계이며 결함이 아니다**. 설치본 7개 파일이 모두 HEAD 기준과 일치하고 Claude 링크가 같은 설치 경로를 가리킴을 직접 확인했다. 원본 보고서 `/tmp/frontend-v2-comprehensive-sol.md`는 변경하지 않았다. 검토 시작·종료 사이 고정 소스와 원본 보고서의 해시 변경은 없었다.

## 기존 지적의 disposition

| 원래 ID | 이번 독립 확인 | 판정 |
|---|---|---|
| M1: falsy rules가 빈 규칙으로 통과 | `browser-check.cjs:453-454`는 undefined만 기본값으로 처리한다. 원래 null/false/0 CLI probe 세 개가 모두 exit 2, blocked, 요청 0회로 바뀌었다. | resolved |
| M2: 조상 opacity 무시 | `browser-check.cjs:124-127,155-156,181-183`. 직접 숨김과 조상 숨김 모두 CSS expectation이 `No visible match`로 실패한다. pointer-events:none인 투명 subtree의 touchReview는 빈 배열이다. pointer-active 투명 overlay는 검토 대상으로 유지한다. | resolved |
| M3: 빈 MCP envelope와 malformed 목록 | `twenty_first.py:23-39,141-158,164-166`. `{}` tool result는 blocked/exit 2, tools:null은 안전한 ClientError가 된다. 정상 usage 뒤의 빈 search와 잘못된 search 결과는 새 Python 검사에서 별도로 확인한다. 정상 `content:[]` 검색은 허용한다. | resolved |
| L1: touchMin 사전 검증 없음 | `browser-check.cjs:22-28,453-454`. 원래 touchMin:-1 probe가 exit 2, blocked, 요청 0회로 바뀌었다. | resolved |
| L2: nonfinite timeout traceback | `twenty_first.py:18-20,131-133,180-181`. 원래 nan/inf CLI probe는 argparse의 안전한 exit 2이고 traceback이 없다. 새 검사에서 nan/inf/-inf/0이 launcher를 시작하지 않는 것도 확인했다. 잘못된 CLI 인수를 반드시 JSON으로 반환할 필요는 없다. | resolved |
| L3: Impeccable 실행 조건 불일치 | `frontend-tooling.md:13`이 요청/합의된 마무리 범위로 바뀌어 `SKILL.md:33`과 일치한다. | resolved |

원래 clipping 관찰은 필수 결함으로 세지 않았고 이번에도 유지한다. 완전히 clipped nav가 geometry 검사에서 통과하는 원래 probe 결과는 동일하지만, `references/verification.md:93`에서 clip/occlusion/hit testing을 수동 검토 범위로 명시한다. 그것을 다시 must-fix로 승격하지 않았다.

## 새 must-fix

### R1 — Medium: 네이티브 세로 스크롤바보다 작은 가로 넘침이 성공한다

**위치:** `skills/frontend-reference-workflow/scripts/browser-check.cjs:209-214`, `:518-520`.

스크롤바를 정상 표시하도록 바꾸었지만 overflow 비교는 여전히 `document.documentElement.scrollWidth > innerWidth + 1`이다. classic 세로 스크롤바가 있으면 `innerWidth`는 스크롤바 폭까지 포함하고 실제 가로 가용 폭은 `clientWidth`다. 그 차이보다 작은 실제 가로 scroll overflow가 사라진다.

**재현:** `node /tmp/frontend-v2-sol-rereview-regression-probe.cjs`. 현재 CLI와 별도 동일 Chromium native-scrollbar context에서 800×600, 5000px 높이 main의 폭을 `calc(100% + 8px)`로 설정했다.

| 값 | 관측 |
|---|---|
| innerWidth / clientWidth | 800 / 785 |
| scrollbarWidth / scrollWidth | 15 / 793 |
| 실제 scrollLeft 최대값 | 8px |
| CLI overflow / status / exit | false / automated-checks-passed / 0 |

폭 +0px baseline은 scrollLeft 0이고 통과했다. 폭 +24px는 scrollLeft 24, needs-work/exit 1이었다. 또한 HEAD의 기존 helper를 `/tmp`에 그대로 꺼내 동일 fixture CLI를 실행했을 때 +8px는 **needs-work/exit 1**이었다. 기존 helper는 scrollbar를 숨겨 scrollWidth가 808로 측정됐다. 따라서 이번 native scrollbar 변경과 결합한 **실제 회귀**다.

**효과:** 가로 스크롤이 생긴 현재 화면을 “페이지 넘침 없음”으로 승인한다. 내부 table scroll이나 clip의 수동 한계가 아니라 helper가 약속한 page overflow 자체다.

**최소 보완:** 실제 scrolling root의 clientWidth 기준으로 page scrollWidth를 비교하고, native 세로 스크롤바 폭보다 작은 가로 overflow 사례를 회귀 검사한다. native scrollbar 자체를 다시 숨기는 해결은 새 검사의 목적을 훼손한다.

### R2 — Medium: 준비 완료 대기 중 origin이 바뀌면 다른 페이지를 성공으로 감사한다

**위치:** `skills/frontend-reference-workflow/scripts/browser-check.cjs:549-564`. 문서 계약: `references/verification.md:53`.

목적지 origin 검사와 finalURL 기록이 최초 `goto(...domcontentloaded)` 직후 한 번만 이루어진다. 이후 readySelector 대기 중 발생하는 navigation을 반영하지 않는다.

**재현:** 위 regression probe가 localhost의 서로 다른 두 포트만 사용한다. 원래 origin의 `/delayed`는 `#ready`가 없는 영어 shell을 반환하고, 150ms 후 다른 origin의 `/target`으로 이동한다. 그 대상에만 `#ready`, document lang=ja, body font-size=20px가 있다. 기대 CSS를 20px로 지정한 현재 CLI는 다음을 반환했다.

- **exit 0 / automated-checks-passed**.
- `documentLanguage:ja`, body fontSize 기대값 20px **pass**: 대상 페이지를 실제로 감사했다.
- `finalURL`은 **원래 origin의 `/delayed`**로 기록됐다. 다른 origin target의 로컬 요청도 1회 확인했다.

즉 보고한 finalURL과 실제 측정 페이지가 다르고, 추가한 cross-origin 차단도 우회된다. 최초 HTTP 302 차단 테스트 통과로 이 경로가 닫히지는 않는다. 이전 HEAD에도 이런 지연 이동 감사 자체는 가능했으므로 이를 새로 도입된 전체 동작이라고 주장하지 않는다. **이번 목적지 보완의 미해결 경계**다.

**최소 보완:** 준비가 완료된 실제 URL과 측정 종료 URL을 검증·기록하고, 측정 중 main-frame origin 이탈은 해당 case를 blocked로 처리한다. 기존 browser/Playwright 수단으로 해결할 수 있으며 별도 프레임워크는 필요 없다. 보장이 최초 HTTP redirect만 대상이라면 문서·보고서 표현을 좁혀야 하지만, 현재 요청된 destination-origin 보장을 유지하려면 이 경로를 닫아야 한다.

### R3 — Medium: 설정 회귀 검사 reset이 불완전하여 이후 반례가 가려진다

**위치:** `skills/frontend-reference-workflow/tests/layout-comparison.test.cjs:149-153`, `:222-228`.

첫 mutation이 `config.layoutComparison`이라는 잘못된 key를 추가한다. 다음 iteration의 `Object.assign(config, structuredClone(original))`은 그 key를 삭제하지 않는다. 따라서 뒤의 falsy rules, touchMin, case/viewport/comparison/font 오타 등은 모두 앞서 남은 root 오타만으로 exit 2가 된다. 원래 config에 없던 `rules`도 이전 iteration에서 남을 수 있다.

**독립 mutation 재현:** 현재 helper를 `/tmp/frontend-v2-sol-rereview-mutant-browser.cjs`에 복사해 **딱 한 줄**, undefined-only rules fallback을 다시 `config.rules || {}`로 되돌렸다. 현재 layout test를 `/tmp`로 복사해 projectRoot/script 경로만 이 mutant를 가리키게 했다.

```sh
node --test --test-name-pattern='rejects invalid comparisons' /tmp/frontend-v2-sol-rereview-masked-test.cjs
```

결과는 **1/1 pass, exit 0**이었다. 그러나 이 mutant에 원래 독립 rules probe를 실행하면 null/false/0 세 개가 모두 **exit 0 / automated-checks-passed / 요청 1회**로 퇴행한다. 즉 해당 회귀 검사는 M1이 다시 발생해도 감지하지 못한다.

**효과:** 현재 production M1 수정이 잘못됐다는 뜻은 아니다. 새 config 경계 검사의 대부분이 독립 검증됐다는 테스트 근거가 성립하지 않고, 동일 결함 재발을 놓치는 테스트 결함이다.

**최소 보완:** 매 iteration마다 원래 객체에 없는 key를 포함해 완전히 reset하거나, 새 config 객체를 run에 전달한다. 위 단일 mutation이 회귀 검사를 실패시키는지 확인한다. 테스트 프레임워크 추가는 필요 없다.

## 나머지 수정 검토

- strict known-key validation은 config/rules/case/viewport/comparison/expectation/font probe를 대상으로 하고 omitted rules의 일반 axe/overflow 사용은 유지한다. 실제 source의 검증 경로는 적절하다. 다만 R3 때문에 묶음 설정 테스트 전부를 독립 검증이라고 세지 않는다.
- `fontsLoaded`는 font shorthand와 sample text로 load/check를 실행하고 nonempty loaded faces를 요구한다. 새 실제-font fixture 테스트에서 declaration-only needs-review, 404/미선언 fail, 기존 로컬 Pretendard font asset 성공을 직접 확인했다. system font·모든 glyph 실제 사용은 문서가 별도 범위로 남기므로 과잉 보장하지 않는다.
- native scrollbar width/모드와 short/tall geometry 비교를 추가한 것은 적절하다. classic scrollbar로 nav 이동을 잡는 실제 테스트도 통과했다. R1은 그 변경이 page overflow 판정과 함께 연결되지 않은 부분이다.
- landmark의 ancestor opacity 및 viewport 교차 검사, 실제 document lang 차이, tolerance 경계 테스트는 통과했다. fully clipped/occluded geometry는 여전히 문서화된 수동 검토 대상이다.
- readySelector 다중 일치 오류는 safe actionable detail을 반환한다. 최초 HTTP cross-origin redirect도 기존 테스트에서 blocked로 확인됐다. R2는 그 이후 준비 과정의 이동이다.
- MCP list 타입/이름/cursor와 envelope/text/structuredContent 검증은 원래 문제를 닫는다. usage 데이터 부재를 막되 임의 text를 quota/권한 승인으로 해석하지 않는 설명이 맞다. 기존 notification/request/error/timeout/process-group cleanup 검사는 모두 계속 통과했다. 실제 API schema나 인증은 이번 범위에서 재확인하지 않았다.
- SKILL revision/읽은 reference SHA 기록, Impeccable 조건, 과거 verification 문서의 기준 시점/후속 문서 연결, 도구 노출과 account mutation 승인 분리는 적절하다. 승인된 neutral/Pretendard/목적별 폭/motion 및 기존 승인 보존 지침은 유지된다. 새 framework/plugin 전환이나 제품 redesign은 필요 없다.

## 실행 범위와 증거

| 직접 실행 | 결과 |
|---|---|
| `node --test skills/frontend-reference-workflow/tests/*.test.cjs` | 23 tests, pass 23, fail 0, skipped 0; exit 0 |
| `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s skills/frontend-reference-workflow/tests -p 'test_*.py'` | 7 tests; OK; exit 0 |
| 원래 browser/hidden/MCP probe를 별도 rereview 경로로 복사하여 실행 | 기존 M1–M3/L1/L2 수정 확인; 모두 probe harness exit 0 |
| 새 local regression probe | R1/R2 재현 및 +0/+24 control 확인; exit 0 |
| HEAD helper의 `/tmp` 복사본으로 같은 regression probe | R1 baseline 대비 확인; exit 0 |
| 단일 rules mutation + targeted config regression test | 결함 재도입에도 test 1/1 pass; 직접 probe는 falsy rules 성공 재현 |
| 고정 source/original report 시작·종료 SHA 비교 | 변경 없음 |
| installed 7파일 대 HEAD baseline 비교 | 모두 일치; 의도된 이전 설치본 유지 |

원래 probe script와 결과는 보존했고 rereview 출력은 `/tmp/frontend-v2-sol-rereview-*.json` 및 동명 `.cjs`/`.py`에 따로 기록했다. 주된 새 근거는 `/tmp/frontend-v2-sol-rereview-regression-results.json`, `/tmp/frontend-v2-sol-rereview-baseline-regression-results.json`, `/tmp/frontend-v2-sol-rereview-mutation-probe-results.json`이다. mutation probe의 최초 scratch 실행은 파일명 치환 오류로 실패했으며 `/tmp`의 경로만 바로잡아 재실행했다. 소스 오류로 세지 않았다.

## 수정본 SHA-256

아래는 설치본이 아닌 **검토한 미커밋 source**의 identity다.

| `skills/frontend-reference-workflow/` 기준 경로 | SHA-256 |
|---|---|
| SKILL.md | `88d3175d50d0b7066a7b3e89d718b123b515f27be5b8410fc304268a2946c779` |
| scripts/browser-check.cjs | `9e615af23f8c5eeea962c4b635ecde9aa610a6bf8b446d99336de4983ac86544` |
| scripts/twenty_first.py | `6c547e44de60a907c1412386eb7ed44818d5f99c4736127d6477b5b5fda3a69f` |
| tests/browser-check.test.cjs | `9df425dc2ca93047b96f15055470756b5509d99613d444069e54bbe0801ea518` |
| tests/layout-comparison.test.cjs | `2b76460119007f93ccd81fbe4c222136d8631d26073dd4e8b1268e44b17349b4` |
| tests/test_mcp_client.py | `8f180ad90086814b9545d0186a78db15ee521ac5c0b26eb421b5c3228da3d5c4` |
| references/layout.md | `40eb129fcdf1871fcc3cef9c0d0e062c207aeca35f14eb61c00b36a121802d1a` |
| references/tools.md | `d111c540890d6e8fb99030bdc417204f49a1770f1ddf3f767731ea21ca4906a2` |
| references/verification.md | `06ce492288ddb85e5bd29223c8875d5b4c1af9a0f4163f62f757b5bdbc7dee5a` |

추가 파일과 원본 보고서 hash는 `/tmp/frontend-v2-sol-rereview-start-hashes.json`, 설치 baseline 비교는 `/tmp/frontend-v2-sol-rereview-installed-baseline.json`, 종료 비교는 `/tmp/frontend-v2-sol-rereview-end-verification.json`에 보존한다. 원래 보고서는 그대로이며 이번 새 판정은 이 파일에만 기록한다.

## 제한과 준비도

외부 API/auth/key 접근, 설치, repository/installed 코드 변경, subagent 실행, 제품 변경은 하지 않았다. 모든 요청/redirect/font/MCP probe는 로컬 격리 fixture 또는 기존 로컬 의존성만 사용했다. Storybook·packed consumption·제품 실제 시각 준수는 별도 범위다.

**설치 승인 전 R1–R3을 닫고 각 독립 반례와 기존 23/7 검사를 다시 확인해야 한다.** 기존 지적이 해결됐다는 판정은 유지한다. 이번 미커밋 수정본 전체를 최종 승인했다거나 두 모델 모두 승인했다고 주장하지 않는다.
