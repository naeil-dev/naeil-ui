# 공통 UI v2 사용 및 이전 안내

이 변경은 `@naeil/ui`의 기본 모양과 재사용 규칙을 개선한다. 패키지를 게시하거나 소비 사이트에 자동 배포하지 않는다.

## 시작하기

공통 UI 소비에는 Supabase, 21st 또는 다른 API 키가 필요하지 않다. React 19와 Tailwind 4를 기준으로 한다. 현재 manifest의 peer는 React/React DOM 19, Next 15 또는 16, next-intl 4, next-themes 0.4, tailwind-merge 3이다. `@naeil/ui/ui`는 일반 primitive 진입점이며, Next/i18n을 쓰는 브랜드 컴포넌트와 기존 deep import 계약은 별도로 확인한다. 패키지 의존성 경계가 축소됐다고 주장하지 않는다.

`pnpm add @naeil/ui`로 게시된 버전을 설치하거나 저장소에서 `pnpm build:pkg` 후 `pnpm pack --pack-destination /tmp`로 만든 tarball을 소비 앱에 설치한다. manifest 버전만으로 npm 게시 여부를 판단하지 않는다.

Tailwind 4를 사용하는 앱의 전역 CSS에서 공통 스타일을 한 번 불러온다.

```css
@import "@naeil/ui/globals.css";
/* 소비 앱의 Tailwind 빌드가 패키지의 클래스도 찾도록 등록한다.
   경로는 이 CSS 파일의 위치를 기준으로 조정한다. */
@source "../node_modules/@naeil/ui/dist";
```

이미 Tailwind와 기본 스타일을 구성한 앱은 `@naeil/ui/theme.css`와 `@naeil/ui/components.css`를 함께 불러올 수 있다. 컴포넌트 CSS에는 크기·포커스·밀도·포털·reduced-motion 규칙이 있으므로 theme.css만으로 전체 v2 모양이 완성되지는 않는다.

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
- `.light`/`.dark`는 OS 테마보다 우선한다. 기존 ThemeProvider를 사용할 수 있다.
- `data-ui-layout="reading|settings|list|short-form|fluid"`로 콘텐츠 폭을 적용한다. 각각 최대 640/640/1200/480px 또는 가용 폭이다. 이 속성은 전체 앱의 레이아웃을 강제하지 않는다.
- 레이블·도움말·오류 문구는 소비 화면이 연결한다. Input의 `aria-invalid`와 `aria-describedby`를 사용하고, 로딩 중에는 Button의 `disabled`와 `aria-busy`를 함께 지정한다.
- 성공·경고·오류·안내에는 Badge의 `success`, `warning`, `error`, `info` variant를 사용할 수 있다. 색만으로 의미를 전달하지 않는다.

## 앱 전체 틀과 콘텐츠 폭

앱의 공통 헤더·메뉴·좌우 여백과 본문의 읽기/설정/목록 폭은 별도로 관리한다. 같은 앱 틀을 사용하는 페이지는 같은 화면 크기·언어·테마에서 메뉴 위치가 유지되어야 한다. 설정 폼을 640px로 제한할 때 헤더까지 그 폭에 종속시키지 않는다. 변동하는 계정 수·상태 요약도 메뉴를 밀어내지 않도록 배치한다.

아래는 소비 앱의 구성 예이며 새 패키지 API가 아니다. `product-frame`과 최대 폭·여백은 제품에서 소유하고 정한다. 공통 숫자 토큰은 `src/tokens/*.json`을 기준으로 한다.

```tsx
<>
  <header>
    <div className="product-frame"><ProductNavigation /></div>
  </header>
  <main className="product-frame">
    <section data-ui-layout="settings">{/* 설정 폼 */}</section>
  </main>
</>
```

```css
/* 제품이 결정한 --product-frame-max, --product-gutter를 사용한다. */
.product-frame {
  box-sizing: border-box;
  width: 100%;
  max-width: var(--product-frame-max, 100%);
  margin-inline: auto;
  padding-inline: var(--product-gutter, 0);
}
```

대시보드라는 이유만으로 전체 폭을 쓰거나, 다른 제품의 1600px를 공통 기준으로 가져오지 않는다. 실제 과업·정보량·짧은/긴 내용으로 폭을 판단한다. 내부 카드·보고서 열 수는 모니터 폭보다 실제 콘텐츠 영역 폭에 맞춘다. 필요한 경우 container query를 사용한다.

레이아웃 수정의 검증 기준:

- 주요 경로를 같은 조건에서 비교한다. 메뉴 좌표와 여백, 제목·행동의 정렬을 확인하고 의도적인 차이는 이유를 남긴다.
- 제품이 지원하는 언어, 긴 이름, 적은/많은 데이터, 영향을 받는 로딩·오류 상태를 포함한다. 공유 컴포넌트 예시는 기존 한글·영문·일문 기준을 유지한다.
- 페이지 넘침과 함께 표 내부 잘림·줄바꿈·조작 영역을 확인한다. 내부 스크롤 자체를 페이지 넘침과 혼동하지 않는다.
- 기능 검사, 공통 기준 준수, 실제 화면 구성을 별도로 기록한다. 기존 대비·중첩 조작·터치 크기 문제는 현재 증거가 생기기 전까지 미해결로 남긴다.

복사한 CSS를 사용하는 소비 앱은 원본 리비전·수정 사항·동기화 책임을 기록한다. 공통 패키지 직접 사용과 같은 수준의 자동 반영을 주장하지 않는다.

## 폰트

공통 CSS는 외부 서버에서 폰트를 자동 다운로드하지 않는다. 소비 앱이 Pretendard를 직접 호스팅하거나 자신의 로더로 전달한다. 일본어에는 Noto Sans JP를 제공하고 필요한 글자/굵기만 로드한다. 로딩 실패 시 시스템 글꼴로 표시된다.

Storybook의 로컬 폰트 import는 예시다. 그대로 앱 전역에 모든 굵기·언어 폰트를 복사할 필요는 없다. 폰트를 바꾸면 줄바꿈과 밀도를 다시 확인한다. 코드용 폰트는 기존 fallback 체계를 유지한다.

## 바뀌는 점과 호환성

기존 root, `/ui`, `/utils`, `/components/*`, `/lib/*`, `/i18n/*` 경로와 기존 컴포넌트 이름을 유지한다. 깊은 경로는 배포 파일에 실제로 존재하는 컴파일된 JS와 타입으로 연결한다. Select·Switch·Checkbox와 `/components.css`는 추가 API다.

기본 색·글자·컨트롤 크기·모서리·움직임이 바뀐다. 기존에 작은 높이를 가정한 고정 레이아웃은 확인해야 한다. Button의 기존 size 이름은 유지하되 v2의 읽기/터치 기준에 맞춘다. 명시적인 `className`은 소비 화면이 책임지는 예외이며 너무 작은 높이나 낮은 대비로 기본 규칙을 깨지 않도록 한다.

공통 globals에서 사이트 전용 float 애니메이션을 분리했다. 저장소의 사이트는 로컬 `src/app/globals.css`에서 이를 계속 정의한다. 다른 소비자가 `animate-float`에 의존했다면 자기 사이트 스타일로 명시적으로 옮긴다.

## 확인 방법

- `pnpm storybook`: 실제 공개 컴포넌트의 `UI v2 / Workspace` 화면.
- `pnpm build:tokens`, `pnpm check:contrast`: 실제 배포 CSS와 대비 확인.
- `pnpm test`, `pnpm build:storybook`, `pnpm test:browser`: 규칙, 키보드, 상태, 모바일, 자동 접근성 확인.
- `pnpm build:pkg`, `pnpm check:package`: 실제 tarball과 외부 React 소비 예시 확인.

자동 검사와 HTML 시안만으로 모든 소비 화면의 품질을 보장하지 않는다. 실제 앱에서 긴 문장·테마·포커스·오류 상태를 확인한다. DESIGN.md의 선택한 방향을 우선하고 외부 예시는 부족한 부분만 보완한다.
