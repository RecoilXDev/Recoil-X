const scope=new URL(self.registration.scope);
const prefix='recoil-x-shell:'+scope.pathname+':';
const cacheName=prefix+'z3-1';
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

self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==scope.origin)return;
  if(request.mode==='navigate'&&shellPaths.has(url.pathname)){
    event.respondWith(fetch(request).catch(async()=>
      (await caches.open(cacheName)).match(shell).then(response=>response||Response.error())));
  }else if(assets.includes(url.href)){
    event.respondWith(fetch(request).catch(async()=>
      (await caches.open(cacheName)).match(url.href).then(response=>response||Response.error())));
  }
});
