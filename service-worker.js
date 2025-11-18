const CACHE_NAME = 'shopping-list-app-v1';
// Lista de arquivos e URLs externas essenciais para o funcionamento offline
const urlsToCache = [
    './',
    './index.html',
    './manifest.json',
    'https://cdn.tailwindcss.com',
    'https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap',
    // Dependências externas do Firebase e jspdf
    'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js',
    'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js',
    'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

// Instalação: Cache dos arquivos estáticos da shell
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Arquivos em cache.');
                return cache.addAll(urlsToCache);
            })
    );
    self.skipWaiting(); // Força o novo Service Worker a assumir o controle imediatamente
});

// Ativação: Limpeza de caches antigos
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        // Deleta caches que não estão na lista branca
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    return self.clients.claim();
});

// Fetch: Estratégia Cache-First (tentar cache, depois rede)
self.addEventListener('fetch', event => {
    // Ignora requisições do Firebase Firestore e Google Fonts API (não devem ser cacheadas pelo SW)
    if (event.request.url.includes('firestore.googleapis.com') || 
        event.request.url.includes('firebaseremoteconfig.googleapis.com') ||
        event.request.url.includes('fonts.googleapis.com')) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Retorna a versão em cache se existir
                if (response) {
                    return response;
                }
                
                // Se não estiver no cache, faz a requisição normal
                return fetch(event.request).then(
                    function(response) {
                        // Verifica se recebemos uma resposta válida
                        if(!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        
                        // Clona a resposta para o cache
                        const responseToCache = response.clone();
                        
                        // Cacheia o novo recurso (incluindo dependências JS/CSS)
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });
                        
                        return response;
                    }
                );
            })
            .catch(() => {
                console.log('Service Worker: Falha na requisição, servindo conteúdo em cache se disponível.');
            })
    );
});
