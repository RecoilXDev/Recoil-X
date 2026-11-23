// RECOIL X Z.5 network-quality estimator.
// WebSocket runs over TCP: missing application heartbeats are NOT raw packet loss.
export function createNetworkQuality({now=Date.now,windowSize=32,timeoutMs=4000}={}){
  const peers=new Map();
  function state(id){if(!peers.has(id))peers.set(id,{next:1,pending:new Map(),samples:[],sent:0,received:0,missed:0});return peers.get(id);}
  function ping(id){const s=state(id),seq=s.next++,at=now();s.pending.set(seq,at);s.sent++;return {type:'z5:ping',seq,at};}
  function pong(id,seq){const s=state(id),start=s.pending.get(seq);if(start===undefined)return null;s.pending.delete(seq);const rtt=Math.max(0,now()-start);s.received++;s.samples.push(rtt);if(s.samples.length>windowSize)s.samples.shift();return report(id);}
  function sweep(id){const s=state(id);for(const [seq,at] of s.pending)if(now()-at>timeoutMs){s.pending.delete(seq);s.missed++;}return report(id);}
  function report(id){const s=state(id),v=s.samples,mean=v.length?v.reduce((a,b)=>a+b,0)/v.length:null;
    const jitter=v.length>1?v.slice(1).reduce((sum,x,i)=>sum+Math.abs(x-v[i]),0)/(v.length-1):null;
    return {rttMs:mean===null?null:Math.round(mean),jitterMs:jitter===null?null:Math.round(jitter),heartbeatMissRate:s.sent?Math.round(100*s.missed/s.sent):0,
      sent:s.sent,acknowledged:s.received,missed:s.missed,transportPacketLoss:null,
      note:'Missed application heartbeat estimate; actual TCP/WebSocket packet loss is not observable here.'};}
  function forget(id){peers.delete(id);}
  return {ping,pong,sweep,report,forget};
}
