# Security review

Review date: 23 November 2026. Scope: source, built Worker, deterministic guided responses, mocked OpenAI contract, live air-data integration and local UI behavior.

## Implemented controls

- No third-party runtime dependencies; no remotely loaded JavaScript.
- Strict same-origin chat POST, JSON-only content type, 16 KB streaming request limit, 1,500-character question limit, constrained profiles and bounded history.
- Fixed upstream hosts and city-coordinate allowlist; user input cannot select an arbitrary fetch URL. Protects against a generic SSRF proxy.
- OpenAI key lives only in server environment; no credentials in client code, source, URLs, storage or error messages.
- Model responses and chat questions render through `textContent`, not HTML. All dynamic provider strings in templates are escaped. Static SVG markup is developer-owned.
- CSP restricts scripts and connections to same origin; no eval, plugins, inline script or arbitrary form targets. Inline styles are permitted for charts. `nosniff`, referrer and permission policies are set.
- Invalid, stale and unavailable data never becomes a fabricated favorable reading. Provider responses validate numeric values and timestamps.
- Safety-critical emergency, medication, generator and heat intents use deterministic advice before model invocation. Model policy adds evidence and uncertainty constraints.
- Server fetches air data itself for generated answers; a browser-supplied AQI is ignored.
- No server-side household database, application request-body logs, analytics or file uploads. AI calls use `store:false`; provider policies still apply.

## Verification

52 automated tests pass, including CSRF, SSRF allowlisting, bounded requests, secret non-disclosure, provider errors, malicious profile fields, role filtering, no fake data, stale timestamps, mathematical units and rate-limit behavior. Twelve local browser checks pass at desktop and 390px mobile widths. Real Open-Meteo requests returned HTTP 200; provider results remain estimates rather than monitor measurements.

The research agent's independent golden tests initially failed important cases. Guidance was corrected to address emergency wording, CO poisoning hazards, heat, respirator dizziness, missing data and unsupported causal claims. All selected automated assertions now pass.

**This is not a Codex Security scan report.** The Codex Security plugin has been suggested but is not connected and its scanner has not run. Do not describe these tests as a completed platform security scan or proof of no vulnerabilities.

## GitHub CodeQL static analysis

[Extended CodeQL scan](https://github.com/abhishek-0706/breathe-smog-companion/actions/runs/45200739495) completed successfully on 23 November 2026. CodeQL 2.27.5 analyzed JavaScript/TypeScript with 103 rules, reporting zero results; the open-alert query also returned zero. The scanned source commit is recorded in [reports/security-scan.json](reports/security-scan.json). Documentation and CI additions after that commit trigger subsequent scans and are reported separately.

This is an actual GitHub CodeQL scan, not a Codex Security plugin scan. Static analysis has limits and does not establish that no vulnerabilities exist. The submission-check workflow also builds the artifacts, runs all tests and checks source size and tracked-secret-file exclusions with read-only repository permissions and pinned official actions.

## Remaining limitations

- In-memory throttling is best effort per Worker isolate; it is not a global budget or durable distributed rate limiter. Before enabling a paid model on a public high-traffic site, add a platform-enforced distributed quota and set provider spending controls.
- Prompt injection is constrained by server-owned instructions and deterministic hazard routes, but cannot be proven eliminated. Generated answers have not been semantically evaluated against the golden set with real credentials.
- API fixtures test integration contracts, not provider reliability or model quality. Clinical and accessibility certification are out of scope; keyboard/dialog semantics and responsive behavior have been checked.
- Hosted authentication, transport security and edge access policy are platform responsibilities. UI browser storage is device-scoped, not encrypted personal health storage.
- Operational dependency: provider availability, current terms and correct runtime secret configuration. No security guarantees are implied by passing tests.

Do not put real vulnerability details or secrets in public issues. Reproduce issues locally using synthetic data and share privately with the project owner.
