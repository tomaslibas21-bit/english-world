// WORLD_TEST_URL=http://127.0.0.1:8176 node tests/browser/talk-framing-continuity.mjs
// The chain runs this alongside the fixed subset. This probe samples rendered
// frames in place and keeps its evidence under .b6/audit/continuity-mh/.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { CHECKS, measureTalk, measurementConfig } from "../../tools/talk-framing-measure.mjs";
import {
  INTRO_START, before, launchBrowser, openContext, remaining, seedFramingPage, talkIsClosed, worldConfig,
} from "../../tools/talk-framing-browser.mjs";

function installTrace({ source, portrait, wide }) {
  const measure = new Function(`return (${source})`)();
  const { game, store, audio } = window.__ew;
  const { renderer, rig } = game;
  const render = renderer.render;
  const play = audio.play;
  const trace = window.__talkTrace = { groups: {}, parked: true };
  const settle = new Set([0, 6, 21, 60]);
  let oldLook, lookIdentity = 0;
  const rect = (el) => {
    const box = el?.getBoundingClientRect();
    return box ? [box.x, box.y, box.width, box.height] : null;
  };

  audio.play = function (...args) {
    const { conv } = store.getState();
    if (conv.sitId !== trace.id || !conv.active || conv.speaking == null) return play.apply(this, args);
    if (trace.advance && conv.npcId !== "marco") return Promise.resolve(true);
    return new Promise((resolve) => {
      const release = (ok) => { off(); trace.release = null; resolve(ok); };
      const off = store.subscribe(({ conv: current }) => {
        if (!current.active || current.run !== conv.run) release(false);
      });
      trace.release = release;
    });
  };

  renderer.render = function (scene, camera) {
    const answer = render.call(this, scene, camera);
    if (trace.parked || scene !== game.scene || camera !== rig.cam) return answer;
    const { conv, settings } = store.getState();
    const panel = document.querySelector(".convo");
    if (conv.active && (conv.sitId !== trace.id || !panel)) return answer;
    if (!conv.active && !trace.groups.entry) return answer;
    if (trace.phase === "rotation" && innerWidth !== 844) return answer;
    if (document.querySelector(".scene-backdrop")) return answer;
    if (rig.talk?.look !== oldLook) { oldLook = rig.talk?.look; lookIdentity++; }
    const phase = !conv.active ? "return" : trace.phase ?? (conv.npcId === "marco" ? "marco" : "entry");
    const chunk = trace.groups[phase] ??= { start: renderer.info.render.frame, rows: [] };
    const { calls, frame } = renderer.info.render;
    const offset = frame - chunk.start;
    if (!settle.has(offset) && !trace.mark) return answer;
    const { view } = camera;
    const row = {
      at: trace.mark ?? offset, frame, time: game.t, mode: rig.mode, speaker: conv.active ? conv.npcId : null,
      intro: conv.introOpen, speaking: conv.speaking, quality: settings.quality, calls,
      canvas: rect(renderer.domElement), panel: rect(panel), layout: game.talkLayout,
      position: camera.position.toArray(), look: rig.presentedLook.toArray(), lookIdentity,
      target: rig.talk?.pos.toArray() ?? null, fov: camera.fov, near: camera.near,
      view: view?.enabled ? { ...view } : null,
    };
    const config = innerWidth < 768 && innerWidth < innerHeight ? portrait : wide;
    if (conv.active) row.measured = measure({ ...config, snapshot: true });
    chunk.rows.push(row);
    trace.mark = null;
    return answer;
  };
}

const config = worldConfig();
assert.equal(config.storage, "english-world", "the continuity route uses Lucia and Marco in Maple Harbor");
const out = new URL("../../.b6/audit/continuity-mh/", import.meta.url);
const deadline = Date.now() + 240_000;
const rows = [];
const errors = [];
const browser = await launchBrowser(remaining(deadline));
try {
  for (const size of [{ width: 390, height: 844 }, { width: 1280, height: 800 }]) {
    const touch = size.width === 390;
    const context = await openContext(browser, size, touch, config.url);
    try {
      const page = await context.newPage();
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() !== "error") return;
        if (/\.mp3(?:[?#]|$)/.test(message.location().url) && /Failed to load resource.*\b404\b/.test(message.text())) return;
        errors.push(message.text());
      });
      await seedFramingPage(page, config.storage, { quietTexts: true });
      await page.goto(config.url.href, { waitUntil: "domcontentloaded", timeout: remaining(deadline) });
      const wait = (fn, arg) => page.waitForFunction(fn, arg, { timeout: remaining(deadline), polling: 40 });
      await wait(() => {
        const { game, store } = window.__ew ?? {};
        return store?.getState().screen === "play" && !!game?.renderer && !game.transitioning;
      });
      await page.evaluate(installTrace, {
        source: measureTalk.toString(), portrait: measurementConfig({ width: 390, height: 844 }),
        wide: measurementConfig({ width: 1280, height: 800 }),
      });
      const waitFrames = (phase) => wait((phase) => window.__talkTrace.groups[phase]?.rows.some((row) => row.at === 60), phase);
      const mark = async (label, phase) => {
        await page.evaluate((label) => { window.__talkTrace.mark = label; }, label);
        await wait(([label, phase]) => window.__talkTrace.groups[phase]?.rows.some((row) => row.at === label), [label, phase]);
      };
      for (const id of ["s73-restaurant", "s78-bank"]) {
        const route = { size, id, close: null, groups: {} };
        rows.push(route);
        try {
          await page.evaluate((id) => {
            Object.assign(window.__talkTrace, { id, parked: false, groups: {}, phase: null, mark: null, advance: false, release: null });
            window.__ew.game.startScenario(id);
          }, id);
          await wait(() => window.__ew.store.getState().conv.active && !!document.querySelector(".convo"));
          const intro = page.locator(".scene-intro, .intro-card");
          const start = intro.getByRole("button", { name: INTRO_START });
          const button = (await start.count() ? start : intro.locator("button.btn")).first();
          if (await button.isVisible()) {
            const options = { timeout: Math.min(remaining(deadline), 2500) };
            if (touch) await button.tap(options);
            else await button.click(options);
          }
          await wait(() => !!window.__talkTrace.release && !window.__ew.store.getState().conv.introOpen);
          await waitFrames("entry");
          await mark("held", "entry");

          if (id === "s73-restaurant") {
            await page.evaluate(() => {
              window.__talkTrace.advance = true;
              window.__talkTrace.release(true);
            });
            // Let the real session seat the guest and hand the line to Marco.
            const answers = {
              resv: "No, we don't have a reservation.", party: "Two people, please.", seatpref: "Inside, please.",
              wait: "Yes, we can wait.", resv_name: "The reservation is under Test.",
            };
            for (let i = 0; i < 5; i++) {
              await wait(() => {
                const { conv } = window.__ew.store.getState();
                return conv.phase === "you" || conv.npcId === "marco";
              });
              const step = await page.evaluate(() => {
                const { conv } = window.__ew.store.getState();
                return conv.npcId === "marco" ? "marco" : conv.stepId;
              });
              if (step === "marco") break;
              assert(answers[step], `unexpected restaurant step ${step}`);
              await before(deadline, "submitting the restaurant answer", () => page.evaluate((answer) => {
                void window.__ew.game.activeSession.submit(answer);
              }, answers[step]));
            }
            await waitFrames("marco");
            await mark("held", "marco");
            if (touch) {
              await page.evaluate(() => {
                window.__talkTrace.phase = "panel resize";
                const panel = document.querySelector(".convo");
                panel.style.top = `${panel.getBoundingClientRect().top - 25}px`;
              });
              await waitFrames("panel resize");
              await page.evaluate(() => {
                window.__talkTrace.phase = "rotation";
                document.querySelector(".convo").style.removeProperty("top");
              });
              await page.setViewportSize({ width: 844, height: 390 });
              await waitFrames("rotation");
            } else {
              const chip = page.locator(".view-chip button");
              await chip.click({ timeout: remaining(deadline) });
              await page.locator(".scene-backdrop").waitFor({ timeout: remaining(deadline) });
              await page.evaluate(() => { window.__talkTrace.phase = "picture return"; });
              await chip.click({ timeout: remaining(deadline) });
              await waitFrames("picture return");
            }
          }

          route.close = await page.evaluate(() => {
            const { game, store } = window.__ew;
            game.closeConversation();
            return { active: store.getState().conv.active, mode: game.rig.mode, viewEnabled: !!game.rig.cam.view?.enabled };
          });
          await wait(talkIsClosed, 0);
          await waitFrames("return");
        } finally {
          route.groups = await page.evaluate(async () => {
            if (!window.__talkTrace) return {};
            const trace = window.__talkTrace;
            trace.parked = true;
            const result = {};
            for (const [phase, { rows }] of Object.entries(trace.groups)) {
              result[phase] = await Promise.all(rows.map(async (row) => ({ ...row, measured: await row.measured })));
            }
            return result;
          }).catch(() => ({}));
        }
        assert.deepEqual(route.close, { active: false, mode: "interior", viewEnabled: false });
        if (touch && id === "s73-restaurant") await page.setViewportSize(size);
      }
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
  await mkdir(out, { recursive: true });
  await writeFile(new URL("trace.json", out), JSON.stringify({ rows, errors }, null, 2) + "\n");
}
assert.deepEqual(errors, []);
for (const { id, groups } of rows) {
  for (const [phase, frames] of Object.entries(groups)) {
    for (const row of frames) {
      assert(row.calls > 0 && row.quality === "low", `${id} ${phase} ${row.at} was rendered at low quality`);
      if (phase === "return") continue;
      const where = `${id} ${row.canvas[2]}×${row.canvas[3]} ${phase} ${row.at}`;
      assert.equal(row.measured?.landmarks?.length, 9, where);
      for (const point of row.measured.landmarks) assert(point.inDepth && point.inOpening, `${where}: ${point.name}`);
      for (const name of CHECKS) assert.equal(row.measured.checks[name].status, "PASS", `${where}: ${row.measured.checks[name].reason}`);
    }
  }
}
console.log(`PASS · ${rows.length} continuous talk routes · ${out.pathname}trace.json`);
