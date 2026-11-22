const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {makeHarness}=require('./helpers/dom-harness.cjs');
const root=path.join(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');

test('Z.5 version survives all legacy app initialization and device selection',()=>{
 const h=makeHarness();
 const {ui}=h;
 const main=ui.querySelector('#mainMenu .brandchip');
 const device=ui.querySelector('#deviceMenu .brandchip');
 const version=ui.querySelector('#mainMenu .versionlabel');
 const hud=ui.querySelector('#v9ModeBadge');
 const title=ui.querySelector('title');
 assert.ok(main&&device&&version&&hud&&title);
 assert.match(main.textContent,/Z\.5/);
 assert.match(device.textContent,/Z\.5/);
 assert.match(version.textContent,/Z\.5/);
 assert.match(hud.textContent,/Z\.5/);
 assert.match(title.textContent,/Z\.5/);
 assert.doesNotMatch(main.textContent,/Z\.3/);
 assert.doesNotMatch(device.textContent,/Z\.3/);
});
test('old Z.3 global version reassignment cannot reappear in source',()=>{
 const html=read('index.html'),server=read('server/server.mjs');
 assert.doesNotMatch(html,/querySelector\('\.brandchip'\)\.textContent='Z\.3'/);
 assert.doesNotMatch(html,/querySelector\('\.brandchip'\)\.textContent='RECOIL X · Z\.3'/);
 assert.match(html,/RECOIL X Z\.5 · Sand Edition/);
 assert.match(html,/Z\.5-SAND-6/);
 assert.match(server,/recoil:'Z\.5'/);
});
