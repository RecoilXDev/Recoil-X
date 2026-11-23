// Server-side anomaly evidence collection, not an automatic ban engine.
export function createAntiCheat({maxSpeed=18,maxFireRate=15,now=Date.now}={}){
 const records=new Map();
 function inspect(userId,event){const id=String(userId),record=records.get(id)||{events:[],lastPosition:null,lastShot:null};const flags=[];
 if(event?.kind==='move'){const p=event.position,t=Number(event.time);
   if(!Array.isArray(p)||p.length!==3||!p.every(Number.isFinite)||!Number.isFinite(t))flags.push('invalid-movement');
   else {if(record.lastPosition){const dt=(t-record.lastPosition.time)/1000;
     const d=Math.hypot(...p.map((v,i)=>v-record.lastPosition.position[i]));
     if(dt<=0||d/dt>maxSpeed)flags.push('movement-anomaly');}
     record.lastPosition={position:[...p],time:t};}
 }
 if(event?.kind==='shot'){const t=Number(event.time);
   if(!Number.isFinite(t))flags.push('invalid-shot');
   else {if(record.lastShot!==null&&t-record.lastShot<1000/maxFireRate)flags.push('fire-rate-anomaly');record.lastShot=t;}
 }
 if(flags.length){record.events.push({at:now(),flags});if(record.events.length>100)record.events.shift();}
 records.set(id,record);return {flags,reviewRequired:flags.length>0,autoBan:false};
 }
 function evidence(userId){return [...(records.get(String(userId))?.events||[])];}
 function clear(userId){records.delete(String(userId));}
 return {inspect,evidence,clear};
}
