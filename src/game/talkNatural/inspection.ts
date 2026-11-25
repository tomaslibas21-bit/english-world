import type { VoiceVisualOwner } from "./contract";
import type { bindConversationPose } from "./pose";

const readers = new Set<{ sample(): unknown; priority: number }>();
const requestIds = new WeakMap<VoiceVisualOwner, number>();
let nextRequest = 0;

/** Shared identity for the same request across all reads of a DEV probe. */
export function inspectedRequest(owner: VoiceVisualOwner) {
  let id = requestIds.get(owner);
  if (id === undefined) { id = ++nextRequest; requestIds.set(owner, id); }
  return id;
}

export function inspectTalkNatural(sample: () => unknown, priority = 0) {
  if (typeof window === "undefined") return;
  const debug = window as Window & { __talkNatural?: Readonly<{ sample: () => unknown }> };
  debug.__talkNatural ??= Object.freeze({ sample: () => {
    let result: unknown = null, priority = -1;
    for (const reader of readers) {
      if (reader.priority < priority) continue;
      const value = reader.sample();
      if (value) { result = value; priority = reader.priority; }
    }
    return result;
  } });
  const reader = { sample, priority };
  readers.add(reader);
  return () => { readers.delete(reader); };
}

export function snapshotActor(pose: ReturnType<typeof bindConversationPose>, actorId: string, watch: string | null) {
  const a = pose?.applied;
  if (!a?.active) return null;
  return {
    ...a, actorId, deltas: { ...a.deltas },
    gaze: { target: a.gazeTarget ?? (a.watching ? watch : null), yaw: a.gazeYaw, pitch: a.gazePitch, eyeX: a.gazeEyeX, eyeY: a.gazeEyeY },
    listening: a.role === "listening" || a.role === "thinking", envelope: a.level !== null && a.level >= 0 ? a.level : null,
  };
}
