// Service Worker for TestMoltbot PWA
const CACHE_NAME = 'testmoltbot-v1';
const RUNTIME_CACHE = 'runtime-v1';

// 靜態資源快取列表
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/globals.css',
];

// 安裝事件：預快取靜態資源
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting(); // 立即啟用新的 SW
});

// 啟動事件：清理舊快取
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim(); // 立即控制所有頁面
});

// Fetch 事件：網絡優先策略 + 離線備援
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 跳過 Chrome extensions 和其他協議
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // API 請求：網絡優先，失敗則返回錯誤
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // 如果是成功的 GET 請求，快取結果
          if (request.method === 'GET' && response.status === 200) {
            const clonedResponse = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, clonedResponse);
            });
          }
          return response;
        })
        .catch(() => {
          // 離線時嘗試返回快取
          return caches.match(request).then((cached) => {
            if (cached) {
              return cached;
            }
            // 返回自定義離線響應
            return new Response(
              JSON.stringify({
                error: 'Offline',
                message: '目前離線，無法連接伺服器',
              }),
              {
                status: 503,
                headers: { 'Content-Type': 'application/json' },
              }
            );
          });
        })
    );
    return;
  }

  // 圖片請求：快取優先
  if (request.destination === 'image') {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          return cached;
        }
        return fetch(request).then((response) => {
          // 快取圖片
          if (response.status === 200) {
            const clonedResponse = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, clonedResponse);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // 其他請求：網絡優先，失敗則使用快取
  event.respondWith(
    fetch(request)
      .then((response) => {
        // 快取成功的響應
        if (response.status === 200) {
          const clonedResponse = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, clonedResponse);
          });
        }
        return response;
      })
      .catch(() => {
        // 網絡失敗，嘗試返回快取
        return caches.match(request).then((cached) => {
          if (cached) {
            return cached;
          }
          // 如果是頁面導航，返回離線頁面
          if (request.mode === 'navigate') {
            return caches.match('/').then((fallback) => fallback || new Response('Offline'));
          }
          return new Response('Offline', { status: 503 });
        });
      })
  );
});

// 背景同步：處理離線期間的上傳
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  if (event.tag === 'sync-uploads') {
    event.waitUntil(syncPendingUploads());
  }
});

async function syncPendingUploads() {
  try {
    // 從 IndexedDB 獲取待上傳的檔案
    // 實際實現需要配合 IndexedDB
    console.log('[SW] Syncing pending uploads...');
    // TODO: 實作上傳同步邏輯
  } catch (error) {
    console.error('[SW] Sync failed:', error);
  }
}

// 推送通知（選配）
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New update available',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    self.registration.showNotification('TestMoltbot', options)
  );
});

// 通知點擊
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});
