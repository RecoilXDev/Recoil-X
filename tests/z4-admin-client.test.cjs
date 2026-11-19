const {test}=require('node:test');
const assert=require('node:assert/strict');
const {once}=require('node:events');
const {mkdtempSync,rmSync}=require('node:fs');
const {tmpdir}=require('node:os');
const {join}=require('node:path');
const {DatabaseSync}=require('node:sqlite');
const {Script}=require('node:vm');
const {setTimeout:delay}=require('node:timers/promises');
const {makeHarness}=require('./helpers/dom-harness.cjs');

const bridge=`
globalThis.crownTest={
  choose:pickDevice,pad:ascPadMenus,ready:()=>z1SocketReady,clear:z1ClearAccount,logout:z1SignOut,refreshFriends:z1RefreshFriends,account:()=>z1Account,
  login:async(name,password)=>{
    z1RegisterMode=false;$('z1LoginName').value=name;$('z1LoginPassword').value=password;await z1SignIn();
  }
};
`;

async function waitFor(check,label){
  const end=Date.now()+9000;
  while(Date.now()<end){const value=check();if(value)return value;await delay(25);}
  assert.fail(label);
}

function namedButton(root,label){return root.querySelectorAll('button').find(b=>b.textContent===label);}
function input(root,label){return root.querySelectorAll('input,select,textarea').find(e=>e.getAttribute('aria-label')===label);}
function press(root,label){const b=namedButton(root,label);assert.ok(b,label);b.click();}
function submit(root,label){
  const b=namedButton(root,label);assert.ok(b,label);
  b.closest('form').dispatchEvent({type:'submit',preventDefault(){}});
}

// Supply native DOM effects missing from the harness. Serve the actual candidate assets and
// capture the browser's audit download. All account, WebSocket and staff requests hit the server.
function attachBrowserEffects(game,origin){
  game.ctx.HTMLElement.prototype.focus=function(){game.ui.activeElement=this;};
  game.ctx.HTMLElement.prototype.getClientRects=function(){
    for(let e=this;e;e=e.parentElement)if(e.hidden||e.classList.contains('hide'))return [];
    return [{width:80,height:45}];
  };
  const loads=[],downloads=[],head=game.ui.head,append=head.append.bind(head);
  let failNextStyle=true;
  head.append=(...nodes)=>{
    append(...nodes);
    for(const n of nodes){
      const asset=n.src||n.href;
      if(!['./server/admin-panel.js','./server/admin-panel.css'].includes(asset))continue;
      loads.push(asset);
      if(n.tagName==='LINK'&&failNextStyle){failNextStyle=false;queueMicrotask(()=>n.onerror());continue;}
      fetch(new URL(asset,origin)).then(async response=>{
        assert.equal(response.status,200);
        const contents=await response.text();
        if(n.tagName==='SCRIPT')new Script(contents,{filename:asset}).runInContext(game.ctx);
        else assert.match(contents,/#rx4-console/);
        n.onload();
      }).catch(()=>n.onerror());
    }
  };
  const create=game.ui.createElement;
  game.ui.createElement=tag=>{
    const node=create(tag);
    if(tag==='a')node.click=()=>{
      const url=node.href;
      downloads.push({name:node.download,rows:fetch(url).then(r=>r.json()).finally(()=>URL.revokeObjectURL(url))});
    };
    return node;
  };
  return {loads,downloads};
}

test('Z.4 signed-in home launcher, reports, warnings, grants, audit export and sign-out use the real server',async()=>{
  const {createRecoilServer}=await import('../server/server.mjs');
  const dir=mkdtempSync(join(tmpdir(),'rx4-console-ui-')),database=join(dir,'test.sqlite');
  const server=createRecoilServer({database,backups:{directory:join(dir,'private')}});
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const origin='http://127.0.0.1:'+server.address().port,db=new DatabaseSync(database);
  const staff=makeHarness({},undefined,{origin},bridge),player=makeHarness({},undefined,{origin},bridge);
  const staffEffects=attachBrowserEffects(staff,origin),playerEffects=attachBrowserEffects(player,origin);
  const byId=id=>staff.ui.getElementById(id),launcher=byId('rx-admin-launch'),playerLauncher=player.ui.getElementById('rx-admin-launch');
  const notices=player.ui.getElementById('z4AccountNotices'),password='disposable-browser-test';
  try{
    for(const name of ['RangeStaff','RangePilot','RangeJudge']){
      const response=await fetch(origin+'/rx-api/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,password})});
      assert.equal(response.status,200);
      const {user,token}=await response.json();
      if(name==='RangeStaff')db.prepare('UPDATE users SET admin=1 WHERE id=?').run(user.id);
      if(name==='RangeJudge'){
        const report=await fetch(origin+'/rx-api/z2/report',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({name:'RangePilot',reason:'Look at the chat round'})});
        assert.equal(report.status,200);
      }
    }
    staff.api.choose(false);player.api.choose(true);
    assert(launcher.classList.contains('hide'));launcher.click();assert.equal(staffEffects.loads.length,0);
    await player.api.login('RangePilot',password);await staff.api.login('RangeStaff',password);
    await waitFor(()=>staff.api.ready()&&player.api.ready(),'both sockets ready');
    assert(playerLauncher.classList.contains('hide'));playerLauncher.click();assert.equal(playerEffects.loads.length,0);
    assert(!launcher.classList.contains('hide'));launcher.click();
    await waitFor(()=>!byId('z2Admin').classList.contains('hide'),'legacy moderation opens if the theme fails');
    byId('z2AdminAccess').click();
    const root=await waitFor(()=>byId('rx4-console')?.hasAttribute('open')&&byId('rx4-console'),'styled console opens on retry');
    await waitFor(()=>namedButton(root,'Review'),'overview loads the existing report');
    assert.equal(staffEffects.loads.filter(p=>p.endsWith('.js')).length,1);
    assert.equal(staffEffects.loads.filter(p=>p.endsWith('.css')).length,2);
    assert.deepEqual(root.querySelectorAll('nav button').map(b=>b.dataset.page),['overview','players','reports','wallet','audit','server']);
    let activePadButton=-1;
    staff.ctx.navigator.getGamepads=()=>[{connected:true,axes:[0,0],buttons:Array.from({length:16},(_,i)=>({pressed:i===activePadButton}))}];
    const pulse=key=>{activePadButton=key;staff.api.pad(0);activePadButton=-1;staff.api.pad(1);};
    root.querySelector('nav button').focus();pulse(13);assert.equal(staff.ui.activeElement.dataset.page,'players');pulse(0);
    assert.equal(root.querySelector('h1').textContent,'Players');pulse(12);pulse(0);
    await waitFor(()=>namedButton(root,'Review'),'controller returned to overview');
    press(root,'Review');await waitFor(()=>namedButton(root,'Claim case'),'case details');
    press(root,'Claim case');press(root,'Confirm');await waitFor(()=>namedButton(root,'Release case'),'claim persisted');
    press(root,'Mark urgent');press(root,'Confirm');await waitFor(()=>namedButton(root,'Set normal priority'),'priority persisted');
    press(root,'Inspect player');await waitFor(()=>input(root,'Player action'),'player profile');
    for(const [kind,reason] of [['staff-note','Visible only to staff'],['warn','Please keep chat friendly']]){
      const action=input(root,'Player action');action.value=kind;action.onchange();
      input(root,'Reason or staff note').value=reason;submit(root,'Review action');press(root,'Confirm');
      await waitFor(()=>input(root,'Player action')&&input(root,'Player action')!==action&&root.textContent.includes('saved.'),'staff decision saved');
    }
    await waitFor(()=>notices.textContent.includes('Please keep chat friendly'),'player received their private warning');
    assert(!notices.textContent.includes('Visible only to staff'));press(notices,'Acknowledge warnings');
    await waitFor(()=>!notices.textContent.includes('Please keep chat friendly'),'player acknowledged warning');
    press(root,'Open wallet');input(root,'Coins').value='75';input(root,'Grant reason').value='League fixture prize';
    submit(root,'Review grant');pulse(1);assert.equal(root.querySelector('.rx-confirm').hidden,true);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM rx_admin_grants').get().n,0);
    submit(root,'Review grant');press(root,'Confirm');
    await waitFor(()=>namedButton(root,'Reverse grant'),'grant receipt loaded');
    await waitFor(()=>notices.textContent.includes('75 coins'),'recipient sees server balance');
    press(root,'Reverse grant');input(root,'Reason for reversing grant #1').value='Fixture correction';
    submit(root,'Review reversal');press(root,'Confirm');
    await waitFor(()=>root.textContent.includes('Reversed by RangeStaff'),'ledger reversal shown');
    root.querySelectorAll('nav button').find(b=>b.dataset.page==='audit').click();
    input(root,'Player name').value='rangepilot';input(root,'Action group').value='wallet';submit(root,'Apply audit filters');
    await waitFor(()=>namedButton(root,'Export these entries'),'filtered wallet actions');
    press(root,'Export these entries');
    assert.equal(staffEffects.downloads[0].name,'RECOIL-X-Z4-staff-audit.json');
    const rows=await staffEffects.downloads[0].rows;
    assert.deepEqual(rows.map(r=>r.kind).sort(),['coins-grant','coins-reverse']);
    assert(rows.every(r=>r.target==='RangePilot'&&r.actor==='RangeStaff'));
    root.querySelectorAll('nav button').find(b=>b.dataset.page==='server').click();
    await waitFor(()=>namedButton(root,'Request a private backup'),'server health and backup form');
    // Hold one request sent under the old staff session until the account switch finishes.
    const realFetch=staff.ctx.fetch;let release,held=false,oldStatus;
    staff.ctx.fetch=(url,options)=>{
      if(!held&&String(url).endsWith('/friends')){
        held=true;return new Promise(resolve=>{release=async()=>{const r=await realFetch(url,options);oldStatus=r.status;resolve(r);};});
      }
      return realFetch(url,options);
    };
    const oldRequest=staff.api.refreshFriends();assert(held);
    await staff.api.logout();assert(!root.hasAttribute('open'));assert(launcher.classList.contains('hide'));
    assert(!root.textContent.includes('RangeStaff'));assert(!root.textContent.includes('RangePilot'));
    await staff.api.login('RangeJudge',password);await release();await oldRequest;
    assert.equal(oldStatus,401);assert.equal(staff.api.account()?.name,'RangeJudge');
    assert(launcher.classList.contains('hide'));
    assert.deepEqual(staff.log,[]);assert.deepEqual(player.log,[]);
  }finally{
    staff.api.clear();player.api.clear();
    await new Promise(resolve=>server.close(resolve));db.close();rmSync(dir,{recursive:true,force:true});
  }
});
