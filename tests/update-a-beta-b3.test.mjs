import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeMatch,inputMatch,updateMatch,restorePlayer} from '../server/overdrive-match.mjs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('bounded tactical route chooses a reachable detour around cover',()=>{
 const source=html.slice(html.indexOf('function aBotSegmentClear('),html.indexOf('function rx5BotTacticalStep('));
 const obstacles=[{x:0,z:0,w:3,d:8}];
 const blocked=(x,z,r)=>obstacles.some(o=>Math.abs(x-o.x)<o.w/2+r&&Math.abs(z-o.z)<o.d/2+r);
 const make=new Function('blocked','obstacles','rx2Covers','clamp','rx5TacticalLimit',source+'\nreturn {aBotSegmentClear,aBotWaypoint};');
 const nav=make(blocked,obstacles,[],(v,a,b)=>Math.max(a,Math.min(b,v)),()=>28);
 const b={x:-5,z:0},goal={x:5,z:0};
 assert(!nav.aBotSegmentClear(b.x,b.z,goal.x,goal.z));
 const p=nav.aBotWaypoint(b,goal,1);
 assert(p);assert(nav.aBotSegmentClear(b.x,b.z,p.x,p.z));
 assert.equal(nav.aBotWaypoint({x:-5,z:-8},{x:5,z:-8},1),null);
});
test('equipped season mesh and enhanced material pass are wired into the actual renderer',()=>{
 assert.match(html,/if\(finish\.seasonOnly&&index===0\)/);
 assert.match(html,/float nearDetail=1\.0-smoothstep/);
 assert.match(html,/if\(uMode>2\.5\)\{\s*\/\/ Update A material/);
});
test('switching cancels pending reload without granting ammo; reconnect resets input window',()=>{
 const m=makeMatch({id:'b3-combat',mode:'arena',now:1000,limit:50,players:[{id:1,name:'A',team:0},{id:2,name:'B',team:1}]});
 const p=m.players.get(1);
 p.ammo[0]=3;p.reloadAt=3000;p.reloadGun=0;
 assert(inputMatch(m,1,{seq:1,f:0,s:0,yaw:0,pitch:0,weapon:1},1100));
 updateMatch(m,1150);
 assert.equal(p.weapon,1);assert.equal(p.reloadAt,0);assert.equal(p.ammo[0],3);
 p.rx5InputCount=120;p.rx5InputWindow=1150;p.offlineAt=1150;
 assert(restorePlayer(m,1));assert(inputMatch(m,1,{seq:0,f:0,s:0,yaw:0,pitch:0,weapon:1},1200));
});
