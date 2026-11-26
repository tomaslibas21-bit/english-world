import { expect, it, vi } from "vitest";
import * as THREE from "three";
import { CameraRig } from "../../src/game/camera";
import { PropFader } from "../../src/game/fade";
import { OcclusionField } from "../../src/game/occlusion";
import { carFootprint } from "../../src/game/world/carModels";
import { PARKED_CARS, ROADS, SIDEWALK, TAXI, taxiBoardingInlay, WORLD } from "../../src/game/world/layout";
import { buildTown } from "../../src/game/world/town";

it("keeps both turned ends and all three diamonds on the boardable cab's sidewalk", () => {
  const main = ROADS.find(road => road.name === "Main Street")!, curb = main.z1 + main.w / 2;
  const other = PARKED_CARS.find(car => car.model === "taxi" && car !== TAXI)!;
  const besideOther = carFootprint(other);
  const [stone, ...diamonds] = taxiBoardingInlay();
  const xs = stone.outline.map(([x]) => x), zs = stone.outline.map(([, z]) => z);
  expect([Math.min(...xs), Math.max(...xs)]).toEqual([TAXI.x - 2.25, TAXI.x + 2.25]);
  expect(Math.max(...zs) - Math.min(...zs)).toBeCloseTo(0.75);
  expect(diamonds.map(d => d.color)).toEqual(Array(3).fill("#276a50"));
  for (const { outline } of [stone, ...diamonds]) for (const [x, z] of outline) {
    expect(z).toBeGreaterThan(curb + 0.13); // clear of the raised kerb
    expect(z).toBeLessThan(curb + SIDEWALK);
    expect(x).toBeGreaterThan(besideOther.maxX);
    expect(x).toBeLessThan(main.x2);
  }
});

it("keeps the gas canopy out of the walking camera at the taxi prompt", () => {
  const draw = () => {};
  const gradient = () => ({ addColorStop: draw });
  const canvas = new Proxy({
    measureText: (text: string) => ({ width: text.length * 9 }), createLinearGradient: gradient, createRadialGradient: gradient,
  }, { get: (target, key) => Reflect.get(target, key) ?? draw });
  vi.stubGlobal("document", { createElement: () => ({ getContext: () => canvas }) });
  try {
    const { group, colliders, parkedCars } = buildTown();
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
  } finally {
    vi.unstubAllGlobals();
  }
});
