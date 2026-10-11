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
        ink = '#000000' if mode == 'mono' else '#FFFFFF'
        # True transparent cuts, not white paint: works on any background.
        ridges = (LAND.split(' L117')[0] + ' ' +
                  'M166 155' + LAND.split('M166 155')[1].split(' L224')[0])
        return (f'<defs><mask id="{key}-cut" maskUnits="userSpaceOnUse" '
                'x="0" y="0" width="256" height="256" style="mask-type:luminance">'
                '<rect width="256" height="256" fill="white"/>'
                '<circle cx="146" cy="136" r="12" fill="black"/>'
                f'<path d="{ridges}" fill="none" stroke="black" stroke-width="5" '
                'stroke-linecap="round" stroke-linejoin="round"/></mask></defs>'
                f'<path fill="{ink}" d="{SKY}" mask="url(#{key}-cut)"/>'
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


for mode in ('color', 'mono', 'reverse'):
    write(f'assets/naeil-islands-{mode}.svg', svg(mark('asset', mode), 256, 256), 4)

style = '<style>text{font-family:Apple SD Gothic Neo,Arial,sans-serif;fill:#263C4B}</style>'
board = ['<rect width="1440" height="690" fill="#F5F2EB"/>', style,
         '<text x="48" y="63" font-size="30">흑백에서도 남는 섬의 능선</text>',
         '<text x="48" y="103" font-size="17">색의 차이를 가는 여백으로 바꾸어, 하늘과 섬을 구분했습니다.</text>']
for i, (mode, label, bg, ink) in enumerate([
        ('color', '컬러', '#FFFEFA', '#263C4B'),
        ('mono', '검정 · 단색', '#FFFFFF', '#000000'),
        ('reverse', '흰색 · 반전', '#152E43', '#FFFFFF')]):
    x = 48 + i*456
    board += [f'<rect x="{x}" y="142" width="432" height="472" fill="{bg}"/>',
              f'<text x="{x+24}" y="182" font-size="16" style="fill:{ink}">{label}</text>',
              placed(mark('board'+mode, mode), x+20, 191, 392),
              f'<text x="{x+216}" y="565" font-size="47" text-anchor="middle" letter-spacing="-1.5" style="fill:{ink}">naeil</text>']
board += ['<text x="48" y="656" font-size="14">단색의 선은 배경이 비치는 투명한 틈입니다. 서체는 배치 확인용입니다.</text>']
write('comparison.svg', svg(''.join(board), 1440, 690), 2)

proof = ['<rect width="960" height="470" fill="#F5F2EB"/>', style]
for i, mode in enumerate(('mono', 'reverse')):
    x = i*480
    bg, ink = ('#FFFFFF', '#000000') if mode == 'mono' else ('#152E43', '#FFFFFF')
    proof += [f'<rect x="{x}" width="480" height="470" fill="{bg}"/>',
              placed(mark('large'+mode, mode), x+125, 10, 230)]
    for j, size in enumerate((16, 24, 32, 64, 128)):
        xpos = x+22+j*85
        proof += [placed(mark(f's{mode}{size}', mode), xpos, 255, size),
                  f'<text x="{xpos}" y="425" font-size="13" style="fill:{ink}">{size}px</text>']
        subprocess.run(['rsvg-convert', '-w', str(size), '-h', str(size),
                        str(P/f'assets/naeil-islands-{mode}.svg'), '-o',
                        str(P/f'assets/{mode}-{size}.png')], check=True)
write('proof.svg', svg(''.join(proof), 960, 470))
