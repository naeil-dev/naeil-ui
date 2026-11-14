# 공통 UI v2 사용 및 이전 안내

이 안내는 `@naeil/ui`의 기본 모양과 재사용 규칙을 설명한다. 패키지 소비와 소비 사이트 배포는 별도 작업이다.

Home API는 0.8.0부터, 공통 root 예약 기본값은 0.9.0부터 제공한다. 현재 게시 버전과 설치 명령은 [README](../../README.md#use-the-ui), 릴리스·hosted Docs·서비스별 기록은 [릴리스 정책](../package-release.md#publication-and-deployment)을 확인한다.

소유한 Next 서비스는 [공통 언어 런타임](../components/naeil-locale.md)의 `/naeil-locale`, `/client`, `/server`, `/messages`, `/checker`를 사용한다. `NaeilLocaleProvider` 안에서는 `NaeilServiceShell`·`NaeilThemeProvider`·`PageHeader`·계정 컨트롤을 `/naeil-locale/chrome`에서 가져온다. `/naeil-header`와 `/naeil-footer`는 독립 React 어댑터로 유지된다. 공유 server/client 경로에는 정확한 `next-intl@4.14.8`이 필요하다.

## 시작하기

React 19/ReactDOM 19와 Tailwind 4 앱에서 `/ui`를 사용하며, 소유 서비스의 독립 React 앱 틀은 `/naeil-shell`을 사용한다. 선택적 `/naeil-header`·`/naeil-footer`도 호환 API로 유지된다. 이 React 전용 경로에는 API 키와 Next.js가 필요 없다. 검증한 registry 버전을 고정해 설치한다.

```sh
pnpm add --save-exact @naeil/ui@VERSION
# VERSION은 README와 registry에서 확인한 정확한 게시 버전으로 바꾼다.
```

archive에 포함된 안내는 준비 시점의 기록이므로 현재 설치에는 이 유지보수 안내를 따른다. 로컬 개발에서는 저장소에서 `pnpm build:pkg`와 `npm pack --ignore-scripts --pack-destination /tmp`를 실행하고 출력된 archive를 설치한다. 현재 소스의 개발용 pack은 동결 릴리스 archive와 다를 수 있으므로 게시 파일을 대체하지 않는다. [독립 React 예제](https://github.com/naeil-dev/naeil-ui/tree/main/examples/react)와 [검증/릴리스 정책](../package-release.md)을 참고한다.

공통 UI 소비에는 Supabase, 21st 또는 다른 API 키가 필요하지 않다. React/ReactDOM 19는 소비 앱의 peer이며, Next 15/16과 next-intl 4는 호환 경로에 필요한 선택적 peer다. next-themes 0.4와 tailwind-merge 3은 공통 런타임 의존성으로 설치된다. 사이트의 Supabase·MDX·Three 의존성과 코드는 공통 소비 경계에서 제외했다.

버전을 생략한 설치는 registry의 latest 태그를 따른다. 업그레이드 전에 `npm view @naeil/ui dist-tags`와 [변경 기록](../../CHANGELOG.md)을 확인하고 검증한 정확한 버전을 고정한다.

Tailwind 4를 사용하는 앱의 전역 CSS에서 공통 스타일을 한 번 불러온다.

```css
@import "@naeil/ui/globals.css";
/* 소비 앱의 Tailwind 빌드가 패키지의 클래스도 찾도록 등록한다.
   경로는 이 CSS 파일의 위치를 기준으로 조정한다. */
@source "../node_modules/@naeil/ui/dist";
```

이미 Tailwind와 기본 스타일을 구성한 앱은 `@naeil/ui/theme.css`와 `@naeil/ui/components.css`를 함께 불러올 수 있다. 컴포넌트 CSS에는 크기·포커스·밀도·포털·reduced-motion 규칙이 있으므로 theme.css만으로 전체 v2 모양이 완성되지는 않는다.

0.9.0부터 두 CSS 경로의 `components.css`가 `html { scrollbar-gutter: stable }`과 Radix 이중 보상 제거를 제공한다. classic은 한쪽 공간을 예약하고 overlay는 0px이다. `<html data-naeil-scrollbar-gutter="auto">`를 첫 paint 전에 선언하면 root 예약과 lock 보정을 함께 끈다. theme-only/JS-only는 문서 정책을 바꾸지 않는다. 본문 바깥 여백/custom scroller/helper class는 별도 소비자 통합이나 opt-out이 필요하다. [채택된 계약](https://github.com/naeil-dev/naeil-ui/blob/434b7d07235316097ca3a55265ee02c1422b0cfd/docs/superpowers/specs/2026-10-29-page-root-scrollbar-gutter.md)과 [layout guide](../components/application-layout.md)의 비교·fallback·일본어 320px F3 wrap 규칙을 따른다.

CSS import를 `layer(ui)` 같은 named layer로 감싸지 않는다. 그러면 dependency의 unlayered `--removed-body-scroll-bar-size`가 이겨 classic에서 15px로 남을 수 있다. opt-out 후 `@layer base { html { scrollbar-gutter: stable; } }`는 패키지 attribute selector보다 약하므로, layer 밖에 `html[data-naeil-scrollbar-gutter="auto"] { scrollbar-gutter: stable; }`를 쓰거나 패키지 import 뒤의 같은 base layer에서 이 attribute selector를 쓴다. 이때 lock 보상은 소비자가 책임진다. Classic modal scrim은 예약된 gutter 띠를 덮지 않으며, 0.9.0에서 scrim 스타일을 바꾸지 않는다. 자세한 예시와 적용 범위는 [layout guide](../components/application-layout.md#width-contract)를 따른다.

```tsx
import { Button, Input, Select, SelectTrigger, SelectValue,
  SelectContent, SelectItem, Switch, Checkbox } from '@naeil/ui/ui';

<label htmlFor="language">언어</label>
<Select name="language" defaultValue="ko">
  <SelectTrigger id="language"><SelectValue /></SelectTrigger>
  <SelectContent>
    <SelectItem value="ko">한국어</SelectItem>
    <SelectItem value="en">English</SelectItem>
  </SelectContent>
</Select>
```

Select는 값 선택, DropdownMenu는 행동 선택에 사용한다. Switch와 Checkbox는 보이는 label과 연결하고, 여러 선택 항목의 클릭 영역이 겹치지 않도록 최소 44px 행과 여유 간격을 둔다. `ui-choice-label`을 사용할 수 있다.

## 기본 규칙

- 본문·입력·버튼 16px, 보조 14px, 메타정보 13px. 작은 화면에서도 입력 글씨를 줄이지 않는다.
- 기본 컨트롤 높이 40px. 문서 루트에 `data-ui-density="compact"`를 주면 36px가 된다. 작은 화면과 거친 포인터에서는 최소 44px를 유지한다. 데스크톱에서 `className="h-8"` 같은 높이 재정의는 적용되며, 모바일의 44px 최소 터치 크기는 유지된다.
- `.light`/`.dark`는 OS 테마보다 우선한다. 소유 서비스와 naeil.dev는 루트 `NaeilThemeProvider`를 사용한다. 기존 `ThemeProvider` API는 범용·레거시 구성에서 유지된다.
- 공통 바깥 틀은 최대 1600px, 좌우 여백은 `clamp(16px, 2.4vw, 40px)`다. 소유 서비스는 셸이 본문 프레임을 적용하며 앱에서 `.ui-app-frame`을 추가하지 않는다. 범용 구성의 본문 `.ui-app-frame`과 공통 헤더·푸터 내부 프레임도 같은 토큰을 사용한다.
- `data-ui-layout="reading|settings|list|short-form|workflow|fluid"`로 내부 콘텐츠 폭을 적용한다. 각각 최대 640/640/1600/480/896px 또는 가용 폭이다. `workflow`(2026-11-09 승인)는 단계형·카드 선택형 입력 화면용이며, 그 안의 개별 입력 필드는 계속 640/480px 이하로 둔다. 목록은 바깥 틀의 여백을 제외한 공간을 사용하고, 설정·읽기 영역은 그 안에서 좁게 유지한다.
- 레이블·도움말·오류 문구는 소비 화면이 연결한다. Input의 `aria-invalid`와 `aria-describedby`를 사용하고, 로딩 중에는 Button의 `disabled`와 `aria-busy`를 함께 지정한다.
- 성공·경고·오류·안내에는 Badge의 `success`, `warning`, `error`, `info` variant를 사용할 수 있다. 색만으로 의미를 전달하지 않는다.

## 브라우저 탭 제목과 파비콘

2026-10-13 승인한 공통 브랜드·콘텐츠 규칙이며, 2026-10-14 사용자 요청으로 naeil.dev의 서비스명을 `.naeil`로 통일했다. 2026-11-13 사용자 결정으로 소유 서비스의 이름을 헤더와 같은 `.naeil <service>`로 바꾸고, 파비콘과 풋터를 다섯 곳에서 통일했다. 기준은 [DESIGN.md의 Browser identity](../../DESIGN.md#browser-identity--tab-title-and-favicon)이며, 브라우저 탭의 글꼴·크기는 브라우저가 결정한다.

| 화면 | 탭 제목 예시 |
| --- | --- |
| naeil.dev 홈 | `.naeil` |
| Home 홈/소개 화면 | `.naeil home` |
| Home 대시보드 | `대시보드 — .naeil home` |
| Home API 키 관리 | `API 키 — .naeil home` |
| naeil.dev 프로젝트 목록 | `프로젝트 — .naeil` |
| Home 영문 대시보드 | `Dashboard — .naeil home` |
| Estimate 견적 목록(일본어) | `見積一覧 — .naeil estimate` |
| AB Storm 새 검토 | `새 검토 — .naeil abstorm` |

- 이름이 있는 페이지는 `페이지 이름 — 서비스 이름`으로 작성한다. 구분자는 양옆 공백이 있는 em dash(` — `)이며, 서비스 이름은 한 번만 붙인다.
- 서비스 홈/소개 화면은 서비스 이름만 사용할 수 있다. 대시보드처럼 이름이 있는 업무 화면은 첫 진입 경로이더라도 페이지 이름을 포함한다.
- 서비스 이름은 헤더 브랜드와 같다. naeil.dev는 `.naeil`, 소유 서비스는 `.naeil home`·`.naeil estimate`·`.naeil abstorm`·`.naeil jev`다. 앞의 마침표까지 공식 이름이며 언어와 무관하게 소문자 그대로 쓴다. 이름은 패키지가 service id로 정한다. Next 앱은 `@naeil/ui/naeil-locale/server`의 `localeMetadata`에서 `serviceName`을 생략하고, 제목을 직접 조립해야 하면 `naeilDocumentTitle(service, page)`를 쓴다. Next 서버 코드는 서버 안전 경로 `@naeil/ui/naeil-locale`에서, Next가 아닌 React 앱은 `@naeil/ui/naeil-header`에서도 가져올 수 있다. `serviceName`은 0.14.0부터 deprecated이며 호환을 위해 넘긴 값은 그대로 쓰지만 소유 서비스는 넘기지 않는다.
- 페이지 이름은 현재 UI 언어에 맞춰 번역하고, 서비스 이름의 대소문자·띄어쓰기는 언어가 바뀌어도 유지한다. 본문 제목이나 글 제목을 사용해 현재 화면을 식별할 수 있게 한다.
- 다섯 곳 모두 브랜드 키트 `brand/naeil/1.1.1/icons/`의 같은 `.naeil` 파비콘을 모든 경로에서 쓴다. 파일은 수정 없이 복사하고 `naeilIcons.files`의 SHA-256과 대조한다. Next 앱은 파일 규약을 따른다: `app/favicon.ico` ← `favicon.ico`, `app/icon.svg` ← `favicon.svg`, `app/apple-icon.png` ← `apple-touch-icon.png`(naeil.dev의 `pnpm build:brand`와 같은 대응). `src/app/`도 지원하며 metadata `icons`나 별도 icon link는 추가하지 않는다. Vite 앱은 같은 세 파일을 `public/`에서 루트 경로로 제공하고 `naeilIcons.links`와 같은 속성·순서로 연결한다. [아이콘 선언과 전체 규칙](../components/naeil-shell.md#browser-identity)을 따른다. 이전 서비스별 아이콘(예: Estimate의 `favicon.svg`)은 제거한다. 공용 locale 오류 문서는 `/icon.svg`를 링크한다. 키트와 고해상도 PNG는 npm 패키지에 넣지 않으며 파일 제공·manifest·배포는 서비스가 관리한다.

Next.js 소비자는 layout의 metadata title 기본값/템플릿과 페이지별 title을 연결하고, 일반 React 앱은 라우터의 페이지 메타데이터에서 같은 규칙으로 document.title을 설정한다. 제목 조립은 한 곳에서 담당해 `API 키 — .naeil home — .naeil home`처럼 중복되지 않게 한다. Navigation이나 Logo 렌더링에 문서 제목 변경을 숨겨 넣지 않는다.

적용 확인은 실제 브라우저에서 홈·하위 페이지의 직접 진입, 클라이언트 경로 이동, 뒤로 가기, 언어 전환 후 제목과 파비콘을 확인한다. 제목은 현재 페이지와 일치하고 서비스 접미사가 중복되지 않아야 하며, 파비콘 파일 요청도 성공해야 한다. 이 문서 변경은 규칙 등록이며 기존 naeil.dev/Home의 메타데이터 수정·배포 완료를 의미하지 않는다.

## 페이지 리듬·테마·기본 글자 (0.15.0)

2026-11-14 사용자 결정: 소유 서비스는 `NaeilServiceShell` + 루트 `NaeilThemeProvider`를 사용하고 CI에서 `naeil-ui-conformance`를 실행한다. standalone React는 `@naeil/ui/naeil-shell`, `NaeilLocaleProvider` 안의 Next 서비스는 `@naeil/ui/naeil-locale/chrome`를 사용한다. 루트의 기존 theme provider를 교체한다. 중첩 provider는 next-themes에서 무시된다.

naeil.dev는 `service` 없는 카탈로그 헤더·기존 푸터 구성을 유지하고 루트 provider만 `NaeilThemeProvider`로 교체한다. 소유 서비스용 셸로 바꾸지 않는다.

셸이 skip link, 헤더, 고정 `main#main`의 `.ui-app-frame ui-app-main`, 전체 풋터를 소유한다. `PageHeader`로 페이지를 시작하며 제목 32/42 600, 제목→설명 12px, PageHeader→콘텐츠 32px, 페이지 위 48px/아래 96px를 유지한다. CSS는 16px 기본 본문, provider는 다크 기본값·저장된 선택·시스템 옵션을 공급한다. 목적별 `data-ui-layout`은 main 안에 둔다. class/style/id/data/theme 속성이나 예약 셀렉터로 공통 틀을 바꾸지 않는다. `header`에는 서비스 메뉴·인증·언어 상태를, 셸의 `Link`/`onNavigate`에는 공통 라우팅 guard를 전달한다. `footer`는 `meta`/`resolveHref` 또는 사유를 기록한 `false`만 허용한다.

아이콘과 제목 함수는 서버 안전 `@naeil/ui/naeil-locale`에서 가져온다. `naeilIcons`의 생성된 digests/links에 맞는 세 파일을 제공하며 Next metadata `icons`나 `localeMetadata`의 `serviceName`을 재정의하지 않는다. Vite `index.html` 제목은 `naeilServiceName(service)`, 아이콘 link는 `naeilIcons.links`와 같아야 한다. 키트 bytes는 npm에 들어가지 않는다.

```sh
naeil-ui-conformance --service estimate --framework next --app .
naeil-ui-conformance --service estimate --url http://127.0.0.1:4173 --routes /en/estimates,/login --no-footer /login
# Vite: --framework vite
```

CLI는 theme/chrome/rhythm/icons/titles 규칙, 파일 SHA-256과 선언 순서를 검사하고 위반 시 1로 종료한다. 예외는 위반 바로 위 `naeil-conformance-ignore <rule>: <reason>` 주석으로 남기며 모든 예외가 보고된다. [API·override 정책·전체 규칙](../components/naeil-shell.md)을 따르고 실제 브라우저에서 같은 화면 크기·언어·테마와 로그인 상태도 확인한다.

## 앱 전체 틀과 콘텐츠 폭

소유 서비스는 `NaeilServiceShell`에 `service`·현재 언어·라우팅/저장 guard를 전달한다. 셸이 공통 헤더와 전체 푸터를 구성하므로 앱에서 `NaeilHeader`·`NaeilFooter` JSX를 직접 조합하지 않는다. `header.authSlot`에는 `NaeilHeaderAccountControl`을 두고 실제 세션 상태·busy·guarded logout 콜백을 전달한다. pending 상태와 요청 잠금은 셸 위에서 소유해 데스크톱/모바일 슬롯이 공유한다. 언어 변경을 지원하지 않으면 `header.onLocaleChange`를 생략한다. 전체 프로젝트 메뉴·컨트롤·반응형 스타일과 canonical 푸터 목적지를 복사하지 않는다. [셸 계약](../components/naeil-shell.md), [헤더 계약](../components/naeil-header.md), [푸터 계약](../components/naeil-footer.md)을 참조한다. 독립 헤더·푸터 API는 naeil.dev 카탈로그와 기존 호환 구성에 남는다.

2026-10-16 승인한 기본 프레임은 최대 1600px(여백 포함), 좌우 `clamp(16px, 2.4vw, 40px)`다. 브랜드 헤더·범용 Navigation·SiteFooter·본문 프레임이 `--ui-width-frame`, `--ui-frame-gutter`를 함께 사용한다. 소유 서비스는 셸이 고정 헤더 65px의 main 여유를 적용하므로 별도 페이지 패딩을 더하지 않는다. 소비 앱의 sticky 영역과 초점/anchor 이동은 고정 헤더 높이를 고려한다. 카탈로그 헤더의 공식 장식 이미지 URL에는 네트워크가 필요하다. 이미지 바이트는 npm에 포함하지 않으며 재배포 출처·권리 미해결 사항은 [제3자 고지](../../THIRD_PARTY_NOTICES.md)에 유지한다.

다른 제품 메뉴에는 `@naeil/ui/ui`의 범용 `Navigation`과 `SiteFooter`를 조합하고 제품 메뉴 데이터·번역·폭을 소유한다. 기존 `Nav`·`Footer`는 Next/next-intl 호환 API를 유지한다. [범용 API와 마이그레이션 안내](../components/navigation.md)를 참조한다. Naeil Home 운영 적용은 아직 완료되지 않았으며 저장소의 `docs/design/navigation-footer-integration.md`에서 추적한다.

앱의 공통 헤더·메뉴·좌우 여백과 본문의 읽기/설정/목록 폭은 별도로 관리한다. 같은 앱 틀을 사용하는 페이지는 같은 화면 크기·언어·테마에서 메뉴 위치가 유지되어야 한다. 설정 폼을 640px로 제한할 때 헤더까지 그 폭에 종속시키지 않는다. 변동하는 계정 수·상태 요약도 메뉴를 밀어내지 않도록 배치한다.

아래는 범용 `Navigation`·`SiteFooter`를 사용하는 다른 제품의 예제다. 소유 서비스는 [Application layout의 셸 예제와 소비 앱용 AGENTS.md 규칙](../components/application-layout.md#canonical-naeil-application-starter)을 따른다. 공통 헤더·푸터는 내부에 프레임이 있으므로 다른 패딩 컨테이너로 다시 감싸지 않는다. `items`, `pathname`, `ProductControls`는 제품이 제공한다.

```tsx
import { Navigation, SiteFooter } from "@naeil/ui/ui";

<>
  <Navigation brand={<a href="/">My product</a>}
    items={items} currentHref={pathname} toolbar={<ProductControls />}
    labels={{ navigation: "주 메뉴", menu: "메뉴", close: "닫기" }} />
  <main className="ui-app-frame">
    <section data-ui-layout="settings">{/* 설정 폼 */}</section>
  </main>
  <SiteFooter variant="compact" meta="Product information" />
</>
```

```css
/* 범용·레거시 구성의 의도적인 제품 예외: 세 영역의 공통 조상에서 적용한다. */
.product-shell {
  --ui-width-frame: 1280px;
  --ui-frame-gutter: 24px;
}
```

이번 1600px는 사용자가 Naeil Home의 실제 폭을 비교한 뒤 공통 기본값으로 선택한 결정이다. 1920px 화면에서는 여백을 제외한 영역이 1520px다. 실제 과업·정보량·짧은/긴 내용으로 내부 구성을 판단한다. 내부 카드·보고서 열 수는 모니터 폭보다 실제 콘텐츠 영역 폭에 맞추며, 필요한 경우 container query를 사용한다.

이전 1280px 헤더·24px 여백과 1200px 목록 기본값이 변경된다. 새 기본값을 적용할 때 기존 `max-w-7xl`·`px-6` 프레임 재정의를 제거한다. 범용·레거시 구성이 기존 레이아웃을 유지해야 하면 위 프레임 토큰 및 `--ui-width-list: 1200px`를 명시할 수 있다. 소유 서비스 셸은 조상·예약 셀렉터를 통한 프레임 재정의도 허용하지 않으며 목적별 콘텐츠 폭은 main 안에서 적용한다. 기존 공개 import·props·일반 컴포넌트의 className 재정의는 유지되지만 셸의 보호된 프레젠테이션 계약에는 적용되지 않는다. 설치된 패키지와 CSS를 먼저 확인하고, 메뉴·모바일 시트·푸터 구현을 복사하는 대신 공통 API와 슬롯으로 연결한다.

레이아웃 수정의 검증 기준:

- 주요 경로를 같은 조건에서 비교한다. 메뉴 좌표와 여백, 제목·행동의 정렬을 확인하고 의도적인 차이는 이유를 남긴다.
- 제품이 지원하는 언어, 긴 이름, 적은/많은 데이터, 영향을 받는 로딩·오류 상태를 포함한다. 공유 컴포넌트 예시는 기존 한글·영문·일문 기준을 유지한다.
- 인증 전·후, 계정 메뉴, 로그아웃 busy·취소·실패·재시도를 확인한다. pending 중 모바일 메뉴 재열기나 화면 폭 변경으로 중복 요청이 발생하지 않아야 한다. 익명 화면만으로 인증된 헤더의 일치를 주장하지 않는다.
- 페이지 넘침과 함께 표 내부 잘림·줄바꿈·조작 영역을 확인한다. 내부 스크롤 자체를 페이지 넘침과 혼동하지 않는다.
- 기능 검사, 공통 기준 준수, 실제 화면 구성을 별도로 기록한다. 기존 대비·중첩 조작·터치 크기 문제는 현재 증거가 생기기 전까지 미해결로 남긴다.

복사한 CSS를 사용하는 소비 앱은 원본 리비전·수정 사항·동기화 책임을 기록한다. 공통 패키지 직접 사용과 같은 수준의 자동 반영을 주장하지 않는다.

## 폰트

공통 CSS는 외부 서버에서 폰트를 자동 다운로드하지 않는다. 소비 앱이 Pretendard를 직접 호스팅하거나 자신의 로더로 전달한다. 일본어에는 Noto Sans JP를 제공하고 필요한 글자/굵기만 로드한다. 로딩 실패 시 시스템 글꼴로 표시된다.

소비 앱에서 로컬 번들 폰트를 사용하려면 다음과 같이 설치하고 앱 진입점에서 필요한 굵기를 불러올 수 있다.

```sh
pnpm add --save-exact pretendard@1.3.9 @fontsource/noto-sans-jp@5.3.0
```

```tsx
import 'pretendard/dist/web/static/pretendard.css';
import '@fontsource/noto-sans-jp/400.css';
import '@fontsource/noto-sans-jp/500.css';
import '@fontsource/noto-sans-jp/600.css';
```

일본어 영역에 `lang="ja"`를 지정하면 globals의 일본어 font-family 규칙이 적용된다. 재배포 빌드에는 [폰트 OFL 고지](../../THIRD_PARTY_NOTICES.md#fonts)를 유지한다. 패키지 자체에는 폰트 런타임 의존성을 추가하지 않았다.

Storybook의 로컬 폰트 import는 예시다. 그대로 앱 전역에 모든 굵기·언어 폰트를 복사할 필요는 없다. 폰트를 바꾸면 줄바꿈과 밀도를 다시 확인한다. 코드용 폰트는 기존 fallback 체계를 유지한다.

## 바뀌는 점과 호환성

기존 root, `/ui`, `/utils`와 공통 컴포넌트 이름을 유지한다. 깊은 경로는 아래의 명시적 허용 목록에 있는 공통/호환 모듈만 배포된 JS와 타입으로 연결한다. 열린 wildcard 선언은 제거하며, 사이트 전용 경로별 이전 방법을 아래 표에 기록했다. Select·Switch·Checkbox와 `/components.css`는 추가 API다.

기본 색·글자·컨트롤 크기·모서리·움직임이 바뀐다. 기존에 작은 높이를 가정한 고정 레이아웃은 확인해야 한다. Button의 기존 size 이름은 유지하되 v2의 읽기/터치 기준에 맞춘다. 명시적인 `className`은 소비 화면이 책임지는 예외이며 너무 작은 높이나 낮은 대비로 기본 규칙을 깨지 않도록 한다.

공통 globals에서 사이트 전용 float 애니메이션을 분리했다. 저장소의 사이트는 로컬 `src/app/globals.css`에서 이를 계속 정의한다. 다른 소비자가 `animate-float`에 의존했다면 자기 사이트 스타일로 명시적으로 옮긴다.

## 개별 컴포넌트 안내

[컴포넌트 사용 안내](../components/README.md)는 13개 primitive와 Navigation·SiteFooter·NaeilFooter·전체 NaeilHeader 및 계정 컨트롤의 실제 API·기본값, 키보드, 상태, 레이블·오류 연결, 재정의 책임을 설명한다. Storybook 소스는 UI 15개와 Brand 2개, 총 17개 Docs를 제공한다. canonical 푸터 전체/축약형과 계정 상태는 기존 NaeilHeader/SiteFooter stories에 포함된다. 각 `Docs`·`Usage`와 `Brand / NaeilHeader / JapaneseApplication, ReferenceFull, ReferenceCompact, AccountStates`에서 안내와 실행 예시를 확인한다. 이는 새 hosted Docs 배포 완료를 뜻하지 않는다. [지원 범위와 수동 점검](public-ui-support.md)은 자동 검사와 실제 보조 기술·운영체제 검증의 차이를 기록한다.

## 확인 방법

- `pnpm storybook`: 실제 공개 컴포넌트의 `UI v2 / Workspace` 화면.
- `pnpm build:tokens`, `pnpm check:contrast`: 실제 배포 CSS와 대비 확인.
- `pnpm test`, `pnpm build:storybook`, `pnpm test:browser`: 규칙, 키보드, 상태, 모바일, 자동 접근성 확인.
- `pnpm build:pkg`, `pnpm check:package`: 실제 tarball 경계와 독립 React/Next 소비 예시 확인.

자동 검사와 HTML 시안만으로 모든 소비 화면의 품질을 보장하지 않는다. 실제 앱에서 긴 문장·테마·포커스·오류 상태를 확인한다. DESIGN.md의 선택한 방향을 우선하고 외부 예시는 부족한 부분만 보완한다.

## 0.3 package boundary

The heading retains the original 0.3 migration anchor; the boundary below includes published and registry-verified 0.7.1. `/ui` is the React core. Opt-in `/naeil-header` provides the canonical complete branded header and `NaeilHeaderAccountControl`; `/naeil-footer` provides canonical full/compact footers. Both are React-only. `/release` exports server-safe `uiRelease` metadata, without application artifact or environment data. Root imports preserve Nav, Footer, Logo, LocaleSwitcher, ThemeProvider, ThemeToggle, ThemeToggleIcon, PageTitle, SectionTitle and their class helpers, but root has static Next/next-intl dependencies. React-only apps must use the dedicated entries and appropriate shared deep modules. `next-themes` is a React runtime library; it does not require Next.js. Fonts remain consumer-owned.

Next.js `^15 || ^16` and next-intl `^4` are optional peers. Install both when using root, Nav, Footer or `i18n/routing`. This is an existing compatibility contract, not a claim that every peer combination has browser validation; the clean Next fixture checks Next 16.1.7. React/ReactDOM `^19` come from the host. Tailwind 4 is the documented styling pipeline. Explicit `className`, Radix props, Toaster options and compatibility theme-provider props remain consumer overrides on APIs that support them. This does not grant presentation/theme overrides to `NaeilServiceShell` or `NaeilThemeProvider`.

The compiled deep import allowlist is exact (prefix each with `@naeil/ui/`):

```text
components/index
components/ui/index
components/ui/avatar
components/ui/badge
components/ui/button
components/ui/card
components/ui/checkbox
components/ui/dialog
components/ui/sheet
components/ui/dropdown-menu
components/ui/input
components/ui/navigation
components/ui/site-footer
components/ui/select
components/ui/sonner
components/ui/switch
components/ui/tabs
components/ui/textarea
components/nav
components/footer
components/logo
components/locale-switcher
components/theme-provider
components/theme-toggle
components/theme-toggle-icon
components/typography
lib/utils
i18n/config
i18n/routing
```

**Server Components:** `@naeil/ui/ui` remains a client component barrel; do not call its `buttonVariants` or `badgeVariants` exports on the server. Use `@naeil/ui/components/ui/button` and `@naeil/ui/components/ui/badge` for those server-side helper calls. Both `@naeil/ui/utils` and `@naeil/ui/lib/utils` provide RSC-safe `cn`.

`components/index` has the same framework requirements as root. `/utils` and `lib/utils` remain aliases for `cn`. `i18n/config` preserves the compatibility locale names; products may instead own their locale list and routing. There are no open-ended component/lib/i18n export patterns. Root, `/ui`, `/utils`, `/theme.css`, `/globals.css` and `/components.css` remain public. `/naeil-header`, `/naeil-footer` and `/release` are explicit dedicated entries; they do not create open-ended component export patterns.

These source paths are not package entries: website-only paths belong to the brand/example website, and unused ones may be removed without a package API change. Move any local-source consumer use into the consumer application before upgrading:

| Previously declared source path | Ownership/migration |
| --- | --- |
| `components/nav-wrapper`, `components/nav-server-wrapper` | Owned services use `NaeilServiceShell`; naeil.dev's catalog can use `/naeil-header`, and existing Nav adapters remain compatible. Your app loads users/sessions. |
| `components/footer-wrapper` | Owned services use the shell's footer; existing compatibility compositions can use preserved Footer with the app's Link. |
| `components/auth-slot` | The app owns session state and guarded logout above the shell. Owned services put `NaeilHeaderAccountControl` from `/naeil-header` (or provider-backed `/naeil-locale/chrome`) in `header.authSlot`; legacy custom Nav slots remain compatible. |
| `components/hero-scene`, `components/hero-section`, `components/paraglider-cursor` | Website scene/cursor source, assets and Three dependencies stay website-owned. |
| `components/project-layout`, `components/workflow-diagram`, `components/accent-picker` | Website showcase/data/theme editing composition; use shared primitives in product-owned compositions. |
| `components/blog/MarkdownRenderer`, `lib/blog` | Application-owned content rendering, filesystem and MDX/remark pipeline. |
| `lib/supabase/client`, `lib/supabase/server`, `lib/supabase/middleware` | Application-owned Supabase clients, environment, cookies and authentication. |
| `lib/auth/avatar`, `lib/auth/cookie-domain`, `lib/auth/redirect`, `lib/auth/routes` | Application-owned identity, cookie and protected-route policies. |
| `lib/axe` | Development-only accessibility initialization; configure your own tooling. |
| `i18n/request` | Application-owned `next-intl/server` request config and messages; keep compatible config/routing only if useful. |

npm 0.2.0 declared wildcard source paths but its actual tarball omitted those targets. Repository source aliases and unpublished local builds could nevertheless use them. This explicit migration documents both cases rather than silently treating the broad declaration as a stable working API. Unknown paths now fail at package exports instead of reaching website internals.

The reachable Next consumer's observed deep imports (Nav, Footer, ThemeProvider, ThemeToggleIcon, LocaleSwitcher) remain supported. Its old Tailwind `@source` paths scan `src/components`/`src/lib`; update them to `node_modules/@naeil/ui/dist` relative to the consumer CSS file and import shared component CSS. Site assets/messages and authentication are supplied by the application. This repository does not automatically modify or upgrade that consumer. The copied-UI consumer currently uses locally copied primitives, so publishing a new package will not update those copies.

## Demand-led extension

Version 0.3.0 also adds `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` and `Textarea` to `/ui`, plus exact `components/ui/tabs` and `components/ui/textarea` deep entries. Existing root stays the brand/framework barrel. No new dependency or existing default is changed. See the [component index](../components/README.md), [Tabs defaults/mount responsibilities](../components/tabs.md), [native Textarea contract](../components/textarea.md), [field/native-radio composition](../components/composition.md), and [demand decision](component-demand.md). Publishing does not update consumers that use locally copied primitives.


## Brand Logo integration (0.4.0)

Version 0.4.0 connects the approved **brand 1.1.1** to the shared components. It is not a claim that npm 0.3.0 already contains the new logo. Package publication and consumer upgrades remain separate.

```tsx
// React-only, no Next.js peer required for this deep import:
import { Logo, type LogoProps } from '@naeil/ui/components/logo';

<Logo size={32} />
<Logo variant="horizontal" size={28} />
<Logo variant="footer" size={20} />
<Logo tone="gray" size={40} />
<Logo variant="horizontal" size={28} theme="dark" />
<a href="/" aria-label="naeil 홈"><Logo size={28} label={null} /></a>
```

Root and `components/index` continue to export Logo; root still has the existing Next/next-intl compatibility peers. `LogoProps` is also exported. No brand export is added to `/ui`.

- `size` remains the rendered height, default 20px. Default `variant="symbol"` remains square. The 16–48px symbol uses the reviewed small artwork; larger symbols use the detailed source. `horizontal`, `footer`, `stacked` and `wordmark` preserve their aspect ratio. Header height 28px and footer height 20px are recommended. For stacked use a minimum height of 140px (160px width).
- `className`, standard SVG props and consumer style overrides are retained. Avoid stretching width and height independently. Artwork contains paths, not text or external images; Lato installation is unnecessary.
- `theme="auto"` follows the nearest `.light`, `.dark`, `data-theme="light"` or `data-theme="dark"` ancestor, with OS preference as fallback. It uses embedded SVG CSS and React useId, so SSR markup does not branch on browser state. For strict CSP or manual control, provide `theme="light"` or `theme="dark"`; that form emits no theme style element. Multiple independently hydrated React roots should use distinct React identifierPrefix values as usual.
- `tone="color"` is default. `tone="gray"` uses the selected grayscale A, including islands. Existing `mono` remains a **single currentColor silhouette** for compatibility; its one-ink shape loses the internal sun/island distinction. It is not the preferred grayscale version or a separately approved print master. `mono` takes precedence over tone/theme colors.
- Default accessible name is naeil with role=img. Use `label={null}` for decorative use and name the enclosing link/button. `aria-label` and other standard SVG attributes remain consumer overrides.
- Nav now uses the horizontal wordmark at 28px; Footer uses the footer lockup at 20px. Their official visible spelling remains `.naeil`: the period marks an ending, followed by tomorrow. Nav's `brandSlot`, brandHref, external/internal links, layout frame and other slots are preserved. Check custom layouts on upgrade because the new artwork has a different width.

The independent kit lives in the repository's `brand/naeil/1.1.1/` directory with its own usage guide, SVG/PNG/icons, OFL and checksums, and is available as a [verified release ZIP](https://github.com/naeil-dev/naeil-ui/releases/download/v0.4.0/naeil-brand-1.1.1.zip). Copy it for non-React uses without installing @naeil/ui. It is intentionally not copied into the npm tarball. The package carries only generated React artwork and the [Lato notice](../../licenses/Lato-OFL.txt). A favicon is application-owned: Next file conventions can use the kit's favicon.ico, favicon.svg and apple-touch-icon.png; each consumer chooses its own app manifest and deployment.

Maintainers run `pnpm build:brand` after explicitly selecting a reviewed version in `brand/current.json`, then `pnpm check:brand`. Package/Storybook builds check that generated artwork, notices and this site's icon files match that version. Shared color tokens and Pretendard do not change. In Storybook, **Brand / Logo / Docs, Usage, Application** demonstrates the actual adapter, canonical SVG comparisons and Nav/Footer composition.
