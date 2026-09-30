# frontend-reference-workflow v2 재리뷰 (Opus 5.5)

- 날짜: 2026-09-30
- 리뷰어: Claude Opus 5.5 (`claude-opus-5-5`). 단독으로 수행했고 서브에이전트는 쓰지 않았다. 이 판정은 제가 직접 실행한 검사에만 근거하며, 다른 모델이나 일반적인 승인 의견으로 대체하지 않았다.
- 대상: `/Users/jaymini/.paseo/worktrees/28nele6j/spiky-kolibri`. HEAD는 `82456d9`이고, 그 위에 커밋되지 않은 수정 12개 파일과 추적되지 않은 `docs/design/frontend-v2-dual-review.md`, `docs/design/v2-dual-review-evidence/`가 있다.
- 모드: 읽기 전용이다. 저장소·설치본·원 리포트는 수정하지 않았다. 스크래치는 `/tmp/fw-opus-probe/`에만 만들었다. 외부 API, 키, 21st 실계정은 사용하지 않았다.
- 원 리포트 `/tmp/frontend-v2-comprehensive-opus.md`의 SHA-256은 `0497c0ca…a026`으로 변경되지 않았다. `v2-dual-review-evidence/opus-initial.md`와 해시가 같다.

## 1. 재리뷰 대상 SHA-256 (고정본)

| 파일 | SHA-256 |
|---|---|
| scripts/browser-check.cjs | `9e615af23f8c5eeea962c4b635ecde9aa610a6bf8b446d99336de4983ac86544` |
| scripts/twenty_first.py | `6c547e44de60a907c1412386eb7ed44818d5f99c4736127d6477b5b5fda3a69f` |
| SKILL.md | `88d3175d50d0b7066a7b3e89d718b123b515f27be5b8410fc304268a2946c779` |
| references/layout.md | `40eb129fcdf1871fcc3cef9c0d0e062c207aeca35f14eb61c00b36a121802d1a` |
| references/tools.md | `d111c540890d6e8fb99030bdc417204f49a1770f1ddf3f767731ea21ca4906a2` |
| references/verification.md | `06ce492288ddb85e5bd29223c8875d5b4c1af9a0f4163f62f757b5bdbc7dee5a` |
| agents/openai.yaml | `7d5c0506f2f4efee8fa1c1fd41629cc325803cb6c87b76216282a27db9531765` (변경 없음) |
| tests/browser-check.test.cjs | `9df425dc2ca93047b96f15055470756b5509d99613d444069e54bbe0801ea518` |
| tests/layout-comparison.test.cjs | `2b76460119007f93ccd81fbe4c222136d8631d26073dd4e8b1268e44b17349b4` |
| tests/test_mcp_client.py | `8f180ad90086814b9545d0186a78db15ee521ac5c0b26eb421b5c3228da3d5c4` |

- 위 값은 `v2-dual-review-evidence/reviewed-fix-hashes.json`과 모두 일치한다. 수정된 문서 3개와 `.gitignore`도 일치한다.
- 설치본 `~/.agents/skills/frontend-reference-workflow`는 이전 기준본 그대로다(browser-check `df95d249…`, SKILL `44c3d5f5…`). 요청대로 이것은 계획된 배포 경계이며, 우발적인 불일치로 보지 않는다.

## 2. 직접 실행한 검사

| 검사 | 결과 |
|---|---|
| `node --test skills/frontend-reference-workflow/tests/*.test.cjs` | **23/23 통과** |
| `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s skills/frontend-reference-workflow/tests -p 'test_*.py'` | **7/7 통과** |
| 원래 탐침 P1–P7을 고정 소스 CLI로 다시 실행하고 신규 탐침 7종 추가 (로컬 127.0.0.1 fixture) | 아래 3절 |
| `/tmp` 복사본 변이 11종(browser 8, MCP 3) | **11/11 검출됨** (생존 변이 0) |
| MCP CLI 탐침 6종 (가짜 launcher) | 모두 안전하게 차단, exit 2, 원문과 `SECRET` 문자열 노출 없음 |

모든 fixture 서버는 종료했다. 저장소의 `git status`는 리뷰 전후로 동일하다(14줄).

## 3. 내 기존 지적의 처리 결과

| ID | 원래 문제 | 재검증 (고정 소스) | 판정 |
|---|---|---|---|
| **M1** | 키 오타 무시 → 통과 | `layoutComparison`, `rules:null`, `touchmin`, case `theme`는 모두 탐색 전에 **exit 2, blocked**가 되었다. 테스트에도 변이 11종이 추가되었다. 변이 `configKeys`는 테스트가 검출한다. | **해결** |
| **M2** | 헤드리스 스크롤바 숨김 → 메뉴 이동 누락 | short/tall 비교에서 `scrollbarWidth [0,15]`, `deltas.x 7.5`, **exit 1**을 얻었다. `scrollbar-gutter:stable` 대조군은 delta 0, exit 0이다. `scrollbarMode`가 기록된다. 변이 `scrollbars`는 검출된다. | **해결** |
| **M3** | 폰트 404여도 fontFamily 통과 | 선언만 검사하면 `needs-review`와 `fontReview` 문구가 나온다. `fontsLoaded` 검사에서 404이면 `needs-work`, 선언되지 않은 폰트도 `needs-work`, 실제 로드된 face는 `pass`, exit 0이다. 변이 `fontReview`와 `fontFail`은 검출된다. | **해결** (N2 한계 참고) |
| L1 | 교차 origin 리다이렉트 감사 | 302 리다이렉트는 blocked가 되고 `finalURL`이 기록된다. 변이 `origin`은 검출된다. | 해결 (N3 참고) |
| L2 | readySelector 다중 일치 시 원인 불명 | "Ready selector must match exactly one element" 메시지가 나온다. | 해결 |
| L3 | 조상 투명·화면 밖 | 화면 밖 랜드마크와 투명 조상은 needs-work가 된다. CSS expectation은 조상 opacity를 제외한다. 투명 조상 아래라도 포인터 이벤트를 받는 요소는 터치 후보로 유지한다. 실제로 클릭을 받을 수 있으므로 타당한 판단이다(verification.md:93). | 해결 |
| L4 | 테스트 공백 | 언어 불일치, 경계값(49 vs 48에서 tolerance 1은 통과, 0.5는 실패), 조상 숨김 테스트가 추가되었다. 변이는 모두 검출된다. | 해결 |
| L5 | Impeccable 조건 불일치 | `frontend-tooling.md:13`이 요청하거나 합의한 경우로 통일되었다. | 해결 |
| L6 | 과거 기록의 현재형 서술 | 두 과거 문서에 기준 시점과 후속 링크가 추가되었다. | 해결 |
| L7 | 21st 기본 도구 범위 | tools.md에 읽기 경로와 상태 변경 도구의 구분이 추가되었다. | 해결 |
| L8 | 날짜 단위 revision | `2026-09-30.2`로 바뀌었고, SKILL과 읽은 reference의 SHA-256을 기록하라는 안내가 추가되었다. | 해결 |

**결론: 기존 Medium 3건(M1, M2, M3)은 모두 해결되었다.** Low 8건도 해결되었거나 타당하게 처리되었다.

다른 모델이 지적한 항목은 코드와 탐침으로도 확인했다.

- **falsy rules**: `rules:null`은 exit 2가 된다.
- **조상에 가려진 CSS expectation**: P11에서 "No visible match"와 needs-work를 확인했다.
- **MCP envelope, 목록, 사용량 데이터**: 변이 3종을 검출했다. `structuredContent`만 있는 사용량 응답은 허용되고, search의 `isError`는 차단된다.
- **nonfinite timeout**: `nan`은 argparse 오류로 exit 2가 된다.

## 4. 신규 발견

### N1 (Medium, 설치 전 수정 권장) — 기본 스크롤바를 켠 뒤에도 overflow 판정은 `innerWidth` 기준이라, 실제 가로 스크롤을 놓친다

- 위치: `scripts/browser-check.cjs:214`, `overflow: document.documentElement.scrollWidth > innerWidth + 1`
- 재현(P9): 긴 페이지에 `width:100vw` 요소를 두었다. 보고서에는 `overflow:false`, `scrollWidth 1280`, `scrollbarWidth 15`, `viewport.width 1280`, `status automated-checks-passed`, **exit 0**이 기록되었다. 같은 조건의 브라우저에서 `clientWidth`는 1265이고, `scrollTo(50,0)` 뒤 `scrollX`는 **15**였다. 즉 페이지가 실제로 15px 가로 스크롤된다.
- 성격: 결과만 보면 기준본에서 새로 생긴 회귀는 아니다. 기준본은 스크롤바를 숨겨서 넘침 자체가 생기지 않았다. 그러나 이번 변경으로 검사 대상 브라우저에서 실제 넘침이 발생하는데도, 보고서 안에서 서로 모순되는 거짓 통과가 나온다. 원래 M2와 같은 부류(클래식 스크롤바 환경에서의 거짓 성공)다. `100vw` 가로 스크롤은 Windows와 Linux에서 흔한 결함이다.
- 수정: `scrollWidth > document.documentElement.clientWidth + 1` 한 줄이면 된다. 모바일과 오버레이 스크롤바 환경에서는 `clientWidth`가 `innerWidth`와 같으므로 기존 동작이 유지된다. 이 fixture를 회귀 테스트로 추가하는 것을 권장한다.

### N2 (Low) — font probe가 요청한 굵기의 실제 face를 구분하지 못한다

- 위치: `scripts/browser-check.cjs:82-88`, 문서 `references/verification.md:57` ("required weight/style")
- 재현(P3e): `@font-face`에 기본 굵기 face 하나만 선언하고 `"700 16px Pretendard"`를 probe했다. 결과는 `pass`, exit 0이었다. 브라우저 폰트 매칭이 가장 가까운 face를 반환하고, 700은 합성 굵게로 렌더링된다.
- 영향: 문서는 이 검사가 필요한 굵기를 확인한다고 읽히지만, 실제로는 해당 family의 face가 로드되었다는 것까지만 보장한다. `face.weight`가 요청한 굵기 범위를 포함하는지 비교하거나, 문서에서 "weight/style 일치는 확인하지 않음"을 명시하면 된다. 해결된 M3의 핵심인 404와 미선언 폰트 검출에는 영향이 없다.

### N3 (Low, 정보) — 클라이언트 측 교차 origin 이동은 일반 메시지로만 차단된다

- 재현(P7js): DOMContentLoaded 후 50ms에 다른 origin으로 `location.href`를 바꾸는 페이지. 결과는 blocked(안전), exit 1이지만, detail은 일반 메시지이고 `finalURL`은 이동 전 경로다.
- 거짓 통과가 아니므로 수정이 필수는 아니다. 감사 후 `page.url()`을 다시 확인하면 원인을 알리는 메시지를 줄 수 있다.

### 정보 — 화면 밖 랜드마크 규칙의 부작용

화면 아래쪽에 있는 footer처럼 viewport 밖의 랜드마크는 "exactly one visible"로 needs-work가 된다(P10). 이 규칙은 `verification.md:93`에 문서화되어 있고, 결과가 안전한 방향이므로 결함으로 세지 않는다.

## 5. 회귀 확인 (수정된 파일 범위)

- **기존 API**: `auditPage(page, rules, AxeBuilder)`의 시그니처는 유지된다. `validateRules`가 `touchMin` 검증을 흡수했다. 다만 `rules`에 알 수 없는 키를 넘기던 직접 호출자는 이제 예외를 받는다. 이는 의도된 계약 변경으로 문서화되어 있다(verification.md:53).
- **touch 제외 조건**: 이전의 "자신이 opacity 0이고 pointer-events가 none"에서 "pointer-events가 none이고 (자신 또는 조상이) 보이지 않음"으로 넓어졌다. 기존 테스트(투명 overlay는 유지, form mirror는 제외)는 모두 통과한다.
- **viewportMismatch**: 기본 스크롤바를 켜도 `innerWidth` 비교는 영향을 받지 않는다. 터치 CLI 테스트도 통과한다.
- **MCP**: 기존 5개 테스트와 ping, 알림, 프로세스 그룹 정리가 유지된다. 빈 검색 결과(`content: []`)는 정상으로 허용된다. 사용량 확인 실패 시 search를 호출하지 않는다는 기존 테스트도 통과한다.
- **지침**: 승인된 무채색, Pretendard, 목적별 폭, 모션 권위와 승인 규칙에서 후퇴한 부분은 없다. tools.md는 도구가 노출되었다는 것만으로 상태 변경 권한이 생기지 않는다고 명시한다.

## 6. 한계

- macOS 헤드리스 Chromium에서만 실행했다. Linux와 Windows의 스크롤바 폭, 실기기는 확인하지 않았다.
- 실제 21st 계정과 Pretendard CDN 같은 외부 자원은 사용하지 않았다. 폰트 검사는 로컬 fixture(Arial.ttf를 Pretendard로 선언)와 저장소 테스트의 `node_modules/pretendard`만 사용했다.
- `frontend-v2-dual-review.md`는 처리 목록 확인용으로만 참고했다. 모든 판정은 코드, 탐침, 변이 실행에 근거한다. 다른 모델의 원문은 읽지 않았다.
- 설치본에서는 재실행하지 않았다(미설치가 계획된 상태). 설치 후에는 해시 일치와 설치 경로 테스트를 별도로 확인해야 한다.

## 7. 판정

- 기존 Medium M1, M2, M3: **모두 해결**. Low L1–L8도 해결되었다.
- 신규 must-fix: **N1 1건(Medium)**. 기본 스크롤바를 켠 환경에서 overflow 판정이 `innerWidth` 기준이라, 실제 가로 스크롤을 통과로 보고한다. 한 줄 수정과 회귀 테스트 1개로 해결되므로 **설치 전에 반영하기를 권장**한다.
- N2와 N3은 Low이며 후속 처리해도 된다. N2는 문서 문구만 고쳐도 충분하다.
- **준비 상태**: N1을 반영하고 해당 변경에 대한 범위를 좁힌 재검사(테스트 23+1개, 해시 갱신)가 통과하면 설치해도 된다. N1을 반영하지 않고 설치하려면, 최소한 verification.md에 "overflow는 스크롤바 폭 이내의 가로 넘침을 검출하지 못함"을 명시해야 한다. 그 경우 이 도구의 overflow 통과를 클래식 스크롤바 환경의 증거로 인용하지 않아야 한다.
