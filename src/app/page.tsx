'use client';

import { useConversation } from '@elevenlabs/react';
import { useState, useCallback, useRef, useEffect } from 'react';
import { getAudioMixer, AudioMixer } from '@/lib/audio-mixer';
import Link from 'next/link';

type AppState =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'processing'
  | 'speaking'
  | 'generating'
  | 'playing'
  | 'recording';

interface GeneratedLayer {
  id: string;
  type: 'bass' | 'harmony' | 'rhythm';
  audioUrl: string | null;
}

// User recorded layers for multi-layer looper
interface RecordedLayer {
  id: string;
  audioUrl: string;
  audioElement: HTMLAudioElement | null;
  isPlaying: boolean;
}

// Session log entries
interface LogEntry {
  role: 'user' | 'agent';
  text: string;
  timestamp: Date;
}

export default function Home() {
  // Connection state
  const [appState, setAppState] = useState<AppState>('idle');
  const [isConnected, setIsConnected] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Audio state
  const [layers, setLayers] = useState<GeneratedLayer[]>([
    { id: 'bass', type: 'bass', audioUrl: null },
    { id: 'harmony', type: 'harmony', audioUrl: null },
    { id: 'rhythm', type: 'rhythm', audioUrl: null },
  ]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentGenre, setCurrentGenre] = useState('doo-wop');
  const [currentBpm, setCurrentBpm] = useState(90);

  // Multi-layer looper state
  const [recordedLayers, setRecordedLayers] = useState<RecordedLayer[]>([]);
  const [isRecordingLayer, setIsRecordingLayer] = useState(false); // Track recording independently

  // Session log state
  const [sessionLog, setSessionLog] = useState<LogEntry[]>([]);

  // Backing track state (from Sound Generation API)
  const [backingTrackUrl, setBackingTrackUrl] = useState<string | null>(null);
  const [backingTrackPaused, setBackingTrackPaused] = useState(false);

  // DJ mute state
  const [isDjMuted, setIsDjMuted] = useState(false);

  // iOS audio unlock state
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);
  const [needsManualPlay, setNeedsManualPlay] = useState(false);

  // Refs
  const mixerRef = useRef<AudioMixer | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const backingTrackRef = useRef<HTMLAudioElement | null>(null);
  const sessionLogRef = useRef<HTMLDivElement | null>(null);

  // Initialize audio mixer
  useEffect(() => {
    mixerRef.current = getAudioMixer();
    return () => {
      mixerRef.current?.dispose();
    };
  }, []);

  // iOS Audio Unlock - call this on first user tap to enable audio playback
  // iOS Safari blocks audio.play() unless it's directly triggered by a user gesture
  const unlockAudioForIOS = useCallback(async () => {
    if (isAudioUnlocked) return;

    // Pre-warm the audio element with a silent audio play
    if (backingTrackRef.current) {
      // Tiny silent MP3 (base64 encoded)
      const silentAudio = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYYoRBqpAAAAAAD/+xDEAAPAAADSAAAAAAgAADSAAAAETEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//sQxBoDwAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';
      backingTrackRef.current.src = silentAudio;
      backingTrackRef.current.volume = 0;
      try {
        await backingTrackRef.current.play();
        backingTrackRef.current.pause();
        backingTrackRef.current.volume = 1;
        backingTrackRef.current.src = '';
        setIsAudioUnlocked(true);
        console.log('🔓 iOS audio unlocked successfully');
      } catch (e) {
        console.log('🔒 Audio unlock skipped (may not be iOS or already unlocked):', e);
      }
    }
  }, [isAudioUnlocked]);

  // Toggle backing track pause/resume
  const toggleBackingTrack = useCallback(() => {
    if (!backingTrackRef.current || !backingTrackUrl) return;

    if (backingTrackPaused) {
      backingTrackRef.current.play();
      setBackingTrackPaused(false);
      setStatusText('Track playing!');
    } else {
      backingTrackRef.current.pause();
      setBackingTrackPaused(true);
      setStatusText('Track paused');
    }
  }, [backingTrackPaused, backingTrackUrl]);

  // Toggle DJ mute
  const toggleDjMute = useCallback(() => {
    setIsDjMuted(prev => !prev);
  }, []);

  // Keyboard shortcuts (spacebar to toggle playback)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle spacebar when not typing in an input
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        if (isPlaying) {
          toggleBackingTrack();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, toggleBackingTrack]);

  // Action handlers - these will be triggered by parsing agent responses
  const generateLayer = useCallback(async (layerType: 'bass' | 'harmony' | 'rhythm') => {
    setAppState('generating');
    setStatusText(`Generating ${layerType}...`);

    try {
      const response = await fetch('/api/generate-layer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          layerType,
          genre: currentGenre,
          bpm: currentBpm,
        }),
      });

      const data = await response.json();

      if (data.success && data.audioUrl) {
        await mixerRef.current?.initialize();
        await mixerRef.current?.loadTrack(layerType, data.audioUrl);

        setLayers(prev =>
          prev.map(l =>
            l.type === layerType ? { ...l, audioUrl: data.audioUrl } : l
          )
        );
        setStatusText(`${layerType} ready!`);
      } else {
        setStatusText(`Failed to generate ${layerType}`);
      }
    } catch (err) {
      console.error('Generate error:', err);
      setStatusText('Generation failed');
    }

    // Return to listening state if connected
    setTimeout(() => {
      if (isConnected) {
        setAppState('listening');
        setStatusText('Listening...');
      } else {
        setAppState('idle');
        setStatusText('');
      }
    }, 1500);
  }, [currentGenre, currentBpm, isConnected]);

  const playAll = useCallback(async () => {
    setAppState('playing');
    setStatusText('Playing...');
    await mixerRef.current?.initialize();
    mixerRef.current?.playAllTracks(true);
    setIsPlaying(true);
  }, []);

  const stopAll = useCallback(() => {
    // Stop mixer tracks
    mixerRef.current?.stopAllTracks();

    // Stop backing track
    if (backingTrackRef.current) {
      backingTrackRef.current.pause();
      backingTrackRef.current.currentTime = 0;
    }

    // Stop all recorded layers
    recordedLayers.forEach(layer => {
      if (layer.audioElement) {
        layer.audioElement.pause();
        layer.audioElement.currentTime = 0;
      }
    });

    // Reset state
    setIsPlaying(false);
    setBackingTrackPaused(false);
    setBackingTrackUrl(null);
    setIsDjMuted(false);
    setStatusText('Stopped');

    if (isConnected) {
      setAppState('listening');
      setTimeout(() => setStatusText('Listening...'), 1000);
    } else {
      setAppState('idle');
    }
  }, [isConnected, recordedLayers]);

  const startRecording = useCallback(async () => {
    // Only change appState if not already playing (allows layering while track plays)
    if (!isPlaying) {
      setAppState('recording');
    }
    setIsRecordingLayer(true);
    setStatusText('Recording your layer...');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);

        // Create new layer for multi-layer looper
        const newLayer: RecordedLayer = {
          id: `layer-${Date.now()}`,
          audioUrl,
          audioElement: null,
          isPlaying: false,
        };

        // Create audio element for this layer
        const audioElement = new Audio(audioUrl);
        audioElement.loop = true;
        newLayer.audioElement = audioElement;

        setRecordedLayers(prev => [...prev, newLayer]);
        stream.getTracks().forEach(track => track.stop());
        setIsRecordingLayer(false);
        setStatusText('Layer saved!');
      };

      mediaRecorder.start();

      // Auto-stop after 30 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      }, 30000);
    } catch (err) {
      console.error('Recording error:', err);
      setStatusText('Mic access denied');
      setIsRecordingLayer(false);
      if (!isPlaying) {
        setAppState(isConnected ? 'listening' : 'idle');
      }
    }
  }, [isConnected, isPlaying]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecordingLayer(false);
      // If backing track is playing, stay in playing state (layering mode)
      if (isPlaying) {
        setStatusText('Saving layer...');
      } else {
        setAppState(isConnected ? 'listening' : 'idle');
        setTimeout(() => {
          if (isConnected) setStatusText('Listening...');
        }, 1500);
      }
    }
  }, [isConnected, isPlaying]);

  // Recorded layer controls
  const playRecordedLayer = useCallback((layerId: string) => {
    setRecordedLayers(prev =>
      prev.map(layer => {
        if (layer.id === layerId && layer.audioElement) {
          layer.audioElement.play();
          return { ...layer, isPlaying: true };
        }
        return layer;
      })
    );
  }, []);

  const pauseRecordedLayer = useCallback((layerId: string) => {
    setRecordedLayers(prev =>
      prev.map(layer => {
        if (layer.id === layerId && layer.audioElement) {
          layer.audioElement.pause();
          return { ...layer, isPlaying: false };
        }
        return layer;
      })
    );
  }, []);

  const deleteRecordedLayer = useCallback((layerId: string) => {
    setRecordedLayers(prev => {
      const layer = prev.find(l => l.id === layerId);
      if (layer?.audioElement) {
        layer.audioElement.pause();
        URL.revokeObjectURL(layer.audioUrl);
      }
      return prev.filter(l => l.id !== layerId);
    });
  }, []);

  // Generate backing track using Sound Generation API (called by clientTools)
  const generateBackingTrack = useCallback(async (prompt: string): Promise<string> => {
    console.log('🎸 [1] Starting generateBackingTrack with prompt:', prompt);
    setAppState('generating');
    setStatusText('Spinning up track...');

    try {
      console.log('🎸 [2] Calling /api/sound-generation...');
      const response = await fetch('/api/sound-generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: prompt + ' high quality instrumental jazz loop',
          duration_seconds: 15,
          prompt_influence: 0.5,
        }),
      });

      console.log('🎸 [3] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('🎸 [3b] Error response:', errorText);
        throw new Error(`Sound generation failed: ${response.status} - ${errorText}`);
      }

      const blob = await response.blob();
      console.log('🎸 [4] Got blob, size:', blob.size, 'type:', blob.type);

      const audioUrl = URL.createObjectURL(blob);
      console.log('🎸 [5] Created blob URL:', audioUrl);
      setBackingTrackUrl(audioUrl);

      // Play looping audio
      console.log('🎸 [6] backingTrackRef.current exists?', !!backingTrackRef.current);
      if (backingTrackRef.current) {
        backingTrackRef.current.src = audioUrl;
        backingTrackRef.current.loop = true;
        console.log('🎸 [7] Attempting to play...');

        try {
          await backingTrackRef.current.play();
          console.log('🎸 [8] Play started successfully!');
          setNeedsManualPlay(false);
          setAppState('playing');
          setStatusText('Track playing!');
          setIsPlaying(true);
        } catch (playError) {
          // iOS may block autoplay - show manual play button
          console.warn('🎸 [8b] Autoplay blocked (likely iOS), enabling manual play:', playError);
          setNeedsManualPlay(true);
          setAppState('playing');
          setStatusText('Tap to play track');
          setIsPlaying(false); // Not actually playing yet
          return 'Track ready! Tap the play button to start.';
        }
      } else {
        console.error('🎸 [6b] backingTrackRef is null!');
      }

      console.log('🎸 [9] Done! Returning success');
      return 'Track generated and playing!';
    } catch (err) {
      console.error('🎸 [ERROR] Generate backing track error:', err);
      setStatusText('Generation failed');
      setAppState(isConnected ? 'listening' : 'idle');
      return 'Failed to generate track';
    }
  }, [isConnected]);

  // Parse agent messages for action triggers
  const parseAndTriggerAction = useCallback((text: string) => {
    const lowerText = text.toLowerCase();

    // Genre detection
    const genres = ['doo-wop', 'doowop', 'gospel', 'barbershop', 'lo-fi', 'lofi', 'jazz', 'pop'];
    for (const genre of genres) {
      if (lowerText.includes(genre)) {
        const normalizedGenre = genre.replace('doowop', 'doo-wop').replace('lofi', 'lo-fi');
        setCurrentGenre(normalizedGenre);
        break;
      }
    }

    // BPM detection
    const bpmMatch = lowerText.match(/(\d{2,3})\s*bpm/);
    if (bpmMatch) {
      setCurrentBpm(parseInt(bpmMatch[1]));
    }

    // Action triggers
    if (lowerText.includes('generating bass') || lowerText.includes('generate bass') || lowerText.includes('creating bass')) {
      generateLayer('bass');
    } else if (lowerText.includes('generating harmony') || lowerText.includes('generate harmony') || lowerText.includes('creating harmony')) {
      generateLayer('harmony');
    } else if (lowerText.includes('generating rhythm') || lowerText.includes('generate rhythm') || lowerText.includes('creating rhythm') || lowerText.includes('generating beat')) {
      generateLayer('rhythm');
    } else if (lowerText.includes('playing') || lowerText.includes("let's play") || lowerText.includes('starting playback')) {
      playAll();
    } else if (lowerText.includes('stopping') || lowerText.includes('stopped') || lowerText.includes('pause')) {
      stopAll();
    } else if (lowerText.includes('recording') || lowerText.includes('record your') || lowerText.includes('start recording')) {
      startRecording();
    } else if (lowerText.includes('stop recording') || lowerText.includes('done recording')) {
      stopRecording();
    }
  }, [generateLayer, playAll, stopAll, startRecording, stopRecording]);

  // ElevenLabs conversation with clientTools
  // NOTE: ElevenLabs Agent system prompt should be:
  // "You are a jazz DJ. Ask the user for a vibe. When they answer,
  // call the generate_backing_track tool with a descriptive music prompt."
  const conversation = useConversation({
    clientTools: {
      generate_backing_track: async ({ prompt }: { prompt: string }) => {
        console.log('Agent called generate_backing_track with:', prompt);
        try {
          const result = await generateBackingTrack(prompt);
          return result;
        } catch (err) {
          console.error('Tool error:', err);
          return 'Sorry, music generation encountered an error. Please try again.';
        }
      },
    },
    onConnect: () => {
      setIsConnected(true);
      setAppState('listening');
      setStatusText('Listening...');
      setError(null);
      setSessionLog([]); // Clear session log on new connection
    },
    onDisconnect: () => {
      setIsConnected(false);
      setAppState('idle');
      setStatusText('');
    },
    onMessage: (message) => {
      console.log('📨 Message event:', message);
      // Handle user transcript - show what user said and switch to processing
      if ('source' in message && message.source === 'user' && message.message) {
        setSessionLog(prev => [...prev, {
          role: 'user',
          text: message.message,
          timestamp: new Date(),
        }]);
        // User finished speaking, agent is processing
        setAppState('processing');
        setStatusText('Thinking...');
      }
      // Handle agent message
      else if (message.message) {
        setSessionLog(prev => [...prev, {
          role: 'agent',
          text: message.message,
          timestamp: new Date(),
        }]);
        // Also parse for action triggers (fallback mechanism)
        parseAndTriggerAction(message.message);
      }
    },
    onError: (err) => {
      console.error('Conversation error:', err);
      setError('Connection error');
      setAppState('idle');
    },
  });

  // Update state based on conversation
  useEffect(() => {
    if (isConnected) {
      if (conversation.isSpeaking) {
        // Only show speaking state if not generating/playing
        if (appState !== 'generating' && appState !== 'playing') {
          setAppState('speaking');
          setStatusText('');
        }
      } else if (appState === 'speaking' || appState === 'processing') {
        // After speaking or processing, go back to listening
        // But NOT if we're generating or playing music
        setAppState('listening');
        setStatusText('Listening...');
      }
    }
  }, [conversation.isSpeaking, isConnected, appState]);

  // Sync DJ mute state with conversation volume
  useEffect(() => {
    if (isConnected) {
      conversation.setVolume({ volume: isDjMuted ? 0 : 1 });
    }
  }, [isDjMuted, isConnected, conversation]);

  const startConversation = useCallback(async () => {
    try {
      setAppState('connecting');
      setStatusText('Connecting...');
      setError(null);

      // Unlock audio for iOS BEFORE anything else (must be in user gesture context)
      await unlockAudioForIOS();

      await navigator.mediaDevices.getUserMedia({ audio: true });

      const response = await fetch('/api/conversation-token');
      if (!response.ok) throw new Error('Failed to get token');

      const { signedUrl } = await response.json();
      await conversation.startSession({ signedUrl });
    } catch (err) {
      console.error('Connection error:', err);
      setError(err instanceof Error ? err.message : 'Connection failed');
      setAppState('idle');
      setStatusText('');
    }
  }, [conversation, unlockAudioForIOS]);

  const endConversation = useCallback(async () => {
    stopAll();
    await conversation.endSession();
  }, [conversation, stopAll]);

  // Get ring animation classes based on state
  const getRingAnimation = () => {
    switch (appState) {
      case 'connecting':
        return 'animate-pulse';
      case 'listening':
        return 'animate-pulse';
      case 'processing':
        return 'animate-spin-slow';
      case 'speaking':
        return 'animate-ping';
      case 'generating':
        return 'animate-spin-slow';
      case 'playing':
        return 'animate-pulse';
      case 'recording':
        return 'animate-ping';
      default:
        return '';
    }
  };

  // Layer indicators
  const hasLayers = layers.some(l => l.audioUrl);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
          Jazz Scat
        </h1>
        <p className="text-slate-300 text-xl max-w-md mx-auto">
          {isConnected ? statusText || 'Your AI jam partner is ready' : 'Practice like a pro. AI-generated backing tracks + real-time coaching.'}
        </p>
      </div>

      {/* Visual element - Animated rings */}
      <div className="relative w-56 h-56 md:w-72 md:h-72 mb-8">
        {/* Animated rings */}
        <div className={`absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 opacity-20 ${getRingAnimation()}`} />
        <div className={`absolute inset-4 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 opacity-30 ${appState !== 'idle' ? 'animate-pulse' : ''}`} />
        <div className="absolute inset-8 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 opacity-50" />

        {/* Center icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-7xl md:text-8xl">
            {appState === 'idle' && '🎤'}
            {appState === 'connecting' && '⏳'}
            {appState === 'listening' && '👂'}
            {appState === 'processing' && '🤔'}
            {appState === 'speaking' && '🗣️'}
            {appState === 'generating' && '✨'}
            {appState === 'playing' && '🎵'}
            {appState === 'recording' && '🔴'}
          </span>
        </div>
      </div>

      {/* Main CTA Button */}
      <button
        onClick={isConnected ? endConversation : startConversation}
        disabled={appState === 'connecting'}
        className={`w-72 h-20 text-white text-2xl font-bold rounded-2xl shadow-lg
                    transform hover:scale-105 transition-all active:scale-95
                    flex items-center justify-center gap-3
                    ${isConnected
                      ? 'bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 shadow-slate-500/25'
                      : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 shadow-purple-500/25'}
                    ${appState === 'connecting' ? 'cursor-wait opacity-80' : ''}`}
      >
        {appState === 'connecting' ? (
          <>
            <span>Connecting...</span>
            <span className="text-3xl animate-spin">⏳</span>
          </>
        ) : isConnected ? (
          <>
            <span>End Session</span>
            <span className="text-3xl">👋</span>
          </>
        ) : (
          <>
            <span>Start Jamming</span>
            <span className="text-3xl">🎵</span>
          </>
        )}
      </button>

      {/* Error */}
      {error && (
        <p className="mt-4 text-red-400 text-sm">{error}</p>
      )}

      {/* iOS Manual Play Button - shown when autoplay is blocked */}
      {needsManualPlay && backingTrackUrl && (
        <button
          onClick={async () => {
            if (backingTrackRef.current) {
              try {
                await backingTrackRef.current.play();
                setNeedsManualPlay(false);
                setIsPlaying(true);
                setStatusText('Track playing!');
              } catch (e) {
                console.error('Manual play failed:', e);
                setStatusText('Playback failed. Try again.');
              }
            }
          }}
          className="mt-6 px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500
                     rounded-2xl text-white text-xl font-bold shadow-lg shadow-green-500/25
                     transform hover:scale-105 transition-all active:scale-95
                     flex items-center gap-3 animate-pulse"
        >
          <span>▶️</span>
          <span>Tap to Play Track</span>
        </button>
      )}

      {/* Layer indicators */}
      {hasLayers && (
        <div className="mt-8 flex gap-3">
          {layers.map(layer => (
            <div
              key={layer.id}
              className={`px-3 py-1 rounded-full text-sm ${
                layer.audioUrl
                  ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                  : 'bg-slate-700/50 text-slate-500 border border-slate-600'
              }`}
            >
              {layer.type}
            </div>
          ))}
        </div>
      )}

      {/* Playing controls */}
      {isPlaying && (
        <div className="mt-4 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 text-pink-400">
            <span className={backingTrackPaused ? '' : 'animate-pulse'}>●</span>
            <span>{backingTrackPaused ? 'Paused' : 'Playing'}{backingTrackUrl ? ' (Backing Track)' : ''}</span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={toggleBackingTrack}
              className="px-6 py-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500
                         rounded-full text-white font-semibold transition-all transform hover:scale-105 active:scale-95
                         flex items-center gap-2"
            >
              {backingTrackPaused ? (
                <>▶️ Resume</>
              ) : (
                <>⏸️ Pause</>
              )}
            </button>
            <button
              onClick={stopAll}
              className="px-6 py-2 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600
                         rounded-full text-white font-semibold transition-all transform hover:scale-105 active:scale-95
                         flex items-center gap-2"
            >
              ⏹️ Stop
            </button>
            {isConnected && (
              <button
                onClick={toggleDjMute}
                className={`px-6 py-2 rounded-full text-white font-semibold transition-all transform hover:scale-105 active:scale-95
                           flex items-center gap-2 ${
                             isDjMuted
                               ? 'bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500'
                               : 'bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600'
                           }`}
              >
                {isDjMuted ? '🔇 Unmute DJ' : '🔊 Mute DJ'}
              </button>
            )}
            {!isRecordingLayer && (
              <button
                onClick={startRecording}
                className="px-6 py-2 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500
                           rounded-full text-white font-semibold transition-all transform hover:scale-105 active:scale-95
                           flex items-center gap-2"
              >
                🎤 Add Layer
              </button>
            )}
            {isRecordingLayer && (
              <button
                onClick={stopRecording}
                className="px-6 py-2 bg-red-600 hover:bg-red-500 animate-pulse
                           rounded-full text-white font-semibold transition-all
                           flex items-center gap-2"
              >
                ⏹️ Stop Recording
              </button>
            )}
          </div>
          <span className="text-slate-500 text-xs">spacebar to pause/resume</span>
        </div>
      )}

      {/* Instructions - only when idle */}
      {appState === 'idle' && (
        <div className="mt-8 text-center">
          <p className="text-slate-500 text-sm">Tap the button to start a voice conversation with your AI jam partner</p>
        </div>
      )}

      {/* Footer Mode Tabs */}
      <div className="mt-8 flex rounded-xl overflow-hidden border border-slate-700/50 bg-slate-800/30">
        <Link
          href="/"
          className="flex items-center gap-2 px-6 py-3 bg-purple-600/20 text-purple-300 border-r border-slate-700/50 font-medium"
        >
          <span>🎤</span>
          <span>Voice DJ</span>
        </Link>
        <Link
          href="/improv"
          className="flex items-center gap-2 px-6 py-3 text-slate-400 hover:text-white hover:bg-slate-700/30 transition-colors font-medium"
        >
          <span>🎚️</span>
          <span>Layer Builder</span>
        </Link>
      </div>

      {/* Session Log */}
      {(sessionLog.length > 0 || (isConnected && appState === 'listening')) && (
        <div className="mt-8 w-full max-w-md">
          <h3 className="text-sm font-semibold text-slate-400 mb-2">Session Log</h3>
          <div
            ref={sessionLogRef}
            className="bg-slate-800/50 rounded-lg p-3 max-h-32 overflow-y-auto border border-slate-700 flex flex-col-reverse"
          >
            {/* Live listening indicator - appears at top due to flex-col-reverse */}
            {appState === 'listening' && isConnected && (
              <div className="text-sm mb-1 animate-pulse">
                <span className="text-blue-400">🎤 You: </span>
                <span className="text-slate-500 italic">Listening...</span>
              </div>
            )}
            {/* Log entries - newest appears at top due to flex-col-reverse */}
            {sessionLog.map((entry, index) => (
              <div key={index} className="text-sm mb-1">
                <span className={entry.role === 'agent' ? 'text-purple-400' : 'text-blue-400'}>
                  {entry.role === 'agent' ? '🎵 DJ: ' : '🎤 You: '}
                </span>
                <span className="text-slate-300">{entry.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recorded Layers (Looper) */}
      {recordedLayers.length > 0 && (
        <div className="mt-6 w-full max-w-md">
          <h3 className="text-sm font-semibold text-slate-400 mb-2">Your Recordings</h3>
          <div className="space-y-2">
            {recordedLayers.map((layer, index) => (
              <div
                key={layer.id}
                className="flex items-center gap-3 bg-slate-800/50 rounded-lg p-3 border border-slate-700"
              >
                <span className="text-slate-400 text-sm">Layer {index + 1}</span>
                <div className="flex gap-2 ml-auto">
                  {layer.isPlaying ? (
                    <button
                      onClick={() => pauseRecordedLayer(layer.id)}
                      className="px-3 py-1 bg-yellow-600 hover:bg-yellow-500 rounded text-sm transition-colors"
                    >
                      ⏸️ Pause
                    </button>
                  ) : (
                    <button
                      onClick={() => playRecordedLayer(layer.id)}
                      className="px-3 py-1 bg-green-600 hover:bg-green-500 rounded text-sm transition-colors"
                    >
                      ▶️ Play
                    </button>
                  )}
                  <button
                    onClick={() => deleteRecordedLayer(layer.id)}
                    className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-sm transition-colors"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hidden audio element for backing track */}
      <audio ref={backingTrackRef} className="hidden" />

      {/* Powered by */}
      <p className="mt-8 text-slate-600 text-xs">
        Powered by ElevenLabs AI
      </p>
    </div>
  );
}
