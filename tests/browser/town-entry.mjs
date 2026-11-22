// How the game opens, in a browser, at a computer, a tablet and a phone (owner, 18 Nov 2026: "opening the 3D game
// shouldn't show the full situation list right away"):
// - a returning learner in the 3D town is in the town at once, where they left off: no list over it, the task card
//   and the buttons there; once, a hint says which button opens the list; that button opens it; a card in it starts
//   its conversation; the next visit has neither list nor hint;
// - a first visit opens with the flight over the town and lands with no list either;
// - a link to one situation (?sit=…) goes straight into its conversation;
// - the pictures-only mode (Lengvas režimas) opens with the list, which is its home.
// Time is stepped by hand. Against a dev server or a built game:
// WORLD_TEST_URL=http://127.0.0.1:8096 WORLD_STORAGE=english-world WORLD_PLAYWRIGHT_MODULE=/path/to/playwright-core/index.mjs node tests/browser/town-entry.mjs
// WORLD_SHOTS=/a/folder saves a picture of each opening.
import assert from "node:assert/strict";
import fs from "node:fs";
import { openPhoneMenu } from "./screen-harness.mjs";
const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const base = process.env.WORLD_TEST_URL || "http://127.0.0.1:8096";
const storage = process.env.WORLD_STORAGE || "english-world";
const shots = process.env.WORLD_SHOTS || "";
if (shots) fs.mkdirSync(shots, { recursive: true });
const check = (name, value, detail) => {
  assert(value, `${name}: ${JSON.stringify(detail)}`);
  console.log("ok", name, detail === undefined ? "" : JSON.stringify(detail));
};
const profile = { name: "Test", surname: "Tester", gender: "f", lookId: "f1", look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } };
const save = (play, more = {}) => ({ version: 1, profile, settings: { v: 6, play, quality: "low", volume: 0, cameraFollow: true }, sits: {}, phrases: {}, seenIntro: {}, started: 1, ...more });
// (someone who has been here: a place in the town, the walking hint seen, one conversation done)
const back = { place: { zone: "town", x: 0, z: 0, rot: 0 }, coach: { seen: { walk: true }, view: true }, sits: { "s72-cafe": { visits: 1, completions: 1, used: [], twists: [], memory: {} } } };
// (the game's clock in the test's hands: every frame is a call of __step)
const INIT = `(() => {
  try { sessionStorage.setItem("ew-play-now", "1"); } catch {}
  let now = 1000;
  performance.now = () => now;
  const q = [];
  window.requestAnimationFrame = (cb) => { q.push(cb); return q.length; };
  window.cancelAnimationFrame = () => {};
  window.__step = (n, dt = 1000 / 60) => { for (let i = 0; i < n; i++) { now += dt; const cbs = q.splice(0); for (const cb of cbs) cb(now); } return now; };
})();`;
const SCREENS = [
  { label: "computer 1280", viewport: { width: 1280, height: 800 } },
  { label: "tablet 768", viewport: { width: 768, height: 1024 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  { label: "phone 375", viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
];
const real = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ channel: process.env.WORLD_BROWSER_CHANNEL || "chromium", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
try {
  for (const { label, ...screen } of SCREENS) {
    const touch = !!screen.hasTouch;
    /** A fresh browser with `saved` as the learner's save; the game opened at `url` and running. */
    const open = async (saved, url = base) => {
      const ctx = await browser.newContext(screen);
      const page = await ctx.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.addInitScript(([k, v]) => { if (sessionStorage.getItem("seeded") !== "1") { sessionStorage.setItem("seeded", "1"); localStorage.clear(); localStorage.setItem(k, v); } }, [`${storage}-progress-v1`, JSON.stringify(saved)]);
      await page.addInitScript(INIT);
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await started(page);
      return { ctx, page, errors };
    };
    const started = async (page) => {
      const t0 = Date.now();
      for (;;) {
        const st = await page.evaluate(() => { window.__step?.(2); return window.__ew?.store?.getState().screen ?? "loading"; }).catch(() => "navigating");
        if (st === "play") break;
        assert(Date.now() - t0 < 180000, "the game did not start: " + st);
        await real(300);
      }
      await page.evaluate(() => window.__step(20));
      await real(400);
      await page.evaluate(() => window.__step(10));
    };
    const state = (page) => page.evaluate(() => {
      const s = window.__ew.store.getState(), vis = (sel) => { const e = document.querySelector(sel); if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.right > 0 && r.left < innerWidth; };
      return { panel: s.hud.panel, flight: !!s.hud.flight, talking: s.conv.active, sit: s.conv.sitId ?? null, zone: window.__ew.game.zone?.id ?? null, hint: s.hud.coach?.step ?? null,
        list: !!document.querySelector(".sheet.scenarios"), cards: document.querySelectorAll(".scn-card").length, task: vis(".objective-card"), tools: vis(".toolbar"),
        canvas: !!document.querySelector(".stage canvas"), coachCard: vis(".coach"), toldList: s.progress.coach?.seen?.list === true };
    });
    const shot = async (page, name) => { if (shots) await page.screenshot({ path: `${shots}/${name}-${label.replace(/\D/g, "")}.png` }); };
    const listButton = (page) => page.locator(".toolbar-tools button.icon-btn").first();

    // ---- a returning learner in the 3D town
    let { ctx, page, errors } = await open(save("town", back));
    let s = await state(page);
    await shot(page, "returning");
    check(`${label}: a returning learner is in the town at once, where they left off: no list over it`, s.panel === null && !s.list && !s.flight && !s.talking && s.zone === "town" && s.canvas, s);
    check(`${label}: the task card and the buttons are there`, s.task && s.tools, s);
    check(`${label}: once, a hint says where the list is`, s.hint === "list" && s.coachCard && s.toldList, s);
    if (await page.locator(".ride-menu").count()) {
      check(`${label}: the hint reveals the list button`, await page.locator(".ride-menu").getAttribute("aria-expanded") === "true");
      await openPhoneMenu(page);
    }
    const btn = listButton(page);
    check(`${label}: the list's button is on the screen, big enough for a finger`, await btn.evaluate((b) => { const r = b.getBoundingClientRect(); return r.width >= 44 && r.height >= 44 && r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight && document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.closest("button") === b; }), await btn.getAttribute("title"));
    if (touch) await btn.tap(); else await btn.click();
    await page.evaluate(() => window.__step(10)); await real(300);
    s = await state(page);
    await shot(page, "list-opened");
    check(`${label}: its button opens the list, every situation in it`, s.panel === "scenarios" && s.list && s.cards >= await page.evaluate(() => window.__ew.game.orderedSituations().length), { panel: s.panel, cards: s.cards });
    const pick = page.locator('.scn-card[data-sit="s72-cafe"]').first();
    if (touch) await pick.tap(); else await pick.click();
    for (let i = 0; i < 14; i++) { await real(100); await page.evaluate(() => window.__step(12)); if ((await state(page)).talking) break; }
    s = await state(page);
    check(`${label}: a card in it starts its conversation`, s.talking && s.sit === "s72-cafe" && s.panel === null, { talking: s.talking, sit: s.sit, panel: s.panel });
    await page.evaluate(() => window.__ew.game.closeConversation());
    await page.evaluate(() => window.__step(20)); await real(300);
    // the next visit
    await page.reload({ waitUntil: "domcontentloaded" });
    await started(page);
    s = await state(page);
    check(`${label}: the next visit is in the town again, no list and no hint about it a second time`, s.panel === null && !s.list && !s.talking && s.hint !== "list" && s.canvas, s);
    check(`${label}: no page errors (returning)`, errors.length === 0, errors.slice(0, 3));
    await ctx.close();

    // ---- a first visit: the flight, then the airport, and no list
    ({ ctx, page, errors } = await open(save("town")));
    s = await state(page);
    if (s.flight) {
      check(`${label}: a first visit opens with the flight, no list`, s.flight && s.panel === null && !s.list, s);
      if (touch) await page.locator(".flight").tap(); else await page.keyboard.press("x");
      for (let i = 0; i < 40; i++) { await page.evaluate(() => window.__step(15)); await real(100); if (!(await state(page)).flight && (await state(page)).zone === "airport") break; }
      await page.evaluate(() => window.__step(30)); await real(300);
    }
    s = await state(page);
    await shot(page, "first-visit");
    check(`${label}: a first visit lands in the airport with no list, how to walk the only hint`, !s.flight && s.zone === "airport" && s.panel === null && !s.list && s.hint === "walk" && !s.toldList, s);
    check(`${label}: no page errors (first visit)`, errors.length === 0, errors.slice(0, 3));
    await ctx.close();

    // ---- a link to one situation
    ({ ctx, page, errors } = await open(save("town", back), `${base}/?sit=s72-cafe`));
    for (let i = 0; i < 14; i++) { await real(100); await page.evaluate(() => window.__step(12)); if ((await state(page)).talking) break; }
    s = await state(page);
    check(`${label}: a link to one situation goes straight into its conversation`, s.talking && s.sit === "s72-cafe" && !s.list, { talking: s.talking, sit: s.sit, panel: s.panel });
    await ctx.close();

    // ---- the pictures-only mode: the list is its home
    ({ ctx, page, errors } = await open(save("light", back)));
    const light = await page.evaluate(() => ({ cards: document.querySelectorAll(".lh-card").length, situations: window.__ew.game.orderedSituations().length, canvas: !!document.querySelector(".stage canvas"), talking: window.__ew.store.getState().conv.active }));
    await shot(page, "light-home");
    check(`${label}: the pictures-only mode opens with the list of situations, no 3D`, light.cards >= light.situations && !light.canvas && !light.talking, light);
    check(`${label}: no page errors (pictures-only)`, errors.length === 0, errors.slice(0, 3));
    await ctx.close();
  }
  console.log("town-entry: all good");
} finally {
  await browser.close();
}
