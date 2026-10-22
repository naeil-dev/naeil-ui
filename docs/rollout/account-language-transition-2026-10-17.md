# Console 인증 통합 — 운영 전환 검토 자료

이 문서는 최신 UI0.7.1 위에 통합한 인증 후보의 전환 조건이다. 현재 운영 중인 공통 헤더·푸터·계정 메뉴 배포는 완료 상태로 유지한다. 이 작업은 push/merge/배포, hosted 설정 변경, 실회원 등록/권한 부여, 실제 메일 발송을 수행하거나 승인하지 않는다. 검증 결과와 정확한 산출물은 [통합 결과](account-language-integration-2026-10-17.md)를 따른다.

2026-10-18 갱신: 영속 초대와 Home 운영 차이 조정의 구현·로컬 검증·후보 패키징은 완료했다. 기존 관리 로그인으로 hosted 읽기 전용 조회도 완료했다: Console schema 부재, Google/GitHub/Email 및 신규가입 ON, callback3개, custom SMTP 부재를 확인했다. Jay의 기존 Google identity와 UUID는 비공개 검토표에 기록했다. 최신 artifact·검증·변경 승인안은 [운영 전환 준비 결과](auth-transition-preparation-2026-10-18.md)를 우선한다. 실제 운영 인증은 여전히 미배포다.

후속 최신: [고정 callback return 구현·통합 결과](exact-callback-return-2026-10-18.md)의 새 S/E/J/H 후보와 검증 범위를 우선한다. 로컬 구현은 완료했고 실제 Vercel metadata/ingress/query logging·실계정 HTTPS 검증은 남았다. 정적 callback 추가안은 계속 보류한다.

## 적용 범위

| 대상 | 통합 내용 | 운영 준비 시 구분할 점 |
| --- | --- | --- |
| naeil.dev | 사이트별 Supabase SSR 세션, 기존 공통 계정 메뉴, 안전한 로그인 복귀, 명시적 초대 수락 | 공개 사이트 자체를 `jev`/`abestimate` 권한으로 잠그지 않는다. 기존 공유 쿠키를 새 사이트 세션으로 신뢰하지 않으며 다른 서비스 쿠키도 지우지 않는다. 기존 사용자는 새 사이트 로그인이 필요하다. |
| AB Estimate | 검증된 개인 UUID와 매 보호 요청의 `abestimate` 결정, 계정 표시/전환, 저장·복구 보호 | 기존 견적·회사·설정·calendar·backup은 허용 회원이 함께 사용한다. 개인별 데이터 분리 없음. schema3/revision/계산 유지. |
| Jev | 개인 UUID와 매 보호 요청의 `jev` 결정, 계정 표시/전환, 입력·결과·stream 보호 | 기존 SQLite/quota/lease 계약 유지. 이미 시작된 stream을 권한 회수로 소급 중단하는 기능은 추가하지 않았다. |
| Home Console | 기존 중앙 회원·권한·초대 구현에 오류 분류와 개인 세션 logout 복구 보완 | Home 프레임/헤더 이행 대상이 아니다. 개인 관리자 세션과 기존 Home 접속 세션은 별개다. |

naeil.dev·Jev의 언어는 ko/ja/en이며 각 서비스 안에서 유지한다. Estimate는 ja 전용으로 언어 선택기를 표시하지 않는다. 서비스 간 언어 동기화, 계정별 언어 설정, 자동 SSO, 전역 logout, 새 프로필 편집 기능은 포함하지 않는다.

## 아직 해결해야 하는 운영 조건

### 초대 수락 런타임과 현재 Vercel 배포

기존 외부0600 파일과 단일 프로세스10분 transaction의 의존성은 2026-10-18 로컬 후보에서 서버 전용 JSON 설정·암호화된 Supabase 영속 저장·lease/fence/checkpoint로 보완했다. Vercel에서 memory fallback은 거부한다. 재시작/여러 프로세스/원자적 DB 소비/만료·취소/애매한 OTP 응답·재시도/proof replay를 실제 로컬 Auth/DB와 동결 standalone에서 검증했다. 같은 호스트 `/auth/invite`와 기존 수락 권한 계약을 유지한다.

Vercel 호스팅은 유지한다. hosted SQL001–004 적용 상태, 비밀 공급과 인스턴스 간 동일 암호화 키, 실제 공개 Auth 설정으로 빌드한 artifact, provider/callback/HTTPS/ingress 검증은 남아 있다. 운영 설정은 적용하지 않았다. 초대 경로가 준비되기 전에는 실제 초대를 발송하지 않는다. 일반 OAuth 로그인은 초대 수락을 대신하지 않는다.

### 중앙 환경·제공자·초기 허용표

- hosted Auth/PostgREST 버전과 migration001–004의 적용 상태를 승인된 대상에서 확인한다. 기존 Auth UUID/회원/업무 데이터를 보존한다. 로컬 신규 fixture 초기화 명령을 hosted 환경에서 실행하지 않는다. 준비된 catalog-only 읽기 전용 SQL과 checksum은 [최신 검토표](auth-transition-preparation-2026-10-18.md)에 있다.
- Google/GitHub와 공개 가입 차단 상태, 기존 회원의 provider identity 연결을 실제 승인된 계정으로 검증한다. 동일 이메일만으로 서로 다른 UUID를 같은 사람으로 취급하지 않는다.
- callback은 기존 Site URL/allowlist3개를 유지하고, 소비 앱의 `redirect_to`를 same-SiteURL의 고정 `/auth/return/{jev,abestimate,console}`로 전달하는 후보를 검증한다. 최종 callback은 각 서비스의 `/auth/callback`과 확인된 Home `https://jay-macmini-2.tail165003.ts.net:2455/api/console/auth/callback`이다. GoTrue v2.197.0의 nonce query/cancellation 문제를 로컬에서 확인·보완했지만 실제 hosting 검증은 남았다. 정적 callback3개 추가나 wildcard로 우회하지 않는다.
- SMTP sender/domain/TLS와 승인된 실제 수신함을 정한 뒤 발송·실패·불확실·재발송·취소를 검증한다. 로컬 capture SMTP의 DATA 수락은 실제 수신함 도착 증거가 아니다.
- 사용자가 이번 작업 중 **최초 관리자 Jay 1명 + 회원별 명시 허용표** 설계 유지를 확인했다. 실제 인증 UUID 확인과 실제 등록/허용표 적용 승인은 별개로 남아 있다. Console 관리자라는 이유만으로 Jev/Estimate 접근을 주지 않는다. 검증된 서비스 연결 이전에는 새 허용을 활성화하지 않는다.

| 검증한 Auth UUID | 본인 확인 근거 | 회원 활성 | Console 관리자 | Jev 허용 | Estimate 허용 | 승인자/시각 |
| --- | --- | --- | --- | --- | --- | --- |
| 비공개 검토표에 기존 UUID 확인 | Jay — 지정 이메일의 기존 사용자1명과 확인된 Google identity. 현재 앱 세션/실HTTPS 검증은 별도 | 활성화 후보, 미적용 | 최초 관리자 설계 확인됨, 실제 등록 미승인 | 허용 의향 확인, 연결 검증 후 적용 | 허용 의향 확인, 연결 검증 후 적용 | 제공자/의향 확인2026-10-18 / 실제 적용 미승인 |
| 미확정 | 추가 이용자 | 별도 명시 결정 | 기본 없음 | 기본 없음 | 기본 없음 | 미확정 |

암호·token·provider secret을 대화나 Git 문서에 붙여 넣지 않는다. 이 표는 실행 SQL이나 자동 seed 파일이 아니다.

### 세션·현재 소스·ingress

- Home은 단일 worker, 프로세스 메모리 개인 세션, 최대8시간이며 Home 세션 만료를 넘지 않는다. 재시작 후 개인 재로그인이 필요하다. 현재 운영 Home의 runtime overlay와 frontend 차이를 조정한 전체 runtime 후보는 로컬 패키징·격리 smoke까지 완료했다. 실제 운영 설정/전환 검증은 남아 있으며 오래된 Console 브랜치 전체 배포는 하지 않는다.
- Estimate는 dedicated Node24.21.0과 단일 writer, 별도 private personal-auth 저장소,24시간 절대 세션 수명을 유지한다. Jev는 기존 private SQLite의 별도 개인 세션 테이블과24시간 수명을 유지한다. 실HTTPS의 host-only/Secure/HttpOnly/SameSite, 재시작, revoke/outage logout을 운영 환경에서 확인한다.
- Next16 route/proxy 전의 TRACE500과 중복 slash/backslash query-bearing308은 실제 ingress에서 보호·거부를 확인해야 한다. pinned private Next metadata/raw Host 보존과 양 hop의 query/authorization URL이 platform·tracing·오류 로그에 남지 않는지도 검증한다. 조용한 앱 stdout은 비노출 증거가 아니다.
- 사이트의 새 host-only namespace는 자동 SSO 약속이 아니다. ESG/Work 등 기존 공유 쿠키 소비 서비스와의 운영 연동은 이번 검증 범위가 아니다.

## 승인 후 전환 순서

1. 결과 문서의 source/BUILD_ID/archive SHA256와 실제 검증 대상을 다시 대조한다. 사이트의 synthetic public Auth 설정으로 만든 로컬 검증 artifact는 운영 활성화 artifact가 아니다. 운영 공개 설정으로 빌드한 산출물은 새 identity/hash와 실HTTPS 검증이 필요하다.
2. 중앙 schema·정책·관리자 복구 경로를 준비하고 기본 접근 불가 상태를 검증한다. Home 현재 운영 소스와 Console 변경을 조정한 동결 후보 및 현재 운영 identity를 대조한다. 실제 개인 관리자와 승인된 허용표의 적용은 별도 승인 후 수행한다.
3. 사이트 초대 후보와 실제 provider/callback·ingress/logging 조건을 검증한다. 승인된 배포에서는 fixed relay를 소비 앱보다 먼저 배포·확인한다. 실제 발송 전 수락과 재시도·취소·만료를 확인한다.
4. Estimate/Jev 각각의 현재 프로세스 소유권과 당시 데이터/모든 backup/auth/config 보존 영수증을 새로 확보한다. 과거 PID·capture·one-time helper·UI-only 승인은 재사용하지 않는다.
5. 정확한 writer만 graceful stop하고 자연 lock 해제·port 종료·정지된 파일 보존을 확인한다. manual lock 삭제, 강제 kill, initialization, password reset, 과거 backup 복원으로 진행하지 않는다.
6. 한 서비스씩 immutable 후보를 설치하고 한 worker만 시작한다. UI0.7.1/identity/health와 익명·legacy401, allowed, denied/blocked403, dependency503, revoke/outage logout을 확인한다. Estimate의 실데이터 변경 테스트는 별도 승인된 새 기록에만 수행한다.
7. 기존 편집 탭을 강제 새로고침하지 않는다. 남아 있는 draft는 export/명시적 폐기, 새 탭 재인증 후 identity와 revision 재검증 경로로 처리한다. 운영 완료는 이 단계의 실계정·실HTTPS 결과가 확보된 후에만 기록한다.

## 중단·복구

중앙 권한 집행 이후 비밀번호 전용 과거 artifact로 되돌리면 정책을 우회한다. 같은 중앙 권한 검사와 데이터/세션 형식을 유지하는 검증된 artifact 또는 전진 수정만 복구 대상으로 사용한다. 그런 artifact가 없으면 보호 경로를 중단하고 공개 health/로그인 복구 경로만 유지한다.

고정 relay는 이를 참조하는 배포된 소비 앱과 진행 중 인증 시도가 모두 사라질 때까지 유지한다. relay 없는 예전 사이트 artifact는 호환 rollback 후보가 아니다. 양 hop의 logging/ingress 조건을 충족할 수 없으면 활성화를 중단하고 설계를 재검토한다.

코드 복구 중에도 현재 main/backup/설정/중앙 권한은 보존한다. 데이터 복원은 별도의 명시적 승인이 필요한 작업이다. 실패한 활성화를 성공으로 기록하지 않고 구현·로컬 검증·패키징·배포·운영 검증 상태를 각각 남긴다.
