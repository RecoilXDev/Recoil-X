(()=>{'use strict';
if(window.__rxAdminLoaded)return;window.__rxAdminLoaded=true;
const style=document.createElement('style');
style.textContent=[
'#rx-admin-launch{position:fixed;left:18px;bottom:18px;z-index:2147483000;cursor:pointer;border:1px solid #31a9bd;border-radius:13px;padding:12px 17px;background:linear-gradient(110deg,#082637,#173a54);box-shadow:0 6px 30px #0009;color:#eaffff;font:800 12px system-ui;letter-spacing:.12em}',
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
const launch=document.createElement('button');launch.id='rx-admin-launch';launch.textContent='⚡ ADMIN';launch.type='button';document.body.append(launch);
const root=document.createElement('div');root.id='rx-admin-root';
root.innerHTML=[
'<div id="rx-admin-window" role="dialog" aria-modal="true" aria-label="RECOIL X administrator">',
'<aside id="rx-admin-nav"><h2>RECOIL X</h2><small>COMMAND CENTER</small>',
'<button data-tab="overview" class="active">▣ Overview</button><button data-tab="players">♙ Players</button><button data-tab="coins">◈ Spawn Coins</button><button data-tab="audit">☷ Action Log</button></aside>',
'<div id="rx-admin-main"><header><div><h1>Admin Control Center</h1><p>Secure live server management</p></div><button id="rx-admin-close" aria-label="Close">×</button></header>',
'<div class="notice" id="rx-admin-message" aria-live="polite"></div>',
'<section id="rx-admin-login-section" class="card"><h3>Administrator sign in</h3><p class="muted">Use your existing RECOIL X admin account. Your password is never stored.</p>',
'<form id="rx-admin-login"><label>Account name<input name="name" required autocomplete="username"></label>',
'<label>Password<input type="password" name="password" required autocomplete="current-password"></label>',
'<button class="action">Sign in</button></form></section>',
'<div id="rx-admin-authenticated" hidden>',
'<section data-page="overview"><div id="rx-admin-stats" class="stats"></div><div class="card"><h3>Live moderation</h3><p class="muted">Server-enforced bans, unbans, temporary bans, kicks and mutes. Every action needs a reason and is audited.</p><button class="action secondary" data-go="players">Manage players</button><button class="action secondary" data-go="audit">Action history</button></div><div class="card"><button id="rx-admin-logout" class="action secondary">Sign out</button></div></section>',
'<section data-page="players" hidden><div class="card"><h3>Find a player</h3><form id="rx-admin-find"><label>Exact player name<input name="name" required></label><button class="action">Look up player</button></form><div id="rx-admin-player-info"></div></div>',
'<div class="card"><h3>Moderate a player</h3><form id="rx-admin-moderate">',
'<label>Player name<input name="name" required></label><label>Action<select name="action"><option value="kick">Kick</option><option value="tempban">Temporary ban</option><option value="ban">Permanent ban</option><option value="unban">Unban</option><option value="mute">Mute</option><option value="unmute">Unmute</option></select></label>',
'<label>Minutes (temporary ban / timed mute)<input name="minutes" type="number" min="1" max="43200" value="60"></label>',
'<label>Reason<textarea name="reason" maxlength="240" required placeholder="Why is this action necessary?"></textarea></label><button class="action danger">Apply moderation</button></form></div></section>',
'<section data-page="coins" hidden><div class="card"><h3>Spawn / grant coins</h3><p class="muted">Coins are securely added to a server-side bonus wallet and audited. The older browser-only shop is not yet linked to this wallet.</p>',
'<form id="rx-admin-coins"><label>Player name<input name="name" required></label><label>Amount (1 to 1,000,000)<input name="amount" type="number" min="1" max="1000000" value="1000" required></label>',
'<label>Reason<textarea name="reason" maxlength="240" required placeholder="Tournament win, event reward, compensation"></textarea></label>',
'<button class="action">+ Grant coins</button></form></div></section>',
'<section data-page="audit" hidden><div class="card"><h3>Moderation and coin history</h3><button id="rx-admin-refresh" class="action secondary">Refresh</button><div id="rx-admin-history" style="overflow:auto"></div></div></section>',
'</div></div></div>'
].join('');
document.body.append(root);
const get=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let token=sessionStorage.getItem('rx-admin-token')||'';
const msg=(s,error=false)=>{const n=get('rx-admin-message');n.textContent=s;n.classList.toggle('error',error)};
const read=f=>Object.fromEntries(new FormData(f));
async function api(path,payload,authorized=true){
 const r=await fetch('/rx-api/'+path,{method:payload?'POST':'GET',headers:{...(payload?{'Content-Type':'application/json'}:{}),...(authorized?{Authorization:'Bearer '+token}:{})},...(payload?{body:JSON.stringify(payload)}:{})});
 const data=await r.json();if(!r.ok)throw Error(data.error||'Request failed.');return data;
}
function clear(){token='';sessionStorage.removeItem('rx-admin-token');get('rx-admin-login-section').hidden=false;get('rx-admin-authenticated').hidden=true;}
async function verify(){
 if(!token){clear();return;}
 try{const d=await api('me');if(!d.user?.admin)throw Error('Admin role is not enabled.');
 get('rx-admin-login-section').hidden=true;get('rx-admin-authenticated').hidden=false;await tab('overview');
 }catch(e){clear();msg(e.message,true);}
}
function close(){root.classList.remove('open');msg('');}
launch.addEventListener('click',()=>{root.classList.add('open');document.exitPointerLock?.();verify();});
get('rx-admin-close').addEventListener('click',close);
root.addEventListener('click',e=>{if(e.target===root)close();const go=e.target.closest('[data-go]');if(go)tab(go.dataset.go);});
root.addEventListener('pointerdown',e=>e.stopPropagation());
document.addEventListener('keydown',e=>{if(!root.classList.contains('open'))return;if(e.key==='Escape'){close();return;}if(root.contains(e.target))e.stopPropagation();},true);
async function tab(name){
 for(const p of root.querySelectorAll('[data-page]'))p.hidden=p.dataset.page!==name;
 for(const b of root.querySelectorAll('[data-tab]'))b.classList.toggle('active',b.dataset.tab===name);
 msg('');if(name==='overview')await overview();if(name==='audit')await audit();
}
for(const b of root.querySelectorAll('[data-tab]'))b.onclick=()=>tab(b.dataset.tab);
async function overview(){try{const d=await api('admin/overview');
 const values=[['Total players',d.total],['Online now',d.online],['Banned players',d.banned],['Bonus coins granted',Number(d.coinsGranted).toLocaleString()]];
 get('rx-admin-stats').innerHTML=values.map(row=>'<div class="card"><div class="muted">'+esc(row[0])+'</div><div class="number">'+esc(row[1])+'</div></div>').join('');
}catch(e){msg(e.message,true);}}
get('rx-admin-login').addEventListener('submit',async e=>{e.preventDefault();const b=read(e.target);
 try{const d=await api('login',b,false);if(!d.user?.admin)throw Error('This account is not an administrator.');
 token=d.token;sessionStorage.setItem('rx-admin-token',token);e.target.reset();await verify();msg('Admin access granted.');
 }catch(err){clear();msg(err.message,true);}});
get('rx-admin-logout').onclick=async()=>{try{await api('logout',{});}catch{}clear();msg('Signed out of admin panel.');};
get('rx-admin-find').addEventListener('submit',async e=>{e.preventDefault();
 try{const d=await api('admin/player?name='+encodeURIComponent(read(e.target).name));const p=d.player;
 get('rx-admin-player-info').innerHTML='<div class="card"><b>'+esc(p.name)+'</b> '+(p.admin?'(ADMIN)':'')+
 '<p class="muted">ID '+esc(p.id)+'</p><p>Ban: '+(p.banned?'ACTIVE':'none')+' '+esc(p.banReason)+'</p>'+
 '<p>Mute: '+(p.muted?'ACTIVE':'none')+' '+esc(p.muteReason)+'</p><p>Server wallet: '+esc(p.coins)+' coins</p>'+
 '<button class="action secondary" id="rx-admin-select">Moderate this player</button></div>';
 get('rx-admin-select').onclick=()=>{get('rx-admin-moderate').elements.name.value=p.name;msg('Selected '+p.name);};
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
 const [a,c]=await Promise.all([api('z2/admin'),api('admin/ledger')]);
 const rows=[...a.actions.map(x=>({...x,when:x.created,detail:x.action})),...c.grants.map(x=>({...x,when:x.created,detail:'+'+x.amount+' coins'}))].sort((x,y)=>y.when-x.when).slice(0,70);
 get('rx-admin-history').innerHTML=rows.length?'<table><tr><th>Time</th><th>Admin</th><th>Player</th><th>Action</th><th>Reason</th></tr>'+rows.map(x=>'<tr><td>'+esc(new Date(x.when).toLocaleString())+'</td><td>'+esc(x.actor)+'</td><td>'+esc(x.target)+'</td><td>'+esc(x.detail)+'</td><td>'+esc(x.reason)+'</td></tr>').join('')+'</table>':'No moderation actions yet.';
 }catch(e){msg(e.message,true);}}
get('rx-admin-refresh').onclick=audit;
})();