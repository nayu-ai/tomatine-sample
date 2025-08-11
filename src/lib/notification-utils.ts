/**
 * Safe notification utilities for cross-browser compatibility
 * Handles cases where Notification API is not available (iOS Safari, private browsing, etc.)
 */

import type {
  SafeNotificationOptions,
  SafeNotificationPermission,
} from '@/types/globals';

/**
 * Check if Notification API is available
 */
export function isNotificationSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'Notification' in window && typeof window.Notification === 'function';
}

/**
 * Safely get notification permission
 */
export function getNotificationPermission(): SafeNotificationPermission {
  if (!isNotificationSupported()) {
    return 'denied';
  }

  try {
    return (window as any).Notification
      .permission as SafeNotificationPermission;
  } catch (error) {
    console.warn('Failed to get notification permission:', error);
    return 'denied';
  }
}

/**
 * Safely request notification permission
 */
export async function requestNotificationPermission(): Promise<SafeNotificationPermission> {
  if (!isNotificationSupported()) {
    return 'denied';
  }

  try {
    const permission = await (window as any).Notification.requestPermission();
    return permission as SafeNotificationPermission;
  } catch (error) {
    console.warn('Failed to request notification permission:', error);
    return 'denied';
  }
}

/**
 * Safely show notification
 */
export async function showNotification(
  title: string,
  options: SafeNotificationOptions = {}
): Promise<boolean> {
  if (!isNotificationSupported()) {
    console.warn('Notifications not supported');
    return false;
  }

  const permission = getNotificationPermission();
  if (permission !== 'granted') {
    console.warn('Notification permission not granted');
    return false;
  }

  try {
    // Try Service Worker first
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, {
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png',
          ...options,
        });
        return true;
      } catch (swError) {
        console.warn(
          'Service Worker notification failed, falling back to direct:',
          swError
        );
      }
    }

    // Fallback to direct notification
    new (window as any).Notification(title, {
      icon: '/icon-192x192.png',
      ...options,
    });
    return true;
  } catch (error) {
    console.warn('Failed to show notification:', error);
    return false;
  }
}

/**
 * Safe notification manager class
 */
export class SafeNotificationManager {
  private supported: boolean;
  private permission: SafeNotificationPermission;

  constructor() {
    this.supported = isNotificationSupported();
    this.permission = getNotificationPermission();
  }

  isSupported(): boolean {
    return this.supported;
  }

  getPermission(): SafeNotificationPermission {
    return this.permission;
  }

  async requestPermission(): Promise<SafeNotificationPermission> {
    this.permission = await requestNotificationPermission();
    return this.permission;
  }

  async show(
    title: string,
    options?: SafeNotificationOptions
  ): Promise<boolean> {
    return await showNotification(title, options);
  }

  canShow(): boolean {
    return this.supported && this.permission === 'granted';
  }
}
