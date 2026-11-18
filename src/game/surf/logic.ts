// The surf lesson's rules: a conversation on the water. The instructor says one thing, then it is the learner's turn:
// they answer aloud (their lines are a_<id>, a tap works too) or do what she asked (`todo`: paddle, duck, turn, stand
// up, lean…), and only then does she go on. The sea waits with her: a wave hangs back until the learner has had their
// turn. No three.js and no sound here: the scene (Surf.ts) reads this state and shows it, the host says the cues
// (their ids are the keys of the edition's lines, "sg_<id>": src/content/surf.ts) and tells how long each one lasts.
// Tested alone (tests/surf.test.ts).
//
// The idea (the owner's, 13 Nov 2026): the instructor's spoken commands drive the game, and the learner acts on what
// they understand. 18 Nov 2026, after he played it: it must feel like every other conversation, back and forth, at a
// calm pace, the learner speaking too. Nothing here is punished: a wrong move costs balance, a fall is a question
// ("¿Qué pasó?") the learner answers, and there is always "Otra vez".

export type Level = "beginner" | "advanced";
export type Phase = "intro" | "board" | "out" | "wait" | "catch" | "ride" | "fall" | "ask" | "again" | "over";
/** What a command in a ride asks for: a lean, the knees, the weight forward, holding steady, a jump. */
export type Act = "left" | "right" | "down" | "fwd" | "steady" | "jump";
/** Everything the learner is asked to do with their hands: on the way out and catching a wave, and in the ride. */
export type Do = "paddle" | "duck" | "turn" | "up" | Act;
/** What a fall or a missed wave is blamed on (the learner's answers a_<reason>, the instructor's r_<reason>, tip_<reason>). */
export type Reason = "late" | "early" | "nopaddle" | "back" | "knees" | "feet" | "lean" | "side" | "trick";
export type Pose = "walk" | "prone" | "sit" | "stand" | "duck" | "swim";

/** One frame of the learner's hands: the stick or the arrows (x: right +, y: up +), a paddle stroke begun this frame,
 *  the stand-up (jump) button pressed this frame. */
export interface SurfInput { x: number; y: number; stroke: boolean; up: boolean }
export const NO_INPUT: SurfInput = { x: 0, y: 0, stroke: false, up: false };

/** The learner's turn to speak: the lines they may answer with (cue ids), said aloud or tapped. `id` says what the
 *  turn is: "ack" an answer that only keeps the talk going, "board" which board, "wave" is this the one, "now" is it
 *  time, "turn" whose wave it is, "ok" after a fall, "check" how it is going, "why" what went wrong, "again". */
export interface Choice { id: "ack" | "board" | "wave" | "now" | "turn" | "ok" | "check" | "why" | "again"; options: string[] }

/** The learner's turn to act: what, for which of her lines, how many strokes are left of how many (paddling), how
 *  long is left of how long where the sea won't wait (s; the stand-up, an advanced ride), how long she has waited. */
export interface Todo { do: Do; cue: string; left?: number; of?: number; t?: number; win?: number; waited: number }

export interface Wave {
  /** How far out its crest is (m from the waterline), how high (m), how fast it comes in (m/s). */
  d: number; h: number; c: number;
  /** Broken already (whitewater) or still green; the one to take. */
  white: boolean; yes: boolean;
  /** Gone past the learner. */
  past: boolean;
  /** It hangs back this far from the learner (m) while it is their turn. */
  hold?: number;
}

export interface Score { waves: number; seconds: number; followed: number; asked: number; falls: number }

export interface SurfHost {
  /** Says the cue (now, over anything still being said) and tells how long it lasts (s). */
  say(cue: string): number;
  /** The learner has answered with this line of theirs (`spoken`: aloud, else tapped): how long before she goes on (s;
   *  a tapped answer is said for them first). */
  answer(cue: string, spoken: boolean): number;
  /** Something to show or sound: "stroke", "duck", "tumble", "pop", "flip", "wipeout", "missed", "splash", "cheer",
   *  "turn", "reset", "sit", "right", "wrong". */
  fx(name: string): void;
  /** A number in [0, 1). */
  rnd(): number;
  /** A voice is still being heard (hers may start late on a phone that was listening a moment ago): the next line
   *  waits for it, a little. */
  busy?(): boolean;
}

export interface SurfOpts {
  level: Level;
  /** Waves ridden before this session (the first one ever gets its own words; the intro is shorter afterwards). */
  rides?: number;
  /** The instructor speaks slowly (the game's "Lėčiau"): more time for everything. */
  slow?: boolean;
}

interface Cfg {
  lineup: number;
  /** Paddle strokes: for each stretch of the way out, and to catch a wave. */
  strokes: number; need: number;
  /** How long the wave gives to stand up after "¡Ahora!" (s), and to follow a command in a ride (0: she waits). */
  upWin: number; react: number;
  /** The pause before her next command (s), how long a ride lasts unhindered (s), how many commands it has. */
  gap: number; ride: number; cmds: number;
  miss: number; waveH: number; ducks: number;
}
export const CFG: Record<Level, Cfg> = {
  // whitewater and a soft board: she waits for every move, three wrong ones to a fall
  beginner: { lineup: 16, strokes: 4, need: 4, upWin: 6, react: 0, gap: 0.8, ride: 14, cmds: 4, miss: 0.37, waveH: 0.8, ducks: 1 },
  // green waves beyond the break: further out, the wave won't wait long, two wrong moves
  advanced: { lineup: 24, strokes: 4, need: 6, upWin: 3, react: 5, gap: 0.7, ride: 18, cmds: 6, miss: 0.5, waveH: 1.4, ducks: 2 },
};

/** The corrections in a ride: the cue, what it asks for, and what a miss is blamed on. */
export interface Command { cue: string; act: Act; reason: Reason; adv?: boolean }
export const COMMANDS: Command[] = [
  { cue: "lean_left", act: "left", reason: "lean" }, { cue: "lean_right", act: "right", reason: "lean" },
  { cue: "left_short", act: "left", reason: "lean" }, { cue: "right_short", act: "right", reason: "lean" },
  { cue: "knees", act: "down", reason: "knees" }, { cue: "lower", act: "down", reason: "knees" },
  { cue: "look_front", act: "steady", reason: "feet" }, { cue: "not_feet", act: "steady", reason: "feet" },
  { cue: "weight_fwd", act: "fwd", reason: "back" },
  { cue: "speed", act: "fwd", reason: "back", adv: true }, { cue: "up_face", act: "fwd", reason: "back", adv: true },
  { cue: "down_face", act: "down", reason: "knees", adv: true },
  { cue: "turn_left", act: "left", reason: "lean", adv: true }, { cue: "turn_right", act: "right", reason: "lean", adv: true },
  { cue: "trick", act: "jump", reason: "trick", adv: true },
];
/** A command said again after a wrong move: in other words where she has them. */
const AGAIN: Record<string, string> = { lean_left: "left_short", lean_right: "right_short", left_short: "lean_left", right_short: "lean_right", knees: "lower", lower: "knees", look_front: "not_feet", not_feet: "look_front" };
/** The learner's own lines (cue ids): what they answer with, aloud or by a tap. */
export const ANSWERS: string[] = [
  "a_perfect", "a_ok", "a_understood", "a_ready", "a_coming", "a_vamos", "a_and_now", "a_far", "a_this", "a_this2", "a_now",
  "a_go", "a_yours", "a_fine", "a_water", "a_allgood", "a_soso", "a_thanks", "a_fun", "a_again", "a_enough",
  ...(["late", "early", "nopaddle", "back", "knees", "feet", "lean", "side", "trick"] as Reason[]).map((r) => "a_" + r),
];
/** Every cue the engine may say (the edition's lines: "sg_" + id), for the checks. */
export const CUES: string[] = [
  "start_beg", "start_adv", "listen", "board_ask", "board_take_long", "board_take_short", "board_no", "board_yes", "b_long", "b_short", "b_sup", "leash", "go_in",
  "lie", "paddle", "paddle_hard", "paddle_more", "paddle_long", "wave_duck", "duck_ok", "duck_miss", "almost", "arrive",
  "wait", "look_horizon", "not_this", "too_small", "let_pass", "not_that", "this_one", "turn", "turn_shore",
  "paddle_now", "coming", "not_yet", "now_up", "up_ok",
  ...COMMANDS.map((c) => c.cue), "hold", "good1", "good2", "good3", "ride_q", "easy",
  "prev_mine", "prev_yours", "q_go", "et_go_ok", "et_wait_ok", "et_go_wrong", "et_wait_wrong",
  "wipeout", "you_ok", "missed", "what_happened",
  ...(["late", "early", "nopaddle", "back", "knees", "feet", "lean", "side", "trick"] as Reason[]).flatMap((r) => ["r_" + r, "tip_" + r]),
  "r_exact", "r_no", "nothing", "learn", "again_q",
  "shore", "first_wave", "slang1", "slang2", "slang3", "slang4", "another", "bye",
  ...ANSWERS,
];
/** The answers that go together: what can go wrong catching a wave, and riding it. */
const CATCH_REASONS: Reason[] = ["late", "early", "nopaddle"];
const RIDE_REASONS: Reason[] = ["back", "knees", "feet", "lean", "side", "trick"];

const DEAD = 0.5;
/** How fast a wave that hangs back for the learner still creeps in (m/s): the sea is never quite still. */
const CREEP = 0.12;
/** How long she lets a silence be before she says her command again (s). */
const PATIENCE = 8;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export class SurfLogic {
  phase: Phase = "intro";
  readonly level: Level;
  readonly cfg: Cfg;
  /** The learner: how far out (m from the waterline), how far along the beach from the lane's middle (m), how fast
   *  along the lane (m/s), which way they face. */
  d = 2.5;
  x = 0;
  v = 0;
  facing: "out" | "in" = "out";
  pose: Pose = "walk";
  /** In the ride: the lean (−1 left … 1 right), the knees (0–1), the weight forward (0–1), the wobble (0–1), what is
   *  left of the balance (1 → 0: a fall), how long the ride has lasted (s). */
  lean = 0;
  crouch = 0;
  pitch = 0;
  wobble = 0;
  balance = 1;
  rideT = 0;
  /** A duck under a wave under way (s left), a trick's turn (0–1, 0: none), a tumble (s since it began; −1: none). */
  duckT = 0;
  flipT = 0;
  fallT = -1;
  waves: Wave[] = [];
  board: "long" | "short" | null = null;
  /** The cue being said now (null: silence). */
  saying: string | null = null;
  /** The learner's turn: to speak (`choice`) or to act (`todo`). Never both. */
  choice: Choice | null = null;
  todo: Todo | null = null;
  /** In a ride: the command that waits for its move. */
  cmd: { c: Command; t: number; stale: Set<Act>; tries: number } | null = null;
  /** The stand-up window is open ("¡Ahora!"). */
  upOpen = false;
  score: Score = { waves: 0, seconds: 0, followed: 0, asked: 0, falls: 0 };
  /** Every cue said in this session, in order met (each once): the phrase cards. */
  heard: string[] = [];
  /** The last fall's or miss's reason, and whether the learner named it. */
  reason: Reason | null = null;
  named: boolean | null = null;

  private q: string[] = [];
  private speakT = 0;
  private hush = 0;
  private lateT = 0;
  private whenQuiet: (() => void)[] = [];
  private timers: { t: number; fn: () => void }[] = [];
  private onChoice: ((option: string) => void) | null = null;
  private armed: { cue: string; t: Omit<Todo, "cue" | "waited">; on: () => void } | null = null;
  private onDone: (() => void) | null = null;
  private slow: number;
  private rides: number;
  private first = true;
  private leg = 0;
  private dTo = 2.5;
  private stride = 1;
  private nag = 0;
  private almost = false;
  private noLeft = 0;
  private notYet = 0;
  private asked = 0;
  private live: Wave | null = null;
  private duckWave: Wave | null = null;
  private etiquetteDue = false;
  private gap0 = 12;
  private d0 = 16;
  private rideV = 1;
  private cmdN = 0;
  private checked = false;
  private lastCue = "";
  private steadyRun = 0;
  private praise = 0;
  private slang = 0;
  private wasFall = false;
  private held = new Set<Act>();
  private prev: SurfInput = NO_INPUT;

  constructor(private host: SurfHost, opts: SurfOpts) {
    this.level = opts.level;
    this.cfg = CFG[opts.level];
    this.slow = opts.slow ? 1.35 : 1;
    this.rides = opts.rides ?? 0;
    this.say(this.level === "beginner" ? "start_beg" : "start_adv");
    this.ask("ack", ["a_perfect", "a_ok"], () => {
      if (this.rides > 0) { this.toBoard(); return; }
      // (the first lesson: how it goes)
      this.say("listen");
      this.ask("ack", ["a_understood", "a_ok"], () => this.toBoard());
    });
  }

  /** The instructor speaks slowly from now on, or as usual: more time for everything, or the usual. */
  setSlow(on: boolean) { this.slow = on ? 1.35 : 1; }

  // --- speech: one voice, one cue at a time, and then the learner's turn ----------------------------------------

  /** Queues cues behind whatever is being said. */
  private say(...cues: string[]) { this.q.push(...cues); }
  /** Runs `fn` once everything queued has been said. */
  private then(fn: () => void) { this.whenQuiet.push(fn); }
  private after(t: number, fn: () => void) { this.timers.push({ t, fn }); }
  get talking() { return this.hush > 0 || this.speakT > 0 || this.q.length > 0; }
  private pick<T>(list: T[]): T { return list[Math.min(list.length - 1, Math.floor(this.host.rnd() * list.length))]; }
  private shuffle<T>(list: T[]): T[] {
    const a = [...list];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(this.host.rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  private speech(dt: number) {
    // (the learner's own answer is being said: she listens)
    if (this.hush > 0) { this.hush -= dt; return; }
    this.speakT -= dt;
    if (this.speakT > 0) return;
    // (the line is over by its length, but still being heard: it is not cut off, within reason)
    if (this.host.busy?.() && this.lateT < 2.5) { this.lateT += dt; return; }
    this.lateT = 0;
    const cue = this.q.shift();
    if (cue) {
      this.saying = cue;
      if (!this.heard.includes(cue)) this.heard.push(cue);
      this.speakT = Math.max(0.35, this.host.say(cue)) * (this.slow > 1 ? 1.2 : 1) + 0.3;
      this.onSaid(cue);
      return;
    }
    this.saying = null;
    if (this.whenQuiet.length) { const fns = this.whenQuiet; this.whenQuiet = []; for (const fn of fns) fn(); }
  }

  /** What a cue sets off as it begins to be heard: the move it asks for is the learner's to make from now. */
  private onSaid(cue: string) {
    const a = this.armed;
    if (a?.cue === cue) {
      this.armed = null;
      this.todo = { ...a.t, cue, waited: 0 };
      // (where the sea won't wait, the time runs from the end of her line)
      if (a.t.win != null) this.todo.t = this.todo.win = a.t.win + this.speakT;
      this.onDone = a.on;
    }
    if (cue === "now_up") this.upOpen = true;
  }

  /** The learner's turn to speak, once she has finished: `on` gets the line they answered with. */
  private ask(id: Choice["id"], options: string[], on: (option: string) => void) {
    this.then(() => { this.choice = { id, options }; this.onChoice = on; });
  }

  /** She says `cue`, and what it asks for is the learner's to do: `on` once it is done. */
  private need(cue: string, t: Omit<Todo, "cue" | "waited">, on: () => void) {
    this.say(cue);
    this.armed = { cue, t, on };
  }

  /** The move is made. */
  private done() {
    const on = this.onDone;
    this.todo = null; this.onDone = null;
    on?.();
  }

  /** The learner answers with one of their lines (a cue id among `choice.options`): said aloud, or tapped. */
  choose(option: string, spoken = false) {
    const c = this.choice, on = this.onChoice;
    if (!c || !on || !c.options.includes(option)) return;
    this.choice = null; this.onChoice = null;
    this.hush = Math.max(0, this.host.answer(option, spoken)) + 0.25;
    on(option);
  }

  // --- the board ------------------------------------------------------------------------------------------------

  private get rightBoard() { return this.level === "beginner" ? "b_long" : "b_short"; }
  private toBoard() {
    this.phase = "board";
    const take = this.level === "beginner" ? "board_take_long" : "board_take_short";
    const options = this.shuffle(["b_long", "b_short", "b_sup"]);
    const on = (option: string) => {
      if (option !== this.rightBoard) { this.host.fx("wrong"); this.say("board_no", take); this.ask("board", options, on); return; }
      this.board = this.level === "beginner" ? "long" : "short";
      this.host.fx("right");
      this.say("board_yes", "leash");
      this.ask("ack", ["a_ready", "a_ok"], () => {
        this.say("go_in");
        // (a moment in the dark as they go in: "reset")
        this.ask("ack", ["a_coming", "a_vamos"], () => { this.host.fx("reset"); this.after(0.36, () => this.toOut()); });
      });
    };
    this.say("board_ask", take);
    this.ask("board", options, on);
  }

  // --- paddling out: a stretch, a wave to duck under, another stretch -------------------------------------------

  private toOut() {
    this.phase = "out";
    this.pose = "prone"; this.facing = "out"; this.d = this.dTo = 2.5; this.v = 0;
    this.leg = 0; this.almost = false;
    this.say("lie");
    this.stretch("paddle");
  }

  /** One stretch of the way out: so many strokes, each one a bit of the way. */
  private stretch(cue: string) {
    const legs = this.cfg.ducks + 1, n = this.cfg.strokes;
    this.stride = (this.cfg.lineup - 2.5) / legs / n;
    this.need(cue, { do: "paddle", left: n, of: n }, () => {
      this.leg++;
      if (this.leg < legs) { this.duck(); return; }
      this.pose = "sit";
      this.host.fx("sit");
      this.say("arrive");
      this.ask("ack", ["a_and_now", "a_far"], () => this.toWait());
    });
  }

  /** A wave comes at them on the way out: it hangs back until they go under it. */
  private duck() {
    const w = this.duckWave = this.spawn(false, 9, true, 3.6);
    w.hold = 2.4;
    this.need("wave_duck", { do: "duck" }, () => {
      this.duckWave = null;
      w.hold = undefined;
      this.duckT = 1;
      this.host.fx("duck");
      this.say("duck_ok");
      this.stretch("paddle_long");
    });
  }

  private stepOut(dt: number, inp: SurfInput) {
    const t = this.todo;
    if (this.duckT > 0) this.duckT -= dt;
    if (t?.do === "paddle") {
      if (inp.stroke) {
        t.left = (t.left ?? 1) - 1; t.waited = 0;
        this.dTo = Math.min(this.cfg.lineup, this.dTo + this.stride);
        this.host.fx("stroke");
        if (!this.almost && this.leg === this.cfg.ducks && t.left === 2 && !this.talking) { this.almost = true; this.say("almost"); }
        if (t.left <= 0) { this.dTo = 2.5 + (this.cfg.lineup - 2.5) * (this.leg + 1) / (this.cfg.ducks + 1); this.done(); }
      } else {
        // she waits; after a good while she says it again, in other words
        t.waited += dt;
        if (t.waited > PATIENCE * this.slow && !this.talking) { t.waited = 0; this.say(["paddle_hard", "paddle_more", "paddle"][this.nag++ % 3]); }
      }
    } else if (t?.do === "duck") {
      const w = this.duckWave;
      if (inp.y < -DEAD && this.prev.y >= -DEAD) this.done();
      else if (w && w.d - this.d < 0.7) {
        // it got to them first: swept back a little, and here comes another
        this.duckWave = null; w.past = true; w.hold = undefined;
        this.todo = null; this.onDone = null;
        this.d = this.dTo = Math.max(2.5, this.d - 2.2);
        this.host.fx("tumble");
        this.say("duck_miss");
        this.then(() => { if (this.phase === "out") this.duck(); });
      }
    }
    const was = this.d;
    this.d += (this.dTo - this.d) * Math.min(1, dt * 2.4);
    this.v = dt > 0 ? (this.d - was) / dt : 0;
  }

  // --- waiting for the set: "¿Esta?" ----------------------------------------------------------------------------

  private spawn(yes: boolean, ahead: number, white = this.level === "beginner", c = 5): Wave {
    const w: Wave = { d: this.d + ahead, h: yes ? this.cfg.waveH : this.cfg.waveH * (white && !yes ? 0.6 : 0.45), c, white, yes, past: false };
    this.waves.push(w);
    return w;
  }

  private toWait() {
    this.phase = "wait";
    this.pose = "sit"; this.facing = "out"; this.v = 0; this.cmd = null; this.todo = null; this.upOpen = false; this.live = null;
    this.host.fx("sit");
    // the first wave of a session comes after a single small one, and after one "not yet": the lesson's two ideas
    this.noLeft = this.first ? 1 : this.host.rnd() < 0.5 ? 1 : 0;
    this.notYet = this.first ? 1 : this.host.rnd() < 0.4 ? 1 : 0;
    this.etiquetteDue = this.level === "advanced" && (this.first || this.host.rnd() < 0.6);
    this.asked = 0;
    if (this.first) { this.say("wait"); if (this.rides === 0) this.say("look_horizon"); }
    this.first = false;
    this.then(() => this.nextWave());
  }

  /** A wave shows on the horizon and hangs back: the learner asks whether it is the one. */
  private nextWave() {
    if (this.phase !== "wait") return;
    const yes = this.noLeft <= 0;
    if (!yes) this.noLeft--;
    const w = this.live = this.spawn(yes, 26);
    w.hold = 9;
    this.ask("wave", [this.asked++ === 0 ? "a_this" : "a_this2"], () => {
      if (!w.yes) {
        // not this one: it goes by under them, and the next one shows
        this.say(this.pick(["not_this", "too_small", "let_pass"]));
        w.hold = undefined;
        this.live = null;
        this.then(() => this.after(1.8, () => this.nextWave()));
        return;
      }
      if (this.etiquetteDue) { this.etiquette(w); return; }
      this.say("this_one");
      this.take(w);
    });
  }

  /** The line-up's manners (advanced): whose wave is it? "La anterior fue mía": the last one was hers, so this one is
   *  the learner's. */
  private etiquette(w: Wave) {
    this.etiquetteDue = false;
    const mine = this.host.rnd() < 0.5;
    this.say(mine ? "prev_mine" : "prev_yours", "q_go");
    this.ask("turn", ["a_go", "a_yours"], (option) => {
      const go = option === "a_go", right = mine === go;
      this.score.asked++;
      if (right) { this.score.followed++; this.host.fx("right"); } else this.host.fx("wrong");
      this.say(go ? (right ? "et_go_ok" : "et_go_wrong") : (right ? "et_wait_ok" : "et_wait_wrong"));
      if (right && go) { this.take(w); return; }
      // her wave goes by first; the next one is theirs
      w.hold = undefined; w.yes = false;
      this.live = null;
      this.then(() => this.after(1.8, () => this.nextWave()));
    });
  }

  /** This one: turn the board. */
  private take(w: Wave) {
    this.need(this.pick(["turn", "turn_shore"]), { do: "turn" }, () => this.toCatch(w));
  }

  private stepWait(_dt: number, inp: SurfInput) {
    const w = this.live, t = this.todo;
    const turned = Math.abs(inp.x) > 0.6 && Math.abs(this.prev.x) <= 0.6;
    if (!w) return;
    // the board turned without a word for a wave that is not the one: she answers that instead
    if (turned && !w.yes && this.choice?.id === "wave") {
      this.choice = null; this.onChoice = null;
      this.host.fx("wrong");
      this.say("not_that");
      w.hold = undefined;
      this.live = null;
      this.then(() => this.after(1.8, () => this.nextWave()));
      return;
    }
    if (t?.do !== "turn") return;
    if (turned) { this.done(); return; }
    // it crept all the way in unturned (a very long wait): no harm done, the next one is theirs too
    if (w.d < this.d + 1) {
      this.todo = null; this.onDone = null; this.live = null;
      w.hold = undefined;
      this.say("missed");
      this.then(() => this.after(0.6, () => this.nextWave()));
    }
  }

  // --- catching it: paddle, "¿Ahora?", "¡Ahora!" ----------------------------------------------------------------

  private toCatch(w: Wave) {
    this.phase = "catch";
    this.pose = "prone"; this.facing = "in"; this.v = 0.3;
    this.host.fx("turn");
    w.hold = undefined;
    w.d = Math.min(w.d, this.d + 12);
    this.gap0 = w.d - this.d;
    this.upOpen = false;
    const n = this.cfg.need;
    this.need("paddle_now", { do: "paddle", left: n, of: n }, () => {
      this.say("coming");
      const on = () => {
        if (this.notYet > 0) { this.notYet--; this.say("not_yet"); this.ask("now", ["a_now"], on); return; }
        this.need("now_up", { do: "up", win: this.cfg.upWin * this.slow }, () => this.toRide(w));
      };
      this.ask("now", ["a_now"], on);
    });
  }

  private stepCatch(dt: number, inp: SurfInput) {
    const w = this.live!, t = this.todo;
    const up = inp.up || (inp.y > DEAD && this.prev.y <= DEAD);
    if (t?.do === "paddle") {
      if (inp.stroke) { t.left = (t.left ?? 1) - 1; t.waited = 0; this.v = Math.min(3.4, this.v + 0.8); this.host.fx("stroke"); if (t.left <= 0) this.done(); }
      else { t.waited += dt; if (t.waited > PATIENCE * this.slow && !this.talking) { t.waited = 0; this.say(this.nag++ % 2 ? "paddle_hard" : "paddle_more"); } }
    }
    this.v *= Math.exp(-0.5 * dt);
    // the wave is as near as the paddling has brought it: right behind them once they are up to speed
    const left = this.todo?.do === "paddle" ? (this.todo.left ?? 0) / (this.todo.of ?? 1) : 0;
    const gap = 2.2 + (this.gap0 - 2.2) * left;
    w.d += (this.d + gap - w.d) * Math.min(1, dt * 3);
    if (this.todo?.do === "up") {
      const u = this.todo;
      // the wave picks the board up and carries it for as long as the window is open
      this.d = Math.max(4, this.d - w.c * 0.1 * dt);
      if (up) { this.done(); return; }
      u.t = (u.t ?? 0) - dt;
      if (u.t <= 0) this.toMiss("late", w);
      return;
    }
    // up before her "¡Ahora!": into the water
    if (up && !this.upOpen) this.toFall("early");
  }

  // --- the ride: one command, the learner's move, the next one --------------------------------------------------

  private toRide(w: Wave) {
    this.phase = "ride";
    this.pose = "stand"; this.upOpen = false; this.todo = null;
    this.rideT = 0; this.balance = 1; this.wobble = 0; this.cmd = null; this.cmdN = 0;
    this.d0 = this.d;
    this.rideV = Math.max(0.3, (this.d - 2.5) / this.cfg.ride);
    this.score.waves++;
    w.white = this.level === "beginner";
    this.host.fx("pop");
    this.say("up_ok");
    this.then(() => this.after(0.5 * this.slow, () => this.command()));
  }

  private acts(inp: SurfInput): Set<Act> {
    const s = new Set<Act>();
    if (inp.x < -DEAD) s.add("left");
    if (inp.x > DEAD) s.add("right");
    if (inp.y < -DEAD) s.add("down");
    if (inp.y > DEAD) s.add("fwd");
    if (inp.up) s.add("jump");
    return s;
  }

  /** Her next command, or (once in a lesson, between two of them) how it is going. */
  private command() {
    if (this.phase !== "ride" || this.cmd || this.choice) return;
    if (this.cmdN >= this.cfg.cmds) return;
    if (this.cmdN === 2 && !this.checked) {
      this.checked = true;
      this.say("ride_q");
      this.ask("check", ["a_allgood", "a_soso"], (option) => {
        this.say(option === "a_allgood" ? "good2" : "easy");
        this.then(() => this.command());
      });
      return;
    }
    const held = this.held;
    const pool = COMMANDS.filter((c) => (this.level === "advanced" || !c.adv) && c.cue !== this.lastCue && AGAIN[c.cue] !== this.lastCue && !(c.act === "steady" && this.steadyRun >= 1)
      // (asking for what is already being done teaches nothing)
      && !(held.has(c.act)));
    const c = this.pick(pool.length ? pool : COMMANDS.filter((x) => !x.adv));
    this.steadyRun = c.act === "steady" ? this.steadyRun + 1 : 0;
    this.lastCue = c.cue;
    this.score.asked++;
    this.cmd = { c, t: 0, stale: new Set(held), tries: 0 };
    this.need(c.cue, { do: c.act, ...(this.cfg.react ? { win: this.cfg.react * this.slow } : {}) }, () => {});
  }

  private stepRide(dt: number, inp: SurfInput) {
    const cfg = this.cfg, w = this.live!;
    this.rideT += dt;
    // carried in a stretch per command: while she waits for a move, so does the wave; the lean steers along it
    const goal = Math.max(2.5, this.d0 - (this.d0 - 2.5) * Math.min(1, (this.cmdN + 1) / (cfg.cmds + 1)));
    if (this.d > goal) this.d = Math.max(goal, this.d - this.rideV * dt);
    w.d = this.d + 1.2;
    const k = Math.min(1, dt * 7);
    this.lean += (clamp(inp.x, -1, 1) - this.lean) * k;
    this.crouch += (clamp(-inp.y, 0, 1) - this.crouch) * k;
    this.pitch += (clamp(inp.y, 0, 1) - this.pitch) * k;
    this.x = clamp(this.x + this.lean * 3.4 * dt, -9, 9);
    this.wobble = Math.max(0, this.wobble - dt * 0.9);
    if (this.flipT > 0) this.flipT = Math.max(0, this.flipT - dt / 0.8);
    const now = this.held = this.acts(inp);
    const c = this.cmd, t = this.todo;
    if (c && t) {
      c.t += dt;
      // what was already held as she spoke is not an answer until it has been let go
      for (const a of [...c.stale]) if (!now.has(a)) c.stale.delete(a);
      const fresh = [...now].filter((a) => !c.stale.has(a));
      const act = c.c.act;
      if (act === "steady") {
        if (c.t > 0.6 && (Math.abs(inp.x) > DEAD || Math.abs(inp.y) > DEAD)) this.wrong(c, now);
        else if (c.t >= 2.2 * this.slow) this.followed(c);
      } else if (fresh.includes(act)) {
        if (act === "jump") { this.flipT = 1; this.host.fx("flip"); }
        this.followed(c);
      } else if (c.t > 0.25 && fresh.some((a) => a !== "jump" || act !== "jump")) {
        // the other way, or something else altogether
        const opp = (act === "left" && fresh.includes("right")) || (act === "right" && fresh.includes("left"));
        this.wrong(c, now, opp ? "side" : undefined);
      } else if (t.win != null) {
        // (advanced: a green wave won't wait for long)
        t.t = (t.t ?? 0) - dt;
        if (t.t <= 0) this.wrong(c, now, undefined, true);
      } else {
        // she waits; after a good while she says it again
        t.waited += dt;
        if (t.waited > PATIENCE * this.slow && !this.talking) { t.waited = 0; this.say(AGAIN[c.c.cue] ?? c.c.cue); }
      }
    }
    if (this.phase !== "ride") return;
    // every command followed, and the beach is here
    if (this.cmdN >= cfg.cmds && !this.cmd && !this.choice && this.d <= 2.6) {
      this.score.seconds += Math.min(40, Math.round(this.rideT));
      this.phase = "again";
      this.pose = "walk";
      this.host.fx("cheer");
      this.q = [];
      this.say("shore", ...(this.rides + this.score.waves === 1 ? ["first_wave"] : []), "slang" + (1 + (this.slang++ % 4)));
      this.ask("ack", ["a_thanks", "a_fun"], () => this.toAgain());
    }
  }

  private followed(c: NonNullable<SurfLogic["cmd"]>) {
    this.cmd = null; this.todo = null; this.onDone = null;
    if (!c.tries) this.score.followed++;
    this.balance = Math.min(1, this.balance + 0.12);
    this.host.fx("right");
    this.cmdN++;
    if (this.praise++ % 2 === 0) this.say(this.pick(["good1", "good2", "good3", "hold"]));
    this.then(() => this.after(this.cfg.gap * this.slow, () => this.command()));
  }

  /** A wrong move (or, on a green wave, none in time): it costs balance. A beginner's command stays theirs to follow,
   *  said again in other words; an advanced rider gets the next one. */
  private wrong(c: NonNullable<SurfLogic["cmd"]>, held: Set<Act>, reason?: Reason, late = false) {
    c.tries++;
    this.balance -= this.cfg.miss;
    this.wobble = 1;
    this.reason = reason ?? c.c.reason;
    this.host.fx("wrong");
    if (this.balance <= 0.02) { this.toFall(this.reason); return; }
    if (this.level === "beginner" && !late) {
      c.t = 0; c.stale = new Set(held);
      if (this.todo) this.todo.waited = 0;
      this.q = [];
      this.say(AGAIN[c.c.cue] ?? c.c.cue);
      return;
    }
    this.cmd = null; this.todo = null; this.onDone = null;
    this.cmdN++;
    this.then(() => this.after(this.cfg.gap * this.slow, () => this.command()));
  }

  // --- a fall, a missed wave: "¿Estás bien?", "¿Qué pasó?" ------------------------------------------------------

  private toFall(reason: Reason) {
    if (this.phase === "ride") this.score.seconds += Math.min(40, Math.round(this.rideT));
    this.phase = "fall";
    this.reason = reason; this.named = null; this.wasFall = true;
    this.cmd = null; this.todo = null; this.onDone = null; this.armed = null; this.choice = null; this.onChoice = null; this.upOpen = false;
    this.q = []; this.whenQuiet = []; this.timers = [];
    this.score.falls++;
    this.fallT = 0; this.pose = "swim"; this.v = 0;
    this.host.fx("wipeout");
    this.say("wipeout", "you_ok");
    this.ask("ok", ["a_fine", "a_water"], () => {
      this.say(this.score.falls % 2 ? "nothing" : "learn");
      this.toAsk();
    });
  }

  private toMiss(reason: Reason, w: Wave) {
    this.phase = "fall";
    this.reason = reason; this.named = null; this.wasFall = false;
    this.todo = null; this.onDone = null; this.armed = null; this.upOpen = false; this.pose = "sit"; this.v = 0; this.facing = "in";
    this.q = []; this.whenQuiet = []; this.timers = [];
    w.past = true;
    this.host.fx("missed");
    this.say("missed");
    this.toAsk();
  }

  private toAsk() {
    this.phase = "ask";
    this.say("what_happened");
    const r = this.reason!;
    const family = (CATCH_REASONS.includes(r) ? CATCH_REASONS : RIDE_REASONS).filter((x) => x !== r && (this.level === "advanced" || x !== "trick"));
    const others = this.shuffle(family).slice(0, 2);
    this.ask("why", this.shuffle([r, ...others]).map((x) => "a_" + x), (option) => {
      this.named = option === "a_" + r;
      this.host.fx(this.named ? "right" : "wrong");
      if (this.named) this.say("r_exact", "tip_" + r); else this.say("r_no", "r_" + r, "tip_" + r);
      this.ask("ack", ["a_understood", "a_ok"], () => this.toAgain());
    });
  }

  private toAgain() {
    this.phase = "again";
    this.pose = this.pose === "stand" ? "walk" : this.pose;
    this.say("again_q");
    this.ask("again", ["a_again", "a_enough"], (option) => {
      if (option === "a_again") {
        this.say("another");
        this.host.fx("reset");
        this.after(0.36, () => {
          this.d = this.dTo = this.cfg.lineup; this.x = 0; this.v = 0; this.facing = "out"; this.pose = "sit"; this.fallT = -1; this.flipT = 0;
          this.lean = this.crouch = this.pitch = this.wobble = 0;
          this.waves = [];
        });
        this.then(() => this.toWait());
      } else {
        this.say("bye");
        this.then(() => { this.phase = "over"; });
      }
    });
  }

  // --- a frame --------------------------------------------------------------------------------------------------

  step(dt: number, inp: SurfInput = NO_INPUT) {
    if (this.phase === "over") return;
    for (const t of this.timers) t.t -= dt;
    const due = this.timers.filter((t) => t.t <= 0);
    if (due.length) { this.timers = this.timers.filter((t) => t.t > 0); for (const t of due) t.fn(); }
    this.speech(dt);
    // the waves come in; one that waits for the learner hangs back; one that has reached the beach is gone
    for (const w of this.waves) {
      const mine = w === this.live && (this.phase === "ride" || this.phase === "catch");
      if (!mine) w.d -= (w.hold != null && w.d - this.d <= w.hold ? CREEP : w.c) * dt;
      if (w.d < this.d - 0.5) w.past = true;
    }
    this.waves = this.waves.filter((w) => w.d > -3);
    if (this.fallT >= 0) this.fallT += dt;
    switch (this.phase) {
      case "out": this.stepOut(dt, inp); break;
      case "wait": this.stepWait(dt, inp); break;
      case "catch": this.stepCatch(dt, inp); break;
      case "ride": this.stepRide(dt, inp); break;
    }
    this.prev = { ...inp, stroke: false, up: false };
  }
}
