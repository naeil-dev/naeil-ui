# 프론트엔드 참고 도구와 작업 규칙

2026-09-29에 사용자가 Threads의 참고 방법을 모두 활용할 수 있도록 구성해 달라고 요청했다. 이는 앞으로 사용할 작업 환경의 구성이다. 모든 도구를 v2 제작 과정에서 이미 실행했다는 뜻은 아니다.

## 어떻게 작동하는가

새 페이지를 만들거나, 디자인이 마음에 들지 않아 개선을 요청하거나, 여섯 참고처를 직접 언급하면 `frontend-reference-workflow`를 사용한다. 작은 문구·간격·버그 수정은 별도 요청이 없다면 기존 시스템으로 바로 처리한다.

1. 기존 DESIGN.md와 공통 컴포넌트를 먼저 확인한다.
2. 미정인 스타일만 Refero 또는 awesome-design-md로 보충한다.
3. 필요한 컴포넌트는 목적을 알린 뒤 21st.dev에서 찾고, Component Gallery의 동작·접근성 사례를 비교한다.
4. 필요한 모션만 Kinetics의 구체적인 예제에서 검토한다.
5. 큰 작업의 마무리에는 공식 Impeccable의 polish/distill을 사용한다. bolder는 더 강한 방향을 요청할 때 사용한다.

각 자료는 실제로 읽고, 출처·채택 내용·수정 파일을 남긴다. 읽기 실패는 사용 가능한 브라우저로 확인하고, 여전히 실패하면 해당 자료에 의존하는 단계를 멈춘다. 설치 권한이 이미 있으면 다시 묻지 않고, 새로운 비용·계정·외부 업로드는 필요한 승인을 별도로 확인한다.

## 현재 상태

| 항목 | 상태 | 증거/제한 |
| --- | --- | --- |
| Refero | 웹 참고 가능 | 실제 홈페이지의 DESIGN.md 안내 확인 |
| awesome-design-md | GitHub 참고 가능 | 공식 저장소 README 확인; 기존 Linear 참고 유지 |
| Component Gallery | 브라우저 참고 가능 | HTTP403 후 브라우저 읽기 성공 |
| Kinetics | 브라우저 참고 가능 | HTTP403 후 브라우저에서 예제 목록 읽기 성공. 효과는 이번 설정 작업에서 채택하지 않음 |
| Impeccable | 공식 스킬 설치 및 엔진 실행 확인 | skill4.4.0, engine0.1.6. engine-probe와 프로젝트 context 성공. polish/distill 실행과는 구분 |
| 21st MCP | 설정 준비, 인증 대기 | 새 endpoint와 환경변수 연결을 준비했지만 API 키가 없어 비활성. 도구 조회·검색·코드 다운로드는 아직 실행하지 않음 |

21st.dev의 무료 한도·요금·AI 이용권은 실행 시 실제 계정에서 확인한다. Threads의 숫자를 고정된 현재 정책으로 간주하지 않는다.

## 설치 위치와 재사용

- 저장소 원본: `skills/frontend-reference-workflow/`.
- 사용자 공통 설치: `~/.agents/skills/frontend-reference-workflow/`와 `~/.agents/skills/impeccable/`.
- Claude Code: 두 디렉터리를 `~/.claude/skills/`에 연결했다. `~/.claude/CLAUDE.md`에 조건부 참고 규칙을 추가했다.
- 이 저장소: AGENTS.md에서 공통 스킬을 안내하고, CLAUDE.md는 `@AGENTS.md`와 `@DESIGN.md`를 불러온다.
- Codex는 공식 문서에 따라 `~/.agents/skills`를 읽는다. 새 턴에서 스킬이 나타나지 않으면 세션을 재시작한다. 현재 세션에서 설치 후 스킬 목록 자동 갱신까지 검증한 것은 아니다.

사용 예:

```text
$frontend-reference-workflow 이 설정 화면을 우리 디자인 시스템에 맞게 개선해줘.
$impeccable polish src/stories/ui-v2-demo.tsx
$impeccable distill src/stories/ui-v2-demo.tsx
```

Claude Code에서는 `$` 대신 `/`를 사용한다. 실제 요청 시 설치된 원본 스킬과 해당 playbook을 읽고 수행한다. 셸에 `impeccable polish`를 입력하는 방식이 아니다.

공식 Impeccable 원본은 수정하지 않았다. 프로젝트의 승인된 무채색·글꼴·폭·절제된 모션이 일반적인 외부 스타일 조언보다 우선한다. 자동 편집 훅이나 확장은 설치하지 않았다. 필요할 때 명령으로 쓰는 구성이다. 신규 제품 작업에 필요한 PRODUCT.md 설정은 해당 제품의 사실을 바탕으로 하며, 이번 공통 도구 설치 과정에서 제품 정보를 새로 만들어내지 않았다.

## 21st MCP 활성화에 남은 단계

1. https://21st.dev/mcp 에서 본인 계정의 API 키를 준비한다. 키는 채팅·저장소에 붙여넣지 않는다.
2. 실제 에이전트를 시작하는 환경에 `API_KEY_21ST`를 제공한다. 터미널 환경변수가 GUI 세션에 자동 전달된다고 가정하지 않는다.
3. Codex의 `~/.codex/config.toml` 및 현재 Paseo 환경의 `~/.codex-pooled/config.toml`에는 키 값 없이 endpoint/env header와 `enabled = false`만 준비했다. 사용하는 환경에서 키가 전달된 뒤 활성화하고 재시작한다.
4. Claude Code 연결은 키가 준비된 후 [tools.md](../../skills/frontend-reference-workflow/references/tools.md)의 `claude mcp add-json` 명령으로 등록한다. 인증 실패를 일으키는 활성 서버는 미리 등록하지 않았다.
5. 실제 MCP 도구 목록과 get_usage를 확인한 뒤 연결 완료로 기록한다. 홈페이지를 볼 수 있다는 것만으로 MCP 인증 성공을 주장하지 않는다.

원래 전역 Claude 지침과 두 Codex 설정은 동일 디렉터리의 `.bak-frontend-20260929-152727` 파일로 백업했다. 이번에 추가한 섹션/서버 항목만 제거해 되돌릴 수 있다. 이후 사용자가 다른 설정을 바꿨다면 전체 백업으로 덮어쓰지 않는다.

## 확인한 항목

- 공통 스킬 frontmatter/구조 검사 통과; 저장소 원본과 사용자 설치본 일치.
- Claude의 두 스킬 링크와 DESIGN/AGENTS import 경로 확인.
- 두 Codex 설정 TOML 구문 확인, 21st 비활성 및 secret-free 환경변수 참조 확인.
- 공식 Impeccable engine-probe: `impeccable-engine 0.1.6`; context가 실제 DESIGN.md를 읽는 것 확인.
- 독립 에이전트의 네 가지 행동 시나리오 검토: 작은 수정, 인증 없는 21st 요청, 기존 시각 규칙과 충돌하는 참고, 요청하지 않은 유료 생성. 설치/실행/채택 구분 및 기존 규칙 우선 확인.
- UI 소스·토큰·런타임 의존성은 이번 작업에서 변경하지 않아 전체 UI 테스트를 반복하지 않았다.

공식 설치/API 참고 링크는 [스킬 도구 안내](../../skills/frontend-reference-workflow/references/tools.md)에 있다.
