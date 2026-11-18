// Deltas refer to an acknowledged-by-transport full snapshot, never to a preceding delta.
export function wireSnapshot(c,view){
  if(!c.deltaState)return view;
  const seq=(c.ascSequence||0)+1,previous=c.ascKey;
  c.ascSequence=seq;
  const full={...view,frame:seq};
  if(!previous||previous.id!==view.id||view.t-previous.t>=1000){
    return full;
  }
  const current=new Set(view.rows.map(row=>row[0])),changed=view.rows.filter(row=>previous.rows.get(row[0])!==JSON.stringify(row));
  const gone=[...previous.rows.keys()].filter(id=>!current.has(id));
  const diff={...full,base:previous.seq,rows:changed,gone};
  return JSON.stringify(diff).length<JSON.stringify(full).length?diff:full;
}
export function delivered(c,packet){
  if(c.deltaState&&packet.frame&&!packet.base)c.ascKey={id:packet.id,t:packet.t,seq:packet.frame,rows:new Map(packet.rows.map(r=>[r[0],JSON.stringify(r)]))};
}
export function compatibleGroups(entries){
  const groups=[];
  for(const pref of ['touch','controller','keyboard']){
    const strict=entries.filter(e=>e.pref===pref);
    if(strict.length)groups.push([...strict,...entries.filter(e=>!e.pref||e.pref==='any')].sort((a,b)=>a.since-b.since));
  }
  groups.push(entries.filter(e=>!e.pref||e.pref==='any'));
  return groups;
}
export function movementSignal(data,score,now){
  if(!data||!['z2:input','input'].includes(data.type))return false;
  const invalid=['x','z','teleport'].some(key=>Object.hasOwn(data,key))||Math.abs(data.f)>1.05||Math.abs(data.s)>1.05;
  if(now-(score.start||0)>10000){score.start=now;score.count=0;}
  if(!invalid)return false;
  score.count=(score.count||0)+1;return score.count===5;
}
