// The picture / 3D chip of a conversation (src/ui/ViewSwitch.tsx) in the real game, at a computer, a tablet and a
// phone. A learner who never chose (and one whose saved settings say "pictures on" from before that was a choice)
// starts with the person in 3D; a small preview of the place's picture sits in the corner of the scene, clear of the
// panel and big enough for a finger; the first time a hint beside it says what it is for, and never again; a tap (or P)
// puts the conversation in front of the picture, where the chip is a preview of the town and leads back; the picture,
// once picked, is there in the next conversation too; an open
// panel, the end of the conversation and a place without a picture (WORLD_NO_PICTURE, if the town has one) show none.
// Time is stepped by hand. Against a dev server or a built game:
// WORLD_TEST_URL=http://127.0.0.1:8096 WORLD_STORAGE=english-world WORLD_PLAYWRIGHT_MODULE=/path/to/playwright-core/index.mjs node tests/browser/view-switch.mjs
import assert from "node:assert/strict";
const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const base = process.env.WORLD_TEST_URL || "http://127.0.0.1:8096";
const storage = process.env.WORLD_STORAGE || "english-world";
const SIT = process.env.WORLD_SIT || "s72-cafe", SIT2 = process.env.WORLD_SIT2 || "s68-hotel", BARE = process.env.WORLD_NO_PICTURE || "";
const check = (name, value, detail) => {
  assert(value, `${name}: ${JSON.stringify(detail)}`);
  console.log("ok", name, detail === undefined ? "" : JSON.stringify(detail));
};
const progress = {
  version: 1,
  profile: { name: "Test", surname: "Tester", gender: "f", lookId: "f1", look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } },
  // (saved before settings v6, when "pictures on" was the default written with any setting: not a choice)
  settings: { v: 5, play: "town", quality: "low", scenes: true, volume: 0, cameraFollow: true },
  sits: {}, phrases: {}, seenIntro: {}, started: 1,
  coach: { done: true, run: true },
};
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
  { label: "computer", viewport: { width: 1280, height: 800 } },
  { label: "tablet", viewport: { width: 768, height: 1024 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  { label: "phone", viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  { label: "sideways phone", viewport: { width: 812, height: 375 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
];

const browser = await chromium.launch({ channel: process.env.WORLD_BROWSER_CHANNEL || "chromium", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
try {
  for (const { label, ...screen } of SCREENS) {
    const touch = !!screen.hasTouch;
    const ctx = await browser.newContext(screen);
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
    const settle = async (ms = 500) => { await real(ms); await step(12); };
    const talk = async (sit) => {
      await page.evaluate((s) => window.__ew.game.startScenario(s), sit);
      for (let i = 0; i < 12; i++) { await real(100); await step(12); if (await page.evaluate(() => window.__ew.store.getState().conv.active)) break; }
      await settle(300);
    };
    const leave = async () => { await page.evaluate(() => { window.__ew.game.closeConversation(); }); await settle(300); await page.evaluate(() => window.__ew.store.getState().setHud({ panel: null })); await step(6); };
    /** A tap, or a click after which the pointer moves off (a pointer left on the chip keeps its words open). */
    const press = async () => {
      if (touch) { await page.locator(".view-chip button").tap(); return; }
      await page.locator(".view-chip button").click();
      await page.mouse.move(40, 40);
    };
    const pictures = () => page.evaluate(() => { const s = window.__ew.store.getState().settings; return s.scenes ?? s.play === "light"; });
    /** The chip as the learner meets it: where it is, what it says, and what it shares the screen with. */
    const chip = () => page.evaluate(() => {
      const box = (e) => { const r = e.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), r: Math.round(r.right), b: Math.round(r.bottom) }; };
      const root = document.querySelector(".view-chip"), b = root?.querySelector("button");
      if (!root || !b) return null;
      const img = b.querySelector("img"), tip = root.querySelector(".vc-tip"), panel = document.querySelector(".convo");
      const at = box(b), pn = panel ? box(panel) : null;
      const top = document.elementFromPoint(at.x + at.w / 2, at.y + at.h / 2);
      return {
        to: root.classList.contains("to-picture") ? "picture" : "town", hint: root.classList.contains("hint"), at, panel: pn,
        clear: !pn || at.r <= pn.x || at.b <= pn.y || at.x >= pn.r || at.y >= pn.b, onTop: !!top && b.contains(top),
        inView: at.x >= 0 && at.y >= 0 && at.r <= innerWidth && at.b <= innerHeight,
        label: b.querySelector(".vc-label")?.textContent, name: b.getAttribute("aria-label"), src: img?.getAttribute("src")?.slice(0, 40) ?? null,
        loaded: !!img && img.complete && img.naturalWidth > 0, tip: tip?.textContent, tipSeen: tip ? +getComputedStyle(tip).opacity > 0.9 : false,
        tipBox: tip ? box(tip) : null,
      };
    });
    await page.evaluate(() => { window.__ew.coach?.finish?.(); window.__ew.store.getState().setHud({ panel: null }); });

    // ---- with the person in 3D: the place's picture in the corner, and the hint the first time
    await talk(SIT);
    check(`${label}: nobody chose yet: no picture setting is kept`, await page.evaluate(() => window.__ew.store.getState().settings.scenes === undefined));
    check(`${label}: the conversation starts with the person in the 3D town`, !(await pictures()) && await page.locator(".scene-backdrop").count() === 0);
    await real(1500); await step(6); await real(350);
    let c = await chip();
    check(`${label}: the chip is the place's picture, with its name on it`, c?.to === "picture" && c.loaded && !!c.label && !!c.name, c);
    check(`${label}: it is in the scene, clear of the panel, nothing over it`, c.inView && c.clear && c.onTop, { at: c.at, panel: c.panel });
    check(`${label}: a finger finds it (44 px or more each way)`, c.at.w >= 44 && c.at.h >= 44, c.at);
    const corner = label === "computer" ? c.panel.x - c.at.r <= 24 && innerEdge(c.at.b, screen.viewport.height) : label === "sideways phone" ? c.panel.x - c.at.r <= 24 && innerEdge(c.at.b, screen.viewport.height) : c.panel.y - c.at.b <= 24 && screen.viewport.width - c.at.r <= 24;
    check(`${label}: the bottom right corner of the scene`, corner, { at: c.at, panel: c.panel });
    check(`${label}: the first time, a hint beside it says what it is for`, c.hint && c.tipSeen && !!c.tip && c.tipBox.x >= 0 && c.tipBox.r <= screen.viewport.width && c.tipBox.y >= 0, { tip: c.tip, box: c.tipBox });
    check(`${label}: the hint is remembered as shown`, await page.evaluate(() => window.__ew.store.getState().progress.coach?.view === true));
    check(`${label}: the old switch in the top corner is gone`, await page.locator(".view-switch").count() === 0);

    // ---- one tap: in front of the picture, and the chip is the way back
    await press();
    await settle(600);
    await real(1500); await step(6); await real(300);
    c = await chip();
    check(`${label}: a tap puts the conversation in front of the picture, and that choice is saved`, await pictures() && await page.evaluate((k) => JSON.parse(localStorage.getItem(k)).settings.scenes === true, `${storage}-progress-v1`) && await page.locator(".scene-backdrop img.on").count() === 1);
    check(`${label}: the chip is now the town, in the same corner`, c?.to === "town" && c.label === "3D" && c.inView && c.clear && c.onTop && c.at.w >= 44 && c.at.h >= 44 && !c.hint, c);
    const town = await page.evaluate(async () => {
      const img = document.querySelector(".view-chip img");
      if (!img || !img.src.startsWith("data:image/")) return null;
      await img.decode().catch(() => {});
      const cv = document.createElement("canvas"); cv.width = 44; cv.height = 33;
      const x = cv.getContext("2d"); x.drawImage(img, 0, 0, 44, 33);
      const d = x.getImageData(0, 0, 44, 33).data;
      let lo = 255, hi = 0;
      for (let i = 0; i < d.length; i += 4) { const l = (d[i] + d[i + 1] + d[i + 2]) / 3; lo = Math.min(lo, l); hi = Math.max(hi, l); }
      return { lo: Math.round(lo), hi: Math.round(hi) };
    });
    check(`${label}: its picture is the town as the camera sees it (not a blank)`, !!town && town.hi - town.lo > 40, town);
    if (!touch) {
      await page.locator(".view-chip button").focus();
      await page.keyboard.press("Tab"); await page.keyboard.press("Shift+Tab");
      await real(400);
      c = await chip();
      check(`${label}: with the keys on it, its words are on show`, c.tipSeen && /3D/.test(c.tip) && /P$/.test(c.tip), c.tip);
      await page.evaluate(() => document.activeElement?.blur());
      await page.keyboard.press("p");
      await settle(500);
      check(`${label}: P goes back to the person in 3D`, !(await pictures()) && (await chip())?.to === "picture");
      await page.keyboard.press("p");
      await settle(500);
      check(`${label}: and P again to the picture`, await pictures() && (await chip())?.to === "town");
    }
    await press();
    await settle(600);
    c = await chip();
    check(`${label}: a tap on the town's chip is the way back to the person`, !(await pictures()) && await page.locator(".scene-backdrop").count() === 0 && c?.to === "picture" && !c.hint, c && { to: c.to, hint: c.hint });

    // ---- it keeps out of the way
    await page.evaluate(() => window.__ew.store.getState().setHud({ panel: "settings" }));
    await step(6); await real(200);
    check(`${label}: an open panel has no chip over it`, await page.locator(".view-chip").count() === 0);
    await page.evaluate(() => window.__ew.store.getState().setHud({ panel: null }));
    await step(6); await real(200);
    check(`${label}: and it is back when the panel closes`, await page.locator(".view-chip").count() === 1);
    await leave();
    check(`${label}: no chip once the conversation is over`, await page.locator(".view-chip").count() === 0);

    // ---- the next conversation in 3D: the chip, and no hint again
    await talk(SIT2);
    await real(1500); await step(6); await real(350);
    c = await chip();
    check(`${label}: the next conversation has its own picture on the chip, and no hint a second time`, c?.to === "picture" && c.loaded && !c.hint && !c.tipSeen, c && { to: c.to, hint: c.hint, src: c.src });
    // ---- the picture, once picked, is there in the next conversation too; and 3D again once that is picked
    await press();
    await settle(500);
    await leave();
    await talk(SIT);
    c = await chip();
    check(`${label}: whoever picked the picture starts the next conversation in front of it`, await pictures() && await page.locator(".scene-backdrop img.on").count() === 1 && c?.to === "town", c && { to: c.to });
    await press();
    await settle(500);
    await leave();
    await talk(SIT2);
    check(`${label}: and whoever went back to 3D starts the next one with the person`, !(await pictures()) && await page.locator(".scene-backdrop").count() === 0 && (await chip())?.to === "picture");
    await leave();

    // ---- a place without a picture has no chip to press in vain
    if (BARE) {
      await talk(BARE);
      const on = await page.evaluate(() => window.__ew.store.getState().conv.active);
      check(`${label}: ${BARE} (no picture) is a conversation in 3D`, on);
      await real(1500); await step(6);
      check(`${label}: ${BARE} has no chip, in 3D or with pictures switched on`, await page.locator(".view-chip").count() === 0);
      await page.keyboard.press("p").catch(() => {});
      await page.evaluate(() => window.__ew.store.getState().setSettings({ scenes: true }));
      await settle(400);
      check(`${label}: ${BARE} stays in 3D with no chip and no empty picture`, await page.locator(".view-chip").count() === 0 && await page.locator(".scene-backdrop").count() === 0);
      await page.evaluate(() => window.__ew.store.getState().setSettings({ scenes: false }));
      await leave();
    }
    check(`${label}: no page errors`, errors.length === 0, errors);
    await ctx.close();
  }
  console.log("view-switch: all good");
} finally {
  await browser.close();
}

/** Close to the bottom edge of the screen (the chip's bottom `b`, the screen's height `h`). */
function innerEdge(b, h) { return h - b <= 24; }
