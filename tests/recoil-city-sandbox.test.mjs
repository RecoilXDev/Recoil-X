import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {once} from 'node:events';
import {runInNewContext} from 'node:vm';
import {createRecoilServer} from '../server/server.mjs';
import '../server/recoil-city-world.js';

const city=globalThis.RecoilCityWorld;
const game=readFileSync(new URL('../index.html',import.meta.url),'utf8');
// Exercise the same loadout and ray test the arena lends to each isolated city session.
const weapons=runInNewContext(game.match(/const weapons=(\[[\s\S]*?\]);/)[1]);
const rayHit=runInNewContext('('+game.match(/^function rayCircle3d\([^\n]+/m)[0]+')');
function session(options={}){return city.create({weapons,rayHit,random:()=>.5,...options});}
function run(state,input,seconds){for(let i=0;i<Math.round(seconds*60);i++)city.step(state,input,1/60);}
const idle={};
function scene(){
  const s=session(),p=s.player,t=s.pedestrians[0];
  Object.assign(p,{x:132,y:120,angle:0});
  s.vehicles.length=0;s.pedestrians=[t];s.locals=[t];s.populationAt=999;
  Object.assign(t,{x:155,y:120,angle:0,left:155,right:333,top:120,bottom:310,length:736,distance:0,speed:.001});
  return {s,t,p};
}
test('camera stays behind the avatar, clips against facades, and offers an eye-level and driver view',()=>{
  const api={RecoilCityWorld:city};
  runInNewContext(readFileSync(new URL('../server/recoil-city-view.js',import.meta.url),'utf8'),{window:api});
  const s=session(),p=s.player, cam=(mode,yaw)=>api.RecoilCityView.camera(s,{mode,yaw,tilt:0});
  const behind=cam('third',0),eye=cam('first',0);
  assert(behind.x<p.x-20 && behind.z>eye.z && Math.abs(behind.pitch)<.2);
  assert(eye.z>10 && Math.abs(eye.x-p.x)<1);
  Object.assign(p,{x:168,y:216});const nearWall=cam('third',Math.PI);
  assert(nearWall.x<173&&nearWall.x>p.x);
  Object.assign(p,{x:135,y:169});assert(city.interact(s));
  assert(cam('first',0).z<eye.z);assert(cam('third',0).x<p.x-40);
});
test('sprinting covers more ground and a jump lands once with no airborne second jump',()=>{
  const a=session(),b=session();
  run(a,{walkX:1},.2);run(b,{walkX:1,sprint:true},.2);
  assert(b.player.x>a.player.x+5);assert.equal(b.player.motion,'sprinting');
  assert(city.jump(b));run(b,{},.25);assert(b.player.z>6);assert.equal(b.player.motion,'jumping');
  assert.equal(city.jump(b),false);run(b,{},1);assert.equal(b.player.z,0);assert.equal(b.player.motion,'idle');
});
test('taking moving traffic releases an alarmed driver, the new car steers, and remains available on exit',()=>{
  const s=session(),v=s.vehicles.find(c=>c.kind==='traffic');
  Object.assign(s.player,{x:v.x,y:v.y+16});city.step(s,{},0);
  assert(city.interact(s));assert.equal(s.player.vehicleId,v.id);assert.equal(v.kind,'parked');
  assert.equal(s.heat,1);assert(s.pedestrians.some(p=>p.driver===v.id&&p.mood==='flee'));
  const x=v.x;run(s,{forward:1,turn:.2},.6);assert(v.x>x+8);
  run(s,{brake:true},1);assert(city.interact(s));assert(city.interact(s));assert.equal(s.heat,1);
});
test('arena damage, shot cadence, limited magazines, reload and walls govern city combat',()=>{
  const {s,t}=scene(),shot={fire:true,aim:{yaw:0,pitch:0}};
  city.step(s,shot,1/60);assert.equal(t.hp,70-weapons[0].damage);assert.equal(s.ammo[0].mag,29);
  assert.equal(t.mood,'flee');city.step(s,shot,1/60);assert.equal(s.ammo[0].mag,29);
  run(s,shot,.36);assert.equal(t.hp,0);assert(t.downUntil>0);assert(s.effects.length<=32);
  const missing=weapons[0].max-s.ammo[0].mag;assert(city.reload(s));run(s,shot,1);
  assert.equal(s.ammo[0].mag,weapons[0].max-missing);run(s,{},1);assert.equal(s.ammo[0].mag,weapons[0].max);
  assert.equal(s.ammo[0].stock,weapons[0].reserve-missing);
  city.selectWeapon(s,2);assert.equal(s.weapon,2);
  Object.assign(s.player,{x:160,y:200});Object.assign(t,{hp:70,x:240,y:200,distance:0,left:240,top:200});
  city.step(s,shot,1/60);assert.equal(t.hp,70);
});
test('danger can trigger a defender and repeated incidents bring five stars and three pursuing units',()=>{
  const {s,t}=scene();t.id=4;
  const shot={fire:true,aim:{yaw:Math.PI,pitch:.2}};
  run(s,shot,1.4);assert.equal(t.mood,'defend');assert(s.player.hp<100);
  const patrol=s.vehicles.find(c=>c.kind==='patrol');const start={x:patrol.x,y:patrol.y};
  // Move the target onto the sidewalk away from the first interception.
  Object.assign(s.player,{x:453,y:490});run(s,shot,5.7);
  assert.equal(s.heat,5);assert.equal(s.vehicles.filter(c=>c.kind==='patrol'&&c.hp>0).length,3);
  assert(Math.hypot(start.x-patrol.x,start.y-patrol.y)>50);
  for(const c of s.vehicles)if(c.kind==='patrol')Object.assign(c,{x:120,y:840,goal:null});
  run(s,{},70);assert.equal(s.heat,0);assert.equal(s.vehicles.filter(c=>c.kind==='patrol').length,0);
});
test('slow hardware bounds active pedestrians and streaming follows the player into new districts',()=>{
  const s=session({quality:'low'});assert(s.locals.length<=6&&s.locals.length>0);
  const first=s.locals.map(p=>p.id);
  Object.assign(s.player,{x:957,y:809});run(s,idle,.61);
  assert(s.locals.length<=6&&s.locals.length>0);assert(s.locals.every(p=>!first.includes(p.id)));
  const frozen=s.pedestrians.find(p=>!p.active),distance=frozen.distance;
  run(s,idle,.3);assert.equal(frozen.distance,distance);assert.equal(s.district,'South Docks');
});
test('vehicle impact, wreck ejection and replacement keep earned career funds intact',()=>{
  const s=session({career:{cash:82}});assert(city.interact(s));const v=s.vehicles.find(c=>c.id===s.player.vehicleId);
  Object.assign(v,{x:158,y:236,angle:0,speed:110});run(s,{},.1);assert(v.hp<85&&v.speed<0);
  Object.assign(v,{x:158,y:236,angle:0,speed:100,hp:10});run(s,{},.15);
  assert.equal(v.hp,0);assert.equal(s.player.vehicleId,null);assert.equal(s.career.cash,82);
  s.player.x=550;s.player.y=600;run(s,{},42);assert.equal(v.hp,100);assert.equal(v.x,v.home.x);
});
test('both shops enforce price and condition and hidden finds survive a career reload',()=>{
  const s=session({career:{cash:90,trips:7,paint:'Harbor Jade'}});
  const [cafe,repair]=s.map.shops;Object.assign(s.player,{x:cafe.x,y:cafe.y,hp:60});
  assert(city.shop(s));assert.equal(s.career.cash,78);assert.equal(s.player.hp,100);assert(!city.shop(s));
  const v=s.vehicles[0];Object.assign(s.player,{x:v.x,y:v.y});assert(city.interact(s));
  Object.assign(v,{x:repair.x,y:repair.y,hp:42});city.step(s,{},1/60);assert(city.shop(s));assert.equal(v.hp,100);
  assert.equal(s.career.cash,48);assert(city.interact(s));
  for(const spot of s.map.secrets){
    assert(s.map.blocks.every(b=>b.kind!=='building'||spot.x<b.x||spot.x>b.x+b.w||spot.y<b.y||spot.y>b.y+b.h));
    Object.assign(s.player,{x:spot.x,y:spot.y});city.step(s,{},0);city.step(s,{},0);
  }
  const loaded=session({career:s.career});assert.equal(loaded.career.discoveries.length,3);assert.equal(loaded.career.trips,7);
  assert.equal(loaded.career.paint,'Harbor Jade');
});
test('all 48 supplied MP3s retain original bytes, stream with byte ranges, and include the unmodified City theme',async()=>{
  const server=createRecoilServer({database:':memory:'});server.listen(0,'127.0.0.1');await once(server,'listening');
  const root='http://127.0.0.1:'+server.address().port+'/server/city-radio/';
  const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
  try{
    const catalog=await (await fetch(root+'tracks.json')).json();assert.equal(catalog.length,48);
    const verified=[];
    for(const t of catalog){
      const response=await fetch(root+t.file);assert.equal(response.headers.get('content-type'),'audio/mpeg');
      const bytes=Buffer.from(await response.arrayBuffer());assert.equal(sha(bytes),t.sha256);
      verified.push(t.file+' '+t.sha256+'\n');
    }
    assert.equal(sha(verified.join('')),'77084f387b810c391769314123d9ccc07039a21664b8b0bbae707d65f8beb5fb');
    const theme=catalog.at(-1);assert.equal(theme.title,'Welcome to Recoil City');
    assert.equal(theme.sha256,'c6cead51d65df5b9e4cb359dbb5f1ba063f1056185754f7e82d2186905438e0e');
    const r=await fetch(root+theme.file,{headers:{Range:'bytes=10-29'}});assert.equal(r.status,206);
    assert.equal(Buffer.from(await r.arrayBuffer()).length,20);assert.match(r.headers.get('content-range'),/^bytes 10-29\//);
    assert.equal((await fetch(root+theme.file,{headers:{Range:'bytes=999999999-'}})).status,416);
  }finally{await new Promise(resolve=>server.close(resolve));}
});
