from pathlib import Path
import json, subprocess, xml.etree.ElementTree as ET
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen

P=Path(__file__).resolve().parent
(P/'assets').mkdir(exist_ok=True)
(P/'evidence').mkdir(exist_ok=True)
MASTER=P.parent/'quality-master/assets'
WEIGHTS={400:'Regular',500:'Medium',600:'SemiBold'}
OLD_GAPS=[-.008,-.010,-.002,.006]
METRICS={}


def outline(weight,spacing):
    file=P/'fonts'/f'Lato-{WEIGHTS[weight]}.ttf'
    f=TTFont(file);glyphs=f.getGlyphSet();order=f.getGlyphOrder();upm=f['head'].unitsPerEm
    cmd=['hb-shape',str(file),'naeil','--output-format=json']
    on=json.loads(subprocess.check_output(cmd,text=True))
    off=json.loads(subprocess.check_output(cmd+['--features=kern=0'],text=True))
    bp=BoundsPen(glyphs);glyphs[f.getBestCmap()[ord('n')]].draw(bp);xh=bp.bounds[3]
    cursor=0;parts=[];boxes=[]
    for i,g in enumerate(on):
        name=order[int(g['g'][3:])] if g['g'].startswith('gid') else g['g']
        pen=SVGPathPen(glyphs);bb=BoundsPen(glyphs);glyphs[name].draw(pen);glyphs[name].draw(bb)
        dx=cursor+g['dx'];dy=g['dy']
        parts.append(f'<path d="{pen.getCommands()}" transform="translate({dx} {dy})"/>')
        a,b,c,d=bb.bounds;boxes.append((a+dx,b+dy,c+dx,d+dy))
        cursor+=g['ax']
        if i<4:
            cursor+=OLD_GAPS[i]*upm if spacing=='prior' else .012*upm if spacing=='open' else 0
    bounds=(min(b[0] for b in boxes),min(b[1] for b in boxes),max(b[2] for b in boxes),max(b[3] for b in boxes))
    gaps=[boxes[i+1][0]-boxes[i][2] for i in range(4)]
    METRICS[f'{weight}-{spacing}']={'upm':upm,'xheight':xh,'hb_kern_on':on,'hb_kern_off':off,'kern_equal':on==off,'ink_bounds':bounds,'advance':cursor,'ink_gaps_font_units':gaps,'width_at_xheight_14':(bounds[2]-bounds[0])*14/xh}
    return ''.join(parts),bounds,xh


WORDS={(w,s):outline(w,s) for w in WEIGHTS for s in ('default','prior','open')}


def word(weight,spacing,x,cy,xheight,ink='#263C4B',left=False):
    paths,b,xh=WORDS[weight,spacing];scale=xheight/xh
    origin=x-(b[0] if left else (b[0]+b[2])/2)*scale
    base=cy+(b[1]+b[3])/2*scale
    return f'<g fill="{ink}" transform="translate({origin} {base}) scale({scale} {-scale})">{paths}</g>'


def mark(key,mode='color',small=True):
    s=(MASTER/f'naeil-{mode}{"-small" if small else ""}.svg').read_text()
    return s[s.index('<defs>'):s.rindex('</svg>')].replace('naeil-',key+'-')


def placed(body,x,y,size):
    return f'<svg x="{x}" y="{y}" width="{size}" height="{size}" viewBox="24 30 208 208">{body}</svg>'


def svg(body,w,h):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">{body}</svg>'


def save(name,body,w,h,scale=1):
    p=P/name;p.write_text(svg(body,w,h));ET.parse(p)
    subprocess.run(['rsvg-convert',str(p),'-z',str(scale),'-o',str(p.with_suffix('.png'))],check=True)


STYLE='<style>text{font-family:Apple SD Gothic Neo,Arial,sans-serif;fill:#263C4B}.sub{fill:#69777C}</style>'
sheet=['<rect width="1440" height="980" fill="#F5F2EB"/>',STYLE,
       '<text x="48" y="62" font-size="30">Lato — 기본 간격, 굵기, 실제 크기 검증</text>',
       '<text x="48" y="101" font-size="17">같은 소문자 높이로 비교 · 심볼과 색은 유지</text>']
for i,(spacing,label) in enumerate([('default','기본 커닝'),('prior','기존 수동 보정'),('open','간격 확대 +0.012em')]):
    x=48+i*456
    sheet+=[f'<rect x="{x}" y="132" width="432" height="245" fill="#FFFFFF"/>',f'<text x="{x+24}" y="171" font-size="19">{label}</text>',word(400,spacing,x+216,258,60),word(400,spacing,x+32,343,12,left=True)]
for i,weight in enumerate(WEIGHTS):
    x=48+i*456
    sheet+=[f'<rect x="{x}" y="398" width="432" height="285" fill="#FFFFFF"/>',f'<text x="{x+24}" y="438" font-size="19">{weight} · {WEIGHTS[weight]}</text>',placed(mark('weight'+str(weight)),x+54,473,72),word(weight,'default',x+276,507,34),word(weight,'default',x+34,615,12,left=True),word(weight,'default',x+200,615,16,left=True)]
for i,xh in enumerate((12,14,16)):
    x=48+i*456
    sheet+=[f'<rect x="{x}" y="705" width="432" height="196" fill="#FFFFFF"/>',f'<text x="{x+24}" y="746" font-size="18">심볼 28px / 글자 높이 {xh}px</text>',placed(mark('ratio'+str(xh)),x+32,773,28),word(400,'default',x+68,787,xh,left=True),f'<rect x="{x+16}" y="829" width="400" height="53" fill="#252525"/>',placed(mark('ratiodark'+str(xh),'color-dark'),x+32,841,28),word(400,'default',x+68,855,xh,'#F3F0E9',True)]
sheet+=['<text x="48" y="946" font-size="16">굵기와 비율의 최종 평가는 브라우저의 실제 헤더·푸터에서 함께 확인합니다.</text>']
save('comparison.svg',''.join(sheet),1440,980,2)

# Tight standalone lockups for temporary DOM verification. No source component edits.
for mode in ('color','color-dark','gray','gray-dark'):
    ink='#F3F0E9' if mode.endswith('dark') else '#263C4B'
    for weight in WEIGHTS:
        for ratio in (12,14,16):
            b=WORDS[weight,'default'][1];wordwidth=(b[2]-b[0])*ratio/WORDS[weight,'default'][2]
            width=round(28+8+wordwidth,3)
            body=placed(mark('actual',mode),0,0,28)+word(weight,'default',36,14,ratio,ink,True)
            save(f'assets/header-{weight}-{ratio}-{mode}.svg',body,width,28,4)
    # Footer proportion: 20px mark, 10px x-height. Keep minimum legibility observation explicit.
    width=20+6+(WORDS[400,'default'][1][2]-WORDS[400,'default'][1][0])*10/WORDS[400,'default'][2]
    save(f'assets/footer-{mode}.svg',placed(mark('foot',mode),0,0,20)+word(400,'default',26,10,10,ink,True),width,20,4)

(P/'measurements.json').write_text(json.dumps({'shaper':subprocess.check_output(['hb-shape','--version'],text=True).splitlines()[0],'text':'naeil','weights':METRICS},indent=2)+'\n')
print(json.dumps({k:{'kern_equal':v['kern_equal'],'width14':v['width_at_xheight_14'],'advance':v['advance']} for k,v in METRICS.items()}))
