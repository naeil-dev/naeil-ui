# 공통 디자인 기준 적용 개선 검증

날짜: 2026-09-30. 사용자 승인: 추가 실행에서 확인한 교훈을 수정까지 반영해 개선.

## 범위와 적용 기준

기존 공통 DESIGN·소비 가이드·참고 워크플로와 브라우저 검사를 개선한다. 공통 색·폰트·수치 토큰·공개 컴포넌트 API·제품 기능은 이번 변경 대상이 아니다. 기존 worktree에서 작업하며, 새 플러그인·의존성·외부 계정은 필요하지 않다.

| 감사 결과 | 반영 파일·결정 |
|---|---|
| 공통 Header여도 페이지별 위치가 달라짐 | DESIGN.md, v2-migration.md: 앱 틀과 내부 콘텐츠 폭 분리; AGENTS.md에서 연결 |
| 근거 없이 넓게/좁게 추천이 번복됨 | references/layout.md: 실제 과업·정보량·가용 영역·희소/밀집 상태에 근거한 폭 선택 |
| 개별 검사만 통과하고 경로 간 문제 누락 | browser-check.cjs: 명시적 동일 조건 사례들의 x/y/width/height 비교 |
| 언어·긴 내용·데이터 변동 문제 | layout 계약의 사례 필드; locale/문서 언어 기록; 잘림·상태·실제 테마 별도 확인 |
| 레이아웃 리뷰 후 기존 결함이 사라진 것처럼 취급될 위험 | 기존 finding ID와 현재 disposition 유지; 기능·공통 준수·화면 구성 판정 분리 |
| 설치된 스킬과 실제 읽은 버전 구분 부족 | SKILL revision 기록·업데이트 후 다시 읽기; 검사기 revision/SHA-256 보고서 기록 |
| 검증 스크립트 보존 누락 | config·준비 스크립트·결과·최종 파일 리비전과 후속 재검사 보존 지침 |

RelayDock의 1600px는 공통 토큰으로 옮기지 않았다. 기존 640/1200px 등의 목적별 콘텐츠 폭과 제품이 결정하는 앱 틀을 구분한다. 기존 `auditPage` API와 비교 설정 없는 CLI 사용을 유지한다.

## 실행 증거

- [변경 전 회귀 재현](compliance-workflow-evidence/baseline-layout-tests.log): 두 페이지가 각각 통과하지만 메뉴가 352px 이동하는 경우, 기존 CLI가 종료 코드 0을 반환했다. 새로운 비교 기능에 대한 5개 검사는 변경 전 모두 실패했다.
- [브라우저 검사](compliance-workflow-evidence/browser-tests.log): 기존 접근성/터치/설정/차단 검사와 새로운 페이지 비교를 함께 실행했다. 각 검사 결과와 수는 로그를 따른다.
- [MCP 클라이언트 회귀](compliance-workflow-evidence/mcp-tests.log): 로컬 subprocess fixture 검사이며 실제 외부 인증·조회가 아니다. 클라이언트 소스는 변경하지 않았다.
- 스킬 quick_validate, JS 문법과 diff whitespace 검사를 수행했다. 문서 링크와 최종 설치 일치 결과는 아래에 기록한다.

검사기는 제품별 selector·사례·허용 오차를 입력받는다. 기본 화면 폭이나 허용 이동량을 공통 상수로 정하지 않는다. 잘못된 사례/조건은 탐색 전에 차단하며, 누락·중복된 표시 요소는 실패, 준비되지 않은 페이지는 차단으로 남긴다. 개별 페이지 합격이어도 비교 실패가 전체 상태와 종료 코드에 반영된다.

## 검증 한계

이 결과는 스킬과 검사기의 로컬 fixture 검증이다. RelayDock 현재 화면의 전체 준수나 기존 접근성 항목 해결을 뜻하지 않는다. 실제 제품·Storybook·packed consumption은 패키지 동작을 바꾸지 않아 다시 실행하지 않았다. 브라우저 locale은 앱 번역 설정을 대신하지 않으며, class/storage 테마·동적 이동·실기기·잘림·시각적 적정성은 프로젝트별 준비와 검토가 필요하다. 지침을 설치해도 이미 실행 중인 에이전트가 자동으로 다시 읽었다고 주장하지 않는다.


## 독립 검토와 수정

[변경 전 독립 행동 점검](compliance-workflow-evidence/behavior-baseline.md)에서는 기존 지침만으로도 앱 틀/내용 폭 구분과 기존 결함 추적을 제안했다. 따라서 일반적인 디자인 조언을 대량 추가하지 않고, 자동 비교 기능·조건부 계약 필드·읽은 버전/증거 기록의 빈 부분을 보완했다. 이 점검은 실행 계획 검토이며 제품 구현이나 통계적 행동 평가가 아니다.

[독립 코드 리뷰](compliance-workflow-evidence/code-review.md)는 실제 로컬 브라우저 검사를 실행하고 1건을 지적했다: `layoutComparisons: null`이 생략과 동일하게 취급되어 비교 없이 통과할 수 있었다. [추가 실패 재현](compliance-workflow-evidence/null-config-baseline.log) 후, 명시적 null을 설정 오류로 차단하고 탐색이 전혀 발생하지 않는 회귀 검사를 추가했다. 원래 리뷰의 파일 해시는 수정 전 기록으로 보존한다.

[해당 수정의 독립 재검토](compliance-workflow-evidence/code-rereview.md)에서 원래 재현과 회귀 검사를 다시 실행해 해결을 확인했다. 추가 지적은 없었다. 이번 리뷰는 이 세션의 별도 코드 리뷰 에이전트가 수행했으며, 이전 작업의 Opus 5.5 리뷰와 구분한다.

## 최종 판정과 설치

- 기능: 최종 소스로 브라우저 16/16, 로컬 MCP 클라이언트 5/5 통과. CLI 비교 실패가 전체 상태/종료 코드에 반영되며, null을 포함한 잘못된 비교 설정 11종이 탐색 전에 차단된다.
- 공통 기준: 기존 시각·수치/API 유지, 앱 틀/목적별 폭 구분 및 잔여 발견 추적 지침 반영. 특정 제품 폭을 보편 규칙으로 만들지 않았다.
- 화면 구성: 이번 변경은 제품 화면 수정이 아니므로 새 제품 시각 합격 판정은 하지 않는다. 향후 적용 작업에서 같은 조건의 페이지 비교와 별도 구성 검토를 수행하도록 연결했다.
- 저장소 원본과 `~/.agents/skills/frontend-reference-workflow`의 배포 대상 7개 파일이 바이트 단위로 일치한다. 기존 설치본은 백업했으며 관련 없는 전역 설정은 수정하지 않았다. Claude의 기존 심볼릭 링크도 같은 설치본을 가리킨다. [설치 경로·백업·SHA-256](compliance-workflow-evidence/installation.json).
- 실제 설치 경로를 대상으로 비교 CLI 검사 5/5가 통과했다. [설치본 검사](compliance-workflow-evidence/installed-layout-tests.log). 설치본 구조 validator도 통과했다. 테스트 파일과 Python 캐시는 배포하지 않았다.
- 원본·설치본 스킬 validator, JS 문법, diff whitespace, 변경 문서의 로컬 파일 링크 확인 통과. 코드 재검토 후 검사기/테스트 추가 수정은 없으며 설치 해시가 재검토 해시와 일치한다.

실행 중인 에이전트는 다음 substantial task 시작 시 최신 SKILL과 관련 reference를 다시 읽고 `2026-09-30` revision을 작업 근거에 남겨야 한다. 설치 일치와 이후 실제 사용은 별도다. npm 게시·사이트 배포·RelayDock 변경은 수행하지 않았다.
