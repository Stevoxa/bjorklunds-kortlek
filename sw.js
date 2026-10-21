// Höj versionen när listan nedan ändras, så att gamla cachar rensas.
const CACHE_PREFIX = 'bjorklunds-kortlek-';
const CACHE_NAME = `${CACHE_PREFIX}cache-v3`;
const PRECACHE_URLS = [
    './',
    './index.html',
    './passes.js',
    './manifest.json',
    './icon-192x192.png',
    './icon-512x512.png'
];
const QRIOUS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/qrious/4.0.2/qrious.min.js';
// Svag täckning i skogen: vänta så här länge på nätet innan cachen används.
const NETWORK_TIMEOUT_MS = 3000;

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(async cache => {
            // cache: 'reload' går förbi webbläsarens HTTP-cache så att alla filer kommer från samma version.
            await cache.addAll(PRECACHE_URLS.map(url => new Request(url, { cache: 'reload' })));
            // QR-biblioteket behövs bara för Dela-funktionen, så installationen får inte fallera på det.
            try {
                await cache.add(QRIOUS_URL);
            } catch (error) {
                console.warn('ServiceWorker: Kunde inte cacha QR-biblioteket:', error);
            }
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    // Alla GitHub Pages-projekt delar ursprunget stevoxa.github.io, så bara appens egna cachar rensas.
    event.waitUntil(
        caches.keys()
            .then(cacheNames => Promise.all(
                cacheNames
                    .filter(cacheName => cacheName.startsWith(CACHE_PREFIX) && cacheName !== CACHE_NAME)
                    .map(cacheName => caches.delete(cacheName))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const request = event.request;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    if (url.origin === self.location.origin) {
        // Navigeringar sparas under index.html så att varje ?team=-länk inte får en egen kopia.
        const cacheKey = request.mode === 'navigate' ? './index.html' : request;
        const networkFetch = fetch(request).then(async response => {
            if (response.ok && response.type === 'basic') {
                const cache = await caches.open(CACHE_NAME);
                await cache.put(cacheKey, response.clone()).catch(() => {});
            }
            return response;
        });
        // Låt cache-uppdateringen bli klar även om svaret redan tagits från cachen.
        event.waitUntil(networkFetch.catch(() => {}));
        event.respondWith(networkFirst(cacheKey, networkFetch));
    } else if (request.url === QRIOUS_URL) {
        event.respondWith(cacheFirst(request));
    }
    // Övriga externa anrop (t.ex. Google Analytics) hanteras av webbläsaren som vanligt.
});

// Egna filer: senaste versionen från nätet, med cachen som reserv offline eller vid långsamt nät.
async function networkFirst(cacheKey, networkFetch) {
    const cached = await caches.match(cacheKey);
    if (!cached) {
        try {
            return await networkFetch;
        } catch (error) {
            return Response.error();
        }
    }
    const timeout = new Promise(resolve => setTimeout(() => resolve(cached), NETWORK_TIMEOUT_MS));
    return Promise.race([networkFetch.catch(() => cached), timeout]);
}

async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone()).catch(() => {});
    }
    return response;
}
