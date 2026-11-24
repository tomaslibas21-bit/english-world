// The surf lesson's rules (src/game/surf/logic.ts): a conversation on the water. Played by a learner who answers her
// and does what she says, and by ones who don't: she waits for their turn, and a fall is a question, never the end.
import { describe, expect, it, vi } from "vitest";
import { ANSWERS, CFG, COMMANDS, CUES, SurfLogic, type Act, type Level, type Reason, type SurfHost, type SurfInput } from "../src/game/surf/logic";

function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

interface Bot {
  /** Answers her (false: stays silent), paddles (strokes a second), ducks, turns, stands up when called (after this
   *  many seconds; null: never; "early": before the call), follows the ride's commands (false: never; "wrong": the
   *  other way). */
  speak?: boolean; strokes?: number; duck?: boolean; turn?: boolean; up?: number | null | "early"; follow?: boolean | "wrong";
  /** What they answer to "¿Qué pasó?" (true: the real reason), and to "¿Otra vez?". */
  honest?: boolean; again?: boolean;
}

function play(level: Level, bot: Bot, seed = 1, maxS = 300, rides = 0) {
  const said: string[] = [], fx: string[] = [], mine: string[] = [];
  let run = 0, longest = 0;
  const host: SurfHost = { say: (cue) => { said.push(cue); run++; longest = Math.max(longest, run); return 1.1; }, answer: (cue) => { mine.push(cue); return 0; }, fx: (n) => { fx.push(n); }, rnd: rng(seed) };
  const L = new SurfLogic(host, { level, rides });
  const dt = 1 / 30;
  let strokeT = 0, upAt = -1, todoAt = 0, lastTodo: unknown = null, catchT = 0, turnT = 0;
  const reasons: (Reason | null)[] = [];
  for (let t = 0; t < maxS && L.phase !== "over"; t += dt) {
    const inp: SurfInput = { x: 0, y: 0, stroke: false, up: false };
    // (her lines in a row are counted from one turn of the learner's to the next)
    if (L.choice || L.todo) run = 0;
    if (L.choice) turnT += dt; else turnT = 0;
    // (a moment to think, as a learner would take)
    if (L.choice && bot.speak !== false && turnT > 0.4) {
      const c = L.choice;
      if (c.id === "board") L.choose(level === "beginner" ? "b_long" : "b_short", true);
      else if (c.id === "turn") L.choose(said.lastIndexOf("prev_mine") > said.lastIndexOf("prev_yours") ? "a_go" : "a_yours", true);
      else if (c.id === "why") { reasons.push(L.reason); L.choose(bot.honest === false ? c.options.find((o) => o !== "a_" + L.reason)! : "a_" + L.reason, true); }
      else if (c.id === "again") L.choose(bot.again ? "a_again" : "a_enough", true);
      else L.choose(c.options[0], true);
    }
    const todo = L.todo;
    if (todo !== lastTodo) { lastTodo = todo; todoAt = t; }
    if (todo?.do === "paddle") {
      strokeT += dt;
      if (bot.strokes && strokeT > 1 / bot.strokes) { strokeT = 0; inp.stroke = true; }
    }
    if (todo?.do === "duck" && bot.duck !== false && t - todoAt > 0.5) inp.y = -1;
    if (todo?.do === "turn" && bot.turn !== false && t - todoAt > 0.5) inp.x = 1;
    if (L.phase === "catch") {
      catchT += dt;
      if (bot.up === "early" && catchT > 0.6 && !L.upOpen) inp.up = true;
      if (typeof bot.up === "number" && todo?.do === "up") { if (upAt < 0) upAt = t; if (t - upAt >= bot.up) inp.up = true; }
    } else { catchT = 0; upAt = -1; }
    if (L.phase === "ride" && L.cmd && todo && bot.follow !== false) {
      const since = L.cmd.t, wrong = bot.follow === "wrong";
      // (a moment to react; a wrong move is let go and made again)
      if (since > 0.5 && (!wrong || Math.floor(since / 0.4) % 2 === 1)) {
        const act: Act = L.cmd.c.act;
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
  return { L, said, fx, mine, reasons, longest };
}

describe("the surf lesson", () => {
  it("a learner who answers her and does what she says rides the wave to the beach, on every seed, at both levels", () => {
    for (const level of ["beginner", "advanced"] as Level[]) for (let seed = 1; seed <= 12; seed++) {
      const { L, said, mine, reasons } = play(level, { strokes: 3, up: 0.4, follow: true }, seed);
      expect(L.phase, `${level} seed ${seed}`).toBe("over");
      expect(L.score.waves).toBe(1);
      expect(L.score.seconds).toBeGreaterThanOrEqual(CFG[level].ride - 1);
      expect(L.score.falls).toBe(0);
      expect(reasons).toEqual([]);
      expect(L.score.followed, `${level} seed ${seed}: ${L.score.followed}/${L.score.asked}`).toBe(L.score.asked);
      expect(L.score.asked).toBeGreaterThanOrEqual(CFG[level].cmds);
      for (const cue of ["board_ask", "leash", "go_in", "paddle", "wave_duck", "duck_ok", "arrive", "paddle_now", "coming", "not_yet", "now_up", "up_ok", "ride_q", "shore", "first_wave", "again_q", "bye"]) expect(said, `${level} seed ${seed}: ${cue}`).toContain(cue);
      expect(said).not.toContain("wipeout");
      // the wave is called theirs: "¡Esta sí!", or in the line-up "¡Dale! Es tuya."
      expect(said.includes("this_one") || said.includes("et_go_ok"), `${level} seed ${seed}`).toBe(true);
      if (level === "advanced") expect(said).toContain("q_go");
      // every word she says, and every word the learner says, is one of the edition's lines
      for (const cue of said) expect(CUES).toContain(cue);
      for (const cue of mine) expect(cue.startsWith("b_") || ANSWERS.includes(cue), cue).toBe(true);
      // the learner had their say: on the sand, on the way out, about the wave, about the moment, in the ride, at the end
      for (const cue of ["a_perfect", "a_understood", "a_ready", "a_coming", "a_and_now", "a_this", "a_this2", "a_now", "a_allgood", "a_thanks", "a_enough"]) expect(mine, `${level} seed ${seed}: ${cue}`).toContain(cue);
      expect(mine.length).toBeGreaterThanOrEqual(13);
    }
  });

  it("is a conversation: she never says more than three lines before it is the learner's turn again", () => {
    for (const level of ["beginner", "advanced"] as Level[]) for (let seed = 1; seed <= 12; seed++) {
      for (const bot of [{ strokes: 3, up: 0.4, follow: true }, { strokes: 3, up: "early", follow: true, again: true }, { strokes: 3, up: null, honest: false }, { strokes: 3, up: 0.4, follow: "wrong" }] as Bot[]) {
        const { longest } = play(level, bot, seed, 200);
        expect(longest, `${level} seed ${seed} ${JSON.stringify(bot)}`).toBeLessThanOrEqual(3);
      }
    }
  });

  it("she waits: with a learner who says nothing, nothing goes on", () => {
    const { L, said } = play("beginner", { speak: false }, 1, 90);
    expect(L.phase).toBe("intro");
    expect(said).toEqual(["start_beg"]);
    expect(L.choice?.id).toBe("ack");
    expect(L.choice?.options).toEqual(["a_perfect", "a_ok"]);
  });

  it("she waits for the paddling too: a word now and then, and the learner is where they were", () => {
    const { L, said } = play("beginner", { strokes: 0 }, 1, 60);
    expect(L.phase).toBe("out");
    expect(L.todo?.do).toBe("paddle");
    expect(L.todo?.left).toBe(CFG.beginner.strokes);
    expect(L.d).toBeLessThan(3);
    const nags = said.filter((c) => c === "paddle_hard" || c === "paddle_more").length;
    expect(nags).toBeGreaterThanOrEqual(1);
    expect(nags).toBeLessThanOrEqual(5);
  });

  it("the first lesson, a wave is asked about before it is taken, and the moment too: “¿Esta?” – “Esta no…”, “¿Ahora?” – “¡Todavía no!”", () => {
    const { said, mine } = play("beginner", { strokes: 3, up: 0.4, follow: true }, 3);
    const no = said.findIndex((c) => ["not_this", "too_small", "let_pass"].includes(c));
    expect(no).toBeGreaterThan(0);
    expect(said.indexOf("this_one")).toBeGreaterThan(no);
    expect(said.indexOf("not_yet")).toBeGreaterThan(said.indexOf("coming"));
    expect(said.indexOf("now_up")).toBeGreaterThan(said.indexOf("not_yet"));
    expect(mine.filter((c) => c === "a_now").length).toBe(2);
  });

  it("is played in about two minutes at most, the first wave", () => {
    const first = play("beginner", { strokes: 3, up: 0.4, follow: true }, 3, 130);
    expect(first.L.phase).toBe("over");
  });

  it("standing up before the call is a fall she asks about: the learner says they are fine, names it, and it is over or again", () => {
    const { L, said, mine, reasons } = play("beginner", { strokes: 3, up: "early", follow: true, again: false }, 2);
    expect(reasons[0]).toBe("early");
    for (const cue of ["wipeout", "you_ok", "nothing", "what_happened", "r_exact", "tip_early"]) expect(said).toContain(cue);
    for (const cue of ["a_fine", "a_early", "a_understood"]) expect(mine).toContain(cue);
    expect(L.score.falls).toBe(1);
    expect(L.phase).toBe("over");
  });

  it("standing up too late: the wave goes by, nobody falls, and she says why when the learner doesn't", () => {
    const late = play("beginner", { strokes: 3, up: null, honest: false }, 5);
    expect(late.reasons[0]).toBe("late");
    expect(late.said).toContain("missed");
    expect(late.said).not.toContain("wipeout");
    expect(late.said).toContain("r_no");
    expect(late.said).toContain("r_late");
    expect(late.said).toContain("tip_late");
    expect(late.L.score.falls).toBe(0);
  });

  it("a wave not ducked sweeps them back a little and comes again: no penalty", () => {
    const { L, said } = play("beginner", { strokes: 3, duck: false }, 1, 80);
    expect(L.phase).toBe("out");
    expect(said).toContain("duck_miss");
    expect(said.filter((c) => c === "wave_duck").length).toBeGreaterThanOrEqual(2);
    expect(L.score.falls).toBe(0);
  });

  it("wrong moves cost balance: three for a beginner, two further out; the fall is blamed on the last one", () => {
    for (const [level, misses] of [["beginner", 3], ["advanced", 2]] as [Level, number][]) {
      const { L, reasons, said } = play(level, { strokes: 3, up: 0.4, follow: "wrong" }, 6);
      expect(L.score.falls, level).toBe(1);
      expect(L.score.asked - L.score.followed, level).toBeGreaterThanOrEqual(level === "beginner" ? 1 : misses);
      expect(["back", "knees", "feet", "lean", "side", "trick"]).toContain(reasons[0]);
      expect(L.score.seconds).toBeGreaterThan(0);
      expect(said).toContain("wipeout");
    }
  });

  it("no move at all: a beginner's command waits (she says it again), a green wave doesn't", () => {
    const beg = play("beginner", { strokes: 3, up: 0.4, follow: false }, 6, 150);
    expect(beg.L.phase).toBe("ride");
    expect(beg.L.score.falls).toBe(0);
    expect(beg.L.todo).toBeTruthy();
    expect(beg.L.cmd).toBeTruthy();
    const adv = play("advanced", { strokes: 3, up: 0.4, follow: false }, 6, 260);
    expect(adv.L.score.falls).toBe(1);
    expect(adv.said).toContain("wipeout");
  });

  it("leaning the other way is told apart from not leaning", () => {
    let side = 0;
    for (let seed = 1; seed <= 8; seed++) { const { reasons } = play("beginner", { strokes: 3, up: 0.4, follow: "wrong" }, seed); if (reasons[0] === "side") side++; expect(reasons.length).toBe(1); }
    expect(side).toBeGreaterThan(0);
  });

  it("another wave after a fall starts from the line-up: no paddling out again", () => {
    const said: string[] = [];
    const L = new SurfLogic({ say: (c) => { said.push(c); return 1; }, answer: () => 0, fx: () => {}, rnd: rng(9) }, { level: "beginner", rides: 3 });
    const dt = 1 / 30;
    let rounds = 0, strokeT = 0;
    for (let t = 0; t < 300 && L.phase !== "over"; t += dt) {
      const inp: SurfInput = { x: 0, y: 0, stroke: false, up: false };
      if (L.choice?.id === "board") L.choose("b_long");
      else if (L.choice?.id === "again") { rounds++; L.choose(rounds < 3 ? "a_again" : "a_enough"); }
      else if (L.choice) L.choose(L.choice.options[0]);
      strokeT += dt;
      if (L.todo?.do === "paddle" && strokeT > 0.33) { strokeT = 0; inp.stroke = true; }
      if (L.todo?.do === "duck") inp.y = -1;
      if (L.todo?.do === "turn") inp.x = -1;
      if (L.phase === "catch" && !L.upOpen && L.todo?.do !== "paddle") inp.up = true; // always too early
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
    const L = new SurfLogic({ say: (c) => { said.push(c); return 1; }, answer: () => 0, fx: () => {}, rnd: rng(1) }, { level: "beginner" });
    const go = (s: number) => { for (let t = 0; t < s; t += 0.05) L.step(0.05); };
    const until = (id: string) => { for (let t = 0; t < 20 && L.choice?.id !== id; t += 0.05) { if (L.choice) L.choose(L.choice.options[0]); L.step(0.05); } };
    until("board");
    expect(L.choice?.id).toBe("board");
    L.choose("b_sup");
    go(5);
    expect(said).toContain("board_no");
    expect(L.phase).toBe("board");
    expect(L.choice?.id).toBe("board");
    L.choose("b_long");
    go(5);
    expect(L.board).toBe("long");
    // the leash, then the water: each with a word from the learner
    expect(L.choice?.options).toEqual(["a_ready", "a_ok"]);
    L.choose("a_ready");
    go(3);
    expect(L.choice?.options).toEqual(["a_coming", "a_vamos"]);
    L.choose("a_coming");
    go(3);
    expect(L.phase).toBe("out");
    expect(L.todo?.do).toBe("paddle");
  });

  it("turning the board without a word for a wave that isn't the one: “¡Espera! Esa no era.”, and the next wave", () => {
    const said: string[] = [];
    const L = new SurfLogic({ say: (c) => { said.push(c); return 1; }, answer: () => 0, fx: () => {}, rnd: rng(1) }, { level: "beginner" });
    const dt = 1 / 30;
    let strokeT = 0, done = false;
    for (let t = 0; t < 200 && !done; t += dt) {
      const inp: SurfInput = { x: 0, y: 0, stroke: false, up: false };
      if (L.choice?.id === "wave") { inp.x = 1; done = true; }
      else if (L.choice?.id === "board") L.choose("b_long");
      else if (L.choice) L.choose(L.choice.options[0]);
      strokeT += dt;
      if (L.todo?.do === "paddle" && strokeT > 0.33) { strokeT = 0; inp.stroke = true; }
      if (L.todo?.do === "duck") inp.y = -1;
      L.step(dt, inp);
    }
    for (let t = 0; t < 6; t += dt) L.step(dt);
    expect(said).toContain("not_that");
    expect(L.phase).toBe("wait");
    expect(L.choice?.options).toEqual(["a_this2"]);
  });

  it("every command names what it asks for and what a miss is blamed on; the learner's lines are lines of the lesson", () => {
    for (const c of COMMANDS) { expect(CUES).toContain(c.cue); expect(CUES).toContain("a_" + c.reason); expect(CUES).toContain("r_" + c.reason); expect(CUES).toContain("tip_" + c.reason); }
    for (const a of ANSWERS) expect(CUES).toContain(a);
    expect(new Set(CUES).size).toBe(CUES.length);
  });
});

describe("the shared surf mode lifecycle", () => {
  it("supersedes a delayed launch, clears staged inputs and saves an interrupted replay once", async () => {
    const { Group } = await import("three");
    const { Character } = await import("../src/game/characters/Character");
    const { NPCS } = await import("../src/content/npcs");
    const { CameraRig } = await import("../src/game/camera");
    const { ModeRegistry } = await import("../src/game/kit/modes");
    const { SurfMode } = await import("../src/game/surf/mode");
    const { useSurf } = await import("../src/game/surf/store");
    const { useStore } = await import("../src/state/store");
    const state = useStore.getState();
    const original = new Character({ ...NPCS.maren.look, backpack: "#eed098" });
    let player: import("../src/game/characters").GameCharacter = original;
    let npcVisible = true, swap: (() => void) | undefined;
    let screen: import("../src/game/kit/modes").ModeScreen | null = null;
    const world = new Group();
    world.add(original.root);
    const modes = new ModeRegistry({ read: () => screen, set: (value) => { screen = value; } });
    const host = {
      player: () => player, rig: new CameraRig(1.6), time: () => 0,
      add: (...objects: import("three").Object3D[]) => world.add(...objects),
      canStart: (_indoors?: boolean, duringTransition?: boolean) => !!duringTransition || !swap,
      fade: (fn: () => void) => { if (swap) return false; swap = fn; return true; },
      hideNpc: (_id: string, hidden: boolean) => { const was = npcVisible; npcVisible = !hidden; return was; },
      entered: (id: string) => modes.entered(id), left: (id: string) => modes.left(id),
      owns: (id: string) => modes.owns(id),
      prepare: () => {}, splash: () => {}, updatePose: (dt: number) => player.update(dt),
      place: () => { host.rig.mode = "follow"; },
    } satisfies import("../src/game/surf/play").SurfGame;
    const replace = (next: import("../src/game/characters").GameCharacter) => { player = next; };
    const surf = new SurfMode({ x: 0, z: 0, start: { x: 0, z: 2, rot: 0, r: 2 }, face: "#54d7d4", deep: "#077b87" },
      { npc: "maren", situation: "x04-surf" }, host, replace);
    modes.register(surf);
    const fade = () => { const fn = swap!; fn(); swap = undefined; modes.tick(0, true); };
    const dt = 1 / 30;
    const frame = (blocked = false) => modes.update({ dt, time: 1, x: 0, y: 0, brake: false, blocked });
    useStore.setState({ progress: { ...state.progress, surf: undefined, profile: {
      name: "Pat", surname: "Lee", gender: "f", lookId: "f1", look: NPCS.maren.look,
    } } });
    try {
      expect(modes.start("surf", "beginner")).toBe(true);
      await vi.dynamicImportSettled();
      expect(swap).toBeTypeOf("function");
      modes.exit(true);
      expect(modes.start("surf", "advanced")).toBe(true);
      fade();
      expect(surf.logic).toBeNull();
      expect(useSurf.getState().active).toBe(false);
      await vi.dynamicImportSettled();
      modes.tick(0, true);
      expect(swap).toBeTypeOf("function");
      fade();

      const lesson = surf.logic!;
      expect(lesson.level).toBe("advanced");
      expect(surf.line("now_up")?.en).toBe("Now! Stand up!");
      expect(player).not.toBe(original);
      expect((player as InstanceType<typeof Character>).backpackVisible).toBe(false);
      expect(npcVisible).toBe(false);

      for (let i = 0; i < 3_000 && lesson.todo?.do !== "paddle"; i++) {
        const choice = lesson.choice;
        if (choice) surf.action("choose", choice.id === "board" ? "b_short" : choice.options[0]);
        frame();
      }
      expect(lesson.todo?.do).toBe("paddle");
      const start = lesson.todo!.left!;
      surf.action("arrow:up", true);
      frame(true);
      frame();
      expect(useSurf.getState().pressed).toBe(0);
      expect(lesson.todo!.left).toBe(start);
      surf.action("arrow:up", true);
      frame();
      for (let i = 0; i < 15; i++) frame();
      expect(lesson.todo!.left).toBe(start - 1);
      surf.action("arrow:up", false);
      surf.action("arrow:up", true);
      surf.action("arrow:up", false);
      frame();
      expect(lesson.todo!.left).toBe(start - 2);

      const strokes = useSurf.getState().todo!.of;
      expect(strokes).toBe(start);
      for (let left = start - 2; left > 1; left--) {
        surf.action("arrow:up", true);
        surf.action("arrow:up", false);
        frame();
      }
      expect(lesson.todo?.left).toBe(1);
      // Let the paddle line finish so the duck cue can start on the next frame.
      for (let i = 0; i < 300 && lesson.talking; i++) frame();
      expect(lesson.talking).toBe(false);
      surf.action("arrow:up", true);
      surf.action("arrow:up", false);
      frame();
      expect(useSurf.getState()).toMatchObject({ todo: null, finishedStrokes: strokes });

      const duck = { do: "duck", cue: "wave_duck", show: true, of: null, left: null };
      frame();
      expect(useSurf.getState()).toMatchObject({ todo: duck, finishedStrokes: strokes });
      const lastVisibleFrame = Math.floor(0.65 / dt);
      for (let i = 0; i <= lastVisibleFrame; i++) frame(true);
      expect(useSurf.getState()).toMatchObject({ todo: duck, finishedStrokes: strokes });
      for (let i = 1; i < lastVisibleFrame; i++) frame();
      expect(useSurf.getState().finishedStrokes).toBe(strokes);
      frame();
      expect(useSurf.getState()).toMatchObject({ todo: duck, finishedStrokes: 0 });

      lesson.phase = "over";
      lesson.score.waves = 1;
      surf.action("again", "beginner");
      expect(swap).toBeTypeOf("function");
      modes.exit(true);
      fade();
      expect(surf.logic).toBeNull();
      expect(screen).toBeNull();
      expect(player).toBe(original);
      expect((player as InstanceType<typeof Character>).backpackVisible).toBe(true);
      expect(player.root.rotation.order).toBe("XYZ");
      expect(npcVisible).toBe(true);
      expect(useStore.getState().progress.surf).toMatchObject({ lessons: 1, waves: 1 });
    } finally {
      modes.dispose();
      original.dispose();
      useStore.setState({ progress: state.progress, hud: state.hud });
      useSurf.getState().reset();
    }
  });
});
