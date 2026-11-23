import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { colourMerge, rand } from "../world/util";
import { ROAD_LOOK } from "./look";

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

/** The desert floor: flat by the road, rolling into low dunes farther out. */
export function dune(s: number, x: number) {
  const out = Math.abs(x);
  if (out <= 9) return 0;
  const rise = THREE.MathUtils.smoothstep(out, 9, 36);
  return rise * (1.5 * Math.sin(s / 41 + x / 29) + 1.0 * Math.sin(s / 19 - x / 37 + 1.3) + 0.55 * Math.sin(x / 11 + s / 67));
}
/** A point on the ground beside the road, `x` metres from its middle. */
export const ground = (s: number, x: number, y = 0) => new THREE.Vector3(center(s) + x, height(s) + dune(s, x) + y, -s);

const ACROSS = [ROAD_HALF, 8.3, 12, 20, 34, 56, 92, 160, 320];
const SAND = ROAD_LOOK.sand.map((c) => new THREE.Color(c));
const SHOULDER = new THREE.Color(ROAD_LOOK.shoulder);

/** Both sides of the desert floor for one piece: flat-shaded facets in three tones of sand. */
function terrain(s0: number) {
  const positions: number[] = [], colours: number[] = [];
  const tone = new THREE.Color();
  const corner = (s: number, x: number) => { const p = ground(s, x, -0.07); positions.push(p.x, p.y, p.z); };
  for (const side of [-1, 1]) for (let i = 0; i < STEPS; i++) for (let j = 0; j + 1 < ACROSS.length; j++) {
    const a = s0 + i * PIECE_LENGTH / STEPS, b = a + PIECE_LENGTH / STEPS, lo = side * ACROSS[j], hi = side * ACROSS[j + 1];
    // Alternate the diagonal so the facets do not line up in rows.
    const quads = (i + j) % 2 ? [[a, lo], [b, lo], [b, hi], [a, lo], [b, hi], [a, hi]] : [[a, lo], [b, lo], [a, hi], [b, lo], [b, hi], [a, hi]];
    for (let k = 0; k < 2; k++) {
      const tri = quads.slice(k * 3, k * 3 + 3);
      for (const [s, x] of side < 0 ? tri : [tri[0], tri[2], tri[1]]) corner(s, x);
      const ms = (tri[0][0] + tri[1][0] + tri[2][0]) / 3, mx = (tri[0][1] + tri[1][1] + tri[2][1]) / 3;
      const n = Math.sin(ms * 0.171 + mx * 0.093) * Math.sin(ms * 0.047 - mx * 0.131 + 2.1);
      if (j === 0) tone.copy(SHOULDER);
      else if (n > 0) tone.copy(SAND[0]).lerp(SAND[2], Math.min(1, n * 1.7));
      else tone.copy(SAND[0]).lerp(SAND[1], Math.min(1, -n * 1.7));
      for (let v = 0; v < 3; v++) colours.push(tone.r, tone.g, tone.b);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(colours, 3));
  g.computeVertexNormals();
  return g;
}

/** The poles stand every POLE_GAP metres on the right, with one wire sagging between each pair. */
export const POLE_GAP = PIECE_LENGTH / 2;
export const POLE_X = 12.5;
const POLE_FIRST = 10;
function wire(s0: number) {
  const positions: number[] = [], index: number[] = [];
  const spans = 6;
  for (const arm of [-0.82, 0.82]) {
    const base = positions.length / 3;
    for (let i = 0; i <= spans; i++) {
      const t = i / spans, s = s0 + t * POLE_GAP, sag = 4 * t * (1 - t) * 0.85;
      const p = point(s, POLE_X, 0);
      // The pole's crossarm lies across the road; the wire hangs from its two insulators.
      const y = THREE.MathUtils.lerp(ground(s0, POLE_X).y, ground(s0 + POLE_GAP, POLE_X).y, t) - 0.07 + 6.12 - sag;
      positions.push(p.x + arm, y + 0.012, p.z, p.x + arm, y - 0.012, p.z);
      if (i) { const a = base + i * 2 - 2; index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2, a + 2, a + 1, a, a + 2, a + 3, a + 1); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

export function point(s: number, x = 0, y = 0) {
  return new THREE.Vector3(center(s) + x, height(s) + y, -s);
}

export function ribbon(s0: number, length: number, lo: number, hi: number, y: number, steps: number) {
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
    strip(-ROAD_HALF, ROAD_HALF, 0, "#5b626b");
    for (const side of [-1, 1]) {
      const x = side * (ROAD_HALF - 0.23);
      strip(x - 0.07, x + 0.07, 0.025, "#f3c982");
      const lane = side * LANE / 2;
      for (let at = 2; at < PIECE_LENGTH; at += 8) add(parts, ribbon(s + at, 3, lane - 0.045, lane + 0.045, 0.022, 1), "#eee6d7");
    }
    for (let at = POLE_FIRST; at < PIECE_LENGTH; at += POLE_GAP) {
      scenery.push({ kind: "pole", s: s + at, x: POLE_X, seed: r() });
      add(parts, wire(s + at), "#6a5a50");
    }
    // Marker posts count the metres on both shoulders: the rhythm of the road.
    for (const side of [-1, 1]) for (let at = 4; at < PIECE_LENGTH; at += 16) {
      const base = point(s + at, side * (ROAD_HALF + 0.95), -0.07);
      add(parts, new THREE.BoxGeometry(0.13, 0.86, 0.09).translate(base.x, base.y + 0.43, base.z), "#f4ecdc");
      add(parts, new THREE.BoxGeometry(0.15, 0.17, 0.11).translate(base.x, base.y + 0.66, base.z), side < 0 ? "#f0a23c" : "#d9573f");
    }
    // Sand the wind has carried onto the edge of the asphalt.
    for (let j = 0; j < 5; j++) {
      const side = j % 2 ? 1 : -1, at = s + r() * (PIECE_LENGTH - 9), reach = 0.5 + r() * 1.1, long = 3 + r() * 5;
      const edge = side * (ROAD_HALF + 0.05);
      const tongue = new THREE.BufferGeometry().setFromPoints(side < 0
        ? [point(at, edge, 0.012), point(at + long, edge, 0.012), point(at + long * (0.3 + r() * 0.4), edge - side * reach, 0.012)]
        : [point(at, edge, 0.012), point(at + long * (0.3 + r() * 0.4), edge - side * reach, 0.012), point(at + long, edge, 0.012)]);
      tongue.computeVertexNormals();
      add(parts, tongue, ROAD_LOOK.sand[j % 3]);
    }
    // Scrub and stones scattered over the nearer sand.
    for (let j = 0; j < 14; j++) {
      const side = j % 2 ? 1 : -1, out = 7.8 + r() * r() * 46, size = 0.26 + r() * 0.5;
      const base = ground(s + r() * PIECE_LENGTH, side * out);
      const bush = j % 7 === 6
        ? new THREE.DodecahedronGeometry(size * 0.7, 0).scale(1.3, 0.55, 1)
        : new THREE.IcosahedronGeometry(size, 0).scale(1.25, 0.62, 1.1);
      add(parts, bush.rotateY(r() * 6).translate(base.x, base.y + size * 0.3, base.z),
        j % 7 === 6 ? "#b98567" : ROAD_LOOK.scrub[j % 3 ? 0 : 1]);
    }
    if (index % 3 === 1) scenery.push({ kind: "sign", s: s + 46, x: -8.3, seed: r() });
    for (const side of [-1, 1]) for (let j = 0; j < 4; j++) scenery.push({
      kind: (j + Number(side > 0)) % 2 ? "cactus" : "rock", s: s + 6 + j * 14 + r() * 6,
      x: side * (j < 3 ? 7.7 + r() * 4.5 : 16 + r() * 18), seed: r(),
    });
    if (index === 0) {
      // The last of the town falls behind in the first seconds: a few low houses, a water tower, then open desert.
      const walls = ROAD_LOOK.town;
      const house = (at: number, x: number, wide: number, deep: number, tall: number, i: number) => {
        const base = ground(s + at, x, -0.6);
        add(parts, new THREE.BoxGeometry(wide, tall + 0.6, deep).translate(base.x, base.y + (tall + 0.6) / 2, base.z), walls[i % walls.length]);
        add(parts, new THREE.BoxGeometry(wide + 0.5, 0.28, deep + 0.5).translate(base.x, base.y + tall + 0.74, base.z), ROAD_LOOK.roof);
        add(parts, new THREE.BoxGeometry(0.12, 1.9, 0.9).translate(base.x - Math.sign(x) * (wide / 2 + 0.02), base.y + 1.55, base.z), "#5a4338");
      };
      house(20, -13.5, 6, 8, 3.4, 0); house(33, 18, 7, 7, 3.0, 1); house(46, -14.5, 6, 6, 2.8, 2); house(58, 18.5, 6, 8, 3.2, 3);
      const tower = ground(s + 38, -24, -0.4);
      for (const [dx, dz] of [[-1.3, -1.3], [1.3, -1.3], [-1.3, 1.3], [1.3, 1.3]]) {
        add(parts, new THREE.CylinderGeometry(0.1, 0.13, 7.4, 5).translate(tower.x + dx, tower.y + 3.7, tower.z + dz), "#6f5a4c");
      }
      add(parts, new THREE.CylinderGeometry(2.3, 2.3, 2.8, 9).translate(tower.x, tower.y + 8.6, tower.z), walls[1]);
      add(parts, new THREE.ConeGeometry(2.55, 1.2, 9).translate(tower.x, tower.y + 10.6, tower.z), ROAD_LOOK.roof);
    }
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
    const built = [colourMerge(parts), terrain(s)];
    const mesh = new THREE.Mesh(mergeGeometries(built, false)!, this.material);
    built.forEach((g) => g.dispose());
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
