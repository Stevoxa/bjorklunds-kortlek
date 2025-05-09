const CACHE_NAME = 'bjorklunds-kortlek-cache-v2'; // Öka version om du gör ändringar i cachade filer
const urlsToCache = [
    './', 
    './index.html', 
    './icon-192x192.png',
    './icon-512x512.png'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('ServiceWorker: Opened cache');
                return cache.addAll(urlsToCache);
            })
            .catch(error => {
                console.error('ServiceWorker: Failed to cache during install:', error);
            })
    );
});

self.addEventListener('fetch', event => {
    // Vi vill inte cacha API-anrop eller externa resurser om de skulle finnas
    // Denna app har inga just nu, men bra att ha i åtanke.
    // Röstigenkänning är ett webbläsar-API, inte ett nätverksanrop som cachas här.
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response; // Return from cache
                }
                // Viktigt: Klona request. En request är en stream och kan bara konsumeras en gång.
                // Vi behöver en för cachen och en för webbläsaren att skicka.
                let fetchRequest = event.request.clone();

                return fetch(fetchRequest).then(
                    networkResponse => {
                        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                            return networkResponse; // Return non-cacheable response
                        }

                        // Viktigt: Klona response. En response är en stream och kan bara konsumeras en gång.
                        let responseToCache = networkResponse.clone();

                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });

                        return networkResponse;
                    }
                ).catch(error => {
                    console.log('ServiceWorker: Fetch failed, returning offline page or error for:', event.request.url, error);
                    // Här skulle man kunna returnera en fallback offline-sida om man hade en
                    // return caches.match('./offline.html'); 
                });
            })
    );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME]; // Behåll bara den nuvarande cachen
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('ServiceWorker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});