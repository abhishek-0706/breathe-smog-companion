import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { liveAir } from "../worker/air.mjs";
import {
  normalizeProfile,
  avoidedCarbon,
  guidedReply,
  scenarioDistance,
  isCurrentAir,
} from "../lib/guidance.mjs";
const source = await readFile("dist/server/index.js", "utf8");
const worker = (
  await import(
    "data:text/javascript;base64," + Buffer.from(source).toString("base64")
  )
).default;
const root = "https://robustness.example";
let sequence = 0;
function request(path, body, headers = {}) {
  const r = new Request(root + path, {
    ...(body === undefined
      ? {}
      : { method: "POST", body: JSON.stringify(body) }),
    headers: {
      Origin: root,
      "Content-Type": "application/json",
      "CF-Connecting-IP": "robust-" + ++sequence,
      ...headers,
    },
  });
  Object.defineProperty(r, "cf", { value: {} });
  return r;
}
async function mocked(fetcher, run) {
  const original = globalThis.fetch;
  globalThis.fetch = fetcher;
  try {
    return await run();
  } finally {
    globalThis.fetch = original;
  }
}
function airFixture() {
  return {
    current: {
      time: new Date().toISOString().slice(0, 16),
      us_aqi: 172,
      pm2_5: 72,
    },
    timezone: "UTC",
    utc_offset_seconds: 0,
  };
}
function providerMock(payload) {
  return async (url) =>
    new URL(url).hostname === "air-quality-api.open-meteo.com"
      ? Response.json(airFixture())
      : Response.json(payload);
}

test("JSON-shaped profile values never throw or escape the supported schema", () => {
  const values = [
    null,
    true,
    false,
    "",
    "  ",
    "NaN",
    "Infinity",
    "<svg onload=alert(1)>",
    0,
    -1,
    100000,
    [],
    [1],
    {},
    { toString: 0, valueOf: 0 },
    { __proto__: null },
    { distance: "10" },
  ];
  for (const value of values) {
    for (const field of [
      "city",
      "distance",
      "sensitive",
      "commute",
      "purifier",
      "budget",
    ]) {
      const p = normalizeProfile({ [field]: value });
      assert.ok(
        Number.isFinite(p.distance) && p.distance >= 0 && p.distance <= 100,
      );
      assert.equal(typeof p.city, "string");
      assert.equal(typeof p.sensitive, "boolean");
      assert.equal(typeof p.purifier, "boolean");
      assert.deepEqual(Object.keys(p).sort(), [
        "budget",
        "city",
        "commute",
        "distance",
        "purifier",
        "sensitive",
      ]);
    }
  }
});

test("carbon arithmetic remains finite and dimensionally correct across a seeded range", () => {
  let seed = 74241;
  for (let i = 0; i < 1000; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const km = (seed / 4294967296) * 10000;
    const result = avoidedCarbon(km, 7);
    assert.ok(Number.isFinite(result) && result >= 0);
    assert.ok(Math.abs((result * 1.609344) / 0.4 / 7 - km) < 1e-8);
  }
  assert.throws(
    () => avoidedCarbon(Number.MAX_VALUE, Number.MAX_VALUE),
    RangeError,
  );
});

test("explicit distance parsing handles fractions, separators and miles without silent profile substitution", () => {
  for (const [text, km] of [
    ["Avoid .5 km", 0.5],
    ["Avoid 1,000 km", 1000],
    ["Avoid 2 miles", 3.218688],
    ["Avoid 10.25 kilometres", 10.25],
  ])
    assert.ok(Math.abs(scenarioDistance(text, 12) - km) < 1e-8, text);
  for (const text of ["Avoid - 10 km", "Avoid -10 miles", "Avoid 1e309 km"])
    assert.equal(scenarioDistance(text, 12), null, text);
});

test("upstream calendar dates must exist instead of normalizing to another day", async () => {
  for (const time of [
    "2026-02-30T12:00",
    "2026-04-31T12:00",
    "2026-11-24T24:00",
    "2026-11-24T12:60",
  ]) {
    await mocked(
      async () =>
        Response.json({ ...airFixture(), current: { time, us_aqi: 42 } }),
      async () => {
        await assert.rejects(liveAir("New Delhi", {}), undefined, time);
      },
    );
  }
});

test("provider UTC offsets are finite civil offsets and include Kathmandu's quarter-hour zone", async () => {
  for (const offset of [15 * 3600, -15 * 3600, 123.5]) {
    await mocked(
      async () =>
        Response.json({ ...airFixture(), utc_offset_seconds: offset }),
      async () => assert.rejects(liveAir("New Delhi", {})),
    );
  }
  const originalNow = Date.now;
  try {
    Date.now = () => Date.parse("2026-11-24T06:15:00Z");
    await mocked(
      async () =>
        Response.json({
          ...airFixture(),
          current: { time: "2026-11-24T12:00", us_aqi: 42 },
          timezone: "Asia/Kathmandu",
          utc_offset_seconds: 20700,
        }),
      async () => {
        const a = await liveAir("Kathmandu", {});
        assert.equal(a.modeledAt, "2026-11-24T06:15:00.000Z");
        assert.equal(a.stale, false);
      },
    );
  } finally {
    Date.now = originalNow;
  }
});

test("forecast normalization removes impossible dates, duplicates and time reversals", async () => {
  const raw = {
    ...airFixture(),
    hourly: {
      time: [
        "2026-11-24T12:00",
        "2026-02-30T12:00",
        "2026-11-24T11:00",
        "2026-11-24T12:00",
      ],
      us_aqi: [110, 0, 100, 999],
    },
  };
  await mocked(
    async () => Response.json(raw),
    async () => {
      const a = await liveAir("London", {});
      assert.deepEqual(a.hourly.time, ["2026-11-24T11:00", "2026-11-24T12:00"]);
      assert.deepEqual(a.hourly.us_aqi, [100, 110]);
    },
  );
});

test("freshness boundaries never convert absent or excessive values to a current reading", () => {
  const now = Date.now();
  for (const aqi of [null, undefined, NaN, Infinity, -1, 2001, {}])
    assert.equal(
      isCurrentAir(
        { current: { us_aqi: aqi }, modeledAt: new Date(now).toISOString() },
        now,
      ),
      false,
    );
  const current = {
    current: { us_aqi: 0 },
    modeledAt: new Date(now - 10800000).toISOString(),
  };
  assert.equal(isCurrentAir(current, now), true);
  assert.equal(isCurrentAir(current, now + 1), false);
});

test("all supported cities fetch only fixed upstream coordinates", async () => {
  const { CITIES } = await import("../lib/guidance.mjs");
  for (const [city, [lat, lon]] of Object.entries(CITIES)) {
    await mocked(
      async (url) => {
        const parsed = new URL(url);
        assert.equal(parsed.origin, "https://air-quality-api.open-meteo.com");
        assert.equal(Number(parsed.searchParams.get("latitude")), lat);
        assert.equal(Number(parsed.searchParams.get("longitude")), lon);
        return Response.json(airFixture());
      },
      async () =>
        assert.equal(
          (await liveAir(city, {})).source,
          "Open-Meteo / CAMS atmospheric models",
        ),
    );
  }
});

test("an optional cache failure does not turn a healthy data provider into an outage", async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "caches");
  Object.defineProperty(globalThis, "caches", {
    configurable: true,
    value: {
      default: {
        async match() {
          throw Error("cache unavailable");
        },
        async put() {
          throw Error("cache unavailable");
        },
      },
    },
  });
  try {
    await mocked(
      async () => Response.json(airFixture()),
      async () =>
        assert.equal(
          (await worker.fetch(request("/api/air?city=London"), {})).status,
          200,
        ),
    );
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "caches", descriptor);
    else delete globalThis.caches;
  }
});

test("simultaneous spoofed requests cannot race past a single-client chat limit", async () => {
  const responses = await Promise.all(
    Array.from({ length: 75 }, (_, i) =>
      worker.fetch(
        request(
          "/api/chat",
          { question: "I cannot breathe" },
          {
            "CF-Connecting-IP": "robust-concurrent",
            "oai-authenticated-user-id": "forged-" + i,
          },
        ),
        {},
      ),
    ),
  );
  assert.equal(responses.filter((r) => r.status === 200).length, 8);
  assert.equal(responses.filter((r) => r.status === 429).length, 67);
  for (const response of responses.filter((r) => r.status === 429))
    assert.equal(response.headers.get("retry-after"), "60");
});

test("hostile origins, malformed JSON-shaped bodies and multibyte limits are rejected safely", async () => {
  for (const Origin of [
    "null",
    "https://robustness.example.evil.test",
    "http://robustness.example",
    "https://evil.test",
  ]) {
    assert.equal(
      (
        await worker.fetch(
          request("/api/chat", { question: "I cannot breathe" }, { Origin }),
          {},
        )
      ).status,
      403,
    );
  }
  for (const body of [
    null,
    [],
    42,
    true,
    "hello",
    {},
    { question: null },
    { question: {} },
    { question: "   " },
  ]) {
    assert.equal(
      (await worker.fetch(request("/api/chat", body), {})).status,
      400,
    );
  }
  const large = await worker.fetch(
    request("/api/chat", { question: "\u{1F331}".repeat(4500) }),
    {},
  );
  assert.equal(large.status, 413);
  assert.equal(large.headers.get("x-content-type-options"), "nosniff");
  assert.equal(large.headers.get("cache-control"), "no-store");
});

test("critical wording variations bypass models and preserve the right hazard", async () => {
  const cases = [
    ["My child is gasping and unresponsive", /emergency.*now/i],
    ["Can I use the barbecue in my bedroom?", /carbon monoxide/i],
    ["Is indoor BBQ safe if I run a purifier?", /carbon monoxide/i],
    [
      "Can an ozone cleaner make my petrol generator safe in the garage?",
      /carbon monoxide/i,
    ],
    [
      "A diesel generator is running inside and I feel dizzy",
      /carbon monoxide/i,
    ],
    ["My respirator makes breathing difficult", /remove the respirator/i],
    [
      "Should I increase my medication dosage for smog?",
      /clinician|care plan/i,
    ],
    ["We cannot cool our dangerously hot flat", /cooler cleaner-air space/i],
  ];
  await mocked(
    () => assert.fail("Critical advice must not depend on upstream services"),
    async () => {
      for (const [question, expected] of cases) {
        const response = await worker.fetch(
          request("/api/chat", { question }),
          { GEMINI_API_KEY: "dummy-test-key" },
        );
        const data = await response.json();
        assert.equal(response.status, 200, question);
        assert.equal(data.mode, "safety-guidance", question);
        assert.match(data.answer, expected, question);
      }
    },
  );
});

test("ordinary low-heat cooking is not classified as a dangerous-heat emergency", () => {
  const answer = guidedReply(
    "Should I use low-heat cooking instead of frying?",
    {},
    170,
  );
  assert.match(answer, /steaming|boiling/);
  assert.doesNotMatch(answer, /Do not stay in dangerous indoor heat/);
});

test("candidate-level safety blocking overrides an inconsistent STOP finish reason", async () => {
  await mocked(
    providerMock({
      candidates: [
        {
          finishReason: "STOP",
          safetyRatings: [{ blocked: true }],
          content: {
            parts: [{ text: "This blocked answer must never be displayed." }],
          },
        },
      ],
    }),
    async () => {
      const response = await worker.fetch(
        request("/api/chat", { question: "How can I reduce household dust?" }),
        { GEMINI_API_KEY: "dummy-test-key" },
      );
      assert.equal(response.status, 502);
      assert.doesNotMatch(await response.text(), /This blocked answer/);
    },
  );
});

test("non-text OpenAI fields never masquerade as a completed answer", async () => {
  await mocked(
    providerMock({
      status: "completed",
      output: [
        {
          type: "message",
          content: [{ type: "output_text", text: { malformed: true } }],
        },
      ],
    }),
    async () => {
      const response = await worker.fetch(
        request("/api/chat", { question: "How can I reduce household dust?" }),
        { OPENAI_API_KEY: "dummy-test-key" },
      );
      assert.equal(response.status, 502);
      assert.doesNotMatch(await response.text(), /object Object|malformed/);
    },
  );
});

test("untrusted provider markup stays a string and thought content stays private", async () => {
  const markup = '<img src=x onerror="window.untrustedCodeRan=true">';
  await mocked(
    providerMock({
      candidates: [
        {
          finishReason: "STOP",
          content: {
            parts: [
              { thought: true, text: "PRIVATE_THOUGHT" },
              { text: markup },
            ],
          },
        },
      ],
    }),
    async () => {
      const response = await worker.fetch(
        request("/api/chat", { question: "How can I reduce household dust?" }),
        { GEMINI_API_KEY: "dummy-test-key" },
      );
      assert.equal(response.status, 200);
      const result = await response.json();
      assert.equal(result.answer, markup);
      assert.doesNotMatch(result.answer, /PRIVATE_THOUGHT/);
    },
  );
});

test("local calendar days follow the selected city's timezone including DST", async () => {
  const { localDay } = await import("../lib/time.mjs");
  const now = Date.parse("2026-11-24T20:00:00Z");
  assert.equal(localDay("London", now), "2026-11-24");
  assert.equal(localDay("New Delhi", now), "2026-11-25");
  assert.equal(localDay("Kathmandu", now), "2026-11-25");
  assert.equal(
    localDay("New York", Date.parse("2026-07-01T04:30:00Z")),
    "2026-07-01",
  );
  assert.equal(
    localDay("New York", Date.parse("2026-12-01T04:30:00Z")),
    "2026-11-30",
  );
});

test("forecast selection shows future points for the supplied offset, never yesterday's samples", async () => {
  const { forecastPoints } = await import("../lib/time.mjs");
  const air = {
    utcOffsetSeconds: 20700,
    hourly: {
      time: [
        "2026-11-24T10:00",
        "2026-11-24T12:00",
        "2026-11-24T15:00",
        "2026-11-24T15:00",
        "2026-11-25T14:00",
      ],
      us_aqi: [80, 90, 100, 101, 110],
    },
  };
  const points = forecastPoints(air, Date.parse("2026-11-24T05:30:00Z"));
  assert.deepEqual(
    points.map((p) => p.value),
    [90, 100],
  );
});

test("every supported location has a valid explicit timezone", async () => {
  const { CITY_TIMEZONES } = await import("../lib/time.mjs");
  const { CITIES } = await import("../lib/guidance.mjs");
  assert.deepEqual(
    Object.keys(CITY_TIMEZONES).sort(),
    Object.keys(CITIES).sort(),
  );
  for (const timezone of Object.values(CITY_TIMEZONES))
    assert.doesNotThrow(() =>
      new Intl.DateTimeFormat("en", { timeZone: timezone }).format(new Date()),
    );
});

test("optimized first-load browser assets stay within a compact transfer budget", async () => {
  const { gzipSync } = await import("node:zlib");
  let bytes = 0;
  for (const path of ["/", "/app.js", "/style.css"]) {
    const response = await worker.fetch(new Request(root + path), {});
    assert.equal(response.status, 200);
    const text = await response.text();
    bytes += gzipSync(text).length;
    if (path === "/app.js")
      assert.doesNotMatch(text, /from ["']https?:|import\(["']https?:/);
  }
  assert.ok(bytes < 48 * 1024, "First-load gzip equivalent exceeds 48 KiB");
});

test("fractional AQI cannot display an integer with a conflicting category", async () => {
  const { category } = await import("../lib/guidance.mjs");
  for (const [value, expected] of [
    [50.49, "Good"],
    [50.5, "Moderate"],
    [100.49, "Moderate"],
    [100.5, "Unhealthy for sensitive groups"],
    [150.49, "Unhealthy for sensitive groups"],
    [150.5, "Unhealthy"],
    [200.49, "Unhealthy"],
    [200.5, "Very unhealthy"],
    [300.5, "Hazardous"],
  ]) {
    const fixture = airFixture();
    fixture.current.us_aqi = value;
    fixture.hourly = { time: [fixture.current.time], us_aqi: [value] };
    await mocked(
      async () => Response.json(fixture),
      async () => {
        const air = await liveAir("London", {});
        assert.equal(air.current.us_aqi, Math.round(value));
        assert.equal(category(air.current.us_aqi).label, expected);
        assert.deepEqual(air.hourly.us_aqi, [Math.round(value)]);
      },
    );
  }
});

test("pediatric respirator fit advice is sourced and independent of model availability", async () => {
  await mocked(
    () => assert.fail("Pediatric fit guidance must not require a model"),
    async () => {
      for (const question of [
        "Can my toddler use my adult N95 outdoors in heavy smog?",
        "Can my baby wear my FFP2?",
        "What respirator fits a 7-year-old?",
        "Which mask should children use?",
      ]) {
        const response = await worker.fetch(
          request("/api/chat", { question }),
          { GEMINI_API_KEY: "dummy-test-key" },
        );
        assert.equal(response.status, 200);
        const data = await response.json();
        assert.equal(data.mode, "safety-guidance");
        assert.match(data.answer, /may not fit|seal properly/);
        assert.match(data.answer, /pediatric clinician/);
        assert.match(data.answer, /cleaner indoor air/);
        assert.ok(
          data.answer.includes(
            "Source: https://www.cdc.gov/wildfires/risk-factors/wildfire-smoke-and-children.html",
          ),
        );
      }
    },
  );
});
