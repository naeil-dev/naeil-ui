# 보호된 Preview 합성 검사 실행 결과 — 2026-10-19

**승인된 한 번의 실행을 완료했다. 합성 HTTPS178건을 보냈고, 생성한 검사 키의 부재와 실행 프로세스 종료를 확인했다. 운영 인증 전환은 미완료이며 현재 결과로 활성화할 수 없다.** 진단에서 원 query와 달라진 관측8건, query를 유지한308 리다이렉트18건, TRACE 응답의 보안 헤더 불일치6건이 확인됐다. 실제 계정/provider/메일은 사용하지 않았다.

이 결과는 [실행 준비와 독립 검토](auth-preview-baseline-readiness-2026-10-19.md) 이후 사용자가 구체적 [적용안](evidence/auth-preview-baseline-readiness-2026-10-19/executor-preparation/application-proposal.md)에 “응 진행해줘”라고 승인한 단위다. 이전의 미승인·미실행 기록은 준비 당시 상태다. 이 일회성 승인으로 새 키·재검사·WAF·로그·복구·Production 적용을 진행하지 않는다.

## 실행·회수·보존

실행 시간은2026-10-19 **12:06:05–12:07:07 JST**다. 기존 전용 Vercel credential을 검토된 실행기에서 사용해 검사 키1개 생성→고정된 진단v2/제품 literal Preview 검사→같은 키 회수를 수행했다. 실행 직전 동결9입력과 승인 적용안 해시를 확인하고, 새 비공개 승인과 격리된 최소 환경의 실행기를 사용했다.

| 항목 | 실제 결과와 범위 |
| --- | --- |
| 제어 요청 | 정상 경로의7개 reservation/marker, 실패 phase0. 두 deployment 조회·project 조회·생성·생성 대조·정확한 키 회수·부재 대조에 대응. 개별 wire 응답을 독립 검토자가 다시 조회한 것은 아님 |
| HTTPS | 진단70+ingress102+제품6=178. H1=93/H2=85. 모든 시도 결과 수집, 자동 재시도0·redirect following0 |
| 키 회수 |12:07:06.994 JST의 project readback에서 정확한 새 키 부재, 다른 키0. 이후 edge 요청으로 거부를 재검사하지 않음 |
| 실행 수명 | launcher와 소유 sender exit0, sender 종료 상태 확인, 강제kill0, 별도 recovery 사용0 |
| 설정 보존 | 제어기가 비교하는 project 투영에서 drift=false. `updatedAt`/`protectionBypass`를 제외한 투영의 관측 시점 동등성이고, 키 부재는 별도 검사. 전체 시간·모든 플랫폼 상태를 연속 감시했다는 뜻은 아님 |
| 승인 외 작업 | WAF/보호/Production 변경·로그 조회·추가 요청·실계정/provider/메일·schema/grant·운영 서비스 제어0 |

`hasOwnedKey=true`는 비공개 로컬 보관 기록이 남았다는 뜻이다. 원격 키가 여전히 유효하다는 뜻이 아니다. operation/approval/credential/key 기록은 원0700/0600 저장소에 보존하고 공개 증거에 복사하지 않았다. 회수 완료를 이유로 삭제하거나 재사용하지 않는다. Supabase DB 소유자 접근 복구와 업무 데이터 복구는 이번 키 회수와 별개다.

동결 hash는 `0a22050992634568e7d9c051c0761602b485189275cf5eb66567b2c456849aef`, 승인안 hash는 `5c35c2a50c6a72b87412ad8e2248529403f53097f5658bf98b9c0b2ac972d429`다. source/runtime/target의 상세 identity는 기존 동결·binding을 따른다. 안전한 수명 기록은 [lifecycle.json](evidence/auth-preview-baseline-result-2026-10-19/baseline-results/lifecycle.json)에 있다.

## 관측 결과

| 구분 | 응답 | 해석 |
| --- | --- | --- |
| 진단70 |200×57,400×13 | 원래 fixture의 metadata49건; 다른 fixture로 수렴한 응답8건; metadata 미관측13건 |
| ingress102 |400×6,308×18,404×48,405×30 |18개 redirect에 합성 query가 그대로 남음. TRACE4056개는 세 헤더의 정확한 값 검사 불일치 |
| 제품 Preview6 |403×6 | 빈 body·Location/cookie 없음·세 헤더 검사 일치. 실제 제품 handler가 생성했는지와 canonical 성공 경로는 미입증 |

`probeComplete=true`는 정해진178건의 실행 완료다. 보안 조건 통과를 의미하지 않는다. `redirects:0`은 응답18개에3xx가 없었다는 뜻이 아니라, 그 redirect를 따라가지 않았다는 뜻이다. `product403Proven=false`와 `operationalRolloutComplete=false`를 유지한다.

### OP-03: 전달값과 Host

49개 허용된 진단 투영은 own data-string `initURL`·원 fixture path/query 길이와 해시가 일치한다. 이때 절대 URL과 상대 fixture를 비교하는 `ownInitUrl.equalsFixture=false` 자체는 query 손실이 아니다. D17/D23/D28/D29의 H1/H2에서는 `request.url`이 달라도 own metadata의 원 path/query가 유지됐다.

별도의 안전한 로컬 분석은 동결된 진단 source로252개 유한 후보 body를 메모리에서 구성했다. 아래8개 응답은 각각 다른 fixture의 body와 길이·SHA256가 정확히 일치했고, 기존49개 투영의 직렬화도 각각 원 body hash와 일치했다. 독립 검토자는 전체 열거를 재실행하지 않고 source·모든8개 관측의 재직렬화·기존 counterpart를 대조했다.

| 양 protocol에서 보낸 입력 | 해시로 식별한 다른 관측 |
| --- | --- |
| D03: `%2f` | D04: `%2F` |
| D09: `%6eonce`와 `nonce` | D10: 두 literal `nonce` |
| D12: `code=%` | D27: 빈 `code=`. 로컬에서 예상했던 `%25` 형태가 아님 |
| D30: 끝의 빈 query pair 두 개 | D01: 그 빈 pair가 없는 query |

따라서 진단 partition은 **49 원 query 일치 /8 다른 query의 metadata와 해시 일치 /13 미관측**이다.8개의 원 sender 결과는 계속 `diagnostic=null`, `unattributed-http-response`로 보존한다. SHA256/동결 직렬화에 근거한 사후 설명이지, 원 전달 보존 성공으로 재분류한 것이 아니다. 변환이 CDN·ingress·Next/runtime 중 어느 지점에서 발생했는지는 미확정이다.13개400은10개 빈 body와15/15/45byte body이며 원문이나 거부 계층을 추정하지 않는다.

Host H01–H03(중복/누락)은400으로 내부 Host를 관측하지 못했다. H04–H10(대문자·명시443·header 이름 case·absolute-form·forwarded/routing header·H2 authority/Host 불일치)은 모두 단일 `bound-preview` Host로 관측됐다. 이는 wire Host의 원 byte/중복 보존이나 제품의 canonical authority 검증을 입증하지 않는다. raw Host=`naeil.dev` 규칙과 Preview/forwarded Host 불허를 유지한다.

[분석 보고서](evidence/auth-preview-baseline-result-2026-10-19/baseline-diagnostic-analysis/report.md), [정확한 관측·입력 hash](evidence/auth-preview-baseline-result-2026-10-19/baseline-diagnostic-analysis/analysis.json)를 따른다.

### OP-02: redirect·method·헤더

18개308은 세 서비스의 double-before-return/double-after-return/leading-double-slash를 양 protocol로 보낸 결과다. **모든 Location hash가 반복 slash를 합친 상대 경로+원 합성 query의 hash와 일치한다.** redirect를 따르지 않았고 실제 인증정보를 보내지 않았다.

18개308·TRACE4056개·Host H01–H03은 `Cache-Control: no-store`, `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`의 정확한 단일 값 검사와 일치하지 않았다. false만으로 header 부재/다른 값/중복 중 어느 것인지 구분할 수 없다. 나머지 HEAD/POST/OPTIONS/PUT24개405는 세 검사가 모두 일치했다. 이번 투영에는 Allow/CSP/X-Frame-Options 원문/완전성 검사가 없어 전체 응답 계약의 통과로 쓰지 않는다.

기존 Raw Path/TRACE WAF Deny 후보는 미적용이다. 저장된 공식 문서는 Raw Path/Method 등과 query key/value matching을 설명하지만, 원 query byte·중복/alias·wire Host를 보존·검증하는 수단이나 Deny의 임의 보안 헤더 제어를 입증하지 않는다. 일부 firewall을 우회할 수 있는 automation 키로 보낸 이번 결과는 일반 방문자의 WAF 동작 증거도 아니다. 기존 두 규칙을 이번 문제 전체의 해결책으로 바로 적용하지 않는다.

### OP-01: 비노출의 범위

모든178개 직접 응답에서 검사 키의 literal byte 반사는 관측되지 않았다. 이것은 인코딩/분할 반사나 app/platform/access/error/trace/cache 등 모든 저장소의 비노출 증명이 아니다. 로그를 열지 않았으며 둘째 hop으로 요청하지 않았다.

기존 OP-01은 **무해한 health query의 로그 표시 관측**이고 실인증 code/token 유출 관측이 아니다. 이번 합성 query redirect도 실제 계정정보 유출을 관측한 것이 아니다. 양 hop query 비노출 조건은 그대로 남으며 PKCE로 면제하지 않는다. 공급자 문의나 사람 답변 대기를 재개하지 않는다.

## 직접 대조·독립 검토와 보호 상태

[독립 결과 검토](evidence/auth-preview-baseline-result-2026-10-19/baseline-results/independent-results-review.md)의 hash는 `a2ae313205e9eed29a1f1fc80dfd031c13af03cc7bcef864a9b4ec90c4a2ceaa`다.178개 ID/group/method/protocol/binding, 요약3그룹,178개 원 결과 hash에 대응하는 직렬화를 확인했다. 독립 검토는 private approval/runtime/key·실행 환경·실서비스를 다시 열거나 검사하지 않았다.

메인도 저장된 안전한 결과와 source를 직접 읽고 [정적 대조](evidence/auth-preview-baseline-result-2026-10-19/baseline-results/root-evidence-check.json)에서178개 결과 직렬화·binding,49개 투영 body,8개 다른 관측 body,18개 Location hash, 분석3파일 및 현재14입력 hash를 확인했다. 기존 suite/178검사/252개 열거는 반복하지 않았다. 원 실행·안전한 export·사후 분석·독립 검토의 증거 수준을 구분한다.

S HEAD는 `02aa72e6e702bf6726659c6e7179e648eb648141`로 같고 source는 아직 wildcard다. literal은 scratch/Preview에만 있다. 이번 제품 코드 수정은 없으며 문서/새 안전한 증거만 저장했다. 이전 readiness/Preview manifest와 원 동결물을 보존했다. dirty source·terrific-buffalo 자산·기존 fixture/volume·SQL 종료 후 idle container에는 정리/제어를 수행하지 않았다. 이전 PID나 일회성 승인을 재사용하지 않는다. 범위 밖 세션·프로세스의 현재 상태를 다시 전수 확인했다는 뜻은 아니다.

## 다음 우선순위와 최소 재개 조건

다음 준비 범위는 [후속 증거 계약](evidence/auth-preview-baseline-result-2026-10-19/baseline-results/next-evidence-contract.md)에 고정했다. 현재 sender는175건의 request ID를 **해시만** 보관하므로 원 ID로 곧바로 로그를 찾을 수 있다고 전제하지 않는다. H01–H03에는 ID도 없다. 지원되는 query-free 제한 export와 provenance 필드를 먼저 확인해야 하며, 광역 로그/브라우저 조회나 오래된 관측 창을 채우려는 재검사를 자동 실행하지 않는다.

1. 기존 증거로 원 query/Host가 달라지는 경계와 pre-app redirect/method 응답 주체를 좁힌다. 더 이른 관측이 필요하면 finite synthetic 입력·closed 출력·동일 target/source 보존을 갖춘 별도 관측안을 검토한다. strict parser·own initURL/503·`path`/`nxtPpath`·고정303/빈 fragment·finalizer를 바꾸거나 진단 허용표를 넓히지 않는다.
2. 실제 ingress 적용안은 지원되는 match/order/응답 헤더·일반 client와 보호된 검사 경로의 차이·현재 상태 snapshot·새 소유 규칙만 제거하는 복구까지 구체화해야 한다. **현재 WAF/새 probe 적용안은 승인 요청 가능한 상태가 아니다.** 원 조건을 충족할 수단이 입증되지 않으면 구체적 정책/구조 검토가 필요하며 자동 완화하지 않는다.
3. 기존 Jay→Estimate 순서를 유지한다. relay를 먼저 승인·검증하고 Home 개인 관리자·중앙 정책, schema→기존 Jay→실제 Auth/고정service 연결 증거→별도 verified→명시 grant를 연결한다. 유효하지만 미허용인 JWT403 검증과 grant 뒤 HTTPS 허용 검증을 분리해 순환 조건을 만들지 않는다.
4. 전환 직전 writer·모든 data/backup/auth/config 보존, 독립 DB owner 접근과 Estimate의 무강제 종료 수단은 여전히 필요하다. KeepAlive/RunAtLoad/ExitTimeOut 조건을 우회하지 않는다. 중앙 권한 적용 뒤 password-only rollback은 금지하며 참조 앱/진행 중 시도가 없어질 때까지 relay를 유지한다.

Home은 기존2455 주소를 유지한다. 기본 Supabase 메일 설정과 새 Home 직접 SMTP 초대 흐름은 별개이고 기존 발송 경로는 미확인이다. 새 초대 준비가 기존 Jay 연결 준비를 막지 않으며 Jev·새 초대는 Estimate 뒤에 진행한다. 실계정/HTTPS의 로그인·초대·401/403/503·회수/장애 logout·계정 전환·저장 보호·언어·재시작이 끝나야 운영 전환 완료다.

전체 안전한 산출물은 [manifest](evidence/auth-preview-baseline-result-2026-10-19/manifest.json)에 고정한다. credential/key/operation ID/raw response/raw log는 포함하지 않는다.
