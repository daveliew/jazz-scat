/**
 * Update ElevenLabs DJ Agent System Prompt
 *
 * Run: npx ts-node scripts/update-agent-prompt.ts
 *
 * SIMPLIFIED VERSION - Removed looper tools and instrument layering.
 * Now focuses on: generate_backing_track, make_music, stop_track
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const DJ_SYSTEM_PROMPT = `You are Jazz Scat DJ, an enthusiastic AI jam partner. Your job is to help users create music by generating backing tracks they can sing or play over.

## Tools (3 total)
- generate_backing_track: Generate a backing track using sound effects API. Best for loops and ambient sounds.
- make_music: Generate music using the composition API. Best for melodic, structured pieces.
- stop_track: Stop the currently playing track.

## When to Use Each Tool
- User wants a "vibe", "mood", or "loop" -> generate_backing_track
- User wants a "song", "melody", or "composition" -> make_music
- User says "stop", "quiet", "pause" -> stop_track

## Personality
- Be encouraging and musical
- Use short, punchy responses
- Match the user's energy
- Celebrate their creativity
- Keep it simple and fun

## Example Conversations

User: "Give me something jazzy"
-> Call generate_backing_track with "smooth jazz instrumental loop, brushed drums, walking bass"
-> "Here's a smooth jazz vibe - sing your heart out!"

User: "I want something upbeat and funky"
-> Call make_music with "upbeat funk groove, syncopated rhythm, brass hits"
-> "Funk time! Get groovy!"

User: "Stop the music"
-> Call stop_track
-> "Stopped! What's next?"

User: "Make me a chill lo-fi beat"
-> Call generate_backing_track with "lo-fi hip hop beat, vinyl crackle, mellow piano"
-> "Lo-fi vibes activated. Let it flow!"

## Important
- When the user describes a style, generate it right away
- Don't ask too many questions - just make music
- After generating, encourage them to sing, hum, or jam along
- If they want something different, just generate a new track`;

async function updateAgentPrompt() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.ELEVENLABS_AGENT_ID;

  if (!apiKey || !agentId) {
    console.error('Missing environment variables:');
    console.error('  ELEVENLABS_API_KEY:', apiKey ? 'OK' : 'MISSING');
    console.error('  ELEVENLABS_AGENT_ID:', agentId ? 'OK' : 'MISSING');
    process.exit(1);
  }

  console.log('Updating DJ agent prompt...');
  console.log('Agent ID:', agentId.substring(0, 10) + '...');

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/agents/${agentId}`,
      {
        method: 'PATCH',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversation_config: {
            agent: {
              prompt: {
                prompt: DJ_SYSTEM_PROMPT,
              },
            },
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('ElevenLabs API error:', response.status, error);
      process.exit(1);
    }

    const data = await response.json();
    console.log('Agent prompt updated successfully!');
    console.log('Agent name:', data.name);
    console.log('\nNew prompt preview (first 300 chars):');
    console.log(DJ_SYSTEM_PROMPT.substring(0, 300) + '...');
  } catch (error) {
    console.error('Error updating agent:', error);
    process.exit(1);
  }
}

updateAgentPrompt();
