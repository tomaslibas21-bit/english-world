import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const loading = ".ew-loading, .road-loading, .sea-loading";
const difference = (a, b) => Math.hypot(...a.map((n, i) => n - b[i]));
const angle = (a, b) => 2 * Math.acos(Math.min(1, Math.abs(a.reduce((n, q, i) => n + q * b[i], 0)))) * 180 / Math.PI;
const referenceDraws = new WeakMap();

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

export function assertCameraSettle(frames) {
  const start = frames[0], end = frames.at(-1);
  assert.equal(start.elapsed, 0);
  assert.ok(end.elapsed >= 1.6 - 1e-6 && end.elapsed <= 1.6 + 1 / 60 + 1e-6, "samples through the 1.6 s settle");
  const minWidth = 0.95 * Math.min(start.settleFrame.chassisWidth, end.settleFrame.chassisWidth);
  const roofTop = Math.min(start.settleFrame.roofY, end.settleFrame.roofY) - 0.02;
  const roofBottom = Math.max(start.settleFrame.roofY, end.settleFrame.roofY) + 0.02;
  for (let i = 1; i < frames.length; i++) {
    const { elapsed, settleFrame: { chassisWidth, roofY, horizonY } } = frames[i];
    assert.ok(Math.abs(elapsed - frames[i - 1].elapsed - 1 / 60) < 1e-6, "samples at 16.7 ms");
    assert.ok(chassisWidth >= minWidth, `chassis width ${chassisWidth} < ${minWidth} at ${elapsed}s`);
    assert.ok(roofY >= roofTop && roofY <= roofBottom, `roof at ${roofY} leaves [${roofTop}, ${roofBottom}] at ${elapsed}s`);
    assert.ok(Math.abs(horizonY - frames[i - 1].settleFrame.horizonY) <= 0.01, `level horizon jumps at ${elapsed}s`);
  }
}

async function groundPatches(page, near) {
  return page.evaluate((near) => {
    const { game } = window.__ew;
    const { view, track, car } = game.modes.get("road").mode.run;
    const camera = view.camera, ray = new game.raycaster.constructor();
    const ndc = camera.position.clone();
    const pieces = [...track.pieces.values()];
    const meshes = pieces.map(({ mesh }) => mesh);
    const hud = [...document.querySelectorAll(".road-header, .road-mode .joy, .road-mode .brake-btn, .road-mode .drive-horn, .road-controls")]
      .map((node) => node.getBoundingClientRect());
    const ground = (x, y, side) => {
      ray.setFromCamera(ndc.set(x / innerWidth * 2 - 1, 1 - y / innerHeight * 2, 0), camera);
      const hit = ray.intersectObjects(meshes, false)[0];
      if (!hit) return false;
      const piece = pieces.find(({ mesh }) => mesh === hit.object);
      const vertex = hit.faceIndex * 3;
      const s = -hit.point.z;
      const t = Math.max(0, Math.min(1, s / 50));
      const xFromRoad = hit.point.x - (7 * Math.sin(s / 55) + 3 * Math.sin(s / 24)) * t * t * (3 - 2 * t);
      return (vertex < piece.vergeVertices || vertex >= piece.terrainStart)
        && xFromRoad * side >= 8.4 && xFromRoad * side < 34 && (!near || Math.abs(car.s - s) <= 32);
    };
    return [-1, 1].map((side) => {
      const points = [];
      for (let yf = 0.96; yf >= 0.36; yf -= 0.025) {
        for (const xf of [0.04, 0.12, 0.20, 0.28, 0.36, 0.42]) {
          const x = Math.round(innerWidth * (side < 0 ? xf : 1 - xf)), y = Math.round(innerHeight * yf);
          if (hud.some((r) => x + 2 >= r.left && x - 2 <= r.right && y + 2 >= r.top && y - 2 <= r.bottom)) continue;
          if (ground(x, y, side) && [-2, 2].every((dx) => [-2, 2].every((dy) => ground(x + dx, y + dy, side)))) {
            points.push([x, y]);
            if (points.length === 2) return points;
          }
        }
      }
      return points;
    });
  }, near);
}

async function patchColors(page, image, points) {
  return page.evaluate(async ({ data, points }) => {
    const png = Uint8Array.from(atob(data), (value) => value.charCodeAt(0));
    const bitmap = await createImageBitmap(new Blob([png], { type: "image/png" }));
    const ctx = new OffscreenCanvas(bitmap.width, bitmap.height).getContext("2d");
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    return points.map(([x, y]) => {
      const pixels = ctx.getImageData(x - 2, y - 2, 5, 5).data;
      return [0, 1, 2].map((channel) => Array.from({ length: 25 }, (_, i) => pixels[4 * i + channel]).sort((a, b) => a - b)[12]);
    });
  }, { data: image.toString("base64"), points });
}

async function assertTerrainExchange(page, roadImage, landmarks, label, shots) {
  const projections = await page.evaluate((landmarks) => {
    const { game } = window.__ew;
    const { view, track, gate } = game.modes.get("road").mode.run;
    const preview = game.town.group.getObjectByName("desert-road-crest");
    const nearest = (mesh, want, camera) => {
      const vertices = mesh.geometry.getAttribute("position"), vertex = want.clone(), best = want.clone();
      let distance = Infinity;
      for (let i = 0; i < vertices.count; i++) {
        vertex.fromBufferAttribute(vertices, i);
        const d = vertex.distanceToSquared(want);
        if (d < distance) { distance = d; best.copy(vertex); }
      }
      best.applyMatrix4(mesh.matrixWorld).project(camera);
      return { distance: Math.sqrt(distance), pixel: [(1 + best.x) * innerWidth / 2, (1 - best.y) * innerHeight / 2] };
    };
    return Object.entries(landmarks).map(([name, xyz]) => {
      const anchor = view.camera.position.clone().fromArray(xyz);
      const actual = name === "gate" ? gate.mesh : track.pieces.get(name === "pole" ? 0 : 1).mesh;
      const town = nearest(preview, anchor, game.rig.cam);
      const road = nearest(actual, actual.worldToLocal(anchor.clone()), view.camera);
      return { name, town, road };
    });
  }, landmarks);
  for (const { name, town, road } of projections) {
    assert.ok(town.distance <= 0.01 && road.distance <= 0.01, `${name} is present in both rendered meshes`);
    assert.ok(difference(town.pixel, road.pixel) <= 2, `${name} shifted at the crest`);
  }
  const patches = await groundPatches(page, false);
  assert.ok(patches.every((side) => side.length), "bare ground is exposed on both sides at exchange");
  await page.evaluate(() => {
    const { game } = window.__ew;
    game.renderer.render(game.scene, game.rig.cam);
  });
  let townImage;
  try {
    townImage = await page.screenshot({ scale: "css" });
  } finally {
    await page.evaluate(() => {
      const { game } = window.__ew;
      const { view } = game.modes.get("road").mode.run;
      game.renderer.render(view.scene, view.camera);
    });
    referenceDraws.set(page, 2);
  }
  const points = patches.flat();
  const town = await patchColors(page, townImage, points), road = await patchColors(page, roadImage, points);
  if (shots) await Promise.all([
    writeFile(join(shots, `${label}-road-exchange-town.png`), townImage),
    writeFile(join(shots, `${label}-road-exchange-road.png`), roadImage),
  ]);
  road.forEach((rgb, i) => assert.ok(rgb.every((channel, c) => Math.abs(channel - town[i][c]) <= 12),
    `bare ground at ${points[i]} changes from ${town[i]} to ${rgb}`));
}

export async function assertWorldFrame(page, previous, state, drawLimit, label, shots) {
  const image = await page.screenshot({ scale: "css" });
  try {
    assert.equal(state.presented.serial, previous.presented.serial + 1 + (referenceDraws.get(page) ?? 0), "one presented world per step");
    referenceDraws.delete(page);
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
    if (state.elapsed === 0) await assertTerrainExchange(page, image, state.continuity.road.landmarks, label, shots);
    // The wide desktop view exposes both verges alongside the van during the dolly.
    if (drawLimit === 60 && state.elapsed >= 1 - 1e-6 && state.elapsed <= 1.4 + 1e-6) {
      const patches = await groundPatches(page, true);
      assert.ok(patches.every((side) => side.length), `near verge is exposed on both sides at ${state.elapsed}s`);
      const samples = await patchColors(page, image, patches.flat());
      assert.ok(samples.every(([r, g]) => r - g >= 10), `near verge at ${state.elapsed}s has RGB ${JSON.stringify(samples)}`);
    }
  } catch (error) {
    const dir = shots ?? join(tmpdir(), "road-browser-failures");
    await mkdir(dir, { recursive: true });
    const file = join(dir, `${label}-first-failing-handoff.png`);
    await writeFile(file, image);
    throw new Error(`${error.message}; saved ${file}`, { cause: error });
  }
}
