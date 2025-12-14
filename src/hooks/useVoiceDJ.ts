'use client';

import { useState, useCallback, useRef } from 'react';
import {
  VoiceDJState,
  VoiceDJAppState,
  LogEntry,
  UserRecording,
  createInitialVoiceDJState,
} from '@/types/voice-dj';

// iOS detection
const isIOSDevice = () => {
  if (typeof window === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
};

// Global sequence counter for log entries
let logSeq = 0;

/**
 * useVoiceDJ - Consolidated state management hook for Voice DJ page
 *
 * Simplifies state from 25+ useState calls into a single hook.
 * Removes multi-layer looper complexity - now supports single recording only.
 */
export function useVoiceDJ() {
  const [state, setState] = useState<VoiceDJState>(createInitialVoiceDJState);

  // Refs (managed internally)
  const backingTrackRef = useRef<HTMLAudioElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // ===== State Setters (for conversation callbacks) =====

  const setAppState = useCallback((appState: VoiceDJAppState) => {
    setState((prev) => ({ ...prev, appState }));
  }, []);

  const setConnected = useCallback((isConnected: boolean) => {
    setState((prev) => ({ ...prev, isConnected }));
  }, []);

  const setStatusText = useCallback((statusText: string) => {
    setState((prev) => ({ ...prev, statusText }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, error }));
  }, []);

  const setLiveTranscript = useCallback((liveTranscript: string) => {
    setState((prev) => ({ ...prev, liveTranscript }));
  }, []);

  // ===== iOS Audio Unlock =====

  const unlockAudioForIOS = useCallback(async () => {
    if (state.isAudioUnlocked) return;

    if (!isIOSDevice()) {
      console.log('Skipping audio unlock (not iOS)');
      setState((prev) => ({ ...prev, isAudioUnlocked: true }));
      return;
    }

    if (backingTrackRef.current) {
      // Tiny silent MP3 for iOS unlock
      const silentAudio =
        'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYYoRBqpAAAAAAD/+xDEAAPAAADSAAAAAAgAADSAAAAETEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//sQxBoDwAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';
      backingTrackRef.current.src = silentAudio;
      backingTrackRef.current.volume = 0;
      try {
        await backingTrackRef.current.play();
        backingTrackRef.current.pause();
        backingTrackRef.current.volume = 1;
        backingTrackRef.current.src = '';
        setState((prev) => ({ ...prev, isAudioUnlocked: true }));
        console.log('iOS audio unlocked successfully');
      } catch (e) {
        console.log('Audio unlock skipped:', e);
      }
    }
  }, [state.isAudioUnlocked]);

  // ===== Backing Track Controls =====

  const toggleBackingTrack = useCallback(() => {
    if (!backingTrackRef.current || !state.backingTrackUrl) return;

    if (state.backingTrackPaused) {
      backingTrackRef.current.play();
      setState((prev) => ({
        ...prev,
        backingTrackPaused: false,
        statusText: 'Track playing!',
      }));
    } else {
      backingTrackRef.current.pause();
      setState((prev) => ({
        ...prev,
        backingTrackPaused: true,
        statusText: 'Track paused',
      }));
    }
  }, [state.backingTrackPaused, state.backingTrackUrl]);

  const toggleDjMute = useCallback(() => {
    setState((prev) => ({ ...prev, isDjMuted: !prev.isDjMuted }));
  }, []);

  const stopAll = useCallback(() => {
    // Stop backing track
    if (backingTrackRef.current) {
      backingTrackRef.current.pause();
      backingTrackRef.current.currentTime = 0;
    }

    // Stop recording if active
    if (state.userRecording?.audioElement) {
      state.userRecording.audioElement.pause();
      state.userRecording.audioElement.currentTime = 0;
    }

    setState((prev) => ({
      ...prev,
      isPlaying: false,
      backingTrackPaused: false,
      backingTrackUrl: null,
      isDjMuted: false,
      statusText: 'Stopped',
      appState: prev.isConnected ? 'listening' : 'idle',
      userRecording: prev.userRecording
        ? { ...prev.userRecording, isPlaying: false }
        : null,
    }));

    setTimeout(() => {
      setState((prev) => {
        if (prev.isConnected && prev.appState === 'listening') {
          return { ...prev, statusText: 'Listening...' };
        }
        return prev;
      });
    }, 1000);
  }, [state.userRecording]);

  // ===== Simple Recording (single, not multi-layer) =====

  const startRecording = useCallback(async () => {
    if (!state.isPlaying) {
      setState((prev) => ({ ...prev, appState: 'recording' }));
    }
    setState((prev) => ({
      ...prev,
      isRecording: true,
      statusText: 'Recording...',
    }));

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

        // Create single recording (replaces any existing)
        const audioElement = new Audio(audioUrl);
        audioElement.loop = true;

        const newRecording: UserRecording = {
          id: `recording-${Date.now()}`,
          audioUrl,
          audioElement,
          isPlaying: false,
        };

        stream.getTracks().forEach((track) => track.stop());

        setState((prev) => ({
          ...prev,
          userRecording: newRecording,
          isRecording: false,
          statusText: 'Recording saved!',
        }));
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
      setState((prev) => ({
        ...prev,
        statusText: 'Mic access denied',
        isRecording: false,
        appState: prev.isPlaying
          ? prev.appState
          : prev.isConnected
          ? 'listening'
          : 'idle',
      }));
    }
  }, [state.isPlaying]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setState((prev) => ({
        ...prev,
        isRecording: false,
        appState: prev.isPlaying
          ? prev.appState
          : prev.isConnected
          ? 'listening'
          : 'idle',
      }));
    }
  }, []);

  const toggleRecordingPlayback = useCallback(() => {
    setState((prev) => {
      if (!prev.userRecording?.audioElement) return prev;

      if (prev.userRecording.isPlaying) {
        prev.userRecording.audioElement.pause();
      } else {
        prev.userRecording.audioElement.play();
      }

      return {
        ...prev,
        userRecording: {
          ...prev.userRecording,
          isPlaying: !prev.userRecording.isPlaying,
        },
      };
    });
  }, []);

  const clearRecording = useCallback(() => {
    setState((prev) => {
      if (prev.userRecording?.audioElement) {
        prev.userRecording.audioElement.pause();
        URL.revokeObjectURL(prev.userRecording.audioUrl);
      }
      return { ...prev, userRecording: null };
    });
  }, []);

  // ===== Music Generation (clientTools handlers) =====

  const generateBackingTrack = useCallback(
    async (prompt: string): Promise<string> => {
      console.log('generateBackingTrack:', prompt);
      setState((prev) => ({
        ...prev,
        appState: 'generating',
        statusText: 'Spinning up track...',
      }));

      try {
        const response = await fetch('/api/sound-generation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: prompt + ' high quality instrumental jazz loop',
            duration_seconds: 15,
            prompt_influence: 0.5,
          }),
        });

        if (!response.ok) {
          throw new Error(`Sound generation failed: ${response.status}`);
        }

        const blob = await response.blob();
        const audioUrl = URL.createObjectURL(blob);

        setState((prev) => ({ ...prev, backingTrackUrl: audioUrl }));

        if (backingTrackRef.current) {
          backingTrackRef.current.src = audioUrl;
          backingTrackRef.current.loop = true;

          try {
            await backingTrackRef.current.play();
            setState((prev) => ({
              ...prev,
              needsManualPlay: false,
              appState: 'playing',
              statusText: 'Track playing!',
              isPlaying: true,
            }));
          } catch {
            // iOS may block autoplay
            setState((prev) => ({
              ...prev,
              needsManualPlay: true,
              appState: 'playing',
              statusText: 'Tap to play track',
              isPlaying: false,
            }));
            return 'Track ready! Tap the play button to start.';
          }
        }

        return 'Track generated and playing!';
      } catch (err) {
        console.error('Generate backing track error:', err);
        setState((prev) => ({
          ...prev,
          statusText: 'Generation failed',
          appState: prev.isConnected ? 'listening' : 'idle',
        }));
        return 'Failed to generate track';
      }
    },
    []
  );

  const makeMusic = useCallback(async (prompt: string): Promise<string> => {
    console.log('makeMusic:', prompt);
    setState((prev) => ({
      ...prev,
      appState: 'generating',
      statusText: 'Composing music...',
    }));

    try {
      const response = await fetch('/api/make-music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          duration_ms: 15000,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Music generation failed: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success || !data.audioUrl) {
        throw new Error('No audio URL in response');
      }

      setState((prev) => ({ ...prev, backingTrackUrl: data.audioUrl }));

      if (backingTrackRef.current) {
        backingTrackRef.current.src = data.audioUrl;
        backingTrackRef.current.loop = true;

        try {
          await backingTrackRef.current.play();
          setState((prev) => ({
            ...prev,
            needsManualPlay: false,
            appState: 'playing',
            statusText: 'Music playing!',
            isPlaying: true,
          }));
        } catch {
          // iOS may block autoplay
          setState((prev) => ({
            ...prev,
            needsManualPlay: true,
            appState: 'playing',
            statusText: 'Tap to play music',
            isPlaying: false,
          }));
          return 'Music ready! Tap the play button to start.';
        }
      }

      return 'Music composed and playing!';
    } catch (err) {
      console.error('Make music error:', err);
      setState((prev) => ({
        ...prev,
        statusText: 'Music generation failed',
        appState: prev.isConnected ? 'listening' : 'idle',
      }));
      return 'Failed to generate music';
    }
  }, []);

  const stopTrack = useCallback(async (): Promise<string> => {
    console.log('stopTrack called');

    if (backingTrackRef.current) {
      backingTrackRef.current.pause();
      backingTrackRef.current.currentTime = 0;
    }

    setState((prev) => ({
      ...prev,
      backingTrackUrl: null,
      isPlaying: false,
      backingTrackPaused: false,
      statusText: 'Track stopped',
      appState: prev.isConnected ? 'listening' : 'idle',
    }));

    return 'Track stopped! What would you like next?';
  }, []);

  // ===== Manual Play (iOS fallback) =====

  const manualPlay = useCallback(async () => {
    if (backingTrackRef.current) {
      try {
        await backingTrackRef.current.play();
        setState((prev) => ({
          ...prev,
          needsManualPlay: false,
          isPlaying: true,
          statusText: 'Track playing!',
        }));
      } catch (e) {
        console.error('Manual play failed:', e);
      }
    }
  }, []);

  // ===== Session Log =====

  const addLogEntry = useCallback((entry: Omit<LogEntry, 'seq' | 'timestamp'>) => {
    setState((prev) => {
      const newText = entry.text.trim();

      // Deduplicate user messages
      if (entry.role === 'user') {
        const recentUserMessages = prev.sessionLog
          .filter((e) => e.role === 'user')
          .slice(-5);

        for (const existing of recentUserMessages) {
          const existingText = existing.text.trim();
          if (
            existingText === newText ||
            existingText.includes(newText) ||
            newText.includes(existingText)
          ) {
            // Update if new text is longer
            if (newText.length > existingText.length) {
              return {
                ...prev,
                sessionLog: prev.sessionLog.map((e) =>
                  e === existing ? { ...e, text: newText } : e
                ),
              };
            }
            return prev; // Skip duplicate
          }
        }
      }

      return {
        ...prev,
        sessionLog: [
          ...prev.sessionLog,
          { ...entry, timestamp: new Date(), seq: logSeq++ },
        ],
      };
    });
  }, []);

  const clearSessionLog = useCallback(() => {
    logSeq = 0;
    setState((prev) => ({ ...prev, sessionLog: [], liveTranscript: '' }));
  }, []);

  return {
    state,
    refs: {
      backingTrackRef,
    },
    actions: {
      // iOS
      unlockAudioForIOS,
      // Playback
      toggleBackingTrack,
      toggleDjMute,
      stopAll,
      manualPlay,
      // Recording
      startRecording,
      stopRecording,
      toggleRecordingPlayback,
      clearRecording,
      // Music generation (for clientTools)
      generateBackingTrack,
      makeMusic,
      stopTrack,
      // Session log
      addLogEntry,
      clearSessionLog,
      setLiveTranscript,
    },
    // State setters (for conversation callbacks)
    setAppState,
    setConnected,
    setStatusText,
    setError,
  };
}
