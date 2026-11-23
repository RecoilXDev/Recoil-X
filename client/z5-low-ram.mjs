// RECOIL X Z.5 bounded lazy asset cache. Call dispose() for GPU textures/geometries.
export function createLowRamAssetCache({maxEntries=12,maxBytes=24*1024*1024,dispose=()=>{}}={}){
  if(!Number.isInteger(maxEntries)||maxEntries<1||!Number.isFinite(maxBytes)||maxBytes<1)throw Error('Invalid cache limits');
  const cache=new Map();let bytes=0;
  function evict(){while(cache.size>maxEntries||bytes>maxBytes){const [key,entry]=cache.entries().next().value;cache.delete(key);bytes-=entry.bytes;dispose(entry.value,key);}}
  async function load(key,loader,{bytes:estimated=0}={}){if(cache.has(key)){const e=cache.get(key);cache.delete(key);cache.set(key,e);return e.value;}
    if(typeof loader!=='function')throw TypeError('loader must be a function');
    const value=await loader();const cost=Math.max(0,Number.isFinite(estimated)?estimated:0);
    if(cost>maxBytes){dispose(value,key);return value;}
    cache.set(key,{value,bytes:cost});bytes+=cost;evict();return value;
  }
  function clear(){for(const [key,e] of cache)dispose(e.value,key);cache.clear();bytes=0;}
  function stats(){return {entries:cache.size,estimatedBytes:bytes,maxBytes,maxEntries};}
  return {load,clear,stats};
}
