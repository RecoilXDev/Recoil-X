// Z.5 Combat Quality: server-authoritative heat and input flood protection.
// Heat is opt-in for unranked public rooms; seasonal/ranked balance is unchanged.
export const HEAT_PER_SHOT=Object.freeze([4.6,0,0,3.8]);
export const HEAT_RELEASE=35;
export const HEAT_COOL_RATE=34;

export function initCombatQuality(player){
  player.rx5Heat=[0,0,0,0];
  player.rx5Overheated=[false,false,false,false];
  player.rx5InputWindow=0;
  player.rx5InputCount=0;
}
export function coolCombatQuality(player,seconds){
  if(!Array.isArray(player?.rx5Heat))return;
  const dt=Math.max(0,Math.min(.15,Number(seconds)||0));
  for(let i=0;i<4;i++){
    player.rx5Heat[i]=Math.max(0,player.rx5Heat[i]-HEAT_COOL_RATE*dt);
    if(player.rx5Overheated[i]&&player.rx5Heat[i]<=HEAT_RELEASE)player.rx5Overheated[i]=false;
  }
}
export function heatAllowsShot(player,weapon){
  return !player?.rx5Overheated?.[weapon];
}
// Returns true only when THIS shot triggers an overheat. Do not call on rejected shots.
export function recordCombatShot(player,weapon){
  const cost=HEAT_PER_SHOT[weapon]||0;
  if(!cost||!player?.rx5Heat)return false;
  if(player.rx5Overheated[weapon])return false;
  player.rx5Heat[weapon]=Math.min(100,player.rx5Heat[weapon]+cost);
  if(player.rx5Heat[weapon]<100)return false;
  player.rx5Overheated[weapon]=true;
  return true;
}
// Client sends input snapshots, not positions. Reject floods without punishing
// normal 20-60Hz input. 120/second tolerates short jitter and reconnect bursts.
export function allowCombatInput(player,now){
  if(!Number.isFinite(now))return false;
  if(!player.rx5InputWindow||now-player.rx5InputWindow>=1000||now<player.rx5InputWindow){
    player.rx5InputWindow=now;player.rx5InputCount=0;
  }
  if(player.rx5InputCount>=120)return false;
  player.rx5InputCount++;
  return true;
}
