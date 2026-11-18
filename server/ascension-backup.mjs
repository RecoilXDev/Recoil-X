import {DatabaseSync} from 'node:sqlite';
import {chmodSync,existsSync,lstatSync,mkdirSync,readdirSync,realpathSync,renameSync,rmSync,statSync} from 'node:fs';
import {basename,dirname,isAbsolute,join,relative,resolve,sep} from 'node:path';
import {homedir} from 'node:os';
import {createHash,randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {Worker,isMainThread,parentPort,workerData} from 'node:worker_threads';
const within=(root,file)=>{const p=relative(root,file);return !p||(!p.startsWith('..'+sep)&&p!=='..'&&!isAbsolute(p));};
const ownDir=dirname(fileURLToPath(import.meta.url));
export function verifiedBackup(file,{directory,keep=7,reason='daily',now=Date.now(),publicRoots=[]}={}){
  if(!file||file===':memory:'||!existsSync(file))throw Error('A file-backed database is required.');
  if(!Number.isInteger(keep)||keep<1||keep>30)throw Error('Backup retention must be 1–30.');
  const dbPath=realpathSync(file),key=createHash('sha256').update(dbPath).digest('hex').slice(0,16);
  const folder=resolve(directory||join(homedir(),'.local','state','recoil-x','backups',key));
  const publicDirs=[join(homedir(),'www'),join(homedir(),'public_html'),...publicRoots.map(p=>resolve(p))];
  for(let at=ownDir;at!==dirname(at);at=dirname(at))if(existsSync(join(at,'.git'))){publicDirs.push(at);break;}
  function check(candidate){
    if(candidate===dirname(dbPath)||candidate.split(sep).some(part=>['.git','www','htdocs','public_html'].includes(part))||publicDirs.some(root=>within(root,candidate)))throw Error('Choose private backup storage outside the game directory.');
  }
  check(folder);
  let ancestor=folder;while(!existsSync(ancestor))ancestor=dirname(ancestor);
  check(resolve(realpathSync(ancestor),relative(ancestor,folder)));
  if(existsSync(folder)&&lstatSync(folder).isSymbolicLink())throw Error('Backup directory cannot be a symbolic link.');
  mkdirSync(folder,{recursive:true,mode:0o700});chmodSync(folder,0o700);
  const prefix='rx-'+key+'-',suffix=reason==='migration'?'migration':'daily';
  const name=prefix+now+'-'+randomUUID()+'-'+suffix+'.sqlite',dest=join(folder,name),partial=dest+'.partial';
  const db=new DatabaseSync(dbPath,{readOnly:true});
  try{
    db.exec('PRAGMA busy_timeout=5000');db.prepare('VACUUM main INTO ?').run(partial);chmodSync(partial,0o600);
    const checkDb=new DatabaseSync(partial,{readOnly:true});
    try{const rows=checkDb.prepare('PRAGMA integrity_check').all();
      if(rows.length!==1||rows[0].integrity_check!=='ok')throw Error('Backup integrity verification failed.');
      if(!checkDb.prepare("SELECT 1 FROM sqlite_master WHERE name='users'").get())throw Error('Backup lacks the account table.');
    }finally{checkDb.close();}
    renameSync(partial,dest);
    if(suffix==='daily'){
      const old=readdirSync(folder).filter(n=>n.startsWith(prefix)&&n.endsWith('-daily.sqlite')).sort().reverse();
      for(const item of old.slice(keep))rmSync(join(folder,item));
    }
    return {time:now,bytes:statSync(dest).size,path:dest};
  }finally{db.close();rmSync(partial,{force:true});}
}
export function backupSchedule(file,options={}){
  const status={state:'idle',last:null,failedAt:null};
  let worker=null,stopped=false;
  const hours=options.hours??24;
  if(!Number.isFinite(hours)||hours<1||hours>168)throw Error('Backup interval must be 1–168 hours.');
  function start(){
    if(stopped||worker||file===':memory:')return;
    status.state='running';
    worker=new Worker(new URL(import.meta.url),{workerData:{file,options}});
    worker.once('message',m=>{
      if(m.ok){status.state='ok';status.last=m.time;status.failedAt=null;}
      else{status.state='failed';status.failedAt=Date.now();console.error('RECOIL X private database backup failed.');}
    });
    worker.once('error',()=>{status.state='failed';status.failedAt=Date.now();console.error('RECOIL X database backup worker failed.');});
    worker.once('exit',()=>{worker=null;});
  }
  const timer=file!==':memory:'?setInterval(start,hours*3600000):null;timer?.unref();
  // A restart must not indefinitely postpone backups on a frequently recycled host.
  let first=null;
  if(file!==':memory:'){
    const key=createHash('sha256').update(realpathSync(file)).digest('hex').slice(0,16);
    const directory=options.directory||join(homedir(),'.local','state','recoil-x','backups',key);
    const daily=existsSync(directory)?readdirSync(directory).filter(n=>n.startsWith('rx-'+key+'-')&&n.endsWith('-daily.sqlite')).sort().at(-1):null;
    const last=daily?statSync(join(directory,daily)).mtimeMs:0;status.last=last||null;
    first=setTimeout(start,Math.max(1000,last+hours*3600000-Date.now()));first.unref();
  }
  return {status,start,close(){stopped=true;clearInterval(timer);clearTimeout(first);}};
}
if(!isMainThread&&workerData?.file){
  try{const r=verifiedBackup(workerData.file,workerData.options);parentPort.postMessage({ok:true,time:r.time});}
  catch{parentPort.postMessage({ok:false});}
}
