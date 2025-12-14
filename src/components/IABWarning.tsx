'use client';

import { useState, useCallback } from 'react';
import { getOpenInBrowserUrl, isIOS } from '@/lib/detect-iab';

interface IABWarningProps {
  appName: string;
}

export function IABWarning({ appName }: IABWarningProps) {
  const [copied, setCopied] = useState(false);

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  const openUrl = getOpenInBrowserUrl();
  const iosDevice = isIOS();

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = currentUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [currentUrl]);

  const handleOpenInBrowser = useCallback(() => {
    window.location.href = openUrl;
  }, [openUrl]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-800/50 border border-slate-700 rounded-2xl p-8 text-center space-y-6">
        {/* Icon */}
        <div className="text-6xl">🎤</div>

        {/* Title */}
        <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          Jazz Scat needs your microphone
        </h1>

        {/* Explanation */}
        <p className="text-slate-300">
          {appName}&apos;s browser blocks microphone access.
          Please open this page in{' '}
          <span className="text-white font-medium">
            {iosDevice ? 'Safari' : 'Chrome'}
          </span>{' '}
          to use Jazz Scat.
        </p>

        {/* Open in Browser Button */}
        {!iosDevice && (
          <button
            onClick={handleOpenInBrowser}
            className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl font-semibold text-lg transition-all shadow-lg shadow-purple-500/25"
          >
            🌐 Open in Browser
          </button>
        )}

        {/* iOS Instructions */}
        {iosDevice && (
          <div className="bg-slate-700/50 rounded-xl p-4 text-left space-y-2">
            <p className="text-sm font-medium text-slate-200">On iOS:</p>
            <ol className="text-sm text-slate-300 space-y-1 list-decimal list-inside">
              <li>Tap the <span className="text-white">⋯</span> menu button</li>
              <li>Select &quot;Open in Safari&quot;</li>
            </ol>
          </div>
        )}

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-700" />
          <span className="text-xs text-slate-500 uppercase">or copy link</span>
          <div className="flex-1 h-px bg-slate-700" />
        </div>

        {/* Copy Link */}
        <button
          onClick={handleCopyLink}
          className="w-full py-3 px-4 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
        >
          {copied ? (
            <>
              <span className="text-green-400">✓</span>
              <span className="text-green-400">Copied!</span>
            </>
          ) : (
            <>
              <span>📋</span>
              <span className="text-slate-300 truncate max-w-[200px]">
                {currentUrl.replace(/^https?:\/\//, '')}
              </span>
            </>
          )}
        </button>

        {/* Subtle branding */}
        <p className="text-xs text-slate-500">
          Jazz Scat - Your AI Jam Partner
        </p>
      </div>
    </div>
  );
}
