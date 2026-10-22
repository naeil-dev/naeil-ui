# Preview 배포용 Vercel 로그인 후속 — 2026-10-19

사용자의 “승인할게”로 [이전 적용 기록](auth-preview-application-2026-10-19.md)의 작업 전용 Vercel CLI 로그인을 승인받아 실행했다. **공식 승인 화면의 입력창과 Allow Access 버튼이 비활성화되어 인증 연결을 완료하지 못했다. 08:39 JST 최종 조회도 `No existing credentials found`다. Preview 생성 시도0·생성0이며 운영 전환은 미완료다.** 같은 배포나 로그인 승인을 다시 요청하는 상태가 아니다.

## 실행과 검증

- 승인한 위치 `/Users/jaymini/.local/share/naeil-auth-operator/vercel-preview-20261019`만 새로 만들었다. directory0700, CLI가 기록한 auth.json/config.json은 owner501·0600이다. `--global-config`로 기존 기본 CLI 인증/설정을 덮어쓰지 않았다. 파일 내용은 수동으로 읽거나 evidence에 복사하지 않았다. 최종 auth.json은3bytes지만 이것만으로 인증 상태를 판단하지 않았고, 동일 scoped CLI의 GET 실패를 근거로 삼았다.
- 고정 Node/CLI 및 로그인 소스 해시를 대조한 뒤 표준 Device Authorization 흐름을 사용했다. 첫 실행은 persistent Aside 연결에서45초 안에 결과를 얻지 못했고, 자신의 CLI/browser PID 종료 및 동일 config의 인증 부재를 조회한 후 같은 승인 범위의 연결 작업을 재개했다. 두 번째 실행은 새로 확인된 공식 URL의 동일 device request에서만 이어갔다. 로그인을 반복해서 성공시킨 것이 아니며, 성공한 인증 등록은 관측하지 못했다.
- 두 번째 화면에서 같은 기존 project/team 접근이 HTTP200으로 확인됐다. CLI가 발급한 code와 해당 입력 표시의 일치를 메모리에서만 비교했다. 한 차례 결과의 허용 버튼 이름 투영에 `Allow Access`가 빠져 있어 정보가 불충분했고, 자신의 정확한 login runner의 browser 자식 argv에서 동일 URL을 메모리로 이어받아 현재 snapshot을 다시 읽었다. 다른 프로세스·credential store·광역 탭 목록은 조회하지 않았다. 새 device request를 추가한 것은 아니다.
- 초기 클릭/입력 시도는 `Element is disabled`로 거부됐다. DOM을 읽어 INPUT.disabled=true, maxLength8, document.readyState=complete를 확인했다. 현재 탭을 새로고침하고 최대20초의 로딩 관찰 후에도 비활성 상태였다. 그 시점의 script106·fetch16 응답은200이었다. 이 제한된 정보는 페이지의 모든 코드 실행 성공이나 Vercel 원인 확정의 근거가 아니다. disabled 속성 제거, 인증 승인 API 직접 POST, token 수동 생성, 다른 인증 경로로 우회하지 않았다.
- 두 번째 CLI는 약10분 뒤 exit1로 종료됐다. raw 로그를 보관하지 않아 최종 오류 문구 자체는 보존되지 않았다. 08:39 JST의 후속 GET은 exit1/기존 인증 없음이며 자동 login이 시작되지 않았다. 종료된 PID와 별개로 과거 PID를 운영 제어에 사용하지 않았다. rescue helper도 정상 종료했다.
- 08:31 JST에 제품·진단 archive와 staging 전체 bytes/링크·config/project binding을 재대조했다. 제품 SHA256 `127208fc6ce7a616b1f87e8dd1840d2487b57991eacca89180cdb082a088be39`, 진단 `257077b992ccedac7ce349a9e4397ea440927d186987aedbb2b1e67f26c34df1`가 일치한다. 기존 빌드/테스트는 반복하지 않았다. 배포 helper에는 승인한 전용 config와 로그인 성공 guard를 연결했지만 배포 호출은 없다.

[안전한 증거 manifest](evidence/auth-preview-login-2026-10-19/manifest.json), [최종 인증 상태](evidence/auth-preview-login-2026-10-19/login-final-reconciliation.json), [artifact 재대조](evidence/auth-preview-login-2026-10-19/predeploy-artifacts.json)에 확인 범위를 남겼다. 제품 소스·운영 환경·schema·Jay/verified/grant·메일·native 서비스·fixture/volume·DNS/tunnel은 변경하지 않았다. 이전 manifest와 실패 기록은 보존했다.

## 브라우저 범위와 기록 제한

두 번째 실행과 rescue에서 새로 만든 탭은 각각 닫힌 결과를 확인했다. 첫 persistent 실행이 열었을 수 있는 탭의 정리는 미확인이다. 이를 찾기 위한 광역 탭 조회는 하지 않았다. 이전 민감 query transcript 사건의 보관/정리 상태도 해결됐다고 하지 않는다.

이번 transport 조사 중 Aside CLI 시작 안내의 계정 표시 식별자가 한 차례 도구 출력에 포함됐다. 그 값을 문서/evidence에 복사하지 않았으며 이후 raw 출력은 다시 차단했다. 비밀번호·access/refresh token·일회성 code/URL을 도구 출력이나 저장 evidence에 넣지 않았다. 해당 시작 안내가 대화 보관본에서 삭제됐다고 주장하지 않는다. 이 한계 때문에 무노출 완료라고 쓰지 않는다.

## 최소 재개 조건

자동화 브라우저에서 완료하지 못한 Vercel의 마지막 기기 로그인 확인을 사용자가 직접 수행할 수 있는지를 한 번 질문했다. 아직 답을 받지 않은 상태에서 새 device request를 만들지 않는다. 사용자가 준비되면 승인된 동일 전용 config로 새 유효한 공식 화면을 열고, 현재 대상 계정의 Allow Access 확인이 완료됐을 때 CLI의 실제 project GET으로 인증을 확인한다. 비밀번호·키·UUID를 채팅으로 요구하지 않는다. 단순히 버튼의 disabled 속성을 바꾸거나 기존 browser session의 token을 추출하지 않는다.

로그인이 완료되면 이전 승인대로 진단v2 Preview 한 번 생성→project/team/Preview/READY/alias 확인→제품 Preview 한 번 생성한다. 같은 승인을 다시 요청하지 않는다. 실제 ID/hostname이 생기기 전에는 probe binding 완료라고 하지 않는다. Production 승격·custom alias·hosted probe·환경 pull·Supabase 설정/회원/권한·실메일·운영 프로세스 제어는 추가 승인에 포함되지 않았다.

기존 Jay→Estimate 우선순위와 중앙 schema/Jay/verified/grant, Home 개인 관리자·canonical relay, 무강제종료 방식·전환 보존·독립 DB owner 복구 사실, OP-01–03 및 실제 HTTPS 수용 gate는 [기존 준비 보고서](auth-main-preparation-2026-10-19.md)대로 남는다. 새 초대 메일은 기존 Jay 연결 준비를 막는 선행조건이 아니다.
