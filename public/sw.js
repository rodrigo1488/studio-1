// Service Worker para Push Notifications
const CACHE_NAME = 'familychat-v1';
const NOTIFICATION_ICON = '/icon-192x192.png';
const NOTIFICATION_SOUND = '/notification-sound.mp3';

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  return self.clients.claim();
});

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
        image: data.image || undefined, // Large image for rich notifications
        sound: data.sound || NOTIFICATION_SOUND, // Custom sound
        data: data.data || {},
      };
      
      // Add timestamp if available
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
    // Add sound for custom notification sound
    sound: notificationData.sound || NOTIFICATION_SOUND,
  };

  // Add image for rich notifications (if available)
  if (notificationData.image) {
    notificationOptions.image = notificationData.image;
  }

  // Vibrate when notification is received (if supported)
  // Pattern: vibrate 200ms, pause 100ms, vibrate 200ms
  const vibrationPattern = [200, 100, 200];
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate(vibrationPattern);
      console.log('[Service Worker] Vibration triggered');
    } catch (error) {
      console.warn('[Service Worker] Could not vibrate:', error);
    }
  }

  // Play sound when notification is received
  // Note: Service Worker can't play audio directly, so we notify the client
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(notificationData.title, notificationOptions),
      // Notify all clients to play sound and vibrate
      clients.matchAll().then((clientList) => {
        clientList.forEach((client) => {
          client.postMessage({
            type: 'PLAY_NOTIFICATION_SOUND',
            soundUrl: notificationData.sound || NOTIFICATION_SOUND,
            vibrate: true, // Tell client to also vibrate
            vibrationPattern: vibrationPattern,
          });
        });
      }),
    ])
  );
});

// Notification click event - handle when user clicks notification
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
        // Check if there's already a window open
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // If no window is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Message event - handle messages from the app
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

