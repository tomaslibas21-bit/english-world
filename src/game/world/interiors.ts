// Interiors: dollhouse-style rooms (back and side walls, a low front wall) seen from the entrance.
import * as THREE from "three";
import { Merger, mat, boxGeo, cylGeo, textTexture, rand, Colliders, roundRect } from "./util";
import { STYLED } from "../style";
import { floorMaterial, floorColor } from "./styled";

export interface NpcSpot { npc: string; x: number; z: number; rot: number; sit?: boolean }
export interface Interior {
  id: string;
  group: THREE.Group;
  colliders: Colliders;
  w: number; d: number;
  exit: { x: number; z: number };
  spawn: { x: number; z: number; rot: number };
  npcs: NpcSpot[];
  /** optional named spots for scripted moves */
  spots?: Record<string, { x: number; z: number }>;
  warm?: boolean;
}

type Builder = (ctx: Ctx) => void;
interface Ctx { M: Merger; col: Colliders; g: THREE.Group; w: number; d: number; r: () => number }

const WALL_H = 4.2;

function room(id: string, w: number, d: number, floor: string, wall: string, build: Builder, npcs: NpcSpot[], opts: { floorKind?: "wood" | "tile" | "carpet" | "stone"; accent?: string; warm?: boolean } = {}): Interior {
  const g = new THREE.Group();
  g.name = "interior-" + id;
  const M = new Merger();
  const col = new Colliders();
  const r = rand(id.length * 97 + w);
  // floor with pattern texture
  const fc = document.createElement("canvas");
  fc.width = 512; fc.height = 512;
  const x = fc.getContext("2d")!;
  x.fillStyle = STYLED ? floorColor(floor) : floor; x.fillRect(0, 0, 512, 512);
  const kind = opts.floorKind ?? "wood";
  if (kind === "wood") {
    for (let i = 0; i < 16; i++) {
      x.fillStyle = i % 2 ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.05)";
      x.fillRect(0, i * 32, 512, 32);
      x.fillStyle = "rgba(0,0,0,0.12)"; x.fillRect(0, i * 32, 512, 1.5);
      for (let k = 0; k < 3; k++) x.fillRect(((i * 137 + k * 181) % 512), i * 32, 1.5, 32);
    }
  } else if (kind === "tile") {
    for (let i = 0; i < 8; i++) for (let k = 0; k < 8; k++) {
      x.fillStyle = (i + k) % 2 ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.06)";
      x.fillRect(i * 64, k * 64, 64, 64);
      x.strokeStyle = "rgba(0,0,0,0.12)"; x.strokeRect(i * 64, k * 64, 64, 64);
    }
  } else if (kind === "carpet") {
    for (let i = 0; i < 400; i++) { x.fillStyle = "rgba(255,255,255,0.03)"; x.fillRect(Math.random() * 512, Math.random() * 512, 3, 3); }
  } else {
    for (let i = 0; i < 6; i++) for (let k = 0; k < 6; k++) { x.strokeStyle = "rgba(0,0,0,0.1)"; x.strokeRect(i * 86, k * 86, 86, 86); }
  }
  const ft = new THREE.CanvasTexture(fc);
  ft.colorSpace = THREE.SRGBColorSpace;
  ft.wrapS = ft.wrapT = THREE.RepeatWrapping;
  ft.repeat.set(w / 4, d / 4);
  const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), STYLED ? floorMaterial(ft, kind) : new THREE.MeshLambertMaterial({ map: ft }));
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.receiveShadow = true;
  g.add(floorMesh);
  // walls: back (north), sides, low front with a gap for the door
  const wm = mat(wall);
  const base = mat(opts.accent ?? "#8a6a4a");
  M.add("wall", wm, boxGeo(w, WALL_H, 0.3, 0, WALL_H / 2, -d / 2 - 0.15), false);
  M.add("wall", wm, boxGeo(0.3, WALL_H, d, -w / 2 - 0.15, WALL_H / 2, 0), false);
  M.add("wall", wm, boxGeo(0.3, WALL_H, d, w / 2 + 0.15, WALL_H / 2, 0), false);
  M.add("baseboard", base, boxGeo(w, 0.3, 0.34, 0, 0.15, -d / 2 - 0.1), false);
  M.add("baseboard", base, boxGeo(0.34, 0.3, d, -w / 2 - 0.1, 0.15, 0), false);
  M.add("baseboard", base, boxGeo(0.34, 0.3, d, w / 2 + 0.1, 0.15, 0), false);
  const gap = 2.4;
  M.add("front", wm, boxGeo(w / 2 - gap / 2, 0.9, 0.3, -(w / 4 + gap / 4), 0.45, d / 2 + 0.15), false);
  M.add("front", wm, boxGeo(w / 2 - gap / 2, 0.9, 0.3, (w / 4 + gap / 4), 0.45, d / 2 + 0.15), false);
  M.add("front-top", base, boxGeo(w + 0.6, 0.12, 0.4, 0, 0.95, d / 2 + 0.15), false);
  col.addBox(0, -d / 2 - 0.3, w + 2, 0.6);
  col.addBox(-w / 2 - 0.3, 0, 0.6, d + 2);
  col.addBox(w / 2 + 0.3, 0, 0.6, d + 2);
  col.addBox(-(w / 4 + gap / 4), d / 2 + 0.3, w / 2 - gap / 2, 0.6);
  col.addBox((w / 4 + gap / 4), d / 2 + 0.3, w / 2 - gap / 2, 0.6);
  col.addBox(0, d / 2 + 1.4, gap + 2, 0.6); // beyond the exit mat
  // exit mat
  M.add("exit-mat", mat("#b5452f"), boxGeo(2.2, 0.03, 1.2, 0, 0.015, d / 2 - 0.4), false);
  build({ M, col, g, w, d, r });
  M.build(g);
  return { id, group: g, colliders: col, w, d, exit: { x: 0, z: d / 2 - 0.2 }, spawn: { x: 0, z: d / 2 - 1.6, rot: Math.PI }, npcs, warm: opts.warm };
}

// ---------------------------------------------------------------------------
// Props

function counter(c: Ctx, x: number, z: number, w: number, d: number, color: string, top = "#f2efe8") {
  c.M.add("counter-" + color, mat(color), boxGeo(w, 1.0, d, x, 0.5, z));
  c.M.add("counter-top-" + top, mat(top), boxGeo(w + 0.12, 0.08, d + 0.12, x, 1.04, z));
  c.col.addBox(x, z, w, d);
}
function shelf(c: Ctx, x: number, z: number, w: number, h: number, color: string, goods: string[], rot = 0, depth = 0.5) {
  c.M.add("shelf-" + color, mat(color), boxGeo(w, h, depth, 0, h / 2, 0, 0).rotateY(rot).translate(x, 0, z));
  const rows = Math.max(1, Math.floor(h / 0.55));
  for (let i = 1; i <= rows; i++) {
    const y = i * (h / (rows + 0.3));
    for (let k = 0; k < Math.floor(w / 0.32); k++) {
      const gcol = goods[(k + i) % goods.length];
      const gh = 0.2 + c.r() * 0.18;
      c.M.add("goods-" + gcol, mat(gcol), boxGeo(0.24, gh, 0.26, -w / 2 + 0.2 + k * 0.32, y + gh / 2 - 0.12, depth / 2 - 0.05).rotateY(rot).translate(x, 0, z), false);
    }
  }
  const cw = Math.abs(Math.cos(rot)) * w + Math.abs(Math.sin(rot)) * depth, cd = Math.abs(Math.sin(rot)) * w + Math.abs(Math.cos(rot)) * depth;
  c.col.addBox(x, z, cw, cd);
}
function table(c: Ctx, x: number, z: number, opts: { round?: boolean; cloth?: string; chairs?: number; w?: number; d?: number; chairColor?: string } = {}) {
  const top = opts.cloth ?? "#e8dccb";
  if (opts.round) c.M.add("table-" + top, mat(top), cylGeo(0.6, 0.6, 0.06, x, 0.76, z, 16));
  else c.M.add("table-" + top, mat(top), boxGeo(opts.w ?? 1.4, 0.06, opts.d ?? 0.9, x, 0.76, z));
  c.M.add("table-leg", mat("#5a4636"), cylGeo(0.06, 0.08, 0.74, x, 0.37, z, 6));
  const n = opts.chairs ?? 2;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.PI / 2;
    const cx = x + Math.cos(a) * 0.95, cz = z + Math.sin(a) * 0.95;
    const cc = opts.chairColor ?? "#6b4a3a";
    c.M.add("chair-" + cc, mat(cc), boxGeo(0.45, 0.08, 0.45, cx, 0.46, cz));
    c.M.add("chair-" + cc, mat(cc), boxGeo(0.45, 0.55, 0.08, 0, 0.72, 0.2).rotateY(-a + Math.PI / 2).translate(cx, 0, cz));
    for (const [lx, lz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) c.M.add("chair-leg", mat("#3b2a20"), boxGeo(0.05, 0.44, 0.05, cx + lx, 0.22, cz + lz), false);
  }
  c.col.addCircle(x, z, opts.round ? 0.75 : 0.9);
}
function plant(c: Ctx, x: number, z: number, s = 1) {
  c.M.add("pot", mat("#b86b4b"), cylGeo(0.28 * s, 0.22 * s, 0.5 * s, x, 0.25 * s, z, 10));
  c.M.add("leaves", mat("#4c8c3c", { flat: true }), new THREE.IcosahedronGeometry(0.5 * s, 0).translate(x, 0.85 * s, z));
  c.M.add("leaves", mat("#5fa24b", { flat: true }), new THREE.IcosahedronGeometry(0.35 * s, 0).translate(x + 0.15, 1.2 * s, z - 0.1));
  c.col.addCircle(x, z, 0.35 * s);
}
function wallPanel(c: Ctx, tex: THREE.Texture, x: number, y: number, z: number, w: number, h: number, rotY = 0) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  m.position.set(x, y, z); m.rotation.y = rotY;
  c.g.add(m);
  return m;
}
function windowBack(c: Ctx, x: number, w: number, h = 2, y = 2.2, sky = "#bfe3f7") {
  c.M.add("win-" + sky, mat(sky, { emissive: "#4d7a90" }), boxGeo(w, h, 0.05, x, y, -c.d / 2 + 0.02), false);
  c.M.add("win-frame", mat("#ffffff"), boxGeo(w + 0.2, 0.12, 0.12, x, y - h / 2, -c.d / 2 + 0.06), false);
  c.M.add("win-frame", mat("#ffffff"), boxGeo(0.1, h, 0.1, x, y, -c.d / 2 + 0.06), false);
}
function lamp(c: Ctx, x: number, z: number, y = 3.6) {
  c.M.add("lamp-cord", mat("#333"), cylGeo(0.01, 0.01, WALL_H - y, x, y + (WALL_H - y) / 2, z, 4), false);
  c.M.add("lamp-shade", mat("#f2c14e", { emissive: "#8a6a20" }), new THREE.ConeGeometry(0.3, 0.3, 12, 1, true).translate(x, y, z), false);
}
function rug(c: Ctx, x: number, z: number, w: number, d: number, color: string) {
  c.M.add("rug-" + color, mat(color), boxGeo(w, 0.02, d, x, 0.012, z), false, true);
}
function menuBoard(lines: string[], title: string, colors = { bg: "#2f3a33", fg: "#f7f3e8", accent: "#ffd166" }) {
  const rows = lines.length;
  const H = Math.max(640, 150 + rows * 50);
  const cv = document.createElement("canvas"); cv.width = 1024; cv.height = H;
  const x = cv.getContext("2d")!;
  x.fillStyle = colors.bg; roundRect(x, 0, 0, 1024, H, 30); x.fill();
  x.strokeStyle = "#8a6a4a"; x.lineWidth = 18; x.stroke();
  x.fillStyle = colors.accent; x.font = "800 60px Nunito, Arial"; x.textAlign = "center"; x.fillText(title, 512, 84);
  x.font = "600 38px Nunito, Arial";
  lines.forEach((l, i) => {
    const [name, price] = l.split("|");
    const y = 150 + i * 50;
    x.fillStyle = colors.fg; x.textAlign = "left"; x.fillText(name, 70, y);
    if (price) { x.textAlign = "right"; x.fillStyle = colors.accent; x.fillText(price, 954, y); }
  });
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  (t as any).aspect = 1024 / H;
  return t;
}
function painting(seed: number, w = 256, h = 200) {
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  const x = cv.getContext("2d")!;
  const r = rand(seed);
  const pal = [["#1b2a49", "#f4d35e", "#ee964b", "#0d3b66"], ["#f6bd60", "#84a59d", "#f28482", "#f5cac3"], ["#2b2d42", "#8d99ae", "#ef233c", "#edf2f4"], ["#606c38", "#283618", "#dda15e", "#fefae0"]][seed % 4];
  x.fillStyle = pal[0]; x.fillRect(0, 0, w, h);
  if (seed % 3 === 0) { // night sky with stars (The Colors of the Night)
    for (let i = 0; i < 40; i++) { x.fillStyle = pal[1]; x.beginPath(); x.arc(r() * w, r() * h * 0.7, r() * 3 + 1, 0, 7); x.fill(); }
    x.fillStyle = pal[2]; x.beginPath(); x.arc(w * 0.75, h * 0.25, 22, 0, 7); x.fill();
    x.fillStyle = pal[3]; x.fillRect(0, h * 0.75, w, h * 0.25);
  } else if (seed % 3 === 1) { // landscape
    x.fillStyle = pal[1]; x.fillRect(0, h * 0.55, w, h * 0.45);
    x.fillStyle = pal[2]; x.beginPath(); x.moveTo(0, h * 0.6); x.quadraticCurveTo(w * 0.3, h * 0.2, w * 0.6, h * 0.6); x.fill();
    x.fillStyle = pal[3]; x.beginPath(); x.arc(w * 0.2, h * 0.25, 18, 0, 7); x.fill();
  } else { // abstract / "a blue square"
    for (let i = 0; i < 6; i++) { x.fillStyle = pal[i % 4]; x.fillRect(r() * w * 0.7, r() * h * 0.7, 30 + r() * 80, 30 + r() * 80); }
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function framedArt(c: Ctx, seed: number, x: number, y: number, z: number, w: number, h: number, rotY = 0) {
  const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, h + 0.2, 0.08), mat("#c9a227"));
  frame.position.set(x, y, z); frame.rotation.y = rotY;
  c.g.add(frame);
  const art = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map: painting(seed) }));
  art.position.set(x + Math.sin(rotY) * 0.05, y, z + Math.cos(rotY) * 0.05); art.rotation.y = rotY;
  c.g.add(art);
}
function sofa(c: Ctx, x: number, z: number, color: string, rot = 0, len = 2.2) {
  c.M.add("sofa-" + color, mat(color), boxGeo(len, 0.45, 0.9, 0, 0.35, 0).rotateY(rot).translate(x, 0, z));
  c.M.add("sofa-" + color, mat(color), boxGeo(len, 0.6, 0.25, 0, 0.8, -0.35).rotateY(rot).translate(x, 0, z));
  for (const s of [-1, 1]) c.M.add("sofa-" + color, mat(color), boxGeo(0.25, 0.55, 0.9, s * (len / 2 - 0.1), 0.55, 0).rotateY(rot).translate(x, 0, z));
  c.col.addBox(x, z, Math.abs(Math.cos(rot)) * len + Math.abs(Math.sin(rot)) * 0.9, Math.abs(Math.sin(rot)) * len + Math.abs(Math.cos(rot)) * 0.9);
}
function desk(c: Ctx, x: number, z: number, rot = 0) {
  c.M.add("desk", mat("#e9e4da"), boxGeo(1.6, 0.06, 0.8, 0, 0.75, 0).rotateY(rot).translate(x, 0, z));
  for (const s of [-0.7, 0.7]) c.M.add("desk-leg", mat("#7a7a7a"), boxGeo(0.06, 0.74, 0.7, s, 0.37, 0).rotateY(rot).translate(x, 0, z));
  c.M.add("monitor", mat("#1d1d1d"), boxGeo(0.7, 0.45, 0.05, 0, 1.08, -0.2).rotateY(rot).translate(x, 0, z));
  c.M.add("screen", mat("#7fb3d5", { emissive: "#2c4f66" }), boxGeo(0.64, 0.38, 0.02, 0, 1.08, -0.17).rotateY(rot).translate(x, 0, z), false);
  c.M.add("chair-office", mat("#2d3a4a"), boxGeo(0.5, 0.1, 0.5, 0, 0.5, 0.65).rotateY(rot).translate(x, 0, z));
  c.M.add("chair-office", mat("#2d3a4a"), boxGeo(0.5, 0.6, 0.08, 0, 0.85, 0.9).rotateY(rot).translate(x, 0, z));
  c.col.addBox(x, z, Math.abs(Math.cos(rot)) * 1.6 + Math.abs(Math.sin(rot)) * 0.8, Math.abs(Math.sin(rot)) * 1.6 + Math.abs(Math.cos(rot)) * 0.8);
}
function sign(c: Ctx, text: string, x: number, y: number, z: number, w: number, bg: string, fg: string, rotY = 0) {
  wallPanel(c, textTexture(text, { bg, fg, w: 512, h: 128 }), x, y, z, w, w / 4, rotY);
}

// ---------------------------------------------------------------------------
// Rooms

const B: Record<string, () => Interior> = {
  "sunny-cup": () => room("sunny-cup", 16, 12, "#c89b6d", "#fbe8cf", (c) => {
    counter(c, -2, -3.2, 7, 1.1, "#8a5a3c", "#e8d9c2");
    c.M.add("espresso", mat("#c0c4c8"), boxGeo(1.1, 0.7, 0.6, -4.2, 1.45, -3.4));
    c.M.add("espresso", mat("#2b2b2b"), boxGeo(1.12, 0.12, 0.62, -4.2, 1.85, -3.4));
    c.M.add("register", mat("#34495e"), boxGeo(0.5, 0.35, 0.4, 0.6, 1.25, -3.1));
    // pastry case
    c.M.add("pastry-glass", mat("#dff3fb", { transparent: 0.35 }), boxGeo(2.2, 0.55, 0.9, -1.6, 1.36, -3.1), false);
    for (let i = 0; i < 6; i++) c.M.add("pastry", mat(["#e0a45e", "#8a4b2a", "#f2d49b"][i % 3], { flat: true }), new THREE.SphereGeometry(0.12, 6, 4).scale(1.4, 0.6, 1).translate(-2.4 + i * 0.32, 1.2, -3.1), false);
    wallPanel(c, menuBoard(["                    small · medium · large|", "Latte|$4.25 · 4.75 · 5.25", "Cappuccino|$4.00 · 4.50 · 5.00", "Americano|$3.00 · 3.50 · 4.00", "Mocha|$4.75 · 5.25 · 5.75", "Drip Coffee|$2.50 · 3.00 · 3.50", "Hot Chocolate|$3.50 · 4.00 · 4.50", "Espresso · Flat White|$2.75 · $4.50", "Tea (black, green, mint, chamomile)|$3.00", "Oat, almond or soy milk|+$0.75", "Iced drinks|+$0.50"], "SUNNY CUP · DRINKS"), -3.6, 2.75, -c.d / 2 + 0.2, 4.2, 3.2);
    wallPanel(c, menuBoard(["Croissant|$3.25", "Muffin (blueberry, chocolate)|$3.50", "Cinnamon Roll|$3.75", "Bagel|$3.00", "Cookie|$2.50", "Turkey Sandwich|$7.25"], "FOOD"), 0.9, 2.75, -c.d / 2 + 0.2, 3.2, 2);
    sign(c, "Wi-Fi: SunnyCup · password: sunnycup22", 4.8, 2.9, -c.d / 2 + 0.2, 3.4, "#fff8e8", "#8a5a3c");
    for (const [tx, tz] of [[3, 0.5], [5.8, -1.8], [5.8, 2.6], [-5.6, 1.5], [0.4, 3]]) table(c, tx, tz, { round: true, cloth: "#f7f1e6", chairs: 2, chairColor: "#e8743b" });
    windowBack(c, 5.2, 3.8);
    plant(c, -7.2, -5.2); plant(c, 7.2, 5, 0.8);
    lamp(c, -3, -1.5); lamp(c, 0, -1.5); lamp(c, 3.6, 0.8);
    rug(c, 0, 1, 6, 3.5, "#e8c07a");
  }, [{ npc: "mia", x: -1.2, z: -4.2, rot: 0 }], { floorKind: "wood", accent: "#8a5a3c", warm: true }),

  trattoria: () => room("trattoria", 18, 14, "#a8745a", "#f4e1c8", (c) => {
    c.M.add("host-stand", mat("#5a3a2a"), boxGeo(0.9, 1.1, 0.6, -5.5, 0.55, 4.2)); c.col.addBox(-5.5, 4.2, 0.9, 0.6);
    for (const [tx, tz] of [[-4, -3], [0, -3], [4, -3], [-4, 1], [4, 1], [0, 1.5], [6.5, -0.8]]) table(c, tx, tz, { cloth: "#c0392b", chairs: 2, w: 1.1, d: 1.1 });
    for (const [tx, tz] of [[-4, -3], [0, -3], [4, -3], [-4, 1], [4, 1], [0, 1.5]]) c.M.add("candle", mat("#fff3c4", { emissive: "#c99a2e" }), cylGeo(0.04, 0.04, 0.18, tx, 0.88, tz, 6), false);
    shelf(c, 7.4, -5.8, 3, 2.4, "#5a3a2a", ["#6b1d2a", "#8a2b3a", "#2e4a2e"], 0, 0.45);
    c.M.add("kitchen-door", mat("#5a3a2a"), boxGeo(1.6, 2.6, 0.12, -7, 1.3, -c.d / 2 + 0.1));
    wallPanel(c, textTexture("Buon appetito!", { bg: "#2e6b3a", fg: "#fff8e8", script: true }), 0, 3.2, -c.d / 2 + 0.2, 4, 1);
    wallPanel(c, menuBoard(["Minestrone|$7", "Caesar Salad|$9", "Spaghetti Bolognese|$16", "Mushroom Risotto|$17", "Grilled Salmon|$22", "Steak & Fries|$26", "Burger|$15", "Tiramisu|$8", "Chocolate Cake|$8"], "TODAY'S MENU"), 4.8, 2.8, -c.d / 2 + 0.2, 3.6, 2.25);
    framedArt(c, 5, -4, 2.6, -c.d / 2 + 0.2, 1.6, 1.2);
    lamp(c, -4, -3); lamp(c, 0, -3); lamp(c, 4, -3); lamp(c, 0, 1.5);
    plant(c, -8, 5.5); plant(c, 8, 5.5);
  }, [{ npc: "marco_host", x: -5.5, z: 3.2, rot: Math.PI / 2 }, { npc: "marco", x: 2, z: -1, rot: Math.PI / 2 }], { floorKind: "wood", accent: "#5a3a2a", warm: true }),

  threads: () => room("threads", 16, 12, "#e9e3da", "#f3eef8", (c) => {
    const clothes = ["#e45b4f", "#4a7bb7", "#f2c14e", "#6fbf73", "#f4f4f4", "#3d3d46", "#b5838d", "#f28c28"];
    for (const [rx, rz] of [[-4, -1], [-4, 2.5], [1, 0.5], [1, 3.4]]) {
      c.M.add("rack", mat("#9aa5ad"), boxGeo(2.4, 0.05, 0.05, rx, 1.6, rz));
      for (const s of [-1.1, 1.1]) c.M.add("rack", mat("#9aa5ad"), cylGeo(0.03, 0.03, 1.6, rx + s, 0.8, rz, 6));
      for (let i = 0; i < 7; i++) c.M.add("cloth-" + clothes[i % 8], mat(clothes[(i + Math.round(rx)) % 8]), boxGeo(0.08, 0.8, 0.55, rx - 1 + i * 0.33, 1.15, rz), false);
      c.col.addBox(rx, rz, 2.6, 0.7);
    }
    shelf(c, -2, -5.7, 6, 2.2, "#f4f4f4", clothes, 0, 0.5);
    counter(c, 4.6, -3.6, 3.4, 1, "#6b4a8a", "#f4f1ea");
    // fitting rooms
    for (const fx of [5.8, 7.2]) {
      c.M.add("fitting", mat("#8e6bb0"), boxGeo(1.3, 2.4, 0.06, fx, 1.3, 3.6), false);
      c.M.add("fitting-wall", mat("#dcd2e8"), boxGeo(0.06, 2.4, 2.2, fx - 0.65, 1.3, 4.6), false);
    }
    c.col.addBox(6.5, 4.6, 2.9, 2.2);
    sign(c, "Fitting Rooms", 6.5, 2.9, 3.55, 2.4, "#ffffff", "#6b4a8a");
    c.M.add("mirror-frame", mat("#6b4a8a"), boxGeo(0.05, 2.2, 1.2, c.w / 2 - 0.04, 1.3, -1), false);
    c.M.add("mirror", mat("#dfeef6", { emissive: "#6f8a99" }), boxGeo(0.06, 2, 1, c.w / 2 - 0.08, 1.3, -1), false);
    sign(c, "SALE 20% OFF", -4, 3.2, -c.d / 2 + 0.2, 3, "#e45b4f", "#ffffff");
    plant(c, -7.2, 5.2);
  }, [{ npc: "chloe", x: 4.4, z: -4.6, rot: 0 }], { floorKind: "wood", accent: "#6b4a8a" }),

  pharmacy: () => room("pharmacy", 14, 12, "#e8ecef", "#f4faf7", (c) => {
    const goods = ["#ffffff", "#e45b4f", "#4a7bb7", "#6fbf73", "#f2c14e", "#b5838d"];
    shelf(c, -4.5, -0.5, 4, 1.9, "#f4f4f4", goods, 0, 0.6);
    shelf(c, -4.5, 2.8, 4, 1.9, "#f4f4f4", goods, 0, 0.6);
    shelf(c, 5.9, 1, 4, 2.2, "#f4f4f4", goods, Math.PI / 2, 0.5);
    counter(c, 1, -3.8, 5, 1, "#2e8b57", "#f4f4f4");
    shelf(c, 1, -5.7, 5, 2.4, "#ffffff", goods, 0, 0.4);
    sign(c, "PHARMACY · Prescriptions", 1, 3.3, -c.d / 2 + 0.2, 4.4, "#2e8b57", "#ffffff");
    c.M.add("cross", mat("#3cc46b", { emissive: "#1a6b3a" }), boxGeo(0.9, 0.3, 0.06, -5.2, 3.2, -c.d / 2 + 0.2), false);
    c.M.add("cross", mat("#3cc46b", { emissive: "#1a6b3a" }), boxGeo(0.3, 0.9, 0.06, -5.2, 3.2, -c.d / 2 + 0.2), false);
    plant(c, 6, 5.2, 0.8);
  }, [{ npc: "okafor", x: 1, z: -4.8, rot: 0 }], { floorKind: "tile", accent: "#2e8b57" }),

  salon: () => room("salon", 12, 10, "#f0e6e8", "#fdf0f4", (c) => {
    for (const sx of [-3, 1]) {
      c.M.add("salon-chair", mat("#2b2b2b"), boxGeo(0.7, 0.5, 0.7, sx, 0.55, -2.6));
      c.M.add("salon-chair", mat("#2b2b2b"), boxGeo(0.7, 0.8, 0.12, sx, 1.1, -2.2));
      c.M.add("salon-base", mat("#9aa5ad"), cylGeo(0.3, 0.35, 0.3, sx, 0.15, -2.6, 10));
      c.M.add("mirror", mat("#dfeef6", { emissive: "#6f8a99" }), boxGeo(1.2, 1.6, 0.05, sx, 1.9, -c.d / 2 + 0.05), false);
      c.M.add("mirror-frame", mat("#c94f7c"), boxGeo(1.35, 1.75, 0.03, sx, 1.9, -c.d / 2 + 0.02), false);
      c.col.addBox(sx, -2.5, 0.8, 0.8);
    }
    c.M.add("sink", mat("#f4f4f4"), boxGeo(1, 0.9, 0.7, 4.4, 0.45, -3.8)); c.col.addBox(4.4, -3.8, 1, 0.7);
    counter(c, -4.2, 2.8, 2.2, 0.9, "#c94f7c", "#f7f1f3");
    sofa(c, 3.8, 3.2, "#f2c1d1", Math.PI, 2);
    plant(c, 5.2, 0.5, 0.8);
    sign(c, "Snip & Style", 0, 3.4, -c.d / 2 + 0.2, 3.2, "#c94f7c", "#ffffff");
  }, [{ npc: "jessie", x: -1.9, z: -2.3, rot: 0 }], { floorKind: "tile", accent: "#c94f7c" }),

  bank: () => room("bank", 16, 12, "#d9d2c3", "#efe9dd", (c) => {
    counter(c, 0, -3.8, 10, 1.1, "#1f4f8a", "#e6e2d6");
    for (const gx of [-3.3, 0, 3.3]) c.M.add("teller-glass", mat("#dff3fb", { transparent: 0.3 }), boxGeo(3, 1.2, 0.05, gx, 1.7, -3.3), false);
    for (const gx of [-1.65, 1.65]) c.M.add("teller-div", mat("#1f4f8a"), boxGeo(0.08, 1.2, 1, gx, 1.7, -3.8), false);
    for (let i = -3; i <= 3; i++) c.M.add("queue-post", mat("#c9a227"), cylGeo(0.05, 0.08, 1, i * 1.2, 0.5, 0.8, 8));
    c.M.add("queue-rope", mat("#8a1f2a"), boxGeo(7.2, 0.06, 0.06, 0, 0.9, 0.8), false);
    c.col.addBox(0, 0.8, 7.4, 0.3);
    c.M.add("form-desk", mat("#e6e2d6"), boxGeo(2, 1.1, 0.8, -6, 0.55, 2.5)); c.col.addBox(-6, 2.5, 2, 0.8);
    sign(c, "Harbor Bank · Since 1912", 0, 3.3, -c.d / 2 + 0.2, 4.6, "#1f4f8a", "#ffffff");
    plant(c, 7, -5, 1); plant(c, 7, 5, 0.9);
  }, [{ npc: "aaron", x: 0, z: -4.8, rot: 0 }], { floorKind: "stone", accent: "#1f4f8a" }),

  "post-office": () => room("post-office", 14, 11, "#d8dde6", "#eef2f8", (c) => {
    counter(c, 0, -3.4, 7, 1.1, "#2c4f8f", "#eef2f8");
    c.M.add("scale", mat("#9aa5ad"), boxGeo(0.6, 0.12, 0.5, 2.2, 1.15, -3.3));
    for (let i = 0; i < 6; i++) c.M.add("parcel", mat(["#c8a27a", "#b38b5d"][i % 2]), boxGeo(0.5 + (i % 3) * 0.15, 0.4, 0.5, -3 + (i % 3) * 0.7, 0.2 + Math.floor(i / 3) * 0.4, -5.1), true);
    // P.O. boxes on the west wall
    c.M.add("po-wall", mat("#8a7340"), boxGeo(0.06, 2.3, 3.6, -c.w / 2 + 0.05, 1.7, -1.63), false);
    for (let i = 0; i < 6; i++) for (let k = 0; k < 4; k++) c.M.add("po-box", mat("#c9a227"), boxGeo(0.05, 0.4, 0.45, -c.w / 2 + 0.1, 1 + k * 0.5, -3 + i * 0.55), false);
    sign(c, "UNITED STATES POSTAL SERVICE", 0, 3.3, -c.d / 2 + 0.2, 5.4, "#2c4f8f", "#ffffff");
    for (let i = -2; i <= 2; i++) c.M.add("queue-post", mat("#9aa5ad"), cylGeo(0.05, 0.08, 1, i * 1.2, 0.5, 0.6, 8));
    c.col.addBox(0, 0.6, 5, 0.3);
  }, [{ npc: "gloria", x: 0, z: -4.4, rot: 0 }], { floorKind: "tile", accent: "#2c4f8f" }),

  hotel: () => room("hotel", 22, 16, "#b89f86", "#f3e8d8", (c) => {
    counter(c, 0, -4.6, 7, 1.2, "#7d5a44", "#e9d8c4");
    c.M.add("bell", mat("#c9a227"), new THREE.SphereGeometry(0.1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).translate(1.5, 1.1, -4.4));
    for (let i = 0; i < 12; i++) c.M.add("key-slot", mat("#c9a227"), boxGeo(0.25, 0.3, 0.05, -2 + (i % 6) * 0.8, 2 + Math.floor(i / 6) * 0.45, -c.d / 2 + 0.1), false);
    sign(c, "Harborview Hotel · Reception", 0, 3.4, -c.d / 2 + 0.2, 5, "#8a2f3b", "#fff8e8");
    // elevators on the east wall
    for (const ez of [-3, 0]) {
      c.M.add("elevator", mat("#c0c4c8"), boxGeo(0.08, 2.6, 1.6, c.w / 2 - 0.05, 1.3, ez), false);
      c.M.add("elevator-line", mat("#8a8f94"), boxGeo(0.1, 2.6, 0.04, c.w / 2 - 0.06, 1.3, ez), false);
    }
    wallPanel(c, textTexture("Elevators", { bg: "#fff8e8", fg: "#7d5a44", w: 256, h: 64 }), c.w / 2 - 0.1, 3, -1.5, 1.6, 0.4, -Math.PI / 2);
    sofa(c, -7, 2, "#2d5d5b", Math.PI / 2); sofa(c, -4, 4.8, "#2d5d5b", Math.PI);
    table(c, -5, 2.4, { round: true, cloth: "#7d5a44", chairs: 0 });
    rug(c, -5.5, 3, 5, 4, "#8a2f3b");
    rug(c, 0, 1, 3, 9, "#b5452f");
    plant(c, -10, -6.5, 1.2); plant(c, 10, 6.5, 1); plant(c, 3.6, -5.2, 0.8);
    lamp(c, 0, -2, 3.2); lamp(c, -5, 3, 3.2);
    framedArt(c, 1, -7, 2.4, -c.d / 2 + 0.2, 2.2, 1.5);
  }, [{ npc: "olivia", x: 0, z: -5.6, rot: 0 }], { floorKind: "stone", accent: "#7d5a44", warm: true }),

  "visitor-center": () => room("visitor-center", 14, 12, "#b8c9b0", "#f1f6ec", (c) => {
    counter(c, 0, -3.3, 5, 1, "#2f6b4f", "#f4f1ea");
    for (const bx of [-5.5, -4]) shelf(c, bx, -1, 1.2, 1.8, "#9c6b43", ["#e45b4f", "#4a7bb7", "#f2c14e", "#6fbf73"], Math.PI / 2, 0.5);
    sign(c, "Welcome to Maple Harbor!", 0, 3.4, -c.d / 2 + 0.2, 5, "#2f6b4f", "#fff8e8");
    // big town map on the back wall is set by the game (uses the ground texture)
    c.g.userData.mapSpot = { x: 4.2, y: 2.2, z: -c.d / 2 + 0.2, w: 3.8, h: 2.6 };
    wallPanel(c, textTexture("Jazz Night · Friday 8 PM", { bg: "#2b2d6e", fg: "#ffd166", w: 512, h: 160 }), -4.5, 2.6, -c.d / 2 + 0.2, 2.6, 0.8);
    plant(c, 6, 5, 0.9); plant(c, -6, 5, 0.9);
  }, [{ npc: "chuck", x: 0, z: -4.2, rot: 0 }], { floorKind: "wood", accent: "#2f6b4f" }),

  museum: () => room("museum", 26, 20, "#d7d0c4", "#f7f4ee", (c) => {
    counter(c, -7, 3.5, 4, 1, "#9c8f7a", "#f7f4ee");
    sign(c, "Tickets · Audio Guides", -7, 2.3, 2.96, 3, "#2b2d6e", "#ffffff");
    for (let i = 0; i < 5; i++) framedArt(c, i + 2, -9 + i * 4.2, 2.3, -c.d / 2 + 0.2, 2.4 + (i % 2) * 0.6, 1.7);
    for (let i = 0; i < 3; i++) framedArt(c, i + 9, -c.w / 2 + 0.2, 2.3, -5 + i * 4, 2.2, 1.6, Math.PI / 2);
    // partition with the new exhibition
    c.M.add("partition", mat("#2b2d6e"), boxGeo(0.3, 3.2, 7, 6, 1.6, -3)); c.col.addBox(6, -3, 0.4, 7);
    for (let i = 0; i < 2; i++) framedArt(c, 3 * (i + 1), 6.2, 2, -5 + i * 3.5, 1.8, 1.4, Math.PI / 2);
    wallPanel(c, textTexture("The Colors of the Night", { bg: "#2b2d6e", fg: "#ffd166", w: 768, h: 128 }), 6.18, 3.5, -3, 3.4, 0.56, Math.PI / 2);
    // statue
    c.M.add("plinth", mat("#e7e1d6"), boxGeo(1.2, 1, 1.2, -2, 0.5, -2)); c.col.addBox(-2, -2, 1.3, 1.3);
    c.M.add("statue", mat("#d9d4c7", { flat: true }), new THREE.CapsuleGeometry(0.3, 0.9, 4, 8).translate(-2, 1.9, -2));
    c.M.add("statue", mat("#d9d4c7", { flat: true }), new THREE.SphereGeometry(0.25, 10, 8).translate(-2, 2.8, -2));
    // gift shop corner
    shelf(c, 10.5, 6, 3, 1.8, "#9c8f7a", ["#ffd166", "#2b2d6e", "#e45b4f"], Math.PI / 2, 0.5);
    sign(c, "Gift Shop", 10.5, 2.6, 7.5, 2, "#ffd166", "#2b2d6e", Math.PI);
    for (const x of [-9, -4.8, -0.6, 3.6]) c.M.add("rope-post", mat("#c9a227"), cylGeo(0.05, 0.08, 1, x, 0.5, -c.d / 2 + 1.6, 8));
    c.M.add("rope", mat("#8a1f2a"), boxGeo(12.6, 0.06, 0.06, -2.7, 0.9, -c.d / 2 + 1.6), false);
    c.col.addBox(-2.7, -c.d / 2 + 1.6, 12.6, 0.3);
    lamp(c, -6, -6); lamp(c, 0, -6); lamp(c, 6, 3);
  }, [{ npc: "ben", x: -7, z: 2.5, rot: Math.PI }, { npc: "harold", x: 2.5, z: -6.5, rot: 0.4 }], { floorKind: "stone", accent: "#9c8f7a" }),

  station: () => room("station", 26, 18, "#c8b8a0", "#efe3d0", (c) => {
    counter(c, -6, -6, 6, 1.1, "#7a2e2e", "#efe3d0");
    for (const gx of [-7.5, -4.5]) c.M.add("ticket-glass", mat("#dff3fb", { transparent: 0.3 }), boxGeo(2.8, 1.3, 0.05, gx, 1.75, -5.5), false);
    sign(c, "TICKETS", -6, 3.4, -c.d / 2 + 0.2, 3, "#7a2e2e", "#fff8e8");
    const board = document.createElement("canvas"); board.width = 1024; board.height = 512;
    const x = board.getContext("2d")!;
    x.fillStyle = "#101418"; x.fillRect(0, 0, 1024, 512);
    x.fillStyle = "#ffd166"; x.font = "800 48px monospace"; x.fillText("DEPARTURES", 30, 64);
    x.font = "600 40px monospace";
    [["7:15", "SEASIDE", "TRACK 4", "DELAYED"], ["8:05", "PORTLAND", "TRACK 2", "ON TIME"], ["9:10", "SEASIDE", "TRACK 4", "ON TIME"], ["9:40", "BOSTON", "TRACK 1", "ON TIME"], ["10:25", "SEASIDE", "TRACK 3", "ON TIME"]].forEach((row, i) => {
      x.fillStyle = row[3] === "DELAYED" ? "#ff7b72" : "#e6edf3";
      x.fillText(row.join("   "), 30, 140 + i * 72);
    });
    const bt = new THREE.CanvasTexture(board); bt.colorSpace = THREE.SRGBColorSpace;
    wallPanel(c, bt, 4, 3, -c.d / 2 + 0.2, 6, 3);
    for (const [bx, bz] of [[-5, 1], [-1, 1], [3, 1], [-5, 4], [3, 4]]) {
      c.M.add("bench", mat("#9c6b43"), boxGeo(3, 0.1, 0.6, bx, 0.5, bz));
      c.M.add("bench", mat("#9c6b43"), boxGeo(3, 0.5, 0.08, bx, 0.8, bz - 0.28));
      c.col.addBox(bx, bz, 3.1, 0.7);
    }
    // bus bay on the east side
    c.M.add("bus", mat("#3d6fb5", { flat: true }), boxGeo(3, 3, 5, 11.4, 1.6, -3.5));
    c.M.add("bus-win", mat("#9ccbe6", { emissive: "#1b3a4c" }), boxGeo(3.02, 1, 4, 11.4, 2.2, -3.5), false);
    c.M.add("bus-door", mat("#2b2b2b"), boxGeo(0.06, 2.2, 1.2, 9.88, 1.2, -1.6), false);
    c.col.addBox(11.4, -3.5, 3.2, 5.2);
    sign(c, "BUS 12 · DOWNTOWN", 11.4, 3.4, -0.95, 3, "#3d6fb5", "#ffffff");
    for (let i = 0; i < 4; i++) lamp(c, -8 + i * 5, 0, 3.3);
  }, [{ npc: "walter", x: -6, z: -7, rot: 0 }, { npc: "denise", x: 9, z: -1.2, rot: -Math.PI / 2 }], { floorKind: "stone", accent: "#7a2e2e" }),

  airport: () => room("airport", 44, 26, "#d7dde3", "#f2f5f8", (c) => {
    // arrivals (west): passport booths, carousel, baggage desk
    for (const bx of [-16, -12]) {
      c.M.add("booth", mat("#2b5d8a"), boxGeo(2.2, 1.2, 1.4, bx, 0.6, -7.5));
      c.M.add("booth-glass", mat("#dff3fb", { transparent: 0.35 }), boxGeo(2.2, 1, 0.05, bx, 1.7, -6.8), false);
      c.col.addBox(bx, -7.5, 2.2, 1.4);
    }
    sign(c, "Passport Control · U.S. Citizens | All Passports", -14, 3.8, -c.d / 2 + 0.2, 7, "#2b5d8a", "#ffffff");
    // baggage carousel
    c.M.add("carousel", mat("#5a646e"), boxGeo(8, 0.7, 2.2, -14, 0.35, 2.5));
    c.M.add("carousel-belt", mat("#2b2f33"), boxGeo(8.2, 0.05, 2.4, -14, 0.72, 2.5), false);
    for (let i = 0; i < 5; i++) c.M.add("suitcase-" + i, mat(["#e45b4f", "#4a7bb7", "#3d3d46", "#6fbf73", "#f2c14e"][i]), boxGeo(0.7, 0.45, 0.5, -17 + i * 1.5, 0.95, 2.1 + (i % 2) * 0.8));
    c.col.addBox(-14, 2.5, 8.2, 2.4);
    sign(c, "Baggage Claim · Flight 223", -14, 2.6, 4.2, 3.6, "#2b5d8a", "#ffffff");
    counter(c, -4, -8.2, 4, 1, "#e05a47", "#f2f5f8");
    sign(c, "Baggage Services", -4, 3.1, -c.d / 2 + 0.2, 3.2, "#e05a47", "#ffffff");
    // departures (east): check-in, security, gate
    counter(c, 6, -8.2, 6, 1, "#1d3f73", "#f2f5f8");
    sign(c, "Check-in · Harbor Air", 6, 3.1, -c.d / 2 + 0.2, 4, "#1d3f73", "#ffffff");
    c.M.add("scale", mat("#9aa5ad"), boxGeo(1, 0.2, 0.8, 8.6, 0.1, -7.2));
    // security
    c.M.add("arch", mat("#c0c4c8"), boxGeo(0.25, 2.4, 1, 13.2, 1.2, -1));
    c.M.add("arch", mat("#c0c4c8"), boxGeo(0.25, 2.4, 1, 14.8, 1.2, -1));
    c.M.add("arch", mat("#c0c4c8"), boxGeo(1.85, 0.3, 1, 14, 2.4, -1));
    c.M.add("conveyor", mat("#3a3f45"), boxGeo(1, 0.9, 5, 11.6, 0.45, -1)); c.col.addBox(11.6, -1, 1, 5);
    c.M.add("bin", mat("#8a939b"), boxGeo(0.7, 0.2, 0.5, 11.6, 1.0, -2.5));
    c.col.addBox(13.2, -1, 0.3, 1); c.col.addBox(14.8, -1, 0.3, 1);
    sign(c, "Security", 14, 3.6, -c.d / 2 + 0.2, 2.6, "#34495e", "#ffffff");
    // gate
    counter(c, 18.5, -8.4, 3, 0.9, "#1d3f73", "#f2f5f8");
    sign(c, "Gate 8 · Flight 223 to Boston", 18.5, 3.1, -c.d / 2 + 0.2, 4.4, "#1d3f73", "#ffd166");
    for (const [sx, sz] of [[17, 1], [20, 1], [17, 4], [20, 4]]) {
      c.M.add("seats", mat("#2b5d8a"), boxGeo(2.4, 0.45, 0.6, sx, 0.45, sz));
      c.M.add("seats", mat("#2b5d8a"), boxGeo(2.4, 0.6, 0.1, sx, 0.85, sz - 0.3));
      c.col.addBox(sx, sz, 2.5, 0.7);
    }
    // windows with a plane outside
    for (const wx of [-18, -8, 2, 12, 20]) windowBack(c, wx, 5, 2.4, 2.1, "#bfe3f7");
    c.M.add("partition", mat("#c9d3dc"), boxGeo(0.3, 2.2, 6, 1, 1.1, 3)); c.col.addBox(1, 3, 0.4, 6);
    sign(c, "← Arrivals · Departures →", 1, 2.6, 6.2, 3.4, "#ffd166", "#1d3f73", 0);
    plant(c, -20.5, 11, 1.2); plant(c, 20.5, 11, 1.2); plant(c, -1, -11.5, 1);
    for (let i = 0; i < 6; i++) lamp(c, -18 + i * 7, -2, 3.6);
  }, [
    { npc: "diaz", x: -14, z: -8.7, rot: 0 },
    { npc: "priya", x: -4, z: -9.3, rot: 0 },
    { npc: "kevin", x: 6, z: -9.3, rot: 0 },
    { npc: "grant", x: 15.8, z: 0.4, rot: -Math.PI / 2 },
    { npc: "nina", x: 18.5, z: -9.4, rot: 0 },
  ], { floorKind: "tile", accent: "#2b5d8a" }),

  "car-rental": () => room("car-rental", 14, 10, "#dfe7e3", "#f1f8f5", (c) => {
    counter(c, 0, -2.8, 5, 1, "#1f8a70", "#f4f4f4");
    wallPanel(c, textTexture("Harbor Car Rental · Keys", { bg: "#1f8a70", fg: "#ffffff", w: 768, h: 128 }), 0, 3.3, -c.d / 2 + 0.2, 4.4, 0.72);
    for (let i = 0; i < 8; i++) c.M.add("key", mat("#c9a227"), boxGeo(0.1, 0.25, 0.04, -1.5 + i * 0.42, 2.3, -c.d / 2 + 0.1), false);
    for (const [px, cc] of [[-4.5, "#e45b4f"], [4.5, "#4a7bb7"]] as [number, string][]) wallPanel(c, textTexture("🚗", { bg: cc, fg: "#fff", w: 256, h: 256 }), px, 2.4, -c.d / 2 + 0.2, 1.8, 1.8);
    sofa(c, -4.5, 2.5, "#1f8a70", 0, 2);
    plant(c, 5.8, 3.6, 0.9);
  }, [{ npc: "jake", x: 0, z: -3.8, rot: 0 }], { floorKind: "tile", accent: "#1f8a70" }),

  "gas-station": () => room("gas-station", 14, 10, "#dcdcd6", "#f6f1ea", (c) => {
    counter(c, -3, -2.8, 4, 1, "#d94b3d", "#f4f4f4");
    c.M.add("register", mat("#34495e"), boxGeo(0.5, 0.35, 0.4, -2.2, 1.25, -2.6));
    const snacks = ["#e45b4f", "#f2c14e", "#4a7bb7", "#6fbf73", "#f28c28", "#b5838d"];
    shelf(c, 2, 0, 4, 1.6, "#f4f4f4", snacks, 0, 0.8);
    shelf(c, 2, 2.8, 4, 1.6, "#f4f4f4", snacks, 0, 0.8);
    c.M.add("fridge", mat("#dff3fb", { transparent: 0.6 }), boxGeo(3.4, 2.3, 0.8, 4.5, 1.15, -4.4)); c.col.addBox(4.5, -4.4, 3.4, 0.8);
    for (let i = 0; i < 15; i++) c.M.add("drink-" + snacks[i % 6], mat(snacks[i % 6]), cylGeo(0.08, 0.08, 0.3, 3.1 + (i % 5) * 0.7, 0.5 + Math.floor(i / 5) * 0.7, -4.3, 6), false);
    c.M.add("coffee-machine", mat("#2b2b2b"), boxGeo(0.8, 1, 0.6, -6, 1.5, -4.5));
    c.M.add("coffee-table", mat("#9c6b43"), boxGeo(1.6, 1, 0.8, -6, 0.5, -4.5)); c.col.addBox(-6, -4.5, 1.6, 0.8);
    wallPanel(c, textTexture("Gas & Go · Pay here", { bg: "#d94b3d", fg: "#ffffff", w: 768, h: 128 }), -3, 3.3, -c.d / 2 + 0.2, 4, 0.66);
  }, [{ npc: "dot", x: -3, z: -3.8, rot: 0 }], { floorKind: "tile", accent: "#d94b3d" }),

  police: () => room("police", 12, 10, "#c9ced6", "#eef1f5", (c) => {
    counter(c, 0, -2.6, 5, 1.1, "#2a3f66", "#e6e9ee");
    c.M.add("glass", mat("#dff3fb", { transparent: 0.3 }), boxGeo(5, 1.1, 0.05, 0, 1.65, -2.1), false);
    wallPanel(c, textTexture("Maple Harbor Police · Front Desk", { bg: "#2a3f66", fg: "#ffffff", w: 768, h: 128 }), 0, 3.3, -c.d / 2 + 0.2, 4.6, 0.77);
    wallPanel(c, textTexture("EMERGENCY? CALL 911", { bg: "#c62828", fg: "#ffffff", w: 512, h: 128 }), -4.2, 2.3, -c.d / 2 + 0.2, 2.4, 0.6);
    c.M.add("bench", mat("#9c6b43"), boxGeo(2.6, 0.1, 0.6, -3.6, 0.5, 2.8)); c.col.addBox(-3.6, 2.8, 2.7, 0.7);
    c.M.add("flag", mat("#b22234"), boxGeo(0.9, 0.6, 0.02, 4.8, 2.4, -c.d / 2 + 0.15), false);
    plant(c, 5, 3.6, 0.9);
  }, [{ npc: "reyes", x: 0, z: -3.6, rot: 0 }], { floorKind: "tile", accent: "#2a3f66" }),

  apartments: () => room("apartments", 20, 14, "#b58b62", "#f5efe6", (c) => {
    // hallway (west) with Rita's door, and the vacant apartment (east)
    c.M.add("divider", mat("#e6dccd"), boxGeo(0.25, WALL_H, 8.5, -3, WALL_H / 2, -2.75)); c.col.addBox(-3, -2.75, 0.4, 8.5);
    c.M.add("door-rita", mat("#8a5a44"), boxGeo(1.2, 2.4, 0.08, -7, 1.2, -c.d / 2 + 0.06), false);
    wallPanel(c, textTexture("2C", { bg: "#c9a227", fg: "#3b2a20", w: 128, h: 96 }), -7, 2.7, -c.d / 2 + 0.2, 0.5, 0.36);
    c.M.add("door-2b", mat("#8a5a44"), boxGeo(0.08, 2.4, 1.2, -3.1, 1.2, 2.6), false);
    wallPanel(c, textTexture("Hallway · 2nd floor", { bg: "#fff8ec", fg: "#8a5a44", w: 512, h: 96 }), -7, 3.4, -c.d / 2 + 0.2, 2.4, 0.45);
    plant(c, -9.2, 5.5, 0.8);
    // the apartment for rent (bright, some furniture)
    windowBack(c, 3, 3.4); windowBack(c, 7.5, 2.2);
    sofa(c, 5, 1.8, "#9aa5ad", Math.PI);
    table(c, 5, -1.2, { cloth: "#e8e2d6", chairs: 0, w: 1.2, d: 0.7 });
    c.M.add("kitchen", mat("#f4f4f4"), boxGeo(4, 1, 0.7, 5, 0.5, -6.6)); c.col.addBox(5, -6.6, 4, 0.7);
    c.M.add("fridge", mat("#e6e9ee"), boxGeo(0.9, 2, 0.8, 8.6, 1, -6.5)); c.col.addBox(8.6, -6.5, 0.9, 0.8);
    c.M.add("radiator", mat("#ffffff"), boxGeo(1.6, 0.7, 0.2, 0.5, 0.45, -6.8));
    c.M.add("boxes", mat("#c8a27a"), boxGeo(0.8, 0.6, 0.6, 1, 0.3, 4.5)); c.col.addBox(1, 4.5, 0.8, 0.6);
    rug(c, 5, 1, 4, 3, "#c9785b");
    wallPanel(c, textTexture("FOR RENT · 2B", { bg: "#ffffff", fg: "#c9785b", w: 512, h: 128 }), 5, 3.5, -c.d / 2 + 0.2, 2.6, 0.65);
  }, [{ npc: "rita", x: -7, z: -5.2, rot: 0 }, { npc: "patel", x: 3, z: -2.6, rot: Math.PI / 4 }], { floorKind: "wood", accent: "#8a5a44" }),

  "dans-house": () => room("dans-house", 16, 12, "#a67c52", "#f7ecdc", (c) => {
    table(c, 1.5, -1.5, { cloth: "#f2efe8", chairs: 4, w: 2.6, d: 1.2 });
    for (let i = 0; i < 4; i++) c.M.add("plate", mat("#ffffff"), cylGeo(0.2, 0.2, 0.02, 0.6 + i * 0.6, 0.8, -1.5 + (i % 2 ? 0.3 : -0.3), 12), false);
    c.M.add("lasagna", mat("#d9763a", { flat: true }), boxGeo(0.6, 0.12, 0.4, 1.5, 0.86, -1.5), false);
    c.M.add("vase", mat("#4a7bb7"), cylGeo(0.1, 0.12, 0.3, 2.6, 0.95, -1.5, 8), false);
    for (let i = 0; i < 5; i++) c.M.add("flowers", mat(["#e84a5f", "#ffd166", "#f7a072"][i % 3], { flat: true }), new THREE.SphereGeometry(0.07, 6, 4).translate(2.52 + (i % 3) * 0.08, 1.2 + (i % 2) * 0.06, -1.55 + (i % 2) * 0.08), false);
    c.M.add("kitchen", mat("#f4f4f4"), boxGeo(4, 1, 0.7, 5.2, 0.5, -5.3)); c.col.addBox(5.2, -5.3, 4, 0.7);
    c.M.add("stove", mat("#2b2b2b"), boxGeo(0.9, 0.05, 0.6, 4.2, 1.03, -5.3), false);
    sofa(c, -5, 2.5, "#b5452f", 0, 2.4);
    rug(c, -5, 1.2, 3.4, 2.4, "#e8c07a");
    framedArt(c, 7, -5, 2.4, -c.d / 2 + 0.2, 1.8, 1.3);
    framedArt(c, 11, -1.5, 2.6, -c.d / 2 + 0.2, 1.2, 1);
    lamp(c, 1.5, -1.5, 3.1);
    plant(c, -7.2, -5.2, 1);
    c.M.add("coat-rack", mat("#5a3a2a"), cylGeo(0.05, 0.08, 1.8, -2.5, 0.9, 5, 6));
  }, [{ npc: "dan", x: -1, z: 2.8, rot: Math.PI * 0.85 }, { npc: "nora", x: 4.2, z: -4.3, rot: 0.3 }], { floorKind: "wood", accent: "#6b4a3a", warm: true }),

  office: () => room("office", 22, 16, "#b9c2cc", "#eef3f7", (c) => {
    counter(c, -7.5, 4.2, 3, 0.9, "#34495e", "#e6e9ee");
    wallPanel(c, textTexture("Brightline", { bg: "#34495e", fg: "#ffd166", w: 512, h: 128 }), -7.5, 3.3, -c.d / 2 + 0.2, 3.2, 0.8);
    // interview/meeting room with glass walls (west)
    c.M.add("glass-wall", mat("#dff3fb", { transparent: 0.28 }), boxGeo(0.08, 2.8, 6, -3.2, 1.4, -4.8), false);
    c.M.add("glass-wall", mat("#dff3fb", { transparent: 0.28 }), boxGeo(3.5, 2.8, 0.08, -9.2, 1.4, -1.8), false);
    c.col.addBox(-3.2, -4.8, 0.2, 6); c.col.addBox(-9.2, -1.8, 3.5, 0.2);
    table(c, -7, -5.2, { cloth: "#e9e4da", chairs: 0, w: 2.4, d: 1.2 });
    c.M.add("tv", mat("#1d1d1d"), boxGeo(2.4, 1.3, 0.08, -7, 2.2, -c.d / 2 + 0.1), false);
    // desks (open space)
    for (const [dx, dz] of [[1, -4.5], [4, -4.5], [7, -4.5], [1, -1], [4, -1], [7, -1]]) desk(c, dx, dz);
    // kitchen corner with the coffee machine
    counter(c, 8.5, 5.4, 4, 0.8, "#f4f4f4", "#dfe3ea");
    c.M.add("coffee-machine", mat("#1d1d1d"), boxGeo(0.7, 0.8, 0.5, 7.4, 1.5, 5.4));
    c.M.add("coffee-machine-2", mat("#2e8b57"), boxGeo(0.72, 0.15, 0.52, 7.4, 1.95, 5.4));
    c.M.add("fridge", mat("#e6e9ee"), boxGeo(0.9, 2, 0.8, 10.4, 1, 5.4)); c.col.addBox(10.4, 5.4, 0.9, 0.8);
    wallPanel(c, textTexture("Kitchen", { bg: "#2e8b57", fg: "#ffffff", w: 256, h: 64 }), 8.5, 2.6, 5.8, 1.6, 0.4, Math.PI);
    c.M.add("printer", mat("#d9dde2"), boxGeo(1, 1, 0.7, 10.2, 0.5, -5)); c.col.addBox(10.2, -5, 1, 0.7);
    plant(c, -10.2, 6.8, 1.1); plant(c, 1, 6.8, 0.9);
    for (let i = 0; i < 4; i++) lamp(c, -6 + i * 5, 0, 3.6);
  }, [{ npc: "brooks", x: -7, z: -6.4, rot: 0, sit: true }, { npc: "maria", x: 5.5, z: 2.4, rot: Math.PI }], { floorKind: "carpet", accent: "#34495e" }),

  "the-pier": () => room("the-pier", 18, 14, "#8f6b4e", "#eaf3f7", (c) => {
    for (const wx of [-6, 0, 6]) windowBack(c, wx, 5, 2.6, 2.1, "#8fd3f0");
    for (const [tx, tz] of [[-5, -3.5], [0, -3.5], [5, -3.5], [-5, 1], [5, 1]]) table(c, tx, tz, { round: true, cloth: "#f7f1e6", chairs: 2, chairColor: "#1d4e6b" });
    for (const [tx, tz] of [[-5, -3.5], [0, -3.5], [5, -3.5], [-5, 1], [5, 1]]) c.M.add("candle", mat("#fff3c4", { emissive: "#c99a2e" }), cylGeo(0.04, 0.04, 0.18, tx, 0.88, tz, 6), false);
    counter(c, 0, 3.8, 5, 0.9, "#1d4e6b", "#eaf3f7");
    c.M.add("lifebuoy", mat("#e45b4f"), new THREE.TorusGeometry(0.4, 0.12, 8, 16).rotateY(Math.PI / 2).translate(-c.w / 2 + 0.2, 2.6, 0), false);
    lamp(c, -5, -3.5, 3.2); lamp(c, 0, -3.5, 3.2); lamp(c, 5, -3.5, 3.2);
    plant(c, 8, 5.5, 0.9);
  }, [{ npc: "sam", x: 0.9, z: -3.9, rot: -Math.PI / 2, sit: true }, { npc: "emma", x: 0.9, z: -3.9, rot: -Math.PI / 2, sit: true }], { floorKind: "wood", accent: "#1d4e6b", warm: true }),
};

const cache = new Map<string, Interior>();
export function getInterior(loc: string): Interior | null {
  if (cache.has(loc)) return cache.get(loc)!;
  const b = B[loc];
  if (!b) return null;
  const it = b();
  cache.set(loc, it);
  return it;
}
export const INTERIOR_IDS = Object.keys(B);
