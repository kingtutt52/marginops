// Optional: npm install --no-save --package-lock=false playwright && npx playwright install chromium
// Run: node scripts/browser-smoke.mjs
import {createRequire} from 'node:module';
import {mkdir,readFile} from 'node:fs/promises';
import {once} from 'node:events';
import assert from 'node:assert/strict';
import {createServer} from '../src/server.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright');
const server=createServer();let browser;
try{
 server.listen(0,'127.0.0.1');await once(server,'listening');
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1512,height:1150}});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}`);await page.locator('.metric-value').first().waitFor();
 assert.equal(await page.locator('.metric-value').first().textContent(),'$5.08B');
 await mkdir('output',{recursive:true});await page.screenshot({path:'output/dashboard.png',fullPage:true});
 await page.selectOption('#preset','downside');assert.notEqual(await page.locator('.metric-value').first().textContent(),'$5.08B');
 await page.click('#reset');await page.click('[data-view=drivers]');
 await page.locator('[data-lever=global-cloud][data-field=rate]').fill('0');await page.locator('[data-lever=global-cloud][data-field=rate]').press('Tab');
 assert.notEqual(await page.locator('.metric-value').first().textContent(),'$5.08B');
 await page.click('#reset');await page.locator('#sites').fill('500');await page.locator('#sites').press('Tab');
 assert.equal(await page.locator('.metric-value').first().textContent(),'$2.54B');
 await page.selectOption('#profile','midmarket');assert.equal(await page.locator('.metric-value').first().textContent(),'$2.39M');
 await page.click('[data-view=initiatives]');await page.fill('#search','receivables');
 await page.check('[data-select=collections]');await page.click('[data-detail=collections]');await page.locator('#detail[open]').waitFor();await page.click('#close-detail');
 await page.fill('#search','');await page.locator('#budget').fill('0');await page.locator('#error:not([hidden])').waitFor();
 await page.click('#optimize');assert.equal(await page.locator('.metric-value').first().textContent(),'$0');
 await page.click('[data-view=ledger]');assert.match(await page.locator('#ledger-summary').innerText(),/139K/);
 await page.click('[data-view=methodology]');await page.locator('#methodology-view:not([hidden])').waitFor();
 await page.click('#reset');await page.click('[data-view=overview]');
 const downloadPromise=page.waitForEvent('download');await page.click('#export');const download=await downloadPromise;await download.saveAs('output/investment-memo.md');assert.match(await readFile('output/investment-memo.md','utf8'),/Investment Committee/);
 await page.selectOption('#profile','enterprise');
 const underwritingDownload=page.waitForEvent('download');await page.click('#export-assumptions');
 const underwriting=await underwritingDownload;await underwriting.saveAs('output/underwriting.json');
 const json=JSON.parse(await readFile('output/underwriting.json','utf8'));assert.equal(json.claimStatus,'synthetic-model-only');assert.ok(json.savings.netCostSavings>2e9);
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'output/mobile.png',fullPage:true});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false);
 assert.deepEqual(errors,[]);console.log('Browser smoke checks passed; review output screenshots.');
}finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
