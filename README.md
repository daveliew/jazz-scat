# Jazz Scat

> Your AI jam partner - practice vocals anytime, with anyone... even when you're alone.

🥈 **2nd Place** - [ElevenLabs Worldwide Hackathon](https://singapore.aitinkerers.org/p/elevenlabs-global-hackathon-singapore) | Singapore | Dec 11, 2025

## The Problem

Learning to sing, harmonize, or improvise is hard without:
- A band or vocal group to practice with
- A coach to give real-time feedback
- Backing tracks that match your style and tempo

**Result**: Most people never develop their musical potential because practicing alone is boring and unproductive.

## Our Solution

Jazz Scat is an AI-powered jam session that lets you practice like a pro:

1. **Talk to your AI DJ** - Tell it what vibe you want
2. **AI generates backing tracks** - Bass, harmony, rhythm vocals on demand
3. **Record your improv** over the tracks
4. **Get real-time coaching** to improve

No band needed. No expensive coach. Just you and Jazz Scat.

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
│   ├── GenreSelector.tsx           # Genre + BPM + Metronome
│   ├── LayerMixer.tsx              # Track layer controls
│   ├── TrackLayer.tsx              # Individual layer UI
│   ├── Metronome.tsx               # Visual + audio beat indicator
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

## Layering

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

## Post-Hackathon Improvements

Built after the demo to enhance the experience:

| Feature | Description |
|---------|-------------|
| Two-Column Layout | Music controls (left) + Coaching sidebar (right, sticky) |
| Metronome | Visual + audio beat indicator synced to BPM |
| Help Tooltip | Radix UI tooltip with quick-start instructions |
| Live Transcription | Real-time speech-to-text in session log |
| Multi-Agent Support | Separate Voice DJ and Voice Coach agents |
| Session Logging | Auto-scroll with live indicator |
| iOS Compatibility | Audio unlock fixes for mobile Safari |

## Tech Stack

- **Framework**: Next.js 15 + React 18
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI
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

1. Open Jazz Scat
2. Click "Start Jamming"
3. Tell the DJ what vibe you want: *"Something smooth and jazzy"*
4. AI generates a backing track automatically
5. Track loops - sing along!
6. End session when done

## Team

Built at [ElevenLabs Worldwide Hackathon](https://singapore.aitinkerers.org/p/elevenlabs-global-hackathon-singapore) - Singapore edition.

🎉 **2nd Place** thanks to great teamwork and good vibes!

## License

MIT
