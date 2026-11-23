import test from 'node:test';
import assert from 'node:assert/strict';
import {createFriendParties} from '../server/z5-parties.mjs';
import {createAntiCheat} from '../server/z5-anti-cheat.mjs';
import {createKillcam} from '../server/z5-killcam.mjs';
import {createBroadcastSpectating} from '../server/z5-spectating.mjs';
import {createRecoveryTokens} from '../server/z5-account-recovery.mjs';
test('parties enforce leader and membership',()=>{
 const p=createFriendParties({maxMembers:2});p.create('alice');
 assert.throws(()=>p.invite('bob','carol'),/Leader/);
 p.invite('alice','bob');assert.deepEqual(p.accept('bob').members,['alice','bob']);
 assert.equal(p.leave('alice').leader,'bob');
});
test('anti cheat records anomalies without banning',()=>{
 const a=createAntiCheat({maxSpeed:5});a.inspect('a',{kind:'move',position:[0,0,0],time:1000});
 const result=a.inspect('a',{kind:'move',position:[100,0,0],time:1100});
 assert.equal(result.reviewRequired,true);assert.equal(result.autoBan,false);
});
test('killcam includes only two involved players',()=>{
 const k=createKillcam();k.record('m',{at:100,players:[{id:'a',position:[0,0,0]},{id:'b',position:[1,0,0]},{id:'c',position:[2,0,0]}]});
 assert.equal(k.replay('m',{attackerId:'a',victimId:'b',at:100}).frames[0].players.length,2);
});
test('spectators see only delayed snapshots',()=>{
 let time=0;const s=createBroadcastSpectating({now:()=>time,delayMs:1000});s.enable('m');s.join('m','v');
 s.publish('m',{score:1});assert.equal(s.view('m','v'),null);time=1001;assert.deepEqual(s.view('m','v'),{score:1});
});
test('recovery tokens expire and cannot be reused',()=>{
 let time=0;const r=createRecoveryTokens({now:()=>time,ttlMs:100});const token=r.issue('a');
 assert.equal(r.consume('a',token),true);assert.equal(r.consume('a',token),false);
 const second=r.issue('a');time=101;assert.equal(r.consume('a',second),false);
});
