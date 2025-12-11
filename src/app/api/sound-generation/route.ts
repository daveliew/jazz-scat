import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/sound-generation
 *
 * Generates audio using ElevenLabs Text-to-Sound Effects API.
 * Returns audio binary data as a blob.
 *
 * Body: { text: string, duration_seconds?: number, prompt_influence?: number }
 *
 * NOTE: ElevenLabs Agent system prompt should be:
 * "You are a jazz DJ. Ask the user for a vibe. When they answer,
 * call the generate_backing_track tool with a descriptive music prompt."
 */

interface SoundGenerationRequest {
  text: string;
  duration_seconds?: number;
  prompt_influence?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: SoundGenerationRequest = await request.json();
    const { text, duration_seconds = 15, prompt_influence = 0.5 } = body;

    if (!text) {
      return NextResponse.json(
        { error: 'Missing required field: text' },
        { status: 400 }
      );
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ELEVENLABS_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Call ElevenLabs Text-to-Sound Effects API
    const response = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
        duration_seconds: duration_seconds,
        prompt_influence: prompt_influence,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs Sound Generation error:', errorText);
      return NextResponse.json(
        { error: `ElevenLabs API error: ${response.status}` },
        { status: response.status }
      );
    }

    // Return audio binary data
    const audioBuffer = await response.arrayBuffer();

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('Sound generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
