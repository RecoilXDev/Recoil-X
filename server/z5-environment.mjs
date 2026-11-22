// RECOIL X Z.5 environmental gameplay: server-side, bounded, and per-match only.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const UNDERWATER_AIR=[
 {x:-18,z:-15},{x:18,z:15},{x:-18,z:15},{x:18,z:-15},{x:0,z:0}
];
export function underwaterField(base){
 return {
  id:'z5-abyss-laboratory',name:'Abyss Laboratory · Flooded',
  half:28,underwater:true,airStations:UNDERWATER_AIR.map(v=>({...v})),
  cover:[
   {x:-11,z:-10,w:5,d:4,h:3},{x:11,z:10,w:5,d:4,h:3},
   {x:12,z:-8,w:4,d:5,h:2.8},{x:-12,z:8,w:4,d:5,h:2.8},
   {x:0,z:-14,w:4,d:3,h:2},{x:0,z:14,w:4,d:3,h:2},
   {x:-21,z:0,w:3,d:5,h:3.2},{x:21,z:0,w:3,d:5,h:3.2}
  ]
 };
}
// Destroyable cover health is not shared with other rooms or the base FIELD.
export function destructibleField(base){
 const safe=base.cover.map((c,id)=>({...c,id, hp:c.hp??Math.max(60,Math.round((c.w*c.d)*7)),maxHp:c.maxHp??Math.max(60,Math.round((c.w*c.d)*7))}));
 return {...base,cover:safe,destructible:true};
}
export function coverShot(field,start,dir,max,damage){
 if(!field?.destructible)return null;
 let best=null,travel=max;
 for(const c of field.cover){
  if(c.hp<=0)continue;
  let entry=0,exit=max;
  const low=[c.x-c.w/2,0,c.z-c.d/2],hi=[c.x+c.w/2,c.h,c.z+c.d/2];
  for(let i=0;i<3;i++){
   if(Math.abs(dir[i])<1e-8){if(start[i]<low[i]||start[i]>hi[i]){entry=Infinity;break;}continue;}
   const a=(low[i]-start[i])/dir[i],b=(hi[i]-start[i])/dir[i];
   entry=Math.max(entry,Math.min(a,b));exit=Math.min(exit,Math.max(a,b));
  }
  if(entry<=exit&&entry<travel){best=c;travel=entry;}
 }
 if(!best)return null;
 const before=best.hp;
 best.hp=clamp(Math.round((before-Math.max(2,damage*.85))*10)/10,0,best.maxHp);
 return {id:best.id,hp:best.hp,broken:before>0&&best.hp<=0,at:travel};
}
export function oxygenStep(player,field,dt,using=false){
 if(!field?.underwater)return {oxygen:player.oxygen??100,damage:0};
 const nearby=field.airStations.some(v=>Math.hypot(v.x-player.x,v.z-player.z)<=3.5);
 const previous=Number.isFinite(player.oxygen)?player.oxygen:100;
 // Oxygen is consumed and replenished entirely on authoritative tick time.
 player.oxygen=clamp(previous+(using&&nearby?34:-4.8)*clamp(dt,0,.1),0,100);
 return {oxygen:player.oxygen,damage:player.oxygen===0?15*clamp(dt,0,.1):0,nearby};
}
