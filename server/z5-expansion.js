// RECOIL X Z.5 extensions: opt-in account / party / spectator controls.
// The classic sand main menu, weapons, maps and existing multiplayer controls are unchanged.
(()=>{'use strict';if(window.RXZ5Expansion)return;
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const css=document.createElement('style');
css.textContent='#rx5-exp-wrap{display:none;position:fixed;inset:0;z-index:2147483100;overflow:auto;background:#160e0ceb;padding:14px;color:#ffe8bf;font:14px/1.45 system-ui}#rx5-exp-wrap.open{display:block}#rx5-exp-wrap *{box-sizing:border-box}#rx5-exp-panel{max-width:760px;margin:2vh auto;padding:20px;background:#302115;border:1px solid #a57b4c;border-radius:15px;box-shadow:0 18px 55px #000a}#rx5-exp-panel h2{margin:0;color:#ffdeac;font:800 23px system-ui}#rx5-exp-panel p{color:#dbc5a4}#rx5-exp-panel button,#rx5-exp-panel input{border:1px solid #936b3e;background:#54371f;border-radius:8px;color:#fff2dc;padding:10px;margin:3px;font:inherit}#rx5-exp-panel button{cursor:pointer}#rx5-exp-panel button:hover{background:#72502d}#rx5-exp-panel input{max-width:97%;background:#23180f}#rx5-exp-panel input[type=password]{min-width:220px}#rx5-exp-panel .tabs{display:flex;gap:3px;flex-wrap:wrap;margin:15px 0}#rx5-exp-panel .section{padding:13px;border:1px solid #705234;border-radius:10px;margin-top:8px;background:#3b291a}#rx5-exp-panel .muted{font-size:12px;color:#c6ab88}#rx5-exp-status{color:#ffcf88;min-height:24px}#rx5-exp-panel canvas{display:block;width:100%;max-width:450px;background:#20180e;border:1px solid #896e4b;margin:12px 0}#rx5-exp-panel code{word-break:break-all;color:#ffe1aa}@media(max-width:550px){#rx5-exp-panel{padding:12px}#rx5-exp-panel button{padding:8px}}';
document.head.append(css);
const overlay=document.createElement('div');overlay.id='rx5-exp-wrap';
overlay.innerHTML='<section id="rx5-exp-panel" role="dialog" aria-modal="true" aria-label="RECOIL X Multiplayer"><div style="display:flex;justify-content:space-between;gap:12px"><div><h2>RECOIL X · MULTIPLAYER</h2><p class="muted">Friend Parties · Evolutions · Spectating · Account Security</p></div><button id="rx5-exp-close">Close ✕</button></div><p id="rx5-exp-status" role="status"></p><div class="tabs"><button data-tab="party">Friend Parties</button><button data-tab="evolution">Weapon Evolutions</button><button data-tab="broadcast">Broadcast</button><button data-tab="recovery">Recovery</button><button data-tab="network">Network</button></div><div id="rx5-exp-body"></div></section>';
document.body.append(overlay);
let tab='party',timer=null,broadcastCode=null;
const status=(message,bad=false)=>{const e=$('rx5-exp-status');e.textContent=message||'';e.style.color=bad?'#ffa7a7':'#ffcf88'};
const token=()=>sessionStorage.getItem('rx5-token');
async function api(path,body,auth=true,signal=undefined){
 const headers={'Content-Type':'application/json'};if(auth){if(!token())throw Error('Sign in through Career & Clans first.');headers.Authorization='Bearer '+token();}
 const response=await fetch('/rx-api/'+path,{method:body===undefined?'GET':'POST',headers,body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',signal});
 const payload=await response.json();if(!response.ok)throw Error(payload.error||'Request failed.');return payload;
}
const body=()=> $('rx5-exp-body');
function stop(){if(timer!==null){clearInterval(timer);timer=null;}}
function close(){stop();body().replaceChildren();overlay.classList.remove('open');status('');}
async function open(){overlay.classList.add('open');document.exitPointerLock?.();await show(tab);}
async function show(next){stop();tab=next;body().textContent='Loading...';status('');
 try{
 if(next==='party'){
 const d=await api('z5/party'),p=d.party,inv=d.invited;
 body().innerHTML='<div class="section"><h3>Your party</h3>'+(p?'<p>Leader: '+esc(p.leader)+' · Members: '+esc(p.members.join(', '))+'</p><button data-do="invite">Invite friend</button><input id="rx5-exp-friend" placeholder="Friend account name"><button data-do="party-queue">Assemble ranked squad</button><button data-do="leave">Leave party</button>':'<p>No party yet.</p><button data-do="create">Create party</button>')+'</div>'+(inv?'<div class="section"><h3>Party invitation</h3><p>From party leader '+esc(inv.leader)+'</p><button data-do="accept">Accept</button><button data-do="decline">Decline</button></div>':'')+'<p class="muted">Friends must accept invites. Party sizes 2, 3 or 5 can assemble an existing ranked squad; all members must ready up before matchmaking.</p>';
 }else if(next==='evolution'){
 const d=await api('z5/evolutions');
 const perks=w=>{const b=w.bonuses||{},items=[];
   if(b.reloadMultiplier<1)items.push(Math.round((1-b.reloadMultiplier)*100)+'% faster reload');
   if(b.spreadMultiplier<1)items.push(Math.round((1-b.spreadMultiplier)*100)+'% tighter spread');
   if(b.fireIntervalMultiplier<1)items.push(Math.round((1-b.fireIntervalMultiplier)*100)+'% quicker shots');
   if(b.damageMultiplier>1)items.push(Math.round((b.damageMultiplier-1)*100)+'% extra damage');
   return items.length?items.join(' · '):'Base stats';
 };
 body().innerHTML='<div class="section"><h3>Weapon Evolutions · Gameplay Mastery</h3><p>Earn bonuses from completed multiplayer matches. Perks work in casual games; ranked, tournaments, Clan Wars and specialist modes stay equal.</p>'+(d.weapons.length?d.weapons.map(w=>'<p><b>Weapon '+esc(w.weapon)+' · '+esc(w.name)+' · '+esc(w.xp)+' XP</b> '+(w.nextXp?'(next at '+esc(w.nextXp)+' XP)':'(max stage)')+'<br><span class="muted">'+esc(perks(w))+'</span></p>').join(''):'<p>No mastery XP earned yet.</p>')+'</div>';
 }else if(next==='broadcast'){
 const d=await api('z5/spectate');
 body().innerHTML='<div class="section"><h3>Broadcast spectating</h3><p class="muted">Host opt-in only · 10-second delayed tactical map · 20 viewers maximum · spectators cannot control matches.</p><button data-do="enable">Broadcast my active match</button><button data-do="disable">Stop my broadcast</button><button data-do="refresh">Refresh available broadcasts</button>'+(d.streams.length?d.streams.map(s=>'<p>'+esc(s.mode)+' · Code '+esc(s.code)+' <button data-do="join" data-code="'+esc(s.code)+'">Watch</button></p>').join(''):'<p>No public broadcasts right now.</p>')+'</div><div class="section" id="rx5-exp-live" hidden><h3>Delayed live view</h3><canvas id="rx5-exp-radar" width="440" height="280"></canvas><p id="rx5-exp-score" class="muted"></p><button data-do="unwatch">Stop watching</button></div>';
 }else if(next==='recovery'){
 body().innerHTML='<div class="section"><h3>Create your one-time recovery code</h3><p class="muted">While signed in, generate and store this code offline. It expires after 30 days and can reset your password without an email address.</p><button data-do="recovery-create">Generate code</button><p id="rx5-exp-secret"></p></div><div class="section"><h3>Recover an account</h3><input id="rx5-exp-name" autocomplete="username" placeholder="Account name"><input id="rx5-exp-code" autocomplete="off" placeholder="64-character recovery code"><input id="rx5-exp-password" type="password" autocomplete="new-password" placeholder="New password (10+ characters)"><button data-do="recovery-reset">Reset password</button></div>';
 }else if(next==='network'){
 body().innerHTML='<div class="section"><h3>Connection health</h3><p class="muted">Five lightweight server health requests measure HTTP response time and variation without reconnecting or interrupting multiplayer. Failed requests are not raw network packet loss.</p><button data-do="measure">Measure now</button><p id="rx5-exp-quality"></p></div>';
 }
 }catch(e){status(e.message,true);body().textContent=e.message;}
}
function radar(frame){
 const canvas=$('rx5-exp-radar');if(!canvas)return;
 const ctx=canvas.getContext('2d');ctx.clearRect(0,0,440,280);ctx.fillStyle='#261b10';ctx.fillRect(0,0,440,280);
 ctx.strokeStyle='#6c5432';for(let i=0;i<440;i+=44){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,280);ctx.stroke();}
 for(let i=0;i<280;i+=40){ctx.beginPath();ctx.moveTo(0,i);ctx.lineTo(440,i);ctx.stroke();}
 for(const p of frame?.players||[]){const x=220+Math.max(-32,Math.min(32,p.x))*5.5,y=140+Math.max(-28,Math.min(28,p.z))*4.5;
   ctx.beginPath();ctx.arc(x,y,Math.max(3,p.alive?5:3),0,Math.PI*2);ctx.fillStyle=p.team===1?'#e17d64':'#84c2eb';ctx.fill();}
 if($('rx5-exp-score'))$('rx5-exp-score').textContent=frame?'Score '+frame.score.join('–')+' · '+new Date(frame.at).toLocaleTimeString()+' (delayed)':'Waiting for delayed snapshots...';
}
async function poll(){if(!broadcastCode)return;try{const d=await api('z5/spectate/frame?code='+encodeURIComponent(broadcastCode));radar(d.frame);}catch(e){status(e.message,true);stop();}}
overlay.addEventListener('click',async e=>{
 const btn=e.target.closest('button');if(!btn)return;
 if(btn.id==='rx5-exp-close'){close();return;}
 if(btn.dataset.tab){await show(btn.dataset.tab);return;}
 const action=btn.dataset.do;if(!action)return;
 try{
 if(['create','leave','accept','decline'].includes(action)){await api('z5/party',{action});await show('party');status('Party updated.');}
 else if(action==='invite'){const name=$('rx5-exp-friend')?.value?.trim();if(!name)throw Error('Enter a friend name.');await api('z5/party',{action:'invite',name});status('Invitation sent.');}
 else if(action==='party-queue'){const d=await api('z5/party',{action:'queue'});status('Ranked squad created: '+d.code+'. Ready up through Multiplayer.');}
 else if(['enable','disable'].includes(action)){const d=await api('z5/spectate',{action});await show('broadcast');status(action==='enable'?'Broadcast enabled: '+d.code:'Broadcast disabled.');}
 else if(action==='refresh')await show('broadcast');
 else if(action==='join'){broadcastCode=btn.dataset.code;await api('z5/spectate',{action:'join',code:broadcastCode});$('rx5-exp-live').hidden=false;await poll();timer=setInterval(poll,1400);}
 else if(action==='unwatch'){await api('z5/spectate',{action:'leave'});broadcastCode=null;stop();await show('broadcast');}
 else if(action==='recovery-create'){const d=await api('z5/recovery/create',{});$('rx5-exp-secret').innerHTML='<code>'+esc(d.code)+'</code><br><span class="muted">Expires: '+esc(new Date(d.expires).toLocaleString())+'. Keep offline; this is shown only once.</span>';status('Recovery code generated. Copy it securely now.');}
 else if(action==='recovery-reset'){const name=$('rx5-exp-name').value,code=$('rx5-exp-code').value,password=$('rx5-exp-password').value;
   const d=await api('recovery/reset',{name,code,password},false);status(d.message||'Password updated.');$('rx5-exp-password').value='';$('rx5-exp-code').value='';}
 else if(action==='measure'){
   if(btn.disabled)return;btn.disabled=true;
   const output=$('rx5-exp-quality'),samples=[];let errors=0;
   try{
     for(let i=0;i<5;i++){
       if(!overlay.classList.contains('open')||tab!=='network')break;
       const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),3500),start=performance.now();
       try{await api('health',undefined,false,controller.signal);samples.push(Math.round(performance.now()-start));}
       catch{errors++;}finally{clearTimeout(timeout);}
       if(output)output.textContent='Sample '+(i+1)+' / 5…';
     }
     const avg=samples.length?Math.round(samples.reduce((a,b)=>a+b,0)/samples.length):null;
     const jitter=samples.length>1?Math.round(samples.slice(1).reduce((sum,n,i)=>sum+Math.abs(n-samples[i]),0)/(samples.length-1)):null;
     if(output)output.textContent='Mean HTTP RTT: '+(avg===null?'N/A':avg+' ms')+' · Variation: '+(jitter===null?'N/A':jitter+' ms')+' · HTTP failures: '+errors+' / '+(samples.length+errors)+'. Not TCP packet loss.';
   }finally{btn.disabled=false;}
 }
 }catch(error){status(error.message,true)}
});
overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&overlay.classList.contains('open'))close()});
function addEntry(){if($('rx5-exp-entry'))return;const host=$('rx5More')||$('rx5-native-main')||$('rxSimpleActions')||document.body;
 const b=document.createElement('button');b.type='button';b.id='rx5-exp-entry';b.textContent='Parties & More';b.style.cssText='min-height:40px;margin:7px;background:#674727;border:1px solid #ac8550;color:#ffdfaa;border-radius:8px;padding:9px;cursor:pointer';b.onclick=open;host.append(b);
}
addEntry();window.RXZ5Expansion={open,close};
})();
