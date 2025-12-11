/**
 * ElevenLabs Agent Test Script
 * Usage: npm run test:agent ["optional custom message"]
 */
import WebSocket from 'ws';
import { config } from 'dotenv';

// Load .env.local (Next.js convention)
config({ path: '.env.local' });

const agentId = process.env.ELEVENLABS_AGENT_ID;
const testMessage = process.argv[2] || 'Hello! Tell me about yourself.';

if (!agentId) {
  console.error('Error: ELEVENLABS_AGENT_ID not set in .env.local');
  process.exit(1);
}

console.log('Connecting to agent...');
console.log('Agent ID:', agentId);
console.log('Test message:', testMessage);
console.log('---');

const ws = new WebSocket(
  `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${agentId}`
);

ws.on('open', () => {
  console.log('Connected!');

  // Init conversation
  ws.send(JSON.stringify({
    type: 'conversation_initiation_client_data',
    user_id: 'test-user-cli'
  }));

  // Send test message after short delay to ensure init completes
  setTimeout(() => {
    ws.send(JSON.stringify({
      type: 'user_message',
      user_message: { text: testMessage }
    }));
  }, 500);
});

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());

  switch (msg.type) {
    case 'conversation_initiation_metadata':
      console.log('Conversation ID:', msg.conversation_id);
      break;
    case 'agent_response':
      console.log('\nAgent:', msg.agent_response_event?.agent_response);
      break;
    case 'user_transcript':
      console.log('User (transcribed):', msg.user_transcription_event?.user_transcript);
      break;
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong', event_id: msg.ping_event.event_id }));
      break;
    case 'audio':
      // Skip audio events for text-only test
      process.stdout.write('.');
      break;
    default:
      console.log('Event:', msg.type);
  }
});

ws.on('error', (err) => {
  console.error('WebSocket Error:', err.message);
  process.exit(1);
});

ws.on('close', (code, reason) => {
  console.log('\nConnection closed (code:', code, ')');
  process.exit(0);
});

// Auto-close after 15 seconds
setTimeout(() => {
  console.log('\n\nTest complete (timeout)');
  ws.close();
}, 15000);
