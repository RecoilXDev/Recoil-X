import assert from 'node:assert/strict';
import {test} from 'node:test';
import {EVOLUTION_BONUSES,evolutionForXp,matchEvolutionBonuses} from '../server/z5-weapon-evolution.mjs';
import {makeMatch,inputMatch,updateMatch} from '../server/overdrive-match.mjs';

const start=1000;
const controls={f:0,s:0,yaw:Math.PI,pitch:0,weapon:0};
const players=[
  {id:1,name:'Master',team:0,rx5WeaponLevels:[5,5,5,5]},
  {id:2,name:'Opponent',team:1}
];
function match(options={}){
 return makeMatch({id:'mastery-test',mode:'arena',now:start,limit:50,players,rng:()=>.5,...options});
}
function shot(m){
 const user=m.players.get(1),victim=m.players.get(2);
 Object.assign(user,{x:0,z:-4,readyShot:0});
 Object.assign(victim,{x:0,z:4,shieldUntil:0});
 assert.equal(inputMatch(m,1,{...controls,seq:1,fire:true},1100),true);
 updateMatch(m,1150);
 return {damage:100-victim.hp,interval:user.readyShot-1150};
}
function reloadDuration(m){
 const user=m.players.get(1);
 user.ammo[0]=5;
 assert.equal(inputMatch(m,1,{...controls,seq:1,reload:true},1100),true);
 updateMatch(m,1150);
 return user.reloadAt-1150;
}

test('levels unlock bounded combat benefits and baseline is unchanged',()=>{
 assert.equal(evolutionForXp(500).level,2);
 assert.equal(evolutionForXp(10000).level,5);
 assert.deepEqual(EVOLUTION_BONUSES[0],{reloadMultiplier:1,spreadMultiplier:1,fireIntervalMultiplier:1,damageMultiplier:1});
 assert.deepEqual(EVOLUTION_BONUSES[4],{reloadMultiplier:.88,spreadMultiplier:.9,fireIntervalMultiplier:.97,damageMultiplier:1.03});
});
test('only server-supplied mastery levels are applied; client seat objects cannot forge perks',()=>{
 const falseClaim=match(),master=match({weaponLevels:new Map([[1,[5,1,1,1]]])});
 assert.equal(falseClaim.players.get(1).rx5WeaponLevels[0],1);
 assert.equal(master.players.get(1).rx5WeaponLevels[0],5);
 assert.equal(matchEvolutionBonuses(master,master.players.get(1),0).reloadMultiplier,.88);
 assert.equal(matchEvolutionBonuses(master,master.players.get(1),1).reloadMultiplier,1);
});
test('reloads are faster on casual matches, while ranked and Clan Wars keep baseline',()=>{
 const baseline=reloadDuration(match()),earned=reloadDuration(match({weaponLevels:new Map([[1,[5,1,1,1]]])}));
 const ranked=reloadDuration(match({weaponLevels:new Map([[1,[5,1,1,1]]]),season:'2026-Q4'}));
 assert.equal(baseline,1560);
 assert.equal(earned,1373);
 assert.equal(ranked,baseline);
 const p={rx5WeaponLevels:[5,1,1,1]};
 assert.equal(matchEvolutionBonuses({mode:'clanwar'},p,0).reloadMultiplier,1);
 assert.equal(matchEvolutionBonuses({mode:'arena',tournament:true},p,0).damageMultiplier,1);
 assert.equal(matchEvolutionBonuses({mode:'onechamber'},p,0).damageMultiplier,1);
});
test('level five applies real but limited server-side shot damage and fire interval',()=>{
 const earned=shot(match({weaponLevels:new Map([[1,[5,1,1,1]]])}));
 const baseline=shot(match());
 const ranked=shot(match({weaponLevels:new Map([[1,[5,1,1,1]]]),season:'2026-Q4'}));
 assert.equal(baseline.damage,22);
 assert(Math.abs(earned.damage-22.7)<.01);
 assert.equal(ranked.damage,baseline.damage);
 assert(earned.interval<baseline.interval);
 assert.equal(ranked.interval,baseline.interval);
});
