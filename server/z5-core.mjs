// RECOIL X Z.5 foundation: persistent clans, daily check-ins, titles, diagnostics.
// All operations require an existing authenticated account from server.mjs.
import { backupBeforeMigration } from './overdrive-store.mjs';
const fail=(status,message)=>Object.assign(new Error(message),{status});
const goodName=v=>typeof v==='string'&&/^[\p{L}\p{N} _-]{3,24}$/u.test(v.trim())?v.trim():null;
const canonical=v=>typeof v==='string'?v.trim().normalize('NFKC').toLowerCase():'';
const omaniDay=now=>new Date(now+4*3600000).toISOString().slice(0,10);
const daysApart=(from,to)=>Math.round((Date.parse(to+'T00:00:00Z')-Date.parse(from+'T00:00:00Z'))/86400000);

export function migrateZ5(db,filename,existing=true){
  if(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='rx5_version'").get()) return false;
  if(existing&&filename!==':memory:') backupBeforeMigration(db,filename,'z5');
  db.exec('BEGIN IMMEDIATE');
  try{
    db.exec(`
      CREATE TABLE IF NOT EXISTS rx5_version(version INTEGER PRIMARY KEY);
      INSERT OR IGNORE INTO rx5_version(version) VALUES(1);
      CREATE TABLE IF NOT EXISTS rx5_clans (
        id INTEGER PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE,
        leader INTEGER NOT NULL REFERENCES users(id), created INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS rx5_members (
        account INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        clan INTEGER NOT NULL REFERENCES rx5_clans(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK(role IN ('leader','member')),
        joined INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS rx5_members_clan ON rx5_members(clan);
      CREATE TABLE IF NOT EXISTS rx5_invites (
        clan INTEGER NOT NULL REFERENCES rx5_clans(id) ON DELETE CASCADE,
        account INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        invited_by INTEGER NOT NULL REFERENCES users(id),
        created INTEGER NOT NULL,
        PRIMARY KEY (clan,account)
      );
      CREATE TABLE IF NOT EXISTS rx5_progress (
        account INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        points INTEGER NOT NULL DEFAULT 0 CHECK(points>=0),
        checkins INTEGER NOT NULL DEFAULT 0 CHECK(checkins>=0),
        streak INTEGER NOT NULL DEFAULT 0 CHECK(streak>=0),
        last_day TEXT NOT NULL DEFAULT '',
        title TEXT NOT NULL DEFAULT 'Rookie'
      );
      CREATE TABLE IF NOT EXISTS rx5_actions (
        id INTEGER PRIMARY KEY, actor INTEGER NOT NULL REFERENCES users(id),
        action TEXT NOT NULL, details TEXT NOT NULL, created INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS rx5_actions_recent ON rx5_actions(created DESC);
    `);
    db.exec('COMMIT');return true;
  }catch(error){db.exec('ROLLBACK');throw error;}
}

export function createZ5Core(db,{clock=Date.now}={}){
  const sql=s=>db.prepare(s);
  const member=sql('SELECT m.clan,m.role,c.name,c.slug,c.leader FROM rx5_members m JOIN rx5_clans c ON m.clan=c.id WHERE m.account=?');
  const progress=sql('SELECT points,checkins,streak,last_day,title FROM rx5_progress WHERE account=?');
  const audit=sql('INSERT INTO rx5_actions(actor,action,details,created) VALUES(?,?,?,?)');
  const getPlayer=sql('SELECT id,name,banned FROM users WHERE handle=?');
  const inClan=sql('SELECT account,role FROM rx5_members WHERE clan=? ORDER BY joined,account');
  const nameOf=sql('SELECT name FROM users WHERE id=?');
  const invites=sql('SELECT i.clan,c.name,c.slug FROM rx5_invites i JOIN rx5_clans c ON c.id=i.clan WHERE i.account=? ORDER BY i.created DESC LIMIT 20');
  const one=account=>progress.get(account)||{points:0,checkins:0,streak:0,last_day:'',title:'Rookie'};
  const log=(who,action,details)=>audit.run(who,action,details,clock());
  function atomic(fn){db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}}
  const requireLeader=user=>{const found=member.get(user.id);if(!found||found.role!=='leader')throw fail(403,'Clan leader permission required.');return found;};
  function clan(user){
    const mine=member.get(user.id);
    const members=mine?inClan.all(mine.clan).map(p=>({name:nameOf.get(p.account)?.name||'Player',role:p.role})):[];
    return {clan:mine?{name:mine.name,slug:mine.slug,role:mine.role,members}:null,invites:invites.all(user.id)};
  }
  function createClan(user,body){
    const name=goodName(body?.name);
    if(!name)throw fail(400,'Clan names must contain 3–24 letters, numbers, spaces, hyphens or underscores.');
    const slug=canonical(name).replace(/\s+/g,'-');
    return atomic(()=>{
      if(member.get(user.id))throw fail(409,'Leave your clan before creating a new one.');
      if(sql('SELECT 1 FROM rx5_clans WHERE slug=?').get(slug))throw fail(409,'Clan name is taken.');
      if(sql('SELECT COUNT(*) AS n FROM rx5_clans WHERE leader=?').get(user.id).n>=1)throw fail(409,'Only one clan per leader.');
      const now=clock();
      const id=sql('INSERT INTO rx5_clans(name,slug,leader,created) VALUES(?,?,?,?)').run(name,slug,user.id,now).lastInsertRowid;
      sql("INSERT INTO rx5_members(account,clan,role,joined) VALUES(?,?,'leader',?)").run(user.id,id,now);
      log(user.id,'clan-create',slug);
      return clan(user);
    });
  }
  function invite(user,body){
    const mine=requireLeader(user);const target=getPlayer.get(canonical(body?.name));
    if(!target||target.banned||target.id===user.id)throw fail(404,'Eligible player not found.');
    return atomic(()=>{
      if(member.get(target.id))throw fail(409,'That player is already in a clan.');
      if(inClan.all(mine.clan).length>=40)throw fail(409,'Clan is full.');
      sql('INSERT INTO rx5_invites(clan,account,invited_by,created) VALUES(?,?,?,?) ON CONFLICT(clan,account) DO UPDATE SET invited_by=excluded.invited_by,created=excluded.created').run(mine.clan,target.id,user.id,clock());
      log(user.id,'clan-invite',String(target.id));
      return {ok:true,player:target.name};
    });
  }
  function accept(user,body){
    const slug=canonical(body?.slug);
    return atomic(()=>{
      if(member.get(user.id))throw fail(409,'Leave your current clan first.');
      const row=sql('SELECT i.clan,c.name FROM rx5_invites i JOIN rx5_clans c ON c.id=i.clan WHERE i.account=? AND c.slug=?').get(user.id,slug);
      if(!row)throw fail(404,'No invitation found.');
      if(inClan.all(row.clan).length>=40)throw fail(409,'Clan is full.');
      sql("INSERT INTO rx5_members(account,clan,role,joined) VALUES(?,?,'member',?)").run(user.id,row.clan,clock());
      sql('DELETE FROM rx5_invites WHERE account=?').run(user.id);
      log(user.id,'clan-join',slug);
      return clan(user);
    });
  }
  function leave(user){
    return atomic(()=>{
      const mine=member.get(user.id);if(!mine)throw fail(409,'You are not in a clan.');
      if(mine.role==='leader'&&inClan.all(mine.clan).length>1)throw fail(409,'Transfer or remove members before disbanding your clan.');
      if(mine.role==='leader')sql('DELETE FROM rx5_clans WHERE id=?').run(mine.clan);
      else sql('DELETE FROM rx5_members WHERE account=?').run(user.id);
      log(user.id,'clan-leave',mine.slug);return clan(user);
    });
  }
  function kick(user,body){
    const mine=requireLeader(user);const target=getPlayer.get(canonical(body?.name));
    if(!target||target.id===user.id)throw fail(400,'Select another clan member.');
    return atomic(()=>{
      const m=member.get(target.id);if(!m||m.clan!==mine.clan||m.role==='leader')throw fail(404,'Member not found.');
      sql('DELETE FROM rx5_members WHERE account=?').run(target.id);
      log(user.id,'clan-kick',String(target.id));return clan(user);
    });
  }
  function titles(user){
    const data=one(user.id);
    return {equipped:data.title,available:['Rookie',...(data.checkins>=1?['First Flight']:[]),...(data.streak>=7?['Seven Day Streak']:[]),...(data.checkins>=30?['Veteran Pilot']:[]),...(member.get(user.id)?['Clan Member']:[])]};
  }
  function equip(user,body){
    const title=body?.title;if(typeof title!=='string'||!titles(user).available.includes(title))throw fail(403,'Title is not unlocked.');
    sql('INSERT INTO rx5_progress(account,title) VALUES(?,?) ON CONFLICT(account) DO UPDATE SET title=excluded.title').run(user.id,title);
    log(user.id,'title-equip',title);return titles(user);
  }
  function checkin(user){
    return atomic(()=>{
      const now=clock(),today=omaniDay(now),old=one(user.id);
      if(old.last_day===today)return {claimed:false,reason:'Already claimed today',...one(user.id),nextDay:today};
      const newStreak=daysApart(old.last_day,today)===1?old.streak+1:1;
      const points=25+(newStreak%7===0?75:0);
      sql('INSERT INTO rx5_progress(account,points,checkins,streak,last_day,title) VALUES(?,?,?,?,?,?) ON CONFLICT(account) DO UPDATE SET points=points+excluded.points,checkins=checkins+1,streak=excluded.streak,last_day=excluded.last_day').run(user.id,points,1,newStreak,today,old.title);
      log(user.id,'daily-checkin',today+' +'+points+' Z5 points');
      return {claimed:true,earned:points,...one(user.id),nextDay:today};
    });
  }
  function status(user){return {version:'Z.5 development',...one(user.id),...clan(user),titles:titles(user),today:omaniDay(clock()),pointsNote:'Z.5 points are separate from existing in-game coins and cannot yet be spent.'};}
  function adminAudit(user){if(!user.admin)throw fail(403,'Administrator access required.');return {actions:sql('SELECT a.action,a.details,a.created,u.name AS actor FROM rx5_actions a JOIN users u ON u.id=a.actor ORDER BY a.id DESC LIMIT 80').all()};}
  return {clan,createClan,invite,accept,leave,kick,titles,equip,checkin,status,adminAudit,ping:()=>({serverTime:clock(),version:'Z.5 development'})};
}
