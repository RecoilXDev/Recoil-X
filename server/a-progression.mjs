// Progression 2.0 and Season 1: additive, server-awarded, idempotent match XP.
export const SEASON_START=Date.parse('2027-01-01T00:00:00+04:00');
export const SEASON_END=Date.parse('2027-04-01T00:00:00+04:00');
export function seasonState(now){return now<SEASON_START?'upcoming':now<SEASON_END?'active':'ended';}
export function createAProgression(db,{clock=Date.now}={}){
 db.exec(`CREATE TABLE IF NOT EXISTS rx_a_progress(player INTEGER PRIMARY KEY REFERENCES users(id),xp INTEGER NOT NULL DEFAULT 0,season_xp INTEGER NOT NULL DEFAULT 0,matches INTEGER NOT NULL DEFAULT 0,wins INTEGER NOT NULL DEFAULT 0,public INTEGER NOT NULL DEFAULT 0);
 CREATE TABLE IF NOT EXISTS rx_a_award(match TEXT NOT NULL,player INTEGER NOT NULL REFERENCES users(id),PRIMARY KEY(match,player));`);
 const get=db.prepare('SELECT * FROM rx_a_progress WHERE player=?'),ensure=db.prepare('INSERT OR IGNORE INTO rx_a_progress(player) VALUES(?)');
 const award=db.prepare('INSERT OR IGNORE INTO rx_a_award VALUES(?,?)'),inc=db.prepare('UPDATE rx_a_progress SET xp=xp+?,season_xp=season_xp+?,matches=matches+1,wins=wins+? WHERE player=?');
 const leaderboard=db.prepare('SELECT u.name,p.season_xp,p.wins FROM rx_a_progress p JOIN users u ON u.id=p.player WHERE p.public=1 AND u.banned=0 AND p.season_xp>0 ORDER BY p.season_xp DESC,u.id LIMIT 50');
 const milestones=[{level:1,xp:0,title:'New Dawn'},{level:5,xp:2000,title:'Sky Vanguard'},{level:10,xp:4500,title:'Sand Legend'},{level:20,xp:9500,title:'First Era'}];
 function view(user){
   const r=get.get(user.id)||{xp:0,season_xp:0,matches:0,wins:0,public:0};
   const level=1+Math.floor(r.xp/500);
   const seasonLevel=1+Math.floor(r.season_xp/500);
   return {xp:r.xp,level,nextLevelXp:level*500,matches:r.matches,wins:r.wins,public:!!r.public,season:{name:'Season 1 — New Dawn',start:SEASON_START,end:SEASON_END,state:seasonState(clock()),xp:r.season_xp,level:seasonLevel,milestones:milestones.map(m=>({...m,unlocked:r.season_xp>=m.xp&&seasonState(clock())!=='upcoming'}))}};
 }
 function settle(result,now=clock()){
   if(!result?.id||![0,1].includes(result.winner)||['remake','forfeit','abandoned'].includes(result.reason)||result.duration<30000)return;
   db.exec('BEGIN IMMEDIATE');try{
    for(const p of result.players||[]){
     if(!Number.isSafeInteger(p.id)||p.id<=0||p.forfeited||!(p.inputs>=20))continue;
     if(!award.run(result.id,p.id).changes)continue;
     ensure.run(p.id);
     const won=Number(p.team===result.winner),kills=Math.min(30,Math.max(0,Math.floor(Number(p.kills)||0)));
     const xp=100+won*100+kills*10;
     inc.run(xp,seasonState(now)==='active'?xp:0,won,p.id);
    }db.exec('COMMIT');
   }catch(e){db.exec('ROLLBACK');throw e;}
 }
 function setPublic(user,value){if(typeof value!=='boolean')throw Object.assign(Error('Choose a visibility setting.'),{status:400});ensure.run(user.id);db.prepare('UPDATE rx_a_progress SET public=? WHERE player=?').run(+value,user.id);return view(user);}
 function board(){return {state:seasonState(clock()),players:seasonState(clock())==='upcoming'?[]:leaderboard.all(),notice:'Opt-in seasonal leaderboard. Only public game names and earned season XP are listed.'};}
 return {view,settle,setPublic,board};
}
