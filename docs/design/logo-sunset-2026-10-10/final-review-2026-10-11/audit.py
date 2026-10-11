"""Structural/export audit for the final standalone brand kit."""
from pathlib import Path
import hashlib
import json
import re
import xml.etree.ElementTree as ET
from PIL import Image

ROOT = Path(__file__).resolve().parents[4] / 'brand/naeil/1.0.0'
OUT = Path(__file__).resolve().parent
ns = {'s': 'http://www.w3.org/2000/svg'}
svgs = list((ROOT / 'svg').glob('*.svg')) + list((ROOT / 'icons').glob('*.svg'))
for path in svgs:
    root = ET.parse(path).getroot()
    assert not root.findall('.//s:text', ns), path
    assert not root.findall('.//s:image', ns), path
    assert not root.findall('.//s:script', ns), path
    ids = [e.get('id') for e in root.iter() if e.get('id')]
    assert len(ids) == len(set(ids)), path
    refs = re.findall(r'url\(#([^\)]+)\)', path.read_text())
    assert all(ref in ids for ref in refs), (path, refs)
    assert all(not any(key.endswith('href') for key in e.attrib) for e in root.iter()), path
    for e in root.iter():
        if 'gray' in path.name:
            for key in ('fill', 'stop-color'):
                value = e.get(key, '')
                if re.fullmatch('#[a-fA-F0-9]{6}', value):
                    assert value[1:3] == value[3:5] == value[5:7], (path, value)

pngs = list((ROOT / 'png').glob('*.png'))
png_info = []
for path in pngs:
    im = Image.open(path).convert('RGBA')
    alpha = im.getchannel('A')
    assert alpha.getextrema()[0] == 0 and alpha.getextrema()[1] > 0, path
    # Ignore negligible antialiasing fringe; meaningful ink must not touch the edge.
    bounds = alpha.point(lambda x: 255 if x > 8 else 0).getbbox()
    assert bounds and bounds[0] > 0 and bounds[1] > 0 and bounds[2] < im.width and bounds[3] < im.height, (path, bounds, im.size)
    png_info.append({'file': str(path.relative_to(ROOT)), 'size': im.size, 'ink_bounds': bounds})

ico = Image.open(ROOT / 'icons/favicon.ico')
assert ico.ico.sizes() == {(16, 16), (32, 32), (48, 48)}
for size in (16, 32, 48):
    decoded = ico.ico.getimage((size, size)).convert('RGBA')
    expected = Image.open(ROOT / f'icons/favicon-{size}.png').convert('RGBA')
    assert decoded.tobytes() == expected.tobytes()

for source in json.loads((ROOT / 'licenses/sources.json').read_text()):
    path = ROOT / ('licenses/Lato-OFL.txt' if source['file'] == 'OFL.txt' else 'source/fonts/Lato-Regular.ttf')
    assert hashlib.sha256(path.read_bytes()).hexdigest() == source['sha256']

mask = Image.open(ROOT / 'icons/icon-maskable-512.png').convert('RGB')
bg = (245, 242, 235)
furthest = 0
for y in range(mask.height):
    for x in range(mask.width):
        if max(abs(a - b) for a, b in zip(mask.getpixel((x, y)), bg)) > 8:
            furthest = max(furthest, ((x + .5 - 256)**2 + (y + .5 - 256)**2)**.5)
assert furthest <= .4 * 512, furthest

def luminance(color):
    nums = [int(color[i:i+2], 16) / 255 for i in (1, 3, 5)]
    linear = [n / 12.92 if n <= .04045 else ((n + .055) / 1.055)**2.4 for n in nums]
    return sum(n * w for n, w in zip(linear, (.2126, .7152, .0722)))

contrasts = []
for fg, bg in [('#263C4B', '#F5F6F8'), ('#F3F0E9', '#090B0C'), ('#303030', '#F5F6F8'), ('#F0F0F0', '#090B0C')]:
    a, b = sorted([luminance(fg), luminance(bg)])
    ratio = (b + .05) / (a + .05)
    assert ratio >= 4.5
    contrasts.append({'foreground': fg, 'background': bg, 'ratio': round(ratio, 2)})

result = {'svg_count': len(svgs), 'transparent_png_count': len(pngs), 'external_image_or_font_dependencies': 0,
          'missing_or_duplicate_svg_ids': 0, 'clipped_pngs': 0, 'grayscale_rgb_channels_equal': True,
          'ico_sizes': [16, 32, 48], 'ico_matches_dedicated_size_rasters': True,
          'maskable_foreground_max_radius': furthest, 'maskable_safe_radius': 204.8,
          'font_license_hashes_match': True, 'wordmark_contrast': contrasts, 'pngs': png_info}
(OUT / 'structural-results.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({k:v for k,v in result.items() if k != 'pngs'}))
