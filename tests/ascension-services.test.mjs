import assert from 'node:assert/strict';
import {test} from 'node:test';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';
import {mkdtempSync,readdirSync,rmSync,copyFileSync,statSync,utimesSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {setTimeout as wait} from 'node:timers/promises';
import {DatabaseSync} from 'node:sqlite';
import {migrateAscension,ascensionStore} from '../server/ascension-store.mjs';
import {migrateOverdrive,overdriveStore} from '../server/overdrive-store.mjs';
import {createOverdrive} from '../server/overdrive.mjs';
import {wireSnapshot,delivered,compatibleGroups,movementSignal,checkTravel} from '../server/ascension-network.mjs';
import {verifiedBackup,backupSchedule} from '../server/ascension-backup.mjs';
import {createRecoilServer} from '../server/server.mjs';

const start=Date.UTC(2026,10,20,10),fault=(status,message)=>Object.assign(Error(message),{status});
function makeDb(t){
  const db=new DatabaseSync(':memory:');t.after(()=>db.close());
  db.exec("CREATE TABLE users(id INTEGER PRIMARY KEY,handle TEXT,name TEXT,admin INTEGER DEFAULT 0,banned INTEGER DEFAULT 0);");
  for(let id=1;id<=8;id++)db.prepare('INSERT INTO users(id,handle,name) VALUES(?,?,?)').run(id,'user'+id,'User'+id);
  migrateOverdrive(db,':memory:',false);migrateAscension(db);migrateAscension(db);
  const asc=ascensionStore(db,fault),matches=overdriveStore(db,fault,asc);
  return {db,asc,matches,act:(id,action,b={})=>asc.social({id},{action,...b},start)};
}
function result(a=1,b=2,weapon=0,kills=3){
  function stats(id,team,n,opp){const weaponKills=[0,0,0,0];weaponKills[weapon]=n;
    return {id,team,name:'User'+id,damage:n*50,kills:n,deaths:0,hits:n,shots:n,inputs:14,forfeited:false,
      earned:{opponents:n?{[opp]:n}:{},opponentWeapons:n?{[opp]:weaponKills}:{},weaponKills,bank:0,bounty:n,vault:false,race:null}};}
  return {id:randomUUID(),field:'Beacon Citadel',mode:'bounty',duration:50000,season:null,winner:0,reason:'score',
    score:[kills,0],mvp:'User'+a,players:[stats(a,0,kills,b),stats(b,1,0,a)],timeline:[]};
}
function lobby(t){
  const clients=new Map(Array.from({length:10},(_,i)=>[i+1,{id:i+1,name:'User'+(i+1)}])),messages=new Map();
  const od=createOverdrive({client:id=>clients.get(id),send:(c,e)=>{if(c){if(!messages.has(c.id))messages.set(c.id,[]);messages.get(c.id).push(e);}},
    store:{rating:()=>({points:500}),muted:()=>false,settle:()=>({})},fail:fault,allowed:()=>true,leaveLegacy(){},cleanChat:x=>x,clock:()=>start});
  t.after(()=>od.close());return {send:(id,type,params={})=>od.packet(clients.get(id),clients.get(id),{type:'z2:'+type,...params}),
    last:(id,type)=>messages.get(id)?.findLast(p=>p.type==='z2:'+type)};
}
test('A16 mastery credits server results once per match and only to the earned weapon',t=>{
  const {asc,matches}=makeDb(t),r=result(1,2,3,3);
  matches.settle(r,start);matches.settle(r,start);assert.deepEqual(asc.profile(1,start).mastery,[{weapon:3,kills:3,tier:1}]);
  assert.deepEqual(asc.profile(2,start).mastery,[]);
});
test('A20 earned evolution tiers persist at 3, 10 and 25 credited eliminations',t=>{
  const {db,asc,matches}=makeDb(t);
  for(let i=0;i<9;i++){matches.settle(result(1,2,2,3),start+i*601000);assert.equal(asc.profile(1,start).mastery[0].tier,i<3?1:i<8?2:3);}
  assert.equal(ascensionStore(db,fault).profile(1,start).mastery[0].tier,3);
});
test('A21 clans enforce invites, unique names, emblem, roles and earned achievements',t=>{
  const {act}=makeDb(t);const captain=act(1,'found',{name:'Orion',emblem:'falcon'});const id=captain.clan.clan;
  assert.throws(()=>act(3,'found',{name:'orion',emblem:'wave'}),{status:409});
  for(const uid of [2,3]){act(1,'invite',{name:'User'+uid});act(uid,'accept',{clan:id});}
  assert.throws(()=>act(2,'invite',{name:'User4'}),{status:403});
  const p=act(1,'promote',{name:'User2'});assert.deepEqual(p.clan.achievements,['Three strong']);
  assert.equal(p.clan.roster.find(r=>r.name==='User2').role,'officer');
  act(1,'transfer',{name:'User2'});assert.equal(act(1,'leave').clan,null);
});
test('A22 war registration checks roster, start time, finished result and standings',t=>{
  const {act,asc,matches}=makeDb(t);act(1,'found',{name:'North',emblem:'crown'});act(2,'found',{name:'South',emblem:'wave'});
  const war=act(1,'war',{name:'South',starts:start+1000}).clan.wars[0].id;act(2,'accept-war',{war});
  assert.equal(asc.warTeam(war,3,start),-1);const r=result();r.war=war;
  assert.throws(()=>asc.startWar(war,r.id,r.players,start),{status:409});
  asc.startWar(war,r.id,r.players,start+1000);matches.settle(r,start+60000);matches.settle(r,start+60000);
  const p=asc.profile(1,start+60000);assert.equal(p.clan.wins,1);assert.equal(p.board.clanLeaders[0].name,'North');
});
test('A23 rivalry records wins without a kill, caps repeat opponents and expires duel invites',t=>{
  const {asc,matches}=makeDb(t);matches.settle(result(),start);matches.settle(result(),start+3000);
  const rival=asc.profile(1,start).rivals[0];assert.equal(rival.kills,3);assert.equal(rival.wins,1);
  assert.equal(asc.profile(2,start).rivals[0].kills,0);asc.matchCode(1,'User2','ABCDEF',start);
  assert.equal(asc.profile(2,start).duels[0].code,'ABCDEF');assert.equal(asc.profile(2,start+600001).duels.length,0);
});
test('A25 two captains draft six players in balanced order and lock both ready rosters',t=>{
  const {send,last}=lobby(t);send(1,'create',{mode:'flags',size:3,rules:{draft:true}});
  const code=last(1,'lobby').code;for(const id of [2,3,4,5,6])send(id,'join',{code});send(1,'captains');
  assert.throws(()=>send(2,'pick',{id:3}),{status:403});for(const [captain,id] of [[1,3],[2,4],[2,5],[1,6]])send(captain,'pick',{id});
  assert.throws(()=>send(1,'start'),{status:409});for(let i=1;i<=6;i++)send(i,'draft-ready',{ready:true});send(1,'start');
  assert.deepEqual(last(1,'begin').roster.filter(p=>p.team===0).map(p=>p.id),[1,3,6]);assert(last(6,'begin').id===last(1,'begin').id);
});
test('A28 server browser lists real slots, filters modes and excludes private and locked rooms',t=>{
  const {send,last}=lobby(t);send(1,'create',{mode:'flags',size:2,listed:true});
  const code=last(1,'lobby').code;send(2,'join',{code});
  send(3,'create',{mode:'payload',size:1,password:'test-only',listed:true});send(4,'rooms');
  const listing=last(4,'rooms').list;assert.equal(listing.length,1);assert.equal(listing[0].players,2);assert.equal(listing[0].slots,2);
  send(4,'rooms',{mode:'race'});assert.equal(last(4,'rooms').list.length,0);
  send(1,'lock',{locked:true});send(4,'rooms');assert.equal(last(4,'rooms').list.length,0);
});
test('A30 server day rolls over at Oman midnight and claims are unique per account',t=>{
  const {asc,matches}=makeDb(t);const before=start+9*3600000;
  assert.throws(()=>asc.social({id:1},{action:'claim'},before),{status:409});
  const goal=asc.profile(1,before).board.matchesGoal;for(let i=0;i<goal;i++)matches.settle(result(1,i+2),before+i*20000);
  const p=asc.social({id:1},{action:'claim'},before+70000);assert(p.board.claimed);assert.equal(p.board.completed,goal);
  assert.throws(()=>asc.social({id:1},{action:'claim'},before+71000),{status:409});
  assert.equal(asc.profile(1,before+3600000).board.completed,0);assert.notDeepEqual([p.board.matchesGoal,p.board.killsGoal],[asc.profile(1,before+3600000).board.matchesGoal,asc.profile(1,before+3600000).board.killsGoal]);
});
test('A40 shared weekend damage and rewards survive a store restart and repeated settlement',t=>{
  const {asc,matches,db}=makeDb(t),r=result();r.mode='worldboss';r.reason='cooperative victory';
  for(const p of r.players){p.team=0;p.damage=3000;}matches.settle(r,start);matches.settle(r,start);
  const p=asc.profile(1,start);assert.equal(p.board.raid,6000);assert(p.marks>=25);
  assert.equal(ascensionStore(db,fault).profile(2,start+86400000).board.raid,6000);
});
test('A42 implausible movement raises a throttled review entry without banning the account',t=>{
  const {db,asc}=makeDb(t),score={};
  for(let i=0;i<6;i++)if(movementSignal({type:'z2:input',f:1.2,s:0},score,start+i))asc.review(1,'Movement input',start+i);
  assert.equal(asc.alerts().length,1);assert.equal(db.prepare('SELECT banned FROM users WHERE id=1').get().banned,0);
  assert(!movementSignal({type:'z2:input',f:1,s:0},score,start+11000));
  const player={x:0,z:0,spawnSeq:1,hp:100,asc:{}};checkTravel(player,start);player.x=.3;assert(!checkTravel(player,start+50));
  for(let i=1;i<=3;i++){player.x=6;assert.equal(checkTravel(player,start+50+i*50),i===3);assert.equal(player.x,.3);}
  player.spawnSeq++;player.z=-23;assert(!checkTravel(player,start+300));assert.equal(player.z,-23);
});
test('A43 deltas reference a delivered keyframe, omit unchanged players and periodically resynchronize',t=>{
  const c={deltaState:true},rows=Array.from({length:10},(_,i)=>[i,80,54,29,30,10,1,9,6]);
  const packet={id:'wire',t:start,rows};const full=wireSnapshot(c,packet);assert(!full.base);delivered(c,full);
  const update={...packet,t:start+150,rows:rows.slice(1)};update.rows[0]=[1,78];
  const delta=wireSnapshot(c,update);assert.equal(delta.base,full.frame);assert.equal(delta.rows.length,1);assert.deepEqual(delta.gone,[0]);
  assert(JSON.stringify(delta).length<JSON.stringify(update).length);
  const refreshed=wireSnapshot(c,{...update,t:start+1200});assert(!refreshed.base);
  assert.equal(wireSnapshot({},packet),packet);t.diagnostic('10-row synthetic full '+Buffer.byteLength(JSON.stringify(full))+' B, one changed row plus removal '+Buffer.byteLength(JSON.stringify(delta))+' B');
});
test('A45 scheduled private SQLite backups verify integrity, retain copies and restore to a fresh path',async t=>{
  const folder=mkdtempSync(join(tmpdir(),'recoil-restore-')),file=join(folder,'accounts.sqlite'),directory=join(folder,'private');
  const db=new DatabaseSync(file);let timer;
  try{
    db.exec("PRAGMA journal_mode=WAL; CREATE TABLE users(id INTEGER PRIMARY KEY,name TEXT); INSERT INTO users VALUES(1,'Original')");
    const old=verifiedBackup(file,{directory,reason:'migration',now:start});assert.equal(statSync(old.path).mode&0o777,0o600);
    db.exec("UPDATE users SET name='Current'");
    for(let i=0;i<3;i++)verifiedBackup(file,{directory,keep:2,now:start+i+1});
    assert.equal(readdirSync(directory).length,3);assert.throws(()=>verifiedBackup(file,{directory:join(folder,'www','copies')}));
    const restored=join(folder,'rehearsal.sqlite');copyFileSync(old.path,restored);
    const check=new DatabaseSync(restored,{readOnly:true});try{assert.equal(check.prepare('PRAGMA integrity_check').get().integrity_check,'ok');assert.equal(check.prepare('SELECT name FROM users').get().name,'Original');}finally{check.close();}
    assert.equal(db.prepare('SELECT name FROM users').get().name,'Current');
    timer=backupSchedule(file,{directory,keep:2,hours:24});timer.start();
    for(let i=0;i<100&&timer.status.state==='running';i++)await wait(25);
    assert.equal(timer.status.state,'ok');assert.equal(readdirSync(directory).length,3);t.diagnostic('Verified WAL restore, private file and directory modes, daily retention and separate backup worker.');
  }finally{timer?.close();db.close();rmSync(folder,{force:true,recursive:true});}
});
const realTimeout=globalThis.setTimeout;
async function waitForVerifiedBackup(schedule){
  const deadline=performance.now()+10000;
  while(schedule.status.state==='running'&&performance.now()<deadline)
    await new Promise(resolve=>realTimeout(resolve,10));
  assert.equal(schedule.status.state,'ok');
}
test('A45 a restarted backup schedule keeps one hourly cadence after its first due snapshot',async t=>{
  const folder=mkdtempSync(join(tmpdir(),'recoil-backup-cadence-'));
  const file=join(folder,'game.sqlite'),directory=join(folder,'private');
  const db=new DatabaseSync(file);
  const hour=3600000,boot=Math.floor(Date.now()/1000)*1000;
  let schedule;
  try{
    db.exec('CREATE TABLE users(id INTEGER PRIMARY KEY)');
    const prior=verifiedBackup(file,{directory});
    const created=new Date(boot-hour/2);
    utimesSync(prior.path,created,created);
    t.mock.timers.enable({apis:['setTimeout','setInterval','Date'],now:boot});
    schedule=backupSchedule(file,{directory,hours:1});
    t.mock.timers.tick(hour/2-1);
    assert.equal(schedule.status.state,'idle');
    t.mock.timers.tick(1);
    assert.equal(schedule.status.state,'running');
    await waitForVerifiedBackup(schedule);
    t.mock.timers.tick(hour/2);
    assert.equal(schedule.status.state,'ok','restart time must not trigger an extra snapshot');
    t.mock.timers.tick(hour/2-1);
    assert.equal(schedule.status.state,'ok');
    t.mock.timers.tick(1);
    assert.equal(schedule.status.state,'running','next snapshot is due one interval after the previous one');
    await waitForVerifiedBackup(schedule);
    assert.equal(readdirSync(directory).filter(name=>name.endsWith('-daily.sqlite')).length,3);
  }finally{
    schedule?.close();
    t.mock.timers.reset();
    db.close();
    rmSync(folder,{recursive:true,force:true});
  }
});
test('A45 a failed private backup retries automatically after storage becomes available',async t=>{
  const folder=mkdtempSync(join(tmpdir(),'recoil-backup-retry-'));
  const file=join(folder,'game.sqlite'),directory=join(folder,'private');
  const db=new DatabaseSync(file);
  let schedule;
  try{
    db.exec('CREATE TABLE users(id INTEGER PRIMARY KEY); INSERT INTO users VALUES (19)');
    writeFileSync(directory,'temporary storage fault');
    const errors=t.mock.method(console,'error',()=>{});
    t.mock.timers.enable({apis:['setTimeout'],now:Date.now()});
    schedule=backupSchedule(file,{directory,hours:24});
    assert.equal(schedule.status.state,'failed');
    assert.ok(schedule.status.failedAt);
    assert.equal(errors.mock.callCount(),1);
    rmSync(directory);
    t.mock.timers.tick(3600000-1);
    assert.equal(schedule.status.state,'failed');
    t.mock.timers.tick(1);
    assert.equal(schedule.status.state,'running');
    await waitForVerifiedBackup(schedule);
    assert.equal(schedule.status.failedAt,null);
    const saved=readdirSync(directory).filter(name=>name.endsWith('-daily.sqlite'));
    assert.equal(saved.length,1);
    const copy=new DatabaseSync(join(directory,saved[0]),{readOnly:true});
    try{assert.equal(copy.prepare('SELECT id FROM users').get().id,19);}finally{copy.close();}
  }finally{
    schedule?.close();
    t.mock.timers.reset();
    db.close();
    rmSync(folder,{recursive:true,force:true});
  }
});
test('A47 strict input groups admit matching cross-input players and keep mixed groups available',()=>{
  const entries=[['touch','touch'],['any','controller'],['any','touch'],['any','unknown']].map(([pref,device],i)=>({pref,device,id:i+1,since:i}));
  const groups=compatibleGroups(entries);assert.deepEqual(groups[0].map(x=>x.id),[1,3]);assert.deepEqual(groups.at(-1).map(x=>x.id),[2,3,4]);
});
async function accountServer(t){
  const folder=mkdtempSync(join(tmpdir(),'recoil-asc-accounts-')),file=join(folder,'data.sqlite');
  const server=createRecoilServer({database:file,backups:{directory:join(folder,'private')}});server.listen(0,'127.0.0.1');await once(server,'listening');
  t.after(async()=>{await new Promise(r=>server.close(r));rmSync(folder,{recursive:true,force:true});});
  const api=async(path,b,token)=>{const res=await fetch('http://127.0.0.1:'+server.address().port+'/rx-api'+path,{method:b?'POST':'GET',
    headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:b?JSON.stringify(b):undefined});return {s:res.status,v:await res.json()};};
  return {file,api};
}
test('A45 unavailable private storage preserves signed-in play and blocks a pending schema migration',async t=>{
  const {file,api}=await accountServer(t);
  const {v:owner}=await api('/register',{name:'RestartPilot',password:'temporary-test-password'});
  assert.ok(owner.token);
  const root=mkdtempSync(join(tmpdir(),'recoil-backup-startup-'));
  const database=join(root,'copy.sqlite'),directory=join(root,'unavailable');
  let server;
  try{
    const source=verifiedBackup(file,{directory:join(root,'verified')});
    copyFileSync(source.path,database);
    writeFileSync(directory,'temporary storage fault');
    const errors=t.mock.method(console,'error',()=>{});
    server=createRecoilServer({database,backups:{directory}});
    server.listen(0,'127.0.0.1');await once(server,'listening');
    const response=await fetch('http://127.0.0.1:'+server.address().port+'/rx-api/me',{headers:{Authorization:'Bearer '+owner.token}});
    assert.equal(response.status,200);
    assert.equal((await response.json()).user.id,owner.user.id);
    assert.equal(errors.mock.callCount(),1);
    await new Promise(resolve=>server.close(resolve));server=null;

    const pending=new DatabaseSync(database);
    try{pending.exec('DROP TABLE asc_version');}finally{pending.close();}
    assert.throws(()=>createRecoilServer({database,backups:{directory}}),{code:'EEXIST'});
    const preserved=new DatabaseSync(database,{readOnly:true});
    try{
      assert.equal(preserved.prepare('SELECT id FROM users WHERE name=?').get('RestartPilot').id,owner.user.id);
      assert.equal(preserved.prepare("SELECT name FROM sqlite_master WHERE name='asc_version'").get(),undefined);
    }finally{preserved.close();}
  }finally{
    if(server)await new Promise(resolve=>server.close(resolve));
    rmSync(root,{recursive:true,force:true});
  }
});
test('A46 enrolled offline recovery requires the password, consumes the code and revokes old sessions',async t=>{
  const {api,file}=await accountServer(t),name='RecovUser',password='test-original-pass',next='test-replaced-pass';
  const {v:a}=await api('/register',{name,password});assert(a.token);
  assert.equal((await api('/asc/recovery-code',{password:'bad'},a.token)).s,403);
  const {v:{code}}=await api('/asc/recovery-code',{password},a.token);assert.equal(code.length,32);
  const db=new DatabaseSync(file,{readOnly:true});try{assert.notEqual(db.prepare('SELECT digest FROM asc_recovery').get().digest,code);}finally{db.close();}
  assert.equal((await api('/asc/recover',{name,code,password:next})).s,200);
  assert.equal((await api('/me',undefined,a.token)).s,401);assert.equal((await api('/login',{name,password})).s,401);
  assert.equal((await api('/asc/recover',{name,code,password:next})).s,400);assert.equal((await api('/login',{name,password:next})).s,200);
});
test('A50 health endpoint requires a persisted admin role and returns only operational fields',async t=>{
  const {api,file}=await accountServer(t);const {v:a}=await api('/register',{name:'HealthPilot',password:'example-test-password'});
  assert.equal((await api('/asc/health')).s,401);assert.equal((await api('/asc/health',undefined,a.token)).s,403);
  const db=new DatabaseSync(file);try{db.prepare('UPDATE users SET admin=1 WHERE id=?').run(a.user.id);}finally{db.close();}
  const {s,v}=await api('/asc/health',undefined,a.token);assert.equal(s,200);
  for(const k of ['players','rooms','uptimeSeconds','memoryMiB','disconnects','errors'])assert.equal(typeof v[k],'number',k);
  assert('rttMs' in v);assert('backups' in v);assert(!/password|secret|token|environment|sqlite/i.test(JSON.stringify(Object.keys(v))));
});
test('A16 mastery ignores an ineligible opponent while crediting a different weapon against a fresh opponent',t=>{
  const {asc,matches}=makeDb(t);matches.settle(result(1,2,0),start);
  const mixed=result(1,3,3,1),extra=result(1,2).players[1];mixed.players.push(extra);
  mixed.players[0].earned.opponents[2]=3;mixed.players[0].earned.opponentWeapons[2]=[3,0,0,0];
  matches.settle(mixed,start+3000);
  const mastery=asc.profile(1,start).mastery;assert.equal(mastery.find(v=>v.weapon===0).kills,3);assert.equal(mastery.find(v=>v.weapon===3).kills,1);
});
test('an existing unrecognized database is preserved and startup stops before schema creation',()=>{
  const dir=mkdtempSync(join(tmpdir(),'asc-db-guard-')),file=join(dir,'foreign.sqlite');
  try{const original=new DatabaseSync(file);original.exec('CREATE TABLE example(value TEXT); INSERT INTO example VALUES (\'preserved\')');original.close();
    assert.throws(()=>createRecoilServer({database:file}),/account table/);
    const check=new DatabaseSync(file,{readOnly:true});try{assert.equal(check.prepare('SELECT value FROM example').get().value,'preserved');
      assert.equal(check.prepare("SELECT name FROM sqlite_master WHERE name='users'").get(),undefined);}finally{check.close();}
  }finally{rmSync(dir,{force:true,recursive:true});}
});
