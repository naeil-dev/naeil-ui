from pathlib import Path
import subprocess,html
P=Path(__file__).resolve().parent
INK='#254D55'; SUN='#DF9954'; MONO='#202020'
# Every candidate inherits the current mark's left upright and rightward horizon.
D={
'a': [('sea','<path d="M53 40H69V169H219V185H53Z"/>'),('sun','<path d="M122 157A42 42 0 1 1 200 157Z"/>'),('sea','<path d="M128 199H194V208H128Z"/>')],
'b': [('sea','<path d="M53 40H69V162H87C110 162 116 146 143 146C172 146 185 168 219 168V184C181 184 169 162 143 162C120 162 113 178 87 178H53Z"/>'),('sun','<path d="M124 139A43 43 0 1 1 204 149C181 141 168 129 143 131C136 132 130 135 124 139Z"/>')],
'c': [('sea','<path d="M53 40H69V168H124V184H53Z"/><path d="M181 168H219V184H181Z"/><path d="M88 200H115V211H88Z"/><path d="M190 200H219V211H190Z"/>'),('sun','<path d="M112 156A42 42 0 1 1 190 156Z"/><path d="M139 168H165L172 184H132Z"/><path d="M130 200H174L178 211H126Z"/>')]
}
titles={'a':'수면에서 막 떠오른 해','b':'물결 사이로 떠오르는 해','c':'바다에 길을 내는 해'}
notes={'a':['기존 ㄴ과 수평선을 가장 가깝게 유지','해 아래 짧은 잔물결로 고요한 바다를 암시'], 'b':['ㄴ의 가로획이 하나의 낮은 파도가 됨','물결이 해의 아랫부분을 가려 떠오름을 표현'], 'c':['해 아래 반사광이 앞으로 넓어짐','수면의 틈이 빛길이 되어 바다의 깊이를 표현']}
def body(k,mono=False,reverse=False):
 return ''.join(f'<g fill="{("#ffffff" if reverse else MONO) if mono else (SUN if role=="sun" else INK)}">{shape}</g>' for role,shape in D[k])
def svg(b,title):return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" role="img"><title>{title}</title>{b}</svg>'
for k in D:
 for suffix,mono,rev in [('',False,False),('-mono',True,False),('-reversed',True,True)]:
  p=P/'assets'/f'{k}{suffix}.svg';p.write_text(svg(body(k,mono,rev),titles[k]));subprocess.run(['rsvg-convert','-w','512','-h','512',str(p),'-o',str(p.with_suffix('.png'))],check=True)
current=Path('docs/design/logo-study-2026-10-09/assets/current-mark.svg').read_text()
(P/'assets/current.svg').write_text(current)
s=['<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="1020" viewBox="0 0 1440 1020"><rect width="1440" height="1020" fill="#F7F5F0"/><style>text{font-family:Apple SD Gothic Neo,Arial,sans-serif;fill:#25363A}.muted{fill:#66777A}</style><text x="64" y="65" font-size="19" letter-spacing="2">NAEIL / SEA &amp; SUNRISE</text><text x="64" y="114" font-size="32">해가 떠오르는 장면으로 돌아가기</text><text x="64" y="151" font-size="17" class="muted">기존 ㄴ과 해를 바탕으로, 수면 · 파도 · 빛길의 관계를 비교합니다.</text>']
s.append('<svg x="1135" y="26" width="122" height="122" viewBox="0 0 24 24" fill="none" color="#191919">'+current[current.index('>')+1:current.rindex('</svg>')]+'</svg><text x="1270" y="97" font-size="15" class="muted">현재 로고</text>')
for i,k in enumerate(D):
 x=64+i*446
 s.append(f'<rect x="{x}" y="205" width="420" height="730" fill="#fff"/><text x="{x+28}" y="248" font-size="18" class="muted">{k.upper()}</text>')
 s.append(f'<svg x="{x+60}" y="272" width="300" height="300" viewBox="0 0 256 256">{body(k)}</svg>')
 s.append(f'<text x="{x+28}" y="623" font-size="25">{titles[k]}</text>')
 for j,t in enumerate(notes[k]):s.append(f'<text x="{x+28}" y="{662+j*29}" font-size="17" class="muted">{t}</text>')
 s.append(f'<path d="M{x+28} 727H{x+392}" stroke="#E9EBE9"/><text x="{x+28}" y="762" font-size="14" class="muted">형태만 보기</text><svg x="{x+24}" y="779" width="115" height="115" viewBox="0 0 256 256">{body(k,True)}</svg><text x="{x+171}" y="848" font-size="40" letter-spacing="-1.5">naeil</text>')
s.append('<text x="64" y="980" font-size="15" class="muted">러프 탐색 · 색은 임시 제안 · 워드마크는 배치 확인용 · 제품 로고 변경 없음</text></svg>')
(P/'board.svg').write_text(''.join(s));subprocess.run(['rsvg-convert',str(P/'board.svg'),'-o',str(P/'board.png')],check=True)
# Preliminary one-color, reverse and tiny-size observation. No production pass claim.
s=['<svg xmlns="http://www.w3.org/2000/svg" width="1120" height="540"><rect width="1120" height="540" fill="white"/><text x="32" y="38" font-family="Arial" font-size="20">naeil / preliminary form check</text>']
for i,k in enumerate(D):
 x=32+i*360;s.append(f'<text x="{x}" y="80" font-family="Arial" font-size="20">{k.upper()}</text>')
 s.append(f'<svg x="{x}" y="105" width="128" height="128" viewBox="0 0 256 256">{body(k,True)}</svg><rect x="{x+166}" y="105" width="145" height="145" fill="#25363a"/><svg x="{x+174}" y="113" width="128" height="128" viewBox="0 0 256 256">{body(k,True,True)}</svg>')
 pos=x
 for size in [16,24,32,64]:
  s.append(f'<svg x="{pos}" y="310" width="{size}" height="{size}" viewBox="0 0 256 256">{body(k,True)}</svg><text x="{pos}" y="405" font-size="13" font-family="Arial">{size}px</text>');pos+=size+35
s.append('</svg>');(P/'proof.svg').write_text(''.join(s));subprocess.run(['rsvg-convert',str(P/'proof.svg'),'-o',str(P/'proof.png')],check=True)
