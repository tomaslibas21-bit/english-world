import type { NavGrid } from "../nav";
import { FLOORS } from "../water";
import type { Colliders } from "./util";

export const CAVE_ZONE = "gruta";
export const SLATE_COVE = { minX: -140, maxX: -112, minZ: -68, maxZ: -43 };
export const COVE_GAP = { z: -59, width: 5 };
export const COVE_APPROACH = { x: -101, z: -55 };

export function inSlateCove(x: number, z: number) {
  return x >= SLATE_COVE.minX && x <= SLATE_COVE.maxX && z >= SLATE_COVE.minZ && z <= SLATE_COVE.maxZ;
}

export const COVE_DOORS = {
  main: { id: "main", x: -135, z: -63, width: 3.2, height: 2.8, dx: 1, dz: 0, out: { x: -131.8, z: -63, rot: Math.PI / 2 } },
  cleft: { id: "cleft", x: -121, z: -65, width: 2.6, height: 2.5, dx: 0, dz: 1, out: { x: -121, z: -61.8, rot: 0 } },
} as const;

export type CoveDoor = keyof typeof COVE_DOORS;
export const PREFERRED_COVE_DOOR: CoveDoor = "cleft";
export const COVE_REACH = 2.4;
export const MOUTH_UPRIGHTS = [
  { x: -136.05, z: -60.65, w: 0.76, d: 0.67, h: 2.11, rot: 0.48 },
  { x: -122.74, z: -66.18, w: 0.81, d: 0.66, h: 1.89, rot: -0.29 },
] as const;
export const COVE_TRAILS = [
  [[-108, -59], [-116, -59], [-128, -62], [-132, -63], [-135, -63]],
  [[-116, -59], [-119, -60], [-121, -61.8], [-121, -65]],
  [[-116, -59], [-115, -55], [-114.8, -48], [-117, -48], [-120, -48]],
] as const;
export const STONE_RING = { minX: -134, maxX: -117, minZ: -57.5, maxZ: -43.8, gateZ: -48, gateWidth: 3.2, x: -126, z: -49.8 };
export const RING_TARGET = { x: -120, z: -48 };
export const RING_STAIRS = { x: -126, half: 1.7, foot: -49.6, top: -55.4, back: -56.9, rise: 3.6, treads: 18 };

const R = STONE_RING, S = RING_STAIRS;
export const RING_WALLS = [
  [R.minX, R.minZ, R.minX, R.maxZ],
  [R.minX, R.maxZ, R.maxX, R.maxZ],
  [R.minX, R.minZ, R.maxX, R.minZ],
  [R.maxX, R.minZ, R.maxX, R.gateZ - R.gateWidth / 2],
  [R.maxX, R.gateZ + R.gateWidth / 2, R.maxX, R.maxZ],
] as const;

export const RING_STONES = [
  { x: -122.15, z: -52.68, w: 1.22, h: 2.22, d: 0.67, rot: 0.3, rune: 3 },
  { x: -129.34, z: -53.25, w: 1.42, h: 2.75, d: 0.77, rot: 0.45 },
  { x: -130.8, z: -50.36, w: 1.05, h: 1.65, d: 0.55, rot: 1.12 },
  { x: -130.17, z: -47.4, w: 1.43, h: 2.49, d: 0.85, rot: 0.72, rune: 9 },
  { x: -127.44, z: -45.25, w: 1.18, h: 1.92, d: 0.67, rot: -0.35 },
  { x: -124.5, z: -45.23, w: 1.5, h: 2.54, d: 0.8, rot: 0.44 },
  { x: -122.13, z: -46.95, w: 1.28, h: 2.08, d: 0.59, rot: -0.65 },
] as const;

export const RING_GABLE = { x: S.x, z: -56.86, w: 4.4, d: 0.66 };
/** Old fall maples south of the ring, beyond the town's west edge and the cove's south rocks (out of reach): from the
 *  ring gate, the lawn and the trail into the ring they hide the desert road's mesa. x, z, scale, foot y (the dunes'
 *  crest rises to the west). Drawn with the town's street maples (town.ts addTrees). */
export const RING_MAPLES = [
  [-113.4, -35.5, 1.75, 0], [-117.2, -34.2, 1.9, 0], [-121, -35.8, 1.8, 0], [-124.8, -34, 1.85, 0.43],
  [-115, -28.5, 2, 0], [-119.1, -27.4, 1.95, 0], [-123, -29, 2.05, 0.31], [-127.2, -27.8, 1.9, 0.58],
  [-129.5, -34.8, 1.8, 0.74], [-131.5, -27.5, 1.9, 0.86],
  // (and on along the headland's end: from the gate the road's mesa and its cactus stand west-south-west)
  [-134.5, -33.5, 1.9, 1.06], [-138.5, -29.5, 2, 1.2], [-135.5, -25, 2, 1.1], [-142.5, -33, 1.9, 1.25],
  [-141.5, -24.5, 2.05, 1.22], [-145.5, -28.5, 1.95, 1.3], [-133, -21.5, 1.85, 0.98], [-148, -23.5, 2, 1.3],
  [-139, -20.5, 1.9, 1.22],
  // younger ones between them, so the low sky between the old trunks is leaves too, and two more at the headland's end
  [-117, -31.2, 1.25, 0], [-121.1, -31.6, 1.3, 0], [-125.2, -31.4, 1.2, 0.48], [-129.3, -31, 1.3, 0.75],
  [-133.1, -29.4, 1.25, 0.98], [-137, -33.2, 1.3, 1.17], [-140.4, -28.6, 1.2, 1.25], [-144.2, -31.8, 1.3, 1.32],
  [-148.6, -31.6, 1.35, 1.5], [-152, -30.8, 1.95, 1.82], [-155.6, -26.6, 2.05, 1.55], [-151.6, -25.4, 1.3, 1.33],
  [-147.4, -27.6, 1.25, 1.39], [-144, -22.6, 1.9, 1.2], [-136.2, -22.2, 1.25, 1.12],
  [-155, -32.6, 1.9, 2.05], [-158.5, -29.5, 2, 1.8], [-160, -24.5, 2, 1.18], [-153, -21, 1.3, 1.05],
  [-152.4, -31.2, 1.5, 1.85],
  // saplings along the grove's south side, so the desert crest's cacti don't show between the old trunks
  [-118.5, -21.5, 1, 0.12], [-123.2, -21.8, 0.95, 0.38], [-127.4, -20.6, 1.05, 0.64], [-131.2, -24.6, 1, 0.89],
  [-138.6, -25.2, 0.95, 1.22], [-141.6, -20.2, 1.05, 1.25], [-146.8, -20.6, 1, 1.2], [-150.2, -22.4, 0.95, 1.22],
  [-156.6, -20.4, 1.05, 0.92], [-149.2, -29.4, 1, 1.53], [-143.2, -27.6, 0.95, 1.27], [-134.8, -27.2, 1, 1.09],
] as const;
export function ringStairY(_x: number, z: number) {
  return S.rise * Math.min(1, Math.max(0, (S.foot - z) / (S.foot - S.top)));
}

export function addSlateCoveColliders(col: Colliders) {
  const { minX, maxX, minZ, maxZ } = SLATE_COVE;
  const gap0 = COVE_GAP.z - COVE_GAP.width / 2, gap1 = COVE_GAP.z + COVE_GAP.width / 2;
  col.addBox(maxX - 1, (-110 + gap0) / 2, 2, gap0 + 110, "cove-edge");
  col.addBox(maxX - 1, (gap1 + 110) / 2, 2, 110 - gap1, "town-edge");
  col.addBox(minX - 0.5, (minZ + maxZ) / 2, 1, maxZ - minZ + 2, "cove-edge");
  for (const z of [minZ - 0.5, maxZ + 0.5]) col.addBox((minX + maxX) / 2, z, maxX - minX, 1, "cove-edge");

  for (const door of Object.values(COVE_DOORS)) {
    const { x, z, width, dx, dz } = door;
    for (const side of [-1, 1]) {
      const o = side * (width / 2 + 0.65);
      col.addBox(x - 0.6 * dx + o * dz, z - 0.6 * dz + o * dx, dx ? 1.2 : 1.3, dx ? 1.3 : 1.2, "cove-rock");
    }
    col.addBox(x - 1.6 * dx, z - 1.6 * dz, dx ? 0.8 : width + 2.6, dx ? width + 2.6 : 0.8, "cove-rock");
  }
  for (const stone of MOUTH_UPRIGHTS) col.addCircle(stone.x, stone.z, Math.hypot(stone.w, stone.d) / 2);
  for (const [x0, z0, x1, z1] of RING_WALLS) col.addBox((x0 + x1) / 2, (z0 + z1) / 2, Math.abs(x1 - x0) || 0.7, Math.abs(z1 - z0) || 0.7, "ring-wall");
  for (const stone of RING_STONES) col.addCircle(stone.x, stone.z, Math.hypot(stone.w, stone.d) / 2);
  for (const side of [-1, 1]) col.addBox(S.x + side * (S.half + 0.18), (S.foot + S.back) / 2, 0.36, S.foot - S.back, "ring-edge");
  col.addBox(RING_GABLE.x, RING_GABLE.z, RING_GABLE.w, RING_GABLE.d, "ring-edge");
  FLOORS.push({ x0: S.x - S.half - 0.02, x1: S.x + S.half + 0.02, z0: S.back, z1: S.foot, y: ringStairY });
}

/** Keep the original town cells and clip only the extra columns to the enclosed headland. */
export function filterSlateCoveNav(nav: NavGrid, colliders: Colliders) {
  const extra = (SLATE_COVE.maxX - nav.minX) / nav.cell;
  for (let row = 0; row < nav.rows; row++) {
    const z = nav.minZ + (row + 0.5) * nav.cell;
    const first = row * nav.cols;
    if (!inSlateCove(SLATE_COVE.minX, z)) {
      nav.blocked.fill(1, first, first + extra);
      continue;
    }
    // A 1 m cell can graze the back wall while leaving its center on the landing.
    for (let col = 0; col < extra; col++) {
      const x = nav.minX + (col + 0.5) * nav.cell;
      nav.blocked[first + col] = Number(colliders.blocked(x, z, 0.45));
    }
  }
}

export function drawSlateCoveMap(ctx: CanvasRenderingContext2D, west: number, north: number, scale: number) {
  const x = (m: number) => (m - west) * scale, z = (m: number) => (m - north) * scale;
  const { minX, maxX, minZ, maxZ } = SLATE_COVE;
  ctx.save();
  ctx.fillStyle = "#85996a";
  ctx.fillRect(x(minX), z(minZ), (maxX - minX) * scale, (maxZ - minZ) * scale);
  ctx.strokeStyle = "#d4d0af";
  ctx.lineJoin = ctx.lineCap = "round";
  ctx.lineWidth = scale * 1.7;
  for (const trail of COVE_TRAILS) {
    ctx.beginPath();
    ctx.moveTo(x(trail[0][0]), z(trail[0][1]));
    for (let i = 1; i < trail.length; i++) ctx.lineTo(x(trail[i][0]), z(trail[i][1]));
    ctx.stroke();
  }
  ctx.fillStyle = "#425362";
  for (const stone of RING_STONES) ctx.fillRect(x(stone.x - 0.45), z(stone.z - 0.45), scale * 0.9, scale * 0.9);
  for (const door of Object.values(COVE_DOORS)) ctx.fillRect(x(door.x - 0.8), z(door.z - 0.8), scale * 1.6, scale * 1.6);
  ctx.restore();
}
