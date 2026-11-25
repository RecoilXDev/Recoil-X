const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {makeHarness}=require('./helpers/dom-harness.cjs');
test('game features open inline from their native screens and return to the same menu',async()=>{
 const h=makeHarness();
 const load=name=>new vm.Script(fs.readFileSync(__dirname+'/../server/'+name,'utf8')).runInContext(h.ctx);
 load('z5-panel.js');load('z5-ingame.js');load('a-curator.js');load('a-control-center.js');
 const button=(parent,key)=>h.ui.querySelector(parent+' [data-game-feature="'+key+'"]');
 for(const [parent,keys] of [
  ['#z1PlayMenu',['curator']],['#z1Locker',['pass','seasonkills']],
  ['#z1FriendsMenu',['community','security']],['#z1SettingsMenu',['network']],
  ['#z2Menu',['combat','shield']],['#rx5-shell',['progression']]
 ])for(const key of keys)assert.ok(button(parent,key),key+' is accessible from '+parent);
 assert.equal(h.ui.querySelector('#rx-a-entry'),null);
 assert.equal(h.ui.querySelector('#z1Home [data-game-feature]'),null);
 assert.ok(h.ui.querySelector('#rx-a-home-pair #rx-a-season-tab'));
 const homeCurator=h.ui.querySelector('#rx-a-home-pair #rx-a-curator-tab');assert.ok(homeCurator);
 await homeCurator.onclick();assert.equal(h.ui.querySelector('.curator-library').hidden,false);assert.equal(h.ui.querySelector('.curator-editor').hidden,true);
 h.ui.getElementById('rx-curator-new').click();assert.equal(h.ui.querySelector('.curator-editor').hidden,false);
 h.ui.getElementById('rx-curator-back').click();assert.equal(h.ui.querySelector('.curator-library').hidden,false);
 h.ui.getElementById('rx-curator-back').click();assert.equal(h.ui.getElementById('rx-a').hidden,true);

 h.ui.getElementById('z1PlayBtn').click();h.ui.getElementById('z1TrainingTab').click();
 const curator=button('#z1PlayMenu','curator');
 await curator.onclick();
 const feature=h.ui.querySelector('#rx-a');
 assert.equal(feature.closest('#z1PlayMenu'),h.ui.getElementById('z1PlayMenu'));
 assert.match(feature.textContent,/Curator Mode/);
 assert.ok(feature.querySelector('canvas'));
 await curator.onclick();
 assert.equal(curator.getAttribute('aria-expanded'),'false');
 assert.equal(feature.hidden,true);
 assert.equal(h.ui.getElementById('z1PlayMenu').classList.contains('hide'),false);

 h.ui.querySelector('#z1PlayMenu .z1-back').click();
 h.ui.getElementById('z1CollectionBtn').click();
 assert.equal(h.ui.getElementById('z1CollectionMenu').classList.contains('hide'),false);
 const pass=button('#z1Locker','pass');
 await pass.onclick();
 assert.match(feature.textContent,/Sign in through Friends/);
 await pass.onclick();
 h.ctx.sessionStorage.setItem('rx5-token','test-session');
 let equipped=null;
 const requests=[];
 h.ctx.fetch=async(path,options)=>{
  requests.push(path);
  if(path==='/rx-api/a/season/pass/equip')equipped=JSON.parse(options.body).tier;
  return {ok:true,json:async()=>({state:'active',xp:130,equipped,rewards:[{title:'Dawn Recruit',tier:1,xp:100,claimed:true}]})};
 };
 await pass.onclick();
 assert.equal(feature.closest('#z1Locker'),h.ui.getElementById('z1Locker'));
 const equip=feature.querySelector('[data-a-action="pass-equip"]');
 assert.equal(equip.textContent,'Equip title');
 await feature.handlers.click[0]({target:equip});
 assert.deepEqual(requests,['/rx-api/a/season/pass','/rx-api/a/season/pass/equip','/rx-api/a/season/pass']);
 assert.equal(feature.querySelector('[data-a-action="pass-equip"]').textContent,'Unequip');
 await feature.handlers.click[0]({target:h.ui.getElementById('rx-a-close')});
 assert.equal(feature.hidden,true);
 assert.equal(h.ui.getElementById('rx-a-body').textContent,'');
});

test('server-confirmed hit UI accepts only current match damage and does not flash',()=>{
 const bridge="globalThis.aHitTest={enter:()=>{mode='crown-overdrive';phase='playing';paused=false;pl.alive=true;z2Live.match={id:'current-match'};},packet:z2Packet,end:()=>{z2Live.match=null;},live:z2Live};";
 const h=makeHarness({},undefined,null,bridge),probe=h.ctx.aHitTest,badge=h.ui.querySelector('#rxAHitConfirm');
 assert.ok(badge);
 probe.enter();
 badge.hidden=true;
 probe.packet({type:'z2:hit-confirm',id:'stale-match',damage:22});assert.equal(badge.hidden,true);
 probe.packet({type:'z2:hit-confirm',id:'current-match',damage:-3});assert.equal(badge.hidden,true);
 probe.packet({type:'z2:hit-confirm',id:'current-match',damage:22});assert.equal(badge.hidden,false);
 assert.match(badge.textContent,/22/);
 assert.ok(probe.live.hitConfirmUntil>0);
 probe.end();badge.hidden=true;
 probe.packet({type:'z2:hit-confirm',id:'current-match',damage:999});assert.equal(badge.hidden,true);
});

test('dedicated Season 1 home tab opens only after the server season gate',async()=>{
 const h=makeHarness();
 const start=Date.parse('2026-11-25T00:00:00+04:00'),end=Date.parse('2027-04-01T00:00:00+04:00');
 const state='upcoming',now=start-1;
 h.ctx.fetch=async(path)=>({ok:true,json:async()=>path==='/rx-api/a/season/schedule'?{state,start,end,now}:{}});
 new vm.Script(fs.readFileSync(__dirname+'/../server/a-control-center.js','utf8')).runInContext(h.ctx);
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(h.ui.getElementById('rx-a-season-tab').hidden,true);
 const active=makeHarness();
 active.ctx.fetch=async(path)=>({ok:true,json:async()=>({state:'active',start,end,now:start})});
 new vm.Script(fs.readFileSync(__dirname+'/../server/a-control-center.js','utf8')).runInContext(active.ctx);
 await new Promise(resolve=>setImmediate(resolve));
 const b=active.ui.getElementById('rx-a-season-tab');assert.equal(b.hidden,false);
 await b.onclick();assert.match(active.ui.getElementById('rx-a').textContent,/NEW DAWN/i);
 assert.match(active.ui.getElementById('rx-a').textContent,/Sign in through Friends/);
});
