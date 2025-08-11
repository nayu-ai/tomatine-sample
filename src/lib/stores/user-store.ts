/**
 * User preferences store using Zustand
 * Manages user settings, preferences, and app configuration
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { UserPref, PrivacyLevel } from '../types';
import { databaseService } from '../database';
import { DEFAULT_USER_PREFS } from '../types';

export interface UserStore {
  // User preferences (mirrors UserPref interface)
  focusPresetMs: number;
  breakPresetMs: number;
  warmupEnabled: boolean;
  isWarmupEnabled: boolean; // Alias for backward compatibility
  warmupDurationMs: number;
  hourlyValue?: number;
  locale: string;
  privacyLevel: PrivacyLevel;
  notificationPermissionRequested: boolean;
  theme: 'light' | 'dark' | 'system';
  soundEnabled: boolean;

  // Loading state
  isLoaded: boolean;
  isLoading: boolean;

  // Actions - Load and save preferences
  loadPreferences: () => Promise<void>;
  savePreferences: () => Promise<void>;
  resetToDefaults: () => Promise<void>;

  // Actions - Focus/Break presets
  setFocusPreset: (duration: number) => void;
  setBreakPreset: (duration: number) => void;

  // Actions - Warmup settings
  setWarmupEnabled: (enabled: boolean) => void;
  setWarmupDuration: (duration: number) => void;

  // Actions - Advanced settings
  setHourlyValue: (value?: number) => void;
  setLocale: (locale: string) => void;
  setPrivacyLevel: (level: PrivacyLevel) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;

  // Actions - Notification preferences
  setNotificationPermissionRequested: (requested: boolean) => void;

  // Actions - Utility
  getPresetDurations: () => { focus: number; break: number; warmup: number };
  exportPreferences: () => Promise<UserPref>;
  importPreferences: (prefs: Partial<UserPref>) => Promise<void>;

  // Actions - Privacy and data
  clearAllUserData: () => Promise<void>;
}

export const useUserStore = create<UserStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state - defaults
    ...DEFAULT_USER_PREFS,
    isWarmupEnabled: DEFAULT_USER_PREFS.warmupEnabled, // Alias
    isLoaded: false,
    isLoading: false,

    // Load preferences from database
    loadPreferences: async () => {
      set({ isLoading: true });

      try {
        const prefs = await databaseService.getUserPrefs();
        set({
          focusPresetMs: prefs.focusPresetMs,
          breakPresetMs: prefs.breakPresetMs,
          warmupEnabled: prefs.warmupEnabled,
          isWarmupEnabled: prefs.warmupEnabled, // Alias
          warmupDurationMs: prefs.warmupDurationMs,
          hourlyValue: prefs.hourlyValue,
          locale: prefs.locale,
          privacyLevel: prefs.privacyLevel,
          notificationPermissionRequested:
            prefs.notificationPermissionRequested,
          theme: prefs.theme,
          soundEnabled: prefs.soundEnabled,
          isLoaded: true,
          isLoading: false,
        });
      } catch {
        // ユーザー設定の読み込みに失敗
        set({ isLoading: false });
      }
    },

    // Save current preferences to database
    savePreferences: async () => {
      const state = get();

      try {
        await databaseService.updateUserPrefs({
          focusPresetMs: state.focusPresetMs,
          breakPresetMs: state.breakPresetMs,
          warmupEnabled: state.warmupEnabled,
          warmupDurationMs: state.warmupDurationMs,
          hourlyValue: state.hourlyValue,
          locale: state.locale,
          privacyLevel: state.privacyLevel,
          notificationPermissionRequested:
            state.notificationPermissionRequested,
          theme: state.theme,
          soundEnabled: state.soundEnabled,
        });
      } catch (error) {
        // ユーザー設定の保存に失敗
        throw error;
      }
    },

    // Reset to default preferences
    resetToDefaults: async () => {
      set({
        ...DEFAULT_USER_PREFS,
        isLoaded: true,
      });

      await get().savePreferences();
    },

    // Focus/Break presets with validation
    setFocusPreset: duration => {
      // Clamp between 1 minute and 120 minutes
      const clampedDuration = Math.max(
        60 * 1000,
        Math.min(duration, 120 * 60 * 1000)
      );

      set({ focusPresetMs: clampedDuration });
      get().savePreferences();
    },

    setBreakPreset: duration => {
      // Clamp between 1 minute and 30 minutes
      const clampedDuration = Math.max(
        60 * 1000,
        Math.min(duration, 30 * 60 * 1000)
      );

      set({ breakPresetMs: clampedDuration });
      get().savePreferences();
    },

    // Warmup settings
    setWarmupEnabled: enabled => {
      set({ warmupEnabled: enabled, isWarmupEnabled: enabled });
      get().savePreferences();
    },

    setWarmupDuration: duration => {
      // Clamp between 1 minute and 5 minutes
      const clampedDuration = Math.max(
        60 * 1000,
        Math.min(duration, 5 * 60 * 1000)
      );

      set({ warmupDurationMs: clampedDuration });
      get().savePreferences();
    },

    // Advanced settings
    setHourlyValue: value => {
      set({ hourlyValue: value });
      get().savePreferences();
    },

    setLocale: locale => {
      set({ locale });
      get().savePreferences();
    },

    setPrivacyLevel: level => {
      set({ privacyLevel: level });
      get().savePreferences();
    },

    setSoundEnabled: enabled => {
      set({ soundEnabled: enabled });
      get().savePreferences();
    },

    setTheme: theme => {
      set({ theme });
      get().savePreferences();
    },

    // Notification preferences
    setNotificationPermissionRequested: requested => {
      set({ notificationPermissionRequested: requested });
      get().savePreferences();
    },

    // Utility functions
    getPresetDurations: () => {
      const state = get();
      return {
        focus: state.focusPresetMs,
        break: state.breakPresetMs,
        warmup: state.warmupDurationMs,
      };
    },

    exportPreferences: async () => {
      const state = get();
      return {
        id: 'singleton' as const,
        focusPresetMs: state.focusPresetMs,
        breakPresetMs: state.breakPresetMs,
        warmupEnabled: state.warmupEnabled,
        warmupDurationMs: state.warmupDurationMs,
        hourlyValue: state.hourlyValue,
        locale: state.locale,
        privacyLevel: state.privacyLevel,
        notificationPermissionRequested: state.notificationPermissionRequested,
        theme: state.theme,
        soundEnabled: state.soundEnabled,
      };
    },

    importPreferences: async prefs => {
      // Update state with imported preferences
      const updates: Partial<UserStore> = {};

      if (prefs.focusPresetMs !== undefined)
        updates.focusPresetMs = prefs.focusPresetMs;
      if (prefs.breakPresetMs !== undefined)
        updates.breakPresetMs = prefs.breakPresetMs;
      if (prefs.warmupEnabled !== undefined)
        updates.warmupEnabled = prefs.warmupEnabled;
      if (prefs.warmupDurationMs !== undefined)
        updates.warmupDurationMs = prefs.warmupDurationMs;
      if (prefs.hourlyValue !== undefined)
        updates.hourlyValue = prefs.hourlyValue;
      if (prefs.locale !== undefined) updates.locale = prefs.locale;
      if (prefs.privacyLevel !== undefined)
        updates.privacyLevel = prefs.privacyLevel;
      if (prefs.notificationPermissionRequested !== undefined) {
        updates.notificationPermissionRequested =
          prefs.notificationPermissionRequested;
      }
      if (prefs.theme !== undefined) updates.theme = prefs.theme;
      if (prefs.soundEnabled !== undefined)
        updates.soundEnabled = prefs.soundEnabled;

      set(updates);
      await get().savePreferences();
    },

    // Privacy and data management
    clearAllUserData: async () => {
      try {
        await databaseService.clearAllData();
        await get().resetToDefaults();
      } catch (error) {
        // ユーザーデータの削除に失敗
        throw error;
      }
    },
  }))
);

// Auto-load preferences on store creation
if (typeof window !== 'undefined') {
  useUserStore.getState().loadPreferences();
}
