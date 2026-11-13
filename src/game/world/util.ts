// Geometry helpers: collect many small boxes/shapes per material and merge them into a few meshes.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { STYLED, IS_REAL, styledMat, refineForKey, wantsOutline, makeOutline, outlineColorFor, bevelRadius } from "../style";
import { chamferBox, boxProjectUV } from "./shapes";

export class Merger {
  private groups = new Map<string, { mat: THREE.Material; geos: THREE.BufferGeometry[]; cast: boolean; receive: boolean; key: string }>();
  add(key: string, mat: THREE.Material, geo: THREE.BufferGeometry, cast = true, receive = true) {
    if (STYLED) mat = refineForKey(key, mat); // trial styles: glass, wood, metal… (see style.ts)
    let g = this.groups.get(key);
    if (!g) { g = { mat, geos: [], cast, receive, key }; this.groups.set(key, g); }
    else if (g.mat !== mat && lookOf(g.mat) !== lookOf(mat)) {
      // a shape in another material than the key's first: a mesh of its own (`key~2`, `key~3`…) with the key's
      // shadows, so it keeps its own colour (one mesh per key drew every shape in the first one's material: the brass
      // and the steel door handles all one metal, a party table's base as white as its top)
      const first = g, look = lookOf(mat);
      for (let n = 2; ; n++) {
        const o = this.groups.get(key + "~" + n);
        if (!o) { g = { mat, geos: [], cast: first.cast, receive: first.receive, key }; this.groups.set(key + "~" + n, g); break; }
        if (o.mat === mat || lookOf(o.mat) === look) { g = o; break; }
      }
    }
    const ng = geo.index ? geo.toNonIndexed() : geo;
    if (STYLED && g.mat.userData.uvScale) boxProjectUV(ng, g.mat.userData.uvScale);
    g.geos.push(ng);
  }
  build(parent: THREE.Object3D) {
    for (const [name, g] of this.groups) {
      if (!g.geos.length) continue;
      const merged = mergeGeometries(g.geos.map(normalizeAttrs), false);
      if (!merged) continue;
      const key = g.key;
      const mesh = new THREE.Mesh(merged, g.mat);
      mesh.name = name;
      mesh.castShadow = g.cast;
      mesh.receiveShadow = g.receive;
      if (STYLED && !IS_REAL && /-walls$/.test(key)) mesh.receiveShadow = false; // clean cartoon / illustrated facades
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      parent.add(mesh);
      if (STYLED && wantsOutline(key)) {
        const c = (g.mat as THREE.MeshToonMaterial).color ?? new THREE.Color("#888888");
        mesh.add(makeOutline(mesh, outlineColorFor(c), /-walls$|^roof-/.test(key) ? 0.05 : 0.028));
      }
    }
    this.groups.clear();
  }
}

/** How a material looks (its kind, colours, shading, transparency, side, texture): two materials that look alike can
 *  share a key's mesh. */
function lookOf(m: THREE.Material) {
  const l = m as THREE.MeshLambertMaterial;
  return [m.type, l.color?.getHexString(), l.emissive?.getHexString(), l.flatShading, m.transparent, m.opacity, m.side, m.depthWrite, l.map?.uuid].join("|");
}

function normalizeAttrs(g: THREE.BufferGeometry) {
  // mergeGeometries needs identical attribute sets
  for (const name of Object.keys(g.attributes)) if (!["position", "normal", "uv"].includes(name)) g.deleteAttribute(name);
  if (!g.attributes.uv) {
    const n = g.attributes.position.count;
    g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  }
  if (!g.attributes.normal) g.computeVertexNormals();
  return g;
}

const matCache = new Map<string, THREE.Material>();
/** Shared flat-colored Lambert material. */
export function mat(color: string, opts: { emissive?: string; flat?: boolean; transparent?: number; side?: THREE.Side } = {}) {
  if (STYLED) return styledMat(color, opts); // trial world styles (style.ts); "blocks" continues below
  const key = color + JSON.stringify(opts);
  let m = matCache.get(key);
  if (!m) {
    const params: THREE.MeshLambertMaterialParameters = { color: new THREE.Color(color), flatShading: opts.flat ?? false };
    if (opts.emissive) params.emissive = new THREE.Color(opts.emissive);
    if (opts.transparent !== undefined) { params.transparent = true; params.opacity = opts.transparent; params.depthWrite = false; }
    if (opts.side !== undefined) params.side = opts.side;
    m = new THREE.MeshLambertMaterial(params);
    matCache.set(key, m);
  }
  return m;
}

/** Box geometry positioned by its centre. */
export function boxGeo(w: number, h: number, d: number, x: number, y: number, z: number, rotY = 0) {
  const r = STYLED ? bevelRadius(w, h, d) : 0; // trial styles: softened / bevelled edges
  const g = r > 0 ? chamferBox(w, h, d, r) : new THREE.BoxGeometry(w, h, d);
  if (rotY) g.rotateY(rotY);
  g.translate(x, y, z);
  return g;
}

export function cylGeo(rt: number, rb: number, h: number, x: number, y: number, z: number, seg = 10) {
  const g = new THREE.CylinderGeometry(rt, rb, h, STYLED ? Math.min(32, Math.round(seg * 1.6)) : seg);
  g.translate(x, y, z);
  return g;
}

/** Text sign as a canvas texture. `lines`: the text may be broken at its spaces onto up to that many lines, whichever
 *  way its letters come out biggest (a small board with a long text, a tall banner). */
export function textTexture(text: string, opts: { bg?: string; fg?: string; font?: string; w?: number; h?: number; border?: string; script?: boolean; lines?: number } = {}) {
  const w = opts.w ?? 512, h = opts.h ?? 128;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const x = c.getContext("2d")!;
  x.fillStyle = opts.bg ?? "#ffffff";
  roundRect(x, 4, 4, w - 8, h - 8, h * 0.18);
  x.fill();
  if (opts.border) { x.lineWidth = h * 0.06; x.strokeStyle = opts.border; x.stroke(); }
  x.fillStyle = opts.fg ?? "#222";
  const family = opts.font ?? (opts.script ? "'Georgia', serif" : "'Nunito', 'Arial Rounded MT Bold', Arial, sans-serif");
  /** The biggest size up to `size` px with which every row is at most 90% of the board wide. */
  const fit = (rows: string[], size: number) => {
    x.font = `800 ${size}px ${family}`;
    while (Math.max(...rows.map((r) => x.measureText(r).width)) > w * 0.9 && size > 10) { size -= 2; x.font = `800 ${size}px ${family}`; }
    return size;
  };
  const widest = (rows: string[]) => Math.max(...rows.map((r) => x.measureText(r).width));
  let rows = [text], size = fit(rows, h * 0.52), wide = widest(rows);
  // (a dash stays with what follows it, a "·" between two parts is dropped where the line breaks)
  const words = text.split(" ").reduce<string[]>((a, w) => (a.length && /^[–-]$/.test(a[a.length - 1]) ? (a[a.length - 1] += " " + w) : a.push(w), a), []);
  for (let n = 2; n <= Math.min(opts.lines ?? 1, words.length); n++) {
    // every way of cutting the words into n rows (a sign has a handful of words)
    const cuts = (from: number, left: number): number[][] => left === 0 ? [[]] : Array.from({ length: words.length - from - left }, (_, i) => from + 1 + i).flatMap((k) => cuts(k, left - 1).map((r) => [k, ...r]));
    for (const cut of cuts(0, n - 1)) {
      const r = [0, ...cut].map((a, i) => words.slice(a, [...cut, words.length][i]).join(" ").replace(/^· | ·$/g, ""));
      // the biggest letters; as big, the evenest lines ("2 for $5" over "Weekly Deals", not "2 for" over the rest)
      const s = fit(r, (h * 0.84) / (n * 1.06)), wd = widest(r);
      if (s > size || (s === size && n === rows.length && wd < wide)) { size = s; rows = r; wide = wd; }
    }
  }
  x.font = `800 ${size}px ${family}`;
  x.textAlign = "center"; x.textBaseline = "middle";
  rows.forEach((r, i) => x.fillText(r, w / 2, h / 2 + (i - (rows.length - 1) / 2) * size * 1.06 + size * 0.04));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  // sharp at an angle too (three.js keeps it to what the graphics card can do)
  t.anisotropy = 16;
  return t;
}

export function roundRect(x: CanvasRenderingContext2D, px: number, py: number, w: number, h: number, r: number) {
  x.beginPath();
  x.moveTo(px + r, py);
  x.arcTo(px + w, py, px + w, py + h, r);
  x.arcTo(px + w, py + h, px, py + h, r);
  x.arcTo(px, py + h, px, py, r);
  x.arcTo(px, py, px + w, py, r);
  x.closePath();
}

/** Deterministic pseudo-random numbers for decoration. */
export function rand(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** `split`: low enough to jump onto; for the player its pieces (ledges.ts) stand in for it. */
export interface AABB { minX: number; minZ: number; maxX: number; maxZ: number; tag?: string; split?: boolean }

/** 2D (XZ) colliders: axis-aligned boxes and circles. */
export class Colliders {
  boxes: AABB[] = [];
  circles: { x: number; z: number; r: number; split?: boolean }[] = [];
  addBox(cx: number, cz: number, w: number, d: number, tag?: string) {
    this.boxes.push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2, tag });
  }
  addCircle(x: number, z: number, r: number) { this.circles.push({ x, z, r }); }
  /** Push a circle of radius r at (x,z) out of all colliders (`jumper`, the player outdoors: but those split into
   *  pieces with a height, which ledges.ts then settles for someone who can jump, and the sea, whose shallows they
   *  wade into: water.ts). */
  resolve(p: THREE.Vector3, r: number, jumper = false) {
    for (let iter = 0; iter < 2; iter++) {
      for (const b of this.boxes) {
        if (jumper && (b.split || b.tag === "sea")) continue;
        const cx = Math.max(b.minX, Math.min(p.x, b.maxX));
        const cz = Math.max(b.minZ, Math.min(p.z, b.maxZ));
        const dx = p.x - cx, dz = p.z - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 < r * r) {
          if (d2 > 1e-9) {
            const d = Math.sqrt(d2);
            p.x = cx + (dx / d) * r; p.z = cz + (dz / d) * r;
          } else {
            // inside the box: push out through the nearest side
            const left = p.x - b.minX, right = b.maxX - p.x, top = p.z - b.minZ, bottom = b.maxZ - p.z;
            const m = Math.min(left, right, top, bottom);
            if (m === left) p.x = b.minX - r; else if (m === right) p.x = b.maxX + r;
            else if (m === top) p.z = b.minZ - r; else p.z = b.maxZ + r;
          }
        }
      }
      for (const c of this.circles) {
        if (jumper && c.split) continue;
        const dx = p.x - c.x, dz = p.z - c.z;
        const d2 = dx * dx + dz * dz, rr = r + c.r;
        if (d2 < rr * rr && d2 > 1e-9) {
          const d = Math.sqrt(d2);
          p.x = c.x + (dx / d) * rr; p.z = c.z + (dz / d) * rr;
        }
      }
    }
  }
  blocked(x: number, z: number, r: number) {
    for (const b of this.boxes) if (x > b.minX - r && x < b.maxX + r && z > b.minZ - r && z < b.maxZ + r) return true;
    for (const c of this.circles) { const dx = x - c.x, dz = z - c.z; if (dx * dx + dz * dz < (r + c.r) ** 2) return true; }
    return false;
  }
}

/** Shapes merged into one geometry with their colours in the vertices. */
export function colourMerge(parts: [THREE.BufferGeometry, THREE.ColorRepresentation][]) {
  const c = new THREE.Color();
  const geos = parts.map(([g0, col]) => {
    const g = g0.index ? g0.toNonIndexed() : g0;
    for (const k of Object.keys(g.attributes)) if (k !== "position" && k !== "normal") g.deleteAttribute(k);
    if (!g.attributes.normal) g.computeVertexNormals();
    c.set(col);
    const n = g.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
    g.setAttribute("color", new THREE.BufferAttribute(a, 3));
    return g;
  });
  const merged = mergeGeometries(geos, false)!;
  for (const g of geos) g.dispose();
  return merged;
}
