import assert from 'node:assert/strict';
import {test} from 'node:test';
import {MODES,FIELD,makeMatch,inputMatch,updateMatch,snapshot} from '../server/overdrive-match.mjs';
import {z5Weapon,z5Elimination} from '../server/z5-combat-modes.mjs';
import {WAVE2_MODES,wave2State,wave2Advance,wave2Melee,wave2Ricochet,wave2Movement,wave2FireCooldown} from '../server/z5-wave2.mjs';

const players=[{id:1,name:'Copper',team:0},{id:2,name:'Bronze',team:1}];
const match=(mode,now=1000)=>makeMatch({id:'wave2:'+mode,mode,now,limit:15,players,rng:()=>.5});
const actions={finish:()=>{},mark:()=>{},eliminate:(m,p)=>{p.hp=0;p.deaths++}};

test('six new modes integrate into the existing authenticated multiplayer match engine',()=>{
 for(const mode of WAVE2_MODES){
  assert.ok(MODES.includes(mode),mode+' must be supported by the authoritative server');
  const m=match(mode),view=snapshot(m,1,1200);
  assert.equal(m.mode,mode);
  assert.ok(m.players.get(1));
  assert.ok(view.rows.length>=2);
  assert.ok(view.objective?.type===mode,'goal is visible to clients for '+mode);
 }
});

test('dual SMG firing consumes two rounds and locks the weapon on the server',()=>{
 const m=match('dualwield'),shooter=m.players.get(1);
 assert.equal(shooter.weapon,3);
 assert.equal(z5Weapon(m,shooter,2),3);
 const ammo=shooter.ammo[3];
 inputMatch(m,1,{seq:1,f:0,s:0,yaw:0,pitch:0,weapon:0,fire:true},2000);
 updateMatch(m,2000);
 assert.equal(shooter.ammo[3],ammo-2);
 assert.equal(shooter.weapon,3);
 assert.ok(m.events.filter(e=>e.type==='z2:shot').length>=1);
});

test('one-bounce ricochet reflects from the actual server collision face',()=>{
 const field={half:28,cover:[{x:6,z:0,w:2,d:3,h:3}]};
 const bounce=wave2Ricochet(field,[0,1.62,0],[1,0,0],70);
 assert.ok(bounce);
 assert.ok(Math.abs(bounce.distance-5)<1e-8);
 assert.deepEqual(bounce.dir,[-1,0,0]);
 assert.equal(wave2Ricochet(field,[0,1.62,0],[0,0,-1],70),null);
 const m=match('ricochet'),shooter=m.players.get(1),victim=m.players.get(2);
 m.field={id:'mirror',name:'Mirror',half:28,cover:field.cover};
 Object.assign(shooter,{x:0,z:0,shieldUntil:0});
 Object.assign(victim,{x:-7,z:0,shieldUntil:0});
 assert.equal(inputMatch(m,1,{seq:1,f:0,s:0,yaw:Math.PI/2,pitch:0,weapon:0,fire:true},2000),true);
 updateMatch(m,2000);
 assert.ok(victim.hp<100,'server-confirmed reflected ray reaches target behind shooter');
});

test('melee parry blocks a timed close-range strike, then permits a real damage hit',()=>{
 const m=match('parry'),attacker=m.players.get(1),victim=m.players.get(2);
 Object.assign(attacker,{x:0,z:0,yaw:0,abilityAt:0});
 Object.assign(victim,{x:0,z:-2,shieldUntil:0,parryUntil:1500});
 const hits=[],apply=(game,source,target,damage)=>{hits.push({source:source.id,target:target.id,damage});target.hp-=damage;};
 assert.equal(wave2Melee(m,attacker,1200,apply),true);
 assert.equal(hits.length,0,'the defender parried a legitimate timed slash');
 assert.ok(attacker.readyShot>=1550);
 attacker.abilityAt=0;victim.parryUntil=0;
 assert.equal(wave2Melee(m,attacker,2300,apply),true);
 assert.deepEqual(hits,[{source:1,target:2,damage:38}]);
 assert.equal(victim.hp,62);
 assert.equal(wave2Melee(m,attacker,2301,apply),false,'cooldown cannot be bypassed');
});

test('moving rail hazard harms only players on the server-owned moving train crossing',()=>{
 const m=match('train'),p=m.players.get(1),safe=m.players.get(2);
 assert.equal(m.field.id,'z5-train-yard');
 Object.assign(p,{x:0,z:0,shieldUntil:0,hp:100});
 Object.assign(safe,{x:20,z:22,shieldUntil:0,hp:100});
 wave2Advance(m,1000,.09,actions);
 assert.ok(p.hp<100);
 assert.equal(safe.hp,100);
 assert.ok(Math.abs(m.rule.x)<.01);
});

test('volcano telegraphs eruption before damaging players and ends its burn interval',()=>{
 const m=match('volcano'),p=m.players.get(1);
 p.shieldUntil=0;p.x=-15;p.z=0;
 wave2Advance(m,2000,.09,actions);
 assert.equal(m.rule.phase,'warning');assert.equal(p.hp,100);
 wave2Advance(m,4600,.09,actions);
 assert.equal(m.rule.phase,'eruption');assert.ok(p.hp<100);
 wave2Advance(m,9600,.09,actions);
 assert.equal(m.rule.phase,'calm');
});

test('time fracture changes movement and rate of fire only by server time',()=>{
 const m=match('timefracture');
 wave2Advance(m,1300,.08,actions);
 assert.equal(m.rule.phase,'slow');
 assert.equal(wave2Movement(m),.62);
 assert.equal(wave2FireCooldown(m),1.65);
 wave2Advance(m,10500,.08,actions);
 assert.equal(m.rule.phase,'fast');
 assert.equal(wave2Movement(m),1.32);
 assert.equal(wave2FireCooldown(m),.82);
});

test('new modes award only verified eliminations and preserve score limit',()=>{
 for(const mode of WAVE2_MODES){
  const m=match(mode),a=m.players.get(1),b=m.players.get(2);
  a.kills=1;b.deaths=1;
  let winning=null;
  assert.equal(z5Elimination(m,b,a,2200,{finish:(game,team)=>{winning=team},mark:()=>{}}),true);
  assert.deepEqual(m.score,[1,0]);
  assert.equal(winning,null);
 }
 assert.equal(FIELD.cover.some(c=>c.hp!==undefined),false,'legacy cover remains immutable');
});
