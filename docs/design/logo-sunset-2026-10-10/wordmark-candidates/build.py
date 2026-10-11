"""Wordmark specimens from OFL font sources; exported artwork uses paths only."""
from pathlib import Path
import json
import subprocess
import xml.etree.ElementTree as ET
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen

P = Path(__file__).resolve().parent
A = P/'assets'
A.mkdir(exist_ok=True)
MASTER = P.parent/'quality-master/assets'
CONFIG = [
    dict(key='manrope', title='01 · Manrope', file='Manrope[wght].ttf', weight=500,
         gaps=[-.012, -.018, -.006, -.012], mood='정돈된 곡선, 차분한 제품 브랜드',
         tradeoff='현대적이고 안정적 · 개성은 심볼이 담당'),
    dict(key='lato', title='02 · Lato', file='Lato-Regular.ttf', weight=400,
         gaps=[-.008, -.010, -.002, .006], mood='부드러운 획, 편안하고 친근한 인상',
         tradeoff='따뜻한 일상에 가까움 · 비교적 익숙한 표정'),
    dict(key='lora', title='03 · Lora', file='Lora[wght].ttf', weight=400,
         gaps=[-.004, -.013, .006, .008], mood='잔잔한 여운, 책처럼 차분한 인상',
         tradeoff='감성적인 개성 · 출판·숙박 브랜드로도 읽힘'),
]


def outline(config):
    font = TTFont(P/'fonts'/config['key']/config['file'])
    if 'fvar' in font:
        font = instantiateVariableFont(font, {'wght':config['weight']}, inplace=False)
    glyphs, cmap = font.getGlyphSet(), font.getBestCmap()
    upm = font['head'].unitsPerEm
    bounds = BoundsPen(glyphs)
    glyphs[cmap[ord('n')]].draw(bounds)
    xheight = bounds.bounds[3]
    cursor, items, boxes = 0, [], []
    for i,char in enumerate('naeil'):
        name = cmap[ord(char)]
        pen, bp = SVGPathPen(glyphs), BoundsPen(glyphs)
        glyphs[name].draw(pen); glyphs[name].draw(bp)
        items.append(f'<path transform="translate({cursor:.4f} 0)" d="{pen.getCommands()}"/>')
        b = bp.bounds
        boxes.append((b[0]+cursor,b[1],b[2]+cursor,b[3]))
        cursor += font['hmtx'][name][0]
        if i<4: cursor += config['gaps'][i]*upm
    return dict(paths=''.join(items), xheight=xheight,
                xmin=min(b[0] for b in boxes), xmax=max(b[2] for b in boxes),
                ymin=min(b[1] for b in boxes), ymax=max(b[3] for b in boxes))


WORDS={c['key']:outline(c) for c in CONFIG}


def word(key, x, baseline, xheight, ink='#263C4B', left=False):
    w = WORDS[key]
    scale=xheight/w['xheight']
    origin=x-(w['xmin'] if left else (w['xmin']+w['xmax'])/2)*scale
    return f'<g fill="{ink}" transform="translate({origin:.6f} {baseline}) scale({scale:.8f} {-scale:.8f})">{w["paths"]}</g>'


def mark(prefix, mode='color', small=False):
    s=(MASTER/f'naeil-{mode}{"-small" if small else ""}.svg').read_text()
    return s[s.index('<defs>'):s.rindex('</svg>')].replace('naeil-',prefix+'-')


def placed(body,x,y,size):
    return f'<svg x="{x}" y="{y}" width="{size}" height="{size}" viewBox="24 30 208 208">{body}</svg>'


def svg(body,w,h,title='naeil — OFL wordmark candidates'):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img">'
            f'<title>{title}</title>{body}</svg>')


def write(path,body,width=None):
    path.write_text(body); ET.parse(path)
    cmd=['rsvg-convert',str(path),'-o',str(path.with_suffix('.png'))]
    if width:cmd+=['-w',str(width)]
    subprocess.run(cmd,check=True)


for c in CONFIG:
    key=c['key']
    for mode in ('color','gray','color-dark'):
        ink='#F5F1EB' if mode.endswith('dark') else '#303030' if mode=='gray' else '#263C4B'
        body=placed(mark('asset',mode),64,0,384)+word(key,256,407,40,ink)
        write(A/f'{key}-{mode}-stacked.svg',svg(body,512,448),2048)
        body=placed(mark('asset',mode,True),8,0,80)+word(key,108,58,29,ink,left=True)
        write(A/f'{key}-{mode}-horizontal.svg',svg(body,300,80),1200)
    # Neutral standalone wordmark, optically spaced, no redistributed modified font.
    w=WORDS[key]; xh=90; scale=xh/w['xheight']; width=(w['xmax']-w['xmin'])*scale+40
    height=(w['ymax']-w['ymin'])*scale+40
    body=word(key,20,20+w['ymax']*scale,xh,'#303030',True)
    write(A/f'{key}-wordmark.svg',svg(body,round(width,3),round(height,3)),1600)

style='<style>text{font-family:Apple SD Gothic Neo,Arial,sans-serif;fill:#263C4B}.sub{fill:#68767B}</style>'
board=['<rect width="1440" height="1140" fill="#F5F2EB"/>',style,
       '<text x="48" y="58" font-size="16" letter-spacing="3">NAEIL / WORDMARK STUDY</text>',
       '<text x="48" y="110" font-size="31">같은 노을, 세 가지 글자의 표정</text>',
       '<text x="48" y="151" font-size="17">상업적 사용을 허용하는 SIL OFL 1.1 글꼴 · 글자의 실제 높이를 맞추고 간격을 조정했습니다.</text>']
for i,c in enumerate(CONFIG):
    key=c['key'];x=48+i*456
    board += [f'<rect x="{x}" y="191" width="432" height="473" fill="#FFFFFF"/>',
              f'<text x="{x+24}" y="234" font-size="20">{c["title"]}</text>',
              placed(mark('hero'+key),x+61,239,310),
              word(key,x+216,581,38),
              f'<text x="{x+216}" y="632" font-size="16" text-anchor="middle">{c["mood"]}</text>',
              f'<rect x="{x}" y="684" width="432" height="158" fill="#252525"/>',
              placed(mark('dark'+key,'color-dark',True),x+30,704,110),
              word(key,x+260,778,33,'#F5F1EB'),
              f'<rect x="{x}" y="860" width="432" height="158" fill="#EAE8E3"/>',
              placed(mark('gray'+key,'gray',True),x+30,880,110),
              word(key,x+260,954,33,'#303030'),
              f'<text x="{x+216}" y="1060" font-size="15" text-anchor="middle" class="sub">{c["tradeoff"]}</text>']
board += ['<text x="48" y="1110" font-size="14" class="sub">01 Manrope Medium 500 · 02 Lato Regular 400 · 03 Lora Regular 400 / 모든 로고 글자는 벡터 경로입니다.</text>']
write(P/'comparison.svg',svg(''.join(board),1440,1140),2880)

detail=['<rect width="1440" height="490" fill="#FFFFFF"/>',style,
        '<text x="48" y="57" font-size="23">글자만 비교 — 동일한 소문자 높이</text>']
for i,c in enumerate(CONFIG):
    x=48+i*456;key=c['key']
    detail += [f'<text x="{x}" y="111" font-size="19">{c["title"]}</text>',word(key,x+204,281,82,'#303030'),
               f'<text x="{x}" y="382" font-size="14" class="sub">작은 크기 · 소문자 높이 12px</text>',
               word(key,x,421,12,'#303030',True)]
write(P/'letterforms.svg',svg(''.join(detail),1440,490),2880)

proof=['<rect width="1200" height="770" fill="#FFFFFF"/>',style,
       '<text x="32" y="44" font-size="22">작은 헤더 배치와 글자 판독</text>']
for i,c in enumerate(CONFIG):
    key=c['key'];y=75+i*225
    proof += [f'<text x="32" y="{y+25}" font-size="19">{c["title"]}</text>']
    for j,xh in enumerate((10,12,16,24)):
        x=34+j*155
        proof += [word(key,x,y+96,xh,'#303030',True),
                  f'<text x="{x}" y="{y+128}" font-size="12" class="sub">x-height {xh}px</text>']
    proof += [f'<rect x="690" y="{y}" width="475" height="82" fill="#F5F2EB"/>',
              placed(mark('head'+key,'color',True),708,y+19,40),word(key,764,y+53,20,'#263C4B',True),
              f'<rect x="690" y="{y+99}" width="475" height="82" fill="#252525"/>',
              placed(mark('headdark'+key,'color-dark',True),708,y+118,40),word(key,764,y+152,20,'#F5F1EB',True)]
write(P/'proof.svg',svg(''.join(proof),1200,770))
(P/'specimens.json').write_text(json.dumps(CONFIG,ensure_ascii=False,indent=2)+'\n')
print('Built 21 editable SVG/PNG candidate assets and 3 comparison sheets.')
