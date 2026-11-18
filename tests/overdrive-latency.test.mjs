import assert from 'node:assert/strict';
import {test} from 'node:test';
import {once} from 'node:events';
import {setTimeout as wait} from 'node:timers/promises';
import {FIELD,makeMatch,inputMatch,prepareSnapshot,snapshot,updateMatch} from '../server/overdrive-match.mjs';
import {EXPANSION_MODES} from '../server/expansion-modes.mjs';
import {createRecoilServer} from '../server/server.mjs';
import harness from './helpers/dom-harness.cjs';

const epoch=Date.UTC(2026,10,18);
const controls={f:0,s:0,yaw:0,pitch:0,weapon:0};
const bridge=`
globalThis.crownTest={
  decode:z2UnpackState,receive:z2Packet,live:z2Live,players:remotePlayers,keys,fire,
  step:z2Simulate, start(match,wire){
    pickDevice(false);z1Account={id:1,name:'Runner1'};z1SocketReady=true;
    z1Socket={readyState:1,bufferedAmount:0,send:data=>wire(JSON.parse(data))};
    z2Packet(match);
  }, queued(bytes){z1Socket.bufferedAmount=bytes;}
};`;
function arena(count,options={}){
  const seats=Array.from({length:count},(_,i)=>({id:i+1,team:i%2,name:'Runner'+(i+1),draft:'rook'}));
  return makeMatch({id:'performance-arena',players:seats,now:epoch,limit:50,mode:'arena',rng:()=>.5,...options});
}
const json=value=>JSON.parse(JSON.stringify(value));
function compareView(api,match,id,now,frame){
  const full=json(snapshot(match,id,now,false,frame));
  const compact=json(snapshot(match,id,now,true,frame));
  const {packed,...decoded}=json(api.decode(compact));
  assert.equal(packed,1);assert.deepEqual(decoded,full);
  return [Buffer.byteLength(JSON.stringify(full)),Buffer.byteLength(JSON.stringify(compact))];
}

test('independent compact snapshots reproduce the complete permitted view at every team size',t=>{
  const {api}=harness.makeHarness({},undefined,null,bridge);
  for(const count of [2,4,6,10]){
    const match=arena(count);
    let full=0,compact=0;
    for(let tick=1;tick<=80;tick++){
      const now=epoch+tick*50;
      for(const p of match.players.values()){
        const yaw=p.team?0:Math.PI;
        inputMatch(match,p.id,{...controls,seq:tick,yaw,f:1,s:tick%20<10 ? .35 : -.35,fire:tick%8===0},now);
      }
      updateMatch(match,now);
      if(tick%2)continue;
      const frame=prepareSnapshot(match);
      for(const p of match.players.values()){
        const bytes=compareView(api,match,p.id,now,frame);
        full+=bytes[0];compact+=bytes[1];
      }
    }
    assert(compact<full*.8);
    t.diagnostic(count+' players, same 40 snapshots per player: '+full+' → '+compact+' JSON bytes');
  }
  const ranked=arena(2,{season:'2026-Q4'});
  const a=ranked.players.get(1),b=ranked.players.get(2);
  Object.assign(a,{x:-10,z:-13,hp:24,kills:2,deaths:1,revives:3,weapon:1,reloadAt:epoch+350,boost:epoch+700});
  Object.assign(b,{x:-10,z:-3,hp:0,offlineAt:epoch,damage:70});
  const frame=prepareSnapshot(ranked);
  for(const id of [1,2,99])compareView(api,ranked,id,epoch,frame);
  const hidden=json(snapshot(ranked,1,epoch,true,frame));
  assert.equal(hidden.rows.length,1);assert.equal(hidden.roster.length,2);
  for(const mode of ['relic','overcharge'])compareView(api,arena(2,{mode}),1,epoch);
});

test('compact clients receive each expansion objective, disguises, round spawns and spectator focus',()=>{
  const {api}=harness.makeHarness({},undefined,null,bridge);
  for(const mode of EXPANSION_MODES){
    const match=arena(4,{mode,tournament:true});
    const hider=match.players.get(1),seeker=match.players.get(2);
    Object.assign(hider,{x:2,z:2,prop:2,spawnSeq:3});
    Object.assign(seeker,{x:3,z:2});
    match.focus={id:hider.id,until:epoch+1000};
    const frame=prepareSnapshot(match);
    for(const id of [hider.id,seeker.id,99]){
      compareView(api,match,id,epoch,frame);
      const view=api.decode(snapshot(match,id,epoch,true,frame));
      assert.ok(view.objective,mode);
      assert.equal(view.camera,id===99?hider.id:undefined);
    }
    if(mode!=='props')continue;
    const readSeeker=()=>api.decode(snapshot(match,seeker.id,epoch,true));
    assert.ok(!readSeeker().rows.some(row=>row[0]===hider.id));
    match.rule.phase='seek';
    const visible=readSeeker().rows.find(row=>row[0]===hider.id);
    assert.equal(visible[18],2);assert.equal(visible[19],3);
  }
});

for(const count of [2,10])test(count+' players play through 130 and 276 ms round trips',t=>{
  const game=harness.makeHarness({},undefined,null,bridge),{api}=game,match=arena(count);
  const actor=match.players.get(2);
  // Use an open lane, so distance travelled reflects input and snapshot timing.
  actor.x=6;actor.z=21;
  let ms=0,lastStepZ,largestStep=0;
  const up=[],down=[],sent=[],rtts=new Set();
  const oneWay=()=>ms>=2800&&ms<4100?138:65;
  function enqueue(queue,data){
    const last=queue[queue.length-1];
    queue.push({due:Math.max(ms+oneWay(),last?.due??0),data});
  }
  api.start({type:'z2:begin',id:match.id,team:0,mode:match.mode,field:FIELD,
    roster:[...match.players.values()].map(({id,team,name})=>({id,team,name}))},packet=>{
    enqueue(up,packet);
    if(packet.type==='z2:input')sent.push({at:ms,...packet});
  });
  enqueue(down,json(snapshot(match,1,epoch,true)));
  for(ms=0;ms<=5000;ms++){
    game.perf(ms);
    if(ms===160)api.keys.KeyW=true;
    if(ms===640)api.keys.KeyW=false;
    if(ms===2900)api.queued(9000);
    if(ms===2920)api.keys.KeyD=true;
    if(ms===3000)api.keys.KeyD=false;
    if(ms===3150)api.keys.KeyA=true;
    if(ms===3200)api.queued(0);
    if(ms===3520)api.keys.KeyA=false;
    if(ms===3601)api.fire(ms/1000); // Click released before the next render frame.
    while(up[0]?.due<=ms){
      const packet=up.shift().data;
      if(packet.type==='z2:echo')enqueue(down,packet);
      if(packet.type==='z2:input')inputMatch(match,1,packet,epoch+ms);
    }
    if(ms%50===0){
      inputMatch(match,2,{...controls,seq:ms,f:ms<2300?1:-1},epoch+ms);
      for(const p of match.players.values())if(p.id>2)
        inputMatch(match,p.id,{...controls,seq:ms,s:ms%1000<500?1:-1,yaw:p.yaw},epoch+ms);
      updateMatch(match,epoch+ms);
      if(ms%100===0&&ms)enqueue(down,json(snapshot(match,1,epoch+ms,true)));
    }
    while(down[0]?.due<=ms)api.receive(down.shift().data);
    if(ms%16===0){
      api.step(.016,ms/1000);
      if(api.live.rtt!==null)rtts.add(api.live.rtt);
      const remote=api.players.get(2);
      if(remote){
        if(lastStepZ!=null)largestStep=Math.max(largestStep,Math.abs(remote.z-lastStepZ));
        lastStepZ=remote.z;
        assert(remote.poses.length<=6);
      }
    }
  }
  assert(rtts.has(130)&&rtts.has(276),'The meter shows both real simulated round trips');
  assert(largestStep>.05&&largestStep<.14,'Position stays within a normal running stride per render frame');
  assert(sent.some(p=>p.at===160&&p.f===1)&&sent.some(p=>p.at===640&&p.f===0),'Movement edges sent on the first render frame');
  assert(!sent.some(p=>p.at>=2900&&p.at<3200),'Saturated socket queues no stale controls');
  assert(sent.some(p=>p.at===3200&&p.s===-1)&&!sent.some(p=>p.s===1),'Only the latest direction survives congestion');
  assert(sent.some(p=>p.fire)&&match.players.get(1).ammo[0]===29,'A brief click produces exactly one authorized shot');
  assert(sent.length<44,'Held controls use heartbeats');
  t.diagnostic('5 simulated seconds, '+count+' players, ping readings '+[...rtts].join('/')+
    ' ms, '+sent.length+' input packets, largest remote 16 ms step '+largestStep.toFixed(3)+' game units');
  const clock=api.live.snapshot.t;
  const own=json(snapshot(match,1,clock));own.rows=own.rows.filter(r=>r[0]===1);api.receive(own);
  assert.equal(api.players.size,0,'A hidden opponent is removed immediately');
  const reappear=json(snapshot(match,1,clock+100));api.receive(reappear);
  const remote=api.players.get(2);
  assert.equal(remote.poses.length,1);assert.equal(remote.z,reappear.rows.find(row=>row[0]===2)[2]);
  api.receive(own);assert.equal(api.live.snapshot.t,clock+100,'Old frames cannot rewind the match');
  const respawn=json(snapshot(match,1,clock+200));respawn.rows.find(row=>row[0]===2)[2]=-22;
  api.receive(respawn);assert.equal(remote.poses.length,1);assert.equal(remote.z,-22);
  assert.deepEqual(game.log,[]);
});

test('press and release within one server tick consume one action and keep the server cooldown',()=>{
  const match=arena(2),p=match.players.get(1);p.readyShot=epoch;
  const send=(seq,fire,at)=>inputMatch(match,1,{...controls,seq,fire},epoch+at);
  send(1,true,10);send(2,false,15);updateMatch(match,epoch+50);
  assert.equal(p.ammo[0],29);
  send(3,true,60);send(4,false,65);updateMatch(match,epoch+100);
  updateMatch(match,epoch+200);assert.equal(p.ammo[0],29);
});

test('a congested socket skips replaceable states, receives chat, and resumes with one fresh complete state',async()=>{
  const server=createRecoilServer({database:':memory:'});
  const transports=[],players=[];
  server.on('upgrade',(_req,socket)=>transports.push(socket));
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const origin='http://127.0.0.1:'+server.address().port;
  async function until(check){
    const stop=performance.now()+5000;
    while(!check()){assert(performance.now()<stop,'Timed out waiting for game message');await wait(10);}
  }
  try{
    for(let i=0;i<2;i++){
      const response=await fetch(origin+'/rx-api/register',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({name:'Transport'+i,password:'local-test-password'})});
      assert.equal(response.status,200);
      const account=await response.json(),ws=new WebSocket(origin.replace('http:','ws:')+'/rx-live');
      const peer={ws,states:[],latest:{},send:data=>ws.send(JSON.stringify(data))};players.push(peer);
      ws.addEventListener('message',e=>{const data=JSON.parse(e.data);peer.latest[data.type]=data;if(data.type==='z2:state')peer.states.push(data);});
      await once(ws,'open');peer.send({type:'auth',token:account.token,compactState:i===0?1:undefined});
      await until(()=>peer.latest.ready);
    }
    const [slow,fast]=players;
    slow.send({type:'z2:create',mode:'arena',size:1});await until(()=>slow.latest['z2:lobby']);
    fast.send({type:'z2:join',code:slow.latest['z2:lobby'].code});await until(()=>slow.latest['z2:lobby'].members.length===2);
    slow.send({type:'z2:start'});await until(()=>slow.states.length&&fast.states.length);
    assert.equal(slow.states[0].packed,1);assert.equal(fast.states[0].packed,undefined);
    // Hold the queue counter at a known level on one real accepted TCP socket.
    Object.defineProperty(transports[0],'writableLength',{configurable:true,value:12000});
    await wait(75);
    const slowCount=slow.states.length,fastCount=fast.states.length;
    fast.send({type:'z2:chat',body:'still in the match'});
    await until(()=>slow.latest['z2:chat']&&fast.states.length>=fastCount+3);
    assert.equal(slow.states.length,slowCount);
    delete transports[0].writableLength;
    await until(()=>slow.states.length>slowCount);
    assert(slow.states.at(-1).t>=fast.states[fastCount+2].t);
    assert.equal(slow.states.at(-1).rows.length,2);
  }finally{
    for(const p of players)p.ws.close();
    await new Promise(resolve=>server.close(resolve));
  }
});
