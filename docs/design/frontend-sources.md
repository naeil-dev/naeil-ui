# 프론트엔드 참고 출처

과거 v2의 실제 채택 내역과 검증은 [v2 검증 기록](v2-verification.md)에 있다. 이 문서는 이후 작업의 출처와 실행 상태를 누적한다.

## 2026-09-29 — 참고 도구 작업 환경 구성

| 출처 | 확인·채택 내용 | 반영 위치 |
| --- | --- | --- |
| 사용자 제공 Threads 본문 / https://www.threads.com/share/BCMFGYoNDD/ | 사용 시점, 기존 시스템 우선, 외부 자료 순서, 설치·접근 실패·출처 기록 규칙 | frontend-reference-workflow, AGENTS.md, CLAUDE.md, 전역 Claude 참고 섹션 |
| https://styles.refero.design | DESIGN.md 기반 스타일 탐색 가능 확인; 새 스타일은 채택하지 않음 | 스킬 style 경로 |
| https://github.com/VoltAgent/awesome-design-md | 공식 README 확인; 기존 Linear 분석 채택 이력 보존 | 스킬 style 경로, 기존 DESIGN.md |
| https://component.gallery | 실제 컴포넌트·시스템 비교 사이트의 브라우저 접근 확인 | 스킬 component 경로 |
| https://kinetics.colorion.co | 실제 모션 예제 목록 확인; 현재 v2에 새 효과 채택 없음 | 스킬 motion 경로 |
| https://github.com/21st-dev/magic-mcp/blob/main/README.md 및 .mcp.json | 현재 HTTP endpoint, x-api-key 인증, 환경변수 연결, AI 이용권과 컴포넌트 접근의 구분 | tools.md, 비활성 Codex 연결 설정 |
| https://github.com/pbakaus/impeccable/tree/114ea1d3838fca73b253af45f873b9c4f5f213c8/.agents/skills/impeccable | 공식 스킬 원본 설치; engine-probe/context 실행. polish/distill은 미실행 | 사용자 공통 스킬 및 Claude 연결, tools.md |
| https://developers.openai.com/codex/skills/ | 사용자 .agents/skills 검색 및 심볼릭 링크 지원 | 사용자 공통 스킬 설치 방식 |
| https://developers.openai.com/codex/mcp/ | env_http_headers 및 enabled=false 지원 | 비밀값 없는 인증 대기 설정 |

Component Gallery와 Kinetics는 직접 HTTP 읽기가403이었으나 브라우저로 읽었다. 21st는 README와 공식 MCP manifest를 확인한 상태이며 인증·할당량·코드 retrieval은 미검증이다. 외부 UI 코드를 이번 작업에서 복사하지 않았다. Impeccable의 일반적인 스타일 조언이 사용자 승인 디자인을 바꾸지 않도록 상위 작업 지침을 연결했다.

## 이후 기록 형식

날짜 / 실제 읽은 URL·예제·revision / 해결할 빈 부분 / 채택·변경 내용 / 반영 파일 / 실제 사용 도구 / 라이선스·이용 조건 / 검증 / 건너뛴 내용과 이유.
