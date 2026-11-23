import { projectFace } from "../src/game/kit/boardFaces";
import { projectBoards } from "./board-projection";
import {
  DirectionalLight, Fog, Group, HemisphereLight, Mesh, MeshLambertMaterial, Matrix4, PerspectiveCamera,
  PlaneGeometry, ShaderMaterial, Vector3, type WebGLRenderer,
} from "three";
import { describe, expect, it } from "vitest";
import { Rides, type RideHost } from "../src/game/rides/Rides";
import { BOAT, Motion } from "../src/game/rides/drive";
import { readBest, saveBest } from "../src/game/road/ghost";
import { RunScore } from "../src/game/road/run";
import { SeaBoat } from "../src/game/sea/boat";
import { SeaGate } from "../src/game/sea/buoys";
import { CRUISE_SPEED, FIRST_GATE, GATE_SPACING, nextGate, SEA_SECONDS } from "../src/game/sea/course";
import { leavingBySea, seaReturn } from "../src/game/sea/entry";
import { SeaView } from "../src/game/sea/view";
import { BAY } from "../src/game/water";
import { makeLobsterBoats } from "../src/game/world/maple";
import { RIDES } from "../src/game/world/rides";
import { makeBoats } from "../src/game/world/town";
import { Colliders } from "../src/game/world/util";

describe("the route out through the bay's buoys", () => {
  it("takes a boat moving outward when its bow reaches the edge at any x", () => {
    const m = new Motion(BOAT, "boat");
    const boat = { kind: "boat", m } as const;
    for (const x of [BAY.x0 + 3, 0, BAY.x1 - 3]) {
      m.set(x, BAY.z0 + BOAT.half + 0.01, Math.PI);
      m.speed = 4;
      expect(leavingBySea(boat)).toBe(false);
      m.z -= 0.011;
      expect(leavingBySea(boat)).toBe(true);
    }
    m.speed = 2;
    expect(leavingBySea(boat)).toBe(false);
    m.speed = -4;
    expect(leavingBySea(boat)).toBe(false);
    m.speed = 4;
    for (const angle of [49, -49, 51, -51, 180]) {
      m.heading = Math.PI + angle * Math.PI / 180;
      m.z = BAY.z0 + 0.5;
      expect(leavingBySea(boat)).toBe(Math.abs(angle) < 50);
    }
    expect(leavingBySea({ ...boat, kind: "car" })).toBe(false);
  });

  it("accounts for the full bow length and returns inside the side buoys", () => {
    const m = new Motion({ ...BOAT, half: 3.9, wide: 1.3 }, "boat");
    const boat = { kind: "boat", m } as const;
    m.set(BAY.x1 - 0.1, BAY.z0 + 3.8, Math.PI);
    m.speed = 4;
    expect(leavingBySea(boat)).toBe(true);
    expect(seaReturn(boat)).toEqual({ x: BAY.x1 - 4.1, z: BAY.z0 + 14, rot: 0 });
  });
});

describe("open-water runs", () => {
  it("places the first gate at six cruise seconds and the next gates eight seconds apart", () => {
    expect(FIRST_GATE / CRUISE_SPEED).toBe(6);
    expect(GATE_SPACING / CRUISE_SPEED).toBe(8);
    expect(nextGate(nextGate(FIRST_GATE))).toBe(264);
  });

  it("keeps the road at 150 seconds and times the sea at 120", () => {
    for (const [score, duration] of [[new RunScore(), 150], [new RunScore(SEA_SECONDS), 120]] as const) {
      expect(score.duration).toBe(duration);
      expect(score.advance(duration - 0.05)).toBe(false);
      expect(score.advance(0.05)).toBe(true);
      expect(score.elapsed).toBe(duration);
      expect(score.advance(1)).toBe(true);
      expect(score.elapsed).toBe(duration);
    }
  });

  it("holds the slowest speed before turning and can turn from a negative heading", () => {
    const boat = new SeaBoat(0, BAY.z0, -Math.PI, CRUISE_SPEED);
    for (let i = 0; i < 39; i++) expect(boat.drive(0.05, 0, -1)).toBe(false);
    expect(boat.drive(0.05, 0, -1)).toBe(true);
    const start = boat.heading;
    boat.turnAround();
    for (let i = 0; i < 29; i++) expect(boat.advanceTurn(0.05)).toBe(false);
    expect(boat.advanceTurn(0.05)).toBe(true);
    expect(Math.cos(boat.heading)).toBeCloseTo(1);
    expect(Math.abs(boat.heading - start)).toBeCloseTo(Math.PI);
  });

  it("keeps both best scores for the same edition", () => {
    const values = new Map<string, string>();
    const storage = { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k, v); } };
    expect(saveBest("maple-harbor", { points: 200, frames: [] }, undefined, storage)).toBe(true);
    expect(saveBest("maple-harbor", { points: 100, frames: [] }, undefined, storage, "sea")).toBe(true);
    expect(readBest("maple-harbor", storage)?.points).toBe(200);
    expect(readBest("maple-harbor", storage, "sea")?.points).toBe(100);
  });
});

describe("Maple Harbor boats", () => {
  it("gives every anchored and working boat its own ride, reach and deck seat", () => {
    const town = new Group();
    const hulls = [...makeBoats(), ...makeLobsterBoats(new MeshLambertMaterial({ vertexColors: true }))];
    town.add(...hulls);
    const player = { root: new Group(), setAnim() {}, update() {} };
    const host = {
      player, ambient: { rideBoxes: [] }, cam: new PerspectiveCamera(), colliders: new Colliders(), outdoors: () => true,
    } as unknown as RideHost;
    const rides = new Rides(host, { ...RIDES, cars: [] }, [...town.children]);
    expect(rides.list.map(({ id }) => id)).toEqual([
      ...RIDES.boats.map(({ id }) => id),
      "anchored-1", "anchored-2", "anchored-3", "anchored-4", "anchored-5", "lobster-1", "lobster-2",
    ]);
    for (const hull of hulls) {
      const data = hull.userData.rideBoat;
      const ride = rides.find(data.id)!;
      expect(ride.mesh).toBe(hull);
      expect(hull.parent).toBe(rides.group);
      expect(hull.userData.boat).toBeUndefined();
      expect(ride.owners).toEqual([]);
      expect(ride.m.spec).toMatchObject({ max: BOAT.max, half: data.half, wide: data.wide });
      expect(ride.m.spec.half).toBeGreaterThan(BOAT.half);
      expect(ride.m.spec.wide).toBeGreaterThan(BOAT.wide);

      const water = new Vector3(data.wide + 0.7, 0, data.helm[1]);
      hull.localToWorld(water);
      expect(rides.near(water.x, water.z)).toBe(ride);
      expect(rides.restoreBoat(ride, 2)).toBe(true);
      const feet = hull.worldToLocal(player.root.position.clone());
      expect(feet.x).toBeCloseTo(data.helm[0]);
      expect(feet.y).toBeCloseTo(data.deck);
      expect(feet.z).toBeCloseTo(data.helm[1]);
      rides.resetPosition(ride, { x: 0, z: BAY.z0 + 22, rot: 0 });
      rides.abandon(true);
      rides.update(30, 32, null);
      expect(ride.m).toMatchObject({ x: 0, z: BAY.z0 + 22 });
      expect(rides.near(water.x, water.z)).not.toBe(ride);
    }
  });
});

describe("the town-to-sea camera", () => {
  it.each([[1280, 800], [390, 844], [390, 664]])("frames the boat and words at %ix%i", (w, h) => {
    const portrait = w < h;
    const town = new Group(), mesh = makeBoats()[0], rider = new Group();
    town.add(mesh, rider);
    mesh.position.set(-10, 0, BAY.z0);
    rider.position.set(-10, 0.6, BAY.z0 + 1);
    mesh.rotation.set(0.05, Math.PI, -0.04, "YXZ");
    const townBoat = mesh.userData.rideBoat;
    const motion = new Motion({ ...BOAT, half: townBoat.half, wide: townBoat.wide }, "boat");
    motion.set(mesh.position.x, mesh.position.z, Math.PI);
    const camera = new PerspectiveCamera(54, w / h, 0.1, 900);
    camera.position.set(-10, 3, BAY.z0 + 6);
    camera.lookAt(-10, 1.6, BAY.z0);
    if (portrait) camera.setViewOffset(w, h, 0, -0.12 * h, w, h);
    const water = new Mesh(new PlaneGeometry(900, 320), new ShaderMaterial({ uniforms: { uTime: { value: 0 } } }));
    const env = { sky: new Mesh(), sea: water, fog: new Fog("lightgray", 110, 420),
      hemi: new HemisphereLight(), sun: new DirectionalLight() };
    const ride = { mesh, m: motion, townBoat, phase: 0 };
    const view = new SeaView(ride, rider, camera, env, new Mesh());
    const boat = new SeaBoat(-10, BAY.z0, Math.PI, CRUISE_SPEED);
    view.begin(boat);
    const renderer = { render() {} } as unknown as WebGLRenderer;
    view.render(renderer, w, h);
    expect(view.camera.position.toArray()).toEqual(camera.position.toArray());
    expect(view.camera.quaternion.toArray()).toEqual(camera.quaternion.toArray());
    expect(view.camera.projectionMatrix.elements).toEqual(camera.projectionMatrix.elements);

    const word = { en: "boat", lt: "valtis", situation: "s66-taxi", clip: { say: "boat", voice: "", speed: 1, male: false } };
    const gate = new SeaGate(FIRST_GATE, { word, options: ["valtis", "smėlis", "jūra"], right: 0 }, -10, BAY.z0 - FIRST_GATE);
    let time = 1;
    function assertFittedBoat() {
      const f = view.hullFrame();
      expect(f.x).toBeGreaterThanOrEqual(0.2);
      expect(f.x).toBeLessThanOrEqual(0.8);
      expect(Math.min(f.left, f.top, 1 - f.right, 1 - f.bottom)).toBeGreaterThan(0);
    }
    function driveThroughGate() {
      let readable = false;
      while (boat.distance < gate.distance) {
        time += 0.05;
        boat.drive(0.05, 0, 0);
        const ahead = gate.distance - boat.distance;
        view.pose(boat, time, 0.05, portrait, ahead);
        gate.pose(time, ahead);
        view.render(renderer, w, h, gate);
        const anchors = projectBoards("sea", gate.faces(), view.camera, w, h);
        if (ahead < 19 || ahead > 32 || anchors.length !== 3) continue;
        readable ||= anchors.every((a, i) => a.width >= (portrait ? 86 : 100) && a.height >= (portrait ? 15 : 18) * 2.16
          && a.x - a.width / 2 > 0 && a.x + a.width / 2 < w
          && a.y - a.height / 2 > 155 && a.y + a.height / 2 < h - 135
          && (i === 0 || a.x - a.width / 2 > anchors[i - 1].x + anchors[i - 1].width / 2));
      }
      return readable;
    }
    if (portrait) for (const lane of [0, 2]) {
      const outside = new SeaBoat(-10, BAY.z0, Math.PI, CRUISE_SPEED);
      outside.steer(lane);
      view.begin(outside);
      let samples = 0;
      while (gate.distance - outside.distance >= 16) {
        const ahead = gate.distance - outside.distance;
        time += 0.05;
        outside.drive(0.05, 0, 1);
        view.pose(outside, time, 0.05, portrait, ahead);
        gate.pose(time, ahead);
        view.render(renderer, w, h, gate);
        if (ahead > 32) continue;
        assertFittedBoat();
        const projection = new Matrix4().multiplyMatrices(view.camera.projectionMatrix, view.camera.matrixWorldInverse);
        expect(gate.faces()).toHaveLength(3);
        for (const face of gate.faces()) {
          const xs = projectFace("sea", face, projection, w, h)!.points.map(p => p.x);
          expect(Math.min(...xs)).toBeGreaterThanOrEqual(8);
          expect(Math.max(...xs)).toBeLessThanOrEqual(w - 8);
          expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThanOrEqual(86);
        }
        samples++;
      }
      expect(samples).toBeGreaterThan(10);
    }
    mesh.position.set(-10, 0, BAY.z0);
    mesh.rotation.set(0.05, Math.PI, -0.04, "YXZ");
    rider.position.set(-10, 0.6, BAY.z0 + 1);
    view.camera.copy(camera);
    view.begin(boat);
    expect(driveThroughGate()).toBe(true);
    for (const lane of [0, 2]) {
      boat.steer(lane);
      for (let frame = 0; frame < 40; frame++) {
        time += 0.05;
        boat.drive(0.05, 0, 0);
        view.pose(boat, time, 0.05, portrait);
        view.render(renderer, w, h);
        assertFittedBoat();
      }
      expect(boat.lane).toBe(lane);
    }

    boat.turnAround();
    for (let frame = 0; frame < 30; frame++) {
      time += 0.05;
      boat.advanceTurn(0.05);
      view.pose(boat, time, 0.05, portrait);
      view.render(renderer, w, h);
      assertFittedBoat();
    }
    const destination = seaReturn({ m: motion });
    const endpoint = boat.commitReturn();
    const rides = new Rides({ ambient: { rideBoxes: [] } } as unknown as RideHost, { ...RIDES, cars: [], boats: [] }, []);
    view.startReturn(destination, endpoint, rides);
    for (let frame = 0; frame < 24; frame++) {
      time += 0.05;
      expect(boat.advanceTurn(0.05)).toBe(frame === 23);
      view.pose(boat, time, 0.05, portrait);
      view.render(renderer, w, h);
      assertFittedBoat();
    }
    const spill = new Group(), helm = new Group(), handoff = view.handoff(time);
    rides.sampleBoatReturn(ride, destination, boat.speed, time, spill, helm);
    const offset = new Vector3(destination.x - endpoint.x, 0, destination.z - endpoint.z);
    expect(mesh.position.clone().add(offset).distanceTo(spill.position)).toBeLessThan(0.0001);
    expect(rider.position.clone().add(offset).distanceTo(helm.position)).toBeLessThan(0.0001);
    expect(view.camera.quaternion.angleTo(handoff.camera.quaternion)).toBeLessThan(0.0001);
    expect(handoff.camera.projectionMatrix.elements).toEqual(view.camera.projectionMatrix.elements);
    gate.dispose();
    view.dispose();
    expect(mesh.parent).toBe(town);
    expect(rider.parent).toBe(town);
    expect(rider.position.toArray()).toEqual([-10, 0.6, BAY.z0 + 1]);
  });
});

describe("passing a sea gate", () => {
  it.each([true, false])("keeps the selected label in view while crossing (correct=%s)", (correct) => {
    const w = 1280, h = 800;
    const camera = new PerspectiveCamera(52, w / h, 0.1, 900);
    camera.position.set(7, 4.4, 10);
    camera.updateMatrixWorld(true);
    const word = { en: "boat", lt: "valtis", situation: "s66-taxi", clip: { say: "boat", voice: "", speed: 1, male: false } };
    const gate = new SeaGate(FIRST_GATE, { word, options: ["valtis", "smėlis", "jūra"], right: correct ? 2 : 0 }, 0, 0);

    gate.cross(2, correct);
    gate.pose(1, 0);
    const first = projectBoards("sea", gate.faces(), camera, w, h);
    expect(first).toHaveLength(1);
    expect(first[0].lane).toBe(2);
    expect(first[0].opacity).toBe(correct ? 0.93 : 0.59);
    expect(Math.abs(first[0].tilt!)).toBeLessThan(0.4);
    if (!correct) expect(first[0].tilt).toBeGreaterThan(0.2);

    camera.position.set(6.8, 4.4, 5);
    camera.updateMatrixWorld(true);
    gate.pose(1.3, -5, 1, 0.3);
    const [closer] = projectBoards("sea", gate.faces(), camera, w, h);
    const board = gate.mesh.children[3];
    const center = new Vector3(0, 0, 0.25).applyMatrix4(board.matrixWorld).project(camera);
    expect(closer.width).toBeGreaterThan(first[0].width);
    expect(closer.opacity).toBeLessThan(first[0].opacity);
    expect(closer.center.x).toBeCloseTo((1 + center.x) * w / 2);
    expect(closer.center.y).toBeCloseTo((1 - center.y) * h / 2);

    camera.position.z = -1;
    camera.updateMatrixWorld(true);
    expect(projectBoards("sea", gate.faces(), camera, w, h)).toEqual([]);
    gate.dispose();
  });
});
