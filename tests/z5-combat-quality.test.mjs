import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
 HEAT_PER_SHOT,initCombatQuality,coolCombatQuality,heatAllowsShot,
 recordCombatShot,allowCombatInput
} from '../server/z5-combat-quality.mjs';
import {makeMatch,inputMatch,updateMatch,snapshot} from '../server/overdrive-match.mjs';

test('heat is per weapon, requires sustained shots, and recovers after cooling',()=>{
 const p={};initCombatQuality(p);
 assert.equal(HEAT_PER_SHOT[1],0);
 for(let i=0;i<12;i++)recordCombatShot(p,0);
 assert.equal(heatAllowsShot(p,0),true);
 assert.equal(recordCombatShot(p,0),true);
 assert.equal(heatAllowsShot(p,0),false);
 assert.equal(heatAllowsShot(p,3),true);
 coolCombatQuality(p,.15);
 assert.equal(heatAllowsShot(p,0),false);
 for(let i=0;i<30;i++)coolCombatQuality(p,.15);
 assert.equal(heatAllowsShot(p,0),true);
 assert.equal(p.rx5Heat[0],0);
});
test('invalid timing and 121st input in a one-second interval are rejected',()=>{
 const p={};initCombatQuality(p);
 for(let i=0;i<120;i++)assert.equal(allowCombatInput(p,10000+i*3),true);
 assert.equal(allowCombatInput(p,10400),false);
 assert.equal(allowCombatInput(p,11002),true);
 assert.equal(allowCombatInput(p,NaN),false);
});
test('multiplayer state contains private heat only for viewer, not actor rows',()=>{
 const now=1000000;
 const m=makeMatch({id:'test',mode:'arena',limit:5,players:[
   {id:101,name:'Alpha',team:0},{id:102,name:'Bravo',team:1}
 ],now});
 const a=m.players.get(101),b=m.players.get(102);
 assert.equal(a.rx5Heat[0],0);
 assert.equal(inputMatch(m,101,{seq:1,f:0,s:0,yaw:0,pitch:0,weapon:0,fire:true},now+100),true);
 updateMatch(m,now+100);
 // One warm-up shot can occur after spawn protection; heat is server-owned.
 assert.ok(a.rx5Heat[0]>=0);
 assert.equal(snapshot(m,101,now+100).heat!==undefined,true);
 assert.equal(snapshot(m,102,now+100).heat,b.rx5Heat[b.weapon]);
 assert.equal(snapshot(m,102,now+100).overheated,false);
});
