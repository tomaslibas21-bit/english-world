// Batch 1–4 media in a real browser (23 Nov 2026): every recorded effect and room loop of soundscape.ts / townSounds.ts
// decodes, every card and scene picture of the mini-games loads, and a mini-game's bed starts when the game is entered
// (?billiards=1, and ?gofish=1 in Maple Harbor) and stops when it is left. Run against a local Vite dev server:
//   WORLD_TEST_URL=http://127.0.0.1:PORT WORLD_STORAGE=english-world|puerto-colibri node tests/browser/media.mjs
// Music beds live on R2 in the courses: put bed_<mode>.mp3 into the dev clip folder (public/audio-v2 or audio-es,
// git-ignored) to hear them here; without them the room loop alone plays and the test says so.
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const base = process.env.WORLD_TEST_URL || "http://127.0.0.1:8631";
const storage = process.env.WORLD_STORAGE || "english-world";
const root = join(import.meta.dirname, "../..");
const spanish = existsSync(join(root, "src/editions/es/game/townSounds.ts"));

const soundscape = readFileSync(join(root, "src/game/soundscape.ts"), "utf8");
const block = soundscape.slice(soundscape.indexOf("export const SAMPLES"), soundscape.indexOf("} as const satisfies Record<string, SampleDef>"));
const effects = new Set([...block.matchAll(/"([a-z0-9-]+\.mp3)"/g)].map((m) => m[1]));
for (const [, stem, n] of block.matchAll(/takes\("([a-z-]+)", (\d)\)/g)) for (let i = 1; i <= +n; i++) effects.add(`${stem}-${i}.mp3`);
const town = readFileSync(join(root, spanish ? "src/editions/es/game/townSounds.ts" : "src/game/townSounds.ts"), "utf8");
const rooms = [...town.matchAll(/room: \{ file: "([a-z0-9-]+\.mp3)", start: ([\d.]+), end: ([\d.]+)/g)].map((m) => ({ file: m[1], end: +m[3] }));
const pictures = [];
for (const dir of ["gofish", "loteria", "scenes/x01-pool-hall", "scenes-es/x11-billar", "scenes-es/x09-alberca"]) {
  const d = join(root, "public", dir);
  if (existsSync(d)) for (const f of readdirSync(d)) if (f.endsWith(".webp")) pictures.push(`${dir}/${f}`);
}
assert.ok(effects.size > 30 && rooms.length >= 2 && pictures.length >= 20, `lists: ${effects.size} effects, ${rooms.length} rooms, ${pictures.length} pictures`);

const progress = {
  version: 1,
  profile: { name: "Ana", surname: "Tester", gender: "f", lookId: "f1", look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } },
  settings: { v: 6, play: "town", quality: "low", scenes: false, volume: 0.3, sounds: 0.8, cameraFollow: true },
  sits: {}, phrases: {}, seenIntro: {}, started: 1, place: { zone: "town", x: -14, z: 31.4, rot: Math.PI },
  coach: { done: true, run: true, view: true },
};

const browser = await chromium.launch({ channel: process.env.WORLD_BROWSER_CHANNEL || "chromium", headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await context.addInitScript(([key, save]) => {
    localStorage.setItem(key, save);
    sessionStorage.setItem("ew-play-now", "1");
    window.SpeechRecognition = undefined; window.webkitSpeechRecognition = undefined;
    speechSynthesis.speak = (u) => setTimeout(() => u.onend?.(), 10);
  }, [`${storage}-progress-v1`, JSON.stringify(progress)]);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base, { waitUntil: "domcontentloaded" });

  // 1. every effect and room loop decodes, at a sensible length
  const sounds = await page.evaluate(async ({ effects, rooms }) => {
    const ctx = new OfflineAudioContext(1, 22050, 22050), out = [];
    for (const f of [...effects, ...rooms.map((r) => r.file)]) {
      try {
        const r = await fetch(`/sfx/${f}`);
        const buf = await ctx.decodeAudioData(await r.arrayBuffer());
        out.push({ f, ok: r.ok, sec: buf.duration });
      } catch (e) { out.push({ f, ok: false, error: String(e) }); }
    }
    return out;
  }, { effects: [...effects], rooms });
  for (const s of sounds) {
    assert.ok(s.ok, `${s.f}: ${s.error ?? "not served"}`);
    const room = rooms.find((r) => r.file === s.f);
    if (room) assert.ok(s.sec >= room.end, `${s.f}: ${s.sec.toFixed(2)} s, loop ends at ${room.end}`);
    else assert.ok(s.sec > 0.05 && s.sec < 6.5, `${s.f}: ${s.sec.toFixed(2)} s`);
  }
  console.log(`sounds: ${sounds.length} decode (${effects.size} effects, ${rooms.length} rooms)`);

  // 2. every picture loads
  const pics = await page.evaluate(async (list) => Promise.all(list.map(async (p) => {
    try { const r = await fetch(`/${p}`); const bmp = await createImageBitmap(await r.blob()); return { p, w: bmp.width, h: bmp.height }; }
    catch (e) { return { p, w: 0, error: String(e) }; }
  })), pictures);
  for (const p of pics) assert.ok(p.w >= 512, `${p.p}: ${p.error ?? p.w}`);
  console.log(`pictures: ${pics.length} load`);

  // 3. a mini-game's bed starts when the game is entered and stops when it is left
  for (const mode of spanish ? ["billiards"] : ["billiards", "gofish"]) {
    const p = await context.newPage();
    const asked = [];
    p.on("request", (r) => { if (/sfx\/(room-|open-sea|plaza)|bed_/.test(r.url())) asked.push(r.url().split("/").pop().split("?")[0]); });
    await p.goto(`${base}/?${mode}=1`, { waitUntil: "domcontentloaded" });
    let bed = null;
    for (let i = 0; i < 80 && bed !== mode; i++) { await p.waitForTimeout(250); bed = await p.evaluate(() => window.__ew?.audio?.playingBed ?? null); }
    assert.equal(bed, mode, `${mode}: the bed did not start`);
    assert.ok(asked.some((u) => u.startsWith(`bed_${mode}`)), `${mode}: the music was not asked for (${asked.join(", ")})`);
    await p.evaluate(() => window.__ew.game.modeExit());
    let left = mode;
    for (let i = 0; i < 40 && left; i++) { await p.waitForTimeout(250); left = await p.evaluate(() => window.__ew.audio.playingBed); }
    assert.equal(left, null, `${mode}: the bed did not stop`);
    console.log(`bed ${mode}: started (${asked.join(", ")}) and stopped`);
    await p.close();
  }
  assert.deepEqual(errors, [], errors.join("\n"));
  console.log("media: ok");
} finally {
  await browser.close();
}
