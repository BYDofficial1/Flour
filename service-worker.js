const CACHE_NAME = 'atta-chakki-hisab-v9'; // Bumped version to invalidate old cache
const CACHE_FILES = [
    // Core
    '/',
    '/index.html',
    '/index.tsx',
    '/App.tsx',
    '/types.ts',
    
    // Context
    '/context/NotificationContext.tsx',

    // Utils
    '/utils/currency.ts',
    '/utils/export.ts',
    '/utils/speech.ts',
    '/utils/supabase.ts',

    // Pages
    '/pages/CalculatorPage.tsx',
    '/pages/DashboardPage.tsx',
    '/pages/SettingsPage.tsx',
    '/pages/ReportsPage.tsx',
    '/pages/TransactionsPage.tsx',

    // Components
    '/components/BulkActionBar.tsx',
    '/components/ChangeStatusModal.tsx',
    '/components/ConfirmationModal.tsx',
    '/components/ConflictResolutionModal.tsx',
    '/components/DailySales.tsx',
    '/components/Dashboard.tsx',
    '/components/Header.tsx',
    '/components/ReminderModal.tsx',
    '/components/SalesChart.tsx',
    '/components/Sidebar.tsx',
    '/components/TimeFilterControls.tsx',
    '/components/Toast.tsx',
    '/components/TransactionForm.tsx',
    '/components/TransactionList.tsx',

    // Icons
    '/components/icons/ArrowRightLeftIcon.tsx',
    '/components/icons/BellIcon.tsx',
    '/components/icons/CalendarIcon.tsx',
    '/components/icons/CalculatorIcon.tsx',
    '/components/icons/ChartIcon.tsx',
    '/components/icons/ChartPieIcon.tsx',
    '/components/icons/CheckCircleIcon.tsx',
    '/components/icons/ClockIcon.tsx',
    '/components/icons/CloseIcon.tsx',
    '/components/icons/CogIcon.tsx',
    '/components/icons/DeleteIcon.tsx',
    '/components/icons/DocumentPlusIcon.tsx',
    '/components/icons/DocumentTextIcon.tsx',
    '/components/icons/EditIcon.tsx',
    '/components/icons/ExclamationCircleIcon.tsx',
    '/components/icons/ExportIcon.tsx',
    '/components/icons/InformationCircleIcon.tsx',
    '/components/icons/ListBulletIcon.tsx',
    '/components/icons/MenuIcon.tsx',
    '/components/icons/PlusIcon.tsx',
    '/components/icons/ReceiptIcon.tsx',
    '/components/icons/RupeeIcon.tsx',
    '/components/icons/SearchIcon.tsx',
    '/components/icons/SyncIcon.tsx',
    '/components/icons/TrendingUpIcon.tsx',
    '/components/icons/WarningIcon.tsx',
    '/components/icons/WeightIcon.tsx',
    '/components/icons/WheatIcon.tsx',
    '/components/icons/WifiIcon.tsx',

    // External CDNs
    'https://aistudiocdn.com/react@18.2.0',
    'https://aistudiocdn.com/react-dom@18.2.0/client',
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm',
    'https://aistudiocdn.com/@google/genai@^1.27.0',
    'https://cdn.tailwindcss.com',
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://cdn.jsdelivr.net/npm/date-fns@3/index.min.js',
    'https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns@3/dist/chartjs-adapter-date-fns.bundle.min.js',
];

// Install the service worker and cache assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                // Use addAll with a catch to prevent a single failed asset from breaking the entire cache
                return cache.addAll(CACHE_FILES).catch(error => {
                    console.error('Failed to cache one or more files:', error);
                });
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
     // For navigation requests, always try network first, then fallback to cache (Network-first strategy)
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request).catch(() => caches.match('/index.html'))
        );
        return;
    }

    // For other requests, use Cache-first strategy
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Cache hit - return response
                if (response) {
                    return response;
                }

                // Not in cache - fetch from network
                return fetch(event.request).then(
                    networkResponse => {
                        // Check if we received a valid response
                        if (!networkResponse || networkResponse.status !== 200 || (networkResponse.type !== 'basic' && networkResponse.type !== 'cors')) {
                            return networkResponse;
                        }
                        
                        const responseToCache = networkResponse.clone();

                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });

                        return networkResponse;
                    }
                ).catch(error => {
                    // Network fetch failed. For specific asset types, you could return a fallback.
                    console.error('Fetch failed; returning offline fallback if available.', event.request.url, error);
                    // e.g., return a fallback image: if (event.request.destination === 'image') return caches.match('/fallback-image.png');
                });
            })
    );
});