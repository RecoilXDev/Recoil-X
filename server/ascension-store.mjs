import {randomBytes,createHash} from 'node:crypto';
import {worldWeekend} from './ascension-world.mjs';
const hash=v=>createHash('sha256').update(v).digest('hex');
const day=t=>new Date(t+14400000).toISOString().slice(0,10);
const weekendDay=t=>day(t-(new Date(t+14400000).getUTCDay()===6?86400000:0));
const goals=[[2,3],[3,2],[2,5]];
const emblems=['sun','falcon','crown','wave'];
const moment=Date.now;
export function migrateAscension(db){
  if(db.prepare("SELECT 1 FROM sqlite_master WHERE name='asc_version'").get())return;
  db.exec('BEGIN IMMEDIATE');
  try{
    db.exec(`CREATE TABLE asc_clan(id INTEGER PRIMARY KEY,name TEXT NOT NULL COLLATE NOCASE UNIQUE, emblem TEXT NOT NULL, created INTEGER NOT NULL);
      CREATE TABLE asc_member(account INTEGER PRIMARY KEY REFERENCES users(id),clan INTEGER NOT NULL REFERENCES asc_clan(id),role TEXT NOT NULL);
      CREATE INDEX asc_members ON asc_member(clan);
      CREATE TABLE asc_invite(account INTEGER REFERENCES users(id),clan INTEGER REFERENCES asc_clan(id),until INTEGER NOT NULL,PRIMARY KEY(account,clan));
      CREATE TABLE asc_war(id INTEGER PRIMARY KEY,home INTEGER NOT NULL REFERENCES asc_clan(id),away INTEGER NOT NULL REFERENCES asc_clan(id),starts INTEGER NOT NULL,
        state TEXT NOT NULL,match TEXT UNIQUE,winner INTEGER);
      CREATE TABLE asc_reward(account INTEGER REFERENCES users(id),source TEXT NOT NULL,amount INTEGER NOT NULL,PRIMARY KEY(account,source));
      CREATE TABLE asc_mastery(account INTEGER REFERENCES users(id),weapon INTEGER,kills INTEGER NOT NULL,PRIMARY KEY(account,weapon));
      CREATE TABLE asc_day(account INTEGER REFERENCES users(id),day TEXT,completed INTEGER NOT NULL DEFAULT 0,kills INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(account,day));
      CREATE TABLE asc_pair(account INTEGER REFERENCES users(id),opponent INTEGER REFERENCES users(id),wins INTEGER DEFAULT 0,kills INTEGER DEFAULT 0,
        last INTEGER DEFAULT 0,PRIMARY KEY(account,opponent));
      CREATE TABLE asc_challenge(account INTEGER REFERENCES users(id),opponent INTEGER REFERENCES users(id),code TEXT,until INTEGER,PRIMARY KEY(account,opponent));
      CREATE TABLE asc_recovery(account INTEGER PRIMARY KEY REFERENCES users(id),digest TEXT NOT NULL UNIQUE);
      CREATE TABLE asc_world(period TEXT,account INTEGER REFERENCES users(id),damage INTEGER NOT NULL,PRIMARY KEY(period,account));
      CREATE TABLE asc_race(account INTEGER REFERENCES users(id),course TEXT,time INTEGER NOT NULL,PRIMARY KEY(account,course));
      CREATE TABLE asc_alert(id INTEGER PRIMARY KEY,account INTEGER REFERENCES users(id),kind TEXT,created INTEGER);
      CREATE TABLE asc_version(version INTEGER PRIMARY KEY); INSERT INTO asc_version VALUES(1);`);
    db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e;}
}
export function ascensionStore(db,fail){
  const stmt=new Map(),q=sql=>{if(!stmt.has(sql))stmt.set(sql,db.prepare(sql));return stmt.get(sql);};
  const check=(ok,code,msg)=>{if(!ok)throw fail(code,msg);};
  const member=id=>q('SELECT m.*,c.name,c.emblem FROM asc_member m JOIN asc_clan c ON c.id=m.clan WHERE m.account=?').get(id);
  const target=name=>typeof name==='string'&&q('SELECT id,name FROM users WHERE handle=? AND banned=0').get(name.normalize('NFKC').toLowerCase().trim());
  function transaction(fn){db.exec('BEGIN IMMEDIATE');try{const r=fn();db.exec('COMMIT');return r;}catch(e){db.exec('ROLLBACK');throw e;}}
  const award=(id,source,amount)=>q('INSERT OR IGNORE INTO asc_reward VALUES(?,?,?)').run(id,source,amount);
  const leadership=(id,owner=false)=>{const m=member(id);check(m&& (m.role==='leader'||!owner&&m.role==='officer'),403,'A clan leader or officer is required.');return m;};
  function board(id,now){
    const d=day(now),stat=q('SELECT completed,kills FROM asc_day WHERE account=? AND day=?').get(id,d)||{completed:0,kills:0};
    const raid=q('SELECT COALESCE(SUM(damage),0) n FROM asc_world WHERE period=?').get(weekendDay(now)).n;
    const [matchesGoal,killsGoal]=goals[Math.floor((now+14400000)/86400000)%goals.length];
    return {day:d,...stat,matchesGoal,killsGoal,weekend:worldWeekend(now),raid,goal:6000,claimed:!!q('SELECT 1 FROM asc_reward WHERE account=? AND source=?').get(id,'daily:'+d),
      clanLeaders:q("SELECT c.name,COUNT(w.id) wins FROM asc_clan c LEFT JOIN asc_war w ON c.id=w.winner GROUP BY c.id ORDER BY wins DESC,c.id LIMIT 20").all(),
      races:q('SELECT u.name,r.course,r.time FROM asc_race r JOIN users u ON u.id=r.account ORDER BY r.time LIMIT 20').all()};
  }
  function profile(id,now=moment()){
    const m=member(id),clan=m?{...m,roster:q('SELECT u.name,m.role FROM asc_member m JOIN users u ON u.id=m.account WHERE m.clan=? ORDER BY u.name').all(m.clan),
      wins:q("SELECT COUNT(*) n FROM asc_war WHERE winner=?").get(m.clan).n,
      wars:q("SELECT w.id,c.name opponent,w.starts,w.state,w.home,w.away FROM asc_war w JOIN asc_clan c ON c.id=CASE WHEN w.home=? THEN w.away ELSE w.home END WHERE w.home=? OR w.away=? ORDER BY w.id DESC LIMIT 12").all(m.clan,m.clan,m.clan)}:null;
    if(clan)clan.achievements=[...(clan.roster.length>=3?['Three strong']:[]),...(clan.wins?['First war victory']:[])];
    const mastery=q('SELECT weapon,kills FROM asc_mastery WHERE account=?').all(id).map(r=>({...r,tier:[3,10,25].filter(n=>r.kills>=n).length}));
    return {clan,mastery,board:board(id,now),marks:q('SELECT COALESCE(SUM(amount),0) n FROM asc_reward WHERE account=?').get(id).n,
      relics:q("SELECT DISTINCT source FROM asc_reward WHERE account=? AND source LIKE 'vault:%'").all(id).map(x=>x.source.slice(6)),
      invites:q('SELECT c.id,c.name FROM asc_invite i JOIN asc_clan c ON c.id=i.clan WHERE i.account=? AND i.until>?').all(id,now),
      rivals:q('SELECT u.name,p.wins,p.kills FROM asc_pair p JOIN users u ON u.id=p.opponent WHERE p.account=? ORDER BY p.kills DESC LIMIT 15').all(id),
      duels:q('SELECT u.name,c.code FROM asc_challenge c JOIN users u ON u.id=c.account WHERE opponent=? AND until>?').all(id,now),
      hasRecovery:!!q('SELECT 1 FROM asc_recovery WHERE account=?').get(id)};
  }
  function social(user,b,now){
    const id=user.id,kind=b.action;
    return transaction(()=>{
      if(kind==='found'){
        const name=typeof b.name==='string'?b.name.trim().normalize('NFKC'):'';
        check(!member(id)&&/^[\p{L}\p{N} _-]{3,22}$/u.test(name)&&emblems.includes(b.emblem),400,'Choose a unique clan name and emblem.');
        check(!q('SELECT 1 FROM asc_clan WHERE name=?').get(name),409,'Clan name is in use.');
        const clan=Number(q('INSERT INTO asc_clan(name,emblem,created) VALUES(?,?,?)').run(name,b.emblem,now).lastInsertRowid);
        q('INSERT INTO asc_member VALUES(?,?,?)').run(id,clan,'leader');
      }else if(kind==='invite'){
        const m=leadership(id),t=target(b.name);check(t&&!member(t.id),404,'Player unavailable.');
        q('INSERT INTO asc_invite VALUES(?,?,?) ON CONFLICT(account,clan) DO UPDATE SET until=excluded.until').run(t.id,m.clan,now+86400000);
      }else if(kind==='accept'){
        check(Number.isInteger(b.clan)&&!member(id)&&q('SELECT 1 FROM asc_invite WHERE account=? AND clan=? AND until>?').get(id,b.clan,now),409,'Invitation unavailable.');
        check(q('SELECT COUNT(*) n FROM asc_member WHERE clan=?').get(b.clan).n<40,409,'Clan is full.');
        q('INSERT INTO asc_member VALUES(?,?,?)').run(id,b.clan,'member');q('DELETE FROM asc_invite WHERE account=?').run(id);
      }else if(['promote','transfer','remove','leave'].includes(kind)){
        const m=kind==='leave'?member(id):leadership(id,kind!=='remove'),t=kind==='leave'?{id}:target(b.name),other=t&&member(t.id);
        check(m&&other&&m.clan===other.clan,404,'Clan member unavailable.');
        if(kind==='leave'||kind==='remove'){
          check(other.role!=='leader'&&(kind==='leave'||m.role==='leader'||other.role==='member'),403,'Transfer leadership before leaving or removing this role.');
          q('DELETE FROM asc_member WHERE account=?').run(t.id);
        }else{
          check(t.id!==id,400,'Choose another member.');
          if(kind==='transfer')q("UPDATE asc_member SET role='officer' WHERE account=?").run(id);
          q('UPDATE asc_member SET role=? WHERE account=?').run(kind==='transfer'?'leader':'officer',t.id);
        }
      }else if(kind==='war'){
        const m=leadership(id),opp=typeof b.name==='string'&&q('SELECT id FROM asc_clan WHERE name=?').get(b.name.trim());
        check(opp&&opp.id!==m.clan&&Number.isSafeInteger(b.starts)&&b.starts>=now&&b.starts<=now+7*86400000,400,'Choose an opposing clan and a time in the next seven days.');
        check(!q("SELECT 1 FROM asc_war WHERE state IN ('offered','accepted','playing') AND starts>? AND ((home=? AND away=?) OR (home=? AND away=?))").get(now-3600000,m.clan,opp.id,opp.id,m.clan),409,'A war is already scheduled.');
        q("INSERT INTO asc_war(home,away,starts,state) VALUES(?,?,?,'offered')").run(m.clan,opp.id,b.starts);
      }else if(kind==='accept-war'){
        const m=leadership(id);check(Number.isSafeInteger(b.war)&&q("UPDATE asc_war SET state='accepted' WHERE id=? AND away=? AND state='offered' AND starts>?").run(b.war,m.clan,now-600000).changes,409,'War offer unavailable.');
      }else if(kind==='claim'){
        const d=board(id,now);check(d.completed>=d.matchesGoal&&d.kills>=d.killsGoal&&!d.claimed,409,'Complete today’s match and elimination objectives.');
        award(id,'daily:'+d.day,20);
      }else throw fail(400,'Unknown community action.');
      return profile(id,now);
    });
  }
  function warTeam(war,id,now){
    const w=Number.isSafeInteger(war)&&q("SELECT * FROM asc_war WHERE id=? AND state='accepted'").get(war),m=member(id);
    if(!w||!m||now<w.starts-300000||now>w.starts+1800000)return -1;
    return m.clan===w.home?0:m.clan===w.away?1:-1;
  }
  function startWar(war,match,players,now){
    const w=q("SELECT * FROM asc_war WHERE id=? AND state='accepted'").get(war);
    check(w&&now>=w.starts&&players.every(p=>warTeam(war,p.id,now)===p.team),409,'War registration or scheduled start is invalid.');
    check(q("UPDATE asc_war SET state='playing',match=? WHERE id=? AND state='accepted'").run(match,war).changes,409,'War already started.');
  }
  function settle(result,now){
    if(!result.players.some(p=>p.earned))return;
    const eligibleWar=result.duration>=20000&&!['forfeit','remake'].includes(result.reason)&&result.players.every(p=>p.inputs>=5);
    if(result.war&&!eligibleWar)q("UPDATE asc_war SET state='accepted',match=NULL WHERE id=? AND match=? AND state='playing'").run(result.war,result.id);
    if(result.war&&eligibleWar)q("UPDATE asc_war SET state='finished',winner=CASE ? WHEN 0 THEN home WHEN 1 THEN away ELSE NULL END WHERE id=? AND match=? AND state='playing'").run(result.winner,result.war,result.id);
    if(result.duration<20000||['forfeit','remake'].includes(result.reason))return;
    for(const p of result.players){
      if(!p.earned||p.forfeited||p.inputs<5)continue;
      const e=p.earned;
      let eligible=0,eligibleOpponents=0;const weaponCredits=[0,0,0,0];
      const cooperative=['volcano','titan','worldboss','invasion'].includes(result.mode);
      for(const other of result.players.filter(q=>q.team!==p.team&&!q.forfeited&&q.inputs>=5)){
        const opp=other.id,n=Math.min(e.opponents[opp]||0,4);
        const last=q('SELECT last FROM asc_pair WHERE account=? AND opponent=?').get(p.id,opp)?.last;
        if(last!=null&&now-last<600000)continue;
        q('INSERT INTO asc_pair VALUES(?,?,?,?,?) ON CONFLICT(account,opponent) DO UPDATE SET wins=wins+excluded.wins,kills=kills+excluded.kills,last=excluded.last')
          .run(p.id,opp,Number(p.team===result.winner),n,now);eligible+=n;eligibleOpponents++;
        let remaining=n;for(let w=0;w<4;w++){const accepted=Math.min(remaining,e.opponentWeapons?.[opp]?.[w]||0);weaponCredits[w]+=accepted;remaining-=accepted;}
      }
      if(!cooperative&&!eligibleOpponents)continue;
      q('INSERT INTO asc_day VALUES(?,?,1,?) ON CONFLICT(account,day) DO UPDATE SET completed=completed+1,kills=kills+excluded.kills').run(p.id,day(now),eligible);
      for(let weapon=0;weapon<4;weapon++){const n=weaponCredits[weapon];if(n){
        q('INSERT INTO asc_mastery VALUES(?,?,?) ON CONFLICT(account,weapon) DO UPDATE SET kills=kills+excluded.kills').run(p.id,weapon,n);}}
      if(e.vault)award(p.id,'vault:'+result.field,6);
      const marks=Math.min(eligible*2,e.bounty)+Math.min(e.bank,5)+(p.team===result.winner?3:0);
      if(marks)award(p.id,'match:'+result.id,marks);
      if(e.race)q('INSERT INTO asc_race VALUES(?,?,?) ON CONFLICT(account,course) DO UPDATE SET time=MIN(time,excluded.time)').run(p.id,result.field,e.race);
      const began=now-result.duration;
      if(result.mode==='worldboss'&&worldWeekend(began)){
        const weekend=weekendDay(began);
        q('INSERT INTO asc_world VALUES(?,?,?) ON CONFLICT(period,account) DO UPDATE SET damage=damage+excluded.damage').run(weekend,p.id,Math.min(3000,p.damage));
        if(q('SELECT SUM(damage) n FROM asc_world WHERE period=?').get(weekend).n>=6000)for(const row of q('SELECT account FROM asc_world WHERE period=? AND damage>0').all(weekend))award(row.account,'world:'+weekend,25);
      }
    }
  }
  function codes(id){const value=randomBytes(24).toString('base64url');q('INSERT INTO asc_recovery VALUES(?,?) ON CONFLICT(account) DO UPDATE SET digest=excluded.digest').run(id,hash(value));return value;}
  function recover(id,code,salt,secret){return transaction(()=>{
    check(typeof code==='string'&&code.length===32&&q('DELETE FROM asc_recovery WHERE account=? AND digest=?').run(id,hash(code)).changes===1,400,'Recovery details are invalid.');
    q('UPDATE users SET salt=?,secret=? WHERE id=?').run(salt,secret,id);q('DELETE FROM sessions WHERE account=?').run(id);return {ok:true};
  });}
  return {profile,social,settle,warTeam,startWar,codes,recover,member,
    resumeWars:now=>q("UPDATE asc_war SET state=CASE WHEN starts>? THEN 'accepted' ELSE 'expired' END, match=NULL WHERE state='playing'").run(now-1800000),
    matchCode:(id,name,code,now)=>{const t=target(name);check(t&&t.id!==id,404,'Rival unavailable.');
      q('INSERT INTO asc_challenge VALUES(?,?,?,?) ON CONFLICT(account,opponent) DO UPDATE SET code=excluded.code,until=excluded.until').run(id,t.id,code,now+600000);},
    review:(id,kind,now)=>{const old=q('SELECT created FROM asc_alert WHERE account=? ORDER BY id DESC LIMIT 1').get(id);
      if(!old||now-old.created>=60000){q('INSERT INTO asc_alert(account,kind,created) VALUES(?,?,?)').run(id,kind,now);
        q('DELETE FROM asc_alert WHERE id<(SELECT MAX(id)-1000 FROM asc_alert)').run();}},
    alerts:()=>q('SELECT u.name,a.kind,a.created FROM asc_alert a JOIN users u ON u.id=a.account ORDER BY a.id DESC LIMIT 25').all()};
}
