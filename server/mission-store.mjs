import { backupBeforeMigration } from './overdrive-store.mjs';

const original = ['air','box','home','light'];
const difficulties = {recruit:220, standard:180, veteran:145};
const kits = ['tech','medic','scout'];
const paints = ['ion','amber','orchid'];
const cap = 500;
const bounds = (value,low,high) => Number.isFinite(value) && value>=low && value<=high;
const whole = (value,low,high) => Number.isInteger(value) && bounds(value,low,high);
const same = (a,b) => JSON.stringify(a)===JSON.stringify(b);

function levelOf(id) {
  const legacy=original.indexOf(id);
  if (legacy>=0) return legacy+1;
  const match=/^lv([1-9]\d{0,2})$/.exec(id);
  return match && whole(Number(match[1]),5,cap) ? Number(match[1]) : 0;
}
function describe(key) {
  if (key==='signal_missions_prefs_v1') return {type:'prefs'};
  if (key==='signal_dispatch_stamps') return {type:'stamps'};
  if (typeof key!=='string' || key.length>64) return null;
  const match=/^signal_(record|checkpoint)_(air|box|home|light|daily|lv[1-9]\d{0,2})_(recruit|standard|veteran)$/.exec(key);
  if (!match) return null;
  const [,type,id,difficulty]=match,level=levelOf(id);
  return level || (type==='checkpoint' && id==='daily') ? {type,id,difficulty,level} : null;
}
function validDate(day) {
  if(typeof day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(day))return false;
  const ms=Date.parse(day+'T00:00:00Z');
  return Number.isFinite(ms)&&new Date(ms).toISOString().slice(0,10)===day;
}
function clean(meta,v) {
  if (meta.type==='stamps') {
    if (!Array.isArray(v)||v.length>31||!v.every(validDate)) return undefined;
    return [...new Set(v)].sort();
  }
  if (meta.type==='checkpoint' && v===null) return null;
  if (!v || Array.isArray(v) || typeof v!=='object') return undefined;
  if (meta.type==='prefs'){
    if (!Object.hasOwn(difficulties,v.difficulty)||!kits.includes(v.kit)||!paints.includes(v.paint))return undefined;
    return {difficulty:v.difficulty,kit:v.kit,paint:v.paint};
  }
  const limit=difficulties[meta.difficulty];
  if (meta.type==='record'){
    if(!whole(v.stars,1,3)||!bounds(v.best,.01,limit))return undefined;
    return {stars:v.stars,best:v.best};
  }
  const daily=meta.id==='daily';
  if(daily ? !original.includes(v.id)||!validDate(v.day) : v.id!==meta.id||v.day!=='')return undefined;
  if(typeof v.runId!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(v.runId)||
     !whole(v.stage,0,6)||!bounds(v.time,0,limit)||v.time>=limit||
     !Array.isArray(v.splits)||v.splits.length!==v.stage||
     !v.splits.every((n,i)=>bounds(n,i?v.splits[i-1]:0,v.time))||
     !['','safe','surge'].includes(v.route)||!kits.includes(v.kit)||!paints.includes(v.paint)||
     typeof v.intel!=='boolean'||typeof v.used!=='boolean'||!bounds(v.x,-25.9,25.9)||!bounds(v.z,-25.9,25.9)||
     (!bounds(v.hp,0,100)||v.hp===0)||!bounds(v.shield,0,100)||!whole(v.weapon,0,3))return undefined;
  for(const field of ['mags','stocks']){
    if(!Array.isArray(v[field])||v[field].length!==4||!v[field].every(n=>whole(n,0,9999)))return undefined;
  }
  const {runId,id,stage,day,time,splits,route,kit,paint,intel,used,x,z,hp,shield,weapon,mags,stocks}=v;
  return {runId,id,stage,day,time,splits,route,kit,paint,intel,used,x,z,hp,shield,weapon,mags,stocks};
}

export function migrateMissions(db,filename,needsBackup){
  if(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='rx_mission_save'").get())return;
  if(needsBackup&&filename!==':memory:')backupBeforeMigration(db,filename,'mission-levels');
  // One additive DDL statement is atomic. Old server versions ignore this table.
  db.exec(`CREATE TABLE IF NOT EXISTS rx_mission_save (
    account INTEGER NOT NULL REFERENCES users(id), key TEXT NOT NULL,
    revision INTEGER NOT NULL, value TEXT, PRIMARY KEY(account,key)
  ) WITHOUT ROWID`);
}

export function missionStore(db,fail){
  const all=db.prepare('SELECT key,revision,value FROM rx_mission_save WHERE account=?');
  const one=db.prepare('SELECT revision,value FROM rx_mission_save WHERE account=? AND key=?');
  const cleared=db.prepare("SELECT key FROM rx_mission_save WHERE account=? AND key GLOB 'signal_record_*'");
  const upsert=db.prepare(`INSERT INTO rx_mission_save(account,key,revision,value) VALUES (?,?,?,?)
    ON CONFLICT(account,key) DO UPDATE SET revision=excluded.revision,value=excluded.value`);
  const decode=row=>row?.value==null?null:JSON.parse(row.value);
  function read(account){
    return {rows:all.all(account).map(row=>({key:row.key,rev:row.revision,value:decode(row)}))};
  }
  function write(account,body){
    if(!Array.isArray(body.changes)||body.changes.length<1||body.changes.length>8)throw fail(400,'Send 1–8 mission changes.');
    const changes=body.changes.map(op=>{
      const meta=describe(op?.key);
      if(!meta||!whole(op.base,0,Number.MAX_SAFE_INTEGER))throw fail(400,'Invalid mission save key or revision.');
      const value=clean(meta,op.value);
      return {key:op.key,base:op.base,previous:op.previous,meta,value};
    });
    db.exec('BEGIN IMMEDIATE');
    try{
      const wins=new Set(cleared.all(account).map(row=>describe(row.key).level)),rows=[];
      let frontier=1;
      for(const {key,base,previous,meta,value:incoming} of changes){
        while(wins.has(frontier)&&frontier<=cap)frontier++;
        const row=one.get(account,key),old=decode(row);
        let rev=row?.revision||0,value=incoming,applied=true;
        if(incoming===undefined || (meta.level && meta.level>frontier))applied=false;
        else if(meta.type==='record'&&old)value={stars:Math.max(old.stars,value.stars),best:Math.min(old.best,value.best)};
        else if(meta.type==='stamps')value=[...new Set([...(old||[]),...value])].sort().slice(-31);
        else if(!same(old,value) && base!==rev){
          const sameRun=old?.runId && old.runId===value?.runId;
          // A stale run cannot resurrect a cleared checkpoint or replace another device's restart.
          applied=meta.type==='checkpoint' && !!old && (value===null ? previous===old.runId :
            !!sameRun && (value.stage>old.stage || (value.stage===old.stage && value.time>=old.time &&
            (!old.intel||value.intel)&&(!old.used||value.used))));
          if(applied&&sameRun){value.intel||=old.intel;value.used||=old.used;}
        }
        if(!applied)value=old;
        else{
          if(!same(old,value))upsert.run(account,key,++rev,JSON.stringify(value));
          if(meta.type==='record')wins.add(meta.level);
        }
        rows.push({key,rev,value,applied,...(incoming===undefined?{reason:'invalid'}:{})});
      }
      db.exec('COMMIT');return {rows};
    }catch(error){db.exec('ROLLBACK');throw error;}
  }
  return {read,write};
}
