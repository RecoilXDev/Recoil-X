import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const city=readFileSync(new URL('../server/recoil-city.js',import.meta.url),'utf8');
const between=(a,b)=>src.slice(src.indexOf(a),src.indexOf(b,src.indexOf(a)));
test('A.2 held inputs clear on pause, blur, page hide and visibility loss',()=>{
 const keys={KeyW:true,Space:true},moveJoy={x:1,y:-1},style={},events=[];let jump=0,score=0;
 const state=new Function('keys','moveJoy','$','document','Event','resetTouchJump',`let mouseDown=true,mobileFire=true,mobileSprint=true,mobileCrouch=true,isScope=true,joyTouchId=4,rx31StickTouchIdentifier=2;${between('function a2ClearHeldInputs(){',"window.addEventListener('blur',a2ClearHeldInputs)")};a2ClearHeldInputs();return [mouseDown,mobileFire,mobileSprint,mobileCrouch,isScope,joyTouchId,rx31StickTouchIdentifier];`)(keys,moveJoy,id=>id==='joystick'?{style}:{classList:{remove(){score++;}}},{dispatchEvent:e=>events.push(e.type)},class{constructor(type){this.type=type;}},()=>jump++);
 assert.deepEqual(state,[false,false,false,false,false,null,null]);assert.deepEqual(keys,{KeyW:false,Space:false});assert.deepEqual(moveJoy,{x:0,y:0});assert.equal(style.transform,'translate(0,0)');assert.deepEqual(events,['rx-input-reset']);assert.equal(jump,1);assert.equal(score,1);
});
test('A.2 pending weapon switches are cancelled before a player resets',()=>{
 const cleared=[],classes=[];const fn=new Function('clearTimeout','$',`let switchTimeout1=12,switchTimeout2=14;${between('function a2CancelWeaponSwitch(){','function switchGunWithAnimation(')};a2CancelWeaponSwitch();return [switchTimeout1,switchTimeout2];`);
 assert.deepEqual(fn(t=>cleared.push(t),()=>({classList:{remove:(...c)=>classes.push(...c)}})),[0,0]);assert.deepEqual(cleared,[12,14]);assert.ok(classes.includes('holstering'));assert.ok(src.includes('function resetPlayer(){a2CancelWeaponSwitch();'));
});
test('A.2 failed PeerJS loads can retry and concurrent requests share the load',async()=>{
 const win={},scripts=[],timers=new Map();let id=0;const doc={createElement(){return {remove(){this.removed=true;}}},head:{append(sc){scripts.push(sc);}}};
 const ensure=new Function('window','document','setTimeout','clearTimeout',`let peerLoad=null;${between('function ensurePeer(){','function setStatus(')};return ensurePeer;`)(win,doc,fn=>{timers.set(++id,fn);return id;},n=>timers.delete(n));
 const p=ensure();assert.equal(ensure(),p);scripts[0].onerror();await assert.rejects(p,/Could not load/);assert.equal(scripts[0].removed,true);
 const p2=ensure();assert.equal(scripts.length,2);win.Peer=function(){};scripts[1].onload();await p2;assert.equal(timers.size,0);
});
test('city visibility resets timing samples without resetting the world',()=>{assert.match(city,/function visibility\(\)\{clearHeld\(\);previousTime=0;nextDraw=0;perfSamples=perfTotal=perfSlow=perfFast=0;/);});
