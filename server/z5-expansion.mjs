// Z.5 opt-in multiplayer extensions. Never accepts account identity from client request bodies.
import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import {createFriendParties} from './z5-parties.mjs';
import {createAntiCheat} from './z5-anti-cheat.mjs';
import {createKillcam} from './z5-killcam.mjs';
import {createBroadcastSpectating} from './z5-spectating.mjs';
import {evolutionForXp,evolutionBonuses} from './z5-weapon-evolution.mjs';

const digest=x=>createHash('sha256').update(x).digest();
const codePattern=/^[a-f0-9]{64}$/;
const maxXp=100000000;
export function createZ5Expansion({db,fail,allowed,clients,isFriend,contact,overdrive,byId,byName,
  canonical,passwordHash,send,cutConnection,clock=Date.now}){
  db.exec(`
    CREATE TABLE IF NOT EXISTS rx5_evo_xp(
      player INTEGER NOT NULL REFERENCES users(id),weapon INTEGER NOT NULL,
      xp INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(player,weapon));
    CREATE TABLE IF NOT EXISTS rx5_evo_awards(match_id TEXT PRIMARY KEY);
    CREATE TABLE IF NOT EXISTS rx5_recovery(
      player INTEGER PRIMARY KEY REFERENCES users(id),
      code_hash TEXT NOT NULL,expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS rx5_input_evidence(
      id INTEGER PRIMARY KEY,player INTEGER NOT NULL REFERENCES users(id),at INTEGER NOT NULL,kind TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS rx5_input_evidence_player ON rx5_input_evidence(player,id DESC);
  `);
  const parties=createFriendParties();
  const audit=createAntiCheat({maxSpeed:110,now:clock});
  const cameras=createKillcam({maxFrames:120});
  const streams=createBroadcastSpectating({delayMs:10000,maxViewers:20,now:clock});
  const streamMeta=new Map(),usedWeapons=new Map(),lastFrame=new Map();
  const selectXp=db.prepare('SELECT weapon,xp FROM rx5_evo_xp WHERE player=? ORDER BY weapon');
  const findXp=db.prepare('SELECT xp FROM rx5_evo_xp WHERE player=? AND weapon=?');
  const setXp=db.prepare('INSERT INTO rx5_evo_xp(player,weapon,xp) VALUES(?,?,?) ON CONFLICT(player,weapon) DO UPDATE SET xp=excluded.xp');
  const rememberMatch=db.prepare('INSERT OR IGNORE INTO rx5_evo_awards(match_id) VALUES(?)');
  const saveRecovery=db.prepare('INSERT INTO rx5_recovery(player,code_hash,expires) VALUES(?,?,?) ON CONFLICT(player) DO UPDATE SET code_hash=excluded.code_hash,expires=excluded.expires');
  const getRecovery=db.prepare('SELECT code_hash,expires FROM rx5_recovery WHERE player=?');
  const consumeRecovery=db.prepare('DELETE FROM rx5_recovery WHERE player=? AND code_hash=? AND expires>?');
  const recentEvidence=db.prepare('SELECT at FROM rx5_input_evidence WHERE player=? ORDER BY id DESC LIMIT 1');
  const insertEvidence=db.prepare('INSERT INTO rx5_input_evidence(player,at,kind) VALUES(?,?,?)');
  const trimEvidence=db.prepare('DELETE FROM rx5_input_evidence WHERE player=? AND id NOT IN (SELECT id FROM rx5_input_evidence WHERE player=? ORDER BY id DESC LIMIT 100)');
  const listEvidence=db.prepare('SELECT at,kind FROM rx5_input_evidence WHERE player=? ORDER BY id DESC LIMIT 100');
  function onRejectedInput(id,kind,at=clock()){
    // Only fixed server-defined reason labels, no chat, secrets, or raw packets. Throttle storage per account.
    if(!Number.isSafeInteger(id)||!['invalid-input','input-flood'].includes(kind))return;
    const last=recentEvidence.get(id);if(last&&at-last.at<5000)return;
    insertEvidence.run(id,at,kind);trimEvidence.run(id,id);
  }
  const changePassword=db.prepare('UPDATE users SET salt=?,secret=? WHERE id=?');
  const revokeSessions=db.prepare('DELETE FROM sessions WHERE account=?');
  function loadEvolutionLevels(playerIds){
    const result=new Map();
    for(const id of playerIds){
      const levels=[1,1,1,1];
      for(const row of selectXp.all(id))if(Number.isInteger(row.weapon)&&row.weapon>=0&&row.weapon<4)
        levels[row.weapon]=evolutionForXp(row.xp).level;
      result.set(id,levels);
    }
    return result;
  }
  const list=()=>[...streamMeta.values()].filter(m=>m.ends>clock()).map(({code,mode})=>({code,mode}));
  function onStart({matchId}){usedWeapons.set(matchId,new Map());}
  function onInput(id,data){const room=overdrive.roomInfo(id),matchId=room?.matchId;
    if(!matchId||!Number.isInteger(data.weapon)||data.weapon<0||data.weapon>3)return;
    const map=usedWeapons.get(matchId);if(!map)return;
    const player=map.get(id)||new Map();player.set(data.weapon,(player.get(data.weapon)||0)+1);map.set(id,player);
  }
  function onFrame({matchId,match,frame,now}){
    const last=lastFrame.get(matchId)||0;
    if(now-last<150)return;
    lastFrame.set(matchId,now);
    const players=[...match.players.values()].filter(p=>!p.forfeited).map(p=>({id:String(p.id),
      position:[p.x,Number.isFinite(p.jump)?p.jump:0,p.z],yaw:p.yaw}));
    cameras.record(matchId,{at:now,players});
    for(const p of match.players.values())if(p.hp>0&&!p.offlineAt)
      audit.inspect(p.id,{kind:'move',position:[p.x,Number.isFinite(p.jump)?p.jump:0,p.z],time:now});
    if(streamMeta.has(matchId))
      streams.publish(matchId,{at:now,score:match.score.slice(),mode:match.mode,
        players:frame.actors.map(a=>({id:a.own[0],x:a.own[1],z:a.own[2],team:a.own[7],alive:a.own[5]>0}))});
  }
  function onEnd(matchId,result){
    streamMeta.delete(matchId);streams.close(matchId);cameras.clear(matchId);lastFrame.delete(matchId);
    const usage=usedWeapons.get(matchId);usedWeapons.delete(matchId);
    if(result?.reason==='remake'||!usage||!result?.players?.length||![0,1].includes(result.winner))return;
    db.exec('BEGIN IMMEDIATE');
    try{
      if(rememberMatch.run(matchId).changes){
        for(const p of result.players){
          if(p.forfeited||p.inputs<5)continue;
          const weapons=usage.get(p.id);if(!weapons?.size)continue;
          const chosen=[...weapons].sort((a,b)=>b[1]-a[1])[0][0];
          const gain=Math.min(40,Math.max(0,p.kills|0))*25+(p.team===result.winner?100:0);
          if(gain<=0)continue;
          const xp=findXp.get(p.id,chosen)?.xp||0;
          setXp.run(p.id,chosen,Math.min(maxXp,xp+gain));
        }
      }
      db.exec('COMMIT');
    }catch(error){db.exec('ROLLBACK');throw error;}
  }
  function partyView(user){
    const p=parties.get(user.id);
    return {party:p,invited:parties.pending?.(user.id)||null,
      notice:'A party leader can queue an online party of 2, 3 or 5 into the existing ranked squad lobby.'};
  }
  function get(user,path,request){
    if(path==='/z5/party')return partyView(user);
    if(path==='/z5/evolutions')return {weapons:selectXp.all(user.id)
      .filter(row=>Number.isInteger(row.weapon)&&row.weapon>=0&&row.weapon<4)
      .map(row=>({weapon:row.weapon,...evolutionForXp(row.xp),bonuses:evolutionBonuses(evolutionForXp(row.xp).level)})),
      note:'Earned reload, accuracy, fire-rate and damage perks activate in casual matches only; disabled in ranked, tournaments, Clan Wars and specialist modes.'};
    if(path==='/z5/spectate')return {streams:list()};
    if(path==='/z5/spectate/frame'){
      const params=new URL(request.url,'http://localhost').searchParams;
      const code=params.get('code');const entry=[...streamMeta.entries()].find(([,m])=>m.code===code);
      if(!entry)throw fail(404,'Broadcast not available.');
      return {frame:streams.view(entry[0],user.id)};
    }
    if(path==='/z5/anti-cheat/review'){
      if(!user.admin)throw fail(403,'Administrator access required.');
      const name=new URL(request.url,'http://localhost').searchParams.get('name');
      const target=byName.get(canonical(name));
      if(!target)throw fail(404,'Unknown account.');
      return {player:target.name,evidence:audit.evidence(target.id),rejectedInputs:listEvidence.all(target.id),notice:'Heuristics and rejected-input evidence only; network jitter may affect counts. Human review required; no automatic bans.'};
    }
    throw fail(404,'Unknown expansion route.');
  }
  function post(user,path,body){
    if(path==='/z5/party'){
      if(!allowed('party:'+user.id,30,60000))throw fail(429,'Party actions are limited.');
      switch(body.action){
        case 'create':return {party:parties.create(user.id)};
        case 'invite':{
          const target=contact(user,body.name);
          if(!isFriend(user.id,target.id))throw fail(403,'Only accepted friends may join.');
          const invite=parties.invite(user.id,target.id);
          send(clients.get(target.id),{type:'z5:party-invite',from:user.name});
          return {invited:target.name,partyId:invite.partyId};
        }
        case 'accept':return {party:parties.accept(user.id)};
        case 'decline':parties.decline(user.id);return {ok:true};
        case 'leave':return {party:parties.leave(user.id)};
        case 'queue':{
          const party=parties.get(user.id);
          if(!party||party.leader!==String(user.id))throw fail(403,'Only the party leader can queue.');
          if(![2,3,5].includes(party.members.length))throw fail(409,'Ranked parties require 2, 3 or 5 players.');
          if(party.members.some(id=>!clients.has(Number(id))||overdrive.inRoom(Number(id))))
            throw fail(409,'Every party member must be online and outside a match.');
          const leader=clients.get(user.id);
          overdrive.packet(leader,user,{type:'z2:create',mode:'arena',size:party.members.length,squad:true},);
          const room=overdrive.roomInfo(user.id);
          try{
            for(const member of party.members){
              const id=Number(member);if(id===user.id)continue;
              overdrive.packet(clients.get(id),byId.get(id),{type:'z2:join',code:room.code});
            }
          }catch(error){for(const member of party.members)overdrive.drop(Number(member),clock(),'Party queue failed.');throw error;}
          return {ok:true,code:room.code,note:'Squad assembled. Every member must ready up and the leader can start ranked search.'};
        }
        default:throw fail(400,'Choose a party action.');
      }
    }
    if(path==='/z5/spectate'){
      if(!allowed('spectate:'+user.id,20,60000))throw fail(429,'Too many spectator actions.');
      if(body.action==='enable'){
        const room=overdrive.roomInfo(user.id);
        if(!room||room.host!==user.id||room.phase!=='playing'||!room.matchId)
          throw fail(403,'Only the active match host can enable broadcasting.');
        streams.enable(room.matchId);
        streamMeta.set(room.matchId,{code:room.code,mode:room.mode,ends:clock()+7200000});
        return {ok:true,code:room.code,delayMs:10000};
      }
      if(body.action==='join'){
        const entry=[...streamMeta.entries()].find(([,m])=>m.code===body.code);
        if(!entry)throw fail(404,'Broadcast not available.');
        return {ok:true,...streams.join(entry[0],user.id)};
      }
      if(body.action==='leave'){
        for(const [id] of streamMeta)streams.leave(id,user.id);
        return {ok:true};
      }
      if(body.action==='disable'){
        const room=overdrive.roomInfo(user.id);
        if(!room||room.host!==user.id||!room.matchId)throw fail(403,'Only the host can disable a broadcast.');
        streams.close(room.matchId);streamMeta.delete(room.matchId);return {ok:true};
      }
      throw fail(400,'Choose a spectator action.');
    }
    if(path==='/z5/recovery/create'){
      if(!allowed('recovery-create:'+user.id,3,86400000))throw fail(429,'Recovery codes can only be regenerated occasionally.');
      const code=randomBytes(32).toString('hex');
      saveRecovery.run(user.id,digest(code).toString('hex'),clock()+30*86400000);
      return {code,expires:clock()+30*86400000,warning:'Store this one-time recovery code OFFLINE. Never send it to other players.'};
    }
    throw fail(404,'Unknown expansion action.');
  }
  async function reset(req,body){
    const ip=req.socket.remoteAddress||'';
    if(!allowed('recovery-ip:'+ip,8,3600000))throw fail(429,'Too many recovery attempts.');
    const handle=canonical(body.name),code=body.code,password=body.password;
    if(typeof password!=='string'||password.length<10||password.length>128||typeof code!=='string'||!codePattern.test(code))
      throw fail(400,'Use the full recovery code and a new password with at least 10 characters.');
    if(!allowed('recovery-name:'+handle,10,3600000))throw fail(429,'Too many recovery attempts.');
    const user=byName.get(handle),saved=user?getRecovery.get(user.id):null;
    if(!saved||saved.expires<=clock())throw fail(401,'Invalid or expired recovery code.');
    const provided=digest(code),expected=Buffer.from(saved.code_hash,'hex');
    if(provided.length!==expected.length||!timingSafeEqual(provided,expected))throw fail(401,'Invalid or expired recovery code.');
    const salt=randomBytes(16).toString('hex'),secret=await passwordHash(password,salt);
    db.exec('BEGIN IMMEDIATE');
    try{
      // Recheck and consume AFTER async hashing, in the same write transaction as password/session changes.
      // A concurrent reset, newly issued code, or expiry invalidates this request.
      if(consumeRecovery.run(user.id,saved.code_hash,clock()).changes!==1)throw fail(401,'Invalid or expired recovery code.');
      changePassword.run(salt,secret,user.id);revokeSessions.run(user.id);db.exec('COMMIT');
    }
    catch(e){db.exec('ROLLBACK');throw e;}
    cutConnection(clients.get(user.id),'Password recovered. Sign in again.');
    return {ok:true,message:'Password updated. Sign in with your new password.'};
  }
  return {get,post,reset,onStart,onInput,onRejectedInput,onFrame,onEnd,loadEvolutionLevels};
}
