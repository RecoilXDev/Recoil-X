import test from 'node:test';
import assert from 'node:assert/strict';
import '../server/recoil-city-world.js';
const W=globalThis.RecoilCityWorld;
test('expanded map retains original coordinates and bounds low-end population',()=>{
 const s=W.create({quality:'low'});assert.equal(W.map.width,2880);assert.equal(W.map.height,2400);assert.equal(W.map.districts.length,25);assert(W.map.districts.some(d=>d.name==='Old Quarter'));assert(s.locals.length<=6);assert.equal(s.player.x,135);
});
test('shop entry, robbery cooldown and exit',()=>{
 const s=W.create({quality:'low'}),shop=s.stores[0];Object.assign(s.player,{x:shop.x,y:shop.y});
 assert(W.enterShop(s));assert(W.robShop(s));assert.equal(s.career.cash,75);assert(!W.robShop(s));assert.equal(s.heat,1);assert(W.enterShop(s));assert.equal(s.interior,null);
 s.vehicles.push({id:'test-patrol',kind:'patrol',x:shop.x-25,y:shop.y,angle:0,hp:100,speed:0,wheel:0,steer:0,goal:null,contact:0});
 W.step(s,{},.1);assert(s.officers.length>0);assert(s.officers.length<=2);
});
test('police death overlay state survives until respawn',()=>{
 const s=W.create({random:()=>0,quality:'low'});s.heat=1;s.heatTime=100;
 s.officers.push({id:20000,x:130,y:170,hp:100,nextShot:0,angle:0});
 W.step(s,{},.02);assert.equal(s.deathLabel,'DEAD');assert.equal(s.player.hp,0);
 for(let i=0;i<12;i++)W.step(s,{},.25);
 assert.equal(s.player.hp,100);assert.equal(s.deathLabel,'');
});
test('vehicle impacts cause bounded knockdown or defeat',()=>{
 for(const speed of [30,95]){
 const s=W.create({quality:'low'}),c=s.vehicles[0];Object.assign(s.player,{x:c.x,y:c.y,vehicleId:c.id});c.speed=speed;s.populationAt=99;
 const npc={id:99,x:c.x+8,y:c.y,hp:70,mood:'defend',alarm:100,counterAt:100,phase:0,color:'#fff',angle:0};s.locals=[npc];
 W.step(s,{forward:1},.03);assert.equal(npc.hp,speed>=52?0:70);assert(npc.stunUntil>s.elapsed);assert.equal(s.heat,1);
 }
});
