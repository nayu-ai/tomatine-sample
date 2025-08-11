/**
 * Utility functions for the Tomatine application
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { DateRange, Session, SessionStats, TimerMode } from './types';

/**
 * Tailwind CSS class merging utility
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format time duration in milliseconds to human-readable string
 * @param ms - Duration in milliseconds
 * @param format - Format type ('mm:ss', 'h:mm:ss', 'verbose')
 * @returns Formatted time string
 */
export function formatDuration(
  ms: number,
  format: 'mm:ss' | 'h:mm:ss' | 'verbose' = 'mm:ss'
): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  switch (format) {
    case 'h:mm:ss':
      return `${hours.toString().padStart(2, '0')}:${minutes
        .toString()
        .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    case 'verbose':
      if (hours > 0) {
        return `${hours}時間${minutes}分${seconds}秒`;
      } else if (minutes > 0) {
        return `${minutes}分${seconds}秒`;
      } else {
        return `${seconds}秒`;
      }

    case 'mm:ss':
    default:
      const totalMinutes = Math.floor(ms / 60000);
      const remainingSeconds = Math.floor((ms % 60000) / 1000);
      return `${totalMinutes.toString().padStart(2, '0')}:${remainingSeconds
        .toString()
        .padStart(2, '0')}`;
  }
}

/**
 * Format time for timer display (using mm:ss or m:ss format)
 * @param ms - Duration in milliseconds
 * @param showSeconds - Whether to show seconds
 * @returns Formatted time string
 */
export function formatTime(ms: number, showSeconds: boolean = true): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (showSeconds) {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  return `${minutes}分`;
}

/**
 * Calculate remaining time for timer
 * @param targetAt - Target timestamp when timer should end
 * @returns Remaining time in milliseconds
 */
export function calculateRemaining(targetAt: number): number {
  return Math.max(0, targetAt - Date.now());
}

/**
 * Check if timer has drift (system time change or sleep)
 * @param lastUpdate - Last update timestamp
 * @param driftThreshold - Threshold in milliseconds (default: 5000)
 * @returns Whether drift was detected
 */
export function detectDrift(
  lastUpdate: number,
  driftThreshold = 5000
): boolean {
  const expectedUpdate = lastUpdate + 1000; // Expected next update (1 second)
  const actualTime = Date.now();
  return Math.abs(actualTime - expectedUpdate) > driftThreshold;
}

/**
 * Get start and end dates for a date range
 * @param range - Date range type
 * @param baseDate - Base date (default: current date)
 * @returns Object with start and end Date objects
 */
export function getDateRange(
  range: DateRange,
  baseDate: Date = new Date()
): { start: Date; end: Date } {
  const start = new Date(baseDate);
  const end = new Date(baseDate);

  switch (range) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;

    case 'week':
      // Start from Monday
      const dayOfWeek = start.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      start.setDate(start.getDate() - daysToMonday);
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;

    case 'month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(end.getMonth() + 1, 0); // Last day of current month
      end.setHours(23, 59, 59, 999);
      break;

    case 'all':
      start.setFullYear(2020, 0, 1); // Arbitrary early date
      start.setHours(0, 0, 0, 0);
      end.setFullYear(2099, 11, 31); // Arbitrary future date
      end.setHours(23, 59, 59, 999);
      break;
  }

  return { start, end };
}

/**
 * Calculate session statistics from an array of sessions
 * @param sessions - Array of completed sessions
 * @returns Calculated statistics
 */
export function calculateStats(sessions: Session[]): SessionStats {
  if (sessions.length === 0) {
    return {
      totalSessions: 0,
      totalFocusTime: 0,
      totalBreakTime: 0,
      averageSessionLength: 0,
      completionRate: 0,
      longestStreak: 0,
      currentStreak: 0,
      mostProductiveHour: 9, // Default to 9 AM
    };
  }

  const completedSessions = sessions.filter(s => s.completed);
  const totalFocusTime = completedSessions.reduce(
    (sum, s) => sum + (s.actualFocusMs || s.focusMs),
    0
  );
  const totalBreakTime = completedSessions.reduce(
    (sum, s) => sum + (s.actualBreakMs || s.breakMs),
    0
  );
  const averageSessionLength = totalFocusTime / completedSessions.length || 0;
  const completionRate = (completedSessions.length / sessions.length) * 100;

  // Calculate streaks (consecutive days with sessions)
  const dailySessions = new Map<string, Session[]>();
  sessions.forEach(session => {
    const date = session.startAt.toISOString().split('T')[0];
    if (!dailySessions.has(date)) {
      dailySessions.set(date, []);
    }
    dailySessions.get(date)!.push(session);
  });

  const sortedDates = Array.from(dailySessions.keys()).sort();
  let longestStreak = 0;
  let currentStreak = 0;
  let tempStreak = 0;

  for (let i = 0; i < sortedDates.length; i++) {
    const currentDate = new Date(sortedDates[i]);
    const prevDate = i > 0 ? new Date(sortedDates[i - 1]) : null;

    if (!prevDate || isConsecutiveDay(prevDate, currentDate)) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }

    // Check if this is part of current streak (from today backwards)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sessionDate = new Date(sortedDates[i]);
    if (sessionDate.getTime() === today.getTime()) {
      currentStreak = tempStreak;
    }
  }

  longestStreak = Math.max(longestStreak, tempStreak);

  // Find most productive hour
  const hourCounts = new Array(24).fill(0);
  completedSessions.forEach(session => {
    const hour = session.startAt.getHours();
    hourCounts[hour]++;
  });
  const mostProductiveHour = hourCounts.indexOf(Math.max(...hourCounts));

  return {
    totalSessions: sessions.length,
    totalFocusTime,
    totalBreakTime,
    averageSessionLength,
    completionRate,
    longestStreak,
    currentStreak,
    mostProductiveHour,
  };
}

/**
 * Check if two dates are consecutive days
 * @param date1 - First date
 * @param date2 - Second date
 * @returns Whether dates are consecutive days
 */
function isConsecutiveDay(date1: Date, date2: Date): boolean {
  const nextDay = new Date(date1);
  nextDay.setDate(nextDay.getDate() + 1);
  return (
    nextDay.getFullYear() === date2.getFullYear() &&
    nextDay.getMonth() === date2.getMonth() &&
    nextDay.getDate() === date2.getDate()
  );
}

/**
 * Get localized timer mode name
 * @param mode - Timer mode
 * @returns Localized name
 */
export function getTimerModeLabel(mode: TimerMode): string {
  switch (mode) {
    case 'warmup':
      return 'ウォームアップ';
    case 'focus':
      return '集中時間';
    case 'break':
      return '休憩時間';
    case 'idle':
    default:
      return '待機中';
  }
}

/**
 * Generate unique ID for client-side records
 * @returns Unique string ID
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Safely parse JSON with error handling
 * @param json - JSON string to parse
 * @param defaultValue - Default value if parsing fails
 * @returns Parsed object or default value
 */
export function safeJsonParse<T>(json: string, defaultValue: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Debounce function to limit rapid calls
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): T {
  let timeout: NodeJS.Timeout;
  return ((...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}

/**
 * Check if the app is running in development mode
 * @returns Whether in development mode
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Check if the app is running as PWA
 * @returns Whether running as PWA
 */
export function isPWA(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}
