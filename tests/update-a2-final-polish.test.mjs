import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import '../server/recoil-city-world.js';
const src=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const between=(a,b)=>src.slice(src.indexOf(a),src.indexOf(b,src.indexOf(a)));
test('A.2 mobile reset reinitializes the WeakMap and can run repeatedly',()=>{
 const handlers={};const nodes={};const $=id=>nodes[id]??={addEventListener(){},style:{},classList:{contains(){return true;}}};const doc={addEventListener(type,fn){handlers[type]=fn;}};
 new Function('$','document',between('(function rx31InstallMultitouch(){','document.addEventListener(\'visibilitychange\',()=>{if(document.hidden)'))($,doc);
 assert.doesNotThrow(()=>{handlers['rx-input-reset']();handlers['rx-input-reset']();});
});
test('A.2 multiplayer sends directional reversals promptly and keeps unchanged input bounded',()=>{
 const live={lastInput:null,sequence:0},sent=[];const send=new Function('z2Live','z2Send',between('const z2Buttons=','function z2Simulate(')+';return z2SendControls;')(live,(_a,p)=>{sent.push(p);return true;});
 const input={f:1,s:0,yaw:0,pitch:0,weapon:0};send(1,input);send(1.02,input);assert.equal(sent.length,1);send(1.025,{...input,f:-1});assert.equal(sent.length,2);assert.equal(sent[1].f,-1);send(1.04,{...input,f:-1});assert.equal(sent.length,2);
});
test('A.2 long city driving sessions maintain finite coordinates and bounded world state',()=>{
 const W=globalThis.RecoilCityWorld;let seed=56;const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
 const s=W.create({quality:'high',random,career:{cash:12000}});W.interact(s);
 for(let i=0;i<2400;i++){if(i%150===0){const c=s.vehicles.find(v=>v.id===s.player.vehicleId);if(c)c.speed=0;W.interact(s);}if(i%60===0&&!s.player.vehicleId&&!s.interior)W.interact(s);const turn=random()*2-1,forward=random()<.78?1:-1;W.step(s,{forward,turn,walkX:turn,walkY:forward,brake:random()<.05},.25);assert.ok([s.player.x,s.player.y,s.player.hp,s.career.cash].every(Number.isFinite));assert.ok(s.vehicles.length<=40&&s.locals.length<=18&&s.effects.length<=32);}
});
