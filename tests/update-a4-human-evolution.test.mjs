import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8'),city=readFileSync(new URL('../server/recoil-city.js',import.meta.url),'utf8'),view=readFileSync(new URL('../server/recoil-city-view.js',import.meta.url),'utf8');
const between=(s,a,b)=>s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a)));
test('A.4 story cast is finite and distinct, and unknown keys are safe',()=>{
 const {cast,appearance}=new Function(between(html,'const A4_HUMAN_CAST=','// City civilians reuse')+';return {cast:A4_HUMAN_CAST,appearance:a4HumanAppearance};')();
 assert.equal(Object.keys(cast).length,6);assert.equal(new Set(Object.values(cast).map(v=>v.variant)).size,6);
 for(const k of Object.keys(cast)){const p=appearance({character:k,hp:80,angle:1});assert.equal(p.name,cast[k].name);assert.equal(p.hp,80);assert.equal(p.angle,1);assert.match(p.color,/^#[a-f0-9]{6}$/);}
 assert.equal(appearance({id:13,character:'__proto__'}).variant,1);assert.equal(appearance({id:NaN}).variant,0);
});
test('A.4 human heads have bounded geometry for all six variants and detail tiers',()=>{
 const face=new Function(between(html,'function a4CivilianHead(','function crownHumanHead(')+';return a4CivilianHead;')();
 const fingerprints=new Set();for(const close of [false,true])for(let v=0;v<6;v++){
  const calls=[];const m=Object.fromEntries(['skin','ellipsoid','prism','gem'].map(k=>[k,(...a)=>calls.push([k,...a])]));
  face(m,v,close,{skin:6,shade:7});assert.ok(calls.length>=8&&calls.length<=22);
  const check=x=>{if(typeof x==='number')assert.ok(Number.isFinite(x));else if(Array.isArray(x))x.forEach(check);};calls.forEach(check);
  if(close)fingerprints.add(JSON.stringify(calls));
 }assert.equal(fingerprints.size,6);
});
test('A.4 City cast selection applies to gameplay and both cinematic entry paths',()=>{
 for(const k of ['ryan','marcus','victor','carter','eddie','leon'])assert.ok(city.includes('value="'+k+'"'));
 assert.match(city,/world\.player\.character=options\.character/);assert.equal((city.match(/next\.player\.character=options\.character/g)||[]).length,2);
 assert.match(html,/variant=lod<2\?person\.variant:0/);assert.match(view,/if\(shared&&!tvSafe\(\)\)/);assert.match(html,/if\(rxTvUltraLight\(\)\)\{rxTvDrawActor/);
});
