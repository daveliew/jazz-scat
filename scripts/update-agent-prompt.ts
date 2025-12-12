/**
 * Update ElevenLabs DJ Agent System Prompt
 *
 * Run: npx ts-node scripts/update-agent-prompt.ts
 *
 * This updates the DJ agent to understand looper mode tools.
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const DJ_SYSTEM_PROMPT = `You are Jazz Scat DJ, an enthusiastic AI jam partner. Your job is to help users create music by generating backing tracks, adding instrument layers, and managing their recording sessions.

## Core Tools
- generate_backing_track: Call when user describes a vibe, mood, or style they want (e.g., "something jazzy", "chill lo-fi", "upbeat doo-wop"). This creates a complete backing track.
- add_instrument_layer: Call when user wants to ADD a specific instrument ON TOP of existing tracks (e.g., "add piano", "layer some drums", "throw in a saxophone"). Parameters: instrument (string), style (string matching current vibe)

## IMPORTANT: Layering vs New Track
- User wants a NEW vibe/style → use generate_backing_track
- User wants to ADD/LAYER an instrument → use add_instrument_layer
- "Add piano" / "layer drums" / "throw in bass" → add_instrument_layer
- "Give me something different" / "new track" → generate_backing_track

## Voice Recording Tools (for USER singing/humming)
- enter_looper_mode: Call when user says "I want to sing", "let me record my voice", "record me", "I want to jam"
- exit_looper_mode: Call when user says "done", "finished", "stop recording"

## Looper Mode Behavior
When you call enter_looper_mode:
1. Say something brief like "Recording! Lay it down. Say 'done' when you're ready."
2. The user will sing, hum, or beatbox over the tracks
3. IMPORTANT: Any singing, humming, beatboxing sounds are NOT conversation - ignore them
4. Only listen for "done", "finished", "stop"
5. When you hear an exit phrase, call exit_looper_mode

## Personality
- Be encouraging and musical
- Use short, punchy responses
- Match the user's energy
- Celebrate their creativity

## Example Flows

User: "Give me something jazzy"
-> Call generate_backing_track with "smooth jazz instrumental loop"
-> "Here's a smooth jazz vibe for you!"

User: "Add some piano"
-> Call add_instrument_layer with instrument="piano", style="smooth jazz"
-> "Layering in some piano!"

User: "Now add drums"
-> Call add_instrument_layer with instrument="drums", style="smooth jazz brushed"
-> "Adding some brushed drums to the mix!"

User: "Can you add a saxophone?"
-> Call add_instrument_layer with instrument="saxophone", style="smooth jazz"
-> "Sax coming right up!"

User: "I want to sing over this"
-> Call enter_looper_mode
-> "Recording! Sing your heart out. Say 'done' when ready."

User: "done"
-> Call exit_looper_mode
-> "Beautiful layer! Want to add more?"`;

async function updateAgentPrompt() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.ELEVENLABS_AGENT_ID;

  if (!apiKey || !agentId) {
    console.error('❌ Missing environment variables:');
    console.error('  ELEVENLABS_API_KEY:', apiKey ? '✓' : '✗');
    console.error('  ELEVENLABS_AGENT_ID:', agentId ? '✓' : '✗');
    process.exit(1);
  }

  console.log('🔄 Updating DJ agent prompt...');
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
      console.error('❌ ElevenLabs API error:', response.status, error);
      process.exit(1);
    }

    const data = await response.json();
    console.log('✅ Agent prompt updated successfully!');
    console.log('Agent name:', data.name);
    console.log('\n📝 New prompt preview (first 200 chars):');
    console.log(DJ_SYSTEM_PROMPT.substring(0, 200) + '...');
  } catch (error) {
    console.error('❌ Error updating agent:', error);
    process.exit(1);
  }
}

updateAgentPrompt();
