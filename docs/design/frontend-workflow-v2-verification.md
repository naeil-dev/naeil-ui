# Frontend reference workflow 개선 검증

범위: 사용자가 승인한 다섯 가지 스킬 개선. RelayDock 제품·공통 UI 토큰·공식 Impeccable·플러그인 설정은 변경하지 않는다.

## 구현

| 승인 항목 | 반영 |
|---|---|
| 적용 기준 확정 | SKILL의 task contract: 프로젝트 권위/수치 출처, 화면·상태, 예외, 재사용 방식, 검증 기준 |
| 참고 목적 명확화 | 미정인 결정 → 실제 읽은 자료 → 채택/기각 → 변경 파일. 이미 정해진 부분의 검색 생략 |
| 도구 호출 재사용 | 네이티브 MCP 우선; 미노출 시 `twenty_first.py`가 기존 인증 launcher로 status/search 실행 |
| 실행 가능한 마무리 검사 | `browser-check.cjs` + project-specific rules. 대비·중첩 조작·넘침·CSS 기대값·터치 검토 결과 |
| 증거 기반 완료 보고 | 자동 검사/수동 검토/미검증/차단 구분, 필요한 검증 미완료 시 전체 완료 주장 금지 |

스킬은 프로젝트 수치를 하드코딩하지 않는다. CSS 복사 경로도 허용하되 출처·변형·동기화 책임을 기록하며, 무관한 패키지 마이그레이션을 강제하지 않는다.

## 검사 방식

- Node 테스트: 실제 Chromium과 axe를 사용한 결함/수정 예제, label 확장 영역의 수동 검토 구분, CLI 결과·종료 코드·HTTP 실패 기록.
- Python 테스트: 실제 subprocess stdio를 사용하는 로컬 MCP 서버로 초기화·도구 목록·사용량·검색·알림·timeout·오류 처리 확인. 실제 외부 서비스 인증 검사와 구분한다.
- 실제21st: 기존 로컬 launcher로 status 및 metadata search 확인. 키 파일을 직접 읽거나 출력하지 않으며 코드 retrieval·hosted generation은 실행하지 않는다.
- 별도 행동 평가: [다섯 시나리오 및 기존 동작](frontend-workflow-evidence/behavior-evaluation.md).
- 스킬 구조 validator, JS/Python 문법 및 diff 검사. UI/package 소스 변경이 없어 무관한 UI 전체 테스트를 반복하지 않는다.

## 실행 범위의 한계

브라우저 helper는 설정된 현재 상태만 검사한다. 실제 키보드, 열린 모달, 일반/감소 모션, 시각적 위계는 별도 검증이다. 작은 컨트롤의 label/의사요소 확장 영역 및 axe incomplete는 수동 검토 결과를 기록해야 한다. 테스트 예제 통과를 모든 제품 화면 합격으로 주장하지 않는다. 동일한 지침을 읽어도 모든 미래 에이전트의 준수를 보장할 수는 없다.

## 독립 리뷰와 보완

리뷰어: 사용자가 지정한 Opus 5.5 (`claude/claude-opus-5-5`, high), 에이전트 `bf9df210-129f-4d43-be10-7ecb4ad4e7da`. 제품과 스킬 수정 권한 없이 코드 검사·로컬 fixture 실행을 요청했다.

[1차 리뷰](frontend-workflow-evidence/opus-review.md)의 Medium 2건에 대해:

- M1: 현재 상태의 텍스트 대비 자동 검사와, 컨트롤 경계·포커스·선택/상태 표시의 별도 대비 검증을 명확히 분리했다.
- M2: overflow-only 및 axe incomplete-only 예제를 추가했다. 해당 판정 조건을 임시 복사본에서 각각 제거했을 때 테스트가 실패하는 것을 확인했다. [mutation 결과](frontend-workflow-evidence/mutation-results.json).

Low 지적은 모바일 layout viewport와 불일치 검출, 설정 오타 차단, 터치 후보 개선, 요청 테마/viewport 기록, 안전한 오류 원인 구분, 서버 request와 response 분리, 빈 줄 처리, process group 정리, 다른 cwd의 테스트 실행, 캐시 제외, polling 대신 readySelector, 문서 명확화로 반영했다. 잘린 콘텐츠·비텍스트 대비·앱 자체 테마 토글은 자동 해결했다고 주장하지 않고 필요한 수동/프로젝트 검사 범위로 명시했다.

## 최종 검사 기록

- [브라우저 회귀 검사](frontend-workflow-evidence/browser-tests.log): 11/11 통과.
- [MCP 회귀 검사](frontend-workflow-evidence/mcp-tests.log): 5개 통과.
- [실제 MCP 연결·검색 요약](frontend-workflow-evidence/live-mcp-summary.json): 기존 launcher로 status와 metadata search 성공. 최종 수정 client로 status 재확인. API 키·오류 원문·불필요한 계정 정보는 기록하지 않았다.
- 스킬 validator 및 diff 검사 통과.
- [재리뷰 대상 파일 해시](frontend-workflow-evidence/reviewed-source-hashes.json).

## 재리뷰 후 최종 반영

[Opus 2차 리뷰](frontend-workflow-evidence/opus-rereview.md)에서 기존 M1/M2 및 Low 11건은 해결 또는 정확한 한계 명시로 확인됐다. 추가 지적 R1–R4도 반영했다.

- R1: 투명한 native overlay input을 터치 검사에 포함하고, 투명하면서 pointer-events:none인 form mirror를 제외한다. aria-hidden 단독으로 클릭 영역을 제외하지 않는다. 두 경우를 독립 테스트했다.
- R2: 모든 보고서에 최상위 status를 기록한다. 빈 results를 성공으로 해석하지 않도록 안내한다.
- R3: baseURL과 모든 case의 origin/URL 자격증명을 브라우저 실행 전에 검증한다. 두 번째 case가 잘못되면 첫 페이지에도 요청하지 않는 테스트를 추가했다.
- R4: CLI 모바일 에뮬레이션과 빈 CSS 조건의 회귀 테스트를 추가했다. 총 5종 mutation이 테스트 실패로 검출된다.

**리뷰 한계:** 이 마지막 변경에 대한 Opus 5.5의 3차 요청은 공급자의 세션 사용 한도로 실행되지 못했다. 따라서 “Opus가 최종 수정본까지 승인했다”고 주장하지 않는다. 앞선 두 차례 리뷰 및 실제 지적 반영과, 최종 수정에 대한 자체 회귀 검증을 구분한다. [한도 응답 기록](frontend-workflow-evidence/opus-final-review-status.md).

## 설치와 최종 검증

- `~/.agents/skills/frontend-reference-workflow`의 실제 사용 파일 6개를 갱신했다. Claude 스킬 symlink도 같은 설치본을 가리킨다.
- 기존 설치본은 외부 백업 디렉터리에 보존했다. tests/cache는 설치하지 않았다. [설치 manifest와 SHA-256](frontend-workflow-evidence/installation.json).
- 실제 설치 경로의 browser helper로 [11개 검사 통과](frontend-workflow-evidence/installed-browser-tests.log), MCP helper로 [5개 검사 통과](frontend-workflow-evidence/installed-mcp-tests.log).
- 저장소 원본과 설치된 모든 파일 해시 일치, 설치본 스킬 validator 통과.
- 플러그인 설치·운영 배포·RelayDock 제품 수정은 수행하지 않았다. 사용 방식은 기존 `$frontend-reference-workflow` 그대로다. 오래 실행 중인 세션이 이전 본문을 기억하고 있다면 스킬을 다시 읽거나 새 세션에서 호출한다.

