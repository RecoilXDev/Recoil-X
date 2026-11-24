// Operation Server Shield: bounded admission, runtime pressure, safe admin controls.
// Do not trust forwarded IP headers. Hosting proxy limits must be configured separately.
export function createServerShield(db,{clock=Date.now,memory=()=>process.memoryUsage().rss,cpu=()=>process.cpuUsage(),maxPlayers=40,maxPending=12,maxRss=512*1024*1024,maxAuthJobs=2}={}){
 db.exec("CREATE TABLE IF NOT EXISTS rx_a_shield_config(id INTEGER PRIMARY KEY CHECK(id=1),maintenance INTEGER NOT NULL);INSERT OR IGNORE INTO rx_a_shield_config VALUES(1,0);CREATE TABLE IF NOT EXISTS rx_a_shield_log(id INTEGER PRIMARY KEY,at INTEGER NOT NULL,kind TEXT NOT NULL,actor INTEGER);");
 const read=db.prepare('SELECT maintenance FROM rx_a_shield_config WHERE id=1'),write=db.prepare('UPDATE rx_a_shield_config SET maintenance=? WHERE id=1');
 const add=db.prepare('INSERT INTO rx_a_shield_log(at,kind,actor) VALUES(?,?,?)'),trim=db.prepare('DELETE FROM rx_a_shield_log WHERE id NOT IN (SELECT id FROM rx_a_shield_log ORDER BY id DESC LIMIT 250)');
 const recent=db.prepare('SELECT at,kind,actor FROM rx_a_shield_log ORDER BY id DESC LIMIT 100');
 let maintenance=!!read.get().maintenance,pending=0,authJobs=0,denied=0,lastLog=new Map(),lastCpu=cpu(),lastAt=clock(),cpuPercent=0;
 const error=(status,message)=>Object.assign(Error(message),{status});
 function note(kind,actor=null){
   const key=kind+':'+(actor??''),now=clock(),last=lastLog.get(key);
   if(last!==undefined&&now-last<5000)return;
   if(lastLog.size>=512)lastLog.clear();lastLog.set(key,now);
   add.run(now,kind,actor);trim.run();
 }
 function pressure(){return memory()>=maxRss;}
 function reject(kind,status,message){denied++;note(kind);throw error(status,message);}
 function admission(online,replacing=false,admin=false){
   if(maintenance&&!admin)reject('maintenance',503,'Online services are in maintenance. Try again later.');
   if(!replacing&&online>=maxPlayers)reject('capacity',503,'Server is full. Retry shortly.');
   if(!replacing&&pressure())reject('memory-pressure',503,'Server is busy. Retry shortly.');
 }
 function reserveUpgrade(){
   if(pending>=maxPending)reject('pending-limit',503,'Too many pending connections.');
   pending++;let released=false;return ()=>{if(!released){released=true;pending--;}};
 }
 async function hashJob(fn){
   if(authJobs>=maxAuthJobs||pressure())reject('auth-busy',429,'Authentication is busy. Retry shortly.');
   authJobs++;try{return await fn();}finally{authJobs--;}
 }
 function packet(c){
   const now=clock(),w=c.aShieldWindow;
   if(!w||now-w.start>=1000)c.aShieldWindow={start:now,count:0};
   if(++c.aShieldWindow.count<=260)return true;
   note('wire-rate-limit',c.id);return false;
 }
 function admin(user){if(!user?.admin)throw error(403,'Administrator access required.');}
 function status(online){return {maintenance,online,capacity:maxPlayers,pending,authJobs,busy:pressure(),retryAfterSeconds:15};}
 function inspect(user,online){
   admin(user);const now=clock(),next=cpu(),elapsed=now-lastAt;
   if(elapsed>=1000){cpuPercent=Math.round((next.user+next.system-lastCpu.user-lastCpu.system)/(elapsed*10));lastCpu=next;lastAt=now;}
   return {...status(online),rssMB:Math.round(memory()/1048576),rssLimitMB:Math.round(maxRss/1048576),cpuPercent,denied,events:recent.all(),notice:'CPU is process usage, possibly above 100% on multiple cores. RSS guard is admission control, not a hard RAM limit.'};
 }
 function setMaintenance(user,value){admin(user);if(typeof value!=='boolean')throw error(400,'Choose maintenance on or off.');write.run(+value);maintenance=value;note(value?'maintenance-enabled':'maintenance-disabled',user.id);return {maintenance};}
 return {admission,reserveUpgrade,hashJob,packet,status,inspect,setMaintenance,note};
}
