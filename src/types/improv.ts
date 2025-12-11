// Types for Acapella Improv Trainer

export type LayerType = 'bass' | 'harmony' | 'rhythm' | 'user';

export type Genre = 'doo-wop' | 'gospel' | 'barbershop' | 'lo-fi' | 'jazz' | 'pop';

export interface GenreOption {
  id: Genre;
  name: string;
  description: string;
  bpmRange: [number, number];
  defaultBpm: number;
}

export interface TrackLayer {
  id: string;
  type: LayerType;
  name: string;
  audioUrl: string | null;
  audioBuffer: AudioBuffer | null;
  isLoading: boolean;
  isPlaying: boolean;
  volume: number; // 0-1
  isMuted: boolean;
}

export interface SessionState {
  genre: Genre;
  bpm: number;
  layers: TrackLayer[];
  isPlayingAll: boolean;
  coachFeedback: string | null;
  isAnalyzing: boolean;
}

export interface GenerateLayerRequest {
  layerType: Exclude<LayerType, 'user'>;
  genre: Genre;
  bpm: number;
}

export interface GenerateLayerResponse {
  success: boolean;
  audioUrl?: string;
  error?: string;
}

export interface AnalyzeImprovRequest {
  userAudioBase64: string;
  genre: Genre;
  bpm: number;
  backingTracksInfo: {
    layerType: LayerType;
    hasAudio: boolean;
  }[];
}

export interface AnalyzeImprovResponse {
  success: boolean;
  feedback?: string;
  tips?: string[];
  error?: string;
}

// Genre configurations
export const GENRE_OPTIONS: GenreOption[] = [
  {
    id: 'doo-wop',
    name: 'Doo-Wop',
    description: 'Classic 50s vocal harmonies',
    bpmRange: [70, 110],
    defaultBpm: 90,
  },
  {
    id: 'gospel',
    name: 'Gospel',
    description: 'Soulful call-and-response',
    bpmRange: [80, 130],
    defaultBpm: 100,
  },
  {
    id: 'barbershop',
    name: 'Barbershop',
    description: 'Tight four-part harmony',
    bpmRange: [60, 100],
    defaultBpm: 80,
  },
  {
    id: 'lo-fi',
    name: 'Lo-Fi',
    description: 'Chill, mellow vibes',
    bpmRange: [70, 95],
    defaultBpm: 85,
  },
  {
    id: 'jazz',
    name: 'Jazz Scat',
    description: 'Bebop improvisation',
    bpmRange: [100, 160],
    defaultBpm: 120,
  },
  {
    id: 'pop',
    name: 'Pop',
    description: 'Modern vocal arrangements',
    bpmRange: [90, 130],
    defaultBpm: 110,
  },
];

// Layer configurations
export const LAYER_CONFIG: Record<LayerType, { name: string; icon: string; promptTemplate: string }> = {
  bass: {
    name: 'Bass Line',
    icon: '🎵',
    promptTemplate: 'Deep bass vocal line with rich low tones, {genre} style, {bpm} BPM, humming and "doom" syllables, 8 bars, acapella only',
  },
  harmony: {
    name: 'Harmony',
    icon: '🎶',
    promptTemplate: 'Smooth mid-range harmony vocals, oohs and aahs, {genre} style, {bpm} BPM, complementary notes, 8 bars, acapella only',
  },
  rhythm: {
    name: 'Rhythm',
    icon: '🥁',
    promptTemplate: 'Vocal percussion and beatbox, {genre} style, {bpm} BPM, mouth drums and rhythmic sounds, 8 bars, acapella only',
  },
  user: {
    name: 'Your Improv',
    icon: '🎙️',
    promptTemplate: '', // User records this
  },
};
