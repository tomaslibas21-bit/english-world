// The surf lesson can't be missed (owner, 16 Nov 2026: "not seeing a probamos una ola at the end of convo nor any
// notification when I'm at the board"): every board at the school gives the lesson's prompt (the kayak he stood on
// too), a ring marks the start on the sand, the first time one comes near the school one hint says the lesson is
// there, and the end card of the school's conversation leads with "Surf lesson" (its yes starts the lesson at its
// level, else the level's choice). A computer and a phone, Playwright's own Chromium, time stepped by hand. Against a
// dev server or a built game of a town with a surf school (Puerto Colibrí):
// WORLD_TEST_URL=http://127.0.0.1:8096 WORLD_STORAGE=puerto-colibri WORLD_PLAYWRIGHT_MODULE=/path/to/playwright-core/index.mjs node tests/browser/surf-find.mjs
import assert from "node:assert/strict";
const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const base = process.env.WORLD_TEST_URL || "http://127.0.0.1:8096";
const storage = process.env.WORLD_STORAGE || "puerto-colibri";
const shots = process.env.WORLD_SHOTS || "";
const check = (name, value, detail) => {
  assert(value, `${name}: ${JSON.stringify(detail)}`);
  console.log("ok", name, detail === undefined ? "" : JSON.stringify(detail));
};
const progress = {
  version: 1,
  profile: { name: "Test", surname: "Tester", gender: "m", lookId: "m1", look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } },
  settings: { v: 6, play: "town", quality: "low", scenes: false, volume: 0, cameraFollow: true },
  sits: {}, phrases: {}, seenIntro: {}, started: 1, place: { zone: "town", x: -20, z: -64.5, rot: -Math.PI / 2 },
  // (the first hints were seen: walking, talking, where the list is (a later visit opens in the town with that one,
  // and one hint is up at a time); not the surf lesson's)
  coach: { seen: { walk: true, run: true, jump: true, talk: true, list: true, car: true, boat: true, water: true, radio: true }, run: true, view: true },
};
const INIT = `(() => {
  try { sessionStorage.setItem("ew-play-now", "1"); } catch {}
  let now = 1000;
  performance.now = () => now;
  const q = [];
  window.requestAnimationFrame = (cb) => { q.push(cb); return q.length; };
  window.cancelAnimationFrame = () => {};
  window.__step = (n, dt = 1000 / 60) => { for (let i = 0; i < n; i++) { now += dt; const cbs = q.splice(0); for (const cb of cbs) cb(now); } return now; };
})();`;

const browser = await chromium.launch({ channel: "chromium", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
let skipped = false;
try {
  for (const phone of [false, true]) {
    const label = phone ? "phone" : "computer";
    const ctx = await browser.newContext(phone ? { viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(([k, v]) => { if (sessionStorage.getItem("seeded") !== "1") { sessionStorage.setItem("seeded", "1"); localStorage.clear(); localStorage.setItem(k, v); } }, [`${storage}-progress-v1`, JSON.stringify(progress)]);
    await page.addInitScript(INIT);
    await page.goto(base, { waitUntil: "domcontentloaded" });
    const t0 = Date.now();
    for (;;) {
      const st = await page.evaluate(() => { window.__step?.(2); return window.__ew?.store?.getState().screen ?? "loading"; }).catch(() => "navigating");
      if (st === "play") break;
      assert(Date.now() - t0 < 180000, "the game did not start: " + st);
      await new Promise((r) => setTimeout(r, 300));
    }
    const step = (n) => page.evaluate((k) => window.__step(k), n);
    const real = (ms) => new Promise((r) => setTimeout(r, ms));
    const shot = async (name) => { if (shots) { await step(2); await real(300); await page.screenshot({ path: `${shots}/${label}-${name}.png` }); } };
    await page.evaluate(() => window.__ew.store.getState().setHud({ panel: null }));
    // (a town without a surf school, Maple Harbor: nothing here to find)
    if (!(await page.evaluate(() => !!window.__ew.game.surf))) {
      console.log("skipped: this town has no surf school (the test is about Puerto Colibrí's La Ola)");
      await ctx.close();
      skipped = true;
      break;
    }
    const at = async (x, z, rot = Math.PI) => { await page.evaluate(([x, z, rot]) => { const g = window.__ew.game; g.keys.clear(); g.enterZone("town", { x, z, rot }, true); g.rig.yaw = rot; g.rig.snap(); }, [x, z, rot]); await step(20); };
    const hud = () => page.evaluate(() => window.__ew.store.getState().hud);
    const spot = await page.evaluate(() => ({ ...window.__ew.game.surf.spot }));

    // ---- walking along the malecón towards La Ola: one hint says the lesson is there
    await at(-30, -64.5, -Math.PI / 2);
    check(`${label}: away from the school, no hint about it`, (await hud()).coach?.step !== "surf");
    await at(-36, -65, -Math.PI / 2);
    await step(20);
    let h = await hud();
    check(`${label}: coming near La Ola, the hint about the lesson`, h.coach?.step === "surf", h.coach);
    const hint = await page.locator(".coach").innerText();
    check(`${label}: it says where and what`, /La Ola/.test(hint) && (phone ? /Surf|Banglent/.test(hint) : /\bE\b/.test(hint)), hint);
    await shot("hint");
    await page.locator(".coach-next").click();
    await step(10);

    // ---- every board gives the lesson's prompt: the kayak the owner stood on, the rack, the paddleboards, the start
    const ring = await page.evaluate(() => { const m = window.__ew.game.surf.marker; return { visible: m.visible, x: m.position.x, z: m.position.z }; });
    check(`${label}: a ring marks the lesson's start on the sand`, ring.visible && Math.hypot(ring.x - spot.start.x, ring.z - spot.start.z) < 0.1, ring);
    for (const [name, x, z] of [["on the yellow kayak", spot.boards[2][0], spot.boards[2][1]], ["beside the kayak", spot.boards[2][0] - 1.4, spot.boards[2][1] + 0.6], ["at the rack", spot.boards[0][0], spot.boards[0][1] - 0.6], ["by the paddleboards", spot.boards[1][0] + 0.9, spot.boards[1][1]], ["on the ring", spot.start.x, spot.start.z]]) {
      await at(x, z);
      h = await hud();
      check(`${label}: ${name}, the lesson's prompt`, h.prompt?.kind === "surf", { name, prompt: h.prompt });
      if (name === "on the yellow kayak") await shot("kayak-prompt");
    }
    if (phone) check(`${label}: its round button says "Surf"`, /Surf|Banglent/.test(await page.locator(".act-btn").innerText()));
    // at her counter it is still her talk prompt
    const npcSpot = await page.evaluate(() => { const n = window.__ew.game.npcs.find((q) => q.id === window.__ew.game.surf.content.npc); return n ? { x: n.home.x, z: n.home.z } : null; });
    await at(-47.55, -68.15, Math.PI / 2);
    h = await hud();
    check(`${label}: at her counter, still her talk prompt`, h.prompt?.kind === "talk", { prompt: h.prompt, npcSpot });
    await at(spot.start.x, spot.start.z);
    if (phone) await page.locator(".act-btn").tap(); else await page.keyboard.press("e");
    await step(5);
    check(`${label}: the prompt opens the level's choice`, await page.locator(".surf-pick .surf-level").count() === 2);
    await page.locator(".surf-later").click();
    await step(5);

    // ---- the end card of the school's conversation: "Surf lesson" first
    const sitId = await page.evaluate(() => window.__ew.game.surf.situation);
    const endCard = async () => {
      await page.evaluate((id) => window.__ew.game.startScenario(id), sitId);
      for (let i = 0; i < 400 && !(await page.evaluate(() => window.__ew.game.activeSession?.active)); i++) { await step(3); await real(20); }
      // (the scene's introduction, if it shows, is read and closed)
      const intro = page.locator(".intro-card button.btn, .scene-intro button.btn").first();
      if (await intro.count()) await intro.click().catch(() => {});
      await page.evaluate(() => window.__ew.store.getState().setConv({ phase: "ended", completed: true }));
      await step(4);
    };
    await endCard();
    const btns = await page.locator(".ended-box button").allInnerTexts();
    check(`${label}: the end card leads with "Surf lesson"`, /Surf lesson|Banglenčių pamoka/.test(btns[0] ?? ""), btns);
    await shot("end-card");
    await page.locator(".surf-cta").click();
    for (let i = 0; i < 60 && !(await page.evaluate(() => window.__ew.store.getState().hud.panel === null && !window.__ew.game.activeSession?.active && window.__ew.game.surf && (window.__ew.game.surf.active || window.__ew.game.surf_picking))); i++) { await step(4); await real(15); }
    await step(20);
    check(`${label}: tapped without a yes: the conversation closes and the level's choice opens`, !(await page.evaluate(() => window.__ew.game.activeSession?.active)) && await page.locator(".surf-pick .surf-level").count() === 2);
    await page.locator(".surf-later").click();
    await step(5);
    // after "¡Sí, vamos!" (its event), the same button starts the lesson at the level it asked for
    await endCard();
    await page.evaluate(() => window.__ew.game.onSessionEvent("surf", { level: "advanced" }));
    await page.locator(".surf-cta").click();
    for (let i = 0; i < 80 && !(await page.evaluate(() => !!window.__ew.game.surf.logic)); i++) { await step(4); await real(25); }
    let lvl = await page.evaluate(() => window.__ew.game.surf.logic?.level ?? null);
    check(`${label}: after her "¿Probamos una ola?" and a yes, the button starts the lesson at its level`, lvl === "advanced", lvl);
    await page.evaluate(() => window.__ew.game.surfStop());
    await real(700); await step(30);
    // "Tęsti" after a yes starts it too; restarting the conversation clears the queued lesson.
    await endCard();
    await page.evaluate(() => window.__ew.game.onSessionEvent("surf", { level: "beginner" }));
    await page.locator(".ended-secondary .btn").first().click();
    for (let i = 0; i < 80 && !(await page.evaluate(() => !!window.__ew.game.surf.logic)); i++) { await step(4); await real(25); }
    lvl = await page.evaluate(() => window.__ew.game.surf.logic?.level ?? null);
    check(`${label}: after a yes, "Continue" starts the lesson too`, lvl === "beginner", lvl);
    await page.evaluate(() => window.__ew.game.surfStop());
    await real(700); await step(30);
    await endCard();
    await page.evaluate(() => window.__ew.game.onSessionEvent("surf", { level: "beginner" }));
    await page.locator(".ended-secondary .btn").last().click();
    for (let i = 0; i < 60; i++) { await step(4); await real(15); }
    check(`${label}: restarting after a yes starts no lesson`, !(await page.evaluate(() => !!window.__ew.game.surf.logic || window.__ew.store.getState().hud.ride === "surf")));
    // any other conversation's end card has no such button
    await page.evaluate(() => { const g = window.__ew.game; g.activeSession?.close(); });
    await step(20);
    const other = await page.evaluate(() => window.__ew.game.orderedSituations().find((s) => s.id !== window.__ew.game.surf.situation && s.mode !== "phone" && s.mode !== "video" && s.location !== "phone")?.id);
    await page.evaluate((id) => window.__ew.game.startScenario(id), other);
    for (let i = 0; i < 400 && !(await page.evaluate(() => window.__ew.game.activeSession?.active)); i++) { await step(3); await real(20); }
    await page.evaluate(() => window.__ew.store.getState().setConv({ phase: "ended", completed: true }));
    await step(4);
    check(`${label}: another conversation's end card has no "Surf lesson"`, await page.locator(".surf-cta").count() === 0, other);
    check(`${label}: no errors on the page`, errors.length === 0, errors.slice(0, 3));
    await ctx.close();
  }
  console.log(skipped ? "surf-find: skipped" : "surf-find: all checks passed");
} finally {
  await browser.close();
}
