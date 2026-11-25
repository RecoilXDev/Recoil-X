import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createCitySessions} from '../server/a1-city-sessions.mjs';
const source=readFileSync(new URL('../server/recoil-city.js',import.meta.url),'utf8');
const fn=source.match(/function retryDelay\(failures\)\{[^}]+\}/)[0];const delay=new Function(fn+';return retryDelay;')();
test('city request failures back off within bounded interval',()=>{assert.equal(delay(0),1100);assert.equal(delay(1),2200);assert.equal(delay(2),4400);assert.equal(delay(3),8000);assert.equal(delay(99),8000);});
test('periodic city cleanup removes expired rooms even without incoming activity',()=>{let now=0;const c=createCitySessions({clock:()=>now});const u={id:1,token_hash:'a'},v={id:2,token_hash:'b'};const r=c.create(u);now=16000;c.sweep();assert.throws(()=>c.join(v,r.code),{status:404});});
