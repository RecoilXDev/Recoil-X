// Opt-in Beta process supervisor. Does not resume abandoned matches or override host limits.
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const env={...process.env,RX_CHANNEL:'beta'};
const entry=fileURLToPath(new URL('./server.mjs',import.meta.url));
let child=null,timer=null,stopping=false,failures=[];
const windowMs=600000,maxRestarts=5;
function launch(){
 if(stopping)return;
 const started=Date.now();
 child=spawn(process.execPath,[entry],{env,stdio:'inherit'});
 let done=false;
 function exit(code,signal){
  if(done)return;done=true;child=null;if(stopping)return;
  const now=Date.now();if(now-started>=windowMs)failures=[];
  failures=failures.filter(t=>now-t<windowMs);failures.push(now);
  if(failures.length>maxRestarts){console.error('Beta supervisor stopped: repeated exits. Inspect logs before restarting.');process.exitCode=1;return;}
  const delay=Math.min(30000,1000*2**(failures.length-1));
  console.error('Beta process exited',code,signal,'retry in',delay,'ms');
  timer=setTimeout(launch,delay);
 }
 child.once('error',e=>{console.error(e.message);exit(1,null);});
 child.once('exit',exit);
}
function stop(signal){if(stopping)return;stopping=true;clearTimeout(timer);if(child){child.kill(signal);const force=setTimeout(()=>child?.kill('SIGKILL'),10000);force.unref();}}
process.once('SIGINT',()=>stop('SIGINT'));process.once('SIGTERM',()=>stop('SIGTERM'));launch();
