// The town's radio in real browsers: one tap turns it on and the next off, with a fade; it plays the course's songs
// with the files token, starting with the first grammar song; its set shows the course's kinds of song as stations,
// moves on from one to the next, and its heart writes the course's own favorites; it shows the sung line, is silent
// for a conversation and a microphone, comes back, and stays reachable on phones. On an iPhone it must not make a media
// element at all (docs/MOBILE-AUDIO.md). The songs are fixtures served by this script: a minute and a half of silence
// each, so that none ends before the test is done with it, except the second grammar song, which is a voice clip of
// the repository a few seconds long (the one whose end the test waits for). Start the game with the radio on and run:
//   VITE_RADIO_INDEX=/songs/index.json VITE_RADIO_FILES=/radio-files npx vite --port 5198 --strictPort
//   WORLD_TEST_URL=http://127.0.0.1:5198 WORLD_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node tests/browser/radio.mjs
// Desktop WebKit is not an iPhone: this shows the lifecycle, not how a phone's speaker sounds.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const { chromium, webkit } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const base = process.env.WORLD_TEST_URL || "http://127.0.0.1:5198";
const manifest = JSON.parse(await readFile("public/audio/manifest.json", "utf8"));
const [clip, seconds] = Object.entries(manifest).find(([, n]) => n > 9 && n < 12);
const short = await readFile(`public/audio/${clip}.mp3`);
/** A silent recording of `length` seconds (8-bit mono PCM in a WAV file: every browser plays and decodes it). */
function silence(length, rate = 8000) {
  const n = length * rate, wav = Buffer.alloc(44 + n, 128);
  wav.write("RIFF", 0); wav.writeUInt32LE(36 + n, 4); wav.write("WAVEfmt ", 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate, 28); wav.writeUInt16LE(1, 32); wav.writeUInt16LE(8, 34); wav.write("data", 36); wav.writeUInt32LE(n, 40);
  return wav;
}
const LONG = 90, long = silence(LONG);
/** The recording a song's address gets: the short clip for G02, the long silence for the others. */
const recording = (path) => (path.includes("G02") ? { contentType: "audio/mpeg", body: short } : { contentType: "audio/wav", body: long });
const iphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 Version/26.6 Mobile/15E148 Safari/604.1";
const TOKEN = "radio-test-token";
// a small course: two grammar songs, a vocabulary song (a free example: only on the course's site) and a situation
// song; none of the second half's, so there is no Idioms FM
const songs = [["G01", "g"], ["G02", "g"], ["V01", "v"], ["S62", "s"]].map(([id, c], i) => ({ id, c, n: 1, t: `Radio Song ${i + 1}`, tl: `Radijo daina ${i + 1}`, tp: "", g: i === 1 ? "roots reggae" : "motown soul", d: id === "G02" ? seconds : LONG, a: `/songs/audio/${id}.mp3` }));
const FAVORITES = "fluentsteps.songs.favorites.v1";
const lines = Array.from({ length: 55 }, (_, i) => {
  const s = 0.4 + i * 1.6;
  return { s, e: s + 1.4, sec: 0, lab: "", src: "Every evening home", lt: "Kiekvieną vakarą namo", u: [["Every evening,", "Kiekvieną vakarą,", 2], ["home", "namo (į namus)", 1]], w: [[s, s + 0.4], [s + 0.5, s + 0.9], [s + 1, s + 1.4]], wt: ["Every", "evening,", "home"] };
});
let checks = 0;
const check = (name, value, detail) => { assert(value, `${name}: ${JSON.stringify(detail)}`); console.log("ok", name); checks++; };

function init(token) {
  if (!localStorage.getItem("english-world-progress-v1")) {
    localStorage.setItem("english-world-progress-v1", JSON.stringify({
      version: 1,
      profile: { name: "Test", gender: "m", lookId: "m1", look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } },
      settings: { v: 5, play: "town", quality: "low", scenes: false, volume: 0.8, cameraFollow: false },
      sits: {}, phrases: {}, seenIntro: {}, started: Date.now(), place: { zone: "town", x: -70, z: -30, rot: Math.PI },
    }));
  }
  localStorage.setItem("fs-files-token", JSON.stringify({ token, exp: Math.floor(Date.now() / 1000) + 3600 }));
  sessionStorage.setItem("ew-play-now", "1");
  // what makes sound: media elements, and Web Audio sources as long as a song (not the town's own looped sounds, the
  // sea and a market's murmur: src/game/audio.ts)
  const probe = (window.radioProbe = { audios: [], sources: [] });
  const NativeAudio = window.Audio;
  probe.volumes = [];
  window.Audio = function (...args) {
    const el = new NativeAudio(...args);
    probe.audios.push(el);
    el.addEventListener("volumechange", () => { if (!el.src.startsWith("data:")) probe.volumes.push(el.volume); });
    return el;
  };
  const Native = window.AudioContext || window.webkitAudioContext;
  if (Native) {
    const create = Native.prototype.createBufferSource;
    Native.prototype.createBufferSource = function () {
      const s = create.call(this), start = s.start.bind(s), stop = s.stop.bind(s);
      s.start = (...a) => { if (s.buffer && s.buffer.duration > 5 && !s.loop) probe.sources.push({ rate: s.buffer.sampleRate, offset: a[1] || 0, on: true, s }); return start(...a); };
      s.stop = (...a) => { const p = probe.sources.find((x) => x.s === s); if (p) p.on = false; return stop(...a); };
      return s;
    };
  }
}

const state = (page) => page.evaluate(() => {
  const ew = window.__ew, r = ew.radio.store.getState(), probe = window.radioProbe;
  return {
    on: r.on, playing: r.playing, held: r.held, needsTap: r.needsTap, failed: r.failed, song: r.song?.id ?? null, station: r.station, place: r.place, liked: r.liked, shuffle: r.shuffle, counts: r.counts,
    position: ew.radio.position(), conversation: ew.store.getState().conv.active, voice: ew.voice?.(),
    // a media element that is not paused, or a long Web Audio source that was started and not stopped
    sounding: probe.audios.some((el) => !el.paused && !el.ended && !el.src.startsWith("data:")) || probe.sources.some((x) => x.on),
    audios: probe.audios.length, rates: [...new Set(probe.sources.map((x) => x.rate))],
    volume: probe.audios.find((el) => !el.src.startsWith("data:"))?.volume ?? null,
  };
});
const until = (page, test, ms = 8000) => page.waitForFunction(test, null, { timeout: ms });
const playing = (page) => until(page, () => window.__ew.radio.store.getState().playing).catch(async (error) => { console.log("not playing:", await state(page)); throw error; });

for (const [name, engine] of [["Chromium", chromium], ["WebKit", webkit]]) {
  const browser = await engine.launch({
    headless: true,
    ...(name === "Chromium" ? { channel: process.env.WORLD_BROWSER_CHANNEL || undefined, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--autoplay-policy=document-user-activation-required"] } : {}),
  });
  try {
    for (const phone of [false, true]) {
      const label = `${name} ${phone ? "as an iPhone" : "desktop"}`;
      const context = await browser.newContext(phone ? { userAgent: iphone, isMobile: true, hasTouch: true, viewport: { width: 390, height: 844 } } : { viewport: { width: 1280, height: 800 } });
      await context.addInitScript(init, TOKEN);
      const page = await context.newPage(), errors = [], asked = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.route("**/songs/index.json", (route) => route.fulfill({ json: { lang: "en", songs } }));
      // the course's files folder: only with the token; V01 is a free example, which the folder doesn't have
      await page.route("**/radio-files/songs/**", (route) => {
        const url = new URL(route.request().url());
        asked.push(url.pathname + url.search);
        if (url.searchParams.get("t") !== TOKEN) return route.fulfill({ status: 401, json: { error: "sign-in" } });
        if (url.pathname.includes("V01")) return route.fulfill({ status: 404, json: { error: "not found" } });
        return url.pathname.endsWith(".mp3") ? route.fulfill(recording(url.pathname)) : route.fulfill({ json: { L: lines } });
      });
      await page.route(/\/songs\/(audio|data)\/[GVS]\d\d\.(mp3|json)/, (route) => {
        const url = new URL(route.request().url());
        if (url.pathname.startsWith("/radio-files/")) return route.fallback();
        asked.push(url.pathname + url.search);
        if (!url.pathname.includes("V01")) return route.fulfill({ status: 404, body: "" });
        return url.pathname.endsWith(".mp3") ? route.fulfill(recording(url.pathname)) : route.fulfill({ json: { L: lines } });
      });
      await page.goto(base, { waitUntil: "domcontentloaded" });
      await until(page, () => window.__ew?.store.getState().screen === "play", 90000);
      await page.evaluate((touch) => window.__ew.store.getState().setHud({ panel: null, ...(touch ? { showTouch: true } : {}) }), phone);

      // ---- the button: there, big enough, clear of the other controls
      const button = page.locator(".radio-btn");
      const layout = await page.evaluate(() => {
        const box = (sel) => { const r = document.querySelector(sel)?.getBoundingClientRect(); return r ? { l: r.left, t: r.top, r: r.right, b: r.bottom } : null; };
        return { radio: box(".radio-btn"), lr: box(".light-mode-btn"), jump: box(".jump-btn"), joy: box(".joy"), w: innerWidth, h: innerHeight };
      });
      const apart = (a, b) => !a || !b || a.r <= b.l || b.r <= a.l || a.b <= b.t || b.b <= a.t;
      check(`${label}: the radio button is on screen and at least 44 px`, layout.radio && layout.radio.l >= 0 && layout.radio.r <= layout.w && layout.radio.b <= layout.h && layout.radio.r - layout.radio.l >= 44 && layout.radio.b - layout.radio.t >= 44, layout);
      check(`${label}: it is clear of the light-mode button and the movement controls`, apart(layout.radio, layout.lr) && apart(layout.radio, layout.jump) && apart(layout.radio, layout.joy) && apart(layout.lr, layout.jump), layout);

      // ---- one tap: on, the card, a song with the token
      let s = await state(page);
      check(`${label}: silent until asked`, !s.on && !s.sounding, s);
      await (phone ? button.tap() : button.click());
      await playing(page);
      await page.waitForTimeout(1300);
      s = await state(page);
      check(`${label}: a tap turns it on and the first grammar song sounds, on Grammar FM, in the course's order`, s.on && s.playing && s.sounding && s.song === "G01" && s.station === "grammar" && !s.shuffle && s.place?.n === 1 && s.place?.of === 2, s);
      if (!phone) {
        // every step of the fade as the media element saw it: many small rises from silence, not one jump
        const steps = await page.evaluate(() => [...new Set(window.radioProbe.volumes)]);
        check(`${label}: the music fades in (not a jump to full volume)`, steps.filter((v) => v > 0.02 && v < s.volume - 0.02).length >= 5 && s.volume > 0.3, { steps: steps.length, full: s.volume });
      }
      check(`${label}: the recording and its words were asked for with the course's token`, asked.some((u) => u.endsWith(`.mp3?t=${TOKEN}`)) && asked.some((u) => u.endsWith(`.json?t=${TOKEN}`)), asked);
      check(`${label}: ${phone ? "no media element (the game's Web Audio, decoded at 32 kHz)" : "one media element"}`, phone ? s.audios === 0 && s.rates.join() === "32000" : s.rates.length === 0 && s.audios >= 1, s);
      // the very first time, the radio set opens by itself: the radio's name, the dial, the display, five keys, and the
      // stations: the course's kinds of song that it has (no Idioms FM here), the mix, and the favorites
      const card = await page.locator(".radio-set").boundingBox();
      const rows = await page.locator(".rs-st").evaluateAll((els) => els.map((el) => ({ name: el.querySelector("b").textContent, count: el.querySelector(".rs-st-count")?.textContent ?? null, on: el.getAttribute("aria-checked") === "true", empty: el.getAttribute("aria-disabled") === "true" })));
      check(`${label}: the radio set is on screen with its name, five keys and the stations`, card && card.x >= 0 && card.y >= 0 && card.x + card.width <= layout.w && card.y + card.height <= layout.h
        && (await page.locator(".rs-name").textContent()) === "Maple Harbor Radio" && await page.locator(".rs-key").count() === 5, card);
      check(`${label}: the stations are the course's kinds of song with their counts, then the mix and the favorites; Grammar FM plays`,
        rows.map((r) => `${r.name} ${r.count}`).join("|") === "Grammar FM 2|Vocab FM 1|Situations FM 1|Random FM 4|Favorites FM null" && rows.map((r) => r.on).join() === "true,false,false,false,false" && rows[4].empty && !rows[0].empty, rows);
      const keys = await page.locator(".rs-key, .rs-st, .rs-heart").evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); return Math.min(r.width, r.height); }));
      check(`${label}: every key, every station and the heart is at least 44 px`, keys.length === 11 && keys.every((k) => k >= 44), keys);
      const dial = await page.evaluate(() => {
        const d = document.querySelector(".rs-dial").getBoundingClientRect(), n = document.querySelector(".rs-needle").getBoundingClientRect();
        const marks = [...document.querySelectorAll(".rs-dial span")].map((el) => el.getBoundingClientRect());
        return { needle: (n.left + n.width / 2 - d.left) / d.width, marksInside: marks.every((m) => m.left >= d.left && m.right <= d.right), ticks: document.querySelectorAll(".rs-tick").length };
      });
      check(`${label}: the needle stands at Grammar FM's 89.5 on a dial whose numbers all fit, with a dot for each station`, Math.abs(dial.needle - (0.06 + ((89.5 - 88) / 20) * 0.88)) < 0.02 && dial.marksInside && dial.ticks === 5, dial);
      const header = await page.evaluate(() => { const n = document.querySelector(".rs-name"), top = document.querySelector(".rs-top"); return { name: [n.scrollWidth, n.clientWidth], right: n.getBoundingClientRect().right, x: document.querySelector(".rs-x").getBoundingClientRect().left, text: top.textContent.trim() }; });
      check(`${label}: the radio's name shows in full, alone in the header`, header.name[0] <= header.name[1] + 1 && header.right <= header.x + 1 && header.text === "Maple Harbor Radio", header);
      const display = await page.evaluate(() => ({ station: document.querySelector(".rs-station").textContent, place: document.querySelector(".rs-place")?.textContent, time: document.querySelector(".rs-time")?.textContent, song: document.querySelector(".rs-now b")?.textContent }));
      check(`${label}: the display names the station, the song's place in it, the time and the song`, display.station === "Grammar FM" && display.place === "01/02" && /^0:0\d$/.test(display.time) && display.song === "Radio Song 1", display);

      // ---- the heart: the song joins the course's favorite songs (the note its Songs page reads and its account keeps)
      const heart = page.locator(".rs-heart");
      const top = await page.locator(".rs-keys").boundingBox();
      await (phone ? heart.tap() : heart.click());
      let note = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "null"), FAVORITES);
      s = await state(page);
      check(`${label}: the heart writes the song into the course's favorites, as the course writes them`, note && Object.keys(note).join() === "G01" && note.G01.liked === true && Math.abs(note.G01.at - Date.now()) < 60000 && s.liked && s.counts.favorites === 1
        && await heart.getAttribute("aria-pressed") === "true" && s.playing && s.sounding, { note, s });
      const after = await page.locator(".rs-keys").boundingBox();
      check(`${label}: it says so, nothing under it moves, and Favorites FM has a song`, (await page.locator(".rs-hearted").textContent()).startsWith("Pridėta prie mėgstamų") && Math.abs(after.y - top.y) <= 1
        && await page.locator(".rs-st-favorites .rs-st-count").textContent() === "1" && await page.locator(".rs-st-favorites").getAttribute("aria-disabled") === "false", { top, after });
      const first = note.G01.at;
      await (phone ? heart.tap() : heart.click());
      note = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), FAVORITES);
      check(`${label}: taken back, the heart stays in the note as a later "not liked" (the account's merge goes by it)`, note.G01.liked === false && note.G01.at > first && !(await state(page)).liked && await page.locator(".rs-st-favorites").getAttribute("aria-disabled") === "true", note);
      // a heart given on the course's own Songs page, in another tab
      await page.evaluate((key) => {
        const value = JSON.stringify({ ...JSON.parse(localStorage.getItem(key)), G01: { liked: true, at: Date.now() + 5 }, S62: { liked: true, at: Date.now() } });
        localStorage.setItem(key, value);
        window.dispatchEvent(new StorageEvent("storage", { key, newValue: value, storageArea: localStorage }));
      }, FAVORITES);
      await page.waitForTimeout(100);
      s = await state(page);
      check(`${label}: a heart given on the course's own page shows here too`, s.liked && s.counts.favorites === 2 && await heart.getAttribute("aria-pressed") === "true", s);
      await page.locator(".rs-x").click();

      // ---- folded away: the lit button and the station's plate; a tap on the button is off, the next is on
      // the plate has slid in (a slow machine draws few frames, so wait for the animation itself, not a time)
      await until(page, () => { const el = document.querySelector(".radio-plate"); return !!el && el.getAnimations().every((a) => a.playState === "finished"); }, 15000);
      const folded = await page.evaluate(() => {
        const box = (sel) => { const r = document.querySelector(sel)?.getBoundingClientRect(); return r ? { l: r.left, t: r.top, r: r.right, b: r.bottom } : null; };
        return { plate: box(".radio-plate"), text: document.querySelector(".radio-plate-text")?.textContent, lit: document.querySelector(".radio-btn").classList.contains("on"),
          set: !!document.querySelector(".radio-set"), tools: [...document.querySelectorAll(".toolbar .icon-btn")].map((el) => { const r = el.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; }), w: innerWidth };
      });
      check(`${label}: while it plays, the button is lit and a plate beside it names the station or the song`, folded.lit && !folded.set && folded.plate && folded.plate.l >= 0 && folded.plate.r <= folded.w
        && folded.plate.b - folded.plate.t >= 36 && folded.tools.every((t) => apart(t, folded.plate)) && ["Grammar FM", "Radio Song 1"].includes(folded.text), folded);
      await (phone ? button.tap() : button.click());
      s = await state(page);
      check(`${label}: one tap turns it off: the button goes dark and the plate leaves at once`, !s.on && await page.locator(".radio-plate").count() === 0 && !(await button.evaluate((el) => el.classList.contains("on"))), s);
      await page.waitForTimeout(1200);
      s = await state(page);
      check(`${label}: and the music has faded out`, !s.sounding && !s.playing, s);
      await (phone ? button.tap() : button.click());
      await playing(page);
      check(`${label}: the next tap turns it on again, without the set in the way`, (await state(page)).on && await page.locator(".radio-set").count() === 0 && await page.locator(".radio-plate").count() === 1, await state(page));
      await page.locator(".radio-plate").click();
      check(`${label}: a tap on the plate opens the set, a tap elsewhere folds it away`, await page.locator(".radio-set").count() === 1, null);
      await page.evaluate(() => document.querySelector(".stage").dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })));
      await page.waitForTimeout(100);
      check(`${label}: folded away again, still playing`, await page.locator(".radio-set").count() === 0 && (await state(page)).on, null);
      // switched off with the set open: off looks off, the set folds away too; on again shows the plate only
      await page.locator(".radio-plate").click();
      await page.evaluate(() => window.__ew.radio.power());
      check(`${label}: switched off with the set open, the set folds away`, await page.locator(".radio-set").count() === 0 && await page.locator(".radio-plate").count() === 0 && !(await state(page)).on, await state(page));
      await page.waitForTimeout(1100);
      await page.evaluate(() => window.__ew.radio.power());
      await playing(page);
      check(`${label}: on again brings the plate, not the set`, await page.locator(".radio-set").count() === 0 && await page.locator(".radio-plate").count() === 1, null);

      // ---- the lyric strip: the sung line, the word lit, the glosses with the game's translation setting
      await until(page, () => !!document.querySelector(".radio-strip .ru.now, .radio-strip .ru.sung"));
      const strip = await page.evaluate(() => {
        const el = document.querySelector(".radio-strip"), r = el.getBoundingClientRect();
        const box = (sel) => { const x = document.querySelector(sel)?.getBoundingClientRect(); return x ? { l: x.left, t: x.top, r: x.right, b: x.bottom } : null; };
        return { words: [...el.querySelectorAll(".rt")].map((x) => x.textContent), glosses: [...el.querySelectorAll(".rg")].map((x) => x.textContent), lit: el.querySelectorAll(".ru.now, .ru.sung").length,
          box: { l: r.left, t: r.top, r: r.right, b: r.bottom }, joy: box(".joy"), jump: box(".jump-btn"), tools: box(".toolbar"), through: getComputedStyle(el).pointerEvents, w: innerWidth, h: innerHeight };
      });
      check(`${label}: the strip shows the line with a gloss under each unit (the literal meaning left out)`, strip.words.join("|") === "Every evening,|home" && strip.glosses.join("|") === "Kiekvieną vakarą,|namo" && strip.lit >= 1, strip);
      check(`${label}: the strip is on screen, clear of the controls, and lets taps through`, strip.box.l >= 0 && strip.box.r <= strip.w && strip.box.b <= strip.h && apart(strip.box, strip.joy) && apart(strip.box, strip.jump) && apart(strip.box, strip.tools) && strip.through === "none", strip);
      await page.evaluate(() => window.__ew.store.getState().setSettings({ lt: false }));
      await page.waitForTimeout(100);
      check(`${label}: no glosses with the game's translations off`, await page.locator(".radio-strip .rg").count() === 0 && await page.locator(".radio-strip .rt").count() > 0, null);
      await page.evaluate(() => window.__ew.store.getState().setSettings({ lt: true }));

      // ---- a conversation: silent, and silent for a microphone after it
      const before = (await state(page)).position;
      await page.evaluate(() => window.__ew.game.startScenario("s72-cafe"));
      await until(page, () => window.__ew.store.getState().conv.active);
      await page.waitForTimeout(1150);
      s = await state(page);
      check(`${label}: a conversation fades it out within about a second`, s.on && !s.playing && s.held && !s.sounding && s.conversation, s);
      const lease = await page.evaluateHandle(async () => {
        // the game's own module instance (the address Vite compiled the radio's import to)
        const compiled = await (await fetch("/src/radio/index.ts")).text();
        const { captureAudio } = await import(compiled.match(/from\s*["']([^"']*convo\/audioFocus\.ts[^"']*)["']/)[1]);
        return captureAudio();
      });
      await page.evaluate(() => window.__ew.game.closeConversation());
      await page.waitForTimeout(1600);
      s = await state(page);
      check(`${label}: with the conversation closed it still waits for the microphone`, !s.playing && s.held && !s.sounding && !s.conversation, s);
      const quiet = s.position;
      await page.waitForTimeout(300);
      check(`${label}: nothing moved meanwhile`, (await state(page)).position === quiet && quiet >= before, { before, quiet });
      await lease.evaluate((l) => l.ended());
      await playing(page);
      await page.waitForTimeout(500);
      s = await state(page);
      check(`${label}: it comes back by itself, from where it was`, s.playing && s.sounding && !s.held && s.position >= quiet && s.position < quiet + 2.5, { s, quiet });

      // ---- a microphone while it plays (a spoken card, a late recogniser): cut at once
      const cut = await page.evaluate(async () => {
        const compiled = await (await fetch("/src/radio/index.ts")).text();
        const { captureAudio } = await import(compiled.match(/from\s*["']([^"']*convo\/audioFocus\.ts[^"']*)["']/)[1]);
        const probe = window.radioProbe, lease = captureAudio();
        const sounding = probe.audios.some((el) => !el.paused && !el.ended && !el.src.startsWith("data:")) || probe.sources.some((x) => x.on);
        lease.ended();
        return { sounding, playing: window.__ew.radio.store.getState().playing };
      });
      check(`${label}: a microphone lease silences it in the same instant`, !cut.sounding && !cut.playing, cut);
      await playing(page);

      // ---- the stations: a tap tunes, a station goes on from where it was left, a free example comes from the
      // course's site, and at a station's end the radio moves on to the next one
      // (the second grammar song is the short one: each step below leaves it well before its end)
      await page.evaluate(() => { window.__ew.radio.next(); window.__ew.radio.setOpen(true); });
      await playing(page);
      s = await state(page);
      check(`${label}: next goes to Grammar FM's second song`, s.station === "grammar" && s.song === "G02" && s.place?.n === 2, s);
      const row = (name) => page.locator(".rs-st", { hasText: name });
      await (phone ? row("Vocab FM").tap() : row("Vocab FM").click());
      await playing(page);
      await page.waitForTimeout(900);
      s = await state(page);
      const tuned = await page.evaluate(() => { const d = document.querySelector(".rs-dial")?.getBoundingClientRect(), n = document.querySelector(".rs-needle")?.getBoundingClientRect(); return { needle: d && d.width ? (n.left + n.width / 2 - d.left) / d.width : null, on: document.querySelector(".rs-st.on b").textContent, station: document.querySelector(".rs-station").textContent }; });
      check(`${label}: a tap on Vocab FM tunes to it: its first song, a free example found on the course's site without the token`, s.station === "vocab" && s.song === "V01" && s.sounding && asked.includes("/songs/audio/V01.mp3") && !asked.some((u) => u.startsWith("/songs/") && u.includes("t=")), { s, asked: asked.slice(-6) });
      check(`${label}: the needle has moved to 93.1, and the row and the display say Vocab FM`, (tuned.needle === null || Math.abs(tuned.needle - (0.06 + ((93.1 - 88) / 20) * 0.88)) < 0.02) && tuned.on === "Vocab FM" && tuned.station === "Vocab FM", tuned);
      await (phone ? row("Grammar FM").tap() : row("Grammar FM").click());
      await playing(page);
      s = await state(page);
      check(`${label}: back on Grammar FM, it goes on from the song it was left at`, s.station === "grammar" && s.song === "G02", s);
      // the shuffle key is the station's own; Random FM is always shuffled, whatever the key says
      await (phone ? row("Random FM").tap() : row("Random FM").click());
      await playing(page);
      const shuffleKey = page.locator(".rs-key").first();
      s = await state(page);
      check(`${label}: Random FM plays all the course's songs shuffled, its shuffle key lit and fixed`, s.station === "random" && s.shuffle && s.place?.of === 4 && await shuffleKey.getAttribute("aria-pressed") === "true" && await shuffleKey.getAttribute("aria-disabled") === "true", s);
      await (phone ? shuffleKey.tap({ force: true }) : shuffleKey.click({ force: true }));
      check(`${label}: a tap on it changes nothing there`, (await state(page)).shuffle, null);
      await (phone ? row("Grammar FM").tap() : row("Grammar FM").click());
      await playing(page);
      s = await state(page);
      check(`${label}: and Grammar FM is in the course's order still, at its song`, s.station === "grammar" && !s.shuffle && s.song === "G02" && await shuffleKey.getAttribute("aria-pressed") === "false", s);
      await page.locator(".rs-x").click();
      await page.evaluate(() => window.__ew.radio.next());
      await playing(page);
      await page.waitForTimeout(300);
      s = await state(page);
      check(`${label}: next from a station's last song moves on to the next station's first`, s.station === "vocab" && s.song === "V01" && s.sounding, s);
      await page.evaluate(() => window.__ew.radio.previous());
      await playing(page);
      s = await state(page);
      check(`${label}: previous goes back to the last song of the station before`, s.station === "grammar" && s.song === "G02", s);
      await until(page, () => window.__ew.radio.store.getState().song?.id === "V01" && window.__ew.radio.store.getState().playing, (seconds + 6) * 1000);
      s = await state(page);
      check(`${label}: when Grammar FM has played to its end, the radio moves on to Vocab FM by itself`, s.sounding && s.station === "vocab" && s.place?.n === 1, s);

      // ---- remembered: the next visit goes on (after the tap a browser may ask for)
      await page.evaluate(() => window.__ew.radio.setLyrics(false));
      await page.reload({ waitUntil: "domcontentloaded" });
      await until(page, () => window.__ew?.store.getState().screen === "play", 90000);
      await page.evaluate(() => window.__ew.store.getState().setHud({ panel: null }));
      await until(page, () => window.__ew.radio.store.getState().ready);
      await page.waitForTimeout(600);
      s = await state(page);
      check(`${label}: the radio is remembered as on, at its station and song, and silent until the browser lets it`, s.on && s.station === "vocab" && s.song === "V01" && s.liked === false && s.counts.favorites === 2 && (s.playing || s.needsTap) && (s.playing || !s.sounding), s);
      // any tap in the game will do; this one changes nothing else
      await (phone ? page.locator(".objective-card .collapse-btn").tap() : page.locator(".objective-card .collapse-btn").click());
      await playing(page);
      await page.waitForTimeout(1200);
      check(`${label}: it plays again after a tap, with the strip still hidden`, (await state(page)).sounding && await page.locator(".radio-strip").count() === 0, await state(page));
      // pause, and nothing brings it back
      await page.evaluate(() => window.__ew.radio.setOn(false));
      await page.evaluate(() => window.__ew.game.startScenario("s72-cafe"));
      await until(page, () => window.__ew.store.getState().conv.active);
      await page.evaluate(() => window.__ew.game.closeConversation());
      await page.waitForTimeout(1500);
      s = await state(page);
      check(`${label}: paused stays paused after a conversation`, !s.on && !s.playing && !s.sounding, s);
      check(`${label}: no page errors`, errors.length === 0, errors);
      await context.close();
    }

    // ---- the button and the open card at other sizes
    for (const [width, height] of [[320, 568], [844, 390], [1280, 720], [1024, 600]]) {
      const context = await browser.newContext({ viewport: { width, height }, hasTouch: width < 1000, isMobile: width < 1000 });
      await context.addInitScript(init, TOKEN);
      const page = await context.newPage();
      await page.route("**/songs/index.json", (route) => route.fulfill({ json: { lang: "en", songs } }));
      await page.route("**/radio-files/songs/**", (route) => route.request().url().endsWith(".mp3") || route.request().url().includes(".mp3?") ? route.fulfill(recording(route.request().url())) : route.fulfill({ json: { L: lines } }));
      await page.goto(base, { waitUntil: "domcontentloaded" });
      await until(page, () => window.__ew?.store.getState().screen === "play", 90000);
      await page.evaluate((touch) => window.__ew.store.getState().setHud({ panel: null, ...(touch ? { showTouch: true } : {}) }), width < 1000);
      await page.evaluate(() => window.__ew.radio.setOpen(true));
      const boxes = await page.evaluate(() => {
        const box = (sel) => { const r = document.querySelector(sel)?.getBoundingClientRect(); return r ? { l: r.left, t: r.top, r: r.right, b: r.bottom } : null; };
        const tools = [...document.querySelectorAll(".toolbar .icon-btn")].map((el) => { const r = el.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; });
        return { radio: box(".radio-btn"), lr: box(".light-mode-btn"), card: box(".radio-set"), jump: box(".jump-btn"), joy: box(".joy"), tools, w: innerWidth, h: innerHeight };
      });
      const inside = (b) => b && b.l >= 0 && b.t >= 0 && b.r <= boxes.w && b.b <= boxes.h;
      const apart = (a, b) => !a || !b || a.r <= b.l || b.r <= a.l || a.b <= b.t || b.b <= a.t;
      check(`${name} ${width}×${height}: every tool, the radio and the light-mode button are on screen and apart`, boxes.tools.every(inside) && boxes.tools.every((a, i) => boxes.tools.every((b, j) => i === j || apart(a, b))), boxes);
      check(`${name} ${width}×${height}: the tools stay clear of the movement controls`, boxes.tools.every((t) => apart(t, boxes.jump) && apart(t, boxes.joy)), boxes);
      check(`${name} ${width}×${height}: the open radio set fits the screen`, inside(boxes.card), boxes);
      // the largest text size (Nustatymai: A++): the radio's name and every station's name show in full, the set still
      // fits, and the station that plays is in view (on the smallest screens the stations scroll)
      await page.evaluate(() => window.__ew.store.getState().setSettings({ textSize: 1.3 }));
      for (const id of ["grammar", "situations", "random"]) {
        await page.evaluate((station) => window.__ew.radio.setStation(station), id);
        await until(page, () => document.querySelector(".radio-set").getAnimations().every((a) => a.playState === "finished"), 15000);
        await page.waitForTimeout(160);
        const big = await page.evaluate(() => {
          const n = document.querySelector(".rs-name"), r = document.querySelector(".radio-set").getBoundingClientRect(), list = document.querySelector(".rs-stations").getBoundingClientRect(), on = document.querySelector(".rs-st.on").getBoundingClientRect();
          return { on: document.querySelector(".rs-st.on b").textContent, full: n.scrollWidth <= n.clientWidth + 1, names: [...document.querySelectorAll(".rs-st b")].every((b) => b.scrollWidth <= b.clientWidth + 1),
            inView: on.top >= list.top - 1 && on.bottom <= list.bottom + 1, keys: [...document.querySelectorAll(".rs-key, .rs-st")].every((el) => { const k = el.getBoundingClientRect(); return Math.min(k.width, k.height) >= 44; }),
            l: r.left, t: r.top, r: r.right, b: r.bottom, w: innerWidth, h: innerHeight };
        });
        check(`${name} ${width}×${height}: at the largest text every name shows in full, the set fits, and “${big.on}” is in view`, big.full && big.names && big.inView && big.keys && big.l >= 0 && big.t >= 0 && big.r <= big.w && big.b <= big.h, big);
      }
      await context.close();
    }
  } finally { await browser.close(); }
}
console.log(`${checks}/${checks} radio checks passed in real browsers; no physical iPhone claim.`);
