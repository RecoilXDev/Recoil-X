import assert from 'node:assert/strict';
import {once} from 'node:events';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {setTimeout as wait} from 'node:timers/promises';
import {runInContext} from 'node:vm';
import {createCuratorRooms} from '../server/a-curator-rooms.mjs';
import {createRecoilServer} from '../server/server.mjs';
import harness from './helpers/dom-harness.cjs';

const project={name:'Co-op trail',mode:'collect',seconds:180,objects:[
 {type:'spawn',x:0,z:0},{type:'target',x:1,z:0},{type:'target',x:4,z:0}
]};
const studio=readFileSync(new URL('../server/a-curator.js',import.meta.url),'utf8');

test('Curator Studio resumes the same co-op seat and objectives until the player leaves',async()=>{
 const server=createRecoilServer({database:':memory:',beta:true});
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const origin='http://127.0.0.1:'+server.address().port;
 const api=async(path,body,token)=>{
  const r=await fetch(origin+'/rx-api'+path,{method:body===undefined?'GET':'POST',
   headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},
   body:body===undefined?undefined:JSON.stringify(body)});
  assert.equal(r.status,200);return r.json();
 };
 const {ctx,ui}=harness.makeHarness();
 const host=ui.createElement('div');
 let controller,failLeave=false;
 const button=label=>host.querySelectorAll('button').find(b=>b.textContent===label);
 async function displays(label){
  const deadline=performance.now()+5000;
  while(performance.now()<deadline){if(host.textContent.includes(label))return;await wait(10);}
  assert.fail('Studio did not show '+label);
 }
 function mount(){
  controller=new AbortController();
  ctx.RXCurator.mount(host,controller.signal);
 }
 try{
  const {token}=await api('/register',{name:'CuratorWalker',password:'local-test-password'});
  const guest=await api('/register',{name:'SecondWalker',password:'local-test-password'});
  await api('/a/curator/save',project,token);
  ctx.sessionStorage.setItem('rx5-token',token);
  ctx.fetch=(url,opts)=>{
   if(failLeave&&url.endsWith('/leave'))return Promise.resolve(Response.json({error:'Try leaving again.'},{status:503}));
   return fetch(new URL(url,origin),opts);
  };
  runInContext(studio,ctx);mount();
  await displays('My maps');
  button('Host co-op').click();await displays('Co-op room ');
  button('→').click();await displays('Targets: 1');
  const {activeRoom}=await api('/a/curator/list',undefined,token);
  assert.equal(activeRoom.players[0].x,1);
  assert.equal((await api('/a/curator/list',undefined,guest.token)).activeRoom,null);
  await api('/a/curator/join-room',{code:activeRoom.code},guest.token);

  controller.abort();mount();
  await displays('Resumed your co-op room.');
  await displays('Co-op room '+activeRoom.code);await displays('Targets: 1');await displays('SecondWalker');
  const resumed=await api('/a/curator/room',undefined,token);
  assert.equal(resumed.players[0].x,1);
  assert.deepEqual(resumed.found,['1,0']);

  failLeave=true;button('Leave co-op').click();await displays('Try leaving again.');
  assert(host.textContent.includes('Co-op room '+activeRoom.code));
  failLeave=false;button('Leave co-op').click();await displays('Left the co-op room.');
  assert.equal((await api('/a/curator/list',undefined,token)).activeRoom,null);
  assert.equal((await api('/a/curator/room',undefined,guest.token)).players.length,1);
 }finally{controller?.abort();await new Promise(resolve=>server.close(resolve));}
});

test('Curator resumes during the existing idle window and releases the seat after it expires',()=>{
 let now=100;
 const rooms=createCuratorRooms((status,message)=>Object.assign(Error(message),{status}),{clock:()=>now});
 const u={id:1,name:'Host'};
 const {code}=rooms.create(u,project);
 now+=44000;
 assert.equal(rooms.state(u,true).code,code);
 now+=45001;
 assert.equal(rooms.state(u,true),null);
 assert.throws(()=>rooms.state(u),{status:404});
});
