// Interiors: dollhouse-style rooms (back and side walls, a low front wall) seen from the entrance.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Merger, mat, boxGeo, cylGeo, textTexture as plainTextTexture, rand, Colliders, roundRect, colourMerge } from "./util";
import { STYLED } from "../style";
import { busParts, carParts } from "./car";
import * as MX from "./mexican";
import { THEME } from "./theme";
import { floorMaterial, floorColor } from "./styled";

/** `ax/az`: where the player stands to talk (the walk to them, the guidance trail and the situation picker all end
 *  there), when that is not simply in front of the person: across a table, or across a counter, 0.6 m in front of it
 *  (without one, the walk to a clerk goes round the end of the counter to them).
 *  `seat`: the height of the seat top for someone sitting (0.5 m when not given). */
export interface NpcSpot { npc: string; x: number; z: number; rot: number; sit?: boolean; seat?: number; ax?: number; az?: number }
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
  /** small idle animations (Wi-Fi the dog breathing at Sproutly), called every frame while the player is inside */
  update?(t: number, dt: number): void;
}

type Builder = (ctx: Ctx) => void;
interface Ctx { M: Merger; col: Colliders; g: THREE.Group; w: number; d: number; r: () => number; anim: ((t: number, dt: number) => void)[] }

const WALL_H = 4.2;

/** What lies in front of a room's open front wall, where the camera looks past the floor: a doorstep, a pavement with
 *  its kerb, and a strip of street with a dashed line (one mesh). */
function outside(w: number, d: number) {
  const z0 = d / 2 + 0.3, W = w + 24;
  const parts: [THREE.BufferGeometry, THREE.ColorRepresentation][] = [
    [new THREE.BoxGeometry(2.6, 0.08, 0.9).translate(0, 0.0, z0 + 0.45), "#a59f95"], // the doorstep
    [new THREE.PlaneGeometry(W, 4.2).rotateX(-Math.PI / 2).translate(0, -0.04, z0 + 2.1), "#d6d0c3"], // pavement
    [new THREE.BoxGeometry(W, 0.16, 0.3).translate(0, -0.04, z0 + 4.3), "#bdb6a8"], // kerb
    [new THREE.PlaneGeometry(W, 14).rotateX(-Math.PI / 2).translate(0, -0.12, z0 + 11.4), "#5b6067"], // street
  ];
  for (let x = -W / 2 + 1; x < W / 2; x += 4.5) parts.push([new THREE.PlaneGeometry(2.5, 0.16).rotateX(-Math.PI / 2).translate(x + 1.25, -0.1, z0 + 9), "#f2c84b"]);
  // the pavement's slabs
  for (let x = -W / 2; x <= W / 2; x += 1.6) parts.push([new THREE.PlaneGeometry(0.04, 4.2).rotateX(-Math.PI / 2).translate(x, -0.035, z0 + 2.1), "#c5bfb2"]);
  const m = new THREE.Mesh(colourMerge(parts), new THREE.MeshLambertMaterial({ vertexColors: true }));
  m.receiveShadow = true;
  m.name = "outside";
  return m;
}

let shadeMat: THREE.MeshBasicMaterial | null = null;
/** A soft darkening of the floor along the back and side walls (where light reaches less), so a room's floor
 *  meets its walls instead of looking pasted on. One mesh; the gradient is made from numbers. */
function wallShade(w: number, d: number) {
  if (!shadeMat) {
    const H = 32, px = new Uint8Array(H * 4);
    for (let i = 0; i < H; i++) { const v = i / (H - 1); px[i * 4 + 3] = Math.round(255 * v * v); }
    const tex = new THREE.DataTexture(px, 1, H, THREE.RGBAFormat);
    tex.magFilter = tex.minFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    shadeMat = new THREE.MeshBasicMaterial({ map: tex, color: "#2a2018", transparent: true, opacity: 0.32, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  }
  const D = 0.9, y = 0.005;
  const strips = [
    new THREE.PlaneGeometry(w, D).rotateX(-Math.PI / 2).translate(0, y, -d / 2 + D / 2),
    new THREE.PlaneGeometry(d, D).rotateX(-Math.PI / 2).rotateY(Math.PI / 2).translate(-w / 2 + D / 2, y, 0),
    new THREE.PlaneGeometry(d, D).rotateX(-Math.PI / 2).rotateY(-Math.PI / 2).translate(w / 2 - D / 2, y, 0),
  ];
  const m = new THREE.Mesh(mergeGeometries(strips, false)!, shadeMat);
  m.name = "wall-shade";
  m.renderOrder = 1;
  return m;
}

/** This edition's rooms (theme.ts `roomMerge`): every plain colored shape (an opaque Lambert color with no texture and
 *  no glow) goes into one of two vertex-colored meshes, one that casts shadows and one that doesn't, instead of a mesh
 *  per color: the same look (a flat-shaded color keeps its facets) in far fewer draw calls. The rest (glass, lamps,
 *  screens, textures) is merged per material as before. */
class RoomMerger extends Merger {
  private parts: { cast: [THREE.BufferGeometry, THREE.Color][]; still: [THREE.BufferGeometry, THREE.Color][] } = { cast: [], still: [] };
  add(key: string, m: THREE.Material, geo: THREE.BufferGeometry, cast = true, receive = true) {
    const l = m as THREE.MeshLambertMaterial;
    if (!l.isMeshLambertMaterial || l.map || l.transparent || l.vertexColors || l.side !== THREE.FrontSide || l.emissive.getHex() !== 0 || !receive) return super.add(key, m, geo, cast, receive);
    const g = geo.index ? geo.toNonIndexed() : geo;
    if (l.flatShading) { g.deleteAttribute("normal"); g.computeVertexNormals(); } // (each triangle its own normal)
    this.parts[cast ? "cast" : "still"].push([g, l.color]);
  }
  build(parent: THREE.Object3D) {
    super.build(parent);
    for (const k of ["cast", "still"] as const) {
      if (!this.parts[k].length) continue;
      const mesh = new THREE.Mesh(colourMerge(this.parts[k]), (smallsMat ??= new THREE.MeshLambertMaterial({ vertexColors: true })));
      mesh.castShadow = k === "cast";
      mesh.receiveShadow = true;
      mesh.name = "room-" + k;
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      parent.add(mesh);
      this.parts[k] = [];
    }
  }
}

function room(id: string, w: number, d: number, floor: string, wall: string, build: Builder, npcs: NpcSpot[], opts: { floorKind?: "wood" | "tile" | "carpet" | "stone" | "pasta"; accent?: string; warm?: boolean } = {}): Interior {
  // this edition's look for the room (theme.ts `roomLooks`; Maple Harbor has none)
  const look = THEME.roomLooks[id];
  if (look) {
    floor = look.floor ?? floor; wall = look.wall ?? wall;
    opts = { ...opts, floorKind: look.floorKind ?? opts.floorKind, accent: look.accent ?? opts.accent };
  }
  const g = new THREE.Group();
  g.name = "interior-" + id;
  const M = THEME.roomMerge && !STYLED ? new RoomMerger() : new Merger();
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
  } else if (kind === "pasta") {
    pastaTiles(x);
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
  g.add(outside(w, d));
  g.add(wallShade(w, d));
  const anim: Ctx["anim"] = [];
  build({ M, col, g, w, d, r, anim });
  M.build(g);
  const update = anim.length ? (t: number, dt: number) => { for (const f of anim) f(t, dt); } : undefined;
  // someone the edition has standing outdoors (theme.ts `outdoorNpcs`: Doña Chela at the pump) is not in the room
  const out = THEME.outdoorNpcs;
  if (out.length) npcs = npcs.filter((n) => !out.some((o) => o.npc === n.npc));
  // and someone it has stand elsewhere in the room (theme.ts `roomSpots`: a conversation's other speaker within its
  // picture) stands there
  const moved = THEME.roomSpots[id];
  if (moved) npcs = npcs.map((n) => moved[n.npc] ? { ...n, ...moved[n.npc] } : n);
  return { id, group: g, colliders: col, w, d, exit: { x: 0, z: d / 2 - 0.2 }, spawn: { x: 0, z: d / 2 - 1.6, rot: Math.PI }, npcs, warm: opts.warm, update };
}

// ---------------------------------------------------------------------------
// The edition's words on the rooms' signs and posters (theme.ts `signs`, `boards`; Maple Harbor has none, so its own
// words are drawn exactly as before)

/** A room's text in this edition: theme.ts `signs`, else the English text itself. */
const tr = (text: string) => THEME.signs[text] ?? text;
type TextOpts = NonNullable<Parameters<typeof plainTextTexture>[1]>;
/** A sign's texture (util.ts textTexture) in this edition's words; a "\n" in them makes a sign of two lines. */
function textTexture(text: string, opts: TextOpts = {}) {
  const own = THEME.signs[text];
  if (own === undefined) return plainTextTexture(text, opts);
  return own.includes("\n") ? twoLineTexture(own, opts) : plainTextTexture(own, opts);
}
/** A sign of two lines on textTexture's plate: the first large, the second smaller and a little lighter (Spanish over
 *  English at the airport). Drawn at twice textTexture's size, as two lines need it. */
function twoLineTexture(text: string, opts: TextOpts) {
  const [first, second = ""] = text.split("\n");
  const w = (opts.w ?? 512) * 2, h = (opts.h ?? 128) * 2;
  const family = opts.font ?? (opts.script ? "'Georgia', serif" : "'Nunito', 'Arial Rounded MT Bold', Arial, sans-serif");
  return canvasTex(w, h, (x) => {
    x.fillStyle = opts.bg ?? "#ffffff";
    roundRect(x, 8, 8, w - 16, h - 16, h * 0.18);
    x.fill();
    if (opts.border) { x.lineWidth = h * 0.06; x.strokeStyle = opts.border; x.stroke(); }
    x.fillStyle = opts.fg ?? "#222";
    x.textAlign = "center"; x.textBaseline = "middle";
    const line = (t: string, size: number, weight: number, y: number) => {
      x.font = `${weight} ${size}px ${family}`;
      while (x.measureText(t).width > w * 0.9 && size > 10) { size -= 2; x.font = `${weight} ${size}px ${family}`; }
      x.fillText(t, w / 2, y);
    };
    line(first, h * 0.4, 800, h * 0.37);
    x.globalAlpha = 0.85;
    line(second, h * 0.26, 700, h * 0.75);
    x.globalAlpha = 1;
  });
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
/** A table with chairs around it. `from`: the direction of the first chair from the table (radians from +x towards
 *  +z; the default π/2 puts it on the south side, the others follow evenly around). */
function table(c: Ctx, x: number, z: number, opts: { round?: boolean; cloth?: string; chairs?: number; w?: number; d?: number; chairColor?: string; from?: number } = {}) {
  const top = opts.cloth ?? "#e8dccb";
  if (opts.round) c.M.add("table-" + top, mat(top), cylGeo(0.6, 0.6, 0.06, x, 0.76, z, 16));
  else c.M.add("table-" + top, mat(top), boxGeo(opts.w ?? 1.4, 0.06, opts.d ?? 0.9, x, 0.76, z));
  c.M.add("table-leg", mat("#5a4636"), cylGeo(0.06, 0.08, 0.74, x, 0.37, z, 6));
  const n = opts.chairs ?? 2;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + (opts.from ?? Math.PI / 2);
    const cx = x + Math.cos(a) * 0.95, cz = z + Math.sin(a) * 0.95;
    const cc = opts.chairColor ?? "#6b4a3a";
    c.M.add("chair-" + cc, mat(cc), boxGeo(0.45, 0.08, 0.45, cx, 0.46, cz));
    c.M.add("chair-" + cc, mat(cc), boxGeo(0.45, 0.55, 0.08, 0, 0.72, 0.2).rotateY(-a + Math.PI / 2).translate(cx, 0, cz));
    for (const [lx, lz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) c.M.add("chair-leg", mat("#3b2a20"), boxGeo(0.05, 0.44, 0.05, cx + lx, 0.22, cz + lz), false);
    c.col.addCircle(cx, cz, 0.28);
  }
  // nobody walks through a table (a long one blocks end to end) or its chairs
  if (opts.round) c.col.addCircle(x, z, 0.75);
  else c.col.addBox(x, z, opts.w ?? 1.4, opts.d ?? 0.9);
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
  const own = THEME.boards[title];
  if (own) { title = own[0]; lines = own.slice(1); }
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
  c.col.addCircle(x + Math.sin(rot) * 0.75, z + Math.cos(rot) * 0.75, 0.3);
}
function sign(c: Ctx, text: string, x: number, y: number, z: number, w: number, bg: string, fg: string, rotY = 0) {
  wallPanel(c, textTexture(text, { bg, fg, w: 512, h: 128 }), x, y, z, w, w / 4, rotY);
}
/** A canvas drawn by `draw` as a texture. */
function canvasTex(w: number, h: number, draw: (x: CanvasRenderingContext2D) => void) {
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  draw(cv.getContext("2d")!);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
/** The eye chart in the exam room. */
function eyeChart() {
  return canvasTex(256, 384, (x) => {
    x.fillStyle = "#ffffff"; x.fillRect(0, 0, 256, 384);
    x.strokeStyle = "#c9d3d8"; x.lineWidth = 8; x.strokeRect(4, 4, 248, 376);
    x.fillStyle = "#1d1d1d"; x.textAlign = "center"; x.textBaseline = "middle";
    ["E", "F P", "T O Z", "L P E D", "P E C F D", "E D F C Z P", "F E L O P Z D"].forEach((row, i) => {
      x.font = `800 ${Math.round(86 * Math.pow(0.7, i))}px Arial`;
      x.fillText(row, 128, 58 + [0, 78, 138, 184, 222, 254, 282][i]);
    });
    x.fillStyle = "#c62828"; x.fillRect(30, 350, 196, 4);
  });
}
/** A poster of the lungs ("Take a deep breath"). */
function lungsPoster() {
  return canvasTex(256, 320, (x) => {
    x.fillStyle = "#e3f2f7"; x.fillRect(0, 0, 256, 320);
    x.fillStyle = "#3a86b0"; x.font = "800 30px Nunito, Arial"; x.textAlign = "center"; x.fillText(tr("Take a deep"), 128, 40); x.fillText(tr("breath!"), 128, 74);
    x.fillStyle = "#9fb8c2"; x.fillRect(120, 96, 16, 70);
    x.strokeStyle = "#9fb8c2"; x.lineWidth = 12; x.lineCap = "round";
    x.beginPath(); x.moveTo(128, 162); x.lineTo(96, 190); x.moveTo(128, 162); x.lineTo(160, 190); x.stroke();
    x.fillStyle = "#e58a97"; x.strokeStyle = "#b8586a"; x.lineWidth = 5;
    for (const s of [-1, 1]) {
      x.beginPath(); x.ellipse(128 + s * 52, 212, 42, 76, s * -0.12, 0, Math.PI * 2); x.fill(); x.stroke();
    }
  });
}
/** Sara on the meeting-room screen, muted ("Sara, you're on mute!"). */
function videoCall() {
  return canvasTex(512, 288, (x) => {
    x.fillStyle = "#1f2530"; x.fillRect(0, 0, 512, 288);
    x.fillStyle = "#3b4a5e"; roundRect(x, 14, 14, 484, 260, 18); x.fill();
    x.fillStyle = "#c24f6a"; x.beginPath(); x.ellipse(256, 300, 120, 96, 0, 0, Math.PI * 2); x.fill(); // shoulders
    x.fillStyle = "#1f1a17";
    for (const [cx, cy, r] of [[256, 92, 62], [206, 118, 34], [306, 118, 34], [218, 76, 30], [294, 76, 30]]) { x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill(); }
    x.fillStyle = "#a0694a"; x.beginPath(); x.ellipse(256, 132, 50, 60, 0, 0, Math.PI * 2); x.fill(); // face
    x.fillStyle = "#1f1a17"; for (const s of [-1, 1]) { x.beginPath(); x.arc(256 + s * 18, 128, 6, 0, Math.PI * 2); x.fill(); }
    x.strokeStyle = "#1f1a17"; x.lineWidth = 4; x.beginPath(); x.arc(256, 150, 16, 0.25, Math.PI - 0.25); x.stroke();
    x.fillStyle = "rgba(0,0,0,0.55)"; roundRect(x, 26, 222, 156, 40, 12); x.fill();
    x.fillStyle = "#ffffff"; x.font = "800 26px Nunito, Arial"; x.textAlign = "left"; x.textBaseline = "middle"; x.fillText("Sara", 74, 243);
    x.fillStyle = "#e5484d"; x.beginPath(); x.arc(50, 242, 15, 0, Math.PI * 2); x.fill(); // muted
    x.strokeStyle = "#ffffff"; x.lineWidth = 3;
    x.beginPath(); x.moveTo(50, 234); x.lineTo(50, 246); x.moveTo(44, 244); x.quadraticCurveTo(50, 253, 56, 244); x.moveTo(41, 233); x.lineTo(59, 251); x.stroke();
  });
}
/** A padded chair seat and back (for people sitting at a table: `rot` is the way they face). */
function seat(c: Ctx, x: number, z: number, rot: number, color: string) {
  c.M.add("chair-office", mat(color), boxGeo(0.5, 0.08, 0.5, 0, 0.44, 0).rotateY(rot).translate(x, 0, z));
  c.M.add("chair-office", mat(color), boxGeo(0.5, 0.62, 0.08, 0, 0.8, -0.28).rotateY(rot).translate(x, 0, z));
  c.col.addCircle(x, z, 0.28);
}

// ---------------------------------------------------------------------------
// Small things: everything in a room's `smalls` is merged into one vertex-coloured mesh (one draw call for all of them)

type Smalls = { add(g: THREE.BufferGeometry, color: THREE.ColorRepresentation): void; done(): void };
let smallsMat: THREE.MeshLambertMaterial | null = null;
function smalls(c: Ctx): Smalls {
  const parts: [THREE.BufferGeometry, THREE.ColorRepresentation][] = [];
  return {
    add: (g, color) => { parts.push([g, color]); },
    done: () => {
      if (!parts.length) return;
      const m = new THREE.Mesh(colourMerge(parts), (smallsMat ??= new THREE.MeshLambertMaterial({ vertexColors: true })));
      m.castShadow = m.receiveShadow = true;
      c.g.add(m);
    },
  };
}
/** A till on a counter top at height y, its screen towards the cashier (north). */
function till(S: Smalls, x: number, y: number, z: number) {
  S.add(boxGeo(0.44, 0.1, 0.36, x, y + 0.05, z), "#3a3d42");
  S.add(boxGeo(0.36, 0.26, 0.04, x, y + 0.26, z - 0.1), "#2b2f33");
  S.add(boxGeo(0.3, 0.2, 0.01, x, y + 0.27, z - 0.125), "#7fb3d5");
}
/** A shop mannequin on its stand: trousers or a skirt, a top, a head. */
function mannequin(c: Ctx, S: Smalls, x: number, z: number, top: string, bottom: string) {
  S.add(cylGeo(0.22, 0.24, 0.04, x, 0.02, z, 14), "#3a3d42");
  S.add(cylGeo(0.025, 0.025, 0.7, x, 0.38, z, 6), "#3a3d42");
  S.add(cylGeo(0.16, 0.17, 0.32, x, 0.86, z, 14), bottom);
  S.add(new THREE.CapsuleGeometry(0.19, 0.34, 4, 12).scale(1, 1, 0.7).translate(x, 1.32, z), top);
  S.add(cylGeo(0.05, 0.05, 0.1, x, 1.66, z, 8), "#ece6dc");
  S.add(new THREE.SphereGeometry(0.12, 12, 8).translate(x, 1.82, z), "#ece6dc");
  c.col.addCircle(x, z, 0.3);
}
/** A low table with piles of folded clothes. */
function foldedTable(c: Ctx, S: Smalls, x: number, z: number, colors: string[]) {
  S.add(boxGeo(1.4, 0.06, 0.7, x, 0.74, z), "#f4f1ea");
  for (const [lx, lz] of [[-0.62, -0.28], [0.62, -0.28], [-0.62, 0.28], [0.62, 0.28]]) S.add(boxGeo(0.05, 0.72, 0.05, x + lx, 0.36, z + lz), "#c9b79c");
  for (let i = 0; i < 3; i++) for (let k = 0; k < 2 + (i % 2) * 2; k++) S.add(boxGeo(0.34, 0.045, 0.26, x - 0.42 + i * 0.42, 0.795 + k * 0.047, z), colors[(i * 2 + k) % colors.length]);
  c.col.addBox(x, z, 1.4, 0.7);
}
/** A low table with a couple of magazines, and its legs. */
function coffeeTable(c: Ctx, S: Smalls, x: number, z: number, wood = "#9c6b43") {
  S.add(boxGeo(1.0, 0.05, 0.55, x, 0.42, z), wood);
  for (const [lx, lz] of [[-0.44, -0.22], [0.44, -0.22], [-0.44, 0.22], [0.44, 0.22]]) S.add(boxGeo(0.05, 0.4, 0.05, x + lx, 0.2, z + lz), wood);
  S.add(boxGeo(0.22, 0.012, 0.3, x - 0.22, 0.45, z, 0.3), "#e76f51");
  S.add(boxGeo(0.22, 0.012, 0.3, x + 0.15, 0.452, z - 0.04, -0.2), "#457b9d");
  c.col.addBox(x, z, 1.0, 0.55);
}
/** A water cooler with its blue bottle and a stack of paper cups. */
function waterCooler(c: Ctx, S: Smalls, x: number, z: number) {
  S.add(boxGeo(0.36, 1.0, 0.36, x, 0.5, z), "#f4f6f8");
  S.add(cylGeo(0.15, 0.15, 0.42, x, 1.22, z, 12), "#9fd3ec");
  S.add(boxGeo(0.06, 0.06, 0.05, x, 0.8, z + 0.2), "#4a90c2");
  S.add(cylGeo(0.035, 0.03, 0.2, x + 0.24, 0.9, z, 8), "#ffffff");
  c.col.addCircle(x, z, 0.3);
}
/** A pole with hooks and a coat hanging on it. */
function coatRack(c: Ctx, S: Smalls, x: number, z: number) {
  S.add(cylGeo(0.2, 0.22, 0.04, x, 0.02, z, 12), "#3a3d42");
  S.add(cylGeo(0.025, 0.025, 1.75, x, 0.9, z, 6), "#3a3d42");
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; S.add(boxGeo(0.18, 0.02, 0.02, 0, 0, 0).translate(0.09, 0, 0).rotateY(a).translate(x, 1.72, z), "#3a3d42"); }
  S.add(new THREE.CapsuleGeometry(0.13, 0.55, 3, 8).scale(1, 1, 0.6).translate(x + 0.12, 1.25, z), "#8a5a3c");
  c.col.addCircle(x, z, 0.25);
}
/** Maple Harbor on a poster: the streets, the park, the harbour and a pin on the car rental. */
function townMap() {
  return canvasTex(384, 256, (x) => {
    x.fillStyle = "#d9ead0"; x.fillRect(0, 0, 384, 256);
    x.fillStyle = "#7fb069"; x.fillRect(240, 40, 90, 70);
    x.fillStyle = "#6cc3dc"; x.fillRect(0, 0, 384, 36);
    x.strokeStyle = "#9aa3ab"; x.lineWidth = 10;
    for (const y of [60, 120, 190]) { x.beginPath(); x.moveTo(0, y); x.lineTo(384, y); x.stroke(); }
    for (const v of [60, 190, 320]) { x.beginPath(); x.moveTo(v, 36); x.lineTo(v, 256); x.stroke(); }
    x.fillStyle = "#e45b4f"; x.beginPath(); x.arc(290, 132, 11, 0, Math.PI * 2); x.fill();
    x.fillStyle = "#2f3a40"; x.font = "800 24px Nunito, Arial"; x.textAlign = "left"; x.fillText(tr("Maple Harbor"), 14, 240);
    x.strokeStyle = "#1f8a70"; x.lineWidth = 8; x.strokeRect(4, 4, 376, 248);
  });
}
/** The office whiteboard: this quarter's goals as bars, and sticky notes. */
function officeBoard() {
  return canvasTex(384, 224, (x) => {
    x.fillStyle = "#fbfcfd"; x.fillRect(0, 0, 384, 224);
    x.strokeStyle = "#9aa5ad"; x.lineWidth = 8; x.strokeRect(4, 4, 376, 216);
    x.fillStyle = "#34495e"; x.font = "800 26px Nunito, Arial"; x.textAlign = "left"; x.fillText(tr("Q4 Goals"), 22, 40);
    [[0.55, "#4a90c2"], [0.8, "#2e8b57"], [0.4, "#e8743b"], [0.68, "#8e6bb0"]].forEach(([h, c], i) => { x.fillStyle = c as string; x.fillRect(30 + i * 52, 196 - (h as number) * 130, 34, (h as number) * 130); });
    x.strokeStyle = "#34495e"; x.lineWidth = 3; x.beginPath(); x.moveTo(24, 198); x.lineTo(240, 198); x.stroke();
    ["#ffd166", "#f7a7b8", "#9fe0c4", "#ffd166"].forEach((c, i) => { x.fillStyle = c; x.fillRect(262 + (i % 2) * 54, 54 + Math.floor(i / 2) * 64, 46, 46); });
  });
}
/** A five-pointed star lying flat (a seal in the floor, a badge on a rug), its top point to the north. */
function floorStar(r: number, x: number, y: number, z: number) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + (i / 10) * Math.PI * 2, rr = i % 2 ? r * 0.42 : r;
    if (i) s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  return new THREE.ShapeGeometry(s).rotateX(-Math.PI / 2).translate(x, y, z);
}
/** A rug with a border, flat on the floor, in the smalls (no draw call of its own). */
function rugS(S: Smalls, x: number, z: number, w: number, d: number, color: string, border: string, b = 0.14) {
  S.add(boxGeo(w, 0.016, d, x, 0.008, z), border);
  S.add(boxGeo(w - 2 * b, 0.02, d - 2 * b, x, 0.01, z), color);
}
/** A chair (seat, back, four legs) in the smalls; `rot` is the way someone sitting on it faces (0: south). */
function chairS(S: Smalls, x: number, z: number, rot: number, color: string, legs = "#3a3d42") {
  const P = (g: THREE.BufferGeometry) => g.rotateY(rot).translate(x, 0, z);
  S.add(P(boxGeo(0.48, 0.07, 0.46, 0, 0.45, 0)), color);
  S.add(P(boxGeo(0.48, 0.5, 0.06, 0, 0.75, -0.21)), color);
  for (const [lx, lz] of [[-0.2, -0.18], [0.2, -0.18], [-0.2, 0.18], [0.2, 0.18]]) S.add(P(boxGeo(0.04, 0.42, 0.04, lx, 0.21, lz)), legs);
}
/** A bench of wooden slats on metal legs, with its back; `rot` is the way people sitting on it face (0: south). */
function benchS(c: Ctx, S: Smalls, x: number, z: number, rot: number, len: number, wood = "#9c6b43", metal = "#3a3d42") {
  const P = (g: THREE.BufferGeometry) => g.rotateY(rot).translate(x, 0, z);
  for (let i = 0; i < 3; i++) S.add(P(boxGeo(len, 0.05, 0.14, 0, 0.46, -0.17 + i * 0.17)), wood);
  for (let i = 0; i < 2; i++) S.add(P(boxGeo(len, 0.12, 0.04, 0, 0.66 + i * 0.18, -0.27)), wood);
  for (const s of [-1, 1]) {
    S.add(P(boxGeo(0.06, 0.44, 0.46, s * (len / 2 - 0.2), 0.22, 0)), metal);
    S.add(P(boxGeo(0.05, 0.5, 0.05, s * (len / 2 - 0.2), 0.7, -0.27)), metal);
  }
  c.col.addBox(x, z, Math.abs(Math.cos(rot)) * len + Math.abs(Math.sin(rot)) * 0.6, Math.abs(Math.sin(rot)) * len + Math.abs(Math.cos(rot)) * 0.6);
}
/** An office desk in the smalls: its top and legs, a monitor (the screen towards the chair), a keyboard and the chair.
 *  `rot` turns it (0: the person sits on the south side, facing north). */
function deskS(c: Ctx, S: Smalls, x: number, z: number, rot: number, chair = "#2d3a4a") {
  const P = (g: THREE.BufferGeometry) => g.rotateY(rot).translate(x, 0, z);
  S.add(P(boxGeo(1.6, 0.06, 0.8, 0, 0.75, 0)), "#e9e4da");
  for (const s of [-0.72, 0.72]) S.add(P(boxGeo(0.06, 0.72, 0.7, s, 0.36, 0)), "#7a7a7a");
  S.add(P(boxGeo(0.62, 0.4, 0.04, 0, 1.08, -0.22)), "#1d1d1d");
  S.add(P(boxGeo(0.56, 0.33, 0.01, 0, 1.09, -0.195)), "#8fc3e0");
  S.add(P(boxGeo(0.06, 0.2, 0.06, 0, 0.86, -0.24)), "#1d1d1d");
  S.add(P(boxGeo(0.44, 0.02, 0.14, 0, 0.79, 0.1)), "#2b2f33");
  S.add(P(boxGeo(0.5, 0.08, 0.5, 0, 0.47, 0.68)), chair);
  S.add(P(boxGeo(0.5, 0.55, 0.07, 0, 0.82, 0.94)), chair);
  S.add(P(cylGeo(0.03, 0.03, 0.42, 0, 0.22, 0.68, 6)), "#3a3d42");
  S.add(P(cylGeo(0.26, 0.26, 0.04, 0, 0.03, 0.68, 10)), "#3a3d42");
  c.col.addBox(x, z, Math.abs(Math.cos(rot)) * 1.6 + Math.abs(Math.sin(rot)) * 0.8, Math.abs(Math.sin(rot)) * 1.6 + Math.abs(Math.cos(rot)) * 0.8);
  c.col.addCircle(x + Math.sin(rot) * 0.78, z + Math.cos(rot) * 0.78, 0.3);
}
/** The strip over the bank's windows: "Teller 1 · 2 · 3" over the three panes (x −3.3, 0, 3.3; the strip is 9.9 m). */
function tellerStrip() {
  return canvasTex(1536, 40, (x) => {
    x.fillStyle = "#1f4f8a"; x.fillRect(0, 0, 1536, 40);
    x.fillStyle = "#c9a227"; x.fillRect(0, 0, 1536, 3); x.fillRect(0, 37, 1536, 3);
    x.fillStyle = "#ffffff"; x.font = "800 25px Nunito, Arial"; x.textAlign = "center"; x.textBaseline = "middle";
    [-3.3, 0, 3.3].forEach((gx, i) => x.fillText(`${tr("Teller")} ${i + 1}`, ((gx + 4.95) / 9.9) * 1536, 21));
  });
}
/** A post office poster: a sheet of stamps ("Stamps sold here") or a postcard of the harbour ("Send a postcard!"). */
function postPoster(kind: "stamps" | "postcard", ink = "#2c4f8f") {
  return canvasTex(200, 260, (x) => {
    x.fillStyle = kind === "stamps" ? ink : "#fdf3df"; x.fillRect(0, 0, 200, 260);
    x.textAlign = "center"; x.font = "800 24px Nunito, Arial";
    if (kind === "stamps") {
      x.fillStyle = "#ffffff"; x.fillText(tr("STAMPS"), 100, 36); x.font = "700 18px Nunito, Arial"; x.fillText(tr("sold here"), 100, 60);
      ["#e45b4f", "#f2c14e", "#6fbf73", "#4a7bb7", "#b5838d", "#f28c28"].forEach((col, i) => {
        const sx = 26 + (i % 3) * 52, sy = 84 + Math.floor(i / 3) * 74;
        x.fillStyle = "#ffffff"; x.fillRect(sx, sy, 46, 62);
        x.fillStyle = col; x.fillRect(sx + 6, sy + 6, 34, 40);
        x.fillStyle = ink; x.font = "800 11px Arial"; x.fillText(tr("USA"), sx + 23, sy + 58);
      });
      x.fillStyle = "#ffd166"; x.font = "800 20px Nunito, Arial"; x.fillText(tr("Forever"), 100, 246);
    } else {
      x.fillStyle = "#8fd3f0"; x.fillRect(16, 16, 168, 130);
      x.fillStyle = "#3a86b0"; x.fillRect(16, 104, 168, 42);
      x.fillStyle = "#ffffff"; x.fillRect(120, 46, 18, 60); x.fillStyle = "#e45b4f"; x.fillRect(120, 46, 18, 12); x.fillRect(120, 76, 18, 10); // the lighthouse
      x.fillStyle = "#f2c14e"; x.beginPath(); x.arc(52, 48, 16, 0, Math.PI * 2); x.fill();
      x.fillStyle = "#e45b4f"; x.fillText(tr("Send a"), 100, 184); x.fillText(tr("postcard!"), 100, 214);
      x.strokeStyle = "#c8a27a"; x.lineWidth = 6; x.strokeRect(3, 3, 194, 254);
    }
  });
}
/** The cork notice board at the police station: a missing dog, bike safety, a wanted poster, neighborhood watch, lost and found. */
function policeBoard() {
  return canvasTex(440, 260, (x) => {
    x.fillStyle = "#c19564"; x.fillRect(0, 0, 440, 260);
    for (let i = 0; i < 260; i++) { x.fillStyle = i % 2 ? "rgba(110,70,30,0.22)" : "rgba(255,240,210,0.18)"; x.fillRect((i * 97) % 440, (i * 53) % 260, 3, 3); }
    x.strokeStyle = "#6b4a2a"; x.lineWidth = 12; x.strokeRect(6, 6, 428, 248);
    const paper = (px: number, py: number, w: number, h: number, bg: string, english: string, tc: string, rot: number, draw?: () => void) => {
      const title = tr(english);
      x.save(); x.translate(px + w / 2, py + h / 2); x.rotate(rot); x.translate(-w / 2, -h / 2);
      x.fillStyle = "rgba(0,0,0,0.18)"; x.fillRect(3, 4, w, h);
      x.fillStyle = bg; x.fillRect(0, 0, w, h);
      x.fillStyle = tc; x.font = `800 ${title.length > 9 ? 13 : 19}px Nunito, Arial`; x.textAlign = "center"; x.fillText(title, w / 2, 22);
      draw?.();
      x.fillStyle = "#d62828"; x.beginPath(); x.arc(w / 2, 6, 5, 0, Math.PI * 2); x.fill();
      x.restore();
    };
    paper(22, 24, 116, 140, "#ffffff", "MISSING", "#c62828", -0.04, () => {
      x.fillStyle = "#8e9196"; x.fillRect(28, 60, 60, 34); x.fillRect(74, 44, 28, 26); x.fillRect(32, 92, 10, 18); x.fillRect(74, 92, 10, 18); // a gray dog
      x.fillStyle = "#1d1d1d"; x.fillRect(96, 52, 5, 5); x.font = "700 12px Arial"; x.fillText(tr("Call 555-0134"), 58, 128);
    });
    paper(158, 28, 124, 96, "#ffe9a8", "BIKE SAFETY", "#2a3f66", 0.03, () => {
      x.strokeStyle = "#2a3f66"; x.lineWidth = 4; for (const cx of [36, 88]) { x.beginPath(); x.arc(cx, 66, 16, 0, Math.PI * 2); x.stroke(); }
      x.beginPath(); x.moveTo(36, 66); x.lineTo(60, 44); x.lineTo(88, 66); x.moveTo(60, 44); x.lineTo(54, 66); x.lineTo(36, 66); x.stroke();
    });
    paper(300, 22, 118, 146, "#f4ecd8", "WANTED", "#1d1d1d", 0.05, () => {
      x.fillStyle = "#6b5a48"; x.beginPath(); x.arc(59, 72, 24, 0, Math.PI * 2); x.fill(); x.fillRect(27, 96, 64, 30);
      x.fillStyle = "#1d1d1d"; x.font = "800 13px Arial"; x.fillText(tr("$500 REWARD"), 59, 140);
    });
    paper(160, 146, 128, 96, "#d8ecff", "NEIGHBORHOOD WATCH", "#2a3f66", -0.03, () => {
      x.fillStyle = "#2a3f66"; x.beginPath(); x.ellipse(64, 60, 30, 16, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = "#ffffff"; x.beginPath(); x.arc(64, 60, 9, 0, Math.PI * 2); x.fill();
    });
    paper(28, 186, 112, 56, "#f7c6c6", "Lost & Found", "#8a1f2a", 0.04);
    paper(310, 184, 104, 58, "#ffffff", "Open 24/7", "#2a3f66", -0.05);
  });
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
    // (in this edition, theme.ts roomExtras.cafeMx, conchas in the case: cafeMx)
    if (!THEME.roomExtras.cafeMx) for (let i = 0; i < 6; i++) c.M.add("pastry", mat(["#e0a45e", "#8a4b2a", "#f2d49b"][i % 3], { flat: true }), new THREE.SphereGeometry(0.12, 6, 4).scale(1.4, 0.6, 1).translate(-2.4 + i * 0.32, 1.2, -3.1), false);
    wallPanel(c, menuBoard(["                    small · medium · large|", "Latte|$4.25 · 4.75 · 5.25", "Cappuccino|$4.00 · 4.50 · 5.00", "Americano|$3.00 · 3.50 · 4.00", "Mocha|$4.75 · 5.25 · 5.75", "Drip Coffee|$2.50 · 3.00 · 3.50", "Hot Chocolate|$3.50 · 4.00 · 4.50", "Espresso · Flat White|$2.75 · $4.50", "Tea (black, green, mint, chamomile)|$3.00", "Oat, almond or soy milk|+$0.75", "Iced drinks|+$0.50"], "SUNNY CUP · DRINKS"), -3.6, 2.75, -c.d / 2 + 0.2, 4.2, 3.2);
    wallPanel(c, menuBoard(["Croissant|$3.25", "Muffin (blueberry, chocolate)|$3.50", "Cinnamon Roll|$3.75", "Bagel|$3.00", "Cookie|$2.50", "Turkey Sandwich|$7.25"], "FOOD"), 0.9, 2.75, -c.d / 2 + 0.2, 3.2, 2);
    sign(c, "Wi-Fi: SunnyCup · password: sunnycup22", 4.8, 2.9, -c.d / 2 + 0.2, 3.4, "#fff8e8", "#8a5a3c");
    for (const [tx, tz] of [[3, 0.5], [5.8, -1.8], [5.8, 2.6], [-5.6, 1.5], [0.4, 3]]) table(c, tx, tz, { round: true, cloth: "#f7f1e6", chairs: 2, chairColor: "#e8743b" });
    windowBack(c, 5.2, 3.8);
    // (in this edition, theme.ts roomExtras.services, the restroom door at the back on the left where the plant stands:
    // the plant by the west wall instead)
    if (!THEME.roomExtras.services) plant(c, -7.2, -5.2);
    plant(c, 7.2, 5, 0.8);
    lamp(c, -3, -1.5); lamp(c, 0, -1.5); lamp(c, 3.6, 0.8);
    rug(c, 0, 1, 6, 3.5, "#e8c07a");
    if (THEME.roomExtras.cafeMx) cafeMx(c);
    if (THEME.roomExtras.services) { const S = smalls(c); restroomDoor(c, S, -6.9, -c.d / 2, 0, "#6d2e46", "#f4e4cc"); clayPlant(c, S, -7.25, -0.9, 0.9); S.done(); }
  }, [{ npc: "mia", x: -1.2, z: -4.2, rot: 0, ax: -1.2, az: -2.05 }], { floorKind: "wood", accent: "#8a5a3c", warm: true }),

  trattoria: () => THEME.restaurant === "yucateco" ? cocina() : room("trattoria", 18, 14, "#a8745a", "#f4e1c8", (c) => {
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
    // (in this edition, theme.ts roomExtras.shopsMx, two of the racks hold rebozos and embroidered blouses: hilosMx)
    for (const [rx, rz] of [[-4, -1], [-4, 2.5], [1, 0.5], [1, 3.4]]) {
      c.M.add("rack", mat("#9aa5ad"), boxGeo(2.4, 0.05, 0.05, rx, 1.6, rz));
      for (const s of [-1.1, 1.1]) c.M.add("rack", mat("#9aa5ad"), cylGeo(0.03, 0.03, 1.6, rx + s, 0.8, rz, 6));
      if (!THEME.roomExtras.shopsMx || rz < 2) for (let i = 0; i < 7; i++) c.M.add("cloth-" + clothes[i % 8], mat(clothes[(i + Math.round(rx)) % 8]), boxGeo(0.08, 0.8, 0.55, rx - 1 + i * 0.33, 1.15, rz), false);
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
    // mannequins, tables of folded clothes, a wall of shoes, a bench by the fitting rooms, the till and shopping bags
    const S = smalls(c);
    mannequin(c, S, -6.6, -4.3, "#e76f51", "#264653");
    mannequin(c, S, -1.2, -3.9, "#2a9d8f", "#3d405b");
    mannequin(c, S, 6.9, 0.8, "#f2cc8f", "#5c4b3a");
    if (THEME.roomExtras.guayabera) guayabera(c, S, -2.4, 4.7);
    foldedTable(c, S, -6.7, 0.8, ["#457b9d", "#f2cc8f", "#81b29a", "#e07a5f", "#f4f1ea", "#8e6bb0"]);
    foldedTable(c, S, 4.2, 1.0, ["#e76f51", "#2a9d8f", "#e9c46a", "#3d5a80", "#f4f1ea", "#b5838d"]);
    for (const y of [0.4, 0.85, 1.3, 1.75]) {
      S.add(boxGeo(0.36, 0.03, 2.4, c.w / 2 - 0.2, y, -3.6), "#f4f4f4");
      for (let k = 0; k < 5; k++) {
        const sc = ["#3a2f2a", "#f4f1ea", "#bc4749", "#c8a272", "#264653"][(k + Math.round(y * 3)) % 5];
        for (const e of [-0.06, 0.06]) S.add(boxGeo(0.24, 0.09, 0.1, c.w / 2 - 0.22, y + 0.06, -4.55 + k * 0.48 + e), sc);
      }
    }
    c.col.addBox(c.w / 2 - 0.2, -3.6, 0.4, 2.4);
    S.add(boxGeo(1.6, 0.08, 0.45, 6.4, 0.44, 2.5), "#8e6bb0");
    for (const s of [-0.7, 0.7]) S.add(boxGeo(0.06, 0.42, 0.4, 6.4 + s, 0.21, 2.5), "#3a3d42");
    c.col.addBox(6.4, 2.5, 1.6, 0.45);
    till(S, 5.6, 1.08, -3.6);
    for (const [bx, bc] of [[3.6, "#6b4a8a"], [3.95, "#f4f1ea"]] as [number, string][]) { S.add(boxGeo(0.28, 0.32, 0.12, bx, 1.24, -3.55), bc); S.add(boxGeo(0.12, 0.08, 0.01, bx, 1.44, -3.55), "#3a2f2a"); }
    rug(c, -1.5, 1.2, 9.2, 5.8, "#c9b6e4");
    rug(c, 0, 4.9, 3, 1.4, "#8e6bb0");
    lamp(c, -4, 0.8, 3.4); lamp(c, 1, 2, 3.4); lamp(c, 4.6, -2, 3.4);
    if (THEME.roomExtras.shopsMx) hilosMx(c, S);
    S.done();
  }, [{ npc: "chloe", x: 4.4, z: -4.6, rot: 0, ax: 4.4, az: -2.5 }], { floorKind: "wood", accent: "#6b4a8a" }),

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
    // a blood pressure corner, a vitamin stand, drop-off and pick-up signs over the counter, baskets by the door
    const S = smalls(c);
    S.add(boxGeo(0.6, 1.25, 0.7, -6.6, 0.625, 4.9), "#f4f6f8");
    S.add(boxGeo(0.02, 0.3, 0.4, -6.29, 1.05, 4.9), "#7fd1c8");
    S.add(new THREE.TorusGeometry(0.1, 0.04, 6, 12).rotateY(Math.PI / 2).translate(-6.22, 0.8, 4.9), "#2e8b57");
    c.col.addBox(-6.6, 4.9, 0.6, 0.7);
    seat(c, -5.8, 4.9, -Math.PI / 2, "#2e8b57");
    c.col.addBox(-5.8, 4.9, 0.55, 0.55);
    sign(c, "Blood Pressure", -c.w / 2 + 0.05, 2.0, 4.9, 1.4, "#2e8b57", "#ffffff", Math.PI / 2);
    S.add(cylGeo(0.42, 0.45, 0.12, 3.7, 0.06, 1.5, 16), "#e3ebe6");
    S.add(cylGeo(0.05, 0.05, 1.2, 3.7, 0.6, 1.5, 8), "#c9ced6");
    for (const [y, r] of [[0.45, 0.38], [0.8, 0.3], [1.15, 0.22]] as [number, number][]) {
      S.add(cylGeo(r, r, 0.03, 3.7, y, 1.5, 16), "#f4f6f8");
      const n = Math.round(r * 22);
      for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; S.add(cylGeo(0.035, 0.035, 0.12, 3.7 + Math.cos(a) * r * 0.75, y + 0.075, 1.5 + Math.sin(a) * r * 0.75, 8), ["#f2c14e", "#e45b4f", "#4a7bb7", "#6fbf73"][i % 4]); }
    }
    c.col.addCircle(3.7, 1.5, 0.48);
    for (const [sx, text] of [[-0.4, "Drop off"], [2.4, "Pick up"]] as [number, string][]) {
      sign(c, text, sx, 2.55, -3.6, 1.2, "#2e8b57", "#ffffff");
      for (const e of [-0.5, 0.5]) S.add(cylGeo(0.006, 0.006, WALL_H - 2.7, sx + e, (WALL_H + 2.7) / 2, -3.6, 4), "#3a3d42");
    }
    till(S, 2.3, 1.08, -3.8);
    S.add(boxGeo(3.6, 0.01, 0.08, 1, 0.006, -2.3), "#f2c14e");
    // three chairs to wait on along the east side, and a stand of sun cream and sunglasses
    for (const wz of [3.4, 4.1, 4.8]) { seat(c, 6.3, wz, -Math.PI / 2, "#2e8b57"); }
    c.col.addBox(6.3, 4.1, 0.6, 2.1);
    S.add(boxGeo(0.9, 1.5, 0.5, -1.8, 0.75, 1.2), "#e3ebe6");
    for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) S.add(boxGeo(0.16, 0.12, 0.06, -2.15 + k * 0.23, 0.55 + r * 0.38, 1.47), ["#f2c14e", "#f4a261", "#3a3d42", "#4a90c2"][(r + k) % 4]);
    c.col.addBox(-1.8, 1.2, 0.9, 0.5);
    for (let i = 0; i < 4; i++) S.add(boxGeo(0.52, 0.12, 0.36, 2.6, 0.06 + i * 0.1, 5.2), "#d62828");
    c.col.addBox(2.6, 5.2, 0.55, 0.4);
    lamp(c, -4.5, 1.2, 3.4); lamp(c, 1, -1.5, 3.4); lamp(c, 3.7, 3, 3.4);
    if (THEME.roomExtras.pharmacyDoctor) consultorioDoor(c, S);
    // (theme.ts roomExtras.roomsMx) the báscula by the door, a minisplit on the wall
    if (THEME.roomExtras.roomsMx) { bascula(c, S, -4.4, 5.3, 0); minisplitAt(S, c.w / 2 - 0.02, 3.3, -3.0, -Math.PI / 2); }
    S.done();
  }, [{ npc: "okafor", x: 1, z: -4.8, rot: 0, ax: 1, az: -2.7 }], { floorKind: "tile", accent: "#2e8b57" }),

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
    // a wash basin with its reclining chair, a hood dryer, a trolley of tools, a waiting corner, products and pictures
    const S = smalls(c);
    S.add(cylGeo(0.3, 0.24, 0.12, 4.4, 0.96, -3.8, 14), "#f4f4f4"); S.add(cylGeo(0.22, 0.22, 0.02, 4.4, 1.02, -3.8, 14), "#9aa5ad");
    S.add(boxGeo(0.7, 0.42, 0.7, 4.4, 0.42, -2.9), "#2b2b2b");
    S.add(boxGeo(0.7, 0.75, 0.1, 0, 0, 0).rotateX(-0.6).translate(4.4, 0.86, -3.3), "#2b2b2b");
    c.col.addBox(4.4, -2.9, 0.8, 0.8);
    S.add(boxGeo(0.7, 0.42, 0.7, -5.1, 0.42, -0.6), "#c94f7c"); S.add(boxGeo(0.12, 0.7, 0.7, -5.45, 0.78, -0.6), "#c94f7c");
    S.add(cylGeo(0.035, 0.035, 1.3, -5.6, 0.65, -0.6, 6), "#9aa5ad");
    S.add(new THREE.SphereGeometry(0.32, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2).rotateZ(-0.5).translate(-5.25, 1.4, -0.6), "#f7f1f3");
    c.col.addBox(-5.2, -0.6, 0.9, 0.8);
    for (const y of [0.3, 0.62, 0.94]) S.add(boxGeo(0.5, 0.03, 0.38, -1.0, y, -3.7), "#c9ced6");
    for (const [lx, lz] of [[-0.23, -0.17], [0.23, -0.17], [-0.23, 0.17], [0.23, 0.17]]) S.add(cylGeo(0.015, 0.015, 0.96, -1.0 + lx, 0.48, -3.7 + lz, 5), "#9aa5ad");
    ["#c94f7c", "#8e6bb0", "#2a9d8f", "#f4a261"].forEach((col, i) => S.add(cylGeo(0.035, 0.035, 0.16, -1.15 + i * 0.1, 1.04, -3.7, 8), col));
    c.col.addBox(-1.0, -3.7, 0.55, 0.45);
    shelf(c, -5.75, 1.05, 1.5, 1.7, "#f7f1f3", ["#c94f7c", "#8e6bb0", "#2a9d8f", "#f4a261", "#ffffff"], Math.PI / 2, 0.36);
    rug(c, 3.8, 2.3, 3.2, 2.4, "#e7a3bd");
    rug(c, -1, -1.6, 6.4, 2.6, "#f2c9d8");
    // the manicure table: two chairs, a lamp, the polish bottles
    S.add(boxGeo(1.1, 0.05, 0.6, -3.3, 0.74, 1.2), "#f7f1f3");
    for (const [lx, lz] of [[-0.5, -0.25], [0.5, -0.25], [-0.5, 0.25], [0.5, 0.25]]) S.add(boxGeo(0.05, 0.72, 0.05, -3.3 + lx, 0.36, 1.2 + lz), "#c9ced6");
    ["#c94f7c", "#e63946", "#8e6bb0", "#f4a261", "#2a9d8f"].forEach((col, i) => S.add(cylGeo(0.022, 0.022, 0.07, -3.6 + i * 0.08, 0.8, 1.05, 6), col));
    S.add(cylGeo(0.012, 0.012, 0.32, -2.9, 0.92, 1.0, 5), "#3a3d42"); S.add(new THREE.ConeGeometry(0.09, 0.1, 10).translate(-2.9, 1.1, 1.08), "#f2c14e");
    c.col.addBox(-3.3, 1.2, 1.1, 0.6);
    seat(c, -3.3, 0.45, Math.PI, "#c94f7c"); seat(c, -3.3, 1.95, 0, "#c94f7c");
    coffeeTable(c, S, 3.8, 1.9);
    S.add(cylGeo(0.07, 0.05, 0.16, 3.5, 0.53, 1.85, 10), "#8e6bb0");
    for (const [fx, fy] of [[3.45, 0.66], [3.55, 0.7], [3.5, 0.74]] as [number, number][]) S.add(new THREE.SphereGeometry(0.05, 6, 5).translate(fx, fy, 1.85), "#f28fad");
    till(S, -4.6, 1.08, 2.8);
    S.add(boxGeo(0.3, 0.03, 0.22, -3.6, 1.1, 2.8, 0.2), "#1f4f8a");
    for (let i = 0; i < 4; i++) S.add(boxGeo(0.34, 0.08, 0.24, 4.4, 1.62 + i * 0.09, -c.d / 2 + 0.18), ["#ffffff", "#f7d6e0", "#ffffff", "#c94f7c"][i]);
    S.add(boxGeo(0.9, 0.03, 0.3, 4.4, 1.57, -c.d / 2 + 0.16), "#c9ced6");
    framedArt(c, 2, -5.1, 2.2, -c.d / 2 + 0.2, 0.9, 1.1);
    framedArt(c, 7, 2.85, 2.2, -c.d / 2 + 0.2, 0.8, 1.0);
    lamp(c, -3, -1.2, 3.3); lamp(c, 1, -1.2, 3.3); lamp(c, 3.8, 2.2, 3.3);
    // (in this edition, theme.ts roomExtras.shopsMx: a little altar with the Virgin over the counter, a ceiling fan)
    if (THEME.roomExtras.shopsMx) { shelfAltar(S, -c.w / 2, 1.65, 3.6, Math.PI / 2); ceilingFan(S, -1, 1.6, "#f1ece2"); }
    if (THEME.roomExtras.roomsMx) minisplitAt(S, c.w / 2 - 0.02, 3.2, -1.0, -Math.PI / 2);
    S.done();
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
    // a carpet where people wait for a teller, the bank's seal in the floor by the door, the vault door and a clock
    // behind the tellers, the window numbers, a waiting corner, deposit slips and the pen on its chain at the form desk,
    // a brochure stand, an ATM, plants and lamps. (Nothing on the way round the east end of the rope and the counter.)
    const S = smalls(c);
    rug(c, 0, -1.35, 9.4, 2.5, "#8a1f2a");
    S.add(cylGeo(1.5, 1.5, 0.016, 0, 0.008, 3.0, 40), "#c9a227");
    S.add(cylGeo(1.36, 1.36, 0.02, 0, 0.01, 3.0, 40), "#1f4f8a");
    S.add(new THREE.TorusGeometry(1.08, 0.03, 4, 40).rotateX(Math.PI / 2).translate(0, 0.02, 3.0), "#c9a227");
    S.add(floorStar(0.62, 0, 0.024, 3.0), "#c9a227");
    const vx = 3.5, vy = 1.55, vz = -c.d / 2;
    const disc = (r: number, h: number, dz: number, seg = 32) => new THREE.CylinderGeometry(r, r, h, seg).rotateX(Math.PI / 2).translate(vx, vy, vz + dz);
    S.add(disc(1.12, 0.1, 0.05), "#6b7680");
    S.add(disc(0.94, 0.12, 0.12), "#aab3bb");
    S.add(new THREE.TorusGeometry(0.72, 0.03, 6, 32).translate(vx, vy, vz + 0.18), "#8a949c");
    S.add(new THREE.TorusGeometry(0.3, 0.035, 6, 20).translate(vx, vy, vz + 0.24), "#c9a227");
    for (let i = 0; i < 3; i++) S.add(boxGeo(0.62, 0.045, 0.045, 0, 0, 0).rotateZ((i * Math.PI) / 3).translate(vx, vy, vz + 0.24), "#c9a227");
    S.add(disc(0.08, 0.1, 0.24, 12), "#c9a227");
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; S.add(new THREE.CylinderGeometry(0.035, 0.035, 0.06, 6).rotateX(Math.PI / 2).translate(vx + Math.cos(a) * 0.84, vy + Math.sin(a) * 0.84, vz + 0.2), "#4a545c"); }
    for (const dy of [-0.5, 0.5]) S.add(boxGeo(0.22, 0.24, 0.14, vx - 1.12, vy + dy, vz + 0.1), "#4a545c");
    wallPanel(c, wallClock(), -3.5, 2.75, -c.d / 2 + 0.05, 0.7, 0.7);
    wallPanel(c, tellerStrip(), 0, 2.43, -3.27, 9.9, 0.26);
    [-3.3, 0, 3.3].forEach((gx, i) => {
      S.add(boxGeo(0.5, 0.32, 0.04, gx + 0.55, 1.34, -3.95), "#1d1d1d");
      S.add(boxGeo(0.06, 0.18, 0.06, gx + 0.55, 1.17, -3.98), "#1d1d1d");
      S.add(boxGeo(0.32, 0.05, 0.22, gx - 0.6, 1.105, -3.7), "#3a3d42");
      S.add(boxGeo(0.21, 0.01, 0.29, gx - 0.12, 1.085, -3.8, 0.2 * (i - 1)), "#ffffff");
    });
    sofa(c, 7.35, 2.9, "#1f4f8a", -Math.PI / 2, 2.2);
    rugS(S, 6.7, 2.9, 2.4, 3.0, "#e6dcc3", "#1f4f8a");
    S.add(boxGeo(0.6, 0.05, 1.1, 6.05, 0.42, 2.9), "#7d5a44");
    for (const [lx, lz] of [[-0.25, -0.5], [0.25, -0.5], [-0.25, 0.5], [0.25, 0.5]]) S.add(boxGeo(0.05, 0.4, 0.05, 6.05 + lx, 0.2, 2.9 + lz), "#7d5a44");
    S.add(boxGeo(0.22, 0.012, 0.3, 6.0, 0.452, 2.62, 0.3), "#c9a227");
    S.add(boxGeo(0.22, 0.012, 0.3, 6.1, 0.452, 3.15, -0.2), "#ffffff");
    c.col.addBox(6.05, 2.9, 0.6, 1.1);
    ["#ffffff", "#d8ecd8", "#f6d6d6"].forEach((col, i) => { for (let k = 0; k < 4; k++) S.add(boxGeo(0.2, 0.008, 0.28, -6.6 + i * 0.27, 1.104 + k * 0.008, 2.4), col); });
    S.add(cylGeo(0.045, 0.05, 0.04, -5.3, 1.12, 2.55, 10), "#c9a227");
    S.add(cylGeo(0.012, 0.012, 0.17, 0, 0, 0, 5).rotateZ(Math.PI / 2).rotateY(0.5).translate(-5.55, 1.115, 2.72), "#1f4f8a");
    for (let i = 0; i < 6; i++) S.add(boxGeo(0.03, 0.01, 0.01, -5.33 - i * 0.035, 1.108, 2.58 + i * 0.02, -0.5), "#c9ced6");
    S.add(boxGeo(0.4, 1.5, 0.9, -7.75, 0.75, 0.3), "#1f4f8a");
    for (let r = 0; r < 3; r++) for (let k = 0; k < 3; k++) S.add(boxGeo(0.02, 0.27, 0.22, 0, 0, 0).rotateZ(0.25).translate(-7.52, 0.6 + r * 0.38, 0.03 + k * 0.27), ["#c9a227", "#ffffff", "#8a1f2a", "#6fbf73"][(r + k) % 4]);
    c.col.addBox(-7.75, 0.3, 0.45, 0.9);
    S.add(boxGeo(0.62, 1.8, 0.9, 7.69, 0.9, -2.0), "#3a4a5e");
    S.add(boxGeo(0.04, 0.34, 0.5, 7.37, 1.36, -2.0), "#8fc3e0");
    S.add(boxGeo(0.16, 0.06, 0.42, 7.32, 1.02, -2.0), "#c9ced6");
    S.add(boxGeo(0.03, 0.24, 0.9, 7.38, 1.68, -2.0), "#c9a227");
    c.col.addBox(7.69, -2.0, 0.62, 0.9);
    plant(c, -7.2, 5.1, 1); plant(c, -7.3, -5.2, 1.1);
    lamp(c, -3.6, 0.3, 3.4); lamp(c, 3.6, 0.3, 3.4); lamp(c, 6.3, 2.9, 3.3);
    if (THEME.roomExtras.bankTurns) bankTurns(c, S);
    if (THEME.roomExtras.roomsMx) minisplitAt(S, c.w / 2 - 0.02, 3.3, 0.5, -Math.PI / 2);
    S.done();
  }, [{ npc: "aaron", x: 0, z: -4.8, rot: 0, ax: 0, az: -2.65 }], { floorKind: "stone", accent: "#1f4f8a" }),

  "post-office": () => room("post-office", 14, 11, "#d8dde6", "#eef2f8", (c) => {
    // Maple Harbor's USPS navy and red, or Correos de México's rosa mexicano and lime green (theme.ts `mailbox`)
    const correos = THEME.mailbox === "correos";
    const ink = correos ? "#e4007c" : "#2c4f8f";
    counter(c, 0, -3.4, 7, 1.1, ink, correos ? "#f4f1ea" : "#eef2f8");
    c.M.add("scale", mat("#9aa5ad"), boxGeo(0.6, 0.12, 0.5, 2.2, 1.15, -3.3));
    for (let i = 0; i < 6; i++) c.M.add("parcel", mat(["#c8a27a", "#b38b5d"][i % 2]), boxGeo(0.5 + (i % 3) * 0.15, 0.4, 0.5, -3 + (i % 3) * 0.7, 0.2 + Math.floor(i / 3) * 0.4, -5.1), true);
    c.col.addBox(-2.3, -5.1, 2.1, 0.55);
    // P.O. boxes on the west wall
    c.M.add("po-wall", mat("#8a7340"), boxGeo(0.06, 2.3, 3.6, -c.w / 2 + 0.05, 1.7, -1.63), false);
    for (let i = 0; i < 6; i++) for (let k = 0; k < 4; k++) c.M.add("po-box", mat("#c9a227"), boxGeo(0.05, 0.4, 0.45, -c.w / 2 + 0.1, 1 + k * 0.5, -3 + i * 0.55), false);
    sign(c, "UNITED STATES POSTAL SERVICE", 0, 3.3, -c.d / 2 + 0.2, 5.4, ink, "#ffffff");
    for (let i = -2; i <= 2; i++) c.M.add("queue-post", mat("#9aa5ad"), cylGeo(0.05, 0.08, 1, i * 1.2, 0.5, 0.6, 8));
    c.col.addBox(0, 0.6, 5, 0.3);
    // a red carpet at the counter, a blue mailbox by the door, a cart of parcels, a stamp machine, the letter sorting
    // rack behind the counter, a bench, a table for writing addresses, posters, lamps; the counter's till, envelopes and
    // a parcel on the scale. (The way round the east end of the counter stays free.)
    const S = smalls(c);
    rug(c, 0, -1.25, 6.8, 2.2, correos ? "#9bc53d" : "#b8323a");
    rugS(S, 0, 3.0, 3.2, 1.6, ink, correos ? "#9bc53d" : "#eef2f8", 0.12);
    const mx = 3.3, mz = 4.4;
    if (correos) {
      // a Correos de México buzón (mexican.ts, as outside its door), its plate without words
      const parts: MX.Part[] = [];
      MX.buzon(parts, null, mx, mz, 0);
      for (const [g, col] of parts) S.add(g, col);
    } else {
      S.add(boxGeo(0.62, 0.9, 0.52, mx, 0.75, mz), "#2c4f8f");
      S.add(new THREE.CylinderGeometry(0.31, 0.31, 0.52, 14, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI / 2).translate(mx, 1.2, mz), "#2c4f8f");
      for (const [lx, lz] of [[-0.26, -0.2], [0.26, -0.2], [-0.26, 0.2], [0.26, 0.2]]) S.add(boxGeo(0.06, 0.3, 0.06, mx + lx, 0.15, mz + lz), "#1d2f55");
      S.add(boxGeo(0.4, 0.04, 0.03, mx, 1.12, mz + 0.27), "#1d1d1d");
      S.add(boxGeo(0.3, 0.2, 0.02, mx, 0.7, mz + 0.27), "#ffffff");
    }
    c.col.addBox(mx, mz, 0.7, 0.6);
    const tx = -4.3, tz = 3.0;
    S.add(boxGeo(1.3, 0.06, 0.75, tx, 0.2, tz), "#3a3d42");
    for (const [wx, wz] of [[-0.5, -0.3], [0.5, -0.3], [-0.5, 0.3], [0.5, 0.3]]) S.add(new THREE.CylinderGeometry(0.08, 0.08, 0.05, 10).rotateX(Math.PI / 2).translate(tx + wx, 0.08, tz + wz), "#1d1d1d");
    S.add(boxGeo(0.05, 0.9, 0.7, tx - 0.62, 0.65, tz), "#3a3d42");
    S.add(new THREE.CylinderGeometry(0.03, 0.03, 0.74, 6).rotateX(Math.PI / 2).translate(tx - 0.62, 1.12, tz), "#e45b4f");
    for (const [pw, ph, pd, px, py, pz, pc] of [[0.5, 0.36, 0.5, -0.28, 0.41, -0.1, "#c8a27a"], [0.44, 0.3, 0.42, 0.28, 0.38, 0.1, "#b38b5d"], [0.36, 0.26, 0.36, -0.25, 0.72, -0.06, "#d9b98c"], [0.5, 0.2, 0.3, 0.26, 0.63, 0.06, "#c8a27a"]] as [number, number, number, number, number, number, string][]) {
      S.add(boxGeo(pw, ph, pd, tx + px, py, tz + pz), pc);
      S.add(boxGeo(pw + 0.01, ph + 0.01, 0.06, tx + px, py, tz + pz), "#e8dcc0");
    }
    c.col.addBox(tx, tz, 1.4, 0.8);
    S.add(boxGeo(0.7, 1.8, 0.95, 6.62, 0.9, -1.2), correos ? "#e4007c" : "#c8323c");
    S.add(boxGeo(0.03, 0.42, 0.62, 6.26, 1.36, -1.2), "#dff3fb");
    for (let i = 0; i < 6; i++) S.add(boxGeo(0.02, 0.12, 0.1, 6.245, 1.27 + Math.floor(i / 3) * 0.17, -1.38 + (i % 3) * 0.18), ["#2c4f8f", "#f2c14e", "#6fbf73"][i % 3]);
    S.add(boxGeo(0.06, 0.24, 0.3, 6.25, 0.95, -1.2), "#3a3d42");
    S.add(boxGeo(0.06, 0.08, 0.4, 6.25, 0.55, -1.2), "#1d1d1d");
    S.add(boxGeo(0.03, 0.2, 0.95, 6.26, 1.68, -1.2), "#ffffff");
    c.col.addBox(6.62, -1.2, 0.7, 0.95);
    const rx = 2.5, rz = -c.d / 2 + 0.14;
    S.add(boxGeo(2.2, 1.4, 0.03, rx, 1.7, -c.d / 2 + 0.015), "#7a5a3c");
    for (let i = 0; i <= 4; i++) S.add(boxGeo(2.2, 0.03, 0.26, rx, 1.0 + i * 0.35, rz), "#9c7a52");
    for (let k = 0; k <= 6; k++) S.add(boxGeo(0.03, 1.4, 0.26, rx - 1.1 + k * (2.2 / 6), 1.7, rz), "#9c7a52");
    for (let i = 0; i < 4; i++) for (let k = 0; k < 6; k++) {
      if ((i * 7 + k * 3) % 5 === 0) continue;
      const lh = 0.05 + ((i + k * 2) % 4) * 0.035;
      S.add(boxGeo(0.28, lh, 0.22, rx - 1.1 + (k + 0.5) * (2.2 / 6), 1.015 + i * 0.35 + lh / 2, rz + 0.02), ["#ffffff", "#f4ecd8", "#dfe8f4", "#f6e0a8"][(i + k) % 4]);
    }
    S.add(boxGeo(1.3, 0.05, 0.75, -4.0, 1.02, -0.6), "#9c7a52");
    S.add(cylGeo(0.05, 0.05, 1.0, -4.0, 0.5, -0.6, 8), "#3a3d42");
    S.add(cylGeo(0.35, 0.38, 0.05, -4.0, 0.025, -0.6, 14), "#3a3d42");
    for (let i = 0; i < 3; i++) S.add(boxGeo(0.24, 0.012, 0.16, -4.4 + i * 0.3, 1.052, -0.62, 0.15 * (i - 1)), ["#ffffff", "#f4ecd8", "#dfe8f4"][i]);
    S.add(cylGeo(0.04, 0.04, 0.1, -3.55, 1.1, -0.75, 8), ink);
    c.col.addBox(-4.0, -0.6, 1.3, 0.75);
    benchS(c, S, -6.45, 3.4, Math.PI / 2, 1.8, "#9c7a52");
    till(S, -1.3, 1.08, -3.5);
    for (let k = 0; k < 5; k++) S.add(boxGeo(0.24, 0.012, 0.16, -2.6, 1.087 + k * 0.012, -3.05, 0.05 * k), k % 2 ? "#f4ecd8" : "#ffffff");
    S.add(boxGeo(0.4, 0.26, 0.3, 2.2, 1.34, -3.3), "#c8a27a");
    S.add(boxGeo(0.41, 0.27, 0.06, 2.2, 1.34, -3.3), "#e8dcc0");
    S.add(boxGeo(0.16, 0.1, 0.08, 0.9, 1.13, -3.1), "#e45b4f");
    wallPanel(c, postPoster("stamps", ink), 4.9, 2.2, -c.d / 2 + 0.05, 1.0, 1.3);
    wallPanel(c, postPoster("postcard"), c.w / 2 - 0.03, 2.1, 1.6, 1.0, 1.3, -Math.PI / 2);
    lamp(c, -3.5, 0.6, 3.4); lamp(c, 3.5, 0.6, 3.4);
    // (theme.ts roomExtras.roomsMx) Mexico's flag on its stand behind the counter, as a federal office has it; a minisplit
    if (THEME.roomExtras.roomsMx) { flagStand(c, S, -5.5, -4.6, 0); minisplitAt(S, c.w / 2 - 0.02, 3.3, -3.6, -Math.PI / 2); }
    S.done();
  }, [{ npc: "gloria", x: 0, z: -4.4, rot: 0, ax: 0, az: -2.25 }], { floorKind: "tile", accent: "#2c4f8f" }),

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
    // (a beach hotel in this edition, theme.ts roomExtras.hotelMx: rattan, a zarape runner, palms, windows on the sea)
    const mx = THEME.roomExtras.hotelMx;
    if (!mx) { sofa(c, -7, 2, "#2d5d5b", Math.PI / 2); sofa(c, -4, 4.8, "#2d5d5b", Math.PI); }
    table(c, -5, 2.4, { round: true, cloth: "#7d5a44", chairs: 0 });
    rug(c, -5.5, 3, 5, 4, "#8a2f3b");
    if (!mx) rug(c, 0, 1, 3, 9, "#b5452f");
    if (!mx) { plant(c, -10, -6.5, 1.2); plant(c, 10, 6.5, 1); plant(c, 3.6, -5.2, 0.8); }
    lamp(c, 0, -2, 3.2); lamp(c, -5, 3, 3.2);
    if (!mx) framedArt(c, 1, -7, 2.4, -c.d / 2 + 0.2, 2.2, 1.5);
    // the east half: a second seating corner by the elevators, a luggage cart, a tall plant
    sofa(c, 7.2, 4.6, "#8a2f3b", Math.PI); sofa(c, 9.4, 2.4, "#8a2f3b", -Math.PI / 2);
    table(c, 7.4, 2.6, { round: true, cloth: "#c9a27a", chairs: 0 });
    rug(c, 7.8, 3.2, 4.4, 3.6, "#2d5d5b");
    for (const [px, pz] of [[4.6, -2.6], [5.6, -2.6], [4.6, -3.6], [5.6, -3.6]] as [number, number][]) c.M.add("cart-post", mat("#c9a227"), cylGeo(0.03, 0.03, 1.7, px, 0.95, pz, 6), false);
    c.M.add("cart-base", mat("#7d5a44"), boxGeo(1.3, 0.12, 1.3, 5.1, 0.2, -3.1));
    c.M.add("cart-top", mat("#c9a227"), new THREE.TorusGeometry(0.62, 0.03, 6, 20).rotateX(Math.PI / 2).translate(5.1, 1.8, -3.1), false);
    for (const [sx, sy, sh, sc] of [[4.85, 0.55, 0.62, "#2f4a6b"], [5.35, 0.5, 0.5, "#8a2f3b"], [5.0, 1.0, 0.36, "#c4a35a"]] as [number, number, number, string][])
      c.M.add("suitcase-" + sc, mat(sc), boxGeo(0.46, sh, 0.7, sx, sy, -3.1));
    c.col.addBox(5.1, -3.1, 1.4, 1.4);
    if (!mx) plant(c, 10, -6.5, 1.3);
    else hotelMx(c);
  }, [{ npc: "olivia", x: 0, z: -5.6, rot: 0, ax: 0, az: -3.4 }], { floorKind: "stone", accent: "#7d5a44", warm: true }),

  "visitor-center": () => room("visitor-center", 14, 12, "#b8c9b0", "#f1f6ec", (c) => {
    counter(c, 0, -3.3, 5, 1, "#2f6b4f", "#f4f1ea");
    for (const bx of [-5.5, -4]) shelf(c, bx, -1, 1.2, 1.8, "#9c6b43", ["#e45b4f", "#4a7bb7", "#f2c14e", "#6fbf73"], Math.PI / 2, 0.5);
    sign(c, "Welcome to Maple Harbor!", 0, 3.4, -c.d / 2 + 0.2, 5, "#2f6b4f", "#fff8e8");
    // big town map on the back wall is set by the game (uses the ground texture)
    c.g.userData.mapSpot = { x: 4.2, y: 2.2, z: -c.d / 2 + 0.2, w: 3.8, h: 2.6 };
    wallPanel(c, textTexture("Jazz Night · Friday 8 PM", { bg: "#2b2d6e", fg: "#ffd166", w: 512, h: 160 }), -4.5, 2.6, -c.d / 2 + 0.2, 2.6, 0.8);
    plant(c, 6, 5, 0.9); plant(c, -6, 5, 0.9);
    // a model of the town on a table over a red rug, a wall rack of brochures, a shelf of souvenirs, a postcard stand,
    // a bench, the guest book and brochures on the counter, plants and lamps. (The way round the east end of the
    // counter, under the big map, stays free.)
    const S = smalls(c);
    rug(c, -2.0, 1.5, 4.2, 3.0, "#b83a2e");
    const mx = -2.0, mz = 1.5, top = 0.86;
    S.add(boxGeo(2.1, 0.78, 1.3, mx, 0.39, mz), "#9c6b43");
    S.add(boxGeo(2.3, 0.08, 1.5, mx, 0.82, mz), "#7d5a44");
    S.add(boxGeo(2.16, 0.02, 1.36, mx, top + 0.01, mz), "#9cc98a");
    S.add(boxGeo(2.16, 0.024, 0.36, mx, top + 0.012, mz - 0.5), "#5fb0d6");
    S.add(boxGeo(2.16, 0.026, 0.07, mx, top + 0.013, mz - 0.29), "#efe3c4");
    for (const sz of [0.08, 0.42]) S.add(boxGeo(2.16, 0.028, 0.06, mx, top + 0.014, mz + sz), "#8a9096");
    for (const sx of [-0.62, 0, 0.62]) S.add(boxGeo(0.06, 0.028, 1.0, mx + sx, top + 0.014, mz + 0.18), "#8a9096");
    const houses = ["#e45b4f", "#f2c14e", "#f4f1ea", "#4a7bb7", "#e8a87c", "#8e6bb0", "#f28c28", "#d9d4c7"];
    let hi = 0;
    for (const bx of [-0.92, -0.31, 0.31]) for (const bz of [-0.12, 0.25, 0.58]) for (let k = 0; k < 2; k++) {
      const h = 0.05 + ((hi * 7) % 5) * 0.035, col = houses[hi++ % houses.length];
      S.add(boxGeo(0.16, h, 0.14, mx + bx + (k ? 0.12 : -0.08), top + 0.02 + h / 2, mz + bz), col);
      S.add(new THREE.ConeGeometry(0.12, 0.07, 4).rotateY(Math.PI / 4).translate(mx + bx + (k ? 0.12 : -0.08), top + 0.02 + h + 0.035, mz + bz), "#8a4b3a");
    }
    S.add(boxGeo(0.5, 0.03, 0.9, mx + 0.92, top + 0.015, mz + 0.22), "#6fae5a");
    for (const [ox, oz] of [[0.8, 0], [1.02, 0.18], [0.84, 0.42], [1.04, 0.56]]) S.add(new THREE.IcosahedronGeometry(0.07, 0).translate(mx + ox, top + 0.1, mz + oz), "#3f7f3a");
    S.add(cylGeo(0.035, 0.045, 0.24, mx + 0.95, top + 0.14, mz - 0.45, 8), "#ffffff");
    S.add(cylGeo(0.04, 0.04, 0.05, mx + 0.95, top + 0.28, mz - 0.45, 8), "#e45b4f");
    for (const [ox, oz] of [[-0.6, -0.55], [0.1, -0.48]]) { S.add(boxGeo(0.14, 0.03, 0.05, mx + ox, top + 0.03, mz + oz), "#ffffff"); S.add(boxGeo(0.01, 0.08, 0.05, mx + ox, top + 0.07, mz + oz), "#f4f1ea"); }
    c.col.addBox(mx, mz, 2.3, 1.5);
    const pal = ["#e45b4f", "#4a7bb7", "#f2c14e", "#6fbf73", "#ffffff", "#8e6bb0"];
    S.add(boxGeo(0.3, 1.6, 1.9, -6.84, 0.9, 2.4), "#2f6b4f");
    for (let r = 0; r < 4; r++) for (let k = 0; k < 5; k++) S.add(boxGeo(0.02, 0.24, 0.26, 0, 0, 0).rotateZ(0.22).translate(-6.66, 0.42 + r * 0.36, 1.68 + k * 0.36), pal[(r * 2 + k) % pal.length]);
    c.col.addBox(-6.84, 2.4, 0.35, 1.9);
    const sx = 6.72, sz = 1.3;
    S.add(boxGeo(0.04, 1.9, 2.2, 6.97, 0.95, sz), "#7d5a44");
    for (const y of [0.05, 0.6, 1.15, 1.7]) S.add(boxGeo(0.46, 0.04, 2.2, sx, y, sz), "#9c6b43");
    for (const s of [-1, 1]) S.add(boxGeo(0.46, 1.9, 0.04, sx, 0.95, sz + s * 1.1), "#9c6b43");
    for (let i = 0; i < 5; i++) { // mugs
      S.add(cylGeo(0.06, 0.055, 0.13, sx - 0.05, 0.685, sz - 0.8 + i * 0.4, 10), i % 2 ? "#e45b4f" : "#ffffff");
      S.add(new THREE.TorusGeometry(0.035, 0.012, 4, 8).rotateY(Math.PI / 2).translate(sx - 0.05, 0.69, sz - 0.73 + i * 0.4), i % 2 ? "#e45b4f" : "#ffffff");
    }
    // (in this edition, theme.ts roomExtras.roomsMx, alebrijes, vanilla, habanero sauce and clay pots instead: infoMx)
    if (!THEME.roomExtras.roomsMx) for (let i = 0; i < 4; i++) { // snow globes and little lighthouses
      S.add(cylGeo(0.07, 0.08, 0.06, sx - 0.05, 1.2, sz - 0.75 + i * 0.5, 10), "#7d5a44");
      S.add(new THREE.SphereGeometry(0.085, 10, 8).translate(sx - 0.05, 1.31, sz - 0.75 + i * 0.5), "#d8eef7");
      S.add(cylGeo(0.025, 0.04, 0.22, sx - 0.05, 1.28, sz - 0.5 + i * 0.5, 8), i % 2 ? "#e45b4f" : "#ffffff");
    }
    if (!THEME.roomExtras.roomsMx) for (let i = 0; i < 6; i++) { // maple syrup
      S.add(cylGeo(0.045, 0.05, 0.16, sx - 0.05, 1.8, sz - 0.85 + i * 0.34, 8), "#b5651d");
      S.add(cylGeo(0.02, 0.02, 0.05, sx - 0.05, 1.905, sz - 0.85 + i * 0.34, 6), "#e45b4f");
    }
    for (let i = 0; i < 4; i++) for (let k = 0; k < 3; k++) S.add(boxGeo(0.34, 0.045, 0.36, sx - 0.02, 0.095 + k * 0.047, sz - 0.8 + i * 0.53), ["#2f6b4f", "#e45b4f", "#4a7bb7", "#f2c14e"][(i + k) % 4]);
    c.col.addBox(sx, sz, 0.5, 2.25);
    sign(c, "Souvenirs", c.w / 2 - 0.05, 2.35, sz, 1.6, "#2f6b4f", "#fff8e8", -Math.PI / 2);
    const px = 4.6, pz = 3.6;
    S.add(cylGeo(0.3, 0.32, 0.05, px, 0.025, pz, 14), "#3a3d42");
    S.add(cylGeo(0.025, 0.025, 1.7, px, 0.88, pz, 6), "#3a3d42");
    for (let t = 0; t < 3; t++) for (let i = 0; i < 8; i++) S.add(boxGeo(0.16, 0.22, 0.01, 0, 0, 0).rotateX(-0.12).translate(0, 0, 0.17).rotateY((i / 8) * Math.PI * 2).translate(px, 0.78 + t * 0.32, pz), pal[(t * 3 + i) % pal.length]);
    c.col.addCircle(px, pz, 0.35);
    benchS(c, S, -3.9, 4.15, Math.PI, 2.2);
    S.add(boxGeo(0.5, 0.025, 0.34, -0.6, 1.095, -3.05, 0.1), "#2f6b4f");
    S.add(boxGeo(0.22, 0.01, 0.3, -0.72, 1.112, -3.05, 0.1), "#ffffff");
    S.add(boxGeo(0.22, 0.01, 0.3, -0.48, 1.112, -3.03, 0.1), "#ffffff");
    S.add(cylGeo(0.008, 0.008, 0.16, 0, 0, 0, 5).rotateZ(Math.PI / 2).rotateY(0.7).translate(-0.3, 1.12, -2.98), "#1d1d1d");
    for (let i = 0; i < 5; i++) S.add(boxGeo(0.16, 0.01, 0.24, 1.0 + i * 0.12, 1.087 + i * 0.002, -3.0 - (i % 2) * 0.05, -0.3 + i * 0.15), pal[i]);
    S.add(new THREE.SphereGeometry(0.06, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).translate(1.9, 1.08, -3.15), "#c9a227");
    sign(c, "Information", 0, 0.62, -2.79, 1.6, "#ffffff", "#2f6b4f");
    plant(c, -6.3, -5.2, 1.1); plant(c, 2.2, 4.9, 0.8);
    lamp(c, -2.0, 1.5, 3.3); lamp(c, 3.4, 0.4, 3.4);
    if (THEME.roomExtras.roomsMx) infoMx(c, S, sx, sz);
    S.done();
  }, [{ npc: "chuck", x: 0, z: -4.2, rot: 0, ax: 0, az: -2.2 }], { floorKind: "wood", accent: "#2f6b4f" }),

  museum: () => room("museum", 26, 20, "#d7d0c4", "#f7f4ee", (c) => {
    counter(c, -7, 3.5, 4, 1, "#9c8f7a", "#f7f4ee");
    sign(c, "Tickets · Audio Guides", -7, 2.3, 2.96, 3, "#2b2d6e", "#ffffff");
    // (the permanent collection's Maya pieces in this edition, theme.ts roomExtras.museumMaya, where the back wall's
    // paintings are)
    const maya = THEME.roomExtras.museumMaya;
    if (!maya) for (let i = 0; i < 5; i++) framedArt(c, i + 2, -9 + i * 4.2, 2.3, -c.d / 2 + 0.2, 2.4 + (i % 2) * 0.6, 1.7);
    // (in this edition, theme.ts roomExtras.services, the restrooms where the third picture hangs: museumServices)
    for (let i = 0; i < (THEME.roomExtras.services ? 2 : 3); i++) framedArt(c, i + 9, -c.w / 2 + 0.2, 2.3, -5 + i * 4, 2.2, 1.6, Math.PI / 2);
    // partition with the new exhibition
    c.M.add("partition", mat("#2b2d6e"), boxGeo(0.3, 3.2, 7, 6, 1.6, -3)); c.col.addBox(6, -3, 0.4, 7);
    for (let i = 0; i < 2; i++) framedArt(c, 3 * (i + 1), 6.2, 2, -5 + i * 3.5, 1.8, 1.4, Math.PI / 2);
    wallPanel(c, textTexture("The Colors of the Night", { bg: "#2b2d6e", fg: "#ffd166", w: 768, h: 128 }), 6.18, 3.5, -3, 3.4, 0.56, Math.PI / 2);
    // statue
    c.M.add("plinth", mat("#e7e1d6"), boxGeo(1.2, 1, 1.2, -2, 0.5, -2)); c.col.addBox(-2, -2, 1.3, 1.3);
    if (!maya) {
      c.M.add("statue", mat("#d9d4c7", { flat: true }), new THREE.CapsuleGeometry(0.3, 0.9, 4, 8).translate(-2, 1.9, -2));
      c.M.add("statue", mat("#d9d4c7", { flat: true }), new THREE.SphereGeometry(0.25, 10, 8).translate(-2, 2.8, -2));
    }
    // gift shop corner
    shelf(c, 10.5, 6, 3, 1.8, "#9c8f7a", ["#ffd166", "#2b2d6e", "#e45b4f"], Math.PI / 2, 0.5);
    sign(c, "Gift Shop", 10.5, 2.6, 7.5, 2, "#ffd166", "#2b2d6e", Math.PI);
    for (const x of [-9, -4.8, -0.6, 3.6]) c.M.add("rope-post", mat("#c9a227"), cylGeo(0.05, 0.08, 1, x, 0.5, -c.d / 2 + 1.6, 8));
    c.M.add("rope", mat("#8a1f2a"), boxGeo(12.6, 0.06, 0.06, -2.7, 0.9, -c.d / 2 + 1.6), false);
    c.col.addBox(-2.7, -c.d / 2 + 1.6, 12.6, 0.3);
    lamp(c, -6, -6); lamp(c, 0, -6); lamp(c, 6, 3);
    if (THEME.roomExtras.museumStairs) museumStairs(c);
    if (maya) museumMaya(c);
    if (THEME.roomExtras.services) museumServices(c);
  }, [{ npc: "ben", x: -7, z: 2.5, rot: 0, ax: -7, az: 4.6 }, { npc: "harold", x: 2.5, z: -6.5, rot: 0.4 }], { floorKind: "stone", accent: "#9c8f7a" }),

  station: () => room("station", 26, 18, "#c8b8a0", "#efe3d0", (c) => {
    counter(c, -6, -6, 6, 1.1, "#7a2e2e", "#efe3d0");
    for (const gx of [-7.5, -4.5]) c.M.add("ticket-glass", mat("#dff3fb", { transparent: 0.3 }), boxGeo(2.8, 1.3, 0.05, gx, 1.75, -5.5), false);
    sign(c, "TICKETS", -6, 3.4, -c.d / 2 + 0.2, 3, "#7a2e2e", "#fff8e8");
    const board = document.createElement("canvas"); board.width = 1024; board.height = 512;
    const x = board.getContext("2d")!;
    x.fillStyle = "#101418"; x.fillRect(0, 0, 1024, 512);
    const own = THEME.boards.DEPARTURES;
    x.fillStyle = "#ffd166"; x.font = "800 48px monospace"; x.fillText(own?.[0] ?? "DEPARTURES", 30, 64);
    x.font = "600 40px monospace";
    if (own) {
      // the edition's departures (theme.ts `boards`): "time|destination|platform|status" in columns; a status that
      // starts with "!" in red
      x.font = "600 34px monospace";
      own.slice(1).map((r) => r.split("|")).forEach((row, i) => {
        const late = row[3]?.startsWith("!");
        x.fillStyle = late ? "#ff7b72" : "#e6edf3";
        [row[0], row[1], row[2], late ? row[3].slice(1) : row[3]].forEach((t, k) => x.fillText(t ?? "", [30, 170, 610, 800][k], 140 + i * 72));
      });
    } else [["7:15", "SEASIDE", "TRACK 4", "DELAYED"], ["8:05", "PORTLAND", "TRACK 2", "ON TIME"], ["9:10", "SEASIDE", "TRACK 4", "ON TIME"], ["9:40", "BOSTON", "TRACK 1", "ON TIME"], ["10:25", "SEASIDE", "TRACK 3", "ON TIME"]].forEach((row, i) => {
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
    // bus bay on the east side (in this edition, theme.ts roomExtras.terminalMx, route 7's own bus: terminalMx)
    if (!THEME.roomExtras.terminalMx) {
      c.M.add("bus", mat("#3d6fb5", { flat: true }), boxGeo(3, 3, 5, 11.4, 1.6, -3.5));
      c.M.add("bus-win", mat("#9ccbe6", { emissive: "#1b3a4c" }), boxGeo(3.02, 1, 4, 11.4, 2.2, -3.5), false);
      c.M.add("bus-door", mat("#2b2b2b"), boxGeo(0.06, 2.2, 1.2, 9.88, 1.2, -1.6), false);
      c.col.addBox(11.4, -3.5, 3.2, 5.2);
      sign(c, "BUS 12 · DOWNTOWN", 11.4, 3.4, -0.95, 3, "#3d6fb5", "#ffffff");
    }
    for (let i = 0; i < 4; i++) lamp(c, -8 + i * 5, 0, 3.3);
    // a red runner between the rows of benches, ticket machines and the station clock on the back wall, a drinks
    // machine, a newsstand by the door, travellers' bags on the benches, a suitcase, trash cans, two big plants.
    // (The ways round the west end of the ticket counter and over to the bus stay free.)
    const S = smalls(c);
    rugS(S, -1, 2.5, 12.6, 1.5, "#7a2e2e", "#c9a227", 0.1);
    for (const tx of [-1.55, -0.35]) {
      S.add(boxGeo(0.9, 1.75, 0.6, tx, 0.875, -8.68), "#7a2e2e");
      S.add(boxGeo(0.5, 0.36, 0.02, tx, 1.3, -8.37), "#8fc3e0");
      S.add(boxGeo(0.4, 0.2, 0.05, tx, 0.95, -8.36), "#3a3d42");
      S.add(boxGeo(0.3, 0.06, 0.06, tx, 0.62, -8.36), "#1d1d1d");
      S.add(boxGeo(0.9, 0.16, 0.02, tx, 1.64, -8.37), "#fff8e8");
    }
    c.col.addBox(-0.95, -8.68, 2.2, 0.6);
    wallPanel(c, wallClock(), -0.95, 2.85, -c.d / 2 + 0.05, 0.8, 0.8);
    S.add(boxGeo(1.0, 1.9, 0.75, 7.9, 0.95, -8.55), "#2e6db5");
    S.add(boxGeo(0.66, 1.2, 0.02, 7.78, 1.15, -8.17), "#dff3fb");
    for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) S.add(cylGeo(0.045, 0.045, 0.16, 7.55 + k * 0.15, 0.7 + r * 0.29, -8.24, 8), ["#e45b4f", "#f2c14e", "#6fbf73", "#f28c28"][(r + k) % 4]);
    S.add(boxGeo(0.14, 0.4, 0.03, 8.27, 1.2, -8.17), "#3a3d42");
    S.add(boxGeo(0.6, 0.14, 0.03, 7.78, 0.3, -8.17), "#1d1d1d");
    c.col.addBox(7.9, -8.55, 1.0, 0.75);
    const kx = -11.0, kz = 6.2;
    S.add(boxGeo(2.0, 1.0, 0.9, kx, 0.5, kz), "#2f6b4f");
    S.add(boxGeo(2.1, 0.06, 1.0, kx, 1.03, kz), "#f4f1ea");
    S.add(boxGeo(2.0, 1.3, 0.1, kx, 1.7, kz - 0.42), "#2f6b4f");
    for (let r = 0; r < 3; r++) for (let k = 0; k < 6; k++) S.add(boxGeo(0.24, 0.3, 0.02, 0, 0, 0).rotateX(-0.15).translate(kx - 0.78 + k * 0.31, 1.25 + r * 0.38, kz - 0.35), ["#e45b4f", "#f2c14e", "#4a7bb7", "#ffffff", "#8e6bb0", "#6fbf73"][(r * 2 + k) % 6]);
    for (let k = 0; k < 4; k++) S.add(boxGeo(0.34, 0.03, 0.26, kx - 0.6 + k * 0.4, 1.075, kz + 0.2, 0.1 * (k - 1.5)), k % 2 ? "#f4f1ea" : "#d9d4c7");
    for (const s of [-1, 1]) S.add(cylGeo(0.03, 0.03, 1.5, kx + s * 1.0, 1.8, kz + 0.42, 6), "#3a3d42");
    for (let i = 0; i < 5; i++) S.add(boxGeo(0.44, 0.07, 1.1, kx - 0.88 + i * 0.44, 2.58, kz, 0), i % 2 ? "#ffffff" : "#c8323c");
    c.col.addBox(kx, kz, 2.1, 1.0);
    S.add(boxGeo(0.5, 0.35, 0.3, -1.6, 0.73, 1.05), "#4a7bb7");
    S.add(boxGeo(0.4, 0.1, 0.06, -1.6, 0.68, 1.22), "#2b4f7a");
    S.add(boxGeo(0.8, 0.22, 0.5, 3.6, 0.66, 4.05), "#3d3d46");
    S.add(new THREE.CapsuleGeometry(0.17, 0.5, 3, 8).rotateZ(Math.PI / 2).translate(-4.2, 0.72, 4.05), "#8e6bb0");
    S.add(boxGeo(0.46, 0.68, 0.26, -6.9, 0.4, 4.0), "#e45b4f");
    S.add(boxGeo(0.2, 0.06, 0.04, -6.9, 0.98, 4.0), "#3a3d42");
    for (const s of [-1, 1]) S.add(boxGeo(0.02, 0.28, 0.02, -6.9 + s * 0.09, 0.84, 4.0), "#3a3d42");
    c.col.addBox(-6.9, 4.0, 0.5, 0.3);
    for (const [bx, bz] of [[5.0, 1.0], [-7.0, 5.2]]) { S.add(cylGeo(0.24, 0.22, 0.75, bx, 0.375, bz, 12), "#5a646e"); S.add(cylGeo(0.26, 0.26, 0.05, bx, 0.77, bz, 12), "#3a3d42"); c.col.addCircle(bx, bz, 0.26); }
    plant(c, -12.1, 8.1, 1.2); plant(c, 12.1, 8.1, 1.2);
    if (THEME.roomExtras.terminalMx) terminalMx(c, S);
    if (THEME.roomExtras.services) terminalAtm(c, S);
    S.done();
  }, [{ npc: "walter", x: -6, z: -7, rot: 0, ax: -6, az: -4.85 }, { npc: "denise", x: 9, z: -1.2, rot: -Math.PI / 2 }], { floorKind: "stone", accent: "#7a2e2e" }),

  airport: () => room("airport", 44, 26, "#d7dde3", "#f2f5f8", (c) => {
    // (in this edition, theme.ts roomExtras.airportMx, the signs a quarter bigger: read from the door on a phone)
    const k = THEME.roomExtras.airportMx ? 1.25 : 1;
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
    // (with customs, the suitcases are drawn in arrivalsMx's one mesh: the officer's draw calls are paid for there)
    if (!THEME.roomExtras.customs) for (let i = 0; i < 5; i++) c.M.add("suitcase-" + i, mat(["#e45b4f", "#4a7bb7", "#3d3d46", "#6fbf73", "#f2c14e"][i]), boxGeo(0.7, 0.45, 0.5, -17 + i * 1.5, 0.95, 2.1 + (i % 2) * 0.8));
    c.col.addBox(-14, 2.5, 8.2, 2.4);
    sign(c, "Baggage Claim · Flight 223", -14, 2.6, 4.2, 3.6 * k, "#2b5d8a", "#ffffff");
    counter(c, -4, -8.2, 4, 1, "#e05a47", "#f2f5f8");
    sign(c, "Baggage Services", -4, 3.1, -c.d / 2 + 0.2, 3.2 * k, "#e05a47", "#ffffff");
    // departures (east): check-in, security, gate
    counter(c, 6, -8.2, 6, 1, "#1d3f73", "#f2f5f8");
    sign(c, "Check-in · Harbor Air", 6, 3.1, -c.d / 2 + 0.2, 4 * k, "#1d3f73", "#ffffff");
    c.M.add("scale", mat("#9aa5ad"), boxGeo(1, 0.2, 0.8, 8.6, 0.1, -7.2));
    // security
    c.M.add("arch", mat("#c0c4c8"), boxGeo(0.25, 2.4, 1, 13.2, 1.2, -1));
    c.M.add("arch", mat("#c0c4c8"), boxGeo(0.25, 2.4, 1, 14.8, 1.2, -1));
    c.M.add("arch", mat("#c0c4c8"), boxGeo(1.85, 0.3, 1, 14, 2.4, -1));
    c.M.add("conveyor", mat("#3a3f45"), boxGeo(1, 0.9, 5, 11.6, 0.45, -1)); c.col.addBox(11.6, -1, 1, 5);
    c.M.add("bin", mat("#8a939b"), boxGeo(0.7, 0.2, 0.5, 11.6, 1.0, -2.5));
    c.col.addBox(13.2, -1, 0.3, 1); c.col.addBox(14.8, -1, 0.3, 1);
    sign(c, "Security", 14, 3.6, -c.d / 2 + 0.2, 2.6 * k, "#34495e", "#ffffff");
    // gate
    counter(c, 18.5, -8.4, 3, 0.9, "#1d3f73", "#f2f5f8");
    sign(c, "Gate 8 · Flight 223 to Boston", 18.5, 3.1, -c.d / 2 + 0.2, 4.4 * k, "#1d3f73", "#ffd166");
    for (const [sx, sz] of [[17, 1], [20, 1], [17, 4], [20, 4]]) {
      c.M.add("seats", mat("#2b5d8a"), boxGeo(2.4, 0.45, 0.6, sx, 0.45, sz));
      c.M.add("seats", mat("#2b5d8a"), boxGeo(2.4, 0.6, 0.1, sx, 0.85, sz - 0.3));
      c.col.addBox(sx, sz, 2.5, 0.7);
    }
    // windows with a plane outside
    for (const wx of [-18, -8, 2, 12, 20]) windowBack(c, wx, 5, 2.4, 2.1, "#bfe3f7");
    c.M.add("partition", mat("#c9d3dc"), boxGeo(0.3, 2.2, 6, 1, 1.1, 3)); c.col.addBox(1, 3, 0.4, 6);
    sign(c, "← Arrivals · Departures →", 1, 2.6, 6.2, 3.4 * k, "#ffd166", "#1d3f73", 0);
    if (k === 1) { plant(c, -20.5, 11, 1.2); plant(c, 20.5, 11, 1.2); plant(c, -1, -11.5, 1); }
    // (with customs, the lamp over the way to the baggage desk hangs further west: Agente Medina in the conversation's
    // picture moves its camera there)
    for (let i = 0; i < 6; i++) lamp(c, -18 + i * 7 - (THEME.roomExtras.customs && i === 2 ? 3.2 : 0), -2, 3.6);
    if (THEME.roomExtras.customs || THEME.roomExtras.mexicanFlag) arrivalsMx(c);
    if (THEME.roomExtras.airportMx) airportMx(c);
    if (THEME.roomExtras.services) airportServices(c);
  }, [
    { npc: "diaz", x: -14, z: -8.7, rot: 0 },
    { npc: "priya", x: -4, z: -9.3, rot: 0, ax: -4, az: -7.1 },
    { npc: "kevin", x: 6, z: -9.3, rot: 0, ax: 6, az: -7.1 },
    { npc: "grant", x: 15.8, z: 0.4, rot: -Math.PI / 2 },
    { npc: "nina", x: 18.5, z: -9.4, rot: 0, ax: 18.5, az: -7.35 },
    // customs (theme.ts roomExtras.customs): Agente Medina at her post after the baggage desk, facing it
    ...(THEME.roomExtras.customs ? [CUSTOMS_OFFICER] : []),
  ], { floorKind: "tile", accent: "#2b5d8a" }),

  "car-rental": () => room("car-rental", 14, 10, "#dfe7e3", "#f1f8f5", (c) => {
    counter(c, 0, -2.8, 5, 1, "#1f8a70", "#f4f4f4");
    wallPanel(c, textTexture("Harbor Car Rental · Keys", { bg: "#1f8a70", fg: "#ffffff", w: 768, h: 128 }), 0, 3.3, -c.d / 2 + 0.2, 4.4, 0.72);
    for (let i = 0; i < 8; i++) c.M.add("key", mat("#c9a227"), boxGeo(0.1, 0.25, 0.04, -1.5 + i * 0.42, 2.3, -c.d / 2 + 0.1), false);
    for (const [px, cc] of [[-4.5, "#e45b4f"], [4.5, "#4a7bb7"]] as [number, string][]) wallPanel(c, textTexture("🚗", { bg: cc, fg: "#fff", w: 256, h: 256 }), px, 2.4, -c.d / 2 + 0.2, 1.8, 1.8);
    sofa(c, -4.5, 2.5, "#1f8a70", 0, 2);
    if (!THEME.roomExtras.shopsMx) plant(c, 5.8, 3.6, 0.9);
    // a model car on a stand, chairs at the counter, the counter's computer, a coffee table, a water cooler, the town map
    const S = smalls(c);
    S.add(cylGeo(0.55, 0.6, 0.75, 4.2, 0.375, 1.0, 20), "#e3f2ec");
    S.add(cylGeo(0.58, 0.58, 0.04, 4.2, 0.77, 1.0, 20), "#1f8a70");
    for (const [g, col] of carParts("#e45b4f")) S.add(g.scale(0.24, 0.24, 0.24).rotateY(0.6).translate(4.2, 0.79, 1.0), col);
    c.col.addCircle(4.2, 1.0, 0.65);
    for (const sx of [-0.85, 0.85]) { seat(c, sx, -1.75, Math.PI, "#1f8a70"); c.col.addCircle(sx, -1.75, 0.3); }
    S.add(boxGeo(0.6, 0.38, 0.04, 1.2, 1.38, -3.0), "#1d1d1d");
    S.add(boxGeo(0.06, 0.25, 0.06, 1.2, 1.17, -3.0), "#1d1d1d");
    S.add(boxGeo(0.44, 0.02, 0.14, 1.2, 1.09, -3.3), "#2b2f33");
    for (let i = 0; i < 3; i++) S.add(boxGeo(0.22, 0.012, 0.3, -1.4 + i * 0.26, 1.09, -2.6, 0.1 * i), ["#1f8a70", "#ffffff", "#e8c547"][i]);
    rug(c, -4.5, 3.2, 3.4, 2.6, "#8fcbb8");
    sofa(c, -2.4, 3.6, "#e8c547", -Math.PI / 2, 1.0);
    S.add(boxGeo(0.7, 1.3, 0.3, 2.6, 0.65, 4.3), "#f4f4f4");
    for (let r = 0; r < 3; r++) for (let k = 0; k < 3; k++) S.add(boxGeo(0.16, 0.24, 0.02, 0, 0, 0).rotateX(-0.2).translate(2.38 + k * 0.22, 0.45 + r * 0.36, 4.12), ["#1f8a70", "#e45b4f", "#4a7bb7", "#e8c547"][(r + k) % 4]);
    c.col.addBox(2.6, 4.3, 0.75, 0.35);
    coffeeTable(c, S, -4.5, 3.7);
    // (in this edition, theme.ts roomExtras.roomsMx, the garrafón instead of the water cooler, a minisplit on the wall)
    if (THEME.roomExtras.roomsMx) { garrafon(c, S, -6.2, -4.2); minisplitAt(S, c.w / 2 - 0.02, 3.2, -1.5, -Math.PI / 2); } else waterCooler(c, S, -6.2, -4.2);
    wallPanel(c, townMap(), -c.w / 2 + 0.03, 2.1, -0.4, 2.4, 1.6, Math.PI / 2);
    lamp(c, -3, 0, 3.4); lamp(c, 3, 0, 3.4);
    // (in this edition, theme.ts roomExtras.shopsMx: a palm in a clay pot where the plant is, a ceiling fan)
    if (THEME.roomExtras.shopsMx) { potPalm(c, S, 5.8, 3.6, 0.95); ceilingFan(S, 0, 1.2, "#f1ece2"); }
    S.done();
  }, [{ npc: "jake", x: 0, z: -3.8, rot: 0, ax: 0, az: -1.7 }], { floorKind: "tile", accent: "#1f8a70" }),

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
    // an ice-cream freezer, a magazine rack, an ATM, hot dogs on the roller, a trash can, the coffee sign
    const S = smalls(c);
    S.add(boxGeo(1.5, 0.8, 0.8, -5.6, 0.4, 0.6), "#f4f6f8");
    for (const [w, d, ox, oz] of [[1.5, 0.06, 0, -0.37], [1.5, 0.06, 0, 0.37], [0.06, 0.8, -0.72, 0], [0.06, 0.8, 0.72, 0]] as [number, number, number, number][]) S.add(boxGeo(w, 0.06, d, -5.6 + ox, 0.83, 0.6 + oz), "#c9ced6");
    for (let i = 0; i < 8; i++) S.add(boxGeo(0.28, 0.12, 0.26, -6.15 + (i % 4) * 0.36, 0.72, 0.42 + Math.floor(i / 4) * 0.36), ["#f7b2c4", "#fff1d6", "#b8e0d2", "#6b3e26"][i % 4]);
    S.add(boxGeo(1.52, 0.3, 0.02, -5.6, 0.45, 1.01), "#4a90c2");
    c.col.addBox(-5.6, 0.6, 1.5, 0.8);
    S.add(boxGeo(1.2, 1.2, 0.12, -3.2, 0.6, 4.25), "#9aa5ad");
    for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) S.add(boxGeo(0.24, 0.3, 0.02, 0, 0, 0).rotateX(-0.25).translate(-3.65 + k * 0.3, 0.36 + r * 0.36, 4.33), ["#e45b4f", "#f2c14e", "#4a7bb7", "#6fbf73", "#8e6bb0", "#f28c28"][(r + k) % 6]);
    c.col.addBox(-3.2, 4.3, 1.3, 0.3);
    S.add(boxGeo(0.62, 1.7, 0.8, 6.6, 0.85, 2.6), "#1f4f8a");
    S.add(boxGeo(0.02, 0.32, 0.42, 6.28, 1.3, 2.6), "#9fd8ff");
    S.add(boxGeo(0.12, 0.12, 0.36, 6.32, 0.98, 2.6), "#c9ced6");
    S.add(boxGeo(0.02, 0.16, 0.6, 6.28, 1.6, 2.6), "#f2c14e");
    c.col.addBox(6.6, 2.6, 0.65, 0.8);
    S.add(boxGeo(0.6, 0.16, 0.4, -4.4, 1.16, -2.8), "#c9ced6");
    for (let i = 0; i < 5; i++) S.add(new THREE.CapsuleGeometry(0.022, 0.36, 3, 6).rotateZ(Math.PI / 2).translate(-4.4, 1.26, -2.95 + i * 0.075), "#b5651d");
    S.add(cylGeo(0.22, 0.2, 0.75, -4.6, 0.375, -4.5, 12), "#3f5a4a");
    S.add(boxGeo(1.4, 1.5, 0.35, 4.6, 0.75, 4.3), "#c9ced6");
    for (let r = 0; r < 4; r++) for (let k = 0; k < 5; k++) S.add(boxGeo(0.22, 0.28, 0.06, 4.08 + k * 0.26, 0.28 + r * 0.34, 4.1), ["#f3c04f", "#e63946", "#4a7bb7", "#6a994e", "#f28c28"][(r * 2 + k) % 5]);
    c.col.addBox(4.6, 4.3, 1.45, 0.4);
    c.col.addCircle(-4.6, -4.5, 0.25);
    sign(c, "Fresh Coffee", -6, 2.7, -c.d / 2 + 0.2, 1.8, "#6b3e26", "#ffffff");
    lamp(c, -3, -1, 3.4); lamp(c, 2, 1.4, 3.4); lamp(c, -5.6, 2.4, 3.4);
    // (in this edition, theme.ts roomExtras.shopsMx: garrafones of drinking water on their rack)
    if (THEME.roomExtras.shopsMx) garrafonRack(c, S, -6.3, 3.05);
    // (theme.ts roomExtras.roomsMx) a minisplit, a tray of dulces by the till, and phone top-ups and bills paid here
    if (THEME.roomExtras.roomsMx) {
      minisplitAt(S, c.w / 2 - 0.02, 3.2, -1.2, -Math.PI / 2);
      S.add(boxGeo(0.7, 0.04, 0.4, -1.6, 1.07, -2.75), "#c79a6b");
      for (let i = 0; i < 12; i++) S.add(cylGeo(0.035, 0.035, 0.06, -1.88 + (i % 6) * 0.11, 1.12, -2.85 + Math.floor(i / 6) * 0.18, 6), ["#e4007c", "#f6c000", "#7ac143", "#f77f00", "#1f6fd1", "#ffffff"][i % 6]);
      wallPanel(c, textTexture("Recargas · Pago de servicios", { bg: "#f6c000", fg: "#7a1f2a", w: 768, h: 128 }), -3, 0.62, -2.27, 2.2, 0.37);
    }
    S.done();
  }, [{ npc: "dot", x: -3, z: -3.8, rot: 0, ax: -3, az: -1.7 }], { floorKind: "tile", accent: "#d94b3d" }),

  police: () => room("police", 12, 10, "#c9ced6", "#eef1f5", (c) => {
    counter(c, 0, -2.6, 5, 1.1, "#2a3f66", "#e6e9ee");
    c.M.add("glass", mat("#dff3fb", { transparent: 0.3 }), boxGeo(5, 1.1, 0.05, 0, 1.65, -2.1), false);
    wallPanel(c, textTexture("Maple Harbor Police · Front Desk", { bg: "#2a3f66", fg: "#ffffff", w: 768, h: 128 }), 0, 3.3, -c.d / 2 + 0.2, 4.6, 0.77);
    wallPanel(c, textTexture("EMERGENCY? CALL 911", { bg: "#c62828", fg: "#ffffff", w: 512, h: 128 }), -4.2, 2.3, -c.d / 2 + 0.2, 2.4, 0.6);
    c.M.add("bench", mat("#9c6b43"), boxGeo(2.6, 0.1, 0.6, -3.6, 0.5, 2.8)); c.col.addBox(-3.6, 2.8, 2.7, 0.7);
    if (!THEME.roomExtras.mexicanFlag) c.M.add("flag", mat("#b22234"), boxGeo(0.9, 0.6, 0.02, 4.8, 2.4, -c.d / 2 + 0.15), false);
    plant(c, 5, 3.6, 0.9);
    // a blue rug with the badge's star, behind the counter an officer's desk with files and a coffee mug, filing cabinets
    // with the coffee maker on top; for people waiting a notice board, a row of chairs, a water cooler and a coat rack.
    // (The way round the east end of the counter stays free.)
    const S = smalls(c);
    if (THEME.roomExtras.mexicanFlag) flagMx(S, 4.8, 2.4, -c.d / 2 + 0.15, 0.9);
    rug(c, 0, 0.9, 4.6, 3.0, "#2a3f66");
    // (in this edition, theme.ts roomExtras.policeMx, the town's shield with its hummingbird instead of the star; and
    // the "Denuncias" window over the counter)
    if (THEME.roomExtras.policeMx) {
      policeShield(S, 0, 0.95, 0.74);
      wallPanel(c, plainTextTexture("Denuncias · Informes", { bg: "#2a3f66", fg: "#ffffff", border: "#c9a227", w: 512, h: 96 }), 0, 2.62, -2.0, 2.4, 0.45);
      for (const s of [-1.1, 1.1]) S.add(cylGeo(0.008, 0.008, WALL_H - 2.84, s, (WALL_H + 2.84) / 2, -2.0, 4), "#3a3d42");
    } else {
      S.add(new THREE.TorusGeometry(0.95, 0.04, 4, 40).rotateX(Math.PI / 2).translate(0, 0.024, 0.9), "#d9dde2");
      S.add(floorStar(0.68, 0, 0.026, 0.9), "#d9dde2");
    }
    deskS(c, S, -4.3, -4.15, 0);
    for (let i = 0; i < 4; i++) S.add(boxGeo(0.32, 0.025, 0.24, -4.85, 0.795 + i * 0.026, -4.2, 0.15 * i - 0.2), ["#e8c872", "#d9b45a", "#e8c872", "#c94f4f"][i]);
    S.add(cylGeo(0.05, 0.045, 0.11, -3.68, 0.835, -3.98, 10), "#ffffff");
    S.add(new THREE.TorusGeometry(0.03, 0.01, 4, 8).translate(-3.62, 0.84, -3.98), "#ffffff");
    S.add(cylGeo(0.043, 0.043, 0.005, -3.68, 0.888, -3.98, 10), "#5a3a22");
    S.add(boxGeo(0.18, 0.06, 0.22, -3.82, 0.81, -4.38), "#2b2f33");
    S.add(boxGeo(0.21, 0.006, 0.29, -4.45, 0.783, -3.9, 0.3), "#ffffff");
    for (let i = 0; i < 3; i++) {
      const fx = -2.2 + i * 0.54;
      S.add(boxGeo(0.52, 1.35, 0.55, fx, 0.675, -4.72), "#8a939b");
      for (let k = 0; k < 4; k++) { S.add(boxGeo(0.46, 0.28, 0.02, fx, 0.2 + k * 0.32, -4.44), "#a3acb4"); S.add(boxGeo(0.16, 0.03, 0.03, fx, 0.28 + k * 0.32, -4.42), "#3a3d42"); }
    }
    c.col.addBox(-1.66, -4.72, 1.62, 0.55);
    S.add(boxGeo(0.3, 0.36, 0.26, -1.12, 1.53, -4.78), "#1d1d1d");
    S.add(cylGeo(0.08, 0.09, 0.14, -1.12, 1.42, -4.62, 10), "#5a3a22");
    for (let k = 0; k < 3; k++) S.add(boxGeo(0.34, 0.06, 0.26, -2.2, 1.38 + k * 0.06, -4.72, 0.1 * k), ["#e8c872", "#4a7bb7", "#e8c872"][k]);
    wallPanel(c, policeBoard(), c.w / 2 - 0.05, 1.95, 0.75, 2.2, 1.3, -Math.PI / 2);
    S.add(boxGeo(0.04, 1.38, 2.28, c.w / 2 - 0.02, 1.95, 0.75), "#6b4a2a");
    for (const cz of [0.0, 0.62, 1.24]) chairS(S, 5.45, cz, -Math.PI / 2, "#2a3f66");
    c.col.addBox(5.45, 0.62, 0.6, 1.8);
    waterCooler(c, S, -5.55, 1.0);
    coatRack(c, S, -5.4, 4.3);
    lamp(c, -3, 0.8, 3.4); lamp(c, 3, 0.8, 3.4);
    S.done();
  }, [{ npc: "reyes", x: 0, z: -3.6, rot: 0, ax: 0, az: -1.45 }], { floorKind: "tile", accent: "#2a3f66" }),

  apartments: () => room("apartments", 20, 14, "#b58b62", "#f5efe6", (c) => {
    // hallway (west) with Rita's door, and the vacant apartment (east)
    c.M.add("divider", mat("#e6dccd"), boxGeo(0.25, WALL_H, 8.5, -3, WALL_H / 2, -2.75)); c.col.addBox(-3, -2.75, 0.4, 8.5);
    c.M.add("door-rita", mat("#8a5a44"), boxGeo(1.2, 2.4, 0.08, -7, 1.2, -c.d / 2 + 0.06), false);
    // (in Las Palmas, theme.ts roomExtras.lasPalmas, the number on a talavera tile)
    wallPanel(c, textTexture("2C", THEME.roomExtras.lasPalmas ? { bg: "#f7f3ea", fg: "#1f4e9c", border: "#1f4e9c", w: 128, h: 96 } : { bg: "#c9a227", fg: "#3b2a20", w: 128, h: 96 }), -7, 2.7, -c.d / 2 + 0.2, 0.5, 0.36);
    c.M.add("door-2b", mat("#8a5a44"), boxGeo(0.08, 2.4, 1.2, -3.1, 1.2, 2.6), false);
    wallPanel(c, textTexture("Hallway · 2nd floor", { bg: "#fff8ec", fg: "#8a5a44", w: 512, h: 96 }), -7, 3.4, -c.d / 2 + 0.2, 2.4, 0.45);
    plant(c, -9.2, 5.5, 0.8);
    // the apartment for rent (bright, some furniture)
    windowBack(c, 3, 3.4); windowBack(c, 7.5, 2.2);
    sofa(c, 5, 1.8, "#9aa5ad", Math.PI);
    table(c, 5, -1.2, { cloth: "#e8e2d6", chairs: 0, w: 1.2, d: 0.7 });
    c.M.add("kitchen", mat("#f4f4f4"), boxGeo(4, 1, 0.7, 5, 0.5, -6.6)); c.col.addBox(5, -6.6, 4, 0.7);
    c.M.add("fridge", mat("#e6e9ee"), boxGeo(0.9, 2, 0.8, 8.6, 1, -6.5)); c.col.addBox(8.6, -6.5, 0.9, 0.8);
    if (!THEME.roomExtras.lasPalmas) c.M.add("radiator", mat("#ffffff"), boxGeo(1.6, 0.7, 0.2, 0.5, 0.45, -6.8));
    c.M.add("boxes", mat("#c8a27a"), boxGeo(0.8, 0.6, 0.6, 1, 0.3, 4.5)); c.col.addBox(1, 4.5, 0.8, 0.6);
    rug(c, 5, 1, 4, 3, "#c9785b");
    wallPanel(c, textTexture("FOR RENT · 2B", { bg: "#ffffff", fg: "#c9785b", w: 512, h: 128 }), 5, 3.5, -c.d / 2 + 0.2, 2.6, 0.65);
    if (THEME.roomExtras.lasPalmas) lasPalmas(c);
  }, [{ npc: "rita", x: -7, z: -5.2, rot: 0 }, { npc: "patel", x: 3, z: -2.6, rot: Math.PI / 4 }], { floorKind: "wood", accent: "#8a5a44" }),

  "dans-house": () => room("dans-house", 16, 12, "#a67c52", "#f7ecdc", (c) => {
    table(c, 1.5, -1.5, { cloth: "#f2efe8", chairs: 4, w: 2.6, d: 1.2 });
    for (let i = 0; i < 4; i++) c.M.add("plate", mat("#ffffff"), cylGeo(0.2, 0.2, 0.02, 0.6 + i * 0.6, 0.8, -1.5 + (i % 2 ? 0.3 : -0.3), 12), false);
    if (!THEME.roomExtras.yucatanDinner) c.M.add("lasagna", mat("#d9763a", { flat: true }), boxGeo(0.6, 0.12, 0.4, 1.5, 0.86, -1.5), false);
    c.M.add("vase", mat("#4a7bb7"), cylGeo(0.1, 0.12, 0.3, 2.6, 0.95, -1.5, 8), false);
    for (let i = 0; i < 5; i++) c.M.add("flowers", mat(["#e84a5f", "#ffd166", "#f7a072"][i % 3], { flat: true }), new THREE.SphereGeometry(0.07, 6, 4).translate(2.52 + (i % 3) * 0.08, 1.2 + (i % 2) * 0.06, -1.55 + (i % 2) * 0.08), false);
    c.M.add("kitchen", mat("#f4f4f4"), boxGeo(4, 1, 0.7, 5.2, 0.5, -5.3)); c.col.addBox(5.2, -5.3, 4, 0.7);
    c.M.add("stove", mat("#2b2b2b"), boxGeo(0.9, 0.05, 0.6, 4.2, 1.03, -5.3), false);
    sofa(c, -5, 2.5, "#b5452f", 0, 2.4);
    rug(c, -5, 1.2, 3.4, 2.4, "#e8c07a");
    framedArt(c, 7, -5, 2.4, -c.d / 2 + 0.2, 1.8, 1.3);
    // a Yucatecan home (theme.ts `homeMx`): over the family altar the Virgin of Guadalupe instead of a painting, and a
    // ceiling fan over the table instead of the lamp
    if (THEME.homeMx) framedTex(c, guadalupe(), -1.5, 2.55, -c.d / 2 + 0.2, 0.8, 1.05);
    else framedArt(c, 11, -1.5, 2.6, -c.d / 2 + 0.2, 1.2, 1);
    if (!THEME.homeMx) lamp(c, 1.5, -1.5, 3.1);
    plant(c, -7.2, -5.2, 1);
    c.M.add("coat-rack", mat("#5a3a2a"), cylGeo(0.05, 0.08, 1.8, -2.5, 0.9, 5, 6));
    if (THEME.roomExtras.yucatanDinner || THEME.homeMx) {
      const S = smalls(c);
      if (THEME.roomExtras.yucatanDinner) yucatanDinner(c, S);
      if (THEME.homeMx) homeMx(c, S);
      S.done();
    }
  }, [{ npc: "dan", x: -1, z: 2.8, rot: Math.PI * 0.85 }, { npc: "nora", x: 4.2, z: -4.3, rot: 0.3 }], { floorKind: "wood", accent: "#6b4a3a", warm: true }),

  office: () => room("office", 22, 16, "#b9c2cc", "#eef3f7", (c) => {
    counter(c, -7.5, 4.2, 3, 0.9, "#34495e", "#e6e9ee");
    wallPanel(c, textTexture("Brightline", { bg: "#34495e", fg: "#ffd166", w: 512, h: 128 }), -7.5, 3.3, -c.d / 2 + 0.2, 3.2, 0.8);
    // interview/meeting room with glass walls (west)
    c.M.add("glass-wall", mat("#dff3fb", { transparent: 0.28 }), boxGeo(0.08, 2.8, 6, -3.2, 1.4, -4.8), false);
    c.M.add("glass-wall", mat("#dff3fb", { transparent: 0.28 }), boxGeo(3.5, 2.8, 0.08, -9.2, 1.4, -1.8), false);
    c.col.addBox(-3.2, -4.8, 0.2, 6); c.col.addBox(-9.2, -1.8, 3.5, 0.2);
    table(c, -7, -5.2, { cloth: "#e9e4da", chairs: 0, w: 2.4, d: 1.2 });
    seat(c, -7, -6.4, 0, "#2d3a4a"); // Ms. Brooks's chair
    seat(c, -6.1, -3.95, Math.PI, "#2d3a4a"); // Greg's (advanced song P27: Vanessa presents at the table's west end)
    c.M.add("tv", mat("#1d1d1d"), boxGeo(2.4, 1.3, 0.08, -7, 2.2, -c.d / 2 + 0.1), false);
    // desks (open space)
    for (const [dx, dz] of [[1, -4.5], [4, -4.5], [1, -1], [4, -1], [7, -1]]) desk(c, dx, dz);
    // team room with glass walls (north-east corner): Kate and Paul at the table, Sara on the screen
    c.M.add("glass-wall", mat("#dff3fb", { transparent: 0.28 }), boxGeo(0.08, 2.8, 4.7, 6.2, 1.4, -5.65), false);
    c.M.add("glass-wall", mat("#dff3fb", { transparent: 0.28 }), boxGeo(1.8, 2.8, 0.08, 7.1, 1.4, -3.3), false);
    c.col.addBox(6.2, -5.65, 0.2, 4.7); c.col.addBox(7.1, -3.3, 1.8, 0.2);
    table(c, 8.6, -5.7, { cloth: "#e9e4da", chairs: 0, w: 2.5, d: 1 });
    c.col.addBox(8.6, -5.7, 2.5, 1);
    seat(c, 7.75, -6.75, 0.1, "#2d3a4a"); seat(c, 9.45, -6.75, -0.15, "#2d3a4a");
    c.M.add("laptop", mat("#9aa5ad"), boxGeo(0.4, 0.03, 0.28, 7.85, 0.8, -6), false);
    c.M.add("tv", mat("#1d1d1d"), boxGeo(2.2, 1.25, 0.08, 8.6, 2.45, -c.d / 2 + 0.1), false);
    wallPanel(c, videoCall(), 8.6, 2.45, -c.d / 2 + 0.15, 2.04, 1.15);
    wallPanel(c, textTexture("Team Room", { bg: "#34495e", fg: "#ffffff", w: 384, h: 96 }), 8.6, 3.5, -c.d / 2 + 0.2, 1.6, 0.4);
    // kitchen corner with the coffee machine
    counter(c, 8.5, 5.4, 4, 0.8, "#f4f4f4", "#dfe3ea");
    c.M.add("coffee-machine", mat("#1d1d1d"), boxGeo(0.7, 0.8, 0.5, 7.4, 1.5, 5.4));
    c.M.add("coffee-machine-2", mat("#2e8b57"), boxGeo(0.72, 0.15, 0.52, 7.4, 1.95, 5.4));
    c.M.add("fridge", mat("#e6e9ee"), boxGeo(0.9, 2, 0.8, 10.4, 1, 5.4)); c.col.addBox(10.4, 5.4, 0.9, 0.8);
    wallPanel(c, textTexture("Kitchen", { bg: "#2e8b57", fg: "#ffffff", w: 256, h: 64 }), 8.5, 2.6, 5.8, 1.6, 0.4, Math.PI);
    // the printer, "by the window"
    windowBack(c, -1.6, 2.2, 1.8, 2.3);
    c.M.add("printer", mat("#d9dde2"), boxGeo(1, 1, 0.7, -1.6, 0.5, -7.25)); c.col.addBox(-1.6, -7.25, 1, 0.7);
    // Emily's small glass office (advanced song P28, the review), south of the meeting room: its north wall is the
    // meeting room's (made a little longer), the door is the gap at the south end of its east wall. Emily sits at
    // her desk facing the door side, the window with the harbor and a plant on the sill on her right.
    const glass = mat("#dff3fb", { transparent: 0.28 });
    c.M.add("glass-wall", glass, boxGeo(1.05, 2.8, 0.08, -6.925, 1.4, -1.8), false); c.col.addBox(-6.925, -1.8, 1.05, 0.2);
    c.M.add("glass-wall", glass, boxGeo(0.08, 2.8, 3.8, -6.4, 1.4, 0.1), false); c.col.addBox(-6.4, 0.1, 0.2, 3.8);
    c.M.add("glass-wall", glass, boxGeo(4.6, 2.8, 0.08, -8.7, 1.4, 3.6), false); c.col.addBox(-8.7, 3.6, 4.6, 0.2);
    for (const fz of [-1.8, 2.0, 3.6]) c.M.add("glass-frame", mat("#34495e"), boxGeo(0.1, 2.8, 0.1, -6.4, 1.4, fz), false);
    c.M.add("glass-frame", mat("#34495e"), boxGeo(0.1, 0.1, 5.5, -6.4, 2.8, 0.9), false);
    c.M.add("glass-frame", mat("#34495e"), boxGeo(4.6, 0.1, 0.1, -8.7, 2.8, 3.6), false);
    c.M.add("glass-frame", mat("#34495e"), boxGeo(4.6, 0.1, 0.1, -8.7, 2.8, -1.8), false);
    wallPanel(c, textTexture("Emily", { bg: "#34495e", fg: "#ffffff", w: 256, h: 96 }), -6.34, 1.75, 1.2, 0.6, 0.225, Math.PI / 2);
    // the desk: a laptop with a spreadsheet (turned to her), the printed agenda and a pen, a mug
    c.M.add("desk", mat("#e9e4da"), boxGeo(1.6, 0.06, 0.8, -8.9, 0.75, 1.95));
    for (const s of [-0.72, 0.72]) c.M.add("desk-leg", mat("#7a7a7a"), boxGeo(0.06, 0.74, 0.7, -8.9 + s, 0.37, 1.95));
    c.col.addBox(-8.9, 1.95, 1.6, 0.8);
    c.M.add("laptop", mat("#9aa5ad"), boxGeo(0.4, 0.025, 0.28, -8.95, 0.79, 1.82), false);
    c.M.add("laptop", mat("#9aa5ad"), boxGeo(0.4, 0.26, 0.02, 0, 0, 0).rotateX(0.25).translate(-8.95, 0.92, 1.97), false);
    c.M.add("screen", mat("#e8f1e8", { emissive: "#3a5a46" }), boxGeo(0.36, 0.22, 0.005, 0, 0, 0).rotateX(0.25).translate(-8.95, 0.92, 1.955), false);
    c.M.add("paper", mat("#ffffff"), boxGeo(0.21, 0.004, 0.29, 0, 0.782, 0, 0.2).translate(-8.4, 0, 1.75), false);
    c.M.add("pen", mat("#1f4f8a"), cylGeo(0.008, 0.008, 0.14, 0, 0, 0, 5).rotateZ(Math.PI / 2).rotateY(0.6).translate(-8.3, 0.79, 1.95), false);
    c.M.add("mug-#2e8b57", mat("#2e8b57"), cylGeo(0.05, 0.045, 0.1, -9.5, 0.83, 1.7, 8), false);
    seat(c, -8.9, 0.9, 0, "#2d3a4a"); // Emily's chair
    // behind her: a low cabinet against the glass with binders and a little plant
    c.M.add("cabinet", mat("#c9ced6"), boxGeo(3.4, 0.75, 0.45, -8.9, 0.375, -1.45)); c.col.addBox(-8.9, -1.45, 3.4, 0.45);
    for (let i = 0; i < 6; i++) c.M.add("binder-" + i % 3, mat(["#2c4f8f", "#e8743b", "#2e8b57"][i % 3]), boxGeo(0.07, 0.3, 0.24, -10.2 + i * 0.09, 0.9, -1.45), false);
    c.M.add("pot", mat("#b86b4b"), cylGeo(0.13, 0.1, 0.22, -7.65, 0.86, -1.45, 10), false);
    c.M.add("leaves", mat("#4c8c3c", { flat: true }), new THREE.IcosahedronGeometry(0.22, 0).translate(-7.65, 1.1, -1.45), false);
    // the window in the west wall: the harbor outside, and a plant pot on the sill
    wallPanel(c, harborView(), -c.w / 2 + 0.03, 1.95, 1.2, 2.2, 1.4, Math.PI / 2);
    c.M.add("win-frame", mat("#ffffff"), boxGeo(0.1, 1.5, 0.08, -c.w / 2 + 0.06, 1.95, 1.2), false);
    for (const fz of [0.07, 2.33]) c.M.add("win-frame", mat("#ffffff"), boxGeo(0.1, 1.5, 0.08, -c.w / 2 + 0.06, 1.95, fz), false);
    c.M.add("win-frame", mat("#ffffff"), boxGeo(0.1, 0.08, 2.34, -c.w / 2 + 0.06, 2.68, 1.2), false);
    c.M.add("sill", mat("#ffffff"), boxGeo(0.3, 0.06, 2.4, -c.w / 2 + 0.15, 1.22, 1.2));
    c.M.add("pot", mat("#b86b4b"), cylGeo(0.12, 0.09, 0.2, -c.w / 2 + 0.17, 1.35, 0.55, 10), false);
    c.M.add("leaves", mat("#4c8c3c", { flat: true }), new THREE.IcosahedronGeometry(0.17, 0).translate(-c.w / 2 + 0.17, 1.56, 0.55), false);
    c.M.add("leaves", mat("#5fa24b", { flat: true }), new THREE.IcosahedronGeometry(0.11, 0).translate(-c.w / 2 + 0.2, 1.7, 0.48), false);
    // (in this edition, theme.ts roomExtras.roomsMx, in clay pots: officeMx)
    if (!THEME.roomExtras.roomsMx) { plant(c, -10.2, 6.8, 1.1); plant(c, 1, 6.8, 0.9); }
    for (let i = 0; i < 4; i++) lamp(c, -6 + i * 5, 0, 3.6);
    // the open-plan desks get their keyboards, mugs, papers and plants; a lounge corner, a whiteboard, a bookcase of
    // binders, a coat rack by the door, a picture and a water cooler
    const S = smalls(c);
    [[1, -4.5], [4, -4.5], [1, -1], [4, -1], [7, -1]].forEach(([dx, dz], i) => {
      S.add(boxGeo(0.46, 0.02, 0.15, dx, 0.79, dz + 0.08), "#2b2f33");
      S.add(boxGeo(0.07, 0.03, 0.11, dx + 0.36, 0.795, dz + 0.1), "#2b2f33");
      S.add(cylGeo(0.045, 0.04, 0.1, dx + 0.62, 0.83, dz + 0.05, 8), ["#e8743b", "#ffffff", "#2a9d8f", "#f2c14e", "#8e6bb0"][i]);
      S.add(boxGeo(0.21, 0.006, 0.29, dx - 0.5, 0.782, dz + 0.05, 0.15 * (i - 2)), "#ffffff");
      if (i % 2 === 0) { S.add(cylGeo(0.07, 0.055, 0.12, dx - 0.62, 0.84, dz - 0.25, 8), "#b86b4b"); S.add(new THREE.IcosahedronGeometry(0.12, 0).translate(dx - 0.62, 1.0, dz - 0.25), "#4c8c3c"); }
      else S.add(boxGeo(0.14, 0.18, 0.02, dx - 0.6, 0.87, dz - 0.25), "#c9a227");
    });
    rug(c, -2.6, 4.7, 4.0, 3.0, "#5b7088");
    table(c, -3.3, 0.9, { round: true, cloth: "#e9e4da", chairs: 4, chairColor: "#2d3a4a", from: Math.PI / 4 });
    S.add(boxGeo(0.34, 0.02, 0.24, -3.4, 0.8, 0.8, 0.4), "#9aa5ad");
    S.add(boxGeo(0.21, 0.006, 0.29, -3.0, 0.792, 1.1, -0.3), "#ffffff");
    rug(c, -3.3, 0.9, 3.0, 3.0, "#d6dde5");
    sofa(c, -2.6, 5.7, "#34495e", Math.PI, 2.4);
    coffeeTable(c, S, -2.6, 4.4, "#e9e4da");
    plant(c, -4.9, 5.8, 0.9);
    wallPanel(c, officeBoard(), 2.6, 2.1, -c.d / 2 + 0.06, 2.4, 1.4);
    S.add(boxGeo(2.5, 0.06, 0.12, 2.6, 1.34, -c.d / 2 + 0.1), "#c9ced6");
    framedArt(c, 3, 4.9, 2.2, -c.d / 2 + 0.2, 1.1, 0.85);
    shelf(c, c.w / 2 - 0.3, 0.4, 3.6, 2.2, "#c9ced6", ["#2c4f8f", "#e8743b", "#2e8b57", "#f4f4f4", "#8e6bb0"], -Math.PI / 2, 0.45);
    coatRack(c, S, -2.2, 7.1);
    // (in this edition, theme.ts roomExtras.roomsMx, the garrafón; plants in clay pots, minisplits in the glass rooms)
    if (THEME.roomExtras.roomsMx) {
      garrafon(c, S, 6.0, 5.45);
      clayPlant(c, S, -10.2, 6.8, 1.15); clayPlant(c, S, 1, 6.8, 0.95);
      minisplitAt(S, -c.w / 2 + 0.02, 3.3, -5.4, Math.PI / 2); minisplitAt(S, c.w / 2 - 0.02, 3.4, -5.6, -Math.PI / 2);
    } else waterCooler(c, S, 6.0, 5.45);
    S.done();
  }, [
    // the office chairs (seat) are 0.48 m high
    { npc: "brooks", x: -7, z: -6.4, rot: 0, sit: true, seat: 0.48 }, { npc: "maria", x: 5.5, z: 2.4, rot: Math.PI },
    { npc: "vanessa", x: -9.4, z: -5.0, rot: Math.PI / 2, ax: -9.1, az: -3.05 }, { npc: "greg", x: -6.1, z: -3.95, rot: Math.PI, sit: true, seat: 0.48 },
    // there is no way round the desk and the round table to Paul's chair: he is talked to from Kate's spot (he joins her
    // meeting; listed after her, so there the "Kalbėtis" prompt names Kate and E starts it)
    { npc: "kate", x: 7.75, z: -6.75, rot: 0.1, sit: true, seat: 0.48, ax: 8.6, az: -4.35 }, { npc: "paul", x: 9.45, z: -6.75, rot: -0.15, sit: true, seat: 0.48, ax: 8.6, az: -4.35 },
    { npc: "emily", x: -8.9, z: 0.9, rot: 0, sit: true, seat: 0.48, ax: -8.9, az: 3.0 },
  ], { floorKind: "carpet", accent: "#34495e" }),

  "the-pier": () => room("the-pier", 18, 14, "#8f6b4e", "#eaf3f7", (c) => {
    for (const wx of [-6, 0, 6]) windowBack(c, wx, 5, 2.6, 2.1, "#8fd3f0");
    // the date (Sam or Emma) waits at the middle table, on its one chair on the far side; you stand on the near side
    // (in this edition, theme.ts roomExtras.muelleMx, each table's chairs in a bright color of their own)
    const bright = ["#e4007c", "#00a6a6", "#f6a800", "#7ac143", "#ff5a36"];
    [[-5, -3.5], [0, -3.5], [5, -3.5], [-5, 1], [5, 1]].forEach(([tx, tz], i) => {
      const date = tx === 0 && tz === -3.5;
      table(c, tx, tz, { round: true, cloth: "#f7f1e6", chairs: date ? 1 : 2, from: date ? -Math.PI / 2 : undefined, chairColor: THEME.roomExtras.muelleMx ? bright[i] : "#1d4e6b" });
    });
    for (const [tx, tz] of [[-5, -3.5], [0, -3.5], [5, -3.5], [-5, 1], [5, 1]]) c.M.add("candle", mat("#fff3c4", { emissive: "#c99a2e" }), cylGeo(0.04, 0.04, 0.18, tx, 0.88, tz, 6), false);
    counter(c, 0, 3.8, 5, 0.9, "#1d4e6b", "#eaf3f7");
    // the kitchen along the east wall (advanced song P28): a steel counter with the stove, Chef Whitaker and Mia
    c.M.add("kitchen", mat("#c9ced3"), boxGeo(0.8, 1, 3.6, 8.5, 0.5, -0.8)); c.col.addBox(8.5, -0.8, 0.8, 3.6);
    c.M.add("stove", mat("#2b2b2b"), boxGeo(0.66, 0.05, 1.3, 8.5, 1.03, -1.7), false);
    for (const [pz, pc] of [[-2.05, "#9aa5ad"], [-1.35, "#b86b4b"]] as [number, string][]) c.M.add("pot-" + pc, mat(pc), cylGeo(0.2, 0.17, 0.24, 8.5, 1.17, pz, 10), false);
    for (const pz of [-0.2, 0.25, 0.7]) c.M.add("plate", mat("#ffffff"), cylGeo(0.17, 0.17, 0.02, 8.4, 1.02, pz, 12), false);
    wallPanel(c, textTexture("Kitchen", { bg: "#1d4e6b", fg: "#ffffff", w: 256, h: 64 }), c.w / 2 - 0.12, 2.5, -0.8, 1.4, 0.35, -Math.PI / 2);
    c.M.add("lifebuoy", mat("#e45b4f"), new THREE.TorusGeometry(0.4, 0.12, 8, 16).rotateY(Math.PI / 2).translate(-c.w / 2 + 0.2, 2.6, 0), false);
    lamp(c, -5, -3.5, 3.2); lamp(c, 0, -3.5, 3.2); lamp(c, 5, -3.5, 3.2);
    plant(c, 8, 5.5, 0.9);
    if (THEME.roomExtras.muelleMx) muelleMx(c);
  }, [{ npc: "sam", x: 0, z: -4.45, rot: 0, sit: true, ax: 0, az: -2.25 }, { npc: "emma", x: 0, z: -4.45, rot: 0, sit: true, ax: 0, az: -2.25 },
    { npc: "whitaker", x: 7.5, z: -1.3, rot: -Math.PI / 2, ax: 5.95, az: -1.1 }, { npc: "russo", x: 7.55, z: 0.45, rot: -Math.PI / 2 - 0.35 }],
    { floorKind: "wood", accent: "#1d4e6b", warm: true }),

  // Harbor Family Clinic: a small waiting corner by the door, the exam room behind it. Dr. Carter stands
  // beside the exam table.
  clinic: () => room("clinic", 16, 12, "#e4ebee", "#f3f8f9", (c) => {
    // exam table against the back wall (head end raised, a paper sheet), with a step
    c.M.add("exam-base", mat("#dfe6ea"), boxGeo(1.9, 0.62, 0.62, -0.1, 0.31, -5.25));
    c.M.add("exam-pad", mat("#4a90a8"), boxGeo(2.05, 0.14, 0.78, -0.1, 0.69, -5.25));
    c.M.add("exam-pad", mat("#4a90a8"), boxGeo(0.66, 0.12, 0.78, 0, 0, 0).rotateZ(-0.42).translate(-0.86, 0.88, -5.25));
    c.M.add("exam-paper", mat("#ffffff"), boxGeo(1.5, 0.02, 0.56, 0.12, 0.77, -5.25), false);
    c.M.add("exam-base", mat("#dfe6ea"), boxGeo(0.5, 0.22, 0.34, 0.2, 0.11, -4.62));
    c.col.addBox(-0.1, -5.2, 2.1, 1.1);
    // sink and cabinets
    counter(c, -4.6, -5.5, 3.4, 0.7, "#dfe6ea", "#f4f7f8");
    c.M.add("sink", mat("#c9d3d8"), boxGeo(0.62, 0.05, 0.42, -5.5, 1.07, -5.45), false);
    c.M.add("faucet", mat("#9aa5ad"), cylGeo(0.03, 0.03, 0.32, -5.5, 1.24, -5.72, 6), false);
    c.M.add("cabinet", mat("#e9eff2"), boxGeo(3.4, 0.9, 0.4, -4.6, 2.55, -5.78));
    for (const [gx, gc] of [[-3.6, "#6fbf73"], [-3.2, "#4a7bb7"]] as [number, string][]) c.M.add("goods-" + gc, mat(gc), boxGeo(0.3, 0.16, 0.2, gx, 1.16, -5.6), false);
    // blood pressure monitor by the table, the doctor's desk, the eye chart, the lungs poster
    c.M.add("bp-monitor", mat("#34495e"), boxGeo(0.34, 0.28, 0.1, -1.95, 1.65, -c.d / 2 + 0.06), false);
    c.M.add("bp-screen", mat("#bfe8d8", { emissive: "#2c5a48" }), boxGeo(0.24, 0.14, 0.02, -1.95, 1.68, -c.d / 2 + 0.12), false);
    desk(c, 4.8, -5.1);
    wallPanel(c, eyeChart(), c.w / 2 - 0.05, 2.1, -2.2, 0.8, 1.2, -Math.PI / 2);
    wallPanel(c, lungsPoster(), 2.3, 2.35, -c.d / 2 + 0.2, 0.9, 1.12);
    sign(c, "Harbor Family Clinic", -0.1, 3.45, -c.d / 2 + 0.2, 4.4, "#3a86b0", "#ffffff");
    // waiting corner: seats along the west wall, magazines, water cooler, check-in desk
    c.M.add("seats", mat("#3a86b0"), boxGeo(0.6, 0.45, 2.8, -7.35, 0.45, 0.3));
    c.M.add("seats", mat("#3a86b0"), boxGeo(0.1, 0.6, 2.8, -7.62, 0.9, 0.3));
    c.col.addBox(-7.35, 0.3, 0.7, 2.9);
    c.M.add("coffee-table", mat("#c8a27a"), boxGeo(0.6, 0.42, 1.1, -6.3, 0.21, 0.3)); c.col.addBox(-6.3, 0.3, 0.6, 1.1);
    for (const [mz, mc] of [[0, "#e45b4f"], [0.45, "#f2c14e"]] as [number, string][]) c.M.add("goods-" + mc, mat(mc), boxGeo(0.34, 0.02, 0.26, -6.3, 0.43, mz), false);
    // (in this edition, theme.ts roomExtras.clinicMx: the garrafón on its stand there, clinicMx)
    const mx = THEME.roomExtras.clinicMx;
    if (!mx) {
      c.M.add("cooler", mat("#f4f6f8"), boxGeo(0.45, 1.0, 0.45, -7.4, 0.5, -3.2)); c.col.addBox(-7.4, -3.2, 0.5, 0.5);
      c.M.add("cooler-bottle", mat("#9fd3ec", { transparent: 0.6 }), cylGeo(0.17, 0.17, 0.45, -7.4, 1.23, -3.2, 12), false);
    }
    counter(c, -4.6, 3.5, 2.8, 0.8, "#3a86b0", "#f4f7f8");
    c.M.add("monitor", mat("#1d1d1d"), boxGeo(0.5, 0.34, 0.05, -4.2, 1.3, 3.3));
    sign(c, "Check-in", -4.6, 0.6, 3.93, 1.4, "#ffffff", "#3a86b0");
    // east side: a doctor's scale, a stool, a second exam room's door, hand sanitizer
    c.M.add("scale", mat("#dfe3e6"), boxGeo(0.5, 0.08, 0.55, 6.9, 0.04, -1.2));
    c.M.add("scale-post", mat("#9aa5ad"), boxGeo(0.07, 1.5, 0.07, 6.9, 0.8, -1.45));
    c.M.add("scale-post", mat("#9aa5ad"), boxGeo(0.34, 0.07, 0.06, 6.9, 1.45, -1.42));
    c.col.addBox(6.9, -1.25, 0.6, 0.6);
    c.M.add("stool", mat("#34495e"), cylGeo(0.22, 0.22, 0.08, 2.75, 0.58, -5.05, 12));
    c.M.add("stool-leg", mat("#9aa5ad"), cylGeo(0.03, 0.03, 0.55, 2.75, 0.28, -5.05, 6));
    c.col.addCircle(2.75, -5.05, 0.24);
    c.M.add("door-exam2", mat("#8fbcd0"), boxGeo(0.08, 2.3, 1.2, c.w / 2 - 0.05, 1.15, 1.6), false);
    c.M.add("door-handle", mat("#9aa5ad"), boxGeo(0.06, 0.06, 0.24, c.w / 2 - 0.12, 1.1, 1.15), false);
    wallPanel(c, textTexture("Exam Room 2", { bg: "#ffffff", fg: "#3a86b0", w: 384, h: 96 }), c.w / 2 - 0.06, 2.6, 1.6, 1.3, 0.33, -Math.PI / 2);
    c.M.add("sanitizer", mat("#dfe6ea"), boxGeo(0.16, 0.26, 0.1, 3.9, 1.3, -c.d / 2 + 0.06), false);
    if (!mx) { plant(c, -7.2, 5.1, 0.9); plant(c, 7.2, 5, 0.9); }
    lamp(c, -0.1, -3.4, 3.3); lamp(c, 4.8, -3.4, 3.3); lamp(c, -5.5, 0.5, 3.3);
    if (mx) clinicMx(c);
    // (theme.ts roomExtras.roomsMx) the children's corner in the waiting room, the vaccination poster, a minisplit
    if (THEME.roomExtras.roomsMx) {
      const S = smalls(c);
      kidsCorner(c, S, -2.9, 0.6);
      minisplitAt(S, c.w / 2 - 0.02, 3.3, -4.4, -Math.PI / 2);
      S.done();
      wallPanel(c, vacunaPoster(), 6.4, 2.35, -c.d / 2 + 0.06, 0.9, 1.24);
    }
  }, [{ npc: "carter", x: 1.75, z: -4.3, rot: -0.12 }], { floorKind: "tile", accent: "#3a86b0" }),

  // Harbor Market: fruit, vegetables and bread at the front by the door (west), two aisles, the dairy fridges
  // along the back, two checkout lanes and the self-checkout. Marcus works lane 1. The aisle numbers follow
  // the conversation (rice and pasta in aisle 3, coffee and tea in aisle 4, dairy in aisle 7 at the back).
  market: () => THEME.market === "mercado" ? mercado() : room("market", 22, 16, "#ece8df", "#f7f2e8", (c) => {
    const fruit = ["#e63946", "#f4a261", "#ffbe0b", "#8ab17d", "#2a9d8f", "#e76f51"];
    // produce tables, then a table of bread (front, west)
    [0.2, 2.6].forEach((pz, k) => {
      c.M.add("counter-#8a5a3c", mat("#8a5a3c"), boxGeo(1.4, 0.8, 2.2, -9, 0.4, pz));
      for (let i = 0; i < 24; i++) {
        const col = fruit[(k * 3 + Math.floor(i / 8)) % fruit.length];
        c.M.add("goods-" + col, mat(col, { flat: true }), new THREE.SphereGeometry(0.13, 6, 5).translate(-9.5 + (i % 4) * 0.33, 0.9, pz - 0.95 + Math.floor(i / 4) * 0.33), false);
      }
      c.col.addBox(-9, pz, 1.4, 2.2);
    });
    c.M.add("counter-#8a5a3c", mat("#8a5a3c"), boxGeo(1.4, 0.8, 2.2, -9, 0.4, 5));
    for (let i = 0; i < 8; i++) c.M.add("bread-" + (i % 2), mat(["#c68642", "#e0a45e"][i % 2], { flat: true }), new THREE.CapsuleGeometry(0.11, 0.34, 3, 6).rotateX(Math.PI / 2).translate(-9.4 + (i % 2) * 0.7, 0.93, 4.2 + Math.floor(i / 2) * 0.5), false);
    c.col.addBox(-9, 5, 1.4, 2.2);
    sign(c, "Fresh Produce · Bakery", -9, 2.9, 2.6, 2.8, "#23704a", "#ffffff");
    // two aisles (shelves back to back)
    const goodsA = ["#e45b4f", "#f2c14e", "#4a7bb7", "#6fbf73", "#f28c28", "#b5838d", "#ffffff"];
    const goodsB = ["#d4a373", "#e9c46a", "#e76f51", "#2a9d8f", "#8e6bb0", "#f4f4f4"];
    for (const [rz, name, sx] of [[-4.6, "Aisle 4 · Coffee · Tea", 1.6], [-1.8, "Aisle 3 · Rice · Pasta", -3.2]] as [number, string, number][]) {
      shelf(c, -1.2, rz + 0.25, 11.8, 1.9, "#f4f4f4", goodsA, 0, 0.5);
      shelf(c, -1.2, rz - 0.25, 11.8, 1.9, "#f4f4f4", goodsB, Math.PI, 0.5);
      sign(c, name, sx, 2.75, rz, 3, "#ffffff", "#23704a");
    }
    // dairy fridges along the back wall (open boxes behind glass doors, three shelves of milk, eggs, cheese…)
    for (let i = 0; i < 4; i++) {
      const fx = -0.8 + i * 2.6;
      const fridge = mat("#e8edf0");
      c.M.add("fridge", fridge, boxGeo(2.5, 2.2, 0.1, fx, 1.1, -7.9));
      c.M.add("fridge", fridge, boxGeo(2.5, 0.3, 0.8, fx, 0.15, -7.55));
      c.M.add("fridge", fridge, boxGeo(2.5, 0.2, 0.8, fx, 2.1, -7.55));
      for (const s of [-1, 1]) c.M.add("fridge", fridge, boxGeo(0.08, 2.2, 0.8, fx + s * 1.21, 1.1, -7.55));
      for (const y of [0.92, 1.54]) c.M.add("fridge", fridge, boxGeo(2.34, 0.03, 0.66, fx, y, -7.55), false);
      for (let s = 0; s < 3; s++) for (let k = 0; k < 6; k++) {
        const gc = ["#ffffff", "#f2e3c6", "#ffd23f", "#9fd3ec", "#f7a7b8"][(i + s + k) % 5];
        c.M.add("goods-" + gc, mat(gc), boxGeo(0.26, 0.3, 0.26, fx - 0.95 + k * 0.38, 0.45 + s * 0.62, -7.45), false);
      }
      c.M.add("fridge-glass", mat("#dff3fb", { transparent: 0.35 }), boxGeo(2.34, 1.7, 0.04, fx, 1.15, -7.14), false);
    }
    c.col.addBox(3.1, -7.55, 10.4, 0.8);
    sign(c, "Aisle 7 · Dairy · Eggs", 3.1, 2.45, -7.08, 3.2, "#9fd3ec", "#1f4f8a");
    sign(c, "HARBOR MARKET", 3.1, 3.5, -c.d / 2 + 0.2, 4, "#23704a", "#ffffff");
    wallPanel(c, textTexture("Orange Juice · 2 for $5", { bg: "#ffd23f", fg: "#b3261e", w: 512, h: 128 }), -4.2, 2.3, -c.d / 2 + 0.2, 2.8, 0.7);
    // checkout lanes: a belt, the register, a card reader, a candy rack
    for (const [lx, open] of [[-3.6, true], [2.4, false]] as [number, boolean][]) {
      counter(c, lx, 1.8, 3.4, 0.9, "#23704a", "#e6e9ee");
      c.M.add("conveyor", mat("#2b2f33"), boxGeo(2.1, 0.03, 0.6, lx - 0.55, 1.1, 1.8), false);
      c.M.add("register", mat("#34495e"), boxGeo(0.46, 0.34, 0.1, lx + 1.1, 1.42, 1.55));
      c.M.add("screen", mat("#bfe8d8", { emissive: "#2c5a48" }), boxGeo(0.38, 0.26, 0.02, lx + 1.1, 1.42, 1.61), false);
      c.M.add("register", mat("#34495e"), boxGeo(0.16, 0.1, 0.22, lx + 1.25, 1.14, 2.08));
      c.M.add("shelf-#c94f7c", mat("#c94f7c"), boxGeo(0.5, 1.2, 0.4, lx - 1.95, 0.6, 2.1)); c.col.addBox(lx - 1.95, 2.1, 0.5, 0.4);
      for (let k = 0; k < 6; k++) { const gc = goodsA[k]; c.M.add("goods-" + gc, mat(gc), boxGeo(0.12, 0.16, 0.06, lx - 2.12 + (k % 3) * 0.17, 0.75 + Math.floor(k / 3) * 0.3, 2.32), false); }
      c.M.add("sign-pole", mat("#9aa5ad"), cylGeo(0.03, 0.03, 1.1, lx + 1.55, 1.55, 1.45, 6));
      wallPanel(c, textTexture(open ? "1" : "Closed", { bg: open ? "#23704a" : "#9aa5ad", fg: "#ffffff", w: 256, h: 128 }), lx + 1.55, 2.2, 1.46, 0.6, 0.3);
    }
    // self-checkout: two kiosks with a scanner, a screen and a bagging area
    for (const kx of [5.5, 7.9]) {
      c.M.add("kiosk", mat("#2f3a40"), boxGeo(0.7, 1.0, 0.6, kx, 0.5, 1.5));
      c.M.add("scanner", mat("#9fd3ec", { emissive: "#2d5566" }), boxGeo(0.56, 0.03, 0.46, kx, 1.02, 1.5), false);
      c.M.add("kiosk", mat("#2f3a40"), boxGeo(0.12, 0.5, 0.12, kx, 1.25, 1.2));
      c.M.add("screen", mat("#bfe8d8", { emissive: "#2c5a48" }), boxGeo(0.5, 0.36, 0.04, 0, 0, 0).rotateX(-0.3).translate(kx, 1.52, 1.3), false);
      c.M.add("bagging", mat("#dfe3e6"), boxGeo(0.7, 0.8, 0.55, kx + 0.8, 0.4, 1.5));
      c.M.add("bag", mat("#f4f1ea"), boxGeo(0.4, 0.42, 0.28, kx + 0.8, 1.01, 1.5), false);
      c.col.addBox(kx + 0.4, 1.5, 1.6, 0.65);
    }
    sign(c, "Self-Checkout", 6.7, 2.6, 1.3, 2.2, "#ffffff", "#23704a");
    sign(c, "Harbor Rewards · Ask for a card!", -3.6, 3.3, 1.35, 3, "#23704a", "#ffffff");
    // baskets and carts by the door
    for (let i = 0; i < 4; i++) c.M.add("basket", mat("#d9452b"), boxGeo(0.5, 0.2, 0.36, 2.6, 0.1 + i * 0.16, 6.3));
    c.col.addBox(2.6, 6.3, 0.6, 0.45);
    for (let i = 0; i < 2; i++) {
      const cx = -6.6 + i * 0.36;
      c.M.add("cart", mat("#b9c2c9"), boxGeo(0.9, 0.42, 0.56, cx, 0.86, 6.2));
      c.M.add("cart", mat("#b9c2c9"), boxGeo(0.72, 0.05, 0.5, cx + 0.05, 0.3, 6.2));
      c.M.add("cart-handle", mat("#d9452b"), boxGeo(0.07, 0.07, 0.62, cx - 0.47, 1.12, 6.2));
    }
    c.col.addBox(-6.4, 6.2, 1.4, 0.7);
  }, [{ npc: "marcus", x: -2.6, z: 0.85, rot: 0, ax: -2.6, az: 2.85 }], { floorKind: "tile", accent: "#23704a" }),

  // Harbor Fitness: treadmills under the back windows, the bench press and dumbbells by the mirror, mats and
  // balls on the west side, the front desk by the door, the locker-room door at the back. Jordan waits by the bench.
  gym: () => room("gym", 20, 14, "#50575f", "#eef3f4", (c) => {
    windowBack(c, -5.5, 6.4, 2.2, 2.3);
    // treadmills facing the windows
    for (const tx of [-7.6, -5.5, -3.4]) {
      c.M.add("treadmill", mat("#3a3f45"), boxGeo(0.82, 0.22, 1.9, tx, 0.11, -4.9));
      c.M.add("conveyor", mat("#1b1d20"), boxGeo(0.62, 0.03, 1.7, tx, 0.235, -4.85), false);
      for (const s of [-1, 1]) {
        c.M.add("rack", mat("#7d858d"), boxGeo(0.06, 1.15, 0.06, tx + s * 0.37, 0.75, -5.75));
        c.M.add("rack", mat("#7d858d"), boxGeo(0.05, 0.05, 0.6, tx + s * 0.37, 1.2, -5.45));
      }
      c.M.add("treadmill", mat("#3a3f45"), boxGeo(0.78, 0.34, 0.14, tx, 1.38, -5.8).rotateX(0));
      c.M.add("screen", mat("#7fd1c8", { emissive: "#1f5a55" }), boxGeo(0.4, 0.18, 0.02, tx, 1.4, -5.72), false);
      c.col.addBox(tx, -4.9, 0.9, 2);
    }
    // the bench press: a padded bench, two uprights and a loaded barbell
    const bx = 3.2, bz = -3.6;
    c.M.add("bench-pad", mat("#1b1d20"), boxGeo(0.36, 0.12, 1.3, bx, 0.42, bz));
    c.M.add("rack", mat("#7d858d"), boxGeo(0.14, 0.36, 1.0, bx, 0.18, bz));
    for (const s of [-1, 1]) c.M.add("rack", mat("#7d858d"), boxGeo(0.08, 1.25, 0.08, bx + s * 0.55, 0.625, bz - 0.55));
    c.M.add("barbell", mat("#c3cbd2"), cylGeo(0.025, 0.025, 2.1, 0, 0, 0, 8).rotateZ(Math.PI / 2).translate(bx, 1.12, bz - 0.58));
    for (const s of [-1, 1]) for (const [o, r] of [[0.8, 0.24], [0.88, 0.19]] as [number, number][]) {
      c.M.add("plates", mat("#2b2f33"), cylGeo(r, r, 0.06, 0, 0, 0, 16).rotateZ(Math.PI / 2).translate(bx + s * o, 1.12, bz - 0.58));
    }
    c.col.addBox(bx, bz, 0.5, 1.4); c.col.addBox(bx, bz - 0.58, 2.2, 0.3);
    // dumbbells on a two-tier rack along the east wall, a mirror above
    c.M.add("rack", mat("#7d858d"), boxGeo(0.7, 0.06, 3.6, 8.9, 0.42, -1));
    c.M.add("rack", mat("#7d858d"), boxGeo(0.7, 0.06, 3.6, 8.9, 0.82, -1));
    for (const s of [-1, 1]) c.M.add("rack", mat("#7d858d"), boxGeo(0.7, 0.82, 0.06, 8.9, 0.41, -1 + s * 1.77));
    for (let tier = 0; tier < 2; tier++) for (let k = 0; k < 6; k++) {
      const z = -2.5 + k * 0.6, y = 0.55 + tier * 0.4, sz = 0.12 + (k % 3) * 0.02 + tier * 0.02;
      c.M.add("barbell", mat("#c3cbd2"), cylGeo(0.02, 0.02, 0.3, 0, 0, 0, 6).rotateZ(Math.PI / 2).translate(8.9, y, z), false);
      for (const s of [-1, 1]) c.M.add("plates", mat("#2b2f33"), boxGeo(0.09, sz, sz, 8.9 + s * 0.19, y, z), false);
    }
    c.col.addBox(8.9, -1, 0.8, 3.7);
    c.M.add("mirror-frame", mat("#1f7f8c"), boxGeo(0.05, 2.1, 5.6, c.w / 2 - 0.04, 2.1, -1), false);
    c.M.add("mirror", mat("#dfeef6", { emissive: "#6f8a99" }), boxGeo(0.06, 1.9, 5.4, c.w / 2 - 0.08, 2.1, -1), false);
    // kettlebells along the back wall
    for (let k = 0; k < 4; k++) {
      const kx = 1.4 + k * 0.6, r = 0.12 + k * 0.025;
      c.M.add("plates", mat("#2b2f33"), new THREE.SphereGeometry(r, 10, 8).translate(kx, r, -6.5));
      c.M.add("plates", mat("#2b2f33"), new THREE.TorusGeometry(r * 0.6, 0.025, 6, 12).translate(kx, r * 2 + 0.03, -6.5));
    }
    c.col.addBox(2.3, -6.5, 2.4, 0.5);
    // locker-room door and a water fountain at the back
    c.M.add("door-locker", mat("#1f7f8c"), boxGeo(1.3, 2.4, 0.08, 7.6, 1.2, -c.d / 2 + 0.06), false);
    c.M.add("door-handle", mat("#c3cbd2"), boxGeo(0.06, 0.3, 0.06, 7.1, 1.1, -c.d / 2 + 0.13), false);
    sign(c, "Locker Rooms", 7.6, 2.85, -c.d / 2 + 0.2, 1.9, "#ffffff", "#1f7f8c");
    c.M.add("fountain-base", mat("#c3cbd2"), boxGeo(0.3, 0.8, 0.24, 5.4, 0.4, -6.85));
    c.M.add("sink", mat("#dfe3e6"), boxGeo(0.55, 0.26, 0.4, 5.4, 0.93, -6.78));
    c.col.addBox(5.4, -6.8, 0.6, 0.45);
    sign(c, "Water", 5.4, 1.75, -c.d / 2 + 0.2, 0.8, "#1f7f8c", "#ffffff");
    sign(c, "ONE MORE REP!", 1.3, 3.2, -c.d / 2 + 0.2, 4, "#f0883e", "#ffffff");
    // stretching mats and exercise balls (west)
    rug(c, -6.4, 2.4, 3.6, 2.6, "#1f7f8c");
    for (const [ex, ez, er, ec] of [[-8.6, 0.7, 0.34, "#f0883e"], [-8.9, 1.6, 0.28, "#5fb3a3"]] as [number, number, number, string][]) {
      c.M.add("ball-" + ec, mat(ec), new THREE.SphereGeometry(er, 14, 10).translate(ex, er, ez));
      c.col.addCircle(ex, ez, er);
    }
    // front desk with towels
    counter(c, 6.4, 4.3, 3.2, 0.8, "#1f7f8c", "#f4f4f4");
    for (let i = 0; i < 3; i++) c.M.add("towels", mat("#ffffff"), boxGeo(0.42, 0.1, 0.3, 7.5, 1.13 + i * 0.1, 4.3), false);
    c.M.add("monitor", mat("#1d1d1d"), boxGeo(0.5, 0.34, 0.05, 5.8, 1.3, 4.05));
    sign(c, "Harbor Fitness", 6.4, 2.4, 3.9, 2.2, "#1f7f8c", "#ffffff");
    plant(c, -9.1, 6.1, 1);
    lamp(c, -5.5, -3.2, 3.4); lamp(c, 3.4, -2.6, 3.4); lamp(c, -5.5, 2.4, 3.4);
    // (theme.ts roomExtras.roomsMx) a luchador on the wall, pennants in the flag's colours, the garrafón by the water
    // (s35: water by the vestidores), a minisplit
    if (THEME.roomExtras.roomsMx) {
      const S = smalls(c);
      banderines(S, -c.w / 2 + 0.4, c.w / 2 - 0.4, 4.0, -c.d / 2 + 0.12);
      garrafon(c, S, 4.55, -6.6);
      minisplitAt(S, -c.w / 2 + 0.02, 3.3, -3.5, Math.PI / 2);
      S.done();
      wallPanel(c, luchadorPoster(), -6.0, 2.3, -c.d / 2 + 0.06, 1.1, 1.51);
    }
  }, [{ npc: "jordan", x: 4.8, z: -2.6, rot: -0.3 }], { floorKind: "carpet", accent: "#1f7f8c" }),

  // Sproutly (advanced song P18): a plant-care app startup in an old brick warehouse. The lounge with beanbags in
  // front of the big screen (west), the wall of sticky notes in the middle with Tyler in front of it, facing the
  // door, his whiteboard beside him, a mezzanine with the red slide (north-east), the long work table and the
  // coffee bar (east), the ping-pong table, and Wi-Fi the scruffy gray terrier asleep by the printer (front, west).
  sproutly: () => room("sproutly", 22, 16, "#b9b4aa", "#e6d3c1", (c) => {
    brickWall(c, 0, -c.d / 2 + 0.02, c.w, 0); // back
    brickWall(c, -c.w / 2 + 0.02, 0, c.d, Math.PI / 2); // west
    brickWall(c, c.w / 2 - 0.02, 0, c.d, -Math.PI / 2); // east
    // high steel-framed factory windows along the back wall
    for (const wx of [-2.6, 0.4, 3.4, 6.2]) factoryWindow(c, wx, 2.4, 1.4, 3.3);
    // the lounge: the big screen (the app on it), a low console and three beanbags on a rug
    c.M.add("tv", mat("#1d1d1d"), boxGeo(3.9, 2.2, 0.08, -6.5, 2.3, -c.d / 2 + 0.1), false);
    wallPanel(c, appScreen(), -6.5, 2.3, -c.d / 2 + 0.16, 3.7, 2.04);
    c.M.add("console", mat("#8a6a4a"), boxGeo(3.2, 0.5, 0.45, -6.5, 0.25, -7.7)); c.col.addBox(-6.5, -7.7, 3.2, 0.45);
    rug(c, -6.4, -5, 6.2, 3.6, "#d9c7a7");
    for (const [bx, bz, bc] of [[-8.4, -4.7, "#e8a33d"], [-6.4, -4.2, "#3f8f8f"], [-4.4, -4.8, "#7a5ea8"]] as [number, number, string][]) beanbag(c, bx, bz, bc);
    // the wall of sticky notes: a freestanding board in the middle, Tyler in front of it
    c.M.add("partition", mat("#f4f1ea"), boxGeo(5.4, 2.3, 0.12, 2.2, 1.3, -5.4));
    c.M.add("partition-frame", mat("#2f3a40"), boxGeo(5.5, 0.08, 0.16, 2.2, 2.48, -5.4), false);
    for (const s of [-1, 1]) c.M.add("partition-frame", mat("#2f3a40"), boxGeo(0.12, 0.12, 0.8, 2.2 + s * 2.55, 0.06, -5.4));
    for (const s of [-1, 1]) c.M.add("partition-frame", mat("#2f3a40"), boxGeo(0.08, 2.4, 0.16, 2.2 + s * 2.74, 1.25, -5.4), false);
    wallPanel(c, stickyNotes(), 2.2, 1.35, -5.33, 5.2, 2.1);
    c.col.addBox(2.2, -5.4, 5.6, 0.8);
    // Tyler's rolling whiteboard: three boxes and arrows
    const wb = new THREE.Group();
    wb.position.set(5.6, 0, -4.1); wb.rotation.y = -0.45;
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.05, 0.05), mat("#f7f7f2"));
    board.position.y = 1.55; wb.add(board);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.95), new THREE.MeshBasicMaterial({ map: whiteboardPlan(), toneMapped: false }));
    face.position.set(0, 1.55, 0.03); wb.add(face);
    for (const s of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.6, 0.05), mat("#9aa5ad"));
      leg.position.set(s * 0.8, 0.8, 0); wb.add(leg);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.6), mat("#5b6670"));
      foot.position.set(s * 0.8, 0.05, 0); wb.add(foot);
    }
    c.g.add(wb);
    c.col.addCircle(5.6, -4.1, 0.75);
    // the mezzanine in the north-east corner, a ladder up, and the red slide down to the floor
    const wood = mat("#a8784f"), steel = mat("#2f3a40"), red = mat("#d7372f");
    c.M.add("mezzanine", wood, boxGeo(3.4, 0.18, 3.4, 9.3, 2.5, -6.3));
    c.M.add("mezzanine-edge", steel, boxGeo(3.4, 0.22, 0.08, 9.3, 2.48, -4.6), false);
    for (const [px, pz] of [[7.7, -4.7], [10.9, -4.7], [7.7, -7.8]]) { c.M.add("mezzanine-post", steel, cylGeo(0.07, 0.07, 2.5, px, 1.25, pz, 8)); c.col.addCircle(px, pz, 0.15); }
    for (const [x1, x2] of [[7.6, 8.9], [9.9, 11]]) {
      c.M.add("rail", steel, boxGeo(x2 - x1, 0.05, 0.05, (x1 + x2) / 2, 3.45, -4.62), false);
      for (let bx = x1 + 0.05; bx <= x2; bx += 0.32) c.M.add("rail", steel, boxGeo(0.03, 0.85, 0.03, bx, 3.02, -4.62), false);
    }
    for (const [z1, z2] of [[-8, -6.95], [-5.85, -4.6]]) {
      c.M.add("rail", steel, boxGeo(0.05, 0.05, z2 - z1, 7.62, 3.45, (z1 + z2) / 2), false);
      for (let bz = z1 + 0.05; bz <= z2; bz += 0.32) c.M.add("rail", steel, boxGeo(0.03, 0.85, 0.03, 7.62, 3.02, bz), false);
    }
    for (const lz of [-6.8, -6.0]) c.M.add("ladder", steel, boxGeo(0.06, 2.75, 0.06, 7.35, 1.37, lz), false);
    for (let ly = 0.3; ly < 2.6; ly += 0.33) c.M.add("ladder", steel, boxGeo(0.06, 0.04, 0.8, 7.35, ly, -6.4), false);
    c.col.addBox(7.35, -6.4, 0.4, 1);
    const top = { y: 2.52, z: -4.6 }, end = { y: 0.4, z: -0.95 }, sx = 9.4;
    // the stairs up to the mezzanine are solid (nobody climbs them)
    c.col.addBox(sx, (top.z + end.z) / 2 + 0.3, 1.1, end.z - top.z + 0.7);
    const ang = Math.atan2(top.y - end.y, end.z - top.z), len = Math.hypot(top.y - end.y, end.z - top.z);
    const chute = (g: THREE.BufferGeometry) => g.rotateX(ang).translate(sx, (top.y + end.y) / 2, (top.z + end.z) / 2);
    c.M.add("slide", red, chute(boxGeo(0.9, 0.06, len, 0, 0, 0)));
    for (const s of [-1, 1]) c.M.add("slide", red, chute(boxGeo(0.07, 0.32, len, s * 0.45, 0.14, 0)));
    c.M.add("slide", red, boxGeo(0.9, 0.06, 0.8, sx, end.y - 0.02, end.z + 0.4));
    for (const s of [-1, 1]) c.M.add("slide", red, boxGeo(0.07, 0.3, 0.8, sx + s * 0.45, end.y + 0.12, end.z + 0.4));
    for (const [lz, lh] of [[-2.8, 1.45], [-0.6, 0.4]]) for (const s of [-1, 1]) c.M.add("slide-leg", steel, cylGeo(0.04, 0.04, lh, sx + s * 0.38, lh / 2, lz, 6), false);
    c.col.addBox(sx, -2.6, 1.1, 4.2);
    sign(c, "Sproutly", 9.3, 3.7, -c.d / 2 + 0.2, 2.4, "#2f7a4a", "#f4ffe8");
    // under the mezzanine: a low shelf with a row of cactus pots (they text "Water me!" when the launch crashes)
    c.M.add("shelf-low", wood, boxGeo(0.5, 0.9, 2.6, 10.7, 0.45, -6.4)); c.col.addBox(10.7, -6.4, 0.5, 2.6);
    for (let i = 0; i < 6; i++) cactus(c, 10.7, -7.4 + i * 0.4, 0.9);
    // the long work table: laptops, phones and mugs, stools on both sides
    c.M.add("table-top", mat("#e3cfa8"), boxGeo(3.6, 0.07, 1.1, 4.6, 0.76, 2.2));
    for (const [lx, lz] of [[-1.65, -0.45], [1.65, -0.45], [-1.65, 0.45], [1.65, 0.45]]) c.M.add("table-leg", steel, boxGeo(0.06, 0.74, 0.06, 4.6 + lx, 0.37, 2.2 + lz), false);
    c.col.addBox(4.6, 2.2, 3.6, 1.1);
    for (const [lx, lz, open] of [[3.5, 1.95, true], [5.7, 2.45, true], [4.6, 2.5, false]] as [number, number, boolean][]) laptop(c, lx, lz, open ? 0 : Math.PI, open);
    for (const [px, pz] of [[3.0, 2.5], [6.2, 1.9]]) c.M.add("phone", mat("#1d1d1d"), boxGeo(0.08, 0.012, 0.15, px, 0.8, pz), false);
    for (const [mx, mz, mc] of [[4.0, 2.55, "#ffffff"], [5.2, 1.8, "#e8a33d"]] as [number, number, string][]) c.M.add("mug-" + mc, mat(mc), cylGeo(0.05, 0.045, 0.1, mx, 0.85, mz, 8), false);
    for (const sx2 of [3.4, 4.6, 5.8]) for (const sz of [1.3, 3.1]) {
      c.M.add("stool", mat("#3f8f8f"), cylGeo(0.2, 0.2, 0.06, sx2, 0.62, sz, 10));
      c.M.add("stool-leg", steel, cylGeo(0.03, 0.05, 0.6, sx2, 0.3, sz, 6), false);
      c.col.addCircle(sx2, sz, 0.22);
    }
    // the coffee bar along the east wall
    counter(c, 10.45, 3.7, 0.9, 3.4, "#2f7a4a", "#e8e2d6");
    c.M.add("coffee-machine", mat("#c0c4c8"), boxGeo(0.55, 0.65, 0.5, 10.5, 1.4, 2.6));
    c.M.add("coffee-machine-2", mat("#2b2b2b"), boxGeo(0.57, 0.1, 0.52, 10.5, 1.76, 2.6));
    for (let i = 0; i < 4; i++) c.M.add("mug-#ffffff", mat("#ffffff"), cylGeo(0.05, 0.045, 0.1, 10.4, 1.14, 3.4 + i * 0.2, 8), false);
    for (let i = 0; i < 5; i++) c.M.add("goods-" + ["#e63946", "#ffbe0b", "#8ab17d"][i % 3], mat(["#e63946", "#ffbe0b", "#8ab17d"][i % 3], { flat: true }), new THREE.SphereGeometry(0.08, 6, 5).translate(10.4 + (i % 2) * 0.12 - 0.06, 1.16 + Math.floor(i / 2) * 0.05, 4.7 + (i % 3) * 0.1), false);
    sign(c, "Coffee · Kombucha · Good vibes", c.w / 2 - 0.12, 2.6, 3.7, 2.4, "#fffaf0", "#2f7a4a", -Math.PI / 2);
    // the ping-pong table
    c.M.add("pingpong", mat("#2e6b52"), boxGeo(2.74, 0.06, 1.52, -5.2, 0.76, 2.4));
    c.M.add("pingpong-line", mat("#ffffff"), boxGeo(2.74, 0.005, 0.03, -5.2, 0.795, 2.4), false);
    c.M.add("pingpong-net", mat("#f4f4f4", { transparent: 0.7 }), boxGeo(0.02, 0.16, 1.62, -5.2, 0.87, 2.4), false);
    for (const [lx, lz] of [[-1.2, -0.6], [1.2, -0.6], [-1.2, 0.6], [1.2, 0.6]]) c.M.add("table-leg", steel, boxGeo(0.06, 0.74, 0.06, -5.2 + lx, 0.37, 2.4 + lz), false);
    for (const [px, pz, pc] of [[-6.1, 2.0, "#d7372f"], [-4.4, 2.9, "#2b2b2b"]] as [number, number, string][]) c.M.add("paddle-" + pc, mat(pc), cylGeo(0.09, 0.09, 0.02, px, 0.8, pz, 10), false);
    c.col.addBox(-5.2, 2.4, 2.8, 1.6);
    // the printer by the front wall, Wi-Fi asleep on a cushion beside it
    c.M.add("printer", mat("#d9dde2"), boxGeo(1, 0.95, 0.8, -8.4, 0.48, 7.35)); c.col.addBox(-8.4, 7.35, 1, 0.8);
    c.M.add("printer-top", mat("#5b6670"), boxGeo(0.8, 0.06, 0.7, -8.4, 0.98, 7.35), false);
    c.M.add("paper", mat("#ffffff"), boxGeo(0.42, 0.02, 0.3, -8.35, 1.02, 7.3), false);
    wifiDog(c, -6.9, 6.3, -0.35);
    c.col.addCircle(-6.9, 6.3, 0.6);
    // the clock on the west wall, plants in pots and hanging from the ceiling, pendant lamps
    wallPanel(c, wallClock(), -c.w / 2 + 0.06, 3, -3.6, 0.7, 0.7, Math.PI / 2);
    plant(c, -10.3, 6.9, 1.2); plant(c, 10.3, 6.9, 1.1); plant(c, -0.9, -7.2, 1.3); plant(c, -10.3, -7.2, 1);
    for (const [hx, hz] of [[-2.6, -2.4], [-9, -2.2], [6.8, -2.2], [-0.4, -6.6], [7.4, 5.2], [-7.6, 5.4]] as [number, number][]) hangingPlant(c, hx, hz);
    for (const [lx, lz] of [[-6.5, -2], [-1.4, -1], [4.6, 2.2], [-5.2, 2.4]] as [number, number][]) lamp(c, lx, lz, 3.5);
    // (theme.ts roomExtras.roomsMx) a hammock on the west wall, a minisplit on the bricks
    if (THEME.roomExtras.roomsMx) { const S = smalls(c); hammock(c, S, -c.w / 2 + 0.24, 1.2, 4.8); minisplitAt(S, -c.w / 2 + 0.06, 3.3, -0.6, Math.PI / 2); S.done(); }
  }, [{ npc: "tyler", x: 2.2, z: -3.75, rot: 0 }], { floorKind: "stone", accent: "#2f7a4a", warm: true }),
};

// ---------------------------------------------------------------------------
// Sproutly's props

/** Exposed brick over a wall (`rotY` 0: the back wall, facing +z), drawn once and tiled. */
let brickTexture: THREE.CanvasTexture | null = null;
function brickWall(c: Ctx, x: number, z: number, w: number, rotY: number) {
  if (!brickTexture) {
    brickTexture = canvasTex(256, 128, (k) => {
      k.fillStyle = "#cdbfae"; k.fillRect(0, 0, 256, 128);
      const cols = ["#b5654a", "#a95a42", "#bf7056", "#9e5440", "#b86a4f"];
      for (let row = 0; row < 8; row++) for (let i = -1; i < 5; i++) {
        k.fillStyle = cols[(row * 3 + i * 7 + 10) % cols.length];
        k.fillRect(i * 64 + (row % 2) * 32 + 2, row * 16 + 2, 60, 12);
      }
    });
    brickTexture.wrapS = brickTexture.wrapT = THREE.RepeatWrapping;
  }
  const t = brickTexture.clone();
  t.needsUpdate = true;
  t.repeat.set(w / 2.4, WALL_H / 1.2);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, WALL_H), new THREE.MeshLambertMaterial({ map: t }));
  m.position.set(x, WALL_H / 2, z); m.rotation.y = rotY;
  m.receiveShadow = true;
  c.g.add(m);
}
function factoryWindow(c: Ctx, x: number, w: number, h: number, y: number) {
  const z = -c.d / 2 + 0.05;
  c.M.add("win-#bfe3f7", mat("#bfe3f7", { emissive: "#4d7a90" }), boxGeo(w, h, 0.05, x, y, z), false);
  for (let k = 0; k <= 4; k++) c.M.add("window-steel", mat("#2f3a40"), boxGeo(0.06, h, 0.08, x - w / 2 + (k * w) / 4, y, z + 0.03), false);
  for (let k = 0; k <= 2; k++) c.M.add("window-steel", mat("#2f3a40"), boxGeo(w, 0.06, 0.08, x, y - h / 2 + (k * h) / 2, z + 0.03), false);
}
function beanbag(c: Ctx, x: number, z: number, color: string) {
  c.M.add("beanbag-" + color, mat(color), new THREE.SphereGeometry(0.6, 12, 9).scale(1, 0.62, 1).translate(x, 0.36, z));
  c.M.add("beanbag-" + color, mat(color), new THREE.SphereGeometry(0.42, 10, 7).scale(1, 0.75, 0.6).translate(x, 0.62, z - 0.3));
  c.col.addCircle(x, z, 0.6);
}
function cactus(c: Ctx, x: number, z: number, y: number) {
  c.M.add("pot", mat("#b86b4b"), cylGeo(0.13, 0.1, 0.18, x, y + 0.09, z, 8), false);
  c.M.add("cactus", mat("#3f8a4f"), cylGeo(0.07, 0.08, 0.32, x, y + 0.34, z, 8), false);
  c.M.add("cactus", mat("#3f8a4f"), boxGeo(0.12, 0.04, 0.04, x, y + 0.36, z + 0.05), false);
  c.M.add("cactus", mat("#3f8a4f"), cylGeo(0.03, 0.03, 0.1, x, y + 0.42, z + 0.11, 6), false);
}
function laptop(c: Ctx, x: number, z: number, rotY: number, open: boolean) {
  c.M.add("laptop", mat("#9aa5ad"), boxGeo(0.38, 0.025, 0.26, 0, 0.8, 0).rotateY(rotY).translate(x, 0, z), false);
  if (!open) return;
  c.M.add("laptop", mat("#9aa5ad"), boxGeo(0.38, 0.25, 0.02, 0, 0.93, -0.13).rotateY(rotY).translate(x, 0, z), false);
  c.M.add("screen", mat("#bfe8c8", { emissive: "#2c5a3a" }), boxGeo(0.34, 0.21, 0.005, 0, 0.93, -0.118).rotateY(rotY).translate(x, 0, z), false);
}
function hangingPlant(c: Ctx, x: number, z: number) {
  c.M.add("hanging-cord", mat("#3b3b3b"), cylGeo(0.01, 0.01, 1, x, WALL_H - 0.5, z, 4), false);
  c.M.add("pot-hanging", mat("#e8e2d6"), cylGeo(0.22, 0.16, 0.24, x, WALL_H - 1.1, z, 10), false);
  c.M.add("leaves", mat("#4c8c3c", { flat: true }), new THREE.IcosahedronGeometry(0.28, 0).scale(1, 0.7, 1).translate(x, WALL_H - 0.92, z), false);
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 + x;
    const l = 0.45 + ((k * 7 + Math.round(z * 3)) % 3) * 0.18;
    c.M.add("leaves-trail", mat("#6fae4f", { flat: true }), boxGeo(0.07, l, 0.07, x + Math.cos(a) * 0.19, WALL_H - 1.2 - l / 2 + 0.1, z + Math.sin(a) * 0.19), false);
  }
}
/** The plant-care app on the big screen: a phone with a happy plant, a water gauge and a growth chart (no words). */
function appScreen() {
  return canvasTex(512, 288, (x) => {
    x.fillStyle = "#16352a"; x.fillRect(0, 0, 512, 288);
    x.fillStyle = "#f4ffe8"; roundRect(x, 40, 22, 140, 244, 22); x.fill();
    x.fillStyle = "#cfe9c0"; roundRect(x, 54, 50, 112, 112, 14); x.fill();
    x.fillStyle = "#c56f4c"; x.fillRect(92, 118, 36, 32);
    x.fillStyle = "#3f8f4f";
    for (const [cx, cy, r] of [[110, 98, 20], [92, 88, 14], [128, 86, 15], [110, 76, 12]]) { x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill(); }
    x.fillStyle = "#1d1d1d"; for (const s of [-1, 1]) { x.beginPath(); x.arc(110 + s * 7, 100, 2.5, 0, Math.PI * 2); x.fill(); }
    x.strokeStyle = "#1d1d1d"; x.lineWidth = 2; x.beginPath(); x.arc(110, 104, 6, 0.2, Math.PI - 0.2); x.stroke();
    for (let i = 0; i < 3; i++) { x.fillStyle = i < 2 ? "#4aa3df" : "#d6e3ea"; roundRect(x, 58 + i * 36, 178, 30, 14, 7); x.fill(); }
    x.fillStyle = "#2f7a4a"; roundRect(x, 60, 214, 100, 30, 15); x.fill();
    x.fillStyle = "#24493b"; roundRect(x, 214, 30, 262, 150, 16); x.fill();
    x.strokeStyle = "#7fd17a"; x.lineWidth = 6; x.lineJoin = "round"; x.beginPath();
    [[236, 160], [276, 146], [316, 150], [356, 118], [396, 108], [436, 70], [456, 56]].forEach(([px, py], i) => i ? x.lineTo(px, py) : x.moveTo(px, py));
    x.stroke();
    for (let i = 0; i < 4; i++) { x.fillStyle = ["#7fd17a", "#4aa3df", "#f2c14e", "#e57b5a"][i]; roundRect(x, 214 + i * 68, 200, 56, 56, 12); x.fill(); }
  });
}
/** The wall of sticky notes: rows of yellow, pink, green, blue and orange squares with scribbles, tape and arrows. */
function stickyNotes() {
  return canvasTex(1024, 412, (x) => {
    x.fillStyle = "#f4f1ea"; x.fillRect(0, 0, 1024, 412);
    const cols = ["#ffe066", "#ff9fb2", "#a8e6a1", "#9fd3f2", "#ffbe76", "#ffe066"];
    let seed = 7;
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    for (let col = 0; col < 4; col++) {
      x.fillStyle = ["#2f7a4a", "#d7372f", "#4a7bb7", "#e8a33d"][col]; x.fillRect(24 + col * 250, 16, 200, 14);
      for (let row = 0; row < 4; row++) for (let k = 0; k < 3; k++) {
        if (rnd() < 0.18) continue;
        const px = 30 + col * 250 + k * 66, py = 46 + row * 90;
        x.save(); x.translate(px + 28, py + 30); x.rotate((rnd() - 0.5) * 0.25);
        x.fillStyle = "rgba(0,0,0,0.12)"; x.fillRect(-26, -26, 58, 58);
        x.fillStyle = cols[Math.floor(rnd() * cols.length)]; x.fillRect(-28, -28, 56, 56);
        x.strokeStyle = "rgba(40,40,60,0.55)"; x.lineWidth = 3; x.lineCap = "round";
        for (let l = 0; l < 3; l++) { x.beginPath(); x.moveTo(-20, -14 + l * 13); x.lineTo(-20 + 12 + rnd() * 26, -14 + l * 13 + (rnd() - 0.5) * 3); x.stroke(); }
        x.restore();
      }
    }
    x.strokeStyle = "#d7372f"; x.lineWidth = 5; x.beginPath(); x.moveTo(470, 200); x.quadraticCurveTo(500, 170, 540, 196); x.stroke();
    x.beginPath(); x.moveTo(530, 186); x.lineTo(542, 198); x.lineTo(526, 204); x.stroke();
  });
}
/** The harbor through Emily's window: the sea, a sailboat and the lighthouse. */
function harborView() {
  return canvasTex(352, 224, (x) => {
    const sky = x.createLinearGradient(0, 0, 0, 130); sky.addColorStop(0, "#8fc9ec"); sky.addColorStop(1, "#d9eef7");
    x.fillStyle = sky; x.fillRect(0, 0, 352, 130);
    x.fillStyle = "#ffffff"; for (const [cx, cy] of [[70, 40], [96, 34], [250, 56], [272, 50]]) { x.beginPath(); x.arc(cx, cy, 16, 0, Math.PI * 2); x.fill(); }
    x.fillStyle = "#3d8fb5"; x.fillRect(0, 130, 352, 94);
    x.fillStyle = "#5aa9c9"; for (let i = 0; i < 9; i++) x.fillRect((i * 47) % 340, 150 + (i % 4) * 16, 26, 4);
    x.fillStyle = "#8d8f93"; x.beginPath(); x.ellipse(290, 134, 42, 12, 0, 0, Math.PI * 2); x.fill();
    x.fillStyle = "#f5f5f0"; x.fillRect(280, 66, 18, 64);
    x.fillStyle = "#c8392f"; x.fillRect(280, 84, 18, 10); x.fillRect(280, 108, 18, 10); x.fillRect(277, 58, 24, 9);
    x.fillStyle = "#e45b4f"; x.fillRect(96, 156, 52, 10);
    x.fillStyle = "#ffffff"; x.beginPath(); x.moveTo(122, 154); x.lineTo(122, 104); x.lineTo(150, 152); x.closePath(); x.fill();
  });
}
/** Tyler's whiteboard: three boxes joined by arrows (no words). */
function whiteboardPlan() {
  return canvasTex(512, 304, (x) => {
    x.fillStyle = "#fbfbf7"; x.fillRect(0, 0, 512, 304);
    x.lineWidth = 6; x.lineJoin = "round"; x.lineCap = "round";
    const boxes: [number, number, string][] = [[40, 60, "#2f7a4a"], [196, 150, "#4a7bb7"], [352, 60, "#d7372f"]];
    for (const [bx, by, bc] of boxes) {
      x.strokeStyle = bc; x.strokeRect(bx, by, 120, 80);
      x.lineWidth = 4; for (let l = 0; l < 2; l++) { x.beginPath(); x.moveTo(bx + 18, by + 28 + l * 24); x.lineTo(bx + 90 - l * 22, by + 28 + l * 24); x.stroke(); }
      x.lineWidth = 6;
    }
    x.strokeStyle = "#333";
    for (const [x1, y1, x2, y2] of [[160, 110, 196, 170], [316, 170, 352, 110]]) {
      x.beginPath(); x.moveTo(x1, y1); x.lineTo(x2, y2); x.stroke();
      const a = Math.atan2(y2 - y1, x2 - x1);
      x.beginPath(); x.moveTo(x2, y2); x.lineTo(x2 - 16 * Math.cos(a - 0.5), y2 - 16 * Math.sin(a - 0.5)); x.moveTo(x2, y2); x.lineTo(x2 - 16 * Math.cos(a + 0.5), y2 - 16 * Math.sin(a + 0.5)); x.stroke();
    }
  });
}
function wallClock() {
  return canvasTex(128, 128, (x) => {
    x.fillStyle = "#ffffff"; x.beginPath(); x.arc(64, 64, 60, 0, Math.PI * 2); x.fill();
    x.lineWidth = 7; x.strokeStyle = "#2f3a40"; x.stroke();
    x.lineCap = "round"; x.lineWidth = 6; x.beginPath(); x.moveTo(64, 64); x.lineTo(64, 30); x.stroke();
    x.lineWidth = 4; x.beginPath(); x.moveTo(64, 64); x.lineTo(92, 74); x.stroke();
    x.fillStyle = "#2f3a40"; for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; x.fillRect(64 + Math.cos(a) * 48 - 2, 64 + Math.sin(a) * 48 - 2, 4, 4); }
  });
}
/** Wi-Fi, the scruffy gray terrier, asleep on a cushion (`rotY` turns her; she faces local +x). She breathes
 *  slowly, her tail twitches now and then, and a "z" floats up. */
function wifiDog(c: Ctx, x: number, z: number, rotY: number) {
  const g = new THREE.Group();
  g.position.set(x, 0, z); g.rotation.y = rotY;
  const add = (geo: THREE.BufferGeometry, m: THREE.Material, parent: THREE.Object3D = g) => { const me = new THREE.Mesh(geo, m); me.castShadow = true; parent.add(me); return me; };
  add(new THREE.CylinderGeometry(0.55, 0.5, 0.14, 16).translate(0, 0.07, 0), mat("#5b7fa6"));
  add(new THREE.CylinderGeometry(0.44, 0.44, 0.05, 16).translate(0, 0.16, 0), mat("#a9c1da"));
  const fur = mat("#8e9196", { flat: true }), dark = mat("#6f7277", { flat: true }), light = mat("#b4b6b9", { flat: true }), black = mat("#1d1d1d");
  // the body breathes (scaled from its belly), the head rests on the front paws
  const body = new THREE.Group(); body.position.set(-0.05, 0.18, 0); g.add(body);
  add(new THREE.BoxGeometry(0.6, 0.24, 0.32).translate(0, 0.12, 0), fur, body);
  const tufts: [number, number, number, number][] = [[-0.2, 0.25, 0.1, 0.1], [0, 0.26, -0.08, 0.09], [0.16, 0.25, 0.09, 0.08], [-0.26, 0.2, -0.14, 0.09], [0.08, 0.18, 0.17, 0.08], [-0.1, 0.15, -0.17, 0.08]];
  tufts.forEach(([tx, ty, tz, s], i) => add(new THREE.BoxGeometry(s, s * 0.8, s).rotateY(i * 0.7).translate(tx, ty, tz), i % 2 ? dark : light, body));
  add(new THREE.BoxGeometry(0.2, 0.18, 0.12).translate(-0.22, 0.09, 0.2), fur, body); // the hind leg, tucked in
  const head = new THREE.Group(); head.position.set(0.36, 0.2, 0.02); g.add(head);
  add(new THREE.BoxGeometry(0.22, 0.19, 0.22).translate(0, 0.08, 0), fur, head);
  add(new THREE.BoxGeometry(0.13, 0.1, 0.13).translate(0.16, 0.03, 0), light, head); // the snout
  add(new THREE.BoxGeometry(0.1, 0.06, 0.15).translate(0.17, -0.02, 0), light, head); // the beard
  add(new THREE.BoxGeometry(0.04, 0.035, 0.05).translate(0.235, 0.06, 0), black, head); // the nose
  for (const s of [-1, 1]) {
    add(new THREE.BoxGeometry(0.06, 0.012, 0.012).translate(0.1, 0.11, s * 0.06), black, head); // closed eyes
    add(new THREE.BoxGeometry(0.05, 0.03, 0.04).translate(0.1, 0.15, s * 0.07), light, head); // eyebrows
    add(new THREE.BoxGeometry(0.08, 0.03, 0.07).rotateX(s * 0.5).translate(-0.02, 0.18, s * 0.1), dark, head); // folded ears
    add(new THREE.BoxGeometry(0.2, 0.06, 0.07).translate(0.42, 0.21, s * 0.08), fur); // front paws
  }
  const tail = new THREE.Group(); tail.position.set(-0.35, 0.36, 0); g.add(tail);
  add(new THREE.BoxGeometry(0.06, 0.16, 0.06).rotateZ(0.5).translate(-0.04, 0.07, 0), dark, tail);
  // the "z" she breathes out
  const zs = [0, 0.5].map(() => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: textTexture("z", { bg: "rgba(0,0,0,0)", fg: "#4a7bb7", w: 64, h: 64 }), transparent: true, depthWrite: false }));
    s.scale.set(0.16, 0.16, 1);
    c.g.add(s);
    return s;
  });
  c.g.add(g);
  const hx = x + Math.cos(rotY) * 0.42, hz = z - Math.sin(rotY) * 0.42;
  c.anim.push((t) => {
    const b = Math.sin(t * 1.6);
    body.scale.set(1, 1 + b * 0.05, 1 + b * 0.025);
    head.position.y = 0.2 + b * 0.008;
    tail.rotation.x = Math.sin(t * 9) * Math.max(0, Math.sin(t * 0.7) - 0.85) * 4;
    zs.forEach((s, i) => {
      const p = (t * 0.28 + i * 0.5) % 1;
      s.position.set(hx + p * 0.15, 0.6 + p * 0.55, hz - p * 0.12);
      (s.material as THREE.SpriteMaterial).opacity = Math.sin(p * Math.PI) * 0.85;
      s.scale.setScalar(0.12 + p * 0.1);
    });
  });
}

const cache = new Map<string, Interior>();
/** The Spanish edition's market hall (theme.ts `market: "mercado"`): Doña Lupe's fruit and vegetable stall where the
 *  supermarket's checkout is in Maple Harbor (her spot and yours are the same), crates of produce, a scale, bananas
 *  hanging from a beam, a chili and spice stall, a juice stand, a back wall of groceries and papel picado under the
 *  roof. The small things are one mesh. */
function mercado(): Interior {
  return room("market", 22, 16, "#d6bf9c", "#f6e7c8", (c) => {
    const S = smalls(c);
    const ball = (x: number, y: number, z: number, r: number, col: string, sy = 1) => S.add(new THREE.SphereGeometry(r, 7, 5).scale(1, sy, 1).translate(x, y, z), col);
    const pile = (x: number, z: number, w: number, d: number, r: number, cols: string[], k: number) => {
      for (let i = 0; i < Math.floor(w / (2 * r)); i++) for (let j = 0; j < Math.floor(d / (2 * r)); j++)
        ball(x - w / 2 + r + i * 2 * r, 1.12 + r * 0.8 + ((i + j) % 2) * r * 0.25, z - d / 2 + r + j * 2 * r, r, cols[(i * 3 + j + k) % cols.length]);
    };
    const crate = (x: number, y: number, z: number, w: number, d: number, fill: string[], r: number, k: number) => {
      S.add(boxGeo(w, 0.28, d, x, y + 0.14, z), "#c79a6b");
      for (let i = 0; i < Math.floor(w / (2 * r)); i++) for (let j = 0; j < Math.floor(d / (2 * r)); j++) ball(x - w / 2 + r + i * 2 * r, y + 0.3, z - d / 2 + r + j * 2 * r, r, fill[(i + j + k) % fill.length]);
    };
    // Lupe's stall: a long wooden counter, its produce in sloping rows, a hanging scale and a sign above
    counter(c, -2.6, 1.8, 5.2, 1.0, "#8a5a3c", "#c79a6b");
    pile(-4.4, 1.8, 1.4, 0.8, 0.12, ["#2f5a2a", "#3b6b32", "#24452a"], 0); // avocados
    pile(-3.0, 1.8, 1.2, 0.8, 0.12, ["#d62828", "#e63946", "#c1121f"], 1); // tomatoes
    pile(-1.75, 1.8, 1.0, 0.8, 0.07, ["#7cb518", "#5c940d", "#8ac926"], 2); // limes
    pile(-0.6, 1.8, 1.0, 0.8, 0.14, ["#ffb703", "#fb8500", "#f4a261"], 3); // mangoes
    S.add(boxGeo(0.34, 0.1, 0.34, -0.1, 1.13, 1.45), "#d9d4c7"); // the scale's pan…
    S.add(boxGeo(0.3, 0.3, 0.16, -0.1, 1.3, 1.25), "#c0392b"); // …and its dial
    S.add(cylGeo(0.1, 0.1, 0.02, 0, 0, 0, 14).rotateX(Math.PI / 2).translate(-0.1, 1.33, 1.34), "#fdfcf7");
    // a beam on two posts over the stall, bananas hanging from it
    for (const px of [-5.3, 0.1]) c.M.add("stall-pole", mat("#6f4a2c"), cylGeo(0.07, 0.07, 3.0, px, 1.5, 2.25, 6));
    c.M.add("stall-pole", mat("#6f4a2c"), boxGeo(5.6, 0.12, 0.12, -2.6, 2.95, 2.25));
    for (let i = 0; i < 4; i++) for (let k = 0; k < 5; k++) {
      const bx = -4.6 + i * 1.3, by = 2.6 - k * 0.12;
      S.add(new THREE.CapsuleGeometry(0.045, 0.24, 2, 5).rotateZ(0.5 - k * 0.25).translate(bx + (k - 2) * 0.06, by, 2.25), "#f2d24b");
    }
    sign(c, "Frutas y Verduras · Doña Lupe", -2.6, 3.45, 2.25, 3.6, "#2a9d8f", "#fff7e6");
    // crates behind her, on the floor and on a low bench
    const FRUIT = [["#ffb703", "#fb8500"], ["#e63946", "#d62828"], ["#7cb518", "#5c940d"], ["#f77f00", "#fcbf49"], ["#6a994e", "#a7c957"], ["#9d0208", "#d00000"]];
    for (let i = 0; i < 6; i++) crate(-5.2 + i * 1.05, 0, -0.6, 0.95, 0.7, FRUIT[i], 0.11, i);
    c.M.add("counter-#8a5a3c", mat("#8a5a3c"), boxGeo(6.4, 0.5, 0.8, -2.6, 0.25, -1.6));
    for (let i = 0; i < 5; i++) crate(-5.0 + i * 1.2, 0.5, -1.6, 1.0, 0.7, FRUIT[(i + 2) % 6], 0.12, i + 3);
    c.col.addBox(-2.6, -1.1, 6.6, 1.8);
    // pineapples and papayas at the stall's east end
    for (let i = 0; i < 3; i++) {
      S.add(new THREE.SphereGeometry(0.17, 8, 6).scale(1, 1.45, 1).translate(0.9 + i * 0.35, 0.25, 1.1), "#d4a017");
      S.add(new THREE.ConeGeometry(0.14, 0.28, 6).translate(0.9 + i * 0.35, 0.62, 1.1), "#3a7d2c");
    }
    for (let i = 0; i < 3; i++) ball(0.95 + i * 0.32, 0.2, 0.55, 0.15, "#f08a24", 1.5);
    c.col.addBox(1.25, 0.85, 1.3, 0.9);
    // the chili and spice stall (west): baskets of red and green chilis, sacks of beans
    counter(c, -9.0, 0.4, 1.4, 3.6, "#9c6b43", "#c79a6b");
    for (let i = 0; i < 6; i++) {
      const z = -1.0 + i * 0.55, col = ["#d00000", "#2b9348", "#9d0208", "#f48c06", "#55a630", "#6a040f"][i];
      S.add(cylGeo(0.24, 0.2, 0.16, -9.0, 1.12, z, 10), "#b08968");
      for (let k = 0; k < 7; k++) S.add(new THREE.CapsuleGeometry(0.03, 0.1, 2, 4).rotateZ(k).rotateX(k * 0.7).translate(-9.0 + Math.cos(k) * 0.12, 1.24, z + Math.sin(k) * 0.12), col);
    }
    for (let i = 0; i < 3; i++) S.add(cylGeo(0.26, 0.3, 0.6, -10.1, 0.3, -0.9 + i * 0.75, 10), ["#e9d8a6", "#ddb892", "#e6ccb2"][i]);
    c.col.addBox(-10.1, -0.15, 0.7, 2.4);
    sign(c, "Chiles y Especias", -9.0, 2.6, 0.4, 2.4, "#d00000", "#fff7e6", Math.PI / 2);
    // the juice stand (east): a counter with a blender and glasses of juice, oranges in a crate
    counter(c, 6.0, 0.6, 3.2, 1.0, "#2a9d8f", "#f4f1de");
    S.add(cylGeo(0.13, 0.11, 0.38, 5.2, 1.27, 0.55, 10), "#dff3fb");
    S.add(cylGeo(0.16, 0.18, 0.14, 5.2, 1.15, 0.55, 10), "#3d405b");
    for (let i = 0; i < 6; i++) S.add(cylGeo(0.06, 0.05, 0.16, 5.8 + i * 0.28, 1.16, 0.75, 8), ["#fb8500", "#e63946", "#ffb703", "#8ac926", "#fb8500", "#ff006e"][i]);
    crate(7.2, 0, -0.4, 1.0, 0.7, ["#f77f00", "#fb8500"], 0.11, 0);
    sign(c, "Jugos y Licuados", 6.0, 2.5, 0.05, 2.6, "#f6bd60", "#5f0f40");
    // the back wall: groceries on shelves, sacks of rice and beans, a cooler of drinks
    shelf(c, 2.6, -7.55, 8.0, 2.0, "#a47148", ["#e63946", "#ffb703", "#2a9d8f", "#f4f1de", "#8ab17d", "#e76f51", "#264653"], 0, 0.5);
    for (let i = 0; i < 4; i++) S.add(cylGeo(0.28, 0.32, 0.7, -6.5 + i * 0.7, 0.35, -7.2, 10), ["#e9d8a6", "#ddb892", "#f2e8cf", "#e6ccb2"][i]);
    c.col.addBox(-5.45, -7.2, 3.0, 0.8);
    sign(c, "MERCADO MUNICIPAL", 2.6, 3.5, -c.d / 2 + 0.2, 4.4, "#e76f51", "#fff7e6");
    // papel picado under the roof: three strings across the hall (one mesh with the rest)
    const PAPEL = ["#e4007c", "#f6a800", "#00a6a6", "#7ac143", "#ff5a36", "#6d2e9e", "#1f6fd1"];
    for (const [z, k] of [[-4.5, 0], [-0.8, 2], [3.6, 4]] as [number, number][]) {
      S.add(boxGeo(c.w - 1, 0.02, 0.02, 0, 3.75, z), "#f4f1ea");
      for (let i = 0; i < 26; i++) {
        const x = -c.w / 2 + 1 + i * ((c.w - 2) / 26);
        S.add(boxGeo(0.34, 0.42, 0.01, x, 3.5 - Math.sin((i / 26) * Math.PI) * 0.25, z), PAPEL[(i + k) % PAPEL.length]);
      }
    }
    if (THEME.roomExtras.roomsMx) mercadoMx(c, S);
    S.done();
  }, [{ npc: "marcus", x: -2.6, z: 0.85, rot: 0, ax: -2.6, az: 2.85 }], { floorKind: "tile", accent: "#e76f51", warm: true });
}

// ---------------------------------------------------------------------------
// Puerto Colibrí's rooms and additions (theme.ts `restaurant`, `roomExtras`; docs/es/TOWN.md "The conversations'
// spots"). Built only when the edition's theme asks, so Maple Harbor's rooms stay exactly as they were.

/** La Cocina de Lucía (theme.ts `restaurant: "yucateco"`; s73), a Yucatecan restaurant in the trattoria's room: ochre
 *  walls, a terracotta floor and red trim; the tables where the trattoria's stand (roomPeople.ts's diners sit at them)
 *  with bright cloths, salsas and tortilla baskets; Lucía's stand by the door and Luis among the tables (the trattoria's
 *  spots); jars of aguas frescas (horchata, jamaica, chaya) on a counter where the wine was; a hammock and talavera
 *  plates on the walls, papel picado under the roof, a picture of Chichén Itzá; s73's menu in pesos. The small things
 *  are one mesh. */
function cocina(): Interior {
  return room("trattoria", 18, 14, "#c0673f", "#f2cf7c", (c) => {
    const S = smalls(c);
    // Lucía's stand by the door, with the reservations book
    S.add(boxGeo(0.9, 1.1, 0.6, -5.5, 0.55, 4.2), "#7a3b1d");
    S.add(boxGeo(0.98, 0.05, 0.68, -5.5, 1.125, 4.2), "#c79a6b");
    S.add(boxGeo(0.3, 0.02, 0.22, -5.5, 1.16, 4.15, 0.2), "#f4ecd8");
    c.col.addBox(-5.5, 4.2, 0.9, 0.6);
    // the tables, each with its cloth, two wooden chairs, two salsas and a basket of tortillas under a cloth
    const CLOTHS = ["#e4007c", "#00a6a6", "#f6a800", "#7ac143", "#ff5a36", "#1f6fd1", "#6d2e9e"];
    ([[-4, -3], [0, -3], [4, -3], [-4, 1], [4, 1], [0, 1.5], [6.5, -0.8]] as [number, number][]).forEach(([tx, tz], i) => {
      tableS(c, S, tx, tz, CLOTHS[i]);
      S.add(cylGeo(0.07, 0.05, 0.05, tx - 0.28, 0.815, tz - 0.22, 10), "#b5402a");
      S.add(cylGeo(0.06, 0.045, 0.05, tx - 0.1, 0.815, tz - 0.3, 10), "#4f8a2f");
      S.add(cylGeo(0.12, 0.1, 0.08, tx + 0.26, 0.83, tz - 0.16, 12), "#d9b98c");
      S.add(cylGeo(0.125, 0.125, 0.014, tx + 0.26, 0.875, tz - 0.16, 12), CLOTHS[(i + 3) % CLOTHS.length]);
    });
    // aguas frescas where the wine was: a counter against the back wall with three big jars and glasses
    S.add(boxGeo(3.0, 1.0, 0.7, 7.4, 0.5, -6.55), "#8a4a2a");
    S.add(boxGeo(3.1, 0.06, 0.8, 7.4, 1.03, -6.55), "#e9d3a8");
    ([["#f3ead8", 6.55], ["#8b1a3a", 7.4], ["#7fb83a", 8.25]] as [string, number][]).forEach(([col, jx]) => {
      S.add(cylGeo(0.2, 0.17, 0.42, jx, 1.27, -6.6, 14), col);
      S.add(cylGeo(0.205, 0.205, 0.1, jx, 1.53, -6.6, 14), "#e3f1f4");
      S.add(cylGeo(0.215, 0.215, 0.03, jx, 1.595, -6.6, 14), "#b9c2c9");
      S.add(cylGeo(0.012, 0.012, 0.5, jx + 0.09, 1.56, -6.56, 5), "#8a5a3c");
      S.add(cylGeo(0.045, 0.04, 0.12, jx - 0.05, 1.12, -6.22, 8), col);
    });
    c.col.addBox(7.4, -6.55, 3.0, 0.7);
    // the kitchen's swing door (where the trattoria's was), with a round window
    S.add(boxGeo(1.6, 2.6, 0.12, -7, 1.3, -c.d / 2 + 0.1), "#7a3b1d");
    S.add(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 16).rotateX(Math.PI / 2).translate(-7, 1.75, -c.d / 2 + 0.17), "#dfeef2");
    // the hammock on the west wall, between two hooks, and talavera plates on the back wall
    hammock(c, S, -c.w / 2 + 0.22, -1.6, 2.0);
    [-1.6, -0.8, 0, 0.8, 1.6].forEach((px, i) => talaveraPlate(S, px, 2.3, -c.d / 2 + 0.03, i));
    // papel picado under the roof: two strings from the back to the front along the side walls (crossing the room
    // they would hide the signs from the camera at the open front)
    const PAPEL = ["#e4007c", "#f6a800", "#00a6a6", "#7ac143", "#ff5a36", "#6d2e9e", "#1f6fd1"];
    for (const [px, k] of [[-8.3, 0], [8.3, 3]] as [number, number][]) {
      S.add(boxGeo(0.02, 0.02, c.d - 1, px, 3.95, 0), "#f4f1ea");
      for (let i = 0; i < 18; i++) S.add(boxGeo(0.01, 0.32, 0.26, px, 3.76 - Math.sin((i / 17) * Math.PI) * 0.2, -c.d / 2 + 0.8 + i * ((c.d - 1.6) / 17)), PAPEL[(i + k) % PAPEL.length]);
    }
    // agaves in clay pots in the front corners
    agave(c, S, -8, 5.5); agave(c, S, 8, 5.5);
    // the name, s73's menu, desserts and drinks, a picture of Chichén Itzá in a gilt frame
    wallPanel(c, twoLineTexture("La Cocina de Lucía\n¡Buen provecho!", { bg: "#8a1f2a", fg: "#ffe8b0", script: true }), 0, 3.25, -c.d / 2 + 0.2, 4, 1);
    wallPanel(c, menuBoard(["Sopa de lima|$110", "Panuchos o salbutes|$120", "Guacamole con totopos|$130", "Papadzules|$160", "Pollo pibil|$190", "Poc chuc|$210",
      "Cochinita pibil · la de la casa|$220", "Tikin xic, pescado del día|$290", "Arrachera|$320"], "COCINA YUCATECA"), 4.8, 2.8, -c.d / 2 + 0.2, 3.6, 2.25);
    // (s73's prices: the flan, the dulce de papaya and the helado $70, the caballeros pobres $80, an agua fresca $40)
    wallPanel(c, menuBoard(["Flan|$70", "Caballeros pobres|$80", "Dulce de papaya|$70", "Helado de coco|$70", "Aguas frescas: horchata, jamaica, chaya|$40",
      "Limonada natural o mineral|$50"], "POSTRES Y BEBIDAS"), c.w / 2 - 0.2, 2.7, -2.6, 2.6, 1.6, -Math.PI / 2);
    S.add(boxGeo(1.8, 1.4, 0.05, -4, 2.6, -c.d / 2 + 0.16), "#c9a227");
    wallPanel(c, pyramidPicture(), -4, 2.6, -c.d / 2 + 0.2, 1.6, 1.2);
    lamp(c, -4, -3); lamp(c, 0, -3); lamp(c, 4, -3); lamp(c, 0, 1.5);
    // (theme.ts roomExtras.services; s73: "Está al fondo, a la derecha") the restroom door at the back on the right
    if (THEME.roomExtras.services) restroomDoor(c, S, c.w / 2, -5.0, -Math.PI / 2, "#7a3b1d", "#e9d3a8");
    S.done();
  }, [{ npc: "marco_host", x: -5.5, z: 3.2, rot: Math.PI / 2 }, { npc: "marco", x: 2, z: -1, rot: Math.PI / 2 }], { floorKind: "tile", accent: "#8a1f2a", warm: true });
}

/** A square table at one of table()'s places (its size, two chairs north and south, the same colliders), in the
 *  smalls: a bright cloth hanging over the edges, a pedestal, wooden chairs. */
function tableS(c: Ctx, S: Smalls, x: number, z: number, cloth: string, wood = "#8a5a3c") {
  S.add(boxGeo(1.1, 0.06, 1.1, x, 0.76, z), cloth);
  for (const [w, d, ox, oz] of [[1.16, 0.02, 0, 0.57], [1.16, 0.02, 0, -0.57], [0.02, 1.16, 0.57, 0], [0.02, 1.16, -0.57, 0]] as [number, number, number, number][])
    S.add(boxGeo(w, 0.2, d, x + ox, 0.67, z + oz), cloth);
  S.add(cylGeo(0.06, 0.08, 0.74, x, 0.37, z, 6), "#5a4636");
  for (const a of [Math.PI / 2, (3 * Math.PI) / 2]) {
    const cx = x + Math.cos(a) * 0.95, cz = z + Math.sin(a) * 0.95;
    const P = (g: THREE.BufferGeometry) => g.rotateY(-a + Math.PI / 2).translate(cx, 0, cz);
    S.add(P(boxGeo(0.45, 0.08, 0.45, 0, 0.46, 0)), wood);
    S.add(P(boxGeo(0.45, 0.55, 0.08, 0, 0.72, 0.2)), wood);
    for (const [lx, lz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) S.add(P(boxGeo(0.05, 0.44, 0.05, lx, 0.22, lz)), "#5a3a22");
    c.col.addCircle(cx, cz, 0.28);
  }
  c.col.addBox(x, z, 1.1, 1.1);
}

/** A striped hammock hung along a west wall (at x) between two hooks at z1 and z2, sagging in the middle. */
function hammock(c: Ctx, S: Smalls, x: number, z1: number, z2: number) {
  const STRIPES = ["#e4007c", "#f6a800", "#00a6a6", "#ff5a36", "#7ac143"];
  const n = 14, top = 2.15, sag = 0.9, span = z2 - z1;
  const at = (t: number) => ({ y: top - 0.25 - Math.sin(t * Math.PI) * sag, z: z1 + 0.35 + t * (span - 0.7) });
  for (let i = 0; i < n; i++) {
    const a = at(i / n), b = at((i + 1) / n);
    const len = Math.hypot(b.y - a.y, b.z - a.z), ang = Math.atan2(b.y - a.y, b.z - a.z);
    S.add(boxGeo(0.05, 0.42, len + 0.02, 0, 0, 0).rotateX(-ang).translate(x + 0.08, (a.y + b.y) / 2 - 0.12, (a.z + b.z) / 2), STRIPES[i % STRIPES.length]);
  }
  for (const [hz, dir] of [[z1, 1], [z2, -1]] as [number, number][]) {
    S.add(boxGeo(0.08, 0.08, 0.08, x, top, hz), "#3a3d42");
    // the strings from the hook to the hammock's end
    for (const dy of [-0.12, 0, 0.12]) {
      const ex = at(dir > 0 ? 0 : 1), len = Math.hypot(0.35, top - ex.y + dy);
      S.add(boxGeo(0.012, 0.012, len, 0, 0, 0).rotateX(-Math.atan2(ex.y - dy - top, 0.35 * dir)).translate(x + 0.08, (top + ex.y - dy) / 2 - 0.06, hz + 0.175 * dir), "#f4ecd8");
    }
  }
  c.col.addBox(x + 0.1, (z1 + z2) / 2, 0.3, span);
}

/** A talavera plate on a wall (white, a cobalt ring and petals, a yellow middle), its face towards +z. */
function talaveraPlate(S: Smalls, x: number, y: number, z: number, k: number) {
  const disc = (r: number, dz: number, col: string) => S.add(new THREE.CylinderGeometry(r, r, 0.012, 20).rotateX(Math.PI / 2).translate(x, y, z + dz), col);
  disc(0.21, 0, "#1f4e9c");
  disc(0.18, 0.008, "#f7f3ea");
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + k * 0.3;
    S.add(new THREE.CylinderGeometry(0.035, 0.035, 0.012, 8).rotateX(Math.PI / 2).translate(x + Math.cos(a) * 0.11, y + Math.sin(a) * 0.11, z + 0.016), k % 2 ? "#1f4e9c" : "#2b6cb0");
  }
  disc(0.045, 0.02, "#f2b705");
}

/** An agave in a clay pot (the pointed leaves fanning out), with its collider. */
function agave(c: Ctx, S: Smalls, x: number, z: number) {
  S.add(cylGeo(0.3, 0.22, 0.48, x, 0.24, z, 12), "#b5602e");
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2, tilt = 0.45 + (i % 3) * 0.2;
    S.add(new THREE.ConeGeometry(0.07, 0.75, 4).translate(0, 0.37, 0).rotateZ(tilt).rotateY(a).translate(x, 0.46, z), i % 2 ? "#5f8f6a" : "#6fa37a");
  }
  S.add(new THREE.ConeGeometry(0.06, 0.7, 4).translate(x, 0.8, z), "#6fa37a");
  c.col.addCircle(x, z, 0.4);
}

/** Chichén Itzá's pyramid in a painted landscape (sky, jungle, the stepped pyramid and its temple). */
function pyramidPicture() {
  return canvasTex(320, 240, (x) => {
    const sky = x.createLinearGradient(0, 0, 0, 150); sky.addColorStop(0, "#5fb0e8"); sky.addColorStop(1, "#f9e0a8");
    x.fillStyle = sky; x.fillRect(0, 0, 320, 240);
    x.fillStyle = "#ffd166"; x.beginPath(); x.arc(250, 52, 22, 0, Math.PI * 2); x.fill();
    x.fillStyle = "#3f7d3a"; x.fillRect(0, 168, 320, 72);
    x.fillStyle = "#2f6b33"; for (let i = 0; i < 16; i++) { x.beginPath(); x.arc(i * 21 + 6, 170, 14 + (i % 3) * 4, 0, Math.PI * 2); x.fill(); }
    for (let k = 0; k < 9; k++) { // the steps, from the base up
      const w = 210 - k * 20, y = 176 - k * 12;
      x.fillStyle = k % 2 ? "#c9b48a" : "#b9a37a"; x.fillRect(160 - w / 2, y - 12, w, 12);
    }
    x.fillStyle = "#8f7b55"; x.fillRect(150, 68, 20, 100); // the stairway
    x.fillStyle = "#a8936a"; x.fillRect(136, 46, 48, 22); // the temple
    x.fillStyle = "#3a2f22"; x.fillRect(154, 54, 12, 14);
  });
}

/** Agente Medina (`aduana`, the Spanish edition's customs officer; s65b) at her post after the baggage desk, facing it. */
const CUSTOMS_OFFICER: NpcSpot = { npc: "aduana", x: -0.4, z: -6.5, rot: -1.74 };

/** The arrivals hall in the Spanish edition (theme.ts roomExtras.customs and mexicanFlag; s65a, s65b): Mexico's flag
 *  on two stands by immigration; customs after the baggage desk: Agente Medina's lectern, her sniffer dog sitting at
 *  her side, and on the way out the two lanes of Mexico's airports, "Nada que declarar" and "Auto declaración" (where
 *  duties are paid; no red-and-green light since 2024, as s65b's officer says), under one board. The lanes stand south
 *  of the conversation's camera at the baggage desk, so they never hide Itzel or the officer. */
function arrivalsMx(c: Ctx) {
  const S = smalls(c);
  if (THEME.roomExtras.mexicanFlag) { flagStand(c, S, -19.3, -11.6, 0); flagStand(c, S, -9.1, -11.6, 0); }
  if (THEME.roomExtras.customs) {
    // the suitcases on the carousel (as the English room's, in this mesh)
    for (let i = 0; i < 5; i++) S.add(boxGeo(0.7, 0.45, 0.5, -17 + i * 1.5, 0.95, 2.1 + (i % 2) * 0.8), ["#e45b4f", "#4a7bb7", "#3d3d46", "#6fbf73", "#f2c14e"][i]);
    const { x, z } = CUSTOMS_OFFICER;
    // her lectern, between her and the baggage desk, with the customs' gold band
    const lx = x - 0.75, lz = z + 0.05;
    S.add(boxGeo(0.46, 1.0, 0.7, lx, 0.5, lz), "#2b3f5c");
    S.add(boxGeo(0.5, 0.05, 0.76, 0, 0, 0).rotateZ(0.22).translate(lx, 1.04, lz), "#e6e9ee");
    S.add(boxGeo(0.02, 0.12, 0.7, lx - 0.235, 0.82, lz), "#c9a227");
    c.col.addBox(lx, lz, 0.56, 0.8);
    // her sniffer dog, sitting at her side, watching the passengers come
    sittingDog(S, x - 0.75, z + 0.95, -Math.PI / 2);
    c.col.addCircle(x - 0.75, z + 0.95, 0.3);
    // the lanes on the way out: belts between posts, and the board over them (both faces)
    for (const bx of [-3.6, -2.0, -0.4]) {
      for (const bz of [0.6, 3.2]) {
        S.add(cylGeo(0.045, 0.045, 0.95, bx, 0.475, bz, 8), "#9aa5ad");
        S.add(cylGeo(0.16, 0.18, 0.04, bx, 0.02, bz, 12), "#3a3d42");
      }
      S.add(boxGeo(0.04, 0.07, 2.6, bx, 0.88, 1.9), "#1d3f73");
      c.col.addBox(bx, 1.9, 0.2, 2.8);
    }
    // (one face: the camera is always on the room's open side, to the south)
    wallPanel(c, customsBoard(), -2.0, 3.0, 1.9, 3.4, 1.0);
    for (const ex of [-3.5, -0.5]) S.add(cylGeo(0.01, 0.01, WALL_H - 3.5, ex, (WALL_H + 3.5) / 2, 1.9, 4), "#3a3d42");
  }
  S.done();
}

/** The customs board: "ADUANA · CUSTOMS" over the two lanes, Spanish over English. */
function customsBoard() {
  return canvasTex(1088, 320, (x) => {
    x.fillStyle = "#1d3f73"; roundRect(x, 4, 4, 1080, 312, 26); x.fill();
    x.fillStyle = "#ffffff"; x.textAlign = "center"; x.textBaseline = "middle";
    x.font = "800 64px Nunito, Arial"; x.fillText("ADUANA · CUSTOMS", 544, 62);
    const lanes: [string, string, string][] = [["#1e7b4a", "Nada que declarar", "Nothing to declare"], ["#b3261e", "Auto declaración", "Self-declaration"]];
    lanes.forEach(([bg, es, en], i) => {
      const x0 = 20 + i * 530;
      x.fillStyle = bg; roundRect(x, x0, 120, 518, 182, 18); x.fill();
      x.fillStyle = "#ffffff"; x.font = "800 50px Nunito, Arial"; x.fillText(es, x0 + 259, 182);
      x.globalAlpha = 0.85; x.font = "700 34px Nunito, Arial"; x.fillText(en, x0 + 259, 250); x.globalAlpha = 1;
    });
  });
}

/** Mexico's flag, `w` wide (its sides 4:7), centred at (x, y) on a wall at z, its face towards +z (turned by rotY): green,
 *  white and red, the eagle on its cactus as a small brown and green disc. In the smalls. */
function flagMx(S: Smalls, x: number, y: number, z: number, w: number, rotY = 0) {
  const h = (w * 4) / 7, sw = w / 3;
  const P = (g: THREE.BufferGeometry) => g.rotateY(rotY).translate(x, y, z);
  ["#006847", "#f8f8f4", "#ce1126"].forEach((col, i) => S.add(P(boxGeo(sw, h, 0.02, (i - 1) * sw, 0, 0)), col));
  S.add(P(new THREE.CylinderGeometry(h * 0.17, h * 0.17, 0.024, 16).rotateX(Math.PI / 2).translate(0, 0, 0.012)), "#8a5a2b");
  S.add(P(new THREE.CylinderGeometry(h * 0.09, h * 0.09, 0.028, 12).rotateX(Math.PI / 2).translate(0, -h * 0.07, 0.016)), "#4e8a3a");
}

/** Mexico's flag on a stand (a weighted base, a gilt pole, the flag from the pole's top), its face towards rotY's +z. */
function flagStand(c: Ctx, S: Smalls, x: number, z: number, rotY: number) {
  S.add(cylGeo(0.24, 0.27, 0.07, x, 0.035, z, 14), "#3a3d42");
  S.add(cylGeo(0.022, 0.022, 2.6, x, 1.33, z, 8), "#c9a227");
  S.add(new THREE.SphereGeometry(0.055, 10, 8).translate(x, 2.67, z), "#c9a227");
  const w = 1.1, h = (w * 4) / 7, off = w / 2 + 0.03;
  flagMx(S, x + Math.cos(rotY) * off, 2.5 - h / 2, z - Math.sin(rotY) * off, w, rotY);
  c.col.addCircle(x, z, 0.3);
}

/** A beagle sitting up (as dog.ts's dogs sit, in a sniffer dog's green vest), facing `heading` (0: +z). In the smalls. */
function sittingDog(S: Smalls, x: number, z: number, heading: number) {
  const main = "#c8873e", patch = "#6e4320", white = "#f2ede4";
  const P = (g: THREE.BufferGeometry) => g.rotateY(heading).translate(x, 0, z);
  S.add(P(boxGeo(0.26, 0.24, 0.5, 0, 0, 0).rotateX(-0.6).translate(0, 0.32, -0.04)), main); // the body, sitting up
  S.add(P(boxGeo(0.28, 0.1, 0.3, 0, 0, 0).rotateX(-0.6).translate(0, 0.41, -0.08)), "#4e7a3a"); // the vest
  S.add(P(boxGeo(0.2, 0.18, 0.06, 0, 0.36, 0.17)), white); // the chest
  for (const s of [-1, 1]) {
    S.add(P(boxGeo(0.07, 0.32, 0.07, s * 0.08, 0.16, 0.14)), main); // the front legs
    S.add(P(boxGeo(0.08, 0.03, 0.1, s * 0.08, 0.015, 0.17)), white);
    S.add(P(boxGeo(0.1, 0.13, 0.26, s * 0.12, 0.065, -0.18)), main); // the haunches, folded
    S.add(P(boxGeo(0.06, 0.13, 0.09, s * 0.11, 0.66, 0.2).rotateZ(s * 0.25)), patch); // the ears
  }
  S.add(P(boxGeo(0.22, 0.2, 0.22, 0, 0.62, 0.17)), main); // the head
  S.add(P(boxGeo(0.13, 0.1, 0.14, 0, 0.57, 0.32)), white); // the muzzle
  S.add(P(boxGeo(0.06, 0.05, 0.04, 0, 0.6, 0.4)), "#2b2120"); // the nose
  for (const s of [-1, 1]) S.add(P(boxGeo(0.035, 0.035, 0.02, s * 0.06, 0.67, 0.28)), "#1a1414"); // the eyes
  S.add(P(boxGeo(0.04, 0.04, 0.24, 0, 0.04, -0.4)), patch); // the tail, on the floor
}

/** Hilos' guayabera (s74: a white linen guayabera on the mannequin by the door): pleats down its front. */
function guayabera(c: Ctx, S: Smalls, x: number, z: number) {
  mannequin(c, S, x, z, "#f6f3ea", "#c8b48a");
  for (const ox of [-0.085, 0.085]) S.add(boxGeo(0.022, 0.32, 0.02, x + ox, 1.3, z + 0.13), "#ddd6c4");
  S.add(boxGeo(0.3, 0.02, 0.02, x, 1.16, z + 0.12), "#ddd6c4");
}

/** The pharmacy's door to the doctor's office next door (theme.ts roomExtras.pharmacyDoctor; s75: a consultorio, a
 *  cheap visit with no appointment), in the east wall, under its sign. */
function consultorioDoor(c: Ctx, S: Smalls) {
  const x = c.w / 2 - 0.05, z = -3.9;
  S.add(boxGeo(0.08, 2.3, 1.1, x, 1.15, z), "#9fd0bd");
  for (const s of [-1, 1]) S.add(boxGeo(0.1, 2.4, 0.08, x, 1.2, z + s * 0.59), "#2e8b57");
  S.add(boxGeo(0.1, 0.08, 1.26, x, 2.4, z), "#2e8b57");
  S.add(boxGeo(0.06, 0.06, 0.22, x - 0.07, 1.1, z + 0.35), "#9aa5ad");
  // its sign on the back wall by the corner (a sign beside the door would face away from the camera), pointing to it
  wallPanel(c, twoLineTexture("Consultorio médico →\nConsulta sin cita", { bg: "#2e8b57", fg: "#ffffff" }), 5.35, 2.95, -c.d / 2 + 0.2, 2.2, 0.55);
}

/** The bank's turns (theme.ts roomExtras.bankTurns; s78): the turn-ticket machine by the door under "Turnos", the
 *  display calling the turns to the windows ("¿Turno A-27?") and the board with the dollar's rate (bought at $17.20,
 *  sold at $18.10). */
function bankTurns(c: Ctx, S: Smalls) {
  const mx = -2.7, mz = 4.9;
  S.add(boxGeo(0.46, 1.6, 0.34, mx, 0.8, mz), "#1f4f8a");
  S.add(boxGeo(0.36, 0.24, 0.02, 0, 0, 0).rotateX(-0.3).translate(mx, 1.12, mz + 0.18), "#8fc3e0");
  S.add(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 12).rotateX(Math.PI / 2).translate(mx, 0.9, mz + 0.18), "#e45b4f");
  S.add(boxGeo(0.18, 0.02, 0.03, mx, 0.76, mz + 0.18), "#1d1d1d");
  S.add(boxGeo(0.07, 0.004, 0.12, mx + 0.03, 0.752, mz + 0.24), "#ffffff");
  c.col.addBox(mx, mz, 0.5, 0.4);
  S.add(boxGeo(0.06, 0.22, 0.06, mx, 1.71, mz), "#1f4f8a");
  wallPanel(c, plainTextTexture("Turnos", { bg: "#c9a227", fg: "#1f2f4f", w: 256, h: 96 }), mx, 1.93, mz + 0.04, 0.8, 0.3);
  wallPanel(c, canvasTex(384, 128, (x) => {
    x.fillStyle = "#101418"; x.fillRect(0, 0, 384, 128);
    x.fillStyle = "#ff8a3d"; x.font = "800 40px monospace"; x.textAlign = "center"; x.textBaseline = "middle";
    x.fillText("TURNO  A-27", 192, 40); x.fillText("VENTANILLA 2", 192, 92);
  }), -6.2, 2.75, -c.d / 2 + 0.05, 1.5, 0.5);
  wallPanel(c, canvasTex(384, 256, (x) => {
    x.fillStyle = "#1f4f8a"; x.fillRect(0, 0, 384, 256);
    x.strokeStyle = "#c9a227"; x.lineWidth = 8; x.strokeRect(4, 4, 376, 248);
    x.textAlign = "center"; x.fillStyle = "#c9a227"; x.font = "800 34px Nunito, Arial"; x.fillText("TIPO DE CAMBIO", 192, 50);
    x.fillStyle = "#ffffff"; x.font = "800 30px Nunito, Arial"; x.fillText("Dólar (USD)", 192, 104);
    x.font = "700 30px Nunito, Arial"; x.fillText("Compra  $17.20", 192, 160); x.fillText("Venta  $18.10", 192, 212);
  }), 6.2, 2.6, -c.d / 2 + 0.05, 1.3, 0.87);
}

/** The museum's stairs (theme.ts roomExtras.museumStairs; s70: the new exhibition, "Colores de la noche", is upstairs on
 *  the right): a flight up along the east wall towards the back, with a handrail, and the exhibition's sign at its foot. */
function museumStairs(c: Ctx) {
  const S = smalls(c);
  const x0 = 11.0, x1 = 12.8, steps = 14, rise = 0.28, run = 0.66, foot = 1.4, cx = (x0 + x1) / 2;
  for (let k = 0; k < steps; k++) {
    const h = (k + 1) * rise, sz = foot - k * run - run / 2;
    S.add(boxGeo(x1 - x0, h, run, cx, h / 2, sz), k % 2 ? "#ddd5c7" : "#d2c9b9");
    S.add(boxGeo(x1 - x0 + 0.02, 0.03, 0.05, cx, h + 0.015, sz + run / 2 - 0.025), "#9c8f7a");
  }
  const top = steps * rise, back = -c.d / 2, zTop = foot - steps * run;
  S.add(boxGeo(x1 - x0, top, zTop - back, cx, top / 2, (zTop + back) / 2), "#d2c9b9"); // the landing
  // the handrail on the open (west) side: posts on every other step and the rail along the slope
  for (let k = 0; k < steps; k += 2) S.add(cylGeo(0.025, 0.025, 0.9, x0 + 0.06, (k + 1) * rise + 0.45, foot - k * run - run / 2, 6), "#6b5a48");
  const len = Math.hypot(steps * run, steps * rise), ang = Math.atan2(rise, run);
  S.add(boxGeo(0.06, 0.05, len, 0, 0, 0).rotateX(ang).translate(x0 + 0.06, rise + 0.9 + (steps * rise) / 2 - rise / 2, foot - run / 2 - (steps * run) / 2 + run / 2), "#6b5a48");
  c.col.addBox(cx, (foot + back) / 2, x1 - x0 + 0.2, foot - back);
  // the exhibition's sign hangs over the stairs' foot, towards the room's open side (where the camera always is)
  wallPanel(c, twoLineTexture("Colores de la noche ↑\nNueva exposición · planta alta", { bg: "#2b2d6e", fg: "#ffd166" }), cx, 2.75, foot + 0.1, 2.0, 0.5);
  for (const s of [-0.85, 0.85]) S.add(cylGeo(0.008, 0.008, WALL_H - 3.0, cx + s, (WALL_H + 3.0) / 2, foot + 0.1, 4), "#3a3d42");
  S.done();
}

/** Diego and Natalia's dinner (theme.ts roomExtras.yucatanDinner; s85: cochinita pibil with tortillas, red onion and
 *  habanero salsa, agua de jamaica): on their table instead of the lasagna; and Michi the cat asleep on the sofa. */
function yucatanDinner(c: Ctx, S: Smalls) {
  const y = 0.79; // the table top (table() at 1.5, -1.5)
  S.add(new THREE.CylinderGeometry(0.28, 0.22, 0.07, 18).scale(1.1, 1, 0.75).translate(1.5, y + 0.035, -1.5), "#9c4a26");
  S.add(new THREE.SphereGeometry(0.25, 12, 8).scale(1.05, 0.24, 0.66).translate(1.5, y + 0.07, -1.5), "#c2502a");
  for (let i = 0; i < 7; i++) S.add(boxGeo(0.06, 0.012, 0.018, 1.36 + (i % 4) * 0.09, y + 0.125, -1.58 + Math.floor(i / 4) * 0.13, i * 0.7), "#d9668f");
  S.add(cylGeo(0.13, 0.11, 0.09, 0.55, y + 0.045, -1.18, 12), "#d9b98c"); // tortillas in their basket
  S.add(cylGeo(0.135, 0.135, 0.016, 0.55, y + 0.095, -1.18, 12), "#e4007c");
  S.add(cylGeo(0.06, 0.045, 0.05, 1.0, y + 0.025, -1.56, 10), "#f77f00"); // habanero salsa
  S.add(cylGeo(0.05, 0.05, 0.02, 0.86, y + 0.01, -1.7, 10), "#ffffff");
  for (let i = 0; i < 3; i++) S.add(new THREE.SphereGeometry(0.03, 6, 4).scale(1, 0.6, 1).translate(0.82 + i * 0.04, y + 0.03, -1.7), "#7cb518"); // lime
  S.add(cylGeo(0.085, 0.09, 0.26, 2.2, y + 0.13, -1.5, 12), "#8b1a3a"); // agua de jamaica in its jug
  S.add(cylGeo(0.088, 0.088, 0.04, 2.2, y + 0.28, -1.5, 12), "#e3f1f4");
  // Michi, an orange tabby, curled up asleep on the sofa
  const mx = -4.6, mz = 2.62, my = 0.58;
  S.add(new THREE.SphereGeometry(0.17, 12, 8).scale(1.25, 0.6, 1).translate(mx, my + 0.09, mz), "#e08a3c");
  S.add(new THREE.SphereGeometry(0.09, 10, 8).translate(mx + 0.17, my + 0.12, mz + 0.08), "#e08a3c");
  for (const s of [-1, 1]) S.add(new THREE.ConeGeometry(0.03, 0.06, 4).translate(mx + 0.17 + s * 0.04, my + 0.21, mz + 0.06), "#c06a2a");
  S.add(new THREE.TorusGeometry(0.15, 0.03, 6, 14, Math.PI * 1.2).rotateX(Math.PI / 2).translate(mx, my + 0.04, mz), "#c06a2a");
  for (let i = 0; i < 3; i++) S.add(boxGeo(0.02, 0.012, 0.16, mx - 0.08 + i * 0.08, my + 0.19, mz, 0), "#b8611f");
}

/** Diego and Natalia's house as a Yucatecan home (theme.ts `homeMx`; s85, p30), in the room's smalls: a ceiling fan
 *  over the table, the family altar under the Virgin of Guadalupe (a lace cloth, veladoras, cempasúchil and roses), a
 *  hammock along the west wall, plants in clay pots, and the garrafón of drinking water on its stand by the kitchen. */
function homeMx(c: Ctx, S: Smalls) {
  // the ceiling fan over the table
  ceilingFan(S, 1.5, -1.5);
  // the altar against the back wall, under the picture
  const ax = -1.5, az = -c.d / 2 + 0.4, ay = 0.9;
  S.add(boxGeo(1.3, ay, 0.5, ax, ay / 2, az), "#8a5a3c");
  S.add(boxGeo(1.36, 0.02, 0.56, ax, ay + 0.01, az), "#fbf8f1");
  S.add(boxGeo(1.36, 0.3, 0.01, ax, ay - 0.14, az + 0.285), "#fbf8f1");
  for (let i = 0; i < 9; i++) S.add(new THREE.CylinderGeometry(0.035, 0.035, 0.012, 6).rotateX(Math.PI / 2).translate(ax - 0.6 + i * 0.15, ay - 0.3, az + 0.29), "#fbf8f1"); // the lace's scallops
  [[-0.5, 0.0, "#c8102e"], [-0.32, 0.12, "#f4f1ea"], [0.32, 0.12, "#f6c000"], [0.5, 0.0, "#c8102e"], [0.12, 0.16, "#f4f1ea"]].forEach(([dx, dz, col]) => {
    const vx = ax + (dx as number), vz = az + (dz as number);
    S.add(cylGeo(0.045, 0.045, 0.2, vx, ay + 0.12, vz, 8), col as string);
    S.add(new THREE.ConeGeometry(0.018, 0.06, 5).translate(vx, ay + 0.25, vz), "#ffcf4a");
  });
  for (const [dx, cols] of [[-0.12, ["#f77f00", "#ff9f1c", "#f77f00"]], [0.2, ["#d62839", "#e4007c", "#d62839"]]] as [number, string[]][]) {
    S.add(cylGeo(0.06, 0.05, 0.18, ax + dx, ay + 0.09, az - 0.08, 8), "#3d6fa8");
    for (let i = 0; i < 5; i++) S.add(new THREE.OctahedronGeometry(0.05, 0).translate(ax + dx + Math.cos(i * 1.3) * 0.06, ay + 0.24 + (i % 2) * 0.05, az - 0.08 + Math.sin(i * 1.3) * 0.05), cols[i % 3]);
  }
  c.col.addBox(ax, az, 1.4, 0.6);
  // a hammock along the west wall, its hooks in the wall
  hammock(c, S, -c.w / 2 + 0.25, -3.6, 0.6);
  // plants in clay pots: by the door and on the east side
  for (const [px, pz, s] of [[2.4, 5.0, 0.9], [7.25, 1.6, 1.1], [6.4, 4.9, 0.8]] as [number, number, number][]) clayPlant(c, S, px, pz, s);
  // the garrafón of drinking water on its stand, by the kitchen counter
  garrafon(c, S, 2.75, -5.35);
  // (graphics round 2) the middle of the floor: a petate, and the television on its low stand by the east wall,
  // showing the fútbol
  petate(S, 5.25, 1.55, 2.3, 1.6);
  tvStand(c, S, c.w / 2 - 0.45, -1.75, -Math.PI / 2);
}

/** A ceiling fan hanging over (x, z): its rod, the motor, four wooden blades and a light under it. In the smalls. */
function ceilingFan(S: Smalls, x: number, z: number, blades = "#8a5a3c", turn = 0.4) {
  S.add(cylGeo(0.02, 0.02, WALL_H - 3.62, x, (WALL_H + 3.62) / 2, z, 6), "#3a3d42");
  S.add(cylGeo(0.13, 0.15, 0.16, x, 3.6, z, 12), "#f1ece2");
  for (let i = 0; i < 4; i++) S.add(boxGeo(0.72, 0.02, 0.17, 0.5, 0, 0).rotateY(i * Math.PI / 2 + turn).translate(x, 3.56, z), blades);
  S.add(new THREE.SphereGeometry(0.14, 12, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).translate(x, 3.52, z), "#fbf3d5");
}

/** A leafy plant in a terracotta pot (`s` its size), with its collider. In the smalls. */
function clayPlant(c: Ctx, S: Smalls, x: number, z: number, s = 1) {
  S.add(cylGeo(0.24 * s, 0.17 * s, 0.4 * s, x, 0.2 * s, z, 10), "#b5562f");
  S.add(cylGeo(0.26 * s, 0.26 * s, 0.05 * s, x, 0.4 * s, z, 10), "#a24a2a");
  S.add(new THREE.IcosahedronGeometry(0.42 * s, 0).scale(1, 1.15, 1).translate(x, 0.8 * s, z), "#3f7d3a");
  S.add(new THREE.IcosahedronGeometry(0.28 * s, 0).translate(x + 0.12 * s, 1.15 * s, z - 0.08 * s), "#5a9a3a");
  c.col.addCircle(x, z, 0.3 * s);
}

/** The garrafón: a big bottle of drinking water upside down on its wooden stand. In the smalls. */
function garrafon(c: Ctx, S: Smalls, x: number, z: number) {
  S.add(boxGeo(0.4, 0.62, 0.4, x, 0.31, z), "#8a5a3c");
  S.add(boxGeo(0.44, 0.04, 0.44, x, 0.64, z), "#6f4a2c");
  S.add(cylGeo(0.17, 0.17, 0.4, x, 0.92, z, 12), "#9fd3ec");
  S.add(new THREE.SphereGeometry(0.17, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2).translate(x, 1.12, z), "#9fd3ec");
  S.add(cylGeo(0.05, 0.06, 0.07, x, 0.69, z, 8), "#2a7fc0");
  c.col.addBox(x, z, 0.45, 0.45);
}

// ---------------------------------------------------------------------------
// Graphics round 2 (theme.ts roomExtras: lasPalmas, hotelMx, policeMx, museumMaya, airportMx, clinicMx, shopsMx,
// cafeMx, muelleMx; docs/es/TOWN.md "Graphics, round 2"): the rooms' Mexican things, in each room's smalls

/** A palm in a terracotta pot (an areca: long pointed fronds fanning out of it), with its collider. In the smalls. */
function potPalm(c: Ctx, S: Smalls, x: number, z: number, s = 1) {
  S.add(cylGeo(0.3 * s, 0.22 * s, 0.5 * s, x, 0.25 * s, z, 12), "#b5562f");
  S.add(cylGeo(0.33 * s, 0.33 * s, 0.06 * s, x, 0.5 * s, z, 12), "#a24a2a");
  const r = rand(Math.round(Math.abs(x * 31 + z * 17)) + 7);
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2 + r() * 0.5, tilt = 0.22 + (i % 3) * 0.3 + r() * 0.12, len = (1.05 + r() * 0.5) * s;
    // a frond: a long flat diamond from the pot's middle, wide across, leaning out
    const g = new THREE.OctahedronGeometry(0.5, 0).scale(0.05 * s, len, 0.36 * s).translate(0, len / 2, 0).rotateZ(-tilt).rotateY(a);
    S.add(g.translate(x, 0.46 * s, z), ["#3f8f3a", "#4fa64a", "#367d34"][i % 3]);
  }
  c.col.addCircle(x, z, 0.36 * s);
}

/** A minisplit (the air conditioner on the wall; p29: "el minisplit no enfría") on the back wall, its front to +z: the
 *  white unit with its louver and its little green light, and the white duct taking its pipes away along the wall. */
function minisplit(S: Smalls, x: number, y: number, z: number) {
  S.add(boxGeo(1.05, 0.3, 0.22, x, y, z + 0.11), "#f4f5f2");
  S.add(boxGeo(1.07, 0.04, 0.23, x, y + 0.15, z + 0.115), "#e1e4e0");
  S.add(boxGeo(0.92, 0.05, 0.03, 0, 0, 0).rotateX(-0.5).translate(x, y - 0.1, z + 0.235), "#d4d9d5"); // the louver
  S.add(boxGeo(0.9, 0.03, 0.01, x, y - 0.135, z + 0.215), "#4a4f55"); // the dark slot under it
  S.add(boxGeo(0.035, 0.035, 0.01, x + 0.42, y + 0.06, z + 0.224), "#39c46a"); // the light
  S.add(boxGeo(0.9, 0.07, 0.06, x + 0.97, y + 0.06, z + 0.03), "#eceeea"); // the duct
}

/** Iron bars (a protección) over one of windowBack's windows (at x, `w` wide, `h` high, its middle at y): upright bars,
 *  three cross bars and a scroll in the middle. */
function windowGrille(c: Ctx, S: Smalls, x: number, w: number, h = 2, y = 2.2) {
  const z = -c.d / 2 + 0.13, n = Math.max(3, Math.round(w / 0.22));
  for (let i = 0; i <= n; i++) S.add(boxGeo(0.03, h + 0.1, 0.03, x - w / 2 + (i * w) / n, y, z), "#2b2b2e");
  for (const yy of [y - h / 2 - 0.02, y + h / 2 + 0.02, y - h * 0.18]) S.add(boxGeo(w + 0.08, 0.035, 0.035, x, yy, z), "#2b2b2e");
  S.add(new THREE.TorusGeometry(0.12, 0.016, 4, 12).translate(x, y - h * 0.18 + 0.135, z), "#2b2b2e");
}

/** Talavera tiles over a w × h rectangle in its own frame (centred on (0, 0), facing +z), placed by `at`: white tiles
 *  with a cobalt flower and a yellow heart, every other flower turned, blue grout. In the smalls. */
function talavera(S: Smalls, w: number, h: number, at: (g: THREE.BufferGeometry) => THREE.BufferGeometry, size = 0.2) {
  const nx = Math.max(1, Math.round(w / size)), ny = Math.max(1, Math.round(h / size)), tw = w / nx, th = h / ny;
  S.add(at(new THREE.PlaneGeometry(w, h)), "#1f4e9c");
  for (let i = 0; i < nx; i++) for (let k = 0; k < ny; k++) {
    const cx = -w / 2 + (i + 0.5) * tw, cy = -h / 2 + (k + 0.5) * th, odd = (i + k) % 2;
    S.add(at(new THREE.PlaneGeometry(tw * 0.9, th * 0.9).translate(cx, cy, 0.003)), "#f7f3ea");
    S.add(at(new THREE.PlaneGeometry(tw * 0.5, th * 0.5).rotateZ(odd ? Math.PI / 4 : 0).translate(cx, cy, 0.006)), odd ? "#1f4e9c" : "#2b6cb0");
    S.add(at(new THREE.PlaneGeometry(tw * 0.17, th * 0.17).rotateZ(Math.PI / 4).translate(cx, cy, 0.009)), "#f2b705");
  }
}

/** A rattan armchair (a sofa when `len` is longer), facing `rot` as sofa() does (0: +z; the back towards -z): the cane
 *  frame in honey with darker weave, cream cushions, slender legs; with its collider. In the smalls. */
function rattan(c: Ctx, S: Smalls, x: number, z: number, rot: number, len = 0.85) {
  const P = (g: THREE.BufferGeometry) => g.rotateY(rot).translate(x, 0, z);
  const cane = "#c89a5a", dark = "#9c7240", cush = "#f3ead7";
  S.add(P(boxGeo(len, 0.12, 0.8, 0, 0.36, 0)), cane);
  S.add(P(boxGeo(len - 0.14, 0.12, 0.66, 0, 0.47, 0.03)), cush);
  S.add(P(boxGeo(len, 0.62, 0.1, 0, 0, 0).rotateX(-0.18).translate(0, 0.72, -0.36)), cane);
  S.add(P(boxGeo(len - 0.22, 0.4, 0.08, 0, 0, 0).rotateX(-0.18).translate(0, 0.74, -0.28)), cush);
  for (let k = 0; k < 3; k++) S.add(P(boxGeo(len + 0.006, 0.025, 0.104, 0, 0, 0).rotateX(-0.18).translate(0, 0.52 + k * 0.17, -0.36)), dark);
  for (const s of [-1, 1]) {
    S.add(P(boxGeo(0.1, 0.32, 0.8, s * (len / 2 - 0.05), 0.58, 0)), cane);
    S.add(P(boxGeo(0.12, 0.04, 0.82, s * (len / 2 - 0.05), 0.75, 0)), dark);
  }
  for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) S.add(P(cylGeo(0.025, 0.03, 0.3, lx * (len / 2 - 0.08), 0.15, lz * 0.32, 6)), dark);
  S.add(P(boxGeo(len + 0.01, 0.03, 0.03, 0, 0.36, 0.4)), dark);
  const cw = Math.abs(Math.cos(rot)) * len + Math.abs(Math.sin(rot)) * 0.85, cd = Math.abs(Math.sin(rot)) * len + Math.abs(Math.cos(rot)) * 0.85;
  c.col.addBox(x, z, cw, cd);
}

/** A runner woven like a zarape (`w` across, `d` long, along z): bands of strong colors across it with thin black and
 *  white lines between them, a fringe at each end. In the smalls. */
function zarapeRunner(S: Smalls, x: number, z: number, w: number, d: number) {
  const bands: [string, number][] = [["#e4007c", 0.42], ["#2b2b2e", 0.05], ["#f6a800", 0.22], ["#f4f1ea", 0.05], ["#00a6a6", 0.3], ["#2b2b2e", 0.05], ["#ff5a36", 0.36], ["#f4f1ea", 0.05], ["#7ac143", 0.2], ["#2b2b2e", 0.05], ["#6d2e9e", 0.16], ["#f4f1ea", 0.05]];
  let zz = z - d / 2, i = 0;
  while (zz < z + d / 2 - 1e-3) {
    const [col, k] = bands[i++ % bands.length], t = Math.min(k, z + d / 2 - zz);
    S.add(boxGeo(w, 0.022, t, x, 0.012, zz + t / 2), col);
    zz += t;
  }
  for (const e of [-1, 1]) for (let f = -w / 2 + 0.06; f < w / 2; f += 0.12) S.add(boxGeo(0.03, 0.01, 0.16, x + f, 0.006, z + e * (d / 2 + 0.08)), "#f4ecd8");
}

/** A step-fret frieze (a Mesoamerican greca) `len` long and `h` high in its own frame (centred, facing +z), placed by
 *  `at`: stepped pyramids rising from its bottom line, the same hanging from its top line between them. */
function greca(S: Smalls, len: number, h: number, at: (g: THREE.BufferGeometry) => THREE.BufferGeometry, fg: string, bg: string) {
  S.add(at(new THREE.PlaneGeometry(len, h)), bg);
  const c = h / 7, steps = [1, 2, 3, 3, 2, 1, 0, 0, 0, 0], n = Math.floor(len / (c * steps.length)), x0 = -(n * c * steps.length) / 2;
  for (const s of [-1, 1]) S.add(at(new THREE.PlaneGeometry(len, c).translate(0, s * (h / 2 - c / 2), 0.003)), fg);
  for (let u = 0; u < n; u++) steps.forEach((_, i) => {
    const up = steps[i], down = steps[(i + 5) % steps.length], x = x0 + (u * steps.length + i + 0.5) * c;
    if (up) S.add(at(new THREE.PlaneGeometry(c * 1.004, up * c).translate(x, -h / 2 + c + (up * c) / 2, 0.003)), fg);
    if (down) S.add(at(new THREE.PlaneGeometry(c * 1.004, down * c).translate(x, h / 2 - c - (down * c) / 2, 0.003)), fg);
  });
}

/** A Maya stela on its low base, its carved face towards `rot` (0: +z): a tall slab of pale limestone carved with a
 *  standing lord in a feathered headdress holding the ceremonial bar, glyph blocks down both sides. In the smalls. */
function stela(c: Ctx, S: Smalls, x: number, z: number, rot: number, h = 2.3) {
  const P = (g: THREE.BufferGeometry) => g.rotateY(rot).translate(x, 0, z);
  const stone = "#d3c9ad", relief = "#beb291", deep = "#8f8468", y0 = 0.18;
  S.add(P(boxGeo(1.3, y0, 0.8, 0, y0 / 2, 0)), "#9c9480");
  S.add(P(boxGeo(0.95, h, 0.34, 0, y0 + h / 2, 0)), stone);
  S.add(P(boxGeo(0.85, 0.12, 0.3, 0, y0 + h + 0.06, 0)), stone); // the worn top
  const F = (w: number, hh: number, xx: number, yy: number, col = relief, d = 0.03) => S.add(P(boxGeo(w, hh, d, xx, y0 + yy, 0.17 + d / 2)), col);
  F(0.6, h - 0.32, 0, h / 2, deep, 0.006); // the panel's sunk ground
  F(0.36, 0.08, 0, 0.3); // the feet
  for (const s of [-1, 1]) F(0.1, 0.42, s * 0.08, 0.54); // the legs
  F(0.34, 0.06, 0, 0.78, deep); // the belt
  F(0.32, 0.46, 0, 1.03); // the body
  F(0.52, 0.07, 0, 1.12, stone, 0.04); // the bar across the chest
  F(0.17, 0.19, 0, 1.38); // the head
  F(0.46, 0.13, 0, 1.55); // the headdress's band
  for (let i = 0; i < 5; i++) F(0.06, 0.34, -0.16 + i * 0.08, 1.76 + (i % 2) * 0.05); // its feathers
  for (const s of [-1, 1]) for (let k = 0; k < 7; k++) F(0.12, 0.12, s * 0.37, 0.38 + k * 0.25, k % 2 ? relief : deep);
  c.col.addCircle(x, z, 0.62);
}

/** A chac mool: a reclining stone figure on its back, its knees up, propped on its elbows, its head turned to look at
 *  you, a bowl held on its belly; on a plinth's top at y, lying along `rot` (0: the head towards -x). In the smalls. */
function chacMool(S: Smalls, x: number, y: number, z: number, rot: number) {
  const P = (g: THREE.BufferGeometry) => g.rotateY(rot).translate(x, y, z);
  const st = "#b9b19a", dk = "#9a927b";
  S.add(P(boxGeo(1.08, 0.1, 0.52, 0, 0.05, 0)), dk); // its slab
  S.add(P(boxGeo(0.3, 0.2, 0.4, 0.08, 0.2, 0)), st); // the hips
  S.add(P(boxGeo(0.44, 0.18, 0.38, 0, 0, 0).rotateZ(-0.5).translate(-0.24, 0.33, 0)), st); // the torso, leaning up
  for (const s of [-1, 1]) S.add(P(boxGeo(0.09, 0.26, 0.09, -0.36, 0.2, s * 0.21)), dk); // the elbows down
  S.add(P(boxGeo(0.22, 0.24, 0.22, 0, 0, 0).rotateY(0.9).translate(-0.48, 0.58, 0.02)), st); // the head, turned
  S.add(P(boxGeo(0.3, 0.07, 0.26, 0, 0, 0).rotateY(0.9).translate(-0.48, 0.73, 0.02)), dk); // its headdress
  for (const s of [-1, 1]) {
    S.add(P(boxGeo(0.34, 0.12, 0.12, 0, 0, 0).rotateZ(0.95).translate(0.27, 0.38, s * 0.11)), st); // the thighs, up
    S.add(P(boxGeo(0.12, 0.4, 0.12, 0, 0, 0).rotateZ(-0.25).translate(0.46, 0.33, s * 0.11)), st); // the shins
    S.add(P(boxGeo(0.17, 0.07, 0.11, 0.53, 0.14, s * 0.11)), dk); // the feet
  }
  S.add(P(cylGeo(0.13, 0.1, 0.08, -0.08, 0.43, 0, 12)), dk); // the bowl on its belly
}

/** A painted Maya vase (a cylinder in red-orange or cream with black bands and glyphs) standing at (x, y, z). */
function mayaVase(S: Smalls, x: number, y: number, z: number, s = 1, k = 0) {
  const body = ["#c8643b", "#e2c08e", "#b5502e"][k % 3], ink = "#2b211c";
  S.add(cylGeo(0.13 * s, 0.11 * s, 0.34 * s, x, y + 0.17 * s, z, 12), body);
  S.add(cylGeo(0.133 * s, 0.133 * s, 0.035 * s, x, y + 0.3 * s, z, 12), ink);
  S.add(cylGeo(0.12 * s, 0.12 * s, 0.03 * s, x, y + 0.05 * s, z, 12), ink);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; S.add(boxGeo(0.05 * s, 0.07 * s, 0.01, x + Math.sin(a) * 0.128 * s, y + 0.18 * s, z + Math.cos(a) * 0.128 * s, a), i % 2 ? ink : "#efe0bd"); }
}

/** A plinth (a white block) with a vase or two on it and a little white label, with its collider. */
function plinth(c: Ctx, S: Smalls, x: number, z: number, h: number, vases: number, k = 0) {
  S.add(boxGeo(0.62, h, 0.62, x, h / 2, z), "#f4f1ea");
  S.add(boxGeo(0.66, 0.04, 0.66, x, h + 0.02, z), "#e3ddd0");
  for (let i = 0; i < vases; i++) mayaVase(S, x + (vases > 1 ? (i - 0.5) * 0.28 : 0), h + 0.04, z, vases > 1 ? 0.8 : 1.15, k + i);
  S.add(boxGeo(0.16, 0.1, 0.01, x + 0.18, h * 0.62, z + 0.315), "#ffffff");
  c.col.addBox(x, z, 0.7, 0.7);
}

/** A model of the ruins on a white table (s69: the ruins on the point past the beach): the jungle round a stepped
 *  pyramid with its temple and its stairway, a lower platform and the sea on one side. With its collider. */
function ruinsModel(c: Ctx, S: Smalls, x: number, z: number) {
  S.add(boxGeo(2.2, 0.82, 1.5, x, 0.41, z), "#ece6d8");
  S.add(boxGeo(2.3, 0.05, 1.6, x, 0.845, z), "#9c8f7a");
  S.add(boxGeo(2.12, 0.03, 1.08, x, 0.885, z + 0.21), "#7fae5a"); // the land
  S.add(boxGeo(2.12, 0.02, 0.4, x, 0.88, z - 0.53), "#3fc1c0"); // the sea along the back
  const px = x - 0.25, pz = z + 0.1;
  for (let i = 0; i < 5; i++) { const w = 0.95 - i * 0.16; S.add(boxGeo(w, 0.1, w * 0.86, px, 0.95 + i * 0.1, pz), i % 2 ? "#cdbf9e" : "#dacdad"); }
  S.add(boxGeo(0.2, 0.46, 0.16, 0, 0, 0).rotateX(-0.85).translate(px, 1.12, pz + 0.38), "#bcae8c"); // the stairway
  S.add(boxGeo(0.26, 0.16, 0.22, px, 1.5, pz), "#d6c9a8"); // the temple on top
  S.add(boxGeo(0.08, 0.1, 0.01, px, 1.48, pz + 0.111), "#3a3530");
  S.add(boxGeo(0.5, 0.12, 0.4, x + 0.6, 0.96, z - 0.12), "#cdbf9e"); // a lower platform by the sea
  S.add(boxGeo(0.2, 0.12, 0.16, x + 0.6, 1.08, z - 0.12), "#d6c9a8");
  const r = rand(55);
  for (let i = 0; i < 14; i++) {
    const a = r() * Math.PI * 2, d = 0.5 + r() * 0.35;
    S.add(new THREE.IcosahedronGeometry(0.07 + r() * 0.04, 0).translate(x + Math.cos(a) * d * 1.35, 0.95, z + 0.25 + Math.sin(a) * d * 0.45), ["#3f7d3a", "#2f6b33", "#4f9a3e"][i % 3]);
  }
  c.col.addBox(x, z, 2.35, 1.65);
}

/** The municipal police's shield, flat on the rug at (x, z), its top towards the back of the room (instead of the
 *  badge's star): a gold edge, a white line, a navy field with a ribbon in Mexico's colors across its top and a golden
 *  hummingbird (the town's) in the middle. In the smalls. */
function policeShield(S: Smalls, x: number, z: number, s = 1) {
  const shield = (w: number, h: number) => {
    const p = new THREE.Shape();
    p.moveTo(-w / 2, h / 2); p.lineTo(w / 2, h / 2); p.lineTo(w / 2, -h * 0.05);
    p.quadraticCurveTo(w / 2, -h * 0.36, 0, -h / 2); p.quadraticCurveTo(-w / 2, -h * 0.36, -w / 2, -h * 0.05); p.closePath();
    return p;
  };
  const flat = (g: THREE.BufferGeometry, y: number) => g.scale(s, s, 1).rotateX(-Math.PI / 2).translate(x, y, z);
  S.add(flat(new THREE.ShapeGeometry(shield(1.7, 2.0), 8), 0.024), "#c9a227");
  S.add(flat(new THREE.ShapeGeometry(shield(1.5, 1.8), 8), 0.026), "#f4f1ea");
  S.add(flat(new THREE.ShapeGeometry(shield(1.38, 1.68), 8), 0.028), "#1f3358");
  ["#006847", "#f8f8f4", "#ce1126"].forEach((col, i) => S.add(flat(new THREE.PlaneGeometry(0.4, 0.2).translate((i - 1) * 0.4, 0.58, 0), 0.031), col));
  // the hummingbird, flying to the right: its body, head and long beak, a wing raised, the forked tail
  const bird: THREE.Shape[] = [];
  const body = new THREE.Shape(); body.absellipse(-0.05, -0.12, 0.25, 0.1, 0, Math.PI * 2, false, 0.45); bird.push(body);
  const head = new THREE.Shape(); head.absarc(0.2, 0.06, 0.09, 0, Math.PI * 2, false); bird.push(head);
  const beak = new THREE.Shape(); beak.moveTo(0.27, 0.09); beak.lineTo(0.62, 0.17); beak.lineTo(0.28, 0.04); beak.closePath(); bird.push(beak);
  const wing = new THREE.Shape(); wing.moveTo(-0.08, -0.04); wing.lineTo(-0.36, 0.42); wing.lineTo(-0.12, 0.36); wing.lineTo(0.1, 0.0); wing.closePath(); bird.push(wing);
  const tail = new THREE.Shape(); tail.moveTo(-0.22, -0.2); tail.lineTo(-0.5, -0.5); tail.lineTo(-0.36, -0.28); tail.lineTo(-0.44, -0.18); tail.closePath(); bird.push(tail);
  for (const sh of bird) S.add(flat(new THREE.ShapeGeometry(sh, 10).translate(0, -0.05, 0), 0.034), "#e0b83a");
  S.add(flat(new THREE.CircleGeometry(0.022, 8).translate(0.23, 0.03, 0), 0.036), "#1f3358"); // its eye
}

/** A petate: a mat woven of palm leaves, in two tones in a checker of strips, its edge bound darker; flat on the floor. */
function petate(S: Smalls, x: number, z: number, w: number, d: number) {
  S.add(boxGeo(w, 0.018, d, x, 0.01, z), "#d8b778");
  const n = 8, m = Math.round((n * d) / w);
  for (let i = 0; i < n; i++) for (let k = 0; k < m; k++) if ((i + k) % 2) S.add(boxGeo(w / n - 0.02, 0.004, d / m - 0.02, x - w / 2 + (i + 0.5) * (w / n), 0.021, z - d / 2 + (k + 0.5) * (d / m)), "#c49a55");
  for (const s of [-1, 1]) { S.add(boxGeo(w, 0.022, 0.07, x, 0.012, z + s * (d / 2 - 0.035)), "#9c7240"); S.add(boxGeo(0.07, 0.022, d, x + s * (w / 2 - 0.035), 0.012, z), "#9c7240"); }
}

/** A low wooden stand with the television on it, its screen towards `rot` (0: +z), showing a fútbol match (a green
 *  pitch, its white lines, the players as dots); with its collider. In the smalls. */
function tvStand(c: Ctx, S: Smalls, x: number, z: number, rot: number) {
  const P = (g: THREE.BufferGeometry) => g.rotateY(rot).translate(x, 0, z);
  S.add(P(boxGeo(1.6, 0.5, 0.45, 0, 0.25, 0)), "#8a5a3c");
  for (const s of [-1, 1]) S.add(P(boxGeo(0.7, 0.36, 0.02, s * 0.38, 0.25, 0.226)), "#6f4a2c"); // its doors
  S.add(P(boxGeo(0.3, 0.04, 0.2, 0, 0.52, -0.02)), "#26292e");
  S.add(P(boxGeo(1.15, 0.68, 0.06, 0, 0.92, -0.05)), "#1d1d1d");
  S.add(P(boxGeo(1.05, 0.58, 0.01, 0, 0.92, -0.017)), "#3f9b46");
  for (const [w, h, ox, oy] of [[0.012, 0.56, 0, 0], [1.03, 0.012, 0, 0.28], [1.03, 0.012, 0, -0.28], [0.16, 0.012, -0.44, 0.08], [0.16, 0.012, -0.44, -0.08]] as [number, number, number, number][]) S.add(P(boxGeo(w, h, 0.004, ox, 0.92 + oy, -0.01)), "#e9f5e4");
  for (const [ox, oy, col] of [[-0.2, 0.1, "#d62828"], [0.15, -0.05, "#1f4e9c"], [0.3, 0.15, "#d62828"], [-0.05, -0.15, "#1f4e9c"]] as [number, number, string][]) S.add(P(boxGeo(0.025, 0.035, 0.004, ox, 0.92 + oy, -0.008)), col);
  const cw = Math.abs(Math.cos(rot)) * 1.6 + Math.abs(Math.sin(rot)) * 0.45, cd = Math.abs(Math.sin(rot)) * 1.6 + Math.abs(Math.cos(rot)) * 0.45;
  c.col.addBox(x, z, cw, cd);
}

/** Straw hats (sombreros de palma) stacked on a surface at (x, y, z), `n` high. */
function hatStack(S: Smalls, x: number, y: number, z: number, n: number, band = "#c8102e") {
  for (let i = 0; i < n; i++) {
    const yy = y + i * 0.06;
    S.add(cylGeo(0.3, 0.3, 0.02, x, yy + 0.01, z, 16), i % 2 ? "#e6c983" : "#dcbc72");
    if (i === n - 1) {
      S.add(cylGeo(0.13, 0.15, 0.14, x, yy + 0.09, z, 12), "#e6c983");
      S.add(cylGeo(0.152, 0.152, 0.03, x, yy + 0.035, z, 12), band);
    }
  }
}

/** A rebozo (a long striped shawl) folded over a rail: two hanging halves of the cloth, in its colors. */
function rebozo(S: Smalls, x: number, y: number, z: number, cols: string[]) {
  cols.forEach((col, i) => S.add(boxGeo(0.07, 0.62, 0.42, x + (i - (cols.length - 1) / 2) * 0.075, y - 0.31, z), col));
  S.add(boxGeo(cols.length * 0.075 + 0.02, 0.04, 0.44, x, y - 0.64, z), "#f4f1ea"); // the fringe
}

/** A white blouse embroidered with flowers (a blusa bordada) hanging on a rail: the cloth, a band of embroidery across
 *  the chest and round the sleeves. */
function blusa(S: Smalls, x: number, y: number, z: number, k: number) {
  const thread = [["#e4007c", "#f6a800", "#2a9d5c"], ["#1f6fd1", "#e4007c", "#f6c000"], ["#c8102e", "#7ac143", "#6d2e9e"]][k % 3];
  S.add(boxGeo(0.08, 0.66, 0.5, x, y - 0.33, z), "#f8f6f0");
  thread.forEach((col, i) => S.add(boxGeo(0.084, 0.045, 0.42, x, y - 0.1 - i * 0.05, z), col));
  S.add(boxGeo(0.084, 0.03, 0.5, x, y - 0.6, z), thread[0]);
}

/** Conchas (the shell-topped sweet buns) on a tray at (x, y, z): domes with their sugar crust in vanilla, chocolate or
 *  pink, the shell's grooves darker. */
function conchas(S: Smalls, x: number, y: number, z: number, nx: number, nz: number) {
  S.add(boxGeo(nx * 0.22 + 0.06, 0.015, nz * 0.22 + 0.06, x, y + 0.008, z), "#c9ced3");
  for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) {
    const bx = x - (nx - 1) * 0.11 + i * 0.22, bz = z - (nz - 1) * 0.11 + k * 0.22, top = ["#f6e7c1", "#7a4a2a", "#f2b8c6"][(i + k * 2) % 3];
    S.add(new THREE.SphereGeometry(0.095, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.65, 1).translate(bx, y + 0.015, bz), "#d9a35e");
    S.add(new THREE.SphereGeometry(0.098, 10, 4, 0, Math.PI * 2, 0, Math.PI / 3).scale(1, 0.62, 1).translate(bx, y + 0.02, bz), top);
    for (const t of [-0.6, 0, 0.6]) S.add(boxGeo(0.15, 0.008, 0.012, bx, y + 0.083, bz, t), "#b98a52");
  }
}

/** A jarrito (a little clay mug) hanging on a peg on a wall facing `rot`'s +z. */
function jarrito(S: Smalls, x: number, y: number, z: number, rot: number) {
  const P = (g: THREE.BufferGeometry) => g.rotateY(rot).translate(x, y, z);
  S.add(P(cylGeo(0.055, 0.045, 0.11, 0, -0.06, 0.08, 10)), "#b5562f");
  S.add(P(cylGeo(0.058, 0.058, 0.025, 0, -0.02, 0.08, 10)), "#e9d4a8"); // the painted rim
  S.add(P(new THREE.TorusGeometry(0.03, 0.01, 4, 8).rotateY(Math.PI / 2).translate(0, -0.06, 0.02)), "#b5562f");
  S.add(P(boxGeo(0.02, 0.02, 0.06, 0, 0, 0.03)), "#6b4a2a"); // the peg
}

/** A little altar on a corner shelf (the salon's): the Virgin's picture as a blue-green panel with gold, a vase of
 *  roses and candles, on a wall facing `rot`'s +z. */
function shelfAltar(S: Smalls, x: number, y: number, z: number, rot: number) {
  const P = (g: THREE.BufferGeometry) => g.rotateY(rot).translate(x, y, z);
  S.add(P(boxGeo(0.7, 0.04, 0.26, 0, 0, 0.13)), "#8a5a3c");
  S.add(P(boxGeo(0.34, 0.44, 0.03, 0, 0.27, 0.03)), "#c9a227");
  S.add(P(boxGeo(0.28, 0.38, 0.01, 0, 0.27, 0.05)), "#1f7a72");
  S.add(P(boxGeo(0.1, 0.22, 0.012, 0, 0.25, 0.057)), "#d9828f");
  S.add(P(cylGeo(0.04, 0.035, 0.12, 0.24, 0.08, 0.14, 8)), "#3d6fa8");
  for (let i = 0; i < 4; i++) S.add(P(new THREE.OctahedronGeometry(0.04, 0).translate(0.24 + Math.cos(i * 1.6) * 0.04, 0.17 + (i % 2) * 0.04, 0.14 + Math.sin(i * 1.6) * 0.03)), "#d62839");
  for (const [dx, col] of [[-0.24, "#c8102e"], [-0.15, "#f4f1ea"]] as [number, string][]) { S.add(P(cylGeo(0.03, 0.03, 0.12, dx, 0.08, 0.15, 8)), col); S.add(P(new THREE.ConeGeometry(0.012, 0.04, 5).translate(dx, 0.16, 0.15)), "#ffcf4a"); }
}

/** A fishing net hung on the west wall (x), over z0…z1, sagging: its knotted mesh as thin strips, orange floats along
 *  its top. In the smalls. */
function fishingNet(S: Smalls, x: number, z0: number, z1: number, y0: number, y1: number) {
  const ink = "#4a3b2c";
  for (let z = z0; z <= z1 + 1e-3; z += 0.25) S.add(boxGeo(0.012, y1 - y0 - Math.sin(((z - z0) / (z1 - z0)) * Math.PI) * 0.3, 0.012, x, (y0 + y1) / 2 + Math.sin(((z - z0) / (z1 - z0)) * Math.PI) * 0.15, z), ink);
  for (let y = y0; y <= y1 + 1e-3; y += 0.25) {
    const sag = (y - y0) / (y1 - y0);
    S.add(boxGeo(0.012, 0.012, z1 - z0, x, y - (1 - sag) * 0.12, (z0 + z1) / 2), ink);
  }
  for (let z = z0 + 0.2; z < z1; z += 0.55) S.add(new THREE.SphereGeometry(0.07, 8, 6).scale(0.6, 1, 1).translate(x + 0.02, y1 + 0.02, z), "#f77f00");
}

/** A window on the sea in the back wall (at x, `w` wide, `h` high, its middle at y), glowing like windowBack's: the
 *  sky, the turquoise sea and the beach, its white frame and a mullion. */
function seaWindow(c: Ctx, x: number, w: number, h: number, y = 2.3) {
  const z = -c.d / 2 + 0.02;
  c.M.add("win-#bfe3f7", mat("#bfe3f7", { emissive: "#4d7a90" }), boxGeo(w, h * 0.5, 0.05, x, y + h * 0.25, z), false);
  c.M.add("win-sea", mat("#3fd0c6", { emissive: "#17706d" }), boxGeo(w, h * 0.3, 0.05, x, y - h * 0.15, z), false);
  c.M.add("win-sand", mat("#f3e3c0", { emissive: "#6b6150" }), boxGeo(w, h * 0.2, 0.05, x, y - h * 0.4, z), false);
  for (const yy of [y - h / 2, y + h / 2]) c.M.add("win-frame", mat("#ffffff"), boxGeo(w + 0.2, 0.12, 0.12, x, yy, z + 0.04), false);
  for (const xx of [x - w / 2, x, x + w / 2]) c.M.add("win-frame", mat("#ffffff"), boxGeo(0.1, h, 0.1, xx, y, z + 0.04), false);
}

/** Departamentos Las Palmas as a building of the Yucatán coast (theme.ts roomExtras.lasPalmas; s81, s82, p29): plants
 *  in clay pots and a palm in the hallway by Doña Lupita's door; in the flat for rent the minisplit high on the back
 *  wall (p29: "el aire no enfría") where Maple Harbor has a radiator, bars on its windows, a ceiling fan, the garrafón
 *  by the kitchen, a two-burner stove on the counter and plants by the door. */
function lasPalmas(c: Ctx) {
  const S = smalls(c), back = -c.d / 2;
  clayPlant(c, S, -8.6, -6.25, 0.95);
  potPalm(c, S, -9.0, -1.8, 0.9);
  minisplit(S, 0.2, 3.3, back);
  windowGrille(c, S, 3, 3.4); windowGrille(c, S, 7.5, 2.2);
  ceilingFan(S, 5, 0.5, "#f1ece2");
  garrafon(c, S, 2.45, -6.5);
  S.add(boxGeo(0.66, 0.08, 0.44, 6.3, 1.08, -6.6), "#e6e8ea"); // the stove on the counter (top at 1.0)
  for (const bx of [6.14, 6.46]) S.add(cylGeo(0.09, 0.09, 0.025, bx, 1.13, -6.6, 12), "#2b2b2e");
  clayPlant(c, S, -2.35, 5.85, 0.85); clayPlant(c, S, 9.2, 5.6, 1.05);
  S.done();
}

/** Hotel Mar Azul's lobby as a beach hotel's (theme.ts roomExtras.hotelMx; s68): talavera on the reception desk's
 *  front, rattan furniture where Maple Harbor has the teal sofas, a zarape runner from the door to the desk, palms in
 *  clay pots where its plants are, ceiling fans, two windows on the sea (s68: "vista al mar") instead of the
 *  painting, and a hammock along the west wall. */
function hotelMx(c: Ctx) {
  const S = smalls(c);
  talavera(S, 6.9, 0.92, (g) => g.translate(0, 0.5, -4.0 + 0.012), 0.23); // the desk (0, -4.6; its front at z -4.0)
  rattan(c, S, -7, 2, Math.PI / 2, 2.0);
  rattan(c, S, -4.6, 4.75, Math.PI); rattan(c, S, -3.4, 4.75, Math.PI);
  zarapeRunner(S, 0, 1, 3, 9);
  for (const [px, pz, s] of [[-10, -6.5, 1.25], [10, 6.5, 1.05], [3.6, -5.25, 0.85], [10, -6.5, 1.3]] as [number, number, number][]) potPalm(c, S, px, pz, s);
  ceilingFan(S, -5.2, 2.6); ceilingFan(S, 7.6, 3.0);
  hammock(c, S, -c.w / 2 + 0.25, -5.4, -1.6);
  S.done();
  seaWindow(c, -7, 3.4, 1.9); seaWindow(c, 6.6, 2.8, 1.7);
}

/** The museum's permanent collection (theme.ts roomExtras.museumMaya; s70: the Museo de la Costa Maya): instead of the
 *  back wall's paintings, two Maya stelae and plinths of painted vases behind the rope under a step-fret frieze; a
 *  chac mool on the statue's plinth; a third stela greeting the visitors in the hall; a model of the ruins on its table
 *  by the west wall. (The west wall's paintings and the new exhibition upstairs stay.) */
function museumMaya(c: Ctx) {
  const S = smalls(c), back = -c.d / 2;
  stela(c, S, -8.4, back + 0.75, 0, 2.3);
  plinth(c, S, -5.9, back + 0.7, 1.0, 1, 0); plinth(c, S, -3.6, back + 0.7, 0.85, 2, 1);
  stela(c, S, -1.1, back + 0.75, 0, 2.5);
  plinth(c, S, 1.5, back + 0.7, 1.05, 1, 2); plinth(c, S, 3.9, back + 0.7, 0.9, 2, 0);
  greca(S, 17, 0.46, (g) => g.translate(-2.2, 3.85, back + 0.02), "#b5502e", "#efe3c8");
  chacMool(S, -2, 1.0, -2, 0);
  stela(c, S, 2.7, 3.3, 0, 2.6);
  ruinsModel(c, S, -9.6, -2.8);
  S.done();
}

/** The mural in the airport's arrivals hall: the Caribbean's turquoise sea under the sun, a Maya temple on its cliff
 *  (as at Tulum), palms, a hummingbird, and "¡Bienvenidos!" with "Welcome" under it. */
function muralTexture() {
  return canvasTex(1024, 336, (x) => {
    const sky = x.createLinearGradient(0, 0, 0, 200); sky.addColorStop(0, "#2f8fd8"); sky.addColorStop(1, "#bfe6f5");
    x.fillStyle = sky; x.fillRect(0, 0, 1024, 336);
    x.fillStyle = "#ffd166"; x.beginPath(); x.arc(860, 70, 40, 0, Math.PI * 2); x.fill();
    const sea = x.createLinearGradient(0, 190, 0, 336); sea.addColorStop(0, "#1a8fc0"); sea.addColorStop(0.5, "#22c1c3"); sea.addColorStop(1, "#7fe0d0");
    x.fillStyle = sea; x.fillRect(0, 190, 1024, 146);
    x.fillStyle = "#f3e3c0"; x.beginPath(); x.moveTo(560, 336); x.quadraticCurveTo(760, 270, 1024, 284); x.lineTo(1024, 336); x.fill();
    // the cliff and the temple on it
    x.fillStyle = "#c9b48a"; x.beginPath(); x.moveTo(0, 336); x.lineTo(0, 168); x.lineTo(250, 160); x.lineTo(330, 336); x.fill();
    x.fillStyle = "#3f7d3a"; x.beginPath(); x.moveTo(0, 175); x.quadraticCurveTo(120, 140, 262, 166); x.lineTo(0, 190); x.fill();
    x.fillStyle = "#d8cbab"; x.fillRect(70, 110, 130, 54); x.fillStyle = "#c9bc9a"; x.fillRect(60, 100, 150, 14);
    x.fillStyle = "#3a3530"; x.fillRect(96, 128, 22, 36); x.fillRect(152, 128, 22, 36);
    // palms
    const palm = (px: number, py: number, s: number) => {
      x.strokeStyle = "#7a5236"; x.lineWidth = 7 * s; x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + 14 * s, py - 70 * s, px + 6 * s, py - 120 * s); x.stroke();
      x.fillStyle = "#2f7d3c";
      for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.55; x.beginPath(); x.ellipse(px + 6 * s + Math.cos(a) * 34 * s, py - 120 * s + Math.sin(a) * 14 * s + 10 * s, 40 * s, 9 * s, a, 0, Math.PI * 2); x.fill(); }
    };
    palm(880, 300, 1.2); palm(960, 310, 1.0); palm(300, 200, 0.7);
    // a hummingbird
    x.fillStyle = "#1f8a70"; x.beginPath(); x.ellipse(600, 120, 26, 11, -0.4, 0, Math.PI * 2); x.fill();
    x.fillStyle = "#e4007c"; x.beginPath(); x.arc(622, 106, 9, 0, Math.PI * 2); x.fill();
    x.strokeStyle = "#2b2b2e"; x.lineWidth = 3; x.beginPath(); x.moveTo(630, 104); x.lineTo(668, 96); x.stroke();
    x.fillStyle = "#3fc1a0"; x.beginPath(); x.moveTo(596, 116); x.lineTo(572, 70); x.lineTo(612, 112); x.fill();
    // the words
    x.textAlign = "center"; x.textBaseline = "middle";
    x.font = "italic 900 92px Georgia, serif"; x.lineWidth = 12; x.strokeStyle = "#7a1f4b"; x.strokeText("¡Bienvenidos!", 560, 214); x.fillStyle = "#ffd166"; x.fillText("¡Bienvenidos!", 560, 214);
    x.font = "800 40px Nunito, Arial"; x.lineWidth = 8; x.strokeStyle = "#0f4c5c"; x.strokeText("Welcome to Puerto Colibrí", 560, 292); x.fillStyle = "#ffffff"; x.fillText("Welcome to Puerto Colibrí", 560, 292);
  });
}

/** The airport in Puerto Colibrí (theme.ts roomExtras.airportMx): a step-fret frieze along the back wall, the mural in
 *  the arrivals hall, palms in clay pots (its plants, and two by the exit), the ground transport desk by the exit in
 *  arrivals (taxis and tours, Spanish over English), and a souvenir stand in departures (straw hats, rebozos, maracas,
 *  little clay pots). */
function airportMx(c: Ctx) {
  const S = smalls(c), back = -c.d / 2;
  greca(S, c.w - 0.4, 0.34, (g) => g.translate(0, 4.0, back + 0.02), "#1f6f8b", "#f4ecd8");
  wallPanel(c, muralTexture(), -c.w / 2 + 0.04, 2.35, -3.6, 8.2, 2.7, Math.PI / 2);
  for (const [px, pz, s] of [[-20.5, 11, 1.25], [20.5, 11, 1.25], [-1, -11.5, 1.05], [-3.5, 11.4, 1.0], [3.5, 11.4, 1.0]] as [number, number, number][]) potPalm(c, S, px, pz, s);
  // the ground transport desk
  const tx = -8.6, tz = 9.4;
  S.add(boxGeo(2.6, 1.0, 0.8, tx, 0.5, tz), "#1f8a70");
  S.add(boxGeo(2.7, 0.06, 0.9, tx, 1.03, tz), "#f2f5f8");
  S.add(boxGeo(2.4, 0.18, 0.02, tx, 0.75, tz + 0.41), "#f6c000");
  for (let i = 0; i < 5; i++) S.add(boxGeo(0.16, 0.01, 0.22, tx - 0.8 + i * 0.2, 1.065, tz + 0.2, 0.2 * i - 0.4), ["#e4007c", "#00a6a6", "#f6a800", "#7ac143", "#ff5a36"][i]);
  c.col.addBox(tx, tz, 2.7, 0.9);
  wallPanel(c, twoLineTexture("Transporte terrestre · Tours\nGround transportation · Tours", { bg: "#1f8a70", fg: "#ffffff" }), tx, 2.65, tz, 3.0, 0.75);
  for (const s of [-1.3, 1.3]) S.add(cylGeo(0.01, 0.01, WALL_H - 3.0, tx + s, (WALL_H + 3.0) / 2, tz, 4), "#3a3d42");
  // the souvenir stand
  const sx = 8.6, sz = 7.6;
  S.add(boxGeo(2.4, 0.85, 1.0, sx, 0.425, sz), "#8a5a3c");
  S.add(boxGeo(2.5, 0.05, 1.1, sx, 0.875, sz), "#c08a52");
  for (const [hx, n] of [[-0.85, 4], [-0.25, 3]] as [number, number][]) hatStack(S, sx + hx, 0.9, sz + 0.05, n, n > 3 ? "#c8102e" : "#1f6fd1");
  [["#e4007c", "#f6a800", "#00a6a6"], ["#7a1f4b", "#f4f1ea", "#2a9d5c"], ["#1f4e9c", "#f6c000", "#c8102e"]].forEach((cols, i) => cols.forEach((col, k) => S.add(boxGeo(0.36, 0.05, 0.3, sx + 0.35 + i * 0.36, 0.925 + k * 0.05, sz - 0.2), col)));
  for (const [mx, col] of [[0.4, "#e4007c"], [0.62, "#f6a800"]] as [number, string][]) { S.add(new THREE.SphereGeometry(0.07, 8, 6).scale(1, 1.2, 1).translate(sx + mx, 1.0, sz + 0.28), col); S.add(cylGeo(0.012, 0.012, 0.16, sx + mx, 0.92, sz + 0.3, 5), "#c08a52"); }
  for (let i = 0; i < 3; i++) { S.add(cylGeo(0.06, 0.05, 0.1, sx + 0.95 + i * 0.12, 0.95, sz + 0.28, 10), "#b5562f"); S.add(cylGeo(0.035, 0.035, 0.05, sx + 0.95 + i * 0.12, 1.02, sz + 0.28, 8), "#a24a2a"); }
  c.col.addBox(sx, sz, 2.5, 1.1);
  S.done();
}

/** The clinic in the Spanish edition (theme.ts roomExtras.clinicMx; s31): the garrafón on its stand where Maple Harbor
 *  has the water cooler, ceiling fans over the waiting corner and the exam room, plants in clay pots, and a row of
 *  waiting chairs facing the doctor's corner. */
function clinicMx(c: Ctx) {
  const S = smalls(c);
  garrafon(c, S, -7.4, -3.2);
  ceilingFan(S, -5.5, 1.9, "#f1ece2"); ceilingFan(S, 2.6, -2.0, "#f1ece2");
  clayPlant(c, S, -7.2, 5.1, 0.95); clayPlant(c, S, 7.2, 5.0, 0.95);
  // four chairs joined on a beam, their backs to the door
  for (let i = 0; i < 4; i++) chairS(S, 3.4 + i * 0.6, 2.5, Math.PI, "#3a86b0", "#9aa5ad");
  S.add(boxGeo(2.5, 0.06, 0.08, 4.3, 0.24, 2.5), "#9aa5ad");
  c.col.addBox(4.3, 2.5, 2.55, 0.6);
  S.done();
}

/** El Muelle inside (theme.ts roomExtras.muelleMx; s84, p28): a band of thatch under the ceiling round the walls, a
 *  fishing net with its floats on the west wall (the lifebuoy over it), strings of lights across the room, and the
 *  catch of the day on a chalkboard by the counter. (The chairs in bright colors: the room's tables.) */
function muelleMx(c: Ctx) {
  const S = smalls(c), back = -c.d / 2, T = "#c49a5c", TD = "#a57c45";
  const band = (len: number, at: (g: THREE.BufferGeometry) => THREE.BufferGeometry) => {
    S.add(at(boxGeo(len, 0.42, 0.14, 0, 3.98, 0.07)), T);
    for (let u = -len / 2 + 0.12; u < len / 2; u += 0.24) S.add(at(new THREE.ConeGeometry(0.1, 0.34, 4).rotateX(Math.PI).translate(u, 3.62, 0.1)), (Math.round(u * 4) % 2) ? T : TD);
  };
  band(c.w, (g) => g.translate(0, 0, back));
  for (const s of [-1, 1]) band(c.d, (g) => g.rotateY(-s * Math.PI / 2).translate(s * c.w / 2, 0, 0));
  fishingNet(S, -c.w / 2 + 0.06, -5.2, 2.2, 1.0, 3.3);
  // the strings of lights: a wire sagging across the room, bulbs along it (the bulbs glow: the M's)
  for (const sz of [-4.2, -0.6, 2.8]) {
    const n = 22;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, x = -c.w / 2 + 0.4 + t * (c.w - 0.8), y = 3.55 - Math.sin(t * Math.PI) * 0.45;
      S.add(boxGeo((c.w - 0.8) / n + 0.02, 0.012, 0.012, x, y + 0.08, sz), "#2b2b2e");
      c.M.add("bulbs", mat("#fff3b0", { emissive: "#b89a2e" }), new THREE.SphereGeometry(0.06, 6, 4).translate(x, y, sz), false);
    }
  }
  // the chalkboard on its easel by the counter, facing the room
  const bx = 3.55, bz = 4.75;
  for (const s of [-1, 1]) S.add(boxGeo(0.05, 1.5, 0.05, 0, 0, 0).rotateX(-0.12).translate(bx + s * 0.42, 0.75, bz - 0.08), "#6b4a2a");
  S.add(boxGeo(0.95, 1.12, 0.04, 0, 0, 0).rotateX(-0.12).translate(bx, 1.02, bz - 0.04), "#6b4a2a");
  const p = wallPanel(c, chalkboard(), bx, 1.02, bz - 0.01, 0.85, 1.02);
  p.rotation.x = -0.12;
  c.col.addBox(bx, bz, 1.0, 0.45);
  S.done();
}

/** El Muelle's chalkboard: the catch of the day (p28: the kitchen's ceviche, fish and shrimp). */
function chalkboard() {
  return canvasTex(256, 308, (x) => {
    x.fillStyle = "#2f3a33"; x.fillRect(0, 0, 256, 308);
    x.textAlign = "center"; x.fillStyle = "#ffd166"; x.font = "900 30px Nunito, Arial"; x.fillText("PESCA", 128, 42); x.fillText("DEL DÍA", 128, 76);
    x.fillStyle = "#f7f3e8"; x.font = "700 22px Nunito, Arial";
    ["Pescado a la talla", "Ceviche de pescado", "Camarones al mojo", "Tacos de pescado"].forEach((l, i) => x.fillText(l, 128, 126 + i * 40));
    x.strokeStyle = "#f7f3e8"; x.lineWidth = 3;
    x.beginPath(); x.ellipse(128, 284, 34, 11, 0, 0, Math.PI * 2); x.moveTo(162, 284); x.lineTo(184, 272); x.lineTo(184, 296); x.closePath(); x.stroke(); // a fish
  });
}

/** Café La Ceiba (theme.ts roomExtras.cafeMx; s72): conchas on a tray in the glass case instead of Maple Harbor's
 *  pastries, talavera on the counter's front, jarritos hanging on the west wall, two ceiling fans. */
function cafeMx(c: Ctx) {
  const S = smalls(c);
  conchas(S, -1.6, 1.09, -3.1, 5, 2);
  talavera(S, 6.9, 0.92, (g) => g.translate(-2, 0.5, -2.65 + 0.012), 0.23); // the counter (-2, -3.2; its front at z -2.65)
  for (let i = 0; i < 7; i++) jarrito(S, -c.w / 2 + 0.02, 2.35, -3.4 + i * 0.5, Math.PI / 2);
  ceilingFan(S, 2.4, 1.7); ceilingFan(S, -4.6, 1.6);
  S.done();
}

/** Boutique Hilos' Mexican goods (theme.ts roomExtras.shopsMx; s74): rebozos folded over the rack on the west side,
 *  white blouses embroidered with flowers on the one by the door, and a round stand of straw hats. */
function hilosMx(c: Ctx, S: Smalls) {
  const cols = [["#7a1f4b", "#e4007c", "#f4f1ea"], ["#1f4e9c", "#00a6a6", "#f4f1ea"], ["#c8102e", "#f6a800", "#2b2b2e"], ["#2a9d5c", "#f6c000", "#7a1f4b"], ["#6d2e9e", "#e4007c", "#f4f1ea"]];
  cols.forEach((col, i) => rebozo(S, -5 + i * 0.5, 1.6, 2.5, col));
  for (let i = 0; i < 6; i++) blusa(S, i * 0.4, 1.6, 3.4, i);
  const hx = -5.0, hz = 4.6;
  S.add(cylGeo(0.42, 0.42, 0.05, hx, 0.85, hz, 16), "#8a5a3c");
  S.add(cylGeo(0.06, 0.08, 0.82, hx, 0.41, hz, 8), "#6f4a2c");
  S.add(cylGeo(0.3, 0.32, 0.04, hx, 0.02, hz, 14), "#6f4a2c");
  hatStack(S, hx - 0.12, 0.875, hz - 0.08, 4); hatStack(S, hx + 0.16, 0.875, hz + 0.14, 3, "#1f6fd1");
  c.col.addCircle(hx, hz, 0.45);
}

/** Garrafones of drinking water (the 20-liter bottles, full, their blue caps up) on a metal rack, two up, two down. */
function garrafonRack(c: Ctx, S: Smalls, x: number, z: number) {
  for (const y of [0.04, 0.62]) S.add(boxGeo(0.95, 0.04, 0.45, x, y, z), "#9aa5ad");
  for (const [lx, lz] of [[-0.45, -0.2], [0.45, -0.2], [-0.45, 0.2], [0.45, 0.2]]) S.add(boxGeo(0.03, 1.15, 0.03, x + lx, 0.575, z + lz), "#7d868c");
  for (const y of [0.06, 0.64]) for (const dx of [-0.22, 0.22]) {
    S.add(cylGeo(0.17, 0.17, 0.4, x + dx, y + 0.2, z, 12), "#9fd3ec");
    S.add(cylGeo(0.06, 0.08, 0.08, x + dx, y + 0.44, z, 8), "#9fd3ec");
    S.add(cylGeo(0.055, 0.055, 0.04, x + dx, y + 0.5, z, 8), "#2a7fc0");
  }
  c.col.addBox(x, z, 1.0, 0.5);
}

/** A picture in a gilded frame (as framedArt) of a texture of its own. */
function framedTex(c: Ctx, tex: THREE.Texture, x: number, y: number, z: number, w: number, h: number) {
  const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.16, h + 0.16, 0.06), mat("#c9a227"));
  frame.position.set(x, y, z);
  c.g.add(frame);
  const art = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map: tex }));
  art.position.set(x, y, z + 0.035);
  c.g.add(art);
}

/** The Virgin of Guadalupe as a home's altar has her: in her blue-green mantle with gold stars over a rose gown, her
 *  hands together, in a mandorla of golden rays, standing on the moon. */
function guadalupe() {
  return canvasTex(200, 264, (x) => {
    x.fillStyle = "#1d3b4f"; x.fillRect(0, 0, 200, 264);
    const cx = 100, cy = 136;
    // the rays round her
    x.strokeStyle = "#f2c14e"; x.lineWidth = 3;
    for (let i = 0; i < 44; i++) {
      const a = (i / 44) * Math.PI * 2;
      x.beginPath(); x.moveTo(cx + Math.cos(a) * 52, cy + Math.sin(a) * 92); x.lineTo(cx + Math.cos(a) * 92, cy + Math.sin(a) * 124); x.stroke();
    }
    x.fillStyle = "#f6d06b"; x.beginPath(); x.ellipse(cx, cy, 58, 100, 0, 0, Math.PI * 2); x.fill();
    // the rose gown, the mantle over her head and down both sides, her face and hands
    x.fillStyle = "#d9828f"; x.beginPath(); x.moveTo(cx - 22, 92); x.quadraticCurveTo(cx - 36, 170, cx - 24, 214); x.lineTo(cx + 24, 214); x.quadraticCurveTo(cx + 36, 170, cx + 22, 92); x.closePath(); x.fill();
    x.fillStyle = "#1f7a72"; x.beginPath(); x.moveTo(cx, 50); x.quadraticCurveTo(cx - 30, 54, cx - 34, 100); x.quadraticCurveTo(cx - 46, 170, cx - 34, 218); x.lineTo(cx - 22, 214);
    x.quadraticCurveTo(cx - 30, 150, cx - 14, 84); x.lineTo(cx + 14, 84); x.quadraticCurveTo(cx + 30, 150, cx + 22, 214); x.lineTo(cx + 34, 218); x.quadraticCurveTo(cx + 46, 170, cx + 34, 100); x.quadraticCurveTo(cx + 30, 54, cx, 50); x.fill();
    x.fillStyle = "#f2c14e";
    for (const [sx, sy] of [[-30, 104], [-34, 134], [-36, 164], [-32, 194], [30, 104], [34, 134], [36, 164], [32, 194], [-14, 66], [14, 66]]) { x.beginPath(); x.arc(cx + sx, sy, 2.6, 0, Math.PI * 2); x.fill(); }
    x.fillStyle = "#c99a74"; x.beginPath(); x.ellipse(cx + 3, 76, 9, 12, 0.25, 0, Math.PI * 2); x.fill();
    x.beginPath(); x.moveTo(cx - 6, 128); x.lineTo(cx + 2, 106); x.lineTo(cx + 9, 128); x.closePath(); x.fill();
    // the moon under her feet, and the frame's inner edge
    x.fillStyle = "#2b2b2e"; x.beginPath(); x.ellipse(cx, 226, 40, 10, 0, 0, Math.PI); x.fill();
    x.strokeStyle = "#f2c14e"; x.lineWidth = 6; x.strokeRect(3, 3, 194, 258);
  });
}

// ---------------------------------------------------------------------------
// Graphics round 3 (theme.ts roomExtras: services, terminalMx, roomsMx; docs/es/TOWN.md "Graphics, round 3"): the
// places the conversations send the learner to, the bus terminal's hall, and the rest of the rooms; in each room's
// smalls, a sign a texture of its own

/** Yucatán's mosaicos de pasta (theme.ts roomLooks floorKind "pasta"): cement tiles half a metre across on the floor
 *  canvas (512 px, 4 m), each a four-petalled flower in soft terracotta round a mustard heart, teal quarter circles in
 *  its corners (four tiles make a little circle), a thin band inside its edge, on the room's floor colour: soft, so the
 *  floor reads as tiles and not as a carpet. */
function pastaTiles(x: CanvasRenderingContext2D) {
  const T = 64;
  for (let i = 0; i < 8; i++) for (let k = 0; k < 8; k++) {
    const ox = i * T, oy = k * T, cx = ox + T / 2, cy = oy + T / 2;
    x.save(); x.beginPath(); x.rect(ox, oy, T, T); x.clip();
    x.fillStyle = "rgba(47,127,120,0.45)";
    for (const [qx, qy] of [[ox, oy], [ox + T, oy], [ox, oy + T], [ox + T, oy + T]]) { x.beginPath(); x.arc(qx, qy, T * 0.17, 0, Math.PI * 2); x.fill(); }
    x.restore();
    x.strokeStyle = "rgba(47,127,120,0.35)"; x.lineWidth = 2; x.strokeRect(ox + 6, oy + 6, T - 12, T - 12);
    x.fillStyle = "rgba(181,82,59,0.55)";
    for (let p = 0; p < 4; p++) { x.save(); x.translate(cx, cy); x.rotate(Math.PI / 4 + (p * Math.PI) / 2); x.beginPath(); x.ellipse(0, -T * 0.15, T * 0.07, T * 0.14, 0, 0, Math.PI * 2); x.fill(); x.restore(); }
    x.fillStyle = "rgba(217,164,58,0.9)"; x.beginPath(); x.arc(cx, cy, T * 0.07, 0, Math.PI * 2); x.fill();
    x.strokeStyle = "rgba(0,0,0,0.13)"; x.lineWidth = 1.5; x.strokeRect(ox + 0.75, oy + 0.75, T - 1.5, T - 1.5);
  }
}

/** A restroom's pictogram (a woman in a dress, or a man) in white on the sign, its middle at (x, y), `h` tall. */
function pictogram(x: CanvasRenderingContext2D, cx: number, cy: number, h: number, woman: boolean) {
  const u = h / 10;
  x.beginPath(); x.arc(cx, cy - 3.6 * u, 1.15 * u, 0, Math.PI * 2); x.fill();
  if (woman) {
    x.beginPath(); x.moveTo(cx - 0.9 * u, cy - 2.2 * u); x.lineTo(cx + 0.9 * u, cy - 2.2 * u); x.lineTo(cx + 2.2 * u, cy + 1.8 * u); x.lineTo(cx - 2.2 * u, cy + 1.8 * u); x.closePath(); x.fill();
    x.fillRect(cx - 1.0 * u, cy + 1.6 * u, 0.7 * u, 3.4 * u); x.fillRect(cx + 0.3 * u, cy + 1.6 * u, 0.7 * u, 3.4 * u);
  } else {
    roundRect(x, cx - 1.5 * u, cy - 2.2 * u, 3.0 * u, 4.4 * u, 0.6 * u); x.fill();
    x.fillRect(cx - 1.45 * u, cy + 1.8 * u, 1.25 * u, 3.2 * u); x.fillRect(cx + 0.2 * u, cy + 1.8 * u, 1.25 * u, 3.2 * u);
  }
}

/** The restrooms' sign: the two pictograms either side of the words (one line, or Spanish over English with a "\n"). */
function restroomSign(text: string, bg = "#1d3f73", w = 1024, h = 128) {
  return canvasTex(w, h, (x) => {
    x.fillStyle = bg; roundRect(x, 3, 3, w - 6, h - 6, h * 0.16); x.fill();
    x.fillStyle = "#ffffff";
    pictogram(x, h * 0.55, h / 2, h * 0.78, true);
    pictogram(x, w - h * 0.55, h / 2, h * 0.78, false);
    x.textAlign = "center"; x.textBaseline = "middle";
    const [a, b] = text.split("\n");
    const font = (sz: number, wt = 800) => `${wt} ${sz}px Nunito, Arial`;
    if (!b) { x.font = font(h * 0.56); x.fillText(a, w / 2, h * 0.53); return; }
    x.font = font(h * 0.42); x.fillText(a, w / 2, h * 0.34);
    x.globalAlpha = 0.85; x.font = font(h * 0.3, 700); x.fillText(b, w / 2, h * 0.75); x.globalAlpha = 1;
  });
}

/** A plaque for one door that leads to both restrooms: the two pictograms over the word. */
function restroomPlaque(word: string) {
  return canvasTex(256, 256, (x) => {
    x.fillStyle = "#f7f3ea"; roundRect(x, 6, 6, 244, 244, 28); x.fill();
    x.strokeStyle = "#1f4e5f"; x.lineWidth = 8; x.stroke();
    x.fillStyle = "#1f4e5f";
    pictogram(x, 84, 100, 120, true);
    x.fillRect(126, 42, 4, 116);
    pictogram(x, 172, 100, 120, false);
    x.textAlign = "center"; x.textBaseline = "middle"; x.font = "800 52px Nunito, Arial"; x.fillText(word, 128, 206);
  });
}

/** A door in a wall, its face towards `rot` (0: +z), its middle at (x, z) on the wall's face: the leaf, a frame round
 *  it, a handle on the side away from `hinge` (1: the handle on the leaf's right as seen from the room). In the smalls. */
function wallDoor(S: Smalls, x: number, z: number, rot: number, w = 0.92, h = 2.05, leaf = "#8a5a3c", frame = "#f4f1ea", hinge = 1) {
  const P = (g: THREE.BufferGeometry) => g.rotateY(rot).translate(x, 0, z);
  S.add(P(boxGeo(w, h, 0.05, 0, h / 2, 0.025)), leaf);
  for (const s of [-1, 1]) S.add(P(boxGeo(0.08, h + 0.08, 0.08, s * (w / 2 + 0.04), (h + 0.08) / 2, 0.04)), frame);
  S.add(P(boxGeo(w + 0.16, 0.08, 0.08, 0, h + 0.04, 0.04)), frame);
  S.add(P(boxGeo(0.04, 0.04, 0.1, hinge * (w / 2 - 0.12), 1.0, 0.07)), "#c9ced6");
  S.add(P(boxGeo(0.14, 0.035, 0.035, hinge * (w / 2 - 0.17), 1.0, 0.12)), "#c9ced6");
}

/** A small round café table on its pedestal with two chairs facing across it (along `rot`), and its collider. */
function bistroTable(c: Ctx, S: Smalls, x: number, z: number, rot: number, top = "#f4f1ea", chair = "#1f6f8b") {
  S.add(cylGeo(0.36, 0.36, 0.04, x, 0.74, z, 16), top);
  S.add(cylGeo(0.035, 0.035, 0.72, x, 0.36, z, 6), "#3a3d42");
  S.add(cylGeo(0.22, 0.24, 0.03, x, 0.015, z, 12), "#3a3d42");
  for (const s of [-1, 1]) {
    const cx = x + Math.sin(rot) * s * 0.62, cz = z + Math.cos(rot) * s * 0.62, back = rot + (s > 0 ? 0 : Math.PI);
    S.add(boxGeo(0.4, 0.05, 0.4, cx, 0.46, cz, back), chair);
    S.add(boxGeo(0.4, 0.42, 0.05, 0, 0, 0).translate(0, 0.7, 0.19).rotateY(back).translate(cx, 0, cz), chair);
    for (const [lx, lz] of [[-0.16, -0.16], [0.16, -0.16], [-0.16, 0.16], [0.16, 0.16]]) S.add(boxGeo(0.03, 0.44, 0.03, cx + lx, 0.22, cz + lz), "#3a3d42");
  }
  c.col.addCircle(x, z, 0.45);
  for (const s of [-1, 1]) c.col.addCircle(x + Math.sin(rot) * s * 0.62, z + Math.cos(rot) * s * 0.62, 0.25);
}

/** An espresso machine on a counter top at height y (its front towards `rot`): the steel body, the group heads, the cup
 *  rack on top. In the smalls. */
function espresso(S: Smalls, x: number, y: number, z: number, rot: number) {
  const P = (g: THREE.BufferGeometry) => g.rotateY(rot).translate(x, 0, z);
  S.add(P(boxGeo(0.66, 0.42, 0.46, 0, y + 0.21, 0)), "#c0c4c8");
  S.add(P(boxGeo(0.68, 0.05, 0.48, 0, y + 0.445, 0)), "#2b2b2b");
  for (const dx of [-0.16, 0.16]) { S.add(P(cylGeo(0.05, 0.05, 0.08, dx, y + 0.24, 0.25, 8)), "#2b2b2b"); S.add(P(cylGeo(0.035, 0.03, 0.06, dx, y + 0.06, 0.2, 8)), "#f4f1ea"); }
  for (let i = 0; i < 4; i++) S.add(P(cylGeo(0.035, 0.03, 0.06, -0.21 + i * 0.14, y + 0.5, -0.05, 8)), "#f4f1ea");
}

/** The airport's café and restrooms (theme.ts roomExtras.services; s64a: "Security is on the left, past the café"; "the
 *  restrooms are over there, next to the café"): in departures between the check-in counter and the gate, the café
 *  against the back wall under its window (a counter tiled in talavera, the espresso machine, conchas, two tables) and
 *  the two restroom doors beside it, under the gate's sign. */
function airportServices(c: Ctx) {
  const S = smalls(c), back = -c.d / 2;
  const cx = 11.4, cz = -11.3;
  // the back counter against the wall, the espresso machine and a grinder on it
  S.add(boxGeo(2.6, 0.95, 0.5, cx, 0.475, back + 0.25), "#6f4a2c");
  S.add(boxGeo(2.64, 0.04, 0.54, cx, 0.97, back + 0.27), "#e8d9c2");
  espresso(S, cx - 0.5, 0.99, back + 0.27, 0);
  S.add(cylGeo(0.09, 0.11, 0.34, cx + 0.3, 1.16, back + 0.25, 10), "#2b2b2b");
  for (let i = 0; i < 3; i++) S.add(cylGeo(0.05, 0.045, 0.32, cx + 0.75 + i * 0.13, 1.15, back + 0.25, 8), ["#8a3b24", "#f6c000", "#1f6f8b"][i]);
  c.col.addBox(cx, back + 0.25, 2.7, 0.55);
  // the front counter, talavera on its face, conchas on a tray and the till on its top
  S.add(boxGeo(2.6, 1.0, 0.75, cx, 0.5, cz), "#1f6f8b");
  S.add(boxGeo(2.7, 0.06, 0.85, cx, 1.03, cz), "#f2efe8");
  talavera(S, 2.5, 0.8, (g) => g.translate(cx, 0.5, cz + 0.376), 0.2);
  conchas(S, cx - 0.55, 1.06, cz, 3, 2);
  till(S, cx + 0.75, 1.06, cz + 0.05);
  c.col.addBox(cx, cz, 2.7, 0.85);
  // two tables in front of it, and the sign over it
  bistroTable(c, S, 10.0, -9.1, Math.PI / 2, "#f4f1ea", "#e4007c");
  bistroTable(c, S, 12.8, -8.8, Math.PI / 2, "#f4f1ea", "#f6a800");
  wallPanel(c, twoLineTexture("Cafetería\nCafé", { bg: "#6f4a2c", fg: "#fff3d6" }), cx, 3.0, cz, 2.2, 0.55);
  for (const s of [-0.95, 0.95]) S.add(cylGeo(0.008, 0.008, WALL_H - 3.25, cx + s, (WALL_H + 3.25) / 2, cz, 4), "#3a3d42");
  // the restrooms: two doors in the wall between the windows, the sign over them (under the gate's)
  for (const [dx, hinge] of [[15.35, 1], [16.65, -1]] as [number, number][]) wallDoor(S, dx, back, 0, 0.95, 2.0, "#9aa5ad", "#e6e9ee", hinge);
  wallPanel(c, restroomSign("Sanitarios\nRestrooms"), 16, 2.25, back + 0.06, 2.4, 0.3);
  S.done();
}

/** The bus terminal's ATM (theme.ts roomExtras.services; s67b: "Hay un cajero en la terminal, ahí adentro"): a cash
 *  machine against the west wall, its lit header, its screen, keypad and slots, a little roof over it. */
function terminalAtm(c: Ctx, S: Smalls) {
  const x = -c.w / 2 + 0.3, z = -2.4;
  const P = (g: THREE.BufferGeometry) => g.rotateY(Math.PI / 2).translate(x, 0, z);
  S.add(P(boxGeo(0.8, 1.75, 0.55, 0, 0.875, 0)), "#2f3b47");
  S.add(P(boxGeo(0.84, 0.08, 0.6, 0, 1.79, 0.02)), "#1d252d");
  S.add(P(boxGeo(0.6, 0.04, 0.12, 0, 1.25, 0.3).rotateX(0)), "#1d252d");
  S.add(P(boxGeo(0.44, 0.32, 0.02, 0, 1.38, 0.29)), "#7fc3e8");
  S.add(P(boxGeo(0.3, 0.12, 0.2, 0, 0.98, 0.33)), "#c9ced6");
  for (let i = 0; i < 12; i++) S.add(P(boxGeo(0.05, 0.012, 0.04, -0.07 + (i % 3) * 0.07, 1.045, 0.27 + Math.floor(i / 3) * 0.045)), "#3a3d42");
  S.add(P(boxGeo(0.2, 0.03, 0.02, 0.24, 1.15, 0.285)), "#1d1d1d");
  S.add(P(boxGeo(0.34, 0.04, 0.02, 0, 0.8, 0.285)), "#1d1d1d");
  c.col.addBox(x + 0.05, z, 0.65, 0.9);
  wallPanel(c, textTexture("Cajero automático", { bg: "#1f8a4c", fg: "#ffffff", w: 512, h: 128 }), -c.w / 2 + 0.02, 2.2, z, 1.4, 0.35, Math.PI / 2);
}

/** A shoeshine stand (a bolero's: a raised seat with its footrests, the box of polishes beside it), facing `rot`. */
function shoeshine(c: Ctx, S: Smalls, x: number, z: number, rot: number) {
  const P = (g: THREE.BufferGeometry) => g.rotateY(rot).translate(x, 0, z);
  S.add(P(boxGeo(1.0, 0.5, 1.1, 0, 0.25, -0.1)), "#7a3b1d");
  S.add(P(boxGeo(0.7, 0.08, 0.6, 0, 0.92, -0.25)), "#8a1f2a");
  S.add(P(boxGeo(0.7, 0.4, 0.08, 0, 0.5, -0.25).translate(0, 0.22, 0)), "#5a2e16");
  S.add(P(boxGeo(0.72, 0.7, 0.08, 0, 1.3, -0.55)), "#8a1f2a");
  for (const s of [-1, 1]) {
    S.add(P(boxGeo(0.06, 0.32, 0.6, s * 0.38, 1.08, -0.25)), "#5a2e16");
    S.add(P(boxGeo(0.12, 0.05, 0.22, s * 0.16, 0.62, 0.42)), "#c9a227");
    S.add(P(cylGeo(0.02, 0.02, 0.12, s * 0.16, 0.56, 0.42, 6)), "#c9a227");
  }
  S.add(P(boxGeo(0.4, 0.3, 0.28, 0.7, 0.15, 0.35)), "#9c6b43");
  for (let i = 0; i < 4; i++) S.add(P(cylGeo(0.04, 0.04, 0.05, 0.58 + (i % 2) * 0.12, 0.33, 0.28 + Math.floor(i / 2) * 0.12, 8)), ["#1d1d1d", "#6b3e26", "#8a1f2a", "#1d1d1d"][i]);
  const cw = Math.abs(Math.cos(rot)) * 1.1 + Math.abs(Math.sin(rot)) * 1.3, cd = Math.abs(Math.sin(rot)) * 1.1 + Math.abs(Math.cos(rot)) * 1.3;
  c.col.addBox(x, z, cw, cd);
}

/** The bus terminal's hall in this edition (theme.ts roomExtras.terminalMx; s67b): route 7's city bus at the bay (the
 *  town's own bus, car.ts busParts: white over teal, its number lit amber over the windshield), its front to the hall
 *  and its doors towards Ana; the route's sign hanging over its front; a shoeshine stand by the west wall. */
function terminalMx(c: Ctx, S: Smalls) {
  for (const [g, col] of busParts("#f4f6f8", "#1f8fa3", 7)) S.add(g.translate(11.45, 0, -3.5), col);
  c.col.addBox(11.45, -3.5, 2.6, 10.0);
  sign(c, "BUS 12 · DOWNTOWN", 11.45, 3.5, 1.95, 3, "#1f8fa3", "#ffffff");
  for (const s of [-1.3, 1.3]) S.add(cylGeo(0.008, 0.008, WALL_H - 3.875, 11.45 + s, (WALL_H + 3.875) / 2, 1.95, 4), "#3a3d42");
  shoeshine(c, S, -11.0, 1.6, Math.PI / 2);
}

/** The museum's services (theme.ts roomExtras.services; s70): the paquetería right by the entrance on the left
 *  (cubbyholes with the visitors' bags and its counter), the restrooms past it along the same wall, the elevator at
 *  the back on the left, and the café beside the shop by the exit. */
function museumServices(c: Ctx) {
  const S = smalls(c), west = -c.w / 2;
  // the paquetería: cubbyholes along the west wall, the bags in them, the counter in front with its numbered tokens
  const pz = 7.0, len = 2.6, rows = 3, cols = 4, ch = 0.56;
  S.add(boxGeo(0.04, 1.8, len, west + 0.04, 0.9, pz), "#5a3e26");
  for (let r = 0; r <= rows; r++) S.add(boxGeo(0.46, 0.04, len, west + 0.26, 0.12 + r * ch, pz), "#9c7a52");
  for (let k = 0; k <= cols; k++) S.add(boxGeo(0.46, 1.72, 0.04, west + 0.26, 0.98, pz - len / 2 + (k * len) / cols), "#9c7a52");
  const bags = ["#e4007c", "#1f6fd1", "#3a3d42", "#f6a800", "#2a9d5c", "#8a1f2a", "#00a6a6"];
  for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
    if ((r * 5 + k * 3) % 4 === 1) continue;
    const bx = west + 0.28, by = 0.14 + r * ch, bz = pz - len / 2 + (k + 0.5) * (len / cols), col = bags[(r * cols + k) % bags.length];
    S.add(new THREE.CapsuleGeometry(0.15, 0.12, 3, 8).scale(1, 1, 1.25).translate(bx, by + 0.22, bz), col);
    S.add(boxGeo(0.05, 0.08, 0.1, bx + 0.17, by + 0.32, bz), "#f4f1ea");
  }
  c.col.addBox(west + 0.25, pz, 0.5, len);
  S.add(boxGeo(0.55, 1.0, 2.2, west + 1.15, 0.5, pz), "#9c8f7a");
  S.add(boxGeo(0.63, 0.05, 2.28, west + 1.15, 1.025, pz), "#f7f4ee");
  for (let i = 0; i < 6; i++) S.add(boxGeo(0.07, 0.012, 0.1, west + 1.05 + (i % 2) * 0.12, 1.057, pz - 0.6 + Math.floor(i / 2) * 0.1), "#c9a227");
  c.col.addBox(west + 1.15, pz, 0.6, 2.2);
  wallPanel(c, twoLineTexture("Paquetería\nBag check · free", { bg: "#2b2d6e", fg: "#ffffff" }), west + 0.04, 2.55, pz, 2.2, 0.55, Math.PI / 2);
  // the restrooms past it along the same wall
  for (const [dz, hinge] of [[4.3, 1], [3.1, -1]] as [number, number][]) wallDoor(S, west, dz, Math.PI / 2, 0.95, 2.0, "#2b2d6e", "#f7f4ee", hinge);
  wallPanel(c, restroomSign("Sanitarios", "#2b2d6e", 768, 128), west + 0.05, 2.32, 3.7, 1.9, 0.32, Math.PI / 2);
  // the elevator at the back on the left: its steel doors, the frame, the call buttons and the floor it is on
  const ex = -11.4, back = -c.d / 2;
  S.add(boxGeo(1.5, 2.45, 0.1, ex, 1.225, back + 0.05), "#8a949c");
  for (const s of [-1, 1]) S.add(boxGeo(0.58, 2.15, 0.04, ex + s * 0.3, 1.075, back + 0.11), "#c3cad0");
  S.add(boxGeo(0.02, 2.15, 0.045, ex, 1.075, back + 0.115), "#6b7680");
  S.add(boxGeo(0.12, 0.3, 0.04, ex + 0.95, 1.15, back + 0.03), "#8a949c");
  for (const by of [1.08, 1.22]) S.add(cylGeo(0.025, 0.025, 0.02, 0, 0, 0, 10).rotateX(Math.PI / 2).translate(ex + 0.95, by, back + 0.06), "#f6c000");
  c.col.addBox(ex, back + 0.12, 1.6, 0.3);
  wallPanel(c, textTexture("♿ Elevador · PB ↑ 1", { bg: "#2b2d6e", fg: "#ffffff", w: 512, h: 128 }), ex, 2.78, back + 0.06, 1.5, 0.375);
  // the café by the shop, at the exit: its counter along the east wall, the espresso machine, two tables
  const east = c.w / 2, kz = 8.4;
  S.add(boxGeo(0.6, 1.0, 1.9, east - 0.4, 0.5, kz), "#7a3b1d");
  S.add(boxGeo(0.68, 0.05, 1.98, east - 0.4, 1.025, kz), "#f7f4ee");
  espresso(S, east - 0.45, 1.05, kz - 0.4, -Math.PI / 2);
  conchas(S, east - 0.42, 1.05, kz + 0.45, 2, 2);
  c.col.addBox(east - 0.4, kz, 0.7, 1.95);
  bistroTable(c, S, 9.4, 8.6, Math.PI / 2, "#f7f4ee", "#2b2d6e");
  bistroTable(c, S, 7.5, 8.4, 0, "#f7f4ee", "#a0522d");
  wallPanel(c, textTexture("Cafetería", { bg: "#7a3b1d", fg: "#fff3d6", w: 512, h: 128 }), east - 0.04, 2.45, kz, 1.6, 0.4, -Math.PI / 2);
  S.done();
}

/** The restroom door at the back of a café or a restaurant (theme.ts roomExtras.services; s72: "al fondo, a la
 *  izquierda"; s73: "al fondo, a la derecha"), with its plaque: in the wall at (x, z) facing `rot`. */
function restroomDoor(c: Ctx, S: Smalls, x: number, z: number, rot: number, leaf: string, frame: string) {
  wallDoor(S, x, z, rot, 0.9, 2.05, leaf, frame, rot === 0 ? 1 : -1);
  const ox = Math.sin(rot) * 0.06, oz = Math.cos(rot) * 0.06;
  wallPanel(c, restroomPlaque("Baños"), x + ox, 1.62, z + oz, 0.34, 0.34, rot);
}

/** A minisplit (the air conditioner every room on this coast has) high on a wall at (x, y, z), its front towards `rot`
 *  (0: +z): the white unit, its louver and little green light, the duct taking its pipes away along the wall. */
function minisplitAt(S: Smalls, x: number, y: number, z: number, rot: number) {
  const P = (g: THREE.BufferGeometry) => g.rotateY(rot).translate(x, y, z);
  S.add(P(boxGeo(1.05, 0.3, 0.22, 0, 0, 0.11)), "#f4f5f2");
  S.add(P(boxGeo(1.07, 0.04, 0.23, 0, 0.15, 0.115)), "#e1e4e0");
  S.add(P(boxGeo(0.92, 0.05, 0.03, 0, 0, 0).rotateX(-0.5).translate(0, -0.1, 0.235)), "#d4d9d5");
  S.add(P(boxGeo(0.9, 0.03, 0.01, 0, -0.135, 0.215)), "#4a4f55");
  S.add(P(boxGeo(0.035, 0.035, 0.01, 0.42, 0.06, 0.224)), "#39c46a");
  S.add(P(boxGeo(0.9, 0.07, 0.06, 0.97, 0.06, 0.03)), "#eceeea");
}

/** An alebrije (a little carved animal painted in wild colours: a body, a head with ears, four legs, a curled tail,
 *  dots) standing at (x, y, z) facing `rot`. In the smalls. */
function alebrije(S: Smalls, x: number, y: number, z: number, rot: number, k: number) {
  const C = [["#e4007c", "#f6c000", "#00a6a6"], ["#1f6fd1", "#ff5a36", "#7ac143"], ["#f6a800", "#6d2e9e", "#e4007c"], ["#00a6a6", "#e4007c", "#f6c000"]][k % 4];
  const P = (g: THREE.BufferGeometry) => g.rotateY(rot).translate(x, y, z);
  S.add(P(new THREE.SphereGeometry(0.07, 8, 6).scale(1.5, 0.9, 0.9).translate(0, 0.1, 0)), C[0]);
  S.add(P(new THREE.SphereGeometry(0.045, 8, 6).translate(0.11, 0.16, 0)), C[1]);
  for (const s of [-1, 1]) S.add(P(new THREE.ConeGeometry(0.018, 0.06, 5).translate(0.12, 0.22, s * 0.025)), C[2]);
  for (const [lx, lz] of [[-0.06, -0.035], [0.06, -0.035], [-0.06, 0.035], [0.06, 0.035]]) S.add(P(cylGeo(0.014, 0.012, 0.06, lx, 0.03, lz, 5)), C[2]);
  S.add(P(new THREE.TorusGeometry(0.035, 0.01, 4, 8, Math.PI * 1.3).translate(-0.12, 0.15, 0)), C[1]);
  for (let i = 0; i < 3; i++) S.add(P(new THREE.SphereGeometry(0.012, 5, 4).translate(-0.04 + i * 0.04, 0.165, 0.055)), C[2]);
}

/** Información Turística's coast (theme.ts roomExtras.roomsMx; s62): the counter faced with talavera, and on the
 *  souvenir shelf alebrijes, little bottles of vanilla and habanero sauce and clay pots where Maple Harbor has snow
 *  globes, lighthouses and maple syrup. */
function infoMx(c: Ctx, S: Smalls, sx: number, sz: number) {
  talavera(S, 4.8, 0.85, (g) => g.translate(0, 0.48, -3.3 + 0.512), 0.24);
  for (let i = 0; i < 4; i++) alebrije(S, sx - 0.05, 1.17, sz - 0.75 + i * 0.5, Math.PI / 2 + (i % 2 ? 0.4 : -0.4), i);
  for (let i = 0; i < 6; i++) {
    const vanilla = i % 2 === 0, bz = sz - 0.85 + i * 0.34;
    S.add(cylGeo(vanilla ? 0.032 : 0.04, vanilla ? 0.036 : 0.045, vanilla ? 0.22 : 0.13, sx - 0.05, vanilla ? 1.83 : 1.79, bz, 8), vanilla ? "#3b2416" : "#d62828");
    S.add(cylGeo(0.02, 0.02, 0.05, sx - 0.05, vanilla ? 1.965 : 1.88, bz, 6), vanilla ? "#c9a227" : "#2a7d3a");
  }
  for (let i = 0; i < 3; i++) { S.add(cylGeo(0.07, 0.055, 0.12, sx - 0.05, 0.69, sz - 0.6 + i * 0.6, 10), CLAY_POTS[i]); S.add(cylGeo(0.045, 0.045, 0.05, sx - 0.05, 0.77, sz - 0.6 + i * 0.6, 8), "#a24a2a"); }
}
const CLAY_POTS = ["#b5562f", "#c4683a", "#a24a2a"];

/** A báscula (the coin-operated scale by a Mexican pharmacy's door: weigh yourself for a few pesos), facing `rot`. */
function bascula(c: Ctx, S: Smalls, x: number, z: number, rot: number) {
  const P = (g: THREE.BufferGeometry) => g.rotateY(rot).translate(x, 0, z);
  S.add(P(boxGeo(0.46, 0.08, 0.52, 0, 0.04, 0.05)), "#e9eef0");
  S.add(P(boxGeo(0.4, 0.012, 0.42, 0, 0.086, 0.07)), "#3a3d42");
  S.add(P(boxGeo(0.16, 1.15, 0.12, 0, 0.62, -0.2)), "#2e8b57");
  S.add(P(new THREE.CylinderGeometry(0.2, 0.2, 0.12, 20).rotateX(Math.PI / 2).translate(0, 1.32, -0.18)), "#2e8b57");
  S.add(P(new THREE.CylinderGeometry(0.16, 0.16, 0.02, 20).rotateX(Math.PI / 2).translate(0, 1.32, -0.11)), "#fdfcf7");
  S.add(P(boxGeo(0.012, 0.13, 0.01, 0, 0, 0).rotateZ(0.7).translate(0.03, 1.35, -0.1)), "#d62828");
  S.add(P(boxGeo(0.06, 0.02, 0.02, 0, 1.08, -0.135)), "#1d1d1d");
  c.col.addBox(x, z, 0.55, 0.6);
}

/** A lucha libre poster for the gym's wall: a luchador's mask (its colours, the white rims round the eyes and mouth, a
 *  flame up its middle) over "¡Sí se puede!". */
function luchadorPoster() {
  return canvasTex(256, 352, (x) => {
    x.fillStyle = "#1d1d1d"; x.fillRect(0, 0, 256, 352);
    x.fillStyle = "#f6c000"; x.fillRect(8, 8, 240, 336);
    x.fillStyle = "#c8102e"; x.fillRect(16, 16, 224, 244);
    const cx = 128, cy = 136;
    x.fillStyle = "#1f4e9c"; x.beginPath(); x.ellipse(cx, cy, 78, 98, 0, 0, Math.PI * 2); x.fill();
    x.fillStyle = "#f6c000"; x.beginPath(); x.moveTo(cx, cy - 98); x.quadraticCurveTo(cx + 26, cy - 50, cx, cy - 6); x.quadraticCurveTo(cx - 26, cy - 50, cx, cy - 98); x.fill();
    for (const s of [-1, 1]) {
      x.fillStyle = "#ffffff"; x.beginPath(); x.ellipse(cx + s * 34, cy - 4, 24, 15, s * 0.25, 0, Math.PI * 2); x.fill();
      x.fillStyle = "#e7c49c"; x.beginPath(); x.ellipse(cx + s * 34, cy - 4, 16, 9, s * 0.25, 0, Math.PI * 2); x.fill();
      x.fillStyle = "#1d1d1d"; x.beginPath(); x.arc(cx + s * 32, cy - 4, 5, 0, Math.PI * 2); x.fill();
    }
    x.fillStyle = "#ffffff"; x.beginPath(); x.ellipse(cx, cy + 50, 26, 15, 0, 0, Math.PI * 2); x.fill();
    x.fillStyle = "#e7c49c"; x.beginPath(); x.ellipse(cx, cy + 50, 18, 8, 0, 0, Math.PI * 2); x.fill();
    x.fillStyle = "#c8102e"; x.textAlign = "center"; x.textBaseline = "middle"; x.font = "900 38px Nunito, Arial";
    x.fillText("¡Sí se puede!", cx, 300);
  });
}

/** A vaccination poster for the clinic: a smiling child with a plaster on the arm, a syringe, the campaign's words. */
function vacunaPoster() {
  return canvasTex(256, 352, (x) => {
    x.fillStyle = "#f4f9fb"; x.fillRect(0, 0, 256, 352);
    x.fillStyle = "#1f8a4c"; x.fillRect(0, 0, 256, 70);
    x.fillStyle = "#ffffff"; x.textAlign = "center"; x.textBaseline = "middle"; x.font = "900 40px Nunito, Arial"; x.fillText("¡Vacúnate!", 128, 38);
    x.fillStyle = "#c68e63"; x.beginPath(); x.arc(110, 150, 42, 0, Math.PI * 2); x.fill();
    x.fillStyle = "#1f1a17"; x.beginPath(); x.arc(110, 132, 44, Math.PI, 0); x.fill();
    x.fillStyle = "#1f1a17"; for (const s of [-1, 1]) { x.beginPath(); x.arc(110 + s * 15, 152, 4, 0, Math.PI * 2); x.fill(); }
    x.strokeStyle = "#1f1a17"; x.lineWidth = 4; x.beginPath(); x.arc(110, 162, 14, 0.2, Math.PI - 0.2); x.stroke();
    x.fillStyle = "#f6c000"; x.fillRect(66, 196, 88, 70);
    x.fillStyle = "#c68e63"; x.fillRect(154, 200, 22, 56);
    x.fillStyle = "#f2e2c4"; x.fillRect(150, 214, 30, 14);
    x.save(); x.translate(200, 150); x.rotate(-0.6);
    x.fillStyle = "#d8eef7"; x.fillRect(-12, -40, 24, 70); x.fillStyle = "#3a86b0"; x.fillRect(-12, -40, 24, 10); x.fillRect(-3, 30, 6, 26);
    x.restore();
    x.fillStyle = "#1f4e5f"; x.font = "800 24px Nunito, Arial"; x.fillText("Campaña de vacunación", 128, 296); x.font = "700 20px Nunito, Arial"; x.fillText("Pregunte en recepción", 128, 326);
  });
}

/** A string of paper pennants (banderines) in the flag's green, white and red along a wall, from x0 to x1 at z, its
 *  top at y, sagging a little. In the smalls. */
function banderines(S: Smalls, x0: number, x1: number, y: number, z: number) {
  const n = Math.round((x1 - x0) / 0.42), COL = ["#006847", "#f8f8f4", "#ce1126"];
  S.add(boxGeo(x1 - x0, 0.015, 0.015, (x0 + x1) / 2, y, z), "#f4f1ea");
  for (let i = 0; i < n; i++) {
    const px = x0 + (i + 0.5) * ((x1 - x0) / n), sag = Math.sin(((i + 0.5) / n) * Math.PI) * 0.08;
    S.add(new THREE.ConeGeometry(0.15, 0.3, 3).rotateX(Math.PI).scale(1, 1, 0.08).translate(px, y - 0.16 - sag, z), COL[i % 3]);
  }
}

/** A child's corner in the clinic's waiting room: a foam puzzle mat, a little table with two little chairs, building
 *  blocks. In the smalls. */
function kidsCorner(c: Ctx, S: Smalls, x: number, z: number) {
  const COL = ["#e4007c", "#f6c000", "#00a6a6", "#7ac143"];
  for (let i = 0; i < 4; i++) for (let k = 0; k < 4; k++) S.add(boxGeo(0.49, 0.02, 0.49, x - 0.75 + i * 0.5, 0.012, z - 0.75 + k * 0.5), COL[(i + k * 3) % 4]);
  S.add(boxGeo(0.6, 0.04, 0.6, x + 0.3, 0.44, z - 0.3), "#f4f1ea");
  for (const [lx, lz] of [[-0.26, -0.26], [0.26, -0.26], [-0.26, 0.26], [0.26, 0.26]]) S.add(boxGeo(0.04, 0.42, 0.04, x + 0.3 + lx, 0.21, z - 0.3 + lz), "#1f6fd1");
  for (const [cx, cz, col] of [[x + 0.3, z - 0.82, "#e4007c"], [x + 0.3, z + 0.22, "#7ac143"]] as [number, number, string][]) {
    S.add(boxGeo(0.28, 0.04, 0.28, cx, 0.26, cz), col); S.add(boxGeo(0.28, 0.26, 0.04, cx, 0.4, cz + (cz < z ? -0.12 : 0.12)), col);
    for (const [lx, lz] of [[-0.11, -0.11], [0.11, -0.11], [-0.11, 0.11], [0.11, 0.11]]) S.add(boxGeo(0.03, 0.24, 0.03, cx + lx, 0.12, cz + lz), col);
  }
  for (let i = 0; i < 7; i++) S.add(boxGeo(0.12, 0.12, 0.12, x - 0.6 + (i % 3) * 0.16, 0.08 + Math.floor(i / 3) * 0.12, z + 0.45 + (i % 2) * 0.05, i * 0.3), COL[i % 4]);
  c.col.addBox(x + 0.3, z - 0.3, 0.7, 1.4);
}

/** The mercado's other aisle (theme.ts roomExtras.roomsMx; s32): a stepped stand of flowers in their buckets by the door
 *  on the east, piñatas hanging from a beam behind the juice stand, and a woman's comal of handmade tortillas by the
 *  door on the west (the comal on its brazier, the masa, the basket under its cloth). */
function mercadoMx(c: Ctx, S: Smalls) {
  // the flowers: three steps, the buckets on them, a bunch in each
  const fx = 7.6, fz = 4.6;
  for (let k = 0; k < 3; k++) S.add(boxGeo(2.6, 0.32, 0.5, fx, 0.16 + k * 0.32, fz - 0.5 + k * 0.5), "#8a5a3c");
  const FLOW = ["#e4007c", "#f6c000", "#f77f00", "#ffffff", "#d62828", "#ff8fab", "#f6c000", "#e4007c"];
  for (let k = 0; k < 3; k++) for (let i = 0; i < 5; i++) {
    const bx = fx - 1.0 + i * 0.5, by = 0.32 + k * 0.32, bz = fz - 0.5 + k * 0.5, col = FLOW[(i + k * 3) % FLOW.length];
    S.add(cylGeo(0.13, 0.11, 0.24, bx, by + 0.12, bz, 10), "#9aa5ad");
    for (let j = 0; j < 4; j++) S.add(new THREE.IcosahedronGeometry(0.08, 0).translate(bx + Math.cos(j * 1.6) * 0.07, by + 0.42 + (j % 2) * 0.06, bz + Math.sin(j * 1.6) * 0.07), col);
    S.add(cylGeo(0.012, 0.012, 0.25, bx, by + 0.33, bz, 4), "#3f7d3a");
  }
  c.col.addBox(fx, fz, 2.7, 1.6);
  wallPanel(c, textTexture("Flores", { bg: "#e4007c", fg: "#ffffff", w: 384, h: 128 }), fx, 2.55, fz + 0.1, 1.2, 0.4);
  for (const s of [-0.5, 0.5]) S.add(cylGeo(0.006, 0.006, WALL_H - 2.75, fx + s, (WALL_H + 2.75) / 2, fz + 0.1, 4), "#3a3d42");
  // the piñatas: a beam between two posts, five stars hanging from it
  const px = 6.6, pz = -3.4;
  for (const s of [-1.6, 1.6]) S.add(cylGeo(0.07, 0.07, 3.2, px + s, 1.6, pz, 6), "#6f4a2c");
  S.add(boxGeo(3.4, 0.1, 0.1, px, 3.15, pz), "#6f4a2c");
  const PIN = ["#e4007c", "#f6c000", "#1f6fd1", "#7ac143", "#f77f00"];
  for (let i = 0; i < 5; i++) {
    const x = px - 1.3 + i * 0.65, y = 2.45 - (i % 2) * 0.25, col = PIN[i];
    S.add(cylGeo(0.006, 0.006, 3.1 - y - 0.2, x, (3.1 + y + 0.2) / 2, pz, 4), "#f4f1ea");
    S.add(new THREE.SphereGeometry(0.2, 10, 8).translate(x, y, pz), col);
    for (let j = 0; j < 6; j++) {
      const a = (j / 6) * Math.PI * 2;
      S.add(new THREE.ConeGeometry(0.06, 0.26, 6).rotateZ(-Math.PI / 2).rotateY(-a).translate(x + Math.cos(a) * 0.27, y + Math.sin(j * 2.1) * 0.06, pz + Math.sin(a) * 0.27), PIN[(i + j + 1) % 5]);
    }
  }
  for (const s of [-1.6, 1.6]) c.col.addCircle(px + s, pz, 0.15);
  wallPanel(c, textTexture("Piñatas", { bg: "#6d2e9e", fg: "#ffffff", w: 384, h: 128 }), px, 3.6, pz + 0.08, 1.3, 0.43);
  // the comal by the west door: the brazier, the round comal, tortillas on it, the masa, the basket
  const cx = -8.6, cz = 5.0;
  S.add(boxGeo(1.6, 0.75, 0.8, cx, 0.375, cz), "#8a5a3c");
  S.add(boxGeo(1.7, 0.05, 0.9, cx, 0.775, cz), "#c79a6b");
  S.add(cylGeo(0.3, 0.26, 0.2, cx - 0.35, 0.9, cz, 14), "#3a3d42");
  S.add(cylGeo(0.36, 0.36, 0.025, cx - 0.35, 1.012, cz, 18), "#2b2b2e");
  for (let i = 0; i < 3; i++) S.add(cylGeo(0.075, 0.075, 0.008, cx - 0.5 + i * 0.15, 1.03, cz + (i % 2 ? 0.1 : -0.08), 12), "#f2e2b8");
  S.add(new THREE.SphereGeometry(0.13, 10, 6).scale(1.3, 0.6, 1).translate(cx + 0.25, 0.86, cz - 0.15), "#e8d6a8");
  S.add(cylGeo(0.17, 0.14, 0.14, cx + 0.5, 0.87, cz + 0.15, 12), "#c79a6b");
  S.add(cylGeo(0.175, 0.175, 0.015, cx + 0.5, 0.95, cz + 0.15, 12), "#e4007c");
  c.col.addBox(cx, cz, 1.7, 0.9);
  wallPanel(c, textTexture("Tortillas a mano", { bg: "#f6c000", fg: "#5f0f40", w: 512, h: 128 }), cx, 2.2, cz - 0.42, 1.5, 0.375);
  for (const s of [-0.6, 0.6]) S.add(cylGeo(0.006, 0.006, WALL_H - 2.39, cx + s, (WALL_H + 2.39) / 2, cz - 0.42, 4), "#3a3d42");
}

export function getInterior(loc: string): Interior | null {
  if (cache.has(loc)) return cache.get(loc)!;
  const b = B[loc];
  if (!b) return null;
  const it = b();
  cache.set(loc, it);
  return it;
}
export const INTERIOR_IDS = Object.keys(B);
