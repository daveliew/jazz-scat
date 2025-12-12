'use client';

import { useConversation, useScribe } from '@elevenlabs/react';
import { useState, useCallback, useRef, useEffect } from 'react';
import { getAudioMixer, AudioMixer } from '@/lib/audio-mixer';
import Link from 'next/link';

// iOS detection - all iOS browsers use WebKit
const isIOSDevice = () => {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

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

// AI-generated instrument layers (from DJ)
interface AIInstrumentLayer {
  id: string;
  instrument: string;  // e.g., "piano", "drums", "bass", "saxophone"
  prompt: string;      // The generation prompt used
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

  // AI-generated instrument layers (DJ can add piano, drums, etc. that layer together)
  const [aiLayers, setAiLayers] = useState<AIInstrumentLayer[]>([]);

  // Session log state
  const [sessionLog, setSessionLog] = useState<LogEntry[]>([]);

  // Live transcription state (from Scribe)
  const [liveTranscript, setLiveTranscript] = useState('');

  // Backing track state (from Sound Generation API)
  const [backingTrackUrl, setBackingTrackUrl] = useState<string | null>(null);
  const [backingTrackPaused, setBackingTrackPaused] = useState(false);

  // DJ mute state
  const [isDjMuted, setIsDjMuted] = useState(false);

  // Looper mode state - when true, DJ knows to ignore singing/humming
  const [isLooperMode, setIsLooperMode] = useState(false);

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

    // Only needed on iOS - desktop browsers don't block autoplay from user gesture
    if (!isIOSDevice()) {
      console.log('🔓 Skipping audio unlock (not iOS)');
      setIsAudioUnlocked(true);
      return;
    }

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

    // Stop all AI instrument layers
    aiLayers.forEach(layer => {
      if (layer.audioElement) {
        layer.audioElement.pause();
        layer.audioElement.currentTime = 0;
      }
    });

    // Reset state
    setIsPlaying(false);
    setBackingTrackPaused(false);
    setBackingTrackUrl(null);
    setAiLayers([]); // Clear AI layers on stop
    setIsDjMuted(false);
    setStatusText('Stopped');

    if (isConnected) {
      setAppState('listening');
      setTimeout(() => setStatusText('Listening...'), 1000);
    } else {
      setAppState('idle');
    }
  }, [isConnected, recordedLayers, aiLayers]);

  const startRecording = useCallback(async () => {
    // Only change appState if not already playing (allows layering while track plays)
    if (!isPlaying) {
      setAppState('recording');
    }
    setIsRecordingLayer(true);
    setIsLooperMode(true); // Enter looper mode so DJ knows to ignore singing
    setStatusText('Recording your layer...');

    // Note: We no longer mute DJ - instead DJ is instructed to ignore singing in looper mode

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
        setIsLooperMode(false); // Exit looper mode
        setStatusText('Layer saved!');
      };

      mediaRecorder.start();

      // Auto-stop after 30 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
          setIsLooperMode(false);
        }
      }, 30000);
    } catch (err) {
      console.error('Recording error:', err);
      setStatusText('Mic access denied');
      setIsRecordingLayer(false);
      setIsLooperMode(false);
      if (!isPlaying) {
        setAppState(isConnected ? 'listening' : 'idle');
      }
    }
  }, [isConnected, isPlaying]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecordingLayer(false);
      setIsLooperMode(false); // Exit looper mode

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

  // AI layer controls
  const playAiLayer = useCallback((layerId: string) => {
    setAiLayers(prev =>
      prev.map(layer => {
        if (layer.id === layerId && layer.audioElement) {
          layer.audioElement.play();
          return { ...layer, isPlaying: true };
        }
        return layer;
      })
    );
  }, []);

  const pauseAiLayer = useCallback((layerId: string) => {
    setAiLayers(prev =>
      prev.map(layer => {
        if (layer.id === layerId && layer.audioElement) {
          layer.audioElement.pause();
          return { ...layer, isPlaying: false };
        }
        return layer;
      })
    );
  }, []);

  const deleteAiLayer = useCallback((layerId: string) => {
    setAiLayers(prev => {
      const layer = prev.find(l => l.id === layerId);
      if (layer?.audioElement) {
        layer.audioElement.pause();
        URL.revokeObjectURL(layer.audioUrl);
      }
      return prev.filter(l => l.id !== layerId);
    });
  }, []);

  // Play all AI layers together
  const playAllAiLayers = useCallback(() => {
    setAiLayers(prev =>
      prev.map(layer => {
        if (layer.audioElement) {
          layer.audioElement.currentTime = 0; // Sync start
          layer.audioElement.play();
        }
        return { ...layer, isPlaying: true };
      })
    );
    setIsPlaying(true);
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

  // Make music using Music Compose API (called by clientTools)
  const makeMusic = useCallback(async (prompt: string): Promise<string> => {
    console.log('🎵 [1] Starting makeMusic with prompt:', prompt);
    setAppState('generating');
    setStatusText('Composing music...');

    try {
      console.log('🎵 [2] Calling /api/make-music...');
      const response = await fetch('/api/make-music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          duration_ms: 15000, // 15 seconds
        }),
      });

      console.log('🎵 [3] Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('🎵 [3b] Error response:', errorData);
        throw new Error(errorData.error || `Music generation failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('🎵 [4] Got response, success:', data.success);

      if (!data.success || !data.audioUrl) {
        throw new Error('No audio URL in response');
      }

      setBackingTrackUrl(data.audioUrl);

      // Play looping audio
      console.log('🎵 [5] backingTrackRef.current exists?', !!backingTrackRef.current);
      if (backingTrackRef.current) {
        backingTrackRef.current.src = data.audioUrl;
        backingTrackRef.current.loop = true;
        console.log('🎵 [6] Attempting to play...');

        try {
          await backingTrackRef.current.play();
          console.log('🎵 [7] Play started successfully!');
          setNeedsManualPlay(false);
          setAppState('playing');
          setStatusText('Music playing!');
          setIsPlaying(true);
        } catch (playError) {
          // iOS may block autoplay - show manual play button
          console.warn('🎵 [7b] Autoplay blocked (likely iOS), enabling manual play:', playError);
          setNeedsManualPlay(true);
          setAppState('playing');
          setStatusText('Tap to play music');
          setIsPlaying(false);
          return 'Music ready! Tap the play button to start.';
        }
      }

      console.log('🎵 [8] Done! Returning success');
      return 'Music composed and playing!';
    } catch (err) {
      console.error('🎵 [ERROR] Make music error:', err);
      setStatusText('Music generation failed');
      setAppState(isConnected ? 'listening' : 'idle');
      return 'Failed to generate music';
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

  // Scribe for live speech-to-text
  const scribe = useScribe({
    modelId: 'scribe_v2_realtime',
    onPartialTranscript: (data) => {
      const text = data.text?.trim() || '';

      // Filter out likely hallucinations during silence:
      // 1. Skip empty/very short text (< 2 chars)
      if (text.length < 2) {
        setLiveTranscript('');
        return;
      }

      // 2. Skip text that's mostly non-Latin characters (hallucinated scripts like Urdu)
      // Allow a-z, A-Z, 0-9, common punctuation, and spaces
      const latinChars = (text.match(/[a-zA-Z0-9\s.,!?'"()-]/g) || []).length;
      const latinRatio = latinChars / text.length;
      if (latinRatio < 0.5) {
        // More than 50% non-Latin characters = likely hallucination
        setLiveTranscript('');
        return;
      }

      setLiveTranscript(text);
    },
    onCommittedTranscript: () => {
      // Clear live transcript when committed (conversation handles the final transcript)
      setLiveTranscript('');
    },
    onError: (error) => {
      console.error('Scribe error:', error);
    },
  });

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
          // Return prompt in response so DJ can remember what was generated
          // This helps DJ build on previous instruments when user asks to "add" more
          return `${result} Current track: "${prompt}"`;
        } catch (err) {
          console.error('Tool error:', err);
          return 'Sorry, sound generation encountered an error. Please try again.';
        }
      },
      make_music: async ({ prompt }: { prompt: string }) => {
        console.log('Agent called make_music with:', prompt);
        try {
          const result = await makeMusic(prompt);
          // Return prompt in response so DJ can remember what was generated
          return `${result} Current track: "${prompt}"`;
        } catch (err) {
          console.error('Tool error:', err);
          return 'Sorry, music composition encountered an error. Please try again.';
        }
      },
      // Looper mode tools - DJ calls these when user wants to record layers
      enter_looper_mode: async () => {
        console.log('🔄 Agent called enter_looper_mode');
        setIsLooperMode(true);
        // Auto-start recording
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

            const newLayer: RecordedLayer = {
              id: `layer-${Date.now()}`,
              audioUrl,
              audioElement: null,
              isPlaying: false,
            };

            const audioElement = new Audio(audioUrl);
            audioElement.loop = true;
            newLayer.audioElement = audioElement;

            setRecordedLayers(prev => [...prev, newLayer]);
            stream.getTracks().forEach(track => track.stop());
            setIsRecordingLayer(false);
          };

          mediaRecorder.start();
          setIsRecordingLayer(true);

          // Auto-stop after 30 seconds
          setTimeout(() => {
            if (mediaRecorderRef.current?.state === 'recording') {
              mediaRecorderRef.current.stop();
              setIsLooperMode(false);
            }
          }, 30000);

          return 'Looper mode activated! Recording your layer. Say "done" when finished.';
        } catch (err) {
          console.error('Recording error in looper mode:', err);
          setIsLooperMode(false);
          return 'Could not access microphone for recording.';
        }
      },
      exit_looper_mode: async () => {
        console.log('🔄 Agent called exit_looper_mode');
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
        setIsLooperMode(false);
        setIsRecordingLayer(false);
        const layerCount = recordedLayers.length + 1; // +1 for the one being saved
        return `Layer saved! You now have ${layerCount} recorded layer${layerCount > 1 ? 's' : ''}. Want to add another?`;
      },
      // Add AI instrument layer - generates and layers a new instrument track
      add_instrument_layer: async ({ instrument, style }: { instrument: string; style: string }) => {
        console.log(`🎹 Agent called add_instrument_layer: ${instrument} in style: ${style}`);
        setAppState('generating');
        setStatusText(`Adding ${instrument}...`);

        try {
          // Generate the instrument layer
          const prompt = `${style} ${instrument} loop, instrumental, high quality`;
          const response = await fetch('/api/sound-generation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: prompt,
              duration_seconds: 15,
              prompt_influence: 0.5,
            }),
          });

          if (!response.ok) {
            throw new Error(`Sound generation failed: ${response.status}`);
          }

          const blob = await response.blob();
          const audioUrl = URL.createObjectURL(blob);

          // Create audio element for this layer
          const audioElement = new Audio(audioUrl);
          audioElement.loop = true;

          // If other layers are playing, start this one too
          const shouldAutoPlay = aiLayers.some(l => l.isPlaying) || isPlaying;
          if (shouldAutoPlay) {
            audioElement.play().catch(console.warn);
          }

          const newLayer: AIInstrumentLayer = {
            id: `ai-${instrument}-${Date.now()}`,
            instrument,
            prompt,
            audioUrl,
            audioElement,
            isPlaying: shouldAutoPlay,
          };

          setAiLayers(prev => [...prev, newLayer]);
          setAppState(isConnected ? 'listening' : 'idle');
          setStatusText(shouldAutoPlay ? `${instrument} added and playing!` : `${instrument} ready!`);

          // Return layer info so DJ can track what's been added
          const allInstruments = [...aiLayers.map(l => l.instrument), instrument];
          return `Added ${instrument}! Current AI layers: ${allInstruments.join(', ')}. ${shouldAutoPlay ? 'Playing now.' : 'Ready to play.'}`;
        } catch (err) {
          console.error('Add instrument layer error:', err);
          setAppState(isConnected ? 'listening' : 'idle');
          setStatusText('Failed to add layer');
          return `Sorry, couldn't add ${instrument}. Please try again.`;
        }
      },
    },
    onConnect: async () => {
      setIsConnected(true);
      setAppState('listening');
      setStatusText('Listening...');
      setError(null);
      setSessionLog([]); // Clear session log on new connection
      setLiveTranscript(''); // Clear live transcript

      // Connect Scribe for live speech-to-text
      try {
        const scribeResponse = await fetch('/api/scribe-token');
        if (scribeResponse.ok) {
          const { token } = await scribeResponse.json();
          await scribe.connect({ token, microphone: {} });
          console.log('Scribe connected for live transcription');
        }
      } catch (err) {
        console.warn('Could not connect Scribe:', err);
      }
    },
    onDisconnect: () => {
      setIsConnected(false);
      setAppState('idle');
      setStatusText('');
      setLiveTranscript('');

      // Disconnect Scribe
      scribe.disconnect();
    },
    onMessage: (message) => {
      console.log('📨 Message event:', message);
      // Handle user transcript - show what user said and switch to processing
      if ('source' in message && message.source === 'user' && message.message) {
        // Deduplicate: Check against ALL recent user messages (not just the last one)
        // This fixes the bug where tool calls cause message re-emission
        setSessionLog(prev => {
          const newText = message.message.trim();

          // Get recent user messages to check for duplicates
          const recentUserMessages = prev
            .filter(e => e.role === 'user')
            .slice(-5); // Check last 5 user messages

          // Check for exact or near-duplicate
          for (const entry of recentUserMessages) {
            const entryText = entry.text.trim();
            // Skip if exact match or text overlaps significantly
            if (entryText === newText || entryText.includes(newText) || newText.includes(entryText)) {
              // If new text is longer, update the existing entry
              if (newText.length > entryText.length) {
                const entryIndex = prev.findIndex(e => e === entry);
                if (entryIndex !== -1) {
                  const updated = [...prev];
                  updated[entryIndex] = { ...entry, text: newText };
                  return updated;
                }
              }
              return prev; // Skip duplicate
            }
          }

          return [...prev, {
            role: 'user',
            text: newText,
            timestamp: new Date(),
          }];
        });
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

  // Auto-scroll session log to bottom when new messages arrive
  useEffect(() => {
    if (sessionLogRef.current) {
      sessionLogRef.current.scrollTop = sessionLogRef.current.scrollHeight;
    }
  }, [sessionLog, liveTranscript]);

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
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header - Full Width */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
              Jazz Scat
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {isConnected ? statusText || 'Your AI jam partner is ready' : 'AI-generated backing tracks + real-time coaching'}
            </p>
          </div>
          <div className="flex rounded-xl overflow-hidden border border-slate-700/50 bg-slate-800/30 self-start sm:self-auto">
            <Link
              href="/"
              className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 text-purple-300 text-sm font-medium border-r border-slate-700/50"
            >
              <span>🎤</span>
              <span>Voice DJ</span>
            </Link>
            <Link
              href="/improv"
              className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-700/30 transition-colors text-sm font-medium"
            >
              <span>🎚️</span>
              <span>Improv</span>
            </Link>
          </div>
        </div>

        {/* Looper Mode Banner - DJ is listening but ignoring musical sounds */}
        {isLooperMode && isRecordingLayer && (
          <div className="mb-6 p-3 bg-emerald-900/30 border border-emerald-500/50 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-emerald-400 animate-pulse text-xl">🔄</span>
              <span className="text-emerald-300 font-medium">Looper Mode - Recording Layer (say &quot;done&quot; when finished)</span>
            </div>
            <button
              onClick={() => {
                if (mediaRecorderRef.current?.state === 'recording') {
                  mediaRecorderRef.current.stop();
                }
                setIsLooperMode(false);
                setIsRecordingLayer(false);
              }}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium transition-colors"
            >
              Done
            </button>
          </div>
        )}

        {/* Legacy Recording Mode Banner (non-looper, manual recording) */}
        {isRecordingLayer && !isLooperMode && (
          <div className="mb-6 p-3 bg-red-900/30 border border-red-500/50 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-red-400 animate-pulse text-xl">🔴</span>
              <span className="text-red-300 font-medium">Recording Mode - DJ Paused</span>
            </div>
            <button
              onClick={stopRecording}
              className="px-4 py-1.5 bg-red-600 hover:bg-red-500 rounded-lg text-sm font-medium transition-colors"
            >
              Stop Recording
            </button>
          </div>
        )}

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
          {/* Main Column: Music Controls */}
          <main className="space-y-6">
            {/* Visual Element + Main CTA */}
            <div className="flex flex-col items-center p-8 bg-slate-800/30 rounded-xl border border-slate-700/50">
              {/* Animated rings */}
              <div className="relative w-40 h-40 md:w-48 md:h-48 mb-6">
                <div className={`absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 opacity-20 ${getRingAnimation()}`} />
                <div className={`absolute inset-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 opacity-30 ${appState !== 'idle' ? 'animate-pulse' : ''}`} />
                <div className="absolute inset-6 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 opacity-50" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-5xl md:text-6xl">
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
                className={`w-64 h-16 text-white text-xl font-bold rounded-xl shadow-lg
                            transform hover:scale-105 transition-all active:scale-95
                            flex items-center justify-center gap-3
                            ${isConnected
                              ? 'bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600'
                              : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500'}
                            ${appState === 'connecting' ? 'cursor-wait opacity-80' : ''}`}
              >
                {appState === 'connecting' ? (
                  <>Connecting... <span className="animate-spin">⏳</span></>
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
                  onClick={async () => {
                    if (backingTrackRef.current) {
                      try {
                        await backingTrackRef.current.play();
                        setNeedsManualPlay(false);
                        setIsPlaying(true);
                        setStatusText('Track playing!');
                      } catch (e) {
                        console.error('Manual play failed:', e);
                      }
                    }
                  }}
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

            {/* Generated Layers - 3 Cards */}
            {hasLayers && (
              <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 p-4">
                <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">
                  🎵 Generated Layers
                </h2>
                <div className="grid grid-cols-3 gap-3">
                  {layers.map(layer => (
                    <div
                      key={layer.id}
                      className={`p-4 rounded-lg text-center transition-all ${
                        layer.audioUrl
                          ? 'bg-green-500/20 border border-green-500/50'
                          : 'bg-slate-700/30 border border-slate-600/50'
                      }`}
                    >
                      <span className="text-2xl mb-1 block">
                        {layer.type === 'bass' && '🎸'}
                        {layer.type === 'harmony' && '🎹'}
                        {layer.type === 'rhythm' && '🥁'}
                      </span>
                      <span className={`text-sm font-medium capitalize ${
                        layer.audioUrl ? 'text-green-400' : 'text-slate-500'
                      }`}>
                        {layer.type}
                      </span>
                      {layer.audioUrl && (
                        <span className="block text-xs text-green-500 mt-1">Ready</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Playback Controls */}
            {isPlaying && (
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
                    onClick={toggleBackingTrack}
                    className="px-4 py-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500
                               rounded-lg text-white font-medium transition-all flex items-center gap-2"
                  >
                    {backingTrackPaused ? '▶️ Resume' : '⏸️ Pause'}
                  </button>
                  <button
                    onClick={stopAll}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-medium transition-all flex items-center gap-2"
                  >
                    ⏹️ Stop
                  </button>
                  {isConnected && (
                    <button
                      onClick={toggleDjMute}
                      className={`px-4 py-2 rounded-lg text-white font-medium transition-all flex items-center gap-2 ${
                        isDjMuted
                          ? 'bg-amber-600 hover:bg-amber-500'
                          : 'bg-slate-700 hover:bg-slate-600'
                      }`}
                    >
                      {isDjMuted ? '🔇 Unmute DJ' : '🔊 Mute DJ'}
                    </button>
                  )}
                  {isConnected && !isRecordingLayer && (
                    <button
                      onClick={startRecording}
                      className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500
                                 rounded-lg text-white font-medium transition-all flex items-center gap-2"
                    >
                      🎤 Add Layer
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* AI Instrument Layers */}
            {aiLayers.length > 0 && (
              <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                    🎹 AI Instruments
                  </h2>
                  {aiLayers.length > 1 && (
                    <button
                      onClick={playAllAiLayers}
                      className="px-3 py-1 bg-purple-600 hover:bg-purple-500 rounded text-xs font-medium transition-colors"
                    >
                      ▶️ Play All
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {aiLayers.map((layer) => (
                    <div
                      key={layer.id}
                      className="flex items-center gap-3 bg-purple-900/20 border border-purple-500/30 rounded-lg p-3"
                    >
                      <span className="text-purple-300 text-sm font-medium capitalize">{layer.instrument}</span>
                      <div className="flex gap-2 ml-auto">
                        {layer.isPlaying ? (
                          <button
                            onClick={() => pauseAiLayer(layer.id)}
                            className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-500 rounded text-sm transition-colors"
                          >
                            ⏸️
                          </button>
                        ) : (
                          <button
                            onClick={() => playAiLayer(layer.id)}
                            className="px-3 py-1.5 bg-green-600 hover:bg-green-500 rounded text-sm transition-colors"
                          >
                            ▶️
                          </button>
                        )}
                        <button
                          onClick={() => deleteAiLayer(layer.id)}
                          className="px-3 py-1.5 bg-red-600/50 hover:bg-red-500 rounded text-sm transition-colors"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recorded Layers */}
            {recordedLayers.length > 0 && (
              <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 p-4">
                <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">
                  🎤 Your Recordings
                </h2>
                <div className="space-y-2">
                  {recordedLayers.map((layer, index) => (
                    <div
                      key={layer.id}
                      className="flex items-center gap-3 bg-slate-700/30 rounded-lg p-3"
                    >
                      <span className="text-slate-400 text-sm font-medium">Layer {index + 1}</span>
                      <div className="flex gap-2 ml-auto">
                        {layer.isPlaying ? (
                          <button
                            onClick={() => pauseRecordedLayer(layer.id)}
                            className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-500 rounded text-sm transition-colors"
                          >
                            ⏸️
                          </button>
                        ) : (
                          <button
                            onClick={() => playRecordedLayer(layer.id)}
                            className="px-3 py-1.5 bg-green-600 hover:bg-green-500 rounded text-sm transition-colors"
                          >
                            ▶️
                          </button>
                        )}
                        <button
                          onClick={() => deleteRecordedLayer(layer.id)}
                          className="px-3 py-1.5 bg-red-600/50 hover:bg-red-500 rounded text-sm transition-colors"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </main>

          {/* Sidebar: Session Log */}
          <aside className="lg:sticky lg:top-8 lg:self-start">
            <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 p-4">
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">
                📝 Session Log
              </h2>
              <div
                ref={sessionLogRef}
                className="bg-slate-900/50 rounded-lg p-3 max-h-96 overflow-y-auto border border-slate-700/50"
              >
                {sessionLog.length === 0 && !isConnected && (
                  <p className="text-slate-500 text-sm italic">Start a session to see the conversation...</p>
                )}
                {sessionLog.map((entry, index) => (
                  <div key={index} className="text-sm mb-2">
                    <span className={entry.role === 'agent' ? 'text-purple-400' : 'text-blue-400'}>
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
                      <span className="text-slate-500 italic animate-pulse">Listening...</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Powered by */}
            <p className="mt-4 text-slate-600 text-xs text-center">
              Powered by ElevenLabs AI
            </p>
          </aside>
        </div>
      </div>

      {/* Hidden audio element */}
      <audio ref={backingTrackRef} className="hidden" />
    </div>
  );
}
