// RECOIL X Z.5 deterministic weapon progression rules.
// Persist XP in authenticated server-side storage; never trust XP supplied by clients.
export const EVOLUTION_STAGES=Object.freeze([
  {level:1,xp:0,name:'Standard'},
  {level:2,xp:500,name:'Forged'},
  {level:3,xp:1800,name:'Elite'},
  {level:4,xp:4500,name:'Mythic'},
  {level:5,xp:10000,name:'Ascended'}
]);
export function evolutionForXp(xp){const safe=Number.isFinite(xp)?Math.max(0,Math.floor(xp)):0;
  return {...EVOLUTION_STAGES.filter(s=>safe>=s.xp).at(-1),xp:safe,nextXp:EVOLUTION_STAGES.find(s=>s.xp>safe)?.xp??null};
}
export function awardVerifiedWeaponXp(currentXp,{confirmedKill=false,confirmedWin=false}={}){
  const base=Number.isFinite(currentXp)?Math.max(0,Math.floor(currentXp)):0;
  return evolutionForXp(Math.min(100000000,base+(confirmedKill?25:0)+(confirmedWin?100:0)));
}
