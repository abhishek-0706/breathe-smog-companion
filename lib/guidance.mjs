export const CITIES = {
  "New Delhi": [28.6139, 77.209],
  Mumbai: [19.076, 72.8777],
  Bengaluru: [12.9716, 77.5946],
  Lucknow: [26.8467, 80.9462],
  London: [51.5074, -0.1278],
  Beijing: [39.9042, 116.4074],
  Lahore: [31.5204, 74.3587],
  Kathmandu: [27.7172, 85.324],
  "New York": [40.7128, -74.006],
};
export function category(aqi) {
  if (!Number.isFinite(aqi) || aqi < 0)
    return { label: "Unavailable", tone: "muted" };
  return aqi <= 50
    ? { label: "Good", tone: "good" }
    : aqi <= 100
      ? { label: "Moderate", tone: "moderate" }
      : aqi <= 150
        ? { label: "Unhealthy for sensitive groups", tone: "warning" }
        : aqi <= 200
          ? { label: "Unhealthy", tone: "bad" }
          : aqi <= 300
            ? { label: "Very unhealthy", tone: "bad" }
            : { label: "Hazardous", tone: "bad" };
}
export function normalizeProfile(p = {}) {
  if (!p || typeof p !== "object" || Array.isArray(p)) p = {};
  const cities = Object.keys(CITIES);
  return {
    city: cities.includes(p.city) ? p.city : "New Delhi",
    sensitive: p.sensitive === true,
    commute: ["Car", "Public transit", "Work from home"].includes(p.commute)
      ? p.commute
      : "Car",
    distance: Number.isFinite(Number(p.distance))
      ? Math.min(100, Math.max(0, Number(p.distance)))
      : 12,
    budget: p.budget === "Flexible" ? "Flexible" : "No-cost first",
    purifier: p.purifier === true,
  };
}
export function routines(profile, aqi) {
  const p = normalizeProfile(profile);
  const high = !Number.isFinite(aqi) || aqi > 100;
  return [
    {
      id: "move",
      icon: "train",
      time: "YOUR COMMUTE",
      title:
        p.commute === "Work from home"
          ? "Keep today a no-drive day"
          : p.commute === "Public transit"
            ? "Make essential transit trips easier"
            : "Consider an alternative to a solo drive",
      body:
        p.commute === "Work from home"
          ? high
            ? "Keep work remote where possible and choose indoor activity during poor or unknown air quality. Combine only essential errands."
            : "Keep work remote if it fits your day. Combine essential errands; adapt outdoor activity to symptoms and local advisories."
          : high
            ? "For essential trips, shorten outdoor waits and choose enclosed transport where practical. Skip outdoor workouts in severe smog."
            : p.commute === "Public transit"
              ? "Plan a convenient connection and avoid long waits beside busy roads. Follow local service and air-quality advisories."
              : "Consider public transit, a shared ride or combining errands. Walk away from heavy traffic only when conditions and your health allow.",
      impact:
        p.commute === "Public transit"
          ? "Transit can reduce per-passenger emissions compared with solo gasoline driving, depending on vehicle and occupancy. This app does not calculate net transit savings."
          : "Replacing planned gasoline driving with no driving avoids tailpipe emissions. The calculator shows a transparent scenario, not a measured saving.",
      tag: "Lower-emission options",
    },
    {
      id: "room",
      icon: "home",
      time: "AT HOME",
      title: p.purifier
        ? "Make one room your clean-air space"
        : "Start with a cleaner-air corner",
      body: p.purifier
        ? "Run a correctly sized, non-ozone-producing HEPA cleaner continuously. Size it for the room, keep airflow clear and follow its instructions. Close windows during high outdoor pollution only if safe."
        : "Skip incense, candles and smoking. Damp-dust surfaces. When outdoor particle pollution is high, close windows if safe; filtering helps further.",
      impact:
        "Reduces indoor particle sources and exposure. Actual improvement depends on room leakage, sources and filtration.",
      tag: p.purifier
        ? "Use your existing cleaner"
        : p.budget === "No-cost first"
          ? "Start without a purchase"
          : "Cleaner indoor air",
    },
    {
      id: "cook",
      icon: "leaf",
      time: "THIS EVENING",
      title: "Cook a little cleaner tonight",
      body: "Choose steaming or boiling over frying. Use a kitchen exhaust fan that vents outdoors; avoid burning food and solid fuels indoors.",
      impact:
        "Less frying and smoke can reduce the particles generated in your kitchen.",
      tag: "Simple daily swap",
    },
  ];
}
export function avoidedCarbon(km, days = 1) {
  if (!Number.isFinite(km) || !Number.isFinite(days) || km < 0 || days < 0)
    throw new RangeError("Nonnegative finite values required");
  return km * days * (0.4 / 1.609344);
}
export function guidedReply(question, profile, aqi) {
  const p = normalizeProfile(profile),
    q = question.toLowerCase();
  const distance = scenarioDistance(question, p.distance);
  const available = Number.isFinite(aqi) && aqi >= 0,
    high = !available || aqi > 100;
  const unknown = available
    ? ""
    : "Current air-quality conditions are unavailable. Check your local authority or official source before outdoor decisions. ";
  const air = available
    ? `The current modeled U.S. AQI is ${Math.round(aqi)} (${category(aqi).label}). `
    : unknown;
  const source =
    " Source: EPA / AirNow guidance; open Our science & sources for references.";
  if (
    /chest pain|cannot breathe|can.t breathe|struggl.*breath|severe.*breath|blue lips|faint|unusually sleepy/.test(
      q,
    )
  )
    return "Severe breathing difficulty, chest pain, blue lips, unusual sleepiness or fainting may be an emergency. Seek local emergency medical help now. Move to cleaner air if you can do so safely. This assistant cannot diagnose or replace medical care.";
  if (/dizz|difficulty.*respirator|respirator.*difficult/.test(q))
    return (
      "Move to cleaner air and remove the respirator. Seek medical help if symptoms persist, worsen or are severe; chest pain or severe breathing difficulty needs emergency help now. Consult a clinician about respirator suitability, especially with heart or lung disease. We cannot diagnose the cause remotely." +
      source
    );
  if (
    (/generator/.test(q) && !/ozone/.test(q)) ||
    /charcoal|barbecue|\bbbq\b/.test(q)
  )
    return (
      "Never use a generator indoors, in a garage, or in any enclosed space, even with doors open. Never use charcoal grills indoors. They can cause fatal carbon monoxide (CO) poisoning. Run generators outdoors, well away from doors, windows and vents, following manufacturer and local safety guidance. A HEPA filter does not remove carbon monoxide. Use working CO alarms; if poisoning is suspected, leave safely and seek emergency help." +
      source
    );
  if (/medication|inhaler|dose|asthma attack/.test(q))
    return (
      "Follow your clinician-provided asthma or treatment action plan. Do not change medication doses based on this app. If symptoms are severe or worsening, seek urgent medical help. Reduce exertion and move to cleaner indoor air if safe." +
      source
    );
  if (
    /overheat|very hot|too hot|dangerously hot|dangerous.*hot|hot inside|heat/.test(
      q,
    )
  )
    return (
      "Do not stay in dangerous indoor heat just to keep windows closed. Move to a cooler cleaner-air space or a safer location if possible. Use safe cooling and consult local heat and pollution advisories. If you must open windows to cool the home, balance heat risk with outdoor pollution; filter air where feasible. Never block required combustion ventilation." +
      source
    );
  if (/cpcb|indian.*index|india.*index|same.*index/.test(q))
    return "U.S. AQI and the Indian CPCB AQI use different pollutant breakpoints and category bands. They are not interchangeable. Breathe shows modeled U.S. AQI from Open-Meteo / CAMS, not CPCB AQI. For the Indian official index, consult the CPCB portal.";
  if (/sensor|front door|model|open.meteo|street.level/.test(q))
    return "Open-Meteo air quality is based on CAMS atmospheric model data, not a sensor or monitor at your home. Local street and indoor conditions may differ. Breathe provides city-area outdoor model estimates with timestamps; check local monitoring authorities for official decisions.";
  if (/stale|48.hour|two.day|two day|yesterday|old reading/.test(q))
    return "A stale or two-day-old reading is not current. Refresh the data and check your local official source. Breathe excludes model timestamps older than three hours from current guidance. Do not infer current conditions from an outdated number.";
  if (/springfield|which city|ambiguous/.test(q))
    return "Please specify the city, state and country: multiple places can share a name. Breathe currently supports the named cities in household settings; select the intended location. Do not rely on data for an ambiguous city.";
  if (
    /bedroom.*concentration|indoor.*(?:number|concentration|pm2|exact)|(?:number|exact).*indoor/.test(
      q,
    )
  )
    return (
      "We cannot infer an indoor particle concentration from an outdoor AQI value alone. This is not an indoor measurement. A suitable indoor monitor can measure conditions; leakage, ventilation, cooking and filtration all matter. Avoid promising a fixed percentage improvement." +
      source
    );
  if (
    /co.?2|carbon|emission|commut|metro|transit|drive|walk|cycl|sprint/.test(q)
  ) {
    const base = high
      ? "Avoid cycling and avoid outdoor exertion in high pollution; choose indoor alternatives, remote work or enclosed transit for essential trips where practical."
      : "At a Good or Moderate U.S. AQI, normal outdoor activity may be reasonable for many people; adapt to individual sensitivity, symptoms and local advisories.";
    if (distance === null)
      return (
        air +
        "Please use a nonnegative finite distance for a driving-emissions scenario. No saving has been calculated."
      );
    return (
      air +
      base +
      ` Replacing ${distance} km of solo gasoline driving with no driving avoids about ${avoidedCarbon(distance).toFixed(1)} kg of tailpipe CO2 using an EPA U.S.-average proxy. Transit has its own emissions. This is not a prediction of local AQI improvement and cannot quantify personal health benefits; climate and exposure impacts are different.`
    );
  }
  if (/community|neighbo|society|shared|school bus|burn|waste/.test(q))
    return (
      "For a community on a limited budget, share verified local authority advisories, coordinate essential errands and identify a cooler cleaner-air space neighbours can use. A shared correctly sized mechanical filter may help a suitable room if feasible. Start a no-idling pledge near schools and do not burn leaves or waste. These actions reduce avoidable emission sources, but cannot quantify a neighbourhood AQI improvement. Keep health details private." +
      source
    );
  if (/plant|ozone|ioniz|incense|candle|steam inhal/.test(q))
    return (
      "Avoid ozone generators and ionizers that produce ozone: ozone is harmful to lungs. Avoid incense, candles and smoking indoors; a pleasant smell does not mean clean air. Houseplants do not replace effective filtration. A correctly sized mechanical HEPA cleaner can reduce particles; it does not remove all gases. Avoid indoor smoke sources and damp-dust instead of dry sweeping." +
      source
    );
  if (
    /mask|n95|ffp2|respirator|child|toddler|school|elder|pregnan|asthma|7.year/.test(
      q,
    )
  )
    return (
      unknown +
      `${p.sensitive ? "Your household includes someone more sensitive to pollution. " : ""}Children and people with asthma can be more vulnerable. ${high ? "Reduce prolonged or strenuous outdoor activity and choose a cleaner indoor activity." : "Check local guidance, individual sensitivity and symptoms before outdoor activity."} Follow any clinician-provided asthma action plan. A well-fitting N95/FFP2 can reduce particle exposure, but does not filter all gases. Adult respirators may not fit children. Consult pediatric or clinician guidance about suitability.` +
      source
    );
  if (
    /window|ventilat|purifier|indoor|filter|dust|sweep|cook|dinner|air cleaner/.test(
      q,
    )
  )
    return (
      unknown +
      `${p.purifier ? "Place your mechanical HEPA air cleaner in a room where you spend time; check room size against its capacity, keep airflow unobstructed and follow manufacturer instructions." : "Begin with no-cost steps: avoid incense and smoking indoors, damp-dust or wet mop, and avoid dry sweeping because it stirs particles back into the air."} Close windows during high outdoor particle pollution only if safe; ventilate when outdoor air improves, not at a fixed time. Never block required combustion ventilation or let the home overheat. Choose steaming or boiling instead of frying; use an externally vented kitchen extractor. Filtration does not remove CO2 or every gas.` +
      source
    );
  return (
    air +
    `${high ? "Prioritize cleaner indoor air and reduce outdoor exertion." : "With Good or Moderate air, adapt normal outdoor activity to individual sensitivity and symptoms."} ${p.budget === "No-cost first" ? "Start with free changes: avoid burning incense, damp-dust and combine essential errands." : "Choose a correctly sized HEPA cleaner if feasible and avoid indoor smoke sources."} Ask about windows, masks, commuting or a community action. Guided responses use curated rules, not an AI model.` +
    source
  );
}

/** Never keep a once-fresh reading current indefinitely in an open browser tab. */
export function isCurrentAir(air, now = Date.now()) {
  if (
    !air ||
    air.stale ||
    !Number.isFinite(air.current?.us_aqi) ||
    air.current.us_aqi < 0
  )
    return false;
  const modeledAt = Date.parse(air.modeledAt);
  return (
    Number.isFinite(modeledAt) &&
    now - modeledAt <= 3 * 60 * 60 * 1000 &&
    modeledAt - now <= 60 * 60 * 1000
  );
}

/** Parse an explicit hypothetical trip distance; never accept a client CO2 total. */
export function scenarioDistance(question, fallback) {
  const match = question.match(
    /(?<![\w.])(-?\d+(?:\.\d+)?)\s*(?:km|kilomet(?:er|re)s?)\b/i,
  );
  if (!match) return fallback;
  const value = Number(match[1]);
  return Number.isFinite(value) && value >= 0 ? value : null;
}
