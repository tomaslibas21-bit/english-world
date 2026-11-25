// The Old Stone Ring's walkable lawn, stair and exit, in the live Maple Harbor town.
import assert from "node:assert/strict";
import { DEVICES, RING, distance, forward, look, openMap, suite, surface, walk } from "./fixtures/mh-cave.mjs";

const GATE = { x: -117, z: -48, half: 1.6 };
const LAWN = [-120, -48];
const STAIR = { x: -126, foot: -49.6, middle: -52.5, top: -55.4, back: -56.9, y: 3.6 };
const inHeadland = (x, z) => x >= -140 && x <= -112 && z >= -68 && z <= -43;
const inRing = (x, z) => x >= -134 && x <= -117 && z >= -57.5 && z <= -43.8;

function checkRoute(points, { throughGate = false } = {}) {
  let gate = false;
  for (let i = 1; i < points.length; i++) {
    const [ax, az] = points[i - 1], [bx, bz] = points[i];
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 0.15));
    for (let j = 0; j <= n; j++) {
      const x = ax + (bx - ax) * j / n, z = az + (bz - az) * j / n;
      assert(z >= -68 && z <= -43 && (x >= -112 || inHeadland(x, z)), JSON.stringify({ x, z, points }));
    }
    if ((ax > GATE.x) !== (bx > GATE.x)) {
      const crossZ = az + (bz - az) * (GATE.x - ax) / (bx - ax);
      assert(Math.abs(crossZ - GATE.z) < GATE.half, JSON.stringify({ crossZ, points }));
      gate = true;
    }
  }
  if (throughGate) assert(gate, `path crosses the actual gateway: ${JSON.stringify(points)}`);
}

async function stairsGeometry(run) {
  const art = await run.ev(({ x, foot, top, back }) => {
    const g = window.__ew.game, mesh = g.town.group.getObjectByName("slate-cove");
    if (!mesh) return null;
    const ray = new g.raycaster.constructor(), origin = g.player.root.position.clone(), down = origin.clone().set(0, -1, 0);
    const levels = Array.from({ length: 18 }, (_, i) => {
      const z = foot + (top - foot) * (i + 0.5) / 18;
      ray.set(origin.set(x, 8, z), down);
      return ray.intersectObject(mesh, false)[0]?.point.y ?? null;
    });
    ray.set(origin.set(x, 8, (top + back) / 2), down);
    return { visible: mesh.visible, vertices: mesh.geometry.attributes.position.count, levels,
      landing: ray.intersectObject(mesh, false)[0]?.point.y ?? null };
  }, STAIR);
  assert(art?.visible && art.vertices > 2000, JSON.stringify(art));
  assert(art.levels.every((y, i) => y !== null && Math.abs(y - ((i + 1) * 0.2 - 0.045)) < 0.02), JSON.stringify(art));
  assert(Math.abs(art.landing - (STAIR.y - 0.045)) < 0.02, JSON.stringify(art));
}

async function ring(run) {
  const map = await openMap(run, RING);
  await run.mark("old-stone-ring-map");
  await run.press(map.getByRole("button", { name: "Nuvesk mane", exact: true }));
  const way = await run.ev(() => {
    const g = window.__ew.game, p = g.player.root.position;
    return { from: [p.x, p.z], path: g.autoPath, target: g.objectiveTarget(),
      location: window.__ew.store.getState().hud.objective?.targetLoc };
  });
  assert(way.path?.length > 0 && way.target?.kind === "point" && way.location === "old-stone-ring", JSON.stringify(way));
  assert.deepEqual([way.target.x, way.target.z], LAWN);
  checkRoute([way.from, ...way.path], { throughGate: true });
  await surface(run, run.page.locator(".objective-card"), [RING[0]]);
  await run.wait(() => {
    const g = window.__ew.game, p = g.player.root.position;
    return Math.abs(p.x + 117) < 0.8 && Math.abs(p.z + 48) < 1.6 && g.zoneId === "town" && !g.swimming;
  }, "guide walks through the gap in the ring wall", 30_000, undefined, 1);
  await run.mark("ring-gateway");
  await run.wait(() => {
    const { game: g, store } = window.__ew, p = g.player.root.position;
    return !g.autoPath && g.zoneId === "town" && p.x < -117.8 && Math.hypot(p.x + 120, p.z + 48) < 0.65 &&
      !store.getState().conv.active && !g.swimming;
  }, "guide actually arrives on the lawn", 50_000);
  const lawn = await run.state();
  assert(lawn.y === 0 && inRing(lawn.x, lawn.z));
  assert(await run.ev(() => !window.__ew.game.npcs.some(({ home }) =>
    home.x > -134 && home.x < -117 && home.z > -57.5 && home.z < -43.8)));
  await stairsGeometry(run);
  await run.mark("ring-lawn");

  await walk(run, STAIR.x, STAIR.foot + 1.2);
  const foot = await run.state();
  assert.equal(foot.y, 0);
  await run.mark("stair-foot");
  await run.ev(([x, z]) => window.__ew.game.walkTo(x, z, { kind: "point" }), [STAIR.x, -56]);
  let middle;
  for (let i = 0; i < 400; i++) {
    await run.step(4);
    const s = await run.state();
    assert(inRing(s.x, s.z) && Math.abs(s.x - STAIR.x) < 1.7 && !s.swim, JSON.stringify(s));
    if (!middle && s.z < STAIR.middle) {
      middle = s;
      await run.mark("stair-middle");
    }
    if (!s.path) break;
  }
  const top = await run.state();
  assert(middle && middle.y > 1.5 && middle.y < 4 && top.y > STAIR.y - 0.12 && top.z < STAIR.top - 0.3,
    JSON.stringify({ foot, middle, top }));
  await run.mark("stair-landing");
  await look(run, Math.PI);
  await forward(run, () => run.step(150, 1000 / 60));
  const held = await run.state();
  assert(held.z > STAIR.back && Math.abs(held.y - STAIR.y) < 0.05 && Math.abs(held.x - STAIR.x) < 1.7,
    JSON.stringify(held));
  await run.mark("stair-back-blocks");

  await walk(run, STAIR.x, STAIR.foot + 2);
  const down = await run.state();
  assert(down.y === 0 && down.z > STAIR.foot && inRing(down.x, down.z));
  await run.ev(() => window.__ew.game.walkTo(-108, -59, { kind: "point" }));
  const path = await run.ev(() => window.__ew.game.autoPath);
  assert(path?.length);
  checkRoute([[down.x, down.z], ...path], { throughGate: true });
  await run.wait(() => {
    const g = window.__ew.game, p = g.player.root.position;
    return !g.autoPath && g.zoneId === "town" && p.x > -112 && Math.hypot(p.x + 108, p.z + 59) < 0.65 && p.y === 0 && !g.swimming;
  }, "walk down, out the gateway and back to town", 25_000);
  assert(distance(await run.state(), [-108, -59]) < 0.65);
  await run.mark("ring-return-to-town");

  // Run on the dev server so the walk-out flood checks the built colliders and ledges on both devices.
  const audit = await run.ev(async () => {
    const { climbAudit } = await import("/src/dev/climbAudit.ts"), { WORLD } = await import("/src/game/world/layout.ts");
    const g = window.__ew.game, r = climbAudit(g.town.colliders, g.ledges, WORLD, [28, -14.6], 0.25);
    return { outside: r.outside, first: r.outsideAt, max: r.maxHeight, reached: r.reached };
  });
  assert(audit.reached > 0 && audit.outside === 0, JSON.stringify(audit));
  console.log("climbAudit", JSON.stringify(audit));
}

await suite("mh-ruins", async (run) => {
  for (const device of [...DEVICES, [375, 667]]) {
    await run(device, "ring-foot-route", { boot: 240_000, save: { profile: { gender: "f", lookId: "f1" } } }, ring);
  }
});
