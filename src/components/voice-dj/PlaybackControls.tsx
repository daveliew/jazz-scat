'use client';

interface PlaybackControlsProps {
  backingTrackPaused: boolean;
  backingTrackUrl: string | null;
  isDjMuted: boolean;
  isConnected: boolean;
  isRecording: boolean;
  onTogglePlay: () => void;
  onStop: () => void;
  onToggleMute: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
}

export function PlaybackControls({
  backingTrackPaused,
  backingTrackUrl,
  isDjMuted,
  isConnected,
  isRecording,
  onTogglePlay,
  onStop,
  onToggleMute,
  onStartRecording,
  onStopRecording,
}: PlaybackControlsProps) {
  return (
    <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-pink-400">
          <span className={backingTrackPaused ? '' : 'animate-pulse'}>●</span>
          <span className="font-medium">
            {backingTrackPaused ? 'Paused' : 'Playing'}
            {backingTrackUrl ? ' - Backing Track' : ''}
          </span>
        </div>
        <span className="text-slate-500 text-xs">spacebar to pause/resume</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={onTogglePlay}
          className="px-4 py-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500
                     rounded-lg text-white font-medium transition-all flex items-center gap-2"
        >
          {backingTrackPaused ? '▶️ Resume' : '⏸️ Pause'}
        </button>
        <button
          onClick={onStop}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-medium transition-all flex items-center gap-2"
        >
          ⏹️ Stop
        </button>
        {isConnected && (
          <button
            onClick={onToggleMute}
            className={`px-4 py-2 rounded-lg text-white font-medium transition-all flex items-center gap-2 ${
              isDjMuted
                ? 'bg-amber-600 hover:bg-amber-500'
                : 'bg-slate-700 hover:bg-slate-600'
            }`}
          >
            {isDjMuted ? '🔇 Unmute DJ' : '🔊 Mute DJ'}
          </button>
        )}
        {isConnected && !isRecording && (
          <button
            onClick={onStartRecording}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500
                       rounded-lg text-white font-medium transition-all flex items-center gap-2"
          >
            🎤 Record
          </button>
        )}
        {isConnected && isRecording && (
          <button
            onClick={onStopRecording}
            className="px-4 py-2 bg-red-600 hover:bg-red-500
                       rounded-lg text-white font-medium transition-all flex items-center gap-2 animate-pulse"
          >
            ⏹️ Stop Recording
          </button>
        )}
      </div>
    </div>
  );
}
