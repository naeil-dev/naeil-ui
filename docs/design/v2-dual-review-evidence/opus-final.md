# frontend-reference-workflow v2 — 최종 범위 제한 재확인 (Opus 5.5)

- 날짜: 2026-09-30
- 리뷰어: Claude Opus 5.5 (`claude-opus-5-5`). 단독으로 확인했고 서브에이전트는 쓰지 않았다. 판정은 아래에 적은, 제가 직접 실행한 확인에만 근거한다.
- 대상: `/Users/jaymini/.paseo/worktrees/28nele6j/spiky-kolibri`. HEAD `82456d9`에 커밋되지 않은 고정 수정본이 올라가 있다(`git status` 14줄, 확인 전후 동일).
- 범위: 사용자가 지정한 마지막 수정 1–4와 직접 관련된 회귀만 확인했다. 종합 리뷰는 반복하지 않았다.
- 제약: 외부 API·키·설치·저장소 수정은 하지 않았다. 스크래치는 `/tmp/fw-opus-probe/`에만 만들었고, fixture 서버는 모두 종료했다.
- 기존 보고서는 보존했다.
  - `/tmp/frontend-v2-comprehensive-opus.md`: `0497c0ca…a026`
  - `/tmp/frontend-v2-comprehensive-opus-rereview.md`: `e69fafba…28d2`(`opus-rereview.md`와 동일)
- 설치본 browser-check는 이전 기준본 `df95d249…`이다. 요청하신 대로 의도된 배포 경계로 취급했다.

## 1. 현재 파일 식별 (SHA-256, `final-fix-hashes.json`과 전부 일치)

| 파일 | SHA-256 |
|---|---|
| scripts/browser-check.cjs | `90d5dacbc9c5f29e7cbcab5c2ec341a38ae3d893e0c4726b8084145184403338` |
| scripts/twenty_first.py | `6c547e44de60a907c1412386eb7ed44818d5f99c4736127d6477b5b5fda3a69f` |
| SKILL.md | `88d3175d50d0b7066a7b3e89d718b123b515f27be5b8410fc304268a2946c779` |
| references/verification.md | `e027413583b6c849e821d1445e11d4960e97035e10e2a0010c79a841d3a754ad` |
| references/layout.md | `40eb129fcdf1871fcc3cef9c0d0e062c207aeca35f14eb61c00b36a121802d1a` |
| references/tools.md | `d111c540890d6e8fb99030bdc417204f49a1770f1ddf3f767731ea21ca4906a2` |
| agents/openai.yaml | `7d5c0506f2f4efee8fa1c1fd41629cc325803cb6c87b76216282a27db9531765` |
| .gitignore | `862263fa1f46c20f0d1e4dac5ffcc75abd55c08211b2c3864c5f8764b9d87793` |
| tests/browser-check.test.cjs | `9df425dc2ca93047b96f15055470756b5509d99613d444069e54bbe0801ea518` |
| tests/layout-comparison.test.cjs | `fd8d2ac6b8dc0ed4e2d7b2ae3c49f78f612585ffc464ed3d9f3c34e7c7ab6de5` |
| tests/test_mcp_client.py | `8f180ad90086814b9545d0186a78db15ee521ac5c0b26eb421b5c3228da3d5c4` |

`twenty_first.py`, SKILL.md, layout.md, tools.md, 테스트 2종(browser-check.test.cjs, test_mcp_client.py)은 제 재리뷰 시점과 해시가 같다. 이번에 바뀐 파일은 browser-check.cjs, verification.md, layout-comparison.test.cjs다.

## 2. 직접 실행한 확인

| 확인 | 결과 |
|---|---|
| `node --test skills/frontend-reference-workflow/tests/*.test.cjs` | **25/25 통과** |
| `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s skills/frontend-reference-workflow/tests -p 'test_*.py'` | **7/7 통과** |
| 원래 N1 fixture(P9: 긴 페이지 + `100vw`)를 고정 CLI로 실행 | `overflow:true`, needs-work, **exit 1** |
| overflow 공식 비교: 6종 fixture × 표준/quirks 모드 × 데스크톱/터치 (실제 `scrollTo`로 가로 스크롤 가능 여부 확인) | 아래 3.1 |
| 원래 N3 fixture와 새 탐침(302, JS 지연 이동, 교차 origin을 거쳐 돌아오는 bounce, 정상 페이지) | 아래 3.2 |
| `/tmp` 복사본 변이 5종 | 2종 검출, 3종 생존(아래 3.2, 3.3) |
| `final-red.log` 확인 | 수정 전 실패 2건(overflow, 준비 대기 중 navigation) 기록 확인 |

## 3. 항목별 판정

### 3.1 N1 / Sol R1 — overflow를 `clientWidth` 기준으로 판정: **해결**

- 코드: `browser-check.cjs:214`가 `scrollWidth > documentElement.clientWidth + 1`로 바뀌었다.
- 표준 모드(`<!doctype html>`) 결과. "실제 스크롤"은 `scrollTo`로 확인한 가로 스크롤 가능 여부다.

| fixture | 이전 판정 | 새 판정 | 실제 스크롤 |
|---|---|---|---|
| 데스크톱 `100vw` 긴 페이지 | false | **true** | 가능 |
| 데스크톱 +8px | true | true | 가능 |
| 데스크톱 정상 긴 페이지 | false | false | 불가 |
| `overflow-x:hidden`으로 잘린 페이지 | false | false | 불가 |
| `html{width:2000px}` | true | true | 가능 |
| 터치 +8px | false | **true** | 불가(layout viewport 398로 확장). 기존 viewportMismatch도 함께 잡음 |

- 정상 페이지에서 거짓 양성은 생기지 않았다. 변이 `overflowInner`(이전 공식으로 되돌림)는 테스트 1건이 실패하며 검출된다.
- 참고(Low, 차단 사유 아님): DOCTYPE이 없는 quirks 모드에서 `html{width:2000px}`처럼 루트 폭을 직접 키우면, `clientWidth`도 2000이 되어 새 공식이 놓친다. 이전 공식은 잡았다. 루트 요소의 폭을 직접 키우는 quirks 문서에만 해당하므로 실제 제품 영향은 매우 작다. 터치 case에서는 viewportMismatch가 대신 잡는다. 필요하면 `max(clientWidth, …)`가 아니라 `compatMode`에 따라 분기하거나, 문서에 "표준 모드 전제"를 한 줄 적으면 된다.

### 3.2 Sol R2 / N3 — origin 이탈을 sticky하게 기록하고 단계마다 확인: **필수 부분 해결, 진단 메시지는 부분 해결**

- 302 교차 origin: blocked, `finalURL http://127.0.0.1:18912/short`, 구체적인 origin 메시지. 정상.
- 교차 origin을 거쳐 돌아오는 bounce(`/bounce` → 18912 `/away` → 18911 `/short`): **blocked**, 구체적인 origin 메시지. sticky 동작이 실제로 작동한다.
  - 같은 fixture에서 `framenavigated` 리스너를 제거한 변이는 **automated-checks-passed, exit 0**이었다. 즉 이 리스너가 거짓 통과를 막는 핵심이다.
- 같은 origin 정상 페이지: exit 0, `finalURL`이 정확하다.
- 준비 대기 중에 지연 교차 이동(저장소 테스트 시나리오): 테스트가 통과한다. `final-red.log`에서 수정 전 실패를 확인했다.
- **남은 점(Low, 거짓 통과 아님)**: 원래 제 N3 fixture(P7js)에서는 준비 완료 직후, 감사 도중에 교차 이동이 일어난다. 5회 반복 모두 결과는 blocked(안전)였지만 detail은 여전히 일반 메시지이고 `finalURL`은 이동 전 경로였다.
  - 원인은 이벤트 순서다. 추적해 보니 `page.evaluate` 거부가 82ms, `framenavigated`가 83ms에 도착했다. catch가 실행될 때는 아직 `originError`가 없고, 그 직후 context가 닫힌다.
  - 따라서 "catch에서도 구체적 origin 메시지 우선"은 이벤트가 이미 도착한 경우에만 성립한다.
  - 개선안: catch에서 "Execution context was destroyed" 오류일 때 짧게 `framenavigated`를 기다린 뒤 `recordDestination()`을 호출한다. 판정 결과(blocked)는 이미 안전하므로 설치를 막을 사유는 아니다.
- **테스트 공백(Low)**: 다음 변이 3종이 모두 25/25 통과한 채 **생존**했다.
  - `framenavigated` 리스너 제거
  - catch의 `originError ||` 우선순위 제거
  - 감사 직후 `checkDestination()` 제거
  - sticky 동작은 제 bounce 탐침으로 작동을 확인했지만 회귀 테스트가 없다. bounce fixture 하나를 추가하는 것을 권장한다.

### 3.3 Sol R3 — invalid config 반복마다 독립된 복제본 사용: **해결**

- `run(runConfig = config)`를 도입했고, 반복마다 `structuredClone(original)`을 변형해서 넘긴다. 이전 키가 다음 반복으로 새지 않는다.
- 변이 `falsyRules`(`config.rules || {}`로 되돌림)는 테스트 1건이 실패하며 검출된다. `final-mutations.json`의 falsy-rules 검출 기록(0 !== 2)과도 일치한다.

### 3.4 N2 — font probe의 굵기 한계: **해결(문서)**

`verification.md:63`에 다음이 명시되었다. "exact weight/style matching are outside this check. Browsers may satisfy a 700-weight request with a nearby 400-weight face or synthetic bold; this probe does not verify the requested face descriptors." 제가 확인한 동작(P3e)과 정확히 일치한다.

## 4. 최종 판정

- **마지막 필수 지적 N1: 해결.** 원래 재현 fixture에서 needs-work와 exit 1을 확인했고, 정상 페이지에서 거짓 양성은 없었다. 이전 공식으로 되돌리는 변이도 테스트가 검출한다.
- Sol R2/R3, Opus N2: 해결. N3은 판정(blocked)이 안전하고, 감사 도중 이동할 때의 진단 메시지만 부분 해결이다.
- 이번 수정으로 생긴 must-fix 회귀는 **없다**.
- 남은 Low 3건은 후속 처리해도 된다.
  - (a) 감사 도중 교차 이동 시 진단 메시지가 이벤트 순서 때문에 일반 메시지로 나옴
  - (b) sticky·catch 우선순위·감사 후 검사에 회귀 테스트가 없음(변이 3종 생존)
  - (c) quirks 모드에서 루트 폭을 직접 키운 경우를 놓침
- **설치 준비: 예.** 현재 고정 해시(1절)의 소스를 설치해도 된다. 설치 뒤에는 저장소와 설치본의 7개 배포 파일 해시가 일치하는지, 그리고 설치 경로 기준 테스트가 통과하는지를 별도로 확인해야 한다. 이 재확인은 설치 전 소스까지만 다룬다.

## 5. 한계

- macOS 헤드리스 Chromium에서만 확인했다. Linux와 Windows의 스크롤바, 실기기는 확인하지 않았다.
- MCP 클라이언트는 이번 수정 대상이 아니어서(해시 동일) 테스트 7/7 재실행만 했다.
- 이번 수정과 무관한 영역은 다시 탐색하지 않았다.
