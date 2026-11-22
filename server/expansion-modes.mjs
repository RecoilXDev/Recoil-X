export const EXPANSION_MODES = ['escort', 'hotzone', 'elimination', 'budget', 'props', 'jeep', 'raid'];
export const WEAPON_COSTS = [3, 5, 6, 1];
export const PROP_NAMES = ['Crate', 'Barrel', 'Beacon'];
export const HUNT_SCENERY = [
  [-18,-16,0],[-15,-5,1],[-17,12,2],[-10,-19,1],[-10,3,2],[-8,17,0],
  [-4,-7,0],[-3,7,1],[3,-5,2],[5,16,1],[9,-18,2],[9,-2,0],[16,-13,1],[17,5,0],[16,15,2]
];
const ZONES = [{x:0,z:0},{x:-17,z:-13},{x:17,z:14},{x:0,z:-19},{x:0,z:20}];
const PADS = [{x:-9,z:5},{x:9,z:5}];
const JEEP_GATES = [[0,13],[4,2],[-4,-10],[0,-22]];
const close = (a,b,r) => Math.hypot(a.x-b.x,a.z-b.z) <= r;
const clamp = (x,min,max) => Math.max(min, Math.min(max,x));
const active = m => [...m.players.values()].filter(p => !p.forfeited && !p.offlineAt && p.hp>0);

export function markEvent(m,now,kind,text,actor=null) {
  const event={at:Math.max(0,now-m.started),kind,text,actor};
  m.timeline.push(event);
  if(m.timeline.length>120)m.timeline.shift();
  if(actor!==null)m.focus={id:actor,until:now+4500};
}

const RAID_GUARDIANS=[
 {name:'The Rift Crown',model:'earth',hp:960,attack:'shockwave',radius:3.4,damage:32},
 {name:'Abyss Leviathan',model:'water',hp:1180,attack:'tidal surge',radius:5.0,damage:36},
 {name:'Inferno Warden',model:'lava',hp:1360,attack:'eruption',radius:4.2,damage:42}
];
const guardian=(index)=>({...RAID_GUARDIANS[index],id:-1,x:0,z:-3,team:1,jump:0,
 hp:RAID_GUARDIANS[index].hp,maxHp:RAID_GUARDIANS[index].hp,shieldUntil:Infinity});

export function modeState(mode,now,players) {
  switch(mode) {
    case 'escort': return {half:0,deadline:now+75000,progress:0,totals:[0,0]};
    case 'hotzone': return {index:0,deadline:now+30000,credit:0,control:null};
    case 'elimination':
    case 'budget': return {round:1,phase:mode==='budget'?'draft':'fight',
      deadline:now+(mode==='budget'?12000:60000),budget:[0,1].map(t=>players.filter(p=>p.team===t).length*4)};
    case 'props': return {half:0,phase:'hide',deadline:now+12000,score:[0,0],started:0};
    case 'jeep': return {cars:[0,1].map(team=>{
      const lane=team?12:-12;
      return {team,lane,x:lane,z:23,yaw:0,speed:0,wheel:0,steer:0,gate:0,driver:players.find(p=>p.team===team)?.id};
    })};
    case 'raid': return {boss:guardian(0),bossIndex:0,totalBosses:RAID_GUARDIANS.length,
      held:0,openUntil:0,windup:null,next:now+5000,phase:1,pads:[false,false]};
    default: return null;
  }
}

export function draftBudget(m,p,weapon,now) {
  if(m.mode!=='budget'||m.rule.phase!=='draft'||now>=m.rule.deadline||!p?.hp||p.offlineAt||
    !Number.isInteger(weapon)||!WEAPON_COSTS[weapon])return false;
  const spend=[...m.players.values()].filter(a=>a.team===p.team&&a!==p&&!a.forfeited)
    .reduce((total,a)=>total+WEAPON_COSTS[a.loadout],WEAPON_COSTS[weapon]);
  if(spend>m.rule.budget[p.team])return false;
  p.loadout=weapon;p.weapon=weapon;return true;
}

export function propSelection(m,p,prop) {
  if(m.mode!=='props'||!p?.hp||p.team!==m.rule.half||m.rule.phase!=='hide'||!Number.isInteger(prop)||!PROP_NAMES[prop])
    return false;
  p.prop=prop;return true;
}

export function vehicleGate(c) {
  const offsets=JEEP_GATES[c.gate];if(!offsets)return null;
  return {x:c.lane+offsets[0]*(c.team?-1:1),z:offsets[1]};
}

export function advanceMode(m,now,dt,{finish,spawn,move}) {
  const s=m.rule;
  if(!s)return true;
  const people=active(m);
  const sides=[0,1].map(t=>people.filter(p=>p.team===t));
  switch(m.mode) {
    case 'escort': {
      const point={x:0,z:-16+s.progress*32};
      const pushing=sides[s.half].filter(p=>close(p,point,5));
      const blocked=sides[1-s.half].some(p=>close(p,point,5));
      if(pushing.length&&!blocked)s.progress=clamp(s.progress+dt*.048*Math.sqrt(pushing.length),0,1);
      m.score[s.half]=Math.floor(s.progress*100);
      if(now>=s.deadline||s.progress>=1){
        // Distance decides the round. A completed route ties only if elapsed time ties.
        s.totals[s.half]=s.progress<1?s.progress:1+(s.deadline-now)/75000;
        markEvent(m,now,'escort',`Team ${s.half+1} delivered ${m.score[s.half]}% of the route`,pushing[0]?.id);
        if(s.half===1){
          finish(m,s.totals[0]===s.totals[1]?null:+(s.totals[1]>s.totals[0]),'escort',now);
        }else{
          Object.assign(s,{half:1,deadline:now+75000,progress:0});
          for(const p of m.players.values())if(!p.forfeited){p.reversed=true;spawn(p,now);}
        }
      }
      return !m.result;
    }
    case 'hotzone': {
      if(now>=s.deadline){
        s.index=(s.index+1)%ZONES.length;s.deadline=now+30000;s.credit=0;s.control=null;
        markEvent(m,now,'zone',`Hot zone moved to site ${s.index+1}`);
      }
      const zone=ZONES[s.index];
      const occupants=sides.map(team=>team.find(p=>close(p,zone,5)));
      const control=Boolean(occupants[0])===Boolean(occupants[1])?null:+Boolean(occupants[1]);
      if(s.control!==control){
        s.control=control;s.credit=0;
        if(control!==null)markEvent(m,now,'zone',`Team ${control+1} took the hot zone`,occupants[control].id);
      }
      if(control!==null){
        s.credit+=dt*2;
        if(s.credit>=1){
          s.credit--;m.score[control]++;
          if(m.score[control]>=m.limit)finish(m,control,'hotzone',now);
        }
      }
      return !m.result;
    }
    case 'elimination':
    case 'budget': {
      if(s.phase==='draft'){
        if(now<s.deadline)return false;
        s.phase='fight';s.deadline=now+60000;
        for(const p of people){p.weapon=p.loadout;p.readyShot=now+400;}
        return true;
      }
      if(s.phase==='break'){
        if(now<s.deadline)return false;
        s.round++;s.phase=m.mode==='budget'?'draft':'fight';
        s.deadline=now+(s.phase==='draft'?12000:60000);
        for(const p of m.players.values())if(!p.forfeited)spawn(p,now);
        markEvent(m,now,'round',`Round ${s.round} opened`);
        return s.phase==='fight';
      }
      if(!sides[0].length||!sides[1].length||now>=s.deadline){
        const counts=sides.map(a=>a.length);
        const winner=counts[0]===counts[1]?null:+(counts[1]>counts[0]);
        if(winner!==null)m.score[winner]++;
        markEvent(m,now,'round',winner===null?`Round ${s.round} drawn`:`Team ${winner+1} won round ${s.round}`,
          winner===null?null:sides[winner][0]?.id);
        if(winner!==null&&m.score[winner]>=m.limit)finish(m,winner,'rounds',now);
        else{s.phase='break';s.deadline=now+3200;}
        return false;
      }
      return true;
    }
    case 'props': {
      if(s.phase==='hide'&&now>=s.deadline){
        s.phase='hunt';s.started=now;s.deadline=now+70000;
        markEvent(m,now,'hunt',`Team ${2-s.half} began searching`);
      }
      if(s.phase==='hunt'&&(now>=s.deadline||!sides[s.half].length)){
        s.score[s.half]=Math.min(70000,now-s.started);m.score[s.half]=Math.round(s.score[s.half]/1000);
        markEvent(m,now,'hunt',`Team ${s.half+1} hid for ${m.score[s.half]} seconds`);
        if(s.half===1){
          finish(m,s.score[0]===s.score[1]?null:+(s.score[1]>s.score[0]),'props',now);
          return false;
        }
        Object.assign(s,{half:1,phase:'hide',deadline:now+12000});
        for(const p of m.players.values())if(!p.forfeited)spawn(p,now);
      }
      return true;
    }
    case 'jeep': {
      for(const car of s.cars){
        const crew=sides[car.team];
        const driver=crew.find(p=>p.id===car.driver)||crew[0];
        if(!driver)continue;
        car.driver=driver.id;
        const {f,s:steer,jump}=driver.input;
        const target=jump?0:f*(f<0?4.5:13.5);
        car.speed+=clamp(target-car.speed,-dt*13,dt*13);
        car.steer=steer;
        car.yaw+=steer*dt*1.7*Math.min(1,Math.abs(car.speed)/4)*Math.sign(car.speed);
        const dx=Math.sin(car.yaw)*car.speed*dt,dz=-Math.cos(car.yaw)*car.speed*dt;
        move(car,dx,dz);
        car.wheel+=car.speed*dt/.48;
        for(const player of crew){player.x=car.x;player.z=car.z;player.yaw=car.yaw;}
        const gate=vehicleGate(car);
        if(!gate||!close(car,gate,3.25))continue;
        car.gate++;m.score[car.team]=car.gate;
        markEvent(m,now,'gate',`Team ${car.team+1} reached gate ${car.gate}`,driver.id);
        if(car.gate>=JEEP_GATES.length){finish(m,car.team,'relay',now);return false;}
        car.driver=crew.find(p=>p.id!==driver.id)?.id??driver.id;
      }
      return false;
    }
    case 'raid': {
      const boss=s.boss;
      if(boss.hp<=0){
        const conquered=s.bossIndex+1;
        markEvent(m,now,'boss',boss.name+' defeated · '+conquered+'/'+s.totalBosses);
        if(conquered>=s.totalBosses){m.score[0]=100;finish(m,0,'raid',now);return false;}
        s.bossIndex=conquered;s.boss=guardian(s.bossIndex);
        s.held=0;s.openUntil=0;s.windup=null;s.next=now+4600;s.phase=1;s.pads=[false,false];
        m.events.push({type:'z2:notice',message:'⚔ NEXT BOSS · '+s.boss.name+' · '+(conquered+1)+'/'+s.totalBosses});
        m.score[0]=Math.floor(100*conquered/s.totalBosses);
        return true;
      }
      if(!people.length){
        if(![...m.players.values()].some(p=>!p.forfeited&&p.hp>0))finish(m,1,'raid',now);
        return false;
      }
      s.phase=boss.hp>boss.maxHp*2/3?1:boss.hp>boss.maxHp/3?2:3;
      const occupiers=PADS.map(pad=>people.find(p=>p.input.use&&close(p,pad,2.4)));
      s.pads=occupiers.map(Boolean);
      if(s.openUntil<=now&&occupiers.every(Boolean)&&occupiers[0]!==occupiers[1]){
        s.held+=dt;
        if(s.held>=1.15){
          s.held=0;s.openUntil=now+13500;boss.shieldUntil=now;
          markEvent(m,now,'raid','Both seals opened '+boss.name+' shield',occupiers[0].id);
        }
      }else s.held=0;
      if(s.openUntil<=now)boss.shieldUntil=Infinity;
      if(!s.windup&&now>=s.next){
        const target=people[(m.tick+s.phase)%people.length];
        s.windup={x:target.x,z:target.z,r:boss.radius+s.phase*.55,at:now+(s.bossIndex===1?1800:1400),attack:boss.attack};
      }
      if(s.windup&&s.windup.at<=now){
        for(const p of people)if(close(p,s.windup,s.windup.r)){
          p.hp=Math.max(0,p.hp-(boss.damage+s.phase*6));
          if(!p.hp){p.deaths++;p.spawnAt=now+7400;p.down=null;}
        }
        s.windup=null;s.next=now+5600-s.phase*900;
      }
      m.score[0]=Math.floor(100*(s.bossIndex+(1-Math.max(0,boss.hp)/boss.maxHp))/s.totalBosses);
      return true;
    }
    default: return true;
  }
}

export function ruleView(m,who,now) {
  const s=m.rule;if(!s)return undefined;
  switch(m.mode){
    case 'escort': return {half:s.half,deadline:s.deadline,x:0,z:-16+s.progress*32};
    case 'hotzone': return {...ZONES[s.index],site:s.index+1,control:s.control,deadline:s.deadline};
    case 'elimination':
    case 'budget': return {round:s.round,phase:s.phase,deadline:s.deadline,
      budget:who&&s.budget[who.team],loadout:who?.loadout,spent:who&&[...m.players.values()]
        .filter(p=>p.team===who.team&&!p.forfeited).reduce((sum,p)=>sum+WEAPON_COSTS[p.loadout],0)};
    case 'props': return {hiders:s.half,phase:s.phase,deadline:s.deadline,prop:who?.prop};
    case 'jeep': return {cars:s.cars.map(c=>({team:c.team,x:c.x,z:c.z,yaw:c.yaw,wheel:c.wheel,
      steer:c.steer,speed:c.speed,gate:c.gate,driver:c.driver,next:vehicleGate(c)}))};
    case 'raid': return {boss:{x:s.boss.x,z:s.boss.z,hp:Math.max(0,s.boss.hp),max:s.boss.maxHp,name:s.boss.name,model:s.boss.model,attack:s.boss.attack},index:s.bossIndex+1,total:s.totalBosses,phase:s.phase,
      shield:s.openUntil<=now,pads:PADS.map((p,i)=>({...p,active:s.pads[i]})),windup:s.windup};
    default:return undefined;
  }
}
