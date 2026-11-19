const assert=require('node:assert/strict');
const {test}=require('node:test');
const {once}=require('node:events');
const {setTimeout:wait}=require('node:timers/promises');
const {makeHarness}=require('./helpers/dom-harness.cjs');

const bridge=`
globalThis.crownTest={
  pl,bots,live:z2Live,keys, unlocked,z2LocalFrames,
  match:()=>({phase,mode,mobile,alive:pl.alive,arena:crownArena}),
  show:id=>showScreen(id),signIn:async(name,password)=>{
    z1RegisterMode=true;$('z1LoginName').value=name;$('z1LoginPassword').value=password;await z1SignIn();
  },
  account:()=>z1Account,clear:()=>z1ClearAccount(),send:z2Send,ready:()=>z1SocketReady,
  quit:()=>quit(),draw:now=>draw(now),step:(dt,now)=>simulate(dt,now),
  chooseDevice:pickDevice,trial:()=>z2Daily,dual:()=>z2Dual,map:()=>x5Run,
  weapon:()=>pl.weapon,obstacles,portrait:crownCharacterPortrait,
  rally:()=>z1Rally,enterJeep:z1ToggleJeep,jeep:()=>z1Vehicle,gates:Z1_RALLY_GATES,
  builder:items=>{x5Data.builder=items;x5Play('builder');},
  importMap:file=>x5ImportMap(file),builderData:()=>x5Data.builder,
  hit:(bot,damage)=>crownDamageBot(bot,damage),kill:bot=>killBot(bot,pl),
  clip:()=>z2LastClip,server:z1ServerRoot,
};`;
const active=(game,id)=>!game.ui.getElementById(id).classList.contains('hide');
const el=(game,id)=>game.ui.getElementById(id);
const press=(game,id)=>{assert(el(game,id),id);el(game,id).click();};
const submit=(game,id)=>el(game,id).dispatchEvent({type:'submit',preventDefault(){}});
function tick(game,now,dt=.05){game.perf(now*1000);game.api.step(dt,now);}
function positions(point){return {x:point.x,z:point.z};}
function read(game,key){return JSON.parse(game.local.getItem('zone90v2_'+key)||'null');}
async function waitForClient(predicate,message){
  const deadline=performance.now()+7500;
  while(performance.now()<deadline){if(predicate())return;await wait(25);}
  assert.fail(message);
}

test('Z.2 menus, ghost, dual boss, ordered mission gates, daily course, avatar and touch editor',async()=>{
  const game=makeHarness({},'2026-11-17T12:00:00Z',null,bridge),api=game.api;
  game.api.chooseDevice(false);
  assert(active(game,'mainMenu'));
  assert.deepEqual(el(game,'z1PlayBtn').parentElement.children.map(button=>button.id),['z1PlayBtn','z2HomeAccess','z1FriendsBtn']);
  press(game,'z1PlayBtn');
  assert(active(game,'z1QuickTabPanel')&&!active(game,'z1MissionsTabPanel'));
  el(game,'z1QuickTab').dispatchEvent({type:'keydown',key:'ArrowRight',preventDefault(){},stopPropagation(){}});
  assert(active(game,'z1MissionsTabPanel')&&!active(game,'z1QuickTabPanel'));
  assert.equal(el(game,'z1MissionsTab').getAttribute('aria-selected'),'true');
  assert.equal(el(game,'z1QuickTab').getAttribute('tabindex'),'-1');
  press(game,'z1OverdriveTab');
  press(game,'z2PlayAccess');assert(active(game,'z2Menu'));
  assert(!active(game,'z2LobbyForm')&&active(game,'z2LocalAccess'));
  assert(!active(game,'z2RankSection')&&!active(game,'z2ReportSection'));
  press(game,'z2SignIn');assert(active(game,'z1FriendsMenu'));
  api.show('mainMenu');press(game,'z2HomeAccess');assert(active(game,'z2Menu'));
  press(game,'z2LocalAccess');assert(active(game,'z2Local'));
  press(game,'z2AvatarOpen');assert(active(game,'z2Avatar'));
  assert(api.portrait('fighter','sandstorm','victory').vert.length>1000);
  press(game,'z2AvatarSave');
  game.api.show('z2Local');press(game,'z2TouchOpen');assert(active(game,'z2Touch'));
  const handle=el(game,'z2TouchSurface').querySelector('[data-control="touchfire"]');
  handle.dispatchEvent({type:'keydown',code:'ArrowLeft',preventDefault(){},stopPropagation(){}});
  press(game,'z2TouchSave');
  assert(el(game,'mobileControls').classList.contains('z2-custom-touch'));
  assert(read(game,'recoil_z2_touch_layout').touchfire[0]<.87);
  press(game,'z2TouchOpen');press(game,'z2TouchReset');
  assert(!el(game,'mobileControls').classList.contains('z2-custom-touch'));
  game.api.show('z2Local');

  press(game,'z2Rally');
  assert.equal(api.match().arena.z1Rally,true);
  assert(api.enterJeep());
  for(const [n,gate] of api.gates.entries()){
    Object.assign(api.jeep(),positions(gate));tick(game,2+n*.2,.15);
  }
  assert.equal(api.match().phase,'end');
  const ghost=read(game,'recoil_z2_rally_ghost');
  assert.equal(ghost.splits.length,5);assert(ghost.frames.length>=5);
  api.quit();api.show('z2Local');press(game,'z2Rally');
  assert(api.enterJeep());tick(game,5,.2);api.draw(5);
  api.quit();api.show('z2Local');

  press(game,'z2Dual');
  const duel=api.dual();
  assert.equal(api.match().mode,'crown-dual');assert(duel.fire.alive&&duel.ice.alive);
  assert.equal(api.hit(duel.ice,80),0);
  duel.openUntil=7;game.perf(6000);
  assert.equal(api.hit(duel.ice,80),80);
  api.kill(duel.fire);api.kill(duel.ice);
  tick(game,6);assert.equal(api.match().phase,'end');assert.match(el(game,'endTitle').textContent,/Double Crown won/);
  api.quit();api.show('z2Local');

  const objects=[{gx:1,gz:2,type:'checkpoint'},{gx:1,gz:3,type:'checkpoint'},
    {gx:2,gz:5,type:'botspawn'},{gx:1,gz:4,type:'objective'}];
  await api.importMap({size:380,text:async()=>JSON.stringify({format:'RECOIL_X_X5_MAP',version:1,blocks:objects})});
  assert.equal(api.builderData().length,4);
  api.builder(objects);
  const mission=api.map();
  assert.equal(mission.z2Route.length,2);assert.equal(mission.point,null);assert.equal(api.bots.length,1);
  Object.assign(api.pl,mission.z2Exit);tick(game,7);assert.equal(api.match().phase,'playing');
  for(const [i,point] of mission.z2Route.entries()){Object.assign(api.pl,point);tick(game,8+i);}
  Object.assign(api.pl,mission.z2Exit);tick(game,10);
  assert.equal(api.match().phase,'end');
  api.quit();api.show('z2Local');

  press(game,'z2Trial');
  const trial=api.trial();
  assert.equal(trial.day,'2026-11-17');assert.equal(trial.path.length,3);assert.equal(api.weapon(),0);
  for(const [i,point] of trial.path.entries()){Object.assign(api.pl,point);tick(game,11+i,.1);}
  assert.equal(api.match().phase,'end');assert(read(game,'recoil_z2_daily_pbs')[trial.day]);
  assert(api.clip().length>1);
  press(game,'z2EndClip');assert(active(game,'z2Replay'));
  press(game,'z2ReplayReturn');assert(active(game,'endMenu'));
  assert.deepEqual(game.log,[]);
});

test('two game clients run Overdrive UI against the real local server',async()=>{
  const {createRecoilServer}=await import('../server/server.mjs');
  const server=createRecoilServer({database:':memory:'});
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const origin='http://127.0.0.1:'+server.address().port;
  const desktop=makeHarness({},undefined,{origin},bridge),touch=makeHarness({},undefined,{origin},bridge);
  const both=[desktop,touch];
  try{
    desktop.api.chooseDevice(false);touch.api.chooseDevice(true);
    await desktop.api.signIn('BrowserTestA','browser-password-123');
    await touch.api.signIn('BrowserTestB','browser-password-456');
    await waitForClient(()=>both.every(g=>g.api.ready()),'Both clients authenticated');
    for(const g of both)press(g,'z2HomeAccess');
    assert(active(desktop,'z2LobbyForm')&&active(desktop,'z2Join')&&!active(desktop,'z2Create'));
    el(desktop,'z2Code').value='ABC123';
    press(desktop,'z2RankedTab');
    assert(active(desktop,'z2Queue')&&!active(desktop,'z2Join'));
    submit(desktop,'z2Queue');
    await waitForClient(()=>active(desktop,'z2RankStop'),'Cancel button appears while queued');
    press(desktop,'z2JoinTab');
    assert.equal(el(desktop,'z2Code').value,'ABC123');
    assert(active(desktop,'z2RankStop'));
    press(desktop,'z2RankStop');
    await waitForClient(()=>!active(desktop,'z2RankStop'),'Cancel button clears the queue');
    press(desktop,'z2HostTab');
    assert(active(desktop,'z2Create')&&!active(desktop,'z2Queue'));
    submit(desktop,'z2Create');
    await waitForClient(()=>desktop.api.live.room?.code,'Private lobby exists');
    el(touch,'z2Code').value=desktop.api.live.room.code;
    submit(touch,'z2Join');
    await waitForClient(()=>desktop.api.live.room?.members.length===2,'Both clients in lobby');
    assert(!active(desktop,'z2LobbyForm')&&!active(touch,'z2LobbyForm'));
    assert.match(el(desktop,'z2Room').textContent,/BrowserTestB/);
    assert.match(el(desktop,'z2Room').querySelector('.z2-host-controls').textContent,/Remove BrowserTestB/);
    desktop.api.send('start');
    await waitForClient(()=>both.every(g=>g.api.live.match&&g.api.live.snapshot),'Both clients receive match state');
    assert(both.every(g=>g.api.match().mode==='crown-overdrive'&&g.api.match().alive));
    assert.equal(touch.api.match().mobile,true);
    assert(el(touch,'mobileControls').classList.contains('active'));
    assert.equal(desktop.api.match().arena.field.cover.length,8);
    for(const game of both){tick(game,1.35);game.api.draw(1.35);}
    assert(active(desktop,'z2MatchHud')&&active(touch,'z2MatchHud'));
    assert(!active(desktop,'z2MatchOptions')&&!active(desktop,'z2PingButtons'));
    press(desktop,'z2ShowMatchOptions');
    assert(active(desktop,'z2MatchOptions'));
    press(desktop,'z2TogglePings');
    assert(!active(desktop,'z2MatchOptions')&&active(desktop,'z2PingButtons'));
    press(desktop,'z2ShowMatchOptions');
    press(desktop,'z2LiveBoard');
    assert(active(desktop,'z2MatchBoard')&&!active(desktop,'z2MatchOptions'));
    press(desktop,'z2ShowMatchOptions');
    press(desktop,'z2LiveBoard');
    assert(!active(desktop,'z2MatchBoard'));
    press(desktop,'z2ChatOpen');
    assert(active(desktop,'z2LiveChat')&&!active(desktop,'z2MatchOptions'));
    press(desktop,'z2ChatClose');
    press(desktop,'z2ShowMatchOptions');
    press(desktop,'z2LiveLeave');
    assert(active(desktop,'z2Menu'));
    assert.equal(desktop.api.match().phase,'playing');
    press(desktop,'z2ReturnToMatch');
    assert(el(desktop,'overlay').classList.contains('hidden'));
    assert(el(desktop,'hud').classList.contains('active'));
    assert.equal(desktop.api.match().phase,'playing');
    assert(!active(desktop,'z2MatchOptions'));
    desktop.api.send('chat',{body:'Local UI match check'});
    await waitForClient(()=>el(touch,'z2LiveLog').textContent.includes('Local UI match check'),'Chat renders in the UI');
    touch.api.send('leave');
    await waitForClient(()=>active(desktop,'z2Results'),'Opponent leaving produces a results screen');
    assert.equal(desktop.api.match().phase,'end');
    assert.match(el(desktop,'z2ResultTitle').textContent,/Victory/);
    assert.match(el(desktop,'z2ResultBoard').textContent,/BrowserTestA/);
    for(const g of both)assert.deepEqual(g.log,[]);
  }finally{
    for(const game of both)game.api.clear();
    await new Promise(resolve=>server.close(resolve));
  }
});

test('desktop and touch clients launch all 15 Ascension modes from the player menus',async t=>{
  const {createRecoilServer}=await import('../server/server.mjs');
  const {ASC_MODES,COOP}=await import('../server/ascension-world.mjs');
  const hints={
    payload:/Convoy/,search:/Plant/,flags:/flag/,gunrun:/Weapon ladder/,chamber:/lives/,
    bounty:/bounty/i,hardcore:/Hardcore/,extraction:/Carry/,race:/Jump through gate/,roulette:/mirrored loadouts/,
    volcano:/safe circle/,titan:/mech shield/,fracture:/Future era/,invasion:/Alien wave/,worldboss:/mech shield/
  };
  assert.deepEqual(new Set(Object.keys(hints)),new Set(ASC_MODES));
  const maps=['train','lab','orbit','bastion'];
  // The weekend-only event requires a Friday on the server clock.
  const friday=Date.UTC(2026,10,20,12),started=performance.now();
  t.mock.method(Date,'now',()=>friday+Math.floor(performance.now()-started));
  const server=createRecoilServer({database:':memory:'});
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const origin='http://127.0.0.1:'+server.address().port;
  function clickLabel(game,root,label){
    const button=el(game,root).querySelectorAll('button').find(item=>item.textContent===label);
    assert.ok(button&&!button.disabled,'Available button: '+label);
    button.click();
  }
  function select(game,id,value){
    const field=el(game,id);
    assert.ok(field.options.some(option=>option.value===value),id+' offers '+value);
    field.value=value;field.dispatchEvent({type:'change'});
  }
  try{
    for(let first=0;first<ASC_MODES.length;first+=5){
      const make=()=>makeHarness({},new Date(friday).toISOString(),{origin},bridge);
      const host=make(),guest=make(),players=[host,guest];
      try{
        for(const [index,game] of players.entries()){
          game.api.chooseDevice(index===1);
          await game.api.signIn('AscensionQA'+(first+index),'local-only-test-password');
        }
        await waitForClient(()=>players.every(game=>game.api.ready()),'Both test accounts signed in');
        for(const game of players){
          game.api.show('mainMenu');press(game,'ascHubLink');
          assert.ok(active(game,'ascHub'));
          clickLabel(game,'ascHub','Multiplayer');
          assert.ok(active(game,'z2LobbyForm'));
        }
        for(const [offset,mode] of ASC_MODES.slice(first,first+5).entries()){
          const map=maps[(first+offset)%maps.length];
          press(host,'z2HostTab');select(host,'z2GameMode',mode);
          select(host,'ascMap',map);select(host,'z2TeamSize',COOP.includes(mode)?'2':'1');
          submit(host,'z2Create');
          await waitForClient(()=>host.api.live.room?.mode===mode,'Host created '+mode);
          press(guest,'z2JoinTab');el(guest,'z2Code').value=host.api.live.room.code;submit(guest,'z2Join');
          await waitForClient(()=>players.every(game=>game.api.live.room?.members.length===2),'Joined '+mode);
          clickLabel(host,'z2Room','Start match');
          await waitForClient(()=>players.every(game=>game.api.live.match?.mode===mode&&game.api.live.snapshot?.asc?.self),'Two synchronized views of '+mode);
          if(['worldboss','titan','invasion'].includes(mode))
            await waitForClient(()=>players.every(game=>game.api.live.snapshot.asc.enemies.some(enemy=>enemy.hp>0)),'Enemies arrived in '+mode);
          assert.equal(host.api.live.match.id,guest.api.live.match.id);
          for(const game of players){
            assert.equal(game.api.live.match.field.id,map);
            assert.equal(game.api.match().phase,'playing');
            tick(game,2);game.api.draw(2);
            assert.ok(active(game,'z2MatchHud'));assert.match(el(game,'z2MatchHint').textContent,hints[mode]);
            assert.deepEqual(game.log,[]);
          }
          assert.ok(el(guest,'mobileControls').classList.contains('active'));
          for(const game of players){
            press(game,'z2ShowMatchOptions');press(game,'z2LiveLeave');clickLabel(game,'z2Room','Leave lobby');
          }
          await waitForClient(()=>players.every(game=>!game.api.live.room&&!game.api.live.match),'Both players left '+mode);
          t.diagnostic(mode+' on '+map+': host, join, start, render and leave passed.');
        }
      }finally{for(const game of players)game.api.clear();}
    }
  }finally{await new Promise(resolve=>server.close(resolve));}
});
