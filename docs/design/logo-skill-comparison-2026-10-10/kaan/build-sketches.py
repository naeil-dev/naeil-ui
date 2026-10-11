from pathlib import Path
import subprocess,re
P=Path(__file__).resolve().parent
# Shape/layout alternatives within six ideas, never counted as new concepts.
def body(file):
 s=(P/file).read_text();return re.search(r'<g fill="#171717">(.*?)</g>',s).group(1)
sets=[
('구름 / 틈',[body('k1-v1.svg'),body('k1.svg'),'<path d="M30 169C9 145 31 115 55 119C60 83 103 77 120 111L91 179L42 179Z"/><path d="M148 82C178 64 205 88 204 115C242 128 229 178 199 178H111Z"/>']),
('불씨 / 온기',[body('k2-v1.svg'),body('k2.svg'),'<path d="M31 151Q128 230 224 151Q203 225 128 224Q54 224 31 151Z"/><path d="M98 144C76 117 108 102 123 66C127 95 153 111 148 133C143 154 115 159 98 144Z"/>']),
('쉼표 / 다음',[body('k3.svg'),'<path d="M65 52C122 35 181 65 181 119C181 169 140 203 78 213L78 181C118 167 133 152 137 136C95 147 57 117 57 86C57 70 59 61 65 52Z"/>','<path d="M57 76C57 53 76 36 96 36C118 36 133 53 133 75C133 112 101 139 57 145L57 121C78 113 90 107 95 98C75 98 57 94 57 76Z"/><path d="M153 157C153 141 166 128 182 128C198 128 211 141 211 157C211 173 198 186 182 186C166 186 153 173 153 157Z"/>']),
('샘 / 회복',['<path d="M40 150Q128 206 216 150V178Q128 234 40 178Z"/><path d="M65 110Q128 60 191 110V138Q128 88 65 138Z"/>','<path d="M47 104Q20 196 128 220Q236 196 209 104L181 116Q197 178 128 190Q59 178 75 116Z"/><path d="M110 156V68Q128 40 146 68V156Z"/>','<path d="M28 145C74 145 76 65 127 65C178 65 183 145 227 145V177C161 177 165 97 127 97C89 97 94 177 28 177Z"/>']),
('껍질 / 나옴',['<path d="M46 142Q128 254 210 142L184 134L153 152L124 128L93 150L68 134Z"/><path d="M70 107Q128 8 186 107L153 92L124 114L93 90Z"/>','<path d="M34 153Q128 262 222 153L190 148L169 165L138 153L115 173L82 154L61 169Z"/><path d="M89 114Q110 44 184 43Q164 108 89 114Z"/>','<path d="M65 66Q15 147 96 210L118 139Z"/><path d="M191 66Q241 147 160 210L138 139Z"/><circle cx="128" cy="75" r="25"/>']),
('손 / 여백',['<path d="M34 102C34 174 71 208 120 208V176C82 172 65 151 65 102Z"/><path d="M136 48V80C175 84 191 105 191 154H222C222 82 185 48 136 48Z"/>','<path d="M29 116Q34 194 113 213V178Q70 162 63 116Z"/><path d="M227 116Q222 194 143 213V178Q186 162 193 116Z"/><path d="M100 128Q76 88 103 65Q128 55 143 78Q177 63 180 97Q170 134 128 150Z"/>','<path d="M38 100Q44 204 128 216Q212 204 218 100L185 100Q177 156 128 169Q79 156 71 100Z"/><path d="M77 50Q128 101 179 50V83Q128 134 77 83Z"/>'])]
s=['<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="640"><rect width="1200" height="640" fill="white"/><text x="30" y="35" font-family="Arial" font-size="18">KAAN / six ideas, three silhouette studies each</text>']
for i,(name,variants) in enumerate(sets):
 x=30+(i%3)*395;y=75+(i//3)*280
 s.append(f'<text x="{x}" y="{y}" font-family="Apple SD Gothic Neo,sans-serif" font-size="18">{name}</text>')
 for j,b in enumerate(variants):s.append(f'<g transform="translate({x+j*125} {y+20}) scale(.43)" fill="#171717">{b}</g>')
s.append('</svg>');(P/'sketches.svg').write_text(''.join(s));subprocess.run(['rsvg-convert',str(P/'sketches.svg'),'-o',str(P/'sketches.png')],check=True)
