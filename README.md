## 🍅 Tomatine

心理学アプローチのポモドーロ・タイマー。オフライン対応の PWA として動作し、ローカルにセッション履歴を記録します。

英語版の概要は末尾を参照してください（English summary below）

## このリポジトリについて

**注**: これは一時的なショーケース用に作成されたサンプル/デモ版です。

### デモ目的のみ
このリポジトリは、デモと学習を目的としています。

### 技術スタック
- Next.js 15
- TypeScript
- Tailwind CSS
- IndexedDB (Dexie.js)
- PWA サポート

---

## 機能概要（現行仕様）

- タイマー表示は常に 0:00 形式（分:秒）
- 残り時間サークル内にモード名・ステータスを表示
  - 例: 「集中時間 / 一時停止中」「開始するモードを選んでください（待機時）」
- モード: ウォームアップ → 集中 → 休憩（手動/自動の組合せ）
- コントロール: 集中開始（スキップ可）/ ウォームアップ / 休憩 / 一時停止・再開 / スキップ / 停止
- 気分選択: ボタンのトグルで選択・解除（選択中の下部サマリーは削除済）
- 今日の実績（DailyTimeGraph）
  - 当日セッションのタイムラインを24時間スケールで表示
  - バー色は「moodStart または moodEnd」を使用
  - 完了セッションは不透明、未完了は半透明
  - 「現在時刻の縦ライン」と「現在選択中の気分アイコン」をオーバーレイ表示（当日のみ）
  - 凡例の完了は緑で統一

---

## データモデル / 保存仕様

IndexedDB（Dexie）に3テーブルを保持します（`src/lib/database.ts`）。

- `sessions`: セッション履歴
  - 主なフィールド: `startAt`, `endAt`, `focusMs`, `breakMs`, `actualFocusMs`, `completed`, `moodStart`, `moodEnd`, `taskNote`, `warmupSkipped`
  - 生成タイミング: ウォームアップ開始時または集中開始（ウォームアップスキップ時）
  - 完了タイミング: 集中完了時に `completed: true`, `endAt`, `actualFocusMs` を更新
  - 気分の更新: 完了時点で「現在選択中の気分」が開始時と異なる場合のみ `moodEnd` を保存
  - 停止: タイマー状態のみリセット（セッションは未完了のまま残る）
- `userPrefs`: ユーザー設定（単一レコード）
- `timerState`: 復旧用の現在状態（単一レコード）

データ取得の例（実績表示）

- 当日分は `getSessionsByDateRange('today')` で取得
- 合計集中時間は `actualFocusMs || focusMs` の合計（完了セッションのみ）

---

## 画面仕様（抜粋）

- 残り時間サークル（`src/components/TimerDisplay.tsx`）
  - 中央に残り時間（0:00）、中央下部にモード名、副ラベルに一時停止などのステータス
  - 進捗リング色: 集中=赤 / 休憩=緑 / ウォームアップ=橙 / その他=青

- 今日の実績（`src/components/DailyTimeGraph.tsx`）
  - 当日セッションの棒描画、現在時刻ライン、気分アイコン（選択中）
  - 統計サマリ: 完了数/総数、合計集中時間

- 気分選択（`src/components/MoodSelector.tsx`）
  - ボタングリッドで選択/解除（再押下で解除）
  - サマリー表示と解除リンクは削除済（ボタン表現で状態が分かるため）

---

## ディレクトリ構成

```
src/
  app/                # Next.js App Router
  components/         # UIコンポーネント
  hooks/              # React hooks
  lib/                # 型・DB・ユーティリティ
    stores/           # Zustand ストア
  __tests__/          # テスト（雛形）
```

主要コンポーネント

- `TimerDisplay.tsx`, `TimerControls.tsx`, `DailyTimeGraph.tsx`, `MoodSelector.tsx`
- `CompletionFeedback.tsx`, `SessionRecoveryModal.tsx`, `PWAInstallBanner.tsx`

---

## 開発・実行

前提: Node.js（LTS 推奨）

1. 依存関係インストール
   ```bash
   npm ci
   ```
2. 開発サーバ起動
   ```bash
   npm run dev
   ```
3. 型チェック / Lint / テスト
   ```bash
   npm run type-check
   npm run lint
   npm test
   ```

---

## 実装メモ / 制限事項

- 気分履歴 `moodChanges` は未実装（将来拡張）
- 休憩の実績（`actualBreakMs`）は未保存
- 実績の再読込は「モードが idle に遷移して5秒経過」で発火
- 当日判定は `startAt` 基準（0時跨ぎでは開始日に計上）
- タイムラインは24時間スケールのため、短いセッションは細く表示

---

## 技術スタック

- Next.js 15 / React 19 / TypeScript
- Zustand
- Dexie (IndexedDB)
- Jest / Playwright（テスト設定あり）

---

## English (Short Summary)

### About This Repository
This is a demonstration sample of a PWA Pomodoro Timer application.

**Note**: This is a sample/demo version created for temporary showcase purposes.

### Demo Purpose Only
This repository is intended for demonstration and learning purposes.

Tomatine is a psychology-based Pomodoro timer (Next.js 15 + React 19). It stores sessions locally via Dexie/IndexedDB. The circular timer shows remaining time in mm:ss with the mode and status inside the circle. The DailyTimeGraph renders today’s sessions on a 24h scale, overlays a vertical "now" line and the current mood icon, and uses green for completed sessions in the legend.

Session lifecycle: a record is created on warmup start or focus start (when skipping warmup). On completion, `completed`, `endAt`, and `actualFocusMs` are saved. If the current mood differs from the start mood, `moodEnd` is stored. Stop only resets timer state (the session remains incomplete).

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

Copyright (c) 2025 Souma Nayu
