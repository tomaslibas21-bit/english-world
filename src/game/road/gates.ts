import * as THREE from "three";
import { colourMerge } from "../world/util";
import { laneOffset, point, ribbon } from "./track";
import type { Prompt } from "./words";

export const LANE_PAINT = ["#f2a83e", "#38b9aa", "#a39bdd"];
const IRON = "#364955";
const BANNER_Y = 4.22;
const FACE_Z = 0.47;
const TEXT_HALF_WIDTH = 1.76;
const TEXT_HALF_HEIGHT = 0.78;
type Part = [THREE.BufferGeometry, string];
export type LabelAnchor = { lane: number; x: number; y: number; width: number; height: number; opacity: number; tilt?: number };

function plate(width: number, height: number, depth: number, cut: number) {
  const x = width / 2, y = height / 2;
  const outline = new THREE.Shape();
  outline.moveTo(-x + cut, -y);
  for (const [px, py] of [[x - cut, -y], [x, -y + cut], [x, y - cut], [x - cut, y],
    [-x + cut, y], [-x, y - cut], [-x, -y + cut]]) outline.lineTo(px, py);
  outline.closePath();
  return new THREE.ExtrudeGeometry(outline, { depth, bevelEnabled: false });
}

function makeTick(material: THREE.Material) {
  const parts: Part[] = [];
  const stroke = (length: number, thickness: number, angle: number, x: number, y: number, color: string) =>
    parts.push([new THREE.BoxGeometry(length, thickness, 0.06).rotateZ(angle).translate(x, y, 0), color]);
  stroke(0.59, 0.21, -Math.PI / 4, -0.35, -0.04, "#125c54");
  stroke(1.12, 0.21, Math.PI / 4, 0.17, 0.14, "#125c54");
  for (const side of [-1, 1]) {
    stroke(0.28, 0.10, side * 0.58, side * 1.18, 0.32, "#348e79");
    stroke(0.20, 0.10, -side * 0.3, side * 1.30, -0.14, "#348e79");
  }
  return new THREE.Mesh(colourMerge(parts), material);
}

export class Gate {
  readonly mesh: THREE.Mesh;
  readonly frame: readonly THREE.Vector3[];
  private boards: THREE.InstancedMesh<THREE.BufferGeometry, THREE.Material>;
  private labelPose = new THREE.Matrix4();
  private projected = new THREE.Vector3();
  private pass?: { lane: number; correct: boolean; age: number; stamp?: THREE.Mesh; material: THREE.Material };
  private boardPose = new THREE.Object3D();

  constructor(readonly distance: number, readonly prompt: Prompt, material: THREE.Material) {
    const origin = point(distance);
    const facePoint = (x: number, y: number) => new THREE.Vector3(x, y, FACE_Z).add(origin);
    const parts: Part[] = [];
    const block = (w: number, h: number, d: number, x: number, y: number, z: number, color: string, tilt = 0) =>
      parts.push([new THREE.BoxGeometry(w, h, d).rotateZ(tilt).translate(x, y, z), color]);

    for (let lane = 0; lane < 3; lane++) {
      const x = laneOffset(lane), paint = LANE_PAINT[lane];
      for (const side of [-1, 1]) {
        const edge = x + side * 1.80;
        block(0.24, 4.18, 0.45, edge, 2.09, 0, paint);
        block(0.38, 0.53, 0.62, edge, 0.265, 0, IRON);
        block(0.27, 0.18, 0.48, edge, 0.63, 0, "#fff0ce");
        block(0.21, 1.08, 0.32, edge - side * 0.30, 3.12, 0, paint, side * 0.66);
        // Twin approach stripes follow the actual road crown, including on hills and bends.
        for (const [start, length] of [[-10, 0.8], [-8, 1.5], [-5.4, 5.5]]) {
          const strip = ribbon(distance + start, length, edge - 0.10, edge + 0.10, 0.060, 3);
          parts.push([strip.translate(-origin.x, -origin.y, -origin.z), paint]);
        }
      }
      parts.push([plate(3.94, 2.10, 0.42, 0.18).translate(x, BANNER_Y, -0.21), paint]);
      block(0.44, 0.44, 0.27, x, BANNER_Y - 1.04, 0, paint, Math.PI / 4);
    }

    this.mesh = new THREE.Mesh(colourMerge(parts), material);
    this.mesh.position.copy(origin);
    const panel = colourMerge([
      [plate(3.84, 1.94, 0.18, 0.15).translate(0, 0, 0.20), IRON],
      [plate(3.72, 1.80, 0.08, 0.12).translate(0, 0, 0.38), "#fff2d5"],
    ]);
    this.boards = new THREE.InstancedMesh(panel, material, 3);
    for (let lane = 0; lane < 3; lane++) {
      this.boardPose.position.set(laneOffset(lane), BANNER_Y, 0);
      this.boardPose.updateMatrix();
      this.boards.setMatrixAt(lane, this.boardPose.matrix);
      this.boards.setColorAt(lane, new THREE.Color(0xffffff));
    }
    this.mesh.add(this.boards);
    this.frame = [-5.97, 5.97].flatMap((x) => [-1.05, 1.05].map((dy) =>
      facePoint(x, BANNER_Y + dy)));
  }

  get crossed() { return !!this.pass; }

  cross(lane: number, correct: boolean) {
    const material = this.boards.material.clone();
    material.transparent = true;
    this.mesh.material = this.boards.material = material;
    const stamp = correct ? makeTick(material) : undefined;
    if (stamp) this.mesh.add(stamp);
    this.pass = { lane, correct, stamp, material, age: 0 };
    this.boards.setColorAt(lane, new THREE.Color(correct ? "#adffdb" : "#caa58c"));
    this.boards.instanceColor!.needsUpdate = true;
    this.animatePass(0, this.distance);
  }

  animatePass(dt: number, carDistance: number) {
    if (!this.pass) return false;
    const { lane, correct, stamp, material } = this.pass;
    const t = Math.min(1, (this.pass.age += dt) / 0.85);
    const kick = Math.sin(Math.PI * Math.min(1, t * 2.4));
    const sway = Math.sin(t * Math.PI * 3) * (1 - t) ** 2;
    this.boardPose.position.set(laneOffset(lane), BANNER_Y + (correct ? 0.34 : -0.13) * kick, 0.18 * kick);
    this.boardPose.rotation.z = correct ? 0 : 0.13 * sway;
    this.boardPose.scale.setScalar(1 + (correct ? 0.09 : -0.04) * kick);
    this.boardPose.updateMatrix();
    this.boards.setMatrixAt(lane, this.boardPose.matrix);
    this.boards.instanceMatrix.needsUpdate = true;
    if (stamp) {
      stamp.position.set(0, 0, FACE_Z + 0.05).applyMatrix4(this.boardPose.matrix);
      stamp.scale.setScalar(this.boardPose.scale.x * (1 + kick * 0.18));
    }
    // Clear the immediate foreground before the chase camera reaches the plane of the signs.
    material.opacity = 1 - Math.max(THREE.MathUtils.smoothstep(t, 0.55, 1),
      THREE.MathUtils.smoothstep(carDistance - this.distance, 4, 10));
    return material.opacity > 0;
  }

  labels(camera: THREE.PerspectiveCamera, width: number, height: number): LabelAnchor[] {
    const pixels = (x: number, y: number) => {
      const p = this.projected.set(x, y, FACE_Z).applyMatrix4(this.labelPose).add(this.mesh.position).project(camera);
      return { x: (1 + p.x) * width / 2, y: (1 - p.y) * height / 2, depth: p.z };
    };
    return [0, 1, 2].flatMap((lane) => {
      const chosen = lane === this.pass?.lane;
      if (chosen && this.pass?.correct) return [];
      this.boards.getMatrixAt(lane, this.labelPose);
      const mid = pixels(0, 0);
      if (mid.depth < -1 || mid.depth >= 1) return [];
      const a = pixels(-TEXT_HALF_WIDTH, TEXT_HALF_HEIGHT), b = pixels(TEXT_HALF_WIDTH, TEXT_HALF_HEIGHT);
      const c = pixels(-TEXT_HALF_WIDTH, -TEXT_HALF_HEIGHT), d = pixels(TEXT_HALF_WIDTH, -TEXT_HALF_HEIGHT);
      // Keep upright type inside the projected banner, including when the track curves.
      const hw = Math.min(mid.x - Math.max(a.x, c.x), Math.min(b.x, d.x) - mid.x);
      const hh = Math.min(mid.y - Math.max(a.y, b.y), Math.min(c.y, d.y) - mid.y);
      if (hw < 6 || hh < 3 || mid.x + hw < 0 || mid.x - hw > width) return [];
      const tilt = chosen ? Math.atan2(b.y - a.y + d.y - c.y, b.x - a.x + d.x - c.x) : undefined;
      const opacity = (this.pass?.material.opacity ?? 1) * (chosen ? 0.88 : 1);
      return [{ lane, x: mid.x, y: mid.y, width: 2 * hw, height: 2 * hh, opacity, tilt }];
    });
  }

  dispose() {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.boards.geometry.dispose();
    this.boards.dispose();
    this.pass?.stamp?.geometry.dispose();
    this.pass?.material.dispose();
  }
}
