import { mkdir } from "node:fs/promises";

const base = process.env.WORLD_TEST_URL || "http://127.0.0.1:8311";
const storage = process.env.WORLD_STORAGE || "puerto-colibri";
const shots = process.env.WORLD_SHOTS;

export const poolViewports = [[1280, 800], [390, 844], [390, 664]];

export async function launchPoolBrowser() {
  if (shots) await mkdir(shots, { recursive: true });
  const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
  return chromium.launch({
    channel: process.env.WORLD_BROWSER_CHANNEL || "chromium",
    headless: true,
    args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
  });
}

export async function poolPage(browser, [width, height], { completed = false } = {}) {
  const phone = Math.min(width, height) === 390;
  const label = `${width}x${height}`;
  const context = await browser.newContext({
    viewport: { width, height }, deviceScaleFactor: phone ? 2 : 1, isMobile: phone, hasTouch: phone,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));
  await page.route(/\.mp3(?:\?|$)/, (route) => route.fulfill({ status: 204, body: "" }));
  const progress = {
    version: 1,
    profile: { name: "Ana", surname: "Tester", gender: "f", lookId: "f1", look: {
      skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d6f", bottom: "#264653",
    } },
    settings: { v: 6, play: "town", quality: "low", scenes: false, volume: 0, sounds: 0, cameraFollow: true },
    sits: completed ? { "x09-alberca": { visits: 1, completions: 1, used: [], twists: [], memory: {} } } : {},
    phrases: {}, seenIntro: {}, started: 1, place: { zone: "town", x: -88, z: -16, rot: Math.PI },
    coach: { done: true, run: true, view: true },
  };
  await page.addInitScript(([prefix, save]) => {
    localStorage.setItem(`${prefix}-progress-v1`, save);
    sessionStorage.setItem("ew-play-now", "1");
    window.SpeechRecognition = undefined;
    window.webkitSpeechRecognition = undefined;
  }, [storage, JSON.stringify(progress)]);
  return {
    page, context, phone, label, errors,
    open: (params = {}) => {
      const url = new URL(base);
      for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
      return page.goto(url.href, { waitUntil: "domcontentloaded" });
    },
    shot: async (name) => {
      if (shots) await page.screenshot({ path: `${shots}/pool-${label}-${name}.png` });
    },
  };
}
