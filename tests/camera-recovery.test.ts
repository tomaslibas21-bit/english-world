import { Vector3 } from "three";
import { expect, it } from "vitest";
import { CameraRig, FOLLOW } from "../src/game/camera";

const nearWall = 1.2;

// A circular enclosure gives every yaw the same clearance. Retracting its
// inner wall exposes a second wall 6 m from the chest.
function walkingRig(recover: boolean, wall: number) {
  const rig = new CameraRig(390 / 844);
  const chest = new Vector3(0, 1.35, 0);
  const start = new Vector3(), ray = new Vector3();
  let predictedWall = Infinity;
  let queries = 0;
  rig.motion.dir = rig.yaw;
  rig.motion.speed = 2.4;
  rig.motion.next.set(-0.3, 0, -0.35);
  rig.space = {
    free(a, b) {
      queries++;
      const limit = a.x < -0.2 ? Math.min(wall, predictedWall) : wall;
      if (b.distanceToSquared(chest) <= limit ** 2) return 1;
      start.copy(a).sub(chest);
      ray.copy(b).sub(a);
      const projection = start.dot(ray), length = ray.lengthSq();
      return (-projection + Math.sqrt(projection ** 2 + length * (limit ** 2 - start.lengthSq()))) / length;
    },
    inside(p) { queries++; return p.distanceTo(chest) > wall + 1e-8; },
    overSolid() { queries++; return false; },
  };
  rig.snap();
  return {
    rig,
    open: (limit = 6) => { wall = limit; },
    obstructPrediction: () => { predictedWall = nearWall; },
    step(dt: number, follow = true) {
      rig.update(dt, rig.motion.dir, true, true, follow, recover);
      const pos = rig.cam.position.clone();
      return { pos, arm: chest.distanceTo(pos), queries };
    },
  };
}

it.each([
  { label: "60 Hz", cadence: [1 / 60] },
  { label: "slow frames", cadence: [1 / 60, 0.05, 1 / 30, 0.05] },
])("recovers a short portrait arm with continuous clearance at $label", ({ cadence }) => {
  const base = walkingRig(false, nearWall), candidate = walkingRig(true, nearWall);
  for (let frame = 0; frame < 48; frame++) {
    const dt = cadence[frame % cadence.length];
    const blocked = candidate.step(dt);
    expect(blocked).toEqual(base.step(dt));
    expect(blocked.arm).toBeLessThanOrEqual(nearWall + 1e-8);
  }
  base.open();
  candidate.open();
  let elapsed = 0, baseTime = Infinity, candidateTime = Infinity;
  let last = candidate.rig.cam.position.clone(), lastArm = nearWall;
  for (let frame = 0; frame < 300; frame++) {
    const dt = cadence[frame % cadence.length];
    elapsed += dt;
    const a = base.step(dt), b = candidate.step(dt);
    if (a.arm >= 3) baseTime = Math.min(baseTime, elapsed);
    if (b.arm >= 3) candidateTime = Math.min(candidateTime, elapsed);
    expect(b.arm).toBeGreaterThanOrEqual(lastArm - 1e-8);
    expect(b.pos.distanceTo(last) / dt).toBeLessThan(12);
    expect(b.pos.x).toBeCloseTo(0, 10);
    expect(b.arm).toBeLessThanOrEqual(6 + 1e-8);
    expect(b.queries).toBeLessThanOrEqual(a.queries);
    last = b.pos;
    lastArm = b.arm;
  }
  expect(candidateTime).toBeLessThan(baseTime);
  expect(candidateTime).toBeLessThanOrEqual(0.45);
  expect(lastArm).toBeCloseTo(6, 4);
  expect(last.distanceTo(base.rig.cam.position)).toBeLessThan(1e-4);
});

it("keeps the steady open view, user zoom and query count", () => {
  const base = walkingRig(false, Infinity), candidate = walkingRig(true, Infinity);
  for (const { rig } of [base, candidate]) rig.zoom(-200);
  for (let frame = 0; frame < 300; frame++) {
    expect(candidate.step(1 / 60)).toEqual(base.step(1 / 60));
  }
  expect(candidate.step(1 / 60).arm).toBeCloseTo(FOLLOW.dist * 0.8, 4);
});

it("shortens as before when walking toward an obstruction", () => {
  const base = walkingRig(false, 6), candidate = walkingRig(true, 6);
  base.obstructPrediction();
  candidate.obstructPrediction();
  let arm = 6;
  for (let frame = 0; frame < 100; frame++) {
    const dt = frame === 3 ? 0.05 : 1 / 60;
    const closing = candidate.step(dt);
    expect(closing).toEqual(base.step(dt));
    expect(closing.arm).toBeLessThanOrEqual(arm + 1e-8);
    arm = closing.arm;
  }
  expect(arm).toBeLessThan(2);
});

it.each(["blocked prediction", "follow off", "manual turn", "airborne"] as const)(
  "keeps ordinary response with %s", (condition) => {
    const base = walkingRig(false, nearWall), candidate = walkingRig(true, nearWall);
    for (const fixture of [base, candidate]) {
      fixture.open();
      if (condition === "blocked prediction") fixture.obstructPrediction();
      if (condition === "manual turn") fixture.rig.drag(20, 0);
      if (condition === "airborne") fixture.rig.hold = true;
    }
    for (let frame = 0; frame < 24; frame++) {
      const dt = frame === 3 ? 0.05 : 1 / 60;
      expect(candidate.step(dt, condition !== "follow off")).toEqual(base.step(dt, condition !== "follow off"));
    }
  },
);
