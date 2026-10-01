# Frontend workflow v2 종합 리뷰와 보완

후속 상태(2026-10-01): 아래 Low 3건은 `2026-10-01.1`에서 보완하고 재현·회귀 테스트 및 설치 검증을 완료했다. [후속 개선 기록](frontend-v2-low-followup.md)을 따른다. 아래 두 모델의 리뷰는 원래 검토한 `2026-09-30.2` 버전의 기록이다.

대상: frontend-reference-workflow v2 전체, 공통 디자인 적용 지침, 검사기, 설치본. UI 패키지·RelayDock 제품의 출시 판정은 범위 밖이다.
초기 기준 커밋: 82456d93061e875ea554fa8567537a920cee3361. 두 초기 리뷰가 끝날 때까지 소스를 고정했다. [기준 해시·모델 설정](v2-dual-review-evidence/baseline.json).

## 실제 실행한 두 리뷰

| 리뷰어 | 실행 설정 | 초기 판정 |
|---|---|---|
| Opus 5.5 | claude/claude-opus-5-5, high; bf3ea4a4-b4e1-4a87-a5bc-bccd51d1911d | 조건부 준비됨; Medium 3, Low 8 |
| GPT Sol 6.1 | codex/gpt-6.1-sol, high; 9a158256-6392-4898-9457-64ac32e19967 | 검사기 승인 보류; Medium 3, Low 3 |

[Opus 원문](v2-dual-review-evidence/opus-initial.md) · [Sol 원문](v2-dual-review-evidence/sol-initial.md)

두 모델 모두 Critical/High는 없다고 판단했고, 승인된 디자인 권위·기존 승인 보존·설치본 일치를 확인했다. 각각 기존 Node 16개와 Python 5개 검사를 실행했지만, 그 밖의 독립 반례에서 거짓 성공 경로를 발견했다. 외부 계정·인증·21st API·제품 화면은 실행하지 않았다.

## 발견 사항 처리

| 근거 | 처리 |
|---|---|
| Opus M1 / Sol M1·L1: 키 오타, falsy rules, 잘못된 touchMin | config/rules/case/viewport/comparison/expectation/font probe의 허용 키와 타입 검증. 생략만 기본값 처리; 잘못된 설정은 탐색 전 차단 |
| Opus M2: 스크롤바를 숨겨 메뉴 이동 누락 | CLI의 hide-scrollbars 기본 인자 제거, 실제 scrollbarWidth·실행 모드 기록, 짧은/긴 화면 비교 회귀 검사 |
| Opus M3: CSS 폰트 이름만 맞으면 로딩 실패도 통과 | 선택형 fontsLoaded 웹폰트 샘플 검사. 선언만 검사하면 needs-review; 누락/404는 needs-work. 시스템 폰트·모든 글리프 실제 적용은 별도 검토 |
| Sol M2 / Opus L3: 조상 투명도와 화면 밖 랜드마크 | CSS expectation은 조상 투명도 확인. 비입력 투명 subtree는 touch 후보 제외하되 실제 pointer-active overlay 보존. 랜드마크는 viewport 교차 필요 |
| Sol M3·L2: 빈 MCP 결과·잘못된 목록·nonfinite timeout | 응답 envelope/목록 검증과 사용량 데이터 부재 차단, finite positive timeout. 정상적인 검색 결과 0건은 허용 |
| Opus L1·L2 | 최종 URL의 origin/path 기록 및 origin 이탈 차단. 다중 readySelector의 안전한 원인 메시지 |
| Opus L4 | 문서 언어 불일치, 조상 숨김, tolerance 경계값, 폰트/스크롤바/설정 경계 회귀 검사 |
| Opus L5 / Sol L3 | Impeccable은 요청 또는 합의된 마무리 범위에서 사용하도록 안내 문서 조건 통일 |
| Opus L6·L8 | 과거 기록에 기준 시점·후속 문서 연결. revision 2026-09-30.2 및 SKILL/읽은 reference 해시 기록 안내 |
| Opus L7 | 기본 참고 경로의 get_usage/search/get_component와 계정 상태 변경 도구 구분. 도구 노출을 변경 권한으로 취급하지 않음 |

터치 요소가 부모와 함께 투명해도 pointer 이벤트를 받을 수 있으면 검토 대상으로 남긴다. 이는 클릭을 가로채는 투명 영역을 숨기지 않기 위한 판단이다. 완전한 clip/occlusion 검사는 기존처럼 실제 화면·hit testing 범위로 남겼다. 별도 프레임워크·플러그인 전환, 제품 폭·토큰 변경은 하지 않았다.

## 실행 근거와 범위

- [브라우저 실패 재현](v2-dual-review-evidence/browser-red.log): 보완 전 22개 중 6개 실패. 기존 정상 사례 16개는 통과했다.
- [MCP 실패 재현](v2-dual-review-evidence/mcp-red.log): 빈 응답·목록·nonfinite 입력 반례를 확인했다. marker를 공유하던 테스트는 이후 각 입력마다 초기화해 독립성을 보완했다.
- [1차 수정 브라우저 검사](v2-dual-review-evidence/browser-tests.log), [1차 수정 MCP 검사](v2-dual-review-evidence/mcp-tests.log): Node 23개·Python 7개 통과. 아래 재리뷰 전 수정본의 기록이다.

## 재리뷰에서 추가로 발견한 경계 문제

[Opus 재리뷰](v2-dual-review-evidence/opus-rereview.md)와 [Sol 재리뷰](v2-dual-review-evidence/sol-rereview.md)는 기존 지적의 해결을 확인했다. 다만 테스트 통과와 별개로 다음 수정이 더 필요했다.

| 근거 | 최종 수정 |
|---|---|
| Opus N1 / Sol R1 | 네이티브 세로 스크롤바를 제외한 clientWidth로 페이지 넘침 판정. 긴 페이지의 +8px 및 100vw 사례 추가 |
| Sol R2 / Opus N3 | 준비·측정 중 main-frame origin 이탈을 기록하고 유지. 준비/감사/랜드마크 종료 때 실제 URL 재검증. 지연된 다른 origin 이동 차단 및 같은 origin 이동의 최종 URL 확인 |
| Sol R3 | 설정 반례마다 새 객체를 사용. 앞선 잘못된 키가 뒤 테스트를 가리지 않도록 수정 |
| Opus N2 | 폰트 검사는 정확한 굵기·스타일 일치를 보장하지 않는다고 명시. 근접 face·합성 굵기 가능성 기록 |

[최종 수정 전 실패 재현](v2-dual-review-evidence/final-red.log)에서 넘침/지연 이동 반례가 각각 실패했다. 수정 후 [Node 25/25](v2-dual-review-evidence/final-browser-tests.log)·[Python 7/7](v2-dual-review-evidence/final-mcp-tests.log)이 통과했다. [변이 검사](v2-dual-review-evidence/final-mutations.json)는 falsy rules 처리와 넘침 결함을 재삽입하면 각각 테스트가 실패함을 확인했다.

최종 수정본은 [파일 해시](v2-dual-review-evidence/final-fix-hashes.json)로 고정했다. [Opus 최종 확인](v2-dual-review-evidence/opus-final.md)과 [Sol 최종 확인](v2-dual-review-evidence/sol-final.md) 모두 **설치 준비됨**으로 판정했다. 각 리뷰어가 Node 25개·Python 7개와 독립 반례를 직접 실행했으며, 남은 필수 수정 사항은 없다. 리뷰 중 이 요약 문서는 진행 상태를 갱신했지만, 판정 대상인 스킬·검사기·테스트 11개 파일은 고정 해시를 유지했다.

Opus가 기록한 Low 3건은 후속 개선 항목으로 남긴다. 이 항목이 없거나 전부 해결됐다고 주장하지 않는다.

- 감사 도중 origin 이동과 페이지 평가 실패가 겹치면 결과는 blocked지만 진단 메시지와 finalURL이 이동 전 정보일 수 있다.
- origin 이탈 후 복귀를 막는 동작은 양 리뷰어의 독립 탐침으로 확인했지만, 해당 이벤트 감시·오류 우선순위·감사 후 검사 일부는 저장소 회귀 테스트의 변이가 검출하지 못한다.
- DOCTYPE 없는 quirks 문서에서 html 루트 폭을 직접 키운 경우 가로 넘침을 놓칠 수 있다. 페이지 넘침 측정은 표준 모드 문서를 기준으로 사용한다.

저장소 기본 [단위 테스트 37개](v2-dual-review-evidence/package-unit-tests.log)도 통과했다.

## 최종 설치 확인

revision `2026-09-30.2`를 `~/.agents/skills/frontend-reference-workflow`에 반영했다. 이전 파일은 별도 백업했고 캐시나 테스트 파일은 배포하지 않았다. [설치 기록](v2-dual-review-evidence/installation.json)에 백업 경로, 배포 7개 파일의 SHA-256, Claude 링크 확인을 남겼다. 설치 파일은 두 리뷰어가 확인한 원본과 일치한다.

실제 설치 경로의 스크립트로 [브라우저 25/25](v2-dual-review-evidence/installed-browser-tests.log)와 [MCP 7/7](v2-dual-review-evidence/installed-mcp-tests.log)을 다시 실행해 통과했다. 검토 후 스킬·검사기 코드는 추가 수정하지 않았다. 이번 종합 리뷰·필수 수정·재확인·설치 범위는 완료했다. 이미 스킬을 읽은 에이전트는 다음 큰 작업에서 최신 SKILL.md와 관련 reference를 다시 읽어야 한다.

## 검증 한계

이번 검사는 로컬 macOS 헤드리스 Chromium, 로컬 폰트 fixture, 가짜 MCP launcher를 사용했다. 실제 21st 계정·외부 폰트 CDN·다른 OS/브라우저·실제 제품 화면은 이번 리뷰에서 실행하지 않았다. 폰트 availability는 모든 글리프나 정확한 굵기 적용의 증거가 아니다. 네이티브 스크롤바 측정은 OS 설정의 영향을 받는다. 완전한 clip/occlusion, 실제 hit testing과 전환·키보드·상태별 대비는 프로젝트별 실제 화면 검증 범위다.

제품 코드·공통 토큰·패키지 동작 변경은 없으며, 이번 스킬 검증을 제품 시각 품질이나 공통 UI 패키지의 출시 승인으로 확장하지 않는다.
