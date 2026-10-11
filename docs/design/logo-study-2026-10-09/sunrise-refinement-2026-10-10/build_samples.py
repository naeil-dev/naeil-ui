"""Compare refinements of the existing nieun + sunrise meaning."""
from pathlib import Path
import copy
import html
import json
import shutil
import subprocess
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent
ASSETS = ROOT / "assets"
ASSETS.mkdir(exist_ok=True)
NS = "http://www.w3.org/2000/svg"
ET.register_namespace("", NS)
INK, SUN = "#453a32", "#d58a43"
SHAPES = {
    "01-current-structure": (
        '<path d="M11.5 16A3.5 3.5 0 0 1 18.5 16Z" fill="#d58a43"/>'
        '<path d="M6 4V16H20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter"/>'),
    "02-soft-dawn": (
        '<path d="M10.5 17A4.3 4.3 0 0 1 19.1 17Z" fill="#d58a43"/>'
        '<path d="M5.5 4.5V13.5Q5.5 17 9 17H20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'),
    "03-rising-morning": (
        '<path d="M11.1054 17A4.2 4.2 0 1 1 18.4946 17Z" fill="#d58a43"/>'
        '<path d="M5.5 4.5V13.5Q5.5 17 9 17H20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>')
}
for name, shape in SHAPES.items():
    root = f'<svg xmlns="{NS}" viewBox="0 0 24 24" width="24" height="24" color="{INK}" role="img" aria-label="naeil sunrise sample">'
    (ASSETS / (name+".svg")).write_text(root+f"<title>naeil sunrise — {name}</title>"+shape+"</svg>\n",encoding="utf-8")
    reversed_root=ET.parse(ASSETS/(name+".svg")).getroot()
    reversed_root.set("color","#f1f1f1")
    ET.ElementTree(reversed_root).write(ASSETS/(name+"-reversed.svg"),encoding="utf-8",xml_declaration=True)
    mono=copy.deepcopy(reversed_root)
    mono.set("color",INK)
    for node in mono:
        if node.get("fill")==SUN:
            node.set("fill","currentColor")
    ET.ElementTree(mono).write(ASSETS/(name+"-mono.svg"),encoding="utf-8",xml_declaration=True)


def text(x,y,value,size=18,color="#453a32",weight=400):
    return f'<text x="{x}" y="{y}" fill="{color}" font-size="{size}" font-weight="{weight}">{html.escape(value)}</text>'


def mark(name,x,y,size,color=INK,mono=False):
    shape=SHAPES[name]
    if mono:
        shape=shape.replace(f'fill="{SUN}"','fill="currentColor"')
    return f'<g color="{color}" transform="translate({x} {y}) scale({size/24})">{shape}</g>'


columns=[
    ("01-current-structure","현재 구조","ㄴ + 지평선 위의 해","지금까지 담아온 의미를 비교 기준으로.", "현재 형태에 같은 임시 색을 적용"),
    ("02-soft-dawn","부드러운 새벽","ㄴ의 모서리와 끝을 부드럽게","반원은 유지하고, 해가 머무는 자리를 넓힙니다.", "기존 의미를 가장 가까이 이어감"),
    ("03-rising-morning","떠오르는 아침","해가 조금 더 떠오른 모습","더 드러난 해로 새 하루의 시작을 강조합니다.", "상승감과 따뜻함을 함께 살펴봄"),
]
parts=[f'<svg xmlns="{NS}" viewBox="0 0 1560 900" width="1560" height="900">',
       '<rect width="1560" height="900" fill="#fafafa"/>',
       '<g font-family="Pretendard, Apple SD Gothic Neo, sans-serif">',
       text(64,46,"naeil / ㄴ + 해 · 같은 의미를 이어 다듬기",18,"#76695f"),
       text(64,104,"다시 뜨는 해, 다시 시작할 수 있는 내일",34,INK,600),
       text(64,145,"이름의 ㄴ · 가로선의 지평선 · 새 하루의 해",18,"#76695f"),
       '<path d="M64 177H1496" stroke="#dedbd8"/>']
for index,(name,title,idea,description,note) in enumerate(columns):
    x=64+488*index
    if index:
        parts.append(f'<path d="M{x-28} 215V816" stroke="#e4e1de"/>')
    parts.extend([text(x,221,f"{index+1:02d} · {title}",24,INK,600),
                  text(x,255,idea,17,"#76695f"),
                  mark(name,x+116,290,200),
                  text(x,516,description,16),
                  text(x,546,note,15,"#76695f")])
    sx=x+8
    for size in (16,20,24,32):
        parts.extend([mark(name,sx,625-size,size),text(sx-1,655,f"{size}px",13,"#76695f")])
        sx+=size+35
    parts.append(mark(name,x+327,577,64,mono=True))
    parts.append(text(x+327,655,"단색",13,"#76695f"))
    parts.extend([f'<rect x="{x}" y="686" width="432" height="74" fill="#181818"/>',
                  mark(name,x+20,701,44,color="#f1f1f1"),
                  text(x+78,733,".naeil",26,"#f1f1f1",600),
                  text(x,802,"같은 색 · 같은 크기로 형태를 비교",14,"#76695f")])
parts.extend(['<path d="M64 840H1496" stroke="#dedbd8"/>',
              text(64,875,"현재 추천: 02의 부드러운 ㄴ을 바탕으로 해의 드러난 정도를 다듬기. 선·색·워드마크는 검토용입니다.",16,"#76695f"),
              '</g></svg>'])
(ROOT/"sunrise-samples.svg").write_text("\n".join(parts)+"\n",encoding="utf-8")
renderer=shutil.which("rsvg-convert")
if not renderer:
    raise SystemExit("SVG samples saved; PNG needs rsvg-convert")
subprocess.run([renderer,"-o",str(ROOT/"sunrise-samples.png"),str(ROOT/"sunrise-samples.svg")],check=True)
from PIL import Image
import io
checks={}
for name in SHAPES:
    checks[name]={}
    for size in (16,20,24,32):
        result=subprocess.run([renderer,"-w",str(size),"-h",str(size),str(ASSETS/(name+".svg"))],capture_output=True,check=True)
        with Image.open(io.BytesIO(result.stdout)) as image:
            assert image.size==(size,size)
            bounds=image.convert("RGBA").getchannel("A").getbbox()
            assert bounds and bounds[0]>0 and bounds[1]>0 and bounds[2]<size and bounds[3]<size
            checks[name][str(size)]={"dimensions":list(image.size),"alpha_bounds":list(bounds)}
(ROOT/"raster-checks.json").write_text(json.dumps(checks,indent=2)+"\n")
print("Saved current-structure comparison and 2 sunrise refinements; 12 small rasters have interior bounds")
