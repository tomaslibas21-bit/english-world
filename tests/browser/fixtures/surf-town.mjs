import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { ARROW_BITS } from "../../../src/game/surf/controls.ts";

export const HARBOR_START = { x: -104.2, z: -69.9, r: 2.6, rot: Math.PI };

export const SEEDED_RANDOM = `
  let seed = 20261115;
  Math.random = function () { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
`;

export const readConversationState = (page, frames = 0) => page.evaluate((frames) => {
  if (frames) window.__step(frames);
  const { game, store } = window.__ew;
  const { active, sitId, phase, introOpen, completed, run } = store.getState().conv;
  return { activeSessionId: game.activeSession?.sit.id ?? null, sessionActive: !!game.activeSession?.active,
    conv: { active, sitId, phase, introOpen, completed, run } };
}, frames);

export async function waitForLearnerTurn(page, id) {
  const convo = page.locator(".convo");
  const start = convo.locator(".intro-card, .scene-intro").getByRole("button", { name: "Pradėti", exact: true });
  const read = convo.locator(".audio-recovery").getByRole("button", { name: "Tęsti skaitant", exact: true });
  const deadline = Date.now() + 20000;
  let sample, run;
  do {
    sample = await readConversationState(page, 3);
    const { conv } = sample;
    if (sample.sessionActive && sample.activeSessionId === id && conv.active && conv.sitId === id
      && (run === undefined || conv.run === run)) {
      run = conv.run;
      if (conv.phase === "you" && !conv.introOpen) return run;
      // If a stubbed recording fails, continue through the transcript's normal recovery action.
      const action = conv.introOpen ? start : read;
      if (await action.isVisible()) await action.click({ timeout: Math.max(1, Math.min(5000, deadline - Date.now())) });
    }
    await delay(50);
  } while (Date.now() < deadline);
  assert.fail(`Expected ${id} to reach its first learner turn: ${JSON.stringify(sample)}`);
}

export const readSurfIntro = (page) => waitForLearnerTurn(page, "x04-surf");

export async function waitForSurfLesson(page, level, label) {
  let deadline = Date.now() + 5000;
  let arrived = false;
  let sample;
  do {
    sample = await page.evaluate((level) => {
      const { game, store, surf } = window.__ew, { renderer, rig } = game;
      const render = renderer.info.render, previousFrame = render.frame;
      const fade = document.querySelector(".fade");
      const opacity = fade ? Number(getComputedStyle(fade).opacity) : null;
      const fadeClear = store.getState().hud.fade === 0 && opacity === 0;
      // Keep the intro clock still while the CSS fade finishes after the game releases its guard.
      if (!game.surf.logic || game.transitioning || fadeClear) window.__step(fadeClear ? 1 : 2);
      const { hud } = store.getState(), { logic, scene } = game.surf;
      const { active, picking, over } = surf.getState();
      const { transitioning, presentedWorld } = game;
      const owns = game.modes.owns("surf") && game.modes.active === game.surf;
      const frame = render.frame, mode = rig.mode;
      const fresh = frame > previousFrame && render.calls > 0 && render.triangles > 0
        && presentedWorld?.serial === frame && presentedWorld.scene === "town";
      const ready = logic?.level === level && logic.phase === "intro" && active && !picking && !over
        && owns && hud.ride === "surf" && hud.panel === null && !transitioning && fadeClear && hud.fade === 0
        && mode === "stage" && !!rig.stage && rig.stage === scene?.cam && fresh;
      return { ready, level: logic?.level ?? null, phase: logic?.phase ?? null, active, picking, over,
        owns, hud: { ride: hud.ride, panel: hud.panel, fade: hud.fade }, transitioning, opacity, frame, previousFrame, mode, fresh };
    }, level);
    if (sample.ready) return;
    if (!arrived && sample.level === level) {
      arrived = true;
      deadline = Date.now() + 5000;
    }
    await delay(25);
  } while (Date.now() < deadline);
  assert.fail(`${label}: ${level} surf lesson never presented an interactive stage frame: ${JSON.stringify(sample)}`);
}

export async function waitForSurfPad(page, directions) {
  const expectedMask = directions.reduce((mask, dir) => mask | ARROW_BITS[dir], 0);
  const deadline = Date.now() + 1000;
  let sample;
  do {
    sample = await page.evaluate(() => {
      const pad = document.querySelector(".surf-pad");
      const pressed = Array.from(pad?.querySelectorAll("[aria-pressed=true]") ?? [], (el) => {
        const { width, height } = el.getBoundingClientRect();
        return el.matches("button") && width > 0 && height > 0 && getComputedStyle(el).visibility === "visible" ? el.dataset.dir : null;
      });
      return { mask: window.__ew.surf.getState().pressed, pressed,
        left: pad?.querySelector("[data-dir=left]")?.getAttribute("aria-pressed") ?? null,
        right: pad?.querySelector("[data-dir=right]")?.getAttribute("aria-pressed") ?? null,
        asked: pad?.querySelectorAll(".ask").length ?? 0 };
    });
    const ready = sample.mask === expectedMask && sample.pressed.length === directions.length
      && directions.every((dir) => sample.pressed.includes(dir))
      && sample.left === String(directions.includes("left")) && sample.right === String(directions.includes("right"));
    // SurfPlay writes the mask synchronously. Only the DOM commit can still be pending.
    if (ready || sample.mask !== expectedMask) return { ...sample, expectedMask, ready };
    await delay(25);
  } while (Date.now() < deadline);
  return { ...sample, expectedMask, ready: false };
}

export const readSurfPlayer = (page) => page.evaluate(() => {
  const { game } = window.__ew, { player, rig } = game;
  const { x, y, z } = player.root.position;
  // The walking root anchors the camera and shadow. Character.update applies lift to the body.
  return { actor: player.root.uuid, visible: player.root.visible, x, y, z, displayedY: y + player.lift, air: game.hop.air, swimming: game.swimming,
    backpack: player.backpackVisible, outfit: game.outfit, rash: player.look.rash ?? false, swim: player.look.swim ?? null,
    mode: rig.mode, stage: !!rig.stage, camera: rig.cam.position.toArray() };
});

export async function sampleSurfRender(page, camera) {
  const { width, height } = page.viewportSize();
  const { quality, samples } = await page.evaluate(() => {
    const { game, store } = window.__ew;
    const render = game.renderer.info.render;
    const samples = Array.from({ length: 3 }, () => {
      const previousFrame = render.frame;
      window.__step(1);
      return { mode: game.rig.mode, frame: render.frame, previousFrame, calls: render.calls, triangles: render.triangles };
    });
    return { quality: store.getState().settings.quality, samples };
  });
  const label = `${width}x${height} ${camera} quality=${quality} baseline=unmatched`;
  console.log(`surf draw calls ${label} ${JSON.stringify(samples)}`);
  assert.ok(samples.every(({ frame, previousFrame, calls, triangles }) => frame > previousFrame && calls > 0 && triangles > 0),
    `${label} each step presents fresh geometry`);
}
