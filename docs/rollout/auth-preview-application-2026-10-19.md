# 보호된 Preview 적용 착수 — 2026-10-19

사용자의 “응 진행해줘.”는 [준비 보고서](auth-main-preparation-2026-10-19.md)의 동결 제품·진단v2 산출물로 기존 프로젝트에 보호된 Preview를 최대2개 생성하고 상태를 조회하는 승인을 기록한다. **승인은 받았으나 CLI 기존 인증이 없어 배포 호출 전 중단했다. 생성 시도0, 새 Preview0, hosted probe0이다.** 준비 보고서의 “승인 없음”은 그 이전 시점의 기록이며 수정하지 않았다.

## 확인한 결과

- 07:25 JST의 사전 대조에 이어 07:32 JST경 두 archive와 staging의 모든 파일·내부 링크·file-map 참조·project binding·config·업로더 해시를 다시 대조했다. 제품2119파일/58링크/3980참조, 진단754파일/21링크/790참조가 동결값과 일치한다. 제품 archive는 `127208fc6ce7a616b1f87e8dd1840d2487b57991eacca89180cdb082a088be39`, 진단은 `257077b992ccedac7ce349a9e4397ea440927d186987aedbb2b1e67f26c34df1`이다. 빌드/기존 테스트는 반복하지 않았다.
- pinned CLI50.33.1의 기존 project GET을 두 번 시도했다. 첫 시도는 exit1/stderr60bytes이고 원문을 저장하지 않아 원인이 미확정이다. 두 번째는 `No existing credentials found`로 exit1이었다. `api` beta 표시는 안내 문자열이며 별도 beta 승인 gate가 아니다. 배포 명령은 호출하지 않았다.
- 실제 HOME/XDG 경로를 유지하고 agent 감지 환경·token override를 제거한 비TTY 실행으로 자동 login을 막았다. 원래 실행 환경에도 VERCEL_TOKEN/NOW_TOKEN이 없음을 존재 여부만 확인했다. credential 파일을 수동으로 열거나 새 login/token/link/pull/env pull을 수행하지 않았다. raw stdout/stderr는 메모리에서 분류 후 폐기했고 오류는 유한 허용 단어와 범주만 보관했다.
- 07:30 JST, Aside에서 해당 Vercel 설정의 새 탭1개와 이미 확인한 동일 origin project GET을 사용했다. HTTP200, 같은 project/team, nextjs/Node24.x, build/install/dev/output/root null, directoryListing false, `all_except_custom_domains`, autoExposeSystemEnvs=true가 유지됐다. 브라우저 인증과 CLI 인증은 별개임을 확인한 결과다. 광역 탭 조회·환경/credential endpoint 조회·raw snapshot/응답 저장 없이 소유 탭을 닫았다.
- 기존11 worktree HEAD/status와 diff-check를 대조했다. 이전 준비 보고서·evidence 추가 외 차이가 없고 기존227 evidence의 manifest/파일 해시가 일치한다. 소스·운영 프로세스·fixture/volume·설정·회원·grant·메일·DNS는 이 단계에서 변경하지 않았다. 기존 fixture 상태를 새로 조회하거나 종료한 것은 아니다.

현재 작업 scratch는 `/private/tmp/naeil-preview-apply-20261019-04q10r_c`/0700이다. [안전한 증거 manifest](evidence/auth-preview-application-2026-10-19/manifest.json), [보존 대조](evidence/auth-preview-application-2026-10-19/preservation-check.json), [CLI 결과](evidence/auth-preview-application-2026-10-19/project-before.json), [프로젝트 재조회](evidence/auth-preview-application-2026-10-19/browser-project-readback.json)에 범위를 기록했다. 이전 준비 manifest `0b8ae15fd651d7edda911a3c18287b29d12c593d93600efe80e307764c1a4130`는 보존했다.

## 최소 재개 조건: 배포 도구 로그인 추가 승인

새 인증 등록은 기존 Preview 승인에서 명시적으로 제외돼 있다. 따라서 계정이나 비밀을 찾아달라고 요청하지 않고, 다음의 **Vercel CLI 로그인1회**만 추가 승인 대상으로 제안한다. 아직 실행하지 않았다.

- 대상은 현재 브라우저로 접근한 Vercel 계정이다. 고정 CLI의 공식 Device Authorization 로그인은 access/refresh 인증을 발급하며 `openid offline_access`를 요청한다. 프로젝트 한 곳만 권한을 갖는 token이라고 설명하지 않는다. 이후 실제 작업은 승인된 project/team의 최대2개 Preview와 읽기 전용 조회로 제한한다.
- CLI가 지원하는 `--global-config`로 `/Users/jaymini/.local/share/naeil-auth-operator/vercel-preview-20261019`를 사용한다. 이 경로는 없고 기존 조상에 symlink도 없음을 확인했다. 승인 후에만 새 directory0700/umask077로 만들고 표준 CLI가 auth.json0600과 config.json을 기록하게 한다. 기존 기본 CLI 설정/인증을 덮어쓰지 않는다. 새 로그인은 hosted 환경변수·Supabase 설정·사용자 로그인 구현 변경을 포함하지 않는다.
- 공식 로그인 URL/일회성 code/token은 transcript·Git·일반 로그에 출력하지 않는다. 검증한 Vercel origin의 해당 새 탭에서만 진행하고 계정 선택/본인 확인이 필요하면 사용자의 브라우저 조작을 요청한다. 비밀번호·키를 채팅으로 받지 않는다. 로그인 실패·거부·대상 불일치면 배포를 시작하지 않는다.
- 새 인증은 위 비공개 위치에 보존하며 임의 삭제/계정 logout/세션 폐기를 하지 않는다. 별도 복원이 필요한 운영 데이터 변경은 없다. 나중에 연결을 제거할 때는 이 작업용 인증의 해제 범위를 확인하고 다른 세션/기존 파일을 건드리지 않는다. 승인받지 않은 credential 백업·복원도 하지 않는다.

로그인 성공 뒤에는 기존 Preview 승인을 다시 묻지 않는다. 동결 해시와 프로젝트/보호 설정을 재확인하고 진단v2 한 번 생성→같은 project/team의 Preview/READY 및 alias 효과 확인→제품 한 번 생성 순서를 유지한다. 결과가 불확실하면 GET으로 조정하며 생성 재시도를 하지 않는다. 실제 ID/hostname이 아직 없어 probe binding은 작성 완료로 처리할 수 없다. 생성 후 기존 동결 계획에 바인딩·재해시하고 접근/hosted probe 실행은 별도 적용 단위로 남긴다.

운영 인증 전환은 계속 미완료다. 기존 Jay→Estimate, 중앙 schema/Jay/verified/grant, Home 개인 관리자와 relay 선행 의존성, 무강제종료 방식·전환 보존·독립 DB owner 복구 사실, OP-01–03는 이전 보고서대로 남아 있다. 새 회원 초대 메일 준비가 기존 Jay 연결 준비의 선행조건이 되지 않는다. Production·provider·실계정·실메일·native 제어는 이번 Preview 승인 범위에 추가되지 않았다.
