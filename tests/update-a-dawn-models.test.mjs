import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('Dawn finishes whitelist server-backed slots and preserve original meshes',()=>{
 const a=html.indexOf('function aDawnSlots('),b=html.indexOf('function aPlayerKnife(',a);
 assert(a>0&&b>a);
 const {aDawnSlots,aDawnRifleFinish,aDawnKnifeFinish}=new Function(html.slice(a,b)+'\nreturn {aDawnSlots,aDawnRifleFinish,aDawnKnifeFinish};')();
 assert.deepEqual(aDawnSlots([{slot:'weapon',item:'dawn_rifle'},{slot:'outfit',item:'dawn_helmet'},{slot:'knife',item:'fake'},{slot:'__proto__',item:'bad'}]),{weapon:'dawn_rifle',outfit:'dawn_helmet'});
 assert.deepEqual(aDawnSlots(null),{});
 const orig={id:'original',shape:2,style:'serpent'};
 assert.equal(aDawnRifleFinish(orig).style,'serpent');assert.equal(aDawnKnifeFinish(orig).shape,2);assert.equal(orig.id,'original');
 assert.match(html,/vxKnifeAtActor\(out,pl,k,now,!v8ThirdPerson\)/);
 assert.match(html,/gunFinishFor\(weapon,kind==='player',kind==='remote'/);
 assert.match(html,/crownRemoteDawnHelmet\(out,matrices,mesh,scale\)/);
 assert.match(html,/dawn=aDawnEquipped.outfit==='dawn_helmet'/);
 assert.match(html,/aDawnEquipped=\{\};aDawnRefreshVersion\+\+/);
});
