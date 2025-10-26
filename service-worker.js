const CACHE_NAME = 'atta-chakki-hisab-v20'; // Bumped version for dashboard/report enhancements
const CACHE_FILES = [
    // Core
    '/',
    '/index.html',
    '/index.tsx',
    '/App.tsx',
    '/types.ts',
    
    // Auth & Security
    '/utils/supabase.ts',
    '/components/AuthModal.tsx',
    '/components/SecuritySetupModal.tsx',
    '/components/ChangePinModal.tsx',
    '/pages/AuthPage.tsx',
    '/utils/security.ts',
    
    // Context
    '/context/NotificationContext.tsx',

    // Utils
    '/utils/currency.ts',
    '/utils/error.ts',
    '/utils/export.ts',
    '/utils/sound.ts',
    '/utils/push.ts',

    // Pages
    '/pages/CalculatorPage.tsx',
    '/pages/DashboardPage.tsx',
    '/pages/ExpensesPage.tsx',
    '/pages/ManagementPage.tsx',
    '/pages/ReportsPage.tsx',
    '/pages/SettingsPage.tsx',
    '/pages/TransactionsPage.tsx',

    // Components
    '/components/Avatar.tsx',
    '/components/ChangeStatusModal.tsx',
    '/components/ConfirmationModal.tsx',
    '/components/ConflictResolutionModal.tsx',
    '/components/DailySales.tsx',
    '/components/Dashboard.tsx',
    '/components/ExpenseBreakdownChart.tsx',
    '/components/ExpenseCategoryManagement.tsx',
    '/components/ExpenseForm.tsx',
    '/components/ExpenseList.tsx',
    '/components/Header.tsx',
    '/components/Navigation.tsx',
    '/components/ReminderModal.tsx',
    '/components/SalesChart.tsx',
    '/components/Sidebar.tsx',
    '/components/SortControls.tsx',
    '/components/TimeFilterControls.tsx',
    '/components/Toast.tsx',
    '/components/TransactionForm.tsx',
    '/components/TransactionList.tsx',

    // Icons
    '/components/icons/ArrowRightLeftIcon.tsx',
    '/components/icons/ArrowTrendingDownIcon.tsx',
    '/components/icons/ArrowTrendingUpIcon.tsx',
    '/components/icons/ArrowsUpDownIcon.tsx',
    '/components/icons/BellIcon.tsx',
    '/components/icons/CalculatorIcon.tsx',
    '/components/icons/CalendarIcon.tsx',
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
    '/components/icons/EyeIcon.tsx',
    '/components/icons/FingerprintIcon.tsx',
    '/components/icons/InformationCircleIcon.tsx',
    '/components/icons/KeypadIcon.tsx',
    '/components/icons/ListBulletIcon.tsx',
    '/components/icons/LockClosedIcon.tsx',
    '/components/icons/LockOpenIcon.tsx',
    '/components/icons/LogoutIcon.tsx',
    '/components/icons/MenuIcon.tsx',
    '/components/icons/PhoneIcon.tsx',
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
    '/components/icons/WrenchScrewdriverIcon.tsx',

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

self.addEventListener('push', event => {
    console.log('[Service Worker] Push Received.');
    
    let data;
    try {
        data = event.data.json();
    } catch (e) {
        data = { title: 'New Update', body: event.data.text() };
    }

    const title = data.title || 'Atta Chakki Hisab';
    const options = {
        body: data.body || 'Something new happened!',
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%23f59e0b" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12c0-2.5-2.5-6-2.5-6s-2.5 3.5-2.5 6c0 2.2-1.8 4-4 4s-4-1.8-4-4c0-2.5-2.5-6-2.5-6S4 9.5 4 12c0 4.4 3.6 8 8 8s8-3.6 8-8z" /><path d="M12 2v2" /><path d="M11 2.5a.5.5 0 0 1 1 0V4a.5.5 0 0 1-1 0z" /><path d="M13 2.5a.5.5 0 0 0-1 0V4a.5.5 0 0 0 1 0z" /><path d="M14 4.5s-1-1.5-1-3.5" /><path d="M10 4.5s1-1.5 1-3.5" /></svg>',
        badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%23FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12c0-2.5-2.5-6-2.5-6s-2.5 3.5-2.5 6c0 2.2-1.8 4-4 4s-4-1.8-4-4c0-2.5-2.5-6-2.5-6S4 9.5 4 12c0 4.4 3.6 8 8 8s8-3.6 8-8z" /></svg>',
        tag: 'chakki-notification' // So new notifications replace old ones
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
    console.log('[Service Worker] Notification click Received.');
    event.notification.close();

    // This looks for an existing window and focuses it.
    // If no window is open, it opens a new one.
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
            for (const client of clientList) {
                if ('focus' in client) return client.focus();
            }
            if (clients.openWindow) return clients.openWindow('/');
        })
    );
});