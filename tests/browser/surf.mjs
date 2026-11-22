// The surf lesson in the real game (src/game/surf/), on a computer and two phone sizes: the prompt at the boards, the
// level's choice, a whole lesson played as the conversation it is: she says a line and waits; the learner answers
// aloud (a stand-in for the browser's speech recognition hears the test's words), by a key or by a tap, or makes the
// move she asked for, which is named with its key in large letters right under her line (on a phone it is the button
// to tap). The wrong board first; a second lesson by a learner who stands up too early and answers her questions; the
// score card, back on the sand with the score and the cards kept; the lesson started by the conversation's own event;
// the way out at any moment; and, where the edition has them, the picture of what each command asks for (beside her
// words, clear of the board, gone when only her voice is left, still with reduced motion). Time is stepped by hand, so
// a lesson takes seconds. Playwright's own Chromium only (never the owner's Chrome). Against a dev server or a built game
// of a town with a surf school (Puerto Colibrí); WORLD_SHOTS=<folder> keeps pictures of its moments:
// WORLD_TEST_URL=http://127.0.0.1:8096 WORLD_STORAGE=puerto-colibri WORLD_PLAYWRIGHT_MODULE=/path/to/playwright-core/index.mjs node tests/browser/surf.mjs
import assert from "node:assert/strict";
const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const base = process.env.WORLD_TEST_URL || "http://127.0.0.1:8096";
const storage = process.env.WORLD_STORAGE || "puerto-colibri";
const shots = process.env.WORLD_SHOTS || "";
const check = (name, value, detail) => {
  assert(value, `${name}: ${JSON.stringify(detail)}`);
  console.log("ok", name, detail === undefined ? "" : JSON.stringify(detail));
};
const progress = {
  version: 1,
  profile: { name: "Test", surname: "Tester", gender: "f", lookId: "f1", look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } },
  settings: { v: 5, play: "town", quality: "low", scenes: false, volume: 0, cameraFollow: true },
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
  // the browser's speech recognition, stood in for: it "hears" what the test says (window.__speak)
  class Rec {
    start() { Rec.live = this; Rec.starts = (Rec.starts || 0) + 1; setTimeout(() => { if (Rec.live === this) this.onstart && this.onstart(); }, 5); }
    abort() { if (Rec.live === this) Rec.live = null; setTimeout(() => this.onend && this.onend(), 0); }
    stop() { this.abort(); }
  }
  window.SpeechRecognition = Rec;
  window.__listening = () => !!Rec.live;
  window.__speak = (text) => {
    const r = Rec.live;
    if (!r || !r.onresult) return false;
    r.onspeechstart && r.onspeechstart();
    r.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: text }], { isFinal: true })] });
    r.onspeechend && r.onspeechend();
    return true;
  };
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
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => { if (m.type() === "error" && /WebGLProgram: Shader Error/.test(m.text())) errors.push(m.text()); });
    await page.route(/\.mp3(?:\?|$)/, (route) => route.fulfill({ status: 204, body: "" }));
    await page.addInitScript(([k, v]) => { if (sessionStorage.getItem("seeded") !== "1") { sessionStorage.setItem("seeded", "1"); localStorage.clear(); localStorage.setItem(k, v); } }, [`${storage}-progress-v1`, JSON.stringify(progress)]);
    await page.addInitScript(INIT);
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
    const fade = async () => { await real(600); await step(20); };
    await page.evaluate(() => { window.__ew.coach?.finish?.(); window.__ew.store.getState().setHud({ panel: null }); });
    const has = await page.evaluate(() => !!window.__ew.game.surf);
    check(`${label}: this town has a surf school`, has);
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
      const { surf, player } = window.__ew.game, l = surf.logic;
      if (!l) return null;
      const scene = surf.scene, coach = scene?.coach;
      return {
        phase: l.phase, pose: l.pose, d: +l.d.toFixed(1), saying: l.saying, choice: l.choice?.id ?? null,
        options: l.choice?.options ?? null, todo: l.todo ? { do: l.todo.do, left: l.todo.left ?? null, cue: l.todo.cue } : null,
        cmd: l.cmd?.c.act ?? null, score: l.score, level: l.level, reason: l.reason, heard: l.heard,
        upOpen: l.upOpen, talking: l.talking, backpack: player.backpackVisible, stroke: player.surf?.stroke,
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
    const shot = async (name, scale = "device") => { if (shots) { await step(2); await real(250); await page.screenshot({ path: `${shots}/${label}-${name}.png`, scale }); } };
    const shown = new Set();
    const hud = () => page.evaluate(() => window.__ew.store.getState().hud);
    const paddle = async () => { if (phone) await page.locator(".act-btn").tap(); else await page.keyboard.press("e"); };
    const stand = async () => { if (phone) await page.locator(".jump-btn").tap(); else await page.keyboard.press(" "); };
    /** A key held for a few frames (an arrow is read by the frame). */
    const hold = async (key) => { await page.keyboard.down(key); await step(4); await page.keyboard.up(key); };
    /** The move she asks for, as it is shown under her line: its words, its keys, where it is. */
    const moveNow = () => page.evaluate(() => {
      const m = document.querySelector(".surf-move"), card = document.querySelector(".surf-card");
      if (!m || !card) return null;
      const r = m.getBoundingClientRect(), c = card.getBoundingClientRect(), g = window.__ew.game;
      const p = g.player.root.position.clone().project(g.rig.cam), y = ((1 - p.y) / 2) * innerHeight, x = ((p.x + 1) / 2) * innerWidth;
      return { text: m.querySelector(".surf-move-text").innerText.replace(/\s+/g, " ").trim(), keys: [...m.querySelectorAll(".surf-key")].map((k) => k.innerText), button: m.tagName === "BUTTON", gap: Math.round(r.top - c.bottom), w: Math.round(r.width), h: Math.round(r.height), font: parseFloat(getComputedStyle(m.querySelector(".surf-move-text")).fontSize), inView: r.left >= 0 && r.right <= innerWidth + 0.5 && r.top >= 0 && r.bottom <= innerHeight, over: x > r.left && x < r.right && y > r.top && y < r.bottom, clear: Math.round(y - r.bottom), dots: m.querySelectorAll(".surf-strokes i").length, done: m.querySelectorAll(".surf-strokes i.done").length, time: !!m.querySelector(".surf-time") };
    });
    const moves = new Map();
    const stick = async (x, y) => {
      if (phone) { await page.evaluate(([a, b]) => window.__ew.game.setJoystick(a, b), [x, y]); return; }
      for (const [k, on] of [["ArrowLeft", x < 0], ["ArrowRight", x > 0], ["ArrowDown", y < 0], ["ArrowUp", y > 0]]) await page.keyboard[on ? "down" : "up"](k);
    };

    // ---- at the school's boards: the prompt, the level's choice, and "not now"
    const start = await page.evaluate(() => { const g = window.__ew.game, s = g.surf.spot.start; g.enterZone("town", { x: s.x, z: s.z, rot: s.rot }, true); return s; });
    await step(30);
    check(`${label}: the prompt at the boards is the lesson's`, (await hud()).prompt?.kind === "surf", (await hud()).prompt);
    if (phone) await page.locator(".act-btn").tap(); else await page.keyboard.press("e");
    await step(5);
    check(`${label}: the level's choice comes up`, await page.locator(".surf-pick .surf-level").count() === 2);
    await page.locator(".surf-later").click();
    await step(5);
    check(`${label}: "not now" closes it`, await page.locator(".surf-pick").count() === 0 && !(await L()));
    if (phone) await page.locator(".act-btn").tap(); else await page.keyboard.press("e");
    await step(5);
    await page.locator(".surf-level").first().click();
    await fade();
    let s = await L();
    check(`${label}: a beginner's lesson is on, on the sand`, s?.level === "beginner" && s.phase === "intro" && (await hud()).ride === "surf", s);
    check(`${label}: the learner wears the backpack on the sand`, s?.backpack === true);
    const menu = page.getByRole("button", { name: "Meniu" });
    check(`${label}: the town's tools are tucked into Meniu beside the surf score`,
      await page.locator(".surf-toolbar .icon-btn:visible").count() === 1 && await menu.isVisible()
      && await page.locator(".minimap").count() === 0 && await page.locator(".surf-score").isVisible());
    await menu.click();
    await page.locator(".surf-toolbar .light-mode-btn").waitFor();
    await menu.click();
    await page.locator(".surf-toolbar .light-mode-btn").waitFor({ state: "hidden" });
    const npcHidden = await page.evaluate(() => window.__ew.game.npcs.find((n) => n.id === window.__ew.game.surf.content.npc)?.ch.root.visible === false);
    check(`${label}: the instructor is in the water with the learner, not at her counter too`, npcHidden);

    // ---- a lesson, played by the keys or the phone's buttons. `how`: "good" does what she says (the wrong board
    // first); "early" stands up before the call once
    // the pictures of what her commands ask for (an edition may have none: Maple Harbor's engine has no lesson yet)
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
    /** What the moves are called (Lithuanian, English) and their keys: what the learner reads under her line. */
    const MOVES = { paddle: [/Irkluok|Paddle/, ["E"]], duck: [/Nerk|Duck/, ["↓"]], turn: [/Suk lentą|Turn the board/, ["←", "→"]], up: [/Stokis|Stand up/, ["↑"]], left: [/kairę|left/, ["←"]], right: [/dešinę|right/, ["→"]], down: [/Tūpk|Crouch/, ["↓"]], fwd: [/pirmyn|forward/, ["↑"]], jump: [/Šok|Jump/, null], steady: [/ramiai|steady/, []] };
    const KEY = { duck: "ArrowDown", turn: "ArrowRight", up: "ArrowUp", left: "ArrowLeft", right: "ArrowRight", down: "ArrowDown", fwd: "ArrowUp" };
    const play = async (how, level) => {
      let wrongBoard = how === "good", early = how === "early", frames = 0, strokeT = 0, upT = 0, askT = 0, moveT = 0, lastCue = "", spoken = 0, keyed = 0, tapped = 0, prev = "";
      const said = [], mine = [];
      const waterPack = {}, demo = { start: null, end: null, z0: null, z1: null, waits: true, stance: 0 };
      let learnerFrame = null, coachFrame = null;
      for (; frames < 60 * 400; frames++) {
        s = await L();
        if (!s) break;
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
            if (label === "short-phone") {
              const layout = await page.locator(".surf-choices").evaluate((el) => {
                const { left, right, top, bottom } = el.getBoundingClientRect();
                const cueBottom = document.querySelector(".surf-card").getBoundingClientRect().bottom;
                const controls = document.querySelectorAll(".joy, .jump-btn, .act-btn");
                const controlsTop = Math.min(...Array.from(controls, (control) => control.getBoundingClientRect().top));
                return {
                  inView: left >= 0 && right <= innerWidth && top >= 0 && bottom <= innerHeight,
                  cueGap: top - cueBottom,
                  controlsGap: controlsTop - bottom,
                  overflow: el.scrollHeight - el.clientHeight,
                };
              });
              check(`${label}: the ${s.choice} turn fits between the cue and touch controls`,
                layout.inView && layout.cueGap >= 0 && layout.controlsGap > 0 && layout.overflow <= 1, layout);
            }
            await shot("turn-" + s.choice);
          }
          const aloud = how === "good" ? spoken < 5 || s.choice === "wave" || s.choice === "now" : s.choice === "why" || s.choice === "ok";
          if (aloud) {
            // (the microphone opened by itself as she finished)
            for (let k = 0; k < 40 && !(await page.evaluate(() => window.__listening())); k++) await real(50);
            const on = await page.evaluate(() => window.__listening());
            if (spoken === 0) {
              check(`${label}: her line said, the microphone listens by itself, as in a conversation`, on && ["listening", "starting"].includes((await ui()).mic), await ui());
              // a word that is none of the answers: she does not go on, the learner hears what was heard
              await page.evaluate(() => window.__speak("buenos días"));
              for (let k = 0; k < 80 && (await ui()).mic !== "unclear"; k++) await real(60);
              const un = await ui(), still = await L();
              check(`${label}: something else said: it is shown, the turn stays the learner's`, un.mic === "unclear" && /buenos/.test(un.heard) && still.choice === s.choice, un);
              for (let k = 0; k < 60 && !(await page.evaluate(() => window.__listening())); k++) await real(60);
            }
            // (the learner says it their own way: no capitals, no marks)
            await page.evaluate((t) => window.__speak(t), es.toLowerCase().replace(/[¡!¿?.,]/g, ""));
            for (let k = 0; k < 80 && (await L())?.choice === s.choice && (await page.evaluate(() => window.__ew.game.surf.logic?.choice?.options[0])) === s.options[0] && !(await ui()).said; k++) await real(50);
            spoken++;
          } else if (phone) { await page.locator(".surf-choice").nth(i).tap(); tapped++; }
          else { await page.keyboard.press(String(i + 1)); keyed++; }
          mine.push(pick);
          await step(2);
          if (!shown.has("said") && (await ui()).said) { shown.add("said"); const sd = await page.locator(".surf-said").innerText().catch(() => ""); check(`${label}: what the learner answered is shown as said`, sd.includes(es.replace(/^[¡¿]/, "").slice(0, 4)), sd); await shot("said"); }
          if (pick === "a_again" || pick === "a_coming" || pick === "a_vamos") { await step(30); await fade(); }
          continue;
        } else if (!s.choice) askT = 0;
        // ---- the learner's turn to act: the move is named under her line, with its key (a phone: the button to tap)
        const t = s.todo;
        if (t) {
          if (t.cue !== lastCue) { lastCue = t.cue; moveT = 0; }
          moveT++;
          const m = await moveNow();
          if (m && moveT > 2) {
            const o = moves.get(t.do) ?? { n: 0, ok: true, gapMax: 0, clearMin: Infinity, inView: true, over: false };
            const [name, keys] = MOVES[t.do];
            const right = name.test(m.text) && (phone || keys === null || keys.every((k) => m.keys.includes(k)));
            moves.set(t.do, { n: o.n + 1, ok: o.ok && right, text: m.text, keys: m.keys, button: m.button, font: m.font, h: m.h, w: m.w, gapMax: Math.max(o.gapMax, m.gap), clearMin: Math.min(o.clearMin, m.clear), inView: o.inView && m.inView, over: o.over || m.over, dots: m.dots, time: m.time });
            if (!shown.has("move:" + t.do)) { shown.add("move:" + t.do); await real(300); await shot("move-" + t.do); }
          }
          if (t.do === "paddle") { if (++strokeT >= 4) { strokeT = 0; if (phone && frames % 2) await page.locator(".surf-move").tap().catch(() => paddle()); else await paddle(); } }
          else if (moveT > 6) {
            if (t.do === "steady") { /* nothing: that is the move */ }
            else if (t.do === "up" && early) { /* (this learner was already in the water) */ }
            else if (phone) { if (m) await page.locator(".surf-move").tap(); else if (t.do === "jump") await stand(); else { const d = { duck: [0, -1], turn: [1, 0], left: [-1, 0], right: [1, 0], down: [0, -1], fwd: [0, 1], up: [0, 1] }[t.do]; await stick(d[0], d[1]); await step(4); await stick(0, 0); } }
            else if (t.do === "jump") await stand();
            else await hold(KEY[t.do]);
            moveT = 0;
          }
        } else lastCue = "";
        // (a learner who can't wait for her "¡Ahora!")
        if (s.phase === "catch" && early && !s.upOpen && s.choice === "now" && ++upT > 6) { early = false; upT = 0; await stand(); }
        await step(4);
      }
      await stick(0, 0);
      return { said, mine, frames, spoken, keyed, tapped, waterPack, demo, learnerFrame, coachFrame };
    };
    // ---- she waits for the learner: a long silence at her first line, and nothing has gone on
    for (let i = 0; i < 400 && !(await L())?.choice; i++) await step(4);
    const first = await L();
    await step(60 * 20);
    const later = await L();
    check(`${label}: she waits: twenty seconds of silence, and it is still the learner's turn to answer her first line`, first?.choice === "ack" && later?.choice === "ack" && later.phase === "intro" && later.heard.length === first.heard.length, { first: first?.heard, later: later?.heard });
    const panel = await page.evaluate(() => ({ turn: !!document.querySelector(".surf-turn"), mic: !!document.querySelector(".surf-turn .surf-mic"), options: [...document.querySelectorAll(".surf-choice .surf-choice-text")].map((e) => e.innerText), helps: [...document.querySelectorAll(".surf-choice small")].map((e) => e.innerText) }));
    check(`${label}: the learner's lines are on show with their meaning, under the microphone`, panel.turn && panel.mic && panel.options.length === 2 && /Perfecto/.test(panel.options[0]) && panel.helps.every((h) => h.length > 1), panel);
    let run = await play("good", "beginner");
    s = await L();
    check(`${label}: the lesson ran to its end: a wave ridden to the beach, every command followed`, s?.phase === "over" && s.score.waves === 1 && s.score.falls === 0 && s.score.followed === s.score.asked && s.score.asked >= 4, s?.score);
    check(`${label}: the backpack is hidden paddling, sitting and riding, and comes back at the beach`, ["prone", "sit", "stand"].every((pose) => run.waterPack[pose]) && s.backpack === true, run.waterPack);
    const d = run.demo;
    check(`${label}: Nayeli rides towards the beach before the first learner wave, while the lesson waits`, d.waits && d.stance > 0.9 && d.z1 - d.z0 > 6 && d.end - d.start > 0 && d.end - d.start < 8000, d);
    const { learnerFrame, coachFrame } = run;
    check(`${label}: both riders fit in the low side view on a tall, single-pass wave`,
      [learnerFrame, coachFrame].every((f) => f?.inView && f.side > 3 && f.height < 2.6 && f.pitch > 0.3 && f.waveHeight >= 1.2 && f.singlePass), { learnerFrame, coachFrame });
    if (phone) {
      const [x, y] = coachFrame.center;
      check(`${label}: Nayeli's board is centered above the touch controls`, Math.abs(x) < 0.3 && y > -0.32 && y < 0.2, coachFrame);
    }
    check(`${label}: the learner's left still projects screen-left in the riding camera`, learnerFrame?.left < -3, learnerFrame);
    const beginnerSounds = await sounds();
    const hands = beginnerSounds.filter((e) => e.method === "surfStroke").map((e) => e.hand);
    check(`${label}: paddling alternates hands and the audio gets the rush, break and stand cues`, hands.length >= 8 && hands.every((hand, i) => hand === (i % 2 ? 1 : -1)) && ["surfWaveRush", "surfWaveBreak", "surfStand"].every((method) => beginnerSounds.some((e) => e.method === method)), beginnerSounds);
    if (shots) check(`${label}: captured the learner standing, Nayeli riding and paddling`, ["standing-wave", "coach-ride", "paddling"].every((name) => shown.has(name)));
    check(`${label}: the wrong board got a word, the wave its call`, ["board_no", "now_up", "up_ok", "shore"].every((c) => s.heard.includes(c)), s.heard.length);
    // ---- a conversation: the learner spoke at every step of it, aloud and by ${phone ? "taps" : "keys"}
    check(`${label}: the learner answered her all the way: on the sand, about the wave, about the moment, in the ride, at the end`, ["a_perfect", "a_ready", "a_coming", "a_and_now", "a_this", "a_now", "a_allgood", "a_thanks", "a_enough"].every((c) => run.mine.includes(c)) && run.mine.length >= 13, run.mine);
    check(`${label}: answers said aloud were heard (${run.spoken}), and ${phone ? "taps" : "keys"} answered too (${phone ? run.tapped : run.keyed})`, run.spoken >= 5 && (phone ? run.tapped : run.keyed) >= 3, { spoken: run.spoken, keyed: run.keyed, tapped: run.tapped });
    check(`${label}: “¿Ahora?” got “¡Todavía no!” before “¡Ahora!”`, run.said.indexOf("not_yet") > run.said.indexOf("coming") && run.said.indexOf("now_up") > run.said.indexOf("not_yet"), run.said.slice(run.said.indexOf("coming")));
    // ---- every move she asked for was named under her line, large, with its key (a phone: the button to tap)
    const mv = Object.fromEntries(moves);
    check(`${label}: paddling, the duck, the turn and the stand-up were each named under her line`, ["paddle", "duck", "turn", "up"].every((d) => mv[d]?.n > 0 && mv[d].ok), Object.fromEntries(Object.entries(mv).map(([k, v]) => [k, v.text + " " + v.keys.join("")])));
    check(`${label}: and at least two of the ride's commands`, Object.keys(mv).filter((d) => ["left", "right", "down", "fwd", "steady"].includes(d) && mv[d].ok).length >= 2, Object.keys(mv));
    check(`${label}: the move is large, right under her line, whole in the picture`, Object.values(mv).every((v) => v.font >= (phone ? 19 : 22) && v.gapMax <= 14 && v.gapMax >= 0 && v.inView && v.h >= (phone && v.button ? 56 : 40)), Object.fromEntries(Object.entries(mv).map(([k, v]) => [k, `${v.font}px gap ${v.gapMax} h ${v.h}`])));
    check(`${label}: the move never covers the learner on their board`, Object.values(mv).every((v) => !v.over && v.clearMin > 12), Object.fromEntries(Object.entries(mv).map(([k, v]) => [k, v.clearMin])));
    check(`${label}: paddling shows its strokes, the stand-up its time`, mv.paddle.dots >= 4 && mv.up.time, { dots: mv.paddle.dots, time: mv.up.time });
    if (phone) check(`${label}: on a phone the move is a button to tap`, ["paddle", "duck", "turn", "up"].every((d) => mv[d].button) && /bakstelėk|tap/.test(mv.up.text), mv.up.text);
    else check(`${label}: with keys it says which: “${mv.up.text}”`, /spausk|press/.test(mv.up.text) && mv.up.keys.includes("↑") && mv.paddle.keys.includes("E"), mv.up);
    await step(20);
    check(`${label}: the score card is on show`, await page.locator(".surf-result").count() === 1);
    if (label === "short-phone") {
      const layout = await page.locator(".surf-pick-card").evaluate((el) => {
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
      check(`${label}: the picture is big enough to read the move`, rows.every(([, v]) => v.w >= (phone ? 250 : 220) && v.h >= 110), rows[0]?.[1]);
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
    const wipeouts = (await sounds()).filter((e) => e.method === "surfWipeout");
    check(`${label}: the pack stays off through the wipeout and the splash and wash are cued`, run.waterPack.swim === true && wipeouts.some((e) => e.phase === "fall"), wipeouts);
    check(`${label}: the learner said they were fine, what went wrong, and that they understood`, ["a_fine", "a_early", "a_understood", "a_again"].every((c) => run.mine.includes(c)), run.mine);
    await step(20);
    await page.locator(".surf-later").click();
    await fade();
    const after = await page.evaluate(() => {
      const g = window.__ew.game, p = g.player.root.position, st = window.__ew.store.getState();
      return { x: +p.x.toFixed(1), z: +p.z.toFixed(1), y: +p.y.toFixed(2), on: g.surf.active, mode: g.rig.mode, ride: st.hud.ride, surf: st.progress.surf, npc: g.npcs.find((n) => n.id === g.surf.content.npc)?.ch.root.visible, backpack: g.player.backpackVisible, order: g.player.root.rotation.order, cards: (localStorage.getItem(Object.keys(localStorage).find((k) => /cards/.test(k)) ?? "") ?? "").length, mine: /¿Ahora\?/.test(localStorage.getItem(Object.keys(localStorage).find((k) => /cards/.test(k)) ?? "") ?? "") };
    });
    check(`${label}: back on the sand by the boards, walking again, the instructor at her counter`, !after.on && after.mode === "follow" && after.ride === null && after.npc === true && after.order === "XYZ" && Math.hypot(after.x - start.x, after.z - start.z) < 0.5, after);
    check(`${label}: leaving the lesson restores the backpack`, after.backpack === true);
    check(`${label}: the waves, the seconds and what was heard are kept, and the phrases are cards (the learner's own too)`, after.surf?.waves === 2 && after.surf.lessons === 2 && after.surf.seconds > 20 && after.surf.heard.now_up >= 2 && after.cards > 500 && after.mine, { ...after.surf, heard: Object.keys(after.surf?.heard ?? {}).length, cards: after.cards, mine: after.mine });
    await step(30);
    check(`${label}: the town's buttons are back`, await page.locator(".toolbar").count() === 1);

    // ---- the conversation's "¿Probamos una ola?": its event starts the lesson as it ends; the way out at any moment
    const sitOk = await page.evaluate(() => {
      const g = window.__ew.game, sit = g.orderedSituations().find((q) => q.id === g.surf.content.situation);
      if (!sit) return false;
      g.onSessionEvent("surf", { level: "advanced" });
      g.endSession(sit, true);
      return true;
    });
    if (sitOk) {
      await fade();
      s = await L();
      check(`${label}: the conversation's event starts the lesson (the learner said they surf: advanced)`, s?.level === "advanced", s);
      await step(60);
      if (hasPics) {
        // her first line there has no picture; the board question has one: with glosses, and with the Spanish alone
        for (let i = 0; i < 900; i++) { const q = await L(); if (q?.choice === "board") break; if (q?.choice) { if (phone) await page.locator(".surf-choice").first().tap(); else await page.keyboard.press("1"); } await step(6); }
        await new Promise((r) => setTimeout(r, 350));
        const withHelp = await page.evaluate(() => ({ pic: !!document.querySelector(".surf-card.has-pic .surf-pic img.new"), gloss: !!document.querySelector(".surf-card .u .lt") }));
        check(`${label}: a new line comes with its picture and its glosses`, withHelp.pic && withHelp.gloss, withHelp);
        // heard often: the words lose their translation, the picture stays; heard more: only her voice, no picture
        const stage = async (support) => { await page.evaluate((n) => window.__ew.surf?.setState?.({ support: n }), support); await step(2); return page.evaluate(() => ({ pic: !!document.querySelector(".surf-pic"), gloss: !!document.querySelector(".surf-card .u .lt"), listen: !!document.querySelector(".surf-listen") })); };
        if (await page.evaluate(() => !!window.__ew.surf)) {
          const one = await stage(1), two = await stage(2);
          check(`${label}: the Spanish alone still has its picture; voice only has none until asked for`, one.pic && !one.gloss && !two.pic && two.listen, { one, two });
          await page.locator(".surf-listen").click();
          await step(2);
          check(`${label}: a tap brings her words and the picture back`, await page.locator(".surf-pic").count() === 1);
          await stage(0);
        }
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
      if (phone) await page.locator(".surf-x").tap(); else await page.keyboard.press("Escape");
      await fade();
      check(`${label}: out of it at once, on foot`, !(await L()) && (await hud()).ride === null);
      check(`${label}: leaving from the water puts the backpack back on`, await page.evaluate(() => window.__ew.game.player.backpackVisible === true));
    }
    check(`${label}: no errors on the page`, errors.length === 0, errors.slice(0, 3));
    await ctx.close();
  }
  console.log("surf: all checks passed");
} finally {
  await browser.close();
}
