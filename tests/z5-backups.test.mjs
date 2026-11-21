import assert from 'node:assert/strict';
import {test} from 'node:test';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,readdirSync,statSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {startZ5Backups} from '../server/z5-backups.mjs';

test('automatic WAL snapshots are private, consistent, retained and independent of accounts',()=>{
  const root=mkdtempSync(join(tmpdir(),'rx5-backup-')),file=join(root,'players.sqlite');
  let db,ticks=Date.now(),callback,stopped=false,errors=[];
  try{
    db=new DatabaseSync(file);db.exec('PRAGMA journal_mode=WAL;CREATE TABLE accounts(id INTEGER PRIMARY KEY, coins INTEGER);');
    db.prepare('INSERT INTO accounts(id,coins) VALUES(1,10)').run();
    const backups=startZ5Backups(db,file,{now:()=>ticks,intervalMs:60000,keep:2,onError:e=>errors.push(e),
      schedule:(fn,delay)=>{callback=fn;assert.equal(delay,60000);return {unref:()=>{}}},unschedule:()=>{stopped=true}});
    callback(); // First scheduled tick, simulated without waiting an hour.
    const directory=join(root,'.recoil-backups');
    let files=readdirSync(directory).filter(x=>x.includes('-automatic-'));
    assert.equal(files.length,1);
    assert.equal(statSync(directory).mode&0o777,0o700);
    assert.equal(statSync(join(directory,files[0])).mode&0o777,0o600);
    const verify=new DatabaseSync(join(directory,files[0]));
    assert.equal(verify.prepare('SELECT coins FROM accounts WHERE id=1').get().coins,10);
    verify.close();
    ticks+=61000;
    db.prepare('UPDATE accounts SET coins=100 WHERE id=1').run();
    callback();
    ticks+=61000;callback();
    files=readdirSync(directory).filter(x=>x.includes('-automatic-'));
    assert.equal(files.length,2,'oldest automatic backups should be pruned');
    const newest=files.sort().at(-1);
    const fresh=new DatabaseSync(join(directory,newest));
    assert.equal(fresh.prepare('SELECT coins FROM accounts WHERE id=1').get().coins,100);
    fresh.close();
    backups.stop();
    assert.equal(stopped,true);
    assert.equal(backups.run(),null);
    assert.deepEqual(errors,[]);
  }finally{db?.close();rmSync(root,{force:true,recursive:true});}
});
test('in-memory test databases do not attempt filesystem backups',()=>{
  const db=new DatabaseSync(':memory:');
  const service=startZ5Backups(db,':memory:',{schedule:()=>{throw Error('must not schedule')}});
  assert.equal(service.run(),null);service.stop();db.close();
});
