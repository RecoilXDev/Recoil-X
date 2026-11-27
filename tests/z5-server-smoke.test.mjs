import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createRecoilServer} from '../server/server.mjs';

test('staged server serves full Z.5 page, original saves path, Match Hub and health',async()=>{
 const server=createRecoilServer({database:':memory:',origins:[]});
 try{
   await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
   const base='http://127.0.0.1:'+server.address().port;
   const home=await fetch(base+'/');
   assert.equal(home.status,200);
   const html=await home.text();
   for(const key of ['OG Futuristic Arena','rxSimpleQuick','rxSimpleBotLevel',
     "searchdestroy:'Search & Destroy'","extraction:'PvP Extraction 2.0'",'/z5-matchhub.js','/z5-economy-panel.js']){
     assert.ok(html.includes(key),key+' not present on live-served HTML');
   }
   const matchHub=await fetch(base+'/z5-matchhub.js');
   assert.equal(matchHub.status,200);
   assert.match(await matchHub.text(),/RECOIL X · MATCH HUB/);
   const page=await fetch(base+'/rx-api/health');
   assert.equal(page.status,200);
   const result=await page.json();
   assert.equal(result.missionLevels,500);
   const unauth=await fetch(base+'/rx-api/z5/matches');
   assert.ok([400,401,403].includes(unauth.status),'match history must not be public');
 }finally{await new Promise(resolve=>server.close(resolve));}
});
