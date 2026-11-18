const assert=require('node:assert/strict');
const {test}=require('node:test');
const {once}=require('node:events');
const {setTimeout:wait}=require('node:timers/promises');
const {makeHarness}=require('./helpers/dom-harness.cjs');

const bridge=`
globalThis.crownTest={
  pl,bots,keys,obstacles,live:z2Live,account:()=>z1Account,
  chooseDevice:pickDevice,show:showScreen,quit:()=>quit(),run:()=>z3Run,
  phase:()=>phase,mode:()=>mode,hurt:damage=>hurt(damage),
  step:(dt,now)=>simulate(dt,now),draw:now=>draw(now),kill:b=>killBot(b,pl),
  tickParkour:(dt,now)=>z3TickLocal(dt,now),
  jumpPressed,forward:value=>{moveJoy.y=-value;},vetoTimer:z3RefreshVetoTimer,
  mission:()=>x5Run,receive:z2Packet,ready:()=>z1SocketReady,clear:()=>z1ClearAccount(),
  restore:z1RestoreSession,
  builder:blocks=>{x5Data.builder=blocks;x5Play('builder');},
  loadBuilder:blocks=>{x5Data.builder=blocks;},
  builderData:()=>x5Data.builder,
  signIn:async(name)=>{
    z1RegisterMode=true;$('z1LoginName').value=name;$('z1LoginPassword').value='integration-password';await z1SignIn();
  },
};`;
const el=(game,id)=>game.ui.getElementById(id);
const active=(game,id)=>!el(game,id).classList.contains('hide');
const read=(game,key)=>JSON.parse(game.local.getItem('zone90v2_'+key)||'null');

function press(game,id){
  const node=el(game,id);
  assert(node,id);node.click();
}

function playLocal(game,label){
  game.api.show('z2Local');
  const button=el(game,'z2Local').querySelectorAll('button').find(node=>node.textContent===label);
  assert(button,label);button.click();
}

function tick(game,now,dt=.05){
  game.perf(now*1000);game.api.step(dt,now);
}

test('opening offline keeps a saved account session until the server rejects it',async()=>{
  const game=makeHarness({},undefined,null,bridge);
  const root='http://127.0.0.1:8787',key='recoil-z1-session';
  Object.assign(game.ctx.location,{hostname:'127.0.0.1',origin:root});
  const session=JSON.stringify({root,token:'test-session'});
  game.ctx.sessionStorage.setItem(key,session);
  await game.api.restore();
  assert.equal(game.ctx.sessionStorage.getItem(key),session);
  game.ctx.fetch=async()=>new Response(JSON.stringify({error:'Session expired'}),{status:401});
  await game.api.restore();
  assert.equal(game.ctx.sessionStorage.getItem(key),null);
});

test('queue warm-up respawns targets and returns to the lobby when the queue ends',()=>{
  const game=makeHarness({},undefined,null,bridge),{api}=game;
  api.chooseDevice(false);api.show('z2Menu');api.receive({type:'z2:queue',waiting:true,size:1});
  assert(active(game,'z3QueueWarm'));press(game,'z3QueueWarm');
  assert.equal(api.run().kind,'warmup');
  assert(el(game,'rxStage').classList.contains('z3-practice'));
  const target=api.bots[0];
  assert(target.z3Still);
  api.kill(target);
  assert(!target.alive);
  tick(game,2);
  assert(target.alive);
  assert.equal(api.pl.kills,1);
  press(game,'z3WarmExit');
  assert(!el(game,'rxStage').classList.contains('z3-practice'));
  assert(active(game,'z2Menu'));assert(api.live.queue);
  press(game,'z3QueueWarm');api.receive({type:'z2:queue',waiting:false});
  assert(active(game,'z2Menu'));assert(!api.run());assert(!api.live.queue);
  assert.deepEqual(game.log,[]);
});

test('Clutch Lab finishes on a clear or death and Parkour tracks a medal and personal best',()=>{
  const game=makeHarness({},undefined,null,bridge),{api}=game;
  api.chooseDevice(false);playLocal(game,'Objective Retake');
  assert(el(game,'rxStage').classList.contains('z3-practice'));
  assert.equal(api.bots.length,2);
  for(const bot of api.bots)api.kill(bot);
  tick(game,2);
  assert.equal(api.phase(),'playing');
  Object.assign(api.pl,api.run().trial.goal);tick(game,2.1);
  assert.equal(api.phase(),'end');
  assert.match(el(game,'endTitle').textContent,/Drill cleared/);
  assert(!el(game,'rxStage').classList.contains('z3-practice'));
  press(game,'z2EndAction');
  assert.equal(api.bots.length,2);
  api.pl.spawnProtectedUntil=0;api.hurt(200);
  assert.match(el(game,'endTitle').textContent,/Try again/);
  api.quit();

  playLocal(game,'Depot Steps');
  const run=api.run();
  for(const gate of run.course.gates){
    Object.assign(api.pl,{x:gate.x,z:gate.z+(gate.kind==='climb'?1:0),jump:.6});
    api.keys.Space=true;api.keys.KeyW=true;
    const attempts=gate.kind==='wall'?5:1;
    for(let i=0;i<attempts;i++)api.tickParkour(.1,3+run.time);
  }
  assert.equal(api.phase(),'end');
  assert.match(el(game,'endTitle').textContent,/Gold.*Best/);
  assert(read(game,'recoil_z3_parkour').depot>0);
  assert.match(el(game,'z3ParkourRecord-depot').textContent,/Best .* Gold/);
  assert.deepEqual(game.log,[]);
});

test('touch Jump handles taps, holds through a wall-run and clears on cancellation',()=>{
  const game=makeHarness({},undefined,null,bridge),{api}=game;
  api.chooseDevice(true);playLocal(game,'Depot Steps');
  assert(el(game,'rxStage').classList.contains('z3-practice'));
  const run=api.run(),button=el(game,'touchjump');
  const touch=(type,pointerId)=>button.dispatchEvent({type,pointerId,button:0,preventDefault(){}});
  game.perf(1000);
  touch('pointerdown',7);touch('pointerup',7);
  assert(api.jumpPressed());
  game.perf(1200);assert(!api.jumpPressed());

  for(const gate of run.course.gates.slice(0,2)){
    Object.assign(api.pl,{x:gate.x,z:gate.z+(gate.kind==='climb'?1:0),jump:.6});
    api.tickParkour(.1,1.3);
  }
  assert.equal(run.gate,2);
  Object.assign(api.pl,run.course.gates[2]);
  api.forward(1);touch('pointerdown',8);
  for(let i=0;i<5;i++){
    game.perf(1300+i*100);
    assert(api.jumpPressed());
    api.tickParkour(.1,1.3+i*.1);
  }
  assert.equal(run.gate,3);
  touch('pointerup',8);assert(!api.jumpPressed());
  touch('pointerdown',9);touch('pointercancel',9);assert(!api.jumpPressed());
  touch('pointerdown',10);touch('lostpointercapture',10);assert(!api.jumpPressed());
  assert.deepEqual(game.log,[]);
});

test('builder checkpoints open doors and delay the exit until a triggered wave is cleared',()=>{
  const game=makeHarness({},undefined,null,bridge),{api}=game;
  api.chooseDevice(true);
  api.builder([
    {gx:6,gz:8,type:'checkpoint'},{gx:6,gz:5,type:'checkpoint'},
    {gx:5,gz:8,type:'doortrigger',step:1},{gx:8,gz:4,type:'wavetrigger',step:2},
    {gx:6,gz:2,type:'objective'}
  ]);
  const run=api.mission(),door=run.z3Triggers[0].object;
  assert(api.obstacles.includes(door));
  assert.equal(run.point,null);
  Object.assign(api.pl,run.z2Route[0]);tick(game,2);
  assert(!api.obstacles.includes(door));assert.equal(run.z2Next,1);
  Object.assign(api.pl,run.z2Route[1]);tick(game,2.1);
  assert.equal(run.z3Wave.length,2);assert.equal(run.point,null);
  for(const bot of run.z3Wave)api.kill(bot);
  tick(game,2.2);assert.equal(run.point,run.z2Exit);
  Object.assign(api.pl,run.z2Exit);tick(game,2.3);
  assert.equal(api.phase(),'end');
  const preset=el(game,'z3AccessPreset'),symbols=el(game,'z3TeamSymbols');
  preset.value='both';preset.dispatchEvent({type:'change'});
  assert(el(game,'rxStage').classList.contains('z3-reduced-flashes'));
  assert(el(game,'rxStage').classList.contains('z3-contrast'));
  assert(symbols.checked);
  symbols.checked=false;symbols.dispatchEvent({type:'change'});
  assert.equal(preset.value,'custom');
  assert(read(game,'recoil_z3_access').contrast);
  assert.deepEqual(game.log,[]);
});

test('game clients share maps, join a ranked veto from warm-up and open a linked report',async()=>{
  const {createRecoilServer}=await import('../server/server.mjs');
  const server=createRecoilServer({database:':memory:'});
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const origin='http://127.0.0.1:'+server.address().port;
  const first=makeHarness({},undefined,{origin},bridge),second=makeHarness({},undefined,{origin},bridge);
  const both=[first,second];
  const next=async(predicate,message)=>{
    const until=performance.now()+4000;
    while(performance.now()<until){if(predicate())return;await wait(25);}
    assert.fail(message);
  };
  const submitQueue=game=>{
    press(game,'z2RankedTab');
    el(game,'z2Queue').dispatchEvent({type:'submit',preventDefault(){}});
  };
  try{
    first.api.chooseDevice(false);second.api.chooseDevice(true);
    await first.api.signIn('MapBuilder');await second.api.signIn('MapFinder');
    await next(()=>both.every(g=>g.api.ready()),'Both game clients connected');
    first.api.loadBuilder([{gx:6,gz:8,type:'checkpoint'},{gx:5,gz:8,type:'routetrigger',step:1}]);
    el(first,'z3MapTitle').value='Rift Gate';
    await el(first,'z3ShareMap').onclick();
    const code=el(first,'z3MapCode').value;
    assert.match(code,/^[A-Z2-9]{7}$/);
    el(second,'z3MapCode').value=code;
    await el(second,'z3LoadMap').onclick();
    assert.equal(el(second,'z3MapTitle').value,'Rift Gate');
    assert.equal(second.api.builderData()[1].step,1);

    for(const game of both)press(game,'z2HomeAccess');
    submitQueue(first);
    await next(()=>first.api.live.queue,'First player is queued');
    press(first,'z3QueueWarm');assert.equal(first.api.run().kind,'warmup');
    submitQueue(second);
    await next(()=>both.every(g=>g.api.live.room?.veto),'Ranked veto arrived');
    assert(active(first,'z2Menu'));assert(!first.api.run());
    assert.match(el(first,'z3VetoClock').textContent,/^18 s/);
    first.perf(2250);first.api.vetoTimer();
    assert.match(el(first,'z3VetoClock').textContent,/^17 s/);
    for(let i=0;i<2;i++){
      const veto=first.api.live.room.veto;
      const captain=both.find(g=>g.api.account().id===veto.captains[veto.turn]);
      const options=el(captain,'z2Room').querySelectorAll('button').filter(b=>b.textContent.startsWith('Ban '));
      assert(options.length>0);options[0].click();
      await next(()=>i===0?first.api.live.room.veto?.turn===1:both.every(g=>g.api.live.snapshot),
        'Veto advanced to the next step');
    }
    assert.equal(first.api.mode(),'crown-overdrive');
    assert.equal(second.api.mode(),'crown-overdrive');
    for(const game of both){tick(game,2.35);game.api.draw(2.35);}
    press(second,'z2ShowMatchOptions');press(second,'z2LiveLeave');
    const button=el(second,'z2Room').querySelectorAll('button').find(b=>b.textContent==='Leave lobby');
    assert(button);button.click();
    await next(()=>active(first,'z2Results'),'Result reached the remaining player');
    assert(el(first,'z3ResultTimeline').children.length>=2);
    const matchId=first.api.live.result.id;
    press(first,'z3ReportMoment');
    assert.equal(el(first,'z3ReportMatch').value,matchId);
    assert(el(first,'z2ReportSection').open);
    for(const game of both)assert.deepEqual(game.log,[]);
  }finally{
    for(const game of both)game.api.clear();
    await new Promise(resolve=>server.close(resolve));
  }
});
