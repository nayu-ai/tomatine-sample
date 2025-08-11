/**
 * Dexie database implementation for Tomatine
 * Provides offline-first data storage with IndexedDB
 */

import Dexie, { type EntityTable } from 'dexie';
import type {
  Session,
  UserPref,
  TimerState,
  DateRange,
  SessionStats,
} from './types';
import { DEFAULT_USER_PREFS } from './types';
import { calculateStats, getDateRange } from './utils';

/**
 * Database schema definition
 * Version 1: Initial MVP schema
 */
export class TeoTimerDB extends Dexie {
  // Define table types with proper indexing
  sessions!: EntityTable<Session, 'id'>;
  userPrefs!: EntityTable<UserPref, 'id'>;
  timerState!: EntityTable<TimerState, 'id'>;

  constructor() {
    super('TeoTimerDB');

    // Schema version 1 - MVP
    this.version(1).stores({
      // Sessions table with indexing for date/week aggregation
      sessions: '++id, startAt, completed, [startAt+completed]',
      // User preferences - singleton table
      userPrefs: 'id',
      // Timer state - singleton table for crash recovery
      timerState: 'id',
    });

    // Add hooks for data validation and defaults
    this.sessions.hook('creating', function (primKey, obj) {
      // Ensure required fields have defaults
      if (!obj.hasOwnProperty('completed')) {
        obj.completed = false;
      }
      if (!obj.startAt) {
        obj.startAt = new Date();
      }
    });

    this.userPrefs.hook('creating', function (primKey, obj) {
      // Ensure user preferences have default values
      if (!obj.id) {
        obj.id = 'singleton';
      }
      // Apply defaults for missing properties
      Object.entries(DEFAULT_USER_PREFS).forEach(([key, value]) => {
        if (!obj.hasOwnProperty(key)) {
          // 型安全に既定値を補完
          (obj as any)[key] = value;
        }
      });
    });

    this.timerState.hook('creating', function (primKey, obj) {
      // Ensure timer state has correct ID
      if (!obj.id) {
        obj.id = 'current';
      }
    });
  }
}

// Create database instance only on client side
export const db = typeof window !== 'undefined' ? new TeoTimerDB() : null;

/**
 * Database service class providing high-level data operations
 */
export class DatabaseService {
  private db: TeoTimerDB | null;

  constructor(database: TeoTimerDB | null = db) {
    this.db = database;
  }

  private ensureClientSide(): TeoTimerDB {
    if (!this.db) {
      throw new Error('Database not available on server side');
    }
    return this.db;
  }

  // ===== SESSION OPERATIONS =====

  /**
   * Create a new session
   */
  async createSession(sessionData: Omit<Session, 'id'>): Promise<number> {
    const db = this.ensureClientSide();
    const id = await db.sessions.add({
      ...sessionData,
      startAt: sessionData.startAt || new Date(),
      completed: false,
    });
    return id as number;
  }

  /**
   * Update an existing session
   */
  async updateSession(
    id: number,
    updates: Partial<Omit<Session, 'id'>>
  ): Promise<void> {
    const db = this.ensureClientSide();
    await db.sessions.update(id, updates);
  }

  /**
   * Mark a session as completed
   */
  async completeSession(
    id: number,
    updates?: Partial<
      Pick<Session, 'endAt' | 'actualFocusMs' | 'actualBreakMs' | 'moodEnd'>
    >
  ): Promise<void> {
    const db = this.ensureClientSide();
    await db.sessions.update(id, {
      completed: true,
      endAt: new Date(),
      ...updates,
    });
  }

  /**
   * Get session by ID
   */
  async getSession(id: number): Promise<Session | undefined> {
    const db = this.ensureClientSide();
    return await db.sessions.get(id);
  }

  /**
   * Get sessions within a date range
   */
  async getSessionsByDateRange(
    range: DateRange,
    baseDate?: Date
  ): Promise<Session[]> {
    const db = this.ensureClientSide();
    const { start, end } = getDateRange(range, baseDate);
    return await db.sessions
      .where('startAt')
      .between(start, end, true, true)
      .toArray();
  }

  /**
   * Get recent sessions (for dashboard)
   */
  async getRecentSessions(limit: number = 10): Promise<Session[]> {
    const db = this.ensureClientSide();
    return await db.sessions
      .orderBy('startAt')
      .reverse()
      .limit(limit)
      .toArray();
  }

  /**
   * Get completed sessions count by date range
   */
  async getCompletedSessionsCount(range: DateRange): Promise<number> {
    const db = this.ensureClientSide();
    const { start, end } = getDateRange(range);
    return await db.sessions
      .where('[startAt+completed]')
      .between([start, true], [end, true])
      .count();
  }

  /**
   * Delete session
   */
  async deleteSession(id: number): Promise<void> {
    const db = this.ensureClientSide();
    await db.sessions.delete(id);
  }

  /**
   * Get session statistics for a date range
   */
  async getSessionStats(range: DateRange): Promise<SessionStats> {
    const sessions = await this.getSessionsByDateRange(range);
    return calculateStats(sessions);
  }

  // ===== USER PREFERENCES OPERATIONS =====

  /**
   * Get user preferences (singleton)
   */
  async getUserPrefs(): Promise<UserPref> {
    const db = this.ensureClientSide();
    let prefs = await db.userPrefs.get('singleton');

    if (!prefs) {
      // Create default preferences if none exist
      const defaultPrefs: UserPref = {
        id: 'singleton',
        ...DEFAULT_USER_PREFS,
      };
      await db.userPrefs.add(defaultPrefs);
      prefs = defaultPrefs;
    }

    return prefs;
  }

  /**
   * Update user preferences
   */
  async updateUserPrefs(updates: Partial<Omit<UserPref, 'id'>>): Promise<void> {
    const db = this.ensureClientSide();
    await db.userPrefs.update('singleton', updates);
  }

  /**
   * Reset user preferences to defaults
   */
  async resetUserPrefs(): Promise<void> {
    const db = this.ensureClientSide();
    await db.userPrefs.update('singleton', DEFAULT_USER_PREFS);
  }

  // ===== TIMER STATE OPERATIONS =====

  /**
   * Get current timer state
   */
  async getTimerState(): Promise<TimerState | undefined> {
    const db = this.ensureClientSide();
    return await db.timerState.get('current');
  }

  /**
   * Set timer state (for crash recovery)
   */
  async setTimerState(state: Omit<TimerState, 'id'>): Promise<void> {
    const db = this.ensureClientSide();
    await db.timerState.put({
      id: 'current',
      ...state,
      lastUpdate: Date.now(),
    });
  }

  /**
   * Clear timer state
   */
  async clearTimerState(): Promise<void> {
    const db = this.ensureClientSide();
    await db.timerState.delete('current');
  }

  /**
   * Update timer state
   */
  async updateTimerState(
    updates: Partial<Omit<TimerState, 'id'>>
  ): Promise<void> {
    const db = this.ensureClientSide();
    await db.timerState.update('current', {
      ...updates,
      lastUpdate: Date.now(),
    });
  }

  // ===== DATABASE MANAGEMENT =====

  /**
   * Export all data for backup
   */
  async exportData(): Promise<{
    sessions: Session[];
    userPrefs: UserPref | null;
    timestamp: string;
  }> {
    const db = this.ensureClientSide();
    const [sessions, userPrefs] = await Promise.all([
      db.sessions.toArray(),
      this.getUserPrefs().catch(() => null),
    ]);

    return {
      sessions,
      userPrefs,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Import data from backup (destructive operation)
   */
  async importData(data: {
    sessions: Session[];
    userPrefs: UserPref | null;
  }): Promise<void> {
    const db = this.ensureClientSide();
    await db.transaction('rw', [db.sessions, db.userPrefs], async () => {
      // Clear existing data
      await db.sessions.clear();
      await db.userPrefs.clear();

      // Import new data
      if (data.sessions.length > 0) {
        await db.sessions.bulkAdd(data.sessions);
      }
      if (data.userPrefs) {
        await db.userPrefs.add(data.userPrefs);
      }
    });
  }

  /**
   * Clear all user data (for privacy/testing)
   */
  async clearAllData(): Promise<void> {
    const db = this.ensureClientSide();
    await db.transaction(
      'rw',
      [db.sessions, db.userPrefs, db.timerState],
      async () => {
        await Promise.all([
          db.sessions.clear(),
          db.userPrefs.clear(),
          db.timerState.clear(),
        ]);
      }
    );
  }

  /**
   * Get database storage usage (approximate)
   */
  async getStorageInfo(): Promise<{
    sessionCount: number;
    estimatedSizeKB: number;
  }> {
    const db = this.ensureClientSide();
    const [sessionCount, sessions] = await Promise.all([
      db.sessions.count(),
      db.sessions.toArray(),
    ]);

    // Rough estimation of storage usage
    const estimatedSizeKB = Math.round(
      (JSON.stringify(sessions).length * 2) / 1024
    );

    return {
      sessionCount,
      estimatedSizeKB,
    };
  }

  /**
   * Check if database is healthy and accessible
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.db) return false;
      await this.getUserPrefs();
      return true;
    } catch {
      // データベースヘルスチェック失敗
      return false;
    }
  }
}

// Export singleton instance
export const databaseService = new DatabaseService();

// Database error handling is done in individual methods

// Initialize database on first import (client-side only)
if (typeof window !== 'undefined' && db) {
  db.open().catch(() => {
    // データベースオープン失敗
  });
}
