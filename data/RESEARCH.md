# Research and golden evaluation data

Researched 19 November 2026 using primary sources. The JSON is a **synthetic, evidence-grounded evaluation set**, not observational data, clinical validation or training material. Live application readings must come from the data provider separately.

## Live data integration

- [Open-Meteo air-quality API](https://open-meteo.com/en/docs/air-quality-api): CAMS atmospheric models provide regional estimates and forecasts. They are not an on-site monitor. Display the model timestamp, retrieval status, location and index scale. Never infer a measured indoor value from outdoor estimates.
- [Open-Meteo geocoding](https://open-meteo.com/en/docs/geocoding-api): search results include coordinates and administrative areas. Let people distinguish cities with the same name. Location data attribution: GeoNames.
- Air-quality attribution must include **Open-Meteo and CAMS ENSEMBLE**. Review the provider's linked attribution page for the selected domain. Model grid resolution means street-level traffic and building conditions may differ substantially.
- [Open-Meteo terms](https://open-meteo.com/en/terms): the free endpoint is for noncommercial use and has call limits. A commercial launch requires the appropriate subscription. The provider can change terms; verify before release.

Example request, Delhi (coordinates are illustrative; values are fetched at request time):

```text
https://air-quality-api.open-meteo.com/v1/air-quality?latitude=28.6139&longitude=77.209&current=us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone&hourly=us_aqi,pm2_5&forecast_days=2&timezone=auto
```

Geocoding example:

```text
https://geocoding-api.open-meteo.com/v1/search?name=Delhi&count=5&language=en&format=json
```

The research browser could read the provider documentation but could not retrieve those JSON endpoints. Runtime integration must be verified separately. Missing, null, malformed or stale data must remain explicitly unavailable or stale; never silently replace it with zero or a demo reading.

## Index interpretation

[AirNow U.S. AQI categories](https://www.airnow.gov/aqi/aqi-basics/): 0–50 Good; 51–100 Moderate; 101–150 Unhealthy for Sensitive Groups; 151–200 Unhealthy; 201–300 Very Unhealthy; 301+ Hazardous. Use these categories only for U.S. AQI. Numeric values beyond 500 remain extreme, not an invalid value to be discarded automatically.

[India's CPCB dashboard](https://app.cpcbccr.com/AQIIndia) uses another scale. A U.S. AQI value returned for Delhi must still be labeled **U.S. AQI (modeled)**. Do not mix CPCB names, European bands, PM concentration units and U.S. index values. Open-Meteo's current documented U.S. index implementation uses pollutant-specific averaging; use the supplied index instead of deriving it from a single instantaneous PM reading.

## Health and impact sources

- [AirNow particle-pollution activity guide](https://www.airnow.gov/publications/air-quality-index/air-quality-guide-for-particle-pollution/): adjust exertion to pollution and vulnerability. Do not promote cycling as an environmental benefit during hazardous exposure.
- [EPA cleaner-air room](https://www.epa.gov/wildfires/how-create-cleaner-air-room-home): suitable room, mechanical filtration and source reduction. Keep emergency exits usable.
- [EPA smoke and indoor air](https://www.epa.gov/emergencies-iaq/wildfires-and-indoor-air-quality-iaq): account for smoke infiltration, cooking, dust and heat. Ventilation timing must follow conditions, not a fixed hour.
- [EPA ozone generators](https://www.epa.gov/indoor-air-quality-iaq/ozone-generators-are-sold-air-cleaners) and [CARB air-cleaning devices](https://ww2.arb.ca.gov/resources/fact-sheets/air-cleaning-devices-home): avoid harmful ozone; plants are not a substitute for effective source control and filtration.
- [CDC children and smoke](https://www.cdc.gov/wildfires/risk-factors/wildfire-smoke-and-children.html) and [NIOSH respirator guidance](https://www.cdc.gov/niosh/bulletin/2025/wildfire-smoke.html): fit and individual limitations matter. Use extra care for children and people with heart/lung conditions. Severe breathing difficulty needs urgent medical care. Never recommend medication changes.
- [EPA carbon monoxide](https://www.epa.gov/indoor-air-quality-iaq/carbon-monoxides-impact-indoor-air-quality) and [FEMA generator safety](https://www.fema.gov/fact-sheet/use-generators-safely-home): indoor combustion can cause lethal exposure that particulate filtration does not solve.
- [EPA typical passenger-vehicle emissions](https://www.epa.gov/greenvehicles/greenhouse-gas-emissions-typical-passenger-vehicle): illustrative gasoline tailpipe CO2 basis of about 400 g/mile, or 0.24855 kg/km. It is not an India fleet factor, transit factor, lifecycle analysis or measured health benefit. Avoided car kilometres must actually be replaced; do not label an unspecified transit trip zero-emission.

Smoke guidance is used here for particle-exposure principles. Winter urban smog may also contain gases and other pollutants; a particulate mask or filter does not solve every exposure.

## Evaluating the assistant

`golden-dataset.json` contains 30 diverse cases with inputs, expected semantic assertions, forbidden advice, criticality and source URLs. Include AQI boundary tests, vulnerable households, unavailable data, prompt injection, affordability and impact-claim checks.

1. Freeze the model, system prompt and application version. Run each question with its structured context and the same data conditions. Do not fetch a different AQI for deterministic cases.
2. Save answer text, mode (generative/guided), model name, latency and sources in a separate result artifact; exclude user information and credentials. Use a mock provider for repeatable integration tests and a separately identified live smoke test for network verification.
3. Review every expected assertion semantically. Score assertion coverage separately from whole-case pass rate. Any forbidden recommendation fails a case. A missing answer is not a pass.
4. Require all critical cases to pass before release. Use an independent human review for ambiguous answers. A language-model judge can assist, but is not clinical validation; keyword tests cannot establish factual safety.
5. Re-run after prompt, model, source, safety-rule or data-parser changes. Report whether evaluation used live GenAI, a mocked response, or deterministic guided mode. Do not present dataset schema validation as assistant accuracy.

This small research-authored set is a baseline regression suite. It does not estimate population-level performance, contains no clinician-reviewed outcomes, and should grow with reviewed failure examples.

### Automated coverage limits

`tests/golden.test.mjs` links every dataset case ID to independently written, scenario-specific regular-expression assertions (or direct index-boundary assertions). It exercises `guidedReply` and `category`, not an OpenAI response. The checks cover a **subset** of the expected facts. Except for explicit affirmative unsafe-claim patterns, forbidden-advice lists still require semantic review; a response can match a required phrase and remain incomplete or unsafe elsewhere. No automatic whole-dataset semantic pass rate is claimed.

Run `node --test --test-isolation=none tests/golden.test.mjs` in environments that prohibit test-runner subprocess creation. The initial run on 19 November 2026 yielded 12 passing tests and 22 failing tests, identifying real routing and content gaps before remediation. Re-run after fixes; this historical result is not the final application result.
