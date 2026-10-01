# 프론트엔드 참고 출처

## 2026-10-01 — 검사기 Low 3건 보완

이전 Opus 리뷰의 남은 진단·회귀 테스트·quirks 넘침 항목을 로컬 fixture로 재현해 수정했다. Chromium/axe·가짜 MCP launcher·기본 단위 테스트·설치 경로 검증을 실행했다. 외부 참고 검색이나 실제 계정/API 호출은 하지 않았다. 실제 변경과 검증 범위는 [후속 기록](frontend-v2-low-followup.md)에 남겼다.

## 2026-09-30 — v2 이중 모델 종합 리뷰와 검사기 보완

- 실제 실행: Opus 5.5와 GPT Sol 6.1의 독립 리뷰·재리뷰·마지막 수정 확인, 로컬 Chromium/axe·폰트 fixture·가짜 MCP launcher 검사. [최종 보고서와 원문](frontend-v2-dual-review.md)에 범위와 해시를 보존했다.
- 반영: 스킬 버전·읽은 파일 추적, 설정 검증, 실제 폰트 로딩과 스크롤바 측정, origin 이탈 판정, MCP 응답 검증, 테스트 격리 및 한계 명시. 승인된 시각 기준은 유지했다.
- 외부 참고 사이트 재검색, 실제 21st 계정/API 호출, 컴포넌트 retrieval, Impeccable polish/distill은 이번 리뷰에서 실행하지 않았다. 새 외부 코드·의존성·라이선스 채택은 없다.

과거 v2의 실제 채택 내역과 검증은 [v2 검증 기록](v2-verification.md)에 있다. 이 문서는 이후 작업의 출처와 실행 상태를 누적한다.

## 2026-09-29 — 참고 도구 작업 환경 구성

| 출처 | 확인·채택 내용 | 반영 위치 |
| --- | --- | --- |
| 사용자 제공 Threads 본문 / https://www.threads.com/share/BCMFGYoNDD/ | 사용 시점, 기존 시스템 우선, 외부 자료 순서, 설치·접근 실패·출처 기록 규칙 | frontend-reference-workflow, AGENTS.md, CLAUDE.md, 전역 Claude 참고 섹션 |
| https://styles.refero.design | DESIGN.md 기반 스타일 탐색 가능 확인; 새 스타일은 채택하지 않음 | 스킬 style 경로 |
| https://github.com/VoltAgent/awesome-design-md | 공식 README 확인; 기존 Linear 분석 채택 이력 보존 | 스킬 style 경로, 기존 DESIGN.md |
| https://component.gallery | 실제 컴포넌트·시스템 비교 사이트의 브라우저 접근 확인 | 스킬 component 경로 |
| https://kinetics.colorion.co | 실제 모션 예제 목록 확인; 현재 v2에 새 효과 채택 없음 | 스킬 motion 경로 |
| https://github.com/21st-dev/magic-mcp/blob/main/README.md 및 .mcp.json | 현재 HTTP endpoint, x-api-key 인증, 환경변수 연결, AI 이용권과 컴포넌트 접근의 구분 | tools.md, 인증 후 활성화한 Codex/Claude 연결 설정 |
| https://github.com/pbakaus/impeccable/tree/114ea1d3838fca73b253af45f873b9c4f5f213c8/.agents/skills/impeccable | 공식 스킬 원본 설치; engine-probe/context 실행. polish/distill은 미실행 | 사용자 공통 스킬 및 Claude 연결, tools.md |
| https://developers.openai.com/codex/skills/ | 사용자 .agents/skills 검색 및 심볼릭 링크 지원 | 사용자 공통 스킬 설치 방식 |
| https://developers.openai.com/codex/mcp/ | env_http_headers 및 enabled=false 지원 | 비밀값 없는 인증 대기 설정 |

Component Gallery와 Kinetics는 직접 HTTP 읽기가403이었으나 브라우저로 읽었다. 21st는 이후 사용자의 로컬 키 입력으로 initialize·tools/list·get_usage까지 검증했다. 코드 retrieval은 수행하지 않았다. 외부 UI 코드를 이번 작업에서 복사하지 않았다. Impeccable의 일반적인 스타일 조언이 사용자 승인 디자인을 바꾸지 않도록 상위 작업 지침을 연결했다.

## 이후 기록 형식

날짜 / 실제 읽은 URL·예제·revision / 해결할 빈 부분 / 채택·변경 내용 / 반영 파일 / 실제 사용 도구 / 라이선스·이용 조건 / 검증 / 건너뛴 내용과 이유.

### 21st 인증 완료 후 연결 보완

공식 npm 패키지 `@21st-dev/magic@0.2.3`의 메타데이터와 배포 소스를 확인했다. 이 버전은 현재21st HTTP 서버에 전달하는 공식 호환 프록시다. GUI 환경에서 키를 안전하게 전달하기 위해 로컬 stdio 실행기로 연결했다. 실제 인증·도구 조회·get_usage가 성공했으며, free tier와 hosted AI 비활성 상태를 확인했다. Codex 두 환경과 Claude Code의 연결을 활성화했다. 기존 키 대기 상태는 이 확인으로 갱신된다.

## 2026-09-30 — 공통 기준 적용과 페이지 간 배치 검증

- 근거: [RelayDock 추가 실행 감사](relaydock-followup-lessons.md), 기존 DESIGN.md와 소비자 가이드. 외부 스타일을 새로 선택하는 작업이 아니다.
- 확인한 빈 부분: 페이지별 자동 검사만으로 공통 메뉴 이동을 찾지 못함; 앱 틀과 콘텐츠 폭의 적용 구분, 이전 발견 사항과 스킬 버전 추적이 부족함.
- 반영: DESIGN.md·v2-migration.md의 구성 기준, AGENTS.md 연결, 스킬의 조건부 layout 계약, `browser-check.cjs`의 명시적 페이지 간 비교와 실행 파일 해시.
- 실제 실행: 로컬 Chromium/axe 회귀 검사와 독립 행동·코드 검토. 도구·결과 범위는 [개선 검증 기록](common-design-compliance-verification.md)에 보존한다.
- Refero/21st/Component Gallery/Kinetics 재검색·코드 retrieval·Impeccable polish/distill은 실행하지 않았다. 승인된 시스템의 적용·검증 개선이라 새 외부 참고가 필요하지 않았다. 새 외부 코드·라이선스·의존성도 추가하지 않았다.
