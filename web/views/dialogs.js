import { escapeHTML } from "./escape.js";
const sources = /* HTML */ `<h2>Grounded in better information.</h2>
  <p>
    Our guidance draws on public-health and environmental sources. It supports
    everyday decisions and does not replace local alerts or medical care.
  </p>
  <ul class="sources-list">
    <li>
      <a
        href="https://www.epa.gov/wildfires/indoor-air-filtration"
        target="_blank"
        rel="noopener noreferrer"
        >EPA: indoor air filtration</a
      >
    </li>
    <li>
      <a
        href="https://www.airnow.gov/wildfires/when-smoke-is-in-the-air/"
        target="_blank"
        rel="noopener noreferrer"
        >AirNow: reducing particle exposure</a
      >
    </li>
    <li>
      <a
        href="https://open-meteo.com/en/docs/air-quality-api"
        target="_blank"
        rel="noopener noreferrer"
        >Open-Meteo / CAMS air-quality documentation</a
      >
    </li>
    <li>
      <a
        href="https://www.epa.gov/greenvehicles/greenhouse-gas-emissions-typical-passenger-vehicle"
        target="_blank"
        rel="noopener noreferrer"
        >EPA: gasoline vehicle CO₂ assumptions</a
      >
    </li>
    <li>
      <a
        href="https://airquality.cpcb.gov.in/AQI_India/"
        target="_blank"
        rel="noopener noreferrer"
        >CPCB: India’s official AQI portal</a
      >
    </li>
  </ul>`;
/** @param {string} type @param {import("../../lib/types.d.ts").InfoState} state @returns {string} */
export function renderInfo(type, { air, aiEnabled }) {
  /** @type {Record<string,()=>string>} */
  const content = {
    sources: () => sources,
    data: () =>
      /* HTML */ `<span class="eyebrow">TRANSPARENCY FIRST</span>
        <h2>A model of the air around you.</h2>
        <p>
          Live requests come from Open-Meteo using CAMS atmospheric models. City
          locations use fixed coordinates. Values describe modeled outdoor
          conditions near city coordinates; they are not a local monitor or
          indoor sensor reading.
        </p>
        <p>
          We use U.S. AQI categories, which differ from India’s CPCB scale.
          Check local authorities for official decisions. Readings older than 3
          hours are marked stale and excluded from current guidance.
        </p>
        <p>
          Last fetched:
          ${air ? escapeHTML(new Date(air.fetchedAt).toLocaleString()) : "not available"}.
        </p>
        <p class="data-note">
          Open-Meteo’s free endpoint is for noncommercial use under its usage
          limits. Production commercial use needs the appropriate provider plan.
          Data attribution: Open-Meteo, CAMS atmospheric models.
        </p>`,
    privacy: () =>
      /* HTML */ `<h2>Your household, your choice.</h2>
        <p>
          Preferences and checklists stay in this browser’s local storage. Chat
          stays in page memory and clears when you reload. Never enter names,
          addresses or sensitive medical records.
        </p>
        <p>
          In guided mode, questions are answered locally using curated rules. If
          generative AI is enabled, your question, recent conversation, selected
          household preferences and current modeled AQI are sent to this site
          server and the configured AI provider (Google Gemini or OpenAI). The
          app does not persist conversations on its own server. Provider
          data-use and retention policies apply; do not enter sensitive
          information.
        </p>
        <button class="secondary" id="clear-local">
          Clear my saved preferences
        </button>`,
    carbon: () =>
      /* HTML */ `<h2>A useful estimate, clearly bounded.</h2>
        <p>
          EPA estimates about 400 g CO₂ per mile for an average U.S. gasoline
          car, equal to approximately 0.249 kg per kilometre. Multiply
          kilometres of driving avoided by that factor.
        </p>
        <p>
          This is an illustrative no-drive scenario. It excludes lifecycle
          emissions and replacement travel, and does not predict local air
          quality. It is not a measured personal saving.
        </p>
        ${sources}`,
    about: () =>
      /* HTML */ `<h2>A companion for the air we share.</h2>
        <p>
          Breathe helps households make practical choices during smog and urban
          pollution. Customize your household, check modeled outdoor air
          quality, and build a manageable daily routine.
        </p>
        <p>
          The companion is
          ${aiEnabled ? "connected to generative AI." : "in guided mode. Generative AI requires a configured server-side AI connection; no AI-generated response is implied."}
        </p>
        ${sources}`,
  };
  return (content[type] || content.about)();
}
