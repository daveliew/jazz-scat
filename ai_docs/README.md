# Music Genie - AI Documentation

## Quick Navigation

| Document | Purpose |
|----------|---------|
| [PLAN.md](./PLAN.md) | Working plan, features, & demo script |
| [TECH_STACK.md](./TECH_STACK.md) | Technology choices & rationale |

## Project Status

**Hackathon**: ElevenLabs AI Agents Hackathon 2025
**Stage**: MVP + Voice DJ Integration

## Current Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Frontend (Next.js)                │
├─────────────────────────────────────────────────────┤
│  page.tsx          │  Voice DJ with clientTools     │
│  improv/page.tsx   │  Layer-by-layer jam session    │
└─────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│                   API Routes                        │
├─────────────────────────────────────────────────────┤
│  /api/conversation-token  │  WebRTC auth for agent  │
│  /api/sound-generation    │  Text-to-audio tracks   │
│  /api/generate-layer      │  Individual layer gen   │
│  /api/analyze-improv      │  Vocal feedback         │
└─────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│               ElevenLabs APIs                       │
├─────────────────────────────────────────────────────┤
│  Conversational AI   │  Voice DJ persona           │
│  Sound Generation    │  Backing track creation     │
│  Client Tools        │  generate_backing_track     │
└─────────────────────────────────────────────────────┘
```

## Key Files

| File | Description |
|------|-------------|
| `src/app/page.tsx` | Main conversational DJ interface |
| `src/lib/audio-mixer.ts` | Web Audio API mixer for playback |
| `src/types/improv.ts` | Genre configs, layer types |

## ElevenLabs Agent Config

The agent (`agent_7201kc6j4ttme9g9afdw0arpene8`) is configured with:
- **Persona**: Jazz DJ
- **Client Tool**: `generate_backing_track`
- **System Prompt**: Asks for vibe, calls tool to generate music
