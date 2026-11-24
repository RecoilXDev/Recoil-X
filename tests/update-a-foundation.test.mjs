import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createAccountSessions,createDeliveryPolicy,combatReport} from '../server/a-foundation.mjs';
import {makeMatch,inputMatch,updateMatch} from '../server/overdrive-match.mjs';

test('account session listing never exposes token hashes, revocation keeps the current session and other users',()=>{
 const db=new DatabaseSync(':memory:');
 db.exec("CREATE TABLE sessions(token_hash TEXT PRIMARY KEY,account INTEGER,expires INTEGER);INSERT INTO sessions VALUES('keep-secret',1,20000),('other-secret',1,30000),('expired-secret',1,500),('stranger-secret',2,30000)");
 const calls=[],svc=createAccountSessions(db,{clock:()=>1000,disconnect:(...args)=>calls.push(args)}),user={id:1,token_hash:'keep-secret'};
 const before=svc.view(user);
 assert.equal(before.active,2);assert.equal(before.sessions.filter(s=>s.current).length,1);
 assert(!JSON.stringify(before).includes('secret'));
 assert.deepEqual(svc.revokeOthers(user),{revoked:2,active:1});
 assert.deepEqual(calls,[[1,'keep-secret']]);
 assert.equal(db.prepare('SELECT count(*) n FROM sessions WHERE account=2').get().n,1);
 assert.equal(svc.revokeOthers(user).revoked,0);db.close();
});
test('standard state cadence is retained; economy and congestion skip replaceable snapshots before serialization',()=>{
 let now=1000;const svc=createDeliveryPolicy({clock:()=>now});
 const a={socket:{readyState:1},transport:{writableLength:0}},b={socket:{readyState:1},transport:{writableLength:0}};
 assert(svc.allowSnapshot(a));svc.sent(a,200);now+=100;
 assert(svc.allowSnapshot(a));svc.sent(a,200);svc.setProfile(a,'economy');
 now+=100;assert(!svc.allowSnapshot(a));assert(svc.allowSnapshot(b));
 now+=100;assert(svc.allowSnapshot(a));svc.sent(a,100);
 a.transport.writableNeedDrain=true;now+=250;assert(!svc.allowSnapshot(a));
 assert.deepEqual([svc.view(a).snapshotsSent,svc.view(a).snapshotsSkipped,svc.view(a).stateBytes],[3,2,500]);
 assert.equal(svc.view(b).profile,'standard');assert.equal(svc.view(null).connected,false);
 assert.throws(()=>svc.setProfile(a,'unlimited'),{status:400});
});
test('combat metrics count only server-fired projectiles and damage-confirmed hits',()=>{
 const m=makeMatch({id:'a-combat',mode:'arena',now:1000,limit:50,rng:()=>.5,players:[{id:1,name:'A',team:0,aCombat:[{hits:999}]},{id:2,name:'B',team:1}]});
 const p=m.players.get(1),v=m.players.get(2);
 Object.assign(p,{x:0,z:-4,readyShot:0});Object.assign(v,{x:0,z:4,shieldUntil:0});
 const controls={f:0,s:0,yaw:Math.PI,pitch:0,weapon:0,fire:true};
 assert.equal(inputMatch(m,1,{...controls,seq:1,hits:999},1100),true);
 updateMatch(m,1150);
 const report=combatReport(p.aCombat);
 assert.deepEqual(report[0],{weapon:0,triggers:1,projectiles:1,hits:1,damage:22,accuracy:100});
 assert.equal(report[1].accuracy,null);
 assert.equal(combatReport(v.aCombat)[0].hits,0);
 const hit=m.events.find(e=>e.type==='z2:hit-confirm');assert.deepEqual(hit,{type:'z2:hit-confirm',only:1,id:m.id,hits:1,damage:22});
});
