// Production-output smoke checks for the toolbar and sustained touch movement.
// WORLD_TEST_URL=http://127.0.0.1:5198 WORLD_BROWSER_CHANNEL=chrome WORLD_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node tests/browser/mobile-controls.mjs
import assert from "node:assert/strict";
const { chromium, webkit } = await import(
  process.env.WORLD_PLAYWRIGHT_MODULE || "playwright"
);
const base = process.env.WORLD_TEST_URL || "http://127.0.0.1:5188";
const check = (name, value, detail) => {
  assert(value, `${name}: ${JSON.stringify(detail)}`);
  console.log("ok", name);
};
function init() {
  localStorage.setItem(
    "english-world-progress-v1",
    JSON.stringify({
      version: 1,
      profile: {
        name: "Test",
        gender: "m",
        lookId: "m1",
        look: {
          skin: "#f2d3bd",
          hair: { style: "short", color: "#5a3a25" },
          top: "#2a9d8f",
          bottom: "#264653",
        },
      },
      settings: {
        v: 5,
        play: "town",
        quality: "low",
        scenes: false,
        volume: 0,
        cameraFollow: false,
      },
      sits: {},
      phrases: {},
      seenIntro: {},
      started: Date.now(),
      place: { zone: "town", x: -70, z: -30, rot: Math.PI },
    }),
  );
  sessionStorage.setItem("ew-play-now", "1");
}
for (const [name, engine] of [
  ["Chromium", chromium],
  ["WebKit", webkit],
]) {
  const browser = await engine.launch({
    headless: true,
    ...(name === "Chromium"
      ? {
          channel: process.env.WORLD_BROWSER_CHANNEL || undefined,
          args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
        }
      : {}),
  });
  try {
    for (const [width, height] of [
      [390, 844],
      [320, 568],
      [844, 390],
      [1280, 800],
      [1280, 720],
    ]) {
      const context = await browser.newContext({
        viewport: { width, height },
        hasTouch: true,
        isMobile: true,
      });
      await context.addInitScript(init);
      const page = await context.newPage(),
        errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(base, { waitUntil: "domcontentloaded" });
      await page.waitForFunction(
        () => window.__ew?.store.getState().screen === "play",
        null,
        { timeout: 90000 },
      );
      await page.evaluate(() =>
        window.__ew.store.getState().setHud({ panel: null, showTouch: true }),
      );
      const label = `${name} ${width}×${height}`;
      const layout = await page.locator(".toolbar").evaluate((el) => {
        const lr = el.querySelector(".light-mode-btn").getBoundingClientRect();
        const tools = [...el.querySelectorAll(".toolbar-tools .icon-btn")].map(
          (b) => b.getBoundingClientRect(),
        );
        const movement = document
          .querySelector(".jump-btn")
          ?.getBoundingClientRect();
        return {
          lr: {
            top: lr.top,
            bottom: lr.bottom,
            right: lr.right,
            left: lr.left,
          },
          bottom: Math.max(...tools.map((r) => r.bottom)),
          top: Math.min(...tools.map((r) => r.top)),
          movement: movement?.top,
          height: innerHeight,
          width: innerWidth,
        };
      });
      check(
        `${label}: LR is below all tools and on screen`,
        layout.lr.top >= layout.bottom + 4 &&
          layout.lr.bottom <= height &&
          layout.lr.right <= width &&
          layout.lr.left >= 0 &&
          layout.top >= 0,
        layout,
      );
      check(
        `${label}: toolbar stays clear of movement controls`,
        !layout.movement || layout.lr.bottom < layout.movement,
        layout,
      );
      const selectable = await page
        .locator(".joy")
        .evaluate((el) => ({
          selection:
            getComputedStyle(el).userSelect ||
            getComputedStyle(el).webkitUserSelect,
          touch: getComputedStyle(el).touchAction,
          noMenu: !el.dispatchEvent(
            new MouseEvent("contextmenu", { bubbles: true, cancelable: true }),
          ),
        }));
      check(
        `${label}: holding the joystick suppresses selection and the copy menu`,
        selectable.selection === "none" &&
          selectable.touch === "none" &&
          selectable.noMenu,
        selectable,
      );
      if (width === 390) {
        const box = await page.locator(".joy").boundingBox();
        const pos = () =>
          page.evaluate(() => ({
            p: window.__ew.game.player.root.position.toArray(),
            joy: { ...window.__ew.game.joy },
          }));
        const start = await pos();
        if (name === "Chromium") {
          const cdp = await context.newCDPSession(page);
          await cdp.send("Input.dispatchTouchEvent", {
            type: "touchStart",
            touchPoints: [
              {
                x: box.x + box.width / 2,
                y: box.y + box.height / 2 - 42,
                id: 1,
              },
            ],
          });
          await page.waitForTimeout(1200);
          const moving = await pos();
          check(
            `${label}: a held finger keeps walking`,
            Math.hypot(moving.p[0] - start.p[0], moving.p[2] - start.p[2]) >
              0.8 && moving.joy.y > 0.5,
            { start, moving },
          );
          await cdp.send("Input.dispatchTouchEvent", {
            type: "touchEnd",
            touchPoints: [],
          });
          const released = await pos();
          check(
            `${label}: releasing the finger releases movement`,
            released.joy.x === 0 && released.joy.y === 0,
            released,
          );
          await cdp.send("Input.dispatchTouchEvent", {
            type: "touchStart",
            touchPoints: [
              {
                x: box.x + box.width / 2,
                y: box.y + box.height / 2 - 42,
                id: 1,
              },
            ],
          });
          await cdp.send("Input.dispatchTouchEvent", {
            type: "touchCancel",
            touchPoints: [],
          });
          const canceled = await pos();
          check(
            `${label}: canceled touches release movement`,
            canceled.joy.x === 0 && canceled.joy.y === 0,
            canceled,
          );
          await cdp.send("Input.dispatchTouchEvent", {
            type: "touchStart",
            touchPoints: [
              {
                x: box.x + box.width / 2,
                y: box.y + box.height / 2 - 42,
                id: 1,
              },
            ],
          });
          await page.evaluate(() => window.dispatchEvent(new Event("blur")));
          await cdp.send("Input.dispatchTouchEvent", {
            type: "touchEnd",
            touchPoints: [],
          });
        } else {
          await page.mouse.move(
            box.x + box.width / 2,
            box.y + box.height / 2 - 42,
          );
          await page.mouse.down();
          await page.waitForTimeout(1200);
          const moving = await pos();
          check(
            `${label}: held pointer keeps walking`,
            Math.hypot(moving.p[0] - start.p[0], moving.p[2] - start.p[2]) >
              0.8 && moving.joy.y > 0.5,
            { start, moving },
          );
          await page.evaluate(() => window.dispatchEvent(new Event("blur")));
          await page.mouse.up();
        }
        const blurred = await pos();
        check(
          `${label}: losing focus leaves no stuck joystick`,
          blurred.joy.x === 0 && blurred.joy.y === 0,
          blurred,
        );
      }
      check(`${label}: no runtime errors`, errors.length === 0, errors);
      await context.close();
    }
  } finally {
    await browser.close();
  }
}
