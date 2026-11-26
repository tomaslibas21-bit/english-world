import { beforeAll, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { CameraRig } from "../src/game/camera";
import { CUT, withCutout } from "../src/game/cutout";
import { angleDiff } from "../src/game/movement";
import { initTownCollision } from "../src/game/townCollisionCache";
import { carModelEntry } from "../src/game/world/carModels";
import { DROPOFF, OUTDOOR_NPCS, TAXI, taxiStandFrameAt } from "../src/game/world/layout";
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
  const ray = new THREE.Raycaster();
  const sample = new THREE.Vector2();
  const sightline = new THREE.Line3(CUT.a.value, CUT.b.value);
  const closest = new THREE.Vector3();

  beforeAll(() => {
    vi.stubGlobal("document", townCanvasDocument());
    try {
      const town = buildTown();
      ({ field, fader } = initTownCollision(town, undefined, () => {}));
      withCutout(town.group);
      canopy = town.group.getObjectByName("gas-canopy-assembly")!.children as typeof canopy;
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
    rig.update(DT, heading, speed > 0.7, true, true, taxiStandFrameAt(learner.x, learner.z));
    const fov = rig.fovFor(rig.cam.aspect, 1, speed * speed > 30);
    rig.cam.fov = THREE.MathUtils.lerp(rig.cam.fov, fov, DT * 3);
    rig.cam.updateProjectionMatrix();
    rig.cam.updateMatrixWorld();
    CUT.a.value.copy(rig.cam.position);
    CUT.b.value.copy(learner).y = 1.35;
    CUT.r.value = 0.55;
    fader.update(DT, CUT.a.value, CUT.b.value);
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
    }
    for (const x of [-width / 2, width / 2]) for (const z of [-length / 2, length / 2]) {
      for (const y of [0, height]) expectProjected(cam, taxiPoint(x, y, z), "taxi bounding box");
    }
    for (const y of [0, 1.95]) expectProjected(cam, learner.clone().add(new THREE.Vector3(0, y, 0)), "learner");

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
    const [eyeX, , eyeZ] = taxiStandFrameAt(learner.x, learner.z)!.eye;
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
      expect(rig.cam.position.distanceTo(CUT.b.value), `follow distance at x=${learner.x.toFixed(1)}`).toBeGreaterThan(6);
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
