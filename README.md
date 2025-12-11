# Music Genie

> Your AI jam partner - practice vocals anytime, with anyone... even when you're alone.

**ElevenLabs AI Agents Hackathon 2025**

## The Problem

Learning to sing, harmonize, or improvise is hard without:
- A band or vocal group to practice with
- A coach to give real-time feedback
- Backing tracks that match your style and tempo

**Result**: Most people never develop their musical potential because practicing alone is boring and unproductive.

## Our Solution

Music Genie is an AI-powered jam session that lets you practice like a pro:

1. **Talk to your AI DJ** - Tell it what vibe you want
2. **AI generates backing tracks** - Bass, harmony, rhythm vocals on demand
3. **Record your improv** over the tracks
4. **Get real-time coaching** to improve

No band needed. No expensive coach. Just you and the Genie.

## Features

| Feature | Description |
|---------|-------------|
| Conversational DJ | Voice-powered AI that asks what you want to jam |
| Sound Generation | Creates custom backing tracks from text prompts |
| Multi-Genre Support | Doo-wop, Gospel, Barbershop, Lo-Fi, Jazz, Pop |
| Layer Mixer | Control volume/mute for each generated track |
| Recording | Capture your vocal improv (30s max) |
| Loop Playback | Practice over looping backing tracks |

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Add your ElevenLabs API key and Agent ID

# Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

```bash
ELEVENLABS_API_KEY=sk_...        # Your ElevenLabs API key
ELEVENLABS_AGENT_ID=agent_...    # Your Conversational AI agent ID
```

**Required API Permissions**:
- Conversational AI (convai_write)
- Sound Effects (for backing track generation)

## ElevenLabs APIs Used

| API | Purpose |
|-----|---------|
| Conversational AI | Voice DJ that interprets user requests |
| Sound Generation | Creates backing track audio from prompts |
| Client Tools | Triggers music generation from conversation |

## Architecture

```
src/
├── app/
│   ├── page.tsx                    # Main conversational DJ interface
│   ├── improv/page.tsx             # Layer-by-layer jam session
│   └── api/
│       ├── conversation-token/     # ElevenLabs WebRTC auth
│       ├── sound-generation/       # Text-to-audio backing tracks
│       ├── generate-layer/         # Individual layer generation
│       └── analyze-improv/         # Vocal analysis feedback
├── components/improv/
│   ├── GenreSelector.tsx           # Genre + BPM controls
│   ├── LayerMixer.tsx              # Track layer controls
│   ├── TrackLayer.tsx              # Individual layer UI
│   ├── VoiceCoach.tsx              # AI voice coaching
│   └── CoachFeedback.tsx           # Feedback display
├── lib/
│   ├── elevenlabs.ts               # API client helpers
│   └── audio-mixer.ts              # Web Audio API mixer
└── types/
    └── improv.ts                   # TypeScript types
```

## How It Works

```
User: "Give me something chill and jazzy"
           │
           ▼
   ┌───────────────────┐
   │  ElevenLabs Agent │  (Conversational AI)
   │    "DJ Persona"   │
   └─────────┬─────────┘
             │ calls client tool
             ▼
   ┌───────────────────┐
   │ generate_backing_ │  (Client Tool)
   │      track        │
   └─────────┬─────────┘
             │ POST /api/sound-generation
             ▼
   ┌───────────────────┐
   │  Sound Generation │  (ElevenLabs API)
   │       API         │
   └─────────┬─────────┘
             │ returns audio
             ▼
   ┌───────────────────┐
   │   Audio Playback  │  (Web Audio API)
   │     (looping)     │
   └───────────────────┘
```

## Tech Stack

- **Framework**: Next.js 16 + React 19
- **Styling**: Tailwind CSS 4
- **Voice AI**: ElevenLabs Conversational AI
- **Audio**: ElevenLabs Sound Generation + Web Audio API
- **Language**: TypeScript

## Scripts

```bash
npm run dev       # Start development server
npm run build     # Production build
npm run lint      # Run ESLint
npm run test:agent # Test ElevenLabs agent connection
```

## Demo Flow

1. Open Music Genie
2. Click "Start Jamming"
3. Tell the DJ what vibe you want: *"Something smooth and jazzy"*
4. AI generates a backing track automatically
5. Track loops - sing along!
6. End session when done

## Team

Built for ElevenLabs AI Agents Hackathon 2025

## License

MIT
