// WORLD_TEST_URL=http://127.0.0.1:8880 WORLD_STORAGE=english-world WORLD_BROWSER_CHANNEL=chromium
// WORLD_PLAYWRIGHT_MODULE=/path/to/playwright-core/index.mjs node tests/browser/speed-feel-landscape.mjs
// The speed streaks and the touch controls on a phone (26 Nov 2026, owner): driving flat out with the stick held, on a
// sideways phone (844×390, 664×390) and upright (390×844), no streak is drawn over the stick (its ring or its knob),
// the pedal/horn/exit buttons or the top cards, and the stick keeps working under them (it is what a touch on it hits).
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const base = process.env.WORLD_TEST_URL || "http://127.0.0.1:5188";
const storage = process.env.WORLD_STORAGE || "english-world";
const shots = process.env.WORLD_SHOTS;
if (shots) mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ channel: process.env.WORLD_BROWSER_CHANNEL || "chromium", headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--mute-audio"] });
const HUD = ".toolbar, .objective-card, .minimap, .ride-strip, .joy, .joy .knob, .act-btn, .brake-btn, .drive-horn";
try {
  for (const [W, H] of [[844, 390], [664, 390], [390, 844]]) {
    const label = `speed-feel-landscape-${W}x${H}`;
    const context = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
    try {
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await context.route(/\.mp3(\?|$)/, (route) => route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*" } }));
      const save = { version: 1, profile: { name: "Test", surname: "Tester", gender: "f", lookId: "f1", look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } },
        settings: { v: 6, play: "town", quality: "low", scenes: false, volume: 0, cameraFollow: true, phoneCalls: false, textMessages: false },
        sits: {}, phrases: {}, seenIntro: {}, started: 1, place: { zone: "town", x: 100, z: 76, rot: -Math.PI/2 }, coach: { done: true, run: true, view: true, seen: { list: true } } };
      await page.addInitScript(([k, v]) => { localStorage.setItem(k, v); sessionStorage.setItem("ew-play-now", "1"); }, [`${storage}-progress-v1`, JSON.stringify(save)]);
      await page.goto(base);
      await page.waitForFunction(() => window.__ew?.store.getState().screen === "play" && window.__ew.game.ledges?.ready, null, { timeout: 120000 });
      await page.evaluate(() => {
        const { game } = window.__ew, { rides } = game;
        const r = rides.list.find((r) => r.kind === "car" && !rides.roofed(r) && r.id === "park") || rides.list.find((r) => r.kind === "car" && !rides.roofed(r));
        const { x, z, heading, spec } = r.m; const d = spec.wide + 0.7, c = Math.cos(heading), s = Math.sin(heading);
        const door = [1, -1].map((side) => ({ x: x + side * c * d, z: z - side * s * d, rot: heading })).find(({ x, z }) => game.town.walkableAt(x, z) && rides.near(x, z) === r);
        game.enterZone("town", door, true); window.__r = r;
      });
      await page.waitForFunction(() => window.__ew.store.getState().hud.prompt?.kind === "drive");
      await page.locator(".act-btn").tap();
      await page.waitForFunction(() => window.__ew.game.rides.riding === window.__r && window.__ew.game.rides.phase === "on", null, { timeout: 20000 });
      await page.evaluate(() => { const g = window.__ew.game; g.rides.resetPosition(window.__r, { x: 100, z: 76, rot: -Math.PI / 2 }); g.rideCourse = g.rig.yaw = -Math.PI/2; g.rig.snap(); });
      await page.waitForTimeout(800);
      const cdp = await context.newCDPSession(page);
      const box = await page.locator(".joy").boundingBox();
      const c = { x: box.x + box.width / 2, y: box.y + box.height / 2, id: 1 };
      const hit = await page.evaluate(([x, y]) => !!document.elementFromPoint(x, y)?.closest(".joy"), [c.x, c.y]);
      assert(hit, `${label}: a touch on the stick reaches the stick`);
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [c] });
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ ...c, y: c.y - 68 }] });
      await page.waitForFunction(() => document.querySelector(".speed-feel")?.dataset.tier === "2", null, { timeout: 20000 });
      for (let i = 0; i < 6; i++) {
        await page.waitForTimeout(150);
        const seen = await page.evaluate((hud) => {
          const rect = (el) => { const b = el.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom, w: b.width }; };
          const streaks = [...document.querySelectorAll(".speed-feel > span")]
            .filter((s) => getComputedStyle(s).display !== "none").map(rect);
          const controls = [...document.querySelectorAll(hud)].filter((el) => el.getClientRects().length && getComputedStyle(el).visibility !== "hidden")
            .map((el) => ({ name: el.className, ...rect(el) })).filter((b) => b.w > 0);
          return { streaks, controls, pace: window.__ew.game.rides.riding?.m.pace ?? 0 };
        }, HUD);
        assert.equal(seen.streaks.length, 4, `${label}: four streaks at full speed`);
        for (const s of seen.streaks) for (const b of seen.controls) {
          const pad = 4;
          const apart = s.r + pad <= b.l || s.l - pad >= b.r || s.b + pad <= b.t || s.t - pad >= b.b;
          assert(apart, `${label}: a streak ${JSON.stringify(s)} over ${b.name} ${JSON.stringify(b)}`);
        }
        if (i === 5) assert(seen.pace > 10, `${label}: the stick drives the car (${seen.pace})`);
      }
      if (shots) await page.screenshot({ path: `${shots}/${label}.png` });
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      assert.deepEqual(errors, [], `${label}: no page errors`);
      console.log(`${label} passed`);
    } finally { await context.close(); }
  }
  console.log("speed-feel-landscape: all ok");
} finally { await browser.close(); }
