// A recogniser's abort() requests a stop; onend is when the phone actually releases the microphone.
// Do not start the next recording on iOS's quieter capture route in between those two events.
const captures = new Set<Promise<void>>();
export const CAPTURE_RELEASE_TIMEOUT = 1200;
let hasCaptured = false;

function route(type: "auto" | "playback", reset = false) {
  try {
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (!session) return;
    // WebKit skips an unchanged category override. Speech recognition can leave the native
    // session on its quieter capture route even though this DOM property still says playback.
    // Clear that stale override before restoring it; never do this while a newer mic owns audio.
    if (reset && session.type === "playback") session.type = "auto";
    session.type = type;
  } catch { /* optional API; other browsers manage their own audio focus */ }
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

export function captureAudio() {
  hasCaptured = true;
  route("auto"); // "playback" is incompatible with capture on Safari.
  let resolve!: () => void;
  const done = new Promise<void>((r) => { resolve = r; });
  captures.add(done);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let released = false;
  let ended = false;
  const release = () => {
    if (released) return;
    released = true;
    clearTimeout(timer);
    captures.delete(done);
    // An old recogniser ending must not change a newer recogniser's capture route.
    playbackRoute(true);
    resolve();
  };
  return {
    ended() {
      if (ended) return;
      ended = true;
      // A timeout only unblocks the UI. A later real onend still needs to repair the route:
      // the capture service may have reconfigured it after the fallback already ran.
      if (released) playbackRoute(true);
      else release();
    },
    stopping() {
      // Some engines never send onend after denial/abort. Bound the handoff without adding
      // a fixed delay to browsers that do release promptly.
      if (!released && timer === undefined) timer = setTimeout(release, CAPTURE_RELEASE_TIMEOUT);
    },
  };
}
