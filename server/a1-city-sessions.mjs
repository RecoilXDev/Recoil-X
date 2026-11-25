import {randomBytes} from 'node:crypto';
export function createCitySessions({fail=(status,message)=>Object.assign(Error(message),{status}),clock=Date.now}={}){
 const rooms=new Map(),members=new Map(),ttl=15000,max=32;
 function remove(id){const m=members.get(id);if(!m)return;members.delete(id);const room=rooms.get(m.code);room?.delete(id);if(!room?.size)rooms.delete(m.code);}
 function sweep(){for(const [id,m] of members)if(clock()-m.at>ttl)remove(id);}
 function add(user,code){sweep();const room=rooms.get(code);if(!room)throw fail(404,'City room not found.');const old=members.get(user.id);if(old?.code===code&&old.session===user.token_hash){old.at=clock();return {code};}if(room.size>=8||(!old&&members.size>=max))throw fail(503,'City room or server full.');if(old)remove(user.id);if(!rooms.has(code))rooms.set(code,room);const m={code,id:user.id,session:user.token_hash,at:clock(),position:null};members.set(user.id,m);room.set(user.id,m);return {code};}
 return {
  create(user){sweep();if(members.size>=max&&!members.has(user.id))throw fail(503,'City server full.');let code;do{code=randomBytes(3).toString('hex').toUpperCase();}while(rooms.has(code));rooms.set(code,new Map());return add(user,code);},
  join(user,code){if(typeof code!=='string'||!/^[0-9A-F]{6}$/i.test(code))throw fail(400,'Invalid city room code.');return add(user,code.toUpperCase());},
  leave(user){const m=members.get(user.id);if(m?.session===user.token_hash)remove(user.id);return {ok:true};},
  pulse(user,b){sweep();const m=members.get(user.id);if(!m||m.session!==user.token_hash)throw fail(404,'Join a city room first.');if(!b||!Number.isFinite(b.x)||!Number.isFinite(b.y)||!Number.isFinite(b.angle)||b.x<0||b.x>2880||b.y<0||b.y>2400||Math.abs(b.angle)>1e8||['vehicle','inside','moving'].some(k=>typeof b[k]!=='boolean'))throw fail(400,'Invalid city position.');const now=clock();m.at=now;m.position={id:user.id,x:Math.round(b.x*10)/10,y:Math.round(b.y*10)/10,angle:Math.atan2(Math.sin(b.angle),Math.cos(b.angle)),vehicle:b.vehicle,inside:b.inside,moving:b.moving};return {code:m.code,players:[...rooms.get(m.code).values()].filter(p=>p.id!==user.id&&p.position&&now-p.at<5000).map(p=>p.position)};}
 };
}
