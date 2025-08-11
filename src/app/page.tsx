'use client';

import React, { useState, useEffect } from 'react';
import { TimerDisplay } from '@/components/TimerDisplay';
import { TimerControls } from '@/components/TimerControls';
import { MoodSelector } from '@/components/MoodSelector';
import { DailyTimeGraph } from '@/components/DailyTimeGraph';
import { WarmupInfo } from '@/components/WarmupInfo';
import { DevTestPanel } from '@/components/DevTestPanel';
import { SessionRecoveryModal } from '@/components/SessionRecoveryModal';
import { CompletionFeedback } from '@/components/CompletionFeedback';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { RewardRoulette } from '@/components/RewardRoulette';
import { useUIStore } from '@/lib/stores';
import {
  useEasterEggEmojis,
  useEasterEggStore,
} from '@/lib/stores/easterEggStore';
import { databaseService } from '@/lib/database';
import { TimerMode, Mood } from '@/lib/types';

export default function Home() {
  const { toasts, isRecoveryModalOpen, openRecoveryModal, closeRecoveryModal } =
    useUIStore();
  const [showCompletionFeedback, setShowCompletionFeedback] = useState(false);
  const [completionData, setCompletionData] = useState<{
    type: 'focus' | 'break' | 'warmup';
    duration: number;
    actualDuration?: number;
    moodStart?: Mood | null;
  } | null>(null);

  // Zustandストアからイースターエッグの状態を取得
  const { allEmojis, isCatMode } = useEasterEggEmojis();
  const { toggleCatMode } = useEasterEggStore();

  // 開発環境では古いSWとキャッシュをクリア（HMR不整合対策）
  if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => {
          registration.unregister();
        });
      });
    }
    if ('caches' in window) {
      caches.keys().then(keys => keys.forEach(key => caches.delete(key)));
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            <button
              onClick={toggleCatMode}
              className="hover:scale-110 transition-transform duration-200 cursor-pointer select-none"
              title="クリックして絵文字を切り替え"
            >
              {allEmojis.title} Tomatine
            </button>
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            心理学アプローチ・ポモドーロタイマー
          </p>
        </header>

        {/* Main Timer Interface */}
        <div className="flex flex-col items-center space-y-8 mb-12">
          {/* Timer Display */}
          <div className="w-full max-w-sm">
            <TimerDisplay size={280} />
          </div>

          {/* Timer Controls */}
          <TimerControls />

          {/* Mood Selector (always visible) */}
          <div className="w-full max-w-lg">
            <MoodSelector />
          </div>

          {/* Daily Time Graph */}
          <div className="w-full max-w-2xl">
            <DailyTimeGraph />
          </div>

          {/* Reward Roulette */}
          <div className="w-full max-w-xl">
            <RewardRoulette />
          </div>

          {/* Warmup Info (always visible, but subtle) */}
          <div className="w-full max-w-md">
            <WarmupInfo />
          </div>
        </div>

        {/* Development Test Section */}
        {process.env.NODE_ENV === 'development' && <DevTestPanel />}

        {/* Toast Container */}
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {toasts.map(toast => (
            <div
              key={toast.id}
              className={`px-4 py-2 rounded shadow-lg text-white max-w-sm ${
                toast.type === 'success'
                  ? 'bg-green-600'
                  : toast.type === 'error'
                    ? 'bg-red-600'
                    : toast.type === 'warning'
                      ? 'bg-yellow-600'
                      : 'bg-blue-600'
              }`}
            >
              <div className="font-semibold">{toast.title}</div>
              {toast.message && <div className="text-sm">{toast.message}</div>}
            </div>
          ))}
        </div>

        {/* Modals */}
        <SessionRecoveryModal
          isOpen={isRecoveryModalOpen}
          onClose={closeRecoveryModal}
        />

        {completionData && (
          <CompletionFeedback
            isOpen={showCompletionFeedback}
            onClose={() => {
              setShowCompletionFeedback(false);
              setCompletionData(null);
            }}
            completionType={completionData.type}
            duration={completionData.duration}
            actualDuration={completionData.actualDuration}
            moodStart={completionData.moodStart}
            onMoodEndSelect={() => {
              // モード終了時の処理
              // 必要に応じて処理を追加
            }}
            onContinue={() => {
              // 継続処理
            }}
          />
        )}

        {/* PWA Components */}
        <OfflineIndicator />
      </div>
    </div>
  );
}
