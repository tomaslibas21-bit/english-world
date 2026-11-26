import * as THREE from "three";
import { CAVE_COPY } from "../../content/cave-copy";
import { floorY } from "../water";
import { boxGeo, colourMerge, rand } from "./util";
import {
  COVE_DOORS, COVE_GAP, COVE_TRAILS, MOUTH_UPRIGHTS, SLATE_COVE,
  RING_DEBRIS, RING_GABLE, RING_STAIRS, RING_STONES, RING_WALLS, STONE_RING, ringWallPoint,
} from "./slateCovePlan";
import { slateRune } from "./slateRunes";

export function buildSlateCove() {
  const parts: [THREE.BufferGeometry, string][] = [];
  let r = rand(28651);
  const rock = ["#43525c", "#626d72", "#56636c", "#4c5761"];
  const moss = ["#72845c", "#61734e", "#829167"];
  const pick = (colors: string[]) => colors[Math.floor(r() * colors.length)];
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, color: string, rot = 0) => {
    parts.push([boxGeo(w, h, d, x, y, z, rot), color]);
  };
  const slab = (x: number, y: number, z: number, w: number, h: number, d: number, rot: number, color = pick(rock)) => {
    const geo = new THREE.DodecahedronGeometry(1, 0).rotateZ(0.16 + (r() - 0.5) * 0.35);
    geo.computeBoundingBox();
    const size = geo.boundingBox!.getSize(new THREE.Vector3());
    geo.scale(w / size.x, h / size.y, d / size.z).rotateY(rot).translate(x, y, z);
    parts.push([geo, color]);
  };
  const ribbon = (ax: number, az: number, bx: number, bz: number, width: number, color: string) => {
    const length = Math.hypot(bx - ax, bz - az);
    const dx = (bz - az) / length * width / 2, dz = (ax - bx) / length * width / 2;
    const corners = [[ax - dx, az - dz], [bx - dx, bz - dz], [bx + dx, bz + dz], [ax + dx, az + dz]];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute([0, 1, 2, 0, 2, 3].flatMap((i) => {
      const [x, z] = corners[i];
      return [x, floorY(x, z) + 0.023, z];
    }), 3));
    parts.push([geo, color]);
  };

  for (const [n, path] of COVE_TRAILS.entries()) for (let i = 1; i < path.length; i++) {
    const [ax, az] = path[i - 1], [bx, bz] = path[i];
    const x = ax + (bx - ax) * 0.7, z = az + (bz - az) * 0.7;
    ribbon(ax, az, bx, bz, n === 2 ? 1.9 : 2.6, n === 2 ? "#a7ad89" : "#bebfb0");
    slab(x, 0.037, z, 0.2, 0.018, 0.13, r(), "#a3a99b");
  }

  // Broken slate along the three exposed edges and the two sides of the trail opening.
  const B = SLATE_COVE;
  const edgeRock = (ax: number, az: number, bx: number, bz: number) => {
    const length = Math.hypot(bx - ax, bz - az), n = Math.ceil(length / 2.6);
    const rot = Math.atan2(az - bz, bx - ax);
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, x = ax + t * (bx - ax), z = az + t * (bz - az);
      const h = 0.66 + r() * 0.56;
      slab(x, h * 0.36, z, length / n + 0.16, h, 0.7, rot);
      if (r() < 0.45) slab(x, h * 0.8, z, 0.8, 0.11, 0.42, rot, pick(moss));
    }
  };
  edgeRock(B.minX - 0.28, B.minZ, B.minX - 0.28, B.maxZ);
  edgeRock(B.minX, B.minZ - 0.28, B.maxX, B.minZ - 0.28);
  edgeRock(B.minX, B.maxZ + 0.28, B.maxX, B.maxZ + 0.28);
  edgeRock(B.maxX - 0.5, B.minZ, B.maxX - 0.5, COVE_GAP.z - COVE_GAP.width / 2 - 0.18);
  edgeRock(B.maxX - 0.5, COVE_GAP.z + COVE_GAP.width / 2 + 0.18, B.maxX - 0.5, B.maxZ);

  for (const door of Object.values(COVE_DOORS)) {
    const { x, z, dx, dz, width: w, height: h } = door, rot = dx ? Math.PI / 2 : 0;
    const at = (side: number, up: number, depth: number, ww: number, hh: number, dd: number, color?: string) =>
      slab(x + side * dz + depth * dx, up, z - side * dx + depth * dz, ww, hh, dd, rot, color);
    const y = floorY(x, z);
    box(w, h, 0.07, x - 1.18 * dx, y + h / 2, z - 1.18 * dz, "#19252a", rot);
    for (const side of [-1, 1]) {
      at(side * (w / 2 + 0.72), y + 1.58, -0.65, 1.4, 3.55, 1.28);
      at(side * (w / 2 + 0.95), y + 1.41, -1.45, 1.7, 3.22, 1.55);
      at(side * (w / 2 + 0.92), y + 3.37, -1.03, 1.4, 0.22, 0.84, pick(moss));
    }
    at(0, y + (h + 4.8) / 2, -0.8, w + 2.2, 4.8 - h, 1.5);
    at(0.4, y + 4.5, -1.45, w * 0.9, 0.35, 0.85, pick(moss));
  }

  for (const stone of MOUTH_UPRIGHTS) {
    const { x, z, w, d, h, rot } = stone;
    slab(x, h / 2, z, w, h, d, rot, rock[1]);
    slab(x, h * 0.92, z, w * 0.74, h * 0.12, d * 0.86, rot, moss[0]);
  }

  const R = STONE_RING, S = RING_STAIRS;
  parts.push([new THREE.CircleGeometry(R.radius - 0.65, 48).rotateX(-Math.PI / 2).translate(R.x, -0.0175, R.z), "#7e9c5e"]);
  for (const arc of RING_WALLS) {
    const n = Math.ceil((arc.to - arc.from) * arc.radius / 0.96);
    for (let i = 0; i < n; i++) {
      const a = arc.from + (arc.to - arc.from) * i / n, b = arc.from + (arc.to - arc.from) * (i + 1) / n;
      const angle = (a + b) / 2;
      const p = ringWallPoint(arc, a), q = ringWallPoint(arc, b);
      const { x, z, low } = ringWallPoint(arc, angle);
      const w = Math.hypot(q.x - p.x, q.z - p.z);
      const rot = Math.atan2(p.z - q.z, q.x - p.x) + (r() - 0.5) * 0.12;
      const offset = (r() - 0.5) * 0.06;
      const cx = x + offset * Math.cos(angle), cz = z + offset * Math.sin(angle);
      if (low) {
        const h = 0.24 + r() * 0.11;
        slab(cx, h * 0.44, cz, w + 0.1, h, 0.58, rot);
        continue;
      }
      const h = 0.45 + r() * 0.62;
      box(w + 0.06, h, 0.56, cx, h / 2 - 0.025, cz, pick(rock), rot);
      if (r() < 0.48) slab(cx, h - 0.01, cz, w * 0.8, 0.07, 0.41, rot, pick(moss));
    }
    for (const [angle, end] of [[arc.from, arc.start], [arc.to, arc.end]] as const) {
      const { x, z } = ringWallPoint(arc, angle), rot = Math.PI / 2 - angle;
      if (end === "gate") {
        const h = arc.start === "gate" ? 1.46 : 1.72;
        slab(x, h * 0.4, z, 0.77, h * 0.88, 0.67, rot + 0.12);
        slab(x, h * 0.82, z, 0.59, h * 0.36, 0.57, rot - 0.09);
      }
      if (end === "rubble") slab(x, 0.13, z, 0.62, 0.32, 0.58, rot + 0.19);
    }
  }
  for (const { x, z, r: radius, angle } of RING_DEBRIS) {
    slab(x, 0.11, z, radius * 2, 0.29, radius * 1.6, angle + 0.38);
  }
  // Resume the original cove sequence at the standing stones to preserve their and the stair's decoration.
  r = rand(1267030788);
  for (const s of RING_STONES) {
    const { x, z, w, h, d, rot } = s;
    box(w, h * 0.79, d, x, h * 0.395, z, pick(rock), rot);
    slab(x, h * 0.77, z, w, h * 0.46, d, rot);
    slab(x, h * 0.95, z, w * 0.58, h * 0.11, d * 0.7, rot, pick(moss));
    if (!("rune" in s)) continue;
    const height = h * 0.65, size = 0.7, sin = Math.sin(rot), cos = Math.cos(rot);
    for (const [ax, ay, bx, by] of slateRune(s.rune)) {
      const cx = ((ax + bx) / 2 - 64) * size / 128, cy = (64 - (ay + by) / 2) * size / 128;
      const px = x + cx * cos + (d / 2 + 0.007) * sin, pz = z - cx * sin + (d / 2 + 0.007) * cos;
      const length = Math.hypot(bx - ax, by - ay) * size / 128, angle = Math.atan2(ay - by, bx - ax);
      for (const [shift, thick, color] of [[0, 0.034, "#343e43"], [0.01, 0.013, "#94a59b"]] as const) {
        parts.push([new THREE.BoxGeometry(length, thick, 0.009).rotateZ(angle).rotateY(rot).translate(px, height + cy + shift, pz), color]);
      }
    }
  }
  const dz = (S.foot - S.top) / S.treads;
  for (let i = 0; i < S.treads; i++) {
    const y = (i + 1) * 0.2, z = S.foot - (i + 0.5) * dz;
    box(2 * S.half, y, dz + 0.006, S.x, y / 2 - 0.045, z, pick(rock));
  }
  box(2 * S.half, S.rise, S.top - S.back, S.x, S.rise / 2 - 0.045, (S.top + S.back) / 2, rock[1]);
  // The side walls slope with the stair like an old wall-walk's (stepped ones read as a temple's flanks).
  const flank = new THREE.Shape([
    new THREE.Vector2(S.foot, 0), new THREE.Vector2(S.foot, 0.72), new THREE.Vector2(S.top, S.rise + 0.72),
    new THREE.Vector2(S.back, S.rise + 0.72), new THREE.Vector2(S.back, 0),
  ]);
  for (const side of [-1, 1]) {
    const x = S.x + side * (S.half + 0.18);
    parts.push([new THREE.ExtrudeGeometry(flank, { depth: 0.36, bevelEnabled: false }).rotateY(-Math.PI / 2).translate(x + 0.18, 0, 0), rock[0]]);
    for (let i = 1; i < S.treads; i += 4 + Math.floor(r() * 3)) {
      const z = S.foot - (i + 0.5) * dz, y = S.rise * (i + 0.5) / S.treads + 0.72;
      slab(x, y + 0.02, z, 0.42, 0.08, dz * 2.2, 0, pick(moss));
    }
  }
  const G = RING_GABLE;
  box(G.w, S.rise + 0.72, G.d, G.x, (S.rise + 0.72) / 2, G.z, rock[0]);
  for (const side of [-1, 1]) {
    const x = G.x + side * 1.26;
    box(1.88, 1.22, G.d, x, S.rise + 1.33, G.z, pick(rock));
    slab(x, S.rise + 1.90, G.z, 1.92, 0.26, G.d * 1.02, 0, pick(moss));
  }
  box(2.55, 0.35, G.d, G.x, S.rise + 2.06, G.z, rock[2]);
  slab(G.x, S.rise + 2.29, G.z, 1.78, 0.68, G.d, 0);
  // A slate headland behind the cove (its own seed, after everything else): the caves open at the foot of cliffs, and
  // the desert road's mesas beyond the town's west edge stay out of the ring's and the trail's view. It stands 4 m and
  // more beyond the cove's west wall, out of reach; the camera's occlusion field covers it (slateCoveArt.ts).
  const q = rand(53117);
  const crag = (x: number, z: number, w: number, h: number, d: number) => {
    const geo = new THREE.DodecahedronGeometry(1, 0).rotateZ((q() - 0.5) * 0.3);
    geo.computeBoundingBox();
    const size = geo.boundingBox!.getSize(new THREE.Vector3());
    geo.scale(w / size.x, h / size.y, d / size.z).rotateY(q() * 6.28).translate(x, h * 0.42, z);
    parts.push([geo, rock[Math.floor(q() * rock.length)]]);
    if (q() < 0.55) slab(x + (q() - 0.5) * w * 0.4, h * 0.88, z, w * 0.62, 0.32, d * 0.55, q() * 6.28, moss[Math.floor(q() * moss.length)]);
  };
  for (let z = B.minZ - 4; z <= B.maxZ + 7; z += 2.9) {
    crag(-144.8 - q() * 1.2, z + (q() - 0.5) * 1.4, 3.4 + q() * 1.6, 2.1 + q() * 1.3, 3 + q() * 1.4);
    crag(-149.5 - q() * 1.5, z + 1.4 + (q() - 0.5) * 1.4, 4.6 + q() * 2, 4.4 + q() * 2.4, 4.2 + q() * 2);
    crag(-155 - q() * 2, z + (q() - 0.5) * 2, 6 + q() * 2.5, 9 + q() * 4, 5.5 + q() * 2.5);
    crag(-162 - q() * 2, z + 1.4 + (q() - 0.5) * 2, 8 + q() * 3, 12 + q() * 4.5, 7 + q() * 3);
  }
  // (one more at its southern tail, in front of the desert crest's cactus there; the ring's maples do the rest)
  crag(-151.4, -32.4, 4.6, 5.6, 4.2);
  const material = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(colourMerge(parts), material);
  mesh.name = "slate-cove";
  mesh.matrixAutoUpdate = false;
  return mesh;
}



export const COVE_PROMPTS = {
  main: { kind: "cave-entry", id: "main", label: CAVE_COPY.door.main.en,
    prompt: { kind: "enter", label: CAVE_COPY.door.main.en, lt: CAVE_COPY.action.enter.lt } },
  cleft: { kind: "cave-entry", id: "cleft", label: CAVE_COPY.door.cleft.en,
    prompt: { kind: "enter", label: CAVE_COPY.door.cleft.en, lt: CAVE_COPY.action.enter.lt } },
} as const;
