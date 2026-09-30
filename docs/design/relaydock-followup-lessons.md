# RelayDock 추가 실행에서 얻은 공통 디자인 개선 근거

작성: 2026-09-29T23:22:19.232692+00:00
대상 에이전트: `332eb725-d3df-467d-ae9c-0353354851d9`
증거 보관: `/Users/jaymini/.superpowers/diagnosing-superpowers/01a0e044-1d0e-7910-b3a0-68c9eeb65a43/followup-20260930`
이 문서는 관찰과 개선 제안이다. 공통 기준·스킬·제품 코드의 변경은 포함하지 않는다.

후속: 사용자 승인으로 공통 기준·스킬·비교 검사 개선을 구현하고 설치했다. 이 문서의 감사 시점 기록은 유지하며, 반영 내용과 실행 경계는 [후속 검증 기록](common-design-compliance-verification.md)을 따른다.

## 1. 점검 목적

이전 두 실행 이후 추가 작업을 확인하여, 공통 디자인 기준 준수 개선에 활용할 교훈을 찾는다. 사용자 요청은 “먼저 확인”이며, Superpowers 버그 신고가 아니다. 범위는 원본 세션 6948–8295행의 메뉴 분리, 정렬 재수정, 앱 전체 틀 재검토 및 구현이다. [점검 범위](/Users/jaymini/.superpowers/diagnosing-superpowers/01a0e044-1d0e-7910-b3a0-68c9eeb65a43/followup-20260930/case.md:1)

## 2. 판정

**최종 공통 배치는 개선됐다. 그 전에 반복된 수정의 핵심은 앱 전체 배치 원칙과 검증 범위를 늦게 정한 데 있다.** 관리 화면 왼쪽 정렬→관리 화면 중앙 정렬→대시보드 전체 폭 기준 통일 제안→세 페이지 중앙 정렬로 방향이 바뀌었다. 전체 폭 통일은 제안에 그쳤으며 구현된 것으로 세지 않는다. 신뢰도 높음: 사용자 요청, 실제 변경, 저장된 화면과 리뷰를 대조했다. [왼쪽 정렬 문제 인정](/Users/jaymini/.codex-pooled/sessions/2026/09/27/rollout-2026-09-27T09-29-15-01a0e044-1d0e-7910-b3a0-68c9eeb65a43.jsonl:7380) · [관리 화면 중앙 정렬 완료](/Users/jaymini/.codex-pooled/sessions/2026/09/27/rollout-2026-09-27T09-29-15-01a0e044-1d0e-7910-b3a0-68c9eeb65a43.jsonl:7452) · [전체 폭 통일 제안](/Users/jaymini/.codex-pooled/sessions/2026/09/27/rollout-2026-09-27T09-29-15-01a0e044-1d0e-7910-b3a0-68c9eeb65a43.jsonl:7491) · [최종 완료](/Users/jaymini/.codex-pooled/sessions/2026/09/27/rollout-2026-09-27T09-29-15-01a0e044-1d0e-7910-b3a0-68c9eeb65a43.jsonl:8292)

초기의 대시보드 유동 폭 유지안도 사용자 승인을 받았다. 따라서 승인 위반보다 **추천의 근거 부족과 문제 범위를 좁게 잡은 점**이 핵심이다. 사용자가 마지막에 “내가 말해서 하는 게 아니라” 재점검을 요구한 뒤 실제 정보량과 여러 화면의 관계를 검토했다. [초기 추천](/Users/jaymini/.codex-pooled/sessions/2026/09/27/rollout-2026-09-27T09-29-15-01a0e044-1d0e-7910-b3a0-68c9eeb65a43.jsonl:7017) · [승인](/Users/jaymini/.codex-pooled/sessions/2026/09/27/rollout-2026-09-27T09-29-15-01a0e044-1d0e-7910-b3a0-68c9eeb65a43.jsonl:7024) · [독립 판단 요청](/Users/jaymini/.codex-pooled/sessions/2026/09/27/rollout-2026-09-27T09-29-15-01a0e044-1d0e-7910-b3a0-68c9eeb65a43.jsonl:7508) · [재점검 결론](/Users/jaymini/.codex-pooled/sessions/2026/09/27/rollout-2026-09-27T09-29-15-01a0e044-1d0e-7910-b3a0-68c9eeb65a43.jsonl:7740)

최종 기록은 한국어·영어 × 8개 폭 × 3개 경로의 48개 배치 측정과, Opus의 30개 브라우저 사례 재검토를 뒷받침한다. 마지막 열 너비 변경은 승인 후 관련 테스트와 별도 브라우저 검사로 확인했으며 전체 최종 트리가 다시 독립 리뷰됐다는 뜻은 아니다. [마지막 수정 경계](/Users/jaymini/.paseo/worktrees/0roff4x2/joyful-gopher/openspec/changes/archive/2026-09-30-unify-application-shell/verification.md:5) · [독립 검증 범위](/Users/jaymini/.paseo/worktrees/0roff4x2/joyful-gopher/openspec/changes/archive/2026-09-30-unify-application-shell/review-opus-final.md:5)

## 3. 환경과 출처

- 과거 증거: Codex CLI 0.156.0, source vscode, RelayDock worktree. [세션 메타데이터](/Users/jaymini/.codex-pooled/sessions/2026/09/27/rollout-2026-09-27T09-29-15-01a0e044-1d0e-7910-b3a0-68c9eeb65a43.jsonl:1)
- 현재 관찰: Paseo 조회상 idle, gpt-6-astra high. 모든 과거 호출의 모델을 이 값으로 단정하지 않는다. OS는 이전 감사에서 macOS arm64로 관찰했으며 이번에 다시 측정하지 않았다. [현재 조회 기록](/Users/jaymini/.superpowers/diagnosing-superpowers/01a0e044-1d0e-7910-b3a0-68c9eeb65a43/followup-20260930/case.md:4)
- 과거 증거: Sol 6.1 구현 작업자와 Claude Opus 5.5 리뷰어 생성 인자를 확인했다. [구현 모델](/Users/jaymini/.codex-pooled/sessions/2026/09/27/rollout-2026-09-27T09-29-15-01a0e044-1d0e-7910-b3a0-68c9eeb65a43.jsonl:7771) · [리뷰 모델](/Users/jaymini/.codex-pooled/sessions/2026/09/27/rollout-2026-09-27T09-29-15-01a0e044-1d0e-7910-b3a0-68c9eeb65a43.jsonl:7916)
- 현재 관찰: Superpowers 경로는 `/Users/jaymini/.codex-pooled/plugins/cache/openai-curated-remote/superpowers/6.4.2/skills`. Git SHA와 실행 당시 스킬 해시는 미확인이다. 이전 감사의 현재 파일 해시는 역사적 파일 내용 증거가 아니다.
- 과거 읽기: frontend-reference-workflow, Impeccable, brainstorming, TDD, debugging, review/verification, subagent-driven-development, Paseo 계열. [참고 워크플로 읽기](/Users/jaymini/.codex-pooled/sessions/2026/09/27/rollout-2026-09-27T09-29-15-01a0e044-1d0e-7910-b3a0-68c9eeb65a43.jsonl:7028) · [디자인·구현 지침 읽기](/Users/jaymini/.codex-pooled/sessions/2026/09/27/rollout-2026-09-27T09-29-15-01a0e044-1d0e-7910-b3a0-68c9eeb65a43.jsonl:7053) · [분업 지침 읽기](/Users/jaymini/.codex-pooled/sessions/2026/09/27/rollout-2026-09-27T09-29-15-01a0e044-1d0e-7910-b3a0-68c9eeb65a43.jsonl:7763)
- 지침 위치: `/Users/jaymini/.paseo/worktrees/0roff4x2/joyful-gopher/AGENTS.md`, `/Users/jaymini/.paseo/worktrees/28nele6j/spiky-kolibri/DESIGN.md`. 다른 MCP의 설치 여부 전체는 재조사하지 않았다.

## 4. 조사한 세션

| 역할 | 경로 | 측정 크기·범위 |
|---|---|---|
| 주 세션 | `/Users/jaymini/.codex-pooled/sessions/2026/09/27/rollout-2026-09-27T09-29-15-01a0e044-1d0e-7910-b3a0-68c9eeb65a43.jsonl` | 8,295줄, 43,553,235bytes. 이번 범위 6948–8295 |

Rejected candidates: none. 첫 해당 요청은 2026-09-29 11:39:48 UTC의 “와이드 모니터… 이런 디자인이 맞아?”였다. [범위 시작](/Users/jaymini/.codex-pooled/sessions/2026/09/27/rollout-2026-09-27T09-29-15-01a0e044-1d0e-7910-b3a0-68c9eeb65a43.jsonl:6948)

이번 범위의 네이티브 자식은 메타데이터로 부모 관계를 확인했다. 내부 전체 실행은 별도 감사하지 않았다.

| 역할 | 세션 |
|---|---|
| 화면 판단 | [layout_assessment](/Users/jaymini/.codex-pooled/sessions/2026/09/30/rollout-2026-09-30T06-22-36-01a0ef0c-4f75-7d83-b2f8-35919d0d496d.jsonl:1) |
| 브라우저 근거 | [layout_evidence](/Users/jaymini/.codex-pooled/sessions/2026/09/30/rollout-2026-09-30T06-23-07-01a0ef0c-c9ae-7543-9f09-10bf261c9544.jsonl:1) |
| 구현 | [shared_shell_sol61](/Users/jaymini/.codex-pooled/sessions/2026/09/30/rollout-2026-09-30T06-48-17-01a0ef23-d40d-7a62-a6ce-1168c6f64af9.jsonl:1) |

Opus 작업은 부모의 생성·완료 기록과 저장된 초기/최종 리뷰로 확인했다. 리뷰어 원본 세션 전체를 읽었다는 주장은 하지 않는다.

## 5. 사람 요청별 진행

시각은 UTC이며 한국·일본 현지 시각은 +9시간이다. 시스템 알림·스킬 주입은 사람 요청에서 제외했다.

| 원본 행 | 시각 | 요청 | 이후 주요 사건 |
|---|---|---|---|
| [6948](/Users/jaymini/.codex-pooled/sessions/2026/09/27/rollout-2026-09-27T09-29-15-01a0e044-1d0e-7910-b3a0-68c9eeb65a43.jsonl:6948) | 11:39:48 | 와이드 화면·키/연결 메뉴 판단 | 별도 메뉴와 관리 화면 폭 제한 추천; 문맥 압축 |
| [7024](/Users/jaymini/.codex-pooled/sessions/2026/09/27/rollout-2026-09-27T09-29-15-01a0e044-1d0e-7910-b3a0-68c9eeb65a43.jsonl:7024) | 11:46:22 | 추천대로 구현·Opus 리뷰 | 메뉴 분리, 왼쪽 정렬, 테스트·리뷰 |
| [7375](/Users/jaymini/.codex-pooled/sessions/2026/09/27/rollout-2026-09-27T09-29-15-01a0e044-1d0e-7910-b3a0-68c9eeb65a43.jsonl:7375) | 12:08:44 | 화면이 이상함 | 왼쪽 정렬 문제 인정 |
| [7387](/Users/jaymini/.codex-pooled/sessions/2026/09/27/rollout-2026-09-27T09-29-15-01a0e044-1d0e-7910-b3a0-68c9eeb65a43.jsonl:7387) | 12:10:15 | 개선 승인 | 관리 화면만 중앙 정렬 |
| [7461](/Users/jaymini/.codex-pooled/sessions/2026/09/27/rollout-2026-09-27T09-29-15-01a0e044-1d0e-7910-b3a0-68c9eeb65a43.jsonl:7461) | 13:29:52 | 대시보드와 폭 일관성 재질문 | 대시보드 전체 폭 기준 통일 제안 |
| [7475](/Users/jaymini/.codex-pooled/sessions/2026/09/27/rollout-2026-09-27T09-29-15-01a0e044-1d0e-7910-b3a0-68c9eeb65a43.jsonl:7475) | 21:18:16 | 페이지마다 메뉴 위치가 다름 | 같은 Header에 다른 배치 규칙 적용했다고 설명 |
| [7487](/Users/jaymini/.codex-pooled/sessions/2026/09/27/rollout-2026-09-27T09-29-15-01a0e044-1d0e-7910-b3a0-68c9eeb65a43.jsonl:7487) | 21:19:54 | 쉬운 설명 요청 | 전체 폭 통일 제안 반복 |
| [7498](/Users/jaymini/.codex-pooled/sessions/2026/09/27/rollout-2026-09-27T09-29-15-01a0e044-1d0e-7910-b3a0-68c9eeb65a43.jsonl:7498) | 21:21:30 | 대시보드가 너무 넓은 것 아닌가 | 중앙 정렬로 추천 번복 |
| [7508](/Users/jaymini/.codex-pooled/sessions/2026/09/27/rollout-2026-09-27T09-29-15-01a0e044-1d0e-7910-b3a0-68c9eeb65a43.jsonl:7508) | 21:22:03 | 동의만 하지 말고 재점검 | 화면·정보량 독립 평가, 2개 자식 작업 |
| [7752](/Users/jaymini/.codex-pooled/sessions/2026/09/27/rollout-2026-09-27T09-29-15-01a0e044-1d0e-7910-b3a0-68c9eeb65a43.jsonl:7752) | 21:47:23 | Sol 6.1 구현·Opus 5.5 리뷰 | 공통 틀 구현, 영어 표 수정, 재검토, 문맥 압축 |

## 6. 관찰 결과

### 6.1 스킬 사용

초기 메뉴 분리에서 참고 워크플로를 실제로 읽었다. 개선판 배포 이후 부모 기록에서 새 지침 재독이나 새 browser-check 실행은 확인하지 못했다. 따라서 이번 결과를 **개선판 스킬을 끝까지 시험한 결과**로 취급하지 않는다. 자식 내부 미조사라는 한계도 있다. 초기 실행에 나중에 배포한 규칙을 소급 적용하지 않는다. 신뢰도 높음(부모 기록 한정). [구판 읽기](/Users/jaymini/.codex-pooled/sessions/2026/09/27/rollout-2026-09-27T09-29-15-01a0e044-1d0e-7910-b3a0-68c9eeb65a43.jsonl:7028) · [배포 시점과 범위](/Users/jaymini/.superpowers/diagnosing-superpowers/01a0e044-1d0e-7910-b3a0-68c9eeb65a43/followup-20260930/case.md:10)

이번 범위는 기존 21st/Gallery 근거를 재사용했고 새 검색을 하지 않았다고 명시했다. Impeccable 관련 읽기·detector 실행은 확인된다. 새 자료·모션이 필요하지 않은 수정에서 모든 서비스를 재호출하지 않은 것은 누락으로 세지 않는다. [참고 재사용 설명](/Users/jaymini/.codex-pooled/sessions/2026/09/27/rollout-2026-09-27T09-29-15-01a0e044-1d0e-7910-b3a0-68c9eeb65a43.jsonl:7175) · [Impeccable 실행](/Users/jaymini/.codex-pooled/sessions/2026/09/27/rollout-2026-09-27T09-29-15-01a0e044-1d0e-7910-b3a0-68c9eeb65a43.jsonl:7554)

### 6.2 계획 준수

공통 Header를 사용하더라도 페이지별 CSS가 폭을 다르게 제한하면 메뉴가 이동했다. 컴포넌트 재사용이 화면 배치 일관성을 보장하지 않았다. 최종에는 하나의 중앙 틀과 동일한 여백을 적용했다. 신뢰도 높음. [원인 설명](/Users/jaymini/.codex-pooled/sessions/2026/09/27/rollout-2026-09-27T09-29-15-01a0e044-1d0e-7910-b3a0-68c9eeb65a43.jsonl:7480) · [현재 공통 틀](/Users/jaymini/.paseo/worktrees/0roff4x2/joyful-gopher/frontend/src/styles/dashboard-v2.css:14)

### 6.3 반복 작업

관리 화면만 고친 뒤 다른 화면과 관계를 재검토하면서 방향 수정이 반복됐다. 반면 최종 리뷰 후 영어 잘림·줄바꿈 수정과 재검토는 발견된 결함에 대응한 정당한 반복이다. 신뢰도 높음. [부분 수정 문제 인정](/Users/jaymini/.codex-pooled/sessions/2026/09/27/rollout-2026-09-27T09-29-15-01a0e044-1d0e-7910-b3a0-68c9eeb65a43.jsonl:7466) · [리뷰 결함](/Users/jaymini/.codex-pooled/sessions/2026/09/27/rollout-2026-09-27T09-29-15-01a0e044-1d0e-7910-b3a0-68c9eeb65a43.jsonl:8038) · [수정 후 재검증](/Users/jaymini/.codex-pooled/sessions/2026/09/27/rollout-2026-09-27T09-29-15-01a0e044-1d0e-7910-b3a0-68c9eeb65a43.jsonl:8168)

### 6.4 시행착오

Radix 포커스 복귀 전 동기 검사와 정렬 측정 기준 때문에 검사 실패가 있었고, 제품 수정 없이 대기·측정 가정을 고쳐 통과했다. 검증 스크립트의 오류와 제품 결함을 구별한 점은 유효했다. 신뢰도 높음. [포커스 대기](/Users/jaymini/.paseo/worktrees/0roff4x2/joyful-gopher/openspec/changes/archive/2026-09-29-separate-management-navigation/verification.md:18) · [폭 측정 수정](/Users/jaymini/.codex-pooled/sessions/2026/09/27/rollout-2026-09-27T09-29-15-01a0e044-1d0e-7910-b3a0-68c9eeb65a43.jsonl:7428)

별도로 존재하지 않는 `cell_id: none`에 wait를 네 번 호출한 실패가 있다. 독립 작업은 진행됐지만 이 호출 자체는 유효하지 않았다. [첫 잘못된 wait](/Users/jaymini/.codex-pooled/sessions/2026/09/27/rollout-2026-09-27T09-29-15-01a0e044-1d0e-7910-b3a0-68c9eeb65a43.jsonl:7591) · [마지막 실패](/Users/jaymini/.codex-pooled/sessions/2026/09/27/rollout-2026-09-27T09-29-15-01a0e044-1d0e-7910-b3a0-68c9eeb65a43.jsonl:7693)

### 6.5 품질 증거

초기 346개 테스트와 리뷰 통과는 전체 화면의 균형을 보장하지 못했다. 브라우저 확인도 관리 두 경로 중심이었다. 최종에는 같은 언어·폭에서 세 경로의 메뉴 좌표를 비교했다. 신뢰도 높음. [초기 경로 범위](/Users/jaymini/.paseo/worktrees/0roff4x2/joyful-gopher/openspec/changes/archive/2026-09-29-separate-management-navigation/evidence/browser.mjs:6) · [완료 판단 반성](/Users/jaymini/.codex-pooled/sessions/2026/09/27/rollout-2026-09-27T09-29-15-01a0e044-1d0e-7910-b3a0-68c9eeb65a43.jsonl:7380) · [최종 페이지 간 비교](/Users/jaymini/.paseo/worktrees/0roff4x2/joyful-gopher/openspec/changes/archive/2026-09-30-unify-application-shell/review-opus-final.md:20)

저장된 3440px 대시보드 전후 이미지도 직접 확인했다. 이전에는 적은 카드와 길게 늘어난 차트가 넓은 화면에 퍼졌고, 이후에는 중앙 작업 영역에 카드와 보고서가 모였다. 최종 구조는 실제 콘텐츠 폭으로 열 수를 결정한다. [콘텐츠 폭 기반 요구사항](/Users/jaymini/.paseo/worktrees/0roff4x2/joyful-gopher/openspec/changes/archive/2026-09-30-unify-application-shell/verification.md:28) · [이전 화면](/Users/jaymini/.paseo/worktrees/0roff4x2/joyful-gopher/openspec/changes/archive/2026-09-30-unify-application-shell/evidence/b-dashboard-3440.png) · [이후 화면](/Users/jaymini/.paseo/worktrees/0roff4x2/joyful-gopher/openspec/changes/archive/2026-09-30-unify-application-shell/evidence/after-ko-dashboard-3440.png)

최종 검증 문서가 연결하는 `evidence/rereview.mjs`는 이번 파일 확인에서 없었다. JSON과 로그는 남아 있으나 재현 스크립트 보존에 공백이 있다. 물리 기기 Safari·라이트 테마·확대·포괄적 접근성은 수행하지 않았다고 명시되어 있다. [검증 링크](/Users/jaymini/.paseo/worktrees/0roff4x2/joyful-gopher/openspec/changes/archive/2026-09-30-unify-application-shell/verification.md:12) · [미검증 범위](/Users/jaymini/.paseo/worktrees/0roff4x2/joyful-gopher/openspec/changes/archive/2026-09-30-unify-application-shell/verification.md:56)

이전 접근성 항목을 모두 해결했다고 판단할 수 없다. 현재도 계정 카드의 `role=button` 내부에 조작 버튼이 있고, 잔량 영역의 `opacity-55`가 남아 있다. 이번에는 실행 중 대비값을 다시 측정하지 않았으므로 과거 3.13:1을 현재 값으로 단정하지 않는다. 반면 관리 행 메뉴는 40/44px 크기와 셀 내부 경계를 검증했다. [카드 구조](/Users/jaymini/.paseo/worktrees/0roff4x2/joyful-gopher/frontend/src/sections/accounts.tsx:168) · [불투명도](/Users/jaymini/.paseo/worktrees/0roff4x2/joyful-gopher/frontend/src/components/ui/quota-bar.tsx:62) · [메뉴 개선](/Users/jaymini/.paseo/worktrees/0roff4x2/joyful-gopher/openspec/changes/archive/2026-09-30-unify-application-shell/verification.md:76)

### 6.6 요청 충돌

동시에 충족할 수 없는 사람 지시나 승인 범위를 어긴 구현은 발견하지 못했다. 사용자는 추천을 승인한 뒤 결과에 문제를 제기했고, 최종에는 근거를 갖춘 재점검을 요청했다. 반복 추천 오류를 사용자 요구 충돌로 돌리면 안 된다. 신뢰도 높음. [초기 승인](/Users/jaymini/.codex-pooled/sessions/2026/09/27/rollout-2026-09-27T09-29-15-01a0e044-1d0e-7910-b3a0-68c9eeb65a43.jsonl:7024) · [재점검 요구](/Users/jaymini/.codex-pooled/sessions/2026/09/27/rollout-2026-09-27T09-29-15-01a0e044-1d0e-7910-b3a0-68c9eeb65a43.jsonl:7508) · [최종 승인](/Users/jaymini/.codex-pooled/sessions/2026/09/27/rollout-2026-09-27T09-29-15-01a0e044-1d0e-7910-b3a0-68c9eeb65a43.jsonl:7752)

### 6.7 시간과 비용

최종 승인부터 완료까지 약 27분 48초였다. 전체 범위의 약 10시간 35분에는 완료 후 다음 사용자 요청까지의 긴 간격이 들어 있으므로 연속 작업 시간으로 계산하지 않는다. 토큰 과금·자식 작업 전체 비용은 산정하지 않았다. [시작](/Users/jaymini/.codex-pooled/sessions/2026/09/27/rollout-2026-09-27T09-29-15-01a0e044-1d0e-7910-b3a0-68c9eeb65a43.jsonl:7752) · [완료 이벤트](/Users/jaymini/.codex-pooled/sessions/2026/09/27/rollout-2026-09-27T09-29-15-01a0e044-1d0e-7910-b3a0-68c9eeb65a43.jsonl:8295)

부모 응답별 증분 usage 165개 합계는 23,178,659토큰이며, 입력 23,120,488 중 21,948,416은 캐시 입력이다. 출력은 58,171이다. 반복 입력을 포함한 수치이며 신규 생성량·전체 팀 사용량·청구액이 아니다. 누적 카운터 차이와 첫 응답을 대조했다. [마지막 usage 기록](/Users/jaymini/.codex-pooled/sessions/2026/09/27/rollout-2026-09-27T09-29-15-01a0e044-1d0e-7910-b3a0-68c9eeb65a43.jsonl:8294)

| 요청 행 | 부모 usage 합계 | 요청부터 완료 |
|---|---:|---|
| 7752 | 8,882,136 | 27분 48초 |
| 7508 | 5,764,066 | 11분 30초 |
| 7024 | 4,693,798 | 17분 39초 |
| 6948 | 1,686,340 | 3분 32초 |
| 7387 | 1,374,472 | 3분 36초 |

문맥 압축은 6993·7991행에서 확인했다. 다음 응답 입력 감소를 압축 자체의 비용 절감량으로 해석하지 않는다. [첫 압축](/Users/jaymini/.codex-pooled/sessions/2026/09/27/rollout-2026-09-27T09-29-15-01a0e044-1d0e-7910-b3a0-68c9eeb65a43.jsonl:6993) · [두 번째 압축](/Users/jaymini/.codex-pooled/sessions/2026/09/27/rollout-2026-09-27T09-29-15-01a0e044-1d0e-7910-b3a0-68c9eeb65a43.jsonl:7991)

### 6.8 기타 도구와 모델

요청한 구현·리뷰 모델은 실제로 사용됐다. 다만 모델 이름 자체가 디자인 검증 범위를 대신하지는 않는다. 첫 Opus 리뷰 뒤에도 정렬 재작업이 있었고, 마지막 리뷰에서는 영어 표와 실제 화면을 확인해 결함을 잡았다. [Sol 생성](/Users/jaymini/.codex-pooled/sessions/2026/09/27/rollout-2026-09-27T09-29-15-01a0e044-1d0e-7910-b3a0-68c9eeb65a43.jsonl:7771) · [Opus 생성](/Users/jaymini/.codex-pooled/sessions/2026/09/27/rollout-2026-09-27T09-29-15-01a0e044-1d0e-7910-b3a0-68c9eeb65a43.jsonl:7916) · [초기 결함](/Users/jaymini/.paseo/worktrees/0roff4x2/joyful-gopher/openspec/changes/archive/2026-09-30-unify-application-shell/review-opus-initial.md:17) · [재검토 승인](/Users/jaymini/.paseo/worktrees/0roff4x2/joyful-gopher/openspec/changes/archive/2026-09-30-unify-application-shell/review-opus-final.md:3)

## 7. Superpowers 관여

문제 원인으로서 관여: **not indicated**. 스킬 사용은 확인되지만 특정 스킬 결함 때문에 배치 판단이 번복됐다는 증거는 없다. 사용 사실과 원인 판단을 구분한다. [스킬 읽기](/Users/jaymini/.codex-pooled/sessions/2026/09/27/rollout-2026-09-27T09-29-15-01a0e044-1d0e-7910-b3a0-68c9eeb65a43.jsonl:7053) · [분업 지침 읽기](/Users/jaymini/.codex-pooled/sessions/2026/09/27/rollout-2026-09-27T09-29-15-01a0e044-1d0e-7910-b3a0-68c9eeb65a43.jsonl:7763)

## 8. 조사 한계

- 이전 5150–6947행은 [기존 감사](relaydock-workflow-audit.md)로 연결하며 재감사하지 않았다. 원본 범위 밖의 이후 작업은 포함하지 않는다.
- 자식 내부 전체 세션은 읽지 않았다. 개선판 스킬 미사용을 모든 작업자에게 단정하지 않는다.
- 대상은 조회 당시 idle이었다. 실행 중 제품을 새로 테스트하지 않고 저장된 코드·화면·측정·리뷰를 비교했다.
- 제품 코드, 대상 에이전트 지시, 공통 디자인 규칙, 설치된 스킬은 변경하지 않았다. 이 보고서만 추가했다.
- 라이브 대비·포커스·터치·실기기 검증은 후속 구현 시 필요하다. 이는 사용자가 직접 검증해야 한다는 뜻이 아니다.

## 9. 이번 공통 디자인 개선에 반영할 제안

사용자가 요청한 학습 결과이며, 아직 승인된 공통 규칙을 변경한 것은 아니다.

| 관찰한 문제 | 개선에 반영할 내용 | 확인할 결과 |
|---|---|---|
| 같은 Header인데 페이지마다 위치가 바뀜 | 앱 전체 틀과 내부 콘텐츠 폭을 구분하고, 페이지 간 공통 메뉴·여백·제목 기준을 명시 | 같은 조건에서 경로를 바꿔도 메뉴 위치 유지 |
| ‘대시보드는 넓게’라는 가정으로 추천이 번복됨 | 정보량·주요 작업·읽는 거리를 먼저 확인하고 폭 선택 이유를 기록 | 일부 화면만 보지 않고 주요 화면을 나란히 비교 |
| 모니터는 넓지만 실제 본문은 제한됨 | 내부 열 수는 가용 콘텐츠 폭에 맞추는 구성 예시 제공 | 넓은 모니터에서도 과도한 열 수·빈 트랙 방지 |
| 한국어 정상인데 영어가 잘림 | 지원 언어·긴 이름·적은/많은 데이터·실패 상태를 검증 입력에 포함 | 문서 넘침뿐 아니라 잘림·줄바꿈·조작 영역 확인 |
| 테스트·리뷰 통과 뒤 시각적 불만 | 기능 검사, 공통 기준 준수, 화면 구성 판단을 별도 판정 | 코드 리뷰와 실제 페이지 간 화면 리뷰의 근거를 구분 |
| 구판을 읽은 장기 세션의 이후 실행 | 개선판 적용 검증 시 읽은 버전·계약·실제 검사 근거 확인 | 설치 완료를 실제 사용 완료로 보고하지 않음 |
| 배치 개선 뒤에도 이전 접근성 항목이 남음 | 대비·중첩 조작·44px 터치·복사된 토큰 동기화를 잔여 목록으로 유지 | 항목마다 현재 측정과 해결 여부 기록 |

**1600px를 모든 제품의 기본값으로 만들지는 않는다.** RelayDock의 최종 폭은 제품 판단이다. 공통 DESIGN은 이미 콘텐츠 목적별 폭을 구분하고, 비교용 화면을 보편 앱 틀로 간주하지 말라고 명시한다. 공통 개선은 그 구분을 실제 적용 지침·예시·검증에 연결하는 일이다. [기존 디자인 권한](/Users/jaymini/.paseo/worktrees/28nele6j/spiky-kolibri/DESIGN.md:137) · [소비자 폭 지침](/Users/jaymini/.paseo/worktrees/28nele6j/spiky-kolibri/docs/design/v2-migration.md:39)

이전 감사도 유동 대시보드가 승인된 구현이라는 사실을 확인하면서, 앱 전체 배치 적합성은 별도 문제로 남겼다. 이번에는 토큰 준수에서 멈추지 않고 페이지 간 일관성을 개선 범위에 포함해야 한다. [이전 계획 준수 평가](relaydock-workflow-audit.md#62-계획-준수)
