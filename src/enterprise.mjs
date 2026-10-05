/** Synthetic global-enterprise underwriting. No industry benchmark or realized-savings claim. */
import { validateInitiatives, portfolio, optimize, simulate } from './engine.mjs';
export const ENTERPRISE = Object.freeze({ name: 'Meridian Global · illustrative enterprise', sites: 1000,
  revenue: 200e9, baselineEbitda: 18e9, budget: 900e6, capacity: 1600 });
const finite = (n, low, high, label) => {
  if (!Number.isFinite(n) || n < low || n > high) throw new RangeError(`Invalid ${label}`);
};
export function buildEnterprise(definition, input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new RangeError('Enterprise assumptions must be an object');
  const sites = input.sites ?? ENTERPRISE.sites;
  finite(sites, 50, 5000, 'site count');
  if (!Number.isInteger(sites)) throw new RangeError('Site count must be an integer');
  const scale = sites / ENTERPRISE.sites, overrides = input.levers ?? {};
  if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) throw new RangeError('Invalid lever overrides');
  const known = new Set(definition.map(i => i.id));
  for (const id of Object.keys(overrides)) if (!known.has(id)) throw new RangeError(`Unknown enterprise lever: ${id}`);
  const pools = new Map();
  const items = definition.map(row => {
    const o = overrides[row.id] ?? {};
    if (!o || typeof o !== 'object' || Array.isArray(o)) throw new RangeError('Invalid lever override');
    for (const key of Object.keys(o)) if (!['rate', 'coverage', 'expenseConversion'].includes(key)) throw new RangeError(`Unsupported override: ${key}`);
    const rate = o.rate ?? row.rate, coverage = o.coverage ?? row.coverage,
      expenseConversion = o.expenseConversion ?? row.expenseConversion;
    finite(row.spend, 0, 1e12, 'addressable spend');
    finite(rate, 0, .5, 'improvement rate'); finite(coverage, 0, 1, 'adoption coverage');
    finite(expenseConversion, 0, 1, 'expense conversion');
    if (row.kind === 'cost' && row.spend > 0) {
      if (typeof row.pool !== 'string' || !row.pool) throw new RangeError('Cost lever requires a spend pool');
      const existing = pools.get(row.pool);
      if (existing && (existing.spend !== row.spend || !row.exclusiveGroup || existing.group !== row.exclusiveGroup))
        throw new RangeError('Shared spend pools require consistent baselines and mutual exclusion');
      pools.set(row.pool, { spend: row.spend, group: row.exclusiveGroup });
    }
    const scaledSpend = row.spend * scale;
    return { ...row, rate, coverage, expenseConversion, spend: scaledSpend,
      annualBenefit: row.kind === 'working-capital' ? 0 : scaledSpend * rate * coverage * expenseConversion,
      annualOpex: row.annualOpex * scale, implementationExpense: row.implementationExpense * scale,
      capex: row.capex * scale, cashRelease: row.cashRelease * scale, effort: row.effort * scale,
      driver: `${row.kind === 'revenue' ? 'Revenue exposure' : 'Addressable annual expense'} × improvement rate × adoption × expense conversion`,
      assumptions: { spend: scaledSpend, rate, coverage, expenseConversion, pool: row.pool } };
  });
  validateInitiatives(items);
  return { items, sites, scale, revenue: ENTERPRISE.revenue * scale,
    baselineEbitda: ENTERPRISE.baselineEbitda * scale,
    addressableCost: [...pools.values()].reduce((a,p) => a + p.spend * scale, 0),
    scenario: { budget: ENTERPRISE.budget * scale, capacity: ENTERPRISE.capacity * scale,
      realization: 1, delay: 0, months: 12 } };
}
export function savingsBridge(items, result) {
  const byId = new Map(items.map(i => [i.id,i]));
  const chosen = result.forecasts;
  const total = (kind, field) => chosen.filter(f => byId.get(f.id).kind === kind).reduce((a,f) => a + f[field],0);
  const grossCostSavings = chosen.filter(f => byId.get(f.id).kind === 'cost')
    .reduce((a,f) => a + f.monthly.reduce((b,m) => b + m.benefit,0),0);
  const revenueContribution = chosen.filter(f => byId.get(f.id).kind === 'revenue')
    .reduce((a,f) => a + f.monthly.reduce((b,m) => b + m.benefit,0),0);
  const recurringOpex = result.monthly.reduce((a,m) => a + m.opex,0);
  const implementationExpense = result.monthly.reduce((a,m) => a + m.expense,0);
  const workingCapitalRelease = result.monthly.reduce((a,m) => a + m.cashRelease,0);
  return { grossCostSavings, revenueContribution, recurringOpex, implementationExpense,
    netCostSavings: total('cost','ebitda'), recurringNetCostSavings: total('cost','runRate'),
    workingCapitalRelease, capex: result.monthly.reduce((a,m) => a + m.capex,0),
    ebitda: grossCostSavings + revenueContribution - recurringOpex - implementationExpense,
    recurringEbitda: result.runRate,
    quarters: Array.from({length: Math.ceil(result.monthly.length/3)},(_,k) => ({quarter:k+1,
      ebitda:result.monthly.slice(k*3,k*3+3).reduce((a,m)=>a+m.ebitda,0),
      cash:result.monthly.slice(k*3,k*3+3).reduce((a,m)=>a+m.cash,0)})) };
}
export function enterpriseCase(definition, assumptions = {}, scenarioInput = {}, ids = null) {
  const enterprise = buildEnterprise(definition,assumptions), scenario = {...enterprise.scenario,...scenarioInput};
  const result = ids === null ? optimize(enterprise.items,scenario) : portfolio(enterprise.items,ids,scenario);
  return { ...result, profile:'enterprise', claimStatus:'synthetic-model-only',
    enterprise: {sites:enterprise.sites,revenue:enterprise.revenue,baselineEbitda:enterprise.baselineEbitda,addressableCost:enterprise.addressableCost},
    scenario, assumptions, underwriting: enterprise.items.map(i => ({id:i.id,kind:i.kind,
      ...i.assumptions,annualBenefit:i.annualBenefit,probability:i.probability,selected:result.ids.includes(i.id)})),
    savings: savingsBridge(enterprise.items,result),
    uncertainty:simulate(enterprise.items,result.ids,scenario) };
}
