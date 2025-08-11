import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { StateStorage } from 'zustand/middleware';

// SSR セーフな最小限のインメモリストレージ
// getItem は常に null を返し、setItem/removeItem は no-op
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

// 絵文字タイプのユニオン型を定義（型安全かつ網羅性の担保）
export type EmojiType =
  | 'title'
  | 'energetic'
  | 'focused'
  | 'calm'
  | 'tired'
  | 'distracted';

// 通常モードの絵文字マッピング
export const NORMAL_EMOJIS: Record<EmojiType, string> = {
  title: '🍅',
  energetic: '⚡',
  focused: '🎯',
  calm: '😌',
  tired: '😴',
  distracted: '🌀',
};

// 猫モードの絵文字マッピング
export const CAT_EMOJIS: Record<EmojiType, string> = {
  title: '😺',
  energetic: '😻',
  focused: '😺',
  calm: '🐱',
  tired: '😿',
  distracted: '🙀',
};

interface EasterEggState {
  isCatMode: boolean;
  toggleCatMode: () => void;
  getEmoji: (type: EmojiType) => string;
}

export const useEasterEggStore = create<EasterEggState>()(
  persist(
    (set, get) => ({
      isCatMode: false,

      toggleCatMode: () => {
        set(state => {
          const newMode = !state.isCatMode;
          return { isCatMode: newMode };
        });
      },

      getEmoji: (type: EmojiType) => {
        const { isCatMode } = get();
        return isCatMode ? CAT_EMOJIS[type] : NORMAL_EMOJIS[type];
      },
    }),
    {
      name: 'tomatine-easter-egg',
      partialize: state => ({ isCatMode: state.isCatMode }),
      storage: createJSONStorage(guardedStorageProvider),
    }
  )
);

// 絵文字の更新を監視するセレクター
export const useEasterEggEmojis = () => {
  const _isCatMode = useEasterEggStore(state => state.isCatMode);
  const emoji = useEasterEggStore(state => state.getEmoji);

  const allEmojis = {
    title: emoji('title'),
    energetic: emoji('energetic'),
    focused: emoji('focused'),
    calm: emoji('calm'),
    tired: emoji('tired'),
    distracted: emoji('distracted'),
  };

  return { allEmojis, isCatMode: _isCatMode };
};
