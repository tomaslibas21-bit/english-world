import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import { NPCS } from "../../src/content/npcs";
import { ROAD_EDITION } from "../../src/content/road";
import { CameraRig } from "../../src/game/camera";
import { createCharacter } from "../../src/game/characters";
import { walkEdge } from "../../src/game/road/entry";
import { Lift } from "../../src/game/road/lift";
import { covers } from "../../src/game/talkShot";
import { carModelEntry } from "../../src/game/world/carModels";
import { TAXI, WORLD } from "../../src/game/world/layout";
import { buildTown } from "../../src/game/world/town";

vi.mock("../../src/game/world/carModels", async (base) => ({
  ...await base<typeof import("../../src/game/world/carModels")>(),
  loadCarModel: async () => { throw new Error("Use the procedural cab"); },
}));

function withLift(check: (lift: Lift, player: ReturnType<typeof createCharacter>, rig: CameraRig,
  scene: THREE.Group, town: ReturnType<typeof buildTown>) => void) {
  const draw = () => {};
  const gradient = () => ({ addColorStop: draw });
  const canvas = new Proxy({
    measureText: (text: string) => ({ width: text.length * 9 }),
    createLinearGradient: gradient, createRadialGradient: gradient,
  }, { get: (target, key) => Reflect.get(target, key) ?? draw });
  vi.stubGlobal("document", { createElement: () => ({ getContext: () => canvas }) });
  try {
    const town = buildTown(), player = createCharacter(NPCS.mia.look), rig = new CameraRig(1);
    const scene = new THREE.Group().add(town.group, player.root);
    const { x, z } = ROAD_EDITION.edge;
    const edge = walkEdge(x - 1, z + 0.2, 0, 1)!;
    const place = (x: number, z: number, heading: number) => {
      player.root.position.set(x, 0, z);
      player.root.rotation.y = heading;
    };
    const lift = new Lift({ rig, place, roadSign: town.roadSign, player: () => player, add: (...parts) => scene.add(...parts) }, edge);
    check(lift, player, rig, scene, town);
    player.dispose?.();
  } finally {
    vi.unstubAllGlobals();
  }
}

describe("Don Rigo's lift on Calle Ceiba", () => {
  it("keeps the learner's shoulder next to the speaker, the taxi above the cards and the sign in view", () => {
    withLift((lift, player, rig, scene, town) => {
      expect(lift.arrive(1.35)).toBe(true);
      scene.updateMatrixWorld(true);
      const sign = scene.getObjectByName("turnout-sign") as typeof town.roadSign.face;
      const turnout = sign.parent as THREE.Mesh;
      expect(sign.material.map).toBe(town.roadSign.face.material.map);
      expect(sign.material.map?.name).toBe("Carretera del Desierto");
      expect(town.roadSign.root.visible).toBe(false);
      expect(turnout.geometry.groups).toHaveLength(0);
      expect(turnout.children).toEqual([sign]);
      expect(lift.car.position.z).toBeGreaterThan(WORLD.maxZ);
      expect(town.walkableAt(player.root.position.x, player.root.position.z)).toBe(true);

      const road = new THREE.Raycaster(new THREE.Vector3(0, 4, WORLD.maxZ + 0.05), new THREE.Vector3(0, -1, 0));
      expect(road.intersectObject(turnout, false)[0]?.point.y).toBeCloseTo(0, 1);

      for (const [w, h, panelTop] of [[390, 664, 344], [390, 844, 524], [1280, 800, 460]]) {
        rig.cam.aspect = w / h;
        lift.updateActors(0.05);
        rig.update(0.05, 0, false, false, false);
        rig.applyViewShift(w, h, 0, h * rig.stage!.shiftY!);
        rig.cam.updateMatrixWorld();
        const shoulder = player.root.position.clone().setY(player.height - 0.25);
        const face = lift.driver.root.getWorldPosition(new THREE.Vector3()).setY(lift.driver.height - 0.19);
        expect(covers(rig.cam.position, face, { ...player.root.position, top: player.height, r: 0.5 })).toBe(false);
        const screenX = shoulder.project(rig.cam).x;
        expect(screenX).toBeGreaterThan(face.clone().project(rig.cam).x + 0.12);
        expect(screenX).toBeLessThan(1.1);

        const frame = lift.framing()!;
        for (const point of [frame.face, frame.taxi]) {
          expect(point.x).toBeGreaterThan(0.08);
          expect(point.x).toBeLessThan(0.92);
          expect(point.y).toBeGreaterThan(0.07);
          expect(point.y * h).toBeLessThan(Math.min(h / 2, panelTop));
        }
        const corners = sign.geometry.getAttribute("position");
        for (let i = 0; i < corners.count; i++) {
          const corner = new THREE.Vector3().fromBufferAttribute(corners, i).applyMatrix4(sign.matrixWorld);
          const sightline = corner.clone().sub(rig.cam.position);
          const ray = new THREE.Raycaster(rig.cam.position, sightline.clone().normalize(), 0, sightline.length());
          expect(ray.intersectObject(town.group.getObjectByName("selva")!)).toHaveLength(0);
          corner.project(rig.cam);
          expect(Math.abs(corner.x)).toBeLessThan(1);
          expect(corner.y).toBeGreaterThan(face.clone().project(rig.cam).y);
          expect(corner.y).toBeLessThan(1);
        }

        const body = lift.car.children.find((child) => child instanceof THREE.Mesh) as THREE.Mesh;
        const vertices = body.geometry.getAttribute("position"), p = new THREE.Vector3(), bounds = new THREE.Box3();
        for (let i = 0; i < vertices.count; i++) {
          p.fromBufferAttribute(vertices, i).applyMatrix4(body.matrixWorld).project(rig.cam);
          bounds.expandByPoint(p);
        }
        const { width, length, height } = carModelEntry(TAXI.model).collisionBox;
        for (const x of [-width / 2, width / 2]) for (const z of [-length / 2, length / 2]) for (const y of [0, height]) {
          bounds.expandByPoint(lift.car.localToWorld(p.set(x, y, z)).project(rig.cam));
        }
        expect(bounds.min.x).toBeGreaterThan(-1);
        expect(bounds.max.x).toBeLessThan(1);
        expect((1 - bounds.min.y) * h / 2).toBeLessThan(panelTop);
        const driver = new THREE.Box3().setFromObject(lift.driver.root, true);
        for (const x of [driver.min.x, driver.max.x]) for (const z of [driver.min.z, driver.max.z]) {
          expect((1 - p.set(x, driver.min.y, z).project(rig.cam).y) * h / 2).toBeLessThan(panelTop);
        }
      }

      lift.decline();
      expect(lift.leave(1.25)).toBe(true);
      expect(lift.car.position.z).toBeGreaterThan(WORLD.maxZ + 20);
      lift.returnToEdge();
      lift.dispose();
      expect(player.root.position.distanceTo(new THREE.Vector3(lift.edge.x, 0, lift.edge.z - 1.2))).toBeLessThan(0.001);
      expect(player.root.rotation.y).toBe(Math.PI);
      expect(rig.stage).toBeNull();
      expect(scene.children).toEqual([town.group, player.root]);
      expect(town.roadSign.root.visible).toBe(true);
    });
  });

  it("releases the scenery and town sign when the taxi is taken to the road game", () => {
    withLift((lift, player, rig, scene, town) => {
      expect(lift.take()).toBe(lift.car);
      expect(rig.stage).toBeNull();
      expect(scene.children).toEqual([town.group, player.root, lift.car]);
      expect(town.roadSign.root.visible).toBe(true);
      lift.dispose();
    });
  });
});
