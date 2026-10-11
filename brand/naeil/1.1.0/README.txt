naeil brand kit 1.1.0 — 2026-10-11

선택된 노을·해·섬·물결 심볼 + Lato Regular 400 .naeil 워드마크.
글자 간격은 폰트의 기본 조판값으로 통일했습니다.
START-HERE.html을 열면 사용 가이드와 실제 파일을 볼 수 있습니다.
이 폴더만 복사하면 다른 프로젝트에서도 사용할 수 있습니다.

빠른 선택
웹 헤더: svg/naeil-horizontal-color.svg (높이 28px 권장)
작은 푸터: svg/naeil-footer-color.svg (높이 20px 권장)
로그인: svg/naeil-symbol-color-small.svg (40px)
대표 이미지: svg/naeil-stacked-color.svg
16–48px 심볼: svg/naeil-symbol-color-small.svg
48px 이상 심볼: svg/naeil-symbol-color.svg
글자만: svg/naeil-wordmark-color.svg
회색: 파일명의 color를 gray로 변경
어두운 배경: color-dark / gray-dark 사용
파비콘: icons/favicon.svg + icons/favicon.ico
터치 아이콘: icons/apple-touch-icon.png

SVG는 외부 이미지·웹폰트 의존성이 없는 벡터입니다.
HTML에서는 <img>로 사용하고 가로세로 비율을 유지하세요.
SVG 코드를 여러 번 직접 붙여 넣는 경우 gradient/clipPath ID를
인스턴스별로 바꿔야 합니다. <img> 사용은 이 충돌을 피합니다.
PNG는 로고 파일에 투명 배경, 앱/ICO 대체 아이콘에 따뜻한 단색 배경을 씁니다.

예제: examples/usage.html, examples/brand.css
검수 결과: verification/report.html
파일 목록·비율: asset-manifest.json
무결성: SHA256SUMS.txt
폰트 라이선스: licenses/Lato-OFL.txt
재생성: python3 source/build.py
재생성 도구: Python 3, fontTools, Pillow, HarfBuzz(hb-shape), librsvg(rsvg-convert)
완성된 파일을 사용하는 데에는 위 도구나 폰트 설치가 필요 없습니다.

Lato의 상업적 그래픽 제작 사용은 SIL OFL 1.1이 허용합니다.
원본 폰트를 함께 재배포할 때는 포함된 저작권·라이선스 고지를 유지하세요.
Lato의 라이선스가 naeil의 상표·심볼 자체를 제삼자에게 허가하는 것은 아닙니다.

이 패키지의 완료 범위는 웹·디지털용 로고 파일과 재사용 검수입니다.
회색은 명도 단계가 있는 버전이며 순수 1도 스탬프 데이터는 아닙니다.
CMYK 인쇄 교정 및 상표 등록용 유사성 조사는 포함하지 않습니다.
기존 @naeil/ui 배포판이나 운영 사이트가 자동으로 바뀌는 것은 아닙니다.

1.1.0 변경: 앞의 마침표를 복원했습니다. “끝. 내일”: 하루를 마치고 내일로 이어지는 의미입니다.
점은 Lato의 실제 글리프와 기본 조판 간격을 사용합니다. 심볼·색·아이콘은 1.0.1 그대로입니다.
