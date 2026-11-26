import * as THREE from "three";
import { afterEach, expect, it, vi } from "vitest";
import { TalkFraming } from "../src/game/talkFraming";
import { talkRoomAnchors } from "../src/game/world/talkNatural";
import { roomFixture, screenFor } from "./fixtures/talk-counter-room";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function ink(hit: THREE.Intersection) {
  const color = (hit.object as THREE.Mesh).geometry.getAttribute("color");
  const i = hit.face!.a;
  return new THREE.Color(color.getX(i), color.getY(i), color.getZ(i)).getHex();
}

it.each([[390, 844, 390, 211], [1280, 800, 766, 800]])("shows Walter's punched ticket from the %i×%i handoff lens", (w, h, right, bottom) => {
  const { room, scene, learner, speaker, people, dispose } = roomFixture("s67a-tickets", 0);
  try {
    const at = talkRoomAnchors(room.id, room.group).handoff!;
    const ray = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0);
    const sample = (dx: number, dz: number) => {
      ray.set(new THREE.Vector3(at.x + dx, at.y + 0.3, at.z + dz), down);
      return ray.intersectObject(room.group, true)[0];
    };
    const leaf = sample(0, 0), paper = sample(0, -0.515);
    expect(ink(leaf)).toBe(0xead1a5);
    expect(leaf.point.y - at.y).toBeGreaterThan(0);
    expect(leaf.point.y - at.y).toBeLessThan(0.05);
    expect(ink(paper)).toBe(0xf2deb5);
    expect(ink(sample(0.082, -0.506))).toBe(0x673034); // see the shaded sill through the punch
    expect(ink(sample(0.18, 0))).toBe(0x526267);
    expect(ink(sample(0.20, 0))).toBe(0x7a2e2e);

    const screen = screenFor([w, h, right, bottom]);
    const lens = new THREE.PerspectiveCamera(50, w / h, 0.1, 900);
    const shot = new TalkFraming().fit({ room, scene, learner, speaker, people, lens, screen, max: 30 })!;
    expect(shot.clear).toBe(true);
    lens.position.copy(shot.near ?? shot.pos); lens.lookAt(shot.look);
    lens.fov = shot.fov;
    lens.setViewOffset(w, h, screen.shiftX + shot.dx, screen.shiftY + shot.dy, w, h);
    lens.updateMatrixWorld();
    const pixel = (p: THREE.Vector3) => {
      const q = p.clone().project(lens);
      return new THREE.Vector2((1 + q.x) * w / 2, (1 - q.y) * h / 2);
    };
    const center = pixel(paper.point);
    const face = pixel(speaker.ch.headJoint.getWorldPosition(new THREE.Vector3()));
    expect(center.y).toBeGreaterThan(face.y);
    expect(center.y).toBeLessThan(bottom);
    expect(center.x).toBeGreaterThan(0);
    expect(center.x).toBeLessThan(right);
    expect(screen.obstacles.some((b) => center.x >= b.x0 && center.x <= b.x1 && center.y >= b.y0 && center.y <= b.y1)).toBe(false);
    expect(pixel(sample(-0.10, -0.515).point).distanceTo(pixel(sample(0.10, -0.515).point))).toBeGreaterThan(3);
    expect(pixel(sample(0, -0.533).point).distanceTo(pixel(sample(0, -0.45).point))).toBeGreaterThan(2);
    ray.set(lens.position, paper.point.clone().sub(lens.position).normalize());
    ray.camera = lens;
    const scenery: THREE.Mesh[] = [];
    scene.traverseVisible((object) => { if (object instanceof THREE.Mesh) scenery.push(object); });
    const first = ray.intersectObjects(scenery, false).find(({ object, face }) => {
      const materials = (object as THREE.Mesh).material;
      const m = Array.isArray(materials) ? materials[face?.materialIndex ?? 0] : materials;
      return m.visible && !(m.transparent && m.opacity < 0.5);
    });
    expect(first?.object).toBe(paper.object);
    expect(first && ink(first)).toBe(0xf2deb5);
  } finally {
    dispose();
  }
});
