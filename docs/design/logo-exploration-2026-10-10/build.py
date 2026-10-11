"""Editable, monochrome concept sketches; not production logo assets."""
from pathlib import Path
import html
import subprocess

ROOT = Path(__file__).resolve().parent
INK = '#242424'
FONT = 'Apple SD Gothic Neo, sans-serif'
CONCEPTS = [
    dict(id='a-unfold', title='이불을 걷는 순간', premise='충분히 쉰 뒤, 다시 바깥으로.',
         visible='넓은 천과 들린 귀퉁이 · 쉬는 곳에서 열린 곳으로',
         feeling='포근함, 부담 없는 시작', risk='파도·티슈·수건으로도 보임. 아침은 설명이 필요.',
         shape='<path d="M27 34C47 32 54 22 69 23C87 24 88 48 108 48C94 62 78 64 64 57C48 49 40 39 27 34L25 46C45 49 61 70 86 69C96 69 104 66 111 61L101 98Q98 109 86 108L24 101Q15 100 17 91L23 39Q24 34 27 34Z"/>'),
    dict(id='b-thread', title='매듭 뒤에도 이어지는 실', premise='어제를 풀어 없애지 않아도, 이어 갈 수 있다.',
         visible='느슨한 고리 하나와 위로 빠져나가는 긴 끝',
         feeling='회복, 다정함, 조용한 의지', risk='실보다 리본·필기체로 읽힐 수 있음. 얽힘의 인상도 있음.',
         shape='<g fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round"><path d="M20 94C44 101 63 76 64 49C65 24 44 22 41 43C40 51 45 59 51 64"/><path d="M64 72C80 80 95 76 99 63C105 46 88 34 96 18"/></g>'),
    dict(id='c-page', title='넘긴 장, 남아 있는 장', premise='지금까지의 나를 품고, 다음 이야기를 연다.',
         visible='아래에 남은 한 장 + 위로 돌아가는 한 장',
         feeling='기대, 여유, 지워지지 않는 연속성', risk='책·문서 서비스에 가까움. 위쪽 장은 깃발로도 보일 수 있음.',
         shape='<path d="M19 57L59 73V99L19 84V75L49 86V80L19 68Z"/><path d="M68 73L108 57V68L78 80V86L108 75V84L68 99Z"/><path d="M64 62L79 22Q81 18 85 20L108 30Q112 32 110 37L96 56L73 66Q63 70 56 66L24 54V46L56 58Q62 61 64 62Z"/>'),
    dict(id='d-stones', title='혼자 뛰지 않아도 되는 내일', premise='작은 발판들이 서로의 다음 걸음을 만든다.',
         visible='크기가 다른 낮은 돌 셋이 짧은 간격으로 이어짐',
         feeling='동행, 차근차근, 안전하게 건너감', risk='발자국·조약돌 장식으로도 보임. 관계의 의미는 설명 의존.',
         shape='<path d="M15 89C14 78 24 70 39 70C49 70 53 75 51 84C49 96 32 102 22 98Q15 96 15 89Z"/><path d="M48 59C43 50 50 42 62 41C74 39 85 43 84 52C83 61 69 67 60 66Q51 65 48 59Z"/><path d="M83 30C83 20 94 17 104 20C115 23 118 33 111 40C103 47 85 42 83 30Z"/>'),
    dict(id='e-seat', title='내일도 남겨 둔 자리', premise='다시 돌아와도, 나를 위한 자리가 있다.',
         visible='서로 기댄 두 등받이와 하나로 이어진 긴 좌석',
         feeling='환대, 안도감, 함께 있음', risk='가구·공간 브랜드로 읽히기 쉬움. 내일이라는 시간은 간접적.',
         shape='<path d="M24 62L21 39Q20 27 31 25L40 24Q51 24 53 35L57 62Z"/><path d="M65 62L70 33Q72 22 83 24L92 26Q103 29 100 40L95 62Z"/><path d="M19 71H108V79Q108 85 101 85H95L91 105H80L82 85H44L46 105H35L31 85H26Q19 85 19 78Z"/>'),
]

def text(x, y, value, size=18, weight=400, color=INK):
    return f'<text x="{x}" y="{y}" font-size="{size}" font-weight="{weight}" fill="{color}">{html.escape(value)}</text>'

def svg(body, w, h, title):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" color="{INK}" fill="{INK}"><title>{html.escape(title)}</title>{body}</svg>'

def render(source, dest, size=None):
    args = ['rsvg-convert', str(source), '-o', str(dest)]
    if size:
        args += ['-w', str(size), '-h', str(size)]
    subprocess.run(args, check=True)

for c in CONCEPTS:
    path = ROOT / 'sketches' / (c['id'] + '.svg')
    path.write_text(svg(c['shape'], 128, 128, c['title']), encoding='utf-8')

parts = ['<rect width="1500" height="1200" fill="#fafafa"/>', f'<g font-family="{FONT}">']
parts += [text(56, 60, 'naeil / 내일을 떠올리는 다섯 장면', 34, 600),
          text(57, 95, '의미 탐색 01   ·   단색 러프 스케치   ·   색·워드마크·최종 형태 미정', 18, color='#666666'),
          '<path d="M56 125H1444" stroke="#cccccc"/>']
for i, c in enumerate(CONCEPTS):
    x = 56 + (i % 3) * 472
    y = 160 + (i // 3) * 500
    letter = chr(65+i)
    parts += [text(x, y+18, f'{letter}  /  {c["title"]}', 23, 600),
              text(x, y+53, c['premise'], 17, color='#555555'),
              f'<g transform="translate({x+113} {y+86}) scale(1.55)">{c["shape"]}</g>',
              text(x, y+322, '형태', 14, 600, '#666666'), text(x, y+348, c['visible'], 15),
              text(x, y+380, c['feeling'], 18, 600)]
    # Hand-written line breaks keep the comparison readable at native size.
    risks = c['risk'].split('. ')
    for j, risk in enumerate(risks):
        parts.append(text(x, y+412+j*23, risk, 15, color='#666666'))

x, y = 1000, 660
parts += [text(x, y+18, '먼저 더 보고 싶은 방향', 23, 600),
          text(x, y+70, 'B  /  회복의 이야기를 가장 고유하게', 21, 600),
          text(x, y+102, '매듭을 남긴 채 이어지는 끝이 핵심입니다.', 17),
          text(x, y+128, '다만 리본처럼 보이는 약점은 더 풀어야 합니다.', 17),
          text(x, y+196, 'A  /  따뜻함을 생활의 장면으로', 21, 600),
          text(x, y+228, '내일을 쉼 이후의 작은 움직임으로 봅니다.', 17),
          text(x, y+254, '천과 파도의 경계를 더 탐색할 가치가 있습니다.', 17),
          text(x, y+322, '선정이 아니라, 다음 탐색에 대한 제안입니다.', 17, 600),
          text(x, y+355, '느껴지는 장면과 감정부터 비교해 주세요.', 17),
          text(x, y+410, '글자는 설명용 시스템 서체입니다.', 15, color='#666666'),
          text(x, y+433, '제품 로고·UI·토큰은 변경하지 않았습니다.', 15, color='#666666'),
          '<path d="M56 1145H1444" stroke="#cccccc"/>',
          text(56, 1176, '2026.10.10  /  각 안은 서로 다른 발상 하나. 형태 해석은 제작자의 관찰이며 사용자 조사 결과가 아닙니다.', 15, color='#666666'), '</g>']
board = ROOT / 'concept-board.svg'
board.write_text(svg(''.join(parts), 1500, 1200, 'naeil — five meaning-first rough concepts'), encoding='utf-8')
render(board, ROOT / 'concept-board.png')

# A neutral silhouette-only strip lets the reviewer see the marks without stories.
parts = ['<rect width="1300" height="360" fill="white"/>', f'<g font-family="{FONT}">']
for i, c in enumerate(CONCEPTS):
    x = 35 + i*254
    parts += [text(x+102, 54, chr(65+i), 20, 600), f'<g transform="translate({x+20} 92) scale(1.5)">{c["shape"]}</g>']
parts += [text(35, 326, '설명 없이 먼저 보기 · 모두 같은 단색 / 아직 최종 로고가 아닙니다', 16, color='#666666'), '</g>']
strip = ROOT / 'silhouettes.svg'
strip.write_text(svg(''.join(parts), 1300, 360, 'naeil — silhouette-only comparison'), encoding='utf-8')
render(strip, ROOT / 'silhouettes.png')
print('Rendered five editable sketches and two comparison sheets.')
