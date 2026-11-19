import assert from 'node:assert/strict';
import {test} from 'node:test';
import {once} from 'node:events';
import {randomBytes,createHash} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {setTimeout as wait} from 'node:timers/promises';
import {createRecoilServer} from '../server/server.mjs';
async function until(fn,label){
  const end=performance.now()+7500;
  while(performance.now()<end){const result=fn();if(result)return result;await wait(15);}
  assert.fail(label);
}
test('Ascension loopback with 2, 4, 6 and 10 authenticated WebSockets, combat, room chat, deltas and rejoin',async t=>{
  const root=mkdtempSync(join(tmpdir(),'ascension-net-')),file=join(root,'game.sqlite');
  const server=createRecoilServer({database:file,backups:{directory:join(root,'private')}}),sockets=[];
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const wsURL='ws://127.0.0.1:'+server.address().port+'/rx-live';
  const last=(p,type)=>p.events.findLast(m=>m.type===type);
  const send=(p,kind,body={})=>p.ws.send(JSON.stringify({type:'z2:'+kind,...body}));
  async function connect(id,token){
    const ws=new WebSocket(wsURL),p={id,token,ws,events:[],bytes:0,frames:0,deltas:0,hasWorld:false,full:null,latest:null};sockets.push(p);
    ws.addEventListener('message',e=>{const m=JSON.parse(e.data);p.events.push(m);
      if(m.type==='z2:state'){p.bytes+=Buffer.byteLength(e.data);p.frames++;if(m.base){p.deltas++;assert.equal(p.full.frame,m.base);assert(!m.sameWorld||!!p.full.asc);}
        else p.full=m;p.hasWorld=!!(m.asc||m.sameWorld&&p.full.asc);p.latest=m;}
    });
    await once(ws,'open');ws.send(JSON.stringify({type:'auth',token,compactState:1,deltaState:1}));await until(()=>last(p,'ready'),'authenticated');return p;
  }
  try{
    const db=new DatabaseSync(file),tokens=[];
    try{for(let i=1;i<=10;i++){const token=randomBytes(32).toString('hex');tokens.push(token);
      db.prepare('INSERT INTO users(id,name,handle,salt,secret) VALUES(?,?,?,?,?)').run(i,'Pilot'+i,'pilot'+i,'00','00');
      db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(createHash('sha256').update(token).digest('hex'),i,Date.now()+300000);}}
    finally{db.close();}
    const peers=await Promise.all(tokens.map((v,i)=>connect(i+1,v)));
    for(const size of [1,2,3,5]){
      const count=size*2,round=peers.slice(0,count),host=round[0];
      round.forEach(p=>{p.events=[];p.full=null;});send(host,'create',{mode:'payload',size,listed:true,rules:{map:'orbit',heat:true}});
      const room=await until(()=>last(host,'z2:lobby'),'lobby');
      for(const p of round.slice(1))send(p,'join',{code:room.code});
      await until(()=>last(host,'z2:lobby')?.members.length===count,'all seats');
      send(host,'start');await until(()=>round.every(p=>last(p,'z2:begin')&&p.full?.id===last(p,'z2:begin').id&&p.hasWorld),'all views');
      const id=last(host,'z2:begin').id,totals=()=>round.reduce((n,p)=>n+p.bytes,0),frames=()=>round.reduce((n,p)=>n+p.frames,0),deltas=()=>round.reduce((n,p)=>n+p.deltas,0);
      const b=totals(),f=frames(),d=deltas(),began=performance.now();
      send(host,'chat',{body:'Converge on the convoy'});send(host,'tool',{kind:'parry',seq:1});
      for(let i=0;i<24;i++){for(const p of round){const team=last(p,'z2:begin').team;send(p,'input',{seq:i,f:i<10?.5:0,s:0,yaw:team?0:Math.PI,pitch:0,weapon:0,fire:i>=10&&i<18});}await wait(50);}
      await until(()=>round.every(p=>last(p,'z2:chat')?.body==='Converge on the convoy'&&last(p,'z2:shot')),'chat and combat delivered');
      assert(deltas()>d);assert(round.every(p=>p.hasWorld));
      t.diagnostic(count+' Ascension clients / '+Math.round(performance.now()-began)+' ms / '+(totals()-b)+' aggregate state bytes / '+(frames()-f)+' state frames / '+(deltas()-d)+' deltas.');
      if(size===5){const old=round.at(-1);old.ws.close();await until(()=>last(host,'z2:lobby')?.members.some(v=>v.id===old.id&&v.away),'rejoin slot reserved');
        const back=await connect(old.id,old.token);round[count-1]=peers[count-1]=back;
        await until(()=>back.full?.id===id&&last(back,'z2:begin')?.id===id,'restored same match');assert.equal(last(host,'z2:lobby').members.length,count);
        send(back,'input',{seq:0,f:0,s:0,yaw:0,pitch:0,weapon:0});}
      for(const p of round)send(p,'leave');await until(()=>round.every(p=>last(p,'z2:left')?.reason==='Left the lobby.'),'all players left');
    }
  }finally{
    const closed=sockets.filter(p=>p.ws.readyState<2).map(p=>{const end=once(p.ws,'close');p.ws.close();return end;});await Promise.allSettled(closed);
    await new Promise(r=>server.close(r));rmSync(root,{force:true,recursive:true});
  }
});
