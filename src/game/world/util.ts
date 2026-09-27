// Geometry helpers: collect many small boxes/shapes per material and merge them into a few meshes.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { STYLED, IS_REAL, styledMat, refineForKey, wantsOutline, makeOutline, outlineColorFor, bevelRadius } from "../style";
import { chamferBox, boxProjectUV } from "./shapes";

export class Merger {
  private groups = new Map<string, { mat: THREE.Material; geos: THREE.BufferGeometry[]; cast: boolean; receive: boolean }>();
  add(key: string, mat: THREE.Material, geo: THREE.BufferGeometry, cast = true, receive = true) {
    if (STYLED) mat = refineForKey(key, mat); // trial styles: glass, wood, metal… (see style.ts)
    let g = this.groups.get(key);
    if (!g) { g = { mat, geos: [], cast, receive }; this.groups.set(key, g); }
    const ng = geo.index ? geo.toNonIndexed() : geo;
    if (STYLED && g.mat.userData.uvScale) boxProjectUV(ng, g.mat.userData.uvScale);
    g.geos.push(ng);
  }
  build(parent: THREE.Object3D) {
    for (const [key, g] of this.groups) {
      if (!g.geos.length) continue;
      const merged = mergeGeometries(g.geos.map(normalizeAttrs), false);
      if (!merged) continue;
      const mesh = new THREE.Mesh(merged, g.mat);
      mesh.name = key;
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

/** Text sign as a canvas texture. */
export function textTexture(text: string, opts: { bg?: string; fg?: string; font?: string; w?: number; h?: number; border?: string; script?: boolean } = {}) {
  const w = opts.w ?? 512, h = opts.h ?? 128;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const x = c.getContext("2d")!;
  x.fillStyle = opts.bg ?? "#ffffff";
  roundRect(x, 4, 4, w - 8, h - 8, h * 0.18);
  x.fill();
  if (opts.border) { x.lineWidth = h * 0.06; x.strokeStyle = opts.border; x.stroke(); }
  x.fillStyle = opts.fg ?? "#222";
  let size = h * 0.52;
  const family = opts.font ?? (opts.script ? "'Georgia', serif" : "'Nunito', 'Arial Rounded MT Bold', Arial, sans-serif");
  x.font = `800 ${size}px ${family}`;
  while (x.measureText(text).width > w * 0.9 && size > 10) { size -= 2; x.font = `800 ${size}px ${family}`; }
  x.textAlign = "center"; x.textBaseline = "middle";
  x.fillText(text, w / 2, h / 2 + size * 0.04);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
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

export interface AABB { minX: number; minZ: number; maxX: number; maxZ: number; tag?: string }

/** 2D (XZ) colliders: axis-aligned boxes and circles. */
export class Colliders {
  boxes: AABB[] = [];
  circles: { x: number; z: number; r: number }[] = [];
  addBox(cx: number, cz: number, w: number, d: number, tag?: string) {
    this.boxes.push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2, tag });
  }
  addCircle(x: number, z: number, r: number) { this.circles.push({ x, z, r }); }
  /** Push a circle of radius r at (x,z) out of all colliders. */
  resolve(p: THREE.Vector3, r: number) {
    for (let iter = 0; iter < 2; iter++) {
      for (const b of this.boxes) {
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
