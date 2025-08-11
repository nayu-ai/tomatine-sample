/**
 * Timer store using Zustand
 * Manages timer state, countdown logic, and session lifecycle
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { TimerMode, Mood } from '../types';
import { databaseService } from '../database';
import { calculateRemaining, detectDrift } from '../utils';
import { TIMER_CONSTANTS } from '../types';

export interface TimerStore {
  // Current timer state
  mode: TimerMode;
  targetAt: number | null;
  startedAt: number | null;
  pausedAt: number | null;
  remaining: number;
  sessionId: number | null;
  lastUpdate: number;

  // Current session configuration
  focusDuration: number;
  breakDuration: number;
  warmupDuration: number;

  // Session metadata
  moodStart: Mood | null;
  taskNote: string;

  // Timer control flags
  isRunning: boolean;
  isPaused: boolean;
  isWarmupEnabled: boolean;

  // Actions
  startWarmup: () => Promise<void>;
  startFocus: (skipWarmup?: boolean) => Promise<void>;
  startBreak: () => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  skip: () => Promise<void>;
  stop: () => Promise<void>;
  complete: () => Promise<void>;

  // Configuration
  setFocusDuration: (duration: number) => void;
  setBreakDuration: (duration: number) => void;
  setWarmupDuration: (duration: number) => void;
  setWarmupEnabled: (enabled: boolean) => void;
  setMoodStart: (mood: Mood | null) => void;
  setTaskNote: (note: string) => void;

  // Internal state management
  updateRemaining: () => void;
  checkDrift: () => boolean;
  recalculateTime: () => void;
  persistState: () => Promise<void>;
  restoreState: () => Promise<void>;
  clearState: () => Promise<void>;

  // Session recovery
  hasRecoverableSession: () => Promise<boolean>;
  recoverSession: () => Promise<boolean>;
  discardRecovery: () => Promise<void>;

  // Callbacks for external components
  onSessionCompleted?: () => void;
  setOnSessionCompleted: (callback: (() => void) | undefined) => void;
}

export const useTimerStore = create<TimerStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    mode: 'idle',
    targetAt: null,
    startedAt: null,
    pausedAt: null,
    remaining: 0,
    sessionId: null,
    lastUpdate: Date.now(),

    focusDuration: 25 * 60 * 1000, // 25 minutes
    breakDuration: 5 * 60 * 1000, // 5 minutes
    warmupDuration: 3 * 60 * 1000, // 3 minutes

    moodStart: null,
    taskNote: '',

    isRunning: false,
    isPaused: false,
    isWarmupEnabled: true,

    // Callback for external components
    onSessionCompleted: undefined,

    // Timer control actions
    startWarmup: async () => {
      const state = get();
      const now = Date.now();
      const targetAt = now + state.warmupDuration;

      // Create session record
      const sessionId = await databaseService.createSession({
        startAt: new Date(),
        focusMs: state.focusDuration,
        breakMs: state.breakDuration,
        moodStart: state.moodStart || undefined,
        taskNote: state.taskNote,
        completed: false,
      });

      set({
        mode: 'warmup',
        startedAt: now,
        targetAt,
        pausedAt: null,
        sessionId,
        isRunning: true,
        isPaused: false,
        lastUpdate: now,
      });

      await get().persistState();
    },

    startFocus: async (skipWarmup = false) => {
      const state = get();
      const now = Date.now();
      const targetAt = now + state.focusDuration;

      let sessionId = state.sessionId;

      // Create new session if starting fresh (not from warmup)
      if (!sessionId || skipWarmup) {
        sessionId = await databaseService.createSession({
          startAt: new Date(),
          focusMs: state.focusDuration,
          breakMs: state.breakDuration,
          moodStart: state.moodStart || undefined,
          taskNote: state.taskNote,
          completed: false,
          warmupSkipped: skipWarmup,
        });
      }

      set({
        mode: 'focus',
        startedAt: now,
        targetAt,
        pausedAt: null,
        sessionId,
        isRunning: true,
        isPaused: false,
        lastUpdate: now,
      });

      await get().persistState();
    },

    startBreak: async () => {
      const state = get();
      const now = Date.now();
      const targetAt = now + state.breakDuration;

      set({
        mode: 'break',
        startedAt: now,
        targetAt,
        pausedAt: null,
        isRunning: true,
        isPaused: false,
        lastUpdate: now,
      });

      await get().persistState();
    },

    pause: async () => {
      const now = Date.now();
      set({
        pausedAt: now,
        isRunning: false,
        isPaused: true,
        lastUpdate: now,
      });

      await get().persistState();
    },

    resume: async () => {
      const state = get();
      if (!state.pausedAt || !state.targetAt) return;

      const now = Date.now();
      const pausedDuration = now - state.pausedAt;
      const newTargetAt = state.targetAt + pausedDuration;

      set({
        targetAt: newTargetAt,
        pausedAt: null,
        isRunning: true,
        isPaused: false,
        lastUpdate: now,
      });

      await get().persistState();
    },

    skip: async () => {
      const state = get();

      if (state.mode === 'warmup') {
        await get().startFocus();
        return;
      }

      if (state.mode === 'focus') {
        await get().complete();
        return;
      }

      if (state.mode === 'break') {
        await get().stop();
        return;
      }
    },

    stop: async () => {
      set({
        mode: 'idle',
        targetAt: null,
        startedAt: null,
        pausedAt: null,
        remaining: 0,
        sessionId: null,
        isRunning: false,
        isPaused: false,
        moodStart: null,
        taskNote: '',
        lastUpdate: Date.now(),
      });

      await get().clearState();
    },

    complete: async () => {
      const state = get();

      // Update session as completed if we have one
      if (state.sessionId && state.mode === 'focus') {
        const actualFocusMs = state.startedAt
          ? Date.now() - state.startedAt
          : state.focusDuration;

        // moodEnd 更新判定（開始時と異なる場合のみ保存）
        let moodEnd: Mood | undefined;
        try {
          if (state.moodStart) {
            const existing = await databaseService.getSession(state.sessionId);
            if (existing && existing.moodStart !== state.moodStart) {
              moodEnd = state.moodStart;
            }
          }
        } catch {
          // 取得失敗時は moodEnd 更新をスキップ
        }

        await databaseService.completeSession(state.sessionId, {
          endAt: new Date(),
          actualFocusMs,
          ...(moodEnd ? { moodEnd } : {}),
        });

        // セッション完了時のコールバックを実行
        if (state.onSessionCompleted) {
          state.onSessionCompleted();
        }

        // Start break automatically
        await get().startBreak();
        return;
      }

      // Complete break or other modes
      if (state.mode === 'break') {
        await get().stop();
        return;
      }

      await get().stop();
    },

    // Configuration actions
    setFocusDuration: duration => {
      const clampedDuration = Math.max(
        TIMER_CONSTANTS.MIN_FOCUS_DURATION,
        Math.min(duration, TIMER_CONSTANTS.MAX_FOCUS_DURATION)
      );
      set({ focusDuration: clampedDuration });
    },

    setBreakDuration: duration => {
      const clampedDuration = Math.max(
        TIMER_CONSTANTS.MIN_BREAK_DURATION,
        Math.min(duration, TIMER_CONSTANTS.MAX_BREAK_DURATION)
      );
      set({ breakDuration: clampedDuration });
    },

    setWarmupDuration: duration => {
      const clampedDuration = Math.max(
        TIMER_CONSTANTS.MIN_WARMUP_DURATION,
        Math.min(duration, TIMER_CONSTANTS.MAX_WARMUP_DURATION)
      );
      set({ warmupDuration: clampedDuration });
    },

    setWarmupEnabled: enabled => set({ isWarmupEnabled: enabled }),
    setMoodStart: mood => set({ moodStart: mood }),
    setTaskNote: note => set({ taskNote: note }),
    setOnSessionCompleted: callback => set({ onSessionCompleted: callback }),

    // Internal state management
    updateRemaining: () => {
      const state = get();
      if (!state.targetAt || state.isPaused) return;

      const now = Date.now();
      const remaining = calculateRemaining(state.targetAt);

      set({
        remaining,
        lastUpdate: now,
      });

      // Auto-complete when time runs out
      if (remaining === 0 && state.isRunning) {
        get().complete();
      }
    },

    checkDrift: () => {
      const state = get();
      return detectDrift(state.lastUpdate, TIMER_CONSTANTS.DRIFT_THRESHOLD);
    },

    recalculateTime: () => {
      const state = get();
      if (!state.targetAt) return;

      const now = Date.now();
      const remaining = calculateRemaining(state.targetAt);

      set({
        remaining,
        lastUpdate: now,
      });
    },

    persistState: async () => {
      const state = get();
      if (state.mode === 'idle') return;

      await databaseService.setTimerState({
        mode: state.mode,
        startedAt: state.startedAt || undefined,
        targetAt: state.targetAt || undefined,
        pausedAt: state.pausedAt || undefined,
        sessionId: state.sessionId || undefined,
        lastUpdate: state.lastUpdate,
      });
    },

    restoreState: async () => {
      // Only restore state on client side
      if (typeof window === 'undefined') return;

      const timerState = await databaseService.getTimerState();
      if (!timerState) return;

      const now = Date.now();
      let remaining = 0;

      if (timerState.targetAt && !timerState.pausedAt) {
        remaining = calculateRemaining(timerState.targetAt);
      }

      set({
        mode: timerState.mode,
        startedAt: timerState.startedAt,
        targetAt: timerState.targetAt,
        pausedAt: timerState.pausedAt,
        sessionId: timerState.sessionId,
        remaining,
        isRunning:
          timerState.mode !== 'idle' && !timerState.pausedAt && remaining > 0,
        isPaused: !!timerState.pausedAt,
        lastUpdate: now,
      });
    },

    clearState: async () => {
      await databaseService.clearTimerState();
    },

    // Session recovery
    hasRecoverableSession: async () => {
      const timerState = await databaseService.getTimerState();
      return !!timerState && timerState.mode !== 'idle';
    },

    recoverSession: async () => {
      const timerState = await databaseService.getTimerState();
      if (!timerState || timerState.mode === 'idle') return false;

      await get().restoreState();
      get().recalculateTime();

      return true;
    },

    discardRecovery: async () => {
      const state = get();
      if (state.sessionId) {
        await databaseService.deleteSession(state.sessionId);
      }
      await get().clearState();
      await get().stop();
    },
  }))
);

// Timer update loop - runs when timer is active
let updateInterval: NodeJS.Timeout | null = null;

// Subscribe to timer state changes to manage update loop
useTimerStore.subscribe(
  state => state.isRunning,
  isRunning => {
    if (isRunning && !updateInterval) {
      updateInterval = setInterval(() => {
        useTimerStore.getState().updateRemaining();
      }, TIMER_CONSTANTS.TIMER_UPDATE_INTERVAL);
    } else if (!isRunning && updateInterval) {
      clearInterval(updateInterval);
      updateInterval = null;
    }
  }
);

// Page visibility handling for drift detection
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      const store = useTimerStore.getState();
      if (store.isRunning && store.checkDrift()) {
        store.recalculateTime();
      }
    }
  });
}

// Initialize store with user preferences (client-side only)
if (typeof window !== 'undefined') {
  useTimerStore.getState().restoreState();
}
