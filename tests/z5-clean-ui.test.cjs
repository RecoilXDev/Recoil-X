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
 assert.match(js,/Z\.5-SAND-8/);
 assert.match(html,/<meta name="rx-build" content="Z\.5-SAND-8"/);
 assert.match(html,/localHeat:true/);
 assert.match(html,/id="rxSimpleQuick"/);
 assert.match(sw,/recoil-city-1/);
 assert.match(sw,/skipWaiting/);
});
test('clean UI puts newest changes in front while preserving all advanced features',()=>{
 const h=makeHarness();
 const script=read('server/z5-ingame.js');
 assert.doesNotThrow(()=>new vm.Script(script).runInContext(h.ctx));
 const {ui,ctx}=h;
 assert.equal(ctx.RXZ5InGame.version,'Z.5-SAND-8');
 assert.ok(ui.querySelector('#rx5-release-strip'));
 assert.ok(ui.querySelector('#rx5-open-news'));
 assert.ok(ui.querySelector('#rx5More'));
 assert.ok(ui.querySelector('#rx5Options'));
 assert.ok(ui.querySelector('#rx5-native-main'));
 assert.ok(ui.querySelector('#rx5-native-advanced'));
 assert.ok(ui.querySelector('#rx5-native-pause'));
 const extras=ui.querySelectorAll('[data-rx5-open]');
 assert.equal(extras.length,10);
 for(const item of ['rxSimpleQuick','rxSimpleModes','rxSimpleLocker','rxSimpleFriends','rxSimpleSettings','rxSimpleCollection','rxSimpleBotLevel'])
   assert.ok(ui.querySelector('#'+item),item+' must be retained');
 const admin=ui.querySelectorAll('[data-rx-admin-only]');
 assert.equal(admin.length,2);
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

test('classic and compact homes share working tools, release notes and reversible settings',()=>{
 const h=makeHarness();
 const layout=read('index.html').match(/<script id="rx5-operation-simplicity">([\s\S]*?)<\/script>/)[1];
 new vm.Script(layout).runInContext(h.ctx);
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
 assert.ok(settings.closest('#z1SettingsMenu'));
 assert.ok(ui.querySelector('#z1Home').querySelector('#rx5More'));
 assert.ok(!settings.hidden && !settings.open && !more.open);
 ui.querySelector('#rxSimpleToggle').click();
 assert.ok(simple.querySelector('#rx5More'));
 assert.equal(settings.parentElement,simple.querySelector('#rxSimpleActions'));
 assert.ok(settings.hidden && !settings.open);
 assert.equal(simple.querySelector('.rx-simple-grid').children.length,5,'four existing shortcuts plus Collection');
 assert.ok(ui.querySelector('#rxSimpleCollection'),'Collection shortcut is displayed');
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

test('classic home restores old profiles and honors later explicit layout choices',()=>{
 const html=read('index.html');
 const layout=html.match(/<script id="rx5-operation-simplicity">([\s\S]*?)<\/script>/)[1];
 for(const old of [null,true,false]){
   const h=makeHarness(old===null?{}:{'zone90v2_rx5-simple-menu':JSON.stringify(old),'zone90v2_rx5-sand-6-1-first-menu':'true'});
   const run=()=>new vm.Script(layout).runInContext(h.ctx);
   run();
   const root=h.ui.querySelector('#mainMenu'),toggle=h.ui.querySelector('#rxSimpleToggle'),city=h.ui.querySelector('#z1CityEntry');
   assert.equal(root.classList.contains('rx-simple-active'),false);
   assert.ok(city.closest('#z1Home'));
   city.click();assert.match(city.textContent,/reload|تحميل/i);
   let opened=0;h.ctx.RecoilCity={open(){opened++;return true;}};
   city.click();assert.equal(opened,1);
   toggle.click();
   assert.ok(root.classList.contains('rx-simple-active'));
   assert.ok(city.closest('#rxSimpleActions'));
   assert.equal(h.local.getItem('zone90v2_rx-home-layout-v2'),'"compact"');
   run();
   assert.ok(root.classList.contains('rx-simple-active'),'explicit compact preference survives reload');
   toggle.click();
   assert.ok(city.closest('#z1Home'));
   assert.equal(h.local.getItem('zone90v2_rx-home-layout-v2'),'"classic"');
 }
});

test('portrait touch menus stay upright and local matches use the landscape stage',()=>{
 const h=makeHarness();
 h.ctx.innerWidth=390;h.ctx.innerHeight=844;
 h.ui.querySelector('#chooseMobile').click();
 assert.ok(!h.ui.body.classList.contains('rx-soft-landscape'));
 h.ui.querySelector('#z1PlayBtn').click();
 assert.ok(!h.ui.body.classList.contains('rx-soft-landscape'));
 h.ui.querySelector('#z1InstantPlay').click();
 assert.ok(h.ui.body.classList.contains('rx-soft-landscape'));
 h.ui.querySelector('#quitBtn').click();
 assert.ok(!h.ui.body.classList.contains('rx-soft-landscape'));
});

test('Collection opens existing gun/knife/loot screens without changing inventory',()=>{
 const h=makeHarness();
 new vm.Script(read('server/z5-ingame.js')).runInContext(h.ctx);
 const {ui}=h,hub=ui.querySelector('#rx5CollectionHub'),entry=ui.querySelector('#rxSimpleCollection');
 assert.ok(hub&&hub.hidden,'Collection hub is hidden by default');
 entry.click();assert.equal(hub.hidden,false,'Collection shortcut opens the real hub');
 for(const id of ['v8GunBtn','vxKnivesBtn','crateBtn','shopBtn','vxForgeBtn','passBtn'])
  assert.ok(hub.querySelector('[data-rx5-item="'+id+'"]'),'existing inventory route: '+id);
 let knifeOpened=false;
 ui.querySelector('#vxKnivesBtn').onclick=()=>{knifeOpened=true;};
 hub.dispatchEvent({type:'click',target:hub.querySelector('[data-rx5-item="vxKnivesBtn"]')});
 assert.equal(knifeOpened,true,'Collection forwards to original knife screen handler');
 assert.equal(hub.hidden,true,'choosing knives closes the hub and returns to game routing');
 assert.equal(h.local.getItem('coins'),null,'Collection must not modify coins');
});
test('Custom HUD layout persists accessible keyboard edits and supports reset',()=>{
 const h=makeHarness();
 new vm.Script(read('server/z5-ingame.js')).runInContext(h.ctx);
 const {ui,local}=h,editor=ui.querySelector('#rx5HudEditor'),start=ui.querySelector('#rx5HudLayoutButton');
 assert.ok(editor.hidden);
 start.click();assert.equal(editor.hidden,false);
 const preview=ui.querySelector('#rx5HudPreview'),tile=preview.querySelector('[data-rx5-hud="top"]');
 preview.dispatchEvent({type:'keydown',target:tile,key:'ArrowRight',preventDefault(){}});
 const moved=JSON.parse(local.getItem('rx5-hud-layout-v1'));
 assert.equal(moved.top.x,1);
 assert.match(ui.querySelector('.hud-top').style.translate,/1vw/);
 ui.querySelector('#rx5HudReset').click();
 assert.equal(local.getItem('rx5-hud-layout-v1'),'{}');
 assert.equal(ui.querySelector('.hud-top').style.translate,'');
 ui.querySelector('#rx5HudClose').click();
 assert.equal(editor.hidden,true);
 assert.ok(ui.querySelector('#rx5PhotoCapture'),'clean screenshot remains reachable in Pause More');
});
