import { chmodSync, mkdirSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { randomInt } from 'node:crypto';

const MAP_TYPES=new Set(['wall','cover','tower','spawn','objective','checkpoint','botspawn','doortrigger','wavetrigger','routetrigger']);
const TRIGGER_TYPES=new Set(['doortrigger','wavetrigger','routetrigger']);
const MAP_KEYS='23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export function backupBeforeMigration(db, filename, label) {
  const absolute = resolve(filename);
  const directory = resolve(dirname(absolute), '.recoil-backups');
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  chmodSync(directory, 0o700);
  const snapshot = resolve(directory, `${basename(absolute)}-before-${label}-${Date.now()}-${process.pid}.sqlite`);
  db.prepare('VACUUM main INTO ?').run(snapshot);
  chmodSync(snapshot, 0o600);
}

export function migrateOverdrive(db, filename, existing) {
  const tables=db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?");
  if(tables.get('rx3_maps'))return false;
  const label=tables.get('rx2_schema')?'z3':'z2';
  if(existing&&filename!==':memory:')backupBeforeMigration(db,filename,label);
  db.exec('BEGIN IMMEDIATE');
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS rx2_restrictions (
        account INTEGER NOT NULL REFERENCES users(id), kind TEXT NOT NULL CHECK(kind IN ('ban','mute')),
        reason TEXT NOT NULL, until INTEGER, PRIMARY KEY(account,kind)
      );
      CREATE TABLE IF NOT EXISTS rx2_audit (
        id INTEGER PRIMARY KEY, actor INTEGER NOT NULL REFERENCES users(id),
        target INTEGER NOT NULL REFERENCES users(id), action TEXT NOT NULL,
        reason TEXT NOT NULL, until INTEGER, created INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS rx2_reports (
        id INTEGER PRIMARY KEY, reporter INTEGER NOT NULL REFERENCES users(id),
        target INTEGER NOT NULL REFERENCES users(id), reason TEXT NOT NULL, created INTEGER NOT NULL,
        resolved_by INTEGER REFERENCES users(id), resolved_at INTEGER
      );
      CREATE TABLE IF NOT EXISTS rx2_rank (
        season TEXT NOT NULL, account INTEGER NOT NULL REFERENCES users(id),
        points INTEGER NOT NULL, wins INTEGER NOT NULL DEFAULT 0, losses INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY(season,account)
      );
      CREATE INDEX IF NOT EXISTS rx2_rank_order ON rx2_rank(season, points DESC);
      CREATE TABLE IF NOT EXISTS rx2_results (
        id TEXT PRIMARY KEY, season TEXT, mode TEXT NOT NULL, result TEXT NOT NULL, finished INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS rx2_awards (
        account INTEGER NOT NULL REFERENCES users(id), award TEXT NOT NULL, earned INTEGER NOT NULL,
        PRIMARY KEY(account,award)
      );
      CREATE TABLE IF NOT EXISTS rx2_schema (version INTEGER PRIMARY KEY);
      INSERT OR IGNORE INTO rx2_schema(version) VALUES (1);
      CREATE TABLE IF NOT EXISTS rx3_maps (
        code TEXT PRIMARY KEY, owner INTEGER NOT NULL REFERENCES users(id),
        title TEXT NOT NULL, blocks TEXT NOT NULL, created INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS rx3_maps_owner ON rx3_maps(owner);
      CREATE TABLE IF NOT EXISTS rx3_report_context (
        report INTEGER PRIMARY KEY REFERENCES rx2_reports(id),
        match TEXT NOT NULL REFERENCES rx2_results(id), at INTEGER NOT NULL
      );
    `);
    db.exec('COMMIT');
    return true;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export function seasonAt(ms) {
  const date = new Date(ms);
  return `${date.getUTCFullYear()}-Q${Math.floor(date.getUTCMonth() / 3) + 1}`;
}

export function division(points) {
  if (points >= 1650) return 'RECOIL LEGEND';
  if (points >= 1300) return 'Mythic';
  if (points >= 1030) return 'Diamond';
  if (points >= 780) return 'Gold';
  if (points >= 600) return 'Silver';
  return 'Bronze';
}

function previousSeason(season) {
  const [year,quarter] = season.split('-Q').map(Number);
  return quarter === 1 ? `${year-1}-Q4` : `${year}-Q${quarter-1}`;
}

export function overdriveStore(db, fail) {
  const prepare = sql => db.prepare(sql);
  const restriction = prepare('SELECT reason,until FROM rx2_restrictions WHERE account=? AND kind=? AND (until IS NULL OR until>?)');
  const rank = prepare('SELECT points,wins,losses FROM rx2_rank WHERE season=? AND account=?');
  const award = prepare('INSERT OR IGNORE INTO rx2_awards VALUES (?,?,?)');
  const byHandle = prepare('SELECT id,name,admin,banned FROM users WHERE handle=?');
  const audit = prepare('INSERT INTO rx2_audit(actor,target,action,reason,until,created) VALUES (?,?,?,?,?,?)');
  const board = prepare(`SELECT u.name,r.account,r.points,r.wins,r.losses
    FROM rx2_rank r JOIN users u ON u.id=r.account
    WHERE season=? AND wins+losses>=3 AND u.banned=0
      AND NOT EXISTS (SELECT 1 FROM rx2_restrictions b WHERE b.account=u.id AND b.kind='ban'
        AND (b.until IS NULL OR b.until>?))
    ORDER BY points DESC,wins DESC,account ASC LIMIT 25`);
  const resultInsert = prepare('INSERT OR IGNORE INTO rx2_results VALUES (?,?,?,?,?)');
  const rankSave = prepare(`INSERT INTO rx2_rank VALUES (?,?,?,?,?) ON CONFLICT(season,account)
    DO UPDATE SET points=excluded.points,wins=excluded.wins,losses=excluded.losses`);
  const winCount = prepare(`SELECT COUNT(*) AS wins FROM rx2_awards WHERE account=? AND award LIKE 'win:%'`);
  const hasBan = prepare('SELECT banned FROM users WHERE id=?');
  const text = (value,max) => typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g,' ').trim().slice(0,max) : '';
  const targetOf = name => byHandle.get(text(name,64).normalize('NFKC').toLowerCase());
  const requireAdmin = user => {if (!user.admin) throw fail(403,'Administrator access is required.');};

  function transaction(fn) {
    db.exec('BEGIN IMMEDIATE');
    try {const result=fn();db.exec('COMMIT');return result;}
    catch (error) {db.exec('ROLLBACK');throw error;}
  }

  function rating(id,season) {
    return rank.get(season,id) || {points:500,wins:0,losses:0};
  }

  function profile(account,now) {
    const season=seasonAt(now), previous=previousSeason(season);
    const previousBoard=board.all(previous,now).slice(0,10);
    if (previousBoard.some(p=>p.account===account)) award.run(account,`Top Ten · ${previous}`,now);
    const current=rating(account,season);
    return {season,...current,division:division(current.points),winsTotal:winCount.get(account).wins,
      awards:prepare("SELECT award FROM rx2_awards WHERE account=? AND award NOT LIKE 'win:%' ORDER BY earned DESC LIMIT 30")
        .all(account).map(row=>row.award),
      leaderboard:board.all(season,now).map(({name,points,wins,losses})=>({name,points,wins,losses,division:division(points)}))};
  }

  // Called only by the simulation when it settles a match. There is no result-submission API.
  function settle(result,now) {
    const {highlight,...persisted}=result;
    const {id,mode,season,winner,reason,players}=persisted;
    return transaction(()=>{
      const insert=resultInsert.run(id,season,mode,JSON.stringify(persisted),now);
      if (!insert.changes||winner==null) return {};
      const deltas={};
      const real=players.filter(p=>p.id>0);
      const before=new Map(real.map(p=>[p.id,rating(p.id,season)]));
      const avgs=[0,1].map(team=>{
        const teamPlayers=real.filter(p=>p.team===team);
        return teamPlayers.reduce((sum,p)=>sum+before.get(p.id).points,0)/Math.max(1,teamPlayers.length);
      });
      for (const player of real) {
        const won=player.team===winner&&!player.forfeited;
        if(won) award.run(player.id,`win:${id}`,now);
        if (!season || (reason==='forfeit' && player.inputs===0 && !player.forfeited)) continue;
        const cur=before.get(player.id);
        const expected=1/(1+10**((avgs[1-player.team]-avgs[player.team])/400));
        const next=Math.max(0,cur.points+Math.round(44*((won?1:0)-expected)));
        rankSave.run(season,player.id,next,cur.wins+Number(won),cur.losses+Number(!won));
        deltas[player.id]=next-cur.points;
      }
      return deltas;
    });
  }

  function report(user,body,now) {
    const target=targetOf(body.name), reason=text(body.reason,240);
    if (!target||target.id===user.id) throw fail(400,'Choose another player.');
    if (reason.length<5) throw fail(400,'Add a reason of at least five characters.');
    const prior=prepare('SELECT COUNT(*) AS count FROM rx2_reports WHERE reporter=? AND created>?').get(user.id,now-86400000);
    if (prior.count>=5) throw fail(429,'Try another report tomorrow.');
    let context=null;
    if(body.matchId!=null||body.at!=null){
      const key=typeof body.matchId==='string'&&/^[0-9a-f-]{36}$/.test(body.matchId)?body.matchId:null;
      if(!key||!Number.isSafeInteger(body.at)||body.at<0)throw fail(400,'Choose a completed match and a valid timestamp.');
      const match=matchResult(key);
      if(!match||!match.players.some(p=>p.id===user.id)||!match.players.some(p=>p.id===target.id))
        throw fail(404,'This match is unavailable for this report.');
      if(body.at>match.duration)throw fail(400,'The report time must be within the match.');
      context={key,at:body.at};
    }
    transaction(()=>{
      const row=prepare('INSERT INTO rx2_reports(reporter,target,reason,created) VALUES (?,?,?,?)').run(user.id,target.id,reason,now);
      if(context)prepare('INSERT INTO rx3_report_context VALUES (?,?,?)').run(row.lastInsertRowid,context.key,context.at);
    });
    return {ok:true};
  }

  function matchResult(id) {
    const row=prepare('SELECT result FROM rx2_results WHERE id=?').get(id);
    return row?JSON.parse(row.result):null;
  }

  function shareMap(user,body,now) {
    const title=text(body.title,42)||'Custom arena';
    if(!Array.isArray(body.blocks)||!body.blocks.length||body.blocks.length>110)throw fail(400,'Choose a map with 1–110 cells.');
    const used=new Set(),checkpoints=body.blocks.filter(b=>b?.type==='checkpoint').length;
    const blocks=body.blocks.map(b=>{
      if(!b||!Number.isInteger(b.gx)||!Number.isInteger(b.gz)||b.gx<0||b.gx>13||b.gz<0||b.gz>13||
        !MAP_TYPES.has(b.type))throw fail(400,'A map cell is invalid.');
      const pos=b.gx*14+b.gz;
      if(used.has(pos))throw fail(400,'A map cell is used twice.');
      used.add(pos);
      const clean={gx:b.gx,gz:b.gz,type:b.type};
      if(TRIGGER_TYPES.has(b.type)){
        if(!Number.isInteger(b.step)||b.step<1||b.step>checkpoints)throw fail(400,'Link each trigger to an existing checkpoint.');
        clean.step=b.step;
      }
      return clean;
    });
    const json=JSON.stringify(blocks);
    const existing=prepare('SELECT code FROM rx3_maps WHERE owner=? AND title=? AND blocks=?').get(user.id,title,json);
    if(existing)return {code:existing.code};
    const count=prepare('SELECT COUNT(*) AS total FROM rx3_maps WHERE owner=?').get(user.id);
    if(count.total>=30)throw fail(409,'This account has already shared 30 maps.');
    const lookup=prepare('SELECT code FROM rx3_maps WHERE code=?');
    let code;
    do{code=Array.from({length:7},()=>MAP_KEYS[randomInt(MAP_KEYS.length)]).join('');}while(lookup.get(code));
    prepare('INSERT INTO rx3_maps VALUES (?,?,?,?,?)').run(code,user.id,title,json,now);
    return {code};
  }

  function loadMap(code) {
    const key=typeof code==='string'?code.trim().toUpperCase():'';
    const row=/^[A-Z2-9]{7}$/.test(key)&&prepare('SELECT title,blocks FROM rx3_maps WHERE code=?').get(key);
    if(!row)throw fail(404,'That map code is unavailable.');
    return {title:row.title,blocks:JSON.parse(row.blocks)};
  }

  function moderation(user,body,now) {
    requireAdmin(user);
    const action=body.action, reason=text(body.reason,240);
    if (action==='resolve') {
      const report=prepare('SELECT target FROM rx2_reports WHERE id=? AND resolved_at IS NULL')
        .get(Number.isSafeInteger(body.reportId)?body.reportId:0);
      if(!report)throw fail(404,'Open report not found.');
      return transaction(()=>{
        prepare('UPDATE rx2_reports SET resolved_at=?,resolved_by=? WHERE id=?').run(now,user.id,body.reportId);
        audit.run(user.id,report.target,action,reason||'Reviewed report',null,now);
        return {ok:true};
      });
    }
    const target=targetOf(body.name);
    if (!target) throw fail(404,'Player not found.');
    if (target.admin) throw fail(403,'Administrator accounts are protected.');
    if (!['kick','tempban','ban','unban','mute','unmute'].includes(action)) throw fail(400,'Choose a moderation action.');
    if (reason.length<3) throw fail(400,'Enter a reason for the action.');
    const minutes=body.minutes;
    if ((action==='tempban'||(action==='mute'&&minutes!=null)) &&
        (!Number.isInteger(minutes)||minutes<1||minutes>43200))
      throw fail(400,'Set a duration between 1 and 43200 minutes.');
    if(action==='tempban'&&target.banned)throw fail(409,'Unban the permanent ban first.');
    const until=(action==='tempban'||action==='mute')&&minutes!=null ? now+minutes*60000 : null;
    return transaction(()=>{
      if(action==='ban'||action==='unban')
        prepare('UPDATE users SET banned=? WHERE id=?').run(Number(action==='ban'),target.id);
      if(action==='ban'||action==='tempban'||action==='mute') {
        prepare(`INSERT INTO rx2_restrictions VALUES (?,?,?,?) ON CONFLICT(account,kind)
          DO UPDATE SET reason=excluded.reason,until=excluded.until`)
          .run(target.id,action==='mute'?'mute':'ban',reason,until);
      } else if(action==='unban'||action==='unmute'){
        prepare('DELETE FROM rx2_restrictions WHERE account=? AND kind=?').run(target.id,action==='unban'?'ban':'mute');
      }
      if(['ban','tempban','kick'].includes(action)) prepare('DELETE FROM sessions WHERE account=?').run(target.id);
      audit.run(user.id,target.id,action,reason,until,now);
      return {ok:true,id:target.id,name:target.name,action,until,banned:action==='ban'||action==='tempban'};
    });
  }

  function history(user) {
    requireAdmin(user);
    return {
      actions:prepare(`SELECT a.id,actor.name AS actor,t.name AS target,a.action,a.reason,a.until,a.created
        FROM rx2_audit a JOIN users actor ON actor.id=a.actor JOIN users t ON t.id=a.target ORDER BY a.id DESC LIMIT 50`).all(),
      reports:prepare(`SELECT r.id,p.name AS reporter,t.name AS target,r.reason,r.created,r.resolved_at,
        c.match AS matchId,c.at FROM rx2_reports r JOIN users p ON p.id=r.reporter
        JOIN users t ON t.id=r.target LEFT JOIN rx3_report_context c ON c.report=r.id ORDER BY r.id DESC LIMIT 50`).all()
        .map(row=>row.matchId?{...row,timeline:(matchResult(row.matchId)?.timeline||[])
          .filter(e=>Math.abs(e.at-row.at)<=12000).slice(-12)}:row)
    };
  }

  return {rating,profile,settle,report,moderation,history,shareMap,loadMap,
    activeBan:(id,now)=>restriction.get(id,'ban',now),
    banned:(id,now)=>!!hasBan.get(id)?.banned||!!restriction.get(id,'ban',now),
    muted:(id,now)=>!!restriction.get(id,'mute',now),
    giveAward:(id,name,now)=>award.run(id,name,now)};
}
