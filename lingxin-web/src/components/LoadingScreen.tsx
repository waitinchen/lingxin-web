import React from 'react';

interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({ message = '加載中...' }: LoadingScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-blue-900">
      <div className="text-center">
        {/* Logo and branding */}
        <div className="mb-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">靈信 2.0</h1>
          <p className="text-gray-600 dark:text-gray-400">智能對話助理</p>
        </div>
        
        {/* Loading animation */}
        <div className="relative">
          <div className="w-12 h-12 mx-auto">
            <div className="absolute inset-0 border-4 border-blue-200 dark:border-blue-800 rounded-full animate-pulse"></div>
            <div className="absolute inset-0 border-4 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
          </div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">{message}</p>
        </div>
      </div>
    </div>
  );
}