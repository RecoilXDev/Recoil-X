import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createAProgression,SEASON_START,SEASON_END} from '../server/a-progression.mjs';
test('season ranks by kills, awards exactly one permanent recolor per eligible participant and locks after close',()=>{
 const db=new DatabaseSync(':memory:');
 db.exec("CREATE TABLE users(id INTEGER PRIMARY KEY,name TEXT,banned INTEGER);INSERT INTO users VALUES(1,'A',0),(2,'B',0),(3,'C',0),(4,'D',0),(5,'E',0),(6,'F',1),(7,'G',0)");
 let now=SEASON_START-1;const p=createAProgression(db,{clock:()=>now});
 const result={id:'before',mode:'arena',reason:'score',duration:60000,winner:0,players:[{id:1,team:0,inputs:40,kills:100,deaths:1}]};
 p.settle(result);assert.equal(p.killsBoard({id:1}).personal,null);
 now=SEASON_START+60000;
 const players=[{id:1,kills:30},{id:2,kills:50},{id:3,kills:40},{id:4,kills:2},{id:5,kills:0},{id:6,kills:100},{id:7,kills:900,inputs:0}].map(x=>({team:0,inputs:40,deaths:2,...x}));
 const match={...result,id:'round',players};
 p.settle(match);p.settle(match);
 p.settle({...match,id:'raid',mode:'raid'});
 p.settle({...match,id:'forfeit',reason:'forfeit'});
 const live=p.killsBoard({id:1});assert.deepEqual(live.players.map(r=>[r.kills,r.tier]),[[50,'gold'],[40,'silver'],[30,'bronze'],[2,'blue'],[0,'blue']]);
 assert.equal(live.players[0].name,'Private player');assert.equal(live.personal.rank,3);
 assert.equal(p.reward({id:1}),null);assert.throws(()=>p.equipReward({id:1},true),{status:403});
 now=SEASON_END;
 assert.equal(p.finalize(),true);assert.equal(p.finalize(),false);
 for(const [id,tier] of [[1,'bronze'],[2,'gold'],[3,'silver'],[4,'blue'],[5,'blue']]){
   const r=p.reward({id});assert.equal(r.tier,tier);assert.equal(r.base,'Sandwyrm');
 }
 assert.equal(p.reward({id:6}),null);assert.equal(p.reward({id:7}),null);
 assert.equal(p.equipReward({id:2},true).equipped,true);
 p.settle({...match,id:'late'});assert.equal(p.reward({id:2}).kills,50);
 const restarted=createAProgression(db,{clock:()=>now});assert.equal(restarted.reward({id:2}).equipped,true);
 assert.equal(restarted.killsBoard({id:1}).finalized,true);db.close();
});
test('ties use wins, then fewer deaths, then stable account ID',()=>{
 const db=new DatabaseSync(':memory:');db.exec("CREATE TABLE users(id INTEGER PRIMARY KEY,name TEXT,banned INTEGER);INSERT INTO users VALUES(1,'A',0),(2,'B',0),(3,'C',0),(4,'D',0)");
 const p=createAProgression(db,{clock:()=>SEASON_START+100000});
 p.settle({id:'tie',mode:'arena',winner:0,duration:60000,reason:'score',players:[
 {id:1,team:1,kills:10,deaths:0,inputs:50},{id:2,team:0,kills:10,deaths:3,inputs:50},{id:3,team:0,kills:10,deaths:1,inputs:50},{id:4,team:0,kills:10,deaths:1,inputs:50}]});
 assert.equal(p.killsBoard({id:3}).personal.rank,1);assert.equal(p.killsBoard({id:4}).personal.rank,2);assert.equal(p.killsBoard({id:2}).personal.rank,3);assert.equal(p.killsBoard({id:1}).personal.rank,4);db.close();
});
