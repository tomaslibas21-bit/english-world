// Test and audit setup for the existing town and conversation entry points.
const CAVE_SPOTS = {
  // First approaches from the Puerto Colibrí cave-talk browser test.
  "x02-alux-kin": { x: 0.2, z: -1.6, rot: 0 },
  "x03-alux-nikte": { x: -6.2, z: -98.6, rot: 0 },
  // Maple Harbor's Slate Cove Cave: the same first approaches (tests/browser/mh-cave-talk.mjs).
  "x06-bram": { x: 0.2, z: -1.6, rot: 0 },
  "x07-fern": { x: -6.2, z: -98.6, rot: 0 },
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
export const shortError = (error) => String(error?.message ?? error).trim().split("\n")[0];
export const remaining = (deadline) => Math.max(1, deadline - Date.now());

export function worldConfig() {
  const storage = process.env.WORLD_STORAGE || "english-world";
  if (!["english-world", "puerto-colibri"].includes(storage)) throw new Error(`Invalid WORLD_STORAGE ${storage}`);
  const learner = storage === "puerto-colibri" ? process.env.WORLD_LEARNER || "en" : "lt";
  if (!["en", "lt"].includes(learner)) throw new Error(`Invalid WORLD_LEARNER ${learner}`);
  const target = process.env.WORLD_TEST_URL || "http://127.0.0.1:8176";
  const url = new URL(target);
  if (!url.pathname.endsWith("/")) url.pathname += "/";
  if (storage === "puerto-colibri") url.searchParams.set("gruta", "all");
  return { storage, learner, target, url };
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
    if (requested.pathname.endsWith(".mp3")) {
      return route.fulfill({ status: 404, body: "", headers: { "access-control-allow-origin": "*" } });
    }
    if (requested.origin !== url.origin) return route.abort();
    return route.continue();
  });
  return context;
}

export async function seedFramingPage(page, storage, { quietTexts = false } = {}) {
  const save = { ...RETURNING, settings: { ...RETURNING.settings, ...(quietTexts ? { textMessages: false } : {}) } };
  if (storage === "puerto-colibri") save.cave = { lit: [], passed: ["kin", "nikte"], seen: true, told: 5 };
  await page.addInitScript(([key, value]) => {
    try {
      sessionStorage.setItem("ew-play-now", "1");
      if (!localStorage.getItem(key)) localStorage.setItem(key, value);
    } catch {}
    window.SpeechRecognition = undefined;
    window.webkitSpeechRecognition = undefined;
    Object.defineProperty(window, "speechSynthesis", { configurable: true, value: undefined });
  }, [`${storage}-progress-v1`, JSON.stringify(save)]);
}

export function readCatalogue() {
  const game = window.__ew?.game;
  const route = game?.orderedSituations?.() ?? [];
  // This index includes bonus chats and calls outside the route.
  const all = new Map(route.map((sit) => [sit.id, sit]));
  if (game?.npcToSits instanceof Map) {
    for (const list of game.npcToSits.values()) for (const sit of list) all.set(sit.id, sit);
    if (all.size) return { all: [...all.values()], complete: true };
  }
  return { all: [...all.values()], complete: false };
}

export function beginTalk(page, { id, npc }, allowPicker = false) {
  return page.evaluate(async ({ id, npc, cave, allowPicker }) => {
    const { game, store, audio } = window.__ew ?? {};
    if (store && audio?.play && !Object.hasOwn(audio, "play")) {
      const play = audio.play.bind(audio);
      // Hold the opening 3D line until the conversation closes. Leave the
      // session, transcript and camera's speaking and lean logic intact.
      audio.play = (...args) => {
        const { conv } = store.getState();
        if (!conv.active || conv.speaking == null) return play(...args);
        if (Array.isArray(game?.npcs) && !game.npcs.some((actor) => actor.id === conv.npcId)
            && game.talkNpc?.id !== conv.npcId) return Promise.resolve(true);
        return new Promise((resolve) => {
          const off = store.subscribe(({ conv: current }) => {
            if (current.active && current.run === conv.run) return;
            off();
            resolve(false);
          });
        });
      };
    }
    if (cave && game?.enterZone && game?.talkTo) {
      game.keys?.clear();
      game.setJoystick?.(0, 0);
      await game.enterZone("gruta", cave, true);
      if (!game.npcs?.some((actor) => actor.id === npc)) throw new Error(`${npc} did not spawn in the grotto`);
      game.talkTo(npc, id);
      return true;
    }
    if (cave) throw new Error("grotto entry or talk hook unavailable");
    if (typeof game?.startScenario === "function") {
      game.startScenario(id);
      return true;
    }
    if (!allowPicker) throw new Error("startScenario hook unavailable");
    store?.getState().setHud?.({ panel: "scenarios" });
    return false;
  }, { id, npc, cave: CAVE_SPOTS[id] ?? null, allowPicker });
}

export function requestCloseTalk() {
  const { game, store } = window.__ew ?? {};
  if (!store?.getState().conv.active) return !document.querySelector(".convo");
  if (typeof game?.closeConversation !== "function") return false;
  game.closeConversation();
  return true;
}

export function talkIsClosed(frames) {
  window.__step?.(frames);
  const { game, store } = window.__ew ?? {};
  return !store?.getState().conv.active && !document.querySelector(".convo, .scene-intro, .intro-card")
    && game?.rig?.mode !== "talk" && !game?.transitioning && !game?.caveLoading
    && !game?.conversationLoads && !game?.sceneDelays?.size;
}
