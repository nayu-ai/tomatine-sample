'use client';

import React from 'react';
import { CircularProgress } from './CircularProgress';
import { useTimerDisplay } from '@/lib/stores';
import { formatTime } from '@/lib/utils';

interface TimerDisplayProps {
  size?: number;
  className?: string;
}

export const TimerDisplay: React.FC<TimerDisplayProps> = ({
  size = 240,
  className = '',
}) => {
  const { remaining, mode, isRunning, isPaused } = useTimerDisplay();

  // Calculate progress based on timer mode and remaining time
  const getProgress = () => {
    if (mode === 'idle') return 0;

    // Get total duration based on mode
    let totalDuration = 0;
    if (mode === 'focus')
      totalDuration = 25 * 60 * 1000; // 25 minutes
    else if (mode === 'break')
      totalDuration = 5 * 60 * 1000; // 5 minutes
    else if (mode === 'warmup') totalDuration = 3 * 60 * 1000; // 3 minutes

    if (totalDuration === 0) return 0;

    const elapsed = totalDuration - remaining;
    return Math.max(0, Math.min(1, elapsed / totalDuration));
  };

  const getColor = () => {
    switch (mode) {
      case 'focus':
        return 'focus';
      case 'break':
        return 'break';
      case 'warmup':
        return 'warmup';
      default:
        return 'primary';
    }
  };

  const getModeLabel = () => {
    switch (mode) {
      case 'focus':
        return '集中時間';
      case 'break':
        return '休憩時間';
      case 'warmup':
        return 'ウォームアップ';
      default:
        return '開始するモードを選んでください';
    }
  };

  const getStatusInfo = () => {
    if (mode === 'idle') return '';
    if (isPaused) return '一時停止中';
    if (!isRunning) return '停止中';
    return '';
  };

  // 0分形式から 0:00 形式へ統一
  const formattedTime = formatTime(remaining, true);

  return (
    <div className={`flex flex-col items-center space-y-4 ${className}`}>
      {/* Circular Progress Timer */}
      <CircularProgress
        progress={getProgress()}
        size={size}
        color={getColor()}
        text={formattedTime}
        subtitle={getModeLabel()}
        status={getStatusInfo()}
        className="drop-shadow-lg"
      />
    </div>
  );
};

export default TimerDisplay;
