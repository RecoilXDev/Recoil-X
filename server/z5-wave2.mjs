// RECOIL X Z.5 Wave 2: deterministic, server-owned combat and dynamic match hazards.
// No client-authoritative health, geometry, timers or match scoring.
export const WAVE2_MODES=['dualwield','ricochet','parry','train','volcano','timefracture'];
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
export function wave2State(mode,now){
 if(mode==='train')return {type:'train',x:-24,cycle:0};
 if(mode==='volcano')return {type:'volcano',cycle:-1,phase:'calm',zones:[{x:-10,z:0},{x:12,z:0}]};
 if(mode==='timefracture')return {type:'timefracture',phase:'normal',cycle:-1};
 return null;
}
export function wave2Movement(m){
 return m.mode==='timefracture'?(m.rule?.phase==='slow'?.62:1.32):1;
}
export function wave2FireCooldown(m){
 return m.mode==='timefracture'?(m.rule?.phase==='slow'?1.65:.82):1;
}
export function wave2Objective(m){
 const s=m.rule;
 if(m.mode==='train')return {type:'train',x:s.x,z:0,halfLength:8,warning:'Avoid the moving train'};
 if(m.mode==='volcano')return {type:'volcano',phase:s.phase,zones:s.zones};
 if(m.mode==='timefracture')return {type:'timefracture',phase:s.phase,speed:wave2Movement(m)};
 if(m.mode==='dualwield')return {type:'dualwield',weapon:'Dual SMGs',rule:'Two projectiles per trigger pull'};
 if(m.mode==='ricochet')return {type:'ricochet',rule:'One server-validated wall bounce'};
 if(m.mode==='parry')return {type:'parry',rule:'Ability: close-range slash and 350ms parry window'};
 return undefined;
}
export function wave2Advance(m,now,dt,{mark,eliminate}){
 const s=m.rule;
 if(m.mode==='train'){
  const progress=(now-m.started)/3800;
  s.x=Math.sin(progress)*24;
  const cycle=Math.floor((now-m.started)/12000);
  if(cycle!==s.cycle){s.cycle=cycle;mark(m,now,'train','Train approaching central tracks');
   m.events.push({type:'z2:notice',message:'🚆 TRAIN CROSSING · STAY CLEAR OF CENTRAL RAILS'});}
  for(const p of m.players.values()){
   if(p.forfeited||p.offlineAt||p.hp<=0||p.shieldUntil>now)continue;
   if(Math.abs(p.x-s.x)<2.0&&Math.abs(p.z)<8.6){
    p.hp=Math.max(0,p.hp-64*dt);
    if(p.hp===0)eliminate(m,p,null,now);
   }
  }
 }
 if(m.mode==='volcano'){
  const elapsed=Math.max(0,now-m.started);
  const cycle=Math.floor(elapsed/14000),within=elapsed%14000;
  const phase=within<3500?'warning':within<8500?'eruption':'calm';
  if(cycle!==s.cycle){
   s.cycle=cycle;
   const offsets=[-15,-5,5,15];
   const shift=cycle%4;
   s.zones=[{x:offsets[shift],z:0},{x:offsets[(shift+2)%4],z:8}];
  }
  if(phase!==s.phase){
   s.phase=phase;
   mark(m,now,'volcano',phase==='warning'?'Magma vents charging':phase==='eruption'?'Lava eruption':'Magma vents cooled');
   m.events.push({type:'z2:notice',message:phase==='warning'?'🌋 MAGMA WARNING · MOVE AWAY FROM GLOWING VENTS':phase==='eruption'?'🌋 ERUPTION ACTIVE · AVOID LAVA':'🌋 LAVA COOLED'});
  }
  if(phase==='eruption')for(const p of m.players.values()){
   if(p.hp<=0||p.offlineAt||p.forfeited||p.shieldUntil>now)continue;
   if(s.zones.some(z=>Math.hypot(p.x-z.x,p.z-z.z)<5.4)){
    p.hp=Math.max(0,p.hp-45*dt);
    if(!p.hp)eliminate(m,p,null,now);
   }
  }
 }
 if(m.mode==='timefracture'){
  const cycle=Math.floor(Math.max(0,now-m.started)/8500);
  if(cycle!==s.cycle){
   s.cycle=cycle;s.phase=cycle%2===0?'slow':'fast';
   mark(m,now,'fracture','Time field shifted to '+s.phase);
   m.events.push({type:'z2:notice',message:s.phase==='slow'?'⌛ TIME FRACTURE · SLOW MOTION':'⚡ TIME FRACTURE · OVERDRIVE'});
  }
 }
}
export function wave2Melee(m,attacker,now,hit){
 if(m.mode!=='parry'||attacker.abilityAt>now||attacker.hp<=0)return false;
 attacker.abilityAt=now+1000;
 attacker.parryUntil=now+350;
 const facing=[Math.sin(attacker.yaw),-Math.cos(attacker.y)];
 for(const target of m.players.values()){
  if(target.id===attacker.id||target.team===attacker.team||target.hp<=0||target.forfeited)continue;
  const x=target.x-attacker.x,z=target.z-attacker.z,d=Math.hypot(x,z);
  if(d>2.7||d<.001||x/d*facing[0]+z/d*facing[1]<.5)continue;
  if((target.parryUntil||0)>now){
   attacker.readyShot=Math.max(attacker.readyShot,now+350);
   m.events.push({type:'z2:notice',only:attacker.id,message:'🛡 PARRIED · ATTACK BLOCKED'});
  }else{
   hit(m,attacker,target,38,now);
   m.events.push({type:'z2:notice',only:attacker.id,message:'⚔ MELEE HIT'});
  }
  break;
 }
 return true;
}
// Ray/AABB entry calculates a single wall reflection; no infinite ricochet recursion.
export function wave2Ricochet(field,start,dir,range){
 let best=null,closest=range;
 for(const c of field.cover||[]){
  if(c.hp!==undefined&&c.hp<=0)continue;
  const lo=[c.x-c.w/2,0,c.z-c.d/2],hi=[c.x+c.w/2,c.h,c.z+c.d/2];
  let entry=0,exit=range,normal=[0,0,0],ok=true;
  for(let axis=0;axis<3;axis++){
   const v=dir[axis];
   if(Math.abs(v)<1e-8){
    if(start[axis]<lo[axis]||start[axis]>hi[axis]){ok=false;break;}
    continue;
   }
   const a=(lo[axis]-start[axis])/v,b=(hi[axis]-start[axis])/v;
   const startFace=Math.min(a,b),endFace=Math.max(a,b);
   if(startFace>entry){
    entry=startFace;normal=[0,0,0];normal[axis]=v>0?-1:1;
   }
   exit=Math.min(exit,endFace);
   if(exit<entry){ok=false;break;}
  }
  if(ok&&entry>1e-4&&entry<closest){
   const dot=dir.reduce((sum,v,i)=>sum+v*normal[i],0);
   const reflected=dir.map((v,i)=>v-2*dot*normal[i]);
   const at=start.map((v,i)=>v+dir[i]*entry);
   best={at,dir:reflected,distance:entry,remaining:range-entry,id:c.id};
   closest=entry;
  }
 }
 return best;
}
