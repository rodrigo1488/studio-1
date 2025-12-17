// Service Worker para Push Notifications e Offline Support
const CACHE_VERSION = 'familychat-v2';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;
const API_CACHE = `${CACHE_VERSION}-api`;
const NOTIFICATION_ICON = '/icon-192x192.png';
const NOTIFICATION_SOUND = '/notification-sound.mp3';
const NOTIFICATION_SOUND_NAME = 'notification-sound.mp3';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/feed',
  NOTIFICATION_ICON,
  NOTIFICATION_SOUND,
  // Add other critical assets here
];

// Max cache sizes
const MAX_IMAGE_CACHE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_API_CACHE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_CACHE_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

// Install event - cache static resources
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...', CACHE_VERSION);
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((error) => {
        console.warn('[Service Worker] Error caching static assets:', error);
        // Continue even if some assets fail to cache
      });
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...', CACHE_VERSION);
  event.waitUntil(
    Promise.all([
      // Delete old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => !name.startsWith(CACHE_VERSION))
            .map((name) => {
              console.log('[Service Worker] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      }),
      // Clean up expired cache entries
      cleanupExpiredCache(IMAGE_CACHE),
      cleanupExpiredCache(API_CACHE),
    ])
  );
  return self.clients.claim();
});

// Clean up expired cache entries
async function cleanupExpiredCache(cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    const now = Date.now();

    for (const request of keys) {
      const response = await cache.match(request);
      if (response) {
        const cachedDate = response.headers.get('sw-cached-date');
        if (cachedDate && now - parseInt(cachedDate) > MAX_CACHE_AGE) {
          await cache.delete(request);
          console.log('[Service Worker] Deleted expired cache:', request.url);
        }
      }
    }

    // Also check cache size and remove oldest if too large
    await enforceCacheSizeLimit(cacheName);
  } catch (error) {
    console.warn('[Service Worker] Error cleaning cache:', error);
  }
}

// Enforce cache size limit by removing oldest entries
async function enforceCacheSizeLimit(cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    
    if (keys.length === 0) return;

    // Get all responses with their sizes and dates
    const entries = await Promise.all(
      keys.map(async (request) => {
        const response = await cache.match(request);
        if (!response) return null;
        
        const blob = await response.blob();
        const cachedDate = response.headers.get('sw-cached-date') || '0';
        
        return {
          request,
          size: blob.size,
          date: parseInt(cachedDate),
        };
      })
    );

    // Filter out nulls and calculate total size
    const validEntries = entries.filter((e) => e !== null);
    const totalSize = validEntries.reduce((sum, e) => sum + e.size, 0);
    
    const maxSize = cacheName === IMAGE_CACHE ? MAX_IMAGE_CACHE_SIZE : MAX_API_CACHE_SIZE;
    
    if (totalSize > maxSize) {
      // Sort by date (oldest first)
      validEntries.sort((a, b) => a.date - b.date);
      
      // Remove oldest entries until under limit
      let currentSize = totalSize;
      for (const entry of validEntries) {
        if (currentSize <= maxSize) break;
        await cache.delete(entry.request);
        currentSize -= entry.size;
        console.log('[Service Worker] Removed old cache entry:', entry.request.url);
      }
    }
  } catch (error) {
    console.warn('[Service Worker] Error enforcing cache size:', error);
  }
}

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other protocols
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Strategy: Network-First for API calls
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request, API_CACHE));
    return;
  }

  // Strategy: Cache-First for images
  if (
    request.destination === 'image' ||
    url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)
  ) {
    event.respondWith(cacheFirstStrategy(request, IMAGE_CACHE));
    return;
  }

  // Strategy: Network-First for HTML pages
  if (request.destination === 'document' || request.mode === 'navigate') {
    event.respondWith(networkFirstStrategy(request, STATIC_CACHE));
    return;
  }

  // Strategy: Cache-First for static assets (CSS, JS, fonts)
  if (
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'font'
  ) {
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
    return;
  }
});

// Network-First strategy: Try network, fallback to cache
async function networkFirstStrategy(request, cacheName) {
  try {
    const response = await fetch(request);
    
    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(cacheName);
      const responseToCache = response.clone();
      
      // Add cache date header
      const headers = new Headers(responseToCache.headers);
      headers.set('sw-cached-date', Date.now().toString());
      
      const cachedResponse = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: headers,
      });
      
      cache.put(request, cachedResponse).catch((error) => {
        console.warn('[Service Worker] Error caching response:', error);
      });
    }
    
    return response;
  } catch (error) {
    console.log('[Service Worker] Network failed, trying cache:', request.url);
    
    // Try cache
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If both fail, return offline response for navigation requests
    if (request.mode === 'navigate') {
      return new Response(
        `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Offline - FamilyChat</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body {
                font-family: system-ui, -apple-system, sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
                background: #f3f4f6;
                color: #1f2937;
              }
              .container {
                text-align: center;
                padding: 2rem;
              }
              h1 { margin: 0 0 1rem; }
              p { color: #6b7280; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Você está offline</h1>
              <p>Verifique sua conexão com a internet e tente novamente.</p>
            </div>
          </body>
        </html>
        `,
        {
          headers: { 'Content-Type': 'text/html' },
        }
      );
    }
    
    throw error;
  }
}

// Cache-First strategy: Try cache, fallback to network
async function cacheFirstStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const responseToCache = response.clone();
      
      // Add cache date header
      const headers = new Headers(responseToCache.headers);
      headers.set('sw-cached-date', Date.now().toString());
      
      const cachedResponse = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: headers,
      });
      
      cache.put(request, cachedResponse).catch((error) => {
        console.warn('[Service Worker] Error caching response:', error);
      });
    }
    
    return response;
  } catch (error) {
    console.warn('[Service Worker] Fetch failed:', error);
    throw error;
  }
}

// Push event - handle push notifications
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push received:', event);

  let notificationData = {
    title: 'FamilyChat',
    body: 'Você tem uma nova notificação',
    icon: NOTIFICATION_ICON,
    badge: NOTIFICATION_ICON,
    tag: 'notification',
    requireInteraction: false,
    data: {},
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        ...notificationData,
        title: data.title || notificationData.title,
        body: data.body || notificationData.body,
        icon: data.icon || data.senderAvatar || notificationData.icon,
        badge: data.badge || notificationData.badge,
        tag: data.tag || notificationData.tag,
        requireInteraction: data.requireInteraction || false,
        image: data.image || undefined,
        sound: data.sound || NOTIFICATION_SOUND,
        data: data.data || {},
      };
      
      if (data.data?.timestamp) {
        notificationData.data.timestamp = data.data.timestamp;
      }
    } catch (e) {
      notificationData.body = event.data.text();
    }
  }

  const notificationOptions = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    tag: notificationData.tag,
    requireInteraction: notificationData.requireInteraction,
    data: notificationData.data,
    sound: NOTIFICATION_SOUND_NAME,
  };

  if (notificationData.image) {
    notificationOptions.image = notificationData.image;
  }

  // Vibrate when notification is received
  const vibrationPattern = [200, 100, 200];
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate(vibrationPattern);
      console.log('[Service Worker] Vibration triggered');
    } catch (error) {
      console.warn('[Service Worker] Could not vibrate:', error);
    }
  }

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(notificationData.title, notificationOptions),
      clients.matchAll().then((clientList) => {
        clientList.forEach((client) => {
          client.postMessage({
            type: 'PLAY_NOTIFICATION_SOUND',
            soundUrl: notificationData.sound || NOTIFICATION_SOUND,
            vibrate: true,
            vibrationPattern: vibrationPattern,
          });
        });
      }),
    ])
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event);

  event.notification.close();

  const notificationData = event.notification.data || {};
  const urlToOpen = notificationData.url || '/';

  event.waitUntil(
    clients
      .matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      .then((clientList) => {
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Background Sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync:', event.tag);
  
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages());
  } else if (event.tag === 'sync-posts') {
    event.waitUntil(syncPosts());
  }
});

// Sync pending messages
async function syncMessages() {
  try {
    // This would read from IndexedDB and sync with server
    // Implementation depends on offline storage structure
    console.log('[Service Worker] Syncing messages...');
  } catch (error) {
    console.error('[Service Worker] Error syncing messages:', error);
  }
}

// Sync pending posts
async function syncPosts() {
  try {
    // This would read from IndexedDB and sync with server
    console.log('[Service Worker] Syncing posts...');
  } catch (error) {
    console.error('[Service Worker] Error syncing posts:', error);
  }
}

// Message event - handle messages from the app
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data && event.data.type === 'CACHE_URLS') {
    // Cache specific URLs on demand
    event.waitUntil(
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.addAll(event.data.urls);
      })
    );
  } else if (event.data && event.data.type === 'CLEAR_CACHE') {
    // Clear specific cache
    event.waitUntil(
      caches.delete(event.data.cacheName).then(() => {
        return event.ports[0].postMessage({ success: true });
      })
    );
  }
});
