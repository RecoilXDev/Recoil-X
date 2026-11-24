import assert from 'node:assert/strict';
import {test} from 'node:test';
import {DatabaseSync} from 'node:sqlite';
import {migrateZ5,createZ5Core} from '../server/z5-core.mjs';
import {migrateZ5Economy,createZ5Economy} from '../server/z5-economy.mjs';

function fixture(){
 const db=new DatabaseSync(':memory:');
 db.exec("PRAGMA foreign_keys=ON;CREATE TABLE users(id INTEGER PRIMARY KEY,name TEXT NOT NULL,handle TEXT UNIQUE NOT NULL,banned INTEGER NOT NULL DEFAULT 0,admin INTEGER NOT NULL DEFAULT 0)");
 db.exec("INSERT INTO users(id,name,handle,banned,admin) VALUES (1,'Alpha','alpha',0,1),(2,'Beta','beta',0,0),(3,'Gamma','gamma',0,0)");
 assert.equal(migrateZ5(db,':memory:',false),true);
 assert.equal(migrateZ5Economy(db,':memory:',false),true);
 assert.equal(migrateZ5Economy(db,':memory:',false),false);
 let now=Date.parse('2026-11-20T16:00:00Z');
 const clock=()=>now;
 const core=createZ5Core(db,{clock}),eco=createZ5Economy(db,{clock});
 const users=[{id:1,admin:true},{id:2,admin:false},{id:3,admin:false}];
 const next=days=>{now+=days*86400000};
 const claim=user=>eco.onDailyCheckin(user,core.checkin(user));
 return {db,core,eco,users,next,claim};
}
test('daily Z5 supplies and crafting have server-validated costs and do not double-mint',()=>{
 const f=fixture(),u=f.users[0];
 assert.deepEqual(f.claim(u),{supplies:2});
 assert.deepEqual(f.claim(u),{supplies:0});
 assert.equal(f.eco.view(u).inventory[0].quantity,2);
 assert.throws(()=>f.eco.craft(u,{item:'ion_skin'}),{status:409});
 f.next(1);f.claim(u);
 const crafted=f.eco.craft(u,{item:'ion_skin'});
 assert.equal(crafted.item,'ion_skin');
 assert.equal(crafted.points,10);
 assert.equal(f.eco.view(u).inventory.find(x=>x.item==='ion_skin').quantity,1);
 assert.equal(f.eco.equip(u,{item:'ion_skin'}).equipment[0].slot,'weapon');
 assert.throws(()=>f.eco.equip(f.users[1],{item:'ion_skin'}),{status:409});
 f.db.close();
});
test('auctions escrow items, pay seller once, and prevent self-buy or duplicate purchases',()=>{
 const f=fixture(),[a,b]=f.users;
 f.claim(a);f.claim(b);f.next(1);f.claim(a);f.claim(b);
 f.eco.craft(a,{item:'ion_skin'});
 const item=f.eco.list(a,{item:'ion_skin',quantity:1,price:30});
 assert.equal(f.eco.view(a).inventory.some(x=>x.item==='ion_skin'),false);
 assert.throws(()=>f.eco.buy(a,{id:item.id}),{status:409});
 const first=f.eco.buy(b,{id:item.id});
 assert.equal(first.item,'ion_skin');
 assert.equal(f.eco.view(b).inventory.find(x=>x.item==='ion_skin').quantity,1);
 assert.equal(f.eco.view(a).points,40);
 assert.equal(f.eco.view(b).points,20);
 assert.throws(()=>f.eco.buy(b,{id:item.id}),{status:404});
 assert.throws(()=>f.eco.list(b,{item:'ion_skin',quantity:-1,price:10}),{status:400});
 f.db.close();
});
test('atomic player trades transfer exact cosmetics and cannot be stolen',()=>{
 const f=fixture(),[a,b,c]=f.users;
 for(let day=0;day<2;day++){f.claim(a);f.claim(b);f.next(1);}
 f.claim(a);f.claim(b);
 f.eco.craft(a,{item:'winter_knife'});f.eco.craft(b,{item:'bronze_badge'});
 const trade=f.eco.offer(a,{name:'Beta',give:'winter_knife',giveQty:1,want:'bronze_badge',wantQty:1});
 assert.throws(()=>f.eco.accept(c,{id:trade.id}),{status:404});
 assert.equal(f.eco.accept(b,{id:trade.id}).ok,true);
 assert.equal(f.eco.view(a).inventory.find(x=>x.item==='bronze_badge').quantity,1);
 assert.equal(f.eco.view(b).inventory.find(x=>x.item==='winter_knife').quantity,1);
 assert.throws(()=>f.eco.accept(b,{id:trade.id}),{status:404});
 f.db.close();
});
test('expired listings and offers refund escrow, idempotently',()=>{
 const f=fixture(),[a,b]=f.users;
 f.claim(a);
 const listing=f.eco.list(a,{item:'scrap',quantity:1,price:20});
 const trade=f.eco.offer(a,{name:'Beta',give:'scrap',giveQty:1,want:'scrap',wantQty:1});
 assert.equal(f.eco.view(a).inventory.length,0);
 f.next(2);
 assert.equal(f.eco.view(a).inventory.find(x=>x.item==='scrap').quantity,2);
 assert.equal(f.eco.view(a).myListings.find(x=>x.id===listing.id).status,'expired');
 assert.equal(f.eco.view(a).trades.find(x=>x.id===trade.id).status,'expired');
 f.db.close();
});
test('trusted match settlement awards are idempotent and track rivalries',()=>{
 const f=fixture(),[a,b]=f.users;
 const result={id:'unique-match-1',winner:0,reason:'score',duration:15000,players:[
   {id:1,team:0,forfeited:false,inputs:9,kills:2,deaths:1},
   {id:2,team:1,forfeited:false,inputs:9,kills:1,deaths:2}
 ]};
 assert.equal(f.eco.onMatchSettled(result).awarded,2);
 assert.equal(f.eco.onMatchSettled(result).duplicate,true);
 assert.equal(f.eco.view(a).points,39);
 assert.equal(f.eco.view(b).points,12);
 assert.equal(f.eco.view(a).rivals[0].opponent,'Beta');
 assert.equal(f.eco.view(a).stats.matches,1);
 assert.equal(f.eco.view(a).stats.kills,2);
 f.db.close();
});
test('New Dawn crates require seasonal XP and active dates, are idempotent and account-bound',()=>{
 const f=fixture(),[a,b]=f.users;
 f.db.exec('CREATE TABLE rx_a_progress(player INTEGER PRIMARY KEY,season_xp INTEGER NOT NULL);INSERT INTO rx_a_progress VALUES(1,3000)');
 assert.throws(()=>f.eco.claimSeasonCrate(a,{item:'dawn_rifle'}),{status:403});
 f.next(5);
 assert.equal(f.eco.view(a).seasonCrates.state,'active');
 assert.throws(()=>f.eco.claimSeasonCrate(b,{item:'dawn_rifle'}),{status:403});
 assert.equal(f.eco.claimSeasonCrate(a,{item:'dawn_rifle'}).alreadyClaimed,false);
 assert.equal(f.eco.claimSeasonCrate(a,{item:'dawn_rifle'}).alreadyClaimed,true);
 assert.equal(f.eco.view(a).inventory.find(x=>x.item==='dawn_rifle').quantity,1);
 assert.equal(f.eco.equip(a,{item:'dawn_rifle'}).ok,true);
 assert.throws(()=>f.eco.list(a,{item:'dawn_rifle',quantity:1,price:1}),{status:400});
 assert.throws(()=>f.eco.offer(a,{name:'Beta',give:'dawn_rifle',giveQty:1,want:'scrap',wantQty:1}),{status:400});
 assert.throws(()=>f.eco.offer(b,{name:'Alpha',give:'scrap',giveQty:1,want:'dawn_rifle',wantQty:1}),{status:400});
 f.next(150);assert.throws(()=>f.eco.claimSeasonCrate(a,{item:'dawn_knife'}),{status:403});f.db.close();
});
