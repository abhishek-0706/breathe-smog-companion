import { readFile, writeFile, mkdir } from "node:fs/promises";
import axe from "axe-core";
import { advancedScenarios } from "./browser-scenarios.mjs";
const origin = process.env.BREATHE_QA_ORIGIN || "http://127.0.0.1:4180";
const debugPort = Number(process.env.BREATHE_DEBUG_PORT || 9341);
if (new URL(origin).hostname !== "127.0.0.1")
  throw Error("Use an isolated local preview for mocked browser QA.");
const tabs = await (
  await fetch("http://127.0.0.1:" + debugPort + "/json", {
    signal: AbortSignal.timeout(10000),
  })
).json();
const tab = tabs.find((t) => t.type === "page");
if (!tab) throw Error("Dedicated QA browser tab unavailable");
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.onopen = resolve;
  ws.onerror = reject;
});
let sequence = 0;
const pending = new Map(),
  runtimeErrors = [];
const report = {
  checkedOn: "2026-11-24",
  origin,
  browser: "Microsoft Edge headless",
  fixture:
    "Synthetic deterministic air data and guided mode; not a live-provider or model-accuracy test.",
  checks: [],
  accessibility: [],
  runtimeErrors,
  mockedRequests: [],
};
function cdp(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence,
      timer = setTimeout(() => {
        pending.delete(id);
        reject(Error("Browser timeout: " + method));
      }, 45000);
    pending.set(id, { resolve, reject, timer });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id) {
    const p = pending.get(m.id);
    if (p) {
      pending.delete(m.id);
      clearTimeout(p.timer);
      m.error ? p.reject(Error(JSON.stringify(m.error))) : p.resolve(m.result);
    }
  }
  if (m.method === "Runtime.exceptionThrown")
    runtimeErrors.push(m.params.exceptionDetails.text);
};
async function evaluate(expression) {
  const r = await cdp("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (r.exceptionDetails)
    throw Error(
      r.exceptionDetails.exception?.description || r.exceptionDetails.text,
    );
  return r.result.value;
}
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(expression) {
  const end = Date.now() + 15000;
  while (Date.now() < end) {
    if (await evaluate(expression)) return;
    await pause(150);
  }
  throw Error("Condition timed out: " + expression);
}
async function check(name, expression) {
  const pass = !!(await evaluate(expression));
  report.checks.push({ name, pass });
  console.log((pass ? "PASS " : "FAIL ") + name);
}
async function audit(name) {
  await evaluate(axe.source + ";void 0");
  const result = await evaluate(
    "axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}}).then(r=>({violations:r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary,html:n.html}))})),incomplete:r.incomplete.map(v=>v.id),passes:r.passes.length}))",
  );
  report.accessibility.push({ view: name, ...result });
  console.log("AXE " + name + ": " + result.violations.length + " violations");
}
async function click(selector) {
  await evaluate(
    "document.querySelector(" + JSON.stringify(selector) + ").click()",
  );
}
async function view(name) {
  await click('[data-view="' + name + '"]');
  await pause(80);
}
try {
  await cdp("Runtime.enable");
  await cdp("Page.enable");
  await cdp("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1100,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await cdp("Page.addScriptToEvaluateOnNewDocument", {
    source:
      "(() => {\n window.__breatheQaMode='fresh';window.__breatheQaRequests=[];\n const originalFetch=window.fetch.bind(window);\n window.fetch=async(input,options)=>{\n  const url=new URL(typeof input==='string'?input:input.url,location.href);\n  if(url.origin!==location.origin||!['/api/air','/api/status'].includes(url.pathname))return originalFetch(input,options);\n  window.__breatheQaRequests.push(url.pathname);\n  if(url.pathname==='/api/status')return Response.json({aiEnabled:false,provider:null});\n  if(window.__breatheQaMode==='offline')return Response.json({error:'Synthetic outage'},{status:503});\n  const now=new Date(),modeled=new Date(now.getTime()-(window.__breatheQaMode==='aged'?4*3600000:0));\n  const time=modeled.toISOString().slice(0,16),times=Array.from({length:24},(_,i)=>new Date(modeled.getTime()+i*3600000).toISOString().slice(0,16));\n  return Response.json({current:{time,us_aqi:176,pm2_5:78},hourly:{time:times,us_aqi:times.map((_,i)=>176-i)},stale:false,modeledAt:modeled.toISOString(),fetchedAt:now.toISOString(),timezone:'UTC',place:'synthetic QA fixture',source:'Synthetic QA fixture, not a real reading'});\n };\n try{if(!sessionStorage.getItem('breathe-qa-initialized')){localStorage.clear();sessionStorage.setItem('breathe-qa-initialized','1')}}catch{}\n})();",
  });
  await cdp("Page.navigate", { url: origin });
  await until("document.querySelector('.aqi-number')?.textContent==='176'");
  await check(
    "Overview and supported locations render",
    "document.querySelector('h1').textContent.includes('breath')&&document.querySelector('#city').options.length===9",
  );
  await check(
    "Desktop fits viewport",
    "document.documentElement.scrollWidth<=innerWidth+1",
  );
  await audit("overview");
  await evaluate(
    "document.querySelector('#help-open').focus();document.querySelector('#help-open').click()",
  );
  await check(
    "Information dialog has an accessible name",
    "document.querySelector('#info-dialog').open&&!!document.getElementById(document.querySelector('#info-dialog').getAttribute('aria-labelledby'))",
  );
  await audit("information-dialog");
  await click("#info-dialog [data-close]");
  await check(
    "Closing dialog restores focus",
    "document.activeElement.id==='help-open'",
  );
  await click("#personalize");
  await check(
    "Household dialog is named",
    "document.querySelector('#profile-dialog').open&&document.querySelector('#profile-dialog').getAttribute('aria-labelledby')==='profile-title'",
  );
  await audit("household-dialog");
  await evaluate(
    "document.querySelector('#city').value='London';document.querySelector('#commute').value='Work from home';document.querySelector('#sensitive').checked=true;document.querySelector('#purifier').checked=true;document.querySelector('#profile-form').requestSubmit()",
  );
  await until("document.querySelector('.aqi-number')?.textContent==='176'");
  await check(
    "Household settings tailor remote-work routine",
    "document.querySelector('#city-label').textContent==='London'&&document.querySelector('#page').textContent.includes('Keep today a no-drive day')",
  );
  await evaluate("document.querySelector('[data-done=move]').focus()");
  await cdp("Input.dispatchKeyEvent", {
    type: "keyDown",
    text: "\r",
    unmodifiedText: "\r",
    key: "Enter",
    code: "Enter",
    windowsVirtualKeyCode: 13,
  });
  await cdp("Input.dispatchKeyEvent", {
    type: "keyUp",
    key: "Enter",
    code: "Enter",
    windowsVirtualKeyCode: 13,
  });
  await until(
    "document.querySelector('[data-done=move]').getAttribute('aria-pressed')==='true'",
  );
  await check(
    "Keyboard check-in preserves focus",
    "document.querySelector('[data-done=move]').getAttribute('aria-pressed')==='true'&&document.activeElement.dataset.done==='move'",
  );
  await view("routines");
  await check(
    "View change moves focus to main",
    "document.activeElement.id==='main'",
  );
  await check(
    "Forecast has a text alternative",
    "document.querySelector('[aria-label=\"Forecast values\"]')?.children.length===8",
  );
  await audit("routines");
  await view("indoor");
  await check(
    "Indoor guidance renders",
    "document.querySelector('h1').textContent.toLowerCase().includes('home')",
  );
  await audit("indoor");
  await view("impact");
  await evaluate(
    "document.querySelector('#km-range').value=10;document.querySelector('#km-range').dispatchEvent(new Event('input',{bubbles:true}))",
  );
  await check(
    "Calculator updates and announces result",
    "document.querySelector('#carbon-number').textContent==='2.5'&&document.querySelector('#carbon-number').getAttribute('aria-live')==='polite'",
  );
  await audit("impact");
  await view("community");
  await click("[data-pledge]");
  await check(
    "Community commitment persists",
    "JSON.parse(localStorage.getItem('breathe-pledges')).length===1",
  );
  await audit("community");
  await evaluate(
    "document.querySelector('#question').value='My child cannot breathe';document.querySelector('#chat-form').requestSubmit()",
  );
  await check(
    "Emergency reply and busy state are accurate",
    "document.querySelector('#chat-log').lastElementChild.textContent.includes('emergency')&&document.querySelector('#chat-log').getAttribute('aria-busy')==='false'",
  );
  await cdp("Page.reload");
  await until("document.querySelector('.aqi-number')?.textContent==='176'");
  await check(
    "Profile survives reload",
    "document.querySelector('#city-label').textContent==='London'",
  );
  await evaluate(
    "localStorage.setItem('breathe-actions-2026-10-01','[\"move\"]');localStorage.setItem('unrelated-app','keep')",
  );
  await click("#chat-privacy");
  await audit("privacy-dialog");
  await click("#clear-local");
  await until("document.querySelector('.aqi-number')?.textContent==='176'");
  report.privacyStorageKeys = await evaluate("Object.keys(localStorage)");
  await check(
    "Privacy reset clears old app data only",
    "!Object.keys(localStorage).some(k=>k.startsWith('breathe-'))&&localStorage.getItem('unrelated-app')==='keep'",
  );
  await evaluate("window.__breatheQaMode='aged'");
  await click("#refresh-air");
  await until("document.querySelector('.aqi-number')?.textContent==='—'");
  await check(
    "Aged data is not presented as current",
    "document.querySelector('.live-tag').textContent.includes('Stale')",
  );
  await evaluate("window.__breatheQaMode='offline'");
  await click("#refresh-air");
  await until("document.querySelector('.error-panel')!==null");
  await check(
    "Outage never fabricates a zero AQI",
    "document.querySelector('.aqi-number').textContent==='—'&&document.querySelector('.status-pill').textContent==='Unavailable'",
  );
  await evaluate("window.__breatheQaMode='fresh'");
  await click("#refresh-air");
  await until("document.querySelector('.aqi-number')?.textContent==='176'");
  await mkdir(".sites-runtime/quality-review", { recursive: true });
  await writeFile(
    ".sites-runtime/quality-review/desktop.png",
    Buffer.from(
      (
        await cdp("Page.captureScreenshot", {
          format: "png",
          captureBeyondViewport: false,
        })
      ).data,
      "base64",
    ),
  );
  await cdp("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await check(
    "Mobile fits viewport",
    "document.documentElement.scrollWidth<=innerWidth+1",
  );
  await audit("mobile-overview");
  await click("#location-open");
  await check(
    "Mobile household dialog fits",
    "document.querySelector('#profile-dialog').getBoundingClientRect().width<innerWidth",
  );
  await cdp("Input.dispatchKeyEvent", {
    type: "keyDown",
    key: "Escape",
    code: "Escape",
    windowsVirtualKeyCode: 27,
  });
  await cdp("Input.dispatchKeyEvent", {
    type: "keyUp",
    key: "Escape",
    code: "Escape",
    windowsVirtualKeyCode: 27,
  });
  await check(
    "Escape closes the modal",
    "!document.querySelector('#profile-dialog').open",
  );
  await writeFile(
    ".sites-runtime/quality-review/mobile.png",
    Buffer.from(
      (
        await cdp("Page.captureScreenshot", {
          format: "png",
          captureBeyondViewport: false,
        })
      ).data,
      "base64",
    ),
  );
  report.extended = await advancedScenarios({
    cdp,
    evaluate,
    until,
    check,
    audit,
    click,
    view,
    pause,
  });
  report.complete = true;
} catch (error) {
  report.complete = false;
  report.error = error.message;
  report.lastState = await evaluate(
    "({url:location.href,title:document.title,ready:document.readyState,aqi:document.querySelector('.aqi-number')?.textContent,error:document.querySelector('.error-panel')?.textContent,heading:document.querySelector('h1')?.textContent,resources:performance.getEntriesByType('resource').map(r=>r.name)})",
  ).catch((e) => ({ error: e.message }));
  console.log("QA stopped: " + error.message);
} finally {
  report.mockedRequests = await evaluate(
    "window.__breatheQaRequests||[]",
  ).catch(() => []);
  await cdp("Browser.close").catch(() => {});
  ws.close();
  for (const p of pending.values()) {
    clearTimeout(p.timer);
    p.reject(Error("QA browser closed"));
  }
  pending.clear();
  report.pass =
    report.complete &&
    report.checks.every((c) => c.pass) &&
    report.accessibility.every((a) => a.violations.length === 0) &&
    runtimeErrors.length === 0;
  await mkdir("../Private_Validation/rigorous-2026-11-24", { recursive: true });
  await writeFile(
    "../Private_Validation/rigorous-2026-11-24/browser-accessibility.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({
      complete: report.complete,
      pass: report.pass,
      checks: report.checks.length,
      failed: report.checks.filter((c) => !c.pass),
      audits: report.accessibility.map((a) => ({
        view: a.view,
        violations: a.violations.map((v) => v.id),
      })),
      runtimeErrors,
    }),
  );
  process.exitCode = report.pass ? 0 : 1;
}
