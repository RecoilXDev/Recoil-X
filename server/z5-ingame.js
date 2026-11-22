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
style.textContent += "\n\n/* RECOIL X Sand Edition — quiet home screen and classic desert palette.\n   The existing 3D game, original terrain, accounts and advanced screens remain. */\nbody.rx5-sand-ui{--rx5-sand:#eed0a0;--rx5-gold:#ffd38a;--rx5-border:#826141;--rx5-ink:#34200e}\nbody.rx5-sand-ui #overlay{\n background:radial-gradient(ellipse at 62% 0%,rgba(193,120,52,.22),transparent 48%),\n linear-gradient(120deg,rgba(28,19,12,.95),rgba(44,29,18,.89) 56%,rgba(25,18,12,.94));\n}\nbody.rx5-sand-ui #overlay::before{\n opacity:.10;display:block;pointer-events:none;\n background:repeating-linear-gradient(-21deg,transparent 0 42px,rgba(246,194,119,.18) 43px 44px,transparent 45px 84px);\n}\nbody.rx5-sand-ui #overlay .panel{\n width:min(730px,100%);max-height:calc(100dvh - 32px);overflow:auto;\n border:1px solid #816244;border-radius:18px;\n background:linear-gradient(154deg,rgba(60,41,27,.98),rgba(39,27,19,.98));\n box-shadow:0 24px 65px rgba(16,9,4,.45);\n backdrop-filter:blur(9px);scrollbar-width:thin;scrollbar-color:#88643f transparent;\n}\nbody.rx5-sand-ui #overlay .panel::before{\n content:'';height:2px;background:linear-gradient(90deg,transparent,#f8cc83,transparent);\n}\nbody.rx5-sand-ui #overlay :is(.primary,.secondary,.choice){\n box-shadow:none;transition:background .15s ease,border-color .15s ease,filter .15s ease;\n}\nbody.rx5-sand-ui #overlay .primary{\n background:linear-gradient(120deg,#f5c576,#db9e4b);color:#32200e;\n border:1px solid #ffe0a5;\n}\nbody.rx5-sand-ui #overlay .primary:hover{filter:brightness(1.06)}\nbody.rx5-sand-ui #overlay .secondary{\n border:1px solid #896648;background:#493421;color:#fff0d9;\n}\nbody.rx5-sand-ui #overlay .choice{\n border:1px solid #876548;background:#4c3522;color:#fff0d9;\n}\nbody.rx5-sand-ui #overlay :is(.secondary,.choice):hover{\n border-color:#d4a56b;background:#67492d;\n}\nbody.rx5-sand-ui #overlay :is(.eyebrow,.sunmark){color:#efc186;letter-spacing:.09em}\nbody.rx5-sand-ui #overlay .brandchip{\n background:#4b3220;color:#ffe1b0;border:1px solid #92704b;border-radius:6px;\n}\nbody.rx5-sand-ui #overlay .game-title{\n color:#fdf0d3;text-shadow:0 4px 12px #1c100880;\n}\nbody.rx5-sand-ui #overlay .game-title span{\n color:#ffcf81;text-shadow:0 4px 15px #a85d1f55;\n}\nbody.rx5-sand-ui #overlay :is(.subtitle,.menu-note){color:#d8b890}\nbody.rx5-sand-ui #overlay select{\n background:#322316;border:1px solid #99744b;color:#f9e7c8;\n}\nbody.rx5-sand-ui #overlay :is(button,select,summary):focus-visible{\n outline:2px solid #ffe3a8;outline-offset:3px;\n}\nbody.rx5-sand-ui #mainMenu.rx-simple-active #rxSimplePanel{\n width:min(550px,100%);max-width:550px;margin:0 auto;\n padding:clamp(16px,3vw,27px);border:1px solid #94704a;\n border-radius:15px;\n background:linear-gradient(150deg,rgba(64,42,25,.97),rgba(47,33,22,.98));\n box-shadow:0 12px 30px #160c0566;color:#fff3df;\n}\nbody.rx5-sand-ui #rxSimplePanel .rx-simple-heading{\n padding:0 0 16px;text-align:center;\n}\nbody.rx5-sand-ui #rxSimplePanel .rx-simple-brand{\n font:900 clamp(30px,6.2vw,43px)/1.08 system-ui;\n letter-spacing:.13em;color:#fff4df;\n}\nbody.rx5-sand-ui #rxSimplePanel .rx-simple-brand b{color:#ffd08b}\nbody.rx5-sand-ui #rxSimplePanel .rx-simple-motto{\n margin:9px 0 0;font:650 10px system-ui;letter-spacing:.2em;color:#c7a582;\n}\nbody.rx5-sand-ui #mainMenu.rx-simple-active #rxSimpleActions>.rx-simple-quick{\n min-height:90px;margin:0 0 12px!important;padding:14px 10px!important;\n border:1px solid #ffe5b0!important;border-radius:12px!important;\n background:linear-gradient(125deg,#ffdfa1,#e5ad59)!important;color:#38220e!important;\n font:900 clamp(20px,4vw,26px)/1.2 system-ui!important;\n box-shadow:0 8px 17px #1a0b043d!important;\n}\nbody.rx5-sand-ui #mainMenu.rx-simple-active #rxSimpleActions>.rx-simple-quick:hover{\n filter:brightness(1.06);border-color:#fff5d1!important;\n}\nbody.rx5-sand-ui #mainMenu.rx-simple-active #rxSimpleActions>.rx-simple-quick small{\n color:#654324;font:550 11px/1.4 system-ui;letter-spacing:0;\n}\nbody.rx5-sand-ui #rxSimpleActions .rx-simple-grid{\n display:grid;grid-template-columns:repeat(4,minmax(0,1fr));\n gap:8px;margin:0 0 8px;\n}\nbody.rx5-sand-ui #rxSimpleActions .rx-simple-grid button{\n min-height:54px;padding:9px 5px;border:1px solid #916a46;\n border-radius:9px;background:#533a25;color:#f9e9cf;\n font:750 12px/1.35 system-ui;letter-spacing:0;box-shadow:none;\n}\nbody.rx5-sand-ui #rxSimpleActions .rx-simple-grid button:hover{\n background:#785330;border-color:#ecc28d;\n}\nbody.rx5-sand-ui #rx5More{\n margin:7px 0 0!important;padding:0!important;\n border:0!important;border-radius:9px!important;background:transparent!important;\n overflow:hidden;\n}\nbody.rx5-sand-ui #rx5More[open]{\n background:#38291b!important;border:1px solid #765638!important;\n}\nbody.rx5-sand-ui #rx5More>summary{\n justify-content:center;gap:7px;min-height:36px;margin:0!important;\n padding:8px!important;text-align:center;color:#dbc09b!important;\n font:750 11px system-ui;letter-spacing:.04em;\n}\nbody.rx5-sand-ui #rx5More>summary span{display:none}\nbody.rx5-sand-ui #rx5More>summary:after{\n content:'⌄';color:#e7c28b;font-size:17px;line-height:.7;\n}\nbody.rx5-sand-ui #rx5More[open]>summary:after{content:'⌃'}\nbody.rx5-sand-ui #rx5More>summary:hover{background:#594027}\nbody.rx5-sand-ui #rx5More .rx5-more-desc{display:none}\nbody.rx5-sand-ui #rx5-native-main{\n display:grid;grid-template-columns:repeat(2,minmax(0,1fr));\n gap:7px;padding:7px 10px 11px;\n}\nbody.rx5-sand-ui #rx5-native-main button{\n min-height:41px;padding:8px 5px;border:1px solid #85613f;\n border-radius:8px;background:#4d3826;color:#ffe8c8;\n font:650 11px system-ui;\n}\nbody.rx5-sand-ui #rx5-native-main button:hover{background:#6b4a2d}\nbody.rx5-sand-ui #rx5-open-news,\nbody.rx5-sand-ui #rx5LegacyMenuLink{\n display:block;width:calc(100% - 20px)!important;min-height:34px!important;\n margin:4px 10px 9px!important;padding:7px!important;\n border:1px solid #78583b!important;background:transparent!important;\n color:#dcb88d!important;font:650 11px system-ui!important;\n border-radius:8px!important;\n}\nbody.rx5-sand-ui #rx5-release-strip{\n display:block;margin:0;padding:0;border:0;background:transparent;\n box-shadow:none;\n}\nbody.rx5-sand-ui #rx5-release-strip>div{display:none}\nbody.rx5-sand-ui #rx5-release-strip button{width:calc(100% - 20px)!important}\nbody.rx5-sand-ui #rx5Options{\n display:block;margin:9px 0 4px!important;padding:0!important;\n background:#38271a!important;border:1px solid #8b6644!important;\n border-radius:10px!important;overflow:hidden;\n}\nbody.rx5-sand-ui #rx5Options[hidden]{display:none!important}\nbody.rx5-sand-ui #rx5Options>summary{\n min-height:44px;padding:11px 12px;margin:0!important;\n display:flex;align-items:center;justify-content:space-between;\n text-align:left;color:#f3d4a9;\n font:750 12px system-ui;\n}\nbody.rx5-sand-ui #rx5Options>summary span{color:#c1a077}\nbody.rx5-sand-ui #rx5Options>summary:after{content:'−';color:#fbd69a}\nbody.rx5-sand-ui #rx5Options :is(#rx5CombatSettings,#rx5Accessibility){\n margin:8px 10px;padding:10px!important;border:1px solid #765637!important;\n border-radius:9px;background:#44301e!important;color:#fbe6ca;\n}\nbody.rx5-sand-ui #rx5Options details summary{color:#ffe0ad}\nbody.rx5-sand-ui #rx5Options label{color:#f6dbb9}\nbody.rx5-sand-ui #rx5Options input{accent-color:#e9ab57}\nbody.rx5-sand-ui #rx5Options .rx-simple-difficulty{\n margin:9px 10px!important;background:#49311e!important;color:#f9e2c0!important;\n}\nbody.rx5-sand-ui #rx5Options .rx-simple-difficulty select{min-width:125px;max-width:100%}\nbody.rx5-sand-ui #rx5-gear-row{display:block!important;margin:12px 10px;color:#ebcba2}\nbody.rx5-sand-ui #rx5GearSelect{\n width:100%;min-height:38px;margin-top:6px;padding:8px;\n border:1px solid #98734c;border-radius:8px;\n background:#362516;color:#fff0d8;\n}\nbody.rx5-sand-ui #rx5-gear-help{margin:0 10px 12px;color:#c9a783}\nbody.rx5-sand-ui #rx5Options #rx5-quick-system{\n display:grid;grid-template-columns:repeat(3,minmax(0,1fr));\n gap:7px;margin:8px 10px 13px;\n}\nbody.rx5-sand-ui #rx5-quick-system button{\n min-height:36px;padding:7px;border:1px solid #8a6441;\n border-radius:8px;background:#573c26;color:#fff0d7;\n font:700 11px system-ui;\n}\nbody.rx5-sand-ui #rx5-quick-system button:hover{background:#73502e}\nbody.rx5-sand-ui #mainMenu.rx-simple-active #rxSimpleToggle{display:none!important}\nbody.rx5-sand-ui #mainMenu:not(.rx-simple-active) #rxSimpleToggle{\n width:100%;min-height:35px;padding:8px;margin:0;\n border:1px solid #92704d!important;border-radius:7px;\n background:#59402c!important;color:#ffdfaf!important;\n font:700 11px system-ui;\n}\nbody.rx5-sand-ui #deviceMenu .game-title{font-size:clamp(48px,10vw,78px);margin:8px 0}\nbody.rx5-sand-ui #deviceMenu .device-grid{gap:10px}\nbody.rx5-sand-ui #deviceMenu .device-card{\n min-height:114px;padding:12px;border:1px solid #916e4b;\n border-radius:13px;background:#503721;\n}\nbody.rx5-sand-ui #deviceMenu .device-card span{font-size:32px}\nbody.rx5-sand-ui #deviceMenu .device-card small{color:#d7b18a}\nbody.rx5-sand-ui #pauseMenu .subtitle{margin:6px 0 12px}\nbody.rx5-sand-ui #pauseMenu #pausedMusicNote{display:none}\nbody.rx5-sand-ui #pauseMenu .mode-grid{margin-top:11px}\nbody.rx5-sand-ui #rx5PauseSettings,\nbody.rx5-sand-ui #rx5PauseMore{\n margin:9px 0!important;padding:0!important;\n border:1px solid #81603f!important;background:#44301f!important;\n border-radius:9px;\n}\nbody.rx5-sand-ui #rx5PauseSettings>summary,\nbody.rx5-sand-ui #rx5PauseMore>summary{\n display:block;padding:11px;font:750 12px system-ui;\n text-align:center;color:#f5d7ac;cursor:pointer;\n}\nbody.rx5-sand-ui #rx5PauseSettings>:not(summary){margin:7px!important}\nbody.rx5-sand-ui #rx5PauseSettings #v9PauseQuality{\n max-height:160px;overflow:auto;\n}\nbody.rx5-sand-ui #hud.active .hud-panel{\n background:rgba(43,28,17,.74);border:1px solid rgba(244,190,116,.24);\n border-radius:11px;box-shadow:none;\n}\nbody.rx5-sand-ui #hud.active .hud-center{top:12px;min-width:130px}\nbody.rx5-sand-ui #hud.active .hud-center strong{font-size:clamp(17px,3vw,23px)}\nbody.rx5-sand-ui #hud.active .hud-kills{gap:10px}\nbody.rx5-sand-ui #hud.active .hud-bottom{gap:8px}\nbody.rx5-sand-ui #hud.active .ammo-num{font-size:clamp(27px,4vw,42px)}\nbody.rx5-sand-ui #hud.active .meter{height:8px;margin-bottom:8px}\nbody.rx5-sand-ui #hud.active #minimap{border-color:#bf9a62;border-radius:9px}\nbody.rx5-sand-ui.rx5-focus-hud #hud .hudwallet,\nbody.rx5-sand-ui.rx5-focus-hud #hud .weapon-keys,\nbody.rx5-sand-ui.rx5-focus-hud #rx5MasteryHud,\nbody.rx5-sand-ui.rx5-focus-hud #hudPlayers{display:none!important}\nbody.rx5-sand-ui.rx5-focus-hud #hud .hud-logo{font-size:clamp(12px,2vw,16px)}\nbody.rx5-sand-ui.rx5-focus-hud #hud .sprint-box{opacity:.85}\nbody.rx5-sand-ui #rx5WhatsNew{background:#150d06e6}\nbody.rx5-sand-ui #rx5WhatsNew .rx5-dialog{\n background:#382719;border:1px solid #a47950;color:#ffeed5;\n box-shadow:0 24px 66px #130b04bb;\n}\nbody.rx5-sand-ui #rx5WhatsNew .rx5-dialog :is(h2,.rx5-feature strong){color:#ffe1a7}\nbody.rx5-sand-ui #rx5WhatsNew .rx5-dialog p{color:#dab890}\nbody.rx5-sand-ui #rx5WhatsNew .rx5-feature{\n background:#4a321f;border-color:#84603c;\n}\nbody.rx5-sand-ui #rx5WhatsNew .rx5-feature small{color:#e2c49d}\nbody.rx5-sand-ui #rx5WhatsNew button{\n background:#725032;border:1px solid #bb8b54;color:#fff0d6;\n}\nbody.rx5-sand-ui #rx5WhatsNew button[data-rx5-close]{\n background:#efbf72;color:#372411;\n}\nbody.rx5-sand-ui #rx5AcademyDialog{background:#150e07e0}\nbody.rx5-sand-ui #rx5AcademyDialog .rx5-academy-dialog{\n background:#362516;border:1px solid #976f46;color:#fff0d6;\n}\nbody.rx5-sand-ui #rx5AcademyDialog .rx5-academy-tile{\n background:#4a3321;border-color:#806040;\n}\nbody.rx5-sand-ui #rx5AcademyDialog .rx5-academy-dialog h2,\nbody.rx5-sand-ui #rx5AcademyDialog .rx5-academy-tile strong{color:#ffdfa0}\nbody.rx5-sand-ui #rx5AcademyDialog button{background:#78522f;border-color:#b28453;color:#fff1d8}\n@media(max-width:640px){\n body.rx5-sand-ui #overlay{padding:9px}\n body.rx5-sand-ui #overlay .panel{max-height:calc(100dvh - 18px);border-radius:13px}\n body.rx5-sand-ui #overlay .panel-content{padding:14px}\n body.rx5-sand-ui #mainMenu.rx-simple-active #rxSimplePanel{padding:13px 12px}\n body.rx5-sand-ui #rxSimpleActions .rx-simple-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}\n body.rx5-sand-ui #rxSimpleActions .rx-simple-grid button{min-height:44px}\n body.rx5-sand-ui #mainMenu.rx-simple-active #rxSimpleActions>.rx-simple-quick{min-height:70px}\n body.rx5-sand-ui #rxSimplePanel .rx-simple-heading{padding-bottom:10px}\n body.rx5-sand-ui #hud.active .hud-center{top:8px}\n body.rx5-sand-ui #hud.active .hud-panel{padding:6px 8px}\n body.rx5-sand-ui #hud.active .hud-bottom .ammo-num{font-size:28px}\n}\n@media(max-height:460px){\n body.rx5-sand-ui #overlay{padding:5px}\n body.rx5-sand-ui #overlay .panel{max-height:calc(100dvh - 10px)}\n body.rx5-sand-ui #mainMenu.rx-simple-active #rxSimplePanel{padding:10px 12px}\n body.rx5-sand-ui #rxSimplePanel .rx-simple-brand{font-size:27px}\n body.rx5-sand-ui #mainMenu.rx-simple-active #rxSimpleActions>.rx-simple-quick{min-height:56px;padding:8px!important;margin-bottom:5px!important;font-size:20px!important}\n body.rx5-sand-ui #rxSimpleActions .rx-simple-grid button{min-height:36px;padding:7px;font-size:11px}\n body.rx5-sand-ui #rx5More{margin-top:2px!important}\n}\n@media(prefers-reduced-motion:reduce){\n body.rx5-sand-ui #overlay *{animation:none!important;transition:none!important}\n}\n";
// Classic-inspired sand menu: retain original warm styling while showing all five shortcuts.
style.textContent += "\nbody.rx5-sand-ui #mainMenu.rx-simple-active #rxSimplePanel{border-radius:9px!important;box-shadow:0 10px 22px #120a0759!important;background:linear-gradient(145deg,#4d3422,#2f2118)!important}\nbody.rx5-sand-ui #rxSimpleActions .rx-simple-grid{grid-template-columns:repeat(5,minmax(0,1fr))!important}\nbody.rx5-sand-ui #rxSimpleActions .rx-simple-grid button{border-radius:7px!important}\nbody.rx5-sand-ui #rxSimpleCollection{border-color:#e1b46d!important;color:#ffdf9d!important}\n@media(max-width:640px){body.rx5-sand-ui #rxSimpleActions .rx-simple-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}body.rx5-sand-ui #rxSimpleCollection{grid-column:1/-1}}\n";
document.head.append(style);
const hero=document.createElement('div');
hero.id='rx5-release-strip';
hero.setAttribute('aria-label','Current RECOIL X version');
hero.innerHTML='<div><strong>Z.5 · TACTICAL EXPANSION</strong><small>Latest update</small></div><button type="button" id="rx5-open-news">Updates</button>';
simple.append(hero); // moved into the advanced drawer during setup
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
more.innerHTML='<summary>MORE <span>Academy · Career · Online</span></summary><span class="rx5-more-desc">Optional game features</span>';
const simpleGroup=document.createElement('div');simpleGroup.id='rx5-native-main';
simpleGroup.setAttribute('aria-label','More RECOIL X game features');more.append(simpleGroup);
// Preserve the four established shortcuts and add a fifth direct route to collectibles.
const grid=simple.querySelector('.rx-simple-grid');
if(grid&&!$('rxSimpleCollection')){
 const collection=document.createElement('button');
 collection.type='button';collection.id='rxSimpleCollection';
 collection.textContent='🎁 COLLECTION';
 collection.title='Gun boxes, knife boxes, weapons and collectibles';
 collection.setAttribute('aria-label','Collection — gun boxes, knives and collectibles');
 collection.addEventListener('click',()=>{collectionHub.hidden=false;collectionHub.querySelector('[data-rx5-item]')?.focus();});
 grid.append(collection);
}

const collectionHub=document.createElement('div');
collectionHub.id='rx5CollectionHub';
collectionHub.hidden=true;
collectionHub.setAttribute('role','dialog');
collectionHub.setAttribute('aria-modal','true');
collectionHub.setAttribute('aria-label','RECOIL X Collection');
collectionHub.innerHTML='<section class="rx5-collection-shell"><header><div><strong>RECOIL X · COLLECTION</strong><small>Your original inventory, boxes, and gear — earned coins only</small></div><button type="button" id="rx5CollectionClose" aria-label="Close collection">✕</button></header><div class="rx5-collection-items"><button type="button" data-rx5-item="v8GunBtn">🔫 <b>Gun Boxes</b><small>Weapon cases & owned finishes</small></button><button type="button" data-rx5-item="vxKnivesBtn">🔪 <b>Knife Boxes</b><small>Knife cases & blade collection</small></button><button type="button" data-rx5-item="crateBtn">🎁 <b>Loot Crates</b><small>Original cosmetic crates</small></button><button type="button" data-rx5-item="shopBtn">🧥 <b>Outfits</b><small>Character skins & owned gear</small></button><button type="button" data-rx5-item="vxForgeBtn">⚒ <b>Weapon Forge</b><small>Craft with the existing shards</small></button><button type="button" data-rx5-item="passBtn">🏆 <b>Battle Pass</b><small>Existing earned rewards</small></button></div><p>Opening an item takes you to its existing game screen. Your inventory and coins are unchanged.</p></section>';
document.body.append(collectionHub);
const closeCollection=()=>{collectionHub.hidden=true;$('rxSimpleCollection')?.focus();};
$('rx5CollectionClose')?.addEventListener('click',closeCollection);
collectionHub.addEventListener('click',event=>{
 if(event.target===collectionHub){closeCollection();return;}
 const item=event.target.closest?.('[data-rx5-item]');if(!item)return;
 const target=$(item.dataset.rx5Item);
 if(target){collectionHub.hidden=true;target.click();}
});
document.addEventListener('keydown',event=>{
 if(!collectionHub.hidden&&event.key==='Escape'){event.preventDefault();closeCollection();}
},true);
style.textContent+=String.raw`
#rx5CollectionHub{position:fixed;inset:0;z-index:2147482505;display:flex;align-items:center;justify-content:center;padding:16px;background:#130b05ec;box-sizing:border-box}
#rx5CollectionHub[hidden]{display:none!important}
#rx5CollectionHub .rx5-collection-shell{width:min(680px,96vw);max-height:94dvh;overflow:auto;border:1px solid #a78150;border-radius:12px;background:linear-gradient(145deg,#4d3422,#302115);color:#ffe7c1;padding:18px;box-shadow:0 24px 70px #100802aa;font:14px system-ui}
#rx5CollectionHub header{display:flex;justify-content:space-between;gap:12px;align-items:start}
#rx5CollectionHub header strong{display:block;font-size:22px;letter-spacing:.08em}
#rx5CollectionHub header small{display:block;color:#d4b891;margin-top:5px}
#rx5CollectionHub button{cursor:pointer;color:#ffe9c7;border:1px solid #916a46;border-radius:9px;background:#63462d;padding:12px;font:700 14px system-ui}
#rx5CollectionHub button:focus-visible{outline:3px solid #ffdd9d;outline-offset:2px}
#rx5CollectionHub #rx5CollectionClose{padding:6px 11px}
#rx5CollectionHub .rx5-collection-items{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:18px 0}
#rx5CollectionHub .rx5-collection-items button{text-align:left;min-height:92px}
#rx5CollectionHub .rx5-collection-items small{display:block;color:#d7b990;font-weight:500;font-size:11px;margin-top:7px}
#rx5CollectionHub p{font-size:11px;color:#d5b990}
@media(max-width:530px){#rx5CollectionHub .rx5-collection-items{grid-template-columns:1fr}#rx5CollectionHub .rx5-collection-items button{min-height:65px}#rx5CollectionHub header strong{font-size:17px}}
`;

if(grid)grid.after(more);else simple.append(more);
more.append(hero);
const advancedLink=document.createElement('button');
advancedLink.type='button';advancedLink.id='rx5LegacyMenuLink';
advancedLink.textContent='Open full classic menu';
advancedLink.addEventListener('click',()=>$('rxSimpleToggle')?.click());
more.append(advancedLink);
const settings=document.createElement('details');settings.id='rx5Options';settings.hidden=true;settings.open=false;
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

// Z.5 HUD Layout Editor: keyboard/touch/desktop controls, browser-local and reversible.
const hudParts={
 top:{selector:'.hud-top',x:14,y:15,name:'Player'},
 center:{selector:'.hud-center',x:51,y:15,name:'Timer'},
 left:{selector:'.hud-left',x:15,y:48,name:'Map'},
 bottom:{selector:'.hud-bottom',x:51,y:82,name:'Health & Ammo'}
};
const hudLayoutKey='rx5-hud-layout-v1';
const hudClamp=(n,lim)=>Math.max(-lim,Math.min(lim,Math.round((Number(n)||0)*10)/10));
let hudOffsets={};
try{
 const stored=JSON.parse(localStorage.getItem(hudLayoutKey)||'{}');
 if(stored&&typeof stored==='object'&&!Array.isArray(stored))
  for(const key of Object.keys(hudParts)){
   if(stored[key]&&typeof stored[key]==='object')
    hudOffsets[key]={x:hudClamp(stored[key].x,25),y:hudClamp(stored[key].y,20)};
  }
}catch{}
function applyHudLayout(){
 for(const [key,part] of Object.entries(hudParts)){
  const target=document.querySelector(part.selector);if(!target)continue;
  const pos=hudOffsets[key]||{x:0,y:0};
  // CSS translate operates independently of the game's transform rules.
  target.style.translate=pos.x||pos.y?pos.x+'vw '+pos.y+'vh':'';
 }
}
applyHudLayout();
const hudEditor=document.createElement('div');
hudEditor.id='rx5HudEditor';hudEditor.hidden=true;
hudEditor.setAttribute('role','dialog');hudEditor.setAttribute('aria-modal','true');
hudEditor.setAttribute('aria-label','Custom HUD Layout');
hudEditor.innerHTML='<section class="rx5-hud-shell"><header><div><strong>CUSTOM HUD LAYOUT</strong><small>Drag each tile or use the arrow keys. Changes apply to the gameplay HUD.</small></div><button type="button" id="rx5HudClose">DONE ✕</button></header><div id="rx5HudPreview" aria-label="HUD layout preview"><button type="button" data-rx5-hud="top">PLAYER</button><button type="button" data-rx5-hud="center">TIMER</button><button type="button" data-rx5-hud="left">MAP</button><button type="button" data-rx5-hud="bottom">HEALTH / AMMO</button></div><footer><button type="button" id="rx5HudReset">RESET HUD POSITIONS</button><small>Saved only on this device. Your game account and other settings are unchanged.</small></footer></section>';
document.body.append(hudEditor);
const hudPreview=$('rx5HudPreview');
function hudRefresh(){
 for(const [key,part] of Object.entries(hudParts)){
  const tile=hudPreview.querySelector('[data-rx5-hud="'+key+'"]');
  if(!tile)continue;
  const pos=hudOffsets[key]||{x:0,y:0};
  tile.style.left=Math.max(7,Math.min(93,part.x+pos.x))+'%';
  tile.style.top=Math.max(10,Math.min(90,part.y+pos.y))+'%';
 }
 applyHudLayout();
}
function saveHudLayout(){
 try{localStorage.setItem(hudLayoutKey,JSON.stringify(hudOffsets));}catch{}
}
const openHud=()=>{hudEditor.hidden=false;hudRefresh();hudPreview.querySelector('[data-rx5-hud]')?.focus();};
const closeHud=()=>{hudEditor.hidden=true;$('rx5HudLayoutButton')?.focus();};
const hudOpenButton=document.createElement('button');
hudOpenButton.type='button';hudOpenButton.id='rx5HudLayoutButton';
hudOpenButton.textContent='🎛 CUSTOM HUD LAYOUT';
hudOpenButton.addEventListener('click',openHud);
settings.append(hudOpenButton);
$('rx5HudClose')?.addEventListener('click',closeHud);
$('rx5HudReset')?.addEventListener('click',()=>{hudOffsets={};saveHudLayout();hudRefresh();});
let hudDrag=null;
hudPreview.addEventListener('pointerdown',event=>{
 const tile=event.target.closest?.('[data-rx5-hud]');if(!tile)return;
 const key=tile.dataset.rx5Hud,pos=hudOffsets[key]||{x:0,y:0};
 hudDrag={key,tile,x:event.clientX,y:event.clientY,baseX:pos.x,baseY:pos.y};
 tile.setPointerCapture?.(event.pointerId);event.preventDefault();
});
hudPreview.addEventListener('pointermove',event=>{
 if(!hudDrag)return;
 const rect=hudPreview.getBoundingClientRect();
 const x=hudClamp(hudDrag.baseX+(event.clientX-hudDrag.x)/Math.max(1,rect.width)*100,25);
 const y=hudClamp(hudDrag.baseY+(event.clientY-hudDrag.y)/Math.max(1,rect.height)*100,20);
 hudOffsets[hudDrag.key]={x,y};hudRefresh();
});
const hudDrop=()=>{if(hudDrag){hudDrag=null;saveHudLayout();}};
hudPreview.addEventListener('pointerup',hudDrop);
hudPreview.addEventListener('pointercancel',hudDrop);
hudPreview.addEventListener('keydown',event=>{
 const tile=event.target.closest?.('[data-rx5-hud]');if(!tile)return;
 const dirs={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
 if(!dirs[event.key])return;event.preventDefault();
 const key=tile.dataset.rx5Hud,delta=dirs[event.key],pos=hudOffsets[key]||{x:0,y:0};
 hudOffsets[key]={x:hudClamp(pos.x+delta[0],25),y:hudClamp(pos.y+delta[1],20)};
 saveHudLayout();hudRefresh();
});
document.addEventListener('keydown',event=>{if(!hudEditor.hidden&&event.key==='Escape'){event.preventDefault();closeHud();}},true);
style.textContent+=String.raw`
#rx5HudLayoutButton{display:block;width:calc(100% - 20px);margin:10px;background:#755232;color:#fff1d6;border:1px solid #b58a51;border-radius:9px;padding:12px;cursor:pointer;font-weight:800}
#rx5HudEditor{position:fixed;inset:0;z-index:2147482506;display:flex;align-items:center;justify-content:center;background:#100b07ed;padding:14px}
#rx5HudEditor[hidden]{display:none!important}
#rx5HudEditor .rx5-hud-shell{box-sizing:border-box;width:min(710px,96vw);max-height:94dvh;overflow:auto;border:1px solid #a27c4f;border-radius:13px;background:#402c1d;color:#ffe8c2;padding:15px;font:13px system-ui}
#rx5HudEditor header{display:flex;align-items:start;justify-content:space-between;gap:10px}
#rx5HudEditor header strong{display:block;font-size:20px}
#rx5HudEditor header small,#rx5HudEditor footer small{display:block;color:#dbb98f;margin-top:5px}
#rx5HudEditor button{cursor:pointer;border:1px solid #ba8e56;color:#ffe7bc;background:#67482e;border-radius:8px;padding:9px;font:700 12px system-ui}
#rx5HudEditor button:focus-visible{outline:3px solid #ffe2a5;outline-offset:2px}
#rx5HudPreview{height:clamp(180px,35vh,300px);position:relative;background:linear-gradient(145deg,#192a31,#293324);border:1px solid #7d694a;border-radius:10px;margin:16px 0;touch-action:none;overflow:hidden}
#rx5HudPreview:after{content:'GAMEPLAY PREVIEW';position:absolute;left:50%;top:48%;transform:translate(-50%,-50%);font:700 11px system-ui;color:#b6a67c70;pointer-events:none}
#rx5HudPreview [data-rx5-hud]{position:absolute;transform:translate(-50%,-50%);touch-action:none;z-index:2;white-space:nowrap;user-select:none;min-width:85px}
#rx5HudEditor footer{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap}
@media(max-width:530px){#rx5HudEditor header strong{font-size:15px}#rx5HudPreview [data-rx5-hud]{font-size:10px;min-width:70px}}
`;

const simpleSettings=$('rxSimpleSettings');
if(simpleSettings)simpleSettings.onclick=()=>{
 const isOpen=!settings.hidden&&settings.open;
 if(isOpen){settings.open=false;settings.hidden=true;}
 else{settings.hidden=false;settings.open=true;more.open=false;settings.scrollIntoView?.({block:'nearest'});}
};
settings.addEventListener('toggle',()=>{if(!settings.open)settings.hidden=true;});
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
const photoButton=document.createElement('button');
photoButton.type='button';photoButton.id='rx5PhotoCapture';
photoButton.textContent='📸 SAVE CLEAN GAME SCREENSHOT';
photoButton.style.cssText='display:block;margin:9px auto;padding:10px 14px;border:1px solid #c39a64;border-radius:8px;background:#65462c;color:#ffebc9;font-weight:750;cursor:pointer';
photoButton.addEventListener('click',()=>{if(!window.RXZ5CapturePhoto?.())console.warn('Screenshot only available during gameplay');});
pauseMore.append(photoButton);
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
document.body.classList.add('rx5-sand-ui');
window.RXZ5InGame={open,showNews,version:'Z.5-SAND-6.1'};
window.RXZ5Admin?.refresh();
})();