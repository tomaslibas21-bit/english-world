#!/usr/bin/env node
import assert from "node:assert/strict";

const CAVE_SPOTS = {
  // The first walk-up approaches in tests/browser/cave-talk.mjs.
  "x02-alux-kin": { x: 0.2, z: -1.6, rot: 0 },
  "x03-alux-nikte": { x: -6.2, z: -98.6, rot: 0 },
};
const RETURNING = {
  version: 1,
  profile: { name: "Test", gender: "m", lookId: "m1", look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } },
  settings: { v: 6, play: "town", quality: "low", volume: 0, cameraFollow: true, scenes: false, phoneCalls: false },
  sits: {}, phrases: {}, seenIntro: {}, started: 1,
  place: { zone: "airport", x: -14, z: -1, rot: Math.PI }, coach: { done: true, run: true, view: true },
};
const IPHONE = {
  isMobile: true, hasTouch: true,
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
};
export const INTRO_START = /^(Pradėti|Pradėti dabar|Start|Start now|Comenzar|Empezar)$/i;
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export const shortError = (error) => String(error?.message ?? error).trim().split("\n")[0];
export const remaining = (deadline) => Math.max(1, deadline - Date.now());

export function worldConfig() {
  const storage = process.env.WORLD_STORAGE || "english-world";
  if (!["english-world", "puerto-colibri"].includes(storage)) throw new Error(`Invalid WORLD_STORAGE ${storage}`);
  const pc = storage === "puerto-colibri";
  const learner = process.env.WORLD_LEARNER || (pc ? "en" : "lt");
  if (!(pc ? ["en", "lt"] : ["lt"]).includes(learner)) throw new Error(`Invalid WORLD_LEARNER ${learner} for ${storage}`);
  const target = process.env.WORLD_TEST_URL || "http://127.0.0.1:8176";
  const url = new URL(target);
  if (!["http:", "https:"].includes(url.protocol)
      || !/^(localhost|127\.\d+\.\d+\.\d+|\[::1\])$/.test(url.hostname) || url.username || url.password) {
    throw new Error("WORLD_TEST_URL must be a loopback HTTP(S) URL");
  }
  if (!url.pathname.endsWith("/")) url.pathname += "/";
  if (pc) url.searchParams.set("gruta", "all");
  return { storage, learner, target, url, edition: pc ? "es" : "en", language: pc ? "es" : "en" };
}

export async function before(deadline, label, run) {
  if (Date.now() >= deadline) throw new Error(`timed out ${label}`);
  let timer;
  try {
    return await Promise.race([
      run(),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`timed out ${label}`)), remaining(deadline)); }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export async function launchBrowser(timeout) {
  const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
  return chromium.launch({
    channel: process.env.WORLD_BROWSER_CHANNEL || "chromium",
    headless: true,
    args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--mute-audio"],
    timeout,
  });
}

export async function openContext(browser, { width, height }, touch, url) {
  const context = await browser.newContext({
    ...(touch ? IPHONE : {}), viewport: { width, height }, deviceScaleFactor: 1, serviceWorkers: "block",
  });
  await context.route("**/*", (route) => {
    const requested = new URL(route.request().url());
    if (/\.mp3$/i.test(requested.pathname)) {
      return route.fulfill({ status: 404, body: "", headers: { "access-control-allow-origin": "*" } });
    }
    if (requested.origin !== url.origin) return route.abort();
    return route.continue();
  });
  return context;
}

export function watchPageErrors(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.stack ?? error.message}`));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    const url = message.location().url;
    if (/\.mp3(?:[?#]|$)/i.test(url) && /Failed to load resource.*\b404\b/.test(text)) return;
    errors.push(`console error: ${text}${url ? ` (${url})` : ""}`);
  });
  return errors;
}

export async function seedFramingPage(page, storage, { quietTexts = false } = {}) {
  const save = { ...RETURNING, settings: { ...RETURNING.settings, ...(quietTexts ? { textMessages: false } : {}) } };
  if (storage === "puerto-colibri") save.cave = { lit: [], passed: ["kin", "nikte"], seen: true, told: 5 };
  await page.addInitScript(([key, value]) => {
    sessionStorage.setItem("ew-play-now", "1");
    localStorage.setItem(key, value);
    window.SpeechRecognition = undefined;
    window.webkitSpeechRecognition = undefined;
    Object.defineProperty(window, "speechSynthesis", { configurable: true, value: undefined });
  }, [`${storage}-progress-v1`, JSON.stringify(save)]);
}

export async function readyTown(page, config, deadline) {
  await page.goto(config.url.href, { waitUntil: "domcontentloaded", timeout: remaining(deadline) });
  const { lang, title } = await page.evaluate(() => ({ lang: document.documentElement.lang, title: document.title }));
  assert.equal(lang, config.learner, "served learner layer");
  assert.equal(title, config.edition === "es" ? "Puerto Colibrí" : "English World · Maple Harbor", "served edition");
  await page.waitForFunction(() => {
    window.__step?.(3);
    const { game, store } = window.__ew ?? {};
    const state = store?.getState();
    return state?.screen === "play" && !!game?.renderer?.domElement && !game.transitioning && !state.hud.flight;
  }, null, { timeout: remaining(deadline), polling: 35 });
  const targetLanguages = await page.evaluate(async () => {
    const { game, store, audio } = window.__ew;
    store.getState().setHud({ panel: null });
    // Await the existing manifest for Vale's recorded-only opening. MP3s stay local.
    await audio.init();
    return [...new Set(game.npcs.map(({ tag }) => tag.querySelector("b + span[lang]")?.lang).filter(Boolean))];
  });
  assert.deepEqual(targetLanguages, [config.language], "live town target language");
  return { edition: config.edition, lang, title, targetLanguages };
}

export function readCatalogue() {
  const game = window.__ew?.game;
  const route = game?.orderedSituations?.() ?? [];
  const all = new Map(route.map((sit) => [sit.id, sit]));
  const indexed = game?.npcToSits instanceof Map && game.npcToSits.size > 0;
  if (indexed) {
    for (const list of game.npcToSits.values()) for (const sit of list) all.set(sit.id, sit);
  }
  return { all: [...all.values()], indexed };
}

export async function beginTalk(page, { id, npc }, touch, deadline) {
  const cave = CAVE_SPOTS[id] ?? null;
  const route = await before(deadline, "starting the situation", () => page.evaluate(async ({ id, npc, cave }) => {
    const { game, store, audio } = window.__ew ?? {};
    if (store && audio?.play && !Object.hasOwn(audio, "play")) {
      const play = audio.play.bind(audio);
      // Hold the real NPC line until the session closes, as in the MH audit.
      audio.play = (...args) => {
        const { conv } = store.getState();
        if (!conv.active || conv.speaking == null) return play(...args);
        if (!game.npcs.some((actor) => actor.id === conv.npcId) && game.talkNpc?.id !== conv.npcId) {
          return Promise.resolve(true);
        }
        return new Promise((resolve) => {
          const held = { run: conv.run, line: conv.speaking };
          window.__talkFramingHold = held;
          const off = store.subscribe(({ conv: current }) => {
            if (current.active && current.run === conv.run) return;
            off();
            if (window.__talkFramingHold === held) delete window.__talkFramingHold;
            resolve(false);
          });
        });
      };
    }
    if (cave) {
      if (!game?.enterZone || !game.talkTo) throw new Error("grotto entry or talk hook unavailable");
      game.keys.clear();
      game.setJoystick(0, 0);
      await game.enterZone("gruta", cave, true);
      if (game.zone?.id !== "gruta" || !game.npcs.some((actor) => actor.id === npc)) {
        throw new Error(`${npc} did not spawn in the grotto`);
      }
      return "cave";
    }
    if (typeof game?.startScenario === "function") {
      // The ordinary picker calls this same entry point, including for Paco.
      game.startScenario(id);
      return "scenario";
    }
    store?.getState().setHud?.({ panel: "scenarios" });
    return "picker";
  }, { id, npc, cave }));
  if (route === "cave") {
    const prompt = await page.waitForFunction(({ npc, touch }) => {
      window.__step?.(2);
      const { game, store } = window.__ew;
      if (store.getState().hud.prompt?.kind !== "talk" || game.nearest?.id !== npc) return false;
      if (!touch) return { ready: true };
      const button = document.querySelector(".act-btn");
      if (!button) return false;
      const r = button.getBoundingClientRect();
      const x = r.left + r.width / 2, y = r.top + r.height / 2;
      return button.contains(document.elementFromPoint(x, y)) && { x, y };
    }, { npc, touch }, { timeout: remaining(deadline), polling: 35 });
    try {
      const { x, y } = await prompt.jsonValue();
      await before(deadline, "using the grotto talk prompt", () => touch ? page.touchscreen.tap(x, y) : page.keyboard.press("e"));
    } finally {
      await prompt.dispose();
    }
  } else if (route === "picker") {
    const press = (locator) => touch ? locator.tap({ timeout: remaining(deadline) }) : locator.click({ timeout: remaining(deadline) });
    await press(page.locator(`.scn-card[data-sit="${id}"]`).first());
  }
  return route;
}

// Keep these reads in one browser call so the input point, live actor and line
// all come from the currently mounted conversation.
function openingState({ startName, host }) {
  window.__step?.(4);
  const { game, store } = window.__ew;
  const { conv, progress } = store.getState();
  const panel = document.querySelector(".convo");
  const intro = document.querySelector(".scene-intro, .intro-card");
  const label = new RegExp(startName, "i");
  const button = [...(intro?.querySelectorAll("button") ?? [])].find((el) =>
    label.test((el.getAttribute("aria-label") ?? el.textContent).trim()));
  const visible = (el) => {
    if (!el || getComputedStyle(el).visibility !== "visible") return false;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height || r.right <= 0 || r.left >= innerWidth || r.bottom <= 0 || r.top >= innerHeight) return false;
    for (let node = el; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (+style.opacity === 0 || /opacity\(0(?:%|\.0+)?\)/.test(style.filter)) return false;
    }
    return true;
  };
  const animating = (el) => el?.getAnimations().some((animation) =>
    (animation.pending || animation.playState === "running") && Number.isFinite(animation.effect?.getComputedTiming().endTime));
  const panelAnimating = animating(panel);
  let click = null;
  const startVisible = visible(button);
  if (startVisible && !panelAnimating && !animating(intro) && !button.disabled && button.getAttribute("aria-disabled") !== "true") {
    const r = button.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    if (button.contains(document.elementFromPoint(x, y))) click = { x, y };
  }
  const rect = visible(panel) && !panelAnimating ? panel.getBoundingClientRect() : null;
  const panelStyle = rect ? getComputedStyle(panel) : null;
  const line = conv.transcript.find((entry) => entry.id === conv.speaking && entry.who === "npc");
  const actor = game.talkCast?.find((member) => member.id === conv.npcId);
  const date = host === "sam" || host === "emma";
  const profile = progress.profile;
  const expectedHost = date ? profile?.datePartner ?? (profile?.gender === "f" ? "sam" : "emma") : host;
  // (the speaking mark is on the line's part of the bubble: .bubble-part.speaking; older builds marked the .msg)
  const bubble = panel?.querySelector(".transcript .msg.npc .bubble-part.speaking, .transcript .msg.npc.speaking .bubble");
  const hold = window.__talkFramingHold;
  return {
    active: conv.active, sitId: conv.sitId, run: conv.run, host: conv.hostId, speaker: conv.npcId, expectedHost,
    line: line?.id ?? null, lineKey: conv.lineKey, lineSpeaker: line?.npc ?? null, speaking: conv.speaking, phase: conv.phase,
    introOpen: conv.introOpen || !!intro, startVisible, click,
    mode: game.rig?.mode, zone: game.zone?.id, actor: game.talkNpc?.id ?? null,
    cast: game.talkCast?.map((member) => member.id) ?? [],
    liveSpeaker: !!actor?.ch?.root && game.npcs.includes(actor),
    liveHost: !!game.talkNpc && game.npcs.includes(game.talkNpc),
    held: hold?.run === conv.run && hold.line === line?.id,
    box: rect && [rect.x, rect.y, rect.width, rect.height],
    panelPainted: !!panelStyle && (panelStyle.backgroundImage !== "none"
      || !["transparent", "rgba(0, 0, 0, 0)"].includes(panelStyle.backgroundColor)),
    fontsReady: document.fonts.status === "loaded",
    openingText: visible(bubble) && !!bubble.textContent.trim(),
    picture: !!document.querySelector(".scene-backdrop"),
  };
}

export async function waitForOpening(page, sit, touch, deadline) {
  let previousBox;
  let sawStart = false;
  let pressedStart = false;
  let state;
  const fail = (message) => {
    throw Object.assign(new Error(message), { opening: state ? { ...state, pressedStart } : null });
  };
  while (Date.now() < deadline) {
    state = await before(deadline, "reading the opening state", () => page.evaluate(openingState, {
      startName: INTRO_START.source, host: sit.npc,
    })).catch((error) => fail(shortError(error)));
    if (state.active && state.sitId !== sit.id) fail(`expected ${sit.id}, opened ${state.sitId}`);
    if (state.introOpen && state.active) {
      sawStart ||= state.startVisible;
      if (state.click && !pressedStart) {
        const { x, y } = state.click;
        await before(deadline, "pressing the intro Start", () => touch ? page.touchscreen.tap(x, y) : page.mouse.click(x, y));
        pressedStart = true;
      }
    } else if (state.active) {
      if (sawStart && !pressedStart) fail("intro closed before its visible Start control was pressed");
      if (state.mode !== "talk") fail(`conversation opened without a 3D talk view (rig ${state.mode}, zone ${state.zone})`);
      if (state.host !== state.expectedHost || state.actor !== state.expectedHost || !state.liveHost) {
        fail(`expected live host ${state.expectedHost}, saw host ${state.host} and actor ${state.actor}`);
      }
      if ((sit.id === "p18-startup" || sit.id === "x05-tienda") && state.zone !== sit.location) {
        fail(`expected live room ${sit.location}, saw ${state.zone}`);
      }
      if (state.picture) fail("picture covers the 3D view");
      if (state.speaking != null || state.phase !== "npc") {
        if (state.speaking == null || state.line !== state.speaking || state.speaker !== state.lineSpeaker) {
          fail("no held NPC transcript line");
        }
        if (!state.liveSpeaker) fail(`speaker ${state.speaker} is absent from the live talk cast`);
        if (sit.id === "p18-startup" && state.speaker !== state.expectedHost) fail(`expected ${state.expectedHost} to speak in ${state.zone}`);
        if (state.held && state.panelPainted && state.fontsReady && state.openingText) {
          if (previousBox && state.box.every((value, i) => value === previousBox[i])) return { ...state, pressedStart };
          previousBox = state.box;
        } else previousBox = undefined;
      }
    } else if (state.sitId === sit.id) {
      fail("conversation closed before a live line could be measured");
    }
    await pause(25);
  }
  fail("timed out waiting for the live opening line and painted panel");
}

export function checkHeldOpening(opening, measurement) {
  if (measurement.kind !== "measured") return;
  assert.deepEqual(
    [measurement.sitId, measurement.run, measurement.speakerId, measurement.line, measurement.shot.hostId, measurement.shot.mode],
    [opening.sitId, opening.run, opening.speaker, opening.line, opening.expectedHost, "talk"],
    "same run, NPC line and live talk view at measurement",
  );
}

export function requestCloseTalk() {
  const { game, store } = window.__ew ?? {};
  if (!store?.getState().conv.active && !game?.activeSession?.active) return !document.querySelector(".convo");
  if (typeof game?.closeConversation !== "function") return false;
  game.closeConversation();
  return true;
}

export function talkIsClosed(frames) {
  if (frames) window.__step?.(frames);
  const { game, store } = window.__ew ?? {};
  return !store?.getState().conv.active && !game?.activeSession?.active
    && !document.querySelector(".convo, .scene-intro, .intro-card") && game?.rig?.mode !== "talk"
    && !game?.transitioning && !game?.caveLoading && !game?.conversationLoads && !game?.sceneDelays?.size;
}

export async function finishTalk(page, deadline) {
  await before(deadline, "closing the conversation", () => page.evaluate(requestCloseTalk));
  let idle = false;
  while (Date.now() < deadline) {
    const closed = await before(deadline, "draining the conversation", () => page.evaluate(talkIsClosed, 4));
    if (closed && idle) return;
    if (!closed) await before(deadline, "closing a pending start", () => page.evaluate(requestCloseTalk));
    idle = closed;
    await pause(20);
  }
  throw new Error("timed out returning to the town");
}
