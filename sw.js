const scope=new URL(self.registration.scope);
const prefix='recoil-x-shell:'+scope.pathname+':';
const cacheName=prefix+'ascension-1';
const shell=new URL('index.html',scope).href;
const assets=['index.html','manifest.webmanifest','recoil-icon-192.png','recoil-icon-512.png']
  .map(path=>new URL(path,scope).href);
const shellPaths=new Set([scope.pathname,new URL(shell).pathname]);

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(cacheName).then(cache=>
    cache.addAll(assets.map(url=>new Request(url,{cache:'reload'})))));
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
  }else if(assets.includes(url.href)){
    event.respondWith(fetch(request).catch(async()=>(await stored(url.href))||Response.error()));
  }
});
