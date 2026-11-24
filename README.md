# Breathe - a clean-air companion

Breathe helps families and communities plan for severe winter smog and urban air pollution. It combines real city-area outdoor model estimates, household preferences, practical routines, source-linked indoor-air guidance and a Google Gemini companion. It explains which choices can reduce exposure or emissions without inventing household readings, health savings or a city AQI improvement.

- Public application: https://breathe-smog-companion.vercel.app
- Public repository: https://github.com/abhishek-0706/breathe-smog-companion
- Submission text: [SUBMISSION.txt](SUBMISSION.txt)
- Verification evidence and limits: [VALIDATION.json](VALIDATION.json)
- Code-quality verification: [reports/code-quality.json](reports/code-quality.json)
- Rigorous release summary: [reports/rigorous-validation.json](reports/rigorous-validation.json)

## Run locally

Use Node 24 and npm. Build tools are development-only; the shipped application has no third-party runtime packages.

```sh
npm ci --include=dev --ignore-scripts
npm run build
npm test
npm start
```

The preview runs at http://127.0.0.1:4173. Set `BREATHE_PORT` to use another local port. Without an AI credential, it uses explicitly labeled curated guidance. It does not load local environment files automatically. Never commit real environment files.

## What the application does

| Need | Behavior | Impact explained |
| --- | --- | --- |
| Local conditions | Retrieves Open-Meteo/CAMS outdoor model estimates for nine supported cities, with source, model time and U.S. AQI category | Outdoor estimates support planning; they are not indoor or doorstep sensor measurements |
| Household routines | Adapts to city, commute, distance, budget, sensitive members and existing air-cleaner access | Separates remote work, transit, source control and safer essential travel |
| Indoor air | Explains source control, appropriate mechanical filtration and condition-dependent ventilation | Describes particle reduction and filter limitations without a guaranteed percentage |
| Sustainable choices | Shows an explicit gasoline no-drive tailpipe scenario and personal community pledges | Distinguishes CO2 emissions, local pollutants and health exposure |
| Companion | Uses server-side Gemini with bounded context and curated source facts | Gives contextual explanations; critical safety intents use labeled public-health guidance |

Supported cities are New Delhi, Mumbai, Bengaluru, Lucknow, London, Beijing, Lahore, Kathmandu and New York. They use fixed city coordinates, not live geocoding or device location. Community commitments and checklists are personal browser data; the app does not invent participation totals or provide a public community database.

## Configure GenAI

Set `GEMINI_API_KEY` as a Production secret in Vercel. The existing deployment's exact alias `Gemini_Api_Key` also works. The production project currently selects `gemini-3.1-flash-lite` through `GEMINI_MODEL`; source defaults to `gemini-flash-lite-latest`. A failed model can switch only to a supported text model advertised for the same key. Calls share a 55-second total deadline, have a bounded retry budget and stop on authentication or quota errors. Keys go only to the fixed provider host in a header, never the browser, URL or prompt.

Optional OpenAI support uses `OPENAI_API_KEY` and `OPENAI_MODEL` only when Gemini is absent. It uses the Responses API with `store:false` and rejects incomplete responses. Gemini retention follows Google's provider policy; no blanket no-retention claim is made. User questions and bounded recent context go to the configured provider except for deterministic safety routes. Do not enter personal medical records.

Fixed AQI category definitions and explanations of reported stale or unavailable data use labeled source-backed reference guidance rather than asking the model to invent a classification.

## Data and impact assumptions

[Open-Meteo's air-quality API](https://open-meteo.com/en/docs/air-quality-api) uses CAMS atmospheric models. The app does not label all locations as the European ensemble. It shows U.S. AQI, which differs from India's CPCB index. Model timestamps older than three hours, materially future timestamps, malformed responses and failed requests never become a fabricated zero or a Good reading. The browser also expires an aged reading and refreshes public data when active. Check local authorities for official advisories. The provider's free endpoint is for noncommercial use under its limits; check current terms for another deployment or commercial use.

The calculator uses EPA's illustrative U.S.-average gasoline tailpipe factor of 0.4kg/mile divided by 1.609344km/mile. Avoiding 10km gives about 2.49kg CO2. Actual vehicles vary. This is a no-drive scenario, excluding replacement travel, transit emissions and lifecycle effects. CO2 savings cannot calculate a city's AQI drop or personal health benefit. Explicit valid distances in a chat question take precedence over the saved trip scenario.

## Maintainable source and build

- `lib/guidance.mjs`: stable public facade over small profile, AQI, routine, impact, safety and reference modules.
- `lib/types.d.ts`, `lib/limits.mjs`, `lib/locations.mjs`: shared contracts, bounded resource settings and the single city/timezone registry.
- `lib/time.mjs`: strict provider timestamps, local-day boundaries and forecast selection.
- `worker/index.mjs` and `worker/handlers/`: route dispatch and focused air/chat handlers.
- `worker/http.mjs`: sanitized responses, trusted-platform identity, best-effort throttling and timed byte-bounded JSON reads.
- `worker/air.mjs`: allowlisted upstream fetches and normalized data.
- `worker/providers/`: separate Gemini/OpenAI contracts, bounded model discovery and retry orchestration.
- `worker/conversation.mjs` and `worker/policy.mjs`: bounded context, server-computed scenarios and source-backed topic facts.
- `web/app.js`, `web/chat.js`, `web/views/`: application coordination, cancellable conversation state and readable HTML views.
- `web/dom.js`, `web/storage.js`, `web/content.js`: validated DOM access, optional persistence and shared UI definitions.
- `api/index.mjs`: allowlisted Vercel adapter.
- `scripts/build.mjs`: dependency-free runtime bundles and optimized browser assets. A generated declaration bridge lets strict checks validate the Vercel adapter against the original worker contract. Build output never embeds runtime credentials.

Pinned Prettier, ESLint and TypeScript check the source. `npm run check` builds, verifies formatting, enforces architecture boundaries and production function complexity at most 15, checks all browser/server/shared runtime source with strict checked JavaScript, and checks source size/known secret patterns. `npm run format` applies formatting. There are no inline lint or type-check suppressions in application source. CI installs the exact lockfile without install scripts, runs these checks and the regression suite, and rejects tracked environment secrets. Generated files and dependencies are ignored. Node 24 is pinned for development and deployment.

## Verify behavior honestly

`npm test` covers the sourced 30-case synthetic golden dataset, boundaries, malformed/stale upstream data, emergency handling, provider contracts, bounded fallback, input limits, spoofed identity headers, stalled streams, optional storage and the Vercel adapter. These are targeted behavioral and lexical assertions, not clinical certification or a guarantee of GenAI accuracy. Provider HTTP calls are mocked in automated regressions.

`scripts/browser-qa.mjs` uses a dedicated local Chromium debugging port, a running local preview and development-only axe-core. Its synthetic air fixtures make UI tests repeatable; they are not presented as real data or successful model generations. It checks keyboard focus, named dialogs, storage, calculator, forecast text, stale/outage behavior, responsive layouts and automated WCAG rules. A clean automated audit is not exhaustive accessibility conformance.

`node scripts/evaluate-live.mjs --all` calls the real public app for all 30 scenarios at a bounded cadence. It reads no credentials and stops on a failed request. The app fetches actual current modeled AQI instead of accepting dataset AQI as a trusted reading, so some scenario values are hypothetical. HTTP 200 alone is not factual accuracy: review every answer against expected/forbidden assertions and sources, distinguishing actual generations from curated safety responses. Raw run artifacts stay outside this checkout in the adjacent `Private_Validation` folder; only reviewed successful summaries are published.

The 24 November 2026 release passed **110 automated tests**, **82 browser checks** across seven viewport widths, **14 automated accessibility audits** with no violations, and **30 final production smoke checks**. All nine supported locations returned real modeled data; deployed assets matched the tested build. A Lighthouse 13.6.0 emulated-mobile lab run scored 100 for performance, accessibility, best practices and SEO. This is a single lab snapshot with a host CPU calibration warning, separate from field performance, WCAG certification or the challenge score. See the revision-specific reports above.

Checklists follow the selected city's local calendar day and reset in an open tab. Browser storage can be blocked or corrupt without breaking the app; session-only changes are labeled. Clearing preferences also clears the visible conversation and prevents a late response from restoring old context. Household changes start a fresh conversation. Shared browser/server safety rules cover urgent symptoms, combustion hazards, heat, medication and pediatric respirator fit. Fixed reference responses and generated answers are labeled separately.

## Security and submission limits

Read [SECURITY.md](SECURITY.md). The public MVP uses no accounts, database, cookies or third-party browser analytics. Household data stays in browser storage; chat context stays in tab memory. Runtime secrets stay server-side. Throttling trusts only the active host's client metadata. In-memory limits are best effort per server instance; use provider spending controls and a durable shared quota for a high-traffic paid deployment. Origin checks are not account authentication.

GitHub CodeQL and dependency audit evidence is recorded separately from Codex Security. A scanner's completion or zero findings does not establish absence of vulnerabilities. Challenge evaluation scores are determined by the platform and are not guaranteed by these checks.
