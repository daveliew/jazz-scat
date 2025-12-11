// Web Audio API utilities for mixing multiple tracks

export interface AudioTrack {
  id: string;
  buffer: AudioBuffer | null;
  gainNode: GainNode | null;
  sourceNode: AudioBufferSourceNode | null;
  isPlaying: boolean;
}

export class AudioMixer {
  private context: AudioContext | null = null;
  private tracks: Map<string, AudioTrack> = new Map();
  private masterGain: GainNode | null = null;

  async initialize(): Promise<void> {
    if (!this.context) {
      this.context = new AudioContext();
      this.masterGain = this.context.createGain();
      this.masterGain.connect(this.context.destination);
    }

    // Resume context if suspended (browser autoplay policy)
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }
  }

  getContext(): AudioContext | null {
    return this.context;
  }

  async loadTrack(id: string, audioUrl: string): Promise<AudioBuffer | null> {
    if (!this.context) {
      await this.initialize();
    }

    try {
      // Handle base64 data URLs
      let arrayBuffer: ArrayBuffer;

      if (audioUrl.startsWith('data:')) {
        const base64 = audioUrl.split(',')[1];
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        arrayBuffer = bytes.buffer;
      } else {
        const response = await fetch(audioUrl);
        arrayBuffer = await response.arrayBuffer();
      }

      const audioBuffer = await this.context!.decodeAudioData(arrayBuffer);

      // Create gain node for this track
      const gainNode = this.context!.createGain();
      gainNode.connect(this.masterGain!);

      this.tracks.set(id, {
        id,
        buffer: audioBuffer,
        gainNode,
        sourceNode: null,
        isPlaying: false,
      });

      return audioBuffer;
    } catch (error) {
      console.error(`Error loading track ${id}:`, error);
      return null;
    }
  }

  setTrackVolume(id: string, volume: number): void {
    const track = this.tracks.get(id);
    if (track?.gainNode) {
      track.gainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  setTrackMuted(id: string, muted: boolean): void {
    const track = this.tracks.get(id);
    if (track?.gainNode) {
      track.gainNode.gain.value = muted ? 0 : 1;
    }
  }

  playTrack(id: string, loop = false): void {
    const track = this.tracks.get(id);
    if (!track?.buffer || !this.context) return;

    // Stop existing playback
    this.stopTrack(id);

    // Create new source node
    const sourceNode = this.context.createBufferSource();
    sourceNode.buffer = track.buffer;
    sourceNode.loop = loop;
    sourceNode.connect(track.gainNode!);
    sourceNode.start(0);

    track.sourceNode = sourceNode;
    track.isPlaying = true;

    // Handle playback end
    sourceNode.onended = () => {
      track.isPlaying = false;
      track.sourceNode = null;
    };
  }

  stopTrack(id: string): void {
    const track = this.tracks.get(id);
    if (track?.sourceNode) {
      try {
        track.sourceNode.stop();
      } catch {
        // Ignore if already stopped
      }
      track.sourceNode = null;
      track.isPlaying = false;
    }
  }

  playAllTracks(loop = false): void {
    const startTime = this.context?.currentTime || 0;

    this.tracks.forEach((track) => {
      if (!track.buffer || !this.context) return;

      // Stop existing playback
      if (track.sourceNode) {
        try {
          track.sourceNode.stop();
        } catch {
          // Ignore
        }
      }

      // Create new source node
      const sourceNode = this.context.createBufferSource();
      sourceNode.buffer = track.buffer;
      sourceNode.loop = loop;
      sourceNode.connect(track.gainNode!);
      sourceNode.start(startTime);

      track.sourceNode = sourceNode;
      track.isPlaying = true;

      sourceNode.onended = () => {
        track.isPlaying = false;
        track.sourceNode = null;
      };
    });
  }

  stopAllTracks(): void {
    this.tracks.forEach((track) => {
      this.stopTrack(track.id);
    });
  }

  removeTrack(id: string): void {
    this.stopTrack(id);
    const track = this.tracks.get(id);
    if (track?.gainNode) {
      track.gainNode.disconnect();
    }
    this.tracks.delete(id);
  }

  dispose(): void {
    this.stopAllTracks();
    this.tracks.forEach((track) => {
      if (track.gainNode) {
        track.gainNode.disconnect();
      }
    });
    this.tracks.clear();

    if (this.masterGain) {
      this.masterGain.disconnect();
    }

    if (this.context) {
      this.context.close();
      this.context = null;
    }
  }
}

// Singleton instance
let mixerInstance: AudioMixer | null = null;

export function getAudioMixer(): AudioMixer {
  if (!mixerInstance) {
    mixerInstance = new AudioMixer();
  }
  return mixerInstance;
}
