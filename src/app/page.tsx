'use client';

import { useConversation, useScribe } from '@elevenlabs/react';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useVoiceDJ } from '@/hooks/useVoiceDJ';
import { DJOrb } from '@/components/voice-dj/DJOrb';
import { PlaybackControls } from '@/components/voice-dj/PlaybackControls';
import { SessionLog } from '@/components/voice-dj/SessionLog';
import { UserRecordingCard } from '@/components/voice-dj/UserRecordingCard';
import { IABWarning } from '@/components/IABWarning';
import { detectInAppBrowser } from '@/lib/detect-iab';

export default function Home() {
  // IAB detection - use lazy initialization to check on first render
  const [iabInfo] = useState(() => detectInAppBrowser());

  const {
    state,
    refs,
    actions,
    setAppState,
    setConnected,
    setStatusText,
    setError,
  } = useVoiceDJ();

  // Scribe for live speech-to-text
  const scribe = useScribe({
    modelId: 'scribe_v2_realtime',
    onPartialTranscript: (data) => {
      const text = data.text?.trim() || '';

      // Filter out hallucinations
      if (text.length < 2) {
        actions.setLiveTranscript('');
        return;
      }

      // Skip non-Latin characters (hallucinated scripts)
      const latinChars = (text.match(/[a-zA-Z0-9\s.,!?'"()-]/g) || []).length;
      const latinRatio = latinChars / text.length;
      if (latinRatio < 0.5) {
        actions.setLiveTranscript('');
        return;
      }

      actions.setLiveTranscript(text);
    },
    onCommittedTranscript: () => {
      actions.setLiveTranscript('');
    },
    onError: (error) => {
      console.error('Scribe error:', error);
    },
  });

  // ElevenLabs conversation with SIMPLIFIED clientTools (3 tools only)
  const conversation = useConversation({
    clientTools: {
      generate_backing_track: async ({ prompt }: { prompt: string }) => {
        console.log('Agent called generate_backing_track:', prompt);
        try {
          const result = await actions.generateBackingTrack(prompt);
          return `${result} Current track: "${prompt}"`;
        } catch (err) {
          console.error('Tool error:', err);
          return 'Sorry, sound generation encountered an error. Please try again.';
        }
      },
      make_music: async ({ prompt }: { prompt: string }) => {
        console.log('Agent called make_music:', prompt);
        try {
          const result = await actions.makeMusic(prompt);
          return `${result} Current track: "${prompt}"`;
        } catch (err) {
          console.error('Tool error:', err);
          return 'Sorry, music composition encountered an error. Please try again.';
        }
      },
      stop_track: async () => {
        console.log('Agent called stop_track');
        return await actions.stopTrack();
      },
    },
    onConnect: async () => {
      setConnected(true);
      setAppState('listening');
      setStatusText('Listening...');
      setError(null);
      actions.clearSessionLog();

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
      setConnected(false);
      setAppState('idle');
      setStatusText('');
      actions.setLiveTranscript('');
      scribe.disconnect();
    },
    onMessage: (message) => {
      // Handle user transcript
      if ('source' in message && message.source === 'user' && message.message) {
        actions.addLogEntry({ role: 'user', text: message.message.trim() });
        setAppState('processing');
        setStatusText('Thinking...');
      }
      // Handle agent message
      else if (message.message) {
        actions.addLogEntry({ role: 'agent', text: message.message });
      }
    },
    onError: (err) => {
      console.error('Conversation error:', err);
      setError('Connection error');
      setAppState('idle');
    },
  });

  // Update state based on conversation speaking state
  useEffect(() => {
    if (state.isConnected) {
      if (conversation.isSpeaking) {
        if (state.appState !== 'generating' && state.appState !== 'playing') {
          setAppState('speaking');
          setStatusText('');
        }
      } else if (
        state.appState === 'speaking' ||
        state.appState === 'processing' ||
        state.appState === 'playing'
      ) {
        setAppState('listening');
        setStatusText('Listening...');
      }
    }
  }, [conversation.isSpeaking, state.isConnected, state.appState, setAppState, setStatusText]);

  // Sync DJ mute state with conversation volume
  useEffect(() => {
    if (state.isConnected) {
      conversation.setVolume({ volume: state.isDjMuted ? 0 : 1 });
    }
  }, [state.isDjMuted, state.isConnected, conversation]);

  // Keyboard shortcuts (spacebar to toggle playback)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        if (state.isPlaying) {
          actions.toggleBackingTrack();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.isPlaying, actions]);

  // Start conversation handler
  const startConversation = useCallback(async () => {
    try {
      setAppState('connecting');
      setStatusText('Connecting...');
      setError(null);

      // Unlock audio for iOS
      const audioUnlocked = await actions.unlockAudioForIOS();
      if (!audioUnlocked) {
        throw new Error('Audio not available. Please tap the screen and try again.');
      }

      await navigator.mediaDevices.getUserMedia({ audio: true });

      const response = await fetch('/api/conversation-token');
      if (!response.ok) throw new Error('Failed to get token');

      const { signedUrl } = await response.json();
      await conversation.startSession({ signedUrl });
    } catch (err) {
      console.error('Connection error:', err);

      // Detect specific permission errors
      let errorMessage = 'Connection failed';
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errorMessage = 'Microphone access denied. Please enable in browser settings.';
        } else if (err.name === 'NotFoundError') {
          errorMessage = 'No microphone found. Please connect a microphone.';
        } else if (err.name === 'NotReadableError') {
          errorMessage = 'Microphone is in use by another app.';
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      setAppState('idle');
      setStatusText('');
    }
  }, [conversation, actions, setAppState, setStatusText, setError]);

  // End conversation handler
  const endConversation = useCallback(async () => {
    actions.stopAll();
    await conversation.endSession();
  }, [conversation, actions]);

  // Show warning if in-app browser detected
  if (iabInfo.isIAB) {
    return <IABWarning appName={iabInfo.name || 'This app'} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
              Jazz Scat
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {state.isConnected
                ? state.statusText || 'Your AI jam partner is ready'
                : 'AI-generated backing tracks + real-time coaching'}
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

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
          {/* Main Column */}
          <main className="space-y-6">
            {/* DJ Orb */}
            <DJOrb
              appState={state.appState}
              isPlaying={state.isPlaying}
              isRecording={state.isRecording}
              backingTrackUrl={state.backingTrackUrl}
              isConnected={state.isConnected}
              error={state.error}
              needsManualPlay={state.needsManualPlay}
              onMainAction={state.isConnected ? endConversation : startConversation}
              onManualPlay={actions.manualPlay}
            />

            {/* Playback Controls (when playing) */}
            {state.isPlaying && (
              <PlaybackControls
                backingTrackPaused={state.backingTrackPaused}
                backingTrackUrl={state.backingTrackUrl}
                isDjMuted={state.isDjMuted}
                isConnected={state.isConnected}
                isRecording={state.isRecording}
                onTogglePlay={actions.toggleBackingTrack}
                onStop={actions.stopAll}
                onToggleMute={actions.toggleDjMute}
                onStartRecording={actions.startRecording}
                onStopRecording={actions.stopRecording}
              />
            )}

            {/* User Recording (simplified - single, not array) */}
            {state.userRecording && (
              <UserRecordingCard
                recording={state.userRecording}
                onPlayToggle={actions.toggleRecordingPlayback}
                onDelete={actions.clearRecording}
              />
            )}
          </main>

          {/* Sidebar */}
          <aside>
            <SessionLog
              sessionLog={state.sessionLog}
              liveTranscript={state.liveTranscript}
              appState={state.appState}
              isConnected={state.isConnected}
            />
          </aside>
        </div>
      </div>

      {/* Hidden audio element */}
      <audio ref={refs.backingTrackRef} className="hidden" />
    </div>
  );
}
