import { renderOverview } from "./overview.js";
import { renderRoutines } from "./routines.js";
import { renderIndoor } from "./indoor.js";
import { renderCommunity } from "./community.js";
import { renderImpact } from "./impact.js";
/** @type {Record<string,(state:import("../../lib/types.d.ts").ViewState)=>string>} */
const VIEWS = {
  overview: renderOverview,
  routines: renderRoutines,
  indoor: renderIndoor,
  community: renderCommunity,
  impact: renderImpact,
};
/** @param {string} name @param {import("../../lib/types.d.ts").ViewState} state @returns {string} */
export function renderView(name, state) {
  const render = VIEWS[name];
  if (!render) {
    throw new Error("Unknown view: " + name);
  }
  return render(state);
}
