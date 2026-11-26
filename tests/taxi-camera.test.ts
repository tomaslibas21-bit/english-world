import { beforeAll, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { TAXI_ROUTES } from "../src/content/taxi";
import { CameraRig } from "../src/game/camera";
import { CUT, withCutout } from "../src/game/cutout";
import { initTownCollision } from "../src/game/townCollisionCache";
import { OUTDOOR_NPCS, ROADS, SIDEWALK, TAXI } from "../src/game/world/layout";
import { carModelEntry } from "../src/game/world/carModels";
import { buildTown } from "../src/game/world/town";
import { townCanvasDocument } from "../tools/town-canvas-stub";

const vinnie = OUTDOOR_NPCS.find((npc) => npc.npc === "vinnie")!;
const DT = 1 / 60;

describe("Gas & Go follow camera", () => {
  let field: ReturnType<typeof initTownCollision>["field"];
  let fader: ReturnType<typeof initTownCollision>["fader"];
  let canopy: THREE.Mesh<THREE.BufferGeometry, THREE.Material>[];
  let pavingBatches: THREE.Mesh[];
  let solidBatches: THREE.Mesh[];
  let brickWalk: THREE.Object3D;
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
      brickWalk = town.group.getObjectByName("brick-walk")!;
      solidBatches = town.group.children.filter((o): o is THREE.Mesh => o instanceof THREE.Mesh && o.name.startsWith("town-solid-"));
      pavingBatches = solidBatches.filter((mesh) => !mesh.castShadow);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  function followCamera(w: number, h: number, start: THREE.Vector3, heading: number, running: boolean) {
    const rig = new CameraRig(w / h);
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
    rig.applyViewShift(w, h, 0, w < h ? -h * 0.12 : 0);
    rig.snap();
    return rig;
  }

  function advance(rig: CameraRig, learner: THREE.Vector3, velocity: THREE.Vector3, heading: number) {
    const speed = velocity.length();
    rig.target.lerp(learner, DT * 10);
    rig.motion.next.copy(learner).addScaledVector(velocity, 0.3);
    rig.motion.dir = heading;
    rig.motion.speed = speed;
    rig.update(DT, heading, speed > 0.7, true, true);
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

  function expectInView(cam: THREE.PerspectiveCamera, subject: THREE.Vector3, name: string) {
    const projected = subject.clone().project(cam);
    expect(Math.max(Math.abs(projected.x), Math.abs(projected.y), Math.abs(projected.z)), name).toBeLessThan(1);
    const distance = cam.position.distanceTo(subject);
    const hits = canopyHits(cam, projected.x, projected.y).filter((hit) => hit.distance < distance);
    expect(hits.every((hit) => insideCutout(hit.point)), name).toBe(true);
    return hits.length > 0;
  }

  function hasVisibleRoof(cam: THREE.PerspectiveCamera) {
    const grid = [-0.85, -0.6, -0.3, 0, 0.3, 0.6, 0.85];
    return grid.some((x) => grid.some((y) => {
      const [hit] = canopyHits(cam, x, y);
      return hit && !insideCutout(hit.point) && (hit.object as typeof canopy[number]).material.opacity === 1;
    }));
  }

  it("keeps Harborview's trim, underside and collared posts inside the original canopy", () => {
    const roof = new THREE.Box3(), posts = new THREE.Box3();
    const palette = new Set([0x823d43, 0xead8b5, 0x50363a, 0xaa8153, 0x70584a, 0xbd9860]);
    const seen = new Set<number>(), p = new THREE.Vector3(), c = new THREE.Color();
    let vertices = 0;
    for (const mesh of solidBatches) {
      const { position, color } = mesh.geometry.attributes;
      for (let i = 0; i < position.count; i++) {
        p.fromBufferAttribute(position, i);
        if (Math.abs(p.x + 87) > 8 || Math.abs(p.z + 16) > 6) continue;
        const hex = c.setRGB(color.getX(i), color.getY(i), color.getZ(i)).getHex();
        if (!palette.has(hex)) continue;
        seen.add(hex);
        (hex === 0x70584a || hex === 0xbd9860 ? posts : roof).expandByPoint(p);
        vertices++;
      }
    }
    expect(seen).toEqual(palette);
    expect(roof.min.x).toBe(-91); expect(roof.max.x).toBe(-83);
    expect(roof.min.z).toBe(-18); expect(roof.max.z).toBe(-14);
    expect(roof.min.y).toBeCloseTo(3.225); expect(roof.max.y).toBeCloseTo(3.575);
    expect(posts.min.x).toBeCloseTo(-90.7 - Math.sin(Math.PI / 3) * 0.08);
    expect(posts.max.x).toBeCloseTo(-83.3 + Math.sin(Math.PI / 3) * 0.08);
    expect(posts.min.z).toBeCloseTo(-14.28); expect(posts.max.z).toBeCloseTo(-14.12);
    expect(posts.min.y).toBeCloseTo(0); expect(posts.max.y).toBeCloseTo(3.4);
    expect(vertices / 3).toBeLessThanOrEqual(60 + 120); // original slab and two six-sided posts
  });

  it.each([[1280, 800], [390, 844]])("sees the hotel fascia, cab and stop bay on route 1 at %i×%i", (w, h) => {
    const stop = TAXI_ROUTES[0].decisions.at(-1)!, via = stop.via!.at(-1)!;
    const cab = new THREE.Vector3(via.x, 0, via.z);
    const heading = Math.atan2(stop.at.x - via.x, stop.at.z - via.z);
    const rig = followCamera(w, h, cab, heading, false);
    rig.applyPose(); rig.cam.updateMatrixWorld();
    const targets = [
      cab.clone().setY(carModelEntry("taxi").collisionBox.height),
      new THREE.Vector3(stop.at.x, 0.04, stop.at.z),
      new THREE.Vector3(-85.5, 3.47, -14.02),
    ];
    for (const target of targets) {
      const ndc = target.clone().project(rig.cam);
      expect(Math.max(Math.abs(ndc.x), Math.abs(ndc.y), Math.abs(ndc.z))).toBeLessThan(1);
      const toward = target.clone().sub(rig.cam.position);
      const probe = new THREE.Raycaster(rig.cam.position, toward.clone().normalize(), rig.cam.near, toward.length() - 0.01);
      expect(probe.intersectObjects(solidBatches, false)).toHaveLength(0);
    }
    const fascia = targets[2];
    ray.set(rig.cam.position, fascia.clone().sub(rig.cam.position).normalize());
    const [hit] = ray.intersectObjects(solidBatches, false);
    expect(hit.point.distanceTo(fascia)).toBeLessThan(0.01);
  });

  it("contains both turned ends of the boarding inset on Main Street's brick sidewalk", () => {
    const main = ROADS.find((r) => r.name === "Main Street")!;
    const curb = main.z1 + main.w / 2;
    const middle = TAXI.z + 2.4;
    const down = new THREE.Vector3(0, -1, 0);
    const surface = (x: number, z: number) => {
      ray.set(new THREE.Vector3(x, 0.14, z), down);
      return ray.intersectObjects([brickWalk, ...pavingBatches], false)[0];
    };
    const color = (hit: THREE.Intersection) => {
      const attr = (hit.object as THREE.Mesh).geometry.getAttribute("color");
      const i = hit.face!.a;
      return new THREE.Color(attr.getX(i), attr.getY(i), attr.getZ(i)).getHexString();
    };
    for (const end of [-1, 1]) {
      const edgeX = TAXI.x + end * 2.25;
      expect(edgeX).toBeGreaterThan(main.x1);
      expect(edgeX).toBeLessThan(main.x2);
      for (const side of [-1, 1]) {
        const edgeZ = middle + side * 0.375;
        expect(edgeZ).toBeGreaterThan(curb);
        expect(edgeZ).toBeLessThan(curb + SIDEWALK);
        const x = edgeX - end * 0.01, z = edgeZ - side * 0.01;
        const stone = surface(x, z);
        expect(pavingBatches).toContain(stone.object);
        expect(color(stone)).toBe("52606a");
        expect(stone.point.y).toBeCloseTo(0.030, 3);
        expect(surface(edgeX + end * 0.01, z).object).toBe(brickWalk);
        expect(surface(x, edgeZ + side * 0.01).object).toBe(brickWalk);
      }
      expect(color(surface(edgeX - end * 0.33, middle + 0.26))).toBe("ecd6ab");
    }
    expect(color(surface(TAXI.x, middle - 0.33))).toBe("ecd6ab");
    expect(color(surface(TAXI.x + 0.3, middle))).toBe("bb7942");
  });

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

  it.each([[1280, 800], [390, 844]])("keeps the learner and taxi framed at the %i×%i taxi prompt", (w, h) => {
    const learner = new THREE.Vector3(TAXI.x, 0, TAXI.z + 2.4);
    const taxi = new THREE.Vector3(TAXI.x, 0.9, TAXI.z);
    const heading = Math.PI;
    const rig = followCamera(w, h, learner, heading, false);
    const still = new THREE.Vector3();
    for (let frame = 0; frame < 120; frame++) {
      advance(rig, learner, still, heading);
      expectInView(rig.cam, CUT.b.value, "learner at the taxi prompt");
      expectInView(rig.cam, taxi, "taxi at the prompt");
      expect(hasVisibleRoof(rig.cam)).toBe(true);
    }
    for (const subject of [CUT.b.value, taxi]) {
      const toSubject = subject.clone().sub(rig.cam.position);
      const check = new THREE.Raycaster(rig.cam.position, toSubject.clone().normalize(), rig.cam.near, toSubject.length() - 0.01);
      const hits = check.intersectObjects(pavingBatches, false);
      expect(hits.every((hit) => insideCutout(hit.point))).toBe(true);
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
    expectInView(rig.cam, new THREE.Vector3(vinnie.x, 1.65, vinnie.z), "Vinnie at arrival");
  });
});
