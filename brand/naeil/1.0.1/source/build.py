"""Rebuild naeil brand assets: Python 3 + fontTools + Pillow + hb-shape + rsvg-convert.
Run from any directory. Artwork and font sources are bundled locally.
"""
from pathlib import Path
import hashlib
import json
import re
import struct
import subprocess
from PIL import Image
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'source'
for directory in ('svg', 'png', 'icons'):
    (ROOT / directory).mkdir(exist_ok=True)
FONT = SRC / 'fonts/Lato-Regular.ttf'
font = TTFont(FONT)
glyphs = font.getGlyphSet()
order = font.getGlyphOrder()
shape = json.loads(subprocess.check_output(['hb-shape', str(FONT), 'naeil', '--output-format=json'], text=True))
cursor, parts, boxes = 0, [], []
for item in shape:
    name = order[int(item['g'][3:])] if item['g'].startswith('gid') else item['g']
    pen, bounds = SVGPathPen(glyphs), BoundsPen(glyphs)
    glyphs[name].draw(pen)
    glyphs[name].draw(bounds)
    dx, dy = cursor + item['dx'], item['dy']
    parts.append(f'<path d="{pen.getCommands()}" transform="translate({dx} {dy})"/>')
    a, b, c, d = bounds.bounds
    boxes.append((a + dx, b + dy, c + dx, d + dy))
    cursor += item['ax']
BOUNDS = (min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes))
n_bounds = BoundsPen(glyphs)
glyphs[font.getBestCmap()[ord('n')]].draw(n_bounds)
XHEIGHT = n_bounds.bounds[3]
PATHS = ''.join(parts)
MODES = ('color', 'color-dark', 'gray', 'gray-dark')


def word(x, cy, xheight, ink, center=False):
    scale = xheight / XHEIGHT
    anchor = (BOUNDS[0] + BOUNDS[2]) / 2 if center else BOUNDS[0]
    origin = x - anchor * scale
    baseline = cy + (BOUNDS[1] + BOUNDS[3]) / 2 * scale
    return f'<g fill="{ink}" transform="translate({origin:.8f} {baseline:.8f}) scale({scale:.10f} {-scale:.10f})">{PATHS}</g>'


def symbol(mode, small=False):
    text = (SRC / 'symbols' / f'naeil-{mode}{"-small" if small else ""}.svg').read_text()
    return text[text.index('<defs>'):text.rindex('</svg>')]


def placed(body, x, y, size):
    return f'<svg x="{x}" y="{y}" width="{size}" height="{size}" viewBox="24 30 208 208">{body}</svg>'


def save(name, body, width, height, viewbox=None):
    # Each file has a unique namespace; <img> also isolates repeated instances.
    prefix = re.sub(r'[^a-zA-Z0-9-]', '-', name)
    body = body.replace('naeil-', prefix + '-')
    viewbox = viewbox or f'0 0 {width} {height}'
    text = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
            f'viewBox="{viewbox}" role="img" aria-label="naeil">'
            f'<title>naeil</title>{body}</svg>\n')
    target = ROOT / name
    target.write_text(text)
    return target


def raster(svg, width, target):
    subprocess.run(['rsvg-convert', str(svg), '-w', str(width), '-o', str(target)], check=True)


assets = []
for mode in MODES:
    ink = '#F0F0F0' if mode == 'gray-dark' else '#F3F0E9' if mode == 'color-dark' else '#303030' if mode == 'gray' else '#263C4B'
    for small in (False, True):
        name = f'naeil-symbol-{mode}{"-small" if small else ""}'
        file = save(f'svg/{name}.svg', symbol(mode, small), 512, 512, '24 30 208 208')
        sizes = (16, 20, 24, 28, 32, 48) if small else (64, 128, 512, 2048, 4096)
        for size in sizes:
            raster(file, size, ROOT / 'png' / f'{name}-{size}.png')
        assets.append({'file': str(file.relative_to(ROOT)), 'use': 'symbol', 'small': small})
    for kind, size, gap, xh in [('horizontal', 28, 8, 14), ('footer', 20, 6, 10)]:
        width = round(2 + size + gap + (BOUNDS[2] - BOUNDS[0]) * xh / XHEIGHT, 6)
        body = placed(symbol(mode, True), 1, 0, size) + word(1 + size + gap, size / 2, xh, ink)
        file = save(f'svg/naeil-{kind}-{mode}.svg', body, width, size)
        for multiple in (1, 2, 4):
            # Integer PNG canvas, preserving proportions. SVG is the pixel-precise UI default.
            raster(file, round(width * multiple), ROOT / 'png' / f'naeil-{kind}-{mode}-{multiple}x.png')
        if kind == 'horizontal':
            raster(file, 1440, ROOT / 'png' / f'naeil-{kind}-{mode}-1440.png')
        assets.append({'file': str(file.relative_to(ROOT)), 'use': kind, 'width': width,
                       'height': size, 'symbol_box': size, 'symbol_word_gap': gap, 'lowercase_body_height': xh})
    body = placed(symbol(mode), 64, 0, 384) + word(256, 379, 40, ink, center=True)
    file = save(f'svg/naeil-stacked-{mode}.svg', body, 512, 448)
    for width in (1024, 4096):
        raster(file, width, ROOT / 'png' / f'naeil-stacked-{mode}-{width}.png')
    assets.append({'file': str(file.relative_to(ROOT)), 'use': 'stacked', 'width': 512, 'height': 448})
    xh = 90
    width = round((BOUNDS[2] - BOUNDS[0]) * xh / XHEIGHT + 16, 6)
    height = round((BOUNDS[3] - BOUNDS[1]) * xh / XHEIGHT + 16, 6)
    file = save(f'svg/naeil-wordmark-{mode}.svg', word(8, height / 2, xh, ink), width, height)
    raster(file, 1600, ROOT / 'png' / f'naeil-wordmark-{mode}-1600.png')
    assets.append({'file': str(file.relative_to(ROOT)), 'use': 'wordmark', 'width': width, 'height': height})

# Adaptive SVG favicon: dark mode follows the browser/OS, independently of app theme.
light = symbol('color', True).replace('naeil-', 'light-')
dark = symbol('color-dark', True).replace('naeil-', 'dark-')
css = '<style>.on-dark{display:none}@media(prefers-color-scheme:dark){.on-light{display:none}.on-dark{display:inline}}</style>'
save('icons/favicon.svg', css + f'<g class="on-light">{light}</g><g class="on-dark">{dark}</g>', 32, 32, '24 30 208 208')

# ICO has no automatic theme switch. A solid warm plate keeps it readable in either toolbar.
plate = '<rect width="256" height="256" fill="#F5F2EB"/>'
fallback = save('icons/favicon-fallback.svg', plate + placed(symbol('color', True), 0, 0, 256), 256, 256)
entries, payload = [], []
offset = 6 + 3 * 16
for size in (16, 32, 48):
    dest = ROOT / 'icons' / f'favicon-{size}.png'
    raster(fallback, size, dest)
    # ICO decoders in Next.js require an RGBA PNG even with an opaque background.
    Image.open(dest).convert("RGBA").save(dest)
    data = dest.read_bytes()
    entries.append(struct.pack('<BBBBHHII', size, size, 0, 0, 1, 32, len(data), offset))
    payload.append(data)
    offset += len(data)
(ROOT / 'icons/favicon.ico').write_bytes(struct.pack('<HHH', 0, 1, 3) + b''.join(entries) + b''.join(payload))
app = save('icons/app-icon.svg', plate + placed(symbol('color'), 0, 0, 256), 256, 256)
for size, name in [(180, 'apple-touch-icon.png'), (192, 'icon-192.png'), (512, 'icon-512.png')]:
    raster(app, size, ROOT / 'icons' / name)
# Symbol fits inside the central 80%-diameter safe circle for maskable app icons.
maskable = save('icons/maskable-icon.svg', plate + placed(symbol('color'), 36, 36, 184), 256, 256)
raster(maskable, 512, ROOT / 'icons/icon-maskable-512.png')
(ROOT / 'icons/site.webmanifest').write_text(json.dumps({
    'name': 'naeil', 'short_name': 'naeil', 'display': 'standalone',
    'background_color': '#F5F2EB', 'theme_color': '#F5F2EB',
    'icons': [{'src': 'icon-192.png', 'sizes': '192x192', 'type': 'image/png', 'purpose': 'any'},
              {'src': 'icon-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'any'},
              {'src': 'icon-maskable-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'}]
}, indent=2) + '\n')

manifest = {'version': '1.0.1', 'date': '2026-10-11', 'wordmark': {'family': 'Lato', 'weight': 400,
            'spacing': 'HarfBuzz font-defined positioning; no manual pair offsets', 'text': 'naeil',
            'font_sha256': hashlib.sha256(FONT.read_bytes()).hexdigest(), 'glyph_positions': shape},
            'assets': assets, 'color_modes': list(MODES),
            'minimum_sizes': {'symbol-small': 16, 'symbol-standard': 48, 'horizontal_height': 24,
                              'footer_height': 20, 'stacked_width': 160},
            'clear_space': 'At least 25% of the symbol box on each side; header: 7px, footer: 5px.',
            'gray': 'Continuous-tone grayscale A; not a binary one-ink stamp.'}
(ROOT / 'asset-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(f'Built {len(assets)} logo SVGs, favicon/app icons, PNG exports and manifest.')
