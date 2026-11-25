// The surf lesson in the real game (src/game/surf/), on a computer and two phone sizes: the prompt at the boards, the
// level's choice, a whole lesson played as the conversation it is: she says a line and waits; the learner answers
// aloud (a stand-in for the browser's speech recognition hears the test's words), by a key or by a tap, or makes the
// move she asked for, which is named with its arrow under her line and played on the keyboard or touch pad. The wrong board first; a second lesson by a learner who stands up too early and answers her questions; the
// score card, back on the sand with the score and the cards kept; the lesson started by the conversation's own event;
// the way out at any moment; and, where the edition has them, the picture of what each command asks for (beside her
// words, clear of the board, kept when the line is heard often, still with reduced motion). Time is stepped by hand, so
// a lesson takes seconds. Playwright's own Chromium only (never the owner's Chrome). Against a dev server or a built game
// of Maple Harbor; WORLD_SHOTS=<folder> keeps pictures of its moments:
// WORLD_TEST_URL=http://127.0.0.1:5188 WORLD_STORAGE=english-world WORLD_PLAYWRIGHT_MODULE=/path/to/playwright-core/index.mjs node tests/browser/surf.mjs
import assert from "node:assert/strict";
import { installSpeechRecognition } from "./speech-recognition.mjs";
import { HARBOR_START, checkSurfTownView, readSurfIntro, readSurfPlayer, sampleSurfRender, waitForSurfLesson, waitForSurfPad } from "./fixtures/surf-town.mjs";
const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const base = process.env.WORLD_TEST_URL || "http://127.0.0.1:5188";
const storage = process.env.WORLD_STORAGE || "english-world";
const shots = process.env.WORLD_SHOTS || "";
// Spoken independently of the rendered answer text (the authored English in round 01).
const SPOKEN = {
  a_perfect: "Sounds good!", a_understood: "Got it.", b_sup: "The paddleboard.", b_long: "The long foam board.",
  a_ready: "Ready!", a_this: "This one?", a_this2: "How about this one?", a_now: "Now?",
  a_fine: "I'm fine.", a_early: "I stood too early.",
};
const check = (name, value, detail) => {
  assert(value, `${name}: ${JSON.stringify(detail)}`);
  console.log("ok", name, detail === undefined ? "" : JSON.stringify(detail));
};
const progress = {
  version: 1,
  profile: { name: "Test", surname: "Tester", gender: "f", lookId: "f1", look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } },
  settings: { v: 5, play: "town", quality: "low", scenes: false, lt: true, volume: 0, cameraFollow: true },
  sits: {}, phrases: {}, seenIntro: {}, started: 1, place: { zone: "town", x: 28, z: -14.6, rot: Math.PI },
  coach: { done: true, run: true },
};
// (the game's clock in the test's hands: every frame is a call of __step)
const INIT = `(() => {
  try { sessionStorage.setItem("ew-play-now", "1"); } catch {}
  let seed = 20261115;
  Math.random = function () { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  let now = 1000;
  performance.now = () => now;
  const q = [];
  window.requestAnimationFrame = (cb) => { q.push(cb); return q.length; };
  window.cancelAnimationFrame = () => {};
  window.__step = (n, dt = 1000 / 60) => { for (let i = 0; i < n; i++) { now += dt; const cbs = q.splice(0); for (const cb of cbs) cb(now); } return now; };
})();`;

const browser = await chromium.launch({ channel: process.env.WORLD_BROWSER_CHANNEL || "chromium", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
try {
  for (const [label, width, height] of [["computer", 1280, 800], ["phone", 390, 844], ["short-phone", 390, 664]]) {
    const phone = label !== "computer";
    const ctx = await browser.newContext({
      viewport: { width, height }, ...(phone ? { deviceScaleFactor: 2, isMobile: true, hasTouch: true } : {}),
    });
    const page = await ctx.newPage();
    const errors = [];
    const assetFailures = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => { if (m.type() === "error" && /WebGLProgram: Shader Error/.test(m.text())) errors.push(m.text()); });
    const surfAsset = (url) => /\/(?:x04-surf(?:-game)?|x01-surf-game)\//.test(url);
    page.on("response", (r) => { if (r.status() >= 400 && surfAsset(r.url())) assetFailures.push(`${r.status()} ${r.url()}`); });
    page.on("requestfailed", (r) => { if (surfAsset(r.url())) assetFailures.push(`${r.failure()?.errorText} ${r.url()}`); });
    await page.addInitScript(() => {
      window.__surfBrokenImages = [];
      document.addEventListener("error", ({ target }) => {
        if (target instanceof HTMLImageElement && target.closest(".surf")) window.__surfBrokenImages.push(target.src);
      }, true);
    });
    await page.route(/\.mp3(?:\?|$)/, (route) => route.fulfill({ status: 204, body: "" }));
    await page.addInitScript(([k, v]) => { if (sessionStorage.getItem("seeded") !== "1") { sessionStorage.setItem("seeded", "1"); localStorage.clear(); localStorage.setItem(k, v); } }, [`${storage}-progress-v1`, JSON.stringify(progress)]);
    await page.addInitScript(INIT);
    await page.addInitScript(installSpeechRecognition);
    await page.goto(base, { waitUntil: "domcontentloaded" });
    const t0 = Date.now();
    for (;;) {
      const st = await page.evaluate(() => { window.__step?.(2); return window.__ew?.store?.getState().screen ?? "loading"; }).catch(() => "navigating");
      if (st === "play") break;
      assert(Date.now() - t0 < 180000, "the game did not start: " + st);
      await new Promise((r) => setTimeout(r, 300));
    }
    const step = (n) => page.evaluate((k) => window.__step(k), n);
    const real = (ms) => new Promise((r) => setTimeout(r, ms));
    const frameTick = async () => { await real(50); await step(3); };
    const listening = () => page.evaluate(() => window.__listening());
    const speechEvents = () => page.evaluate(() => window.__speechEvents);
    const waitForMic = async () => {
      for (let i = 0; i < 100; i++) {
        const id = await listening();
        if (id) return id;
        await frameTick();
      }
      assert.fail(`microphone did not open: ${JSON.stringify(await speechEvents())}`);
    };
    const fade = async () => { await real(600); await step(20); };
    const untilLesson = (level) => waitForSurfLesson(page, level, label);
    await page.evaluate(() => { window.__ew.coach?.finish?.(); window.__ew.store.getState().setHud({ panel: null }); });
    assert.equal(await page.evaluate(() => document.documentElement.lang), "lt");
    const school = await page.evaluate(() => {
      const s = window.__ew.game.surf;
      return s && [s.situation, s.content.npc, s.npc?.name];
    });
    assert.deepEqual(school, ["x04-surf", "maren", "Maren Pike"], `${label}: this town has Harbor Surf`);
    const playerNow = () => readSurfPlayer(page);
    const cameraDistance = (a, b) => Math.hypot(...a.camera.map((v, i) => v - b.camera[i]));
    await page.evaluate(() => {
      const { audio, game } = window.__ew;
      window.__surfSoundEvents = [];
      for (const method of ["surfStroke", "surfWaveRush", "surfWaveBreak", "surfStand", "surfWipeout"]) {
        const playSound = audio[method].bind(audio);
        audio[method] = (...args) => {
          window.__surfSoundEvents.push({ method, hand: args[0], phase: game.surf.logic?.phase });
          return playSound(...args);
        };
      }
    });
    const sounds = () => page.evaluate(() => window.__surfSoundEvents);
    const L = () => page.evaluate(() => {
      const g = window.__ew.game, { surf, player } = g, l = surf.logic;
      if (!l) return null;
      const scene = surf.scene, coach = scene?.coach;
      return {
        phase: l.phase, pose: l.pose, d: +l.d.toFixed(1), saying: l.saying, choice: l.choice?.id ?? null,
        options: l.choice?.options ?? null, todo: l.todo ? { do: l.todo.do, left: l.todo.left ?? null, cue: l.todo.cue } : null,
        cmd: l.cmd?.c.act ?? null, score: l.score, level: l.level, reason: l.reason, heard: l.heard,
        upOpen: l.upOpen, talking: l.talking, backpack: player.backpackVisible, outfit: g.outfit ?? null, stroke: player.surf?.stroke,
        rideT: l.rideT, pitch: player.root.rotation.x, demo: scene?.demoState,
        coachStance: coach?.surf?.stance, coachZ: coach?.root.position.z, time: performance.now(),
      };
    });
    const ui = () => page.evaluate(() => { const u = window.__ew.surf.getState(); return { mic: u.mic.status, heard: u.mic.heard, micOn: u.micOn, said: u.said?.cue ?? null, todo: u.todo, choice: u.choice?.options.map((o) => ({ cue: o.cue, es: o.s.en })) ?? null }; });
    const rideFrame = (isCoach) => page.evaluate((isCoach) => {
      const g = window.__ew.game, scene = g.surf.scene, camera = g.rig.cam;
      const rider = isCoach ? scene.coach : g.player;
      const { position, rotation } = rider.root;
      const feet = position.clone().project(camera), head = position.clone(), left = position.clone();
      head.y += rider.height;
      left.x += 1; // Shore-facing input moves the learner along world +X.
      const inView = ({ x, y, z }) => Math.abs(x) < 1 && Math.abs(y) < 1 && Math.abs(z) < 1;
      const active = scene.waves.filter(({ mesh }) => mesh.visible);
      return {
        side: camera.position.x - position.x, height: camera.position.y, pitch: rotation.x,
        left: (left.project(camera).x - feet.x) * innerWidth / 2,
        center: [feet.x, feet.y],
        inView: inView(feet) && inView(head.project(camera)),
        waveHeight: Math.max(...active.map(({ u }) => u.uH.value)),
        singlePass: active.length > 0 && active.every(({ mesh }) => mesh.material.forceSinglePass && mesh.geometry.groups.length === 0),
      };
    }, isCoach);
    const shot = async (name, scale = "device", frames = 2) => { if (shots) { if (frames) await step(frames); await real(250); await page.screenshot({ path: `${shots}/${label}-${name}.png`, scale }); } };
    const shown = new Set();
    let checkedHandoff = false;
    const hud = () => page.evaluate(() => window.__ew.store.getState().hud);
    const press = async (dir, fallback) => {
      if (phone) { await page.locator(`.surf-pad [data-dir=${dir}]`).tap(); return; }
      const key = fallback ?? ("Arrow" + dir[0].toUpperCase() + dir.slice(1));
      await page.keyboard.down(key);
      await step(4);
      await page.keyboard.up(key);
    };
    /** The move she asks for, as it is shown under her line: its words, its keys, where it is. */
    const moveNow = () => page.evaluate(() => {
      const m = document.querySelector(".surf-move"), card = document.querySelector(".surf-card");
      if (!m || !card) return null;
      const r = m.getBoundingClientRect(), c = card.getBoundingClientRect(), g = window.__ew.game;
      const p = g.player.root.position.clone().project(g.rig.cam), y = ((1 - p.y) / 2) * innerHeight, x = ((p.x + 1) / 2) * innerWidth;
      const pad = document.querySelector(".surf-pad");
      const replay = card.querySelector(".surf-again");
      const button = replay.getBoundingClientRect();
      const intersects = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      const text = [...card.querySelectorAll(".surf-words .il .u, .surf-words .nat")];
      const replayFits = button.width >= 44 && button.height >= 44 && button.top >= 0 && button.left >= 0
        && button.right <= innerWidth && button.bottom <= innerHeight && button.left >= c.left && button.right <= c.right
        && button.top >= c.top && button.bottom <= c.bottom && replay.querySelector('svg[width="19"]')
        && !intersects(button, r) && text.every((part) => !intersects(button, part.getBoundingClientRect()));
      const asked = [...document.querySelectorAll(".surf-pad .ask")].map((el) => el.textContent);
      const board = g.surf.scene?.boards.get(g.surf.logic?.board);
      let boardTop = y, boardBottom = y;
      if (pad && board?.visible) {
        const points = board.geometry.attributes.position;
        for (let i = 0; i < points.count; i++) {
          p.fromBufferAttribute(points, i).applyMatrix4(board.matrixWorld).project(g.rig.cam);
          const boardY = (1 - p.y) * innerHeight / 2;
          boardTop = Math.min(boardTop, boardY);
          boardBottom = Math.max(boardBottom, boardY);
        }
      }
      const padGap = pad ? pad.getBoundingClientRect().top - boardBottom : null;
      return { asked, replayFits: !!replayFits, padGap, boardClear: boardTop - r.bottom, still: !!pad?.classList.contains("still"), text: m.querySelector(".surf-move-text").innerText.replace(/\s+/g, " ").trim(), keys: [...m.querySelectorAll(".surf-key")].map((k) => k.innerText), button: m.tagName === "BUTTON", gap: r.top - c.bottom, w: r.width, h: r.height, font: parseFloat(getComputedStyle(m.querySelector(".surf-move-text")).fontSize), inView: r.left >= 0 && r.right <= innerWidth + 0.5 && r.top >= 0 && r.bottom <= innerHeight, over: x > r.left && x < r.right && y > r.top && y < r.bottom, clear: y - r.bottom, dots: m.querySelectorAll(".surf-strokes i").length, done: m.querySelectorAll(".surf-strokes i.done").length, time: !!m.querySelector(".surf-time") };
    });
    const moves = new Map();
    const checkAnswersFit = async (name, choice) => {
      const layout = await page.locator(".surf-choices").evaluate((el) => {
        const answers = el.getBoundingClientRect();
        const card = document.querySelector(".surf-card"), controls = document.querySelector(".surf-pad");
        const cue = card.getBoundingClientRect(), pad = controls.getBoundingClientRect();
        const visible = (r) => r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight;
        const apart = (a, b) => a.right < b.left || b.right < a.left || a.bottom < b.top || b.bottom < a.top;
        const minKey = Math.min(...Array.from(document.querySelectorAll(".surf-pad button"), (el) => {
          const { width, height } = el.getBoundingClientRect();
          return Math.min(width, height);
        }));
        const overflow = Math.max(...[el, card, controls].map((node) => Math.max(node.scrollHeight - node.clientHeight, node.scrollWidth - node.clientWidth)));
        return { inView: [answers, cue, pad].every(visible), clear: apart(answers, cue) && apart(answers, pad) && apart(cue, pad),
          cueGap: answers.top - cue.bottom, padGap: pad.top - answers.bottom, overflow, minKey };
      });
      const portrait = name === label;
      check(`${name}: the ${choice} turn fits between the cue and touch controls`, layout.inView && layout.clear && layout.overflow <= 1
        && (!portrait || (layout.cueGap >= 0 && layout.padGap > 0)) && layout.minKey >= (name === "phone" ? 60 : 52), layout);
    };

    // ---- at the school's boards: the prompt, the level's choice, and "not now"
    const start = await page.evaluate(() => { const g = window.__ew.game, s = g.surf.spot.start; g.enterZone("town", { x: s.x, z: s.z, rot: s.rot }, true); return s; });
    assert.deepEqual(start, HARBOR_START);
    await step(30);
    const townPlayer = await playerNow();
    check(`${label}: the board prompt starts from dry town ground`, townPlayer.y >= -0.01 && !townPlayer.swimming && townPlayer.backpack && townPlayer.mode === "follow", townPlayer);
    const townPrompt = (await hud()).prompt;
    check(`${label}: the prompt at the boards is the lesson's`, townPrompt?.kind === "surf", townPrompt);
    if (phone) check(`${label}: the town has its action and jump buttons`, await page.locator(".act-btn:visible, .jump-btn:visible").count() === 2);
    if (phone) await page.locator(".act-btn").tap(); else await page.keyboard.press("e");
    await page.locator(".surf-pick .surf-level").first().waitFor();
    await step(5);
    check(`${label}: the level's choice comes up`, await page.locator(".surf-pick .surf-level").count() === 2);
    await page.locator(".surf-later").click();
    await step(5);
    check(`${label}: "not now" closes it`, await page.locator(".surf-pick").count() === 0 && !(await L()));
    if (phone) await page.locator(".act-btn").tap(); else await page.keyboard.press("e");
    await step(5);
    await page.locator(".surf-level").first().click();
    await untilLesson("beginner");
    let s = await L();
    check(`${label}: a beginner's lesson is on, on the sand`, s?.level === "beginner" && s.phase === "intro" && (await hud()).ride === "surf", s);
    check(`${label}: in surf clothes from the start of the lesson, on the sand too, and no backpack`, s?.backpack === false && s?.outfit === "surf", { backpack: s?.backpack, outfit: s?.outfit });
    const sand = await playerNow();
    const isSurfPlayer = (p) => p?.actor === sand.actor && p.visible && p.backpack === false && p.outfit === "surf"
      && p.rash && p.swim === "trunks" && p.mode === "stage" && p.stage;
    check(`${label}: the dry lesson uses the surf actor and stage camera`, isSurfPlayer(sand) && sand.actor !== townPlayer.actor
      && !sand.swimming && sand.y >= -0.01 && cameraDistance(sand, townPlayer) > 1, { town: townPlayer, sand });
    if (phone) {
      check(`${label}: the lesson replaces the joystick and round buttons with four arrows`,
        await page.locator(".surf-pad button:visible").count() === 4 && await page.locator(".joy:visible, .act-btn:visible, .jump-btn:visible").count() === 0);
      const left = page.locator(".surf-pad [data-dir=left]"), right = page.locator(".surf-pad [data-dir=right]");
      const finger = (id) => ({ pointerType: "touch", pointerId: id, button: 0, buttons: 1 });
      await left.dispatchEvent("pointerdown", finger(31));
      await right.dispatchEvent("pointerdown", finger(32));
      const both = await waitForSurfPad(page, ["left", "right"]);
      check(`${label}: both thumbs can hold an arrow`, both.ready, both);
      await left.dispatchEvent("pointerout", finger(31));
      const one = await waitForSurfPad(page, ["right"]);
      check(`${label}: sliding off releases only that thumb`, one.ready, one);
      await right.dispatchEvent("pointercancel", finger(32));
      const none = await waitForSurfPad(page, []);
      check(`${label}: cancelling releases the other arrow`, none.ready && none.asked === 0, none);
    }
    await sampleSurfRender(page, "dry lesson start");
    const menu = page.getByRole("button", { name: "Meniu" });
    check(`${label}: the town's tools are tucked into Meniu beside the surf score`,
      await page.locator(".surf-toolbar .icon-btn:visible").count() === 1 && await menu.isVisible()
      && await page.locator(".minimap").count() === 0 && await page.locator(".surf-score").isVisible());
    await menu.click();
    await page.locator(".surf-toolbar .light-mode-btn").waitFor();
    await menu.click();
    await page.locator(".surf-toolbar .light-mode-btn").waitFor({ state: "hidden" });
    if (!phone) {
      await page.keyboard.press("m");
      assert.equal((await ui()).micOn, false, "M switches the lesson mic off");
      await page.keyboard.press("m");
      assert.equal((await ui()).micOn, true, "M switches the lesson mic back on");
    }
    const npcHidden = await page.evaluate(() => window.__ew.game.npcs.find((n) => n.id === window.__ew.game.surf.content.npc)?.ch.root.visible === false);
    check(`${label}: the instructor is in the water with the learner, not at her counter too`, npcHidden);

    // ---- a lesson, played by the keys or the phone's buttons. `how`: "good" does what she says (the wrong board
    // first); "early" stands up before the call once
    // the optional pictures of what her commands ask for
    const hasPics = await page.evaluate(() => !!window.__ew.game.surf.content.pictures);
    const seenPics = new Map();
    /** The card's picture now: its name, whether it has loaded, and how far the card's lower edge is above the
     *  learner's board on the screen (px; null without a picture). */
    const picNow = () => page.evaluate(() => {
      const g = window.__ew.game, img = document.querySelector(".surf-pic img.new"), card = document.querySelector(".surf-card");
      if (!img || !card) return null;
      const p = g.player.root.position.clone().project(g.rig.cam), y = ((1 - p.y) / 2) * innerHeight, x = ((p.x + 1) / 2) * innerWidth;
      const r = card.getBoundingClientRect(), f = document.querySelector(".surf-pic").getBoundingClientRect();
      const cue = window.__ew.game.surf.logic?.saying;
      return { name: img.getAttribute("src").split("/").pop().replace(".webp", ""), loaded: img.complete && img.naturalWidth > 0, clear: Math.round(y - r.bottom), over: x > r.left && x < r.right && y > r.top && y < r.bottom, w: Math.round(f.width), h: Math.round(f.height), inView: r.left >= 0 && r.right <= innerWidth + 0.5 && r.top >= 0, cue, phase: g.surf.logic?.phase };
    });
    /** The Lithuanian move labels from round 01 and their primary arrows. */
    const MOVES = { paddle: ["Irkluokite", ["↑"]], duck: ["Nerkite po banga", ["↓"]], turn: ["Apsukite lentą", ["←", "→"]], up: ["Stokitės", ["↑"]], left: ["Pasvirkite kairėn", ["←"]], right: ["Pasvirkite dešinėn", ["→"]], down: ["Sulenkite kelius", ["↓"]], fwd: ["Svorį perkelkite pirmyn", ["↑"]], jump: ["Šokite", ["↑"]], steady: ["Išlaikykite pusiausvyrą", []] };
    const DIR = { paddle: "up", duck: "down", turn: "right", up: "up", left: "left", right: "right", down: "down", fwd: "up", jump: "up" };
    const play = async (how, level) => {
      let wrongBoard = how === "good", early = how === "early", frames = 0, strokeT = 0, upT = 0, askT = 0, moveT = 0, lastCue = "", spoken = 0, keyed = 0, tapped = 0, prev = "";
      const said = [], mine = [];
      const looks = {};
      const waterPack = {}, demo = { start: null, end: null, z0: null, z1: null, waits: true, stance: 0 };
      let learnerFrame = null, coachFrame = null;
      for (; frames < 60 * 400; frames++) {
        s = await L();
        if (!s) break;
        const pose = s.phase === "over" ? "score" : s.pose;
        if (!looks[pose]) looks[pose] = await playerNow();
        if (s.pose !== "walk" && s.phase !== "over") waterPack[s.pose] = (waterPack[s.pose] ?? true) && s.backpack === false;
        if (["paddle", "ride", "shore"].includes(s.demo)) {
          demo.start ??= s.time;
          demo.waits &&= !s.saying && !s.choice && !s.todo && s.score.waves === 0 && s.score.asked === 0;
          if (s.demo === "ride") {
            demo.z0 ??= s.coachZ;
            demo.z1 = s.coachZ;
            demo.stance = Math.max(demo.stance, s.coachStance);
            if (!coachFrame && s.coachStance > 0.96) {
              coachFrame = await rideFrame(true);
              if (shots && !shown.has("coach-ride")) { shown.add("coach-ride"); await shot("coach-ride", "css"); }
              if (how === "good") await sampleSurfRender(page, "coach ride side view");
            }
          }
        } else if (s.demo === "done" && demo.start !== null) demo.end ??= s.time;
        if (shots && !shown.has("paddling") && s.phase === "out" && s.pose === "prone" && s.stroke > 0.25) {
          shown.add("paddling"); await shot("paddling", "css");
        }
        if (!learnerFrame && s.pose === "stand" && s.rideT > 0.85 && s.pitch > 0.15) {
          learnerFrame = await rideFrame(false);
          if (shots && !shown.has("standing-wave")) { shown.add("standing-wave"); await shot("standing-wave", "css"); }
        }
        if (shots && s.saying === "wipeout" && !shown.has("wipeout")) {
          shown.add("wipeout"); await shot("wipeout", "css");
        }
        if (s.saying && said.at(-1) !== s.saying) said.push(s.saying);
        if (s.saying === "prev_mine" || s.saying === "prev_yours") prev = s.saying;
        if (hasPics && s.saying && frames % 3 === 0) { const pn = await picNow(); if (pn?.cue === s.saying) { const o = seenPics.get(pn.cue) ?? { ...pn, clear: Infinity }; seenPics.set(pn.cue, { ...pn, clear: Math.min(o.clear, pn.clear), over: o.over || pn.over, inView: o.inView !== false && pn.inView }); } }
        if (s.phase === "over") break;
        // ---- the learner's turn to speak: aloud (the first ones), then by a key or a tap
        if (s.choice && ++askT > 12) {
          askT = 0;
          const u = await ui();
          if (!u.choice) { await step(2); continue; }
          const pick = s.choice === "board" ? (wrongBoard ? "b_sup" : level === "beginner" ? "b_long" : "b_short")
            : s.choice === "turn" ? (prev === "prev_mine" ? "a_go" : "a_yours")
            : s.choice === "why" ? "a_" + s.reason
            : s.choice === "again" ? (s.score.waves >= 1 ? "a_enough" : "a_again")
            : s.options[0];
          if (s.choice === "board") wrongBoard = false;
          const i = s.options.indexOf(pick), es = u.choice[i].es;
          if (!shown.has("turn:" + s.choice)) {
            shown.add("turn:" + s.choice);
            await real(350);
            if (phone) {
              await checkAnswersFit(label, s.choice);
              if (label === "short-phone" && s.choice === "board") {
                for (const [w, h] of [[844, 390], [664, 390], [1280, 800]]) {
                  await page.setViewportSize({ width: w, height: h });
                  await checkAnswersFit(`${w}×${h} touch`, s.choice);
                }
                await page.setViewportSize({ width, height });
                await checkAnswersFit(label, s.choice);
              }
            }
            await shot("turn-" + s.choice);
          }
          const aloud = how === "good" ? spoken < 5 || s.choice === "wave" || s.choice === "now" : s.choice === "why" || s.choice === "ok";
          if (aloud) {
            let recogniser = await waitForMic();
            const turn = await page.evaluateHandle(() => window.__ew.game.surf.logic.choice);
            if (!checkedHandoff) {
              checkedHandoff = true;
              check(`${label}: the instructor finishes before the microphone starts`, (await ui()).mic === "listening" &&
                await page.evaluate(() => window.__ew.voice() === "idle"), await ui());

              // A panel pauses the microphone. Close it on the next frame while native abort is still settling.
              await page.evaluate(() => {
                const st = window.__ew.store.getState();
                st.setHud({ panel: "settings" }); window.__step(1);
                st.setHud({ panel: null }); window.__step(1);
              });
              check(`${label}: the panel releases the original microphone`, (await speechEvents()).some((e) => e.id === recogniser && e.event === "abort"));
              const old = recogniser;
              recogniser = await waitForMic();
              const events = await speechEvents();
              const ended = events.findIndex((e) => e.id === old && e.event === "end");
              const started = events.findIndex((e) => e.id === recogniser && e.event === "start");
              check(`${label}: the next recogniser waits for the old onend`, ended >= 0 && started > ended && !events.some((e) => e.event === "overlap"), events);

              const deadline = Date.now() + 3100;
              while (Date.now() < deadline) {
                await frameTick();
                assert.equal(await listening(), recogniser, `${label}: the same mic stays open during running frames`);
              }
              check(`${label}: the mic stayed open for 3+ seconds of running frames`, (await ui()).mic === "listening");
            }
            if (spoken === 0) {
              assert(await page.evaluate(() => window.__speak("orange bicycle")));
              for (let k = 0; k < 90 && (await ui()).mic !== "unclear"; k++) await frameTick();
              const un = await ui();
              const heard = await page.locator(".surf-turn .heard [lang=en]").textContent({ timeout: 1000 });
              const sameTurn = await page.evaluate((turn) => window.__ew.game.surf.logic.choice === turn, turn);
              check(`${label}: something else said: it is shown, the turn stays the learner's`, un.mic === "unclear"
                && un.heard === "orange bicycle" && heard === un.heard && sameTurn && !un.said, un);
              recogniser = await waitForMic();
            }
            assert.equal(es, SPOKEN[pick], `${label}: the authored option ${pick}`);
            assert(await page.evaluate((t) => window.__speak(t), SPOKEN[pick].toLowerCase().replace(/[!?.,]/g, "")));
            for (let k = 0; k < 90 && (await ui()).said !== pick; k++) await frameTick();
            check(`${label}: a spoken ${pick} is accepted while frames run`, (await ui()).said === pick, await ui());
            assert(await page.evaluate((turn) => window.__ew.game.surf.logic.choice !== turn, turn), `${label}: saying ${pick} advanced that turn`);
            await turn.dispose();
            const events = await speechEvents();
            check(`${label}: interim and final results arrived before natural onend`, ["interim", "final", "end"].every((name) => events.some((e) => e.id === recogniser && e.event === name)) &&
              !events.some((e) => e.id === recogniser && ["abort", "stop"].includes(e.event)), events.slice(-12));
            spoken++;
          } else if (phone) { await page.locator(".surf-choice").nth(i).tap(); tapped++; }
          else { await page.keyboard.press(String(i + 1)); keyed++; }
          mine.push(pick);
          await step(2);
          if (s.choice === "board") {
            const badge = page.locator(".surf-card .kit-feedback");
            check(`${label}: the evaluated board choice shows one 16 px badge`,
              (await badge.getAttribute("data-feedback", { timeout: 1000 })) === (pick === "b_sup" ? "retry" : "right")
                && await badge.locator('svg[width="16"]').count() === 1);
          }
          if (!shown.has("said") && (await ui()).said) { shown.add("said"); const sd = await page.locator(".surf-said").innerText().catch(() => ""); check(`${label}: what the learner answered is shown as said`, sd.includes(es), sd); await shot("said"); }
          if (pick === "a_again" || pick === "a_coming" || pick === "a_vamos") { await step(30); await fade(); }
          continue;
        } else if (!s.choice) askT = 0;
        // ---- the learner's turn to act: the move is named under her line, with its key
        const t = s.todo;
        if (t) {
          if (t.cue !== lastCue) { lastCue = t.cue; moveT = 0; }
          moveT++;
          const m = await moveNow();
          if (m && moveT > 2) {
            const o = moves.get(t.do) ?? { n: 0, ok: true, replayFits: true, gapMax: 0, clearMin: Infinity, inView: true, over: false };
            const [name, keys] = MOVES[t.do];
            const instruction = t.do === "steady" ? (phone ? "atleiskite rodykles" : "atleiskite klavišus") : (phone ? "bakstelėkite" : "spauskite");
            const right = m.text.replace(/[↑←↓→]/g, "").trim() === `${name} – ${instruction}` && keys.join("") === m.keys.join("");
            if (phone) {
              assert.deepEqual(m.asked, keys, `${label}: highlighted arrows for ${t.do}`);
              assert.equal(m.still, t.do === "steady");
              assert(!m.button && m.boardClear > 0 && m.padGap > 0, `${label}: board between the move label and pad for ${t.do} (${m.boardClear}px, ${m.padGap}px)`);
            }
            moves.set(t.do, { n: o.n + 1, ok: o.ok && right, replayFits: o.replayFits && m.replayFits, text: m.text, keys: m.keys, button: m.button, font: m.font, h: m.h, w: m.w, gapMax: Math.max(o.gapMax, m.gap), clearMin: Math.min(o.clearMin, m.clear), inView: o.inView && m.inView, over: o.over || m.over, dots: m.dots, time: m.time });
            if (!shown.has("move:" + t.do)) { shown.add("move:" + t.do); await real(300); await shot("move-" + t.do); }
          }
          if (t.do === "paddle") {
            if (++strokeT >= 4) {
              strokeT = 0;
              await press("up");
              if (m && t.left === 1 && !shown.has("last-stroke")) {
                shown.add("last-stroke");
                await step(1);
                check(`${label}: the last stroke finishes the row`, await page.locator(".surf-finished .done").count() === m.dots);
              }
              if (m && m.done === 0 && !shown.has("first-stroke")) {
                shown.add("first-stroke");
                await step(1);
                check(`${label}: the first up press fills one stroke dot`, (await moveNow())?.done === 1);
                if (!phone) check(`${label}: the pressed key lights up`, await page.locator(".surf-move .surf-key.lit").innerText() === "↑");
                if (phone) {
                  await page.emulateMedia({ reducedMotion: "reduce" });
                  const still = await page.locator(".surf-pad .ask span").evaluate((el) => getComputedStyle(el).animationName === "none" && getComputedStyle(el).boxShadow !== "none");
                  check(`${label}: reduced motion leaves a steady glow`, still);
                  await page.emulateMedia({ reducedMotion: "no-preference" });
                }
              }
            }
          } else if (moveT > 6) {
            if (t.do !== "steady" && !(t.do === "up" && early)) await press(DIR[t.do]);
            moveT = 0;
          }
        } else lastCue = "";
        // (a learner who can't wait for her "Now!")
        if (s.phase === "catch" && early && !s.upOpen && s.choice === "now" && ++upT > 6) { early = false; upT = 0; await press("up", "Space"); }
        await step(4);
      }
      return { said, mine, frames, spoken, keyed, tapped, waterPack, looks, demo, learnerFrame, coachFrame };
    };
    // ---- she waits for the learner: a long silence at her first line, and nothing has gone on
    for (let i = 0; i < 400 && !(await L())?.choice; i++) await step(4);
    const first = await L();
    await step(60 * 20);
    const later = await L();
    check(`${label}: she waits: twenty seconds of silence, and it is still the learner's turn to answer her first line`, first?.choice === "ack" && later?.choice === "ack" && later.phase === "intro" && later.heard.length === first.heard.length, { first: first?.heard, later: later?.heard });
    const panel = await page.evaluate(() => ({ turn: !!document.querySelector(".surf-turn"), mic: !!document.querySelector(".surf-turn .surf-mic"), options: [...document.querySelectorAll(".surf-choice .surf-choice-text")].map((e) => [...e.querySelectorAll(".en")].map((w) => w.innerText).join(" ")), helps: [...document.querySelectorAll(".surf-choice")].map((b) => [...b.querySelectorAll(".lt")].map((w) => w.innerText).join(" ")) }));
    check(`${label}: the learner's lines are on show with their words' meaning, under the microphone`, panel.turn && panel.mic && panel.options.length === 2 && panel.options[0] === "Sounds good!" && panel.helps.every((h) => h.length > 1), panel);
    assert.deepEqual(panel.options, ["Sounds good!", "Okay."]);
    assert.deepEqual(panel.helps, ["Skamba gerai!", "Gerai."]);
    const brokenImages = () => page.locator(".surf img").evaluateAll((images) => images.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src));
    if (!hasPics) {
      const cue = await page.locator(".surf-card").evaluate((card) => {
        const words = (selector) => [...card.querySelectorAll(selector)].map((e) => e.firstChild?.textContent).join(" ");
        return { en: words(".il .en"), lt: words(".il .lt"), nat: card.querySelector(".nat")?.textContent };
      });
      assert.deepEqual(cue, {
        en: "We'll ride the whitewater. Small waves, big board.",
        lt: "Mes čiuošime — per bangų putas. Mažos bangos, didelė lenta.",
        nat: "Čiuošime per lūžusių bangų putas. Bangos nedidelės, lenta didelė.",
      });
      check(`${label}: the full cue and answers render without surf art`,
        await page.locator(".surf-pic").count() === 0 && (await brokenImages()).length === 0, { cue, panel });
    }
    let run = await play("good", "beginner");
    s = await L();
    check(`${label}: the lesson ran to its end: a wave ridden to the beach, every command followed`, s?.phase === "over" && s.score.waves === 1 && s.score.falls === 0 && s.score.followed === s.score.asked && s.score.asked >= 4, s?.score);
    assert.equal(s.score.asked, 4, "the beginner ride scores exactly four commands");
    check(`${label}: no backpack paddling, sitting and riding, nor at the score card (the lesson's surf clothes)`, ["prone", "sit", "stand"].every((pose) => run.waterPack[pose]) && s.backpack === false, run.waterPack);
    check(`${label}: the real surf outfit and stage camera stay through paddling, sitting, riding and score`,
      ["prone", "sit", "stand", "score"].every((pose) => isSurfPlayer(run.looks[pose]))
      && cameraDistance(run.looks.stand, sand) > 1, run.looks);
    const d = run.demo;
    check(`${label}: Maren rides towards the beach before the first learner wave, while the lesson waits`, d.waits && d.stance > 0.9 && d.z1 - d.z0 > 6 && d.end - d.start > 0 && d.end - d.start < 8000, d);
    const { learnerFrame, coachFrame } = run;
    check(`${label}: both riders fit in the low side view on a tall, single-pass wave`,
      [learnerFrame, coachFrame].every((f) => f?.inView && f.side > 3 && f.height < 2.6 && f.pitch > 0.3 && f.waveHeight >= 1.2 && f.singlePass), { learnerFrame, coachFrame });
    if (phone) {
      const [x, y] = coachFrame.center;
      check(`${label}: Maren's board is centered above the touch controls`, Math.abs(x) < 0.3 && y > -0.32 && y < 0.2, coachFrame);
    }
    check(`${label}: the learner's left still projects screen-left in the riding camera`, learnerFrame?.left < -3, learnerFrame);
    const beginnerSounds = await sounds();
    const hands = beginnerSounds.filter((e) => e.method === "surfStroke").map((e) => e.hand);
    check(`${label}: paddling alternates hands and the audio gets the rush, break and stand cues`, hands.length >= 8 && hands.every((hand, i) => hand === (i % 2 ? 1 : -1)) && ["surfWaveRush", "surfWaveBreak", "surfStand"].every((method) => beginnerSounds.some((e) => e.method === method)), beginnerSounds);
    const firstSound = (method) => beginnerSounds.findIndex((e) => e.method === method);
    const order = ["surfStroke", "surfWaveRush", "surfWaveBreak", "surfStand"].map(firstSound);
    check(`${label}: stroke, rush, break and stand sound in order`, order[0] >= 0 && order.slice(1).every((index, i) => index > order[i]), order);
    if (shots) check(`${label}: captured the learner standing, Maren riding and paddling`, ["standing-wave", "coach-ride", "paddling"].every((name) => shown.has(name)));
    check(`${label}: the wrong board got a word, then the full lesson ran to shore`,
      ["board_ask", "board_no", "board_yes", "leash", "go_in", "paddle", "wave_duck", "duck_ok", "arrive", "paddle_now", "coming",
        "not_yet", "now_up", "up_ok", "ride_q", "shore", "first_wave", "again_q", "bye"].every((c) => s.heard.includes(c)), s.heard);
    // ---- a conversation: the learner spoke at every step of it, aloud and by ${phone ? "taps" : "keys"}
    check(`${label}: the learner answered her all the way: on the sand, about the wave, about the moment, in the ride, at the end`, ["a_perfect", "a_ready", "a_coming", "a_and_now", "a_this", "a_now", "a_allgood", "a_thanks", "a_enough"].every((c) => run.mine.includes(c)) && run.mine.length >= 13, run.mine);
    check(`${label}: answers said aloud were heard (${run.spoken}), and ${phone ? "taps" : "keys"} answered too (${phone ? run.tapped : run.keyed})`, run.spoken >= 5 && (phone ? run.tapped : run.keyed) >= 3, { spoken: run.spoken, keyed: run.keyed, tapped: run.tapped });
    check(`${label}: “Now?” got “Not yet!” before “Now!”`, run.said.indexOf("coming") >= 0 && run.said.indexOf("not_yet") > run.said.indexOf("coming") && run.said.indexOf("now_up") > run.said.indexOf("not_yet"), run.said.slice(run.said.indexOf("coming")));
    // ---- every move she asked for was named under her line, large, with its key
    const mv = Object.fromEntries(moves);
    check(`${label}: paddling, the duck, the turn and the stand-up were each named under her line`, ["paddle", "duck", "turn", "up"].every((d) => mv[d]?.n > 0 && mv[d].ok), Object.fromEntries(Object.entries(mv).map(([k, v]) => [k, v.text + " " + v.keys.join("")])));
    check(`${label}: and at least two of the ride's commands`, Object.keys(mv).filter((d) => ["left", "right", "down", "fwd", "steady"].includes(d) && mv[d].ok).length >= 2, Object.keys(mv));
    check(`${label}: the 44 px replay button stays in the card and clears the gloss and move controls`,
      Object.values(mv).every((v) => v.replayFits));
    check(`${label}: the move is large, right under her line, whole in the picture`, Object.values(mv).every((v) => v.font >= (phone ? 19 : 22) && v.gapMax <= 14 && v.gapMax >= 0 && v.inView && v.h >= (phone && v.button ? 56 : 40)), Object.fromEntries(Object.entries(mv).map(([k, v]) => [k, `${v.font}px gap ${v.gapMax} h ${v.h}`])));
    const replayTarget = await page.locator(".surf-again").count();
    check(`${label}: replay disappears with the cue on the result`, replayTarget === 0);
    check(`${label}: the move never covers the learner on their board`, Object.values(mv).every((v) => !v.over && v.clearMin > 12), Object.fromEntries(Object.entries(mv).map(([k, v]) => [k, v.clearMin])));
    check(`${label}: paddling shows its strokes, the stand-up its time`, mv.paddle.dots >= 4 && mv.up.time, { dots: mv.paddle.dots, time: mv.up.time });
    check(`${label}: both stroke transitions were exercised`, shown.has("first-stroke") && shown.has("last-stroke"));
    if (phone) check(`${label}: on a phone the move labels the arrow to tap`, ["paddle", "duck", "turn", "up"].every((d) => !mv[d].button) && mv.up.text === "Stokitės – bakstelėkite ↑", mv.up.text);
    else check(`${label}: with keys it says which`, mv.up.text === "Stokitės – spauskite ↑" && mv.up.keys.includes("↑") && mv.paddle.keys.includes("↑"), mv.up);
    await step(20);
    const scoreCard = page.locator(".surf .mode-score-card");
    const checkResult = async (score, waves, seconds) => {
      await scoreCard.waitFor({ state: "visible" });
      assert.deepEqual(await scoreCard.locator("dt").allTextContents(), ["Bangos", "Sekundės ant bangos", "Judesiai iš pirmo karto"]);
      const values = await scoreCard.locator("dd").allTextContents();
      assert.deepEqual(values, [String(score.waves), String(score.seconds), `${score.followed}/${score.asked}`]);
      assert.equal(await scoreCard.evaluate((el) => el.closest("[lang]").lang), "lt");
      assert.equal(await scoreCard.locator(".surf-best").innerText(), `Iš viso: bangų – ${waves}, sekundžių ant bangos – ${seconds}`);
      assert.equal(await scoreCard.getByText("Girdėtas frazes rasite savo kortelėse.", { exact: true }).count(), 1);
      assert.equal(await scoreCard.locator(".mode-score-actions button:visible").count(), 3);
    };
    const beginnerScore = s.score;
    await checkResult(beginnerScore, beginnerScore.waves, beginnerScore.seconds);
    const originalAgain = await page.evaluateHandle(() => window.__ew.game.surfAgain);
    await page.evaluate(() => { window.__ew.game.surfAgain = (level) => { window.__surfResultAction = level; }; });
    await scoreCard.locator(".surf-level:not(.adv)").click();
    check(`${label}: the beginner button requests another beginner lesson`, await page.evaluate(() => window.__surfResultAction) === "beginner");
    await page.evaluate((again) => { window.__ew.game.surfAgain = again; }, originalAgain);
    await originalAgain.dispose();
    if (label === "short-phone") {
      const layout = await scoreCard.evaluate((el) => {
        const { left, right, top, bottom } = el.getBoundingClientRect();
        return { inView: left >= 0 && right <= innerWidth && top >= 0 && bottom <= innerHeight, overflow: el.scrollHeight - el.clientHeight };
      });
      check(`${label}: the score card and its actions fit on screen`, layout.inView && layout.overflow <= 1, layout);
    }
    await shot("result");
    if (hasPics) {
      const of = await page.evaluate(() => window.__ew.game.surf.content.pictures.of);
      const rows = [...seenPics.entries()];
      await new Promise((r) => setTimeout(r, 300));
      check(`${label}: her commands came with their pictures, each the right one`, rows.length >= 8 && rows.every(([cue, v]) => (of[cue] ? v.name === of[cue] : ["good1", "good2", "good3", "r_exact", "not_yet", "ride_q", "easy"].includes(cue))), rows.map(([cue, v]) => `${cue}:${v.name}`).join(" "));
      // (the cards' pictures were fetched ahead as the lesson began)
      const ready = await page.evaluate(() => window.__ew.game.surf.loaded.every((i) => i.complete && i.naturalWidth > 0) && window.__ew.game.surf.loaded.length);
      check(`${label}: all the lesson's pictures are loaded ahead`, ready >= 17, ready);
      const afloat = rows.filter(([, v]) => ["out", "wait", "catch", "ride"].includes(v.phase));
      check(`${label}: the picture's card is whole in the picture, and never over the learner or their board`, afloat.length >= 5 && afloat.every(([, v]) => v.inView && !v.over && v.clear > 40), afloat.map(([cue, v]) => `${cue}:${v.clear}`).join(" "));
      check(`${label}: the picture is big enough to read the move`, rows.every(([, v]) => v.w >= (label === "short-phone" ? 104 : phone ? 250 : 220) && v.h >= (label === "short-phone" ? 78 : 110)), rows[0]?.[1]);
      check(`${label}: praise keeps the command's picture; a line with none shows her words alone`, !of.good1 && !of.again_q && await page.evaluate(() => { const l = window.__ew.game.surf.logic; return l.heard.includes("again_q"); }));
    }
    // ---- another lesson from the card, further out: stand up too early once, answer her, ride the next
    await page.locator(".surf-level.adv").click();
    await fade();
    s = await L();
    check(`${label}: another lesson, advanced`, s?.level === "advanced" && s.phase === "intro", s);
    run = await play("early", "advanced");
    s = await L();
    check(`${label}: a fall was a question, and the next wave was ridden`, s?.phase === "over" && s.score.falls === 1 && s.score.waves === 1 && ["wipeout", "you_ok", "what_happened", "r_exact", "tip_early", "another", "q_go"].every((c) => s.heard.includes(c)), { score: s?.score, heard: s?.heard.length });
    let since = -1;
    for (const cue of ["wipeout", "you_ok", "what_happened", "r_exact", "tip_early", "another", "now_up", "shore"]) {
      const index = run.said.indexOf(cue, since + 1);
      assert(index > since, `${label}: expected ${cue} after ${run.said[since]} in ${run.said.join(", ")}`);
      since = index;
    }
    const wipeouts = (await sounds()).filter((e) => e.method === "surfWipeout");
    check(`${label}: the pack stays off through the wipeout and the splash and wash are cued`, run.waterPack.swim === true && wipeouts.some((e) => e.phase === "fall"), wipeouts);
    check(`${label}: wipeout and advanced score use the same surf outfit and stage camera`, isSurfPlayer(run.looks.swim) && isSurfPlayer(run.looks.score), run.looks);
    const advancedSounds = (await sounds()).slice(beginnerSounds.length);
    const fallAt = advancedSounds.findIndex((e) => e.method === "surfWipeout" && e.phase === "fall");
    const standAt = advancedSounds.findIndex((e) => e.method === "surfStand" && e.phase === "ride");
    const advancedHands = advancedSounds.filter((e) => e.method === "surfStroke").map((e) => e.hand);
    check(`${label}: the advanced lesson splashes before the recovery stand and alternates hands`,
      fallAt >= 0 && standAt > fallAt && advancedHands.length >= 8 && advancedHands.every((hand, i) => hand === (i % 2 ? 1 : -1)), advancedSounds);
    if (shots) check(`${label}: captured the wipeout`, shown.has("wipeout"));
    check(`${label}: the learner said they were fine, what went wrong, and that they understood`, ["a_fine", "a_early", "a_understood", "a_again"].every((c) => run.mine.includes(c)), run.mine);
    await step(20);
    await checkResult(s.score, beginnerScore.waves + s.score.waves, beginnerScore.seconds + s.score.seconds);
    await scoreCard.locator(".surf-later").click();
    await fade();
    const after = await page.evaluate(() => {
      const g = window.__ew.game, p = g.player.root.position, st = window.__ew.store.getState();
      const actor = g.npcs.find((n) => n.id === g.surf.content.npc);
      const cards = localStorage.getItem("english-world-cards-v1") ?? "";
      return { x: +p.x.toFixed(1), z: +p.z.toFixed(1), y: +p.y.toFixed(2), on: g.surf.active, mode: g.rig.mode, ride: st.hud.ride, surf: st.progress.surf,
        npc: actor?.ch.root.visible, atHome: actor?.ch.root.position.distanceTo(actor.home) < 0.01, backpack: g.player.backpackVisible, outfit: g.outfit ?? null,
        order: g.player.root.rotation.order, cards: cards.length,
        mine: (JSON.parse(cards || "{}").cards ?? []).find((c) => c.situationId === "x04-surf" && c.sentence?.en === "Now?")?.sentence };
    });
    check(`${label}: back on the sand by the boards, walking again, the instructor at her counter`, !after.on && after.mode === "follow" && after.ride === null && after.npc === true && after.atHome && after.order === "XYZ" && Math.hypot(after.x - start.x, after.z - start.z) < 0.5, after);
    check(`${label}: leaving the lesson: own clothes and the backpack again`, after.backpack === true && after.outfit === null, { backpack: after.backpack, outfit: after.outfit });
    check(`${label}: the waves, the seconds and what was heard are kept, and the phrases are cards (the learner's own too)`, after.surf?.waves === 2 && after.surf.lessons === 2 && after.surf.seconds > 20 && after.surf.heard.now_up >= 2 && after.cards > 500 && after.mine?.lt === "Dabar?", { ...after.surf, heard: Object.keys(after.surf?.heard ?? {}).length, cards: after.cards, mine: after.mine });
    for (const key of ["waves", "seconds", "followed", "asked"]) assert.equal(after.surf[key], beginnerScore[key] + s.score[key], `saved ${key}`);
    await step(30);
    const checkTownReturn = async (name, before, evidence) => {
      const p = await playerNow();
      check(`${label}: ${name} restores the original town actor, outfit and follow camera`, p.actor === townPlayer.actor && p.visible
        && p.backpack === true && p.outfit === null && p.rash === townPlayer.rash && p.swim === townPlayer.swim
        && p.mode === "follow" && !p.stage && p.y >= -0.01 && !p.swimming && cameraDistance(p, before) > 1
        && Math.hypot(p.x - start.x, p.z - start.z) < 0.5, p);
      check(`${label}: ${name} restores the town toolbar and board prompt`, await page.locator(".toolbar").count() === 1 && (await hud()).prompt?.kind === "surf");
      if (phone) check(`${label}: ${name} restores joystick, action and jump`, await page.locator(".joy:visible, .act-btn:visible, .jump-btn:visible").count() === 3 && await page.locator(".surf-pad").count() === 0);
      await checkSurfTownView(page, name, "return", () => shot(evidence, "css", 0));
    };
    await checkTownReturn("leaving the result", run.looks.score, "return-from-score");
    if (phone) {
      const before = await playerNow();
      await page.locator(".jump-btn").tap();
      await step(8);
      const airborne = await playerNow();
      await step(90);
      const landing = await playerNow();
      const jump = { before, airborne, landing };
      const dryTownActor = (p) => p.actor === townPlayer.actor && p.visible && p.mode === "follow" && !p.stage
        && !p.swimming && p.y >= -0.01 && Math.hypot(p.x - start.x, p.z - start.z) < 0.5;
      check(`${label}: the restored town jump actually lifts the learner`, dryTownActor(before) && !before.air
        && before.displayedY === before.y && dryTownActor(airborne) && airborne.air && airborne.displayedY - before.displayedY > 0.1, jump);
      check(`${label}: the learner lands back at the starting height`, dryTownActor(landing) && !landing.air
        && Math.abs(landing.displayedY - before.displayedY) <= 0.05, jump);
      assert.deepEqual((await hud()).prompt, townPrompt, `${label}: the original board prompt returns after landing: ${JSON.stringify(jump)}`);
    } else {
      await page.keyboard.press("Space");
      await page.locator(".surf-pick .surf-level").first().waitFor();
      await page.locator(".surf-later").click();
      await step(5);
    }

    // ---- x04 is a bonus. Start its real session and accept the queued advanced lesson from the end card.
    await page.evaluate(() => window.__ew.game.startScenario("x04-surf"));
    for (let i = 0; i < 400 && !(await page.evaluate(() => window.__ew.game.activeSession?.active)); i++) { await step(3); await real(20); }
    check(`${label}: the Harbor Surf bonus opens Maren's real session`, await page.evaluate(() => {
      const { game, store } = window.__ew, session = game.activeSession;
      return session?.active && session.sit.id === "x04-surf" && session.sit.npc === "maren" && session.sit.bonus
        && store.getState().conv.sitId === "x04-surf" && !game.orderedSituations().some((s) => s.id === "x04-surf");
    }));
    await page.locator(".scene-start").waitFor({ state: "visible" });
    assert(await page.evaluate(() => {
      const { conv } = window.__ew.store.getState();
      return conv.introOpen && conv.transcript.length === 0;
    }), "Maren waits for Pradėti before her first line");
    await readSurfIntro(page);
    await page.evaluate(() => {
      const { game, store } = window.__ew;
      game.onSessionEvent("surf", { level: "advanced" });
      store.getState().setConv({ phase: "ended", completed: true });
    });
    await page.locator(".surf-cta").click();
    await untilLesson("advanced");
    s = await L();
    check(`${label}: the conversation's event starts the lesson (the learner said they surf: advanced)`, s?.level === "advanced", s);
    await step(60);
    if (hasPics) {
      // her first line there has no picture; the board question has one: with glosses, and with the English alone
      for (let i = 0; i < 900; i++) { const q = await L(); if (q?.choice === "board") break; if (q?.choice) { if (phone) await page.locator(".surf-choice").first().tap(); else await page.keyboard.press("1"); } await step(6); }
      await new Promise((r) => setTimeout(r, 350));
      const withHelp = await page.evaluate(() => ({ pic: !!document.querySelector(".surf-card.has-pic .surf-pic img.new"), gloss: !!document.querySelector(".surf-card .u .lt") }));
      check(`${label}: a new line comes with its picture and its glosses`, withHelp.pic && withHelp.gloss, withHelp);
      // heard often: the words keep their translation and the picture (22 Nov 2026: the help no longer fades;
      // the game's translation setting decides it, tests/browser/surf-glosses.mjs)
      const stage = async (support) => { await page.evaluate((n) => window.__ew.surf.getState().set({ support: n }), support); await real(25); return page.evaluate(() => ({ pic: !!document.querySelector(".surf-pic"), gloss: !!document.querySelector(".surf-card .u .lt"), listen: !!document.querySelector(".surf-listen") })); };
      const one = await stage(1), two = await stage(2);
      check(`${label}: a line heard often keeps its translation and its picture`, one.pic && one.gloss && two.pic && two.gloss && !two.listen, { one, two });
      await stage(0);
      await page.emulateMedia({ reducedMotion: "reduce" });
      const still = await page.evaluate(() => [getComputedStyle(document.querySelector(".surf-pic")).animationName, getComputedStyle(document.querySelector(".surf-pic img.new")).animationName]);
      check(`${label}: with reduced motion the picture does not slide`, still.every((n) => n === "none"), still);
      await page.emulateMedia({ reducedMotion: "no-preference" });
    }
    for (let i = 0; i < 150; i++) {
      s = await L();
      if (s?.phase === "out") break;
      if (s?.choice) await page.evaluate((cue) => window.__ew.game.surfChoose(cue), s.choice === "board" ? "b_short" : s.options[0]);
      await step(12);
    }
    check(`${label}: the learner can leave while still on the water`, s?.phase === "out" && s.backpack === false);
    if (!phone) {
      for (let i = 0; i < 150 && (await L())?.todo?.do !== "paddle"; i++) await step(4);
      const paddle = (await L()).todo;
      assert.equal(paddle?.do, "paddle");
      await press("up", "e");
      assert.equal((await L()).todo?.left, paddle.left - 1, "E still makes a paddle stroke");
    }
    const water = await playerNow();
    if (phone) await page.locator(".surf-x").tap(); else await page.keyboard.press("Escape");
    await fade();
    check(`${label}: out of it at once, on foot`, !(await L()) && (await hud()).ride === null);
    check(`${label}: leaving from the water: own clothes and the backpack again`, await page.evaluate(() => window.__ew.game.player.backpackVisible === true && window.__ew.game.outfit === null));
    await step(30);
    await checkTownReturn("leaving the water", water, "return-from-water");
    if (!phone) {
      await page.keyboard.press("e");
      await page.locator(".surf-pick .surf-level").first().waitFor();
      await page.locator(".surf-later").click();
    }
    const failedImages = await page.evaluate(() => window.__surfBrokenImages);
    check(`${label}: no broken surf images or failed surf asset requests`, failedImages.length === 0 && assetFailures.length === 0, { failedImages, assetFailures });
    check(`${label}: no errors on the page`, errors.length === 0, errors.slice(0, 3));
    await ctx.close();
  }
  console.log("surf: all checks passed");
} finally {
  await browser.close();
}
