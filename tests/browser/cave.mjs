// Puerto Colibrí's grotto under Cenote Ka'an, in the real game: swum into through the cave's mouth; Kin keeps the way
// until his conversation (x02) is talked through; a glyph stone's card is answered and the stone lights; three lit
// stones leave the gate shut until ten of the town's conversations are finished, and open it then; the way back out
// is the water one came through. A computer and a phone. Against a dev server or a built game of the Spanish edition:
// WORLD_TEST_URL=http://127.0.0.1:8176 WORLD_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node tests/browser/cave.mjs
import assert from "node:assert/strict";
const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const base = process.env.WORLD_TEST_URL || "http://127.0.0.1:8176";
const storage = process.env.WORLD_STORAGE || "puerto-colibri";
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
    // (the saved game is put in once: a reload keeps what the test has done since)
    await page.addInitScript(([k, v]) => { try { sessionStorage.setItem("ew-play-now", "1"); if (sessionStorage.getItem("cave-seeded")) return; sessionStorage.setItem("cave-seeded", "1"); } catch {} localStorage.setItem(k, v); }, [`${storage}-progress-v1`, JSON.stringify(progress)]);
    await page.goto(base, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__ew?.store?.getState().screen === "play" && window.__ew.game?.ledges?.ready, null, { timeout: 120000 });
    await page.evaluate(() => { window.__ew.coach?.finish?.(); window.__ew.store.getState().setHud({ panel: null }); });
    const label = phone ? "phone" : "computer";
    const state = () => page.evaluate(() => {
      const g = window.__ew.game, p = g.player.root.position, st = window.__ew.store.getState();
      return { zone: g.zoneId, x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2), swim: g.swimming, prompt: st.hud.prompt?.kind ?? null, label: st.hud.prompt?.label ?? null, card: st.hud.cave, cave: st.progress.cave ?? null, calls: g.renderer.info.render.calls };
    });
    const press = async () => { if (phone) await page.locator(".act-btn").tap(); else await page.keyboard.press("e"); };
    const go = async (on) => { if (phone) await page.evaluate((v) => window.__ew.game.setJoystick(0, v ? 1 : 0), on); else await page.keyboard[on ? "down" : "up"]("w"); };
    const place = (zone, x, z, rot) => page.evaluate(([zone, x, z, rot]) => { const g = window.__ew.game; g.keys.clear(); g.setJoystick(0, 0); g.enterZone(zone, { x, z, rot }, true); g.rig.yaw = rot; g.rig.snap(); }, [zone, x, z, rot]);

    // ---- in the cenote, swimming towards the cave's mouth at its far side
    await place("town", -137.5, -6, -Math.PI / 2);
    await page.waitForFunction(() => window.__ew.game.swimming, null, { timeout: 15000 });
    await go(true);
    await page.waitForFunction(() => window.__ew.store.getState().hud.prompt?.kind === "enter", null, { timeout: 20000 });
    let s = await state();
    check(`${label}: swimming up to the cave's mouth, the way in is offered`, s.zone === "town" && /Gruta/.test(s.label), s);
    // (swimming on goes in by itself)
    await page.waitForFunction(() => window.__ew.game.zoneId === "gruta", null, { timeout: 20000 });
    await go(false);
    await page.waitForFunction(() => window.__ew.store.getState().hud.fade === 0 && !!window.__ew.store.getState().hud.cave, null, { timeout: 15000 });
    s = await state();
    check(`${label}: in the grotto: its card says the chamber and that Kin comes first`, s.card?.n === 1 && s.card.of === 5 && s.card.open === 1 && /Kin/.test(s.card.next), s);
    check(`${label}: the grotto is light to draw`, s.calls > 3 && s.calls < 40, s.calls);

    // ---- Kin keeps the way: his gate holds until his conversation is talked through
    await go(true);
    await page.waitForFunction(() => window.__ew.store.getState().hud.prompt?.kind === "talk", null, { timeout: 20000 });
    await page.waitForTimeout(2500);
    await go(false);
    s = await state();
    check(`${label}: Kin's gate holds the way`, s.z > -7.6, s);
    await place("gruta", 0.3, -2.5, Math.PI);
    await page.waitForFunction(() => window.__ew.store.getState().hud.prompt?.kind === "talk", null, { timeout: 15000 });
    await press();
    await page.waitForFunction(() => window.__ew.store.getState().conv.active, null, { timeout: 15000 });
    check(`${label}: talking to Kin starts his conversation, off the route`, await page.evaluate(() => { const c = window.__ew.store.getState().conv, g = window.__ew.game; return c.sitId === "x02-alux-kin" && !g.orderedSituations().some((q) => q.id === c.sitId) && g.orderedSituations().length >= 50; }));
    await page.evaluate(() => window.__ew.store.getState().setConv({ introOpen: false }));
    const say = async (text) => {
      await page.waitForFunction(() => window.__ew.store.getState().conv.phase === "you", null, { timeout: 30000 });
      await page.evaluate((t) => window.__ew.game.activeSession.submit(t, [], "typed"), text);
    };
    for (const line of ["Me llamo Test.", "Soy de Canadá.", "Quiero ver la gruta.", "¿Dónde están las piedras?", "Muchas gracias."]) await say(line);
    await page.waitForFunction(() => window.__ew.store.getState().progress.cave?.passed?.includes("kin"), null, { timeout: 30000 });
    await page.evaluate(() => window.__ew.game.closeConversation());
    await page.waitForFunction(() => !window.__ew.store.getState().conv.active, null, { timeout: 15000 });
    s = await state();
    check(`${label}: Kin let the learner pass: saved, and the town's task is as it was`, s.cave.passed.includes("kin") && await page.evaluate(() => !window.__ew.store.getState().progress.sits["x02-alux-kin"]?.completions || window.__ew.game.currentObjective()?.id !== "x02-alux-kin"), s.cave);
    await place("gruta", 0, -6, Math.PI);
    await go(true);
    await page.waitForFunction(() => window.__ew.game.player.root.position.z < -11, null, { timeout: 20000 });
    await go(false);
    // (the state's place is rounded to a tenth: -11.0 is through)
    check(`${label}: and his gate is open`, (await state()).z <= -11);

    // ---- a glyph stone: its card, a wrong meaning, the right one
    const stone = await page.evaluate(() => {
      const g = window.__ew.game;
      g.enterZone("gruta", { x: -6.4, z: -24.5, rot: -Math.PI / 2 }, true);
      return true;
    });
    await page.waitForFunction(() => window.__ew.store.getState().hud.prompt?.kind === "listen", null, { timeout: 20000 });
    await press();
    await page.waitForFunction(() => !!window.__ew.store.getState().hud.glyph, null, { timeout: 12000 });
    let q = await page.evaluate(() => window.__ew.store.getState().hud.glyph);
    check(`${label}: the stone's card: a phrase everyone starts with, three meanings to choose from`, stone && q.options.length === 3 && q.options[q.answer] === q.lt && q.text.length > 2 && !q.shown, q);
    check(`${label}: the card is on the screen, its words hidden until asked for`, await page.locator(".glyph-card").count() === 1 && await page.locator(".glyph-text").count() === 0 && await page.locator(".glyph-opt").count() === 3);
    await page.locator(".glyph-opt").nth((q.answer + 1) % 3).click();
    await page.waitForFunction(() => window.__ew.store.getState().hud.glyph?.wrong.length === 1, null, { timeout: 10000 });
    check(`${label}: a wrong meaning: struck out, the words shown, the stone still waits`, await page.evaluate(() => { const g = window.__ew.store.getState().hud.glyph; return g.shown && !g.solved && !(window.__ew.store.getState().progress.cave?.lit ?? []).length; }));
    await page.locator(".glyph-opt").nth(q.answer).click();
    await page.waitForFunction(() => window.__ew.store.getState().progress.cave?.lit?.includes("agua-1"), null, { timeout: 10000 });
    await page.waitForFunction(() => !window.__ew.store.getState().hud.glyph, null, { timeout: 15000 });
    s = await state();
    check(`${label}: the right one: the stone is lit, the card says two are left`, s.cave.lit.length === 1 && s.card.lit === 1, s.card);

    // ---- the gate to the second chamber: all three stones, and ten of the town's conversations
    const gate = await page.evaluate(() => {
      const { store, game: g } = window.__ew;
      store.getState().updateProgress((p) => { p.cave.lit = ["agua-1", "agua-2", "agua-3"]; });
      g.enterZone("gruta", { x: -7.4, z: -43.2, rot: Math.PI }, true);
      return true;
    });
    await go(true);
    await page.waitForTimeout(2500);
    await go(false);
    s = await state();
    check(`${label}: three stones lit but nothing finished in town: the gate stays shut, and the card says why`, gate && s.z > -48.5 && /10/.test(s.card.next) && s.card.open === 1, s);
    await page.evaluate(() => {
      const { store, game: g } = window.__ew;
      store.getState().updateProgress((p) => { for (const q of g.orderedSituations().slice(0, 10)) p.sits[q.id] = { visits: 1, completions: 1, used: [], twists: [], memory: {} }; });
      g.enterZone("gruta", { x: -7.4, z: -43.2, rot: Math.PI + 0.43 }, true);
    });
    await go(true);
    await page.waitForFunction(() => window.__ew.game.player.root.position.z < -49, null, { timeout: 20000 });
    await go(false);
    s = await state();
    check(`${label}: with ten finished it is open: on into the garden of roots`, s.z < -49 && s.card.open === 2, s);

    // ---- back out the way one came
    await place("gruta", 0, 4.2, 0);   // (within the way out's reach: 2.6 m of the water one came through)
    await page.waitForFunction(() => window.__ew.store.getState().hud.prompt?.kind === "exit", null, { timeout: 15000 });
    await go(true);
    await page.waitForFunction(() => window.__ew.game.zoneId === "town", null, { timeout: 20000 });
    await go(false);
    await page.waitForFunction(() => window.__ew.store.getState().hud.fade === 0, null, { timeout: 15000 });
    await page.waitForTimeout(600);
    s = await state();
    check(`${label}: back in the cenote's water by the cave's mouth, the grotto's card gone`, s.zone === "town" && s.swim && !s.card && Math.hypot(s.x + 139, s.z + 6) < 4, s);
    // (and the place is remembered: a reload down there comes back down there)
    await place("gruta", -3, -30, Math.PI);
    await page.waitForTimeout(400);
    await page.evaluate(() => window.__ew.game.savePlace());
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__ew?.store?.getState().screen === "play" && window.__ew.game?.zoneId, null, { timeout: 120000 });
    s = await state();
    check(`${label}: reloaded in the grotto: still there, its stones and gates as left`, s.zone === "gruta" && s.cave.lit.length === 3 && s.cave.passed.includes("kin"), { zone: s.zone, cave: s.cave });
    check(`${label}: no page errors`, errors.length === 0, errors);
    await ctx.close();
  }
  console.log("cave: all checks passed");
} finally {
  await browser.close();
}
