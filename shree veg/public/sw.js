// Shree Pure Veg - Staff PWA Service Worker
// Version: 1.0.0

const CACHE_NAME = 'shree-veg-staff-v1';
const OFFLINE_FALLBACK_URL = '/offline.html';

const PRECACHE_ASSETS = [
  '/',
  '/admin',
  '/offline.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/badge-72.png',
  '/icons/icon.svg',
  '/favicon.ico',
];

// Install Event - Pre-cache offline assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.warn('[SW] Precache failed:', err);
      })
  );
});

// Activate Event - Clean old caches & claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => {
            if (name !== CACHE_NAME) {
              return caches.delete(name);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch Event - Network first with offline fallback
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Avoid intercepting API routes or Supabase realtime websockets
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/rest/v1')) {
    return;
  }

  // Handle navigation requests (page visits)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          // Clone and cache the successful response
          if (networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(async () => {
          // Network failed, check cache
          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) return cachedResponse;

          // Return offline fallback page
          const fallback = await caches.match(OFFLINE_FALLBACK_URL);
          if (fallback) return fallback;

          return new Response(
            '<html><body><h1>Offline</h1><p>कृपया इंटरनेट तपासा (Check connection)</p></body></html>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        })
    );
    return;
  }

  // Static assets: Cache first with network fallback
  if (
    url.pathname.startsWith('/icons/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.webmanifest')
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return (
          cached ||
          fetch(event.request).then((networkResponse) => {
            if (networkResponse.status === 200) {
              const copy = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
            }
            return networkResponse;
          })
        );
      })
    );
  }
});

// ==============================================================================
// WEB PUSH NOTIFICATION HANDLER (VAPID)
// ==============================================================================
self.addEventListener('push', (event) => {
  let payload = {
    title: 'श्री प्युअर व्हेज: नवीन आरक्षण! 🔔',
    body: 'नवीन ग्राहक आरक्षण प्राप्त झाले आहे. कृपया स्वीकारा किंवा नकारा.',
    url: '/admin',
    tokenNumber: 'SV-LIVE',
    tag: 'shree-veg-booking',
  };

  if (event.data) {
    try {
      const data = event.data.json();
      payload = { ...payload, ...data };
    } catch {
      payload.body = event.data.text() || payload.body;
    }
  }

  const notificationOptions = {
    body: payload.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    tag: payload.tag || 'shree-veg-new-booking',
    vibrate: [300, 150, 300, 150, 600],
    requireInteraction: true,
    renotify: true,
    data: {
      url: payload.url || '/admin',
      tokenNumber: payload.tokenNumber,
      bookingId: payload.bookingId,
    },
    actions: [
      { action: 'open', title: 'पहा (View Details)' },
      { action: 'dismiss', title: 'बंद करा (Dismiss)' },
    ],
  };

  // Broadcast to open browser windows so page can trigger in-app looping chime immediately
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(payload.title, notificationOptions),
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'PUSH_NEW_BOOKING',
            payload,
          });
        });
      }),
    ])
  );
});

// Notification Click Handler - Open or focus /admin
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const targetUrl = (event.notification.data && event.notification.data.url) || '/admin';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/admin') && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
