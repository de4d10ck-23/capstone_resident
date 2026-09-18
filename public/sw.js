// WaterWatch Resident Portal - Service Worker
const CACHE_NAME = 'waterwatch-resident-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/images/favicon.ico',
  '/images/logo/logo-circled1.png'
];

// Install: pre-cache critical shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Cache addAll warning:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches & claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: network first with cache fallback
self.addEventListener('fetch', (event) => {
  // Only handle GET requests for same-origin or static assets
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip caching API calls to ensure real-time water data
  if (url.pathname.startsWith('/api') || url.hostname.includes('supabase')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

// Push: handle incoming web push notifications from backend
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'WaterWatch Advisory', body: event.data.text() };
    }
  }

  const title = data.title || 'WaterWatch Health Advisory';
  const options = {
    body: data.body || data.message || 'An official water safety alert has been broadcasted for your barangay.',
    icon: data.icon || '/images/logo/logo-circled1.png',
    badge: '/images/favicon.ico',
    tag: data.tag || 'waterwatch-alert',
    renotify: true,
    vibrate: [250, 100, 250, 100, 250],
    data: {
      url: data.url || '/portal/notifications',
      timestamp: data.timestamp || Date.now(),
      id: data.id,
    },
    actions: [
      { action: 'open', title: 'View Advisory' },
      { action: 'close', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification Click: Focus existing window or open target notification URL
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  const targetPath = event.notification.data?.url || '/portal/notifications';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a window is already open, focus it and navigate
      for (const client of windowClients) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) {
            return client.navigate(targetPath);
          }
          return;
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetPath);
      }
    })
  );
});
