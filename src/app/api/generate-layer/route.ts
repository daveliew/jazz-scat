import { NextRequest, NextResponse } from 'next/server';
import { getElevenLabsClient, buildMusicPrompt, streamToBuffer } from '@/lib/elevenlabs';
import { LAYER_CONFIG, LayerType, Genre } from '@/types/improv';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { layerType, genre, bpm } = body as {
      layerType: Exclude<LayerType, 'user'>;
      genre: Genre;
      bpm: number;
    };

    // Validate inputs
    if (!layerType || !genre || !bpm) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: layerType, genre, bpm' },
        { status: 400 }
      );
    }

    if (!['bass', 'harmony', 'rhythm'].includes(layerType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid layer type. Must be bass, harmony, or rhythm' },
        { status: 400 }
      );
    }

    const layerConfig = LAYER_CONFIG[layerType];
    if (!layerConfig) {
      return NextResponse.json(
        { success: false, error: 'Layer configuration not found' },
        { status: 400 }
      );
    }

    // Build the prompt for music generation
    const prompt = buildMusicPrompt(layerConfig.promptTemplate, genre, bpm);

    console.log(`Generating ${layerType} layer:`, { genre, bpm, prompt });

    // Get ElevenLabs client
    const client = getElevenLabsClient();

    // Generate music using ElevenLabs Music API
    // Note: Music generation returns a stream of audio data
    const audioStream = await client.music.compose({
      prompt,
      musicLengthMs: 15000, // 15 seconds for 8 bars at ~120 BPM
    });

    // Convert stream to buffer
    const audioBuffer = await streamToBuffer(audioStream);

    // Return audio as base64 data URL
    const base64Audio = audioBuffer.toString('base64');
    const audioDataUrl = `data:audio/mpeg;base64,${base64Audio}`;

    return NextResponse.json({
      success: true,
      audioUrl: audioDataUrl,
      layerType,
      genre,
      bpm,
    });
  } catch (error) {
    console.error('Error generating layer:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
