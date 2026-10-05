import {optimize, portfolio, simulate, forecast, reconcileLedger, upfront, MODEL_VERSION} from '/src/engine.mjs';
import {buildEnterprise, savingsBridge, ENTERPRISE} from '/src/enterprise.mjs';
const $ = id => document.getElementById(id);
const esc = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = n => `${n<0?'−':''}$${Math.abs(n)>=1e9?(Math.abs(n)/1e9).toFixed(2)+'B':Math.abs(n)>=1e6?(Math.abs(n)/1e6).toFixed(2)+'M':Math.abs(n)>=1000?Math.round(Math.abs(n)/1000).toLocaleString()+'K':Math.round(Math.abs(n)).toLocaleString()}`;
const dollars = n => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
const pct = n => `${+(n*100).toFixed(2)}%`;
function markCustom(){const v=$('preset');if(!v.querySelector('[value="custom"]'))v.add(new Option('Custom case','custom'));v.value='custom';}
let items, midmarket, definition, enterprise, ledger, result, uncertainty, selected = [], mode = 'optimized', overrides = {};
const isEnterprise = () => $('profile').value === 'enterprise';
function configureProfile(reset = true) {
 enterprise=buildEnterprise(definition,{sites:+$('sites').value,levers:overrides});
 items=isEnterprise()?enterprise.items:midmarket;
 const scale=isEnterprise()?enterprise.scale:1;
 $('sites').disabled=!isEnterprise();
 $('workspace-name').textContent=isEnterprise()?'Meridian Global':'Meridian operating group';
 const ranges=isEnterprise()?{budget:[0,1800e6*scale,25e6*scale,900e6*scale],capacity:[0,2200*scale,5*scale,1600*scale]}:{budget:[0,1200000,25000,600000],capacity:[0,40,1,24]};
 for(const [id,v] of Object.entries(ranges)){const el=$(id);el.min=v[0];el.max=v[1];el.step=v[2];if(reset)el.value=v[3];}
 if(reset){$('preset').value='base';$('realization').value=100;$('delay').value=0;mode='optimized';}
 $('scope-summary').textContent=isEnterprise()?`${enterprise.sites.toLocaleString()} locations · ${money(enterprise.addressableCost)} unique annual cost exposure · ${money(enterprise.revenue)} revenue`: '10 initiatives · operating group demonstration';
}

const scenario = () => ({budget:+$('budget').value,capacity:+$('capacity').value,realization:+$('realization').value/100,delay:+$('delay').value,months:12});
function updateLabels() {
  const s=scenario(); $('budget-value').textContent=money(s.budget); $('capacity-value').textContent=`${Math.round(s.capacity).toLocaleString()} team-months`;
  $('realization-value').textContent=pct(s.realization); $('delay-value').textContent=`${s.delay} month${s.delay===1?'':'s'}`;
}
function recalculate(reoptimize = false) {
  updateLabels(); const s=scenario();
  if(reoptimize){result=optimize(items,s); selected=result.ids; mode='optimized';}
  else result=portfolio(items,selected,s);
  uncertainty=simulate(items,selected,s);
  $('error').hidden=result.feasible;
  $('error').textContent=result.issues.join(' · ');
  $('selection-status').textContent=`${mode==='optimized'?'Optimal for current assumptions':'Custom portfolio'} · ${selected.length} initiatives · ${result.effort}/${s.capacity} team-months${result.evaluated?' · '+result.evaluated.toLocaleString()+' combinations evaluated':''}`;
  renderSavings(); renderDrivers(); renderMetrics(); renderBridge(); renderDistribution(); renderTimeline(); renderInsights(); renderTable();
}
function renderSavings(){
 const b=savingsBridge(items,result);
 const cards=[['Year 1 net cost savings',b.netCostSavings],['Recurring net cost savings',b.recurringNetCostSavings],['Year 1 total EBITDA impact',result.ebitda],['One-time cash release',b.workingCapitalRelease]];
 $('savings-summary').innerHTML=`<div class="savings-heading"><span class="eyebrow">SAVINGS ≠ REVENUE ≠ CASH</span><span class="pill">Modeled · unverified</span></div><div class="savings-grid">${cards.map(([label,value])=>`<div><span>${label}</span><strong>${money(value)}</strong></div>`).join('')}</div><p class="chart-note">Cost savings include cost-initiative operating and implementation expenses, including the data foundation. Total EBITDA also includes revenue contribution and other initiative costs. Recurring values assume full ramp and exclude upfront expense.</p>`;
}
function renderDrivers(){
 $('driver-summary').textContent=isEnterprise()?`${money(enterprise.addressableCost)} unique annual expense across ${enterprise.sites.toLocaleString()} illustrative locations. Labor alternatives share one pool. Revenue exposure is separate.`:'Choose Global enterprise above to edit the bottom-up savings drivers.';
 $('driver-table').innerHTML=isEnterprise()?items.map(i=>`<tr><td><strong>${esc(i.name)}</strong><small>${esc(i.pool)} · ${esc(i.kind)}${i.exclusiveGroup?' · alternative':''}</small></td><td>${money(i.spend)}</td>${['rate','coverage','expenseConversion'].map(field=>`<td><input type="number" min="0" max="${field==='rate'?50:100}" step="0.1" value="${+(i[field]*100).toFixed(2)}" data-lever="${i.id}" data-field="${field}" aria-label="${esc(i.name)} ${field}" ${i.spend===0?'disabled':''}></td>`).join('')}<td>${money(i.annualBenefit)}</td></tr>`).join(''):'';
}
function exportUnderwriting(){
 const snapshot={modelVersion:MODEL_VERSION,claimStatus:'synthetic-model-only',profile:$('profile').value,
  scenario:scenario(),enterprise:isEnterprise()?{sites:enterprise.sites,addressableCost:enterprise.addressableCost,baselineEbitda:enterprise.baselineEbitda}:null,
  assumptions:isEnterprise()?{sites:enterprise.sites,levers:overrides}:{},items,selected,result,
  savings:savingsBridge(items,result),uncertainty,historicalLedger:{period:'2026-09',synthetic:true,recognized:ledger.recognized},
  boundaries:'Forecast only. No validated savings. Replace assumptions with finance-controlled baselines. Scale assumes comparable sites; percentages are not industry benchmarks.'};
 const url=URL.createObjectURL(new Blob([JSON.stringify(snapshot,null,2)+'\n'],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download='marginops-underwriting.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function renderMetrics(){
 const cards=[['Expected incremental EBITDA',money(result.ebitda),'Year 1 · costs and probability included','↗'],['Steady-state annual impact',money(result.runRate),'Annualized · after full ramp','↗'],['Upfront investment',money(result.investment),`${pct(scenario().budget?result.investment/scenario().budget:0)} of implementation budget`,'◈'],['Modeled cash payback',result.paybackMonth?`Month ${result.paybackMonth}`:'—',result.investment===0?'No upfront investment':'First recovery within 12-month horizon','◷']];
 $('metrics').innerHTML=cards.map(([label,value,foot,icon])=>`<article class="metric"><div class="metric-label">${label}<span aria-hidden="true">${icon}</span></div><div class="metric-value">${value}</div><div class="metric-foot">${foot}</div></article>`).join('');
}
function renderBridge(){
 const base=isEnterprise()?enterprise.baselineEbitda:8000000; $('baseline-note').textContent=`Illustrative ${money(base)} baseline + selected initiatives. Costs included. Baseline does not drive selection.`; const chosen=items.filter(i=>selected.includes(i.id));
 const groups=[...new Set(items.map(i=>i.category))].map(name=>({name,value:chosen.filter(i=>i.category===name).reduce((a,i)=>a+forecast(i,scenario()).ebitda,0)})).filter(x=>x.value!==0);
 let cumulative=base; const rows=[{name:'Baseline EBITDA',value:base,start:0,total:true}];
 for(const g of groups){rows.push({...g,start:Math.min(cumulative,cumulative+g.value)});cumulative+=g.value;}
 rows.push({name:'Projected EBITDA',value:cumulative,start:0,total:true});
 const extent=Math.max(base,...rows.map(r=>r.start+Math.abs(r.value)),1);
 $('bridge').innerHTML=rows.map(r=>`<div class="bridge-row"><span class="bridge-label">${esc(r.name)}</span><div class="bridge-track"><div class="bridge-bar ${r.total?'total':r.value<0?'negative':''}" style="left:${r.start/extent*100}%;width:${Math.abs(r.value)/extent*100}%" title="${esc(dollars(r.value))}"></div></div><span class="bridge-number">${!r.total&&r.value>0?'+':''}${money(r.value)}</span></div>`).join('');
}
function renderDistribution(){
 const u=uncertainty, max=Math.max(...u.histogram.map(h=>h.count),1);
 $('distribution').innerHTML=`<div class="risk-main"><div><strong>${(u.probabilityPositive*100).toFixed(2)}%</strong><br><span>modeled probability of positive EBITDA impact</span></div><span>Year 1</span></div><div class="histogram" role="img" aria-label="Simulated EBITDA distribution; 10th percentile ${esc(dollars(u.p10))}, median ${esc(dollars(u.p50))}, 90th percentile ${esc(dollars(u.p90))}">${u.histogram.map(h=>`<div style="height:${h.count/max*100}%" title="${esc(money(h.low))} to ${esc(money(h.high))}: ${h.count} runs"></div>`).join('')}</div><div class="percentiles">${[['P10 · DOWNSIDE',u.p10],['P50 · MEDIAN',u.p50],['P90 · UPSIDE',u.p90]].map(([label,value])=>`<div><span>${label}</span><strong>${money(value)}</strong></div>`).join('')}</div>`;
}
function renderTimeline(){
 const months=result.monthly; const w=640,h=215,left=55,right=15,top=14,bottom=35;
 const low=Math.min(0,...months.flatMap(m=>[m.ebitda,m.cash]));const high=Math.max(1,...months.flatMap(m=>[m.ebitda,m.cash]));
 const y=v=>top+(high-v)/(high-low)*(h-top-bottom),x=k=>left+k/11*(w-left-right);
 const line=key=>months.map((m,k)=>`${x(k)},${y(m[key])}`).join(' ');
 $('timeline').innerHTML=`<svg class="timeline-svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="Monthly expected EBITDA and modeled net cash; initial investment precedes the benefit ramp">${Array.from({length:4},(_,k)=>{const v=low+(high-low)*k/3;return `<line x1="${left}" x2="${w-right}" y1="${y(v)}" y2="${y(v)}" stroke="#e6ece4" stroke-dasharray="3 4"/><text x="${left-10}" y="${y(v)+4}" text-anchor="end" fill="#859387" font-size="10">${money(v)}</text>`;}).join('')}<line x1="${left}" x2="${w-right}" y1="${y(0)}" y2="${y(0)}" stroke="#b1bfb0"/><polyline points="${line('cash')}" fill="none" stroke="#d8ae59" stroke-width="2.5" stroke-dasharray="5 4"/><polyline points="${line('ebitda')}" fill="none" stroke="#147a59" stroke-width="2.5"/>${months.map((m,k)=>`<circle cx="${x(k)}" cy="${y(m.ebitda)}" r="3" fill="#147a59"><title>Month ${m.month}: EBITDA ${dollars(m.ebitda)}; cash ${dollars(m.cash)}</title></circle><text x="${x(k)}" y="${h-12}" fill="#859387" font-size="10" text-anchor="middle">M${m.month}</text>`).join('')}</svg>`;
}
function renderInsights(){
 const ranked=[...result.forecasts].sort((a,b)=>b.ebitda-a.ebitda);const best=items.find(i=>i.id===ranked[0]?.id);
 const insights=[
  [best?`${best.name} leads the portfolio.`:'No positive feasible portfolio selected.',best?`${money(ranked[0].ebitda)} expected Year 1 EBITDA. ${best.guardrail}`:'Increase budget or capacity, or adjust the realization assumptions to explore alternatives.'],
  ['Risk remains visible.',`The modeled P10 is ${money(uncertainty.p10)} versus ${money(result.ebitda)} expected. Implementation expenses and recurring costs remain even when benefits fail.`],
  ['Forecast value requires proof.',`${money(ledger.recognized)} finance-approved in the synthetic September ledger. Historical recognized value is separate from the forward forecast.`]
 ];
 $('insights').innerHTML=insights.map(([title,body],k)=>`<div class="insight"><span class="insight-index">0${k+1}</span><div><strong>${esc(title)}</strong><p>${esc(body)}</p></div></div>`).join('');
}
function renderTable(){
 const term=$('search').value.toLowerCase();
 $('initiative-table').innerHTML=items.filter(i=>`${i.name} ${i.category} ${i.owner}`.toLowerCase().includes(term)).map(i=>{const f=forecast(i,scenario());return `<tr class="${selected.includes(i.id)?'chosen':''}"><td><input type="checkbox" data-select="${i.id}" aria-label="Include ${esc(i.name)}" ${selected.includes(i.id)?'checked':''}></td><td><strong>${esc(i.name)}</strong><small>${esc(i.owner)}</small></td><td class="${f.ebitda>=0?'positive':'negative-text'}">${money(f.ebitda)}</td><td>${money(upfront(i))}</td><td>${pct(i.probability)}</td><td>${i.effort} mo</td><td><button class="details-button" data-detail="${i.id}">Inspect ↗</button></td></tr>`;}).join('');
 if(!$('initiative-table').children.length)$('initiative-table').innerHTML='<tr><td colspan="7">No matching initiatives.</td></tr>';
}
function renderLedger(){
 $('ledger-summary').innerHTML=`${money(ledger.recognized)}<span>Recognized incremental EBITDA · ${ledger.pending} pending review · September 2026</span>`;
 $('ledger-table').innerHTML=ledger.rows.map(e=>`<tr><td><strong>${esc(midmarket.find(i=>i.id===e.initiativeId)?.name??e.initiativeId)}</strong><small>${esc(e.evidenceRef)} · ${esc(e.benefitPool)}</small></td><td>${money(e.observedBenefit)}</td><td>${money(e.counterfactualBenefit)}</td><td>${money(e.incrementalOpex+e.implementationExpense)}</td><td><span class="badge ${e.status}">${e.status}</span></td><td class="positive">${money(e.recognized)}</td></tr>`).join('');
}
function showDetail(id){
 const i=items.find(x=>x.id===id), f=forecast(i,scenario());
 const fields=[...(i.assumptions?[['Addressable annual exposure',dollars(i.spend)],['Rate × adoption × expense conversion',`${pct(i.rate)} × ${pct(i.coverage)} × ${pct(i.expenseConversion)}`]]:[]),['Annual gross benefit input',dollars(i.annualBenefit)],['Contribution margin',pct(i.contributionMargin)],['Annual recurring opex',dollars(i.annualOpex)],['Implementation expense',dollars(i.implementationExpense)],['Capital expenditure',dollars(i.capex)],['One-time cash release',dollars(i.cashRelease)],['Launch / ramp',`Month ${i.startMonth} / ${i.rampMonths} months`],['Year 1 expected EBITDA',dollars(f.ebitda)]];
 $('detail-body').innerHTML=`<span class="eyebrow">${esc(i.category)} · ${esc(i.kind)}</span><h2>${esc(i.name)}</h2><div class="detail-grid">${fields.map(([label,value])=>`<div><span>${label}</span><strong>${esc(value)}</strong></div>`).join('')}</div><div class="detail-text"><b>Value driver</b>${esc(i.driver)}</div><div class="detail-text"><b>Evidence required</b>${esc(i.evidence)}</div><div class="detail-text"><b>Recognition guardrail</b>${esc(i.guardrail)}</div><div class="detail-text"><b>Portfolio constraints</b>Dependency: ${esc(i.dependencies.join(', ')||'None')} · Shared benefit pool: ${esc(i.exclusiveGroup||'None')}</div>`;
 $('detail').showModal();
}
function exportMemo(){
 const s=scenario(); const lines=[`# MarginOps — Investment Committee Memo`,'',`Model ${MODEL_VERSION} | Synthetic demonstration | ${new Date().toISOString()}`,'',`## Decision`,`${result.feasible?'Feasible':'INFEASIBLE — resolve constraints before approval'} ${mode} portfolio: ${selected.length} initiatives.`,...result.issues.map(i=>`- ${i}`),'',`## Financial case`,`- Expected 12-month incremental EBITDA: ${dollars(result.ebitda)}`,`- Steady-state annualized impact: ${dollars(result.runRate)}`,`- Upfront expense + capex: ${dollars(result.investment)}`,`- Modeled 12-month pre-tax incremental cash: ${dollars(result.cash)}`,`- First cash recovery: ${result.paybackMonth?'month '+result.paybackMonth:'not reached / no upfront investment'}`,`- Simulated EBITDA P10 / P50 / P90: ${dollars(uncertainty.p10)} / ${dollars(uncertainty.p50)} / ${dollars(uncertainty.p90)}`,'',`## Assumptions`,`- Profile: ${isEnterprise()?'Global enterprise (synthetic)':'Mid-market (synthetic)'}.`,...(isEnterprise()?[`- Locations: ${enterprise.sites}; unique annual cost exposure: ${dollars(enterprise.addressableCost)}.`,`- Bottom-up rates are synthetic; this model does not establish realizable or realized savings.`]:[]),`- Budget: ${dollars(s.budget)}; capacity: ${s.capacity} team-months.`,`- Benefit realization: ${pct(s.realization)}; launch delay: ${s.delay} months.`,`- Seed: ${uncertainty.seed}; simulations: ${uncertainty.runs}; independent success events and a shared uniform 0.8–1.2 magnitude shock.`,'',`## Selected initiatives`,`| Initiative | Expected Year 1 EBITDA | Upfront investment | Evidence |`,`|---|---:|---:|---|`,...items.filter(i=>selected.includes(i.id)).map(i=>`| ${i.name} | ${dollars(forecast(i,s).ebitda)} | ${dollars(upfront(i))} | ${i.evidence} |`),'',`## Approval gates`,'Confirm baseline and contribution margin with Finance; validate expense removal with source records; check benefit-pool exclusivity and prerequisite readiness; assign owners and review service-level risks.','',`## Boundaries`,'All data is synthetic. This is a deterministic decision-support prototype, not a realized-return claim. Costs remain when initiatives fail. Working capital changes cash only. Capex is excluded from EBITDA. Cash assumes operating accruals equal cash and excludes tax and financing. Simulation omits conditional failure of dependent initiatives. Approval metadata is not an authenticated control.','',`## Historical evidence (separate period)`,`${dollars(ledger.recognized)} recognized in the synthetic September 2026 ledger; not added to the forecast.`];
 if(isEnterprise()){const b=savingsBridge(items,result);lines.push('', '## Savings versus earnings bridge',`- Year 1 net cost savings, including cost-program overhead: ${dollars(b.netCostSavings)}`,`- Recurring expected net cost savings after full ramp: ${dollars(b.recurringNetCostSavings)}`,`- Gross Year 1 revenue contribution (not cost savings): ${dollars(b.revenueContribution)}`,`- One-time working capital release (cash only): ${dollars(b.workingCapitalRelease)}`,'','## Bottom-up underwriting','| Lever | Exposure | Rate | Adoption | Expense conversion | Gross annual input |','|---|---:|---:|---:|---:|---:|',...items.filter(i=>selected.includes(i.id)).map(i=>`| ${i.name} | ${dollars(i.spend)} | ${pct(i.rate)} | ${pct(i.coverage)} | ${pct(i.expenseConversion)} | ${dollars(i.annualBenefit)} |`));}
 const blob=new Blob([lines.join('\n')+'\n'],{type:'text/markdown'}), url=URL.createObjectURL(blob), a=document.createElement('a');a.href=url;a.download='marginops-investment-memo.md';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
const titles={drivers:['Underwrite billions.<br>Prove every dollar.','Spend pools, adoption, expense removal and rollout economics.'],overview:['Enterprise scale.<br>Evidence at every dollar.','Build the portfolio. Challenge the assumptions. Prove the value.'],initiatives:['Capital is finite.<br>Choose the highest impact.','Inspect every business case, constraint and evidence requirement.'],ledger:['Value claimed.<br>Value verified.','A financial result earns its place through evidence and review.'],methodology:['No black box.<br>Every assumption exposed.','Read the financial rules, optimization logic and model limitations.']};
function switchView(view){if(!titles[view])view='overview';document.querySelectorAll('.view').forEach(e=>e.hidden=e.id!==`${view}-view`);document.querySelectorAll('[data-view]').forEach(e=>{e.classList.toggle('active',e.dataset.view===view);e.setAttribute('aria-current',e.dataset.view===view?'page':'false');});$('page-title').innerHTML=titles[view][0];$('page-subtitle').textContent=titles[view][1];}
async function init(){
 try{
  const responses=await Promise.all([fetch('/data/initiatives.json'),fetch('/data/ledger.json'),fetch('/data/enterprise.json')]);if(responses.some(r=>!r.ok))throw new Error('Demo data could not be loaded');
  const data=await Promise.all(responses.map(r=>r.json())); midmarket=data[0];definition=data[2];ledger=reconcileLedger(data[1]);configureProfile();
  recalculate(true);renderLedger();switchView(location.hash.slice(1)||'overview');
  for(const id of ['budget','capacity','realization','delay'])$(id).addEventListener('input',()=>{markCustom();recalculate(mode==='optimized');});
  $('optimize').addEventListener('click',()=>recalculate(true));
  $('preset').addEventListener('change',()=>{const factor=isEnterprise()?enterprise.scale:1;const presets=isEnterprise()?{base:[900e6,1600,100,0],downside:[650e6,1200,65,3],upside:[1200e6,2000,110,0]}:{base:[600000,24,100,0],downside:[600000,20,70,2],upside:[800000,30,115,0]};const values=presets[$('preset').value]?.map((n,k)=>k<2?n*factor:n);if(values){['budget','capacity','realization','delay'].forEach((id,k)=>$(id).value=values[k]);recalculate(true);}});
  $('reset').addEventListener('click',()=>{overrides={};configureProfile();$('preset').value='base';$('preset').dispatchEvent(new Event('change'));$('search').value='';renderTable();});
  $('profile').addEventListener('change',()=>{configureProfile();recalculate(true);});
  $('sites').addEventListener('change',()=>{try{configureProfile();recalculate(true);$('error').hidden=true;}catch(e){$('sites').value=enterprise.sites;$('error').hidden=false;$('error').textContent=e.message;}});
  $('driver-table').addEventListener('change',e=>{const {lever,field}=e.target.dataset;if(!lever)return;const value=+e.target.value/100, max=field==='rate' ? .5 : 1;if(!Number.isFinite(value)||value<0||value>max){renderDrivers();return;}overrides[lever]={...overrides[lever],[field]:value};configureProfile(false);markCustom();recalculate(mode==='optimized');});
  $('export-assumptions').addEventListener('click',exportUnderwriting);
  $('search').addEventListener('input',renderTable);
  $('initiative-table').addEventListener('change',e=>{if(e.target.dataset.select){mode='custom';const id=e.target.dataset.select;selected=e.target.checked?[...selected,id]:selected.filter(x=>x!==id);recalculate();}});
  $('initiative-table').addEventListener('click',e=>{if(e.target.dataset.detail)showDetail(e.target.dataset.detail);});
  $('close-detail').addEventListener('click',()=>$('detail').close());
  document.querySelectorAll('[data-view]').forEach(e=>e.addEventListener('click',()=>{location.hash=e.dataset.view;switchView(e.dataset.view);}));
  window.addEventListener('hashchange',()=>switchView(location.hash.slice(1)));
  $('export').addEventListener('click',exportMemo);
 }catch(e){$('error').hidden=false;$('error').textContent=`Unable to initialize MarginOps: ${e.message}`;}
}
init();
