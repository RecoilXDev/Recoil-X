import assert from 'node:assert/strict';
import { test } from 'node:test';
import { setTimeout as wait } from 'node:timers/promises';
import {
  FIELD, ROOM_GRACE, makeMatch, inputMatch, setOffline, restorePlayer, updateMatch, snapshot, tacticalPing
} from '../server/overdrive-match.mjs';
import { createOverdrive } from '../server/overdrive.mjs';

const start=Date.UTC(2026,10,17);
const controls={f:0,s:0,yaw:0,pitch:0,weapon:0};
function seat(id,team,draft='knight'){return {id,name:'Player'+id,team,draft};}
function arena(mode='arena',seats=[seat(1,0),seat(2,1)],more={}){
  return makeMatch({id:'test',mode,players:seats,limit:1,now:start,rng:()=>.5,...more});
}
function advance(match,ms,id,input){
  const end=match.last+ms;
  while(match.last<end&&!match.result){
    const at=Math.min(end,match.last+50),player=match.players.get(id);
    if(player)inputMatch(match,id,{...controls,yaw:player.yaw,seq:player.seq+1,...input},at);
    updateMatch(match,at);
  }
}

test('authoritative movement, visibility, shot cooldown and replay bounds',()=>{
  const match=arena('arena',undefined,{season:'2026-Q4'});
  const a=match.players.get(1),b=match.players.get(2);
  assert.equal(a.x,0);assert.equal(b.x,0);
  assert.equal(inputMatch(match,1,{...controls,seq:0,pitch:Infinity},start),false);
  assert.equal(inputMatch(match,1,{...controls,seq:1,yaw:Math.PI,f:100,weapon:0},start),true);
  assert.equal(inputMatch(match,1,{...controls,seq:1,f:-1},start+1),false);
  const before=a.z;
  advance(match,350);
  assert(a.z>before&&a.z-before<2.2);
  a.x=-10;a.z=-13;b.x=-10;b.z=-3;
  assert(!snapshot(match,1,match.last).rows.some(r=>r[0]===2));
  a.x=0;a.z=-8;b.x=0;b.z=8;
  advance(match,1000);
  advance(match,900,1,{yaw:Math.PI,fire:true});
  assert.equal(match.result.winner,0);
  assert.equal(match.result.players[0].kills,1);
  assert.equal(match.result.players[1].deaths,1);
  assert.equal(a.ammo[0],25);
  assert(match.events.some(event=>event.type==='z2:killcam'&&event.only===2));
  assert(match.result.highlight.frames.length>0&&match.result.highlight.frames.length<=21);
  assert(match.result.highlight.frames.every(row=>row[0]<=match.last));
  assert.equal(snapshot(match,2,match.last).rows.find(row=>row[0]===1)[11],0);
});

test('reconnect resumes the same seat and stale controls expire',()=>{
  const match=arena(),p=match.players.get(1);
  advance(match,1200,1,{f:1});
  const x=p.x,z=p.z;
  setOffline(match,1,match.last);
  advance(match,2000);
  assert.equal(p.x,x);assert.equal(p.z,z);
  assert.equal(restorePlayer(match,1),true);
  assert.equal(p.seq,-1);
  advance(match,700,1,{s:1});
  assert.notEqual(p.x,x);
  setOffline(match,1,match.last);
  updateMatch(match,match.last+ROOM_GRACE+1);
  assert.equal(match.result.reason,'forfeit');
  assert.equal(match.result.winner,1);
  assert.equal(restorePlayer(match,1),false);
});

test('pings are projected by the server and rate limited',()=>{
  const match=arena();
  const ping=tacticalPing(match,1,3,start);
  assert.equal(ping.team,0);
  assert.equal(ping.message,'Attack now!');
  assert(Math.abs(ping.z)<=FIELD.half);
  assert.equal(tacticalPing(match,1,0,start+150),null);
  assert.equal(tacticalPing(match,1,-1,start+1600),null);
});

test('Overcharge pickups and Chess moves use cooldowns',()=>{
  const charge=arena('overcharge');
  const p=charge.players.get(1);
  p.x=0;p.z=0;advance(charge,50);
  assert(p.boost>charge.last);
  assert(charge.power[0].ready>p.boost);
  assert.equal(charge.season,null);
  const chess=arena('chess',[seat(1,0,'rook'),seat(2,1,'bishop')]);
  const rook=chess.players.get(1),before=rook.z;
  advance(chess,150,1,{ability:true});
  assert(Math.abs(rook.z-before-5.4)<.01);
  assert(rook.abilityAt>chess.last);
  assert.equal(chess.limit,2);
});

test('Relic Relay captures and Squad Rescue revives and bleed-outs',()=>{
  const relic=arena('relic'),p=relic.players.get(1);
  p.x=0;p.z=24;advance(relic,50,1,{use:true});
  assert.equal(relic.relics[1].holder,p.id);
  p.z=-24;advance(relic,50,1,{use:true});
  assert.equal(relic.score[0],1);
  assert.equal(relic.relics[1].home,true);
  const rescue=arena('rescue',[seat(1,0),seat(2,0),seat(3,1),seat(4,1)]);
  const victim=rescue.players.get(1),helper=rescue.players.get(2),attacker=rescue.players.get(3);
  Object.assign(victim,{x:0,z:5});Object.assign(helper,{x:2,z:5});
  Object.assign(attacker,{x:0,z:0});
  advance(rescue,950);
  advance(rescue,800,3,{yaw:Math.PI,fire:true});
  assert(victim.down);
  const z=victim.z;
  advance(rescue,2300,2,{use:true});
  assert.equal(victim.hp,55);
  assert.equal(helper.revives,1);
  assert.notEqual(victim.z,z);
  advance(rescue,2100);
  victim.x=0;victim.z=5;attacker.x=0;attacker.z=0;
  advance(rescue,800,3,{yaw:Math.PI,fire:true});
  assert(victim.down);
  advance(rescue,8600);
  assert.equal(rescue.result.winner,1);
});

test('4- and 8-team brackets progress to a champion with spectators',async()=>{
  for(const teams of [4,8]){
    let now=start;
    const connected=new Map(),earned=[],out=[];
    const service=createOverdrive({
      client:id=>connected.get(id), send:(c,e)=>{if(c)c.events.push(e);},
      store:{rating:()=>({points:500}),settle:()=>({}),giveAward:(...entry)=>earned.push(entry)},
      fail:(status,message)=>Object.assign(Error(message),{status}),allowed:()=>true,
      leaveLegacy:()=>{},cleanChat:s=>s,clock:()=>now,onError:e=>out.push(e)
    });
    function connect(id){const c={id,events:[]};connected.set(id,c);return c;}
    function packet(c,action,details={}){service.packet(c,{id:c.id,name:'Player'+c.id},{type:'z2:'+action,...details});}
    function last(c,type){return c.events.findLast(e=>e.type==='z2:'+type);}
    try{
      const players=Array.from({length:teams},(_,i)=>connect(i+1));
      const host=players[0],view=connect(teams+1);
      packet(host,'create',{mode:'arena',size:1,teams,limit:1});
      const code=last(host,'lobby').code;
      for(const player of players.slice(1))packet(player,'join',{code});
      packet(view,'join',{code,spectate:true});packet(host,'start');
      assert.equal(last(view,'begin').team,null);
      let winner;
      for(let round=0;round<teams-1;round++){
        const match=last(view,'begin'),blue=match.roster.find(p=>p.team===0),orange=match.roster.find(p=>p.team===1);
        assert(blue&&orange);
        now+=1000;await wait(65);
        for(let i=0;i<14&&!view.events.some(e=>e.type==='z2:result'&&e.id===match.id);i++){
          now+=50;packet(connected.get(blue.id),'input',{...controls,yaw:Math.PI,seq:i,fire:true});
          await wait(53);
        }
        const settled=last(view,'result');
        assert.equal(settled?.id,match.id);
        assert.equal(settled.winner,0);
        assert.equal(settled.mvp,blue.name);
        winner=blue.id;
        now+=7600;await wait(66);
      }
      const bracket=last(view,'lobby').tournament;
      assert.equal(bracket.matches.length,teams-1);
      assert(bracket.matches.every(m=>m.winner!==null));
      assert.equal(earned[0][0],winner);
      assert.equal(earned[0][1],'Overdrive Cup Champion');
      assert.deepEqual(out,[]);
    }finally{service.close();}
  }
});

test('team changes, host controls and idle code expiration',async()=>{
  let now=start;
  const host={id:1,events:[]},guest={id:2,events:[]},clients=new Map([[1,host],[2,guest]]);
  const service=createOverdrive({client:id=>clients.get(id),send:(c,e)=>c?.events.push(e),
    fail:(status,message)=>Object.assign(Error(message),{status}),store:{},allowed:()=>true,
    leaveLegacy:()=>{},cleanChat:s=>s,clock:()=>now});
  const act=(c,action,details={})=>service.packet(c,{id:c.id,name:'Player'+c.id},{type:'z2:'+action,...details});
  const room=()=>host.events.findLast(e=>e.type==='z2:lobby');
  try{
    act(host,'create',{mode:'arena',size:2});
    const code=room().code;
    act(host,'lock',{locked:true});
    assert.throws(()=>act(guest,'join',{code}),{status:409});
    act(host,'lock',{locked:false});act(guest,'join',{code});
    act(guest,'team',{team:0});
    assert.equal(room().members.find(p=>p.id===guest.id).team,0);
    assert.throws(()=>act(guest,'remove',{id:host.id}),{status:403});
    act(host,'remove',{id:guest.id});assert.equal(room().members.length,1);
    now+=15*60*1000+1;await wait(105);
    assert.throws(()=>act(guest,'join',{code}),{status:404});
    assert(host.events.some(e=>e.type==='z2:left'&&e.reason.includes('expired')));
  }finally{service.close();}
});
