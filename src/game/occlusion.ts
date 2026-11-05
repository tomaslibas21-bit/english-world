// What the follow camera keeps clear of, from the place's own geometry: a grid over the ground (half-metre cells) whose
// cells hold the height range of everything solid built over them (walls, roofs, awnings, a gazebo, a kiosco, a church),
// read from the town's meshes when it is built, so a new building or prop needs no list of boxes. Where something
// stands that one can't walk into (the place's colliders: a building, a gazebo, a stall, a car), its cells are solid
// from the ground up (the meshes give a building's walls and roof, not what is inside), and the camera keeps off the
// top of the tall ones. The line from the player to the camera is walked through it (Game: CameraRig.space): where it
// first meets something, the camera comes in. What is left out: anything wholly below `minTop` (the ground, kerbs,
// benches: the line from the player's chest only rises towards the camera), the instanced props (trees, bushes, palms:
// they fade instead, see fade.ts), whatever moves (clouds, gulls, boats: `skip`), see-through glass, what stands out
// from a wall by a hand's breadth or less (windows, sills: EDGE), and posts and lamps (`minCells`: pieces with a
// footprint that small only hide a sliver of the picture; pulling the camera in for each would make it pump).
import * as THREE from "three";

export interface OcclusionOptions {
  /** The cell's size (m). */
  cell?: number;
  /** Triangles wholly below this height (m) are left out. */
  minTop?: number;
  /** Groups of touching cells with fewer cells than this are left out (posts, lamps, signs). */
  minCells?: number;
  /** Leave this object (and what it holds) out. */
  skip?: (o: THREE.Object3D) => boolean;
}

export interface Bounds { minX: number; maxX: number; minZ: number; maxZ: number }

const EMPTY_LO = Infinity, EMPTY_HI = -Infinity;
/** How much of each side of a cell a triangle may touch without counting (a fraction of the cell). */
const EDGE = 0.3;
/** A roof one walks under (an awning, a stall's, a kiosco's or a bus shelter's) starts below this height (m); a
 *  building's cornice higher up is no roof over the pavement. */
const LOW_ROOF = 4.6;

export class OcclusionField {
  readonly cell: number;
  readonly x0: number;
  readonly z0: number;
  readonly nx: number;
  readonly nz: number;
  /** The lowest and the highest point of what stands over each cell (Infinity / -Infinity: nothing). */
  readonly lo: Float32Array;
  readonly hi: Float32Array;
  /** 1 where something one can't walk into stands (fillFootprints): the camera never stands over it. */
  readonly base: Uint8Array;
  private minTop: number;

  constructor(b: Bounds, opts: OcclusionOptions = {}) {
    this.cell = opts.cell ?? 0.5;
    this.minTop = opts.minTop ?? 1.3;
    this.x0 = b.minX;
    this.z0 = b.minZ;
    this.nx = Math.max(1, Math.ceil((b.maxX - b.minX) / this.cell));
    this.nz = Math.max(1, Math.ceil((b.maxZ - b.minZ) / this.cell));
    this.lo = new Float32Array(this.nx * this.nz).fill(EMPTY_LO);
    this.hi = new Float32Array(this.nx * this.nz).fill(EMPTY_HI);
    this.base = new Uint8Array(this.nx * this.nz);
  }

  /** The field of everything under `root` (its world matrices brought up to date first). */
  static fromObject(root: THREE.Object3D, b: Bounds, opts: OcclusionOptions = {}): OcclusionField {
    const f = new OcclusionField(b, opts);
    root.updateMatrixWorld(true);
    const v = new THREE.Vector3();
    const m = new THREE.Matrix4();
    const walk = (o: THREE.Object3D) => {
      if (opts.skip?.(o)) return;
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh && !(o as THREE.InstancedMesh).isInstancedMesh && !(o as THREE.SkinnedMesh).isSkinnedMesh && solidMaterial(mesh.material)) {
        f.addGeometry(mesh.geometry, m.copy(mesh.matrixWorld), v);
      }
      for (const c of o.children) walk(c);
    };
    walk(root);
    f.dropSmall(opts.minCells ?? 6);
    return f;
  }

  /** Adds every triangle of `g`, placed by `matrix`. */
  addGeometry(g: THREE.BufferGeometry, matrix: THREE.Matrix4, v = new THREE.Vector3()) {
    const pos = g.attributes.position as THREE.BufferAttribute | undefined;
    if (!pos) return;
    const idx = g.index;
    const n = idx ? idx.count : pos.count;
    const p = new Float32Array(9);
    for (let i = 0; i + 2 < n; i += 3) {
      for (let k = 0; k < 3; k++) {
        const j = idx ? idx.getX(i + k) : i + k;
        v.fromBufferAttribute(pos, j).applyMatrix4(matrix);
        p[k * 3] = v.x; p[k * 3 + 1] = v.y; p[k * 3 + 2] = v.z;
      }
      this.addTriangle(p[0], p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8]);
    }
  }

  addTriangle(ax: number, ay: number, az: number, bx: number, by: number, bz: number, cx: number, cy: number, cz: number) {
    const yMax = Math.max(ay, by, cy);
    if (yMax < this.minTop) return;
    const yMin = Math.min(ay, by, cy);
    const c = this.cell;
    // (a cell counts when the triangle reaches into its middle, not when it only touches its edge: a wall on the line
    // between two cells, and what stands out from it by a hand's breadth or less (windows, sills, frames), belong to
    // the building's own cells (fillFootprints), not to the pavement in front of it, where the player walks)
    const e = EDGE;
    const i0 = Math.max(0, Math.floor((Math.min(ax, bx, cx) - this.x0) / c - (1 - e)) + 1);
    const i1 = Math.min(this.nx - 1, Math.floor((Math.max(ax, bx, cx) - this.x0) / c - e));
    const k0 = Math.max(0, Math.floor((Math.min(az, bz, cz) - this.z0) / c - (1 - e)) + 1);
    const k1 = Math.min(this.nz - 1, Math.floor((Math.max(az, bz, cz) - this.z0) / c - e));
    if (i0 > i1 || k0 > k1) return;
    // the plane's height over the ground (for a slope: a roof, a hill), unless the triangle stands upright (a wall)
    const ux = bx - ax, uy = by - ay, uz = bz - az, wx = cx - ax, wy = cy - ay, wz = cz - az;
    const nX = uy * wz - uz * wy, nY = uz * wx - ux * wz, nZ = ux * wy - uy * wx;
    const nl = Math.hypot(nX, nY, nZ) || 1;
    const sloped = Math.abs(nY) / nl > 0.15;
    const yAt = (x: number, z: number) => ay - (nX * (x - ax) + nZ * (z - az)) / nY;
    for (let k = k0; k <= k1; k++) {
      const z0 = this.z0 + k * c, z1 = z0 + c;
      for (let i = i0; i <= i1; i++) {
        const x0 = this.x0 + i * c, x1 = x0 + c;
        if (!triOverlapsRect(ax, az, bx, bz, cx, cz, x0 + e * c, z0 + e * c, x1 - e * c, z1 - e * c)) continue;
        let lo = yMin, hi = yMax;
        if (sloped) {
          const a = yAt(x0, z0), b = yAt(x1, z0), d = yAt(x0, z1), e = yAt(x1, z1);
          lo = Math.max(yMin, Math.min(a, b, d, e));
          hi = Math.min(yMax, Math.max(a, b, d, e));
          if (lo > hi) { lo = yMin; hi = yMax; }
        }
        if (hi < this.minTop) continue;
        const j = k * this.nx + i;
        if (lo < this.lo[j]) this.lo[j] = lo;
        if (hi > this.hi[j]) this.hi[j] = hi;
      }
    }
  }

  /** Solid from the ground up wherever something stands that one can't walk into (the place's colliders: a building's
   *  footprint, a gazebo's, a stall's, a car's) and which the geometry mostly covers from above: the meshes give a
   *  building's walls and roof but not what is inside them, and the camera must not get in there either. (Where one
   *  can walk under a roof, a kiosco's or a shelter's, nothing is filled.) */
  fillFootprints(boxes: { minX: number; maxX: number; minZ: number; maxZ: number }[], circles: { x: number; z: number; r: number }[]) {
    const c = this.cell;
    const fill = (i0: number, i1: number, k0: number, k1: number, inside: (x: number, z: number) => boolean) => {
      i0 = Math.max(0, i0); k0 = Math.max(0, k0); i1 = Math.min(this.nx - 1, i1); k1 = Math.min(this.nz - 1, k1);
      const cells: number[] = [];
      let total = 0;
      for (let k = k0; k <= k1; k++) for (let i = i0; i <= i1; i++) {
        if (!inside(this.x0 + (i + 0.5) * c, this.z0 + (k + 0.5) * c)) continue;
        total++;
        const j = k * this.nx + i;
        if (this.hi[j] !== EMPTY_HI) cells.push(j);
      }
      if (!total || cells.length < total * 0.3) return;
      // (the camera keeps off the top of what is taller than a person by far: a building, a gazebo; a car or a stall's
      // awning below it is no matter)
      let top = -Infinity;
      for (const j of cells) top = Math.max(top, this.hi[j]);
      for (const j of cells) { this.lo[j] = Math.min(this.lo[j], 0); if (top >= 3.5) this.base[j] = 1; }
    };
    for (const b of boxes) {
      fill(Math.floor((b.minX - this.x0) / c), Math.floor((b.maxX - this.x0) / c), Math.floor((b.minZ - this.z0) / c), Math.floor((b.maxZ - this.z0) / c),
        (x, z) => x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ);
    }
    for (const o of circles) {
      fill(Math.floor((o.x - o.r - this.x0) / c), Math.floor((o.x + o.r - this.x0) / c), Math.floor((o.z - o.r - this.z0) / c), Math.floor((o.z + o.r - this.z0) / c),
        (x, z) => (x - o.x) ** 2 + (z - o.z) ** 2 <= o.r * o.r);
    }
  }

  /** Clears groups of touching cells (side by side) smaller than `minCells`: posts, lamps, signs. */
  dropSmall(minCells: number) {
    if (minCells <= 1) return;
    const { nx, nz, hi, lo } = this;
    const seen = new Uint8Array(nx * nz);
    const stack: number[] = [], group: number[] = [];
    for (let s = 0; s < nx * nz; s++) {
      if (seen[s] || hi[s] === EMPTY_HI) continue;
      stack.length = 0; group.length = 0;
      stack.push(s); seen[s] = 1;
      while (stack.length) {
        const j = stack.pop()!;
        group.push(j);
        const i = j % nx, k = (j - i) / nx;
        const next = [i > 0 ? j - 1 : -1, i < nx - 1 ? j + 1 : -1, k > 0 ? j - nx : -1, k < nz - 1 ? j + nx : -1];
        for (const q of next) if (q >= 0 && !seen[q] && hi[q] !== EMPTY_HI) { seen[q] = 1; stack.push(q); }
      }
      if (group.length < minCells) for (const j of group) { lo[j] = EMPTY_LO; hi[j] = EMPTY_HI; }
    }
  }

  /** Is (x, z) over something one can't walk into (a building, a gazebo, a stall, a car)? */
  overSolid(x: number, z: number) {
    const j = this.index(x, z);
    return j >= 0 && this.base[j] === 1;
  }

  /** Is the point inside something solid (within `pad` m below or above it)? */
  solidAt(x: number, y: number, z: number, pad = 0) {
    const j = this.index(x, z);
    return j >= 0 && y >= this.lo[j] - pad && y <= this.hi[j] + pad;
  }

  /** How far (0–1) along the line from `a` to `b` one gets before something solid: 1 when nothing is in the way.
   *  The first `skipNear` m around `a` (on the ground), up to the top of the player's head, don't count: the player
   *  stands there, a wall may share its cell.
   *  Nor does the line go in under a low roof the player isn't under themselves (an awning, a stall's, a kiosco's: up to
   *  3.2 m above the line and below LOW_ROOF). `pad`: how close below a surface counts as touching it (m); above it, from `padAbove` near `a` to
   *  `farAbove` at `b` (the camera's end: a roof passed just under the camera would fill the picture); `back`: how far
   *  before the first touch to stop (m). */
  free(a: THREE.Vector3, b: THREE.Vector3, skipNear = 0.6, pad = 0.3, back = 0.35, padAbove = 0.2, farAbove = 1.4): number {
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
    const len = Math.hypot(dx, dy, dz);
    if (len < 1e-6) return 1;
    const flat = Math.hypot(dx, dz);
    const under = this.under(a);
    const n = Math.ceil(len / (this.cell * 0.5));
    for (let s = 1; s <= n; s++) {
      const t = s / n;
      const y = a.y + dy * t;
      if (flat * t < skipNear && y < a.y + 0.9) continue;
      const j = this.index(a.x + dx * t, a.z + dz * t);
      if (j < 0) continue;
      const lo = this.lo[j], hi = this.hi[j];
      if ((y >= lo - pad && y <= hi + padAbove + (farAbove - padAbove) * t) || (!under && lo > y && lo < Math.min(y + 3.2, LOW_ROOF))) return Math.max(0, t - back / len);
    }
    return 1;
  }

  /** Is there a low roof (an awning, a kiosco's, a shelter's) over the point, up to 3.2 m above it, in its cell or a
   *  cell beside it (a wall's cell may be the point's own when it stands close to it)? */
  under(a: THREE.Vector3) {
    const c = this.cell;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      const j = this.index(a.x + dx * c, a.z + dz * c);
      if (j >= 0 && this.lo[j] > a.y && this.lo[j] < Math.min(a.y + 3.2, LOW_ROOF)) return true;
    }
    return false;
  }

  /** The cell under (x, z), or -1 off the field. */
  index(x: number, z: number) {
    const i = Math.floor((x - this.x0) / this.cell), k = Math.floor((z - this.z0) / this.cell);
    return i < 0 || k < 0 || i >= this.nx || k >= this.nz ? -1 : k * this.nx + i;
  }

  /** How many cells hold something (for the tests and the notes). */
  get filled() { let n = 0; for (let j = 0; j < this.hi.length; j++) if (this.hi[j] !== EMPTY_HI) n++; return n; }
}

/** Glass and other see-through surfaces don't count. */
function solidMaterial(m: THREE.Material | THREE.Material[]) {
  const ms = Array.isArray(m) ? m : [m];
  return ms.some((x) => x && x.visible !== false && !(x.transparent && x.opacity < 0.6));
}

/** Does the triangle (its ground plan) overlap the rectangle? (Separating axes: the rectangle's two, the triangle's
 *  three edges' normals; a triangle seen edge-on, a wall, is a line and works the same.) */
export function triOverlapsRect(ax: number, az: number, bx: number, bz: number, cx: number, cz: number, x0: number, z0: number, x1: number, z1: number) {
  const e = 1e-6;
  if (Math.max(ax, bx, cx) < x0 - e || Math.min(ax, bx, cx) > x1 + e) return false;
  if (Math.max(az, bz, cz) < z0 - e || Math.min(az, bz, cz) > z1 + e) return false;
  const pts = [ax, az, bx, bz, cx, cz];
  for (let k = 0; k < 3; k++) {
    const px = pts[k * 2], pz = pts[k * 2 + 1], qx = pts[((k + 1) % 3) * 2], qz = pts[((k + 1) % 3) * 2 + 1];
    // the edge's normal
    const nx = -(qz - pz), nz = qx - px;
    if (Math.abs(nx) < 1e-9 && Math.abs(nz) < 1e-9) continue;
    let tMin = Infinity, tMax = -Infinity;
    for (let j = 0; j < 3; j++) { const t = pts[j * 2] * nx + pts[j * 2 + 1] * nz; tMin = Math.min(tMin, t); tMax = Math.max(tMax, t); }
    const r = [x0 * nx + z0 * nz, x1 * nx + z0 * nz, x0 * nx + z1 * nz, x1 * nx + z1 * nz];
    if (Math.max(...r) < tMin - e || Math.min(...r) > tMax + e) return false;
  }
  return true;
}
