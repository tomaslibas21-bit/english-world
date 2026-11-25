import * as THREE from "three";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { NPCS } from "../../src/content/npcs";
import { Character } from "../../src/game/characters/Character";
import { withBackpack } from "../../src/game/characters";
import { OcclusionField } from "../../src/game/occlusion";
import { TalkFraming } from "../../src/game/talkFraming";
import type { TalkLayout } from "../../src/game/talkLayout";
import { OUTDOOR_NPCS } from "../../src/game/world/layout";
import { buildTown } from "../../src/game/world/town";
import { floorY } from "../../src/game/water";

afterAll(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// Inspect the posed triangles independently of the fitter's head landmarks.
function readFace(actor: Character, lens: THREE.PerspectiveCamera, sceneMeshes: { mesh: THREE.Mesh; bounds: THREE.Box3 }[], screen: TalkLayout) {
  const skin = actor["skin"]!;
  const { index } = skin.geometry;
  const joint = skin.geometry.attributes.skinIndex;
  const bones = skin.skeleton.bones;
  const iris = bones.indexOf(actor["iris"] as THREE.Bone);
  const mouth = [actor["smile"], actor["mouth"]].filter((bone) => bone.scale.x > 0.01)
    .map((bone) => bones.indexOf(bone as THREE.Bone));
  const headLocal = actor.headJoint.matrixWorld.clone().invert();
  const samples: THREE.Vector3[][] = [[], [], []];
  const point = new THREE.Vector3(), vertex = new THREE.Vector3();
  for (let i = 0; i < index!.count; i += 3) {
    const a = index!.getX(i), id = joint.getX(a);
    if (id !== iris && !mouth.includes(id)) continue;
    point.copy(skin.getVertexPosition(a, vertex));
    for (let k = 1; k < 3; k++) point.add(skin.getVertexPosition(index!.getX(i + k), vertex));
    point.multiplyScalar(1 / 3).applyMatrix4(skin.matrixWorld);
    const feature = id === iris ? Number(vertex.copy(point).applyMatrix4(headLocal).x > 0) : 2;
    samples[feature].push(point.clone());
  }
  const ray = new THREE.Raycaster();
  ray.camera = lens;
  return samples.map((points, feature) => {
    points.sort((a, b) => a.distanceToSquared(lens.position) - b.distanceToSquared(lens.position));
    let exposed = 0;
    for (const p of points.slice(0, 24)) {
      const pixel = p.clone().project(lens);
      const x = (pixel.x + 1) * screen.width / 2, y = (1 - pixel.y) * screen.height / 2;
      const { picture } = screen;
      if (x < picture.x0 || x > picture.x1 || y < picture.y0 || y > picture.y1
        || screen.obstacles.some((box) => x > box.x0 && x < box.x1 && y > box.y0 && y < box.y1)) continue;
      const delta = p.clone().sub(lens.position), distance = delta.length();
      ray.set(lens.position, delta.normalize());
      ray.far = distance + 0.001;
      const first = ray.intersectObject(skin, false)[0]?.face;
      if (!first || !(feature === 2 ? mouth.includes(joint.getX(first.a)) : joint.getX(first.a) === iris)) continue;
      ray.far = distance - 0.006;
      if (sceneMeshes.some(({ mesh, bounds }) => {
        const hit = ray.ray.intersectBox(bounds, vertex);
        return (bounds.containsPoint(lens.position) || (hit && hit.distanceToSquared(lens.position) < ray.far ** 2))
          && ray.intersectObject(mesh, false).some(({ face }) => {
            const material = Array.isArray(mesh.material) ? mesh.material[face?.materialIndex ?? -1] : mesh.material;
            return material?.visible && material.colorWrite && material.opacity > 0;
          });
      })) continue;
      if (++exposed >= 3) return true;
    }
    return false;
  });
}

const spot = OUTDOOR_NPCS.find((npc) => npc.npc === "mrs_lee")!;
const scene = new THREE.Scene();
const meshes: { mesh: THREE.Mesh; bounds: THREE.Box3 }[] = [];
let field: OcclusionField;
beforeAll(() => {
  const context = new Proxy({
    measureText: (s: string) => ({ width: s.length * 10 }),
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
    getImageData: () => ({ data: new Uint8ClampedArray(4 * 128 ** 2) }),
  }, { get: (target, key) => Reflect.get(target, key) ?? (() => {}) });
  vi.stubGlobal("document", { createElement: () => ({ getContext: () => context }) });
  vi.spyOn(Math, "random").mockReturnValue(0.47);
  const town = buildTown({ movableParking: true });
  scene.add(town.group);
  expect(scene.getObjectByName("tianguis-lonas")).toBeDefined();
  field = OcclusionField.fromObject(town.group, { minX: 8, maxX: 20, minZ: -50, maxZ: -36 },
    { skip: (node) => !!node.userData.thin || !!node.userData.boat || !!node.userData.gull || node.userData.v !== undefined || node === town.parkedCars.group });
  field.fillFootprints(town.colliders.boxes, town.colliders.circles);
  town.group.traverseVisible((part) => {
    if ((part as THREE.Mesh).isMesh) meshes.push({ mesh: part as THREE.Mesh, bounds: new THREE.Box3().setFromObject(part) });
  });
});

it.each([0, 0.7, -0.7])("keeps both eyes and the speaking mouth clear at the tianguis, offset %s m", (side) => {
  const def = NPCS[spot.npc];
  const ch = new Character({ ...def.look, female: true });
  const speaker = { ch, rot: spot.rot };
  ch.root.position.set(spot.x, 0, spot.z);
  ch.steady = true;
  ch.fidgets = false;
  const learner = new Character(withBackpack({ skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" }));
  learner.fidgets = false;
  scene.add(ch.root, learner.root);
  const framing = new TalkFraming();
  const x = spot.ax! + side, z = spot.az!;
  learner.root.position.set(x, floorY(x, z), z);
  const facing = Math.atan2(x - spot.x, z - spot.z);
  learner.root.rotation.y = facing + Math.PI;
  ch.watch = learner.root.position.clone().add(new THREE.Vector3(0, 1.5, 0));
  try {
    for (const [width, height, right, bottom] of [[390, 844, 390, 211], [390, 664, 390, 132.8], [844, 390, 211, 390], [1280, 800, 766, 800]]) {
      const screen = { width, height, viewportHeight: height, shiftX: (width - right) / 2, shiftY: height / 2 - bottom * 0.46,
        picture: { x0: 10, x1: right - 10, y0: 10, y1: bottom - 10 },
        obstacles: [{ x0: right - 88, x1: right - 4, y0: bottom - 64, y1: bottom - 2 }] };
      // Exercise a preview tip crossing the head's left edge while leaving its centre open.
      if (height === 664) screen.obstacles.push({ x0: 12, x1: 174, y0: 68, y1: 124 });
      const lens = new THREE.PerspectiveCamera(50, width / height, 0.1, 900);
      const label = `${width}x${height} at ${x},${z}`;
      ch.root.rotation.y = spot.rot;
      ch.talk(5, () => 0.7, () => 0);
      ch.update(1 / 60);
      learner.update(1 / 60);
      const shot = framing.fit({ scene, speaker, learner, people: [ch], screen, lens, field, max: 30,
        report: (stats) => expect(stats.tested, label).toBeLessThanOrEqual(8) });
      expect(shot?.clear, label).toBe(true);
      if (!shot) continue;
      lens.position.copy(shot.near ?? shot.pos);
      lens.lookAt(shot.look);
      lens.fov = shot.fov;
      lens.near = shot.nearPlane;
      lens.setViewOffset(width, height, screen.shiftX + shot.dx, screen.shiftY + shot.dy, width, height);
      lens.updateMatrixWorld();
      for (let step = 1; step <= 90; step++) {
        ch.root.rotation.y += (facing - ch.root.rotation.y) * 7 / 60;
        ch.update(1 / 60);
        if (step !== 12 && step !== 90) continue;
        scene.updateMatrixWorld(true);
        const eyeLine = lens.position.clone().sub(ch.headJoint.getWorldPosition(new THREE.Vector3()));
        const angle = eyeLine.angleTo(ch.headJoint.getWorldDirection(new THREE.Vector3()));
        expect(THREE.MathUtils.radToDeg(angle), label).toBeLessThanOrEqual(55);
        const body = { mesh: learner["skin"]!, bounds: new THREE.Box3().setFromObject(learner.root) };
        expect(readFace(ch, lens, [...meshes, body], screen), label).toEqual([true, true, true]);
      }
    }
  } finally {
    ch.root.removeFromParent();
    learner.root.removeFromParent();
    ch.dispose();
    learner.dispose();
  }
});
