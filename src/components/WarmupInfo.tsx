'use client';

import React from 'react';
import { usePWA } from '@/hooks/usePWA';

interface WarmupInfoProps {
  className?: string;
}

export const WarmupInfo: React.FC<WarmupInfoProps> = ({ className = '' }) => {
  const { isSupported, isInstalled, isInstallable, install } = usePWA();

  const handleInstall = async () => {
    try {
      await install();
    } catch {
      // インストールエラーは開発時のみ出力（本番環境では削除）
    }
  };

  return (
    <div
      className={`bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 ${className}`}
    >
      <div className="text-center space-y-3">
        {/* Header */}
        <div className="flex items-center justify-center space-x-2">
          <span className="text-amber-600 dark:text-amber-400 text-lg">🔥</span>
          <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            ウォームアップについて
          </h3>
        </div>

        {/* Description */}
        <p className="text-xs text-amber-700 dark:text-amber-400 max-w-sm mx-auto">
          心理学に基づく3分間のウォームアップで、段階的に集中モードに入ることができます。
          軽いタスクの整理や深呼吸でリラックスしましょう。
        </p>

        {/* Benefits (simplified) */}
        <div className="flex items-center justify-center space-x-4 text-xs text-amber-600 dark:text-amber-500">
          <div className="flex items-center space-x-1">
            <span>⚡</span>
            <span>段階的準備</span>
          </div>
          <div className="flex items-center space-x-1">
            <span>🎯</span>
            <span>心理的準備</span>
          </div>
          <div className="flex items-center space-x-1">
            <span>🧠</span>
            <span>集中力向上</span>
          </div>
        </div>

        {/* PWA Install Link - 条件付きで表示 */}
        {isSupported && !isInstalled && isInstallable && (
          <div className="pt-2 border-t border-amber-200 dark:border-amber-700">
            <button
              onClick={handleInstall}
              className="inline-flex items-center space-x-2 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium rounded-md transition-colors duration-200"
            >
              <span>📱</span>
              <span>アプリとしてインストール</span>
            </button>
            <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
              ホーム画面に追加して、いつでも快適にご利用いただけます
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WarmupInfo;
