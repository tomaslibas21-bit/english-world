// The surf lesson as the game runs it: started at the school's boards or by its conversation ("¿Probamos una ola?"),
// the instructor's lines said in her voice and shown on the card (src/ui/Surf.tsx), the learner's turn after each of
// them: their answer heard by the microphone as in every conversation (or tapped, and then said for them), or their
// keys and buttons handed to the rules (logic.ts) with the move she asked for shown beside her line; the score and
// what was heard and said kept (progress.surf, the phrase cards). Game.ts only asks it "is a lesson on?" and hands it
// the frame.
import * as THREE from "three";
import { floorY } from "../water";
import { audio } from "../audio";
import { NPCS } from "../../content/npcs";
import { getSituation, loadSituation, prefetchSituations } from "../../content/situations/catalog";
import { coachVoice, npcVoice } from "../../content/voices";
import { compose, type Sentence } from "../../convo/compose";
import { createSpeechAttempt, speechSupported, type Verdict } from "../../convo/speech";
import { compareRepeat, repeatProgress } from "../../convo/suggest";
import { useStore } from "../../state/store";
import { countPlay } from "../../state/playStats";
import { sentenceInput, useCards } from "../../state/cards";
import type { SurfContent } from "../../content/surf";
import type { SurfSpot } from "../world/surf";
import type { CameraRig } from "../camera";
import type { GameCharacter } from "../characters";
import type { Surf } from "./Surf";
import { COMMANDS, SurfLogic, type Do, type Level, type SurfInput } from "./logic";
import { EMPTY_SCORE, NO_MIC, useSurf, type SurfLine } from "./store";

/** What the lesson needs of the game. */
export interface SurfGame {
  player(): GameCharacter;
  rig: CameraRig;
  /** The game's clock (s), as the sea's swell runs on it. */
  time(): number;
  splash(x: number, y: number, z: number, dx: number, dz: number, k: number): void;
  /** A fade to black, `fn` in the dark, and back. */
  fade(fn: () => void): boolean;
  /** The instructor on the sand is in the water for the lesson (hidden), or back. */
  hideNpc(id: string, hidden: boolean): void;
  /** On the board: whatever the player was doing on foot stops. */
  entered(): void;
  /** On foot again at (x, z), facing `rot`. */
  left(x: number, z: number, rot: number): void;
  portrait(): boolean;
}

/** The lines that become phrase cards once heard: the commands one acts on, the questions, the rewards. */
const CARDS = new Set([
  ...COMMANDS.map((c) => c.cue), "paddle", "paddle_hard", "wave_duck", "this_one", "not_this", "let_pass", "turn", "turn_shore", "now_up",
  "board_ask", "what_happened", "wipeout", "missed", "q_go", "again_q", "slang1", "slang2", "slang3", "slang4",
  "coming", "not_yet", "ride_q", "you_ok",
]);
/** How often a line has been heard before its help fades: its glosses and meaning, then the Spanish alone, then only
 *  the voice. */
/** Short praise keeps the picture of the command it praises (the card doesn't change shape between two commands);
 *  so do her short words between two moves. */
const KEEPS_PICTURE = new Set(["good1", "good2", "good3", "r_exact", "not_yet", "ride_q", "easy"]);
const supportFor = (heard: number): 0 | 1 | 2 => (heard < 3 ? 0 : heard < 7 ? 1 : 2);
/** A command of the ride heard so often that only her voice is left of it (supportFor: 2) is the learner's to
 *  understand first: the move it asks for is shown only after this long without one (s). Every other move is shown
 *  at once. */
const KNOWN = 7, HESITATE = 2;
const RIDE_DOES = new Set<Do>(["left", "right", "down", "fwd", "steady", "jump"]);
/** How much of an answer must be heard for it to count (the share of its words), and with a single answer to give. */
const HEARD_ENOUGH = 0.75, HEARD_ONLY = 0.6;
/** What a tap on the move's button does to the stick, and for how long (s). */
const PUSH: Partial<Record<Do, [number, number]>> = { duck: [0, -1], turn: [1, 0], left: [-1, 0], right: [1, 0], down: [0, -1], fwd: [0, 1] };

export class SurfPlay {
  scene: Surf | null = null;
  group = new THREE.Group();
  private logic: SurfLogic | null = null;
  private startRequest = 0;
  private level: Level = "beginner";
  private in = { stroke: false, up: false };
  private lastChoice: unknown = null;
  private markT = 0;
  private heard: Record<string, number> = {};
  private answered: string[] = [];
  private overShown = false;
  private lastPic: string | undefined;
  private loaded: HTMLImageElement[] = [];
  /** The learner's turn to speak: the microphone's attempt, the turn it is for, how often it has not understood. */
  private speech: ReturnType<typeof createSpeechAttempt> | null = null;
  private listenT: ReturnType<typeof setTimeout> | null = null;
  private unclear = 0;
  /** A tap on the move's button: the stick pushed for a moment. */
  private push = { x: 0, y: 0, t: 0 };
  /** The move asked for now (her cue) and how long it has been asked (s). */
  private todoCue = "";
  private todoT = 0;
  private paused = false;

  /** Where the lesson starts: a ring on the sand, as at a counter's talk spot, pulsing gently (Game adds it to the
   *  scene and calls tick). */
  marker = new THREE.Group();
  private ringT = 0;

  constructor(private spot: SurfSpot, private content: SurfContent, private game: SurfGame) {
    const mat = new THREE.MeshBasicMaterial({ color: "#ffd166", transparent: true, opacity: 0.85, depthWrite: false });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.84, 36).rotateX(-Math.PI / 2), mat);
    const halo = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.0, 36).rotateX(-Math.PI / 2), mat.clone());
    (halo.material as THREE.MeshBasicMaterial).opacity = 0.4;
    this.marker.add(ring, halo);
    this.marker.position.set(spot.start.x, Math.max(0, floorY(spot.start.x, spot.start.z)) + 0.05, spot.start.z);
    this.marker.renderOrder = 1;
  }

  /** The ring at the start: shown while one walks the town (`show`), not in the lesson. */
  tick(dt: number, show: boolean) {
    this.marker.visible = show && !this.logic;
    if (!this.marker.visible) return;
    this.ringT += dt;
    const halo = this.marker.children[1] as THREE.Mesh, k = (this.ringT * 0.7) % 1;
    halo.scale.setScalar(1 + k * 0.6);
    (halo.material as THREE.MeshBasicMaterial).opacity = 0.45 * (1 - k);
  }

  get active() { return !!this.logic; }
  get heading() { return this.scene?.heading ?? Math.PI; }
  /** Near enough to the school's boards for its prompt. */
  near(x: number, z: number) {
    const near = this.reach(x, z) < Infinity;
    // (the lesson's lines are its conversation's: fetched when the school is near, src/content/situations/catalog.ts)
    if (near && this.content.situation) prefetchSituations([this.content.situation]);
    return near;
  }
  /** How far the school's boards are (m), Infinity beyond their prompt's reach. */
  reach(x: number, z: number) {
    const s = this.spot.start;
    let best = Math.hypot(x - s.x, z - s.z) < s.r ? Math.hypot(x - s.x, z - s.z) * 0.5 : Infinity;
    // (standing on a board, its prompt wins over the instructor's talk prompt a step away: half the distance counts)
    for (const [bx, bz, r] of this.spot.boards ?? []) { const d = Math.hypot(x - bx, z - bz); if (d < r) best = Math.min(best, d * 0.5); }
    return best;
  }
  /** How far the school is (m), for the first-time hint. */
  distance(x: number, z: number) { return Math.hypot(x - this.spot.start.x, z - this.spot.start.z); }
  get npc() { return NPCS[this.content.npc]; }
  /** The conversation whose lines the lesson speaks (its end card offers the lesson). */
  get situation() { return this.content.situation; }

  /** A cue's line in the Spanish chosen now, as the instructor says it to this learner (the answers: as the learner
   *  says them); null where the edition has none. */
  line(cue: string): Sentence | null {
    const src = getSituation(this.content.situation)?.lines["sg_" + cue]?.[0] ?? this.content.lines?.["sg_" + cue]?.[0];
    if (!src) return null;
    const npc = this.npc, me = useStore.getState().progress.profile?.gender ?? "f", her = npc?.gender ?? "f";
    const mine = cue.startsWith("a_") || cue.startsWith("b_");
    return compose(src, {}, { look: () => undefined, addressee: mine ? her : me, speaker: mine ? me : her, formal: !npc?.informal });
  }

  /** The picture of what a cue asks for (its URL), where the edition has one. */
  picture(cue: string): string | undefined {
    const P = this.content.pictures, name = P?.of[cue];
    return P && name ? `${import.meta.env.BASE_URL}${P.dir}/${name}.webp` : undefined;
  }

  /** The lesson's pictures fetched ahead, the first ones needed first: each is there as she calls its command. */
  private preload() {
    const P = this.content.pictures;
    if (!P || this.loaded.length || typeof Image === "undefined") return;
    const seen = new Set<string>();
    for (const cue of ["board_ask", "lie", "paddle", "wave_duck", "arrive", "not_this", "this_one", "now_up", ...Object.keys(P.of)]) {
      const url = this.picture(cue);
      if (!url || seen.has(url)) continue;
      seen.add(url);
      const img = new Image();
      img.decoding = "async";
      img.src = url;
      this.loaded.push(img);
    }
  }

  private saved() { return useStore.getState().progress.surf ?? { waves: 0, seconds: 0, followed: 0, asked: 0, lessons: 0, heard: {} }; }

  /** The level's choice comes up (the lesson started at the boards). */
  open() {
    if (this.active || useSurf.getState().picking) return;
    const s = this.saved();
    useSurf.getState().set({ picking: true, best: { waves: s.waves, seconds: s.seconds } });
    audio.sfx("pop");
  }
  cancel() {
    this.startRequest++;
    useSurf.getState().set({ picking: false });
  }

  start(level: Level) {
    if (this.active) return;
    useSurf.getState().set({ picking: false });
    const request = ++this.startRequest;
    const start = () => {
      if (request !== this.startRequest || this.active) return;
      this.game.fade(() => { if (request === this.startRequest) this.launch(level); });
    };
    // (its lines in the learner's language are its conversation's: here already when the school was near)
    const id = this.content.situation;
    const lines = id && !getSituation(id) ? loadSituation(id).catch(() => null) : null;
    if (this.scene && !lines) { start(); return; }
    const scene = this.scene ?? import("./Surf").then(({ Surf }) => {
      if (request !== this.startRequest) return;
      const game = this.game;
      this.scene ??= new Surf(this.spot, { get player() { return game.player(); }, splash: game.splash, portrait: game.portrait }, this.group);
    });
    void Promise.all([scene, lines]).then(start).catch((err) => {
      if (request !== this.startRequest) return;
      console.error("Could not load the surf lesson", err);
      this.open();
    });
  }

  private launch(level: Level) {
    const scene = this.scene!;
    const st = useStore.getState(), s = this.saved();
    this.level = level;
    this.heard = { ...s.heard };
    this.answered = [];
    this.in.stroke = this.in.up = false;
    this.overShown = false;
    this.lastChoice = null;
    this.lastPic = undefined;
    this.unclear = 0;
    this.push.t = 0;
    this.todoCue = "";
    this.paused = false;
    this.preload();
    countPlay("games", "surf");
    this.logic = new SurfLogic({ say: (cue) => this.say(cue), answer: (cue, spoken) => this.answer(cue, spoken), fx: (name) => this.fx(name), rnd: Math.random, busy: () => this.heardNow() }, { level, rides: s.waves, slow: !!st.settings.slowVoice });
    this.game.entered();
    this.game.hideNpc(this.content.npc, true);
    scene.begin(this.logic, this.npc.look);
    this.game.rig.mode = "stage";
    this.game.rig.stage = scene.cam;
    this.game.rig.stageSnap();
    useSurf.getState().set({ active: true, picking: false, level, phase: this.logic.phase, line: null, choice: null, todo: null, said: null, mic: speechSupported() ? NO_MIC : { status: "unsupported", heard: "" }, support: 0, balance: 1, asked: false, mark: null, score: { ...EMPTY_SCORE }, over: false, best: { waves: s.waves, seconds: s.seconds } });
    st.setHud({ prompt: null, ride: "surf" });
  }

  /** Another lesson, from the beach (the score card's "Otra vez"): the same level, or the other one. */
  again(level: Level = this.level) {
    if (!this.logic) return;
    audio.stop();
    this.stopListening();
    this.game.fade(() => { this.finish(); this.launch(level); });
  }

  /** What was heard and done goes into the learner's progress and their cards. */
  private finish() {
    const L = this.logic;
    if (!L) return;
    const sc = L.score;
    useStore.getState().updateProgress((p) => {
      const s = p.surf ?? { waves: 0, seconds: 0, followed: 0, asked: 0, lessons: 0, heard: {} };
      s.waves += sc.waves; s.seconds += sc.seconds; s.followed += sc.followed; s.asked += sc.asked; s.lessons += 1;
      s.heard = { ...this.heard };
      p.surf = s;
    });
    const cards = useCards.getState();
    for (const cue of [...L.heard.filter((c) => CARDS.has(c)), ...this.answered]) {
      const s = this.line(cue);
      if (s) cards.add(sentenceInput(s, this.content.situation));
    }
  }

  /** Out of the lesson: back on the sand by the boards (`now`: with no fade, something else is taking the player). */
  stop(now = false) {
    if (!this.logic) { this.cancel(); return; }
    const out = () => {
      this.finish();
      this.stopListening();
      audio.stop();
      this.logic = null;
      this.scene?.end();
      this.game.hideNpc(this.content.npc, false);
      this.game.rig.stage = null;
      useSurf.getState().reset();
      useStore.getState().setHud({ ride: null, prompt: null });
      const s = this.spot.start;
      this.game.left(s.x, s.z, s.rot);
    };
    if (now || !this.game.fade(out)) { if (now) out(); }
  }

  // --- the learner's hands ----------------------------------------------------------------------------------------

  /** A paddle stroke (E, the round button). */
  stroke() { this.in.stroke = true; }
  /** The stand-up button (Space, the jump button): up onto the feet; in a ride, the trick. */
  up() { this.in.up = true; }
  /** An answer tapped (its cue): it is said for the learner, and she goes on. */
  choose(cue: string) { this.logic?.choose(cue, false); }
  /** The move she asked for, done by a tap on its button beside her line (as its key would). */
  act(what: Do) {
    const L = this.logic;
    if (!L?.todo || L.todo.do !== what) return;
    if (what === "paddle") this.in.stroke = true;
    else if (what === "up" || what === "jump") this.in.up = true;
    else { const p = PUSH[what]; if (p) { this.push.x = p[0]; this.push.y = p[1]; this.push.t = 0.22; } }
  }
  /** Her line once more (a tap on it): the microphone waits for her to finish. */
  repeat() {
    const L = this.logic, line = useSurf.getState().line;
    if (!L || !line || L.talking) return;
    const again = !!this.speech;
    this.stopListening();
    const npc = this.npc, slow = !!useStore.getState().settings.slowVoice;
    void audio.play(npcVoice(npc), npc?.speed ?? 1, line.s.say, { slow, male: npc?.gender === "m" }).then(() => { if (again && this.logic?.choice) this.listen(); });
  }

  // --- the learner's turn to speak ----------------------------------------------------------------------------------

  /** The microphone on or off for this lesson (its button): off, the answers are tapped. */
  setMic(on: boolean) {
    useSurf.getState().set({ micOn: on });
    if (!on) this.stopListening(); else if (this.logic?.choice) { this.unclear = 0; this.listen(); }
  }

  /** A voice is being heard right now (hers, or the learner's line said for them). */
  private heardNow() { const st = audio.getState(); return st === "loading" || st === "playing"; }

  /** The microphone opens for the answers on show: what is heard is held against each of them. */
  listen(waited = 0) {
    const L = this.logic, ui = useSurf.getState();
    if (this.listenT) { clearTimeout(this.listenT); this.listenT = null; }
    if (!L?.choice || !ui.choice || !ui.micOn || !speechSupported() || this.paused || typeof document === "undefined" || document.visibilityState !== "visible") return;
    // (never over her voice: it waits for her to finish, within reason)
    if (this.heardNow() && waited < 6000) { this.listenT = setTimeout(() => { this.listenT = null; this.listen(waited + 200); }, 200); return; }
    this.stopListening();
    const turn = L.choice, options = ui.choice.options;
    const best = (text: string) => {
      let top: { cue: string; score: number } | null = null;
      for (const o of options) { const score = compareRepeat(o.s.en, text).score; if (!top || score > top.score) top = { cue: o.cue, score }; }
      return top;
    };
    audio.stop(); // (the speaker lets go before the microphone opens)
    const attempt = createSpeechAttempt({
      evaluate: (text): Verdict => {
        let v: Verdict = "none";
        for (const o of options) { const p = repeatProgress(o.s.en, text); if (p === "complete") return "complete"; if (p === "prefix") v = "prefix"; }
        return v;
      },
      phrases: options.map((o) => o.s.en),
      preferLocal: useStore.getState().settings.onDevice,
      onUpdate: (s) => {
        if (this.speech !== attempt) return;
        const status = s.status === "idle" ? "off" : s.status === "reconnecting" ? "listening" : s.status;
        useSurf.getState().set({ mic: { status, heard: s.heard, error: s.error } });
        // (nothing heard, or no microphone: the answers stay there to tap, the button turns it on again)
        if (s.status === "nothing" || s.status === "denied" || s.status === "error") { this.speech = null; attempt.dispose(); }
      },
      onCommit: (text, alts) => {
        if (this.speech !== attempt || this.logic?.choice !== turn) return;
        this.speech = null;
        attempt.dispose();
        let top: { cue: string; score: number } | null = null;
        for (const t of [text, ...alts]) { const b = best(t); if (b && (!top || b.score > top.score)) top = b; }
        if (top && top.score >= (options.length === 1 ? HEARD_ONLY : HEARD_ENOUGH)) { this.unclear = 0; this.logic?.choose(top.cue, true); return; }
        // something else was heard: it is shown, and the microphone listens again (a few times, then it rests)
        this.unclear++;
        useSurf.getState().set({ mic: { status: this.unclear < 3 ? "unclear" : "off", heard: text.trim() } });
        if (this.unclear < 3) this.listenT = setTimeout(() => { this.listenT = null; this.listen(); }, 1300);
      },
    });
    this.speech = attempt;
    attempt.start();
  }

  /** The mic button while it listens: what was heard so far is the answer. */
  finishListening() { if (this.speech?.running) this.speech.finish(); }

  stopListening() {
    if (this.listenT) { clearTimeout(this.listenT); this.listenT = null; }
    if (this.speech) { const a = this.speech; this.speech = null; a.dispose(); }
    const ui = useSurf.getState();
    if (ui.mic.status !== "unsupported" && ui.mic.status !== "off") ui.set({ mic: { status: "off", heard: ui.mic.heard } });
  }

  /** The learner has answered (the rules ask): aloud, and she goes on at once; by a tap, and their line is said for
   *  them first, in the voice the learner's examples have. */
  private answer(cue: string, spoken: boolean): number {
    this.stopListening();
    if (!this.answered.includes(cue)) this.answered.push(cue);
    const s = this.line(cue);
    useSurf.getState().set({ said: s ? { cue, s } : null, mic: speechSupported() ? NO_MIC : { status: "unsupported", heard: "" } });
    if (!s || spoken) return 0.15;
    const voice = coachVoice(useStore.getState().progress.profile?.gender);
    // (a line with no recording yet is only shown)
    const secs = audio.clipDuration(voice, 1, s.say);
    if (secs == null) return 0.5;
    void audio.play(voice, 1, s.say);
    return secs;
  }
  /** A key while a lesson is on: true when it was the lesson's. */
  key(k: string, repeat: boolean, keys: Set<string>): boolean {
    const L = this.logic;
    if (!L) return false;
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(k)) {
      keys.add(k);
      // lying on the board, the arrows to either side are the two arms
      if (!repeat && (L.phase === "out" || L.phase === "catch") && ["arrowleft", "arrowright", "a", "d"].includes(k)) this.in.stroke = true;
      return true;
    }
    if (k === " ") { if (!repeat) this.in.up = true; return true; }
    if (k === "e" || k === "enter") { if (!repeat) this.in.stroke = true; return true; }
    if (k === "m") { if (!repeat) this.setMic(!useSurf.getState().micOn); return true; }
    if (k >= "1" && k <= "3" && L.choice) { const o = L.choice.options[Number(k) - 1]; if (o) this.choose(o); return true; }
    if (k === "escape") { this.stop(); return true; }
    return true;
  }

  // --- what the rules ask of the game ---------------------------------------------------------------------------------

  private say(cue: string): number {
    const s = this.line(cue);
    if (!s) return 0.8;
    const st = useStore.getState(), npc = this.npc, voice = npcVoice(npc), speed = npc?.speed ?? 1, slow = !!st.settings.slowVoice;
    const secs = (audio.clipDuration(voice, speed, s.say) ?? 0.45 + s.say.length * 0.058) / (slow ? 0.82 : 1);
    void audio.play(voice, speed, s.say, { slow, male: npc?.gender === "m" });
    this.scene?.coach?.talk(secs, () => audio.level(), () => audio.vowel());
    const n = this.heard[cue] ?? 0;
    this.heard[cue] = n + 1;
    const pic = this.picture(cue) ?? (KEEPS_PICTURE.has(cue) ? this.lastPic : undefined);
    this.lastPic = pic;
    useSurf.getState().set({ line: { cue, s, pic }, support: supportFor(n), said: null });
    return secs;
  }

  private fx(name: string) {
    this.scene?.fx(name, this.game.time());
    const ui = useSurf.getState();
    switch (name) {
      case "duck": audio.splash(0.6); break;
      case "tumble": audio.surfWipeout(); break;
      case "missed": audio.wash(); break;
      case "flip": audio.jump(1.4); break;
      case "cheer": audio.sfx("cheer"); break;
      case "right": audio.sfx("pop"); ui.set({ mark: "ok" }); this.markT = 0.9; break;
      case "wrong": audio.sfx("soft"); ui.set({ mark: "no" }); this.markT = 0.9; break;
      case "reset": {
        // (a moment in the dark while the rules put everyone in their new places)
        useStore.getState().setHud({ fade: 1 });
        setTimeout(() => { this.game.rig.stageSnap(); useStore.getState().setHud({ fade: 0 }); }, 430);
        break;
      }
    }
  }

  // --- a frame ------------------------------------------------------------------------------------------------------

  /** `x`, `y`: the stick or the arrows; `paused`: a panel is open. */
  update(dt: number, t: number, x: number, y: number, paused: boolean) {
    const L = this.logic;
    if (!L) return;
    L.setSlow(!!useStore.getState().settings.slowVoice);
    // (a tap on the move's button pushes the stick for a moment)
    if (this.push.t > 0) { this.push.t -= dt; x = this.push.x; y = this.push.y; }
    const inp: SurfInput = { x, y, stroke: this.in.stroke && !paused, up: this.in.up && !paused };
    this.in.stroke = this.in.up = false;
    // (a panel over the lesson: the microphone closes, and opens again with the lesson)
    if (paused !== this.paused) { this.paused = paused; if (paused) this.stopListening(); else if (L.choice) this.listen(); }
    this.scene?.update(dt, t, inp, paused);
    this.sync(dt);
  }

  private sync(dt: number) {
    const L = this.logic!, ui = useSurf.getState(), patch: Partial<typeof ui> = {};
    if (ui.phase !== L.phase) patch.phase = L.phase;
    if (this.scene?.demonstrating) {
      if (ui.line) patch.line = null;
      if (ui.said && this.scene.demoState !== "paddle") patch.said = null;
    }
    const turn = L.choice !== this.lastChoice;
    if (turn) {
      this.lastChoice = L.choice;
      patch.choice = L.choice ? { id: L.choice.id, options: L.choice.options.map((cue) => ({ cue, s: this.line(cue) })).filter((o): o is SurfLine => !!o.s) } : null;
    }
    // the move she asks for: shown beside her line at once, but a command of the ride the learner has heard often is
    // theirs to understand first (it shows when they hesitate)
    const t = L.todo;
    if (t) {
      if (t.cue !== this.todoCue) { this.todoCue = t.cue; this.todoT = 0; } else this.todoT += dt;
      const show = !RIDE_DOES.has(t.do) || (this.heard[t.cue] ?? 0) <= KNOWN || this.todoT > HESITATE;
      const left = t.win && t.t != null ? Math.max(0, Math.min(1, t.t / t.win)) : null;
      const was = ui.todo;
      if (!was || was.do !== t.do || was.cue !== t.cue || was.left !== (t.left ?? null) || was.show !== show || (left != null && Math.abs((was.time ?? 1) - left) > 0.02)) patch.todo = { do: t.do, cue: t.cue, left: t.left ?? null, of: t.of ?? null, time: left, show };
    } else { this.todoCue = ""; if (ui.todo) patch.todo = null; }
    const bal = Math.round(Math.max(0, L.balance) * 20) / 20;
    if (ui.balance !== bal) patch.balance = bal;
    if (ui.asked !== !!L.cmd) patch.asked = !!L.cmd;
    const sc = L.score, was = ui.score;
    if (was.waves !== sc.waves || was.seconds !== sc.seconds || was.followed !== sc.followed || was.asked !== sc.asked || was.falls !== sc.falls) patch.score = { ...sc };
    if (this.markT > 0) { this.markT -= dt; if (this.markT <= 0) patch.mark = null; }
    if (L.phase === "over" && !this.overShown) { this.overShown = true; patch.over = true; patch.line = null; }
    if (Object.keys(patch).length) ui.set(patch);
    // the learner's turn to speak: the microphone opens once she has finished (and closes with the turn)
    if (turn) {
      this.unclear = 0;
      this.stopListening();
      if (L.choice) this.listenT = setTimeout(() => { this.listenT = null; this.listen(); }, 250);
    }
    // the round button on a phone is the paddle while paddling is what she asked for
    const hud = useStore.getState().hud, paddling = L.todo?.do === "paddle";
    if (paddling !== (hud.prompt?.kind === "paddle")) useStore.getState().setHud({ prompt: paddling ? { label: "", kind: "paddle" } : null });
  }
}
