# URL 통일 설계안 재검토 (sha256 `e9d4f595…6c7d`): 차단 2건

## 결론

경로 통일 구조 자체는 사용자 요구에 맞고, 구현 방향도 타당합니다. 그 구조는 다음 네 가지입니다.

- 외부 `/ko/calendar`를 내부 `/calendar`로 rewrite합니다.
- client provider는 locale 변경에도 다시 마운트되지 않습니다.
- 언어만 바꿀 때는 `history.replaceState`로 pathname만 바꿉니다.
- 전환 대상 문구는 모두 client에서 렌더합니다.

다만 **차단 2건을 고쳐야 최종 설계로 확정할 수 있습니다.** 이전 혼합안에 대한 리뷰는 이 판단에 사용하지 않았습니다.

## 차단 항목

**B1. §5: 코드로 하는 이동과 서버 redirect가 builder 규칙에서 빠져 있음** (근거: 소스 열람)
- §5는 렌더된 href만 builder로 만든다고 규정합니다. 하지만 `router.push`/`replace`, 서버 `redirect()`, `NextResponse.redirect`, form action의 목적지는 다루지 않습니다.
- Estimate 소비 복사본(`/Users/jaymini/.local/share/naeil-ui-rollout/consumers/estimate`)에서 실제 사례를 확인했습니다. 이 복사본이 운영 버전과 같다는 근거는 없습니다.
  - `src/app/page.tsx:3`의 `redirect('/estimates')`: `/ko`로 들어오면 내부 `/`로 rewrite된 뒤 이 redirect로 `/estimates`, 즉 영어로 떨어집니다.
  - `src/app/login/page.tsx:8`: return URL을 접두사 없는 `/estimates`로 만듭니다.
  - `src/features/calendar-preview/projects.tsx:29`: 하드코딩된 경로로 `router.push`합니다.
  - `src/components/app-frame.tsx:37`, `src/features/estimates/workspace-provider.tsx:80`: 전달받은 href로 `router.push`합니다.
- 경로 방식에서는 이런 이동이 언어를 잃으면 조용히 영어로 바뀌므로, query 방식보다 영향이 큽니다.
- **§5 둘째 문단 끝에 추가할 문장:**
  > client의 `router.push`/`replace`, 서버 `redirect()`/`NextResponse.redirect`, form/Action 완료 후 이동, 로그인 return 생성도 현재 요청의 locale로 `localeHref`를 거쳐 공개 경로를 만든다. `revalidatePath` 등 캐시 무효화는 내부 논리 route를 사용한다. 1단계 inventory에 이 이동 지점 목록을 포함하고, 접두사 없는 하드코딩 경로를 계약 시험으로 막는다.
- §12 "전체 연결" 행에도 "코드로 하는 이동과 서버 redirect × 3언어"를 추가합니다.

**B2. §11 4·5단계: 접두사 없는 경로의 의미가 바뀌는 시점이 정해져 있지 않음** (근거: 문서 추론)
- 4단계에서 수신용 버전을 배포하는 순간 Estimate의 `/calendar`(지금은 ja)와 Jev의 `/`(지금은 저장값을 따름)가 영어로 바뀌는지, 5단계까지 기존 동작을 유지하는지가 불명확합니다.
- 그런데 §4("배포 전에 일본어 북마크 갱신")와 §11.5("영어 기본 진입을 의도된 변경으로 기록")는 그 시점을 5단계로 전제합니다.
- 이 시점이 정해지지 않으면 롤백 지점도 정할 수 없습니다.
- **§11 4단계에 추가할 문장:**
  > 수신 버전은 `/ko`·`/ja`·legacy alias를 받되, 접두사 없는 경로는 앱 배포 설정으로 기존 해석(Estimate ja, Jev 기존 저장값)을 유지한다. 5단계에서 이 설정을 en으로 바꾼다.
- **§11 롤백 문단에 추가할 문장:**
  > 5단계 롤백은 이 설정을 되돌리고 송신을 끄는 것이며, 앱 바이너리는 4단계 수신 버전에 남는다.
- 이 설정은 npm 패키지나 원격 제어가 아니라 앱 배포 설정입니다.

## 확인 결과 (차단 아님)

1. **rewrite와 native history의 실현 가능성:**
   - 제 기억으로는 Next 문서의 native History API 예시에 `replaceState`로 locale 경로를 바꾸는 사례가 있습니다. 이번 세션에서 검증한 것은 아닙니다(추론).
   - 설계가 이를 "구현 초기 차단 시험"으로 두고 성공을 주장하지 않는 태도는 맞습니다.
   - 공개 경로와 내부 논리 route를 구분해 hydration과 active 불일치를 막는 점, 메뉴의 popstate를 구별하는 점도 이미 반영되어 있습니다.
2. **인증 경계:**
   - 순서(원본 외부 path → protocol 경계 → locale 해석 → 같은 인증 검사 → rewrite)와 locale이 붙은 protocol 경로를 404로 처리하는 규칙은 적절합니다.
   - §11의 "중앙 로그인도 새 return 경로를 허용하도록 준비"는 과한 표현입니다. 메인의 `canonicalRedirect`는 이미 정확한 origin 세 개의 모든 경로를 허용합니다(소스 열람: `src/lib/auth/redirect.ts:1-6`). 실제로 바꿀 곳은 Jev의 `validateReturnTo`와 Estimate의 return 생성(B1)입니다. 그래서 이 문장은 "메인 validator는 변경 없이 새 경로 수용을 시험으로 확인"으로 고치면 됩니다.
3. **루트 영어 의미 변화:** Estimate가 ja에서 en으로 바뀌는 것은 사용자 필수 요구와 정확히 일치합니다. 비강제 제안 링크와 북마크 갱신으로 충분합니다. legacy alias 우선순위(path가 lang보다 우선, `/en` 307 한 번)에도 모순이 없습니다.
4. **과잉 제약 1건:** §5의 "호환 lang의 중복·빈 값·미지원값은 400"은 일반 문서 GET에서 사용자가 빠져나갈 길이 없는 응답입니다. return 검증에는 그대로 엄격하게 적용하고, 일반 문서 진입에는 다음 문장을 추가하면 됩니다.
   > 400 응답 본문에 세 언어의 canonical 링크를 제공한다.

   차단은 아닙니다.

이번 재검토에서 한 일은 로컬 문서와 소스 열람, hash 확인뿐입니다. 파일 변경, 설치, 실행 시험, 외부 조사는 하지 않았습니다.
