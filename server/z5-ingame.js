// RECOIL X Z.5 — CLEAN, VISIBLE NAVIGATION.
// Enhances the existing game UI. No new game, floating LAB or public admin launcher.
(()=>{
'use strict';
if(window.RXZ5InGame)return;
const $=id=>document.getElementById(id);
const menu=$('mainMenu'),simple=$('rxSimpleActions'),pause=$('pauseMenu');
if(!menu||!simple||!pause)return;
const style=document.createElement('style');
style.id='rx5-clean-ui-styles';
style.textContent="\n/* RECOIL X Z.5 DESERT EDITION — intentional warm sand visual system.\n   One Quick Play, no floating feature launcher, no cosmetic navy override. */\n:root{--rx5-sand:#e8ba76;--rx5-dune:#b98445;--rx5-ember:#eead50;--rx5-cream:#fff0cd;--rx5-rock:#2b1b12;--rx5-shadow:#130d0a}\nbody.rx5-ui-polished{background:#23170f;color:#fff0d8}\nbody.rx5-ui-polished #overlay{\n padding:clamp(8px,3vw,22px);\n background:\n radial-gradient(ellipse 85% 40% at 50% 106%,#8c54355c,transparent 75%),\n radial-gradient(ellipse 75% 70% at 68% 0%,#bb83452e,transparent 70%),\n linear-gradient(155deg,#29190fef,#190f0ae9 65%,#2c1a10ec);\n}\nbody.rx5-ui-polished #overlay::before{opacity:.12;background:repeating-linear-gradient(-16deg,transparent 0 29px,#eab16a12 30px 31px,transparent 32px 80px)}\nbody.rx5-ui-polished #overlay .panel{\n width:min(690px,100%);max-height:calc(100dvh - 24px);overflow:auto;\n background:linear-gradient(157deg,#49301fed,#2a1a13fb 62%,#211710f9);\n border:1px solid #ac784b;border-radius:18px;\n box-shadow:0 14px 48px #110a08b0;backdrop-filter:blur(9px);\n scrollbar-width:thin;scrollbar-color:#895a39 transparent;\n}\nbody.rx5-ui-polished #overlay .panel::before{\n height:3px;background:linear-gradient(90deg,#6e472b,#efc37f,#a65d32,#6e472b);\n}\nbody.rx5-ui-polished #overlay .panel-content{padding:clamp(12px,3vw,26px)}\nbody.rx5-ui-polished #overlay .brandchip{background:#4f3424;border:1px solid #a0764b;color:#f5d19b;border-radius:7px;letter-spacing:.05em}\nbody.rx5-ui-polished #overlay :is(.eyebrow,.sunmark){color:#f3c17d;letter-spacing:.08em}\nbody.rx5-ui-polished #overlay .game-title{color:#fff3d8;text-shadow:0 5px 0 #402617,0 12px 23px #150d0a88}\nbody.rx5-ui-polished #overlay .game-title span{color:#f6c77e;text-shadow:0 3px 0 #87502d}\nbody.rx5-ui-polished #overlay :is(.subtitle,.menu-note){color:#d5b690}\nbody.rx5-ui-polished #overlay .primary{\n color:#2a1a0c;border:1px solid #ffe1a8;border-radius:11px;\n background:linear-gradient(120deg,#ffdb99,#e6a653);box-shadow:none;\n}\nbody.rx5-ui-polished #overlay .secondary{\n color:#f9e4c4;border:1px solid #9c704c;border-radius:11px;\n background:#503524;box-shadow:none;\n}\nbody.rx5-ui-polished #overlay .choice{\n color:#fff1d7;background:#573c2a;border:1px solid #9f7145;border-radius:12px;\n box-shadow:none;transition:background .15s,border-color .15s;\n}\nbody.rx5-ui-polished #overlay :is(.primary,.secondary,.choice):hover{\n filter:none;background:#825331;border-color:#ecc18a;transform:none;\n}\nbody.rx5-ui-polished #overlay .primary:hover{color:#221408;background:#ffcc76}\nbody.rx5-ui-polished #overlay select{\n background:#2b1e17;border:1px solid #af7e4d;border-radius:8px;\n color:#ffebcb;min-height:37px;\n}\nbody.rx5-ui-polished #overlay :is(button,select,summary):focus-visible,\n#rx5WhatsNew :is(button,summary):focus-visible{\n outline:3px solid #ffe9b3;outline-offset:2px;\n}\n/* Actual main menu. The original game remains behind a single simple panel. */\nbody.rx5-ui-polished #mainMenu.rx-simple-active #rxSimplePanel{\n box-sizing:border-box;width:min(560px,100%);max-width:560px;\n margin:0 auto;padding:clamp(12px,3vw,25px);\n border:1px solid #ab7b4e;border-radius:16px;\n background:linear-gradient(158deg,#4c3122,#332117 74%,#2c1b14);\n color:#fff0d2;box-shadow:0 15px 38px #130d09a6;\n}\nbody.rx5-ui-polished #rxSimplePanel *{box-sizing:border-box}\nbody.rx5-ui-polished #rxSimplePanel .rx-simple-heading{\n padding:0 0 12px;text-align:center;\n}\nbody.rx5-ui-polished #rxSimplePanel .rx-simple-brand{\n color:#fff2d9;font:950 clamp(30px,7vw,45px)/1.05 system-ui;\n letter-spacing:.095em;text-shadow:0 2px 0 #24160f;\n}\nbody.rx5-ui-polished #rxSimplePanel .rx-simple-brand b{color:#f3bb67}\nbody.rx5-ui-polished #rxSimplePanel .rx-simple-motto{\n color:#dabb90;font:650 10px/1.2 system-ui;\n letter-spacing:.17em;margin:8px 0 0;\n}\nbody.rx5-ui-polished #rxSimpleActions{max-width:510px;margin:auto}\n/* Release notes become a one-line, unobtrusive header link. */\nbody.rx5-ui-polished #rx5-release-strip{\n display:flex;justify-content:center;align-items:center;flex-wrap:wrap;gap:9px;\n margin:9px 0 0;min-height:26px;padding:0;border:0;background:transparent;\n box-shadow:none;text-align:center;\n}\nbody.rx5-ui-polished #rx5-release-strip strong{\n display:inline;color:#f0c18a;font:750 10px system-ui;letter-spacing:.07em;\n}\nbody.rx5-ui-polished #rx5-release-strip small{display:none}\nbody.rx5-ui-polished #rx5-release-strip button{\n min-height:25px!important;width:auto!important;margin:0!important;\n padding:4px 10px!important;border-radius:999px!important;\n background:#5c3d28!important;border:1px solid #966942!important;\n color:#f5d5a3!important;font:700 10px system-ui!important;\n letter-spacing:0!important;box-shadow:none!important;\n}\n/* One unequivocal primary action. */\nbody.rx5-ui-polished #mainMenu.rx-simple-active #rxSimpleActions>.rx-simple-quick{\n width:100%;min-height:82px;padding:14px 10px;margin:2px 0 11px!important;\n border-radius:13px;border:2px solid #ffe4ac!important;\n background:linear-gradient(118deg,#ffe1a3,#ebb261)!important;\n box-shadow:0 6px 20px #27180f77!important;\n color:#36200f!important;font:900 clamp(21px,4vw,26px)/1.1 system-ui!important;\n letter-spacing:.03em!important;\n}\nbody.rx5-ui-polished #mainMenu.rx-simple-active #rxSimpleActions>.rx-simple-quick:hover{\n background:linear-gradient(118deg,#fff0c8,#f8c079)!important;\n transform:translateY(-1px);\n}\nbody.rx5-ui-polished #rxSimpleActions>.rx-simple-quick small{\n color:#684528;font:550 11px/1.25 system-ui;letter-spacing:0;\n}\nbody.rx5-ui-polished #rxSimpleActions .rx-simple-grid{\n display:grid;grid-template-columns:repeat(4,minmax(0,1fr));\n gap:7px;margin:0 0 11px;\n}\nbody.rx5-ui-polished #rxSimpleActions .rx-simple-grid button{\n padding:10px 5px;min-height:53px;border-radius:10px;\n border:1px solid #9b714a;background:#563824;color:#ffecd1;\n font:750 12px/1.2 system-ui;letter-spacing:0;box-shadow:none;\n}\nbody.rx5-ui-polished #rxSimpleActions .rx-simple-grid button:hover{\n background:#79502d;border-color:#f2c182;\n}\nbody.rx5-ui-polished #rxSimplePanel .rx-simple-note{display:none}\n/* Keep two drawers in the home view — never show a wall of feature buttons. */\nbody.rx5-ui-polished #rx5Options,\nbody.rx5-ui-polished #rx5More{\n display:block;margin:7px 0!important;padding:0!important;\n border:1px solid #815b3d!important;border-radius:10px!important;\n background:#362319!important;overflow:hidden;box-shadow:none;\n}\nbody.rx5-ui-polished #rx5Options[open],\nbody.rx5-ui-polished #rx5More[open]{border-color:#c69459!important}\nbody.rx5-ui-polished #rx5Options>summary,\nbody.rx5-ui-polished #rx5More>summary{\n display:flex;align-items:center;justify-content:space-between;gap:8px;\n min-height:43px;margin:0!important;padding:10px 13px!important;\n color:#f1ddbd;font:750 12px system-ui;list-style:none;\n}\nbody.rx5-ui-polished #rx5Options>summary::-webkit-details-marker,\nbody.rx5-ui-polished #rx5More>summary::-webkit-details-marker{display:none}\nbody.rx5-ui-polished #rx5Options>summary::after,\nbody.rx5-ui-polished #rx5More>summary::after{\n content:'+';font-size:17px;color:#e7b575;\n}\nbody.rx5-ui-polished #rx5Options[open]>summary::after,\nbody.rx5-ui-polished #rx5More[open]>summary::after{content:'−'}\nbody.rx5-ui-polished #rx5Options>summary:hover,\nbody.rx5-ui-polished #rx5More>summary:hover{background:#4b3020}\nbody.rx5-ui-polished #rx5Options>summary span,\nbody.rx5-ui-polished #rx5More>summary span{display:none}\nbody.rx5-ui-polished #rx5Options #rx5Accessibility,\nbody.rx5-ui-polished #rx5Options #rx5CombatSettings{\n margin:8px!important;padding:9px!important;\n color:#f5dfbd;background:#422c20!important;\n border:1px solid #785639!important;border-radius:9px;\n}\nbody.rx5-ui-polished #rx5Options .rx-simple-difficulty{\n margin:8px!important;padding:10px;gap:10px;\n background:#442d20!important;color:#ffebc8;border-radius:9px;\n}\nbody.rx5-ui-polished #rx5Options .rx-simple-difficulty select{max-width:180px}\nbody.rx5-ui-polished #rx5Options :is(label,summary){color:#f1dfc5}\nbody.rx5-ui-polished #rx5Options :is(input[type=checkbox],input[type=radio]){\n accent-color:#e6ad58;\n}\nbody.rx5-ui-polished #rx5Options :is(#rx5CombatSettings,#rx5Accessibility) label{\n display:flex;align-items:center;gap:9px;\n}\nbody.rx5-ui-polished #rx5-gear-row{\n display:block!important;margin:10px!important;color:#f1daae!important;\n font-size:12px;\n}\nbody.rx5-ui-polished #rx5GearSelect{\n width:100%;max-width:none;min-height:37px;margin-top:7px;padding:7px;\n background:#2b1c15;color:#fce6c5;border:1px solid #a87545;\n}\nbody.rx5-ui-polished #rx5-gear-help{\n display:block;margin:0 10px 12px;color:#c9ac84;line-height:1.5;font-size:11px;\n}\nbody.rx5-ui-polished #rx5-native-main{\n display:grid;grid-template-columns:repeat(2,minmax(0,1fr));\n gap:7px;padding:6px 10px 10px;\n}\nbody.rx5-ui-polished #rx5-native-main button,\nbody.rx5-ui-polished #rx5-native-advanced button,\nbody.rx5-ui-polished #rx5-native-pause button{\n min-height:42px;padding:8px;border-radius:8px;\n background:#533623;color:#ffebca;border:1px solid #9a704b;\n font:700 12px/1.2 system-ui;cursor:pointer;\n}\nbody.rx5-ui-polished #rx5-native-main button:hover,\nbody.rx5-ui-polished #rx5-native-advanced button:hover,\nbody.rx5-ui-polished #rx5-native-pause button:hover{\n background:#714a2b;border-color:#e5b97c;\n}\nbody.rx5-ui-polished #rx5-native-main button[data-rx5-open=academy]{\n background:#684327;border-color:#d7a15d;\n}\nbody.rx5-ui-polished #rx5More .rx5-more-desc{display:none}\nbody.rx5-ui-polished #rx5Options #rx5-quick-system{\n display:grid;grid-template-columns:repeat(3,minmax(0,1fr));\n gap:7px;margin:10px 10px 12px;\n}\nbody.rx5-ui-polished #rx5-quick-system button{\n min-height:38px;background:#553721;color:#f8dfb9;\n border:1px solid #9c7045;border-radius:8px;\n font:700 11px system-ui;padding:7px;cursor:pointer;\n}\n/* Advanced menu is a footer exit, not a second primary call to action. */\nbody.rx5-ui-polished #rxSimplePanel .rx-simple-toggle{\n display:block;max-width:none;width:100%;min-height:30px;\n margin:3px 0 0;padding:5px;background:transparent!important;\n border:0!important;color:#b7a080!important;\n font:650 11px system-ui;letter-spacing:0;box-shadow:none;\n}\nbody.rx5-ui-polished #mainMenu:not(.rx-simple-active) #rxSimplePanel{\n background:transparent;border:0;box-shadow:none;padding:5px;\n}\nbody.rx5-ui-polished #mainMenu:not(.rx-simple-active) #rxSimplePanel .rx-simple-toggle{\n border:1px solid #906843!important;background:#543624!important;\n}\n/* Device-choice and pause share the same desert visuals. */\nbody.rx5-ui-polished #deviceMenu .game-title{\n font-size:clamp(48px,11vw,80px);letter-spacing:.01em;margin:8px 0;\n}\nbody.rx5-ui-polished #deviceMenu .device-grid{gap:11px}\nbody.rx5-ui-polished #deviceMenu .device-card{\n min-height:114px;background:#503725;color:#f9e4bd;\n border:1px solid #a97b4b;border-radius:13px;padding:12px;\n}\nbody.rx5-ui-polished #deviceMenu .device-card span{font-size:32px}\nbody.rx5-ui-polished #deviceMenu .device-card small{color:#d6b48a}\nbody.rx5-ui-polished #pauseMenu .subtitle{margin:7px 0 13px}\nbody.rx5-ui-polished #pauseMenu #pausedMusicNote{display:none}\nbody.rx5-ui-polished #pauseMenu .mode-grid{margin-top:11px}\nbody.rx5-ui-polished #rx5PauseSettings,\nbody.rx5-ui-polished #rx5PauseMore{\n margin:9px 0;padding:0;border:1px solid #916746;\n background:#402a1d;border-radius:10px;\n}\nbody.rx5-ui-polished #rx5PauseSettings>summary,\nbody.rx5-ui-polished #rx5PauseMore>summary{\n display:block;padding:11px;cursor:pointer;text-align:center;\n font:700 12px system-ui;color:#efd5ae;\n}\nbody.rx5-ui-polished #rx5PauseSettings>:not(summary){margin:8px!important}\nbody.rx5-ui-polished #rx5PauseSettings #v9PauseQuality{max-height:170px;overflow:auto}\nbody.rx5-ui-polished #rx5-native-advanced{display:flex;flex-wrap:wrap;gap:7px;justify-content:center;border-top:1px solid #8f694a;padding:10px;margin-top:12px}\nbody.rx5-ui-polished #rx5-native-advanced button{min-width:120px}\nbody.rx5-ui-polished [data-rx-admin-only][hidden]{display:none!important}\n/* A compact sand-toned release sheet rather than a competing huge UI. */\n#rx5WhatsNew{\n position:fixed;inset:0;z-index:2147482500;\n display:flex;align-items:center;justify-content:center;\n padding:14px;background:#150e0acf;\n}\n#rx5WhatsNew[hidden]{display:none!important}\n#rx5WhatsNew .rx5-dialog{\n box-sizing:border-box;width:min(570px,100%);max-height:89dvh;overflow:auto;\n border:1px solid #c29361;border-radius:14px;\n background:#372317;color:#fff0d8;padding:clamp(14px,3vw,22px);\n box-shadow:0 20px 60px #130b08b3;\n font:13px/1.5 system-ui;text-align:left;\n}\n#rx5WhatsNew .rx5-dialog h2{margin:0 0 8px;font-size:24px;color:#f9d59e}\n#rx5WhatsNew .rx5-dialog p{color:#ddc39d;margin:0 0 10px}\n#rx5WhatsNew .rx5-features{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:12px 0}\n#rx5WhatsNew .rx5-feature{\n padding:10px;border:1px solid #8b6243;border-radius:9px;\n background:#4a3020;min-height:65px;\n}\n#rx5WhatsNew .rx5-feature strong{display:block;font-size:12px;color:#ffda98}\n#rx5WhatsNew .rx5-feature small{display:block;margin-top:4px;color:#e2cbaa;font-size:11px}\n#rx5WhatsNew .rx5-warning{border-top:1px solid #896446;padding:11px;color:#d9c19f;font-size:11px}\n#rx5WhatsNew .rx5-dialog-actions{display:flex;justify-content:flex-end;flex-wrap:wrap;gap:8px;margin-top:12px}\n#rx5WhatsNew button{\n border-radius:8px;border:1px solid #e4b77d;background:#674329;\n color:#f9e8c8;padding:10px 12px;font:700 12px system-ui;cursor:pointer;\n}\n#rx5WhatsNew button[data-rx5-close]{background:#f1be79;color:#2a170e}\n/* Focus HUD remains legible with classic sand styling and no new buttons. */\nbody.rx5-ui-polished #hud.active .hud-panel{\n background:#322215c7;border:1px solid #ca985f55;\n border-radius:10px;box-shadow:none;backdrop-filter:none;\n}\nbody.rx5-ui-polished #hud.active .hud-center{top:12px;min-width:125px}\nbody.rx5-ui-polished #hud.active .hud-center strong{font-size:clamp(17px,3vw,24px)}\nbody.rx5-ui-polished #hud.active .hud-kills{gap:11px}\nbody.rx5-ui-polished #hud.active .hud-bottom{gap:8px}\nbody.rx5-ui-polished #hud.active .meter{height:8px;margin-bottom:8px}\nbody.rx5-ui-polished #hud.active .ammo-num{font-size:clamp(28px,4vw,42px)}\nbody.rx5-ui-polished #hud.active #minimap{border-radius:9px}\nbody.rx5-ui-polished.rx5-focus-hud #hudPlayers,\nbody.rx5-ui-polished.rx5-focus-hud #hud .hudwallet,\nbody.rx5-ui-polished.rx5-focus-hud #hud .weapon-keys,\nbody.rx5-ui-polished.rx5-focus-hud #rx5MasteryHud{display:none!important}\nbody.rx5-ui-polished.rx5-focus-hud #hud .hud-logo{font-size:clamp(12px,2vw,16px)}\nbody.rx5-ui-polished.rx5-focus-hud #hud .sneak-label{display:none}\nbody.rx5-ui-polished.rx5-focus-hud #hud .sprint-box{opacity:.85}\n@media(max-width:650px){\n body.rx5-ui-polished #overlay{padding:8px}\n body.rx5-ui-polished #overlay .panel{max-height:calc(100dvh - 16px);border-radius:12px}\n body.rx5-ui-polished #overlay .panel-content{padding:12px}\n body.rx5-ui-polished #mainMenu.rx-simple-active #rxSimplePanel{padding:13px 12px}\n body.rx5-ui-polished #rxSimpleActions .rx-simple-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}\n body.rx5-ui-polished #rxSimpleActions .rx-simple-grid button{min-height:43px}\n body.rx5-ui-polished #mainMenu.rx-simple-active #rxSimpleActions>.rx-simple-quick{min-height:67px}\n body.rx5-ui-polished #mainMenu.rx-simple-active #rxSimplePanel .rx-simple-heading{padding-bottom:8px}\n body.rx5-ui-polished #rx5Options>summary,body.rx5-ui-polished #rx5More>summary{min-height:39px}\n body.rx5-ui-polished #hud.active .hud-center{top:8px}\n body.rx5-ui-polished #hud.active .hud-panel{padding:6px 8px}\n body.rx5-ui-polished #hud.active .hud-bottom .ammo-num{font-size:28px}\n body.rx5-ui-polished #hud.active .hud-bottom .healthblock{max-width:160px}\n body.rx5-ui-polished #rx5WhatsNew .rx5-features{grid-template-columns:1fr}\n}\n@media(max-height:480px){\n body.rx5-ui-polished #overlay{padding:5px}\n body.rx5-ui-polished #overlay .panel{max-height:calc(100dvh - 10px)}\n body.rx5-ui-polished #mainMenu.rx-simple-active #rxSimplePanel{padding:9px 12px}\n body.rx5-ui-polished #rxSimplePanel .rx-simple-brand{font-size:28px}\n body.rx5-ui-polished #rx5-release-strip{margin-top:4px}\n body.rx5-ui-polished #mainMenu.rx-simple-active #rxSimpleActions>.rx-simple-quick{\n  min-height:54px;padding:8px!important;margin-bottom:5px!important;font-size:19px!important;\n }\n body.rx5-ui-polished #rxSimpleActions .rx-simple-grid{margin-bottom:5px}\n body.rx5-ui-polished #rxSimpleActions .rx-simple-grid button{min-height:35px;padding:6px;font-size:11px}\n body.rx5-ui-polished #rx5Options,body.rx5-ui-polished #rx5More{margin:5px 0!important}\n body.rx5-ui-polished #rxSimplePanel .rx-simple-toggle{margin:2px 0}\n}\n@media(prefers-reduced-motion:reduce){\n body.rx5-ui-polished #overlay *,#rx5WhatsNew *{animation:none!important;transition:none!important}\n}\n";
document.head.append(style);
const hero=document.createElement('div');
hero.id='rx5-release-strip';
hero.setAttribute('aria-label','Current RECOIL X version');
hero.innerHTML='<div><strong>Z.5 · TACTICAL EXPANSION</strong><small>Latest update</small></div><button type="button" id="rx5-open-news">Updates</button>';
(simple.closest('#rxSimplePanel')?.querySelector('.rx-simple-heading')||simple).append(hero);
const news=document.createElement('div');
news.id='rx5WhatsNew';news.hidden=true;
news.setAttribute('role','dialog');news.setAttribute('aria-modal','true');
news.setAttribute('aria-label','Z.5 update details');
news.innerHTML=[
'<div class="rx5-dialog"><h2>RECOIL X <span style="color:#69e3de">Z.5</span></h2>',
'<p>TACTICAL EXPANSION — playable new features added to the existing game.</p>',
'<div class="rx5-features">',
'<div class="rx5-feature"><strong>⚡ EMP Grenades</strong><small>Temporarily disable nearby bots in solo play. Select EMP from Tactical Gear and press G or use the touch gadget control.</small></div>',
'<div class="rx5-feature"><strong>🛡 Deployable Shields</strong><small>Place destructible cover for 12 seconds in a clear area. Solo-only and limited by shared gadget stock.</small></div>',
'<div class="rx5-feature"><strong>🔧 Weapon Blueprints</strong><small>Unlock Steady, Rapid and Impact tuning via offline weapon mastery. Changes to spread, fire rate or damage are real.</small></div>',
'<div class="rx5-feature"><strong>🎓 Training Academy</strong><small>Precision, Tracking and Reaction lessons in the existing 3D range, with persistent local medals.</small></div>',
'<div class="rx5-feature"><strong>🤖 Veteran & Nightmare Bots</strong><small>Flank, hide and peek. Choose Standard, Veteran or Nightmare in Combat Settings.</small></div>',
'<div class="rx5-feature"><strong>📱 Mobile Performance Guard</strong><small>Fewer low-priority effects during heavy action and adaptive rendering on slow devices.</small></div>',
'<div class="rx5-feature"><strong>🎯 Cleaner Aim</strong><small>Optional high-visibility crosshair and a compact heat indicator in the HUD.</small></div>',
'<div class="rx5-feature"><strong>🛡 Multiplayer Safety</strong><small>Server-side weapon heat and protection against excessive input traffic in casual games.</small></div>',
'</div>',
'<div class="rx5-warning">Z.5 is still a staged roadmap. EMPs and portable shields are offline-only; the 85-feature list is not yet complete.</div>',
'<div class="rx5-dialog-actions"><button type="button" id="rx5-news-options">COMBAT SETTINGS</button><button type="button" data-rx5-close>GOT IT</button></div></div>'
].join('');
document.body.append(news);
let previousFocus=null;
function showNews(){
 previousFocus=document.activeElement;
 news.hidden=false;
 document.exitPointerLock?.();
 news.querySelector('[data-rx5-close]')?.focus();
}
function hideNews(){
 news.hidden=true;
 if(previousFocus?.isConnected)previousFocus.focus();
}
$('rx5-open-news').addEventListener('click',showNews);
news.querySelector('[data-rx5-close]').addEventListener('click',hideNews);
news.addEventListener('pointerdown',event=>event.stopPropagation());
news.addEventListener('click',event=>{if(event.target===news)hideNews();});
document.addEventListener('keydown',event=>{if(!news.hidden&&event.key==='Escape'){event.preventDefault();hideNews();}},true);
news.querySelector('#rx5-news-options').addEventListener('click',()=>{
 hideNews();
 const details=$('rx5Options');
 if(details){details.open=true;details.scrollIntoView?.({block:'nearest',behavior:'auto'});}
});
function makeButton(parent,key,label,admin=false){
 const button=document.createElement('button');button.type='button';button.textContent=label;
 button.dataset.rx5Open=key;
 if(admin){button.dataset.rxAdminOnly='';button.hidden=true;button.setAttribute('aria-label','Admin controls');}
 button.addEventListener('click',()=>{void open(key);});
 parent.append(button);
 return button;
}
const more=document.createElement('details');more.id='rx5More';
more.innerHTML='<summary>MORE FEATURES <span style="font-weight:400;color:#8ab0bf">Career · Forge · Online</span></summary><span class="rx5-more-desc">Advanced features are still here whenever you need them.</span>';
const simpleGroup=document.createElement('div');simpleGroup.id='rx5-native-main';
simpleGroup.setAttribute('aria-label','More RECOIL X game features');more.append(simpleGroup);
const grid=simple.querySelector('.rx-simple-grid');
if(grid)grid.after(more);else simple.append(more);
const settings=document.createElement('details');settings.id='rx5Options';
settings.innerHTML='<summary>COMBAT, PERFORMANCE & ACCESSIBILITY <span style="font-weight:400;color:#8ab0bf">⚙</span></summary>';
more.before(settings);
for(const id of ['rxSimpleBotLevel','rx5Accessibility','rx5CombatSettings']){
 const el=$(id);if(!el)continue;
 settings.append(el.closest('.rx-simple-difficulty')||el);
}
const gearRow=document.createElement('label');gearRow.id='rx5-gear-row';
 gearRow.textContent='TACTICAL GEAR · choose before a solo match';
 const gearSelect=document.createElement('select');gearSelect.id='rx5GearSelect';
 const gearNames={smoke:'Smoke cover',flash:'Flash stun',decoy:'Decoy',scanner:'Enemy scanner',emp:'EMP grenade (solo)',shield:'Deployable shield (solo)'};
 for(const [key,title] of Object.entries(gearNames)){
   const choice=document.createElement('option');choice.value=key;choice.textContent=title;gearSelect.append(choice);
 }
 const updateGear=()=>{if(window.RXZ5Gear)gearSelect.value=window.RXZ5Gear.current();};
 gearSelect.onchange=()=>{if(!window.RXZ5Gear?.select(gearSelect.value))updateGear();};
 gearRow.append(gearSelect);settings.append(gearRow);
 const gearHelp=document.createElement('small');gearHelp.id='rx5-gear-help';
 gearHelp.textContent='Press G in an offline match or tap the GADGET button on mobile. EMP and shields never affect ranked or multiplayer.';
 settings.append(gearHelp);updateGear();
const quickSystem=document.createElement('div');quickSystem.id='rx5-quick-system';
for(const [name,target] of [['Graphics','graphicsBtn'],['Audio','soundBtn'],['Device','deviceBtn']]){
 const b=document.createElement('button');b.type='button';b.textContent=name;
 b.addEventListener('click',()=>$(target)?.click());quickSystem.append(b);
}
settings.append(quickSystem);
const simpleSettings=$('rxSimpleSettings');
if(simpleSettings)simpleSettings.onclick=()=>{settings.open=!settings.open;if(settings.open){more.open=false;settings.scrollIntoView?.({block:'nearest'});}};
const advancedGroup=document.createElement('div');advancedGroup.id='rx5-native-advanced';
advancedGroup.setAttribute('aria-label','Advanced RECOIL X shortcuts');
menu.append(advancedGroup);
const pauseMore=document.createElement('details');pauseMore.id='rx5PauseMore';
pauseMore.innerHTML='<summary>MORE FEATURES · Z.5</summary>';
const pauseControls=pause.querySelector('.mode-grid');
const pauseSettings=document.createElement('details');pauseSettings.id='rx5PauseSettings';
pauseSettings.innerHTML='<summary>GRAPHICS & PERFORMANCE</summary>';
if(pauseControls)pauseControls.before(pauseSettings);else pause.append(pauseSettings);
for(const id of ['v9PauseQuality','v92PauseRow']){const el=$(id);if(el)pauseSettings.append(el);}
const perf=$('v91PauseProfile')?.parentElement;if(perf)pauseSettings.append(perf);
const pauseGroup=document.createElement('div');pauseGroup.id='rx5-native-pause';
pauseMore.append(pauseGroup);pause.append(pauseMore);
for(const target of [simpleGroup,advancedGroup,pauseGroup]){
 makeButton(target,'academy','🎓 Training Academy');
 makeButton(target,'career','🏅 Career & Clans');
 makeButton(target,'market','⚒ Forge & Market');
 makeButton(target,'matches','🌐 Match Hub');
 makeButton(target,'admin','🛡 Admin',true);
}
makeButton(advancedGroup,'news','✦ What\'s New');
const pauseNews=document.createElement('button');
pauseNews.type='button';pauseNews.textContent='✦ Z.5 UPDATE NOTES';
pauseNews.addEventListener('click',showNews);
pauseNews.style.cssText='display:block;margin:8px auto;padding:8px 15px;border:1px solid #37687d;border-radius:9px;background:#143c51;color:#e4fdff;cursor:pointer';
pauseGroup.append(pauseNews);
function currentToken(){try{return sessionStorage.getItem('rx5-token')||'';}catch{return '';}}
function career(){if(!window.RXZ5Career?.open)throw Error('Career features unavailable');return window.RXZ5Career.open();}
async function open(key){
 try{
   if(key==='news'){showNews();return;}
   if(key==='academy'){if(!window.RXZ5Academy?.open)throw Error('Academy unavailable');return window.RXZ5Academy.open();}
   if(key==='admin'){if(!window.RXZ5Admin?.open)throw Error('Admin features unavailable');return await window.RXZ5Admin.open();}
   if(key==='career'||!currentToken())return await career();
   if(key==='market'){if(!window.RXZ5Economy?.open)throw Error('Forge unavailable');return await window.RXZ5Economy.open();}
   if(key==='matches'){if(!window.RXZ5MatchHub?.open)throw Error('Match Hub unavailable');return await window.RXZ5MatchHub.open();}
 }catch(error){console.warn('RECOIL X Z.5 navigation:',error);try{await career();}catch{}}
}
document.body.classList.add('rx5-ui-polished');
window.RXZ5InGame={open,showNews,version:'Z.5-SAND-6'};
window.RXZ5Admin?.refresh();
})();