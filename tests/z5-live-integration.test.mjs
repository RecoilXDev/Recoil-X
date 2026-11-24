import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createZ5Expansion} from '../server/z5-expansion.mjs';
function fixture(){
 const db=new DatabaseSync(':memory:');
 db.exec("PRAGMA foreign_keys=ON;CREATE TABLE users(id INTEGER PRIMARY KEY,name TEXT,handle TEXT,admin INTEGER,salt TEXT,secret TEXT);CREATE TABLE sessions(token_hash TEXT PRIMARY KEY,account INTEGER,expires INTEGER);INSERT INTO users(id,name,handle,admin) VALUES(1,'Alpha','alpha',1),(2,'Beta','beta',0),(3,'Gamma','gamma',0)");
 const users=new Map([[1,{id:1,name:'Alpha',admin:1}],[2,{id:2,name:'Beta',admin:0}],[3,{id:3,name:'Gamma',admin:0}]]);
 let now=1000;const clients=new Map([[1,{id:1}],[2,{id:2}],[3,{id:3}]]);
 const posted=[],room={code:'P12345',matchId:'m1',host:1,phase:'playing',mode:'arena'};
 const overdrive={roomInfo:id=>id===1?room:null,inRoom:()=>false,packet:(c,u,d)=>posted.push({c:c.id,u:u.id,d}),drop:()=>{}};
 const errors=[];const fail=(status,message)=>Object.assign(Error(message),{status});
 const x=createZ5Expansion({db,fail,allowed:()=>true,clients,isFriend:(a,b)=>a===1&&b===2,
  contact:(u,name)=>users.get(name==='Beta'?2:3),overdrive,byId:{get:id=>users.get(id)},
  byName:{get:name=>[...users.values()].find(u=>u.name.toLowerCase()===name)},
  canonical:value=>String(value||'').trim().toLowerCase(),
  passwordHash:async()=> 'new-secure-hash',send:()=>{},cutConnection:()=>{},
  clock:()=>now});
 return {db,x,users,posted,clock:n=>now=n,errors};
}
test('Z5 party invites only accepted friends and assembles an existing squad',()=>{
 const f=fixture(),alpha=f.users.get(1),beta=f.users.get(2);
 assert.equal(f.x.post(alpha,'/z5/party',{action:'create'}).party.members.length,1);
 assert.throws(()=>f.x.post(alpha,'/z5/party',{action:'invite',name:'Gamma'}),{status:403});
 f.x.post(alpha,'/z5/party',{action:'invite',name:'Beta'});
 assert.ok(f.x.get(beta,'/z5/party').invited);
 assert.equal(f.x.post(beta,'/z5/party',{action:'accept'}).party.members.length,2);
 const result=f.x.post(alpha,'/z5/party',{action:'queue'});
 assert.equal(result.code,'P12345');
 assert.equal(f.posted[0].d.type,'z2:create');
 assert.equal(f.posted[1].d.type,'z2:join');
 f.db.close();
});
test('Z5 weapon XP is awarded only on verified match settlement, at most once',()=>{
 const f=fixture(),alpha=f.users.get(1);
 f.x.onStart({matchId:'m1'});
 f.x.onInput(1,{weapon:3});
 f.x.onEnd('m1',{winner:0,reason:'score',players:[{id:1,team:0,kills:3,forfeited:false,inputs:20}]});
 const first=f.x.get(alpha,'/z5/evolutions').weapons;
 assert.equal(first.length,1);assert.equal(first[0].xp,175);
 f.x.onEnd('m1',{winner:0,reason:'score',players:[{id:1,team:0,kills:3,forfeited:false,inputs:20}]});
 assert.equal(f.x.get(alpha,'/z5/evolutions').weapons[0].xp,175);
 f.db.close();
});
test('recovery uses one-time server-side code hashes and revokes sessions',async()=>{
 const f=fixture(),alpha=f.users.get(1);
 const {code}=f.x.post(alpha,'/z5/recovery/create',{});
 assert.equal(code.length,64);
 f.db.prepare("INSERT INTO sessions VALUES('old-token',1,100000)").run();
 assert.equal((await f.x.reset({socket:{remoteAddress:'127.0.0.1'}},{name:'Alpha',code,password:'a-new-long-password'})).ok,true);
 assert.equal(f.db.prepare('SELECT count(*) AS total FROM sessions').get().total,0);
 assert.equal(f.db.prepare('SELECT code_hash FROM rx5_recovery WHERE player=1').get(),undefined);
 await assert.rejects(f.x.reset({socket:{remoteAddress:'127.0.0.1'}},{name:'Alpha',code,password:'a-new-long-password'}),{status:401});
 f.db.close();
});
test('broadcast is host-only, opt-in, delayed, and requires a joined spectator',()=>{
 const f=fixture(),alpha=f.users.get(1),beta=f.users.get(2);
 assert.throws(()=>f.x.post(beta,'/z5/spectate',{action:'enable'}),{status:403});
 f.x.post(alpha,'/z5/spectate',{action:'enable'});
 f.x.onFrame({matchId:'m1',now:1000,match:{players:new Map([[1,{id:1,x:1,z:2,jump:0,yaw:0,hp:100}] ]),score:[1,0],mode:'arena'},
  frame:{actors:[{own:[1,1,2,0,0,100,1,0]}]}});
 assert.throws(()=>f.x.get(beta,'/z5/spectate/frame',{url:'/rx-api/z5/spectate/frame?code=P12345'}));
 f.x.post(beta,'/z5/spectate',{action:'join',code:'P12345'});
 assert.equal(f.x.get(beta,'/z5/spectate/frame',{url:'/rx-api/z5/spectate/frame?code=P12345'}).frame,null);
 f.clock(11001);
 assert.equal(f.x.get(beta,'/z5/spectate/frame',{url:'/rx-api/z5/spectate/frame?code=P12345'}).frame.players.length,1);
 f.db.close();
});


test('concurrent recovery requests consume the same code at most once',async()=>{
 const f=fixture(),user=f.users.get(1),code=f.x.post(user,'/z5/recovery/create',{}).code;
 const req={socket:{remoteAddress:'127.0.0.1'}};
 const result=await Promise.allSettled([
  f.x.reset(req,{name:'Alpha',code,password:'first-long-password'}),
  f.x.reset(req,{name:'Alpha',code,password:'second-long-password'})
 ]);
 assert.equal(result.filter(r=>r.status==='fulfilled').length,1);
 assert.equal(result.filter(r=>r.status==='rejected'&&r.reason.status===401).length,1);
 assert.equal(f.db.prepare('SELECT count(*) n FROM rx5_recovery').get().n,0);
 f.db.close();
});
test('a code that expires while hashing is rejected inside the password write transaction',async()=>{
 const f=fixture(),user=f.users.get(1),code=f.x.post(user,'/z5/recovery/create',{}).code;
 const pending=f.x.reset({socket:{remoteAddress:'127.0.0.1'}},{name:'Alpha',code,password:'valid-long-password'});
 f.clock(1000+31*86400000);
 await assert.rejects(pending,{status:401});
 assert.equal(f.db.prepare('SELECT secret FROM users WHERE id=1').get().secret,null);
 f.db.close();
});
test('rejected input evidence persists, is throttled, bounded, and admin-only',()=>{
 const f=fixture(),a=f.users.get(1),b=f.users.get(2);
 f.x.onRejectedInput(2,'invalid-input',1000);
 f.x.onRejectedInput(2,'input-flood',1001);
 f.x.onRejectedInput(2,'untrusted label',7000);
 for(let i=0;i<110;i++)f.x.onRejectedInput(2,'input-flood',7000+i*6000);
 const request={url:'/rx-api/z5/anti-cheat/review?name=Beta'};
 assert.throws(()=>f.x.get(b,'/z5/anti-cheat/review',request),{status:403});
 const report=f.x.get(a,'/z5/anti-cheat/review',request);
 assert.equal(report.rejectedInputs.length,100);
 assert.ok(report.rejectedInputs.every(row=>row.kind==='input-flood'));
 assert.match(report.notice,/no automatic bans/);
 f.db.close();
});
test('invalid weapon indices and no-winner matches cannot award mastery XP',()=>{
 const f=fixture(),a=f.users.get(1);
 f.x.onStart({matchId:'m1'});
 f.x.onInput(1,{weapon:30});
 f.x.onEnd('m1',{winner:0,reason:'score',players:[{id:1,team:0,kills:3,inputs:20}]});
 assert.equal(f.x.get(a,'/z5/evolutions').weapons.length,0);
 f.x.onStart({matchId:'m1'});
 f.x.onInput(1,{weapon:0});
 f.x.onEnd('m1',{winner:null,reason:'abandoned',players:[{id:1,team:0,kills:3,inputs:20}]});
 assert.equal(f.x.get(a,'/z5/evolutions').weapons.length,0);
 f.db.close();
});
