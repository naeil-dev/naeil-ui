"""Rebuild review SVG variants and PNGs with local librsvg and Pillow.

Run from any directory: python3 docs/design/logo-study-2026-10-09/build_review.py
Artwork inputs are original SVGs in assets/. No network or production changes.
"""
from pathlib import Path
import copy
import hashlib
import io
import json
import shutil
import subprocess
import xml.etree.ElementTree as ET

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
ASSETS = ROOT / "assets"
NS = "http://www.w3.org/2000/svg"
ET.register_namespace("", NS)
INK, PAPER, DARK, REVERSED = "#191919", "#fafafa", "#181818", "#f1f1f1"
CONCEPTS = [
    ("a-next-frame", "A · 다음 칸", "한글 ㄴ에서 출발한 열린 형태", "한국어 이름의 연결성", "프레임 아이콘으로 읽힐 가능성"),
    ("b-open-n", "B · 열린 n", "둥근 어깨에 남긴 비스듬한 틈", "추천 · 단단한 형태와 작은 특징", "일반 n 모노그램과의 구별이 과제"),
    ("c-ae-link", "C · 이름의 이음", "ae를 이어 이름에 개성을 더함", "워드마크를 중심에 두는 방향", "독립 심벌은 ae로 읽힘"),
]
RENDERER = shutil.which("rsvg-convert")
if not RENDERER:
    raise SystemExit("rsvg-convert is required; no installation was attempted")


def read(name):
    return ET.parse(ASSETS / (name + ".svg")).getroot()


def write(name, tree):
    ET.indent(tree, space="  ")
    ET.ElementTree(tree).write(ASSETS / (name + ".svg"), encoding="utf-8", xml_declaration=True)


def reverse(name):
    root = read(name)
    root.set("color", REVERSED)
    write(name + "-reversed", root)


def render(name, width, height):
    root = read(name)
    root.set("width", str(width))
    root.set("height", str(height))
    root.set("preserveAspectRatio", "xMidYMid meet")
    result = subprocess.run([RENDERER], input=ET.tostring(root),
                            capture_output=True, timeout=20, check=True)
    return Image.open(io.BytesIO(result.stdout)).convert("RGBA")


def lettering_c():
    root = read("naeil-wordmark")
    root.set("viewBox", "0 0 168 64")
    root.set("width", "168")
    root.find(f"{{{NS}}}title").text = "naeil — linked ae lettering study"
    root.find(f"{{{NS}}}desc").text = "Original name lettering with the a and e joined by a shared stroke."
    glyphs = root.find(f"{{{NS}}}g")
    for index, path in enumerate(glyphs):
        if index >= 2:
            path.set("transform", "translate(-13 0)")
    write("c-wordmark", root)


def lockup(mark):
    if mark == "c-ae-link":
        # Wordmark-led direction: no repeated ae prefix in the primary logo.
        write(mark + "-logo", read("c-wordmark"))
        return
    root = ET.Element(f"{{{NS}}}svg", {
        "viewBox": "0 0 260 64", "width": "260", "height": "64",
        "color": INK, "role": "img", "aria-label": "naeil"})
    ET.SubElement(root, f"{{{NS}}}title").text = "naeil — " + mark
    ET.SubElement(root, f"{{{NS}}}desc").text = "Original mark with font-independent lowercase naeil lettering."
    for child in read(mark):
        if child.tag == f"{{{NS}}}g":
            root.append(copy.deepcopy(child))
    letters = copy.deepcopy(read("naeil-wordmark").find(f"{{{NS}}}g"))
    letters.set("transform", "translate(76 0)")
    root.append(letters)
    write(mark + "-logo", root)


def font(size):
    return ImageFont.truetype("/System/Library/Fonts/AppleSDGothicNeo.ttc", size)


def paste(canvas, name, x, y, width, height):
    image = render(name, width, height)
    canvas.paste(image, (x, y), image)


def overview():
    canvas = Image.new("RGB", (1440, 920), PAPER)
    draw = ImageDraw.Draw(canvas)
    draw.text((56, 35), "naeil / identity study 01", fill=INK, font=font(20))
    draw.text((56, 82), "차분하지만 독특한 제품 브랜드", fill=INK, font=font(36))
    draw.text((56, 140), "내일의 의미에서 출발해, 이름과 형태로 개성을 만듭니다.", fill="#595959", font=font(18))
    paste(canvas, "current-mark", 1216, 52, 56, 56)
    draw.text((1160, 122), "현재 로고", fill="#595959", font=font(15))
    draw.line((56, 195, 1384, 195), fill="#dcdcdc", width=1)
    for index, (name, title, premise, benefit, risk) in enumerate(CONCEPTS):
        x = 56 + index * 448
        if index:
            draw.line((x - 28, 232, x - 28, 856), fill="#e1e1e1", width=1)
        draw.text((x, 224), title, fill=INK, font=font(22))
        draw.text((x, 265), premise, fill="#595959", font=font(16))
        paste(canvas, name, x + 132, 304, 144, 144)
        word = "c-wordmark" if index == 2 else "naeil-wordmark"
        word_width = 168 if index == 2 else 180
        paste(canvas, word, x + (400 - word_width * 2) // 2, 448, word_width * 2, 128)
        draw.text((x, 578), benefit, fill=INK, font=font(16))
        draw.text((x, 606), risk, fill="#666666", font=font(14))
        small_x = x
        for size in (16, 24, 32, 64):
            asset = name + "-micro" if name == "b-open-n" and size == 16 else name
            paste(canvas, asset, small_x, 690 - size, size, size)
            draw.text((small_x, 702), f"{size}px", fill="#666666", font=font(13))
            small_x += size + 32
        for dark, y in ((False, 746), (True, 808)):
            background, foreground = (DARK, REVERSED) if dark else ("#ededed", INK)
            draw.rectangle((x, y, x + 399, y + 47), fill=background)
            logo = name + "-logo" + ("-reversed" if dark else "")
            width = 84 if index == 2 else 130
            paste(canvas, logo, x + 16, y + 8, width, 32)
            draw.text((x + 316, y + 14), "제품  소개", fill=foreground, font=font(13))
    draw.text((56, 878), "원본 SVG · 단색 비교 · B는 16px 전용 형태 적용 · 최종 선택 전 검토 시안", fill="#666666", font=font(14))
    canvas.save(ROOT / "overview.png")


def pixel_proof():
    canvas = Image.new("RGB", (1280, 916), "#eeeeee")
    draw = ImageDraw.Draw(canvas)
    draw.text((24, 24), "naeil / 실제 크기와 16px 픽셀 확대", fill=INK, font=font(22))
    rows = [("a-next-frame", "A · 다음 칸"), ("b-open-n", "B · 표준 형태"),
            ("b-open-n-micro", "B · 16px 보정"), ("c-ae-link", "C · 이름의 이음")]
    evidence = {}
    for index, (name, title) in enumerate(rows):
        y = 80 + index * 200
        draw.text((24, y), title, fill=INK, font=font(18))
        evidence[name] = {}
        for dark, x in ((False, 230), (True, 760)):
            draw.rectangle((x, y, x + 495, y + 167), fill=DARK if dark else PAPER)
            px = x + 20
            for size in (16, 20, 24, 32, 64):
                asset = name + ("-reversed" if dark else "")
                image = render(asset, size, size)
                canvas.paste(image, (px, y + 99 - size), image)
                draw.text((px, y + 111), f"{size}px", fill=REVERSED if dark else "#595959", font=font(13))
                if not dark:
                    evidence[name][str(size)] = {
                        "dimensions": list(image.size), "alpha_bounds": list(image.getchannel("A").getbbox()),
                        "nonempty": image.getchannel("A").getbbox() is not None}
                px += size + 24
            small = render(name + ("-reversed" if dark else ""), 16, 16)
            enlarged = small.resize((128, 128), Image.Resampling.NEAREST)
            canvas.paste(enlarged, (x + 345, y + 20), enlarged)
            draw.text((x + 345, y + 151), "16px × 8", fill=REVERSED if dark else "#595959", font=font(12))
    canvas.save(ROOT / "pixel-proof.png")
    return evidence


lettering_c()
for name, *_ in CONCEPTS:
    lockup(name)
    reverse(name)
    reverse(name + "-logo")
reverse("b-open-n-micro")
reverse("current-mark")
reverse("naeil-wordmark")
reverse("c-wordmark")
overview()
evidence = pixel_proof()
sources = {}
for path in sorted(ASSETS.glob("*.svg")):
    root = ET.parse(path).getroot()
    tags = {node.tag.split("}")[-1] for node in root.iter()}
    external = [value for node in root.iter() for key, value in node.attrib.items()
                if key.split("}")[-1] == "href" and not value.startswith("#")]
    assert not (tags & {"text", "image", "script", "foreignObject"})
    assert not external
    sources[path.name] = hashlib.sha256(path.read_bytes()).hexdigest()
manifest = {
    "date": "2026-10-09", "tools": ["hand-authored SVG", "librsvg rsvg-convert", "Python/Pillow"],
    "source_sha256": sources, "raster_dimensions_and_bounds": evidence,
    "structural_checks": "All review SVGs parsed, with no text/font/raster/external dependencies",
    "scope": "Local candidate proofs; no production component replacement",
    "visual_review": "Inspect overview.png and pixel-proof.png; this manifest records structural/pixel facts only"
}
(ROOT / "verification.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
print(f"Rebuilt {len(sources)} SVG review assets, overview.png and pixel-proof.png")
