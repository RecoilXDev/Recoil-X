// Update A alpha control center. No separate WebSocket, account or currency.
(()=>{'use strict';
if(window.RXUpdateA)return;
const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const style=document.createElement('style');style.textContent=`
#rx-a{position:fixed;inset:0;z-index:2147483200;background:#100c08e8;overflow:auto;color:#f5e4ce;font:14px/1.5 system-ui;padding:16px}
#rx-a[hidden]{display:none!important}#rx-a *{box-sizing:border-box}
#rx-a-panel{max-width:900px;margin:3vh auto;background:#241b14;border:1px solid #8e6c46;border-radius:18px;padding:22px;box-shadow:0 20px 70px #0008}
#rx-a h2{font-size:26px;line-height:1.1;margin:5px 0;color:#ffe0a8;letter-spacing:.04em}#rx-a h3{font-size:16px;margin:0 0 8px}
#rx-a p{margin:7px 0}#rx-a .muted{color:#c9b59e;font-size:12px}
#rx-a .head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}
#rx-a .tabs{display:flex;gap:6px;flex-wrap:wrap;border-bottom:1px solid #795d3f;padding:14px 0}
#rx-a button,#rx-a select{font:600 13px system-ui;border:1px solid #9b7b53;background:#3f2c1d;color:#ffe8c5;border-radius:9px;padding:11px;min-height:44px;cursor:pointer}
#rx-a button[aria-current=true]{background:#d7ae71;color:#25170c;border-color:#f4d19e}#rx-a button:focus-visible,#rx-a select:focus-visible{outline:3px solid #f4c46e;outline-offset:3px}
#rx-a button:disabled{opacity:.5;cursor:default}
#rx-a .card{border:1px solid #6b5339;background:#302319;padding:16px;border-radius:12px;margin-top:12px}
#rx-a .metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(125px,1fr));gap:8px}
#rx-a .metric{padding:12px;border:1px solid #796143;border-radius:10px;background:#3a291b;overflow-wrap:anywhere}
#rx-a .metric strong{font-size:22px;display:block;color:#ffd597}
#rx-a .row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
#rx-a table{width:100%;border-collapse:collapse;font-size:13px}#rx-a td,#rx-a th{padding:9px 6px;text-align:left;border-bottom:1px solid #624b34}
#rx-a .scroll{overflow-x:auto}#rx-a-status{min-height:22px;color:#ffd18b}
@media(max-width:550px){#rx-a{padding:8px}#rx-a-panel{padding:14px;margin:0 auto}#rx-a h2{font-size:21px}#rx-a .card{padding:12px}}
@media(prefers-reduced-motion:reduce){#rx-a *{scroll-behavior:auto!important;transition:none!important}}
`;document.head.append(style);
const root=document.createElement('div');root.id='rx-a';root.hidden=true;
root.innerHTML='<section id="rx-a-panel" role="dialog" aria-modal="true" aria-labelledby="rx-a-title" tabindex="-1"><div class="head"><div><p class="muted">RECOIL X · BETA CANDIDATE</p><h2 id="rx-a-title">UPDATE A / BETA B2 CONTROL CENTER</h2><p class="muted">Connected systems · existing accounts and game modes preserved</p></div><button id="rx-a-close" aria-label="Close control center">Close ✕</button></div><nav class="tabs" aria-label="Control center sections"><button data-a-tab="overview">Overview</button><button data-a-tab="network">Connection</button><button data-a-tab="combat">Combat</button><button data-a-tab="security">Account</button><button data-a-tab="progression">Progression & Season</button><button data-a-tab="community">Community</button><button data-a-tab="seasonkills">Season Kills</button><button data-a-tab="pass">Season Pass</button><button data-a-tab="curator">Curator Mode</button><button data-a-tab="shield">Server Shield</button></nav><p id="rx-a-status" role="status" aria-live="polite"></p><div id="rx-a-body"></div></section>';
document.body.append(root);
let current='overview',generation=0,lastFocus=null,controller=null;
const token=()=>sessionStorage.getItem('rx5-token');
const body=()=>$('rx-a-body'),status=(t,bad=false)=>{const n=$('rx-a-status');n.textContent=t;n.style.color=bad?'#ffada3':'#ffd18b';};
function invalidate(){generation++;controller?.abort();controller=null;return generation;}
async function api(path,payload,signal){
 const t=token();if(!t)throw Error('Sign in through Career & Clans first.');
 const res=await fetch('/rx-api/'+path,{method:payload===undefined?'GET':'POST',headers:{Authorization:'Bearer '+t,...(payload===undefined?{}:{'Content-Type':'application/json'})},body:payload===undefined?undefined:JSON.stringify(payload),cache:'no-store',signal});
 const data=await res.json();if(!res.ok)throw Error(data.error||'Request failed.');return data;
}
const metric=(name,value)=>'<div class="metric"><span class="muted">'+esc(name)+'</span><strong>'+esc(value)+'</strong></div>';
function close(){invalidate();root.hidden=true;body().replaceChildren();status('');lastFocus?.focus?.();lastFocus=null;}
function alive(id){return id===generation&&!root.hidden;}
async function open(tab='overview'){if(root.hidden)lastFocus=document.activeElement;root.hidden=false;document.exitPointerLock?.();$('rx-a-panel').focus();await show(tab);}
async function show(tab){
 const id=invalidate();current=tab;status('');controller=new AbortController();
 const signal=controller.signal;
 for(const b of root.querySelectorAll('[data-a-tab]'))b.setAttribute('aria-current',String(b.dataset.aTab===tab));
 body().textContent='Loading…';
 try{
 if(tab==='overview'){
  body().innerHTML='<div class="card"><h3>Make every match count.</h3><p>Choose your connection profile, review weapon performance from finished multiplayer matches, and manage your active login sessions. These are the first integrated Update A systems, not a complete overhaul.</p><div class="row"><button data-a-tab="network">Connection settings</button><button data-a-tab="combat">Match analysis</button><button data-a-tab="security">Account security</button></div></div><div class="card"><h3>Keep playing</h3><p class="muted">Your Quick Play, modes, collection, career and original Sand Edition interface stay unchanged. Open the existing Multiplayer lobby to join matches.</p><button data-a-action="close">Return to game</button></div>';
 }else if(tab==='curator'){
  if(!window.RXCurator)throw Error('Curator editor unavailable.');window.RXCurator.mount(body(),signal);
 }else if(tab==='network'){
  const d=await api('a/connection',undefined,signal);if(!alive(id))return;
  body().innerHTML='<div class="card"><h3>'+ (d.connected?'Multiplayer connection active':'No active connection on this session')+'</h3><div class="metrics">'+metric('Profile',d.profile)+metric('State snapshots sent',d.snapshotsSent)+metric('Snapshots skipped',d.snapshotsSkipped)+metric('State data (KiB)',(d.stateBytes/1024).toFixed(1))+'</div><p class="muted">'+esc(d.note)+'</p><p>Economy mode reduces the frequency of position/state snapshots to around 5 per second. It may make movement less smooth but uses less bandwidth. Reliable match events are not intentionally skipped. The setting lasts for this connection.</p><div class="row"><button data-a-action="profile" data-profile="standard" '+(!d.connected?'disabled':'')+'>Standard</button><button data-a-action="profile" data-profile="economy" '+(!d.connected?'disabled':'')+'>Economy</button><button data-a-tab="network">Refresh</button><button data-a-action="network-probe">Measure connection</button><div id="rx-a-probe" role="status"></div></div></div>';
 }else if(tab==='combat'){
  const d=await api('z5/matches',undefined,signal);if(!alive(id))return;
  body().innerHTML='<div class="card"><h3>Personal after-action reports</h3><p class="muted">Accuracy counts damaging projectiles, including shotgun pellets, not trigger pulls. Only newly completed matches in this build contain these statistics.</p>'+(d.matches.length?d.matches.map(m=>'<div class="card row"><div style="flex:1"><b>'+esc(m.mode)+'</b><p class="muted">'+esc(new Date(m.finished).toLocaleString())+' · '+esc(m.score.join(' – '))+'</p></div><button data-a-action="match" data-id="'+esc(m.id)+'">View report</button></div>').join(''):'<p>No completed multiplayer matches yet.</p>')+'</div>';
 }else if(tab==='progression'){
  const d=await api('a/progression',undefined,signal);if(!alive(id))return;
  const season=d.season;
  body().innerHTML='<div class="card"><h3>Progression 2.0</h3><div class="metrics">'+metric('Level',d.level)+metric('Lifetime XP',d.xp)+metric('Eligible matches',d.matches)+metric('Wins',d.wins)+'</div><p>Next level at '+esc(d.nextLevelXp)+' XP.</p><progress value="'+esc(d.xp%500)+'" max="500" aria-label="Progress to next level" style="width:100%"></progress><p class="muted">Earn server-verified XP from completed multiplayer matches lasting at least 30 seconds with sufficient input. Remakes, forfeits and abandoned matches do not count. Existing coins, items and weapon mastery are separate.</p></div><div class="card"><h3>'+esc(season.name)+'</h3><p>'+esc(season.state.toUpperCase())+' · November 30, 2026 – March 31, 2027 (Oman time)</p><div class="metrics">'+metric('Season XP',season.xp)+metric('Season level',season.level)+'</div>'+season.milestones.map(m=>'<p>'+esc(m.title)+' · Level '+esc(m.level)+' — '+(m.unlocked?'Unlocked':'Locked')+'</p>').join('')+'<p class="muted">Season milestones are profile achievements, not inventory items. Seasonal XP starts at the server-controlled opening date.</p></div>';
 }else if(tab==='pass'){
  const d=await api('a/season/pass',undefined,signal);if(!alive(id))return;
  body().innerHTML='<div class="card"><h3>New Dawn · free reward track</h3><p>'+esc(d.state)+' · '+esc(d.xp)+' season XP</p><p class="muted">Earn permanent account profile badges through verified match XP. Claim before the season ends.</p>'+d.rewards.map(t=>'<div class="card row"><div style="flex:1"><b>'+esc(t.title)+'</b><p>'+esc(t.xp)+' XP · '+(t.claimed?'Owned':t.eligible?'Ready':'Locked')+'</p></div><button data-a-action="pass-claim" data-tier="'+esc(t.tier)+'" '+(!t.eligible||t.claimed?'disabled':'')+'>Claim</button></div>').join('')+'</div>';
 }else if(tab==='seasonkills'){
  const d=await api('a/season/kills',undefined,signal);if(!alive(id))return;
  const tiers=[['gold','1st · Gold','#e8c45a'],['silver','2nd · Silver','#d2deed'],['bronze','3rd · Bronze','#d39a68'],['blue','4th and below · Blue','#77bcff']];
  const cards=tiers.map(([tier,label,color])=>'<div class="metric" style="border-color:'+color+'"><b style="color:'+color+'">'+label+'</b>'+ '<div data-rx-season-model="'+tier+'"></div>'+'<p>New Dawn Sandwyrm</p></div>').join('');
  const r=d.reward;
  body().innerHTML='<div class="card"><h3>Season 1 · Kill Championship</h3><p>'+esc(d.state.toUpperCase())+' · '+(d.finalized?'Final placements locked':'Live standings — provisional')+'</p><div class="metrics">'+metric('Your rank',d.personal?.rank??'—')+metric('Your kills',d.personal?.kills??0)+'</div><p class="muted">'+esc(d.notice)+'</p></div><div class="card"><h3>Exclusive Godly reskins</h3><div class="metrics">'+cards+'</div><p class="muted">All eligible participants earn exactly one permanent account-bound reward. No crate drops, trades or gameplay bonuses.</p>'+(r?'<h3>Your reward: '+esc(r.tier.toUpperCase())+' Sandwyrm</h3><button data-a-action="season-equip" data-value="'+(!r.equipped)+'">'+(r.equipped?'Unequip reward':'Equip reward')+'</button>':'<p>Rewards unlock after the season ends.</p>')+'</div><div class="card"><h3>Top 50 by kills</h3>'+(d.players.length?'<div class="scroll"><table><thead><tr><th>Place</th><th>Player</th><th>Kills</th><th>Reward</th></tr></thead><tbody>'+d.players.map(p=>'<tr><td>'+esc(p.rank)+'</td><td>'+esc(p.name)+'</td><td>'+esc(p.kills)+'</td><td>'+esc(p.tier.toUpperCase())+'</td></tr>').join('')+'</tbody></table></div>':'<p>No eligible season results yet.</p>')+'</div>';
 for(const n of body().querySelectorAll('[data-rx-season-model]')){if(window.RXCurator)n.replaceChildren(window.RXCurator.preview(n.dataset.rxSeasonModel));else n.innerHTML=window.RXSeasonGodly?.preview(n.dataset.rxSeasonModel)||'';}
 }else if(tab==='community'){
  const [d,b]=await Promise.all([api('a/progression',undefined,signal),api('a/community',undefined,signal)]);if(!alive(id))return;
  body().innerHTML='<div class="card"><h3>Season leaderboard</h3><p class="muted">'+esc(b.notice)+'</p><p>Your profile visibility: <b>'+(d.public?'Opted in':'Private')+'</b></p><button data-a-action="visibility" data-value="'+(!d.public)+'">'+(d.public?'Leave leaderboard':'Join leaderboard')+'</button><p class="muted">Participation is optional and can be reversed at any time.</p></div><div class="card">'+(b.players.length?'<div class="scroll"><table><thead><tr><th>Rank</th><th>Player</th><th>Season XP</th></tr></thead><tbody>'+b.players.map((p,i)=>'<tr><td>'+(i+1)+'</td><td>'+esc(p.name)+'</td><td>'+esc(p.season_xp)+'</td></tr>').join('')+'</tbody></table></div>':'<p>'+(b.state==='upcoming'?'Leaderboard opens with Season 1.':'No opted-in seasonal scores yet.')+'</p>')+'</div>';
 }else if(tab==='shield'){
  const [d,q]=await Promise.all([api('a/shield',undefined,signal),api('a/shield/queue',undefined,signal)]);if(!alive(id))return;
  const me=await api('me',undefined,signal);if(!alive(id))return;
  let extra='';
  if(me.user?.admin){
   const a=await api('a/admin/shield',undefined,signal);if(!alive(id))return;
   extra='<div class="card"><h3>Administrator controls</h3><div class="metrics">'+metric('RAM (MiB)',a.rssMB+' / '+a.rssLimitMB)+metric('Process CPU',a.cpuPercent+'%')+metric('Denied admissions',a.denied)+'</div><p class="muted">'+esc(a.notice)+'</p><button data-a-action="maintenance" data-value="'+(!a.maintenance)+'">'+(a.maintenance?'Resume admissions':'Pause new matches & admissions')+'</button><p class="muted">Existing matches may finish. Admin accounts retain maintenance access.</p><button data-a-action="batch-moderation">Review batch ban / unban</button><h3>Recent security events</h3>'+a.events.slice(0,20).map(e=>'<p>'+esc(new Date(e.at).toLocaleString())+' · '+esc(e.kind)+'</p>').join('')+'</div>';
  }
  body().innerHTML='<div class="card"><h3>Operation Server Shield</h3><div class="metrics">'+metric('Status',d.maintenance?'Maintenance':d.busy?'Busy':'Open')+metric('Online',d.online+' / '+d.capacity)+metric('Pending connections',d.pending)+metric('Authentication jobs',d.authJobs)+metric('Waiting',d.waiting)+'</div><p>When capacity is reached, retry after '+esc(d.retryAfterSeconds)+' seconds. Existing matches are prioritized.</p><button data-a-tab="shield">Refresh status</button><div class="card"><h3>Fair admission queue</h3><p>'+ (q.ready?'Your slot is ready. Return to Multiplayer and connect before the offer expires.':q.position?'Position '+esc(q.position)+' · refresh your place regularly.':'Join the queue if the server is full.')+'</p><button data-a-action="queue-join">'+(q.position?'Refresh my queue place':'Join waiting queue')+'</button> <button data-a-action="queue-leave">Leave queue</button><p class="muted">Queue places expire after inactivity; offers are held for a short time. Existing connections are not interrupted.</p></div></div>'+extra;
 }else if(tab==='security'){
  const d=await api('a/sessions',undefined,signal);if(!alive(id))return;
  body().innerHTML='<div class="card"><h3>Active account sessions</h3><div class="metrics">'+metric('Valid sessions',d.active)+'</div><p class="muted">'+esc(d.note)+' No session tokens or device addresses are displayed.</p>'+d.sessions.map(s=>'<p>'+ (s.current?'<b>Current session</b>':'Other session')+' · expires '+esc(new Date(s.expires).toLocaleString())+'</p>').join('')+'<button data-a-action="revoke" '+(d.active<=1?'disabled':'')+'>Sign out other sessions</button></div><div class="card"><h3>Recovery</h3><p class="muted">Generate and store a one-time recovery code through the existing Parties & More → Recovery panel. Never share your code.</p></div>';
 }
 }catch(e){if(alive(id)&&e.name!=='AbortError'){body().textContent=e.message;status('Could not load this section.',true);}}
}
async function matchReport(matchId){
 const id=invalidate();controller=new AbortController();body().textContent='Loading match report…';
 try{
  const d=await api('z5/matches/'+encodeURIComponent(matchId),undefined,controller.signal);if(!alive(id))return;
  const names=['Assault rifle','Shotgun','Sniper rifle','SMG'];
  body().innerHTML='<div class="card"><button data-a-tab="combat">← Match history</button><h3>'+esc(d.mode)+' · '+esc(d.score.join(' – '))+'</h3><p class="muted">Your server-recorded weapon performance</p>'+(d.combat?'<div class="scroll"><table><thead><tr><th>Weapon</th><th>Triggers</th><th>Projectiles</th><th>Hits</th><th>Accuracy</th><th>Damage</th></tr></thead><tbody>'+d.combat.map(w=>'<tr><td>'+esc(names[w.weapon]||'Weapon')+'</td><td>'+esc(w.triggers)+'</td><td>'+esc(w.projectiles)+'</td><td>'+esc(w.hits)+'</td><td>'+esc(w.accuracy===null?'—':w.accuracy+'%')+'</td><td>'+esc(w.damage)+'</td></tr>').join('')+'</tbody></table></div>':'<p>This older match has no weapon statistics.</p>')+'</div>';
 }catch(e){if(alive(id)&&e.name!=='AbortError')status(e.message,true);}
}
root.addEventListener('click',async e=>{
 if(e.target===root||e.target.id==='rx-a-close'){close();return;}
 const b=e.target.closest('button');if(!b)return;
 if(b.dataset.aTab){await show(b.dataset.aTab);return;}
 const action=b.dataset.aAction;if(action==='close'){close();return;}
 if(action==='match'){await matchReport(b.dataset.id);return;}
 if(b.disabled)return;
 const id=generation;b.disabled=true;
 try{
  if(action==='pass-claim'){await api('a/season/pass',{tier:Number(b.dataset.tier)});if(alive(id))await show('pass');}
  if(action==='batch-moderation'){
   const actionName=prompt('Enter ban or unban');if(!['ban','unban'].includes(actionName))return;
   const names=prompt('Enter up to 10 account names, separated by commas');if(!names)return;
   const request={action:actionName,names:names.split(',').map(n=>n.trim()).filter(Boolean)};
   const preview=await api('a/admin/shield/batch',{...request,preview:true});if(!alive(id))return;
   const reason=prompt('Reason for '+actionName+' on '+preview.names.join(', '));if(!reason)return;
   const confirmation=prompt('Type exactly: '+preview.confirmation);if(confirmation!==preview.confirmation)return;
   const result=await api('a/admin/shield/batch',{...request,reason,confirmation});if(alive(id)){await show('shield');status(result.results.map(r=>r.name+': '+(r.ok?'OK':r.error)).join(' · '));}
  }
  if(action==='season-equip'){await api('a/season/reward',{equipped:b.dataset.value==='true'});await window.RXSeasonGodly?.refresh();if(alive(id))await show('seasonkills');}
  if(action==='visibility'){await api('a/community',{public:b.dataset.value==='true'});if(alive(id))await show('community');}
  if(action==='queue-join'||action==='queue-leave'){await api('a/shield/queue',{leave:action==='queue-leave'});if(alive(id))await show('shield');}
  if(action==='maintenance'&&confirm('Change server maintenance status?')){await api('a/admin/shield',{maintenance:b.dataset.value==='true'});if(alive(id))await show('shield');}
  if(action==='network-probe'){
   const samples=[];const target=$('rx-a-probe');
   for(let i=0;i<5;i++){if(!alive(id))return;const start=performance.now();await api('a/connection',undefined,controller?.signal);samples.push(performance.now()-start);if(alive(id)&&target)target.textContent='Measured '+samples.length+'/5 authenticated HTTP round trips';}
   if(alive(id)&&target){const sorted=[...samples].sort((a,b)=>a-b),avg=samples.reduce((a,b)=>a+b,0)/samples.length,jitter=samples.slice(1).reduce((sum,n,i)=>sum+Math.abs(n-samples[i]),0)/4;
     target.textContent='HTTP RTT median '+Math.round(sorted[2])+' ms · average '+Math.round(avg)+' ms · mean successive variation '+Math.round(jitter)+' ms. Not game WebSocket ping or packet loss.';}
  }
  if(action==='profile'){await api('a/connection',{profile:b.dataset.profile});if(alive(id)){await show('network');status('Connection profile changed.');}}
  if(action==='revoke'&&confirm('Sign out every other account session? Your current session will remain signed in.')){
   const d=await api('a/sessions/revoke-others',{});if(alive(id)){await show('security');status(d.revoked+' other session(s) revoked.');}
  }
 }catch(e){if(alive(id))status(e.message,true);}finally{b.disabled=false;}
});
document.addEventListener('keydown',e=>{
 if(root.hidden)return;
 if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();return;}
 if(e.key!=='Tab')return;
 const items=[...root.querySelectorAll('button:not([disabled]),select:not([disabled]),input:not([disabled]),[tabindex="0"]')];
 if(!items.length)return;
 const first=items[0],last=items[items.length-1];
 if(e.shiftKey&&(document.activeElement===first||!root.contains(document.activeElement))){e.preventDefault();last.focus();}
 else if(!e.shiftKey&&(document.activeElement===last||!root.contains(document.activeElement))){e.preventDefault();first.focus();}
},true);
const host=$('rx5-native-main')||$('rx5More');
if(host&&!$('rx-a-entry')){const entry=document.createElement('button');entry.id='rx-a-entry';entry.type='button';entry.textContent='Update A · Control Center';entry.onclick=()=>open();host.append(entry);}
window.RXUpdateA={open,close};
})();
