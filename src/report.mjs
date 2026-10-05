import {readFile} from 'node:fs/promises';
import {enterpriseCase} from './enterprise.mjs';
import {optimize,simulate} from './engine.mjs';
const profile=process.argv.includes('--midmarket')?'midmarket':'enterprise';
const items=JSON.parse(await readFile(new URL(`../data/${profile==='enterprise'?'enterprise':'initiatives'}.json`,import.meta.url)));
const result=profile==='enterprise'?enterpriseCase(items):optimize(items);
console.log(JSON.stringify(profile==='enterprise'?result:{...result,uncertainty:simulate(items,result.ids)},null,2));
