import {test} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync,symlinkSync,readdirSync,copyFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {createRecoilServer} from '../server/server.mjs';
import {verifiedBackup} from '../server/ascension-backup.mjs';

const base='dbe0165754f79d5e1034d49c1c6f81d3cb613a58',tree='bc1ba01fcda1c1043d4dc746acaa36901b828c94';
const cwd=fileURLToPath(new URL('../',import.meta.url));
const git=(...args)=>execFileSync('git',args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']});
test('published predecessor → populated database copy → Ascension → code-only rollback retains accounts, permissions, friends, chat and 500 saved levels',async t=>{
  const ref=process.env.ASCENSION_BASELINE_REF||base;
  let confirmed;try{confirmed=git('rev-parse','--verify',ref+'^{tree}').trim();}catch{t.skip('Fetch the published predecessor commit to run this migration rehearsal.');return;}
  assert.equal(confirmed,tree,'Verify the predecessor tree before reading its server');
  const root=mkdtempSync(join(tmpdir(),'ascension-rollback-')),previous=join(root,'previous'),file=join(root,'prior.sqlite'),candidate=join(root,'candidate.sqlite');
  let server=null;
  async function serve(factory,database){
    server=factory({database,backups:{directory:join(root,'migration-backups')}});
    server.listen(0,'127.0.0.1');await once(server,'listening');
    return async function(path,token,body){
      const response=await fetch('http://127.0.0.1:'+server.address().port+'/rx-api'+path,{method:body?'POST':'GET',
        headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined});
      assert.equal(response.status,200,path);return response.json();
    };
  }
  async function stop(){if(server){await new Promise(r=>server.close(r));server=null;}}
  try{
    mkdirSync(previous);
    for(const name of git('ls-tree','--name-only',ref+':server').trim().split('\n').filter(n=>n.endsWith('.mjs')))writeFileSync(join(previous,name),git('show',ref+':server/'+name));
    symlinkSync(join(cwd,'server','node_modules'),join(previous,'node_modules'),'dir');
    const prior=(await import(pathToFileURL(join(previous,'server.mjs')).href)).createRecoilServer;
    let call=await serve(prior,file);
    const password='test-only-private-password',a=await call('/register',null,{name:'FirstPilot',password}),b=await call('/register',null,{name:'SecondPilot',password});
    await call('/friends',a.token,{name:b.user.name,action:'request'});await call('/friends',b.token,{name:a.user.name,action:'accept'});
    await call('/messages',a.token,{name:b.user.name,body:'Checkpoint 500'});
    const db=new DatabaseSync(file);db.prepare('UPDATE users SET admin=1 WHERE id=?').run(a.user.id);db.close();
    assert.equal((await call('/admin/coins',a.token,{name:b.user.name,amount:49,reason:'Predecessor tournament'})).coins,49);
    const keys=Array.from({length:500},(_,i)=>'signal_record_'+(['air','box','home','light'][i]||'lv'+(i+1))+'_recruit');
    for(let i=0;i<500;i+=8){const res=await call('/missions',a.token,{changes:keys.slice(i,i+8).map(key=>({key,base:0,previous:null,value:{stars:3,best:65}}))});
      assert(res.rows.every(r=>r.applied));}
    await stop();const clone=verifiedBackup(file,{directory:join(root,'old-backup')});copyFileSync(clone.path,candidate);
    async function check(call){
      const account=(await call('/login',null,{name:'FirstPilot',password})).user;
      assert.equal(account.id,a.user.id);assert(account.admin);assert.equal((await call('/me',b.token)).user.id,b.user.id);
      assert(JSON.stringify(await call('/friends',a.token)).includes('SecondPilot'));
      assert.equal((await call('/messages?with=SecondPilot',a.token)).messages[0].body,'Checkpoint 500');
      assert.equal((await call('/admin/player?name=SecondPilot',a.token)).player.coins,49);
      assert.equal((await call('/admin/ledger',a.token)).grants[0].reason,'Predecessor tournament');
      const saves=(await call('/missions',a.token)).rows;assert.equal(saves.length,500);assert.equal(saves.find(r=>r.key===keys[499]).value.stars,3);
    }
    call=await serve(createRecoilServer,candidate);await check(call);await call('/asc/community',a.token,{action:'found',name:'MigrationTest',emblem:'crown'});
    assert((await call('/asc/profile',a.token)).clan);await stop();
    const retained=readdirSync(join(root,'migration-backups')).find(q=>q.endsWith('-migration.sqlite'));assert(retained);
    for(const path of [file,join(root,'migration-backups',retained),candidate]){
      const copy=new DatabaseSync(path,{readOnly:true});try{assert.equal(copy.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
        assert.equal(copy.prepare('SELECT COUNT(*) n FROM rx_mission_save').get().n,500);
        assert.equal(!!copy.prepare("SELECT 1 FROM sqlite_master WHERE name='asc_version'").get(),path===candidate);
        assert.equal(!!copy.prepare("SELECT 1 FROM sqlite_master WHERE name='rx4_admin_events'").get(),path===candidate);
      }finally{copy.close();}}
    call=await serve(prior,candidate);await check(call);await stop();
    call=await serve(createRecoilServer,candidate);assert.equal((await call('/asc/profile',a.token)).clan.name,'MigrationTest');
    t.diagnostic('Rehearsed the exact predecessor tree '+tree+' with two synthetic accounts and all 500 saved levels.');
  }finally{await stop();rmSync(root,{recursive:true,force:true});}
});
