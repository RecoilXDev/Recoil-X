import assert from 'node:assert/strict';
import {test} from 'node:test';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,readdirSync,rmSync,statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';
import {migrateOverdrive} from '../server/overdrive-store.mjs';
import {migrateMissions,missionStore} from '../server/mission-store.mjs';
import {createRecoilServer} from '../server/server.mjs';
import {verifiedBackup} from '../server/ascension-backup.mjs';

const users='CREATE TABLE users(id INTEGER PRIMARY KEY,name TEXT,handle TEXT UNIQUE,salt TEXT,secret TEXT,admin INTEGER,banned INTEGER,joins INTEGER)';
const fail=(status,message)=>Object.assign(Error(message),{status});
const migrationBackups=folder=>readdirSync(folder).filter(name=>name.endsWith('-migration.sqlite'));
const id=n=>['air','box','home','light'][n-1]||'lv'+n;
const record=n=>'signal_record_'+id(n)+'_recruit';
const change=(key,value,base=0,previous=null)=>({key,value,base,previous});
const checkpoint=(runId,stage=0)=>({runId,id:'air',day:'',stage,time:stage*20,splits:Array.from({length:stage},(_,i)=>(i+1)*20),
  route:'',intel:false,used:false,kit:'scout',paint:'ion',x:0,z:18,hp:100,shield:65,weapon:0,mags:[30,8,5,40],stocks:[180,64,30,240]});

test('account records advance sequentially through 500, merge best results and protect newer checkpoints',()=>{
  const db=new DatabaseSync(':memory:');db.exec(users);db.exec('INSERT INTO users(id) VALUES (1),(2)');
  migrateMissions(db,':memory:',false);const store=missionStore(db,fail);
  const put=(...changes)=>store.write(1,{changes}).rows;
  try{
    assert.equal(put(change(record(500),{stars:3,best:18}))[0].applied,false);
    const cp='signal_checkpoint_air_recruit',a=checkpoint('run-a'),b=checkpoint('run-b');
    let row=put(change(cp,a))[0];assert.equal(row.rev,1);
    row=put(change(cp,checkpoint('run-a',1),row.rev))[0];assert.equal(row.rev,2);
    row=put(change(cp,b,row.rev,'run-a'))[0];assert.equal(row.rev,3);
    assert.equal(put(change(cp,checkpoint('run-a',2),1))[0].value.runId,'run-b');
    assert.equal(put(change(cp,null,2,'run-a'))[0].applied,false);
    assert.equal(put(change(cp,null,3,'run-b'))[0].value,null);
    assert.equal(put(change(cp,checkpoint('run-b',1),3))[0].applied,false);
    for(let start=1;start<=500;start+=8){
      const changes=[];for(let n=start;n<=Math.min(500,start+7);n++)changes.push(change(record(n),{stars:2,best:80}));
      assert.ok(put(...changes).every(r=>r.applied));
    }
    assert.deepEqual(put(change(record(500),{stars:1,best:45}))[0].value,{stars:2,best:45});
    assert.deepEqual(put(change(record(500),{stars:3,best:66}))[0].value,{stars:3,best:45});
    assert.throws(()=>put(change(record(501),{stars:3,best:5})),/Invalid mission/);
    const [invalid,good]=put(change(record(1),{stars:7,best:-1}),change('signal_dispatch_stamps',['2026-11-18']));
    assert.equal(invalid.applied,false);assert.equal(invalid.reason,'invalid');assert.equal(good.applied,true);
    assert.deepEqual(store.read(2).rows,[]);
  }finally{db.close();}
});

test('an existing Overdrive database is backed up before mission migration and account saves survive a restart',async()=>{
  const directory=mkdtempSync(join(tmpdir(),'rx-mission-')),path=join(directory,'game.sqlite');
  const old=new DatabaseSync(path);old.exec('PRAGMA journal_mode=WAL;'+users);migrateOverdrive(old,path,false);
  old.exec("INSERT INTO users VALUES (15,'Existing','existing','unused','unused',0,0,1)");old.close();
  let server;
  const start=async()=>{server=createRecoilServer({database:path,backups:{directory:join(directory,'private-backups')}});server.listen(0,'127.0.0.1');await once(server,'listening');return 'http://127.0.0.1:'+server.address().port+'/rx-api';};
  try{
    let api=await start();
    const folder=join(directory,'private-backups'),backups=migrationBackups(folder);
    assert.equal(backups.length,1);
    const image=join(folder,backups[0]);if(process.platform!=='win32')assert.equal(statSync(image).mode&0o777,0o600);
    const copy=new DatabaseSync(image,{readOnly:true});
    assert.equal(copy.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
    assert.equal(copy.prepare('SELECT name FROM users WHERE id=15').get().name,'Existing');
    assert.ok(copy.prepare("SELECT name FROM sqlite_master WHERE name='rx2_schema'").get());
    assert.equal(copy.prepare("SELECT name FROM sqlite_master WHERE name='rx_mission_save'").get(),undefined);copy.close();
    const send=(route,token,body)=>fetch(api+route,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});
    assert.equal((await send('/missions')).status,401);
    const register=async name=>(await (await send('/register',null,{name,password:'fixture-pass-2026'})).json()).token;
    const owner=await register('RestartOwner'),second=await register('SeparateUser');
    assert.equal((await send('/missions',owner,{changes:[change(record(1),{stars:3,best:58})]})).status,200);
    assert.deepEqual((await(await send('/missions',second)).json()).rows,[]);
    // A routine backup can coexist with the single pre-migration snapshot on restart.
    const daily=verifiedBackup(path,{directory:folder,reason:'daily'});
    await new Promise(resolve=>server.close(resolve));server=null;api=await start();
    const rows=(await(await send('/missions',owner)).json()).rows;
    assert.deepEqual(rows[0].value,{stars:3,best:58});
    assert.deepEqual(migrationBackups(folder),backups);
    assert.ok(statSync(daily.path).size>0);
  }finally{if(server)await new Promise(resolve=>server.close(resolve));rmSync(directory,{recursive:true,force:true});}
});

test('the Z.3 upgrade snapshots an existing campaign, friends and rank once and preserves them across restarts',async()=>{
  const directory=mkdtempSync(join(tmpdir(),'rx-z3-campaign-')),path=join(directory,'game.sqlite');
  const old=new DatabaseSync(path);
  let server;
  try{
    old.exec('PRAGMA journal_mode=WAL;'+users);
    old.exec(`INSERT INTO users VALUES (1,'Owner','owner','fixture','fixture',1,0,1),(2,'Friend','friend','fixture','fixture',0,0,1);
      CREATE TABLE rx2_schema(version INTEGER PRIMARY KEY); INSERT INTO rx2_schema VALUES (1);
      CREATE TABLE rx2_rank(season TEXT,account INTEGER,points INTEGER,wins INTEGER,losses INTEGER,PRIMARY KEY(season,account));
      INSERT INTO rx2_rank VALUES ('2026-Q4',1,710,5,2);
      CREATE TABLE friends(lo INTEGER,hi INTEGER,requester INTEGER,accepted INTEGER,PRIMARY KEY(lo,hi));
      INSERT INTO friends VALUES (1,2,1,1);
      CREATE TABLE messages(id INTEGER PRIMARY KEY,lo INTEGER,hi INTEGER,sender INTEGER,body TEXT,sent INTEGER);
      INSERT INTO messages VALUES (1,1,2,2,'See you in the next mission',123);`);
    migrateMissions(old,path,false);
    const saved=missionStore(old,fail);
    const expected=checkpoint('existing-account-run',2);
    saved.write(1,{changes:[change(record(1),{stars:3,best:64}),change('signal_checkpoint_air_recruit',expected)]});
    const folder=join(directory,'private-backups');
    async function restart(){
      server=createRecoilServer({database:path,backups:{directory:join(directory,'private-backups')}});server.listen(0,'127.0.0.1');await once(server,'listening');
      await new Promise(resolve=>server.close(resolve));server=null;
    }
    await restart();
    const backups=migrationBackups(folder);assert.equal(backups.length,1);
    for(const file of [path,join(folder,backups[0])]){
      const db=new DatabaseSync(file,{readOnly:true});
      try{
        assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
        assert.equal(db.prepare("SELECT COUNT(*) n FROM sqlite_master WHERE name='rx3_maps'").get().n,file===path?1:0);
        assert.equal(db.prepare("SELECT points FROM rx2_rank WHERE account=1").get().points,710);
        assert.equal(db.prepare('SELECT accepted FROM friends WHERE lo=1 AND hi=2').get().accepted,1);
        assert.equal(db.prepare('SELECT body FROM messages WHERE id=1').get().body,'See you in the next mission');
        const read=db.prepare('SELECT revision,value FROM rx_mission_save WHERE account=1 AND key=?');
        assert.equal(read.get(record(1)).revision,1);
        assert.deepEqual(JSON.parse(read.get(record(1)).value),{stars:3,best:64});
        assert.deepEqual(JSON.parse(read.get('signal_checkpoint_air_recruit').value),expected);
      }finally{db.close();}
    }
    await restart();assert.deepEqual(migrationBackups(folder),backups);
  }finally{
    old.close();
    if(server)await new Promise(resolve=>server.close(resolve));
    rmSync(directory,{recursive:true,force:true});
  }
});
