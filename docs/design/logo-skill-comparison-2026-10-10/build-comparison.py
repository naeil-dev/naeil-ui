from pathlib import Path
import re,subprocess,html,json
from PIL import Image
P=Path(__file__).resolve().parent
items=[('K1','kaan/k1.svg','Kaan','걷히는 사이','막힌 날씨 사이로 다음 공간이 열린다.','분리된 유기적 덩어리와 틈은 보인다. 구름보다 나무·관목 또는 두 사람처럼 보일 수 있다.','희망·여유를 의도했으나 장면 판독이 약하다.'),('K2','kaan/k2.svg','Kaan','남아 있는 불씨','끝난 줄 알았던 곳에 다시 시작할 온기가 남는다.','불꽃과 받치는 곡선은 보인다. 남은 불씨보다 활활 타는 불·배·잎으로 읽힐 수 있다.','따뜻함은 직접적이나 에너지·캠핑 상징과 구별이 약하다.'),('K3','kaan/k3.svg','Kaan','마침표 대신','끝맺지 않고 다음을 남기는 문장부호.','점과 쉼표가 보인다. 기울어진 세미콜론의 익숙한 기호에 머문다.','이어감의 설명은 좋지만 naeil 고유성은 낮다.'),('N1','neon/concepts/n1.svg','Neon','열어 둔 창','내일의 공기가 들어올 자리를 만든다.','열린 창·문이 보인다. 출입 기능 아이콘 또는 건축으로 좁혀질 수 있다.','개방감은 보이나 온기와 기억점은 부족하다.'),('N2','neon/concepts/n2.svg','Neon','등을 내어주는 새','다시 움직이기 전에 잠깐 기대어 쉴 수 있다.','큰 새가 작은 새의 자리를 만든다. 관계와 부드러움이 비교적 직접적이다.','육아·목욕 오리·가족 브랜드의 인상이 강하다.'),('N3','neon/concepts/n3.svg','Neon','다시 몸을 내미는 달팽이','자기 속도로 다시 나서도 괜찮다.','집에서 몸을 내미는 달팽이는 선명하게 보인다.','안도감과 유머가 있지만 느린 서비스·유아 브랜드로 오독할 수 있다.')]
normalized=[]
for id,file,skill,title,idea,observed,risk in items:
 raw=(P/file).read_text();root=re.search(r'<svg[^>]*viewBox="([^"]+)"[^>]*>',raw);v=list(map(float,root.group(1).split()));body=raw[root.end():raw.rfind('</svg>')];body=re.sub(r'<title>.*?</title>','',body,flags=re.S);body=re.sub(r'#[0-9a-fA-F]{6}','#171717',body)
 temp=P/(id+'-measurement.png');subprocess.run(['rsvg-convert','-w','512','-h','512',str(P/file),'-o',str(temp)],check=True)
 bb=Image.open(temp).getchannel('A').getbbox();temp.unlink()
 x0,y0,x1,y1=[a*v[2]/512 for a in bb];pad=10*v[2]/256
 box=f'{x0-pad} {y0-pad} {x1-x0+pad*2} {y1-y0+pad*2}'
 normalized.append((id,body,box))
# Neutral same-size comparison; illustration crop normalized for displayed max dimension only.
s=['<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="960" viewBox="0 0 1440 960"><rect width="1440" height="960" fill="#fff"/><text x="52" y="48" font-family="Arial,sans-serif" font-size="22" fill="#171717">naeil — skill comparison / first concepts</text><text x="52" y="77" font-family="Arial,sans-serif" font-size="14" fill="#666">K1–K3: Kaan · N1–N3: Neon · Brandkit: generation unavailable</text>']
for i,(id,body,box) in enumerate(normalized):
 x=52+(i%3)*466;y=120+(i//3)*408
 s.append(f'<rect x="{x}" y="{y}" width="404" height="358" rx="0" fill="none" stroke="#e5e5e5"/><text x="{x+20}" y="{y+34}" font-family="Arial" font-size="17" fill="#666">{id}</text><svg x="{x+92}" y="{y+78}" width="220" height="220" viewBox="{box}">{body}</svg>')
s.append('</svg>');(P/'comparison.svg').write_text(''.join(s));subprocess.run(['rsvg-convert',str(P/'comparison.svg'),'-o',str(P/'comparison.png')],check=True)
# Use Neon's supplied preview layout, retaining the simple side-by-side exploration format.
skill=Path('/tmp/naeil-compare-neon/skills/logo-designer/SKILL.md').read_text();template=re.search(r'```html\n(<!DOCTYPE html>.*?</html>)\n```',skill,re.S).group(1)
cards=''.join(f'<div class="card"><div class="card-img"><img src="concepts/n{i}.svg" alt="N{i}"></div><div class="card-label">N{i}</div></div>' for i in range(1,4))
# Dark preview remains contrast-readable; this changes specimen presentation only.
template=template.replace('</style>','body.dark .card-img img {filter:invert(1)}\n</style>')
(P/'neon/preview.html').write_text(template.replace('{{PHASE}}','naeil / Concepts').replace('{{CARDS}}',cards))
# All-results reviewer sheet: meanings are closed initially, giving shape an independent first look.
parts=['<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>naeil — 스킬 비교 실험</title><style>body{margin:0;background:#f6f6f4;color:#171717;font:16px/1.65 -apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo",sans-serif}main{max-width:1160px;margin:auto;padding:40px 24px}h1{font-size:28px}p{max-width:76ch}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}article{background:white;padding:22px;border:1px solid #ddd}article svg{display:block;width:100%;height:220px;margin:24px 0}h2{font-size:18px}summary{cursor:pointer;padding:12px 0}small{color:#555}.blocked{border:1px solid #ccc;padding:20px;margin:28px 0}a{color:inherit}footer{margin-top:32px}@media(max-width:800px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:520px){.grid{grid-template-columns:1fr}main{padding:24px 16px}}</style><main><h1>naeil — 스킬을 실제로 적용한 첫 비교</h1><p>먼저 모양만 보고, 각 카드의 설명을 펼쳐 의미와 연결해 보세요. K1–K3는 Kaan, N1–N3는 Neon입니다. 색·워드마크·제품 적용을 확정하는 단계가 아닙니다.</p><p><a href="comparison.png">전체 이미지</a> · <a href="kaan/concepts.png">Kaan 원래 보드</a> · <a href="neon/preview.html">Neon 원래 보드</a> · <a href="README.md">분석 기록</a></p><div class="grid">']
for item,norm in zip(items,normalized):
 id,file,skill,title,idea,obs,risk=item;_,body,box=norm
 parts.append(f'<article><small>{id} · {skill}</small><svg aria-label="{id} 심벌" role="img" viewBox="{box}">{body}</svg><details><summary>의미·관찰 보기</summary><h2>{title}</h2><p>{idea}</p><p><strong>형태에서 보이는 것</strong><br>{obs}</p><p><strong>다른 해석·한계</strong><br>{risk}</p></details><a href="{file}">SVG 원본</a></article>')
parts.append('</div><div class="blocked"><strong>Brandkit — 이미지 생성 실패</strong><p>같은 브리프와 원문 전략을 적용한 이미지 생성 호출이 HTTP 405 Method Not Allowed로 실패했습니다. 결과물이 없으므로 비교 점수나 순위를 부여하지 않았습니다.</p><a href="brandkit/prompt.txt">실제 프롬프트</a> · <a href="brandkit/STATUS.md">실행 기록</a></div><footer>단일 실행의 제작자 관찰입니다. 독립 사용자 평가나 스킬 성능 검증이 아닙니다. 비교 화면은 각 심벌의 가시 영역을 같은 크기 상자에 맞췄으며 원본 SVG는 유지했습니다. 제품 로고 변경 없음.</footer></main></html>')
(P/'index.html').write_text(''.join(parts))
(P/'candidates.json').write_text(json.dumps([dict(zip(['id','file','skill','title','idea','observed','risk'],i)) for i in items],ensure_ascii=False,indent=2))
print('Built six-candidate comparison and separate skill previews.')
