# 인증 query 변형 경계 조사와 다음 진단안 — 2026-10-19

**기존 증거와 배포 코드를 대조해 다음 관측 위치를 한 곳으로 좁혔다.** middleware의 query 재직렬화는 네 변형 중 세 가지를 로컬에서 재현하지만, 그 값이 API로 전달됐다는 연결은 미입증이다. D12의 `%`→빈 값은 설명되지 않는다. 다음 안은 별도 진단 후보가 **exported function entry에서 원 Next handler로 넘기기 전의 값과 기존 own-initURL을 같은 요청 안에서 비교**하도록 하는 것이다. Node/플랫폼의 HTTP 처리 전 wire byte를 관측하는 것은 아니다. 아직 새 observer/schema/artifact를 구현하거나 배포하지 않았다.

사용자의 “다음 우선순위를 진행”에 따라 승인된 읽기 전용 조사·준비를 수행했다. [완료된 Preview baseline](auth-preview-baseline-result-2026-10-19.md)의 한 번 적용·키 회수는 반복하지 않았다. 새 구현·설계 변경은 인계에서 포괄 승인되지 않았으므로, 아래 구체적인 로컬 후보 범위만 다음 결정으로 제시한다. hosted probe/로그/WAF/Production/실계정 적용 승인은 포함하지 않는다.

## 확인한 원인 후보와 남은 공백

[정적 코드 추적](evidence/auth-boundary-preparation-2026-10-19/query-trace/report.md)은 기존 diagnostic-v2 archive·inventory와 관련 emitted19/source6파일을 바인딩했다. 원 middleware launcher는 입력 URL을 adapter로 전달하고, adapter는 skip-normalize 옵션과 관계없이 `URL.searchParams.delete('_rsc')`를 수행한다. 이 연산은 `_rsc`가 없어도 query를 다시 직렬화한다. 사용자 proxy는 response headers와 next 응답만 반환하며, 재직렬화된 URL을 다음 API 요청으로 넘기는 코드 연결은 발견하지 못했다.

| 기존 hosted 변형, H1/H2 각1건 | 네 입력의 새 로컬 비교 |
| --- | --- |
| D03: `%2f`→`%2F` | middleware 및 후반 normalizer가 같은 형태를 만듦 |
| D09: encoded nonce key→literal duplicate key | 두 연산 모두 같은 형태를 만듦 |
| D30: 끝의 빈 pair 두 개 제거 | 두 연산 모두 같은 형태를 만듦 |
| D12: `code=%`→빈 `code=` | 두 연산 모두 `%25`가 되므로 관측을 설명하지 못함 |

비교는 분석 호스트 Node22.23.2에서 네 입력만 메모리로 처리했다. 기존 build의 Linux Node24.21.0나 hosted runtime을 재실행한 것이 아니다. URL 생성만 하는 대조에서는 네 query가 보존됐다. 원30fixture·representation·sender 분류를 바꾸지 않았다.

Node API 경로에서는 launcher가 원 `(req,res)`를 Next에 넘기고, Next가 그때의 `req.url`을 own `initURL`에 저장한 **뒤** 조건부 `normalizeCdnUrl`이 실행된다. 후반 normalizer만으로 이전에 저장한 문자열의 변형을 설명할 수 없다. 입력이 이미 API 진입 전에 달라졌는지, 외부 wrapper/metadata 경로가 개입했는지 확인할 관측이 빠져 있다. 현재 결론은 변환 구간의 후보이며 CDN 또는 Next의 단독 원인 확정이 아니다.

## redirect·TRACE·Host와 플랫폼 조회

[플랫폼 계약 조사](evidence/auth-boundary-preparation-2026-10-19/ingress-contract/report.md)는 공식 문서·보존 OpenAPI·cached CLI50.33.1 source를 읽었다. 공개 문서 요청만 했으며 계정/API/로그/브라우저/기존 배포물에 새 요청을 보내지 않았다.

- Next의 early slash/backslash308 코드는 Location과 body에 같은 정리된 URL을 넣는다. 저장된18응답의 body는 모두 같은15byte이고 Location과 digest가 다르다. 따라서 Location 형태가 같다는 이유로 그 코드가 받은 전체 응답을 직접 생성했다고 할 수 없다. 플랫폼 응답 또는 중간 변경 등은 미확정이다. [새 body/Location 대조](evidence/auth-boundary-preparation-2026-10-19/ingress-contract/redirect-body-comparison.json)는 저장된 영수증만 사용했다.
- TRACE405의 일반 오류 문서는 실제 여섯 응답의 생성 주체를 입증하지 못한다. Host H01–H03은 미관측, H04–H10은 bound-preview 관측이라는 기존 해석을 유지한다. `raw Host=naeil.dev` 규칙을 Preview/forwarded Host 허용으로 우회하지 않는다.
- MCP에는 `group_by` 집계 기능이 있다. 그러나 건수 집계는 원 query byte·개별 응답 헤더·생성 주체를 입증하지 못한다. REST/cached CLI/현재 v64+ CLI 문서에서도 필요한 query-free 제한 필드 export 계약을 확인하지 못했다. 모든 플랫폼 export가 불가능하다는 단정은 아니다.
- sender가 보관한 것은175개의 `x-vercel-id` 해시이며, runtime-log Request Id와의 매핑은 미입증이다. 광역 로그에서 찾아보거나 ID를 복원할 수 있다고 전제하지 않는다. H01–H03에는 그 해시도 없다.
- WAF Raw Path/Method/Hostname/Environment와 query key/value matching은 문서화됐다. 하지만 모든 pre-app 처리에 대한 순서, 원 query byte/중복 Host 보존, Deny 보안 헤더 제어가 입증되지 않았다. automation bypass 경로가 일반 방문자와 같은 custom rule을 거친다는 보장도 확인되지 않았다. 이전 두 WAF 규칙은 미검증 후보다.

정확한 공식 URL·선택 문구·snapshot hash는 [공식 계약 발췌](evidence/auth-boundary-preparation-2026-10-19/ingress-contract/official-contract-excerpts.json)에 있다. 원 공개 snapshot13개는 scratch에 보존했고, full HTML·generated config/maps를 저장소 증거에 복사하지 않는다.

## 구체적인 다음 작업 단위

[로컬 진단 후보안](evidence/auth-boundary-preparation-2026-10-19/observation-proposal.md)을 따른다. 변경은 진단 전용 API entry wrapper·같은 요청의 유한 carrier·성공한 기존 진단 응답의 새 버전/entry 필드·새 packaging으로 한정한다. 기존 guard가 거부한 입력을 허용하거나 실제 제품의 parser·own-initURL/503·path/nxtPpath 거부·고정303/빈 fragment·finalizer를 바꾸지 않는다.

entry는 기존30fixture/representation의 **정확히 알려진 형태** 또는 unknown/unavailable만 보고한다. 원 URL/query/헤더/환경/ID/오류나 임의 입력의 길이/hash를 새로 출력하지 않는다. form은 보낸 case ID로 추정하지 않고, original/다른 형태/미관측의 차이를 유지한다. default/조건부 metadata handler와 preload, interleaved 요청의 격리·단일 전달·실제 포장 연결을 로컬에서 확인한다. 새 후보는 원 CLI 출력에 명시적 diagnostic composition을 추가한 별도 identity다.

보존 판정은 sender ledger·인식된 entry·인식된 own metadata의 **고정 query byte 세 가지**를 별도로 비교한다. 예상된 callback→internal 경로 차이는 query 손실이 아니며, entry/own이 같은 query여도 sent와 다르면 변형이다. 기존 `deploymentBinding(process.env.VERCEL_URL)`의 source/policy와 invalid-binding503을 보존하고 새 authority/correlation/env fallback은 추가하지 않는다. 고정 fixture 정책과 기존 공개 runtime binding을 구분하므로 미래 hostname을 build 전에 요구하지 않는다.

향후 hosted 요청안은 D01 대조와 D03/D09/D12/D30을 H1/H2로 각1회, 총10회다. 이는 **미승인 후보**이며 새 로컬 source/schema/artifact 검증 뒤 별도 protected Preview 배포안과 검사 키 생성→10회→정확한 회수의 새 적용안을 만든다. deployment ID/hostname은 생성 결과로 받은 뒤 바인딩하므로 생성 전 존재를 요구하지 않는다. 기존 승인·키·PID·동결 실행기를 새 단위에 그대로 재사용하지 않는다.

## 검증·보존·완료 경계

메인은 [직접 정적 확인](evidence/auth-boundary-preparation-2026-10-19/root-review/static-check.json)에서 담당 manifest6파일, source/emitted25파일+archive/inventory2개, 입력10개, source 발췌9곳, 공개 snapshot13개, 보존 OpenAPI/CLI source를 대조했다. 새 비교4건은 담당 실행 결과이며 메인이 반복 실행한 것으로 세지 않는다. baseline178/기존 suite/252body 열거도 반복하지 않았다.

[최초 독립 검토](evidence/auth-boundary-preparation-2026-10-19/independent-review/report.md)는 query byte와 full form의 구분, 기존 공개 deployment binding 보존을 Important 명세 보완2건으로 지적했다. 초기 문서/검토를 보존한 채 해당 두 항목과 exported-function-entry 표현만 수정했고, [좁은 재검토](evidence/auth-boundary-preparation-2026-10-19/independent-review/clarification-review.md)에서 **명세상 해결**을 확인했다. 재검토 SHA256는 `28131722fc26c8ada697a9186f2c4557d46e8a6a5eaf5d17c8895be1df491c5b`, 최종 후보안 SHA256는 `2fdc514b25aa800504b7a289bce8a3cf62e366da5865677d4d213ca7e3e14d69`다. 텍스트/해시 검토이며 새 구현·packaging·runtime·hosted 검증 통과를 뜻하지 않는다. 메인은 최종 보고서와 현재/이전 문서의5개 고정 hash를 직접 대조했다.

S HEAD는 `02aa72e6e702bf6726659c6e7179e648eb648141`로 같고 wildcard를 유지한다. 기존 dirty 구현16파일과 이전3개 manifest, 원 freeze와 baseline/독립 보고서를 보존한다. 이번 저장소 변경은 이 결과·선별된 안전한 증거와 STATUS/인계의 최신 연결뿐이다. 기존 fixture/volume/idle container·terrific-buffalo 자산·실행 프로세스에는 접근·정리·제어를 하지 않았으며, 이를 현재 상태 전수 재검증으로 표시하지 않는다.

OP-01은 health-query 로그 관측이며 실인증정보 유출 관측이 아니다. 양 hop 비노출, OP-02/03, canonical Host/제품403 provenance는 열린 상태다. 새 진단을 만들어도 운영 완료가 되지 않는다. 사용자 승인을 받은 새 구현 범위를 넘어서 정책/구조를 변경하지 않으며 공급자 문의·사람 답변 대기는 재개하지 않는다.

기존 Jay→Estimate가 먼저다. Home2455 개인 관리자·중앙 정책·relay, schema/Jay/실제 JWT와 고정service 연결 증거/별도 verified/명시 grant의 의존성을 유지한다. relay 승인·검증 후 전환 직전 writer/data/backup/auth/config 보존, 독립 DB owner 복구와 무강제 종료 수단을 확인한다. 중앙 정책 뒤 password-only rollback은 금지하며 relay는 참조와 진행 중 시도가 없어질 때까지 유지한다. Jev·새 초대는 이후이고, 기본 메일 설정과 새 Home 직접 SMTP 초대는 별개다.

다음 결정은 **위 진단 한 지점의 별도 후보 제작과 로컬 검증·배포안 준비까지**다. 실제 배포·키·10회 HTTPS·WAF·로그·실회원 적용은 그 산출물을 완성한 뒤 각각 필요한 승인 단계로 남는다. 전체 운영 전환 완료 기준은 승인된 실계정·artifact·HTTPS의 로그인/초대·401/403/503·회수/장애 logout·계정 전환/저장/언어/재시작이다.

전체 안전한 복사본은 [manifest](evidence/auth-boundary-preparation-2026-10-19/manifest.json)에 고정한다.
