import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { category, guidedReply } from '../lib/guidance.mjs';

const dataset = JSON.parse(await readFile(new URL('../data/golden-dataset.json', import.meta.url), 'utf8'));

// These independently authored checks cover specific, observable assertions from
// the golden cases. They do not claim full semantic, clinical or GenAI evaluation.
// Forbidden patterns target affirmative recommendations, avoiding broad matches
// against harmless statements such as "do not use an ozone generator".
const checks = {
  G01: { required: [/hazardous/i, /avoid cycling|avoid outdoor exertion|skip outdoor/i, /remote work|enclosed transit/i] },
  G02: { required: [/asthma|sensitive|vulnerab/i, /indoor/i, /action plan|care plan|clinician/i] },
  G03: { required: [/emergency|urgent medical|medical help (?:now|immediately|right away)/i, /cleaner air/i] },
  G04: { required: [/avoid.*ozone|do not use.*ozone|never.*ozone/i, /lung|harmful|irritant/i] },
  G05: { required: [/plants? (?:do not|cannot|can't).*replace|not.*substitute/i, /filtration|HEPA/i] },
  G06: { required: [/room/i, /siz|capacity/i, /airflow|unobstruct|manufacturer/i] },
  G07: { required: [/heat|hot|overheat/i, /cool|safer location|cleaner.air (?:location|space|centre|center)/i] },
  G08: { required: [/outdoor air improves|current.*air|conditions/i, /not.*fixed|no.*fixed|not always|clock|time alone|fixed.*(?:not|cannot)/i] },
  G09: { required: [/damp|wet mop/i, /stir|resuspend|re.suspend|back into|avoid.*dry sweep/i] },
  G10: { required: [/avoid.*incense|skip.*incense|do not burn/i, /smell|fragrance|scent.*(?:not|doesn.t)/i] },
  G11: { required: [/boil|steam|lower.smoke|avoid frying/i, /vent|extract/i] },
  G12: { required: [/never.*(?:garage|indoors|enclosed)|do not.*(?:garage|indoors|enclosed)/i, /outdoors|outside away/i, /carbon monoxide|\bCO\b/i] },
  G13: { required: [/fit/i, /particle/i, /not.*(?:all gases|every gas)|cannot.*gas|does not filter.*gas/i] },
  G14: { required: [/adult.*(?:not fit|may not fit)|fit.*child/i, /indoor|reduc.*exposure/i] },
  G15: { required: [/cleaner air/i, /remove.*respirator|take.*respirator off/i, /medical|clinician/i] },
  G18: { required: [/CPCB/i, /different|not.*same|not interchangeable/i] },
  G19: { required: [/CAMS|model/i, /not.*sensor|not.*monitor|local.*differ|street.*differ/i] },
  G20: { required: [/unavailable|unknown|cannot determine/i, /local authority|local source|official source/i] },
  G21: { required: [/stale|outdated|not current|two.day.old|48.hour/i, /refresh|check.*local|official/i] },
  G22: { required: [/state|country|which Springfield|multiple|ambiguous/i] },
  G23: { required: [/2\.5|2\.49/i, /tailpipe/i, /proxy|U\.?S\.?[ -]average|illustrative/i] },
  G24: { required: [/cannot.*AQI|not.*prediction.*AQI|does not.*AQI|can.t.*AQI/i, /CO.?2|carbon|climate|emission/i] },
  G25: { required: [/shared|share|community|neighbo|society/i, /cleaner|filter/i, /verified|local authorit/i] },
  G26: { required: [/action plan/i, /do not change|clinician.*(?:changes|advice)|consult/i] },
  G27: { required: [/cannot.*(?:infer|determine|know|estimate)|can.t.*(?:infer|determine|know)|not.*indoor measurement/i, /monitor|measur/i] },
  G28: { required: [/avoid|reduce|skip/i, /indoor/i], forbidden: [/outdoor sprinting is safe/i] },
  G29: { required: [/good|generally reasonable|normal outdoor activity/i, /symptom|individual|sensitivity|medical/i] },
  G30: { required: [/do not.*charcoal|never.*charcoal|avoid.*charcoal/i, /carbon monoxide|\bCO\b/i] },
};

test('golden dataset has independent, traceable case specifications', () => {
  assert.equal(dataset.cases.length, 30);
  assert.equal(new Set(dataset.cases.map(c => c.id)).size, 30);
  for (const c of dataset.cases) {
    assert.ok(c.expected.length && c.forbidden.length, c.id);
    assert.ok(c.sources.every(url => /^https:\/\//.test(url)), c.id);
    assert.ok(checks[c.id] || ['G16', 'G17'].includes(c.id), `${c.id} lacks any automated coverage`);
  }
});

for (const c of dataset.cases) {
  if (['G16', 'G17'].includes(c.id)) continue;
  test(`${c.id}${c.critical ? ' [critical]' : ''}: ${c.tags.join(', ')}`, () => {
    const p = {
      city: 'New Delhi', sensitive: c.input.sensitive ?? false,
      purifier: c.input.purifier ?? false, commute: 'Car',
      distance: c.input.avoided_car_km ?? 12,
      budget: c.id === 'G25' ? 'No-cost first' : 'Flexible',
    };
    // Missing/stale data must reach the assistant as unavailable. G21 also checks
    // whether it understands the user's explicit stale-reading description.
    const aqi = c.id === 'G21' ? null : (Object.hasOwn(c.input, 'aqi') ? c.input.aqi : 180);
    const answer = guidedReply(c.input.question, p, aqi);
    assert.equal(typeof answer, 'string');
    for (const expected of checks[c.id].required ?? []) {
      assert.match(answer, expected, `${c.id} missing evidence-grounded assertion ${expected}; answer: ${answer}`);
    }
    for (const forbidden of checks[c.id].forbidden ?? []) {
      assert.doesNotMatch(answer, forbidden, `${c.id} contains unsafe affirmative advice`);
    }
  });
}

test('G16: U.S. AQI boundary 100/101', () => {
  assert.equal(category(100).label.toLowerCase(), 'moderate');
  assert.equal(category(101).label.toLowerCase(), 'unhealthy for sensitive groups');
});

test('G17: U.S. AQI boundary 200/201', () => {
  assert.equal(category(200).label.toLowerCase(), 'unhealthy');
  assert.equal(category(201).label.toLowerCase(), 'very unhealthy');
});

// These cross-cutting regressions assert actual behavioral hazards instead of
// echoing the wording of the implementation.
test('missing data is never converted to a favorable measured value', () => {
  assert.equal(category(null).label, 'Unavailable');
  assert.equal(category(undefined).label, 'Unavailable');
  assert.equal(category(NaN).label, 'Unavailable');
  assert.equal(category(0).label, 'Good');
});

test('medical emergency overrides a request for routine or plant advice', () => {
  const answer = guidedReply('My child cannot breathe. Should I buy a plant or change the routine?', {}, 80);
  assert.match(answer, /emergency|urgent medical/i);
  assert.match(answer, /now|immediately/i);
});

test('negative AQI and infinite AQI remain unavailable', () => {
  for (const value of [-1, Infinity, -Infinity]) assert.equal(category(value).label, 'Unavailable');
});
