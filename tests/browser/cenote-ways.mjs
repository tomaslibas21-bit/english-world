// Cenote Ka'an from whichever side one comes, and the grotto's ways in (src/game/cave/grounds.ts), as a player finds
// them: from where avenida Juárez ends, on foot by taps on the ground (the game's own tap-to-walk, a leg at a time),
// no placing of the player anywhere after the game has started.
// - across the meadow north of the sacbé, down the little beach into the water, a swim to the cave's mouth: in;
//   out by the grotto's water: back at the mouth;
// - across the meadow south of the sacbé, along the trail to La Grieta: in through the cleft; out through it: back at
//   La Grieta;
// - round the north to El Ojo: over its edge and down, landing in the grotto's water;
// - round the west, up the stair to El Salto, off its ledge into the cenote, and in by the mouth from there;
// - down the rock steps at the south-east into the water.
// A computer and a phone. Against a dev server or a built game of the Spanish edition:
// WORLD_TEST_URL=http://127.0.0.1:8176 WORLD_PLAYWRIGHT_MODULE=/path/to/playwright-core/index.mjs node tests/browser/cenote-ways.mjs [--shots=<dir>]
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import path from "node:path";
const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const base = process.env.WORLD_TEST_URL || "http://127.0.0.1:8176";
const storage = process.env.WORLD_STORAGE || "puerto-colibri";
const shots = process.argv.find((a) => a.startsWith("--shots="))?.slice(8);
if (shots) mkdirSync(shots, { recursive: true });
const check = (name, value, detail) => {
  assert(value, `${name}: ${JSON.stringify(detail)}`);
  console.log("ok", name, detail === undefined ? "" : JSON.stringify(detail));
};
// the cenote's middle, and points round it (0: east, towards the town; π/2: south)
const C = { x: -136, z: -6 }, polar = (a, d) => [C.x + Math.cos(a * Math.PI) * d, C.z + Math.sin(a * Math.PI) * d];
const START = { zone: "town", x: -101, z: -7.4, rot: -Math.PI / 2 };
const progress = {
  version: 1,
  profile: { name: "Test", gender: "m", lookId: "m1", look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } },
  settings: { v: 5, play: "town", quality: "low", scenes: false, volume: 0, cameraFollow: true },
  sits: {}, phrases: {}, seenIntro: {}, started: 1, place: START, coach: { done: true, run: true },
};

const browser = await chromium.launch({ channel: process.env.WORLD_BROWSER_CHANNEL || "chromium", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
try {
  for (const phone of [false, true]) {
    const label = phone ? "phone" : "computer";
    /** A fresh game at the end of avenida Juárez (each walk starts from the town, as the save says). */
    const open = async () => {
      const ctx = await browser.newContext(phone ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 800 } });
      const page = await ctx.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.addInitScript(([k, v]) => { try { sessionStorage.setItem("ew-play-now", "1"); } catch {} localStorage.setItem(k, v); }, [`${storage}-progress-v1`, JSON.stringify(progress)]);
      await page.goto(base, { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => window.__ew?.store?.getState().screen === "play" && window.__ew.game?.ledges?.ready, null, { timeout: 120000 });
      await page.evaluate(() => { window.__ew.coach?.finish?.(); window.__ew.store.getState().setHud({ panel: null }); });
      return { ctx, page, errors };
    };
    const state = (page) => page.evaluate(() => {
      const g = window.__ew.game, p = g.player.root.position, st = window.__ew.store.getState();
      return { zone: g.zoneId, x: +p.x.toFixed(1), y: +p.y.toFixed(2), z: +p.z.toFixed(1), swim: g.swimming, prompt: st.hud.prompt?.kind ?? null, label: st.hud.prompt?.label ?? null, toasts: st.toasts.map((t) => t.title) };
    });
    /** A tap on the ground at (x, z): the player walks there (the game's own way-finding); waits until they are within
     *  `near` m of it, or the zone changes, or `until` holds. */
    const tap = async (page, [x, z], { near = 1.3, ms = 30000, until = "false" } = {}) => {
      await page.evaluate(([x, z]) => window.__ew.game.walkTo(x, z, { kind: "point" }), [x, z]);
      const zone = await page.evaluate(() => window.__ew.game.zoneId);
      try {
        await page.waitForFunction(([x, z, near, zone, until]) => { const g = window.__ew.game, p = g.player.root.position; return g.zoneId !== zone || Math.hypot(p.x - x, p.z - z) < near || (0, eval)(until); }, [x, z, near, zone, until], { timeout: ms });
      } catch (e) {
        throw new Error(`${label}: the walk to (${x.toFixed(1)}, ${z.toFixed(1)}) did not arrive: ${JSON.stringify(await state(page))}`);
      }
    };
    const walk = async (page, legs, opts) => { for (const leg of legs) await tap(page, leg, opts); };
    const press = async (page) => { if (phone) await page.locator(".act-btn").tap(); else await page.keyboard.press("e"); };
    const snap = async (page, name) => { if (shots) { await page.waitForTimeout(500); await page.screenshot({ path: path.join(shots, `${name}-${label}.png`) }); } };
    const settled = (page) => page.waitForFunction(() => window.__ew.store.getState().hud.fade === 0, null, { timeout: 15000 });

    // ---- 1. north of the sacbé, across the meadow, down the beach, a swim to the cave's mouth
    {
      const { ctx, page, errors } = await open();
      await walk(page, [[-108, -11], [-116, -16], [-126, -15.5], polar(-0.27, 9.2)]);
      let s = await state(page);
      check(`${label}: across the meadow north of the sacbé to the little beach (the town's edge is open there)`, s.zone === "town" && s.x < -128 && s.z < -11, s);
      await snap(page, "1a-the-beach");
      await walk(page, [polar(-0.27, 4.6)], { near: 1 });
      await page.waitForFunction(() => window.__ew.game.swimming, null, { timeout: 15000 });
      check(`${label}: down the beach into the water: swimming`, (await state(page)).swim);
      await tap(page, [C.x - 6 + 0.9, C.z], { near: 0.8, until: "window.__ew.game.zoneId === 'gruta'" });
      await page.waitForFunction(() => window.__ew.game.zoneId === "gruta", null, { timeout: 15000 });
      await settled(page);
      s = await state(page);
      check(`${label}: swum on into the cave's mouth: in the grotto, by the water one comes up through`, s.zone === "gruta" && Math.hypot(s.x, s.z - 2.2) < 2.5, s);
      await page.waitForTimeout(2500);
      check(`${label}: and the first-time card says so`, (await state(page)).toasts.some((t) => /Grotto|grot/i.test(t)), (await state(page)).toasts);
      // out by the water: back at the cave's mouth
      await tap(page, [0, 6.6], { near: 0.5 });
      await page.waitForFunction(() => window.__ew.game.zoneId === "town", null, { timeout: 15000 });
      await settled(page);
      await page.waitForTimeout(700);
      s = await state(page);
      check(`${label}: out by the grotto's water: back in the cenote at the cave's mouth`, s.zone === "town" && s.swim && Math.hypot(s.x - (C.x - 3.1), s.z - C.z) < 3, s);
      check(`${label}: no page errors (the beach, the mouth)`, errors.length === 0, errors);
      await ctx.close();
    }

    // ---- 2. south of the sacbé, the trail, La Grieta: in and out through the cleft
    {
      const { ctx, page, errors } = await open();
      await walk(page, [[-108, -2], [-116, 3.5], [-125.5, 7], polar(0.34, 10.4), polar(0.5, 10.6)]);
      await snap(page, "2a-the-trail-south");
      await tap(page, polar(0.66, 10.4), { until: "window.__ew.store.getState().hud.prompt?.kind === 'enter'" });
      await page.waitForFunction(() => window.__ew.store.getState().hud.prompt?.kind === "enter", null, { timeout: 15000 });
      let s = await state(page);
      check(`${label}: along the trail to La Grieta: the cleft is offered, and a word about it was said on the way`, /Gruta/.test(s.label) && s.x < -139 && s.z > 0, s);
      await snap(page, "2b-la-grieta");
      await press(page);
      await page.waitForFunction(() => window.__ew.game.zoneId === "gruta", null, { timeout: 15000 });
      await settled(page);
      s = await state(page);
      check(`${label}: in through the cleft: in the grotto where its side passage comes out, on the way in's side of Kin`, s.zone === "gruta" && Math.hypot(s.x - 1.2, s.z + 0.7) < 1.5, s);
      await page.waitForFunction(() => window.__ew.store.getState().toasts.some((t) => /Grotto|grot/i.test(t.title)), null, { timeout: 8000 }).catch(() => {});
      check(`${label}: the first-time card is shown this way in too`, (await state(page)).toasts.some((t) => /Grotto|grot/i.test(t)), (await state(page)).toasts);
      await snap(page, "2c-inside-by-the-cleft");
      await tap(page, [2, 0.5]);
      await tap(page, [9.6, -2.3], { near: 0.4 });
      await page.waitForFunction(() => window.__ew.game.zoneId === "town", null, { timeout: 15000 });
      await settled(page);
      s = await state(page);
      check(`${label}: out through the cleft: back at La Grieta, on one's feet`, s.zone === "town" && !s.swim && Math.hypot(s.x - polar(0.68, 10.9)[0], s.z - polar(0.68, 10.9)[1]) < 2.5, s);
      check(`${label}: no page errors (La Grieta)`, errors.length === 0, errors);
      await ctx.close();
    }

    // ---- 3. round the north to El Ojo, and down; 4. round the west, up to El Salto, off its ledge, in by the mouth
    {
      const { ctx, page, errors } = await open();
      await walk(page, [[-108, -11], [-116, -17], [-128, -18.5], polar(1.5, 10.8), polar(1.4, 12.2)]);
      await snap(page, "3a-towards-el-ojo");
      // (past it first, round the west and up the stair: El Salto)
      await walk(page, [polar(1.26, 15.4), polar(1.14, 15), polar(1.0, 15.8), [C.x - 13.9, C.z]]);
      await snap(page, "4a-the-stair-to-el-salto");
      await walk(page, [[C.x - 6.9, C.z]], { near: 0.6 });
      let s = await state(page);
      check(`${label}: round the west and up the stair of stones: on El Salto's ledge, high over the water`, s.y > 4.2 && Math.abs(s.z - C.z) < 1.4, s);
      await snap(page, "4b-on-el-salto");
      await page.evaluate(([x, z]) => window.__ew.game.walkTo(x, z, { kind: "point" }), [C.x - 3.4, C.z]);
      await page.waitForFunction(() => window.__ew.game.swimming, null, { timeout: 15000 });
      await page.waitForFunction(() => window.__ew.store.getState().hud.prompt?.kind === "enter", null, { timeout: 15000 });
      s = await state(page);
      check(`${label}: off the ledge into the cenote: swimming in front of the cave's mouth, the way in offered`, s.swim && s.y < 0 && /Gruta/.test(s.label), s);
      await snap(page, "4c-jumped-in");
      // out of the water by the rock steps at the south-east, and round to El Ojo again
      await walk(page, [polar(0.27, 4.6), polar(0.27, 9.4)]);
      s = await state(page);
      check(`${label}: out of the water up the rock steps at the south-east`, !s.swim && s.y > -0.1 && s.z > C.z + 5, s);
      await snap(page, "5-the-rock-steps");
      await walk(page, [polar(0.02, 12), polar(-0.27, 11), polar(-0.5, 10.8), polar(1.4, 12.2)]);
      await tap(page, polar(1.3, 13), { near: 0.3, until: "window.__ew.game.zoneId === 'gruta'" });
      await page.waitForFunction(() => window.__ew.game.zoneId === "gruta", null, { timeout: 15000 });
      const high = await page.evaluate(() => new Promise((done) => { let top = -9; const t0 = performance.now(); const tick = () => { const g = window.__ew.game; top = Math.max(top, g.player.root.position.y + (g.player.lift ?? 0)); if (performance.now() - t0 > 1800) done(+top.toFixed(1)); else requestAnimationFrame(tick); }; tick(); }));
      await settled(page);
      s = await state(page);
      check(`${label}: stepped into El Ojo: dropped in from above, down into the grotto's water`, s.zone === "gruta" && high > 3 && s.y < 0.2 && Math.hypot(s.x, s.z - 9) < 3, { high, s });
      await page.waitForFunction(() => window.__ew.store.getState().toasts.some((t) => /Grotto|grot/i.test(t.title)), null, { timeout: 8000 }).catch(() => {});
      check(`${label}: and the first-time card is shown coming in from above too`, (await state(page)).toasts.some((t) => /Grotto|grot/i.test(t)), (await state(page)).toasts);
      await snap(page, "3b-dropped-in");
      check(`${label}: no page errors (El Ojo, El Salto, the rock steps)`, errors.length === 0, errors);
      await ctx.close();
    }
  }
  console.log("cenote-ways: all checks passed");
} finally {
  await browser.close();
}
