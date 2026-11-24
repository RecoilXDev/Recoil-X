import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createCurator,validateProject} from '../server/a-curator.mjs';
const fail=(status,message)=>Object.assign(new Error(message),{status});
const data=()=>({name:'Test Arena',mode:'collect',seconds:60,objects:[{type:'spawn',x:0,z:0},{type:'target',x:1,z:2}]});
test('curator normalizes allowed data and strips executable extras',()=>{
 const p=data();p.objects[0].script='alert(1)';p.script='bad';
 assert.deepEqual(validateProject(p,fail),data());
});
test('curator validates bounds, modes, duplicates and required markers',()=>{
 for(const mutate of [p=>p.objects.push({type:'block',x:0,z:0}),p=>p.objects[0].x=9,p=>p.objects[0].type='unknown',p=>p.objects.pop(),p=>p.seconds=301,p=>p.mode='arbitrary',p=>p.objects[0].type='wall']){
  const p=data();mutate(p);assert.throws(()=>validateProject(p,fail),e=>e.status===400);
 }
});
test('account ownership, private sharing and revocation',()=>{
 const db=new DatabaseSync(':memory:');try{
 db.exec('CREATE TABLE users(id INTEGER PRIMARY KEY); INSERT INTO users VALUES(1),(2);');
 const c=createCurator(db,fail),a={id:1},b={id:2};
 const {project:p}=c.save(a,data());assert.equal(p.published,false);
 assert.equal(c.list(a).projects.length,1);assert.equal(c.list(b).projects.length,0);
 assert.throws(()=>c.shared(p.id),e=>e.status===404);
 assert.throws(()=>c.save(b,{...data(),id:p.id}),e=>e.status===404);
 assert.throws(()=>c.share(b,{id:p.id,published:true}),e=>e.status===404);
 assert.throws(()=>c.remove(b,{id:p.id}),e=>e.status===404);
 c.share(a,{id:p.id,published:true});assert.equal(c.shared(p.id).project.name,p.name);
 c.save(a,{...data(),id:p.id,name:'Revised'});assert.throws(()=>c.shared(p.id),e=>e.status===404);
 c.remove(a,{id:p.id});assert.equal(c.list(a).projects.length,0);
 }finally{db.close();}
});
test('projects capped per account',()=>{
 const db=new DatabaseSync(':memory:');try{
 db.exec('CREATE TABLE users(id INTEGER PRIMARY KEY); INSERT INTO users VALUES(1);');
 const c=createCurator(db,fail),u={id:1};for(let i=0;i<20;i++)c.save(u,data());
 assert.throws(()=>c.save(u,data()),e=>e.status===409);
 }finally{db.close();}
});
