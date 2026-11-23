import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const loading = ".ew-loading, .road-loading, .sea-loading";
const difference = (a, b) => Math.hypot(...a.map((n, i) => n - b[i]));
const angle = (a, b) => 2 * Math.acos(Math.min(1, Math.abs(a.reduce((n, q, i) => n + q * b[i], 0)))) * 180 / Math.PI;

export function assertRoadContinuity(first) {
  assert.equal(first.elapsed, 0);
  assert.equal(first.roadPosition, 0);
  assert.ok(Math.abs(first.gateDistance - 75) < 0.001);
  const { town, road } = first.continuity;
  for (const key of ["car", "rider", "camera"]) assert.ok(difference(town[key], road[key]) <= 0.01, `${key} moved at the crest`);
  for (const key of ["rotation", "carRotation"]) assert.ok(angle(town[key], road[key]) <= 0.1, `${key} changed at the crest`);
  assert.ok(Math.abs(town.fov - road.fov) <= 0.1);
  assert.deepEqual(road.viewOffset, town.viewOffset);
  assert.ok(difference(town.roof, road.roof) <= 1, "the roof stays registered");
  for (let i = 0; i < 2; i++) assert.ok(difference(town.posts[i], road.posts[i]) <= 1, `verge post ${i} stays registered`);
}

export async function assertWorldFrame(page, previous, state, drawLimit, label, shots) {
  const image = await page.screenshot({ scale: "css" });
  try {
    assert.equal(state.presented.serial, previous.presented.serial + 1, "one presented world per step");
    assert.ok(state.presented.scene === "town" || state.presented.scene === "road");
    assert.ok(state.drawCalls > 0, "the presented world made draw calls");
    if (state.presented.scene === "road" && state.elapsed === 0) assertRoadContinuity(state);
    if (state.presented.scene === "road") assert.ok(state.drawCalls <= drawLimit, `road draw calls ${state.drawCalls}`);
    assert.equal(await page.locator(loading).count(), 0);
    assert.ok(await page.locator(".fade").evaluate((node) => Number(getComputedStyle(node).opacity) < 0.01));
    const contrast = await page.evaluate(async ({ data, firstAsphalt }) => {
      const bytes = Uint8Array.from(atob(data), (value) => value.charCodeAt(0));
      const image = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
      const canvas = new OffscreenCanvas(image.width, image.height);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(image, 0, 0);
      image.close();
      const w = canvas.width, h = canvas.height;
      const median = (x, y) => {
        const pixels = ctx.getImageData(Math.round(Math.min(w - 3, Math.max(2, x))) - 2,
          Math.round(Math.min(h - 3, Math.max(2, y))) - 2, 5, 5).data;
        return [0, 1, 2].map((channel) => Array.from({ length: 25 }, (_, i) => pixels[4 * i + channel]).sort((a, b) => a - b)[12]);
      };
      // Use positions on both sides of the projected roof, with room clear of the HUD and touch controls.
      const { game, road } = window.__ew;
      const state = road.state(), frame = state.carFrame;
      const car = game.rides.riding.mesh.position;
      const town = car.clone().project(game.rig.cam);
      const carX = frame ? (frame.left + frame.right) / 2 * w : (town.x + 1) / 2 * w;
      const carY = frame ? (frame.top + frame.bottom) / 2 * h : (1 - town.y) / 2 * h;
      const y = Math.min(h * 0.75, Math.max(h * 0.50, carY + 10));
      const asphalt = firstAsphalt ?? [carX + (carX > w / 2 ? -1 : 1) * w * 0.15, y];
      return Math.max(...[0.17, 0.83].map((x) => {
        const sky = median(w * x, h * 0.23);
        const road = median(...asphalt);
        return Math.max(...sky.map((value, i) => Math.abs(value - road[i])));
      }));
    }, { data: image.toString("base64"), firstAsphalt: state.elapsed === 0 ? state.continuity?.road.asphalt : undefined });
    assert.ok(contrast >= 12, `sky and road contrast only ${contrast} RGB levels`);
  } catch (error) {
    const dir = shots ?? join(tmpdir(), "road-browser-failures");
    await mkdir(dir, { recursive: true });
    const file = join(dir, `${label}-first-failing-handoff.png`);
    await writeFile(file, image);
    throw new Error(`${error.message}; saved ${file}`, { cause: error });
  }
}
