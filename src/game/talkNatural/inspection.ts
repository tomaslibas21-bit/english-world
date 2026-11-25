import type { VoiceVisualOwner } from "./contract";

let sequence = 0;
const requests = new WeakMap<VoiceVisualOwner, number>();

export function inspectedRequest(owner: VoiceVisualOwner) {
  let id = requests.get(owner);
  if (id === undefined) requests.set(owner, id = ++sequence);
  return id;
}

export function inspectTalkNatural<T>(sample: () => T) {
  const dev = window as Window & { __talkNatural?: Readonly<{ sample(): unknown }> };
  const inspection = Object.freeze({ sample });
  dev.__talkNatural = inspection;
  return () => { if (dev.__talkNatural === inspection) delete dev.__talkNatural; };
}
