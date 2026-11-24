// Update A alpha: bounded, server-owned account and connection utilities.
export function createAccountSessions(db,{clock=Date.now,disconnect=()=>{}}={}){
  const list=db.prepare('SELECT expires,token_hash FROM sessions WHERE account=? AND expires>? ORDER BY expires DESC LIMIT 100');
  const count=db.prepare('SELECT COUNT(*) n FROM sessions WHERE account=? AND expires>?');
  const revoke=db.prepare('DELETE FROM sessions WHERE account=? AND token_hash<>?');
  return {
    view(user){
      const active=count.get(user.id,clock()).n;
      return {active,sessions:list.all(user.id,clock()).map(s=>({expires:s.expires,current:s.token_hash===user.token_hash})),note:'Session records, not necessarily connected devices.'};
    },
    revokeOthers(user){
      // The authenticated token hash comes from the server, never the request body.
      const removed=Number(revoke.run(user.id,user.token_hash).changes);
      disconnect(user.id,user.token_hash);
      return {revoked:removed,active:count.get(user.id,clock()).n};
    }
  };
}
export function createDeliveryPolicy({clock=Date.now}={}){
  const fresh=()=>({profile:'standard',sent:0,skipped:0,lastSent:null,bytes:0});
  const state=c=>c.aDelivery??=fresh();
  function setProfile(c,profile){
    if(!['standard','economy'].includes(profile))throw Object.assign(Error('Choose standard or economy.'),{status:400});
    state(c).profile=profile;return view(c);
  }
  function allowSnapshot(c){
    if(!c||c.socket?.readyState!==1)return false;
    const s=state(c),now=clock(),wire=c.transport;
    // Skip replaceable state before constructing/encoding it; never defer reliable events.
    if(wire?.writableNeedDrain||wire?.writableLength>=8192||
       (s.profile==='economy'&&s.lastSent!==null&&now-s.lastSent<190)){
      s.skipped++;return false;
    }
    return true;
  }
  function sent(c,bytes){const s=state(c);s.sent++;s.bytes+=Math.max(0,Number(bytes)||0);s.lastSent=clock();}
  function view(c){const s=c?state(c):fresh();return {connected:!!c&&c.socket?.readyState===1,profile:s.profile,snapshotsSent:s.sent,snapshotsSkipped:s.skipped,stateBytes:s.bytes,
    note:'Skipped replaceable snapshots include the optional bandwidth limit and server backpressure. This is not TCP packet loss or ping.'};}
  return {setProfile,allowSnapshot,sent,view};
}
export function newCombatStats(){
  return Array.from({length:4},()=>({triggers:0,projectiles:0,hits:0,damage:0}));
}
export function combatReport(stats){
  return stats.map((w,weapon)=>({weapon,triggers:w.triggers,projectiles:w.projectiles,hits:w.hits,damage:Math.round(w.damage*10)/10,
    accuracy:w.projectiles?Math.round(w.hits*1000/w.projectiles)/10:null}));
}
