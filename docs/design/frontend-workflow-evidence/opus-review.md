# frontend-reference-workflow 독립 리뷰 (Opus 5.5)

> Archived evidence: personal paths/session IDs anonymized; original hashes/results retain dated scope. External scratch artifacts are unavailable here and were not rerun.

- 일시: 2026-09-29 21:2x JST
- workspace: `<historical-repository>`, branch `understand-design-system`
- 범위: `skills/frontend-reference-workflow/{SKILL.md, references/tools.md, references/verification.md, scripts/twenty_first.py, scripts/browser-check.cjs, tests/*}`
- 방식: 읽기 전용. 로컬 fixture 테스트, `/tmp` 복사본에 대한 mutation, 로컬 probe만 실행. 외부 네트워크, 21st 계정, 키 파일은 접근하지 않음. 제품 코드와 스킬 파일도 수정하지 않음.

## 0. 리뷰 대상 스냅샷 (중요)

리뷰 도중 파일이 바뀌었습니다. 모든 대상 파일의 mtime이 21:17–21:21입니다. 첫 읽기 이후 `tests/browser-check.test.cjs`에 CLI 테스트가 추가되었고, `tests/test_mcp_client.py`에 usage-error 테스트가 추가되었습니다. 이 보고서는 아래 해시 기준입니다. 배포 전에 해시가 달라졌다면 해당 부분을 다시 확인해야 합니다.

```
3a69f0b5  SKILL.md
4ed8f2c8  references/tools.md
133c22a8  references/verification.md
a783091d  scripts/browser-check.cjs
7828c5da  scripts/twenty_first.py
e5a9c66d  tests/browser-check.test.cjs
cf8ff4da  tests/test_mcp_client.py
```

**추가 (보고서 작성 직후):** `scripts/browser-check.cjs`가 `25a2553b`로, `tests/browser-check.test.cjs`가 `faaca4b0`로 다시 바뀌었습니다(21:24, 포맷 변경으로 보임). 새 버전에서 node 테스트 4/4, python 3 tests OK를 다시 확인했습니다. `<historical-scratch>/fr-probe.cjs` 재실행 결과 M1, L1–L4가 **동일하게 재현**됩니다. 테스트에는 여전히 overflow 단독 fixture와 incomplete 단독 fixture가 없습니다(M2 유효). 아래 `browser-check.cjs` 줄 번호는 이전 스냅샷 기준입니다. 새 파일 기준 대응 줄은 다음과 같습니다.

| 항목 | 새 줄 |
|---|---|
| visible | 16 |
| touch 선택자 | 36 |
| css 루프 | 77 |
| overflow | 92 |
| status | 119-124 |
| limits | 132 |
| case 검증 | 167 |
| hasTouch/colorScheme | 184-185 |
| networkidle | 191 |
| results | 199 |
| blocked detail | 205 |
| top-level catch | 235 |

## 1. 실행한 명령과 결과

| 명령 | 결과 |
|---|---|
| `node --test skills/frontend-reference-workflow/tests/browser-check.test.cjs` (repo root) | 첫 실행 3/3 통과. 갱신 후 스냅샷은 4/4 통과 |
| `python3 -m unittest discover -s skills/frontend-reference-workflow/tests -p 'test_*.py'` | 첫 실행 2 tests OK (갱신 후 3 tests 스냅샷에 대한 재실행 기록은 없음) |
| Mutation (`/tmp` 복사본): status에서 `measurements.overflow` 제거 | **4/4 통과 → 검출 안 됨** |
| Mutation (`/tmp` 복사본): needs-review에서 `incomplete.length` 제거 | **4/4 통과 → 검출 안 됨** |
| Mutation: status에서 overflow와 expectation을 모두 제거 | 새 CLI 테스트가 검출 (fail 1) |
| `<historical-scratch>/fr-probe.cjs` (auditPage fixture 10종) | 아래 M1, L1–L4 근거 |
| `<historical-scratch>/fr-py-probe.py` (MCP client edge case 4종) | 아래 L6–L8 근거 |
| `/tmp`에서 node 테스트 실행 | `Cannot find module '@playwright/test'` (L10) |
| 21st `search`/`get_usage`/`get_component` 스키마 확인 (로컬 ToolSearch로 스키마만 로드, 호출 없음) | `search`는 "FREE"이고 `type:'component'`와 `limit`(1–30)을 받음. `get_component`는 PAID |
| launcher 프로세스 모델: `launch.py`에서 exec/subprocess 줄만 grep (키 관련 줄은 제외하고 키 파일은 열지 않음) | `os.execve(node, magic-0.2.3/dist/index.js)`로 node를 직접 exec |

## 2. 문제 (심각도순)

### M1. [Medium] 비텍스트 대비와 포커스 가시성은 자동 검사 범위 밖인데, 문서상 "contrast 측정"으로 읽힘 (false pass 위험)

- 위치: `SKILL.md:43`("Measure approved foundations and actual rendered contrast…"), `references/verification.md:63-69`(별도 확인 목록), `scripts/browser-check.cjs:53-54`(`limits`)
- 재현 (`<historical-scratch>/fr-probe.cjs`):
  - 흰 배경 위 `input{border:1px solid #f2f2f2}` → `automated-checks-passed`
  - `button{outline:none!important}` → `automated-checks-passed`
- 원인: axe `color-contrast`는 텍스트만 봅니다. 기본(rest) 상태만 측정합니다. placeholder, hover/selected/disabled 상태, 컨트롤 경계, 포커스 링의 3:1 대비는 검사하지 않습니다. DESIGN.md가 요구하는 "essential control boundaries and state indicators 3:1"은 자동화되지 않습니다. 그런데 별도 확인 목록에도 이 항목이 없습니다.
- 권장:
  - `verification.md` 별도 확인 목록에 "Non-text contrast: control borders, focus indicators, selected/state indicators (3:1), placeholder, hover/selected/disabled text"를 추가합니다.
  - `limits`에 "axe contrast covers text in the current state only"를 추가합니다.
  - `SKILL.md:43`의 "contrast"를 "text contrast (automated) and non-text/state contrast (manual or project checks)"로 구분합니다.

### M2. [Medium] 테스트가 status 도출의 개별 경로를 고정하지 못함 (회귀 시 false pass)

- 위치: `tests/browser-check.test.cjs:16-23`, `:30-32`
- 재현: `/tmp` 복사본에서 `browser-check.cjs:50`의 `measurements.overflow||`를 제거하거나, `:51`의 `||incomplete.length`를 제거해도 테스트가 4/4 통과합니다.
- 원인: "bad" fixture는 contrast, nested, touch, overflow, expectation 결함을 동시에 가집니다. 그래서 axe 위반만으로도 `needs-work`가 됩니다. overflow만 있는 경우와 axe incomplete만 있는 경우를 단독으로 검사하는 테스트가 없습니다. `missing` 케이스도 `status`를 assert하지 않습니다.
- 권장: 다음 fixture를 추가합니다.
  - overflow만 있는 페이지 → `needs-work`
  - axe incomplete만 있는 페이지(예: 배경 이미지나 gradient 위 텍스트) → `needs-review`
  - `missing.status === 'needs-work'`
  - fine pointer에서 `touchStatus === 'not-applicable-fine-pointer'`이고 결과가 pass로 오인되지 않음

### L1. [Low] touch 케이스가 모바일 viewport 의미론을 에뮬레이트하지 않음

- 위치: `scripts/browser-check.cjs:77` (`hasTouch`만 켜고 `isMobile`은 켜지 않음)
- 재현: `<meta name="viewport">`가 없는 페이지로 확인했습니다.
  - `hasTouch`만 켜면 390px로 렌더됩니다. 실제 폰은 980px로 렌더 후 축소하므로 meta 누락이 드러나지 않습니다.
  - `isMobile:true`로 켜면 `innerWidth=980`, overflow false, `automated-checks-passed`입니다. 이 경우도 누락을 잡지 못합니다.
- 권장: touch 케이스에 `isMobile:true`를 켭니다. 그리고 `innerWidth !== viewport.width`이면 `needs-work`("viewport meta missing/ineffective")로 판정합니다.

### L2. [Low] `overflow-x: clip`으로 잘린 콘텐츠를 놓침

- 위치: `scripts/browser-check.cjs:40-41`
- 재현: `html,body{overflow-x:clip}`에 `main{width:900px}` → `scrollWidth 390`, `automated-checks-passed`. `overflow-x:hidden`은 정상 검출합니다.
- 권장: `limits`와 verification.md에 "page-level scroll overflow only; clipped/ellipsized content and inner-region overflow need visual review"를 명시합니다. 선택적으로, 뷰포트 밖으로 나간 visible 요소의 `getBoundingClientRect().right > clientWidth`도 검사합니다.

### L3. [Low] 설정 오타가 조용히 pass 처리됨

- 위치: `scripts/browser-check.cjs:29-37`, CLI `:69`
- 재현: `expectations:[{selector:'body', cs:{fontSize:'18px'}}]`(css 오타) → 검사 0건이고 `automated-checks-passed`
- 권장: 각 expectation에 비어 있지 않은 `selector`와 `css`가 있는지 검증하고, 없으면 throw(blocked)합니다. case의 `viewport`와 `name`도 함께 검증합니다.

### L4. [Low] touch 후보 선택자의 노이즈와 누락

- 위치: `scripts/browser-check.cjs:12`, `:17-18`
- 재현:
  - `main/h1 tabindex="-1"`(라우터와 Radix의 포커스 대상) → `h1 390x18`이 needs-review로 잡힘
  - sr-only skip link(1×1 clip) → needs-review로 잡힘
  - `role="tab"`에 tabindex가 없는 경우 → 누락
- 영향: needs-review가 상시 발생하면 검토자가 결과를 무시하는 습관이 생깁니다. `role=tab/menuitem/option/link/radio`에 tabindex가 없는 구현은 false pass가 됩니다.
- 권장:
  - `[tabindex="-1"]`인 비네이티브 요소는 제외합니다.
  - clip/`opacity:0`/1px 요소는 `visible()`에서 제외하거나 별도 필드로 분리합니다.
  - role 목록을 확장합니다. inline link 예외(WCAG 2.5.8)도 문서화합니다.

### L5. [Low] 테마 기본값과 증거 기록

- 위치: `scripts/browser-check.cjs:77`(`colorScheme` 기본값 `'dark'`), `:84`(결과에 case 설정이 기록되지 않음), `verification.md:17-33`(예시에 colorScheme 없음)
- 영향: 문서 예시를 그대로 쓰면 dark에서만 실행됩니다. 보고서에도 어떤 테마와 touch 설정이었는지 남지 않습니다. `verification.md:9`의 "relevant light/dark themes"와 `:49`의 "Store JSON alongside … theme"을 수동에 의존하게 됩니다. class나 localStorage로 테마를 바꾸는 앱에서는 `prefers-color-scheme` 에뮬레이션이 효과가 없을 수도 있습니다.
- 권장:
  - `colorScheme`을 필수로 하거나 기본값을 문서화합니다.
  - `results`에 `{colorScheme, touch, viewportConfig}`를 기록합니다.
  - 예시에 light/dark case를 둘 다 넣고, 테마 적용 방식이 class 기반이면 project Playwright로 `auditPage`를 쓰라고 명시합니다.

### L6. [Low] MCP client가 서버발 request를 응답으로 오인할 수 있음

- 위치: `scripts/twenty_first.py:57-65`
- 재현 (`<historical-scratch>/fr-py-probe.py`): initialize 도중 서버가 `{"id":1,"method":"ping"}`을 보내면 `ClientError: MCP returned an invalid result.`가 발생합니다. 서버와 클라이언트의 id 공간은 독립이므로 id 1 충돌은 현실적입니다. 서버 ping에는 응답도 하지 않습니다.
- 영향: fail-closed이므로 false pass나 유출은 없습니다. 연결 실패 오진만 생깁니다.
- 권장: `'method' in message`인 메시지는 응답 후보에서 제외합니다. `ping` request에는 `{"jsonrpc":"2.0","id":…,"result":{}}`로 응답하고, 그 외 request에는 `-32601`로 응답합니다.

### L7. [Low] 빈 줄이나 CRLF 공백 줄에서 즉시 실패

- 위치: `scripts/twenty_first.py:50-54`
- 재현: 서버가 응답 전에 `\n`을 출력하면 "non-JSON protocol output"으로 실패합니다.
- 권장: `raw.strip()`이 비어 있으면 `continue`합니다.

### L8. [Low] 정리(cleanup)가 프로세스 그룹을 종료하지 않음

- 위치: `scripts/twenty_first.py:21-22`(`start_new_session=True`), `:70-82`
- 재현: SIGTERM을 무시하고 손자 프로세스를 띄우는 가짜 launcher로 timeout을 유발했습니다. 부모 프로세스는 kill되지만 손자 `sleep 30`은 계속 살아 있습니다.
- 현재 실제 launcher는 `os.execve`로 node를 직접 exec하므로 영향은 낮습니다. 다른 머신의 `--launcher`가 subprocess 방식이면 고아 프로세스가 남을 수 있습니다.
- 권장: `os.killpg(self.process.pid, SIGTERM)` 후 `SIGKILL`을 보냅니다. 이미 새 세션을 만들었으므로 한 줄이면 됩니다. 또한 `close()`의 `stdin.close()`는 BrokenPipe로 예외가 날 수 있으므로 try로 감쌉니다.

### L9. [Low] 진단 정보가 지나치게 적음

- 위치: `scripts/browser-check.cjs:85`(`detail:e.name`), `:96`(top-level catch가 message를 버림)
- 영향: `Missing --config`, JSON parse 오류, 의존성 누락, origin 위반, `touchMin` 오류가 모두 같은 문구로 출력됩니다. blocked 원인이 `TimeoutError`/`Error`로만 남아서 원인 판별이 어렵습니다.
- 권장: 스크립트가 직접 throw한 메시지(credential 없는 고정 문구)는 출력합니다. Playwright 오류는 URL query를 제거한 message 첫 줄만 기록합니다.

### L10. [Low] 배포와 환경 호환

- `tests/browser-check.test.cjs:4`: `path.resolve('package.json')`로 cwd에 의존합니다. repo root가 아니면 `Cannot find module '@playwright/test'`로 실패합니다. user 설치본에는 Playwright가 없으므로 tests는 repo 전용입니다.
  - 권장: 배포 시 `tests/`를 제외하거나 "repo root에서 실행"을 명시합니다. 경로는 `__dirname` 기준으로 바꿉니다.
- `scripts/__pycache__/`, `tests/__pycache__/`가 untracked이고 `.gitignore`에 없습니다. 복사 배포나 `git add`에 섞여 들어갈 수 있으므로 배포 전에 제외해야 합니다.
- `browser-check.cjs:80`의 `waitUntil:'networkidle'`은 dev 서버나 polling 앱에서 20초 timeout으로 blocked가 될 수 있습니다. fail-closed이므로 false pass는 아닙니다. `readySelector`를 기본으로 권장합니다.
- axe 태그에 `wcag22aa`가 없습니다(`target-size` 등). 커스텀 touch 검사로 보완하고 있으므로 문서의 "WCAG2/2.1 AA" 표기는 정확합니다. 참고 사항입니다.

### L11. [Low] 문서 품질과 스코프 문구

- 숫자 앞 공백 누락 오타:
  - `verification.md:17`: "is16px", "target44px"
  - `verification.md:57`: "exits0 … ,1 for … ,2 for"
  - `verification.md:59`: "a0.5px"
  - `tools.md:9-10`: "returned403"
  - `tools.md:41`: "current21st"
  - `tools.md:63`: "skill4.4.0"
  - (범위 밖이지만 `docs/design/frontend-tooling.md:83-84`에도 같은 패턴이 있음)
  - `:57`은 exit code 명세이므로 반드시 고쳐야 합니다.
- `SKILL.md:29`의 "Substantial finishing" 행은 요청이 없어도 Impeccable polish/distill을 수행하는 것으로 읽힙니다. global CLAUDE.md는 "Use the official Impeccable skill for **requested** polish/distill"입니다. 이 의미는 기존 버전부터 있었지만, "requested or agreed in the task contract"로 좁히기를 권장합니다.
- `SKILL.md:12`의 "add a compact contract to the project's existing design/task notes"는 해당 노트가 없을 때의 동작이 불명확합니다. 새 파일 생성을 묻거나 사용자 보고로 대체하는 규칙을 명시하기를 권장합니다.

## 3. 목표별 판정

| 승인 목표 | 판정 |
|---|---|
| (1) DESIGN 근거로 적용 기준·범위 결정 | 충족. Scope/Authority/Reuse/Gaps/Acceptance contract가 있고 타 프로젝트 수치 이식을 금지함. L11의 노트 부재 시 동작은 보완 필요 |
| (2) gap→reference→adoption 연결, 불필요 검색 생략 | 충족. "existing answers require no new discovery", 결정별 라우팅 표, 기록 형식 |
| (3) 기존 인증 launcher 재사용 read-only 21st status/search | 구현은 충족. 키 파일을 열지 않고, stderr와 오류 원문을 숨기고, 재시도하지 않고, status/search만 수행하며, usage 오류 시 search를 호출하지 않음(테스트됨). `search` 인자는 현재 스키마와 일치하고 FREE여서 "retrieval allowance 미소비" 서술과 일관됨. **단, 이 변경분에서 실제 launcher 대상 실행 증거는 확인되지 않았습니다**(테스트는 가짜 서버만 사용). 배포 전 `twenty_first.py status` 1회 실행(무료 `get_usage`)으로 실연결을 확인하길 권장합니다. 이 리뷰에서는 외부 호출 금지로 실행하지 않았습니다 |
| (4) rendered 검증: contrast/nested/touch/overflow + 수동 검토 | 부분 충족. 텍스트 대비, nested-interactive, touch 후보, 페이지 overflow, CSS 기대값은 실제로 동작함. M1(비텍스트/상태 대비 누락), M2(테스트 공백), L1–L5 보완 필요 |
| (5) 증거 기반 완료 보고 | 충족. installed/read/searched/retrieved/adopted/executed/skipped/blocked 구분, "automated pass ≠ design complete", 미해결 항목이 있으면 incomplete |

## 4. 문제없음으로 확인한 항목

- 인증정보:
  - `twenty_first.py`는 credential 파일을 열지 않고 child stderr를 DEVNULL로 보냄
  - 오류 메시지는 고정 문구임(테스트의 `SECRET` 미노출 확인)
  - browser CLI는 baseURL의 userinfo를 거부하고, 모든 case를 동일 origin으로 강제하며(`//evil` 상대경로도 차단), cookie 없는 새 context를 사용하고 mutation flow를 실행하지 않음
- 과장된 실행 범위: status 문구(`automated-checks-passed`, `codeRetrieved:false`, `scope` 문자열)와 문서의 한계 서술이 실제 동작과 일치함. 확인된 과장은 M1(contrast) 한 건뿐
- Protocol:
  - initialize → initialized notification → tools/list(pagination 10회 제한) → `get_usage` 확인 → search 순서로 진행
  - 호출마다 timeout이 적용되고 8MB 읽기 상한이 있음
  - `isError`와 JSON-RPC error는 모두 중단되며 재시도 없음
- Exit code: CLI의 0/1/2가 문서 정의와 일치함(새 CLI 테스트가 0/1/blocked를 확인)
- 스코프: 제품 코드, 공식 Impeccable, 플러그인 구성의 변경은 없음(대상 경로 diff 기준)

## 5. 한계

- 외부 호출을 금지했으므로 실제 21st launcher와 계정으로는 동작을 확인하지 않았습니다. launcher는 exec 관련 줄만 확인했습니다.
- 실제 프로젝트 preview 대상 CLI 실행, 인증된 상태, 다크/라이트 앱 토글, Safari/Firefox는 검증하지 않았습니다.
- 리뷰 중 파일이 계속 수정되었습니다(0절). 이후 변경분은 리뷰 범위 밖입니다. Python 테스트 3개(usage error 포함)는 최종 스냅샷에서 재실행해 OK를 확인했습니다.
- 재현 스크립트: `<historical-scratch>/fr-probe.cjs`(repo root에서 `node <historical-scratch>/fr-probe.cjs`), `<historical-scratch>/fr-py-probe.py`
