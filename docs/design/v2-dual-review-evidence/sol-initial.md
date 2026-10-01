# frontend-reference-workflow v2 독립 전체 리뷰

> Archived evidence: personal paths/session IDs anonymized; original hashes/results retain dated scope. External scratch artifacts are unavailable here and were not rerun.

검토일: 2026-09-30. 대상: `<historical-repository>`, HEAD `82456d93061e875ea554fa8567537a920cee3361`.

## 판정

**NOT READY — 검사기 결과를 최종 검증 근거로 신뢰하기 전 Medium 3건을 수정해야 한다.** 지침의 방향·승인 처리·공통 디자인 권위와 설치 일치는 적절하다. 기존 회귀 검사는 **Node 16/16, Python 5/5, 각각 exit 0**으로 통과했다. 그러나 독립 fixture에서 설정 누락을 성공으로 처리하는 경로, 숨겨진 요소를 보이는 요소로 처리하는 경로, 빈 MCP 응답을 성공으로 처리하는 경로를 재현했다.

Critical 0 / High 0 / Medium 3 / Low 3. 이 판정은 스킬과 helper의 검증 신뢰성에 대한 것이다. 공유 UI 패키지 또는 RelayDock 제품의 재설계·출시 판정이 아니다.

이번 보고서는 현재 Codex 세션의 독립 Sol 리뷰 역할로 작성했다. Opus 리뷰를 실행하거나 대리하지 않았다. 별도의 런타임 모델 ID 조회는 수행하지 않았다. 다른 리뷰어의 원문 출력·과거 리뷰 파일은 열지 않았다. 요청된 검증 문서에 있는 과거 결과 요약은 주장으로만 읽고, 아래 결론은 현재 소스와 직접 실행으로 확립했다.

## 결함

모든 경로는 저장소 루트 기준이며, 설치본에도 동일한 구현 결함이 존재한다.

### M1 — Medium: falsy `rules`가 빈 규칙으로 바뀌어 설정 오류가 성공한다

- 위치: `skills/frontend-reference-workflow/scripts/browser-check.cjs:358`, `:441`.
- `validateRules(config.rules || {})`와 `auditPage(page, config.rules || {}, ...)`가 명시적 `null`, `false`, `0`을 모두 `{}`로 바꾼다. `validateRules` 자체는 이 입력을 거부하지만 CLI가 검증 전에 지운다.
- 재현: `<historical-scratch>/frontend-v2-sol-probe.cjs`의 `rules-null`, `rules-false`, `rules-0`. 각각 현재 helper를 실행한 결과 **exit 0, `automated-checks-passed`, 로컬 요청 1회**, CSS expectations는 빈 배열이고 touch는 `not-configured`였다.
- 효과: 설정 생성/병합 오류로 프로젝트 기반 검사 규칙이 사라져도 성공한 보고서가 나온다. 이는 `layoutComparisons: null`을 오류로 처리하는 현재 정책 및 `references/verification.md:73`의 잘못된 설정 사전 차단 설명과 어긋난다. 의도적으로 `rules`를 생략한 일반 axe/overflow 검사는 문제로 세지 않는다.
- 최소 수정: 생략된 `undefined`만 기본 `{}`로 처리하고, 명시적 다른 타입은 그대로 검증에 전달한다. CLI 회귀 검사에 위 세 입력을 추가한다.

### M2 — Medium: 조상의 opacity를 무시해 숨긴 CSS 대상이 통과한다

- 위치: `skills/frontend-reference-workflow/scripts/browser-check.cjs:59-73`, `:87-93`, `:115-117`.
- `visible()`은 요소 자신의 computed opacity만 검사한다. 조상의 `opacity:0`은 자식의 computed opacity를 0으로 바꾸지 않는다. 별도의 landmark 검사(`:250-258`)는 조상을 확인하므로 두 검사 경로도 일관되지 않다.
- 재현: `node <historical-scratch>/frontend-v2-sol-hidden-probe.cjs`. 똑같은 20×20 버튼에 opacity/pointer-events를 직접 지정하면 CSS expectation은 `No visible match`로 실패한다. 이를 부모 `<div style="opacity:0;pointer-events:none">`로 옮기면 **CSS expectation은 pass, 전체 CSS-only audit은 `automated-checks-passed`**가 된다. touch 검사까지 켜면 클릭할 수 없는 그 버튼이 `touchReview`에 들어간다.
- 효과: 숨겨진 템플릿·비활성 화면을 현재 보이는 기반 스타일의 증거로 사용할 수 있고, 숨김 컨트롤 때문에 불필요한 touch 수동 검토가 생긴다. 이는 `references/verification.md:81,89`의 visible expectation/visible control 계약에 어긋난다.
- 최소 수정: CSS expectation에는 조상까지 포함한 표시 여부를 반영한다. touch에서는 투명 native overlay를 보존하되 실제 pointer 입력을 받을 수 없는 투명 subtree를 제외한다. 두 경로를 무조건 같은 opacity 규칙으로 합쳐 overlay 검사를 망가뜨리면 안 된다. 직접 숨김/조상 숨김 비교를 작은 회귀 검사로 남긴다.

### M3 — Medium: MCP 결과의 의미 있는 구조를 검증하지 않아 빈 응답이 성공한다

- 위치: `skills/frontend-reference-workflow/scripts/twenty_first.py:74-79`, `:115-116`, `:124-133`, `:155-158`.
- `Client.call()`은 result가 dict인지와 `isError`만 확인한다. 따라서 `get_usage`와 `search`가 `{}`를 반환해도 성공이다. `tools/list`의 tools 타입도 확인하지 않는다.
- 재현: `PYTHONDONTWRITEBYTECODE=1 python3 <historical-scratch>/frontend-v2-sol-mcp-probe.py`. 격리된 로컬 stdio 서버가 initialize와 목록은 정상 응답하고 두 tool call에 `{}`를 반환한다. 실제 CLI의 `status`는 **exit 0, `connected`, `usage:{}`**, `search`는 **exit 0, `searched`, `usage:{}`, `search:{}`**를 출력한다. 같은 서버의 `tools:null` 변형은 safe `ClientError` 대신 **TypeError**를 발생시킨다.
- 효과: 계정 이용권이나 검색 결과를 확인하지 못한 응답이 성공 증거가 된다. 검색 전에 이용권을 확인하라는 `SKILL.md:39`와 안전한 실패 처리를 설명한 `references/tools.md:54-58`의 보장을 충족하지 못한다.
- 최소 수정: tools가 배열인지와 필요한 이름 타입, tool result의 실제 응답 구조를 좁게 확인하고 잘못된 구조를 safe `ClientError`로 변환한다. 이용권 데이터가 확인되지 않은 경우에는 그 사실을 분리해서 보고한다. 정상적인 “검색 결과 0건”은 오류로 만들지 않는다. 새 MCP 프레임워크는 필요하지 않다.

### L1 — Low: 잘못된 touch threshold가 탐색 전 설정 오류로 처리되지 않는다

- 위치: `skills/frontend-reference-workflow/scripts/browser-check.cjs:48-54`, `:358`, `:431-441`.
- `touchMin` 검증이 `auditPage`에만 있어 CLI 설정 검증 단계에서는 걸러지지 않는다.
- 재현: `<historical-scratch>/frontend-v2-sol-probe.cjs`의 `invalid-touch`: `rules:{"touchMin":-1}`로 **로컬 요청 1회 이후 exit 1 / blocked**. 설정 실패의 exit 2 / 탐색 0회와 다르다.
- 효과: 실패를 성공으로 오인하지는 않지만, `references/verification.md:73,87`의 설정 오류 사전 차단/종료 코드 계약이 깨진다.
- 최소 수정: touchMin 검증을 이미 존재하는 `validateRules`에 포함해 CLI와 API가 공유한다.

### L2 — Low: NaN/Infinity timeout이 검증을 우회해 JSON 오류 보고 대신 traceback을 낸다

- 위치: `skills/frontend-reference-workflow/scripts/twenty_first.py:143-146`, `:44`, `:155`.
- float 입력에 `<=0`만 검사하므로 `nan`, `inf`가 통과한다.
- 재현: 위 MCP probe가 fake launcher만 사용해 실제 CLI의 `--timeout nan`, `--timeout inf`를 실행했다. 둘 다 **exit 1, stdout 빈 문자열, stderr TypeError traceback**이었다. 안전한 blocked JSON/exit 2가 아니다. 예외 경로에서도 `finally`의 프로세스 정리는 수행된다.
- 최소 수정: timeout이 유한한 양수인지 검증한다. 실제 인증·키와 무관한 입력 경계 문제다.

### L3 — Low: 도구 안내의 Impeccable 실행 조건이 현재 entrypoint보다 넓다

- 위치: `docs/design/frontend-tooling.md:13` 대 `skills/frontend-reference-workflow/SKILL.md:33`.
- 전자는 “큰 작업의 마무리에는 ... 사용한다”, 후자는 “Substantial finishing requested or agreed in task scope”라고 한다.
- 효과: 현재 안내 문서만 읽으면 큰 작업마다 Impeccable을 의무 실행한다고 해석할 수 있다. 이는 명시적 요청/합의된 finishing으로 좁힌 entrypoint와 조건이 다르다. 실행된 에이전트가 실제로 범위를 확대했다는 주장은 하지 않는다.
- 최소 수정: 안내 문서에도 요청되거나 작업 범위로 합의된 finishing이라는 조건을 동일하게 쓴다.

## 요청된 평가 항목별 검토

### 지침·승인·디자인 권위

`SKILL.md:14-24`는 기존 승인, 공유 foundation과 제품 composition, package import와 복사본 provenance를 구분한다. 이미 정해진 결정은 다시 찾지 않고, 새 방향만 승인 대기 대상으로 삼는다. 기존 승인된 설치/포함 사용량을 다시 확인받지 않는 `:41-43`도 적절하다. layout 계약은 새 승인 단계나 범용 shell API를 요구하지 않는다.

AGENTS.md, DESIGN.md, 관련 shared UI spec, v2-migration.md의 승인된 neutral/Pretendard/목적별 폭/절제된 모션은 서로 맞는다. 토큰 및 생성 CSS에서도 Pretendard, reading/settings 640px, list 1200px, short-form 480px, 120/180ms를 확인했다. RelayDock 1600px를 공유 토큰으로 승격하지 않으며, hero·3D·cursor 장식을 공유 요구사항으로 만들지 않는다. component semantics와 공개 API를 이번 리뷰에서 변경할 이유는 없다.

### 참고 탐색·실제 도구 사용·provenance

정해진 디자인을 외부 자료로 덮어쓰지 않고 gap별 자료를 찾는 방식은 유용하다. Linear 자료를 third-party marketing analysis로 표시하고 공식 제품 UI·접근성 증거로 취급하지 않는 DESIGN의 설명도 적절하다. 검색 metadata와 code retrieval/adoption, 설치와 read, engine-probe/context와 polish/distill execution의 구분이 명시적이다.

`tools.md:3,43`은 외부 확인과 계정 상태가 날짜가 있는 기록임을 밝히며 사용 직전 재확인을 요구한다. launcher/package/endpoint 실제 상태, 유료 정책 또는 계정 연결의 현재성은 이번 허용 범위에서 재확인하지 않았다. 그것을 결함으로 세지 않았다. `frontend-sources.md`의 최신 항목은 새 외부 검색 없이 승인된 규칙의 적용·검증을 보강한 작업이라고 명확히 기록한다.

### 브라우저 감사·레이아웃 비교

현재 소스는 비교 대상 이름 중복, 알 수 없는 case, 잘못된 properties/tolerance, 다른 viewport/touch/requested theme/locale, `layoutComparisons:null`을 막는다. max-minus-min으로 두 개 이상 case의 geometry를 비교하고, missing/ambiguous landmark와 blocked case, differing document lang을 분리한다. 개별 페이지가 통과해도 비교 실패가 최상위 status와 exit에 반영되는 것을 이번 실제 테스트로 확인했다. 보고서 checker SHA는 실제 파일 해시와 같다.

요청 테마/locale과 앱의 실제 테마/번역은 다르다는 설명, local scroll/clipping과 page overflow의 구분, 현재 text contrast와 non-text/focus/state contrast의 구분은 정확한 범위 제한이다. reduced-motion으로 측정한 결과를 motion 테스트로 주장하지 않는다. transparent overlays, aria-hidden, label/pseudo hit-area, axe incomplete를 고려한 기존 테스트도 의미 있다. M1/M2/L1은 이 좋은 계약의 구현에서 남은 틈이다.

추가 관찰: `measureLandmark(:245-263)`는 `clip-path:inset(100%)`로 완전히 잘린 nav도 count 1로 측정한다. `<historical-scratch>/frontend-v2-sol-probe.cjs`의 `clipped-landmark`에서 두 route 비교가 exit 0이었다. **별도 필수 결함으로 세지 않았다.** 문서가 clipping을 시각 검토 범위로 명시하기 때문이다. 이 경우의 자동 geometry 통과를 “실제로 보이는 navigation 확인”으로 확대해석하면 안 된다. 완전히 잘린 landmark를 차단하는 좁은 보완은 선택 사항이다.

### stdio MCP·실패·비밀정보

로컬 launcher만 subprocess로 실행하고 credential 파일을 helper가 직접 열지 않는다. raw child stderr를 버리고 JSON-RPC error/isError를 안전한 메시지로 변환하며 자동 재시도하지 않는다. notification과 server request를 response와 분리하고 ping/unsupported request에 응답한다. reader 크기·pagination·call timeout에 상한이 있고 POSIX process group 정리가 존재한다. 기존 테스트에서 timeout descendant cleanup과 오류 marker 비노출이 통과했다.

이는 전체 MCP 구현이나 Windows 호환성을 주장하지 않으며, status/search만 제공하는 좁은 client라는 점은 적절하다. M3/L2의 입력·응답 검증 보완이면 충분하다. 실제 secret에 접근하거나 실패 원문을 노출하는 결함을 이번 검토에서 확인하지는 않았다. 정상 성공 payload는 그대로 출력하는 설계이므로 “모든 서버 데이터의 secret scrubber”로 해석해서는 안 된다.

### 문서·증거·완료 주장

두 verification 문서는 로컬 fixture 검사와 제품 준수·Storybook·packed consumption을 구분한다. 이전 마지막 Opus 재리뷰가 실행되지 않았다는 제한, 최신 독립 코드 리뷰 범위와 설치본 layout 테스트 범위도 명시되어 있다. 이 과거 리뷰 자체를 근거로 현재 승인을 부여하지 않았다.

현재 직접 실행으로 16/5 테스트 수 및 배포 7파일 일치를 재확인했다. 이전 문서의 11개/6파일은 이전 단계 기록이며 최신 보완 문서가 16개/7파일로 갱신하므로 그 숫자 자체를 모순으로 세지 않는다. 설치 업데이트가 실행 중 agent가 읽은 지침을 자동 갱신하지 않는다는 주의와 revision/SHA 기록도 적절하다. L3 외에는 요청된 문서들 사이에서 새로운 명백한 routing/authority 모순을 확립하지 못했다.

STATUS.md는 2026-06-28의 기존 출시 완료 기록이다. 이번 9월 스킬/helper 또는 UI v2의 현재 검증/게시 완료 근거로 사용하지 않았다. DESIGN의 historical study 내 pending 문구도 위에서 역사적 기록임을 설명하므로 현 구현 미완료 주장으로 읽지 않았다.

## 직접 실행한 검사와 증거

| 명령/검사 | 결과 |
|---|---|
| `node --test skills/frontend-reference-workflow/tests/*.test.cjs` | 16 tests, pass 16, fail 0, skipped 0; exit 0 |
| `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s skills/frontend-reference-workflow/tests -p 'test_*.py'` | 5 tests; OK; exit 0 |
| `node <historical-scratch>/frontend-v2-sol-probe.cjs` | 5 CLI probes + opacity API probe; 재현 결과 JSON 보존; exit 0은 probe 실행 성공이며 대상의 결함 부재를 뜻하지 않음 |
| `node <historical-scratch>/frontend-v2-sol-hidden-probe.cjs` | 직접 숨김/조상 숨김 각각 CSS/touch 비교; exit 0 |
| `PYTHONDONTWRITEBYTECODE=1 python3 <historical-scratch>/frontend-v2-sol-mcp-probe.py` | empty status/search, malformed tools, nan/inf timeout; 전부 fake stdio launcher; exit 0 |
| HEAD blob 대 현재 읽은 파일 바이트 비교 | manifest 20개 모두 HEAD와 일치 |
| 배포 대상 source 대 installed 바이트/SHA 비교 | 7/7 일치; Claude symlink는 installed 경로로 resolve |
| 시작 시와 마지막 `git status --short` | 출력 없음; tracked 변경 없음 |

재현 코드와 입력/결과는 `<historical-scratch>/frontend-v2-sol-probe.cjs`, `<historical-scratch>/frontend-v2-sol-hidden-probe.cjs`, `<historical-scratch>/frontend-v2-sol-mcp-probe.py`, `<historical-scratch>/frontend-v2-sol-fake-mcp.py`, `<historical-scratch>/frontend-v2-sol-*-config.json`, `<historical-scratch>/frontend-v2-sol-*-report.json`, `<historical-scratch>/frontend-v2-sol-probe-results.json`, `<historical-scratch>/frontend-v2-sol-hidden-probe-results.json`, `<historical-scratch>/frontend-v2-sol-mcp-probe-results.json`에 보존했다. 실행은 모두 기존 의존성·로컬 fixture에 한정했다.

기존 테스트는 실제 Chromium/axe와 subprocess를 쓰고 결과/exit/오류 처리까지 확인하므로 가치가 있다. 그러나 falsy rules, 조상 opacity, tool result 누락/잘못된 목록 타입, 유한하지 않은 timeout, threshold 사전 검증에는 빈틈이 있다. 테스트 통과가 위 독립 반례를 닫지 못한다. 보완에는 해당 경계 입력의 작은 회귀 검사만 필요하며 framework/plugin 전환은 필요 없다.

## SHA-256 및 설치 동일성

현재 배포 대상 7파일은 아래 SHA로 source와 `~/.agents/skills/frontend-reference-workflow`가 모두 일치한다. `~/.claude/skills/frontend-reference-workflow`는 그 디렉터리를 가리키는 symlink다.

| source 상대 경로 | SHA-256 |
|---|---|
| `SKILL.md` | `44c3d5f595037f2eda646f5d823a628ec139d12a16434c4e8ad8b48e848f8259` |
| `agents/openai.yaml` | `7d5c0506f2f4efee8fa1c1fd41629cc325803cb6c87b76216282a27db9531765` |
| `references/layout.md` | `906aaa7dd587b6c2c241ef1ff2d87dbba03e8728f24e3aa658e419755e8632b4` |
| `references/tools.md` | `997732e0da02286f958ff37b725b85c5a0509fbc2c3025af3a51e14de6c81b6f` |
| `references/verification.md` | `606bf277c4741a17ee81144a7e271a36c64550bb7f8b8dd3202e4723ff8785a6` |
| `scripts/browser-check.cjs` | `df95d249b2446116486a121de931ab19d027d3afcc58d4842a2189f884ed3f0b` |
| `scripts/twenty_first.py` | `8e2e6743caee97f20f3fa1b755a45783b932f89894c99c37a9543a6887bb5dd9` |

테스트 원본 identity:

| file | SHA-256 |
|---|---|
| `tests/browser-check.test.cjs` | `66a401b07046741fcdaf2361736f54865509d5978fc854a24dcb27dc04252022` |
| `tests/layout-comparison.test.cjs` | `dd83d8c7ea1c374b831bbd8680c1e423a2cf9f5fb0013233c22c6a7dd6634509` |
| `tests/test_mcp_client.py` | `cd0724e92beb5b2f55cb6c47902f846dd2cf627e5dc3e3d33302014507dc0d9b` |

전체 읽은 scope 파일 20개의 SHA와 HEAD 일치 여부는 `<historical-scratch>/frontend-v2-sol-source-manifest.json`에 있다. source/installed 개별 비교는 `<historical-scratch>/frontend-v2-sol-identity.json`에 있다. source `.gitignore`와 tests가 installation에 없는 것은 배포 대상 제외이며 equality 결함이 아니다.

## 제한과 다음 조치

실제 21st launcher/auth/key 파일, 외부 API, 유료 사용, 설치, git 변경, 제품 변경, 다른 리뷰 원문, subagent 실행은 하지 않았다. Storybook/packed consumption/제품 실제 시각 결과는 이번 스킬 리뷰와 별도이며 실행하지 않았다. 이미 실행 중인 agent의 instruction refresh나 새 세션의 native MCP discovery도 확인하지 않았다.

승인된 read-only review를 완료했다. 후속 변경은 별도 수행해야 한다. **M1–M3의 최소 수정과 해당 반례 재검사 후**, 기존 16/5 회귀와 설치 동일성을 다시 확인하면 검사기 준비 판정을 재평가할 수 있다. Low 항목은 좁은 정합성 보완이고, clipping 추가 자동 검사는 선택 사항이다.
