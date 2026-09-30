# frontend-reference-workflow v2 종합 독립 리뷰 (Opus 5.5)

- 리뷰 날짜: 2026-09-30
- 리뷰어: Claude Opus 5.5 (`claude-opus-5-5`), 단독 수행. 서브에이전트 없음. 다른 리뷰어의 결과물은 읽지 않았다.
- 대상: `/Users/jaymini/.paseo/worktrees/28nele6j/spiky-kolibri`, HEAD `82456d93061e875ea554fa8567537a920cee3361`, 작업 트리 깨끗함(리뷰 전후 `git status` 빈 결과)
- 모드: 읽기 전용. 저장소·설치본 수정 없음. 스크래치 파일은 `/tmp/fw-opus-probe/`에만 작성했다. 실제 21st/인증 파일/외부 API/설치/git 변경은 사용하지 않았다.

## 1. 소스 식별 (SHA-256)

| 파일 | SHA-256 | 설치본 |
|---|---|---|
| SKILL.md | `44c3d5f595037f2eda646f5d823a628ec139d12a16434c4e8ad8b48e848f8259` | 일치 |
| agents/openai.yaml | `7d5c0506f2f4efee8fa1c1fd41629cc325803cb6c87b76216282a27db9531765` | 일치 |
| references/layout.md | `906aaa7dd587b6c2c241ef1ff2d87dbba03e8728f24e3aa658e419755e8632b4` | 일치 |
| references/tools.md | `997732e0da02286f958ff37b725b85c5a0509fbc2c3025af3a51e14de6c81b6f` | 일치 |
| references/verification.md | `606bf277c4741a17ee81144a7e271a36c64550bb7f8b8dd3202e4723ff8785a6` | 일치 |
| scripts/browser-check.cjs | `df95d249b2446116486a121de931ab19d027d3afcc58d4842a2189f884ed3f0b` | 일치 |
| scripts/twenty_first.py | `8e2e6743caee97f20f3fa1b755a45783b932f89894c99c37a9543a6887bb5dd9` | 일치 |
| tests/browser-check.test.cjs | `66a401b07046741fcdaf2361736f54865509d5978fc854a24dcb27dc04252022` | (배포 안 함) |
| tests/layout-comparison.test.cjs | `dd83d8c7ea1c374b831bbd8680c1e423a2cf9f5fb0013233c22c6a7dd6634509` | (배포 안 함) |

- `diff -r`로 확인: 저장소와 `~/.agents/skills/frontend-reference-workflow`의 차이는 `.gitignore`와 `tests/`뿐이며, 둘 다 의도적으로 배포하지 않는다. `~/.claude/skills/frontend-reference-workflow`는 `~/.agents/skills/frontend-reference-workflow`를 가리키는 심볼릭 링크다.
- `compliance-workflow-evidence/installation.json`에 기록된 7개 해시와 `code-rereview.md`의 browser-check/layout-test 해시가 현재 파일과 일치한다. 즉 "재리뷰 이후 추가 수정 없음" 주장은 사실이다.

## 2. 직접 실행한 검사

| 명령 | 결과 |
|---|---|
| `node --test skills/frontend-reference-workflow/tests/*.test.cjs` (Node 22.23.2, 저장소의 기존 @playwright/test·@axe-core/playwright 사용) | 16/16 통과 |
| `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s skills/frontend-reference-workflow/tests -p 'test_*.py'` (Python 3.14.5) | 5/5 통과 |
| `/tmp`의 로컬 HTTP fixture(127.0.0.1:18911/18912)를 대상으로 설치된 `browser-check.cjs` CLI 탐침 8종 | 아래 결과 참조 |
| `/tmp` 복사본에서 browser-check 변이 6종 → 테스트 실행 | 3종은 살아남음(아래 L4) |
| 가짜 launcher를 사용한 설치본 `twenty_first.py` CLI 탐침 5종 | 모두 안전하게 실패, 종료 코드 2 |

fixture 서버는 종료했고 저장소 트리는 깨끗하다.

## 3. 결과 요약

Critical 0, High 0, Medium 3, Low 8. 선택적 개선 제안은 별도로 정리했다.

Medium 3건은 모두 **브라우저 도우미가 실제로는 확인하지 않은 항목에 `automated-checks-passed`와 종료 코드 0을 반환하는 경로**다. 이는 이번 변경이 막으려던 거짓 성공 문제와 같은 종류다. MCP 클라이언트, 설치본 일치, 권한·승인 규칙, 승인된 디자인 권위 보존에서는 결함을 찾지 못했다.

---

## 4. 결함

### M1 (Medium) — 설정 키 오타를 조용히 무시해, 의도한 검사 없이 통과한다

- 위치: `scripts/browser-check.cjs:356-358`, `:405-407`. 알려진 키만 읽고, 알 수 없는 최상위·`rules`·case 키는 검증하지 않는다.
- 재현:
  - P1: 최상위에 `layoutComparison`(s 빠짐)을 넣고, nav x가 각각 0과 -9999인 두 경로를 비교하도록 설정했다. 결과는 `status: automated-checks-passed`, **exit 0**, `layoutComparisons: []`였다.
  - P2: 터치 case에서 `rules.touchmin: 44`(소문자)를 쓰고 20×20px 버튼을 두었다. 결과는 `touchStatus: not-configured`, `touchReview: []`, **exit 0**였다.
  - case의 `"theme":"light"` 같은 오타도 무시되고 기본값 `dark`로 실행된다(보고서에는 dark로 기록된다).
- 영향: 이전 리뷰에서 고친 `layoutComparisons: null` 결함과 같은 부류다. null은 이제 차단되지만 키 이름 오타는 여전히 "비교 없이 성공"이 된다. `verification.md:75`의 "Without configured comparisons, no cross-route stability check is claimed" 문구는 보고서를 꼼꼼히 읽는 경우에만 지켜진다. 상태와 종료 코드는 통과를 알린다.
- 권장: 최상위(`authority, baseURL, rules, cases, layoutComparisons`), `rules`(`touchMin, expectations`), case, comparison 키를 허용 목록으로 검증하고, 알 수 없는 키는 `CheckError`(exit 2)로 처리한다. 변경은 몇 줄이다.

### M2 (Medium) — 헤드리스 Chromium이 스크롤바를 숨겨, 가장 흔한 "경로 간 메뉴 이동"을 놓친다

- 위치: `scripts/browser-check.cjs:408`(`chromium.launch()`의 기본 인자에 Playwright의 `--hide-scrollbars`가 포함된다), 비교 로직 `:245-264`. 문서화된 한계 `references/verification.md:77`, `references/layout.md:21`에는 이 내용이 없다.
- 재현(P4 + `/tmp/fw-opus-probe/sb.cjs`): `max-width:800px; margin:0 auto`로 가운데 정렬한 nav를 짧은 페이지와 5000px 긴 페이지에서 비교했다.
  - 기본 CLI: `deltas {x:0,width:0}`, `tolerance: 0`에서도 **통과, exit 0**. `innerWidth - clientWidth = 0`.
  - 같은 fixture를 `ignoreDefaultArgs:['--hide-scrollbars']`로 실행하면 스크롤바가 15px이고 nav x가 240 → 232.5로 **7.5px 이동**했다.
- 영향: 스킬이 핵심 증상으로 제시하는 "navigation moves between routes"(`layout.md:5`)의 대표 원인은, 짧은 설정 폼과 긴 목록 사이에서 스크롤바 유무가 달라지는 것이다. Windows/Linux나 macOS "항상 스크롤바 표시" 환경에서 실제로 흔하다. 도우미는 이 원인을 구조적으로 볼 수 없는데도 해당 불변식에 합격을 준다.
- 권장(둘 중 하나): (a) 비교 실행에서 `--hide-scrollbars`를 빼는 옵션을 제공하고, 보고서에 스크롤바 폭을 기록한다. (b) 최소한 verification.md/layout.md 한계에 "헤드리스 스크롤바 숨김: scrollbar-gutter·클래식 스크롤바 이동은 별도 확인 필요"를 명시하고, 짧은/긴 콘텐츠 비교 시 `scrollbar-gutter: stable` 여부를 확인하라고 안내한다.

### M3 (Medium) — 승인된 Pretendard 검증이 폰트 로딩 실패에도 통과한다

- 위치: `scripts/browser-check.cjs:56`(`document.fonts.ready`만 기다림), `:126-137`(computed style 문자열 비교). 안내 문구는 `SKILL.md:47`("Measure approved foundations"), `references/verification.md:51`.
- 재현(P3): `@font-face{font-family:Pretendard;src:url(/missing.woff2)}`(404)와 `body{font-family:Pretendard,sans-serif}`, 기대값 `fontFamily: "Pretendard, sans-serif"`로 실행했다. 결과는 **automated-checks-passed, exit 0**였다. 같은 페이지에서 `document.fonts.check('16px Pretendard')`는 `false`였다.
- 영향: DESIGN.md는 "a fallback rendering must not be presented as a successful candidate comparison"라고 명시한다. 에이전트가 승인된 글꼴 권위를 CSS 기대값으로 "측정"하면 대체 글꼴 렌더링이 합격으로 기록된다. 문서의 limits에도 이 한계가 없다.
- 권장: 보고서에 `document.fonts` 상태(family/status 목록 또는 `fonts.check` 결과)를 기록하고, 이를 검사할 수 있는 선택형 규칙(예: `rules.fontsLoaded: ["Pretendard"]`)을 둔다. 최소한 verification.md에 "computed font-family는 실제 로딩 증거가 아니다"를 추가한다.

### L1 (Low) — 교차 origin 리다이렉트를 따라가서 감사하고, 최종 URL을 기록하지 않는다

- 위치: `browser-check.cjs:396-397`(탐색 전 origin 검증만 함), `:431-436`.
- 재현(P7): 18911의 `/redir`이 302로 `http://127.0.0.1:18912/short`에 보냈다. 결과는 **통과, exit 0**이었고, 보고서에는 `path: "/redir"`만 남았다.
- 영향: R3에서 추가한 "preview origin" 보장이 리다이렉트로 우회된다. SSO나 로그인 리다이렉트 환경에서는 다른 페이지를 감사하고 기록이 어긋날 수 있다. 쿠키 없는 새 context라 보안 위험은 낮다.
- 권장: `page.url()`의 origin이 base와 다르면 blocked로 처리하고 최종 URL을 기록한다.

### L2 (Low) — `readySelector`가 여러 요소에 맞으면 원인을 알 수 없는 blocked가 된다

- 위치: `browser-check.cjs:438-440`(Playwright strict mode), `:46`(일반 메시지).
- 재현(P6): `readySelector: "section"`이 두 요소에 맞았다. 결과는 `blocked`이고 detail은 "Browser or audit execution failed…"였다.
- 안전한 방향(차단)이지만 진단 메시지만으로는 원인을 알 수 없다. 권장: `.first()`를 쓰지 말고 strict 위반을 따로 식별해 안전한 메시지를 반환한다.

### L3 (Low) — 가시성 판정이 조상의 투명도와 화면 밖 위치를 고려하지 않는다

- 터치 후보(`browser-check.cjs:59-74`, `:87-94`)는 요소 자신의 opacity만 본다. P8에서는 `opacity:0` 부모 안의 닫힌 menuitem이 `touchReview`에 들어갔다(거짓 양성, 검토 부담).
- 랜드마크(`:245-260`)는 `left:-9999px`의 nav를 visible로 보고 좌표 -9999를 측정한다(P5). 두 경로가 모두 숨겨진 nav를 가지면 비교가 무의미하게 통과한다.
- 거짓 성공 가능성은 제한적이다. 권장: 랜드마크 rect가 viewport와 겹치는지 확인하고, 터치 후보에도 조상 opacity를 확인한다(투명 native overlay 예외는 유지).

### L4 (Low) — 새 비교 로직의 일부 분기가 테스트되지 않는다(변이 생존)

`/tmp` 복사본에서 변이 후 16개 테스트를 실행한 결과:

| 변이 | 결과 |
|---|---|
| 문서 언어 불일치 차단 제거(`:279`) | **생존** |
| 랜드마크 조상 가시성 루프 제거(`:250`) | **생존** |
| 허용 오차 +5(`:306`) | **생존**(경계값 테스트 없음. 352px 이동만 시험) |
| 비교 결과를 전체 상태에서 제외(`:473`) | 검출(2 fail) |
| 동일 조건 검증 제거(`:238`) | 검출 |
| 정확히 1개 → 1개 이상(`:261`) | 검출 |

문서(`verification.md:73`)가 보장하는 "differing document languages block a comparison"에 회귀 테스트가 없다. MCP 쪽도 `main()` CLI 경로, 페이지네이션 한도, 8MB 한도, `get_usage` 부재는 테스트되지 않는다(직접 탐침에서는 정상 동작을 확인했다).

### L5 (Low) — Impeccable 사용 조건이 문서마다 다르다

- `docs/design/frontend-tooling.md:13`: "큰 작업의 마무리에는 공식 Impeccable의 polish/distill을 사용한다"(기본값처럼 읽힘).
- `SKILL.md:33`: "Substantial finishing **requested or agreed in task scope**". 전역 `~/.claude/CLAUDE.md`: "Use the official Impeccable skill for **requested** polish/distill".
- 사람이 읽는 안내 문서만 따르면 요청하지 않은 polish 실행을 정당화할 수 있다. tooling 문서를 SKILL 조건에 맞추는 것을 권장한다.

### L6 (Low) — 이전 검증 기록이 폐기 표시 없이 현재형으로 남아 있다

- `docs/design/frontend-workflow-v2-verification.md:61,64`: "실제 사용 파일 6개를 갱신", "저장소 원본과 설치된 모든 파일 해시 일치". 현재 배포 파일은 7개이고, 이 문서가 연결한 `frontend-workflow-evidence/installation.json`의 browser-check 해시(`1fd25eb2…`)는 현재 파일(`df95d249…`)과 다르다.
- `frontend-tooling.md:89`("브라우저 11개")와 `:95`("브라우저 16개")가 같은 문서 안에 섞여 있다.
- 새 기록(`common-design-compliance-verification.md`)으로 가는 "superseded by" 연결이 이전 문서에 없다. 날짜 머리글이나 대체 링크를 한 줄 추가하는 것을 권장한다.

### L7 (Low) — 21st 기본 MCP 경로에서 허용되는 도구 범위가 명시되지 않았다

- 번들 클라이언트는 구조상 status/search만 한다. 반면 `tools.md:19,58`과 `SKILL.md:39,43`은 기본 MCP 도구에 대해 "generate/iterate"와 "hosted uploads"만 구분한다.
- 실제 노출 도구는 `live-mcp-summary.json` 기준 34개다. 이 세션에서도 `submit_component`, `delete_component`, `edit_profile`, `upload_profile_media`, `bookmark`, `record_inspiration_feedback` 등 계정 상태를 바꾸는 도구가 노출되어 있다(이름만 확인했고 호출하지 않았다).
- `frontend-tooling.md:52`의 "search, get_component, get_usage 등"은 이 범위를 과소 설명한다.
- 권장: 읽기 전용 허용 목록(`get_usage`, `search`, 필요 시 `get_component`)을 명시하고, 그 밖의 21st 도구는 상태 변경으로 보고 명시적 승인을 받도록 한다.

### L8 (Low) — SKILL 출처 식별 단위가 날짜뿐이다

- `SKILL.md:8`: "Workflow revision: **2026-09-30**". 에이전트에게 이 값을 작업 근거로 기록하게 한다. 같은 날 수정이 여러 번 있으면 구분할 수 없다. browser-check는 자체 SHA-256을 기록하는데 SKILL과 references에는 대응 수단이 없다.
- 권장: 짧은 해시나 저장소 commit을 기록하도록 안내한다. 예: `shasum -a 256 SKILL.md references/*.md`.

---

## 5. 선택적 개선 (결함 아님)

- CLI는 실행 끝에만 보고서를 쓴다(`:485-486`). 실행 도중 중단되면 이전 성공 보고서가 남는다. 시작 시 "running/blocked" 자리표시를 먼저 쓰면 fatal 경로와 일관된다.
- 랜드마크는 Playwright locator 엔진(shadow DOM 투과, `text=` 등 확장 문법 허용)을 쓰고, 기대값은 `querySelectorAll`(순수 CSS)을 쓴다. 문서에 "CSS selector"라고 적거나 한쪽으로 통일하는 것을 고려한다.
- `compliance-workflow-evidence/installation.json`의 백업 경로가 `/var/folders/.../T/`(OS 임시 디렉터리)라 되돌리기 근거가 오래 유지되지 않을 수 있다.
- 터치 후보 셀렉터에 `summary`가 없다.
- 플러그인이나 프레임워크로 이전할 필요는 없다고 판단한다. 현재의 단일 스크립트 + 기존 의존성 구성이 적절하다.

## 6. 평가 항목별 판단

1. **지침의 유용성·범위·승인**: 적절하다. 작은 수정은 제외하고, 이미 승인된 결정은 다시 묻지 않으며(`SKILL.md:24,43`), 새 방향만 제안 후 대기한다. DESIGN.md가 권위라는 점, 수치를 이식하지 않는다는 점(`SKILL.md:17`), RelayDock 1600px를 공통화하지 않는다는 점(DESIGN.md, v2-migration.md:71, layout.md:17)이 일관된다. 제품 장식(히어로, 3D, 커서)을 보편 규칙으로 만든 곳은 없다. 무채색, Pretendard, 목적별 폭, 절제된 모션의 우선순위가 tools.md:71과 frontend-tooling.md:48에 보존되어 있다. 예외는 L5다.
2. **출처 탐색과 실제 도구 사용**: 설치/구성/읽기/검색/채택/실행 구분이 SKILL.md:35,51과 tools.md:43,58,69,73에 명확하다. frontend-sources.md:35는 이번 작업에서 외부 참고를 재검색하지 않았다고 정직하게 기록한다. Threads와 Linear 분석이 "third-party reference, not authority"라는 점도 DESIGN.md에 유지된다. 약점은 L7(기본 MCP 도구 범위)이다.
3. **브라우저 감사**: 구조는 좋다. 탐색 전 검증, 동일 조건 강제, 누락·중복 랜드마크 실패, blocked 전파, 상태 우선순위, exit 0/1/2, fatal 시 보고서 덮어쓰기를 코드와 테스트 모두에서 확인했다. 대비의 한계(텍스트만, 현재 상태만)도 limits에 정확히 적혀 있다. 그러나 M1, M2, M3의 거짓 성공 경로가 있고, L1과 L3도 있다.
4. **stdio MCP 클라이언트**: 결함을 찾지 못했다. 요청과 응답을 분리하고, ping과 미지원 메서드에 응답하며, 빈 줄과 알림을 처리한다. 호출별 deadline(알림이 계속 쏟아져도 1.5초 내 종료), 8MB 제한, 비-JSON·오류 원문 억제(`SECRET` 문자열 미노출 확인), stderr DEVNULL, get_usage 실패 시 search 미호출, 도구 부재 시 대체 호출 없음, 프로세스 그룹 정리, 키 파일을 직접 읽지 않음을 모두 확인했다. `usage`/`search` 원문은 stdout에 출력된다(문서화된 동작).
5. **테스트·설치 동일성·증거 주장**: 테스트 16+5를 재현했다. 설치본 7개 파일이 바이트 단위로 일치하고 재리뷰 해시와도 일치하므로 `common-design-compliance-verification.md`의 주장은 사실이다. 테스트 공백은 L4, 오래된 기록 표시는 L6이다. 스킬은 fixture 검증이 제품 준수를 뜻하지 않는다고 스스로 제한하며(`common-design-compliance-verification.md:32`), 이는 적절하다.

## 7. 한계

- 실제 21st 계정, 인증, 검색은 실행하지 않았다(의도적 범위 제외). 따라서 "search는 retrieval 이용권을 소모하지 않는다"(`tools.md:58`)는 문서 주장은 독립적으로 검증하지 못했다.
- RelayDock 제품, Storybook, 패키지 컴포넌트는 범위 밖이라 검사하지 않았다.
- Windows 전송 및 정리 동작, 실기기 터치는 확인하지 않았다.
- M2의 7.5px 이동은 `--hide-scrollbars`를 제거한 헤드리스 실행으로 재현했다. 실제 사용자 OS 스크롤바 설정에 따라 정도가 다르다.
- `relaydock-followup-lessons.md`는 범위 문서가 아니어서 정독하지 않았다. 외부 세션 로그 링크의 내용도 확인하지 않았다.

## 8. 준비 상태 판정

**조건부 준비됨.** 지침, 권위 체계, 승인 규칙, MCP 클라이언트, 설치 동일성은 사용 가능한 수준이고 Critical/High 결함은 없다. 다만 레이아웃 불변식이나 승인된 foundation(Pretendard) 준수를 **브라우저 도우미의 자동 통과만으로 주장하기 전에** 다음이 필요하다.

- M1을 수정한다(알 수 없는 키 차단, 소규모).
- M2와 M3를 최소한 문서 한계로 명시한다. 가능하면 스크롤바 옵션과 폰트 로딩 기록까지 구현한다.

이 조치 전까지 기존 결과를 "경로 간 안정성 확인"이나 "Pretendard 적용 확인"의 증거로 인용할 때는, 설정 키와 폰트 로딩, 스크롤바 조건을 수동으로 확인해야 한다. L1~L8은 후속 작업으로 처리해도 된다.
