import {writeFile} from 'node:fs/promises';
const tabs=await(await fetch('http://127.0.0.1:9222/json')).json();const tab=tabs.find(t=>t.type==='page'&&t.url.includes('4173'));if(!tab)throw Error('App tab unavailable');
const ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject});let seq=0;const pending=new Map();ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);if(!p)return;pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result)}};
function cdp(method,params={}){return new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))})}
async function evaluate(expression){const r=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value}
function assert(v,m){if(!v)throw Error(m);console.log('PASS',m)}
try{
await cdp('Emulation.setDeviceMetricsOverride',{width:1600,height:1200,deviceScaleFactor:1,mobile:false});await cdp('Page.navigate',{url:'http://127.0.0.1:4173/'});
await new Promise(r=>setTimeout(r,3000));
assert(await evaluate("document.querySelector('h1').textContent.includes('breath')"),'Overview renders');
assert(await evaluate("document.documentElement.scrollWidth<=innerWidth"),'Desktop has no horizontal overflow');
await evaluate("document.querySelector('#personalize').click()");assert(await evaluate("document.querySelector('#profile-dialog').open"),'Household dialog opens');
await evaluate("document.querySelector('#city').value='London';document.querySelector('#sensitive').checked=true;document.querySelector('#budget').value='No-cost first';document.querySelector('#profile-form').requestSubmit()");
assert(await evaluate("!document.querySelector('#profile-dialog').open && document.querySelector('#city-label').textContent==='London'"),'Preferences save and update city');
await evaluate("document.querySelector('[data-done]').click()");assert(await evaluate("document.querySelector('[data-done]').getAttribute('aria-pressed')==='true'"),'Daily checklist toggles');
await evaluate("document.querySelector('[data-view=impact]').click()");await evaluate("document.querySelector('#km-range').value=10;document.querySelector('#km-range').dispatchEvent(new Event('input',{bubbles:true}))");assert(await evaluate("document.querySelector('#carbon-number').textContent==='2.5'"),'Impact calculation updates');
await evaluate("document.querySelector('[data-view=community]').click();document.querySelector('[data-pledge]').click()");assert(await evaluate("JSON.parse(localStorage.getItem('breathe-pledges')).length===1"),'Community pledge persists');
await evaluate("document.querySelector('[data-view=indoor]').click()");assert(await evaluate("document.querySelector('h1').textContent.includes('home')"),'Indoor guidance renders');
await evaluate("document.querySelector('#question').value='My child cannot breathe';document.querySelector('#chat-form').requestSubmit()");assert(await evaluate("document.querySelector('#chat-log').lastElementChild.textContent.includes('emergency')"),'Companion prioritizes medical emergency');
await evaluate("document.querySelector('[data-view=overview]').click()");
await cdp('Page.reload');await new Promise(r=>setTimeout(r,2500));assert(await evaluate("document.querySelector('#city-label').textContent==='London'"),'Preferences survive reload');
await writeFile('.sites-runtime/desktop.png',Buffer.from((await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64'));
await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await new Promise(r=>setTimeout(r,600));assert(await evaluate("document.documentElement.scrollWidth<=innerWidth"),'Mobile has no horizontal overflow');
await evaluate("document.querySelector('#location-open').click()");assert(await evaluate("document.querySelector('#profile-dialog').getBoundingClientRect().width<innerWidth"),'Mobile dialog fits viewport');await evaluate("document.querySelector('#profile-dialog').close()");
await writeFile('.sites-runtime/mobile.png',Buffer.from((await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64'));
console.log(JSON.stringify({ui:'passed',checks:12}));
}finally{await cdp('Browser.close').catch(()=>{});ws.close()}
