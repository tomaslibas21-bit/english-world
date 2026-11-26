import * as THREE from "three";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { getInterior, type Interior } from "../../src/game/world/interiors";
import { talkRoomAnchors } from "../../src/game/world/talkNatural";
import { townCanvasDocument } from "../../tools/town-canvas-stub";

let room: Interior;
beforeAll(() => {
  const doc = townCanvasDocument();
  class Canvas { width = 0; height = 0; getContext = doc.createElement().getContext; }
  vi.stubGlobal("HTMLCanvasElement", Canvas);
  vi.stubGlobal("document", { createElement: () => new Canvas() });
  room = getInterior("station")!;
  room.group.updateMatrixWorld(true);
});
afterAll(() => { vi.unstubAllGlobals(); });

function colorAt(hit: THREE.Intersection) {
  const colors = (hit.object as THREE.Mesh).geometry.getAttribute("color");
  return new THREE.Color().fromBufferAttribute(colors, hit.face!.a).getHex();
}

function overhead(dx: number, dz: number) {
  const anchor = talkRoomAnchors(room.id, room.group).handoff!;
  const from = anchor.clone().add(new THREE.Vector3(dx, 0.25, dz));
  return new THREE.Raycaster(from, new THREE.Vector3(0, -1, 0)).intersectObject(room.group, true)[0];
}

it("sets one punched, folded boleto in the tray at Don Raúl's handoff", () => {
  expect(talkRoomAnchors(room.id, room.group).handoff!.toArray()).toEqual([-6, 1.08, -6]);
  expect(room.colliders.boxes).toContainEqual({ minX: -9, maxX: -3, minZ: -6.55, maxZ: -5.45, tag: "counter" });
  const leaf = overhead(0, 0), coupon = overhead(0, -0.515);
  expect(colorAt(leaf)).toBe(0xead1a5);
  expect(colorAt(coupon)).toBe(0xf2deb5);
  expect(leaf.point.y).toBeGreaterThan(coupon.point.y);
  expect(colorAt(overhead(0.082, -0.506))).toBe(0x29484c); // through the hole to the shaded sill
  for (const side of [-1, 1]) {
    expect(colorAt(overhead(side * 0.18, 0))).toBe(0x526267);
    expect(colorAt(overhead(side * 0.20, 0))).toBe(0x41676a);
    const ray = new THREE.Raycaster(new THREE.Vector3(-6 + side, 0.75, -5.3), new THREE.Vector3(0, 0, -1));
    const [joint] = ray.intersectObject(room.group, true);
    expect(joint.object).toBe(leaf.object);
    expect(colorAt(joint)).toBe(0xede2ca);
  }
});

// Settled gameplay lenses from the PC talk-natural s67a-tickets capture. The English and Lithuanian
// recordings use opposite shoulders. The glance and return share the lens and the painted HUD opening.
const shots = [
  { w: 390, h: 844, eye: [-4.1006, 2.9168, -5.1136], look: [-6.0069, 1.3246, -6.8470], fov: 72.298, offset: [-14.905, 306.617], chin: 135 },
  { w: 390, h: 844, eye: [-7.8993, 2.9171, -5.1136], look: [-5.9930, 1.3249, -6.8470], fov: 72.297, offset: [14.761, 306.664], chin: 135 },
  { w: 1280, h: 800, eye: [-4.1010, 2.9152, -5.1136], look: [-6.0072, 1.3229, -6.8470], fov: 58.378, offset: [235.434, 12.494], chin: 412 },
  { w: 1280, h: 800, eye: [-7.8993, 2.9088, -5.1136], look: [-5.9931, 1.3165, -6.8470], fov: 58.378, offset: [278.448, 12.557], chin: 410 },
] as const;

it.each(shots)("exposes the coupon and counter edge below the chin from $eye at $w×$h", ({ w, h, eye, look, fov, offset, chin }) => {
  const lens = new THREE.PerspectiveCamera(fov, w / h, 0.1, 900);
  lens.position.fromArray(eye); lens.lookAt(new THREE.Vector3().fromArray(look));
  lens.setViewOffset(w, h, offset[0], offset[1], w, h); lens.updateMatrixWorld();
  const pixel = (hit: THREE.Intersection) => {
    const q = hit.point.clone().project(lens);
    return new THREE.Vector2((1 + q.x) * w / 2, (1 - q.y) * h / 2);
  };
  const left = overhead(-0.10, -0.515), right = overhead(0.10, -0.515), edge = overhead(0, -0.585);
  expect([colorAt(left), colorAt(right)]).toEqual([0xf2deb5, 0xf2deb5]);
  for (const target of [left, right, edge]) {
    const p = pixel(target);
    expect(p.x).toBeGreaterThan(10);
    expect(p.x).toBeLessThan(w === 390 ? w - 10 : 766);
    expect(p.y).toBeGreaterThan(chin);
    expect(p.y).toBeLessThan(w === 390 ? 211 : h);
    const rightEdge = w === 390 ? w : 766, lowerEdge = w === 390 ? 211 : h;
    expect(p.x >= rightEdge - 79 && p.y >= lowerEdge - 64).toBe(false); // scene preview button
    const ray = new THREE.Raycaster(lens.position, target.point.clone().sub(lens.position).normalize());
    const hit = ray.intersectObject(room.group, true).find(({ object }) => {
      const material = (object as THREE.Mesh<THREE.BufferGeometry, THREE.Material>).material;
      return !(material.transparent && material.opacity < 0.5);
    });
    expect(hit!.point.distanceTo(target.point)).toBeLessThan(0.001);
  }
  expect(colorAt(edge)).toBe(0xe7d9bd);
  expect(pixel(left).distanceTo(pixel(right))).toBeGreaterThan(12);
  expect(pixel(edge).distanceTo(pixel(overhead(0, -0.515)))).toBeGreaterThan(4);
});
