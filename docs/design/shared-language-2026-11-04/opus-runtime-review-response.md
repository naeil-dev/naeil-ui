# 내부 구현 통일안 리뷰 (sha256 `3d13a0d3…14bb7`): 조건부 승인

## 결론

**방향은 실현 가능하며, 차단 1건과 핵심 수정 1건을 반영하면 승인입니다.**

- 세 앱 모두 next-intl과 `app/[locale]`을 쓰고, 업무 store는 `[locale]` 위에 둡니다. 이 구조는 메인이 이미 쓰는 방식입니다. 메인은 `src/app/layout.tsx:20-22`에서 `getLocale()`로 `<html lang>`을 SSR하고, `[locale]/layout`에 `generateStaticParams`가 있습니다(소스 열람). 그래서 메인의 정적 렌더링이 퇴행할 위험은 없습니다.
- App Router에서 `[locale]` 값이 바뀌면 그 아래 트리는 다시 마운트되지만 root layout의 client provider는 유지됩니다. 따라서 store를 그 위에 두는 경계 설정은 맞습니다(추론, 설계대로 초기 차단 시험 대상).
- Jev 스트림은 client `fetch`와 `response.body.getReader()`로 동작합니다(`jev/src/lib/comparison/stream.ts:8`, 소비 복사본 열람). 그러므로 AbortController와 reader를 root store로 옮길 수 있습니다.
- next-intl은 이미 optional peer dependency입니다(`package.json:173-175, 279-283`). 공통 provider와 앱의 `useTranslations`가 서로 다른 next-intl 사본을 쓰는 문제는 구조적으로 막혀 있습니다.

## 차단 — §6 마지막 문단, §7 "명시 선택 intent" 문단: RSC 실패나 인증 실패 때 store를 유지한다는 약속이 지금 메커니즘으로는 성립하지 않음

**근거 (추론: Next 라우터 동작에 대한 제 기억이며, 이번 세션에서 실행 검증은 하지 않았습니다)**
- App Router의 `router.replace`는 RSC 응답이 실패하거나 RSC가 아닌 응답(cross-origin 로그인으로 가는 redirect, 401/5xx HTML 등)을 받으면 **document navigation으로 전환합니다**.
- document navigation이 일어나면 root store를 포함한 JS 상태 전체가 사라집니다.
- 그런데 설계는 세 가지를 약속합니다.
  - 네트워크 실패 시 업무 store를 유지한다.
  - RSC 인증 실패 시 복구 UI를 보여준다.
  - 편집기를 중앙 로그인으로 자동 이동시키지 않는다.
- 지금 문서의 proxy 순서(§8: 인증 검사 → rewrite)대로라면 RSC 요청도 로그인 redirect를 받게 되고, 그 결과 상태가 사라집니다.
- 추가로 Jev에는 `beforeunload` 보호가 없습니다(소비 복사본 grep 결과 Estimate `workspace-provider.tsx`에만 있음). 그래서 이 전환이 일어나면 스트림이 아무 경고 없이 끊깁니다.

**§6 마지막 문단에 추가할 문장:**
> RSC 요청(Next RSC 요청 헤더)의 인증·권한 실패는 proxy가 redirect나 401을 보내지 않는다. `[locale]` 세그먼트가 보호 데이터 없는 복구 UI를 정상 RSC payload로 반환한다. redirect나 RSC가 아닌 응답은 Next가 document 이동으로 바꿔 store를 잃게 하기 때문이다. 최초 document 요청만 기존 로그인 redirect를 쓴다.

**§7 intent 문단의 "네트워크 실패에는 업무 store를 유지하고…"를 다음 문장으로 바꿉니다:**
> RSC 요청 실패로 framework가 document 이동을 시도할 수 있으므로, 미저장 입력·미제출 dialog·진행 중 스트림이 있는 동안에는 locale 전환에도 `beforeunload` 확인을 유지한다(Jev 포함). 사용자가 확인 없이 업무 상태를 잃는 경로가 없어야 한다. 이 fallback 발생 여부를 §6 초기 차단 시험에 포함한다.

**§12 업무 상태 행에 추가합니다:**
> RSC 실패·세션 만료 상태에서 전환했을 때 store 유지 또는 사용자 확인

## 핵심 수정 — §6 "수명 구조"·"Estimate의 raw invalid…" 문단: 다시 마운트된 화면이 store를 덮어쓰지 않는 규칙이 없음 (추론)

- locale route 이동은 `[locale]` page의 서버 데이터를 다시 가져오고, 다시 마운트된 편집기는 새 server props를 받습니다.
- 편집기가 마운트될 때 props로 store를 초기화하면, store를 root로 옮겨도 raw invalid 입력과 undo가 덮어써집니다.

**추가할 문장:**
> 같은 사용자·entity·revision의 store 항목이 있으면 다시 마운트된 화면은 server props로 store를 재초기화하지 않는다. 서버 revision이 더 새로우면 기존 충돌/저장 실패 흐름을 따르며 조용히 덮어쓰지 않는다.

## 비차단 (명확화 1건)

**§9 공통 JSON:** 헤더의 standalone `locale` props 호환 모드는 provider가 없으므로 공통 사전 세 언어를 모두 번들해야 합니다. 이것이 §7의 "필요한 사전만 bundle"과 문자 그대로는 충돌합니다.

다음 문장 하나를 추가하면 됩니다:
> NextIntlClientProvider 아래에서는 `naeil` namespace를 context에서 읽고, standalone 호환 모드에서만 작은 공통 사전 세 언어를 정적으로 포함한다.

나머지 항목은 차단이 아닙니다. 공통 JSON 단일 원천, 앱별 namespace, 검사기, DB 미도입, intent token commit, 메인 예외 제거, auth/return/rollback 계약 유지가 여기에 해당합니다.

파일은 수정하지 않았습니다. 이번 리뷰에서 한 일은 로컬 문서와 소스 열람, hash 확인뿐이며, 실행 시험이나 외부 조사는 하지 않았습니다.
