'use client';

import React from 'react';

interface CircularProgressProps {
  progress: number; // 0 to 1
  size?: number; // diameter in pixels
  strokeWidth?: number;
  color?: 'primary' | 'focus' | 'break' | 'warmup';
  showText?: boolean;
  text?: string;
  subtitle?: string; // メインテキストの下に表示する補助テキスト（例: モード名）
  status?: string; // 追加ステータス（例: 一時停止中）
  className?: string;
}

const colorMap = {
  primary: '#3b82f6', // blue-500
  focus: '#ef4444', // red-500
  break: '#22c55e', // green-500
  warmup: '#f59e0b', // amber-500
} as const;

export const CircularProgress: React.FC<CircularProgressProps> = ({
  progress,
  size = 240,
  strokeWidth = 8,
  color = 'primary',
  showText = true,
  text,
  subtitle,
  status,
  className = '',
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset =
    circumference - Math.max(0, Math.min(1, progress)) * circumference;
  const center = size / 2;

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      suppressHydrationWarning
    >
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
        aria-hidden="true"
      >
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-gray-200 dark:text-gray-700"
        />

        {/* Progress circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke={colorMap[color]}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-300 ease-out"
        />
      </svg>

      {/* Center text */}
      {showText && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center leading-tight">
            {text && (
              <div className="text-3xl font-mono font-bold text-gray-900 dark:text-white">
                {text}
              </div>
            )}
            {subtitle && (
              <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                {subtitle}
              </div>
            )}
            {status && (
              <div className="mt-0.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
                {status}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CircularProgress;
