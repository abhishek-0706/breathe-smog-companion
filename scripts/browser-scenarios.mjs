/** Extra real-browser scenarios. Synthetic fixtures never enter the shipped app. */
export async function advancedScenarios({
  cdp,
  evaluate,
  until,
  check,
  audit,
  click,
  view,
  pause,
}) {
  const fixture = () => {
    const originalFetch = window.fetch.bind(window);
    window.__qaChatMode = "normal";
    window.__qaChatRequests = [];
    window.__qaAirPending = {};
    let clock;
    try {
      clock = sessionStorage.getItem("qa-clock");
    } catch {
      /* Browser storage is optional in synthetic fixtures. */
    }
    if (clock) {
      const NativeDate = Date;
      window.__qaNow = NativeDate.parse(clock);
      window.Date = class extends NativeDate {
        constructor(...args) {
          super(...(args.length ? args : [window.__qaNow]));
        }
        static now() {
          return window.__qaNow;
        }
      };
    }
    window.fetch = async (input, options) => {
      const url = new URL(
        typeof input === "string" ? input : input.url,
        location.href,
      );
      if (url.origin !== location.origin) return originalFetch(input, options);
      if (url.pathname === "/api/status")
        return Response.json(
          { aiEnabled: true, provider: "gemini" },
          {
            status:
              sessionStorage.getItem("qa-status-error") === "1" ? 503 : 200,
          },
        );
      if (url.pathname === "/api/air" && window.__qaAirRace) {
        const city = url.searchParams.get("city");
        return new Promise((resolve) => {
          window.__qaAirPending[city] = (aqi) => {
            const now = new Date();
            resolve(
              Response.json({
                current: { time: now.toISOString().slice(0, 16), us_aqi: aqi },
                hourly: { time: [], us_aqi: [] },
                modeledAt: now.toISOString(),
                fetchedAt: now.toISOString(),
                timezone: "UTC",
                utcOffsetSeconds: 0,
                source: "Synthetic QA fixture",
                place: "synthetic race fixture",
              }),
            );
          };
        });
      }
      if (url.pathname !== "/api/chat") return originalFetch(input, options);
      window.__qaChatRequests.push(JSON.parse(options.body));
      if (window.__qaChatMode === "pending")
        return new Promise((resolve) => {
          window.__qaResolveChat = (data) => resolve(Response.json(data));
        });
      if (window.__qaChatMode === "malformed")
        return Response.json({ mode: "generative", answer: { invalid: true } });
      if (window.__qaChatMode === "error")
        return Response.json(
          { error: "PRIVATE_PROVIDER_ERROR" },
          { status: 503 },
        );
      if (window.__qaChatMode === "timeout")
        throw new DOMException("Synthetic timeout", "TimeoutError");
      return Response.json({
        mode: "generative",
        provider: "gemini",
        answer:
          window.__qaChatText ||
          "Synthetic fixture reply; not a real model generation.",
      });
    };
  };
  await cdp("Page.addScriptToEvaluateOnNewDocument", {
    source: "(" + fixture.toString() + ")()",
  });
  async function reload() {
    await cdp("Page.reload");
    await until("document.querySelector('.aqi-number')?.textContent==='176'");
    await until(
      "document.querySelector('#assistant-mode').textContent.includes('Generative AI')||document.querySelector('#assistant-mode').textContent.includes('Guided mode')",
    );
  }
  async function send(text) {
    await evaluate(
      "document.querySelector('#question').value=" +
        JSON.stringify(text) +
        ";document.querySelector('#chat-form').requestSubmit()",
    );
    await until(
      "document.querySelector('#chat-log').getAttribute('aria-busy')==='false'",
    );
  }
  await reload();
  await evaluate(
    "window.__qaChatText='<img src=x onerror=window.untrustedCodeRan=true>'",
  );
  await send("Explain the indoor-air trade-off.");
  await check(
    "Provider markup renders as text without executing",
    "document.querySelector('#chat-log').lastElementChild.textContent.includes('<img')&&!document.querySelector('#chat-log img')&&!window.untrustedCodeRan",
  );
  await evaluate("window.__qaChatMode='malformed'");
  await send("What can I do about dust?");
  await check(
    "Malformed AI output receives a labeled fallback",
    "document.querySelector('#assistant-mode').textContent.includes('fallback')&&!document.querySelector('#chat-log').lastElementChild.textContent.includes('[object Object]')",
  );
  for (const mode of ["error", "timeout"]) {
    await evaluate("window.__qaChatMode=" + JSON.stringify(mode));
    await send("How can I improve indoor air?");
    await check(
      "AI " + mode + " recovers with controls usable and private errors hidden",
      "!document.querySelector('#send').disabled&&document.querySelector('#chat-log').getAttribute('aria-busy')==='false'&&document.querySelector('#assistant-mode').textContent.includes('fallback')&&!document.querySelector('#chat-log').textContent.includes('PRIVATE_PROVIDER_ERROR')",
    );
  }
  await evaluate(
    "window.__qaChatMode='pending';document.querySelector('#question').value='PRIVATE_PENDING_QUESTION';document.querySelector('#chat-form').requestSubmit()",
  );
  await until("typeof window.__qaResolveChat==='function'");
  await check(
    "Pending model request prevents duplicate submission",
    "document.querySelector('#send').disabled&&document.querySelector('#chat-log').getAttribute('aria-busy')==='true'",
  );
  const requestCount = await evaluate("window.__qaChatRequests.length");
  await evaluate("document.querySelector('#chat-form').requestSubmit()");
  await check(
    "Second submit does not make a second request",
    "window.__qaChatRequests.length===" + requestCount,
  );
  await click("#chat-privacy");
  await click("#clear-local");
  await evaluate(
    "window.__qaResolveChat({mode:'generative',answer:'PRIVATE_OLD_REPLY'})",
  );
  await pause(60);
  await check(
    "Privacy reset removes chat and ignores a late provider response",
    "!document.querySelector('#chat-log').textContent.includes('PRIVATE_OLD_REPLY')&&!document.querySelector('#chat-log').textContent.includes('PRIVATE_PENDING_QUESTION')&&!document.querySelector('#send').disabled&&document.querySelector('#chat-log').getAttribute('aria-busy')==='false'",
  );
  await evaluate(
    "window.__qaChatMode='normal';window.__qaChatText='Synthetic fresh reply'",
  );
  await send("Start a new conversation.");
  await check(
    "A cleared conversation never returns in subsequent provider history",
    "!JSON.stringify(window.__qaChatRequests.at(-1).history).includes('PRIVATE_')",
  );

  await evaluate(
    "window.__qaChatMode='pending';document.querySelector('#question').value='OLD_CITY_QUESTION';document.querySelector('#chat-form').requestSubmit()",
  );
  await until("typeof window.__qaResolveChat==='function'");
  await click("#location-open");
  await evaluate(
    "document.querySelector('#city').value='London';document.querySelector('#profile-form').requestSubmit()",
  );
  await evaluate(
    "window.__qaResolveChat({mode:'generative',answer:'OLD_CITY_RESPONSE'})",
  );
  await pause(60);
  await check(
    "Changing household settings cannot display a late answer for the previous city",
    "document.querySelector('#city-label').textContent==='London'&&!document.querySelector('#chat-log').textContent.includes('OLD_CITY_RESPONSE')",
  );

  await evaluate("window.__qaAirRace=true");
  await click("#location-open");
  await evaluate(
    "document.querySelector('#city').value='Beijing';document.querySelector('#profile-form').requestSubmit()",
  );
  await until("typeof window.__qaAirPending.Beijing==='function'");
  await click("#location-open");
  await evaluate(
    "document.querySelector('#city').value='Lahore';document.querySelector('#profile-form').requestSubmit()",
  );
  await until("typeof window.__qaAirPending.Lahore==='function'");
  await evaluate(
    "window.__qaAirPending.Lahore(77);window.__qaAirPending.Beijing(333)",
  );
  await until("document.querySelector('.aqi-number')?.textContent==='77'");
  await check(
    "Out-of-order city data cannot replace the newest selected city",
    "document.querySelector('#city-label').textContent==='Lahore'&&document.querySelector('.aqi-number').textContent==='77'",
  );
  await evaluate("window.__qaAirRace=false");
  await click("#refresh-air");
  await until("document.querySelector('.aqi-number')?.textContent==='176'");

  await evaluate("sessionStorage.setItem('qa-status-error','1')");
  await reload();
  await check(
    "An unsuccessful AI status probe keeps guided mode",
    "document.querySelector('#assistant-mode').textContent.includes('Guided mode')",
  );
  await evaluate(
    "sessionStorage.removeItem('qa-status-error');localStorage.setItem('breathe-pledges',JSON.stringify(['idling','idling','unknown','burning','burning']));sessionStorage.setItem('qa-clock','2026-11-24T20:00:00Z');localStorage.setItem('breathe-profile',JSON.stringify({city:'London',commute:'Work from home'}))",
  );
  await cdp("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1100,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await reload();
  await check(
    "The displayed day follows the selected city timezone",
    "document.querySelector('.date').textContent===new Intl.DateTimeFormat('en',{day:'numeric',month:'long',weekday:'short',timeZone:'Europe/London'}).format(new Date())",
  );
  await view("impact");
  await check(
    "Saved pledges are valid unique commitments",
    "document.querySelectorAll('.metric')[1].textContent.trim()==='2'",
  );
  await view("overview");
  await evaluate(
    "document.querySelector('[data-done=move]').click();window.__qaNow=Date.parse('2026-11-25T00:05:00Z');document.dispatchEvent(new Event('visibilitychange'))",
  );
  await until("document.querySelector('.aqi-number')?.textContent==='176'");
  await check(
    "An open tab starts a fresh daily checklist after local midnight",
    "document.querySelector('[data-done=move]').getAttribute('aria-pressed')==='false'",
  );

  const layout = [];
  for (const width of [320, 360, 390, 768, 1024, 1440, 2560]) {
    await cdp("Emulation.setDeviceMetricsOverride", {
      width,
      height: 900,
      deviceScaleFactor: 1,
      mobile: width < 650,
    });
    for (const name of [
      "overview",
      "routines",
      "indoor",
      "impact",
      "community",
    ]) {
      await view(name);
      await check(
        "Reflow " + width + "px " + name,
        "document.documentElement.scrollWidth<=innerWidth+1",
      );
      layout.push({ width, view: name });
    }
    await click("#location-open");
    await check(
      "Household dialog fits " + width + "px",
      "(()=>{const r=document.querySelector('#profile-dialog').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.height<=innerHeight})()",
    );
    await click("#profile-dialog [data-close]");
  }
  await cdp("Emulation.setDeviceMetricsOverride", {
    width: 320,
    height: 900,
    deviceScaleFactor: 1,
    mobile: true,
  });
  for (const name of [
    "overview",
    "routines",
    "indoor",
    "impact",
    "community",
  ]) {
    await view(name);
    await audit("narrow-320-" + name);
  }
  await evaluate(
    "window.__qaChatMode='normal';window.__qaChatText='x'.repeat(10000)",
  );
  await send("A long unbroken response test");
  await check(
    "Long provider text cannot widen a narrow viewport",
    "document.documentElement.scrollWidth<=innerWidth+1&&document.querySelector('#chat-log').scrollWidth<=document.querySelector('#chat-log').clientWidth+1",
  );
  await cdp("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
  await check(
    "Reduced-motion preference is respected",
    "matchMedia('(prefers-reduced-motion: reduce)').matches&&parseFloat(getComputedStyle(document.querySelector('.primary')).transitionDuration)<=0.001",
  );
  await cdp("Page.addScriptToEvaluateOnNewDocument", {
    source:
      "if(sessionStorage.getItem('qa-block-storage')==='1')Object.defineProperty(window,'localStorage',{configurable:true,get(){throw new DOMException('Synthetic blocked storage','SecurityError')}})",
  });
  await evaluate(
    "sessionStorage.removeItem('qa-clock');sessionStorage.setItem('qa-block-storage','1')",
  );
  await reload();
  await check(
    "Blocked browser storage still renders a usable default profile",
    "document.querySelector('#city-label').textContent==='New Delhi'&&!!document.querySelector('[data-done=move]')",
  );
  await click("#location-open");
  await evaluate(
    "document.querySelector('#city').value='London';document.querySelector('#profile-form').requestSubmit()",
  );
  await until("document.querySelector('.aqi-number')?.textContent==='176'");
  await check(
    "Blocked storage allows session-only settings with a clear notice",
    "document.querySelector('#city-label').textContent==='London'&&document.querySelector('#toast').textContent.includes('storage is unavailable')",
  );
  await evaluate("sessionStorage.removeItem('qa-block-storage')");
  await reload();
  await evaluate(
    "localStorage.setItem('breathe-profile','{broken');localStorage.setItem('breathe-pledges','null');localStorage.setItem('breathe-actions-'+new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata'}).format(new Date()),'false')",
  );
  await reload();
  await check(
    "Corrupt local JSON and wrong saved types recover gracefully",
    "document.querySelector('#city-label').textContent==='New Delhi'&&!!document.querySelector('[data-done=move]')&&document.querySelector('[data-done=move]').getAttribute('aria-pressed')==='false'",
  );
  await view("community");
  await evaluate(
    "window.__qaCreateObjectURL=URL.createObjectURL;URL.createObjectURL=blob=>{window.__qaDownloadedBlob=blob;return 'blob:synthetic-download'};window.__qaAnchorClick=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){window.__qaDownloadName=this.download}",
  );
  await click("#download-pledge");
  await check(
    "The shareable community note contains the city and protects health details",
    "window.__qaDownloadedBlob.text().then(text=>window.__qaDownloadName==='breathe-neighbourhood-note.txt'&&text.includes('New Delhi')&&text.includes('consent')&&!text.includes('PRIVATE_'))",
  );
  await evaluate(
    "URL.createObjectURL=window.__qaCreateObjectURL;HTMLAnchorElement.prototype.click=window.__qaAnchorClick",
  );
  return { layoutScenarios: layout.length, viewports: 7 };
}
