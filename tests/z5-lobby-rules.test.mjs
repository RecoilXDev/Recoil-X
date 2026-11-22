import assert from 'node:assert/strict';
import {test} from 'node:test';
import {CUSTOM_PRESETS,pickTeam,validPreset,canCustomizeMode} from '../server/z5-lobby-custom.mjs';
import {makeMatch,inputMatch,updateMatch} from '../server/overdrive-match.mjs';
import {createOverdrive} from '../server/overdrive.mjs';
const roster=[{id:1,name:'Alpha',team:0},{id:2,name:'Bravo',team:1}];
const fail=(status,message)=>Object.assign(new Error(message),{status});

test('casual rules apply server-controlled health, actual movement and fire timing',()=>{
 assert.equal(validPreset('blitz'),true);
 assert.equal(validPreset('__proto__'),false);
 assert.equal(canCustomizeMode('clanwar'),false);
 const m=makeMatch({id:'preset',mode:'arena',players:roster,now:1000,limit:10,preset:'blitz'});
 const a=m.players.get(1),b=m.players.get(2);
 assert.equal(a.hp,80);assert.equal(b.hp,80);
 assert.equal(a.rx5Rules.speed,1.2);
 assert.equal(a.rx5Rules.fire,.87);
 const prev=a.z;
 assert.equal(inputMatch(m,1,{seq:1,f:1,s:0,yaw:0,pitch:0,weapon:0,fire:false,preset:'fortress'},2000),true);
 updateMatch(m,2000);
 assert.notEqual(a.z,prev,'preset changes actual server movement');
 assert.equal(m.preset,'blitz','client input cannot change preset');
 assert.equal(a.rx5Rules,CUSTOM_PRESETS.blitz);
});

test('host-only team drafting swaps participants without overflowing either team',()=>{
 const members=new Map([
  [1,{id:1,team:0}],[2,{id:2,team:1}],[3,{id:3,team:0}],[4,{id:4,team:1}]
 ]);
 const room={draftTeams:true,phase:'lobby',host:1,size:2,members};
 assert.equal(pickTeam(room,{id:2},2,0),false,'nonhost cannot draft');
 assert.equal(pickTeam(room,{id:1},2,0),true);
 assert.equal(members.get(2).team,0);
 assert.equal(members.get(3).team,1,'nonhost member on a full team swaps');
 assert.deepEqual([0,1].map(t=>[...members.values()].filter(p=>p.team===t).length),[2,2]);
 assert.equal(pickTeam(room,{id:1},2,0),false,'no-op is not a draft pick');
});

test('live authenticated casual lobby accepts host drafted teams and rejects client team spoofing',()=>{
 const messages=[],clients=new Map([1,2,3,4].map(id=>[id,{id}]));
 const users=[1,2,3,4].map(id=>({id,name:'Player'+id}));
 const svc=createOverdrive({client:id=>clients.get(id),
  send:(client,packet)=>messages.push({to:client?.id,...packet}),
  store:{settle:()=>({}),muted:()=>false},fail,allowed:()=>true,
  leaveLegacy:()=>{},cleanChat:x=>x,clock:()=>1000});
 try{
  svc.packet(clients.get(1),users[0],{type:'z2:create',mode:'arena',size:2,limit:15,preset:'blitz',draftTeams:true});
  const lobby=messages.find(m=>m.to===1&&m.type==='z2:lobby');
  assert.equal(lobby.preset,'blitz');
  assert.equal(lobby.draftTeams,true);
  const code=lobby.code;
  for(let i=2;i<=4;i++)svc.packet(clients.get(i),users[i-1],{type:'z2:join',code});
  assert.throws(()=>svc.packet(clients.get(2),users[1],{type:'z2:team',team:0}),{status:409});
  assert.throws(()=>svc.packet(clients.get(2),users[1],{type:'z2:pickteam',id:2,team:0}),{status:403});
  svc.packet(clients.get(1),users[0],{type:'z2:pickteam',id:2,team:0});
  const current=messages.filter(m=>m.to===1&&m.type==='z2:lobby').at(-1);
  assert.equal(current.members.find(x=>x.id===2).team,0);
  assert.equal(current.members.find(x=>x.id===3).team,1);
  svc.packet(clients.get(1),users[0],{type:'z2:start'});
  const begin=messages.find(m=>m.type==='z2:begin'&&m.to===1);
  assert.equal(begin?.preset,'blitz');
  assert.equal(begin?.mode,'arena');
  assert.equal(begin?.roster.find(x=>x.id===2).team,0);
 }finally{svc.close();}
});

test('casual presets cannot spill into clan wars, ranked tournaments or boss rooms',()=>{
 const clients=new Map([[1,{id:1}]]),user={id:1,name:'Alpha'};
 const svc=createOverdrive({client:id=>clients.get(id),send:()=>{},
  store:{settle:()=>({}),muted:()=>false},fail,allowed:()=>true,
  leaveLegacy:()=>{},cleanChat:x=>x,clock:()=>1000});
 try{
  const run=body=>svc.packet(clients.get(1),user,{type:'z2:create',size:2,limit:10,...body});
  assert.throws(()=>run({mode:'raid',preset:'blitz'}),{status:400});
  assert.throws(()=>run({mode:'arena',preset:'cheat-speed'}),{status:400});
  assert.throws(()=>run({mode:'arena',preset:'blitz',teams:4}),{status:400});
  assert.throws(()=>run({mode:'arena',draftTeams:true,size:1}),{status:400});
 }finally{svc.close();}
});
