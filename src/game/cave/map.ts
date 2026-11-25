import { CHAMBERS, GATES } from "../world/slateCave";
import { BOUNDS, PASSAGES } from "./plan";

let background: HTMLCanvasElement | undefined;
const SCALE = 2;
const W = (BOUNDS.maxX - BOUNDS.minX) * SCALE, H = (BOUNDS.maxZ - BOUNDS.minZ) * SCALE;
const x = (m: number) => (m - BOUNDS.minX) * SCALE, z = (m: number) => (m - BOUNDS.minZ) * SCALE;

function backing() {
  if (background) return background;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#243944";
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
  for (const room of CHAMBERS) {
    ctx.beginPath();
    ctx.ellipse(x(room.x), z(room.z), room.rx * SCALE, room.rz * SCALE, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  background = c;
  return c;
}

export function drawCaveMap(ctx: CanvasRenderingContext2D, west: number, north: number, scale: number, open: number) {
  ctx.save();
  ctx.fillStyle = "#243944";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.translate((BOUNDS.minX - west) * scale, (BOUNDS.minZ - north) * scale);
  ctx.scale(scale / SCALE, scale / SCALE);
  ctx.drawImage(backing(), 0, 0);
  ctx.lineWidth = 1.5;
  for (let i = 0; i < GATES.length; i++) {
    const gate = GATES[i], w = gate.w * SCALE / 2, a = Math.cos(gate.rot) * w, b = Math.sin(gate.rot) * w;
    ctx.strokeStyle = open & (1 << i) ? "#b8d3bd" : "#edcd83";
    ctx.beginPath();
    ctx.moveTo(x(gate.x) - a, z(gate.z) + b);
    ctx.lineTo(x(gate.x) + a, z(gate.z) - b);
    ctx.stroke();
  }
  ctx.restore();
}
