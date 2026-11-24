import { heading, routineCards, forecast } from "./common.js";
/** @param {import("../../lib/types.d.ts").ViewState} state @returns {string} */
export function renderRoutines(state) {
  const { profile, completed } = state;
  return (
    heading(
      "A little rhythm. A lighter footprint.",
      "Your plan adapts to your household and the latest available outdoor air estimate.",
      profile.city,
    ) +
    /* HTML */ `<div class="card wide-card">
      <span class="eyebrow">YOUR DAILY CHECK-IN</span>
      <h2>${completed.length} of 3 small steps complete</h2>
      <p>Take the actions that work for you. Your checklist resets each day.</p>
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
    </div>` +
    routineCards(state) +
    forecast(state) +
    /* HTML */ `<button class="secondary" id="personalize">
      Adjust my household preferences
    </button>`
  );
}
