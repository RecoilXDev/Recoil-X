import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import { createRecoilServer } from '../server/server.mjs';
import { division, migrateOverdrive, overdriveStore, seasonAt } from '../server/overdrive-store.mjs';

const baseSchema=`
  PRAGMA journal_mode=WAL;
  CREATE TABLE users(id INTEGER PRIMARY KEY,name TEXT,handle TEXT UNIQUE,salt TEXT,secret TEXT,admin INTEGER,banned INTEGER,joins INTEGER);
  CREATE TABLE sessions(token_hash TEXT PRIMARY KEY,account INTEGER,expires INTEGER);
  CREATE TABLE friends(lo INTEGER,hi INTEGER,requester INTEGER,accepted INTEGER,PRIMARY KEY(lo,hi));
  CREATE TABLE messages(id INTEGER PRIMARY KEY,lo INTEGER,hi INTEGER,sender INTEGER,body TEXT,sent INTEGER);
  INSERT INTO users VALUES (1,'LegacyAdmin','legacyadmin','fixture','fixture',1,0,1);
  INSERT INTO users VALUES (2,'LegacyFriend','legacyfriend','fixture','fixture',0,0,1);
  INSERT INTO friends VALUES (1,2,1,1);
  INSERT INTO messages VALUES (1,1,2,1,'Saved Crown Trials chat',123);
`;

test('additive migration preserves WAL-backed accounts, sessions, friends and chat',async()=>{
  const directory=mkdtempSync(join(tmpdir(),'recoil-x-z2-backup-')),database=join(directory,'legacy.sqlite');
  const legacy=new DatabaseSync(database);
  const token='a'.repeat(64);
  legacy.exec(baseSchema);
  legacy.prepare('INSERT INTO sessions VALUES (?,?,?)').run(createHash('sha256').update(token).digest('hex'),1,Date.now()+3600000);
  let server;
  try{
    server=createRecoilServer({database,backups:{directory:join(directory,'private-backups')}});
    server.listen(0,'127.0.0.1');await once(server,'listening');
    const headers={Authorization:'Bearer '+token},origin='http://127.0.0.1:'+server.address().port+'/rx-api';
    const user=await (await fetch(origin+'/me',{headers})).json();
    assert.equal(user.user.name,'LegacyAdmin');assert.equal(user.user.admin,true);
    const friends=await (await fetch(origin+'/friends',{headers})).json();
    assert.equal(friends.friends[0].name,'LegacyFriend');
    const chat=await (await fetch(origin+'/messages?with=LegacyFriend',{headers})).json();
    assert.equal(chat.messages[0].body,'Saved Crown Trials chat');
    const directoryMode=process.platform==='win32'?null:statSync(join(directory,'private-backups')).mode&0o777;
    if(directoryMode!=null)assert.equal(directoryMode,0o700);
    const files=readdirSync(join(directory,'private-backups'));
    assert.equal(files.length,1);
    const backup=join(directory,'private-backups',files[0]);
    if(directoryMode!=null)assert.equal(statSync(backup).mode&0o777,0o600);
    const copy=new DatabaseSync(backup,{readOnly:true});
    assert.equal(copy.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
    assert.equal(copy.prepare('SELECT count(*) AS n FROM sessions').get().n,1);
    assert.equal(copy.prepare('SELECT count(*) AS n FROM users').get().n,2);
    assert.equal(copy.prepare('SELECT body FROM messages').get().body,'Saved Crown Trials chat');
    assert.equal(copy.prepare("SELECT name FROM sqlite_master WHERE name='rx2_schema'").get(),undefined);
    copy.close();
    assert.equal(legacy.prepare('SELECT version FROM rx2_schema').get().version,1);
    migrateOverdrive(legacy,database,true);
    assert.deepEqual(readdirSync(join(directory,'private-backups')),files);
    assert.equal(legacy.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
  }finally{
    if(server)await new Promise(resolve=>server.close(resolve));
    legacy.close();rmSync(directory,{recursive:true,force:true});
  }
});

test('ranked result deduplication, division boundaries, season rewards and expiry',()=>{
  const db=new DatabaseSync(':memory:');
  db.exec(baseSchema);migrateOverdrive(db,':memory:',false);
  const store=overdriveStore(db,(status,message)=>Object.assign(Error(message),{status}));
  const now=Date.UTC(2026,11,30),season=seasonAt(now);
  const players=[{id:1,team:0,inputs:25,forfeited:false},{id:2,team:1,inputs:25,forfeited:false}];
  const result={id:'rank1',mode:'arena',season,winner:0,reason:'score',players};
  try{
    assert.equal(season,'2026-Q4');
    assert.deepEqual(store.settle(result,now),{1:22,2:-22});
    assert.deepEqual(store.settle(result,now),{});
    assert.equal(store.profile(1,now).points,522);
    for(let n=2;n<=3;n++)store.settle({...result,id:'rank'+n},now);
    const later=Date.UTC(2027,0,1,0,1);
    const profile=store.profile(1,later);
    assert.equal(profile.season,'2027-Q1');assert.equal(profile.points,500);
    assert(profile.awards.includes('Top Ten · 2026-Q4'));
    assert.deepEqual([500,600,780,1030,1300,1650].map(division),
      ['Bronze','Silver','Gold','Diamond','Mythic','RECOIL LEGEND']);
    store.moderation({id:1,admin:1},{name:'LegacyFriend',action:'tempban',minutes:1,reason:'Audit test'},later);
    assert.equal(store.banned(2,later+59999),true);assert.equal(store.banned(2,later+60000),false);
    store.moderation({id:1,admin:1},{name:'LegacyFriend',action:'mute',minutes:1,reason:'Audit test'},later);
    assert.equal(store.muted(2,later+59999),true);assert.equal(store.muted(2,later+60000),false);
  }finally{db.close();}
});
