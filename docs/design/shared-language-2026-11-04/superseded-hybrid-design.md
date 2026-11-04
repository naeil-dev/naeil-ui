# naeil 공통 언어 처리 설계

작성일: 2026-11-04 JST. 상태: **최종 설계 제안 — Opus 5.5 리뷰·재검토 반영**. 작업 범위는 조사·설계이며 코드 변경, 패키지 발행, 배포는 포함하지 않는다.

## 1. 권고와 사용자 요구

**공통화 대상은 언어 결정·저장·링크 생성·전환 동작이다. URL 표현은 공개 메인의 경로 방식과 입력 앱의 쿼리 방식을 각각 유지한다.**

- naeil.dev의 페이지: 영어 `/`, 한국어 `/ko`, 일본어 `/ja`. `/en`은 호환 alias만 두고 새 링크에 만들지 않는다.
- Jev·Estimate의 사용자 화면: `?lang=en|ko|ja`. 현재 경로를 바꾸지 않고 언어를 명시한다.
- 모든 필수 서비스와 그 안의 하위 경로는 같은 공통 언어 계약을 사용한다. 주소가 달라도 메뉴·로고·본문 CTA·로그인 복귀를 통해 선택한 언어가 이어진다.
- Home은 저비용 query 동기화와 언어가 담긴 링크 연결까지만 선택적으로 포함한다. 별도 도메인의 자동 선호 공유는 이번 범위에서 제외한다.

이는 “디렉터리가 유일한 베스트 프랙티스”라는 결론이 아니다. 공개 페이지는 기존 경로/검색 구조를 살리고, 편집 앱은 기존 경로/상태/인증 경계를 유지하는 선택이다. **영어를 `/`로 표현한다는 선호는 경로 기반 메인에 적용한다. Jev·Estimate에서는 영어도 `?lang=en`으로 명시한다.** 모든 서비스의 주소 모양까지 같게 만드는 안은 아래 비교에서 검토했으나 이번 권고로 선택하지 않았다.

사용자가 정한 범위는 en/ko/ja, 필수 서비스 간 연결, naeil.dev의 디렉터리·서브도메인 포함, Home은 복잡하면 제외다. URL 방식에 대한 선택과 아래 세부 정책은 이번 검토의 **설계 권고**이며 이미 사용자 승인을 받았던 결정으로 기록하지 않는다.

## 2. 왜 이 구성을 선택하는가

| 대안 | 현재 구조에 대한 효과 | 결론 |
| --- | --- | --- |
| 필수 서비스 전부 경로로 이관 | 주소 규칙은 단일화된다. 주된 비용은 locale segment 변경 시 편집/스트림 상태를 보존할 구조와 기존 Estimate 일본어 URL의 의미 변경이다. 인증 matcher/return validator 갱신도 필요하지만 Jev의 허용 경로 몇 개를 바꾸는 것 자체가 큰 장애물은 아니다. | 구현 가능하지만 언어 연동에 필수인 변경은 아니다. 향후 주소 자체를 통일할 때 어댑터·서버 진입·호환 URL·인증·상태 보존을 함께 이관한다. 레지스트리 값 하나만 바꿔 끝나는 작업으로 보지 않는다. |
| 전부 query로 변경 | Jev와 맞아도 메인의 검색 URL·canonical·sitemap을 이관하게 된다. | 채택하지 않는다. |
| 전부 URL 변화 없이 저장 | 공유/새로고침 언어를 URL로 재현할 수 없고 localStorage는 origin 간 공유되지 않는다. | 기본 방식으로 채택하지 않는다. |
| 공통 정책 + 경로/query 어댑터 | 표현 두 개를 검증해야 하지만 현재 구조를 보존하면서 언어 연결을 완성할 수 있다. | 채택한다. |

Google은 공개 다국어 콘텐츠의 별도 URL과 접근 가능한 언어 링크를 권고한다. next-intl도 복수 전략을 지원한다. 어느 공식 문서도 현재의 모든 인증 앱을 경로로 옮겨야 한다는 근거는 아니다. 쿠키/브라우저 탐지는 URL 형식과 별도 선택이다. [조사 근거와 한계](../../design/shared-language-2026-11-04/research.md), [현행 소스·배포 확인](../../design/shared-language-2026-11-04/source-audit.md)을 따른다.

## 3. 적용 범위

| 서비스 | 대상 | URL 전략 | 필수 여부 |
| --- | --- | --- | --- |
| `https://naeil.dev` | 고정 inventory의 landing, login, projects, design, blog 및 글 등 활성 사용자 페이지; 이후 추가분은 같은 계약 검사 대상 | path, en prefix 생략 | 필수 |
| `https://jev.naeil.dev` | 고정 inventory의 루트 앱, 로그인/권한/오류 UI; 이후 추가분은 같은 계약 검사 대상 | query | 필수 |
| `https://abestimate.naeil.dev` | 홈, estimates 목록/상세, compare, settings, calendar, calendar-preview 및 로그인/권한/오류 UI | query | 필수 |
| 기타 활성 owned naeil UI | 구현 전 현재 도메인/라우트 inventory에서 발견되는 페이지·서브도메인 | 공개 콘텐츠는 path, 입력 앱은 query adapter | 동일 계약 필수 |
| Naeil Home | 실제 구성된 localhost/Tailscale frontend | 선택적 query adapter | 선택 |
| API, OAuth callback, auth relay, webhook, health, assets | 기계/프로토콜 경로 | 언어 경로 변환 제외 | 기존 계약 유지 |

초기 확인된 운영 범위는 위 세 서비스다. 과거 별도 제품/폐기 호스트 기록을 이번 언어 범위와 혼동하지 않는다. [현행 조사](../../design/shared-language-2026-11-04/source-audit.md)의 inventory 한계에 따라 구현 시작 시 현재 DNS·tunnel/hosting ingress·배포된 사용자 route와 실제 링크를 대조하고, 날짜가 찍힌 **이번 릴리즈 대상 목록**을 고정한다. 하나의 로컬 ingress만으로 전체 도메인을 확인했다고 보지 않는다. 목록 확정 뒤 추가 서비스는 별도 amendment로 포함하며, 미래의 모든 페이지를 이번 완료 조건으로 무한 확장하지 않는다. 새 페이지에는 같은 계약 검사를 적용한다. 미등록 활성 서비스를 남긴 채 “naeil.dev 전체 연결 완료”라고 보고하지 않는다. 인증 화면에 막힌 점검을 내부 UI 점검으로 세지 않는다.

라우팅 레지스트리는 `serviceId`, 정확한 `origin`, `urlStrategy`, `supportedLocales`, `neutralEntryPolicy`만 갖는다. 배포·채택·활성 상태는 운영 receipt에 기록하며 npm 패키지에 live 배포 상태를 넣지 않는다. 확인된 세 서비스에는 별도 basePath 추상화가 필요 없다. 실제 디렉터리 mount 앱이 inventory에서 발견되면 그 경계를 명시해 추가한다. 현재 존재하지 않는 alias나 reverse proxy를 신설하지 않는다. 범위는 경로 문자열 추측이나 `endsWith('naeil.dev')`로 결정하지 않는다.

## 4. 공통 의미: 페이지 언어와 저장된 선호를 분리한다

`effectiveLocale`는 지금 보고 있는 페이지의 언어다. `preferredLocale`는 사용자가 선택기로 명시적으로 저장한 기본 선호다. 둘은 다를 수 있다.

예를 들어 선호가 ko여도 친구가 보낸 `?lang=ja` 또는 `/ja/...`는 일본어로 열린다. 그 링크를 읽거나 prefetch했다고 전역 선호가 ja로 바뀌지 않는다. 그 페이지에서 다른 서비스로 이동할 때는 **현재 페이지 언어 ja**를 전달한다.

| 입력 상태 | 결정 |
| --- | --- |
| 메인 `/ko/...`, `/ja/...` | URL 언어가 우선 |
| 메인 `/...` — 영어 canonical | 영어. 쿠키/브라우저가 ko여도 자동 이동하지 않음 |
| 메인 `/en/...` | 영어 canonical로 호환 정규화; 선호값 기록 없음 |
| 앱 query에 정확히 하나의 지원 `lang` | query 언어가 우선 |
| Jev query에 lang 없음 | 공통 선호 → 유효한 legacy 선호(이행 기간) → 브라우저 언어 → en |
| Estimate query에 lang 없음 | 공통 선호 → ja. 기존 일본어 주소의 의미를 보존하는 `neutralEntryPolicy: legacy-ja`이며 브라우저 언어로 바꾸지 않음 |
| query lang이 비었음/중복/미지원 | 일반 화면 진입에서는 잘못된 lang을 없는 값처럼 처리하고 결정값 하나로 정규화. auth return 입력 검증에는 이 완화 규칙을 적용하지 않음 |

**중요한 사용자 경험:** naeil.dev의 `/`를 주소창에 직접 열면 항상 영어다. 한국어 상태의 서비스에서 로고를 누르면 링크가 `/ko`이므로 한국어가 이어진다. `/`를 언제나 영어 URL로 보장하면서 같은 주소를 선호 언어로 자동 이동시키는 두 정책을 동시에 약속하지 않는다.

이는 현재 메인의 쿠키/브라우저 자동 탐지를 제거하는 **의도적인 동작 변경**이다. 직접 `/`에 온 사용자가 곧바로 앱 링크를 누르면 그 이동의 언어도 en이다. 저장된 ko 선호를 덮어쓰는 것은 아니지만 현재 이동은 영어이므로, 메인에서는 저장 선호와 페이지 언어가 다를 때 기존 텍스트 링크 스타일로 “한국어로 보기” 같은 제안 하나를 제공한다. modal/강제 이동은 없고 Accept-Language만으로 제안하지 않는다. 링크는 정상 locale URL이며 prefetch/클릭이 선호를 다시 저장하지 않는다. 쿠키는 이 제안과 언어 미지정 앱 진입에서 사용된다. 제안은 client에서 읽어 렌더하여 공개 HTML 캐시를 개인화하지 않는다.

Estimate의 ja 예외는 지원 언어의 차이가 아니라 이전 URL 호환 정책이다. `?lang=en`, `?lang=ko` 또는 명시 저장한 공통 선호가 있으면 항상 그것이 우선한다. 한국어 메인에서 온 링크는 `?lang=ko`이므로 예외에 걸리지 않는다. 다른 신규 앱의 기본 neutral 정책은 브라우저 → en으로 정하며, 별도 legacy 예외는 명시된 이유와 함께만 추가한다.

브라우저 언어는 neutralEntryPolicy가 이를 허용하는 앱의 언어 미지정 최초 진입에서만 보조 입력이다. Accept-Language의 지원 언어를 q 순서로 선택하고 q=0·미지원·wildcard는 후보에서 제외한다. `ko-KR→ko`, `ja-JP→ja`, `en-US→en`처럼 기본 언어를 정규화한다. 클라이언트 전용 시작에서는 `navigator.languages`를 사용하되 서버가 이미 명시 URL로 확정한 언어를 hydration 후 다시 바꾸지 않는다. IP/국가로 언어를 추정하지 않는다.

공개 콘텐츠에서 존재하지 않는 번역 URL에 직접 접근하면 404를 유지하고 해당 언어의 목록/홈 링크를 제공한다. 영어 본문을 일본어 URL 아래 200으로 반환하지 않는다. 헤더는 UI 언어 세 개를 모두 제공하되 사이트의 route-aware 전환기가 `availableLocales`를 확인한다. 글의 번역이 없으면 선택한 언어의 `/blog`로 이동하고 번역 부재 안내와 존재하는 원문 링크를 보여준다. 페이지 데이터로 검증한 slug만 `untranslated` query에 허용하고 임의 query 문자열을 안내문에 그대로 반사하지 않는다. 목록의 canonical에는 이 안내 query를 넣지 않는다. 글 안의 alternate 링크는 존재하는 번역만 표시한다. 이 결정은 헤더 UI를 복제하지 않고 사이트 adapter에서 담당한다.

## 5. URL 생성과 정규화

| 현재 언어 | 메인 홈 / 문서 | Jev | Estimate 예시 |
| --- | --- | --- | --- |
| en | `/`, `/design` | `/?lang=en` | `/calendar?lang=en` |
| ko | `/ko`, `/ko/design` | `/?lang=ko` | `/calendar?lang=ko` |
| ja | `/ja`, `/ja/design` | `/?lang=ja` | `/calendar?lang=ja` |

예: `naeil.dev/ko` → `jev.naeil.dev/?lang=ko` → `abestimate.naeil.dev/calendar?lang=ko` → `naeil.dev/ko`.

- path 어댑터는 등록된 locale segment만 교체한다. `koala` 같은 경로를 ko로 해석하지 않는다. 미지원 경로는 기존 404 규칙을 따른다.
- 메인의 `lang` query는 언어 입력으로 쓰지 않고 그대로 보존한다. locale path가 권위다. 불필요한 query 제거 redirect를 만들지 않으며 API·서명 URL·auth callback의 query는 손대지 않는다.
- query 어댑터는 `lang`만 교체하고 나머지 query, fragment, entity ID, route를 보존한다. `?lang=en`도 생략하지 않아 영어 링크가 다른 브라우저에서 다른 언어가 되지 않는다.
- 렌더된 모든 owned 링크의 href에 현재 언어가 이미 들어 있어야 한다. 클릭 이벤트에서만 덧붙이면 새 탭·복사·수정 클릭·JS 전 단계가 깨진다.
- 메인 `/en/...` 호환 정규화는 next-intl의 307 동작을 사용한다. 별도 영구 redirect를 추가하지 않는다. 접두사 없는 영어 페이지를 선호값에 따라 redirect하지 않는다. POST/Server Action/RSC/API 요청에 추가적인 문서 진입용 locale redirect를 적용하지 않는다.
- 앱의 lang 없는 진입은 최초 상태 결정 후 `history.replaceState`로 query를 명시한다. 뒤로가기 항목을 추가하지 않는다. Next router의 서버 재탐색/편집기 remount를 일으키지 않는지 실제 소비 버전에서 검증한다.
- popstate는 URL의 언어를 다시 읽어 표시만 복원한다. 이전 history 항목의 언어로 돌아가는 것은 의도된 동작이고 저장 선호를 덮지 않는다. 내부 route 이동, refresh, 로그인 복귀 후에도 query를 누락하지 않는다.
- URL에 붙이는 값은 en/ko/ja뿐이다. 임의 URL 전체를 문자열 replace하거나 nested `next` 값을 무조건 다시 쓰지 않는다.

## 6. 저장 계약과 초기화

생산 공통 선호는 다음 **신규 이름**의 쿠키 하나로 표현한다.

```text
naeil_locale_v1=<en|ko|ja>; Domain=naeil.dev; Path=/; Max-Age=31536000; Secure; SameSite=Lax
```

언어는 비밀값이 아니며 인증/권한 판단에 사용하지 않는다. JS 어댑터가 선택 이벤트에서 쓸 수 있게 HttpOnly는 사용하지 않는다. Domain 공유가 필요하므로 `__Host-` 이름을 사용하지 않는다. Max-Age 1년은 요청하는 최대 수명이며 브라우저의 저장 제한/삭제 정책 때문에 실제 1년 보존을 보장하지 않는다. 저장 수명 보장을 위해 새 서버 endpoint를 도입하지 않는다. 만료되거나 차단돼도 명시 URL과 링크로 언어가 전달되는 것이 필수 계약이다.

- **쓰기:** 사용자가 언어 선택기를 조작하고, 필요한 앱 guard가 전환을 수락했을 때만 쓴다. 단순 URL 방문·prefetch·SSR·RSC·브라우저 탐지·focus·popstate·로그인 callback은 전역 선호를 쓰지 않는다.
- **읽기/복구:** 값은 엄격하게 검사한다. 동일 이름이 여러 번 나타나면 순서에 의존하지 않고 선호 입력을 무효로 처리한다. 명시적으로 저장할 때는 현재 호스트의 같은 이름·Path=/ host-only 잔여 쿠키를 먼저 만료시키고 Domain 쿠키를 쓴다. 기본 도메인에서도 삭제 후 새 값 쓰기 순서를 보장한다. 알려진 잘못된 Path가 있으면 그 소유 범위만 정리하며 임의 경로의 쿠키를 지울 수 있다고 가정하지 않는다. 남은 중복은 계속 무효 처리하고 URL로 동작한다. legacy NEXT_LOCALE도 중복이면 힌트에서 제외하며 이름을 새 쿠키와 섞지 않는다.
- **개발/preview:** 생산 도메인 쿠키를 설정하지 않는다. 명시적인 개발 설정의 host-only 이름을 사용한다. localhost 포트 간 쿠키 충돌도 분리한다.
- **쿠키 거부:** URL, 현재 화면, 생성된 서비스 링크는 계속 작동한다. 같은 앱에서 명시 선택한 값은 optional local fallback에 저장할 수 있지만 다른 서비스에 공유됐다고 주장하지 않는다.
- **이미 열린 탭:** 다른 탭의 선택을 즉시 주입하지 않는다. URL이 현재 문서의 언어를 고정한다. 새 neutral 앱 진입에서 최신 선호를 읽는다. cross-origin 실시간 방송은 도입하지 않는다.

이전 저장은 신규 공통 쿠키가 없고 URL에도 언어가 없을 때만 후보로 읽는다. Jev는 기존 localStorage 후 host-only NEXT_LOCALE 순서를 유지한다. URL/공통 선호가 있으면 오래된 값이 이를 덮지 못한다. legacy 값을 읽었다는 이유만으로 공통 쿠키를 자동 생성하지 않는다. 전환 기간에 해당 앱의 구 저장값을 동시 갱신할 필요가 있다면 명시적 선택 이벤트에만 제한하고 호환 기간을 기록한다.

query 앱의 SSR은 root layout이 searchParams를 직접 받는다고 가정하지 않는다. **앱 proxy가 §4의 서버에서 알 수 있는 신호를 해석하고 검증된 locale을 내부 요청 헤더 `x-naeil-locale`로 전달**한다. 클라이언트가 보낸 같은 이름의 헤더는 항상 덮어쓴다. root layout/provider/서버 metadata는 `headers()`로 이 값을 읽어 동일한 초기 snapshot을 사용한다. layout에서도 `parseLocale`로 다시 검증하고, proxy matcher가 제외하는 경로에서는 이 헤더를 신뢰 입력으로 사용하지 않는다. query가 없는 초기 요청은 한 번만 처리하며 language Set-Cookie를 내지 않는다. 기존 세션 갱신용 auth Set-Cookie는 그대로 보존한다. `headers()`에 따른 동적 렌더링 비용은 인증 앱의 private/no-store 경계 안에서 검증한다.

Jev의 이행 기간에는 URL/공통 쿠키가 없을 때 서버가 알 수 없는 legacy localStorage가 서버의 browser/legacy-cookie 힌트보다 먼저다. 이 경우 전체 편집 화면 대신 중립 로딩 상태를 내고 client가 한 번 결정한다. 그 외에는 server snapshot 그대로 시작한다. Estimate의 neutral-ja 정책은 서버에서 바로 확정 가능하다. client 확정 시 URL·provider·html lang·title/description을 맞추고 초기 body 언어가 깜빡이지 않게 한다. storage 오류는 해당 서비스 fallback으로 끝내며 진입을 막지 않는다. header/error UI도 같은 snapshot을 사용한다. 이후 query 언어 변경은 RSC fetch에 기대지 않고 metadata를 명시 갱신한다. Next head 복원이나 이전 요청이 현재 metadata를 덮지 않는지 브라우저 인수 항목으로 확인한다.

## 7. 공통 코드의 책임

현재 `NaeilHeader`, `NaeilFooter`, `NaeilHeaderAccountControl`은 표시·접근성·반응형 UI를 계속 담당한다. 앱은 인증, navigation/dirty guard, 데이터 상태를 소유한다. 헤더 내부에서 cookie나 router를 몰래 조작하지 않는다.

새 opt-in entry `@naeil/ui/naeil-locale`을 설계한다. framework-neutral 순수 함수와 명시적 브라우저 I/O를 구분하고, module import만으로 window/cookie에 접근하지 않는다. Home도 UI 라이브러리를 바꾸지 않고 이 계약을 적용할 수 있다.

| 공통 책임 | 소비 앱 책임 |
| --- | --- |
| Locale 타입/지원 목록, 신호 검증·우선순위 | SSR 또는 초기 client snapshot 제공 |
| 등록 서비스의 path/query 읽기·링크 생성 | Next/i18next/현재 history adapter |
| 명시 선택용 쿠키 읽기/쓰기, legacy 우선순위 계약 | 실제 guard, 메시지 로드, 안정적인 provider 배치 |
| 전환 결과와 실패/취소 계약, 공통 예제/계약 시험 | 전체 번역, metadata, auth 오류, 업무 데이터 정책 |

초기 개념 API는 `parseLocale`, `resolveLocale(signals)`, `localeHref(service, route, locale)`, `readPreference`, `writePreference`다. URL을 바꿨다는 이유만으로 `writePreference`를 호출하는 종속 관계는 만들지 않는다. URL builder는 등록 서비스/route data를 받아 만들고 보안용 return validator를 대체하지 않는다.

기존 공개 `@naeil/ui/i18n/routing`, generic Navigation/SiteFooter, legacy Nav/Footer의 기본 동작은 묵시적으로 변경하지 않는다. 사이트 전용 routing 설정과 새 opt-in 설정을 분리한다. `src/i18n/routing.ts`가 공개 export 빌드의 입력이기도 하므로 파일 하나 수정이 제3자에게 전파되지 않도록 먼저 import/export 경계를 분리한다. frozen 0.7.1 archive, source `32108fd8e1cb1db6dae24a09f3ca72ac9a91f618`, tag `v0.7.1`은 변경하지 않는다. 새 버전 발행·Docs·서비스 활성화는 별도 검증/receipt다.

## 8. 서비스별 적용

### 메인

사이트 전용 next-intl routing에 `localePrefix: 'as-needed'`, `localeDetection: false`, `localeCookie: false`, `alternateLinks: false`를 명시한다. 탐지·쿠키 자동 기록·middleware의 자동 hreflang은 서로 다른 기능이다. metadata/sitemap이 실제 번역에 맞는 alternates를 소유한다. middleware와 locale-aware Link/router helper가 실제로 `NEXT_LOCALE`을 다시 쓰지 않는지 최종 소비 버전으로 확인한다. 로컬 4.8.3 소스에서는 쓰기 생략을 확인했으며 운영 실행 검증은 별도다.

메타데이터와 sitemap은 기존 locale별 canonical/hreflang을 유지하고, 실제 번역이 있는 콘텐츠만 alternate로 제공한다. x-default는 기존 fallback 정책을 유지한다. 공개 응답의 내용은 URL로 결정되므로 language cookie에 따라 공용 캐시 내용이 달라지지 않는다. 인증 관련 no-store/세션 쿠키 처리는 별개다.

header/footer `resolveHref`, brandHref, currentProjectHref, projects/subNav, 본문 카드·CTA, 로그인 링크까지 같은 builder를 사용한다. 한 링크를 next-intl과 builder가 이중으로 prefix하지 않도록 “정규화되지 않은 route 입력 → builder → 최종 href”의 책임을 한 번만 부여한다. 언어를 바꾸는 링크/선택기는 완성된 href를 기본 `next/link` 또는 `next/navigation` router에 전달하며 next-intl의 locale 옵션으로 다시 감싸지 않는다. 로컬 4.8.3의 `{locale:'en'}` 옵션은 forcePrefix로 `/en`을 만들기 때문이다. 현재 언어 안의 일반 상대 링크는 기존 next-intl helper를 유지할 수 있다. cross-origin 완성 URL도 재해석하지 않는다.

### Jev

기존 query 전환을 공통 resolver/preference로 교체한다. 모델 실행/스트림 provider는 locale에 따라 key나 수명을 바꾸지 않는다. 스트리밍 중 언어 선택은 UI 문구만 갱신하고 진행 요청·결과·모델 선택·사용자 프롬프트를 유지한다. 이미 생성된 자연어 결과를 재생성하거나 번역하지 않는다.

`validateReturnTo`의 엄격한 루트/길이/중복 lang 검사와 auth 경계를 유지한다. 로그인 UI의 locale과 검증된 return URL의 lang을 명시한다. root-only 경로 검증을 풀 필요는 없다.

### Estimate

ja 고정을 제거하고 en/ko/ja UI 메시지와 stable language provider를 도입한다. header/footer만 번역한 상태는 완료로 인정하지 않는다. 목록·편집·비교·설정·달력·미리보기·loading/empty/error·접근 거부·인증 장애·검증 메시지·dialog·접근성 이름·브라우저 제목을 포함한다.

UI 언어 변경은 금액, 통화, 세금, 저장된 날짜/시간대, revision, 고객/사용자 입력, 견적 snapshot, 생성된 문서의 언어를 변경하지 않는다. 읽기 전용 숫자/날짜 표시는 해당 UI locale의 Intl 포맷을 사용하되 통화·업무 시간대는 저장 데이터/기존 제품 설정으로 고정한다. 편집 중인 문자열과 입력 파서는 기존 규칙을 그대로 사용하며, 세 언어의 일반 구분자가 비슷하다는 이유로 사용자 입력을 재파싱하지 않는다. 문서/PDF 출력 언어는 기존 문서 설정(설정이 없으면 현행 ja)을 유지한다. UI 언어로 이를 추론하지 않는다.

현재 raw text, 입력 중 유효하지 않은 숫자, dirty 상태, 선택 항목, undo/redo를 locale 변경으로 remount되지 않는 provider/컴포넌트에 유지한다. query 변경이 저장/새 revision을 만들거나 편집기를 remount하지 않아야 한다. locale 선택 자체는 navigation이 아니므로 저장 guard를 실행하지 않는다. 실제 서비스 이동·로그아웃은 계속 기존 guard를 통과한다. 안정적인 client 전환이 불가능한 구현을 채택한 뒤 guard로 메우지 말고 provider 배치를 바로잡는다.

Jev·Estimate의 보호 화면과 인증/권한 오류 UI는 기존 접근 통제와 함께 noindex를 유지/확인하고, 공개 SEO용 hreflang·canonical 언어 목록을 붙이지 않는다. 이후 공개 공유/소개 페이지가 생기면 공개 페이지 계약으로 별도 등록한다.

### Home — 선택 범위

기존 i18next를 유지한다. 선택 시 `lang` query도 replaceState로 갱신하고, popstate/reload에서 URL과 화면을 일치시킨다. 연결 버튼은 받은 effectiveLocale을 메인/다른 서비스 링크에 담는다. 새 탭으로 받은 `?lang=ja`를 우선하고 legacy localStorage는 URL이 없을 때만 사용한다.

Tailscale/localhost에서 naeil.dev 공통 쿠키를 읽거나 쓰려고 하지 않는다. 계정 기반 선호 API, cross-domain iframe/브리지, DNS/프록시 변경은 제외한다. 현재 history/dirty guard에 작은 adapter로 붙일 수 없으면 Home 작업만 보류하며 필수 세 서비스 완료를 막지 않는다. 보류 이유와 현재 reload 불일치는 남긴다.

## 9. 전환·인증·상태 수명

Jev·Estimate의 UI 메시지 세 벌은 우선 정적으로 번들한다. 사전 key 누락 검사를 통과한 사전만 사용하며 locale별 provider key를 만들지 않는다. 메시지 크기가 실제 문제가 됐을 때만 lazy loading을 별도 설계한다. query 선택은 값 검증 → client URL/provider/metadata commit 순서이며 데이터를 저장하지 않는다. desktop/mobile 복사본의 전환 상태와 reentry 방지는 header 위의 같은 controller가 소유한다.

**두 query 앱 모두, 같은 화면에서 전환돼야 하는 UI 문구는 client language provider를 읽는 컴포넌트가 렌더한다.** 서버는 데이터·메시지 key/오류 code·구조를 전달하며, 초기 locale로 번역한 표 머리글/빈 상태/오류 문구를 고정 문자열 props나 RSC 자식으로 남기지 않는다. 필요한 텍스트 컴포넌트만 client 경계로 옮겨 업무 데이터 fetch까지 불필요하게 client로 이관하지 않는다. Client Component의 최초 SSR은 §6의 snapshot을 사용하고 이후 선택은 같은 provider를 읽는다. locale 전환만을 위한 `router.refresh()`는 이번 구현에서 사용하지 않는다. 추후 refresh 방식을 택하려면 별도 설계 변경과 편집/스트림 상태 보존 증거가 필요하다. 서비스별 receipt에 이 렌더 소유권과 실제 전환 검증을 기록한다. JS 앱이 시작되기 전 프로토콜/접근 실패 응답은 요청 locale로 서버가 번역하며, 같은 문서에 선택 UI를 제공한다면 그 문구도 위 client 전환 계약을 따른다.

query 앱은 명시 선택이라는 intent를 가진 client commit이 성공한 뒤에만 선호를 기록한다. 초기화·URL 읽기로 발생한 provider 갱신에는 intent가 없으므로 기록하지 않는다. URL 갱신/commit 실패는 이전 화면을 유지하고 복구 가능한 오류로 처리하며, 이후의 예외를 이유로 공통 쿠키를 과거 값으로 되돌리는 쓰기는 하지 않는다. 쿠키 저장만 실패해도 현재 페이지/URL의 언어 전환은 유효하다. 이 조건은 복잡한 전역 transaction 시스템 없이 단일 controller의 선택 이벤트와 commit 확인으로 구현한다.

메인은 route navigation 특성상 **guard 수락 직후 선호를 기록하고 navigation을 시작하는 명시적 예외**다. 이는 query 앱의 client commit 후 쓰기와 구별된다. 이후 네트워크 오류가 나더라도 사용자 선택 자체는 유효하며, 화면은 기존 URL/언어를 유지하고 재시도 경로를 제공한다. 선호와 페이지가 달라지면 §4의 비강제 제안 링크로도 복구할 수 있다. 이를 guard 취소와 구별한다. 조용히 내용만 새 언어/주소만 이전 언어인 상태로 남기지 않는다.

로그인 링크는 예를 들어 한국어 Estimate 화면에서 `naeil.dev/ko/login?next=<검증된 Estimate URL, lang=ko>`로 만든다. return URL을 먼저 기존 allowlist/route validator로 검증하고, 해당 제품의 정해진 builder로 보완한 결과도 재검증한다. 중복/악성/미지원 lang으로 거절돼야 하는 return을 정규화해 우회시키지 않는다. query/hash를 완전한 URL로 보존하는 기존 bounded transport를 유지하며 서버가 fragment를 받는다고 가정하지 않는다.

로그인 화면의 언어는 `/ko/login` 같은 메인 경로가 결정하고, `next` 안의 lang은 복귀한 앱이 해석한다. 기존 `loginErrorLocation`과 `canonicalRedirect`를 보존한다. 정적 link 생성 시에도 query/hash를 빠뜨린 href를 먼저 노출하지 않는다. 현재 비활성 `_archive` 경로의 옛 locale 손실 코드를 활성 서비스의 현행 결함으로 세지 않으며, 재활성화하면 새 inventory/계약 검증을 요구한다.

`/auth/callback`, `/auth/invite`, `/auth/return/...`와 exact Home relay는 locale 자동 처리 대상이 아니다. auth cookie를 보존하는 middleware 응답 합성 순서를 유지하고, 기존 origin allowlist를 `*.naeil.dev`로 넓히지 않는다. 로그인 실패/403/503도 원래 언어로 표시한다. identity 없는 앱 초기 진입에서 localStorage는 서버가 읽을 수 없으므로 URL/공통 cookie/각 서비스의 서버 neutral 진입 규칙으로 로그인 언어를 결정하고 이를 return URL에 고정한다. 이때 Estimate는 무선호일 때 ja, Jev는 서버가 읽을 수 있는 legacy cookie 또는 브라우저/en 힌트다.

보호 화면·개인화 응답은 기존 private/no-store를 유지한다. 일반 locale query 변경 때문에 인증 우회나 캐시 공유가 생기면 안 된다. prefetch, Server Action, OAuth 팝업 callback 후 다른 페이지 이동을 실제 조합으로 검증한다. 과거 next-intl 이슈를 현재 버전 결함으로 가정하지 않는다.

## 10. 구현·이행 순서와 종료 조건

1. **대상·소스 확정:** 날짜가 찍힌 필수 origin/route/link 목록과 각 배포 소스/의존성 증거를 고정한다. 이 branch의 UI 0.7.2, 관측된 Site identity의 UI 0.9.0, Jev/Estimate 0.7.2 차이를 먼저 해소한다. identity 버전만으로 npm 발행/소스 동등성을 추정하지 않고 실제 유지보수 release의 registry artifact·source hash와 연결한다. 기존 main에서 그대로 새 entry를 발행하지 않는다.
2. **공통 계약과 소비 업그레이드:** 독립 locale entry와 site 전용 routing 경계를 만들고 정확한 새 패키지를 소비 앱에 적용한다. 업그레이드에 따라 들어오는 header/footer/account·catalog·frame 차이를 별도로 비교하고 실제 anonymous/authenticated 상태, Storybook, packed consumption, 공개 API 회귀를 검증한다. locale 기능만 추가됐다고 다른 버전 차이를 생략하지 않는다.
3. **수신자 먼저 준비:** Estimate에 전체 삼국어·query 수신·안정적인 provider를 먼저 배포하고, Jev에 공통 resolver 수신을 적용한다. 이 기간 공통 선호 쓰기와 새 전역 송신 링크 활성화는 앱의 명시적 배포 설정에서 꺼 둔다. 기존 호환 동작과 ready receipt를 남긴다. 별도 원격 제어 시스템이나 npm의 동적 상태는 만들지 않는다.
4. **송신 활성화:** 모든 필수 수신자가 준비되면 각 앱의 언어 보존 링크와 명시 선택 쿠키 쓰기를 켠다. 메인의 deterministic root·선호 언어 제안·canonical builder는 마지막에 적용한다. 기존 `/en`, query와 무언어 앱 URL은 계속 열린다. 구버전이 query를 무시하면 언어 연동 실패이므로 “링크가 먼저 나가도 안전하다”는 전제로 순서를 생략하지 않는다. Home은 선택 범위로 따로 적용한다.
5. **실제 연동 검증:** 정확한 새 패키지/배포 identity로 아래 acceptance를 수행한다. 실제 UI 링크 행렬과 모든 등록 서비스 조합의 URL builder 계약 검사를 구분한다. 패키지·Docs·앱 활성화 receipt를 각각 남기고 필수 범위 전체가 통과할 때만 완료로 보고한다.
6. **정리:** Jev legacy 선호 읽기/호환 쓰기는 전 구간 활성일 T부터 90일 뒤 종료하는 정책으로 정한다. T와 실제 종료일을 rollout receipt에 기록한다. 이후 URL/공통 선호/브라우저/en만 읽는다. 제거 전 새 selector가 공통 쿠키와 URL을 쓰는지 확인한다. Estimate의 legacy-ja neutral 정책은 기간 한정 migration과 별개로 유지한다. 앱 rollback 후 URL/로그인 경로가 열리는지 확인하고, 삼국어 수신이 사라지면 전 구간 완료 상태를 철회한다.

배포 롤백 시 query URL을 못 읽는 구 Estimate는 언어 연동 완료 대상에서 다시 빠진다. 이 상태를 정상 삼국어 동작이라고 감추지 않는다. 데이터 스키마를 바꾸지 않는 UI 전환이므로 locale rollout에 데이터 역마이그레이션을 끼워 넣지 않는다.

## 11. 인수 조건

| 영역 | 반드시 확인할 결과 |
| --- | --- |
| 우선순위 | main `/`는 ko 쿠키/브라우저에서도 en; `/ja`는 ko 선호에서도 ja; 앱 `?lang=en`은 ja 선호에서도 en; 언어 없는 앱의 fallback이 규칙과 일치 |
| 전체 연결 | 날짜가 찍힌 inventory의 **실제 모든 owned 링크 × 3언어**를 header/footer/brand/CTA/로그인 복귀/새 탭/복사 조건으로 확인. 현재 존재하지 않는 메뉴를 있다고 가정하지 않음. 별도로 등록 서비스 모든 쌍의 builder 결과를 검사하여 링크가 추가돼도 전달 계약을 재사용 |
| 저장 부작용 | explicit selector만 공통 쿠키 기록; prefetched locale URL·SSR·Action·back/focus·OAuth 복귀로 preference가 바뀌지 않음 |
| 정규화 | `/en` 호환, 중복/미지원/빈 lang, 기존 query/hash/filters 보존, 외부·기계 URL 미변환, redirect loop 없음 |
| 데이터 보존·문구 갱신 | Jev 진행 중 스트림·결과·prompt 보존; Estimate dirty·raw invalid text·revision·undo/redo·통화·날짜 데이터 보존; 실제 이동 guard 취소 시 변경 없음. 언어 전환 직후 대표 화면의 번역 대상 UI key가 모두 새 locale 사전과 일치하고 서버의 옛 번역 문자열이 남지 않음. 사용자 입력·기존 생성 결과·고유명은 번역 대상에서 제외 |
| 인증/보안 경계 | anonymous/authenticated/expired/403/503, safe return 검증, exact callback/invite/relay, auth cookie 유지; 미등록 origin 차단 |
| 복구/저장 제한 | cookie/localStorage 차단·만료·중복 쿠키·구 NEXT_LOCALE 충돌·동시 두 탭·빠른 중복 클릭에서도 URL과 화면 언어 일치. 명시 선택 때 현재 host-only 잔여값 복구와 global 저장 실패 시 URL 동작 확인 |
| 화면/접근성 | 전체 메시지 누락 없음; html lang·페이지명 — 서비스명·service favicon·키보드 선택·aria labels·desktop/mobile 상태가 일치 |
| 공개 검색 | canonical/hreflang/x-default/sitemap과 HTTP Link header가 실제 번역만 가리킴; shared language cookie에 따른 공개 캐시 변질 없음; 없는 번역 직접 접근404와 선택기 목록 fallback/안내 |
| 직접 진입·초기 렌더 | main `/`는 항상 en, 저장 ko 제안 후 `/ko`, 무클릭 앱 이동은 en이되 저장 ko 유지. Estimate 무언어/무선호는 ja, explicit en/공통 ko 우선. query 앱 서버 html lang·metadata·provider 일치, spoofed 내부 헤더 덮어쓰기, neutral 초기화 후 Next head 복원에도 현재 언어 유지 |
| Home 선택 적용 | `?lang=en` → ja 선택 → URL ja → reload ja, back/forward, dirty guard 보존; 적용하지 못하면 선택 범위 미완료로 명시 |
| 패키지·운영 | 관련 단위/소비/브라우저 시험, 실제 Storybook 결과, 패키지 import/배포 identity 확인. shared UI를 바꾸면 기존 대비/소비 체크도 이행 |

설계 문서 작성은 이 시험의 통과를 뜻하지 않는다. 성공 기준은 공통 컴포넌트 import 여부가 아니라 **모든 필수 화면에서 표시 언어·URL·선택 저장·입력 상태·로그인 복귀가 함께 맞는 것**이다.

## 12. 리뷰 기록

Opus 5.5(`claude-opus-5-5`, high) 실제 리뷰를 받았다. agent는 `57075402-e0e3-4036-8311-45431ff534c0`이고 작업자가 조회한 runtime model도 동일했다. 초안 SHA256은 `ab9991d771878a43e89751df299e4eaf875a10c1765b1704bfa081d701406321`이다. [리뷰 원문](../../design/shared-language-2026-11-04/opus-review-initial.md), [수정본 재검토](../../design/shared-language-2026-11-04/opus-review-recheck.md), [반영 기록](../../design/shared-language-2026-11-04/opus-review.md)에서 채택/조정 이유와 마지막 지적의 반영을 구분한다. 외부 근거, 모델의 제안, 로컬 소스 확인, 실제 실행 검증은 서로 대체하지 않는다.
