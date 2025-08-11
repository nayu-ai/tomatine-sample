## ごほうび抽選機（Reward Roulette）設計書

### 概要 / Overview

- 本体タイマーから独立した軽量機能として「ごほうび抽選機」を提供する。
- 最大 5 件のごほうび候補を入力し、「抽選する」ボタンでルーレット式に指示マーカーが回転、停止位置の項目をハイライトする。
- 入力内容と直近の当選情報はクライアントストレージに永続化（IndexedDB は未使用、Zustand + localStorage）。
- 配置は `今日の実績` と `ウォームアップについて` の間。

### 目的 / Goals

- 集中セッション完了後のモチベーション維持・報酬選択を支援。
- 既存のタイマー/セッション DB に影響を与えず導入。

### UI/UX 仕様

- **コンテナ**: `bg-white dark:bg-gray-800 rounded-lg shadow-md p-6`
- **見出し**: 「🎁 ごほうび抽選機」+ サブテキスト「最大5件まで入力して抽選できます」
- **入力欄**: 5 行まで（固定 5 行表示）。空欄は抽選対象外。文字数上限 32。
- **抽選ボタン**: 「抽選する」
  - 活性条件: 空でない項目が 2 件以上
  - 抽選中は無効化 + スピナー表示
- **ルーレット**: 5 分割のリング。円周上にラベルを配置。中央の指示マーカーが回転して停止。
- **結果表示**: 当選欄をハイライト（`ring-emerald-400`）し、下部に当選テキストを表示。
- **アクセシビリティ**: `aria-live="polite"` で結果を読み上げ。キーボード操作対応（Enter/Space で抽選）。
- **省エネモード**: `prefers-reduced-motion` 有効時はアニメーション省略。

### 状態管理 / State

- 新規ストア: `src/lib/stores/reward-store.ts`
  - `items: string[]`（長さ 5）
  - `lastSelectedIndex: number | null`
  - `lastSelectedAt: number | null`
  - Actions:
    - `setItem(index: number, value: string)`
    - `clearItem(index: number)`
    - `resetDefaults()`
    - `selectRandomIndex(): number`（-1 を返す場合は抽選不可）
    - `commitSelection(index: number)`
  - 永続化: `zustand` + `persist` + `createJSONStorage(guardedStorageProvider)`
  - 保存キー: `tomatine-reward-roulette-v1`

### 抽選仕様 / Algorithm

1. `candidates = items.filter(v => v.trim() !== '')` を用意
2. 直前の当選と同一の場合は 1 回のみリロール
3. 回転角度: 5 スロット固定（1 スロット = 72°）。`rounds = 4..5` 周 + 選択スロット角 + 微小ジッター（±10°）。
4. 終了時に当選 index を `commitSelection`。

### コンポーネント構成

- `src/components/RewardRoulette.tsx`
  - Header, Inputs, Wheel, Controls, Result のセクション
  - 依存: `useRewardStore`
  - 任意: 当選時に `navigator.vibrate(30)` を試行

### 配置 / Integration

- `src/app/page.tsx`
  - `DailyTimeGraph` の直後、`WarmupInfo` の直前に `<RewardRoulette />` を差し込み

### 永続化 / Persistence

- ローカル専用（Zustand persist → localStorage）。SSR セーフにガード。
- 既存 Dexie DB とは独立。

### アクセシビリティ / A11y

- `aria-live` で結果を通知
- フォーカス移動: 抽選後に当選項目へフォーカスリング表示
- `prefers-reduced-motion` 準拠

### エッジケース

- 空欄のみ / 1 件のみ: 抽選不可（ボタン無効）
- 入力値は `trim()` の上で 32 文字に制限
- 入力に絵文字を含む場合のサロゲート対策はブラウザの標準挙動に委譲

### テスト計画（抜粋）

- 単体: `selectRandomIndex` が空欄を除外し、直前重複回避が働く
- 永続: `items` と `lastSelected*` が保存/復元される
- 画面: 入力→抽選→当選ハイライト、`prefers-reduced-motion` 分岐
- E2E: リロード後も入力が残存、当選の視覚/読み上げ確認

### ToDo リスト

- [ ] 単体テスト追加（ストアの選択ロジック）
- [ ] 画面テスト追加（React Testing Library）
- [ ] E2E シナリオ追加（Playwright）
- [ ] 当選履歴の表示（任意、今回は非スコープ）
- [ ] 重み付け抽選のオプション（任意、今回は非スコープ）
- [ ] サウンド再生（ユーザー設定 `soundEnabled` 連携、任意）

---

最終更新: 2025-08-11
