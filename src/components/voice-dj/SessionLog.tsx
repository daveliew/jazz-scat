'use client';

import { useRef, useEffect } from 'react';
import { LogEntry, VoiceDJAppState } from '@/types/voice-dj';

interface SessionLogProps {
  sessionLog: LogEntry[];
  liveTranscript: string;
  appState: VoiceDJAppState;
  isConnected: boolean;
}

export function SessionLog({
  sessionLog,
  liveTranscript,
  appState,
  isConnected,
}: SessionLogProps) {
  const logRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [sessionLog, liveTranscript]);

  return (
    <div className="lg:sticky lg:top-8 lg:self-start">
      <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 p-4">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">
          Session Log
        </h2>
        <div
          ref={logRef}
          className="bg-slate-900/50 rounded-lg p-3 max-h-96 overflow-y-auto border border-slate-700/50"
        >
          {sessionLog.length === 0 && !isConnected && (
            <p className="text-slate-500 text-sm italic">
              Start a session to see the conversation...
            </p>
          )}
          {[...sessionLog]
            .sort((a, b) => a.seq - b.seq)
            .map((entry) => (
              <div key={entry.seq} className="text-sm mb-2">
                <span
                  className={
                    entry.role === 'agent' ? 'text-purple-400' : 'text-blue-400'
                  }
                >
                  {entry.role === 'agent' ? '🎵 DJ: ' : '🎤 You: '}
                </span>
                <span className="text-slate-300">{entry.text}</span>
              </div>
            ))}
          {appState === 'listening' && isConnected && (
            <div className="text-sm mb-2">
              <span className="text-blue-400">🎤 You: </span>
              {liveTranscript ? (
                <span className="text-slate-300">{liveTranscript}</span>
              ) : (
                <span className="text-slate-500 italic animate-pulse">
                  Listening...
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Powered by */}
      <p className="mt-4 text-slate-600 text-xs text-center">
        Powered by ElevenLabs AI
      </p>
    </div>
  );
}
