# VoiceLifeline - Working Plan

> **Status**: Idea still evolving - this document captures our thinking

## The Problem

Language barriers in emergencies can be fatal. When someone is in distress:
- They may not speak the local language
- Stress impairs communication ability
- Emergency services may not understand them
- Critical information gets lost in translation

**Real-world example**: Hong Kong fire (2025) - victims struggled to communicate with emergency responders due to language barriers.

## Our Solution: VoiceLifeline

A voice-first emergency communication tool that:
1. Accepts voice input in ANY language
2. AI assistant gathers critical emergency info
3. Provides calm, clear guidance
4. Can relay information to emergency services

## Core User Flow

```
User in distress
    ↓
Opens VoiceLifeline (mobile web)
    ↓
Presses "GET HELP" button
    ↓
Speaks in their native language
    ↓
AI asks: What's happening? Where are you? Are you safe?
    ↓
AI provides immediate safety guidance
    ↓
Information ready for emergency services
```

## Ideas We're Exploring

### MVP (Hackathon)
- [x] Voice conversation with ElevenLabs AI
- [x] Multilingual support
- [x] Emergency-focused UI
- [ ] Summary generation for responders

### Future Possibilities
- [ ] SMS/location sharing to emergency contacts
- [ ] Integration with local emergency services
- [ ] Offline mode for disaster scenarios
- [ ] Wearable device integration
- [ ] Multi-party calls (victim + responder + translator)

## Open Questions

1. **Target users**: Tourists? Migrant workers? Elderly?
2. **Distribution**: How do people find this in an emergency?
3. **Trust**: How do we establish credibility quickly?
4. **Offline**: What happens without internet?

## Judging Criteria Alignment

| Criteria | Our Strategy | Confidence |
|----------|-------------|------------|
| Working Prototype | Focus on ONE flow, polish it | High |
| Technical Complexity | Voice AI + multilingual + real-time | Medium-High |
| Innovation | Emergency + language barrier = novel | High |
| Real-World Impact | Life-saving potential | Very High |
| Theme Alignment | Conversational agent is core | High |

## Demo Script

> "Imagine you're traveling in a foreign country. There's a fire in your building. You don't speak the language. What do you do?"

1. Open VoiceLifeline on your phone
2. Press the big red "GET HELP" button
3. Speak in YOUR language: "There's a fire! I'm trapped!"
4. The AI calmly asks for your location, if you're safe
5. Provides immediate guidance while help is coordinated

## Next Steps

- [ ] Configure ElevenLabs agent with emergency prompt
- [ ] Test multilingual conversation flow
- [ ] Add conversation summary feature
- [ ] Polish mobile experience
- [ ] Prepare demo environment
