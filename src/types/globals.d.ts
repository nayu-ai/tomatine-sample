// Global type definitions for browser APIs that may not be available

declare global {
  // Notification API types for environments where it may not be available
  interface Window {
    Notification?: typeof Notification;
  }
}

// Make NotificationPermission safely available
export type SafeNotificationPermission = 'default' | 'denied' | 'granted';

// Safe Notification options type
export interface SafeNotificationOptions {
  body?: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: any;
  requireInteraction?: boolean;
  silent?: boolean;
  tag?: string;
  timestamp?: number;
  vibrate?: number[];
}

export {};
