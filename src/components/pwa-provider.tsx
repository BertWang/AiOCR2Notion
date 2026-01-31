"use client";

import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/pwa/service-worker-registration';

export function PWAProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // 註冊 Service Worker
    registerServiceWorker();
  }, []);

  return <>{children}</>;
}
