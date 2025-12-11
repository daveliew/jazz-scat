# Music Genie - Technology Stack

## Core Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 15+ | React framework with App Router |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4.x | Styling |
| @elevenlabs/react | latest | Voice AI integration |

## Why These Choices?

### Next.js 15 (App Router)
- **Server components** for API routes (keeps API key secure)
- **Fast deployment** to Vercel
- **Built-in TypeScript** support
- **Hackathon-friendly** - quick to set up

### ElevenLabs Conversational AI
- **Core hackathon requirement** - showcase ElevenLabs tech
- **Multilingual support** - critical for our use case
- **Low latency** voice responses
- **React SDK** - easy integration

### Tailwind CSS
- **Rapid UI development** - essential for hackathon
- **Mobile-first** - emergency app needs mobile support
- **No config needed** - included with create-next-app

## Architecture

```
┌─────────────────────────────────────────┐
│           Browser (Client)               │
│  ┌─────────────────────────────────┐    │
│  │     React App (page.tsx)        │    │
│  │  - useConversation hook         │    │
│  │  - Voice status management      │    │
│  │  - Emergency UI                 │    │
│  └─────────────────────────────────┘    │
└─────────────────┬───────────────────────┘
                  │ WebSocket/WebRTC
                  ▼
┌─────────────────────────────────────────┐
│         ElevenLabs Conversational AI     │
│  - Speech-to-text                        │
│  - LLM processing                        │
│  - Text-to-speech                        │
│  - Multilingual handling                 │
└─────────────────────────────────────────┘
                  ▲
                  │ Signed URL
┌─────────────────┴───────────────────────┐
│         Next.js API Route               │
│  /api/conversation-token                │
│  - Secure API key handling              │
│  - Token generation                     │
└─────────────────────────────────────────┘
```

## Key Dependencies

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^18.2.0",
    "@elevenlabs/react": "latest"
  }
}
```

## Environment Variables

```bash
# Required
ELEVENLABS_API_KEY=your_api_key
ELEVENLABS_AGENT_ID=your_agent_id
```

## ElevenLabs Agent Configuration

**Model**: Conversational AI with multilingual support

**System Prompt Focus**:
- Emergency response assistant
- Calm, clear communication
- Multilingual understanding
- Information gathering (type, location, safety)

## Performance Considerations

### Latency Optimization
1. **WebSocket connection** (more reliable than WebRTC in demo)
2. **Pre-warming**: Start session on button press, not page load
3. **Signed URL caching**: Avoid unnecessary API calls

### Background Noise
1. Visual indicators when mic is active
2. Consider push-to-talk for noisy environments
3. Clear status feedback to user

## Deployment

**Platform**: Vercel (recommended)
- Zero-config Next.js deployment
- Environment variable management
- Automatic HTTPS

**Alternative**: Any Node.js hosting that supports Next.js
