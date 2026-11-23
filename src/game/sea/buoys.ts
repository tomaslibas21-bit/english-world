import * as THREE from "three";
import { boardId, type BoardFace } from "../kit/boardFaces";
import type { Prompt } from "../road/words";
import { SEA_LEVEL } from "../water";
import { seaSwell as swell } from "./backdrop";
import { colourMerge } from "../world/util";
import { LANE_WIDTH, laneOffset } from "./course";

const BOARD_Y = 2.05;
const PANEL_WIDTH = 6.4, PANEL_HEIGHT = 2.55;
const LANES = [0, 1, 2];
const BUOYS = [-1.5, -0.5, 0.5, 1.5].map((lane) => lane * LANE_WIDTH);
const PASS_SECONDS = 0.65;
type Part = [THREE.BufferGeometry, THREE.ColorRepresentation];

function buoyGeometry() {
  const lathe = (profile: [number, number][]) => new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 12);
  return colourMerge([
    [lathe([[0, -0.30], [0.65, -0.27], [0.96, -0.06], [1, 0.17], [0.96, 0.38]]), "#ee5835"],
    [lathe([[0.96, 0.38], [0.9, 0.61]]), "#fff9e7"],
    [lathe([[0.9, 0.61], [0.76, 0.85], [0.49, 1.06], [0.27, 1.13], [0, 1.13]]), "#ff6940"],
    [new THREE.CylinderGeometry(0.09, 0.19, 2.15, 8).translate(0, 2.18, 0), "#db5739"],
    [new THREE.CylinderGeometry(0.19, 0.24, 0.14, 8).translate(0, 3.27, 0), "#3b4c51"],
    [new THREE.SphereGeometry(0.23, 8, 6).translate(0, 3.44, 0), "#ffdc83"],
  ]);
}

function boardGeometry() {
  const eyeY = 3.12 - BOARD_Y, top = PANEL_HEIGHT / 2;
  const rope = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(-LANE_WIDTH / 2, 3.24 - BOARD_Y, 0.34),
    new THREE.Vector3(0, eyeY - 0.1, 0.18),
    new THREE.Vector3(LANE_WIDTH / 2, 3.24 - BOARD_Y, 0.34),
  );
  const parts: Part[] = [
    [new THREE.BoxGeometry(PANEL_WIDTH + 0.16, PANEL_HEIGHT + 0.15, 0.26).translate(0, 0, 0.06), "#b58755"],
    [new THREE.BoxGeometry(PANEL_WIDTH, PANEL_HEIGHT, 0.11).translate(0, 0, 0.19), "#fff4db"],
    [new THREE.TubeGeometry(rope, 8, 0.035, 5), "#604c38"],
    // The rope sags onto the board's upper trim and meets both buoy masts.
    ...[-1, 1].map((side): Part => [
      new THREE.CylinderGeometry(0.12, 0.12, 0.065, 8).rotateX(Math.PI / 2).translate(side * (PANEL_WIDTH / 2 - 0.28), top - 0.15, 0.23),
      "#a97749",
    ]),
  ];
  return colourMerge(parts);
}

export class SeaGate {
  readonly mesh = new THREE.Group();
  private readonly floats = new THREE.InstancedMesh(buoyGeometry(),
    new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, depthWrite: false }), BUOYS.length);
  private readonly panels = boardGeometry();
  private readonly material = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, depthWrite: false });
  private readonly boards = LANES.map(() => new THREE.Mesh(this.panels, this.material));
  readonly id = boardId();
  private readonly floatPose = new THREE.Object3D();
  private pass?: { lane: number; correct: boolean; age: number; material: THREE.MeshLambertMaterial };

  constructor(readonly distance: number, readonly prompt: Prompt, x: number, z: number) {
    this.mesh.position.set(x, SEA_LEVEL, z);
    this.floats.frustumCulled = false;
    this.mesh.add(this.floats, ...this.boards);
  }

  get crossed() { return !!this.pass; }
  /** How much of the floats is showing (0–1), for the rings on the water around them. */
  get shown() { return this.floats.material.opacity; }

  cross(lane: number, correct: boolean) {
    const material = this.material.clone();
    material.color.set(correct ? "#a2ff9b" : "#787479");
    if (correct) {
      material.emissive.set("#45ec63");
      material.emissiveIntensity = 0.55;
    }
    this.boards[lane].material = material;
    this.pass = { lane, correct, age: 0, material };
  }

  pose(time: number, ahead: number, visibility = 1, dt = 0) {
    const { x, z } = this.mesh.position, pass = this.pass;
    if (pass) pass.age += dt;
    const age = pass ? Math.min(1, pass.age / PASS_SECONDS) : 0;
    const opacity = pass ? 1 - THREE.MathUtils.smoothstep(age, 0.28, 1) : visibility;
    this.mesh.visible = opacity > 0;
    this.floats.material.opacity = opacity;
    this.material.opacity = pass ? 0 : THREE.MathUtils.smoothstep(ahead, 1, 7) * opacity;
    if (pass) pass.material.opacity = opacity * (pass.correct ? 0.93 : 0.59);
    if (!this.mesh.visible) return !pass;

    const heights = BUOYS.map((offset, i) => {
      const y = swell(x + offset, z, time) + Math.sin(time * 1.45 + i * 1.8) * 0.095;
      this.floatPose.position.set(offset, y, 0.34);
      this.floatPose.rotation.z = Math.sin(time * 1.65 + i * 0.9) * 0.065;
      this.floatPose.updateMatrix();
      this.floats.setMatrixAt(i, this.floatPose.matrix);
      return y;
    });
    this.floats.instanceMatrix.needsUpdate = true;
    for (const lane of LANES) {
      const board = this.boards[lane], a = heights[lane], b = heights[lane + 1];
      const reacting = lane === pass?.lane;
      board.position.set(laneOffset(lane), BOARD_Y + (a + b) / 2 + (reacting ? 1.65 + 0.65 * age : 0), 0);
      board.rotation.z = Math.atan2(b - a, LANE_WIDTH) + (reacting && !pass.correct ? -0.31 + 0.14 * age : 0);
      if (reacting) board.scale.setScalar(0.64 - 0.08 * age);
      board.visible = reacting || this.material.opacity > 0;
    }
    this.mesh.updateMatrixWorld(true);
    return true;
  }

  faces(): BoardFace[] {
    if (!this.mesh.visible) return [];
    return this.boards.flatMap((board, lane) => board.visible && board.material.opacity > 0
      ? [{ lane, world: board.matrixWorld, opacity: board.material.opacity, interactive: !this.pass }]
      : []);
  }

  dispose() {
    this.mesh.removeFromParent();
    this.floats.geometry.dispose();
    this.floats.material.dispose();
    this.floats.dispose();
    this.panels.dispose();
    this.material.dispose();
    this.pass?.material.dispose();
  }
}
