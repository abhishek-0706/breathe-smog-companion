import { heading } from "./common.js";
import { avoidedCarbon } from "../../lib/guidance.mjs";
/** @param {import("../../lib/types.d.ts").ViewState} state @returns {string} */
export function renderImpact(state) {
  const { profile, completed, pledges } = state;
  return (
    heading(
      "See the difference in your choices.",
      "Understand the direction of your impact, with the assumptions in plain sight.",
      profile.city,
    ) +
    /* HTML */ `<div class="detail-grid">
        <div class="card wide-card">
          <span class="eyebrow">YOUR DAILY PROGRESS</span>
          <div class="metric">
            ${completed.length}<span style="font:16px 'Segoe UI'"> / 3</span>
          </div>
          <p>Thoughtful actions completed today.</p>
          <div
            class="progress"
            role="progressbar"
            aria-label="Daily actions completed"
            aria-valuemin="0"
            aria-valuemax="3"
            aria-valuenow="${completed.length}"
          >
            <span style="width:${(completed.length / 3) * 100}%"></span>
          </div>
        </div>
        <div class="card wide-card">
          <span class="eyebrow">COMMUNITY STARTS WITH YOU</span>
          <div class="metric">${pledges.length}</div>
          <p>Personal clean-air commitments.</p>
        </div>
      </div>
      <section class="card wide-card">
        <span class="eyebrow">EXPLORE A NO-DRIVE DAY</span>
        <h2>What if you skipped one solo car trip?</h2>
        <label for="km-range"
          >Daily gasoline driving avoided:
          <strong id="km-label">${profile.distance}</strong> km</label
        ><input
          class="slider"
          id="km-range"
          type="range"
          min="0"
          max="100"
          value="${profile.distance}"
        />
        <div class="metric">
          <span id="carbon-number" role="status" aria-live="polite"
            >${avoidedCarbon(profile.distance).toFixed(1)}</span
          >
          <span style="font:18px 'Segoe UI'">kg CO₂</span>
        </div>
        <p>Estimated tailpipe emissions avoided on a no-drive day.</p>
        <p class="data-note">
          Calculation: distance × 0.4 kg per mile ÷ 1.609344 km per mile. EPA
          U.S.-average gasoline vehicle proxy, not an India-specific fleet
          estimate. Actual emissions vary. Excludes lifecycle emissions,
          replacement travel and public-transit emissions. This is a scenario,
          not a measured saving.
        </p>
        <p class="data-note">
          CO₂ is a climate pollutant. This estimate does not predict PM₂.₅
          exposure, health improvement or a change in local AQI.
        </p>
        <button class="mini-link" data-info="carbon">
          Read the calculation & source
        </button>
      </section>`
  );
}
