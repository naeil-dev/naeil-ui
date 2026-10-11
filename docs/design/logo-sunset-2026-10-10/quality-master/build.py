"""Polished naeil vector masters and directly rendered exports.

Requires rsvg-convert, Pillow, fontTools; no raster upscaling or image generation.
"""
from pathlib import Path
from xml.etree import ElementTree as ET
import json
import subprocess
from PIL import Image
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen

P = Path(__file__).resolve().parent
SKY = ('M40 149 C40 100.951 79.399 62 128 62 '
       'C176.601 62 216 100.951 216 149 '
       'C216 150.8 215.2 151.4 213.4 151.55 '
       'C180 154.4 149 148 112 151 '
       'C84 153.27 62 153.8 42.6 151.55 '
       'C40.8 151.34 40 150.8 40 149Z')
# Rounded terminals replace the previous acute join and uneven left cut.
TOP = ('M46 163.4 C92 158 161 177 209.8 164.4 '
       'C213.6 163.42 215 164.7 212.2 167.3 '
       'C196 182.34 176 183.7 149 179.2 '
       'C113 173.2 77 167.5 51.3 175 '
       'C49.1 175.642 48 175.3 47 173.3 '
       'L43.8 167 C42.75 164.93 43.65 163.676 46 163.4Z')
LOW = ('M68 188 C108 183 150 201 188.4 189.6 '
       'C191.8 188.59 193 189.7 190.4 192 '
       'C176 204.738 157 207.7 134 202.3 '
       'C110 196.665 89 194.8 72.3 199 '
       'C70.1 199.553 69 199 68.2 197.2 '
       'L65.7 191.6 C64.8 189.584 65.6 188.3 68 188Z')
LAND = ('M35 137 C42 137 45 125 52.5 125 '
        'C60 125 63.5 132.5 71.5 135 '
        'C79.5 137.5 80 139.5 86.5 141.4 '
        'C96.25 144.25 99 147.7 106.5 150.1 '
        'C111.5 151.7 114 152.5 117 154 L117 159 L35 159Z '
        'M166 155 C173 151 179 150 184 145.8 '
        'C189 141.6 189.5 138 195 135.5 '
        'C200.5 133 202 127.2 208.2 127.2 '
        'C214.4 127.2 218 130.5 224 129 L224 159 L166 159Z')
MICRO_SKY = ('M40 148 C40 100.5 79.4 62 128 62 C176.6 62 216 100.5 216 148 '
             'Q216 152 211 152 C177 154 148 148 112 151 C85 153 62 154 45 152 Q40 152 40 148Z')
MICRO_LAND = ('M34 138 C43 136 46 123 55 126 C72 132 82 142 115 154 L115 160 L34 160Z '
              'M169 155 C184 148 193 130 207 128 C214 127 219 129 224 129 L224 160 L169 160Z')
MICRO_TOP = ('M46 168 C96 162 154 182 211 168 Q216 167 213 172 '
             'C195 188 174 191 146 186 C108 179 80 176 52 183 Q49 184 48 181 '
             'L44 172 Q43 169 46 168Z')
MICRO_LOW = ('M68 201 C111 195 148 215 187 201 Q193 199 189 204 '
             'C175 218 154 222 131 215 C111 209 90 208 74 213 Q71 214 70 211 '
             'L67 205 Q65 202 68 201Z')


def gradient(key, name, coords, stops):
    return (f'<linearGradient id="{key}-{name}" {coords} gradientUnits="userSpaceOnUse">' +
            ''.join(f'<stop offset="{o}" stop-color="{c}"/>' for o, c in stops) + '</linearGradient>')


def mark(key, gray=False, dark=False, micro=False):
    sky, land, top, low = (MICRO_SKY, MICRO_LAND, MICRO_TOP, MICRO_LOW) if micro else (SKY, LAND, TOP, LOW)
    if gray:
        sky_stops = [('0', '#565656'), ('.48', '#959595'), ('1', '#C8C8C8')]
        sun_stops = [('0', '#FAFAFA'), ('1', '#E8E8E8')]
        glint = [('0', '#555555'), ('.35', '#8C8C8C'), ('.59', '#C6C6C6'), ('.79', '#969696'), ('1', '#555555')]
        water = [('0', '#8B8B8B'), ('1', '#535353')]
        island = '#454545'
        if dark:
            sky_stops = [('0', '#939393'), ('.48', '#B1B1B1'), ('1', '#DDDDDD')]
            glint = [('0', '#858585'), ('.35', '#A3A3A3'), ('.59', '#DFDFDF'), ('.79', '#B1B1B1'), ('1', '#858585')]
            water = [('0', '#B0B0B0'), ('1', '#8A8A8A')]
            island = '#747474'
    else:
        sky_stops = [('0', '#284972'), ('.28', '#617579'), ('.51', '#AE8A64'), ('.74', '#E5A348'), ('.92', '#E98A32'), ('1', '#D16B2C')]
        sun_stops = [('0', '#FFE4A1'), ('1', '#F6BC60')]
        glint = [('0', '#294C66'), ('.34', '#927257'), ('.59', '#EDA448'), ('.79', '#BC7337'), ('1', '#294C66')]
        water = [('0', '#727878'), ('1', '#284972')]
        island = '#344E60'
        if dark:
            sky_stops = [('0', '#698B9F'), ('.28', '#94A2A1'), ('.51', '#BEA17E'), ('.74', '#E5A348'), ('.92', '#E98A32'), ('1', '#D16B2C')]
            glint = [('0', '#7896A5'), ('.34', '#AC957D'), ('.59', '#F4B35D'), ('.79', '#CB925E'), ('1', '#7896A5')]
            water = [('0', '#A0A6A4'), ('1', '#7896A5')]
            island = '#59778A'
    defs = '<defs>'
    defs += gradient(key, 'sky', 'x1="128" y1="62" x2="128" y2="153"', sky_stops)
    defs += gradient(key, 'sun', 'x1="146" y1="120" x2="146" y2="150"', sun_stops)
    defs += gradient(key, 'glint', 'x1="44" y1="0" x2="214" y2="0"', glint)
    defs += gradient(key, 'water', f'x1="128" y1="{199 if micro else 186}" x2="128" y2="{219 if micro else 207}"', water)
    defs += f'<clipPath id="{key}-clip"><path d="{sky}"/></clipPath></defs>'
    sun = '<circle cx="144" cy="135" r="16"' if micro else '<circle cx="146" cy="136" r="12"'
    return (defs + f'<g clip-path="url(#{key}-clip)"><path d="{sky}" fill="url(#{key}-sky)"/>' +
            sun + f' fill="url(#{key}-sun)"/><path d="{land}" fill="{island}"/></g>' +
            f'<path d="{top}" fill="url(#{key}-glint)"/><path d="{low}" fill="url(#{key}-water)"/>')


def svg(body, width, height, viewbox=None):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
            f'viewBox="{viewbox or f"0 0 {width} {height}"}" role="img">'
            '<title>naeil — 노을과 섬</title>' + body + '</svg>')


def save_svg(path, body):
    path.write_text(body)
    ET.parse(path)


def render(path, dest, width=None):
    cmd = ['rsvg-convert', str(path), '-o', str(dest)]
    if width:
        cmd += ['-w', str(width)]
    subprocess.run(cmd, check=True)


def placed(body, x, y, size, vb='24 30 208 208'):
    return f'<svg x="{x}" y="{y}" width="{size}" height="{size}" viewBox="{vb}">{body}</svg>'


# Outline the current Arial specimen lettering: no font files are distributed.
# This stabilizes rendering; it does not declare a final custom wordmark.
font = TTFont('/System/Library/Fonts/Supplemental/Arial.ttf')
glyphs = font.getGlyphSet()
cmap = font.getBestCmap()
upm = font['head'].unitsPerEm
pen_paths, cursor = [], 0
for char in 'naeil':
    name = cmap[ord(char)]
    pen = SVGPathPen(glyphs)
    glyphs[name].draw(pen)
    pen_paths.append(f'<path transform="translate({cursor} 0)" d="{pen.getCommands()}"/>')
    cursor += font['hmtx'][name][0] - .020 * upm
word_width = cursor + .020 * upm


def word(x, baseline, em, ink):
    scale = em / upm
    return f'<g fill="{ink}" transform="translate({x-word_width*scale/2:.5f} {baseline}) scale({scale:.8f} {-scale:.8f})">' + ''.join(pen_paths) + '</g>'


MODES = {'color': (False, False), 'gray': (True, False), 'color-dark': (False, True), 'gray-dark': (True, True)}
manifest = []
for mode, (gray, dark) in MODES.items():
    for micro in (False, True):
        suffix = '-small' if micro else ''
        target = P/'assets'/f'naeil-{mode}{suffix}.svg'
        save_svg(target, svg(mark('naeil', gray, dark, micro), 512, 512, '24 30 208 208'))
        sizes = (16, 24, 32, 48) if micro else (64, 128, 512, 1024, 2048, 4096)
        for size in sizes:
            out = target.with_name(target.stem+f'-{size}.png')
            render(target, out, size)
            manifest.append({'file': str(out.relative_to(P)), 'pixels': size, 'small_geometry': micro})
    ink = '#F4F1EC' if dark else '#263C4B'
    if gray:
        ink = '#F3F3F3' if dark else '#303030'
    lockup = placed(mark('lockup', gray, dark), 80, 0, 352) + word(256, 348, 63, ink)
    target = P/'assets'/f'naeil-{mode}-lockup.svg'
    save_svg(target, svg(lockup, 512, 400))
    for width in (1024, 2048, 4096):
        render(target, target.with_name(target.stem+f'-{width}.png'), width)

style = '<style>text{font-family:Apple SD Gothic Neo,Arial,sans-serif;fill:#263C4B}</style>'
board = ['<rect width="1440" height="1100" fill="#F5F2EB"/>', style,
         '<text x="64" y="65" font-size="17" letter-spacing="3">NAEIL / REFINED MASTER</text>',
         '<text x="64" y="116" font-size="32">선택한 풍경, 더 정돈된 마감</text>',
         '<text x="64" y="155" font-size="17">곡선과 끝맺음 · 그라데이션 · 작은 크기 전용 비율</text>']
for i, gray in enumerate((False, True)):
    x = 64+i*670
    board += [f'<rect x="{x}" y="195" width="642" height="530" fill="#FFFFFF"/>',
              f'<text x="{x+28}" y="239" font-size="17">{"회색 A" if gray else "컬러"}</text>',
              placed(mark('hero'+str(i), gray), x+121, 255, 400),
              word(x+321, 670, 67, '#303030' if gray else '#263C4B'),
              f'<rect x="{x}" y="749" width="642" height="185" fill="#252525"/>',
              placed(mark('dark'+str(i), gray, True), x+75, 748, 184),
              word(x+418, 857, 51, '#F4F1EC')]
board += ['<text x="64" y="991" font-size="20">SVG 원본 + 최대 4096px 투명 PNG + 16–32px 전용 아이콘</text>',
          '<text x="64" y="1032" font-size="16">기존 서체의 배치를 곡선으로 변환해 출력 일관성을 맞췄습니다. 최종 워드마크 확정 전입니다.</text>',
          '<text x="64" y="1065" font-size="14">제품 적용 전 · 화면 미리보기는 축소되어 보일 수 있습니다.</text>']
save_svg(P/'preview.svg', svg(''.join(board), 1440, 1100))
render(P/'preview.svg', P/'preview.png', 2880)

# Before/after at matching scale; colors and geometry are both reviewable.
old = (P.parent/'refinement-islands-v2/assets/naeil-islands-color.svg').read_text()
old_body = old[old.index('<defs>'):old.rindex('</svg>')].replace('asset-', 'previous-')
comparison = ['<rect width="1200" height="580" fill="#FFFFFF"/>', style]
for i, (label, body) in enumerate([('이전', old_body), ('정밀 조정', mark('after'))]):
    x = 50+i*600
    comparison += [f'<text x="{x}" y="52" font-size="22">{label}</text>', placed(body, x+30, 70, 440)]
save_svg(P/'evidence/before-after.svg', svg(''.join(comparison), 1200, 580))
render(P/'evidence/before-after.svg', P/'evidence/before-after.png', 2400)

# Actual raster sizes, before/after, and a header placement. Embedded PNGs prevent
# the evidence renderer from substituting a different sampling scale.
import base64
proof = ['<rect width="1200" height="760" fill="#FFFFFF"/>', style,
         '<text x="32" y="42" font-size="22">실제 픽셀 크기 · 작은 크기 보정 전후</text>']
for i, mode in enumerate(MODES):
    y = 74+i*139
    gray, dark = MODES[mode]
    bg, ink = ('#252525', '#EEEEEE') if dark else ('#FFFFFF', '#303030')
    proof += [f'<rect x="20" y="{y}" width="1160" height="130" fill="{bg}"/>',
              f'<text x="34" y="{y+28}" font-size="15" style="fill:{ink}">{mode}</text>']
    for j, size in enumerate((16, 24, 32, 64)):
        x = 235+j*235
        regular = P/'evidence'/f'{mode}-master-{size}.png'
        render(P/'assets'/f'naeil-{mode}.svg', regular, size)
        small = P/'assets'/f'naeil-{mode}-small-{size}.png' if size < 64 else P/'assets'/f'naeil-{mode}-64.png'
        for dx, path in ((0, regular), (88, small)):
            data = base64.b64encode(path.read_bytes()).decode()
            proof += [f'<image x="{x+dx}" y="{y+31}" width="{size}" height="{size}" href="data:image/png;base64,{data}"/>']
        proof += [f'<text x="{x}" y="{y+117}" font-size="12" style="fill:{ink}">{size}px · 일반 / 보정</text>']
proof += ['<rect x="20" y="655" width="1160" height="76" rx="8" fill="#F5F2EB"/>',
          placed(mark('header', micro=True), 45, 675, 32), word(121, 701, 27, '#263C4B'),
          '<text x="990" y="700" font-size="15">작은 헤더 배치</text>']
save_svg(P/'evidence/size-proof.svg', svg(''.join(proof), 1200, 760))
render(P/'evidence/size-proof.svg', P/'evidence/size-proof.png')

# Nearest-neighbor view of exact 16/32px raster pixels, not an enlarged SVG.
pixel_board = Image.new('RGB', (1120, 700), '#eeeeee')
for row, mode in enumerate(('color', 'gray')):
    for col, (size, small) in enumerate(((16, False), (16, True), (32, False), (32, True))):
        path = P/'assets'/f'naeil-{mode}-small-{size}.png' if small else P/'evidence'/f'{mode}-master-{size}.png'
        im = Image.open(path).convert('RGBA')
        bg = Image.new('RGBA', im.size, '#ffffff')
        bg.alpha_composite(im)
        pixel_board.paste(bg.resize((256, 256), Image.Resampling.NEAREST).convert('RGB'), (10+col*280, 35+row*345))
pixel_board.save(P/'evidence/pixel-proof.png')
(P/'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
print(f'Created {len(list((P/"assets").glob("*.svg")))} SVG assets and {len(list((P/"assets").glob("*.png")))} PNG exports.')
