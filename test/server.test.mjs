import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from '../src/server.mjs';
import {once} from 'node:events';
test('HTTP API validates requests, isolates source files, and serves consistent results',async t=>{
 const server=createServer();server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);}));
 const base=`http://127.0.0.1:${server.address().port}`;
 let r=await fetch(base+'/api/health');assert.equal(r.status,200);assert.equal((await r.json()).mode,'synthetic-demo');
 r=await fetch(base+'/api/optimize',{method:'POST',body:JSON.stringify({scenario:{budget:600000}})});const p=await r.json();assert.equal(r.status,200);assert.equal(p.feasible,true);assert.ok(p.ebitda>0);
 r=await fetch(base+'/api/evaluate',{method:'POST',body:JSON.stringify({ids:p.ids})});assert.equal((await r.json()).ebitda,p.ebitda);
 r=await fetch(base+'/api/evaluate',{method:'POST',body:'{"ids":["unknown"]}'});assert.equal(r.status,400);
 r=await fetch(base+'/api/optimize',{method:'POST',body:'{"scenario":{"budget":-1}}'});assert.equal(r.status,400);
 r=await fetch(base+'/api/optimize',{method:'POST',body:'invalid'});assert.equal(r.status,400);
 r=await fetch(base+'/api/optimize',{method:'POST',body:'x'.repeat(70000)});assert.equal(r.status,413);
 r=await fetch(base+'/.git/config');assert.equal(r.status,404);
 r=await fetch(base+'/');assert.equal(r.status,200);assert.match(r.headers.get('content-security-policy'),/frame-ancestors 'none'/);assert.match(await r.text(),/MarginOps/);
});
test('Enterprise API exports reconciled assumptions and validates savings controls',async t=>{
 const server=createServer();server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);}));
 const base=`http://127.0.0.1:${server.address().port}`;
 const post=payload=>fetch(base+'/api/optimize',{method:'POST',body:JSON.stringify(payload)});
 let r=await fetch(base+'/api/enterprise');assert.equal(r.status,200);assert.equal((await r.json()).addressableCost,108e9);
 r=await post({profile:'enterprise'});const p=await r.json();assert.equal(r.status,200);assert.equal(p.claimStatus,'synthetic-model-only');assert.ok(p.savings.netCostSavings>5e9);assert.equal(p.underwriting.length,15);
 r=await fetch(base+'/api/evaluate',{method:'POST',body:JSON.stringify({profile:'enterprise',ids:p.ids})});assert.equal((await r.json()).ebitda,p.ebitda);
 r=await post({profile:'enterprise',enterprise:{sites:500}});assert.ok(Math.abs((await r.json()).savings.netCostSavings-p.savings.netCostSavings/2)<1);
 r=await post({profile:'enterprise',enterprise:{levers:{'global-cloud':{rate:5}}}});assert.equal(r.status,400);
 r=await post({profile:'invented'});assert.equal(r.status,400);
 for(const route of ['/src/enterprise.mjs','/data/enterprise.json'])assert.equal((await fetch(base+route)).status,200);
});
