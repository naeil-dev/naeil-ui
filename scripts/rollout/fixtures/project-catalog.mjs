// Independently hand-declared browser fixture, never read from observed DOM or
// from production expectation JSON. Deliberately fixed input for mutations.
export const catalogs = {
  en: [
    ['cc','/cc','Content Collector','Automated content collection from RSS, YouTube, Reddit + AI summarization','coral'],
    ['pkm','/pkm','PKM','Personal knowledge management — document parsing, embeddings, semantic search','jellyfish','Coming Soon'],
    ['naeilUi','/design','naeil-ui','Minimal design system — OKLCH tokens, Tailwind v4, shadcn','whale'],
    ['sa','/sa','Sustainability Analyzer','AI-powered ESG report analysis — PDF parsing, qualitative assessment, comparison tables','fish'],
    ['babyAgent','/baby-agent','Baby Agent','Parenting AI agent — LINE-based Q&A, records, reminders','turtle','Coming Soon'],
  ],
  ko: [
    ['cc','/cc','Content Collector','RSS, YouTube, Reddit 자동 수집 + AI 요약','coral'],
    ['pkm','/pkm','PKM','개인 지식 관리 — 문서 파싱, 임베딩, 시맨틱 검색','jellyfish','준비 중'],
    ['naeilUi','/design','naeil-ui','미니멀 디자인 시스템 — OKLCH 토큰, Tailwind v4, shadcn','whale'],
    ['sa','/sa','Sustainability Analyzer','ESG 리포트 AI 분석 — PDF 파싱, 정성평가, 비교표 자동 생성','fish'],
    ['babyAgent','/baby-agent','Baby Agent','육아 AI 에이전트 — LINE 기반 Q&A, 기록, 리마인더','turtle','준비 중'],
  ],
  ja: [
    ['cc','/cc','Content Collector','RSS、YouTube、Redditの自動収集 + AI要約','coral'],
    ['pkm','/pkm','PKM','個人ナレッジ管理 — ドキュメント解析、埋め込み、セマンティック検索','jellyfish','準備中'],
    ['naeilUi','/design','naeil-ui','ミニマルデザインシステム — OKLCHトークン、Tailwind v4、shadcn','whale'],
    ['sa','/sa','Sustainability Analyzer','ESGレポートAI分析 — PDF解析、定性評価、比較表の自動生成','fish'],
    ['babyAgent','/baby-agent','Baby Agent','育児AIエージェント — LINE Q&A、記録、リマインダー','turtle','準備中'],
  ],
};
export function catalogHTML({version='0.7.1',locale='en',mobile=false,theme='light'}={}) {
  const labels={en:['Projects','Menu'],ko:['프로젝트','메뉴'],ja:['プロジェクト','メニュー']}[locale];
  const items=version==='0.7.1'?catalogs[locale]:catalogs[locale].filter(item=>item[0]==='naeilUi');
  const columns=mobile || version==='0.7.2'?1:2;
  const links=items.map(([,path,name,description,image,badge])=>`<a href="https://naeil.dev/${locale}${path}"><img src="https://naeil.dev/images/${image}.png" alt=""><span class="ui-navigation-title"><span>${name}</span></span> ${badge?`<span>${badge}</span> `:''}<span>${description}</span></a>`).join('');
  return `<html class="${theme}"><style>body{margin:16px}a{display:block;box-sizing:border-box;min-height:80px;padding:12px}img{width:24px;height:24px}.ui-navigation-menu-grid{display:grid;grid-template-columns:repeat(${columns},minmax(0,1fr));gap:8px}section{display:grid;grid-template-columns:1fr}#catalog{width:${mobile?'340':'640'}px}[hidden]{display:none!important}</style><header data-naeil-header><button id="projects">${labels[0]}</button>${mobile?`<button id="menu">${labels[1]}</button>`:''}<button id="theme">Theme</button></header><div id="catalog" role="dialog" aria-label="${labels[mobile?1:0]}" data-columns="${columns}" hidden>${mobile?`<nav class="ui-navigation-mobile-links"><section aria-label="${labels[0]}"><h3>${labels[0]}</h3>${links}</section><a href="https://naeil.dev/${locale}/blog">Blog</a></nav>`:`<nav class="ui-navigation-menu-grid">${links}</nav>`}${mobile?'<button id="mobile-theme">Theme</button>':''}</div><script>(()=>{
  const catalog=document.getElementById('catalog'),trigger=document.getElementById('${mobile?'menu':'projects'}');
  trigger.onclick=()=>catalog.hidden=false;
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){catalog.hidden=true;trigger.focus()}});
  const change=()=>document.documentElement.className=document.documentElement.className==='light'?'dark':'light';
  document.getElementById('theme').onclick=change;
  if(document.getElementById('mobile-theme'))document.getElementById('mobile-theme').onclick=change;
  })();</script></html>`;
}
