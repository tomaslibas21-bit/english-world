import * as THREE from "three";
import { colourMerge } from "../world/util";
import { course, laneOffset, point } from "./track";
import type { Prompt } from "./words";

const GATE_COLORS = ["#ffb65a", "#61dfca", "#a9a9fa"];
const BANNER_Y = 4.22;
const TEXT_HALF_WIDTH = 1.78;
const TEXT_HALF_HEIGHT = 0.96;
export type LabelAnchor = { lane: number; x: number; y: number; width: number; height: number };

export class Gate {
  readonly mesh: THREE.Mesh;
  readonly frame: readonly THREE.Vector3[];
  private banners: THREE.Vector3[][];
  private projected = new THREE.Vector3();

  constructor(readonly distance: number, readonly prompt: Prompt, material: THREE.Material) {
    const parts: [THREE.BufferGeometry, string][] = [];
    const block = (w: number, h: number, d: number, x: number, y: number, z: number, color: string) =>
      parts.push([new THREE.BoxGeometry(w, h, d).translate(x, y, z), color]);

    for (let lane = 0; lane < 3; lane++) {
      const x = laneOffset(lane), ink = GATE_COLORS[lane];
      for (const side of [-1, 1]) {
        const post = x + side * 1.79;
        block(0.29, 3.92, 0.55, post, 1.96, 0, ink);
        block(0.40, 0.64, 0.70, post, 0.32, 0, "#263843");
        block(0.31, 0.17, 0.57, post, 0.79, 0, "#fff0ce");
        block(0.31, 0.17, 0.57, post, 2.51, 0, "#fff0ce");
      }
      block(3.88, 2.20, 0.65, x, BANNER_Y, 0, ink);
      block(3.65, 1.99, 0.06, x, BANNER_Y, 0.335, "#252d37");
      block(1.9, 0.045, 0.63, x, 0.038, 1.24, ink);
      block(1.9, 0.045, 0.17, x, 0.038, 1.94, ink);
    }
    this.mesh = new THREE.Mesh(colourMerge(parts), material);
    // Distant gate colours remain recognizable before the car reaches the haze.
    this.mesh.position.copy(point(distance));
    this.mesh.rotation.y = course(distance) - Math.PI;
    this.mesh.updateMatrixWorld(true);
    this.banners = [0, 1, 2].map((lane) => {
      const x = laneOffset(lane);
      return [[0, 0], [-TEXT_HALF_WIDTH, TEXT_HALF_HEIGHT], [TEXT_HALF_WIDTH, TEXT_HALF_HEIGHT],
        [-TEXT_HALF_WIDTH, -TEXT_HALF_HEIGHT], [TEXT_HALF_WIDTH, -TEXT_HALF_HEIGHT]]
        .map(([dx, dy]) => this.mesh.localToWorld(new THREE.Vector3(x + dx, BANNER_Y + dy, 0.371)));
    });
    this.frame = [-5.94, 5.94].flatMap((x) => [BANNER_Y - 1.1, BANNER_Y + 1.1]
      .map((y) => this.mesh.localToWorld(new THREE.Vector3(x, y, 0.371))));
  }

  labels(camera: THREE.PerspectiveCamera, width: number, height: number): LabelAnchor[] {
    const pixels = (world: THREE.Vector3) => {
      const p = this.projected.copy(world).project(camera);
      return { x: (1 + p.x) * width / 2, y: (1 - p.y) * height / 2, depth: p.z };
    };
    return this.banners.flatMap(([center, tl, tr, bl, br], lane) => {
      const mid = pixels(center);
      if (mid.depth < -1 || mid.depth >= 1) return [];
      const a = pixels(tl), b = pixels(tr), c = pixels(bl), d = pixels(br);
      // Keep upright type inside the projected banner, including when the track curves.
      const hw = Math.min(mid.x - Math.max(a.x, c.x), Math.min(b.x, d.x) - mid.x);
      const hh = Math.min(mid.y - Math.max(a.y, b.y), Math.min(c.y, d.y) - mid.y);
      if (hw < 6 || hh < 3 || mid.x + hw < 0 || mid.x - hw > width) return [];
      return [{ lane, x: mid.x, y: mid.y, width: 2 * hw, height: 2 * hh }];
    });
  }

  dispose() {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
  }
}
