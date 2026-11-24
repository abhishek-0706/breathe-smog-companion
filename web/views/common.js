/** @param {number | null} aqi @returns {string} */
function airAdvice(aqi) {
  const available = typeof aqi === "number" && Number.isFinite(aqi);
  return available
    ? aqi > 150
      ? "A good day to take extra care. Choose cleaner indoor air and limit outdoor exertion."
      : aqi > 100
        ? "Sensitive household members should reduce prolonged or heavy outdoor activity."
        : aqi > 50
          ? "Most people can follow their plans. Take care if you are unusually sensitive."
          : "A little fresh-air time may fit today. Check local advisories before heading out."
    : "We couldn’t confirm current conditions. Check your local air-quality authority before outdoor plans.";
}
import { category, isCurrentAir, routines } from "../../lib/guidance.mjs";
import { CITY_TIMEZONES, forecastPoints } from "../../lib/time.mjs";
import { icon } from "./art.js";
import { escapeHTML } from "./escape.js";
/** @param {string} city @returns {string} */
export function date(city) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "long",
    weekday: "short",
    timeZone: CITY_TIMEZONES[city],
  }).format(new Date());
}
/** @param {string} title @param {string} sub @param {string} city @returns {string} */
export function heading(title, sub, city) {
  return /* HTML */ `<div class="greeting-line">
      <span class="eyebrow">A LITTLE MORE MINDFUL, EVERY DAY</span
      ><span class="date">${date(city)}</span>
    </div>
    <h1>${title}</h1>
    <p class="page-subtitle">${sub}</p>`;
}
/** @param {import("../../lib/types.d.ts").AirSnapshot | null} air @returns {number | null} */
export function currentAqi(air) {
  return isCurrentAir(air) ? air.current.us_aqi : null;
}
/** @param {import("../../lib/types.d.ts").ViewState} state @returns {string} */
export function airCard({ profile, air, airError, busy }) {
  const aqi = currentAqi(air),
    c = category(aqi);
  const available = typeof aqi === "number" && Number.isFinite(aqi);
  const label = busy
    ? "Fetching live forecast"
    : available
      ? "Latest modeled data"
      : air && !isCurrentAir(air)
        ? "Stale data · not current"
        : "Data unavailable";
  return /* HTML */ `<section
    class="card air-card"
    aria-label="Outdoor air quality"
  >
    <div class="card-top">
      <h2>The air around you</h2>
      <span class="live-tag">${label}</span>
    </div>
    ${
      busy && !air
        ? '<p class="loading">Connecting to Open-Meteo for your city…</p>'
        : /* HTML */ `<div class="air-middle">
              <div>
                <span class="aqi-number"
                  >${available ? Math.round(aqi) : "—"}</span
                ><span class="aqi-caption">U.S. AQI · MODELED</span>
              </div>
              <div class="aqi-description">
                <span class="status-pill ${c.tone}"
                  >${escapeHTML(c.label)}</span
                >
                <p>${airAdvice(aqi)}</p>
              </div>
            </div>
            ${
              available
                ? /* HTML */ `<div class="air-scale">
                      <span
                        class="air-tick"
                        style="left:${Math.min(99, aqi / 5)}%"
                      ></span>
                    </div>
                    <div class="scale-labels">
                      <span>Good</span><span>Moderate</span
                      ><span>Unhealthy</span><span>Hazardous</span>
                    </div>`
                : ""
            }${airError ? /* HTML */ `<div class="error-panel">${escapeHTML(airError)}</div>` : ""}`
    }
    <div class="air-foot">
      <span
        >${escapeHTML(profile.city)}${air ? " · " + escapeHTML(air.place) : ""}<br />${air ? "Model time: " + escapeHTML(air.current.time.replace("T", " ")) + " " + escapeHTML(air.timezone) : "No sample readings are shown."}</span
      ><button id="refresh-air" class="refresh" ${busy ? "disabled" : ""}>
        ↻ Refresh
      </button>
    </div>
    <div class="science data-note">
      Open-Meteo / CAMS · Outdoor model estimate, not a sensor reading.<br />U.S.
      AQI differs from India’s CPCB AQI.
      <button class="text-button" data-info="data">About this data</button>
    </div>
  </section>`;
}
/** @param {import("../../lib/types.d.ts").ViewState} state @returns {string} */
export function routineCards({ profile, air, completed }) {
  return /* HTML */ `<div class="routines">
    ${routines(profile, currentAqi(air))
      .map(
        (r) =>
          /* HTML */ `<article class="card routine-card">
            <div class="routine-icon">${icon(r.icon)}</div>
            <div class="routine-time">${r.time}</div>
            <h3>${r.title}</h3>
            <p>${r.body}</p>
            <span class="routine-tag">${r.tag}</span>
            <div class="routine-bottom">
              <button class="impact-explain" data-impact="${r.id}">
                Why it makes a difference</button
              ><button
                class="done"
                data-done="${r.id}"
                aria-label="${completed.includes(r.id) ? "Undo" : "Mark complete"}: ${r.title}"
                aria-pressed="${completed.includes(r.id)}"
              >
                ${completed.includes(r.id) ? "✓" : "+"}
              </button>
            </div>
          </article>`,
      )
      .join("")}
  </div>`;
}
/** @param {import("../../lib/types.d.ts").ViewState} state @returns {string} */
export function forecast({ air }) {
  if (!isCurrentAir(air)) {
    return "";
  }
  const points = forecastPoints(air);
  if (!points.length) {
    return "";
  }
  const max = Math.max(...points.map((p) => p.value), 1);
  return /* HTML */ `<section class="card wide-card">
    <div class="section-line">
      <h2>The next 24 hours</h2>
      <span class="data-note">Forecast · U.S. AQI</span>
    </div>
    <div class="forecast" aria-hidden="true">
      ${points
        .map(
          (p) =>
            /* HTML */ `<div class="forecast-col">
              <span class="forecast-value">${Math.round(p.value)}</span>
              <div class="bar" style="height:${(p.value / max) * 95}px"></div>
              <span>${p.time.slice(11, 16)}</span>
            </div>`,
        )
        .join("")}
    </div>
    <ul class="sr-only" aria-label="Forecast values">
      ${points.map((p) => "<li>" + p.time.slice(11, 16) + ": modeled U.S. AQI " + Math.round(p.value) + "</li>").join("")}
    </ul>
    <p class="data-note">
      Local time in ${escapeHTML(air.timezone)}. A lower forecast is not a
      guarantee of safe conditions; check local alerts.
    </p>
  </section>`;
}
