from pathlib import Path
import subprocess,html
P=Path(__file__).resolve().parent
shapes={
'k1': '<path d="M104 62C66 62 36 91 36 127C36 160 61 187 95 193L95 158C78 153 68 141 68 127C68 109 84 95 104 95L122 95L122 62Z"/><path d="M144 63C182 63 212 92 212 129C212 165 184 194 149 194L131 194L131 161L149 161C166 161 180 147 180 129C180 113 167 99 150 96L150 63Z"/>',
'k2': '<path d="M42 146C52 182 83 206 122 206C169 206 205 173 211 129C195 148 177 155 156 156C168 128 159 96 137 64C138 91 122 105 106 120C96 101 97 81 104 57C70 81 60 121 77 151C84 164 94 170 108 173C86 179 62 169 42 146Z"/>',
'k3': '<path d="M62 76C62 58 76 44 94 44C112 44 126 58 126 76C126 94 112 108 94 108C76 108 62 94 62 76Z"/><path d="M143 127C143 109 157 95 175 95C193 95 207 109 207 130C207 174 175 206 125 212L125 188C151 181 165 167 168 157C153 154 143 143 143 127Z"/>',
'well':'<path d="M40 150Q128 206 216 150L216 178Q128 234 40 178Z"/><path d="M65 110Q128 60 191 110L191 138Q128 88 65 138Z"/>',
'shell':'<path d="M46 142Q128 254 210 142L184 134L153 152L124 128L93 150L68 134Z"/><path d="M70 107Q128 8 186 107L153 92L124 114L93 90Z"/>',
'hands':'<path d="M34 102C34 174 71 208 120 208L120 176C82 172 65 151 65 102Z"/><path d="M136 48L136 80C175 84 191 105 191 154L222 154C222 82 185 48 136 48Z"/>'}
def svg(body,title): return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><title>{title}</title><g fill="#171717">{body}</g></svg>'
for key,name in [('k1','걷히는 사이'),('k2','남아 있는 불씨'),('k3','마침표 대신')]:
 p=P/(key+'.svg');p.write_text(svg(shapes[key],name));subprocess.run(['rsvg-convert','-w','512','-h','512',str(p),'-o',str(P/(key+'.png'))],check=True)
names=['구름 / 틈','불씨 / 온기','쉼표 / 다음','샘 / 회복','껍질 / 나옴','손 / 여백']
out=['<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="640" viewBox="0 0 1200 640"><rect width="1200" height="640" fill="white"/><text x="32" y="35" font-family="Arial" font-size="18">KAAN / 6 ideas x 3 rough treatments / 18 sketches</text>']
for i,(key,body) in enumerate(shapes.items()):
 col=i%3;row=i//3;x=30+col*395;y=65+row*280
 out.append(f'<text x="{x}" y="{y}" font-family="Apple SD Gothic Neo, sans-serif" font-size="18">{names[i]}</text>')
 for j in range(3):
  # Local changes only: stance, openness, tilt; these are not separate ideas.
  tr=['','translate(12 0) scale(.90 1)','translate(128 128) rotate(-12) translate(-128 -128)'][j]
  out.append(f'<g transform="translate({x+j*125} {y+20}) scale(.43)"><g fill="#171717" transform="{tr}">{body}</g></g>')
out.append('</svg>');(P/'sketches.svg').write_text(''.join(out));subprocess.run(['rsvg-convert',str(P/'sketches.svg'),'-o',str(P/'sketches.png')],check=True)
