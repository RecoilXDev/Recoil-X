import {markEvent} from './expansion-modes.mjs';

export const ASC_MODES=['payload','search','flags','gunrun','chamber','bounty','hardcore','extraction','race','roulette','volcano','titan','fracture','invasion','worldboss'];
export const COOP=['volcano','titan','invasion','worldboss'];
export const INPUTS=['any','touch','controller','keyboard'];
const near=(a,b,r)=>Math.hypot(a.x-b.x,a.z-b.z)<=r;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rounded=n=>Math.round(n*100)/100;
const box=(id,x,z,w,d,h,material='stone')=>({id,x,z,w,d,h,material});
const vaultWalls=x=>[box('vault-west',x-2.3,-18,0.55,4.4,2.4),box('vault-east',x+2.3,-18,0.55,4.4,2.4),box('vault-rear',x,-20.2,5,.55,2.4)];
const MAPS={
  bastion:{name:'Beacon Citadel',cover:[box('barrier',-5,0,3,2,1.6,'breakable'),box('panel',7,0,1,8,3,'metal'),box('vault',-18,-16,4,1,2,'vault'),...vaultWalls(-18)]},
  train:{name:'Ironline Express',cover:[...[-18,-6,6,18].flatMap((z,i)=>[box('l'+i,-7,z,1,8,2,'metal'),box('r'+i,7,z,1,8,2,'metal')]),box('cargo',3,6,2,3,2,'breakable'),box('vault',-4,-16,4,1,2,'vault'),...vaultWalls(-4)]},
  lab:{name:'Flooded Laboratory',cover:[box('tank',-7,2,4,6,2.6,'metal'),box('glass',7,-4,4,2,2,'breakable'),box('labwall',12,8,1,10,3),box('airlock',-12,8,1,10,3),box('pipe',12,-12,1,8,3,'metal'),box('console',-10,-10,5,1,1.6),box('vault',-18,-16,4,1,2,'vault'),...vaultWalls(-18)]},
  orbit:{name:'Orbital Slipstream',cover:[box('ring1',-9,-5,3,3,2,'metal'),box('ring2',8,5,3,3,2,'metal'),box('crystal',-5,12,3,2,1.8,'breakable'),box('vault',-18,-16,4,1,2,'vault'),...vaultWalls(-18)]}
};
export const GATES=[{x:-4,z:13},{x:4,z:4},{x:-4,z:-7},{x:4,z:-19}];
export const FLAGS=[{x:0,z:-21},{x:0,z:21}];
const LOOT=[{x:-3,z:-6},{x:4,z:8},{x:-10,z:14},{x:10,z:-13},{x:0,z:0}];
const VAULT=[{x:-13,z:-10},{x:-12,z:-16},{x:-18,z:-12}];
export const worldWeekend=now=>[5,6].includes(new Date(now+4*3600000).getUTCDay());
export function rulesFor(raw={}){
  if(!raw||Array.isArray(raw)||typeof raw!=='object')throw Error('Invalid match rules.');
  const health=raw.health??100,gravity=raw.gravity??'normal',order=raw.order??[0,3,1,2];
  if(![50,75,100,150].includes(health)||!['normal','low'].includes(gravity)||!Array.isArray(order)||order.length<2||order.length>4||
    new Set(order).size!==order.length||order.some(v=>!Number.isInteger(v)||v<0||v>3))throw Error('Choose the listed health, gravity and weapons.');
  const map=raw.map??'bastion';
  if(!Object.hasOwn(MAPS,map))throw Error('Choose a listed arena.');
  return {map,health,gravity,order:[...order],draft:raw.draft===true,heat:raw.heat!==false};
}
export function ascField(mode,rules){
  const spec=MAPS[rules.map],half=mode==='chamber'?16:28;
  const cover=spec.cover.filter(c=>Math.abs(c.x)+c.w/2<half&&Math.abs(c.z)+c.d/2<half).map(c=>({...c}));
  return {id:rules.map,name:spec.name,half,cover};
}
export function initWorld(m,rules,now){
  if(!ASC_MODES.includes(m.mode))return;
  const s=m.asc={rules,phase:'play',round:1,attacker:0,deadline:now+75000,progress:0,checkpoint:0,channel:0,
    flags:FLAGS.map((p,i)=>({...p,team:i,holder:null})),loot:LOOT.map((p,i)=>({...p,id:i})),scores:[],
    carrier:null,armed:false,focus:null,vaultOpen:false,broken:[],shields:[],geometry:0,coverHp:{},phaseIndex:0,
    enemies:[],wave:0,nextWave:now+1000,warning:null,nextAttack:now+4500,worldDamage:0,ledger:[],war:null};
  for(const c of m.field.cover)if(c.material==='breakable')s.coverHp[c.id]=70;
  for(const p of m.players.values()){
    p.asc={stage:0,lives:3,bag:0,bank:0,bounty:1,reward:0,vault:0,found:false,gate:0,lastGate:null,
      finish:null,weaponKills:[0,0,0,0],opponents:{},opponentWeapons:{},dual:false,heat:0,locked:false,parry:0,parryReady:0,
      stunned:0,emp:0,empReady:0,shieldReady:0,meleeAt:0,actionSeq:-1,oxygen:12,vx:0,vz:0,hold:0,
      spawnMode:m.mode,baseHealth:m.mode==='hardcore'?35:rules.health,fieldHalf:m.field.half};
    p.asc.weapon=rules.order[0];ascSpawn(p);
  }
  if(m.mode==='roulette'){roundWeapon(m);s.deadline=now+30000;}
  if(m.mode==='volcano')s.deadline=now+55000;
  if(m.mode==='race')m.end=now+180000;
  if(m.mode==='extraction')m.end=now+150000;
}
export function ascSpawn(p){
  const a=p.asc;if(!a)return;
  p.hp=a.baseHealth;a.dual=false;a.heat=0;a.locked=false;a.vx=0;a.vz=0;a.oxygen=12;a.hold=0;
  p.z=clamp(p.z,-a.fieldHalf+3,a.fieldHalf-3);
  if(a.spawnMode==='race')Object.assign(p,a.lastGate||{x:p.spawnX,z:22},{yaw:0});
  if(a.spawnMode==='chamber'){p.ammo=[0,0,0,0];p.ammo[a.weapon]=1;}
  p.weapon=a.weapon;
}
function roundWeapon(m){const order=m.asc.rules.order,i=Math.min(order.length-1,Math.floor(m.rng()*order.length));for(const p of m.players.values())p.asc.weapon=p.weapon=order[i];}
export function heldWeapon(m,p,input){
  if(!p.asc)return input.weapon;
  if(['gunrun','roulette','chamber'].includes(m.mode))return p.asc.weapon;
  return m.asc.rules.order.includes(input.weapon)?input.weapon:m.asc.rules.order[0];
}
export function modeKill(m,v,k,now,h,method='weapon'){
  if(!m.asc)return false;
  const a=v.asc,s=m.asc;
  if(m.mode==='search'||m.mode==='roulette')v.spawnAt=0;
  if(m.mode==='chamber'&&--a.lives<=0)v.spawnAt=0;
  if(s.carrier===v.id)s.carrier=null;
  for(const f of s.flags)if(f.holder===v.id){f.holder=null;f.x=v.x;f.z=v.z;f.returnAt=now+15000;}
  if(m.mode==='extraction'){if(a.bag&&s.loot.length<12)s.loot.push({x:v.x,z:v.z,id:++s.phaseIndex+10});a.bag=0;}
  if(!k||k.id===v.id||k.team===v.team)return true;
  if(method==='weapon'){k.asc.weaponKills[k.weapon]++;(k.asc.opponentWeapons[v.id]??=[0,0,0,0])[k.weapon]++;}
  k.asc.opponents[v.id]=(k.asc.opponents[v.id]||0)+1;
  if(m.mode==='gunrun'){k.asc.stage++;m.score[k.team]=Math.max(m.score[k.team],k.asc.stage);if(k.asc.stage>=s.rules.order.length)h.finish(m,k.team,'final weapon',now);else k.asc.weapon=s.rules.order[k.asc.stage];}
  if(m.mode==='chamber')k.ammo[k.asc.weapon]++;
  if(m.mode==='bounty'){
    const value=a.bounty,credited=k.asc.opponents[v.id]<=2?value:1;
    k.asc.reward+=k.asc.opponents[v.id]<=2?value:0;k.asc.bounty=Math.min(5,k.asc.bounty+1);a.bounty=1;
    m.score[k.team]+=credited;if(m.score[k.team]>=m.limit)h.finish(m,k.team,'bounty limit',now);
  }
  if(['hardcore','fracture'].includes(m.mode)){m.score[k.team]++;if(m.score[k.team]>=m.limit)h.finish(m,k.team,'score',now);}
  return true;
}
export function ruleMove(m,p,dx,dz,dt,move){
  const a=p.asc;if(!a){move(m.field,p,dx,dz);return;}
  if(a.stunned>m.last)return;
  if(m.field.id==='lab'&&Math.abs(p.z)<9){dx*=.63;dz*=.63;}
  if(m.field.id==='orbit'||m.asc.rules.gravity==='low'){
    const mix=1-Math.exp(-dt*3);a.vx+=(dx/Math.max(.001,dt)-a.vx)*mix;a.vz+=(dz/Math.max(.001,dt)-a.vz)*mix;
    dx=a.vx*dt;dz=a.vz*dt;
  }
  move(m.field,p,dx,dz);
}
function roundWin(m,team,now,h){
  const s=m.asc;if(team!=null)m.score[team]++;
  markEvent(m,now,'round','Round '+s.round+' finished');
  if(team!=null&&m.score[team]>=3){h.finish(m,team,'rounds',now);return;}
  s.round++;s.armed=false;s.carrier=null;s.channel=0;s.attacker=1-s.attacker;s.deadline=now+75000;
  for(const p of m.players.values())if(!p.forfeited){p.reversed=!!s.attacker;h.spawn(p,now);}
  if(m.mode==='roulette'){roundWeapon(m);s.deadline=now+30000;}
}
function wave(m,now){
  const s=m.asc;s.wave++;const players=m.players.size;
  const raid=m.mode==='titan'||m.mode==='worldboss';const boss=raid||s.wave===4;
  for(let i=0;i<(boss?1:Math.min(8,2+s.wave+players));i++){
    const max=boss?(raid?210:125)*players:20+10*s.wave;
    s.enemies.push({id:-1-i,x:boss?0:(i%4-1.5)*5,z:boss?-4:-14-(i%2)*4,team:1,jump:0,hp:max,max,
      kind:boss?'titan':i%2?'scout':'brute',shieldUntil:boss&&raid?Infinity:0});
  }
  s.phase='wave';s.channel=0;s.nextAttack=now+4000;
}
function damageWorld(m,p,amount,now,h){
  if(!p.hp||p.shieldUntil>now)return;
  p.hp=Math.max(0,p.hp-amount);
  if(!p.hp){h.eliminate(m,p,null,now);if(COOP.includes(m.mode))p.spawnAt=0;}
}
export function tickWorld(m,now,dt,h){
  const s=m.asc;if(!s)return;
  const people=[...m.players.values()].filter(p=>!p.forfeited&&!p.offlineAt),alive=people.filter(p=>p.hp>0);
  const teams=[0,1].map(t=>alive.filter(p=>p.team===t));
  const use=(p,spot,r=2.5)=>p.input.use&&near(p,spot,r);
  const kill=(p,n)=>damageWorld(m,p,n,now,h);
  const before=s.shields.length;s.shields=s.shields.filter(c=>c.until>now&&c.hp>0);
  if(before!==s.shields.length){m.field.cover=m.field.cover.filter(c=>c.material!=='shield'||s.shields.includes(c));s.geometry++;}
  for(const p of alive){
    const a=p.asc;a.heat=Math.max(0,a.heat-dt*13);if(a.heat<=20)a.locked=false;
    if(m.field.id==='lab'){a.oxygen=clamp(a.oxygen+(Math.abs(p.z)<9?-dt:3*dt),0,12);if(!a.oxygen)kill(p,dt*11);}
    if(m.field.id==='train'&&Math.abs(p.x)>9)kill(p,dt*18);
    const runes=m.field.id==='train'?[{x:-3,z:-10},{x:2,z:-15},{x:-4,z:-12}]:VAULT;
    const expected=runes[a.vault];
    if(expected&&use(p,expected,1.8)&&a.vaultReady!==false){
      a.vault++;a.vaultReady=false;
      if(a.vault===3&&m.field.cover.some(c=>c.material==='vault')){
        s.vaultOpen=true;m.field.cover=m.field.cover.filter(c=>c.material!=='vault');s.geometry++;s.broken.push('vault');
      }
    }
    if(!p.input.use)a.vaultReady=true;
    if(a.vault===3&&s.vaultOpen&&use(p,{x:m.field.id==='train'?-4:-18,z:-18},2.2))a.found=true;
  }
  if(COOP.includes(m.mode)&&!alive.length){h.finish(m,1,'team eliminated',now);return;}
  switch(m.mode){
    case 'payload': {
      const core={x:0,z:-17+s.progress*34};
      const attack=teams[0].some(p=>near(p,core,4)),defend=teams[1].some(p=>near(p,core,4));
      if(attack&&!defend)s.progress=Math.min(1,s.progress+dt/30);
      if(Math.floor(s.progress*3)>s.checkpoint){s.checkpoint++;s.deadline+=20000;m.score[0]=s.checkpoint;markEvent(m,now,'checkpoint','Convoy checkpoint '+s.checkpoint);}
      if(s.progress>=1)h.finish(m,0,'convoy delivered',now);
      else if(now>=s.deadline){if(attack){s.phase='overtime';s.grace=now+3000;}else if(now>=(s.grace||s.deadline)){m.score[1]=1;h.finish(m,1,'convoy stopped',now);}}
      break;
    }
    case 'search':{
      const site={x:0,z:s.attacker? -12:12},team=s.armed?1-s.attacker:s.attacker;
      const operator=teams[team].find(p=>use(p,site));
      if(operator){if(s.carrier!==operator.id)s.channel=0;s.carrier=operator.id;s.channel+=dt;}
      else{s.channel=0;s.carrier=null;}
      if(s.channel>=3){if(s.armed){roundWin(m,team,now,h);break;}s.armed=true;s.carrier=null;s.channel=0;s.deadline=now+22000;markEvent(m,now,'plant','Beacon charge armed');}
      if(now>=s.deadline)roundWin(m,s.armed?s.attacker:1-s.attacker,now,h);
      else if(!teams[1-s.attacker].length||(!s.armed&&!teams[s.attacker].length))roundWin(m,teams[1-s.attacker].length?1-s.attacker:s.attacker,now,h);
      break;
    }
    case 'flags':{
      for(const f of s.flags){
        const owner=FLAGS[f.team],carrier=m.players.get(f.holder);
        if(carrier?.hp&&!carrier.offlineAt){f.x=carrier.x;f.z=carrier.z;
          const home=s.flags[carrier.team];if(near(carrier,FLAGS[carrier.team],2.5)&&home.holder==null&&near(home,FLAGS[carrier.team],.1)){
            m.score[carrier.team]++;Object.assign(f,owner,{holder:null,returnAt:0});
            if(m.score[carrier.team]>=3)h.finish(m,carrier.team,'flags captured',now);
          }
        }else{if(f.holder!=null){f.holder=null;f.returnAt=now+15000;}
          if(f.returnAt&&(now>=f.returnAt||teams[f.team].some(p=>use(p,f))))Object.assign(f,owner,{returnAt:0});
          const thief=teams[1-f.team].find(p=>use(p,f));if(thief){f.holder=thief.id;f.returnAt=0;}
        }
      }break;
    }
    case 'chamber':for(const team of [0,1])if(!people.some(p=>p.team===team&&p.asc.lives>0)){m.score[1-team]=1;h.finish(m,1-team,'last chamber',now);break;}break;
    case 'roulette':if(!teams[0].length||!teams[1].length||now>=s.deadline)roundWin(m,!teams[0].length?1:!teams[1].length?0:null,now,h);break;
    case 'extraction':{
      for(const p of alive){const a=p.asc,drop=s.loot.find(c=>use(p,c,2));
        if(drop&&a.bag<3){s.loot.splice(s.loot.indexOf(drop),1);a.bag++;}
        a.hold=a.bag&&use(p,FLAGS[p.team],3)?a.hold+dt:0;
        if(a.hold>=4){a.bank+=a.bag;m.score[p.team]+=a.bag;a.bag=0;a.hold=0;markEvent(m,now,'extract',p.name+' extracted');}
      }
      if(!s.loot.length&&!people.some(p=>p.asc.bag)){h.finish(m,m.score[0]===m.score[1]?null:Number(m.score[1]>m.score[0]),'extraction',now);}break;
    }
    case 'race':for(const p of alive){const a=p.asc,g=GATES[a.gate];if(!g||!near(p,g,2.1)||p.jump<.25)continue;
      a.lastGate=g;a.gate++;if(a.gate===GATES.length){a.finish=now-m.started;s.scores.push({name:p.name,time:a.finish});m.score[p.team]++;if(!s.firstFinish)s.firstFinish=now;}
    }if(s.firstFinish&&(now-s.firstFinish>=12000||people.every(p=>p.asc.finish))){const winner=people.find(p=>p.asc.finish===s.scores[0].time);h.finish(m,winner?.team??null,'race finished',now);}break;
    case 'fracture':{
      const phase=Math.floor((now-m.started)/12000)%2;if(phase!==s.phaseIndex){s.phaseIndex=phase;
        m.field.cover=m.field.cover.filter(c=>c.material!=='rift');
        if(phase)for(const x of [-10,10])if(!alive.some(p=>near(p,{x,z:-2},3)))m.field.cover.push(box('rift'+x,x,-2,3,3,2,'rift'));
        s.geometry++;}break;
    }
    case 'volcano':{
      const radius=Math.max(3,9-((now-m.started)/1000)*.08),step=Math.floor((now-m.started)/10000);
      const pos=[{x:0,z:4},{x:8,z:3},{x:-6,z:-3}][step%3];
      s.safe={...pos,r:rounded(radius),level:rounded(Math.min(.75,(now-m.started)/75000)),next:m.started+(step+1)*10000};
      if(now-m.started>5000)for(const p of alive)if(!near(p,pos,radius))kill(p,dt*(3+step));
      if(now>=s.deadline&&alive.some(p=>p.hp>0)){m.score[0]=1;h.finish(m,0,'eruption survived',now);}break;
    }
    case 'worldboss':case 'titan':case 'invasion':{
      if(!s.enemies.length&&now>=s.nextWave)wave(m,now);
      const boss=s.enemies.find(e=>e.kind==='titan');
      if(boss&&m.mode!=='invasion'){
        const pads=[{x:-5,z:5},{x:5,z:5}];s.pads=pads.map(v=>alive.some(p=>use(p,v,2.5)));
        if(s.pads.every(Boolean)){s.channel+=dt;if(s.channel>=1.5)boss.shieldUntil=0;}else s.channel=0;
      }
      for(const e of s.enemies.filter(e=>e.hp>0&&e.kind!=='titan')){
        const target=alive.reduce((a,p)=>near(p,e,Math.hypot(a.x-e.x,a.z-e.z))?p:a,alive[0]);if(!target)continue;
        const dx=target.x-e.x,dz=target.z-e.z,d=Math.hypot(dx,dz)||1;
        const step=(e.kind==='scout'?3.7:2)*dt;h.move(m.field,e,dx/d*step,dz/d*step);
        if(d<1.6)kill(target,dt*(e.kind==='scout'?5:9));
      }
      if(s.warning&&now>=s.warning.at){
        for(const p of alive)if(near(p,s.warning,s.warning.r))kill(p,s.warning.heavy?48:24);s.warning=null;
      }
      if(boss?.hp>0&&now>=s.nextAttack&&alive.length){
        const phase=boss.hp/boss.max<.5?2:1,heavy=s.phaseIndex++%2===1,target=alive[s.phaseIndex%alive.length];
        s.warning={x:heavy?boss.x:target.x,z:heavy?boss.z:target.z,r:heavy?9:3.5,at:now+1100,heavy};s.nextAttack=now+(phase===2?2100:3400);
      }
      if(s.enemies.length&&s.enemies.every(e=>e.hp<=0)){
        m.score[0]=s.wave;if(m.mode!=='invasion'||s.wave>=4)h.finish(m,0,'cooperative victory',now);
        else{s.enemies=[];s.nextWave=now+1600;s.phase='intermission';}
      }break;
    }
  }
}
export function worldView(m,p){
  const s=m.asc;if(!s)return undefined;
  const a=p?.asc;
  return {phase:s.phase,round:s.round,attacker:s.attacker,deadline:s.deadline,progress:rounded(s.progress),checkpoint:s.checkpoint,
    channel:rounded(s.channel),armed:s.armed,flags:m.mode==='flags'?s.flags:undefined,loot:m.mode==='extraction'?s.loot:undefined,
    leaders:m.mode==='race'?s.scores:undefined,gates:m.mode==='race'?GATES:undefined,
    bounty:m.mode==='bounty'?[...m.players.values()].sort((l,r)=>r.asc.bounty-l.asc.bounty)[0]?.name:undefined,
    self:a?{lives:a.lives,stage:a.stage,bag:a.bag,bank:a.bank,gate:a.gate,bounty:a.bounty,vault:a.vault,found:a.found,
      heat:Math.round(a.heat),dual:a.dual,emp:a.emp,parry:a.parry,oxygen:Math.ceil(a.oxygen),hold:rounded(a.hold)}:undefined,
    geometry:s.geometry,broken:s.broken,shields:s.shields.map(({id,x,z,w,d,h})=>({id,x,z,w,d,h})),
    rifts:m.mode==='fracture'?m.field.cover.filter(c=>c.material==='rift'):undefined,era:s.phaseIndex%2,
    wave:s.wave,enemies:s.enemies.map(({id,x,z,hp,max,kind,shieldUntil})=>({id,x:rounded(x),z:rounded(z),hp:Math.ceil(hp),max,kind,shield:shieldUntil>m.last})),
    safe:s.safe,warning:s.warning,pads:s.pads,vaultOpen:s.vaultOpen};
}
