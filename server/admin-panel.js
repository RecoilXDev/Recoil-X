(()=>{'use strict';
if(window.__rxAdminLoaded)return;window.__rxAdminLoaded=true;
const style=document.createElement('style');
style.textContent=[
'#rx-admin-root{display:none;position:fixed;inset:0;z-index:2147483001;background:#020918e8;backdrop-filter:blur(5px);align-items:center;justify-content:center;font:14px/1.45 system-ui,sans-serif;color:#ecf5ff}',
'#rx-admin-root.open{display:flex}#rx-admin-root *{box-sizing:border-box}',
'#rx-admin-window{display:flex;width:min(1020px,96vw);height:min(790px,94vh);background:#0b1626;border:1px solid #2d5570;border-radius:20px;box-shadow:0 20px 80px #000d;overflow:hidden}',
'#rx-admin-nav{flex:0 0 215px;background:linear-gradient(#0b2437,#0a1423);padding:22px 14px;border-right:1px solid #284157}',
'#rx-admin-nav h2{font-size:23px;letter-spacing:.10em;margin:0 6px 3px;color:white}#rx-admin-nav small{font-size:10px;letter-spacing:.22em;color:#51dccd;margin:0 6px 22px;display:block}',
'#rx-admin-nav button{display:block;width:100%;text-align:left;margin:4px 0;padding:12px;border:0;border-radius:11px;color:#a3bcce;background:transparent;font:700 13px system-ui;cursor:pointer}',
'#rx-admin-nav button.active,#rx-admin-nav button:hover{background:#19445e;color:white}',
'#rx-admin-main{flex:1;overflow:auto;padding:24px;min-width:0}',
'#rx-admin-main header{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:19px}#rx-admin-main h1{font-size:23px;margin:0}#rx-admin-main header p{color:#83a8bf;margin:4px 0 0}',
'#rx-admin-main .card{background:#10243a;border:1px solid #294b64;border-radius:15px;padding:17px;margin-bottom:14px}',
'#rx-admin-main .stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}',
'#rx-admin-main .number{font-size:29px;font-weight:900;color:#69e7d3}',
'#rx-admin-main .muted{font-size:12px;color:#a0b5c9}',
'#rx-admin-main label{display:block;margin:8px 0 13px;color:#a7c5d3;font-size:12px;font-weight:700}',
'#rx-admin-main input,#rx-admin-main textarea,#rx-admin-main select{display:block;width:100%;padding:11px;margin-top:5px;background:#071424;border:1px solid #38576c;border-radius:9px;color:#fff;outline:none;font:14px system-ui}',
'#rx-admin-main input:focus,#rx-admin-main textarea:focus,#rx-admin-main select:focus{border-color:#4dd8ce}',
'#rx-admin-main button.action{border:0;border-radius:10px;background:#4fd2d3;color:#06202a;padding:11px 15px;font-weight:850;cursor:pointer;margin:3px}',
'#rx-admin-main button.secondary{background:#284d65;color:#fff}#rx-admin-main button.danger{background:#ef6c80;color:#29070d}',
'#rx-admin-main #rx-admin-close{border:1px solid #3c5973;color:white;background:#19324a;border-radius:10px;font-size:23px;padding:5px 12px;cursor:pointer}',
'#rx-admin-main .notice{font-size:12px;font-weight:700;color:#64e7d4;min-height:19px;margin-bottom:10px}',
'#rx-admin-main .notice.error{color:#ff8596}#rx-admin-main [hidden]{display:none!important}',
'#rx-admin-main table{border-collapse:collapse;width:100%;font-size:12px}#rx-admin-main td,#rx-admin-main th{border-bottom:1px solid #2e5066;padding:9px 6px;text-align:left;vertical-align:top}#rx-admin-main th{color:#93bace}',
'@media(max-width:700px){#rx-admin-window{display:block;overflow:auto}#rx-admin-nav{padding:10px;border-right:0;border-bottom:1px solid #284157}#rx-admin-nav h2{font-size:16px;display:inline}#rx-admin-nav small{display:inline}#rx-admin-nav button{display:inline-block;width:auto;padding:8px;font-size:11px}#rx-admin-main{padding:13px}#rx-admin-main .stats{grid-template-columns:1fr}}'
].join('');
document.head.append(style);
const root=document.createElement('div');root.id='rx-admin-root';
root.innerHTML=[
'<div id="rx-admin-window" role="dialog" aria-modal="true" aria-label="RECOIL X administrator">',
'<aside id="rx-admin-nav"><h2>RECOIL X</h2><small>Z.5 · ADMIN COMMAND</small>',
'<button data-tab="overview" class="active">▣ Overview</button><button data-tab="players">♙ Players</button><button data-tab="coins">◈ Coin Grants</button><button data-tab="health">◎ Server Health</button><button data-tab="audit">☷ Audit History</button></aside>',
'<div id="rx-admin-main"><header><div><h1>Z.5 Admin Control Center</h1><p>Server-verified role · private administration</p></div><button id="rx-admin-close" aria-label="Close">×</button></header>',
'<div class="notice" id="rx-admin-message" aria-live="polite"></div>',
'<div id="rx-admin-authenticated" hidden>',
'<section data-page="overview"><div id="rx-admin-stats" class="stats"></div><div class="card"><h3>Live moderation</h3><p class="muted">Server-enforced bans, unbans, temporary bans, kicks and mutes. Every action needs a reason and is audited.</p><button class="action secondary" data-go="players">Manage players</button><button class="action secondary" data-go="audit">Action history</button></div><div class="card"><button id="rx-admin-logout" class="action secondary">Close Admin</button></div></section>',
'<section data-page="players" hidden><div class="card"><h3>Find a player</h3><form id="rx-admin-find"><label>Exact player name<input name="name" required></label><button class="action">Look up player</button></form><div id="rx-admin-player-info"></div></div>',
'<div class="card"><h3>Moderate a player</h3><form id="rx-admin-moderate">',
'<label>Player name<input name="name" required></label><label>Action<select name="action"><option value="kick">Kick</option><option value="tempban">Temporary ban</option><option value="ban">Permanent ban</option><option value="unban">Unban</option><option value="mute">Mute</option><option value="unmute">Unmute</option></select></label>',
'<label>Minutes (temporary ban / timed mute)<input name="minutes" type="number" min="1" max="43200" value="60"></label>',
'<label>Reason<textarea name="reason" maxlength="240" required placeholder="Why is this action necessary?"></textarea></label><button class="action danger">Apply moderation</button></form></div></section>',
'<section data-page="coins" hidden><div class="card"><h3>Spawn / grant coins</h3><p class="muted">Coins are securely added to a server-side bonus wallet and audited. The older browser-only shop is not yet linked to this wallet.</p>',
'<form id="rx-admin-coins"><label>Player name<input name="name" required></label><label>Amount (1 to 1,000,000)<input name="amount" type="number" min="1" max="1000000" value="1000" required></label>',
'<label>Reason<textarea name="reason" maxlength="240" required placeholder="Tournament win, event reward, compensation"></textarea></label>',
'<button class="action">+ Grant coins</button></form></div></section>',
'<section data-page="health" hidden><div class="card"><h3>Live Server Health</h3><p class="muted">Private operational metrics from the authenticated game backend. Does not claim to detect every cheat.</p><button id="rx-admin-health-refresh" class="action secondary">Refresh server health</button><div id="rx-admin-health-stats" class="stats"></div></div></section>',
'<section data-page="audit" hidden><div class="card"><h3>Moderation and coin history</h3><button id="rx-admin-refresh" class="action secondary">Refresh audit</button><div id="rx-admin-history" style="overflow:auto"></div></div><div class="card"><h3>Z.5 Game Activity</h3><div id="rx-admin-z5-history" style="overflow:auto"></div></div></section>',
'</div></div></div>'
].join('');
document.body.append(root);
const get=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let token='',adminVerified=false,verifyVersion=0;
const msg=(s,error=false)=>{const n=get('rx-admin-message');n.textContent=s;n.classList.toggle('error',error)};
const read=f=>Object.fromEntries(new FormData(f));
async function api(path,payload,authorized=true){
 const r=await fetch('/rx-api/'+path,{method:payload?'POST':'GET',
  headers:{...(payload?{'Content-Type':'application/json'}:{}),...(authorized?{Authorization:'Bearer '+token}:{})},
  ...(payload?{body:JSON.stringify(payload)}:{})});
 const data=await r.json();if(!r.ok)throw Error(data.error||'Request failed.');return data;
}
function setTabVisible(visible){
 for(const button of document.querySelectorAll('[data-rx-admin-only]'))button.hidden=!visible;
 if(!visible)root.classList.remove('open');
}
function clear(){
 token='';adminVerified=false;setTabVisible(false);
 get('rx-admin-authenticated').hidden=true;
}
async function verify(){
 const next=sessionStorage.getItem('rx5-token')||'';
 const version=++verifyVersion;
 adminVerified=false;token=next;setTabVisible(false);
 if(!next){clear();return false;}
 try{
  // A server-confirmed admin flag is required; client-side names never grant privileges.
  const d=await api('me');
  if(version!==verifyVersion||sessionStorage.getItem('rx5-token')!==next)return false;
  if(!d.user?.admin){clear();return false;}
  adminVerified=true;token=next;
  get('rx-admin-authenticated').hidden=false;
  setTabVisible(true);
  return true;
 }catch{if(version===verifyVersion)clear();return false;}
}
function close(){root.classList.remove('open');msg('');}
async function open(){
 if(!(await verify()))return false;
 root.classList.add('open');
 document.exitPointerLock?.();
 await tab('overview');
 return true;
}
window.RXZ5Admin={open,refresh:verify};
window.addEventListener('rx5-auth-changed',()=>{void verify()});
window.addEventListener('focus',()=>{void verify()});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)void verify()});
void verify();
get('rx-admin-close').addEventListener('click',close);
root.addEventListener('click',e=>{if(e.target===root)close();const go=e.target.closest('[data-go]');if(go)tab(go.dataset.go);});
root.addEventListener('pointerdown',e=>e.stopPropagation());
document.addEventListener('keydown',e=>{if(!root.classList.contains('open'))return;if(e.key==='Escape'){close();return;}if(root.contains(e.target))e.stopPropagation();},true);
async function tab(name){
 for(const p of root.querySelectorAll('[data-page]'))p.hidden=p.dataset.page!==name;
 for(const b of root.querySelectorAll('[data-tab]'))b.classList.toggle('active',b.dataset.tab===name);
 msg('');if(name==='overview')await overview();if(name==='health')await health();if(name==='audit')await audit();
}
for(const b of root.querySelectorAll('[data-tab]'))b.onclick=()=>tab(b.dataset.tab);
async function overview(){try{const d=await api('admin/overview');
 const values=[['Total players',d.total],['Online now',d.online],['Banned players',d.banned],['Bonus coins granted',Number(d.coinsGranted).toLocaleString()]];
 get('rx-admin-stats').innerHTML=values.map(row=>'<div class="card"><div class="muted">'+esc(row[0])+'</div><div class="number">'+esc(row[1])+'</div></div>').join('');
}catch(e){msg(e.message,true);}}
get('rx-admin-logout').onclick=close;
async function health(){try{
 const d=await api('z5/admin/health');
 const values=[['Online players',d.online],['Active rooms',d.rooms],['Live matches',d.activeMatches],
 ['Ranked queue',d.queuedPlayers],['Total accounts',d.registeredPlayers],
 ['Completed matches',d.completedMatches],['Server RAM (MB)',d.rssMB],
 ['Uptime (minutes)',Math.floor(d.uptimeSeconds/60)]];
 get('rx-admin-health-stats').innerHTML=values.map(x=>
   '<div class="card"><div class="muted">'+esc(x[0])+'</div><div class="number">'+esc(x[1])+'</div></div>').join('');
}catch(error){msg(error.message,true);}}
get('rx-admin-health-refresh').onclick=health;
get('rx-admin-find').addEventListener('submit',async e=>{e.preventDefault();
 try{const d=await api('admin/player?name='+encodeURIComponent(read(e.target).name));const p=d.player;
 get('rx-admin-player-info').innerHTML='<div class="card"><b>'+esc(p.name)+'</b> '+(p.admin?'(ADMIN)':'')+
 '<p class="muted">ID '+esc(p.id)+'</p><p>Ban: '+(p.banned?'ACTIVE':'none')+' '+esc(p.banReason)+'</p>'+
 '<p>Mute: '+(p.muted?'ACTIVE':'none')+' '+esc(p.muteReason)+'</p><p>Server wallet: '+esc(p.coins)+' coins</p>'+
 '<button class="action secondary" id="rx-admin-select">Moderate this player</button><button class="action secondary" id="rx-admin-input-review">Review rejected inputs</button><div id="rx-admin-input-evidence" aria-live="polite"></div></div>';
 get('rx-admin-select').onclick=()=>{get('rx-admin-moderate').elements.name.value=p.name;msg('Selected '+p.name);};
 get('rx-admin-input-review').onclick=async()=>{
  const output=get('rx-admin-input-evidence');
  output.textContent='Loading review evidence…';
  try{
   const report=await api('z5/anti-cheat/review?name='+encodeURIComponent(p.name));
   const rows=report.rejectedInputs||[],flags=report.evidence||[];
   output.innerHTML='<p class="muted">'+esc(report.notice)+'</p><p>'+rows.length+' recent rejected-input entries · '+flags.length+' movement/shot evidence entries</p>'+
    (rows.length?'<table><tr><th>Time</th><th>Reason</th></tr>'+rows.map(r=>'<tr><td>'+esc(new Date(r.at).toLocaleString())+'</td><td>'+esc(r.kind)+'</td></tr>').join('')+'</table>':'<p>No rejected-input evidence recorded.</p>');
  }catch(error){output.textContent=error.message;}
 };
 }catch(err){msg(err.message,true);}});
get('rx-admin-moderate').addEventListener('submit',async e=>{e.preventDefault();const b=read(e.target);
 if(!confirm('Confirm '+b.action+' for '+b.name+'?'))return;
 try{const d=await api('z2/admin/action',{name:b.name,action:b.action,reason:b.reason,minutes:Number(b.minutes)});
 msg('Applied '+d.action+' to '+d.name+'.');
 }catch(err){msg(err.message,true);}});
get('rx-admin-coins').addEventListener('submit',async e=>{e.preventDefault();const b=read(e.target);
 if(!confirm('Grant '+b.amount+' bonus wallet coins to '+b.name+'?'))return;
 try{const d=await api('admin/coins',{name:b.name,amount:Number(b.amount),reason:b.reason});
 msg('Granted '+d.amount.toLocaleString()+' coins to '+d.name+'. New wallet balance: '+d.coins.toLocaleString()+'.');
 }catch(err){msg(err.message,true);}});
async function audit(){try{
 const [a,c,z5]=await Promise.all([api('z2/admin'),api('admin/ledger'),api('z5/admin/audit')]);
 const rows=[...a.actions.map(x=>({...x,when:x.created,detail:x.action})),...c.grants.map(x=>({...x,when:x.created,detail:'+'+x.amount+' coins'}))].sort((x,y)=>y.when-x.when).slice(0,70);
 get('rx-admin-history').innerHTML=rows.length?'<table><tr><th>Time</th><th>Admin</th><th>Player</th><th>Action</th><th>Reason</th></tr>'+rows.map(x=>'<tr><td>'+esc(new Date(x.when).toLocaleString())+'</td><td>'+esc(x.actor)+'</td><td>'+esc(x.target)+'</td><td>'+esc(x.detail)+'</td><td>'+esc(x.reason)+'</td></tr>').join('')+'</table>':'No moderation actions yet.';
 get('rx-admin-z5-history').innerHTML=(z5.actions||[]).slice(0,40).map(x=>
   '<div class="card"><b>'+esc(x.action)+'</b> · '+esc(x.actor)+'<div class="muted">'+esc(x.details)+'</div></div>').join('')||'<p class="muted">No Z.5 actions recorded yet.</p>';
 }catch(e){msg(e.message,true);}}
get('rx-admin-refresh').onclick=audit;
})();