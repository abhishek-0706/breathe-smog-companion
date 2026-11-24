import { PLEDGES } from "../content.js";
import { heading } from "./common.js";
import { heroArt } from "./art.js";
/** @param {import("../../lib/types.d.ts").ViewState} state @returns {string} */
export function renderCommunity(state) {
  const { profile, pledges } = state;
  return (
    heading(
      "Better air is a shared effort.",
      "Start with your home. Bring a little care to your neighbourhood.",
      profile.city,
    ) +
    /* HTML */ `<section class="hero">
        <div class="hero-copy">
          <span class="eyebrow">A NEIGHBOURHOOD OF SMALL ACTIONS</span>
          <h2>One street.<br />Many little changes.</h2>
          <p>
            Choose a pledge and download a conversation starter to share with
            your community.
          </p>
          <button class="primary" id="download-pledge">
            Download a neighbourhood note
          </button>
        </div>
        ${heroArt()}
      </section>
      <section class="card wide-card">
        <h2>Our cleaner-air commitments</h2>
        <p>These are your personal pledges, saved on this browser.</p>
        ${PLEDGES.map(
          ([id, title, text]) =>
            /* HTML */ `<label class="pledge"
              ><input
                type="checkbox"
                data-pledge="${id}"
                ${pledges.includes(id) ? "checked" : ""}
              /><span
                >${title}<small class="data-note" style="display:block"
                  >${text}</small
                ></span
              ></label
            >`,
        ).join("")}
      </section>
      <div class="card wide-card">
        <h3>Share useful information, gently.</h3>
        <p>
          Use current local advisories. Never share a neighbour’s health details
          without consent. Community actions can reduce emission sources; a
          numerical neighbourhood AQI improvement cannot be promised.
        </p>
      </div>`
  );
}
