import assert from 'node:assert/strict';
import {test} from 'node:test';
import {DatabaseSync} from 'node:sqlite';
import {createZ5Operations} from '../server/z5-operations.mjs';
import {createOverdrive} from '../server/overdrive.mjs';
const ID='00000000-0000-4000-8000-000000000001';
function database(){
 const db=new DatabaseSync(':memory:');
 db.exec('CREATE TABLE users(id INTEGER PRIMARY KEY,name TEXT,admin INTEGER,banned INTEGER)');
 db.exec("INSERT INTO users VALUES(1,'Alpha',1,0),(2,'Beta',0,0),(3,'Gamma',0,0)");
 db.exec('CREATE TABLE rx2_results(id TEXT PRIMARY KEY, season TEXT,mode TEXT NOT NULL,result TEXT NOT NULL,finished INTEGER NOT NULL)');
 const result={id:ID,mode:'arena',reason:'score',winner:0,score:[5,3],mvp:'Alpha',duration:90000,field:'Overdrive Arena',
 players:[{id:1,name:'Alpha',team:0,kills:5,deaths:1,damage:200},{id:2,name:'Beta',team:1,kills:3,deaths:2,damage:120}],
 timeline:[{at:0,kind:'start',text:'Match started'},{at:22000,kind:'elimination',text:'Alpha eliminated Beta'}]};
 db.prepare('INSERT INTO rx2_results VALUES(?,?,?,?,?)').run(ID,null,'arena',JSON.stringify(result),Date.parse('2026-11-20T00:00:00Z'));
 return db;
}
test('recap history is private, match scores are real and replay is explicitly event-only',()=>{
 const db=database(),service=createZ5Operations(db);
 const own=service.recent({id:1}),other=service.recent({id:2}),stranger=service.recent({id:3});
 assert.equal(own.matches.length,1);
 assert.equal(other.matches.length,1);
 assert.equal(stranger.matches.length,0);
 assert.equal(own.matches[0].score[0],5);
 assert.equal(own.matches[0].players[0].name,'Alpha');
 const detailed=service.details({id:1},ID);
 assert.equal(detailed.timeline.length,2);
 assert.equal(detailed.replayKind,'event-timeline');
 assert.throws(()=>service.details({id:3},ID),{status:404});
 assert.throws(()=>service.details({id:1},'../something'),{status:400});
 db.close();
});
test('operations health is administrator-only and omits sensitive data',()=>{
 const db=database(),svc=createZ5Operations(db,{clock:()=>42,online:()=>2,
   roomStats:()=>({rooms:3,activeMatches:1,queuedPlayers:2}),uptime:()=>70,memory:()=>({rss:20971520,heapUsed:4194304})});
 assert.throws(()=>svc.health({id:2,admin:false}),{status:403});
 const h=svc.health({id:1,admin:1});
 assert.equal(h.rssMB,20);assert.equal(h.online,2);assert.equal(h.rooms,3);assert.equal(h.uptimeSeconds,70);
 assert.equal(h.completedMatches,1);
 assert.equal(Object.hasOwn(h,'token'),false);
 assert.equal(svc.diagnostics().packetLoss,'Not directly observable using the WebSocket transport');
 db.close();
});
test('public room browser never lists private, ranked, locked, or nonjoinable rooms',()=>{
 const connections=new Map([[1,{id:1}],[2,{id:2}],[3,{id:3}]]);
 const errors=[],fail=(status,message)=>Object.assign(Error(message),{status});
 const overdrive=createOverdrive({client:id=>connections.get(id),send:()=>{},store:{},
   fail,allowed:()=>true,leaveLegacy:()=>{},cleanChat:s=>s,
   onError:error=>errors.push(error),clock:()=>100000});
 try{
   const send=(id,data)=>overdrive.packet(connections.get(id),{id,name:['','Alpha','Beta','Gamma'][id]},data);
   send(1,{type:'z2:create',mode:'arena',size:1,limit:10});
   assert.equal(overdrive.browse().length,1);
   assert.match(overdrive.browse()[0].code,/^[2-9A-Z]{6}$/);
   assert.equal(overdrive.browse({mode:'raid'}).length,0);
   send(2,{type:'z2:create',mode:'arena',size:1,password:'abcd',limit:10});
   assert.equal(overdrive.browse().length,1);
   assert.equal(overdrive.statistics().rooms,2);
   assert.deepEqual(errors,[]);
 }finally{overdrive.close()}
});