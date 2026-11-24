# Security

Breathe keeps provider credentials in server environment variables and uses fixed upstream hosts. Browser content is rendered as text or escaped markup. Same-origin JSON chat requests have bounded profiles, history, question length, streamed body size and read deadlines. Platform-owned client metadata supplies best-effort per-instance throttling; caller identity headers alone are not trusted.

The browser uses only same-origin JavaScript. Response headers include a restrictive Content Security Policy, nosniff, referrer and permissions policies. No third-party runtime packages, analytics, accounts, database or file uploads are used. Household preferences are optional local browser storage. Chat remains in tab memory; generative requests send limited context to the configured provider. Clearing preferences removes the visible transcript and in-memory history and aborts/ignores late replies. Changing household settings starts a fresh conversation. Provider retention policies apply. Do not enter medical records or secrets.

The server fetches allowlisted modeled air data itself and ignores client-supplied AQI and carbon totals. Stale, malformed and unavailable readings never become a fabricated favorable value. Safety-critical routes use labeled curated guidance before provider calls. Generated output is untrusted; prompt injection and factual mistakes cannot be proven eliminated.

## Verification scope

The 24 November 2026 local release check passes 110 automated tests covering sourced synthetic scenarios, provider contracts, request limits, spoofed headers, stalled streams, stale data, secret non-disclosure, storage and the hosting adapter. The expanded tests include 102 JSON-shaped profile combinations, 1,000 seeded arithmetic scenarios, malformed timestamps and provider output, shared critical-intent routing, and 75 simultaneous local requests. These inputs are part of the 110 named tests. Mock provider tests verify behavior, not live model quality. The pinned development dependency audit reports no known advisories; this is not a source-code security guarantee.

GitHub CodeQL evidence is recorded in [reports/security-scan.json](reports/security-scan.json), with the exact analyzed commit and workflow link. A scan applies to that revision; local changes require a fresh CI scan. Four intentional diagnostic data flows in nondeployed evaluator scripts were reviewed as test use; zero unresolved alerts is not a claim of zero raw scanner results. CodeQL and dependency audits are distinct from Codex Security. No completed Codex Security assessment is claimed. Raw diagnostic runs are kept outside this checkout.

## Operational limits

In-memory rate limits are per instance, not a durable shared quota. Use platform rate controls and provider spending limits for high-traffic paid deployments. Origin checks are not account authentication. Hosting authentication, transport and edge policy remain platform responsibilities. Browser storage is device-scoped, not encrypted medical storage. Passing tests or scans does not establish absence of vulnerabilities.

Report reproducible security concerns privately to the repository owner using synthetic data. Never include credentials or personal health information in public issues.
