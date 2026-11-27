import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8'),city=readFileSync(new URL('../server/recoil-city-view.js',import.meta.url),'utf8');
const between=(s,a,b)=>s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a)));
const {shape,part,finish}=new Function(between(html,'const a4WeaponShapeCache=','function a4WeaponDetail(')+';return {shape:a4BeveledShape,part:a4BeveledPart,finish:a4WeaponVisualFinish};')();
test('A.4 beveled cosmetic parts preserve original box bounds and have finite unit normals',()=>{
 for(const [w,h,d] of [[.27,.23,.58],[.35,.28,.42],[.105,.1,.85],[.23,.204,.86]]){const m=shape(w,h,d);assert.equal(m.length,504);assert.equal(shape(w,h,d),m);
 for(let i=0;i<m.length;i+=6){assert.ok(Math.abs(m[i])<=w/2+1e-6&&m[i+1]>=0&&m[i+1]<=h+1e-6&&Math.abs(m[i+2])<=d/2+1e-6);assert.ok(Math.abs(Math.hypot(...m.slice(i+3,i+6))-1)<1e-6);}
 const o=[];part(o,1,2,3,w,h,d,[.2,.4,.6],(x,y,z)=>[x+10,-z+5,y-2]);assert.ok(o.every(Number.isFinite));assert.equal(o.length,756);}
});
test('A.4 visual finishes remain bounded and separate for each weapon class',()=>{
 const profiles=new Set();for(let i=0;i<4;i++){const p=[];finish(i,(...args)=>p.push(args),[.2,.3,.4],[.8,.7,.6],[.1,.1,.1],true);assert.ok(p.length>=10&&p.length<=16);assert.ok(p.every(a=>a.slice(0,6).every(Number.isFinite)&&a.slice(3,6).every(v=>v>0)));profiles.add(JSON.stringify(p));}assert.equal(profiles.size,4);
});
test('A.4 city weapons use bounded distinct geometry and unchanged TV fallback',()=>{
 const render=ua=>{const w={};new Function('window','navigator',city.replace('window.RecoilCityView=Object.freeze','window.__a4={mesh,local,heldWeapon};window.RecoilCityView=Object.freeze'))(w,{userAgent:ua});return w.__a4;};
 for(const ua of ['desktop','Samsung SMART-TV Tizen']){const a=render(ua),fingerprints=new Set();for(const id of ['ar','shot','sniper','smg']){const low=a.mesh(),high=a.mesh();a.heldWeapon(a.local(low),0,0,0,id,false);a.heldWeapon(a.local(high),0,0,0,id,true,true);assert.ok(high.faces.every(f=>f.p.flat().every(Number.isFinite)&&f.c.rgb.every(Number.isFinite)));assert.ok(high.faces.length<120);if(ua==='desktop'){assert.ok(high.faces.length>low.faces.length);fingerprints.add(JSON.stringify(high.faces));}else assert.deepEqual(high.faces,low.faces);}if(ua==='desktop')assert.equal(fingerprints.size,4);}
});
test('A.4 weapon detail remains quality gated and knife mesh cache separates detail',()=>{assert.match(html,/const modelDetail=!rxTvUltraLight\(\)&&v91EffectiveGraphics\(\)>=2/);assert.match(html,/detailed\?'a4-evolution':'base'/);assert.match(html,/if\(modelDetail\)\{a4WeaponDetail/);});
