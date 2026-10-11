# naeil 워드마크 후보

선택한 노을·섬 심볼과 회색 A에 상업적 사용이 허용되는 오픈소스 글꼴 세 가지를 조합했다. 최종 서체 선택 전 비교안이며 제품에는 적용하지 않았다.

## 후보와 추천

| 후보 | 구성 | naeil과의 연결 | 관찰한 한계 |
| --- | --- | --- | --- |
| 01 Manrope | Medium 500 | 넓고 정돈된 곡선이 심볼을 안정적으로 받친다. 현대적인 제품 브랜드에 적합하다. | 네모난 i 점과 기하학적인 표정이 상대적으로 또렷하고 차갑게 느껴질 수 있다. |
| 02 Lato | Regular 400 | 둥근 i 점, 완만한 곡선과 획 끝이 편안한 일상의 분위기와 어울린다. 따뜻함과 단정함의 균형으로 추천한다. | 익숙한 산세리프이므로 독자적인 인상은 심볼과 조합에서 얻는다. |
| 03 Lora | Regular 400 | 획의 강약과 세리프가 노을의 여운을 더 서정적으로 만든다. | 출판·숙박 브랜드로도 읽힐 수 있고, 작은 크기에서는 가는 획이 덜 또렷하다. |

이 평가는 렌더를 보고 내린 디자인 판단이며 사용자 조사 결과가 아니다. 글자 윤곽을 새로 그리거나 변형하지 않았고, 동일한 소문자 n 높이를 기준으로 크기를 맞춘 뒤 글자쌍 간격을 수동 조정했다. 가변 폰트는 메모리에서 지정 굵기의 글리프를 추출했다. 수정된 폰트 파일은 만들거나 재배포하지 않았다.

## 라이선스 확인

Google Fonts 공식 저장소의 다음 원본 `OFL.txt`를 실제 읽고 각각 SIL Open Font License 1.1임을 확인했다. 사용한 파일과 라이선스를 함께 보관했다.

- [Manrope 원본 라이선스](https://github.com/google/fonts/blob/bd8f81ddb5c74d5c8897b36ad88b440266245103/ofl/manrope/OFL.txt): Copyright 2018 The Manrope Project Authors.
- [Lato 원본 라이선스](https://github.com/google/fonts/blob/bd8f81ddb5c74d5c8897b36ad88b440266245103/ofl/lato/OFL.txt): Copyright 2010–2014 tyPoland Lukasz Dziedzic. Reserved Font Name: Lato.
- [Lora 원본 라이선스](https://github.com/google/fonts/blob/bd8f81ddb5c74d5c8897b36ad88b440266245103/ofl/lora/OFL.txt): Copyright 2011 The Lora Project Authors. Reserved Font Name: Lora.

본문은 무료 사용·복제·임베딩·수정·재배포를 허용한다. 이 글꼴로 상업용 로고 그래픽을 제작할 수 있다. 특히 결과물에 관해 다음과 같이 명시한다:

> The requirement for fonts to remain under this license does not apply to any document created using the Font Software.

원본 폰트 자체를 재배포할 때는 저작권 고지와 라이선스를 동봉해야 한다. 이번 `fonts/`에는 원본 TTF와 해당 OFL을 그대로 함께 보관한다. 폰트 자체만 판매하는 행위와 수정 폰트의 Reserved Font Name 사용에는 별도 조건이 있으나, 이번처럼 글자를 경로로 만든 로고 그래픽에 폰트 이름을 붙여 재배포하는 작업은 하지 않았다. 폰트 라이선스 확인은 naeil 명칭이나 전체 로고의 상표 유사성 검토와는 별개다.

`sources.json`에 정확한 다운로드 주소, 저장소 커밋, SHA-256을 기록했다. OFL FAQ 웹페이지는 403으로 열리지 않았고, Google Fonts FAQ 주소는 기대한 FAQ 본문을 반환하지 않아 근거로 사용하지 않았다. 위 세 라이선스 원문이 판단 근거다.

## 파일과 검토

- `comparison.png`: 세 후보의 컬러 세로 조합, 어두운 배경과 회색 A 비교.
- `letterforms.png`: 글자만 크게 비교.
- `proof.png`: 소문자 높이 10/12/16/24px 및 밝고 어두운 헤더 예시.
- `assets/*-stacked.svg`: 심볼 위·이름 아래 조합. PNG는 2048×1792px.
- `assets/*-horizontal.svg`: 가로 조합. PNG는 1200×320px.
- `assets/*-wordmark.svg`: 글자만 있는 원본. PNG는 가로 1600px.

내보낸 로고 SVG의 글자는 모두 경로이며 폰트 설치나 네트워크 접근이 필요하지 않다. 실제 렌더에서 심볼과 글자 간격을 조정했고, 3개 비교 시트를 열어 확인했다. 작은 크기에서 Manrope와 Lato가 안정적으로 읽히며, Lora의 획 강약은 줄어든다. 실제 앱의 최종 배치와 인쇄 교정은 아직 수행하지 않았다.

`logo-icon-design` 흐름에 따라 직접 SVG를 조합했다. urllib로 공식 저장소 파일을 읽고, fontTools로 글리프를 추출하고, rsvg-convert로 실제 PNG를 렌더링했다. 이미지 생성 서비스, 외부 로고 제작 서비스, 웹 브라우저는 실행하지 않았다.
