naeil 브랜드 원본 관리

현재 승인 버전 선택: current.json (현재 naeil/1.1.0/)
독립 전달 파일: naeil/naeil-brand-1.1.0.zip

소유권과 경계
- brand/naeil/<version>/source: 심볼·폰트 원본과 재생성 도구.
- brand/naeil/<version>/svg, png, icons: 검수된 독립 배포 에셋.
- src/components/logo.tsx: React 크기·테마·접근성 처리.
- src/components/brand-artwork.generated.tsx: SVG에서 생성되는 코드. 직접 수정 금지.
- 각 제품: 배치·앱 이름·파비콘 설정. UI 본문은 기존 Pretendard 유지.

관리 절차
1. 승인된 버전 디렉터리는 덮어쓰지 않는다. 브랜드를 바꿀 때 다음 버전을 만든다.
2. 새 버전의 원본을 다듬고 source/build.py로 SVG/PNG/아이콘을 재생성한다.
3. 작은 크기·테마·워드마크·파일 무결성을 검수하고 ZIP과 체크섬을 만든다.
4. brand/current.json의 version을 새 승인 버전으로 지정한다.
5. pnpm build:brand로 React 그래픽·Lato 고지·사이트 아이콘을 동기화한다.
6. pnpm check:brand, pnpm test, pnpm check:types, pnpm check:contrast,
   pnpm build:pkg, pnpm build:storybook, pnpm check:package를 실행한다.
7. 실제 Storybook Brand/Logo와 소비 프로젝트에서 크기·테마·메뉴 배치를 확인한다.
8. 브랜드 버전과 UI 패키지 버전은 별개다. npm 게시·사이트 배포는 별도로 진행한다.

pnpm build:brand는 승인된 배포 SVG의 해시를 검증하고 React JSX로 변환한다.
렌더 시 외부 파일 URL·폰트·브랜드 서버가 필요 없다.
Nav의 brandSlot 재정의는 계속 지원한다.
mono=true는 과거 currentColor 단색 계약을 유지하는 실루엣 대체 표현이다.
선택된 회색 A를 쓰려면 tone="gray"를 사용한다.

브랜드 원본·연구 증거·PNG·ZIP 전체를 @naeil/ui npm에 넣지 않는다.
npm에는 필요한 생성 코드와 Lato 고지만 포함한다.
React 외 프로젝트는 1.1.0 ZIP을 독립적으로 사용한다.

공식 워드마크 표기: .naeil. 앞의 마침표를 생략하지 않는다.
의미: 끝. 내일 — 마침표는 하루의 끝, naeil은 이어지는 내일.
심볼 단독에는 별도의 점을 붙이지 않는다. 접근성 이름은 읽기 쉬운 naeil을 유지한다.
