const CACHE_NAME = 'atta-chakki-hisab-v16'; // Bumped version for new auth flow
const CACHE_FILES = [
    // Core
    '/',
    '/index.html',
    '/index.tsx',
    '/App.tsx',
    '/types.ts',
    
    // Auth
    '/utils/supabase.ts',
    
    // Context
    '/context/NotificationContext.tsx',

    // Utils
    '/utils/currency.ts',
    '/utils/error.ts',
    '/utils/export.ts',
    '/utils/sound.ts',

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
    '/components/DailySales.tsx',
    '/components/Dashboard.tsx',
    '/components/Header.tsx',
    '/components/ReminderModal.tsx',
    '/components/SalesChart.tsx',
    '/components/Sidebar.tsx',
    '/components/SortControls.tsx',
    '/components/TimeFilterControls.tsx',
    '/components/Toast.tsx',
    '/components/TransactionForm.tsx',
    '/components/TransactionList.tsx',

    // Icons
    '/components/icons/ArrowsUpDownIcon.tsx',
    '/components/icons/BellIcon.tsx',
    '/components/icons/CalendarIcon.tsx',
    '/components/icons/CalculatorIcon.tsx',
    '/components/icons/CameraIcon.tsx',
    '/components/icons/ChartIcon.tsx',
    '/components/icons/ChartPieIcon.tsx',
    '/components/icons/CheckCircleIcon.tsx',
    '/components/icons/ChevronDownIcon.tsx',
    '/components/icons/ClockIcon.tsx',
    '/components/icons/CloseIcon.tsx',
    '/components/icons/CogIcon.tsx',
    '/components/icons/DeleteIcon.tsx',
    '/components/icons/DocumentPlusIcon.tsx',
    '/components/icons/DocumentTextIcon.tsx',
    '/components/icons/DotsVerticalIcon.tsx',
    '/components/icons/EditIcon.tsx',
    '/components/icons/ExclamationCircleIcon.tsx',
    '/components/icons/ExportIcon.tsx',
    '/components/icons/InformationCircleIcon.tsx',
    '/components/icons/ListBulletIcon.tsx',
    '/components/icons/LogoutIcon.tsx',
    '/components/icons/MenuIcon.tsx',
    '/components/icons/PlusIcon.tsx',
    '/components/icons/ReceiptIcon.tsx',
    '/components/icons/RupeeIcon.tsx',
    '/components/icons/SearchIcon.tsx',
    '/components/icons/SortIcon.tsx',
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

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(CACHE_FILES).catch(error => {
                    console.error('Failed to cache one or more files:', error);
                });
            })
    );
});

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

self.addEventListener('fetch', event => {
    // For navigation requests, use a network-first strategy.
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request).catch(() => caches.match('/index.html'))
        );
        return;
    }

    // For other requests (CSS, JS, images), use a cache-first strategy.
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                return fetch(event.request).then(
                    networkResponse => {
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
                    console.error('Fetch failed; returning offline fallback if available.', event.request.url, error);
                });
            })
    );
});