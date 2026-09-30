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
| 21st MCP | 인증·연결 확인, 활성화 | 실제 initialize·tools/list·get_usage 성공. Codex 두 환경과 Claude Code 등록. 이후 RelayDock 두 적용에서 실제 검색 확인; 코드 다운로드와 구분 |

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

## 21st MCP 연결

사용자가 로컬 터미널에서 입력한 API 키로 실제 MCP 인증과 도구 조회에 성공했다. 계정은 free tier이며 `aiGenerationEnabled=false`이고, `search`, `get_component`, `get_usage` 등이 노출된다. 호스팅 생성 도구는 이번 계정의 목록에 없다. 실제 무료 잔여량은 사용 직전에 get_usage로 확인한다.

- 키 저장: `~/.config/naeil/21st/api-key`, 파일 권한0600, 디렉터리0700. 저장소·채팅·MCP 설정에 키 값을 넣지 않았다.
- 실행기: `~/.local/share/naeil-frontend/21st-mcp/launch.py`. 시작 시 키를 메모리에서 환경변수로 전달한다. GUI가 터미널의 export를 상속할 필요가 없다.
- 전송: 공식 `@21st-dev/magic@0.2.3` 호환 프록시가 stdio를 현재 `https://21st.dev/api/mcp`로 전달한다. 이전 Magic 서비스로 연결하는 것이 아니다. 이 공식 패키지는 API 키를 환경변수로 받는 지원 경로이며, 직접 HTTP 설정 대신 Codex/Claude가 같은 로컬 입력 방식을 사용하도록 선택했다.
- Codex: `~/.codex/config.toml`와 `~/.codex-pooled/config.toml`의21st 항목을 로컬 실행기·enabled=true로 변경했다.
- Claude Code: user scope에 같은 실행기로 등록했다.
- 새 세션에서 MCP 도구를 로드한다. 기존 세션의 도구 목록이 자동 갱신된다고 가정하지 않는다.

이번 확인은 인증·도구 목록·계정 이용권 조회만 수행했다. 컴포넌트 코드 retrieval, hosted generation, 유료 호출은 수행하지 않았다.

원래 전역 Claude 지침과 두 Codex 설정은 동일 디렉터리의 `.bak-frontend-20260929-152727` 파일로 백업했다. 이번에 추가한 섹션/서버 항목만 제거해 되돌릴 수 있다. 이후 사용자가 다른 설정을 바꿨다면 전체 백업으로 덮어쓰지 않는다.

## 확인한 항목

- 공통 스킬 frontmatter/구조 검사 통과; 저장소 원본과 사용자 설치본 일치.
- Claude의 두 스킬 링크와 DESIGN/AGENTS import 경로 확인.
- 두 Codex 설정 TOML 구문 및 활성 로컬 실행기 확인. 실제 MCP initialize·tools/list·get_usage 성공.
- 공식 Impeccable engine-probe: `impeccable-engine 0.1.6`; context가 실제 DESIGN.md를 읽는 것 확인.
- 독립 에이전트의 네 가지 행동 시나리오 검토: 작은 수정, 인증 없는 21st 요청, 기존 시각 규칙과 충돌하는 참고, 요청하지 않은 유료 생성. 설치/실행/채택 구분 및 기존 규칙 우선 확인.
- UI 소스·토큰·런타임 의존성은 이번 작업에서 변경하지 않아 전체 UI 테스트를 반복하지 않았다.

공식 설치/API 참고 링크는 [스킬 도구 안내](../../skills/frontend-reference-workflow/references/tools.md)에 있다.


## 실전 점검 후 스킬 보완

기존 스킬에 다음 실행 규칙과 도구를 추가했다.

- 시작 시 프로젝트 DESIGN/token 출처와 화면·상태·예외·재사용 방식·검증 기준을 기존 작업 문서에 기록한다.
- 미정인 결정과 실제 참고·채택을 연결하고, 이미 정해진 항목은 재검색하지 않는다.
- 네이티브21st 도구가 없는 세션에서는 `scripts/twenty_first.py status|search`로 기존 인증 launcher를 재사용한다. 자동 설치·retrieval·유료 생성은 하지 않는다.
- `scripts/browser-check.cjs`로 기존 Playwright/axe 설치를 이용해 대비·중첩 조작·넘침·프로젝트 CSS 기대값·터치 영역 검토 대상을 확인한다. 프로젝트별 입력값이며44px 등은 도구에 고정하지 않았다.
- 완료 보고는 실제 실행·상태별 증거·미검증 항목을 구분한다. 자동 통과를 전체 디자인 합격으로 해석하지 않는다.

설치본 및 Opus5.5 리뷰를 포함한 최종 검증은 [스킬 개선 기록](frontend-workflow-v2-verification.md)에 기록한다. 공식 Impeccable은 변경하지 않는다. 이 작업은 플러그인화나 RelayDock 제품 수정이 아니다.

개선 스킬은 사용자 공통 설치본에 반영했다. Opus 5.5 두 차례 리뷰를 수행하고 지적 사항을 반영했으며, 마지막 수정의 추가 재리뷰 요청은 공급자 사용 한도로 실행되지 못했다. 최종 설치 경로 검증은 브라우저 11개·MCP 5개 통과했다. 구체적인 검토 범위와 한계는 위 검증 기록을 따른다.

## 2026-09-30 — 공통 기준 적용 보완

추가 RelayDock 실행에서 얻은 근거로 앱 틀/콘텐츠 폭 계약, 페이지 간 위치 비교, 언어·데이터 사례, 기존 발견 사항과 실제 읽은 스킬 버전 추적을 보강했다. 검사기의 `layoutComparisons`는 선택한 같은 조건의 화면들을 비교하고, 실행 파일 SHA-256을 보고서에 남긴다.

revision `2026-09-30`을 공통 설치본에 반영했다. 원본 7개 파일 일치, 기존 Claude 링크 확인, 브라우저 16개·MCP 5개 및 실제 설치본 비교 CLI 5개 검사가 통과했다. 독립 코드 리뷰 1건을 수정하고 해당 변경을 재검토했다. [현재 개선 검증과 한계](common-design-compliance-verification.md)를 따른다.

이전에 스킬을 읽은 실행 중 에이전트는 다음 큰 작업에서 최신 SKILL.md와 관련 reference를 다시 읽어야 한다. 자동 갱신이나 RelayDock의 새 버전 실제 사용을 확인했다고 주장하지 않는다.
