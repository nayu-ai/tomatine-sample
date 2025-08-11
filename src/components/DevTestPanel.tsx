'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { databaseService } from '@/lib/database';
import { useUserStore, useTimerStore, useUIStore } from '@/lib/stores';
import { useEasterEggEmojis } from '@/lib/stores/easterEggStore';

// 集中度計算のためのユーティリティ関数
const calculateConcentrationRate = (
  sessions: Array<{
    completed?: boolean;
    actualFocusMs?: number;
    moodStart?: string;
  }>
) => {
  const completedSessions = sessions.filter(
    session => session.completed && session.actualFocusMs && session.moodStart
  );

  if (completedSessions.length === 0) return 50;

  let totalWeightedTime = 0;
  let totalCompletedTime = 0;

  completedSessions.forEach(session => {
    const focusHours = (session.actualFocusMs || 0) / (1000 * 60 * 60); // 時間単位
    const moodScore = getMoodScore(session.moodStart || '');

    totalWeightedTime += focusHours * moodScore;
    totalCompletedTime += focusHours;
  });

  // 最終的な集中度を0%から100%の範囲で返す
  const concentrationRate =
    totalCompletedTime > 0 ? totalWeightedTime / totalCompletedTime : 50;

  // 値を[0,100]の範囲にクランプしてから四捨五入
  return Math.round(Math.max(0, Math.min(100, concentrationRate)));
};

// 気分を数値スコアに変換（エネルギッシュ100%、散漫0%のスケール）
const getMoodScore = (mood: string): number => {
  switch (mood) {
    case 'energetic':
      return 100; // 100%（最もエネルギッシュ）
    case 'focused':
      return 75; // 75%（集中している）
    case 'calm':
      return 50; // 50%（落ち着いている）
    case 'tired':
      return 25; // 25%（疲れている）
    case 'distracted':
      return 0; // 0%（最も散漫）
    default:
      return 50; // 未登録の場合は中間値
  }
};

// 時間を「時:分」形式にフォーマット
const formatTime = (ms: number): string => {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  }
  return `${minutes}分`;
};

// フォールバック用のデフォルトデータ
const getDefaultDbInfo = () => ({
  prefs: {
    focusPresetMs: 25 * 60 * 1000, // 25分
    breakPresetMs: 5 * 60 * 1000, // 5分
    warmupEnabled: true,
  },
  storageInfo: {
    sessionCount: 0,
    estimatedSizeKB: 0,
  },
});

export const DevTestPanel: React.FC = () => {
  const [dbInfo, setDbInfo] = useState<{
    prefs: {
      focusPresetMs: number;
      breakPresetMs: number;
      warmupEnabled: boolean;
    };
    storageInfo: {
      sessionCount: number;
      estimatedSizeKB: number;
    };
  } | null>(null);
  const [dbStatus, setDbStatus] = useState<'loading' | 'connected' | 'error'>(
    'loading'
  );
  const [sessions, setSessions] = useState<
    Array<{
      id?: number;
      startAt?: Date;
      endAt?: Date;
      completed?: boolean;
      actualFocusMs?: number;
      focusMs?: number;
      actualBreakMs?: number;
      breakMs?: number;
      moodStart?: string;
      moodEnd?: string;
    }>
  >([]);
  const [showSessions, setShowSessions] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Use selectors to avoid unnecessary re-renders
  const timerMode = useTimerStore(state => state.mode);
  const timerIsRunning = useTimerStore(state => state.isRunning);
  const timerRemaining = useTimerStore(state => state.remaining);
  const setFocusDuration = useTimerStore(state => state.setFocusDuration);
  const startFocus = useTimerStore(state => state.startFocus);
  const setOnSessionCompleted = useTimerStore(
    state => state.setOnSessionCompleted
  );

  const userStore = useUserStore();

  // Use UI Store selectors to avoid re-renders
  const showSuccessToast = useUIStore(state => state.showSuccessToast);
  const showErrorToast = useUIStore(state => state.showErrorToast);
  const showInfoToast = useUIStore(state => state.showInfoToast);
  const toastsLength = useUIStore(state => state.toasts.length);
  const currentPage = useUIStore(state => state.currentPage);
  const isInstalled = useUIStore(state => state.isInstalled);

  // 今日の実績サマリーを計算（フォールバック対応）
  const todaySummary = React.useMemo(() => {
    const completedSessions = sessions.filter(
      session => session.completed && session.actualFocusMs
    );

    const totalSessions = completedSessions.length;
    const totalFocusTime = completedSessions.reduce(
      (sum, session) => sum + (session.actualFocusMs || 0),
      0
    );
    const concentrationRate = calculateConcentrationRate(sessions);

    return {
      totalSessions,
      totalFocusTime,
      concentrationRate,
    };
  }, [sessions]);

  // セッション更新を監視して自動更新する関数（エラーハンドリング強化）
  const refreshSessions = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const todaySessions =
        await databaseService.getSessionsByDateRange('today');
      setSessions(todaySessions);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('セッション更新エラー:', error);
      setErrorMessage('セッションデータの更新に失敗しました');
      // エラー時は既存データを保持（フォールバック）
    } finally {
      setIsLoading(false);
    }
  }, []);

  // データベース接続確認とセッション読み込み（フォールバック対応）
  React.useEffect(() => {
    const checkDatabase = async () => {
      try {
        setErrorMessage(null);
        const healthy = await databaseService.healthCheck();

        if (healthy) {
          const prefs = await databaseService.getUserPrefs();
          const storageInfo = await databaseService.getStorageInfo();
          setDbInfo({ prefs, storageInfo });
          setDbStatus('connected');
        } else {
          setDbStatus('error');
          setDbInfo(getDefaultDbInfo()); // フォールバックデータ
          setErrorMessage('データベースの状態が異常です');
        }
      } catch (error) {
        console.error('データベース接続エラー:', error);
        setDbStatus('error');
        setDbInfo(getDefaultDbInfo()); // フォールバックデータ
        setErrorMessage('データベースに接続できません');
      }
    };

    checkDatabase();
  }, [refreshSessions]);

  // showSessionsが変更された時にセッションを読み込む
  useEffect(() => {
    if (showSessions) {
      refreshSessions();
    }
  }, [showSessions, refreshSessions]);

  // タイマーモード変更時にセッションを自動更新
  useEffect(() => {
    // 集中終了時（focus → break または focus → idle）にセッションを更新
    if (timerMode === 'break' || timerMode === 'idle') {
      refreshSessions();
    }
  }, [timerMode, refreshSessions]);

  // 定期的にセッション情報を更新（開発用）
  useEffect(() => {
    if (!showSessions) return;

    const interval = setInterval(() => {
      refreshSessions();
    }, 5000); // 5秒ごとに更新

    return () => clearInterval(interval);
  }, [showSessions, refreshSessions]);

  // セッション完了時のコールバックを設定
  useEffect(() => {
    setOnSessionCompleted(refreshSessions);

    // クリーンアップ時にコールバックを削除
    return () => setOnSessionCompleted(undefined);
  }, [setOnSessionCompleted, refreshSessions]);

  const testCreateSession = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const sessionId = await databaseService.createSession({
        startAt: new Date(),
        focusMs: 25 * 60 * 1000,
        breakMs: 5 * 60 * 1000,
        completed: false,
      });
      showSuccessToast(`セッション作成成功 ID: ${sessionId}`);

      // セッション作成後に表示を更新
      if (showSessions) {
        await refreshSessions();
      }
    } catch (error) {
      console.error('セッション作成エラー:', error);
      showErrorToast('セッション作成失敗');
      setErrorMessage('セッションの作成に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSessions = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const todaySessions =
        await databaseService.getSessionsByDateRange('today');
      setSessions(todaySessions);
      setShowSessions(true);
      showSuccessToast(`${todaySessions.length}件のセッションを読み込みました`);
    } catch (error) {
      console.error('セッション読み込みエラー:', error);
      showErrorToast('セッション読み込み失敗');
      setErrorMessage('セッションデータの読み込みに失敗しました');
      // エラー時は空配列で表示（フォールバック）
      setSessions([]);
      setShowSessions(true);
    } finally {
      setIsLoading(false);
    }
  };

  const exportData = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const data = await databaseService.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `teo-timer-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showSuccessToast('データエクスポート完了');
    } catch (error) {
      console.error('データエクスポートエラー:', error);
      showErrorToast('データエクスポート失敗');
      setErrorMessage('データのエクスポートに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const testTimerStart = () => {
    try {
      setFocusDuration(10000); // 10秒テスト
      startFocus(true); // Skip warmup
      showInfoToast('10秒テストタイマー開始');
    } catch (error) {
      console.error('タイマー開始エラー:', error);
      showErrorToast('タイマーの開始に失敗しました');
      setErrorMessage('タイマーの起動に失敗しました');
    }
  };

  // エラーメッセージ表示コンポーネント
  const ErrorMessage = ({ message }: { message: string }) => (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-red-400"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3">
          <p className="text-sm text-red-800 dark:text-red-200">{message}</p>
        </div>
      </div>
    </div>
  );

  // ローディング表示コンポーネント
  const LoadingSpinner = () => (
    <div className="flex items-center justify-center p-4">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
        読み込み中...
      </span>
    </div>
  );

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
      <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-6 text-center">
        開発者向け動作テスト
      </h2>

      {/* エラーメッセージ表示 */}
      {errorMessage && <ErrorMessage message={errorMessage} />}

      {/* 今日の実績サマリー */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
        <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
          📊 今日の実績サマリー
        </h3>
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <div className="flex items-center justify-between">
            <div className="text-lg font-medium text-gray-800 dark:text-white">
              合計{todaySummary.totalSessions}回(
              {formatTime(todaySummary.totalFocusTime)})
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                集中度
              </div>
              <div
                className={`text-2xl font-bold ${
                  todaySummary.concentrationRate >= 75
                    ? 'text-green-600 dark:text-green-400'
                    : todaySummary.concentrationRate >= 50
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-red-600 dark:text-red-400'
                }`}
              >
                {todaySummary.concentrationRate}%
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Database Status */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
        <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
          📊 データベース接続状況
        </h3>
        <div className="flex items-center gap-3 mb-4">
          <div
            className={`w-3 h-3 rounded-full ${
              dbStatus === 'connected'
                ? 'bg-green-500'
                : dbStatus === 'error'
                  ? 'bg-red-500'
                  : 'bg-yellow-500'
            }`}
          />
          <span className="text-gray-700 dark:text-gray-300">
            {dbStatus === 'connected'
              ? '接続成功'
              : dbStatus === 'error'
                ? '接続失敗'
                : '接続中...'}
          </span>
        </div>

        {dbInfo ? (
          <div className="bg-gray-50 dark:bg-gray-700 rounded p-4 text-sm">
            <p>
              <strong>セッション数:</strong> {dbInfo.storageInfo.sessionCount}
            </p>
            <p>
              <strong>推定サイズ:</strong> {dbInfo.storageInfo.estimatedSizeKB}
              KB
            </p>
            <p>
              <strong>フォーカス時間:</strong>{' '}
              {Math.round(dbInfo.prefs.focusPresetMs / 60000)}分
            </p>
            <p>
              <strong>休憩時間:</strong>{' '}
              {Math.round(dbInfo.prefs.breakPresetMs / 60000)}分
            </p>
            <p>
              <strong>ウォームアップ:</strong>{' '}
              {dbInfo.prefs.warmupEnabled ? '有効' : '無効'}
            </p>
          </div>
        ) : (
          <div className="bg-gray-50 dark:bg-gray-700 rounded p-4 text-sm text-gray-500">
            データベース情報を読み込み中...
          </div>
        )}
      </div>

      {/* Store Status */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
        <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
          🏪 ストア状態
        </h3>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-3">
            <h4 className="font-semibold text-blue-800 dark:text-blue-300">
              Timer Store
            </h4>
            <p>モード: {timerMode}</p>
            <p>実行中: {timerIsRunning ? 'Yes' : 'No'}</p>
            <p>残り時間: {Math.ceil(timerRemaining / 1000)}秒</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded p-3">
            <h4 className="font-semibold text-green-800 dark:text-green-300">
              User Store
            </h4>
            <p>読み込み済み: {userStore.isLoaded ? 'Yes' : 'No'}</p>
            <p>テーマ: {userStore.theme}</p>
            <p>音声: {userStore.soundEnabled ? '有効' : '無効'}</p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded p-3">
            <h4 className="font-semibold text-purple-800 dark:text-purple-300">
              UI Store
            </h4>
            <p>トースト: {toastsLength}件</p>
            <p>ページ: {currentPage}</p>
            <p>PWA: {isInstalled ? 'インストール済み' : '未インストール'}</p>
          </div>
        </div>
      </div>

      {/* Test Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
          🧪 機能テスト
        </h3>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={testCreateSession}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? '処理中...' : 'セッション作成テスト'}
          </button>
          <button
            onClick={loadSessions}
            className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? '処理中...' : '本日のセッション読み込み'}
          </button>
          <button
            onClick={exportData}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? '処理中...' : 'データエクスポート'}
          </button>
          <button
            onClick={testTimerStart}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={timerIsRunning || isLoading}
          >
            10秒タイマーテスト
          </button>
          <button
            onClick={() => showSuccessToast('テスト通知')}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
          >
            トースト通知テスト
          </button>
          <button
            onClick={() =>
              userStore.setTheme(userStore.theme === 'light' ? 'dark' : 'light')
            }
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            テーマ切り替え
          </button>
          <button
            onClick={() => {
              // setCompletionData({
              //   type: 'focus',
              //   duration: 25 * 60 * 1000,
              //   actualDuration: 24 * 60 * 1000,
              //   moodStart: 'focused'
              // });
              // setShowCompletionFeedback(true);
            }}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
          >
            完了フィードバックテスト
          </button>
        </div>
      </div>

      {/* Session Data Display - コンパクト版（フォールバック対応） */}
      {showSessions && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
            📊 本日のセッションデータ
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                総セッション数: {sessions.length}
              </div>
              <div className="flex items-center gap-3">
                <div className="text-xs text-gray-500">
                  最終更新: {lastUpdate.toLocaleTimeString('ja-JP')}
                </div>
                <button
                  onClick={refreshSessions}
                  className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isLoading}
                >
                  {isLoading ? '更新中...' : '更新'}
                </button>
              </div>
            </div>

            {isLoading ? (
              <LoadingSpinner />
            ) : sessions.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p className="mt-2">セッションデータがありません</p>
                <p className="text-sm">
                  新しいセッションを作成するか、別の日付を選択してください
                </p>
              </div>
            ) : (
              sessions.map((session, index) => (
                <div
                  key={session.id || index}
                  className="border border-gray-200 dark:border-gray-600 rounded p-3 bg-gray-50 dark:bg-gray-700"
                >
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    <div>
                      <span className="font-semibold">ID:</span>{' '}
                      {session.id || 'N/A'}
                    </div>
                    <div>
                      <span className="font-semibold">開始時刻:</span>
                      <br />
                      {session.startAt
                        ? new Date(session.startAt).toLocaleString('ja-JP')
                        : 'N/A'}
                    </div>
                    <div>
                      <span className="font-semibold">終了時刻:</span>
                      <br />
                      {session.endAt
                        ? new Date(session.endAt).toLocaleString('ja-JP')
                        : 'N/A'}
                    </div>
                    <div>
                      <span className="font-semibold">完了:</span>{' '}
                      {session.completed ? 'Yes' : 'No'}
                    </div>
                    <div>
                      <span className="font-semibold">集中時間:</span>{' '}
                      {session.actualFocusMs || session.focusMs || 0}ms
                    </div>
                    <div>
                      <span className="font-semibold">休憩時間:</span>{' '}
                      {session.actualBreakMs || session.breakMs || 0}ms
                    </div>
                    <div>
                      <span className="font-semibold">開始時気分:</span>{' '}
                      {session.moodStart || 'N/A'}
                    </div>
                    <div>
                      <span className="font-semibold">終了時気分:</span>{' '}
                      {session.moodEnd || 'N/A'}
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    <span className="font-semibold">Raw startAt:</span>{' '}
                    {JSON.stringify(session.startAt)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DevTestPanel;
