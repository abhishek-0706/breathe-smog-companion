import { heading } from "./common.js";
import { icon } from "./art.js";
/** @param {import("../../lib/types.d.ts").ViewState} state @returns {string} */
export function renderIndoor(state) {
  const { profile } = state;
  return (
    heading(
      "Make home your breathing space.",
      "Practical ways to reduce indoor particle sources, with or without an air cleaner.",
      profile.city,
    ) +
    /* HTML */ `<div class="card wide-card">
        <span class="eyebrow">START WITH WHAT YOU HAVE</span>
        <h2>
          ${profile.purifier ? "Make your air cleaner work well." : "Cleaner air can begin with a few free changes."}
        </h2>
        <p>
          ${profile.purifier ? "Use a correctly sized mechanical HEPA cleaner continuously in your main room. Keep airflow clear, maintain filters, and avoid ozone-producing devices." : "Avoid incense, candles, smoking and dry sweeping indoors. Damp-dust and mop instead. Plants and bowls of water do not replace filtration."}
        </p>
        <span class="status-pill good"
          >${profile.budget === "No-cost first" ? "Your preference: no-cost first" : "Your preference: flexible budget"}</span
        >
      </div>
      <div class="detail-grid">
        <article class="card wide-card">
          <div class="routine-icon">${icon("home")}</div>
          <h3>Windows need context.</h3>
          <p>
            When outdoor particle pollution is high, close windows if safe. Air
            out the home when outdoor conditions improve, rather than at a fixed
            hour.
          </p>
          <p class="data-note">
            Never block required ventilation or allow unsafe heat. Particle
            filters don’t remove CO₂ or all gases.
          </p>
        </article>
        <article class="card wide-card">
          <div class="routine-icon">${icon("leaf")}</div>
          <h3>Keep the kitchen lighter.</h3>
          <p>
            Steam or boil instead of frying. Use an exhaust fan that vents
            outside. Never use charcoal grills or generators indoors.
          </p>
          <p class="data-note">
            Less indoor smoke means fewer new particles. A good routine cannot
            guarantee a pollutant percentage.
          </p>
        </article>
      </div>
      <article class="card wide-card">
        <h3>Know when to get help.</h3>
        <p>
          If anyone has severe breathing difficulty, chest pain, blue lips or
          fainting, seek local emergency medical help. Follow clinician-provided
          care plans; this app does not recommend medication changes.
        </p>
        <button class="mini-link" data-info="sources">
          Read the guidance behind these steps
        </button>
      </article>`
  );
}
