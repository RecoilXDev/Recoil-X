// Server-authoritative admin operations. Existing browser-only shop coins remain separate.
const canonical = v => typeof v==='string'?v.trim().normalize('NFKC').toLowerCase():'';
const clean = (v,n=240) => typeof v==='string'?v.replace(/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g,' ').trim().slice(0,n):'';
export function createAdminPatch(db,fail,online=()=>0){
  db.exec(
    'CREATE TABLE IF NOT EXISTS rx_admin_wallet(account INTEGER PRIMARY KEY REFERENCES users(id), coins INTEGER NOT NULL DEFAULT 0 CHECK(coins BETWEEN 0 AND 2000000000), updated INTEGER NOT NULL);'+
    'CREATE TABLE IF NOT EXISTS rx_admin_grants(id INTEGER PRIMARY KEY, actor INTEGER NOT NULL REFERENCES users(id),target INTEGER NOT NULL REFERENCES users(id),amount INTEGER NOT NULL,reason TEXT NOT NULL,created INTEGER NOT NULL);'+
    'CREATE INDEX IF NOT EXISTS rx_admin_grants_recent ON rx_admin_grants(created DESC);'
  );
  const st=s=>db.prepare(s);
  const check=u=>{if(!u.admin)throw fail(403,'Administrator access required.');};
  const lookup=st('SELECT id,name,handle,admin,banned FROM users WHERE handle=?');
  const wallet=st('SELECT coins FROM rx_admin_wallet WHERE account=?');
  const restrictions=st('SELECT kind,reason,until FROM rx2_restrictions WHERE account=? AND (until IS NULL OR until>?)');
  const getTarget=name=>{const key=canonical(name);if(!key||key.length>64)throw fail(400,'Invalid player name.');const r=lookup.get(key);if(!r)throw fail(404,'Player not found.');return r;};
  function player(u,name,now=Date.now()){
    check(u);const p=getTarget(name),rules=restrictions.all(p.id,now);
    const ban=rules.find(x=>x.kind==='ban'),mute=rules.find(x=>x.kind==='mute');
    return {player:{id:p.id,name:p.name,admin:!!p.admin,banned:!!p.banned||!!ban,banReason:ban?.reason||'',banUntil:ban?.until||null,muted:!!mute,muteReason:mute?.reason||'',muteUntil:mute?.until||null,coins:wallet.get(p.id)?.coins||0}};
  }
  function overview(u,now=Date.now()){
    check(u);
    return {total:st('SELECT COUNT(*) n FROM users').get().n,
      online:online(),
      banned:st("SELECT COUNT(*) n FROM users u WHERE u.banned=1 OR EXISTS(SELECT 1 FROM rx2_restrictions r WHERE r.account=u.id AND r.kind='ban' AND (r.until IS NULL OR r.until>?))").get(now).n,
      coinsGranted:st('SELECT COALESCE(SUM(amount),0) n FROM rx_admin_grants').get().n};
  }
  function ledger(u){
    check(u);
    return {grants:st('SELECT g.id,a.name actor,t.name target,g.amount,g.reason,g.created FROM rx_admin_grants g JOIN users a ON a.id=g.actor JOIN users t ON t.id=g.target ORDER BY g.id DESC LIMIT 40').all()};
  }
  function grantCoins(u,b,now=Date.now()){
    check(u);
    const target=getTarget(b.name),amount=b.amount,reason=clean(b.reason);
    if(!Number.isSafeInteger(amount)||amount<1||amount>1000000)throw fail(400,'Enter 1–1,000,000 coins.');
    if(reason.length<3)throw fail(400,'Enter a reason of at least 3 characters.');
    db.exec('BEGIN IMMEDIATE');
    try{
      const next=(wallet.get(target.id)?.coins||0)+amount;
      if(next>2000000000)throw fail(409,'Coin wallet limit reached.');
      st('INSERT INTO rx_admin_wallet(account,coins,updated) VALUES(?,?,?) ON CONFLICT(account) DO UPDATE SET coins=excluded.coins,updated=excluded.updated').run(target.id,next,now);
      st('INSERT INTO rx_admin_grants(actor,target,amount,reason,created) VALUES(?,?,?,?,?)').run(u.id,target.id,amount,reason,now);
      st('INSERT INTO rx2_audit(actor,target,action,reason,until,created) VALUES(?,?,?,?,?,?)').run(u.id,target.id,'coins-grant',reason+' (+'+amount+')',null,now);
      db.exec('COMMIT');return {ok:true,id:target.id,name:target.name,amount,coins:next};
    }catch(e){db.exec('ROLLBACK');throw e;}
  }
  return {player,overview,ledger,grantCoins};
}