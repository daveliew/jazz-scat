'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
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
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header with Mode Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
              Layer Builder
            </h1>
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
              <span>Layer Builder</span>
            </Link>
          </div>
        </div>

        {/* Genre Selector */}
        <div className="mb-6">
          <GenreSelector
            selectedGenre={genre}
            bpm={bpm}
            onGenreChange={setGenre}
            onBpmChange={setBpm}
            disabled={isRecording || isPlayingAll}
          />
        </div>

        {/* New Session Button */}
        <div className="flex justify-end mb-4">
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
        <div className="mb-8">
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
        </div>

        {/* AI Coach - Analyze Recording */}
        <CoachFeedback
          feedback={coachFeedback}
          tips={coachTips}
          isAnalyzing={isAnalyzing}
          onAnalyze={handleAnalyze}
          hasUserRecording={hasUserRecording}
        />

        {/* Voice Coach - Real-time Conversation */}
        <div className="mb-8">
          <VoiceCoach />
        </div>

        {/* Instructions */}
        <div className="mt-8 p-4 bg-slate-800/30 rounded-xl text-sm text-slate-400">
          <h3 className="font-semibold text-slate-300 mb-2">How to use:</h3>
          <ol className="list-decimal list-inside space-y-1">
            <li>Choose a vibe and BPM that fits your mood</li>
            <li>Generate AI backing tracks (bass, harmony, rhythm)</li>
            <li>Play all tracks to hear the backing</li>
            <li>Record your vocal improv (30 seconds max)</li>
            <li>Get feedback from the AI Coach</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
