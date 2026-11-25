// Puerto Colibrí's grotto under Cenote Ka'an, in the real game: swum into through the cave's mouth; Kin keeps the way
// until his conversation (x02) is talked through; a glyph stone's card is answered and the stone lights; three lit
// stones open the gate to the next chamber (two are not enough; nothing from the town is asked for); the way back out
// is the water one came through. Run against each Puerto Colibrí learner layer:
// WORLD_TEST_URL=http://127.0.0.1:8176 WORLD_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node tests/browser/cave.mjs [--shots=<dir>]
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { questSizes } from "./quests-harness.mjs";
const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const base = process.env.WORLD_TEST_URL || "http://127.0.0.1:8176";
const storage = process.env.WORLD_STORAGE || "puerto-colibri";
const shots = process.argv.find((a) => a.startsWith("--shots="))?.slice(8) || process.env.WORLD_SHOTS;
if (shots) mkdirSync(shots, { recursive: true });
/** A quarter of a second of silence (8 kHz, 16 bit, one channel) as a WAV file. */
const SILENCE = (() => { const n = 2000, b = Buffer.alloc(44 + n * 2); b.write("RIFF", 0); b.writeUInt32LE(36 + n * 2, 4); b.write("WAVEfmt ", 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(8000, 24); b.writeUInt32LE(16000, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write("data", 36); b.writeUInt32LE(n * 2, 40); return b; })();
const check = (name, value, detail) => {
  assert(value, `${name}: ${JSON.stringify(detail)}`);
  console.log("ok", name, detail === undefined ? "" : JSON.stringify(detail));
};
const progress = {
  version: 1,
  profile: { name: "Test", gender: "m", lookId: "m1", look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } },
  settings: { v: 5, play: "town", quality: "low", scenes: false, volume: 0, cameraFollow: true },
  sits: {}, phrases: {}, seenIntro: {}, started: 1, place: { zone: "town", x: 28, z: -14.6, rot: Math.PI },
  coach: { done: true, run: true },
};

const browser = await chromium.launch({ channel: process.env.WORLD_BROWSER_CHANNEL || "chromium", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
try {
  for (const [width, height] of questSizes) {
    const phone = width < 500 || height < 500;
    const ctx = await browser.newContext({ viewport: { width, height }, ...(phone ? { deviceScaleFactor: 2, isMobile: true, hasTouch: true } : {}) });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    // (every clip is a quarter of a second of silence: the same run with or without the recordings at hand. Kin's lines
    // are in the clip list, and a dev server without the clips answers with its page, so a clip that could not be
    // played would hold the conversation for a retry)
    await page.route(/\.mp3(\?.*)?$/, (r) => r.fulfill({ status: 200, contentType: "audio/wav", body: SILENCE }));
    // (the saved game is put in once: a reload keeps what the test has done since)
    await page.addInitScript(([k, v, landscape]) => {
      if (landscape) window.SpeechRecognition = class {
        start() { queueMicrotask(() => this.onstart?.()); }
        stop() { this.abort(); }
        abort() { queueMicrotask(() => this.onend?.()); }
      };
      try { sessionStorage.setItem("ew-play-now", "1"); if (sessionStorage.getItem("cave-seeded")) return; sessionStorage.setItem("cave-seeded", "1"); } catch {}
      localStorage.setItem(k, v);
    }, [`${storage}-progress-v1`, JSON.stringify(progress), height === 390]);
    await page.goto(base, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__ew?.store?.getState().screen === "play" && window.__ew.game?.ledges?.ready, null, { timeout: 120000 });
    await page.evaluate(() => { window.__ew.coach?.finish?.(); window.__ew.store.getState().setHud({ panel: null }); });
    const learner = await page.evaluate(() => document.documentElement.lang);
    assert.ok(["en", "lt"].includes(learner));
    if (process.env.VITE_LEARNER) assert.equal(learner, process.env.VITE_LEARNER);
    const label = `pc-${learner}-${width}x${height}`;
    const lt = learner === "lt";
    const snap = async (name) => { if (shots) await page.screenshot({ path: path.join(shots, `cave-${name}-${label}.png`) }); };
    const state = () => page.evaluate(() => {
      const g = window.__ew.game, p = g.player.root.position, st = window.__ew.store.getState();
      return { zone: g.zoneId, x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2), swim: g.swimming, prompt: st.hud.prompt?.kind ?? null, label: st.hud.prompt?.label ?? null, card: st.hud.cave, cave: st.progress.cave ?? null, calls: g.renderer.info.render.calls };
    });
    const press = async () => { if (phone) await page.locator(".act-btn").tap(); else await page.keyboard.press("e"); };
    const go = async (on) => { if (phone) await page.evaluate((v) => window.__ew.game.setJoystick(0, v ? 1 : 0), on); else await page.keyboard[on ? "down" : "up"]("w"); };
    const place = (zone, x, z, rot) => page.evaluate(([zone, x, z, rot]) => { const g = window.__ew.game; g.keys.clear(); g.setJoystick(0, 0); g.enterZone(zone, { x, z, rot }, true); g.rig.yaw = rot; g.rig.snap(); }, [zone, x, z, rot]);

    // ---- in the cenote, swimming towards the cave's mouth at its far side
    await place("town", -137.5, -6, -Math.PI / 2);
    await page.waitForFunction(() => window.__ew.game.swimming, null, { timeout: 15000 });
    await go(true);
    await page.waitForFunction(() => window.__ew.store.getState().hud.prompt?.kind === "enter", null, { timeout: 20000 });
    let s = await state();
    check(`${label}: swimming up to the cave's mouth, the way in is offered`, s.zone === "town" && /Gruta/.test(s.label), s);
    // (swimming on goes in by itself)
    await page.waitForFunction(() => window.__ew.game.zoneId === "gruta", null, { timeout: 20000 });
    await go(false);
    await page.waitForFunction(() => window.__ew.store.getState().hud.fade === 0 && !!window.__ew.store.getState().hud.cave, null, { timeout: 15000 });
    s = await state();
    check(`${label}: in the grotto: its card says the chamber and that Kin comes first`, s.card?.n === 1 && s.card.of === 5 && s.card.open === 1 && /Kin/.test(s.card.next), s);
    check(`${label}: the grotto is light to draw`, s.calls > 3 && s.calls < 40, s.calls);

    // ---- Kin keeps the way: his gate holds until his conversation is talked through
    await go(true);
    await page.waitForFunction(() => window.__ew.store.getState().hud.prompt?.kind === "talk", null, { timeout: 20000 });
    await page.waitForTimeout(2500);
    await go(false);
    s = await state();
    check(`${label}: Kin's gate holds the way`, s.z > -7.6, s);
    await place("gruta", 0.3, -2.5, Math.PI);
    await page.waitForFunction(() => window.__ew.store.getState().hud.prompt?.kind === "talk", null, { timeout: 15000 });
    await press();
    await page.waitForFunction(() => window.__ew.store.getState().conv.active, null, { timeout: 15000 });
    check(`${label}: talking to Kin starts his conversation, off the route`, await page.evaluate(() => { const c = window.__ew.store.getState().conv, g = window.__ew.game; return c.sitId === "x02-alux-kin" && !g.orderedSituations().some((q) => q.id === c.sitId) && g.orderedSituations().length >= 50; }));
    const start = page.locator(".scene-start");
    if (phone) await start.tap(); else await start.click();
    const say = async (text) => {
      await page.waitForFunction(() => window.__ew.store.getState().conv.phase === "you", null, { timeout: 30000 });
      await page.evaluate((t) => window.__ew.game.activeSession.submit(t, [], "typed"), text);
    };
    for (const line of ["Me llamo Test.", "Soy de Canadá.", "Quiero ver la gruta.", "¿Dónde están las piedras?", "Muchas gracias."]) await say(line);
    await page.waitForFunction(() => window.__ew.store.getState().progress.cave?.passed?.includes("kin"), null, { timeout: 30000 });
    await page.evaluate(() => window.__ew.game.closeConversation());
    await page.waitForFunction(() => !window.__ew.store.getState().conv.active, null, { timeout: 15000 });
    s = await state();
    check(`${label}: Kin let the learner pass: saved, and the town's task is as it was`, s.cave.passed.includes("kin") && await page.evaluate(() => !window.__ew.store.getState().progress.sits["x02-alux-kin"]?.completions || window.__ew.game.currentObjective()?.id !== "x02-alux-kin"), s.cave);
    await place("gruta", 0, -6, Math.PI);
    await go(true);
    await page.waitForFunction(() => window.__ew.game.player.root.position.z < -11, null, { timeout: 20000 });
    await go(false);
    // (the state's place is rounded to a tenth: -11.0 is through)
    check(`${label}: and his gate is open`, (await state()).z <= -11);

    // ---- a glyph stone: its card, a wrong meaning, the right one
    const stone = await page.evaluate(() => {
      const g = window.__ew.game;
      g.enterZone("gruta", { x: -6.4, z: -24.5, rot: -Math.PI / 2 }, true);
      return true;
    });
    await page.waitForFunction(() => window.__ew.store.getState().hud.prompt?.kind === "listen", null, { timeout: 20000 });
    await press();
    await page.waitForFunction(() => !!window.__ew.store.getState().hud.glyph, null, { timeout: 12000 });
    await page.locator(".glyph-card").waitFor();
    let q = await page.evaluate(() => window.__ew.store.getState().hud.glyph);
    check(`${label}: the stone's card: its own line about the grotto (stones.ts), three meanings to choose from`, stone && q.text === "El agua guarda la memoria." && q.options.length === 3 && q.options[q.answer] === q.lt && q.text.length > 2 && !q.shown, q);
    check(`${label}: the card is on the screen, its words hidden until asked for`, await page.locator(".glyph-card").count() === 1 && await page.locator(".glyph-text").count() === 0 && await page.locator(".glyph-opt").count() === 3);
    if (height === 390) {
      const card = page.locator(".glyph-card");
      const reachable = async (button) => {
        await button.scrollIntoViewIfNeeded();
        return button.evaluate((el) => {
          const card = el.closest(".glyph-card").getBoundingClientRect(), r = el.getBoundingClientRect();
          const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
          return card.top >= 0 && card.bottom <= innerHeight && r.top >= card.top && r.bottom <= card.bottom && el.contains(hit);
        });
      };
      for (const answer of await card.locator(".glyph-opt").all()) assert.ok(await reachable(answer), `${label}: answer is reachable`);
      const mic = card.getByRole("button", { name: lt ? "Pasakyk tai balsu" : "Say it aloud" });
      check(`${label}: the microphone is reachable by scrolling the card`, await reachable(mic) && await card.evaluate((el) => el.scrollTop > 0));
      await snap("microphone");
      check(`${label}: Close is reachable at the top of the card`, await reachable(card.getByRole("button", { name: lt ? "Uždaryti" : "Close", exact: true })));
    }
    await page.locator(".glyph-opt").nth((q.answer + 1) % 3).click();
    await page.waitForFunction(() => window.__ew.store.getState().hud.glyph?.wrong.length === 1, null, { timeout: 10000 });
    check(`${label}: a wrong meaning: struck out, the words shown, the stone still waits`, await page.evaluate(() => { const g = window.__ew.store.getState().hud.glyph; return g.shown && !g.solved && !(window.__ew.store.getState().progress.cave?.lit ?? []).length; }));
    await page.evaluate(() => {
      const { audio, store } = window.__ew;
      const play = audio.play, stop = audio.stop;
      const replay = window.__stoneReplay = { solvedAt: 0, started: 0, finished: 0, stopped: 0, timer: null, finish: null };
      const off = store.subscribe(({ hud }) => {
        if (hud.glyph?.solved) { replay.solvedAt = performance.now(); off(); }
      });
      audio.play = function (voice, speed, phrase, options) {
        const glyph = store.getState().hud.glyph;
        if (!options?.optional || !glyph?.solved || glyph.text !== phrase) return play.call(this, voice, speed, phrase, options);
        this.stop();
        replay.started = performance.now();
        replay.finished = 0;
        return new Promise((resolve) => {
          replay.finish = resolve;
          const finish = () => {
            const left = replay.started + 1100 - performance.now();
            if (left > 0) { replay.timer = setTimeout(finish, left); return; }
            replay.finished = performance.now();
            replay.finish = null;
            resolve(true);
          };
          replay.timer = setTimeout(finish, 1100);
        });
      };
      audio.stop = function () {
        if (replay.finish) {
          clearTimeout(replay.timer);
          replay.stopped++;
          replay.finish(false);
          replay.finish = null;
        }
        return stop.call(this);
      };
    });
    await page.locator(".glyph-opt").nth(q.answer).click();
    await page.waitForFunction(() => window.__ew.store.getState().progress.cave?.lit?.includes("agua-1"), null, { timeout: 10000 });
    await page.waitForFunction(() => {
      const { solvedAt } = window.__stoneReplay;
      return solvedAt > 0 && performance.now() - solvedAt >= 3950;
    }, null, { timeout: 10000, polling: 20 });
    await page.keyboard.press("r");
    await page.waitForFunction(() => performance.now() - window.__stoneReplay.solvedAt > 4250);
    check(`${label}: R near the former deadline plays while the solved card remains visible`,
      await page.evaluate(() => {
        const { started, solvedAt, finish } = window.__stoneReplay;
        return started - solvedAt >= 3950 && started - solvedAt < 4200 && !!finish && window.__ew.store.getState().hud.glyph?.solved;
      }));
    assert.equal(await page.locator(".glyph-card.solved h2").textContent(), lt ? "Akmuo užsidegė!" : "The stone is lit!");
    assert.equal(await page.locator(`.glyph-line .nat[lang="${learner}"]`).textContent(), lt ? "Vanduo saugo atmintį." : "The water keeps the memory.");
    await snap("solved-replay");
    await page.evaluate(() => window.__stoneReplay.captured());
    await page.waitForFunction(() => window.__stoneReplay.finished > 0, null, { timeout: 5000 });
    check(`${label}: the replay played all 1100 ms without interruption`, await page.evaluate(() => {
      const { started, finished, stopped } = window.__stoneReplay;
      return finished - started >= 1100 && stopped === 0 && window.__ew.store.getState().hud.glyph?.solved;
    }));
    await page.waitForFunction(() => performance.now() - window.__stoneReplay.finished > 900);
    check(`${label}: the card is visible past the former 800 ms playback tail`, await page.locator(".glyph-card.solved").isVisible());
    if (phone) await page.locator(".glyph-x").tap(); else await page.keyboard.press("Escape");
    await page.waitForFunction(() => !window.__ew.store.getState().hud.glyph, null, { timeout: 5000 });
    s = await state();
    check(`${label}: the right one: the stone is lit, the card says two are left`, s.cave.lit.length === 1 && s.card.lit === 1, s.card);

    // ---- the gate to the second chamber: the chamber's own three stones are its key (nothing from the town: this
    // learner has finished no conversation there)
    await page.evaluate(() => {
      const { store, game: g } = window.__ew;
      store.getState().updateProgress((p) => { p.cave.lit = ["agua-1", "agua-2"]; });
      g.enterZone("gruta", { x: -7.4, z: -43.2, rot: Math.PI }, true);
    });
    await go(true);
    await page.waitForTimeout(2500);
    await go(false);
    s = await state();
    check(`${label}: two of the three stones lit: the gate stays shut, and the card says one stone is left`, s.z > -48.5 && s.card.lit === 2 && /1/.test(s.card.next) && s.card.open === 1, s);
    // the third stone, answered on its card as before: in front of it, by the falls
    await page.evaluate(() => window.__ew.game.enterZone("gruta", { x: 2.05, z: -37.6, rot: Math.PI + 0.25 }, true));
    await page.waitForFunction(() => window.__ew.store.getState().hud.prompt?.kind === "listen", null, { timeout: 20000 });
    await press();
    await page.waitForFunction(() => !!window.__ew.store.getState().hud.glyph, null, { timeout: 12000 });
    q = await page.evaluate(() => window.__ew.store.getState().hud.glyph);
    await page.locator(".glyph-opt").nth(q.answer).click();
    await page.waitForFunction(() => window.__ew.store.getState().progress.cave?.lit?.includes("agua-3"), null, { timeout: 10000 });
    await page.evaluate(() => {
      const cave = window.__ew.game.cave, gates = cave.hooks.gates;
      window.__stoneReplay.unlocks = 0;
      cave.hooks.gates = (...args) => { window.__stoneReplay.unlocks++; return gates?.(...args); };
    });
    await page.locator(".glyph-play").click();
    await page.waitForFunction(() => !!window.__stoneReplay.finish);
    await page.locator(".glyph-x").click();
    check(`${label}: the close button stops a replay mid-phrase and dismisses the card`,
      await page.evaluate(() => !window.__ew.store.getState().hud.glyph && !window.__stoneReplay.finish && window.__stoneReplay.stopped === 1));
    const openingMessage = page.locator(".toast p").filter({ hasText: lt ? /Kelias atviras.*El Jardín de Raíces/i : /The way is open.*El Jardín de Raíces/i });
    await openingMessage.waitFor({ timeout: 20000 });
    if (shots) await openingMessage.evaluate((el) => Promise.all(el.closest(".toast").getAnimations().map((a) => a.finished)));
    await snap("chamber-opening");
    // (the card catches up once the stone's card has gone)
    await page.waitForFunction(() => window.__ew.store.getState().hud.cave?.open === 2, null, { timeout: 15000 });
    await page.waitForTimeout(4300);
    check(`${label}: the unlock count is still one after 4300 ms`, await page.evaluate(() => window.__stoneReplay.unlocks === 1));
    s = await state();
    check(`${label}: the third stone lit: the way is open at once, with nothing of the town's route finished (Kin's own conversation is off it)`, s.cave.lit.length === 3 && s.card.open === 2 && await page.evaluate(() => { const sits = window.__ew.store.getState().progress.sits; return !window.__ew.game.orderedSituations().some((q) => sits[q.id]?.completions); }), s.card);
    await page.evaluate(() => window.__ew.game.enterZone("gruta", { x: -7.4, z: -43.2, rot: Math.PI + 0.43 }, true));
    await go(true);
    await page.waitForFunction(() => window.__ew.game.player.root.position.z < -49, null, { timeout: 20000 });
    await go(false);
    s = await state();
    check(`${label}: and through it: on into the garden of roots`, s.z < -49 && s.card.open === 2, s);

    // ---- back out the way one came
    await place("gruta", 0, 4.2, 0);   // (within the way out's reach: 2.6 m of the water one came through)
    await page.waitForFunction(() => window.__ew.store.getState().hud.prompt?.kind === "exit", null, { timeout: 15000 });
    await go(true);
    await page.waitForFunction(() => window.__ew.game.zoneId === "town", null, { timeout: 20000 });
    await go(false);
    await page.waitForFunction(() => window.__ew.store.getState().hud.fade === 0, null, { timeout: 15000 });
    await page.waitForTimeout(600);
    s = await state();
    check(`${label}: back in the cenote's water by the cave's mouth, the grotto's card gone`, s.zone === "town" && s.swim && !s.card && Math.hypot(s.x + 139, s.z + 6) < 4, s);
    // (and the place is remembered: a reload down there comes back down there)
    await place("gruta", -3, -30, Math.PI);
    await page.waitForTimeout(400);
    await page.evaluate(() => window.__ew.game.savePlace());
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__ew?.store?.getState().screen === "play" && window.__ew.game?.zoneId, null, { timeout: 120000 });
    s = await state();
    check(`${label}: reloaded in the grotto: still there, its stones and gates as left`, s.zone === "gruta" && s.cave.lit.length === 3 && s.cave.passed.includes("kin"), { zone: s.zone, cave: s.cave });
    check(`${label}: no page errors`, errors.length === 0, errors);
    await ctx.close();
  }
  console.log("cave: all checks passed");
} finally {
  await browser.close();
}
