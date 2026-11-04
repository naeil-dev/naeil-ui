# 현행 언어 처리 확인 — 2026-11-04

조사 기준은 2026-11-03의 공개 배포 identity·직접 확인과 11-04의 보완 소스 열람이다. 여기 적힌 현행 상태는 새 설계의 구현 완료를 뜻하지 않는다.

| 대상 | 확인된 처리 | 주요 누락 |
| --- | --- | --- |
| naeil.dev | next-intl, en 기본, `localePrefix: as-needed`; `/`, `/ko`, `/ja`. 기본 locale detection 활성 | 접두사 없는 URL이 쿠키/브라우저에 따라 이동할 수 있다. 공통 selector가 있어도 다른 서비스의 저장·링크 계약은 통일되지 않았다. |
| Jev | `?lang=` → `naeil-jev-locale` localStorage → host-only `NEXT_LOCALE` → 초기값. 선택 시 history.replaceState | origin별 저장이며 동일 도메인 전체의 선호값이 아니다. 루트만 허용하는 return 검증과 루트 auth matcher가 있어 경로 이관 비용이 있다. |
| Estimate | `locale="ja"`인 header/footer/account, `<html lang="ja">`, 일본어 메시지 직접 사용, selector 없음 | 언어 전달만 고쳐서는 삼국어가 되지 않는다. 전체 UI·오류·인증 상태 번역과 언어 provider 도입이 필요하다. |
| Naeil Home | i18next, `lang` query → `relaydock-language` → navigator, 선택 시 URL은 그대로 | `?lang=en` 진입 → ja 선택 → 화면 ja/URL en → reload en을 브라우저에서 재현. query 없는 진입에서 ja 선택 → reload ja는 유지됐다. |

Home 검증 뒤 브라우저 선호를 원래 ko로 복원했고 조사용 작업 공간을 닫았다. Home은 localhost뿐 아니라 별도 Tailscale origin에서도 동작한다. `Domain=naeil.dev` 쿠키로 이 origin까지 연결할 수 없다.

## 소스의 신뢰 범위

### 번역 문구의 현재 저장 위치 — 사용자 추가 질문 확인

아래는 직접 읽은 현재 작업 소스/소비 복사본의 위치다. 번역 저장 구조를 확인했으며 모든 파일의 운영 배포 일치를 재입증한 것은 아니다. 확인한 UI 번역은 DB/CMS에서 조회하지 않고 소스에 포함해 빌드한다.

| 대상 | 저장 위치 | 읽는 방식 |
| --- | --- | --- |
| 메인 UI | [messages/en.json](../../../messages/en.json), [ko.json](../../../messages/ko.json), [ja.json](../../../messages/ja.json) | [i18n/request.ts](../../../src/i18n/request.ts)의 locale별 import → next-intl의 getTranslations/useTranslations |
| Jev UI | 소비 복사본 src/lib/comparison/messages.ts의 ko/ja/en 객체 | src/components/comparison/app-language.tsx가 NextIntlClientProvider에 jev namespace로 전달. 이미 next-intl 사용 |
| Jev 예시·판단 기준 | src/lib/comparison/presets.ts 및 preset-translations.ts | UI 메시지와 별도 데이터 구조. 이미 입력/실행한 문구를 언어 전환 때 다시 번역할 데이터로 보지 않음 |
| Estimate UI | 소비 복사본 src/messages/ja.ts 및 컴포넌트에 직접 적힌 일본어 | ja 객체 직접 import, JSX/검증 문구 직접 사용. 영어/한국어 사전과 공통 번역 provider가 없음 |
| Home UI | Home worktree frontend/src/i18n/locales/{en,ko,ja}.json | frontend/src/i18n/index.ts가 i18next/react-i18next에 resources로 등록 |
| 공통 UI | [naeil-header-content.ts](../../../src/components/naeil-header-content.ts), [naeil-footer.tsx](../../../src/components/naeil-footer.tsx) 등 | 패키지의 locale별 TS 객체. 제품 사전과 별도로 관리됨 |
| 블로그 본문 | content/blog/{en,ko,ja}/*.mdx | [blog.ts](../../../src/lib/blog.ts)가 파일을 읽음. 버튼/오류 문구용 사전과 성격이 다른 번역 콘텐츠 |

메인 JSON은 언어별198개 leaf key, Home은 언어별1568개 leaf key이며 각 서비스 내부의 세 언어 key 집합은 일치했다. 이는 기계적으로 key를 비교한 결과일 뿐, 번역 품질·화면의 하드코딩 부재를 검증한 것은 아니다. Jev와 메인이 이미 같은 next-intl을 쓴다는 사실과, 언어 판정/저장/provider 위치/메시지 포맷까지 공통 구현이라는 주장은 구별해야 한다.

내부 구현 리뷰 뒤 로컬 node_modules/next/dist/client/components/router-reducer/fetch-server-response.js를 읽었다. 비-Flight 응답·비정상 status·body 부재·build ID 불일치에서 MPA navigation을 반환하고 fetch 예외도 browser navigation fallback으로 처리하는 분기가 있다. 이는 설치 소스 확인이며 실제 브라우저 실패 재현은 아니다. Estimate workspace-provider에는 beforeunload 보호가 있고, 확인한 Jev 소비 소스에서는 이를 찾지 못했다. 공통 route navigation으로 옮길 때 정상 렌더의 root store 유지와 document fallback 시 보존을 같은 보장으로 쓰면 안 되는 이유다.

### 배포 소스 대조

이 작업 worktree HEAD는 `6d15cbc376495779896aa428b3154a4a3f07ae7a`다. 프로젝트 디렉터리의 main이 실제 배포 소스와 같다고 가정하지 않았다.

| 대상 | 배포 identity 관측 | 대조 범위 |
| --- | --- | --- |
| Site | `9b3bea317bc482a834edc7cb57a0d84291d329b9`, UI 0.9.0 | 해당 git object의 `src/i18n/routing.ts`, `src/components/nav-wrapper.tsx`와 현재 worktree의 관련 동작을 확인했다. 작업 branch 전체가 배포물과 같다는 뜻은 아니다. |
| Jev | `8fa67de0d0a50132004d1c07a74f9cfc23e5db78`, UI 0.7.2 | `/Users/jaymini/.local/share/jev/app/.next/static/chunks/562-2d498661c31c4950.js`의 실제 query/storage/cookie 동작과 소비 소스를 대조했다. 배포 commit object는 로컬 main에 없다. |
| Estimate | `259f9e0a1f136fdc152f3089e813dd5b81395e80`, UI 0.7.2 | current release manifest와 `src/components/app-frame.tsx`, `src/app/layout.tsx` SHA256 일치. 운영 chunk에서도 ja 고정을 확인했다. 소비 복사본 `src/proxy.ts`는 manifest와 일치하지 않아 현행 경계의 최종 권위로 쓰지 않는다. |

Estimate 소스 대응: AppFrame `d6fdb8f9484e677f85936cd8ba1da0c88bc5f863f4b3e7a531779c30ec4e5470`, layout `68973cd56235faaf973bf01f2bc5554b75e6e5e499c3f13426b147c5aa17e6a0`. manifest 경로: `/Users/jaymini/.local/share/estimate-app/current/manifest.json`.

보완 확인한 소비 복사본은 `/Users/jaymini/.local/share/naeil-ui-rollout/consumers/{jev,estimate}`이고, 기존 관련 worktree는 `3tl6a87q/jev-account-language`, `1bnldk74/estimate-account-language`, `3qtenke4/deploy-integrate-20261025`다. 이 경로의 모든 파일이 현재 운영 버전이라는 주장은 하지 않는다. 구현 시작 시 해당 배포 기준의 정식 소스와 다시 연결해야 한다.

## 확인한 경계와 누락 방지점

- [현재 사이트 routing](../../../src/i18n/routing.ts), [NavWrapper](../../../src/components/nav-wrapper.tsx): 메인의 실제 언어 선택은 경로 전환이다.
- [사이트 proxy](../../../src/proxy.ts): service-return/invitation의 엄격한 경계가 일반 locale 처리보다 먼저다. 이를 전역 언어 리다이렉트로 덮으면 안 된다.
- [인증 return allowlist](../../../src/lib/auth/redirect.ts): 메인, Jev, Estimate의 정확한 origin만 허용한다. 언어 지원 때문에 wildcard로 넓힐 이유가 없다.
- [서비스 return](../../../src/lib/auth/service-return.ts): Home의 특정 Tailscale callback은 별도 계약이다. locale 처리와 합치지 않는다.
- [사이트 metadata](../../../src/lib/site-metadata.ts), [sitemap](../../../src/app/sitemap.ts): 실제 번역이 존재하는 언어만 canonical/hreflang에 넣는 구조를 유지한다.
- [NaeilHeader](../../../src/components/naeil-header.tsx), [NaeilFooter](../../../src/components/naeil-footer.tsx): 현재 기본 resolveHref는 en도 `/en`을 만든다. owned 소비자는 새 어댑터를 공급해 en을 `/`로 생성해야 한다. frozen/public compatibility 동작을 묵시적으로 바꾸지 않는다.
- Jev `src/lib/comparison/return-to.ts`는 정확한 루트와 제한된 query/hash만 허용한다. lang 중복/미지원값도 거부한다. 언어 정규화로 그 전에 잘못된 return URL을 정상화해 통과시키지 않는다.
- Estimate는 GuardedLink/NavigationGuard와 저장 실패 복구가 있다. 언어 변경 시 raw invalid 입력·revision·현재 편집 대상을 보존해야 한다. 일본어 auth fallback도 번역 범위다.
- Home은 자체 history/dirty guard가 있으므로 단순 `changeLanguage` 외에 query 동기화와 popstate 처리까지 맞아야 한다.

추가로 이 worktree에 설치된 next-intl 4.8.3의 `navigation/shared/syncLocaleCookie.js`와 `middleware/syncCookie.js`에서 `localeCookie: false`일 때 쓰기를 생략하는 분기를 확인했다. 기본 `alternateLinks`는 true다. 이것은 로컬 설치 코드 확인이며 운영 전체 버전의 브라우저 검증은 아니다. 블로그 page는 `getAlternateLanguagePosts`로 실제 번역만 metadata에 넣지만, middleware의 HTTP Link header도 같은 범위로 맞춰야 한다.

Opus 리뷰 뒤 `navigation/react-client/createNavigation.js`와 `navigation/shared/createSharedNavigationFns.js`도 직접 확인했다. 명시 `locale` 옵션은 `forcePrefix`를 켜므로 en 전환에 `/en`이 생성될 수 있다. 최종 설계의 canonical href를 다시 이 helper에 통과시키지 않는 이유다. 현재 worktree의 header catalog가 `/design` 하나라는 점도 확인했으며, 이를 모든 배포의 메뉴 구성으로 일반화하지 않는다. 실제 배포 링크 inventory가 인수 시험의 기준이다.

URL 통일안의 Opus 재검토 뒤 Estimate 소비 복사본의 `src/app/page.tsx`에서 `redirect('/estimates')`, `src/app/login/page.tsx`에서 접두사 없는 return 생성, `src/features/calendar-preview/projects.tsx`에서 하드코딩된 `router.push`를 직접 확인했다. 따라서 링크 외의 코드상 이동도 locale builder 범위다. 해당 파일의 운영 배포 일치 여부를 새로 입증한 것은 아니다. 메인의 `canonicalRedirect`는 정확한 세 origin과 기존 URI 방어를 유지하면서 경로를 수용하므로 새 locale 경로 때문에 allowlist를 변경할 필요가 없다는 점도 소스로 확인했다. 실행 시험은 하지 않았다.

## 전체 도메인 범위의 근거와 한계

[standing-services.json](../../rollout/standing-services.json)과 [inventory](../../rollout/inventory.md)의 최신 실행 범위는 메인·Jev·Estimate다. 메인 현재 route files에는 landing, login, projects, design, blog, blog/[slug]와 non-UI auth/API가 있다. `_archive`의 소스 존재만으로 활성 경로라고 판단하지 않는다.

과거 inventory에는 baby, trip, work, digest, line, esg도 나온다. trip/work/digest/line/esg는 폐기된 서비스이고 Baby는 이전 작업에서 별도 제품으로 제외됐다는 기록이다. 이번 조사는 DNS 전체를 새로 검증하지 않았다. 과거 rollout 제외를 이번 언어 요구의 영구 제외로 전용하지 않으며, 구현 첫 단계에 **현재 활성 owned UI origin/경로 전수 확인**을 둔다. 새로 확인된 필수 서비스도 같은 어댑터/번역/검증 계약에 포함한다. API·webhook·callback·폐기 호스트를 화면 언어 전환 대상으로 취급하지 않는다.
