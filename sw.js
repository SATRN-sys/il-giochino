'use strict';

// Bump VERSION whenever any cached file changes. Publish the whole release together.
const VERSION = 'v2';
const PREFIX = 'il-tavolo:' + self.registration.scope + ':';
const CACHE = PREFIX + VERSION;
const ASSETS = [
  './index.html', './pwa.js', './fonts.css', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png',
  './icons/icon-maskable-512.png', './icons/apple-touch-icon.png',
  './fonts/fraunces-normal-latin.woff2', './fonts/fraunces-normal-latin-ext.woff2',
  './fonts/fraunces-italic-latin.woff2', './fonts/fraunces-italic-latin-ext.woff2',
  './fonts/inter-normal-latin.woff2', './fonts/inter-normal-latin-ext.woff2',
  './fonts/ibm-plex-mono-normal-latin.woff2', './fonts/ibm-plex-mono-normal-latin-ext.woff2'
];
const SHELL = new URL('./index.html', self.registration.scope).href;

self.addEventListener('install', event => {
  // addAll is atomic: an incomplete download never replaces a working release.
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(
    ASSETS.map(path => new Request(new URL(path, self.registration.scope), {cache: 'reload'}))
  )).catch(async error => { await caches.delete(CACHE); throw error; }));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key))
  )).then(() => self.clients.claim()));
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') event.waitUntil(self.skipWaiting());
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || !url.href.startsWith(self.registration.scope)) return;
  event.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(event.request.mode === 'navigate' ? SHELL : event.request, {ignoreSearch: true});
    return cached || fetch(event.request);
  }));
});
