// Climbing in the real game: a parked car in steps (hood or trunk, then the roof), a flip on the second press, the
// phone's jump button tapped twice, and what must stay true of the whole town (nobody stands higher than a car's roof,
// nobody gets out of the town). Against a dev server (the last part needs src/dev/climbAudit.ts) or a built game.
// WORLD_TEST_URL=http://127.0.0.1:5188 WORLD_STORAGE=english-world WORLD_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node tests/browser/climb.mjs
import assert from "node:assert/strict";
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
  for (const phone of [false, true]) {
    const ctx = await browser.newContext(phone ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(([k, v]) => { localStorage.setItem(k, v); try { sessionStorage.setItem("ew-play-now", "1"); } catch {} }, [`${storage}-progress-v1`, JSON.stringify(progress)]);
    await page.goto(base, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__ew?.store?.getState().screen === "play" && window.__ew.game?.ledges?.ready, null, { timeout: 120000 });
    await page.evaluate(() => { window.__ew.coach?.finish?.(); window.__ew.store.getState().setHud({ panel: null }); });
    const label = phone ? "phone" : "computer";

    if (!phone) {
      // a parked car: walked at, it is a wall; a jump is its hood or its trunk; a second jump from there its roof
      const car = await page.evaluate(() => {
        const g = window.__ew.game, col = g.town.colliders;
        for (const b of col.boxes) {
          if (b.tag !== "car" || !b.split) continue;
          const cx = (b.minX + b.maxX) / 2, cz = (b.minZ + b.maxZ) / 2, alongX = b.maxX - b.minX > b.maxZ - b.minZ;
          for (const s of [1, -1]) {
            const x = alongX ? cx + s * ((b.maxX - b.minX) / 2 + 2.4) : cx, z = alongX ? cz : cz + s * ((b.maxZ - b.minZ) / 2 + 2.4);
            const others = col.boxes.filter((o) => o !== b);
            if (others.some((o) => x > o.minX - 0.6 && x < o.maxX + 0.6 && z > o.minZ - 0.6 && z < o.maxZ + 0.6)) continue;
            return { x, z, rot: alongX ? (s > 0 ? -Math.PI / 2 : Math.PI / 2) : s > 0 ? Math.PI : 0, cx, cz };
          }
        }
        return null;
      });
      check("there is a parked car to climb", !!car, car);
      const place = () => page.evaluate((c) => { const g = window.__ew.game; g.keys.clear(); g.enterZone("town", { x: c.x, z: c.z, rot: c.rot }, true); g.rig.yaw = c.rot; g.rig.snap(); }, car);
      const state = () => page.evaluate(() => { const g = window.__ew.game, p = g.player.root.position; return { x: +p.x.toFixed(2), z: +p.z.toFixed(2), y: +g.hop.y.toFixed(2), air: g.hop.air, spin: +g.hop.spin.toFixed(2) }; });
      await place();
      await page.keyboard.down("w");
      await page.waitForTimeout(1200);
      let s = await state();
      check("walking at a car stops at it", s.y === 0 && Math.hypot(s.x - car.cx, s.z - car.cz) > 2, s);
      await page.keyboard.press("Space");
      await page.waitForFunction(() => { const g = window.__ew.game; return !g.hop.air && g.hop.y > 0.6; }, null, { timeout: 5000 });
      await page.keyboard.up("w");
      s = await state();
      check("a jump lands on its hood or trunk", s.y > 0.7 && s.y < 1.1, s);
      // (onto the windshield or the roof; from the windshield one more)
      const onRoof = () => page.waitForFunction(() => { const g = window.__ew.game; return !g.hop.air && g.hop.y > 1.4; }, null, { timeout: 1500 }).then(() => true, () => false);
      await page.keyboard.down("w");
      await page.keyboard.press("Space");
      if (!(await onRoof())) { await page.keyboard.press("Space"); await onRoof(); }
      await page.keyboard.up("w");
      s = await state();
      check("and the next one on its roof", s.y > 1.4 && s.y < 1.75, s);
      const prompt = await page.evaluate(() => { const g = window.__ew.game; g.updateHud(); return { aloft: g.aloft, nearest: g.nearest }; });
      check("up there nobody is talked to and no door gone through", prompt.aloft === true && prompt.nearest === null, prompt);

      // a flip: the second press in the air, once a jump
      await page.evaluate(() => { const g = window.__ew.game; g.keys.clear(); g.enterZone("town", { x: 28, z: -14.6, rot: Math.PI }, true); });
      await page.waitForTimeout(300);
      await page.keyboard.press("Space");
      await page.waitForTimeout(260);
      const before = await state();
      await page.keyboard.press("Space");
      await page.waitForTimeout(120);
      const mid = await state();
      check("a second press in the air is a flip", before.air && before.spin === 0 && mid.air && mid.spin > 0.2, { before, mid });
      await page.waitForFunction(() => { const g = window.__ew.game; return !g.hop.air && g.hop.spin === 0 && g.player.flip === 0; }, null, { timeout: 5000 });
      check("and they land on their feet", true);

      // the whole town (a dev server only): nobody stands higher than a car's roof, gets out, or is stuck
      const audit = await page.evaluate(async () => {
        try {
          const m = await import("/src/dev/climbAudit.ts"), W = (await import("/src/game/world/layout.ts")).WORLD, g = window.__ew.game;
          return m.climbAudit(g.town.colliders, g.ledges, W, [28, -14.6]);
        } catch { return null; }
      });
      if (audit) {
        check("the highest one can stand is a car's roof", audit.maxHeight <= 1.75 && audit.maxHeight > 1.4, audit.maxHeight);
        check("no way out of the town or past the wading limit", audit.outside === 0, audit.outside);
        check("nowhere to be stuck", audit.fresh.every((f) => f.out !== "stuck"), audit.fresh);
      } else console.log("skipped: the town-wide audit (not a dev server)");
    } else {
      // the phone's button: a tap is a jump, a second tap in the air a flip
      const btn = page.locator(".jump-btn");
      await btn.waitFor({ state: "visible", timeout: 10000 });
      const box = await btn.boundingBox();
      check("the jump button is at the bottom right", box.x > 390 / 2 && box.y > 844 / 2 && box.width >= 44 && box.height >= 44, box);
      await btn.dispatchEvent("pointerdown");
      await page.waitForTimeout(260);
      const one = await page.evaluate(() => { const g = window.__ew.game; return { air: g.hop.air, spin: g.hop.spin }; });
      await btn.dispatchEvent("pointerdown");
      await page.waitForTimeout(120);
      const two = await page.evaluate(() => { const g = window.__ew.game; return { air: g.hop.air, spin: +g.hop.spin.toFixed(2) }; });
      check("a tap jumps, a second tap in the air flips", one.air && one.spin === 0 && two.air && two.spin > 0.2, { one, two });
    }
    check(`no page errors (${label})`, errors.length === 0, errors.slice(0, 3));
    await ctx.close();
  }
  console.log("climb: all ok");
} finally {
  await browser.close();
}
