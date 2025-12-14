'use client';

import { VoiceDJAppState } from '@/types/voice-dj';

interface DJOrbProps {
  appState: VoiceDJAppState;
  isPlaying: boolean;
  isRecording: boolean;
  backingTrackUrl: string | null;
  isConnected: boolean;
  error: string | null;
  needsManualPlay: boolean;
  onMainAction: () => void;
  onManualPlay: () => void;
}

export function DJOrb({
  appState,
  isPlaying,
  isRecording,
  backingTrackUrl,
  isConnected,
  error,
  needsManualPlay,
  onMainAction,
  onManualPlay,
}: DJOrbProps) {
  // Get ring animation classes based on state
  const getRingAnimation = () => {
    switch (appState) {
      case 'connecting':
      case 'listening':
      case 'playing':
        return 'animate-pulse';
      case 'processing':
      case 'generating':
        return 'animate-spin-slow';
      case 'speaking':
      case 'recording':
        return 'animate-ping';
      default:
        return '';
    }
  };

  // Get orb gradient based on state
  const getOrbGradient = () => {
    if (isRecording) {
      return 'from-emerald-500 to-green-500'; // Recording
    }
    if (appState === 'generating') {
      return 'from-purple-500 to-pink-500'; // Generating
    }
    if (isPlaying && backingTrackUrl) {
      return 'from-blue-500 to-cyan-500'; // Music playing
    }
    return 'from-purple-500 to-pink-500'; // Default
  };

  // Darker gradient for inner ring
  const getOrbGradientDark = () => {
    if (isRecording) {
      return 'from-emerald-600 to-green-600';
    }
    if (appState === 'generating') {
      return 'from-purple-600 to-pink-600';
    }
    if (isPlaying && backingTrackUrl) {
      return 'from-blue-600 to-cyan-600';
    }
    return 'from-purple-600 to-pink-600';
  };

  // Get emoji based on state
  const getEmoji = () => {
    if (isRecording) return '🔴';
    switch (appState) {
      case 'idle':
        return '🎤';
      case 'connecting':
        return '⏳';
      case 'listening':
        return '👂';
      case 'processing':
        return '🤔';
      case 'speaking':
        return '🗣️';
      case 'generating':
        return '✨';
      case 'playing':
        return '🎵';
      case 'recording':
        return '🔴';
      default:
        return '🎤';
    }
  };

  return (
    <div className="flex flex-col items-center p-8 bg-slate-800/30 rounded-xl border border-slate-700/50">
      {/* Animated rings */}
      <div className="relative w-40 h-40 md:w-48 md:h-48 mb-6">
        <div
          className={`absolute inset-0 rounded-full bg-gradient-to-r ${getOrbGradient()} opacity-20 ${getRingAnimation()}`}
        />
        <div
          className={`absolute inset-3 rounded-full bg-gradient-to-r ${getOrbGradient()} opacity-30 ${
            appState !== 'idle' ? 'animate-pulse' : ''
          }`}
        />
        <div
          className={`absolute inset-6 rounded-full bg-gradient-to-r ${getOrbGradientDark()} opacity-50`}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-5xl md:text-6xl">{getEmoji()}</span>
        </div>
      </div>

      {/* Main CTA Button */}
      <button
        onClick={onMainAction}
        disabled={appState === 'connecting'}
        className={`w-64 h-16 text-white text-xl font-bold rounded-xl shadow-lg
                    transform hover:scale-105 transition-all active:scale-95
                    flex items-center justify-center gap-3
                    ${
                      isConnected
                        ? 'bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600'
                        : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500'
                    }
                    ${appState === 'connecting' ? 'cursor-wait opacity-80' : ''}`}
      >
        {appState === 'connecting' ? (
          <>
            Connecting... <span className="animate-spin">⏳</span>
          </>
        ) : isConnected ? (
          <>End Session 👋</>
        ) : (
          <>Start Jamming 🎵</>
        )}
      </button>

      {error && <p className="mt-3 text-red-400 text-sm">{error}</p>}

      {/* iOS Manual Play Button */}
      {needsManualPlay && backingTrackUrl && (
        <button
          onClick={onManualPlay}
          className="mt-4 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500
                     rounded-xl text-white font-bold shadow-lg animate-pulse flex items-center gap-2"
        >
          ▶️ Tap to Play Track
        </button>
      )}

      {/* Idle instructions */}
      {appState === 'idle' && (
        <p className="mt-4 text-slate-500 text-sm text-center">
          Tap to start a voice conversation with your AI jam partner
        </p>
      )}
    </div>
  );
}
