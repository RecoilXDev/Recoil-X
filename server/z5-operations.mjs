// RECOIL X Z.5: read-only match archive, event replays, server health.
// Never exposes a match to an account that did not participate.
const failure=(status,message)=>Object.assign(new Error(message),{status});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const num=(n,min,max)=>Number.isFinite(n)?Math.max(min,Math.min(max,n)):0;
function fromJson(row){
  try{return JSON.parse(row.result);}catch{return null;}
}
function shape(row,match){
  const score=Array.isArray(match.score)?match.score.slice(0,2).map(n=>num(n,0,100000)):[0,0];
  return {id:row.id,mode:String(row.mode||'arena').slice(0,32),finished:row.finished,reason:String(match.reason||'').slice(0,32),
    winner:match.winner===0||match.winner===1?match.winner:null,score,mvp:String(match.mvp||'').slice(0,32),
    duration:num(match.duration,0,3600000),field:String(match.field||'').slice(0,60),
    players:Array.isArray(match.players)?match.players.slice(0,16).map(p=>({
      name:String(p.name||'Player').slice(0,25),team:p.team===1?1:0,
      kills:num(p.kills,0,1000),deaths:num(p.deaths,0,1000),damage:num(p.damage,0,100000),
      revives:num(p.revives,0,1000)
    })):[]};
}
export function createZ5Operations(db,{clock=Date.now,online=()=>0,roomStats=()=>({}),uptime=()=>process.uptime(),memory=()=>process.memoryUsage()}={}){
  // json_each remains on the server. We select match rows by authenticated user id.
  const mine=db.prepare(\`
    SELECT r.id,r.mode,r.finished,r.result
    FROM rx2_results AS r
    WHERE EXISTS (
      SELECT 1 FROM json_each(r.result,'$.players') AS entry
      WHERE CAST(json_extract(entry.value,'$.id') AS INTEGER)=?
    )
    ORDER BY r.finished DESC LIMIT 25
  \`);
  const one=db.prepare('SELECT id,mode,finished,result FROM rx2_results WHERE id=?');
  const isParticipant=(match,id)=>Array.isArray(match?.players)&&match.players.some(p=>p.id===id);
  function recent(user){
    return {matches:mine.all(user.id).flatMap(row=>{
      const match=fromJson(row);return match&&isParticipant(match,user.id)?[shape(row,match)]:[];
    })};
  }
  function details(user,id){
    if(typeof id!=='string'||!uuid.test(id))throw failure(400,'Select a valid completed match.');
    const row=one.get(id),match=row&&fromJson(row);
    if(!match||!isParticipant(match,user.id))throw failure(404,'This match is unavailable.');
    const summary=shape(row,match);
    const timeline=Array.isArray(match.timeline)?match.timeline.slice(0,125).map(e=>({
      at:num(e.at,0,3600000),kind:String(e.kind||'event').slice(0,32),
      text:String(e.text||'Event').slice(0,160)
    })):[]; 
    return {...summary,timeline,replayKind:'event-timeline',notice:'Event-only replay: the original match did not store a full 3D video.'};
  }
  function health(user){
    if(!user.admin)throw failure(403,'Administrator access required.');
    const userCount=db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
    const bans=db.prepare('SELECT COUNT(*) AS n FROM users WHERE banned=1').get().n;
    const matches=db.prepare('SELECT COUNT(*) AS n FROM rx2_results').get().n;
    const stats=roomStats(),usage=memory();
    return {serverTime:clock(),uptimeSeconds:Math.trunc(uptime()),online:online(),registeredPlayers:userCount,
      permanentBans:bans,completedMatches:matches,
      rooms:Number.isFinite(stats.rooms)?stats.rooms:0,activeMatches:Number.isFinite(stats.activeMatches)?stats.activeMatches:0,
      queuedPlayers:Number.isFinite(stats.queuedPlayers)?stats.queuedPlayers:0,
      heapMB:Math.round((usage.heapUsed||0)/1048576),rssMB:Math.round((usage.rss||0)/1048576),
      note:'Private operational summary; not a latency, packet-loss or security guarantee.'};
  }
  function diagnostics(){
    return {serverTime:clock(),protocol:'HTTP + WebSocket',measurement:'Client round-trip latency can be measured against this endpoint.',
      packetLoss:'Not directly observable using the WebSocket transport',reliableCount:false};
  }
  return {recent,details,health,diagnostics};
}
