// Opt-in broadcast with delayed public snapshots to limit ghosting.
export function createBroadcastSpectating({delayMs=5000,maxViewers=20,now=Date.now}={}){
 const streams=new Map();
 function publish(matchId,snapshot){const id=String(matchId),s=streams.get(id);if(!s||!s.enabled)return false;s.frames.push({at:now(),snapshot});if(s.frames.length>180)s.frames.shift();return true;}
 function enable(matchId){const id=String(matchId);streams.set(id,{enabled:true,viewers:new Set(),frames:[]});}
 function join(matchId,userId){const s=streams.get(String(matchId));if(!s?.enabled)throw Error('Broadcast unavailable');if(s.viewers.size>=maxViewers&&!s.viewers.has(String(userId)))throw Error('Broadcast full');s.viewers.add(String(userId));return {viewers:s.viewers.size};}
 function view(matchId,userId){const s=streams.get(String(matchId));if(!s?.viewers.has(String(userId)))throw Error('Not a spectator');return s.frames.filter(f=>f.at<=now()-delayMs).at(-1)?.snapshot??null;}
 function leave(matchId,userId){streams.get(String(matchId))?.viewers.delete(String(userId));}
 function close(matchId){streams.delete(String(matchId));}
 return {enable,publish,join,view,leave,close};
}
