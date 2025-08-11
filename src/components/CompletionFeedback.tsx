'use client';

import React, { useState, useEffect } from 'react';
import { Mood } from '@/lib/types';
import { useUIStore } from '@/lib/stores';
import { useEasterEggEmojis } from '@/lib/stores/easterEggStore';
import { formatTime } from '@/lib/utils';

interface CompletionFeedbackProps {
  isOpen: boolean;
  onClose: () => void;
  completionType: 'focus' | 'break' | 'warmup';
  duration: number;
  actualDuration?: number;
  moodStart?: Mood | null;
  onMoodEndSelect?: (mood: Mood | null) => void;
  onContinue?: () => void;
}

// Zustandストアから気分の絵文字を取得
const useMoodEmojis = () => {
  const { allEmojis } = useEasterEggEmojis();

  return [
    {
      value: 'energetic' as Mood,
      emoji: allEmojis.energetic,
      label: 'エネルギッシュ',
    },
    {
      value: 'focused' as Mood,
      emoji: allEmojis.focused,
      label: '集中している',
    },
    { value: 'calm' as Mood, emoji: allEmojis.calm, label: '落ち着いている' },
    { value: 'tired' as Mood, emoji: allEmojis.tired, label: '疲れている' },
    { value: 'distracted' as Mood, emoji: allEmojis.distracted, label: '散漫' },
  ];
};

const congratulationsMessages = [
  '素晴らしい集中でした！',
  'お疲れさまでした！',
  'よくやり遂げましたね！',
  '集中力を発揮できましたね！',
  'ナイスワークです！',
];

const breakMessages = [
  'しっかり休憩できましたね！',
  'リフレッシュ完了です！',
  '良い休憩時間でした！',
  'エネルギー回復ですね！',
];

const warmupMessages = [
  'ウォームアップ完了！',
  '準備運動はバッチリです！',
  '集中の準備ができました！',
  'いい感じでスタートです！',
];

export const CompletionFeedback: React.FC<CompletionFeedbackProps> = ({
  isOpen,
  onClose,
  completionType,
  duration,
  actualDuration,
  moodStart,
  onMoodEndSelect,
  onContinue,
}) => {
  const showSuccessToast = useUIStore(state => state.showSuccessToast);
  const [selectedMoodEnd, setSelectedMoodEnd] = useState<Mood | null>(null);
  const [currentMessage, setCurrentMessage] = useState('');

  // Zustandストアから気分の絵文字を取得
  const moods = useMoodEmojis();

  useEffect(() => {
    if (isOpen) {
      // Select random congratulations message
      const messages =
        completionType === 'focus'
          ? congratulationsMessages
          : completionType === 'break'
            ? breakMessages
            : warmupMessages;

      const randomMessage =
        messages[Math.floor(Math.random() * messages.length)];
      setCurrentMessage(randomMessage);

      // Reset mood selection
      setSelectedMoodEnd(null);
    }
  }, [isOpen, completionType]);

  const handleMoodSelect = (mood: Mood) => {
    const newMood = selectedMoodEnd === mood ? null : mood;
    setSelectedMoodEnd(newMood);
    onMoodEndSelect?.(newMood);
  };

  const handleContinue = () => {
    if (selectedMoodEnd) {
      showSuccessToast(
        `気分を記録しました (${moods.find(m => m.value === selectedMoodEnd)?.label})`
      );
    }
    onContinue?.();
    onClose();
  };

  const getCompletionIcon = () => {
    switch (completionType) {
      case 'focus':
        return '🎯';
      case 'break':
        return '😌';
      case 'warmup':
        return '🔥';
      default:
        return '✨';
    }
  };

  const getCompletionTitle = () => {
    switch (completionType) {
      case 'focus':
        return '集中時間完了！';
      case 'break':
        return '休憩時間完了！';
      case 'warmup':
        return 'ウォームアップ完了！';
      default:
        return '完了！';
    }
  };

  const getCompletionColor = () => {
    switch (completionType) {
      case 'focus':
        return 'red';
      case 'break':
        return 'green';
      case 'warmup':
        return 'amber';
      default:
        return 'blue';
    }
  };

  if (!isOpen) return null;

  const colorClasses = {
    red: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      text: 'text-red-800 dark:text-red-300',
      button: 'bg-red-600 hover:bg-red-700',
    },
    green: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      text: 'text-green-800 dark:text-green-300',
      button: 'bg-green-600 hover:bg-green-700',
    },
    amber: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      text: 'text-amber-800 dark:text-amber-300',
      button: 'bg-amber-600 hover:bg-amber-700',
    },
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      text: 'text-blue-800 dark:text-blue-300',
      button: 'bg-blue-600 hover:bg-blue-700',
    },
  };

  const colors = colorClasses[getCompletionColor()];
  const moodStartItem = moodStart
    ? moods.find(m => m.value === moodStart)
    : undefined;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        {/* Success Animation */}
        <div className="text-center mb-6">
          <div className="text-6xl mb-4 animate-bounce">
            {getCompletionIcon()}
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {getCompletionTitle()}
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
            {currentMessage}
          </p>
        </div>

        {/* Session Stats */}
        <div className={`${colors.bg} rounded-lg p-4 mb-6`}>
          <h3 className={`font-semibold ${colors.text} mb-2`}>
            セッション結果
          </h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">
                予定時間:
              </span>
              <span className="font-mono">{formatTime(duration)}</span>
            </div>
            {actualDuration && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  実際の時間:
                </span>
                <span className="font-mono">{formatTime(actualDuration)}</span>
              </div>
            )}
            {moodStart && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  開始時の気分:
                </span>
                <span>
                  {moodStartItem && (
                    <>
                      {moodStartItem.emoji} {moodStartItem.label}
                    </>
                  )}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* End Mood Selection (only for focus sessions) */}
        {completionType === 'focus' && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 text-center">
              終了時の気分はいかがですか？
            </h3>
            <div className="grid grid-cols-5 gap-2">
              {moods.map(mood => {
                const isSelected = selectedMoodEnd === mood.value;

                return (
                  <button
                    key={mood.value}
                    onClick={() => handleMoodSelect(mood.value)}
                    className={`p-2 rounded-lg border-2 transition-all duration-200 text-center flex flex-col items-center justify-center space-y-1 ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-105'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:scale-105'
                    }`}
                  >
                    <span className="text-lg">{mood.emoji}</span>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {mood.label}
                    </span>
                  </button>
                );
              })}
            </div>
            {selectedMoodEnd && (
              <p className="text-center text-sm text-gray-500 dark:text-gray-500 mt-2">
                気分の変化を記録します
              </p>
            )}
          </div>
        )}

        {/* Achievement Badges (for focus completion) */}
        {completionType === 'focus' && (
          <div className="mb-6">
            <div className="flex justify-center space-x-4">
              <div className="text-center">
                <div className="text-2xl mb-1">🏆</div>
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  集中完了
                </span>
              </div>
              {actualDuration && actualDuration >= duration * 0.9 && (
                <div className="text-center">
                  <div className="text-2xl mb-1">⭐</div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    時間達成
                  </span>
                </div>
              )}
              {moodStart &&
                selectedMoodEnd &&
                selectedMoodEnd !== 'distracted' &&
                selectedMoodEnd !== 'tired' && (
                  <div className="text-center">
                    <div className="text-2xl mb-1">💪</div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      好調維持
                    </span>
                  </div>
                )}
            </div>
          </div>
        )}

        {/* Continue Button */}
        <div className="space-y-3">
          <button
            onClick={handleContinue}
            className={`w-full px-4 py-3 ${colors.button} text-white font-semibold rounded-lg transition-colors`}
          >
            {completionType === 'focus'
              ? '休憩時間へ進む'
              : completionType === 'warmup'
                ? '集中時間を開始'
                : 'セッションを終了'}
          </button>

          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium underline transition-colors"
          >
            後で決める
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompletionFeedback;
