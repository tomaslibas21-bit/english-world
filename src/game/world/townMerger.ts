import * as THREE from "three";
import { Merger, colourMerge, colourPart } from "./util";
import type { Part } from "./mexican";

/** This edition's town (theme.ts `townMerge`): every plain coloured shape (an opaque Lambert colour with no texture, no
 *  glow, no shader of its own, no polygon offset) goes into a vertex-coloured mesh for its square of the town (`cell`
 *  metres a side, by its middle), one that casts shadows and one that doesn't, instead of a mesh per colour spread over
 *  the whole town: the same look (a flat-shaded colour keeps its facets) in a few draw calls for what is in view, and
 *  no triangles for the squares out of it. The rest (glass, lamps, signs, textured walls) is merged per material as
 *  before. */
/** What a square's mesh holds: shapes that cast shadows, ones that don't, the overhead lines (thin: the walking camera
 *  looks through them, no shadow) and roofs it looks through that do cast one (the gas station's canopy). */
type Kind = "cast" | "still" | "thin" | "thinCast";
type IndexedPart = {
  indices: Uint16Array | Uint32Array;
  positions: Float32Array;
  normals?: Float32Array;
  normalFirst: boolean;
  centerX: number;
  centerZ: number;
  color: THREE.Color;
};
type CellPart = IndexedPart | { geo: THREE.BufferGeometry; color: THREE.Color };
export class TownMerger extends Merger {
  private cells = new Map<string, Record<Kind, CellPart[]>>();
  private box = new THREE.Box3();
  private c = new THREE.Vector3();
  constructor(private cell: number) { super(); }
  /** Each key as Merger has it: its first shape's shadow stands for every shape added under it, and each shape keeps
   *  its own material's colour (a plain one baked into the squares' meshes, another in Merger's own mesh). */
  private keys = new Map<string, { cast: boolean; receive: boolean; mats: Map<THREE.Material, { plain: boolean; color: THREE.Color; flat: boolean }> }>();
  add(key: string, m: THREE.Material, geo: THREE.BufferGeometry, cast = true, receive = true) {
    let k = this.keys.get(key);
    if (!k) { k = { cast, receive, mats: new Map() }; this.keys.set(key, k); }
    let e = k.mats.get(m);
    if (!e) {
      const l = m as THREE.MeshLambertMaterial;
      const plain = !!l.isMeshLambertMaterial && !l.map && !l.transparent && !l.vertexColors && l.side === THREE.FrontSide && l.emissive.getHex() === 0 && k.receive
        && !l.polygonOffset && l.depthWrite && !Object.prototype.hasOwnProperty.call(l, "onBeforeCompile");
      e = { plain, color: plain ? l.color.clone() : new THREE.Color(), flat: plain && l.flatShading };
      k.mats.set(m, e);
    }
    if (!e.plain) return super.add(key, m, geo, k.cast, k.receive);
    // Keep the hotel's canopy and posts, the drop-off's posts and the taxi sign pole in camera-thin meshes.
    this.put(geo, e.color, e.flat, /^hotel-canopy|^dropoff-post$|^taxi-sign-pole$/.test(key) ? "thinCast" : k.cast ? "cast" : "still");
  }
  /** The edition's flat-shaded vertex-coloured pieces, including the wires and roofs the camera looks through. */
  addParts(parts: Part[], kind: Kind) {
    for (const [geo, col] of parts) this.put(geo, new THREE.Color(col), true, kind);
  }
  private put(geo: THREE.BufferGeometry, color: THREE.Color, flat: boolean, kind: Kind) {
    const indexed = snapshotIndexed(geo, color, flat);
    let part: CellPart, x: number, z: number;
    if (indexed) {
      part = indexed;
      x = indexed.centerX;
      z = indexed.centerZ;
    } else {
      const g = geo.index ? geo.toNonIndexed() : geo;
      if (flat) g.deleteAttribute("normal");
      if (!g.attributes.normal) g.computeVertexNormals();
      this.box.setFromBufferAttribute(g.attributes.position as THREE.BufferAttribute).getCenter(this.c);
      part = { geo: g, color };
      x = this.c.x;
      z = this.c.z;
    }
    const k = Math.floor(x / this.cell) + "," + Math.floor(z / this.cell);
    const e = this.cells.get(k) ?? this.cells.set(k, { cast: [], still: [], thin: [], thinCast: [] }).get(k)!;
    e[kind].push(part);
  }
  build(parent: THREE.Object3D) {
    super.build(parent);
    const mat = (townMat ??= new THREE.MeshLambertMaterial({ vertexColors: true }));
    for (const [k, e] of this.cells) for (const kind of ["cast", "still", "thin", "thinCast"] as const) {
      if (!e[kind].length) continue;
      const mesh = new THREE.Mesh(packCell(e[kind]), mat);
      mesh.castShadow = kind === "cast" || kind === "thinCast";
      if (kind === "thin" || kind === "thinCast") mesh.userData.thin = true;
      mesh.receiveShadow = true;
      mesh.name = "town-" + kind + "-" + k;
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      parent.add(mesh);
    }
    this.cells.clear();
    this.keys.clear();
  }
}
let townMat: THREE.MeshLambertMaterial | null = null;

type Attribute = THREE.BufferGeometry["attributes"][string] | undefined;

function packedFloats(attr: Attribute, itemSize: number): Float32Array | undefined {
  if (attr instanceof THREE.BufferAttribute && attr.array.constructor === Float32Array
    && attr.array.buffer instanceof ArrayBuffer && attr.itemSize === itemSize && !attr.normalized
    && attr.gpuType === THREE.FloatType && attr.count * itemSize === attr.array.length) {
    return attr.array as Float32Array;
  }
}

function standardGeometry(geo: THREE.BufferGeometry) {
  return !geo.morphTargetsRelative && Object.keys(geo.morphAttributes).length === 0;
}

function normalComesFirst(geo: THREE.BufferGeometry) {
  const keys = Object.keys(geo.attributes);
  return keys.indexOf("normal") < keys.indexOf("position");
}

/** The old indexed path captured an expanded copy at add time. Keep that snapshot in its compact layout. */
function snapshotIndexed(geo: THREE.BufferGeometry, color: THREE.Color, flat: boolean): IndexedPart | undefined {
  const index = geo.index;
  if (!index || geo.toNonIndexed !== THREE.BufferGeometry.prototype.toNonIndexed || !standardGeometry(geo)) return;
  const indices = index.array;
  if ((indices.constructor !== Uint16Array && indices.constructor !== Uint32Array)
    || !(indices.buffer instanceof ArrayBuffer) || index.itemSize !== 1 || index.normalized
    || index.count !== indices.length || indices.length % 3 !== 0) return;
  const { position, normal, uv } = geo.attributes;
  const positions = packedFloats(position, 3), normals = packedFloats(normal, 3);
  if (!positions || (normal && normals?.length !== positions.length)
    || (uv && packedFloats(uv, 2)?.length !== position.count * 2)
    || Object.keys(geo.attributes).length !== 1 + Number(!!normal) + Number(!!uv)) return;

  let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
  for (let i = 0; i < indices.length; i++) {
    const offset = indices[i] * 3;
    const x = positions[offset], y = positions[offset + 1], z = positions[offset + 2];
    // Also rejects out-of-range indices. Larger coordinates can overflow Three's Float32 face normals.
    if (!(Math.max(Math.abs(x), Math.abs(y), Math.abs(z)) <= 1e18)) return;
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
  }
  return {
    indices: indices.slice(), positions: positions.slice(), normals: flat ? undefined : normals?.slice(),
    normalFirst: !flat && !!normals && normalComesFirst(geo), color,
    centerX: indices.length ? (minX + maxX) * 0.5 : 0, centerZ: indices.length ? (minZ + maxZ) * 0.5 : 0,
  };
}

/** Retain Three's compatibility checks for a cell containing an unusual layout. */
function legacyCell(parts: CellPart[]) {
  return colourMerge(parts.map(part => {
    if ("geo" in part) return [part.geo, part.color];
    const geo = new THREE.BufferGeometry();
    const positions = new THREE.BufferAttribute(part.positions, 3);
    const normals = part.normals && new THREE.BufferAttribute(part.normals, 3);
    if (normals && part.normalFirst) geo.setAttribute("normal", normals);
    geo.setAttribute("position", positions);
    if (normals && !part.normalFirst) geo.setAttribute("normal", normals);
    return [geo.setIndex(new THREE.BufferAttribute(part.indices, 1)), part.color];
  }));
}

function packCell(parts: CellPart[]) {
  let size = 0;
  for (const part of parts) {
    if ("geo" in part) {
      const { geo } = part, { position, normal } = geo.attributes;
      const positions = packedFloats(position, 3);
      if (geo.index || !standardGeometry(geo) || !positions || packedFloats(normal, 3)?.length !== positions.length
        || geo.setAttribute !== THREE.BufferGeometry.prototype.setAttribute
        || geo.deleteAttribute !== THREE.BufferGeometry.prototype.deleteAttribute) return legacyCell(parts);
      size += positions.length;
    } else {
      size += part.indices.length * 3;
    }
  }

  // Borrowed unindexed geometries are still changed and disposed by the merge. Preparing all of them first also retains
  // the last tint when the same geometry appears twice in a cell.
  const c = new THREE.Color();
  for (const part of parts) if ("geo" in part) colourPart(part.geo, part.color, c);

  const positions = new Float32Array(size), normals = new Float32Array(size), colours = new Float32Array(size);
  let offset = 0;
  for (const part of parts) {
    if ("geo" in part) {
      const { position, normal, color } = part.geo.attributes;
      positions.set(position.array, offset);
      normals.set(normal.array, offset);
      colours.set(color.array, offset);
      offset += position.array.length;
    } else {
      offset = writeIndexedPart(part, positions, normals, colours, offset);
    }
  }

  const first = parts[0];
  const normalFirst = "geo" in first ? normalComesFirst(first.geo) : first.normalFirst;
  const result = new THREE.BufferGeometry(), normal = new THREE.BufferAttribute(normals, 3);
  if (normalFirst) result.setAttribute("normal", normal);
  result.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  if (!normalFirst) result.setAttribute("normal", normal);
  result.setAttribute("color", new THREE.BufferAttribute(colours, 3));
  for (const part of parts) if ("geo" in part) part.geo.dispose();
  return result;
}

function writeIndexedPart(part: IndexedPart, positions: Float32Array, normals: Float32Array, colours: Float32Array, start: number) {
  const { indices, positions: source, normals: smooth, color: { r, g, b } } = part;
  let offset = start;
  for (let i = 0; i < indices.length; i++, offset += 3) {
    const at = indices[i] * 3;
    positions[offset] = source[at];
    positions[offset + 1] = source[at + 1];
    positions[offset + 2] = source[at + 2];
    if (smooth) {
      normals[offset] = smooth[at];
      normals[offset + 1] = smooth[at + 1];
      normals[offset + 2] = smooth[at + 2];
    }
    colours[offset] = r;
    colours[offset + 1] = g;
    colours[offset + 2] = b;
  }
  if (!smooth) writeFaceNormals(positions, normals, start, offset);
  return offset;
}

function writeFaceNormals(positions: Float32Array, normals: Float32Array, start: number, end: number) {
  for (let i = start; i < end; i += 9) {
    const ax = positions[i] - positions[i + 3], ay = positions[i + 1] - positions[i + 4], az = positions[i + 2] - positions[i + 5];
    const bx = positions[i + 6] - positions[i + 3], by = positions[i + 7] - positions[i + 4], bz = positions[i + 8] - positions[i + 5];
    // Three rounds the cross product in the normal attribute before normalizing it.
    const x = Math.fround(by * az - bz * ay), y = Math.fround(bz * ax - bx * az), z = Math.fround(bx * ay - by * ax);
    const invLength = 1 / (Math.sqrt(x * x + y * y + z * z) || 1);
    normals[i] = normals[i + 3] = normals[i + 6] = x * invLength;
    normals[i + 1] = normals[i + 4] = normals[i + 7] = y * invLength;
    normals[i + 2] = normals[i + 5] = normals[i + 8] = z * invLength;
  }
}
