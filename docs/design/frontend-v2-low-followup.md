# 검사기 v2 후속 개선 — 2026-10-01

기준 커밋 `2285f05`의 [이중 모델 리뷰](frontend-v2-dual-review.md)에서 남은 Low 3건을 사용자의 요청으로 보완했다. 공통 UI·제품 디자인을 바꾸는 작업이 아니다. 스킬과 검사기 revision은 `2026-10-01.1`이다.

| 이전 항목 | 변경과 검증 |
|---|---|
| 감사 도중 origin 이동의 일반 오류·이전 주소 | 실행 context 소멸 오류에서 main-frame commit을 최대 1초 기다려 진단을 갱신한다. 재감사는 하지 않고 blocked를 유지한다. 목적지를 query/fragment 없이 기록하며, commit이 늦으면 finalURLStatus를 last-observed로 구분한다. 폰트 준비 측정 중 이동을 일으키는 실제 CLI fixture로 재현·검증 |
| origin 감시·오류 우선순위 테스트 공백 | 다른 origin을 거쳐 돌아온 뒤 ready가 되는 fixture와 감사 도중 이동 fixture 추가. 이벤트 감시나 origin 오류 우선순위를 각각 제거하면 회귀 테스트가 실패 |
| quirks 문서의 넓어진 HTML 루트 넘침 누락 | CSSOM View의 문서 모드에 맞춰 BODY 또는 HTML에서 viewport 폭을 읽고, scrollingElement의 scrollWidth와 비교. 표준/quirks 양쪽의 넓은 루트 및 정상 화면을 검증하고 documentMode를 보고서에 기록 |

## 검증 근거

- [수정 전 재현](v2-followup-evidence/red.log): 진단·quirks 반례 2건 실패, 기존 origin 이탈 후 복귀 동작은 통과.
- [브라우저 검사](v2-followup-evidence/browser-tests.log): 28/28 통과.
- [결함 재삽입](v2-followup-evidence/mutations.json): origin 감시 제거, 오류 우선순위 제거, 이전 viewport 공식, 진단 회복 제거 4종 모두 검출.
- 감사 직후와 랜드마크 종료 후의 목적지 검사는 중복 방어다. 그중 한 줄만 제거한 변이가 생존하는 것을 기능 결함으로 간주하지 않는다. 결과를 성공으로 채택하기 전 origin 이탈을 차단하는 동작을 검증한다.

검토 대상 스킬·검사기·테스트는 [해시](v2-followup-evidence/reviewed-hashes.json)로 고정했다. 독립 리뷰 에이전트에 요청했으나 결과를 받지 못해 실행을 중단했다. 이번 변경의 독립 리뷰 완료·승인을 주장하지 않는다. 이전 Opus/Sol 리뷰는 당시 버전의 판정이며, 이번 변경까지 승인했다고 확장하지 않는다. 위 수정 및 검증은 구현 에이전트가 직접 실행했다.

추가 검증: [탐색 진단 5회 반복](v2-followup-evidence/navigation-repeat.json), [MCP 7개](v2-followup-evidence/mcp-tests.log), [기본 단위 테스트 37개](v2-followup-evidence/package-unit-tests.log) 모두 통과했다. skill-creator의 quick_validate도 통과했다.

## 설치 결과

`2026-10-01.1`을 사용자 공통 스킬에 반영했다. [설치 기록](v2-followup-evidence/installation.json)에 이전 버전 백업과 배포 7개 파일 해시·Claude 링크 확인을 남겼다. 설치 경로에서 [브라우저 28개](v2-followup-evidence/installed-browser-tests.log)와 [MCP 7개](v2-followup-evidence/installed-mcp-tests.log)를 재실행해 통과했다. 검사기 사용 시 최신 SKILL.md와 verification.md를 다시 읽는다.

## 범위

로컬 macOS Chromium·격리 HTTP fixture만 사용한다. 실제 외부 계정/API 호출, 폰트 CDN, 제품 화면, 다른 브라우저나 OS는 확인하지 않는다. 탐색 진단의 1초 대기는 결과를 통과시키기 위한 재시도가 아니며, 완료되지 않은 이동의 목적지를 확정했다고 표시하지 않는다.
