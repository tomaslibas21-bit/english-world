import { beforeAll, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { CameraRig } from "../src/game/camera";
import { Game } from "../src/game/Game";
import { ModeRegistry, type GameMode } from "../src/game/kit/modes";
import { CUT, withCutout } from "../src/game/cutout";
import { angleDiff } from "../src/game/movement";
import { initTownCollision } from "../src/game/townCollisionCache";
import { carFootprint, carModelEntry } from "../src/game/world/carModels";
import { DROPOFF, OUTDOOR_NPCS, PARKED_CARS, TAXI, TRAFFIC_CARS, TRAFFIC_LANES, taxiStandFrameAt } from "../src/game/world/layout";
import { buildTown } from "../src/game/world/town";
import { townCanvasDocument } from "../tools/town-canvas-stub";

const vinnie = OUTDOOR_NPCS.find((npc) => npc.npc === "vinnie")!;
const DT = 1 / 60;
const SCREENS = [[1280, 800], [390, 844], [844, 390]];
const prompt = { x: TAXI.x, z: TAXI.z + 2.4, rot: Math.PI };
// Rides.carExit tries 1.8 m to the driver's side and 0.3 m back first.
const stepOut = new THREE.Vector3(1.8, 0, -0.3).applyAxisAngle(new THREE.Vector3(0, 1, 0), TAXI.rot);
const rideReturn = { x: TAXI.x + stepOut.x, z: TAXI.z + stepOut.z, rot: TAXI.rot };
const { height, length, width } = carModelEntry(TAXI.model).collisionBox;
const taxiPoint = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)
  .applyAxisAngle(new THREE.Vector3(0, 1, 0), TAXI.rot).add(new THREE.Vector3(TAXI.x, 0, TAXI.z));

describe("Gas & Go follow camera", () => {
  let field: ReturnType<typeof initTownCollision>["field"];
  let fader: ReturnType<typeof initTownCollision>["fader"];
  let canopy: THREE.Mesh<THREE.BufferGeometry, THREE.Material>[];
  let town: ReturnType<typeof buildTown>;
  const overhead: THREE.Vector3[][] = [];
  const ray = new THREE.Raycaster();
  const sample = new THREE.Vector2();
  const sightline = new THREE.Line3(CUT.a.value, CUT.b.value);
  const closest = new THREE.Vector3();

  beforeAll(() => {
    vi.stubGlobal("document", townCanvasDocument());
    try {
      town = buildTown();
      ({ field, fader } = initTownCollision(town, undefined, () => {}));
      withCutout(town.group);
      canopy = town.group.getObjectByName("gas-canopy-assembly")!.children as typeof canopy;
      // The terminal roof and both canopies' posts are baked into town-solid. Recover their actual triangles.
      const canopyParts = [
        new THREE.Box3(new THREE.Vector3(126, 5.2, -18), new THREE.Vector3(134, 5.6, 2)),
        ...[-17, -11, -5, 1].map((z) => new THREE.Box3(
          new THREE.Vector3(126.35, 0, z - 0.15), new THREE.Vector3(126.65, 5.4, z + 0.15),
        )),
        ...[104, 110, 116].map((x) => new THREE.Box3(
          new THREE.Vector3(x - 0.18, 0, 2.82), new THREE.Vector3(x + 0.18, 4.6, 3.18),
        )),
      ].map((box) => box.expandByScalar(0.01));
      town.group.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (!mesh.isMesh || (object as THREE.InstancedMesh).isInstancedMesh) return;
        const { position } = mesh.geometry.attributes, index = mesh.geometry.index;
        for (let i = 0; i < (index?.count ?? position.count); i += 3) {
          const triangle = [0, 1, 2].map((offset) => new THREE.Vector3()
            .fromBufferAttribute(position, index ? index.getX(i + offset) : i + offset).applyMatrix4(mesh.matrixWorld));
          if (canopy.includes(mesh as typeof canopy[number]) || canopyParts.some((box) => triangle.every((v) => box.containsPoint(v)))) overhead.push(triangle);
        }
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  function followCamera(w: number, h: number, start: THREE.Vector3, heading: number, running: boolean) {
    const rig = new CameraRig(w / h);
    const sideways = w > h && h <= 520;
    rig.resize(w, h, sideways);
    rig.space = {
      free: (a, b) => field.free(a, b),
      inside: (p) => field.solidAt(p.x, p.y, p.z, 0.15),
      overSolid: (x, z) => field.overSolid(x, z),
    };
    rig.target.copy(start);
    rig.yaw = rig.motion.dir = heading;
    rig.motion.next.copy(start);
    rig.cam.fov = rig.fovFor(w, h, running);
    rig.cam.updateProjectionMatrix();
    rig.applyViewShift(w, h, 0, sideways ? -h * 0.1 : h > w * 1.15 ? -h * 0.12 : 0);
    rig.snap();
    rig.applyPose();
    return rig;
  }

  function advance(rig: CameraRig, learner: THREE.Vector3, velocity: THREE.Vector3, heading: number) {
    const speed = velocity.length();
    rig.target.lerp(learner, DT * 10);
    rig.motion.next.copy(learner).addScaledVector(velocity, 0.3);
    rig.motion.dir = heading;
    rig.motion.speed = speed;
    rig.update(DT, heading, speed > 0.7, true, true, taxiStandFrameAt(learner.x, learner.z, rig.cam.aspect));
    const fov = rig.fovFor(rig.cam.aspect, 1, speed * speed > 30);
    rig.cam.fov = THREE.MathUtils.lerp(rig.cam.fov, fov, DT * 3);
    rig.cam.updateProjectionMatrix();
    const w = rig.cam.view?.fullWidth ?? 1280, h = rig.cam.view?.fullHeight ?? 800;
    applyViewShift(rig, w, h);
    rig.cam.updateMatrixWorld();
    CUT.a.value.copy(rig.cam.position);
    CUT.b.value.copy(learner).y = 1.35;
    CUT.r.value = 0.55;
    fader.update(DT, CUT.a.value, CUT.b.value);
  }

  function applyViewShift(rig: CameraRig, w: number, h: number) {
    const game: Game = Object.assign(Object.create(Game.prototype), { rig, screenW: w, screenH: h });
    game["applyWalkingViewShift"](w, h, false);
  }

  // Raycasting sees the unmodified geometry. The shader dithers only hits inside this tube.
  function insideCutout(point: THREE.Vector3) {
    const t = sightline.closestPointToPointParameter(point, true);
    sightline.at(t, closest);
    return t > 0.03 && t < 0.9 && closest.distanceTo(point) < CUT.r.value;
  }

  function canopyHits(cam: THREE.PerspectiveCamera, x: number, y: number) {
    ray.setFromCamera(sample.set(x, y), cam);
    return ray.intersectObjects(canopy, false).filter((hit) => hit.point.clone().project(cam).z >= -1);
  }

  function expectProjected(cam: THREE.PerspectiveCamera, subject: THREE.Vector3, name: string) {
    const projected = subject.clone().project(cam);
    expect(Math.max(Math.abs(projected.x), Math.abs(projected.y), Math.abs(projected.z)), name).toBeLessThan(1);
    return projected;
  }

  function expectInView(cam: THREE.PerspectiveCamera, subject: THREE.Vector3, name: string) {
    const projected = expectProjected(cam, subject, name);
    const distance = cam.position.distanceTo(subject);
    const hits = canopyHits(cam, projected.x, projected.y).filter((hit) => hit.distance < distance);
    expect(hits.every((hit) => insideCutout(hit.point)), name).toBe(true);
    return hits.length > 0;
  }

  function projectedBox(cam: THREE.PerspectiveCamera, corners: THREE.Vector3[], name: string) {
    return new THREE.Box2().setFromPoints(corners.map((point) => expectProjected(cam, point, name)));
  }

  function personCorners(position: THREE.Vector3) {
    const corners = [];
    for (const x of [-0.45, 0.45]) for (const z of [-0.45, 0.45]) for (const y of [0, 1.95])
      corners.push(position.clone().add(new THREE.Vector3(x, y, z)));
    return corners;
  }

  function expectComposition(cam: THREE.PerspectiveCamera, learner: THREE.Vector3) {
    const corners = [];
    for (const x of [-width / 2, width / 2]) for (const z of [-length / 2, length / 2])
      for (const y of [0, height]) corners.push(taxiPoint(x, y, z));
    const taxi = projectedBox(cam, corners, "whole taxi");
    const size = taxi.getSize(new THREE.Vector2());
    if (Math.abs(cam.aspect - 1280 / 800) < 0.01) {
      const direction = cam.getWorldDirection(new THREE.Vector3());
      expect(Math.asin(-direction.y) * 180 / Math.PI, "desktop angle below horizontal").toBeLessThanOrEqual(40);
      expect(size.x / 2, "taxi's share of the desktop width").toBeGreaterThanOrEqual(0.22);
      expect(size.x / 2, "taxi's share of the desktop width").toBeLessThan(0.36);
    }
    let lowest = taxi.min.y;
    for (const [name, position] of [
      ["learner", learner],
      ["Vinnie", new THREE.Vector3(vinnie.x, 0, vinnie.z)],
    ] as const) {
      const person = projectedBox(cam, personCorners(position), name);
      const intersection = taxi.clone().intersect(person).getSize(new THREE.Vector2());
      expect(intersection.x * intersection.y / (size.x * size.y), name + " overlap with taxi").toBeLessThan(0.2);
      lowest = Math.min(lowest, person.min.y);
    }
    expect((lowest + 1) / 2, "empty ground below the subjects").toBeLessThan(0.28);
  }

  function entersUpperFrame(triangle: THREE.Vector3[], matrix: THREE.Matrix4) {
    let polygon = triangle.map((point) => new THREE.Vector4(point.x, point.y, point.z, 1).applyMatrix4(matrix));
    const planes = [
      (p: THREE.Vector4) => p.w + p.x, (p: THREE.Vector4) => p.w - p.x,
      (p: THREE.Vector4) => p.y, (p: THREE.Vector4) => p.w - p.y,
      (p: THREE.Vector4) => p.w + p.z, (p: THREE.Vector4) => p.w - p.z,
    ];
    // Clip in homogeneous coordinates so a roof extending behind the eye cannot produce a false screen overlap.
    for (const plane of planes) {
      const clipped: THREE.Vector4[] = [];
      for (let i = 0; i < polygon.length; i++) {
        const a = polygon[i], b = polygon[(i + 1) % polygon.length], da = plane(a), db = plane(b);
        if (da >= 0) clipped.push(a);
        if ((da < 0) !== (db < 0)) clipped.push(a.clone().lerp(b, da / (da - db)));
      }
      polygon = clipped;
    }
    return polygon.length >= 3;
  }

  function expectClearStand(cam: THREE.PerspectiveCamera, learner: THREE.Vector3) {
    expect(field.solidAt(cam.position.x, cam.position.y, cam.position.z, 0.15)).toBe(false);
    const chest = learner.clone().add(new THREE.Vector3(0, 1.35, 0));
    const subjects = {
      "taxi roof": taxiPoint(0, height, 0),
      "taxi centre": taxiPoint(0, height / 2, 0),
      "taxi front": taxiPoint(0, height / 2, length / 2),
      "taxi rear": taxiPoint(0, height / 2, -length / 2),
      "learner chest": chest,
      "Vinnie": new THREE.Vector3(vinnie.x, 1.65, vinnie.z),
    };
    for (const [name, point] of Object.entries(subjects)) {
      expectProjected(cam, point, name);
      const direction = point.clone().sub(cam.position);
      const distance = direction.length();
      ray.set(cam.position, direction.normalize());
      expect(ray.intersectObjects(canopy, false).filter((hit) => hit.distance < distance), name).toHaveLength(0);
      if (name.startsWith("taxi")) {
        const hits = ray.intersectObject(town.group, true).filter((hit) => hit.distance < distance - 0.01);
        expect(hits.map((hit) => ({ mesh: hit.object.name, at: hit.point.toArray() })), name + " through town").toHaveLength(0);
      }
    }
    for (const x of [-width / 2, width / 2]) for (const z of [-length / 2, length / 2]) {
      for (const y of [0, height]) expectProjected(cam, taxiPoint(x, y, z), "taxi bounding box");
    }
    for (const y of [0, 1.95]) expectProjected(cam, learner.clone().add(new THREE.Vector3(0, y, 0)), "learner");
    expectComposition(cam, learner);

    // Even the tube's outer radius must miss the roof, trim and sign.
    const tube = chest.clone().sub(cam.position);
    const tubeStart = cam.position.clone().addScaledVector(tube, 0.03);
    ray.set(tubeStart, tube.normalize());
    for (const mesh of canopy) {
      const bounds = new THREE.Box3().setFromObject(mesh).expandByScalar(CUT.r.value);
      const hit = ray.ray.intersectBox(bounds, closest);
      expect(hit && hit.distanceTo(tubeStart) < cam.position.distanceTo(chest) * 0.87, mesh.name).toBeFalsy();
    }
  }

  function hasVisibleRoof(cam: THREE.PerspectiveCamera) {
    const grid = [-0.85, -0.6, -0.3, 0, 0.3, 0.6, 0.85];
    return grid.some((x) => grid.some((y) => {
      const [hit] = canopyHits(cam, x, y);
      return hit && !insideCutout(hit.point) && (hit.object as typeof canopy[number]).material.opacity === 1;
    }));
  }

  it("renders the roof, fascia and sign with the shared sightline shader", () => {
    expect(canopy.map((mesh) => mesh.name)).toEqual(expect.arrayContaining(["gas-canopy", "gas-canopy-trim", "gas-canopy-sign"]));
    for (const mesh of canopy) {
      const { material } = mesh;
      expect(mesh.visible && mesh.parent?.visible && material.visible).toBe(true);
      const source = THREE.ShaderLib[material.type === "MeshBasicMaterial" ? "basic" : "lambert"];
      const shader = { ...source, uniforms: {} } as Parameters<THREE.Material["onBeforeCompile"]>[0];
      material.onBeforeCompile(shader, {} as THREE.WebGLRenderer);
      expect(shader.uniforms.uCutA).toBe(CUT.a);
      expect(shader.uniforms.uCutB).toBe(CUT.b);
      expect(shader.uniforms.uCutR).toBe(CUT.r);
      expect(shader.fragmentShader).toContain("length(vCutW - (uCutA + ab * t)) < uCutR");
    }
  });

  describe.each(SCREENS)("%i×%i stand framing", (w, h) => {
    it.each([["prompt", prompt], ["map drop", DROPOFF["taxi-stand"]], ["ride return", rideReturn]] as const)(
      "frames the learner, Vinnie and the whole taxi at the %s with clear sightlines",
      (_, { x, z, rot }) => {
        const learner = new THREE.Vector3(x, 0, z);
        const rig = followCamera(w, h, learner, rot, false);
        const still = new THREE.Vector3();
        const initial = rig.cam.position.clone();
        advance(rig, learner, still, rot);
        const firstStep = initial.distanceTo(rig.cam.position);
        for (let frame = 1; frame < 36; frame++) advance(rig, learner, still, rot);
        expect(firstStep).toBeGreaterThan(0);
        expect(firstStep).toBeLessThan(initial.distanceTo(rig.cam.position) / 3);
        expectClearStand(rig.cam, learner);
      },
    );
  });

  it("eases around the learner when approaching from the opposite side", () => {
    const learner = new THREE.Vector3(prompt.x, 0, prompt.z);
    const [eyeX, , eyeZ] = taxiStandFrameAt(learner.x, learner.z, 1280 / 800)!.eye;
    const heading = Math.atan2(eyeX - learner.x, eyeZ - learner.z);
    const rig = followCamera(1280, 800, learner, heading, false);
    const still = new THREE.Vector3();
    for (let frame = 0; frame < 36; frame++) {
      advance(rig, learner, still, heading);
      expect(rig.cam.position.distanceTo(CUT.b.value)).toBeGreaterThan(6);
    }
    expectClearStand(rig.cam, learner);
  });

  it("holds the learner's drag after the manual aim timer expires", () => {
    const learner = new THREE.Vector3(prompt.x, 0, prompt.z);
    const rig = followCamera(1280, 800, learner, prompt.rot, false);
    const still = new THREE.Vector3();
    for (let frame = 0; frame < 60; frame++) advance(rig, learner, still, prompt.rot);
    const standYaw = rig.yaw;
    rig.drag(225, 0);
    const dragYaw = rig.yaw;
    for (let frame = 0; frame < 150; frame++) advance(rig, learner, still, prompt.rot);
    expect(Math.abs(angleDiff(dragYaw, standYaw))).toBeGreaterThan(1);
    expect(angleDiff(rig.yaw, dragYaw)).toBeCloseTo(0, 6);
    expect(rig.manuallyAiming).toBe(false);
    expect(rig.standView).toBeUndefined();
    expect(rig.fovFor(1280, 800, false)).toBe(55);
  });

  it("excludes pending launches, every ride phase, the score and restart, then resumes only on foot", () => {
    const learner = new THREE.Vector3(prompt.x, 0, prompt.z);
    const rig = followCamera(1280, 800, learner, prompt.rot, false);
    const modes = new ModeRegistry({ read: () => null, set: () => {} });
    let phase = "pending";
    modes.register({ id: "taxi", get active() { return phase !== "pending"; }, start: () => true } as GameMode);
    const game: Game = Object.assign(Object.create(Game.prototype), {
      rig, modes, zone: { id: "town" }, player: { root: { position: learner } },
      rides: { riding: null }, hop: { ground: 0 }, transitioning: false,
    });
    const frame = () => game["taxiStandFrame"]();
    const update = () => rig.update(DT, prompt.rot, false, true, true, frame());
    expect(frame()).toBeDefined();
    update();
    expect(rig.standView).toBeDefined();
    expect(modes.start("taxi")).toBe(true);
    expect(modes.active).toBeNull(); // Selected, but the launch fade has not boarded the learner yet.
    for (const step of ["pending", "opening", "drive", "wrong", "passed", "closing", "result", "pending", "opening", "drive"]) {
      phase = step;
      expect(frame(), step).toBeUndefined();
      update();
      expect(rig.standView, step).toBeUndefined();
      expect(rig.fovFor(1280, 800, false), step).toBe(55);
    }
    modes.left("taxi");
    // Returning to town during a fade, in a conversation or still in a car is not standing at the prompt.
    for (const state of [
      { transitioning: true }, { session: { active: true } }, { rides: { riding: {} } }, { zone: { id: "hotel" } },
    ]) {
      const blocked = Object.assign(Object.create(game), state) as Game;
      expect(blocked["taxiStandFrame"]()).toBeUndefined();
    }
    expect(frame()).toBeDefined();
    update();
    expect(rig.standView).toBeDefined();
  });

  it.each(SCREENS)("starts the same %i×%i taxi shot after standing, a score and a restart", (w, h) => {
    const learner = new THREE.Vector3(prompt.x, 0, prompt.z);
    const rig = followCamera(w, h, learner, prompt.rot, false);
    const fresh = followCamera(w, h, learner, prompt.rot, false);
    for (let frame = 0; frame < 120; frame++) advance(rig, learner, new THREE.Vector3(), prompt.rot);
    const position = new THREE.Vector3(TAXI.x, 0, TAXI.z);
    const subject = { position, heading: () => TAXI.rot, width, height, length };
    for (let pickup = 0; pickup < 2; pickup++) {
      if (pickup) {
        rig.mode = "stage";
        rig.stage = { pos: new THREE.Vector3(5, 7, 10), look: learner.clone(), rate: 6, fov: 62, shiftY: -0.1 };
        rig.stageSnap();
      }
      for (const camera of [rig, fresh]) {
        camera.snapTaxi(subject, () => true);
        applyViewShift(camera, w, h);
      }
      expect(rig.standView).toBeUndefined();
      expect(rig.cam.position.distanceTo(fresh.cam.position)).toBeLessThan(1e-9);
      expect(rig.cam.quaternion.angleTo(fresh.cam.quaternion)).toBeLessThan(1e-7);
      expect(rig.cam.fov).toBe(fresh.cam.fov);
      expect(rig.cam.view).toEqual(fresh.cam.view);
      expect(rig.pitch).toBe(fresh.pitch);
      expect(rig.dist).toBe(fresh.dist);
      expect(rig.manualTurn).toBe(fresh.manualTurn);
      for (let step = 0; step < 180; step++) {
        position.x -= 0.05;
        for (const camera of [rig, fresh]) {
          camera.target.copy(position);
          camera.motion.speed = 3;
          camera.motion.dir = TAXI.rot;
          camera.motion.next.copy(position).x -= 0.9;
          camera.update(DT, TAXI.rot, true, true, true);
        }
        expect(rig.standView).toBeUndefined();
        expect(rig.cam.position.distanceTo(fresh.cam.position)).toBeLessThan(1e-9);
      }
      position.set(TAXI.x, 0, TAXI.z);
    }
  });

  it("cuts straight to the clear stand view with reduced motion", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    try {
      const learner = new THREE.Vector3(prompt.x, 0, prompt.z);
      const rig = followCamera(390, 844, learner, prompt.rot, false);
      advance(rig, learner, new THREE.Vector3(), prompt.rot);
      expectClearStand(rig.cam, learner);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it.each(SCREENS)("keeps the %i×%i eye clear of passing traffic and parked cars", (w, h) => {
    const [x, , z] = taxiStandFrameAt(prompt.x, prompt.z, w / h)!.eye;
    const traffic = TRAFFIC_CARS.map(({ model }) => carModelEntry(model).collisionBox);
    const halfLength = Math.max(...traffic.map(({ length }) => length)) / 2;
    const halfWidth = Math.max(...traffic.map(({ width }) => width)) / 2;
    const bands = TRAFFIC_LANES.map((lane) => ({
      minX: lane.from - halfLength, maxX: lane.to + halfLength,
      minZ: lane.z - halfWidth, maxZ: lane.z + halfWidth,
    }));
    for (const box of [...bands, ...PARKED_CARS.map(carFootprint)]) {
      const distance = Math.hypot(Math.max(box.minX - x, 0, x - box.maxX), Math.max(box.minZ - z, 0, z - box.maxZ));
      expect(distance, "camera clearance from a traffic band or parked car").toBeGreaterThan(0.5);
    }
  });

  it.each(SCREENS)("keeps both canopies and their posts out of the upper %i×%i view", (w, h) => {
    for (const { x, z, rot } of [prompt, DROPOFF["taxi-stand"], rideReturn]) {
      const learner = new THREE.Vector3(x, 0, z);
      const rig = followCamera(w, h, learner, rot, false);
      for (let frame = 0; frame < 120; frame++) advance(rig, learner, new THREE.Vector3(), rot);
      expect(overhead.length).toBeGreaterThan(50);
      const matrix = new THREE.Matrix4().multiplyMatrices(rig.cam.projectionMatrix, rig.cam.matrixWorldInverse);
      expect(overhead.filter((triangle) => entersUpperFrame(triangle, matrix))).toHaveLength(0);
    }
  });

  it.each([[1280, 800], [390, 844]])("keeps the %i×%i follow view open from the pumps to Vinnie", (w, h) => {
    // Last stretch of the spawn-to-Vinnie route, including the two turns by the gas station.
    const route = [[98, -4.975], [116.5, 1.5], [119.5, 1.5], [123, -1.4]]
      .map(([x, z]) => new THREE.Vector3(x, 0, z));
    const learner = route[0].clone();
    const arrival = route.at(-1)!;
    const velocity = new THREE.Vector3();
    const desired = new THREE.Vector3();
    let heading = Math.atan2(route[1].x - learner.x, route[1].z - learner.z);
    const rig = followCamera(w, h, learner, heading, true);
    let waypoint = 1;
    let sawLocalCutout = false;
    for (let frame = 0; frame < 360; frame++) {
      if (waypoint < route.length && learner.distanceTo(route[waypoint]) < 0.35) waypoint++;
      const speed = learner.distanceTo(arrival) > 12 ? 7.4 : 4.4;
      if (waypoint < route.length) desired.subVectors(route[waypoint], learner).normalize().multiplyScalar(speed);
      else desired.set(0, 0, 0);
      velocity.lerp(desired, DT * 10);
      learner.addScaledVector(velocity, DT);
      if (velocity.length() > 0.3) heading = Math.atan2(velocity.x, velocity.z);
      advance(rig, learner, velocity, heading);
      if (velocity.length() > 0.15) {
        expect(rig.cam.position.distanceTo(CUT.b.value), `walking distance at x=${learner.x.toFixed(1)}`).toBeGreaterThan(6);
      }
      const clipped = expectInView(rig.cam, CUT.b.value, "learner's torso");
      if (clipped) sawLocalCutout ||= hasVisibleRoof(rig.cam);
      expectInView(rig.cam, learner.clone().setY(1.95), "learner's head");
      expectInView(rig.cam, learner.clone().setY(0.15), "learner's feet");
      if (learner.x >= 104 && learner.x <= 116) {
        const pathAhead = learner.clone().addScaledVector(velocity, 0.35).setY(0.1);
        expectInView(rig.cam, pathAhead, "walking surface ahead of the learner");
        expect(hasVisibleRoof(rig.cam), `roof beside the path at x=${learner.x.toFixed(1)}`).toBe(true);
      }
    }
    expect(learner.distanceTo(arrival)).toBeLessThan(0.4);
    expect(sawLocalCutout).toBe(true);
    expectClearStand(rig.cam, learner);
  });
});
