import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFileSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import { setTimeout as wait } from 'node:timers/promises';
import { runInNewContext } from 'node:vm';
import { makeMatch, inputMatch, setOffline, restorePlayer, updateMatch, snapshot, ROOM_GRACE } from '../server/overdrive-match.mjs';
import { draftBudget, propSelection, vehicleGate } from '../server/expansion-modes.mjs';
import { createOverdrive } from '../server/overdrive.mjs';
import { createRecoilServer } from '../server/server.mjs';
import { migrateOverdrive, overdriveStore } from '../server/overdrive-store.mjs';

const START=Date.UTC(2026,10,18);
const season='2026-Q4';
const matchId='e64b67d2-38b9-447a-8653-2619b98cf38f';
const seat=(id,team)=>({id,team,name:'Player'+id});
const fail=(status,message)=>Object.assign(new Error(message),{status});
function game(mode,players=[seat(1,0),seat(2,1)],options={}){
  return makeMatch({id:matchId,mode,limit:10,players,now:START,rng:()=>.5,...options});
}
function step(m,ms,controls={}){
  const end=m.last+ms;
  for(let now=Math.min(end,m.last+50);m.last<end&&!m.result;now=Math.min(end,now+50)){
    for(const [id,input] of Object.entries(controls)){
      const p=m.players.get(Number(id));
      inputMatch(m,p.id,{f:0,s:0,yaw:p.yaw,pitch:0,weapon:0,seq:p.seq+1,...input},now);
    }
    updateMatch(m,now);
  }
}

test('escort contest, side swap and delivery winner are recorded',()=>{
  const m=game('escort'),a=m.players.get(1),b=m.players.get(2);
  Object.assign(a,{x:0,z:-16});Object.assign(b,{x:0,z:-16});
  step(m,350);
  assert.equal(m.rule.progress,0);
  b.x=14;
  step(m,1100);
  assert(m.score[0]>=4);
  m.rule.deadline=m.last+50;
  step(m,50);
  assert.equal(snapshot(m,1,m.last).objective.half,1);
  assert.equal(m.rule.progress,0);
  assert.equal(a.z,23);
  assert.equal(b.z,-23);
  Object.assign(b,{hp:0,spawnAt:m.last+50});
  step(m,50);
  assert.equal(b.z,-23);
  m.rule.deadline=m.last+50;
  step(m,50);
  assert.equal(m.result.winner,0);
  assert(m.result.timeline.some(e=>e.kind==='escort'));
  assert(m.result.timeline.some(e=>e.kind==='lead'));
});

test('moving hot zone rotates and scores only when held alone',()=>{
  const m=game('hotzone'),a=m.players.get(1),b=m.players.get(2);
  Object.assign(a,{x:0,z:0});Object.assign(b,{x:0,z:0});
  step(m,900);
  assert.deepEqual(m.score,[0,0]);
  b.x=-14;
  step(m,1050);
  assert.equal(m.score[0],2);
  m.rule.deadline=m.last+50;
  step(m,50);
  assert.equal(snapshot(m,1,m.last).objective.site,2);
});

test('elimination rounds hold dead players out and a spectator can follow the last play',()=>{
  const m=game('elimination',undefined,{tournament:true});
  const a=m.players.get(1),b=m.players.get(2);
  Object.assign(a,{x:0,z:0,yaw:Math.PI,readyShot:0});
  Object.assign(b,{x:0,z:6,hp:22,shieldUntil:0});
  step(m,50,{1:{fire:true}});
  assert.equal(b.hp,0);
  assert.equal(b.spawnAt,0);
  assert.equal(snapshot(m,0,m.last).camera,1);
  assert.equal(snapshot(m,2,m.last).camera,undefined);
  step(m,50);
  assert.deepEqual(m.score,[1,0]);
  assert.equal(m.rule.phase,'break');
  step(m,3250);
  assert.equal(b.hp,100);
  assert.equal(m.rule.round,2);
});

test('weapon budget accepts only affordable choices and locks that loadout in a round',()=>{
  const m=game('budget',[seat(1,0),seat(2,0),seat(3,1),seat(4,1)]);
  const a=m.players.get(1),b=m.players.get(2);
  assert(draftBudget(m,a,2,START));
  assert(!draftBudget(m,b,0,START));
  assert(draftBudget(m,b,3,START));
  assert.equal(snapshot(m,1,START).objective.spent,7);
  step(m,12050,{1:{weapon:0}});
  assert.equal(m.rule.phase,'fight');
  assert.equal(a.weapon,2);
  assert(!draftBudget(m,a,0,m.last));
});

test('prop hunt enforces roles and switches hiders at halftime',()=>{
  const m=game('props'),a=m.players.get(1),b=m.players.get(2),before=b.z;
  assert(propSelection(m,a,2));
  assert(!propSelection(m,b,1));
  step(m,1200,{1:{fire:true},2:{fire:true,f:1}});
  assert.equal(b.z,before);
  assert.equal(a.ammo[0],30);
  assert(!snapshot(m,2,m.last).rows.some(r=>r[0]===1));
  Object.assign(a,{x:-2,z:-4});
  Object.assign(b,{x:-2,z:5});
  m.rule.deadline=m.last+50;
  step(m,50);
  assert.equal(snapshot(m,2,m.last).rows.find(r=>r[0]===1)[18],2);
  assert(!propSelection(m,a,1));
  m.rule.deadline=m.last+50;
  step(m,50);
  assert.equal(m.rule.half,1);
  assert(propSelection(m,b,1));
});

test('Jeep Relay swaps drivers at gates and records the winning crew',()=>{
  const m=game('jeep',[seat(1,0),seat(2,0),seat(3,1),seat(4,1)]);
  const car=m.rule.cars[0],start=car.z;
  step(m,300,{2:{f:1}});
  assert.equal(car.z,start);
  step(m,300,{1:{f:1}});
  assert(car.speed>2);
  step(m,300,{1:{f:1,jump:true}});
  assert(car.speed<.01);
  for(let gate=0;gate<4;gate++){
    Object.assign(car,vehicleGate(car));
    step(m,50);
    assert.equal(m.score[0],gate+1);
    if(gate<3)assert.equal(car.driver,gate%2===0?2:1);
  }
  assert.equal(m.result.winner,0);
  assert.equal(m.result.timeline.filter(e=>e.kind==='gate').length,4);
});

test('Crown Raids require two teammates on separate seals',()=>{
  const m=game('raid',[seat(1,0),seat(2,0)]);
  const [a,b]=m.players.values();
  Object.assign(a,{x:-9,z:5});Object.assign(b,{x:9,z:5});
  step(m,1350,{1:{use:true}});
  assert.equal(snapshot(m,1,m.last).objective.shield,true);
  step(m,1250,{1:{use:true},2:{use:true}});
  assert.equal(snapshot(m,1,m.last).objective.shield,false);
  Object.assign(a,{x:0,z:3,yaw:0,readyShot:0});
  m.rule.boss.hp=22;
  step(m,100,{1:{fire:true}});
  assert.equal(m.rule.bossIndex,1,'First guardian defeated, second boss begins');
  assert.equal(m.result,null);
  m.rule.boss.hp=0;step(m,100);
  assert.equal(m.rule.bossIndex,2,'Abyss Leviathan defeated, third boss begins');
  m.rule.boss.hp=0;step(m,100);
  assert.equal(m.result.winner,0);
  assert.equal(m.result.score[0],100);
  assert(m.result.timeline.some(e=>e.kind==='raid'));

  const timeout=game('raid',[seat(1,0),seat(2,0)]);
  timeout.rule.boss.hp=470;
  step(timeout,50);
  assert(timeout.score[0]>0);
  timeout.end=timeout.last+50;
  step(timeout,50);
  assert.equal(timeout.result.winner,1);
});

test('early ranked disconnects wait, can resume and void without rating points',()=>{
  const m=game('arena',undefined,{season,remake:true});
  step(m,1200);
  const a=m.players.get(1);
  setOffline(m,1,m.last);
  step(m,200,{2:{f:1,fire:true}});
  assert(snapshot(m,2,m.last).waitingEarly);
  assert(restorePlayer(m,a.id));
  assert(!snapshot(m,2,m.last).waitingEarly);
  setOffline(m,1,m.last);
  step(m,ROOM_GRACE+50);
  assert.equal(m.result.winner,null);
  assert.equal(m.result.reason,'remake');
  const left=game('arena',undefined,{season,remake:true});
  setOffline(left,1,START,true);step(left,50);
  assert.equal(left.result.reason,'forfeit');
});

test('ready squads stay together through a ranked captain veto',async()=>{
  let clock=START;
  const clients=new Map([1,2,3,4].map(id=>[id,seat(id,0)])),events=new Map();
  const overdrive=createOverdrive({client:id=>clients.get(id),clock:()=>clock,
    send:(c,event)=>{if(!events.has(c.id))events.set(c.id,[]);events.get(c.id).push(event);},
    store:{rating:()=>({points:500}),muted:()=>false},fail,allowed:()=>true,leaveLegacy:()=>{},cleanChat:value=>value});
  const send=(id,action,fields={})=>overdrive.packet(clients.get(id),clients.get(id),{type:'z2:'+action,...fields});
  const recent=(id,type)=>events.get(id)?.findLast(e=>e.type==='z2:'+type);
  try{
    for(const host of [1,3]){
      send(host,'create',{mode:'arena',squad:true,size:2});
      send(host+1,'join',{code:recent(host,'lobby').code});
      assert.throws(()=>send(host,'squad-queue'),{status:409});
      for(const id of [host,host+1])send(id,'squad-ready',{ready:true});
      send(host,'squad-queue');
      assert(recent(host+1,'queue').waiting);
    }
    clock+=1100;await wait(150);
    let lobby=recent(1,'lobby');
    assert.equal(lobby.phase,'veto');
    assert.equal(lobby.veto.remaining,18000);
    assert.equal(lobby.members.find(p=>p.id===1).team,lobby.members.find(p=>p.id===2).team);
    assert.equal(lobby.members.find(p=>p.id===3).team,lobby.members.find(p=>p.id===4).team);
    assert.notEqual(lobby.members.find(p=>p.id===1).team,lobby.members.find(p=>p.id===3).team);
    assert.throws(()=>send(2,'veto',{map:'overdrive'}),{status:403});
    send(lobby.veto.captains[0],'veto',{map:'overdrive'});
    lobby=recent(1,'lobby');
    assert.equal(lobby.veto.turn,1);
    send(lobby.veto.captains[1],'veto',{map:'switchyard'});
    assert.equal(recent(1,'begin').field.id,'frostline');
    assert.equal(recent(2,'begin').id,recent(1,'begin').id);
  }finally{overdrive.close();}
});

test('map codes and match reports preserve data boundaries and snapshot existing SQLite data',()=>{
  const folder=mkdtempSync(join(tmpdir(),'recoil-z3-'));
  const filename=join(folder,'recoil.sqlite'),db=new DatabaseSync(filename);
  try{
    db.exec("CREATE TABLE users (id INTEGER PRIMARY KEY,name TEXT,handle TEXT,admin INTEGER,banned INTEGER);"+
      "INSERT INTO users VALUES(1,'Player1','player1',1,0),(2,'Player2','player2',0,0),(3,'Player3','player3',0,0);"+
      "CREATE TABLE rx2_schema (version INTEGER PRIMARY KEY); INSERT INTO rx2_schema VALUES (1);");
    migrateOverdrive(db,filename,true);
    const backup=readdirSync(join(folder,'.recoil-backups'));
    assert.equal(backup.length,1);
    assert.match(backup[0],/before-z3/);
    const archived=new DatabaseSync(join(folder,'.recoil-backups',backup[0]),{readOnly:true});
    try{
      assert.equal(archived.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
      assert.equal(archived.prepare('SELECT COUNT(*) AS n FROM users').get().n,3);
    }finally{archived.close();}
    const store=overdriveStore(db,fail);
    const map={title:'Test ramp',blocks:[{type:'checkpoint',gx:1,gz:1},{type:'doortrigger',gx:2,gz:1,step:1}]};
    const {code}=store.shareMap({id:1},map,START);
    assert.match(code,/^[A-Z2-9]{7}$/);
    assert.equal(store.shareMap({id:1},map,START).code,code);
    assert.deepEqual(store.loadMap(code),map);
    assert.throws(()=>store.shareMap({id:1},{...map,blocks:[{type:'doortrigger',gx:2,gz:1,step:199}]},START),{status:400});

    const m=game('arena',undefined,{season,remake:true});
    setOffline(m,2,START+500);step(m,ROOM_GRACE+550);
    assert.deepEqual(store.settle(m.result,m.last),{});
    const payload={name:'Player2',reason:'Example review',matchId,at:1000};
    assert.throws(()=>store.report({id:3},payload,m.last),{status:404});
    assert.throws(()=>store.report({id:1},{...payload,at:m.result.duration+1000},m.last),{status:400});
    store.report({id:1},payload,m.last);
    assert.throws(()=>store.history({id:2,admin:false}),{status:403});
    const report=store.history({id:1,admin:true}).reports[0];
    assert.equal(report.matchId,matchId);assert.equal(report.at,1000);
    assert(report.timeline.some(e=>e.kind==='start'));
    assert.equal(store.profile(1,m.last).wins,0);
  }finally{db.close();rmSync(folder,{recursive:true,force:true});}
});

test('offline files are served and the worker caches only its scoped game shell',async()=>{
  const server=createRecoilServer({database:':memory:'});
  server.listen(0,'127.0.0.1');await once(server,'listening');
  try{
    const url='http://127.0.0.1:'+server.address().port;
    const manifest=await fetch(url+'/manifest.webmanifest');
    assert.equal(manifest.headers.get('content-type'),'application/manifest+json');
    assert.equal((await manifest.json()).start_url,'./');
    assert.equal((await fetch(url+'/sw.js')).headers.get('content-type'),'text/javascript; charset=utf-8');
    const home=await (await fetch(url+'/')).text();
    for(const file of ['recoil-city-world.js','recoil-city-view.js','recoil-city-radio.js','recoil-city.js']){
      assert.ok(home.includes('src="server/'+file+'"'));
      const asset=await fetch(url+'/server/'+file);
      assert.equal(asset.status,200);
      assert.match(asset.headers.get('content-type'),/javascript/);
    }
    assert.equal((await fetch(url+'/server/recoil-city-cover.webp')).headers.get('content-type'),'image/webp');
    const icon=await fetch(url+'/recoil-icon-192.png');
    assert.equal(icon.headers.get('content-type'),'image/png');
    assert.equal(new DataView(await icon.arrayBuffer()).getUint32(16),192);
  }finally{await new Promise(resolve=>server.close(resolve));}
  const listeners=new Map(),cached=new Map(),deleted=[];
  let network=null;
  runInNewContext(readFileSync(new URL('../sw.js',import.meta.url),'utf8'),{
    self:{registration:{scope:'https://example.test/Recoil-X/'},clients:{claim:async()=>{}},
      addEventListener:(type,listener)=>listeners.set(type,listener)},Request,Response,URL,
    caches:{open:async()=>({
      addAll:async entries=>entries.forEach(r=>cached.set(r.url,new Response('cached game'))),
      put:async (url,response)=>cached.set(url,response),
      match:async url=>cached.get(url)?.clone()}),
      keys:async()=>['other-app','recoil-x-shell:/Recoil-X/:old'],delete:async key=>deleted.push(key)},
    fetch:async()=>{if(network)return network.clone();throw new TypeError('offline');}
  });
  let job;
  listeners.get('install')({waitUntil:value=>job=value});
  await job;
  assert.equal(cached.size,11);
  for(const file of ['recoil-city-world.js','recoil-city-view.js','recoil-city-radio.js','recoil-city.js','recoil-city-cover.webp']){
    assert.ok(cached.has('https://example.test/Recoil-X/server/'+file));
  }
  listeners.get('activate')({waitUntil:value=>job=value});
  await job;
  assert.deepEqual(deleted,['recoil-x-shell:/Recoil-X/:old']);
  const request={method:'GET',mode:'navigate',url:'https://example.test/Recoil-X/'};
  async function visit(url=request.url){
    let reply,background;
    listeners.get('fetch')({request:{...request,url},respondWith:value=>reply=value,waitUntil:value=>background=value});
    const response=await reply;
    await background;
    return response.text();
  }
  assert.equal(await visit(),'cached game');
  network=new Response('new game',{headers:{'Content-Type':'text/html; charset=utf-8'}});
  assert.equal(await visit(),'new game');
  network=new Response('query view',{headers:{'Content-Type':'text/html'}});
  assert.equal(await visit(request.url+'?alternate=1'),'query view');
  network=new Response('temporarily unavailable',{status:503});
  assert.equal(await visit(),'new game');
  network=null;
  assert.equal(await visit(),'new game');
  for(const url of ['https://example.test/rx-api/me','https://elsewhere.test/'])listeners.get('fetch')({
    request:{...request,url},respondWith:()=>assert.fail('a non-shell request was intercepted')});
});
