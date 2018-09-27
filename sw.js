const CACHE_NAME = 'restaurants-cache-v2';

const urlsToCache = ['/css/styles.css', '/js/main.js'];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('fetch', function(event) {
  // Chrome Devtools bugfix:
  if (event.request.cache === 'only-if-cached' && event.request.mode !== 'same-origin') return;
  // main code:
  event.respondWith(
    caches.match(event.request).then( function(response){
      if (response) return response;
      const fetchRequest = event.request.clone();
      return fetch(fetchRequest).then(
        function(response) {
          if (!response || response.status != 200 || response.type != 'basic') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(
            function(cache){
              cache.put(event.request, responseToCache);
            }
          );
          return response;
        }
      );
    })
  );
});
