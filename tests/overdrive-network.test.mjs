import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DatabaseSync } from 'node:sqlite';
import { setTimeout as wait } from 'node:timers/promises';
import { test } from 'node:test';
import { createRecoilServer } from '../server/server.mjs';
import harness from './helpers/dom-harness.cjs';

const password='test-browser-password';
function last(wire,type){return wire.events.findLast(e=>e.type===type);}
async function until(predicate,message,timeout=4750){
  const stop=performance.now()+timeout;
  while(performance.now()<stop){
    const value=predicate();
    if(value)return value;
    await wait(20);
  }
  assert.fail(message);
}

test('existing accounts, live 2/4/6/10-player matches, private rooms and moderation',async t=>{
  const directory=mkdtempSync(join(tmpdir(),'recoil-z2-network-')),database=join(directory,'local.sqlite');
  const server=createRecoilServer({database,origins:['https://recoilxdev.github.io']});
  const sockets=[];
  const {api:game}=harness.makeHarness({},undefined,null,'globalThis.crownTest={decode:z2UnpackState};');
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const origin='http://127.0.0.1:'+server.address().port;
  const api=async (path,body,token,headers={})=>{
    const result=await fetch(origin+'/rx-api'+path,{
      method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',
        ...(token?{Authorization:'Bearer '+token}:{}),...headers},
      ...(body===undefined?{}:{body:JSON.stringify(body)})
    });
    return {status:result.status,value:await result.json().catch(()=>null)};
  };
  async function open(account){
    const socket=new WebSocket(origin.replace('http:','ws:')+'/rx-live');
    const wire={socket,events:[],stateBytes:0,account,send(data){socket.send(JSON.stringify(data));}};
    socket.addEventListener('message',event=>{
      const data=JSON.parse(event.data);wire.events.push(data.type==='z2:state'?game.decode(data):data);
      if(data.type==='z2:state')wire.stateBytes+=Buffer.byteLength(event.data);
    });
    sockets.push(wire);
    await once(socket,'open');wire.send({type:'auth',token:account.token,compactState:account.user.id%2?1:undefined});
    await until(()=>last(wire,'ready'),'Account socket ready');
    return wire;
  }
  const packet=(c,action,props={})=>c.send({type:'z2:'+action,...props});
  try{
    assert.equal((await fetch(origin+'/')).status,200);
    assert.deepEqual((await api('/health')).value,{recoil:'Z.5',protocol:1,overdrive:1,missionLevels:500,release:'recoil-city-3d-radio'});
    assert.equal((await api('/health',undefined,undefined,{Origin:'https://outside.example'})).status,403);
    assert.equal((await api('/health',undefined,undefined,{Origin:'https://recoilxdev.github.io'})).status,200);
    const accounts=[];
    for(let i=0;i<10;i++){
      const account=await api('/register',{name:'Tester'+i,password});
      assert.equal(account.status,200);
      accounts.push(account.value);
    }
    const players=await Promise.all(accounts.map(open));
    const [host,guest,operator]=players;
    const [a,b,moderator]=accounts;

    assert.equal((await api('/friends',{name:b.user.name,action:'request'},a.token)).status,200);
    assert.equal((await api('/friends',{name:a.user.name,action:'accept'},b.token)).status,200);
    const originalChat='See you in the arena';
    assert.equal((await api('/messages',{name:b.user.name,body:originalChat},a.token)).status,200);
    assert.equal((await api('/messages?with='+b.user.name,undefined,a.token)).value.messages[0].body,originalChat);
    assert.equal((await api('/messages?with='+a.user.name,undefined,moderator.token)).status,403);
    assert.equal((await api('/z2/admin',undefined,b.token)).status,403);
    assert.equal((await api('/z2/admin/action',{name:a.user.name,action:'ban',reason:'Test',admin:true},b.token)).status,403);
    const thirdParty=new DatabaseSync(database);
    thirdParty.prepare('UPDATE users SET admin=1 WHERE id=?').run(moderator.user.id);
    thirdParty.close();
    assert.equal((await api('/me',undefined,moderator.token)).value.user.admin,true);
    const extraLogin=await api('/login',{name:a.user.name,password});
    assert.equal(extraLogin.status,200);
    const sessions=await api('/a/sessions',undefined,a.token);
    assert.equal(sessions.value.active,2);
    assert(!JSON.stringify(sessions.value).includes(a.token));
    assert.equal((await api('/a/sessions/revoke-others',{},a.token)).value.active,1);
    assert.equal((await api('/me',undefined,extraLogin.value.token)).status,401);
    assert.equal((await api('/me',undefined,b.token)).status,200);
    assert.equal((await api('/a/connection',undefined,a.token)).value.connected,true);
    assert.equal((await api('/a/connection',{profile:'economy'},a.token)).value.profile,'economy');
    assert.equal((await api('/a/connection',{profile:'standard'},a.token)).value.profile,'standard');
    assert.equal((await api('/a/shield',undefined,a.token)).value.online,10);
    assert.equal((await api('/a/admin/shield',undefined,a.token)).status,403);
    assert.equal((await api('/a/admin/shield',{maintenance:true},a.token)).status,403);
    assert.equal((await api('/a/admin/shield',{maintenance:true},moderator.token)).value.maintenance,true);
    assert.equal((await api('/a/shield',undefined,a.token)).value.maintenance,true);
    assert.equal((await api('/a/admin/shield',{maintenance:false},moderator.token)).value.maintenance,false);
    assert.equal((await api('/a/progression',undefined,a.token)).value.xp,0);
    assert.equal((await api('/a/community',{public:true},a.token)).value.public,true);
    assert.equal((await api('/a/community',{public:false},a.token)).value.public,false);
    assert(Array.isArray((await api('/a/community',undefined,a.token)).value.players));

    for(const size of [1,2,3,5]){
      const count=size*2,round=players.slice(0,count);
      const snapshotsBefore=round.map(p=>p.stateBytes);
      const before=host.events.length;
      packet(host,'create',{mode:'arena',size,limit:1,password:'lobby-test'});
      const lobby=await until(()=>host.events.slice(before).find(e=>e.type==='z2:lobby'),'Host creates private lobby');
      assert.equal(lobby.code.length,6);
      assert.equal(lobby.capacity,count);assert.equal(lobby.password,true);
      if(size===1){
        packet(guest,'join',{code:lobby.code,password:'incorrect'});
        assert.equal((await until(()=>last(guest,'z2:error'),'Password rejected')).message,'Incorrect match password.');
      }
      for(const p of round.slice(1))packet(p,'join',{code:lobby.code,password:'lobby-test'});
      await until(()=>last(host,'z2:lobby')?.members.length===count,'All players joined');
      if(size===1){
        const errorCount=guest.events.filter(e=>e.type==='z2:error').length;
        packet(guest,'start');
        await until(()=>guest.events.filter(e=>e.type==='z2:error').length>errorCount,'Non-host start is rejected');
      }
      packet(host,'start');
      const begin=await until(()=>round.every(p=>last(p,'z2:begin')?.roster.length===count)&&last(host,'z2:begin'),
        'All clients receive the same start');
      assert(round.every(p=>last(p,'z2:begin').id===begin.id));
      const first=await until(()=>host.events.find(e=>e.type==='z2:state'&&e.id===begin.id),'First state arrives');
      assert.equal(first.rows.length,count);
      const hostsId=a.user.id;
      const startZ=first.rows.find(r=>r[0]===hostsId)[2];
      const trafficStart=performance.now();
      for(let sequence=0;sequence<25;sequence++){
        await wait(50);
        for(const p of round){
          const team=last(p,'z2:begin').team;
          packet(p,'input',{seq:sequence,f:1,s:0,yaw:team?0:Math.PI,pitch:0,weapon:0});
        }
      }
      await until(()=>round.every(p=>{
        const row=last(p,'z2:state')?.rows.find(v=>v[0]===p.account.user.id);
        return row?.[15]>=23;
      }),'All clients receive their input acknowledgments');
      const state=last(host,'z2:state'), endZ=state.rows.find(row=>row[0]===hostsId)[2];
      assert(Math.abs(endZ-startZ)>3);
      assert(state.remaining>0);
      const bandwidth=round.map((p,i)=>p.stateBytes-snapshotsBefore[i]);
      t.diagnostic(count+' concurrent WebSockets, '+Math.round(performance.now()-trafficStart)+
        ' ms of controls, aggregate state payload '+bandwidth.reduce((sum,v)=>sum+v,0)+' bytes');
      if(size===1){
        packet(host,'ping',{kind:2});
        await until(()=>last(host,'z2:ping'),'Team receives ping');
        assert.equal(last(host,'z2:ping').message,'Defend here!');
        assert.equal(last(guest,'z2:ping'),undefined);
        // Match arrows face each other; the server applies hits independently.
        for(let seq=26;seq<55&&!last(host,'z2:result');seq++){
          packet(host,'input',{seq,f:0,s:0,yaw:Math.PI,pitch:0,weapon:0,fire:true});
          await wait(52);
        }
        const result=await until(()=>last(guest,'z2:result'),'Score result received by both players');
        assert.equal(result.winner,0);assert.equal(result.score[0],1);
        const report=(await api('/z5/matches/'+result.id,undefined,a.token)).value;
        assert.equal(report.combat[0].hits,5);
        assert.equal(report.combat[0].accuracy,100);
        assert.equal((await api('/z5/matches/'+result.id,undefined,moderator.token)).status,404);
        assert.ok((await api('/a/connection',undefined,a.token)).value.stateBytes>0);
        assert(result.highlight.frames.length);
        assert.equal(last(guest,'z2:killcam').replay.killer,a.user.id);
        packet(host,'rematch');packet(guest,'rematch');
        await until(()=>last(host,'z2:begin').id!==begin.id,'Both rematch votes start a fresh match');
      }
      if(size===5){
        const active=players[9],matchId=last(active,'z2:begin').id;
        active.socket.close();
        await until(()=>last(host,'z2:lobby')?.members.some(p=>p.id===active.account.user.id&&p.away),'Disconnected player retained');
        const resumed=await open(active.account);
        players[9]=resumed;round[9]=resumed;
        assert.equal((await until(()=>last(resumed,'z2:begin'),'Match resumed')).id,matchId);
        packet(resumed,'input',{seq:0,f:0,s:0,yaw:0,pitch:0,weapon:0});
        await until(()=>last(resumed,'z2:state')?.rows.find(row=>row[0]===resumed.account.user.id)?.[15]===0,
          'Input sequence restarts after reconnection');
      }
      for(const p of round)packet(p,'leave');
      await until(()=>round.every(p=>last(p,'z2:left')?.reason==='Left the lobby.'),'Everyone leaves cleanly');
    }

    for(const p of [host,guest])packet(p,'queue',{size:1});
    const ranked=await until(()=>last(host,'z2:begin')?.ranked&&last(host,'z2:begin'),'Ranked pairing starts');
    assert.equal(ranked.mode,'arena');
    const team=ranked.team;
    packet(host,'input',{seq:0,f:0,s:0,yaw:team?0:Math.PI,pitch:0,weapon:0});
    await until(()=>last(host,'z2:state')?.rows.find(r=>r[0]===a.user.id)?.[15]===0,'Ranked input acknowledged');
    packet(guest,'leave');
    const result=await until(()=>last(host,'z2:result')?.id===ranked.id&&last(host,'z2:result'),'Server records ranked forfeit');
    assert.equal(result.winner,team);
    assert(result.deltas[a.user.id]>0&&result.deltas[b.user.id]<0);
    const rank=(await api('/z2/profile',undefined,a.token)).value;
    assert.equal(rank.points,522);assert.equal(rank.wins,1);
    assert.equal((await api('/z2/result',{winner:1,points:9999},a.token)).status,404);
    packet(host,'leave');
    await until(()=>last(host,'z2:left')?.reason==='Left the lobby.','Ranked room exited');

    assert.equal((await api('/z2/report',{name:b.user.name,reason:'Moderation test report'},a.token)).status,200);
    const mod=(action,extra={})=>api('/z2/admin/action',{name:b.user.name,action,reason:'Moderation test',...extra},moderator.token);
    assert.equal((await mod('mute',{minutes:1})).status,200);
    assert.equal((await api('/messages',{name:a.user.name,body:'Muted chat test'},b.token)).status,403);
    assert.equal((await mod('unmute')).status,200);
    assert.equal((await api('/messages',{name:a.user.name,body:'Unmuted chat test'},b.token)).status,200);
    packet(host,'create',{mode:'arena',size:1});
    const privateRoom=await until(()=>last(host,'z2:lobby')?.phase==='lobby'&&last(host,'z2:lobby').code&&last(host,'z2:lobby'),'New lobby');
    packet(guest,'join',{code:privateRoom.code});
    await until(()=>last(host,'z2:lobby')?.members.length===2,'Guest joins for chat test');
    assert.equal((await mod('mute')).status,200);
    const muteErrors=guest.events.filter(e=>e.type==='z2:error').length;
    packet(guest,'chat',{body:'Muted lobby chat'});
    await until(()=>guest.events.filter(e=>e.type==='z2:error').length>muteErrors,'Room chat respects mute');
    assert.equal(last(guest,'z2:error').message,'Your chat is muted.');
    assert.equal((await mod('unmute')).status,200);
    packet(guest,'chat',{body:'Lobby chat restored'});
    await until(()=>last(host,'z2:chat')?.body==='Lobby chat restored','Lobby chat restored');
    assert.equal((await mod('tempban',{minutes:1})).status,200);
    await until(()=>last(guest,'account-closed'),'Moderation closes live session');
    assert.equal((await api('/login',{name:b.user.name,password})).status,403);
    assert.equal((await mod('unban')).status,200);
    assert.equal((await mod('ban')).status,200);
    assert.equal((await api('/login',{name:b.user.name,password})).status,403);
    assert.equal((await mod('unban')).status,200);
    const login=await api('/login',{name:b.user.name,password});
    assert.equal(login.status,200);
    const signedBack=await open(login.value);
    assert.equal((await mod('kick')).status,200);
    await until(()=>last(signedBack,'account-closed'),'Kick disconnects the player');
    assert.equal((await api('/me',undefined,login.value.token)).status,401);
    const history=(await api('/z2/admin',undefined,moderator.token)).value;
    assert(history.actions.some(a=>a.action==='tempban'&&a.until>a.created));
    assert(history.actions.some(a=>a.action==='kick'));
    assert.equal(history.reports.length,1);
    assert.equal((await mod('resolve',{reportId:history.reports[0].id})).status,200);
    assert((await api('/z2/admin',undefined,moderator.token)).value.reports[0].resolved_at);
    assert.equal((await api('/messages?with='+b.user.name,undefined,a.token)).value.messages[0].body,originalChat);
    assert.equal(last(operator,'ready').user.id,moderator.user.id);
  }finally{
    for(const client of sockets)if(client.socket.readyState<2)client.socket.close();
    await new Promise(resolve=>server.close(resolve));
    rmSync(directory,{recursive:true,force:true});
  }
});
