# 보호된 Preview 합성 검사 준비 — 2026-10-19

후속: 이 문서의 구체적 한 번 적용은 승인 후 실행됐다. [baseline178·키 회수 실제 결과와 남은 수용 조건](auth-preview-baseline-result-2026-10-19.md)을 우선한다. 아래의 미승인·미실행 문구와 동결 manifest는 승인 전 준비 시점의 기록이다.

**보호된 Preview 합성 검사의 실행·회수 준비와 독립 검토를 완료했다. 실제 적용은 미승인이다.** 기존 전용 CLI 로그인과 보호된 Preview 두 개 생성에 이어, 검사 키1개 생성→합성 HTTPS 최대178건→같은 키 회수의 구체적 실행안을 확정했다. 이번 준비에서는 실제 credential을 읽거나 키를 생성/회수하지 않았고 hosted probe·로그 조회도0이다. 운영 인증 전환 완료를 뜻하지 않는다.

## 이번 준비의 목적과 범위

이미 만든 시험용 사이트 두 곳에서 로그인 복귀 주소가 플랫폼을 지나며 어떻게 전달되는지 가짜 값으로 확인하기 위한 준비다. 기본 CLI의 자동 재시도·redirect 동작을 피하기 위해 별도 실행기와 송신기를 만들었다. 기존 Jay 계정·업무 데이터·공개 사이트 전환은 이 검사 다음의 별도 적용이다.

새 키는 Vercel 정책상 **프로젝트 전체 배포에 회수될 때까지 유효하며 자동 만료되지 않는다.** 실행기는 고정된 두 Preview에만 연결하고 키를 헤더에만 넣는다. 이 키가 일부 방화벽 검사도 우회할 수 있으므로 일반 방문자의 WAF 동작 증거로 쓰지 않는다. 플랫폼 모든 저장소의 헤더 비노출은 입증되지 않았다. 첫 단독 키의 향후 build 환경 노출 특성은 기존 공식 계약에 보존했고, 재빌드·env pull은 포함하지 않는다.

정상 경로는 API7건, 불확실 상태의 읽기 재대조1건을 더해 최대8건이다. HTTPS는 진단70+ingress102+제품6=178건이며 warmup·자동 재시도·redirect follow·provider 호출은 없다. WAF 변경과 변경 후102건, Production 승격/alias, 로그 조회는 별도다. 승인할 구체 단위는 [적용안](evidence/auth-preview-baseline-readiness-2026-10-19/executor-preparation/application-proposal.md)에 기록한다.

## 구현과 검증 근거

| 준비물 | 확인한 결과와 한계 |
| --- | --- |
| control | 같은 두 deployment·project 설정을 확인한 뒤 한 번 생성하고 정확한 자기 키만 회수. 저장된47검사와 소스 해시 일치 |
| sender | frozen178 요청에 보호 헤더만 추가. 응답 크기/시간·비밀 반사·압축/중간 header 등을 제한. 저장된24검사 통과,7개 loopback 연결의 정상 종료/남은 socket0 |
| orchestrator/launcher | 한도·자격증명 분리·finally 회수·불확실한 child 상태를 보존. 저장된21검사 통과; 마지막 headerTemplates 추가는 영향 검사1개와 최신 buffer 독립 경계3개로 확인 |
| freeze/header | 소스·실행 파일·바인딩·representation·헤더9입력 고정. OS가 네트워크와 운영자 저장소 접근을 막은 default/check7개 및 header 대조1개 성공;178개 모두 현재 renderer와 일치 |
| 별도 회수 helper | 처음71개 fake검사 뒤 발견한 최신 승인 schema 불일치와 비격리 디버그 환경 수용을 수정. 영향8개+전체79개 fake검사 통과, 메인이27개 manifest/이전판 항목과 좁은 diff를 대조. OS 접근 차단 상태 default/check2개 성공. 독립 검토도 실제 current-root/환경 경계를 fake로 확인했고 남은 Critical/Important 결함은 입증되지 않음 |

기존 제품 suite와 옛 로컬178개 TLS 검사는 반복하지 않았다. 영향 검사1개는21개에 포함된 케이스이므로 총수에 중복 합산하지 않는다. 실제 hosted/API 호환성은 아직 확인되지 않았다. 기존 sender의 test credential·TLS scratch·raw 실패 로그는 비공개로 보존하고 복사하지 않는다. 회수 도구 suite는 자신이 만든 가짜 임시파일만 자동 정리했으며 기존 fixture/운영자 파일에는 접근하지 않았다.

기본 실행 freeze는 `0a22050992634568e7d9c051c0761602b485189275cf5eb66567b2c456849aef`다. source4개와 Node/Python 실행 파일·binding·representation·완성 header template를 고정한다. runtime 전체 의존 라이브러리를 모두 해시했다는 뜻은 아니다. root/sender의 기존 독립 검토는 당시 없던 freeze와 recovery를 제외했으므로 후속 검토와 구분한다. 후속 검토자는 target 안6입력과178개 header를 직접 대조했고, 외부 Python/Node/representation bytes는 메인의 직접 해시 확인 기록을 검토한 범위다. 검토자와 구현자는 명시된 파일만 담당했고 메인이 원문/해시를 직접 대조했다.

## 보존과 회수

검사에 쓰는 기존 Production/보호 설정·두 Preview·원 source/artifact·기존 data/backup/auth/config는 유지한다. 새 키와 승인/시도 기록은 전용 운영자 저장소의 새0700 operation 디렉터리와0600 파일에만 남긴다. 키의 부재가 확인돼도 기록을 임의 삭제하지 않는다. 원 key/marker/승인을 재사용하지 않는다.

발급 응답이 불확실하면 허용된 한 번의 조회는 소유권 회수용으로만 쓰고 HTTPS를 재개하지 않는다. 정상 finally 회수로 끝내지 못하면, 사고 당시 원 기록을 새로 대조한 **별도 새 승인**으로 회수 helper만 실행할 수 있다. 새 승인 최대180초·API4건·정확한 키의 새 회수 PATCH1번이며 생성/probe/갱신/프로세스 제어는 없다. 원 승인 만료·원401·원 요청 한도는 수정하거나 초기화하지 않는다. 회수 API는 격리된 Python과 최소 환경을 강제하며 직접 CLI apply는 없다. 사고별 승인 인증·동일 해시 source buffer 실행·새 private receipt 디렉터리 생성은 별도로 승인된 호출자의 책임이다. `recovery-preparation-binding.json`은 이 조건과 준비물을 고정한 기록이며 실행 권한이 아니다.

여기서 회수는 Vercel 검사 키 회수다. Supabase DB 소유자 접근 복구와 업무 데이터 복원은 별도이며, 이번 결과로 해결됐다고 쓰지 않는다. 키 부재·child 종료·edge 즉시 거부·전체 저장소 비노출을 각각 구분한다. 옛 PID로 신호를 보내거나 강제kill·lock삭제·backup복원을 하지 않는다.

S HEAD는 `02aa72e6e702bf6726659c6e7179e648eb648141`로 동일하며 이번 메인의 변경은 문서/안전한 증거뿐이다. 보호된225입력과 두 archive는 직전01:49 UTC 대조에서 일치했다. 기존11 HEAD 대조와 S 최신 status/diff-check를 구분한다. 모든 worktree/fixture를 새로 광역 조사하거나 제어한 것은 아니다. terrific-buffalo·기존 dirty소스·fixture/volume과 SQL 종료 후 idle container를 보존했다. 과거 부분 준비 checkpoint는 덮어쓰지 않는다.

## 다음 적용과 전체 전환의 남은 조건

최종 검토를 통과한 위 한 번의 키 생성·baseline·회수 적용만 승인 대상으로 제시한다. 이전 로그인/배포 승인을 새 키와 별도 실행기의 credential 사용 승인으로 확대하지 않는다. 승인 파일은 사용자 승인 이후에만 새로 만든다. `approvalReady=true`는 이 적용안을 검토/승인할 준비가 끝났다는 뜻이며 `applicationAuthorized=false`와 구분한다.

baseline 결과를 바탕으로 OP-01 양 hop query 비노출, OP-02 slash/backslash308·TRACE/WAF, OP-03 hosted 전달을 이어 검토한다. OP-01은 health query 로그 관측이며 인증정보 유출 관측이 아니다. 이 검사에 로그 조회는 포함하지 않는다. raw Host=naeil.dev·strict parser·Next16.1.7 own initURL/503·고정303/빈 fragment·finalizer는 유지한다.

기존 Jay→Estimate 우선순위를 유지한다. Home 개인 관리자·중앙 정책·고정 callback relay, schema→Jay→실제 Auth/고정 service 연결 증거 검토→별도 verified→명시 grant를 생략하지 않는다. 유효하지만 미허용인 JWT403 검증과 승인 후 허용 경로 HTTPS 검증을 구분하여 순환 선행조건이나 임시 bypass grant를 만들지 않는다. 실제 전환 직전 writer와 전체 data/backup/auth/config 보존·독립 DB owner 접근·Estimate 무강제 종료 공백은 남아 있다. 중앙 정책 적용 뒤 password-only rollback은 금지하고, 참조 앱/진행 중 시도가 없어질 때까지 relay를 유지한다.

기본 Supabase 메일 설정과 새 Home 통합 초대 메일은 별개다. 기존 발송 경로는 미확인이고, 새 초대 준비가 기존 Jay 연결 준비를 막지 않는다. Home 직접 SMTP/relay를 바꾸지 않는다. Jev·새 회원 초대는 Estimate 뒤에 진행한다. 실제 계정/HTTPS의 로그인·초대·401/403/503·권한 회수/장애 logout·계정 전환/저장 보호/언어/재시작까지 확인해야 전체 완료다.

## 산출물

[안전한 증거 manifest](evidence/auth-preview-baseline-readiness-2026-10-19/manifest.json), [root/sender 검토](evidence/auth-preview-baseline-readiness-2026-10-19/executor-review/final-readiness-review.md), [회수·freeze 후속 검토](evidence/auth-preview-baseline-readiness-2026-10-19/executor-review/recovery-freeze-review.md), [기본 실행 동결](evidence/auth-preview-baseline-readiness-2026-10-19/executor-preparation/freeze.json), [별도 회수 준비 binding](evidence/auth-preview-baseline-readiness-2026-10-19/executor-preparation/recovery-preparation-binding.json)을 따른다. 이전 [Preview 생성 결과](auth-preview-created-2026-10-19.md)와 부분 준비 checkpoint는 그대로 보존했다.
