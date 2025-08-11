'use client';

import React, { useState } from 'react';
import { usePWA } from '@/hooks/usePWA';

export const PWAInstallBanner: React.FC = () => {
  const { isSupported, isInstalled, isInstallable, install } = usePWA();
  const [isInstalling, setIsInstalling] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't show if not supported, already installed, not installable, or dismissed
  if (!isSupported || isInstalled || !isInstallable || isDismissed) {
    return null;
  }

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      const success = await install();
      if (!success) {
        setIsDismissed(true); // Dismiss if user declined
      }
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-blue-600 text-white rounded-lg shadow-lg p-4 z-50 mx-auto max-w-sm">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
            <span className="text-2xl">🍅</span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold">アプリをインストール</h3>
          <p className="text-xs text-blue-100 mt-1">
            ホーム画面に追加して、いつでも快適にご利用いただけます
          </p>

          <div className="flex space-x-2 mt-3">
            <button
              onClick={handleInstall}
              disabled={isInstalling}
              className="px-3 py-1.5 bg-white text-blue-600 text-xs font-medium rounded hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isInstalling ? 'インストール中...' : 'インストール'}
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 text-blue-100 hover:text-white text-xs font-medium transition-colors"
            >
              後で
            </button>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-blue-100 hover:text-white transition-colors"
          aria-label="バナーを閉じる"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default PWAInstallBanner;
