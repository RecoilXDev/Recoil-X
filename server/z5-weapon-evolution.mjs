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

// Bounded game-play benefits. They are earned, never purchasable or client-provided.
// Ranked, tournaments, Clan Wars and specialist one-shot/draft modes remain baseline.
export const EVOLUTION_BONUSES=Object.freeze([
  Object.freeze({reloadMultiplier:1,spreadMultiplier:1,fireIntervalMultiplier:1,damageMultiplier:1}),
  Object.freeze({reloadMultiplier:.96,spreadMultiplier:1,fireIntervalMultiplier:1,damageMultiplier:1}),
  Object.freeze({reloadMultiplier:.93,spreadMultiplier:.95,fireIntervalMultiplier:1,damageMultiplier:1}),
  Object.freeze({reloadMultiplier:.90,spreadMultiplier:.93,fireIntervalMultiplier:.98,damageMultiplier:1}),
  Object.freeze({reloadMultiplier:.88,spreadMultiplier:.90,fireIntervalMultiplier:.97,damageMultiplier:1.03})
]);
const UNMODIFIED_MODES=new Set(['clanwar','chess','gungame','onechamber','budget','roulette']);
export function evolutionBonuses(level){
  const index=Number.isInteger(level)?Math.max(0,Math.min(level-1,EVOLUTION_BONUSES.length-1)):0;
  return EVOLUTION_BONUSES[index];
}
export function matchEvolutionBonuses(match,player,weapon){
  if(match?.season||match?.tournament||UNMODIFIED_MODES.has(match?.mode))return EVOLUTION_BONUSES[0];
  if(!Number.isInteger(weapon)||weapon<0||weapon>3)return EVOLUTION_BONUSES[0];
  return evolutionBonuses(player?.rx5WeaponLevels?.[weapon]);
}
