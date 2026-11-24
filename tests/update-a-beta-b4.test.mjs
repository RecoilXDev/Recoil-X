import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCuratorRooms} from '../server/a-curator-rooms.mjs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('bot search has a shared frame budget and resets next frame',()=>{
 const src=html.slice(html.indexOf('let aBotPlanFrame='),html.indexOf('function aBotSegmentClear('));
 let quality=0;
 const budget=new Function('v91EffectiveGraphics',src+'\nreturn aBotPlanBudget;')(()=>quality);
 assert.equal(budget(1),true);assert.equal(budget(1),false);
 quality=2;assert.equal(budget(2),true);assert.equal(budget(2),true);assert.equal(budget(2),false);
});
test('indexed Curator objectives retain collision and shared scoring',()=>{
 let now=0;const r=createCuratorRooms((status,message)=>Object.assign(Error(message),{status}),{clock:()=>now});
 const u={id:1,name:'Test'},p={name:'Arena',mode:'collect',seconds:60,objects:[{type:'spawn',x:0,z:0},{type:'wall',x:0,z:1},{type:'target',x:1,z:0}]};
 r.create(u,p);assert.equal(r.move(u,{dx:0,dz:1}).players[0].z,0);
 now=400;const result=r.move(u,{dx:1,dz:0});assert.equal(result.result,'All targets collected');
 assert.equal(result.found.length,1);
});
