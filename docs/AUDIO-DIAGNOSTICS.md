# Physical iPhone audio comparison

This is an opt-in diagnostic, not a fix for the reported drop in audible volume.
Open the authenticated game with `?audioDebug=1`. The course forwards its query,
so the course link is `/zaisti?audioDebug=1`. No diagnostic controls or event
collection are enabled without that exact flag.

## Test on the phone

1. Use the built-in speaker and keep the phone's volume unchanged. Note the iOS
   version, browser, and whether headphones/Bluetooth were connected. Do not use
   iPhone Mirroring or start another microphone recording on the test phone.
2. Open **Garso patikra** while the first recorded NPC turn is still playing.
   This pauses automatic listening before its usual post-turn start. Wait for
   the NPC to finish inside the panel, choose **Paruošti tą patį įrašą**, then
   play **A** and **B**. Record what you hear under **Prieš mikrofoną**.
3. Close the panel and tap the game's microphone once. After replying, if the
   voice becomes quiet, tap **Garsas pritilo**. This marks the observed failure
   before stopping automatic listening. Let any current NPC turn finish.
4. Play **A** and **B** again under **Po mikrofono**. Do not prepare a new clip:
   the original bytes and requested volume remain frozen across game turns.
   Compare each method with its own before-microphone result. Equal requested
   volume does not prove equal hardware gain between the methods on iOS.
5. Download the report. It stays on the device until the user chooses to share it.
   Closing the panel stops diagnostic playback. Resume the microphone manually.

An additional typed-only run, with automatic listening disabled, distinguishes a
capture-triggered issue from ordinary playback. If one method changes the route
and repairs the other, repeat in a fresh browser session with B played before A.
Record whether the quiet voice seems to come from the earpiece or main speaker;
browser properties cannot establish that physical route.

## Evidence and limits

The report retains at most 400 event records. It contains monotonic event timings,
recognizer and lease IDs, safe result slot counts, audio-session request/readback
and errors, media/context states, recording hash IDs, requested gain and explicit
listening results. It excludes speech recordings, transcript text, account IDs,
page URLs, signed audio URLs and file tokens. There is no upload endpoint and no
additional `getUserMedia` capture.

`recognition.audioend` means the browser reports capture finished;
`recognition.end` means the recognition service disconnected. The app's bounded
handoff logs `timeout-unknown` or `abort-error-unknown` when it proceeds without an
end event. These are distinct facts; none proves the physical speaker route.
Diagnostics observe late capture events for a bounded period after recognizer
release without extending the app's capture lease.

The comparison uses one existing protected recording and its normal cache/token
flow. Preparing decodes offline. A reuses the game's HTMLAudioElement; B plays the
same decoded recording through an AudioBufferSourceNode and the existing live
AudioContext. Both request the frozen volume at playback rate 1. Neither changes
the audio-session category, submits an answer, resolves a game playback request,
or changes learning progress. Output is canceled on replacement, close, page
hide/unmount, or new normal playback; stale decoding/resume cannot start later.

Desktop Chromium/WebKit checks validate decoding, event ordering, ownership,
privacy and cancellation. They cannot verify the iPhone's acoustic loudness.
Apple's [audio hardware guide](https://developer.apple.com/library/archive/documentation/Audio/Conceptual/AudioSessionProgrammingGuide/OptimizingForDeviceHardware/OptimizingForDeviceHardware.html)
also describes Simulator's limitations around audio-session interaction and route
changes. Use a physical phone for this report.

Safari's [USB Web Inspector](https://webkit.org/web-inspector/enabling-web-inspector/)
can inspect the phone without Xcode or routing its speaker to the Mac. Enable
Web Inspector under the iPhone's Safari advanced settings, connect/trust the Mac,
and select the phone's Safari page in the Mac Safari Develop menu.

## Why compare output methods?

WebKit [bug 236219](https://bugs.webkit.org/show_bug.cgi?id=236219) remains open for
post-capture volume loss; its March 2026 report says microphone-state overrides
still did not solve the problem. A June 2026 firsthand report in
[Web Speech issue 96](https://github.com/WebAudio/web-speech-api/issues/96) says
Web Audio output avoided a related HTMLAudio/native-recognition conflict. That
supports an A/B test, not a claim that changing playback backends fixes this app.
The [Web Speech event specification](https://webaudio.github.io/web-speech-api/#speechreco-events)
defines the capture-end and service-end distinction used in the report.

## Focused checks

```sh
npm run typecheck
npx vitest run --configLoader runner tests/audio-diagnostics.test.ts tests/audio-focus.test.ts tests/audio.test.ts tests/speech.test.ts tests/session-confirmation.test.ts
WORLD_TEST_URL=http://127.0.0.1:5193 WORLD_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node tests/browser/mobile-diagnostics.mjs
```
