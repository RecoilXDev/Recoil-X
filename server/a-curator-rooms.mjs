// Small cooperative Curator runtime: server-owned grid moves and objectives, no ranked rewards.
import {randomBytes} from 'node:crypto';
export function createCuratorRooms(fail,{clock=Date.now,maxRooms=20}={}){
 const rooms=new Map(),membership=new Map();
 const key=(x,z)=>x+','+z;
 function drop(id){const r=rooms.get(membership.get(id));membership.delete(id);if(!r)return;r.players.delete(id);if(!r.players.size)rooms.delete(r.code);}
 function sweep(){const now=clock();for(const r of rooms.values()){for(const [id,p] of r.players)if(now-p.seen>45000)drop(id);if(now>r.ends+60000){for(const id of r.players.keys())membership.delete(id);rooms.delete(r.code);}}}
 function get(u){sweep();const r=rooms.get(membership.get(u.id));if(!r)throw fail(404,'Join a Curator room first.');return r;}
 function update(r){if(r.result)return;if(clock()>=r.ends)r.result=r.project.mode==='survive'&&[...r.players.values()].some(p=>p.alive)?'Survived':'Time expired';}
 function view(r){update(r);return {code:r.code,project:r.project,ends:r.ends,now:clock(),result:r.result,found:[...r.found],players:[...r.players.values()].map(({name,x,z,alive})=>({name,x,z,alive}))};}
 function join(u,r){update(r);if(r.result)throw fail(409,'This round ended.');if(r.players.size>=4&&!r.players.has(u.id))throw fail(409,'Room is full.');
 if(membership.get(u.id)===r.code){r.players.get(u.id).seen=clock();return view(r);}
 drop(u.id);const spawn=r.project.objects.find(o=>o.type==='spawn');r.players.set(u.id,{name:u.name,x:spawn.x,z:spawn.z,alive:true,seen:clock(),lastMove:-Infinity});membership.set(u.id,r.code);return view(r);}
 return {
 create(u,project){sweep();if(rooms.size>=maxRooms)throw fail(503,'Curator rooms are busy.');const code=randomBytes(6).toString('hex'),r={code,project,ends:clock()+project.seconds*1000,players:new Map(),found:new Set(),result:null};rooms.set(code,r);return join(u,r);},
 join(u,code){sweep();if(typeof code!=='string'||!/^[a-f0-9]{12}$/.test(code))throw fail(400,'Invalid room code.');const r=rooms.get(code);if(!r)throw fail(404,'Room not found.');return join(u,r);},
 state(u){const r=get(u);r.players.get(u.id).seen=clock();return view(r);},
 move(u,b){const r=get(u),p=r.players.get(u.id),now=clock();p.seen=now;update(r);
 if(!Number.isInteger(b.dx)||!Number.isInteger(b.dz)||Math.abs(b.dx)+Math.abs(b.dz)!==1)throw fail(400,'Move one cell at a time.');
 if(r.result||!p.alive||now-p.lastMove<350)return view(r);p.lastMove=now;const x=p.x+b.dx,z=p.z+b.dz;
 if(Math.abs(x)>8||Math.abs(z)>8)return view(r);const o=r.project.objects.find(o=>o.x===x&&o.z===z);
 if(o&&['block','wall','tree'].includes(o.type))return view(r);p.x=x;p.z=z;
 if(o?.type==='hazard')p.alive=false;if(o?.type==='target')r.found.add(key(x,z));
 if(r.project.mode==='collect'&&r.found.size===r.project.objects.filter(o=>o.type==='target').length)r.result='All targets collected';
 else if(![...r.players.values()].some(v=>v.alive))r.result='All players eliminated';return view(r);},
 leave(u){drop(u.id);return {ok:true};},sweep
 };
}
