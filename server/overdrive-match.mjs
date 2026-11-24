// Movement, hits, ammo, objectives and results use server time and state.
import { EXPANSION_MODES, RAID_MODES, modeState, advanceMode, ruleView, markEvent, HUNT_SCENERY } from './expansion-modes.mjs';
import { Z5_MODES, z5Spawn, z5Weapon, z5CanShoot, z5ModeState, z5Arena, z5Elimination, z5Advance, z5Objective } from './z5-combat-modes.mjs';
import {initCombatQuality,coolCombatQuality,recordCombatShot,heatAllowsShot,allowCombatInput} from './z5-combat-quality.mjs';
import {underwaterField,destructibleField,coverShot,oxygenStep} from './z5-environment.mjs';
import {WAVE2_MODES,wave2State,wave2Movement,wave2FireCooldown,wave2Objective,wave2Advance,wave2Melee,wave2Ricochet} from './z5-wave2.mjs';
import {CUSTOM_PRESETS} from './z5-lobby-custom.mjs';
import {matchEvolutionBonuses} from './z5-weapon-evolution.mjs';
import {newCombatStats,combatReport} from './a-foundation.mjs';
import {PAWBLAST_HALF,resetPawblast,pawblastImpact,pawblastStep} from './a-pawblast.mjs';

export const TEAM_SIZES = [1,2,3,5];
export const MODES = ['arena','overcharge','relic','chess','rescue',...EXPANSION_MODES,...Z5_MODES,...WAVE2_MODES,'pawblast'];
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
  z5Spawn(p,now);
  p.hp=Math.min(p.hp,p.rx5Rules?.hp??100);
  initCombatQuality(p);
  if(p.matchMode==='pawblast')resetPawblast(p);
}

export function makeMatch({id,mode,season=null,limit,players,now,tournament=false,field=FIELD,remake=false,rng=Math.random,preset='classic',weaponLevels=null}) {
  const placed=[0,0];
  const members=new Map();
  for(const record of players) {
    // Only levels loaded from the authenticated server database are trusted.
    // Ignore any look-alike mastery fields supplied by matchmaking clients.
    const saved=weaponLevels instanceof Map?weaponLevels.get(record.id):null;
    const mastery=Array.from({length:weapons.length},(_,i)=>
      Number.isInteger(saved?.[i])&&saved[i]>=1&&saved[i]<=5?saved[i]:1);
    const p={...record,rx5WeaponLevels:mastery,slot:placed[record.team]++,kills:0,deaths:0,damage:0,revives:0,forfeited:false,budget:mode==='budget',matchMode:mode,
      inputs:0,seq:-1,offlineAt:0,abilityAt:0,pingAt:0,aCombat:newCombatStats(),rx5Rules:CUSTOM_PRESETS[preset]||CUSTOM_PRESETS.classic};
    p.spawnX=(p.slot-(players.filter(other=>other.team===p.team).length-1)/2)*3.65;
    spawn(p,now);
    members.set(p.id,p);
  }
  const rule=modeState(mode,now,players)||z5ModeState(mode,now,rng)||wave2State(mode,now);
  if(mode==='jeep'){
    field={id:'rally',name:'Double Track',half:28,cover:[]};
    for(const p of members.values())Object.assign(p,{x:rule.cars[p.team].x,z:23,yaw:0});
  }
  if(mode==='escort')field={...field,cover:field.cover.filter(c=>c.x!==0)};
  if(mode==='props')field={...field,scenery:HUNT_SCENERY};
  if(mode==='chaos')field=z5Arena(field,rng);
  if(mode==='train')field={...field,id:'z5-train-yard',name:'Z.5 Rolling Train Yard'};
  if(mode==='volcano')field={...field,id:'z5-volcano',name:'Z.5 Volcano Outpost'};
  if(mode==='timefracture')field={...field,id:'z5-timefracture',name:'Z.5 Time Fracture'};
  if(mode==='underwater')field=underwaterField(field);
  if(mode==='pawblast')field={id:'pawblast-skydeck',name:'Pawblast Skydeck',half:PAWBLAST_HALF,cover:[],pawblast:true};
  // Clone per-room cover; never mutate shared or ranked arena geometry.
  if(!season&&!tournament&&['demolition','clanwar','underwater'].includes(mode))field=destructibleField(field);
  else field={...field,cover:field.cover.map(c=>({...c}))};
  return {
    id,mode,season,field,rule,remake,preset:CUSTOM_PRESETS[preset]?preset:'classic',
    limit:['relic','ctf','elimination','budget','onechamber','roulette'].includes(mode)?3:mode==='gungame'?4:mode==='parkour'?5:mode==='chess'?2:mode==='hotzone'?60:mode==='jeep'?4:limit,
    players:members,started:now,
    end:now+(RAID_MODES.includes(mode)?900000:360000),last:now,score:[0,0],result:null,roundAt:0,rng,
    relics:[0,1].map(team=>({team,x:0,z:team?24:-24,holder:null,home:true,returnAt:0})),
    power:[{x:0,z:0,ready:now},{x:-10,z:16,ready:now},{x:10,z:-16,ready:now}],
    events:[],timeline:[{at:0,kind:'start',text:'Match started',actor:null}],focus:null,lastLead:null,
    history:[],lastSample:0,finalKill:null,tick:0,tournament,overtime:false
  };
}

export function inputMatch(m,id,data,now) {
  const p=m?.players.get(id);
  if(!p||p.forfeited||p.offlineAt||m.result||!Number.isSafeInteger(data.seq)||data.seq<=p.seq||
    data.seq>2147483647||![data.f,data.s,data.yaw,data.pitch].every(Number.isFinite)||
    !Number.isInteger(data.weapon)||!weapons[data.weapon]) return false;
  if(!allowCombatInput(p,now))return false;
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
  p.offlineAt=0;p.remakeEligible=false;p.seq=-1;p.input=neutral();p.taps=null;
  return true;
}

function blocked(field,x,z) {
  return field.cover.some(c=>(c.hp===undefined||c.hp>0)&&Math.abs(x-c.x)<c.w/2+.42&&Math.abs(z-c.z)<c.d/2+.42);
}

function move(field,p,dx,dz) {
  const edge=field.half-(field.pawblast?0:.55);
  const x=clamp(p.x+dx,-edge,edge);
  const z=clamp(p.z+dz,-edge,edge);
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
    if(c.hp!==undefined&&c.hp<=0)continue;
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
  const players=[...m.players.values()].map(({id,name,team,kills,deaths,damage,revives,inputs,forfeited,aCombat})=>
    ({id,name,team,kills,deaths,damage,revives,inputs,forfeited,combat:combatReport(aCombat)}));
  const candidates=players.filter(p=>!p.forfeited).sort((a,b)=>
    (b.kills*120+b.damage+b.revives*80)-(a.kills*120+a.damage+a.revives*80)||a.deaths-b.deaths||a.id-b.id);
  m.result={id:m.id,mode:m.mode,season:m.season,winner,reason,score:m.score.slice(),
    clanWar:m.clanWar?{clans:m.clanWar.clans.slice()}:undefined,
    duration:Math.max(0,now-m.started),players,mvp:candidates[0]?.name||null,highlight:m.finalKill,preset:m.preset,
    field:m.field.name,timeline:m.timeline.slice()};
}

function eliminate(m,victim,killer,now) {
  victim.hp=0;victim.down=null;victim.deaths++;victim.spawnAt=now+2700;
  dropRelic(m,victim,now);
  if(!killer||killer.team===victim.team||killer.forfeited)return;
  killer.kills++;
  markEvent(m,now,'elimination',`${killer.name} eliminated ${victim.name}`,killer.id);
  const ids=new Set([killer.id,victim.id]);
  const replay=m.history.slice(-21).map(([at,rows])=>[at,rows.filter(row=>ids.has(row[0]))]);
  const highlight={killer:killer.id,victim:victim.id,frames:replay,
    killerName:killer.name,victimName:victim.name};
  m.finalKill=highlight;
  m.events.push({type:'z2:kill',killer:killer.name,victim:victim.name},
    {type:'z2:killcam',only:victim.id,replay:highlight});
  if(['elimination','budget','props'].includes(m.mode))victim.spawnAt=0;
  if(z5Elimination(m,victim,killer,now,{finish,mark:markEvent}))return;
  if(['relic','ctf'].includes(m.mode)||m.rule)return;
  m.score[killer.team]++;
  if(m.score[killer.team]>=m.limit||m.overtime)finish(m,killer.team,'score',now);
  else if(m.mode==='chess')m.roundAt=now+2200;
}

function hit(m,shooter,victim,damage,now,projectileStats=null) {
  if(victim.shieldUntil>now||victim.hp<=0)return;
  if(m.mode==='parry'&&(victim.parryUntil||0)>now)return;
  if(m.mode==='pawblast'){
    pawblastImpact(shooter,victim,damage,now);
    if(projectileStats)projectileStats.hits++;
    // Confirmation is aggregated per trigger below, rather than once per pellet.
    return;
  }
  const amount=Math.min(victim.hp,damage);
  victim.hp-=amount;shooter.damage+=amount;
  if(projectileStats){projectileStats.hits++;projectileStats.damage+=amount;}
  if(victim.id<0)return;
  if(victim.hp>0)return;
  if(m.mode==='rescue'){
    victim.down={by:shooter.id,until:now+8500,helper:null,healing:0};dropRelic(m,victim,now);
    m.events.push({type:'z2:notice',team:victim.team,message:`${victim.name} is down. Hold Use nearby to drag and revive.`});
  }else eliminate(m,victim,shooter,now);
}

function fire(m,p,now) {
  const w=weapons[p.weapon],bonus=matchEvolutionBonuses(m,p,p.weapon);
  const scaledDamage=amount=>Math.round(amount*bonus.damageMultiplier*10)/10;
  const dual=m.mode==='dualwield',projectiles=dual?Math.min(2,p.ammo[p.weapon]):w.pellets;
  const metrics=p.aCombat[p.weapon],damageBefore=metrics.damage,hitsBefore=metrics.hits;metrics.triggers++;
  p.ammo[p.weapon]-=dual?projectiles:1;
  p.readyShot=now+Math.ceil(w.interval*(dual?1.36:1)*wave2FireCooldown(m)*(p.rx5Rules?.fire??1)*(p.boost>now ? .74 : 1)*bonus.fireIntervalMultiplier);
  if(m.mode!=='pawblast'&&!m.season&&!m.tournament&&recordCombatShot(p,p.weapon)){
    m.events.push({type:'z2:notice',only:p.id,message:'Weapon overheated · release fire to cool down.'});
  }
  const eye=[p.x,1.62+p.jump,p.z];
  let end;
  const opponents=[...m.players.values()].filter(other=>other.team!==p.team&&other.hp>0&&!other.forfeited);
  if(RAID_MODES.includes(m.mode)&&m.rule.boss.hp>0)opponents.push(m.rule.boss);
  for(let pellet=0;pellet<projectiles&&!m.result;pellet++){
    metrics.projectiles++;
    const yaw=p.yaw+(m.rng()-.5)*w.spray*bonus.spreadMultiplier+(dual?(pellet===0?-.03:.03):0),pitch=p.pitch+(m.rng()-.5)*w.spray*bonus.spreadMultiplier;
    const dir=[Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch)];
    let reach=obstruction(m.field,eye,dir,w.range),target=null;
    for(const other of opponents) {
      const disguise=m.mode==='props'&&other.team===m.rule.half;
      const width=other.id<0?1.35:disguise?[.55,.4,.32][other.prop]:.45;
      const height=other.id<0?3.5:disguise?[1.05,1.23,1.4][other.prop]:1.96;
      const first=intersect(eye,dir,[other.x-width,other.jump,other.z-width],
        [other.x+width,other.jump+height,other.z+width],reach);
      if(first<reach){reach=first;target=other;}
    }
    if(!end)end=eye.map((v,i)=>round(v+dir[i]*reach,100));
    if(target)hit(m,p,target,scaledDamage(dual?11:w.damage),now,metrics);
    else if(m.mode==='ricochet'){
      const bounced=wave2Ricochet(m.field,eye,dir,w.range);
      if(bounced&&Math.abs(bounced.distance-reach)<.08){
        const begin=bounced.at.map((v,i)=>v+bounced.dir[i]*.04);
        let secondReach=obstruction(m.field,begin,bounced.dir,bounced.remaining),victim=null;
        for(const other of opponents){
          const first=intersect(begin,bounced.dir,[other.x-.45,other.jump,other.z-.45],
            [other.x+.45,other.jump+1.96,other.z+.45],secondReach);
          if(first<secondReach){secondReach=first;victim=other;}
        }
        if(victim)hit(m,p,victim,scaledDamage(w.damage*.55),now,metrics);
        m.events.push({type:'z2:shot',origin:p.id,team:p.team,
          a:bounced.at.map(v=>round(v,100)),b:begin.map((v,i)=>round(v+bounced.dir[i]*secondReach,100))});
      }
    }
    else if(m.field.destructible){
      const impact=coverShot(m.field,eye,dir,w.range,w.damage);
      if(impact?.broken){
        m.events.push({type:'z2:notice',message:'💥 COVER DESTROYED · line of sight opened'});
        m.events.push({type:'z2:cover',id:impact.id,hp:0});
      }
    }
  }
  m.events.push({type:'z2:shot',origin:p.id,team:p.team,a:eye.map(v=>round(v,100)),b:end});
  if(metrics.hits>hitsBefore&&m.mode==='pawblast')m.events.push({type:'z2:notice',only:p.id,message:'PAWBLAST · Knockback landed!'});
  if(metrics.hits>hitsBefore&&m.mode!=='pawblast')m.events.push({type:'z2:hit-confirm',only:p.id,id:m.id,hits:metrics.hits-hitsBefore,damage:round(metrics.damage-damageBefore,10)});
}

function reload(m,p,now) {
  const w=weapons[p.weapon],bonus=matchEvolutionBonuses(m,p,p.weapon);
  if(!p.reloadAt&&p.ammo[p.weapon]<w.ammo){p.reloadAt=now+Math.ceil(w.reload*bonus.reloadMultiplier);p.reloadGun=p.weapon;}
}

function powerOrRelic(m,p,now) {
  if(m.mode==='overcharge'){
    const charge=m.power.find(cell=>cell.ready<=now&&dist(cell,p)<1.45);
    if(charge&&p.boost<now){p.boost=now+7500;charge.ready=now+13500;
      m.events.push({type:'z2:notice',only:p.id,message:'Overcharged · faster movement and fire'});}
  }
  if(!['relic','ctf'].includes(m.mode))return;
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
  if(!teams[0]||(!teams[1]&&!RAID_MODES.includes(m.mode))){finish(m,teams[0]?0:teams[1]?1:null,'forfeit',now);return;}
  if(now>=m.end){
    if(RAID_MODES.includes(m.mode)){finish(m,1,'time',now);return;}
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
  if(!advanceMode(m,now,delta,{finish,spawn,move:(p,dx,dz)=>move(m.field,p,dx,dz)})){recordLead(m,now);return;}
  if(!z5Advance(m,now,{finish,mark:markEvent,spawn})){recordLead(m,now);return;}
  if(WAVE2_MODES.includes(m.mode))wave2Advance(m,now,delta,{mark:markEvent,eliminate});
  if(m.result){recordLead(m,now);return;}
  for(const r of m.relics)if(r.returnAt&&r.returnAt<=now)resetRelic(r);
  for(const p of m.players.values()){
    if(m.result||m.roundAt)break;
    coolCombatQuality(p,delta);
    const taps=p.taps;
    p.taps=null;
    if(p.forfeited||p.offlineAt)continue;
    if(p.down){revive(m,p,now,delta);continue;}
    if(!p.hp){if(p.spawnAt&&p.spawnAt<=now)spawn(p,now);continue;}
    if(m.mode==='props'&&p.team!==m.rule.half&&m.rule.phase==='hide')continue;
    const input=p.input;
    const carrying=['relic','ctf'].includes(m.mode)&&m.relics.some(r=>r.holder===p.id);
    const dragging=m.mode==='rescue'&&input.use&&[...m.players.values()]
      .some(other=>other.down&&other.team===p.team&&dist(other,p)<2.3);
    if(m.mode==='underwater'){
      const air=oxygenStep(p,m.field,delta,!!input.use);
      if(air.damage>0){
        p.hp=Math.max(0,p.hp-air.damage);
        if(!p.hp){eliminate(m,p,null,now);continue;}
      }
    }
    const speed=(input.sprint?7.9:5.8)*(p.boost>now?1.24:1)*(carrying ? .63 : dragging ? .55 : 1)*(p.rx5Rules?.speed??1)*wave2Movement(m)*
      (m.mode==='underwater'?.72:1);
    move(m.field,p,(Math.sin(p.yaw)*input.f+Math.cos(p.yaw)*input.s)*speed*delta,
      (-Math.cos(p.yaw)*input.f+Math.sin(p.yaw)*input.s)*speed*delta);
    if(m.mode==='pawblast'&&pawblastStep(p,delta)){
      const attacker=p.paw.until>=now?m.players.get(p.paw.by):null;
      eliminate(m,p,attacker,now);
      m.events.push({type:'z2:notice',message:p.name+' was blasted off the skydeck!'});
      continue;
    }
    if((input.jump||taps?.jump)&&(!p.jumpAt||now-p.jumpAt>=790)&&!carrying&&!dragging)p.jumpAt=now;
    p.jump=p.jumpAt?Math.max(0,Math.sin(Math.min(1,(now-p.jumpAt)/(m.mode==='underwater'?1150:680))*Math.PI)*(m.mode==='underwater'?1.65:.97)):0;
    if(m.mode==='chess'&&(input.ability||taps?.ability))draftMove(m,p,now);
    if(m.mode==='parry'&&(input.ability||taps?.ability))wave2Melee(m,p,now,hit);
    powerOrRelic(m,p,now);
    const weapon=m.mode==='budget'?p.loadout:z5Weapon(m,p,input.weapon);
    if(p.weapon!==weapon){p.weapon=weapon;p.readyShot=Math.max(p.readyShot,now+170);}
    if(p.reloadAt&&p.reloadAt<=now){p.ammo[p.reloadGun]=weapons[p.reloadGun].ammo;p.reloadAt=0;}
    const firing=input.fire||taps?.fire;
    if(m.mode!=='onechamber'&&(input.reload||taps?.reload||(firing&&p.ammo[p.weapon]===0)))reload(m,p,now);
    if(firing&&z5CanShoot(m)&&(m.season||m.tournament||heatAllowsShot(p,p.weapon))&&!p.reloadAt&&p.readyShot<=now&&p.ammo[p.weapon]>0&&!dragging&&!m.result&&
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

export function snapshot(m,id,now,packed=false,frame=prepareSnapshot(m)) {
  const viewer=m.players.get(id);
  const rows=[];
  for(const actor of frame.actors){
    const target=m.players.get(actor.own[0]);
    if(viewer&&target.team!==viewer.team&&(m.season||m.mode==='props')){
      if(m.mode==='props'&&m.rule.phase==='hide'&&viewer.team!==m.rule.half)continue;
      if(!canSee(viewer,target,m.field))continue;
    }
    if(target.id===id)rows.push(packed?(actor.packedOwn??=packRow(actor.own)):actor.own);
    else rows.push(packed?(actor.packedPublic??=packRow(actor.publicRow)):actor.publicRow);
  }
  return {type:'z2:state',id:m.id,t:now,score:m.score,remaining:Math.max(0,m.end-now),
    heat:viewer?.rx5Heat?.[viewer.weapon]??0,overheated:!!viewer?.rx5Overheated?.[viewer.weapon],
    packed:packed?1:undefined,rows,roster:packed&&rows.length===frame.roster.length?undefined:frame.roster,
    objective:m.mode==='pawblast'?{type:'pawblast',charge:Math.round(viewer?.paw?.charge||0),rule:'Blast opponents off the platform'}:ruleView(m,viewer,now)??z5Objective(m,viewer,now)??wave2Objective(m,viewer,now),waitingEarly:frame.waitingEarly,
    cover:m.field.destructible?m.field.cover.map(c=>[c.id,c.hp]):undefined,
    camera:!viewer&&m.tournament?m.focus?.until>now?m.focus.id:
      [...m.players.values()].filter(a=>a.hp>0&&!a.offlineAt).sort((a,b)=>Math.hypot(a.x,a.z)-Math.hypot(b.x,b.z))[0]?.id:undefined,
    relics:['relic','ctf'].includes(m.mode)?m.relics.map(r=>[r.team,round(r.x,10),round(r.z,10),r.holder,r.home]):undefined,
    power:m.mode==='overcharge'?m.power.map(r=>[r.x,r.z,r.ready<=now]):undefined};
}

export function tacticalPing(m,id,kind,now) {
  const p=m.players.get(id);
  if(!p?.hp||p.forfeited||p.offlineAt||p.pingAt+1400>now||!Number.isInteger(kind)||!PINGS[kind])return null;
  p.pingAt=now;
  let position=null;
  if(kind===0&&m.mode!=='props'){
    const target=[...m.players.values()].filter(q=>q.team!==p.team&&q.hp>0&&!q.forfeited&&canSee(p,q,m.field))
      .sort((a,b)=>dist(a,p)-dist(b,p))[0];
    if(target)position={x:target.x,z:target.z};
  }
  position ||= {x:p.x+Math.sin(p.yaw)*7,z:p.z-Math.cos(p.yaw)*7};
  return {type:'z2:ping',team:p.team,name:p.name,message:PINGS[kind],
    x:round(clamp(position.x,-m.field.half,m.field.half),10),z:round(clamp(position.z,-m.field.half,m.field.half),10),
    until:now+6000};
}
