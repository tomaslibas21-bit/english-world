// Run against a dev server, using the same WORLD_* variables as the browser tests.
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const PORTRAIT_PHONE_FACE_PERCENT = [6, 32];
const LANDSCAPE_DESKTOP_FACE_PERCENT = [8, 38];
const DEFAULT_SIZES = "390x844,390x664,844x390,1280x800";
const VIEW_MARGIN = 4;
const OCCLUSION_FRACTION = 0.97;
const SETTLE_MS = 4000;
const SITUATION_MS = 20000;
const STARTUP_MS = 240000;
const CHECKS = ["view", "ui", "geo", "size"];
const CAVE_SPOTS = {
  // The first approach to each alux in the Puerto Colibrí cave-talk browser test.
  "x02-alux-kin": { x: 0.2, z: -1.6, rot: 0 },
  "x03-alux-nikte": { x: -6.2, z: -98.6, rot: 0 },
};
const RETURNING = {
  version: 1,
  profile: { name: "Test", gender: "m", lookId: "m1", look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } },
  settings: { v: 6, play: "town", quality: "low", volume: 0, cameraFollow: true, scenes: false },
  sits: {}, phrases: {}, seenIntro: {}, started: 1,
  place: { zone: "airport", x: -14, z: -1, rot: Math.PI }, coach: { done: true, run: true, view: true },
};
const IPHONE = {
  isMobile: true, hasTouch: true,
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
};
const USAGE = "node tools/talk-framing-audit.mjs --out DIR [--src WORKTREE] [--sizes 390x844,390x664,844x390,1280x800] [--only id1,id2] [--limit N]";

function options() {
  const { values } = parseArgs({ options: {
    out: { type: "string" }, src: { type: "string" }, sizes: { type: "string", default: DEFAULT_SIZES },
    only: { type: "string" }, limit: { type: "string" }, help: { type: "boolean", short: "h" },
  } });
  if (values.help) return null;
  if (!values.out) throw new Error(`--out is required\n${USAGE}`);
  const sizes = [...new Set(values.sizes.split(",").map((s) => s.trim()))].map((label) => {
    const match = /^([1-9]\d*)x([1-9]\d*)$/.exec(label);
    const [width, height] = match?.slice(1).map(Number) ?? [];
    if (![width, height].every(Number.isSafeInteger)) throw new Error(`Invalid viewport size ${label}`);
    return { label, width, height };
  });
  const only = values.only === undefined ? null : new Set(values.only.split(",").map((s) => s.trim()).filter(Boolean));
  const limit = values.limit === undefined ? Infinity : Number(values.limit);
  if (values.limit !== undefined && (!/^[1-9]\d*$/.test(values.limit) || !Number.isSafeInteger(limit))) {
    throw new Error("--limit must be a positive integer");
  }
  const storage = process.env.WORLD_STORAGE || "english-world";
  if (!["english-world", "puerto-colibri"].includes(storage)) throw new Error(`Invalid WORLD_STORAGE ${storage}`);
  const learner = storage === "puerto-colibri" ? process.env.WORLD_LEARNER || "en" : "lt";
  if (!["en", "lt"].includes(learner)) throw new Error(`Invalid WORLD_LEARNER ${learner}`);
  const target = process.env.WORLD_TEST_URL || "http://127.0.0.1:8176";
  const url = new URL(target);
  if (!url.pathname.endsWith("/")) url.pathname += "/";
  if (storage === "puerto-colibri") url.searchParams.set("gruta", "all");
  return {
    out: path.resolve(values.out), src: path.resolve(values.src ?? fileURLToPath(new URL("../", import.meta.url))),
    sizes, only, limit, storage, learner, target, url,
  };
}

const shortError = (error) => String(error?.message ?? error).trim().split("\n")[0];
const remaining = (deadline) => Math.max(1, deadline - Date.now());

async function before(deadline, label, run) {
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

async function ready(page) {
  await page.waitForFunction(() => {
    window.__step?.(2);
    const store = window.__ew?.store;
    return store ? store.getState().screen === "play" : document.querySelector(".stage canvas") && document.querySelector(".toolbar");
  }, null, { timeout: STARTUP_MS, polling: 50 });
  await page.evaluate(() => window.__ew?.store?.getState().setHud?.({ panel: null }));
}

async function openPage(context, config) {
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(shortError(error)));
  const save = { ...RETURNING, settings: { ...RETURNING.settings, phoneCalls: false } };
  if (config.storage === "puerto-colibri") save.cave = { lit: [], passed: ["kin", "nikte"], seen: true, told: 5 };
  await page.addInitScript(([key, value]) => {
    try {
      sessionStorage.setItem("ew-play-now", "1");
      if (!localStorage.getItem(key)) localStorage.setItem(key, value);
    } catch {}
    window.SpeechRecognition = undefined;
    window.webkitSpeechRecognition = undefined;
  }, [`${config.storage}-progress-v1`, JSON.stringify(save)]);
  try {
    await page.goto(config.url.href, { waitUntil: "domcontentloaded", timeout: STARTUP_MS });
    await ready(page);
  } catch (error) {
    throw new Error(`town startup failed: ${errors.at(-1) ?? shortError(error)}`, { cause: error });
  }
  return { page, errors };
}

async function sourceSituations(config) {
  const dir = path.join(config.src, config.storage === "puerto-colibri"
    ? "src/editions/es/content/situations" : "src/content/situations");
  const names = (await readdir(dir)).filter((file) => /^[spx]\d\d[a-z]?-.+\.ts$/.test(file)).sort();
  const learnerDir = config.storage === "puerto-colibri" && config.learner === "lt"
    ? path.join(config.src, "src/editions/es-lt/content/situations") : dir;
  const metadata = new Map();
  for (const folder of new Set([dir, learnerDir])) {
    const generated = await readFile(path.join(folder, "meta.gen.ts"), "utf8").catch((error) => {
      if (error.code !== "ENOENT") throw error;
      return "";
    });
    for (const row of generated.matchAll(/^\s*(\{"id":.*\}),\s*$/gm)) {
      const sit = JSON.parse(row[1]);
      metadata.set(sit.id, sit);
    }
  }
  return Promise.all(names.map(async (file) => {
    const id = file.slice(0, -3);
    if (metadata.has(id)) return metadata.get(id);
    // A file may have been added before the generated metadata was refreshed.
    const source = await readFile(path.join(dir, file), "utf8");
    const field = (name) => source.match(new RegExp(`^  ${name}: ["']([^"']+)["']`, "m"))?.[1];
    return { id, location: field("location"), mode: field("mode"), npc: field("npc") };
  }));
}

async function situations(page, config) {
  const runtime = await page.evaluate(() => {
    const game = window.__ew?.game;
    const route = game?.orderedSituations?.() ?? [];
    // This index is built from the entire catalog, while orderedSituations only returns the route.
    const all = new Map(route.map((sit) => [sit.id, sit]));
    if (game?.npcToSits instanceof Map) {
      for (const list of game.npcToSits.values()) for (const sit of list) all.set(sit.id, sit);
      if (all.size) return { all: [...all.values()], complete: true };
    }
    return { all: [...all.values()], complete: false };
  });
  let all = runtime.all;
  if (!runtime.complete) {
    const fromFiles = await sourceSituations(config).catch((error) => {
      if (!all.length || error.code !== "ENOENT") throw error;
      console.error(`Situation sources unavailable in ${config.src}. Using the runtime route.`);
      return [];
    });
    all = [...new Map([...fromFiles, ...all].map((sit) => [sit.id, sit])).values()];
  }
  return all
    .filter(({ id }) => /^[\w-]+$/.test(id) && (!config.only || config.only.has(id)))
    .sort((a, b) => (a.chapter ?? 0) - (b.chapter ?? 0) || (a.order ?? 0) - (b.order ?? 0) || a.id.localeCompare(b.id))
    .slice(0, config.limit);
}

function skipReason(sit) {
  if (sit.mode === "video") return "video call";
  if (sit.mode === "phone" || sit.location === "phone") return "phone call";
  if (["light", "picture"].includes(sit.mode)) return "picture-only";
  if (sit.mode === "narration") return "narration";
  if (sit.id === "x04-yaxche" && sit.npc === "yaxche") return "the speaking tree has no character head";
  return null;
}

const press = (locator, phone, deadline) => phone
  ? locator.tap({ timeout: remaining(deadline) })
  : locator.click({ timeout: remaining(deadline) });

async function startTalk(page, sit, phone, deadline) {
  const started = await before(deadline, "starting the situation", () => page.evaluate(async ({ id, npc, cave }) => {
    const { game, store, audio } = window.__ew ?? {};
    if (store && audio?.play && !Object.hasOwn(audio, "play")) {
      const play = audio.play.bind(audio);
      // Hold the opening 3D line until closeConversation releases it. This keeps the
      // shot and transcript independent of recordings, Web Speech and clip length.
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
    if (typeof game?.startScenario === "function") {
      game.startScenario(id);
      return true;
    }
    store?.getState().setHud?.({ panel: "scenarios" });
    return false;
  }, { id: sit.id, npc: sit.npc, cave: CAVE_SPOTS[sit.id] ?? null }));

  if (!started) {
    if (!await page.locator(".sheet.scenarios").count()) {
      const menu = page.locator('.toolbar .ride-menu[aria-expanded="false"]');
      if (await menu.isVisible()) await press(menu, phone, deadline);
      const list = page.locator('.toolbar-tools button[title="Visos situacijos"], .toolbar-tools button[title="All situations"]');
      if (await list.first().isVisible()) await press(list.first(), phone, deadline);
    }
    await press(page.locator(`.scn-card[data-sit="${sit.id}"]`).first(), phone, deadline);
  }

  await page.waitForFunction((id) => {
    window.__step?.(1);
    const conv = window.__ew?.store?.getState().conv;
    return conv ? conv.active && conv.sitId === id && !!document.querySelector(".convo") : !!document.querySelector(".convo");
  }, sit.id, { timeout: remaining(deadline), polling: 40 });
  const intro = page.locator(".scene-intro, .intro-card");
  const start = intro.getByRole("button", { name: /^(Pradėti|Pradėti dabar|Start|Start now|Comenzar|Empezar)$/i });
  const button = await start.count() ? start.first() : intro.locator("button.btn").first();
  if (await button.isVisible()) {
    try {
      await press(button, phone, Math.min(deadline, Date.now() + 2500));
    } catch (error) {
      // On the bases the intro can dismiss itself while the button is being pressed.
      if (await button.isVisible()) throw error;
    }
  }
  await page.waitForFunction(() => {
    window.__step?.(1);
    const { game, store } = window.__ew ?? {};
    const conv = store?.getState().conv;
    if (document.querySelector(".scene-intro, .intro-card") || conv?.introOpen) return false;
    if (game?.rig?.mode !== undefined && game.rig.mode !== "talk" && game.talkNpc) return false;
    return !conv || conv.speaking != null || conv.phase !== "npc" || !!conv.transcript?.length;
  }, null, { timeout: remaining(deadline), polling: 40 });
}

async function closeTalk(page, deadline) {
  const closed = await page.evaluate(() => {
    const { game, store } = window.__ew ?? {};
    if (!store?.getState().conv.active) return !document.querySelector(".convo");
    if (typeof game?.closeConversation !== "function") return false;
    game.closeConversation();
    return true;
  });
  if (!closed) {
    const button = page.locator(".convo").getByRole("button", { name: /^(Baigti pokalbį|End conversation|Hang up)$/i }).first();
    if (await button.isVisible()) await button.click({ timeout: remaining(deadline) });
  }
  await page.waitForFunction(() => {
    window.__step?.(1);
    const { game, store } = window.__ew ?? {};
    return !store?.getState().conv.active && !document.querySelector(".convo")
      && game?.rig?.mode !== "talk" && !game?.transitioning && !game?.conversationLoads && !game?.sceneDelays?.size;
  }, null, { timeout: remaining(deadline), polling: 40 });
}

async function measureTalk({ margin, fraction, settleMs, band }) {
  const { game, store } = window.__ew ?? {};
  const state = () => store?.getState().conv;
  const cam = game?.rig?.cam;
  const canvas = game?.renderer?.domElement ?? document.querySelector(".stage canvas");
  const na = (reason) => ({ status: "n/a", reason });
  const result = (pass, reason) => ({ status: pass ? "PASS" : "FAIL", reason });
  const unavailable = (reason, speaker = null) => ({
    speaker, face: null, checks: { view: na(reason), ui: na(reason), geo: na(reason), size: na(reason) },
  });
  const skip = (conv) => {
    if (conv?.mode === "video") return "video call";
    if (conv?.mode === "phone") return "phone call";
    if (["light", "picture"].includes(conv?.mode)) return "picture-only";
    if (conv?.mode === "narration") return "narration";
    if (game?.talkTree) return "the speaking tree has no character head";
    return null;
  };
  const skipped = skip(state());
  if (skipped) return { skipped };
  if (!cam?.position?.clone) return unavailable("talk camera hook unavailable", state()?.npcId ?? null);

  // Ten consecutive changes in camera position. Check the whole window against its first frame.
  let trackedSpeaker, trackedLook;
  const samples = [];
  const still = () => {
    const speaker = state()?.npcId;
    const look = game.rig.talk?.look;
    if (speaker !== trackedSpeaker || look !== trackedLook) samples.length = 0;
    trackedSpeaker = speaker;
    trackedLook = look;
    samples.push(cam.position.clone());
    if (samples.length > 11) samples.shift();
    return samples.length === 11 && samples.every((p) => p.distanceToSquared(samples[0]) < 0.001 ** 2);
  };
  let settled;
  if (typeof window.__step === "function") {
    const deadline = Date.now() + settleMs;
    settled = still();
    for (let i = 0; !settled && i < Math.floor(settleMs * 60 / 1000) && Date.now() < deadline; i++) {
      window.__step(1);
      settled = still();
    }
  } else {
    settled = await new Promise((resolve) => {
      let frame;
      const timer = setTimeout(() => { cancelAnimationFrame(frame); resolve(false); }, settleMs);
      const tick = () => {
        if (still()) {
          clearTimeout(timer);
          resolve(true);
        } else frame = requestAnimationFrame(tick);
      };
      tick();
    });
  }

  const conv = state();
  if (conv && !conv.active) throw new Error("conversation closed before measurement");
  const actor = game.npcs?.find((n) => n.id === conv?.npcId) ?? game.talkNpc;
  if (!actor && game.talkNpc === null && game.rig.mode !== undefined && game.rig.mode !== "talk") {
    throw new Error("conversation opened without a 3D talk view");
  }
  const speaker = actor?.tag?.querySelector("b")?.textContent.trim() || actor?.name || actor?.id || conv?.npcId || null;
  const ch = actor?.ch;
  const root = ch?.root;
  const headOf = (character) => character?.head ?? character?.bones?.[2] ?? character?.root?.getObjectByName?.("head");
  const head = headOf(ch);
  if (!root || !head?.matrixWorld) return unavailable("speaker head node or bone unavailable", speaker);
  // Character.head is the joint of a single baked SkinnedMesh. Only vertices bound
  // primarily to this joint or its children belong to the head. The mane is body-bound.
  const within = (object, ancestor) => {
    if (!ancestor) return false;
    for (let node = object; node; node = node.parent) if (node === ancestor) return true;
    return false;
  };
  for (let node = root; node; node = node.parent) {
    if (node.visible) continue;
    const row = unavailable("speaker mesh is hidden", speaker);
    row.checks.view = { ...result(false, "speaker mesh is hidden"), settled };
    return row;
  }
  const rootWorld = game.scene ?? root;
  rootWorld.updateMatrixWorld(true);
  cam.updateMatrixWorld(true);
  const local = head.matrixWorld.clone().invert();
  const point = cam.position.clone();
  const localMin = point.clone().set(Infinity, Infinity, Infinity);
  const localMax = point.clone().set(-Infinity, -Infinity, -Infinity);
  const worldMin = localMin.clone();
  const worldMax = localMax.clone();
  const crown = point.clone();
  const chin = point.clone();
  const vertices = [];
  root.traverseVisible((mesh) => {
    if (!mesh.isMesh || typeof mesh.getVertexPosition !== "function" || !mesh.geometry?.attributes.position) return;
    const { position, skinIndex } = mesh.geometry.attributes;
    const bones = mesh.skeleton?.bones;
    const headBones = bones?.map((bone) => within(bone, head));
    if (mesh.isSkinnedMesh ? !skinIndex || !headBones?.some(Boolean) : !within(mesh, head)) return;
    for (let i = 0; i < position.count; i++) {
      if (mesh.isSkinnedMesh && !headBones[skinIndex.getX(i)]) continue;
      mesh.getVertexPosition(i, point).applyMatrix4(mesh.matrixWorld);
      if (point.y > worldMax.y) crown.copy(point);
      if (point.y < worldMin.y) chin.copy(point);
      worldMin.min(point);
      worldMax.max(point);
      vertices.push(point.clone());
      point.applyMatrix4(local);
      localMin.min(point);
      localMax.max(point);
    }
  });
  if (!vertices.length || !(worldMax.y > worldMin.y)) return unavailable("posed head geometry unavailable", speaker);
  if (!canvas) return unavailable("renderer canvas unavailable", speaker);
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return unavailable("renderer canvas has no screen area", speaker);

  // The crown and chin are the extremes of the world box. Use the visible profile
  // of its middle for the cheeks and the model's +Z front for the interior landmarks.
  const span = localMax.clone().sub(localMin);
  const middle = localMin.clone().lerp(localMax, 0.5);
  const front = (x, y) => {
    const depth = Math.sqrt(Math.max(0, 1 - (2 * x) ** 2 - (2 * y - 1) ** 2));
    return point.set(middle.x + x * span.x, localMin.y + y * span.y, middle.z + depth * span.z / 2)
      .clone().applyMatrix4(head.matrixWorld);
  };
  const cheeks = [front(-0.5, 0.42), front(0.5, 0.42)];
  let left = Infinity, right = -Infinity;
  for (const vertex of vertices) {
    const height = (point.copy(vertex).applyMatrix4(local).y - localMin.y) / span.y;
    if (height < 0.32 || height > 0.52) continue;
    const x = point.copy(vertex).project(cam).x;
    if (x < left) { left = x; cheeks[0] = vertex; }
    if (x > right) { right = x; cheeks[1] = vertex; }
  }
  const points = [
    ["centre", front(0, 0.5)],
    ["top of head", crown],
    ["chin", chin],
    ["left cheek", cheeks[0]],
    ["right cheek", cheeks[1]],
    ["left eye", front(-0.23, 0.57)],
    ["right eye", front(0.23, 0.57)],
    ["forehead", front(0, 0.76)],
    ["mouth", front(0, 0.31)],
  ].map(([name, world]) => {
    const ndc = point.copy(world).project(cam);
    return { name, world, z: ndc.z, x: rect.left + (ndc.x + 1) * rect.width / 2, y: rect.top + (1 - ndc.y) * rect.height / 2 };
  });
  const [width, height] = [innerWidth, innerHeight];
  const projectable = (p) => Number.isFinite(p.x) && Number.isFinite(p.y) && p.z >= -1 && p.z <= 1;
  const sides = [];
  if (points.some((p) => !projectable(p))) sides.push("outside camera depth");
  const cuts = points.filter(projectable);
  if (cuts.some((p) => p.y < margin)) sides.push("cut at top");
  if (cuts.some((p) => p.y > height - margin)) sides.push("cut at bottom");
  if (cuts.some((p) => p.x < margin)) sides.push("cut at left");
  if (cuts.some((p) => p.x > width - margin)) sides.push("cut at right");
  const view = { ...result(!sides.length, sides.join(", ") || "all nine points inside the viewport margin"), settled };

  const round = (n) => Math.round(n * 10) / 10;
  let face = null;
  let size = na("top or chin is outside camera depth");
  if (points.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))) {
    const x = points.map((p) => p.x), y = points.map((p) => p.y);
    face = { x: round(Math.min(...x)), y: round(Math.min(...y)), w: round(Math.max(...x) - Math.min(...x)), h: round(Math.max(...y) - Math.min(...y)) };
  }
  if (projectable(points[1]) && projectable(points[2])) {
    const pixels = Math.abs(points[1].y - points[2].y);
    const percent = pixels / height * 100;
    const passes = percent >= band[0] && percent <= band[1];
    size = {
      ...result(passes, `${round(percent)}% of viewport height${passes ? "" : ` (expected ${band[0]}–${band[1]}%)`}`),
      pixels: round(pixels), percent: round(percent),
    };
  }

  const colorPaints = (color) => color && color !== "transparent" && color !== "none"
    && !/^(?:rgba\([^)]*,\s*0(?:\.0+)?\s*\)|[^/]+\/\s*0(?:\.0+)?%?\s*\))$/.test(color);
  const contains = (r, x, y) => r.left <= x && x < r.right && r.top <= y && y < r.bottom;
  const painted = (el, { x, y }) => {
    const s = getComputedStyle(el);
    if (s.visibility !== "visible") return false;
    for (let p = el; p; p = p.parentElement) {
      const style = getComputedStyle(p);
      if (+style.opacity === 0 || /opacity\(0(?:%|\.0+)?\)/.test(style.filter)) return false;
    }
    if (colorPaints(s.backgroundColor) || s.backgroundImage !== "none") return true;
    if (el instanceof HTMLImageElement && el.complete && el.naturalWidth > 0) return true;
    if (el.matches("canvas, video, svg image")) return true;
    if (el instanceof SVGGeometryElement && (
      (colorPaints(s.fill) && +s.fillOpacity > 0) || (colorPaints(s.stroke) && +s.strokeOpacity > 0)
    )) return true;
    const r = el.getBoundingClientRect();
    const borderDistances = { Top: y - r.top, Right: r.right - x, Bottom: r.bottom - y, Left: x - r.left };
    for (const [side, distance] of Object.entries(borderDistances)) {
      if (distance >= 0 && distance < parseFloat(s[`border${side}Width`]) && colorPaints(s[`border${side}Color`])
          && !["none", "hidden"].includes(s[`border${side}Style`])) return true;
    }
    if (!colorPaints(s.color)) return false;
    for (const child of el.childNodes) {
      if (child.nodeType !== Node.TEXT_NODE) continue;
      for (const match of child.textContent.matchAll(/\S+/g)) {
        const range = document.createRange();
        range.setStart(child, match.index);
        range.setEnd(child, match.index + match[0].length);
        if (Array.from(range.getClientRects()).some((r) => contains(r, x, y))) return true;
      }
    }
    return false;
  };
  const elementName = (el) => {
    if (el.matches(".convo")) return "panel (.convo)";
    if (el instanceof SVGElement) el = el.closest("button, [role='img'], .ui-icon") ?? el;
    const label = el.getAttribute("data-testid") || el.getAttribute("aria-label");
    if (label) return label;
    const kind = el.classList[0] ? `.${el.classList[0]}` : el.getAttribute("role") || el.tagName.toLowerCase();
    return el.closest(".convo") ? `panel (${kind})` : kind;
  };
  let ui = na("no projected face points over the viewport canvas");
  // HUD labels and toasts may be painted with pointer-events:none. Include them in
  // the hit test for this synchronous probe, then restore ordinary event handling.
  const hitStyle = document.createElement("style");
  hitStyle.textContent = "* { pointer-events: auto !important; }";
  document.head.append(hitStyle);
  try {
    for (const p of points.filter(projectable)) {
      if (p.x < 0 || p.x >= width || p.y < 0 || p.y >= height) continue;
      const stack = document.elementsFromPoint(p.x, p.y);
      const canvasIndex = stack.indexOf(canvas);
      if (canvasIndex < 0) continue;
      const cover = stack.slice(0, canvasIndex).find((el) => !el.contains(canvas) && painted(el, p));
      if (cover) {
        ui = result(false, `${elementName(cover)} covers ${p.name}`);
        break;
      }
      ui = result(true, "no painted UI at the on-screen face points");
    }
  } finally {
    hitStyle.remove();
  }

  let geo = na("scene or raycaster hook unavailable");
  if (game.scene?.traverseVisible && game.raycaster?.intersectObjects) {
    const candidates = [];
    const ray = new game.raycaster.constructor();
    ray.camera = cam;
    ray.layers.mask = cam.layers.mask;
    const materialPaints = (material) => material && material.visible && material.opacity > 0;
    game.scene.traverseVisible((mesh) => {
      if (mesh.isMesh && ray.layers.test(mesh.layers) && !within(mesh, root)
          && (Array.isArray(mesh.material) ? mesh.material.some(materialPaints) : materialPaints(mesh.material))) candidates.push(mesh);
    });
    const blockerName = ({ object, face: triangle }) => {
      if (within(object, game.player?.root)) {
        const head = headOf(game.player);
        const bones = object.skeleton?.bones, indices = object.geometry?.attributes.skinIndex;
        if (head && (within(object, head) || (triangle && bones && indices
            && [triangle.a, triangle.b, triangle.c].some((i) => within(bones[indices.getX(i)], head))))) return "learner head";
        return "learner mesh";
      }
      for (let node = object; node && node !== game.scene; node = node.parent) {
        const name = node.name || [node.userData?.name, node.userData?.label, node.userData?.id, node.userData?.kind]
          .find((info) => typeof info === "string" && info.length);
        if (name) return name;
      }
      const npc = game.npcs?.find((n) => within(object, n.ch.root));
      return npc?.tag?.querySelector("b")?.textContent.trim() || npc?.id
        || `${object.geometry?.type ?? object.type} mesh #${candidates.indexOf(object) + 1}`;
    };
    const origin = cam.getWorldPosition(cam.position.clone());
    const direction = origin.clone();
    geo = result(true, "all nine rays clear");
    for (const p of points) {
      const distance = direction.subVectors(p.world, origin).length();
      if (!distance) continue;
      ray.set(origin, direction.divideScalar(distance));
      ray.far = distance * fraction;
      const hit = ray.intersectObjects(candidates, false).find((hit) => hit.distance < ray.far
        && materialPaints(Array.isArray(hit.object.material) ? hit.object.material[hit.face?.materialIndex] : hit.object.material));
      if (hit) {
        geo = result(false, `${blockerName(hit)} blocks ${p.name}`);
        break;
      }
    }
  }
  return { face, speaker, checks: { view, ui, geo, size } };
}

async function auditSituation(page, sit, size, out) {
  const deadline = Date.now() + SITUATION_MS;
  const measureBy = deadline - 2500;
  const phone = size.width < 768;
  const band = phone && size.height > size.width ? PORTRAIT_PHONE_FACE_PERCENT : LANDSCAPE_DESKTOP_FACE_PERCENT;
  const frame = `frames/${size.label}/${sit.id}.jpg`;
  const errors = [];
  let measurement;
  try {
    await before(measureBy, "opening the talk view", () => startTalk(page, sit, phone, measureBy));
    measurement = await before(measureBy, "measuring the talk view", () => page.evaluate(measureTalk, {
      margin: VIEW_MARGIN, fraction: OCCLUSION_FRACTION, settleMs: SETTLE_MS, band,
    }));
    if (measurement.skipped) return { skipped: measurement.skipped };
  } catch (error) {
    errors.push(`error: ${shortError(error)}`);
    measurement = {
      face: null, speaker: null,
      checks: Object.fromEntries(CHECKS.map((name) => [name, { status: "n/a", reason: "measurement did not complete" }])),
    };
  }

  let savedFrame = null;
  try {
    await before(deadline, "capturing the JPEG", () => page.screenshot({
      path: path.join(out, frame), type: "jpeg", quality: 60, scale: "css", timeout: remaining(deadline),
    }));
    savedFrame = frame;
  } catch (error) {
    errors.push(`error: screenshot: ${shortError(error)}`);
  }
  const { checks, face, speaker } = measurement;
  const checksFailed = CHECKS.some((name) => checks[name].status === "FAIL");
  const reasons = [...new Set([
    ...errors,
    ...CHECKS.filter((name) => checks[name].status === "FAIL").map((name) => checks[name].reason),
    ...CHECKS.filter((name) => checks[name].status === "n/a").map((name) => `${name} n/a: ${checks[name].reason}`),
  ])];
  return {
    id: sit.id, title: sit.title?.lt ?? sit.title?.en ?? sit.id, size: size.label,
    pass: !errors.length && !checksFailed, checks, reasons, face, speaker, frame: savedFrame,
  };
}

function failures(row) {
  return [...new Set([
    ...row.reasons.filter((reason) => reason.startsWith("error: ")),
    ...Object.values(row.checks).filter((check) => check.status === "FAIL").map((check) => check.reason),
  ])];
}

function markdown(report, all) {
  const { target, storage, learner, sizes, rows, skipped } = report;
  const md = (value) => String(value).replaceAll("\\", "\\\\").replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
  const grid = new Map(rows.map((row) => [`${row.id}/${row.size}`, row]));
  const headers = ["Situation", ...sizes];
  const table = [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...all.filter((sit) => !skipped.some(({ id }) => id === sit.id)).map((sit) => {
      const cells = sizes.map((size) => {
        const row = grid.get(`${sit.id}/${size}`);
        return row.pass ? "PASS" : `FAIL: ${failures(row).join(", ")}`;
      });
      const title = sit.title?.lt ?? sit.title?.en ?? sit.id;
      return `| ${[`\`${sit.id}\` ${title}`, ...cells].map(md).join(" | ")} |`;
    }),
  ];
  const summary = sizes.map((size) => {
    const atSize = rows.filter((row) => row.size === size);
    const pass = atSize.filter((row) => row.pass).length;
    const counts = CHECKS.map((name) => {
      const statuses = atSize.map((row) => row.checks[name].status);
      const count = (status) => statuses.filter((s) => s === status).length;
      return `${name} ${count("PASS")} PASS / ${count("FAIL")} FAIL / ${count("n/a")} n/a`;
    });
    return `- **${size}** · ${pass} PASS / ${atSize.length - pass} FAIL · ${counts.join(" · ")}`;
  });
  const unsettled = rows.filter((row) => row.checks.view.settled === false).length;
  return [
    "# Talk framing audit", "", `${md(target)} · ${storage} · learner ${learner}`, "",
    `${rows.length} frames measured or attempted · ${skipped.length} situations skipped`, "",
    ...summary,
    ...(unsettled ? ["", `${unsettled} rows were measured at the 4 s camera settle limit.`] : []),
    "", ...table, "", "## Skipped", "",
    ...(skipped.length ? skipped.map(({ id, why }) => `- \`${id}\` · ${md(why)}`) : ["None."]), "",
  ].join("\n");
}

async function main() {
  const config = options();
  if (!config) { console.log(USAGE); return; }
  const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
  const browser = await chromium.launch({
    channel: process.env.WORLD_BROWSER_CHANNEL || "chromium",
    headless: true,
    args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--mute-audio"],
  });
  const report = {
    target: config.target, storage: config.storage, learner: config.learner,
    sizes: config.sizes.map(({ label }) => label), rows: [], skipped: [],
  };
  const skipped = new Set();
  const recordSkip = (id, why) => {
    if (skipped.has(id)) return;
    skipped.add(id);
    report.skipped.push({ id, why });
    console.log(`SKIP ${id} · ${why}`);
  };
  let all;
  try {
    for (const size of config.sizes) {
      const context = await browser.newContext({
        ...(size.width < 768 ? IPHONE : {}), viewport: { width: size.width, height: size.height },
        deviceScaleFactor: 1, serviceWorkers: "block",
      });
      try {
        await context.route("**/*", (route) => {
          const url = new URL(route.request().url());
          if (url.pathname.endsWith(".mp3")) return route.fulfill({ status: 404, body: "" });
          if (url.origin !== config.url.origin) return route.abort();
          return route.continue();
        });
        let { page, errors } = await openPage(context, config);
        if (!all) {
          all = await situations(page, config);
          if (!all.length) throw new Error("No situations found for this target and selection");
          for (const sit of all) {
            const why = skipReason(sit);
            if (why) recordSkip(sit.id, why);
          }
        }
        await mkdir(path.join(config.out, "frames", size.label), { recursive: true });
        const batch = all.filter((sit) => !skipped.has(sit.id));
        for (const [index, sit] of batch.entries()) {
          errors.length = 0;
          const row = await auditSituation(page, sit, size, config.out);
          if (row.skipped) recordSkip(sit.id, row.skipped);
          else {
            if (errors.length && row.reasons.some((reason) => reason.startsWith("error: "))) {
              row.reasons.push(`error: page: ${errors[0]}`);
            }
            report.rows.push(row);
            const status = row.pass ? "PASS" : `FAIL: ${failures(row).join(", ")}`;
            const unavailable = CHECKS.filter((name) => row.checks[name].status === "n/a");
            console.log(`[${size.label} ${index + 1}/${batch.length}] ${sit.id} ${status}${unavailable.length ? ` · n/a ${unavailable.join(", ")}` : ""}`);
          }
          if (index === batch.length - 1) continue;
          const closeBy = Date.now() + 2000;
          try {
            await before(closeBy, "closing the conversation", () => closeTalk(page, closeBy));
          } catch {
            // Close the page if a delayed start or a stuck transition can leak into the next row.
            await page.close().catch(() => {});
            ({ page, errors } = await openPage(context, config));
          }
        }
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
  await Promise.all([
    writeFile(path.join(config.out, "results.json"), JSON.stringify(report, null, 2) + "\n"),
    writeFile(path.join(config.out, "AUDIT.md"), markdown(report, all)),
  ]);
}

main().catch((error) => {
  console.error(`Talk framing audit: ${shortError(error)}`);
  process.exitCode = 1;
});
