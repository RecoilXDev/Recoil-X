const assert=require('node:assert/strict');
const {test}=require('node:test');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
test('full expansion integrates real selectable modes into existing game UI',()=>{
 const modes={gungame:'Z.5 Gun Game',onechamber:'Z.5 One in the Chamber',
  hardcore:'Z.5 Hardcore',bounty:'Z.5 Bounty Hunt',
  chaos:'Z.5 Procedural Hazard Arena',parkour:'Z.5 Parkour Race',
  ctf:'Z.5 Capture the Flag',roulette:'Z.5 Duel Roulette',
  searchdestroy:'Z.5 Search & Destroy',extraction:'Z.5 PvP Extraction 2.0'};
 for(const [key,label] of Object.entries(modes))assert.ok(html.includes(key+":'"+label+"'"),key+' missing');
 assert.match(html,/m\.mode==='parkour'&&s\.type==='parkour'/);
 assert.match(html,/m\.mode==='searchdestroy'&&s\.type==='searchdestroy'/);
 assert.match(html,/m\.mode==='extraction'&&s\.type==='extraction'/);
 assert.match(html,/m\.mode==='chaos'&&s\.type==='hazard'/);
 assert.match(html,/\['relic','ctf'\]\.includes\(event\.mode\)/);
 assert.match(html,/z2Send\('create',\{mode,teams,size,limit:/);
});
test('all inlined HTML JavaScript has valid syntax',()=>{
 const matches=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
 let checked=0;
 for(const match of matches){if(/\bsrc\s*=/i.test(match[1])||!match[2].trim())continue;
   assert.doesNotThrow(()=>new vm.Script(match[2],{filename:'index-inline-'+checked+'.js'}));
   checked++;
 }
 assert.ok(checked>0);
});