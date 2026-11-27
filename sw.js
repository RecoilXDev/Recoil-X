const scope=new URL(self.registration.scope);
const prefix='recoil-x-shell:'+scope.pathname+':';
const cacheName=prefix+'recoil-city-3d-radio-update-a4-evolution3';
const shell=new URL('index.html',scope).href;
const assets=['index.html','manifest.webmanifest','recoil-icon-192.png','recoil-icon-512.png',
  'server/recoil-city-world.js','server/recoil-city-view.js','server/recoil-city-radio.js','server/city-radio/tracks.json',
  'server/city-radio/Welcome_to_Recoil_City.mp3','server/city-radio/47_menu.mp3','server/recoil-city.js','server/recoil-city-cover.webp']
  .map(path=>new URL(path,scope).href);
const shellPaths=new Set([scope.pathname,new URL(shell).pathname]);

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(cacheName).then(cache=>
    cache.addAll(assets.map(url=>new Request(url,{cache:'reload'}))).then(()=>self.skipWaiting?.())));
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    for(const key of await caches.keys())if(key.startsWith(prefix)&&key!==cacheName)await caches.delete(key);
    await self.clients.claim();
  })());
});

async function stored(url){
  try{return await (await caches.open(cacheName)).match(url);}
  catch{return undefined;}
}

function navigate(event,url){
  const online=fetch(event.request);
  if(!url.search){
    event.waitUntil(online.then(async response=>{
      if(!response.ok||response.redirected||!/^text\/html\b/i.test(response.headers.get('Content-Type')||''))return;
      const copy=response.clone();
      await (await caches.open(cacheName)).put(shell,copy);
    }).catch(()=>{}));
  }
  event.respondWith(online.then(
    async response=>response.status>=500?(await stored(shell))||response:response,
    async ()=>(await stored(shell))||Response.error()
  ));
}

self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==scope.origin)return;
  if(request.mode==='navigate'&&shellPaths.has(url.pathname)){
    navigate(event,url);
  }else if(assets.includes(url.href)&&url.pathname.endsWith('.mp3')){
    event.respondWith(fetch(request).catch(async()=>{
      const recording=await stored(url.href);if(!recording)return Response.error();
      const range=request.headers.get('Range');if(!range)return recording;
      const bytes=await recording.arrayBuffer(),size=bytes.byteLength;
      const m=/^bytes=(\d*)-(\d*)$/.exec(range);
      if(!m||(!m[1]&&!m[2]))return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+size}});
      const start=m[1]?Number(m[1]):Math.max(0,size-Number(m[2]));
      const end=m[1]&&m[2]?Math.min(size-1,Number(m[2])):size-1;
      if(start>end)return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+size}});
      return new Response(bytes.slice(start,end+1),{status:206,headers:{'Content-Type':'audio/mpeg','Accept-Ranges':'bytes',
        'Content-Length':end-start+1,'Content-Range':'bytes '+start+'-'+end+'/'+size}});
    }));
  }else if(assets.includes(url.href)){
    event.respondWith(fetch(request).catch(async()=>(await stored(url.href))||Response.error()));
  }
});
