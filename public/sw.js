const STATIC_CACHE='khidma-static-v62';
const BIBLE_CACHE='khidma-bible-text-v62';
const API_PREFIXES=['/rest/','/auth/','/storage/','/functions/'];
self.addEventListener('install',e=>e.waitUntil(caches.open(STATIC_CACHE).then(c=>c.add('/index.html')).catch(()=>{})).then(()=>self.skipWaiting()));
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  const u=new URL(e.request.url);
  if(u.origin!==location.origin) return;
  if(API_PREFIXES.some(p=>u.pathname.startsWith(p))) return;
  if(u.pathname==='/bible.json'||u.pathname==='/bible-manifest.json'){
    e.respondWith(caches.open(BIBLE_CACHE).then(async c=>{
      const hit=await c.match(e.request); if(hit)return hit;
      try{const res=await fetch(e.request); if(res.ok)c.put(e.request,res.clone()); return res;}catch{return hit||new Response('',{status:503});}
    }));
    return;
  }
  if(e.request.mode==='navigate'){
    e.respondWith(fetch(e.request).then(res=>{if(res.ok)caches.open(STATIC_CACHE).then(c=>c.put('/index.html',res.clone()));return res;}).catch(()=>caches.match('/index.html')));
    return;
  }
  e.respondWith(caches.open(STATIC_CACHE).then(async c=>{
    const hit=await c.match(e.request); if(hit)return hit;
    try{const res=await fetch(e.request); if(res.ok)c.put(e.request,res.clone()); return res;}catch{return hit||new Response('',{status:503});}
  }));
});
