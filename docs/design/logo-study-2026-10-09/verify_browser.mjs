import { spawn } from "node:child_process";
import { readFile, writeFile, mkdtemp, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const root = path.dirname(fileURLToPath(import.meta.url));
const profile = await mkdtemp(path.join(tmpdir(), "naeil-review-chrome-"));
const chrome = spawn(process.argv[2] || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
  "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
  "--disable-background-networking", "--disable-extensions", "--disable-sync",
  "--hide-scrollbars", "--force-device-scale-factor=1", "--remote-debugging-port=0",
  "--user-data-dir=" + profile
], {stdio: "ignore"});
let ws;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const report = {html_sha256:createHash("sha256").update(await readFile(path.join(root,"review.html"))).digest("hex"), cases:[]};
try {
  let port;
  for (let attempt=0; attempt<120; attempt++) {
    try { port = Number((await readFile(path.join(profile,"DevToolsActivePort"),"utf8")).split("\n")[0]); break; } catch {}
    await delay(100);
  }
  if (!port) throw new Error("Chrome debugging port unavailable");
  const target = await (await fetch("http://127.0.0.1:"+port+"/json/new?about:blank",{method:"PUT"})).json();
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
  let id=0;
  const pending = new Map();
  ws.onmessage = event => {
    const data=JSON.parse(event.data);
    const entry=pending.get(data.id);
    if (entry) { clearTimeout(entry.timer); pending.delete(data.id); data.error?entry.reject(data.error):entry.resolve(data.result); }
  };
  function cdp(method,params={}) {
    return new Promise((resolve,reject)=>{
      const key=++id;
      const timer=setTimeout(()=>{pending.delete(key);reject(new Error("Timeout: "+method));},12000);
      pending.set(key,{resolve,reject,timer});
      ws.send(JSON.stringify({id:key,method,params}));
    });
  }
  async function evaluate(expression) {
    const result=await cdp("Runtime.evaluate",{expression,awaitPromise:true,returnByValue:true});
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  }
  async function ready() {
    for (let n=0;n<60;n++) {
      const done = await evaluate('document.readyState === "complete" && document.images.length > 0 && [...document.images].every(i => i.complete && i.naturalWidth > 0)');
      if (done) return;
      await delay(100);
    }
    throw new Error("Artwork images did not finish loading");
  }
  async function click(selector) {
    const rect=await evaluate('(() => {const e=document.querySelector('+JSON.stringify(selector)+');e.scrollIntoView({block:"center"});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()');
    await cdp("Input.dispatchMouseEvent",{type:"mousePressed",button:"left",clickCount:1,...rect});
    await cdp("Input.dispatchMouseEvent",{type:"mouseReleased",button:"left",clickCount:1,...rect});
    await ready();
  }
  await cdp("Page.enable");
  await cdp("Runtime.enable");
  await cdp("DOM.enable");
  await cdp("CSS.enable");
  const version=await cdp("Browser.getVersion");
  report.browser=version.product;
  for (const [name,width,height,dark] of [
    ["desktop-light",1440,1120,false],["desktop-dark",1440,1120,true],
    ["mobile-light",390,980,false],["mobile-dark",390,980,true]]) {
    await cdp("Emulation.setDeviceMetricsOverride",{width,height,deviceScaleFactor:1,mobile:false});
    await cdp("Emulation.setTouchEmulationEnabled",{enabled:width===390,maxTouchPoints:1});
    const url=pathToFileURL(path.join(root,"review.html")).href+(dark?"?theme=dark":"");
    await cdp("Page.navigate",{url});
    await ready();
    const interactions=[];
    for (const choice of ["a-next-frame","c-ae-link","b-open-n"]) {
      await click('[data-choice="'+choice+'"]');
      const observed=await evaluate('({selected:[...document.querySelectorAll(".choose")].filter(b=>b.getAttribute("aria-pressed")==="true").map(b=>b.dataset.choice),header:document.querySelector("#header-logo").dataset.base,favicon:document.querySelector("#favicon").dataset.base})');
      if (observed.selected.length!==1 || observed.selected[0]!==choice || observed.header!==choice+"-logo") throw new Error("Selection mismatch");
      interactions.push(observed);
    }
    await click("#theme");
    if ((await evaluate('document.documentElement.dataset.theme')) !== (dark?"light":"dark")) throw new Error("Theme toggle mismatch");
    await click("#theme");
    await evaluate("scrollTo(0,0)");
    const facts=await evaluate('({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,theme:document.documentElement.dataset.theme,bodyFontSize:getComputedStyle(document.body).fontSize,buttons:[...document.querySelectorAll("button")].map(b=>({height:b.getBoundingClientRect().height,width:b.getBoundingClientRect().width})),brokenImages:[...document.images].filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src),links:[...document.querySelectorAll("a")].map(a=>a.getAttribute("href"))})');
    if(facts.scrollWidth>width || facts.brokenImages.length || facts.buttons.some(b=>b.height<44 || b.width<44)) throw new Error("Layout/artwork/control finding: "+JSON.stringify(facts));
    const doc=await cdp("DOM.getDocument");
    const heading=await cdp("DOM.querySelector",{nodeId:doc.root.nodeId,selector:"h1"});
    const fonts=await cdp("CSS.getPlatformFontsForNode",{nodeId:heading.nodeId});
    const metrics=await cdp("Page.getLayoutMetrics");
    const shot=await cdp("Page.captureScreenshot",{format:"png",captureBeyondViewport:true,clip:{x:0,y:0,width,height:Math.ceil(metrics.cssContentSize.height),scale:1}});
    const imagePath=path.join(root,"browser-"+name+".png");
    await writeFile(imagePath,Buffer.from(shot.data,"base64"));
    for (const link of facts.links) {
      await stat(path.resolve(root,link));
    }
    report.cases.push({name,...facts,actualHeadingFonts:fonts.fonts,interactions,screenshot:path.basename(imagePath)});
  }
  // Keyboard activation on the last page: Enter toggles, focus remains visible.
  await evaluate('document.querySelector("#theme").focus()');
  await cdp("Input.dispatchKeyEvent",{type:"keyDown",key:"Enter",code:"Enter",windowsVirtualKeyCode:13,text:"\r",unmodifiedText:"\r"});
  await cdp("Input.dispatchKeyEvent",{type:"keyUp",key:"Enter",code:"Enter",windowsVirtualKeyCode:13});
  await ready();
  report.keyboard=await evaluate('({focused:document.activeElement.id,theme:document.documentElement.dataset.theme,outline:getComputedStyle(document.activeElement).outlineStyle,outlineWidth:getComputedStyle(document.activeElement).outlineWidth})');
  if(report.keyboard.theme!=="light" || report.keyboard.focused!=="theme" || report.keyboard.outline!=="solid") throw new Error("Keyboard toggle/focus mismatch");
  report.status="passed scoped local review checks";
  await writeFile(path.join(root,"browser-verification.json"),JSON.stringify(report,null,2)+"\n");
  console.log(JSON.stringify({browser:report.browser,cases:report.cases.map(c=>({name:c.name,width:c.width,scrollWidth:c.scrollWidth,images:c.brokenImages.length,fonts:c.actualHeadingFonts.map(f=>f.familyName)})),keyboard:report.keyboard}));
} finally {
  if(ws) ws.close();
  chrome.kill("SIGTERM");
}
