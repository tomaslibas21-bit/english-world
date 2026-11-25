// Ordinary movement from Harbor Road, two dry crossings, both exits, and returns by the opposite mouth.
import assert from "node:assert/strict";
import {
  DEVICES, DOORS, crossIn, distance, exitVia, settled, suite, surface, trail, walk,
} from "./fixtures/mh-cave.mjs";

async function roundTrip(run, first) {
  const other = first === "main" ? "cleft" : "main";
  assert(distance(await run.state(), [-101, -55]) < 0.5);
  assert.equal((await run.state()).visits, 0);
  // The first approach on each device uses real projected taps and the game's path solver.
  await trail(run, first, true);
  const start = await crossIn(run, first, true);
  assert(start.card.n === 1 && start.card.of === 5 && start.mask === 0 && start.visits === 1);
  await surface(run, run.page.locator(".town-toasts .toast.tip").first(),
    ["Radote Skalūnų įlankos olą!", "Pasikalbėkite su Bramu ant pilkojo tako."]);
  await surface(run, run.page.locator(".cave-card"), ["Tide Hall", "1 / 5"]);

  assert.equal(start.savedPlace.zone, "gruta");
  assert(distance(start.savedPlace, DOORS[first].spawn) < 0.1);
  await run.enter(true);
  await settled(run, "gruta");
  const restored = await run.state();
  assert.equal(restored.visits, 1);
  assert(distance(restored, DOORS[first].spawn) < (first === "main" ? 2.5 : 1.5));
  assert.deepEqual(restored.cave, start.cave);
  await run.mark("reload-inside-no-visit");

  // Leave on the matching side first. The held input must be cleared across the seam.
  const back = await exitVia(run, first, { hold: true, timeout: 15_000 });
  assert.equal(back.visits, 1);
  await run.step(30);
  assert.equal((await run.state()).zone, "town");
  assert.equal((await run.state()).visits, 1);

  // The dry trails split west of the town wall. Walk the branch in the other direction.
  const split = first === "main" ? [[-128, -61.7], [-119, -60]] : [[-119, -60], [-128, -61.7]];
  for (const [x, z] of [...split, DOORS[other].out]) {
    await walk(run, x, z, { near: 1.3, timeout: 30_000 });
    const s = await run.state();
    assert(s.zone === "town" && s.y >= 0 && !s.swim && s.x < -116 && s.z < -59, JSON.stringify(s));
  }
  await run.mark("other-side-of-dry-split");
  const again = await crossIn(run, other, true);
  assert.equal(again.visits, 2);
  assert.equal(again.mask, 0);
  // Return through the original opening this time, proving exit identity is independent of entry.
  const swapped = await exitVia(run, first, { action: true, timeout: 15_000 });
  assert(distance(swapped, DOORS[first].out) < 2.5 && distance(swapped, DOORS[other].out) > 8);
  assert.equal(swapped.visits, 2);
  await run.step(42);
  assert.equal((await run.state()).zone, "town");
  assert.equal((await run.state()).visits, 2);
  await run.mark("swapped-return");
}

await suite("mh-cave-ways", async (run) => {
  for (const device of DEVICES) {
    for (const door of ["main", "cleft"]) {
      await run(device, `start-${door}`, {}, (view) => roundTrip(view, door));
    }
  }
});
