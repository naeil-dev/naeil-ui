# 언어 공통화 근거 검토 — 2026-11-04

사용자 보완을 반영한 현재 결론은 **필수 서비스의 URL도 `/`, `/ko`, `/ja`로 통일**하는 것이다. 초기 혼합안은 이관 비용을 우선했으나 공통화 범위를 좁게 해석했다. 외부 사실 근거는 그대로이며 선택의 우선순위를 바로잡았다. ledger가 확정한 최초 보고서의 바이트는 [research-initial.md](research-initial.md)에 보존한다.

이후 사용자는 내부 구현까지 통일하도록 요청했다. [현재 설계](../../superpowers/specs/2026-11-04-shared-language-design.md)는 필수 Next 앱의 next-intl 경로 전환/provider/로더를 공유하고 UI 사전을 JSON으로 통일한다. 이것은 기존 라이브러리·소스 확인과 추가 요구를 반영한 설계 판단이다. 이번 외부 자료가 그 새 구현의 상태 보존을 실행 검증했다는 의미는 아니다.

조사 질문은 “경로·쿼리·브라우저 저장 중 무엇이 항상 우월한가”가 아니라, 공개 사이트와 입력 중심 앱을 연결할 때 어떤 공통 계약이 필요한가다. 본문은 읽은 원문에 근거한 사실과 이 프로젝트의 설계 판단을 구분한다. [최종 설계](../../superpowers/specs/2026-11-04-shared-language-design.md), [현행 확인](source-audit.md)을 함께 본다.

## 공식 근거

| ID | 읽은 원문 및 범위 | 확인한 내용 | 적용 한계 |
| --- | --- | --- | --- |
| R1 | [Google Search Central — 다국어/다지역 사이트](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites?hl=en), 언어별 URL·hreflang·자동 이동 관련 본문 | 언어별 별도 URL을 권하고, 쿠키/브라우저 언어만으로 같은 URL의 내용을 바꾸는 방식의 검색 수집 한계를 설명한다. 추정한 언어로 자동 리다이렉트하지 말고 다른 언어로 이동할 링크를 제공하라고 권한다. | 공개 검색 대상에 대한 지침이다. 모든 인증 앱에 디렉터리가 필수라는 뜻이 아니다. 추출된 지역 URL 비교 표의 장단점 셀은 유실되어 그 표를 판단 근거로 쓰지 않았다. |
| R2 | [next-intl routing configuration](https://next-intl.dev/docs/routing/configuration), prefix·as-needed·never·detection·cookie 부분 | 기본 언어 접두사를 생략하는 `as-needed`와 URL에 언어를 표시하지 않는 `never` 모두 지원한다. `localeDetection: false`는 브라우저 헤더뿐 아니라 쿠키 기반 탐지도 끈다. 쿠키 자동 기록은 별도로 `localeCookie: false`로 끈다. | `as-needed`만 설정하면 `/`가 항상 영어라는 보장이 없다. `domains` 설정은 언어별 도메인 매핑이며 서로 다른 제품의 선호 언어 공유를 자동 해결하지 않는다. |
| R3 | [next-intl middleware](https://next-intl.dev/docs/routing/middleware), prefix 기반 우선순위·쿠키 갱신 부분 | 기본 우선순위는 경로 → 쿠키 → Accept-Language → 기본 언어다. 접두사가 있는 URL 방문도 기본 구성에서는 언어 쿠키를 갱신할 수 있다. | “사용자가 선택기를 조작했을 때만 저장”하려면 기본 middleware/navigation의 쿠키 부작용을 함께 점검해야 한다. |
| R4 | [MDN Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie), Domain·Path·Secure·SameSite·수명·접두사 부분 | `Domain=naeil.dev`는 부모 도메인과 하위 도메인에 적용된다. Domain을 생략하면 해당 호스트에 한정된다. `__Host-` 쿠키는 Domain을 지정할 수 없다. | 도메인 쿠키는 다른 등록 도메인, localhost, Tailscale 호스트까지 공유되지 않는다. JS로 선호값을 쓰려면 HttpOnly를 사용할 수 없다. 인증 쿠키 정책과는 별개다. |
| R5 | [MDN Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cookie), 본문 전체 | 같은 이름의 Domain/Path가 다른 쿠키가 공존할 수 있다. 요청 헤더에는 Domain/Path 정보가 없고 순서도 신뢰하면 안 된다. | 기존 `NEXT_LOCALE`을 그대로 Domain 쿠키로 확장하면 host-only 값과 충돌할 수 있다. 새 이름과 중복 처리 규칙이 필요하다. |
| R6 | [MDN same-origin policy](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Same-origin_policy), cross-origin data storage 부분 | localStorage는 origin별로 격리된다. 쿠키의 도메인 범위와 다르다. | Jev의 localStorage 키를 Home이나 메인에서도 같은 이름으로 바꾸는 것만으로 공유되지 않는다. |

이 문서들의 게시/수정일은 이번 추출에서 확인되지 않았다. **2026-11-04 JST에 접근했다는 사실을 문서 수정일로 대체하지 않는다.**

## 구현자 경험과 유지관리자 의견

| ID | 원문·작성자·날짜 | 읽은 내용과 설계 반영 | 증거의 성격 |
| --- | --- | --- | --- |
| R7 | [next-intl #1793](https://github.com/amannn/next-intl/issues/1793), AirboZH, 2025-03-14 게시/03-18 수정 | 명시적 선택만 쿠키에 기록하려는 요구와 기본 경로/쿠키 정책의 충돌을 설명한다. | 한 사용자의 요구 사례. Notion 언급을 별도로 검증하지 않았으므로 Notion의 실제 동작 근거로 쓰지 않는다. |
| R8 | [#1793 유지관리자 답변](https://github.com/amannn/next-intl/issues/1793#issuecomment-2728795490), amannn, OWNER, 2025-03-17 | 경로를 쿠키보다 우선하고 자동 이동을 보수적으로 다루는 이유를 설명한다. 언어 전환 제안을 자동 이동보다 선호한다. | 프로젝트 유지관리자 의견. Google 지침의 인용은 R1과 같은 원천이며 별도 독립 근거로 세지 않는다. |
| R9 | [#1793 추가 답변](https://github.com/amannn/next-intl/issues/1793#issuecomment-2728887255), amannn, OWNER, 2025-03-17 | locale prefix 이동과 쿠키 갱신이 Link·middleware의 기존 호환 계약 일부임을 설명한다. | 라이브러리의 현재 버전 모든 세부 동작을 재현했다는 뜻은 아니다. 선택기/Link 부작용을 실제 소비 버전에서 검증할 이유다. |
| R10 | [next-intl #1962](https://github.com/amannn/next-intl/issues/1962), totodot, 2025-07-20 게시/08-16 수정 | Next 15.4.2, next-intl 4.3.4, React 19.1.0에서 팝업을 연 뒤 다른 경로로 이동하고 이전 Server Action을 실행할 때 리다이렉트 루프를 보고했다. | 과거 버전에 한정된 재현 보고다. 현재 버전 버그나 경로 방식 전반의 결함으로 일반화하지 않는다. |
| R11 | [#1962 유지관리자 답변](https://github.com/amannn/next-intl/issues/1962#issuecomment-3113308742), amannn, OWNER, 2025-07-24 | Action이 해당 페이지에만 존재하는 Next의 경계 사례로 추정하고 명시 URL의 route handler를 대안으로 제안했다. | 원인 확정/수정 배포 증거가 아니다. 현재 앱의 로그인 팝업·Action·이동 조합을 회귀 항목으로 채택한다. |
| R12 | [Reddit 경험 1](https://www.reddit.com/r/nextjs/comments/1x1h8ji/comment/pezect5/), Which-Examination-74, 화면 표시 “25일 전”, 정확한 날짜 미확인 | en/ru/uz 앱에서 영어 전용 글이 자동 언어 이동 후 404가 되고, 미번역 페이지가 다른 lang 아래 영어로 표시된 경험을 설명한다. 탐지를 끈 뒤 기본 영어 진입을 수용했다고 한다. | 원문 댓글을 읽었다. 본인이 개발자라고 설명하지만 소속·버전은 확인되지 않았다. |
| R13 | [Reddit 경험 2](https://www.reddit.com/r/nextjs/comments/1x1h8ji/comment/pf03dfd/), 같은 작성자·같은 스레드, 정확한 날짜 미확인 | detection을 끄면 쿠키도 라우팅에 사용되지 않고, 쿠키 기록은 별도라는 dev-server 확인을 설명한다. | R12와 **동일 원천 한 사례**다. 별도 독립 사용자나 다수 의견으로 세지 않는다. R2의 공식 설명을 보완한다. |

GitHub 이슈는 수집 당시 REST 메타데이터에서 closed였으나, 이것으로 특정 수정 버전이 출시됐다고 판단하지 않았다. 2025년 이슈들은 설정한 최근 90일 범위보다 오래된 보완 자료다. Reddit 원글 전체는 잘린 상태여서 인용하지 않았고, 완전히 읽은 위 두 댓글만 사용했다. 이미지 속 로그도 근거로 주장하지 않았다.

## 비교와 설계 판단

| 선택 | 장점 | 비용/제약 | 이번 판단 |
| --- | --- | --- | --- |
| 모든 앱을 `/`, `/ko`, `/ja`로 통일 | 주소 규칙이 하나이고 영어 기본 경로 선호를 모든 앱에 적용할 수 있다. | Jev의 루트 전용 return 검증/인증 matcher, Estimate의 여러 보호 경로, locale 변경 시 편집 상태 수명을 함께 바꿔야 한다. 경로만 통일해도 선호 저장·링크·번역은 따로 필요하다. | **채택**. 이번에는 URL 규칙까지 통일하는 것이 요구사항이다. 이행 비용은 상태 보존·인증·호환 검증으로 해결한다. |
| 모든 앱을 `?lang=`으로 통일 | 클라이언트 앱의 상태를 유지하며 전환하기 쉽고 URL 공유가 가능하다. | 이미 검색용 언어 경로·canonical·sitemap을 가진 메인 사이트를 이관해야 한다. | 메인 변경 이익이 작아 채택하지 않는다. |
| 모든 앱을 브라우저 상태만으로 통일 | 주소가 단순하다. | 링크를 받은 사람과 새로고침 후 언어가 달라질 수 있고 origin별 storage만으로 서브도메인을 연결할 수 없다. 공개 다국어 검색에도 불리하다. | 기본 전략으로 채택하지 않는다. |
| 공통 정책 + 사이트 경로 / 앱 쿼리 어댑터 | 언어 우선순위·저장·모든 링크를 공유하면서 기존 검색 구조와 입력 앱의 경로를 유지한다. | 두 URL 표현을 지원해야 하고 어댑터 계약 테스트가 필요하다. | **초기안이며 현재는 채택하지 않음**. 언어 동작만 공유하고 주소 표현을 나누는 것은 사용자가 원한 공통화 범위를 충족하지 못한다. |

“경로·파라미터·브라우저”는 같은 층의 대체재 세 개가 아니다. 앞의 둘은 현재 페이지 언어를 URL에 표현하는 방법이고, 쿠키/localStorage/Accept-Language는 저장 또는 최초 추정 방법이다. URL과 선호 저장을 함께 사용할 수 있으며 각각의 역할을 명확히 해야 한다.

## 조사 범위와 재현 기록

- saved run: `/tmp/naeil-i18n-research-20261104.4DIWBi`.
- 기간: 2026-08-06~2026-11-04, 오래된 정확한 원문은 stale로 보존했다. 최근 90일 경험으로 검증된 다수 사례를 확보했다는 주장은 하지 않는다.
- native 검색 4회 + 로그인된 Reddit 내부 검색 1회. 본문은 공식 문서 추출, GitHub REST, Aside 브라우저로 읽었다. 검색 스니펫만으로 결론을 내리지 않았다.
- 본문 16개 수집, 선택한 13개 본문/관련 절을 읽고 인용했다. GitHub의 짧은 후속 3개는 수집만 했고 근거에서 제외했다.
- 설치/업그레이드, 로그인 시도, 댓글 작성 등은 하지 않았다. 조사용 Aside 탭과 세션을 종료했다.
- 외부 근거를 실제 제품 동작 시험으로 대체하지 않는다. 현행 Home 문제 재현과 소비 소스 확인은 별도의 현행 조사이며, 제안한 새 구조를 실행한 시험은 아직 없다.

| 소스 | 상태 | 수집 | 인용 | 최신 게시/수정일 | 수단 |
| --- | --- | --- | --- | --- | --- |
| Google·next-intl·MDN 공식 문서 | 관련 본문 확인 | 6문서 | 6문서 | 미확인 | native 발견 → 본문 추출 |
| next-intl GitHub | 선택 본문 확인, 과거 자료 | 이슈 2 + 댓글 6 | 이슈 2 + 댓글 3 | 2025-08-16 | REST |
| Reddit | 댓글 원문 확인, 단일 작성자 | 댓글 2 | 댓글 2, 독립 사례 1 | 미확인; 화면 “25일 전” | 로그인된 Aside 내부 검색·원문 |
