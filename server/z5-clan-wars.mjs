// Authenticated Z.5 clan-war results: only authoritative matches count.
// This does not grant old coins, ratings, titles or admin privileges.
import {backupBeforeMigration} from './overdrive-store.mjs';
export function migrateClanWars(db,filename,existing=true){
  if(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='rx5_clan_wars'").get())return false;
  if(existing&&filename!==':memory:')backupBeforeMigration(db,filename,'z5-clanwars');
  db.exec([
    'CREATE TABLE IF NOT EXISTS rx5_clan_wars(',
    'match TEXT PRIMARY KEY,clan0 INTEGER NOT NULL,clan1 INTEGER NOT NULL,',
    'winner INTEGER,played INTEGER NOT NULL,duration INTEGER NOT NULL,',
    'score0 INTEGER NOT NULL,score1 INTEGER NOT NULL,',
    'CHECK(clan0 <> clan1),CHECK(winner IS NULL OR winner IN (0,1)))',
    ';CREATE INDEX IF NOT EXISTS rx5_clan_wars_recent ON rx5_clan_wars(played DESC)'
  ].join(''));
  return true;
}
export function createClanWars(db,{clock=Date.now}={}){
  const sql=s=>db.prepare(s);
  const member=sql('SELECT clan FROM rx5_members WHERE account=?');
  const clanName=sql('SELECT name,slug FROM rx5_clans WHERE id=?');
  const insert=sql('INSERT OR IGNORE INTO rx5_clan_wars(match,clan0,clan1,winner,played,duration,score0,score1) VALUES(?,?,?,?,?,?,?,?)');
  const history=sql('SELECT w.*,a.name AS home,b.name AS away FROM rx5_clan_wars w LEFT JOIN rx5_clans a ON a.id=w.clan0 LEFT JOIN rx5_clans b ON b.id=w.clan1 WHERE w.clan0=? OR w.clan1=? ORDER BY w.played DESC LIMIT 30');
  const standings=sql('SELECT c.id,c.name,COUNT(w.match) played,SUM(CASE WHEN (w.winner=0 AND w.clan0=c.id) OR (w.winner=1 AND w.clan1=c.id) THEN 1 ELSE 0 END) wins FROM rx5_clans c LEFT JOIN rx5_clan_wars w ON w.clan0=c.id OR w.clan1=c.id GROUP BY c.id ORDER BY wins DESC,played DESC,c.name LIMIT 20');
  function clanFor(account){
    const row=member.get(account);
    if(!row)return null;
    const clan=clanName.get(row.clan);
    return clan?{id:row.clan,...clan}:null;
  }
  function onMatchSettled(result,now=clock()){
    if(result?.mode!=='clanwar'||!Array.isArray(result.clanWar)||result.clanWar.length!==2)return false;
    const [a,b]=result.clanWar;
    if(!Number.isSafeInteger(a)||!Number.isSafeInteger(b)||a===b)return false;
    if(!['score','time','forfeit'].includes(result.reason))return false;
    // No counting empty fake lobbies or zero-effort rematch farming.
    if(result.duration<15000||!Array.isArray(result.players)||![0,1].every(team=>
      result.players.some(p=>p.team===team&&p.inputs>0)))return false;
    const winning=result.winner===0||result.winner===1?result.winner:null;
    return insert.run(result.id,a,b,winning,now,
      Math.floor(result.duration),result.score[0],result.score[1]).changes===1;
  }
  function dashboard(user){
    const clan=clanFor(user.id);
    return {clan,history:clan?history.all(clan.id,clan.id):[],leaderboard:standings.all(),
      note:'Only server-settled clan-versus-clan matches count. No coins or rank are awarded.'};
  }
  return {clanFor,onMatchSettled,dashboard};
}