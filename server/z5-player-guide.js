// RECOIL X Z.5 player guide / guest-local export. Loaded after the existing UI.
// Never exports sessionStorage, authentication tokens, passwords or recovery codes.
(()=>{'use strict';
if(window.RXZ5PlayerGuide)return;
const $=id=>document.getElementById(id);
const format='recoil-x-local-backup-v1';
const maxItems=100,maxValue=300000,maxTotal=1500000;
const safeKey=/^(?:recoil(?:[-_ ]?x)?|rx(?:5|z|_5)|zone[-_ ]?90|mission[-_])/i;
const blocked=/(?:token|auth|session|password|secret|credential|recovery|private[-_]?key|bearer|oauth|email|phone|address|chat|message|account|profile|username|friend)/i;
const confidentialValue=/(?:["'](?:token|access_token|refresh_token|password|secret|session|recoveryCode)["']\s*:|Bearer\s+[A-Za-z0-9_-]{12,})/i;
function eligible(key,value){
 return typeof key==='string'&&safeKey.test(key)&&!blocked.test(key)&&typeof value==='string'&&
 value.length<=maxValue&&!confidentialValue.test(value);
}
function entries(){
 const items=[];let bytes=0;
 for(let i=0;i<localStorage.length;i++){
  const key=localStorage.key(i),value=localStorage.getItem(key);
  if(!eligible(key,value))continue;
  bytes+=key.length+value.length;if(bytes>maxTotal)break;
  items.push({key,value});if(items.length>=maxItems)break;
 }
 return items;
}
function escape(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
const style=document.createElement('style');style.textContent=[
'#rx-guide-shell{display:none;position:fixed;inset:0;z-index:2147483150;background:#130c09ef;overflow:auto;padding:15px;color:#f8e5cb;font:14px/1.55 system-ui}',
'#rx-guide-shell.open{display:block}',
'#rx-guide-shell *{box-sizing:border-box}',
'#rx-guide-panel{max-width:760px;margin:2vh auto;padding:18px;background:#362516;border:1px solid #95704a;border-radius:16px;box-shadow:0 16px 50px #000a}',
'#rx-guide-panel h2{margin:0 0 6px;font-size:23px;color:#ffdc9b}',
'#rx-guide-panel h3{margin:12px 0 5px;font-size:16px;color:#fbd3a1}',
'#rx-guide-panel p{margin:7px 0;color:#eed4b0}',
'#rx-guide-panel .sub{font-size:12px;color:#ceaf8b}',
'#rx-guide-panel .guide-card{border:1px solid #82603c;border-radius:9px;padding:12px;margin:10px 0;background:#48311d}',
'#rx-guide-panel button,#rx-guide-panel label.guide-upload{display:inline-block;border:1px solid #9b7443;border-radius:8px;background:#644425;color:#ffe4b7;padding:9px 12px;margin:4px;cursor:pointer;font:inherit}',
'#rx-guide-panel button:focus-visible,#rx-guide-panel label.guide-upload:focus-within{outline:3px solid #f9c782}',
'#rx-guide-panel .tabs{display:flex;flex-wrap:wrap;margin:12px 0;gap:3px}',
'#rx-guide-status{min-height:25px;color:#ffce86}',
'#rx-guide-panel code{overflow-wrap:anywhere;color:#ffe9c3}',
'#rx-guide-panel ul{padding-left:20px;margin:8px 0}',
'#rx-guide-panel li{padding:2px 0}',
'#rx-guide-panel input[type=file]{display:none}',
].join('\n');document.head.append(style);
const shell=document.createElement('div');shell.id='rx-guide-shell';
shell.innerHTML='<section id="rx-guide-panel" role="dialog" aria-modal="true" aria-label="RECOIL X player information"><div style="display:flex;align-items:start;justify-content:space-between;gap:12px"><div><h2>RECOIL X · Player Guide</h2><p class="sub">How to play · Guest backup · Privacy</p></div><button data-guide="close">Close ✕</button></div><div class="tabs"><button data-guide="overview">Game guide</button><button data-guide="backup">Backup & restore</button><button data-guide="privacy">Privacy</button><button data-guide="share">Share game</button></div><p id="rx-guide-status" role="status"></p><div id="rx-guide-content"></div></section>';
document.body.append(shell);
let active='overview',undo=null;
const status=(txt,error=false)=>{const el=$('rx-guide-status');el.textContent=txt||'';el.style.color=error?'#ffb1a5':'#ffce86';};
function show(page){
 active=page;status('');
 const panel=$('rx-guide-content');
 if(page==='overview'){
  panel.innerHTML='<div class="guide-card"><h3>Where to start</h3><p><b>Quick Play</b> is the fastest way to start a solo battle against bots. <b>Multiplayer / Overdrive</b> offers server-hosted matches, ranked squads and private room codes. Some networks block WebSocket or WebRTC connections, which can make online or private rooms unavailable.</p><p class="sub">Solo map lists and multiplayer arenas are not the same list. The currently selectable maps in each mode are more reliable than an old total on an information page.</p></div><div class="guide-card"><h3>Saving your progress</h3><p>Account-linked Mission Mode progress can sync across browsers when you sign in and the save reaches the server. Other guest progress and device preferences may remain in this browser only. Use <b>Backup & restore</b> for eligible local data; do not mistake it for a server backup.</p></div><div class="guide-card"><h3>Coins, boxes and odds</h3><p>Battle-pass tiers 1–99 now cost 300 earned coins, with the last tier costing 500. Previous tier owners receive a one-time local difference credit. Rare drops may still require many openings. Published odds must be checked against the underlying drop logic. Paid character, gun and knife boxes now guarantee Legendary or better by the 25th consecutive opening without one, tracked separately per box family in this browser.</p><p class="sub">Base cosmetic rarity rates total exactly 100%; guaranteed drops alter the effective odds. The one-in-a-million Desert Token jackpot remains unchanged. Every 20 non-jackpot battlefield chests award 250 bonus local coins.</p></div><div class="guide-card"><h3>Design identity</h3><p>RECOIL X uses its own Oman-themed events and original game identity. Weapons and knives in the reviewed source are drawn with in-game SVG and 3D geometry routines. Visual similarity to outside games still needs human review; report suspicious designs so they can be redesigned.</p></div>';
 }else if(page==='backup'){
  const items=entries();const n=items.reduce((sum,e)=>sum+e.key.length+e.value.length,0);
  panel.innerHTML='<div class="guide-card"><h3>Guest-only local backup</h3><p>This saves eligible RECOIL X browser data to a JSON file on your device. It never includes session storage, account authentication, chat, server-side wallets, or server-backed Mission Mode records.</p><p class="sub">Found '+items.length+' eligible local keys ('+Math.ceil(n/1024)+' KB). Available keys: '+(items.length?items.map(e=>'<code>'+escape(e.key)+'</code>').join(', '):'none')+'</p><button data-guide="export">Export local backup</button><label class="guide-upload" tabindex="0">Import backup file<input id="rx-guide-import" type="file" accept=".json,application/json"></label><button data-guide="undo" '+(undo?'':'disabled')+'>Undo last import</button><p class="sub">Importing may overwrite older local settings or guest progress. Existing device data is preserved until you confirm; reload the page after importing. This file is not uploaded to a server.</p></div>';
 }else if(page==='share'){
  panel.innerHTML='<div class="guide-card"><h3>Share RECOIL X</h3><p>Challenge friends to a solo bot run, online arena or co-op boss raid. RECOIL X runs in your browser with earned-coin cosmetics and low-performance presets.</p><p><code>https://recoil-x.alwaysdata.net/</code></p><button data-guide="copy-promo">Copy game invitation</button><p class="sub">Nothing is posted automatically. Paste the invitation wherever you want to share it.</p></div>';
 }else if(page==='privacy'){
  panel.innerHTML='<div class="guide-card"><h3>What is stored?</h3><p>Guest settings and some saves are kept in browser storage. Signed-in accounts, password verifiers, account sessions, friends, messages, moderation records and eligible match/mission progress are handled by the RECOIL X server.</p></div><div class="guide-card"><h3>What others may see</h3><p>Players in a shared match or room may receive your public game name, chat messages and gameplay state. Hosted Overdrive uses server WebSocket transport; some legacy private rooms use WebRTC peer connections and may expose network addresses to the participants. Account sessions and authentication secrets must not be shared with other players. Private room codes control access but are not end-to-end encryption.</p></div><div class="guide-card"><h3>Network and payments</h3><p>RECOIL X uses browser requests and WebSocket connections to its hosting service; the host may process IP addresses and technical connection logs. Some networks block multiplayer connections. The reviewed game does not provide a real-money checkout system. Avoid including real names, phone numbers or other private details in game chat.</p><p class="sub">This is a brief player-facing explanation, not a complete legal privacy policy or a promise that no personal data is processed.</p></div>';
 }
}
function close(){shell.classList.remove('open');status('');}
function open(page='overview'){shell.classList.add('open');document.exitPointerLock?.();show(page);}
function exportData(){
 const data={format,version:1,createdAt:new Date().toISOString(),origin:location.origin,items:entries()};
 if(!data.items.length){status('No eligible browser-local RECOIL X data was found.',true);return;}
 const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='RECOIL-X-local-backup-'+new Date().toISOString().slice(0,10)+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
 status('Local backup file created. Keep it somewhere private.');
}
async function importFile(file){
 if(!file||file.size>maxTotal*2)throw Error('Backup is missing or too large.');
 const doc=JSON.parse(await file.text());
 if(doc?.format!==format||doc.version!==1||!Array.isArray(doc.items)||doc.items.length>maxItems)throw Error('Not a supported RECOIL X local backup.');
 const seen=new Set();let total=0;
 for(const entry of doc.items){
  if(!entry||!eligible(entry.key,entry.value)||seen.has(entry.key))throw Error('Backup includes an unsupported or private key.');
  seen.add(entry.key);total+=entry.key.length+entry.value.length;if(total>maxTotal)throw Error('Backup exceeds size limit.');
 }
 if(!doc.items.length)throw Error('This backup has no eligible data.');
 if(!confirm('Import '+doc.items.length+' RECOIL X local entries? Existing matching browser data will be overwritten.'))return;
 const before=new Map();for(const entry of doc.items)before.set(entry.key,localStorage.getItem(entry.key));
 try{for(const entry of doc.items)localStorage.setItem(entry.key,entry.value);}
 catch(error){for(const [key,value] of before){if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,value);}throw error;}
 undo=before;show('backup');status('Imported '+doc.items.length+' local entries. Reload RECOIL X to use restored settings/progress.');
}
function undoImport(){
 if(!undo){status('No import to undo.',true);return;}
 for(const [key,value] of undo){if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,value);}
 undo=null;show('backup');status('Local import undone. Reload the game.');
}
shell.addEventListener('click',event=>{
 const button=event.target.closest('button[data-guide]');if(!button)return;
 const name=button.dataset.guide;
 if(name==='close'){close();return;}
 if(['overview','backup','privacy','share'].includes(name)){show(name);return;}
 try{if(name==='export')exportData();else if(name==='undo')undoImport();else if(name==='copy-promo'){
   const invitation='RECOIL X Z.5 Sand Edition — browser FPS, solo bots, online arenas and co-op boss raids. Play: https://recoil-x.alwaysdata.net/';
   if(!navigator.clipboard?.writeText){status('Copy the game address shown above.');return;}
   navigator.clipboard.writeText(invitation).then(()=>status('Invitation copied.')).catch(()=>status('Could not copy automatically. Copy the game address above.',true));
 }}
 catch(error){status(error.message,true);}
});
shell.addEventListener('change',event=>{if(event.target?.id!=='rx-guide-import')return;
 const file=event.target.files?.[0];importFile(file).catch(error=>status(error.message,true));event.target.value='';});
shell.addEventListener('click',e=>{if(e.target===shell)close();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&shell.classList.contains('open'))close();});
function attach(){
 if($('rx-guide-entry'))return;
 const target=$('rx5-native-main')||$('rx5More')||$('rxSimpleActions');
 if(!target)return;
 const entry=document.createElement('button');entry.id='rx-guide-entry';entry.type='button';entry.textContent='Guide · Backup · Privacy';
 entry.setAttribute('aria-label','Open RECOIL X game guide, backup and privacy');entry.onclick=()=>open();target.append(entry);
}
attach();document.addEventListener('DOMContentLoaded',attach,{once:true});
window.RXZ5PlayerGuide={open,close,eligible,entries};
})();
