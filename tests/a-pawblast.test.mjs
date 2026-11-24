import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makeMatch,inputMatch,updateMatch,snapshot,MODES} from '../server/overdrive-match.mjs';
import {resetPawblast,pawblastImpact,pawblastStep} from '../server/a-pawblast.mjs';
const controls={f:0,s:0,yaw:Math.PI,pitch:0,weapon:0};
function match(){return makeMatch({id:'pawblast',mode:'pawblast',limit:5,now:1000,rng:()=>.5,players:[{id:1,team:0,name:'Blue'},{id:2,team:1,name:'Gold'}]});}
test('Pawblast is selectable, spawns on the platform and exposes personal charge',()=>{
 const m=match();assert(MODES.includes('pawblast'));assert.equal(m.field.half,20);assert.equal(m.field.pawblast,true);
 assert.equal(m.players.get(1).z,-12);assert.equal(m.players.get(2).z,12);
 assert.equal(snapshot(m,1,1000).objective.charge,0);
});
test('hits launch opponents without reducing HP; ring-outs score and reset launch charge on respawn',()=>{
 const m=match(),p=m.players.get(1),v=m.players.get(2);
 Object.assign(p,{x:0,z:11,readyShot:0});Object.assign(v,{x:0,z:18.9,shieldUntil:0});
 assert(inputMatch(m,1,{...controls,seq:1,fire:true},1100));updateMatch(m,1150);
 assert.equal(v.hp,100);assert(v.paw.charge>0);assert(v.paw.vz>0);
 assert.equal(m.score[0],0);assert(snapshot(m,2,1150).objective.charge>0);
 for(let i=1;i<=20&&v.hp;i++)updateMatch(m,1150+i*50);
 assert.equal(v.hp,0);assert.equal(m.score[0],1);assert.equal(p.kills,1);
 p.input.fire=false;p.taps=null;
 updateMatch(m,v.spawnAt+1);assert.equal(v.hp,100);assert.equal(v.paw.charge,0);assert.equal(v.z,12);
});
test('repeated impacts increase launch power but velocity and charge stay bounded',()=>{
 const p={id:1,x:0,z:0,yaw:0},v={id:2,x:0,z:1,spawnX:0,team:1};resetPawblast(v);v.z=1;
 const first=pawblastImpact(p,v,22,1000),second=pawblastImpact(p,v,22,1100);assert(second>first);
 for(let i=0;i<200;i++)pawblastImpact(p,v,76,1200+i);
 assert(v.paw.charge<=180);assert(Math.hypot(v.paw.vx,v.paw.vz)<=26.000001);
 v.z=19.9;assert.equal(pawblastStep(v,.05),true);
});
