const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {makeHarness}=require('./helpers/dom-harness.cjs');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('clean UI source has valid syntax and explicit current release identity',()=>{
 const js=read('server/z5-ingame.js'),html=read('index.html'),sw=read('sw.js');
 assert.doesNotThrow(()=>new vm.Script(js,{filename:'z5-ingame.js'}));
 assert.match(js,/Z\.5-SAND-6/);
 assert.match(html,/<meta name="rx-build" content="Z\.5-SAND-6"/);
 assert.match(html,/localHeat:true/);
 assert.match(html,/id="rxSimpleQuick"/);
 assert.match(sw,/z5-sand-6/);
 assert.match(sw,/skipWaiting/);
});
test('clean UI puts newest changes in front while preserving all advanced features',()=>{
 const h=makeHarness();
 const script=read('server/z5-ingame.js');
 assert.doesNotThrow(()=>new vm.Script(script).runInContext(h.ctx));
 const {ui,ctx}=h;
 assert.equal(ctx.RXZ5InGame.version,'Z.5-SAND-6');
 assert.ok(ui.querySelector('#rx5-release-strip'));
 assert.ok(ui.querySelector('#rx5-open-news'));
 assert.ok(ui.querySelector('#rx5More'));
 assert.ok(ui.querySelector('#rx5Options'));
 assert.ok(ui.querySelector('#rx5-native-main'));
 assert.ok(ui.querySelector('#rx5-native-advanced'));
 assert.ok(ui.querySelector('#rx5-native-pause'));
 const extras=ui.querySelectorAll('[data-rx5-open]');
 assert.equal(extras.length,16);
 for(const item of ['rxSimpleQuick','rxSimpleModes','rxSimpleLocker','rxSimpleFriends','rxSimpleSettings','rxSimpleBotLevel'])
   assert.ok(ui.querySelector('#'+item),item+' must be retained');
 const admin=ui.querySelectorAll('[data-rx-admin-only]');
 assert.equal(admin.length,3);
 assert.ok(admin.every(x=>x.hidden),'Admin controls must be hidden for non-admin users');
 assert.equal(ui.querySelector('#rx5LocalHeatSetting').checked,true);
 assert.ok(ui.querySelector('#rx5CombatSettings').closest('#rx5Options'));
 const notes=ui.querySelector('#rx5WhatsNew');
 assert.equal(notes.hidden,true);
 ui.querySelector('#rx5-open-news').click();
 assert.equal(notes.hidden,false);
 ui.querySelector('[data-rx5-close]').click();
 assert.equal(notes.hidden,true);
 assert.equal(ui.querySelector('#rxSimpleQuick').disabled,false);
});

test('Quick Play stays primary, Settings open in place and pause controls collapse safely',()=>{
 const h=makeHarness();
 const js=read('server/z5-ingame.js');
 new vm.Script(js,{filename:'z5-ingame.js'}).runInContext(h.ctx);
 const {ui}=h;
 const main=ui.querySelector('#mainMenu');
 const simple=ui.querySelector('#rxSimplePanel');
 const quick=ui.querySelector('#rxSimpleQuick');
 const heading=ui.querySelector('#rxSimplePanel .rx-simple-heading');
 const strip=ui.querySelector('#rx5-release-strip');
 const settings=ui.querySelector('#rx5Options');
 const more=ui.querySelector('#rx5More');
 const pauseSettings=ui.querySelector('#rx5PauseSettings');
 assert.ok(main,'the original main menu remains accessible after device selection');
 assert.ok(ui.body.classList.contains('rx5-sand-ui'));
 assert.equal(strip.parentElement,more,'release notes must stay inside the closed More drawer');
 assert.ok(heading,'brand heading stays simple');
 assert.ok(simple.querySelector('#rxSimpleActions .rx-simple-grid'));
 assert.equal(settings.parentElement,simple.querySelector('#rxSimpleActions'));
 assert.ok(simple.querySelector('#rx5More'));
 assert.ok(settings.hidden && !settings.open && !more.open,'Settings stays invisible and More starts closed');
 assert.equal(simple.querySelector('.rx-simple-grid').children.length,4,'four core shortcuts');
 assert.ok(ui.querySelector('#rx5LegacyMenuLink'),'full classic menu remains accessible inside More');
 assert.ok(quick.getAttribute('id')==='rxSimpleQuick');
 assert.ok(pauseSettings);
 for(const id of ['v9PauseQuality','v92PauseRow','v91PauseProfile'])
   assert.ok(pauseSettings.querySelector('#'+id),id+' must be in collapsed pause settings');
 assert.ok(ui.querySelector('#rx5-quick-system'));
 assert.ok(ui.querySelector('#rx5GearSelect'));
 assert.ok(ui.querySelector('#rx5FocusToggle'));
 assert.ok(ui.querySelector('#rxSimpleSettings'));
 assert.ok(ui.querySelector('#rxSimpleModes'));
 assert.ok(ui.querySelector('#rxSimpleLocker'));
 assert.ok(ui.querySelector('#rxSimpleFriends'));
 assert.equal(ui.querySelectorAll('[data-rx-admin-only]').filter(x=>!x.hidden).length,0);
 assert.match(ui.querySelector('#rx5-clean-ui-styles').textContent,/rx5-sand-ui/);
 assert.match(ui.querySelector('#rx5-clean-ui-styles').textContent,/ffdfa1/,'sand-and-gold Quick Play');
 const settingsButton=ui.querySelector('#rxSimpleSettings');
 settingsButton.click();
 assert.equal(settings.hidden,false,'Settings button should reveal the drawer');
 assert.equal(settings.open,true,'Settings drawer should be open');
 settingsButton.click();
 assert.equal(settings.hidden,true,'second Settings click should cleanly hide drawer');
 assert.equal(settings.open,false);
 assert.ok(ui.querySelector('#rxSimpleToggle'),'legacy menu can be restored');

});


test('Sandstorm Quick Play and main shortcuts are really initialized in the game closure',()=>{
 const h=makeHarness();
 const {ui,local}=h;
 const main=ui.querySelector('#mainMenu');
 assert.ok(main.classList.contains('rx-simple-active'),'The clean menu must be selected at first visit');
 for(const id of ['rxSimpleQuick','rxSimpleModes','rxSimpleLocker','rxSimpleFriends','rxSimpleSettings','rxSimpleToggle']){
  assert.equal(typeof ui.querySelector('#'+id).onclick,'function',id+' must have a working game handler');
 }
 assert.equal(local.getItem('zone90v2_rx5-sand-ui-v6-welcome'),'true');
});
test('prior Advanced preference gets one-time clean-menu migration and remains editable',()=>{
 const pref={
  'zone90v2_rx5-simple-menu':'false'
 };
 const h=makeHarness(pref);
 const main=h.ui.querySelector('#mainMenu');
 const toggle=h.ui.querySelector('#rxSimpleToggle');
 assert.ok(main.classList.contains('rx-simple-active'));
 assert.equal(h.local.getItem('zone90v2_rx5-simple-menu'),'true');
 toggle.click();
 assert.ok(!main.classList.contains('rx-simple-active'),'Classic mode is still reachable');
 assert.equal(h.local.getItem('zone90v2_rx5-simple-menu'),'false');
});
