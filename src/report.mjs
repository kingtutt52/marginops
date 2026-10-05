import {readFile} from 'node:fs/promises';
import {optimize,simulate} from './engine.mjs';
const items = JSON.parse(await readFile(new URL('../data/initiatives.json',import.meta.url)));
const result = optimize(items);
console.log(JSON.stringify({...result,uncertainty:simulate(items,result.ids)},null,2));
