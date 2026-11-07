# Microphone handoff and iPhone playback volume

Reported on an iPhone 13 Pro Max: after several phrases, English World's recorded voice becomes roughly 80–90% quieter and stays quiet. The browser and iOS version were not confirmed. The app does not lower the voice player's volume during a conversation; its automatic ducking affects ambient sound only.

The likely failure is a native capture/playback route left behind by speech recognition. This is an inference, not a measured diagnosis from the affected phone. WebKit documents persistent lower playback volume after microphone use in [bug 236219](https://bugs.webkit.org/show_bug.cgi?id=236219). Its [category override implementation](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/platform/audio/AudioSession.cpp) also ignores assigning the same override again, so a DOM value of `playback` alone does not prove that reapplying it repaired the native session.

`src/convo/audioFocus.ts` owns capture leases. Playback waits for recognition's actual `onend`, with the existing 1.2-second bound for engines that omit it. The timeout releases the wait; it no longer consumes a later real end event. That late event can still restore playback, provided no newer recognizer owns audio.

After capture, route recovery clears an existing playback override through `auto` before restoring `playback`. The player requests this synchronously immediately before `play()` and once at the recording's first `playing` event, covering initialization and media-download delays. Buffering notifications do not repeatedly reset it. These operations do not pause, seek, reload or replace the player, raise gain, or silently switch recorded voices to browser speech. The gesture-authorized media element and explicit failure/retry behavior remain in place.

Capture stays on `auto`. Explicit `play-and-record` has helped some getUserMedia cases, but recent SpeechRecognition reports also describe recognition failures with that setting ([bug 321436](https://bugs.webkit.org/show_bug.cgi?id=321436)). The playback fix does not change recognition's capture category.

Checks:

- Relevant checks for this audio-only change: `npm run typecheck`, `npm test`, `npm run build`.
- `npm run check:content` is the separate full dialogue/fuzz sweep. It was stopped after partial successful output because this change does not modify content; it is not recorded as a full pass.
- `tests/audio-focus.test.ts` models a stale native category behind an unchanged DOM value, a late real end after timeout, and a newer capture that must keep ownership.
- `tests/audio.test.ts` exercises repeated captures, delayed initialization/media start, unchanged volume and playback position, cancellation, retries and the same persistent player.
- `tests/browser/mobile-audio.mjs` uses a real repository recording and real media decoding in Chromium and WebKit, online and offline. It plays three consecutive recordings after one tap with two simulated recognition handoffs, including an end later than the fallback. Separate cases model a late native route change while leaving media playback real.

Desktop WebKit with a mobile viewport cannot measure the iPhone's physical speaker route or loudness. The affected phone still needs an audible check across several spoken answers; the automated results establish lifecycle behavior and real recording completion, not a physical-device volume measurement.
