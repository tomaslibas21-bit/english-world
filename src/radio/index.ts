// The game's one radio (radio.ts), tied to the rest of the game: it is silent for conversations, voices and the
// microphone, follows the volume setting, and hears which place the learner walks into.
import { useStore as useZustand } from "zustand";
import { audio, clipUrl, filesToken, usesBufferRecordings } from "../game/audio";
import { audioKey } from "../audio-key";
import { RADIO_SPOT_VOICE } from "../content/radioSpots";
import { holdPlaybackRoute, microphoneHandoffState, playbackRoute, watchMicrophone } from "../convo/audioFocus";
import { useStore } from "../state/store";
// (the route: the town's conversations; the ones off it, SituationDef.bonus, are not listed or counted)
import { SITUATION_BY_ID } from "../content/situations/catalog";
import { ROUTE as SITUATIONS } from "../content/route";
import { bookSource } from "../content/bookSource";
import { EDITION } from "../edition";
import { createTalkChannel } from "./bookChannel";
import { createBookOutput } from "./bookOutput";
import type { BookItem } from "./books";
import { BOOK_STATION, SCENE_STATION, STATIONS, songOfSituation } from "../content/radio";
import { courseFavorites, FAVORITES_KEY } from "./favorites";
import { BufferOutput, HtmlOutput } from "./output";
import { Radio, type RadioState } from "./radio";
import { radioConfig } from "./songs";
import { playableScenes } from "./scenes";
import { SceneOutput } from "./sceneOutput";
import type { SceneItem } from "./sceneProgram";
import { L } from "../ui/i18n";

/** A note of this device's, not progress: like "ew-help-closed", outside the save's "english-world-" names, which the
 *  course backs up (fluent-steps src/lib/backup.ts). "v2": the stations are the course's kinds of song; the note of
 *  the radio before that ("v1": other stations, a shuffle that started on) is read once, for on/off and the strip. */
export const RADIO_STORAGE = "ew-radio-v2";
const RADIO_STORAGE_BEFORE = "ew-radio-v1";

async function fetchJson(url: string): Promise<unknown> {
  const r = await fetch(url, { cache: "no-cache" });
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
}

/** The sound of a dial turned between two stations: half a second of quiet static swept upwards, with a faint
 *  whistle. It plays in the game's own audio context beside the music, never holds anything up, and is silent with
 *  the volume at 0 or before the first tap has woken the context. */
let stopTune: (() => void) | undefined;
function tune() {
  stopTune?.();
  const volume = useStore.getState().settings.volume;
  const ctx = audio.context();
  if (!ctx || volume <= 0 || document.hidden || microphoneHandoffState().captures) return;
  if (ctx.state !== "running") { try { void ctx.resume().catch(() => {}); } catch { /* the next tap */ } return; }
  if (!playbackRoute(true)) return;
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
    const release = holdPlaybackRoute();
    const stop = stopTune = () => {
      stopTune = undefined;
      source.onended = null;
      gain.disconnect(); soft.disconnect();
      try { source.stop(); whistle.stop(); } catch { /* The sweep has already ended. */ }
      release();
    };
    source.onended = stop;
    source.start(now); source.stop(now + length);
    whistle.start(now); whistle.stop(now + length);
  } catch { stopTune?.(); }
}

const shelf = typeof window === "undefined" ? null : bookSource();
const bufferRecordings = usesBufferRecordings();
const clips = bufferRecordings ? new BufferOutput(() => audio.context()) : new HtmlOutput();
const hasScenes = typeof window !== "undefined" && EDITION.id === "es" && playableScenes.length > 0;
const profile = shelf?.profile ?? (EDITION.helper === "lt" ? "sm-lt" : "sme-en");
const talk = shelf || hasScenes ? createTalkChannel(profile, shelf, createBookOutput(bufferRecordings), hasScenes ? new SceneOutput(clips) : undefined) : null;
export const radio = new Radio({
  books: shelf && talk ? { station: BOOK_STATION, channel: { ...talk, source: shelf } } : undefined,
  scenes: hasScenes && talk ? { station: SCENE_STATION, channel: talk } : undefined,
  config: typeof window === "undefined" ? null : radioConfig(),
  stations: STATIONS,
  output: clips,
  token: filesToken,
  fetchJson,
  volume: () => useStore.getState().settings.volume,
  storageKey: RADIO_STORAGE,
  storageBefore: RADIO_STORAGE_BEFORE,
  favorites: typeof window === "undefined" ? undefined : courseFavorites(),
  tune,
  spotRecording: (spot) => {
    if (!audio.hasClip(RADIO_SPOT_VOICE, 1, spot.id)) return null;
    const key = audioKey(RADIO_SPOT_VOICE, 1, spot.id);
    return { spot, url: clipUrl(audio.base, key, audio.repairVersions[key], filesToken()), duration: audio.clipDuration(RADIO_SPOT_VOICE, 1, spot.id) ?? 0 };
  },
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
    if (st.settings.volume !== volume) {
      volume = st.settings.volume;
      if (volume <= 0) stopTune?.();
      radio.volumeChanged();
    }
    if (st.hud.minimap.zone !== zone) { zone = st.hud.minimap.zone; radio.suggest(songsAt(zone)); }
  };
  useStore.subscribe(game);
  // a voice that is loading or speaking; one that failed or waits for a tap makes no sound (and may stay so for long)
  const voice = () => { const state = audio.getState(); if (state === "loading" || state === "playing") radio.hold("voice"); else radio.release("voice"); };
  audio.subscribe(voice);
  watchMicrophone((listening) => { if (listening) radio.hold("microphone", true); else radio.release("microphone"); });
  if (microphoneHandoffState().captures) radio.hold("microphone", true);
  // a mini-game's own music (audio.bed): the radio waits until it stops
  audio.subscribeBed((music) => { if (music) radio.hold("bed"); else radio.release("bed"); });
  // the town's quiet loops (the surf, a market's murmur) play lower under the radio's music, and its own far-off
  // notes not at all (audio.ts underRadio)
  const music = () => {
    const { on, held, playing } = radio.store.getState();
    if (held || !on) stopTune?.();
    audio.underRadio(playing);
  };
  radio.store.subscribe(music);
  music();
  // the holds that stand already, before the list arrives and anything could play
  if (useStore.getState().conv.active) { conversation = true; radio.hold("conversation"); }
  voice();
  const visibility = () => { if (document.hidden) radio.hold("hidden", true); else radio.release("hidden"); };
  document.addEventListener("visibilitychange", visibility);
  visibility();
  const gesture = () => radio.gesture();
  document.addEventListener("click", gesture, true);
  document.addEventListener("keydown", gesture, true);
  window.addEventListener("pagehide", () => { stopTune?.(); radio.shutdown(); });
  // a heart given or taken back on the course's own Songs page, open in another tab
  window.addEventListener("storage", (e) => { if (!e.key || e.key === FAVORITES_KEY) radio.favoritesChanged(); });
  // the system's media keys and lock-screen buttons go through the radio, so they obey its holds too
  const session = typeof navigator !== "undefined" && "mediaSession" in navigator ? navigator.mediaSession : null;
  if (session) {
    const handle = (action: MediaSessionAction, run: () => void) => { try { session.setActionHandler(action, run); } catch { /* not offered by this browser */ } };
    handle("play", () => radio.play());
    handle("pause", () => radio.pause());
    handle("nexttrack", () => radio.next());
    handle("previoustrack", () => radio.previous());
    let lastTitle = "", lastStation = "";
    const metadata = () => {
      const state = radio.store.getState();
      const playbackState = state.playing ? "playing" : state.on ? "paused" : "none";
      try { if (session.playbackState !== playbackState) session.playbackState = playbackState; } catch { /* Browser-managed state. */ }
      const item = radio.onBooks ? radio.books?.player.getSnapshot().item as BookItem | null : null;
      const scene = radio.onScenes ? radio.talk?.player.getSnapshot().item as SceneItem | null : null;
      const title = scene?.title.lt ?? item?.chapter.title ?? state.song?.t ?? "";
      if (title === lastTitle && state.station === lastStation) return;
      lastTitle = title;
      lastStation = state.station;
      try {
        const artist = radio.talkStations.find((x) => x.id === state.station)?.name ?? STATIONS.find((x) => x.id === state.station)?.name;
        session.metadata = title && typeof MediaMetadata !== "undefined"
          ? new MediaMetadata({ title, artist, album: item?.book?.title }) : null;
      } catch { /* no lock-screen card */ }
    };
    radio.store.subscribe(metadata);
    radio.talk?.player.subscribe(metadata);
    metadata();
  }
  // the power button has no room for words: a radio that can't play says so in a toast, once
  radio.store.subscribe((s, before) => {
    if (s.failed && !before.failed) useStore.getState().toast({ kind: "info", title: L("Radijas dabar nepasiekiamas. Pabandyk vėliau.") });
  });
  void radio.init().then(() => radio.suggest(songsAt(useStore.getState().hud.minimap.zone)));
}
