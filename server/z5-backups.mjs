// RECOIL X Z.5 automatic SQLite snapshots.
// Backups stay on the server in a private folder; no user secrets are transmitted.
import { existsSync,mkdirSync,chmodSync,readdirSync,statSync,unlinkSync } from 'node:fs';
import { basename,dirname,resolve,join } from 'node:path';

export function startZ5Backups(db,filename,{now=Date.now,onError=console.error,
 intervalMs=24*60*60*1000,keep=7,schedule=setInterval,unschedule=clearInterval}={}){
  if(filename===':memory:'||!filename)return {run:()=>null,stop:()=>{}};
  if(!Number.isFinite(intervalMs)||intervalMs<60000||!Number.isSafeInteger(keep)||keep<1||keep>90)
    throw Error('Invalid database backup configuration.');
  const absolute=resolve(filename),directory=join(dirname(absolute),'.recoil-backups');
  const prefix=basename(absolute)+'-automatic-';
  let busy=false,closed=false;
  function list(){
    if(!existsSync(directory))return [];
    return readdirSync(directory).filter(n=>n.startsWith(prefix)&&n.endsWith('.sqlite')).map(n=>{
      const path=join(directory,n);
      return {path,name:n,mtime:statSync(path).mtimeMs};
    }).sort((a,b)=>b.mtime-a.mtime);
  }
  function run(){
    if(busy||closed)return null;
    busy=true;
    try{
      mkdirSync(directory,{recursive:true,mode:0o700});chmodSync(directory,0o700);
      const recent=list();
      if(recent.length&&now()-recent[0].mtime<intervalMs)return recent[0].path;
      // VACUUM INTO copies a coherent WAL-mode SQLite snapshot.
      const path=join(directory,prefix+now()+'-'+process.pid+'.sqlite');
      db.prepare('VACUUM main INTO ?').run(path);
      chmodSync(path,0o600);
      for(const old of list().slice(keep))unlinkSync(old.path);
      return path;
    }catch(error){onError(error);return null;}
    finally{busy=false;}
  }
  const interval=schedule(run,intervalMs);
  interval.unref?.();
  // The first automatic snapshot is due after the interval.
  // Migration snapshots at startup are managed separately; don't duplicate them.
  return {run,stop:()=>{closed=true;unschedule(interval);}};
}
