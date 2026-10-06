'use strict';
// Bump APP_VERSION in both this file and index.html for every published build.
const APP_VERSION = '2026.10.06.2';
const SCOPE = self.registration.scope;
const CACHE_PREFIX = 'three-list-calculator:' + new URL(SCOPE).pathname + ':';
const CACHE_NAME = CACHE_PREFIX + APP_VERSION;
const APP_SHELL = new URL('index.html', SCOPE).href;
const ASSETS = ['index.html', 'manifest.webmanifest', 'icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png'].map(path => new URL(path, SCOPE).href);
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    // Fetch everything before writing: incomplete releases must not replace a working app.
    const entries = await Promise.all(ASSETS.map(async url => {
      const response = await fetch(new Request(url, {cache: 'reload'}));
      if (!response.ok || response.type === 'opaque') throw new Error('Offline asset unavailable');
      if (url === APP_SHELL && !(await response.clone().text()).includes('data-app-build="' + APP_VERSION + '"')) throw new Error('App shell version mismatch');
      return [url, response];
    }));
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(entries.map(([url, response]) => cache.put(url, response)));
    // A later version waits until the user chooses Update or all old windows close.
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') event.waitUntil(self.skipWaiting());
});
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== new URL(SCOPE).origin) return;
  const appPath = new URL(SCOPE).pathname;
  const navigation = request.mode === 'navigate' && (url.pathname === appPath || url.pathname === new URL(APP_SHELL).pathname);
  const asset = ASSETS.includes(url.href);
  if (!navigation && !asset) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    return (await cache.match(navigation ? APP_SHELL : url.href)) || fetch(request);
  })());
});
