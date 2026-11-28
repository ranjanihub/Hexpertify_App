/*
 * Hexpertify service worker. It lets browsers install the client portal as an app and
 * shows booking status push notifications. Requests always go to the network; page
 * loads fall back to the offline page (/offline.html, same design as the 404) when there is
 * no connection. Only that page and its logo are cached.
 */
const OFFLINE_CACHE = 'hx-offline-v1';
const OFFLINE_PAGE = '/offline.html';
const OFFLINE_ASSETS = [OFFLINE_PAGE, '/expertify-logo.png'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  // A failed download never blocks the update: the plain notice below is used instead
  event.waitUntil(
    caches.open(OFFLINE_CACHE).then((cache) => cache.addAll(OFFLINE_ASSETS)).catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('hx-offline-') && k !== OFFLINE_CACHE).map((k) => caches.delete(k))))
      .catch(() => {})
      .then(() => self.clients.claim())
  );
});

const plainOfflineNotice = () =>
  new Response(
    '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Hexpertify</title><body style="font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;color:#334155">' +
    '<div style="text-align:center;padding:24px"><h1 style="color:#5e2be2;font-size:20px">You are offline</h1>' +
    '<p>Reconnect to the internet to open Hexpertify.</p></div></body>',
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE_PAGE, { cacheName: OFFLINE_CACHE })
          .then((page) => page || plainOfflineNotice())
          .catch(plainOfflineNotice)
      )
    );
    return;
  }

  // The offline page's logo: from the network, or the cached copy when offline
  const url = new URL(request.url);
  if (url.origin === self.location.origin && OFFLINE_ASSETS.includes(url.pathname)) {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(url.pathname, { cacheName: OFFLINE_CACHE }).then((hit) => hit || Response.error())
      )
    );
  }
});

// Booking status push notifications (confirmed / rescheduled / cancelled / completed)
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Hexpertify', {
      body: data.body || 'You have a booking update.',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag,
      renotify: Boolean(data.tag),
      data: { url: data.url || '/client/sessions' }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || '/client', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const existing = windows.find((w) => w.url.startsWith(self.location.origin));
      if (existing) {
        return existing.focus().then(() => existing.navigate(target));
      }
      return self.clients.openWindow(target);
    })
  );
});
