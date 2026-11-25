import * as THREE from "three";
import { afterEach, expect, it, vi } from "vitest";
import { NPCS } from "../src/content/npcs";
import { SITUATION_BY_ID } from "../src/content/situations/catalog";
import { createCharacter, withBackpack } from "../src/game/characters";
import { Character } from "../src/game/characters/Character";
import { Game } from "../src/game/Game";
import { TalkFraming } from "../src/game/talkFraming";
import type { TalkLayout } from "../src/game/talkLayout";
import { getInterior } from "../src/game/world/interiors";

const sizes = [[390, 844, 390, 211], [390, 664, 390, 132.796875], [844, 390, 211, 390], [1280, 800, 766, 800]];
const learnerLook = withBackpack({ skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" });
const register = new THREE.Box3(new THREE.Vector3(-2.731, 1.249, 1.499), new THREE.Vector3(-2.269, 1.591, 1.601));
const dt = 1 / 60;

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function roomFixture(id: string, approach: number) {
  vi.spyOn(Math, "random").mockReturnValue(0.43);
  const noop = () => {};
  const gradient = () => ({ addColorStop: noop });
  const ctx = new Proxy({ measureText: () => ({ width: 100 }), createLinearGradient: gradient, createRadialGradient: gradient },
    { get: (target, key) => Reflect.get(target, key) ?? noop });
  vi.stubGlobal("document", { createElement: () => ({ getContext: () => ctx }) });
  const sit = SITUATION_BY_ID[id];
  const room = getInterior(sit.location)!;
  const spot = room.npcs.find(({ npc }) => npc === sit.npc)!;
  const scene = new THREE.Scene(), npcLayer = new THREE.Group();
  const learner = createCharacter(learnerLook);
  scene.add(room.group, learner.root, npcLayer);
  // The list's authored approach, with the same lateral offsets as talk-view.
  learner.root.position.set(spot.ax! + approach, 0, spot.az!);
  learner.root.rotation.y = Math.atan2(spot.x - learner.root.position.x, spot.z - learner.root.position.z);

  const learnerAt = new THREE.Vector3();
  const npcs = room.npcs.map(({ npc, x, z, rot, sit, seat }) => {
    const def = NPCS[npc];
    const ch = createCharacter({ ...def.look, female: def.look.female ?? def.gender === "f" });
    ch.watch = learnerAt;
    ch.root.position.set(x, 0, z);
    ch.root.rotation.y = rot;
    if (sit) { ch.seatY = seat ?? 0.5; ch.setAnim("sit"); }
    npcLayer.add(ch.root);
    return { id: npc, ch, rot, sit, home: ch.root.position.clone(), waved: true };
  });
  const speaker = npcs.find(({ id }) => id === spot.npc)!;
  speaker.ch.busy = "type";
  const game: Game = Object.assign(Object.create(Game.prototype), {
    scene, zone: { id: room.id, interior: room, colliders: room.colliders, nav: { cell: 0.5, idx: () => -1 } },
    npcLayer, npcs, learnerAt, talkAt: new THREE.Vector3(), player: learner, talkNpc: speaker, session: { sit },
    extras: [], extraChats: [],
  });
  game["spawnRoomPeople"]();
  const people = [...npcs.map(({ ch }) => ch), ...game["extras"]];
  const step = (talking: boolean) => {
    game["updateNpcs"](dt, talking, null);
    learner.update(dt);
    scene.updateMatrixWorld(true);
  };
  for (let i = 0; i < (approach ? 24 : 9); i++) step(false);
  step(true);
  return { room, scene, learner, speaker, people, step, dispose: () => {
    for (const ch of [...people, learner]) ch.dispose?.();
  } };
}

function screenFor([width, height, right, bottom]: number[]): TalkLayout {
  return {
    width, height, viewportHeight: height, shiftX: (width - right) / 2, shiftY: height / 2 - bottom * 0.46,
    picture: { x0: 10, x1: right - 10, y0: 10, y1: bottom - 10 },
    obstacles: [{ x0: right - 79, x1: right - 4, y0: bottom - 63, y1: bottom - 2 }],
  };
}

/** Use the actual checkout triangles. Their convex outline is the bezel's silhouette. */
function registerVertices(room: THREE.Group) {
  const vertices: THREE.Vector3[] = [];
  room.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const pos = obj.geometry.getAttribute("position");
    if (!pos) return;
    const corners = Array.from({ length: pos.count }, (_, i) => new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(obj.matrixWorld));
    const indices = obj.geometry.index;
    for (let i = 0; i < (indices?.count ?? pos.count); i += 3) {
      const tri = [0, 1, 2].map((j) => corners[indices?.getX(i + j) ?? i + j]);
      if (tri.every((v) => register.containsPoint(v))) vertices.push(...tri);
    }
  });
  const unique = [...new Map(vertices.map((p) => [p.toArray().join(","), p])).values()];
  expect(unique.length).toBeGreaterThanOrEqual(8);
  return unique;
}

function outline(points: THREE.Vector3[]) {
  const cross = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) =>
    (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const sorted = points.sort((a, b) => a.x - b.x || a.y - b.y);
  const chain = (side: THREE.Vector3[]) => {
    const edge: THREE.Vector3[] = [];
    for (const p of side) {
      while (edge.length > 1 && cross(edge.at(-2)!, edge.at(-1)!, p) <= 0) edge.pop();
      edge.push(p);
    }
    return edge.slice(0, -1);
  };
  return [...chain(sorted), ...chain(sorted.reverse())];
}

function cheekClearance(ch: ReturnType<typeof createCharacter>, corners: THREE.Vector3[], cam: THREE.PerspectiveCamera, screen: TalkLayout) {
  const { width, height } = screen;
  const project = (v: THREE.Vector3) => {
    const p = v.clone().project(cam);
    return p.set((1 + p.x) * width / 2, (1 - p.y) * height / 2, p.z);
  };
  const bezel = outline(corners.map(project));
  const far = Math.max(...bezel.map(({ z }) => z));
  const inverse = ch.headJoint.matrixWorld.clone().invert();
  const lens = cam.position.clone().applyMatrix4(inverse);
  let gap = Infinity, samples = 0;
  ch.root.traverseVisible((mesh) => {
    if (!(mesh instanceof THREE.SkinnedMesh)) return;
    const { position, skinIndex } = mesh.geometry.attributes;
    const joint = mesh.skeleton.bones.indexOf(ch.headJoint as THREE.Bone);
    for (let i = 0; i < position.count; i++) {
      if (skinIndex.getX(i) !== joint) continue;
      const world = mesh.getVertexPosition(i, new THREE.Vector3()).applyMatrix4(mesh.matrixWorld);
      const p = world.clone().applyMatrix4(inverse);
      // Lower, forward skin of the posed head. Retain only the visible side of the rounded face.
      if (p.y > -0.045 || p.y < -0.278 || p.z < 0.02 || p.dot(lens.clone().sub(p)) < 0) continue;
      const pixel = project(world);
      if (pixel.z <= far) continue;
      let outside = false, nearest = Infinity;
      for (let j = 0; j < bezel.length; j++) {
        const a = bezel[j], b = bezel[(j + 1) % bezel.length];
        const dx = b.x - a.x, dy = b.y - a.y, x = pixel.x - a.x, y = pixel.y - a.y;
        const t = THREE.MathUtils.clamp((x * dx + y * dy) / (dx * dx + dy * dy), 0, 1);
        nearest = Math.min(nearest, Math.hypot(x - t * dx, y - t * dy));
        outside ||= dx * y < dy * x;
      }
      gap = Math.min(gap, outside ? nearest : -nearest);
      samples++;
    }
  });
  expect(samples).toBeGreaterThan(30);
  return gap;
}

/** Find eye and mouth triangles that the actor's own head does not hide. */
function visibleFeatures(ch: Character, cam: THREE.PerspectiveCamera, room: THREE.Group) {
  const skin = ch["skin"], head = ch.headJoint;
  if (!skin) throw new Error("Expected the baked actor mesh");
  const { position, skinIndex } = skin.geometry.attributes;
  const iris = skin.skeleton.bones.indexOf(ch["iris"] as THREE.Bone);
  const mouth = [ch["smile"], ch["corners"], ch["mouth"]].filter((bone) => bone.scale.x > 0.01)
    .map((bone) => skin.skeleton.bones.indexOf(bone as THREE.Bone));
  const inverse = head.matrixWorld.clone().invert();
  const samples: THREE.Vector3[][] = [[], [], []];
  for (let i = 0; i < position.count; i++) {
    const joint = skinIndex.getX(i);
    if (joint !== iris && !mouth.includes(joint)) continue;
    const world = skin.getVertexPosition(i, new THREE.Vector3()).applyMatrix4(skin.matrixWorld);
    const local = world.clone().applyMatrix4(inverse);
    samples[joint === iris ? Number(local.x > 0) : 2].push(world);
  }
  return samples.map((points, i) => {
    const ray = new THREE.Raycaster();
    ray.camera = cam;
    // Test the nearest vertices first to find a painted part of each feature.
    return points.sort((a, b) => a.distanceToSquared(cam.position) - b.distanceToSquared(cam.position)).slice(0, 24).some((p) => {
      const delta = p.clone().sub(cam.position);
      ray.far = delta.length() + 0.001;
      ray.set(cam.position, delta.normalize());
      const first = ray.intersectObject(skin, false)[0]?.face;
      if (!first) return false;
      const joint = skinIndex.getX(first.a);
      if (!(i < 2 ? joint === iris : mouth.includes(joint))) return false;
      ray.far *= 0.97;
      return ray.intersectObject(room, true).length === 0;
    });
  });
}

it.each([
  ["s32-supermarket", 0], ["s91b-police", 0], ["s91b-police", -0.7], ["s91b-police", 0.7],
] as const)("holds a readable counter view for %s at approach %s", (id, approach) => {
  const misses: string[] = [];
  for (const dims of sizes) {
    const { room, scene, learner, speaker, people, step, dispose } = roomFixture(id, approach);
    try {
      const screen = screenFor(dims);
      const { width, height } = screen;
      const lens = new THREE.PerspectiveCamera(50, width / height, 0.1, 900);
      const shot = new TalkFraming().fit({ room, scene, learner, speaker, people, lens, screen, max: 30 })!;
      expect(shot.clear).toBe(true);
      lens.fov = shot.fov;
      lens.setViewOffset(width, height, screen.shiftX + shot.dx, screen.shiftY + shot.dy, width, height);
      const corners = id === "s32-supermarket" ? registerVertices(room.group) : [];
      speaker.ch.talk(5, () => null);
      for (let frame = 0; frame <= 90; frame++) {
        if (frame) step(true);
        if (![0, 6, 12, 18, 24, 36, 60, 90].includes(frame)) continue;
        const t = Math.min(1, frame / 24);
        lens.position.lerpVectors(shot.pos, shot.near ?? shot.pos, t * t * (3 - 2 * t));
        lens.lookAt(shot.look);
        lens.updateMatrixWorld();
        const label = `${width}x${height} frame ${frame}`;
        if (corners.length) {
          const clearance = cheekClearance(speaker.ch, corners, lens, screen);
          if (clearance < 3) misses.push(`${label}: bezel gap ${clearance.toFixed(1)}px`);
          if (width === 1280 && frame === 60) {
            const shoulder = learner.root.position.clone().add(new THREE.Vector3(0, learner.height * 0.72, 0)).project(lens);
            const x = (1 + shoulder.x) * width / 2, y = (1 - shoulder.y) * height / 2;
            if (shoulder.z < -1 || shoulder.z > 1 || x <= 0 || x >= dims[2] || y <= 0 || y >= height) {
              misses.push(`${label}: learner shoulder outside the desktop opening`);
            }
          }
        } else {
          const head = speaker.ch.headJoint;
          const angle = THREE.MathUtils.radToDeg(lens.position.clone().sub(head.getWorldPosition(new THREE.Vector3())).angleTo(head.getWorldDirection(new THREE.Vector3())));
          if (angle > 55) misses.push(`${label}: head angle ${angle.toFixed(1)}°`);
          if (lens.position.z < -2.075) misses.push(`${label}: lens is beyond the customer side of the pane`);
        }
        if (frame === 60 && speaker.ch instanceof Character) {
          const visible = visibleFeatures(speaker.ch, lens, room.group);
          if (!visible.every(Boolean)) misses.push(`${label}: visible irises and mouth ${visible.join(", ")}`);
        }
      }
    } finally {
      dispose();
    }
  }
  expect(misses).toEqual([]);
}, 30_000);
