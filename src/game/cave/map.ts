import type { CaveArt, CaveQuestConfig } from "./config";
import { BOUNDS, PASSAGES, PATH, POOLS } from "./plan";

const SCALE = 2;
const W = (BOUNDS.maxX - BOUNDS.minX) * SCALE, H = (BOUNDS.maxZ - BOUNDS.minZ) * SCALE;
const x = (m: number) => (m - BOUNDS.minX) * SCALE, z = (m: number) => (m - BOUNDS.minZ) * SCALE;

export function createCaveMap({ chambers, gates }: Pick<CaveQuestConfig, "chambers" | "gates">, art: Pick<CaveArt, "fog" | "pool">) {
  let background: HTMLCanvasElement | undefined;
  let overlay: HTMLCanvasElement | undefined;
  let displayedMask = -1;

  function backing() {
    if (background) return background;
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = art.fog;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = ctx.fillStyle = "#637c77";
    ctx.lineCap = "round";
    for (const passage of PASSAGES) {
      ctx.beginPath();
      ctx.moveTo(x(passage.ax), z(passage.az));
      ctx.lineTo(x(passage.bx), z(passage.bz));
      ctx.lineWidth = passage.w * SCALE;
      ctx.stroke();
    }
    for (const room of chambers) {
      ctx.beginPath();
      ctx.ellipse(x(room.x), z(room.z), room.rx * SCALE, room.rz * SCALE, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = art.pool;
    for (const pool of POOLS) {
      ctx.beginPath();
      ctx.ellipse(x(pool.x), z(pool.z), pool.rx * SCALE, pool.rz * SCALE, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "#a9a69a";
    ctx.lineWidth = 1.5 * SCALE;
    ctx.beginPath();
    ctx.moveTo(x(PATH[0][0]), z(PATH[0][1]));
    for (let i = 1; i < PATH.length; i++) ctx.lineTo(x(PATH[i][0]), z(PATH[i][1]));
    ctx.stroke();
    background = c;
    return c;
  }

  function marked(open: number) {
    overlay ??= document.createElement("canvas");
    if (displayedMask === open) return overlay;
    displayedMask = open;
    overlay.width = W;
    overlay.height = H;
    const ctx = overlay.getContext("2d")!;
    ctx.drawImage(backing(), 0, 0);
    ctx.lineWidth = 1.5;
    for (let i = 0; i < gates.length; i++) {
      const gate = gates[i], w = gate.w * SCALE / 2, a = Math.cos(gate.rot) * w, b = Math.sin(gate.rot) * w;
      ctx.strokeStyle = open & (1 << i) ? "#b8d3bd" : "#edcd83";
      ctx.beginPath();
      ctx.moveTo(x(gate.x) - a, z(gate.z) + b);
      ctx.lineTo(x(gate.x) + a, z(gate.z) - b);
      ctx.stroke();
    }
    return overlay;
  }

  return function drawCaveMap(ctx: CanvasRenderingContext2D, west: number, north: number, scale: number, open: number) {
    ctx.save();
    ctx.fillStyle = art.fog;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.drawImage(marked(open), (BOUNDS.minX - west) * scale, (BOUNDS.minZ - north) * scale, W * scale / SCALE, H * scale / SCALE);
    ctx.restore();
  }
}
