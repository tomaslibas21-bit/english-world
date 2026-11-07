// Opt-in, in-memory evidence for a physical-device audio test. Never records speech or sends a report.
export const AUDIO_DIAGNOSTICS_VERSION = "2026-11-07-audio-probe-1";
export const AUDIO_DIAGNOSTICS_LIMIT = 400;

export function audioDiagnosticsEnabled() {
  try {
    return new URLSearchParams(location.search).get("audioDebug") === "1";
  } catch {
    return false;
  }
}

type Value = string | number | boolean | null;
export interface AudioDiagnosticEntry {
  sequence: number;
  ms: number;
  event: string;
  detail: Record<string, Value>;
}
const fields = new Set([
  "recognizerId",
  "leaseId",
  "captures",
  "unconfirmed",
  "reason",
  "requested",
  "type",
  "state",
  "reset",
  "supported",
  "error",
  "clipId",
  "pipeline",
  "volume",
  "muted",
  "currentTime",
  "readyState",
  "playbackRate",
  "duration",
  "sampleRate",
  "contextTime",
  "paused",
  "ended",
  "hidden",
  "elapsed",
  "mediaError",
  "bytes",
  "audibility",
  "stage",
  "resultIndex",
  "resultSlots",
  "finalSlots",
  "interimSlots",
  "recordingPresent",
  "manifestReady",
]);
const entries: AudioDiagnosticEntry[] = [];
const subscribers = new Set<() => void>();
let sequence = 0,
  origin = 0,
  recognitionId = 0,
  paused = false;
const now = () =>
  typeof performance !== "undefined" ? performance.now() : Date.now();
export const diagnosticError = (error: unknown) => {
  const name =
    typeof error === "string"
      ? error
      : (error as { name?: unknown } | null)?.name;
  return typeof name === "string" && /^[a-zA-Z][\w-]{0,47}$/.test(name)
    ? name
    : "unknown";
};

export function audioDiagnostic(
  event: string,
  detail: Record<string, unknown> = {},
) {
  if (!audioDiagnosticsEnabled() || !/^[a-z][a-z0-9.-]{0,63}$/.test(event))
    return;
  const safe: Record<string, Value> = {};
  for (const [key, value] of Object.entries(detail)) {
    if (!fields.has(key)) continue;
    if (typeof value === "number" && Number.isFinite(value))
      safe[key] = Math.round(value * 1000) / 1000;
    else if (typeof value === "boolean" || value === null) safe[key] = value;
    // No whitespace, slashes, queries or arbitrary exception text can enter an event.
    else if (typeof value === "string" && /^[a-zA-Z0-9_.-]{1,64}$/.test(value))
      safe[key] = value;
  }
  if (!sequence) origin = now();
  entries.push({
    sequence: ++sequence,
    ms: Math.round(now() - origin),
    event,
    detail: safe,
  });
  if (entries.length > AUDIO_DIAGNOSTICS_LIMIT) entries.shift();
  for (const listener of subscribers) listener();
}

export function audioSessionSnapshot() {
  const result: Record<string, unknown> = {};
  try {
    const session = (
      navigator as Navigator & {
        audioSession?: { type?: string; state?: string };
      }
    ).audioSession;
    result.supported = !!session;
    if (session) {
      result.type = session.type ?? "unavailable";
      result.state = session.state ?? "unavailable";
    }
  } catch (error) {
    result.error = diagnosticError(error);
  }
  return result;
}

export function createRecognitionDiagnostics() {
  const id = ++recognitionId;
  return {
    id,
    event(
      name: string,
      detail?: {
        error?: string;
        resultIndex?: number;
        resultSlots?: number;
        finalSlots?: number;
        interimSlots?: number;
      },
    ) {
      if (!audioDiagnosticsEnabled()) return;
      if (
        ![
          "create",
          "start",
          "service-start",
          "abort",
          "audiostart",
          "audioend",
          "speechstart",
          "speechend",
          "end",
          "error",
          "result",
        ].includes(name)
      )
        return;
      audioDiagnostic(`recognition.${name}`, {
        recognizerId: id,
        ...audioSessionSnapshot(),
        ...detail,
        ...(detail?.error ? { error: diagnosticError(detail.error) } : {}),
      });
    },
  };
}

export const audioDiagnosticsPaused = () => audioDiagnosticsEnabled() && paused;
export function pauseAudioDiagnostics(value: boolean) {
  paused = audioDiagnosticsEnabled() && value;
  audioDiagnostic("diagnostic.panel", { paused });
}
export const subscribeAudioDiagnostics = (listener: () => void) => {
  subscribers.add(listener);
  return () => {
    subscribers.delete(listener);
  };
};
export const audioDiagnosticsCount = () => sequence;
export function audioDiagnosticsReport() {
  return {
    version: AUDIO_DIAGNOSTICS_VERSION,
    userAgent:
      typeof navigator === "undefined"
        ? "unavailable"
        : navigator.userAgent?.slice(0, 240),
    note: "Local event timings only. API state does not establish the physical speaker route or audible volume.",
    totalEvents: sequence,
    retainedEvents: entries.length,
    events: entries.map((entry) => ({ ...entry, detail: { ...entry.detail } })),
  };
}

export function observeAudioDiagnostics() {
  if (!audioDiagnosticsEnabled() || typeof document === "undefined")
    return () => {};
  audioDiagnostic("diagnostic.open", audioSessionSnapshot());
  const visibility = () =>
    audioDiagnostic("document.visibility", { hidden: document.hidden });
  let session: EventTarget | undefined;
  try {
    session = (navigator as Navigator & { audioSession?: EventTarget })
      .audioSession;
  } catch {
    /* already recorded by snapshot */
  }
  const state = () => audioDiagnostic("session.state", audioSessionSnapshot());
  document.addEventListener("visibilitychange", visibility);
  session?.addEventListener?.("statechange", state);
  return () => {
    document.removeEventListener("visibilitychange", visibility);
    session?.removeEventListener?.("statechange", state);
  };
}
