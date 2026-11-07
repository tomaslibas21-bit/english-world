// A recogniser's abort() requests a stop; onend is when the phone actually releases the microphone.
// Do not start the next recording on iOS's quieter capture route in between those two events.
const captures = new Set<Promise<void>>();
export const CAPTURE_RELEASE_TIMEOUT = 1200;

function route(type: "auto" | "playback") {
  try {
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (session) session.type = type;
  } catch { /* optional API; other browsers manage their own audio focus */ }
}

export function playbackRoute() { if (!captures.size) route("playback"); }

export async function waitForMicrophone() {
  while (captures.size) await Promise.all([...captures]);
  playbackRoute();
}

export function captureAudio() {
  route("auto"); // "playback" is incompatible with capture on Safari.
  let resolve!: () => void;
  const done = new Promise<void>((r) => { resolve = r; });
  captures.add(done);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let ended = false;
  const finish = () => {
    if (ended) return;
    ended = true;
    clearTimeout(timer);
    captures.delete(done);
    // An old recogniser ending must not change a newer recogniser's capture route.
    playbackRoute();
    resolve();
  };
  return {
    ended: finish,
    stopping() {
      // Some engines never send onend after denial/abort. Bound the handoff without adding
      // a fixed delay to browsers that do release promptly.
      if (!ended && timer === undefined) timer = setTimeout(finish, CAPTURE_RELEASE_TIMEOUT);
    },
  };
}
