import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync,mkdtempSync,rmSync } from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import { createRecoilServer } from '../server/server.mjs';
const path=new URL('../server/',import.meta.url);
const read=name=>readFileSync(new URL(name,path),'utf8');

test('Z.5 uses in-game navigation rather than permanent LAB or admin launchers',()=>{
 const nav=read('z5-ingame.js'),career=read('z5-panel.js'),admin=read('admin-panel.js');
 const server=read('server.mjs');
 assert.match(nav,/rx5-native-main/);
 assert.match(nav,/rx5-native-advanced/);
 assert.match(nav,/rx5-native-pause/);
 for(const name of ['Career & Clans','Forge & Market','Match Hub','Admin'])assert.ok(nav.includes(name),name);
 assert.ok(!career.includes("document.body.append(open)"),'no permanent LAB launcher');
 assert.ok(!career.includes('Z.5 LAB'),'no LAB heading or menu');
 assert.ok(!admin.includes('document.body.append(launch)'),'no public admin launcher');
 assert.ok(!admin.includes("rx-admin-token"),'no separate admin login session');
 assert.ok(!admin.includes("addEventListener('submit',async e=>{e.preventDefault();const b=read(e.target);\n try{const d=await api('login'"),'no admin-only login flow');
 assert.match(admin,/d\.user\?\.admin/);
 assert.match(admin,/setTabVisible\(false\)/);
 assert.match(admin,/window\.RXZ5Admin=\{open,refresh:verify\}/);
 assert.match(nav,/button\.hidden=true/);
 assert.match(server,/z5-ingame\.js/);
});
test('primary game session is shared with Career and gated Admin, without hardcoded admin names',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(html,/source:'game',token:sameOrigin\?z1Token:''/);
 assert.match(html,/if\(update\?\.source!=='career'\)return/);
 assert.match(html,/z1Token=update\.token;z1UseAccount\(update\.user\)/);
 assert.match(html,/brand:'RECOIL X · UPDATE '\+version/);
 assert.match(html,/querySelector\('\.brandchip'\)\.textContent=RX_RELEASE\.brand/);
 const admin=read('admin-panel.js');
 assert.ok(!/salim158/i.test(admin),'admin names must never be hardcoded as an authorization rule');
});
test('staged server serves all three integrated menu assets and enforces auth on admin endpoints',async()=>{
 const server=createRecoilServer({database:':memory:',origins:[]});
 try{
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
  const base='http://127.0.0.1:'+server.address().port;
  const htmlResponse=await fetch(base+'/'),html=await htmlResponse.text();
  assert.equal(htmlResponse.status,200);
  assert.match(html,/script src="\/z5-ingame\.js" defer/);
  for(const route of ['/z5-ingame.js','/z5-panel.js','/admin-panel.js','/z5-economy-panel.js']){
   const r=await fetch(base+route);assert.equal(r.status,200,route);
   assert.match(r.headers.get('content-type'),/javascript/);
  }
  const unauth=await fetch(base+'/rx-api/admin/overview');
  assert.ok([401,403].includes(unauth.status),'Admin endpoint must reject guests');
  const unauthZ5=await fetch(base+'/rx-api/z5/admin/audit');
  assert.ok([401,403].includes(unauthZ5.status));
 }finally{await new Promise(resolve=>server.close(resolve));}
});

test('server denies nonadmins and revoked administrators even with a valid game token',{timeout:30000},async()=>{
 const dir=mkdtempSync(join(tmpdir(),'recoil-z5-role-')),file=join(dir,'players.sqlite');
 const server=createRecoilServer({database:file,origins:[]});
 let db;
 try{
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
  const base='http://127.0.0.1:'+server.address().port;
  const r=await fetch(base+'/rx-api/register',{method:'POST',
   headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Z5TestUser',password:'test_secure_2026_abc'})});
  const data=await r.json();
  assert.equal(r.status,200,JSON.stringify(data));
  assert.equal(data.user.admin,false);
  const headers={Authorization:'Bearer '+data.token};
  const get=async(path)=>fetch(base+'/rx-api'+path,{headers});
  assert.equal((await get('/me')).status,200);
  assert.equal((await get('/admin/overview')).status,403);
  assert.equal((await get('/z5/admin/health')).status,403);
  db=new DatabaseSync(file);
  db.prepare('UPDATE users SET admin=1 WHERE handle=?').run('z5testuser');
  const elevated=await (await get('/me')).json();assert.equal(elevated.user.admin,true);
  assert.equal((await get('/admin/overview')).status,200);
  assert.equal((await get('/z5/admin/health')).status,200);
  db.prepare('UPDATE users SET admin=0 WHERE handle=?').run('z5testuser');
  assert.equal((await get('/admin/overview')).status,403);
  assert.equal((await get('/z5/admin/health')).status,403);
 }finally{db?.close();await new Promise(resolve=>server.close(resolve));rmSync(dir,{recursive:true,force:true});}
});
