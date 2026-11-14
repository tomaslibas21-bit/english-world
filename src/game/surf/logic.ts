// The surf lesson's rules: what the instructor says when, what the learner must do about it and by when, what a
// fall is blamed on, the score. No three.js and no sound here: the scene (Surf.ts) reads this state and shows it, the
// host says the cues (their ids are the keys of the edition's lines, "sg_<id>": src/content/surf.ts) and tells how
// long each one lasts. Tested alone (tests/surf.test.ts).
//
// The idea (the owner's, 13 Nov 2026): the instructor's spoken commands drive the game, and the learner acts on what
// they understand. Nothing here is punished: a missed command costs balance, a fall is a question ("¿Qué pasó?") the
// learner answers, and there is always "Otra vez".

export type Level = "beginner" | "advanced";
export type Phase = "intro" | "board" | "out" | "wait" | "catch" | "ride" | "fall" | "ask" | "again" | "over";
/** What a command asks for: a lean, the knees, the weight forward, holding steady, a jump. */
export type Act = "left" | "right" | "down" | "fwd" | "steady" | "jump";
/** What a fall or a missed wave is blamed on (the learner's answers a_<reason>, the instructor's r_<reason>, tip_<reason>). */
export type Reason = "late" | "early" | "nopaddle" | "back" | "knees" | "feet" | "lean" | "side" | "trick";
export type Pose = "walk" | "prone" | "sit" | "stand" | "duck" | "swim";

/** One frame of the learner's hands: the stick or the arrows (x: right +, y: up +), a paddle stroke begun this frame,
 *  the stand-up (jump) button pressed this frame. */
export interface SurfInput { x: number; y: number; stroke: boolean; up: boolean }
export const NO_INPUT: SurfInput = { x: 0, y: 0, stroke: false, up: false };

/** A question with answers to tap (cue ids): the board, whose wave it is, what went wrong, another one. */
export interface Choice { id: "board" | "turn" | "why" | "again"; options: string[] }

export interface Wave {
  /** How far out its crest is (m from the waterline), how high (m), how fast it comes in (m/s). */
  d: number; h: number; c: number;
  /** Broken already (whitewater) or still green; the one to take. */
  white: boolean; yes: boolean;
  /** Gone past the learner. */
  past: boolean;
}

export interface Score { waves: number; seconds: number; followed: number; asked: number; falls: number }

export interface SurfHost {
  /** Says the cue (now, over anything still being said) and tells how long it lasts (s). */
  say(cue: string): number;
  /** Something to show or sound: "stroke", "duck", "tumble", "pop", "flip", "wipeout", "missed", "splash", "cheer",
   *  "turn", "reset", "sit", "right", "wrong". */
  fx(name: string): void;
  /** A number in [0, 1). */
  rnd(): number;
}

export interface SurfOpts {
  level: Level;
  /** Waves ridden before this session (the first one ever gets its own words; the intro is shorter afterwards). */
  rides?: number;
  /** The instructor speaks slowly (the game's "Lėčiau"): more time for everything. */
  slow?: boolean;
}

interface Cfg { lineup: number; need: number; upWin: number; react: number; gap: number; ride: number; miss: number; waveH: number; ducks: number }
export const CFG: Record<Level, Cfg> = {
  // whitewater and a soft board: slow, wide windows, three misses to a fall
  beginner: { lineup: 16, need: 1.4, upWin: 1.9, react: 1.9, gap: 2.2, ride: 15, miss: 0.37, waveH: 0.8, ducks: 1 },
  // green waves beyond the break: further out, quicker, two misses
  advanced: { lineup: 24, need: 2.0, upWin: 1.25, react: 1.6, gap: 2.0, ride: 18, miss: 0.5, waveH: 1.4, ducks: 2 },
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
/** Every cue the engine may say (the edition's lines: "sg_" + id), for the checks. */
export const CUES: string[] = [
  "start_beg", "start_adv", "listen", "board_ask", "board_take_long", "board_take_short", "board_no", "board_yes", "b_long", "b_short", "b_sup", "leash", "go_in",
  "lie", "paddle", "paddle_hard", "paddle_more", "paddle_long", "wave_duck", "duck_ok", "duck_miss", "almost", "arrive",
  "wait", "look_horizon", "not_this", "too_small", "let_pass", "not_that", "this_one", "turn", "turn_shore",
  "paddle_now", "coming", "now_up", "up_ok",
  ...COMMANDS.map((c) => c.cue), "hold", "good1", "good2", "good3",
  "prev_mine", "prev_yours", "q_go", "a_go", "a_yours", "et_go_ok", "et_wait_ok", "et_go_wrong", "et_wait_wrong",
  "wipeout", "you_ok", "missed", "what_happened",
  ...(["late", "early", "nopaddle", "back", "knees", "feet", "lean", "side", "trick"] as Reason[]).flatMap((r) => ["a_" + r, "r_" + r, "tip_" + r]),
  "r_exact", "r_no", "nothing", "learn", "again_q", "a_again", "a_enough",
  "shore", "first_wave", "slang1", "slang2", "slang3", "slang4", "another", "bye",
];
/** The answers that go together: what can go wrong catching a wave, and riding it. */
const CATCH_REASONS: Reason[] = ["late", "early", "nopaddle"];
const RIDE_REASONS: Reason[] = ["back", "knees", "feet", "lean", "side", "trick"];

const DEAD = 0.5;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export class SurfLogic {
  phase: Phase = "intro";
  readonly level: Level;
  readonly cfg: Cfg;
  /** The learner: how far out (m from the waterline), how far along the beach from the lane's middle (m), how fast
   *  along the lane (m/s, + out to sea while paddling out, + to the beach afterwards), which way they face. */
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
  /** The cue being said now (null: silence), the question on show, the command waiting for its answer. */
  saying: string | null = null;
  choice: Choice | null = null;
  cmd: { c: Command; t: number; win: number; stale: Set<Act>; moved: boolean } | null = null;
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
  private whenQuiet: (() => void)[] = [];
  private timers: { t: number; fn: () => void }[] = [];
  private slow: number;
  private rides: number;
  private first = true;
  private ducks = 0;
  private duckAt = 0;
  private duckWave: Wave | null = null;
  private duckPressT = 9;
  private slowT = 0;
  private nag = 0;
  private almost = false;
  private longSaid = false;
  private noLeft = 0;
  private live: Wave | null = null;
  private notThat = false;
  private etiquette: "mine" | "yours" | null = null;
  private etiquetteDue = true;
  private upT = 0;
  private rideV = 1;
  private nextCmd = 0;
  private lastCue = "";
  private steadyRun = 0;
  private praise = 0;
  private slang = 0;
  private wasFall = false;
  private prev: SurfInput = NO_INPUT;

  constructor(private host: SurfHost, opts: SurfOpts) {
    this.level = opts.level;
    this.cfg = CFG[opts.level];
    this.slow = opts.slow ? 1.35 : 1;
    this.rides = opts.rides ?? 0;
    this.say(this.level === "beginner" ? "start_beg" : "start_adv");
    if (this.rides === 0) this.say("listen");
    this.then(() => this.toBoard());
  }

  /** The instructor speaks slowly from now on, or as usual: more time for everything, or the usual. */
  setSlow(on: boolean) { this.slow = on ? 1.35 : 1; }

  // --- speech: one voice, one cue at a time ---------------------------------------------------------------------

  /** Queues cues behind whatever is being said. */
  private say(...cues: string[]) { this.q.push(...cues); }
  /** Says it now, over anything else (a command can't wait behind praise). */
  private sayNow(...cues: string[]) { this.q = [...cues]; this.speakT = 0; this.saying = null; }
  /** Runs `fn` once everything queued has been said. */
  private then(fn: () => void) { this.whenQuiet.push(fn); }
  private after(t: number, fn: () => void) { this.timers.push({ t, fn }); }
  get talking() { return this.speakT > 0 || this.q.length > 0; }
  private pick<T>(list: T[]): T { return list[Math.min(list.length - 1, Math.floor(this.host.rnd() * list.length))]; }
  private shuffle<T>(list: T[]): T[] {
    const a = [...list];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(this.host.rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  private speech(dt: number) {
    this.speakT -= dt;
    if (this.speakT > 0) return;
    const cue = this.q.shift();
    if (cue) {
      this.saying = cue;
      if (!this.heard.includes(cue)) this.heard.push(cue);
      this.speakT = Math.max(0.35, this.host.say(cue)) * (this.slow > 1 ? 1.2 : 1) + 0.18;
      this.onSaid(cue);
      return;
    }
    this.saying = null;
    if (this.whenQuiet.length) { const fns = this.whenQuiet; this.whenQuiet = []; for (const fn of fns) fn(); }
  }

  /** What a cue sets off as it begins to be heard. */
  private onSaid(cue: string) {
    if (cue === "now_up") { this.upOpen = true; this.upT = this.cfg.upWin * this.slow + this.speakT; }
  }

  // --- the board ------------------------------------------------------------------------------------------------

  private get rightBoard() { return this.level === "beginner" ? "b_long" : "b_short"; }
  private toBoard() {
    this.phase = "board";
    this.say("board_ask", this.level === "beginner" ? "board_take_long" : "board_take_short");
    // (the boards to tap come up once she has asked)
    const options = this.shuffle(["b_long", "b_short", "b_sup"]);
    this.then(() => { this.choice = { id: "board", options }; });
  }

  /** The learner taps an answer (a cue id among `choice.options`). */
  choose(option: string) {
    const c = this.choice;
    if (!c || !c.options.includes(option)) return;
    if (c.id === "board") {
      if (option !== this.rightBoard) { this.host.fx("wrong"); this.sayNow("board_no", this.level === "beginner" ? "board_take_long" : "board_take_short"); return; }
      this.choice = null;
      this.board = this.level === "beginner" ? "long" : "short";
      this.host.fx("right");
      this.sayNow("board_yes", "leash", "go_in");
      // (a moment in the dark as they go in: "reset")
      this.then(() => { this.host.fx("reset"); this.after(0.36, () => this.toOut()); });
    } else if (c.id === "turn") {
      this.choice = null;
      const mine = this.etiquette === "mine", go = option === "a_go";
      this.etiquette = null;
      // "La anterior fue mía": the last one was hers, so this one is the learner's
      const right = mine === go;
      this.score.asked++;
      if (right) { this.score.followed++; this.host.fx("right"); } else this.host.fx("wrong");
      this.sayNow(go ? (right ? "et_go_ok" : "et_go_wrong") : (right ? "et_wait_ok" : "et_wait_wrong"));
      // her wave goes by first, unless this one really was the learner's and they took it
      if (right && go) this.then(() => this.yesWave());
      else this.then(() => { this.spawn(false, 26); this.after(4.2, () => this.yesWave()); });
    } else if (c.id === "why") {
      this.choice = null;
      const r = this.reason!;
      this.named = option === "a_" + r;
      this.host.fx(this.named ? "right" : "wrong");
      if (this.named) this.sayNow("r_exact", "tip_" + r); else this.sayNow("r_no", "r_" + r, "tip_" + r);
      if (this.wasFall) this.say(this.score.falls % 2 ? "nothing" : "learn");
      this.then(() => this.toAgain());
    } else if (c.id === "again") {
      this.choice = null;
      if (option === "a_again") {
        this.sayNow("another");
        this.host.fx("reset");
        this.after(0.36, () => {
          this.d = this.cfg.lineup; this.x = 0; this.v = 0; this.facing = "out"; this.pose = "sit"; this.fallT = -1; this.flipT = 0;
          this.lean = this.crouch = this.pitch = this.wobble = 0;
          this.waves = [];
        });
        this.then(() => this.toWait());
      } else {
        this.sayNow("bye");
        this.then(() => { this.phase = "over"; });
      }
    }
  }

  // --- paddling out ---------------------------------------------------------------------------------------------

  private toOut() {
    this.phase = "out";
    this.pose = "prone"; this.facing = "out"; this.d = 2.5; this.v = 0;
    this.ducks = this.cfg.ducks; this.duckAt = 5;
    this.say("lie", "paddle");
  }

  private paddle(dt: number, inp: SurfInput, max: number) {
    if (inp.stroke) { this.v = Math.min(max, this.v + 0.78); this.host.fx("stroke"); }
    this.v *= Math.exp(-0.8 * dt);
  }

  private stepOut(dt: number, inp: SurfInput) {
    const L = this.cfg.lineup;
    if (this.duckT > 0) this.duckT -= dt;
    this.paddle(dt, inp, 3.1);
    if (this.v < 0) this.v = Math.min(0, this.v + 5 * dt);
    this.d = Math.max(1.5, this.d + this.v * dt);
    // a wave to duck under
    this.duckPressT = inp.y < -DEAD ? 0 : this.duckPressT + dt;
    if (!this.duckWave && this.ducks > 0 && this.d > this.duckAt && this.d < L - 5) {
      this.ducks--; this.duckAt = L * 0.58;
      this.duckWave = this.spawn(false, 17, true, 3.6);
      this.sayNow("wave_duck");
    }
    const w = this.duckWave;
    if (w && w.d - this.d < 0.7) {
      this.duckWave = null; w.past = true;
      if (this.duckPressT < 0.7) { this.duckT = 1; this.host.fx("duck"); this.say("duck_ok"); }
      else { this.v = -3.6; this.host.fx("tumble"); this.sayNow("duck_miss"); }
    }
    // not paddling: she says so again, in other words
    if (this.v < 0.7 && !w) {
      this.slowT += dt;
      if (this.slowT > 2.4 * this.slow && !this.talking) { this.slowT = 0; this.say(["paddle_hard", "paddle_more", "paddle"][this.nag++ % 3]); }
    } else this.slowT = 0;
    if (this.v > 2.2 && !this.longSaid && !this.talking && !w) { this.longSaid = true; this.say("paddle_long"); }
    if (!this.almost && this.d > L - 4 && !w) { this.almost = true; this.say("almost"); }
    if (this.d >= L) { this.d = L; this.sayNow("arrive"); this.toWait(); }
  }

  // --- waiting for the set --------------------------------------------------------------------------------------

  private spawn(yes: boolean, ahead: number, white = this.level === "beginner", c = 5): Wave {
    const w: Wave = { d: this.d + ahead, h: yes ? this.cfg.waveH : this.cfg.waveH * (white && !yes ? 0.6 : 0.45), c, white, yes, past: false };
    this.waves.push(w);
    return w;
  }

  private toWait() {
    this.phase = "wait";
    this.pose = "sit"; this.facing = "out"; this.v = 0; this.cmd = null; this.upOpen = false; this.live = null;
    this.host.fx("sit");
    // the first wave of a session comes after a single small one: playing in a minute
    this.noLeft = this.first ? 1 : Math.floor(this.host.rnd() * 3);
    this.etiquetteDue = this.level === "advanced" && (this.first || this.host.rnd() < 0.6);
    if (this.first) { this.say("wait"); if (this.rides === 0) this.say("look_horizon"); }
    this.first = false;
    this.then(() => this.nextWave());
  }

  private nextWave() {
    if (this.phase !== "wait") return;
    if (this.noLeft > 0) {
      this.noLeft--;
      this.notThat = false;
      this.live = this.spawn(false, 27);
      this.after(1.3, () => { if (this.phase === "wait" && this.live && !this.live.yes) this.say(this.pick(["not_this", "too_small", "let_pass"])); });
      return;
    }
    if (this.etiquetteDue) {
      this.etiquetteDue = false;
      this.etiquette = this.host.rnd() < 0.5 ? "mine" : "yours";
      this.say(this.etiquette === "mine" ? "prev_mine" : "prev_yours", "q_go");
      this.then(() => { this.choice = { id: "turn", options: ["a_go", "a_yours"] }; });
      return;
    }
    this.yesWave();
  }

  private yesWave() {
    if (this.phase !== "wait") return;
    this.live = this.spawn(true, 30);
    this.sayNow("this_one", this.pick(["turn", "turn_shore"]));
  }

  private stepWait(_dt: number, inp: SurfInput) {
    const w = this.live;
    const turned = Math.abs(inp.x) > 0.6 && Math.abs(this.prev.x) <= 0.6;
    if (!w) return;
    if (!w.yes) {
      if (turned && !this.notThat && w.d - this.d > 3) { this.notThat = true; this.host.fx("wrong"); this.sayNow("not_that"); }
      if (w.d < this.d - 2) { this.live = null; this.after(0.7, () => this.nextWave()); }
      return;
    }
    if (turned && w.d - this.d > 6) { this.toCatch(w); return; }
    // it went by unturned: no harm done, the next one is theirs too
    if (w.d < this.d - 1) { this.live = null; this.sayNow("missed"); this.then(() => this.after(0.5, () => this.yesWave())); }
  }

  // --- catching it ----------------------------------------------------------------------------------------------

  private toCatch(w: Wave) {
    this.phase = "catch";
    this.pose = "prone"; this.facing = "in"; this.v = 0.3;
    this.host.fx("turn");
    // the wave is the same distance behind for everyone who turns in time: the call comes when it counts
    w.d = Math.min(w.d, this.d + 17);
    this.upOpen = false; this.upT = 0;
    this.sayNow("paddle_now");
  }

  private stepCatch(dt: number, inp: SurfInput) {
    const w = this.live!;
    this.paddle(dt, inp, 3.4);
    // (paddling is for matching the wave's speed: it takes them only a little way in before it gets there)
    this.d = Math.max(4, this.d - this.v * 0.3 * dt);
    const gap = w.d - this.d;
    // "¡Ahora! ¡Levántate!" as the wave gets there (its lift is felt a moment later)
    if (!this.upOpen && this.upT === 0 && gap < w.c * 0.45) this.sayNow("now_up");
    if (this.upOpen) {
      this.upT -= dt;
      // the wave picks the board up and carries it for as long as the window is open
      this.d = Math.max(4, this.d - w.c * 0.3 * dt);
      w.d = Math.max(this.d + 1.2, w.d - w.c * dt);
      if (inp.up) { if (this.v >= this.cfg.need) this.toRide(w); else this.toMiss("nopaddle", w); return; }
      if (this.upT <= 0) this.toMiss("late", w);
      return;
    }
    if (inp.up) this.toFall("early");
  }

  // --- the ride -------------------------------------------------------------------------------------------------

  private toRide(w: Wave) {
    this.phase = "ride";
    this.pose = "stand"; this.upOpen = false;
    this.rideT = 0; this.balance = 1; this.wobble = 0; this.cmd = null;
    this.nextCmd = 1.4 * this.slow;
    this.rideV = Math.max(0.3, (this.d - 2.5) / this.cfg.ride);
    this.score.waves++;
    w.white = this.level === "beginner";
    this.host.fx("pop");
    this.sayNow("up_ok");
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

  private stepRide(dt: number, inp: SurfInput) {
    const cfg = this.cfg, w = this.live!;
    this.rideT += dt;
    // carried in to the beach over the ride's length; the lean steers along the wave
    this.d = Math.max(1.5, this.d - this.rideV * dt);
    w.d = this.d + 1.2;
    const k = Math.min(1, dt * 7);
    this.lean += (clamp(inp.x, -1, 1) - this.lean) * k;
    this.crouch += (clamp(-inp.y, 0, 1) - this.crouch) * k;
    this.pitch += (clamp(inp.y, 0, 1) - this.pitch) * k;
    this.x = clamp(this.x + this.lean * 3.4 * dt, -9, 9);
    this.wobble = Math.max(0, this.wobble - dt * 0.9);
    if (this.flipT > 0) this.flipT = Math.max(0, this.flipT - dt / 0.8);
    const now = this.acts(inp);
    const c = this.cmd;
    if (c) {
      c.t += dt;
      // what was already held as she spoke is not an answer until it has been let go
      for (const a of [...c.stale]) if (!now.has(a)) c.stale.delete(a);
      const fresh = [...now].filter((a) => !c.stale.has(a));
      const act = c.c.act;
      if (act === "steady") {
        if (c.t > 0.6 && (Math.abs(inp.x) > DEAD || Math.abs(inp.y) > DEAD)) this.missed(c.c);
        else if (c.t >= Math.min(c.win, 1.9 * this.slow)) this.followed();
      } else if (fresh.includes(act)) {
        if (act === "jump") { this.flipT = 1; this.host.fx("flip"); }
        this.followed();
      } else if (c.t > 0.25 && fresh.some((a) => a !== "jump" || act !== "jump")) {
        // the other way, or something else altogether
        const opp = (act === "left" && fresh.includes("right")) || (act === "right" && fresh.includes("left"));
        this.missed(c.c, opp ? "side" : undefined);
      } else if (c.t >= c.win) this.missed(c.c);
    } else {
      this.nextCmd -= dt;
      if (this.nextCmd <= 0 && cfg.ride - this.rideT > 2.6 * this.slow) this.command(now);
    }
    if (this.phase !== "ride") return;
    if (this.rideT >= cfg.ride) {
      this.score.seconds += cfg.ride;
      this.cmd = null;
      this.phase = "again";
      this.pose = "walk";
      this.host.fx("cheer");
      this.sayNow("shore", ...(this.rides + this.score.waves === 1 ? ["first_wave"] : []), "slang" + (1 + (this.slang++ % 4)));
      this.then(() => this.toAgain());
    }
  }

  private command(held: Set<Act>) {
    const pool = COMMANDS.filter((c) => (this.level === "advanced" || !c.adv) && c.cue !== this.lastCue && !(c.act === "steady" && this.steadyRun >= 1)
      // (asking for what is already being done teaches nothing)
      && !(held.has(c.act)));
    const c = this.pick(pool.length ? pool : COMMANDS.filter((x) => !x.adv));
    this.steadyRun = c.act === "steady" ? this.steadyRun + 1 : 0;
    this.lastCue = c.cue;
    this.score.asked++;
    this.sayNow(c.cue);
    // (the window is the line's own length and the time to react; `speech` has not begun it yet: an estimate now,
    // made exact as the line starts, in step)
    this.cmd = { c, t: 0, win: 1.2 + this.cfg.react * this.slow, stale: new Set(held), moved: false };
  }

  private followed() {
    this.cmd = null;
    this.score.followed++;
    this.balance = Math.min(1, this.balance + 0.12);
    this.host.fx("right");
    this.nextCmd = this.cfg.gap * this.slow * (0.8 + this.host.rnd() * 0.35);
    if (this.praise++ % 2 === 0) this.say(this.pick(["good1", "good2", "good3", "hold"]));
  }

  private missed(c: Command, reason?: Reason) {
    this.cmd = null;
    this.balance -= this.cfg.miss;
    this.wobble = 1;
    this.reason = reason ?? c.reason;
    this.host.fx("wrong");
    this.nextCmd = this.cfg.gap * this.slow * 0.75;
    if (this.balance <= 0.02) this.toFall(this.reason);
  }

  // --- a fall, a missed wave ------------------------------------------------------------------------------------

  private toFall(reason: Reason) {
    if (this.phase === "ride") this.score.seconds += Math.round(this.rideT);
    this.phase = "fall";
    this.reason = reason; this.named = null; this.wasFall = true;
    this.cmd = null; this.upOpen = false;
    this.score.falls++;
    this.fallT = 0; this.pose = "swim"; this.v = 0;
    this.host.fx("wipeout");
    this.sayNow("wipeout", ...(this.score.falls % 2 ? ["you_ok"] : []));
    this.then(() => this.toAsk());
  }

  private toMiss(reason: Reason, w: Wave) {
    this.phase = "fall";
    this.reason = reason; this.named = null; this.wasFall = false;
    this.upOpen = false; this.pose = "sit"; this.v = 0; this.facing = "in";
    w.past = true;
    this.host.fx("missed");
    this.sayNow("missed");
    this.then(() => this.toAsk());
  }

  private toAsk() {
    this.phase = "ask";
    this.say("what_happened");
    const r = this.reason!;
    const family = (CATCH_REASONS.includes(r) ? CATCH_REASONS : RIDE_REASONS).filter((x) => x !== r && (this.level === "advanced" || x !== "trick"));
    const others = this.shuffle(family).slice(0, 2);
    this.then(() => { this.choice = { id: "why", options: this.shuffle([r, ...others]).map((x) => "a_" + x) }; });
  }

  private toAgain() {
    this.phase = "again";
    this.pose = this.pose === "stand" ? "walk" : this.pose;
    this.say("again_q");
    this.then(() => { this.choice = { id: "again", options: ["a_again", "a_enough"] }; });
  }

  // --- a frame --------------------------------------------------------------------------------------------------

  step(dt: number, inp: SurfInput = NO_INPUT) {
    if (this.phase === "over") return;
    for (const t of this.timers) t.t -= dt;
    const due = this.timers.filter((t) => t.t <= 0);
    if (due.length) { this.timers = this.timers.filter((t) => t.t > 0); for (const t of due) t.fn(); }
    this.speech(dt);
    // the waves come in; one that has reached the beach is gone
    for (const w of this.waves) { if (!(this.phase === "ride" && w === this.live) && !(this.upOpen && w === this.live)) w.d -= w.c * dt; if (w.d < this.d - 0.5) w.past = true; }
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
