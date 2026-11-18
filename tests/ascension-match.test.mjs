import assert from 'node:assert/strict';
import {test} from 'node:test';
import {makeMatch,inputMatch,updateMatch,snapshot,ascAction,setOffline,restorePlayer} from '../server/overdrive-match.mjs';
import {GATES,FLAGS,rulesFor,worldWeekend} from '../server/ascension-world.mjs';

const start=Date.UTC(2026,10,20,11);
const seats=teams=>teams.map((team,i)=>({id:i+1,name:'Pilot'+(i+1),team}));
function game(mode,options={}){
  return makeMatch({id:'local-'+mode,mode,limit:20,now:start,rng:()=>.5,players:seats([0,1]),...options});
}
function step(m,ms,controls={},before){
  const end=m.last+ms;
  while(m.last<end&&!m.result){
    const now=Math.min(end,m.last+50);before?.();
    for(const [key,input] of Object.entries(controls)){
      const p=m.players.get(+key);
      inputMatch(m,p.id,{f:0,s:0,yaw:p.yaw,pitch:0,weapon:p.weapon,seq:p.seq+1,...input},now);
    }
    updateMatch(m,now);
  }
}
const view=(m,id=1)=>snapshot(m,id,m.last);
const pair=m=>[...m.players.values()];
const at=(p,x,z)=>Object.assign(p,{x,z});
function shot(m,who=1,target=2){
  const a=m.players.get(who),b=m.players.get(target);
  Object.assign(a,{x:2,z:5,yaw:0,readyShot:0});Object.assign(b,{x:2,z:0,hp:1,shieldUntil:0});
  step(m,50,{[who]:{fire:true}});
}
const act=(m,p,kind)=>ascAction(m,p.id,{kind,seq:p.asc.actionSeq+1},m.last);
test('A01 payload can be contested, enters overtime and crosses three checkpoints',()=>{
  const m=game('payload'),[p,q]=pair(m);at(p,0,-17);at(q,0,-17);step(m,500);assert.equal(m.asc.progress,0);
  at(q,18,18);m.asc.deadline=m.last;step(m,100);assert.equal(view(m).asc.phase,'overtime');
  step(m,31000,{},()=>at(p,0,-17+m.asc.progress*34));
  assert.equal(m.result.winner,0);assert.equal(m.result.reason,'convoy delivered');assert.equal(m.asc.checkpoint,3);
  const stopped=game('payload');stopped.asc.deadline=stopped.last;step(stopped,50);assert.equal(stopped.result.winner,1);
});
test('A02 search plants, defuses, holds eliminated players and switches sides',()=>{
  const m=game('search',{players:seats([0,0,1,1])}),[a,a2,b]=pair(m);at(a,0,12);
  step(m,3100,{1:{use:true}});assert(view(m).asc.armed);
  shot(m,3,2);assert.equal(a2.hp,0);assert.equal(a2.spawnAt,0);
  at(b,0,12);step(m,3100,{3:{use:true}});assert.equal(m.asc.round,2);assert.equal(m.asc.attacker,1);
  assert.deepEqual(m.score,[0,1]);assert(a2.hp>0);assert.equal(view(m).asc.armed,false);
});
test('A03 flags require recovery at home and score three validated captures',()=>{
  const m=game('flags'),[a,b]=pair(m);at(b,16,14);
  for(let i=0;i<3;i++){at(a,0,21);step(m,50,{1:{use:true}});assert.equal(m.asc.flags[1].holder,1);
    at(a,0,-21);step(m,50,{1:{use:false}});}
  assert.deepEqual(m.result.score,[3,0]);assert.equal(m.result.winner,0);
});
test('A04 gun game advances only on eliminations and counts the winning shot',()=>{
  const m=game('gunrun',{rules:{order:[0,2]}}),[a]=pair(m);
  shot(m);assert.equal(a.asc.stage,1);step(m,3000,{1:{fire:false}});assert.equal(a.weapon,2);
  shot(m);assert.equal(m.result.winner,0);assert.equal(m.result.reason,'final weapon');
  assert.equal(m.result.players[0].hits,2);assert.equal(m.result.players[0].shots,2);
});
test('A05 chamber limits ammunition and lives; legitimate eliminations replenish ammo',()=>{
  const m=game('chamber'),[a,b]=pair(m);assert.equal(m.field.half,16);
  assert.equal(a.ammo[0],1);for(let i=0;i<3;i++){shot(m);assert.equal(a.ammo[0],1);step(m,2800,{1:{fire:false}});}
  assert.equal(b.asc.lives,0);assert.equal(m.result.winner,0);
  const other=game('chamber'),[p]=pair(other);p.yaw=1.5;step(other,1500,{1:{fire:true,reload:true}});assert.equal(p.ammo[0],0);assert.equal(p.shots,1);
});
test('A06 bounty values are visible and repeated victim bonuses are capped',()=>{
  const m=game('bounty'),[a,b]=pair(m);b.asc.bounty=4;
  for(let i=0;i<3;i++){shot(m);step(m,2800);}
  assert.equal(a.asc.reward,5);assert.equal(a.asc.bounty,4);assert.equal(view(m).asc.bounty,a.name);
});
test('A07 hardcore uses lower health and withholds occluded opponents',()=>{
  const m=game('hardcore'),[a,b]=pair(m);assert.equal(a.hp,35);at(a,5,0);at(b,9,0);
  assert(!view(m).rows.some(r=>r[0]===b.id));at(b,4,3);assert(view(m).rows.some(r=>r[0]===b.id));
  assert.equal(pair(game('arena'))[0].hp,100);
});
test('A08 extraction must hold at the home zone and consumes each cargo once',()=>{
  const m=game('extraction'),[a]=pair(m);at(a,-3,-6);step(m,100,{1:{use:true}});assert.equal(a.asc.bag,1);
  Object.assign(a,FLAGS[0]);step(m,2100,{1:{use:true}});step(m,50,{1:{use:false}});assert.equal(a.asc.hold,0);
  step(m,4200,{1:{use:true}});assert.equal(a.asc.bank,1);assert.equal(a.asc.bag,0);step(m,4200,{1:{use:true}});assert.equal(m.score[0],1);
});
test('A09 race requires ordered airborne gates and retains the last checkpoint',()=>{
  const m=game('race'),[p]=pair(m);Object.assign(p,GATES[2],{jump:1});step(m,50);assert.equal(p.asc.gate,0);
  Object.assign(p,GATES[0]);step(m,50);assert.equal(p.asc.gate,0);
  for(const gate of GATES){Object.assign(p,gate,{jump:1});step(m,50);}
  assert.equal(p.asc.lastGate,GATES[3]);assert(p.asc.finish>0);
  step(m,12050);assert.equal(m.result.winner,0);assert.equal(m.result.race[0].name,p.name);
});
test('A10 roulette assigns identical weapons, resets both players and awards three rounds',()=>{
  const m=game('roulette'),[p,q]=pair(m);
  for(let i=0;i<3;i++){assert.equal(p.weapon,q.weapon);assert(m.asc.deadline-m.last<=30000);shot(m);step(m,50);
    if(i<2){assert.equal(q.hp,100);assert.equal(m.asc.round,i+2);}}
  assert.equal(m.result.winner,0);assert.equal(m.result.score[0],3);
});
test('A11 paired pistols consume a shared magazine and switching to a sniper holsters them',()=>{
  const m=game('payload'),[p]=pair(m);assert(act(m,p,'dual'));step(m,350,{1:{fire:true,yaw:1.5}});
  assert(p.asc.dual);assert.equal(p.ammo[0],29);assert.equal(p.readyShot-(start+300),172);
  step(m,50,{1:{reload:true}});assert(p.reloadAt>m.last+1500);
  step(m,2700,{1:{weapon:2}});assert.equal(p.ammo[0],30);assert.equal(p.asc.dual,false);
});
test('A12 heat blocks sustained fire and cools; private rooms may switch heat off',()=>{
  const m=game('payload'),[p]=pair(m);step(m,1600,{1:{weapon:3,fire:true,yaw:1.5}});
  assert(p.asc.locked);const n=p.shots;step(m,500,{1:{weapon:3,fire:true}});assert.equal(p.shots,n);
  step(m,7000,{1:{weapon:3}});assert(!p.asc.locked);
  const cold=game('payload',{rules:{heat:false}});step(cold,1500,{1:{weapon:3,fire:true,yaw:1.5}});assert.equal(pair(cold)[0].asc.heat,0);
});
test('A13 simulated shots break cover and remove its collider from both snapshots',()=>{
  const m=game('payload'),[p]=pair(m);at(p,-5,5);step(m,1200,{1:{fire:true,yaw:0,pitch:-.12}});
  assert(!m.field.cover.some(c=>c.id==='barrier'));assert(view(m,2).asc.broken.includes('barrier'));
  step(m,1250,{1:{f:1,yaw:0}});assert(p.z<0);
});
test('A14 a metal surface reflects one attenuated ray with no extra pellet hits',()=>{
  const m=game('payload'),[a,b]=pair(m);at(a,3,0);at(b,1,0);b.shieldUntil=0;a.readyShot=0;
  step(m,50,{1:{fire:true,yaw:Math.PI/2}});assert.equal(b.hp,87);assert.equal(a.hits,1);
  assert.equal(m.events.filter(e=>e.type==='z2:shot').length,2);
});
test('A17 melee parry counters during its window, then enforces cooldown',()=>{
  const m=game('payload'),[a,b]=pair(m);at(a,0,1);at(b,0,0);a.yaw=0;a.shieldUntil=b.shieldUntil=0;
  assert(act(m,b,'parry'));assert(act(m,a,'melee'));assert.equal(b.hp,100);assert.equal(a.hp,70);assert(!act(m,b,'parry'));
  step(m,800,{1:{},2:{}});assert(act(m,a,'melee'));assert.equal(b.hp,62);
});
test('A18 EMP disables nearby electronic equipment and destroys a nearby shield',()=>{
  const m=game('payload'),[a,b]=pair(m);at(a,1,6);at(b,1,0);a.yaw=0;b.yaw=0;
  assert(act(m,b,'shield'));assert(act(m,a,'emp'));assert(b.asc.emp>m.last);assert(!act(m,b,'emp'));
  step(m,100);assert.equal(m.asc.shields.length,0);assert(!act(m,a,'emp'));
});
test('A19 shields block movement, refuse overlapping placements and expire',()=>{
  const m=game('payload'),[a,b]=pair(m);at(a,1,8);at(b,1,5.5);a.yaw=0;assert(!act(m,a,'shield'));
  at(b,20,20);assert(act(m,a,'shield'));assert(!act(m,a,'shield'));step(m,1000,{1:{f:1,yaw:0}});
  assert(a.z>5.5);step(m,9200);assert(!view(m).asc.shields.length);assert(!m.field.cover.some(c=>c.material==='shield'));
});
test('A24 room rules validate map, health, gravity and permitted weapon ladder',()=>{
  assert.throws(()=>rulesFor({health:-1}));assert.throws(()=>rulesFor({order:[2,2]}));assert.throws(()=>rulesFor({map:'other'}));
  const m=game('payload',{rules:{health:150,map:'lab',gravity:'low',order:[1,2]}}),[p]=pair(m);
  step(m,50,{1:{weapon:3}});assert.equal(p.weapon,1);assert.equal(p.hp,150);assert.equal(m.field.id,'lab');
});
test('A26 broadcast follows its chosen teammate and filters opponents behind metal',()=>{
  const m=game('payload',{players:seats([0,0,1])}),[a,b,c]=pair(m);at(a,5,0);at(b,12,4);at(c,10,0);
  const viewFrom=p=>snapshot(m,0,m.last,false,undefined,p);
  assert.equal(viewFrom(a).camera,1);assert(!viewFrom(a).rows.some(r=>r[0]===3));assert(viewFrom(b).rows.some(r=>r[0]===3));
  assert.equal(viewFrom(a).asc.self,undefined);
});
test('A27 rejoin preserves objective inventory, resets input streams and expires deserted seats',()=>{
  const m=game('extraction'),[p]=pair(m);at(p,-3,-6);step(m,100,{1:{use:true}});assert(act(m,p,'parry'));
  setOffline(m,1,m.last);step(m,1500);assert(restorePlayer(m,1));assert.equal(p.asc.bag,1);assert.equal(p.asc.actionSeq,-1);
  setOffline(m,1,m.last,true);step(m,100);assert(!restorePlayer(m,1));assert.equal(m.result.reason,'forfeit');
});
test('A31 train has stable carriage colliders, moving scenery and damage off the deck',()=>{
  const m=game('payload',{rules:{map:'train'}}),[p]=pair(m),before=JSON.stringify(m.field.cover);
  assert(m.field.cover.length>=10);at(p,12,0);p.shieldUntil=0;step(m,1000);assert(p.hp<85);assert.equal(JSON.stringify(m.field.cover),before);
});
test('A32 submerged lab drains oxygen and health, then replenishes oxygen in air',()=>{
  const m=game('payload',{rules:{map:'lab'}}),[p]=pair(m);at(p,0,0);p.shieldUntil=0;step(m,13000);
  assert.equal(p.asc.oxygen,0);assert(p.hp<100);at(p,0,15);step(m,3600);assert(p.asc.oxygen>10);
});
test('A33 orbit retains momentum, bounds movement and extends jump time',()=>{
  const m=game('payload',{rules:{map:'orbit'}}),[p]=pair(m);at(p,0,10);step(m,700,{1:{f:1,yaw:0}});
  const z=p.z;step(m,200,{1:{jump:true,yaw:0}});assert(p.z<z);step(m,350);assert(p.jump>1.5);
  step(m,12000,{1:{f:1,yaw:0}});assert(p.z>=-m.field.half);
});
test('A34 volcanic hazards move and shrink; an active survivor earns a team victory',()=>{
  const m=game('volcano',{players:seats([0,0])}),[a,b]=pair(m);at(a,0,4);at(b,22,22);step(m,6100);
  const radius=m.asc.safe.r;assert(b.hp<a.hp);
  step(m,50000,{},()=>{if(m.asc.safe)Object.assign(a,{x:m.asc.safe.x,z:m.asc.safe.z});});
  assert(m.asc.safe.r<radius);assert.equal(m.result.winner,0);
});
test('A35 Titan shield requires two simultaneous operators and alternates telegraphed attacks',()=>{
  const m=game('titan',{players:seats([0,0])}),[a,b]=pair(m);at(a,-5,5);at(b,15,5);step(m,3000,{1:{use:true}});
  const boss=m.asc.enemies[0];assert.equal(boss.shieldUntil,Infinity);at(b,5,5);step(m,1700,{1:{use:true},2:{use:true}});assert.equal(boss.shieldUntil,0);
  step(m,500);assert.equal(m.asc.warning.heavy,false);step(m,3400);assert.equal(m.asc.warning.heavy,true);
  at(a,0,4);boss.hp=1;a.readyShot=0;step(m,100,{1:{fire:true,yaw:0}});assert.equal(m.result.winner,0);assert(m.result.worldDamage>0);
});
test('A36 fractured arenas toggle synchronized geometry and restore the original colliders',()=>{
  const m=game('fracture'),initial=m.field.cover.length;step(m,12000);assert.equal(view(m,1).asc.era,1);assert.equal(view(m,2).asc.rifts.length,2);
  step(m,12000);assert.equal(view(m).asc.era,0);assert.equal(m.field.cover.length,initial);
});
test('A38 hidden vault checks ordered interactions and separately records collection',()=>{
  const m=game('payload'),[p]=pair(m);at(p,-18,-12);step(m,50,{1:{use:true}});assert.equal(p.asc.vault,0);
  for(const [x,z] of [[-13,-10],[-12,-16],[-18,-12]]){at(p,x,z);step(m,50,{1:{use:false}});step(m,50,{1:{use:true}});}
  assert(m.asc.vaultOpen);assert(!m.field.cover.some(c=>c.material==='vault'));assert(!p.asc.found);
  at(p,-18,-18);step(m,50,{1:{use:true}});assert(view(m).asc.self.found);
});
test('A39 alien waves scale, use two movement types, cap enemies and end on the boss',()=>{
  const m=game('invasion',{players:seats([0,0])});step(m,1100);
  for(let wave=1;wave<=4;wave++){assert.equal(m.asc.wave,wave);assert(m.asc.enemies.length<=8);
    if(wave<4)assert.equal(new Set(m.asc.enemies.map(e=>e.kind)).size,2);else assert.equal(m.asc.enemies[0].kind,'titan');
    for(const e of m.asc.enemies)e.hp=0;step(m,1650);}
  assert.equal(m.result.winner,0);assert.equal(m.result.score[0],4);
});
test('A40 weekend schedule uses Oman midnight and leaves weekday raids available separately',()=>{
  assert(!worldWeekend(Date.UTC(2026,10,19,19,59)));assert(worldWeekend(Date.UTC(2026,10,19,20)));
  assert(worldWeekend(Date.UTC(2026,10,21,19,59)));assert(!worldWeekend(Date.UTC(2026,10,21,20)));
  const m=game('worldboss',{players:seats([0,0])});step(m,1200);assert.equal(m.asc.enemies[0].kind,'titan');
});
test('A41 authoritative timing, ammo, damage and stale input reject duplicate results',()=>{
  const m=game('payload'),[a,b]=pair(m);at(a,2,5);at(b,2,0);b.shieldUntil=0;a.readyShot=0;
  step(m,150,{1:{fire:true,yaw:0,damage:500}});assert.equal(a.shots,1);assert.equal(b.hp,78);
  assert(!inputMatch(m,a.id,{seq:a.seq,f:0,s:0,yaw:0,pitch:0,weapon:0},m.last));assert.equal(a.ammo[0],29);
});
