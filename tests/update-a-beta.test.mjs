import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createServerShield} from '../server/a-server-shield.mjs';
import {createAProgression,SEASON_START,SEASON_END} from '../server/a-progression.mjs';
test('maintenance and memory pressure suspend offers without losing queue place',()=>{
 const db=new DatabaseSync(':memory:');let now=0,ram=0;
 try{const shield=createServerShield(db,{clock:()=>now,memory:()=>ram,maxRss:1024,maxPlayers:1});
 const player={id:1},admin={id:2,admin:true};
 assert.equal(shield.queueStatus(player,0,true).ready,true);
 shield.setMaintenance(admin,true);assert.equal(shield.queueStatus(player,0).ready,false);
 now=25000;assert.equal(shield.queueStatus(player,0,true).position,1);
 shield.setMaintenance(admin,false);assert.equal(shield.queueStatus(player,0).ready,true);
 ram=1024;assert.equal(shield.queueStatus(player,0).ready,false);
 assert.throws(()=>shield.reserveUpgrade(),e=>e.status===503);
 ram=0;assert.equal(shield.queueStatus(player,0).ready,true);
 }finally{db.close();}
});
test('Season Pass rewards require eligible XP, dates and idempotent claims',()=>{
 const db=new DatabaseSync(':memory:');let now=SEASON_START-1;
 try{db.exec('CREATE TABLE users(id INTEGER PRIMARY KEY,name TEXT,banned INTEGER DEFAULT 0); INSERT INTO users(id,name) VALUES(1,\'Tester\');');
 const p=createAProgression(db,{clock:()=>now}),u={id:1};
 assert.throws(()=>p.claimPass(u,1),e=>e.status===403);
 now=SEASON_START;assert.throws(()=>p.claimPass(u,1),e=>e.status===403);
 p.settle({id:'test-match',winner:0,duration:60000,mode:'team',players:[{id:1,team:0,kills:0,deaths:0,inputs:25}]},now);
 assert.equal(p.claimPass(u,1).rewards[0].claimed,true);
 assert.equal(p.claimPass(u,1).rewards[0].claimed,true);
 assert.equal(db.prepare('SELECT COUNT(*) n FROM rx_a_pass_claim').get().n,1);
 now=SEASON_END;assert.throws(()=>p.claimPass(u,1),e=>e.status===403);
 }finally{db.close();}
});
