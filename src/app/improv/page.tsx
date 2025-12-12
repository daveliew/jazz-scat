'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import * as Tooltip from '@radix-ui/react-tooltip';
import { GenreSelector } from '@/components/improv/GenreSelector';
import { LayerMixer } from '@/components/improv/LayerMixer';
import { CoachFeedback } from '@/components/improv/CoachFeedback';
import { VoiceCoach } from '@/components/improv/VoiceCoach';
import {
  Genre,
  TrackLayer,
  GENRE_OPTIONS,
} from '@/types/improv';
import { getAudioMixer, AudioMixer } from '@/lib/audio-mixer';

// Initial layer states
function createInitialLayers(): TrackLayer[] {
  return [
    {
      id: 'bass',
      type: 'bass',
      name: 'Bass Line',
      audioUrl: null,
      audioBuffer: null,
      isLoading: false,
      isPlaying: false,
      volume: 0.8,
      isMuted: false,
    },
    {
      id: 'harmony',
      type: 'harmony',
      name: 'Harmony',
      audioUrl: null,
      audioBuffer: null,
      isLoading: false,
      isPlaying: false,
      volume: 0.8,
      isMuted: false,
    },
    {
      id: 'rhythm',
      type: 'rhythm',
      name: 'Rhythm',
      audioUrl: null,
      audioBuffer: null,
      isLoading: false,
      isPlaying: false,
      volume: 0.7,
      isMuted: false,
    },
    {
      id: 'user',
      type: 'user',
      name: 'Your Improv',
      audioUrl: null,
      audioBuffer: null,
      isLoading: false,
      isPlaying: false,
      volume: 1.0,
      isMuted: false,
    },
  ];
}

export default function ImprovPage() {
  // State
  const [genre, setGenre] = useState<Genre>('doo-wop');
  const [bpm, setBpm] = useState(GENRE_OPTIONS[0].defaultBpm);
  const [layers, setLayers] = useState<TrackLayer[]>(createInitialLayers());
  const [isPlayingAll, setIsPlayingAll] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [coachFeedback, setCoachFeedback] = useState<string | null>(null);
  const [coachTips, setCoachTips] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Refs
  const mixerRef = useRef<AudioMixer | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Initialize audio mixer
  useEffect(() => {
    mixerRef.current = getAudioMixer();

    return () => {
      if (mixerRef.current) {
        mixerRef.current.dispose();
      }
    };
  }, []);

  // Update layer state helper
  const updateLayer = useCallback((id: string, updates: Partial<TrackLayer>) => {
    setLayers((prev) =>
      prev.map((layer) =>
        layer.id === id ? { ...layer, ...updates } : layer
      )
    );
  }, []);

  // Generate AI layer
  const handleGenerateLayer = useCallback(
    async (layerId: string) => {
      const layer = layers.find((l) => l.id === layerId);
      if (!layer || layer.type === 'user') return;

      updateLayer(layerId, { isLoading: true });

      try {
        const response = await fetch('/api/generate-layer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            layerType: layer.type,
            genre,
            bpm,
          }),
        });

        const data = await response.json();

        if (data.success && data.audioUrl) {
          // Load into audio mixer
          await mixerRef.current?.initialize();
          const audioBuffer = await mixerRef.current?.loadTrack(
            layerId,
            data.audioUrl
          );

          updateLayer(layerId, {
            audioUrl: data.audioUrl,
            audioBuffer: audioBuffer || null,
            isLoading: false,
          });
        } else {
          console.error('Generation failed:', data.error);
          updateLayer(layerId, { isLoading: false });
          alert(`Failed to generate: ${data.error || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Error generating layer:', error);
        updateLayer(layerId, { isLoading: false });
        alert('Failed to generate layer. Check console for details.');
      }
    },
    [layers, genre, bpm, updateLayer]
  );

  // Recording handlers - stopRecording defined first since startRecording references it
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  const startRecording = useCallback(async () => {
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

        // Load into mixer
        await mixerRef.current?.initialize();
        const audioBuffer = await mixerRef.current?.loadTrack('user', audioUrl);

        updateLayer('user', {
          audioUrl,
          audioBuffer: audioBuffer || null,
          isLoading: false,
        });

        // Stop all tracks in the stream
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Auto-stop after 30 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
        }
      }, 30000);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  }, [updateLayer]);

  const handleRecordLayer = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  // Volume and mute controls
  const handleVolumeChange = useCallback(
    (layerId: string, volume: number) => {
      updateLayer(layerId, { volume });
      mixerRef.current?.setTrackVolume(layerId, volume);
    },
    [updateLayer]
  );

  const handleMuteToggle = useCallback(
    (layerId: string) => {
      const layer = layers.find((l) => l.id === layerId);
      if (layer) {
        const newMuted = !layer.isMuted;
        updateLayer(layerId, { isMuted: newMuted });
        mixerRef.current?.setTrackMuted(layerId, newMuted);
      }
    },
    [layers, updateLayer]
  );

  // Playback controls
  const handlePlayAll = useCallback(async () => {
    await mixerRef.current?.initialize();
    mixerRef.current?.playAllTracks(true);
    setIsPlayingAll(true);

    // Update layer states
    setLayers((prev) =>
      prev.map((layer) => ({
        ...layer,
        isPlaying: !!layer.audioUrl,
      }))
    );
  }, []);

  const handleStopAll = useCallback(() => {
    mixerRef.current?.stopAllTracks();
    setIsPlayingAll(false);

    // Update layer states
    setLayers((prev) =>
      prev.map((layer) => ({
        ...layer,
        isPlaying: false,
      }))
    );
  }, []);

  // AI Coach analysis
  const handleAnalyze = useCallback(async () => {
    const userLayer = layers.find((l) => l.type === 'user');
    if (!userLayer?.audioUrl) return;

    setIsAnalyzing(true);
    setCoachFeedback(null);
    setCoachTips([]);

    try {
      // Convert user audio to base64
      const response = await fetch(userLayer.audioUrl);
      const blob = await response.blob();
      const reader = new FileReader();

      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];

        const analyzeResponse = await fetch('/api/analyze-improv', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userAudioBase64: base64,
            genre,
            bpm,
            backingTracksInfo: layers
              .filter((l) => l.type !== 'user')
              .map((l) => ({
                layerType: l.type,
                hasAudio: !!l.audioUrl,
              })),
          }),
        });

        const data = await analyzeResponse.json();

        if (data.success) {
          setCoachFeedback(data.feedback || 'Great job! Keep practicing.');
          setCoachTips(data.tips || []);
        } else {
          setCoachFeedback(`Analysis failed: ${data.error}`);
        }

        setIsAnalyzing(false);
      };

      reader.readAsDataURL(blob);
    } catch (error) {
      console.error('Error analyzing improv:', error);
      setCoachFeedback('Failed to analyze. Please try again.');
      setIsAnalyzing(false);
    }
  }, [layers, genre, bpm]);

  // Reset session
  const handleNewSession = useCallback(() => {
    mixerRef.current?.stopAllTracks();
    setLayers(createInitialLayers());
    setIsPlayingAll(false);
    setIsRecording(false);
    setCoachFeedback(null);
    setCoachTips([]);
  }, []);

  const hasUserRecording = !!layers.find((l) => l.type === 'user')?.audioUrl;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header with Mode Tabs - Full Width */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
                Improv
              </h1>
              <Tooltip.Provider delayDuration={200}>
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <button className="text-slate-400 hover:text-teal-400 transition-colors mt-1">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM8.94 6.94a.75.75 0 11-1.061-1.061 3 3 0 112.871 5.026v.345a.75.75 0 01-1.5 0v-.5c0-.72.57-1.172 1.081-1.287A1.5 1.5 0 108.94 6.94zM10 15a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content
                      className="bg-slate-800 border border-slate-700 rounded-lg p-4 max-w-xs z-50 shadow-xl"
                      sideOffset={5}
                    >
                      <h4 className="font-semibold text-white mb-2">How to use:</h4>
                      <ol className="list-decimal list-inside space-y-1 text-sm text-slate-300">
                        <li>Choose a vibe and BPM</li>
                        <li>Generate AI backing tracks</li>
                        <li>Play all tracks together</li>
                        <li>Record your vocal improv (30s max)</li>
                        <li>Get feedback from AI Coach</li>
                      </ol>
                      <Tooltip.Arrow className="fill-slate-800" />
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
              </Tooltip.Provider>
            </div>
            <p className="text-slate-400 text-sm mt-1">
              Build backing tracks layer by layer
            </p>
          </div>
          <div className="flex rounded-xl overflow-hidden border border-slate-700/50 bg-slate-800/30 self-start sm:self-auto">
            <Link
              href="/"
              className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-700/30 transition-colors text-sm font-medium border-r border-slate-700/50"
            >
              <span>🎤</span>
              <span>Voice DJ</span>
            </Link>
            <Link
              href="/improv"
              className="flex items-center gap-2 px-4 py-2 bg-teal-600/20 text-teal-300 text-sm font-medium"
            >
              <span>🎚️</span>
              <span>Improv</span>
            </Link>
          </div>
        </div>

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
          {/* Main Column: Music Controls */}
          <main className="space-y-6">
            {/* Genre Selector */}
            <GenreSelector
              selectedGenre={genre}
              bpm={bpm}
              onGenreChange={setGenre}
              onBpmChange={setBpm}
              disabled={isRecording || isPlayingAll}
            />

            {/* New Session Button */}
            <div className="flex justify-end">
              <button
                onClick={handleNewSession}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white
                           border border-slate-700 hover:border-slate-600
                           rounded-lg transition-colors"
              >
                🔄 New Session
              </button>
            </div>

            {/* Layer Mixer */}
            <LayerMixer
              layers={layers}
              onGenerateLayer={handleGenerateLayer}
              onRecordLayer={handleRecordLayer}
              onVolumeChange={handleVolumeChange}
              onMuteToggle={handleMuteToggle}
              onPlayAll={handlePlayAll}
              onStopAll={handleStopAll}
              isPlayingAll={isPlayingAll}
              isRecording={isRecording}
            />
          </main>

          {/* Sidebar: Coaching Panel */}
          <aside className="space-y-6 lg:sticky lg:top-8 lg:self-start">
            {/* Voice Coach - Real-time Conversation */}
            <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 p-4">
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">
                🎤 Voice Coach
              </h2>
              <VoiceCoach
                genre={genre}
                bpm={bpm}
                activeLayers={layers.filter(l => l.audioUrl && l.type !== 'user').map(l => l.type)}
              />
            </div>

            {/* AI Coach - Analyze Recording */}
            <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 p-4">
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">
                📝 AI Feedback
              </h2>
              <CoachFeedback
                feedback={coachFeedback}
                tips={coachTips}
                isAnalyzing={isAnalyzing}
                onAnalyze={handleAnalyze}
                hasUserRecording={hasUserRecording}
              />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
