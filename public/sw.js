const CACHE_NAME = 'walls-v2'; // bump version to clear old 104MB cache
const STATIC_ASSETS = ['/', '/search'];

// Max images to keep in cache
const MAX_IMAGE_CACHE = 60;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Trim image cache to MAX_IMAGE_CACHE entries
async function trimImageCache() {
  const cache = await caches.open(CACHE_NAME);
  const keys = await cache.keys();

  // Only count image entries
  const imageKeys = keys.filter((req) => {
    const url = new URL(req.url);
    return (
      req.destination === 'image' ||
      url.hostname.includes('vercel-storage.com')
    );
  });

  if (imageKeys.length > MAX_IMAGE_CACHE) {
    // Delete oldest entries (FIFO)
    const toDelete = imageKeys.slice(0, imageKeys.length - MAX_IMAGE_CACHE);
    await Promise.all(toDelete.map((key) => cache.delete(key)));
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') return;

  // Skip Supabase API calls — never cache these
  if (url.hostname.includes('supabase.co')) return;

  // Images — Cache First with size limit
  if (
    request.destination === 'image' ||
    url.hostname.includes('vercel-storage.com')
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(request).then((cached) => {
          if (cached) return cached;
          return fetch(request).then((response) => {
            if (response.ok) {
              cache.put(request, response.clone());
              // Trim after adding new image
              trimImageCache();
            }
            return response;
          }).catch(() => cached);
        })
      )
    );
    return;
  }

  // Pages — Network First, no caching of page HTML
  // (avoids caching stale Next.js pages)
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});