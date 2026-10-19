/*
 * Hexpertify service worker. It exists so browsers can install the client portal as an app
 * (desktop / Start menu / home-screen shortcut). Requests always go to the network; page
 * loads fall back to a short offline notice when there is no connection. Nothing is cached.
 */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return;
  event.respondWith(
    fetch(event.request).catch(() =>
      new Response(
        '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
        '<title>Hexpertify</title><body style="font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;color:#334155">' +
        '<div style="text-align:center;padding:24px"><h1 style="color:#5e2be2;font-size:20px">You are offline</h1>' +
        '<p>Reconnect to the internet to open Hexpertify.</p></div></body>',
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      )
    )
  );
});
