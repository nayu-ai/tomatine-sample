/**
 * Service Worker for Tomatine PWA
 * Handles offline functionality and caching
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const CACHE_NAME = 'tomatine-v1.0.0';
const STATIC_CACHE_NAME = 'tomatine-static-v1.0.0';
const DYNAMIC_CACHE_NAME = 'tomatine-dynamic-v1.0.0';

// Files to cache immediately
const STATIC_FILES = [
  '/',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  // Next.js static files will be added dynamically
];

// Files that should always be fetched from network first
const NETWORK_FIRST_ROUTES = ['/api/'];

// Files that should be served from cache first
const CACHE_FIRST_ROUTES = [
  '/_next/static/',
  '/static/',
  '.js',
  '.css',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.svg',
  '.woff',
  '.woff2',
];

self.addEventListener('install', event => {
  // eslint-disable-next-line no-console
  console.log('[SW] Install event');

  event.waitUntil(
    caches
      .open(STATIC_CACHE_NAME)
      .then(cache => {
        console.log('[SW] Pre-caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .catch(err => {
        console.error('[SW] Failed to pre-cache static files:', err);
      })
  );

  // Force activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  // eslint-disable-next-line no-console
  console.log('[SW] Activate event');

  event.waitUntil(
    caches
      .keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            // Delete old caches
            if (
              cacheName !== STATIC_CACHE_NAME &&
              cacheName !== DYNAMIC_CACHE_NAME &&
              cacheName.startsWith('tomatine-')
            ) {
              // eslint-disable-next-line no-console
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // eslint-disable-next-line no-console
        console.log('[SW] Service worker activated');
        return self.clients.claim();
      })
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip Chrome extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // Handle different types of requests
  if (shouldUseNetworkFirst(request)) {
    event.respondWith(networkFirst(request));
  } else if (shouldUseCacheFirst(request)) {
    event.respondWith(cacheFirst(request));
  } else {
    event.respondWith(staleWhileRevalidate(request));
  }
});

/**
 * Check if request should use network-first strategy
 */
function shouldUseNetworkFirst(request) {
  const url = request.url;
  return NETWORK_FIRST_ROUTES.some(route => url.includes(route));
}

/**
 * Check if request should use cache-first strategy
 */
function shouldUseCacheFirst(request) {
  const url = request.url;
  return CACHE_FIRST_ROUTES.some(route => url.includes(route));
}

/**
 * Network first strategy - try network, fallback to cache
 */
async function networkFirst(request) {
  try {
    const response = await fetch(request);

    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('[SW] Network failed, trying cache:', request.url);
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/');
    }

    throw error;
  }
}

/**
 * Cache first strategy - try cache, fallback to network
 */
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const response = await fetch(request);

    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[SW] Cache first failed:', request.url, error);
    throw error;
  }
}

/**
 * Stale while revalidate strategy - serve from cache, update in background
 */
async function staleWhileRevalidate(request) {
  const cachedResponse = await caches.match(request);

  const fetchPromise = fetch(request)
    .then(response => {
      if (response.ok) {
        const cache = caches.open(DYNAMIC_CACHE_NAME);
        cache.then(c => c.put(request, response.clone()));
      }
      return response;
    })
    .catch(() => {
      // eslint-disable-next-line no-console
      console.log('[SW] Network failed for:', request.url);
      return cachedResponse;
    });

  return cachedResponse || fetchPromise;
}

/**
 * Handle background sync for offline actions
 */
self.addEventListener('sync', event => {
  // eslint-disable-next-line no-console
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'session-sync') {
    event.waitUntil(syncSessions());
  }
});

/**
 * Sync offline session data when back online
 */
async function syncSessions() {
  try {
    // This would sync with a backend if we had one
    // For now, just log that sync would happen
    // eslint-disable-next-line no-console
    console.log('[SW] Would sync offline session data');

    // Send message to client that sync completed
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        payload: { success: true },
      });
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[SW] Session sync failed:', error);
  }
}

/**
 * Handle push notifications (future feature)
 */
self.addEventListener('push', event => {
  // eslint-disable-next-line no-console
  console.log('[SW] Push received:', event.data?.text());

  const options = {
    body: event.data?.text() || 'Timer notification',
    icon: '/next.svg',
    badge: '/next.svg',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 'timer-notification',
    },
    actions: [
      {
        action: 'open',
        title: '開く',
        icon: '/next.svg',
      },
      {
        action: 'close',
        title: '閉じる',
      },
    ],
  };

  event.waitUntil(self.registration.showNotification('Tomatine', options));
});

/**
 * Handle notification clicks
 */
self.addEventListener('notificationclick', event => {
  // eslint-disable-next-line no-console
  console.log('[SW] Notification click:', event.action);

  event.notification.close();

  if (event.action === 'open' || !event.action) {
    event.waitUntil(clients.openWindow('/'));
  }
});

/**
 * Handle messages from client
 */
self.addEventListener('message', event => {
  // eslint-disable-next-line no-console
  console.log('[SW] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CACHE_SESSION') {
    // Cache session data for offline use
    const sessionData = event.data.payload;
    console.log('[SW] Caching session data:', sessionData);
  }
});
