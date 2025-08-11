'use client';

import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { databaseService } from '@/lib/database';
import type { Session, Mood, TimerMode } from '@/lib/types';
// formatTimeは使用していないため削除
import { useTimerStore } from '@/lib/stores';

import { useEasterEggStore } from '@/lib/stores/easterEggStore';

interface DailyTimeGraphProps {
  className?: string;
  selectedDate?: Date;
}

interface SessionBlock {
  session: Session;
  startHour: number;
  duration: number;
  completed: boolean;
  mood: Mood | null;
}

const moodColors: Record<Mood, string> = {
  energetic: '#ef4444', // red-500
  focused: '#3b82f6', // blue-500
  calm: '#10b981', // emerald-500
  tired: '#6b7280', // gray-500
  distracted: '#f59e0b', // amber-500
};

// 集中度計算のためのユーティリティ関数
const calculateConcentrationRate = (sessions: Session[]): number => {
  const completedSessions = sessions.filter(
    session => session.completed && session.actualFocusMs && session.moodStart
  );

  if (completedSessions.length === 0) return 0;

  let totalWeightedTime = 0;
  let totalCompletedTime = 0;

  completedSessions.forEach(session => {
    const focusHours = (session.actualFocusMs || 0) / (1000 * 60 * 60); // 時間単位
    const moodScore = getMoodScore(session.moodStart || '');

    totalWeightedTime += focusHours * moodScore;
    totalCompletedTime += focusHours;
  });

  // 最終的な集中度を0%から100%の範囲で返す
  return totalCompletedTime > 0
    ? Math.round(totalWeightedTime / totalCompletedTime)
    : 50;
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
const formatTimeCompact = (ms: number): string => {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  }
  return `${minutes}分`;
};

export const DailyTimeGraph: React.FC<DailyTimeGraphProps> = React.memo(
  ({ className = '', selectedDate }) => {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const lastUpdateTimeRef = useRef<number>(0);

    // Zustand ストアから必要な値のみ購読（不要な再レンダを防止）
    const isCatMode = useEasterEggStore(state => state.isCatMode);
    const getEmoji = useEasterEggStore(state => state.getEmoji);
    const allEmojis = useMemo(
      () => ({
        title: getEmoji('title'),
        energetic: getEmoji('energetic'),
        focused: getEmoji('focused'),
        calm: getEmoji('calm'),
        tired: getEmoji('tired'),
        distracted: getEmoji('distracted'),
      }),
      [isCatMode, getEmoji]
    );

    // moodEmojis の明示的な型（5種の気分キーに対する文字列）
    type MoodEmojiMap = Record<Mood, string>;

    // allEmojis の各プロパティが未定義の場合でも安全にフォールバック
    const moodEmojis: MoodEmojiMap = useMemo(
      () => ({
        energetic: allEmojis?.energetic ?? '🙂',
        focused: allEmojis?.focused ?? '🙂',
        calm: allEmojis?.calm ?? '🙂',
        tired: allEmojis?.tired ?? '🙂',
        distracted: allEmojis?.distracted ?? '🙂',
      }),
      [allEmojis]
    );

    // SSR/CSRの差異や再レンダでの"new Date()"再生成を避けるために初期日付を安定化
    const effectiveDate = useMemo(
      () => selectedDate ?? new Date(),
      [selectedDate]
    );

    // Timer store for event-driven updates - only subscribe to specific values
    const mode = useTimerStore(state => state.mode);
    const sessionId = useTimerStore(state => state.sessionId);
    const currentMood = useTimerStore(state => state.moodStart);
    const isPaused = useTimerStore(state => state.isPaused);
    const setOnSessionCompleted = useTimerStore(
      state => state.setOnSessionCompleted
    );

    // 今日選択かどうかの判定
    const isTodaySelected = useMemo(() => {
      const today = new Date();
      const d = new Date(effectiveDate);
      return (
        d.getFullYear() === today.getFullYear() &&
        d.getMonth() === today.getMonth() &&
        d.getDate() === today.getDate()
      );
    }, [effectiveDate]);

    // 現在時刻ラインの位置（%）
    const [nowLeftPercent, setNowLeftPercent] = useState<number | null>(null);

    useEffect(() => {
      if (!isTodaySelected) {
        setNowLeftPercent(null);
        return;
      }

      const computeLeft = () => {
        const now = new Date();
        const msSinceStart =
          now.getHours() * 3600000 +
          now.getMinutes() * 60000 +
          now.getSeconds() * 1000 +
          now.getMilliseconds();
        const percent = Math.min(
          100,
          Math.max(0, (msSinceStart / (24 * 60 * 60 * 1000)) * 100)
        );
        setNowLeftPercent(percent);
      };

      // 初期描画 & インターバル更新（60秒ごと）
      computeLeft();
      const id = window.setInterval(computeLeft, 60000);
      return () => window.clearInterval(id);
    }, [isTodaySelected]);

    const loadDailySessions = useCallback(
      async (showLoading: boolean = false) => {
        if (showLoading) {
          setLoading(true);
        }
        try {
          const dailySessions = await databaseService.getSessionsByDateRange(
            'today',
            effectiveDate
          );
          setSessions(dailySessions);
        } catch {
          // エラーログは開発時のみ出力
          setSessions([]);
        } finally {
          if (showLoading) {
            setLoading(false);
          }
        }
      },
      [effectiveDate]
    );

    // Initial load and date changes
    useEffect(() => {
      loadDailySessions(true); // Show loading for initial load
    }, [loadDailySessions]);

    // 直近の状態を保持して差分で更新発火（ボタン操作含む）
    const prevStateRef = useRef<{
      mode: TimerMode;
      sessionId: number | null;
      isPaused: boolean;
    }>({
      mode,
      sessionId,
      isPaused,
    });

    // 1) セッション完了時の即時更新（ストアのコールバック）
    useEffect(() => {
      setOnSessionCompleted(() => loadDailySessions(false));
      return () => setOnSessionCompleted(undefined);
    }, [setOnSessionCompleted, loadDailySessions]);

    // 2) ボタン操作などによる状態変化での更新（当日表示時のみ）
    useEffect(() => {
      if (!isTodaySelected) return;

      const now = Date.now();
      const prev = prevStateRef.current;
      const changed =
        prev.mode !== mode ||
        prev.sessionId !== sessionId ||
        prev.isPaused !== isPaused;
      const enoughTimePassed = now - lastUpdateTimeRef.current > 1000; // 1秒デバウンス

      if (changed && enoughTimePassed) {
        loadDailySessions(false);
        lastUpdateTimeRef.current = now;
      }

      prevStateRef.current = { mode, sessionId, isPaused };
    }, [mode, sessionId, isPaused, isTodaySelected, loadDailySessions]);

    const sessionBlocks = useMemo((): SessionBlock[] => {
      return sessions
        .map(session => ({
          session,
          startHour:
            session.startAt.getHours() + session.startAt.getMinutes() / 60,
          duration: session.actualFocusMs || session.focusMs,
          completed: session.completed,
          mood: session.moodStart || session.moodEnd || null,
        }))
        .sort((a, b) => a.startHour - b.startHour);
    }, [sessions]);

    // 今日の実績サマリーを計算
    const todaySummary = useMemo(() => {
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

    if (loading) {
      return (
        <div
          className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 ${className}`}
        >
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      );
    }

    return (
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 ${className}`}
      >
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {allEmojis.focused} 今日の実績
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {effectiveDate.toLocaleDateString('ja-JP')}
              </p>
            </div>

            {/* 実績サマリー */}
            <div className="text-right">
              <div
                className={`text-2xl font-bold mb-2 ${
                  todaySummary.concentrationRate >= 75
                    ? 'text-green-600 dark:text-green-400'
                    : todaySummary.concentrationRate >= 50
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-red-600 dark:text-red-400'
                }`}
              >
                集中度 {todaySummary.concentrationRate}%
              </div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                合計{todaySummary.totalSessions}回(
                {formatTimeCompact(todaySummary.totalFocusTime)})
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="relative">
            {sessionBlocks.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <div className="text-4xl mb-2">{allEmojis.calm}</div>
                <p className="text-sm">今日はまだセッションがありません</p>
                <p className="text-xs mt-1">
                  タイマーを開始して記録を作成しましょう
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Time scale */}
                <div className="flex justify-between text-xs text-gray-400 dark:text-gray-600 px-2">
                  {Array.from({ length: 13 }, (_, i) => i * 2).map(hour => (
                    <span key={hour}>{hour.toString().padStart(2, '0')}</span>
                  ))}
                </div>

                {/* Session blocks */}
                <div className="relative h-16 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                  {/* 現在時刻ライン（今日のみ表示） */}
                  {nowLeftPercent !== null && (
                    <>
                      <div
                        aria-label="現在時刻"
                        className="absolute top-0 bottom-0 w-[2px] bg-gray-900/60 dark:bg-gray-100/60 z-20 pointer-events-none"
                        style={{ left: `${nowLeftPercent}%` }}
                      />
                      {currentMood && (
                        <div
                          aria-label={`現在の気分: ${currentMood}`}
                          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 pointer-events-none"
                          style={{ left: `${nowLeftPercent}%` }}
                        >
                          <span className="inline-flex items-center justify-center rounded-full bg-white/80 dark:bg-gray-800/80 shadow px-1.5 py-0.5 text-[11px]">
                            {moodEmojis[currentMood]}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                  {sessionBlocks.map((block, index) => {
                    const leftPercent = (block.startHour / 24) * 100;
                    const widthPercent = Math.max(
                      1,
                      (block.duration / (24 * 60 * 60 * 1000)) * 100
                    );
                    // 完了セッションは気分に依存せず常にグリーン（green-500）で描画
                    const color = block.completed
                      ? '#22c55e'
                      : block.mood
                        ? moodColors[block.mood]
                        : '#6b7280';

                    return (
                      <div
                        key={index}
                        className="absolute top-1 bottom-1 rounded transition-all hover:scale-105 cursor-pointer"
                        style={{
                          left: `${leftPercent}%`,
                          width: `${widthPercent}%`,
                          backgroundColor: color,
                          opacity: block.completed ? 1 : 0.5,
                        }}
                        title={`${block.session.startAt.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} - ${block.session.completed ? '完了' : '未完了'}${block.mood ? ` (${moodEmojis[block.mood]} ${block.mood})` : ''}`}
                      >
                        {/* Session indicator */}
                        <div className="h-full flex items-center justify-center">
                          {block.mood && (
                            <span className="text-white text-xs font-bold drop-shadow">
                              {moodEmojis[block.mood]}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="flex flex-wrap justify-center gap-4 text-xs">
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-gray-400 rounded opacity-50"></div>
                    <span className="text-gray-600 dark:text-gray-400">
                      未完了
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span className="text-gray-600 dark:text-gray-400">
                      完了
                    </span>
                  </div>
                  {Object.entries(moodEmojis).map(([mood, emoji]) => (
                    <div key={mood} className="flex items-center space-x-1">
                      <span>{emoji}</span>
                      <span className="text-gray-600 dark:text-gray-400 capitalize">
                        {mood}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

DailyTimeGraph.displayName = 'DailyTimeGraph';

export default DailyTimeGraph;
