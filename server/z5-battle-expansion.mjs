// Z.5 additional modes. Never trusts client position, damage, oxygen or cover HP.
export const EXTRA_RAIDS=['raid-titan','raid-leviathan','raid-inferno'];
export const RAID_FAMILY=['raid',...EXTRA_RAIDS];
export const isRaidMode=mode=>RAID_FAMILY.includes(mode);
export const DESTRUCTIBLE_MODES=new Set(['clanwar','underwater','chaos']);
export const AIR_STATIONS=[{x:-19,z:0},{x:19,z:0}];

export function battleField(mode,field){
  if(mode==='underwater'){
    field={id:'z5-submerged-lab',name:'Submerged Laboratory',half:28,cover:[
      {x:-11,z:-8,w:5,d:4,h:2.3},{x:11,z:8,w:5,d:4,h:2.3},
      {x:11,z:-9,w:4,d:5,h:3},{x:-11,z:9,w:4,d:5,h:3},
      {x:0,z:0,w:6,d:3,h:1.8},{x:0,z:-15,w:3,d:3,h:2.5},
      {x:0,z:15,w:3,d:3,h:2.5}]};
  }
  if(!DESTRUCTIBLE_MODES.has(mode))return field;
  // A fresh per-match copy; no changes to templates, ranked arenas or persistent saves.
  return {...field,cover:field.cover.map((c,i)=>({
    ...c,destructible:true,hp:Math.max(90,Math.round(c.w*c.d*10)),
    maxHp:Math.max(90,Math.round(c.w*c.d*10)),coverId:i
  }))};
}

export function coverAlive(c){return c.hp===undefined||c.hp>0;}
export function coverHit(m,index,damage){
  if(!DESTRUCTIBLE_MODES.has(m.mode)||!Number.isInteger(index)||!Number.isFinite(damage))return null;
  const c=m.field.cover[index];
  if(!c||!c.destructible||!coverAlive(c)||damage<=0)return null;
  c.hp=Math.max(0,c.hp-Math.min(250,damage));
  return {index,hp:Math.ceil(c.hp),destroyed:c.hp===0};
}

export function surfaceBreathing(m,p,now,dt){
  if(m.mode!=='underwater'||!p||p.forfeited||p.offlineAt||p.hp<=0)return false;
  const near= AIR_STATIONS.some(st=>Math.hypot(st.x-p.x,st.z-p.z)<4.2);
  p.oxygen=Math.max(0,Math.min(100,(p.oxygen??100)+(near?dt*52:-dt*4)));
  if(p.oxygen>0){p.drownAt=0;return true;}
  // 12 hp every 1.4 seconds: deterministic on server time; cannot be client forged.
  if(!p.drownAt)p.drownAt=now+1400;
  if(now<p.drownAt)return true;
  p.drownAt=now+1400;p.hp=Math.max(0,p.hp-12);
  if(p.hp===0){p.deaths++;p.spawnAt=now+2700;p.down=null;}
  return true;
}

export function underwaterObjective(m,p){
  if(m.mode!=='underwater')return undefined;
  return {type:'underwater',oxygen:Math.max(0,Math.round(p?.oxygen??100)),
    stations:AIR_STATIONS,destructible:true,
    hint:'Reach a glowing air station before oxygen runs out.'};
}

export const RAID_VARIANTS={
  raid:{name:'Rift Crown',hp:960,telegraph:1400,impact:38,radius:3.95,cooldown:5600},
  'raid-titan':{name:'Titan Omega',hp:1500,telegraph:1700,impact:44,radius:4.8,cooldown:5200},
  'raid-leviathan':{name:'Abyss Leviathan',hp:1240,telegraph:1100,impact:28,radius:6.2,cooldown:4300},
  'raid-inferno':{name:'Inferno Warden',hp:1380,telegraph:1550,impact:42,radius:4.3,cooldown:3900}
};