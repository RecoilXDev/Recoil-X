import test from 'node:test';
import assert from 'node:assert/strict';
import {createNetworkQuality} from '../server/z5-network-quality.mjs';
import {createLowRamAssetCache} from '../client/z5-low-ram.mjs';
import {evolutionForXp,awardVerifiedWeaponXp} from '../server/z5-weapon-evolution.mjs';
test('network quality reports RTT without claiming packet loss',()=>{
 let t=1000;const n=createNetworkQuality({now:()=>t});const p=n.ping('a');t+=65;
 const r=n.pong('a',p.seq);assert.equal(r.rttMs,65);assert.equal(r.transportPacketLoss,null);
 assert.equal(n.pong('a',p.seq),null);
});
test('expired heartbeat counts missed application heartbeat',()=>{
 let t=0;const n=createNetworkQuality({now:()=>t,timeoutMs:100});n.ping('a');t=101;
 assert.equal(n.sweep('a').missed,1);
});
test('cache evicts oldest and invokes disposer',async()=>{
 const disposed=[];const c=createLowRamAssetCache({maxEntries:1,dispose:(v)=>disposed.push(v)});
 await c.load('a',async()=>1);await c.load('b',async()=>2);
 assert.deepEqual(disposed,[1]);assert.equal(c.stats().entries,1);c.clear();assert.deepEqual(disposed,[1,2]);
});
test('weapon evolution only awards server-confirmed events',()=>{
 assert.equal(evolutionForXp(1800).name,'Elite');
 assert.equal(awardVerifiedWeaponXp(475,{confirmedKill:true}).level,2);
 assert.equal(awardVerifiedWeaponXp(475,{confirmedKill:false}).xp,475);
});
