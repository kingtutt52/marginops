import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {forecast,optimize,portfolio,simulate,selectionIssues,reconcileLedger,validateInitiatives} from '../src/engine.mjs';
const fixture=(overrides={})=>({id:'example',name:'Example',kind:'cost',annualBenefit:120000,contributionMargin:1,annualOpex:12000,implementationExpense:10000,capex:20000,cashRelease:0,probability:1,startMonth:1,rampMonths:1,effort:1,dependencies:[],exclusiveGroup:null,...overrides});
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
test('capex affects cash but not EBITDA; recurring and implementation expense affect both',()=>{
 const f=forecast(fixture()); close(f.ebitda,98000);close(f.cash,78000);close(f.runRate,108000);assert.equal(f.paybackMonth,4);
});
test('incremental revenue contributes only its margin',()=>{const f=forecast(fixture({kind:'revenue',contributionMargin:.4}));close(f.ebitda,26000);});
test('working capital releases cash once and never boosts EBITDA',()=>{const f=forecast(fixture({kind:'working-capital',annualBenefit:0,cashRelease:50000}));close(f.ebitda,-22000);close(f.cash,8000);close(f.monthly.reduce((a,m)=>a+m.cashRelease,0),50000);});
test('failure probability weights benefit; committed costs still occur',()=>{const f=forecast(fixture({probability:0}));close(f.ebitda,-22000);close(f.cash,-42000);assert.equal(f.paybackMonth,null);});
test('launch delay and ramp affect the actual forecast horizon',()=>{const f=forecast(fixture({startMonth:2,rampMonths:2}),{delay:1,months:4});assert.deepEqual(f.monthly.map(m=>m.benefit),[0,0,5000,10000]);close(f.ebitda,3000);});
test('investment commits even if launch is outside the horizon',()=>{const f=forecast(fixture({startMonth:20}));close(f.ebitda,-10000);close(f.cash,-30000);});
test('optimizer enforces both budget and delivery capacity',()=>{
 const a=fixture({id:'a',implementationExpense:20,capex:0,effort:2}),b=fixture({id:'b',implementationExpense:30,capex:0,effort:2,annualBenefit:180000});
 assert.deepEqual(optimize([a,b],{budget:30,capacity:2}).ids,['b']);assert.deepEqual(optimize([a,b],{budget:0}).ids,[]);
});
test('a negative-value prerequisite can enable the optimal combined package',()=>{
 const foundation=fixture({id:'foundation',annualBenefit:0,annualOpex:0,implementationExpense:10000,capex:0});
 const dependent=fixture({id:'dependent',dependencies:['foundation'],implementationExpense:0,capex:0});
 assert.deepEqual(optimize([foundation,dependent]).ids,['foundation','dependent']);
 assert.match(selectionIssues([foundation,dependent],['dependent']).join(),/dependency/);
});
test('overlapping benefit pools are mutually exclusive',()=>{
 const a=fixture({id:'a',exclusiveGroup:'labor'}),b=fixture({id:'b',exclusiveGroup:'labor',annualBenefit:200000});
 assert.deepEqual(optimize([a,b]).ids,['b']); assert.equal(portfolio([a,b],['a','b']).feasible,false);
});
test('do-nothing wins when every investment destroys EBITDA',()=>assert.deepEqual(optimize([fixture({annualBenefit:0})]).ids,[]));
test('ties favor lower committed investment',()=>{const a=fixture({id:'a',capex:0}),b=fixture({id:'b',exclusiveGroup:null,capex:90000});assert.deepEqual(optimize([a,b],{capacity:1}).ids,['a']);});
test('invalid numbers, dependency cycles, and duplicate IDs are rejected',()=>{
 for(const overrides of [{probability:1.2},{annualBenefit:NaN},{capex:-1},{startMonth:1.5},{kind:'working-capital',annualBenefit:1}])assert.throws(()=>forecast(fixture(overrides)),RangeError);
 assert.throws(()=>validateInitiatives([fixture(),fixture()]),/unique/);
 assert.throws(()=>validateInitiatives([fixture({id:'a',dependencies:['b']}),fixture({id:'b',dependencies:['a']})]),/Cyclic/);
 assert.throws(()=>validateInitiatives([fixture({dependencies:['absent']})]),/Missing/);
 assert.throws(()=>forecast(fixture(),{realization:-.1}),RangeError);
 assert.throws(()=>portfolio([fixture()],['unknown']),/Unknown/);
 assert.throws(()=>portfolio([fixture()],['example','example']),/unique/);
});
test('simulation is seeded and converges toward deterministic expectation',()=>{
 const items=[fixture({probability:.7}),fixture({id:'b',probability:.5})], ids=items.map(i=>i.id);
 const a=simulate(items,ids,{}, {runs:10000,seed:52}), b=simulate(items,ids,{}, {runs:10000,seed:52});assert.deepEqual(a,b);
 const expected=portfolio(items,ids).ebitda;assert.ok(Math.abs(a.mean-expected)<3000);
 assert.ok(a.p10<=a.p50&&a.p50<=a.p90);assert.equal(a.histogram.reduce((s,h)=>s+h.count,0),10000);
});
test('simulation costs cannot disappear on a failed initiative',()=>{const u=simulate([fixture({probability:0})],['example']);close(u.p10,-22000);close(u.p90,-22000);assert.equal(u.probabilityPositive,0);});
test('empty portfolios have zero impact and no positive probability',()=>{const p=optimize([]),s=simulate([],[]);assert.equal(p.ebitda,0);assert.equal(s.p50,0);assert.equal(s.probabilityPositive,0);});
const entry=(overrides={})=>({initiativeId:'example',period:'2026-09',benefitPool:'labor',observedBenefit:10000,counterfactualBenefit:2000,incrementalOpex:1000,implementationExpense:1000,status:'approved',reviewer:'Controller',approvedAt:'2026-10-02',evidenceRef:'EX-001',...overrides});
test('ledger only recognizes approved net attributable benefit',()=>{const result=reconcileLedger([entry(),entry({period:'2026-10',status:'pending'}),entry({period:'2026-11',status:'rejected'})]);assert.equal(result.recognized,6000);assert.equal(result.pending,1);});
test('ledger rejects duplicate claims and missing evidence',()=>{assert.throws(()=>reconcileLedger([entry(),entry({initiativeId:'other'})]),/Duplicate/);assert.throws(()=>reconcileLedger([entry({evidenceRef:''})]),/evidence/);});
test('ledger retains negative outcomes instead of clipping losses',()=>assert.equal(reconcileLedger([entry({observedBenefit:0})]).recognized,-4000));
test('synthetic optimizer agrees with an independently constructed feasible subset oracle',async()=>{
 const items=JSON.parse(await readFile(new URL('../data/initiatives.json',import.meta.url)));
 for(const budget of [0,200000,600000,1200000]){
  const s={budget,capacity:24}; const result=optimize(items,s);let expected=0;
  for(let m=0;m<2**items.length;m++){
   const chosen=items.filter((_,k)=>m&2**k), ids=chosen.map(i=>i.id);
   if(chosen.reduce((a,i)=>a+i.capex+i.implementationExpense,0)>budget||chosen.reduce((a,i)=>a+i.effort,0)>24)continue;
   if(chosen.some(i=>i.dependencies.some(d=>!ids.includes(d))))continue;
   const groups=chosen.map(i=>i.exclusiveGroup).filter(Boolean);if(new Set(groups).size!==groups.length)continue;
   let value=0;
   for(const i of chosen){value-=i.implementationExpense;for(let month=1;month<=12;month++){if(month<i.startMonth)continue;value-=i.annualOpex/12;value+=i.annualBenefit*(i.kind==='revenue'?i.contributionMargin:i.kind==='working-capital'?0:1)/12*i.probability*Math.min(1,(month-i.startMonth+1)/i.rampMonths);}}
   expected=Math.max(expected,value);
  }
  close(result.ebitda,expected);assert.equal(result.feasible,true);
 }
});
