# Music Genie - Technology Stack

## Core Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.x | React framework with App Router |
| React | 19.x | UI library |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4.x | Styling |
| @elevenlabs/react | 0.12.x | Conversational AI React hook |
| @elevenlabs/elevenlabs-js | 2.27.x | Server-side API client |

## Why These Choices?

### Next.js 16 (App Router)
- **Server components** for API routes (keeps API keys secure)
- **Fast deployment** to Vercel
- **Built-in TypeScript** support
- **Hackathon-friendly** - quick to set up

### ElevenLabs Conversational AI
- **Core hackathon requirement** - showcase ElevenLabs tech
- **Client Tools** - trigger actions from voice commands
- **Low latency** WebRTC voice responses
- **React SDK** - `useConversation` hook for easy integration

### ElevenLabs Sound Generation
- **Text-to-audio** - create backing tracks from prompts
- **15-second loops** - perfect for jam sessions
- **Flexible prompts** - any style, any vibe

### Tailwind CSS 4
- **Rapid UI development** - essential for hackathon
- **Mobile-first** - responsive by default
- **No config needed** - included with create-next-app

## Architecture

```
┌─────────────────────────────────────────────────────┐
│              Browser (Client)                       │
│  ┌───────────────────────────────────────────────┐  │
│  │           React App (page.tsx)                │  │
│  │  - useConversation hook                       │  │
│  │  - clientTools: generate_backing_track        │  │
│  │  - Audio playback via <audio> element         │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────┬───────────────────────────────┘
                      │ WebRTC (voice)
                      ▼
┌─────────────────────────────────────────────────────┐
│         ElevenLabs Conversational AI                │
│  - Speech-to-text (user voice)                      │
│  - LLM processing (DJ persona)                      │
│  - Text-to-speech (DJ response)                     │
│  - Client tool calls → generate_backing_track       │
└─────────────────────────────────────────────────────┘
                      │
        Tool call triggers fetch to:
                      ▼
┌─────────────────────────────────────────────────────┐
│         Next.js API Route                           │
│  POST /api/sound-generation                         │
│  - Receives prompt from client tool                 │
│  - Calls ElevenLabs Sound Generation API            │
│  - Returns audio binary                             │
└─────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│         ElevenLabs Sound Generation API             │
│  - Text-to-sound effects                            │
│  - Returns MP3 audio                                │
│  - 15 second duration for loops                     │
└─────────────────────────────────────────────────────┘
```

## Key Dependencies

```json
{
  "dependencies": {
    "next": "16.0.8",
    "react": "19.2.1",
    "react-dom": "19.2.1",
    "@elevenlabs/react": "^0.12.1",
    "@elevenlabs/elevenlabs-js": "^2.27.0"
  }
}
```

## Environment Variables

```bash
# Required
ELEVENLABS_API_KEY=sk_...      # API key with permissions:
                                # - Conversational AI (convai_write)
                                # - Sound Effects

ELEVENLABS_AGENT_ID=agent_...  # Your Conversational AI agent ID
```

## ElevenLabs Agent Configuration

**Agent ID**: `agent_2001kc6ky17cenhv0twnfva8p869`

**Persona**: Jazz DJ

**Client Tool**: `generate_backing_track`
```json
{
  "name": "generate_backing_track",
  "description": "Generates a backing track based on a music prompt",
  "parameters": {
    "type": "object",
    "properties": {
      "prompt": {
        "type": "string",
        "description": "Music style description (e.g., smooth jazz, upbeat funk)"
      }
    },
    "required": ["prompt"]
  }
}
```

**System Prompt**: Asks user for vibe, calls tool to generate music

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/conversation-token` | GET | Get signed WebRTC URL for agent |
| `/api/sound-generation` | POST | Generate audio from text prompt |
| `/api/generate-layer` | POST | Generate individual backing layer |
| `/api/analyze-improv` | POST | Analyze user recording |

## Layering Architecture

Layering in music means recording multiple audio tracks that play simultaneously on top of each other to create a richer sound.

```
┌─────────────────────────────────────────────┐
│  Backing Track (looping)                    │  ← AI-generated jazz loop
├─────────────────────────────────────────────┤
│  Layer 1: Your vocal melody                 │  ← First recording
├─────────────────────────────────────────────┤
│  Layer 2: Harmony/beatbox                   │  ← Second recording
├─────────────────────────────────────────────┤
│  Layer 3: More vocals                       │  ← Third recording
└─────────────────────────────────────────────┘
           ↓ All play together ↓
```

**The Workflow:**
1. AI generates a backing track from your vibe request
2. Track loops continuously while you record
3. Add layer after layer - melody, harmony, beatbox
4. All layers play simultaneously for a full arrangement

**Technical Implementation:**
- Web Audio API manages multiple audio sources
- Each layer has independent volume/mute controls
- Looping handled via `<audio loop>` attribute
- Recording via MediaRecorder API (30s max)

## Performance Considerations

### Latency Optimization
1. **WebRTC connection** for lowest latency voice
2. **15-second audio** - balances generation time vs loop length
3. **Looping playback** - no gaps between iterations

### Audio Handling
1. **Blob URLs** - efficient in-browser audio playback
2. **HTML Audio element** - simple, reliable playback
3. **Loop attribute** - seamless repeat

## Deployment

**Platform**: Vercel (recommended)
- Zero-config Next.js deployment
- Environment variable management
- Automatic HTTPS
- Edge functions for API routes

**Required Vercel Settings**:
- Add `ELEVENLABS_API_KEY` to environment variables
- Add `ELEVENLABS_AGENT_ID` to environment variables
