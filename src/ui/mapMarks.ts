import type { IslandPlan } from "../game/world/island";
import { HARBOR_SURF } from "../game/world/surf";

// The small marks on the round map for what one can take: the boats (a white hull in a yellow ring, so they are
// found from the beach) and the convertibles (a small car in its paint). Drawn where they are now.
export interface RideMark { kind: "car" | "boat"; x: number; z: number; heading: number; tint: string; taken: boolean }

/** `px`, `pz`: the map's middle (the player); `view` metres across `S` pixels; north (the sea) is up. */
export function drawRideMarks(c: CanvasRenderingContext2D, marks: RideMark[], px: number, pz: number, view: number, S: number) {
  for (const m of marks) {
    if (m.taken) continue;
    const x = ((m.x - px) / view + 0.5) * S, y = ((m.z - pz) / view + 0.5) * S;
    if (x < 6 || x > S - 6 || y < 6 || y > S - 6) continue;
    c.save();
    c.translate(x, y);
    if (m.kind === "boat") {
      c.fillStyle = "rgba(255, 210, 63, 0.9)"; c.strokeStyle = "#fff"; c.lineWidth = 2;
      c.beginPath(); c.arc(0, 0, 10, 0, Math.PI * 2); c.fill(); c.stroke();
      c.rotate(Math.PI - m.heading);
      c.fillStyle = "#fff"; c.strokeStyle = "#1f5f7a"; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(0, -7.5); c.quadraticCurveTo(4.2, -3, 3.6, 6); c.lineTo(-3.6, 6); c.quadraticCurveTo(-4.2, -3, 0, -7.5); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = m.tint; c.fillRect(-2.6, 1.5, 5.2, 2.4);
    } else {
      c.rotate(Math.PI - m.heading);
      c.fillStyle = m.tint; c.strokeStyle = "#fff"; c.lineWidth = 2;
      c.beginPath(); c.roundRect(-4, -7, 8, 14, 3); c.stroke(); c.fill();
      c.fillStyle = "rgba(255,255,255,0.85)"; c.fillRect(-2.6, -3.4, 5.2, 2.2);
    }
    c.restore();
  }
}

/** The board symbol at the school, projected at the same scale as the ride marks. */
export function drawSurfMark(c: CanvasRenderingContext2D, px: number, pz: number, view: number, size: number) {
  const site = HARBOR_SURF.shack;
  const x = ((site.x - px) / view + 0.5) * size, y = ((site.z - pz) / view + 0.5) * size;
  if (x < 10 || x > size - 10 || y < 10 || y > size - 10) return;
  c.save();
  c.translate(x, y);
  c.rotate(0.46);
  c.fillStyle = "#287c79";
  c.strokeStyle = "#f6ecd9";
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(0, -8);
  c.bezierCurveTo(5, -4, 5, 3, 2.4, 7);
  c.lineTo(-2.4, 7);
  c.bezierCurveTo(-5, 3, -5, -4, 0, -8);
  c.closePath();
  c.fill();
  c.stroke();
  c.beginPath();
  c.moveTo(0, -4);
  c.lineTo(0, 4);
  c.stroke();
  c.restore();
}

/** The same coastline and boards on both scales of map. */
export function drawIslandMap(c: CanvasRenderingContext2D, island: IslandPlan, x0: number, z0: number, scale: number) {
  const x = (worldX: number) => (worldX - x0) * scale;
  const z = (worldZ: number) => (worldZ - z0) * scale;
  const { outline, jetty: d, center, cottage } = island;
  c.save();
  c.fillStyle = "#8db568";
  c.strokeStyle = "#535e56";
  c.lineWidth = Math.max(1.2, scale * 0.55);
  c.beginPath();
  for (const p of outline) c.lineTo(x(p.x), z(p.z));
  c.closePath();
  c.fill();
  c.stroke();
  c.fillStyle = "#c2a074";
  c.fillRect(x(d.x0), z(d.z0), (d.x1 - d.x0) * scale, (d.z1 - d.z0) * scale);
  c.fillStyle = "#80534a";
  c.fillRect(x(cottage.x - cottage.w / 2), z(cottage.z - cottage.d / 2), cottage.w * scale, cottage.d * scale);
  c.fillStyle = "#f4ede0";
  c.beginPath();
  c.arc(x(center.x), z(center.z), 2.4 * scale, 0, 2 * Math.PI);
  c.fill();
  c.restore();
}

/** Both maps project from world dimensions, retaining the ground texture's scale. */
export function mapPosition(bounds: { minX: number; minZ: number; maxX: number; maxZ: number }, x: number, z: number) {
  return {
    left: `${(x - bounds.minX) / (bounds.maxX - bounds.minX) * 100}%`,
    top: `${(z - bounds.minZ) / (bounds.maxZ - bounds.minZ) * 100}%`,
  };
}
