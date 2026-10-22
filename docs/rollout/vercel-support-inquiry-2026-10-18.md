# Vercel 비공개 문의 발송 결과 — 2026-10-18

사용자가 승인한 [문의 초안](evidence/vercel-auth-preflight-2026-10-18/provider-inquiry-draft.md)을 기존 로그인된 Vercel 지원 대화에 전송했다. **지원 AI의 답변은 받았지만 사람 담당자의 케이스 접수는 확인되지 않았다.** 공식 CDN 지원 폼은 팀 권한·지원 요금제 확인 오류로 거부됐다. 인증 활성화 조건 OP-01–03은 그대로 열려 있다.

대상은 `naeils-projects/design-system`/Hobby다. [비공개 지원 대화](https://vercel.com/help?project=design-system&product=vercel&teamSlug=naeils-projects&c=true&thread=160a972f-02b9-4fb7-9aae-3ee9c231ad02)는 로그인 권한이 필요하다. 이 thread ID는 support case 번호가 아니다.

## 전달과 응답

1. 프로젝트 Support → New Case에서 Vercel Platform과 기존 팀을 선택했다. 초안의 실제 문의 본문3515자를 전송하고 대화에 표시된 것을 확인했다. 내부 작성 지침·draft 제목은 발송 본문에서 제외했다. 무해한 health marker/request ID만 포함했으며 실제 인증 code·token·회원 식별자·환경변수 값은 전달하지 않았다.
2. Vercel 지원 AI는 project/path별 query 저장 전 차단 기능과 플랫폼 전체 보장이 없다고 답했다. 사람 담당자의 서면 확인, 요금제별/계약상 예외, 공식 근거와 case 번호를 요청했다. AI는 capability clarification/security design/compliance 문의로는 케이스를 만들 수 없다고 답하며 공식 Security support 페이지를 안내했다.
3. 안내 URL은 처음 vulnerability 화면을 열었으나, 실제 선택은 `Firewall, CDN, or WAF support` → `CDN`으로 바꿨다. 취약점·장애를 신고하지 않았고 HackerOne이나 공개 forum에 게시하지 않았다. 기존 로그·공식 문서를 확인한 후, 같은 문의와 원래 대화 링크, “outage/vulnerability/account compromise를 주장하지 않는다”는 설명을 넣었다. 프로젝트/팀/본문3864자 일치를 직접 확인한 뒤 한 번 제출했다.
4. 폼은 다음 오류를 표시하고 입력을 보존했다: **“Check your team permissions and support plan. Sign in with SSO if required, then try again. Your information has been kept.”** 현재 로그인과 팀 선택은 유지됐다. 이 메시지만으로 원인을 Hobby 요금제 또는 특정 역할 하나로 확정하지 않는다. 재로그인·요금제 변경이나 다른 유형으로 재분류한 중복 제출은 하지 않았다.

제출 후 프로젝트별 및 팀 전체 `All projects` 지원 목록 모두 `No Cases`였다. 접수 번호는 발급된 것으로 확인되지 않았다.

지원 AI의 응답은 사람이 확인한 공급자 보장이나 모든 내부 로그 경로의 검증이 아니다. AI가 예시로 제안한 `response_mode=form_post` 역시 현재 Supabase Auth와 기존 nonce/취소/PKCE 계약에서 동작하는지 검증되지 않았으며 채택·구현하지 않았다. 기존 [사전 검증 결과](vercel-auth-preflight-2026-10-18.md)의 실제 query 로그 관측과 로컬 어댑터 한계를 유지한다.

## 상태와 재개 조건

- 완료: 승인된 비공개 지원 대화 전송, 사람 담당자 확인 요청, 공식 CDN 폼 제출 시도, 응답·오류·본문 보존.
- 미완료: 사람 담당자의 접수 번호와 서면 답변. 지원 케이스가 접수됐거나 답변 대기 중이라고 표시하지 않는다.
- 최소 재개 조건: 같은 팀의 비공개 사람 지원을 이용할 수 있는 권한/지원 경로 확인, 또는 기존 호스팅을 유지하는 보안 계약·아키텍처의 명시적 재검토. 동일 문의 재접수의 발송 승인은 이번 사용자 지시로 유효하지만 유료 플랜·설정 변경 승인은 포함하지 않는다.

배포·hosted 설정·schema·실계정·권한·운영 process·DNS/tunnel은 변경하지 않았다. 자동 polling/외부 발송 예약을 만들지 않았다. 제품 suite는 반복하지 않고 문서·증거 무결성 및 기존 사이트223 source 입력만 대조했다. 소유 browser tab/session만 닫았다.

증거 root는 `/private/tmp/naeil-vercel-support-20261018-8ek8w3f2`다. 저장소에는 operator 표시를 가린 선택 snapshot, 실제 발송 본문과 [접수 상태 영수증](evidence/vercel-support-inquiry-2026-10-18/submission-receipt.json), [해시 목록](evidence/vercel-support-inquiry-2026-10-18/evidence-manifest.json)을 남겼다. 초안과 이전 receipt는 그대로 보존하고 이전 보고서에는 이 결과의 링크만 추가한다.
