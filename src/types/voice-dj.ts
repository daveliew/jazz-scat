/**
 * Voice DJ Types
 *
 * Simplified types for the Voice DJ page - removed multi-layer looper complexity.
 */

// App state machine
export type VoiceDJAppState =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'processing'
  | 'speaking'
  | 'generating'
  | 'playing'
  | 'recording';

// Session log entry
export interface LogEntry {
  role: 'user' | 'agent';
  text: string;
  timestamp: Date;
  seq: number;
}

// Simplified single recording (not multi-layer array)
export interface UserRecording {
  id: string;
  audioUrl: string;
  audioElement: HTMLAudioElement | null;
  isPlaying: boolean;
}

// Consolidated Voice DJ state shape
export interface VoiceDJState {
  // Connection state
  appState: VoiceDJAppState;
  isConnected: boolean;
  statusText: string;
  error: string | null;

  // Backing track state
  backingTrackUrl: string | null;
  backingTrackPaused: boolean;
  isPlaying: boolean;
  needsManualPlay: boolean;

  // Simple recording state (single, not multi-layer)
  userRecording: UserRecording | null;
  isRecording: boolean;

  // Session log state
  sessionLog: LogEntry[];
  liveTranscript: string;

  // DJ state
  isDjMuted: boolean;

  // iOS state
  isAudioUnlocked: boolean;
}

// Initial state factory
export const createInitialVoiceDJState = (): VoiceDJState => ({
  appState: 'idle',
  isConnected: false,
  statusText: '',
  error: null,
  backingTrackUrl: null,
  backingTrackPaused: false,
  isPlaying: false,
  needsManualPlay: false,
  userRecording: null,
  isRecording: false,
  sessionLog: [],
  liveTranscript: '',
  isDjMuted: false,
  isAudioUnlocked: false,
});
