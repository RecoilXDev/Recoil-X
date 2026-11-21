import assert from 'node:assert/strict';
import {test} from 'node:test';
import {makeMatch,inputMatch,updateMatch,MODES,snapshot} from '../server/overdrive-match.mjs';
import {z5Arena,z5Weapon,z5Elimination,z5Advance,z5Objective} from '../server/z5-combat-modes.mjs';
const players=[{id:1,name:'Alpha',team:0},{id:2,name:'Beta',team:1}];
const make=(mode,rand=()=>.44)=>makeMatch({id:'test',mode,limit:15,players,now:1000,rng:rand});
test('all new combat modes are supported in existing authoritative game',()=>{
 for(const mode of ['gungame','onechamber','hardcore','bounty','chaos','parkour']){
  assert.ok(MODES.includes(mode));
  const m=make(mode),a=m.players.get(1);
  assert.ok(a);
  assert.ok(snapshot(m,1,1100).rows.length>0);
 }
});
test('hardcore spawn uses reduced health and protection',()=>{
 const m=make('hardcore'),p=m.players.get(1);
 assert.equal(p.hp,60);
 assert.equal(p.shieldUntil,1350);
});
test('gun game progresses through actual server weapons, winner reached at four kills',()=>{
 const m=make('gungame'),p=m.players.get(1),v=m.players.get(2);
 assert.equal(z5Weapon(m,p,2),0);
 p.kills=1;assert.equal(z5Weapon(m,p,0),3);
 p.kills=2;assert.equal(z5Weapon(m,p,0),1);
 p.kills=3;assert.equal(z5Weapon(m,p,0),2);
 p.kills=4;
 let victory=null;
 assert.equal(z5Elimination(m,v,p,2000,{finish:(m,w)=>victory=w,mark:()=>{}}),true);
 assert.equal(victory,0);
});
test('one in the chamber enforces one bullet, single forced sniper and three lives',()=>{
 const m=make('onechamber'),p=m.players.get(1),v=m.players.get(2);
 assert.equal(p.hp,75);assert.equal(p.ammo[2],1);assert.equal(z5Weapon(m,p,0),2);
 p.ammo[2]=0;p.kills=1;v.deaths=1;
 z5Elimination(m,v,p,2000,{finish:()=>{},mark:()=>{}});
 assert.equal(p.ammo[2],1);
 v.deaths=3;let win=null;
 z5Elimination(m,v,p,4000,{finish:(m,w)=>win=w,mark:()=>{}});
 assert.equal(v.forfeited,true);assert.equal(win,0);
});
test('bounties reward legitimate valued eliminations with anti-repeat limit',()=>{
 const m=make('bounty'),p=m.players.get(1),v=m.players.get(2);
 v.kills=2;p.kills=1;
 const awards=[],callbacks={finish:()=>{},mark:(m,at,kind,txt)=>awards.push(kind)};
 z5Elimination(m,v,p,1000,callbacks);
 assert.equal(m.score[0],3);
 z5Elimination(m,v,p,2000,callbacks);
 assert.equal(m.score[0],4);
 assert.deepEqual(awards,['bounty']);
});
test('chaos procedurally generates arena cover and server-managed corridor warnings',()=>{
 const m=make('chaos'),p=m.players.get(1);
 assert.equal(m.field.id,'z5-chaos');
 assert.equal(m.field.cover.length,14);
 p.x=0;p.z=0;p.hp=100;
 assert.equal(z5Advance(m,13000,{finish:()=>{},mark:()=>{}}),true);
 assert.equal(m.rule.hazard,true);
 assert.equal(p.hp,85);
 assert.equal(z5Objective(m,p,13000).type,'hazard');
});
test('parkour race advances server-validated gates and publishes next marker',()=>{
 const m=make('parkour'),p=m.players.get(1),w=m.players.get(2);
 p.x=0;p.z=-16;w.x=25;w.z=25;
 let done=null;
 const callbacks={finish:(m,w)=>done=w,mark:()=>{}};
 z5Advance(m,2000,callbacks);
 assert.equal(m.rule.progress[1],1);
 assert.equal(z5Objective(m,p,2000).checkpoint,1);
 assert.equal(m.score[0],1);
 const path=m.rule.gates.slice(1);
 for(const gate of path){p.x=gate.x;p.z=gate.z;z5Advance(m,3000,callbacks);}
 assert.equal(done,0);
});
test('server input processing remains compatible with new modes',()=>{
 const m=make('gungame'),p=m.players.get(1);
 assert.equal(inputMatch(m,1,{seq:1,f:0,s:0,yaw:0,pitch:0,weapon:3,fire:false},1200),true);
 updateMatch(m,1200);
 assert.equal(p.weapon,0);
 assert.equal(m.result,null);
});

test('Capture the Flag reuses real two-base flag mechanics and snapshot state',()=>{
 const m=make('ctf'),p=m.players.get(1);
 assert.equal(m.limit,3);
 assert.equal(m.relics.length,2);
 assert.equal(snapshot(m,1,1200).relics.length,2);
 p.x=0;p.z=23;
 inputMatch(m,1,{seq:1,f:0,s:0,yaw:0,pitch:0,weapon:0,use:true},1200);
 updateMatch(m,1200);
 assert.equal(m.mode,'ctf');
});
test('Duel Roulette uses identical server-selected weapons and advances rounds',()=>{
 const m=make('roulette',()=>.66),p=m.players.get(1),v=m.players.get(2);
 assert.equal(m.rule.phase,'fight');
 assert.equal(z5Weapon(m,p,0),2);
 assert.equal(z5Weapon(m,v,3),2);
 p.kills=1;v.deaths=1;
 let winner=null;
 z5Elimination(m,v,p,1800,{finish:(match,team)=>winner=team,mark:()=>{}});
 assert.equal(m.score[0],1);
 assert.equal(m.rule.phase,'break');
 assert.equal(winner,null);
 z5Advance(m,4300,{finish:()=>{},mark:()=>{},spawn:()=>{}});
 assert.equal(m.rule.round,2);
 assert.equal(m.rule.phase,'fight');
 assert.equal(z5Weapon(m,p,0),z5Weapon(m,v,1));
});

test('Search & Destroy requires a real hold to plant, and defenders can disarm before fuse',()=>{
 const m=make('searchdestroy'),a=m.players.get(1),d=m.players.get(2);
 assert.ok(MODES.includes('searchdestroy'));assert.equal(m.rule.armed,false);
 a.x=0;a.z=0;a.input.use=true;
 const events=[],opts={finish:()=>{},mark:(m,at,kind)=>events.push(kind),spawn:()=>{}};
 z5Advance(m,1200,opts);assert.equal(m.rule.armed,false,'one instantaneous tap cannot plant');
 z5Advance(m,2800,opts);assert.equal(m.rule.armed,true);
 assert.equal(z5Objective(m,a,2800).armed,true);
 d.x=0;d.z=0;d.input.use=true;
 z5Advance(m,3000,opts);assert.equal(m.score[1],0);
 z5Advance(m,5600,opts);assert.equal(m.score[1],1);
 assert.equal(m.rule.phase,'break');
 assert.deepEqual(events.filter(e=>e==='plant'||e==='defuse'),['plant','defuse']);
});
test('Search & Destroy rounds have no automatic respawn on elimination',()=>{
 const m=make('searchdestroy'),a=m.players.get(1),d=m.players.get(2);
 a.kills=1;d.deaths=1;d.spawnAt=5000;
 assert.equal(z5Elimination(m,d,a,2000,{finish:()=>{},mark:()=>{}}),true);
 assert.equal(d.spawnAt,0);
});
test('PvP Extraction completes three supplies followed by the extraction exit',()=>{
 const m=make('extraction'),p=m.players.get(1);
 assert.ok(MODES.includes('extraction'));assert.equal(m.rule.stage[0],0);
 p.input.use=true;let winner=null;
 const opts={finish:(m,w)=>winner=w,mark:()=>{},spawn:()=>{}};
 let now=1000;
 for(let i=0;i<4;i++){
  const target=m.rule.steps[i];
  p.x=target.x;p.z=target.z;
  z5Advance(m,now,opts);
  assert.equal(m.rule.stage[0],i);
  z5Advance(m,now+700,opts);
  assert.equal(m.rule.stage[0],i+1);
  if(i<3)assert.equal(z5Objective(m,p,now+700).stage,i+1);
  now+=1000;
 }
 assert.equal(winner,0);
 assert.equal(m.score[0],4);
 assert.equal(z5Elimination(m,m.players.get(2),p,now,{finish:()=>{},mark:()=>{}}),true);
});
