import { beforeAll, expect, it, vi } from "vitest";
import * as THREE from "three";
import { CameraRig } from "../../src/game/camera";
import { PropFader } from "../../src/game/fade";
import { OcclusionField } from "../../src/game/occlusion";
import { TAXI_ROUTES } from "../../src/content/taxi";
import { carFootprint, carModelEntry } from "../../src/game/world/carModels";
import { PARKED_CARS, ROADS, SIDEWALK, TAXI, taxiBoardingInlay, WORLD } from "../../src/game/world/layout";
import { buildTown } from "../../src/game/world/town";
import { townCanvasDocument } from "../../tools/town-canvas-stub";

it("keeps both turned ends and all three diamonds on the boardable cab's sidewalk", () => {
  const main = ROADS.find(road => road.name === "Main Street")!, curb = main.z1 + main.w / 2;
  const other = PARKED_CARS.find(car => car.model === "taxi" && car !== TAXI)!;
  const besideOther = carFootprint(other);
  const [stone, sawcut, ...diamonds] = taxiBoardingInlay();
  const xs = stone.outline.map(([x]) => x), zs = stone.outline.map(([, z]) => z);
  expect([Math.min(...xs), Math.max(...xs)]).toEqual([TAXI.x - 2.25, TAXI.x + 2.25]);
  expect(Math.max(...zs) - Math.min(...zs)).toBeCloseTo(0.75);
  expect(diamonds.map(d => d.color)).toEqual(Array(3).fill("#276a50"));
  // At six ground texels per metre, the end returns and each diamond need a full texel across their short axis.
  expect(sawcut.outline[1][0] - sawcut.outline[0][0]).toBeGreaterThanOrEqual(1 / 6);
  for (const { outline } of diamonds) {
    const depths = outline.map(([, z]) => z);
    expect((Math.max(...depths) - Math.min(...depths)) * 6).toBeGreaterThanOrEqual(3 - 1e-6);
  }
  for (const { outline } of [stone, sawcut, ...diamonds]) for (const [x, z] of outline) {
    expect(z).toBeGreaterThan(curb + 0.13); // clear of the raised kerb
    expect(z).toBeLessThan(curb + SIDEWALK);
    expect(x).toBeGreaterThan(besideOther.maxX);
    expect(x).toBeLessThan(main.x2);
  }
});

let town: ReturnType<typeof buildTown>;
beforeAll(() => {
  vi.stubGlobal("document", townCanvasDocument());
  try {
    town = buildTown();
    town.group.updateMatrixWorld(true);
  } finally {
    vi.unstubAllGlobals();
  }
});

it("keeps the gas canopy out of the walking camera at the taxi prompt", () => {
  const { group, colliders, parkedCars } = town;
  const skip = (o: THREE.Object3D) => o.userData.v !== undefined || !!o.userData.gull || !!o.userData.boat || !!o.userData.thin || o === parkedCars.taxi?.root;
  const field = OcclusionField.fromObject(group, {
    minX: WORLD.minX - 24, maxX: WORLD.maxX + 24, minZ: WORLD.minZ - 24, maxZ: WORLD.maxZ + 24,
  }, { skip });
  field.fillFootprints(colliders.boxes, colliders.circles);
  expect(field.solidAt(120.75, 4.6, 4)).toBe(true);

  const canopy = group.getObjectByName("gas-canopy-assembly")!;
  const fader = new PropFader(group, skip);
  const materials = canopy.children.map((obj) => (obj as THREE.Mesh).material as THREE.Material);
  for (const material of materials) expect(material.alphaHash).toBe(true);
  const ray = new THREE.Raycaster();
  const sample = new THREE.Vector2();
  const samples = [-0.9, -0.75, -0.5, 0, 0.5, 0.75, 0.9];
  let foregroundHits = 0;
  const visibleMeshes: THREE.Mesh[] = [], standMeshes = new Set<THREE.Object3D>();
  group.traverseVisible(o => { if ((o as THREE.Mesh).isMesh) visibleMeshes.push(o as THREE.Mesh); });
  parkedCars.taxi!.root.traverse(o => standMeshes.add(o));
  for (const [w, h] of [[1280, 800], [390, 844], [390, 664], [844, 390]]) {
    const rig = new CameraRig(w / h);
    rig.space = { free: (a, b) => field.free(a, b), inside: (p) => field.solidAt(p.x, p.y, p.z, 0.15), overSolid: (x, z) => field.overSolid(x, z) };
    rig.target.set(TAXI.x, 0, -2.4);
    rig.yaw = rig.motion.dir = Math.PI;
    rig.motion.next.copy(rig.target);
    rig.cam.fov = rig.fovFor(w, h, false);
    rig.cam.updateProjectionMatrix();
    const followShift = w < h ? 0.12 : h <= 520 ? 0.1 : 0;
    rig.applyViewShift(w, h, 0, -h * followShift);
    rig.snap();
    const chest = rig.target.clone().setY(1.35);
    const taxi = new THREE.Vector3(TAXI.x, 0.9, TAXI.z);
    for (let frame = 0; frame < 100; frame++) {
      rig.update(0.05, Math.PI, false, true, true);
      rig.cam.updateMatrixWorld();
      fader.update(0.05, rig.cam.position, chest);
      const projected = taxi.clone().project(rig.cam);
      expect(Math.max(Math.abs(projected.x), Math.abs(projected.y), Math.abs(projected.z))).toBeLessThan(1);
      const taxiDepth = rig.cam.position.distanceTo(taxi);
      for (const x of samples) {
        for (const y of samples) {
          ray.setFromCamera(sample.set(x, y), rig.cam);
          const hit = ray.intersectObjects(canopy.children, false)[0];
          if (hit && hit.distance < taxiDepth) {
            foregroundHits++;
            const material = (hit.object as THREE.Mesh).material as THREE.Material;
            expect(material.opacity, `canopy cuts the ${w}×${h} view on frame ${frame}`).toBe(0);
          }
        }
      }
    }
    // Cast through the settled shot after the foreground fade, up to each subject's actual depth.
    for (const point of [chest, taxi]) {
      const ndc = point.clone().project(rig.cam);
      expect(Math.max(Math.abs(ndc.x), Math.abs(ndc.y), Math.abs(ndc.z))).toBeLessThan(1);
      const direction = point.clone().sub(rig.cam.position);
      const sight = new THREE.Raycaster(rig.cam.position, direction.clone().normalize(), rig.cam.near, direction.length());
      const first = sight.intersectObjects(visibleMeshes, false).find(hit => {
        const m = (hit.object as THREE.Mesh).material;
        const material = Array.isArray(m) ? m[hit.face?.materialIndex ?? 0] : m;
        return material.visible && material.opacity > 0.01;
      });
      if (point === taxi) expect(standMeshes.has(first?.object ?? group), `cab sightline at ${w}×${h}`).toBe(true);
      else expect(first?.object.name, `learner sightline at ${w}×${h}`).toBeUndefined();
    }
    fader.update(0.05, rig.cam.position, chest, false);
    for (const material of materials) expect(material.opacity).toBe(1);
  }
  expect(foregroundHits).toBeGreaterThan(0);
  const roofBounds = new THREE.Box3().setFromObject(canopy);
  fader.update(0.05, new THREE.Vector3(TAXI.x, 5, roofBounds.max.z + 6.5), new THREE.Vector3());
  for (const material of materials) expect(material.opacity).toBeCloseTo(0.5);
  fader.update(0.05, new THREE.Vector3(TAXI.x, 7, 20), new THREE.Vector3());
  for (const material of materials) expect(material.opacity).toBe(1);
});

it("keeps Mar Azul’s fascia, tile corners and posts in their original camera-thin batch and bounds", () => {
  const roof = new THREE.Box3(), posts = new THREE.Box3(), seen = new Set<number>();
  const colors = [0x1f6f8b, 0xb56538, 0xf1dfbc, 0x665444, 0xb08a57, 0xc8a86a];
  const p = new THREE.Vector3(), color = new THREE.Color();
  const batches = new Set<THREE.Mesh>();
  let vertices = 0;
  for (const obj of town.group.children) {
    if (!(obj instanceof THREE.Mesh) || !obj.name.startsWith("town-thinCast-")) continue;
    const attrs = obj.geometry.attributes;
    for (let i = 0; i < attrs.position.count; i++) {
      p.fromBufferAttribute(attrs.position, i);
      if (Math.abs(p.x + 87) > 8 || Math.abs(p.z + 16) > 6) continue;
      const hex = color.fromBufferAttribute(attrs.color, i).getHex();
      if (!colors.includes(hex)) continue;
      (hex === 0xc8a86a ? posts : roof).expandByPoint(p);
      seen.add(hex); batches.add(obj); vertices++;
    }
  }
  expect(seen).toEqual(new Set(colors));
  expect(batches.size).toBe(1);
  const [batch] = batches;
  expect(batch.userData.thin && batch.castShadow).toBe(true);
  for (const [actual, original] of [
    [roof.min, [-91, 3.225, -18]], [roof.max, [-83, 3.575, -14]],
    [posts.min, [-90.7 - 0.08 * Math.sin(Math.PI / 3), 0, -14.28]],
    [posts.max, [-83.3 + 0.08 * Math.sin(Math.PI / 3), 3.4, -14.12]],
  ] as const) {
    expect(actual.distanceTo(new THREE.Vector3().fromArray(original))).toBeLessThan(0.0001);
  }
  expect(vertices / 3).toBeLessThanOrEqual(60 + 120);
});

it.each([[1280, 800], [390, 844]])("keeps the route-1 cab and bay clear and shows the door finish at %i×%i", (w, h) => {
  const { decisions } = TAXI_ROUTES[0], stop = decisions.at(-1)!.at, turn = decisions.at(-2)!.at;
  const heading = Math.atan2(stop.x - turn.x, stop.z - turn.z);
  const cab = new THREE.Vector3(turn.x + Math.sin(heading) * 8, 0, turn.z + Math.cos(heading) * 8);
  const rig = new CameraRig(w / h);
  rig.target.copy(cab); rig.motion.next.copy(cab); rig.yaw = rig.motion.dir = heading;
  rig.cam.fov = rig.fovFor(w, h, true);
  rig.applyViewShift(w, h, 0, w < h ? -h * 0.12 : 0);
  rig.snap(); rig.applyPose(); rig.cam.updateProjectionMatrix(); rig.cam.updateMatrixWorld();
  const painted: THREE.Mesh[] = [];
  town.group.traverseVisible((o) => { if (o instanceof THREE.Mesh) painted.push(o); });
  const visible = (camera: THREE.PerspectiveCamera, target: THREE.Vector3) => {
    const q = target.clone().project(camera);
    expect(Math.max(Math.abs(q.x), Math.abs(q.y), Math.abs(q.z))).toBeLessThan(1);
    const delta = target.clone().sub(camera.position);
    const sight = new THREE.Raycaster(camera.position, delta.clone().normalize(), camera.near, delta.length() - 0.01);
    expect(sight.intersectObjects(painted, false)[0]?.object.name).toBeUndefined();
  };
  visible(rig.cam, cab.clone().setY(carModelEntry("taxi").collisionBox.height));
  visible(rig.cam, new THREE.Vector3(stop.x, 0.06, stop.z));
  const fascia = new THREE.Vector3(-87, 3.48, -14.02);
  if (w > h) visible(rig.cam, fascia);
  const door = town.doors.find((d) => d.loc === "hotel")!;
  const lens = new THREE.PerspectiveCamera(68, w / h, 0.1, 900);
  lens.position.set(stop.x + 3.75, 2.08, stop.z + 1.75);
  lens.lookAt(door.x + 1.2, 2.95, door.z); lens.updateMatrixWorld();
  visible(lens, fascia);
  const corner = new THREE.Vector3(-83.12, 3.48, -14.02);
  visible(lens, corner);
  const ray = new THREE.Raycaster(lens.position, corner.clone().sub(lens.position).normalize());
  const [hit] = ray.intersectObjects(painted, false);
  expect(hit.distance).toBeCloseTo(lens.position.distanceTo(corner), 3);
  expect(hit.object.userData.thin).toBe(true);
  const colors = (hit.object as THREE.Mesh).geometry.attributes.color;
  expect(new THREE.Color().fromBufferAttribute(colors, hit.face!.a).getHex()).toBe(0xb56538);
});
