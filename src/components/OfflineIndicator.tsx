'use client';

import React from 'react';
import { usePWA } from '@/hooks/usePWA';

export const OfflineIndicator: React.FC = () => {
  const { isOffline } = usePWA();

  if (!isOffline) return null;

  return (
    <div className="fixed top-4 left-4 right-4 bg-amber-600 text-white rounded-lg shadow-lg p-3 z-50 mx-auto max-w-sm">
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>

        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-semibold">オフライン中</h3>
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-white rounded-full animate-pulse"></div>
              <div
                className="w-1 h-1 bg-white rounded-full animate-pulse"
                style={{ animationDelay: '0.2s' }}
              ></div>
              <div
                className="w-1 h-1 bg-white rounded-full animate-pulse"
                style={{ animationDelay: '0.4s' }}
              ></div>
            </div>
          </div>
          <p className="text-xs text-amber-100 mt-1">
            インターネット接続なしでも使用できます
          </p>
        </div>
      </div>
    </div>
  );
};

export default OfflineIndicator;
