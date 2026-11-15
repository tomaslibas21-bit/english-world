// The surf lesson as the game runs it: started at the school's boards or by its conversation ("¿Probamos una ola?"),
// the instructor's lines said in her voice and shown on the card (src/ui/Surf.tsx), the learner's keys and buttons
// handed to the rules (logic.ts), the score and what was heard kept (progress.surf, the phrase cards). Game.ts only
// asks it "is a lesson on?" and hands it the frame.
import { audio } from "../audio";
import { NPCS } from "../../content/npcs";
import { SITUATION_BY_ID } from "../../content/situations";
import { npcVoice } from "../../content/voices";
import { compose, type Sentence } from "../../convo/compose";
import { useStore } from "../../state/store";
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

  constructor(private spot: SurfSpot, private content: SurfContent, private game: SurfGame) {
    this.scene = new Surf(spot, { get player() { return game.player(); }, splash: game.splash, portrait: game.portrait });
  }

  get group() { return this.scene.group; }
  get active() { return !!this.logic; }
  get heading() { return this.scene.heading; }
  /** Near enough to the school's boards for its prompt. */
  near(x: number, z: number) { return this.reach(x, z) < Infinity; }
  /** How far the school's boards are (m), Infinity beyond their prompt's reach. */
  reach(x: number, z: number) { const d = Math.hypot(x - this.spot.start.x, z - this.spot.start.z); return d < this.spot.start.r ? d : Infinity; }
  get npc() { return NPCS[this.content.npc]; }

  /** A cue's line in the Spanish chosen now, as the instructor says it to this learner (the answers: as the learner
   *  says them); null where the edition has none. */
  line(cue: string): Sentence | null {
    const src = SITUATION_BY_ID[this.content.situation]?.lines["sg_" + cue]?.[0] ?? this.content.lines?.["sg_" + cue]?.[0];
    if (!src) return null;
    const npc = this.npc, me = useStore.getState().progress.profile?.gender ?? "f", her = npc?.gender ?? "f";
    const mine = cue.startsWith("a_");
    return compose(src, {}, { look: () => undefined, addressee: mine ? her : me, speaker: mine ? me : her, formal: !npc?.informal });
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
    this.game.fade(() => this.launch(level));
  }

  private launch(level: Level) {
    const st = useStore.getState(), s = this.saved();
    this.level = level;
    this.heard = { ...s.heard };
    this.answered = [];
    this.in.stroke = this.in.up = false;
    this.overShown = false;
    this.lastChoice = null;
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
    useSurf.getState().set({ line: { cue, s }, support: supportFor(n) });
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
