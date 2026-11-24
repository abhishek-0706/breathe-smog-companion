const source =
  " Source: https://www.epa.gov/emergencies-iaq/wildfires-and-indoor-air-quality-iaq";
/** Ordered rules preserve urgent-hazard precedence in browser and server. */
/** @type {readonly import("./types.d.ts").SafetyRule[]} */
const SAFETY_RULES = [
  {
    id: "emergency",
    matches: (q) =>
      /chest pain|cannot breathe|can['\u2019]?t breathe|struggl.*breath|severe.*breath|blue lips|(?:lips|face).{0,12}(?:blue|gr[ae]y)|faint|passed out|unusually sleepy|\bgasping\b|\bunresponsive\b/.test(
        q,
      ),
    answer:
      "Severe breathing difficulty, chest pain, blue lips, unusual sleepiness or fainting may be an emergency. Seek local emergency medical help now. Move to cleaner air if you can do so safely. This assistant cannot diagnose or replace medical care.",
  },
  {
    id: "combustion",
    matches: (q) =>
      (/generator/.test(q) &&
        (!/ozone/.test(q) ||
          /petrol|gasoline|diesel|fuel|engine|carbon monoxide/.test(q))) ||
      /charcoal|barbecue|\bbbq\b/.test(q),
    answer:
      "Never use a generator indoors, in a garage, or in any enclosed space, even with doors open. Never use charcoal grills indoors. They can cause fatal carbon monoxide (CO) poisoning. Run generators outdoors, well away from doors, windows and vents, following manufacturer and local safety guidance. A HEPA filter does not remove carbon monoxide. Use working CO alarms; if poisoning is suspected, leave safely and seek emergency help. Use only safe heating options according to manufacturer guidance." +
      source,
  },
  {
    id: "respirator-distress",
    matches: (q) =>
      /(?:respirator|mask|n95|ffp2).{0,60}(?:dizz|difficult|hard to breathe)|(?:dizz|difficult|hard to breathe).{0,60}(?:respirator|mask|n95|ffp2)/.test(
        q,
      ),
    answer:
      "Move to cleaner air and remove the respirator. Seek medical help if symptoms persist, worsen or are severe; chest pain or severe breathing difficulty needs emergency help now. Consult a clinician about respirator suitability, especially with heart or lung disease. We cannot diagnose the cause remotely." +
      source,
  },
  {
    id: "pediatric-respirator",
    matches: (q) =>
      /\b(?:child(?:ren)?|toddler|bab(?:y|ies)|infant|kids?)\b|\b(?:[0-9]|1[0-7])[ -]?year[ -]?old\b/.test(
        q,
      ) && /mask|n95|ffp2|respirator/.test(q),
    answer:
      "Do not assume an adult respirator protects a young child: adult sizes may not fit or seal properly. Prioritize reduced exposure and cleaner indoor air during heavy smog; an adult N95 does not make hazardous outdoor play safe. Consult your child's pediatric clinician about fit and suitability and follow manufacturer instructions. A suitable particulate respirator reduces particles, not all gases. Source: https://www.cdc.gov/wildfires/risk-factors/wildfire-smoke-and-children.html",
  },
  {
    id: "dizziness",
    matches: (q) => /dizz/.test(q),
    answer:
      "Stop exertion and move to cleaner air if safe. Seek medical advice if dizziness persists, worsens or is severe. Chest pain, severe breathing difficulty or fainting needs emergency medical help now. This assistant cannot diagnose the cause." +
      source,
  },
  {
    id: "medication",
    matches: (q) =>
      /\b(?:medication|medicine|inhaler|dosage|doses?|asthma attack)\b/.test(q),
    answer:
      "Follow your clinician-provided asthma or treatment action plan. Do not change medication doses based on this app. If symptoms are severe or worsening, seek urgent medical help. Reduce exertion and move to cleaner indoor air if safe." +
      source,
  },
  {
    id: "heat",
    matches: (q) =>
      /overheat|very hot|too hot|dangerous(?:ly)?.{0,12}(?:hot|heat)|hot inside|heat ?stroke|heat ?wave|unsafe (?:indoor )?heat/.test(
        q,
      ),
    answer:
      "Do not stay in dangerous indoor heat just to keep windows closed. Move to a cooler cleaner-air space or a safer location if possible. Use safe cooling and consult local heat and pollution advisories. If you must open windows to cool the home, balance heat risk with outdoor pollution; filter air where feasible. Never block required combustion ventilation." +
      source,
  },
  {
    id: "ozone",
    matches: (q) =>
      /ozone.{0,30}(?:generator|cleaner)|(?:generator|cleaner).{0,30}ozone|ioniz/.test(
        q,
      ),
    answer:
      "Avoid ozone generators and ionizers that produce ozone: ozone is harmful to lungs. A correctly sized mechanical HEPA cleaner can reduce particles; it does not remove all gases. Avoid indoor smoke sources and damp-dust instead of dry sweeping. Houseplants do not replace effective filtration. Source: https://www.epa.gov/indoor-air-quality-iaq/ozone-generators-are-sold-air-cleaners",
  },
];
/** @param {string} question @returns {string | null} */
export function safetyReply(question) {
  const q = question.toLowerCase();
  return SAFETY_RULES.find((rule) => rule.matches(q))?.answer ?? null;
}
