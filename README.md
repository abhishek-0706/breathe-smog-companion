# Breathe: a little care, cleaner air

[Live app](https://breathe-smog-companion.vercel.app) | [Public repository](https://github.com/abhishek-0706/breathe-smog-companion)

A clean-air companion for families and communities navigating winter smog and urban pollution. Built with plain JavaScript, accessible HTML/CSS and a dependency-free Cloudflare Worker.

## Features

- Live Open-Meteo/CAMS outdoor air-quality data for nine supported cities; modeled U.S. AQI, pollutant values, provenance and timestamps. Never substitutes examples for unavailable readings.
- Household personalization: city, sensitive family members, daily commute, return distance, budget and air-cleaner availability.
- Daily low-emission routines, indoor-air guidance, explainable action impacts, local daily checklist and community pledges.
- Interactive avoided-driving CO2 scenario calculator with explicit EPA assumptions.
- Server-side Google Gemini integration with optional OpenAI Responses support with bounded context, policy instructions, deterministic emergency safeguards and honest guided-mode fallback.
- 30 source-grounded golden scenarios; 63 automated tests; desktop/mobile browser checks.

## Run locally

Requires Node.js 22 or later. No install step and no third-party runtime packages.

```sh
npm run build
npm test
npm start
```

Open http://127.0.0.1:4173. Build before testing because API security tests exercise the deployable artifact. To bypass a restricted npm wrapper, run `node scripts/build.mjs`, `node --test --test-isolation=none tests/*.test.mjs` and `node scripts/serve.mjs` directly.

## Enable generative AI

Configure `GEMINI_API_KEY` as a Vercel Production **Secret**. The existing deployment's exact variable name `Gemini_Api_Key` is also supported. Optional `GEMINI_MODEL` defaults to `gemini-3.5-flash-lite`. Gemini is preferred when a Gemini key is configured. The key is sent only to Google's fixed API host in the `x-goog-api-key` header, never in a URL or client bundle. See the [official Gemini API reference](https://ai.google.dev/api/generate-content).

Optional OpenAI support remains available with `OPENAI_API_KEY` and `OPENAI_MODEL` (default `gpt-4.1-mini`) when Gemini is not configured. Provider selection is server-owned. Never put real keys in browser code, Git or local storage. For local development, provide environment variables through your normal secret manager or shell session; the app does not automatically load `.env` files.

Without credentials, the assistant uses clearly labeled curated guided responses, not GenAI. Generated answers use normalized household context and server-fetched air data. Safety-critical intents are handled before model calls. Blocked, empty or truncated Gemini responses fail explicitly and the UI offers a labeled curated fallback. Conversation storage and data use are subject to the selected provider's policies; do not enter personal medical records. OpenAI requests use `store:false`; that setting does not apply to Gemini.

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

`npm test` currently passes 63 tests: 34 golden-set/schema/boundary/regression checks, 15 API/security/core tests 3 Vercel adapter checks and 11 Gemini provider checks. Selected assertions cover all 30 scenarios, including 15 marked critical. These are lexical and behavioral checks of guided responses; they do not establish clinical safety, complete semantic coverage or GenAI accuracy. Gemini and OpenAI HTTP contracts are mocked in automated tests; live evaluation is reported separately.

Desktop and mobile checks cover 12 flows including dialog fit, no horizontal overflow, profile persistence, checklist, community pledge, calculator and emergency response. Optional `node scripts/browser-qa.mjs` requires a dedicated, already-running local Chromium debugging instance on loopback port 9222 and the app on 4173; it modifies that test profile's local preferences and closes the test browser. Never point it at a personal browser profile.

## Deploy

`npm run build` emits `dist/server/index.js` plus `dist/.openai/hosting.json`. The Worker default-exports `fetch(request, env)`. The tracked Sites identity belongs to the original deployment; forks should register their own site. This project has no database, uploads or connector permissions.

## Safety, privacy and security

Read [SECURITY.md](SECURITY.md). Household preferences and checklists stay in browser local storage. Conversation history is in page memory; AI-enabled requests send bounded context to the server and the configured AI provider. Do not enter personal medical records. Health guidance does not diagnose or replace local medical care. Severe symptoms need emergency medical attention.

## Submission status

Code, research, guided-mode tests and local real-data integration are complete. The public GitHub repository and public Vercel production deployment are published and verified. The Gemini key is configured and an initial real request returned a generated answer. Subsequent provider requests across Flash models and the current Interactions API returned HTTP 503; stable live-model evaluation remains blocked. GitHub CodeQL extended analysis completed successfully with zero reported findings at the recorded source commit; the Codex Security plugin has not run. A narrated guided-mode preview is prepared locally. The accepted-host video URL is pending. LinkedIn posting is skipped at the owner's request, although the supplied form shows that field as required. No placeholder URLs should be submitted.

## Vercel deployment

The app is deployed at https://breathe-smog-companion.vercel.app in the owner's Vercel account. The production URL is public with explicit owner approval; preview deployment URLs retain Vercel authentication. `vercel.json`, `api/index.mjs` and `scripts/build-vercel.mjs` provide a Node function adapter and static frontend. Hosted real-data responses were verified. Both `.env.local` and `.vercel/` are excluded from Git and deployment uploads.

The Vercel AI Gateway eligibility probe returned HTTP 403 `customer_verification_required` because account card verification is required. No Gateway model output was generated. The app uses direct Gemini integration (or optional OpenAI), independently of Vercel AI Gateway. Production currently selects `gemini-4-hydrogen` through stateless Interactions requests (`store:false`, low thinking). Gemini 3 models use the compatible generateContent route. Provider calls have a bounded retry; failed calls are explicitly labeled as curated fallback. Live-provider evaluation and availability are reported in VALIDATION.json.

## Reproducing live evaluation

`node scripts/evaluate-live.mjs` runs 13 selected synthetic scenarios through the public app, at a bounded cadence. It never reads API keys. It stops on the first failed HTTP request and records failures rather than silently replacing model answers with fixtures. The full 30-case dataset is exercised by selected assertions in local tests; this live subset is a separate evaluation and requires semantic review. The current live evaluation is blocked by provider 503 responses.
