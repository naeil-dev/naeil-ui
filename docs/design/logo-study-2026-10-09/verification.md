# naeil 로고 시안 검증 — 2026-10-09

후속 피드백으로 의미 중심의 [두 번째 탐색](meaning-exploration/direction.md)을 진행했다. 아래 추천과 측정은 첫 번째 형태 비교의 당시 결과이며 최종 방향 선택이 아니다.

결과: 편집 가능한 3안과 비교 화면을 제작했다. 현재 추천은 **B · 열린 n**. 비스듬한 틈이 있는 둥근 n이 ‘차분하지만 독특한 제품 브랜드’라는 요청에 가장 잘 맞아 보인다. 이는 디자인 판단이며 사람의 선호·기억 시험 결과가 아니다.

검토 화면: [review.html](review.html). 이미지: [overview.png](overview.png), [pixel-proof.png](pixel-proof.png). 요청·가정·안별 약점은 [brief.md](brief.md)에 있다.

## 실제 확인한 범위

| 항목 | 방법·증거 | 결과 |
| --- | --- | --- |
| 편집 가능한 원본 | 20개 SVG XML 파싱 및 소스 검사, verification.json의 파일 SHA-256 | 경로·도형 기반. 글꼴 텍스트·비트맵·외부 참조에 의존하지 않음 |
| 크기에 따른 형태 | librsvg 직접 렌더, 16/20/24/32/64px, 밝은/어두운 배경, pixel-proof.png | 3안의 내부 공간과 가장자리 확인. 기록된 밝은 배경의 알파 경계는 캔버스 가장자리에 닿지 않음 |
| B의 작은 크기 | 표준/보정 형태의 16px 래스터를 8배 최근접 확대해 직접 비교 | 보정 형태에서 어깨 틈을 넓힘. 16px은 micro, 24px 이상은 표준 형태로 제시 |
| C의 작은 크기 | 실제 16px와 픽셀 확대 직접 확인 | 두 글자 내부 공간은 남지만 높이가 작아 보임. 독립 심벌보다 이름 중심 방향으로 제시 |
| 헤더 배치 | 기존 심벌 20px + .naeil 재현, 새 로고 높이 32px 목업 | 배치와 글자 간격 확인. 실제 제품 페이지에 통합한 결과는 아님 |
| 비교 페이지 | Chrome 154.0.8037.98 / CDP, 1440px·390px, 밝은/어두운 4상태 | 가로 넘침 0, 깨진 이미지 0, 버튼 폭/높이 44px 이상 |
| 비교 페이지 동작 | 각 상태에서 A→C→B 실제 포인터 입력과 배경 왕복 전환, Enter 키 입력 | 선택 버튼/헤더/아이콘 동기화 확인. Enter 배경 전환과 2px 키보드 포커스 표시 확인 |
| 실제 글꼴 | CDP CSS.getPlatformFontsForNode로 H1 조사 | 한국어 제목은 Apple SD Gothic Neo 대체 글꼴. Pretendard 설치·로딩을 검증했다고 주장하지 않음. 로고 글자는 SVG 경로 |

overview.png, pixel-proof.png와 browser-desktop-light/dark.png, browser-mobile-light/dark.png를 모두 열어 직접 확인했다. 브라우저의 HTML 해시·측정은 [browser-verification.json](browser-verification.json), SVG 해시·래스터 경계는 [verification.json](verification.json)에 있다.

비교 화면의 단색 쌍을 WCAG 상대 휘도로 계산했다: 심벌 #191919 / #fafafa **16.84:1**, 반전 #f1f1f1 / #181818 **15.72:1**. 설명 글자는 밝은/어두운 배경에서 **6.71:1 / 8.56:1**. 버튼 테두리는 **4.35:1 / 5.14:1**. 이 값은 지정 색상 쌍의 계산이며 axe 전체 검사나 공유 패키지의 접근성 인증이 아니다.

초기 키보드 검사에는 CDP Enter 입력의 문자값이 빠져 native 버튼 활성화가 발생하지 않았다. CR을 포함하는 Enter 입력으로 재검증했다. 이 문제로 제품/시안 UI를 수정하지 않았다.

## 스킬 확인

공통 설치 위치: /Users/jaymini/.codex-pooled/skills/logo-icon-design. 호출 이름은 **$logo-icon-design**.

- 스킬 없이 독립 브랜드 Dayfold를 제작한 기준 실행에서는, 편집 가능한 SVG·작은 크기·반전 검증은 있었으나 한 개 방향만 완성했다.
- 그 관찰을 바탕으로 방향이 정해지지 않은 요청에는 서로 다른 단색 실루엣을 먼저 비교하도록 절차를 작성했다.
- 새 컨텍스트에서 같은 브랜드 과제에 스킬을 적용한 실행은 Folded D / Dayturn / Held day의 실제 서로 다른 SVG 3안을 만들었다. 원본 후보 이미지와 헤더·16px 브라우저 증거를 직접 열어 확인했다.
- quick_validate.py 통과. proof_sheet.py를 기준 실행의 SVG에 적용한 HTML/단색/반전/16–160px PNG 증거를 열어 확인했고, 독립 후속 실행에서도 실제 사용했다.

독립 실행 원본은 이 머신의 임시 폴더에 있다: /var/folders/57/hmrv_4ls1llb7bvs8999r78c0000gn/T/logo-icon-skill-eval.wef3r1vk. 기준 실행 1회와 스킬 적용 1회이므로 일반적인 품질 향상률·신뢰성을 측정한 벤치마크가 아니다.

## 출처와 실제 도구

워크플로 출처는 David Airey의 [좋은 로고](https://www.davidairey.com/good-logo)·[제작 과정](https://www.davidairey.com/process), Kaan Kızıltuğ의 [로고 스킬 글](https://kaankiziltug.com/blog/logo-design-skill-kaankiziltug). 2026-10-09 본문 조사에서 단색 형태·분리된 방향·실제 사용 크기 검증을 채택했다. 기존 개인의 스킬 코드를 복사하지 않았다. LogoLounge의 [2026 보고서](https://www.logolounge.com/trend/2026-logo-trend-report)는 도입부의 동향 설명만 참고했고 특정 형태를 처방으로 채택하지 않았다.

B안의 제한된 실제 심벌 비교:

- Standard Notes: https://standardnotes.com/apple-touch-icon.png — 앞선 독립 실행에서 받은 공식 이미지 원본을 재사용해 직접 비교했다. 대칭 아치이며, B의 왼쪽 줄기와 어깨 틈은 다른 형상을 만든다.
- Notion: https://www.notion.so/images/notion-logo-block-main.svg — 2026-10-09 직접 다운로드·렌더해 비교했다. 상자 안 대문자 N이다.
- Linear의 favicon.svg 경로는 SVG가 아닌 HTML을 반환해 시각 참고로 세지 않았다.

타사 로고는 임시 연구 자료에만 남겼고 새 로고 경로에 사용하지 않았다. naeil 제작·검증에는 로컬 SVG 작성, Python/Pillow, librsvg, Chrome CDP와 이미지 뷰어를 사용했다. Recraft·Illustrator·Figma·이미지 생성 서비스를 실행하지 않았으며 새 패키지를 설치하지 않았다.

## 재현과 기준 파일

이 환경에는 Python/Pillow, rsvg-convert, Node 22와 macOS Chrome이 이미 있었다. 원본 SVG에서 비교 이미지를 다시 만들고 비교 화면을 확인하는 명령:

    python3 docs/design/logo-study-2026-10-09/build_review.py
    node docs/design/logo-study-2026-10-09/verify_browser.mjs

브라우저 검사는 두 번째 인자로 다른 Chromium 실행 경로를 받을 수 있다. 이 재현 코드는 로컬 시안과 증거를 갱신한다. 실제 제품·공유 패키지에는 쓰지 않는다.

읽은 기준/스킬과 SHA-256:

| 파일 | SHA-256 |
| --- | --- |
| DESIGN.md | 48891eabe0fcf3a0d9cbf3a30155ba90244ff049742e26cd8a6cbf8bebecf7eb |
| skills/frontend-reference-workflow/SKILL.md, revision 2026-10-02.1 | ecada9f24d5ebbce5ac207d5225200ca2d76d08ea9f9f1d3b46d4e956a17d7b8 |
| skills/frontend-reference-workflow/references/verification.md | b504804320724354584885782fe5522ca002028e647b3e146743649cb0a50efe |
| /Users/jaymini/.codex-pooled/skills/logo-icon-design/SKILL.md | bd6a317bdfe55c614dfef7efc772b62d3dde78942bd271fbacf33bfeb3708f23 |
| /Users/jaymini/.codex-pooled/skills/logo-icon-design/scripts/proof_sheet.py | d27feb02117f74b0422bf02497231d01ca4365e418fe12680f51b83f0b31d7bf |

남은 범위: 사람의 기억·선호 시험, 광범위한 유사 로고/상표 조사, 실제 브라우저 탭 아이콘, 다른 브라우저/벡터 편집기, 최종 로고 선택·제품 반영. 현재 로고 컴포넌트·토큰·공유 UI API가 바뀌지 않았으므로 패키지·Storybook·packed consumption 검사를 새로 수행하지 않았다. 기존 프로젝트의 미해결 감사 사항을 이 시안 검증으로 닫지 않는다.
