'use client';

import { TrackLayer as TrackLayerType, LAYER_CONFIG } from '@/types/improv';

interface TrackLayerProps {
  layer: TrackLayerType;
  onGenerate?: () => void;
  onRecord?: () => void;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
  isRecording?: boolean;
  disabled?: boolean;
}

export function TrackLayer({
  layer,
  onGenerate,
  onRecord,
  onVolumeChange,
  onMuteToggle,
  isRecording = false,
  disabled = false,
}: TrackLayerProps) {
  const config = LAYER_CONFIG[layer.type];
  const isUserLayer = layer.type === 'user';
  const hasAudio = !!layer.audioUrl;

  return (
    <div
      className={`flex items-center gap-4 p-3 rounded-lg transition-all ${
        isUserLayer
          ? 'bg-purple-900/30 border border-purple-700/50'
          : 'bg-slate-800/50 border border-slate-700/50'
      } ${layer.isMuted ? 'opacity-60' : ''}`}
    >
      {/* Layer Icon & Name */}
      <div className="flex items-center gap-2 min-w-[120px]">
        <span className="text-xl">{config.icon}</span>
        <span className="text-sm font-medium text-white">{config.name}</span>
      </div>

      {/* Progress/Waveform Indicator */}
      <div className="flex-1 h-8 bg-slate-900/50 rounded-lg overflow-hidden relative">
        {layer.isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-1 h-4 bg-purple-500 rounded-full animate-pulse"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
            <span className="ml-2 text-xs text-slate-400">Generating...</span>
          </div>
        ) : hasAudio ? (
          <div className="absolute inset-0 flex items-center px-2">
            {/* Simple waveform visualization - deterministic heights based on index */}
            <div className="flex items-center gap-[2px] h-full w-full">
              {Array.from({ length: 40 }).map((_, i) => {
                // Deterministic pseudo-random based on index
                const pseudoRandom = ((i * 7919) % 100) / 10;
                return (
                  <div
                    key={i}
                    className={`flex-1 rounded-full ${
                      layer.isPlaying ? 'bg-purple-500' : 'bg-slate-600'
                    }`}
                    style={{
                      height: `${20 + Math.sin(i * 0.5) * 15 + pseudoRandom}%`,
                    }}
                  />
                );
              })}
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs text-slate-500">
              {isUserLayer ? 'Ready to record' : 'Click Generate'}
            </span>
          </div>
        )}

        {/* Recording indicator */}
        {isRecording && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-900/50">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm text-white">Recording...</span>
            </div>
          </div>
        )}
      </div>

      {/* Volume Control */}
      <div className="flex items-center gap-2">
        <button
          onClick={onMuteToggle}
          className={`p-1 rounded transition-colors ${
            layer.isMuted
              ? 'text-red-400 hover:text-red-300'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          {layer.isMuted ? '🔇' : '🔊'}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.1}
          value={layer.volume}
          onChange={(e) => onVolumeChange(Number(e.target.value))}
          className="w-20 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer
                     [&::-webkit-slider-thumb]:appearance-none
                     [&::-webkit-slider-thumb]:w-3
                     [&::-webkit-slider-thumb]:h-3
                     [&::-webkit-slider-thumb]:bg-purple-500
                     [&::-webkit-slider-thumb]:rounded-full"
        />
      </div>

      {/* Action Button */}
      {isUserLayer ? (
        <button
          onClick={onRecord}
          disabled={disabled || layer.isLoading}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-all min-w-[100px]
            ${
              isRecording
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-purple-600 hover:bg-purple-700 text-white'
            }
            disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isRecording ? '⏹ Stop' : '⏺ Record'}
        </button>
      ) : (
        <button
          onClick={onGenerate}
          disabled={disabled || layer.isLoading}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg
                     font-medium text-sm transition-colors min-w-[100px]
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {layer.isLoading ? '...' : '🎲 Generate'}
        </button>
      )}
    </div>
  );
}
