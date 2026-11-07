// abort() requests a stop; end disconnects the recognition service. Diagnostics also record
// audioend (capture finished): neither a timeout nor a DOM category proves the physical route.
import { audioDiagnostic, audioDiagnosticsEnabled, audioSessionSnapshot, diagnosticError } from "./audioDiagnostics";
const captures = new Set<Promise<void>>();
export const CAPTURE_RELEASE_TIMEOUT = 1200;
let hasCaptured = false;
let leaseId = 0, unconfirmed = 0;
export const microphoneHandoffState = () => ({ captures: captures.size, unconfirmed });

function route(type: "auto" | "playback", reset = false) {
  const diagnostic = audioDiagnosticsEnabled();
  if (diagnostic) audioDiagnostic("session.request", { requested: type, reset, ...microphoneHandoffState(), ...audioSessionSnapshot() });
  try {
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (!session) return;
    // WebKit skips an unchanged category override. Speech recognition can leave the native
    // session on its quieter capture route even though this DOM property still says playback.
    // Clear that stale override before restoring it; never do this while a newer mic owns audio.
    if (reset && session.type === "playback") session.type = "auto";
    session.type = type;
    if (diagnostic) audioDiagnostic("session.readback", { requested: type, ...audioSessionSnapshot() });
  } catch (error) { audioDiagnostic("session.error", { requested: type, error: diagnosticError(error) }); }
}

/** False while a recogniser still owns audio. A real media start may recover a stale native route. */
export function playbackRoute(recoverCaptureRoute = false): boolean {
  if (captures.size) return false;
  route("playback", recoverCaptureRoute && hasCaptured);
  return true;
}

export async function waitForMicrophone() {
  while (captures.size) await Promise.all([...captures]);
  playbackRoute();
}

export function captureAudio(recognizerId?: number) {
  const id = ++leaseId;
  const detail = () => ({ leaseId: id, recognizerId, ...microphoneHandoffState() });
  hasCaptured = true;
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
    if (reason !== "recognition-end") { timedOut = true; unconfirmed++; }
    audioDiagnostic("capture.release", { ...detail(), reason });
    // An old recogniser ending must not change a newer recogniser's capture route.
    playbackRoute(true);
    resolve();
  };
  return {
    ended() {
      if (ended) return;
      ended = true;
      if (timedOut) { timedOut = false; unconfirmed--; }
      audioDiagnostic("capture.recognition-end", detail());
      // A timeout only unblocks the UI. A later real onend still needs to repair the route:
      // the capture service may have reconfigured it after the fallback already ran.
      if (released) playbackRoute(true);
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
