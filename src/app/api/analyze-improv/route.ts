import { NextRequest, NextResponse } from 'next/server';
import { getElevenLabsClient } from '@/lib/elevenlabs';
import { Genre, LayerType } from '@/types/improv';

interface AnalyzeRequest {
  userAudioBase64: string;
  genre: Genre;
  bpm: number;
  backingTracksInfo: {
    layerType: LayerType;
    hasAudio: boolean;
  }[];
}

export async function POST(request: NextRequest) {
  try {
    const body: AnalyzeRequest = await request.json();
    const { userAudioBase64, genre, bpm, backingTracksInfo } = body;

    if (!userAudioBase64) {
      return NextResponse.json(
        { success: false, error: 'No audio provided' },
        { status: 400 }
      );
    }

    // Convert base64 to buffer for speech-to-text
    const audioBuffer = Buffer.from(userAudioBase64, 'base64');

    // Get ElevenLabs client
    const client = getElevenLabsClient();

    // Transcribe the user's vocal improv
    let transcription = '';
    try {
      const transcriptResponse = await client.speechToText.convert({
        file: new Blob([audioBuffer], { type: 'audio/webm' }),
        modelId: 'scribe_v1',
      });

      // Handle different response formats
      if ('text' in transcriptResponse) {
        transcription = (transcriptResponse as { text: string }).text || '';
      } else if ('transcription' in transcriptResponse) {
        transcription = (transcriptResponse as { transcription: string }).transcription || '';
      }
    } catch (transcriptError) {
      console.warn('Transcription failed, continuing with analysis:', transcriptError);
      transcription = '[Unable to transcribe - vocal sounds detected]';
    }

    // Build context for AI analysis
    const backingContext = backingTracksInfo
      .map((t) => `${t.layerType}: ${t.hasAudio ? 'present' : 'not generated'}`)
      .join(', ');

    // Generate coaching feedback using a prompt-based approach
    // In a full implementation, this would use Claude or another LLM
    // For now, we'll use rule-based feedback based on transcription length and content
    const feedback = generateCoachFeedback({
      transcription,
      genre,
      bpm,
      backingContext,
      audioDuration: estimateAudioDuration(audioBuffer.length),
    });

    return NextResponse.json({
      success: true,
      feedback: feedback.mainFeedback,
      tips: feedback.tips,
      transcription: transcription.substring(0, 100), // Truncate for response
    });
  } catch (error) {
    console.error('Error analyzing improv:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

// Estimate audio duration from buffer size (rough approximation)
function estimateAudioDuration(bufferSize: number): number {
  // WebM audio is roughly 16kbps, so 2KB per second
  return bufferSize / 2000;
}

// Generate coaching feedback (placeholder - would use LLM in production)
function generateCoachFeedback(params: {
  transcription: string;
  genre: Genre;
  bpm: number;
  backingContext: string;
  audioDuration: number;
}): { mainFeedback: string; tips: string[] } {
  const { transcription, genre, bpm, audioDuration } = params;

  const tips: string[] = [];
  let mainFeedback = '';

  // Genre-specific feedback templates
  const genreFeedback: Record<Genre, string> = {
    'doo-wop': 'Great choice going with doo-wop! The classic vocal harmonies really shine when you',
    'gospel': 'Gospel is all about soul and emotion! Your improv shows',
    'barbershop': 'Barbershop is technically demanding! Your attempt at tight harmonies',
    'lo-fi': 'Lo-fi vibes are all about that chill, relaxed feel. Your vocal adds',
    'jazz': 'Jazz scat singing is pure freedom! Your improvisational choices',
    'pop': 'Pop vocals need to be catchy and memorable! Your performance',
  };

  // Analyze transcription content
  const hasWords = transcription.length > 20;
  const isLongEnough = audioDuration > 5;
  const hasVariety = new Set(transcription.toLowerCase().split(' ')).size > 5;

  // Build feedback
  mainFeedback = genreFeedback[genre] || 'Your vocal improv';

  if (hasWords && hasVariety) {
    mainFeedback += ' demonstrate good variety and creativity. You\'re exploring different syllables and sounds which is exactly what improv is about!';
    tips.push('Try varying your pitch more to create melodic interest');
  } else if (hasWords) {
    mainFeedback += ' shows commitment to the style. Keep experimenting with different sounds!';
    tips.push('Experiment with more varied syllables and rhythmic patterns');
  } else {
    mainFeedback += ' is a good starting point. Don\'t be afraid to be bold with your vocal choices!';
    tips.push('Try humming or using simple syllables like "doo", "bah", "dah"');
  }

  // Duration feedback
  if (!isLongEnough) {
    tips.push('Try recording for longer to develop your musical ideas fully');
  }

  // BPM-specific tips
  if (bpm > 120) {
    tips.push(`At ${bpm} BPM, try breaking your phrases into shorter bursts for rhythmic precision`);
  } else if (bpm < 80) {
    tips.push(`At ${bpm} BPM, you have room to add ornaments and vocal embellishments`);
  }

  // General tips
  const generalTips = [
    'Listen to the backing tracks and find the spaces between phrases to add your voice',
    'Match the energy of the backing - if it\'s building, build with it!',
    'Don\'t be afraid to make mistakes - that\'s how you discover new sounds',
    'Try call-and-response: listen, pause, then respond with your voice',
  ];

  // Add a random general tip if we don't have many
  if (tips.length < 3) {
    tips.push(generalTips[Math.floor(Math.random() * generalTips.length)]);
  }

  return {
    mainFeedback,
    tips: tips.slice(0, 4), // Max 4 tips
  };
}
