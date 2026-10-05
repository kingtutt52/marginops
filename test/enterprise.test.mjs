import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buildEnterprise,enterpriseCase,savingsBridge} from '../src/enterprise.mjs';
import {portfolio,forecast,selectionIssues} from '../src/engine.mjs';
const definition=JSON.parse(await readFile(new URL('../data/enterprise.json',import.meta.url)));
const close=(a,b)=>assert.ok(Math.abs(a-b)<Math.max(1e-6,Math.abs(b)*1e-12),`${a} != ${b}`);
test('Enterprise base case is a feasible billions-scale model with a reconciled bridge',()=>{
 const p=enterpriseCase(definition);
 assert.equal(p.claimStatus,'synthetic-model-only');assert.equal(p.feasible,true);
 close(p.savings.netCostSavings,5026627833.333333);close(p.savings.recurringNetCostSavings,6614036000);
 close(p.ebitda,5082894500);close(p.savings.ebitda,p.ebitda);
 close(p.savings.grossCostSavings+p.savings.revenueContribution-p.savings.recurringOpex-p.savings.implementationExpense,p.ebitda);
 close(p.savings.quarters.reduce((s,q)=>s+q.ebitda,0),p.ebitda);
 assert.ok(p.investment<=p.scenario.budget);assert.ok(p.effort<=p.scenario.capacity);
 assert.equal(p.evaluated,32768);assert.equal(p.ids.length,13);
 assert.ok(p.ids.includes('global-foundation'));assert.ok(p.ids.includes('global-labor'));
 assert.ok(!p.ids.includes('global-automation'));assert.ok(!p.ids.includes('global-collections'));
});
test('Bottom-up expense removal: no adoption or no conversion earns no gross saving',()=>{
 const base=buildEnterprise(definition), cloud=base.items.find(i=>i.id==='global-cloud');
 close(cloud.annualBenefit,8e9*.15*.9);
 for(const field of ['coverage','expenseConversion','rate']){
  const e=buildEnterprise(definition,{levers:{'global-cloud':{[field]:0}}});
  const i=e.items.find(i=>i.id==='global-cloud');assert.equal(i.annualBenefit,0);
  assert.ok(forecast(i,e.scenario).ebitda<0);
 }
});
test('Revenue and existing receivables never inflate the cost-savings subtotal',()=>{
 const e=buildEnterprise(definition), ids=['global-revenue','global-collections'];
 const p=portfolio(e.items,ids,e.scenario), b=savingsBridge(e.items,p);
 assert.equal(b.netCostSavings,0);assert.equal(b.recurringNetCostSavings,0);
 assert.ok(b.revenueContribution>0);assert.ok(b.workingCapitalRelease>0);
 close(b.ebitda,p.ebitda);close(p.cash,p.ebitda-b.capex+b.workingCapitalRelease);
});
test('Unique spend does not double count the automation and labor alternatives',()=>{
 const e=buildEnterprise(definition);assert.equal(e.addressableCost,108e9);
 const invalid=selectionIssues(e.items,['global-foundation','global-labor','global-automation'],{budget:1e9,capacity:2000});
 assert.ok(invalid.some(s=>s.includes('Overlapping benefit pool')));
 const bad=structuredClone(definition);bad.find(i=>i.id==='global-automation').exclusiveGroup=null;
 assert.throws(()=>buildEnterprise(bad),/Shared spend pools/);
});
test('Footprint scaling preserves per-location unit economics and includes investment',()=>{
 const a=enterpriseCase(definition), b=enterpriseCase(definition,{sites:500});
 close(b.savings.netCostSavings,a.savings.netCostSavings/2);close(b.investment,a.investment/2);
 close(b.enterprise.addressableCost,54e9);assert.deepEqual(b.ids,a.ids);
});
test('Underwriting rejects impossible savings rates, unknown levers and invalid locations',()=>{
 for(const assumptions of [{sites:0},{sites:100.5},{sites:5001},{levers:{unknown:{rate:.1}}},
  {levers:{'global-cloud':{rate:.51}}},{levers:{'global-cloud':{coverage:1.1}}},
  {levers:{'global-cloud':{expenseConversion:-1}}},{levers:{'global-cloud':{annualBenefit:1e12}}}])
   assert.throws(()=>buildEnterprise(definition,assumptions),RangeError);
});
test('No implementation budget selects no savings; delayed adoption reduces the same portfolio',()=>{
 const empty=enterpriseCase(definition,{}, {budget:0});assert.deepEqual(empty.ids,[]);assert.equal(empty.savings.netCostSavings,0);
 const p=enterpriseCase(definition), delayed=enterpriseCase(definition,{}, {delay:3},p.ids);
 assert.ok(delayed.savings.netCostSavings<p.savings.netCostSavings);
 const zero=enterpriseCase(definition,{}, {realization:0});assert.deepEqual(zero.ids,[]);
});
