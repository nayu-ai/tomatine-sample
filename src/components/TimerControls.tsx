'use client';

import React from 'react';
import { useTimerStore, timerSelectors } from '@/lib/stores';

interface TimerControlsProps {
  className?: string;
}

export const TimerControls: React.FC<TimerControlsProps> = ({
  className = '',
}) => {
  // 既存のセレクターを使用してパフォーマンスを最適化
  const mode = useTimerStore(timerSelectors.mode);
  const isPaused = useTimerStore(timerSelectors.isPaused);

  // アクション関数は個別に取得（変更頻度が低いため）
  const { startWarmup, startFocus, pause, resume, skip, stop } =
    useTimerStore();

  const handleFocusStart = async () => {
    await startFocus(true); // Skip warmup
  };

  const handleWarmupStart = async () => {
    await startWarmup();
  };

  const handlePauseResume = async () => {
    if (isPaused) {
      await resume();
    } else {
      await pause();
    }
  };

  const getSkipButtonLabel = () => {
    switch (mode) {
      case 'warmup':
        return '集中時間へ';
      case 'focus':
        return '完了休憩へ';
      case 'break':
        return '休憩終了';
      default:
        return 'スキップ';
    }
  };

  const isIdle = mode === 'idle';

  return (
    <div className={`flex flex-col items-center space-y-4 ${className}`}>
      {/* 待機時: ウォームアップ、集中開始（横並び） */}
      {isIdle && (
        <div className="flex space-x-4">
          <button
            onClick={handleWarmupStart}
            className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
          >
            🔥 ウォームアップ
          </button>
          <button
            onClick={handleFocusStart}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            🎯 集中開始
          </button>
        </div>
      )}

      {/* ウォームアップ時: 一時停止、集中時間へ、停止（縦2段構成） */}
      {mode === 'warmup' && (
        <div className="flex flex-col items-center space-y-3">
          {/* 上段: 一時停止 */}
          <div className="flex justify-center">
            <button
              onClick={handlePauseResume}
              className={`px-8 py-3 font-semibold rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                isPaused
                  ? 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500'
                  : 'bg-yellow-600 hover:bg-yellow-700 text-white focus:ring-yellow-500'
              }`}
            >
              {isPaused ? '▶ 再開' : '⏸ 一時停止'}
            </button>
          </div>
          {/* 下段: 集中時間へ、停止 */}
          <div className="flex space-x-3">
            <button
              onClick={skip}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
            >
              {getSkipButtonLabel()}
            </button>
            <button
              onClick={stop}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
            >
              ⏹ 停止
            </button>
          </div>
        </div>
      )}

      {/* 集中時間: 一時停止、完了休憩へ、停止（縦2段構成） */}
      {mode === 'focus' && (
        <div className="flex flex-col items-center space-y-3">
          {/* 上段: 一時停止 */}
          <div className="flex justify-center">
            <button
              onClick={handlePauseResume}
              className={`px-8 py-3 font-semibold rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                isPaused
                  ? 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500'
                  : 'bg-yellow-600 hover:bg-yellow-700 text-white focus:ring-yellow-500'
              }`}
            >
              {isPaused ? '▶ 再開' : '⏸ 一時停止'}
            </button>
          </div>
          {/* 下段: 完了休憩へ、停止 */}
          <div className="flex space-x-3">
            <button
              onClick={skip}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2"
            >
              {getSkipButtonLabel()}
            </button>
            <button
              onClick={stop}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
            >
              ⏹ 停止
            </button>
          </div>
        </div>
      )}

      {/* 休憩時: 一時停止、休憩終了、停止（縦2段構成） */}
      {mode === 'break' && (
        <div className="flex flex-col items-center space-y-3">
          {/* 上段: 一時停止 */}
          <div className="flex justify-center">
            <button
              onClick={handlePauseResume}
              className={`px-8 py-3 font-semibold rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                isPaused
                  ? 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500'
                  : 'bg-yellow-600 hover:bg-yellow-700 text-white focus:ring-yellow-500'
              }`}
            >
              {isPaused ? '▶ 再開' : '⏸ 一時停止'}
            </button>
          </div>
          {/* 下段: 休憩終了、停止 */}
          <div className="flex space-x-3">
            <button
              onClick={skip}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
            >
              {getSkipButtonLabel()}
            </button>
            <button
              onClick={stop}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
            >
              ⏹ 停止
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimerControls;
