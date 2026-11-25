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
import type { ActingTarget, ActorTalk } from "../talkNatural/binding";
import type { Surf } from "./Surf";
import { arrowFor, COMMANDS, SurfLogic, type Do, type Level, type SurfArrow, type SurfInput } from "./logic";
import { EMPTY_SCORE, NO_MIC, useSurf, type SurfLine } from "./store";

/** What the lesson needs of the game. */
export interface SurfGame {
  acting?(): ActorTalk;
  player(): GameCharacter;
  dressPlayer(outfit: "surf" | null): void;
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
const ARROW_KEYS = new Map<string, SurfArrow>([
  ["arrowup", "up"], ["arrowdown", "down"], ["arrowleft", "left"], ["arrowright", "right"],
  ["w", "up"], ["s", "down"], ["a", "left"], ["d", "right"],
]);
const ARROW_STICK: Record<SurfArrow, [number, number]> = { up: [0, 1], down: [0, -1], left: [-1, 0], right: [1, 0] };

export class SurfPlay {
  scene: Surf | null = null;
  group = new THREE.Group();
  private logic: SurfLogic | null = null;
  private startRequest = 0;
  private acting?: ActorTalk;
  private leaving = false;
  private level: Level = "beginner";
  private in = { strokes: 0, up: false };
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
  /** The phone's held arrows. A press that paddles or jumps does not push the stick. */
  private arrows = new Map<SurfArrow, boolean>();
  // Keep even a tap released between two frames.
  private arrowFrame = new Set<SurfArrow>();
  private keyFlashT = 0;
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
      this.scene ??= new Surf(this.spot, {
        get player() { return game.player(); },
        get aspect() { return game.rig.cam.aspect; },
        splash: game.splash,
      }, this.group);
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
    this.in.strokes = 0; this.in.up = false;
    this.arrows.clear();
    this.arrowFrame.clear();
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
    this.game.dressPlayer("surf");
    this.game.hideNpc(this.content.npc, true);
    scene.begin(this.logic, this.npc.look);
    this.game.rig.mode = "stage";
    this.game.rig.stage = scene.cam;
    this.game.rig.stageSnap();
    useSurf.getState().set({ active: true, keyFlash: null, picking: false, level, phase: this.logic.phase, line: null, choice: null, todo: null, said: null, mic: speechSupported() ? NO_MIC : { status: "unsupported", heard: "" }, support: 0, balance: 1, asked: false, mark: null, score: { ...EMPTY_SCORE }, over: false, best: { waves: s.waves, seconds: s.seconds } });
    st.setHud({ prompt: null, ride: "surf" });
  }

  /** Another lesson, from the beach (the score card's "Otra vez"): the same level, or the other one. */
  again(level: Level = this.level) {
    const L = this.logic;
    if (!L || this.leaving) return;
    if (this.game.fade(() => {
      if (this.logic === L) { this.finish(); this.launch(level); }
    })) {
      this.acting?.release(0);
      audio.stop();
      this.stopListening();
    }
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
    const L = this.logic;
    if (!L) { this.cancel(); return; }
    const out = () => {
      if (this.logic !== L) return;
      this.finish();
      this.stopListening();
      audio.stop();
      this.acting?.release(0);
      this.leaving = false;
      this.logic = null;
      this.arrows.clear();
      this.scene?.end();
      this.game.dressPlayer(null);
      this.game.hideNpc(this.content.npc, false);
      this.game.rig.stage = null;
      useSurf.getState().reset();
      useStore.getState().setHud({ ride: null, prompt: null });
      const s = this.spot.start;
      this.game.left(s.x, s.z, s.rot);
    };
    if (now) out();
    else if (!this.leaving) {
      this.leaving = true;
      if (!this.game.fade(out)) out();
    }
  }

  // --- the learner's hands ----------------------------------------------------------------------------------------

  /** One paddle stroke. */
  stroke() { this.in.strokes++; }
  /** The stand-up button (Space, the jump button): up onto the feet; in a ride, the trick. */
  up() { this.in.up = true; }
  /** An answer tapped (its cue): it is said for the learner, and she goes on. */
  choose(cue: string) { this.logic?.choose(cue, false); }
  /** The move she asked for, done by a tap on its button beside her line (as its key would). */
  act(what: Do) {
    if (this.logic?.todo?.do !== what) return;
    const dir = arrowFor(what).at(-1);
    if (dir && this.pressArrow(dir)) {
      const [x, y] = ARROW_STICK[dir];
      this.push = { x, y, t: 0.22 };
    }
  }

  /** Press or release one of the phone's arrows. */
  arrow(dir: SurfArrow, down: boolean) {
    if (!down) this.arrows.delete(dir);
    else if (this.logic && !this.arrows.has(dir)) {
      const steer = this.pressArrow(dir);
      this.arrows.set(dir, steer);
      if (steer) this.arrowFrame.add(dir);
    }
  }

  /** A press returns true when the arrow also pushes the stick while held. */
  private pressArrow(dir: SurfArrow): boolean {
    const L = this.logic!;
    if (dir === "up") {
      if (L.todo?.do === "paddle") { this.stroke(); return false; }
      if (L.todo?.do === "jump") { this.up(); return false; }
    }
    // Lying on the board, the arrows to either side are the two arms.
    if ((dir === "left" || dir === "right") && (L.phase === "out" || L.phase === "catch")) this.stroke();
    return true;
  }
  /** Her line once more (a tap on it): the microphone waits for her to finish. */
  repeat() {
    const L = this.logic, line = useSurf.getState().line;
    if (!L || !line || L.talking || this.leaving) return;
    const turn = L.choice;
    const resumeMic = this.speech?.running || this.listenT !== null;
    this.stopListening("replay instructor");
    const slow = !!useStore.getState().settings.slowVoice;
    // (the live mic fix: the microphone comes back for the same turn only, and only if the replay was heard)
    this.voiceCoach(line.cue, line.s.say, slow, undefined, (played?: boolean) => {
      if (played !== false && resumeMic && turn && this.logic === L && L.choice === turn && !this.leaving) this.listen();
    });
  }

  // --- the learner's turn to speak ----------------------------------------------------------------------------------

  /** The microphone on or off for this lesson (its button): off, the answers are tapped. */
  setMic(on: boolean) {
    useSurf.getState().set({ micOn: on });
    if (!on) this.stopListening("mic toggled off"); else if (this.logic?.choice) { this.unclear = 0; this.listen(); }
  }

  private coachActor(): ActingTarget | undefined {
    const scene = this.scene, actor = scene?.coach;
    if (actor && scene.group.visible) return { actor, id: this.content.npc, action: () => scene.demonstrating };
  }

  private voiceCoach(key: string, text: string, slow: boolean, duration?: number, after?: () => void) {
    const npc = this.npc, voice = npcVoice(npc), speed = npc?.speed ?? 1;
    const options = { slow, male: npc?.gender === "m" };
    const target = this.coachActor();
    const acting = target && (this.acting ??= this.game.acting?.());
    if (acting && target) {
      acting.play(target, key, duration ?? audio.clipDuration(voice, speed, text) ?? 2,
        voice, speed, text, options, duration === undefined, after);
    } else {
      const played = audio.play(voice, speed, text, options);
      if (after) void played.then(after);
    }
  }

  /** A voice is being heard right now (hers, or the learner's line said for them). */
  private heardNow() { const st = audio.getState(); return st === "loading" || st === "playing"; }

  /** The microphone opens for the answers on show: what is heard is held against each of them. */
  listen(waited = 0) {
    const L = this.logic, ui = useSurf.getState();
    if (this.listenT) { clearTimeout(this.listenT); this.listenT = null; }
    if (!L?.choice || L.choice !== this.lastChoice || !ui.choice?.options.length || !ui.micOn || !speechSupported() ||
        this.speech?.running || this.leaving || this.paused || useStore.getState().hud.panel || document.visibilityState !== "visible") return;
    // Give an audible line time to finish. Bound the wait for a recording that stalls while loading.
    const voice = audio.getState();
    if (voice === "playing" || (voice === "loading" && waited < 6000)) {
      this.listenT = setTimeout(() => { this.listenT = null; this.listen(waited + 200); }, 200);
      return;
    }
    const turn = L.choice, options = ui.choice.options;
    const best = (text: string) => {
      let top: { cue: string; score: number } | null = null;
      for (const o of options) { const score = compareRepeat(o.s.en, text).score; if (!top || score > top.score) top = { cue: o.cue, score }; }
      return top;
    };
    if (voice !== "idle") audio.stop(); // release a stalled playback request before opening the mic
    const attempt = createSpeechAttempt({
      source: "surf",
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

  stopListening(reason = "surf stopped") {
    if (this.listenT) { clearTimeout(this.listenT); this.listenT = null; }
    if (this.speech) { const a = this.speech; this.speech = null; a.dispose(reason); }
    const ui = useSurf.getState();
    if (ui.mic.status !== "unsupported" && ui.mic.status !== "off") ui.set({ mic: { status: "off", heard: ui.mic.heard } });
  }

  /** The learner has answered (the rules ask): aloud, and she goes on at once; by a tap, and their line is said for
   *  them first, in the voice the learner's examples have. */
  private answer(cue: string, spoken: boolean): number {
    this.stopListening("answer selected");
    if (!this.answered.includes(cue)) this.answered.push(cue);
    const s = this.line(cue);
    useSurf.getState().set({ said: s ? { cue, s } : null, mic: speechSupported() ? NO_MIC : { status: "unsupported", heard: "" } });
    if (!s || spoken) { this.acting?.react("understood"); return 0.15; }
    const voice = coachVoice(useStore.getState().progress.profile?.gender);
    // (a line with no recording yet is only shown)
    const secs = audio.clipDuration(voice, 1, s.say);
    if (secs == null) { this.acting?.react("understood"); return 0.5; }
    if (this.acting) this.acting.playLearner(voice, s.say);
    else void audio.play(voice, 1, s.say);
    return secs;
  }
  /** A key while a lesson is on: true when it was the lesson's. */
  key(k: string, repeat: boolean, keys: Set<string>): boolean {
    const L = this.logic;
    if (!L) return false;
    k = k.toLowerCase();
    const dir = ARROW_KEYS.get(k);
    if (dir) {
      if (!repeat) {
        useSurf.getState().set({ keyFlash: dir });
        this.keyFlashT = 0.2;
        if (this.pressArrow(dir)) keys.add(k);
        else keys.delete(k);
      }
      return true;
    }
    if (k === " ") { if (!repeat) this.up(); return true; }
    if (k === "e" || k === "enter") { if (!repeat) this.stroke(); return true; }
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
    this.voiceCoach(cue, s.say, slow, secs);
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

  /** `x`, `y`: the stick or the keys; `paused`: a panel is open. */
  update(dt: number, t: number, x: number, y: number, paused: boolean) {
    const L = this.logic;
    if (!L) return;
    L.setSlow(!!useStore.getState().settings.slowVoice);
    for (const [dir, steer] of this.arrows) if (steer) this.arrowFrame.add(dir);
    for (const dir of this.arrowFrame) {
      const [dx, dy] = ARROW_STICK[dir];
      x += dx; y += dy;
    }
    this.arrowFrame.clear();
    // (a tap on the move's button pushes the stick for a moment)
    if (this.push.t > 0) { this.push.t -= dt; x = this.push.x; y = this.push.y; }
    const inp: SurfInput = { x: THREE.MathUtils.clamp(x, -1, 1), y: THREE.MathUtils.clamp(y, -1, 1), stroke: this.in.strokes > 0 && !paused, up: this.in.up && !paused };
    this.in.strokes = paused ? 0 : Math.max(0, this.in.strokes - 1);
    this.in.up = false;
    // (a panel over the lesson: the microphone closes, and opens again with the lesson)
    if (paused !== this.paused) {
      this.paused = paused;
      this.acting?.pause(paused);
      if (paused) this.stopListening("lesson paused"); else if (L.choice) this.listen();
    }
    this.scene?.update(dt, t, inp, paused);
    this.sync(dt);
  }

  private sync(dt: number) {
    const L = this.logic!, ui = useSurf.getState(), patch: Partial<typeof ui> = {};
    if (ui.keyFlash) {
      this.keyFlashT -= dt;
      if (this.keyFlashT <= 0) patch.keyFlash = null;
    }
    if (ui.phase !== L.phase) patch.phase = L.phase;
    if (this.scene?.demonstrating) {
      if (ui.line) patch.line = null;
      if (ui.said && this.scene.demoState !== "paddle") patch.said = null;
    }
    const turn = L.choice !== this.lastChoice;
    if (turn) {
      this.lastChoice = L.choice;
      const actor = L.choice ? this.coachActor() : undefined;
      if (actor) (this.acting ??= this.game.acting?.())?.listen(actor, true);
      else this.acting?.listen(undefined, false);
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
      this.stopListening("learner turn changed");
      if (L.choice) this.listenT = setTimeout(() => { this.listenT = null; this.listen(); }, 250);
    }
    // the round button on a phone is the paddle while paddling is what she asked for
    const hud = useStore.getState().hud, paddling = L.todo?.do === "paddle";
    if (paddling !== (hud.prompt?.kind === "paddle")) useStore.getState().setHud({ prompt: paddling ? { label: "", kind: "paddle" } : null });
  }
}
