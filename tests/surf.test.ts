// The surf lesson's rules (src/game/surf/logic.ts), played by a learner who does what the instructor says, and by ones
// who don't: a fall is a question, never the end.
import { describe, expect, it } from "vitest";
import { CFG, COMMANDS, CUES, SurfLogic, type Act, type Level, type Reason, type SurfInput } from "../src/game/surf/logic";

function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

interface Bot {
  /** Paddles (strokes a second), ducks, turns, stands up when called (after this many seconds; null: never; "early": before the call), follows the ride's commands (false: never; "wrong": the other way). */
  strokes?: number; duck?: boolean; turn?: boolean; up?: number | null | "early"; follow?: boolean | "wrong";
  /** What they answer to "¿Qué pasó?" (true: the real reason), and to "¿Otra vez?". */
  honest?: boolean; again?: boolean;
}

function play(level: Level, bot: Bot, seed = 1, maxS = 240) {
  const said: string[] = [], fx: string[] = [];
  const L = new SurfLogic({ say: (cue) => { said.push(cue); return 1.1; }, fx: (n) => { fx.push(n); }, rnd: rng(seed) }, { level, rides: 0 });
  const dt = 1 / 30;
  let strokeT = 0, upAt = -1, cmdAt = 0, catchT = 0;
  const reasons: (Reason | null)[] = [];
  for (let t = 0; t < maxS && L.phase !== "over"; t += dt) {
    const inp: SurfInput = { x: 0, y: 0, stroke: false, up: false };
    if (L.choice) {
      const c = L.choice;
      if (c.id === "board") L.choose(level === "beginner" ? "b_long" : "b_short");
      else if (c.id === "turn") L.choose(said.lastIndexOf("prev_mine") > said.lastIndexOf("prev_yours") ? "a_go" : "a_yours");
      else if (c.id === "why") { reasons.push(L.reason); L.choose(bot.honest === false ? c.options.find((o) => o !== "a_" + L.reason)! : "a_" + L.reason); }
      else if (c.id === "again") L.choose(bot.again ? "a_again" : "a_enough");
    }
    if (L.phase === "out" || L.phase === "catch") {
      strokeT += dt;
      if (bot.strokes && strokeT > 1 / bot.strokes) { strokeT = 0; inp.stroke = true; }
    }
    if (L.phase === "out" && bot.duck !== false && L.waves.some((w) => !w.past && w.d - L.d < 5)) inp.y = -1;
    if (L.phase === "wait" && bot.turn !== false && L.waves.some((w) => w.yes && !w.past && w.d - L.d < 20 && w.d - L.d > 8)) inp.x = 1;
    if (L.phase === "catch") {
      catchT += dt;
      if (bot.up === "early" && catchT > 0.6 && !L.upOpen) inp.up = true;
      if (typeof bot.up === "number" && L.upOpen) { if (upAt < 0) upAt = t; if (t - upAt >= bot.up) inp.up = true; }
    } else { catchT = 0; upAt = -1; }
    if (L.phase === "ride" && L.cmd && bot.follow !== false) {
      if (L.cmd.t < dt * 1.5) cmdAt = t;
      // (a moment to react)
      if (t - cmdAt > 0.5) {
        const act: Act = L.cmd.c.act, wrong = bot.follow === "wrong";
        if (act === "left") inp.x = wrong ? 1 : -1;
        if (act === "right") inp.x = wrong ? -1 : 1;
        if (act === "down") inp.y = wrong ? 1 : -1;
        if (act === "fwd") inp.y = wrong ? -1 : 1;
        if (act === "jump") inp.up = !wrong;
        if (act === "steady" && wrong) inp.x = 1;
      }
    }
    L.step(dt, inp);
  }
  return { L, said, fx, reasons };
}

describe("the surf lesson", () => {
  it("a learner who does what she says rides the wave to the beach, on every seed, at both levels", () => {
    for (const level of ["beginner", "advanced"] as Level[]) for (let seed = 1; seed <= 12; seed++) {
      const { L, said, reasons } = play(level, { strokes: 3, up: 0.4, follow: true }, seed);
      expect(L.phase, `${level} seed ${seed}`).toBe("over");
      expect(L.score.waves).toBe(1);
      expect(L.score.seconds).toBe(CFG[level].ride);
      expect(L.score.falls).toBe(0);
      expect(reasons).toEqual([]);
      expect(L.score.followed, `${level} seed ${seed}: ${L.score.followed}/${L.score.asked}`).toBe(L.score.asked);
      expect(L.score.asked).toBeGreaterThanOrEqual(level === "beginner" ? 3 : 5);
      for (const cue of ["board_ask", "paddle", "wave_duck", "duck_ok", "arrive", "this_one", "paddle_now", "now_up", "up_ok", "shore", "first_wave", "again_q", "bye"]) expect(said, `${level} seed ${seed}`).toContain(cue);
      expect(said).not.toContain("wipeout");
      if (level === "advanced") expect(said).toContain("q_go");
      // every word she says is one of the edition's lines
      for (const cue of said) expect(CUES).toContain(cue);
    }
  });

  it("is played in about a minute and a half at most, the first wave", () => {
    const dtSaid = play("beginner", { strokes: 3, up: 0.4, follow: true }, 3, 100);
    expect(dtSaid.L.phase).toBe("over");
  });

  it("standing up before the call is a fall she asks about: the learner names it, and there is another wave", () => {
    const { L, said, reasons } = play("beginner", { strokes: 3, up: "early", follow: true, again: false }, 2);
    expect(reasons[0]).toBe("early");
    expect(said).toContain("wipeout");
    expect(said).toContain("what_happened");
    expect(said).toContain("r_exact");
    expect(said).toContain("tip_early");
    expect(L.score.falls).toBe(1);
    expect(L.phase).toBe("over");
  });

  it("not paddling, or standing up too late: the wave goes by, nobody falls, and she says why when the learner doesn't", () => {
    const lazy = play("beginner", { strokes: 0.3, up: 0.3, honest: false }, 4);
    expect(lazy.reasons[0]).toBe("nopaddle");
    expect(lazy.said).toContain("missed");
    expect(lazy.said).not.toContain("wipeout");
    expect(lazy.said).toContain("r_no");
    expect(lazy.said).toContain("r_nopaddle");
    const late = play("beginner", { strokes: 3, up: null }, 5);
    expect(late.reasons[0]).toBe("late");
    expect(late.L.score.falls).toBe(0);
  });

  it("commands not followed cost balance: three misses for a beginner, two further out; the fall is blamed on the last one", () => {
    for (const [level, misses] of [["beginner", 3], ["advanced", 2]] as [Level, number][]) {
      const { L, reasons, said } = play(level, { strokes: 3, up: 0.4, follow: false }, 6);
      expect(L.score.falls, level).toBe(1);
      expect(L.score.asked - L.score.followed, level).toBeGreaterThanOrEqual(misses);
      expect(["back", "knees", "feet", "lean", "trick"]).toContain(reasons[0]);
      expect(L.score.seconds).toBeGreaterThan(0);
      expect(L.score.seconds).toBeLessThan(CFG[level].ride);
      expect(said).toContain("wipeout");
    }
  });

  it("leaning the other way is told apart from not leaning", () => {
    let side = 0;
    for (let seed = 1; seed <= 8; seed++) { const { reasons } = play("beginner", { strokes: 3, up: 0.4, follow: "wrong" }, seed); if (reasons[0] === "side") side++; expect(reasons.length).toBe(1); }
    expect(side).toBeGreaterThan(0);
  });

  it("another wave after a fall starts from the line-up: no paddling out again", () => {
    const said: string[] = [];
    const L = new SurfLogic({ say: (c) => { said.push(c); return 1; }, fx: () => {}, rnd: rng(9) }, { level: "beginner", rides: 3 });
    const dt = 1 / 30;
    let rounds = 0, strokeT = 0;
    for (let t = 0; t < 200 && L.phase !== "over"; t += dt) {
      const inp: SurfInput = { x: 0, y: 0, stroke: false, up: false };
      if (L.choice?.id === "board") L.choose("b_long");
      else if (L.choice?.id === "why") L.choose(L.choice.options[0]);
      else if (L.choice?.id === "again") { rounds++; L.choose(rounds < 3 ? "a_again" : "a_enough"); }
      strokeT += dt;
      if ((L.phase === "out" || L.phase === "catch") && strokeT > 0.33) { strokeT = 0; inp.stroke = true; }
      if (L.phase === "out" && L.waves.some((w) => !w.past && w.d - L.d < 5)) inp.y = -1;
      if (L.phase === "wait" && L.waves.some((w) => w.yes && !w.past && w.d - L.d < 20 && w.d - L.d > 8)) inp.x = -1;
      if (L.phase === "catch" && !L.upOpen) inp.up = true; // always too early
      L.step(dt, inp);
    }
    expect(L.phase).toBe("over");
    expect(L.score.falls).toBe(3);
    expect(said.filter((c) => c === "another").length).toBe(2);
    expect(said.filter((c) => c === "lie").length).toBe(1);
    // waves ridden before: no "listen" again
    expect(said).not.toContain("listen");
  });

  it("the wrong board is handed back with a word, not a penalty", () => {
    const said: string[] = [];
    const L = new SurfLogic({ say: (c) => { said.push(c); return 1; }, fx: () => {}, rnd: rng(1) }, { level: "beginner" });
    for (let t = 0; t < 12 && !L.choice; t += 0.05) L.step(0.05);
    expect(L.choice?.id).toBe("board");
    L.choose("b_sup");
    for (let t = 0; t < 4; t += 0.05) L.step(0.05);
    expect(said).toContain("board_no");
    expect(L.phase).toBe("board");
    expect(L.choice?.id).toBe("board");
    L.choose("b_long");
    for (let t = 0; t < 8; t += 0.05) L.step(0.05);
    expect(L.phase).toBe("out");
    expect(L.board).toBe("long");
  });

  it("every command names what it asks for and what a miss is blamed on", () => {
    for (const c of COMMANDS) { expect(CUES).toContain(c.cue); expect(CUES).toContain("a_" + c.reason); expect(CUES).toContain("r_" + c.reason); expect(CUES).toContain("tip_" + c.reason); }
    expect(new Set(CUES).size).toBe(CUES.length);
  });
});
