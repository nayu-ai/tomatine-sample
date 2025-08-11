/**
 * Core type definitions for the Tomatine application
 * Based on the requirements document and MVP data model design
 */

// Timer modes representing different states of the timer
export type TimerMode = 'idle' | 'warmup' | 'focus' | 'break';

// Mood options for user emotional state tracking
export type Mood = 'energetic' | 'calm' | 'focused' | 'tired' | 'distracted';

// Privacy levels for data handling preferences
export type PrivacyLevel = 'local-only' | 'anonymous-stats' | 'full-sync';

/**
 * Session represents a completed or in-progress work/break session
 * Indexed on startAt for date/week aggregation queries
 */
export interface Session {
  id?: number; // Auto-increment primary key
  startAt: Date; // Session start timestamp
  endAt?: Date; // Session end timestamp (undefined for in-progress)
  focusMs: number; // Planned focus duration in milliseconds
  breakMs: number; // Planned break duration in milliseconds
  actualFocusMs?: number; // Actual completed focus time
  actualBreakMs?: number; // Actual completed break time
  flowExtended?: boolean; // Whether session was extended beyond planned time
  moodStart?: Mood; // User's mood at session start
  moodEnd?: Mood; // User's mood at session end
  moodChanges?: Array<{ timestamp: number; mood: Mood }>; // Mood changes during session
  taskNote?: string; // Optional note about the task worked on
  completed: boolean; // Whether session completed successfully (not abandoned)
  warmupSkipped?: boolean; // Whether warmup phase was skipped
}

/**
 * UserPref stores user preferences and configuration
 * Single record with id: 'singleton'
 */
export interface UserPref {
  id: 'singleton'; // Single record identifier
  focusPresetMs: number; // Default focus duration (default: 25*60*1000)
  breakPresetMs: number; // Default break duration (default: 5*60*1000)
  warmupEnabled: boolean; // Whether 3-min warmup is enabled (default: true)
  warmupDurationMs: number; // Warmup duration (default: 3*60*1000)
  hourlyValue?: number; // Hourly rate for value dashboard (v1.5 feature)
  locale: string; // Locale for i18n (default: 'ja')
  privacyLevel: PrivacyLevel; // Data privacy preference (default: 'local-only')
  notificationPermissionRequested: boolean; // Whether permission was requested (default: false)
  theme: 'light' | 'dark' | 'system'; // UI theme preference (default: 'system')
  soundEnabled: boolean; // Whether completion sounds are enabled (default: true)
}

/**
 * TimerState represents the current timer state
 * Single record with id: 'current' for crash recovery
 */
export interface TimerState {
  id: 'current'; // Single record identifier
  mode: TimerMode; // Current timer mode
  startedAt?: number; // Timestamp when current mode started
  targetAt?: number; // Timestamp when current mode should end
  pausedAt?: number; // Timestamp when timer was paused (if paused)
  sessionId?: number; // Link to the active Session record
  lastUpdate: number; // Last update timestamp for drift detection
}

/**
 * Statistics aggregation interface for displaying user progress
 */
export interface SessionStats {
  totalSessions: number; // Total completed sessions
  totalFocusTime: number; // Total focus time in milliseconds
  totalBreakTime: number; // Total break time in milliseconds
  averageSessionLength: number; // Average session length in milliseconds
  completionRate: number; // Percentage of completed vs started sessions
  longestStreak: number; // Longest consecutive days with sessions
  currentStreak: number; // Current consecutive days with sessions
  mostProductiveHour: number; // Hour of day with most sessions (0-23)
}

/**
 * Date range type for statistics filtering
 */
export type DateRange = 'today' | 'week' | 'month' | 'all';

/**
 * Notification types for the application
 */
export type NotificationType =
  | 'session-complete'
  | 'break-complete'
  | 'warmup-complete';

/**
 * Toast message interface for user feedback
 */
export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message?: string;
  duration?: number; // Duration in milliseconds (default: 3000)
}

/**
 * Timer events for logging and analytics
 */
export interface TimerEvent {
  id: string;
  type:
    | 'session-start'
    | 'session-pause'
    | 'session-resume'
    | 'session-complete'
    | 'session-skip';
  timestamp: Date;
  sessionId?: number;
  mode: TimerMode;
  metadata?: Record<string, unknown>;
}

/**
 * Error types for consistent error handling
 */
export type AppError = {
  code: 'TIMER_ERROR' | 'DATABASE_ERROR' | 'PERMISSION_ERROR' | 'NETWORK_ERROR';
  message: string;
  details?: Record<string, unknown>;
};

/**
 * Feature flags for A/B testing and experimental features
 */
export interface FeatureFlags {
  enableAdvancedStats: boolean;
  enableSoundFeedback: boolean;
  enableMoodTracking: boolean;
  enableExtendedBreaks: boolean;
  enableCustomPresets: boolean;
}

/**
 * Export defaults for initial user preferences
 */
export const DEFAULT_USER_PREFS: Omit<UserPref, 'id'> = {
  focusPresetMs: 25 * 60 * 1000, // 25 minutes
  breakPresetMs: 5 * 60 * 1000, // 5 minutes
  warmupEnabled: true,
  warmupDurationMs: 3 * 60 * 1000, // 3 minutes
  locale: 'ja',
  privacyLevel: 'local-only',
  notificationPermissionRequested: false,
  theme: 'system',
  soundEnabled: true,
};

/**
 * Export timer duration constants
 */
export const TIMER_CONSTANTS = {
  MIN_FOCUS_DURATION: 1 * 60 * 1000, // 1 minute minimum
  MAX_FOCUS_DURATION: 120 * 60 * 1000, // 120 minutes maximum
  MIN_BREAK_DURATION: 1 * 60 * 1000, // 1 minute minimum
  MAX_BREAK_DURATION: 30 * 60 * 1000, // 30 minutes maximum
  MIN_WARMUP_DURATION: 1 * 60 * 1000, // 1 minute minimum
  MAX_WARMUP_DURATION: 5 * 60 * 1000, // 5 minutes maximum
  TIMER_UPDATE_INTERVAL: 1000, // 1 second
  DRIFT_THRESHOLD: 5000, // 5 seconds - threshold for detecting time drift
} as const;
