import { boardFaces } from "../kit/boardFaces";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { spinCarWheels, type CarModelEntry } from "../world/carModels";
import { OpenSky } from "../kit/openSky";
import { SoftPuffs } from "../kit/puffs";
import { exitPostTops, exitRotation, exitToTown, townToExit } from "../world/roadExit";
import { colourMerge } from "../world/util";
import { course, laneOffset, point, type Track } from "./track";
import { ROAD_LOOK } from "./look";
import { Props } from "./props";
import { Ranges } from "./ranges";
import { DRIVE_SECONDS } from "./run";
import { RoadChase } from "./chase";
import type { Pose } from "./ghost";
import type { Gate } from "./gates";

const dummy = new THREE.Object3D();

function copyCar(source: THREE.Object3D) {
  const car = source.clone(true);
  const geometry = new Map<THREE.BufferGeometry, THREE.BufferGeometry>();
  car.traverse((part) => {
    const mesh = part as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (!geometry.has(mesh.geometry)) geometry.set(mesh.geometry, mesh.geometry.clone());
    mesh.geometry = geometry.get(mesh.geometry)!;
    mesh.castShadow = mesh.receiveShadow = false;
  });
  car.visible = true;
  car.rotation.order = "YXZ";
  return { car, geometry };
}

function makeClouds() {
  const geometry = colourMerge([
    [new THREE.IcosahedronGeometry(1, 0).scale(7.8, 1.5, 4.2), "#dfe3ea"],
    [new THREE.IcosahedronGeometry(1, 0).scale(5, 2.3, 3.8).translate(-1.8, 0.95, 0), "#f6f3ee"],
    [new THREE.IcosahedronGeometry(1, 0).scale(3.4, 1.8, 3.1).translate(3.1, 0.7, -0.85), "#ffffff"],
  ]);
  // Small and high near the road, long and low toward the horizon.
  const positions = [[-37, 27, -156, 1], [19, 31, -196, 1.1], [44, 20, -118, 0.9], [-95, 32, -175, 1.4], [91, 27, -238, 1.5],
    [-150, 38, -330, 2.6], [128, 44, -390, 3], [-36, 52, -420, 3.2], [210, 36, -300, 2.4]];
  const clouds = new THREE.InstancedMesh(geometry, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }), positions.length);
  const matrix = new THREE.Matrix4();
  positions.forEach(([x, y, z, k], i) => {
    matrix.makeScale(k * (1 + i % 3 * 0.12), 0.8 + i % 2 * 0.25, 1.2 * k).setPosition(x, y, z);
    clouds.setMatrixAt(i, matrix);
  });
  clouds.frustumCulled = false;
  return clouds;
}

const DUST = 28;
const BURST = 44;
const CONFETTI = ["#ffd166", "#76ffda", "#ff8a5c"];
const ROAD_CAMERA_SECONDS = 1.6;
const LOCAL_ROTATION = exitRotation.clone().invert();
export type RoadEnvironment = {
  sky: THREE.Mesh; fog: THREE.Fog | null; sun: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight; environment: THREE.Texture | null; environmentIntensity: number;
};

function departureFrame(car: THREE.Object3D, rider: THREE.Object3D, camera: THREE.PerspectiveCamera,
  roof: THREE.Vector3, posts: THREE.Vector3[], asphalt: THREE.Vector3, width: number, height: number) {
  const pixel = (p: THREE.Vector3) => {
    const projected = p.clone().project(camera);
    return [(projected.x + 1) * width / 2, (1 - projected.y) * height / 2];
  };
  return { car: car.getWorldPosition(new THREE.Vector3()).toArray(),
    carRotation: car.getWorldQuaternion(new THREE.Quaternion()).toArray(),
    rider: rider.getWorldPosition(new THREE.Vector3()).toArray(),
    camera: camera.position.toArray(), rotation: camera.quaternion.toArray(), fov: camera.fov,
    viewOffset: camera.view ? { ...camera.view } : null, roof: pixel(roof), posts: posts.map(pixel), asphalt: pixel(asphalt) };
}

type DepartureFrame = ReturnType<typeof departureFrame>;
const WHITE = new THREE.Color("#ffffff");

export class RoadView {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(57, 1, 0.18, 960);
  readonly props = new Props();
  readonly gateMaterial = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  private car: THREE.Object3D;
  private ghost: THREE.Object3D;
  private shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 20),
    new THREE.MeshBasicMaterial({ color: "#423833", opacity: 0.27, transparent: true, depthWrite: false }));
  private sparks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.095, 0.095, 0.38),
    new THREE.MeshBasicMaterial({ color: "#ffce52" }), 22);
  private burstAt = -Infinity;
  private sky = new OpenSky(700, ROAD_LOOK.sky, ROAD_LOOK.sunAzimuth);
  private ranges = new Ranges(ROAD_LOOK.rock);
  private clouds = makeClouds();
  private sun = new THREE.DirectionalLight("#ffffff", 2);
  private fill = new THREE.HemisphereLight("#ffffff", "#ffffff", 1.3);
  private fog = new THREE.Fog("#ffffff", 100, 298);
  // Dust the tyres lift when they bite.
  private dust = new SoftPuffs(DUST, ROAD_LOOK.dust, 0.5);
  private puffIn = 0;
  private airborne = false;
  // The right gate: paper flies up from its lane and a ring of light runs out along the road.
  private burst = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, forceSinglePass: true }), BURST);
  private joy?: { time: number; s: number; lane: number; paint: THREE.Color };
  private day = -1;
  private geometries: Iterable<THREE.BufferGeometry>;
  private ghostGeometries: THREE.BufferGeometry[] = [];
  private ghostMaterials: THREE.Material[] = [];
  readonly models: Promise<void>;
  private readonly chase = new RoadChase();
  private readonly carCorners: THREE.Vector3[];
  private readonly worldCorners: THREE.Vector3[];
  private town?: RoadEnvironment;
  private rider?: THREE.Object3D;
  private returnRider?: () => void;
  private seam?: {
    age: number; camera: THREE.PerspectiveCamera; offset: THREE.Vector3; carRotation: THREE.Quaternion;
    carY: number; rider: THREE.Object3D; reference?: DepartureFrame;
  };
  private continuity?: { town: DepartureFrame; road: DepartureFrame };
  private chaseCenter = new THREE.Vector3();
  private cameraMotion = { distance: 0, lift: 0, pace: 0, time: 0, dt: 0 };

  constructor(mesh: THREE.Object3D, size: { width: number; length: number }, private model: CarModelEntry) {
    this.scene.fog = this.fog;
    this.sun.position.set(-40, 62, 34);
    this.burst.frustumCulled = false;
    this.burst.count = 0;
    this.burst.visible = false;
    this.burst.renderOrder = 3;
    this.scene.add(this.sky.mesh, this.ranges.mesh, this.clouds, this.sun, this.fill, this.props.group, this.dust.mesh, this.burst);
    this.daylight(0);
    const { car, geometry } = copyCar(mesh);
    this.car = car;
    car.position.set(0, 0, 0);
    car.rotation.set(0, 0, 0);
    const { min, max } = new THREE.Box3().setFromObject(car);
    this.carCorners = [min.x, max.x].flatMap((x) => [min.y, max.y].flatMap((y) => [min.z, max.z]
      .map((z) => new THREE.Vector3(x, y, z))));
    this.worldCorners = this.carCorners.map((corner) => corner.clone());
    this.geometries = geometry.values();
    this.ghost = new THREE.Group();
    const ghostParts = new Map<THREE.Material, THREE.BufferGeometry[]>();
    car.updateMatrixWorld(true);
    car.traverse((part) => {
      const mesh = part as THREE.Mesh<THREE.BufferGeometry, THREE.Material>;
      if (!mesh.isMesh || !mesh.visible || Array.isArray(mesh.material)) return;
      const pieces = ghostParts.get(mesh.material) ?? [];
      ghostParts.set(mesh.material, pieces);
      const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
      pieces.push(geometry.applyMatrix4(mesh.matrixWorld));
    });
    for (const [material, pieces] of ghostParts) {
      const ghostMaterial = material.clone();
      ghostMaterial.transparent = true;
      ghostMaterial.forceSinglePass = true;
      ghostMaterial.opacity = 0.3;
      ghostMaterial.depthWrite = false;
      this.ghostMaterials.push(ghostMaterial);
      const merged = mergeGeometries(pieces, false);
      if (merged) pieces.forEach((piece) => piece.dispose());
      for (const geometry of merged ? [merged] : pieces) {
        this.ghost.add(new THREE.Mesh(geometry, ghostMaterial));
        this.ghostGeometries.push(geometry);
      }
    }
    this.ghost.visible = false;
    this.shadow.geometry.rotateX(-Math.PI / 2).scale(size.width * 0.6, 1, size.length * 0.52);
    this.sparks.frustumCulled = false;
    this.sparks.count = 0;
    this.scene.add(this.shadow, car, this.ghost, this.sparks);
    this.models = this.props.loadModels();
    this.clouds.material.transparent = true;
  }

  prepareDeparture(town: RoadEnvironment) {
    this.town = town;
    const material = town.sky.material;
    if (material instanceof THREE.ShaderMaterial) this.sky.inheritTown(material, new THREE.Matrix3().setFromMatrix4(exitToTown));
    this.scene.environment = town.environment;
    this.blendTownLight(1);
  }

  depart(source: THREE.Object3D, rider: THREE.Object3D, camera: THREE.PerspectiveCamera, width: number, height: number) {
    camera.updateMatrixWorld(true);
    source.updateWorldMatrix(true, true);
    rider.updateWorldMatrix(true, false);
    const townCamera = camera.clone();
    townCamera.updateMatrixWorld(true);
    const localCamera = camera.clone();
    localCamera.position.applyMatrix4(townToExit);
    localCamera.quaternion.premultiply(LOCAL_ROTATION);
    localCamera.updateMatrixWorld(true);
    this.car.position.setFromMatrixPosition(source.matrixWorld).applyMatrix4(townToExit);
    this.car.quaternion.copy(source.getWorldQuaternion(new THREE.Quaternion())).premultiply(LOCAL_ROTATION);
    this.model.wheelNodes.forEach((name) => {
      const current = source.getObjectByName(name), road = this.car.getObjectByName(name);
      if (current && road) road.quaternion.copy(current.quaternion);
    });
    this.chaseCenter.copy(this.car.position);
    this.car.updateMatrixWorld(true);
    const reference = departureFrame(source, rider, townCamera, this.roof(source), exitPostTops.map((p) => p.clone().applyMatrix4(exitToTown)),
      this.asphalt(source).applyMatrix4(exitToTown), width, height);
    const position = this.car.worldToLocal(rider.getWorldPosition(new THREE.Vector3()).applyMatrix4(townToExit));
    const rotation = rider.getWorldQuaternion(new THREE.Quaternion()).premultiply(LOCAL_ROTATION)
      .premultiply(this.car.quaternion.clone().invert());
    this.seatPlayer(rider, position, rotation);
    this.seam = { age: 0, camera: localCamera, offset: localCamera.position.clone().sub(this.chaseCenter),
      carRotation: this.car.quaternion.clone(), carY: this.car.position.y, rider, reference };
  }

  seatPlayer(rider: THREE.Object3D, position: THREE.Vector3, rotation: THREE.Quaternion) {
    const original = { parent: rider.parent, position: rider.position.clone(), rotation: rider.quaternion.clone() };
    this.rider = rider;
    this.car.add(rider);
    rider.position.copy(position);
    rider.quaternion.copy(rotation);
    this.returnRider = () => {
      rider.removeFromParent();
      original.parent?.add(rider);
      rider.position.copy(original.position);
      rider.quaternion.copy(original.rotation);
    };
  }

  seatedPose() {
    const rider = this.rider;
    return rider && { position: rider.position.clone(), rotation: rider.quaternion.clone() };
  }

  private roof(car: THREE.Object3D) {
    return car.localToWorld(new THREE.Vector3(0, Math.max(...this.carCorners.map((p) => p.y)), 0));
  }

  private asphalt(source?: THREE.Object3D) {
    const x = source ? source.getWorldPosition(new THREE.Vector3()).applyMatrix4(townToExit).x : this.chaseCenter.x;
    return point(this.cameraMotion.distance + 1.5, x > 0 ? -2.8 : 2.8, 0.02);
  }

  get hasSeatedPlayer() { return !!this.rider; }

  get visibleGhost() { return this.ghost.visible; }

  departureDebug() { return this.continuity; }

  /** The right gate at `s`, passed in `lane`, painted `paint`. */
  celebrate(time: number, s?: number, lane = 1, paint = "#ffd166") {
    this.burstAt = time;
    this.sky.pulse();
    if (s !== undefined) this.joy = { time, s, lane, paint: new THREE.Color(paint) };
  }

  /** The timer is the time of day: 0 as the run starts, 1 as it ends. */
  private daylight(day: number) {
    if (Math.abs(day - this.day) < 0.004) return;
    this.day = day;
    this.sky.blend(day);
    this.blendTownLight(this.seam ? 1 - THREE.MathUtils.smoothstep(this.seam.age, 0, 3) : 0);
  }

  private blendTownLight(mix: number) {
    const sky = this.sky;
    this.fog.color.copy(sky.haze);
    this.sun.color.copy(sky.light);
    this.sun.intensity = sky.lightPower;
    this.fill.color.copy(sky.fillSky);
    this.fill.groundColor.copy(sky.fillGround);
    this.fill.intensity = sky.fill;
    this.ranges.light(sky.haze, sky.light);
    this.clouds.material.color.copy(sky.cloud);
    this.ranges.mesh.material.uniforms.opacity.value = 1 - mix;
    this.ranges.mesh.visible = this.clouds.visible = mix < 1;
    this.clouds.material.opacity = 1 - mix;
    const town = this.town;
    if (town) {
      if (sky.mesh.material.uniforms.townMix) sky.mesh.material.uniforms.townMix.value = mix;
      this.fog.near = THREE.MathUtils.lerp(100, town.fog?.near ?? 960, mix);
      this.fog.far = THREE.MathUtils.lerp(298, town.fog?.far ?? 961, mix);
      if (town.fog) this.fog.color.lerp(town.fog.color, mix);
      this.sun.color.lerp(town.sun.color, mix);
      this.sun.intensity = THREE.MathUtils.lerp(this.sun.intensity, town.sun.intensity, mix);
      this.sun.position.set(-40, 62, 34).lerp(town.sun.position.clone().sub(town.sun.target.position).applyQuaternion(LOCAL_ROTATION), mix);
      this.fill.color.lerp(town.hemi.color, mix);
      this.fill.groundColor.lerp(town.hemi.groundColor, mix);
      this.fill.intensity = THREE.MathUtils.lerp(this.fill.intensity, town.hemi.intensity, mix);
      this.scene.environmentIntensity = town.environmentIntensity * mix;
    }
    this.dust.tint.set(ROAD_LOOK.dust).multiply(sky.cloud);
  }

  private raiseDust(s: number, lateral: number, lift: number, drift: boolean, wobble: number, dt: number) {
    // Only when the tyres bite: a drift, a stumble, or the landing after a ramp.
    const landed = this.airborne && lift < 0.05;
    this.airborne = lift > 0.25;
    const hard = drift || wobble > 0.2 || landed;
    if (((this.puffIn -= dt) <= 0 || landed) && lift < 0.2 && hard) {
      this.puffIn = 0.07;
      for (const side of landed ? [-1, 1, -1, 1] : [-1, 1]) {
        this.dust.emit(point(s - 1.3, lateral + side * 0.85, 0.3), landed ? 1.5 : 1.05, 0.85,
          { x: side * 0.5, y: 0.9, z: 2.5 }, landed ? 2.4 : 1.9);
      }
    }
    this.dust.update(dt);
  }

  private throwPaper(time: number, width: number, height: number) {
    const joy = this.joy;
    const age = joy ? (time - joy.time) / 1.05 : 1;
    if (!joy || age >= 1 || age < 0) {
      if (joy) this.joy = undefined;
      this.burst.visible = false;
      this.burst.count = 0;
      return;
    }
    const fresh = this.burst.count === 0;
    const colour = new THREE.Color();
    const x0 = laneOffset(joy.lane), out = 1 - (1 - age) ** 3;
    const paper = Array.from({ length: 4 }, () => new THREE.Vector3());
    const cameraPoint = new THREE.Vector3();
    const corners = [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]];
    const pixelEdge = (scale: number) => {
      paper.forEach((p, i) => {
        p.set(corners[i][0] * scale, corners[i][1] * scale, 0).applyQuaternion(dummy.quaternion)
          .add(dummy.position).project(this.camera);
      });
      return Math.max(...paper.map((p, i) => {
        const q = paper[(i + 1) % 4];
        return Math.hypot((p.x - q.x) * width / 2, (p.y - q.y) * height / 2);
      }));
    };
    for (let i = 0; i < BURST; i++) {
      if (i < 16) {
        // A ring of dashes on the asphalt, running out from under the arch.
        const angle = i / 16 * Math.PI * 2, reach = 1.2 + out * 9.5;
        dummy.position.copy(point(joy.s + Math.cos(angle) * reach + age * 7, x0 + Math.sin(angle) * reach * 0.62, 0.09));
        dummy.rotation.set(-Math.PI / 2, 0, -angle + Math.PI / 2);
        dummy.scale.set(0.22, (1.6 - age) * 1.0, 1).multiplyScalar(1 - age * age);
        if (fresh) colour.copy(joy.paint).lerp(WHITE, 0.35);
      } else {
        // Paper from the two posts of the arch: up and out, then fluttering down beside the car as it pulls away.
        const j = i - 16, a = j * 2.399, b = (j * 0.618) % 1, side = j % 2 ? 1 : -1;
        const rise = 2.2 + (j % 5) * 0.8;
        dummy.position.copy(point(joy.s + 1 + age * (12 + b * 9), x0 + side * (1.8 + (0.6 + b * 2.9) * out),
          0.9 + rise * 1.7 * age - 4.6 * age * age + Math.sin(a) * 0.3));
        dummy.rotation.set(a + age * (7 + j % 4), a * 1.7 + age * 5, age * 9 + j);
        const depth = -cameraPoint.copy(dummy.position).applyMatrix4(this.camera.matrixWorldInverse).z;
        let scale = (0.42 + (j % 3) * 0.13) * Math.min(1, (1 - age) * 3.2) * THREE.MathUtils.smoothstep(depth, 2, 5);
        if (scale && pixelEdge(scale) > 18) {
          let low = 0, high = scale;
          for (let step = 0; step < 8; step++) {
            const mid = (low + high) / 2;
            if (pixelEdge(mid) <= 18) low = mid;
            else high = mid;
          }
          scale = low;
        }
        dummy.scale.setScalar(scale);
        if (fresh && j % 3 === 0) colour.set(CONFETTI[(j / 3 | 0) % 3]);
        else if (fresh) colour.copy(joy.paint).lerp(WHITE, j % 3 === 1 ? 0 : 0.45);
      }
      dummy.updateMatrix();
      this.burst.setMatrixAt(i, dummy.matrix);
      if (fresh) this.burst.setColorAt(i, colour);
    }
    this.burst.count = BURST;
    this.burst.visible = true;
    this.burst.instanceMatrix.needsUpdate = true;
    if (fresh && this.burst.instanceColor) this.burst.instanceColor.needsUpdate = true;
  }

  passenger(root: THREE.Object3D) { this.car.add(root); }

  pose(pose: Pose, ghost: Pose | undefined, pace: number, drift: boolean, wobble: number, time: number, dt: number, boost = false, speed = 0) {
    const [s, lateral, lift, steer] = pose;
    const fraction = Math.min(1.2, pace);
    this.chaseCenter.copy(point(s, lateral, lift));
    this.car.position.copy(this.chaseCenter);
    this.car.position.x += Math.sin(time * 29) * wobble * 0.23;
    this.car.rotation.set(lift * -0.095, course(s) + steer, steer * 0.13 + Math.sin(time * 27) * wobble * 0.11);
    if (this.seam) {
      const seam = this.seam;
      seam.age += dt;
      const mix = THREE.MathUtils.smoothstep(seam.age, 0, ROAD_CAMERA_SECONDS);
      this.car.position.y += seam.carY * (1 - mix);
      this.car.quaternion.copy(seam.carRotation.clone().slerp(this.car.quaternion, mix));
    }
    this.shadow.position.copy(point(s, lateral, 0.045));
    this.shadow.rotation.y = this.car.rotation.y;
    this.shadow.material.opacity = 0.27 / (1 + lift);

    this.ghost.visible = !!ghost && Math.abs(ghost[0] - s) < 105;
    if (ghost && this.ghost.visible) {
      this.ghost.position.copy(point(ghost[0], ghost[1], ghost[2] + 0.06));
      this.ghost.rotation.y = course(ghost[0]) + ghost[3];
    }
    this.sparks.count = drift || boost ? 22 : 0;
    const burst = (time - this.burstAt) / 0.48;
    if (this.sparks.count) this.sparks.material.color.set(burst < 1 ? "#ffde91" : drift ? "#ffce52" : "#97ffe1");
    for (let i = 0; i < this.sparks.count; i++) {
      const side = i % 2 ? 1 : -1;
      if (burst < 1 && i < 8) {
        // Eight chips fan out from the rear fenders, then give their slots back to the boost trail.
        const spread = 0.85 + burst * (0.9 + Math.floor(i / 2) * 0.34);
        dummy.position.copy(point(s - 1.2 - burst * (1 + i % 3), lateral + side * spread,
          lift + 0.60 + Math.sin(burst * Math.PI) * (0.7 + i % 3 * 0.28)));
        dummy.rotation.set(i + burst * 3, side * 0.7, side * burst * 4);
        dummy.scale.setScalar(1.9 * (1 - burst));
      } else {
        const age = (time * (boost ? 7 : 5) + i / this.sparks.count) % 1;
        dummy.position.copy(point(s - 1.5 - age * (boost ? 5.8 : 3.7),
          lateral + side * 0.92 + steer * age, 0.12 + Math.sin(age * Math.PI) * (0.26 + i % 3 * 0.10)));
        dummy.rotation.set(age, i, time + i);
        dummy.scale.setScalar(1.24 - age);
      }
      dummy.updateMatrix();
      this.sparks.setMatrixAt(i, dummy.matrix);
    }
    if (this.sparks.count) this.sparks.instanceMatrix.needsUpdate = true;
    this.raiseDust(s, lateral, lift, drift, wobble, dt);
    this.sky.update(dt, this.camera.position);
    this.ranges.update(s);
    spinCarWheels(this.car, this.model, speed * dt);
    this.cameraMotion = { distance: s, lift, pace: fraction, time, dt };
    // The clouds keep their place in the sky and drift a little.
    this.clouds.position.set(Math.sin(time * 0.02) * 14, 0, -s);
  }

  stream(track: Track, s: number, time: number, propsChanged = false) {
    this.daylight(time / DRIVE_SECONDS);
    this.props.update(track, track.stream(s), propsChanged);
  }

  render(renderer: Pick<THREE.WebGLRenderer, "render">, width: number, height: number, gate: Gate | undefined) {
    const { distance, lift, pace, time, dt } = this.cameraMotion;
    this.car.updateMatrix();
    this.worldCorners.forEach((corner, i) => corner.copy(this.carCorners[i]).applyMatrix4(this.car.matrix));
    this.chase.update(this.camera, this.chaseCenter, distance, lift, pace, time, dt, width, height, this.worldCorners, gate?.crossed ? undefined : gate);
    const seam = this.seam;
    if (seam) {
      const mix = THREE.MathUtils.smoothstep(seam.age, 0, ROAD_CAMERA_SECONDS);
      const start = seam.camera, camera = this.camera;
      if (mix === 0) camera.copy(start, false);
      else {
        camera.position.lerpVectors(this.chaseCenter.clone().add(seam.offset), camera.position, mix);
        camera.quaternion.copy(start.quaternion.clone().slerp(camera.quaternion, mix));
        camera.fov = THREE.MathUtils.lerp(start.fov, camera.fov, mix);
        camera.near = THREE.MathUtils.lerp(start.near, 0.18, mix);
        camera.far = THREE.MathUtils.lerp(start.far, 960, mix);
        if (start.view?.enabled && mix < 1) {
          camera.setViewOffset(width, height, start.view.offsetX / start.view.fullWidth * width * (1 - mix),
            start.view.offsetY / start.view.fullHeight * height * (1 - mix), width, height);
        } else camera.clearViewOffset();
        camera.updateProjectionMatrix();
      }
      camera.updateMatrixWorld(true);
      this.blendTownLight(1 - THREE.MathUtils.smoothstep(seam.age, 0, 3));
    }
    this.throwPaper(time, width, height);
    this.sky.mesh.position.copy(this.camera.position);
    renderer.render(this.scene, this.camera);
    boardFaces.road.draw(this.camera, width, height, gate?.id, gate?.faces());
    if (seam?.reference) {
      const town = seam.reference;
      const road = departureFrame(this.car, seam.rider, this.camera, this.roof(this.car), exitPostTops, this.asphalt(), width, height);
      new THREE.Vector3().fromArray(road.car).applyMatrix4(exitToTown).toArray(road.car);
      new THREE.Vector3().fromArray(road.rider).applyMatrix4(exitToTown).toArray(road.rider);
      new THREE.Vector3().fromArray(road.camera).applyMatrix4(exitToTown).toArray(road.camera);
      new THREE.Quaternion().fromArray(road.carRotation).premultiply(exitRotation).toArray(road.carRotation);
      new THREE.Quaternion().fromArray(road.rotation).premultiply(exitRotation).toArray(road.rotation);
      this.continuity = { town, road };
      seam.reference = undefined;
    }
  }

  carFraming() {
    const projected = this.worldCorners.map((corner) => corner.clone().project(this.camera));
    return {
      left: (1 + Math.min(...projected.map((p) => p.x))) * 0.5,
      right: (1 + Math.max(...projected.map((p) => p.x))) * 0.5,
      top: (1 - Math.max(...projected.map((p) => p.y))) * 0.5,
      bottom: (1 - Math.min(...projected.map((p) => p.y))) * 0.5,
    };
  }

  dispose() {
    this.returnRider?.();
    this.scene.clear();
    this.sky.dispose();
    this.ranges.dispose();
    this.dust.dispose();
    this.burst.geometry.dispose();
    this.burst.material.dispose();
    this.burst.dispose();
    this.clouds.geometry.dispose();
    this.clouds.material.dispose();
    this.clouds.dispose();
    this.props.dispose();
    for (const geometry of this.geometries) geometry.dispose();
    for (const geometry of this.ghostGeometries) geometry.dispose();
    for (const material of this.ghostMaterials) material.dispose();
    this.gateMaterial.dispose();
    this.shadow.geometry.dispose();
    this.shadow.material.dispose();
    this.sparks.geometry.dispose();
    (this.sparks.material as THREE.Material).dispose();
    this.sparks.dispose();
  }
}
