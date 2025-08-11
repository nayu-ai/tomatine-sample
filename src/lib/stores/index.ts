/**
 * Store exports for the Tomatine application
 * Centralized export of all Zustand stores and related utilities
 */

export { useTimerStore } from './timer-store';
export type { TimerStore } from './timer-store';
export { useUIStore } from './ui-store';
export type { UIStore } from './ui-store';
export { useUserStore } from './user-store';
export type { UserStore } from './user-store';
export { useEasterEggStore, useEasterEggEmojis } from './easterEggStore';
export { useRewardStore } from './reward-store';

// Re-export types for convenience
export type {
  TimerMode,
  UserPref,
  TimerState,
  Mood,
  ToastMessage,
  SessionStats,
  DateRange,
  PrivacyLevel,
} from '../types';

// Store selectors for optimized re-renders
import type { TimerStore } from './timer-store';
import type { UIStore } from './ui-store';
import type { UserStore } from './user-store';

export const timerSelectors = {
  // Timer state selectors
  mode: (state: TimerStore) => state.mode,
  remaining: (state: TimerStore) => state.remaining,
  isRunning: (state: TimerStore) => state.isRunning,
  isPaused: (state: TimerStore) => state.isPaused,

  // Session configuration selectors
  durations: (state: TimerStore) => ({
    focus: state.focusDuration,
    break: state.breakDuration,
    warmup: state.warmupDuration,
  }),

  // Session metadata selectors
  sessionData: (state: TimerStore) => ({
    moodStart: state.moodStart,
    taskNote: state.taskNote,
    sessionId: state.sessionId,
  }),
};

export const uiSelectors = {
  // Modal state selectors
  modals: (state: UIStore) => ({
    recovery: state.isRecoveryModalOpen,
    settings: state.isSettingsModalOpen,
    stats: state.isStatsModalOpen,
  }),

  // Theme and display selectors
  display: (state: UIStore) => ({
    theme: state.theme,
    isCompactMode: state.isCompactMode,
    showSeconds: state.showSeconds,
  }),

  // Notification selectors
  notifications: (state: UIStore) => ({
    permission: state.notificationPermission,
    canRequest: state.canRequestNotification,
  }),

  // Device info selectors
  device: (state: UIStore) => ({
    isTouchDevice: state.isTouchDevice,
    isInstalled: state.isInstalled,
  }),
};

export const userSelectors = {
  // Preset duration selectors
  presets: (state: UserStore) => ({
    focus: state.focusPresetMs,
    break: state.breakPresetMs,
    warmup: state.warmupDurationMs,
  }),

  // Feature toggles
  features: (state: UserStore) => ({
    warmupEnabled: state.warmupEnabled,
    soundEnabled: state.soundEnabled,
  }),

  // Privacy and preferences
  privacy: (state: UserStore) => ({
    privacyLevel: state.privacyLevel,
    locale: state.locale,
  }),

  // Loading state
  loading: (state: UserStore) => ({
    isLoaded: state.isLoaded,
    isLoading: state.isLoading,
  }),
};

// Utility hooks for common store combinations
import { useTimerStore } from './timer-store';
import { useUIStore } from './ui-store';
import { useUserStore } from './user-store';

export function useTimerConfig() {
  const focusPreset = useUserStore(userSelectors.presets);
  const warmupEnabled = useUserStore(state => state.warmupEnabled);
  const soundEnabled = useUserStore(state => state.soundEnabled);

  return {
    ...focusPreset,
    warmupEnabled,
    soundEnabled,
  };
}

export function useTimerDisplay() {
  const remaining = useTimerStore(timerSelectors.remaining);
  const mode = useTimerStore(timerSelectors.mode);
  const isRunning = useTimerStore(timerSelectors.isRunning);
  const isPaused = useTimerStore(timerSelectors.isPaused);
  const showSeconds = useUIStore(state => state.showSeconds);

  return {
    remaining,
    mode,
    isRunning,
    isPaused,
    showSeconds,
  };
}

export function useAppTheme() {
  const uiTheme = useUIStore(state => state.theme);
  const userTheme = useUserStore(state => state.theme);
  const setUITheme = useUIStore(state => state.setTheme);
  const setUserTheme = useUserStore(state => state.setTheme);

  return {
    theme: userTheme || uiTheme,
    setTheme: (theme: 'light' | 'dark' | 'system') => {
      setUITheme(theme);
      setUserTheme(theme);
    },
  };
}

export function useNotifications() {
  const permission = useUIStore(state => state.notificationPermission);
  const canRequest = useUIStore(state => state.canRequestNotification);
  const requestPermission = useUIStore(
    state => state.requestNotificationPermission
  );
  const showNotification = useUIStore(state => state.showNotification);
  const permissionRequested = useUserStore(
    state => state.notificationPermissionRequested
  );
  const setPermissionRequested = useUserStore(
    state => state.setNotificationPermissionRequested
  );

  return {
    permission,
    canRequest,
    permissionRequested,
    requestPermission,
    showNotification,
    setPermissionRequested,
  };
}
