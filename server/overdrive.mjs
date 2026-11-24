import { randomInt, randomUUID, scryptSync, timingSafeEqual, randomBytes } from 'node:crypto';
import {
  TEAM_SIZES, MODES, DRAFTS, FIELD, ROOM_GRACE, makeMatch, inputMatch,
  setOffline, restorePlayer, updateMatch, prepareSnapshot, snapshot, tacticalPing, canSee
} from './overdrive-match.mjs';
import { seasonAt } from './overdrive-store.mjs';
import { draftBudget, propSelection, RAID_MODES } from './expansion-modes.mjs';
import {validPreset,canCustomizeMode,pickTeam} from './z5-lobby-custom.mjs';
import { pairRanked, makeVeto, banField } from './expansion-ranked.mjs';

const letters = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const idleTime = 15 * 60 * 1000;
const isOmanWeekend=now=>[5,6].includes(new Date(now+4*3600000).getUTCDay());
const maxRooms = 80;
const maxQueue = 200;
const passwordKey = (value,salt) => scryptSync(value,salt,32,{N:1024,r:8,p:1});
const readPassword = value => typeof value === 'string' && value.length <= 64 ? value : '';

export function createOverdrive({client, send, store, fail, allowed, leaveLegacy, cleanChat, clock=Date.now, onError=console.error, onSettled=()=>{}, clanOf=()=>null,onLiveInput=()=>{},onLiveRejected=()=>{},onLiveFrame=()=>{},onLiveEnd=()=>{},onLiveStart=()=>{},loadEvolutionLevels=()=>new Map(),canSendSnapshot=()=>true,loadCuratorField=null}) {
  const rooms = new Map();
  const membership = new Map();
  const queue = new Map();
  let nextMatchmaking=0;
  const emit = (id,type,fields={}) => send(client(id),{type:'z2:'+type,...fields});
  const demand = (condition,status,message) => { if(!condition) throw fail(status,message); };

  function code() {
    let result;
    do {result=Array.from({length:6},()=>letters[randomInt(letters.length)]).join('');}
    while(rooms.has(result));
    return result;
  }

  function teamCount(room) {return room.squad||RAID_MODES.includes(room.mode)?1:room.tournament?.teams||2;}
  function capacity(room) { return room.size*teamCount(room); }
  function players(room) { return [...room.members.values()].filter(p=>!p.spectator); }
  function filled(room) {
    return Array.from({length:teamCount(room)},(_,i)=>
      players(room).filter(p=>p.team===i).length===room.size).every(Boolean);
  }

  function lobby(room) {
    const tournament=room.tournament;
    const veto=room.veto&&{...room.veto,remaining:Math.max(0,room.veto.deadline-clock())};
    return {code:room.ranked?'':room.code,host:room.host,mode:room.mode,size:room.size,
      limit:room.limit,ranked:room.ranked,locked:room.locked,capacity:capacity(room),
      password:!!room.secret,expires:room.expires,phase:room.phase,veto,squad:room.squad,
      preset:room.preset,draftTeams:room.draftTeams,curator:room.field.curator===true,
      clanWar:room.clanTeams?.every(Boolean)?room.clanTeams.map(id=>({id})):undefined,
      members:[...room.members.values()].map(({id,name,team,spectator,draft,away,ready})=>
        ({id,name,team,spectator,draft,away:!!away,ready:!!ready})),
      votes:[...room.votes],tournament:tournament&&{
        teams:tournament.teams,matches:tournament.bracket.map(({a,b,winner,mvp,score})=>({a,b,winner,mvp,score})),
        index:tournament.index,champion:tournament.champion
      }};
  }
  function broadcast(room,type,body,filter=()=>true) {
    for(const p of room.members.values()) if(filter(p)) emit(p.id,type,body);
  }
  function publish(room) {broadcast(room,'lobby',lobby(room));}
  function clearRoom(room,reason) {
    if(room.squad)cancelEntry(queue.get('s:'+room.code),reason);
    rooms.delete(room.code);
    for(const id of room.members.keys()){
      if(membership.get(id)===room)membership.delete(id);
      emit(id,'left',{reason});
    }
  }
  function roomFor(id) {return membership.get(id);}
  function space(room, team, ignore) {
    return players(room).filter(p=>p.team===team&&p.id!==ignore).length<room.size;
  }
  function availableTeam(room,id) {
    const teams=Array.from({length:teamCount(room)},(_,i)=>i);
    return teams.filter(t=>space(room,t,id)).sort((a,b)=>
      players(room).filter(p=>p.team===a).length-players(room).filter(p=>p.team===b).length)[0];
  }

  function drop(id,now,reason='Left the lobby.') {
    if(queue.delete(id))emit(id,'queue',{waiting:false});
    const room=roomFor(id);
    if(!room)return;
    if(room.squad)cancelEntry(queue.get('s:'+room.code),'The squad changed. Ready up to search again.');
    membership.delete(id);
    room.members.delete(id);
    if(room.mode==='clanwar'&&room.clanTeams?.[1]&& !players(room).some(p=>p.team===1))room.clanTeams[1]=null;
    room.votes.delete(id);
    setOffline(room.match,id,now,true);
    if(room.host===id)room.host=players(room)[0]?.id??null;
    emit(id,'left',{reason});
    if(room.phase==='veto')clearRoom(room,'Ranked lobby closed before the match started.');
    else if(!room.members.size&&!room.match)clearRoom(room,reason);
    else publish(room);
  }

  function add(room,c,user,team,spectator=false) {
    leaveLegacy(c);
    queue.delete(c.id);
    const member={id:c.id,name:user.name,team,spectator,draft:'knight',away:0,ready:false,
      clan:room.mode==='clanwar'?clanOf(user.id)?.clan:null};
    room.members.set(c.id,member);
    membership.set(c.id,room);
    return member;
  }

  function buildRoom({host=null,mode,size,limit,ranked=false,tournament=null,secret=null,squad=null,modern=false,preset='classic',draftTeams=false},now) {
    const room={code:code(),phase:'lobby',host,mode,size,limit,ranked,tournament,secret,
      locked:false,expires:now+idleTime,members:new Map(),votes:new Set(),match:null,result:null,
      squad,modern,field:FIELD,veto:null,preset,draftTeams,clanTeams:mode==='clanwar'?[null,null]:null};
    rooms.set(room.code,room);
    return room;
  }

  function announceMatch(room,member) {
    const match=room.match;
    if(!match)return;
    const self=match.players.get(member.id);
    emit(member.id,'begin',{id:match.id,mode:match.mode,ranked:!!match.season,team:self?.team??null,
      roster:[...match.players.values()].map(({id,name,team,draft})=>({id,name,team,draft})),
      field:match.field,limit:match.limit,match:room.tournament?.index??null,clanWar:match.clanWar||null,preset:match.preset});
    const connection=client(member.id);
    if(connection)send(connection,snapshot(match,member.id,clock(),connection.compactState));
  }

  function start(room,now,contestants) {
    if(room.mode==='worldboss')demand(isOmanWeekend(now),403,'World Boss battles unlock Friday and Saturday, Oman time.');
    const seats=contestants||players(room);
    const weaponLevels=room.field.curator?null:loadEvolutionLevels(seats.map(player=>player.id));
    room.match=makeMatch({id:randomUUID(),mode:room.mode,season:room.ranked?seasonAt(now):null,
      limit:room.limit,players:seats,now,tournament:!!room.tournament,field:room.field,remake:room.modern,preset:room.preset,weaponLevels});
    if(room.mode==='clanwar'){
      const clans=room.clanTeams;
      demand(clans?.[0]&&clans?.[1]&&clans[0]!==clans[1]&&seats.every(p=>p.clan===clans[p.team]&&clanOf(p.id)?.clan===p.clan),
        409,'Clan War requires two distinct verified clans.');
      room.match.clanWar={clans:clans.slice()};
    }
    for(const p of seats)if(p.away)setOffline(room.match,p.id,p.away);
    room.phase='playing';room.result=null;room.votes.clear();room.veto=null;
    onLiveStart({matchId:room.match.id,code:room.code,host:room.host,mode:room.mode});
    publish(room);
    for(const member of room.members.values())announceMatch(room,member);
  }

  function advanceTournament(room,now) {
    const t=room.tournament;
    const current=t.bracket[t.index];
    if(!current)return;
    const available = team => players(room).filter(p=>p.team===team&&!p.away);
    const a=available(current.a),b=available(current.b);
    if(!a.length||!b.length){
      tournamentResult(room,a.length?current.a:b.length?current.b:Math.min(current.a,current.b),
        [Number(!!a.length),Number(!!b.length)],null,now,!!(a.length||b.length));
      return;
    }
    const sides=[a,b].flatMap((group,team)=>group.map(p=>({...p,team})));
    start(room,now,sides);
  }

  function tournamentResult(room,winner,score,mvp,now,awardable=true) {
    const t=room.tournament, match=t.bracket[t.index];
    Object.assign(match,{winner,score,mvp});
    const n=t.teams-1;
    room.phase='results';
    if(t.index===n-1){
      t.champion=winner;
      if(awardable)for(const p of players(room))if(p.team===winner)store.giveAward(p.id,'Overdrive Cup Champion',now);
    } else {
      t.winners.push(winner);
      t.index++;
      if(t.index===t.bracket.length){
        for(let i=0;i<t.winners.length;i+=2)t.bracket.push({a:t.winners[i],b:t.winners[i+1],winner:null});
        t.winners=[];
      }
      t.next=now+7500;
    }
    publish(room);
  }

  function startTournament(room,now) {
    const t=room.tournament;
    t.bracket=Array.from({length:t.teams/2},(_,i)=>({a:i*2,b:i*2+1,winner:null}));
    t.winners=[];t.index=0;
    advanceTournament(room,now);
  }

  function create(c,user,data,now) {
    demand(rooms.size<maxRooms,503,'All lobby slots are in use.');
    const tournament=[4,8].includes(data.teams)?{teams:data.teams,bracket:[],index:0,champion:null,next:0}:null;
    const squad=data.squad===true&&!tournament?{queued:false}:null;
    const mode=tournament||squad?'arena':data.mode;
    demand(MODES.includes(mode),400,'Choose a supported match mode.');
    if(mode==='worldboss')demand(isOmanWeekend(now),403,'World Boss weekends run Friday and Saturday, Oman time.');
    const size=['chess','gungame','onechamber','bounty','parkour','roulette'].includes(mode)?1:mode==='jeep'?2:data.size;
    const sizes=tournament?[1,2]:RAID_MODES.includes(mode)?[2,3,4]:mode==='rescue'||squad?[2,3,5]:TEAM_SIZES;
    demand(sizes.includes(size),400,'Choose a supported team size.');
    const preset=data.preset??'classic';
    demand(validPreset(preset),400,'Choose a supported casual rule preset.');
    demand(preset==='classic'||(!tournament&&!squad&&canCustomizeMode(mode)),400,'Custom rules are for supported unranked casual modes only.');
    const draftTeams=data.draftTeams===true;
    demand(!draftTeams||(!tournament&&!squad&&canCustomizeMode(mode)&&size>=2),400,'Team draft requires a two-sided casual lobby.');
    const limit=data.limit??15;
    demand(Number.isInteger(limit)&&limit>=1&&limit<=50,400,'Choose a kill limit from 1 to 50.');
    const password=readPassword(data.password);
    demand(!data.password||password.length>=4,400,'Use a room password of 4–64 characters.');
    const custom=data.curatorId!==undefined;
    demand(!custom||(mode==='arena'&&!tournament&&!squad&&preset==='classic'&&!draftTeams&&password.length>=4&&typeof loadCuratorField==='function'),400,'Curator FPS requires a password-protected classic Arena lobby.');
    const customField=custom?loadCuratorField(user,data.curatorId):null;
    const salt=password?randomBytes(16):null;
    const secret=password?{salt,key:passwordKey(password,salt)}:null;
    demand(!['playing','veto'].includes(roomFor(c.id)?.phase),409,'Leave your active match first.');
    drop(c.id,now);
    if(mode==='clanwar'){
      demand(!tournament&&!squad,400,'Clan Wars use two verified clan teams, not tournament or squad matchmaking.');
      demand(!!clanOf(user.id),403,'Join a clan before hosting a Clan War.');
    }
    const room=buildRoom({host:c.id,mode,size,limit,tournament,secret,squad,preset,draftTeams},now);
    if(customField)room.field=customField;
    if(mode==='clanwar')room.clanTeams[0]=clanOf(user.id).clan;
    add(room,c,user,0);
    publish(room);
  }

  function join(c,user,data,now) {
    demand(allowed('z2-join:'+c.id,10,60000),429,'Wait a minute before trying more codes.');
    const key=typeof data.code==='string'?data.code.trim().toUpperCase():'';
    const room=rooms.get(key);
    demand(room&&!room.ranked&&room.expires>now,404,'That match code is unavailable.');
    if(room===roomFor(c.id)){publish(room);return;}
    const spectator=data.spectate===true;
    demand(!room.locked&&!room.squad?.queued&&(room.phase==='lobby'||(spectator&&room.tournament)),409,'This lobby is closed to new players.');
    if(room.secret){
      const pass=readPassword(data.password);
      demand(timingSafeEqual(passwordKey(pass,room.secret.salt),room.secret.key),403,'Incorrect match password.');
    }
    demand(!spectator||room.tournament,400,'Spectating is available in tournaments.');
    const verifiedClan=room.mode==='clanwar'?clanOf(user.id):null;
    if(room.mode==='clanwar')demand(!spectator&&!!verifiedClan,403,'Clan Wars require an active clan membership.');
    const team=room.mode==='clanwar'?(verifiedClan?.clan===room.clanTeams[0]?0:
      !room.clanTeams[1]||verifiedClan?.clan===room.clanTeams[1]?1:undefined):spectator?null:availableTeam(room,c.id);
    demand(spectator?room.members.size-players(room).length<6:team!==undefined&&space(room,team,c.id),409,'This lobby is full.');
    demand(!['playing','veto'].includes(roomFor(c.id)?.phase),409,'Leave your active match first.');
    drop(c.id,now);
    const member=add(room,c,user,team,spectator);
    if(room.mode==='clanwar'&&team===1&&!room.clanTeams[1])room.clanTeams[1]=verifiedClan.clan;
    room.expires=now+idleTime;
    publish(room);
    if(room.phase==='playing')announceMatch(room,member);
    if(room.phase==='results'&&room.result)emit(c.id,'result',room.result);
  }

  function cancelEntry(entry,reason) {
    if(!entry||!queue.delete(entry.id))return;
    for(const member of entry.members)emit(member.id,'queue',{waiting:false,reason});
    if(entry.room){entry.room.squad.queued=false;publish(entry.room);}
  }

  function matchmaking(now) {
    if(now<nextMatchmaking)return;
    nextMatchmaking=now+1000;
    const season=seasonAt(now);
    for(const entry of queue.values())if(now-entry.since>600000||entry.members.some(p=>!client(p.id)))
      cancelEntry(entry,'Ranked search ended. Ready up to search again.');
    for(const size of TEAM_SIZES){
      let list=[...queue.values()].filter(p=>p.size===size);
      const ratings=new Map();
      const points=id=>{if(!ratings.has(id))ratings.set(id,store.rating(id,season).points);return ratings.get(id);};
      while(list.reduce((sum,e)=>sum+e.members.length,0)>=size*2&&rooms.size<maxRooms){
        const pairing=pairRanked(list,size,now,points);
        if(!pairing){list.shift();continue;}
        const modern=pairing.entries.every(entry=>entry.modern);
        const room=buildRoom({mode:'arena',size,limit:size===1?10:25,ranked:true,modern},now);
        for(const entry of pairing.entries){
          queue.delete(entry.id);
          if(entry.room)rooms.delete(entry.room.code);
        }
        pairing.sides.forEach((side,team)=>side.forEach(p=>{
          add(room,client(p.id),p,team);emit(p.id,'queue',{waiting:false});
        }));
        list=list.filter(entry=>!pairing.entries.includes(entry));
        if(modern){
          room.veto=makeVeto(players(room),now);room.phase='veto';publish(room);
        }else start(room,now);
      }
    }
  }

  function queuePlayer(c,user,data,now) {
    if(data.join===false){
      const room=roomFor(c.id);
      if(room?.squad?.queued){cancelEntry(queue.get('s:'+room.code),'Squad search cancelled.');return;}
      queue.delete(c.id);emit(c.id,'queue',{waiting:false});return;
    }
    demand(TEAM_SIZES.includes(data.size),400,'Choose a ranked team size.');
    demand(!roomFor(c.id),409,'Leave your lobby before joining ranked.');
    demand(queue.has(c.id)||queue.size<maxQueue,503,'The ranked queue is full.');
    if(queue.get(c.id)?.size!==data.size)queue.set(c.id,{id:c.id,members:[{id:c.id,name:user.name}],
      size:data.size,since:now,modern:data.revision===3});
    emit(c.id,'queue',{waiting:true,size:data.size});
  }

  function submitVeto(room,map,now) {
    const choice=banField(room.veto,map,now);
    demand(choice,400,'Choose an available arena.');
    if(choice.field){room.field=choice.field;start(room,now);}
    else publish(room);
  }

  function packet(c,user,data) {
    const now=clock(), action=data.type.slice(3);
    if(action==='echo'){emit(c.id,'echo',{value:Number.isFinite(data.value)?data.value:0});return;}
    if(action==='create'){
      demand(allowed('z2-create:'+c.id,6,60000),429,'Wait before creating another lobby.');
      create(c,user,data,now);return;
    }
    if(action==='join'){join(c,user,data,now);return;}
    if(action==='queue'){queuePlayer(c,user,data,now);return;}
    if(action==='leave'){drop(c.id,now);return;}
    const room=roomFor(c.id);
    if(action==='input'){
      if(room?.phase==='playing'){
        const p=room.match.players.get(c.id);
        if(inputMatch(room.match,c.id,data,now))onLiveInput(c.id,data,now);
        else if(p&&!p.offlineAt&&!p.forfeited&&!room.match.result){
          const malformed=!Number.isSafeInteger(data.seq)||data.seq<0||data.seq>2147483647||
            ![data.f,data.s,data.yaw,data.pitch].every(Number.isFinite)||
            !Number.isInteger(data.weapon)||data.weapon<0||data.weapon>3;
          // Duplicate or stale sequence numbers alone are ordinary network behavior.
          if(malformed)onLiveRejected(c.id,'invalid-input',now);
          else if(data.seq>p.seq&&p.rx5InputCount>=120)onLiveRejected(c.id,'input-flood',now);
        }
      }
      return;
    }
    if(action==='resync'){attach(c);return;}
    demand(room,404,'Join a multiplayer lobby first.');
    const member=room.members.get(c.id);
    if(action==='veto'){
      demand(room.phase==='veto'&&now<room.veto.deadline&&room.veto.captains[room.veto.turn]===c.id,
        403,'Wait for your captain’s turn.');
      submitVeto(room,data.map,now);return;
    }
    if(action==='squad-ready'){
      demand(room.squad&&!room.squad.queued,409,'The ready check is unavailable during matchmaking.');
      member.ready=data.ready===true;publish(room);return;
    }
    if(action==='squad-queue'){
      demand(room.squad&&room.host===c.id,403,'Only the squad leader can start a search.');
      demand(filled(room)&&players(room).every(p=>p.ready&&!p.away),409,'Fill the squad and have everyone ready up.');
      const id='s:'+room.code;
      demand(queue.has(id)||queue.size<maxQueue,503,'The ranked queue is full.');
      if(!queue.has(id))queue.set(id,{id,room,members:players(room),size:room.size,since:now,modern:true});
      room.squad.queued=true;
      for(const p of players(room))emit(p.id,'queue',{waiting:true,size:room.size});
      publish(room);return;
    }
    if(action==='budget'||action==='prop'){
      const match=room.match,p=match?.players.get(c.id);
      const saved=room.phase==='playing'&&(action==='budget'
        ? draftBudget(match,p,data.weapon,now):propSelection(match,p,data.prop));
      demand(saved,409,action==='budget'?'That weapon exceeds the team budget or the draft is closed.':'Choose a disguise during hiding time.');
      return;
    }
    if(action==='ping'){
      const message=room.phase==='playing'&&tacticalPing(room.match,c.id,data.kind,now);
      if(message)broadcast(room,'ping',message,p=>room.match.players.get(p.id)?.team===message.team);
      return;
    }
    if(action==='chat'){
      demand(!store.muted(c.id,now),403,'Your chat is muted.');
      demand(allowed('chat:'+c.id,12,10000),429,'You are sending messages too quickly.');
      broadcast(room,'chat',{from:member.name,body:cleanChat(data.body)});
      return;
    }
    if(action==='draft'){
      demand(room.mode==='chess'&&room.phase!=='playing'&&!member.spectator&&DRAFTS.includes(data.piece),400,'Choose a chess role between matches.');
      member.draft=data.piece;publish(room);return;
    }
    if(action==='rematch'){
      demand(room.phase==='results'&&!room.ranked&&!room.tournament&&!member.spectator,409,'Rematch voting is unavailable.');
      room.votes.add(c.id);publish(room);
      if(filled(room)&&players(room).every(p=>room.votes.has(p.id)&&!p.away))start(room,now);
      return;
    }
    if(action==='team'){
      demand(room.phase==='lobby'&&!room.ranked&&!member.spectator&&room.mode!=='clanwar'&&!room.draftTeams,409,'Teams are locked.');
      const team=data.team;
      demand(Number.isInteger(team)&&team>=0&&team<teamCount(room)&&space(room,team,c.id),
        409,'That team is unavailable.');
      member.team=team;room.expires=now+idleTime;publish(room);return;
    }
    if(action==='pickteam'){
      demand(pickTeam(room,user,data.id,data.team),403,'Host-managed team drafting is not available for this pick.');
      room.expires=now+idleTime;publish(room);return;
    }
    demand(c.id===room.host&&!room.ranked,403,'Only the lobby host can do that.');
    if(action==='lock'){room.locked=data.locked===true;publish(room);return;}
    if(action==='remove'){
      demand(room.phase!=='playing'&&room.members.has(data.id)&&data.id!==c.id,409,'That player cannot be removed.');
      drop(data.id,now,'The host removed you from this lobby.');return;
    }
    if(action==='start'){
      demand(!room.squad,409,'Use the squad ranked search.');
      demand(room.phase==='lobby'&&filled(room)&&players(room).every(p=>!p.away),409,'Fill all team seats before starting.');
      if(room.tournament)startTournament(room,now);else start(room,now);
      return;
    }
    throw fail(400,'Unknown Overdrive action.');
  }

  function routedEvents(room) {
    const match=room.match;
    for(const event of match.events.splice(0)){
      const {type,only,team,...body}=event;
      broadcast(room,type.slice(3),body,member=>{
        const recipient=match.players.get(member.id);
        if(only!=null)return member.id===only;
        if(type==='z2:shot'){
          return !match.season||recipient?.team===team||
            (recipient&&canSee(recipient,match.players.get(body.origin),match.field));
        }
        return team==null||recipient?.team===team;
      });
    }
  }

  function settle(room,now) {
    const result=room.match.result;
    const custom=room.match.field.curator===true;
    const deltas=custom?[]:store.settle(result,now);
    // Rewards are server-generated and idempotent. A rewards error must not end a match.
    if(!custom)try{onSettled(result,now);}catch(error){onError(error);}
    room.result={...result,deltas,...(custom?{curator:true}: {})};
    try{onLiveEnd(room.match.id,custom?{...result,curator:true}:result);}catch(error){onError(error);}
    room.expires=now+Math.min(idleTime,180000);
    if(room.tournament){
      const t=room.tournament, current=t.bracket[t.index], recordedWinner=result.winner===1?current.b:current.a;
      tournamentResult(room,recordedWinner,result.score,result.mvp,now);
    }else{room.phase='results';publish(room);}
    broadcast(room,'result',room.result);
  }

  function tick() {
    const now=clock();
    matchmaking(now);
    for(const room of rooms.values()){
      try{
        for(const member of [...room.members.values()]){
          if(member.away&&member.away+ROOM_GRACE<=now&&room.phase!=='playing')drop(member.id,now);
        }
        if(!rooms.has(room.code))continue;
        if(room.phase!=='playing'&&room.expires<=now){clearRoom(room,'This match code expired.');continue;}
        if(room.phase==='veto'&&room.veto.deadline<=now)submitVeto(room,room.veto.pool[0].id,now);
        if(room.tournament?.next&&room.tournament.next<=now){room.tournament.next=0;advanceTournament(room,now);}
        if(room.phase!=='playing')continue;
        const match=room.match;
        updateMatch(match,now);
        routedEvents(room);
        if(match.result){settle(room,now);continue;}
        for(const p of [...room.members.values()])if(p.away&&p.away+ROOM_GRACE<=now)drop(p.id,now);
        if(match.tick%2===0){
          const frame=prepareSnapshot(match);
          onLiveFrame({matchId:match.id,code:room.code,host:room.host,mode:room.mode,match,frame,now});
          for(const p of room.members.values())if(!p.away){
            const connection=client(p.id);
            if(connection&&canSendSnapshot(connection))send(connection,snapshot(match,p.id,now,connection.compactState,frame));
          }
        }
      }catch(error){
        onError(error);
        clearRoom(room,'The match ended after a server error.');
      }
    }
  }

  function attach(c,reset=false) {
    const room=roomFor(c.id), member=room?.members.get(c.id), now=clock();
    if(!member){emit(c.id,'left',{reason:''});return;}
    if(member.away&&member.away+ROOM_GRACE<=now){drop(c.id,now,'The reconnect window expired.');return;}
    member.away=0;
    if(reset&&room.match?.players.has(c.id))restorePlayer(room.match,c.id);
    publish(room);
    if(room.phase==='playing')announceMatch(room,member);
    if(room.phase==='results'&&room.result)emit(c.id,'result',room.result);
  }

  function disconnect(c) {
    queue.delete(c.id);
    const room=roomFor(c.id), member=room?.members.get(c.id);
    if(!member)return;
    member.away=clock();
    if(room.squad){member.ready=false;cancelEntry(queue.get('s:'+room.code),'A squad member disconnected.');}
    setOffline(room.match,c.id,member.away);
    publish(room);
  }

  // Only publicly joinable rooms are discoverable; private codes are never exposed.
  function browse({mode='',size=null}={}){
    const now=clock(),filter=typeof mode==='string'?mode.slice(0,32):'';
    return [...rooms.values()].filter(r=>!r.ranked&&!r.secret&&!r.locked&&!r.squad &&
      r.phase==='lobby'&&r.expires>now&&players(r).length<capacity(r)&&(!filter||r.mode===filter) &&
      (size==null||r.size===size)).slice(0,30).map(r=>({
        code:r.code,mode:r.mode,size:r.size,players:players(r).length,capacity:capacity(r),
        expires:r.expires,phase:r.phase
      }));
  }
  function statistics(){
    return {rooms:rooms.size,activeMatches:[...rooms.values()].filter(r=>r.phase==='playing').length,
      queuedPlayers:queue.size};
  }

  const timer=setInterval(tick,50);
  timer.unref();
  const roomInfo=id=>{const room=roomFor(id);return room?{code:room.code,matchId:room.match?.id??null,host:room.host,phase:room.phase,mode:room.mode,size:room.size}:null;};
  return {packet,attach,disconnect,drop,browse,statistics,roomInfo,inRoom:id=>!!roomFor(id),close:()=>clearInterval(timer)};
}
