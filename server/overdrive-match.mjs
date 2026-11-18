// Movement, hits, ammo, objectives and results use server time and state.
import { EXPANSION_MODES, modeState, advanceMode, ruleView, markEvent, HUNT_SCENERY } from './expansion-modes.mjs';

import {ASC_MODES,COOP,rulesFor,ascField,initWorld,ascSpawn,modeKill,heldWeapon,ruleMove,tickWorld,worldView} from './ascension-world.mjs';
import {combatAction,coverHit,reflectRay} from './ascension-combat.mjs';

export const TEAM_SIZES = [1,2,3,5];
export const MODES = ['arena','overcharge','relic','chess','rescue',...EXPANSION_MODES,...ASC_MODES];
export const DRAFTS = ['knight','rook','bishop'];
export const PINGS = ['Enemy spotted!','Need backup!','Defend here!','Attack now!'];
export const ROOM_GRACE = 20000;
export const FIELD = {
  id:'overdrive',name:'Overdrive Arena',
  half:28,
  cover:[
    {x:-10,z:-8,w:5,d:4,h:2.8},{x:10,z:8,w:5,d:4,h:2.8},
    {x:10,z:-8,w:4,d:3,h:2.15},{x:-10,z:8,w:4,d:3,h:2.15},
    {x:-16,z:0,w:4,d:5,h:2.9},{x:16,z:0,w:4,d:5,h:2.9},
    {x:0,z:-13,w:2.8,d:2.8,h:1.05},{x:0,z:13,w:2.8,d:2.8,h:1.05}
  ]
};
export const RANKED_FIELDS = [
  FIELD,
  {id:'switchyard',name:'Switchyard',half:28,cover:[
    {x:-8,z:0,w:4,d:12,h:2.5},{x:8,z:0,w:4,d:12,h:2.5},
    {x:-15,z:13,w:5,d:3,h:1.3},{x:15,z:-13,w:5,d:3,h:1.3},
    {x:1,z:10,w:4,d:3,h:2.1},{x:-1,z:-10,w:4,d:3,h:2.1}]},
  {id:'frostline',name:'Frostline',half:28,cover:[
    {x:-12,z:-9,w:5,d:6,h:2.4},{x:12,z:9,w:5,d:6,h:2.4},
    {x:12,z:-9,w:5,d:6,h:2.4},{x:-12,z:9,w:5,d:6,h:2.4},
    {x:0,z:0,w:3,d:3,h:1.9},{x:-19,z:0,w:3,d:8,h:1.2},{x:19,z:0,w:3,d:8,h:1.2}]}
];
const weapons=[
  {ammo:30,interval:122,reload:1560,damage:22,range:70,spray:0.009,pellets:1},
  {ammo:8,interval:690,reload:1830,damage:13,range:27,spray:0.078,pellets:6},
  {ammo:5,interval:1020,reload:2150,damage:76,range:106,spray:0.003,pellets:1},
  {ammo:26,interval:92,reload:1320,damage:16,range:46,spray:0.015,pellets:1}
];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const round=(v,scale)=>Math.round(v*scale)/scale;
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const neutral=()=>({f:0,s:0,fire:false,reload:false,jump:false,use:false,ability:false,sprint:false,weapon:0});
const tapActions=['fire','reload','jump','ability'];

function spawn(p, now) {
  const north=Boolean(p.team)!==Boolean(p.reversed);
  Object.assign(p,{x:p.spawnX,z:north?23:-23,yaw:north?0:Math.PI,pitch:0,
    spawnSeq:(p.spawnSeq||0)+1,
    jumpAt:0,jump:0,hp:100,down:null,spawnAt:0,shieldUntil:now+850,boost:0,readyShot:now+230,
    weapon:p.budget?3:0,loadout:p.budget?3:0,prop:0,
    ammo:weapons.map(w=>w.ammo),reloadAt:0,reloadGun:0,input:neutral(),taps:null,inputAt:now});
  ascSpawn(p);
}

export function makeMatch({id,mode,season=null,limit,players,now,tournament=false,field=FIELD,remake=false,rules={},rng=Math.random}) {
  const asc=ASC_MODES.includes(mode)?rulesFor(rules):null;
  if(asc)field=ascField(mode,asc);
  const placed=[0,0];
  const members=new Map();
  for(const record of players) {
    const p={...record,slot:placed[record.team]++,kills:0,deaths:0,damage:0,revives:0,forfeited:false,budget:mode==='budget',
      shots:0,hits:0,inputs:0,seq:-1,offlineAt:0,abilityAt:0,pingAt:0};
    p.spawnX=(p.slot-(players.filter(other=>other.team===p.team).length-1)/2)*3.65;
    spawn(p,now);
    members.set(p.id,p);
  }
  const rule=modeState(mode,now,players);
  if(mode==='jeep'){
    field={id:'rally',name:'Double Track',half:28,cover:[]};
    for(const p of members.values())Object.assign(p,{x:rule.cars[p.team].x,z:23,yaw:0});
  }
  if(mode==='escort')field={...field,cover:field.cover.filter(c=>c.x!==0)};
  if(mode==='props')field={...field,scenery:HUNT_SCENERY};
  const match={
    id,mode,season,field,rule,remake,
    limit:mode==='relic'||mode==='elimination'||mode==='budget'?3:mode==='chess'?2:mode==='hotzone'?60:mode==='jeep'?4:limit,
    players:members,started:now,
    end:now+360000,last:now,score:[0,0],result:null,roundAt:0,rng,
    relics:[0,1].map(team=>({team,x:0,z:team?24:-24,holder:null,home:true,returnAt:0})),
    power:[{x:0,z:0,ready:now},{x:-10,z:16,ready:now},{x:10,z:-16,ready:now}],
    events:[],timeline:[{at:0,kind:'start',text:'Match started',actor:null}],focus:null,lastLead:null,
    history:[],lastSample:0,finalKill:null,tick:0,tournament,overtime:false
  };
  if(asc)initWorld(match,asc,now);
  return match;
}

export function inputMatch(m,id,data,now) {
  const p=m?.players.get(id);
  if(!p||p.forfeited||p.offlineAt||m.result||!Number.isSafeInteger(data.seq)||data.seq<=p.seq||
    data.seq>2147483647||![data.f,data.s,data.yaw,data.pitch].every(Number.isFinite)||
    !Number.isInteger(data.weapon)||!weapons[data.weapon]) return false;
  const f=clamp(data.f,-1,1),s=clamp(data.s,-1,1);
  const scale=Math.max(1,Math.hypot(f,s));
  p.seq=data.seq;p.inputs++;p.inputAt=now;
  p.yaw=Math.atan2(Math.sin(data.yaw),Math.cos(data.yaw));
  p.pitch=clamp(data.pitch,-1.34,1.34);
  p.input={f:f/scale,s:s/scale,weapon:data.weapon,fire:data.fire===true,reload:data.reload===true,
    jump:data.jump===true,use:data.use===true,ability:data.ability===true,sprint:data.sprint===true};
  // A press and release can arrive together between simulation ticks.
  for(const key of tapActions)if(p.input[key])(p.taps??={})[key]=true;
  return true;
}

export function setOffline(m,id,now,immediate=false) {
  const p=m?.players.get(id);
  if(!p||m.result) return;
  p.offlineAt=immediate?now-ROOM_GRACE:now;
  p.remakeEligible=!!(m.remake&&m.season&&!immediate&&now-m.started<=45000&&m.score.every(n=>n===0));
  p.input=neutral();p.taps=null;
}

export function restorePlayer(m,id) {
  const p=m?.players.get(id);
  if(!p||p.forfeited) return false;
  p.offlineAt=0;if(p.asc)p.asc.actionSeq=-1;p.remakeEligible=false;p.seq=-1;p.input=neutral();p.taps=null;
  return true;
}

function blocked(field,x,z) {
  return field.cover.some(c=>Math.abs(x-c.x)<c.w/2+.42&&Math.abs(z-c.z)<c.d/2+.42);
}

function move(field,p,dx,dz) {
  const x=clamp(p.x+dx,-field.half+.55,field.half-.55);
  const z=clamp(p.z+dz,-field.half+.55,field.half-.55);
  if(!blocked(field,x,p.z))p.x=x;
  if(!blocked(field,p.x,z))p.z=z;
}

function intersect(point,dir,low,high,max) {
  let from=0,to=max;
  for(let i=0;i<3;i++){
    if(Math.abs(dir[i])<1e-8) {
      if(point[i]<low[i]||point[i]>high[i])return Infinity;
      continue;
    }
    const a=(low[i]-point[i])/dir[i],b=(high[i]-point[i])/dir[i];
    from=Math.max(from,Math.min(a,b));to=Math.min(to,Math.max(a,b));
    if(to<from)return Infinity;
  }
  return from;
}

function obstruction(field,start,dir,max) {
  let reach=max;
  for(const c of field.cover){
    const metres=intersect(start,dir,[c.x-c.w/2,0,c.z-c.d/2],[c.x+c.w/2,c.h,c.z+c.d/2],reach);
    if(metres<reach)reach=metres;
  }
  return reach;
}

export function canSee(a,b,field=FIELD) {
  if(!a||!b)return false;
  const eye=[a.x,1.6+a.jump,a.z];
  const line=[b.x-a.x,1.1+b.jump-eye[1],b.z-a.z];
  const length=Math.hypot(...line);
  return length<.02||obstruction(field,eye,line.map(v=>v/length),length)>=length-.02;
}

function currentRows(m) {
  return [...m.players.values()].filter(p=>!p.forfeited).map(p=>[
    p.id,round(p.x,100),round(p.z,100),round(p.yaw,1000),round(p.jump,100),
    p.hp,p.hp>0?1:p.down?2:0,p.team,p.kills,p.deaths,p.damage,p.ammo[p.weapon],
    p.reloadAt,p.boost,p.weapon,p.seq,p.revives,+!!p.offlineAt,
    m.mode==='props'&&p.team===m.rule.half?p.prop:-1,p.spawnSeq
  ]);
}

function sample(m,now) {
  if(now-m.lastSample<90)return;
  m.lastSample=now;
  m.history.push([now,currentRows(m)]);
  if(m.history.length>44)m.history.shift();
}

function dropRelic(m,p,now) {
  const relic=m.relics.find(r=>r.holder===p.id);
  if(relic){relic.holder=null;relic.home=false;relic.x=p.x;relic.z=p.z;relic.returnAt=now+16000;}
}

function resetRelic(r) {
  Object.assign(r,{x:0,z:r.team?24:-24,holder:null,home:true,returnAt:0});
}

function recordLead(m,now) {
  const lead=m.score[0]===m.score[1]?null:+(m.score[1]>m.score[0]);
  if(lead===m.lastLead)return;
  m.lastLead=lead;
  markEvent(m,now,'lead',lead===null?'Score tied':`Team ${lead+1} took the lead`,
    lead===null?null:[...m.players.values()].find(p=>p.team===lead&&p.hp>0)?.id);
}

function finish(m,winner,reason,now) {
  if(m.result)return;
  recordLead(m,now);
  markEvent(m,now,'end',reason==='remake'?'Match voided after an early disconnect':'Match ended');
  const players=[...m.players.values()].map(({id,name,team,kills,deaths,damage,revives,inputs,forfeited,shots,hits,asc})=>
    ({id,name,team,kills,deaths,damage,revives,inputs,forfeited,shots,hits,...(asc?{earned:{weaponKills:asc.weaponKills,opponents:asc.opponents,opponentWeapons:asc.opponentWeapons,
      bounty:asc.reward,bank:asc.bank,vault:asc.found,race:asc.finish}}:{})}));
  const candidates=players.filter(p=>!p.forfeited).sort((a,b)=>
    (b.kills*120+b.damage+b.revives*80)-(a.kills*120+a.damage+a.revives*80)||a.deaths-b.deaths||a.id-b.id);
  m.result={id:m.id,mode:m.mode,season:m.season,winner,reason,score:m.score.slice(),
    duration:Math.max(0,now-m.started),players,mvp:candidates[0]?.name||null,highlight:m.finalKill,
    field:m.field.name,timeline:m.timeline.slice(),...(m.asc?{war:m.asc.war,race:m.asc.scores,worldDamage:m.asc.worldDamage}:{})};
}

function eliminate(m,victim,killer,now,method='weapon') {
  victim.hp=0;victim.down=null;victim.deaths++;victim.spawnAt=now+2700;
  dropRelic(m,victim,now);
  if(!killer||killer.team===victim.team||killer.forfeited){if(m.asc)modeKill(m,victim,null,now,{finish});return;}
  killer.kills++;
  markEvent(m,now,'elimination',`${killer.name} eliminated ${victim.name}`,killer.id);
  const ids=new Set([killer.id,victim.id]);
  const replay=m.history.slice(-21).map(([at,rows])=>[at,rows.filter(row=>ids.has(row[0]))]);
  const highlight={killer:killer.id,victim:victim.id,frames:replay,
    killerName:killer.name,victimName:victim.name};
  m.finalKill=highlight;
  m.events.push({type:'z2:kill',killer:killer.name,victim:victim.name},
    {type:'z2:killcam',only:victim.id,replay:highlight});
  if(modeKill(m,victim,killer,now,{finish},method))return;
  if(['elimination','budget','props'].includes(m.mode))victim.spawnAt=0;
  if(m.mode==='relic'||m.rule)return;
  m.score[killer.team]++;
  if(m.score[killer.team]>=m.limit||m.overtime)finish(m,killer.team,'score',now);
  else if(m.mode==='chess')m.roundAt=now+2200;
}

function hit(m,shooter,victim,damage,now,method='weapon') {
  if(victim.shieldUntil>now||victim.hp<=0)return;
  const amount=Math.min(victim.hp,damage);
  victim.hp-=amount;shooter.damage+=amount;
  if(m.asc&&victim.id<0)m.asc.worldDamage+=amount;
  if(victim.id<0)return;
  if(victim.hp>0)return;
  if(m.mode==='rescue'){
    victim.down={by:shooter.id,until:now+8500,helper:null,healing:0};dropRelic(m,victim,now);
    m.events.push({type:'z2:notice',team:victim.team,message:`${victim.name} is down. Hold Use nearby to drag and revive.`});
  }else eliminate(m,victim,shooter,now,method);
}

function fire(m,p,now) {
  const w=weapons[p.weapon];
  p.ammo[p.weapon]--;
  const dual=p.asc?.dual&&[0,3].includes(p.weapon);
  const chamber=m.mode==='chamber';
  p.shots++;p.readyShot=now+(dual&&p.weapon===0?172:w.interval)*(p.boost>now?.74:1)*(dual&&p.weapon===3?.69:1);
  if(p.asc&&m.asc.rules.heat&&[0,3].includes(p.weapon)){
    p.asc.heat=Math.min(100,p.asc.heat+(dual?15:11));if(p.asc.heat>=99)p.asc.locked=true;
  }
  const eye=[p.x,1.62+p.jump,p.z];
  let end;
  const opponents=[...m.players.values()].filter(other=>other.team!==p.team&&other.hp>0&&!other.forfeited);
  if(m.mode==='raid'&&m.rule.boss.hp>0)opponents.push(m.rule.boss);
  if(m.asc)opponents.push(...m.asc.enemies.filter(e=>e.hp>0));
  let connected=false;
  for(let pellet=0;pellet<w.pellets&&!m.result;pellet++){
    const spread=w.spray*(dual?2:1);
    const yaw=p.yaw+(m.rng()-.5)*spread,pitch=p.pitch+(m.rng()-.5)*spread;
    let dir=[Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch)],start=eye,range=w.range;
    for(let leg=0;leg<2;leg++){
      let reach=range,target=null,wall=null;
      for(const c of m.field.cover){
        const d=intersect(start,dir,[c.x-c.w/2,0,c.z-c.d/2],[c.x+c.w/2,c.h,c.z+c.d/2],reach);
        if(d<reach){reach=d;wall=c;}
      }
      for(const other of opponents){
        const disguise=m.mode==='props'&&other.team===m.rule.half;
        const width=other.id<0?1.35:disguise?[.55,.4,.32][other.prop]:.45;
        const height=other.id<0?3.5:disguise?[1.05,1.23,1.4][other.prop]:1.96;
        const d=intersect(start,dir,[other.x-width,other.jump,other.z-width],[other.x+width,other.jump+height,other.z+width],reach);
        if(d<reach){reach=d;target=other;}
      }
      const point=start.map((v,i)=>v+dir[i]*reach),visible=point.map(v=>round(v,100));
      if(!end)end=visible;
      if(leg)m.events.push({type:'z2:shot',origin:p.id,team:p.team,a:start.map(v=>round(v,100)),b:visible});
      const damage=(chamber?150:w.damage)*(leg?.55:1)*(dual?.84:1);
      if(target){
        if(!connected&&target.hp>0&&!(target.shieldUntil>now)){p.hits++;connected=true;}
        hit(m,p,target,Math.ceil(damage),now);break;
      }
      coverHit(m,wall,damage);
      if(!m.asc||leg||wall?.material!=='metal')break;
      dir=reflectRay(wall,point,dir);start=point.map((v,i)=>v+dir[i]*.03);range=(range-reach)*.65;
      if(range<1)break;
    }
  }
  m.events.push({type:'z2:shot',origin:p.id,team:p.team,a:eye.map(v=>round(v,100)),b:end});
}

function reload(p,now) {
  const w=weapons[p.weapon];
  if(p.asc?.spawnMode==='chamber')return;
  if(!p.reloadAt&&p.ammo[p.weapon]<w.ammo){p.reloadAt=now+w.reload*(p.asc?.dual?1.35:1);p.reloadGun=p.weapon;}
}

function powerOrRelic(m,p,now) {
  if(m.mode==='overcharge'){
    const charge=m.power.find(cell=>cell.ready<=now&&dist(cell,p)<1.45);
    if(charge&&p.boost<now){p.boost=now+7500;charge.ready=now+13500;
      m.events.push({type:'z2:notice',only:p.id,message:'Overcharged · faster movement and fire'});}
  }
  if(m.mode!=='relic')return;
  const own=m.relics[p.team], enemy=m.relics[1-p.team];
  if(own.holder==null&&!own.home&&dist(own,p)<1.3&&p.input.use)resetRelic(own);
  if(enemy.holder==null&&dist(enemy,p)<1.3&&p.input.use){
    enemy.holder=p.id;enemy.home=false;enemy.returnAt=0;
    m.events.push({type:'z2:notice',message:`${p.name} picked up the enemy relic.`});
  }
  if(enemy.holder!==p.id)return;
  enemy.x=p.x;enemy.z=p.z;
  if(own.home&&dist(own,p)<2.25){
    m.score[p.team]++;resetRelic(enemy);
    markEvent(m,now,'capture',`${p.name} delivered the relic`,p.id);
    m.events.push({type:'z2:notice',message:`${p.name} delivered the relic.`});
    if(m.score[p.team]>=m.limit)finish(m,p.team,'relic',now);
  }
}

function draftMove(m,p,now) {
  if(p.abilityAt>now||!DRAFTS.includes(p.draft))return;
  p.abilityAt=now+4200;
  const yaw=p.yaw+(p.draft==='bishop'?Math.PI/4:0), thrust=p.draft==='rook'?5.4:3.65;
  if(p.draft==='knight')p.jumpAt=now;
  for(let i=0;i<9;i++)move(m.field,p,Math.sin(yaw)*thrust/9,-Math.cos(yaw)*thrust/9);
}

function revive(m,victim,now,dt) {
  const state=victim.down;
  if(now>=state.until){eliminate(m,victim,m.players.get(state.by),now);return;}
  const helper=[...m.players.values()].find(p=>p.hp>0&&!p.offlineAt&&p.team===victim.team&&
    p.input.use&&p.inputAt+470>=now&&dist(p,victim)<2.32);
  if(!helper){state.helper=null;state.healing=0;return;}
  if(state.helper!==helper.id){state.helper=helper.id;state.healing=0;}
  state.healing+=dt;
  const target={x:helper.x-Math.sin(helper.yaw)*1.24,z:helper.z+Math.cos(helper.yaw)*1.24};
  move(m.field,victim,clamp(target.x-victim.x,-dt*5,dt*5),clamp(target.z-victim.z,-dt*5,dt*5));
  if(state.healing>=2.15){
    victim.down=null;victim.hp=55;victim.shieldUntil=now+1050;helper.revives++;
    m.events.push({type:'z2:notice',team:helper.team,message:`${helper.name} revived ${victim.name}.`});
  }
}

export function updateMatch(m,now) {
  if(m.result)return;
  const delta=clamp((now-m.last)/1000,0,.095);
  m.last=now;m.tick++;
  // The snapshot precedes new hits, so a killcam cannot expose positions after the elimination.
  sample(m,now);
  for(const p of m.players.values()){
    if(p.offlineAt&&p.offlineAt+ROOM_GRACE<=now&&!p.forfeited){
      if(p.remakeEligible){
        p.forfeited=true;finish(m,null,'remake',now);return;
      }
      p.forfeited=true;p.hp=0;p.down=null;dropRelic(m,p,now);
    }
    if(p.inputAt+470<now||p.offlineAt){p.input=neutral();p.taps=null;}
  }
  if([...m.players.values()].some(p=>p.offlineAt&&p.remakeEligible&&!p.forfeited))return;
  const teams=[0,1].map(team=>[...m.players.values()].some(p=>p.team===team&&!p.forfeited));
  if(!teams[0]||(!teams[1]&&m.mode!=='raid'&&!COOP.includes(m.mode))){finish(m,teams[0]?0:teams[1]?1:null,'forfeit',now);return;}
  if(now>=m.end){
    if(m.mode==='raid'||COOP.includes(m.mode)){finish(m,1,'time',now);return;}
    if(m.tournament&&m.score[0]===m.score[1]&&!m.overtime){
      m.overtime=true;m.end=now+60000;
      m.events.push({type:'z2:notice',message:'Cup overtime · the next elimination wins.'});
    }else{
      const damage=[0,0];
      for(const p of m.players.values())damage[p.team]+=p.damage;
      const winner=m.score[0]!==m.score[1]?Number(m.score[1]>m.score[0]):
        m.overtime?Number(damage[1]>damage[0]):null;
      finish(m,winner,'time',now);return;
    }
  }
  if(m.roundAt){
    if(m.roundAt>now)return;
    m.roundAt=0;
    for(const p of m.players.values())if(!p.forfeited)spawn(p,now);
  }
  if(m.asc){tickWorld(m,now,delta,{finish,spawn,eliminate,move});if(m.result)return;}
  if(!advanceMode(m,now,delta,{finish,spawn,move:(p,dx,dz)=>move(m.field,p,dx,dz)})){recordLead(m,now);return;}
  for(const r of m.relics)if(r.returnAt&&r.returnAt<=now)resetRelic(r);
  for(const p of m.players.values()){
    if(m.result||m.roundAt)break;
    const taps=p.taps;
    p.taps=null;
    if(p.forfeited||p.offlineAt)continue;
    if(p.down){revive(m,p,now,delta);continue;}
    if(!p.hp){if(p.spawnAt&&p.spawnAt<=now)spawn(p,now);continue;}
    if(m.mode==='props'&&p.team!==m.rule.half&&m.rule.phase==='hide')continue;
    const input=p.input;
    const carrying=m.mode==='relic'&&m.relics.some(r=>r.holder===p.id);
    const dragging=m.mode==='rescue'&&input.use&&[...m.players.values()]
      .some(other=>other.down&&other.team===p.team&&dist(other,p)<2.3);
    const speed=(input.sprint?7.9:5.8)*(p.boost>now?1.24:1)*(carrying ? .63 : dragging ? .55 : 1);
    ruleMove(m,p,(Math.sin(p.yaw)*input.f+Math.cos(p.yaw)*input.s)*speed*delta,
      (-Math.cos(p.yaw)*input.f+Math.sin(p.yaw)*input.s)*speed*delta,delta,move);
    if((input.jump||taps?.jump)&&(!p.jumpAt||now-p.jumpAt>=790)&&!carrying&&!dragging)p.jumpAt=now;
    const low=m.asc&&(m.field.id==='orbit'||m.asc.rules.gravity==='low');
    p.jump=p.jumpAt?Math.max(0,Math.sin(Math.min(1,(now-p.jumpAt)/(low?1150:680))*Math.PI)*(low?2.15:.97)):0;
    if(m.mode==='chess'&&(input.ability||taps?.ability))draftMove(m,p,now);
    powerOrRelic(m,p,now);
    const weapon=m.mode==='budget'?p.loadout:heldWeapon(m,p,input);
    if(p.weapon!==weapon){if(p.asc&&![0,3].includes(weapon))p.asc.dual=false;p.weapon=weapon;p.readyShot=Math.max(p.readyShot,now+170);}
    if(p.reloadAt&&p.reloadAt<=now){p.ammo[p.reloadGun]=weapons[p.reloadGun].ammo;p.reloadAt=0;}
    const firing=(input.fire||taps?.fire)&&!p.asc?.locked&&!(p.asc?.stunned>now)&&m.mode!=='race';
    if(input.reload||taps?.reload||(firing&&p.ammo[p.weapon]===0))reload(p,now);
    if(firing&&!p.reloadAt&&p.readyShot<=now&&p.ammo[p.weapon]>0&&!dragging&&!m.result&&
      (m.mode!=='props'||p.team!==m.rule.half))fire(m,p,now);
  }
  recordLead(m,now);
}

// Append new fields after the original 18. Older clients decode their known prefix.
// Wire format 1 omits fields equal to these fixed defaults. Each packet stands alone.
const rowDefaults=[0,0,0,0,0,100,1,0,0,0,0,0,0,0,0,-1,0,0,-1,1];
function packRow(row) {
  const packed=[row[0],0];
  for(let i=1;i<row.length;i++)if(row[i]!==rowDefaults[i]){
    packed[1]|=1<<(i-1);
    packed.push(row[i]);
  }
  return packed;
}

export function prepareSnapshot(m) {
  const full=currentRows(m);
  return {
    actors:full.map(own=>({own,publicRow:[...own.slice(0,11),0,0,0,own[14],-1,own[16],own[17],own[18],own[19]]})),
    waitingEarly:m.remake&&[...m.players.values()].some(p=>p.offlineAt&&p.remakeEligible&&!p.forfeited)||undefined,
    roster:full.map(r=>[r[0],r[8],r[9],r[16],r[17]])
  };
}

export function snapshot(m,id,now,packed=false,frame=prepareSnapshot(m),anchor=null) {
  const viewer=m.players.get(id),eliminated=viewer&&m.mode==='search'&&!viewer.hp;
  const sight=eliminated?[...m.players.values()].find(p=>p.team===viewer.team&&p.hp>0&&!p.offlineAt):viewer||anchor;
  const rows=[];
  for(const actor of frame.actors){
    const target=m.players.get(actor.own[0]);
    if(eliminated&&!sight&&target.team!==viewer.team)continue;
    if(sight&&target.team!==sight.team&&(anchor||m.season||m.mode==='props'||m.mode==='hardcore'||eliminated)){
      if(m.mode==='props'&&m.rule.phase==='hide'&&sight.team!==m.rule.half)continue;
      if(!canSee(sight,target,m.field))continue;
    }
    if(target.id===id)rows.push(packed?(actor.packedOwn??=packRow(actor.own)):actor.own);
    else rows.push(packed?(actor.packedPublic??=packRow(actor.publicRow)):actor.publicRow);
  }
  return {type:'z2:state',id:m.id,t:now,score:m.score,remaining:Math.max(0,m.end-now),
    packed:packed?1:undefined,rows,roster:packed&&rows.length===frame.roster.length?undefined:frame.roster,
    asc:worldView(m,viewer),objective:ruleView(m,viewer,now),waitingEarly:frame.waitingEarly,
    camera:anchor?anchor.id:!viewer&&m.tournament?m.focus?.until>now?m.focus.id:
      [...m.players.values()].filter(a=>a.hp>0&&!a.offlineAt).sort((a,b)=>Math.hypot(a.x,a.z)-Math.hypot(b.x,b.z))[0]?.id:undefined,
    relics:m.mode==='relic'?m.relics.map(r=>[r.team,round(r.x,10),round(r.z,10),r.holder,r.home]):undefined,
    power:m.mode==='overcharge'?m.power.map(r=>[r.x,r.z,r.ready<=now]):undefined};
}

export function ascAction(m,id,body,now){return combatAction(m,m?.players.get(id),body,now,{hit,canSee});}

export function tacticalPing(m,id,kind,now) {
  const p=m.players.get(id);
  if(!p?.hp||p.forfeited||p.offlineAt||p.pingAt+1400>now||!Number.isInteger(kind)||!PINGS[kind])return null;
  p.pingAt=now;
  let position=null;
  if(kind===0&&m.mode!=='props'&&m.mode!=='hardcore'){
    const target=[...m.players.values()].filter(q=>q.team!==p.team&&q.hp>0&&!q.forfeited&&canSee(p,q,m.field))
      .sort((a,b)=>dist(a,p)-dist(b,p))[0];
    if(target)position={x:target.x,z:target.z};
  }
  position ||= {x:p.x+Math.sin(p.yaw)*7,z:p.z-Math.cos(p.yaw)*7};
  return {type:'z2:ping',team:p.team,name:p.name,message:PINGS[kind],
    x:round(clamp(position.x,-m.field.half,m.field.half),10),z:round(clamp(position.z,-m.field.half,m.field.half),10),
    until:now+6000};
}
