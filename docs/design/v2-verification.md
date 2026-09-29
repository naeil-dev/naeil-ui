# 공통 UI v2 검증 기록

2026-09-29 기준. 승인한 방향을 공통 `@naeil/ui` 패키지에 구현했다. 패키지 게시, 사이트 배포, 원격 push/merge는 수행하지 않았다.

## 결과물

- 무채색 light/dark 의미 토큰, Pretendard 기준 16px UI, 용도별 폭, 기본/compact 간격, 짧은 전환과 reduced-motion 지원.
- 기존 공통 컴포넌트 정렬 및 Radix Select·Switch·Checkbox 추가. 실제 컴포넌트로 설정·목록·상세·읽기 예시 구성.
- 공통 CSS와 사이트 장식 분리, 공개 import 보존, 토큰 생성 경로 통일, 사용 안내 제공.
- Storybook의 `UI v2 / Workspace`가 실제 구현 검토 화면이다. 폼 저장과 작업 데이터는 예시이며 새로고침하면 초기화된다.

## 검증 결과

| 검사 | 결과 |
| --- | --- |
| `pnpm test` | 7개 파일, 37개 테스트 통과 |
| `pnpm check:contrast` | light/dark 총 40개 조합 통과 |
| `pnpm build:pkg` + `pnpm check:package` | 빌드 및 tarball 검사 통과. 외부 React 소비, SSR 버튼, 공개 경로, 상대 import, 서버 지시문, CSS 컴파일 검사 |
| `pnpm build:storybook` + `pnpm test:browser` | 브라우저 8개 사례 통과. 키보드·포커스 복귀·폼 값·상태 회복·크기·포털·390px·reduced motion·light/dark axe 포함 |
| `pnpm build` + `pnpm exec tsc --noEmit` | 기존 Next 사이트 빌드 및 타입 검사 통과 |
| `pnpm lint` | 오류 없음. 기존 블로그 페이지의 미사용 `locale` 경고 1개 유지 |
| `git diff --check` | 통과 |

브라우저 검사는 Chromium 기반이다. 스크린리더 실사용, Safari/Firefox 전체 매트릭스, 별도 Next 앱의 서버 컴포넌트 빌드를 검증한 것은 아니다. axe와 색 대비 통과는 모든 접근성 요건의 인증을 의미하지 않는다. 패키지 소비 검사는 임시 tarball과 선언된 의존성/peer 및 Tailwind만 노출한 환경을 사용하며, 의존성 자체는 로컬 설치본을 연결한다.

## 최종 리뷰에서 수정한 사항

독립 코드 리뷰 1회에서 나온 네 항목을 재현하고 수정했다.

1. 기본 Card utility가 compact 간격을 덮는 문제: 밀도 토큰을 사용하도록 수정하고 실제 20px padding / 16px gap을 브라우저에서 검사했다.
2. 기존 프로젝트 색상 계약: CC의 기존 teal 값과 SA 변수·색을 원본 CSS 기준으로 복구하고 생성 결과를 검사했다.
3. 잘못된 OKLCH 문자열이 대비 검사를 통과하는 문제: 전체 문자열과 숫자 문법을 검사하도록 수정하고 세 가지 오류 입력을 추가했다.
4. 외부 CSS의 미선언 의존성: `tw-animate-css`를 런타임 의존성으로 옮기고 실제 외부 CSS 컴파일을 추가했다. 이전에는 해당 환경에서 import 해석이 실패함을 확인했다.

추가로 기본 `min-height` 때문에 데스크톱의 `h-8` 재정의가 무시되는 현상을 재현했다. 기본 최소 높이를 제거해 재정의를 허용하고, 모바일 최소 44px는 유지하는 회귀 검사를 추가했다.

기존 Button의 작은 size 이름은 유지하지만 v2의 글자·터치 기준에 맞춰 기본 높이가 달라진다. 이 동작은 migration 문서에 명시했다. 검토된 중요 결함 중 미해결로 남긴 항목은 없다.

## Threads 제안의 실제 적용 범위

원문: https://www.threads.com/share/BCMFGYoNDD/

- awesome-design-md의 제3자 Linear 분석을 참고하고, 사용자가 고른 무채색·글자·폭·간격을 `DESIGN.md`와 실제 토큰에 구체화했다.
- Component Gallery 및 Radix Select 문서를 확인해 값 선택과 행동 메뉴를 구분했다.
- Kinetics는 참고했으나 해당 라이브러리나 spring/magnetic 효과는 채택하지 않았다.
- **21st.dev와 Impeccable 도구는 실행하지 않았다.** 실제 화면을 직접 검토·정리한 것을 도구 실행으로 부르지 않는다.
- 결과물은 공통 디자인 규칙·토큰·컴포넌트·예시·사용 문서다. 별도 스킬이나 플러그인을 만들지 않았다.
