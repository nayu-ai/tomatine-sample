import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { StateStorage } from 'zustand/middleware';

/**
 * ごほうび抽選機 用 Zustand ストア
 * - 最大6件のアイテムを保持
 * - 直近の当選インデックス/時刻を記録
 * - SSR セーフな localStorage 永続化
 */

// SSR セーフな最小限のインメモリストレージ
const inMemoryStorage = (): StateStorage => ({
  getItem: (_name: string): string | null => null,
  setItem: (_name: string, _value: string): void => {},
  removeItem: (_name: string): void => {},
});

// ガード付きストレージプロバイダ（ブラウザでは localStorage、SSR ではメモリ）
const guardedStorageProvider = (): StateStorage =>
  typeof window !== 'undefined' && window?.localStorage
    ? window.localStorage
    : inMemoryStorage();

// デフォルト候補（初期値）
const DEFAULT_REWARD_ITEMS: string[] = [
  'コーヒー',
  '5分散歩',
  '好きな曲',
  'おやつ',
  'SNS 3分',
  'ストレッチ',
];

export interface RewardStoreState {
  /** 最大6件の候補配列（空文字は抽選対象外） */
  items: string[];
  /** 直近の当選インデックス（items 配列のインデックス） */
  lastSelectedIndex: number | null;
  /** 直近当選時刻（epoch ms） */
  lastSelectedAt: number | null;

  /** 値を設定（32文字にトリム） */
  setItem: (index: number, value: string) => void;
  /** 指定行を空文字にする */
  clearItem: (index: number) => void;
  /** 既定値にリセット */
  resetDefaults: () => void;
  /** 抽選対象からランダム選択した items インデックスを返す（なければ -1） */
  selectRandomIndex: () => number;
  /** 当選確定を記録 */
  commitSelection: (index: number) => void;
}

export const useRewardStore = create<RewardStoreState>()(
  persist(
    (set, get) => ({
      items: [...DEFAULT_REWARD_ITEMS],
      lastSelectedIndex: null,
      lastSelectedAt: null,

      setItem: (index, value) => {
        if (index < 0 || index > 5) return;
        const trimmed = value.slice(0, 32);
        set(state => {
          const next = state.items.slice();
          next[index] = trimmed;
          return { items: next };
        });
      },

      clearItem: index => {
        if (index < 0 || index > 5) return;
        set(state => {
          const next = state.items.slice();
          next[index] = '';
          return { items: next };
        });
      },

      resetDefaults: () => set({ items: [...DEFAULT_REWARD_ITEMS] }),

      selectRandomIndex: () => {
        const { items, lastSelectedIndex } = get();
        const candidateIndices = items
          .map((v, i) => ({ v: v.trim(), i }))
          .filter(({ v }) => v.length > 0)
          .map(({ i }) => i);

        if (candidateIndices.length < 2) return -1; // 抽選不可条件

        const pick = (): number => {
          const r = Math.floor(Math.random() * candidateIndices.length);
          return candidateIndices[r];
        };

        let chosen = pick();
        if (candidateIndices.length > 1 && chosen === lastSelectedIndex) {
          // 直前と同じなら 1 回だけ引き直し
          chosen = pick();
        }
        return chosen;
      },

      commitSelection: index => {
        if (index < 0 || index > 5) return;
        set({ lastSelectedIndex: index, lastSelectedAt: Date.now() });
      },
    }),
    {
      name: 'tomatine-reward-roulette-v1',
      version: 2,
      migrate: (persistedState: any, version) => {
        if (!persistedState) return persistedState;
        const items: string[] = Array.isArray(persistedState.items)
          ? persistedState.items.slice()
          : [];
        // 長さを6に合わせる（不足分はデフォルトで埋め、超過分は切り詰め）
        while (items.length < 6) {
          items.push(DEFAULT_REWARD_ITEMS[items.length] ?? '');
        }
        if (items.length > 6) {
          items.length = 6;
        }
        const lastSelectedIndex =
          typeof persistedState.lastSelectedIndex === 'number' &&
          persistedState.lastSelectedIndex >= 0 &&
          persistedState.lastSelectedIndex < 6
            ? persistedState.lastSelectedIndex
            : null;
        return {
          ...persistedState,
          items,
          lastSelectedIndex,
        };
      },
      partialize: state => ({
        items: state.items,
        lastSelectedIndex: state.lastSelectedIndex,
        lastSelectedAt: state.lastSelectedAt,
      }),
      storage: createJSONStorage(guardedStorageProvider),
    }
  )
);
