from pathlib import Path
import re,subprocess
P=Path(__file__).resolve().parent
OLD=P.parent/'logo-ocean-concepts-2026-10-10'/'assets'
SEA='#244B51';SUN='#DE9857'
def old(k):
 s=(OLD/f'{k}.svg').read_text();return re.sub(r'<title>.*?</title>','',s[s.index('>')+1:s.rfind('</svg>')])
a=old('a')+f'<g fill="{SEA}"><circle cx="118" cy="198" r="9"/><circle cx="105" cy="225" r="5.5"/></g>'
# The central widening void is light entering water, not an extra drawing of equipment.
b=f'<g fill="{SUN}"><path d="M84 119A48 48 0 1 1 173 119Z"/></g><g fill="{SEA}"><path d="M111 137C116 135 121 134 126 134L124 150C117 150 110 149 104 147Z"/><path d="M136 134C144 135 151 139 155 144C151 147 145 149 139 150Z"/><path d="M85 166C97 159 110 158 122 160L116 176C105 174 95 174 85 177Z"/><path d="M142 162C156 164 166 162 177 158C175 169 162 177 148 178Z"/><path d="M53 204C72 191 89 187 111 189L101 205C84 202 69 201 53 204Z"/><path d="M151 194C170 196 190 191 207 182C198 202 179 212 161 215Z"/></g>'
D={'a1':a,'b1':b};names={'a1':'올라오는 숨, 떠오르는 해','b1':'물속까지 닿는 아침빛'}
notes={'a1':['A의 수면 아래 두 기포를 더함','수중의 숨과 수면 위의 해가 함께 올라감'],'b1':['B의 잔물결 사이에 빛의 틈을 냄','해 아래의 빈 공간이 깊어질수록 넓어짐']}
def body(k,mono=False,rev=False):return re.sub(r'#[0-9A-Fa-f]{6}', '#ffffff' if rev else '#222222',D[k]) if mono else D[k]
for k in D:
 for suffix,mono,rev in [('',False,False),('-mono',True,False),('-reversed',True,True)]:
  p=P/'assets'/f'{k}{suffix}.svg';p.write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><title>{names[k]}</title>{body(k,mono,rev)}</svg>');subprocess.run(['rsvg-convert','-w','512','-h','512',str(p),'-o',str(p.with_suffix('.png'))],check=True)
s=['<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900"><rect width="1200" height="900" fill="#F7F5F0"/><style>text{font-family:Apple SD Gothic Neo,Arial,sans-serif;fill:#263A3E}.muted{fill:#68787A}</style><text x="64" y="59" font-size="18" letter-spacing="2">NAEIL / ABOVE &amp; BELOW</text><text x="64" y="111" font-size="30">바다 위의 내일, 물속에서 느끼는 고요함</text><text x="64" y="148" class="muted" font-size="17">마음에 드신 A · B에 다이빙의 경험을 넣어 본 후속 러프</text>']
for i,k in enumerate(D):
 x=64+i*550
 s.append(f'<rect x="{x}" y="196" width="520" height="630" fill="white"/><text x="{x+28}" y="239" class="muted" font-size="18">{k.upper()}</text><svg x="{x+105}" y="266" width="310" height="310" viewBox="0 0 256 256">{body(k)}</svg><text x="{x+28}" y="630" font-size="25">{names[k]}</text>')
 for j,t in enumerate(notes[k]):s.append(f'<text x="{x+28}" y="{671+j*29}" font-size="17" class="muted">{t}</text>')
 s.append(f'<svg x="{x+24}" y="734" width="72" height="72" viewBox="0 0 256 256">{body(k,True)}</svg><text x="{x+118}" y="782" class="muted" font-size="14">다이빙의 느낌을 알아보기 쉽게 넣었는지 비교</text>')
s.append('<text x="64" y="869" class="muted" font-size="14">기존 A · B 유지 가능 · 다이빙 요소의 적합성을 시험하는 단계 · 최종안 아님</text></svg>');(P/'board.svg').write_text(''.join(s));subprocess.run(['rsvg-convert',str(P/'board.svg'),'-o',str(P/'board.png')],check=True)
s=['<svg xmlns="http://www.w3.org/2000/svg" width="900" height="380"><rect width="900" height="380" fill="white"/>']
for i,k in enumerate(D):
 x=30+i*450;s.append(f'<text x="{x}" y="35" font-family="Arial" font-size="18">{k.upper()}</text><svg x="{x}" y="55" width="128" height="128" viewBox="0 0 256 256">{body(k,True)}</svg><rect x="{x+180}" y="55" width="130" height="130" fill="#24373B"/><svg x="{x+181}" y="56" width="128" height="128" viewBox="0 0 256 256">{body(k,True,True)}</svg>')
 for j,size in enumerate([16,24,32,64]):
  s.append(f'<svg x="{x+j*90}" y="235" width="{size}" height="{size}" viewBox="0 0 256 256">{body(k,True)}</svg><text x="{x+j*90}" y="335" font-size="13" font-family="Arial">{size}px</text>')
s.append('</svg>');(P/'proof.svg').write_text(''.join(s));subprocess.run(['rsvg-convert',str(P/'proof.svg'),'-o',str(P/'proof.png')],check=True)
