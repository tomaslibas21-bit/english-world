// The conversation's nearer view (game/talkShot.ts): over the learner's shoulder, never from behind them; and the
// first visit's flight over the town (game/flyover.ts).
import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { covers, NEAR_TALK, shoulderShots } from "../src/game/talkShot";
import { FLIGHT_SECONDS, flightAt, type FlyKey } from "../src/game/flyover";
import { THEME } from "../src/game/world/theme";

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

describe("the conversation's nearer view", () => {
  // the learner at the origin, the other person 1.2 m north of them (as at a counter), both 1.7 m tall
  const p = V(0, 0, 0), a = V(0, 0, -1.2), face = V(0, 1.52, -1.2);
  const me = { x: 0, y: 0, z: 0, top: 1.9, r: 0.34 };

  it("a camera straight behind the learner has their head over the other's face; over the shoulder it has not", () => {
    expect(covers(V(0, 1.9, 4), face, me)).toBe(true);
    // (the old room camera: high, 1.8 m to the side, 6 m back: over their head by a hand's breadth)
    expect(covers(V(1.8, 4.6, 5.6), face, me)).toBe(false);
    // from in front of the other person the learner is behind the face, not before it
    expect(covers(V(0, 1.8, -4), face, me)).toBe(false);
    // and a line that passes over the learner's head is free
    expect(covers(V(0, 6, 3), face, me)).toBe(false);
  });

  it("every view offered is clear of the learner, turned to the other's front, and starts near", () => {
    const focus = new THREE.Vector3().lerpVectors(p, a, 0.62).setY(1.35);
    const shots = [...shoulderShots(p, a, focus, NEAR_TALK, 30, 1)];
    expect(shots.length).toBeGreaterThan(40);
    expect(shots[0].pos.distanceTo(focus)).toBeLessThan(NEAR_TALK * 1.2);
    for (const s of shots) {
      for (const dx of [-0.2, 0, 0.2]) expect(covers(s.pos, V(dx, 1.52, -1.2), me)).toBe(false);
      // on the learner's side of the other person (their face is seen, not the back of their head), and above the floor
      expect(s.pos.z).toBeGreaterThan(a.z);
      expect(s.pos.y).toBeGreaterThan(2);
      expect(s.look).toBe(focus);
    }
    // the first on the side asked for, the second its mirror image
    expect(Math.sign(shots[0].pos.x)).toBe(-Math.sign(shots[1].pos.x));
    expect(shots[0].pos.x).toBeLessThan(0);
    expect([...shoulderShots(p, a, focus, NEAR_TALK, 30, -1)][0].pos.x).toBeGreaterThan(0);
    // and they go out to the limit, no further
    expect(Math.max(...shots.map((s) => Math.hypot(s.pos.x - focus.x, s.pos.z - focus.z)))).toBeCloseTo(30, 0);
  });
});

describe("the first visit's flight over the town", () => {
  it("starts at the path's first point and ends at its last, smoothly, above the ground all the way", () => {
    const keys: FlyKey[] = THEME.flyover;
    expect(keys.length).toBeGreaterThan(1);
    expect(FLIGHT_SECONDS).toBeGreaterThan(3);
    expect(FLIGHT_SECONDS).toBeLessThan(10);
    const first = flightAt(keys, 0), last = flightAt(keys, 1);
    expect(first.pos.toArray()).toEqual(keys[0].pos);
    expect(last.pos.distanceTo(V(...keys[keys.length - 1].pos))).toBeLessThan(1e-6);
    expect(last.look.distanceTo(V(...keys[keys.length - 1].look))).toBeLessThan(1e-6);
    let prev = first.pos.clone(), longest = 0;
    for (let i = 1; i <= 200; i++) {
      const f = flightAt(keys, i / 200);
      expect(f.pos.y).toBeGreaterThan(5);
      longest = Math.max(longest, f.pos.distanceTo(prev));
      prev = f.pos.clone();
    }
    // no jump anywhere: under 3 m between two of 200 steps (about 90 m/s at most)
    expect(longest).toBeLessThan(3);
    // past its end it stays at the end
    expect(flightAt(keys, 1.5).pos.distanceTo(last.pos)).toBeLessThan(1e-6);
  });
});
