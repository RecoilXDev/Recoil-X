// RECOIL X Z.5 daily challenges, story chapters and cosmetic-only prestige.
// Rewards use server-verified check-in and authoritative match settlement events.
import {backupBeforeMigration} from './overdrive-store.mjs';
const fail=(status,message)=>Object.assign(new Error(message),{status});
const dayAt=now=>new Date(now+4*3600000).toISOString().slice(0,10);
export const CHALLENGES=Object.freeze({
  checkin:{name:'Show Up',description:'Claim today\'s daily reward',target:1,reward:10},
  finish:{name:'Finish Strong',description:'Finish two eligible matches',target:2,reward:35},
  win:{name:'Victory Call',description:'Win one eligible match',target:1,reward:30},
  eliminations:{name:'Precision',description:'Score five verified eliminations',target:5,reward:40}
});
export const STORY=Object.freeze([
  {chapter:1,name:'Signal Awakening',description:'Complete three eligible matches',kind:'finish',target:3,reward:90},
  {chapter:2,name:'Rift Hunters',description:'Win two eligible matches',kind:'win',target:2,reward:150},
  {chapter:3,name:'Ascension',description:'Reach twenty verified eliminations',kind:'eliminations',target:20,reward:250}
]);
export function migrateZ5Challenges(db,filename,needsBackup=false){
  if(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='rx5_challenge_version'").get())return false;
  if(needsBackup&&filename!==':memory:')backupBeforeMigration(db,filename,'z5-challenges');
  db.exec('BEGIN IMMEDIATE');
  try{
    db.exec([
      'CREATE TABLE rx5_challenge_version(version INTEGER PRIMARY KEY)',
      'INSERT INTO rx5_challenge_version VALUES (1)',
      'CREATE TABLE rx5_daily_challenges(account INTEGER NOT NULL REFERENCES users(id),day TEXT NOT NULL,kind TEXT NOT NULL,progress INTEGER NOT NULL DEFAULT 0,claimed INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(account,day,kind))',
      'CREATE TABLE rx5_story_chapters(account INTEGER NOT NULL REFERENCES users(id),chapter INTEGER NOT NULL,progress INTEGER NOT NULL DEFAULT 0,claimed INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(account,chapter))',
      'CREATE TABLE rx5_prestige(account INTEGER PRIMARY KEY REFERENCES users(id),level INTEGER NOT NULL DEFAULT 0 CHECK(level BETWEEN 0 AND 10))',
      'CREATE TABLE rx5_challenge_matches(match TEXT PRIMARY KEY,created INTEGER NOT NULL)'
    ].join(';')+';');
    db.exec('COMMIT');return true;
  }catch(e){db.exec('ROLLBACK');throw e;}
}
export function createZ5Challenges(db,{clock=Date.now}={}){
  const q=s=>db.prepare(s);
  const progress=q('SELECT points FROM rx5_progress WHERE account=?');
  const player=q('SELECT matches,wins,kills FROM rx5_player_stats WHERE account=?');
  const prestigeLevel=q('SELECT level FROM rx5_prestige WHERE account=?');
  const daily=q('SELECT progress,claimed FROM rx5_daily_challenges WHERE account=? AND day=? AND kind=?');
  const storyRow=q('SELECT progress,claimed FROM rx5_story_chapters WHERE account=? AND chapter=?');
  const audit=q('INSERT INTO rx5_actions(actor,action,details,created) VALUES(?,?,?,?)');
  const atomic=fn=>{db.exec('BEGIN IMMEDIATE');try{const out=fn();db.exec('COMMIT');return out;}catch(e){db.exec('ROLLBACK');throw e;}};
  const log=(id,kind,detail)=>audit.run(id,kind,detail,clock());
  function credit(id,n){
    const current=progress.get(id)?.points||0;
    if(current+n>2000000000||current+n<0)throw fail(409,'Z.5 point limit reached.');
    q('INSERT INTO rx5_progress(account,points) VALUES(?,?) ON CONFLICT(account) DO UPDATE SET points=excluded.points').run(id,current+n);
  }
  function dailyIncrement(id,day,kind,increment){
    if(!Object.hasOwn(CHALLENGES,kind)||!Number.isSafeInteger(increment)||increment<1)return;
    q('INSERT INTO rx5_daily_challenges(account,day,kind,progress) VALUES(?,?,?,?) ON CONFLICT(account,day,kind) DO UPDATE SET progress=MIN(progress+excluded.progress,10000)').run(id,day,kind,increment);
  }
  function storyIncrement(id,kind,increment){
    for(const chapter of STORY.filter(s=>s.kind===kind)){
      q('INSERT INTO rx5_story_chapters(account,chapter,progress) VALUES(?,?,?) ON CONFLICT(account,chapter) DO UPDATE SET progress=MIN(progress+excluded.progress,100000)').run(id,chapter.chapter,increment);
    }
  }
  function onCheckin(user,claim){
    if(!claim?.claimed)return;
    atomic(()=>{dailyIncrement(user.id,claim.last_day,'checkin',1);log(user.id,'challenge-checkin',claim.last_day)});
  }
  function onMatchSettled(result,now=clock()){
    if(!result||typeof result.id!=='string'||result.id.length>80||result.winner==null||result.reason==='remake'||!Array.isArray(result.players)||result.duration<10000)return {count:0};
    return atomic(()=>{
      if(!q('INSERT OR IGNORE INTO rx5_challenge_matches(match,created) VALUES(?,?)').run(result.id,now).changes)return {duplicate:true,count:0};
      let count=0;
      const day=dayAt(now);
      for(const p of result.players){
        if(!Number.isSafeInteger(p.id)||p.id<1||p.forfeited||p.inputs<5||!q('SELECT 1 FROM users WHERE id=?').get(p.id))continue;
        const kills=Math.max(0,Math.min(200,Math.trunc(p.kills)||0));
        dailyIncrement(p.id,day,'finish',1);
        storyIncrement(p.id,'finish',1);
        if(p.team===result.winner){dailyIncrement(p.id,day,'win',1);storyIncrement(p.id,'win',1);}
        if(kills){dailyIncrement(p.id,day,'eliminations',kills);storyIncrement(p.id,'eliminations',kills);}
        count++;
      }
      return {count};
    });
  }
  function board(user){
    const day=dayAt(clock()),stats=player.get(user.id)||{matches:0,wins:0,kills:0},level=prestigeLevel.get(user.id)?.level||0;
    return {
      day,points:progress.get(user.id)?.points||0,stats,prestige:level,
      canPrestige:level<10&&stats.matches>=(level+1)*10&&(progress.get(user.id)?.points||0)>=200,
      daily:Object.entries(CHALLENGES).map(([kind,def])=>({kind,...def,progress:daily.get(user.id,day,kind)?.progress||0,claimed:!!daily.get(user.id,day,kind)?.claimed})),
      story:STORY.map(def=>({...def,progress:storyRow.get(user.id,def.chapter)?.progress||0,claimed:!!storyRow.get(user.id,def.chapter)?.claimed}))
    };
  }
  function claimDaily(user,body){
    const kind=body?.kind,definition=CHALLENGES[kind];
    if(!definition)throw fail(400,'Invalid challenge.');
    return atomic(()=>{
      const day=dayAt(clock()),entry=daily.get(user.id,day,kind);
      if(!entry||entry.progress<definition.target)throw fail(409,'Objective not complete yet.');
      if(entry.claimed)throw fail(409,'Reward already claimed.');
      q('UPDATE rx5_daily_challenges SET claimed=1 WHERE account=? AND day=? AND kind=?').run(user.id,day,kind);
      credit(user.id,definition.reward);
      log(user.id,'challenge-claimed',day+'/'+kind);
      return {ok:true,reward:definition.reward,points:progress.get(user.id).points};
    });
  }
  function claimStory(user,body){
    const chapter=body?.chapter,definition=STORY.find(x=>x.chapter===chapter);
    if(!definition)throw fail(400,'Invalid story chapter.');
    return atomic(()=>{
      if(chapter>1&&!storyRow.get(user.id,chapter-1)?.claimed)throw fail(409,'Finish the previous chapter first.');
      const entry=storyRow.get(user.id,chapter);
      if(!entry||entry.progress<definition.target)throw fail(409,'Chapter objective not complete yet.');
      if(entry.claimed)throw fail(409,'Chapter already claimed.');
      q('UPDATE rx5_story_chapters SET claimed=1 WHERE account=? AND chapter=?').run(user.id,chapter);
      credit(user.id,definition.reward);
      log(user.id,'story-claimed',String(chapter));
      return {ok:true,reward:definition.reward,points:progress.get(user.id).points};
    });
  }
  function prestige(user){
    return atomic(()=>{
      const level=prestigeLevel.get(user.id)?.level||0,stats=player.get(user.id);
      if(level>=10||!stats||stats.matches<(level+1)*10)throw fail(409,'Complete more eligible matches to prestige.');
      if((progress.get(user.id)?.points||0)<200)throw fail(409,'Prestige costs 200 Z.5 points.');
      credit(user.id,-200);
      q('INSERT INTO rx5_prestige(account,level) VALUES(?,?) ON CONFLICT(account) DO UPDATE SET level=excluded.level').run(user.id,level+1);
      log(user.id,'prestige',String(level+1));
      return {ok:true,level:level+1};
    });
  }
  return {onCheckin,onMatchSettled,board,claimDaily,claimStory,prestige};
}
