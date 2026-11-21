// RECOIL X Z.5 playable authoritative multiplayer rules.
// Reuses the existing movement, cover, networking and result settlement engine.
export const Z5_MODES=['gungame','onechamber','hardcore','bounty','chaos','parkour'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const near=(p,x,z,r=3)=>Math.hypot(p.x-x,p.z-z)<=r;
const weaponOrder=[0,3,1,2];
const gates=[{x:0,z:-16},{x:10,z:-8},{x:0,z:0},{x:-10,z:8},{x:0,z:16}];
export function z5Spawn(p,now){
  if(p.matchMode==='hardcore'){p.hp=60;p.shieldUntil=now+350;}
  if(p.matchMode==='onechamber'){
    p.hp=75;p.weapon=2;p.loadout=2;p.ammo=[0,0,1,0];p.readyShot=now+230;
  }
  if(p.matchMode==='gungame'){
    p.weapon=weaponOrder[Math.min(weaponOrder.length-1,p.kills)];
    p.loadout=p.weapon;
  }
}
export function z5Weapon(m,p,inputWeapon){
  if(m.mode==='onechamber')return 2;
  if(m.mode==='gungame')return weaponOrder[Math.min(weaponOrder.length-1,p.kills)];
  return inputWeapon;
}
export function z5CanShoot(m){return m.mode!=='parkour';}
export function z5ModeState(mode,now){
  if(mode==='chaos')return {hazard:false,changeAt:now+12000,pulseAt:now+1000,phase:0};
  if(mode==='parkour')return {progress:{},gates,total:gates.length};
  return null;
}
export function z5Arena(field,rng=Math.random){
  // Bounded obstacles, no spawn blockage, lightweight static collision.
  const cover=[...field.cover];
  const candidates=[
    [-13,-14],[13,14],[-12,13],[12,-13],[-5,-6],[5,6],[-18,0],[18,0],
    [0,6],[0,-6],[-8,16],[8,-16],[-15,6],[15,-6]
  ];
  for(let i=candidates.length-1;i>0;i--){
    const j=Math.min(i,Math.max(0,Math.floor(clamp(rng(),0,.999999)* (i+1))));
    [candidates[i],candidates[j]]=[candidates[j],candidates[i]];
  }
  const blocks=candidates.slice(0,6).map(([x,z],i)=>({x,z,w:i%2===0?3:4,d:i%2===0?4:3,h:i%3===0?1.1:2.2}));
  return {id:'z5-chaos',name:'Z.5 Dynamic Arena',half:field.half,cover:[...cover,...blocks]};
}
export function z5Elimination(m,victim,killer,now,{finish,mark}){
  switch(m.mode){
    case 'gungame':
      m.score[killer.team]=Math.max(m.score[killer.team],killer.kills);
      mark(m,now,'evolution',killer.name+' advanced to weapon '+Math.min(weaponOrder.length,killer.kills+1),killer.id);
      if(killer.kills>=weaponOrder.length)finish(m,killer.team,'gun-game',now);
      return true;
    case 'onechamber':
      victim.spawnAt=victim.deaths>=3?0:now+2700;
      if(victim.deaths>=3)victim.forfeited=true;
      killer.ammo[2]=Math.min(1,(killer.ammo[2]||0)+1);
      m.score[killer.team]++;
      if(victim.forfeited||m.score[killer.team]>=m.limit)finish(m,killer.team,'last-chamber',now);
      return true;
    case 'bounty':{
      const valuable=victim.kills>=2;
      const repeated=killer.lastBounty?.id===victim.id&&now-killer.lastBounty.at<45000;
      const bonus=valuable&&!repeated?2:0;
      if(bonus){killer.lastBounty={id:victim.id,at:now};mark(m,now,'bounty',killer.name+' claimed a +2 bounty',killer.id);}
      m.score[killer.team]+=1+bonus;
      if(m.score[killer.team]>=m.limit)finish(m,killer.team,'bounty',now);
      return true;
    }
    case 'chaos':
      m.score[killer.team]++;
      if(m.score[killer.team]>=m.limit)finish(m,killer.team,'chaos',now);
      return true;
    default:return false;
  }
}
export function z5Advance(m,now,{finish,mark}){
  if(m.mode==='chaos'){
    const s=m.rule;
    if(now>=s.changeAt){
      s.hazard=!s.hazard;s.phase++;
      s.changeAt=now+12000;
      mark(m,now,'hazard',s.hazard?'Energy corridor activated — avoid the center!':'Energy corridor is safe again');
      m.events.push({type:'z2:notice',message:s.hazard?'Z.5 HAZARD: leave the central corridor!':'Z.5 HAZARD CLEARED'});
    }
    if(s.hazard&&now>=s.pulseAt) {
      s.pulseAt=now+1000;
      for(const p of m.players.values())if(!p.forfeited&&!p.offlineAt&&p.hp>1&&Math.abs(p.x)<4&&Math.abs(p.z)<10){
        p.hp=Math.max(1,p.hp-15);
      }
    }
  }
  if(m.mode==='parkour'){
    const s=m.rule;
    for(const p of m.players.values()){
      if(p.forfeited||p.offlineAt||p.hp<=0)continue;
      const n=s.progress[p.id]||0;if(n>=s.gates.length)continue;
      const g=s.gates[n],x=p.team? -g.x:g.x,z=p.team? -g.z:g.z;
      if(near(p,x,z,3)){
        s.progress[p.id]=n+1;
        m.score[p.team]=Math.max(m.score[p.team],n+1);
        mark(m,now,'checkpoint',p.name+' reached parkour checkpoint '+(n+1),p.id);
        if(n+1>=s.gates.length){finish(m,p.team,'parkour-finish',now);return false;}
      }
    }
  }
  return !m.result;
}
export function z5Objective(m,who,now){
  if(m.mode==='chaos')return {type:'hazard',active:m.rule.hazard,next:m.rule.changeAt,center:{x:0,z:0,radius:4}};
  if(m.mode==='parkour'){
    const n=who?m.rule.progress[who.id]||0:0;
    const g=m.rule.gates[Math.min(n,m.rule.gates.length-1)];
    return {type:'parkour',checkpoint:n,total:m.rule.total,x:who?.team? -g.x:g.x,z:who?.team? -g.z:g.z};
  }
  if(m.mode==='gungame')return {type:'gungame',weaponStage:who?Math.min(4,who.kills+1):1,stages:4};
  if(m.mode==='onechamber')return {type:'onechamber',lives:who?Math.max(0,3-who.deaths):3,ammo:who?.ammo?.[2]||0};
  if(m.mode==='hardcore')return {type:'hardcore',maxHp:60};
  if(m.mode==='bounty')return {type:'bounty',minKills:2,bonus:2};
}
