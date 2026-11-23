import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

// Match WORLD_STORAGE=puerto-colibri to a VITE_EDITION=es server. For Lithuanian, set
// WORLD_LEARNER=lt for the script and VITE_LEARNER=lt for the server.
const storage = process.env.WORLD_STORAGE || "english-world";
const pc = storage === "puerto-colibri";
const lithuanian = !pc || process.env.WORLD_LEARNER === "lt";
export const key = `${storage}-progress-v1`;
export const targetLang = pc ? "es" : "en";
export const helperLang = lithuanian ? "lt" : "en";
export const variety = pc ? (process.env.WORLD_VARIETY || "neutral") : "default";
export const lineText = (line) => variety === "default" ? line.en : line.neutral ?? line.en;
export const learnerLabel = (lt, en) => lithuanian ? lt : en;
export const viewports = process.env.WORLD_PHONE_WIDTH || process.env.WORLD_PHONE_HEIGHT
  ? [[Number(process.env.WORLD_PHONE_WIDTH || 390), Number(process.env.WORLD_PHONE_HEIGHT || 844)]]
  : [[390, 844], [390, 664], [844, 390], [1280, 800]];
const shots = process.env.WORLD_SHOT_DIR || process.env.WORLD_SHOTS || "";

export const progress = {
  version: 1,
  profile: { name: "Test", surname: "Tester", gender: "f", lookId: "f1", look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } },
  settings: { v: 6, play: "town", quality: "low", scenes: false, volume: 0.6, sounds: 0.8, phoneCalls: false },
  sits: {}, phrases: {}, seenIntro: {}, started: 1, objective: null,
  place: { zone: "town", x: 28, z: -20, rot: Math.PI },
  coach: { done: true, seen: { list: true } },
};

export function contextOptions(width, height) {
  const mobile = Math.min(width, height) < 600;
  return { viewport: { width, height }, ...(mobile ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}) };
}

export function installTown({ key, progress, manual, variety }) {
  sessionStorage.setItem("ew-play-now", "1");
  if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(progress));
  localStorage.setItem(key.replace(/-progress-v1$/, "-variety"), variety);
  window.SpeechRecognition = undefined;
  window.webkitSpeechRecognition = undefined;
  window.__lifeVibrations = [];
  Object.defineProperty(navigator, "vibrate", { configurable: true, value: (ms) => { window.__lifeVibrations.push(ms); return true; } });
  if (!manual) return;
  let now = 1000, id = 0;
  const frames = new Map();
  performance.now = () => now;
  window.requestAnimationFrame = (fn) => { frames.set(++id, fn); return id; };
  window.cancelAnimationFrame = (id) => frames.delete(id);
  window.__lifeStep = (count, ms) => {
    for (let i = 0; i < count; i++) {
      now += ms;
      for (const [id, frame] of [...frames]) if (frames.delete(id)) frame(now);
    }
  };
}

export function manualFrames(page) {
  const step = (n = 1, ms = 50) => page.evaluate(([n, ms]) => window.__lifeStep(n, ms), [n, ms]);
  const waitFor = async (test, label, advance = 50) => {
    for (let i = 0; i < 500; i++) {
      if (await test()) return;
      await step(2, advance);
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    assert.fail(label);
  };
  const during = async (action) => {
    let done = false;
    const keepFrames = (async () => {
      while (!done) { await step(1, 0); await new Promise((resolve) => setTimeout(resolve, 20)); }
    })();
    try { return await action(); }
    finally { done = true; await keepFrames; }
  };
  return { step, waitFor, during };
}

export async function screenshot(page, name, width, height) {
  if (!shots) return;
  await mkdir(shots, { recursive: true });
  await page.screenshot({ path: join(shots, `${name}-${width}x${height}.png`) });
}

export const contentUrl = (base, name) => new URL(`src/${name}.ts`, base.endsWith("/") ? base : base + "/").href;
export const lifeContentUrl = (base, name) => contentUrl(base,
  pc ? `editions/${lithuanian ? "es-lt" : "es"}/content/${name}` : `content/${name}`);
export const radioContentUrl = (base) => contentUrl(base, pc ? "editions/es/content/radio" : "content/radio");

export async function openContentPage(page, base) {
  const fixture = new URL("life-browser-test.html", base.endsWith("/") ? base : base + "/").href;
  await page.route(fixture, (route) => route.fulfill({ contentType: "text/html", body: "<!doctype html>" }), { times: 1 });
  await page.goto(fixture);
}

export async function probeEffects(page) {
  await page.evaluate(() => {
    const { audio } = window.__ew, sfx = audio.sfx.bind(audio);
    window.__lifeEffects = [];
    audio.sfx = (name, ...args) => { window.__lifeEffects.push(name); return sfx(name, ...args); };
  });
}

export function stubVoiceClips(page) {
  // As in phone-rings.mjs, skip voice recordings. Keep the town's /sfx/ recordings playable when sound is on.
  return page.route(/\/[0-9a-f]{12}\.mp3(?:\?|$)/i, (route) => route.fulfill({ status: 204, body: "" }));
}
