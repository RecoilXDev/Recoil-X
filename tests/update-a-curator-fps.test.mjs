import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {setTimeout as wait} from 'node:timers/promises';
import {createRecoilServer} from '../server/server.mjs';
import {curatorField} from '../server/a-curator-fps.mjs';
const project={name:'Custom arena',mode:'collect',seconds:60,objects:[{type:'spawn',x:0,z:0},{type:'target',x:1,z:0},{type:'wall',x:2,z:2},{type:'block',x:-8,z:8}]};
test('Curator geometry stays away from default spawns',()=>{
 const f=curatorField(project);assert.equal(f.curator,true);assert.equal(f.cover.length,2);
 assert(f.cover.every(c=>Math.abs(c.z)+c.d/2<21));
 assert.equal(f.cover[0].z,4.6);assert.throws(()=>curatorField({objects:[{type:'wall',x:999,z:0}]}));
});
test('two actual WebSockets share private custom arena and reconnect',async()=>{
 const server=createRecoilServer({database:':memory:',beta:true});const sockets=[];
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const origin='http://127.0.0.1:'+server.address().port;
 async function api(path,body,token){const r=await fetch(origin+'/rx-api'+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:r.status,data:await r.json()};}
 async function until(fn){const deadline=Date.now()+6000;while(Date.now()<deadline){const v=fn();if(v)return v;await wait(25);}assert.fail('Timed out waiting for network event');}
 async function open(a){const ws=new WebSocket(origin.replace('http:','ws:')+'/rx-live'),events=[];sockets.push(ws);ws.addEventListener('message',e=>events.push(JSON.parse(e.data)));await once(ws,'open');const send=data=>ws.send(JSON.stringify(data));send({type:'auth',token:a.token});await until(()=>events.find(e=>e.type==='ready'));return {ws,events,send,last:t=>events.findLast(e=>e.type===t)};}
 try{
  const a=(await api('/register',{name:'BetaHost',password:'strong-test-password'})).data,b=(await api('/register',{name:'BetaGuest',password:'strong-test-password'})).data;
  assert(a.token&&b.token);
  const p=(await api('/a/curator/save',project,a.token)).data.project;
  assert(p.id);assert.equal((await api('/a/curator/create-fps',{id:p.id,size:1,limit:1,password:'test-pass'},a.token)).status,409);
  const host=await open(a),guest=await open(b);
  assert.equal((await api('/a/curator/create-fps',{id:p.id,size:1,limit:1,password:'test-pass'},b.token)).status,404);
  const result=await api('/a/curator/create-fps',{id:p.id,size:1,limit:1,password:'test-pass'},a.token);assert.equal(result.status,200);
  const code=result.data.code;await until(()=>host.last('z2:lobby')?.curator);
  guest.send({type:'z2:join',code,password:'wrong'});await until(()=>guest.last('z2:error'));
  guest.send({type:'z2:join',code,password:'test-pass'});await until(()=>host.last('z2:lobby')?.members.length===2);
  host.send({type:'z2:start'});const begin=await until(()=>host.last('z2:begin'));await until(()=>guest.last('z2:begin'));
  assert.deepEqual(begin.field,guest.last('z2:begin').field);assert.equal(begin.field.curator,true);assert.equal(begin.field.cover.length,2);
  guest.ws.close();await once(guest.ws,'close');const rejoined=await open(b);await until(()=>rejoined.last('z2:begin'));assert.equal(rejoined.last('z2:begin').id,begin.id);
  assert.deepEqual(rejoined.last('z2:begin').field,begin.field);
  // Play through the score limit so the assertions cover settlement.
  const deadline=Date.now()+6000;
  for(let seq=0;!host.last('z2:result')&&Date.now()<deadline;seq++){
   host.send({type:'z2:input',seq,f:0,s:0,yaw:Math.PI,pitch:0,weapon:0,fire:true});
   rejoined.send({type:'z2:input',seq,f:0,s:0,yaw:0,pitch:0,weapon:0});
   await wait(60);
  }
  const final=await until(()=>rejoined.last('z2:result'));
  assert.equal(final.id,begin.id);
  assert.equal(final.curator,true);
  assert.deepEqual(final.score,[1,0]);
  assert.equal((await api('/a/progression',undefined,a.token)).data.xp,0);
  assert.equal((await api('/z2/profile',undefined,a.token)).data.winsTotal,0);
  assert.deepEqual((await api('/z5/evolutions',undefined,a.token)).data.weapons,[]);
  const economy=(await api('/z5/economy',undefined,a.token)).data;
  assert.equal(economy.points,0);
  assert.equal(economy.stats.matches,0);
 }finally{for(const s of sockets)if(s.readyState<2)s.close();await new Promise(resolve=>server.close(resolve));}
});
