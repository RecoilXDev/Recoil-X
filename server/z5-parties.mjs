// In-memory party membership. Authenticate user IDs at the transport boundary.
export function createFriendParties({maxMembers=5}={}){
 const parties=new Map(),memberToParty=new Map(),invites=new Map();let next=1;
 const key=(id)=>String(id);
 function create(owner){owner=key(owner);if(memberToParty.has(owner))throw Error('Already in a party');const id='p'+next++;parties.set(id,{id,leader:owner,members:new Set([owner])});memberToParty.set(owner,id);return snapshot(id);}
 function snapshot(id){const p=parties.get(id);return p?{id:p.id,leader:p.leader,members:[...p.members]}:null;}
 function invite(leader,target){leader=key(leader);target=key(target);const id=memberToParty.get(leader),p=parties.get(id);if(!p||p.leader!==leader)throw Error('Leader required');if(p.members.size>=maxMembers)throw Error('Party full');if(memberToParty.has(target))throw Error('Target already in party');invites.set(target,id);return {partyId:id,target};}
 function accept(target){target=key(target);const id=invites.get(target),p=parties.get(id);if(!p||memberToParty.has(target)||p.members.size>=maxMembers)throw Error('Invite unavailable');invites.delete(target);p.members.add(target);memberToParty.set(target,id);return snapshot(id);}
 function leave(user){user=key(user);const id=memberToParty.get(user),p=parties.get(id);if(!p)return null;p.members.delete(user);memberToParty.delete(user);if(!p.members.size){parties.delete(id);for(const [target,party] of invites)if(party===id)invites.delete(target);return null;}if(p.leader===user)p.leader=p.members.values().next().value;return snapshot(id);}
 function get(user){return snapshot(memberToParty.get(key(user)));}
 return {create,invite,accept,leave,get};
}
