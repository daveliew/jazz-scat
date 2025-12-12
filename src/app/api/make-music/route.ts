import { NextRequest, NextResponse } from 'next/server';
import { getElevenLabsClient, streamToBuffer } from '@/lib/elevenlabs';

/**
 * POST /api/make-music
 *
 * Generates music using ElevenLabs Music Compose API.
 * Returns audio as base64 data URL.
 *
 * Body: { prompt: string, duration_ms?: number }
 */

interface MakeMusicRequest {
  prompt: string;
  duration_ms?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: MakeMusicRequest = await request.json();
    const { prompt, duration_ms = 10000 } = body;

    if (!prompt) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: prompt' },
        { status: 400 }
      );
    }

    // Validate duration (3-300 seconds = 3000-300000ms)
    const clampedDuration = Math.max(3000, Math.min(300000, duration_ms));

    console.log('🎵 Generating music:', { prompt, duration_ms: clampedDuration });

    // Get ElevenLabs client
    const client = getElevenLabsClient();

    // Generate music using ElevenLabs Music API
    const audioStream = await client.music.compose({
      prompt,
      musicLengthMs: clampedDuration,
    });

    // Convert stream to buffer
    const audioBuffer = await streamToBuffer(audioStream);

    // Return audio as base64 data URL
    const base64Audio = audioBuffer.toString('base64');
    const audioDataUrl = `data:audio/mpeg;base64,${base64Audio}`;

    console.log('✅ Music generated successfully');

    return NextResponse.json({
      success: true,
      audioUrl: audioDataUrl,
      prompt,
      duration_ms: clampedDuration,
    });
  } catch (error) {
    console.error('Error generating music:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
