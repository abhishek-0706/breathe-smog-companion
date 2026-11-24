/** UI navigation and commitment labels share one definition. */
export const NAVIGATION = Object.freeze([
  ["overview", "dashboard", "Overview"],
  ["routines", "leaf", "My routines"],
  ["indoor", "home", "Indoor air"],
  ["community", "community", "Community"],
  ["impact", "chart", "My impact"],
]);
export const PLEDGES = Object.freeze([
  [
    "idling",
    "Keep school gates idle-free",
    "Switch off engines while waiting, where safe.",
  ],
  [
    "burning",
    "Keep leaves and waste out of the fire",
    "Use local collection or appropriate composting.",
  ],
  [
    "neighbour",
    "Check in on a neighbour",
    "Share verified alerts and offer help with essential errands.",
  ],
]);
export const PLEDGE_IDS = Object.freeze(PLEDGES.map(([id]) => id));
