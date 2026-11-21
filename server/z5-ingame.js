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
'#rx5-native-main{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;padding:0 12px 12px}',
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
document.head.append(style);
const hero=document.createElement('div');
hero.id='rx5-release-strip';
hero.setAttribute('aria-label','Current RECOIL X version');
hero.innerHTML='<div><strong>● Z.5 · COMBAT QUALITY</strong><small>Smarter bots · Weapon mastery · Overheating</small></div><button type="button" id="rx5-open-news">WHAT\\'S NEW</button>';
simple.prepend(hero);
const news=document.createElement('div');
news.id='rx5WhatsNew';news.hidden=true;
news.setAttribute('role','dialog');news.setAttribute('aria-modal','true');
news.setAttribute('aria-label','Z.5 update details');
news.innerHTML=[
'<div class="rx5-dialog"><h2>RECOIL X <span style="color:#69e3de">Z.5</span></h2>',
'<p>COMBAT QUALITY UPDATE — now integrated into the existing game.</p>',
'<div class="rx5-features">',
'<div class="rx5-feature"><strong>⚔ Weapon Overheating</strong><small>Assault rifles and SMGs heat up. Cool down between bursts; offline matches can disable it in Combat Settings.</small></div>',
'<div class="rx5-feature"><strong>🏅 Weapon Mastery</strong><small>Build a cosmetic mastery rank from offline hits and bot eliminations. No coins needed.</small></div>',
'<div class="rx5-feature"><strong>🤖 Nightmare Bot Tactics</strong><small>Smarter flanking, hiding and peeking. Choose bot intelligence in Settings.</small></div>',
'<div class="rx5-feature"><strong>📱 Mobile Performance Guard</strong><small>Fewer low-priority effects during heavy action and adaptive rendering on slow devices.</small></div>',
'<div class="rx5-feature"><strong>🎯 Cleaner Aim</strong><small>Optional high-visibility crosshair and a compact heat indicator in the HUD.</small></div>',
'<div class="rx5-feature"><strong>🛡 Multiplayer Safety</strong><small>Server-side weapon heat and protection against excessive input traffic in casual games.</small></div>',
'</div>',
'<div class="rx5-warning">The full 85-feature roadmap is still being built. This update is the verified combat-quality release, not all 85 features.</div>',
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
function button(parent,key,label,admin=false){
 const b=document.createElement('button');b.type='button';b.textContent=label;
 b.dataset.rx5Open=key;
 if(admin){b.dataset.rxAdminOnly='';b.hidden=true;b.setAttribute('aria-label','Admin controls');}
 b.addEventListener('click',()=>{void open(key);});
 parent.append(b);
 return b;
}
const more=document.createElement('details');more.id='rx5More';
more.innerHTML='<summary>MORE FEATURES <span style="font-weight:400;color:#8ab0bf">Career · Forge · Online</span></summary><span class="rx5-more-desc">Advanced features are still here whenever you need them.</span>';
const simpleGroup=document.createElement('div');simpleGroup.id='rx5-native-main';
simpleGroup.setAttribute('aria-label','More RECOIL X game features');more.append(simpleGroup);
const grid=simple.querySelector('.rx-simple-grid');
if(grid)grid.after(more);else simple.append(more);
const settings=document.createElement('details');settings.id='rx5Options';
settings.innerHTML='<summary>COMBAT, PERFORMANCE & ACCESSIBILITY <span style="font-weight:400;color:#8ab0bf">⚙</span></summary>';
more.after(settings);
for(const id of ['rxSimpleBotLevel','rx5Accessibility','rx5CombatSettings']){
 const el=$(id);if(!el)continue;
 settings.append(el.closest('.rx-simple-difficulty')||el);
}
const advancedGroup=document.createElement('div');advancedGroup.id='rx5-native-advanced';
advancedGroup.setAttribute('aria-label','Advanced RECOIL X shortcuts');
menu.append(advancedGroup);
const pauseMore=document.createElement('details');pauseMore.id='rx5PauseMore';
pauseMore.innerHTML='<summary>MORE FEATURES · Z.5</summary>';
const pauseGroup=document.createElement('div');pauseGroup.id='rx5-native-pause';
pauseMore.append(pauseGroup);pause.append(pauseMore);
for(const target of [simpleGroup,advancedGroup,pauseGroup]){
 button(target,'career','🏅 Career & Clans');
 button(target,'market','⚒ Forge & Market');
 button(target,'matches','🌐 Match Hub');
 button(target,'admin','🛡 Admin',true);
}
button(advancedGroup,'news','✦ What\\'s New');
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
   if(key==='admin'){if(!window.RXZ5Admin?.open)throw Error('Admin features unavailable');return await window.RXZ5Admin.open();}
   if(key==='career'||!currentToken())return await career();
   if(key==='market'){if(!window.RXZ5Economy?.open)throw Error('Forge unavailable');return await window.RXZ5Economy.open();}
   if(key==='matches'){if(!window.RXZ5MatchHub?.open)throw Error('Match Hub unavailable');return await window.RXZ5MatchHub.open();}
 }catch(error){console.warn('RECOIL X Z.5 navigation:',error);try{await career();}catch{}}
}
window.RXZ5InGame={open,showNews,version:'Z.5-CLEAN-2'};
window.RXZ5Admin?.refresh();
})();