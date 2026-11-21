(()=>{'use strict';
if(window.RXZ5Economy)return;
const css=document.createElement('style');css.textContent=[
'#rx5-market-screen{display:none;position:fixed;inset:0;z-index:2147483010;background:#020b18df;backdrop-filter:blur(8px);color:#e7f6ff;overflow:auto;padding:12px;font:14px/1.5 system-ui,sans-serif}',
'#rx5-market-screen.active{display:block}#rx5-market-screen *{box-sizing:border-box}',
'#rx5-market{max-width:880px;margin:2vh auto;background:linear-gradient(145deg,#102a44,#0d1424);border:1px solid #4c8098;border-radius:18px;padding:20px;box-shadow:0 18px 75px #000b}',
'#rx5-market h2{margin:0;font-size:23px;letter-spacing:.08em}#rx5-market h3{margin:0 0 8px;font-size:16px}',
'#rx5-market button{border:1px solid #4a9fb6;border-radius:8px;background:#195073;color:#eaffff;padding:8px 11px;margin:3px;cursor:pointer;font-weight:650}',
'#rx5-market button:focus-visible{outline:3px solid #79efea}#rx5-market button:disabled{opacity:.5;cursor:not-allowed}',
'#rx5-market input,#rx5-market select{background:#091c2d;color:#fff;border:1px solid #46748d;border-radius:8px;padding:9px;min-width:80px;max-width:100%}',
'#rx5-market label{display:inline-flex;flex-flow:column nowrap;gap:3px;font-size:12px;font-weight:700}',
'#rx5-market .card{background:#15324a;border:1px solid #3d6681;padding:15px;border-radius:13px;margin:12px 0}',
'#rx5-market .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px}',
'#rx5-market .row{display:flex;align-items:center;gap:9px;flex-wrap:wrap}#rx5-market .muted{color:#b6cedc;font-size:12px}',
'#rx5-market .line{border-bottom:1px solid #35556c;padding:8px 0}#rx5-market .status{color:#73e6d4;min-height:23px}#rx5-market .error{color:#ff9b9b}',
'@media(max-width:600px){#rx5-market{padding:12px;margin:0}#rx5-market h2{font-size:17px}#rx5-market .row{gap:4px}}',
'@media(prefers-reduced-motion:reduce){#rx5-market *{animation:none!important;transition:none!important}}'
].join('');document.head.append(css);
const overlay=document.createElement('div');overlay.id='rx5-market-screen';
overlay.innerHTML='<div id="rx5-market" role="dialog" aria-modal="true" aria-label="Z.5 cosmetic economy"><div class="row" style="justify-content:space-between"><h2>RECOIL X / FORGE & MARKET</h2><button type="button" id="rx5-market-close">Close ✕</button></div><p class="status" id="rx5-market-notice" role="status"></p><div id="rx5-market-data">Loading...</div></div>';
document.body.append(overlay);const dataNode=()=>document.getElementById('rx5-market-data'),notice=()=>document.getElementById('rx5-market-notice');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const message=(t,err=false)=>{notice().textContent=t;notice().classList.toggle('error',err)};
const tag=(name,caption)=>'<label>'+esc(caption)+'<input name="'+esc(name)+'" required></label>';
const names=o=>Object.entries(o.catalog).map(([id,item])=>'<option value="'+esc(id)+'">'+esc(item.name)+'</option>').join('');
const label=(o,id)=>o.catalog[id]?.name||id;
async function api(path,body) {
 const token=sessionStorage.getItem('rx5-token');
 if(!token)throw Error('Sign in through the Career & Clans menu first.');
 const r=await fetch('/rx-api/z5/'+path,{method:body===undefined?'GET':'POST',
  headers:{Authorization:'Bearer '+token,...(body===undefined?{}:{'Content-Type':'application/json'})},
  ...(body===undefined?{}:{body:JSON.stringify(body)})});
 const d=await r.json();if(!r.ok)throw Error(d.error||'Request failed.');return d;
}
async function refresh(){
 const [d,c]=await Promise.all([api('economy'),api('challenges')]);
 const owned=d.inventory.filter(x=>x.quantity>0);
 const choices=names(d),invChoices=owned.map(x=>'<option value="'+esc(x.item)+'">'+esc(label(d,x.item))+' ('+esc(x.quantity)+')</option>').join('');
 const equip=d.equipment.map(x=>esc(x.slot)+': '+esc(label(d,x.item))).join(' · ')||'No Z.5 cosmetics equipped yet';
 let html='<p class="muted">'+esc(d.note)+' Crafted cosmetics are saved in Z.5, but not yet applied to the existing 3D weapon meshes.</p>';
 html+='<section class="grid"><div class="card"><h3>Wallet</h3><strong>'+esc(d.points)+' Z.5 points</strong><p class="muted">Earn points in valid matches and by daily check-in.</p></div><div class="card"><h3>Match stats</h3><p>'+esc(d.stats.matches)+' matches / '+esc(d.stats.wins)+' wins</p><p>'+esc(d.stats.kills)+' eliminations / '+esc(d.stats.deaths)+' deaths</p></div></section>';
 html+='<section class="card"><h3>My inventory</h3>'+(!owned.length?'<p>No items. Claim daily supplies in the Z.5 Lab.</p>':owned.map(x=>'<div class="line row"><strong>'+esc(label(d,x.item))+' ×'+esc(x.quantity)+'</strong>'+(d.catalog[x.item]?.kind!=='material'?'<button type="button" data-action="equip" data-item="'+esc(x.item)+'">Equip</button>':'')+'</div>').join(''))+'<p class="muted">'+equip+'</p></section>';
 html+='<section class="card"><h3>Cosmetic crafting</h3><div class="grid">'+Object.entries(d.recipes).map(([key,recipe])=>'<div><strong>'+esc(label(d,key))+'</strong><p class="muted">'+esc(recipe.scrap)+' Kingdom Scrap + '+esc(recipe.points)+' points</p><button type="button" data-action="craft" data-item="'+esc(key)+'">Craft</button></div>').join('')+'</div></section>';
 html+='<section class="card"><h3>Auction house</h3><p class="muted">Z.5-only market. Listings escrow items and automatically expire after 24 hours.</p>';
 html+='<form class="row" data-form="list"><label>Item<select name="item" required>'+invChoices+'</select></label><label>Quantity<input name="quantity" type="number" min="1" max="100" value="1" required></label><label>Price in Z.5 points<input name="price" type="number" min="1" max="100000" value="30" required></label><button '+(!owned.length?'disabled':'')+'>List item</button></form>';
 html+='<h3 style="margin-top:16px">Open listings</h3>'+(!d.listings.length?'<p>No active listings.</p>':d.listings.map(x=>'<div class="line row"><span>'+esc(label(d,x.item))+' ×'+esc(x.quantity)+' by '+esc(x.seller)+' — '+esc(x.price)+' points</span><button type="button" data-action="buy" data-id="'+esc(x.id)+'">Buy</button></div>').join(''));
 html+='<h3 style="margin-top:16px">My listings</h3>'+(!d.myListings.length?'<p>None yet.</p>':d.myListings.map(x=>'<div class="line row"><span>#'+esc(x.id)+' '+esc(label(d,x.item))+' ×'+esc(x.quantity)+' — '+esc(x.status)+'</span>'+(x.status==='open'?'<button type="button" data-action="cancel" data-id="'+esc(x.id)+'">Cancel</button>':'')+'</div>').join(''))+'</section>';
 html+='<section class="card"><h3>Direct trading</h3><p class="muted">Trade offers escrow your offered item. Only the invited player can accept.</p>';
 html+='<form class="row" data-form="offer">'+tag('name','Recipient account')+'<label>Give<select name="give">'+invChoices+'</select></label><label>Quantity<input type="number" name="giveQty" min="1" max="100" value="1" required></label><label>Want<select name="want">'+choices+'</select></label><label>Quantity<input type="number" name="wantQty" min="1" max="100" value="1" required></label><button '+(!owned.length?'disabled':'')+'>Offer</button></form>';
 html+='<h3 style="margin-top:16px">Trade history</h3>'+(!d.trades.length?'<p>No offers.</p>':d.trades.map(x=>'<div class="line row"><span>#'+esc(x.id)+' '+esc(x.sender)+' → '+esc(x.recipient)+': '+esc(label(d,x.give_item))+' ×'+esc(x.give_qty)+' for '+esc(label(d,x.want_item))+' ×'+esc(x.want_qty)+' — '+esc(x.status)+'</span>'+(x.status==='open'?(x.recipient_id===d.userId?'<button type="button" data-action="accept" data-id="'+esc(x.id)+'">Accept</button>':'')+'<button type="button" data-action="decline" data-id="'+esc(x.id)+'">'+(x.recipient_id===d.userId?'Decline':'Cancel')+'</button>':'')+'</div>').join(''))+'</section>';
 html+='<section class="card"><h3>Rivalries</h3>'+(d.rivals.length?d.rivals.map(x=>'<div class="line">'+esc(x.opponent)+' · '+esc(x.wins)+' wins / '+esc(x.losses)+' losses</div>').join(''):'<p>Finish multiplayer matches to build a rivalry history.</p>')+'</section>';
 html+='<section class="card"><h3>Daily Challenges · '+esc(c.day)+'</h3><p class="muted">Progress is recorded by the game server.</p>'+c.daily.map(x=>'<div class="line row"><span><b>'+esc(x.name)+'</b> '+esc(x.description)+' — '+esc(Math.min(x.progress,x.target))+'/'+esc(x.target)+' (+'+esc(x.reward)+' points)</span>'+(x.claimed?'<span>Claimed ✓</span>':'<button type="button" data-action="daily-claim" data-kind="'+esc(x.kind)+'" '+(x.progress<x.target?'disabled':'')+'>Claim</button>')+'</div>').join('')+'</section>';
 html+='<section class="card"><h3>Seasonal Story Missions</h3>'+c.story.map(x=>'<div class="line row"><span>Chapter '+esc(x.chapter)+': <b>'+esc(x.name)+'</b> — '+esc(x.description)+' · '+esc(Math.min(x.progress,x.target))+'/'+esc(x.target)+'</span>'+(x.claimed?'<span>Completed ✓</span>':'<button type="button" data-action="story-claim" data-chapter="'+esc(x.chapter)+'" '+(x.progress<x.target?'disabled':'')+'>Claim +'+esc(x.reward)+'</button>')+'</div>').join('')+'</section>';
 html+='<section class="card"><h3>Z.5 Prestige · Level '+esc(c.prestige)+'</h3><p class="muted">Cosmetic-only prestige: every level requires another ten valid matches and 200 Z.5 points. Existing Mission Mode levels are never reset.</p><button type="button" data-action="prestige" '+(!c.canPrestige?'disabled':'')+'>Prestige (200 points)</button></section>';
 dataNode().innerHTML=html;
}
async function open(){overlay.classList.add('active');document.exitPointerLock?.();message('');try{await refresh()}catch(e){dataNode().textContent=e.message;message(e.message,true)}}
function close(){overlay.classList.remove('active');message('')}
overlay.querySelector('#rx5-market-close').onclick=close;
overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
overlay.addEventListener('pointerdown',e=>e.stopPropagation());
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&overlay.classList.contains('active'))close()});
dataNode().addEventListener('submit',async e=>{
 const form=e.target.closest('form[data-form]');if(!form)return;e.preventDefault();
 const data=Object.fromEntries(new FormData(form));const type=form.dataset.form;
 for(const key of ['quantity','price','giveQty','wantQty'])if(key in data)data[key]=Number(data[key]);
 try{await api(type==='list'?'auction/list':'trade/offer',data);await refresh();message(type==='list'?'Auction listed.':'Trade offered.')}
 catch(error){message(error.message,true)}
});
dataNode().addEventListener('click',async e=>{
 const b=e.target.closest('button[data-action]');if(!b)return;
 const action=b.dataset.action,item=b.dataset.item,id=Number(b.dataset.id);
 const endpoints={craft:'craft',equip:'equip',buy:'auction/buy',cancel:'auction/cancel',accept:'trade/accept',decline:'trade/decline','daily-claim':'challenges/claim','story-claim':'story/claim',prestige:'prestige'};
 if(!endpoints[action])return;
 if(['buy','cancel','accept','decline'].includes(action)&&!confirm('Confirm this '+action+' action?'))return;
 b.disabled=true;
 try{const payload=['craft','equip'].includes(action)?{item}:action==='daily-claim'?{kind:b.dataset.kind}:action==='story-claim'?{chapter:Number(b.dataset.chapter)}:action==='prestige'?{}:{id};await api(endpoints[action],payload);await refresh();message(action+' completed.')}
 catch(error){message(error.message,true);b.disabled=false}
});
window.RXZ5Economy={open};
})();