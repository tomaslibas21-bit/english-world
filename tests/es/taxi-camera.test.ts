import { expect, it, vi } from "vitest";
import * as THREE from "three";
import { CameraRig } from "../../src/game/camera";
import { PropFader } from "../../src/game/fade";
import { OcclusionField } from "../../src/game/occlusion";
import { TAXI, WORLD } from "../../src/game/world/layout";
import { buildTown } from "../../src/game/world/town";

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
    for (const [w, h] of [[1280, 800], [390, 844], [390, 664]]) {
      const rig = new CameraRig(w / h);
      rig.space = { free: (a, b) => field.free(a, b), inside: (p) => field.solidAt(p.x, p.y, p.z, 0.15), overSolid: (x, z) => field.overSolid(x, z) };
      rig.target.set(TAXI.x, 0, -2.4);
      rig.yaw = rig.motion.dir = Math.PI;
      rig.motion.next.copy(rig.target);
      rig.cam.fov = rig.fovFor(w, h, false);
      rig.cam.updateProjectionMatrix();
      rig.applyViewShift(w, h, 0, w < h ? -h * 0.12 : 0);
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
