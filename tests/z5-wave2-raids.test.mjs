import assert from 'node:assert/strict';
import {test} from 'node:test';
import {MODES,makeMatch,snapshot,updateMatch} from '../server/overdrive-match.mjs';
import {advanceMode,ruleView,RAID_MODES} from '../server/expansion-modes.mjs';
import {createOverdrive} from '../server/overdrive.mjs';
const roster=[{id:1,name:'Alpha',team:0},{id:2,name:'Beta',team:0}];
const make=(mode,now=Date.UTC(2026,10,20,12))=>makeMatch({id:'boss:'+mode,mode,limit:15,players:roster,now,rng:()=>.5});
const run=(m,now)=>advanceMode(m,now,.05,{finish:(game,winner,reason)=>{game.result={winner,reason}},
 mark:()=>{},spawn:()=>{},move:()=>{}});
test('Titan, Alien Invasion and World Boss use the existing authenticated raid engine',()=>{
 for(const mode of ['titanraid','alieninvasion','worldboss']){
  assert.ok(RAID_MODES.includes(mode));assert.ok(MODES.includes(mode));
  const m=make(mode);
  assert.equal(m.rule.boss.id,-1);
  assert.equal(m.end-m.started,900000,'15-minute authoritative raid timer');
  assert.equal(m.players.size,2);
  assert.ok(snapshot(m,1,m.started).objective.boss.hp>1000||mode==='alieninvasion');
  assert.equal(ruleView(m,null,m.started).index,1);
 }
});
test('Titan Mech uses heavy rail bombardment and completes after its shielded guardian falls',()=>{
 const m=make('titanraid');
 assert.equal(m.rule.boss.name,'Titan Mech MK-IV');
 assert.equal(m.rule.boss.attack,'plasma bombardment');
 assert.equal(m.rule.totalBosses,1);
 m.rule.boss.hp=0;
 run(m,m.started+1500);
 assert.deepEqual(m.result,{winner:0,reason:'raid'});
});
test('Alien Invasion advances three real enemy commanders with escalating hit points',()=>{
 const m=make('alieninvasion');
 const names=['Void Scout','Phase Harvester','Xeno Overmind'];
 assert.equal(m.rule.totalBosses,3);
 assert.equal(m.rule.boss.name,names[0]);
 let lastHp=0;
 for(let i=0;i<3;i++){
  assert.equal(m.rule.boss.name,names[i]);
  assert.ok(m.rule.boss.maxHp>lastHp);
  lastHp=m.rule.boss.maxHp;
  m.rule.boss.hp=0;
  run(m,m.started+2000+i*1000);
 }
 assert.equal(m.result.winner,0);
 assert.equal(m.score[0],100);
});
test('World Boss roster rotates on week boundaries using server dates, not client timestamps',()=>{
 const week=Date.UTC(2026,10,20,12);
 const a=make('worldboss',week);
 const b=make('worldboss',week+7*86400000);
 assert.equal(a.rule.totalBosses,1);
 assert.notEqual(a.rule.boss.name,b.rule.boss.name);
});
test('World Boss lobbies are allowed Friday/Saturday Oman time but denied on Sunday',()=>{
 let now=Date.UTC(2026,10,20,12);
 const outputs=[],conn={id:1},user={id:1,name:'Alpha'};
 const svc=createOverdrive({client:()=>conn,send:(c,d)=>outputs.push(d),store:{settle:()=>({})},
 fail:(status,message)=>Object.assign(new Error(message),{status}),allowed:()=>true,
 leaveLegacy:()=>{},cleanChat:s=>s,clock:()=>now});
 try{
  svc.packet(conn,user,{type:'z2:create',mode:'worldboss',size:2,limit:15});
  assert.ok(outputs.some(x=>x.type==='z2:lobby'&&x.mode==='worldboss'));
  svc.packet(conn,user,{type:'z2:leave'});
  now=Date.UTC(2026,10,22,12);
  assert.throws(()=>svc.packet(conn,user,{type:'z2:create',mode:'worldboss',size:2,limit:15}),{status:403});
 }finally{svc.close();}
});


test('five weekend boss profiles rotate through the existing authoritative raid engine',()=>{
 const start=Date.UTC(2026,10,20,12),names=new Set();
 for(let i=0;i<5;i++){
  const m=make('worldboss',start+i*7*86400000);
  names.add(m.rule.boss.name);
  assert.ok(m.rule.boss.maxHp>=2600);
  assert.ok(m.rule.boss.radius>4);
 }
 assert.equal(names.size,5);
 assert.ok(names.has('Wadi Stormkeeper'));
 assert.ok(names.has('Obsidian Sentinel'));
});
