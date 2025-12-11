'use client';

import { useConversation } from '@elevenlabs/react';
import { useState, useCallback, useRef, useEffect } from 'react';
import { getAudioMixer, AudioMixer } from '@/lib/audio-mixer';

type AppState =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'speaking'
  | 'generating'
  | 'playing'
  | 'recording';

interface GeneratedLayer {
  id: string;
  type: 'bass' | 'harmony' | 'rhythm';
  audioUrl: string | null;
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

  // Refs
  const mixerRef = useRef<AudioMixer | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Initialize audio mixer
  useEffect(() => {
    mixerRef.current = getAudioMixer();
    return () => {
      mixerRef.current?.dispose();
    };
  }, []);

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
    mixerRef.current?.stopAllTracks();
    setIsPlaying(false);
    setStatusText('Stopped');
    if (isConnected) {
      setAppState('listening');
      setTimeout(() => setStatusText('Listening...'), 1000);
    }
  }, [isConnected]);

  const startRecording = useCallback(async () => {
    setAppState('recording');
    setStatusText('Recording your improv...');

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
        await mixerRef.current?.initialize();
        await mixerRef.current?.loadTrack('user', audioUrl);
        stream.getTracks().forEach(track => track.stop());
        setStatusText('Recording saved!');
      };

      mediaRecorder.start();

      // Auto-stop after 30 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          stopRecording();
        }
      }, 30000);
    } catch (err) {
      console.error('Recording error:', err);
      setStatusText('Mic access denied');
      setAppState(isConnected ? 'listening' : 'idle');
    }
  }, [isConnected]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setAppState(isConnected ? 'listening' : 'idle');
      setTimeout(() => {
        if (isConnected) setStatusText('Listening...');
      }, 1500);
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

  // ElevenLabs conversation
  const conversation = useConversation({
    onConnect: () => {
      setIsConnected(true);
      setAppState('listening');
      setStatusText('Listening...');
      setError(null);
    },
    onDisconnect: () => {
      setIsConnected(false);
      setAppState('idle');
      setStatusText('');
    },
    onMessage: (message) => {
      // Parse agent messages for action triggers
      if (message.message) {
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
        setAppState('speaking');
        setStatusText('');
      } else if (appState === 'speaking') {
        setAppState('listening');
        setStatusText('Listening...');
      }
    }
  }, [conversation.isSpeaking, isConnected, appState]);

  const startConversation = useCallback(async () => {
    try {
      setAppState('connecting');
      setStatusText('Connecting...');
      setError(null);

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
  }, [conversation]);

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
          Music Genie
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

      {/* Playing indicator */}
      {isPlaying && (
        <div className="mt-4 flex items-center gap-2 text-pink-400">
          <span className="animate-pulse">●</span>
          <span>Playing</span>
        </div>
      )}

      {/* Instructions - only when idle */}
      {appState === 'idle' && (
        <div className="mt-12 text-center text-slate-500 text-sm max-w-md">
          <p>Tap the button to start a voice conversation with your AI jam partner</p>
        </div>
      )}

      {/* Powered by */}
      <p className="mt-8 text-slate-600 text-xs">
        Powered by ElevenLabs AI
      </p>
    </div>
  );
}
