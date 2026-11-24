import { readFile, writeFile, mkdir } from "node:fs/promises";
const origin = "https://breathe-smog-companion.vercel.app";
const dataset = JSON.parse(await readFile("data/golden-dataset.json", "utf8"));
const selected = process.argv.includes("--all")
  ? dataset.cases.map((c) => c.id)
  : [
      "G01",
      "G02",
      "G04",
      "G05",
      "G06",
      "G08",
      "G13",
      "G18",
      "G19",
      "G23",
      "G24",
      "G27",
      "G28",
    ];
const statusResponse = await fetch(origin + "/api/status", {
  signal: AbortSignal.timeout(15000),
});
if (!statusResponse.ok)
  throw Error("Status probe failed: " + statusResponse.status);
const status = await statusResponse.json();
if (!status.aiEnabled)
  throw Error("Live AI is not configured; evaluation cannot pass.");
const report = {
  date: new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date()),
  generated_at: new Date().toISOString(),
  origin,
  provider: status.provider,
  model: status.model,
  dataset: "data/golden-dataset.json",
  scope:
    "Live user-question scenarios; --all selects all30 researched cases. Server uses real current modeled AQI; scenario AQI is not injected as a trusted reading. Semantic review required.",
  cases: [],
  complete: false,
};
await mkdir("../Private_Validation", { recursive: true });
for (const id of selected) {
  const c = dataset.cases.find((c) => c.id === id);
  const profile = {
    city: "New Delhi",
    sensitive: c.input.sensitive === true,
    purifier: c.input.purifier === true,
    distance: c.input.avoided_car_km ?? 12,
    budget: "No-cost first",
    commute: "Car",
  };
  const started = Date.now();
  let record;
  try {
    const response = await fetch(origin + "/api/chat", {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({ question: c.input.question, profile }),
      signal: AbortSignal.timeout(65000),
    });
    const answer = await response.json();
    record = {
      id,
      critical: c.critical,
      question: c.input.question,
      expected: c.expected,
      forbidden: c.forbidden,
      sources: c.sources,
      http_status: response.status,
      ...answer,
      elapsed_ms: Date.now() - started,
    };
  } catch (e) {
    record = {
      id,
      question: c.input.question,
      http_status: null,
      error: e.name,
      elapsed_ms: Date.now() - started,
    };
  }
  report.cases.push(record);
  await writeFile(
    "../Private_Validation/live-genai-evaluation.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({
      id,
      status: record.http_status,
      mode: record.mode,
      provider: record.provider,
      error: record.code || record.error,
    }),
  );
  if (record.http_status !== 200) {
    console.log("Stopping after failed live request; results are not passing.");
    break;
  }
  if (id !== selected.at(-1)) await new Promise((r) => setTimeout(r, 14000));
}
report.complete =
  report.cases.length === selected.length &&
  report.cases.every(
    (c) =>
      c.http_status === 200 &&
      ["generative", "safety-guidance"].includes(c.mode),
  );
report.flags = report.cases
  .filter((c) => c.http_status !== 200)
  .map((c) => ({
    case: c.id,
    severity: "blocking",
    code: c.code || "LIVE_REQUEST_FAILED",
    http_status: c.http_status,
    provider_status: c.providerStatus || null,
  }));
report.review_status = report.complete
  ? "Pending independent semantic review; successful HTTP alone is not factual accuracy."
  : "Blocked by failed live requests; live GenAI validation has not passed.";
await writeFile(
  "../Private_Validation/live-genai-evaluation.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    complete: report.complete,
    cases: report.cases.length,
    flags: report.flags,
  }),
);
process.exitCode = report.complete ? 0 : 1;
