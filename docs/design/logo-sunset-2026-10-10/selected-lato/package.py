"""Package the selected Lato artwork; no product integration."""
from pathlib import Path
import copy
import json
import shutil
import subprocess
import xml.etree.ElementTree as ET

P=Path(__file__).resolve().parent
W=P.parent/'wordmark-candidates'
M=P.parent/'quality-master'
NS='http://www.w3.org/2000/svg'
ET.register_namespace('',NS)
for name in ('svg','png','licenses','evidence'):
    (P/name).mkdir(exist_ok=True)


def render(source,target,width):
    subprocess.run(['rsvg-convert',str(source),'-w',str(width),'-o',str(target)],check=True)


for mode in ('color','gray','color-dark','gray-dark'):
    for small in (False,True):
        suffix='-small' if small else ''
        dest=P/'svg'/f'naeil-symbol-{mode}{suffix}.svg'
        shutil.copyfile(M/'assets'/f'naeil-{mode}{suffix}.svg',dest)
        for size in ((16,24,32,48) if small else (128,512,2048,4096)):
            render(dest,P/'png'/f'{dest.stem}-{size}.png',size)
    for layout in ('stacked','horizontal'):
        dest=P/'svg'/f'naeil-{layout}-{mode}.svg'
        if mode!='gray-dark':
            shutil.copyfile(W/'assets'/f'lato-{mode}-{layout}.svg',dest)
        else:
            root=ET.parse(W/'assets'/f'lato-gray-{layout}.svg').getroot()
            mark=root.find(f'{{{NS}}}svg')
            for child in list(mark):mark.remove(child)
            source=ET.parse(M/'assets'/f'naeil-gray-dark{"-small" if layout=="horizontal" else ""}.svg').getroot()
            for child in source:
                if child.tag!=f'{{{NS}}}title':mark.append(copy.deepcopy(child))
            root.find(f'{{{NS}}}g').set('fill','#F3F3F3')
            ET.ElementTree(root).write(dest,encoding='unicode')
        for width in (1024,2048,4096) if layout=='stacked' else (600,1200,2400):
            render(dest,P/'png'/f'{dest.stem}-{width}.png',width)
shutil.copyfile(W/'assets/lato-wordmark.svg',P/'svg/naeil-wordmark.svg')
render(P/'svg/naeil-wordmark.svg',P/'png/naeil-wordmark-1600.png',1600)
shutil.copyfile(W/'fonts/lato/OFL.txt',P/'licenses/Lato-OFL.txt')
sources=json.loads((W/'sources.json').read_text())
sources['files']=[x for x in sources['files'] if '/lato/' in x['file']]
(P/'licenses/sources.json').write_text(json.dumps(sources,indent=2)+'\n')
shutil.copyfile(W/'proof.png',P/'evidence/wordmark-candidate-proof.png')
shutil.copyfile(M/'evidence/size-proof.png',P/'evidence/symbol-size-proof.png')


def embed(file,x,y,w,h,prefix):
    root=ET.parse(file).getroot()
    root.set('x',str(x));root.set('y',str(y));root.set('width',str(w));root.set('height',str(h))
    body=ET.tostring(root,encoding='unicode')
    for old in ('asset-','naeil-'):body=body.replace(old,prefix+'-')
    return body


parts=['<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="840" viewBox="0 0 1200 840">',
       '<rect width="1200" height="840" fill="#F5F2EB"/>',
       '<style>text{font-family:Apple SD Gothic Neo,Arial,sans-serif;fill:#263C4B}</style>',
       '<text x="48" y="58" font-size="18" letter-spacing="2">NAEIL / LATO</text>',
       '<text x="48" y="108" font-size="29">노을과 섬, 편안한 글자의 조합</text>']
for i,mode in enumerate(('color','gray')):
    x=48+i*570
    parts += [f'<rect x="{x}" y="144" width="534" height="448" fill="#FFFFFF"/>',
              embed(P/'svg'/f'naeil-stacked-{mode}.svg',x+40,155,454,397,'p'+mode),
              f'<rect x="{x}" y="615" width="534" height="145" fill="#252525"/>',
              embed(P/'svg'/f'naeil-horizontal-{mode}-dark.svg',x+76,636,384,102,'d'+mode)]
parts+=['<text x="48" y="803" font-size="15">Lato Regular 400 · SIL OFL 1.1 · SVG 및 고해상도 PNG · 제품 적용 전</text></svg>']
(P/'preview.svg').write_text(''.join(parts))
render(P/'preview.svg',P/'preview.png',2400)
print('Packaged selected Lato: 17 SVGs, 57 transparent PNGs, license, preview and evidence.')
