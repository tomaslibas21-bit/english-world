import {
  Box3, BufferGeometry, DynamicDrawUsage, Euler, Group, InstancedMesh, Matrix4, MeshLambertMaterial,
  Quaternion, SphereGeometry, TetrahedronGeometry, Vector3, type ColorRepresentation, type PerspectiveCamera,
} from "three";
import { floorY, waterY } from "../water";
import { colourMerge } from "../world/util";
import type { CenoteRoute } from "../world/cenoteTour";
import { fishSchoolAt, turtleAt } from "./route";

type Part = [BufferGeometry, ColorRepresentation];
const up = new Vector3(0, 1, 0);
const eyeColor = "#203735";
const near = (x: number, z: number, eye: Vector3) => (x - eye.x) ** 2 + (z - eye.z) ** 2 <= 14 ** 2;
const egg = (w: number, h: number, l: number, x: number, y: number, z: number, sides: number, rings: number) =>
  new SphereGeometry(1, sides, rings).scale(w, h, l).translate(x, y, z);

function geometry(parts: Part[]) {
  const mesh = colourMerge(parts);
  for (const [part] of parts) part.dispose();
  mesh.computeBoundingBox();
  return mesh;
}

export class CenoteAnimals {
  readonly group = new Group();
  private readonly material = new MeshLambertMaterial({ vertexColors: true, flatShading: true });
  private readonly fish: InstancedMesh;
  private readonly tails: InstancedMesh;
  private readonly turtles: InstancedMesh;
  private readonly fins: InstancedMesh;
  private readonly meshes: InstancedMesh[];
  private readonly at = new Vector3();
  private readonly side = new Vector3();
  private readonly size = new Vector3();
  private readonly rotation = new Quaternion();
  private readonly euler = new Euler(0, 0, 0, "YXZ");
  private readonly body = new Matrix4();
  private readonly appendage = new Matrix4();
  private readonly matrix = new Matrix4();
  private readonly school = new Vector3();
  private readonly fishOffsets: { scale: number; side: number; ahead: number; depth: number }[];

  constructor(private route: CenoteRoute) {
    const { fish, turtles } = route;
    this.group.name = "cenote-tour-wildlife";
    this.group.visible = false;
    this.fish = this.mesh("cenote-fish", fish.count, [
      [egg(0.105, 0.122, 0.355, 0, 0, 0.05, 8, 5), fish.side],
      [egg(0.077, 0.064, 0.252, 0, -0.07, 0.09, 6, 3), "#cce0cf"],
      [new TetrahedronGeometry(0.13).scale(0.26, 0.95, 1.15).translate(0, 0.092, -0.04), fish.side],
      [egg(0.026, 0.027, 0.024, 0.071, 0.021, 0.272, 4, 2), eyeColor],
      [egg(0.026, 0.027, 0.024, -0.071, 0.021, 0.272, 4, 2), eyeColor],
    ]);
    this.tails = this.mesh("cenote-fish-tails", fish.count, [
      [new TetrahedronGeometry(0.17).scale(0.22, 1.35, 0.95).rotateX(-0.27).translate(0, 0.07, -0.11), fish.tail],
      [new TetrahedronGeometry(0.16).scale(0.22, 1.25, 0.95).rotateX(0.27).translate(0, -0.065, -0.11), fish.tail],
    ]);
    const baseLength = this.fish.geometry.boundingBox!.max.z - (this.tails.geometry.boundingBox!.min.z - 0.273);
    this.fishOffsets = Array.from({ length: fish.count }, (_, i) => {
      const row = Math.floor(i / 4) - 1;
      return {
        scale: (fish.lengths[0] + (fish.lengths[1] - fish.lengths[0]) * ((i * 7) % fish.count) / (fish.count - 1)) / baseLength,
        side: ((i % 4) - 1.5) * 0.15 + row * 0.04, ahead: row * 0.21,
        depth: fish.depths[0] + (fish.depths[1] - fish.depths[0]) * i / (fish.count - 1),
      };
    });
    this.turtles = this.mesh("cenote-turtles", turtles.paths.length, [
      [new SphereGeometry(1, 12, 5, 0, Math.PI * 2, 0, Math.PI / 2).scale(0.35, 0.222, 0.5), turtles.shell],
      [new SphereGeometry(1, 12, 3, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).scale(0.35, 0.102, 0.5), turtles.underside],
      [egg(0.121, 0.107, 0.148, 0, -0.005, 0.492, 8, 4), turtles.flipper],
      [egg(0.035, 0.024, 0.029, 0.094, 0.029, 0.552, 4, 3), eyeColor],
      [egg(0.035, 0.024, 0.029, -0.094, 0.029, 0.552, 4, 3), eyeColor],
      [egg(0.074, 0.042, 0.172, 0.24, -0.05, -0.36, 6, 3).rotateY(-0.14), turtles.flipper],
      [egg(0.074, 0.042, 0.172, -0.24, -0.05, -0.36, 6, 3).rotateY(0.14), turtles.flipper],
    ]);
    this.fins = this.mesh("cenote-turtle-flippers", turtles.paths.length * 2, [
      [egg(0.27, 0.035, 0.093, 0.20, 0, 0, 8, 3), turtles.flipper],
    ]);
    this.meshes = [this.fish, this.tails, this.turtles, this.fins];
  }

  private mesh(name: string, count: number, parts: Part[]) {
    const mesh = new InstancedMesh(geometry(parts), this.material, count);
    mesh.name = name;
    mesh.frustumCulled = false; // Their small, moving envelopes are gated by distance to the viewer.
    mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    mesh.visible = false;
    this.group.add(mesh);
    return mesh;
  }

  update(visible: boolean, time: number, worldTime: number, eye: Vector3, elapsed: number) {
    const { fish, turtles } = this.route;
    const showFish = visible && elapsed < 46 && near(fish.center[0], fish.center[1], eye);
    const showTurtles = visible && elapsed > 43 && near(turtles.center[0], turtles.center[1], eye);
    this.group.visible = showFish || showTurtles;
    this.fish.visible = this.tails.visible = showFish;
    this.turtles.visible = this.fins.visible = showTurtles;
    if (showFish) {
      const yaw = fishSchoolAt(this.route, time, this.school);
      this.rotation.setFromAxisAngle(up, yaw);
      const dx = Math.sin(yaw), dz = Math.cos(yaw);
      for (let i = 0; i < fish.count; i++) {
        const { scale, side, ahead, depth } = this.fishOffsets[i];
        const x = this.school.x + dz * side + dx * ahead, z = this.school.z - dx * side + dz * ahead;
        this.at.set(x, waterY(x, z, worldTime)! - depth, z);
        this.body.compose(this.at, this.rotation, this.size.setScalar(scale));
        this.fish.setMatrixAt(i, this.body);
        this.appendage.makeRotationY(Math.sin(time * 4 * Math.PI + i * 0.6) * 0.14).setPosition(0, 0, -0.273);
        this.tails.setMatrixAt(i, this.matrix.multiplyMatrices(this.body, this.appendage));
      }
      this.fish.instanceMatrix.needsUpdate = this.tails.instanceMatrix.needsUpdate = true;
    }
    if (showTurtles) {
      for (let i = 0; i < turtles.paths.length; i++) {
        const yaw = turtleAt(this.route, time, worldTime, i, this.at);
        this.rotation.setFromAxisAngle(up, yaw);
        this.body.compose(this.at, this.rotation, this.size.setScalar(turtles.paths[i].length));
        this.turtles.setMatrixAt(i, this.body);
        const cycle = (time / (2.8 + i * 0.5) + i * 0.22) % 1;
        const stroke = cycle < 0.72 ? Math.sin(cycle / 0.72 * 2 * Math.PI) * 0.262 : 0;
        for (let j = 0; j < 2; j++) {
          const side = j === 0 ? 1 : -1;
          this.euler.set(0, side === 1 ? 0.57 : Math.PI - 0.57, side * stroke);
          this.rotation.setFromEuler(this.euler);
          this.appendage.makeRotationFromQuaternion(this.rotation).setPosition(side * 0.20, -0.027, 0.22);
          this.fins.setMatrixAt(i * 2 + j, this.matrix.multiplyMatrices(this.body, this.appendage));
        }
      }
      this.turtles.instanceMatrix.needsUpdate = this.fins.instanceMatrix.needsUpdate = true;
    }
  }

  get design() {
    return { draws: this.meshes.length, triangles: this.meshes.reduce((sum, mesh) => sum + mesh.count * mesh.geometry.attributes.position.count / 3, 0) };
  }

  inspect(camera: PerspectiveCamera, time: number) {
    const animals: ReturnType<CenoteAnimals["inspectAnimal"]>[] = [];
    if (!this.group.parent || !this.group.visible) return animals;
    this.group.updateWorldMatrix(true, true);
    if (this.fish.visible) for (let i = 0; i < this.fish.count; i++)
      animals.push(this.inspectAnimal(camera, time, "fish", this.fish, i, this.tails, i, 1));
    if (this.turtles.visible) for (let i = 0; i < this.turtles.count; i++)
      animals.push(this.inspectAnimal(camera, time, "turtle", this.turtles, i, this.fins, i * 2, 2));
    return animals;
  }

  private inspectAnimal(camera: PerspectiveCamera, time: number, species: "fish" | "turtle", mesh: InstancedMesh, i: number,
    limb: InstancedMesh, start: number, count: number) {
    mesh.getMatrixAt(i, this.matrix);
    const { x, y, z } = this.at.setFromMatrixPosition(this.matrix.premultiply(mesh.matrixWorld));
    const bounds = new Box3();
    const limbBounds = new Box3();
    const projected = new Box3();
    let radius = 0;
    const measure = (part: InstancedMesh, index: number) => {
      part.getMatrixAt(index, this.matrix);
      this.matrix.premultiply(part.matrixWorld);
      bounds.union(limbBounds.copy(part.geometry.boundingBox!).applyMatrix4(this.matrix));
      const points = part.geometry.attributes.position;
      for (let j = 0; j < points.count; j++) {
        const p = this.side.fromBufferAttribute(points, j).applyMatrix4(this.matrix);
        radius = Math.max(radius, Math.hypot(p.x - x, p.z - z));
        p.project(camera);
        projected.expandByPoint(p.set((p.x + 1) / 2, (1 - p.y) / 2, p.z));
      }
    };
    measure(mesh, i);
    for (let j = 0; j < count; j++) measure(limb, start + j);
    // Round outwards to retain a conservative envelope after Float32 instance transforms.
    const padding = 0.001;
    return {
      id: species + "-" + (i + 1), species, x, y, z, visible: true,
      top: bounds.max.y + padding, bottom: bounds.min.y - padding, radius: radius + padding,
      surfaceY: waterY(x, z, time), floorY: floorY(x, z),
      screen: { left: projected.min.x, right: projected.max.x, top: projected.min.y, bottom: projected.max.y, depth: projected.min.z },
    };
  }

  dispose() {
    this.group.removeFromParent();
    for (const mesh of this.meshes) {
      mesh.dispose();
      mesh.geometry.dispose();
    }
    this.material.dispose();
    this.group.clear();
  }
}
