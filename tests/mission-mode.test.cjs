const assert = require('node:assert/strict');
const {test} = require('node:test');
const {makeHarness} = require('./helpers/dom-harness.cjs');

const bridge = `
globalThis.crownTest = {
  pl, bots, choose:pickDevice, quit:()=>quit(), run:()=>missionRun, report:()=>missionReport,
  state:()=>({phase,mode,mobile,remaining:gameSeconds}), record:missionRecord, total:missionTotal,
  stamps:missionStamps, kind:missionKind, code:missionCode, hazard:missionHazard, use:missionUse,
  tick:z2LocalTick, step:(dt,now)=>simulate(dt,now), kill:b=>killBot(b,pl), hurt:n=>hurt(n),
  draw:now=>{const vertices=[];z2DrawLocalExtras(vertices,now);return vertices;}, blocked,
  timeout:()=>{gameSeconds=.01;}, setPaused:value=>{paused=value;},
  lang:value=>{language=value;syncLang();}, text:missionText
};`;

function gameAt(save={}, mobile=false, date='2026-11-18T12:00:00Z') {
  const game=makeHarness(save,date,null,bridge);
  game.second=10;
  game.perf(game.second*1000);
  game.api.choose(mobile);
  game.api.lang('en');
  click(game,'z1PlayBtn');
  click(game,'missionAccess');
  return game;
}
const el=(g,id)=>g.ui.getElementById(id);
const click=(g,id)=>{const control=el(g,id);assert.ok(control,id);control.click();};
const select=(g,id,value)=>{const node=el(g,id);node.value=value;node.dispatchEvent({type:'change'});};
const shown=(g,id)=>!el(g,id).classList.contains('hide');
const snapshot=g=>Object.fromEntries(g.local.entries);
const move=(g,p)=>{g.api.pl.x=p.x;g.api.pl.z=p.z;};
const records=()=>Object.fromEntries(['air','box','home'].map(id=>['zone90v2_signal_record_'+id+'_recruit',JSON.stringify({stars:3,best:37})]));
function advance(g,seconds,callback) {
  // Drive the same objective tick used by the game frame loop at fixed simulation intervals.
  for(let i=0;i<Math.round(seconds*5)&&g.api.run();i++){
    callback?.();g.second+=.2;g.perf(g.second*1000);g.api.tick(.2,g.second);
  }
}
function frame(g) {
  g.second+=.05;g.perf(g.second*1000);g.api.step(.05,g.second);
}
function use(g,position) {
  move(g,position);
  // The visual interaction prompt refreshes at most once every 130 ms.
  for(let i=0;i<4;i++)frame(g);
  assert.equal(el(g,'missionUse').disabled,false);
  click(g,'missionUse');
}
function verifyGeometry(g) {
  const vertices=g.api.draw(g.second);
  assert.ok(vertices.length>300);
  assert.equal(vertices.length%9,0);
  assert.ok(vertices.every(Number.isFinite));
}
function finishStages(g, route='safe') {
  const r=g.api.run();
  while(g.api.run()){
    const stage=r.stage,kind=g.api.kind(r),s=r.sites;
    switch(kind){
      case 'scan': move(g,s.scan);advance(g,11);break;
      case 'defend':
        for(const b of g.api.bots)g.api.kill(b);
        move(g,s.defend);advance(g,8);break;
      case 'cell':use(g,s.cell);use(g,s.socket);break;
      case 'lock':for(const i of g.api.code(r))use(g,s.pads[i]);break;
      case 'route':use(g,s[route]);break;
      case 'escort':advance(g,11,()=>move(g,r.drone));break;
      case 'extract':move(g,s.extract);advance(g,3.4);break;
      default:assert.fail(kind);
    }
    assert.ok(!g.api.run()||r.stage===stage+1,'advance '+kind);
  }
  assert.equal(g.api.report().won,true);
}
function openAfterQuit(g) {
  g.api.quit();click(g,'z1PlayBtn');click(g,'missionAccess');
}

test('the Play menu launches all four operations in order, with valid geometry, stars, paints and debrief splits',()=>{
  const g=gameAt(),a=g.api;
  const names=['Dead Air','Black Box','Long Way Home','Last Light'];
  click(g,'missionOp1');assert.equal(el(g,'missionLaunch').disabled,true);
  click(g,'missionOp0');
  for(const [i,name] of names.entries()){
    assert.equal(el(g,'missionName').textContent,name);
    const colours=el(g,'missionPaint').options;
    assert.equal(colours[1].disabled,i<2);assert.equal(colours[2].disabled,i<3);
    if(i===3)select(g,'missionPaint','orchid');
    click(g,'missionLaunch');
    assert.equal(a.state().mode,'crown-mission');
    const r=a.run();assert.ok(r);verifyGeometry(g);
    for(const point of Object.values(r.sites).flat()){
      assert.ok(!a.blocked(point.x,point.z,.55),'walkable objective '+JSON.stringify(point));
    }
    if(i===3)assert.equal(r.paint,'orchid');
    use(g,r.sites.cache);
    finishStages(g);
    const report=a.report();
    assert.equal(report.stars,3);assert.equal(report.r.splits.length,r.plan.stages.length);
    assert.equal(el(g,'missionSplits').children.length,r.plan.stages.length);
    assert.equal(a.record(r.plan.id,'recruit').best,report.time);
    assert.equal(a.total(),(i+1)*3);
    assert.equal(shown(g,'missionHud'),false);
    assert.equal(shown(g,'missionNext'),i<3);
    if(i<3)click(g,'missionNext');
  }
  click(g,'againBtn');assert.ok(shown(g,'missionBoard'));
  const oldCampaign=el(g,'z1PlayMenu').querySelectorAll('button').find(b=>b.textContent.includes('Operation Blackout'));
  assert.ok(oldCampaign);oldCampaign.click();
  assert.equal(a.state().mode,'campaign');assert.equal(a.run(),null);assert.equal(a.total(),12);
  assert.deepEqual(g.log.filter(s=>/ReferenceError|TypeError/.test(s)),[]);
});

test('relay contesting, radar cooldown, field kits, supplies and extraction work through touch controls',()=>{
  const g=gameAt({},true),a=g.api;
  select(g,'missionLevel','veteran');select(g,'missionKit','medic');
  click(g,'missionLaunch');const r=a.run(),s=r.sites;
  assert.equal(a.state().remaining,145);assert.equal(el(g,'missionClock').textContent,'2:25');
  assert.match(el(g,'missionBearing').textContent,/Ahead-left 27 m/);assert.equal(a.pl.shield,100);assert.ok(a.state().mobile);
  assert.equal(el(g,'missionKeys').textContent,'');
  click(g,'missionRadar');assert.equal(r.radarReady,12);
  assert.match(el(g,'missionBearing').textContent,/intel/i);assert.ok(el(g,'missionRadar').disabled);
  a.pl.hp=10;a.pl.shield=0;a.pl.stocks[0]=0;use(g,s.locker);
  assert.equal(a.pl.hp,75);assert.equal(a.pl.shield,65);assert.ok(a.pl.stocks[0]>0);
  assert.equal(a.use(),false);
  move(g,s.scan);advance(g,2);assert.ok(r.charge>=.49&&r.charge<=.51);
  a.setPaused(true);const elapsed=r.time;advance(g,1);assert.equal(r.time,elapsed);a.setPaused(false);
  advance(g,2.2);assert.equal(a.kind(r),'defend');
  assert.equal(a.bots.length,3);assert.ok(a.bots.every(b=>b.maxHp===94));
  move(g,s.defend);advance(g,1);assert.ok(r.contested);assert.equal(r.charge,0);
  for(const b of a.bots){a.kill(b);assert.equal(b.respawn,Infinity);}
  advance(g,7.2);assert.equal(a.kind(r),'extract');assert.equal(el(g,'missionRadar').disabled,false);
  move(g,s.extract);advance(g,1.6);assert.ok(r.charge>.4);
  move(g,s.spawn);advance(g,.2);assert.equal(r.charge,0);
  move(g,s.extract);advance(g,3.2);assert.ok(a.report().won);
  assert.equal(a.report().stars,2);
});

test('checkpoints survive reload, death, and timeout and preserve the loadout and independent difficulty records',()=>{
  const original=gameAt(records());select(original,'missionKit','scout');select(original,'missionPaint','amber');
  click(original,'missionLaunch');const first=original.api.run();
  click(original,'missionRadar');assert.equal(first.radarReady,6);
  use(original,first.sites.cache);
  move(original,first.sites.scan);advance(original,4.2);assert.equal(first.stage,1);
  const disk=snapshot(original);
  const g=gameAt(disk),a=g.api;
  assert.match(el(g,'missionLaunch').textContent,/Continue checkpoint/i);
  select(g,'missionKit','medic');select(g,'missionPaint','ion');
  click(g,'missionLaunch');let resumed=a.run();
  assert.equal(resumed.stage,1);assert.equal(resumed.kit,'scout');assert.equal(resumed.paint,'amber');
  assert.equal(resumed.intel,true);assert.equal(resumed.splits.length,1);
  a.pl.spawnProtectedUntil=0;a.hurt(1000);
  assert.equal(a.report().won,false);assert.equal(a.state().phase,'end');
  click(g,'againBtn');click(g,'missionLaunch');assert.equal(a.run().stage,1);
  a.timeout();frame(g);assert.equal(a.report().won,false);
  click(g,'againBtn');select(g,'missionLevel','standard');
  assert.match(el(g,'missionLaunch').textContent,/Start/i);
  click(g,'missionLaunch');assert.equal(a.state().remaining,180);
  resumed=a.run();move(g,resumed.sites.scan);advance(g,4.2);
  assert.equal(a.bots.length,2);assert.equal(a.bots[0].maxHp,72);
  openAfterQuit(g);select(g,'missionLevel','recruit');click(g,'missionRestart');
  assert.equal(a.run().stage,0);assert.equal(a.run().kit,'medic');assert.equal(a.run().paint,'ion');
  assert.equal(a.run().intel,false);
  move(g,a.run().sites.spawn);advance(g,80);finishStages(g);
  assert.equal(a.report().stars,1);assert.equal(a.record('air','recruit').stars,3);
  assert.equal(a.record('air','recruit').best,37);assert.equal(a.record('air','standard').best,null);
});

test('cell delivery and the code require the right interactable, escort waits, and both finale routes can finish',()=>{
  const g=gameAt(records()),a=g.api;
  click(g,'missionOp1');click(g,'missionLaunch');let r=a.run();
  move(g,r.sites.socket);assert.equal(a.use(),false);use(g,r.sites.cell);
  assert.equal(r.carry,true);verifyGeometry(g);use(g,r.sites.socket);
  assert.equal(a.kind(r),'lock');verifyGeometry(g);
  const code=a.code(r);
  use(g,r.sites.pads[code[0]]);use(g,r.sites.pads[code[2]]);assert.equal(r.sequence,0);
  for(const i of code)use(g,r.sites.pads[i]);assert.equal(a.kind(r),'extract');
  openAfterQuit(g);click(g,'missionOp2');click(g,'missionLaunch');r=a.run();
  move(g,r.sites.scan);advance(g,3.2);assert.equal(a.kind(r),'escort');
  move(g,r.sites.spawn);const start=r.drone.x;advance(g,1);assert.equal(r.drone.x,start);
  move(g,r.drone);advance(g,1);assert.notEqual(r.drone.x,start);verifyGeometry(g);
  move(g,r.sites.spawn);const stopped=r.drone.x;advance(g,1);assert.equal(r.drone.x,stopped);
  for(const route of ['safe','surge']){
    openAfterQuit(g);click(g,'missionOp3');click(g,'missionLaunch');r=a.run();
    assert.equal(a.kind(r),'route');verifyGeometry(g);
    use(g,r.sites[route]);assert.equal(r.route,route);
    if(route==='safe'){assert.equal(a.kind(r),'scan');assert.equal(a.hazard(r),null);}
    else{
      assert.equal(a.kind(r),'cell');move(g,a.hazard(r));a.pl.spawnProtectedUntil=0;
      const health=a.pl.hp+a.pl.shield;advance(g,5);
      assert.match(el(g,'missionHint').textContent,/pulse/i);assert.equal(a.pl.hp+a.pl.shield,health);
      advance(g,1.4);const struck=a.pl.hp+a.pl.shield;
      assert.ok(Math.abs(health-struck-12)<.001);advance(g,.4);assert.equal(a.pl.hp+a.pl.shield,struck);
    }
    finishStages(g);assert.equal(a.report().r.route,route);
  }
});

test('the Oman daily rotation, faster radar, stamps and five languages are independent of story progress',()=>{
  const g=gameAt({},false,'2026-11-18T19:59:00Z'),a=g.api;
  for(const lang of ['en','ar','es','fr','tr']){
    a.lang(lang);
    assert.equal(el(g,'missionAccess').querySelector('strong').textContent,a.text('mode'));
    assert.equal(el(g,'missionBoard').querySelector('h2').textContent,a.text('mode'));
  }
  a.lang('en');click(g,'missionOp4');select(g,'missionKit','scout');
  let oldId;
  for(let i=0;i<2;i++){
    click(g,'missionLaunch');const r=a.run();oldId=r.plan.id;
    assert.equal(r.day,'2026-11-18');click(g,'missionRadar');assert.equal(r.radarReady,3);
    finishStages(g);assert.equal(a.report().newStamp,i===0);assert.equal(a.total(),0);
    assert.equal(a.stamps().length,1);assert.equal(shown(g,'missionNext'),false);click(g,'againBtn');
  }
  g.time('2026-11-18T20:00:01Z');
  g.ui.dispatchEvent({type:'visibilitychange'});assert.match(el(g,'missionDailyInfo').textContent,/2026-11-19/);
  click(g,'missionLaunch');assert.notEqual(a.run().plan.id,oldId);
  assert.equal(a.run().day,'2026-11-19');finishStages(g);assert.equal(a.stamps().length,2);
});

test('a browser without writable storage can resume and unlock the next operation in the current session',()=>{
  const g=gameAt(),a=g.api;
  g.local.setItem=()=>{throw new Error('storage unavailable');};
  click(g,'missionLaunch');move(g,a.run().sites.scan);advance(g,3.2);openAfterQuit(g);
  assert.match(el(g,'missionLaunch').textContent,/Continue checkpoint/i);click(g,'missionLaunch');
  finishStages(g);click(g,'missionNext');assert.equal(el(g,'missionName').textContent,'Black Box');
  click(g,'missionLaunch');assert.equal(a.run().plan.id,'box');
  assert.ok(!Object.keys(snapshot(g)).some(key=>key.includes('signal_record')));
});
