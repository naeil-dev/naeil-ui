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


for mode in ('color', 'dark', 'mono', 'reverse'):
    write(f'assets/naeil-islands-{mode}.svg', svg(
        '<title>naeil — 하루를 담은 노을, 섬 세부 조정</title>' + mark('asset', mode), 256, 256), 4)
write('assets/naeil-smooth-no-islands.svg', svg(mark('plain', islands=False), 256, 256), 4)

style = '<style>text{font-family:Apple SD Gothic Neo,Arial,sans-serif;fill:#263C4B}.muted{fill:#6C777C}</style>'
board = ['<rect width="1440" height="1020" fill="#F5F2EB"/>', style,
         '<text x="64" y="61" font-size="16" letter-spacing="3">NAEIL / A QUIET SHORE</text>',
         '<text x="64" y="112" font-size="32">섬의 능선을 조금 더 또렷하게</text>',
         '<text x="64" y="149" font-size="17" class="muted">섬의 높이와 굴곡을 키우고, 해 주변의 열린 공간은 유지했습니다.</text>']
previous = (P.parent / 'refinement-islands/assets/naeil-islands-color.svg').read_text()
old_body = previous[previous.index('<defs>'):previous.rindex('</svg>')].replace('asset-', 'old-')
for x, label, body in [(64, '이전 — 낮은 섬', old_body), (734, '조정 — 더 드러난 섬', mark('new'))]:
    board += [f'<rect x="{x}" y="190" width="642" height="540" fill="#FFFEFA"/>',
              f'<text x="{x+30}" y="236" font-size="17" class="muted">{label}</text>',
              placed(body, x+115, 246, 412),
              f'<text x="{x+321}" y="668" font-size="49" letter-spacing="-1.5" text-anchor="middle">naeil</text>']
board += ['<rect x="64" y="752" width="642" height="195" fill="#152E43"/>',
          placed(mark('dark', 'dark'), 109, 743, 206),
          '<text x="340" y="866" font-size="48" style="fill:#F6F0E7" letter-spacing="-1.5">naeil</text>',
          '<rect x="734" y="752" width="642" height="195" fill="#E8E6DF"/>',
          placed(mark('mono', 'mono'), 779, 743, 206),
          '<text x="1010" y="844" font-size="20">단색에서는 풍경을 단순화</text>',
          '<text x="1010" y="879" font-size="15" class="muted">섬은 하늘과 합쳐지고 해와 수면만 남습니다.</text>',
          '<text x="64" y="989" font-size="14" class="muted">선택안의 세부 조정 · 워드마크는 배치 확인용 · 제품 적용 전</text>']
write('comparison.svg', svg(''.join(board), 1440, 1020), 2)
write('preview.svg', svg('<rect width="800" height="720" fill="#FFFEFA"/>' + style +
                        placed(mark('hero'), 92, -4, 616) +
                        '<text x="400" y="604" font-size="66" letter-spacing="-2" text-anchor="middle">naeil</text>', 800, 720), 2)

proof = ['<rect width="1200" height="570" fill="#FFFEFA"/>', style,
         '<text x="30" y="40" font-size="20">곡선 · 배경 · 크기 예비 확인</text>']
for i, mode in enumerate(('color', 'dark', 'mono', 'reverse')):
    x = 30 + i * 295
    if mode in ('dark', 'reverse'):
        proof += [f'<rect x="{x}" y="60" width="265" height="465" fill="#152E43"/>']
    proof += [placed(mark('proof'+mode, mode), x+25, 70, 210)]
    for j, size in enumerate((16, 24, 32, 64)):
        proof += [placed(mark(f'p{mode}{size}', mode), x+12+j*61, 335, size),
                  f'<text x="{x+12+j*61}" y="435" font-size="12" style="fill:#879494">{size}px</text>']
write('proof.svg', svg(''.join(proof), 1200, 570))
for size in (16, 24, 32, 64):
    subprocess.run(['rsvg-convert', '-w', str(size), '-h', str(size),
                    str(P/'assets/naeil-islands-color.svg'), '-o', str(P/f'assets/islands-{size}.png')], check=True)
