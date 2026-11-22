// RECOIL X Z.5: server-owned casual lobby presets and host-managed team draft.
// Presets never affect ranked, clan wars, tournaments or persistent rewards.
export const CUSTOM_PRESET_MODES=['arena','overcharge','demolition','dualwield','ricochet','parry','train','volcano','timefracture'];
export const CUSTOM_PRESETS=Object.freeze({
 classic:Object.freeze({hp:100,speed:1,fire:1,label:'Classic'}),
 blitz:Object.freeze({hp:80,speed:1.2,fire:.87,label:'Blitz · 80 HP, faster movement & fire'}),
 precision:Object.freeze({hp:75,speed:1,fire:1.25,label:'Precision · 75 HP, deliberate fire'}),
 fortress:Object.freeze({hp:100,speed:.88,fire:1.16,label:'Fortress · armored-paced combat'})
});
export const validPreset=name=>typeof name==='string'&&Object.hasOwn(CUSTOM_PRESETS,name);
export const canCustomizeMode=mode=>CUSTOM_PRESET_MODES.includes(mode);
export function pickTeam(room,user,targetId,team){
 if(!room?.draftTeams||room.phase!=='lobby'||room.host!==user.id||
   !Number.isSafeInteger(targetId)||![0,1].includes(team))return false;
 const participants=[...room.members.values()].filter(p=>!p.spectator);
 const target=participants.find(p=>p.id===targetId);
 if(!target||target.team===team)return false;
 const to=participants.filter(p=>p.team===team);
 const previous=target.team;
 if(to.length>=room.size){
  // A full lobby can be redrafted by swapping a non-host player, preserving capacity.
  const swap=to.find(p=>p.id!==room.host)||to[0];
  if(!swap)return false;
  swap.team=previous;
 }
 target.team=team;
 return true;
}
