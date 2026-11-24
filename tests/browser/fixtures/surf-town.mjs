import assert from "node:assert/strict";

export const HARBOR_START = { x: -104.2, z: -69.9, r: 2.6, rot: Math.PI };

export const SEEDED_RANDOM = `
  let seed = 20261115;
  Math.random = function () { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
`;

export async function readSurfIntro(page) {
  await page.waitForFunction(() => {
    const { conv } = window.__ew.store.getState();
    return conv.phase === "you" || !!document.querySelector(".intro-card button.btn, .scene-intro button.btn");
  }, null, { polling: 50, timeout: 20000 });
  const intro = page.locator(".intro-card button.btn:visible, .scene-intro button.btn:visible").first();
  if (await intro.isVisible()) await intro.click({ timeout: 5000 });
  await page.waitForFunction(() => window.__ew.store.getState().conv.phase === "you", null, { polling: 50, timeout: 20000 });
}

export const readSurfPlayer = (page) => page.evaluate(() => {
  const { game } = window.__ew, { player, rig } = game;
  const { x, y, z } = player.root.position;
  return { actor: player.root.uuid, visible: player.root.visible, x, y, z, swimming: game.swimming,
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
