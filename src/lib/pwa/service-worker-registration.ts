// Service Worker Registration Utility
// 在客戶端註冊 Service Worker

export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.log('Service Worker not supported');
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('✅ Service Worker registered:', registration.scope);

        // 檢查更新
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // 新版本可用
              console.log('🔄 New version available! Please refresh.');
              
              // 可選：提示用戶更新
              if (confirm('有新版本可用，是否現在更新？')) {
                newWorker.postMessage({ type: 'SKIP_WAITING' });
                window.location.reload();
              }
            }
          });
        });
      })
      .catch((error) => {
        console.error('❌ Service Worker registration failed:', error);
      });

    // 監聽 SW 控制變更
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('🔄 Service Worker controller changed');
      window.location.reload();
    });
  });
}

// 取消註冊（用於開發除錯）
export async function unregisterServiceWorker() {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
      console.log('Service Worker unregistered');
    }
  }
}

// 檢查 SW 狀態
export async function getServiceWorkerStatus() {
  if (!('serviceWorker' in navigator)) {
    return { supported: false, registered: false };
  }

  const registration = await navigator.serviceWorker.getRegistration();
  return {
    supported: true,
    registered: !!registration,
    active: !!registration?.active,
    waiting: !!registration?.waiting,
    installing: !!registration?.installing,
  };
}

// 請求背景同步權限
export async function requestBackgroundSync(tag: string) {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Worker not supported');
    return false;
  }

  // Check if Background Sync is supported
  const registration = await navigator.serviceWorker.ready;
  if (!('sync' in registration)) {
    console.warn('Background Sync not supported');
    return false;
  }

  try {
    // TypeScript fix: cast as any since sync is an optional feature
    const syncReg = registration as any;
    await syncReg.sync.register(tag);
    console.log(`✅ Background sync registered: ${tag}`);
    return true;
  } catch (error) {
    console.error('Background sync registration failed:', error);
    return false;
  }
}
