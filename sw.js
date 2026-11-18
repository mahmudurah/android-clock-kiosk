var CACHE_NAME = "wall-clock-v8";
var ASSETS = ["./", "./index.html", "./app.js"];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.map(function (key) {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (event) {
  var url = event.request.url;
  if (url.indexOf("config.json") !== -1 || url.indexOf("open-meteo.com") !== -1) {
    return;
  }
  event.respondWith(
    fetch(event.request, { cache: "no-store" })
      .then(function (resp) {
        var copy = resp.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(event.request, copy);
        });
        return resp;
      })
      .catch(function () {
        return caches.match(event.request);
      })
  );
});
