import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {createAProgression,SEASON_START} from '../server/a-progression.mjs';
import {createCuratorRooms} from '../server/a-curator-rooms.mjs';
import {validateProject} from '../server/a-curator.mjs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('framebuffer pixel caps apply to HD and 4K televisions',()=>{
 const src=html.slice(html.indexOf('function aFramePixelBudget('),html.indexOf('function resize(){'));
 const {aFramePixelBudget:budget,aFrameDimensions:dimensions}=new Function(src+'\nreturn {aFramePixelBudget,aFrameDimensions};')();
 for(const mode of ['pi','school','balanced','max'])for(const [w,h] of [[1920,1080],[3840,2160],[720,1280]]){const [x,y]=dimensions(w,h,1.5,budget(mode));assert(x*y<=budget(mode));assert(Math.abs(x/y-w/h)<.01);}
 assert.equal(budget('pi',200000),200000);
 for(const mode of ['pi','school','balanced','max'])for(const [w,h] of [[1000000,1],[1,1000000]]){const [x,y]=dimensions(w,h,1.5,budget(mode));assert(x>=1&&y>=1&&x*y<=budget(mode));}
});
test('only claimed seasonal titles can be equipped and remain available after season',()=>{
 const db=new DatabaseSync(':memory:');let now=SEASON_START;
 try{db.exec('CREATE TABLE users(id INTEGER PRIMARY KEY,name TEXT,banned INTEGER DEFAULT 0);INSERT INTO users VALUES(1,\'Test\',0);');
 const p=createAProgression(db,{clock:()=>now}),u={id:1};assert.throws(()=>p.equipPass(u,1),{status:403});
 p.settle({id:'test',mode:'arena',winner:0,duration:60000,players:[{id:1,team:0,inputs:25,kills:1}]},now);
 p.claimPass(u,1);assert.equal(p.equipPass(u,1).equipped,1);now+=200*86400000;assert.equal(p.passView(u).equipped,1);assert.equal(p.equipPass(u,null).equipped,null);
 }finally{db.close();}
});
test('Curator penalty respawns and subtracts time; survival cannot use it',()=>{
 let now=1000;const fail=(status,message)=>Object.assign(Error(message),{status});
 const project={name:'Penalty',mode:'collect',seconds:60,objects:[{type:'spawn',x:0,z:0},{type:'hazard',x:1,z:0},{type:'target',x:2,z:0}],rules:{hazard:'penalty',targetBonus:0}};
 assert.throws(()=>validateProject({...project,mode:'survive'},fail),{status:400});
 const rooms=createCuratorRooms(fail,{clock:()=>now}),u={id:1,name:'Test'};
 const start=rooms.create(u,validateProject(project,fail)),after=rooms.move(u,{dx:1,dz:0});
 assert.equal(after.ends,start.ends-5000);assert.equal(after.players[0].x,0);
});
