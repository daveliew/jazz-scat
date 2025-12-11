'use client';

import { TrackLayer as TrackLayerType } from '@/types/improv';
import { TrackLayer } from './TrackLayer';

interface LayerMixerProps {
  layers: TrackLayerType[];
  onGenerateLayer: (layerId: string) => void;
  onRecordLayer: () => void;
  onVolumeChange: (layerId: string, volume: number) => void;
  onMuteToggle: (layerId: string) => void;
  onPlayAll: () => void;
  onStopAll: () => void;
  isPlayingAll: boolean;
  isRecording: boolean;
  disabled?: boolean;
}

export function LayerMixer({
  layers,
  onGenerateLayer,
  onRecordLayer,
  onVolumeChange,
  onMuteToggle,
  onPlayAll,
  onStopAll,
  isPlayingAll,
  isRecording,
  disabled = false,
}: LayerMixerProps) {
  const aiLayers = layers.filter((l) => l.type !== 'user');
  const userLayer = layers.find((l) => l.type === 'user');
  const hasAnyAudio = layers.some((l) => l.audioUrl);

  return (
    <div className="space-y-4">
      {/* AI Generated Layers */}
      <div className="space-y-2">
        {aiLayers.map((layer) => (
          <TrackLayer
            key={layer.id}
            layer={layer}
            onGenerate={() => onGenerateLayer(layer.id)}
            onVolumeChange={(vol) => onVolumeChange(layer.id, vol)}
            onMuteToggle={() => onMuteToggle(layer.id)}
            disabled={disabled || isRecording}
          />
        ))}
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 py-2">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
        <span className="text-xs text-purple-400 uppercase tracking-wider">Your Turn</span>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
      </div>

      {/* User Recording Layer */}
      {userLayer && (
        <TrackLayer
          layer={userLayer}
          onRecord={onRecordLayer}
          onVolumeChange={(vol) => onVolumeChange(userLayer.id, vol)}
          onMuteToggle={() => onMuteToggle(userLayer.id)}
          isRecording={isRecording}
          disabled={disabled}
        />
      )}

      {/* Playback Controls */}
      <div className="flex items-center justify-center gap-4 pt-4">
        <button
          onClick={isPlayingAll ? onStopAll : onPlayAll}
          disabled={!hasAnyAudio || disabled}
          className={`px-6 py-3 rounded-xl font-semibold text-lg transition-all
            ${
              isPlayingAll
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white'
            }
            disabled:opacity-50 disabled:cursor-not-allowed
            shadow-lg hover:shadow-xl transform hover:scale-105`}
        >
          {isPlayingAll ? '⏹ Stop All' : '▶️ Play All'}
        </button>
      </div>
    </div>
  );
}
