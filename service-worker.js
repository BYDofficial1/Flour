const CACHE_NAME = 'atta-chakki-hisab-v4'; // Bumped version to invalidate old cache
const CACHE_FILES = [
    '/',
    '/index.html',
    '/index.tsx',
    '/App.tsx',
    '/types.ts',
    '/context/NotificationContext.tsx',
    '/utils/supabase.ts',
    '/utils/currency.ts',
    '/utils/export.ts',

    '/pages/DashboardPage.tsx',
    '/pages/TransactionsPage.tsx',
    '/pages/CalculatorPage.tsx',

    '/components/Header.tsx',
    '/components/Sidebar.tsx',
    '/components/TransactionForm.tsx',
    '/components/TransactionList.tsx',
    '/components/Dashboard.tsx',
    '/components/SalesChart.tsx',
    '/components/DailySales.tsx',
    '/components/TimeFilterControls.tsx',
    '/components/ConfirmationModal.tsx',
    '/components/Toast.tsx',

    '/components/icons/CalendarIcon.tsx',
    '/components/icons/CalculatorIcon.tsx',
    '/components/icons/ChartIcon.tsx',
    '/components/icons/ChartPieIcon.tsx',
    '/components/icons/CheckCircleIcon.tsx',
    '/components/icons/ClockIcon.tsx',
    '/components/icons/CloseIcon.tsx',
    '/components/icons/DeleteIcon.tsx',
    '/components/icons/DocumentPlusIcon.tsx',
    '/components/icons/EditIcon.tsx',
    '/components/icons/ExclamationCircleIcon.tsx',
    '/components/icons/ExportIcon.tsx',
    '/components/icons/InformationCircleIcon.tsx',
    '/components/icons/ListBulletIcon.tsx',
    '/components/icons/MenuIcon.tsx',
    '/components/icons/PlusIcon.tsx',
    '/components/icons/RupeeIcon.tsx',
    '/components/icons/SearchIcon.tsx',
    '/components/icons/SyncIcon.tsx',
    '/components/icons/TrendingUpIcon.tsx',
    '/components/icons/WarningIcon.tsx',
    '/components/icons/WeightIcon.tsx',
    '/components/icons/WheatIcon.tsx',
    '/components/icons/WifiIcon.tsx',

    'https://aistudiocdn.com/react@^19.2.0',
    'https://aistudiocdn.com/react-dom@^19.2.0/',
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm',
    'https://aistudiocdn.com/@google/genai@^1.27.0',
    'https://cdn.tailwindcss.com',
    'https://cdn.jsdelivr.net/npm/chart.js',
];

// Install the service worker and cache assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(CACHE_FILES);
            })
    );
});

// Activate event: clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    return self.clients.claim();
});

// Fetch event: serve assets from cache or network
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Cache hit - return response
                if (response) {
                    return response;
                }

                // Clone the request because it's a stream and can be consumed only once
                const fetchRequest = event.request.clone();

                return fetch(fetchRequest).then(
                    response => {
                        // Check if we received a valid response
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                           // For cross-origin requests, response.type might be 'opaque'. 
                           // We only cache basic and cors responses to be safe.
                           if (response.type === 'opaque') {
                               // Can't check status of opaque responses, so we just cache them.
                           } else {
                                return response;
                           }
                        }

                        const responseToCache = response.clone();

                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    }
                );
            })
    );
});