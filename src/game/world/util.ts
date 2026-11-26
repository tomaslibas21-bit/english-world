// Geometry helpers: collect many small boxes/shapes per material and merge them into a few meshes.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { STYLED, IS_REAL, styledMat, refineForKey, wantsOutline, makeOutline, outlineColorFor, bevelRadius } from "../style";
import { chamferBox, boxProjectUV } from "./shapes";
import { mergeCollisionRanges, visualOnly } from "../collisionGeometry";

type BakeMaterial = Pick<THREE.MeshLambertMaterial, "color" | "emissive" | "emissiveIntensity" | "flatShading">;
type BakePart = THREE.BufferGeometry | { geo: THREE.BufferGeometry; mat: BakeMaterial };

export class Merger {
  private groups = new Map<string, { mat: THREE.Material; geos: THREE.BufferGeometry[]; cast: boolean; receive: boolean; key: string }>();
  private borrowedGeometries?: WeakSet<THREE.BufferGeometry>;

  constructor({ directBake = false } = {}) {
    if (directBake && !STYLED) this.borrowedGeometries = new WeakSet();
  }

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
    if (geo.userData.collisionRanges !== undefined) ng.userData.collisionRanges = geo.userData.collisionRanges;
    if (this.borrowedGeometries && (ng === geo || geo.toNonIndexed !== THREE.BufferGeometry.prototype.toNonIndexed)) {
      this.borrowedGeometries.add(ng);
    }
    if (STYLED && g.mat.userData.uvScale) boxProjectUV(ng, g.mat.userData.uvScale);
    g.geos.push(ng);
  }
  /** Paint and small service details share render batches but retain the underlying collision geometry. */
  addVisual(key: string, mat: THREE.Material, geo: THREE.BufferGeometry, cast = true, receive = true) {
    this.add(key, mat, visualOnly(geo), cast, receive);
  }
  /** `bake` (the original look only): every shape in a plain colour (an opaque, one-sided Lambert material with no
   *  texture: nearly all of a town's or a room's props) is drawn in a few meshes that carry the colours in their
   *  vertices (`bakedMaterial`), one per `cell` m of ground and shadow setting, instead of one mesh per colour, which
   *  were each as wide as the town and so drawn in every frame, twice (the picture and the sun's shadow map). The
   *  picture is the same; a street's draw calls halve. `keep`: keys that stay meshes of their own, by their name. */
  build(parent: THREE.Object3D, bake?: { name: string; cell?: number; keep?: RegExp }) {
    const chunks = new Map<string, { parts: BakePart[]; cast: boolean; receive: boolean }>();
    for (const [name, g] of this.groups) {
      if (!g.geos.length) continue;
      if (bake && !STYLED && !bake.keep?.test(name) && plainLambert(g.mat)) {
        const m = g.mat as THREE.MeshLambertMaterial, cell = bake.cell ?? Infinity;
        const shadows = `${+g.cast}${+g.receive}`;
        const borrowed = this.borrowedGeometries;
        const direct = borrowed && !m.lightMap && !m.aoMap && !m.bumpMap && !m.normalMap
          && !m.displacementMap && !m.specularMap && !m.envMap && m.onBeforeCompile === THREE.Material.prototype.onBeforeCompile;
        let material: BakeMaterial | undefined;
        for (const geo of g.geos) {
          // Indexed inputs are private snapshots. Borrowed nonindexed geometries retain the legacy bake and disposal.
          let part: BakePart;
          if (direct && !borrowed.has(geo) && canPack(geo, m.flatShading)) {
            // Read the group's current material when it is baked, after any changes since add().
            material ??= { color: m.color.clone(), emissive: m.emissive.clone(), emissiveIntensity: m.emissiveIntensity, flatShading: m.flatShading };
            part = { geo, mat: material };
          } else {
            part = bakeColours(geo, m);
          }
          const k = cell === Infinity ? shadows : `${shadows}|${part instanceof THREE.BufferGeometry ? geometryCell(part, cell) : positionCell(part.geo, cell)}`;
          let ch = chunks.get(k);
          if (!ch) chunks.set(k, ch = { parts: [], cast: g.cast, receive: g.receive });
          ch.parts.push(part);
        }
        continue;
      }
      const merged = mergeGeometries(g.geos.map(normalizeAttrs), false);
      if (!merged) continue;
      mergeCollisionRanges(merged, g.geos);
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
    let n = 0;
    for (const ch of chunks.values()) {
      const merged = mergeBakeParts(ch.parts, !!this.borrowedGeometries);
      if (!merged) continue;
      mergeCollisionRanges(merged, ch.parts.map((part) => part instanceof THREE.BufferGeometry ? part : part.geo));
      const mesh = new THREE.Mesh(merged, bakedMaterial());
      mesh.name = `${bake!.name}-${n++}`;
      mesh.castShadow = ch.cast;
      mesh.receiveShadow = ch.receive;
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      parent.add(mesh);
    }
    this.groups.clear();
  }
}

function positionCell(geo: THREE.BufferGeometry, cell: number) {
  const positions = geo.attributes.position.array;
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < positions.length; i += 3) {
    minX = Math.min(minX, positions[i]); maxX = Math.max(maxX, positions[i]);
    minZ = Math.min(minZ, positions[i + 2]); maxZ = Math.max(maxZ, positions[i + 2]);
  }
  return `${Math.floor((minX + maxX) / 2 / cell)},${Math.floor((minZ + maxZ) / 2 / cell)}`;
}

function geometryCell(geo: THREE.BufferGeometry, cell: number) {
  geo.computeBoundingBox();
  const { min, max } = geo.boundingBox!;
  return `${Math.floor((min.x + max.x) / 2 / cell)},${Math.floor((min.z + max.z) / 2 / cell)}`;
}

function packedAttribute(attr: THREE.BufferAttribute | THREE.InterleavedBufferAttribute | undefined, count: number) {
  return attr instanceof THREE.BufferAttribute && attr.array.constructor === Float32Array && attr.itemSize === 3
    && !attr.normalized && attr.gpuType === THREE.FloatType && attr.count === count && attr.array.length === count * 3;
}

function canPack(geo: THREE.BufferGeometry, flat: boolean) {
  const { position, normal } = geo.attributes;
  const count = position?.count;
  return !geo.index && !geo.morphTargetsRelative && !Object.keys(geo.morphAttributes).length
    && count % 3 === 0 && packedAttribute(position, count) && (flat || !normal || packedAttribute(normal, count));
}

function mergeBakeParts(parts: BakePart[], directBake: boolean) {
  // A chunk with unusual attributes still uses Three's merge, including its compatibility checks.
  if (!directBake) return mergeBakedGeometries(parts);
  let size = 0;
  let hasDirectPart = false;
  for (const part of parts) {
    if (part instanceof THREE.BufferGeometry) {
      const { position, normal, color, emi } = part.attributes;
      if (!canPack(part, false) || !normal || Object.keys(part.attributes).length !== 4
        || !packedAttribute(color, position.count) || !packedAttribute(emi, position.count)) return mergeBakedGeometries(parts);
      size += position.array.length;
    } else {
      size += part.geo.attributes.position.array.length;
      hasDirectPart = true;
    }
  }
  if (!hasDirectPart) return mergeBakedGeometries(parts);
  const positions = new Float32Array(size), normals = new Float32Array(size);
  const colours = new Float32Array(size), emission = new Float32Array(size);
  let offset = 0;
  for (const part of parts) {
    const baked = part instanceof THREE.BufferGeometry;
    const geo = baked ? part : part.geo;
    const { position, normal, color, emi } = geo.attributes;
    positions.set(position.array, offset);
    const end = offset + position.array.length;
    if (baked || (!part.mat.flatShading && normal)) normals.set(normal.array, offset);
    else writeFaceNormals(positions, normals, offset, end);
    if (baked) {
      colours.set(color.array, offset);
      emission.set(emi.array, offset);
    } else {
      const { color: c, emissive: e, emissiveIntensity: intensity } = part.mat;
      const er = e.r * intensity, eg = e.g * intensity, eb = e.b * intensity;
      for (let i = offset; i < end; i += 3) {
        colours[i] = c.r; colours[i + 1] = c.g; colours[i + 2] = c.b;
        emission[i] = er; emission[i + 1] = eg; emission[i + 2] = eb;
      }
    }
    offset = end;
  }

  const merged = new THREE.BufferGeometry();
  const first = parts[0];
  const firstAttrs = Object.keys((first instanceof THREE.BufferGeometry ? first : first.geo).attributes);
  // Three merges attributes in the first geometry's order. Generated normals follow positions.
  const normalIndex = firstAttrs.indexOf("normal");
  const normalFirst = (first instanceof THREE.BufferGeometry || !first.mat.flatShading)
    && normalIndex >= 0 && normalIndex < firstAttrs.indexOf("position");
  const position = new THREE.BufferAttribute(positions, 3), normal = new THREE.BufferAttribute(normals, 3);
  if (normalFirst) merged.setAttribute("normal", normal);
  merged.setAttribute("position", position);
  if (!normalFirst) merged.setAttribute("normal", normal);
  merged.setAttribute("color", new THREE.BufferAttribute(colours, 3));
  merged.setAttribute("emi", new THREE.BufferAttribute(emission, 3));
  for (const part of parts) (part instanceof THREE.BufferGeometry ? part : part.geo).dispose();
  return merged;
}

function mergeBakedGeometries(parts: BakePart[]) {
  const geos = parts.map((part) => part instanceof THREE.BufferGeometry ? part : bakeColours(part.geo, part.mat));
  const merged = mergeGeometries(geos, false);
  for (const geo of geos) geo.dispose();
  return merged;
}

function writeFaceNormals(positions: Float32Array, normals: Float32Array, start: number, end: number) {
  for (let i = start; i < end; i += 9) {
    const ax = positions[i] - positions[i + 3], ay = positions[i + 1] - positions[i + 4], az = positions[i + 2] - positions[i + 5];
    const bx = positions[i + 6] - positions[i + 3], by = positions[i + 7] - positions[i + 4], bz = positions[i + 8] - positions[i + 5];
    // Three stores the cross product in a Float32 attribute before normalizing it.
    const x = Math.fround(by * az - bz * ay), y = Math.fround(bz * ax - bx * az), z = Math.fround(bx * ay - by * ax);
    const invLength = 1 / (Math.sqrt(x * x + y * y + z * z) || 1);
    normals[i] = normals[i + 3] = normals[i + 6] = x * invLength;
    normals[i + 1] = normals[i + 4] = normals[i + 7] = y * invLength;
    normals[i + 2] = normals[i + 5] = normals[i + 8] = z * invLength;
  }
}

/** A material whose shapes `Merger.build`'s `bake` can draw from their vertices' colours: Lambert, one colour (and a
 *  glow), opaque, one-sided, no texture and no shader of its own (`userData`: the windows' `reflective` glass; the
 *  camera's cutout, which the baked material learns itself, doesn't count). */
function plainLambert(m: THREE.Material) {
  const l = m as THREE.MeshLambertMaterial;
  return l.isMeshLambertMaterial && !l.map && !l.emissiveMap && !l.alphaMap && !l.vertexColors && !l.transparent && l.opacity === 1 && l.side === THREE.FrontSide
    && !l.alphaTest && l.depthWrite && l.depthTest && !l.wireframe && !Object.keys(l.userData).length;
}
/** The shape with its material's colour and glow in its vertices (and flat faces where the material shaded flat). */
function bakeColours(g0: THREE.BufferGeometry, m: BakeMaterial) {
  const g = g0.index ? g0.toNonIndexed() : g0;
  for (const k of Object.keys(g.attributes)) if (k !== "position" && k !== "normal") g.deleteAttribute(k);
  if (m.flatShading) g.deleteAttribute("normal");
  if (!g.attributes.normal) g.computeVertexNormals();
  const n = g.attributes.position.count, col = new Float32Array(n * 3), emi = new Float32Array(n * 3);
  const c = m.color, e = m.emissive, ei = m.emissiveIntensity;
  for (let i = 0; i < n; i++) {
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    emi[i * 3] = e.r * ei; emi[i * 3 + 1] = e.g * ei; emi[i * 3 + 2] = e.b * ei;
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  g.setAttribute("emi", new THREE.BufferAttribute(emi, 3));
  return g;
}
let baked: THREE.MeshLambertMaterial | null = null;
/** The one material of the baked meshes: the vertices' colours, plus their own glow (`emi`: lamps, lit windows). */
export function bakedMaterial() {
  if (baked) return baked;
  baked = new THREE.MeshLambertMaterial({ vertexColors: true });
  baked.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute vec3 emi;\nvarying vec3 vEmi;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvEmi = emi;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vEmi;")
      .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance += vEmi;");
  };
  return baked;
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
  const limit = w * 0.9;
  // The game's sans-serif stack scales these glyphs. Other faces and glyph fallback use the scan.
  const orderedWidths = opts.font == null && !opts.script && !/[^ -~·–—]/.test(text);
  const setSize = (size: number) => { x.font = `800 ${size}px ${family}`; };
  const widest = (rows: string[]) => Math.max(...rows.map((r) => x.measureText(r).width));
  /** The biggest size up to `size` px with which every row is at most 90% of the board wide. */
  const fit = (rows: string[], start: number) => {
    setSize(start);
    let width = widest(rows);
    if (width > limit && start > 10 && orderedWidths && Number.isFinite(width)) {
      let tooWide = 0;
      // The original scan stops here even if this final size still exceeds the limit.
      let candidate = Math.ceil((start - 10) / 2);
      let wider = width;
      let narrower: number | undefined;
      while (candidate - tooWide > 1) {
        const step = tooWide + Math.floor((candidate - tooWide) / 2);
        setSize(start - 2 * step);
        const measured = widest(rows);
        if (!Number.isFinite(measured) || measured > wider || (narrower !== undefined && measured < narrower)) break;
        if (measured > limit) {
          tooWide = step;
          wider = measured;
        } else {
          candidate = step;
          narrower = measured;
        }
      }
      if (candidate - tooWide === 1) {
        const size = start - 2 * candidate;
        setSize(size);
        const measured = narrower ?? widest(rows);
        if (Number.isFinite(measured) && measured <= wider) return { size, width: measured };
      }
      setSize(start);
    }
    let size = start;
    while (width > limit && size > 10) {
      size -= 2;
      setSize(size);
      width = widest(rows);
    }
    return { size, width };
  };
  let rows = [text];
  let { size, width: wide } = fit(rows, h * 0.52);
  // (a dash stays with what follows it, a "·" between two parts is dropped where the line breaks)
  const words = text.split(" ").reduce<string[]>((a, w) => (a.length && /^[–-]$/.test(a[a.length - 1]) ? (a[a.length - 1] += " " + w) : a.push(w), a), []);
  for (let n = 2; n <= Math.min(opts.lines ?? 1, words.length); n++) {
    // every way of cutting the words into n rows (a sign has a handful of words)
    const cuts = (from: number, left: number): number[][] => left === 0 ? [[]] : Array.from({ length: words.length - from - left }, (_, i) => from + 1 + i).flatMap((k) => cuts(k, left - 1).map((r) => [k, ...r]));
    const start = (h * 0.84) / (n * 1.06);
    if (start < size || (start === size && n !== rows.length)) continue;
    for (const cut of cuts(0, n - 1)) {
      const r = [0, ...cut].map((a, i) => words.slice(a, [...cut, words.length][i]).join(" ").replace(/^· | ·$/g, ""));
      // the biggest letters; as big, the evenest lines ("2 for $5" over "Weekly Deals", not "2 for" over the rest)
      const { size: s, width: wd } = fit(r, start);
      if (s > size || (s === size && n === rows.length && wd < wide)) { size = s; rows = r; wide = wd; }
    }
  }
  x.font = `800 ${size}px ${family}`;
  x.textAlign = "center"; x.textBaseline = "middle";
  rows.forEach((r, i) => x.fillText(r, w / 2, h / 2 + (i - (rows.length - 1) / 2) * size * 1.06 + size * 0.04));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  // (its words, for the dev tools: src/dev/signAudit.ts)
  t.name = text;
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

/** `split`: replaced by height-aware pieces for the player. `vault`: the top of a sparse or instanced prop,
 *  supplied by its builder when the height sampler cannot reliably read it. It gives clearance only. */
export interface AABB {
  minX: number; minZ: number; maxX: number; maxZ: number;
  tag?: string; split?: boolean; vault?: number; deckRail?: true;
}
export interface CircleCollider { x: number; z: number; r: number; split?: boolean; vault?: number; npc?: string; tag?: string }

/** 2D (XZ) colliders: axis-aligned boxes and circles. */
export class Colliders {
  boxes: AABB[] = [];
  circles: CircleCollider[] = [];
  addBox(cx: number, cz: number, w: number, d: number, tag?: string) {
    const b: AABB = { minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2, tag };
    this.boxes.push(b);
    return b;
  }
  addCircle(x: number, z: number, r: number, tag?: string) {
    const c: CircleCollider = { x, z, r };
    if (tag !== undefined) c.tag = tag;
    this.circles.push(c);
    return c;
  }
  /** Roofs low and solid enough to stand on (a bus shelter's, a market stall's), as the town lists them: where
   *  ledges.ts reads a roof's own height for someone who can jump up there. No wall to anyone. */
  roofs: { minX: number; minZ: number; maxX: number; maxZ: number }[] = [];
  addRoof(cx: number, cz: number, w: number, d: number) { this.roofs.push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2 }); }
  /** Push a circle of radius r at (x,z) out of all colliders (`jumper`, the player outdoors: but those split into
   *  pieces with a height, which ledges.ts then settles for someone who can jump, and the sea, whose shallows they
   *  wade into: water.ts). `ignoreSea` opens only the sea boxes. */
  resolve(p: THREE.Vector3, r: number, jumper = false, openTownEdge = false, ignoreSea = false) {
    for (let iter = 0; iter < 2; iter++) {
      for (const b of this.boxes) {
        if ((jumper && b.split) || ((jumper || ignoreSea) && b.tag === "sea") || (openTownEdge && b.tag === "town-edge")) continue;
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
  blocked(x: number, z: number, r: number, ignoreSea = false) {
    for (const b of this.boxes) if ((!ignoreSea || b.tag !== "sea") && x > b.minX - r && x < b.maxX + r && z > b.minZ - r && z < b.maxZ + r) return true;
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
