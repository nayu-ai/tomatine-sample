/**
 * Timer hook for managing timer state and operations
 * Provides timer controls, session recovery, and notification management
 */

import { useCallback, useEffect, useRef } from 'react';
import { useTimerStore, useUIStore, useUserStore } from '@/lib/stores';
import { TimerEngine, SoundPlayer } from '@/lib/timer-engine';
import { TimerMode } from '@/lib/types';

// Sound player instance
const soundPlayer = new SoundPlayer();

/**
 * Main timer hook
 */
export function useTimer() {
  const { mode, isRunning, isPaused } = useTimerStore(state => ({
    mode: state.mode,
    isRunning: state.isRunning,
    isPaused: state.isPaused,
  }));

  const { showWarningToast } = useUIStore(state => ({
    showWarningToast: state.showWarningToast,
  }));

  const { complete } = useTimerStore();

  // Handle timer completion with notifications and sounds
  const handleTimerComplete = useCallback(
    async (completedMode: TimerMode) => {
      // Get sound and notification settings from stores
      const { soundEnabled } = useUserStore.getState();
      const { notificationPermission, showNotification } =
        useUIStore.getState();

      // Play completion sound if enabled
      if (soundEnabled) {
        soundPlayer.playCompletionSound(completedMode);
      }

      // Show notifications
      const messages = {
        warmup: {
          title: 'ウォームアップ完了！',
          body: '集中時間を開始しましょう',
          toast: 'ウォームアップが完了しました！集中時間を始めます。',
        },
        focus: {
          title: '集中時間完了！',
          body: '素晴らしい集中でした。休憩時間です。',
          toast: '集中時間が完了しました！お疲れ様でした。',
        },
        break: {
          title: '休憩時間完了！',
          body: '次のセッションを始める準備はできましたか？',
          toast: '休憩時間が終わりました。次のセッションの準備をしましょう。',
        },
        idle: {
          title: 'セッション完了',
          body: '',
          toast: '',
        },
      };

      const message = messages[completedMode];

      // Show browser notification if permission granted
      if (notificationPermission === 'granted' && message.body) {
        showNotification(message.title, {
          body: message.body,
          icon: '/next.svg',
          badge: '/next.svg',
          tag: 'timer-complete',
          requireInteraction: true,
        });
      }

      // Show toast notification
      // トーストは別箇所で表示しているためここでは省略

      // Complete the timer in the store
      complete();
    },
    [complete]
  );

  // Timer engine reference
  const timerEngineRef = useRef<TimerEngine | null>(null);

  // Initialize timer engine
  useEffect(() => {
    timerEngineRef.current = new TimerEngine({
      onTick: () => {
        useTimerStore.getState().updateRemaining();
      },

      onComplete: () => {
        const currentMode = useTimerStore.getState().mode;
        handleTimerComplete(currentMode);
      },

      onDriftDetected: drift => {
        // Could show a warning toast for significant drift
        if (drift > 10000) {
          // More than 10 seconds
          showWarningToast(
            'システム時刻の変更を検出しました。タイマーを再調整しています。'
          );
        }
      },
    });

    return () => {
      timerEngineRef.current?.destroy();
      timerEngineRef.current = null;
    };
  }, [showWarningToast, handleTimerComplete]);

  // Use ref to stabilize handleTimerComplete for useEffect
  const handleTimerCompleteRef = useRef(handleTimerComplete);
  handleTimerCompleteRef.current = handleTimerComplete;

  // Sync timer engine with store state
  useEffect(() => {
    const engine = timerEngineRef.current;
    if (!engine) return;

    const store = useTimerStore.getState();

    if (store.targetAt && store.mode !== 'idle') {
      engine.setTargetTime(
        store.targetAt,
        store.mode,
        store.startedAt || undefined
      );
    } else if (store.mode === 'idle') {
      engine.stop();
    }
  }, [mode, isRunning]);

  return {
    mode,
    isRunning,
    isPaused,
    remaining: useTimerStore.getState().remaining,
    durations: {
      warmup: useTimerStore.getState().warmupDuration,
      focus: useTimerStore.getState().focusDuration,
      break: useTimerStore.getState().breakDuration,
    },
  };
}

/**
 * Hook for timer controls (start, pause, resume, skip, stop)
 */
export function useTimerControls() {
  const { showInfoToast, showErrorToast } = useUIStore(state => ({
    showInfoToast: state.showInfoToast,
    showErrorToast: state.showErrorToast,
  }));

  const { startWarmup, startFocus, pause, resume, skip, stop } =
    useTimerStore();

  const { isWarmupEnabled } = useUserStore();

  const startSession = useCallback(async () => {
    try {
      if (isWarmupEnabled) {
        await startWarmup();
        showInfoToast('ウォームアップを開始しました');
      } else {
        await startFocus(true); // Skip warmup
        showInfoToast('集中時間を開始しました');
      }
    } catch {
      showErrorToast('セッションの開始に失敗しました');
    }
  }, [isWarmupEnabled, startWarmup, startFocus, showInfoToast, showErrorToast]);

  const pauseSession = useCallback(async () => {
    try {
      await pause();
      showInfoToast('タイマーを一時停止しました');
    } catch {
      showErrorToast('一時停止に失敗しました');
    }
  }, [pause, showInfoToast, showErrorToast]);

  const resumeSession = useCallback(async () => {
    try {
      await resume();
      showInfoToast('タイマーを再開しました');
    } catch {
      showErrorToast('再開に失敗しました');
    }
  }, [resume, showInfoToast, showErrorToast]);

  const skipSession = useCallback(async () => {
    try {
      await skip();
      showInfoToast('セッションをスキップしました');
    } catch {
      showErrorToast('スキップに失敗しました');
    }
  }, [skip, showInfoToast, showErrorToast]);

  const stopSession = useCallback(async () => {
    try {
      await stop();
      showInfoToast('セッションを停止しました');
    } catch {
      showErrorToast('停止に失敗しました');
    }
  }, [stop, showInfoToast, showErrorToast]);

  return {
    startSession,
    pauseSession,
    resumeSession,
    skipSession,
    stopSession,
  };
}

/**
 * Hook for session recovery functionality
 */
export function useSessionRecovery() {
  const { hasRecoverableSession, recoverSession, discardRecovery } =
    useTimerStore();

  const {
    isRecoveryModalOpen,
    openRecoveryModal,
    closeRecoveryModal,
    showSuccessToast,
    showErrorToast,
    showInfoToast,
  } = useUIStore(state => ({
    isRecoveryModalOpen: state.isRecoveryModalOpen,
    openRecoveryModal: state.openRecoveryModal,
    closeRecoveryModal: state.closeRecoveryModal,
    showSuccessToast: state.showSuccessToast,
    showErrorToast: state.showErrorToast,
    showInfoToast: state.showInfoToast,
  }));

  // Check for recoverable session on mount
  useEffect(() => {
    const checkRecovery = async () => {
      try {
        const hasSession = await hasRecoverableSession();
        if (hasSession) {
          openRecoveryModal();
        }
      } catch {
        // エラーログは削除し、ユーザーには通知しない
      }
    };

    checkRecovery();
  }, [hasRecoverableSession, openRecoveryModal]);

  const handleRecover = useCallback(async () => {
    try {
      const recovered = await recoverSession();
      if (recovered) {
        showSuccessToast('セッションを復元しました');
      }
      closeRecoveryModal();
    } catch {
      showErrorToast('セッションの復元に失敗しました');
    }
  }, [recoverSession, closeRecoveryModal, showSuccessToast, showErrorToast]);

  const handleDiscard = useCallback(async () => {
    try {
      await discardRecovery();
      closeRecoveryModal();
      showInfoToast('セッションを破棄しました');
    } catch {
      showErrorToast('セッションの破棄に失敗しました');
    }
  }, [discardRecovery, closeRecoveryModal, showInfoToast, showErrorToast]);

  return {
    isRecoveryModalOpen,
    handleRecover,
    handleDiscard,
  };
}

/**
 * Hook for managing notification permissions
 */
export function useNotificationPermission() {
  const {
    notificationPermission,
    canRequestNotification,
    requestNotificationPermission,
    setCanRequestNotification,
    showInfoToast,
    showSuccessToast,
    showWarningToast,
    showErrorToast,
  } = useUIStore(state => ({
    notificationPermission: state.notificationPermission,
    canRequestNotification: state.canRequestNotification,
    requestNotificationPermission: state.requestNotificationPermission,
    setCanRequestNotification: state.setCanRequestNotification,
    showInfoToast: state.showInfoToast,
    showSuccessToast: state.showSuccessToast,
    showWarningToast: state.showWarningToast,
    showErrorToast: state.showErrorToast,
  }));

  const {
    notificationPermissionRequested,
    setNotificationPermissionRequested,
  } = useUserStore();

  const requestPermission = useCallback(async () => {
    if (notificationPermissionRequested) {
      showInfoToast('通知許可は既にリクエスト済みです');
      return false;
    }

    try {
      const granted = await requestNotificationPermission();
      setNotificationPermissionRequested(true);

      if (granted) {
        showSuccessToast('通知許可が取得できました');
        return true;
      } else {
        showWarningToast('通知許可が拒否されました');
        return false;
      }
    } catch {
      showErrorToast('通知許可のリクエストに失敗しました');
      return false;
    }
  }, [
    notificationPermissionRequested,
    requestNotificationPermission,
    setNotificationPermissionRequested,
    showInfoToast,
    showSuccessToast,
    showWarningToast,
    showErrorToast,
  ]);

  // Enable notification request after first successful session
  const enableNotificationRequest = useCallback(() => {
    if (!canRequestNotification && !notificationPermissionRequested) {
      setCanRequestNotification(true);
    }
  }, [
    canRequestNotification,
    notificationPermissionRequested,
    setCanRequestNotification,
  ]);

  return {
    permission: notificationPermission,
    canRequest: canRequestNotification,
    hasRequested: notificationPermissionRequested,
    requestPermission,
    enableNotificationRequest,
  };
}

/**
 * Hook for sound preferences
 */
export function useSoundSettings() {
  const { soundEnabled, setSoundEnabled } = useUserStore();

  const { showSuccessToast, showInfoToast } = useUIStore(state => ({
    showSuccessToast: state.showSuccessToast,
    showInfoToast: state.showInfoToast,
  }));

  // Update sound player when preference changes
  useEffect(() => {
    soundPlayer.setEnabled(soundEnabled);
  }, [soundEnabled]);

  const toggleSound = useCallback(() => {
    const newEnabled = !soundEnabled;
    setSoundEnabled(newEnabled);

    if (newEnabled) {
      showSuccessToast('完了音が有効になりました');
    } else {
      showInfoToast('完了音が無効になりました');
    }
  }, [soundEnabled, setSoundEnabled, showSuccessToast, showInfoToast]);

  return {
    soundEnabled,
    setSoundEnabled,
    toggleSound,
  };
}
