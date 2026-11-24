import { heading, airCard, routineCards } from "./common.js";
import { icon, heroArt } from "./art.js";
/** @param {import("../../lib/types.d.ts").ViewState} state @returns {string} */
export function renderOverview(state) {
  const { profile, completed } = state;
  return (
    heading(
      "A better day starts with a breath.",
      "A few thoughtful choices. A healthier home. A little less impact on the air we share.",
      profile.city,
    ) +
    /* HTML */ `<section class="hero">
      <div class="hero-copy">
        <span class="eyebrow">YOUR AIR. YOUR EVERYDAY.</span>
        <h2>Small steps today.<br />A clearer tomorrow.</h2>
        <p>
          Your clean-air plan, shaped around your city, your household, and the
          way you live.
        </p>
        <button class="primary" id="personalize">
          ${icon("leaf")} Make it personal
        </button>
      </div>
      ${heroArt()}
    </section>` +
    airCard(state) +
    /* HTML */ `<div class="section-line">
      <h2>Your little steps for today</h2>
      <button class="mini-link" data-view-go="routines">View my routine</button>
    </div>` +
    routineCards(state) +
    /* HTML */ `<section class="impact-strip">
      <div class="routine-icon">${icon("leaf")}</div>
      <div>
        <h3>Good for you. Better together.</h3>
        <p>
          ${completed.length} of 3 daily actions complete. Every considered
          choice counts.
        </p>
      </div>
      <button class="mini-link" data-view-go="impact">See your impact</button>
    </section>`
  );
}
