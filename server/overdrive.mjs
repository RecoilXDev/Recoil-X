import { randomInt, randomUUID, scryptSync, timingSafeEqual, randomBytes } from 'node:crypto';
import {
  TEAM_SIZES, MODES, DRAFTS, FIELD, ROOM_GRACE, makeMatch, inputMatch,
  setOffline, restorePlayer, updateMatch, prepareSnapshot, snapshot, tacticalPing, canSee
} from './overdrive-match.mjs';
import { seasonAt } from './overdrive-store.mjs';
import { draftBudget, propSelection } from './expansion-modes.mjs';
import { pairRanked, makeVeto, banField } from './expansion-ranked.mjs';

const letters = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const idleTime = 15 * 60 * 1000;
const maxRooms = 80;
const maxQueue = 200;
const passwordKey = (value,salt) => scryptSync(value,salt,32,{N:1024,r:8,p:1});
const readPassword = value => typeof value === 'string' && value.length <= 64 ? value : '';

import {ASC_MODES, COOP, INPUTS, rulesFor, worldWeekend} from './ascension-world.mjs';
import {ascAction} from './overdrive-match.mjs';
import {wireSnapshot,delivered,compatibleGroups,movementSignal,checkTravel} from './ascension-network.mjs';

export function createOverdrive({client, send, store, ascStore, fail, allowed, leaveLegacy, cleanChat, clock=Date.now, onError=console.error}) {
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

  function teamCount(room) {return room.squad||room.mode==='raid'||COOP.includes(room.mode)?1:room.tournament?.teams||2;}
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
      rules:room.rules,listed:room.listed,war:room.war,drafting:room.drafting,password:!!room.secret,expires:room.expires,phase:room.phase,veto,squad:room.squad,
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
    if(room.drafting&&room.phase==='lobby'){
      room.drafting=null;players(room).filter(p=>p.id!==id).forEach((p,i)=>{p.team=i%2;p.ready=false;});
    }
    membership.delete(id);
    room.members.delete(id);
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
    const member={id:c.id,name:user.name,team,spectator,draft:'knight',away:0,ready:false};
    room.members.set(c.id,member);
    membership.set(c.id,room);
    return member;
  }

  function buildRoom({host=null,mode,size,limit,ranked=false,tournament=null,secret=null,squad=null,modern=false},now) {
    const room={code:code(),phase:'lobby',host,mode,size,limit,ranked,tournament,secret,
      locked:false,expires:now+idleTime,members:new Map(),votes:new Set(),match:null,result:null,
      squad,modern,field:FIELD,veto:null};
    rooms.set(room.code,room);
    return room;
  }

  function broadcastAnchor(match,member,now){
    const allowed=[...match.players.values()].filter(p=>p.team===0&&!p.forfeited);
    const live=allowed.filter(p=>p.hp>0&&!p.offlineAt);
    return live.find(p=>p.id===member.camera)||live.find(p=>match.focus?.id===p.id&&match.focus.until>now)||
      live[Math.floor((now-match.started)/5000)%Math.max(1,live.length)]||allowed[0];
  }
  function sendView(c,match,member,now,frame){
    const anchor=member.spectator?broadcastAnchor(match,member,now):null;
    if(member.spectator&&!anchor)return;
    const view=snapshot(match,member.id,now,c.compactState,frame,anchor);
    const packet=wireSnapshot(c,view);
    if(send(c,packet)!==false)delivered(c,packet);
  }
  function announceMatch(room,member) {
    const match=room.match;
    if(!match)return;
    const self=match.players.get(member.id);
    emit(member.id,'begin',{id:match.id,mode:match.mode,ranked:!!match.season,team:self?.team??null,
      roster:[...match.players.values()].map(({id,name,team,draft})=>({id,name,team,draft})),
      field:match.field,ascRules:room.rules,limit:match.limit,match:room.tournament?.index??null});
    const connection=client(member.id);
    if(connection){connection.ascKey=null;sendView(connection,match,member,clock());}
  }

  function start(room,now,contestants) {
    const seats=contestants||players(room);
    const matchId=randomUUID();
    if(room.war)ascStore.startWar(room.war,matchId,seats,now);
    room.match=makeMatch({id:matchId,rules:room.rules,mode:room.mode,season:room.ranked?seasonAt(now):null,
      limit:room.limit,players:seats,now,tournament:!!room.tournament,field:room.field,remake:room.modern});
    if(room.war)room.match.asc.war=room.war;
    for(const p of seats)if(p.away)setOffline(room.match,p.id,p.away);
    room.phase='playing';room.result=null;room.votes.clear();room.veto=null;
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
    const size=mode==='chess'||mode==='roulette'?1:mode==='jeep'?2:data.size;
    const sizes=tournament?[1,2]:mode==='titan'||mode==='worldboss'?[2,3,4]:COOP.includes(mode)?[1,2,3,4]:mode==='raid'?[2,3,4]:mode==='rescue'||squad?[2,3,5]:TEAM_SIZES;
    demand(sizes.includes(size),400,'Choose a supported team size.');
    const limit=data.limit??15;
    demand(Number.isInteger(limit)&&limit>=1&&limit<=50,400,'Choose a kill limit from 1 to 50.');
    let rules;
    if(ASC_MODES.includes(mode)){try{rules=rulesFor(data.rules);}catch(e){throw fail(400,e.message);}
      demand(mode!=='worldboss'||worldWeekend(now),409,'World Boss Weekends open on Friday and Saturday in Oman.');}
    const war=data.war||null;
    if(war)demand(rules&&!COOP.includes(mode)&&ascStore?.warTeam(war,c.id,now)===0,403,'Only the registered home clan may host this war.');
    const password=readPassword(data.password);
    demand(!data.password||password.length>=4,400,'Use a room password of 4–64 characters.');
    const salt=password?randomBytes(16):null;
    const secret=password?{salt,key:passwordKey(password,salt)}:null;
    demand(!['playing','veto'].includes(roomFor(c.id)?.phase),409,'Leave your active match first.');
    drop(c.id,now);
    const room=buildRoom({host:c.id,mode,size,limit,tournament,secret,squad},now);
    room.rules=rules;room.war=war;room.listed=data.listed===true&&!secret&&!squad&&!war;
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
    demand(!room.locked&&!room.squad?.queued&&(room.phase==='lobby'||(spectator&&(room.tournament||room.rules))),409,'This lobby is closed to new players.');
    if(room.secret){
      const pass=readPassword(data.password);
      demand(timingSafeEqual(passwordKey(pass,room.secret.salt),room.secret.key),403,'Incorrect match password.');
    }
    demand(!room.drafting,409,'The draft has started.');
    demand(!spectator||room.tournament||room.rules,400,'Spectating is available in tournaments.');
    const team=spectator?null:room.war?ascStore.warTeam(room.war,c.id,now):availableTeam(room,c.id);
    if(room.war)demand(!spectator&&[0,1].includes(team)&&space(room,team,c.id),403,'This seat belongs to a registered clan.');
    demand(spectator?room.members.size-players(room).length<6:team!==undefined,409,'This lobby is full.');
    demand(!['playing','veto'].includes(roomFor(c.id)?.phase),409,'Leave your active match first.');
    drop(c.id,now);
    const member=add(room,c,user,team,spectator);
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
      for(const group of compatibleGroups([...queue.values()].filter(p=>p.size===size))){
      let list=group.filter(e=>queue.has(e.id));
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
    const pref=INPUTS.includes(data.input)?data.input:'any';
    const device=INPUTS.includes(data.device)&&data.device!=='any'?data.device:'unknown';
    demand(pref==='any'||pref===device,400,'Select your current input or enable cross-input matchmaking.');
    if(queue.get(c.id)?.size!==data.size||queue.get(c.id)?.pref!==pref||queue.get(c.id)?.device!==device)queue.set(c.id,{id:c.id,members:[{id:c.id,name:user.name}],
      size:data.size,since:now,pref,device,modern:data.revision===3});
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
    if(action==='rooms'){
      demand(allowed('asc-browse:'+c.id,30,60000),429,'Wait before refreshing.');
      emit(c.id,'rooms',{list:[...rooms.values()].filter(r=>r.listed&&!r.locked&&!r.secret&&r.phase==='lobby'&&!r.drafting)
        .filter(r=>!data.mode||r.mode===data.mode).map(r=>({code:r.code,mode:r.mode,map:r.rules?.map||r.field.id,
          players:players(r).length,slots:capacity(r)-players(r).length}))});return;
    }
    if(action==='create'){
      demand(allowed('z2-create:'+c.id,6,60000),429,'Wait before creating another lobby.');
      create(c,user,data,now);return;
    }
    if(action==='join'){join(c,user,data,now);return;}
    if(action==='queue'){queuePlayer(c,user,data,now);return;}
    if(action==='leave'){drop(c.id,now);return;}
    const room=roomFor(c.id);
    if(action==='input'){if(room?.phase==='playing'){
      if(movementSignal(data,c.movement??={},now))ascStore?.review(c.id,'Repeated out-of-range movement inputs',now);
      inputMatch(room.match,c.id,data,now);
    }return;}
    if(action==='resync'){if(room?.phase==='playing'&&allowed('asc-resync:'+c.id,4,10000)){c.ascKey=null;sendView(c,room.match,room.members.get(c.id),now);}return;}
    demand(room,404,'Join a multiplayer lobby first.');
    const member=room.members.get(c.id);
    if(action==='tool'){
      demand(room.phase==='playing'&&ascAction(room.match,c.id,data,now),409,'Action unavailable or cooling down.');return;
    }
    if(action==='camera'){
      if(member.spectator&&data.id===0){member.camera=null;return;}
      const actor=room.match?.players.get(data.id);
      demand(member.spectator&&actor?.team===0&&!actor.forfeited,403,'Choose a broadcast teammate.');
      member.camera=data.id;return;
    }
    if(action==='invite-rival'){
      demand(room.host===c.id&&room.mode==='roulette'&&room.phase==='lobby'&&!room.secret,403,'Host an open Duel Roulette room to challenge a rival.');
      demand(allowed('rival:'+c.id,6,60000),429,'Wait before inviting another rival.');
      ascStore.matchCode(c.id,data.name,room.code,now);emit(c.id,'notice',{message:'Rival invitation sent'});return;
    }
    if(action==='captains'){
      demand(c.id===room.host&&room.rules?.draft&&!room.war&&room.phase==='lobby'&&filled(room)&&!room.drafting&&!COOP.includes(room.mode),409,'Fill a two-team draft lobby first.');
      const seats=players(room),second=seats.find(p=>p.id!==c.id);
      room.drafting={captains:[c.id,second.id],pool:seats.filter(p=>p!==second&&p.id!==c.id).map(p=>p.id),picks:0,turn:0};
      for(const p of seats){p.team=p.id===c.id?0:p===second?1:null;p.ready=false;}publish(room);return;
    }
    if(action==='pick'){
      const d=room.drafting;demand(room.phase==='lobby'&&d&&d.captains[d.turn]===c.id&&d.pool.includes(data.id),403,'Wait for the captain on turn.');
      room.members.get(data.id).team=d.turn;d.pool=d.pool.filter(id=>id!==data.id);d.picks++;
      const next=[0,1,1,0][d.picks%4];d.turn=space(room,next)?next:1-next;publish(room);return;
    }
    if(action==='draft-ready'){
      demand(room.phase==='lobby'&&room.drafting&&!room.drafting.pool.length&&!member.spectator,409,'Finish team selection first.');
      member.ready=data.ready===true;publish(room);return;
    }
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
      demand(room.phase==='lobby'&&!room.ranked&&!room.war&&!room.drafting&&!member.spectator,409,'Teams are locked.');
      const team=data.team;
      demand(Number.isInteger(team)&&team>=0&&team<teamCount(room)&&space(room,team,c.id),
        409,'That team is unavailable.');
      member.team=team;room.expires=now+idleTime;publish(room);return;
    }
    demand(c.id===room.host&&!room.ranked,403,'Only the lobby host can do that.');
    if(action==='lock'){room.locked=data.locked===true;publish(room);return;}
    if(action==='remove'){
      demand(room.phase!=='playing'&&room.members.has(data.id)&&data.id!==c.id,409,'That player cannot be removed.');
      drop(data.id,now,'The host removed you from this lobby.');return;
    }
    if(action==='start'){
      if(room.rules?.draft&&!COOP.includes(room.mode)&&!room.war)demand(room.drafting&&!room.drafting.pool.length&&players(room).every(p=>p.ready),409,'All drafted players must confirm.');
      if(room.mode==='worldboss')demand(worldWeekend(now),409,'The weekend event has closed.');
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
        if(member.spectator&&type==='z2:shot'){
          const anchor=broadcastAnchor(match,member,match.last);
          const origin=match.players.get(body.origin);
          return !!(anchor&&origin&&(origin.team===0||canSee(anchor,origin,match.field)));
        }
        if(only!=null)return member.id===only;
        if(type==='z2:shot'){
          const restricted=match.season||match.mode==='hardcore'||match.mode==='search'&&!recipient?.hp;
          const sight=match.mode==='search'&&!recipient?.hp?[...match.players.values()].find(p=>p.hp&&p.team===recipient?.team):recipient;
          return !restricted||recipient?.team===team||!!(sight&&canSee(sight,match.players.get(body.origin),match.field));
        }
        return team==null||recipient?.team===team;
      });
    }
  }

  function settle(room,now) {
    const result=room.match.result;
    const deltas=store.settle(result,now);
    // The per-opponent reward counters stay on the server.
    room.result={...result,players:result.players.map(({earned,...publicStats})=>publicStats),deltas};
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
        if(match.asc)for(const p of match.players.values())if(checkTravel(p,now))ascStore?.review(p.id,'Repeated movement outside the speed envelope',now);
        routedEvents(room);
        if(match.result){settle(room,now);continue;}
        for(const p of [...room.members.values()])if(p.away&&p.away+ROOM_GRACE<=now)drop(p.id,now);
        if(match.tick%2===0){
          const frame=prepareSnapshot(match);
          for(const p of room.members.values())if(!p.away){
            const connection=client(p.id);
            if(connection&&(!connection.deltaState||!connection.transport?.writableNeedDrain||match.tick%4===0))sendView(connection,match,p,now,frame);
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

  const timer=setInterval(tick,50);
  timer.unref();
  return {stats:()=>({rooms:rooms.size,playing:[...rooms.values()].filter(r=>r.phase==='playing').length,queued:queue.size}),packet,attach,disconnect,drop,inRoom:id=>!!roomFor(id),close:()=>clearInterval(timer)};
}
