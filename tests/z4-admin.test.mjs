import {test} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {mkdtempSync,readdirSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {setTimeout as delay} from 'node:timers/promises';
import {createRecoilServer} from '../server/server.mjs';
import {verifiedBackup} from '../server/ascension-backup.mjs';

async function until(fn,message) {
  const until=Date.now()+7000;
  while(Date.now()<until){const result=await fn();if(result)return result;await delay(20);}
  assert.fail(message);
}
test('Z.4 staff console operates on real HTTP, WebSockets, and a private SQLite copy',async t=>{
  const dir=mkdtempSync(join(tmpdir(),'recoil-staff-')),database=join(dir,'test.sqlite'),privateDir=join(dir,'private');
  const server=createRecoilServer({database,backups:{directory:privateDir}});
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const origin='http://127.0.0.1:'+server.address().port;
  const db=new DatabaseSync(database),pass='local-only-fixture-password';
  const api=async (path,who,body,status=200)=>{
    const res=await fetch(origin+'/rx-api'+path,{method:body==null?'GET':'POST',headers:{'Content-Type':'application/json',...(who?{Authorization:'Bearer '+who.token}:{})},body:body==null?undefined:JSON.stringify(body)});
    const result=await res.json();assert.equal(res.status,status,path+' · '+(result.error||''));return result;
  };
  async function register(name){return api('/register',null,{name,password:pass});}
  let wire;
  try{
    const staff=await register('StaffPilot'),other=await register('StaffTwo'),player=await register('ArenaPilot'),reporter=await register('RacerPilot');
    db.prepare('UPDATE users SET admin=1 WHERE id IN (?,?)').run(staff.user.id,other.user.id);
    const name=player.user.name;
    const queue=(scope='open')=>api('/admin/reports?group='+scope,staff);
    const action=(who,reportId,kind,fields={},status=200)=>api('/admin/case',who,{reportId,kind,...fields},status);
    await t.test('Z.4 entry, admin assets, and the public health response agree on the release',async()=>{
      const html=await(await fetch(origin+'/')).text();assert.equal(html,readFileSync(new URL('../index.html',import.meta.url),'utf8'));
      assert.match(html,/<title>RECOIL X Z\.4 · Project Ascension<\/title>/);assert.match(html,/z4OpenAdmin/);
      for(const path of ['/admin-panel.js','/server/admin-panel.js','/server/admin-panel.css']){const r=await fetch(origin+path);assert.equal(r.status,200);assert.ok((await r.text()).includes('rx4-console'));}
      assert.equal((await api('/health')).recoil,'Z.4');
    });
    await t.test('all staff routes require the live database role for reads and writes',async()=>{
      const reads=['/admin/overview','/admin/players','/admin/player?name=ArenaPilot','/admin/ledger','/admin/reports','/admin/case?id=1','/admin/audit','/asc/health','/z2/admin'];
      const writes=['/admin/coins','/admin/reverse','/admin/note','/admin/case','/admin/backup','/z2/admin/action','/ban'];
      for(const path of reads){await api(path,null,null,401);await api(path,player,null,403);}
      for(const path of writes){const forged={admin:true,kind:'warn',name,reason:'Fixture'};await api(path,null,forged,401);await api(path,player,forged,403);}
      await api('/admin/players?group=unknown',staff,null,400);await api('/admin/case?id=foo',staff,null,400);
    });
    const events=[];
    wire=new WebSocket(origin.replace('http:','ws:')+'/rx-live');wire.addEventListener('message',ev=>events.push(JSON.parse(ev.data)));
    await once(wire,'open');wire.send(JSON.stringify({type:'auth',token:player.token}));
    await until(()=>events.some(e=>e.type==='ready'),'Player presence');
    await t.test('directory, active restrictions, admin roster, private notes and player warnings',async()=>{
      const search=await api('/admin/players?q=ARENA&group=online',staff);assert.deepEqual(search.players.map(p=>p.name),[name]);
      const admins=await api('/admin/players?group=admins',staff);assert.deepEqual(admins.players.map(p=>p.name).sort(),['StaffPilot','StaffTwo']);
      assert.equal((await api('/admin/player?name=ArenaPilot',staff)).player.online,true);
      await api('/admin/note',staff,{kind:'staff-note',name,reason:'Private staff context'});
      const warning=await api('/admin/note',staff,{kind:'warn',name,reason:'Please follow the chat rules'});
      await until(()=>events.some(e=>e.type==='rx-admin:notice'),'Live warning notification');
      assert.deepEqual((await api('/account/notices',player)).notices.map(n=>n.reason),['Please follow the chat rules']);
      assert.equal((await api('/account/notices',reporter)).notices.length,0);
      await api('/account/notices',reporter,{id:warning.record},404);
      assert.equal((await api('/account/notices',player,{id:warning.record})).notices.length,0);
      assert((await api('/admin/audit?target=ArenaPilot&group=staff',staff)).actions.some(a=>a.kind==='staff-note'));
    });
    await t.test('case intake, evidence, claims, priority, notes, resolution, reopening and filters',async()=>{
      const matchId=randomUUID(),stored={players:[{id:player.user.id},{id:reporter.user.id}],duration:22000,timeline:[{kind:'capture',text:'Flag returned',at:9000}]};
      db.prepare('INSERT INTO rx2_results VALUES(?,?,?,?,?)').run(matchId,null,'flags',JSON.stringify(stored),Date.now());
      await api('/z2/report',reporter,{name,reason:'Check this flag play',matchId,at:8000});
      const id=(await queue()).reports[0].id;assert.equal((await api('/admin/case?id='+id,staff)).evidence[0].label,'Flag returned');
      await action(staff,id,'claim');await action(other,id,'claim',{},409);await action(other,id,'release',{},409);
      assert.equal((await queue('mine')).reports.length,1);await action(staff,id,'release');assert.equal((await queue('mine')).reports.length,0);
      await action(other,id,'claim');await action(staff,id,'priority',{urgent:true});assert.equal((await queue('urgent')).reports.length,1);
      await action(staff,id,'priority',{urgent:false});assert.equal((await queue('urgent')).reports.length,0);
      await action(staff,id,'case-note',{reason:'Checked match context'});await action(staff,id,'resolve',{reason:'Review completed'});
      assert.equal((await queue()).reports.length,0);assert.equal((await queue('closed')).reports.length,1);
      await action(staff,id,'resolve',{reason:'Duplicate review'},409);
      await action(staff,id,'reopen',{reason:'New footage received'});
      const detail=await api('/admin/case?id='+id,staff);assert.equal(detail.report.owner,null);assert(detail.notes.some(n=>n.kind==='case-note'));
      assert((await api('/admin/audit?group=cases&actor=staffpilot',staff)).actions.some(a=>a.kind==='reopen'));
    });
    await t.test('wallet grants survive retries and reversal is atomic, audited and visible to the player',async()=>{
      const body={name,amount:125,reason:'Practice event prize',requestId:randomUUID()};
      const answers=await Promise.all([api('/admin/coins',staff,body),api('/admin/coins',staff,body)]);
      assert.equal(answers[0].grantId,answers[1].grantId);assert(answers.some(a=>a.repeated));
      await api('/admin/coins',staff,{...body,amount:126},409);await api('/admin/coins',staff,{...body,amount:-1},400);
      await until(()=>events.some(e=>e.type==='rx-admin:coins'&&e.coins===125),'Wallet grant notification');
      assert.equal((await api('/account/notices',player)).coins,125);
      let grants=(await api('/admin/ledger?name=ArenaPilot',staff)).grants;assert.equal(grants.length,1);
      const reversal={grantId:grants[0].id,reason:'Duplicate prize correction'};
      const result=await api('/admin/reverse',staff,reversal);assert.equal(result.coins,0);await api('/admin/reverse',staff,reversal,409);
      grants=(await api('/admin/ledger?name=ArenaPilot',staff)).grants;assert.equal(grants[0].reversedBy,staff.user.name);
      assert.equal((await api('/account/notices',player)).coins,0);
      assert.deepEqual((await api('/admin/audit?target=arenapilot&group=wallet',staff)).actions.map(a=>a.kind).sort(),['coins-grant','coins-reverse']);
    });
    await t.test('kick, both ban durations, unban, both mute durations and unmute use existing moderation',async()=>{
      const moderate=(kind,minutes=null,who=name,status=200)=>api('/z2/admin/action',staff,{action:kind,name:who,minutes,reason:'Staff action fixture'},status);
      await moderate('kick',null,staff.user.name,403);await moderate('mute',null);
      assert.equal((await api('/admin/player?name=ArenaPilot',staff)).player.muteUntil,null);
      await moderate('mute',10);assert.ok((await api('/admin/player?name=ArenaPilot',staff)).player.muteUntil>Date.now());await moderate('unmute');
      await moderate('tempban',0,name,400);await moderate('tempban',10);assert.equal((await api('/admin/players?group=restricted',staff)).players[0].name,name);
      await api('/login',null,{name,password:pass},403);await moderate('unban');const restored=await api('/login',null,{name,password:pass});
      await moderate('kick');await api('/me',restored,null,401);await moderate('ban');await api('/login',null,{name,password:pass},403);
      await moderate('unban');assert.equal((await api('/login',null,{name,password:pass})).user.name,name);
      assert((await api('/admin/audit?group=moderation',staff)).actions.some(a=>a.kind==='kick'));
    });
    await t.test('server readings, movement review and manual private backup use measured state and enforce a cooldown',async()=>{
      await until(async()=>(await api('/asc/health',staff)).backups.state!=='running','Wait for scheduled snapshot');
      db.prepare('INSERT INTO asc_alert(account,kind,created) VALUES(?,?,?)').run(player.user.id,'speed',Date.now());
      let health=await api('/asc/health',staff);assert(health.movementReviews.some(a=>a.name===name));assert.equal(typeof health.memoryMiB,'number');
      await api('/admin/backup',staff,{reason:' '},400);
      assert.equal((await api('/admin/backup',staff,{reason:'Before event check'})).state,'running');
      await until(async()=>(await api('/asc/health',staff)).backups.state==='ok','Verified manual backup');
      health=await api('/asc/health',staff);assert(health.backups.last);assert(!('path' in health.backups));
      assert(readdirSync(privateDir).some(file=>file.endsWith('-daily.sqlite')));await api('/admin/backup',staff,{reason:'Second request'},429);
      const recent=(await api('/admin/audit?group=staff',staff)).actions;assert(recent.some(a=>a.kind==='backup'));
      db.prepare('UPDATE users SET admin=0 WHERE id=?').run(other.user.id);await api('/admin/overview',other,null,403);
      const privateCopy=verifiedBackup(database,{directory:privateDir,reason:'migration'}),copy=new DatabaseSync(privateCopy.path,{readOnly:true});
      try{assert.equal(copy.prepare('PRAGMA integrity_check').get().integrity_check,'ok');assert.equal(copy.prepare('SELECT COUNT(*) n FROM rx4_reversals').get().n,1);}finally{copy.close();}
    });
  }finally{
    if(wire&&wire.readyState<2)wire.close();await new Promise(resolve=>server.close(resolve));
    db.close();rmSync(dir,{force:true,recursive:true});
  }
});
