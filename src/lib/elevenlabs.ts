// ElevenLabs API helpers
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

// Server-side client (only use in API routes)
export function getElevenLabsClient() {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY environment variable is not set');
  }

  return new ElevenLabsClient({
    apiKey,
  });
}

// Music generation prompt builder
export function buildMusicPrompt(template: string, genre: string, bpm: number): string {
  return template
    .replace('{genre}', genre)
    .replace('{bpm}', bpm.toString());
}

// Convert audio stream to base64
export async function streamToBase64(
  stream: AsyncIterable<Uint8Array> | ReadableStream<Uint8Array>
): Promise<string> {
  const buffer = await streamToBuffer(stream);
  return buffer.toString('base64');
}

// Convert audio stream to Buffer - handles both AsyncIterable and ReadableStream
export async function streamToBuffer(
  stream: AsyncIterable<Uint8Array> | ReadableStream<Uint8Array>
): Promise<Buffer> {
  const chunks: Uint8Array[] = [];

  // Handle ReadableStream (from fetch or newer APIs)
  if (stream instanceof ReadableStream) {
    const reader = stream.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
  } else {
    // Handle AsyncIterable
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
  }

  return Buffer.concat(chunks);
}
