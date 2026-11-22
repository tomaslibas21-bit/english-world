import * as THREE from "three";
import { colourMerge } from "../world/util";
import { course, point, type Track } from "./track";
import { Props } from "./props";
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
    [new THREE.IcosahedronGeometry(1, 0).scale(7.8, 1.7, 4.2), "#e8f0ed"],
    [new THREE.IcosahedronGeometry(1, 0).scale(5, 2.5, 3.8).translate(-1.8, 0.95, 0), "#faf7e9"],
    [new THREE.IcosahedronGeometry(1, 0).scale(3.4, 1.9, 3.1).translate(3.1, 0.7, -0.85), "#fff9ec"],
  ]);
  const positions = [[-37, 27, -156], [19, 30, -196], [42, 19, -118], [-91, 30, -169], [87, 26, -233]];
  const clouds = new THREE.InstancedMesh(geometry, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }), positions.length);
  const matrix = new THREE.Matrix4();
  positions.forEach(([x, y, z], i) => {
    matrix.makeScale(0.9 + i * 0.13, 1 + i * 0.065, 1.2).setPosition(x, y, z);
    clouds.setMatrixAt(i, matrix);
  });
  return clouds;
}

export class RoadView {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(57, 1, 0.18, 470);
  readonly props = new Props();
  readonly gateMaterial = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  private car: THREE.Object3D;
  private ghost: THREE.Object3D;
  private shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 20),
    new THREE.MeshBasicMaterial({ color: "#423833", opacity: 0.27, transparent: true, depthWrite: false }));
  private sparks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.095, 0.095, 0.38),
    new THREE.MeshBasicMaterial({ color: "#ffce52" }), 22);
  private burstAt = -Infinity;
  private sky: THREE.Mesh;
  private clouds = makeClouds();
  private geometries: Iterable<THREE.BufferGeometry>;
  private ghostMaterials = new Map<THREE.Material, THREE.Material>();
  private readonly chase = new RoadChase();
  private readonly carCorners: THREE.Vector3[];
  private readonly worldCorners: THREE.Vector3[];
  private cameraMotion = { distance: 0, lift: 0, pace: 0, time: 0, dt: 0 };

  constructor(mesh: THREE.Object3D, size: { width: number; length: number }, sky: THREE.Mesh) {
    this.scene.background = new THREE.Color("#f6dfbd");
    this.scene.fog = new THREE.Fog("#f3dbb8", 100, 298);
    const sun = new THREE.DirectionalLight("#fff1d9", 2.05);
    sun.position.set(-40, 70, 30);
    // The town dome has a radius of 600 m. Keep the road dome inside its shorter far plane.
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(this.camera.far * 0.75, 28, 18), sky.material);
    this.sky.frustumCulled = false;
    this.sky.renderOrder = -1;
    this.scene.add(this.sky, this.clouds, sun, new THREE.HemisphereLight("#e4f3ff", "#cba281", 1.35), this.props.group);
    const { car, geometry } = copyCar(mesh);
    this.car = car;
    car.position.set(0, 0, 0);
    car.rotation.set(0, 0, 0);
    const { min, max } = new THREE.Box3().setFromObject(car);
    this.carCorners = [min.x, max.x].flatMap((x) => [min.y, max.y].flatMap((y) => [min.z, max.z]
      .map((z) => new THREE.Vector3(x, y, z))));
    this.worldCorners = this.carCorners.map((corner) => corner.clone());
    this.geometries = geometry.values();
    this.ghost = car.clone(true);
    this.ghost.traverse((part) => {
      const mesh = part as THREE.Mesh;
      if (!mesh.isMesh) return;
      const transparent = (material: THREE.Material) => {
        let faded = this.ghostMaterials.get(material);
        if (!faded) {
          faded = material.clone();
          faded.transparent = true;
          faded.opacity = 0.3;
          faded.depthWrite = false;
          this.ghostMaterials.set(material, faded);
        }
        return faded;
      };
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(transparent) : transparent(mesh.material);
    });
    this.ghost.visible = false;
    this.shadow.geometry.rotateX(-Math.PI / 2).scale(size.width * 0.6, 1, size.length * 0.52);
    this.sparks.frustumCulled = false;
    this.sparks.count = 0;
    this.scene.add(this.shadow, car, this.ghost, this.sparks);
    void this.props.loadModels();
  }

  celebrate(time: number) { this.burstAt = time; }

  passenger(root: THREE.Object3D) { this.car.add(root); }

  pose(pose: Pose, ghost: Pose | undefined, pace: number, drift: boolean, wobble: number, time: number, dt: number, boost = false) {
    const [s, lateral, lift, steer] = pose;
    const fraction = Math.min(1.2, pace);
    this.car.position.copy(point(s, lateral, lift));
    this.car.position.x += Math.sin(time * 29) * wobble * 0.23;
    this.car.rotation.set(lift * -0.095, course(s) + steer, steer * 0.13 + Math.sin(time * 27) * wobble * 0.11);
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
    this.cameraMotion = { distance: s, lift, pace: fraction, time, dt };
    this.clouds.position.z = -s;
  }

  stream(track: Track, s: number, time: number, propsChanged = false) {
    this.props.update(track, s, time, track.stream(s), propsChanged);
  }

  render(renderer: THREE.WebGLRenderer, width: number, height: number, gate: Gate | undefined) {
    const { distance, lift, pace, time, dt } = this.cameraMotion;
    this.car.updateMatrix();
    this.worldCorners.forEach((corner, i) => corner.copy(this.carCorners[i]).applyMatrix4(this.car.matrix));
    this.chase.update(this.camera, this.car.position, distance, lift, pace, time, dt, width, height, this.worldCorners, gate?.crossed ? undefined : gate);
    this.sky.position.copy(this.camera.position);
    renderer.render(this.scene, this.camera);
    return gate?.labels(this.camera, width, height) ?? [];
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
    this.scene.clear();
    this.sky.geometry.dispose();
    this.clouds.geometry.dispose();
    this.clouds.material.dispose();
    this.clouds.dispose();
    this.props.dispose();
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of this.ghostMaterials.values()) material.dispose();
    this.gateMaterial.dispose();
    this.shadow.geometry.dispose();
    this.shadow.material.dispose();
    this.sparks.geometry.dispose();
    (this.sparks.material as THREE.Material).dispose();
    this.sparks.dispose();
  }
}
