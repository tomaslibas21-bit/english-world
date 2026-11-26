// Run against each production checkout, on the same idle device. See RESULT-townhall.md.
import assert from "node:assert/strict";
import { openTown } from "./screen-harness.mjs";

const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({
  executablePath: process.env.WORLD_CHROMIUM, args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"],
});
try {
  // Desktop emulation at phone dimensions keeps DPR at 1, matching the initial review.
  const { page } = await openTown(browser, 390, 844, false);
  await page.evaluate(() => {
    const g = window.__ew.game;
    g.setObjective("s72-cafe");
    g.enterZone("town", { x: 90, z: 43.6, rot: 0 }, true);
    const r = g.rig;
    r.stage = { pos: r.target.clone().set(83, 5.4, 31), look: r.target.clone().set(90, 3.7, 51), rate: 1000, fov: 55 };
    r.mode = "stage";
  });
  const hasHall = await page.evaluate(() => window.__ew.game.town.doors.some(d => d.loc === "town-hall"));
  for (const id of ["town", ...(hasHall ? ["town-hall"] : []), "post-office"]) {
    if (id !== "town") await page.evaluate(zone => window.__ew.game.enterZone(zone, undefined, true), id);
    await page.waitForFunction(zone => window.__ew.game.zone.id === zone && !window.__ew.game.transitioning, id);
    await page.waitForTimeout(3200);
    const data = await page.evaluate(async () => {
      const g = window.__ew.game, renderer = g.renderer, camera = g.rig.cam;
      let meshes = 0, triangles = 0;
      const textures = new Set();
      g.zone.group.traverse(o => {
        if (!o.isMesh) return;
        meshes++;
        triangles += (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1);
        for (const material of [].concat(o.material)) {
          for (const field of Object.values(material)) if (field?.isTexture) textures.add(field);
        }
      });
      const frame = () => new Promise(done => requestAnimationFrame(done));
      const samples = [];
      for (let sample = 0; sample < 3; sample++) {
        let last = await frame();
        const intervals = [];
        for (let i = 0; i < 65; i++) {
          const next = await frame();
          intervals.push(next - last);
          last = next;
        }
        intervals.sort((a, b) => a - b);
        samples.push({ p95ms: Number(intervals[Math.ceil(.95 * intervals.length) - 1].toFixed(1)),
          calls: renderer.info.render.calls, triangles: renderer.info.render.triangles });
      }
      return { preset: window.__ew.store.getState().settings.quality, dpr: renderer.getPixelRatio(),
        camera: camera.position.toArray().map(n => Number(n.toFixed(3))),
        meshes, triangles, materialTextures: textures.size, samples };
    });
    assert.equal(data.preset, "low"); assert.equal(data.dpr, 1);
    console.log(id, JSON.stringify(data));
  }
} finally { await browser.close(); }
