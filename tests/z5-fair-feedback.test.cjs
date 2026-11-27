const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {makeHarness}=require('./helpers/dom-harness.cjs');
const html=fs.readFileSync(__dirname+'/../index.html','utf8');
const sw=fs.readFileSync(__dirname+'/../sw.js','utf8');
const bridge="globalThis.__fairProbe={roll:rxPityRoll,count:rxPityCount,info:rxPityInfo,cost:passCost,coinBalance:()=>coins,tier:()=>passTier,save:setStore,load:getStore};";

test('the player sees accurate original/expansion map claims and no internal implementation notes',()=>{
 assert.match(html,/Five classic maps, plus expansion and mystery arenas/);
 assert.doesNotMatch(html,/20 battlegrounds/);
 assert.doesNotMatch(html,/100\.5%/);
 assert.doesNotMatch(html,/GitHub Pages is static/);
 assert.doesNotMatch(html,/server-side economy is required for cheat-resistant multiplayer rewards/);
 assert.match(html,/browser-local and separate from server-backed account rewards/);
 assert.match(html,/const pool=MAPS\.filter\(m=>!m\.mysteryOnly/);
});

test('both published cosmetic and knife rarity distributions total exactly 100%',()=>{
 const r=html.slice(html.indexOf('const RARITIES=['),html.indexOf('];',html.indexOf('const RARITIES=[')));
 const chances=[...r.matchAll(/chance:(\d+)/g)].map(m=>Number(m[1]));
 assert.deepEqual(chances,[5955,2000,1000,950,80,10,5]);
 assert.equal(chances.reduce((a,b)=>a+b,0),10000);
 const k=html.slice(html.indexOf('const VX_KNIFE_RARITIES=['),html.indexOf('];',html.indexOf('const VX_KNIFE_RARITIES=[')));
 const weights=[...k.matchAll(/\['(?:common|uncommon|rare|legendary|godly|silver|golden)',([.\d]+)\]/g)].map(m=>Number(m[1]));
 assert.equal(weights.length,7);
 assert(Math.abs(weights.reduce((a,b)=>a+b,0)-100)<1e-9);
 assert.match(html,/CHEST_TOKEN_DENOMINATOR=1000000/);
});

test('paid character, gun and knife boxes guarantee Legendary+ on 25th miss separately',()=>{
 const h=makeHarness({},'2026-11-24T06:00:00Z',null,bridge);
 const api=h.ctx.__fairProbe;
 assert.equal(api.count('character'),0);
 for(const category of ['character','gun','knife']){
  for(let i=0;i<24;i++)assert.equal(api.roll(category,()=> 'common'),'common');
  assert.equal(api.count(category),24);
  assert.equal(api.roll(category,()=> 'common'),'legendary');
  assert.equal(api.count(category),0);
 }
 // Natural wins reset the streak; one family never affects another.
 api.roll('gun',()=> 'common');api.roll('gun',()=> 'godly');
 assert.equal(api.count('gun'),0);
 assert.equal(api.count('character'),0);
 assert.match(api.info('knife'),/25/);
});

test('battle pass is half price and legacy purchasers get one credit only',()=>{
 const existing={'zone90v2_coins':'500','zone90v2_passTier':'2'};
 const a=makeHarness(existing,'2026-11-24T06:00:00Z',null,bridge);
 const api=a.ctx.__fairProbe;
 assert.equal(api.cost(1),300);
 assert.equal(api.cost(100),500);
 assert.equal(api.tier(),2);
 assert.equal(api.coinBalance(),1100);
 assert.equal(api.load('rxPassFairRebateV1',false),true);
 const current=Object.fromEntries(a.local.entries);
 const b=makeHarness(current,'2026-11-24T06:00:00Z',null,bridge);
 assert.equal(b.ctx.__fairProbe.coinBalance(),1100);
 assert.equal(b.ctx.__fairProbe.load('rxPassFairRebateV1',false),true);
});

test('PWA cache renews without losing accessible sand theme and existing game options',()=>{
 assert.match(sw,/recoil-city-3d-radio/);
 assert.match(html,/id="rxSimpleQuick"/);
 const build=html.match(/<meta name="rx-build" content="([^"]+)"/)?.[1];
 assert.ok(build,'Current build metadata required');
 assert.match(html,/const RX_RELEASE=/);
 assert.ok(html.includes('dataset.rxBuild=RX_RELEASE.build'),'Compact menu must use current build');
 assert.match(html,/rx-home-layout-v2/);
 assert.match(html,/const RX_PITY_LIMIT=25/);
 assert.match(html,/rxChestFairStreakV1/);
});
