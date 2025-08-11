/**
 * UI store using Zustand
 * Manages UI state, notifications, modals, and user interface preferences
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { ToastMessage } from '../types';
import { generateId } from '../utils';

export interface UIStore {
  // Toast notifications
  toasts: ToastMessage[];

  // Modal states
  isRecoveryModalOpen: boolean;
  isSettingsModalOpen: boolean;
  isStatsModalOpen: boolean;

  // Loading states
  isLoading: boolean;
  loadingMessage: string;

  // Theme and display preferences
  theme: 'light' | 'dark' | 'system';
  isCompactMode: boolean;
  showSeconds: boolean;

  // Page/navigation state
  currentPage: 'timer' | 'stats' | 'settings';

  // Notification permissions
  notificationPermission: NotificationPermission;
  canRequestNotification: boolean;

  // Touch/interaction states
  isTouchDevice: boolean;
  isInstalled: boolean; // PWA installation status

  // Actions - Toast management
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;

  // Actions - Modal management
  openRecoveryModal: () => void;
  closeRecoveryModal: () => void;
  openSettingsModal: () => void;
  closeSettingsModal: () => void;
  openStatsModal: () => void;
  closeStatsModal: () => void;
  closeAllModals: () => void;

  // Actions - Loading states
  setLoading: (loading: boolean, message?: string) => void;

  // Actions - Theme and preferences
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setCompactMode: (compact: boolean) => void;
  setShowSeconds: (show: boolean) => void;

  // Actions - Navigation
  setCurrentPage: (page: 'timer' | 'stats' | 'settings') => void;

  // Actions - Notification handling
  requestNotificationPermission: () => Promise<boolean>;
  showNotification: (title: string, options?: NotificationOptions) => void;
  setCanRequestNotification: (canRequest: boolean) => void;

  // Actions - Device detection
  setTouchDevice: (isTouch: boolean) => void;
  setInstalled: (installed: boolean) => void;

  // Actions - Utility
  showSuccessToast: (message: string) => void;
  showErrorToast: (message: string) => void;
  showInfoToast: (message: string) => void;
  showWarningToast: (message: string) => void;
}

export const useUIStore = create<UIStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    toasts: [],

    isRecoveryModalOpen: false,
    isSettingsModalOpen: false,
    isStatsModalOpen: false,

    isLoading: false,
    loadingMessage: '',

    theme: 'system',
    isCompactMode: false,
    showSeconds: false,

    currentPage: 'timer',

    notificationPermission:
      typeof window !== 'undefined' ? Notification.permission : 'default',
    canRequestNotification: false,

    isTouchDevice: false,
    isInstalled: false,

    // Toast management
    addToast: toast => {
      const newToast: ToastMessage = {
        id: generateId(),
        duration: 3000,
        ...toast,
      };

      set(state => ({
        toasts: [...state.toasts, newToast],
      }));

      // Auto-remove toast after duration
      if (newToast.duration && newToast.duration > 0) {
        setTimeout(() => {
          get().removeToast(newToast.id);
        }, newToast.duration);
      }
    },

    removeToast: id => {
      set(state => ({
        toasts: state.toasts.filter(toast => toast.id !== id),
      }));
    },

    clearToasts: () => {
      set({ toasts: [] });
    },

    // Modal management
    openRecoveryModal: () => set({ isRecoveryModalOpen: true }),
    closeRecoveryModal: () => set({ isRecoveryModalOpen: false }),
    openSettingsModal: () => set({ isSettingsModalOpen: true }),
    closeSettingsModal: () => set({ isSettingsModalOpen: false }),
    openStatsModal: () => set({ isStatsModalOpen: true }),
    closeStatsModal: () => set({ isStatsModalOpen: false }),

    closeAllModals: () =>
      set({
        isRecoveryModalOpen: false,
        isSettingsModalOpen: false,
        isStatsModalOpen: false,
      }),

    // Loading states
    setLoading: (loading, message = '') =>
      set({
        isLoading: loading,
        loadingMessage: message,
      }),

    // Theme and preferences
    setTheme: theme => {
      set({ theme });

      if (typeof window !== 'undefined') {
        // Apply theme immediately
        const root = document.documentElement;
        if (theme === 'dark') {
          root.classList.add('dark');
        } else if (theme === 'light') {
          root.classList.remove('dark');
        } else {
          // System theme
          const prefersDark = window.matchMedia(
            '(prefers-color-scheme: dark)'
          ).matches;
          root.classList.toggle('dark', prefersDark);
        }

        // Store preference
        localStorage.setItem('theme', theme);
      }
    },

    setCompactMode: compact => {
      set({ isCompactMode: compact });
      if (typeof window !== 'undefined') {
        localStorage.setItem('compactMode', compact.toString());
      }
    },

    setShowSeconds: show => {
      set({ showSeconds: show });
      if (typeof window !== 'undefined') {
        localStorage.setItem('showSeconds', show.toString());
      }
    },

    // Navigation
    setCurrentPage: page => set({ currentPage: page }),

    // Notification handling
    requestNotificationPermission: async () => {
      if (typeof window === 'undefined' || !('Notification' in window)) {
        return false;
      }

      if (Notification.permission === 'granted') {
        return true;
      }

      if (Notification.permission === 'denied') {
        return false;
      }

      try {
        const permission = await Notification.requestPermission();
        set({ notificationPermission: permission });
        return permission === 'granted';
      } catch {
        set({ notificationPermission: 'denied' });
        return false;
      }
    },

    showNotification: (title, options = {}) => {
      if (typeof window === 'undefined' || !('Notification' in window)) {
        // Fallback to toast notification
        get().showInfoToast(title);
        return;
      }

      if (Notification.permission === 'granted') {
        try {
          const notification = new Notification(title, options);

          // Auto-close after 5 seconds
          setTimeout(() => {
            notification.close();
          }, 5000);

          return notification;
        } catch {
          // 通知の表示に失敗した場合は何もしない
          return null;
        }
      }
    },

    setCanRequestNotification: canRequest =>
      set({ canRequestNotification: canRequest }),

    // Device detection
    setTouchDevice: isTouch => set({ isTouchDevice: isTouch }),
    setInstalled: installed => set({ isInstalled: installed }),

    // Utility toast helpers
    showSuccessToast: message => {
      get().addToast({
        type: 'success',
        title: '成功',
        message,
        duration: 3000,
      });
    },

    showErrorToast: message => {
      get().addToast({
        type: 'error',
        title: 'エラー',
        message,
        duration: 5000,
      });
    },

    showInfoToast: message => {
      get().addToast({
        type: 'info',
        title: '情報',
        message,
        duration: 3000,
      });
    },

    showWarningToast: message => {
      get().addToast({
        type: 'warning',
        title: '警告',
        message,
        duration: 4000,
      });
    },
  }))
);

// Initialize UI preferences from localStorage
if (typeof window !== 'undefined') {
  // Get store instance for initialization
  const store = useUIStore.getState();

  // Load saved theme preference
  const savedTheme = localStorage.getItem('theme') as
    | 'light'
    | 'dark'
    | 'system'
    | null;
  if (savedTheme) {
    store.setTheme(savedTheme);
  }

  // Load saved compact mode
  const savedCompactMode = localStorage.getItem('compactMode');
  if (savedCompactMode) {
    store.setCompactMode(savedCompactMode === 'true');
  }

  // Load saved show seconds preference
  const savedShowSeconds = localStorage.getItem('showSeconds');
  if (savedShowSeconds) {
    store.setShowSeconds(savedShowSeconds === 'true');
  }

  // Detect touch device
  const isTouchDevice =
    'ontouchstart' in window || navigator.maxTouchPoints > 0;
  store.setTouchDevice(isTouchDevice);

  // Detect PWA installation
  const isPWA =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true;
  store.setInstalled(isPWA);

  // Listen for system theme changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', () => {
    const currentTheme = store.theme;
    if (currentTheme === 'system') {
      const root = document.documentElement;
      root.classList.toggle('dark', mediaQuery.matches);
    }
  });

  // Listen for PWA installation
  window.addEventListener('appinstalled', () => {
    store.setInstalled(true);
    store.showSuccessToast('アプリがインストールされました！');
  });

  // Check notification permission on load
  if ('Notification' in window) {
    // Update notification permission directly
    store.notificationPermission = Notification.permission;
  }
}
