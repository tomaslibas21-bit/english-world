// abort() requests a stop; end disconnects the recognition service. Diagnostics also record
// audioend (capture finished): neither a timeout nor a DOM category proves the physical route.
import { audioDiagnostic, audioDiagnosticsEnabled, audioSessionSnapshot, diagnosticError } from "./audioDiagnostics";
const captures = new Set<Promise<void>>();
export const CAPTURE_RELEASE_TIMEOUT = 1200;
let recoveryPending = false;
let playbacks = 0;
let leaseId = 0, unconfirmed = 0;
export const microphoneHandoffState = () => ({ captures: captures.size, unconfirmed });

const microphoneWatchers = new Set<(listening: boolean) => void>();
/** Told the moment a microphone is asked for, before the audio route changes, and again when the last one is
 *  released. The town's radio stops for it (src/radio/): music never plays into speech recognition. */
export function watchMicrophone(watcher: (listening: boolean) => void) {
  microphoneWatchers.add(watcher);
  return () => { microphoneWatchers.delete(watcher); };
}
function tellMicrophoneWatchers(listening: boolean) {
  for (const watcher of microphoneWatchers) { try { watcher(listening); } catch { /* a watcher never blocks the microphone */ } }
}

/** Protect an output from a late capture-end callback. Releasing does not reconfigure audio:
 *  any pending recovery belongs to the next idle playback start, never an audible sentence. */
export function holdPlaybackRoute() {
  playbacks++;
  let held = true;
  return () => {
    if (!held) return;
    held = false;
    playbacks--;
  };
}

function route(type: "auto" | "playback", reset = false) {
  const diagnostic = audioDiagnosticsEnabled();
  if (diagnostic) audioDiagnostic("session.request", { requested: type, reset, playbacks, recoveryPending, ...microphoneHandoffState(), ...audioSessionSnapshot() });
  try {
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (!session) return true;
    // WebKit skips an unchanged category override. Speech recognition can leave the native
    // session on its quieter capture route even though this DOM property still says playback.
    // Clear that stale override before restoring it; never do this while a newer mic owns audio.
    if (reset && session.type === "playback") session.type = "auto";
    session.type = type;
    if (diagnostic) audioDiagnostic("session.readback", { requested: type, ...audioSessionSnapshot() });
    return true;
  } catch (error) {
    audioDiagnostic("session.error", { requested: type, error: diagnosticError(error) });
    return false;
  }
}

/** False while a recogniser still owns audio. A real media start may recover a stale native route. */
export function playbackRoute(recoverCaptureRoute = false): boolean {
  if (captures.size) return false;
  if (playbacks) {
    audioDiagnostic("session.deferred", { requested: "playback", playbacks, recoveryPending });
    return true;
  }
  const reset = recoverCaptureRoute && recoveryPending;
  if (route("playback", reset) && reset) recoveryPending = false;
  return true;
}

export async function waitForMicrophone() {
  while (captures.size) await Promise.all([...captures]);
  playbackRoute();
}

export function captureAudio(recognizerId?: number) {
  const id = ++leaseId;
  const detail = () => ({ leaseId: id, recognizerId, ...microphoneHandoffState() });
  tellMicrophoneWatchers(true);
  recoveryPending = true;
  route("auto"); // "playback" is incompatible with capture on Safari.
  let resolve!: () => void;
  const done = new Promise<void>((r) => { resolve = r; });
  captures.add(done);
  audioDiagnostic("capture.acquire", detail());
  let timer: ReturnType<typeof setTimeout> | undefined;
  let released = false;
  let ended = false;
  let timedOut = false;
  let abortFailed = false;
  const release = (reason: "recognition-end" | "timeout-unknown" | "abort-error-unknown") => {
    if (released) return;
    released = true;
    clearTimeout(timer);
    captures.delete(done);
    if (!captures.size) tellMicrophoneWatchers(false);
    if (reason !== "recognition-end") { timedOut = true; unconfirmed++; }
    audioDiagnostic("capture.release", { ...detail(), reason });
    // An old recogniser ending must not change a newer recogniser's capture route.
    // Restore the requested category, but keep the one-shot recovery for the actual
    // media start: the native capture service may finish after this callback.
    playbackRoute();
    resolve();
  };
  return {
    ended() {
      if (ended) return;
      ended = true;
      if (timedOut) { timedOut = false; unconfirmed--; }
      audioDiagnostic("capture.recognition-end", detail());
      // A timeout only unblocks the UI. A late real end can invalidate the native route,
      // but changing category during playback can reconfigure active iOS audio.
      // Mark the next idle start for recovery; a newer microphone keeps its ownership.
      if (released) { recoveryPending = true; playbackRoute(); }
      else release("recognition-end");
    },
    failed(error?: unknown) {
      abortFailed = true;
      audioDiagnostic("capture.abort-error", { ...detail(), error: diagnosticError(error) });
      if (!released && timer === undefined) timer = setTimeout(() => release("abort-error-unknown"), CAPTURE_RELEASE_TIMEOUT);
    },
    stopping() {
      // Some engines never send onend after denial/abort. Bound the handoff without adding
      // a fixed delay to browsers that do release promptly.
      if (!released && timer === undefined) {
        audioDiagnostic("capture.stop-request", detail());
        timer = setTimeout(() => release(abortFailed ? "abort-error-unknown" : "timeout-unknown"), CAPTURE_RELEASE_TIMEOUT);
      }
    },
  };
}
