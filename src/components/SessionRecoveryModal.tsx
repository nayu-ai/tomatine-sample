'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useTimerStore, useUIStore } from '@/lib/stores';
import { formatTime } from '@/lib/utils';

interface SessionRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SessionRecoveryModal: React.FC<SessionRecoveryModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    hasRecoverableSession,
    recoverSession,
    discardRecovery,
    mode,
    remaining,
    moodStart,
    taskNote,
  } = useTimerStore();

  const { showSuccessToast, showErrorToast } = useUIStore(state => ({
    showSuccessToast: state.showSuccessToast,
    showErrorToast: state.showErrorToast,
  }));

  const [isRecoverable, setIsRecoverable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkRecoverableSession = useCallback(async () => {
    setIsLoading(true);
    try {
      const recoverable = await hasRecoverableSession();
      setIsRecoverable(recoverable);
    } catch {
      // エラーログは開発時のみ出力
      setIsRecoverable(false);
    } finally {
      setIsLoading(false);
    }
  }, [hasRecoverableSession]);

  useEffect(() => {
    if (isOpen) {
      checkRecoverableSession();
    }
  }, [isOpen, checkRecoverableSession]);

  const handleRecover = async () => {
    setIsLoading(true);
    try {
      const recovered = await recoverSession();
      if (recovered) {
        showSuccessToast('セッションを復旧しました - タイマーが再開されました');
        onClose();
      } else {
        showErrorToast(
          '復旧に失敗しました - セッション情報が見つかりませんでした'
        );
      }
    } catch {
      // エラーログは開発時のみ出力
      showErrorToast('復旧に失敗しました - エラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDiscard = async () => {
    setIsLoading(true);
    try {
      await discardRecovery();
      showSuccessToast(
        'セッションを破棄しました - 新しいセッションを開始できます'
      );
      onClose();
    } catch {
      // エラーログは開発時のみ出力
      showErrorToast('破棄に失敗しました - エラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const getModeLabel = () => {
    switch (mode) {
      case 'warmup':
        return 'ウォームアップ';
      case 'focus':
        return '集中時間';
      case 'break':
        return '休憩時間';
      default:
        return '不明';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">⏰</div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            セッション復旧
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            前回のセッションが中断されました
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">確認中...</p>
          </div>
        )}

        {/* No Recovery Available */}
        {!isLoading && !isRecoverable && (
          <div className="text-center py-8">
            <div className="text-2xl mb-4">✨</div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              復旧可能なセッションはありません
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              閉じる
            </button>
          </div>
        )}

        {/* Recovery Available */}
        {!isLoading && isRecoverable && (
          <div className="space-y-6">
            {/* Session Info */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <h3 className="font-medium text-blue-800 dark:text-blue-300 mb-2">
                中断されたセッション情報
              </h3>
              <div className="space-y-1 text-sm text-blue-700 dark:text-blue-400">
                <div className="flex justify-between">
                  <span>モード:</span>
                  <span>{getModeLabel()}</span>
                </div>
                <div className="flex justify-between">
                  <span>残り時間:</span>
                  <span>{formatTime(remaining)}</span>
                </div>
                {moodStart && (
                  <div className="flex justify-between">
                    <span>開始時の気分:</span>
                    <span>
                      {moodStart === 'energetic'
                        ? '⚡ エネルギッシュ'
                        : moodStart === 'focused'
                          ? '🎯 集中している'
                          : moodStart === 'calm'
                            ? '😌 落ち着いている'
                            : moodStart === 'tired'
                              ? '😴 疲れている'
                              : '🌀 散漫'}
                    </span>
                  </div>
                )}
                {taskNote && (
                  <div className="flex justify-between">
                    <span>タスクメモ:</span>
                    <span className="truncate max-w-32">{taskNote}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Warning */}
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <span className="text-amber-600 dark:text-amber-400 text-lg">
                  ⚠️
                </span>
                <div>
                  <h4 className="font-medium text-amber-800 dark:text-amber-300 mb-1">
                    復旧について
                  </h4>
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    セッションを復旧すると、前回の続きからタイマーが開始されます。
                    破棄する場合、セッション記録も削除されます。
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-3">
              <button
                onClick={handleRecover}
                disabled={isLoading}
                className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
              >
                {isLoading ? '復旧中...' : '続きから再開'}
              </button>
              <button
                onClick={handleDiscard}
                disabled={isLoading}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
              >
                {isLoading ? '破棄中...' : '破棄して新規開始'}
              </button>
            </div>

            {/* Cancel */}
            <div className="text-center">
              <button
                onClick={onClose}
                disabled={isLoading}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline"
              >
                後で決める
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionRecoveryModal;
