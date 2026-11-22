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
style.textContent += "\n\n/* Z.5 clean navigation: one dominant Play action, quiet secondary controls.\n   Overrides only presentation; legacy modes and user data remain untouched. */\nbody.rx5-ui-polished #overlay{\n background:radial-gradient(circle at 50% -28%,rgba(32,117,132,.25),transparent 55%),rgba(4,10,19,.91);\n}\nbody.rx5-ui-polished #overlay::before{display:none}\nbody.rx5-ui-polished #overlay .panel{\n width:min(760px,100%);border:1px solid #253d50;border-radius:20px;\n background:linear-gradient(145deg,rgba(11,24,38,.98),rgba(6,16,29,.98));\n box-shadow:0 22px 72px rgba(0,0,0,.45);backdrop-filter:blur(10px);\n max-height:calc(100dvh - 32px);overflow:auto;\n scrollbar-width:thin;scrollbar-color:#294960 transparent;\n}\nbody.rx5-ui-polished #overlay .panel::before{background:linear-gradient(90deg,transparent,#4dd6d0,transparent);height:2px}\nbody.rx5-ui-polished #overlay :is(.primary,.choice,.secondary){\n box-shadow:none;transition:background-color .14s ease,border-color .14s ease;\n}\nbody.rx5-ui-polished #overlay .primary{background:#35cbbd;color:#05202b;border:1px solid #7ee4dd}\nbody.rx5-ui-polished #overlay .secondary{background:#152e41;color:#e8f5fc;border:1px solid #315166}\nbody.rx5-ui-polished #overlay .choice{background:#122b40;border-color:#32536b;color:#f0f8fe}\nbody.rx5-ui-polished #overlay .primary:hover{background:#6ee6d9}\nbody.rx5-ui-polished #overlay .secondary:hover,\nbody.rx5-ui-polished #overlay .choice:hover{background:#1c4256;border-color:#5caaac}\nbody.rx5-ui-polished #overlay :is(.eyebrow,.sunmark){color:#73dcd9;letter-spacing:.12em}\nbody.rx5-ui-polished #overlay .brandchip{background:#0c2a39;color:#a5f1e9;border:1px solid #28566a;border-radius:7px}\nbody.rx5-ui-polished #overlay .game-title{color:#f5fbff;text-shadow:none}\nbody.rx5-ui-polished #overlay .game-title span{color:#62e3d6;text-shadow:none}\nbody.rx5-ui-polished #overlay :is(.subtitle,.menu-note){color:#a0b8c9}\nbody.rx5-ui-polished #overlay select{\n color:#eefbff;background:#102c3f;border:1px solid #416980;\n}\nbody.rx5-ui-polished #overlay button:focus-visible,\nbody.rx5-ui-polished #overlay select:focus-visible,\nbody.rx5-ui-polished #overlay summary:focus-visible{\n outline:2px solid #99fff1;outline-offset:3px;\n}\nbody.rx5-ui-polished #mainMenu.rx-simple-active #rxSimplePanel{\n width:min(580px,100%);max-width:580px;padding:clamp(16px,3vw,24px);\n margin:0 auto;border:1px solid #27495d;border-radius:16px;\n background:linear-gradient(165deg,rgba(9,29,42,.98),rgba(8,20,33,.98));\n box-shadow:none;color:#eaf8ff;\n}\nbody.rx5-ui-polished #rxSimplePanel .rx-simple-heading{padding:0 0 14px;text-align:center}\nbody.rx5-ui-polished #rxSimplePanel .rx-simple-brand{\n font:900 clamp(28px,6vw,40px)/1.05 system-ui;letter-spacing:.12em;\n}\nbody.rx5-ui-polished #rxSimplePanel .rx-simple-brand b{color:#64e9dd}\nbody.rx5-ui-polished #rxSimplePanel .rx-simple-motto{\n margin:9px 0 0;font-size:10px;color:#8dafc2;letter-spacing:.22em;\n}\nbody.rx5-ui-polished #rx5-release-strip{\n display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;\n margin:13px 0 0;padding:0;min-height:30px;border:0;background:transparent;\n text-align:center;box-shadow:none;\n}\nbody.rx5-ui-polished #rx5-release-strip strong{\n display:inline;font:800 10px system-ui;color:#8adbd4;letter-spacing:.07em;\n}\nbody.rx5-ui-polished #rx5-release-strip small{display:none}\nbody.rx5-ui-polished #rx5-release-strip button{\n min-height:26px!important;width:auto!important;margin:0!important;padding:5px 9px!important;\n color:#a8d7dc!important;font:700 10px system-ui!important;\n border:1px solid #2b5567!important;background:#112c3b!important;\n border-radius:99px!important;letter-spacing:0!important;\n}\nbody.rx5-ui-polished #mainMenu.rx-simple-active #rxSimpleActions>.rx-simple-quick{\n margin:0 0 14px!important;min-height:94px;padding:16px 12px!important;\n border:1px solid #91f1e4!important;border-radius:14px!important;\n color:#06212a!important;background:linear-gradient(125deg,#6ae9d5,#35c9bd)!important;\n font:900 clamp(20px,4vw,27px)/1.15 system-ui!important;\n box-shadow:0 8px 24px #02211e66!important;\n}\nbody.rx5-ui-polished #mainMenu.rx-simple-active #rxSimpleActions>.rx-simple-quick small{\n color:#14434c;font:500 11px/1.3 system-ui;letter-spacing:0;\n}\nbody.rx5-ui-polished #rxSimpleActions .rx-simple-grid{\n grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:0 0 12px;\n}\nbody.rx5-ui-polished #rxSimpleActions .rx-simple-grid button{\n min-height:58px;border:1px solid #345b6c;background:#122d40;\n border-radius:11px;font:750 12px/1.35 system-ui;letter-spacing:0;\n padding:9px 5px;color:#e1f2fa;\n}\nbody.rx5-ui-polished #rxSimpleActions .rx-simple-grid button:hover{background:#1b4657;border-color:#6ac5ca}\nbody.rx5-ui-polished #rx5Options,\nbody.rx5-ui-polished #rx5More{\n margin:9px 0!important;padding:0!important;border:1px solid #2b475c!important;\n border-radius:10px!important;background:#0c2131!important;overflow:hidden;\n}\nbody.rx5-ui-polished #rx5Options>summary,\nbody.rx5-ui-polished #rx5More>summary{\n display:flex;align-items:center;justify-content:space-between;\n margin:0!important;min-height:47px;padding:12px!important;\n font:750 12px/1.4 system-ui;color:#deeff9;\n}\nbody.rx5-ui-polished #rx5Options[open],\nbody.rx5-ui-polished #rx5More[open]{border-color:#4e8a97!important}\nbody.rx5-ui-polished #rx5Options summary span,\nbody.rx5-ui-polished #rx5More summary span{color:#789daf!important}\nbody.rx5-ui-polished #rxSimplePanel .rx-simple-toggle{\n width:100%;margin:7px 0 0;min-height:35px!important;\n padding:7px!important;background:transparent!important;\n border:1px solid #243e51!important;border-radius:8px!important;\n color:#9fb8ca!important;font:650 11px system-ui!important;letter-spacing:0;\n}\nbody.rx5-ui-polished #rx5-native-main{grid-template-columns:repeat(2,minmax(0,1fr));padding:5px 10px 11px;gap:8px}\nbody.rx5-ui-polished #rx5-native-main button{min-height:43px;font:650 11px system-ui;background:#153146;border-radius:8px}\nbody.rx5-ui-polished #rx5Options .rx-simple-difficulty{margin:8px!important;background:#112b3a!important}\nbody.rx5-ui-polished #rx5Options .rx-simple-difficulty select{max-width:100%;min-width:140px}\nbody.rx5-ui-polished #rx5Options :is(#rx5CombatSettings,#rx5Accessibility){border-color:#2a4d5f!important;background:#102638!important}\nbody.rx5-ui-polished #rx5Options #rx5-quick-system{\n display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:10px 12px 13px;\n}\nbody.rx5-ui-polished #rx5-quick-system button{\n min-height:38px;border-radius:8px;background:#173a4c;color:#d9f3fa;\n font:650 11px system-ui;border:1px solid #3d6678;padding:7px 5px;\n}\nbody.rx5-ui-polished #rx5-quick-system button:hover{background:#245468}\nbody.rx5-ui-polished #rx5-gear-row{display:block!important}\nbody.rx5-ui-polished #deviceMenu .game-title{font-size:clamp(47px,11vw,76px);margin:8px 0}\nbody.rx5-ui-polished #deviceMenu .device-grid{gap:10px}\nbody.rx5-ui-polished #deviceMenu .device-card{\n min-height:115px;border:1px solid #385a70;background:#102a3d;border-radius:14px;padding:12px;\n}\nbody.rx5-ui-polished #deviceMenu .device-card span{font-size:31px}\nbody.rx5-ui-polished #deviceMenu .device-card small{color:#a4c0cf}\nbody.rx5-ui-polished #pauseMenu .subtitle{margin:8px 0 16px}\nbody.rx5-ui-polished #pauseMenu #pausedMusicNote{display:none}\nbody.rx5-ui-polished #pauseMenu .mode-grid{margin-top:12px}\nbody.rx5-ui-polished #rx5PauseSettings,\nbody.rx5-ui-polished #rx5PauseMore{\n margin:10px 0;padding:0;border:1px solid #2a4d62;background:#0e2839;border-radius:11px;\n}\nbody.rx5-ui-polished #rx5PauseSettings>summary,\nbody.rx5-ui-polished #rx5PauseMore>summary{\n display:block;padding:12px;font:700 12px system-ui;color:#d7f2fb;text-align:center;cursor:pointer;\n}\nbody.rx5-ui-polished #rx5PauseSettings>:not(summary){margin:8px!important}\nbody.rx5-ui-polished #rx5PauseSettings #v9PauseQuality{max-height:170px;overflow:auto}\nbody.rx5-ui-polished #hud.active .hud-panel{\n border:1px solid rgba(133,202,206,.20);border-radius:10px;\n background:rgba(6,20,31,.68);box-shadow:none;\n}\nbody.rx5-ui-polished #hud.active .hud-center{min-width:125px;top:12px}\nbody.rx5-ui-polished #hud.active .hud-center strong{font-size:clamp(17px,3vw,24px);letter-spacing:.04em}\nbody.rx5-ui-polished #hud.active .hud-kills{gap:11px}\nbody.rx5-ui-polished #hud.active .hud-bottom{gap:8px}\nbody.rx5-ui-polished #hud.active .meter{height:8px;margin-bottom:8px}\nbody.rx5-ui-polished #hud.active .ammo-num{font-size:clamp(28px,4vw,42px)}\nbody.rx5-ui-polished #hud.active #minimap{border-radius:9px}\nbody.rx5-ui-polished.rx5-focus-hud #hudPlayers,\nbody.rx5-ui-polished.rx5-focus-hud #hud .hudwallet,\nbody.rx5-ui-polished.rx5-focus-hud #hud .weapon-keys,\nbody.rx5-ui-polished.rx5-focus-hud #rx5MasteryHud,\nbody.rx5-ui-polished.rx5-focus-hud #rx2HudStatus{display:none!important}\nbody.rx5-ui-polished.rx5-focus-hud #hud .hud-logo{font-size:clamp(12px,2vw,16px)}\nbody.rx5-ui-polished.rx5-focus-hud #hud .sneak-label{display:none}\nbody.rx5-ui-polished.rx5-focus-hud #hud .sprint-box{opacity:.82}\nbody.rx5-ui-polished.rx5-focus-hud #killfeed .feed{background:#051923c7}\n@media(max-width:650px){\n body.rx5-ui-polished #overlay{padding:8px}\n body.rx5-ui-polished #overlay .panel{max-height:calc(100dvh - 16px);border-radius:12px}\n body.rx5-ui-polished #overlay .panel-content{padding:12px}\n body.rx5-ui-polished #mainMenu.rx-simple-active #rxSimplePanel{padding:13px 12px}\n body.rx5-ui-polished #rxSimpleActions .rx-simple-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}\n body.rx5-ui-polished #rxSimpleActions .rx-simple-grid button{min-height:44px}\n body.rx5-ui-polished #mainMenu.rx-simple-active #rxSimpleActions>.rx-simple-quick{min-height:72px}\n body.rx5-ui-polished #mainMenu.rx-simple-active #rxSimplePanel .rx-simple-heading{padding-bottom:8px}\n body.rx5-ui-polished #rx5Options>summary,body.rx5-ui-polished #rx5More>summary{min-height:40px}\n body.rx5-ui-polished #hud.active .hud-center{top:8px}\n body.rx5-ui-polished #hud.active .hud-panel{padding:6px 8px}\n body.rx5-ui-polished #hud.active .hud-bottom .ammo-num{font-size:28px}\n body.rx5-ui-polished #hud.active .hud-bottom .healthblock{max-width:160px}\n}\n@media(max-height:480px){\n body.rx5-ui-polished #overlay{padding:6px}\n body.rx5-ui-polished #overlay .panel{max-height:calc(100dvh - 12px)}\n body.rx5-ui-polished #mainMenu.rx-simple-active #rxSimplePanel{padding:10px 12px}\n body.rx5-ui-polished #rxSimplePanel .rx-simple-brand{font-size:27px}\n body.rx5-ui-polished #rx5-release-strip{margin-top:4px}\n body.rx5-ui-polished #mainMenu.rx-simple-active #rxSimpleActions>.rx-simple-quick{min-height:57px;padding:8px!important;margin-bottom:6px!important;font-size:19px!important}\n body.rx5-ui-polished #rxSimpleActions .rx-simple-grid{margin-bottom:5px}\n body.rx5-ui-polished #rxSimpleActions .rx-simple-grid button{min-height:36px;padding:7px;font-size:11px}\n body.rx5-ui-polished #rx5Options,body.rx5-ui-polished #rx5More{margin:5px 0!important}\n body.rx5-ui-polished #rxSimplePanel .rx-simple-toggle{margin:3px 0}\n}\n@media(prefers-reduced-motion:reduce){\n body.rx5-ui-polished #overlay *{transition:none!important;animation:none!important}\n}\n";
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
pauseMore.before(pauseNews);
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
window.RXZ5InGame={open,showNews,version:'Z.5-CLEAN-5'};
window.RXZ5Admin?.refresh();
})();