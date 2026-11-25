// WORLD_TEST_URL=http://127.0.0.1:8176 WORLD_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node tests/browser/voice-reach.mjs
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { tsImport } from "tsx/esm/api";

const base = new URL(process.env.WORLD_TEST_URL || "http://127.0.0.1:8176");
if (!base.pathname.endsWith("/")) base.pathname += "/";
const storage = process.env.WORLD_STORAGE || "english-world";
const learner = process.env.WORLD_LEARNER || "lt";
assert.notEqual(storage, "puerto-colibri", `voice-reach needs Puerto Colibrí's route data for learner ${learner}`);

const routes = [
  {
    sit: "s87-interview", seed: 5,
    answers: [
      ["arrive", "Good morning! I have an interview at 9:30."],
      ["name", "My name is Tomas."],
      ["about", "I work in customer service."],
    ],
    next: "about",
    target: { key: "dcb33a0985ec", line: "ask_years_field2", npc: "brooks",
      say: "And how long have you worked in customer service?", en: "And how long have you worked in customer service?" },
  },
  {
    sit: "s72-cafe", seed: 1,
    answers: [
      ["order", "I'll have an espresso."],
      ["more", "That's all, thanks."],
      ["dine", "For here, please."],
    ],
    next: "pay",
    target: { key: "66dd24b15ad7", line: "say_total", npc: "mia", price: 275,
      say: "That'll be two seventy-five.", en: "That'll be $2.75." },
  },
  {
    sit: "s76-dentist-call", seed: 1, phoneCall: true,
    answers: [
      ["help", "Hi, I'd like to book a cleaning."],
      ["new_pt", "I've been there before."],
      ["name", "Tomas Mikalauskas."],
      ["spell", "M I K A L A U S K A S."],
      ["dob", "June 4th, 1990."],
      ["hold", "What times do you have?"],
    ],
    next: "hold",
    target: { key: "6f94ceb95351", line: "availability", npc: "linda",
      say: "We have Tuesday at ten or Thursday at four thirty.", en: "We have Tuesday at 10:00 or Thursday at 4:30." },
  },
];
const controls = { start: "Pradėti", send: "Siųsti", call: /^(Atsiliepti|Skambinti|Skambinti dabar)$/ };
const voiceDir = "audio-v2/";
const returning = {
  version: 1,
  profile: { name: "Tomas", surname: "Mikalauskas", gender: "m", lookId: "m1",
    look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } },
  settings: { v: 6, play: "town", quality: "low", volume: 0, sounds: 0, scenes: false, cameraFollow: true },
  sits: {}, phrases: {}, seenIntro: {}, started: 1, place: { zone: "town", x: 100, z: 76, rot: -Math.PI / 2 },
  coach: { done: true, run: true, view: true, seen: { list: true } },
};
const screens = [
  { label: "phone 390x844", viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1" },
  { label: "desktop 1280x800", viewport: { width: 1280, height: 800 } },
];

const bootMs = 240_000, inputMs = 15_000, transitionMs = 20_000;
const voiceListMs = 900_000;
const root = fileURLToPath(new URL("../../", import.meta.url));
const keyPattern = /^[a-f0-9]{12}$/;
const { audioKey } = await tsImport("../../src/audio-key.ts", import.meta.url);

// The recording batch's list (tools/enumerate.ts via tools/voice-list.ts) for the conversations played here, with
// their hints and the global lines in their people's voices: the same code the full list is made with.
const list = JSON.parse(execFileSync(process.execPath, ["--import", "tsx", "tools/voice-list.ts", "--keys",
  `--sits=${routes.map(({ sit }) => sit).join(",")}`],
  { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024, timeout: voiceListMs }));
assert.equal(list.status, "complete", "incomplete production voice list");
assert.deepEqual(list.errors, [], "production voice list handler errors");
assert.deepEqual(list.missingCasts, [], "production voice list missing casts");
assert.deepEqual(list.unresolved, [], "production voice list unresolved dependencies");
assert(list.keys.length && list.keys.every((key) => keyPattern.test(key)), "invalid production voice keys");
const allowed = new Set(list.keys);
console.log("voice-reach list", JSON.stringify({ keys: allowed.size, status: list.status, unresolved: list.unresolved.length }));

const publicDir = new URL("../../public/", import.meta.url);
const metadata = new Map(await Promise.all(["manifest.json", "repair-versions.json"].map(async (name) =>
  [name, await readFile(new URL(voiceDir + name, publicDir))])));
const localAudio = await readFile(new URL("sfx/bloop.mp3", publicDir));
const cors = { "access-control-allow-origin": "*", "cache-control": "no-store" };

async function routeRequests(context) {
  const voiceBase = new Set([new URL(voiceDir, base).href]);
  if (process.env.VITE_AUDIO_BASE) voiceBase.add(new URL(process.env.VITE_AUDIO_BASE, base).href);
  const requests = [];
  const keys = new Set();
  const named = [];
  await context.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const address = url.origin + url.pathname;
    const name = url.pathname.split("/").at(-1);
    const inVoiceDir = voiceBase.has(address.slice(0, address.length - name.length));
    if (metadata.has(name) && (inVoiceDir || url.pathname.endsWith("/" + voiceDir + name))) {
      return route.fulfill({ contentType: "application/json", body: metadata.get(name), headers: cors });
    }
    const key = /^([a-f0-9]{12})\.mp3$/.exec(name)?.[1];
    if (key && inVoiceDir) {
      requests.push({ key, address, type: request.resourceType() });
      // The v2 bytes live on the course CDN. Give the browser a checked-in MP3 to decode locally.
      await route.fulfill({ contentType: "audio/mpeg", body: localAudio, headers: cors });
      keys.add(key);
      return;
    }
    if (/\.(?:mp3|m4a|wav|ogg|opus|aac|flac)$/i.test(name)) {
      named.push(address);
      const sfx = /^[-\w]+\.mp3$/i.test(name) && url.pathname.includes("/sfx/") &&
        await readFile(new URL("sfx/" + name, publicDir)).catch(() => null);
      return route.fulfill({ contentType: "audio/mpeg", body: sfx || localAudio, headers: cors });
    }
    if (url.pathname.endsWith("/songs/index.json") ||
        (process.env.VITE_RADIO_INDEX && url.href === new URL(process.env.VITE_RADIO_INDEX, base).href)) {
      return route.fulfill({ contentType: "application/json", body: "[]", headers: cors });
    }
    if (url.origin === base.origin && ["GET", "HEAD"].includes(request.method()) && url.pathname.startsWith(base.pathname)) {
      return route.continue();
    }
    return route.fulfill({ status: 204, headers: cors });
  });
  return { voiceBase, requests, keys, named };
}

function initPage({ saveKey, progress }) {
  localStorage.setItem(saveKey, progress);
  sessionStorage.setItem("ew-play-now", "1");
  window.SpeechRecognition = undefined;
  window.webkitSpeechRecognition = undefined;
  // The browser's fallback stays local even if a manifest entry is unexpectedly missing.
  Object.defineProperty(window, "speechSynthesis", { configurable: true, value: undefined });

  // Same stepped clock as town-entry.mjs. Timers and the Node deadlines use real time.
  let now = 1000;
  performance.now = () => now;
  const frames = [];
  window.requestAnimationFrame = (callback) => { frames.push(callback); return frames.length; };
  window.cancelAnimationFrame = () => {};
  window.__step = (n, dt = 1000 / 60) => {
    for (let i = 0; i < n; i++) {
      now += dt;
      for (const callback of frames.splice(0)) callback(now);
    }
    return now;
  };
}

function installObserver() {
  const { audio, game, store } = window.__ew;
  const methods = ["recordingKey", "play", "playRecording", "playBufferRecording", "speakFallback"];
  const original = Object.fromEntries(methods.map((name) => [name, audio[name]]));
  for (const name of methods) {
    if (typeof original[name] !== "function") throw new Error(`AudioSystem.${name} is unavailable`);
  }
  const lookups = [], problems = [];
  const calls = new WeakMap();
  let callNumber = 0, pending, restoreClock;

  audio.recordingKey = function (...args) {
    const key = original.recordingKey.apply(this, args);
    const [voice, speed, say] = args;
    const { conv } = store.getState();
    lookups.push({
      index: lookups.length, source: "prefetch", sit: conv.active ? conv.sitId : null,
      run: conv.run, phase: conv.phase, step: conv.stepId, voice, speed, say, key,
      manifestReady: this.ready, present: Boolean(this.manifest[key]),
    });
    return key;
  };

  audio.play = function (...args) {
    const [voice, speed, say] = args;
    const { conv } = store.getState();
    const transcript = conv.transcript.at(-1);
    const spoken = game.activeSession?.conv.lastTurn.find(({ sentence }) => sentence === transcript?.sentence);
    const before = this.request, firstLookup = lookups.length;
    const result = original.play.apply(this, args);
    if (this.request && this.request !== before) {
      calls.set(this.request, { call: ++callNumber, firstLookup, voice, speed, say,
        transcriptId: transcript?.id, npc: spoken?.npc, line: spoken?.lineId, vars: spoken?.vars, en: spoken?.sentence.en });
    }
    return result;
  };

  // AudioSystem enters the recording branch synchronously after resolving the key for this request.
  // Prefetches can use the same tuple and key, but they never enter either playback method.
  function markPlayback(request, key, say, source) {
    const call = calls.get(request);
    if (!call) return; // Named media owns a different request, created by playFile.
    const row = lookups.at(-1);
    if (!row || row.index < call.firstLookup || row.source !== "prefetch" ||
        row.voice !== call.voice || row.speed !== call.speed || row.say !== say || row.say !== call.say ||
        (key !== null && row.key !== key)) {
      problems.push({ source, key, call, row });
      return;
    }
    Object.assign(row, { source, call: call.call, transcriptId: call.transcriptId,
      npc: call.npc, line: call.line, vars: call.vars, en: call.en });
    pending = { request, row };
  }
  for (const name of ["playRecording", "playBufferRecording"]) {
    audio[name] = function (...args) {
      markPlayback(args[0], args[1], args[2], "play");
      return original[name].apply(this, args);
    };
  }
  audio.speakFallback = function (...args) {
    if (args[3] === "manifest-miss") markPlayback(args[0], null, args[1], "miss");
    return original.speakFallback.apply(this, args);
  };

  window.__voiceReach = {
    lookups, problems,
    start(sit, seed) {
      const visit = store.getState().progress.sits[sit];
      if (visit?.visits || visit?.completions || Object.keys(visit?.memory ?? {}).length) {
        throw new Error(`${sit} needs first-visit progress`);
      }
      const now = Date.now;
      const epoch = Math.round((now() - seed) / 2 ** 32) * 2 ** 32 + seed;
      const unsubscribe = store.subscribe(({ conv }) => {
        if (conv.active && conv.sitId === sit && game.activeSession?.sit.id === sit) restoreClock();
      });
      restoreClock = () => { Date.now = now; unsubscribe(); restoreClock = undefined; };
      Date.now = () => epoch;
      game.startScenario(sit);
    },
    advance(requested) {
      if (!pending || pending.request !== audio.request) return;
      // Let the network observer see the MP3 request, or reuse an earlier warm download. The
      // original pending play has already resolved and logged its key when Continue reading runs.
      if (pending.row.present && !requested.includes(pending.row.key)) return;
      audio.continueReading();
      pending = undefined;
    },
    restore() {
      restoreClock?.();
      for (const name of methods) delete audio[name]; // These members originally lived on the prototype.
      delete window.__voiceReach;
    },
  };
}

function snapshot(requested) {
  window.__voiceReach?.advance(requested);
  window.__step(12);
  const ew = window.__ew;
  if (!ew) return { screen: "loading" };
  const { screen, conv, hud } = ew.store.getState();
  const session = ew.game.activeSession;
  return {
    screen, ready: !!(ew.game.ledges?.ready && ew.audio.ready), transitioning: !!(ew.game.transitioning || hud.fade),
    audioBase: new URL(ew.audio.base, document.baseURI).href,
    session: session?.sit.id, active: conv.active, sit: conv.sitId, run: conv.run, phase: conv.phase,
    step: conv.stepId, speaking: conv.speaking, audio: ew.audio.getState(),
    transcript: conv.transcript.map(({ id, who, npc, text, understood, via, sentence }) =>
      ({ id, who, npc, text: text ?? sentence?.en, understood, via })),
  };
}

async function runDevice(context, label, touch) {
  const network = await routeRequests(context);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error" && !/^Missing audio clip: [a-f0-9]{12}$/.test(message.text())) {
      errors.push(`console: ${message.text()}`);
    }
  });
  const input = page.locator(".convo .typebox input");
  const intro = page.locator(".scene-intro").getByRole("button", { name: controls.start, exact: true });
  const send = page.locator(".typebox").getByRole("button", { name: controls.send, exact: true });
  const press = (button, timeout) => touch ? button.tap({ timeout }) : button.press("Enter", { timeout });
  let state, lastReply, situ, firstLookup = 0, firstRequest = 0, reached = 0;

  const pump = async () => { state = await page.evaluate(snapshot, [...network.keys]); };
  async function waitFor(description, deadline, ready) {
    do {
      await pump();
      assert.deepEqual(errors, [], `${label}: page and console errors`);
      if (await ready(state)) return state;
      await delay(25);
    } while (performance.now() < deadline);
    assert.fail(`${label} ${situ ?? ""}: timed out waiting for ${description}`);
  }

  // Playwright control actionability can wait for frames, too.
  async function withFrames(action) {
    let finished = false;
    const frames = (async () => {
      while (!finished) { await pump(); await delay(25); }
    })();
    try { await Promise.race([action(), frames]); }
    finally { finished = true; await frames; }
  }

  async function evidence() {
    const trace = await page.evaluate((first) => ({
      lookups: window.__voiceReach?.lookups.slice(first) ?? [],
      problems: window.__voiceReach?.problems ?? [],
    }), firstLookup);
    return {
      ...trace,
      lookups: trace.lookups.map((row) => ({ ...row, raw: audioKey(row.voice, row.speed, row.say) })),
      requests: network.requests.slice(firstRequest),
    };
  }

  try {
    await page.addInitScript(initPage, { saveKey: `${storage}-progress-v1`, progress: JSON.stringify(returning) });
    const bootDeadline = performance.now() + bootMs;
    await page.goto(base.href, { waitUntil: "domcontentloaded", timeout: bootMs });
    await waitFor("town and real recording manifest", bootDeadline, (s) => {
      if (s.audioBase) network.voiceBase.add(s.audioBase);
      return s.screen === "play" && s.ready && !s.transitioning;
    });
    await page.evaluate(installObserver);

    for (const { sit, seed, phoneCall, answers, next, target } of routes) {
      situ = sit;
      lastReply = undefined;
      firstLookup = await page.evaluate(() => window.__voiceReach.lookups.length);
      firstRequest = network.requests.length;
      const startDeadline = performance.now() + transitionMs;
      await page.evaluate(([id, seed]) => window.__voiceReach.start(id, seed), [sit, seed]);
      await waitFor("scene start or conversation", startDeadline, async (s) => {
        if (phoneCall) {
          const call = page.locator(`.phone-ring[data-call="${sit}"], .convo [data-call="${sit}"]`).getByRole("button", { name: controls.call });
          if (await call.isVisible()) await withFrames(() => press(call, Math.max(1, startDeadline - performance.now())));
        }
        if (s.session !== sit || !s.active || !await page.locator(".convo").isVisible()) return false;
        if (await intro.isVisible()) await withFrames(() => press(intro, Math.max(1, startDeadline - performance.now())));
        return true;
      });

      const run = state.run;
      let previousId = -1;
      async function learnerTurn(step) {
        return waitFor(`learner phase at ${step}, after transcript id ${previousId}`, performance.now() + inputMs, async (s) =>
          s.sit === sit && s.run === run && s.phase === "you" && s.step === step && s.speaking === null &&
          s.transcript.at(-1)?.id > previousId && s.transcript.at(-1)?.who === "npc" &&
          await input.isVisible() && await input.isEnabled());
      }

      for (const [step, answer] of answers) {
        const before = await learnerTurn(step);
        previousId = before.transcript.at(-1).id;
        await withFrames(async () => {
          await input.fill(answer, { timeout: inputMs });
          if (touch) await send.tap({ timeout: inputMs });
          else await input.press("Enter", { timeout: inputMs });
        });
      }
      const settled = await learnerTurn(next);
      lastReply = settled;
      const typed = settled.transcript.filter(({ who }) => who === "you");
      assert.deepEqual(typed.map(({ via, understood, text }) => [via, understood, text]),
        answers.map(([, text]) => ["typed", true, text]), "all ordered answers were typed and understood");
      const finalReply = settled.transcript.filter(({ who, id }) => who === "npc" && id > typed.at(-1).id);
      const visible = await page.locator(".convo .transcript .msg.npc .il:visible").evaluateAll((lines) =>
        lines.map((line) => [...line.querySelectorAll(".u > .en")].map((unit) => unit.firstChild?.textContent).join(" ")));

      await page.evaluate(() => window.__ew.game.closeConversation());
      await waitFor("conversation closed", performance.now() + transitionMs,
        async (s) => !s.active && !s.session && !s.transitioning && !await page.locator(".convo").isVisible());

      const { lookups, requests, problems } = await evidence();
      assert.deepEqual(errors, [], `${label}: page and console errors`);
      assert.deepEqual(problems, [], "could not pair a playback request with its lookup");
      assert.deepEqual(lookups.filter(({ key }) => !allowed.has(key)), [], "resolved keys outside the production list");
      assert.deepEqual(lookups.filter(({ manifestReady, present }) => !manifestReady || !present), [], "miss in the recorded route");
      assert(requests.length > 0, "the context saw no voice MP3 requests");
      assert.deepEqual(requests.filter(({ key }) => !allowed.has(key)), [], "MP3 keys outside the production list");

      const playback = lookups.filter((row) => row.source === "play" && row.sit === sit && row.run === run && row.npc);
      assert.deepEqual(playback.map(({ transcriptId }) => transcriptId),
        settled.transcript.filter(({ who }) => who === "npc").map(({ id }) => id), "each transcript line reached playback in order");
      assert(playback.some(({ transcriptId }) => transcriptId < typed.at(-1).id), "no earlier playback");
      const played = playback.find((row) => row.key === target.key && row.line === target.line && row.npc === target.npc &&
        row.phase === "npc" && row.say === target.say && row.en === target.en &&
        finalReply.some(({ id, text }) => id === row.transcriptId && text === target.en));
      assert(played && (target.price === undefined || played.vars?.price === target.price), "target did not play in the final reply");
      assert(visible.includes(target.en), `target text not rendered in the transcript: ${JSON.stringify(visible)}`);
      reached++;
      console.log("ok", "voice-reach", label, sit, JSON.stringify({
        firstLookup, lastLookup: lookups.at(-1).index, keys: lookups.map(({ key }) => key),
        playback: playback.map(({ key }) => key), mp3: requests.map(({ key }) => key), target: played.key,
      }));
    }
    return reached;
  } catch (error) {
    const trace = await evidence().catch(() => ({}));
    throw new Error(`${label} ${situ ?? "boot"}: ${error.message}\n${JSON.stringify({
      state, lastReply, errors, ...trace, namedMedia: network.named, expected: routes.find(({ sit }) => sit === situ)?.target,
    }, null, 2)}`, { cause: error });
  } finally {
    await page.evaluate(() => window.__voiceReach?.restore()).catch(() => {});
  }
}

const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({
  channel: process.env.WORLD_BROWSER_CHANNEL || "chromium",
  headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--mute-audio"],
});
try {
  let reached = 0;
  for (const { label, ...options } of screens) {
    const context = await browser.newContext({ ...options, serviceWorkers: "block" });
    try { reached += await runDevice(context, label, !!options.hasTouch); }
    finally { await context.close(); }
  }
  assert.equal(reached, 6, "three target turns on each of the two viewports");
  console.log(`voice-reach: ${reached}/6 target turns reached`);
} finally {
  await browser.close();
}
