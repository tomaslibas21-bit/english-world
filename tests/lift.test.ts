import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import { CameraRig } from "../src/game/camera";
import { NPCS } from "../src/content/npcs";
import { createCharacter } from "../src/game/characters";
import { Lift } from "../src/game/road/lift";
import { makeExitSign } from "../src/game/world/roadExit";
import { covers } from "../src/game/talkShot";

vi.mock("../src/game/world/util", async (base) => ({
  ...await base<typeof import("../src/game/world/util")>(),
  textTexture: () => new THREE.Texture(),
}));
vi.mock("../src/game/world/carModels", async (base) => ({
  ...await base<typeof import("../src/game/world/carModels")>(),
  loadCarModel: async () => { throw new Error("Use the procedural cab"); },
}));

describe("Vinnie's lift", () => {
  it("keeps the learner's shoulder beside the speaker and the cab above the cards after resizing", () => {
    const scene = new THREE.Group(), player = createCharacter(NPCS.mia.look), rig = new CameraRig(1);
    const edge = { x: 181.6, z: 18, inward: -Math.PI / 2 };
    const place = (x: number, z: number, heading: number) => {
      player.root.position.set(x, 0, z);
      player.root.rotation.y = heading;
    };
    const { root: roadSign, face: sign } = makeExitSign(), originalSignPose = roadSign.position.clone();
    scene.add(roadSign);
    const host = { rig, place, player: () => player, roadSign: () => roadSign,
      add: (...parts: THREE.Object3D[]) => scene.add(...parts) };
    const lift = new Lift(host, edge);
    lift.arrive(1.35);
    scene.updateMatrixWorld(true);
    for (const [w, h, panelTop] of [[390, 844, 524], [390, 664, 344], [1280, 800, 460]]) {
      rig.cam.aspect = w / h;
      lift.updateActors(0.05);
      rig.update(0.05, 0, false, false, false);
      rig.applyViewShift(w, h, 0, h * rig.stage!.shiftY!);
      rig.cam.updateMatrixWorld();
      const face = lift.driver.root.getWorldPosition(new THREE.Vector3()).setY(lift.driver.height - 0.19);
      const learner = player.root.position.clone().setY(1.56);
      expect(covers(rig.cam.position, face, { ...player.root.position, top: 1.8, r: 0.5 })).toBe(false);
      const screenX = learner.project(rig.cam).x;
      expect(screenX).toBeGreaterThan(face.project(rig.cam).x + 0.12);
      expect(screenX).toBeLessThan(1.1); // a cropped near shoulder at the right edge is fine
      const frame = lift.framing()!;
      for (const point of [frame.face, frame.taxi]) {
        expect(point.y).toBeGreaterThan(0.07);
        expect(point.y).toBeLessThan(0.5);
      }
      const corners = sign.geometry.getAttribute("position");
      for (let i = 0; i < corners.count; i++) {
        const corner = new THREE.Vector3().fromBufferAttribute(corners, i).applyMatrix4(sign.matrixWorld).project(rig.cam);
        expect(Math.abs(corner.x)).toBeLessThan(1);
        expect(corner.y).toBeGreaterThan(face.y);
        expect(corner.y).toBeLessThan(1);
      }
      const body = lift.car.children.find((child) => child instanceof THREE.Mesh) as THREE.Mesh;
      const vertices = body.geometry.getAttribute("position"), p = new THREE.Vector3(), bounds = new THREE.Box3();
      for (let i = 0; i < vertices.count; i++) {
        p.fromBufferAttribute(vertices, i).applyMatrix4(body.matrixWorld).project(rig.cam);
        bounds.expandByPoint(p);
      }
      expect(bounds.min.x).toBeGreaterThan(-1);
      expect(bounds.max.x).toBeLessThan(1);
      expect((1 - bounds.min.y) * h / 2).toBeLessThan(panelTop);
    }
    lift.decline();
    expect(lift.leave(1.25)).toBe(true);
    lift.returnToEdge();
    lift.dispose();
    expect(player.root.position.distanceTo(new THREE.Vector3(edge.x - 1.2, 0, edge.z))).toBeLessThan(0.001);
    expect(rig.stage).toBeNull();
    expect(scene.children).toEqual([roadSign]);
    expect(roadSign.position).toEqual(originalSignPose);
    player.dispose?.();
  });
});
