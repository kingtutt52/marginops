/** Pure financial decision engine. USD throughout; month 1 is the first forecast month. */
export const MODEL_VERSION = '1.0.0';
const sum = values => values.reduce((a, b) => a + b, 0);
const fail = message => { throw new RangeError(message); };
function number(value, label, min = 0, max = 1e12, integer = false) {
  if (!Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) fail(`Invalid ${label}`);
}
export function validateInitiatives(items) {
  if (!Array.isArray(items) || items.length > 20) fail('Provide at most 20 initiatives');
  const ids = new Set();
  for (const i of items) {
    if (!i || typeof i.id !== 'string' || !/^[a-z0-9-]{1,60}$/.test(i.id) || ids.has(i.id)) fail('Initiative IDs must be unique slug strings');
    ids.add(i.id);
    if (typeof i.name !== 'string' || !i.name.trim()) fail('Initiative name is required');
    if (!['cost', 'revenue', 'working-capital'].includes(i.kind)) fail('Unknown initiative kind');
    for (const key of ['annualBenefit', 'annualOpex', 'implementationExpense', 'capex', 'cashRelease', 'effort']) number(i[key], key);
    number(i.contributionMargin, 'contributionMargin', 0, 1);
    number(i.probability, 'probability', 0, 1);
    number(i.startMonth, 'startMonth', 1, 36, true);
    number(i.rampMonths, 'rampMonths', 1, 36, true);
    if (!Array.isArray(i.dependencies) || i.dependencies.some(x => typeof x !== 'string')) fail('Dependencies must be IDs');
    if (i.exclusiveGroup !== null && typeof i.exclusiveGroup !== 'string') fail('Invalid exclusiveGroup');
    if (i.kind === 'working-capital' && i.annualBenefit !== 0) fail('Working capital cannot create EBITDA benefit');
    if (i.kind !== 'working-capital' && i.cashRelease !== 0) fail('Cash release belongs to working-capital initiatives');
  }
  const visited = new Set(), active = new Set(), byId = new Map(items.map(i => [i.id, i]));
  function visit(id) {
    if (active.has(id)) fail('Cyclic dependencies');
    if (visited.has(id)) return;
    active.add(id);
    const i = byId.get(id);
    for (const d of i.dependencies) {
      if (!byId.has(d)) fail(`Missing dependency: ${d}`);
      if (byId.get(d).startMonth > i.startMonth) fail('Dependency starts after dependent initiative');
      visit(d);
    }
    active.delete(id); visited.add(id);
  }
  items.forEach(i => visit(i.id));
  return items;
}
export function validateScenario(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('Scenario must be an object');
  const s = { budget: 600000, capacity: 24, realization: 1, delay: 0, months: 12, ...input };
  number(s.budget, 'budget'); number(s.capacity, 'capacity');
  number(s.realization, 'realization', 0, 1.5);
  number(s.delay, 'delay', 0, 12, true); number(s.months, 'months', 1, 36, true);
  return s;
}
export const upfront = i => i.implementationExpense + i.capex;
export const grossAnnual = i => i.kind === 'working-capital' ? 0 : i.annualBenefit * (i.kind === 'revenue' ? i.contributionMargin : 1);

function forecastUnchecked(i, s, successFactor = i.probability) {
  const start = i.startMonth + s.delay;
  const monthly = Array.from({ length: s.months }, (_, index) => {
    const month = index + 1;
    const ramp = Math.max(0, Math.min(1, (month - start + 1) / i.rampMonths));
    const benefit = grossAnnual(i) / 12 * ramp * s.realization * successFactor;
    // All selected initiatives commit upfront at month 1. Opex starts at launch, even if unsuccessful.
    const opex = month >= start ? i.annualOpex / 12 : 0;
    const expense = month === 1 ? i.implementationExpense : 0;
    const capital = month === 1 ? i.capex : 0;
    const cashRelease = month === start ? i.cashRelease * s.realization * successFactor : 0;
    const ebitda = benefit - opex - expense;
    return { month, benefit, opex, expense, capex: capital, cashRelease, ebitda, cash: ebitda - capital + cashRelease };
  });
  let cumulative = 0, paybackMonth = null;
  for (const m of monthly) {
    cumulative += m.cash;
    if (paybackMonth === null && cumulative >= 0 && upfront(i) > 0) paybackMonth = m.month;
  }
  return { id: i.id, monthly, ebitda: sum(monthly.map(m => m.ebitda)), cash: sum(monthly.map(m => m.cash)),
    runRate: grossAnnual(i) * s.realization * successFactor - i.annualOpex,
    investment: upfront(i), paybackMonth };
}
export function forecast(i, input = {}) {
  // Validate referenced dependency IDs separately through portfolio validation.
  validateInitiatives([{ ...i, dependencies: [] }]);
  return forecastUnchecked(i, validateScenario(input));
}
export function selectionIssues(items, ids, input = {}) {
  validateInitiatives(items); const s = validateScenario(input);
  if (!Array.isArray(ids) || new Set(ids).size !== ids.length) fail('Selection IDs must be unique');
  const selected = items.filter(i => ids.includes(i.id)), chosen = new Set(ids), issues = [];
  if (selected.length !== ids.length) fail('Unknown selected ID');
  if (sum(selected.map(upfront)) > s.budget) issues.push('Implementation budget exceeded');
  if (sum(selected.map(i => i.effort)) > s.capacity) issues.push('Delivery capacity exceeded');
  const groups = new Set();
  for (const i of selected) {
    if (i.dependencies.some(d => !chosen.has(d))) issues.push(`${i.name}: required dependency missing`);
    if (i.exclusiveGroup) {
      if (groups.has(i.exclusiveGroup)) issues.push(`Overlapping benefit pool: ${i.exclusiveGroup}`);
      groups.add(i.exclusiveGroup);
    }
  }
  return issues;
}
export function portfolio(items, ids, input = {}) {
  const issues = selectionIssues(items, ids, input), s = validateScenario(input);
  const forecasts = items.filter(i => ids.includes(i.id)).map(i => forecastUnchecked(i, s));
  const monthly = Array.from({length:s.months}, (_, k) => {
    const m = { month: k + 1 };
    for (const field of ['benefit','opex','expense','capex','cashRelease','ebitda','cash']) m[field] = sum(forecasts.map(f => f.monthly[k][field]));
    return m;
  });
  let cumulative = 0, paybackMonth = null;
  const investment = sum(forecasts.map(f => f.investment));
  for (const m of monthly) { cumulative += m.cash; if (investment > 0 && paybackMonth === null && cumulative >= 0) paybackMonth = m.month; }
  return { modelVersion: MODEL_VERSION, ids, issues, feasible: issues.length === 0, monthly, forecasts,
    ebitda: sum(forecasts.map(f => f.ebitda)), cash: sum(forecasts.map(f => f.cash)),
    runRate: sum(forecasts.map(f => f.runRate)), investment, paybackMonth,
    effort: sum(items.filter(i => ids.includes(i.id)).map(i => i.effort)) };
}

/** Exhaustive subset optimization: exact within the supplied finite candidate set (<=20). */
export function optimize(items, input = {}) {
  validateInitiatives(items); const s = validateScenario(input);
  const values = items.map(i => forecastUnchecked(i, s).ebitda);
  const index = new Map(items.map((i,k) => [i.id,k]));
  const dependencies = items.map(i => i.dependencies.reduce((mask,d) => mask | 1 << index.get(d), 0));
  let bestMask = 0, bestValue = 0, bestCost = 0, feasibleCount = 0;
  for (let mask = 0; mask < 2 ** items.length; mask++) {
    let cost = 0, effort = 0, value = 0, valid = true;
    const groups = new Set();
    for (let k = 0; k < items.length; k++) if (mask & 1 << k) {
      const i = items[k];
      cost += upfront(i); effort += i.effort; value += values[k];
      if (cost > s.budget || effort > s.capacity || (mask & dependencies[k]) !== dependencies[k] || (i.exclusiveGroup && groups.has(i.exclusiveGroup))) { valid = false; break; }
      if (i.exclusiveGroup) groups.add(i.exclusiveGroup);
    }
    if (!valid) continue;
    feasibleCount++;
    if (value > bestValue + 1e-6 || (Math.abs(value - bestValue) <= 1e-6 && cost < bestCost)) { bestValue=value; bestMask=mask; bestCost=cost; }
  }
  const ids = items.filter((_,k) => bestMask & 1 << k).map(i => i.id);
  return { ...portfolio(items, ids, s), evaluated: 2 ** items.length, feasibleCount, objective: `${s.months}-month expected incremental EBITDA` };
}
function random(seed) {
  let a = seed >>> 0;
  return () => { a += 0x6D2B79F5; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function simulate(items, ids, input = {}, { runs = 2000, seed = 52 } = {}) {
  selectionIssues(items, ids, input); const s = validateScenario(input);
  number(runs, 'runs', 100, 10000, true); number(seed, 'seed', 0, 4294967295, true);
  const selected = items.filter(i => ids.includes(i.id)), rng = random(seed), outcomes = [];
  const successful = selected.map(i => forecastUnchecked(i,s,1));
  const failed = selected.map(i => forecastUnchecked(i,s,0));
  for (let n = 0; n < runs; n++) {
    // Shared uniform [0.8,1.2] realization shock creates correlated magnitude risk; success draws are independent.
    const shock = .8 + rng() * .4;
    let value = 0;
    selected.forEach((i,k) => { const success = rng() < i.probability; value += failed[k].ebitda + (success ? (successful[k].ebitda - failed[k].ebitda) * shock : 0); });
    outcomes.push(value);
  }
  outcomes.sort((a,b) => a-b);
  const q = p => outcomes[Math.floor((runs-1)*p)];
  return { seed, runs, p10:q(.1), p50:q(.5), p90:q(.9), mean:sum(outcomes)/runs,
    probabilityPositive: outcomes.filter(x=>x>0).length/runs,
    histogram: Array.from({length:12},(_,k)=> {
      const min=outcomes[0], width=(outcomes.at(-1)-min || 1)/12;
      return {low:min+k*width, high:min+(k+1)*width, count:outcomes.filter(v=>Math.min(11,Math.floor((v-min)/width))===k).length};
    }) };
}

/** Evidence ledger. Observed improvements are positive; headwinds and costs are explicit deductions. */
export function reconcileLedger(entries) {
  if (!Array.isArray(entries)) fail('Ledger must be an array');
  const keys = new Set();
  const rows = entries.map(e => {
    if (!e || typeof e.initiativeId !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(e.period) || typeof e.benefitPool !== 'string' || !e.benefitPool) fail('Invalid ledger identity');
    const key = `${e.period}:${e.benefitPool}`;
    if (keys.has(key)) fail('Duplicate benefit pool in period'); keys.add(key);
    if (!['approved','pending','rejected'].includes(e.status)) fail('Invalid ledger status');
    for (const f of ['observedBenefit','counterfactualBenefit']) number(e[f], f, -1e12);
    for (const f of ['incrementalOpex','implementationExpense']) number(e[f], f);
    if (e.status === 'approved' && (!e.evidenceRef || !e.reviewer || !e.approvedAt)) fail('Approved evidence requires reference, reviewer and date');
    return {...e, recognized: e.status === 'approved' ? e.observedBenefit-e.counterfactualBenefit-e.incrementalOpex-e.implementationExpense : 0};
  });
  return {rows, recognized:sum(rows.map(r=>r.recognized)), pending:rows.filter(r=>r.status==='pending').length};
}
