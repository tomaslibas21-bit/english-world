// UI state shared between the React overlay and the game.
import { create } from "zustand";
import type { Sentence } from "../convo/compose";
import type { Suggestion, Tip } from "../content/types";
import type { Look } from "../content/npcs";
import type { Guess, Practice } from "../convo/suggest";
import { loadProgress, saveProgress, type Progress } from "./progress";

export type Screen = "loading" | "title" | "create" | "play";

export interface Settings {
  lt: boolean;
  ltNatural: boolean;
  ipa: boolean;
  suggestions: boolean;
  hintsOpen: boolean;
  confirmSpeech: boolean;
  slowVoice: boolean;
  volume: number;
  /** How loud the game's sounds are beside the voices: steps, the sea, the town, the effects (0–1; 0: none). */
  sounds: number;
  textSize: number;
  quality: "high" | "low";
  cameraFollow: boolean;
  onDevice: boolean;
  /** Under your suggested answers (the guide and "More phrases"): the Lithuanian translation, and IPA.
   *  lt / ipa above are for what the other person says. */
  sayLt: boolean;
  sayIpa: boolean;
  /** Illustrated scenes behind conversations (where a place has art): the learner's own choice, by the chip in the
   *  conversation's picture, P, or „Iliustruotos scenos“. Never chosen: `picturesOn` decides by the mode. */
  scenes?: boolean;
  /** Look of the 3D world (trial styles; "blocks" = the original). */
  worldStyle: WorldStyle;
  /** The 3D town, or the light mode: the situation list and the conversations with their pictures, no 3D. */
  play: PlayMode;
}

export type WorldStyle = "blocks" | "toon" | "storybook" | "realistic";
export type PlayMode = "town" | "light";

/** Phones (a touch screen and a narrow one) start in the light mode, other devices in the 3D town. */
function defaultPlayMode(): PlayMode {
  if (typeof window === "undefined") return "town";
  const touch = navigator.maxTouchPoints > 0 || "ontouchstart" in window;
  const narrow = Math.min(screen.width, screen.height) < 600 || window.innerWidth < 600;
  return touch && narrow ? "light" : "town";
}

export const DEFAULT_SETTINGS: Settings = {
  lt: true, ltNatural: false, ipa: false, suggestions: false, hintsOpen: false,
  confirmSpeech:false, slowVoice: false, volume: 0.9, sounds: 0.8,
  textSize: typeof window === "undefined" || window.innerWidth > 900 ? 1.15 : 1,
  quality: "high", cameraFollow: true, onDevice: false, sayLt: true, sayIpa: true, worldStyle: "blocks",
  play: defaultPlayMode(),
};

/** Is a conversation held in front of its picture? The learner's choice if they made one. Without one, the 3D
 *  town talks with the person in 3D and the picture comes when asked for (owner, 15 Nov 2026: "when you get to the
 *  person, you immediately see the images, not the other way around"); the pictures-only mode shows its pictures. */
export const picturesOn = (s: Pick<Settings, "scenes" | "play">): boolean => s.scenes ?? s.play === "light";

export interface TranscriptLine {
  id: number;
  who: "npc" | "you" | "note";
  npc?: string;
  sentence?: Sentence;
  text?: string;
  understood?: boolean;
  tips?: Tip[];
  lineKey?: string;
  slow?: boolean;
  /** How the learner answered (a tiny mic or keyboard in the bubble); "picked": a "Did you mean…?" suggestion;
   *  "helped": chosen from the never-stuck help after two misses (it earns no phrase). */
  via?: "voice" | "typed" | "picked" | "helped";
  heard?: string;
  alternatives?: string[];
}

export type MicStatus = "off" | "unsupported" | "starting" | "listening" | "reconnecting" | "processing" | "denied" | "error" | "nothing";

export interface ConvUI {
  active: boolean;
  sitId: string;
  /** Who is speaking now (changes when a second person talks). */
  npcId: string;
  /** Who the conversation is with (fixed for the whole conversation). */
  hostId: string;
  mode: "talk" | "phone" | "video";
  transcript: TranscriptLine[];
  speechChoices?: string[];
  phase: "npc" | "you" | "thinking" | "ended";
  suggest: Suggestion[];
  hints: string[];
  chosen: Record<string, string>;
  openHint: string | null;
  mic: { status: MicStatus; heard: string; error?: string };
  failures: number;
  /** Answers not understood in a row (never-stuck help after the second, Conversation.tsx). */
  misses: number;
  /** This conversation speaks slowly („Lėčiau“ in the header; remembered per situation). */
  slowMode: boolean;
  lastHeard: string;
  prefix: boolean;
  completed: boolean;
  speaking: number | null;
  reveal: Record<number, boolean>;
  note: { en: string; lt?: string } | null;
  typing: boolean;
  newExpressions: string[];
  /** Mission checklist (see Conversation.checklist). */
  checklist: { id: string; lt: string; done: boolean; current: boolean }[];
  /** Which suggestion the "your turn" guide is showing (index into `suggest`). */
  focus: number;
  /** The step or pending question the conversation is at (drives the phase pictures). */
  stepId: string | null;
  /** "Did you mean…?" after an answer that wasn't understood (src/convo/suggest.ts). */
  guess: Guess | null;
  /** "Listen and repeat" of a guide example (practice only, never an answer). */
  practice: Practice | null;
  /** Counts the conversations started, so that per-conversation display state (the scene picture)
   *  starts fresh when the same situation is played again. */
  run: number;
  /** "Slėpti pagalbą": the "your turn" guide (what to do now and model answers) is hidden in this
   *  conversation only; the next one starts with it shown again. */
  guideHidden: boolean;
  /** The scene card (SituationDef.intro, src/ui/SceneIntro.tsx) is open: the person's first line waits for it. */
  introOpen: boolean;
}

export const EMPTY_CONV: ConvUI = {
  active: false, sitId: "", npcId: "", hostId: "", mode: "talk", transcript: [], phase: "npc", suggest: [], hints: [], chosen: {}, openHint: null,
  mic: { status: "off", heard: "" }, failures: 0, misses: 0, slowMode: false, lastHeard: "", prefix: false, completed: false, speaking: null, reveal: {}, note: null,
  typing: false, newExpressions: [], checklist: [], focus: 0, stepId: null, guess: null, practice: null, run: 0, guideHidden: false, introOpen: false,
};

export interface Toast { id: number; kind: "info" | "success" | "tip" | "stamp"; title: string; body?: string; better?: string; ms?: number }

export interface HudState {
  zoneName: string;
  zoneBanner: { title: string; sub?: string } | null;
  /** What E / the tap does here; `lt` is a second line (a door's place in Lithuanian and what its name means). */
  prompt: { label: string; lt?: string; kind: "talk" | "enter" | "exit" | "taxi" | "drive" | "boat" | "out" | "climb" | "surf" | "paddle" | "listen" } | null;
  /** What the player does instead of walking (game/rides, water.ts SWIM): at a car's wheel, at a boat's helm,
   *  swimming, under water on a dive, or on a surfboard in the surf lesson (game/surf). */
  ride: null | "car" | "boat" | "swim" | "dive" | "surf";
  /** At a wheel or a helm, going fast enough for a slide (the phone's brake button says so). */
  fast: boolean;
  /** The player is on the move (the task card folds away on a phone meanwhile). */
  walking: boolean;
  objective: { sitId: string; title: string; goal: string; where: string; dist: number | null; angle: number | null; inside: boolean } | null;
  minimap: { px: number; pz: number; heading: number; targetX?: number; targetZ?: number; zone: string };
  fade: number;
  panel: null | "map" | "journal" | "phone" | "settings" | "phrasebook" | "help" | "scenarios";
  showTouch: boolean;
  /** The first-time guide's hint on show (game/coach.ts): which, its number, and `ok` for the moment it was just done. */
  coach: { step: "walk" | "run" | "jump" | "talk" | "radio" | "scenes"; n: number; of: number; ok: boolean } | null;
  /** Puerto Colibrí's grotto (src/game/cave/quest.ts): the card that stands in for the map down there, and the card
   *  of the glyph stone the learner is at. */
  cave: import("../game/cave/quest").CaveCard | null;
  glyph: import("../game/cave/quest").GlyphQuiz | null;
}

interface Store {
  screen: Screen;
  settings: Settings;
  progress: Progress;
  conv: ConvUI;
  hud: HudState;
  toasts: Toast[];
  loadingText: string;
  setScreen(s: Screen): void;
  setSettings(p: Partial<Settings>): void;
  setConv(p: Partial<ConvUI> | ((c: ConvUI) => Partial<ConvUI>)): void;
  setHud(p: Partial<HudState>): void;
  toast(t: Omit<Toast, "id">): void;
  dismissToast(id: number): void;
  updateProgress(f: (p: Progress) => void): void;
  setProfile(p: { name: string; surname: string; gender: "m" | "f"; look: Look; lookId: string }): void;
}

let toastId = 1;
const initial = loadProgress();

/** Saved settings plus new defaults. v2 (owner feedback: a calmer conversation panel): the natural
 *  Lithuanian sentence and the suggestion list start collapsed; both are one tap away.
 *  v3: "Slėpti pagalbą" no longer stays saved (a hidden guide made later conversations look as if
 *  they had no suggestions); it hides the guide for one conversation (ConvUI.guideHidden).
 *  v4 (27 Oct 2026): speech is recognised by the browser's server recogniser, as in the course's flashcards: it
 *  hears accents much better. Recognition on the device became an opt-in (it used to be on whenever installed).
 *  v5: each learner turn starts listening automatically; the former manual-only preference is retired.
 *  v6 (15 Nov 2026): conversations in the 3D town start with the person in 3D. Pictures used to be on unless
 *  switched off, and that "on" was saved with any other setting, so a saved "on" from before says nothing about
 *  what the learner chose: it is forgotten (`picturesOn` then decides by the mode). From v6 on, "on" is saved only
 *  when the learner picks the picture, and it is kept. */
export function migrateSettings(saved?: Record<string, any>): Settings {
  const s = { ...DEFAULT_SETTINGS, ...(saved || {}) } as Settings & { v?: number; guide?: boolean; autoListen?: unknown };
  if ((s.v ?? 1) < 2) { s.ltNatural = false; s.suggestions = false; s.v = 2; }
  if ((s.v ?? 1) < 3) { delete s.guide; s.v = 3; }
  if ((s.v ?? 1) < 4) { s.onDevice = false; s.v = 4; }
  delete s.autoListen;
  if ((s.v ?? 1) < 5) s.v = 5;
  if ((s.v ?? 1) < 6) { if (s.scenes !== false) delete s.scenes; s.v = 6; }
  return s;
}

const initialSettings = migrateSettings(initial.settings);
if (initial.settings) initial.settings = initialSettings;

export const useStore = create<Store>((set, get) => ({
  screen: "loading",
  settings: initialSettings,
  progress: initial,
  conv: EMPTY_CONV,
  hud: {
    zoneName: "", zoneBanner: null, prompt: null, ride: null, fast: false, walking: false, objective: null, minimap: { px: 0, pz: 0, heading: 0, zone: "town" }, fade: 0, panel: null,
    showTouch: typeof window !== "undefined" && (("ontouchstart" in window) || navigator.maxTouchPoints > 1),
    coach: null, cave: null, glyph: null,
  },
  toasts: [],
  loadingText: "",
  setScreen: (screen) => set({ screen }),
  setSettings: (p) => {
    const settings = { ...get().settings, ...p } as Settings & { autoListen?: unknown };
    delete settings.autoListen;
    set({ settings });
    get().updateProgress((pr) => { pr.settings = settings; });
  },
  setConv: (p) => set((st) => ({ conv: { ...st.conv, ...(typeof p === "function" ? p(st.conv) : p) } })),
  setHud: (p) => set((st) => ({ hud: { ...st.hud, ...p } })),
  toast: (t) => {
    const id = toastId++;
    set((st) => ({ toasts: [...st.toasts.slice(-3), { ...t, id }] }));
    setTimeout(() => get().dismissToast(id), t.ms ?? (t.kind === "tip" ? 9000 : t.kind === "stamp" ? 7000 : 4500));
  },
  dismissToast: (id) => set((st) => ({ toasts: st.toasts.filter((x) => x.id !== id) })),
  updateProgress: (f) => {
    const p = structuredClone(get().progress);
    f(p);
    set({ progress: p });
    saveProgress(p);
  },
  setProfile: (prof) => get().updateProgress((p) => { p.profile = prof; }),
}));
