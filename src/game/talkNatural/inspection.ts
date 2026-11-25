import type { VoiceVisualOwner } from "./contract";

let current: (() => unknown) | undefined;
const requestIds = new WeakMap<VoiceVisualOwner, number>();
let nextRequest = 0;

/** Shared identity for the same request across all reads of a DEV probe. */
export function inspectedRequest(owner: VoiceVisualOwner) {
  let id = requestIds.get(owner);
  if (id === undefined) { id = ++nextRequest; requestIds.set(owner, id); }
  return id;
}

export function inspectTalkNatural(sample: () => unknown) {
  if (typeof window === "undefined") return;
  const debug = window as Window & { __talkNatural?: Readonly<{ sample: () => unknown }> };
  debug.__talkNatural ??= Object.freeze({ sample: () => current?.() ?? null });
  current = sample;
  return () => { if (current === sample) current = undefined; };
}
