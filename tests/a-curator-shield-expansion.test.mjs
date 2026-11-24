import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createServerShield} from '../server/a-server-shield.mjs';
import {createCurator} from '../server/a-curator.mjs';
import {createCuratorRooms} from '../server/a-curator-rooms.mjs';
const fail=(status,message)=>Object.assign(new Error(message),{status});
const project={name:'Arena',mode:'collect',seconds:60,objects:[{type:'spawn',x:0,z:0},{type:'target',x:1,z:0},{type:'wall',x:0,z:1}]};
test('FIFO admission, expiring offers, no queue bypass',()=>{
 const db=new DatabaseSync(':memory:');let now=0;
 try{const s=createServerShield(db,{clock:()=>now,memory:()=>0,maxPlayers:1,offerTtl:20000});
 const a={id:1},b={id:2};assert.equal(s.queueStatus(a,1,true).position,1);assert.equal(s.queueStatus(b,1,true).position,2);
 assert.equal(s.queueStatus(a,0).ready,true);
 assert.throws(()=>s.admission(0,false,false,b.id),e=>e.status===503);
 now=20001;assert.equal(s.queueStatus(b,0).ready,true);s.admission(0,false,false,b.id);
 assert.equal(s.status(1).waiting,0);
 }finally{db.close();}
});
test('public discovery requires approval of current saved version',()=>{
 const db=new DatabaseSync(':memory:');try{db.exec('PRAGMA foreign_keys=ON; CREATE TABLE users(id INTEGER PRIMARY KEY,banned INTEGER DEFAULT 0); INSERT INTO users(id) VALUES(1),(2);');
 const c=createCurator(db,fail),u={id:1},admin={id:2,admin:true};
 const p=c.save(u,project).project;c.share(u,{id:p.id,published:true});c.submit(u,{id:p.id});
 assert.equal(c.discover().projects.length,0);assert.throws(()=>c.pending(u),e=>e.status===403);
 assert.throws(()=>c.moderate(u,{id:p.id,updated:p.updated,state:'approved',reason:''}),e=>e.status===403);
 c.moderate(admin,{id:p.id,updated:p.updated,state:'approved',reason:''});assert.equal(c.discover().projects.length,1);
 c.save(u,{...project,id:p.id});assert.equal(c.discover().projects.length,0);
 }finally{db.close();}
});
test('co-op movement, shared objectives and room privacy',()=>{
 let now=0;const r=createCuratorRooms(fail,{clock:()=>now}),a={id:1,name:'A'},b={id:2,name:'B'},c={id:3,name:'C'};
 const d=r.create(a,project);r.join(b,d.code);assert.equal(r.state(a).players.length,2);
 assert.throws(()=>r.state(c),e=>e.status===404);assert.throws(()=>r.move(a,{dx:3,dz:0}),e=>e.status===400);
 assert.equal(r.move(a,{dx:0,dz:1}).players[0].z,0);now=400;
 assert.equal(r.move(a,{dx:1,dz:0}).result,'All targets collected');assert.equal(r.state(b).found.length,1);
 r.leave(a);r.leave(b);assert.throws(()=>r.state(b),e=>e.status===404);
});

test('validated target bonus and hazard respawn are applied once',()=>{
 let now=0;const r=createCuratorRooms(fail,{clock:()=>now}),u={id:1,name:'A'};
 const p={...project,mode:'explore',rules:{hazard:'respawn',targetBonus:10},objects:[...project.objects,{type:'hazard',x:2,z:0}]};
 const d=r.create(u,p);assert.equal(r.move(u,{dx:1,dz:0}).ends,d.ends+10000);
 now=400;assert.equal(r.move(u,{dx:1,dz:0}).players[0].x,0);
 now=800;assert.equal(r.move(u,{dx:1,dz:0}).ends,d.ends+10000);
});

test('HTTP admission bounds concurrent game API calls and releases idempotently',()=>{
 const db=new DatabaseSync(':memory:');
 try{
  assert.throws(()=>createServerShield(db,{maxHttp:0}),/Invalid Server Shield limits/);
  const shield=createServerShield(db,{maxHttp:2,memory:()=>0});
  const first=shield.reserveHttp(),second=shield.reserveHttp();
  assert.equal(shield.status(0).httpJobs,2);
  assert.equal(shield.status(0).httpLimit,2);
  assert.throws(()=>shield.reserveHttp(),{status:503});
  first();first();assert.equal(shield.status(0).httpJobs,1);
  const third=shield.reserveHttp();third();second();
  assert.equal(shield.status(0).httpJobs,0);
  assert.equal(shield.inspect({id:1,admin:true},0).denied,1);
 }finally{db.close();}
});
