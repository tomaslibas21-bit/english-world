// The surf lesson as the game runs it: started at the school's boards or by its conversation ("¿Probamos una ola?"),
// the instructor's lines said in her voice and shown on the card (src/ui/Surf.tsx), the learner's keys and buttons
// handed to the rules (logic.ts), the score and what was heard kept (progress.surf, the phrase cards). Game.ts only
// asks it "is a lesson on?" and hands it the frame.
import * as THREE from "three";
import { floorY } from "../water";
import { audio } from "../audio";
import { NPCS } from "../../content/npcs";
import { getSituation, loadSituation, prefetchSituations } from "../../content/situations/catalog";
import { npcVoice } from "../../content/voices";
import { compose, type Sentence } from "../../convo/compose";
import { useStore } from "../../state/store";
import { countPlay } from "../../state/playStats";
import { sentenceInput, useCards } from "../../state/cards";
import type { SurfContent } from "../../content/surf";
import type { SurfSpot } from "../world/surf";
import type { CameraRig } from "../camera";
import type { GameCharacter } from "../characters";
import { Surf } from "./Surf";
import { COMMANDS, SurfLogic, type Level, type SurfInput } from "./logic";
import { EMPTY_SCORE, useSurf, type SurfLine } from "./store";

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
]);
/** How often a line has been heard before its help fades: its glosses and meaning, then the Spanish alone, then only
 *  the voice. */
/** Short praise keeps the picture of the command it praises (the card doesn't change shape between two commands). */
const KEEPS_PICTURE = new Set(["good1", "good2", "good3", "r_exact"]);
const supportFor = (heard: number): 0 | 1 | 2 => (heard < 3 ? 0 : heard < 7 ? 1 : 2);

export class SurfPlay {
  scene: Surf;
  private logic: SurfLogic | null = null;
  private level: Level = "beginner";
  private in = { stroke: false, up: false };
  private lastChoice: unknown = null;
  private markT = 0;
  private heard: Record<string, number> = {};
  private answered: string[] = [];
  private overShown = false;
  private lastPic: string | undefined;
  private loaded: HTMLImageElement[] = [];

  /** Where the lesson starts: a ring on the sand, as at a counter's talk spot, pulsing gently (Game adds it to the
   *  scene and calls tick). */
  marker = new THREE.Group();
  private ringT = 0;

  constructor(private spot: SurfSpot, private content: SurfContent, private game: SurfGame) {
    this.scene = new Surf(spot, { get player() { return game.player(); }, splash: game.splash, portrait: game.portrait });
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

  get group() { return this.scene.group; }
  get active() { return !!this.logic; }
  get heading() { return this.scene.heading; }
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
    const mine = cue.startsWith("a_");
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
  cancel() { useSurf.getState().set({ picking: false }); }

  start(level: Level) {
    if (this.active) return;
    useSurf.getState().set({ picking: false });
    // (its lines in the learner's language are its conversation's: here already when the school was near)
    const id = this.content.situation;
    if (!id || getSituation(id)) { this.game.fade(() => this.launch(level)); return; }
    loadSituation(id).catch(() => null).then(() => { if (!this.active) this.game.fade(() => this.launch(level)); });
  }

  private launch(level: Level) {
    const st = useStore.getState(), s = this.saved();
    this.level = level;
    this.heard = { ...s.heard };
    this.answered = [];
    this.in.stroke = this.in.up = false;
    this.overShown = false;
    this.lastChoice = null;
    this.lastPic = undefined;
    this.preload();
    countPlay("games", "surf");
    this.logic = new SurfLogic({ say: (cue) => this.say(cue), fx: (name) => this.fx(name), rnd: Math.random }, { level, rides: s.waves, slow: !!st.settings.slowVoice });
    this.game.entered();
    this.game.hideNpc(this.content.npc, true);
    this.scene.begin(this.logic, this.npc.look);
    this.game.rig.mode = "stage";
    this.game.rig.stage = this.scene.cam;
    this.game.rig.stageSnap();
    useSurf.getState().set({ active: true, picking: false, level, phase: this.logic.phase, line: null, choice: null, support: 0, balance: 1, asked: false, mark: null, score: { ...EMPTY_SCORE }, over: false, best: { waves: s.waves, seconds: s.seconds } });
    st.setHud({ prompt: null, ride: "surf" });
  }

  /** Another lesson, from the beach (the score card's "Otra vez"): the same level, or the other one. */
  again(level: Level = this.level) {
    if (!this.logic) return;
    audio.stop();
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
      audio.stop();
      this.logic = null;
      this.scene.end();
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
  /** An answer tapped (its cue). */
  choose(cue: string) {
    const L = this.logic;
    if (!L?.choice) return;
    if (cue.startsWith("a_") && !this.answered.includes(cue)) this.answered.push(cue);
    L.choose(cue);
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
    this.scene.coach?.talk(secs, () => audio.level(), () => audio.vowel());
    const n = this.heard[cue] ?? 0;
    this.heard[cue] = n + 1;
    const pic = this.picture(cue) ?? (KEEPS_PICTURE.has(cue) ? this.lastPic : undefined);
    this.lastPic = pic;
    useSurf.getState().set({ line: { cue, s, pic }, support: supportFor(n) });
    return secs;
  }

  private fx(name: string) {
    this.scene.fx(name, this.game.time());
    const ui = useSurf.getState();
    switch (name) {
      case "stroke": audio.splash(0.2); break;
      case "duck": audio.splash(0.6); break;
      case "tumble": case "wipeout": audio.splash(1); break;
      case "missed": audio.wash(); break;
      case "pop": audio.jump(); break;
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
    const inp: SurfInput = { x, y, stroke: this.in.stroke && !paused, up: this.in.up && !paused };
    this.in.stroke = this.in.up = false;
    this.scene.update(dt, t, inp, paused);
    this.sync(dt);
  }

  private sync(dt: number) {
    const L = this.logic!, ui = useSurf.getState(), patch: Partial<typeof ui> = {};
    if (ui.phase !== L.phase) patch.phase = L.phase;
    if (L.choice !== this.lastChoice) {
      this.lastChoice = L.choice;
      patch.choice = L.choice ? { id: L.choice.id, options: L.choice.options.map((cue) => ({ cue, s: this.line(cue) })).filter((o): o is SurfLine => !!o.s) } : null;
    }
    const bal = Math.round(Math.max(0, L.balance) * 20) / 20;
    if (ui.balance !== bal) patch.balance = bal;
    if (ui.asked !== !!L.cmd) patch.asked = !!L.cmd;
    const sc = L.score, was = ui.score;
    if (was.waves !== sc.waves || was.seconds !== sc.seconds || was.followed !== sc.followed || was.asked !== sc.asked || was.falls !== sc.falls) patch.score = { ...sc };
    if (this.markT > 0) { this.markT -= dt; if (this.markT <= 0) patch.mark = null; }
    if (L.phase === "over" && !this.overShown) { this.overShown = true; patch.over = true; patch.line = null; }
    if (Object.keys(patch).length) ui.set(patch);
    // the round button on a phone is the paddle while one lies on the board
    const hud = useStore.getState().hud, paddling = L.phase === "out" || L.phase === "catch";
    if (paddling !== (hud.prompt?.kind === "paddle")) useStore.getState().setHud({ prompt: paddling ? { label: "", kind: "paddle" } : null });
  }
}
