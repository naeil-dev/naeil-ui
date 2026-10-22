# 인증 운영 전환 새 메인 인수 결과 — 2026-10-19

**새 메인이 계획·분할·통합·최종 검증과 후속 요청을 이어 맡는다. 인수 대조는 완료했고, 새 인증 운영 전환은 미완료다.** 이번 변경은 이 기록·안전한 영수증·STATUS 연결뿐이다. 새 구현·설계 채택·운영 적용은 하지 않았다.

[새 인계](auth-next-main-handoff-2026-10-19.md)와 state/activity 전체, [최신 결정 준비](auth-resume-decisions-2026-10-19.md), 방향 검토·이전/원 인계·10/18 후속·메인 검토 보완을 읽었다. 지정 경로의 AGENTS와 관련 STATUS, Home의 Console baseline/초대/접근 명세 및 durable/reconcile/exact-return OpenSpec·검증 결과도 확인했다. 역사적 Home 이미지 일치와 초기 설계의 미구현 문구보다 최신 범위별 결과를 우선한다.

## 인수 대조

[메인 source/document 영수증](evidence/auth-main-intake-2026-10-19/state.json), [runtime 영수증](evidence/auth-main-intake-2026-10-19/runtime.json), [담당 영수증](evidence/auth-main-intake-2026-10-19/activity.json).

- 정확한5cwd의 실제 Git root와 HEAD가 인계와 일치하고 `git diff --check`는 모두 exit0이다. shared/E/J/H status는 그대로다. S의 추가 항목은 예고된 새 인계문과 그 evidence 폴더뿐이었다. 이번 인수 산출물 저장 전 관측이다.
- 보호 구현16파일·기존9artifact·경계 manifest26파일 hash가 일치했다. 재개 manifest21개 중20개는 현재 bytes/hash 일치; STATUS1개는 예고된 인계 링크/헤더 변경을 제외하면 원 hash와 정확히 일치한다. 과거 manifest는 수정하지 않았다.
- 20:58:07 JST 지정28fixture의 전체 허용 metadata와6개 그룹의 소유권 영수증 ID가 일치했다. older SQL은 running이며 `sleep`만 남아 있다. 종료·삭제 완료가 아니고 정리 권한도 없다. fixture/volume과 terrific-buffalo는 보호한다.
- Home의 exact container/image/source label/start/mount/loopback ports는 인계와 같다. DB는 다시 읽지 않았다. 실제 merge revision 근거는 기존 mode=ro 영수증이며 현재 metadata만으로 DB 상태를 재인증하지 않는다.
- Estimate는 loaded running·KeepAlive·RunAtLoad·exit timeout20·같은 predecessor current 링크다. PID는 관측일 뿐 제어 권한이 아니며 writer/lock 소유권·보존 증거도 아니다. scratch3개는 존재/0700이고 전체 archive/runtime 재해시는 하지 않았다.
- 지정5cwd Paseo 조회는 새 메인1명 running, 이전 메인과 기존6명은 idle, terminal0이었다. 새 native `runtime_intake`에 runtime.json만 맡겼고 completed를 직접 확인했다. 메인은 영수증의 모든 metadata·입력 hash·28개 ownership ID를 원본과 독립 대조했다. runtime 명령 자체를 메인이 반복 실행한 것은 아니다.
- 과거 native3명의 completed는 직전 인계 근거다. 이번 native 목록에는 이전 트리가 보이지 않으므로 새로 재확인했다고 쓰지 않는다. 범위 밖 활동은 미확인이다. 위임은 읽기 전용이며 부모 모델 설정을 상속했고 모델 내부 serving identity는 별도 증명하지 않았다.

## Relay 운영 수단 판정

**현 호스팅·보안 계약을 모두 유지하는 완성된 운영 수단은 기존 근거에 아직 제시되지 않았다.** 이는 Vercel 전체에서 불가능하다는 결론이 아니다. 기존 [상세 결정표](evidence/auth-resume-decisions-2026-10-19/relay-decisions/report.md)를 다음과 같이 적용한다.

| 대상과 정확한 후보 | 해결 가능한 부분 | 선택·적용 전에 남은 조건 |
| --- | --- | --- |
| C1: S `next.config.ts`의 wildcard를 `/auth/return/{jev,abestimate,console}` 세 literal beforeFiles rewrite로 변경 | routing capture의 `path` 주입 제거. 지원 Linux/scratch/Preview 근거 재사용 가능 | S에는 아직 미반영. literal hosted에서도8변형이 있었으므로 원문/Host·OP01·조기308 해결로 확대하지 않는다. 정직한 Production source/artifact 고정 필요 |
| C2: 기존 Vercel project의 Raw Path/Method WAF Deny | 원문 경로·비GET 조기 거부 후보 | platform308/TRACE보다 이른 처리, exact matcher, Allow/CSP/X-Frame-Options 등 전체 헤더와 일반 방문자 경로 미입증. WAF 자체 수집도 OP01 대상 |
| C3: Build Output의 terminal method/status/header route | 앱 이전 거부 응답을 versioned routing artifact에 고정하는 후보 | 원문 구별과 platform보다 이른 순서 미입증. JSON 순서만으로 판정하지 않음 |
| A1: 세 canonical callback의 locale/session middleware 제외 + 동등한 조기 거부 경로 | callback 전달의 가변 단계를 줄이는 구조 후보 | 정확한 지원 dispatch·alias/internal/method 보호·own initURL/raw Host 증명 필요. OP01 해결책이 아님 |
| OP01 저장 전 query 억제 | 양 hop 전체를 덮는 이름 있는 기능·실제 설정 수단이 있어야 함 | 현재 그런 완전한 수단은 없다. tracing/drain/UI 숨김·짧은 보관·사후 redaction은 대체하지 못함 |

OP01의 기존 관측은 무해한 health-query 저장이다. 실인증정보 유출 관측으로 바꾸지 않는다. 합성 HTTPS178,49원문/8다름/13미관측과 제품403 출처 미입증은 그대로다. 완료된 문서 조사·baseline·suite는 반복하지 않았고, 새 observer10건·probe·공급자 문의·사람 답변 대기를 만들지 않았다.

## 먼저 필요한 구조 결정

1. **현재 호스팅 범위를 유지:** relay 활성화는 보류한다. 새로운 구체적 지원 기능이 제시되는 경우에만 그 기능의 적용 범위·저장 전 처리·양 hop 보장과 수정 선택을 확인한다. C1–C3/A1만으로 운영 가능하다고 약속하지 않는다.
2. **A2의 별도 설계 검토를 허용:** 기존 보고서의 소유 TLS ingress/relay 대안을 검토 범위에 넣는 결정이다. 사이트 앱/자산은 Vercel에 남지만 **naeil.dev 전체 HTTPS 진입점과 relay 운영 책임**이 바뀐다. 현재 호스팅 범위 밖이며 아직 선택·승인되지 않았다.

A2의 구체적 흐름은 소유 TLS listener→동일 요청 경로의 Next16.1.7 relay→기존 고정303→E/J/Home이다. 일반 사이트 요청만 명시적인 Vercel upstream으로 보낸다. 이 구조가 첫 hop callback query의 Vercel 처리를 피할 수 있다는 것과 실제 운영 적격은 별개다. 다음 입증 의무를 갖춘 설계가 산출물이어야 한다.

- 실제 운영 대상·public443·인증서 발급/갱신·비공개 key 보관·Vercel origin/SNI/Host/리다이렉트와 장애 영향을 명시한다. 기존 Mac 공개 연결·포트 사용을 가정하지 않는다.
- 원문 request와 raw Host를 조작하지 않고 실제 Next own data-string initURL에 도달하는 dispatch, 조기 path/method 거부·완전한 응답 헤더·503·고정303/빈 fragment를 입증한다. HTTP/1.1 제한도 승인된 운영 조건으로 간주하지 않는다.
- E/J ingress/tunnel와 Home2455를 포함한 **둘째 hop 저장 전 억제**를 별도로 확보한다. A2만으로 이 부분은 바뀌지 않는다. 모든 수집/오류/trace 경계의 설정 근거가 필요하며 음성 probe만으로 비저장을 증명하지 않는다.
- DNS/인증서/기존 route·artifact 보존, 전환 중 구 ingress에 실인증 query가 도달하지 않는 조건, 동일 정책의 복구를 구체화한다. 활성화 후 OP01 미해결 Vercel callback으로 DNS를 되돌리는 복구는 허용하지 않는다. 참조 앱/진행 중 시도가 남으면 호환 relay를 유지한다.

**지금 필요한 확인은 이 범위 확장에 대한 설계 검토 허용 여부다.** 허용되어도 새 코드·infra 생성·인증서/DNS·probe·배포·실계정 적용은 포함하지 않는다. [인계의 명시적 경계](auth-next-main-handoff-2026-10-19.md)는 “A2 … 현재 호스팅 범위 밖”, “채택·구현·인프라 조사·DNS 변경은 미승인”이다. 이 제한 때문에 A2 조사나 구현을 자동 시작하지 않았다.

## 독립 준비의 재개 단위

| 단위 | 이미 닫힌 조사·보존할 근거 | 다음에 필요한 별도 범위 |
| --- | --- | --- |
| Home | 실제 merge revision·current backend29/source39 비교, Auto/monitoring 보존 이식 범위 | [Home report](evidence/auth-resume-decisions-2026-10-19/home-recovery/report.md)의 current 기반 새 OpenSpec/격리 worktree, backend5통합+Console12·frontend 공존 병합, 변경 통합 검증·새 frontend/runtime freeze. 구현 미승인; 옛 H/image/static 덮어쓰기 금지 |
| Estimate | 현 loaded 정책과 exact predecessor 정적 경로1570/84/14 감사 완료 | [Estimate report](evidence/auth-resume-decisions-2026-10-19/estimate-stop/report.md)의 immutable closed gate·private state/config·직렬 admission/exec·재시작 검증. 새 설계/구현 미승인; bootout/TERM만으로 무강제 종료 증명 불가 |
| 중앙 복구 | 당시 같은 project/main Production의 독립 postgres 세션·관련 catalog 권한 확인 | [owner 계획](evidence/auth-resume-decisions-2026-10-19/owner-recovery-plan.md)의 실제 private runner·현재 logging하 비노출·독립 재인증/보관·전체 복구 완성. schema 적용 후12table 소유권은 별도 확인. 사용자에게 경로/키/UUID를 요구하지 않음 |

위 준비는 relay 원인 규명과 독립적이지만 해당 새 구현 승인을 대신하지 않는다. 이번에는 기존 준비를 중복 생산하거나 운영 DB를 재조회하지 않고, 각 상세 report의 산출물·검증 기준·적용 경계를 연결했다. 현재 보관 root는 제안이며 이번 live capture는 없다.

선택한 범위의 제품/설정·보존/복구가 완성되면 각 적용만 승인받는다. 이후 **relay canonical 검증→schema→기존 Jay 등록→Home 개인 관리자→Estimate 실제 연결→별도 verified→Estimate 명시 grant→실HTTPS 수용**, 그다음 Jev·새 초대다. exact artifact의 실제 로컬 Auth/DB 허용경로와 실제 연결의 유효한 미허용 개인 JWT403을 구분하며 임시 bypass grant는 없다.

전환 직전 writer와 모든 data/backup/auth/config를 새로 보존한다. 강제kill·lock삭제·backup복원·옛 PID/일회성 승인 재사용·중앙 정책 뒤 password-only rollback은 금지다. Google·기존 UUID·Jay 단일 초기 관리자·회원별 명시 허용표·Home2455는 유지하고 재질문/계정 재생성은 없다. 기본 Supabase 메일과 Home SMTP 초대를 구분하고 초대 준비로 기존 Jay를 막지 않는다.

UI0.7.1 운영과 새 인증 수용은 별개다. 네 서비스 모두 실계정/권한/provider·실메일·HTTPS 수용과 Production 적격은 아직 완료되지 않았다. 최종 로그인/초대·401/403/503·회수/장애 logout·계정 전환·저장 보호·언어·재시작 검증을 로컬/합성 결과로 대체하지 않는다. 기존 언어, 자동 SSO·전역 logout·언어 동기화·견적 번역 금지와 모든 relay/parser/Host/Next/finalizer 보안 계약을 유지한다.
