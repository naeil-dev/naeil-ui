"""Render meaning-first sketches for discussion; no final logo integration."""
from pathlib import Path
import html
import shutil
import subprocess

ROOT = Path(__file__).resolve().parent
ASSETS = ROOT / "sketches"
ASSETS.mkdir(exist_ok=True)
PAPER, INK, SUN = "#fffaf4", "#4b3b32", "#de9148"
SVG_START = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72" width="72" height="72">'
SHAPES = {
    "a1-horizon": (
        '<path d="M29 48A11 11 0 0 1 51 48Z" fill="#de9148"/>'
        '<path d="M13 12V43Q13 48 18 48H57" fill="none" stroke="#4b3b32" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>'),
    "a2-rising": (
        '<circle cx="41" cy="31" r="11" fill="#de9148"/>'
        '<path d="M13 12V43Q13 48 18 48H57" fill="none" stroke="#4b3b32" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>'),
    "b1-welcome": (
        '<circle cx="40" cy="34" r="10" fill="#de9148"/>'
        '<path d="M12 15V35Q12 51 28 51H58" fill="none" stroke="#4b3b32" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>'),
    "b2-light-space": (
        '<circle cx="45" cy="24" r="10" fill="#de9148"/>'
        '<path d="M34 40L28 46" fill="none" stroke="#de9148" stroke-width="3" stroke-linecap="round"/>'
        '<path d="M12 14V37Q12 51 26 51H56" fill="none" stroke="#4b3b32" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>'),
    "c1-first-step": (
        '<circle cx="47" cy="26" r="10" fill="#de9148"/>'
        '<path d="M12 13V49H32V42H58" fill="none" stroke="#4b3b32" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>'),
    "c2-daybreak-path": (
        '<path d="M38 39A11 11 0 0 1 60 39Z" fill="#de9148"/>'
        '<path d="M12 13V44Q12 49 18 49H28C37 49 38 39 48 39H60" fill="none" stroke="#4b3b32" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>')
}
for name, shape in SHAPES.items():
    (ASSETS / (name + ".svg")).write_text(
        SVG_START + f"<title>naeil meaning sketch — {name}</title>" + shape + "</svg>\n",
        encoding="utf-8")


def text(x, y, value, size=18, color=INK, weight=400):
    return (f'<text x="{x}" y="{y}" font-size="{size}" fill="{color}" '
            f'font-weight="{weight}">{html.escape(value)}</text>')


def line(x1, y1, x2, y2, color="#e6d9cb"):
    return f'<path d="M{x1} {y1}H{x2}" stroke="{color}"/>' if y1 == y2 else (
        f'<path d="M{x1} {y1}L{x2} {y2}" stroke="{color}"/>')


def scene_a(x):
    return f'''<g transform="translate({x} 275)">
      <rect width="432" height="190" fill="#f8ebd8"/>
      <path d="M0 135H432V190H0Z" fill="#eee0ce"/>
      <path d="M165 135A55 55 0 0 1 275 135Z" fill="{SUN}"/>
      <path d="M24 135H407" stroke="#ab8f75" stroke-width="2" fill="none"/>
      <path d="M44 149H107M308 162H374" stroke="#d3b997" stroke-width="2" fill="none"/>
    </g>'''


def scene_b(x):
    return f'''<g transform="translate({x} 275)">
      <rect width="432" height="190" fill="#f7eddf"/>
      <path d="M85 16V133Q85 159 112 159H397" stroke="#ad9278" stroke-width="3" fill="none"/>
      <path d="M375 40L150 156H251L396 61Z" fill="#efd2a7"/>
      <circle cx="341" cy="67" r="34" fill="{SUN}"/>
      <path d="M116 169H389" stroke="#dfc5a5" fill="none"/>
    </g>'''


def scene_c(x):
    return f'''<g transform="translate({x} 275)">
      <rect width="432" height="190" fill="#f8ebd8"/>
      <path d="M0 146H121C207 146 199 113 276 113H432V190H0Z" fill="#e7d3b9"/>
      <path d="M13 146H121C207 146 199 113 276 113H417" stroke="#ad9278" stroke-width="3" fill="none"/>
      <path d="M282 113A42 42 0 0 1 366 113Z" fill="{SUN}"/>
    </g>'''


columns = [
    ("A · 다시 뜨는 해", "다시 시작할 수 있는 내일", "어제와 상관없이, 새로운 하루가 옵니다.",
     "다시 시작 · 희망 · 고요함",
     ("a1-horizon", "지평선에서 시작하는 해"), ("a2-rising", "조금 더 떠오른 해"),
     "확인할 것: 일출의 시작으로 느껴지는가?", scene_a),
    ("B · 빛을 맞는 자리", "나를 반겨주는 내일", "열린 자리에 햇빛과 여유가 들어옵니다.",
     "따뜻함 · 환대 · 편안함",
     ("b1-welcome", "해를 받아들이는 ㄴ"), ("b2-light-space", "빈 자리로 들어오는 빛"),
     "확인할 것: 따뜻함이 ㄴ에서도 느껴지는가?", scene_b),
    ("C · 새 아침으로", "한 걸음부터 시작하는 내일", "작은 시작이 다음 아침으로 이어집니다.",
     "새출발 · 작은 변화 · 기대",
     ("c1-first-step", "작은 한 칸과 해"), ("c2-daybreak-path", "아침으로 이어지는 선"),
     "확인할 것: 성과보다 시작으로 읽히는가?", scene_c),
]
parts = [f'<svg xmlns="http://www.w3.org/2000/svg" width="1560" height="1000" viewBox="0 0 1560 1000">',
         f'<rect width="1560" height="1000" fill="{PAPER}"/>',
         '<g font-family="Pretendard, Apple SD Gothic Neo, sans-serif">',
         text(64, 45, "naeil · 내일 / 의미 탐색", 18, "#806954"),
         text(64, 104, "내일은 다시 시작할 수 있는 따뜻한 여지", 34, INK, 600),
         text(64, 146, "ㄴ + 해를 출발점으로, 로고의 완성도보다 담고 싶은 장면과 감정을 비교합니다.", 18, "#806954"),
         line(64, 176, 1496, 176)]
for index, (title, premise, story, emotions, s1, s2, question, scene) in enumerate(columns):
    x = 64 + index * 488
    if index:
        parts.append(line(x-28, 218, x-28, 864))
    parts.extend([text(x, 220, title, 24, INK, 600),
                  text(x, 254, premise, 18, "#806954"), scene(x),
                  text(x, 505, story, 17), text(x, 535, emotions, 16, "#806954"),
                  text(x, 588, "의미를 옮겨보는 러프 스케치", 14, "#806954")])
    for j,(name,label) in enumerate((s1,s2)):
        sx=x+28+j*216
        parts.append(f'<g transform="translate({sx} 610) scale(1.9)">{SHAPES[name]}</g>')
        parts.append(text(sx-8, 777, label, 15, "#806954"))
    parts.append(text(x, 827, question, 15))
parts.extend([line(64, 891, 1496, 891),
              text(64, 925, "현재 가설: A의 ‘다시 뜨는 해’에 B의 ‘빛을 맞는 자리’가 주는 편안함을 더해보기.", 18),
              text(64, 960, "색과 선은 임시 표현입니다. 다음에는 마음에 가까운 장면 하나를 골라 ㄴ과 해의 관계를 다듬습니다.", 15, "#806954"),
              "</g></svg>"])
(ROOT/"meaning-board.svg").write_text("\n".join(parts)+"\n",encoding="utf-8")
renderer=shutil.which("rsvg-convert")
if not renderer:
    raise SystemExit("SVG sketches saved; PNG rendering needs local rsvg-convert")
subprocess.run([renderer,"-o",str(ROOT/"meaning-board.png"),str(ROOT/"meaning-board.svg")],check=True)
print("Wrote 6 original meaning sketches and meaning-board.svg/png")
