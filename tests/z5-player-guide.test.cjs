const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {makeHarness}=require('./helpers/dom-harness.cjs');
const code=fs.readFileSync(__dirname+'/../server/z5-player-guide.js','utf8');
test('guide loads with the existing sand menu, without adding a new top-level shortcut',()=>{
 const h=makeHarness({'zone90v2_rx5-simple-menu':'true'});
 const original=h.ui.querySelector('#rxSimpleQuick');
 new vm.Script(code,{filename:'z5-player-guide.js'}).runInContext(h.ctx);
 assert.equal(h.ui.querySelector('#rxSimpleQuick'),original);
 const launch=h.ui.querySelector('#rx-guide-entry');
 assert.ok(launch);
 assert.ok(launch.closest('#rx5More')||launch.closest('#rx5-native-main'));
 launch.click();
 assert.ok(h.ui.querySelector('#rx-guide-shell').classList.contains('open'));
 assert.match(h.ui.querySelector('#rx-guide-content').textContent,/Mission Mode progress/);
 h.ui.querySelector('[data-guide="privacy"]').click();
 assert.match(h.ui.querySelector('#rx-guide-content').textContent,/password verifiers/);
});
test('only eligible non-secret game-local keys may be backed up',()=>{
 const h=makeHarness({
  'zone90v2_rx5-simple-menu':'true',
  'rx5-hud-layout-v1':'{}',
  'rx5-token':'private-token',
  'rx5-auth-refresh':'private-auth',
  'rx5-bad':'{"access_token":"sensitive"}',
  'other-site':'unrelated'
 });
 new vm.Script(code).runInContext(h.ctx);
 const local=h.ctx.RXZ5PlayerGuide;
 assert.equal(local.eligible('rx5-token','secret'),false);
 assert.equal(local.eligible('zone90v2_rx5-simple-menu','true'),true);
 assert.equal(local.eligible('rx5-progress',JSON.stringify({password:'hidden'})),false);
 assert.equal(local.eligible('rx5-settings','a'.repeat(300001)),false);
 assert.deepEqual(Array.from(local.entries(),o=>o.key).sort(),['rx5-hud-layout-v1','zone90v2_rx5-simple-menu']);
});
test('server source includes a non-cacheable guide endpoint and script on the game shell',()=>{
 const server=fs.readFileSync(__dirname+'/../server/server.mjs','utf8');
 assert.match(server,/path === '\/z5-player-guide\.js'/);
 assert.match(server,/script src="\/z5-player-guide\.js" defer/);
 assert.match(code,/backup/i);
 assert.doesNotMatch(code,/sessionStorage\.getItem/);
 assert.match(code,/this file is not uploaded to a server/i);
});
