# Breathe — a little care, cleaner air

A clean-air companion for families and communities navigating winter smog and urban pollution. Built with plain JavaScript, accessible HTML/CSS and a dependency-free Cloudflare Worker.

## Features

- Live Open-Meteo/CAMS outdoor air-quality data for nine supported cities; modeled U.S. AQI, pollutant values, provenance and timestamps. Never substitutes examples for unavailable readings.
- Household personalization: city, sensitive family members, daily commute, return distance, budget and air-cleaner availability.
- Daily low-emission routines, indoor-air guidance, explainable action impacts, local daily checklist and community pledges.
- Interactive avoided-driving CO2 scenario calculator with explicit EPA assumptions.
- Server-side OpenAI Responses API integration with bounded context, policy instructions, deterministic emergency safeguards and honest guided-mode fallback.
- 30 source-grounded golden scenarios; 49 automated tests; desktop/mobile browser checks.

## Run locally

Requires Node.js 22 or later. No install step and no third-party runtime packages.

```sh
npm run build
npm test
npm start
```

Open http://127.0.0.1:4173. Build before testing because API security tests exercise the deployable artifact. To bypass a restricted npm wrapper, run `node scripts/build.mjs`, `node --test --test-isolation=none tests/*.test.mjs` and `node scripts/serve.mjs` directly.

## Enable generative AI

The application works without credentials in **clearly labeled curated guided mode**. This is not GenAI. To use genuine generated responses, configure `OPENAI_API_KEY` as a server-side runtime secret and optionally `OPENAI_MODEL` (default `gpt-4.1-mini`). Never put the key in browser code, Git, a URL or local storage. For Sites, follow its OpenAI Developers key-provisioning workflow and deploy the saved version after setting secrets. For a standalone local setup, supply the environment variable through your normal secret manager or shell session; the app does not load `.env` files automatically.

When enabled, chat sends the user's question, a bounded recent conversation and normalized household preferences to OpenAI. The server retrieves its own air estimate rather than trusting a client-provided AQI, requests `store:false`, and handles provider failures without exposing diagnostics. No API call with real credentials has been evaluated in the initial build; run the full golden-set semantic review before representing generated answers as validated.

## Real data and limitations

Data: [Open-Meteo Air Quality API](https://open-meteo.com/en/docs/air-quality-api), using CAMS ENSEMBLE atmospheric models. This is an outdoor model estimate for city coordinates, not a household sensor, indoor measurement or official local alert. U.S. AQI differs from India's CPCB AQI. Values older than three hours are marked stale and excluded from current guidance. Five-minute public-data caching is supported on Workers.

The free provider endpoint is for noncommercial use under its rate limits (currently documented as up to 10,000 requests/day). For commercial use, obtain the appropriate plan. Recheck provider terms before production deployment. City coordinates are fixed; this version does not use live geocoding. See [research and attribution](data/RESEARCH.md).

The CO2 calculator estimates tailpipe emissions avoided when gasoline driving is replaced with **no driving**, using EPA's U.S.-average 0.4 kg/mile proxy. It is not a net public-transit saving, local fleet estimate, health prediction or AQI reduction.

## Structure

- `web/`: responsive accessible UI, local preferences and interactions.
- `lib/guidance.mjs`: AQI categories, constrained profile, curated guidance and impact math.
- `worker/index.mjs`: allowlisted provider requests, chat endpoint, input limits and security headers.
- `scripts/build.mjs`: embeds assets and guidance into one deterministic Worker module.
- `scripts/serve.mjs`: local Node HTTP adapter.
- `tests/`: source-grounded guided-answer checks and API/security tests.
- `data/golden-dataset.json`: 30 researched synthetic evaluation cases, not patient records or measured air data.
- `SUBMISSION.txt`: form copy, link status and publish steps.

## Evaluation

`npm test` currently passes 49 tests: 34 golden-set/schema/boundary/regression checks and 15 API/security/core tests. Selected assertions cover all 30 scenarios, including 15 marked critical. These are lexical and behavioral checks of guided responses; they do not establish clinical safety, complete semantic coverage or GenAI accuracy. The OpenAI HTTP contract is mocked in automated tests.

Desktop and mobile checks cover 12 flows including dialog fit, no horizontal overflow, profile persistence, checklist, community pledge, calculator and emergency response. Optional `node scripts/browser-qa.mjs` requires a dedicated, already-running local Chromium debugging instance on loopback port 9222 and the app on 4173; it modifies that test profile's local preferences and closes the test browser. Never point it at a personal browser profile.

## Deploy

`npm run build` emits `dist/server/index.js` plus `dist/.openai/hosting.json`. The Worker default-exports `fetch(request, env)`. The tracked Sites identity belongs to the original deployment; forks should register their own site. This project has no database, uploads or connector permissions.

## Safety, privacy and security

Read [SECURITY.md](SECURITY.md). Household preferences and checklists stay in browser local storage. Conversation history is in page memory; AI-enabled requests send bounded context to the server and OpenAI. Do not enter personal medical records. Health guidance does not diagnose or replace local medical care. Severe symptoms need emergency medical attention.

## Submission status

Code, research, guided-mode tests and local real-data integration are complete. GitHub public publishing requires refreshing the invalid CLI login. Generative AI configuration and actual Codex Security scanning are pending their integrations. A public demo video and LinkedIn post need separate publishing; no placeholder URLs should be submitted.
