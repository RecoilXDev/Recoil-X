const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {makeHarness}=require('./helpers/dom-harness.cjs');
const root=path.join(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');

test('Update A public name survives all legacy app initialization and device selection',()=>{
 const h=makeHarness();
 const {ui}=h;
 const main=ui.querySelector('#mainMenu .brandchip');
 const device=ui.querySelector('#deviceMenu .brandchip');
 const version=ui.querySelector('#mainMenu .versionlabel');
 const hud=ui.querySelector('#v9ModeBadge');
 const title=ui.querySelector('title');
 assert.ok(main&&device&&version&&hud&&title);
 assert.match(main.textContent,/UPDATE A/i);
 assert.match(device.textContent,/UPDATE A/i);
 assert.match(version.textContent,/UPDATE A/i);
 assert.match(hud.textContent,/UPDATE A/i);
 assert.match(title.textContent,/UPDATE A/i);
 assert.doesNotMatch(main.textContent,/Z\.[35]|preview|RC\d/i);
 assert.doesNotMatch(device.textContent,/Z\.[35]|preview|RC\d/i);
});
test('old Z.3 global version reassignment cannot reappear in source',()=>{
 const html=read('index.html'),server=read('server/server.mjs');
 assert.doesNotMatch(html,/querySelector\('\.brandchip'\)\.textContent='Z\.3'/);
 assert.doesNotMatch(html,/querySelector\('\.brandchip'\)\.textContent='RECOIL X · Z\.3'/);
 const release=html.match(/<meta name="rx-release" content="([A-Z](?:\.\d+)?) — [^"]+"\s*\/>/);
 assert.ok(release,'Current release metadata is required');
 assert.ok(html.includes('<title>RECOIL X — Update '+release[1]+'</title>'),'Browser title must match the current release');
 assert.ok(html.includes("querySelector('.brandchip').textContent=RX_RELEASE.brand"),'Startup branding must use current release metadata');
 assert.match(html,/const RX_RELEASE=/);assert.match(html,/name="rx-build" content="[^"]+"/);
 assert.match(server,/recoil:'Z\.5'/);
});
