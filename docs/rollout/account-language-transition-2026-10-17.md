# Console 인증 통합 — 운영 전환 검토 자료

이 문서는 최신 UI0.7.1 위에 통합한 인증 후보의 전환 조건이다. 현재 운영 중인 공통 헤더·푸터·계정 메뉴 배포는 완료 상태로 유지한다. 이 작업은 push/merge/배포, hosted 설정 변경, 실회원 등록/권한 부여, 실제 메일 발송을 수행하거나 승인하지 않는다. 검증 결과와 정확한 산출물은 [통합 결과](account-language-integration-2026-10-17.md)를 따른다.

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

사이트 초대 수락의 기존 보안 계약은 외부 절대 경로의 소유자 전용0600 설정 파일과 단일 Node 프로세스의10분 transaction에 의존한다. 현재 naeil.dev의 Vercel 배포에서 파일 공급·인스턴스 간 연속성·cold start 복구는 확인되지 않았다. 따라서 로컬 standalone 성공만으로 현재 Vercel에 바로 올릴 수 있는 초대 기능이라고 판단하지 않는다.

운영 전 다음 중 하나를 구현·검증해야 한다. 현재 사이트와 같은 호스트의 `/auth/invite`를 유지하고 다른 새 도메인을 임의로 만들지 않는다.

- Vercel을 유지하려면 승인된 비밀 공급 방식과 공용 영속 transaction 저장소를 설계하고, 재시작/다중 인스턴스/원자적 소비/애매한 실패 복구를 검증한다.
- 기존 단일 프로세스 계약을 유지하려면 해당 경로의 장기 실행 Node 배치 및 라우팅을 검토하고,0600 파일 공급·graceful restart·운영 health/TRACE 차단을 검증한다. 사이트 전체 이전이 자동으로 필요한 것은 아니다.

어느 경로도 이번 로컬 후보에 운영 설정으로 적용하지 않았다. 초대 경로가 준비되기 전에는 실제 초대를 발송하지 않는다. 일반 OAuth 로그인은 초대 수락을 대신하지 않는다.

### 중앙 환경·제공자·초기 허용표

- hosted Auth/PostgREST 버전과 migration001–003의 적용 상태를 승인된 대상에서 확인한다. 기존 Auth UUID/회원/업무 데이터를 보존한다. 로컬 신규 fixture 초기화 명령을 hosted 환경에서 실행하지 않는다.
- Google/GitHub와 공개 가입 차단 상태, 기존 회원의 provider identity 연결을 실제 승인된 계정으로 검증한다. 동일 이메일만으로 서로 다른 UUID를 같은 사람으로 취급하지 않는다.
- callback은 `https://naeil.dev/auth/callback`, `https://jev.naeil.dev/auth/callback`, `https://abestimate.naeil.dev/auth/callback` 및 **실제 설정된 Home Tailscale origin**의 `/api/console/auth/callback`을 정확히 검토한다. nonce query/PKCE binding도 확인하며 wildcard로 우회하지 않는다.
- SMTP sender/domain/TLS와 승인된 실제 수신함을 정한 뒤 발송·실패·불확실·재발송·취소를 검증한다. 로컬 capture SMTP의 DATA 수락은 실제 수신함 도착 증거가 아니다.
- 사용자가 이번 작업 중 **최초 관리자 Jay 1명 + 회원별 명시 허용표** 설계 유지를 확인했다. 실제 인증 UUID 확인과 실제 등록/허용표 적용 승인은 별개로 남아 있다. Console 관리자라는 이유만으로 Jev/Estimate 접근을 주지 않는다. 검증된 서비스 연결 이전에는 새 허용을 활성화하지 않는다.

| 검증한 Auth UUID | 본인 확인 근거 | 회원 활성 | Console 관리자 | Jev 허용 | Estimate 허용 | 승인자/시각 |
| --- | --- | --- | --- | --- | --- | --- |
| 미확정 | Jay — 실제 identity 확인 필요 | 미확정 | 최초 관리자 설계 확인됨, 실제 등록 미승인 | 별도 명시 결정 | 별도 명시 결정 | 설계 확인2026-10-17 / 실제 적용 미승인 |
| 미확정 | 추가 이용자 | 별도 명시 결정 | 기본 없음 | 기본 없음 | 기본 없음 | 미확정 |

암호·token·provider secret을 대화나 Git 문서에 붙여 넣지 않는다. 이 표는 실행 SQL이나 자동 seed 파일이 아니다.

### 세션·현재 소스·ingress

- Home은 단일 worker, 프로세스 메모리 개인 세션, 최대8시간이며 Home 세션 만료를 넘지 않는다. 재시작 후 개인 재로그인이 필요하다. 현재 운영 Home의 runtime overlay와 소스 차이를 먼저 조정해야 하며 오래된 Console 브랜치 전체 배포는 하지 않는다.
- Estimate는 dedicated Node24.21.0과 단일 writer, 별도 private personal-auth 저장소,24시간 절대 세션 수명을 유지한다. Jev는 기존 private SQLite의 별도 개인 세션 테이블과24시간 수명을 유지한다. 실HTTPS의 host-only/Secure/HttpOnly/SameSite, 재시작, revoke/outage logout을 운영 환경에서 확인한다.
- unsupported TRACE가 Next16 route/proxy 전에500을 내는 로컬 관측은 남아 있다. 실제 ingress에서 차단하고 callback logging/Host/Origin 처리도 검증한다.
- 사이트의 새 host-only namespace는 자동 SSO 약속이 아니다. ESG/Work 등 기존 공유 쿠키 소비 서비스와의 운영 연동은 이번 검증 범위가 아니다.

## 승인 후 전환 순서

1. 결과 문서의 source/BUILD_ID/archive SHA256와 실제 검증 대상을 다시 대조한다. 사이트의 synthetic public Auth 설정으로 만든 로컬 검증 artifact는 운영 활성화 artifact가 아니다. 운영 공개 설정으로 빌드한 산출물은 새 identity/hash와 실HTTPS 검증이 필요하다.
2. 중앙 schema·정책·관리자 복구 경로를 준비하고 기본 접근 불가 상태를 검증한다. Home 현재 운영 소스와 Console 변경만 조정한 후보를 별도로 만든다. 실제 개인 관리자와 승인된 허용표의 적용은 별도 승인 후 수행한다.
3. 사이트 초대 런타임 문제를 해결한 후보와 실제 provider/callback 조건을 검증한다. 실제 발송 전 수락과 재시도·취소·만료를 확인한다.
4. Estimate/Jev 각각의 현재 프로세스 소유권과 당시 데이터/모든 backup/auth/config 보존 영수증을 새로 확보한다. 과거 PID·capture·one-time helper·UI-only 승인은 재사용하지 않는다.
5. 정확한 writer만 graceful stop하고 자연 lock 해제·port 종료·정지된 파일 보존을 확인한다. manual lock 삭제, 강제 kill, initialization, password reset, 과거 backup 복원으로 진행하지 않는다.
6. 한 서비스씩 immutable 후보를 설치하고 한 worker만 시작한다. UI0.7.1/identity/health와 익명·legacy401, allowed, denied/blocked403, dependency503, revoke/outage logout을 확인한다. Estimate의 실데이터 변경 테스트는 별도 승인된 새 기록에만 수행한다.
7. 기존 편집 탭을 강제 새로고침하지 않는다. 남아 있는 draft는 export/명시적 폐기, 새 탭 재인증 후 identity와 revision 재검증 경로로 처리한다. 운영 완료는 이 단계의 실계정·실HTTPS 결과가 확보된 후에만 기록한다.

## 중단·복구

중앙 권한 집행 이후 비밀번호 전용 과거 artifact로 되돌리면 정책을 우회한다. 같은 중앙 권한 검사와 데이터/세션 형식을 유지하는 검증된 artifact 또는 전진 수정만 복구 대상으로 사용한다. 그런 artifact가 없으면 보호 경로를 중단하고 공개 health/로그인 복구 경로만 유지한다.

코드 복구 중에도 현재 main/backup/설정/중앙 권한은 보존한다. 데이터 복원은 별도의 명시적 승인이 필요한 작업이다. 실패한 활성화를 성공으로 기록하지 않고 구현·로컬 검증·패키징·배포·운영 검증 상태를 각각 남긴다.
