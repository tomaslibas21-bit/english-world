// The walk (movement.ts), the follow camera's room (occlusion.ts, camera.ts) and the trees that fade (fade.ts), without
// a browser: the direction pressed and the camera's swing, the eased turn and speed, the jump and what it can land on (ledges.ts), the shore (water.ts), what blocks the
// camera's line to the player and where the camera ends up.
import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { Steer, Gait, Hop, angleDiff, springStep } from "../src/game/movement";
import { OcclusionField } from "../src/game/occlusion";
import { wantFade } from "../src/game/fade";
import { CameraRig } from "../src/game/camera";
import { Colliders } from "../src/game/world/util";
import { Ledges } from "../src/game/ledges";
import { Wading, sandY, SHORE, SEA_LEVEL } from "../src/game/water";

const PI = Math.PI;
const near = (a: number, b: number, eps = 1e-6) => Math.abs(angleDiff(a, b)) < eps;

describe("angles and springs", () => {
  it("angleDiff takes the short way round", () => {
    expect(angleDiff(0.1, -0.1)).toBeCloseTo(0.2);
    expect(angleDiff(PI - 0.1, -PI + 0.1)).toBeCloseTo(-0.2);
    expect(angleDiff(3 * PI, 0)).toBeCloseTo(PI);
  });
  it("a critically damped step never overshoots and gets there, even in one long step", () => {
    let x = 0, v = 0, max = 0;
    for (let i = 0; i < 120; i++) { [x, v] = springStep(x, v, 1, 12, 1 / 60); max = Math.max(max, x); }
    expect(max).toBeLessThanOrEqual(1 + 1e-9);
    expect(x).toBeGreaterThan(0.999);
    [x, v] = springStep(0, 0, 1, 12, 0.05);
    expect(x).toBeGreaterThan(0);
    expect(x).toBeLessThan(1);
  });
});

describe("Steer: the direction pressed", () => {
  it("the back key means towards the camera, and stays put in the world while the camera swings in behind", () => {
    const s = new Steer();
    const yaw0 = 0.3;
    const r = s.update(0, -1, false, yaw0, 0, 1 / 60);
    expect(near(r.dir!, yaw0 + PI)).toBe(true);
    // the camera swings round by itself, a quarter of the way at a time: the heading doesn't move
    let yaw = yaw0;
    for (let i = 0; i < 4; i++) {
      yaw += PI / 4;
      expect(near(s.update(0, -1, false, yaw, 0, 1 / 60).dir!, yaw0 + PI)).toBe(true);
    }
  });

  it("once the camera is behind them, the back key with a side key turns that way on the screen (no running back)", () => {
    const s = new Steer();
    s.update(0, -1, false, 0, 0, 1 / 60); // heading π
    const yaw = PI; // the camera has come round behind: back is now "on"
    s.update(0, -1, false, yaw, 0, 1 / 60);
    const r = s.update(1, -1, false, yaw, 0, 1 / 60); // back + right
    // up-and-right on the screen: 45° to the right of where the camera looks (right = yaw − π/2)
    expect(near(r.dir!, yaw - PI / 4)).toBe(true);
    // and the side key alone means the side, as the screen shows it
    expect(near(s.update(1, 0, false, yaw, 0, 1 / 60).dir!, yaw - PI / 2)).toBe(true);
  });

  it("dragging the view while a key is held steers with it", () => {
    const s = new Steer();
    s.update(0, 1, false, 0, 0, 1 / 60);
    const r = s.update(0, 1, false, 0.4, 0.4, 1 / 60);
    expect(near(r.dir!, 0.4)).toBe(true);
  });

  it("the stick held towards the camera: steady through the camera's swing, and its lower half means on once the camera is behind", () => {
    const s = new Steer();
    let yaw = 0;
    expect(near(s.update(0, -1, true, yaw, 0, 1 / 60).dir!, PI)).toBe(true);
    for (let i = 0; i < 30; i++) { yaw += PI / 30; s.update(0, -1, true, yaw, 0, 1 / 60); }
    // the camera now looks where they walk; the thumb moves from 6 towards 4 o'clock: they turn right on the screen
    const before = s.update(0, -1, true, yaw, 0, 1 / 60).dir!;
    const after = s.update(0.7, -0.7, true, yaw, 0, 1 / 60).dir!;
    expect(angleDiff(after, before)).toBeLessThan(-0.5); // right = a smaller heading
  });

  it("nothing pressed: no direction; through a door the walk carries on the way they now face", () => {
    const s = new Steer();
    expect(s.update(0, 0, false, 0, 0, 1 / 60).dir).toBeNull();
    s.update(0, -1, false, PI, 0, 1 / 60); // indoors: walking out towards the camera
    s.carry(1.2, 1.2); // outside: facing out of the door, the camera behind
    expect(near(s.update(0, -1, false, 1.2, 0, 1 / 60).dir!, 1.2)).toBe(true);
    // and the side keys now mean the screen's sides
    expect(near(s.update(-1, -1, false, 1.2, 0, 1 / 60).dir!, 1.2 + PI / 4)).toBe(true);
  });
});

describe("Gait: the turn and the speed", () => {
  it("turns round quickly but eased, slowing first instead of sliding backwards", () => {
    const g = new Gait();
    g.sync(0, 4.4);
    let t = 0, maxTurn = 0;
    while (Math.abs(angleDiff(PI, g.facing)) > 0.02 && t < 2) {
      const before = g.facing;
      const v = g.step(1 / 60, PI, 4.4);
      maxTurn = Math.max(maxTurn, Math.abs(angleDiff(g.facing, before)) * 60);
      // the walk always goes the way they face
      expect(v.vx * Math.sin(g.facing) + v.vz * Math.cos(g.facing)).toBeGreaterThanOrEqual(0);
      t += 1 / 60;
    }
    expect(t).toBeLessThan(0.6);
    expect(maxTurn).toBeLessThanOrEqual(g.maxTurn + 1e-6);
  });

  it("starts and stops gently: up to speed in about half a second, a short glide to a stop", () => {
    const g = new Gait();
    g.sync(0, 0);
    let t = 0;
    while (g.speed < 0.9 * 4.4 && t < 2) { g.step(1 / 60, 0, 4.4); t += 1 / 60; }
    expect(t).toBeGreaterThan(0.25);
    expect(t).toBeLessThan(0.7);
    for (let i = 0; i < 60; i++) g.step(1 / 60, 0, 4.4);
    let glide = 0;
    for (let i = 0; i < 120; i++) glide += g.step(1 / 60, null, 0).vz / 60;
    expect(g.speed).toBe(0);
    expect(glide).toBeGreaterThan(0.2);
    expect(glide).toBeLessThan(0.9);
  });
});

describe("Hop: a jump that lands on what is under it", () => {
  it("goes up about three quarters of a metre and lands in a little over half a second, softly", () => {
    const h = new Hop();
    expect(h.start()).toBe(true);
    let peak = 0, t = 0, landed = 0;
    while (h.air && t < 2) { landed = h.update(1 / 60); peak = Math.max(peak, h.y); t += 1 / 60; }
    expect(peak).toBeLessThanOrEqual(Hop.PEAK + 1e-6);
    expect(peak).toBeGreaterThan(0.65);
    expect(Hop.PEAK).toBeLessThan(0.85);
    expect(t).toBeLessThan(0.65);
    expect(landed).toBeGreaterThan(0);
    expect(h.y).toBe(0);
    expect(h.squash).toBeGreaterThan(0); // the landing's squash
  });

  it("no second jump in the air or the instant it lands; land() puts them down at once", () => {
    const h = new Hop();
    h.start();
    h.update(1 / 60);
    expect(h.start()).toBe(false);
    h.land();
    expect(h.y).toBe(0);
    expect(h.air).toBe(false);
    expect(h.start()).toBe(true);
  });

  it("lands on a seat that comes under it, stands there, and falls when it walks off the edge", () => {
    const h = new Hop();
    h.start();
    let landed = 0, t = 0;
    // over the street until the feet are above the seat (0.55 m), then over the seat
    while (h.air && t < 2) { landed = h.update(1 / 60, h.y > 0.55 && h.vy < 2 ? 0.55 : 0); t += 1 / 60; }
    expect(h.y).toBeCloseTo(0.55, 5);
    expect(h.lift).toBe(0);
    expect(landed).toBeGreaterThan(0);
    expect(landed).toBeLessThan(0.6); // a short drop onto it: a softer landing than onto the street
    // standing on it
    for (let i = 0; i < 30; i++) h.update(1 / 60, 0.55);
    expect(h.air).toBe(false);
    // off the edge: a fall, not a snap
    h.update(1 / 60, 0);
    expect(h.air).toBe(true);
    expect(h.y).toBeGreaterThan(0.5);
    let fell = 0;
    for (let i = 0; i < 60 && h.air; i++) fell = Math.max(fell, h.update(1 / 60, 0));
    expect(h.y).toBe(0);
    expect(fell).toBeGreaterThan(0);
  });

  it("follows the sand down into the shallows without falling, and a jump from there comes back to it", () => {
    const h = new Hop();
    for (let i = 0; i <= 40; i++) { h.update(1 / 60, -i * 0.01); expect(h.air).toBe(false); }
    expect(h.y).toBeCloseTo(-0.4, 5);
    h.start();
    let top = -1;
    for (let i = 0; i < 80 && h.air; i++) { h.update(1 / 60, -0.4); top = Math.max(top, h.y); }
    expect(top).toBeGreaterThan(0.2);
    expect(h.y).toBeCloseTo(-0.4, 5);
  });

  it("the walls and fences are on the ground plan: a jump changes nothing about where one can go", () => {
    // a fence 1 m high and 0.2 m thick between x 0.9 and 1.1; walking (or jumping) at it stops at it
    const c = new Colliders();
    c.addBox(1, 0, 0.2, 10);
    const p = new THREE.Vector3(0, 0, 0);
    for (let i = 0; i < 60; i++) { p.x += 0.1; c.resolve(p, 0.38, true); }
    expect(p.x).toBeLessThanOrEqual(0.9 - 0.38 + 1e-6);
  });
});

/** A street corner as the town builds one: a bench (a seat 0.55 m up, its back to 1.05 m, a collider thinner than the
 *  seat), a planter 0.5 m high, a fence 1 m high, a counter, a car, a café table with its chair, a pier's deck under its
 *  invisible edge, and someone standing (a collider with nothing built in it). */
function corner() {
  const g = new THREE.Group();
  const add = (geo: THREE.BufferGeometry) => g.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial()));
  const col = new Colliders();
  // the bench at (0, 0): seat z -0.25…0.25, back at z -0.22
  add(new THREE.BoxGeometry(1.8, 0.1, 0.5).translate(0, 0.5, 0));
  add(new THREE.BoxGeometry(1.8, 0.5, 0.08).translate(0, 0.8, -0.22));
  for (const s of [-0.75, 0.75]) add(new THREE.BoxGeometry(0.08, 0.5, 0.4).translate(s, 0.25, 0));
  col.addBox(0, 0, 2.2, 0.3);
  // the planter at (6, 0), 1.6 × 0.6, 0.5 m high
  add(new THREE.BoxGeometry(1.6, 0.5, 0.6).translate(6, 0.25, 0));
  col.addBox(6, 0, 1.7, 0.7);
  // the fence at (12, 0), 1 m high
  add(new THREE.BoxGeometry(0.2, 1, 6).translate(12, 0.5, 0));
  col.addBox(12, 0, 0.2, 6);
  // the counter at (18, 0), 1 m high and 0.7 m deep
  add(new THREE.BoxGeometry(3, 1, 0.7).translate(18, 0.5, 0));
  col.addBox(18, 0, 3, 0.7);
  // the car at (24, 0): a body from 0.3 to 1 m, bumpers 0.42 m up at its ends
  add(new THREE.BoxGeometry(1.9, 0.7, 4.2).translate(24, 0.65, 0));
  for (const s of [-2.17, 2.17]) add(new THREE.BoxGeometry(1.96, 0.16, 0.12).translate(24, 0.42, s));
  col.addBox(24, 0, 2, 4.4);
  // the café table at (30, 0) with a chair 0.5 m high beside it
  add(new THREE.CylinderGeometry(0.5, 0.5, 0.06, 12).translate(30, 0.75, 0));
  add(new THREE.BoxGeometry(0.45, 0.5, 0.45).translate(30.8, 0.25, 0));
  col.addCircle(30, 0, 0.9);
  // the pier's deck (0.3 m thick, 10 m wide) and its edge at x 41: an invisible wall
  add(new THREE.BoxGeometry(10, 0.3, 8).translate(40, 0.15, 0));
  col.addBox(44.9, 0, 0.3, 8);
  // someone standing at (50, 0)
  col.addCircle(50, 0, 0.45);
  const led = Ledges.build(g, col, { keep: [[30.8, 0]] });
  return { led, col };
}

describe("Ledges: what can be jumped onto, from the place's own geometry", () => {
  const { led, col } = corner();
  /** Walks from (x, z0) along +z or -z at ground level, jumping when asked; returns where they end up. */
  const walk = (x: number, z0: number, dz: number, jumpAt: number | null, steps = 140) => {
    const p = new THREE.Vector3(x, 0, z0), hop = new Hop();
    let on = 0;
    for (let i = 0; i < steps; i++) {
      if (jumpAt !== null && i === jumpAt) hop.start();
      p.z += dz * 4.4 / 60;
      col.resolve(p, 0.38, true);
      led.resolve(p, 0.38, hop.y, hop.air);
      const under = led.support(p.x, p.z, hop.y, hop.air);
      on = Math.max(on, under);
      hop.update(1 / 60, under);
    }
    return { z: p.z, y: hop.y, on };
  };

  it("the bench and the planter are split into pieces with a height; nothing else is touched", () => {
    expect(led.ready).toBe(true);
    const split = col.boxes.filter((b) => b.split).map((b) => Math.round((b.minX + b.maxX) / 2));
    expect(split).toEqual([0, 6]);
    expect(col.circles.some((c) => c.split)).toBe(false);
    // the seat is the whole seat, wider than its collider; the back stays a wall
    expect(led.support(0, 0.1, 0.6, true)).toBeCloseTo(0.55, 2);
    expect(led.pieces.some((q) => q.top === Infinity && q.minZ < -0.2 && q.maxX > 0.5 && q.minX < -0.5 && q.maxX < 2)).toBe(true);
  });

  it("walking at a bench stops at it; a jump lands on its seat; its back still stops them", () => {
    const stopped = walk(0, 2, -1, null);
    expect(stopped.y).toBe(0);
    expect(stopped.z).toBeGreaterThan(0.25 + 0.38 - 0.13);
    const on = walk(0, 2, -1, 14);
    expect(on.y).toBeCloseTo(0.55, 2);
    expect(on.z).toBeGreaterThan(-0.3 + 0.38 - 0.13); // held by the back, standing on the seat
    expect(on.z).toBeLessThan(0.3);
  });

  it("a jump clears a planter; without one it is in the way", () => {
    expect(walk(6, 2, -1, null).z).toBeGreaterThan(0.3);
    const over = walk(6, 2, -1, 12, 200);
    expect(over.z).toBeLessThan(-1);
    expect(over.y).toBe(0);
  });

  it("no jump gets onto or over a fence, a counter, a car, a café table or its chair, a pier's edge or a person", () => {
    for (const [x, edge] of [[12, 3], [18, 0.35], [24, 2.2], [30, 0.9], [30.8, 0.4], [44.9, 4], [50, 0.45]] as const) {
      for (const jumpAt of [null, 4, 10, 16, 22, 28]) {
        const z0 = edge + 2.6;
        const r = walk(x, z0, -1, jumpAt);
        // never on it or over it (a round thing met off its middle is walked round, on the ground)
        expect(r.on, `x ${x}, jump at ${jumpAt}`).toBe(0);
        expect(r.y).toBe(0);
        if (x !== 30.8 && x !== 50 && x !== 30) expect(r.z, `x ${x}, jump at ${jumpAt}`).toBeGreaterThan(Math.min(edge, 0.3));
      }
    }
  });
});

describe("the shore: the sand under the sea, and wading", () => {
  it("the sand is flat up the beach, slopes under the water without a step, and is knee to waist deep at the limit", () => {
    expect(sandY(0, SHORE.top + 2)).toBe(0);
    let last = 0;
    for (let z = SHORE.top + 1; z > SHORE.limit; z -= 0.05) {
      const y = sandY(10, z);
      expect(y).toBeLessThanOrEqual(last + 1e-9);
      expect(last - y).toBeLessThan(0.03);
      last = y;
    }
    // the ground's edge is always under the water, whatever the swell
    for (let x = -100; x < 180; x += 7) expect(sandY(x, SHORE.edge)).toBeLessThan(SEA_LEVEL - 0.27);
    const deep = SEA_LEVEL - sandY(10, SHORE.limit);
    expect(deep).toBeGreaterThan(0.3);
    expect(deep).toBeLessThan(0.6);
  });

  it("the water slows a wader, and the seaward part of a step fades to nothing at the limit", () => {
    expect(Wading.pace(0)).toBe(1);
    expect(Wading.pace(0.4)).toBeLessThan(0.8);
    expect(Wading.pace(0.4)).toBeGreaterThan(0.45);
    expect(Wading.hold(-60, -0.1)).toBe(-0.1);
    expect(Wading.hold(SHORE.limit + 0.3, -0.1)).toBeGreaterThan(-0.05);
    expect(Wading.hold(SHORE.limit, -0.1)).toBeCloseTo(0, 9);
    expect(Wading.hold(SHORE.limit, 0.1)).toBe(0.1); // back towards the beach: free
    let z = SHORE.limit + 2;
    for (let i = 0; i < 600; i++) z += Wading.hold(z, -4.4 / 60);
    expect(z).toBeGreaterThanOrEqual(SHORE.limit);
    expect(z).toBeLessThan(SHORE.limit + 0.2);
  });

  it("the sea is closed to the passers-by and open to the player as far as the limit", () => {
    const c = new Colliders();
    c.addBox(0, -100, 200, 56, "sea"); // z -128…-72
    const walker = new THREE.Vector3(0, 0, -73), player = new THREE.Vector3(0, 0, -73);
    c.resolve(walker, 0.38);
    c.resolve(player, 0.38, true);
    expect(walker.z).toBeGreaterThan(-72);
    expect(player.z).toBe(-73);
  });
});

/** A small place: a 10 m × 10 m building 7 m high east of the origin (x 2…12), with a roof over its walls, a thin post,
 *  and an awning (no posts, 2.8 m up) along its west face, as a town's meshes and colliders give them. */
function place() {
  const g = new THREE.Group();
  const add = (geo: THREE.BufferGeometry) => g.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial()));
  add(new THREE.BoxGeometry(10, 7, 10).translate(7, 3.5, 0));
  add(new THREE.CylinderGeometry(0.08, 0.08, 4).translate(-6, 2, 0)); // a lamp post
  add(new THREE.BoxGeometry(1.6, 0.14, 6).translate(1.2, 2.85, 0)); // the awning, sticking out 1.6 m (x 0.4…2)
  const field = OcclusionField.fromObject(g, { minX: -20, maxX: 20, minZ: -20, maxZ: 20 });
  const col = new Colliders();
  col.addBox(7, 0, 10, 10);
  col.addCircle(-6, 0, 0.18);
  field.fillFootprints(col.boxes, col.circles);
  return field;
}

describe("OcclusionField: what blocks the camera's line, from the place's geometry", () => {
  const f = place();
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

  it("a building between the player and the camera blocks the line where it starts, a lamp post doesn't", () => {
    const t = f.free(V(0, 1.35, 4), V(14, 6, 4)); // east, through the building
    expect(t).toBeGreaterThan(0);
    expect(t).toBeLessThan(0.2);
    expect(f.free(V(0, 1.35, 3.5), V(-12, 6, 3.5))).toBe(1); // west, past nothing
    expect(f.free(V(-3, 1.6, 0), V(-9, 1.6, 0))).toBe(1); // through the post: a post is no wall
  });

  it("the building is solid inside, and the camera keeps off its top", () => {
    expect(f.solidAt(7, 3, 0)).toBe(true);
    expect(f.overSolid(7, 0)).toBe(true);
    expect(f.overSolid(-3, 0)).toBe(false);
  });

  it("a wall on the line between two cells belongs to the building, not to the pavement in front of it", () => {
    // the west wall stands at x 2: half a metre in front of it nothing is solid at head height
    expect(f.solidAt(1.75, 1.6, 4)).toBe(false);
    expect(f.solidAt(2.25, 1.6, 4)).toBe(true);
  });

  it("under an awning: the line goes on under it from a player under it, but not in under it from one outside", () => {
    expect(f.under(V(1.2, 1.35, 0))).toBe(true);
    expect(f.free(V(1.2, 1.35, 0), V(1.2, 1.9, -8))).toBe(1); // along the shopfront, under the awning
    expect(f.free(V(-3, 1.35, 0), V(1.5, 2.2, 0))).toBeLessThan(1); // from the street in under it
  });
});

describe("the follow camera", () => {
  const f = place();
  const space = { free: (a: THREE.Vector3, b: THREE.Vector3) => f.free(a, b), inside: (p: THREE.Vector3) => f.solidAt(p.x, p.y, p.z, 0.15), overSolid: (x: number, z: number) => f.overSolid(x, z) };

  it("with a wall right behind the player it stays clear of it (in front of it, up over their head)", () => {
    const rig = new CameraRig(1.6);
    rig.space = space;
    rig.target.set(-1, 0, 4); // a metre from the building's west wall, facing west, the camera to the east
    rig.yaw = -PI / 2;
    rig.snap();
    rig.update(1 / 60, 0, false, true, true);
    const p = rig.cam.position.clone();
    rig.update(1 / 60, 0, false, true, true);
    const q = rig.cam.position;
    expect(q.x).toBeLessThan(2); // not inside the building
    expect(f.solidAt(q.x, q.y, q.z)).toBe(false);
    expect(f.free(new THREE.Vector3(-1, 1.35, 4), q)).toBeGreaterThan(0.95); // the player in sight
    expect(q.distanceTo(p)).toBeLessThan(0.05); // settled where snap() put it
  });

  it("walking back towards it, after a moment it swings in behind them, the way they turned", () => {
    const rig = new CameraRig(1.6);
    rig.space = space;
    rig.target.set(-10, 0, -10);
    rig.yaw = 0;
    rig.snap();
    rig.motion.dir = PI - 0.3; // towards the camera, a little to one side
    rig.motion.speed = 4.4;
    rig.motion.next.set(-10, 0, -11);
    const yaws: number[] = [];
    for (let i = 0; i < 150; i++) { rig.update(1 / 60, 0, true, true, true); yaws.push(rig.yaw); }
    expect(Math.abs(angleDiff(yaws[5], 0))).toBeLessThan(0.05); // not at once
    expect(Math.abs(angleDiff(rig.yaw, PI - 0.3))).toBeLessThan(0.25); // behind them after 2.5 s
    // one way round, smoothly: never a jump of more than 3° a frame
    for (let i = 1; i < yaws.length; i++) expect(Math.abs(angleDiff(yaws[i], yaws[i - 1]))).toBeLessThan(0.05);
  });

  it("boxed in by a wall right behind them, it slides round to where there is room", () => {
    // a block 6 m high just behind her (she stands half a metre from its west face, facing west): nothing behind is
    // clear, nor above her
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.BoxGeometry(4, 6, 4).translate(4, 3, 0), new THREE.MeshBasicMaterial()));
    const f2 = OcclusionField.fromObject(g, { minX: -20, maxX: 20, minZ: -20, maxZ: 20 });
    const c2 = new Colliders();
    c2.addBox(4, 0, 4, 4);
    f2.fillFootprints(c2.boxes, c2.circles);
    const rig = new CameraRig(1.6);
    rig.space = { free: (a, b) => f2.free(a, b), inside: (p) => f2.solidAt(p.x, p.y, p.z, 0.15), overSolid: (x, z) => f2.overSolid(x, z) };
    rig.target.set(1.5, 0, 0);
    rig.yaw = -PI / 2;
    rig.snap();
    for (let i = 0; i < 180; i++) rig.update(1 / 60, 0, false, true, true);
    expect(Math.abs(angleDiff(rig.yaw, -PI / 2))).toBeGreaterThan(0.4);
    expect(rig.cam.position.distanceTo(new THREE.Vector3(1.5, 1.35, 0))).toBeGreaterThan(3);
    expect(f2.solidAt(rig.cam.position.x, rig.cam.position.y, rig.cam.position.z)).toBe(false);
  });

  it("the conversation's lens and near plane are as they were (50°, 0.1 m)", () => {
    const rig = new CameraRig(1.6);
    rig.mode = "talk";
    rig.talk = { pos: new THREE.Vector3(0, 3, 6), look: new THREE.Vector3(0, 1.3, 0) };
    expect(rig.fovFor(1280, 800, false)).toBe(50);
    expect(rig.fovFor(375, 812, true)).toBe(50);
    rig.snap();
    rig.update(0, 0, false, false, false);
    expect(rig.cam.near).toBe(0.1);
    expect(rig.cam.position.toArray()).toEqual([0, 3, 6]);
  });
});

describe("the trees fade out of the camera's way", () => {
  const sp = new Float32Array([5, 3, 0, 1.5]); // a crown 1.5 m round at (5, 3, 0)
  it("a crown on the line from the camera to the player, or right at the camera, fades; one beside it doesn't", () => {
    expect(wantFade(sp, 0, new THREE.Vector3(10, 4, 0), new THREE.Vector3(0, 1.35, 0))).toBe(1);
    expect(wantFade(sp, 0, new THREE.Vector3(5.5, 3.5, 0.5), new THREE.Vector3(-5, 1.35, 0))).toBe(1);
    expect(wantFade(sp, 0, new THREE.Vector3(10, 4, 6), new THREE.Vector3(0, 1.35, 6))).toBe(0);
    // behind the player's back (the line ends at their chest)
    expect(wantFade(sp, 0, new THREE.Vector3(-10, 4, 0), new THREE.Vector3(0, 1.35, 0))).toBe(0);
  });
});
