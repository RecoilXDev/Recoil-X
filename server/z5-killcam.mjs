// Bounded per-match snapshots; attacker POV can only be approximated from recorded data.
export function createKillcam({maxFrames=180}={}){
 const matches=new Map();
 function record(matchId,frame){const id=String(matchId);if(!frame||!Number.isFinite(frame.at)||!Array.isArray(frame.players))throw Error('Invalid frame');
 const list=matches.get(id)||[];list.push({at:frame.at,players:frame.players.slice(0,24).map(p=>({id:String(p.id),position:Array.isArray(p.position)?p.position.slice(0,3):[],yaw:Number.isFinite(p.yaw)?p.yaw:0}))});
 if(list.length>maxFrames)list.splice(0,list.length-maxFrames);matches.set(id,list);}
 function replay(matchId,{attackerId,victimId,at,durationMs=5000}={}){const frames=matches.get(String(matchId))||[];const end=Number(at);
 if(!Number.isFinite(end))throw Error('Invalid elimination time');
 return {kind:'snapshot-replay',attackerId:String(attackerId),victimId:String(victimId),frames:frames.filter(f=>f.at<=end&&f.at>=end-Math.min(10000,Math.max(0,durationMs))).map(f=>({at:f.at,players:f.players.filter(p=>p.id===String(attackerId)||p.id===String(victimId))})),notice:'Reconstructed snapshots, not video.'};}
 function clear(matchId){matches.delete(String(matchId));}
 return {record,replay,clear};
}
