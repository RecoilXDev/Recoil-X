import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {runInNewContext} from 'node:vm';

const source=readFileSync(new URL('../server/a-curator.js',import.meta.url),'utf8');
const context={window:{}};
runInNewContext(source.replace('window.RXCurator=', 'window.camera={firstPerson,firstPersonScene};window.RXCurator='),context);
const {firstPerson,firstPersonScene}=context.window.camera;

function frame(objects,{yaw=0,player={x:0,z:0},width=101,found=new Set()}={}){
 const strips=[];
 const brush={
  createLinearGradient:()=>({addColorStop(){}}),
  fillRect(x,y,w,h){strips.push({color:this.fillStyle,x,y,w,h});},
  beginPath(){},moveTo(){},lineTo(){},stroke(){}
 };
 firstPerson({width,height:150,getContext:()=>brush},objects,found,player,yaw);
 return strips;
}

test('first-person camera sees the nearest solid and the arena edge at the correct depth on every heading',()=>{
 const width=101,center=50;
 for(const [x,z,yaw] of [[0,-1,0],[1,0,Math.PI/2],[0,1,Math.PI],[-1,0,-Math.PI/2]]){
  const objects=[{type:'tree',x:2*x,z:2*z},{type:'block',x,z}];
  const near=frame(objects,{yaw}).find(strip=>strip.x===center&&strip.color==='#aa8060');
  assert.ok(near);
  assert.ok(Math.abs(near.h-width)<1e-8); // 0.5 cells to the nearest face.
  const edge=frame([],{yaw,player:{x:-8*x,z:-8*z}}).find(strip=>strip.x===center&&strip.color==='#564638');
  assert.ok(edge);
  assert.ok(Math.abs(edge.h-width/2/16.5)<1e-8);
 }
});

test('a flat wall stays level off-axis and occludes only the sprite columns behind it',()=>{
 const wall=Array.from({length:9},(_,i)=>({type:'wall',x:i-4,z:-4}));
 const flat=frame(wall).filter(strip=>strip.color==='#dcc5a0');
 assert.equal(flat.length,101);
 for(const strip of flat)assert.ok(Math.abs(strip.h-50.5/3.5)<1e-8);

 const target={type:'target',x:1,z:-3};
 const visible=frame([target]).filter(strip=>strip.color==='#ffd15d');
 const partial=frame([target,{type:'wall',x:0,z:-2}]).filter(strip=>strip.color==='#ffd15d');
 assert.ok(partial.length>0&&partial.length<visible.length);
 assert.equal(partial.at(-1).x,visible.at(-1).x);
 assert.equal(frame([...wall,{...target,z:-5}]).some(strip=>strip.color==='#ffd15d'),false);
 assert.equal(frame([target],{found:new Set(['1,-3'])}).some(strip=>strip.color==='#ffd15d'),false);
});

test('rays cross diagonal corners and visit each crossed grid cell once',()=>{
 const corner=[{type:'wall',x:1,z:0},{type:'tree',x:1,z:-1}];
 const diagonal=frame(corner,{yaw:Math.PI/4}).find(strip=>strip.x===50&&strip.color==='#528b65');
 assert.ok(diagonal);
 assert.ok(Math.abs(diagonal.h-50.5*Math.SQRT2)<1e-8);

 const objects=[],scene=firstPersonScene(objects);
 let reads=0;
 scene.walls=new Proxy(scene.walls,{get(target,key){reads++;return target[key];}});
 frame(objects,{width:320});
 assert.ok(reads>0&&reads<=17*320,'each ray visits at most 17 cells from the center');
 assert.equal(firstPersonScene(objects),scene);
});
