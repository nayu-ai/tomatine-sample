'use client';

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAState {
  isSupported: boolean;
  isInstalled: boolean;
  isInstallable: boolean;
  isOffline: boolean;
  installPrompt: BeforeInstallPromptEvent | null;
}

interface PWAActions {
  install: () => Promise<boolean>;
  checkInstallability: () => void;
  registerServiceWorker: () => Promise<ServiceWorkerRegistration | null>;
}

export function usePWA(): PWAState & PWAActions {
  const [state, setState] = useState<PWAState>({
    isSupported: false,
    isInstalled: false,
    isInstallable: false,
    isOffline: false,
    installPrompt: null,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check PWA support
    const isSupported = 'serviceWorker' in navigator && 'PushManager' in window;

    // Check if app is already installed
    const isInstalled =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true ||
      document.referrer.includes('android-app://');

    // Check initial online status
    const isOffline = !navigator.onLine;

    setState(prev => ({
      ...prev,
      isSupported,
      isInstalled,
      isOffline,
    }));

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const installEvent = e as BeforeInstallPromptEvent;

      // インストール可能な場合のみisInstallableをtrueに設定
      if (!isInstalled) {
        setState(prev => ({
          ...prev,
          isInstallable: true,
          installPrompt: installEvent,
        }));
      }
    };

    // Listen for app installed
    const handleAppInstalled = () => {
      setState(prev => ({
        ...prev,
        isInstalled: true,
        isInstallable: false,
        installPrompt: null,
      }));
    };

    // Listen for online/offline status
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOffline: false }));
    };

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOffline: true }));
    };

    // Add event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const install = async (): Promise<boolean> => {
    if (!state.installPrompt) {
      return false;
    }

    try {
      await state.installPrompt.prompt();
      const result = await state.installPrompt.userChoice;

      if (result.outcome === 'accepted') {
        setState(prev => ({
          ...prev,
          isInstallable: false,
          installPrompt: null,
        }));
        return true;
      }

      return false;
    } catch {
      // エラーログは開発時のみ出力
      return false;
    }
  };

  const checkInstallability = () => {
    // Force check for installability
    // This is mainly for debugging purposes
    const isInstallable = !state.isInstalled && state.isSupported;
    setState(prev => ({ ...prev, isInstallable }));
  };

  const registerServiceWorker =
    async (): Promise<ServiceWorkerRegistration | null> => {
      if (!state.isSupported) {
        return null;
      }

      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        // Service Worker登録完了

        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  // New version available
                  // 新しいバージョンが利用可能
                  // You could show a notification here
                }
              }
            });
          }
        });

        return registration;
      } catch {
        // Service Worker登録失敗
        return null;
      }
    };

  return {
    ...state,
    install,
    checkInstallability,
    registerServiceWorker,
  };
}

/**
 * Hook for PWA-specific notifications
 */
export function usePWANotifications() {
  const [permission, setPermission] =
    useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const supported = 'Notification' in window && 'serviceWorker' in navigator;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async (): Promise<NotificationPermission> => {
    if (!isSupported) {
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);
      return permission;
    } catch {
      // 通知許可リクエスト失敗
      return 'denied';
    }
  };

  const showNotification = async (
    title: string,
    options?: NotificationOptions
  ): Promise<boolean> => {
    if (!isSupported || permission !== 'granted') {
      return false;
    }

    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, {
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png',
          ...options,
        });
      } else {
        new Notification(title, {
          icon: '/icon-192x192.png',
          ...options,
        });
      }

      return true;
    } catch {
      // 通知送信失敗
      return false;
    }
  };

  return {
    isSupported,
    permission,
    requestPermission,
    showNotification,
  };
}

/**
 * Hook for handling PWA updates
 */
export function usePWAUpdates() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [newWorker, setNewWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    const handleControllerChange = () => {
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener(
      'controllerchange',
      handleControllerChange
    );

    navigator.serviceWorker.ready.then(registration => {
      registration.addEventListener('updatefound', () => {
        const newServiceWorker = registration.installing;

        if (newServiceWorker) {
          setNewWorker(newServiceWorker);

          newServiceWorker.addEventListener('statechange', () => {
            if (newServiceWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                setUpdateAvailable(true);
              }
            }
          });
        }
      });
    });

    return () => {
      navigator.serviceWorker.removeEventListener(
        'controllerchange',
        handleControllerChange
      );
    };
  }, []);

  const applyUpdate = () => {
    if (newWorker) {
      newWorker.postMessage({ type: 'SKIP_WAITING' });
    }
  };

  return {
    updateAvailable,
    applyUpdate,
  };
}
