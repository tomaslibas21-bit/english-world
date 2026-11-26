// The speed streaks at the wheel on a phone held sideways: they stay clear of the touch stick and the brake, and the
// stick keeps steering while they run (26 Nov 2026).
// WORLD_TEST_URL=http://127.0.0.1:8885 WORLD_STORAGE=puerto-colibri WORLD_PLAYWRIGHT_MODULE=playwright node tests/browser/speed-feel-stick.mjs
import assert from "node:assert/strict";
import { openQuestTown, questBrowser } from "./quests-harness.mjs";

const sizes = (process.env.WORLD_SIZES?.split(",") ?? ["844x390", "664x390", "390x844"]).map((size) => size.split("x").map(Number));
const shots = process.env.WORLD_SHOTS;
const overlaps = (a, b, pad = 0) => a.left < b.right + pad && a.right > b.left - pad && a.top < b.bottom + pad && a.bottom > b.top - pad;

const browser = await questBrowser();
try {
  for (const [width, height] of sizes) {
    const { context, page } = await openQuestTown(browser, width, height);
    const label = `speed-feel-stick-${width}x${height}`;
    try {
      const cdp = await context.newCDPSession(page);
      // into the parked convertible by the park, from its door, at the real prompt
      await page.evaluate(() => {
        const { game } = window.__ew, ride = game.rides.find("park");
        const { x, z, heading: rot, spec } = ride.m;
        const door = [1, -1].map((side) => ({ x: x + Math.cos(rot) * side * (spec.wide + 0.7), z: z - Math.sin(rot) * side * (spec.wide + 0.7), rot }))
          .find(({ x, z }) => game.town.walkableAt(x, z) && game.rides.near(x, z) === ride);
        game.enterZone("town", door, true);
        window.__stickRide = ride;
      });
      await page.waitForFunction(() => window.__ew.store.getState().hud.prompt?.kind === "drive", null, { timeout: 30000 });
      await page.locator(".act-btn").tap();
      await page.waitForFunction(() => window.__ew.game.rides.riding === window.__stickRide && window.__ew.game.rides.phase === "on"
        && window.__speedFeel?.active, null, { timeout: 30000 });
      // the stick pushed up to its edge and held: the car speeds up until both pairs of streaks run
      const joy = await page.locator(".joy").boundingBox();
      const center = { x: joy.x + joy.width / 2, y: joy.y + joy.height / 2, id: 1 };
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [center] });
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ ...center, y: center.y - 62 }] });
      await page.waitForFunction(() => window.__speedFeel.streakCount === 4, null, { timeout: 20000 });
      const layout = await page.evaluate(() => {
        const rect = (el) => el.getBoundingClientRect().toJSON();
        const streaks = [...document.querySelectorAll(".speed-feel > span")].filter((el) => getComputedStyle(el).display !== "none").map(rect);
        const controls = [...document.querySelectorAll(".joy, .brake-btn, .drive-horn, .act-btn")].map((el) => ({ cls: el.className, ...rect(el) }));
        const joy = document.querySelector(".joy").getBoundingClientRect();
        const hit = document.elementFromPoint(joy.left + joy.width / 2, joy.top + joy.height / 2);
        return { streaks, controls, stickOnTop: !!hit?.closest(".joy"), count: window.__speedFeel.streakCount,
          heading: window.__stickRide.m.heading, speed: window.__speedFeel.speed };
      });
      if (shots) await page.screenshot({ path: `${shots}/${label}.png` });
      // and steered right while they run: the stick still turns the car
      const heading = await page.evaluate(() => window.__stickRide.m.heading);
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ ...center, x: center.x + 44, y: center.y - 44 }] });
      await page.waitForTimeout(500);
      layout.heading = await page.evaluate(() => window.__stickRide.m.heading);
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      assert.equal(layout.count, 4, `${label}: both pairs of streaks run`);
      assert.equal(layout.streaks.length, 4, `${label}: four streaks drawn`);
      assert(layout.stickOnTop, `${label}: the stick is the first thing under its centre`);
      const turned = Math.atan2(Math.sin(layout.heading - heading), Math.cos(layout.heading - heading));
      assert(Math.abs(turned) > 0.05, `${label}: the stick steers while the streaks run (${turned.toFixed(3)} rad)`);
      for (const streak of layout.streaks) for (const control of layout.controls) {
        assert(!overlaps(streak, control, 12), `${label}: a streak clears ${control.cls} by 12 px · ${JSON.stringify({ streak, control })}`);
      }
      console.log(`${label} passed · ${layout.streaks.length} streaks clear of ${layout.controls.length} controls · turned ${turned.toFixed(2)} rad`);
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
