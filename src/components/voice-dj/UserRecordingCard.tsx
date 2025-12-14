'use client';

import { UserRecording } from '@/types/voice-dj';

interface UserRecordingCardProps {
  recording: UserRecording;
  onPlayToggle: () => void;
  onDelete: () => void;
}

export function UserRecordingCard({
  recording,
  onPlayToggle,
  onDelete,
}: UserRecordingCardProps) {
  return (
    <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 p-4">
      <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">
        🎤 Your Recording
      </h2>
      <div className="flex items-center gap-3 bg-slate-700/30 rounded-lg p-3">
        <span className="text-slate-400 text-sm font-medium">Recording</span>
        <div className="flex gap-2 ml-auto">
          <button
            onClick={onPlayToggle}
            className={`px-3 py-1.5 rounded text-sm transition-colors ${
              recording.isPlaying
                ? 'bg-yellow-600 hover:bg-yellow-500'
                : 'bg-green-600 hover:bg-green-500'
            }`}
          >
            {recording.isPlaying ? '⏸️' : '▶️'}
          </button>
          <button
            onClick={onDelete}
            className="px-3 py-1.5 bg-red-600/50 hover:bg-red-500 rounded text-sm transition-colors"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
}
