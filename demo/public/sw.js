// TeamReel Service Worker v2
// Provides offline support and caching for the PWA
//
// Key design: Vite-hashed assets (/assets/*) are immutable-by-hash, so we use
// network-first for them. If a chunk no longer exists on the server (new deploy)
// the fetch will fail, and the app's lazyWithRetry + ErrorBoundary will trigger
// a full page reload that picks up the fresh index.html.

const CACHE_VERSION = 2;
const STATIC_CACHE_NAME = `teamreel-static-v${CACHE_VERSION}`;
const DYNAMIC_CACHE_NAME = `teamreel-dynamic-v${CACHE_VERSION}`;

// Static assets to pre-cache on install (small, rarely changing files)
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.svg',
  '/teamreel-icon.svg',
];

// Install — pre-cache static shell, activate immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate — delete ALL old caches so stale chunks are gone
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((n) => n !== STATIC_CACHE_NAME && n !== DYNAMIC_CACHE_NAME)
          .map((n) => {
            console.log('[SW] Deleting old cache:', n);
            return caches.delete(n);
          })
      )
    )
  );
  self.clients.claim();
});

// Fetch handler
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== location.origin) return;

  // ---------- HTML pages: always network-first so deploys are picked up ----------
  if (request.headers.get('accept')?.includes('text/html') || url.pathname === '/') {
    event.respondWith(networkFirst(request));
    return;
  }

  // ---------- API calls: network-first ----------
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // ---------- Vite hashed chunks (/assets/*): network-first ----------
  // These filenames contain a content-hash so they're unique per build.
  // Using network-first ensures a stale chunk is never served from cache.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // ---------- Other static assets (images, fonts, icons): cache-first ----------
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Default: network-first
  event.respondWith(networkFirst(request));
});

// ---------------------------------------------------------------------------
// Strategies
// ---------------------------------------------------------------------------
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.headers.get('accept')?.includes('text/html')) {
      return caches.match('/offline.html') || new Response('Offline', { status: 503 });
    }
    return new Response('Offline', { status: 503 });
  }
}

function isStaticAsset(pathname) {
  return /\.(png|jpe?g|gif|svg|ico|woff2?|ttf|eot|webp|avif)$/i.test(pathname);
}

// ---------------------------------------------------------------------------
// Push notifications (future)
// ---------------------------------------------------------------------------
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/teamreel-icon.svg',
      badge: '/teamreel-icon.svg',
      vibrate: [100, 50, 100],
      data: { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
