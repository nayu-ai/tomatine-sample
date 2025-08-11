'use client';

import React, { useMemo } from 'react';
import type { Mood } from '@/lib/types';
import { useTimerStore } from '@/lib/stores';
import { useEasterEggEmojis } from '@/lib/stores/easterEggStore';

// 気分選択アイテムの型
interface MoodItem {
  value: Mood;
  emoji: string;
  label: string;
  description: string;
}

// デフォルトの絵文字（フォールバック用）
const DEFAULT_EMOJIS: Record<Mood, string> = {
  energetic: '⚡',
  focused: '🎯',
  calm: '😌',
  tired: '😴',
  distracted: '🌀',
};

interface MoodSelectorProps {
  onMoodSelect?: (mood: Mood | null) => void;
  className?: string;
  disabled?: boolean;
}

export const MoodSelector: React.FC<MoodSelectorProps> = ({
  onMoodSelect,
  className = '',
  disabled = false,
}) => {
  const { moodStart, setMoodStart, mode } = useTimerStore();

  // Zustandストアから気分の絵文字を取得
  const { allEmojis } = useEasterEggEmojis();
  // ストア値が未定義でも必ずデフォルトで埋める
  const merged = useMemo(
    () => ({ ...DEFAULT_EMOJIS, ...(allEmojis ?? {}) }),
    [allEmojis]
  );

  const moods: MoodItem[] = useMemo(
    () => [
      {
        value: 'energetic',
        emoji: merged.energetic,
        label: 'エネルギッシュ',
        description: 'やる気に満ちている',
      },
      {
        value: 'focused',
        emoji: merged.focused,
        label: '集中している',
        description: '頭がクリア',
      },
      {
        value: 'calm',
        emoji: merged.calm,
        label: '落ち着いている',
        description: 'リラックスした状態',
      },
      {
        value: 'tired',
        emoji: merged.tired,
        label: '疲れている',
        description: '少し疲労感がある',
      },
      {
        value: 'distracted',
        emoji: merged.distracted,
        label: '散漫',
        description: '集中しにくい',
      },
    ],
    [merged]
  );

  const handleMoodSelect = (mood: Mood) => {
    const newMood = moodStart === mood ? null : mood;
    setMoodStart(newMood);
    onMoodSelect?.(newMood);
  };

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 ${className}`}
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            今の気分は？
          </h3>
        </div>

        {/* Mood Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {moods.map(mood => {
            const isSelected = moodStart === mood.value;

            return (
              <button
                key={mood.value}
                onClick={() => handleMoodSelect(mood.value)}
                disabled={disabled}
                className={`p-3 rounded-lg border-2 transition-all duration-200 text-center min-h-[80px] flex flex-col items-center justify-center space-y-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  disabled
                    ? 'cursor-not-allowed opacity-50'
                    : 'cursor-pointer hover:scale-105'
                } ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:shadow-sm'
                }`}
                title={mood.description}
              >
                <span className="text-2xl">{mood.emoji}</span>
                <span
                  className={`text-xs font-medium ${
                    isSelected
                      ? 'text-blue-700 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {mood.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* 選択中のサマリー表示と解除リンクは、ボタン自体の表現と再押下で代替できるため削除 */}

        {/* Help Text */}
        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-gray-500">
            💡 気分を記録することで、どの状態で最も集中できるかが分かります
          </p>
          {mode !== 'idle' && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              セッション中でも気分を変更できます
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MoodSelector;
