import * as THREE from "three";
import { colourMerge, rand } from "../world/util";

export const PIECE_LENGTH = 64;
export const LANE = 4;
export const ROAD_HALF = 6.3;
const STEPS = 16;

export const center = (s: number) => 7 * Math.sin(s / 55) + 3 * Math.sin(s / 24);
export const height = (s: number) => 1.1 * Math.sin(s / 31) + 0.7 * Math.sin(s / 71);
export const course = (s: number) => Math.PI - Math.atan((center(s + 0.5) - center(s - 0.5)));
export const laneOffset = (lane: number) => (lane - 1) * LANE;
export const laneAt = (x: number) => THREE.MathUtils.clamp(Math.round(x / LANE) + 1, 0, 2);

type Kind = "cone" | "weed" | "boost" | "ramp" | "cactus" | "rock";
export type Feature = { kind: Kind; s: number; x: number; hit: boolean; phase: number };
type Scenery = { kind: "cactus" | "rock" | "pole" | "sign"; s: number; x: number; seed: number };
export type TrackPiece = {
  index: number; mesh: THREE.Mesh; features: Feature[]; scenery: Scenery[];
};
type Part = [THREE.BufferGeometry, THREE.ColorRepresentation];

export function point(s: number, x = 0, y = 0) {
  return new THREE.Vector3(center(s) + x, height(s) + y, -s);
}

function ribbon(s0: number, length: number, lo: number, hi: number, y: number, steps: number) {
  const positions: number[] = [];
  const triangles: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const s = s0 + i * length / steps, x = center(s), h = height(s) + y;
    positions.push(x + lo, h, -s, x + hi, h, -s);
    if (i) { const a = i * 2 - 2; triangles.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(triangles);
  g.computeVertexNormals();
  return g;
}

const RAMP_LENGTH = 5;
const RAMP_RISE = 0.65;

function rampTop(s: number, x: number, y: number) {
  return point(s, x, y + 0.035);
}

function wedge(s: number, x: number) {
  const front = s - RAMP_LENGTH / 2, back = s + RAMP_LENGTH / 2;
  const positions = [
    rampTop(front, x - 1.45, 0), rampTop(front, x + 1.45, 0), rampTop(back, x - 1.45, 0),
    rampTop(back, x + 1.45, 0), rampTop(back, x - 1.45, RAMP_RISE), rampTop(back, x + 1.45, RAMP_RISE),
  ];
  const g = new THREE.BufferGeometry().setFromPoints(positions);
  g.setIndex([0, 1, 4, 1, 5, 4, 2, 5, 4, 2, 3, 5, 0, 4, 2, 1, 3, 5]);
  g.computeVertexNormals();
  return g;
}

function chevrons(s: number, x: number, count: number, surface: (at: number, offset: number) => THREE.Vector3) {
  const parts: Part[] = [];
  for (let i = 0; i < count; i++) {
    const at = s + i * 1.48;
    const a = surface(at, x - 1.10), b = surface(at + 0.67, x), c = surface(at, x + 1.10);
    const d = surface(at + 0.43, x - 1.10), e = surface(at + 1.10, x), f = surface(at + 0.43, x + 1.10);
    const g = new THREE.BufferGeometry().setFromPoints([a, b, d, b, e, d, b, c, e, c, f, e]);
    g.computeVertexNormals();
    parts.push([g, i % 2 ? "#f0ffdf" : "#76ffda"]);
  }
  return parts;
}

const add = (parts: Part[], g: THREE.BufferGeometry, color: THREE.ColorRepresentation) => {
  const plain = g.index ? g.toNonIndexed() : g;
  if (plain !== g) g.dispose();
  parts.push([plain, color]);
};

export class Track {
  readonly group = new THREE.Group();
  readonly pieces = new Map<number, TrackPiece>();
  private material = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  released = 0;

  stream(distance: number) {
    const current = Math.floor(distance / PIECE_LENGTH);
    const first = Math.max(-1, current - 1), last = current + 4;
    let changed = false;
    for (const index of this.pieces.keys()) if (index < first || index > last) {
      this.release(index);
      changed = true;
    }
    for (let i = first; i <= last; i++) if (!this.pieces.has(i)) {
      const piece = this.build(i);
      this.pieces.set(i, piece);
      this.group.add(piece.mesh);
      changed = true;
    }
    return changed;
  }

  private build(index: number): TrackPiece {
    const s = index * PIECE_LENGTH;
    const r = rand(317 + index * 1709);
    const parts: Part[] = [], features: Feature[] = [], scenery: Scenery[] = [];
    const strip = (x0: number, x1: number, y: number, color: string) => add(parts, ribbon(s, PIECE_LENGTH, x0, x1, y, STEPS), color);
    strip(-180, -ROAD_HALF, -0.07, "#dfaa70");
    strip(ROAD_HALF, 180, -0.07, "#dfaa70");
    strip(-ROAD_HALF, ROAD_HALF, 0, "#495560");
    for (const side of [-1, 1]) {
      const x = side * (ROAD_HALF - 0.23);
      strip(x - 0.07, x + 0.07, 0.025, "#f3c982");
      const lane = side * LANE / 2;
      for (let at = 2; at < PIECE_LENGTH; at += 8) add(parts, ribbon(s + at, 3, lane - 0.045, lane + 0.045, 0.022, 1), "#eee6d7");
    }
    scenery.push({ kind: "pole", s: s + 10, x: 9.4, seed: r() });
    if (index % 3 === 1) scenery.push({ kind: "sign", s: s + 46, x: -8.3, seed: r() });
    for (const side of [-1, 1]) for (let j = 0; j < 4; j++) scenery.push({
      kind: (j + Number(side > 0)) % 2 ? "cactus" : "rock", s: s + 6 + j * 14 + r() * 6,
      x: side * (j < 3 ? 7.7 + r() * 4.5 : 16 + r() * 18), seed: r(),
    });
    const place = (kind: Kind, at: number, lane: number, phase = r()) =>
      features.push({ kind, s: s + at, x: laneOffset(lane), phase, hit: false });
    if (index === 0) {
      // Introduce one feature at a time, with a clear way around each.
      place("cone", 13, 2);
      place("boost", 24, 1);
      place("ramp", 42, 2);
      place("cone", 38, 0);
      place("cone", 47, 0);
      place("weed", 56, 1, Math.PI / 2);
      place("boost", 61, 2);
    } else if (index > 0) {
      const lane = Math.floor(r() * 3);
      place(index % 2 === 0 ? "boost" : "ramp", 33, lane);
      place("cone", 16, (lane + 1) % 3);
      if (index % 3 !== 0) place("weed", 51, 1, r() * Math.PI * 2);
      if (index >= 6 && index % 2 === 0) place("cone", 46, (lane + 2) % 3);
      if (index >= 4 && index % 3 !== 0) {
        const kind = index % 2 ? "rock" : "cactus", x = index % 4 > 1 ? -6.7 : 6.7;
        scenery.push({ kind, s: s + 42, x, seed: 0.52 });
        features.push({ kind, s: s + 42, x, hit: false, phase: 0 });
      }
    }
    for (const { kind, s: at, x } of features) {
      if (kind === "boost") {
        add(parts, ribbon(at - 3, 6, x - 1.53, x + 1.53, 0.036, 4), "#187b79");
        for (const side of [-1, 1]) {
          const edge = x + side * 1.45;
          add(parts, ribbon(at - 3, 6, edge - 0.065, edge + 0.065, 0.048, 4), "#a9ffe5");
        }
        parts.push(...chevrons(at - 2.75, x, 4, (u, offset) => point(u, offset, 0.075)));
      } else if (kind === "ramp") {
        add(parts, wedge(at, x), "#d66a3d");
        parts.push(...chevrons(at - 1.5, x, 2, (u, offset) =>
          rampTop(u, offset, 0.045 + (u - at + RAMP_LENGTH / 2) / RAMP_LENGTH * RAMP_RISE)));
      }
    }
    const mesh = new THREE.Mesh(colourMerge(parts), this.material);
    return { index, mesh, features, scenery };
  }

  private release(index: number) {
    const piece = this.pieces.get(index);
    if (!piece) return;
    piece.mesh.removeFromParent();
    piece.mesh.geometry.dispose();
    this.pieces.delete(index);
    this.released++;
  }

  dispose() {
    for (const index of this.pieces.keys()) this.release(index);
    this.material.dispose();
  }
}

export const featureX = (feature: Feature, time: number) =>
  feature.kind === "weed" ? Math.sin(time * 1.45 + feature.phase) * 7.7 : feature.x;
