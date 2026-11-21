/* Permite instalar la app y abrirla rápido. Los datos siempre se piden en línea. */
importScripts('version.js');
var VERSION = 'iptv-' + self.APP_VERSION;
var ARCHIVOS = ['./', 'index.html', 'styles.css', 'app.js', 'logic.js', 'config.js', 'version.js', 'manifest.json', 'icons/icon-192.png'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(ARCHIVOS); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // Primero la red (para tener siempre la última versión); si no hay internet, lo guardado.
  // no-cache: pregunta siempre a GitHub si el archivo cambió (rápido si no cambió)
  e.respondWith(fetch(e.request.url, { cache: 'no-cache', credentials: 'same-origin' }).then(function (r) {
    var copia = r.clone(); caches.open(VERSION).then(function (c) { c.put(e.request, copia); }); return r;
  }).catch(function () { return caches.match(e.request); }));
});
