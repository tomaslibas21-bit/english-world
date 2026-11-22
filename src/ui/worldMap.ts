import { groundsBounds, GAPS, polar, R, trail, ways } from "../game/cave/groundsPlan";
import { BOUNDS, CHAMBERS, GATES, PASSAGES, POOLS, SACBE, type Gate } from "../game/cave/plan";
import { SEA_Z, WORLD } from "../game/world/layout";
import { THEME } from "../game/world/theme";

export interface MapBounds { minX: number; maxX: number; minZ: number; maxZ: number }
type Point = readonly [number, number];

export const groundBounds: MapBounds = { ...WORLD, minZ: SEA_Z - 2 };

export function townMapBounds(town: MapBounds, grounds?: MapBounds): MapBounds {
  return grounds ? {
    minX: Math.min(town.minX, grounds.minX), maxX: Math.max(town.maxX, grounds.maxX),
    minZ: Math.min(town.minZ, grounds.minZ), maxZ: Math.max(town.maxZ, grounds.maxZ),
  } : town;
}

const cenote = THEME.cenote?.open ? THEME.cenote : undefined;
const meadow = cenote && groundsBounds(cenote.x, cenote.z, WORLD.minX);
const steps = cenote ? trail(cenote.x, cenote.z) : [];
const entrances = cenote ? ways(cenote.x, cenote.z) : [];
export const townBounds = townMapBounds(groundBounds, meadow);

export function mapPoint(bounds: MapBounds, x: number, z: number): Point {
  return [(x - bounds.minX) / (bounds.maxX - bounds.minX), (z - bounds.minZ) / (bounds.maxZ - bounds.minZ)];
}

export function mapWindow(x: number, z: number, span: number): MapBounds {
  const half = span / 2;
  return { minX: x - half, maxX: x + half, minZ: z - half, maxZ: z + half };
}

function stroke(ctx: CanvasRenderingContext2D, points: Point[], color: string, width: number) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(...points[0]);
  for (const p of points.slice(1)) ctx.lineTo(...p);
  ctx.stroke();
}

function oval(ctx: CanvasRenderingContext2D, x: number, z: number, rx: number, rz: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, z, rx, rz, 0, 0, 2 * Math.PI);
  ctx.fill();
}

function drawGrounds(ctx: CanvasRenderingContext2D) {
  if (!cenote || !meadow) return;
  const { x, z } = cenote;
  ctx.fillStyle = "#5e954f";
  ctx.fillRect(meadow.minX, meadow.minZ, meadow.maxX - meadow.minX, meadow.maxZ - meadow.minZ);
  ctx.fillStyle = "#8eb866";
  ctx.fillRect(meadow.minX + 2, meadow.minZ + 2, meadow.maxX - meadow.minX - 2, meadow.maxZ - meadow.minZ - 4);
  ctx.lineCap = "round";
  stroke(ctx, [[x + R + 2.1, z], [-109.6, -6.6]], "#e6dcc3", 2.2);
  stroke(ctx, [[x + R + 7.6, z + 0.6], [x + R + 6.2, z + 3.6]], "#e6dcc3", 1.4);
  oval(ctx, x, z, R + 1, R + 1, "#c6bc9e");
  oval(ctx, x, z, R, R, "#3699b5");
  oval(ctx, x - 0.6, z + 0.25, R - 1.15, R - 1.15, "#277f9e");
  ctx.fillStyle = "#ac7b50";
  ctx.fillRect(x + R - 2.1, z - 1.2, 5.55, 2.4);
  for (const gap of GAPS) {
    stroke(ctx, [polar(x, z, gap.a, R + 2), polar(x, z, gap.a, R - 0.3)], "#e6dcc3", 1.55);
  }
  for (let i = 1; i < steps.length; i++) {
    const [ax, az] = steps[i - 1], [bx, bz] = steps[i];
    const count = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / 1.25));
    for (let j = 0; j < count; j++) {
      oval(ctx, ax + (bx - ax) * j / count, az + (bz - az) * j / count, 0.48, 0.44, "#e6dcc3");
    }
  }
  for (const entry of entrances) {
    if (entry.id === "boca") continue;
    oval(ctx, entry.x, entry.z, 1.4, 1.4, "#e6dcc3");
    if (entry.id === "ojo") oval(ctx, entry.x, entry.z, 0.95, 0.95, "#20515c");
    else {
      ctx.fillStyle = "#20515c";
      ctx.fillRect(entry.x - 0.55, entry.z - 0.95, 1.1, 1.9);
    }
  }
}

/** Paint in world coordinates so the two town maps share the same ground and cenote landmarks. */
export function drawTownMap(canvas: HTMLCanvasElement, ground: HTMLCanvasElement, view: MapBounds) {
  const ctx = canvas.getContext("2d")!;
  ctx.save();
  ctx.scale(canvas.width / (view.maxX - view.minX), canvas.height / (view.maxZ - view.minZ));
  ctx.translate(-view.minX, -view.minZ);
  const w = view.maxX - view.minX;
  ctx.fillStyle = "#3f8fb5";
  ctx.fillRect(view.minX, view.minZ, w, view.maxZ - view.minZ);
  const shore = Math.max(SEA_Z + 1, view.minZ);
  if (shore < view.maxZ) {
    ctx.fillStyle = "#86b866";
    ctx.fillRect(view.minX, shore, w, view.maxZ - shore);
  }
  ctx.drawImage(ground, groundBounds.minX, groundBounds.minZ,
    groundBounds.maxX - groundBounds.minX, groundBounds.maxZ - groundBounds.minZ);
  const groundsVisible = !!meadow && view.minX < meadow.maxX && view.maxX > meadow.minX && view.minZ < meadow.maxZ && view.maxZ > meadow.minZ;
  if (groundsVisible) drawGrounds(ctx);
  ctx.restore();
  return groundsVisible;
}

function gateLine(g: Gate): [Point, Point] {
  const dx = Math.cos(g.rot) * g.w / 2, dz = Math.sin(g.rot) * g.w / 2;
  return [[g.x - dx, g.z + dz], [g.x + dx, g.z - dz]];
}

/** Fit the long sacbé into the round card, leaving room for the entry and heart. */
export const caveBounds = mapWindow(0, (BOUNDS.minZ + BOUNDS.maxZ) / 2, 226);

export function drawCaveMap(canvas: HTMLCanvasElement, open: number) {
  const ctx = canvas.getContext("2d")!;
  const view = caveBounds;
  ctx.fillStyle = "#153b46";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.scale(canvas.width / (view.maxX - view.minX), canvas.height / (view.maxZ - view.minZ));
  ctx.translate(-view.minX, -view.minZ);
  ctx.lineCap = "round";
  for (const p of PASSAGES) stroke(ctx, [[p.ax, p.az], [p.bx, p.bz]], "#a5b8a3", p.w);
  for (const c of CHAMBERS) oval(ctx, c.x, c.z, c.rx, c.rz, "#a5b8a3");
  for (const p of POOLS) oval(ctx, p.x, p.z, p.rx, p.rz, "#4290ac");
  stroke(ctx, SACBE, "#eee4bf", 2.8);
  GATES.forEach((g, i) => stroke(ctx, gateLine(g), open & (1 << i) ? "#6befb7" : "#e48159", 2.4));
  ctx.restore();
}
