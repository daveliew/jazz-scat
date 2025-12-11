# Music Genie - Working Plan

> **Status**: MVP Complete - Voice DJ Integration
> **Hackathon**: ElevenLabs AI Agents Hackathon 2025

## The Problem

Learning to sing, harmonize, or improvise is hard without:
- A band or vocal group to practice with
- A coach to give real-time feedback
- Backing tracks that match your style and tempo

**Result**: Most people never develop their musical potential because practice alone is boring and unproductive.

## Our Solution: Music Genie

An AI-powered jam session with a **conversational DJ**:
1. **Talk to your AI DJ** - describe the vibe you want
2. **AI generates backing tracks** - custom audio from your description
3. **Loop and jam** - practice over the generated track
4. **Iterate** - ask for changes, try new styles

No band needed. No expensive coach. Just you and the Genie.

## Core User Flow

```
User clicks "Start Jamming"
    │
    ▼
Voice DJ greets: "What vibe are you feeling?"
    │
    ▼
User speaks: "Something smooth and jazzy"
    │
    ▼
DJ calls generate_backing_track tool
    │
    ▼
Sound Generation API creates 15s audio
    │
    ▼
Track plays on loop - user jams along!
    │
    ▼
User can request changes or new tracks
```

## What's Built

### Voice DJ (Main Page) ✅

- [x] Conversational AI DJ persona
- [x] Voice input/output via WebRTC
- [x] `generate_backing_track` client tool
- [x] Sound Generation API integration
- [x] Looping audio playback
- [x] Session log display
- [x] Visual state indicators (orb animation)

### Layer-by-Layer Mode (/improv) ✅

- [x] Genre selector (6 genres)
- [x] BPM control with genre-appropriate ranges
- [x] Individual layer generation (bass, harmony, rhythm)
- [x] Audio mixer with volume/mute per layer
- [x] User recording (30s max)
- [x] AI Coach feedback

### ElevenLabs APIs Used

| API | Purpose |
|-----|---------|
| Conversational AI | Voice DJ that interprets requests |
| Sound Generation | Creates backing tracks from text prompts |
| Client Tools | `generate_backing_track` - triggers audio generation |

### To Polish

- [ ] Test full Voice DJ flow end-to-end
- [ ] Handle generation errors gracefully
- [ ] Add stop/restart track controls
- [ ] Mobile responsiveness check
- [ ] Demo video recording

## Future Ideas (Post-Hackathon)

- [ ] Multiple concurrent tracks (layering)
- [ ] Save and share jam sessions
- [ ] Pitch/tempo adjustment
- [ ] Voice coaching feedback
- [ ] Battle mode (compete with friends)

## Technical Architecture

```
/src
├── app/
│   ├── page.tsx              # Voice DJ (main interface)
│   ├── improv/page.tsx       # Layer-by-layer mode
│   └── api/
│       ├── conversation-token/   # WebRTC auth
│       ├── sound-generation/     # Text-to-audio
│       ├── generate-layer/       # Individual layers
│       └── analyze-improv/       # Vocal feedback
├── components/improv/
│   ├── GenreSelector.tsx
│   ├── LayerMixer.tsx
│   ├── TrackLayer.tsx
│   ├── VoiceCoach.tsx
│   └── CoachFeedback.tsx
├── lib/
│   ├── elevenlabs.ts         # API helpers
│   └── audio-mixer.ts        # Web Audio API
└── types/
    └── improv.ts             # TypeScript types
```

## Demo Script

> "Ever wanted to jam but had no band to practice with?"

1. Open Music Genie - see the landing page
2. Click "Start Jamming" - DJ greets you
3. Say: *"Give me something smooth and jazzy"*
4. Watch the DJ respond and generate a track
5. Track loops automatically - sing/hum along!
6. Say: *"Make it more upbeat"* - new track generates
7. "Now anyone can jam with AI, anytime, anywhere."

## Judging Criteria Alignment

| Criteria | Our Strategy | Confidence |
|----------|-------------|------------|
| Working Prototype | Voice DJ flow works end-to-end | High |
| Technical Complexity | Conversational AI + Sound Gen + Client Tools | High |
| Innovation | AI DJ that creates music on demand | Very High |
| Real-World Impact | Democratize music practice | High |
| ElevenLabs Integration | Core to product (ConvAI + Sound Gen) | Very High |

## Quick Commands

```bash
# Dev server
npm run dev

# Lint
npm run lint

# Test agent connection
npm run test:agent
```
