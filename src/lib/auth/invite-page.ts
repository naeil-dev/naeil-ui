import { localePath, localeHref, naeilLocales } from "@/naeil-locale";
import en from "../../../messages/en.json";
import ko from "../../../messages/ko.json";
import ja from "../../../messages/ja.json";

// Invitation is an isolated protocol document, outside app/[locale]. Keep its
// existing bounded transport and render only this slice of the checked catalog.
const invitationMessages = { en: en.site.invitation, ko: ko.site.invitation, ja: ja.site.invitation };

// Isolated app HTML, not shared React component integration. Numeric/color source:
// DESIGN.md and src/tokens/semantic.json at ff1c5b6; site maintains these copies.
// Font: self-hosted Pretendard 1.3.9 (SIL OFL), public/console-invite/LICENSE.txt.
export function invitePage(
  nonce: string,
  locale: "ko" | "ja" | "en",
  initial: unknown,
): string {
  const loginHrefs = Object.fromEntries(naeilLocales.map(language => [language, localePath("main", "/login", language)]));
  const serviceHrefs = Object.fromEntries((["jev", "estimate"] as const).map(service => [
    localeHref(service, "/", "en"), Object.fromEntries(naeilLocales.map(language => [language, localeHref(service, "/", language)])),
  ]));
  const sendEnabled = process.env.NAEIL_LOCALE_SEND_ENABLED === "1";
  const messages = invitationMessages[locale];
  const { pageTitle, title: heading, pauseIntro: pausedIntro, paused: pausedHelp, intro, wait: waiting, confirm, noscript } = messages;
  const paused = !!initial && typeof initial === "object" && "status" in initial && initial.status === "paused";
  const protocolMessages = JSON.stringify(invitationMessages).replace(/</g, "\\u003c");
  const data = JSON.stringify(initial).replace(/</g, "\\u003c");
  return `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light dark"><title>${pageTitle} — .naeil</title><link rel="icon" href="/icon.svg" type="image/svg+xml">
<script nonce="${nonce}">(()=>{'use strict';
let fragment=location.hash;history.replaceState(null,'',location.pathname+location.search);
const loginHrefs=${JSON.stringify(loginHrefs)};const serviceHrefs=${JSON.stringify(serviceHrefs)};const sendEnabled=${sendEnabled};
const initial=${data};let csrf=initial.csrf;let current=initial;let language='${locale}';let busy=false;let failed=false;let malformed=false;let pendingStage=null;let needsRecovery=false;
const copy=${protocolMessages};
let appearance='system';
function render(){if(!document.getElementById('status'))return;const c=copy[language];document.documentElement.lang=language;const login=document.getElementById('paused-login');if(login){login.href=loginHrefs[language];login.textContent=c.login;}document.title=c.pageTitle+' — .naeil';document.getElementById('title').textContent=current.status==='signin'?c.login:['complete','delivery'].includes(current.status)?c.complete:c.title;document.getElementById('intro').textContent=current.status==='paused'?c.pauseIntro:current.status==='complete'?c.done:c.intro;document.getElementById('status').textContent=busy?c.working:malformed?c.invalid:needsRecovery?c.recover:failed?c.unavailable:pendingStage?c.restage:(c[current.status]||c.empty);document.getElementById('safety').textContent=current.status==='paused'?'':c.safety;const button=document.getElementById('confirm');button.hidden=(!['staged','retry','delivery','switch'].includes(current.status)&&!pendingStage&&!needsRecovery)||malformed;button.disabled=busy;button.setAttribute('aria-busy',String(busy));button.textContent=busy?c.working:needsRecovery?c.check:pendingStage?c.prepare:current.status==='switch'?c.switchButton:current.status==='delivery'?c.finish:failed||current.status==='retry'?c.again:c.confirm;const list=document.getElementById('links');list.replaceChildren();if(['complete','signin'].includes(current.status)){for(const link of current.links||[]){if(!['https://jev.naeil.dev/','https://abestimate.naeil.dev/'].includes(link.href))continue;const href=sendEnabled?serviceHrefs[link.href][language]:link.href;const a=document.createElement('a');a.href=current.status==='signin'?loginHrefs[language]+'?next='+encodeURIComponent(href):href;a.textContent=current.status==='signin'?c.login+' · '+link.label:link.label;list.append(a);}if(current.status==='signin'&&!(current.links||[]).length){const a=document.createElement('a');a.href=loginHrefs[language];a.textContent=c.login;list.append(a);}document.getElementById('status').hidden=current.status==='complete';}else document.getElementById('status').hidden=false;document.getElementById('language').textContent=c.nextLanguage;document.getElementById('theme').textContent=c.theme+': '+c[appearance];}
async function send(payload){
  let response,result;
  try{
    response=await fetch(location.pathname+location.search,{method:'POST',credentials:'same-origin',cache:'no-store',redirect:'error',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({csrf,...payload})});
    result=await response.json();
    if(!result||typeof result!=='object'||Array.isArray(result))throw new Error('Unavailable');
  }catch{needsRecovery=true;throw new Error('Unavailable');}
  if(typeof result.csrf==='string')csrf=result.csrf;
  if(!response.ok){
    if(response.status===409&&['uncertain','switch'].includes(result.status)){needsRecovery=false;pendingStage=null;return result;}
    if(response.status===403||response.status===408||response.status>=500){needsRecovery=true;}
    else{current={status:'invalid'};malformed=true;pendingStage=null;}
    throw new Error('Unavailable');
  }
  return result;
}
async function recover(){
  const response=await fetch(location.pathname+location.search,{method:'GET',credentials:'same-origin',cache:'no-store',redirect:'error',headers:{Accept:'application/json'}});
  const bootstrap=await response.json();
  if(!response.ok||typeof bootstrap.csrf!=='string')throw new Error('Unavailable');
  csrf=bootstrap.csrf;const result=await send({action:'status'});
  if(!['empty','staged','retry','invalid','uncertain','complete','delivery','switch','signin'].includes(result.status))throw new Error('Unavailable');
  current=result;needsRecovery=false;
  // A lost response may
  // include its Set-Cookie. Retain this tab's envelope until explicit restage
  // succeeds; no verification occurs until a separate subsequent confirm.
  if(result.status==='invalid'&&!pendingStage)malformed=true;
}

async function start(){render();if(current.status==='paused'){fragment='';return;}if(!fragment){if(initial.status==='empty'){try{await recover();}catch{failed=true;needsRecovery=true;}render();}return;}const raw=fragment.slice(1);fragment='';if(raw.length>2048||/%(?![0-9a-fA-F]{2})/.test(raw)){malformed=true;render();return;}const params=new URLSearchParams(raw);const keys=['id','version','nonce','token_hash'];if([...params.keys()].length!==4||keys.some(k=>params.getAll(k).length!==1)||[...params.keys()].some(k=>!keys.includes(k))||!/^([1-9][0-9]{0,14})$/.test(params.get('version')||'')){malformed=true;render();return;}pendingStage={action:'stage',id:params.get('id'),version:Number(params.get('version')),nonce:params.get('nonce'),token_hash:params.get('token_hash')};busy=true;render();try{current=await send(pendingStage);pendingStage=null;}catch{failed=true;}finally{busy=false;render();}}
document.addEventListener('DOMContentLoaded',()=>{document.getElementById('confirm').addEventListener('click',async()=>{if(busy||malformed||current.status==='paused')return;busy=true;failed=false;render();try{if(needsRecovery){await recover();}else{current=await send(pendingStage||{action:'confirm',...(current.status==='switch'?{switchFrom:current.switchFrom}:{})});pendingStage=null;}}catch{failed=true;}finally{busy=false;render();}});document.getElementById('language').addEventListener('click',()=>{language=({ko:'ja',ja:'en',en:'ko'}[language]);const params=new URLSearchParams(location.search);params.set('locale',language);history.replaceState(null,'',location.pathname+'?'+params.toString());render();});document.getElementById('theme').addEventListener('click',()=>{appearance=appearance==='system'?'light':appearance==='light'?'dark':'system';document.documentElement.dataset.theme=appearance;render();});start();});
})();</script>
<style nonce="${nonce}">
@font-face{font-family:"Noto Sans JP";src:url('/console-invite/noto-sans-jp-japanese-400-normal.woff2') format('woff2');font-weight:400;font-display:swap}@font-face{font-family:"Noto Sans JP";src:url('/console-invite/noto-sans-jp-japanese-500-normal.woff2') format('woff2');font-weight:500;font-display:swap}@font-face{font-family:"Noto Sans JP";src:url('/console-invite/noto-sans-jp-japanese-600-normal.woff2') format('woff2');font-weight:600;font-display:swap}
@font-face{font-family:Pretendard;src:url('/console-invite/PretendardVariable.woff2') format('woff2');font-weight:100 900;font-display:swap}
:root:lang(ja){--font:"Noto Sans JP"}
:root{color-scheme:light;--bg:#f7f8fa;--fg:#202127;--surface:#fff;--muted:#5f626e;--action:#292929;--on-action:#fff;--border:#8c8f9b;--focus:#616161}
@media(prefers-color-scheme:dark){:root:not([data-theme=light]){color-scheme:dark;--bg:#0b0c0e;--fg:#eff0f3;--surface:#111215;--muted:#a4a6b0;--action:#e5e5e5;--on-action:#171717;--border:#646773;--focus:#b5b5b5}}
:root[data-theme=dark]{color-scheme:dark;--bg:#0b0c0e;--fg:#eff0f3;--surface:#111215;--muted:#a4a6b0;--action:#e5e5e5;--on-action:#171717;--border:#646773;--focus:#b5b5b5}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:400 16px/1.5625 var(--font,Pretendard),system-ui,sans-serif;min-height:100svh;display:flex;align-items:center;justify-content:center;padding:32px 16px}main{width:100%;max-width:480px}.wordmark{margin:0 0 32px}.wordmark img{width:144px;height:48px;object-fit:contain;object-position:left}.brand-dark{display:none}:root[data-theme=dark] .brand-light{display:none}:root[data-theme=dark] .brand-dark{display:block}@media(prefers-color-scheme:dark){:root:not([data-theme=light]) .brand-light{display:none}:root:not([data-theme=light]) .brand-dark{display:block}}h1{font-size:32px;line-height:1.3125;font-weight:600;margin:0 0 16px;overflow-wrap:anywhere}p{margin:0 0 24px;overflow-wrap:anywhere}.support{font-size:14px;line-height:1.5715;color:var(--muted)}#status{padding:20px;background:var(--surface);border:1px solid var(--border);border-radius:12px;margin-top:32px}button,a{font:500 16px/1.5625 var(--font,Pretendard),system-ui,sans-serif;min-height:44px;border-radius:8px;padding:10px 16px;cursor:pointer}button:focus-visible,a:focus-visible{outline:2px solid var(--focus);outline-offset:3px}#confirm,#links a{display:flex;align-items:center;justify-content:center;width:100%;background:var(--action);color:var(--on-action);border:1px solid var(--action);text-decoration:none}#confirm:disabled{cursor:wait}#confirm[hidden]{display:none}#links{display:grid;gap:12px;margin:32px 0 24px}#links:empty{display:none}#paused-login{color:var(--fg);text-underline-offset:3px}.controls{display:flex;flex-wrap:wrap;gap:12px;margin-top:32px;padding-top:24px;border-top:1px solid var(--border)}.controls button{background:transparent;color:var(--fg);border:1px solid var(--border)}@media(max-width:360px){h1{font-size:28px}.controls button{flex:1}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto}}
</style></head><body><main><div class="wordmark"><img class="brand-light" src="/console-invite/naeil-wordmark-color.svg" alt=".naeil" width="144" height="48"><img class="brand-dark" src="/console-invite/naeil-wordmark-color-dark.svg" alt=".naeil" width="144" height="48"></div><h1 id="title">${heading}</h1><p id="intro">${paused ? pausedIntro : intro}</p><p id="status" role="status" aria-live="polite">${paused ? pausedHelp : waiting}</p><button id="confirm" type="button" hidden>${confirm}</button><div id="links"></div><p id="safety" class="support"></p>${paused ? `<p><a id="paused-login" href="${loginHrefs[locale]}">${messages.login}</a></p>` : `<noscript><p>${noscript}</p></noscript>`}<div class="controls"><button id="language" type="button">${messages.nextLanguage}</button><button id="theme" type="button">${messages.theme}: ${messages.system}</button></div></main></body></html>`;
}
