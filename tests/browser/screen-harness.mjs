import fs from "node:fs";

const base = process.env.WORLD_TEST_URL || "http://127.0.0.1:8096";
const storage = process.env.WORLD_STORAGE || "puerto-colibri";
const shots = process.env.WORLD_SHOTS || "";
const progress = {
  version: 1,
  profile: { name: "Test", surname: "Tester", gender: "f", lookId: "f1", look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } },
  settings: { v: 6, play: "town", quality: "low", volume: 0, cameraFollow: true },
  sits: {}, phrases: {}, seenIntro: {}, started: 1,
  place: { zone: "town", x: 0, z: 0, rot: 0 },
  coach: { done: true, seen: { list: true }, view: true },
};

export async function openTown(browser, width, height, phone) {
  const context = await browser.newContext({
    viewport: { width, height },
    ...(phone ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}),
  });
  const page = await context.newPage();
  try {
    await page.addInitScript(([key, value]) => {
      localStorage.setItem(key, value);
      sessionStorage.setItem("ew-play-now", "1");
      window.__hold = false;
      const hold = (e) => { if (window.__hold) e.stopImmediatePropagation(); };
      window.addEventListener("resize", hold, true);
      window.addEventListener("orientationchange", hold, true);
    }, [`${storage}-progress-v1`, JSON.stringify(progress)]);
    await page.goto(base, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__ew?.store.getState().screen === "play" && document.querySelector(".toolbar"), null, { timeout: 180000 });
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    return { context, page };
  } catch (error) {
    await context.close();
    throw error;
  }
}

export async function openPhoneMenu(page) {
  await page.locator(".toolbar").waitFor();
  const folded = page.locator('.toolbar .ride-menu[aria-expanded="false"]');
  if (await folded.count()) await folded.tap();
}

export async function shot(page, name) {
  if (!shots) return;
  fs.mkdirSync(shots, { recursive: true });
  await page.screenshot({ path: `${shots}/${name}.png` });
}
