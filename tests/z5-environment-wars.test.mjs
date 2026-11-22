import assert from 'node:assert/strict';
import {test} from 'node:test';
import {DatabaseSync} from 'node:sqlite';
import {migrateZ5, migrateZ5ClanWars, createZ5Core} from '../server/z5-core.mjs';
import {MODES,FIELD,makeMatch,snapshot} from '../server/overdrive-match.mjs';
import {underwaterField,destructibleField,coverShot,oxygenStep} from '../server/z5-environment.mjs';
import {advanceMode,ruleView} from '../server/expansion-modes.mjs';
import {createOverdrive} from '../server/overdrive.mjs';

test('Z.5 environmental and Clan Wars modes are selectable in authoritative multiplayer',()=>{
 for(const mode of ['clanwar','underwater','demolition'])assert.ok(MODES.includes(mode),mode);
 const participants=[{id:1,name:'Alpha',team:0},{id:2,name:'Beta',team:1}];
 const orig=FIELD.cover.map(c=>({...c}));
 const abyss=makeMatch({id:'swim',mode:'underwater',now:1000,limit:10,players:participants});
 assert.equal(abyss.field.underwater,true);
 assert.equal(abyss.field.destructible,true);
 assert.ok(abyss.field.airStations.length>=4);
 assert.equal(abyss.players.get(1).oxygen,100);
 assert.equal(snapshot(abyss,1,1100).objective.type,'underwater');
 assert.ok(Array.isArray(snapshot(abyss,1,1100).cover));
 const destroy=makeMatch({id:'break',mode:'demolition',now:1000,limit:10,players:participants});
 assert.equal(destroy.field.cover.every(c=>c.maxHp>0),true);
 assert.deepEqual(FIELD.cover,orig,'destroyable cover must not mutate another room or base arena');
 assert.equal(snapshot(destroy,1,1100).objective.type,'demolition');
});
test('shots damage authoritative cover only on validated ray hits and open blocked lanes',()=>{
 const base={half:28,cover:[{x:5,z:0,w:3,d:3,h:2}]};
 const field=destructibleField(base);
 assert.equal(coverShot(field,[0,1.6,0],[0,0,-1],100,40),null);
 const initial=field.cover[0].hp;
 const hit=coverShot(field,[0,1.6,0],[1,0,0],100,40);
 assert.equal(hit.id,0);assert.ok(hit.hp<initial);
 let last;
 for(let i=0;i<20&&field.cover[0].hp>0;i++)last=coverShot(field,[0,1.6,0],[1,0,0],100,50);
 assert.equal(last.broken,true);
 assert.equal(field.cover[0].hp,0);
 assert.equal(coverShot(field,[0,1.6,0],[1,0,0],100,40),null,'broken cover cannot absorb future bullets');
 assert.equal(base.cover[0].hp,undefined);
});
test('oxygen changes only with server timestep, breath stations and Use, not client-provided air',()=>{
 const field=underwaterField(FIELD),p={x:6,z:6,oxygen:100};
 for(let i=0;i<210;i++)oxygenStep(p,field,.1);
 assert.equal(p.oxygen,0);assert.ok(oxygenStep(p,field,.1).damage>0);
 p.x=-18;p.z=-15;
 for(let i=0;i<35;i++)oxygenStep(p,field,.1,true);
 assert.ok(p.oxygen>95);
 const before=p.oxygen;oxygenStep(p,field,.1,false);assert.ok(p.oxygen<before);
});
test('Clan War scoreboard accepts server-completed match only, records once and keeps two clans separate',()=>{
 const db=new DatabaseSync(':memory:');
 db.exec("PRAGMA foreign_keys=ON;CREATE TABLE users(id INTEGER PRIMARY KEY,name TEXT,handle TEXT UNIQUE,banned INTEGER DEFAULT 0,admin INTEGER DEFAULT 0)");
 for(const [id,name] of [[1,'Alpha'],[2,'Beta'],[3,'Gamma']])
  db.prepare("INSERT INTO users(id,name,handle,banned,admin) VALUES(?,?,?,0,0)").run(id,name,name.toLowerCase());
 migrateZ5(db,':memory:',false);
 assert.equal(migrateZ5ClanWars(db),true);
 assert.equal(migrateZ5ClanWars(db),false);
 const z=createZ5Core(db,{clock:()=>500000});
 const a={id:1},b={id:2},c={id:3};
 z.createClan(a,{name:'Sand Falcons'});z.createClan(b,{name:'Iron Wolves'});
 assert.equal(z.clanFor(3),null);
 const clans=[z.clanFor(1).clan,z.clanFor(2).clan];
 const result={id:'verified-match-1',mode:'clanwar',clanWar:{clans},winner:0,reason:'score',score:[15,8],
   players:[{id:1,team:0},{id:2,team:1}]};
 assert.deepEqual(z.recordClanWar({...result,mode:'arena'}),{recorded:false});
 assert.deepEqual(z.recordClanWar(result),{recorded:true});
 assert.deepEqual(z.recordClanWar(result),{recorded:false});
 assert.equal(z.clanWars(a).wins,1);assert.equal(z.clanWars(a).recent[0].opponent,'Iron Wolves');
 assert.equal(z.clanWars(b).losses,1);assert.equal(z.clanWars(c).clan,null);
 assert.equal(db.prepare('SELECT COUNT(*) n FROM rx5_clan_wars').get().n,1);
 db.close();
});
test('Co-op raid now has three bosses, escalating abilities and a server-verified final win',()=>{
 const crew=[{id:1,name:'P1',team:0},{id:2,name:'P2',team:0}];
 const m=makeMatch({id:'raid-trio',mode:'raid',limit:15,players:crew,now:1000});
 assert.equal(m.rule.totalBosses,3);
 assert.equal(m.end,901000);
 const advance=when=>advanceMode(m,when,.05,{finish:(game,winner,reason)=>{game.result={winner,reason}},
   spawn:()=>{},move:()=>{}});
 assert.equal(ruleView(m,null,1000).boss.name,'The Rift Crown');
 m.rule.boss.hp=0;advance(2000);assert.equal(m.rule.boss.name,'Abyss Leviathan');
 assert.equal(m.rule.boss.attack,'tidal surge');
 m.rule.boss.hp=0;advance(3000);assert.equal(m.rule.boss.name,'Inferno Warden');
 assert.equal(m.rule.boss.attack,'eruption');
 m.rule.boss.hp=0;advance(4000);
 assert.equal(m.result.winner,0);assert.equal(m.score[0],100);
});

test('live Clan War room rejects outsiders and tampered team selection',()=>{
 const out=[],clients=new Map([1,2,3].map(id=>[id,{id}]));
 const clans=new Map([[1,{clan:10}],[2,{clan:20}]]),users=[
  {id:1,name:'Alpha'},{id:2,name:'Beta'},{id:3,name:'Outsider'}];
 const error=(status,message)=>Object.assign(new Error(message),{status});
 const svc=createOverdrive({client:id=>clients.get(id),send:(client,data)=>out.push({id:client?.id,...data}),
   store:{settle:()=>({}),muted:()=>false},fail:error,allowed:()=>true,leaveLegacy:()=>{},cleanChat:s=>s,
   clanOf:id=>clans.get(id)||null,clock:()=>1000});
 try{
  svc.packet(clients.get(1),users[0],{type:'z2:create',mode:'clanwar',size:1,limit:10});
  const code=out.find(x=>x.type==='z2:lobby'&&x.id===1)?.code;
  assert.ok(code,'verified leader can create a Clan War lobby');
  assert.throws(()=>svc.packet(clients.get(3),users[2],{type:'z2:join',code}),{status:403});
  svc.packet(clients.get(2),users[1],{type:'z2:join',code});
  assert.throws(()=>svc.packet(clients.get(2),users[1],{type:'z2:team',team:0}),{status:409});
  svc.packet(clients.get(1),users[0],{type:'z2:start'});
  const begin=out.find(x=>x.type==='z2:begin'&&x.id===1);
  assert.deepEqual(begin?.clanWar?.clans,[10,20]);
 }finally{svc.close();}
});
