import * as THREE from "three";
import { audio } from "../audio";
import { NPCS } from "../../content/npcs";
import { coachVoice, npcVoice } from "../../content/voices";
import type { Sentence } from "../../convo/compose";
import { createSpeechAttempt, speechSupported } from "../../convo/speech";
import { answerProgress, bestAnswer, conversationLine } from "../kit/lines";
import { useStore } from "../../state/store";
import { countPlay } from "../../state/playStats";
import { keepPhrases } from "../kit/phrases";
import type { SurfContent } from "../../content/surf";
import type { SurfSpot } from "../world/surf";
import type { ModeHost } from "../kit/host";
import type { GameCharacter } from "../characters";
import { Surf } from "./Surf";
import { SurfOutfit, surfLook } from "./outfit";
import { ARROW_BITS, KEY_DIRECTION, arrowFor, type SurfArrow } from "./controls";
import { COMMANDS, SurfLogic, type Do, type Level, type SurfInput } from "./logic";
import { EMPTY_SCORE, NO_MIC, useSurf, type SurfLine, type SurfUi } from "./store";

export type SurfGame = Pick<ModeHost, "player" | "rig" | "time" | "add" | "canStart" | "fade" | "hideNpc"
  | "entered" | "left" | "owns" | "splash" | "prepare" | "place" | "updatePose">;

/** The lines that become phrase cards once heard: the commands one acts on, the questions, the rewards. */
const CARDS = new Set([
  ...COMMANDS.map((c) => c.cue), "paddle", "paddle_hard", "wave_duck", "this_one", "not_this", "let_pass", "turn", "turn_shore", "now_up",
  "board_ask", "what_happened", "wipeout", "missed", "q_go", "again_q", "slang1", "slang2", "slang3", "slang4",
  "coming", "not_yet", "ride_q", "you_ok",
]);
const KEEPS_PICTURE = new Set(["good1", "good2", "good3", "r_exact", "not_yet", "ride_q", "easy"]);
const KNOWN = 7, HESITATE = 2;
const RIDE_DOES = new Set<Do>(["left", "right", "down", "fwd", "steady", "jump"]);
const HEARD_ENOUGH = 0.75, HEARD_ONLY = 0.6;
const UNSUPPORTED: SurfUi["mic"] = { status: "unsupported", heard: "" };
const voiceLevel = () => audio.level();
const voiceVowel = () => audio.vowel();

export class SurfPlay {
  readonly scene: Surf;
  readonly outfit: SurfOutfit;
  readonly loaded: HTMLImageElement[] = [];
  logic: SurfLogic | null = null;
  private level: Level = "beginner";
  private roundReady = false;
  private closing = false;
  private replaying = false;
  private npcWasVisible = true;
  private npcHidden = false;
  private inp: SurfInput = { x: 0, y: 0, stroke: false, up: false };
  private strokes = 0;
  private upPressed = false;
  private pending = 0;
  private touchHeld = 0;
  private touchSteer = 0;
  private keySteer = 0;
  private keys = new Map<string, SurfArrow>();
  private keyFlashT = 0;
  private lastChoice: SurfLogic["choice"] = null;
  private lastTodo: SurfLogic["todo"] = null;
  private todoT = 0;
  private markT = 0;
  private strokeT = 0;
  private resetT = 0;
  private heard: Record<string, number> = {};
  private answered: string[] = [];
  private lastPic: string | undefined;
  private speech: ReturnType<typeof createSpeechAttempt> | null = null;
  private listenT: ReturnType<typeof setTimeout> | null = null;
  private unclear = 0;
  private paused = false;
  private readonly rulesHost = {
    say: (cue: string) => this.say(cue),
    answer: (cue: string, spoken: boolean) => this.answer(cue, spoken),
    fx: (name: string) => this.fx(name),
    rnd: Math.random,
    busy: () => this.heardNow(),
  };

  constructor(private spot: SurfSpot, private content: SurfContent, private game: SurfGame, replacePlayer: (player: GameCharacter) => void) {
    this.outfit = new SurfOutfit(game.player, replacePlayer);
    this.scene = new Surf(spot, { get player() { return game.player(); }, splash: game.splash,
      get aspect() { return game.rig.cam.aspect; } }, new THREE.Group());
    game.add(this.scene.group);
  }

  get active() { return !!this.logic; }
  get npc() { return NPCS[this.content.npc]; }

  /** The authored line, composed for the person saying it. */
  line(cue: string): Sentence | null {
    const mine = cue.startsWith("a_") || cue.startsWith("b_");
    return conversationLine(this.content.situation, this.content.npc, "sg_" + cue, this.content.lines, mine);
  }

  /** The picture of what a cue asks for (its URL), where the edition has one. */
  picture(cue: string): string | undefined {
    const P = this.content.pictures, name = P?.of[cue];
    return P && name ? `${import.meta.env.BASE_URL}${P.dir}/${name}.webp` : undefined;
  }

  launch(level: Level) {
    const st = useStore.getState(), best = st.progress.surf;
    this.level = level;
    this.roundReady = false;
    this.heard = { ...best?.heard };
    this.answered.length = 0;
    this.lastChoice = this.lastTodo = null;
    this.lastPic = undefined;
    this.unclear = this.markT = this.strokeT = this.todoT = 0;
    this.paused = this.closing = this.replaying = false;
    this.clearInput();
    const pictures = this.content.pictures;
    if (pictures && !this.loaded.length) {
      for (const name of new Set(Object.values(pictures.of))) {
        const image = new Image();
        image.src = `${import.meta.env.BASE_URL}${pictures.dir}/${name}.webp`;
        this.loaded.push(image);
      }
    }
    this.logic = new SurfLogic(this.rulesHost, { level, rides: best?.waves ?? 0, slow: !!st.settings.slowVoice });
    if (!this.npcHidden) {
      this.game.prepare();
      this.outfit.enter();
      this.npcWasVisible = this.game.hideNpc(this.content.npc, true) ?? true;
      this.npcHidden = true;
      this.game.entered("surf");
    }
    this.scene.begin(this.logic, surfLook({ ...this.npc.look, female: this.npc.gender === "f" }), this.game.time());
    this.game.rig.mode = "stage";
    this.game.rig.stage = this.scene.cam;
    this.game.rig.stageSnap();
    this.game.updatePose(0, this.scene.heading);
    this.roundReady = true;
    countPlay("games", "surf");
    useSurf.getState().set({
      active: true, picking: false, level, phase: this.logic.phase, line: null, choice: null, todo: null, said: null,
      mic: speechSupported() ? NO_MIC : UNSUPPORTED, support: 0, balance: 1, asked: false, mark: null,
      score: EMPTY_SCORE, over: false, best: { waves: best?.waves ?? 0, seconds: best?.seconds ?? 0 }, keyFlash: null,
      pressed: 0, finishedStrokes: 0,
    });
    st.setHud({ prompt: null, ride: "surf" });
  }

  private again(level: Level = this.level) {
    const round = this.logic;
    if (!round || this.closing || this.replaying || round.phase !== "over") return;
    if (!this.game.fade(() => {
      if (!this.game.owns("surf") || this.logic !== round || this.closing) return;
      this.finish();
      this.launch(level);
    })) return;
    this.replaying = true;
    this.clearInput();
    audio.stop();
    this.stopListening();
  }

  private finish() {
    const L = this.logic;
    if (!L || !this.roundReady) return;
    this.roundReady = false;
    const sc = L.score;
    useStore.getState().updateProgress((p) => {
      const s = p.surf ?? { waves: 0, seconds: 0, followed: 0, asked: 0, lessons: 0, heard: {} };
      s.waves += sc.waves; s.seconds += sc.seconds; s.followed += sc.followed; s.asked += sc.asked; s.lessons += 1;
      s.heard = { ...this.heard };
      p.surf = s;
    });
    keepPhrases(this.content.situation, [...L.heard.filter((c) => CARDS.has(c)), ...this.answered]
      .flatMap((cue) => { const sentence = this.line(cue); return sentence ? [sentence] : []; }));
  }

  stop(immediate = false) {
    const round = this.logic;
    if (!round || (!immediate && this.closing)) return;
    const out = () => {
      if (this.logic !== round) return;
      try { this.finish(); } finally {
        this.logic = null;
        this.scene.end();
        this.outfit.restore();
        if (this.npcHidden) this.game.hideNpc(this.content.npc, !this.npcWasVisible);
        this.npcHidden = false;
        const { rig } = this.game;
        // The camera looks along the beach from the west, clear of the rack, while the learner still faces the water.
        const yaw = useStore.getState().settings.cameraFollow && !rig.manuallyAiming ? Math.PI / 2 : rig.yaw;
        rig.stage = null;
        const s = this.spot.start;
        this.game.place(s.x, s.z, s.rot);
        rig.snap(yaw);
        this.strokeT = 0;
        useSurf.getState().reset();
        useStore.getState().setHud({ ride: null, prompt: null });
        this.game.left("surf");
      }
    };
    this.closing = true;
    this.clearInput();
    this.stopListening();
    this.clearReset();
    audio.stop();
    if (immediate || !this.game.fade(out)) out();
  }

  dispose() {
    this.stop(true);
    this.scene.dispose();
    this.outfit.dispose();
  }

  private get acceptingInput() {
    return !!this.logic && !this.closing && !this.replaying && !this.scene.demonstrating && this.logic.phase !== "over";
  }

  stroke() { if (this.acceptingInput) this.strokes++; }
  up() { if (this.acceptingInput) this.upPressed = true; }
  private choose(cue: string) { if (this.acceptingInput) this.logic!.choose(cue, false); }

  private press(dir: SurfArrow) {
    const L = this.logic!;
    if (dir === "up" && L.todo?.do === "paddle") { this.stroke(); return false; }
    if (dir === "up" && (L.phase === "catch" || L.todo?.do === "jump")) { this.up(); return false; }
    // The side keys also paddle while lying on the board.
    if ((dir === "left" || dir === "right") && L.todo?.do === "paddle") { this.stroke(); return false; }
    this.pending |= ARROW_BITS[dir];
    return true;
  }

  private arrow(dir: SurfArrow, down: boolean) {
    const bit = ARROW_BITS[dir];
    if (down) {
      if (!this.acceptingInput || (this.touchHeld & bit)) return;
      this.touchHeld |= bit;
      if (this.press(dir)) this.touchSteer |= bit;
    } else {
      this.touchHeld &= ~bit;
      this.touchSteer &= ~bit;
    }
    const ui = useSurf.getState();
    if (ui.pressed !== this.touchHeld) ui.set({ pressed: this.touchHeld });
  }

  private releaseKey(key: string) {
    if (!this.keys.delete(key)) return;
    this.keySteer = 0;
    for (const dir of this.keys.values()) this.keySteer |= ARROW_BITS[dir];
  }

  private clearInput() {
    this.keys.clear();
    this.strokes = this.pending = this.touchHeld = this.touchSteer = this.keySteer = 0;
    this.upPressed = false;
    this.keyFlashT = 0;
    this.logic?.releaseInput();
    const ui = useSurf.getState();
    if (ui.pressed || ui.keyFlash) ui.set({ pressed: 0, keyFlash: null });
  }

  action(name: string, value?: string | boolean) {
    if (name === "clear") { this.clearInput(); return; }
    if (name === "key-up") { this.releaseKey(String(value)); return; }
    if (name.startsWith("arrow:")) {
      const dir = name.slice(6) as SurfArrow;
      if (Object.hasOwn(ARROW_BITS, dir)) this.arrow(dir, value === true);
      return;
    }
    switch (name) {
      case "choose": this.choose(String(value)); break;
      case "act": {
        const what = this.logic?.todo?.do;
        if (!this.acceptingInput || !what || what !== value) break;
        const arrows = arrowFor(what), dir = arrows[arrows.length - 1];
        if (dir) this.press(dir);
        break;
      }
      case "repeat": this.repeat(); break;
      case "mic": if (value === "finish") this.finishListening(); else this.setMic(value === true); break;
      case "again": this.again(value === "advanced" || value === "beginner" ? value : undefined); break;
    }
  }

  private repeat() {
    const L = this.logic, ui = useSurf.getState(), npc = this.npc;
    if (!L || !ui.line || L.talking || !this.acceptingInput) return;
    const voice = npcVoice(npc), speed = npc?.speed ?? 1, { say } = ui.line.s;
    if (!audio.hasClip(voice, speed, say)) return;
    const turn = L.choice;
    const resumeMic = this.speech?.running || this.listenT !== null;
    this.stopListening("replay instructor");
    const slow = !!useStore.getState().settings.slowVoice;
    void audio.play(voice, speed, say, { slow, male: npc?.gender === "m" }).then((played) => {
      if (played && resumeMic && turn && this.logic === L && L.choice === turn) this.listen();
    });
  }

  // --- the learner's turn to speak ----------------------------------------------------------------------------------

  /** The microphone on or off for this lesson (its button): off, the answers are tapped. */
  setMic(on: boolean) {
    useSurf.getState().set({ micOn: on });
    if (!on) this.stopListening("mic toggled off"); else if (this.logic?.choice) { this.unclear = 0; this.listen(); }
  }

  /** A voice is being heard right now (hers, or the learner's line said for them). */
  private heardNow() { const st = audio.getState(); return st === "loading" || st === "playing"; }

  /** The microphone opens for the answers on show: what is heard is held against each of them. */
  listen(waited = 0) {
    const L = this.logic, ui = useSurf.getState();
    if (this.listenT) { clearTimeout(this.listenT); this.listenT = null; }
    if (!L?.choice || L.choice !== this.lastChoice || !ui.choice?.options.length || !ui.micOn || !speechSupported() ||
        this.speech?.running || this.paused || !this.acceptingInput || useStore.getState().hud.panel || typeof document === "undefined" ||
        document.visibilityState !== "visible") return;
    // Give an audible line time to finish. Bound the wait for a recording that stalls while loading.
    const voice = audio.getState();
    if (voice === "playing" || (voice === "loading" && waited < 6000)) {
      this.listenT = setTimeout(() => { this.listenT = null; this.listen(waited + 200); }, 200);
      return;
    }
    const turn = L.choice, options = ui.choice.options;
    const phrases = options.map((o) => o.s.en);
    if (voice !== "idle") audio.stop(); // release a stalled playback request before opening the mic
    const attempt = createSpeechAttempt({
      source: "surf",
      evaluate: (text) => answerProgress(phrases, text),
      phrases,
      preferLocal: useStore.getState().settings.onDevice,
      onUpdate: (s) => {
        if (this.speech !== attempt) return;
        const status = s.status === "idle" ? "off" : s.status === "reconnecting" ? "listening" : s.status;
        useSurf.getState().set({ mic: { status, heard: s.heard, error: s.error } });
        // (nothing heard, or no microphone: the answers stay there to tap, the button turns it on again)
        if (s.status === "nothing" || s.status === "denied" || s.status === "error") { this.speech = null; attempt.dispose(); }
      },
      onCommit: (text, alts) => {
        if (this.speech !== attempt || this.logic?.choice !== turn || !this.acceptingInput || useStore.getState().hud.panel) return;
        this.speech = null;
        attempt.dispose();
        const top = bestAnswer(options, (option) => option.s.en, [text, ...alts]);
        if (top && top.score >= (options.length === 1 ? HEARD_ONLY : HEARD_ENOUGH)) { this.unclear = 0; this.logic?.choose(top.option.cue, true); return; }
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
    useSurf.getState().set({ said: s ? { cue, s } : null, mic: speechSupported() ? NO_MIC : UNSUPPORTED });
    if (!s || spoken) return 0.15;
    const voice = coachVoice(useStore.getState().progress.profile?.gender);
    // (a line with no recording yet is only shown)
    const secs = audio.clipDuration(voice, 1, s.say);
    if (secs == null) return 0.5;
    void audio.play(voice, 1, s.say);
    return secs;
  }
  key(key: string, repeat: boolean) {
    const dir = KEY_DIRECTION.get(key);
    const digit = key.length === 1 && key >= "1" && key <= "3";
    if (!dir && !digit && key !== " " && key !== "e" && key !== "enter" && key !== "m") return false;
    if (repeat || !this.acceptingInput) return true;
    if (dir) {
      this.keyFlashT = 0.2;
      useSurf.getState().set({ keyFlash: dir });
      if (this.press(dir)) {
        this.keys.set(key, dir);
        this.keySteer |= ARROW_BITS[dir];
      }
    } else if (key === " ") this.up();
    else if (key === "e" || key === "enter") this.stroke();
    else if (key === "m") this.setMic(!useSurf.getState().micOn);
    else if (digit) {
      const cue = this.logic!.choice?.options[Number(key) - 1];
      if (cue) this.choose(cue);
    }
    return true;
  }

  private say(cue: string): number {
    const s = this.line(cue);
    if (!s) return 0.8;
    const npc = this.npc, voice = npcVoice(npc), speed = npc?.speed ?? 1;
    const slow = !!useStore.getState().settings.slowVoice;
    const duration = audio.clipDuration(voice, speed, s.say);
    const seconds = (duration ?? 0.45 + s.say.length * 0.058) / (slow ? 0.82 : 1);
    if (duration !== null) {
      void audio.play(voice, speed, s.say, { slow, male: npc?.gender === "m" });
      this.scene.coach?.talk(seconds, voiceLevel, voiceVowel);
    }
    const n = this.heard[cue] ?? 0;
    this.heard[cue] = n + 1;
    const pic = this.picture(cue) ?? (KEEPS_PICTURE.has(cue) ? this.lastPic : undefined);
    this.lastPic = pic;
    useSurf.getState().set({ line: { cue, s, pic }, support: n < 3 ? 0 : n < KNOWN ? 1 : 2, said: null });
    return seconds;
  }

  private fx(name: string) {
    this.scene.fx(name, this.game.time());
    switch (name) {
      case "duck": audio.splash(0.6); break;
      case "tumble": audio.surfWipeout(); break;
      case "missed": audio.wash(); break;
      case "flip": audio.jump(1.4); break;
      case "cheer": audio.sfx("cheer"); break;
      case "right": case "wrong":
        audio.sfx(name === "right" ? "pop" : "soft");
        useSurf.getState().set({ mark: name === "right" ? "ok" : "no" });
        this.markT = 0.9;
        break;
      case "reset":
        this.clearInput();
        useStore.getState().setHud({ fade: 1, fadeOnFrames: false });
        this.resetT = 0.43;
        break;
    }
  }

  private clearReset() {
    if (this.resetT <= 0) return;
    this.resetT = 0;
    useStore.getState().setHud({ fade: 0 });
  }

  update(dt: number, t: number, x: number, y: number, blocked: boolean) {
    const L = this.logic!;
    L.setSlow(!!useStore.getState().settings.slowVoice);
    const paused = blocked || this.closing || this.replaying;
    if (paused !== this.paused) {
      this.paused = paused;
      if (paused) { this.clearInput(); this.stopListening("lesson paused"); }
      else if (L.choice) this.listen();
    }
    const keys = this.pending | this.touchSteer | this.keySteer;
    const inp = this.inp, demo = this.scene.demonstrating;
    inp.x = paused ? 0 : THREE.MathUtils.clamp(x + Number(!!(keys & ARROW_BITS.right)) - Number(!!(keys & ARROW_BITS.left)), -1, 1);
    inp.y = paused ? 0 : THREE.MathUtils.clamp(y + Number(!!(keys & ARROW_BITS.up)) - Number(!!(keys & ARROW_BITS.down)), -1, 1);
    inp.stroke = !paused && !demo && this.strokes > 0;
    inp.up = !paused && !demo && this.upPressed;
    this.strokes = inp.stroke ? this.strokes - 1 : 0;
    this.upPressed = false;
    this.pending = 0;
    const todo = L.todo, lastStroke = inp.stroke && todo?.do === "paddle" && todo.left === 1 ? todo.of ?? 0 : 0;
    this.scene.update(dt, t, inp, paused);
    if (!demo && this.scene.demonstrating) this.clearInput();
    if (this.resetT > 0 && !paused) {
      if (this.resetT <= dt) { this.game.rig.stageSnap(); this.clearReset(); }
      else this.resetT -= dt;
    }
    this.sync(paused ? 0 : dt, todo?.left === 0 ? lastStroke : 0);
  }

  private sync(dt: number, finished: number) {
    const L = this.logic!, ui = useSurf.getState();
    let patch: Partial<SurfUi> | undefined;
    if (ui.phase !== L.phase) (patch ??= {}).phase = L.phase;
    if (this.scene.demonstrating) {
      if (ui.line) (patch ??= {}).line = null;
      if (ui.said) (patch ??= {}).said = null;
    }
    const turn = L.choice !== this.lastChoice;
    if (turn) {
      this.lastChoice = L.choice;
      (patch ??= {}).choice = L.choice ? { id: L.choice.id, options: L.choice.options.flatMap((cue) => {
        const s = this.line(cue);
        return s ? [{ cue, s }] : [];
      }) } : null;
    }
    const t = L.todo;
    if (t !== this.lastTodo) { this.lastTodo = t; this.todoT = 0; }
    else this.todoT += dt;
    if (t) {
      const show = !RIDE_DOES.has(t.do) || (this.heard[t.cue] ?? 0) <= KNOWN || this.todoT >= HESITATE;
      const time = t.win && t.t != null ? Math.ceil(THREE.MathUtils.clamp(t.t / t.win, 0, 1) * 20) / 20 : null;
      const left = t.left ?? null, of = t.of ?? null, was = ui.todo;
      if (!was || was.do !== t.do || was.cue !== t.cue || was.left !== left || was.of !== of || was.show !== show || was.time !== time) {
        (patch ??= {}).todo = { do: t.do, cue: t.cue, left, of, time, show };
      }
    } else if (ui.todo) (patch ??= {}).todo = null;
    const balance = Math.round(Math.max(0, L.balance) * 20) / 20;
    if (ui.balance !== balance) (patch ??= {}).balance = balance;
    const asked = !!L.cmd;
    if (ui.asked !== asked) (patch ??= {}).asked = asked;
    const sc = L.score, was = ui.score;
    if (was.waves !== sc.waves || was.seconds !== sc.seconds || was.followed !== sc.followed || was.asked !== sc.asked || was.falls !== sc.falls) (patch ??= {}).score = { ...sc };
    if (this.markT > 0 && (this.markT -= dt) <= 0) (patch ??= {}).mark = null;
    if (this.keyFlashT > 0 && (this.keyFlashT -= dt) <= 0) (patch ??= {}).keyFlash = null;
    if (finished) {
      this.strokeT = 0.65;
      (patch ??= {}).finishedStrokes = finished;
    } else if (this.strokeT > 0 && (this.strokeT -= dt) <= 0) {
      this.strokeT = 0;
      (patch ??= {}).finishedStrokes = 0;
    }
    if (L.phase === "over" && !ui.over) {
      (patch ??= {}).over = true;
      patch.line = null;
    }
    if (patch) ui.set(patch);
    if (turn) {
      this.unclear = 0;
      this.stopListening("learner turn changed");
      if (L.choice) this.listenT = setTimeout(() => { this.listenT = null; this.listen(); }, 250);
    }
  }
}
