import { RANKED_FIELDS } from './overdrive-match.mjs';

export function pairRanked(entries,size,now,points) {
  const [anchor,...rest]=entries;
  if(!anchor)return null;
  const rating=e=>e.members.reduce((sum,p)=>sum+points(p.id),0)/e.members.length;
  const centre=rating(anchor), maxGap=Math.min(950,120+(now-anchor.since)/100);
  const eligible=rest.filter(e=>Math.abs(rating(e)-centre)<=maxGap);
  const seats=new Map([[anchor.members.length*(size+1),{counts:[anchor.members.length,0],sides:[[anchor],[]]}]]);
  for(const entry of eligible){
    for(const {counts,sides} of [...seats.values()]){
      for(const team of [0,1]){
        const count=counts[team]+entry.members.length;
        if(count>size)continue;
        const next=counts.slice();next[team]=count;
        const key=next[0]*(size+1)+next[1];
        if(seats.has(key))continue;
        const teams=sides.map((a,t)=>t===team?[...a,entry]:a);
        seats.set(key,{counts:next,sides:teams});
      }
    }
    if(seats.has(size*(size+2)))break;
  }

  const picked=seats.get(size*(size+2))?.sides.flat();
  if(!picked)return null;
  let best=null, bestGap=Infinity;
  // At most ten queued entries. Keep each party together and minimize total rating difference.
  for(let mask=1;mask<1<<picked.length;mask+=2){
    const sides=[[],[]], totals=[0,0];
    for(let i=0;i<picked.length;i++){
      const team=mask&(1<<i)?0:1;
      sides[team].push(...picked[i].members);
      totals[team]+=picked[i].members.reduce((sum,p)=>sum+points(p.id),0);
    }
    if(sides[0].length!==size)continue;
    const gap=Math.abs(totals[0]-totals[1]);
    if(gap<bestGap){bestGap=gap;best=sides;}
  }
  return {entries:picked,sides:best};
}

const VETO_SECONDS=18;
export function makeVeto(players,now) {
  return {
    pool:RANKED_FIELDS.map(({id,name})=>({id,name})),
    banned:[],
    captains:[0,1].map(team=>players.find(p=>p.team===team).id),
    turn:0,deadline:now+VETO_SECONDS*1000
  };
}

export function banField(veto,id,now) {
  const choice=veto.pool.find(p=>p.id===id);
  if(!choice||veto.pool.length<2)return null;
  veto.pool=veto.pool.filter(p=>p!==choice);
  veto.banned.push({name:choice.name,team:veto.turn});
  veto.turn=1-veto.turn;veto.deadline=now+VETO_SECONDS*1000;
  return {field:veto.pool.length===1?RANKED_FIELDS.find(f=>f.id===veto.pool[0].id):null};
}
