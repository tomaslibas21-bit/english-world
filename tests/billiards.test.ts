import { describe, expect, it } from "vitest";
import { ROUTE } from "../src/content/route";
import { SITUATIONS, SITUATION_BY_ID } from "../src/content/situations/catalog";
import { chooseShot } from "../src/game/billiards/ai";
import { parseCall } from "../src/game/billiards/calls";
import { ballAt, distance, FOOT, HALF_WIDTH, HEAD, MAX_SPEED, moving, POCKETS, RADIUS, shoot, stepBalls, type Ball } from "../src/game/billiards/physics";
import { callable, judgeShot, ownerGroup, rack, respot, SHOT_LIMIT } from "../src/game/billiards/rules";
import { rand } from "../src/game/world/util";

function settle(balls: Ball[]) {
  for (let i = 0; i < 3600 && moving(balls); i++) stepBalls(balls);
  expect(moving(balls)).toBe(false);
}

describe("billiards physics", () => {
  it("transfers momentum at full power without tunnelling or leaving overlap", () => {
    const cue = ballAt(0, -0.2, 0.25), object = ballAt(3, -0.2, 0.186);
    const balls = [cue, object];
    shoot(cue, Math.PI, 1);
    stepBalls(balls);
    expect(object.vz).toBeLessThan(-0.94 * MAX_SPEED);
    expect(cue.vz + object.vz).toBeCloseTo(-MAX_SPEED, 1);
    expect(distance(cue, object)).toBeGreaterThanOrEqual(2 * RADIUS);
    expect(Math.hypot(cue.vz, object.vz)).toBeLessThanOrEqual(MAX_SPEED);
    settle(balls);
  });

  it("bounces off the cushion and slows to a stop", () => {
    const cue = ballAt(0, HALF_WIDTH - RADIUS - 0.002, 0.45);
    shoot(cue, Math.PI / 2, 0.5);
    stepBalls([cue]);
    expect(cue.vx).toBeCloseTo(-0.75 * MAX_SPEED / 2, 2);
    expect(cue.x).toBeLessThanOrEqual(HALF_WIDTH - RADIUS);
    settle([cue]);
    expect(cue.pocket).toBe(null);
  });

  it("captures a ball rolling into all six mouths and clears its velocity", () => {
    for (const [id, hole] of Object.entries(POCKETS)) {
      const ball = ballAt(2, hole.x * 0.62, hole.z * 0.62);
      shoot(ball, Math.atan2(hole.x - ball.x, hole.z - ball.z), 0.55);
      settle([ball]);
      expect(ball.pocket).toBe(id);
      expect([ball.vx, ball.vz]).toEqual([0, 0]);
    }
  });

  it("re-spots toward the nearest clear point on the center line", () => {
    const cue = ballAt(0, 0.495, 0);
    cue.pocket = "rs";
    const block = ballAt(2, 0, HEAD);
    respot(cue, [cue, block], HEAD);
    expect(cue.pocket).toBeNull();
    expect(cue.x).toBe(0);
    expect(distance(cue, block)).toBeGreaterThanOrEqual(2 * RADIUS);
    expect(distance(cue, block)).toBeLessThan(0.071);
  });
});

describe("short 8-ball rules", () => {
  const base = { side: "learner", group: "solids", call: { ball: 1, pocket: "fl" }, number: 1, eightAllowed: false } as const;
  const board = () => [ballAt(0, 0, HEAD), ballAt(1, 0.1, 0.2), ballAt(7, -0.2, 0.2), ballAt(8, 0, FOOT), ballAt(12, 0.2, 0.3)];

  it("keeps a correctly called shot or a legal break that sinks an own ball", () => {
    const balls = board();
    balls[1].pocket = "fl";
    expect(judgeShot(balls, { ...base, sunk: new Set([1]) })).toMatchObject({ scored: true, next: "learner" });
    expect(judgeShot(balls, { ...base, call: null, sunk: new Set([1]) })).toMatchObject({ scored: false, next: "learner" });
    expect(judgeShot(balls, { ...base, call: null, sunk: new Set([12]) }).next).toBe("tina");
  });

  it("passes the turn for the wrong pocket, wrong ball, and scratches", () => {
    const balls = board();
    balls[1].pocket = "ls";
    balls[2].pocket = "fr";
    expect(judgeShot(balls, { ...base, sunk: new Set([1, 7]) })).toMatchObject({ wrongPocket: true, scored: false, next: "tina" });
    expect(judgeShot(balls, { ...base, sunk: new Set([7]) })).toMatchObject({ wrongBall: true, scored: false, next: "tina" });
    balls[1].pocket = "fl";
    expect(judgeShot(balls, { ...base, sunk: new Set([0, 1]) })).toMatchObject({ scratch: true, scored: false, next: "tina" });
    expect(balls[1].pocket).toBe("fl");
  });

  it("spots the eight unless it was an eligible call with no scratch", () => {
    const balls = board(), call = { ball: 8, pocket: "nl" } as const;
    expect(callable(balls, "solids").map((ball) => ball.id)).toEqual([1, 7]);
    balls[3].pocket = "nl";
    expect(judgeShot(balls, { ...base, call: null, sunk: new Set([8]) }).eightBack).toBe(true);
    expect(judgeShot(balls, { ...base, call, sunk: new Set([8]) })).toMatchObject({ eightBack: true, winner: null });
    expect(judgeShot(balls, { ...base, call, eightAllowed: true, sunk: new Set([8, 0]) })).toMatchObject({ eightBack: true, winner: null });
    expect(judgeShot(balls, { ...base, call, eightAllowed: true, sunk: new Set([8]) })).toMatchObject({ eightBack: false, winner: "learner" });
    balls[3].pocket = "fl";
    expect(judgeShot(balls, { ...base, call, eightAllowed: true, sunk: new Set([8]) }).eightBack).toBe(true);
    balls[1].pocket = balls[2].pocket = "fl";
    respot(balls[3], balls, FOOT);
    expect(callable(balls, "solids").map((ball) => ball.id)).toEqual([8]);
  });

  it("compares group balls after the learner's fourteenth called shot", () => {
    const balls = board();
    expect(judgeShot(balls, { ...base, number: SHOT_LIMIT - 1, sunk: new Set() }).winner).toBeNull();
    expect(judgeShot(balls, { ...base, number: SHOT_LIMIT, sunk: new Set() })).toMatchObject({ time: true, winner: "tina" });
    balls[1].pocket = "fl";
    expect(judgeShot(balls, { ...base, number: SHOT_LIMIT, sunk: new Set([1]) }).winner).toBe("tie");
    balls[2].pocket = "nl";
    expect(judgeShot(balls, { ...base, number: SHOT_LIMIT, sunk: new Set([7]) }).winner).toBe("learner");
  });
});

describe("call recognition", () => {
  it.each([
    ["Seven ball, far left corner.", 7, "fl"],
    ["ball 15 into the top right corner pocket", 15, "fr"],
    ["the eleven ball in the left side pocket", 11, "ls"],
    ["ball the 8 to the right side", 8, "rs"],
    ["two ball, left bottom corner", 2, "nl"],
    ["fourteen in right near corner", 14, "nr"],
  ])("reads %s", (text, ball, pocket) => expect(parseCall(text)).toEqual({ ball, pocket }));

  it.each(["seven ball", "far left corner", "one ball corner pocket", "zero in the right side", "16 ball right side", "one left corner"])(
    "requires a specific ball and pocket in %s", (text) => expect(parseCall(text)).toBeNull());
});

describe("seeded rack and Tina's aim", () => {
  it("makes a reproducible diamond with four of each group and the eight in the center", () => {
    const balls = rack(37);
    expect(balls).toEqual(rack(37));
    expect(balls.map(({ id }) => id)).not.toEqual(rack(38).map(({ id }) => id));
    expect(balls.map(({ z }) => z).filter((z, i) => i > 0 && z === FOOT)).toHaveLength(1);
    expect(balls[0]).toMatchObject({ id: 0, x: 0, z: HEAD });
    expect(balls[5]).toMatchObject({ id: 8, x: 0 });
    expect(new Set(balls.map(({ id }) => id)).size).toBe(10);
    for (const group of ["solids", "stripes"]) {
      expect(balls.filter(({ id }) => ownerGroup(id) === group)).toHaveLength(4);
    }
  });

  it("finds and makes a straight pocket with a zero-error draw", () => {
    const balls = [ballAt(0, 0.20, 0), ballAt(13, -0.22, 0)];
    const choice = chooseShot(balls, "stripes", () => 0.5)!;
    expect(choice.call).toEqual({ ball: 13, pocket: "ls" });
    shoot(balls[0], choice.angle, choice.power);
    settle(balls);
    expect(balls[1].pocket).toBe("ls");
  });

  it("makes about half of several hundred seeded calls after a realistic break", () => {
    let made = 0, attempts = 0;
    for (let seed = 1; seed <= 36; seed++) {
      const balls = rack(seed), random = rand(seed + 300);
      const cue = balls[0], eight = balls.find(({ id }) => id === 8)!;
      shoot(cue, Math.PI, 0.95);
      settle(balls);
      if (cue.pocket) respot(cue, balls, HEAD);
      if (eight.pocket) respot(eight, balls, FOOT);
      for (let turn = 0; turn < 10; turn++) {
        const shot = chooseShot(balls, "stripes", random)!;
        const before = new Set(balls.filter((ball) => ball.pocket).map(({ id }) => id));
        shoot(cue, shot.angle, shot.power);
        settle(balls);
        const sunk = new Set(balls.filter((ball) => ball.pocket && !before.has(ball.id)).map(({ id }) => id));
        const result = judgeShot(balls, { side: "tina", group: "stripes", call: shot.call, sunk, number: 0, eightAllowed: shot.call.ball === 8 });
        attempts++;
        if (result.scored) made++;
        if (result.winner) break;
        if (result.scratch) respot(cue, balls, HEAD);
        if (result.eightBack) respot(eight, balls, FOOT);
      }
    }
    expect(attempts).toBeGreaterThan(240);
    expect(made / attempts).toBeGreaterThan(0.38);
    expect(made / attempts).toBeLessThan(0.62);
  });
});

describe("Maple Harbor's bonus conversation", () => {
  it("keeps the 50 conversations in this checkout on the route and makes Tina discoverable in the catalog", () => {
    const bonus = SITUATION_BY_ID["x01-pool-hall"];
    expect(bonus).toMatchObject({ bonus: true, location: "pool-hall", npc: "tina", mode: "talk" });
    expect(SITUATIONS).toContain(bonus);
    expect(ROUTE).toEqual(SITUATIONS.filter((sit) => sit !== bonus));
    expect(ROUTE).toHaveLength(50);
  });
});
