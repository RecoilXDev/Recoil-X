// Z.4 staff tools use the authenticated Friends account and the existing bonus-wallet ledger.
const canonical = value => typeof value === 'string' ? value.trim().normalize('NFKC').toLowerCase() : '';
const tidy = value => typeof value === 'string'
  ? value.replace(/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g,' ').trim() : '';

export function migrateAdministration(db) {
  if(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='rx4_admin_events'").get())return;
  db.exec('BEGIN IMMEDIATE');
  try {
    db.exec(
      'CREATE TABLE IF NOT EXISTS rx_admin_wallet(account INTEGER PRIMARY KEY REFERENCES users(id),coins INTEGER NOT NULL DEFAULT 0 CHECK(coins BETWEEN 0 AND 2000000000),updated INTEGER NOT NULL);'+
      'CREATE TABLE IF NOT EXISTS rx_admin_grants(id INTEGER PRIMARY KEY,actor INTEGER NOT NULL REFERENCES users(id),target INTEGER NOT NULL REFERENCES users(id),amount INTEGER NOT NULL,reason TEXT NOT NULL,created INTEGER NOT NULL);'+
      'CREATE INDEX IF NOT EXISTS rx_admin_grants_recent ON rx_admin_grants(created DESC);'+
      'CREATE TABLE rx4_admin_events(id INTEGER PRIMARY KEY,actor INTEGER NOT NULL REFERENCES users(id),target INTEGER REFERENCES users(id),report INTEGER REFERENCES rx2_reports(id),kind TEXT NOT NULL,reason TEXT NOT NULL,created INTEGER NOT NULL);'+
      'CREATE INDEX rx4_events_target ON rx4_admin_events(target,id DESC);'+
      'CREATE INDEX rx4_events_report ON rx4_admin_events(report,id DESC);'+
      'CREATE TABLE rx4_report_work(report INTEGER PRIMARY KEY REFERENCES rx2_reports(id),owner INTEGER REFERENCES users(id),priority INTEGER NOT NULL DEFAULT 0 CHECK(priority IN (0,1)));'+
      'CREATE TABLE rx4_notice_read(account INTEGER PRIMARY KEY REFERENCES users(id),through INTEGER NOT NULL);'+
      'CREATE TABLE rx4_grant_requests(actor INTEGER NOT NULL REFERENCES users(id),request TEXT NOT NULL,grant_id INTEGER NOT NULL REFERENCES rx_admin_grants(id),balance INTEGER NOT NULL,PRIMARY KEY(actor,request));'+
      'CREATE TABLE rx4_reversals(grant_id INTEGER PRIMARY KEY REFERENCES rx_admin_grants(id),actor INTEGER NOT NULL REFERENCES users(id),reason TEXT NOT NULL,created INTEGER NOT NULL);'
    );
    db.exec('COMMIT');
  } catch(error) { db.exec('ROLLBACK'); throw error; }
}

export function createAdminPatch(db,fail,onlineIds=()=>[]) {
  const q = sql => db.prepare(sql);
  const requireAdmin = user => { if(!user?.admin) throw fail(403,'Administrator access required.'); };
  const lookup=q('SELECT id,name,handle,admin,banned FROM users WHERE handle=?');
  const wallet=q('SELECT coins FROM rx_admin_wallet WHERE account=?');
  const restrictions=q('SELECT kind,reason,until FROM rx2_restrictions WHERE account=? AND (until IS NULL OR until>?)');
  const writeEvent=q('INSERT INTO rx4_admin_events(actor,target,report,kind,reason,created) VALUES(?,?,?,?,?,?)');
  const walletWrite=q('INSERT INTO rx_admin_wallet(account,coins,updated) VALUES(?,?,?) ON CONFLICT(account) DO UPDATE SET coins=excluded.coins,updated=excluded.updated');
  const walletAudit=q('INSERT INTO rx2_audit(actor,target,action,reason,until,created) VALUES(?,?,?,?,NULL,?)');
  function transaction(work) {
    db.exec('BEGIN IMMEDIATE');
    try { const result=work(); db.exec('COMMIT'); return result; }
    catch(error) { db.exec('ROLLBACK'); throw error; }
  }
  function reasonFor(value) {
    const reason=tidy(value);
    if(reason.length<3||reason.length>240)throw fail(400,'Enter a reason of 3 to 240 characters.');
    return reason;
  }
  function targetOf(name) {
    const key=canonical(name);
    if(!key||key.length>64)throw fail(400,'Enter a player name.');
    const target=lookup.get(key);
    if(!target)throw fail(404,'Player not found.');
    return target;
  }
  function positive(value) {
    if(!Number.isSafeInteger(value)||value<1)throw fail(400,'Choose a valid record.');
    return value;
  }
  function choice(value,items) {
    if(!items.includes(value))throw fail(400,'Choose a listed option.');
    return value;
  }
  function balance(id) { return wallet.get(id)?.coins||0; }
  function player(user,name,now=Date.now()) {
    requireAdmin(user);
    const p=targetOf(name),rules=restrictions.all(p.id,now);
    const ban=rules.find(r=>r.kind==='ban'),mute=rules.find(r=>r.kind==='mute');
    return {player:{id:p.id,name:p.name,admin:!!p.admin,online:onlineIds().includes(p.id),
      banned:!!p.banned||!!ban,banReason:ban?.reason||'',banUntil:ban?.until??null,
      muted:!!mute,muteReason:mute?.reason||'',muteUntil:mute?.until??null,coins:balance(p.id)}};
  }
  function players(user,params,now) {
    requireAdmin(user);
    const prefix=canonical(params.get('q')||''),group=choice(params.get('group')||'all',['all','online','restricted','admins']);
    if(prefix.length>64)throw fail(400,'Use a shorter search.');
    const after=Number(params.get('after')||0);
    if(!Number.isSafeInteger(after)||after<0)throw fail(400,'Invalid page.');
    const online=new Set(onlineIds());
    const rows=q("SELECT u.id,u.name,u.admin FROM users u WHERE u.id>? AND substr(u.handle,1,length(?))=? AND ("+
      "?='all' OR (?='admins' AND u.admin=1) OR (?='online' AND u.id IN (SELECT value FROM json_each(?))) OR "+
      "(?='restricted' AND (u.banned=1 OR EXISTS(SELECT 1 FROM rx2_restrictions r WHERE r.account=u.id AND (r.until IS NULL OR r.until>?))))) "+
      "ORDER BY u.id LIMIT 31").all(after,prefix,prefix,group,group,group,JSON.stringify([...online]),group,now);
    const shown=rows.slice(0,30).map(p=>({id:p.id,name:p.name,admin:!!p.admin,online:online.has(p.id)}));
    return {players:shown,next:rows.length>30?shown.at(-1).id:null};
  }
  function overview(user,now=Date.now()) {
    requireAdmin(user);
    return {total:q('SELECT COUNT(*) n FROM users').get().n,online:onlineIds().length,
      banned:q("SELECT COUNT(*) n FROM users u WHERE u.banned=1 OR EXISTS(SELECT 1 FROM rx2_restrictions r WHERE r.account=u.id AND r.kind='ban' AND (r.until IS NULL OR r.until>?))").get(now).n,
      openReports:q('SELECT COUNT(*) n FROM rx2_reports WHERE resolved_at IS NULL').get().n,
      urgentReports:q('SELECT COUNT(*) n FROM rx2_reports r JOIN rx4_report_work w ON w.report=r.id WHERE r.resolved_at IS NULL AND w.priority=1').get().n,
      coinsGranted:q('SELECT COALESCE(SUM(amount),0) n FROM rx_admin_grants').get().n};
  }
  function ledger(user,name='') {
    requireAdmin(user);
    const id=name?targetOf(name).id:null;
    return {grants:q('SELECT g.id,a.name actor,t.name target,g.amount,g.reason,g.created,r.created reversedAt,rev.name reversedBy,r.reason reversalReason '+
      'FROM rx_admin_grants g JOIN users a ON a.id=g.actor JOIN users t ON t.id=g.target LEFT JOIN rx4_reversals r ON r.grant_id=g.id LEFT JOIN users rev ON rev.id=r.actor '+
      'WHERE (? IS NULL OR g.target=?) ORDER BY g.id DESC LIMIT 40').all(id,id)};
  }
  function grantCoins(user,body,now=Date.now()) {
    requireAdmin(user);
    const target=targetOf(body.name),amount=body.amount,reason=reasonFor(body.reason),key=body.requestId;
    if(!Number.isSafeInteger(amount)||amount<1||amount>1000000)throw fail(400,'Enter 1 to 1,000,000 coins.');
    if(key!==undefined&&(typeof key!=='string'||!/^[\w-]{16,80}$/.test(key)))throw fail(400,'Invalid grant request.');
    return transaction(()=>{
      if(key!==undefined) {
        const previous=q('SELECT g.id,g.target,g.amount,g.reason,r.balance FROM rx4_grant_requests r JOIN rx_admin_grants g ON g.id=r.grant_id WHERE r.actor=? AND r.request=?').get(user.id,key);
        if(previous) {
          if(previous.target!==target.id||previous.amount!==amount||previous.reason!==reason)throw fail(409,'This request was used for a different grant.');
          return {ok:true,id:target.id,name:target.name,amount,coins:previous.balance,grantId:previous.id,repeated:true};
        }
      }
      const coins=balance(target.id)+amount;
      if(coins>2000000000)throw fail(409,'Coin wallet limit reached.');
      walletWrite.run(target.id,coins,now);
      const id=Number(q('INSERT INTO rx_admin_grants(actor,target,amount,reason,created) VALUES(?,?,?,?,?)').run(user.id,target.id,amount,reason,now).lastInsertRowid);
      if(key!==undefined)q('INSERT INTO rx4_grant_requests VALUES(?,?,?,?)').run(user.id,key,id,coins);
      walletAudit.run(user.id,target.id,'coins-grant',reason+' (+'+amount+')',now);
      return {ok:true,id:target.id,name:target.name,amount,coins,grantId:id};
    });
  }
  function reverseGrant(user,body,now) {
    requireAdmin(user);
    const grantId=positive(body.grantId),reason=reasonFor(body.reason);
    return transaction(()=>{
      const g=q('SELECT g.target,g.amount,u.name FROM rx_admin_grants g JOIN users u ON u.id=g.target WHERE g.id=?').get(grantId);
      if(!g)throw fail(404,'Grant not found.');
      if(q('SELECT 1 FROM rx4_reversals WHERE grant_id=?').get(grantId))throw fail(409,'This grant was already reversed.');
      const coins=balance(g.target)-g.amount;
      if(coins<0)throw fail(409,'The wallet cannot cover this reversal.');
      walletWrite.run(g.target,coins,now);
      q('INSERT INTO rx4_reversals VALUES(?,?,?,?)').run(grantId,user.id,reason,now);
      walletAudit.run(user.id,g.target,'coins-reverse',reason+' (grant #'+grantId+', -'+g.amount+')',now);
      return {ok:true,id:g.target,name:g.name,coins,amount:-g.amount,grantId};
    });
  }
  function staffNote(user,body,now) {
    requireAdmin(user);
    const target=targetOf(body.name),kind=choice(body.kind,['warn','staff-note']),reason=reasonFor(body.reason);
    if(kind==='warn'&&target.admin)throw fail(403,'Administrator accounts are protected.');
    const record=writeEvent.run(user.id,target.id,null,kind,reason,now);
    return {ok:true,id:target.id,record:Number(record.lastInsertRowid),kind};
  }
  function notices(user) {
    const rows=q("SELECT id,reason,created FROM rx4_admin_events WHERE target=? AND kind='warn' AND id>COALESCE((SELECT through FROM rx4_notice_read WHERE account=?),0) ORDER BY id LIMIT 20").all(user.id,user.id);
    return {notices:rows,coins:balance(user.id)};
  }
  function acknowledge(user,id) {
    positive(id);
    if(!q("SELECT 1 FROM rx4_admin_events WHERE id=? AND target=? AND kind='warn'").get(id,user.id))throw fail(404,'Notice unavailable.');
    q('INSERT INTO rx4_notice_read VALUES(?,?) ON CONFLICT(account) DO UPDATE SET through=MAX(through,excluded.through)').run(user.id,id);
    return notices(user);
  }
  function reportList(user,params) {
    requireAdmin(user);
    const group=choice(params.get('group')||'open',['all','open','mine','closed','urgent']);
    const before=Number(params.get('before')||Number.MAX_SAFE_INTEGER);positive(before);
    const rows=q("SELECT r.id,p.name reporter,t.name target,r.reason,r.created,r.resolved_at closedAt,w.priority,a.name owner,c.match matchId,c.at "+
      "FROM rx2_reports r JOIN users p ON p.id=r.reporter JOIN users t ON t.id=r.target LEFT JOIN rx4_report_work w ON w.report=r.id LEFT JOIN users a ON a.id=w.owner "+
      "LEFT JOIN rx3_report_context c ON c.report=r.id WHERE r.id<? AND (?='all' OR (?='closed' AND r.resolved_at IS NOT NULL) OR "+
      "(r.resolved_at IS NULL AND (?='open' OR (?='mine' AND w.owner=?) OR (?='urgent' AND w.priority=1)))) ORDER BY r.id DESC LIMIT 31").all(before,group,group,group,group,user.id,group);
    return {reports:rows.slice(0,30),next:rows.length>30?rows[29].id:null};
  }
  function caseHistory(user,id) {
    requireAdmin(user);positive(id);
    const report=q('SELECT r.id,r.reason,r.created,r.resolved_at closedAt,p.name reporter,t.name target,w.priority,o.name owner,c.match matchId,c.at '+
      'FROM rx2_reports r JOIN users p ON p.id=r.reporter JOIN users t ON t.id=r.target LEFT JOIN rx4_report_work w ON w.report=r.id LEFT JOIN users o ON o.id=w.owner LEFT JOIN rx3_report_context c ON c.report=r.id WHERE r.id=?').get(id);
    if(!report)throw fail(404,'Report not found.');
    const notes=q('SELECT e.kind,e.reason,e.created,a.name actor FROM rx4_admin_events e JOIN users a ON a.id=e.actor WHERE e.report=? ORDER BY e.id DESC LIMIT 50').all(id);
    let evidence=[];
    if(report.matchId) {
      const stored=q('SELECT result FROM rx2_results WHERE id=?').get(report.matchId);
      if(stored)evidence=(JSON.parse(stored.result).timeline||[]).filter(e=>Math.abs(e.at-report.at)<=12000).slice(-12).map(e=>({at:e.at,kind:e.kind||e.type||'event',label:e.text||e.label||e.killer||''}));
    }
    return {report,notes,evidence};
  }
  function reportAction(user,body,now) {
    requireAdmin(user);
    const id=positive(body.reportId),kind=choice(body.kind,['claim','release','priority','case-note','resolve','reopen']);
    const reason=['case-note','resolve','reopen'].includes(kind)?reasonFor(body.reason):kind==='priority'?(body.urgent?'Urgent':'Normal'):kind;
    if(kind==='priority'&&typeof body.urgent!=='boolean')throw fail(400,'Choose normal or urgent.');
    return transaction(()=>{
      const r=q('SELECT r.target,r.resolved_at closedAt,w.owner FROM rx2_reports r LEFT JOIN rx4_report_work w ON w.report=r.id WHERE r.id=?').get(id);
      if(!r)throw fail(404,'Report not found.');
      if((r.closedAt!=null)!==(kind==='reopen'))throw fail(409,kind==='reopen'?'This case is already open.':'Reopen this case first.');
      q('INSERT OR IGNORE INTO rx4_report_work(report) VALUES(?)').run(id);
      if(kind==='claim'||kind==='release') {
        if((kind==='claim'&&r.owner!=null)||(kind==='release'&&r.owner!==user.id))throw fail(409,'That assignment has changed.');
        q('UPDATE rx4_report_work SET owner=? WHERE report=?').run(kind==='claim'?user.id:null,id);
      }
      if(kind==='priority')q('UPDATE rx4_report_work SET priority=? WHERE report=?').run(Number(body.urgent),id);
      if(kind==='resolve'||kind==='reopen') {
        q('UPDATE rx2_reports SET resolved_by=?,resolved_at=? WHERE id=?').run(kind==='resolve'?user.id:null,kind==='resolve'?now:null,id);
        if(kind==='reopen')q('UPDATE rx4_report_work SET owner=NULL WHERE report=?').run(id);
      }
      writeEvent.run(user.id,r.target,id,kind,reason,now);
      return {ok:true,reportId:id,kind};
    });
  }
  function audit(user,params) {
    requireAdmin(user);
    const actor=canonical(params.get('actor')||''),target=canonical(params.get('target')||'');
    const group=choice(params.get('group')||'all',['all','moderation','wallet','cases','staff']);
    const rows=q("SELECT id,created,actor,target,kind,reason,report,category FROM (SELECT a.id,a.created,u.name actor,t.name target,u.handle actorKey,t.handle targetKey,a.action kind,a.reason,NULL report,CASE WHEN a.action LIKE 'coins-%' THEN 'wallet' ELSE 'moderation' END category "+
      "FROM rx2_audit a JOIN users u ON u.id=a.actor JOIN users t ON t.id=a.target UNION ALL SELECT e.id,e.created,u.name,t.name,u.handle,t.handle,e.kind,e.reason,e.report,CASE WHEN e.report IS NULL THEN 'staff' ELSE 'cases' END "+
      "FROM rx4_admin_events e JOIN users u ON u.id=e.actor LEFT JOIN users t ON t.id=e.target) WHERE (?='' OR actorKey=?) AND (?='' OR targetKey=?) AND (?='all' OR category=?) ORDER BY created DESC,category,id DESC LIMIT 100").all(actor,actor,target,target,group,group);
    return {actions:rows};
  }
  function backupRequested(user,reason,now) {
    requireAdmin(user);
    writeEvent.run(user.id,null,null,'backup',reasonFor(reason),now);
  }
  return {overview,players,player,ledger,grantCoins,reverseGrant,staffNote,notices,acknowledge,reportList,caseHistory,reportAction,audit,backupRequested,reasonFor};
}
