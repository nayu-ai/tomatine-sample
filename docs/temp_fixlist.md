# useUIStore()使用方法修正 ToDoリスト

## 概要

useUIStore()の使用方法に関する問題を修正し、適切なセレクターパターンを使用してパフォーマンスを最適化する。

## 修正対象の洗い出し

### 1. 直接的な状態アクセス（修正必須）

- **問題**: `useUIStore()`で直接状態にアクセスすると、その状態が変更されるたびにコンポーネントが再レンダリングされる
- **解決策**: セレクター関数を使用して必要な状態のみを取得する

### 2. 修正済み箇所 ✅

- `src/app/page.tsx` - `useUIStore(state => state.toasts)` でセレクター使用済み
- `src/hooks/use-timer.ts` - `useUIStore(state => ({ showSuccessToast, showWarningToast }))` でセレクター使用済み
- `src/components/DevTestPanel.tsx` - 個別セレクターで使用済み（現行コード上）
- `src/components/CompletionFeedback.tsx` - 適切に使用済み
- `src/components/SessionRecoveryModal.tsx` - 適切に使用済み
- `src/components/TimerControls.tsx` - `timerSelectors`を使用して最適化完了 ✅ **2024年最新修正**

### 3. 修正が必要な箇所 ❌

- ~~`src/components/TimerControls.tsx` - 現在はuseTimerStoreのみ使用、UI状態が必要な場合はセレクター追加が必要~~ **修正完了**

### 4. 既存のセレクター（参考）

- `src/lib/stores/index.ts` に以下のセレクターが定義済み:
  - `timerSelectors` - タイマー状態（mode, isRunning, isPaused, remaining等）
  - `uiSelectors.modals` - モーダル状態
  - `uiSelectors.display` - テーマ・表示設定
  - `uiSelectors.notifications` - 通知権限
  - `uiSelectors.device` - デバイス情報
  - `userSelectors` - ユーザー設定・プリセット

---

## 実行時エラーの状況（更新）

- **エラー**: `ReferenceError: uiStore is not defined`
- **発生箇所**: `DevTestPanel` コンポーネントのレンダリング時（スタックトレースより）
- **ソース確認**: 現在のリポジトリ内に `uiStore` 直参照は無し（例示以外）
- **有力仮説（更新）**: Service Worker により古いJSチャンクがキャッシュ配信され、旧コード（`const uiStore = useUIStore();`）が実行されている

### 実施した対策（コード変更）

- `src/app/layout.tsx`: Service Worker 登録を本番環境のみ有効化
  - `if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') { ... }`
- `src/app/page.tsx`: 開発環境での起動時に SW 登録解除と Cache API の全削除を実行
  - `navigator.serviceWorker.getRegistrations().then(r => r.forEach(unregister))`
  - `caches.keys().then(keys => keys.forEach(delete))`

### 手動での推奨手順（開発者向け）

- ブラウザのアプリケーションストレージをクリア
  - Application → Service Workers: Unregister、Update on reload ON
  - Clear storage: Cache Storage / IndexedDB / LocalStorage をクリア
- Next.js 開発サーバ再起動
  - `.next` ディレクトリ削除→`npm run dev`

### 次アクション

- [ ] 上記キャッシュクリア後に再現確認
- [ ] まだエラーが出る場合、スタックの該当行に対応するソースマップから旧コード参照箇所を特定
- [ ] `DevTestPanel.tsx` のみを一時的に非表示にして切り分け（`<DevTestPanel />`をコメントアウト）

---

## ブラウザでの手順（Chrome / Edge 共通）

1. DevToolsを開く

- キーボード: F12 または Ctrl+Shift+I
- メニュー: 右上メニュー → その他のツール → デベロッパーツール

2. Applicationタブへ移動

- タブが見当たらない場合は「»」→ Application を選択

3. Service WorkerのUnregister

- 左ペイン: Application → Service Workers
- 対象オリジン（現在のサイト）のエントリで以下を実行
  - [Unregister] をクリック
  - 「Update on reload」をONにする（更新時に最新SWへ更新）
- 画面上に「No service worker registered」等が表示されればOK

4. ストレージのクリア

- 左ペイン: Application → Storage → Clear storage
- チェックを入れる（最低限）
  - Unregister service workers（表示される場合）
  - Cache Storage
  - IndexedDB
  - Local Storage
  - Session Storage
  - Cookies（サインイン情報など消去されるため必要時のみ）
- [Clear site data] をクリック

5. ハードリロード（キャッシュ空にして再読込）

- DevToolsを開いたまま、リロードボタンを長押し →「Empty Cache and Hard Reload」を選択

6. 確認

- 再度 Application → Service Workers を開き、アクティブなSWが無いことを確認
- 以後、開発中はSWが登録されない（本番のみ登録）状態で動作

補足

- PWAをインストール済みの場合は、OS側のPWA（アプリ）も一旦アンインストールすると確実です
- すべてのタブで同一オリジンを閉じたうえで作業すると反映が早くなります

---

## 修正タスク

### 高優先度 🔴

- [x] `TimerControls.tsx`でUI状態が必要な場合のセレクター追加検討 ✅ **完了**
- [x] 必要に応じて新しいセレクター関数の作成 ✅ **既存のtimerSelectorsを使用**
- [x] SWの本番限定登録 + 開発時のキャッシュクリア処理追加 ✅
- [ ] 実行時エラー `uiStore is not defined` の再現確認と最終クローズ

### 中優先度 🟡

- [ ] 既存セレクターの使用状況確認
- [ ] パフォーマンス最適化のためのセレクター追加検討

### 低優先度 🟢

- [ ] セレクター使用パターンの統一化
- [ ] ドキュメント更新

## 技術的詳細

### 正しい使用方法

```typescript
// ✅ 良い例: セレクター関数を使用
const toasts = useUIStore(state => state.toasts);
const { showSuccessToast, showErrorToast } = useUIStore(state => ({
  showSuccessToast: state.showSuccessToast,
  showErrorToast: state.showErrorToast,
}));

// ✅ 良い例: 既存セレクターを使用（TimerControls.tsxで採用）
const mode = useTimerStore(timerSelectors.mode);
const isRunning = useTimerStore(timerSelectors.isRunning);
const isPaused = useTimerStore(timerSelectors.isPaused);

// ❌ 悪い例: 直接アクセス（例示）
const uiStore = useUIStore();
const toasts = uiStore.toasts; // これだと全状態変更で再レンダリング
```

### セレクターの利点

1. **パフォーマンス向上**: 必要な状態のみを監視
2. **不要な再レンダリング防止**: 関係ない状態変更の影響を受けない
3. **コード可読性**: どの状態を使用しているかが明確
4. **再利用性**: 既存セレクターの活用で開発効率向上

## 修正完了状況 📊

- **全体進捗**: セレクター最適化 100%、ランタイムエラーはキャッシュ由来の可能性に対処中
- **最終修正日**: 2024年12月
- **修正内容**: TimerControls最適化、SW本番限定化、開発時キャッシュクリア追加

## 参考資料

- `src/lib/stores/index.ts` - 既存セレクター定義
- `src/lib/stores/ui-store.ts` - UIストア実装
- `src/lib/stores/timer-store.ts` - タイマーストア実装
- `public/sw.js` - サービスワーカー
- `src/app/layout.tsx` - SW登録コード
- `src/hooks/usePWA.ts` - SW補助フック
- Zustand公式ドキュメント - セレクター使用パターン

---

## 新観測エラー（更新）

- **エラー**: `ReferenceError: useCallback is not defined`
- **発生箇所**: `src/components/SessionRecoveryModal.tsx`
- **原因**: `useCallback` の未インポート
- **対応**: インポートを追加
  - 変更: `import React, { useEffect, useState } from 'react';`
    → `import React, { useEffect, useState, useCallback } from 'react';`
- **確認**: リンターエラー無し

### タスク更新

- [x] `SessionRecoveryModal.tsx` の `useCallback` 未インポート修正 ✅
- [ ] 再起動/キャッシュクリア後の動作確認（継続）

---

## Hydration mismatch（SSR/CSR不一致）について（新規）

- **症状**: SSRのHTMLとクライアント初期描画の属性が一致せず警告
- **観測差分**: `data-darkreader-proxy-injected` や `data-darkreader-inline-stroke` など、ダークモード系ブラウザ拡張が注入する属性の差分
- **主要原因**:
  - ブラウザ拡張（Dark Reader等）によるDOM属性の注入
  - クライアント側での動的値（`Date.now()` など）とSSRの乖離
  - 環境分岐（`if (typeof window !== 'undefined')`）の描画差
- **対策（今回実施）**:
  - `src/app/layout.tsx` の `<html>` に `suppressHydrationWarning` を付与
  - `src/components/CircularProgress.tsx` のコンテナに `suppressHydrationWarning` を付与（動的style/描画周辺の差異を許容）
- **推奨運用**:
  - 開発中はダークモード系等の拡張を一時無効化して確認
  - SSRとCSRの差異を生むAPI（`Date.now()`, `Math.random()`, ロケール依存フォーマット）を初期レンダでは避け、必要時は`useEffect`でクライアント同期
  - UIテーマ適用などは初回描画前に安定化（現状はUIストアの初期化で対応）

### タスク

- [x] `<html>` に `suppressHydrationWarning` 追加 ✅
- [x] `CircularProgress` コンテナへ `suppressHydrationWarning` 追加 ✅
- [ ] ブラウザ拡張無効化での再現確認
- [ ] SSR/CSR差異が残る箇所の洗い出し（`formatTime`のロケール差異など）

---

## 新観測エラー（更新2）

- **エラー**: `Error: Maximum update depth exceeded`
- **発生箇所**: `src/components/DailyTimeGraph.tsx` の `loadDailySessions`（スタックより）
- **原因**:
  - `selectedDate = new Date()` をデフォルト値にしており、毎レンダで `new Date()` が再生成 → `useCallback` の依存が毎回変化 → `useEffect`が再実行を繰り返す可能性
- **対応**:
  - デフォルト引数を撤廃し、`useMemo`で `effectiveDate` を安定化
  - 以降は `effectiveDate` を `useCallback` と表示用フォーマットに使用
- **変更ファイル**:
  - `src/components/DailyTimeGraph.tsx`
- **確認**: リンターエラー無し

### タスク更新

- [x] `DailyTimeGraph` の無限更新ループ対策 ✅
- [ ] 再現確認（ブラウザ拡張無効のままテスト）

---

## 404（アイコン/スクリーンショット）について（新規）

- **症状**: `/screenshot-*.png`, `/icon-192x192.png`, `/icon-512x512.png` が 404
- **原因**: `public/` に該当PNGが存在しないのに `manifest.json` と SW/通知で参照していた
- **対応**:
  - `public/manifest.json` の `icons` を存在するSVG（`/next.svg`, `/vercel.svg`）に変更、`screenshots` を削除
  - 通知用アイコンパスを `/next.svg` に変更
    - `src/hooks/use-timer.ts`
    - `public/sw.js`
- **残タスク**:
  - [ ] 将来的にPWA向けPNGアイコン（`icon-192x192.png`, `icon-512x512.png`）をデザインして追加（`public/` 配下）
  - [ ] PNGを用意次第、`manifest.json` とSW/通知のパスをPNGへ戻す
