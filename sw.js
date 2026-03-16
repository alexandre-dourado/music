// Service Worker — Fantasma PWA
const CACHE = 'fantasma-v3';

// Instala sem pre-cache (evita o erro de addAll com arquivos ausentes)
self.addEventListener('install', e => {
  self.skipWaiting();
});

// Ativa e limpa caches antigos
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: network first, cache fallback
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // Nunca cacheia chamadas ao GAS ou Drive
  if (
    url.hostname.includes('script.google.com') ||
    url.hostname.includes('drive.google.com') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.hostname.includes('cdnjs.cloudflare.com')
  ) {
    return; // deixa o browser lidar normalmente
  }

  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Só cacheia respostas válidas
        if (res && res.status === 200 && res.type !== 'opaque') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => {
        // Fallback: tenta o cache
        return caches.match(e.request).then(cached => {
          if (cached) return cached;
          // Se for navegação, mostra offline
          if (e.request.mode === 'navigate') {
            return caches.match('./offline.html');
          }
        });
      })
  );
});
