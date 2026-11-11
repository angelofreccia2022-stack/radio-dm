// Service worker minimo per ASIA.
// Scopo: rendere l'app installabile (PWA) e velocizzare i caricamenti
// successivi mettendo in cache i file dell'interfaccia (lo "shell").
// La ricerca musicale e la conversazione richiedono comunque internet:
// questo SW non tenta di far funzionare tutto offline.

const CACHE_NAME = 'asia-shell-v2'; // v2 (11/11/2026): non salva più le pagine di errore (404)
const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((nomi) =>
      Promise.all(
        nomi.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      )
    ).then(() => self.clients.claim())
  );
});

// Strategia: "network first" per index.html (per avere sempre l'ultima
// versione quando c'è internet), "cache first" per il resto dello shell.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const isShellFile = SHELL_FILES.some((f) => url.pathname.endsWith(f.replace('./', '')));

  if (url.pathname.endsWith('index.html') || url.pathname.endsWith('/')) {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          // Salva in memoria solo le pagine buone: mai un 404 o altri errori.
          if (resp && resp.ok) {
            const copia = resp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copia));
          }
          return resp;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  if (isShellFile) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req))
    );
  }
  // Tutte le altre richieste (YouTube, Gemini, ecc.) vanno dritte in rete.
});
