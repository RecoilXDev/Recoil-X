const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {makeHarness}=require('./helpers/dom-harness.cjs');
test('Update A control center opens and closes without replacing the Sand quick-play menu',async()=>{
 const h=makeHarness();
 new vm.Script(fs.readFileSync(__dirname+'/../server/z5-ingame.js','utf8')).runInContext(h.ctx);
 const quick=h.ui.querySelector('#rxSimpleQuick');
 new vm.Script(fs.readFileSync(__dirname+'/../server/a-control-center.js','utf8')).runInContext(h.ctx);
 assert.equal(h.ui.querySelector('#rxSimpleQuick'),quick);
 assert.ok(h.ui.querySelector('#rx-a-entry').closest('#rx5-native-main'));
 await h.ctx.RXUpdateA.open();
 assert.equal(h.ui.querySelector('#rx-a').hidden,false);
 assert.match(h.ui.querySelector('#rx-a-body').textContent,/Make every match count/);
 await h.ctx.RXUpdateA.open('security');
 assert.match(h.ui.querySelector('#rx-a-body').textContent,/Sign in through Career/);
 h.ctx.RXUpdateA.close();
 assert.equal(h.ui.querySelector('#rx-a').hidden,true);
 assert.equal(h.ui.querySelector('#rx-a-body').textContent,'');
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
