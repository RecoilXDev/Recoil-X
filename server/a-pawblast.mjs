// Pawblast: original team knockback arena. All impulses and ring-outs are server-owned.
export const PAWBLAST_HALF=20;
export function resetPawblast(p){
 p.paw={vx:0,vz:0,charge:0,by:null,until:0};
 p.x=Math.max(-12,Math.min(12,p.spawnX));p.z=p.team?12:-12;
}
export function pawblastImpact(shooter,victim,damage,now){
 const k=victim.paw;if(!k)return 0;
 const dx=victim.x-shooter.x,dz=victim.z-shooter.z,d=Math.hypot(dx,dz);
 const nx=d>.01?dx/d:Math.sin(shooter.yaw),nz=d>.01?dz/d:-Math.cos(shooter.yaw);
 k.charge=Math.min(180,k.charge+Math.max(0,damage)*.65);
 const impulse=Math.min(13,(3+damage*.09)*(1+k.charge/100));
 k.vx+=nx*impulse;k.vz+=nz*impulse;
 const speed=Math.hypot(k.vx,k.vz);if(speed>26){k.vx*=26/speed;k.vz*=26/speed;}
 k.by=shooter.id;k.until=now+5000;
 return impulse;
}
export function pawblastStep(p,dt){
 const k=p.paw;if(!k)return false;
 p.x+=k.vx*dt;p.z+=k.vz*dt;
 const decay=Math.exp(-2.6*dt);k.vx*=decay;k.vz*=decay;
 return Math.abs(p.x)>=PAWBLAST_HALF||Math.abs(p.z)>=PAWBLAST_HALF;
}
