# 프론트엔드 참고 출처

## 2026-10-16 — 서비스 공통 UI 이행

기존 DESIGN.md·0.6.0 frame과 site footer 번역/공식 GitHub 링크를 사용했다. 새 외부 디자인 출처나 디자인 도구 검색은 없다. Impeccable context/harden/craft-floor와 Aside guide를 읽었고, 실제 렌더·Storybook/packed 브라우저 검증 결과는 rollout 검증 기록에 별도로 남긴다. 설치 상태를 실행 결과로 간주하지 않는다.


## 2026-10-10 — 처음부터 다시 하는 로고 의미 탐색

사용자는 ㄴ·해·일출을 고정하지 말고 ‘내일’을 새로운 장면과 관계로 해석해 달라고 요청했다. 쉼표, 눈을 뜨는 아침, 지켜낸 불씨, 밤이 품은 내일, 넘기는 한 장, 문틈의 빛까지 6개 발상을 [러프 보드](logo-study-2026-10-09/fresh-exploration-2026-10-10/board.png)로 비교했다. 이 탐색이 바로 아래의 ㄴ+해 다듬기 방향을 대체한다.

logo-icon-design 스킬 절차에 따라 원본 SVG를 직접 작성했다. librsvg, Pillow, 스킬의 proof_sheet.py로 단색, 반전, 16~48px를 확인했다. 새 외부 참고·AI 생성·상표 조사는 하지 않았다. 공유 기반이나 실제 로고는 바꾸지 않았다. 의미, 형태, 다른 해석과 추천은 [탐색 기록](logo-study-2026-10-09/fresh-exploration-2026-10-10/notes.md)에 있다.

## 2026-10-10 — ㄴ과 떠오르는 해의 의미 유지

사용자는 A의 ‘다시 뜨는 해’가 기존 로고에 이미 담긴 전제였다고 명확히 했다. 의미 선택을 다시 묻지 않고 [기존 ㄴ+해의 형태 다듬기](logo-study-2026-10-09/sunrise-refinement-2026-10-10/sunrise-samples.png)를 제작했다. 현재 구조와 부드러운 ㄴ·해의 높이를 동일 임시 색으로 비교하며, 새 메시지나 브랜드 방향을 선정하는 작업이 아니다.

실제 도구는 직접 SVG 작성·librsvg·Pillow·이미지 뷰어이며 새 외부 참고/AI 생성은 없다. 단색·어두운 배경·16/20/24/32px 샘플을 직접 확인했다. [다듬기 기록](logo-study-2026-10-09/sunrise-refinement-2026-10-10/notes.md)에 가정과 범위를 남겼다. 공유 기반이나 실제 로고를 교체하지 않았다.

## 2026-10-09 — 로고 의미 중심 후속 탐색

사용자가 ㄴ과 해에 담긴 ‘내일’의 의미·따뜻함·새출발을 우선한다고 수정했다. 기존 ㄴ+해 로고와 messages/ko.json의 “Tomorrow starts here.”를 읽고, 다시 뜨는 해 / 빛을 맞는 자리 / 새 아침으로 이어지는 길의 [러프 의미 보드](logo-study-2026-10-09/meaning-exploration/meaning-board.png)를 만들었다. 새 외부 시각 출처를 채택하지 않았으며 설명용 원본 SVG를 직접 작성·librsvg로 렌더·이미지 뷰어로 확인했다.

내장 imagegen 요청은 HTTP 405로 실패했고 AI 생성 이미지는 없다. 공유 토큰·제품 로고·API는 바꾸지 않았다. [방향 기록](logo-study-2026-10-09/meaning-exploration/direction.md)은 첫 형태 검토의 B 추천을 확정안으로 취급하지 않고 사용자 메시지를 먼저 구체화한다.

## 2026-10-09 — naeil 로고 스킬과 3안 검토

Gap: ‘내일’이라는 이름과 연결되면서 차분하고 개성 있는 제품 브랜드를 만들기 위한 반복 가능한 절차와 실제 로고 시안. 공유 UI 기반의 중립 색상·Pretendard·API 기준을 바꾸는 작업은 아니다.

- 2026-10-09 본문을 조사한 David Airey의 [good-logo](https://www.davidairey.com/good-logo)·[process](https://www.davidairey.com/process), Kaan Kızıltuğ의 [logo-design-skill 글](https://kaankiziltug.com/blog/logo-design-skill-kaankiziltug)에서 단색 실루엣·서로 다른 방향·작은 SVG 렌더와 배치 검증을 채택했다. 발표일 미표시 자료와 제작자의 자체 관찰을 시장 보급률·독립 성능 비교로 해석하지 않았다. LogoLounge [2026 보고서](https://www.logolounge.com/trend/2026-logo-trend-report)는 도입부만 참고했으며 특정 스타일을 채택하지 않았다.
- 실제 심벌 비교: [Standard Notes 공식 이미지](https://standardnotes.com/apple-touch-icon.png), [Notion 공식 SVG](https://www.notion.so/images/notion-logo-block-main.svg). 임시 파일로 내려받아 실제 형상을 확인했으며 새 시안에 타사 경로를 사용하지 않았다. Linear favicon 경로는 HTML이라 참고에서 제외했다.
- 적용: 공통 사용자 스킬 logo-icon-design과 [naeil 3안 검토](logo-study-2026-10-09/review.html). 새 시안의 로고/글자는 원본 SVG 경로. 타사 스킬 코드·폰트·이미지를 새로 배포하지 않았다.
- 실제 naeil 도구: 로컬 SVG 작성·Python/Pillow·librsvg·Chrome CDP·이미지 뷰어. 스킬의 독립 시험에는 별도 브랜드 과제와 로컬/Paseo 브라우저 증거를 사용했다. Recraft·Illustrator·Figma·이미지 생성 서비스는 미실행이고 새 설치도 없다.
- 확인: 단색/반전, 16/20/24/32/64px, B의 16px 보정, 헤더 목업, 비교 페이지 1440/390px 밝은/어두운 4상태와 전환. 스킬 형식·도우미 실행·독립 적용도 확인했다. 한국어 미리보기 H1의 실제 폰트는 Apple SD Gothic Neo 대체이며 Pretendard 로딩을 주장하지 않는다.

출처·기준 파일 해시·실행 결과·범위는 [로고 검증 기록](logo-study-2026-10-09/verification.md)에 있다. 실제 제품 로고 교체·패키지 동작 변경·배포는 이 작업에 포함되지 않는다.

## 2026-10-02 — Public onboarding and portable optional tools

Gap: separate shared UI consumption, optional agent tools, and brand/example-site authentication; remove dependence on a maintainer's private 21st launcher and establish copied-code notices. No visual direction, component code, tokens or site UI changed.

Original bodies read through research-router `fetch.py extract`, captured once outside the repository and inspected offline in full:

- 21st-dev maintainers, [official magic-mcp README](https://github.com/21st-dev/magic-mcp/blob/main/README.md), publication/update date unknown, accessed 2026-10-02; 5,102 characters read. Documented current HTTP endpoint, own-key issuance URL, environment variable support, compatibility proxy, tool discovery and AI/catalog distinction. Applied to `references/tools.md`, public tooling setup, and configurable `twenty_first.py` command selection. The proxy was not installed or authenticated during this change; no real search, retrieval, generation or native MCP discovery is claimed.
- shadcn maintainers, [original MIT license](https://github.com/shadcn-ui/ui/blob/main/LICENSE.md), publication/update date unknown, accessed 2026-10-02; 1,062 characters read. Original notice included in THIRD_PARTY_NOTICES.md; matched the installed shadcn license. Local git history establishes shadcn adaptation but not an exact upstream registry revision.

Installed `pretendard/dist/LICENSE.txt` and `@fontsource/noto-sans-jp/LICENSE` were read locally and preserved in `licenses/`. Local source/history audits found site-art provenance and fetched JetBrains Mono notice verification unresolved; see THIRD_PARTY_NOTICES.md. No external design code was adopted.

This narrow check establishes documented setup/license facts, not reliability, popularity, a new design direction, or live API availability. Shared UI execution checks are separate from helper/documentation checks.

| Source | Status / reason | Collected | Cited | Newest published/updated | Means |
| --- | --- | ---: | ---: | --- | --- |
| 21st-dev/magic-mcp README | OK, relevant original setup body read in full | 1 | 1 | Unknown; accessed 2026-10-02 | research-router local-extract + offline inspect-extract |
| shadcn-ui/ui LICENSE.md | OK, full license body read | 1 | 1 | Unknown; accessed 2026-10-02 | research-router local-extract + offline inspect-extract |


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

## 2026-10-02 — Scoped Vercel Git deployment control

The orchestrator read the official [Vercel Git Configuration: git.deploymentEnabled](https://vercel.com/docs/project-configuration/git-configuration#git.deploymentenabled) through research-router, updated 2026-08-25 and accessed 2026-10-02. Adopted only the branch-specific mapping `feat/public-ui-readiness: false` in `vercel.json`. Unspecified branches retain their defaults; no wildcard enablement was added. This prevents this implementation branch's Git integration deployment when pushed; it neither deploys the website nor grants publication or deployment approval. No external design tool or new visual source was used for this package boundary change.


## 2026-10-02 — Public UI guides, runnable Docs and Stage 3 resilience

This extends the approved system and existing 11 component families; no external visual style or catalog component was selected. Read DESIGN.md, v2 specification/migration, the local reference workflow/verification guidance and installed Impeccable harden/craft-floor instructions. The orchestrator had run Impeccable's context loader; the executor did not rerun it. Actual execution used local source/type inspection, Storybook/Vite, Chromium/WebKit, axe, font/forced-color/CSS scaling probes, production package consumers and screenshot inspection. No Refero/21st/Component Gallery/Kinetics retrieval, hosted design tool, screen reader or actual Safari/Windows session was run for this scope.

| Original source / inspected material | Adopted facts and artifact scope |
| --- | --- |
| Installed `src/components/ui` wrappers and Radix declarations reached through radix-ui 1.4.3 | Exact public usage contracts/defaults; no invented Button loading API. 11 maintained guides + matching actual Storybook Docs/Usage pages. Primitive type links identify locally inspected package versions. |
| Installed Pretendard 1.3.9 and @fontsource/noto-sans-jp 5.3.0 LICENSE bodies | Exact OFL copies in preview and consumer-owned font assets/notices. Shared font choices remain unchanged. |
| [Nunito Sans original OFL](https://raw.githubusercontent.com/google/fonts/main/ofl/nunitosans/OFL.txt), read 2026-10-02 | Full author/OFL notice for Storybook manager's bundled Nunito Sans; tooling font, not shared UI adoption. |
| [Storybook 10.4.6 LICENSE](https://raw.githubusercontent.com/storybookjs/storybook/v10.4.6/LICENSE) and [original yarn.lock](https://raw.githubusercontent.com/storybookjs/storybook/v10.4.6/yarn.lock), read 2026-10-02 | Pinned complete Storybook MIT body and conservative source-lock version superset for 190 annotated manager/addon package names. Lock SHA-256: `d64255d89357127ea39412a61456f1ee503c9ca66622727d1efd2fe88111dea1`. `.storybook/manager-notices.json` preserves 254 package-version notice entries, obtained through npm tarball/source retrieval; opt-in refresh executed, ordinary builds use checked-in bodies offline. |
| Original npm tarballs/installed LICENSE/NOTICE files enumerated by `scripts/bundled-notices.ts` and `scripts/refresh-storybook-notices.py` | Actual Vite chunk inventory plus complete installed notices. Package lookup passes unnamed type-only manifests. Next 16.1.7 vendored React/ReactDOM/scheduler/path-to-regexp preserve their actual LICENSE bodies and explicitly unspecified manifest versions. Lucide 0.575.0 preserves its mixed ISC/Feather MIT notice in full. These are bundled-artifact notices, not invented component provenance. |
| [react-remove-scroll-bar original LICENSE](https://raw.githubusercontent.com/theKashey/react-remove-scroll-bar/master/LICENSE), read 2026-10-02 | Installed 2.3.8 omitted a standalone file; retain original MIT/copyright body. The master URL is not claimed as a pinned release revision; checked-in full notice/hash is evidence of the body used. |
| [popper.js 1.16.1 LICENSE](https://raw.githubusercontent.com/floating-ui/floating-ui/v1.16.1/LICENSE.md), [store2 LICENSE-MIT](https://raw.githubusercontent.com/nbubna/store/master/LICENSE-MIT), [toggle-selection LICENSE](https://raw.githubusercontent.com/sudodoki/toggle-selection/master/LICENSE), read 2026-10-02 | Original complete fallback notices for manager packages whose tarball omitted the standalone body. Master URLs do not establish an exact historical embedded version. |
| use-composed-ref@1.4.0 npm metadata/tarball and [original repository](https://github.com/Andarist/use-composed-ref), inspected 2026-10-02 | No standalone notice was supplied. Preserve exact upstream MIT metadata and complete declared MIT terms; no copyright date/holder invented. This is a concrete documented gap, not a generic missing-license fallback. |
| client-only@0.0.1 installed package metadata / React project links, plus exact Next-vendored React LICENSE | Empty client marker omitted a notice; preserve exact metadata and full original React MIT copyright/terms in `licenses/React-MIT.txt`. Arbitrary missing notices fail builds. |
| Manager's vendored is-dom/is-function/is-object/is-window module comments, source lock and original npm notice files | Embedded versions are not specified. Checked-in JSON explicitly labels conservative notice sources 1.1.0/1.0.2 without claiming those are exact embedded versions. |

The reproduced shared changes are limited to forced-colors Switch visibility and inert coordination for Radix-hidden Select/menu backgrounds. The latter uses a document-owned symbol registry across bundled/deep module copies, with nested/overlapping cleanup/ref checks. Raw website `public/` assets are excluded from preview and npm; their unresolved rights remain carried forward. Preview publication configuration is manual-only preparation, unexecuted. Dated results and manual limitations are in [Stage 3 verification](public-ui-stage3-verification.md).

## 2026-10-02 — Demand-led Tabs, Textarea and native composition

Gap: repeated local/copied Radix panel switching and repeated multiline fields needed a maintained shared contract. The [generalized demand decision](component-demand.md) records roles and counts without publishing private consumer identities. Adopted minimal wrappers around the already installed Radix Tabs and native HTML textarea, plus label/help/error and native fieldset/legend/same-name radio composition guidance. No form-state wrapper, RadioGroup API, dependency, external visual source or business behavior was added.

Read DESIGN.md, the accepted v2 specification/migration, finished Stage 3 guides, repository frontend-reference-workflow revision 2026-10-02.1 and its verification guidance, and Impeccable 4.4.0 harden/craft-floor instructions. Inspected installed `@radix-ui/react-tabs@1.1.13` runtime and declarations reached through `radix-ui@1.4.3`; the [Tabs guide](../components/tabs.md) links the matching versioned original package files. These installed primitive semantics, native textarea behavior and existing tokens were adopted, rather than catalog code. Existing Radix MIT notices remain covered; no new license/dependency was introduced.

Actual tools: local source/type inspection, Impeccable context loader once against `.storybook/preview.tsx`, its mechanical detector once against final extension sources, unit tests, token/rendered contrast checks, actual built Storybook manager Docs and Usage pages, Playwright Chromium/WebKit with axe, screenshots, production package builds and independent packed React/Next fixtures. The detector's sole `border-accent-on-rounded` warning matched Tabs' 2px bottom border; it was retained as an intentional neutral selection indicator on a control, with rendered contrast and forced-colors checks. No Impeccable polish/distill, Aside browser session, Refero/21st/Component Gallery/Kinetics retrieval, hosted design tool or external design code was used. Installed/configured tooling is not an execution claim.

The [dated Stage 4 verification](public-ui-stage4-verification.md) supplies reproducible commands, inspected source identities, corrected geometry/contrast findings, final results and manual limitations. Stage 3's dated 11-family results remain historical; current navigation covers 13 families. Publication and deployment remain unexecuted.


## 2026-10-10 — naeil 로고 의미 탐색 재개

사용자의 새 브리프를 기준으로 기존 ㄴ·해 구조 확정이라는 과거 해석을 철회했다. [새 탐색 기록과 단색 러프 5안](logo-exploration-2026-10-10/README.md)에 의도·실제 형태 관찰·다른 해석·추천과 한계를 구분했다. DESIGN.md와 실제 Logo, 과거 로컬 기록, logo-icon-design 스킬을 읽고 직접 SVG를 작성했다. Python과 로컬 librsvg로 보드를 렌더하고 이미지 뷰어에서 확인했다. 외부 디자인 소스·코드 채택, 외부 디자인 도구, 이미지 생성, 실재 로고/상표 검색은 실행하지 않았다. 설명 글자는 로컬 시스템 서체이며 브랜드 글꼴 채택이 아니다. 작은 크기·반전·제품 사용처 검증은 방향 선택 뒤 진행한다. 제품 로고·공유 UI·토큰·API는 변경하지 않았다.

## 2026-10-10 — logo skill comparison experiment

사용자 요청으로 외부 스킬을 실제 적용한 탐색. 상세: [결과와 한계](logo-skill-comparison-2026-10-10/README.md), [사용 커밋](logo-skill-comparison-2026-10-10/provenance.json).

- Kaan logo-design-skill: 원문 과정과 bundled library/search/concept_sheet/svg_audit/preview_sheet/render_png 실제 실행. 단색 후보3개.
- neonwatty logo-designer-skill: 원문 Phase2의 병렬 콘셉트3개, HTML template 적용. 루트 포함 같은 세션 도구 사용, 권한 우회 옵션 없음.
- Leonxlnx brandkit: 원문 전략을 적용한2×2보드 프롬프트 작성 후 내장 image_gen 호출. HTTP405 Method Not Allowed로 실패, 생성된 이미지 없음.
- 직접 작성 SVG를 librsvg로 렌더, Chrome headless로 비교 페이지 캡처, 이미지 직접 관찰. Recraft/Illustrator/Figma 실행 없음. 전역 스킬 설치/수정 및 제품 UI·로고 교체 없음.


## 2026-10-11 — naeil Lato 워드마크 추가 검증

이전 research-router 조사에서 도출한 기본 조판·굵기·비율·실사용 비교를 수행했다. 새 외부 디자인 소스 검색이나 제품 UI 변경은 없으며, [검증 보고서](logo-sunset-2026-10-10/lato-validation-2026-10-11/report.html)에 측정값·시각적 판단·한계를 구분했다. Google Fonts 고정 커밋 bd8f81ddb5c74d5c8897b36ad88b440266245103의 Lato 400/500/600 원본과 OFL을 보존하고 해시를 대조했다. HarfBuzz, fontTools, librsvg로 조판·SVG를 생성하고, Playwright Chromium에서 공개 /ko 페이지의 로고만 임시 DOM 교체하여 데스크톱/모바일 × 밝음/어두움 4조건의 메뉴 이동·겹침·가로 넘침 및 실제 캡처를 확인했다. Aside는 공개 페이지 탐색에만 사용했고, 반응형 캡처는 Playwright로 수행했다. 회색 버전은 로컬 보고서에서 별도 렌더했다. 제품 통합·배포, 최종 로고 확정, 상표 검토, 인쇄·로그인·파비콘·타 브라우저 검증을 수행했다는 뜻은 아니다.


## 2026-10-11 — naeil 재사용용 브랜드 에셋 1.0.0

사용자의 최종 검수·다른 프로젝트 재사용 요청에 따라 [독립 브랜드 패키지](../../brand/naeil/1.0.0/START-HERE.html)를 만들었다. 선택된 노을·섬 심볼과 Lato Regular 400을 유지하고 기본 조판 간격으로 파일을 통일했다. 글자는 경로로 출력하고 고해상도 PNG, 소형 심볼, adaptive SVG/ICO 파비콘, 앱 아이콘과 사용 예제를 제공한다. 폰트 출처는 앞선 고정 Google Fonts 커밋을 재사용했으며 Lato 원본과 OFL을 패키지 안에 보존했다.

실제 도구: logo-icon-design 및 완료 전 검증 지침, HarfBuzz/fontTools/librsvg/Pillow, Playwright Chromium 153.0.8010.12와 WebKit 26.6. 새 폴더에 복사한 독립 예제 8조건, 공개 사이트의 홈페이지·로그인 임시 DOM 교체 12조건(헤더·푸터·모바일 메뉴 포함)을 확인했다. 28개 출력 SVG, 84개 투명 PNG의 참조·알파 경계, ICO 프레임, maskable 안전 영역, 라이선스 해시를 검사했다. ZIP을 다시 추출하여 체크섬과 상대 링크를 확인했다. Firefox 155를 설치했지만 세 프로필 방식에서 브라우저 시작이 실패했으므로 검증 완료 브라우저에서 제외했다. 자세한 범위와 한계는 [최종 검수 보고서](../../brand/naeil/1.0.0/verification/report.html)에 기록했다. 새 research-router 검색, Figma/Recraft/이미지 생성 실행, 제품 소스 변경, 공유 npm 패키지 게시·사이트 배포는 수행하지 않았다.

## 2026-10-11 — 독립 브랜드 원본과 공유 Logo 통합

사용자가 승인한 관리 방식에 따라 브랜드 릴리스는 `brand/naeil/`에서 독립 관리하고 공유 Logo·Nav·Footer·사이트 로그인과 연결했다. `brand/current.json`이 승인 버전을 선택하며, SVG 원본 해시 검증 → React 코드·Lato 고지·사이트 아이콘 생성 → 빌드 전 드리프트 검사를 적용했다. UI Pretendard와 중립 토큰은 그대로다. [관리 절차](../../brand/README.txt)와 [통합 검수 보고서·실제 캡처](brand-integration-2026-10-11/report.html)에 사용 계약·증거·한계를 기록했다.

실제 도구: 로컬 TypeScript 생성기, unit/type/contrast/ESLint 검사, 패키지·Storybook·사이트 production build, Playwright Chromium/WebKit와 axe, 실제 Storybook Docs/Usage/Application, 독립 packed React/Next 소비자, 읽기 전용 추가 코드 검토. 브라우저 16개와 단위 테스트 46개가 통과했다. 새 외부 디자인 소스·research-router 조사·Figma/Recraft/이미지 생성 실행은 없었다. 이전 Lato 고정 커밋과 OFL을 재사용했다.

사이트 빌드에서 발견된 ICO RGB 프레임 호환 문제를 RGBA 인코딩으로 수정하여 브랜드 1.0.1로 분리했다. 1.0.0은 보존했으며 24개 SVG와 디코딩된 favicon 픽셀은 동일하다. 신규 ZIP 추출 후 CRC·212개 해시·97개 상대 링크를 검증했다. 실제 로컬 아이콘 응답은 200이지만 /ko·/ko/login 런타임은 Supabase 환경 변수 누락으로 500이므로 전체 인증 페이지 실사용 검증 완료로 표현하지 않는다. Firefox·실제 Safari/iPhone·인쇄·상표 검토는 이번 검증 범위에 포함하지 않았다. npm 게시와 사이트 배포는 수행하지 않았다.


## 2026-10-11 — .naeil 마침표 복원, 브랜드 1.1.0

Git 커밋 `2efb1b001706d6f4eec57c90a0d3ae256940733f`(2026-03-02)의 “끝. 내일 — the period marks an ending, naeil means tomorrow.” 기록을 확인했다. 사용자가 앞의 점 유지를 명시하여 Lato Regular 400 원본의 period 글리프와 기본 조판으로 가로형·푸터형·세로형·글자 단독을 `.naeil`로 갱신했다. 1.0.0·1.0.1은 보존하고 `brand/current.json`은 1.1.0으로 변경했다. 심볼·색·아이콘은 1.0.1과 동일하다.

실제 사용: logo-icon-design 지침, 로컬 Git 기록, HarfBuzz/fontTools/librsvg/Pillow, SVG·PNG·글리프·폰트 해시 검사, Playwright Chromium/WebKit 독립 복사 예제 8조건, 실제 Storybook·공유 Logo 및 packed 소비자 검증. 새 외부 조사나 디자인 서비스·이미지 생성은 사용하지 않았다. 과거 점 없는 로고 캡처를 새 버전 증거로 재사용하지 않았다. [1.1.0 검수](../../brand/naeil/1.1.0/verification/report.html)와 [공유 컴포넌트 확인](brand-wordmark-dot-2026-10-11/report.html)을 참조한다. 게시·배포는 수행하지 않았다.


## 2026-10-11 — 배포 전 대표 미리보기 정정

릴리스 파일 최종 확인에서 1.1.0의 PREVIEW.png가 점 없는 이전 버전임을 발견했다. 기존 버전을 덮어쓰지 않고 1.1.1로 분리했으며, 새 START-HERE.html의 gallery를 실제 Chromium에서 캡처하여 교체했다. SVG·PNG 폴더·아이콘은 1.1.0과 바이트 동일함을 확인했다. 1.1.1 ZIP 추출 후 158개 해시·93개 상대 링크를 확인했으며 공식 원본 선택을 1.1.1로 갱신했다. 이 수정과 npm 0.4.0 게시 준비는 실제 외부 배포 결과와 구분한다.

## 2026-10-11 — npm 0.4.0, 브랜드 1.1.1 및 실제 배포 확인

병합 소스 `e8fe5afc13788a0cac0244b72e78975812f4a2ee`에서 다시 빌드한 패키지, 동결한 검수 후보와 공개 npm tarball의 바이트가 동일함을 확인했다. 사용자의 게시용 보안 키 인증 뒤 `@naeil/ui@0.4.0` 게시와 latest 0.4.0을 확인하고, 서로 다른 빈 npm 캐시를 사용하는 독립 React/Next 앱에서 실제 registry 설치·타입·production build·SSR/deep import·폰트/차단 fallback·고지·mixed-import/StrictMode·Chromium/WebKit Tabs/Textarea 계약을 검증했다. [게시 보고서](naeil-brand-0.4.0-publication.md)와 공개 GitHub Release에 원본·npm·브랜드·운영 사이트·hosted Docs 증거를 보존했다.

실제 도구: Git/GitHub CLI, pnpm/npm, Python 해시·ZIP CRC 검사, Playwright Chromium 153.0.8010.12와 WebKit 26.6, Aside를 통한 실제 naeil.dev·배포된 Brand Docs 탐색·캡처 및 이미지 관찰. 단위 테스트 46개와 병합 CI 브라우저 233개(예상 forced-colors skip 4개)가 통과했다. Pages workflow가 같은 소스로 Storybook을 배포했으며, 실제 URL에서 Docs 28회·Docs→Usage 28회·브랜드 테마 4조건·정확한 고지 6개·공식 SVG 4개·로컬 폰트·고정 링크를 확인했다. 운영 사이트 홈페이지/로그인 24조건과 아이콘 3개의 원본 일치도 확인했다. GitHub Release의 9개 첨부 파일을 인증 없는 공개 다운로드로 다시 대조했다.

새 외부 디자인 소스·research-router 조사·Figma/Recraft·이미지 생성은 실행하지 않았다. 앞선 고정 Lato/OFL과 승인 브랜드를 그대로 사용했다. 이 기록은 이전 준비 단계의 미게시·미배포 기록을 당시 증거로 보존하면서 실제 게시 결과를 추가한다. 실제 Safari/VoiceOver 청취, 물리 기기, 인쇄·상표 검토, 실제 소비 제품 채택과 전체 OAuth 인증의 미검증 범위는 유지한다.


## 2026-10-12 — 메인 석양 장면 모션 스타일 조사

범위: 사용자가 선호하는 어두운 바다·석양·섬 컨셉을 유지하는 스타일 종류와 제작 경로 탐색. 첨부 캡처와 DESIGN.md를 기준으로 시네마그래프, 영화적 루프, 일러스트/2.5D, 스타일화 3D, 추상 광원, 레트로 표현을 비교했다. 사이트 장면에 대한 제안이며 공유 UI나 브랜드 릴리스 변경은 아니다. 방향 채택은 미결정이다.

읽은 원문: [Runway 공식 프롬프팅 가이드](https://academy.runwayml.com/guides/prompting-guide) 전체(발행일 미상), [Adobe 시네마그래프 설명](https://www.adobe.com/creativecloud/video/discover/how-to-make-a-cinemagraph.html) 관련 부분(발행일 미상), [Thalles Lopes의 물 표현 제작기](https://tympanus.net/codrops/2025/03/04/creating-stylized-water-effects-with-react-three-fiber/) 관련 부분(2025-03-04), [The Sleepers 제작기](https://tympanus.net/codrops/2026/07/10/the-sleepers-creating-an-atmospheric-webgl-experience-with-lightweight-techniques/) 전체(2026-07-10). Kinetics의 초기 UI 스프링·버튼 예제 코드는 읽었지만 이번 풍경 스타일 추천에는 채택하지 않았다. 원문 설명과 제작자의 경험을 참고한 적합성 제안이며 AI 도구 품질 순위나 최근 유행 측정이 아니다.

실제 도구: research-router의 SearXNG discovery 1회(무관 결과), native web search 6쿼리로 원문 발견, fetch.py/local-extract 5 URL 및 오프라인 본문 읽기. 검색 결과 요약은 본문 근거와 구분했다. 브라우저 데모 재생, 영상·이미지 생성, Refero/21st/Impeccable 실행, 성능 검증은 수행하지 않았다. 연구 캡처는 /tmp/naeil-motion-research.iwBpQb에 보관. 적용 파일은 이 출처 기록뿐이며 제품 구현은 변경하지 않았다.

워크플로: `skills/frontend-reference-workflow/SKILL.md`, revision 2026-10-02.1, SHA-256 `ecada9f24d5ebbce5ac207d5225200ca2d76d08ea9f9f1d3b46d4e956a17d7b8`.


## 2026-10-12 — 기존 모션 스타일 샘플 링크 확인

새 샘플 제작 없이 기존 사이트를 선정했다: [Flixel Nature](https://flixel.com/cinemagraphs/nature/), [Firewatch](https://www.firewatchgame.com/), [Elysium](https://elysium.thebenezer.com/), [Amanpuri](https://www.aman.com/resorts/amanpuri), [Codrops Aurora](https://tympanus.net/Development/AmbientCanvasBackgrounds/), [Canvas Cycle](https://www.effectgames.com/demos/canvascycle/). 실제 native web search 10쿼리, local-extract, Aside REPL의 데스크톱 snapshot·스크린샷을 확인했다. Canvas Cycle의 Seascape - Sunset을 직접 선택해 렌더를 확인했다. Elysium은 진입 화면까지 확인했으며 탐색 전체 검증은 하지 않았다. Aman의 쿠키 안내는 그대로 유지했다. 생성 도구나 제품 구현 변경은 없고 스타일 채택은 미결정이다.

Cinemagraphs.com은 Website Expired, Coastal World는 coastalbank.com으로 리다이렉트되어 추천에서 제외했다. 해당 상태는 브라우저에서 실제 확인했다. 캡처·본문·관찰 기록은 /tmp/naeil-style-links.Aidpe6 및 Aside 세션 2026-10-12_SWMmSjQx0AZXzzs5/tmp에 보관했다. 브라우저 증거를 research-router ledger에 import할 때 blogs/public-browser 조합이 거부되어 원본 receipt를 별도로 보존했다. 이는 브라우저 관찰 증거가 ledger import로 검증되었다는 뜻이 아니다. 자체 생성 탭과 팝업은 모두 닫았다.


## 2026-10-12 — 노을 히어로 가로 시안 A/B

사용자가 제공한 MOV의 추출 프레임을 원본으로 사용했다. 사용자 요청에 따라 Paseo 스킬과 MCP로 기본 `codex/gpt-6.1-sol` 에이전트를 실행했다. 기본 Codex의 ChatGPT 로그인과 공식 제공자 설정을 확인한 에이전트가 내장 image_gen 편집으로 A: 하늘 중심 (로컬 시안; [배포 검증 기록](hero-sunset-study-2026-10-12/release-report.txt))과 B: 수면 비중 증가 (로컬 시안; [배포 검증 기록](hero-sunset-study-2026-10-12/release-report.txt))를 생성했다. 별도 API 키/CLI 과금 경로는 사용하지 않았다. 이전 pooled 중계기의 이미지 편집 405 오류는 기본 Codex 경로의 생성 실패로 일반화하지 않는다.

두 출력은 1672×941px이며 주 에이전트도 이미지를 직접 확인했다. A 수면 경계는 약82%, B는 약74%로 B의 목표70%에 미달한다. 방파제는 제거됐으나 원본의 섬·구름 세부가 재구성되고 주황빛이 강해졌다. 정확한 원본 픽셀 보존이나 목표 구도 완전 충족을 주장하지 않는다. [실제 프롬프트와 생성 기록](hero-sunset-study-2026-10-12/generation-method.txt)에 재시도와 한계를 기록했다. 새 외부 시각 자료 채택, 제품 코드 변경, 배포는 수행하지 않았다.


## 2026-10-12 — 승인 A의 사이트 히어로 통합

사용자의 첨부 메인 화면과 승인 A를 시각적 기준으로 채택했다. DESIGN.md의 중립 캔버스·Pretendard·Nav 틀을 유지하고, 사이트 전용 `src/app/hero.module.css`에서 사진 가장자리를 테마 배경으로 연결했다. 기존 Button과 테마 제공자를 그대로 소비한다. 수면의 제한된 CSS 움직임은 사용자 승인된 사이트 장식이며 공유 토큰 규칙으로 승격하지 않는다. 새 외부 시각 자료 검색이나 영상 생성 API는 사용하지 않았다.

실제 도구: frontend-reference-workflow revision 2026-10-02.1, Impeccable context/craft-floor/detect, 기존 Next 의존성 sharp(WebP 변환), Playwright Chromium 및 axe, Paseo 로컬 미리보기, 코드 리뷰. ffmpeg의 libwebp 인코더는 없어 sharp로 변환했다. 당시 계약·검증 보고서·라이트/다크 캡처는 로컬 기록으로 보존하며, 공개할 최종 상태는 [배포 검증 기록](hero-sunset-study-2026-10-12/release-report.txt)에 정리했다.

빌드·타입 검사·변경 파일 lint·46개 테스트 통과. 390/1440/2560px 다크/라이트와 추가600px 가로 모바일 확인. 코드 리뷰의 수면 마스크 좌표 문제를 수정하고 재측정했다. 기존 html lang 누락, 라이트 프로젝트 태그14개 대비 부족, 로컬 영어 경로 리디렉션 문제는 미해결로 유지한다. 사이트 전체 접근성·모든 언어·실기기 검증 완료를 주장하지 않는다. 공유 패키지 변경/게시와 사이트 배포는 하지 않았다.

## 2026-10-12 — 히어로 사각 경계 제거 및 라이트 테마 재구성

사용자가 첫 통합의 흐릿한 사각 경계, 특히 라이트를 지적하고 조사·구현을 승인했다. 좌우 마스크와 폭 상한을 제거하여 풍경을 뷰포트 끝까지 채웠다. 위아래만 다중 스톱 alpha 마스크로 연결하고, 수평선은 약72svh에 유지해 와이드에서 바다보다 하늘을 우선한다. 이미지 평면의 원본 비율과 수면 마스크 좌표를 일치시킨다. 공유 중립 토큰·Pretendard·Nav·Logo와 프로젝트 구성은 그대로 소비한다.

구체적인 gap → 원문 → 채택:
- 테마와 사진의 부조화 → [web.dev Learn Design: Theming](https://web.dev/learn/design/theming), Google 공식 교육 본문 전체 → 라이트/다크 전용 이미지 선택. 예제의 OS 미디어쿼리는 사이트의 사용자 선택 `.dark`에 맞춰 CSS 변수로 조정. 첫 로드에는 해당 테마의 WebP 한 장만 요청됨을 실제 네트워크 항목으로 확인했다.
- 선형 페이드 시작/끝 경계 → [Andreas Larsen, Easing Linear Gradients](https://css-tricks.com/easing-linear-gradients/), 제작자의 설명·데모가 있는 본문 관련 부분 → 완만한 양끝 alpha 스톱을 직접 CSS로 작성. 라이브러리/플러그인 코드는 도입하지 않았다.
- 테마별 배경 연결 → [Ahmad Shadeed, CSS Masking](https://ishadeed.com/article/css-masking/), 제작자 본문 hero fade 예제 → 색상 고정 오버레이 대신 배경 자체를 드러내는 mask 채택. 2023 문서의 과거 지원 범위는 현재 근거로 사용하지 않았다.
- 마스크 동작/지원 → [MDN mask-image](https://developer.mozilla.org/en-US/docs/Web/CSS/mask-image), 본문 관련 부분 → alpha visibility 및 최신 baseline 설명 확인. 좌우×상하 intersect 대신 단일 세로 마스크로 수정.

4개 원문 본문을 research-router fetch.py/local-extract로 수집하고 inspect-extract로 읽었다. 발견은 native web search 4쿼리. 공식 지침2개와 직접 제작기2개이며 유행/인기도 측정은 아니다. 원문 접근일2026-10-12. CSS-Tricks/공식 문서의 발행·갱신일은 읽은 본문에서 확인하지 못해 미상으로 둔다. Shadeed 검색 메타데이터는2023-03-30이나 본문에 날짜가 없어 발행일 확정 근거로 사용하지 않는다. 원본 캡처: /tmp/naeil-hero-seamless.JzWDQY/result.json 및 /tmp/naeil-hero-mask-reference.FXQpSk/result.json. 선택한4건 모두 수집 성공(wrapper exit0); 첫8,000자씩 관련 본문을 읽었으며 theming은 전체를 읽었다. 다른 플랫폼은 이 구체적인 CSS/테마 결정에 불필요하여 검색하지 않았다.

라이트 이미지는 이전과 같은 Paseo 기본 Codex 에이전트가 ChatGPT 로그인·내장 imagegen으로1회 편집했다. 별도 유료 API/영상 생성은 사용하지 않았다. [생성 기록](hero-sunset-study-2026-10-12/light-generation-method.txt) 및 라이트 원본 (로컬 시안; [배포 검증 기록](hero-sunset-study-2026-10-12/release-report.txt))을 보존한다. 섬 내부 질감 일부가 재구성되어 픽셀 동일성은 보장하지 않는다. 기존 Next의 sharp로 WebP변환(라이트141,470bytes, 다크106,588bytes).

실제 도구: frontend-reference-workflow revision 2026-10-02.1, Impeccable polish 절차의 화면/흐름/상태 검토와 국소 수정, Playwright Chromium/axe, Paseo 미리보기, 독립 코드 리뷰, Next 빌드·ESLint·46개 테스트. 기존 detect 기록은 첫 통합 결과이며 이번 실행으로 재표기하지 않는다. 2차 검증 보고서 (로컬 시안; [배포 검증 기록](hero-sunset-study-2026-10-12/release-report.txt))에 새 증거·해시·기존 미해결 사항을 구분했다. 외부 디자인 서비스/공유 패키지 변경/사이트 배포는 수행하지 않았다.

## 2026-10-12 — 실제 수면 영상으로3.2초 시네마그래프 구현

사용자가 Flixel 같은 실제 물결의 반복 영상을 최종 목표로 재확인하고, 현재1.9초 원본으로 제작을 승인했다. 기존 CSS 사진 이동을 제거하고 사용자 원본의 실제 수면을 카메라 보정·색 맞춤·앞방향 겹침·감속으로3.2초 루프로 편집했다. 승인A의 하늘/섬/태양과 양 테마 레이아웃은 정지 이미지로 유지한다. MP4는 수면1280×130만 포함하며 dark약1.23MB/light약1.50MB 중 해당 테마 하나를 요청한다.

실제 사용: 로컬 FFmpeg, 격리된Python/OpenCV/NumPy, frontend-reference-workflow 및 Impeccable animate/craft-floor 절차, Chromium/WebKit, Paseo 재생 상태 확인, 독립 코드 리뷰, Next build/ESLint/기존46테스트(당시 keyed 준비상태 리팩터 이전 실행; 리팩터 후 브라우저·빌드·lint 재확인). 새 외부 자료 조사, Flixel 서비스/API, AI영상 생성, 유료API, 외부 업로드는 사용하지 않았다. 원본 영상의 물결을 활용한 로컬 합성이다. [최신 제작·배포 검증 기록](hero-sunset-study-2026-10-12/release-report.txt), [재현 스크립트](hero-sunset-study-2026-10-12/cinemagraph/build-loop.py), [브라우저 결과](hero-sunset-study-2026-10-12/cinemagraph/browser-results.json)에 증거와 남은 한계를 기록했다. 정지 상태에서 테마를 왕복할 때 준비 상태가 재사용되던 리뷰 지적을 고치고 회귀 시나리오를 검증했다. 공유UI 변경/게시/사이트 배포는 수행하지 않았다.


## 2026-10-12 — Opus5.5 리뷰 후 루프 보정·배포 준비

독립 Opus5.5 리뷰에서 확인한 중복 프레임 끊김, crossfade 질감 감소, 실패한 테마가 정상 테마를 일시정지시키는 문제를 수정했다. 원본 앞48프레임 안에서 유사한 겹침 구간을 선택하고 고주파 분산을 보존하여 합성한다.3.2초 길이와 승인된 구도·색은 유지하며 CRF18 재평가로 dark883,370bytes/light1,012,025bytes로 줄였다. 검증은 최대 인접차를 정상값으로 간주하지 않고 일반 구간 중앙값, 최저 프레임 변화량과 프레임별 질감에 기반한다.

큰 로컬PNG/MP4시안은 지우지 않고 Git에서 제외했다. 생성 프롬프트·원본SHA·제작script·의존성버전·최종JSON과 생산에셋은 보존한다. 원본MOV는 사용자제공 사유파일로 별도 확보가 필요하며 공개하지 않는다. [재현 방법](hero-sunset-study-2026-10-12/cinemagraph/README.txt), [배포 검증 기록](hero-sunset-study-2026-10-12/release-report.txt)에 최종결과와 미확인 범위를 기록한다. 이 수정은 사용자에게 공개사이트배포까지 승인받았다. 실제 배포 여부는 해당 최종 기록을 따른다.
# Navigation/footer convergence — 2026-10-13

- Gap: independent website and Naeil Home headers; existing shared Nav required Next/next-intl while Home uses React/react-i18next.
- Inspected: authenticated live Home header and AI dropdown through Aside REPL snapshots + screenshot, existing shared Nav/Footer source, and preserved Home Header source. Existing DESIGN.md remains the visual authority.
- Adopted/adapted: one configurable React-only Navigation/SiteFooter core, native navigation links in Radix Popover, Radix mobile Dialog, product-owned route/auth/i18n adapters and frame widths. Home's product routes appear only as synthetic Storybook data. Its 1600px cap and operating data are not shared defaults.
- Executed: Impeccable context and extract workflow; local core extraction + compatibility adapter migration + docs. No Refero, 21st, Component Gallery or Kinetics retrieval was executed; no new visual direction or missing external pattern required it.
- Files: src/components/ui/navigation.tsx, site-footer.tsx, compatibility nav.tsx/footer.tsx, shared styles, Storybook and docs/components/navigation.md. Live Home migration remains separate until the deployment source revision is established; see navigation-footer-integration.md.

## Navigation menu sample refinement — 2026-10-13

- Gap: Home and website menu entries had inconsistent icon presence, tight spacing and description underlines. User supplied three screenshots, selected the current naeil.dev project menu feel, then requested a working sample.
- Inspected source: user-attached naeil.dev menu screenshot; local Navigation/Nav, existing project icons in public/images, messages/ko.json and messages/en.json. No fresh live-site browser inspection or external design service was performed for this refinement.
- Adopted: icon/title/description hierarchy, title-adjacent status badge, product-colored icon tiles, roomy project catalog with two columns. Adapted to approved Pretendard 16/14px, neutral selected surfaces, 40px icon area, 44px minimum targets, one-column mobile and existing Radix keyboard behavior. Home keeps neutral functional icons and one desktop column. Shared tokens remain authoritative; screenshot dimensions and colors were not copied into shared foundations.
- Implemented with actual Navigation source and Storybook compositions. Standalone sample supplies existing project PNGs as embedded data URLs; Storybook uses Lucide substitutes, and product artwork stays outside the package. No generated image or external component retrieval.
- Instructions applied: repository frontend-reference-workflow 2026-10-02.1, installed workflow 2026-10-05.1, layout/verification references, previously loaded Impeccable context and current craft-floor. No full Impeccable critique/detector run claimed.
- Preview scope: port 6447 sample only; npm, naeil.dev and live Home remain unchanged. Evidence and checks in navigation-footer-integration.md.

## 2026-10-13 — naeil.dev actual site integration

- Scope: approved shared Navigation/SiteFooter applied to actual site source; home project area, blog list/article, login and explicitly included `/design`. Dedicated project bodies and live Naeil Home excluded. Existing hero/animal assets/full footer preserved.
- Gap → source → decision: actual consumer pages still had tiny type/custom badges, old blue design examples, missing route metadata and inconsistent control behavior → approved DESIGN.md, v2 spec/migration, Navigation contract plus directly captured naeil.dev before screens → shared primitives/tokens and site-owned purpose widths; no new external visual direction or component retrieval needed.
- Read repository frontend-reference-workflow 2026-10-02.1 and installed 2026-10-05.1, layout/verification references; instruction identities in `site-integration-evidence/instruction-hashes.json`. Executed Impeccable context once, polish procedure (source/actual screenshot review, bounded corrections) and one mechanical detector pass (empty findings); later focused fixes were linted/reviewed/browser-checked. Existing design authority overrides generic playbook aesthetics. Aside guide/REPL guide read, but this task used repository Playwright rather than an Aside session.
- Actual tools: gpt-6.1-sol implementation workers and cross-worker reviews; local Next production preview, Chromium/WebKit, axe, pnpm build/types/scoped ESLint/unit/package/consumer/Storybook/contrast. A fresh fourth review thread was unavailable; no other review model execution claimed. No Refero/21st/Component Gallery/Kinetics fetch or image generation was performed.
- Main inspected production-before/local-after desktop/mobile themes and real menu/article/type screenshots. Fresh checked scopes, fixes, hashes, remaining limits and private preview 6448 are in [the integration report](naeil-site-integration-2026-10-13.md). Production site/npm/public Storybook/Home were not deployed. Previous sample evidence is not relabeled as actual-site validation.


### Desktop hover follow-up (2026-10-13)

User feedback restores mouse-hover opening in the shared Navigation. Mouse click does not pin the menu; leaving the trigger/panel dismisses it after pointer-travel tolerance. Keyboard and touch remain supported. Internal DESIGN/token/Radix implementation and actual Playwright browser results are the sources; no new external design lookup, Aside session or imagery generation. Existing implementation agent independently reviewed multiple-group focus behavior. See `docs/design/naeil-site-integration-2026-10-13.md` and the separate `site-integration-evidence/hover-*` evidence for final validation and source hashes. Site review port6448 and standalone sample6447 are updated; production/npm/public Storybook remain unchanged.


### Production application completed — 2026-10-14

User authorized commit/PR/merge/deployment. PR #5 merged as `00a17a81264dba43266f5670453f6585669f7384`; Vercel Production deployment7049743975 succeeded for that SHA. PR and main CI both pass (51 unit tests;263 browser tests pass,4 conditional forced-colors cases skipped). Linux CI includes Firefox navigation coverage; actual-site coverage is Chromium/WebKit. On https://naeil.dev,288 route conditions,48 hover/touch/keyboard conditions,20 axe audits,4 interaction flows and21 route metadata checks pass. Existing project bodies and hero source are unchanged. Full provider login, physical devices and VoiceOver remain unverified. No npm publication, public Storybook deployment or Naeil Home change. New production evidence is retained separately in `docs/design/site-production-2026-10-14/README.md`; post-deploy records are included in the user-requested workspace closeout.


2026-10-14 title follow-up: user changed the official naeil.dev metadata spelling to `.naeil`, including the leading period. Rules in DESIGN/AGENTS/v2-migration and actual Next/social metadata are synchronized. PR #6 / production `a111e90` deployed successfully;60 actual production title/social/canonical cases and client/back/locale flows pass. See `docs/design/dotted-site-title-2026-10-14/README.md`. Earlier `naeil` validation records remain dated history.


2026-10-14 workspace closeout: user requested preserving all remaining production verification records in the repository and stopping the local review service. Port3010 Next preview stopped; only its Tailscale HTTPS6448 proxy was removed. Home2455, default443 and the separately approved sample6447 proxy were left unchanged. Start the next login task from updated main in a new workspace; actual provider sign-in/session/logout remains the first unverified flow. Closeout changes documentation/evidence only, with no runtime/package changes.

## 2026-10-15 — actual whole-header extraction

User instruction: “공통화로 해.” Incumbent sources actually read: live naeil.dev/ko and /ja, current remote-main Nav/NavWrapper/SiteControls/Navigation/public CSS, DESIGN and package exports. The older default worktree/main checkout were excluded as source authority. New independent worktree starts fromb667a848. Adopted the actual full composition as optional NaeilHeader; keep generic Navigation and body widths distinct. Public images remain official URL references because THIRD_PARTY_NOTICES does not clear redistribution. No external design catalog, AI image generation or new palette/motion direction was used.

Applied frontend-reference-workflow installed2026-10-05.1 plus project2026-10-02.1 layout/verification guidance; Impeccable context/extract/craft-floor within DESIGN. Actual CLI/browser/test results and hash inventory are in docs/evidence/shared-naeil-header-2026-10-15. Context found no PRODUCT.md, permitted narrow incumbent extraction; no init/redesign was performed. Package imports/Storybook/rendered comparisons are separate checks.

## 2026-10-16 — shared 1600px frame and adoption guidance

- Gap → inspected source → decision: the owner preferred Naeil Home's width and asked to update the design system; its actual frame/gutters were inspected with Paseo at mobile/desktop sizes. The approved decision now promotes 1600px plus `clamp(16px, 2.4vw, 40px)` to shared frame defaults, with 640px reading/settings and 480px short forms retained. This supersedes the earlier product-only width decision, without rewriting its dated evidence.
- Read Carbon's [2x Grid overview](https://www.carbondesignsystem.com/building-blocks/foundations/2x-grid/overview), WCAG [Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) and [Visual Presentation](https://www.w3.org/WAI/WCAG22/Understanding/visual-presentation.html). Adopted task-specific content widths and reflow principles; 1600px is an owner-approved package decision, not a claimed universal standard.
- Shared reuse: actual Navigation/SiteFooter/NaeilHeader, generated tokens/CSS, new application frame class, Storybook and installed 0.5.0 candidate examples. Fixed stale example-version guidance and added validation before fixture rewriting. Current application-layout documentation includes root composition, consumer AGENTS rules and rollout checks.
- Actual tools: repository frontend-reference-workflow 2026-10-02.1; Impeccable 4.4.0 context/layout/craft-floor and one scoped detector pass; Paseo reference inspection, Playwright Chromium/Firefox/WebKit, local builds/contrast/packed consumers and independent code review. Aside attach timed out, so it is not claimed as the successful inspection. No external design catalog retrieval or image generation was performed.
- [Verification, screenshots, scripts and instruction/source hashes](application-frame-2026-10-16/README.md) distinguish shared package success from the website's missing-auth-environment runtime block. Previous live Home accessibility/adoption findings remain open. No registry publication or site deployment.

## 2026-10-17 — Console account and language integration

- Existing DESIGN.md, deployed UI0.7.1 and the shared header/account/footer contract remain the visual authority. No new visual direction, copied account menu or package style change. The isolated invitation response keeps its established CSP/confirmation composition and adds ko/ja/en with licensed Noto Sans JP files for Japanese text.
- Applied Impeccable context once, harden/craft-floor and one scoped detector pass on the site account/login/invitation files (exit0, no findings, before the final outage-recovery addition). Subsequent recovery UI and race corrections received source review, unit/browser regressions and scoped axe checks; no second detector pass is claimed. Ran the actual built Next app with synthetic Auth transport in Playwright at390/768/1440/1920, both themes and all supported languages; inspected selected mobile/desktop captures. The cross-app result document records the final rerun and exact evidence.
- Read Aside guides and attempted to attach the existing hosted Supabase settings tab; Page.enable timed out, so hosted settings are **not** verified. No Refero/21st/Component Gallery/Kinetics lookup, image generation, live OAuth login or real email delivery occurred. Official artwork remains referenced by URL and is deliberately network-blocked in local browser fixtures.

## 2026-10-28 — canonical Home profile candidate

- Authority: `docs/superpowers/specs/2026-10-28-canonical-home-chrome.md` rev 3, DESIGN.md, immutable B1 0.7.2 (`40a3928`) and the reviewed Home chrome measurements. This is an additive whole-header profile, not a new visual direction. Keep 1600px frame/gutters, purpose-specific body widths, toolbar, motion and footer invariants; only D1–D4 are allowed Home differences.
- Reuse: existing NaeilHeader/NaeilFooter, Navigation, Radix layers, vitest, Playwright and clean packed React/Next consumers. Actual tools: frontend-reference-workflow 2026-10-05.1, Impeccable context/craft-floor, package/browser checks and one detector pass. No external component catalog or image generation was needed.
- Evidence: `~/.local/share/naeil-home-evaluations/shared-chrome-20261027/canonical-impl/` retains the failing baseline, B2 one-shot HTML/screenshots/deployment identity, B3 measurements, paired metrics/images and commands. Matrix: ko/en/ja, both themes/auth states, 320/390/1440/1920 and the container boundary; existing 2560 frame checks remain. Candidate images require human review and never replace B1 expectations. Reported failures and unrun independent review remain open acceptance items.
