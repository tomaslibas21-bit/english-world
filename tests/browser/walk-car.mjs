// A walk to a spot (a tap, G, "Take me there") meets a car of the traffic standing on the crosswalk: the learner waits
// behind it and, once it drives off, walks on to the end (it used to give up there and stand, 26 Nov 2026).
// WORLD_TEST_URL=http://127.0.0.1:8885 WORLD_STORAGE=puerto-colibri WORLD_PLAYWRIGHT_MODULE=playwright node tests/browser/walk-car.mjs
import assert from "node:assert/strict";
import { openQuestTown, questBrowser } from "./quests-harness.mjs";

const sizes = [[1280, 800], [390, 844]];
const browser = await questBrowser();
try {
  for (const [width, height] of sizes) {
    const { context, page } = await openQuestTown(browser, width, height);
    const label = `walk-car-${width}x${height}`;
    try {
      // A straight crossing of Main Street, south to north, and a car stopped in the first lane on it.
      const setup = await page.evaluate(() => {
        const { game } = window.__ew;
        const town = game.town, cars = game.ambient.traffic;
        const lane = Math.min(...cars.map((c) => c.lane).filter((z) => z > -20 && z < 0));
        const car = cars.find((c) => c.lane === lane);
        for (let x = -40; x <= 100; x += 1.5) {
          const from = [x, -15], to = [x, -1];
          if (!town.walkableAt(...from) || !town.walkableAt(...to) || !town.walkableAt(x, lane)) continue;
          const path = game.zone.nav.path(...from, ...to, true);
          if (!path || path.length < 2) continue;
          let length = 0;
          for (let i = 1; i < path.length; i++) length += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
          if (length > 14.6 || path.some(([px]) => Math.abs(px - x) > 0.6)) continue;
          if (game.npcs.some((n) => Math.hypot(n.home.x - x, n.home.z + 8) < 6)) continue;
          window.__walkCar = { car, max: car.max };
          for (const c of cars) if (c !== car) { c.hidden = 999; c.mesh.visible = false; }
          Object.assign(car, { x, hidden: 0, grow: 1, speed: 0, max: 0, crashStop: 0 });
          car.mesh.visible = true;
          game.placeOnFoot(...from, 0);
          game.walkTo(...to, { kind: "point" });
          return { x, lane, half: car.half, from, to };
        }
        return null;
      });
      assert(setup, "a straight crossing of Main Street");
      const state = () => page.evaluate(() => {
        const { game } = window.__ew, p = game.player.root.position;
        return { x: p.x, z: p.z, walking: !!game.autoPath?.length, anim: game.player.anim, carX: window.__walkCar.car.x };
      });
      // the car stands there for 3 s: the learner waits south of it, the walk still on
      await page.waitForTimeout(3000);
      const waiting = await state();
      assert(waiting.walking, `${label}: the walk waits for the car (${JSON.stringify(waiting)})`);
      assert(waiting.z < setup.lane - setup.half.z && waiting.z > setup.from[1] + 2,
        `${label}: the learner stopped short of the car (${JSON.stringify(waiting)})`);
      assert.equal(waiting.anim, "idle", `${label}: standing, not walking into the car`);
      // the car drives on: the learner walks on to the end of the walk
      await page.evaluate(() => { const { car, max } = window.__walkCar; car.max = max; });
      await page.waitForFunction(([x, z]) => {
        const { game } = window.__ew, p = game.player.root.position;
        return !game.autoPath?.length && Math.hypot(p.x - x, p.z - z) < 0.6;
      }, setup.to, { timeout: 25000 }).catch(async (error) => {
        const { car } = await page.evaluate(() => {
          const { car } = window.__walkCar;
          return { car: { x: car.x, speed: car.speed, max: car.max, held: car.held, byT: car.byT, hidden: car.hidden, braking: car.brakingForPlayer } };
        });
        throw new Error(`${label}: no arrival · ${JSON.stringify({ ...(await state()), car, check: await page.evaluate(() => window.__ew.game.walkCheck) })}`, { cause: error });
      });
      const end = await state();
      assert(Math.abs(end.carX - setup.x) > 2, `${label}: the car drove off first (${JSON.stringify(end)})`);
      console.log(`${label} passed · waited at z ${waiting.z.toFixed(2)} (car lane ${setup.lane}, x ${setup.x}) · arrived`);
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
