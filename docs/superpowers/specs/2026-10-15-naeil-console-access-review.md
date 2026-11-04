> **Historical record preserved on 2026-11-04.** Original body below is unchanged from `35f750357f90fe24ec0ca8c51b8e98b89facd997`. This is a dated design/verification record, not an active execution plan or current deployment status. See the [project closeout index](../../design/project-closeout-2026-11-04.md) for disposition and current boundaries.

# Console 접근 관리 — 실제 구성 확인 결과

확인일: 2026-10-15. 범위는 읽기 전용 코드·배포 메타데이터·HTTP GET·로그인된 Supabase 대시보드 확인이다. 계정 생성, 초대 메일 발송, 로그인 시도, 설정 변경, 배포, 실제 견적 데이터 열람은 수행하지 않았다.

## 2026-10-15 기반 구현 후속 확인

최초 조사의 사실은 아래에 보존한다. 이후 승인된 구현에서 중앙 권한 DB를 별도 Home worktree `/Users/jaymini/projects/naeil-home-console-access`에 구현했다. 기준은 `b92a9a5d`, branch `feature/naeil-console-access`, 구현 커밋은 `f5fd22f4f0b2f3f6643c933d7c1ff8b42286b139`다. 상세 SSOT와 실행 증거는 해당 저장소 `openspec/changes/naeil-console-access/{context,baseline,verification,review}.md` 및 `baseline-manifest.json`이다.

- Home 운영은 단일 커밋이 아니라 `b92a9a5d` + 동결 코드 overlay 두 개 + 동결 static artifact다. 코드405개/static50개, 총455개 경로·SHA256 일치를 검증했다. 이미지와 컨테이너는 기존 그대로다. frontend는 동결 빌드 대응이며 새 빌드로 원본→번들을 재현한 결과는 아니다.
- JEV 설치 BUILD_ID는 기존과 같다. 전체 작업 소스의 운영 동일성은 아직 확정하지 않았다. Estimate 작업 HEAD는 `d58f4432`로 진행됐지만 설치 sourceCommit `8f2f7379b160`와 BUILD_ID `XHoWgRKnyYCDclMzrqKLu`는 그대로다. 구현 중 Estimate에서 다른 작업자의 UI·테스트 변경51개가 관측됐으며 손대지 않았다.
- 공식 Supabase CLI2.121.0, Supabase PostgreSQL17.11, GoTrue의 실제 Auth schema와 pgTAP를 격리 loopback55322에서 실행한다. `auth.users`, `auth.uid()`, Supabase roles/RLS를 mock으로 대체하지 않았다. Auth HTTP·SMTP·OAuth는 실행하지 않는다.
- `console_members/admins/services/grants/audit/operations`, subject 기반 결정, 관리자 RPC, 권한·감사·작업결과의 원자성, 버전 충돌과 멱등성을 구현했다. 최종 clean-schema migration 뒤 pgTAP104개·별도 session 동시성7개, 기존 Home 인증6개를 메인이 직접 통과시켰다. 독립 리뷰의 P2 두 건을 해결했고 미해결 보안/정확성 지적은 없다. 운영에는 적용하지 않았고 실제 회원·관리자 권한 seed는 없다. 명령과 한계는 위 verification 문서에 있다.
- DB 기반 검증과 외부 인증 실험은 독립 단계로 나눴다. 기존 Home 세션의 개인 actor 부재, 실제 OAuth·초대·SMTP·쿠키·콜백·공개 가입 차단의 미검증 상태는 유지된다. 이번 SQL 성공을 Home/JEV/Estimate의 HTTP 보호나 초대 E2E 성공으로 표현하지 않는다.

기존 목업/source log 미커밋 변경, JEV dirty 작업, Home main의 archived spike는 보존했다. 실제 Supabase 프로젝트와 공개 가입 설정, 계정, 견적·설정·백업, 운영 서비스는 변경하지 않았다.

## 2026-10-15 관리 API 후속 구현

Home 격리 구현 HEAD는 f5fd22f4, 중앙 문서 HEAD는 6d0e52e로 시작했다. Home main과 JEV HEAD/다른 작업자의 dirty 파일은 기존 상태다. Estimate는 다른 작업자가 ee2d7b6d로 진행해 tracked 변경이 정리됐고 UI 검증 관련 untracked 기록이 남아 있다. 이 HEAD 진행은 운영 설치 릴리스의 변화로 해석하지 않으며 이번 Console 작업은 해당 저장소를 편집하지 않는다.

Task 2를 같은 격리 브랜치에 구현했다. 서버에 보관한 개인 JWT로 매 요청 Auth 사용자·현재 관리자를 검증하며, Home 비밀번호 세션만으로는 Console을 열 수 없다. 회원/서비스/관리 기록 조회와 원자적 권한·차단 변경, PKCE 어댑터, Host/Origin/CSRF 검사를 제공한다. 미연결 서비스의 새 허용은 DB에서 거부하고 기존 허용의 조회·회수는 보존한다. 로컬 Auth/REST는 loopback55321, DB는55322이며 공개 생성·외부 제공자·SMTP를 사용하지 않는다. 환경 커밋은 `5f77df56`, 앱/API·SQL·테스트·OpenSpec은 `1b766bf078de482a40d5653f874785d7a82fa964`다. 미배포·미push 상태이며 실제 계정과 권한을 만들지 않았다. 최초 개인 세션은 최대1,000개·최대8시간의 프로세스 메모리이며 재시작/다른 worker에서는 재로그인이 필요하다.

최종 관련 회귀2049개·실제 로컬 HTTP5개·pgTAP144개·별도 DB session 동시성7개를 메인이 통과시켰고 독립 리뷰 수정을 반영했다. 전체 회귀는8750 PASS/7 FAIL 후99% 정체로 중단됐다. 이번 등록/취소 회귀는 수정했지만 기존4개 테스트 실패·타입72건·병렬 deadline/worker 불안정성이 남아 전체 성공으로 간주하지 않는다. 문제 두 파일은 기준/현재에서 각각111개 직렬 통과했다. 정확한 명령·귀속·제약은 Home `openspec/changes/naeil-console-access/management-verification.md`를 따른다. 최종 운영 identity와455개 hash가 그대로이고 시험 계정·권한·기록 잔여는0이다. 실제 OAuth·초대·메일·운영 연결은 여전히 검증하지 않았으며 다음 작업은 Console UI다.

## 2026-10-15 Console UI 후속 구현

Home 같은 격리 브랜치에 Task3을 `b27f79808e08d8a82e9b70ea3f6a052e0f5190d0`로 커밋했다. 기존 프레임과 AI 옆 Console, 한 페이지 회원 목록·도메인 필터·오른쪽 상세 패널·권한 저장·차단/해제·기록을 Task2 API에 연결했다. 개인 인증 오류는 Home 로그인에 전파하지 않는다. 변경은 명시적 저장이며409는 최신 상태 검토,503은 동일 작업 재시도다. 미연결 서비스의 기존 허용 유지/회수는 가능하고 새 허용은 잠근다. 초대·가입 차단·연결 보장으로 오해할 문구는 사용하지 않는다.

메인이 전체 frontend862개·타입/lint/build, 브라우저36화면/18동작/추가 판단4개, 프레임135개/구현 전후90개 비교와 OpenSpec58개/strict를 직접 통과시켰다. 독립 리뷰의4개 UI 지적과 mock 경로 계약 누락을 수정·재검토했다. axe 위반은0이며4개 패널의 부분 가림 대비 판단 보류는 실제 스크롤·색 대비(문구6.07:1/7.72:1)·캡처로 확인하고 원본 결과도 보존했다. Impeccable detect는 실제 실행해 `[]`였다. 전체 접근성 인증이나 모든 브라우저 통과를 뜻하지 않는다. 자세한 명령·도구/모델·실패/수정·증거는 Home `openspec/changes/naeil-console-access/console-ui-verification.md`에 있다.

이번 화면 검증은 fictional HTTP fixture이며 실제 개인 OAuth→화면→운영 API E2E는 아니다. 외부 OAuth·초대·SMTP·가입 제한·JEV/Estimate 집행은 여전히 다음 단계다. 운영 identity/hash455/455가 그대로이고 실제 회원·권한·견적과 hosted Supabase 설정, 운영 서비스는 변경하지 않았다. 기존 source-log/목업 미커밋 변경을 보존하고 공유 UI 패키지는 수정하지 않았다. 다음 작업은 JEV 연결이다.

## 2026-10-15 JEV 개인 로그인·서비스 검사 후속 구현

Task4는 독립 snapshot 저장소 `/Users/jaymini/projects/jev-console-access`에서 완료했다. 기준 `7332327`은 기존 recovery archive의 현재 source 111개를 hash 검증한 import다. 설치 JEV는 sourceCommit 없는 `20261005T000213Z`/BUILD_ID `5c8klC9uqKrC2wNSEzuke`이며, 과거 74개 운영 source manifest는 archive와 일치하지만 개발 snapshot과 17개 차이가 있다. 이번 구현을 그대로 운영 배포할 수 있다는 근거로 사용하지 않는다. 원본 dirty 소스·인덱스·history를 변경하지 않았다.

최종 제품 `13f2829`, 계약·영구 검증 증거 `36002aa`, Home OpenSpec 기록 `20559174`(strict 및 전체 명세 58개 통과). 개인 Supabase identity와 같은 JWT로 서버 고정 `jev`의 현재 권한을 매 보호 요청마다 확인한다. root document/RSC는 상태를 결정하는 Node proxy에서 검사하고, compare/legacy 모델 API는 독립 검사한다. 기존 비밀번호 세션 우회를 제거하고 별도 opaque 서버 세션, 24시간 절대 만료·refresh/restart의 quota identity·단회 PKCE·Origin/CSRF·삭제 세션 복원 방지·권한 회수 뒤 logout을 검증했다. API 미인증 401, 권한 없음 403, 설정/조회 장애 503을 구분하며 익명 페이지는 로그인으로 안내한다.

메인이 focused 35개/전체 103개, 타입·lint·build, Chromium 20개, fixture smoke, 실제 로컬 GoTrue/Auth/PostgREST/DB 73개 검사를 직접 통과시켰다. 독립 `gpt-6.1-sol/high` 리뷰의 세 지적(페이지 상태 보존, gateway 오류와 개인 만료 구분, 만료 CSRF 복구)을 수정하고 spec/quality 재승인을 받았다. 증거·재현 명령·캡처·리뷰·SHA256은 JEV `docs/ops/console-access-verification.md`에 연결했다. Node proxy의 현재 보호 페이지 범위는 root 하나이며 향후 추가 route는 matcher 검증이 필요하다. refresh는 단일 프로세스이고 안내 화면 렌더는 고정 public origin의 서버 접근이 필요하다.

실제 로컬 검사는 외부 OAuth code 교환만 test-process seam으로 fictional password fixture에 연결한다. 이 결과는 Google/GitHub·계정 연결·실 HTTPS cookie/SSO·운영 콜백·메일/초대·가입 제한·유료 모델·운영 집행 검증이 아니다. 시험 행은 0으로 정리하고 서비스는 active/unverified/verified_at NULL을 정확히 복구했다. Home 455개, JEV runtime 245개+LaunchAgent, 원본 source 111개 hash가 그대로다. 이번 작업은 실제 회원·권한·데이터·운영/hosted 설정을 변경하거나 push/merge/배포하지 않았다. Estimate는 별도 작업으로 `3bffa256`→`e4884db`로 진행했으며, 다음 Task5에서 최신 source/runtime을 재확인하고 공용 데이터·revision 검사를 보존한다.

## 2026-10-15 AB Estimate 개인 로그인·공용 견적 후속 구현

Task5를 격리 worktree `/Users/jaymini/.paseo/worktrees/1bnldk74/estimate-console-access`에서 완료했다. 초기 기준 e4884db는 당시 설치 cce71e6827a3-998509561042의 source237개/runtime1605개와 일치했다. 최종 제품 `25eaa34`, source/test `a941722`, 계약·영구 증거 `af7d6ea`, Home OpenSpec `8708d643`이다. 매 보호 페이지/RSC/API/백업 요청에 현재 개인 identity와 동일 JWT의 서버 고정 `abestimate` 권한을 검사하고401/403/503을 구분한다. 기존 비밀번호 세션 우회는 제거했다. 별도 private atomic JSON 개인 세션·24시간 절대 만료·단회PKCE·Origin/CSRF·refresh/logout 경쟁을 다룬다. 페이지는 최종 상태를 소유한 Node proxy, API는 독립 guard가 검사한다.

허용 회원 모두 같은 companies/견적/설정/calendar/백업을 사용한다. 도메인·계산·store/service·pinnedUI·package/lock은 기준과 zero diff이며 기존 revision 큐/충돌·백업20개·복원을 보존했다. 새 탭 재인증과 명시적 identity/최신 state 확인으로 raw draft/export/conflict를 유지하고, 저장 불가 상태에서도 확인 후 계정 전환이 가능하다. 독립 gpt-6.1-sol/high 구현·리뷰에서 발견한 parent fsync, invalid-draft 계정 전환, hydration 후403/503 안내 소실과 smoke redirect 지적을 수정·재승인했다. 메인은 diff·원본 실패·최종 실행 결과와 대표8개 캡처를 직접 확인했다.

메인이 focused114·전체649unit, typecheck/lint/build, Chromium299·smoke62·실제 로컬 GoTrue/Auth/PostgREST/RLS591개를 직접 통과시켰다. 별도 fictional A/B의 공용 UUID/revision/settings, 저장 공유, 동일revision의200/409, 백업·복원, 즉시 회수/차단/해제, denial 전후 main/전체backup hash 불변을 검증했다. 시험 행0·정확한unverified 서비스 필드와 owned child/임시 데이터 정리를 확인했다. OpenSpec 전체58개/strict도 통과했다. 초기284PASS/4FAIL와 후속RED/GREEN을 최종299PASS와 구분해 보존했고 initial domainRED9의 stdout 파일 부재를 명시했다. 명령·원본 로그·한계·리뷰·SHA256은 Estimate `docs/ops/console-access-verification.md`와 `docs/ops/evidence/console-access/`에 있다.

이번 access 작업은 배포·실제회원/권한/데이터·hosted 설정·메일/모델 호출을 변경하지 않았다. 운영 data/auth/env 내용도 읽거나 복제하지 않았다. 다만 작업 중 **별도 작업자**가 탐색 수정 source61eb4ef를 릴리스61eb4efd1f38-5d035aab79fc/BUILD_IDx_EgdkNRAuhhXXBxwsatF로 배포하고 원본HEAD를040d8cf로 진행했다. 기존·후속 릴리스1605개씩과 Home455개/JEV245개, credential/key lstat·원본source233개를 읽기 전용 비교했다. 따라서 머신 전체 운영 불변을 주장하지 않으며, 이 접근 제어 브랜치를 향후 배포하려면 별도 navigation 변경과 병합·통합 검증해야 한다.

실제 로컬 검사는 외부PKCE교환만 fixture seam으로 대체했다. Google/GitHub/linking·실HTTPS·SSO/hosted callbacks·초대·SMTP/가입 제한·운영 집행 성공이 아니다. 단일writer/process, self-origin 오류 프레임 의존성과 추가 protected route의 matcher 검증, 물리기기/타브라우저/보조기술·넓은 대비 한계는 유지된다. 현재 milestone은 완료했으며 다음 Task6 초대·SMTP·가입 제한은 별도이고 change는 archive하지 않는다.

## 2026-10-15 초대 생성·관리·수락 로컬 구현 완료

Task6을 기존 격리 Home/site 브랜치에 완료했다. Home `5c7a62e6`(DB), `7eec243f`(관리 API/SMTP), `56a149f6`(Console), site `ede9f7b`/`bb83a99`(명시적 수락/오류 복구), Home 영구 검증·harness·증거 `dd8fa93c`다. 실제 로컬 GoTrue에서 신규 invite와 기존 confirmed Auth-only recovery의 동일 UUID를 확인한 뒤, 현재 초대 version/nonce와 실제 인증 session에 묶인 서버 receipt를 거쳐 수신자 JWT로만 수락한다. DB grants·활성화·성공 audit가 원자적이며 재시도는 권한을 복구하거나 성공 기록을 중복시키지 않는다. 발송 결과와 lifecycle을 분리하고 SMTP DATA250을 수신함 도착으로 표현하지 않는다.

메인이 real DB270/races24/runner32, Home frontend906/backend227, 최종 사이트191+production5, actual local Auth→Home API→SMTP capture→built Next→PostgREST/RLS/DB20을 직접 통과시켰다. 렌더 검증은 공개72·관리46+4와 오류복구9이며 finite Chromium/contrast/axe 한계를 보존했다. 독립 broad `gpt-6-astra/high`의 두 Important 오류 복구 지적과 뒤이은 `error_code` 배열 coercion 잔여를 수정했다. 관측된 실패와 최종 승인·정확한 실행 귀속은 Home OpenSpec `invitation-verification.md`, 영구 `evidence/invitations/`와 SHA256을 따른다. 이전 실패 검토를 성공으로 덮어쓰지 않았다.

최종 fixture identity/권한/초대0·소유한 provider marker0, 서비스 active/unverified/verified_atNULL을 별도 query로 확인했다. unrelated provider audit129행은 보존했다. 소유 preview/포트2482/2483/19676은 정리했고 Home 운영455/455·identity와 원본 미커밋 source-log/목업은 그대로다. Task5에 기록한 다른 작업자의 Estimate 배포와 구분하며 머신 전체 운영 불변을 주장하지 않는다.

이 단계는 로컬 SMTP 수집·인증·DB 검증이며 실 수신함·외부 Google/GitHub/linking·실HTTPS/SSO·hosted 가입/콜백 설정 성공이 아니다. 이번 작업은 실제 계정/권한/견적·설정·백업, hosted 설정, 실제 수신자 발송, paid model, 배포/push/merge를 변경하지 않았다. Task7에서 외부 준비·브랜치 조정·초기 허용표·운영 전환 절차를 별도 검토해야 한다. unsupported TRACE ingress·단일worker/restart·일반 사이트의 기존 auth 미해결 사항은 남아 있다. OpenSpec change는 archive하지 않는다.

## 결론

도메인별 권한 관리 방향은 적용 가능하다. 다만 JEV와 AB Estimate는 현재 공통 Supabase 계정으로 로그인하지 않는다. 두 앱의 자체 비밀번호 인증을 사용자 식별이 가능한 인증으로 전환하고, 각 앱의 서버 권한 검사를 연결하는 작업이 필요하다. Console 화면만 추가해서 완료되는 변경은 아니다.

## 확인 결과

| 대상 | 확인한 사실 | 설계에 필요한 보완 |
| --- | --- | --- |
| JEV | 자체 비밀번호, SQLite 세션, `__Host-jev_session`, 24시간 세션. 세션의 개인 사용자 ID 없음 | 공통 사용자 ID와 `jev` 권한 검사 연결. 기존 비밀번호 진입 경로가 권한 검사를 우회하지 않도록 전환 |
| AB Estimate | 자체 비밀번호, HMAC 서명 24시간 세션, `__Host-estimate_session`. 세션 payload에 사용자 ID 없음 | 공통 사용자 인증 및 `abestimate` 권한 검사. 페이지·상태 조회/저장·백업 다운로드/복원 모두 포함 |
| AB Estimate 데이터 | 인증 후 단일 JSON store를 읽고 변경. 사용자별 분리나 읽기 전용 역할 없음 | 도메인 허용을 받은 사람은 기존 공용 견적을 조회·수정·다운로드·복원할 수 있음. 개인별 견적 격리가 필요하다면 별도 설계 필요 |
| Home | 실제 실행 컨테이너의 `standard` 비밀번호 인증. 프록시 사용자 헤더 신뢰 꺼짐. 비밀번호 경로의 principal에는 actor 없음 | Home 세션만으로 Jay 개인을 식별했다고 처리하면 안 됨. Console용 개인 관리자 인증·고정 ID 허용목록 필요 |
| Supabase 가입 | `Allow new users to sign up` 켜짐. 이메일 확인 켜짐. 익명 로그인·수동 연결 꺼짐 | 아직 초대 전용 상태가 아님. 초대 계정 수락/기존 OAuth 연결 검증과 함께 공개 생성 차단 적용 |
| Supabase 제공자 | Email·Google·GitHub 활성화 | ‘활성화’는 초대 이후 로그인 E2E 성공 증거가 아님 |
| Supabase 메일 | 기본 내장 메일 서비스 사용, 대시보드에 custom SMTP 미설정 안내 | 일반 외부 수신자 초대 전에 custom SMTP 구성·검증 필요 |
| Supabase 콜백 | `naeil.dev/auth/callback`, `esg.naeil.dev/auth/callback`, `work.naeil.dev/auth/callback`만 등록 | JEV·AB Estimate·Tailscale Home의 새 콜백을 선택한 인증 흐름에 맞춰 등록해야 함. 현재 목록만으로 각 앱 콜백 사용 불가 |
| naeil.dev 로컬 인증 코드 | 콜백은 `code` 교환만 처리. 초대 토큰 검증/수락 처리는 없음 | OAuth 콜백과 초대 수락을 구분해 구현. Supabase 초대 링크를 기존 콜백으로 보내면 된다고 가정하지 않음 |
| 복귀 주소 검증 | 로컬 `isAllowedRedirect`는 `/`로 시작하는 모든 문자열과 임의 naeil 서브도메인을 허용 | `//외부호스트` 형태를 허용하는 조건 제거. HTTPS·정확한 서비스 호스트·검증된 상대 경로로 한정 |

## 운영/소스 구분

- JEV 소스: `/Users/jaymini/projects/jev/.worktrees/jev-demo`, 현재 소스 `9a63c16`. README는 운영이 10월 5일 릴리스이고 이후 감사 수정은 미배포라고 명시한다. LaunchAgent의 운영 경로는 `/Users/jaymini/.local/share/jev/app/server.js`, 설치 BUILD_ID는 `5c8klC9uqKrC2wNSEzuke`. 현재 작업 소스와 운영 전체의 동일성은 검증하지 않았다.
- AB Estimate 소스: `/Users/jaymini/.paseo/worktrees/1bnldk74/estimate-v1`, 현재 작업 소스 `98d718c`. 운영 `current`는 `8f2f7379b160-98210406b755`, manifest sourceCommit은 `8f2f7379b160e1fd26f7315bd68c1a92eb75a85b`, BUILD_ID는 `XHoWgRKnyYCDclMzrqKLu`. 운영에 대응하는 Git 소스에서도 개인 식별자 없는 세션과 공용 `/api/state` 처리를 확인했다. 현재 작업 소스에는 미배포 화면 변경이 있으므로 인증 작업 때문에 이를 함께 배포해서는 안 된다.
- Home 운영: Docker `relaydock`, image `b0187528b7e2`, loopback `2455`. 이미지 라벨에 Git revision이 없으므로 배포 원본 커밋은 확정하지 못했다. 현재 main의 인증 코드와 운영 코드가 다르므로 실제 컨테이너의 인증 설정·principal 코드를 추가 확인했다. 구현 전 기존 브랜딩을 포함한 배포 원본을 확정해야 한다.

실제 GET 확인:

- `https://jev.naeil.dev/` → 307 `/login`; `/api/health` → `{"ok":true}`.
- `https://abestimate.naeil.dev/` → `/estimates` → `/login` 200.
- AB Estimate 비로그인 `/api/state`, `/api/backup` → 각각 401.
- Home 로컬 및 Tailscale `/api/dashboard-auth/session` → 비로그인. 로컬 응답은 `passwordConfigured:true`, `authMode:standard`, `passwordSessionActive:false`.

이는 기존 인증의 제한된 읽기 경로 확인이며 모든 API의 보안 감사나 새 권한 제어 검증은 아니다. JEV의 모델 실행 POST나 AB Estimate 저장/복원은 실행하지 않았다.

## 설계 수정 사항

1. **AB Estimate 허용의 범위를 명시한다.** 현재 서비스 기능 전체를 공유하는 권한이다. 2026-10-15 사용자가 허용 회원 모두 같은 견적을 보는 방향을 확인했다. 회원 상세/초대에서 공유 범위를 설명하고 기존 공용 저장소와 revision 충돌 검사를 유지한다. 사용자별 데이터 분리는 제외한다.
2. **Console 관리자에게 개인 식별을 추가한다.** 기존 Home 비밀번호 인증을 유지하면서 Console 진입에는 별도 서버 검증 가능한 Supabase 관리자 세션과 고정 사용자 ID 허용목록을 요구하는 방안을 권장한다. Tailscale Home 호스트 전용 세션·콜백을 사용한다. 실제 연결 방식은 배포 원본과 인증 검증 후 확정한다.
3. **공용 비밀번호 경로를 전환한다.** 기존 비밀번호 보유자를 임의의 개인 계정으로 매핑하지 않는다. 전환 후에는 기존 세션만으로 보호 기능을 이용할 수 없게 한다. 운영 데이터와 기존 백업은 보존한다.
4. **초대 유효기간과 인증 링크 만료를 분리한다.** 앱 초대의 제안 기본값은 7일이지만 Supabase 인증 링크가 7일 유지된다고 확인된 것은 아니다. 재발송/취소의 앱 초대 상태를 서버에서 다시 검사하고, 인증 성공만으로 권한을 활성화하지 않는다. 이전 링크가 인증 세션을 만들더라도 취소/교체된 앱 초대의 권한은 얻지 못해야 한다.
5. **메일 준비를 출시 조건에 넣는다.** custom SMTP와 승인된 발신자를 구성한 뒤 외부 수신·실패·재발송을 검증한다. 이번 점검에서는 발송하지 않았다.
6. **초대 수락용 서버 흐름을 구현한다.** 공급자가 사용하는 이메일 인증 토큰과 OAuth code 흐름을 구분한다. 초대 계정 ID와 수락자 ID, 유효한 앱 초대 버전의 일치가 권한 부여의 조건이다.

## 아직 실제 동작 검증이 필요한 사항

- 공개 계정 생성 차단 상태에서 관리자 초대 → 이메일 확인 → 동일 계정의 Google/GitHub 연결 → 각 앱 로그인.
- 초대와 인증 링크의 실제 만료·재발송 동작 및 중복/취소 경쟁 조건.
- 루트·서브도메인·Tailscale Home 사이의 로그인/로그아웃/세션 갱신과 쿠키 충돌 해소.
- 앱별 최신 권한 확인, 직접 API 접근 차단, 권한 회수 직후 재요청, JEV 장기 실행 취소/재검사 경계.
- Home 배포 원본 커밋과 관리자 개인 세션 연결.

이 흐름은 새 구현이 없고 현재 공개 가입도 켜져 있어, 읽기 전용 점검만으로 통과했다고 할 수 없다. 별도 격리 환경에서 시험 계정으로 먼저 검증하고 실제 운영 전환으로 이어가야 한다.

## 근거

- JEV: `src/server/auth.ts`, `src/server/session.ts`, `src/server/comparison.ts`, README 및 LaunchAgent 경로.
- AB Estimate: 운영 sourceCommit의 `src/server/auth/session.ts`, `src/app/api/state/route.ts`; 작업 소스의 `src/server/page-session.ts`, `src/app/api/backup/route.ts`; 설치 manifest.
- Home: 실제 컨테이너 `/app/app/core/auth/dependencies.py`, `/app/app/core/auth/dashboard_access.py`, 선별한 런타임 설정과 `/api/dashboard-auth/session`.
- naeil UI 저장소: `src/app/auth/callback/route.ts`, `src/lib/auth/redirect.ts`.
- Supabase 대시보드: 인증 Providers, Emails, URL Configuration, Auth Hooks 화면을 Aside로 읽음. 저장 버튼/초대 발송은 누르지 않음.
- 공식 [SMTP 안내](https://supabase.com/docs/guides/auth/auth-smtp): 내장 메일은 프로젝트 팀에 속한 사전 허용 주소로 제한되고 현재 시간당 2건, 운영용 custom SMTP 권고. 2026-10-15 본문 확인.
- 공식 [Identity linking](https://supabase.com/docs/guides/auth/auth-identity-linking): 동일 이메일의 자동 연결과 확인되지 않은 이메일의 보안 조건. 이 설명은 현재 프로젝트의 초대→OAuth E2E 성공을 입증하지 않는다.
- 공식 [inviteUserByEmail](https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail): 관리자 이메일 초대 API 존재 확인.
