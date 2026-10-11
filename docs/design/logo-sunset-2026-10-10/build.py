from pathlib import Path
import subprocess,re,xml.etree.ElementTree as ET
P=Path(__file__).resolve().parent
# Adapted to a small identity mark after read-only photo sampling, not literal pixel tracing.
palette=[('깊은 하늘','#284972'),('푸른 여운','#617579'),('저녁 안개','#9B7755'),('금빛','#E5A348'),('노을','#DA702B'),('남은 온기','#B94628')]
def defs(pre):return f'''<defs>
<linearGradient id="{pre}-sky" x1="128" y1="57" x2="128" y2="156" gradientUnits="userSpaceOnUse"><stop stop-color="#284972"/><stop offset=".28" stop-color="#617579"/><stop offset=".50" stop-color="#AE8A64"/><stop offset=".72" stop-color="#E5A348"/><stop offset=".9" stop-color="#E98A32"/><stop offset="1" stop-color="#BE4929"/></linearGradient>
<linearGradient id="{pre}-sun" x1="128" y1="49" x2="128" y2="145" gradientUnits="userSpaceOnUse"><stop stop-color="#F2BB62"/><stop offset=".46" stop-color="#EE942F"/><stop offset="1" stop-color="#BB432B"/></linearGradient>
<linearGradient id="{pre}-glint" x1="42" y1="0" x2="216" y2="0" gradientUnits="userSpaceOnUse"><stop stop-color="#294C66"/><stop offset=".34" stop-color="#927257"/><stop offset=".58" stop-color="#EDA448"/><stop offset=".77" stop-color="#BC7337"/><stop offset="1" stop-color="#294C66"/></linearGradient>
<linearGradient id="{pre}-water" x1="128" y1="156" x2="128" y2="210" gradientUnits="userSpaceOnUse"><stop stop-color="#B57948"/><stop offset=".5" stop-color="#6E7270"/><stop offset="1" stop-color="#284972"/></linearGradient>
<linearGradient id="{pre}-whiteSun" x1="146" y1="124" x2="146" y2="150" gradientUnits="userSpaceOnUse"><stop stop-color="#FFE4A1"/><stop offset="1" stop-color="#F6B858"/></linearGradient>
</defs>'''
A_SKY='M40 150A88 88 0 0 1 216 150C180 154 147 145 112 149C85 153 60 154 40 150Z'
A_GAP='M158 136A12 12 0 1 1 134 136A12 12 0 1 1 158 136Z'
A_TOP='M42 163C91 156 166 176 216 161C209 176 177 185 147 180C112 174 75 166 48 175Z'
A_LOW='M64 188C105 181 151 202 194 187C184 204 163 211 134 204C107 198 86 194 69 199Z'
B_SUN='M88 139A46 46 0 1 1 174 136C144 144 118 130 88 139Z'
B_TOP='M32 155C72 147 103 156 129 158C160 161 191 156 224 147C210 164 180 178 145 174C103 171 65 158 32 167Z'
B_LOW='M64 190C105 179 134 193 160 193C177 193 187 191 200 187C187 203 168 210 143 207C112 203 87 191 64 200Z'
def paths(k,pre,mode='color'):
 if mode=='dark':
  out=paths(k,pre,'color')
  for a,b in [('#284972','#698B9F'),('#617579','#94A2A1'),('#294C66','#7896A5'),('#6E7270','#9B988B')]:out=out.replace(a,b)
  return out
 ink='#F6F0E7' if mode=='reverse' else '#23343E'
 if mode!='color':
  if k=='a':return f'<path fill="{ink}" fill-rule="evenodd" d="{A_SKY} {A_GAP}"/><path fill="{ink}" d="{A_TOP} {A_LOW}"/>'
  return f'<path fill="{ink}" d="{B_SUN} {B_TOP} {B_LOW}"/>'
 if k=='a':return defs(pre)+f'<path fill="url(#{pre}-sky)" d="{A_SKY}"/><circle cx="146" cy="136" r="12" fill="url(#{pre}-whiteSun)"/><path fill="url(#{pre}-glint)" d="{A_TOP}"/><path fill="url(#{pre}-water)" d="{A_LOW}"/>'
 return defs(pre)+f'<path fill="url(#{pre}-sun)" d="{B_SUN}"/><path fill="url(#{pre}-glint)" d="{B_TOP}"/><path fill="url(#{pre}-water)" d="{B_LOW}"/>'
names={'a':'하루를 담은 노을','b':'수면에 남은 온기'}
for k in ['a','b']:
 for mode in ['color','dark','mono','reverse']:
  p=P/'assets'/f'{k}-{mode}.svg';p.write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" role="img"><title>naeil — {names[k]}</title>{paths(k,k,mode)}</svg>');ET.parse(p);subprocess.run(['rsvg-convert','-w','640','-h','640',str(p),'-o',str(p.with_suffix('.png'))],check=True)
s=['<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="1090" viewBox="0 0 1440 1090"><rect width="1440" height="1090" fill="#F5F2EB"/><style>text{font-family:Apple SD Gothic Neo,Arial,sans-serif;fill:#263C4B}.sub{fill:#6C777C}</style><text x="64" y="60" font-size="17" letter-spacing="3">NAEIL / THE WARMTH THAT REMAINS</text><text x="64" y="115" font-size="33">오늘을 잘 마치고, 편안하게 맞는 내일</text><text x="64" y="153" font-size="17" class="sub">사진의 노을빛과 고요한 바다를 두 가지 형태로 옮겼습니다.</text>']
for i,k in enumerate(['a','b']):
 x=64+i*670
 s.append(f'<rect x="{x}" y="199" width="642" height="531" rx="2" fill="#FFFEFA"/><text x="{x+30}" y="244" font-size="16" class="sub">0{i+1}</text><svg x="{x+148}" y="270" width="346" height="346" viewBox="0 0 256 256">{paths(k,"main"+k)}</svg><text x="{x+321}" y="626" font-family="Arial,sans-serif" font-size="49" letter-spacing="-1.5" text-anchor="middle">naeil</text><text x="{x+321}" y="685" font-size="19" text-anchor="middle">{names[k]}</text>')
 s.append(f'<rect x="{x}" y="750" width="400" height="176" fill="#152E43"/><svg x="{x+20}" y="763" width="154" height="154" viewBox="0 0 256 256">{paths(k,"dark"+k,"dark")}</svg><text x="{x+197}" y="853" style="fill:#F2EDE5" font-size="39" letter-spacing="-1">naeil</text><rect x="{x+420}" y="750" width="222" height="176" fill="#E8E6DF"/><svg x="{x+461}" y="764" width="140" height="140" viewBox="0 0 256 256">{paths(k,"mono"+k,"mono")}</svg>')
for i,(label,col) in enumerate(palette):
 x=64+i*223;s.append(f'<rect x="{x}" y="957" width="192" height="16" fill="{col}"/><text x="{x}" y="1005" class="sub" font-size="15">{label}  {col}</text>')
s.append('<text x="64" y="1055" class="sub" font-size="14">색과 형태의 탐색안 · 서체는 배치 확인용 · 제품 로고는 아직 변경하지 않았습니다.</text></svg>');(P/'board.svg').write_text(''.join(s));subprocess.run(['rsvg-convert',str(P/'board.svg'),'-o',str(P/'board.png')],check=True)
# Actual small raster views plus enlarged nearest-neighbor pixel inspection will be generated separately.
s=['<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="470"><rect width="1080" height="470" fill="#fff"/><text x="30" y="38" font-family="Arial" font-size="20">naeil / preliminary color and silhouette check</text>']
for i,k in enumerate(['a','b']):
 x=30+i*525;s.append(f'<text x="{x}" y="80" font-family="Arial" font-size="18">0{i+1}</text><svg x="{x}" y="95" width="128" height="128" viewBox="0 0 256 256">{paths(k,"proof"+k)}</svg><svg x="{x+160}" y="95" width="128" height="128" viewBox="0 0 256 256">{paths(k,"pm"+k,"mono")}</svg><rect x="{x+320}" y="95" width="135" height="135" fill="#152E43"/><svg x="{x+324}" y="99" width="128" height="128" viewBox="0 0 256 256">{paths(k,"pr"+k,"reverse")}</svg>')
 for j,sz in enumerate([16,24,32,64]):
  s.append(f'<svg x="{x+j*105}" y="291" width="{sz}" height="{sz}" viewBox="0 0 256 256">{paths(k,f"size{k}{sz}")}</svg><text x="{x+j*105}" y="389" font-size="13" font-family="Arial">{sz}px</text>')
s.append('</svg>');(P/'proof.svg').write_text(''.join(s));subprocess.run(['rsvg-convert',str(P/'proof.svg'),'-o',str(P/'proof.png')],check=True)
