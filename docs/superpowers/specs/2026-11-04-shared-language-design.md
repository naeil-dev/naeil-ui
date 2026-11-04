# naeil 공통 다국어 설계 — URL·내부 구현·번역 관리 통일

작성일: 2026-11-04 JST. **최종 설계안 — 내부 구현·번역 관리 통일**. Opus 5.5 검토 결과와 최종 파일 대조는 §13의 리뷰 기록을 따른다. 조사·설계 문서이며 제품 코드 변경·패키지 발행·배포는 수행하지 않는다.

## 1. 결정

**메인·Jev·Estimate와 모든 필수 naeil 사용자 페이지는 언어를 같은 URL 규칙으로 표현한다.**

**필수 세 Next 앱은 next-intl, app/[locale] 라우팅, 공통 locale 전환 controller, 같은 JSON 사전 로더/검사기를 사용한다.** 메인만 route navigation, Jev·Estimate는 native history로 언어를 바꾸는 이전 내부 설계를 폐기한다. 같은 문서를 복사하는 방식이 아니라 같은 공통 패키지 코드를 import한다. 서비스별로 남는 것은 번역 내용·업무 데이터/상태·인증 검사이며 다국어 알고리즘이 아니다. Home만 선택적 범위다.

| 언어 | 모든 서비스의 홈 | 하위 페이지 예 |
| --- | --- | --- |
| English | / | /calendar, /design |
| 한국어 | /ko | /ko/calendar, /ko/design |
| 日本語 | /ja | /ja/calendar, /ja/design |

예: naeil.dev/ko → jev.naeil.dev/ko → abestimate.naeil.dev/ko/calendar → naeil.dev/ko.

영어 /en은 옛 링크 호환 alias다. 새 링크에는 사용하지 않는다. Jev·Estimate의 ?lang=ko는 새 /ko 주소로 연결하는 호환 입력만 남기고 정상 전환/링크 생성 방식으로 계속 사용하지 않는다. 필수 서비스마다 공개 URL 전략을 선택하는 옵션은 두지 않는다. Home은 사용자가 허용한 선택적 범위이며 복잡하면 제외한다.

초기안은 언어 결정·저장만 공유하고 path/query를 나눴고, 다음 안은 URL만 같게 하면서 내부 전환을 나눴다. 사용자는 내부 구현도 통일하고 번역 저장 방식을 설명하도록 보완했다. [혼합안](../../design/shared-language-2026-11-04/superseded-hybrid-design.md)과 [URL만 통일한 안](../../design/shared-language-2026-11-04/superseded-url-only-design.md)은 보존하되 이번 내부 구조의 승인 근거로 사용하지 않는다.

## 2. 조사 결론과 선택 이유

공식 지침은 공개 다국어 콘텐츠에 별도 URL과 접근 가능한 언어 링크를 권고한다. 경로가 모든 제품의 유일한 정답이라는 결론은 아니다. 이번에는 메인의 기존 형태, 영어 접두사 생략 선호, 서비스 간 일관성이라는 **이 제품의 요구**를 기준으로 경로 통일을 선택한다.

| 대안 | 판단 |
| --- | --- |
| 모두 경로로 통일 | 채택. 한 주소 규칙·공통 builder·명시 언어로 공유/새로고침/복귀를 재현한다. 기존 앱의 상태·인증 이행 비용을 구현 범위에 포함한다. |
| 경로/query 혼합 | 이관 비용은 작지만 URL까지 공통화하려는 요구를 충족하지 못한다. |
| 모두 query로 변경 | 메인의 검색 URL을 이관하게 되고 /, /ko, /ja 선호와 다르다. |
| URL 변화 없이 브라우저 상태만 사용 | URL의 언어를 재현하기 어렵고 저장소만으로 서브도메인을 연결하지 못한다. |

디렉터리·query는 **현재 언어를 URL에 표현하는 방법**, 쿠키/localStorage는 **선호 저장**, 브라우저 언어는 **추천 신호**다. 같은 층의 대체재 세 가지가 아니므로 경로 통일 뒤에도 선호 저장은 사용할 수 있다. [조사 근거](../../design/shared-language-2026-11-04/research.md)와 [현행 확인](../../design/shared-language-2026-11-04/source-audit.md)을 따른다.

내부 구현은 메인과 Jev가 이미 사용하는 next-intl을 공통 기반으로 선택한다. i18next로 필수 앱 전체를 옮기는 안은 현재 메인의 server rendering·번역 로더까지 새로 옮겨야 하며 Home은 선택 범위여서 이점이 작다. 자체 번역 엔진도 만들지 않는다. next-intl이라는 이름만 맞추는 데서 끝내지 않고 provider·서버 설정·전환 controller·사전 포맷·검사기를 공통 entry가 소유한다. 이 선택은 작업자의 설계 판단이며 새로운 외부 조사 결과라고 주장하지 않는다.

## 3. 범위와 완료 기준

필수는 정확한 origin https://naeil.dev, https://jev.naeil.dev, https://abestimate.naeil.dev 및 현재 활성 owned naeil 사용자 UI 전체다. 메인의 landing/login/design/projects/blog/글, Jev 앱·권한/오류 UI, Estimate의 estimates/compare/settings/calendar/calendar-preview/권한·오류 UI와 하위 경로를 포함한다. 화면 언어 정책은 인증 여부와 무관하다.

구현 첫 단계에서 현재 DNS·hosting/tunnel ingress·배포 route·실제 링크를 대조하고 날짜가 찍힌 릴리즈 inventory를 고정한다. 로컬 main이나 오래된 ingress만으로 운영 전체를 확인했다고 보지 않는다. 기존 별도 제품/폐기 서비스 기록도 현재 상태를 대조한다. 이후 추가는 amendment/계약 검사로 처리하고 존재하지 않는 교차 메뉴를 있다고 가정하지 않는다.

API·OAuth callback·invitation·auth relay·webhook·health·assets는 언어 UI 경로 변환 대상이 아니며 기존 URL/검증 경계를 유지한다. Home의 localhost/Tailscale origin은 naeil.dev 도메인 쿠키 범위 밖이다.

레지스트리는 정확한 origin, service ID, 등록 사용자 route와 보호 여부를 가진다. 필수 서비스별 urlStrategy/neutralEntryPolicy 차이는 없다. 실제 디렉터리 mount 앱이 발견되면 경계를 명시하되 언어 접두사는 origin 직후다. 예: /ko/tools/foo/…. 현재 없는 mount를 신설하지 않는다. auth origin allowlist와 라우팅 레지스트리는 별개다.

## 4. 언어 결정과 선호 저장

현재 언어는 URL로 결정한다. /ko/…는 ko, /ja/…는 ja, 접두사 없는 사용자 경로는 en이다. 쿠키/브라우저는 이를 덮지 않는다. **직접 /에 들어오면 세 서비스 모두 영어다.** 한국어 화면의 다른 서비스 링크는 /ko/…로 생성하므로 언어가 이어진다.

저장 선호와 다른 언어 링크를 열어도 URL 언어로 표시하며, 방문·prefetch·SSR·RSC·Action·history·OAuth 복귀가 선호를 저장하지 않는다. 다른 탭의 선택을 현재 문서에 강제로 주입하지 않는다. 선호가 현재 언어와 다르면 비강제 “한국어로 보기” 링크 하나를 client에서 제안할 수 있다. 저장 선호가 없을 때 브라우저 언어를 추천 신호로 쓸 수 있지만 자동 redirect/저장은 하지 않는다. 지원 BCP47 기본 언어만 정규화하고 국가/IP로 추정하지 않는다. 공개 HTML 캐시를 선호별로 개인화하지 않는다.

생산 쿠키는 naeil_locale_v1=<en|ko|ja>; Domain=naeil.dev; Path=/; Max-Age=31536000; Secure; SameSite=Lax다. 비밀값/인증 수단이 아니고 명시 선택에서 JS로 쓰므로 HttpOnly는 사용하지 않는다. 1년은 최대 요청 수명이며 실제 보존을 보장하지 않는다. 저장용 서버 API나 cross-origin 방송 시스템을 만들지 않는다.

- 기존 host-only NEXT_LOCALE과 이름을 충돌시키지 않는다. 같은 이름의 중복 쿠키는 순서에 기대지 않고 무효 처리한다.
- 명시 선택 때 현재 호스트의 알려진 같은 이름·Path=/ 잔여값을 먼저 만료시킨 뒤 Domain 값을 쓴다. 모르는 모든 Path를 지울 수 있다고 가정하지 않는다.
- 저장 제한/만료에도 URL·선택·서비스 이동이 작동해야 한다. 개발은 별도 host-only 이름을 사용한다.
- legacy localStorage/NEXT_LOCALE은 이행 중 선호 제안에만 사용하고 URL 언어를 덮지 않는다. 읽기만으로 공통 선호를 생성하지 않는다. 실제 활성일 T+90일 뒤 legacy 읽기를 종료하며 실제 날짜를 receipt에 기록한다.

메인의 자동 탐지 제거, Jev의 저장값 기반 무접두사 진입 제거, Estimate의 기존 일본어 / → 영어 /는 의도한 변경이다. Estimate의 무언어 주소를 일본어로 남기는 예외는 두지 않는다. 관리 가능한 일본어 북마크/문서 링크의 /ja/… 갱신본을 준비하고 해당 서비스의 §11.4 운영 수신 acceptance 통과 직후 적용한다. 아직 수신하지 않는 운영 /ja로 링크를 먼저 배포하지 않는다. 식별 정보 없는 옛 /와 새 영어 / 요청을 자동 구분할 수 있다고 주장하지 않는다. Estimate 삼국어 번역 완료 전 이 변경을 활성화하지 않는다.

## 5. 공통 URL 생성과 호환

localeHref(service, unlocalizedRoute, locale)는 등록 origin과 route로 경로를 한 번만 만든다. /ko·/ja만 canonical prefix이고 en은 없다. query(언어 호환 키 제외), fragment, entity ID, 필터는 유지한다. koala 같은 경로를 ko로 해석하거나 문자열 전체를 replace하지 않는다. 알 수 없는 경로는404다.

owned href는 렌더 시점에 완성한다. 클릭 handler에서만 언어를 붙이지 않는다. header/footer/brand/current-project/subNav/CTA/login/new-tab/copy 모두 같은 builder를 사용한다. 완성 href를 next-intl locale 옵션으로 다시 감싸지 않는다. 로컬4.8.3은 이 옵션에서 /en을 강제할 수 있으므로 완성 URL에는 기본 Next link/router 또는 anchor를 사용한다.

client router.push/replace, 서버 redirect()/NextResponse.redirect, form/Action 완료 후 이동과 로그인 return 생성도 같은 builder를 사용한다. 서버는 검증된 요청 locale, client는 현재 provider locale로 공개 경로를 만든다. 예를 들어 Estimate의 내부 /에서 목록으로 보내는 redirect도 /ko 요청이면 /ko/estimates로 보낸다. 실제 라우트 이동에는 기존 guard를 적용한다. 이동 지점을 §11.1 inventory에 포함하며 등록된 사용자 UI 목적지를 접두사 없는 문자열로 직접 보내는 누락을 계약 검사로 막는다. protocol/API/form endpoint 자체는 locale builder 대상이 아니다. revalidatePath 등 캐시 무효화도 사용자 이동과 구분하고 실제 내부 route/cache key에 맞춘다. 공개 언어별 경로에 낡은 payload가 남지 않는지 구현 시 검증한다.

| 입력 | canonical 목적지 |
| --- | --- |
| Jev /?lang=ko | /ko |
| Estimate /calendar?lang=ja&view=week | /ja/calendar?view=week |
| /en/calendar — 등록된 사용자 route | /calendar |
| /ko/calendar?lang=ja | /ko/calendar — 명시 path 우선 |
| /calendar | /calendar — en |

legacy lang은 Jev/Estimate의 옛 UI route에서만 해석한다. 메인은 기존처럼 lang을 언어 입력으로 쓰지 않고 query를 보존한다. 호환 lang은 정확히 하나의 지원 값만 허용하며 중복·빈 값·미지원값은400으로 처리한다. 일반 문서400에는 세 언어의 안전한 canonical 링크를 제공해 다시 진입할 수 있게 한다. 잘못된 return 입력을 먼저 정규화해 보안 validator를 통과시키지 않는다.

호환 정규화는 문서 GET/HEAD에307로 한 번에 적용하고 선호를 쓰지 않는다. POST/Action/RSC를 문서 redirect로 처리하지 않는다. fragment는 서버가 볼 수 없으므로 client builder와 기존 안전한 return transport로 보존하고 브라우저 시험에 넣는다. 옛 query와 /en alias의 수신 호환은 유지하지만 새 href에는 만들지 않는다.

## 6. 동일한 next-intl 내부 구현과 상태 수명

세 앱 모두 Next App Router의 app/[locale] 사용자 route와 next-intl의 as-needed middleware를 사용한다. /ko/calendar는 내부 locale=ko의 calendar route, 영어 /calendar는 내부 locale=en의 같은 route 정의에 대응한다. 언어마다 파일 세 벌을 복사하지 않는다. API·callback 등 protocol route는 [locale] 밖에 둔다. 기존 앱의 무접두사 내부 페이지로 rewrite한 뒤 native history만 바꾸는 전환 분기는 두지 않는다.

공통 서버 모듈이 지원 locale·routing 설정·요청 검증·메시지 로더·next-intl request config를 제공한다. 검증된 public path와 [locale] params가 권위이며, framework locale 전달 헤더는 middleware가 덮어쓰고 request/layout에서도 지원값을 검증한다. proxy 제외 route는 외부 locale 헤더를 신뢰하지 않는다. root SSR html lang·Intl provider·metadata는 같은 locale을 사용한다. auth Set-Cookie와 private/no-store 조건은 유지한다.

수명 구조는 세 앱에서 동일하다. app/layout의 공통 전환 controller와 필요한 앱 업무 state provider를 [locale]보다 위에 둔다. app/[locale]/layout은 공통 NextIntlClientProvider wrapper를 사용해 해당 locale의 공통+서비스 메시지를 공급한다. UI locale provider가 바뀌거나 그 아래 화면이 remount될 수 있음을 전제하고, 작업 상태를 그 화면의 수명에 묶지 않는다. Next 경로를 바꾸면 자동으로 상태가 보존된다고 가정하지 않는다.

root 업무 provider는 상태와 action을 공급하며 번역 hook이나 locale별 메시지 객체에 의존하지 않는다. provider 밖으로 올라간 복구 dialog/notice도 상태는 root가 소유하고 실제 번역 렌더는 locale boundary 아래에서 한다. 같은 사용자·entity·revision의 store 항목이 있으면 remount된 화면은 server props로 재초기화하지 않는다. 더 새 revision은 기존 충돌/저장 복구 흐름으로 처리하며 raw draft와 undo를 조용히 덮지 않는다. 오래된 payload도 store를 되돌리지 않는다.

언어 선택은 공통 controller 하나가 완성한 href를 기본 Next router.replace에 전달한다. scroll:false와 같은 전환 옵션, pending lock, 오류·재시도, 명시 선호 기록 시점까지 공통 구현이다. native history.replaceState만으로 화면 locale을 바꾸는 별도 앱 구현은 제거한다. 실제 logical route가 같으면 save guard/저장/revision을 실행하지 않고 locale 경로만 바꾼다. 다른 logical route/서비스 이동·logout에는 기존 업무 guard를 적용한다. 브라우저 back/forward도 공통 parser로 구분하며 선호를 쓰지 않는다. Next router의 history state를 임의 복제하지 않는다.

Estimate의 raw invalid 입력·undo/redo·선택 항목·dialog 미제출 입력·저장 controller, Jev의 prompt·모델 선택·결과·AbortController·스트림 reader 수명을 해당 앱의 안정된 provider/store에 옮긴다. key는 locale이 빠진 entity/logical route와 사용자 세션 기준이다. 단순히 기존 WorkspaceProvider만 위로 옮기고 editor-local useState나 unmount cleanup이 입력/실행을 잃게 두면 미완료다. 언어 전환의 cleanup이 save/abort/reset을 호출하지 않게 하며, 실제 로그아웃·계정 변경에서는 기존 보안 규칙대로 이전 사용자 상태를 정리한다. 이것은 앱 업무 상태 소유권 변경이지 별도 다국어 엔진이 아니다.

구현 초기 차단 시험은 **공통 next-intl route 전환 중 서버/client 번역 갱신과 업무 상태 보존**이다. Jev 실행 중·Estimate 유효하지 않은 입력/미제출 dialog/undo 직후에 전환하고, prefetch·느린/실패한 RSC·history·새로고침·deep link·metadata를 확인한다. UI remount는 허용하지만 작업 상태 초기화·중복 실행/저장·스트림 중단은 허용하지 않는다(단, §7에 따라 사용자가 document 이탈을 확인한 경우는 제외). DOM focus/selection은 공통 전환 후 복구할 수 있도록 안정된 식별자를 사용한다. 실패하면 이 수명 설계를 수정하며 서비스 하나만 native history/query 방식으로 남기지 않는다.

locale navigation의 RSC 요청도 인증/권한을 다시 검사한다. 세션 만료나 권한 실패 시 보호 데이터를 반환하지 않고 요청 언어의 복구 UI를 표시한다. 이미 열려 있는 편집기를 중앙 로그인으로 자동 이동시켜 미저장 상태를 잃지 않도록 새 탭 재인증 등 기존 복구 흐름을 유지한다. 최초 document 진입의 로그인 redirect와 구분한다. pending 중 계정 변경은 이전 사용자 상태를 유지하는 예외가 아니다.

RSC 실패 응답은 단순 HTML401/403이나 cross-origin redirect로 보내지 않는다. 공통 요청 처리기가 요청 형식을 구분하고, 권한이 없는 RSC 요청은 [locale]의 접근 boundary에서 보호 데이터 없는 복구 컴포넌트를 유효한 RSC payload로 렌더한다. 요청 헤더가 RSC라는 이유로 권한을 부여하지 않으며 서버 데이터 접근 검사는 별도로 유지한다. 접근 결정 전달 헤더를 쓴다면 외부 입력을 덮어쓰고 proxy 제외 경로에서 신뢰하지 않는다. 복구 payload는 private/no-store다. document의 기존 redirect/status와 RSC의 렌더 형식을 구분하는 회귀 시험을 둔다.

## 7. 번역·상태·metadata

세 앱은 같은 next-intl getTranslations/useTranslations API를 사용한다. locale route navigation이 새 서버 payload와 client provider를 갱신하므로 서버 번역을 모두 client로 옮기는 규칙은 폐기한다. server component는 해당 요청 locale, client는 해당 화면 provider의 locale을 사용한다. 이전 locale에서 계산한 문자열을 안정된 업무 store에 보관하지 않고 오류 code·message key와 params를 저장한다. 진행 중인 기존 생성 결과·사용자 문서는 업무 데이터로 유지한다. 전환을 위해 별도 router.refresh를 덧붙이지 않는다.

Jev의 진행 요청·스트림·결과·prompt·모델 선택을 보존하고 생성 결과를 재생성/번역하지 않는다. Estimate의 raw invalid 입력·dirty·undo/redo·revision·선택 항목·견적 snapshot을 보존한다. 언어-only 전환은 저장 guard/저장/revision을 실행하지 않는다. 실제 화면/서비스 이동과 logout은 기존 guard를 지킨다.

Estimate는 header/footer 외에도 목록·편집·비교·설정·달력·미리보기·loading/empty/error·auth/access·검증·dialog·aria·제목 전체를 번역한다. 읽기 전용 포맷은 UI locale의 Intl, 통화·업무 시간대·문서 언어는 데이터/기존 설정을 유지한다. 입력 문자열/파서는 언어 때문에 재해석하지 않는다. PDF/문서 언어는 기존 설정(없으면 현행 ja)을 유지한다.

세 앱 모두 같은 전환 controller가 명시 선택 intent를 관리한다. 새 locale route의 provider/화면 commit을 확인한 뒤 해당 intent의 선호를 쓴다. 완료 callback이 없는 router API를 호출 성공만으로 commit으로 간주하지 않는다. 공통 locale boundary의 도착 신호와 요청 토큰을 사용하고 취소·실패·빠른 중복 선택·prefetch·popstate는 선호를 기록하지 않는다. 메인만 미리 쓰는 예외도 제거한다. 저장 차단만으로 화면 전환을 취소하거나 공통 쿠키를 과거 값으로 되돌리지 않는다.

RSC fetch 실패·비정상 응답·build 불일치가 document navigation으로 이어질 수 있는 분기는 로컬 Next 소스에서 확인했다. 따라서 정상 client 전환의 root store 보존을 네트워크 실패 전부의 보장으로 확대하지 않는다. 미저장 입력·미제출 dialog·진행 중 스트림이 있으면 같은 공통 이탈 보호 모듈의 beforeunload를 locale 전환 중에도 유지하며 Jev도 포함한다. 지원 브라우저의 실패 주입 시험에서 상태 유지 또는 사용자 확인을 검증한다. 확인 없이 유실되는 환경/상황은 검증 완료로 처리하지 않으며, 같은 controller가 안전한 시점까지 전환을 보류하도록 보완한다. 강제 저장·실행 중단이나 서비스별 다른 언어 전환 구현으로 우회하지 않는다. 사용자 선택으로 document 이탈을 허용한 경우에는 스트림 유지가 불가능함을 명확히 구분한다.

metadata는 같은 server helper가 locale과 서비스/page key에서 만들고 Next route navigation으로 갱신한다. html lang의 client 동기화도 공통 boundary가 담당한다. 서비스별 MutationObserver로 head를 계속 다시 덮는 구현은 제거한다. 느린 head/RSC가 이전 언어로 복원하지 않는지 검증한다. 제목은 Page name — Service name, 서비스 이름/favicon은 유지한다. 보호/인증/오류 UI는 noindex이며 공개 SEO용 alternate 목록을 붙이지 않는다.

### 번역 저장과 배포

현재 UI 번역 저장 위치는 [현행 확인](../../design/shared-language-2026-11-04/source-audit.md)의 표를 따른다. 메인은 messages/{en,ko,ja}.json, Jev는 messages.ts의 세 언어 객체, Estimate는 ja.ts와 직접 작성된 일본어, Home은 i18next용 JSON이다. 공통 header/footer/account 문구도 패키지 TS 객체에 있다. 확인한 UI 사전은 소스에 포함되어 빌드되며 번역 DB/API를 조회하지 않는다.

목표는 **버전 관리되는 UTF-8 JSON + ICU message 문법** 하나다. 각 앱은 messages/en.json, ko.json, ja.json에 자기 서비스 namespace의 문구만 둔다. 공통 navigation/account/footer/locale 문구는 공통 패키지의 messages/{en,ko,ja}.json에서 naeil namespace로 한 번만 관리하고 앱에 복사하지 않는다. 공통 로더가 선택한 언어의 공통 사전과 해당 앱 사전만 결합한다. 다른 서비스의 전체 사전을 번들하지 않고 namespace 충돌은 build 실패로 처리한다. locale→import는 검증된 정적 map으로 구성한다. standalone UI 호환용 작은 공통 사전 세 언어의 정적 포함은 §9의 명시적 예외다.

예를 들어 estimate.save 키의 값은 영어 Save, 한국어 저장, 일본어 保存다. 화면 코드는 문장 대신 같은 key를 사용한다. 같은 문구 저장 방식을 쓴다는 것이 모든 제품 사전을 한 파일이나 한 배포에 묶는다는 뜻은 아니다. 공통 패키지 변경은 패키지 버전 갱신과 소비 배포, 앱 전용 문구 변경은 해당 앱 빌드/배포로 반영한다. DB/CMS와 실시간 번역 API는 이번 설계에 추가하지 않는다.

공통 검사기는 세 언어의 key 집합·빈 값·ICU 구문·변수명/타입·필수 other 분기를 확인한다. plural 범주는 언어별로 다를 수 있으므로 모든 selector를 문자열로 동일하게 강요하지 않는다. 누락된 UI 번역은 build에서 차단하고, 예상 밖 runtime 누락은 en 복구와 관측 오류로 처리해 완료 조건 실패로 남긴다. 타입은 기준 메시지에서 생성/추론하고 서비스별 사전 구조를 서로 복사하지 않는다. JSX·서버 오류 응답에 남은 번역 대상 하드코딩도 inventory에서 제거한다.

블로그 본문은 content/blog/{locale}/*.mdx처럼 locale별 콘텐츠 파일을 유지하며 UI JSON에 긴 글을 억지로 넣지 않는다. 같은 locale·번역 존재 여부 규칙과 공통 링크를 사용한다. Jev 예시/판단 기준은 별도 locale 데이터로 정리할 수 있지만 이미 편집한 입력을 UI 전환 때 대체하지 않는다. 견적 데이터·사용자 입력·AI 결과는 번역 사전이 아니다. 번역 관리자 화면이나 무배포 문구 수정이 필요해지면 저장 backend만 확장할 별도 요구로 다룬다.

## 8. 인증·protocol 경계

기존 root-only/prefix 없는 matcher를 그대로 두고 /ko/…를 열면 인증 누락이 생길 수 있다. 공통 proxy 구성은 모든 지원 locale 사용자 경로를 포괄하고, 검증된 논리 route에 **기존 앱의 동일한 인증/권한 검사**를 적용한 뒤 next-intl routing을 실행한다. 등록되지 않은 내부 경로·중첩 locale·encoded alias를 자동 허용하지 않는다.

순서는 원본 외부 path 보존 → 기존 보호 protocol namespace 경계 → UI route/locale 엄격 해석 → 원래 return 검증·동일 auth/access 검사 → 안전한 alias 정규화 또는 UI rewrite다. /ko/api/…, /ja/auth/callback, locale이 붙은 invite/return을 strip해 실제 protocol handler로 보내지 않는다. 기존 exact boundary에 따라 거절/404한다. 인코딩·중첩·framework alias 방어도 재검증한다. API/Action/RSC의 정상 요청을 문서 redirect 규칙으로 처리하지 않는다.

Jev validateReturnTo는 /만 허용하던 규칙을 canonical root /, /ko, /ja로 명시 확장한다. 길이·query 개수·control char·origin·fragment 제약은 유지한다. 옛 lang과 /en은 좁은 legacy 검증 후 canonical로 바꾸고 결과도 재검증한다. Estimate의 return 생성은 등록된 세 언어 사용자 경로를 사용한다. 메인의 canonicalRedirect는 이미 정확한 세 origin의 경로를 수용하므로 언어 지원을 이유로 validator를 넓히지 않는다. 새 경로 수용을 기존 validator 그대로 시험한다. auth origin allowlist도 wildcard로 넓히지 않는다.

한국어 Estimate 로그인은 naeil.dev/ko/login?next=<https://abestimate.naeil.dev/ko/calendar…>다. login 언어는 메인 경로, 복귀 언어는 검증된 next의 경로가 결정한다. callback/invite/exact Home relay URL은 바꾸지 않는다. next 문자열을 전역 replace하지 않는다. fragment는 브라우저가 캡처해 기존 bounded transport로 보낸다.

anonymous/authenticated/expired/403/503를 실제 언어 경로별로 검증한다. 최초 무접두사 진입도 서버가 en으로 결정하므로 localStorage 부재로 auth 언어가 바뀌지 않는다. protocol/접근 실패 문구도 요청 locale을 사용하며 선택 UI를 제공한다면 client 전환 계약도 따른다. 비활성 archive를 현재 운영 결함으로 주장하지 않는다.

## 9. 메인·공통 패키지

필수 세 앱의 공통 next-intl 설정은 localePrefix=as-needed, localeDetection=false, localeCookie=false, alternateLinks=false다. 검증된 같은 next-intl 버전을 소비하고 upgrade 회귀 검사를 공유한다. peerDependencies 선언만으로 runtime 중복이 사라진다고 보지 않으며 실제 소비 dependency tree/packed bundle에서 React·next-intl context 중복이 없는지 확인한다. 공개 페이지 metadata/sitemap만 실제 번역의 canonical/hreflang/x-default를 소유한다. middleware/navigation 쿠키 부작용은 최종 소비 버전으로 확인한다. 없는 콘텐츠 번역 직접 접근은404, 헤더에서 그 언어를 선택하면 해당 언어 목록+검증된 원문 안내로 이동한다. 영어 본문을 다른 언어 URL 아래200으로 내지 않는다. 메인의 generateStaticParams/setRequestLocale와 공개 경로의 정적 생성·캐시 결과를 확인하며 공통 root에 요청별 auth/headers 접근을 무조건 추가해 공개 페이지를 동적으로 바꾸지 않는다.

opt-in @naeil/ui/naeil-locale과 명시적인 client/server/message 하위 entry가 locale 타입·path parse/build·legacy alias·next-intl 설정·서버 메시지 로더·Intl provider·전환 controller·선호 I/O·metadata helper·사전 검사기를 소유한다. API 이름은 구현 전에 export 계약으로 고정한다. import의 window/cookie 부작용은 없으며 server-only 의존성이 client 번들에 섞이지 않게 분리한다. 소비자는 서비스 ID·사전·route inventory·기존 auth/guard/업무 state만 공급하고 로더/전환/저장 알고리즘을 재구현하지 않는다. URL builder는 보안 return validator를 대체하지 않는다.

NaeilHeader/NaeilFooter/NaeilHeaderAccountControl의 표현·접근성·반응형 구현은 유지하고 중복 TS 번역은 공통 JSON을 원천으로 사용하게 한다. 기존 standalone locale props 사용도 계속 동작하도록 호환 adapter를 유지하되 별도 번역 원본을 만들지 않는다. generic Navigation/SiteFooter, legacy Nav/Footer, 기존 공개 i18n/routing 기본 동작을 묵시적으로 변경하지 않는다. 새 공통 구현은 opt-in entry에서 제공한다. frozen0.7.1 archive, source 32108fd8e1cb1db6dae24a09f3ca72ac9a91f618, tag v0.7.1은 보존한다.

새 공통 provider 아래에서는 naeil namespace를 context로 공급하고 standalone 호환 entry만 작은 공통 사전 세 언어를 정적으로 포함한다. 기존 header/footer import에 Next 전용 provider 의존성을 강제하지 않는다. 같은 JSON에서 호환 객체를 생성할 수 있지만 수동 복제된 두 번역 원본은 허용하지 않는다. 앱 전용 사전을 다른 서비스나 standalone entry에 넣지 않는다.

## 10. Home — 선택적 예외

Home은 현재 i18next와 React/Vite 구조라서 필수 Next 앱과 같은 내부 runtime으로 옮기는 것을 간단한 변경이라고 보지 않는다. 기본 범위에서는 제외한다. 작은 독립 작업으로 같은 JSON 형식/공통 링크를 사용할 수 있는 부분만 선택 적용하며, Home까지 내부 runtime 통일 완료라고 보고하지 않는다. Next로 프레임워크를 재작성하거나 별도 도메인 자동 동기화/DNS 변경을 이번 작업에 넣지 않는다.

Home 미이행 시 기존 i18next를 유지하고 발견된 ?lang=en → ja 선택 → reload en 문제는 작은 query 동기화로만 선택 수정할 수 있다. 이는 **Home의 허용된 선택 범위 예외**이며 필수 앱에 같은 예외를 남기는 근거가 아니다. Home→필수 서비스 링크는 공통 path builder를 쓴다. localhost/Tailscale가 naeil.dev 쿠키를 공유한다고 가정하지 않는다.

## 11. 구현·배포·롤백

1. 현재 소스/버전·필수 origin/route/link inventory와 client·서버의 코드상 이동/redirect/return 생성 지점을 고정한다. branch/소비자0.7.2와 Site identity0.9.0 차이를 실제 registry artifact/source로 해소하고 올바른 유지보수 기반에서 작업한다.
2. 공통 next-intl 서버 설정·provider·controller·JSON 로더와 [locale] route를 세 앱에 적용하고 **업무 state 수명 분리와 locale navigation**을 먼저 구현/시험한다. 같은 단계에서 protocol 경계·Jev return validator·Estimate 보호 경로를 검증한다. 실패를 native history/query 분기나 강제 저장으로 우회하지 않는다.
3. 새 entry 소비 업그레이드의 header/footer/account·catalog·frame 차이를 별도 검증한다. 실제 Storybook·packed consumption·관련 대비/공개 API 체크를 수행한다.
4. 모든 수신 후보와 첫 배포의 rollback fallback을 사전 검증한 뒤 운영에 순차 배포한다. **각 서비스의 수신 버전이 운영 요청을 받기 시작할 때부터 무접두사 경로는 en**이다. 메인은 자동 탐지를 끄고 Jev도 저장값으로 진입 언어를 덮지 않는다. Estimate는 삼국어 번역·편집 상태 보존이 완료되어야 이 단계에 들어간다. /ko·/ja·legacy alias·서버 redirect·로컬 선택기가 같은 최종 경로 계약을 사용하며, 일본어 문서/북마크 갱신본은 해당 서비스의 운영 수신 acceptance 통과 직후 적용한다. 공통 선호 쓰기와 다른 서비스로 보내는 새 링크의 일괄 전환은 아직 켜지 않는다. 로그인 진입 링크와 return 생성은 auth 경계이므로 4단계에 포함한다. Jev return 검증·Estimate return 생성을 반영하고 메인 validator는 변경 없이 새 경로 수용을 시험한다. 서비스별 의미 변경 시각·배포 identity·보안/호환 수신 receipt를 남긴다. 이 이행 중간 상태를 전체 완료로 보고하지 않는다.
5. 모든 필수 수신·auth 경계가 준비된 뒤 서비스 간 공통 링크와 명시 선택의 공통 선호 쓰기를 활성화한다. 무접두사 언어 의미/canonical은 4단계에서 확정되었으므로 여기서 다시 바꾸지 않는다. 옛 query와 새 path, 실제 교차 링크·코드상 이동을 함께 검증한다.
6. 실제 배포 identity로 acceptance를 통과해야 완료다. legacy 저장 힌트는 T+90일에 종료하고 유효한 옛 lang 및 /en의 수신 호환은 유지한다. 새 페이지는 같은 계약 검사를 통과해야 한다.

정상 롤백 대상으로 **무접두사=en과 삼국어 path/legacy alias 수신·auth 보호가 준비된 4단계 호환 버전**을 보존한다. 5단계 정상 롤백은 서비스 간 새 송신과 공통 선호 쓰기를 끄고 그 수신 버전에 남는 것이다. 공개된 영어 /를 다시 ja/저장값 해석으로 바꾸지 않는다. 구버전 앱을 쓰더라도 compatibility adapter로 같은 주소 의미·삼국어 path·중앙 return 경계를 유지해야 정상 복귀로 인정한다. 언어 계약을 포기하는 긴급 복귀는 아래 조건으로 구분한다. 업무 데이터 스키마 변경은 이 locale 이행에 포함하지 않는다.

첫 4단계 배포도 예외가 아니다. 문서 링크를 아직 갱신하지 않았더라도 로컬 선택기·legacy redirect·직접 입력으로 새 경로가 노출될 수 있다. 따라서 운영 요청을 받기 전에 후보와 별도로 검증된 복귀 경로를 확보한다. 같은 주소 의미·auth 경계를 유지하는 호환 빌드를 우선한다. 이를 제공할 수 없으면 직전 운영 버전으로 긴급 복귀할 수 있다. 단, 언어 경로를 모르는 해당 구버전이 /ko·/ja 사용자 경로와 locale이 붙은 protocol 경로에 보호 데이터 없이404를 응답하는지 사전에 확인해야 한다. 이미 locale 경로를 지원하는 메인 등은 기존 인증/권한 경계의 유지 여부를 확인한다. 이 긴급 복귀는 언어 계약 실패와 무접두사 경로의 의미 역전으로 기록하고 전체 완료 상태를 철회한다. 요청 언어의 점검503은 직전 버전도 안전하지 않을 때만 쓴다. 실제 노출 후 구버전 단독 복귀는 위 사전 확인을 통과한 경우에만 허용하며 정상 rollback 성공으로 세지 않는다. 운영 요청을 전혀 받지 않은 격리 배포 실패는 직전 버전으로 단순 복귀할 수 있다.

## 12. 인수 조건

| 영역 | 필수 결과 |
| --- | --- |
| 하나의 URL | 모든 필수 origin/사용자 route에서 en unprefixed, ko/ja prefixed. 정상 href/선택기가 ?lang= 또는 /en을 만들지 않음 |
| 진입·선호 | 모든 /는 cookie/browser와 무관하게 en. /ja는 ko 선호에서도 ja. 추천·다른 탭·URL 방문이 선호를 덮지 않음 |
| 직접 진입·서버 | 깊은 locale path의 reload/new-tab/SSR html lang·metadata·provider 일치. 내부 header spoof 덮어쓰기/거절 |
| 내부 구현 | 세 앱이 같은 next-intl 버전·공통 server/client/controller/loader를 소비. 언어용 독자 history/storage/provider 분기 없음 |
| 사전 | 공통 JSON은 단일 원천, 앱별 JSON은 동일 형식/검사기. namespace·key·ICU 변수 검사와 필요한 사전만 bundle. 누락/하드코딩 없음 |
| 전체 연결 | 실제 링크 × 3언어 × header/footer/brand/CTA/login/new-tab/copy 및 client 이동·서버 redirect·form/Action 후 이동·return 생성 × 3언어. 별도 모든 서비스 쌍 builder 계약 |
| 호환 | 옛 lang·/en 단일-hop 정규화, 잘못된/중복 lang 거절, query/filter/hash 보존, loop 없음 |
| 업무 상태 | Jev 스트림·prompt·결과, Estimate raw invalid·dirty·undo/redo·미제출 dialog·revision·통화/날짜/문서 snapshot 보존. locale-only 저장/abort/reset/추가 refresh 없음. remount/server props로 store 재초기화 없음. RSC 실패·세션 만료에도 유지 또는 사용자 이탈 확인 |
| 전체 문구 | 전환 직후 번역 대상 UI key가 새 사전과 일치. 옛 서버 문자열 없음. 사용자 데이터·기존 생성 결과·고유명 제외 |
| history·routing | 공통 router.replace/popstate와 logical-route 이동 구별. active/hydration/prefetch/Action·OAuth 팝업·실패 RSC 조합의 상태·언어 보존(단, §7에 따라 사용자가 document 이탈을 확인한 경우는 제외). commit 전 선호 기록 없음 |
| auth 경계 | 세 언어 전 보호 route의 anonymous/authenticated/expired/403/503. protocol prefix·encoded/nested 우회 차단. exact return/invite/relay·auth cookies 유지 |
| 검색 | canonical/hreflang/x-default/sitemap/HTTP Link가 실제 번역만 표시. 미번역404/선택기 목록 fallback. 공개 캐시 개인화 없음. 기존 공개 정적 생성/캐시 유지 확인 |
| UI·저장 | 전체 삼국어/aria/title/favicon/desktop/mobile, 저장 차단·중복·만료·빠른 선택·두 탭. cookie 실패해도 path 전환 |
| 롤백 | 최초 운영 노출 전 별도 fallback과 구버전의 새 prefixed path404·보호 데이터 비노출 확인. 정상 복귀는 무접두사=en·새 path/legacy alias·중앙 login return 유지. 긴급 구버전 복귀는 언어 계약 실패·완료 철회로 기록하고, 그마저 안전하지 않을 때만 점검503. 서비스별 의미 변경 시각 기록 |
| Home | 기본 제외와 이유 별도 기록. 제외해도 필수 앱에 query/독자 내부 구현 예외가 남지 않음 |

문서 작성은 시험 실행을 의미하지 않는다. 인증 화면만 확인하거나 공통 컴포넌트를 import했다는 이유로 전체 통일 완료를 보고하지 않는다.

## 13. 리뷰와 근거

초기 혼합안과 URL만 통일한 안의 Opus 5.5 리뷰로 이번 내부 구현의 검토를 대신하지 않는다. 기존 [URL 리뷰](../../design/shared-language-2026-11-04/opus-path-review.md)의 이동 누락·배포 시점·rollback 보완은 유지한다. 이번 변경은 별도 조건부 리뷰를 받아 RSC 실패 시 이탈·store 재초기화·standalone 사전 범위를 보완했다. [내부 구현 리뷰](../../design/shared-language-2026-11-04/opus-runtime-review.md)에 실제 대상 hash·모델·응답·반영 여부를 기록한다. 최종 파일 자체의 재검토 여부와 결론은 해당 리뷰 및 receipt에 기록된 hash와 대조한다. 외부 사실 근거, 모델 설계 의견, 소스 확인, 구현 후 실행 시험을 구별한다.
