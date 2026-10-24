# 통합 로그인 운영 마무리 — 새 메인 인계

작성: 2026-10-23 JST. 파일·에이전트·HTTP 최신 관측: 06:14–06:16 JST.

## 1. 최신 지시와 실행 범위

사용자는 이 대화에서 제안한 **아래 6단계 전체를 새 메인에게 인계하고, 그 범위의 미완료 작업을 자율적으로 이어서 수행**하도록 요청했다. 새 메인은 이후 후속 요청도 담당한다. 현재 작성자에게는 인계에 필요한 확인·기록만 허용했고, 후속 구현·운영 변경·새 에이전트 생성은 금지했다. 따라서 이 문서 작성 시점에는 새 6단계 실행을 시작하지 않았다.

목표는 naeil.dev·Estimate·Jev의 공유 로그인과 업무 사용을 검증하고, 코드 원격 복구 수단과 Home Console의 권한 관리 운영 경로를 갖추는 것이다. 공유 로그인은 이미 운영에 적용돼 있다. 이미 검증된 병합·로컬 백업·기존 정리를 처음부터 다시 수행하는 작업이 아니다.

지시 우선순위:

- 이번 인계 요청은 직전 제안의 6단계 실행을 대상으로 한다. 예전 `auth-sso-handoff-2026-10-22.md` §9에서 보류했던 **Estimate 실제 저장, 전체 하위 도메인 확인, 사용하지 않는 callback 주소 정리, Home Console 권한 관리 배포**가 이 6단계에 포함된다. 예전의 보류 문구만 보고 다시 계획 승인 대기로 돌아가지 않는다.
- **Google·GitHub 계정 병합 실행은 계속 보류**다. 마지막 제안은 두 계정을 당분간 유지하고, 통합 필요 여부만 별도로 결정하자는 것이었다. 이는 사용자에게서 계정 병합 승인을 받은 사실이 아니다. 현재 두 계정의 권한도 다르다.
- 비공개 GitHub 저장소의 소유자로 `naeil-dev`를 제안했다. 저장소 이름 `abestimate`, `jev`는 이 문서의 실무 권고이며 확정된 사용자 지정 이름은 아니다. 기존 저장소와 권한을 확인하고 이 범위의 통상적 선택으로 진행한다. 다른 소유자·공개 저장소로 바꾸어야 한다면 그 차이만 확인한다.
- 휴지통 정리는 백업·복원 검증 뒤 **기존 cleanup-manifest에 적힌 이번 이동물만** 대상으로 한다. 모든 휴지통 비우기, 기존 업무 데이터·검증 자료 삭제는 범위에 없다.

## 2. 실제 경로와 보호할 작업 상태

다음은 06:14 JST `git rev-parse`, `git status --porcelain=v1`, `git remote`로 직접 확인했다. 실행 전에 바뀐 것만 재대조한다. 예전 인계 §4의 HEAD·미커밋 개수는 오래된 스냅샷이므로 이 표를 기준으로 삼는다.

| 역할 | 경로 | 브랜치 / HEAD | 관측 상태 |
| --- | --- | --- | --- |
| 이번 인계 문서와 현재 main 기준 | `/Users/jaymini/.paseo/worktrees/28nele6j/fresh-penguin` | `investigate/missing-execution-session` / `0bed043` | 문서 작성 전 clean. 이번 새 인계 문서만 추가됨 |
| 이전 사이트 작업본 | `/Users/jaymini/.paseo/worktrees/28nele6j/naeil-account-language` | `integrate/console-account-language-site` / `2128e3f` | 추적 파일 변경 없음. `docs/rollout/evidence/` 아래 25개 미추적 디렉터리 보존 필요 |
| 복원한 이전 메인 작업본 | `/Users/jaymini/.paseo/worktrees/28nele6j/pure-chicken` | `docs/shared-login-contract` / `8c46c0e` | clean. main으로 이미 병합된 브랜치 |
| Estimate | `/Users/jaymini/.paseo/worktrees/1bnldk74/estimate-account-language` | `integrate/console-account-language-estimate` / `0e8931f` | clean, git remote 없음 |
| Jev | `/Users/jaymini/.paseo/worktrees/3tl6a87q/jev-account-language` | `integrate/console-account-language-jev` / `e1f1cee` | clean, git remote 없음 |
| Home Console 후보 | `/Users/jaymini/projects/naeil-home-console-access` | `feature/naeil-console-access` / `dd8fa93c` | clean, origin/upstream 존재 |

Git 공통 저장소는 사이트가 `/Users/jaymini/projects/design-system/.git`, Estimate가 `/Users/jaymini/projects/estimate/.git`, Jev가 `/Users/jaymini/projects/jev/.git`, Console이 `/Users/jaymini/projects/naeil-home/.git`이다. 같은 공통 저장소를 사용하는 다른 worktree의 브랜치·설정까지 함께 바뀔 수 있으므로 대상을 확인한다.

이전 사이트 작업본에는 추적되지 않은 검증 자료가 남아 있다. 이번 대화에서 백업 압축 파일 존재도 확인했다. 새 메인은 `git clean`, 전체 staging, worktree 정리를 통해 이 자료를 지우거나 공개 저장소에 일괄 추가하지 않는다. 새 소스 수정은 현행 main 또는 해당 서비스의 확인된 최신 브랜치를 기준으로 작업하며 과거 사이트 브랜치를 운영 main으로 덮어쓰지 않는다.

## 3. 완료 근거와 검증의 한계

### 기존 운영 반영과 문서

- 사이트와 `@naeil/ui` 저장소는 공개 GitHub `https://github.com/naeil-dev/naeil-ui`이다.
- [PR #12](https://github.com/naeil-dev/naeil-ui/pull/12): 운영 공유 로그인 소스 `c076391`을 main에 병합. 병합 커밋 `e757f8d`, 2026-10-23 01:56 JST. GitHub package/site 및 Storybook/browser checks SUCCESS를 이번 대화에서 직접 확인했다.
- [PR #13](https://github.com/naeil-dev/naeil-ui/pull/13): 공유 로그인 계약·이전 진행 문서·evidence 빌드 제외 설정 반영. 병합 커밋 `0bed043`, 02:42 JST. 두 checks SUCCESS, GitHub main도 `0bed043`임을 직접 확인했다.
- 공유 로그인 계약: 이 저장소 `docs/components/application-layout.md`의 `Shared naeil.dev login` 절. `tsconfig.json` exclude에 `docs/rollout/evidence`가 존재한다. 제품 동작의 재설계 요청은 없다.

### 06:15 JST 직접 HTTP 관측

| 요청 | 관측 |
| --- | --- |
| `https://naeil.dev/ko` | 200 |
| `https://abestimate.naeil.dev/api/health` | 200 |
| `https://jev.naeil.dev/api/health` | 200 |
| 익명 `https://abestimate.naeil.dev/estimates` | 307 → `https://naeil.dev/login?next=...` |
| 익명 `https://jev.naeil.dev/` | 307 → `https://naeil.dev/login?next=...` |
| `http://127.0.0.1:2455/api/console/services` | 404 |

`https://naeil.dev/.well-known/naeil-ui.json`의 공개 identity는 `dpl_DtdXGCDzkZTwBN5Q1AqQNxMABVAv`, UI `0.7.1`, contract `1`이었다. `sourceRevision`은 `development`로 나오므로 **이 응답 하나로 정확한 배포 commit SHA까지 증명했다고 쓰지 않는다**. 배포 SHA가 필요하면 GitHub/Vercel 배포 메타데이터와 대조한다.

이번 대화의 앞선 읽기 점검에서 `/auth/return/abestimate`, `/auth/return/jev`는 각각 404였다. 이전 메인이 확인한 console relay의 303은 정상 형식 nonce를 포함한 요청 기준이며 빈 요청은 400이었다.

Google·GitHub 실로그인, 세 서비스 로그인·로그아웃 공유, 권한 없음 403 → 부여 후 접근, 기존 견적 목록 2건 확인은 **이전 실제 브라우저 검증 기록**이다. 이 작성자는 기록을 읽었고 익명 HTTP를 재확인했으나 그 실로그인 흐름을 새로 실행하지 않았다. 근거는 `docs/rollout/auth-sso-handoff-2026-10-22.md` §3·6·9와 이전 메인 activity다. 실제 cookie Domain 확인, Estimate 저장·재시작 후 지속성, 전체 DNS는 여전히 미확인이다.

### 로컬 백업과 이미 수행한 정리

- `/Users/jaymini/.local/share/naeil-repo-bundles/20261022/`에 `estimate-0e8931f.bundle`, `jev-e1f1cee.bundle`, `SHA256SUMS`, `site-untracked-evidence.tar.gz`, `cleanup-manifest.txt`가 있다. 이번 대화에서 두 bundle의 SHA256 일치와 대상 커밋 포함을 독립 확인했다. 원격 보관은 아직 하지 않았다.
- 보관 위치는 이 Mac에 있으므로 원격 백업과 같지 않다. 조회 가능한 `naeil-dev` 저장소 중 Estimate/Jev 이름의 저장소는 발견되지 않았고 `naeil-home`은 PRIVATE였다. 외부 상태는 생성 직전 다시 확인한다.
- 기존 manifest의 33개 경로(Estimate release 26개 + control 디렉터리, Jev release 6개)는 원래 위치에 없고, `/Users/jaymini/.Trash/naeil-cleanup-20261022/`의 `estimate-releases`, `estimate-control`, `jev-releases`로 이동돼 있다. 아직 영구 삭제하지 않았다.
- `JEV_PASSWORD_FILE` 설정 키가 `/Users/jaymini/.local/share/jev/server.env`에 없음을 값 출력 없이 확인했다. 이전 작업에서 운영 프로세스는 재시작하지 않았다. 제거된 키는 현재 앱에서 미사용이라는 이전 검토 기록이 있다.
- 현재·직전 Estimate release, Estimate 데이터/보존 폴더, Jev 현행 release·`state.sqlite`·`password.json`의 존재를 직접 확인했다. 이것만으로 데이터 전체 무결성을 새로 검증했다고 쓰지 않는다.

### Home Console은 로컬 구현과 운영 배포를 구분

`/Users/jaymini/projects/naeil-home-console-access/openspec/changes/naeil-console-access/`에서 다음을 읽는다.

- `tasks.md` §2–4: 중앙 권한/API/관리 UI의 로컬 구현·검증 기록. §5의 과거 운영 보류는 당시 상황이며 이번 6단계와 대조한다.
- `management-verification.md`: API·DB 검증 범위와 기존 한계.
- `console-ui-verification.md`: 구현 상태, 로컬 mock 브라우저와 862 frontend tests 등의 과거 직접 검증, `Reproduction`의 재현 방법. 운영 인증과 연결됐다는 증거로 대신하지 않는다.
- `invitation-verification.md`: 초대 관련 소스도 후보에 포함됨을 파악하기 위한 자료. **실제 SMTP 발송·가입 정책 변경·초대 기능 전체의 운영 확장을 이번 권한 관리 배포의 추가 목표로 삼지 않는다.**

Home Console은 기존 tailnet의 `:2455` 서비스에 두고 `.naeil.dev` 공유 cookie 범위 밖에 유지한다. 기존 Home 로그인/라우팅/설정을 보존하면서 현재 중앙 권한표와 맞춰 배포해야 한다. 옛 후보 브랜치 전체를 최신 Home 운영본에 덮어쓰는 방식은 금지한다.

## 4. 세션·동시 작업과 충돌 방지

06:15 JST `paseo ls --global --background --json`과 개별 status/activity 관측:

- 이전 메인 `9fdeaa1e-e2b0-47e5-9032-320d9c308389`: **idle**, pending permissions 없음. 예약 재개용 `6af337b1-25cd-4a32-af30-943d40b5050d`도 **idle**. 이들이 이번 후속 6단계를 수행 중인 것은 아니다. 무턱대고 재개하거나 종료하지 않는다.
- 현재 작성자 `4f94e56e-4f2f-4926-b51c-5ed35bacce39`: 관측 당시 **running**, fresh-penguin에서 인계 확인·문서 작성만 수행. 이번 작업에서 새 하위 에이전트를 생성하지 않았다.
- **Home 관련 별도 작업** `5434858e-6800-4466-a4a3-4c842acd77bd`: 관측 당시 **running**, `/Users/jaymini/.paseo/worktrees/3qtenke4/chilly-meerkat`. 최근 activity는 Auto 라우팅의 모델/추론 강도 등록 방식 조사와 운영 `relaydock` 컨테이너 읽기 점검이다. 이 경로의 Git common dir도 `/Users/jaymini/projects/naeil-home/.git`다. 과거 관찰 예약 중단 기록은 있으나 에이전트 작업 자체가 종료됐다는 뜻은 아니다. **Console 통합·배포 전에 현재 담당 파일·컨테이너/포트 사용을 다시 확인해 충돌을 피한다.** 이 작업의 모델 라우팅 기능은 인계 범위 밖이다.
- `3b414662-0a74-423f-bb76-84bbe5069ee3`: 별도 Content Collector 로그인 유지 조사, rapid-fox에서 running. 범위 밖 작업이며 임의 중단하지 않는다.

세션 소실 원인: PR #13 병합 후 Paseo가 `pure-chicken` 워크스페이스 `wks_ee6c7fc83325e614`를 자동 보관하고 작업 폴더를 제거했다. 이 작성자가 Paseo 내장 recovery/import로 같은 워크스페이스·메인 agent ID·Claude session을 복구했다. 대화 파일 SHA256 보존, 작업 폴더·브랜치 복원, 활성 목록 복귀를 검증했다. `autoArchivedChangeRequestUrl`에 PR #13이 보존돼 같은 PR로 다시 자동 보관되지 않도록 하는 상태도 확인했다. 새 메인은 후속 PR 병합 후 최종 보고까지 workspace 상태를 확인한다. 다른 작업도 있으므로 Paseo 데몬 전체 재시작이나 기존 세션 일괄 종료로 해결하지 않는다.

## 5. 바로 실행할 순서와 완료 판정

시작 직후 §2 HEAD/status/remotes, §3 운영 identity/health, §4 실행 중 에이전트를 짧게 재대조한다. 차이가 있으면 담당 작업과 보호할 변경을 먼저 식별한다. 인수 확인·계획 재설명만 하고 멈추지 말고 **첫 미완료인 1단계 원격 보관을 진행**한다. 저장소 생성 권한 등으로 막히면 가능한 2단계 읽기 점검을 진행한다.

| 단계 | 실행 내용 | 완료 판정 |
| --- | --- | --- |
| 1. 원격 보관 | Estimate/Jev의 기존 원격·GitHub 저장소 유무와 권한을 확인하고, naeil-dev 아래 비공개 저장소에 운영 버전과 최신 소스 이력을 보관한다. 코드 저장소에 업무 DB·비밀 설정·검증용 사본을 섞지 않는다. 원본 Git 이력을 임의로 재작성하지 않는다. | 새 임시 clone에서 올린 refs/운영 버전과 최신 커밋을 확인하고 재현에 필요한 소스·의존성 경로를 검증. 두 원격 위치와 결과 기록 |
| 2. DNS·로그인 연결 | Cloudflare의 전체 naeil.dev 하위 도메인/외부 위임을 `docs/rollout/services.json`과 대조. 실제 cookie 옵션은 비밀값 없이 확인. Supabase callback 허용 목록의 esg/work 등은 사용 여부를 확인한 뒤 불필요 항목만 정리. | 공유 cookie 적용 대상의 운영 주체/주소가 명확하고, 필요한 callback을 보존. 설정 변경 후 Google/GitHub가 원래 서비스로 복귀하고 공유 로그인/로그아웃·403 동작 유지 |
| 3. Estimate 실제 업무 | 데이터 백업을 확인하고 명확히 구분한 시험 견적 하나로 생성·저장·수정·새로고침·재로그인·관리된 정상 재시작을 검증. 이동/로그아웃 시 미저장 보호 확인. 기존 견적·고객 데이터를 시험 대상으로 수정하지 않는다. | 기존 업무 데이터 보존, 시험 데이터 지속성, 미저장 보호. 검증용 데이터만 정리하고 결과 기록 |
| 4. Home 권한 관리 | §4 별도 Home 작업과 배포 충돌을 해소하고, §3 로컬 Console 후보를 현재 Home/중앙 권한표와 대조·필요한 부분만 통합해 기존 :2455에 배포. | 실제 관리자 UI의 권한 부여/회수와 서비스 접근 허용/거부 반영, 일반 사용자 관리 기능 거부. 관리자 본인 권한과 기존 사용자 권한 보존, 시험 대상만 변경·원복 |
| 5. CI 안정화 | 사이트 `.github/workflows/verify.yml`의 두 job에서 Playwright 설치가 25분 제한을 소모했던 실패 로그를 읽고 필요한 수정. 제한 시간만 늘려 원인을 덮지 않는다. 두 과거 PR의 재실행 후 SUCCESS는 이미 확인됨. | 수정에 맞는 검사를 실행하고 CI가 수동 재실행 없이 완료. 기존 package/site·Storybook/browser 검증 범위 보존 |
| 6. 정리·마감 | Jev 제거 설정의 적용을 다음 관리된 정상 재시작 때 확인. 1·3·4단계의 복원/운영 확인 뒤 manifest에 적힌 이번 휴지통 이동물만 정리. 실제 경로·버전·완료/보류를 문서에 최소 갱신. | 현행·직전 release, 업무 데이터, 복구 자료 보존. 서비스 health 및 변경 영향 범위 재확인. 변경·검증·제약·원격/산출물 위치 보고 |

2단계의 DNS는 **기존 레코드 확인과 잘못된 연결의 식별**이다. 새 인프라·도메인 추가나 제3자 소유 변경을 이 범위에 포함하지 않는다. 중요한 전제 불일치가 있으면 필요한 부분만 구체적으로 확인한다.

인증된 브라우저나 외부 계정 권한은 다음 세션에서도 유효하다고 가정하지 않는다. 연결 도구/실제 로그인 상태를 확인하고, 사용 가능한 브라우저 스킬과 도구로 수행한다. 권한이 막힌 항목만 남기고 독립 작업은 마친다. 데이터 저장·운영 배포는 이 단계의 한정된 목적에 포함되지만 계정 병합·실제 회원 권한의 무관한 변경·추가 삭제는 포함되지 않는다.

## 6. 보존 조건과 실행 원칙

- 기존 공유 로그인 결정은 `docs/rollout/auth-sso-handoff-2026-10-22.md` §1·5·6을 따른다. Estimate/Jev의 폐기된 앱별 세션·relay/nonce/PKCE 전환안이나 A2 VM 논의를 다시 시작하지 않는다. Home의 별도 개인 관리자 인증은 이 폐기 대상과 혼동하지 않는다.
- 각 저장소 `AGENTS.md`를 읽고, shared UI 변경이 필요한 경우에만 `DESIGN.md` 및 해당 구성 지침을 추가로 따른다. 이번 범위는 npm 게시·UI 재설계·Home/Baby 헤더·언어/번역 개선을 포함하지 않는다. UI 0.7.1 동결 archive를 덮어쓰지 않는다.
- 비밀값(.env/server.env 값, DB 비밀번호, token, cookie 내용)을 읽어 출력하거나 문서·커밋에 넣지 않는다. 이미 설정된 인증 수단은 비밀 노출 없이 사용한다. 설정 키 존재 여부/비밀이 아닌 cookie 속성과 HTTP 상태만 기록한다.
- 보호 대상의 정확한 이름은 기존 인계 §9와 `/Users/jaymini/.local/share/naeil-repo-bundles/20261022/cleanup-manifest.txt`를 읽는다. 특히 Estimate 현행 `d7cf07ac8703-299ddf258ebe`·직전 `47c01d7c49f6-913e9847deb4`, `estimate-local-preservation`, `~/.local/share/estimate`, Jev `20261022T025857Z-shared-session`(previous-app 포함)·before-shared-session 백업·SQLite·password.json, 중앙 회원/권한, 미추적 evidence를 보존한다.
- 새 메인은 계획·분할·통합·최종 검증을 책임지고 근거가 충분한 완료 작업을 반복하지 않는다. 범위 안 작업과 통상적 기술 선택은 자율적으로 완료한다. 확인이 필요한 것은 중요한 모호함, 범위 확대, 금지/보존 조건 변경, 명시되지 않은 파괴적 조치다.
- 분리할 실익이 있는 조사·구현·검증·리뷰를 위임한다. 가능하면 구현은 `gpt-6.1-sol`과 위험에 맞는 추론 수준을 사용한다. 현재 프로필/모델 가용성을 확인하고 담당 파일·검증 기준을 나눠 동시 편집을 막는다. 사용할 수 없으면 제한을 알리고 가능한 방법으로 진행한다. 새 메인이 결과를 직접 검토·검증한다.
- 중요한 진행·전제 변경을 알리고, 장애물이 있으면 가능한 독립 작업을 끝낸 뒤 미완료 범위와 최소 재개 조건을 보고한다. 완료 후 변경/결정 이유, 실제 검증, 남은 제약, 산출물 위치, 다음 우선순위를 보고하고 진행 문서만 최소 갱신한다. 요청되지 않은 개선은 계속 실행하지 않는다.

이 문서는 현재 로컬 fresh-penguin worktree에 저장한 인계 자료다. 아직 GitHub에 게시한 자료가 아니다. 이 경로를 정리하기 전에 필요한 기록을 새 작업 위치로 보존한다.
