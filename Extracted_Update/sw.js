const CACHE_NAME = 'koi-garden-v2';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/icon.svg',
    '/manifest.json'
];

self.addEventListener('install', (event) => {
    // Force new service worker to activate immediately
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

self.addEventListener('activate', (event) => {
    // Claim clients immediately so the new SW controls the page
    event.waitUntil(clients.claim());
    // Cleanup old caches
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', (event) => {
    // Network First Strategy
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // If network fetch succeeds, cache it (optional, but good for offline consistency)
                // For simplicity here, just returning network response.
                // Or we can just return fetch(event.request) directly.
                return response;
            })
            .catch(() => {
                // If network fails (offline), try cache
                return caches.match(event.request);
            })
    );
});
