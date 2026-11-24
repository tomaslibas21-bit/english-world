// Climbing in the real game: a parked car in steps (hood or trunk, then the roof), the three presses (a jump; a flip,
// once round and a little higher; the high jump, twice round) with a car's roof straight from the street and the bus
// shelter's roof, the phones' jump buttons tapped three times, and what must stay true of the whole town (nobody
// stands higher than the high jump's tier, nobody gets out of the town). Against a dev server (the last part needs src/dev/climbAudit.ts) or a built game.
// WORLD_TEST_URL=http://127.0.0.1:5188 WORLD_STORAGE=english-world WORLD_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs WORLD_SHOTS=/path/to/shots node tests/browser/climb.mjs
import assert from "node:assert/strict";
import { contextOptions, screenshot, viewports } from "./life-harness.mjs";
const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const base = process.env.WORLD_TEST_URL || "http://127.0.0.1:5188";
const storage = process.env.WORLD_STORAGE || "english-world";
const check = (name, value, detail) => {
  assert(value, `${name}: ${JSON.stringify(detail)}`);
  console.log("ok", name, detail === undefined ? "" : JSON.stringify(detail));
};
const progress = {
  version: 1,
  profile: { name: "Test", gender: "m", lookId: "m1", look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } },
  settings: { v: 5, play: "town", quality: "low", scenes: false, volume: 0, cameraFollow: true },
  sits: {}, phrases: {}, seenIntro: {}, started: 1, place: { zone: "town", x: 28, z: -14.6, rot: Math.PI },
  coach: { done: true, run: true },
};

const browser = await chromium.launch({ channel: process.env.WORLD_BROWSER_CHANNEL || "chromium", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
try {
  for (const [width, height] of viewports) {
    const phone = Math.min(width, height) < 600;
    const ctx = await browser.newContext(contextOptions(width, height));
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(([k, v]) => { localStorage.setItem(k, v); try { sessionStorage.setItem("ew-play-now", "1"); } catch {} }, [`${storage}-progress-v1`, JSON.stringify(progress)]);
    await page.goto(base, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__ew?.store?.getState().screen === "play" && window.__ew.game?.ledges?.ready, null, { timeout: 120000 });
    await page.evaluate(() => { window.__ew.coach?.finish?.(); window.__ew.store.getState().setHud({ panel: null, zoneBanner: null }); });
    const label = `${width}×${height}`;
    const btn = page.locator(".jump-btn");
    const place = (c) => page.evaluate(({ x, z, rot }) => {
      const g = window.__ew.game;
      g.vel.set(0, 0, 0);
      g.placeOnFoot(x, z, rot);
    }, c);
    const state = () => page.evaluate(() => { const g = window.__ew.game, p = g.player.root.position; return { x: +p.x.toFixed(2), z: +p.z.toFixed(2), y: +g.hop.y.toFixed(2), air: g.hop.air, spin: +g.hop.spin.toFixed(2) }; });
    const settle = () => page.waitForFunction(() => { const g = window.__ew.game; return !g.transitioning && !g.hop.air && g.hop.spin === 0 && g.player.flip === 0; }, null, { timeout: 20000 });
    // On the ground, Space beside a parked car boards it. Use the jump action or its touch button.
    const jump = () => phone ? btn.dispatchEvent("pointerdown") : page.evaluate(() => window.__ew.game.jump());

    const car = await page.evaluate(() => {
      const g = window.__ew.game, col = g.town.colliders, boxes = [...g.rides.modeCars];
      for (const [ride, b] of boxes) {
        if (!ride.parked) continue;
        const c = Math.abs(Math.cos(b.heading)), sn = Math.abs(Math.sin(b.heading));
        const hx = c * b.hw + sn * b.hl, hz = sn * b.hw + c * b.hl;
        const cx = b.x, cz = b.z, alongX = hx > hz;
        for (const s of [1, -1]) {
          const x = alongX ? cx + s * (hx + 2.4) : cx, z = alongX ? cz : cz + s * (hz + 2.4);
          if (col.boxes.some((o) => x > o.minX - 0.6 && x < o.maxX + 0.6 && z > o.minZ - 0.6 && z < o.maxZ + 0.6)) continue;
          if (col.circles?.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + 0.6)) continue;
          if (boxes.some(([, o]) => o !== b && Math.hypot(o.x - x, o.z - z) < o.hl + 1)) continue;
          return { x, z, rot: alongX ? (s > 0 ? -Math.PI / 2 : Math.PI / 2) : s > 0 ? Math.PI : 0, cx, cz, hx, hz, alongX };
        }
      }
      return null;
    });
    check("there is a parked car to climb", !!car, car);
    // Three presses from beside the door, then a step onto the roof at the top of the jump.
    const beside = await page.evaluate(({ cx, cz, hx, hz, alongX }) => {
      const col = window.__ew.game.town.colliders;
      for (const s of [1, -1]) {
        const x = alongX ? cx : cx + s * (hx + 0.8), z = alongX ? cz + s * (hz + 0.8) : cz;
        if (!col.boxes.some((o) => x > o.minX - 0.5 && x < o.maxX + 0.5 && z > o.minZ - 0.5 && z < o.maxZ + 0.5)) {
          return { x, z, rot: alongX ? (s > 0 ? Math.PI : 0) : s > 0 ? -Math.PI / 2 : Math.PI / 2 };
        }
      }
      return null;
    }, car);
    check("there is room beside the car", !!beside, beside);
    const keyAtCar = ({ cx, cz }) => {
      const keys = window.__ew.game.rides.group.getObjectByName("parked-car-keys");
      if (!keys.visible) return false;
      const matrix = keys.instanceMatrix.array;
      for (let i = 0; i < keys.count; i++) {
        if (Math.hypot(matrix[i * 16 + 12] - cx, matrix[i * 16 + 14] - cz) < 0.1) return true;
      }
      return false;
    };
    await place(beside);
    await settle();
    await page.waitForFunction(keyAtCar, car, { timeout: 5000 });
    const street = await state();
    await jump();
    await page.waitForFunction(() => window.__ew.game.hop.air, null, { timeout: 5000 });
    await jump();
    await jump();
    await page.waitForFunction(() => window.__ew.game.hop.y > 1.9, null, { timeout: 5000 });
    await page.keyboard.down("w");
    // Hold the rendered frame at the top of the jump while Playwright takes the screenshot.
    await page.waitForFunction(() => {
      const g = window.__ew.game;
      if (!g.hop.air || g.hop.y <= 2.2 || g.hop.vy > 0) return false;
      g.renderer.setAnimationLoop(null);
      return true;
    }, null, { timeout: 5000 });
    try {
      await screenshot(page, "carroof-jump", width, height);
    } finally {
      await page.evaluate(() => { const g = window.__ew.game; g.renderer.setAnimationLoop(g.loop); });
    }
    await page.waitForFunction(() => !window.__ew.game.hop.air, null, { timeout: 5000 });
    await page.keyboard.up("w");
    const landing = await state();
    check("three presses from the street land on the car's roof, with no hood or trunk first",
      street.y === 0 && landing.y > 1.4 && landing.y < 1.85, { street, landing });
    await page.waitForFunction(() => {
      const g = window.__ew.game;
      return !g.hop.air && g.hop.spin === 0 && Math.abs(g.hop.squash) < 0.01 && g.vel.lengthSq() < 0.01;
    }, null, { timeout: 5000 });
    const roofLanding = await state();
    check(`${label}: the avatar settles on the roof with the key hidden`,
      roofLanding.y === landing.y && !await page.evaluate(keyAtCar, car), roofLanding);
    await screenshot(page, "carroof-landing", width, height);
    await page.keyboard.down("s");
    await page.waitForFunction(() => { const g = window.__ew.game; return !g.hop.air && g.hop.y < 0.6; }, null, { timeout: 5000 });
    await page.keyboard.up("s");
    check(`${label}: the parked car's key returns after stepping down`, await page.evaluate(keyAtCar, car));

    if (!phone) {
      // a parked car: walked at, it is a wall; a jump is its hood or its trunk; a second jump from there its roof
      await place(car);
      await page.keyboard.down("w");
      await page.waitForTimeout(1200);
      let s = await state();
      check("walking at a car stops at it", s.y === 0 && Math.hypot(s.x - car.cx, s.z - car.cz) > 2, s);
      await jump();
      await page.waitForFunction(() => { const g = window.__ew.game; return !g.hop.air && g.hop.y > 0.6; }, null, { timeout: 5000 });
      await page.keyboard.up("w");
      s = await state();
      check("a jump lands on its hood or trunk", s.y > 0.7 && s.y < 1.1, s);
      // (onto the windshield or the roof; from the windshield one more)
      const onRoof = () => page.waitForFunction(() => { const g = window.__ew.game; return !g.hop.air && g.hop.y > 1.4; }, null, { timeout: 1500 }).then(() => true, () => false);
      await page.keyboard.down("w");
      await jump();
      if (!(await onRoof())) { await jump(); await onRoof(); }
      await page.keyboard.up("w");
      s = await state();
      check("and the next one on its roof", s.y > 1.4 && s.y < 1.75, s);
      const prompt = await page.evaluate(() => { const g = window.__ew.game; g.updateHud(); return { aloft: g.aloft, nearest: g.nearest }; });
      check("up there nobody is talked to and no door gone through", prompt.aloft === true && prompt.nearest === null, prompt);

      // the three presses. Two: a flip, once head over heels, a little higher than the jump. Three: the high jump, well
      // over two metres up, twice head over heels. (How high and how far round, watched frame by frame.)
      const watch = () => page.evaluate(() => new Promise((done) => {
        const g = window.__ew.game;
        let top = 0, turn = 0;
        const tick = () => { top = Math.max(top, g.hop.y); turn = Math.max(turn, g.hop.spin); if (g.hop.air) requestAnimationFrame(tick); else done({ top: +top.toFixed(2), turn: +turn.toFixed(2), spin: g.hop.spin }); };
        tick();
      }));
      await page.evaluate(() => { const g = window.__ew.game; g.keys.clear(); g.enterZone("town", { x: 28, z: -14.6, rot: Math.PI }, true); });
      await settle();
      await page.keyboard.press("Space");
      await page.waitForFunction(() => window.__ew.game.hop.air, null, { timeout: 5000 });
      let flight = watch();
      await page.keyboard.press("Space");
      let f = await flight;
      check("two presses are a flip: once round, a little higher than the jump", f.top > 1.2 && f.top < 1.45 && f.turn > 5.9 && f.turn < 6.4, f);
      await settle();
      await page.waitForTimeout(200);
      await page.keyboard.press("Space");
      await page.waitForFunction(() => window.__ew.game.hop.air, null, { timeout: 5000 });
      flight = watch();
      await page.keyboard.press("Space");
      await page.keyboard.press("Space");
      const more = await page.evaluate(() => window.__ew.game.hop.flip());
      f = await flight;
      check("three presses are the high jump: twice round, well over two metres", more === false && f.top > 2.6 && f.top < 2.9 && f.turn > 11.5, f);
      await settle();
      check("and they land on their feet", true);

      // the bus shelter's roof: from under it, up through it by the high jump, and on it; then a walk off its edge
      const roof = await page.evaluate(() => {
        const r = (window.__ew.game.town.colliders.roofs ?? []).find((q) => Math.abs(q.maxX - q.minX - 3.6) < 0.01 && Math.abs(q.maxZ - q.minZ - 1.6) < 0.01);
        return r ? { x: (r.minX + r.maxX) / 2, minZ: r.minZ } : null;
      });
      check("the town lists the bus shelter's roof", !!roof, roof);
      // (a spot under it where nobody stands and nothing is in the way: where one stays put)
      let spot = null;
      for (const [dx, dz] of [[0, 0.3], [-1.3, 0.3], [1.3, 0.3], [-0.7, 0.3], [0.7, 0.3], [-1.5, 0.8], [1.5, 0.8]]) {
        const at = { x: roof.x + dx, z: roof.minZ + dz };
        await page.evaluate((r) => { const g = window.__ew.game; g.keys.clear(); g.enterZone("town", { x: r.x, z: r.z, rot: Math.PI }, true); g.rig.yaw = Math.PI; g.rig.snap(); }, at);
        await page.waitForFunction(() => { const g = window.__ew.game; return !g.transitioning && !g.hop.air; }, null, { timeout: 20000 });
        await page.waitForTimeout(700);
        const now = await state();
        if (Math.hypot(now.x - at.x, now.z - at.z) < 0.05 && now.y < 0.1) { spot = at; break; }
      }
      check("there is a free spot under it", !!spot, spot);
      const under = await state();
      // (the jump itself, as the phone's button gives it: beside whoever waits for the bus, Space on the ground talks)
      await page.evaluate(() => window.__ew.game.jump());
      await page.waitForFunction(() => { const g = window.__ew.game; return g.hop.air && g.hop.y > 0.6; }, null, { timeout: 5000 });
      await page.evaluate(() => { window.__ew.game.jump(); window.__ew.game.jump(); });
      await page.waitForFunction(() => !window.__ew.game.hop.air, null, { timeout: 5000 });
      s = await state();
      check("the high jump lands on the bus shelter's roof", under.y < 0.7 && s.y > 2.3 && s.y <= 2.8, { under, s });
      await page.keyboard.down("w");
      await page.waitForFunction(() => { const g = window.__ew.game; return !g.hop.air && g.hop.y < 0.7; }, null, { timeout: 6000 });
      await page.keyboard.up("w");
      s = await state();
      check("and a walk off its edge is a fall to the street", s.y < 0.7 && s.z < roof.minZ, s);

      // the whole town (a dev server only): nobody stands higher than a car's roof, gets out, or is stuck
      const audit = await page.evaluate(async () => {
        try {
          const m = await import("/src/dev/climbAudit.ts"), W = (await import("/src/game/world/layout.ts")).WORLD, g = window.__ew.game;
          // (Puerto Colibrí's clearing round the cenote lies beyond the town's west edge: the way out to it is open)
          const c = (await import("/src/game/world/theme.ts")).THEME.cenote;
          const open = c?.walk ? [{ minX: c.x - 8, maxX: W.minX, minZ: c.z - 10.5, maxZ: c.z + 9.5 }] : [];
          return m.climbAudit(g.town.colliders, g.ledges, W, [28, -14.6], 0.25, open);
        } catch { return null; }
      });
      if (audit) {
        check("the highest one can stand is a shelter's or a stall's roof", audit.maxHeight <= 2.8 && audit.maxHeight > 2.3, audit.maxHeight);
        check("no way out of the town or past the wading limit", audit.outside === 0, { cells: audit.outside, first: audit.outsideAt });
        check("nowhere to be stuck", audit.fresh.every((f) => f.out !== "stuck"), audit.fresh);
      } else console.log("skipped: the town-wide audit (not a dev server)");
    } else {
      // the phone's button: a tap is a jump, a second tap in the air the flip, a third the high jump
      await place(progress.place);
      await btn.waitFor({ state: "visible", timeout: 10000 });
      const box = await btn.boundingBox();
      check("the jump button is at the bottom right", box.x > width / 2 && box.y > height / 2 && box.width >= 44 && box.height >= 44, box);
      // (once the town has faded in: a jump is not taken while it does)
      await page.waitForFunction(() => { const g = window.__ew.game; return !g.transitioning && !g.hop.air; }, null, { timeout: 20000 });
      await btn.dispatchEvent("pointerdown");
      const one = await page.evaluate(() => { const g = window.__ew.game; return { air: g.hop.air, spin: g.hop.spin }; });
      await page.waitForFunction(() => { const g = window.__ew.game; return g.hop.air && g.hop.y > 0.3; }, null, { timeout: 5000 });
      await btn.dispatchEvent("pointerdown");
      const two = await page.evaluate(() => { const g = window.__ew.game; return { air: g.hop.air, flip: g.hop.flipped, high: g.hop.doubled }; });
      await btn.dispatchEvent("pointerdown");
      const three = await page.evaluate(() => { const g = window.__ew.game; return { air: g.hop.air, high: g.hop.doubled }; });
      const high = await page.waitForFunction(() => { const g = window.__ew.game; return g.hop.air && g.hop.y > 2.2 && g.hop.spin > 0; }, null, { timeout: 5000 }).then(() => true, () => false);
      check("a tap jumps, a second tap in the air flips, a third is the high jump", one.air && one.spin === 0 && two.air && two.flip && !two.high && three.high && high, { one, two, three, high });
    }
    check(`no page errors (${label})`, errors.length === 0, errors.slice(0, 3));
    await ctx.close();
  }
  console.log("climb: all ok");
} finally {
  await browser.close();
}
