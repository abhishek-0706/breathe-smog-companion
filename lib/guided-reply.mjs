import { normalizeProfile } from "./profile.mjs";
import { category } from "./air-quality.mjs";
import { avoidedCarbon, scenarioDistance } from "./impact.mjs";
import { safetyReply } from "./safety.mjs";
import { referenceReply } from "./reference.mjs";
const source =
  " Source: EPA / AirNow guidance; open Our science & sources for references.";
/** @type {readonly import("./types.d.ts").TopicRule[]} */
const TOPIC_REPLIES = [
  {
    matches: (q) => /cpcb|indian.*index|india.*index|same.*index/.test(q),
    reply: () => {
      return "U.S. AQI and the Indian CPCB AQI use different pollutant breakpoints and category bands. They are not interchangeable. Breathe shows modeled U.S. AQI from Open-Meteo / CAMS, not CPCB AQI. For the Indian official index, consult the CPCB portal.";
    },
  },
  {
    matches: (q) => /sensor|front door|model|open.meteo|street.level/.test(q),
    reply: () => {
      return "Open-Meteo air quality is based on CAMS atmospheric model data, not a sensor or monitor at your home. Local street and indoor conditions may differ. Breathe provides city-area outdoor model estimates with timestamps; check local monitoring authorities for official decisions.";
    },
  },
  {
    matches: (q) =>
      /stale|48.hour|two.day|two day|yesterday|old reading/.test(q),
    reply: () => {
      return "A stale or two-day-old reading is not current. Refresh the data and check your local official source. Breathe excludes model timestamps older than three hours from current guidance. Do not infer current conditions from an outdated number.";
    },
  },
  {
    matches: (q) => /springfield|which city|ambiguous/.test(q),
    reply: () => {
      return "Please specify the city, state and country: multiple places can share a name. Breathe currently supports the named cities in household settings; select the intended location. Do not rely on data for an ambiguous city.";
    },
  },
  {
    matches: (q) =>
      /bedroom.*concentration|indoor.*(?:number|concentration|pm2|exact)|(?:number|exact).*indoor/.test(
        q,
      ),
    reply: () => {
      return (
        "We cannot infer an indoor particle concentration from an outdoor AQI value alone. This is not an indoor measurement. A suitable indoor monitor can measure conditions; leakage, ventilation, cooking and filtration all matter. Avoid promising a fixed percentage improvement." +
        source
      );
    },
  },
  {
    matches: (q) =>
      /co.?2|carbon|emission|commut|metro|transit|drive|walk|cycl|sprint/.test(
        q,
      ),
    reply: ({ high, distance, air }) => {
      const base = high
        ? "Avoid cycling and avoid outdoor exertion in high pollution; choose indoor alternatives, remote work or enclosed transit for essential trips where practical."
        : "At a Good or Moderate U.S. AQI, normal outdoor activity may be reasonable for many people; adapt to individual sensitivity, symptoms and local advisories.";
      if (distance === null) {
        return (
          air +
          "Please use a nonnegative finite distance for a driving-emissions scenario. No saving has been calculated."
        );
      }
      return (
        air +
        base +
        ` Replacing ${distance} km of solo gasoline driving with no driving avoids about ${avoidedCarbon(distance).toFixed(1)} kg of tailpipe CO2 using an EPA U.S.-average proxy. Transit has its own emissions. This is not a prediction of local AQI improvement and cannot quantify personal health benefits; climate and exposure impacts are different.`
      );
    },
  },
  {
    matches: (q) =>
      /community|neighbo|society|shared|school bus|burn|waste/.test(q),
    reply: () => {
      return (
        "For a community on a limited budget, share verified local authority advisories, coordinate essential errands and identify a cooler cleaner-air space neighbours can use. A shared correctly sized mechanical filter may help a suitable room if feasible. Start a no-idling pledge near schools and do not burn leaves or waste. These actions reduce avoidable emission sources, but cannot quantify a neighbourhood AQI improvement. Keep health details private." +
        source
      );
    },
  },
  {
    matches: (q) => /plant|ozone|ioniz|incense|candle|steam inhal/.test(q),
    reply: () => {
      return (
        "Avoid ozone generators and ionizers that produce ozone: ozone is harmful to lungs. Avoid incense, candles and smoking indoors; a pleasant smell does not mean clean air. Houseplants do not replace effective filtration. A correctly sized mechanical HEPA cleaner can reduce particles; it does not remove all gases. Avoid indoor smoke sources and damp-dust instead of dry sweeping." +
        source
      );
    },
  },
  {
    matches: (q) =>
      /mask|n95|ffp2|respirator|child|toddler|school|elder|pregnan|asthma|7.year/.test(
        q,
      ),
    reply: ({ unknown, p, high }) => {
      return (
        unknown +
        `${p.sensitive ? "Your household includes someone more sensitive to pollution. " : ""}Children and people with asthma can be more vulnerable. ${high ? "Reduce prolonged or strenuous outdoor activity and choose a cleaner indoor activity." : "Check local guidance, individual sensitivity and symptoms before outdoor activity."} Follow any clinician-provided asthma action plan. A well-fitting N95/FFP2 can reduce particle exposure, but does not filter all gases. Adult respirators may not fit children. Consult pediatric or clinician guidance about suitability.` +
        source
      );
    },
  },
  {
    matches: (q) =>
      /window|ventilat|purifier|indoor|filter|dust|sweep|cook|dinner|air cleaner/.test(
        q,
      ),
    reply: ({ unknown, p }) => {
      return (
        unknown +
        `${p.purifier ? "Place your mechanical HEPA air cleaner in a room where you spend time; check room size against its capacity, keep airflow unobstructed and follow manufacturer instructions." : "Begin with no-cost steps: avoid incense and smoking indoors, damp-dust or wet mop, and avoid dry sweeping because it stirs particles back into the air."} Close windows during high outdoor particle pollution only if safe; ventilate when outdoor air improves, not at a fixed time. Never block required combustion ventilation or let the home overheat. Choose steaming or boiling instead of frying; use an externally vented kitchen extractor. Filtration does not remove CO2 or every gas.` +
        source
      );
    },
  },
];
/** @param {import("./types.d.ts").GuidedContext} context */
function defaultReply({ air, high, p }) {
  return (
    air +
    `${high ? "Prioritize cleaner indoor air and reduce outdoor exertion." : "With Good or Moderate air, adapt normal outdoor activity to individual sensitivity and symptoms."} ${p.budget === "No-cost first" ? "Start with free changes: avoid burning incense, damp-dust and combine essential errands." : "Choose a correctly sized HEPA cleaner if feasible and avoid indoor smoke sources."} Ask about windows, masks, commuting or a community action. Guided responses use curated rules, not an AI model.` +
    source
  );
}
/** @param {string} question @param {unknown} profile @param {number | null} aqi @returns {string} */
export function guidedReply(question, profile, aqi) {
  const p = normalizeProfile(profile),
    q = question.toLowerCase();
  const distance = scenarioDistance(question, p.distance);
  const available = typeof aqi === "number" && Number.isFinite(aqi) && aqi >= 0,
    high = !available || aqi > 100;
  const unknown = available
    ? ""
    : "Current air-quality conditions are unavailable. Check your local authority or official source before outdoor decisions. ";
  const air = available
    ? `The current modeled U.S. AQI is ${Math.round(aqi)} (${category(aqi).label}). `
    : unknown;

  const urgent = safetyReply(question);
  if (urgent) {
    return urgent;
  }
  const reference = referenceReply(question);
  if (reference) {
    return reference;
  }
  const context = { p, q, high, unknown, air, distance };
  const topic = TOPIC_REPLIES.find((rule) => rule.matches(q));
  return topic ? topic.reply(context) : defaultReply(context);
}
