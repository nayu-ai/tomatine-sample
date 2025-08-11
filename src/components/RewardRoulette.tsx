'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRewardStore } from '@/lib/stores/reward-store';

/**
 * ごほうび抽選機コンポーネント
 * - 最大5つの候補からランダム抽選
 * - 入力行の緑枠ハイライトを高速巡回→減速停止（ルーレット演出）
 * - 入力値はストレージに永続化（Zustand persist）
 */
export const RewardRoulette: React.FC = () => {
  const {
    items,
    setItem,
    clearItem,
    selectRandomIndex,
    commitSelection,
    lastSelectedIndex,
  } = useRewardStore();

  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(
    lastSelectedIndex ?? null
  );
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);
  const timeoutsRef = useRef<number[]>([]);

  // 抽選対象のインデックス配列
  const candidateIndices = useMemo(
    () =>
      items
        .map((v, i) => ({ v: v.trim(), i }))
        .filter(({ v }) => v.length > 0)
        .map(({ i }) => i),
    [items]
  );

  const canSpin = candidateIndices.length >= 2 && !isSpinning;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const update = () => setReducedMotion(mq.matches);
      update();
      mq.addEventListener('change', update);
      return () => mq.removeEventListener('change', update);
    }
  }, []);

  const clearPendingTimeouts = () => {
    timeoutsRef.current.forEach(id => window.clearTimeout(id));
    timeoutsRef.current = [];
  };

  useEffect(() => () => clearPendingTimeouts(), []);

  const spin = () => {
    if (!canSpin) return;

    const chosenIndex = selectRandomIndex();
    if (chosenIndex < 0) return;

    // 省モーション: 即時決定
    if (reducedMotion) {
      setActiveIndex(chosenIndex);
      commitSelection(chosenIndex);
      return;
    }

    setIsSpinning(true);
    clearPendingTimeouts();

    // ハイライト巡回の開始位置（現在の選択が候補に含まれていればそこから）
    const candidateCount = candidateIndices.length;
    const startPos =
      activeIndex != null
        ? Math.max(0, candidateIndices.indexOf(activeIndex))
        : 0;
    const start = startPos >= 0 ? startPos : 0;
    const chosenPos = candidateIndices.indexOf(chosenIndex);

    // 3..5 周 + 目的地までのオフセット
    const loops = 3 + Math.floor(Math.random() * 3); // 3..5
    const stepsToChosen = (chosenPos - start + candidateCount) % candidateCount;
    const totalSteps = loops * candidateCount + stepsToChosen;

    // イージング（減速）: easeOutQuad
    const minDelay = 55; // ms
    const maxDelay = 260; // ms

    const scheduleStep = (stepIndex: number, currentPos: number) => {
      const r = stepIndex / totalSteps;
      const delay = Math.round(minDelay + (maxDelay - minDelay) * r * r);
      const id = window.setTimeout(() => {
        const nextPos = (currentPos + 1) % candidateCount;
        const highlightItemIndex = candidateIndices[nextPos];
        setActiveIndex(highlightItemIndex);

        if (stepIndex >= totalSteps) {
          // 完了
          setIsSpinning(false);
          commitSelection(highlightItemIndex);
          if (navigator.vibrate) {
            try {
              navigator.vibrate(30);
            } catch {
              /* noop */
            }
          }
          clearPendingTimeouts();
          return;
        }
        scheduleStep(stepIndex + 1, nextPos);
      }, delay);
      timeoutsRef.current.push(id);
    };

    // 最初のステップをキック
    // start は "現在の位置"（直後に +1 される）
    scheduleStep(1, start);
  };

  const onInputChange = (index: number, value: string) => {
    // 32文字制限、改行は除去
    const sanitized = value.replace(/\n/g, '').slice(0, 32);
    setItem(index, sanitized);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      {/* Header */}
      <div className="mb-4 text-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          🎁 ごほうび抽選機
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          最大6件まで入力して抽選できます
        </p>
      </div>

      <div className="flex flex-col items-center gap-4">
        {/* Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
          {items.map((val, i) => {
            const selected = activeIndex === i;
            const isEmpty = val.trim().length === 0;
            return (
              <div
                key={i}
                className={`flex items-center gap-2 ${selected ? 'ring-2 ring-emerald-400 rounded-md' : ''}`}
              >
                <input
                  type="text"
                  value={val}
                  onChange={e => onInputChange(i, e.target.value)}
                  maxLength={32}
                  placeholder={DEFAULT_PLACEHOLDERS[i]}
                  disabled={isSpinning}
                  className={`flex-1 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${isEmpty ? 'opacity-70' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => clearItem(i)}
                  disabled={isSpinning}
                  className={`shrink-0 px-2 py-1 text-xs rounded ${isSpinning ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'} text-gray-700 dark:text-gray-300`}
                  aria-label={`項目${i + 1}をクリア`}
                >
                  クリア
                </button>
              </div>
            );
          })}
        </div>

        {/* Controls */}
        <div className="mt-2">
          <button
            type="button"
            onClick={spin}
            disabled={!canSpin}
            className={`inline-flex items-center px-4 py-2 rounded-md text-white text-sm font-medium ${canSpin ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'}`}
          >
            {isSpinning ? '抽選中…' : '抽選する'}
          </button>
        </div>

        {/* Result */}
        <div className="min-h-[1.5rem]" aria-live="polite">
          {activeIndex != null && items[activeIndex].trim().length > 0 && (
            <p className="text-sm text-gray-800 dark:text-gray-200">
              当選: <span className="font-semibold">{items[activeIndex]}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

const DEFAULT_PLACEHOLDERS = [
  'コーヒー',
  '5分散歩',
  '好きな曲',
  'おやつ',
  'SNS 3分',
  'ストレッチ',
];

export default RewardRoulette;
