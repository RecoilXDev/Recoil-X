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
style.textContent=[
'#rxSimplePanel{border:1px solid #335d75!important;border-radius:19px!important;background:linear-gradient(155deg,#0b1c2eee,#101d30fa)!important;box-shadow:0 18px 54px #0009!important}',
'#mainMenu.rx-simple-active #rxSimplePanel{width:min(670px,96%);max-width:670px;margin:0 auto;padding:clamp(13px,3vw,26px)}',
'#rxSimplePanel .rx-simple-brand{letter-spacing:.11em;font-size:clamp(28px,6vw,43px)}',
'#rxSimplePanel .rx-simple-motto{margin-bottom:12px;color:#9db4c6}',
'#mainMenu.rx-simple-active .rx-simple-heading{text-align:center}',
'#mainMenu.rx-simple-active #rxSimpleActions{max-width:600px;margin:auto}',
'#mainMenu.rx-simple-active #rxSimpleActions>.rx-simple-quick{margin:6px auto 13px;min-height:88px;background:linear-gradient(100deg,#0d7790,#199a97);border:1px solid #74e7e6;color:#fff}',
'#mainMenu.rx-simple-active #rxSimpleActions>.rx-simple-quick:hover{filter:brightness(1.09)}',
'#rx5-native-main button[data-rx5-open=academy]{border-color:#5a9995;color:#bdfff1}',
'#rxSimpleActions .rx-simple-quick{margin-top:10px;border-radius:12px;min-height:76px;font-size:20px;box-shadow:0 10px 26px #0005}',
'#rxSimpleActions .rx-simple-grid{gap:8px;margin:11px 0}',
'#rxSimpleActions .rx-simple-grid button{min-height:54px;background:#122c40;border:1px solid #375975;font-weight:700}',
'#rxSimpleActions .rx-simple-grid button:hover,#rx5-native-main button:hover{border-color:#5ed4e4;background:#174661}',
'#rxSimplePanel .rx-simple-note{display:none}',
'#rx5-release-strip{display:flex;gap:10px;align-items:center;justify-content:space-between;text-align:left;margin:0 0 10px;padding:9px 11px;border-radius:11px;border:1px solid #266477;background:#113047}',
'#rx5-release-strip strong{display:block;color:#91f2ef;font-size:11px;letter-spacing:.12em}',
'#rx5-release-strip small{display:block;color:#b8d3e0;font-size:11px;line-height:1.5}',
'#rx5-release-strip button{width:auto!important;min-height:36px!important;padding:6px 12px!important;background:#1b5366!important;border-color:#3e96a2!important;color:#ecffff!important;font-size:11px!important;white-space:nowrap}',
'#rx5More,#rx5Options{border:1px solid #36566c;border-radius:12px;margin:10px 0;background:#0c2234;overflow:hidden;text-align:left}',
'#rx5More>summary,#rx5Options>summary{list-style:none;cursor:pointer;padding:13px 14px;font:750 12px/1.3 system-ui;color:#d5edfc;display:flex;align-items:center;justify-content:space-between;gap:8px}',
'#rx5More>summary::-webkit-details-marker,#rx5Options>summary::-webkit-details-marker{display:none}',
'#rx5More>summary:after,#rx5Options>summary:after{content:"＋";font-size:17px;color:#85dfe2}',
'#rx5More[open]>summary:after,#rx5Options[open]>summary:after{content:"−"}',
'#rx5More>summary:hover,#rx5Options>summary:hover{background:#143a4f}',
'#rx5More .rx5-more-desc{display:block;color:#91acbf;font-size:10px;font-weight:450;padding:0 14px 10px}',
'#rx5-native-main{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;padding:0 12px 12px}',
'#rx5Options #rx5-gear-row{margin:9px 10px;color:#d7edf6;font-size:12px}',
'#rx5GearSelect{width:100%;min-height:38px;margin-top:6px;border:1px solid #41768c;border-radius:9px;background:#0b2638;color:#eff;padding:8px}',
'#rx5-gear-help{display:block;margin:0 10px 12px;color:#a0bccd;font-size:11px;line-height:1.4}',
'#rx5-native-main button,#rx5-native-advanced button,#rx5-native-pause button{border:1px solid #305c74;border-radius:10px;background:#16344a;color:#ecf7ff;font:700 12px/1.25 system-ui;min-height:43px;padding:9px 8px;cursor:pointer;text-align:center}',
'#rx5-native-main button:focus-visible,#rx5-native-advanced button:focus-visible,#rx5-native-pause button:focus-visible,#rx5-release-strip button:focus-visible{outline:3px solid #83eef0;outline-offset:2px}',
'#rx5Options .rx-simple-difficulty{margin:0 10px 8px;border:0;border-radius:8px;padding:10px;background:#102d40}',
'#rx5Options #rx5Accessibility,#rx5Options #rx5CombatSettings{margin:8px 10px;border-radius:9px}',
'#rx5Options #rx5CombatSettings label{min-height:30px}',
'#rx5-native-advanced{display:flex;justify-content:center;flex-wrap:wrap;gap:7px;margin:14px auto;padding:10px 0;border-top:1px solid #345369}',
'#rx5-native-advanced button{min-width:110px;padding:10px}',
'#rx5-native-pause{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;padding:10px}',
'#rx5PauseMore{border:1px solid #39556b;border-radius:12px;margin-top:10px;background:#102538}',
'#rx5PauseMore>summary{padding:10px 12px;cursor:pointer;text-align:center;color:#d1ecfa;font:700 12px system-ui}',
'#rx5-native-main [data-rx-admin-only],#rx5-native-advanced [data-rx-admin-only],#rx5-native-pause [data-rx-admin-only]{border-color:#967a43;color:#ffe0ac}',
'[data-rx-admin-only][hidden]{display:none!important}',
'#rx5WhatsNew{position:fixed;inset:0;z-index:2147482500;display:flex;align-items:center;justify-content:center;background:#020914eb;padding:18px;box-sizing:border-box}',
'#rx5WhatsNew[hidden]{display:none!important}',
'#rx5WhatsNew .rx5-dialog{box-sizing:border-box;width:min(560px,100%);max-height:min(680px,90vh);overflow:auto;padding:22px;background:#101e2d;color:#f0faff;border:1px solid #406a80;border-radius:18px;box-shadow:0 30px 80px #000c;font:14px/1.55 system-ui;text-align:left}',
'#rx5WhatsNew .rx5-dialog h2{font:850 26px system-ui;margin:0 0 7px;letter-spacing:.06em}',
'#rx5WhatsNew .rx5-dialog p{color:#abc6d7;margin:0 0 12px}',
'#rx5WhatsNew .rx5-features{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:15px 0}',
'#rx5WhatsNew .rx5-feature{background:#132f42;border:1px solid #36566c;border-radius:11px;padding:11px;min-height:72px}',
'#rx5WhatsNew .rx5-feature strong{display:block;color:#9fe9e9;font-size:12px}',
'#rx5WhatsNew .rx5-feature small{display:block;color:#bbd0df;font-size:11px;margin-top:4px}',
'#rx5WhatsNew .rx5-warning{padding:11px;border-top:1px solid #375469;color:#a9bed1;font-size:12px}',
'#rx5WhatsNew .rx5-dialog-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px;margin-top:14px}',
'#rx5WhatsNew button{border:1px solid #47778a;border-radius:9px;color:white;background:#174458;padding:10px 14px;cursor:pointer;font:700 12px system-ui}',
'#rx5WhatsNew button[data-rx5-close]{background:#217a8c}',
'#deviceMenu>.topline .brandchip{letter-spacing:.08em}',
'#deviceMenu .game-title{letter-spacing:.09em}',
'#deviceMenu .device-grid{gap:12px}',
'#deviceMenu .device-card{border-radius:15px}',
'#mainMenu .versionlabel{letter-spacing:.06em}',
'@media(max-width:500px){#rx5-native-main{grid-template-columns:repeat(2,minmax(0,1fr))}#rx5-release-strip{gap:6px;padding:9px}#rx5-release-strip button{padding:7px!important;font-size:10px!important}#rx5WhatsNew .rx5-features{grid-template-columns:1fr}#rx5WhatsNew .rx5-dialog{padding:16px}#rxSimpleActions .rx-simple-grid button{font-size:12px}}',
'@media(prefers-reduced-motion:reduce){#rx5WhatsNew *,#rxSimplePanel *{animation:none!important;transition:none!important}}'
].join('\n');
style.textContent += "\n/* RESTORED SANDSTORM DESIGN — fewer surfaces, warm sand, one obvious action. */\nbody.rx5-sand{--rx5-sand:#e9b96f;--rx5-sandlight:#ffe2b0;--rx5-clay:#af7049;--rx5-stone:#2a211b;--rx5-cream:#f7e9d4}\nbody.rx5-sand #overlay{background:radial-gradient(ellipse at 78% 15%,rgba(209,133,60,.22),transparent 55%),linear-gradient(145deg,#261c18f5,#38261cf2 60%,#231a16f8)}\nbody.rx5-sand #overlay::before{display:none}\nbody.rx5-sand #overlay .panel{width:min(760px,100%);max-height:calc(100dvh - 22px);overflow:auto;border:1px solid #836447;border-radius:17px;background:linear-gradient(155deg,#3e2d22fa,#251d19fa);box-shadow:0 18px 52px #130b08aa;scrollbar-width:thin;scrollbar-color:#886044 transparent}\nbody.rx5-sand #overlay .panel::before{background:linear-gradient(90deg,transparent,#f3c47b,transparent);height:2px}\nbody.rx5-sand #overlay :is(.eyebrow,.sunmark){color:#f2c989;letter-spacing:.12em}\nbody.rx5-sand #overlay .brandchip{background:#473126;border:1px solid #8c6442;border-radius:8px;color:#ffe3b2}\nbody.rx5-sand #overlay :is(.subtitle,.menu-note){color:#dec5a6}\nbody.rx5-sand #overlay .game-title{color:#fff1d7;text-shadow:0 2px 6px #100b09}\nbody.rx5-sand #overlay .game-title span{color:#f4c879;text-shadow:none}\nbody.rx5-sand #overlay :is(.primary,.secondary,.choice){box-shadow:none;transition:background-color .12s ease,border-color .12s ease}\nbody.rx5-sand #overlay .primary{color:#302015;background:linear-gradient(125deg,#f7d99b,#e7ae65);border:1px solid #ffe2af}\nbody.rx5-sand #overlay .secondary{color:#fae8cf;background:#4b3428;border:1px solid #8c6647}\nbody.rx5-sand #overlay .choice{color:#ffefd5;background:#4e392b;border-color:#9b714a}\nbody.rx5-sand #overlay .secondary:hover,body.rx5-sand #overlay .choice:hover{background:#6a4833;border-color:#e4b475}\nbody.rx5-sand #overlay :is(.primary,.choice,.secondary):focus-visible,body.rx5-sand #overlay select:focus-visible,body.rx5-sand #overlay summary:focus-visible{outline:2px solid #ffe6b2;outline-offset:2px}\nbody.rx5-sand #mainMenu.rx-simple-active #rxSimplePanel{width:min(570px,100%);max-width:570px;margin:0 auto;padding:clamp(17px,3vw,25px);border:1px solid #956c45;border-radius:15px;background:linear-gradient(162deg,#493427,#34261e);box-shadow:none;color:#ffe9ca}\nbody.rx5-sand #rxSimplePanel .rx-simple-heading{padding:0 0 19px;text-align:center}\nbody.rx5-sand #rxSimplePanel .rx-simple-brand{font:900 clamp(31px,7vw,42px)/1.1 system-ui;letter-spacing:.10em;color:#fff2d7;text-shadow:0 2px 1px #24170c}\nbody.rx5-sand #rxSimplePanel .rx-simple-brand b{color:#f5c379}\nbody.rx5-sand #rxSimplePanel .rx-simple-motto{margin:7px 0 0;color:#ddbb90;letter-spacing:.19em;font-size:10px}\nbody.rx5-sand #rx5-release-strip{display:flex;align-items:center;justify-content:center;gap:5px;margin:9px 0 0;padding:0;border:0;background:none;min-height:0;text-align:center;box-shadow:none}\nbody.rx5-sand #rx5-release-strip strong{color:#e9c08a;font:700 10px system-ui;letter-spacing:.04em}\nbody.rx5-sand #rx5-release-strip small,body.rx5-sand #rx5-release-strip button{display:none!important}\nbody.rx5-sand #rxSimpleActions>.rx-simple-quick,body.rx5-sand #mainMenu.rx-simple-active #rxSimpleActions>.rx-simple-quick{width:100%;min-height:92px;margin:0 0 13px;padding:14px 12px;border:1px solid #ffe5b9;border-radius:12px;color:#302011;background:linear-gradient(125deg,#f9d99d,#e9b26b);box-shadow:0 7px 20px #24140966;font:900 clamp(21px,5vw,27px)/1.1 system-ui;letter-spacing:.02em}\nbody.rx5-sand #rxSimpleActions>.rx-simple-quick:hover{filter:brightness(1.09)}\nbody.rx5-sand #rxSimpleActions>.rx-simple-quick small{color:#654427;font-size:11px;font-weight:650;letter-spacing:0}\nbody.rx5-sand #rxSimpleActions .rx-simple-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:0 0 13px}\nbody.rx5-sand #rxSimpleActions .rx-simple-grid button{min-height:54px;padding:9px 4px;border-radius:9px;border:1px solid #8f6745;background:#583f2f;color:#fae8cd;font:750 12px/1.4 system-ui;letter-spacing:0;box-shadow:none}\nbody.rx5-sand #rxSimpleActions .rx-simple-grid button:hover{background:#745038;border-color:#e7b67a}\nbody.rx5-sand #rx5More{margin:9px 0 0!important;padding:0!important;border:1px solid #8b6043!important;border-radius:9px!important;background:#35271f!important;overflow:hidden}\nbody.rx5-sand #rx5More>summary{margin:0!important;min-height:43px;padding:11px 13px!important;font:750 12px/1.3 system-ui;letter-spacing:.04em;color:#f1d2a6;text-align:left}\nbody.rx5-sand #rx5More>summary span,body.rx5-sand #rx5More .rx5-more-desc{display:none!important}\nbody.rx5-sand #rx5More[open]{border-color:#d6a46a!important}\nbody.rx5-sand #rx5-native-main{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;padding:3px 10px 11px}\nbody.rx5-sand #rx5-native-main button{min-height:44px;padding:8px 5px;font:700 11px/1.35 system-ui;color:#f7e6c9;background:#503929;border:1px solid #846247;border-radius:8px}\nbody.rx5-sand #rx5-native-main button:hover{background:#6a4831}\nbody.rx5-sand #rx5Options{margin:9px 0!important;padding:0!important;border:1px solid #946a46!important;background:#34271f!important;border-radius:9px!important;overflow:hidden}\nbody.rx5-sand #rx5Options:not([open]){display:none!important}\nbody.rx5-sand #rx5Options>summary{margin:0!important;padding:12px!important;min-height:42px;font:750 12px system-ui;color:#f6ddb6}\nbody.rx5-sand #rx5Options :is(#rx5CombatSettings,#rx5Accessibility){margin:8px 10px;border-color:#77553c!important;background:#433125!important;border-radius:8px}\nbody.rx5-sand #rx5Options .rx-simple-difficulty{margin:9px 10px;padding:9px;background:#4b372a!important;color:#f5dbb8;border-radius:8px}\nbody.rx5-sand #rx5Options #rx5-gear-row{display:block;margin:9px 10px;color:#efd4af;font-size:12px}\nbody.rx5-sand #rx5Options #rx5GearSelect,body.rx5-sand #overlay select{max-width:100%;border:1px solid #a0774f;border-radius:8px;background:#3c2c24;color:#ffecd0}\nbody.rx5-sand #rx5-gear-help{display:block;margin:0 10px 10px;color:#dbc6ac}\nbody.rx5-sand #rx5-quick-system{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin:9px 10px 12px}\nbody.rx5-sand #rx5-quick-system button{min-height:38px;border:1px solid #996d48;border-radius:8px;background:#5b4230;color:#f7e4c8;font:700 11px system-ui}\nbody.rx5-sand #mainMenu.rx-simple-active #rxSimpleToggle{display:none!important}\nbody.rx5-sand #mainMenu:not(.rx-simple-active) #rxSimpleToggle{display:block!important;margin:8px auto}\nbody.rx5-sand #rx5WhatsNew{background:#140d09e8}\nbody.rx5-sand #rx5WhatsNew .rx5-dialog{background:#37271e;border:1px solid #aa784c;color:#fae9d3;box-shadow:0 20px 64px #100908b8}\nbody.rx5-sand #rx5WhatsNew .rx5-dialog h2{color:#ffdd9f}\nbody.rx5-sand #rx5WhatsNew .rx5-feature{background:#503b2b;border-color:#916d4c}\nbody.rx5-sand #rx5WhatsNew .rx5-feature strong{color:#ffdc9b}\nbody.rx5-sand #rx5WhatsNew .rx5-feature small{color:#efdbbf}\nbody.rx5-sand #rx5WhatsNew button{background:#63462f;border-color:#ac8053;color:#ffe7bb}\nbody.rx5-sand #deviceMenu .game-title{font-size:clamp(50px,12vw,76px)}\nbody.rx5-sand #deviceMenu .device-grid{gap:9px}\nbody.rx5-sand #deviceMenu .device-card{min-height:110px;padding:12px;border-radius:12px;background:#57402e;border-color:#a27b4e}\nbody.rx5-sand #deviceMenu .device-card span{font-size:31px}\nbody.rx5-sand #deviceMenu .device-card small{color:#e5c7a1}\nbody.rx5-sand #pauseMenu #pausedMusicNote{display:none}\nbody.rx5-sand #pauseMenu .subtitle{margin:6px 0 11px}\nbody.rx5-sand #rx5PauseSettings,body.rx5-sand #rx5PauseMore{border:1px solid #816044;border-radius:10px;background:#37281e;margin:9px 0}\nbody.rx5-sand #rx5PauseSettings>summary,body.rx5-sand #rx5PauseMore>summary{display:block;padding:11px;text-align:center;color:#f4d4a6;font:700 12px system-ui}\nbody.rx5-sand #rx5PauseSettings #v9PauseQuality{max-height:170px;overflow:auto}\nbody.rx5-sand #hud.active .hud-panel{border:1px solid #f6d3a12e;background:#2f221bc7;box-shadow:none;backdrop-filter:none;border-radius:10px}\nbody.rx5-sand #hud.active .hud-center{min-width:130px;top:13px}\nbody.rx5-sand #hud.active .hud-center strong{font-size:clamp(17px,3vw,23px)}\nbody.rx5-sand #hud.active .meter{height:8px;margin-bottom:8px}\nbody.rx5-sand #hud.active .ammo-num{font-size:clamp(29px,4vw,42px)}\nbody.rx5-sand.rx5-focus-hud #hud .hudwallet,body.rx5-sand.rx5-focus-hud #hud .weapon-keys,body.rx5-sand.rx5-focus-hud #rx5MasteryHud{display:none!important}\nbody.rx5-sand.rx5-focus-hud #hud .hud-logo{font-size:clamp(12px,2vw,16px)}\nbody.rx5-sand.rx5-focus-hud #tips{display:none!important}\n@media(max-width:600px){\n body.rx5-sand #overlay{padding:8px}\n body.rx5-sand #overlay .panel{max-height:calc(100dvh - 16px);border-radius:12px}\n body.rx5-sand #overlay .panel-content{padding:13px}\n body.rx5-sand #mainMenu.rx-simple-active #rxSimplePanel{padding:14px 12px}\n body.rx5-sand #rxSimpleActions .rx-simple-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}\n body.rx5-sand #rxSimpleActions .rx-simple-grid button{min-height:43px}\n body.rx5-sand #mainMenu.rx-simple-active #rxSimpleActions>.rx-simple-quick{min-height:74px}\n body.rx5-sand #rxSimplePanel .rx-simple-heading{padding-bottom:12px}\n body.rx5-sand #rx5Options .rx-simple-difficulty{flex-direction:column}\n body.rx5-sand #rx5Options select{width:100%}\n}\n@media(max-height:480px){\n body.rx5-sand #overlay .panel{max-height:calc(100dvh - 10px)}\n body.rx5-sand #mainMenu.rx-simple-active #rxSimplePanel{padding:9px 11px}\n body.rx5-sand #rxSimplePanel .rx-simple-brand{font-size:26px}\n body.rx5-sand #rxSimplePanel .rx-simple-heading{padding-bottom:5px}\n body.rx5-sand #rx5-release-strip{margin:3px 0 0}\n body.rx5-sand #mainMenu.rx-simple-active #rxSimpleActions>.rx-simple-quick{min-height:60px;margin-bottom:7px;padding:8px;font-size:20px}\n body.rx5-sand #rxSimpleActions .rx-simple-grid{margin-bottom:6px}\n body.rx5-sand #rxSimpleActions .rx-simple-grid button{min-height:35px;font-size:11px}\n body.rx5-sand #rx5More{margin:4px 0!important}\n}\n@media(prefers-reduced-motion:reduce){body.rx5-sand #overlay *{transition:none!important;animation:none!important}}\n";
document.head.append(style);
const hero=document.createElement('div');
hero.id='rx5-release-strip';
hero.setAttribute('aria-label','Current RECOIL X version');
hero.innerHTML='<div><strong>VERSION Z.5</strong><small>Sandstorm Edition</small></div><button type="button" id="rx5-open-news">Updates</button>';
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
more.innerHTML='<summary>MORE <span>All game features</span></summary><span class="rx5-more-desc">The rest of RECOIL X is still here.</span>';
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
more.addEventListener('click',event=>{if(event.target.closest?.('summary')&&!more.open)settings.open=false;});
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
makeButton(simpleGroup,'news','✦ Update Notes');
const openAdvanced=document.createElement('button');openAdvanced.type='button';openAdvanced.id='rx5OpenAdvanced';openAdvanced.textContent='Full Classic Menu';
openAdvanced.addEventListener('click',()=>{const toggle=$('rxSimpleToggle');if(toggle)toggle.click();});
simpleGroup.append(openAdvanced);
const pauseNews=document.createElement('button');
pauseNews.type='button';pauseNews.textContent='✦ Z.5 UPDATE NOTES';
pauseNews.addEventListener('click',showNews);
pauseNews.style.cssText='display:block;margin:8px auto;padding:8px 15px;border:1px solid #37687d;border-radius:9px;background:#143c51;color:#e4fdff;cursor:pointer';
pauseMore.append(pauseNews);
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
document.body.classList.add('rx5-sand');
// Returning players see the clean, recognizable original sand menu by default.
// Preserve explicit user choices when switching between compact and classic views.
window.RXZ5InGame={open,showNews,version:'Z.5-SAND-6'};
window.RXZ5Admin?.refresh();
})();