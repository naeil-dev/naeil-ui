from pathlib import Path
import subprocess
P=Path(__file__).resolve().parent
SEA='#244B51';SUN='#DE9857';BLACK='#242424'
D={
'a': [('sun','<path d="M88 126A57 57 0 1 1 201 116C181 132 164 135 144 127C120 117 107 116 88 126Z"/>'),('sea','<path d="M27 157C61 157 67 132 99 132C122 132 133 148 156 148C180 148 198 136 226 137C207 151 196 178 160 179C131 180 118 163 96 163C67 163 54 177 27 157Z"/>')],
'b': [('sun','<path d="M84 119A48 48 0 1 1 173 119Z"/>'),('sea','<path d="M111 137C128 131 147 134 155 144C143 151 122 153 104 147Z"/><path d="M85 166C105 155 125 160 143 162C156 164 166 162 177 158C175 171 158 180 139 178C118 175 102 173 85 177Z"/><path d="M53 204C84 182 110 187 137 192C161 197 184 193 207 182C197 204 168 219 137 215C104 211 78 201 53 204Z"/>')],
'c': [('sea','<path d="M211 104C190 73 156 65 126 77C97 89 80 118 84 147C103 138 122 145 140 157C168 176 194 172 219 151C211 185 184 215 146 222C97 232 48 202 38 155C27 105 54 57 103 43C149 29 196 55 211 104Z"/>'),('sun','<circle cx="151" cy="115" r="28"/>')]
}
names={'a':'물결을 뚫고','b':'빛이 먼저 닿는 바다','c':'해를 놓아주는 파도'}
notes={'a':['해의 아랫면을 물결이 가르는 장면','수평선 대신, 물과 해의 경계가 기억점'], 'b':['떠오른 해가 수면에 빛으로 이어짐','잔물결의 리듬으로 바다의 깊이를 표현'], 'c':['파도가 둥글게 해를 감싸다가 열림','따뜻한 품과 다시 나오는 움직임을 결합']}
def body(k,mono=False,rev=False):return ''.join(f'<g fill="{("#fff" if rev else BLACK) if mono else (SUN if role=="sun" else SEA)}">{d}</g>' for role,d in D[k])
for k in D:
 for suffix,mono,rev in [('',False,False),('-mono',True,False),('-reversed',True,True)]:
  s=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><title>{names[k]}</title>{body(k,mono,rev)}</svg>'
  p=P/'assets'/f'{k}{suffix}.svg';p.write_text(s);subprocess.run(['rsvg-convert','-w','512','-h','512',str(p),'-o',str(p.with_suffix('.png'))],check=True)
s=['<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="900" viewBox="0 0 1440 900"><rect width="1440" height="900" fill="#F7F5F0"/><style>text{font-family:Apple SD Gothic Neo,Arial,sans-serif;fill:#24373B}.sub{fill:#69777A}</style><text x="64" y="63" font-size="18" letter-spacing="2">NAEIL / OCEAN MORNING</text><text x="64" y="113" font-size="32">바다에서 해가 떠오른다는 장면</text><text x="64" y="151" class="sub" font-size="17">글자나 기존 프레임 없이, 장면이 다른 세 가지 심벌 탐색</text>']
for i,k in enumerate(D):
 x=64+i*446;s.append(f'<rect x="{x}" y="205" width="420" height="598" fill="white"/><text x="{x+26}" y="249" class="sub" font-size="18">{k.upper()}</text><svg x="{x+75}" y="279" width="270" height="270" viewBox="0 0 256 256">{body(k)}</svg><text x="{x+28}" y="594" font-size="24">{names[k]}</text>')
 for j,t in enumerate(notes[k]):s.append(f'<text x="{x+28}" y="{633+j*28}" class="sub" font-size="17">{t}</text>')
 s.append(f'<svg x="{x+28}" y="695" width="84" height="84" viewBox="0 0 256 256">{body(k,True)}</svg><text x="{x+140}" y="746" class="sub" font-size="15">단색에서도 장면이 남는지 비교</text>')
s.append('<text x="64" y="855" class="sub" font-size="15">방향 탐색용 러프 · 색은 감정 비교용 임시 제안 · 실제 로고 교체 없음</text></svg>');(P/'board.svg').write_text(''.join(s));subprocess.run(['rsvg-convert',str(P/'board.svg'),'-o',str(P/'board.png')],check=True)
s=['<svg xmlns="http://www.w3.org/2000/svg" width="1120" height="500"><rect width="1120" height="500" fill="white"/><text x="32" y="38" font-family="Arial" font-size="20">naeil / initial silhouette observation</text>']
for i,k in enumerate(D):
 x=32+i*360;s.append(f'<text x="{x}" y="80" font-family="Arial" font-size="20">{k.upper()}</text><svg x="{x}" y="105" width="128" height="128" viewBox="0 0 256 256">{body(k,True)}</svg><rect x="{x+166}" y="105" width="145" height="145" fill="#24373b"/><svg x="{x+174}" y="113" width="128" height="128" viewBox="0 0 256 256">{body(k,True,True)}</svg>')
 pos=x
 for size in [16,24,32,64]:
  s.append(f'<svg x="{pos}" y="310" width="{size}" height="{size}" viewBox="0 0 256 256">{body(k,True)}</svg><text x="{pos}" y="405" font-size="13" font-family="Arial">{size}px</text>');pos+=size+35
s.append('</svg>');(P/'proof.svg').write_text(''.join(s));subprocess.run(['rsvg-convert',str(P/'proof.svg'),'-o',str(P/'proof.png')],check=True)
