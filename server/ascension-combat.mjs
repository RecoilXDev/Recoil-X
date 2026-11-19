const gap=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function combatAction(m,p,body,now,{hit,canSee}){
  const a=p?.asc,s=m?.asc;
  if(!a||!s||!p.hp||p.offlineAt||p.forfeited||m.result||p.inputAt+1500<now||!Number.isSafeInteger(body.seq)||body.seq<=a.actionSeq||body.seq>2147483647)return false;
  a.actionSeq=body.seq;
  if(a.stunned>now)return false;
  const electronic=a.emp<=now;
  switch(body.kind){
    case 'dual':
      if(![0,3].includes(p.weapon)||['gunrun','roulette','chamber','race'].includes(m.mode)||p.reloadAt||a.nextDual>now)return false;
      a.dual=!a.dual;a.nextDual=now+550;p.readyShot=Math.max(p.readyShot,now+300);return true;
    case 'parry':
      if(now<a.parryReady)return false;
      a.parry=now+320;a.parryReady=now+2200;return true;
    case 'melee':{
      if(now<a.meleeAt||['race','gunrun'].includes(m.mode))return false;
      a.meleeAt=now+700;
      const target=[...m.players.values()].filter(q=>q.team!==p.team&&q.hp>0&&!q.forfeited&&gap(p,q)<2.7&&canSee(p,q,m.field))
        .sort((x,y)=>gap(p,x)-gap(p,y))[0];
      if(!target)return true;
      const forward=(target.x-p.x)*Math.sin(p.yaw)-(target.z-p.z)*Math.cos(p.yaw);
      if(forward<gap(p,target)*.28)return true;
      if(target.asc.parry>=now){a.stunned=now+600;hit(m,target,p,30,now,'melee');}
      else hit(m,p,target,38,now,'melee');
      return true;
    }
    case 'emp':{
      if(!electronic||a.empReady>now)return false;
      const center={x:p.x+Math.sin(p.yaw)*5,z:p.z-Math.cos(p.yaw)*5};a.empReady=now+12000;
      for(const q of m.players.values())if(q.team!==p.team&&gap(center,q)<=6)q.asc.emp=now+4000;
      for(const c of s.shields)if(gap(center,c)<=6)c.hp=0;
      m.events.push({type:'z2:notice',message:'EMP pulse discharged'});return true;
    }
    case 'shield':{
      if(!electronic||a.shieldReady>now||s.shields.length>=4||s.shields.some(c=>c.owner===p.id&&c.until>now))return false;
      const x=Math.round((p.x+Math.sin(p.yaw)*2.5)*10)/10,z=Math.round((p.z-Math.cos(p.yaw)*2.5)*10)/10;
      const across=Math.abs(Math.cos(p.yaw))>.70,w=across?3.3:.5,d=across?.5:3.3;
      if(Math.abs(x)+w/2>m.field.half-1||Math.abs(z)+d/2>m.field.half-1||
        m.field.cover.some(c=>Math.abs(x-c.x)<(w+c.w)/2+.2&&Math.abs(z-c.z)<(d+c.d)/2+.2)||
        [...m.players.values()].some(q=>q.hp&&Math.abs(x-q.x)<w/2+.6&&Math.abs(z-q.z)<d/2+.6))return false;
      const shield={id:'shield-'+p.id,owner:p.id,x,z,w,d,h:2.4,hp:90,until:now+10000,material:'shield'};
      s.shields.push(shield);m.field.cover.push(shield);s.geometry++;a.shieldReady=now+18000;return true;
    }
    default:return false;
  }
}
export function coverHit(m,c,damage){
  if(!c||!m.asc)return;
  if(c.material==='shield'){c.hp-=damage;return;}
  if(c.material!=='breakable')return;
  m.asc.coverHp[c.id]-=damage;
  if(m.asc.coverHp[c.id]<=0){m.field.cover=m.field.cover.filter(v=>v!==c);m.asc.broken.push(c.id);m.asc.geometry++;}
}
export function reflectRay(c,point,dir){
  const bounds=[[c.x-c.w/2,c.x+c.w/2],[0,c.h],[c.z-c.d/2,c.z+c.d/2]];
  const faces=bounds.map(([lo,hi],i)=>Math.min(Math.abs(point[i]-lo),Math.abs(point[i]-hi)));
  const axis=faces.indexOf(Math.min(...faces)),bounce=dir.slice();bounce[axis]=-bounce[axis];return bounce;
}
