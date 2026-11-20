// RECOIL X Z.5: server-authoritative cosmetic economy and match progression.
// Existing browser shop coins remain unchanged. This module uses separate Z.5 points.
import { backupBeforeMigration } from './overdrive-store.mjs';
const error=(status,message)=>Object.assign(new Error(message),{status});
const isQty=n=>Number.isSafeInteger(n)&&n>=1&&n<=100;
const isPrice=n=>Number.isSafeInteger(n)&&n>=1&&n<=100000;
const catalog=Object.freeze({
  scrap:{name:'Kingdom Scrap',kind:'material',tradeable:true},
  ion_skin:{name:'Ion Rifle Finish',kind:'weapon',tradeable:true},
  winter_knife:{name:'Winter Edge Knife Finish',kind:'knife',tradeable:true},
  bronze_badge:{name:'Bronze Pilot Badge',kind:'badge',tradeable:true},
  aero_helmet:{name:'Aero Helmet',kind:'outfit',tradeable:true}
});
const recipes=Object.freeze({
  ion_skin:{scrap:4,points:40},
  winter_knife:{scrap:6,points:70},
  bronze_badge:{scrap:3,points:20},
  aero_helmet:{scrap:8,points:100}
});
const safeItem=item=>typeof item==='string'&&Object.hasOwn(catalog,item)?item:null;
const username=v=>typeof v==='string'?v.trim().normalize('NFKC').toLowerCase():'';

export function migrateZ5Economy(db,filename,needsBackup=false) {
  if(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='rx5_economy_version'").get())return false;
  if(needsBackup&&filename!==':memory:')backupBeforeMigration(db,filename,'z5-economy');
  db.exec('BEGIN IMMEDIATE');
  try{
    db.exec([
      'CREATE TABLE rx5_economy_version(version INTEGER PRIMARY KEY)',
      'INSERT INTO rx5_economy_version VALUES (1)',
      'CREATE TABLE rx5_inventory(account INTEGER NOT NULL REFERENCES users(id), item TEXT NOT NULL, quantity INTEGER NOT NULL CHECK(quantity>=0 AND quantity<=100000),PRIMARY KEY(account,item))',
      'CREATE TABLE rx5_equipment(account INTEGER NOT NULL REFERENCES users(id), slot TEXT NOT NULL, item TEXT NOT NULL,PRIMARY KEY(account,slot))',
      'CREATE TABLE rx5_supply_claims(account INTEGER NOT NULL REFERENCES users(id), day TEXT NOT NULL, PRIMARY KEY(account,day))',
      "CREATE TABLE rx5_auctions(id INTEGER PRIMARY KEY,seller INTEGER NOT NULL REFERENCES users(id),buyer INTEGER REFERENCES users(id),item TEXT NOT NULL,quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 100),price INTEGER NOT NULL CHECK(price BETWEEN 1 AND 100000),status TEXT NOT NULL CHECK(status IN ('open','sold','cancelled','expired')),created INTEGER NOT NULL,expires INTEGER NOT NULL,closed INTEGER)",
      'CREATE INDEX rx5_auctions_list ON rx5_auctions(status,expires,id)',
      "CREATE TABLE rx5_trades(id INTEGER PRIMARY KEY,sender INTEGER NOT NULL REFERENCES users(id),recipient INTEGER NOT NULL REFERENCES users(id),give_item TEXT NOT NULL,give_qty INTEGER NOT NULL,want_item TEXT NOT NULL,want_qty INTEGER NOT NULL,status TEXT NOT NULL CHECK(status IN ('open','accepted','cancelled','rejected','expired')),created INTEGER NOT NULL,expires INTEGER NOT NULL,closed INTEGER)",
      'CREATE INDEX rx5_trades_inbox ON rx5_trades(recipient,status,expires)',
      'CREATE TABLE rx5_match_awards(match TEXT PRIMARY KEY, created INTEGER NOT NULL)',
      'CREATE TABLE rx5_player_stats(account INTEGER PRIMARY KEY REFERENCES users(id),matches INTEGER NOT NULL DEFAULT 0,wins INTEGER NOT NULL DEFAULT 0,kills INTEGER NOT NULL DEFAULT 0,deaths INTEGER NOT NULL DEFAULT 0)',
      'CREATE TABLE rx5_rivalries(a INTEGER NOT NULL REFERENCES users(id),b INTEGER NOT NULL REFERENCES users(id),a_wins INTEGER NOT NULL DEFAULT 0,b_wins INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(a,b))'
    ].join(';')+';');
    db.exec('COMMIT');return true;
  }catch(e){db.exec('ROLLBACK');throw e;}
}
export function createZ5Economy(db,{clock=Date.now}={}) {
  const q=sql=>db.prepare(sql);
  const inventory=q('SELECT item,quantity FROM rx5_inventory WHERE account=? AND quantity>0 ORDER BY item');
  const itemCount=q('SELECT quantity FROM rx5_inventory WHERE account=? AND item=?');
  const wallet=q('SELECT points FROM rx5_progress WHERE account=?');
  const balance=id=>wallet.get(id)?.points||0;
  const account=q('SELECT id,name,banned FROM users WHERE handle=?');
  const auction=q('SELECT * FROM rx5_auctions WHERE id=?');
  const trade=q('SELECT * FROM rx5_trades WHERE id=?');
  const journal=q('INSERT INTO rx5_actions(actor,action,details,created) VALUES(?,?,?,?)');
  function transaction(fn){db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}}
  function log(user,action,details){journal.run(user,action,details,clock());}
  function addInventory(id,item,n) {
    if(!safeItem(item)||!Number.isInteger(n)||n===0||Math.abs(n)>100000)throw error(400,'Invalid item change.');
    const previous=itemCount.get(id,item)?.quantity||0, next=previous+n;
    if(next<0)throw error(409,'Not enough items.');
    if(next>100000)throw error(409,'Inventory limit reached.');
    q('INSERT INTO rx5_inventory(account,item,quantity) VALUES(?,?,?) ON CONFLICT(account,item) DO UPDATE SET quantity=excluded.quantity').run(id,item,next);
    return next;
  }
  function addPoints(id,n) {
    if(!Number.isSafeInteger(n)||Math.abs(n)>100000||n===0)throw error(400,'Invalid point change.');
    const before=balance(id), next=before+n;
    if(next<0)throw error(409,'Not enough Z.5 points.');
    if(next>2000000000)throw error(409,'Points limit reached.');
    q('INSERT INTO rx5_progress(account,points) VALUES(?,?) ON CONFLICT(account) DO UPDATE SET points=excluded.points').run(id,next);
    return next;
  }
  function player(name){const target=account.get(username(name));if(!target||target.banned)throw error(404,'Player not available.');return target;}
  function settleExpired(now=clock()){
    const oldA=q("SELECT * FROM rx5_auctions WHERE status='open' AND expires<=?").all(now);
    const oldT=q("SELECT * FROM rx5_trades WHERE status='open' AND expires<=?").all(now);
    for(const a of oldA){addInventory(a.seller,a.item,a.quantity);q("UPDATE rx5_auctions SET status='expired',closed=? WHERE id=?").run(now,a.id);}
    for(const t of oldT){addInventory(t.sender,t.give_item,t.give_qty);q("UPDATE rx5_trades SET status='expired',closed=? WHERE id=?").run(now,t.id);}
  }
  function view(user) {
    return transaction(()=>{
      settleExpired();
      const now=clock(),id=user.id;
      return {userId:id,points:balance(id),catalog,recipes,inventory:inventory.all(id),equipment:q('SELECT slot,item FROM rx5_equipment WHERE account=?').all(id),
        listings:q("SELECT a.id,u.name seller,a.item,a.quantity,a.price,a.expires FROM rx5_auctions a JOIN users u ON u.id=a.seller WHERE a.status='open' AND a.expires>? ORDER BY a.id DESC LIMIT 50").all(now),
        myListings:q("SELECT id,item,quantity,price,status FROM rx5_auctions WHERE seller=? ORDER BY id DESC LIMIT 30").all(id),
        trades:q("SELECT t.id,us.name sender,ur.name recipient,t.give_item,t.give_qty,t.want_item,t.want_qty,t.status,t.expires,t.sender sender_id,t.recipient recipient_id FROM rx5_trades t JOIN users us ON us.id=t.sender JOIN users ur ON ur.id=t.recipient WHERE t.sender=? OR t.recipient=? ORDER BY t.id DESC LIMIT 40").all(id,id),
        stats:q('SELECT matches,wins,kills,deaths FROM rx5_player_stats WHERE account=?').get(id)||{matches:0,wins:0,kills:0,deaths:0},
        rivals:q("SELECT CASE WHEN r.a=? THEN ub.name ELSE ua.name END opponent, CASE WHEN r.a=? THEN r.a_wins ELSE r.b_wins END wins,CASE WHEN r.a=? THEN r.b_wins ELSE r.a_wins END losses FROM rx5_rivalries r JOIN users ua ON ua.id=r.a JOIN users ub ON ub.id=r.b WHERE r.a=? OR r.b=? ORDER BY wins+losses DESC LIMIT 10").all(id,id,id,id,id),
        note:'Z.5 points and cosmetics are separate from the original browser-only shop.'};
    });
  }
  function onDailyCheckin(user,claim) {
    if(!claim?.claimed)return {supplies:0};
    return transaction(()=>{
      const day=claim.last_day;
      const changed=q('INSERT OR IGNORE INTO rx5_supply_claims(account,day) VALUES(?,?)').run(user.id,day).changes;
      if(changed){addInventory(user.id,'scrap',2);log(user.id,'daily-supplies',day);}
      return {supplies:changed?2:0};
    });
  }
  function craft(user,body) {
    const item=safeItem(body?.item),recipe=recipes[item];
    if(!recipe)throw error(400,'Unknown crafting recipe.');
    return transaction(()=>{
      addInventory(user.id,'scrap',-recipe.scrap);
      addPoints(user.id,-recipe.points);
      addInventory(user.id,item,1);
      log(user.id,'craft',item);
      return {ok:true,item,points:balance(user.id),inventory:inventory.all(user.id)};
    });
  }
  function equip(user,body){
    const item=safeItem(body?.item),slot=catalog[item]?.kind;
    if(!slot||slot==='material')throw error(400,'Select an equipable cosmetic.');
    return transaction(()=>{
      if(!(itemCount.get(user.id,item)?.quantity>0))throw error(409,'Craft or acquire this cosmetic first.');
      q('INSERT INTO rx5_equipment(account,slot,item) VALUES(?,?,?) ON CONFLICT(account,slot) DO UPDATE SET item=excluded.item').run(user.id,slot,item);
      log(user.id,'equip-cosmetic',item);return {ok:true,equipment:q('SELECT slot,item FROM rx5_equipment WHERE account=?').all(user.id)};
    });
  }
  function list(user,body){
    const item=safeItem(body?.item),quantity=body?.quantity,price=body?.price;
    if(!item||!isQty(quantity)||!isPrice(price))throw error(400,'Invalid auction listing.');
    return transaction(()=>{
      settleExpired();
      if(q("SELECT COUNT(*) n FROM rx5_auctions WHERE seller=? AND status='open'").get(user.id).n>=8)throw error(409,'Maximum 8 active listings.');
      addInventory(user.id,item,-quantity);
      const now=clock();
      const result=q("INSERT INTO rx5_auctions(seller,item,quantity,price,status,created,expires) VALUES(?,?,?,?,'open',?,?)").run(user.id,item,quantity,price,now,now+86400000);
      log(user.id,'auction-list',String(result.lastInsertRowid));
      return {ok:true,id:Number(result.lastInsertRowid)};
    });
  }
  function buy(user,body){
    if(!Number.isSafeInteger(body?.id))throw error(400,'Invalid listing.');
    return transaction(()=>{
      settleExpired();const a=auction.get(body.id);
      if(!a||a.status!=='open')throw error(404,'Listing unavailable.');
      if(a.seller===user.id)throw error(409,'You cannot buy your own item.');
      addPoints(user.id,-a.price);
      addPoints(a.seller,a.price);
      addInventory(user.id,a.item,a.quantity);
      q("UPDATE rx5_auctions SET status='sold',buyer=?,closed=? WHERE id=? AND status='open'").run(user.id,clock(),a.id);
      log(user.id,'auction-buy',String(a.id));
      return {ok:true,item:a.item,quantity:a.quantity,price:a.price};
    });
  }
  function cancelListing(user,body){
    if(!Number.isSafeInteger(body?.id))throw error(400,'Invalid listing.');
    return transaction(()=>{
      settleExpired();const a=auction.get(body.id);
      if(!a||a.seller!==user.id||a.status!=='open')throw error(404,'Your open listing was not found.');
      addInventory(user.id,a.item,a.quantity);
      q("UPDATE rx5_auctions SET status='cancelled',closed=? WHERE id=?").run(clock(),a.id);
      log(user.id,'auction-cancel',String(a.id));return {ok:true};
    });
  }
  function offer(user,body){
    const recipient=player(body?.name);
    const give=safeItem(body?.give),want=safeItem(body?.want),giveQty=body?.giveQty,wantQty=body?.wantQty;
    if(recipient.id===user.id||!give||!want||!isQty(giveQty)||!isQty(wantQty))throw error(400,'Invalid trade offer.');
    return transaction(()=>{
      settleExpired();
      if(q("SELECT COUNT(*) n FROM rx5_trades WHERE sender=? AND status='open'").get(user.id).n>=8)throw error(409,'Maximum 8 active offers.');
      addInventory(user.id,give,-giveQty);
      const now=clock(),r=q("INSERT INTO rx5_trades(sender,recipient,give_item,give_qty,want_item,want_qty,status,created,expires) VALUES(?,?,?,?,?,?,'open',?,?)").run(user.id,recipient.id,give,giveQty,want,wantQty,now,now+86400000);
      log(user.id,'trade-offer',String(r.lastInsertRowid));
      return {ok:true,id:Number(r.lastInsertRowid)};
    });
  }
  function accept(user,body){
    if(!Number.isSafeInteger(body?.id))throw error(400,'Invalid offer.');
    return transaction(()=>{
      settleExpired();const t=trade.get(body.id);
      if(!t||t.recipient!==user.id||t.status!=='open')throw error(404,'Trade not available.');
      addInventory(user.id,t.want_item,-t.want_qty);
      addInventory(t.sender,t.want_item,t.want_qty);
      addInventory(user.id,t.give_item,t.give_qty);
      q("UPDATE rx5_trades SET status='accepted',closed=? WHERE id=? AND status='open'").run(clock(),t.id);
      log(user.id,'trade-accept',String(t.id));return {ok:true};
    });
  }
  function decline(user,body){
    if(!Number.isSafeInteger(body?.id))throw error(400,'Invalid offer.');
    return transaction(()=>{
      settleExpired();const t=trade.get(body.id);
      if(!t||t.status!=='open'||(t.sender!==user.id&&t.recipient!==user.id))throw error(404,'Trade not available.');
      addInventory(t.sender,t.give_item,t.give_qty);
      q("UPDATE rx5_trades SET status=?,closed=? WHERE id=?").run(t.sender===user.id?'cancelled':'rejected',clock(),t.id);
      log(user.id,'trade-close',String(t.id));return {ok:true};
    });
  }
  // Invoked ONLY from the authoritative match settlement callback, never an HTTP route.
  function onMatchSettled(result,now=clock()){
    if(!result||typeof result.id!=='string'||result.id.length>80||result.winner==null||result.reason==='remake'||!Array.isArray(result.players)||result.duration<10000)return {awarded:0};
    return transaction(()=>{
      const inserted=q('INSERT OR IGNORE INTO rx5_match_awards(match,created) VALUES(?,?)').run(result.id,now);
      if(!inserted.changes)return {awarded:0,duplicate:true};
      const active=result.players.filter(p=>Number.isSafeInteger(p.id)&&p.id>0&&!p.forfeited&&p.inputs>=5);
      let awarded=0;
      for(const p of active){
        if(!q('SELECT 1 FROM users WHERE id=?').get(p.id))continue;
        const won=p.team===result.winner;
        addPoints(p.id,10+Math.min(20,Math.max(0,p.kills)*2)+(won?25:0));
        addInventory(p.id,'scrap',1);
        q('INSERT INTO rx5_player_stats(account,matches,wins,kills,deaths) VALUES(?,?,?,?,?) ON CONFLICT(account) DO UPDATE SET matches=matches+1,wins=wins+excluded.wins,kills=kills+excluded.kills,deaths=deaths+excluded.deaths').run(p.id,1,Number(won),Math.max(0,Math.min(1000,Math.trunc(p.kills)||0)),Math.max(0,Math.min(1000,Math.trunc(p.deaths)||0)));
        log(p.id,'match-reward',result.id);awarded++;
      }
      for(let i=0;i<active.length;i++)for(let j=i+1;j<active.length;j++){
        const x=active[i],y=active[j];if(x.team===y.team||x.id===y.id)continue;
        const a=Math.min(x.id,y.id),b=Math.max(x.id,y.id);
        const side=(x.id===a?x:y).team===result.winner?'a':'b';
        q('INSERT INTO rx5_rivalries(a,b,a_wins,b_wins) VALUES(?,?,?,?) ON CONFLICT(a,b) DO UPDATE SET a_wins=a_wins+excluded.a_wins,b_wins=b_wins+excluded.b_wins').run(a,b,side==='a'?1:0,side==='b'?1:0);
      }
      return {awarded};
    });
  }
  return {view,onDailyCheckin,craft,equip,list,buy,cancelListing,offer,accept,decline,onMatchSettled};
}
