# naeil locale 서비스 등록 경계 제안

작성일: 2026-11-09 JST. **검토용 제안 — 미승인·미구현.** 오너의 순서는 설계 문서 → 검토 → 구현 여부 결정이다. 이 문서는 코드 변경, 패키지 발행, consumer 업그레이드 또는 운영 활성화를 승인하지 않는다.

조사 기준은 `ds-improvements-20261109`의 HEAD `8bdace588df5d93fa86b9764cfa6a972e7b21f28`(PR #41 merge)와 읽은 작업 트리다. 다른 작업자의 미커밋 변경은 수정하지 않았다. 아래 `파일:행`은 이 조사 시점의 위치다. 로컬 소스·기존 기록을 대조했으며 npm/운영 상태를 새로 조회하지 않았다. `STATUS.md:1–5`와 `docs/releases/0.11.0/README.md:1–11`은 준비 당시 candidate 기록이고, 작업 트리 `AGENTS.md:5`에는 이후 발행 확인이 적혀 있다. 둘을 동일 시점의 상태로 해석하지 않는다.

## 1. 현재 구조와 보안 경계

현재 하나의 통합 서비스 레코드에 모든 정보가 들어 있지는 않다.

| 위치 | 현재 소유 정보와 사용처 |
| --- | --- |
| `src/naeil-locale/routing.ts:22–61` | 고정 service ID, 정확한 HTTPS origin, UI route 패턴과 `protected`, 추가 protocol prefix 및 정확한 UI 예외. `naeilServices.site`는 `main` 객체의 alias이며 독립 ID가 아니다. |
| `src/naeil-locale/server.ts:94–101` | 일반 오류 문서용 ID별 이름·favicon 표. `.naeil`/`/icon.svg`, Jev/없음, AB Estimate/`/favicon.svg`, abstorm/없음. routing 레코드의 필드가 아니다. |
| `src/naeil-locale/server.ts:160–168`, `DESIGN.md:159–170` | 정상 페이지 제목은 호출자가 `title`, `serviceName`을 제공한다. 공개 canonical/언어별 alternate만 routing을 이용한다. 정상 페이지 favicon 파일·metadata·배포는 앱 소유다. |
| `src/components/naeil-header-data.ts:5–13`, `src/components/naeil-header-core.tsx:19–49,97–114` | 별도 헤더 카탈로그는 현재 naeilUi의 `/design` 한 항목. `resolveHref`, `projects`, `appNavigation` 등으로 목적지를 공급한다. locale registry에서 서비스 메뉴를 자동 생성하지 않는다. |
| `src/components/naeil-footer-core.tsx:13–42`, `src/naeil-locale/chrome.ts:1–4` | 푸터는 메인 `/`, `/projects`, `/blog`, GitHub 링크를 별도로 구성한다. locale chrome entry는 기존 core를 재수출한다. 헤더·푸터 core의 기본 resolver도 `localeHref` 호출이 아니라 별도 URL 조합이며, consumer가 locale builder를 연결해야 한다. |

등록된 UI inventory는 다음과 같다(`routing.ts:50–60`). `protected` 생략 또는 문자열 route는 현재 공개로 취급된다.

| 서비스 / origin | 보호 UI | 공개 UI / protocol 예외 |
| --- | --- | --- |
| main / `https://naeil.dev` | `/login/change-password` | `/`, `/projects`, `/design`, `/blog`, `/blog/[slug]`, `/login` |
| jev / `https://jev.naeil.dev` | `/` | `/login` |
| estimate / `https://abestimate.naeil.dev` | `/`, `/estimates`, `/estimates/[id]`, `/compare`, `/settings`, `/calendar`, `/calendar-preview`, `/calendar-preview/estimates`, `/calendar-preview/estimates/[id]` | `/login`, `/access-denied`, 정확한 UI 예외 `/auth/complete` |
| abstorm / `https://abstorm.naeil.dev` | `/`, `/new`, `/runs/[id]`, `/runs/[id]/report`, `/experts` | 없음. `/new?copy=<id>`는 `/new`의 query다. |

공통 protocol prefix는 `/api`, `/auth`, `/_next`, `/_vercel`, `/.well-known`, `/health`, `/invite`, `/return`, `/webhook`, `/images`, `/fonts`이며 별도 protocol 파일 목록도 있다(`routing.ts:36–37,66–67`). 이것은 UI 언어 처리 제외 목록이지 인증 허용 목록이 아니다.

주요 소비 흐름:

- `defineLocaleService`는 ID와 origin의 정확한 일치, 비어 있거나 중복된 inventory, 경로 문법·locale/protocol 충돌, 정확한 protocol UI 예외를 검사하고 객체를 고정한다(`routing.ts:39–48`). `resolveLocaleUrl`은 안전하지 않은 인코딩·중첩 locale·미등록 UI를 거부한다(`routing.ts:90–110,121–143`). wildcard로 모든 앱 페이지를 받지 않는다.
- proxy는 외부 private marker 제거 → 기존 protocol hook → UI 분류 → 앱 authorizer → locale 처리 순서다. 보호 route에 authorizer가 없으면 문서는 503, RSC는 unavailable 접근 경계를 전달한다. RSC 접근 표시는 인증 증명이 아니며 서버 데이터 읽기는 다시 authorize해야 한다(`server.ts:25–33,104–156`; `docs/components/naeil-locale.md:46–50`).
- `localePath`와 `localeHref`는 목적지의 등록 UI 여부를 검사한다. 후자는 origin까지 붙이므로 다른 서비스로 보내는 링크도 대상의 origin **및 route**를 알아야 한다(`routing.ts:146–158`). controller와 intent는 같은 inventory로 현재/목표 경로와 언어 전환을 판단한다(`client.tsx:57–71,84–112`; `intent.ts:1–26`).
- 검사기는 역할이 다르다. `scripts/check-locale-messages.ts:1–10`과 `checker.ts:43–69`는 언어·namespace·ICU 계약을, `scripts/check-locale-package.ts:29–41`은 번들 경계·공유 context·lazy 사전을 검사한다. **실제 앱 route와 registry의 일치나 보호 여부를 자동 입증하지 않는다.** routing/proxy 회귀는 `routing.test.ts:4–73`, `server.test.ts:12–158`, packed API/type 소비는 `scripts/check-consumers.ts:177–186`에 있다.

엄격함의 목적은 잘못된 호스트로 링크를 만들지 않고, 미등록 UI를 거부하며, 보호 UI에 인증 없이 진입시키지 않는 것이다. 다만 현재 보장을 과장하면 안 된다. 이미 공개 API인 `LocaleServiceInput`은 ID **또는 객체**이며 `getLocaleService`는 전달 객체를 재검증하지 않는다(`routing.ts:62–65`, `index.ts:1`). 따라서 모든 진입점에서 검증이 강제되는 구조는 아니다. 또한 proxy의 `requestOrigin`은 앱이 검증한 요청 authority를 별도로 받고 형식만 검사한다. registry origin을 요청 Host 인증이나 auth-return allowlist로 해석할 수 없다(`server.ts:58–65,115–119`; `routing.ts:121,146`).

## 2. 관찰된 비용과 필요한 공유 범위

AB Storm은 `15f4d0c`에서 route/origin/type, 오류 identity, 회귀 시험, consumer fixture, 버전·릴리스 문서를 함께 변경했고 PR #41로 병합됐다. 0.11.0 기록은 다섯 보호 UI, 오류 identity, 기존 chrome catalog 유지와 consumer 통합 분리를 명시한다(`docs/releases/0.11.0/README.md:5–7`; `docs/components/naeil-locale.md:40–44`). 별도로 발견된 `.d.ts` 문제도 릴리스 검증 비용에 포함됐으나, 그 결함이 서비스 등록 자체의 필수 동작은 아니다.

현재 **패키지 기본 registry를 변경하는** 새 서비스·route 변경은 패키지 릴리스와 그 정보를 쓸 consumer의 업그레이드로 이어진다. 모든 consumer를 동시에 올려야 하는 것은 아니다. 또한 “모든 route 변경에 반드시 릴리스가 필요하다”는 표현은 코드보다 강하다. 기존 ID에는 이미 `defineLocaleService({...})`로 앱 inventory를 정의하고 proxy/controller/builder에 객체를 전달할 수 있다. 반면 새 ID/origin은 validator와 타입에 고정되어 있어 정상 등록에 패키지 변경이 필요하다. 객체 우회를 공식 등록 절차로 삼아서는 안 된다.

| 정보 | 해당 앱 자체 필요 | 다른 서비스 필요 / 제안 소유권 |
| --- | --- | --- |
| ID와 정확한 origin | 자체 URL·metadata | 교차 링크 대상 식별에 필요. 공유 카탈로그 유지. |
| UI 경로 전체·보호 여부 | proxy, 언어 전환, 내부 링크 | 전체 inventory와 보호 flag는 송신 앱의 인증 판단에 불필요. 앱 소유 가능. |
| 교차 링크로 노출할 UI 경로 | 실제 수신 route와 일치해야 함 | `localeHref`의 목적지 검사를 위해 필요. 공유 origin만 남기면 현재 검증을 잃는다. 공유 링크 경로 계약 유지. |
| protocol 추가 prefix·정확한 UI 예외 | 수신 경계·보안 검토 | 전체 목록은 수신 앱 소유 가능. 다만 예외 경로로 외부 링크를 보낸다면 해당 목적지의 승인 정보도 공유해야 함. 공통 금지 규칙은 패키지 유지. |
| 오류 문서 serviceName·favicon | 자체 오류 응답 | 다른 앱의 링크 생성에는 불필요. 현재는 서버 표에 중앙 고정; 1차 분리에서는 호환값 유지. |
| 정상 페이지 title·favicon | 앱 metadata | 현재도 앱 소유. header의 메뉴 label과 동일 정보라고 가정하지 않음. |
| 헤더·푸터 노출·label·목적지 | 렌더링 및 guard | 여러 앱이 같은 메뉴를 표시하면 공통 관리 필요. 서비스 등록과 메뉴 노출은 별도 결정이며 AB Storm 등록만으로 노출하지 않음. |

## 3. 선택지

### A. 현행 기본 registry와 릴리스 절차 유지

API는 그대로다.

```tsx
createNaeilLocaleProxy({ service: "abstorm", authorize });
<NaeilLocaleController service="abstorm">{children}</NaeilLocaleController>
localeHref("abstorm", "/runs/example/report", "ja");
```

- **보안:** 패키지에서 검토한 inventory와 exact origin, 미등록 UI 거부를 유지한다. 기존 객체 입력의 재검증 부재와 앱 authorizer 책임도 그대로 남는다.
- **호환·이행:** API/기존 consumer 변경 없음. 새 등록 때 실제 앱 route·보호 여부 대조 → routing/오류 identity/시험 변경 → frozen archive 검증·릴리스 → 필요한 consumer upgrade → 수신 확인 후 송신 활성화 절차를 문서화한다. 메뉴 추가는 별도다.
- **검증·노력:** 기존 routing/server 시험, messages/package/packed consumer 검사와 앱 수신 확인을 매번 수행한다. 구현 노력은 가장 작지만 내부 route 변경도 중앙 릴리스에 묶는 운영 방식을 계속 쓰면 반복 비용이 남는다. 객체 방식 자체를 금지하려면 별도 호환성 변경이며 A에 포함하지 않는다.

### B. 공유 링크 계약과 앱 UI inventory 분리 — 권고 후보

새 `defineNaeilService` 이름을 만들기보다 **이미 있는 `defineLocaleService`와 객체 인자**를 활용한다. 공유 목록은 승인 ID/origin뿐 아니라 다른 서비스가 보내는 링크 경로를 유지한다. 앱 전체 route/protected/protocol 예외는 앱의 단일 정적 모듈에서 정의하여 proxy, root controller, 내부 builder, metadata에 같은 설정을 공급한다.

아래 호출 형태는 현재도 가능하다. 이것이 검증 강화나 공유 링크 목록 분리가 구현됐다는 뜻은 아니다. `routes`는 전체 목록이며 기본 목록에 자동 병합되지 않는다.

```tsx
const service = defineLocaleService({
  id: "abstorm", origin: "https://abstorm.naeil.dev",
  routes: ["/", "/new", "/runs/[id]", "/runs/[id]/report", "/experts"]
    .map(path => ({ path, protected: true })),
});
createNaeilLocaleProxy({ service, authorize });
<NaeilLocaleController service={service}>{children}</NaeilLocaleController>
localePath(service, "/new?copy=example", "ko"); // 앱 내부 inventory
localeHref("abstorm", "/runs/example/report", "ja"); // 패키지의 기존 링크 계약
```

**구현을 선택할 경우의 최소 계약:**

1. 기존 문자열 ID, `naeilServices` export, `defineLocaleService`, `LocaleServiceInput`, `localePath/Href` 호출과 standalone chrome API를 유지한다. 기존 기본 inventory를 축소하거나 삭제하여 기존 deep link를 깨지 않는다. 새 앱 내부 route는 객체에만 추가할 수 있고, 다른 서비스가 그 route를 보내려면 공유 링크 계약도 갱신한다. 최초에는 기존 전체 기본 inventory를 호환 snapshot으로 유지하고 새 공유 경로만 명시적으로 검토하면 충분하다. 별도 registry 서비스나 자동 동기화는 필요 없다.
2. 객체를 받는 공통 해석 경계에서도 동일한 origin·route 검증을 적용하고, 알 수 없는 ID/잘못된 객체를 명시적으로 거부하는 방안을 검토한다. proxy만 검증하면 controller와 builder가 다른 설정을 받아들일 수 있다. RSC 직렬화 뒤에도 유효해야 하므로 TypeScript 타입이나 객체 identity만을 검증 증거로 쓰지 않는다. 유효한 기존 객체는 유지하되 기존에 검증을 우회한 잘못된 객체의 거부는 호환성 변경으로 고지한다.
3. 미등록 UI 거부, 안전한 경로 문법, 정확한 protocol 예외, 보호 route의 authorizer 부재 시 거부, 요청 marker 제거·RSC 거부·auth 선행 순서를 유지한다. 앱 설정은 신뢰된 소스에서만 공급하며 요청/query/원격 응답에서 조립하지 않는다. 공통 protocol 경계와 실제 protocol 인증은 그대로다.
4. 앱 inventory에는 `protected: true/false`를 명시하고 실제 route 및 서버 데이터 authorization과 대조하는 consumer 검증을 둔다. **현재 validator는 잘못 생략된 보호 flag나 누락된 실제 앱 페이지를 알아내지 못한다.** 기존 문자열 route를 일괄 보호로 바꾸면 공개 페이지를 깨므로 그 변경은 하지 않는다. 신규 앱 설정에 명시 flag를 강제할 방법은 구현 검토에서 확정한다.
5. 오류 identity는 1차에 기존 서버 표를 유지한다. 자체 title/icon 변경의 중앙 릴리스 비용은 남는다. 앱 제공 identity로 옮길 필요가 확인되면 별도 호환 옵션과 HTML/URL 검증을 설계한다. 현재 `NaeilLocaleService`에 해당 필드가 있다고 가정하지 않는다. 오류 문서는 `/` 언어별 링크를 생성하므로 앱 inventory의 `/` 존재도 확인해야 한다(`server.ts:100`).

**효과와 한계:** 기존 서비스의 내부 UI 추가는 해당 앱 수정·배포만으로 처리할 수 있다. 새 서비스 ID/origin, 공유 교차 링크 경로 추가, 중앙 오류 identity 변경은 여전히 패키지 릴리스가 필요하다. “새 서비스도 릴리스 없이 등록”이 필수라면 B는 그 요구를 충족하지 않는다. 임의 origin 허용은 이번 권고에 포함하지 않는다.

**이행:** 기존 consumer는 문자열 ID로 계속 동작한다. 한 서비스부터 현재 inventory와 동등한 앱 설정을 만들고 전체 진입점에 공급한다. 동등성·수신 검증 후 내부 route 하나를 앱에서만 추가하는 사례로 효과를 확인한다. 공유 목적지는 receiver 준비 전에 송신하지 않는다. 되돌릴 때도 이미 보낸 deep link를 받는 호환 경로나 안전한 거부를 먼저 확인한다. 새 공통 검증을 구현하면 최초 1회 패키지 릴리스/업그레이드가 필요하다.

**검증·노력:** A의 회귀에 객체 입력 음성 시험, 기존 ID/객체 동등성, proxy/controller 설정 일치, 앱 실제 route 대조, 공유 링크 목적지 수신 시험을 추가한다. 노력은 중간이다. API 배관 상당수는 이미 있지만 central inventory의 검토 책임 일부를 앱으로 옮기므로 consumer 검증이 핵심 비용이다.

### C. runtime/원격 registry — 현재는 비권고

개념 API일 뿐 현재 기능이 아니다.

```ts
const snapshot = await loadReviewedRegistry({ version: pinnedVersion });
const service = defineLocaleService(snapshot.services.abstorm);
```

현재 validator는 고정 ID/origin만 받으므로 fetch를 추가하는 것만으로 새 서비스 등록이 가능해지지 않는다. 원격 목록을 신뢰 원천으로 바꾸려면 승인 주체, 진위 검증, 버전 고정, 만료·회수, 장애·캐시 정책까지 새로 정해야 한다.

- **보안:** exact origin 문자열 비교만으로 원격 목록의 진위를 보장하지 못한다. 오염된 origin/protected 변경, 서버·client 버전 불일치, 장애 시 fail-open이 새 위험이다. 잘못되거나 없는 snapshot은 거부하고, build/client/server가 동일한 승인 snapshot을 사용해야 한다.
- **호환·이행:** 기존 정적 ID API를 남기고 명시 opt-in이어야 한다. 고정 snapshot은 재배포 없이 갱신되는 장점을 줄이며, 실행 중 자동 갱신은 현재 root controller의 한 서비스 수명 가정(`client.tsx:69–71`)과 재검토가 필요하다.
- **검증·노력:** A/B 시험 외에 위조·stale·만료·단절·부분 갱신·rollback·SSR/client 불일치 시험과 운영 책임자가 필요하다. 노력은 가장 크다. 관찰된 AB Storm 한 건의 등록 비용만으로 이 운영 체계를 정당화하기 어렵다.

## 4. 권고와 오너 결정 사항

**B를 검토하되, 구현 승인 전에는 A를 유지한다.** 먼저 기존 객체 API의 지원 범위와 consumer 검증 책임을 명확히 하는 것이 가장 작은 출발점이다. URL 알고리즘을 복제하거나 임의 origin을 여는 대신 내부 route 변경과 서비스 간 링크 계약의 변경 주기를 분리한다. 이 권고는 등록 횟수·소요 시간을 정량 측정한 결과가 아니라 현재 코드 구조와 AB Storm 변경 내역에 근거한 판단이다.

오너가 결정할 질문:

1. 줄이려는 비용은 **기존 서비스의 내부 route 변경**인가, 아니면 **완전히 새로운 서비스 등록도 패키지 릴리스 없이** 하는 것인가? 후자가 필수면 B의 고정 origin 정책을 재설계해야 한다.
2. 앱 담당자가 전체 UI/보호 inventory와 실제 route 대조를 책임지는가? 신규 설정의 보호 flag 명시 및 `/` 존재를 어떤 consumer build gate로 강제할 것인가?
3. 다른 서비스가 링크할 경로의 승인 주체는 누구인가? 기존 모든 deep link는 보존하고 신규 경로만 선별 공유하는 이행에 동의하는가?
4. 첫 검증 서비스는 AB Storm인가? 오류 title/favicon은 1차에 중앙 표를 유지해도 되는가?
5. 유효한 기존 객체는 보존하되 검증을 우회한 객체를 거부하는 강화가 허용되는가? 허용한다면 릴리스 호환성 고지 범위를 확정해야 한다.

## 5. 구현을 선택했을 때의 검증 기준과 비목표

후속 구현의 최소 회귀 명령 후보는 `pnpm exec vitest run src/naeil-locale/routing.test.ts src/naeil-locale/server.test.ts`이다. 이후 변경 범위에 맞춰 locale 전체 시험·`pnpm check:messages`·`pnpm check:types`·`pnpm build:pkg`·`pnpm check:consumers`를 실행한다(`package.json:174–197`). build는 산출물을 생성하므로 이번 문서 작업에서는 실행하지 않는다.

B의 추가 acceptance는 잘못된 ID/origin·인코딩·protocol 예외·보호 flag의 거부/명시, 세 언어의 기존 링크 결과 유지, 오류 문서 identity와 `/` 복구 링크, authorizer 없는 보호 UI 및 denied RSC/Action, 새 앱 내부 route와 오래된 송신 패키지의 공존이다. 실제 consumer에서 draft/focus·언어 전환 수명도 확인한다. chrome를 변경한다면 기존 지침대로 contrast·실제 Storybook·packed consumer 검증도 수행한다. package 시험 통과는 운영 수신·인증 acceptance가 아니다.

비목표는 인증/권한 및 return allowlist 재설계, 언어 URL 규칙·번역 엔진 교체, 모든 route 자동 탐색 시스템, 헤더·푸터 신규 메뉴나 시각 변경, 원격 registry 구축, Home/Baby 이행, frozen archive/tag 수정, 발행·merge·배포다. **이 문서에 적힌 개선은 구현하거나 승인하지 않았다.** 이번 확인은 소스·기록·참조 위치 대조와 문서 범위 검증뿐이며 제품 시험 실행 결과를 주장하지 않는다.
