# naeil.dev 통합 로그인 전환 — 인계 (2026-10-22 JST)

이 문서는 이전 메인(`dccf8f5a`)이 중단된 뒤 방향을 바로잡은 기준이다. 아래 "결정"은 사용자가 확정한 것이고, "설계"는 사용자가 승인한 방향이다. 이전 문서의 "SSO·전역 logout·공유 세션 cookie 제외" 조건은 **폐기**됐다.

## 1. 결정 (사용자, 2026-10-22)

- 목표: **naeil.dev 아래 모든 서비스(`naeil.dev`, `abestimate.naeil.dev`, `jev.naeil.dev`)가 한 번의 로그인·로그아웃으로 같이 움직이고, 접근은 서비스별 권한으로만 제한한다.**
- Home Console은 `https://jay-macmini-2.tail165003.ts.net:2455`에 두며 naeil.dev와 별개다. 공유 cookie 범위에 넣지 않는다. 중앙 권한표 관리 화면으로만 쓴다.
- 이전 에이전트의 서비스별 relay/nonce/PKCE·OP01–03 계약 협상·Jev 시작 환경(XPC_FLAGS) 보존 carrier·A2 VM은 중단한다. 재개하지 않는다.

## 2. 실패 원인 (재발 방지)

- 6월부터 운영된 공유 로그인(`src/lib/auth/cookie-domain.ts`: `.naeil.dev` cookie, `src/lib/auth/redirect.ts`: 서브도메인 복귀 허용)이 있었는데, 2026-10-15 이후 명세가 "SSO 없음"을 반복했다. 이 브랜치의 커밋 `2b28356`이 `src/lib/supabase/{server,middleware}.ts`에서 `domain: undefined`로 공유를 없앴다.
- 목표를 확인하지 않고 그 위에 앱별 세션을 쌓아 수천 건의 검증을 했다. 기술 문제를 풀기 전에 완료 기준(아래 5절)을 사용자 기대와 맞춘다.

## 3. 현재 실제 상태 (갱신 2026-10-23 JST, 9절 후속 작업 후)

| 대상 | 상태 | 근거·재확인 |
| --- | --- | --- |
| naeil.dev 운영 | `c076391`을 PR #12로 main에 병합(`e757f8d`, tree 동일) → main 자동 Production 배포 `dpl_E2DbDEwpGrfW6yRyRyw1uK2pVawB`(이전 승격본 `dpl_HALKpQfMDXVxZgU76h5tDLg1Wk1k`). 이후 main 병합마다 identity가 바뀌므로 현재값은 `/.well-known/naeil-ui.json`으로 확인. 첫 사용자 로그인 실패 원인(10/17 이전 apex host-only 세션 cookie가 callback 갱신 실패→PKCE verifier 삭제)을 `c076391`에서 수정. Supabase 기본 cookie `sb-dathsxdsaxooifnxjket-auth-token`을 `Domain=.naeil.dev`로 씀(`site-session.ts`/`cookie-domain.ts`). generation/epoch namespace 제거. relay는 `console`만 남김(abestimate·jev 404). 이전 미커밋 relay/invite 소스는 `a75355c`에 커밋. Vercel CLI는 로그아웃 상태(device 승인이 자동화 브라우저에서 막혀 Git 연동 사용). | `/.well-known/naeil-ui.json`; 실제 로그인 Set-Cookie Domain은 사용자 브라우저 확인 대기 |
| Estimate 운영 | `current → releases/d7cf07ac8703-299ddf258ebe`(공유 세션, 앱 registry·relay·비밀번호 제거). control 래퍼 `executeStop` finalized → launchd plist에 공개 `NAEIL_SUPABASE_URL/ANON_KEY` 추가 → bootstrap. 래퍼는 더 이상 쓰지 않음(파일 보존). 보존: `~/.local/share/estimate-local-preservation/shared-session-20261022T160827`(data.tar·plist·이전 current). | 익명 `/estimates`→307 naeil.dev/login?next=…, `/api/state` 401. Aside(기존 공유 세션)에서 재로그인 없이 목록 2건 표시 |
| Jev 운영 | `~/.local/share/jev/app` = release `20261022T025857Z-shared-session`(`552f3ec`, 비밀번호 인증 제거). `server.env`에 공개 Supabase 키 2개 추가. 보존: `releases/server.env.before-shared-session-20261022T160850`, `releases/state.before-shared-session-20261022T160850.sqlite`, 이전 app은 release의 `previous-app`. | 익명 `/`→307 naeil.dev/login, `/api/session` 401. Aside에서 권한 없음 화면 확인 |
| 중앙 DB | `jev` 서비스 verified(06:53:32Z, SQL editor UPDATE 1건). Jay(`1d74e8f7…`, hajae8378@gmail.com) 권한 `[abestimate,jev]` — 2026-10-22 정식 `console_set_access`를 Jay 관리자 claims로 호출(version 3→4, audit `7e1c38e8…`, operation `9c50ffe8…`). 실행 중 Home Console(2455)에는 권한 관리 모듈이 배포돼 있지 않음(`/api/console/*` 404). GitHub 로그인 계정 `5c21a77d…`(jaymini1022@gmail.com)을 일반 회원(active)으로 추가하고 같은 함수로 `[abestimate,jev]` 부여(version 1, audit `19f5cce9…`) — 사용자 요청 "github도". 두 계정은 별도 사용자이며 Estimate 데이터는 공유 저장소라 같은 목록. 되돌리기: `console_set_access(…,[],version,…)`. | `select … from public.console_grants` |
| 에이전트 | 실행 중 없음. 9절 후속 작업은 메인(`9fdeaa1e`)이 직접 수행(하위 에이전트 없음). 이전 에이전트는 재사용하지 않음. | `paseo` list_agents |
| 수용 확인(Aside, Jay 브라우저, 2026-10-22 ~21:10 JST) | Jev 403 → 권한 부여 → 같은 세션 즉시 200. Jev 로그아웃 → 세 서비스 로그아웃. Estimate 출발 Google 로그인 → Estimate 목록 복귀, 세 서비스 로그인(기존 데이터 1사·2건). Estimate 로그아웃 → 세 서비스 로그아웃. Jev 출발 GitHub 로그인 → Jev 복귀(GitHub 계정은 별도 사용자 jaymini1022@gmail.com이라 처음엔 Estimate·Jev 403 — 회원 추가·부여 후 Estimate 출발 GitHub 로그인 → 목록 복귀, 세 서비스 200). naeil.dev 로그아웃 → 세 서비스 로그아웃. Estimate CSRF 없는 DELETE 403. 사용자: GitHub 로그인 성공(Supabase pkce 200). 미확인: Estimate 실제 저장(업무 데이터 무쓰기 원칙으로 미시험), `*.naeil.dev` 전체 DNS(Cloudflare). | 이 문서 |

## 4. 작업 위치 (보존할 미커밋 변경 포함)

- 사이트: `/Users/jaymini/.paseo/worktrees/28nele6j/naeil-account-language`, branch `integrate/console-account-language-site`, HEAD `02aa72e` + 미커밋(invite·proxy·next.config 등). 운영 배포본과 같으므로 임의로 되돌리지 않는다.
- 공유 UI 최신: `/Users/jaymini/.paseo/worktrees/28nele6j/pure-chicken` (UI 0.7.1, `NaeilHeaderAccountControl`).
- Estimate 인증: `/Users/jaymini/.paseo/worktrees/1bnldk74/estimate-account-language`, branch `integrate/console-account-language-estimate`, HEAD `860e79b` + 미커밋 6개. 운영 UI 기준: `.../1bnldk74/estimate-v1`.
- Jev 인증: `/Users/jaymini/.paseo/worktrees/3tl6a87q/jev-account-language`, branch `integrate/console-account-language-jev`, HEAD `2fc435a` + 미커밋 3개.
- Home Console: `/Users/jaymini/projects/naeil-home-console-access` (권한표 관리; 변경 대상 아님).

## 5. 설계 (승인됨)

1. 로그인은 `https://naeil.dev/login?next=<원래 URL>` 한 곳. 기존 `canonicalRedirect` 허용 목록을 사용한다.
2. 세션은 기존 Supabase cookie를 `Domain=.naeil.dev; Path=/; Secure; SameSite=Lax`로 공유한다(`cookie-domain.ts` 복원). 모든 서비스가 같은 `@supabase/ssr` cookie 옵션을 쓴다.
3. Estimate·Jev는 서버에서 공유 cookie를 읽어 `supabase.auth.getUser()`로 검증한다. 앱 자체 세션 registry·relay·nonce·PKCE는 제거 대상이다.
4. 로그아웃은 어느 서비스에서든 `signOut()` 후 공유 cookie를 삭제한다. 다른 서비스도 다음 요청부터 로그아웃 상태다.
5. 권한은 기존 중앙 권한표를 각 서비스가 확인한다. 권한이 없으면 403 화면이다. 관리는 Home Console에서 한다.
6. 헤더는 `NaeilHeaderAccountControl`을 그대로 쓰고 로그인 링크·로그아웃 콜백만 연결한다.

전환 순서: 사이트 공유 cookie 복원(기존 relay 경로는 Estimate 전환 전까지 유지) → Estimate → Jev(+Jev 권한 부여) → 사용하지 않는 relay/세션 코드 제거.

## 6. 완료 기준 (실제 HTTPS, 같은 브라우저)

- naeil.dev에서 로그인하면 Estimate·Jev가 재로그인 없이 로그인 상태다.
- 어느 서비스에서 로그아웃해도 세 서비스 모두 로그아웃 상태다.
- 권한이 없는 서비스는 403이다. 권한을 부여하면 즉시 접근된다.
- Google·GitHub 둘 다 확인한다. Estimate 저장/이동/로그아웃 보호와 기존 데이터가 그대로다.

## 7. 보존·금지

- Estimate 업무 데이터·backup, Jev SQLite, 중앙 schema·Jay 권한을 보존한다. 운영 재시작은 기존 문서에 기록된 정상 종료→시작 절차를 따른다.
- 비밀값(.env, DB 비밀번호, token)을 읽거나 출력하지 않는다.
- Home/Baby 헤더, 언어 동기화, Estimate 번역, 새 인프라·DNS·도메인은 범위 밖이다.
- npm 게시나 공유 UI 재설계는 하지 않는다. UI 0.7.1 동결 archive를 덮어쓰지 않는다.

## 8. 미확인 (확인 방법)

- `*.naeil.dev` 하위 도메인이 모두 직접 운영 서비스인지: 공유 cookie의 전제다. DNS 레코드와 `docs/rollout/services.json`으로 대조하고, 결과를 보고한다.
- 현재 naeil.dev 운영본의 cookie Domain: 3절의 재확인 방법을 쓴다.
- Estimate 재시작 후 저장: Estimate 전환 수용에서 함께 확인한다.

## 9. 후속 작업 인계 (2026-10-22 ~22:00 JST, 사용자 승인 범위)

공유 로그인 전환(1–4단계)은 운영 완료·수용 확인됨(3절 "수용 확인" 행). 사용자가 아래 후속 작업을 이 조정대로 진행하도록 승인했다. **제외(사용자 보류):** Estimate 실제 저장 확인, `*.naeil.dev` 전체 DNS(Cloudflare) 확인, Supabase callback 허용 목록의 esg·work 정리, Home Console(2455) console 모듈 배포(2455에는 권한 화면·`/api/console/*` 없음 — 미배포 상태가 정상), Google·GitHub 계정 병합(되돌릴 수 없어 제외).

1. **사이트 운영본을 main에 병합** — 운영 `dpl_HALKpQfMDXVxZgU76h5tDLg1Wk1k`는 branch `integrate/console-account-language-site` `c076391`(origin push됨)에서 Vercel Preview→Production 승격으로 배포. `origin/main`은 `ff37223`(공유 로그인·relay 정리·로그인 수정 없음). main push는 Vercel Production 자동 배포를 일으키므로 병합 전 그대로 두면 회귀 위험. PR(gh) 생성→main 병합→Production이 같은 내용으로 다시 빌드되면 `/.well-known/naeil-ui.json`·익명 Estimate/Jev 307·`/auth/return/console` 303·`/auth/return/{abestimate,jev}` 404 재확인. 병합 대상 diff에 미커밋 docs는 포함하지 않는다(8번에서 처리).
2. **Estimate·Jev 커밋 원격 보관** — `0e8931f`(estimate-account-language), `e1f1cee`(jev-account-language). **두 worktree 모두 git remote가 없다(2026-10-22 확인).** 원격 추가는 범위 확대이므로 사용자에게 대상 원격을 묻거나, 묻기 전에는 로컬 bundle(`git bundle`)로 보관만 한다.
3. **문서화** — 다른 *.naeil.dev 서비스가 같은 로그인을 쓰는 계약(같은 `@supabase/ssr` 0.9.0 기본 cookie `sb-dathsxdsaxooifnxjket-auth-token`·`Domain=.naeil.dev`, 서버 `getUser()`→`access_decision(service)`, 미로그인은 `https://naeil.dev/login?next=<절대 URL>`, 로그아웃은 `signOut({scope:'local'})`+공유 cookie 삭제, 권한 없음 403)을 pure-chicken의 `docs/components/application-layout.md` 인근 문서 한 곳에 짧게 추가. 참고 구현: Estimate `src/server/naeil-shared-session.ts`, 사이트 `src/lib/auth/site-session.ts`, `c076391`(10/17 이전 apex host-only 세션 cookie 대응).
4. **Estimate 정리** — 안 쓰는 control 래퍼 release `releases/control-auth-20261022-first`, `~/.local/share/estimate-control/`, 오래된 releases(총 28개). **보존:** 현재 `d7cf07ac8703-299ddf258ebe`, 직전 앱 `47c01d7c49f6-913e9847deb4`, `~/.local/share/estimate-local-preservation/` 전체, 데이터·backup·`~/.local/share/estimate/`. 삭제는 목록을 먼저 확정·보고 후 실행.
5. **Jev 정리** — `~/.local/share/jev/releases`의 오래된 release. **보존:** `20261022T025857Z-shared-session`(안의 `previous-app` 포함), `*before-shared-session-20261022T160850*`, `state.sqlite`. `server.env`의 `JEV_PASSWORD_FILE` 항목은 값 출력 없이 제거해도 됨(백업 존재), `password.json`은 보존.
6. **사이트 worktree 미커밋 문서** — 삭제 금지. 이전 작업 기록이므로 커밋(또는 한곳 보관)하고, `docs/rollout/evidence/**` 안 TypeScript 파일이 tsconfig/next build에 잡히지 않도록 `tsconfig.json` exclude에 `docs/rollout/evidence`를 추가한다.

**진행 결과 (2026-10-23):**
1. 완료 — PR #12 병합(`e757f8d`). 재빌드 후 익명 Estimate·Jev 307(`naeil.dev/login?next=`), `/auth/return/console` 303(정상 형식 nonce; 빈 query는 400), `/auth/return/{abestimate,jev}` 404, Aside에서 세 서비스 로그인 공유 확인.
2. 완료(로컬만) — `~/.local/share/naeil-repo-bundles/20261022/{estimate-0e8931f,jev-e1f1cee}.bundle`(`--all`, verify ok, `SHA256SUMS`). 원격 추가는 사용자 결정 대기.
3. 완료 — `docs/components/application-layout.md` "Shared naeil.dev login".
4·5. 완료 — 목록 `~/.local/share/naeil-repo-bundles/20261022/cleanup-manifest.txt`(Estimate release 26개+`estimate-control`, Jev release 6개). 삭제 대신 `~/.Trash/naeil-cleanup-20261022/`로 이동(휴지통 비우기 전 복구 가능). `server.env`의 `JEV_PASSWORD_FILE` 줄 제거(값 미출력, 현재 app 미참조, 백업 `releases/server.env.before-password-line-removal-20261022`), 실행 중 프로세스는 재시작하지 않음. Estimate·Jev health 200, 보존 대상 유지.
6. 완료 — 미커밋 Markdown 문서 커밋(`ce1567e`, `2128e3f`), `tsconfig.json` exclude에 `docs/rollout/evidence`(`75fe49c`), 로컬 `tsc`·`next build` 통과. 추적되지 않은 evidence 1,137개(32MB, Vercel/Next 소스 사본·source tarball 포함)는 공개 저장소에 올리지 않고 worktree에 그대로 두고 `site-untracked-evidence.tar.gz`로 보관.

계정 상태: Supabase 사용자 2명이 Console 회원 — Google `hajae8378@gmail.com`(`1d74e8f7…`, 관리자, `[abestimate,jev]`, version 4), GitHub `jaymini1022@gmail.com`(`5c21a77d…`, 일반, `[abestimate,jev]`, version 1). 권한 변경은 Supabase SQL editor에서 정식 `console_set_access`를 관리자 claims로 호출(3절 중앙 DB 행). Vercel CLI는 로그아웃 상태 — 배포는 GitHub 연동(push→Preview→대시보드 "Promote to Production", Aside로 가능).
