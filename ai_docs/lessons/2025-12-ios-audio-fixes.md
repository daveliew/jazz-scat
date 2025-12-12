# iOS Audio Playback Fixes

**Date**: December 2025
**Context**: Jazz Scat hackathon project - ElevenLabs voice agent with audio playback

## Problem

Voice agent connects fine on iOS, but when it triggers `generate_backing_track` via clientTools, the audio won't play. Agent returns "something went wrong" error.

**Root Cause**: iOS Safari/WebKit blocks `audio.play()` unless it's directly triggered by a user gesture. Our play call was inside:
1. A clientTools callback (not a user gesture)
2. After an async API call (even further from user gesture)

## Key Insight

**ALL iOS browsers use WebKit** (Apple App Store requirement). Chrome, Firefox, Brave on iOS are all Safari under the hood with the same audio restrictions.

## Solution Pattern

### 1. Audio Unlock on First Tap

```typescript
const unlockAudioForIOS = useCallback(async () => {
  if (isAudioUnlocked) return;

  if (backingTrackRef.current) {
    // Tiny silent MP3 (base64 encoded)
    const silentAudio = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0U...';
    backingTrackRef.current.src = silentAudio;
    backingTrackRef.current.volume = 0;
    try {
      await backingTrackRef.current.play();
      backingTrackRef.current.pause();
      backingTrackRef.current.volume = 1;
      backingTrackRef.current.src = '';
      setIsAudioUnlocked(true);
    } catch (e) {
      // Not iOS or already unlocked
    }
  }
}, [isAudioUnlocked]);
```

### 2. Call Unlock in User Gesture Handler

```typescript
const startConversation = useCallback(async () => {
  // Unlock audio for iOS BEFORE anything else
  await unlockAudioForIOS();

  // Then proceed with mic access and WebRTC...
}, [unlockAudioForIOS]);
```

### 3. Graceful Fallback with Manual Play Button

```typescript
try {
  await audioElement.play();
} catch (playError) {
  // iOS blocked autoplay - show manual button
  setNeedsManualPlay(true);
  return 'Track ready! Tap to play.';
}
```

### 4. Manual Play Button in UI

```tsx
{needsManualPlay && backingTrackUrl && (
  <button onClick={async () => {
    await backingTrackRef.current.play();
    setNeedsManualPlay(false);
    setIsPlaying(true);
  }}>
    Tap to Play Track
  </button>
)}
```

## Audit Checklist

- [ ] `AudioContext` created/resumed inside user gesture handler
- [ ] Audio unlock function called on first tap (before WebRTC)
- [ ] **iOS detection** before running unlock (skip on desktop!)
- [ ] All `audio.play()` calls wrapped in try/catch
- [ ] Fallback UI exists for blocked autoplay
- [ ] MediaRecorder uses codec fallback for iOS (`audio/mp4` preferred)

## Regression Warning: Don't Clear src on Desktop

**Issue Found**: Setting `backingTrackRef.current.src = ''` after unlock puts the audio element in an invalid state on desktop browsers, causing subsequent `play()` calls to fail.

**Fix**: Detect iOS and skip unlock entirely on desktop:

```typescript
const isIOSDevice = () => {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

const unlockAudioForIOS = useCallback(async () => {
  if (isAudioUnlocked) return;

  // Skip on desktop - they don't need unlock
  if (!isIOSDevice()) {
    setIsAudioUnlocked(true);
    return;
  }

  // ... iOS unlock logic
}, [isAudioUnlocked]);
```

## Memory Triggers

- **"iOS audio needs user gesture"** - Can't autoplay, even after user spoke to agent
- **"iOS Chrome = Safari in disguise"** - All iOS browsers use WebKit
- **"Unlock first, connect second"** - Silent audio play before WebRTC
- **"Try/catch every play()"** - Always have fallback for iOS
- **"Detect iOS before unlock"** - Desktop doesn't need unlock, can cause regressions

## Files Modified

- `src/app/page.tsx` - Main Voice DJ page with iOS fixes

## References

- [WebKit Audio Policy](https://webkit.org/blog/6784/new-video-policies-for-ios/)
- [MDN Autoplay Guide](https://developer.mozilla.org/en-US/docs/Web/Media/Autoplay_guide)
