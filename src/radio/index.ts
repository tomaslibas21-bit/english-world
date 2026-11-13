// The game's one radio (radio.ts), tied to the rest of the game: it is silent for conversations, voices and the
// microphone, follows the volume setting, and hears which place the learner walks into.
import { useStore as useZustand } from "zustand";
import { audio, filesToken, usesBufferRecordings } from "../game/audio";
import { watchMicrophone } from "../convo/audioFocus";
import { useStore } from "../state/store";
import { SITUATIONS, SITUATION_BY_ID } from "../content/situations";
import { STATIONS, songOfSituation } from "../content/radio";
import { BufferOutput, HtmlOutput } from "./output";
import { Radio, type RadioState } from "./radio";
import { radioConfig } from "./songs";

/** A note of this device's, not progress: like "ew-help-closed", outside the save's "english-world-" names, which the
 *  course backs up (fluent-steps src/lib/backup.ts). */
export const RADIO_STORAGE = "ew-radio-v1";

async function fetchJson(url: string): Promise<unknown> {
  const r = await fetch(url, { cache: "no-cache" });
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
}

/** The sound of a dial turned between two stations: half a second of quiet static swept upwards, with a faint
 *  whistle. It plays in the game's own audio context beside the music, never holds anything up, and is silent with
 *  the volume at 0 or before the first tap has woken the context. */
function tune() {
  const volume = useStore.getState().settings.volume;
  const ctx = audio.context();
  if (!ctx || volume <= 0) return;
  if (ctx.state !== "running") { try { void ctx.resume().catch(() => {}); } catch { /* the next tap */ } return; }
  try {
    const now = ctx.currentTime, length = 0.55;
    const noise = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * length), ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource(), band = ctx.createBiquadFilter(), gain = ctx.createGain();
    source.buffer = noise;
    band.type = "bandpass"; band.Q.value = 5;
    band.frequency.setValueAtTime(500, now);
    band.frequency.exponentialRampToValueAtTime(2800, now + length);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.07 * volume, now + 0.12);
    gain.gain.linearRampToValueAtTime(0, now + length);
    source.connect(band); band.connect(gain); gain.connect(ctx.destination);
    const whistle = ctx.createOscillator(), soft = ctx.createGain();
    whistle.type = "sine";
    whistle.frequency.setValueAtTime(1900, now);
    whistle.frequency.exponentialRampToValueAtTime(700, now + length * 0.8);
    soft.gain.setValueAtTime(0, now);
    soft.gain.linearRampToValueAtTime(0.006 * volume, now + 0.1);
    soft.gain.linearRampToValueAtTime(0, now + length * 0.8);
    whistle.connect(soft); soft.connect(ctx.destination);
    source.start(now); source.stop(now + length);
    whistle.start(now); whistle.stop(now + length);
  } catch { /* no sweep: the station changes all the same */ }
}

export const radio = new Radio({
  config: typeof window === "undefined" ? null : radioConfig(),
  stations: STATIONS,
  output: usesBufferRecordings() ? new BufferOutput(() => audio.context()) : new HtmlOutput(),
  token: filesToken,
  fetchJson,
  volume: () => useStore.getState().settings.volume,
  storageKey: RADIO_STORAGE,
  tune,
});

export function useRadio<T>(pick: (s: RadioState) => T): T { return useZustand(radio.store, pick); }

/** The songs of the conversations at a place, the current task's first. */
function songsAt(zone: string): (string | null)[] {
  const here = SITUATIONS.filter((s) => s.location === zone);
  const task = useStore.getState().hud.objective?.sitId;
  const first = task && SITUATION_BY_ID[task]?.location === zone ? [SITUATION_BY_ID[task]] : [];
  return [...first, ...here].map(songOfSituation);
}

let bound = false;
/** Tie the radio to the game (once; the town's HUD calls it when it first shows). */
export function bindRadio() {
  if (bound || !radio.store.getState().available) return;
  bound = true;
  let conversation = false, volume = useStore.getState().settings.volume, zone = "";
  const game = () => {
    const st = useStore.getState();
    if (st.conv.active !== conversation) {
      conversation = st.conv.active;
      if (conversation) { radio.hold("conversation"); radio.setOpen(false); } else radio.release("conversation");
    }
    if (st.settings.volume !== volume) { volume = st.settings.volume; radio.volumeChanged(); }
    if (st.hud.minimap.zone !== zone) { zone = st.hud.minimap.zone; radio.suggest(songsAt(zone)); }
  };
  useStore.subscribe(game);
  // a voice that is loading or speaking; one that failed or waits for a tap makes no sound (and may stay so for long)
  const voice = () => { const state = audio.getState(); if (state === "loading" || state === "playing") radio.hold("voice"); else radio.release("voice"); };
  audio.subscribe(voice);
  watchMicrophone((listening) => { if (listening) radio.hold("microphone", true); else radio.release("microphone"); });
  // the holds that stand already, before the list arrives and anything could play
  if (useStore.getState().conv.active) { conversation = true; radio.hold("conversation"); }
  voice();
  const gesture = () => radio.gesture();
  document.addEventListener("click", gesture, true);
  document.addEventListener("keydown", gesture, true);
  window.addEventListener("pagehide", () => radio.shutdown());
  // the system's media keys and lock-screen buttons go through the radio, so they obey its holds too
  const session = typeof navigator !== "undefined" && "mediaSession" in navigator ? navigator.mediaSession : null;
  if (session) {
    const handle = (action: MediaSessionAction, run: () => void) => { try { session.setActionHandler(action, run); } catch { /* not offered by this browser */ } };
    handle("play", () => radio.setOn(true));
    handle("pause", () => radio.setOn(false));
    handle("nexttrack", () => radio.next());
    handle("previoustrack", () => radio.previous());
    radio.store.subscribe((s, before) => {
      if (s.song === before.song && s.station === before.station) return;
      try {
        session.metadata = s.song && typeof MediaMetadata !== "undefined"
          ? new MediaMetadata({ title: s.song.t, artist: STATIONS.find((x) => x.id === s.station)?.name ?? "" })
          : null;
      } catch { /* no lock-screen card */ }
    });
  }
  // the power button has no room for words: a radio that can't play says so in a toast, once
  radio.store.subscribe((s, before) => {
    if (s.failed && !before.failed) useStore.getState().toast({ kind: "info", title: "Radijas dabar nepasiekiamas. Pabandyk vėliau." });
  });
  void radio.init().then(() => radio.suggest(songsAt(useStore.getState().hud.minimap.zone)));
}
