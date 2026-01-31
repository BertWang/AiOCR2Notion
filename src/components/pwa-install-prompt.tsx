"use client";

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Download, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // 檢查是否已安裝
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // 檢查是否已經提示過
    const hasPrompted = localStorage.getItem('pwa-install-prompted');
    if (hasPrompted === 'true') {
      return;
    }

    // 監聽安裝提示事件
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const event = e as BeforeInstallPromptEvent;
      setDeferredPrompt(event);
      
      // 延遲顯示，避免頁面載入時立即彈出
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 檢查是否已安裝（iOS 或其他方式）
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowPrompt(false);
      localStorage.setItem('pwa-install-prompted', 'true');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      return;
    }

    // 顯示安裝提示
    await deferredPrompt.prompt();

    // 等待用戶選擇
    const { outcome } = await deferredPrompt.userChoice;
    
    console.log(`User ${outcome} the install prompt`);
    
    // 清理
    setDeferredPrompt(null);
    setShowPrompt(false);
    localStorage.setItem('pwa-install-prompted', 'true');
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-prompted', 'true');
  };

  // 不顯示提示的情況
  if (isInstalled || !showPrompt || !deferredPrompt) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md"
      >
        <div className="bg-white border-2 border-stone-900 rounded-2xl shadow-2xl p-5 relative overflow-hidden">
          {/* 裝飾性背景 */}
          <div className="absolute inset-0 bg-gradient-to-br from-stone-100 to-white opacity-50 pointer-events-none" />
          
          {/* 內容 */}
          <div className="relative z-10">
            <button
              onClick={handleDismiss}
              className="absolute top-0 right-0 p-2 text-stone-400 hover:text-stone-600 transition-colors"
              aria-label="關閉"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-stone-900 rounded-xl flex items-center justify-center shrink-0">
                <Smartphone className="w-6 h-6 text-white" />
              </div>
              
              <div className="flex-1 pr-6">
                <h3 className="font-bold text-stone-900 mb-1 text-base">
                  安裝 TestMoltbot 到您的裝置
                </h3>
                <p className="text-sm text-stone-600 mb-4">
                  • 離線瀏覽筆記<br/>
                  • 更快的載入速度<br/>
                  • 桌面快捷方式
                </p>
                
                <div className="flex gap-2">
                  <Button
                    onClick={handleInstall}
                    className="flex-1 bg-stone-900 text-white hover:bg-stone-800 h-10 font-medium"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    立即安裝
                  </Button>
                  <Button
                    onClick={handleDismiss}
                    variant="outline"
                    className="px-4 h-10"
                  >
                    稍後
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// iOS 安裝提示（Safari 不支援 beforeinstallprompt）
export function IOSInstallPrompt() {
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);

  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
    const hasPrompted = localStorage.getItem('ios-install-prompted');

    if (isIOS && !isInStandaloneMode && hasPrompted !== 'true') {
      setTimeout(() => {
        setShowIOSPrompt(true);
      }, 5000);
    }
  }, []);

  if (!showIOSPrompt) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md"
      >
        <div className="bg-white border-2 border-blue-500 rounded-2xl shadow-2xl p-5 relative">
          <button
            onClick={() => {
              setShowIOSPrompt(false);
              localStorage.setItem('ios-install-prompted', 'true');
            }}
            className="absolute top-3 right-3 text-stone-400 hover:text-stone-600"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="pr-6">
            <h3 className="font-bold text-stone-900 mb-2">安裝到主畫面</h3>
            <p className="text-sm text-stone-600 mb-3">
              點擊 Safari 底部的「分享」按鈕 <span className="inline-block">📤</span>，然後選擇「加入主畫面」
            </p>
            <Button
              onClick={() => {
                setShowIOSPrompt(false);
                localStorage.setItem('ios-install-prompted', 'true');
              }}
              variant="outline"
              size="sm"
              className="w-full"
            >
              知道了
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
