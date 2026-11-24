/** @param {string} question @returns {string | null} */
export function referenceReply(question) {
  if (
    /stale|(?:two|2)[ -]days? (?:old|ago)|two-day|48[ -]hours?|outdated (?:data|reading)|old reading/i.test(
      question,
    )
  ) {
    return "A two-day-old or stale reading is not current. Refresh and check a local official source before deciding on outdoor activity. Breathe excludes timestamps older than three hours from current guidance; a forecast for another time is not a current observation. This describes the age you reported, not a new local reading. Source: https://open-meteo.com/en/docs/air-quality-api";
  }
  if (
    /(?:fetch|request|data|reading|aqi).{0,35}(?:fail|unavailable|missing|not load)|(?:no|missing|unavailable) (?:current )?(?:data|reading|aqi)/i.test(
      question,
    )
  ) {
    return "If the air-quality request failed, current conditions from that request are unavailable. Do not treat missing data as clean air. Refresh or check an authoritative local source before deciding on outdoor activity. For a child, choose a cleaner indoor activity while conditions remain uncertain. No reading has been inferred from the reported outage. Source: https://www.airnow.gov/aqi/aqi-basics/";
  }
  if (
    !/\baqi\b/i.test(question) ||
    !/categor(?:y|ies)|classif|breakpoint/i.test(question)
  ) {
    return null;
  }
  return "U.S. AQI categories: 0-50 is Good; 51-100 is Moderate; 101-150 is Unhealthy for sensitive groups; 151-200 is Unhealthy; 201-300 is Very unhealthy; 301 and above is Hazardous. These are category definitions, not a new reading for your location. India's CPCB index uses a different scale. Source: https://www.airnow.gov/aqi/aqi-basics/";
}
