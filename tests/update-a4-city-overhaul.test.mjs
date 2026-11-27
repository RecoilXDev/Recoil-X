import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import '../server/recoil-city-world.js';
const source=readFileSync(new URL('../server/recoil-city-view.js',import.meta.url),'utf8');
function renderer(ua='desktop'){
 const win={RecoilCityWorld:globalThis.RecoilCityWorld};
 const expose='window.__a4={mesh,local,building,palm,scenery,automobile,a4InteriorDetails,a4CarProfile};';
 new Function('window','navigator','document',source.replace('window.RecoilCityView=Object.freeze',expose+'window.RecoilCityView=Object.freeze'))(win,{userAgent:ua},{});
 return win.__a4;
}
function valid(m){assert.ok(m.faces.length);for(const f of m.faces){assert.ok(f.p.length>=3);assert.ok(f.p.flat().every(Number.isFinite));assert.ok(f.c.rgb.every(n=>Number.isFinite(n)&&n>=0&&n<=1));if(f.uv)assert.ok(f.uv.flat().every(n=>Number.isFinite(n)&&n>=0&&n<=1024));}}
test('A.4 all expanded buildings have valid geometry and facade UVs',()=>{
 const a=renderer(),map=globalThis.RecoilCityWorld.map;
 for(const b of map.blocks.filter(b=>b.kind==='building')){const m=a.mesh();a.building(a.local(m),b,1,true,true);valid(m);assert.ok(m.faces.length<700);}
});
test('A.4 palm high detail is bounded and low tier remains simpler',()=>{
 const a=renderer(),counts=[];for(const [detail,rich] of [[false,false],[true,false],[true,true]]){const m=a.mesh();a.palm(a.local(m),20,30,22,detail,rich);valid(m);counts.push(m.faces.length);}assert.ok(counts[0]<counts[1]&&counts[1]<counts[2]&&counts[2]<250);
});
test('A.4 sport, utility and sedan shells and cockpits produce finite geometry',()=>{
 const a=renderer(),kinds=new Set();for(const id of ['vista','a1-sprint','a1-trail','a1-nova','patrol']){const v={id,x:0,y:0,angle:0,hp:100,color:'#e97e49',wheel:.5,steer:.2,kind:id==='patrol'?'patrol':'parked'};kinds.add(a.a4CarProfile(v).kind);for(const inside of [false,true]){const m=a.mesh();m.detail='high';a.automobile(m,v,true,1,inside,true);valid(m);assert.ok(m.faces.length<950);}}assert.equal(kinds.size,3);
});
test('A.4 interior variants are bounded and geometrically distinct',()=>{
 const a=renderer(),counts=[];for(const s of [{safe:true,kind:'home'},{safe:true,kind:'club'},{id:'eastshop'},{id:'cafe'}]){const m=a.mesh();a.a4InteriorDetails(a.local(m),s,true);valid(m);assert.ok(m.faces.length<650);assert.ok(m.faces.every(f=>f.p.every(([x,y,z])=>Math.abs(x)<=15&&Math.abs(y)<=11&&z>=0&&z<=16)));counts.push(m.faces.length);}assert.equal(new Set(counts).size,4);
});
test('A.4 Smart TV keeps the low complexity car geometry even on high setting',()=>{
 const a=renderer('Samsung SMART-TV Tizen'),v={id:'vista',x:0,y:0,angle:0,hp:100,color:'#e97e49',wheel:0,steer:0,kind:'parked'};const counts=[];for(const detail of ['low','high']){const m=a.mesh();m.detail=detail;a.automobile(m,v,true,1,false,true);valid(m);counts.push(m.faces.length);}assert.equal(counts[0],counts[1]);
});
