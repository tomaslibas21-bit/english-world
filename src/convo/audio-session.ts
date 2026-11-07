// iOS can retain its quiet microphone/earpiece route after speech recognition ends. Explicitly return to
// media playback before the next recording. Other browsers may not expose this API (or may reject a change).
type AudioSessionNavigator = Navigator & { audioSession?: { type: string } };
let captureGeneration = 0;

function setSession(type: "auto" | "playback") {
  try {
    const session = (navigator as AudioSessionNavigator).audioSession;
    if (session && session.type !== type) session.type = type;
  } catch { /* optional platform API */ }
}

/** Let the browser select its microphone route only for an active recognition attempt. */
export function recognitionSession() {
  const capture = ++captureGeneration;
  setSession("auto");
  // abort() returns before iOS necessarily releases the hardware. Its later audioend/end may restore playback
  // again, provided another recognition attempt has not taken ownership in the meantime.
  return () => { if (capture === captureGeneration) setSession("playback"); };
}
/** Restore normal speaker/media routing after recognition, including errors and cancellation. */
export function playbackSession() { setSession("playback"); }
