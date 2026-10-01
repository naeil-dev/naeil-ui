# frontend-reference-workflow 좁은 재리뷰 (Opus 5.5)

> Archived evidence: personal paths/session IDs anonymized; original hashes/results retain dated scope. External scratch artifacts are unavailable here and were not rerun.

- 일시: 2026-09-29 21:3x JST
- 범위: 1차 리뷰(`<historical-scratch>/frontend-workflow-opus-review.md`)의 Medium 2건 해결 여부와, 수정으로 새로 생긴 회귀
- 방식: 읽기 전용. 로컬 fixture와 `127.0.0.1` 임시 서버, `/tmp` 복사본 mutation만 사용. 외부 호출, 계정, 키 접근은 하지 않았고 원본은 수정하지 않음.

## 0. 스냅샷

`docs/design/frontend-workflow-evidence/reviewed-source-hashes.json`의 9개 파일 SHA-256이 현재 파일과 **모두 일치**합니다(.gitignore, SKILL.md, tools.md, verification.md, tests 2개, openai.yaml, scripts 2개). 이 보고서는 그 스냅샷 기준입니다.

## 1. 실행한 검증

| 항목 | 결과 |
|---|---|
| `node --test <abs>/tests/browser-check.test.cjs` (cwd `/tmp`) | 8/8 통과. 다른 cwd에서도 동작 확인 |
| `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover …` (cwd `/tmp`) | 5/5 OK |
| Mutation 직접 재현 (`<historical-scratch>/rr` 복사본, package.json과 node_modules는 symlink) | overflow 제거 → 검출. incomplete 제거 → 검출. viewportMismatch 제거 → 검출. role=tab 제거 → 검출 |
| 같은 방식으로 추가 mutation | **CLI `isMobile` 제거, `opacity` 규칙 제거, 빈 `css:{}` 검증 제거 → 모두 미검출** (R1, R4) |
| 1차 probe(`<historical-scratch>/fr-probe.cjs`) 재실행 | 아래 2절 표 참고 |
| 회귀 probe(`<historical-scratch>/fr-probe2.cjs`) | R1 확인 |
| Python probe(`<historical-scratch>/fr-py-probe.py`, `<historical-scratch>/fr-py-probe3.py`) | 빈 줄 → connected. timeout 시 손자 프로세스 정리 확인(`ps` stat 빈 값). 1차 probe의 "alive: True"는 내 `ps` 문자열 매칭의 오탐이었음 |
| CLI 오류 경로 (로컬 서버) | 잘못된 selector → case blocked(exit 1). origin 위반 → blocked 보고서(exit 2). baseURL 누락 → exit 2 (R3) |
| evidence 파일 비밀정보 검색 (`api key/token/secret/bearer/email`) | 검출 없음. `live-mcp-summary.json`에는 개수와 불리언만 있음 |

## 2. 1차 지적 해결 여부

| ID | 판정 | 근거 |
|---|---|---|
| M1 비텍스트/상태 대비 | **해결** | `SKILL.md:43`이 자동 텍스트 대비와 별도의 비텍스트/상태 대비를 구분함. `verification.md:65`에 Contrast 항목 추가. helper `limits` 2줄 추가. 흰 배경 위 `#f2f2f2` 테두리는 여전히 automated pass로 나오지만, 이제 문서화된 수동 범위임 |
| M2 status 경로 테스트 | **해결** | overflow 단독, incomplete 단독, missing, fine-pointer 독립 테스트가 추가됨. 해당 mutation을 직접 재현했을 때 각각 fail 1로 검출됨 |
| L1 모바일 viewport | 해결 | meta 없는 경우 → `viewportMismatch` → needs-work. `initial-scale`의 유무와 관계없이 넓은 레이아웃이면 mismatch(vw 908)로 needs-work가 됨. 문서(`verification.md:41`)가 overflow도 mismatch로 드러난다고 설명함 |
| L2 clip overflow | 해결 (문서화된 한계) | `overflow-x:clip`은 여전히 pass이지만 `limits`와 verification.md:59에 수동 범위로 명시됨 |
| L3 설정 검증 | 해결 | css 오타는 즉시 reject됨. 단 빈 `css:{}` 검증은 테스트되지 않음(R4) |
| L4 touch 후보 | 해결. **단 회귀 R1 발생** | `tabindex=-1` 요소와 sr-only 링크 제외, `role=tab` 포함 확인 |
| L5 테마 기록 | 해결 | 결과에 `colorScheme`, `touch`, `viewportConfig`가 기록됨. dark 기본값과 class/storage 토글의 한계가 문서화됨 |
| L6 server request id | 해결 | `method` 메시지를 분리하고 ping/-32601 응답(테스트 포함). 루프 상단의 deadline 검사로 ping flood도 제한됨 |
| L7 빈 줄 | 해결 | probe에서 connected |
| L8 process group | 해결 | `killpg` TERM→KILL. SIGTERM을 무시하는 부모와 손자 프로세스까지 정리됨. 자체 `setsid`로 새 세션을 만드는 자손은 여전히 남음(본질적 한계이며 치명적이지 않음) |
| L9 진단 | 해결 (R3 참고) | `safeError`로 원문이 노출되지 않음 |
| L10 배포/환경 | 해결 | 테스트가 `__dirname` 기준으로 동작. `.gitignore`에 `__pycache__/`와 `*.pyc` 적용 확인. `readySelector` 필수 + `domcontentloaded`. Windows 미지원 명시 |
| L11 문서 | 해결 | 숫자 앞 공백 오타 0건. 노트 부재 시 동작 명시(`SKILL.md:12`). Impeccable 행을 "requested or agreed"로 한정(`SKILL.md:29`) |
| 실제 launcher 실행 | 증거 확인 (재현은 안 함) | `live-mcp-summary.json`: 21:24 status/search 성공, 21:31 최종 client 해시 `8e2e67…`로 status 성공. search 경로(`twenty_first.py:127-132`)는 1차 리뷰 이후 변경되지 않았으므로 연결성 판단에는 문제없음. 외부 호출 금지로 리뷰어가 직접 재현하지는 않음 |

## 3. 수정으로 생긴 문제

### R1. [Medium] `opacity:0` 제외 규칙이 실제 hit target을 숨겨 touch false pass를 만듦 (L4 수정의 회귀)

- 위치: `scripts/browser-check.cjs:59` (`s.opacity !== "0"`)
- 재현 (`<historical-scratch>/fr-probe2.cjs`, `isMobile` + `touchMin:44`):
  - 16×16 커스텀 체크박스: 투명한 native `<input type=checkbox aria-label>`를 시각 span 위에 겹친 흔한 패턴 → `automated-checks-passed`, touchReview 0건. 수정 전에는 이 input이 review 대상이었음
  - `opacity:0`에서 fade-in 중인 20px 버튼도 동일하게 누락됨
- 영향:
  - 투명 native input은 사용자가 실제로 누르는 영역이므로 측정 대상에서 빠지면 안 됩니다.
  - 승인 목표 (4)의 touch 검사에서 새로 생긴 false pass입니다.
  - `opacity` 규칙을 제거하는 mutation도 8/8 통과해 테스트로 보호되지 않습니다.
- 권장 수정 (최소):
  - opacity 0은 `pointer-events:none`이거나 `[aria-hidden="true"]`(또는 그 하위)일 때만 제외합니다. Radix BubbleInput 같은 숨은 form mirror가 이 경우에 해당합니다.
  - sr-only는 기존 clip 규칙이 이미 처리합니다.
  - 테스트 2개를 추가합니다.
    - 투명 overlay input(16px) → touchReview에 포함
    - `aria-hidden` + `pointer-events:none` + `opacity:0` input → 제외

### R2. [Low] fatal 보고서의 `results: []`와 정상 보고서의 형태 차이

- 위치: `scripts/browser-check.cjs:303-309`(정상 보고서에는 최상위 `status` 없음), `:331-341`(blocked 보고서는 `status:'blocked'`, `results:[]`)
- 영향: exit code를 보지 않고 `results.every(r => r.status === 'automated-checks-passed')`로 판정하는 소비자는 빈 배열에서 **vacuous true**가 됩니다. 문서에는 "blocked record로 대체"라고만 되어 있습니다.
- 권장: 정상 보고서에도 최상위 `status`(모두 통과일 때만 `automated-checks-passed`, 그 외는 최악값)를 넣습니다. verification.md에 "최상위 status 또는 exit code로 판정"을 한 줄 추가합니다.

### R3. [Low] 설정 검증 순서

- 위치: `scripts/browser-check.cjs:245`, `:258-260`
- 재현:
  - 첫 case가 측정된 뒤 둘째 case의 origin 위반이 발견됩니다. 이미 측정한 결과가 버려지고 blocked 보고서가 됩니다(exit 2).
  - `baseURL` 누락 시 `new URL(undefined)` TypeError가 "Browser or audit execution failed; inspect local setup and selectors"로 표시됩니다. 설정 문제인데 원인을 오해하게 만듭니다.
- 두 경우 모두 fail-closed이므로 false pass는 아닙니다.
- 권장: `baseURL` 존재 여부와 모든 case의 origin을 case 검증 루프(`:218-244`)에서 브라우저 실행 전에 `CheckError`로 확인합니다.

### R4. [Low] 새 로직 일부가 테스트로 보호되지 않음

- 미검출 mutation:
  - CLI의 `isMobile: !!entry.touch` 제거: CLI 테스트 fixture에 meta viewport가 있어서 차이가 드러나지 않음
  - 빈 `css:{}` 검증 제거
  - opacity 규칙(R1)
- 권장:
  - CLI touch case에 meta가 없는 경로를 하나 추가해 exit 1과 `viewportMismatch`를 확인합니다.
  - `auditPage(page, {expectations:[{selector:'body', css:{}}]})`가 reject되는지 확인합니다.

## 4. 결론

- Medium 2건(M1, M2)과 Low 11건은 모두 해결되었거나, 한계로 정확히 문서화되었습니다.
- 인증정보 노출, 실행 범위 과장, 스코프 확대는 새로 발견되지 않았습니다.
- 배포 전에는 **R1(Medium, 한 줄 수정 + 테스트 2개) 수정을 권장**합니다. R2–R4는 Low이므로 함께 처리하거나 알려진 한계로 기록해도 됩니다.

## 5. 한계

- 실제 21st launcher 호출은 부모가 남긴 기록(`live-mcp-summary.json`)으로만 확인했습니다. 리뷰어는 외부 호출을 하지 않았습니다.
- 실제 제품 preview, 로그인된 상태, Firefox/WebKit, Windows는 검증하지 않았습니다.
- 재현 스크립트: `<historical-scratch>/fr-probe.cjs`, `<historical-scratch>/fr-probe2.cjs`(repo root에서 실행), `<historical-scratch>/fr-py-probe.py`, `<historical-scratch>/fr-py-probe3.py`
