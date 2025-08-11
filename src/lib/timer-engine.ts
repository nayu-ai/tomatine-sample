/**
 * Timer Engine - Core timing logic for Tomatine
 * Implements high-precision timer with drift detection and recovery
 */

import type { TimerMode } from './types';
import { TIMER_CONSTANTS } from './types';
import { calculateRemaining, detectDrift } from './utils';

export interface TimerEngineConfig {
  onTick: (remaining: number) => void;
  onComplete: () => void;
  onDriftDetected: (drift: number) => void;
  updateInterval?: number;
  driftThreshold?: number;
}

export interface TimerState {
  mode: TimerMode;
  targetAt: number | null;
  startedAt: number | null;
  pausedAt: number | null;
  lastUpdate: number;
  isRunning: boolean;
}

/**
 * High-precision timer engine with drift detection
 */
export class TimerEngine {
  private config: Required<TimerEngineConfig>;
  private state: TimerState;
  private updateId: number | null = null;
  private intervalId: NodeJS.Timeout | null = null;
  private isVisible = true;
  private rafSupported = typeof requestAnimationFrame !== 'undefined';

  constructor(config: TimerEngineConfig) {
    this.config = {
      updateInterval: TIMER_CONSTANTS.TIMER_UPDATE_INTERVAL,
      driftThreshold: TIMER_CONSTANTS.DRIFT_THRESHOLD,
      ...config,
    };

    this.state = {
      mode: 'idle',
      targetAt: null,
      startedAt: null,
      pausedAt: null,
      lastUpdate: Date.now(),
      isRunning: false,
    };

    this.setupVisibilityHandling();
  }

  /**
   * Start timer with specified duration
   */
  start(durationMs: number, mode: TimerMode = 'focus'): void {
    const now = Date.now();

    this.state = {
      mode,
      targetAt: now + durationMs,
      startedAt: now,
      pausedAt: null,
      lastUpdate: now,
      isRunning: true,
    };

    this.startUpdateLoop();
  }

  /**
   * Pause the timer
   */
  pause(): void {
    if (!this.state.isRunning || this.state.pausedAt) return;

    this.state.pausedAt = Date.now();
    this.state.isRunning = false;
    this.state.lastUpdate = Date.now();

    this.stopUpdateLoop();
  }

  /**
   * Resume the timer from pause
   */
  resume(): void {
    if (this.state.isRunning || !this.state.pausedAt || !this.state.targetAt)
      return;

    const now = Date.now();
    const pausedDuration = now - this.state.pausedAt;

    // Extend target time by the paused duration
    this.state.targetAt += pausedDuration;
    this.state.pausedAt = null;
    this.state.isRunning = true;
    this.state.lastUpdate = now;

    this.startUpdateLoop();
  }

  /**
   * Stop the timer completely
   */
  stop(): void {
    this.state = {
      mode: 'idle',
      targetAt: null,
      startedAt: null,
      pausedAt: null,
      lastUpdate: Date.now(),
      isRunning: false,
    };

    this.stopUpdateLoop();
  }

  /**
   * Get current remaining time
   */
  getRemaining(): number {
    if (!this.state.targetAt || this.state.pausedAt) return 0;
    return calculateRemaining(this.state.targetAt);
  }

  /**
   * Get current timer state (readonly)
   */
  getState(): Readonly<TimerState> {
    return { ...this.state };
  }

  /**
   * Check if timer has drift and recalculate if needed
   */
  checkAndCorrectDrift(): boolean {
    if (!this.state.isRunning || !this.state.targetAt) return false;

    const hasDrift = detectDrift(
      this.state.lastUpdate,
      this.config.driftThreshold
    );

    if (hasDrift) {
      const now = Date.now();
      const expectedTime = this.state.lastUpdate + this.config.updateInterval;
      const actualDrift = Math.abs(now - expectedTime);

      this.config.onDriftDetected(actualDrift);
      this.state.lastUpdate = now;

      // Force update with corrected time
      this.performUpdate();
      return true;
    }

    return false;
  }

  /**
   * Set timer to specific target time (for recovery)
   */
  setTargetTime(targetAt: number, mode: TimerMode, startedAt?: number): void {
    const now = Date.now();

    this.state = {
      mode,
      targetAt,
      startedAt: startedAt || now,
      pausedAt: null,
      lastUpdate: now,
      isRunning: targetAt > now,
    };

    if (this.state.isRunning) {
      this.startUpdateLoop();
    }
  }

  /**
   * Add time to current timer (extend session)
   */
  addTime(additionalMs: number): void {
    if (!this.state.targetAt) return;

    this.state.targetAt += additionalMs;
    this.state.lastUpdate = Date.now();
  }

  /**
   * Subtract time from current timer
   */
  subtractTime(reduceMs: number): void {
    if (!this.state.targetAt) return;

    const now = Date.now();
    this.state.targetAt = Math.max(now, this.state.targetAt - reduceMs);
    this.state.lastUpdate = now;
  }

  /**
   * Clean up timer engine
   */
  destroy(): void {
    this.stop();
    this.removeVisibilityHandling();
  }

  /**
   * Start the update loop using appropriate method
   */
  private startUpdateLoop(): void {
    if (this.updateId || this.intervalId) return;

    if (this.rafSupported && this.isVisible) {
      this.scheduleRAFUpdate();
    } else {
      this.scheduleIntervalUpdate();
    }
  }

  /**
   * Stop the update loop
   */
  private stopUpdateLoop(): void {
    if (this.updateId) {
      cancelAnimationFrame(this.updateId);
      this.updateId = null;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Schedule update using requestAnimationFrame
   */
  private scheduleRAFUpdate(): void {
    if (!this.state.isRunning) return;

    this.updateId = requestAnimationFrame(() => {
      this.performUpdate();

      if (this.state.isRunning) {
        // Continue RAF loop, but throttle to our desired interval
        setTimeout(() => {
          this.scheduleRAFUpdate();
        }, this.config.updateInterval);
      }
    });
  }

  /**
   * Schedule update using setInterval
   */
  private scheduleIntervalUpdate(): void {
    if (this.intervalId) return;

    this.intervalId = setInterval(() => {
      if (this.state.isRunning) {
        this.performUpdate();
      }
    }, this.config.updateInterval);
  }

  /**
   * Perform the actual timer update
   */
  private performUpdate(): void {
    if (!this.state.targetAt || this.state.pausedAt) return;

    const now = Date.now();
    const remaining = calculateRemaining(this.state.targetAt);

    this.state.lastUpdate = now;

    // Call tick callback
    this.config.onTick(remaining);

    // Check for completion
    if (remaining <= 0 && this.state.isRunning) {
      this.state.isRunning = false;
      this.stopUpdateLoop();
      this.config.onComplete();
    }
  }

  /**
   * Setup page visibility change handling
   */
  private setupVisibilityHandling(): void {
    if (typeof document === 'undefined') return;

    const handleVisibilityChange = () => {
      const wasVisible = this.isVisible;
      this.isVisible = !document.hidden;

      if (this.state.isRunning) {
        if (this.isVisible && !wasVisible) {
          // Page became visible - check for drift and switch to RAF if supported
          this.checkAndCorrectDrift();

          if (this.rafSupported && this.intervalId) {
            this.stopUpdateLoop();
            this.startUpdateLoop(); // Will use RAF since isVisible is true
          }
        } else if (!this.isVisible && wasVisible) {
          // Page became hidden - switch to interval-based updates
          if (this.rafSupported && this.updateId) {
            this.stopUpdateLoop();
            this.scheduleIntervalUpdate();
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    this.visibilityHandler = handleVisibilityChange;
  }

  private visibilityHandler?: () => void;

  /**
   * Remove visibility change handling
   */
  private removeVisibilityHandling(): void {
    if (typeof document !== 'undefined' && this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
    }
  }
}

/**
 * Factory function to create timer engine with common configuration
 */
export function createTimerEngine(config: TimerEngineConfig): TimerEngine {
  return new TimerEngine(config);
}

/**
 * Utility function to format timer duration for display
 */
export function formatTimerDisplay(
  remaining: number,
  showSeconds = false,
  compact = false
): string {
  const totalSeconds = Math.ceil(remaining / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (compact) {
    if (showSeconds) {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}m`;
    }
  }

  if (showSeconds) {
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}分`;
  }
}

/**
 * Calculate progress percentage for circular progress indicators
 */
export function calculateProgress(
  remaining: number,
  totalDuration: number
): number {
  if (totalDuration <= 0) return 0;
  const elapsed = totalDuration - remaining;
  return Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));
}

/**
 * Generate completion sound frequency based on timer mode
 */
export function getCompletionTone(mode: TimerMode): {
  frequency: number;
  duration: number;
  pattern: 'single' | 'double' | 'triple';
} {
  switch (mode) {
    case 'warmup':
      return { frequency: 440, duration: 200, pattern: 'single' }; // A4 note
    case 'focus':
      return { frequency: 523.25, duration: 300, pattern: 'double' }; // C5 note
    case 'break':
      return { frequency: 349.23, duration: 250, pattern: 'triple' }; // F4 note
    default:
      return { frequency: 440, duration: 200, pattern: 'single' };
  }
}

/**
 * Simple Web Audio API sound player for completion notifications
 */
export class SoundPlayer {
  private audioContext: AudioContext | null = null;
  private isEnabled = true;

  constructor() {
    if (typeof window !== 'undefined' && 'AudioContext' in window) {
      this.audioContext = new AudioContext();
    }
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  async playCompletionSound(mode: TimerMode): Promise<void> {
    if (!this.isEnabled || !this.audioContext) return;

    const { frequency, duration, pattern } = getCompletionTone(mode);

    try {
      // Resume audio context if suspended (required for user gesture)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const playTone = (freq: number, dur: number, delay = 0) => {
        setTimeout(() => {
          const oscillator = this.audioContext!.createOscillator();
          const gainNode = this.audioContext!.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(this.audioContext!.destination);

          oscillator.frequency.value = freq;
          oscillator.type = 'sine';

          gainNode.gain.setValueAtTime(0, this.audioContext!.currentTime);
          gainNode.gain.linearRampToValueAtTime(
            0.1,
            this.audioContext!.currentTime + 0.01
          );
          gainNode.gain.linearRampToValueAtTime(
            0,
            this.audioContext!.currentTime + dur / 1000
          );

          oscillator.start();
          oscillator.stop(this.audioContext!.currentTime + dur / 1000);
        }, delay);
      };

      switch (pattern) {
        case 'single':
          playTone(frequency, duration);
          break;
        case 'double':
          playTone(frequency, duration);
          playTone(frequency, duration, duration + 100);
          break;
        case 'triple':
          playTone(frequency, duration);
          playTone(frequency, duration, duration + 100);
          playTone(frequency, duration, (duration + 100) * 2);
          break;
      }
    } catch {
      // 完了音の再生に失敗
    }
  }
}

// Export singleton sound player instance
export const soundPlayer = new SoundPlayer();
