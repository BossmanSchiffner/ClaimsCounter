/* Cache app shell only, NEVER the photos, claim data, or exports. */
const CACHE='fieldcount-shell-v02';
const SHELL=['./','./index.html','./styles.css','./src/app.js','./src/db.js','./src/core.js','./src/export.js','./src/zip.js','./manifest.webmanifest','./icons/icon.svg','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(Promise.all([caches.keys().then(k=>Promise.all(k.filter(n=>n.startsWith('fieldcount-shell-')&&n!==CACHE).map(n=>caches.delete(n)))),self.clients.claim()])));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==location.origin||!SHELL.some(p=>new URL(p,location.href).pathname===u.pathname))return;e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request)))});
