import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { createZ5Core, migrateZ5 } from '../server/z5-core.mjs';
function fixture(){
 const db=new DatabaseSync(':memory:'); db.exec('PRAGMA foreign_keys=ON;CREATE TABLE users(id INTEGER PRIMARY KEY,name TEXT NOT NULL,handle TEXT NOT NULL UNIQUE,banned INTEGER DEFAULT 0,admin INTEGER DEFAULT 0)');
 db.prepare('INSERT INTO users(id,name,handle,banned,admin) VALUES(?,?,?,?,?)').run(1,'Alpha','alpha',0,1);
 db.prepare('INSERT INTO users(id,name,handle,banned,admin) VALUES(?,?,?,?,?)').run(2,'Beta','beta',0,0);
 db.prepare('INSERT INTO users(id,name,handle,banned,admin) VALUES(?,?,?,?,?)').run(3,'Gamma','gamma',0,0);
 assert.equal(migrateZ5(db,':memory:',false),true);
 assert.equal(migrateZ5(db,':memory:',false),false);
 let now=Date.parse('2026-11-20T19:00:00+04:00');
 const service=createZ5Core(db,{clock:()=>now});
 const a={id:1,admin:1},b={id:2,admin:0},c={id:3,admin:0};
 return {db,service,a,b,c,advance:()=>now+=86400000};
}
test('leader-owned clan, protected invitations and leave',()=>{
 const {db,service:s,a,b,c}=fixture();
 assert.equal(s.createClan(a,{name:'Space Runners'}).clan.name,'Space Runners');
 assert.throws(()=>s.createClan(b,{name:'Space Runners'}),{status:409});
 assert.throws(()=>s.invite(b,{name:'Gamma'}),{status:403});
 s.invite(a,{name:'Beta'});
 assert.equal(s.clan(b).invites[0].slug,'space-runners');
 assert.throws(()=>s.accept(c,{slug:'space-runners'}),{status:404});
 assert.equal(s.accept(b,{slug:'space-runners'}).clan.members.length,2);
 assert.throws(()=>s.leave(a),{status:409});
 assert.equal(s.kick(a,{name:'Beta'}).clan.members.length,1);
 assert.equal(s.leave(a).clan,null);
 assert.equal(db.prepare('SELECT COUNT(*) n FROM rx5_clans').get().n,0);
 db.close();
});
test('daily check-in is idempotent and streak uses Oman calendar day',()=>{
 const {db,service:s,a,advance}=fixture();
 const one=s.checkin(a);assert.equal(one.earned,25);assert.equal(one.streak,1);
 const again=s.checkin(a);assert.equal(again.claimed,false);assert.equal(again.points,25);
 assert.ok(s.titles(a).available.includes('First Flight'));
 for(let i=0;i<6;i++) {advance();s.checkin(a);}
 assert.equal(s.status(a).streak,7);
 assert.equal(s.status(a).points,250);
 assert.ok(s.titles(a).available.includes('Seven Day Streak'));
 assert.deepEqual(s.equip(a,{title:'Seven Day Streak'}).equipped,'Seven Day Streak');
 db.close();
});
test('admin audit is private and records changes',()=>{
 const {db,service:s,a,b}=fixture();
 s.checkin(b);
 assert.throws(()=>s.adminAudit(b),{status:403});
 assert.equal(s.adminAudit(a).actions[0].action,'daily-checkin');
 db.close();
});
