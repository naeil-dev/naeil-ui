"""Independent refinement; preserve the original exploration assets."""
from pathlib import Path
import subprocess
import xml.etree.ElementTree as ET

P = Path(__file__).resolve().parent
OLD = (P.parent / 'assets/a-color.svg').read_text()
DEFS = OLD[OLD.index('<defs>'):OLD.index('</defs>') + 7]
SKY = ('M42 151.5 C40.8 151.36 40 151.2 40 150 '
       'C40 101.3989 79.3989 62 128 62 C176.6011 62 216 101.3989 216 150 '
       'C216 151.2 215.2 151.38 214 151.5 '
       'C179 155 148 148 112 151 C83 153.417 62 153.833 42 151.5Z')
TOP = ('M44 163 C90 157 160 177 211 164 '
       'C214 163.235 215 164 213 166 C198 181 177 185 149 180 '
       'C115.4 174 77 167 50 175 C48.5 175.444 47.4 175 46.8 173.5 '
       'C46 171.5 43 167 43 165.5 C43 164 43.2 163.104 44 163Z')
LOW = ('M66 188 C106 182 149 201 189 189 '
       'C192 188.1 193 189 191 191 C178 204 158 209 134 203 '
       'C110 197 88 194 71 199 C69.5 199.441 68.4 199 67.8 197.5 '
       'C67 195.5 65 192 65 190.5 C65 189 65.2 188.12 66 188Z')
# Distant, asymmetric landforms. Both extend below and are clipped to the sky.
LAND = ('M35 137 C42 137 44 126 52 125 C60 124 63 133 71 135 '
        'C79 137 78 139 86 141 C94 143 99 148 106 150 '
        'C110 151.143 113 152 117 154 L117 159 L35 159Z '
        'M166 155 C173 151 179 150 184 146 C189 142 188 138 194 136 '
        'C200 134 201 127 208 127 C215 127 218 131 224 129 L224 159 L166 159Z')
SUN_HOLE = 'M158 136A12 12 0 1 1 134 136A12 12 0 1 1 158 136Z'


def mark(key, mode='color', islands=True):
    if mode in ('mono', 'reverse'):
        ink = '#23343E' if mode == 'mono' else '#F6F0E7'
        # Single-ink reduction intentionally merges land and sky.
        return (f'<path fill="{ink}" fill-rule="evenodd" d="{SKY} {SUN_HOLE}"/>'
                f'<path fill="{ink}" d="{TOP} {LOW}"/>')
    defs = DEFS.replace('a-', key + '-')
    if mode == 'dark':
        for a, b in [('#284972', '#698B9F'), ('#617579', '#94A2A1'),
                     ('#294C66', '#7896A5'), ('#6E7270', '#9B988B')]:
            defs = defs.replace(a, b)
    land = f'<path d="{LAND}" fill="#344E60"/>' if islands else ''
    return (defs + f'<defs><clipPath id="{key}-clip"><path d="{SKY}"/></clipPath></defs>'
            f'<g clip-path="url(#{key}-clip)"><path d="{SKY}" fill="url(#{key}-sky)"/>'
            f'<circle cx="146" cy="136" r="12" fill="url(#{key}-whiteSun)"/>{land}</g>'
            f'<path d="{TOP}" fill="url(#{key}-glint)"/>'
            f'<path d="{LOW}" fill="url(#{key}-water)"/>')


def svg(body, width, height):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
            f'viewBox="0 0 {width} {height}">{body}</svg>')


def write(name, content, scale=1):
    target = P / name
    target.write_text(content)
    ET.parse(target)
    subprocess.run(['rsvg-convert', '-z', str(scale), str(target), '-o',
                    str(target.with_suffix('.png'))], check=True)


def placed(body, x, y, size):
    return f'<svg x="{x}" y="{y}" width="{size}" height="{size}" viewBox="0 0 256 256">{body}</svg>'


def gray(key, flat=False):
    def gradient(name, coords, stops):
        return (f'<linearGradient id="{key}-{name}" {coords} gradientUnits="userSpaceOnUse">' +
                ''.join(f'<stop offset="{offset}" stop-color="{color}"/>' for offset, color in stops) +
                '</linearGradient>')
    defs = '<defs>'
    defs += gradient('sky', 'x1="128" y1="62" x2="128" y2="153"',
                     [('0', '#565656'), ('.48', '#959595'), ('1', '#C8C8C8')])
    defs += gradient('sun', 'x1="146" y1="124" x2="146" y2="148"',
                     [('0', '#FAFAFA'), ('1', '#E8E8E8')])
    defs += gradient('glint', 'x1="44" y1="0" x2="214" y2="0"',
                     [('0', '#555555'), ('.35', '#8C8C8C'), ('.59', '#C6C6C6'), ('.79', '#969696'), ('1', '#555555')])
    defs += gradient('water', 'x1="128" y1="188" x2="128" y2="205"',
                     [('0', '#8B8B8B'), ('1', '#535353')])
    defs += f'<clipPath id="{key}-clip"><path d="{SKY}"/></clipPath></defs>'
    fills = ['#B4B4B4', '#F5F5F5', '#888888', '#626262'] if flat else [f'url(#{key}-{name})' for name in ('sky', 'sun', 'glint', 'water')]
    return (defs + f'<g clip-path="url(#{key}-clip)"><path d="{SKY}" fill="{fills[0]}"/>'
            f'<circle cx="146" cy="136" r="12" fill="{fills[1]}"/>'
            f'<path d="{LAND}" fill="#454545"/></g>'
            f'<path d="{TOP}" fill="{fills[2]}"/><path d="{LOW}" fill="{fills[3]}"/>')


for mode in ('gradient', 'flat'):
    write(f'assets/naeil-gray-{mode}.svg', svg(gray('asset', mode == 'flat'), 256, 256), 4)

style = '<style>text{font-family:Apple SD Gothic Neo,Arial,sans-serif;fill:#303030}</style>'
board = ['<rect width="1440" height="940" fill="#F3F2EF"/>', style,
         '<text x="48" y="62" font-size="30">회색의 깊이로 표현한 섬</text>',
         '<text x="48" y="102" font-size="17">능선의 틈을 없애고, 밝은 하늘과 짙은 섬의 명도 차이로 풍경을 살렸습니다.</text>']
for i, (mode, label, caption) in enumerate([
        ('color', '기준 · 컬러', '선택한 색과 형태'),
        ('gradient', 'A · 은은한 회색 그라데이션', '노을의 빛과 수면의 반사를 유지'),
        ('flat', 'B · 단계별 회색 면', '지형을 더 간결하고 또렷하게')]):
    x = 48 + i*456
    body = mark('color') if mode == 'color' else gray('main'+mode, mode == 'flat')
    small = mark('dark', 'dark') if mode == 'color' else gray('dark'+mode, mode == 'flat')
    board += [f'<rect x="{x}" y="142" width="432" height="492" fill="#FFFFFF"/>',
              f'<text x="{x+24}" y="185" font-size="17">{label}</text>',
              placed(body, x+20, 193, 392),
              f'<text x="{x+216}" y="558" font-size="47" text-anchor="middle" letter-spacing="-1.5">naeil</text>',
              f'<text x="{x+216}" y="607" font-size="16" text-anchor="middle">{caption}</text>',
              f'<rect x="{x}" y="658" width="432" height="202" fill="#252525"/>',
              placed(small, x+18, 657, 200),
              f'<text x="{x+235}" y="776" font-size="40" letter-spacing="-1" style="fill:#EFEFEF">naeil</text>']
board += ['<text x="48" y="907" font-size="14">그레이스케일 탐색안 · 워드마크는 배치 확인용</text>']
write('comparison.svg', svg(''.join(board), 1440, 940), 2)

proof = ['<rect width="960" height="460" fill="#FFFFFF"/>', style]
for i, mode in enumerate(('gradient', 'flat')):
    x = i*480
    proof += [placed(gray('large'+mode, mode == 'flat'), x+125, 0, 230)]
    for j, size in enumerate((16, 24, 32, 64, 128)):
        xpos = x+22+j*85
        proof += [placed(gray(f'p{mode}{size}', mode == 'flat'), xpos, 245, size),
                  f'<text x="{xpos}" y="420" font-size="13">{size}px</text>']
        subprocess.run(['rsvg-convert', '-w', str(size), '-h', str(size),
                        str(P/f'assets/naeil-gray-{mode}.svg'), '-o',
                        str(P/f'assets/{mode}-{size}.png')], check=True)
write('proof.svg', svg(''.join(proof), 960, 460))
