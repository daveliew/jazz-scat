'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface MetronomeProps {
  bpm: number;
}

export function Metronome({ bpm }: MetronomeProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize AudioContext on first interaction
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    return audioContextRef.current;
  }, []);

  // Play a click sound
  const playClick = useCallback((isDownbeat: boolean) => {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    // Higher pitch and louder on downbeat
    osc.frequency.value = isDownbeat ? 1000 : 800;
    gain.gain.value = isDownbeat ? 0.3 : 0.15;

    osc.start(ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    osc.stop(ctx.currentTime + 0.05);
  }, [getAudioContext]);

  // Start/stop metronome
  const toggleMetronome = useCallback(() => {
    if (isPlaying) {
      // Stop
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsPlaying(false);
      setCurrentBeat(0);
    } else {
      // Start
      const intervalMs = (60 / bpm) * 1000;
      let beat = 0;

      // Play first beat immediately
      playClick(true);
      setCurrentBeat(1);

      intervalRef.current = setInterval(() => {
        beat = (beat + 1) % 4;
        playClick(beat === 0);
        setCurrentBeat(beat + 1);
      }, intervalMs);

      setIsPlaying(true);
    }
  }, [isPlaying, bpm, playClick]);

  // Update interval when BPM changes (while playing)
  useEffect(() => {
    if (isPlaying && intervalRef.current) {
      clearInterval(intervalRef.current);
      const intervalMs = (60 / bpm) * 1000;
      let beat = currentBeat - 1;

      intervalRef.current = setInterval(() => {
        beat = (beat + 1) % 4;
        playClick(beat === 0);
        setCurrentBeat(beat + 1);
      }, intervalMs);
    }
  }, [bpm, isPlaying, currentBeat, playClick]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <div className="flex items-center gap-3 bg-slate-800/50 rounded-lg px-4 py-2">
      <button
        onClick={toggleMetronome}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          isPlaying
            ? 'bg-amber-600 hover:bg-amber-700 text-white'
            : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
        }`}
      >
        {isPlaying ? '⏸ Stop' : '🎵 Metronome'}
      </button>

      {/* Beat indicators */}
      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map((beat) => (
          <div
            key={beat}
            className={`w-3 h-3 rounded-full transition-all duration-75 ${
              isPlaying && currentBeat === beat
                ? beat === 1
                  ? 'bg-amber-400 scale-125'
                  : 'bg-amber-500 scale-110'
                : 'bg-slate-600'
            }`}
          />
        ))}
      </div>

      {/* BPM display */}
      <span className="text-xs text-slate-400">{bpm} BPM</span>
    </div>
  );
}
