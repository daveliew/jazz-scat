# Music Genie - Working Plan

> **Status**: MVP Built - Polish & Demo Prep
> **Hackathon**: ElevenLabs AI Agents Hackathon 2025

## The Problem

Learning to sing, harmonize, or improvise is hard without:
- A band or vocal group to practice with
- A coach to give real-time feedback
- Backing tracks that match your style and tempo

**Result**: Most people never develop their musical potential because practice alone is boring and unproductive.

## Our Solution: Music Genie

An AI-powered jam session that lets you practice like a pro:
1. **Generate AI backing tracks** (bass, harmony, rhythm vocals)
2. **Record your improv** over the tracks
3. **Get AI coach feedback** to improve

No band needed. No expensive coach. Just you and the Genie.

## Core User Flow

```
User wants to practice
    |
Opens Music Genie
    |
Selects genre + BPM (doo-wop, gospel, jazz, etc.)
    |
Generates AI backing tracks (bass, harmony, rhythm)
    |
Plays all tracks together
    |
Records their vocal improv (30 sec max)
    |
AI Coach analyzes and gives feedback + tips
    |
Iterate and improve!
```

## What's Built

### MVP (Complete)

- [x] Landing page with "Start Jamming" CTA
- [x] Genre selector (6 genres: doo-wop, gospel, barbershop, lo-fi, jazz, pop)
- [x] BPM control with genre-appropriate ranges
- [x] AI layer generation (ElevenLabs Music API)
  - Bass line
  - Harmony vocals
  - Rhythm/beatbox
- [x] Audio mixer with volume/mute per layer
- [x] Play all / Stop all controls
- [x] User recording (mic capture, 30s max)
- [x] AI Coach feedback (rule-based analysis)
- [x] New session reset

### ElevenLabs APIs Used

| API | Purpose |
|-----|---------|
| `music.compose()` | Generate backing track layers |
| `speechToText.convert()` | Transcribe user vocals for analysis |

### To Polish

- [ ] Test full flow end-to-end
- [ ] Improve AI coach feedback (consider Claude for deeper analysis)
- [ ] Add looping for backing tracks
- [ ] Mobile responsiveness check
- [ ] Error handling polish

## Future Ideas (Post-Hackathon)

- [ ] Instrument tracks (guitar, piano, drums)
- [ ] Song structure mode (verse, chorus, bridge)
- [ ] Save and share jam sessions
- [ ] Voice-to-MIDI conversion
- [ ] Pitch accuracy scoring
- [ ] Battle mode (compete with friends)

## Technical Architecture

```
/src
├── app/
│   ├── page.tsx              # Landing page
│   ├── improv/page.tsx       # Main jam session
│   └── api/
│       ├── generate-layer/   # ElevenLabs music generation
│       └── analyze-improv/   # Transcription + feedback
├── components/improv/
│   ├── GenreSelector.tsx     # Genre + BPM controls
│   ├── LayerMixer.tsx        # Track layer controls
│   ├── TrackLayer.tsx        # Individual layer UI
│   └── CoachFeedback.tsx     # AI feedback display
├── lib/
│   ├── elevenlabs.ts         # API client + helpers
│   └── audio-mixer.ts        # Web Audio API mixer
└── types/
    └── improv.ts             # TypeScript types
```

## Demo Script

> "Ever wanted to sing harmony but had no one to practice with?"

1. Open Music Genie - see the landing page
2. Click "Start Jamming"
3. Pick a genre (Doo-Wop for demo appeal)
4. Generate each backing layer - show AI creating bass, harmony, rhythm
5. Hit "Play All" - hear the full backing track
6. Record a quick vocal improv
7. Click "Get Feedback" - AI coach gives tips
8. "Now anyone can practice like a pro, anytime, anywhere."

## Judging Criteria Alignment

| Criteria | Our Strategy | Confidence |
|----------|-------------|------------|
| Working Prototype | Full flow works end-to-end | High |
| Technical Complexity | Music AI + Audio mixing + Analysis | High |
| Innovation | AI band-in-a-box for practice | High |
| Real-World Impact | Democratize music education | High |
| ElevenLabs Integration | Core to product (Music + STT) | Very High |

## Quick Commands

```bash
# Dev server
npm run dev

# Type check
npm run typecheck

# Lint
npm run lint
```
