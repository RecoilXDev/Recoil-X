import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const start=html.indexOf('function bSoldierLodPlan('),end=html.indexOf('let bSoldierLods=',start);
assert.ok(start>=0&&end>start);
const plan=new Function(html.slice(start,end)+';return bSoldierLodPlan;')();
const c=[9,3,19,5,24,40].map(distance=>({actor:{distance},distance}));
test('healthy hardware uses nearest original full-detail A.4 rigs and caps additional work',()=>{
 const p=plan(c,true,30,30,1,0);
 assert.equal(p.get(c[1].actor),0);assert.equal(p.get(c[3].actor),0);
 assert.equal(p.get(c[0].actor),1);assert.equal(p.get(c[2].actor),1);assert.equal(p.get(c[4].actor),1);
 assert.equal(p.has(c[5].actor),false);
});
test('software renders at most one full and one medium soldier only when FPS permits',()=>{
 const p=plan(c,false,30,30,1,0);
 assert.equal(p.get(c[1].actor),0);assert.equal(p.get(c[3].actor),1);assert.equal(p.size,2);
 const modest=plan(c,false,25,30,1,0);assert.equal(modest.size,1);assert.equal(modest.get(c[1].actor),1);
 assert.equal(plan(c,false,16,30,1,0).size,0);
 assert.equal(plan(c,true,30,30,1,12).size,0);
 assert.equal(plan(c,true,30,30,.6,0).size,0);
});
test('third-person local soldier takes priority; invalid or duplicate actors cannot spend the budget',()=>{
 const local={actor:{},distance:7,local:true};
 const p=plan([...c,c[1],{actor:{},distance:NaN},local],true,30,30,1,0);
 assert.equal(p.get(local.actor),0);assert.equal(p.get(c[1].actor),0);assert.equal(p.get(c[3].actor),1);
 assert.equal(p.size,5);
});
test('TV soldier drawing uses original A.4 mesh and rig while keeping emergency fallback',()=>{
 assert.match(html,/tvLod=tv\?bSoldierLods\.get\(b\):undefined/);
 assert.match(html,/if\(tv&&tvLod===undefined\)\{rxTvDrawActor\(out,b,kind\);return;\}/);
 assert.match(html,/lod=tvLod\?\?baseLod/);
 assert.match(html,/mesh=crownMesh\(model,lod,variant\)/);
 assert.match(html,/crownEmitRig\(out,mesh,pose,palette,scale\)/);
 assert.match(html,/bSoldierLodPlan\(candidates,!!gl,fpsValue,v91FpsTarget\(\),perfResolutionScale,perfFramesSlow\)/);
});
