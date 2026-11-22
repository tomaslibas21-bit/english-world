import * as THREE from "three";

export const MAX_DENTS = 5;
export const MAX_DEPTH = 0.22;
const MAX_VERTICES = 8000;

export type CrashSide = "front" | "back" | "left" | "right";
export type Dent = {
  x: number; y: number; z: number;
  nx: number; nz: number;
  side: CrashSide; k: number; depth: number; scrape?: number;
};

export const crashSeverity = (into: number) => THREE.MathUtils.clamp((into - 2) / 10, 0, 1);

/** The normal points into the car. +X in the car's frame is the driver's left. */
export function crashSide(nx: number, nz: number, heading = 0): CrashSide {
  const c = Math.cos(heading), s = Math.sin(heading);
  const x = nx * c - nz * s, z = nx * s + nz * c;
  return Math.abs(z) >= Math.abs(x) ? (z < 0 ? "front" : "back") : (x < 0 ? "left" : "right");
}

const isSideDent = ({ side }: Pick<Dent, "side">) => side === "left" || side === "right";
const doorRadius = (k: number) => 0.29 + 0.44 * k;

export function addDent(dents: Dent[], dent: Omit<Dent, "depth">) {
  if (dents.length >= MAX_DENTS) dents.shift();
  const depth = (isSideDent(dent) ? 0.14 : 0.18) * dent.k ** 0.72;
  let total = depth;
  for (const old of dents) total += old.depth;
  if (total > MAX_DEPTH) {
    const keep = (MAX_DEPTH - depth) / (total - depth);
    for (const old of dents) old.depth *= keep;
  }
  dents.push({ ...dent, depth });
}

export function dentFalloff(dent: Dent, x: number, y: number, z: number) {
  const dx = x - dent.x, dz = z - dent.z;
  if (isSideDent(dent)) {
    // The collision box reaches the mirrors and fenders. The door face usually sits farther in.
    const inset = Math.max(0, Math.abs(dx) - 0.18);
    const radiusSq = (inset / 0.42) ** 2 + (dz / doorRadius(dent.k)) ** 2 + ((y - dent.y) / 0.40) ** 2;
    const bowl = Math.max(0, 1 - radiusSq);
    return bowl * bowl * (3 - 2 * bowl);
  }
  const across = (dx * dent.nz - dz * dent.nx) / (0.22 + 0.27 * dent.k);
  const along = (dx * dent.nx + dz * dent.nz) / (0.25 + 0.19 * dent.k);
  const height = (y - dent.y) / (0.26 + 0.22 * dent.k);
  const r = Math.max(0, 1 - across ** 2 - along ** 2 - height ** 2);
  return r * r;
}

/** Count the vertices as they will appear in a colourMerge (which flattens indexed parts). */
export function mergedVertexCount(parts: readonly [THREE.BufferGeometry, THREE.ColorRepresentation][]) {
  return parts.reduce((n, [g]) => n + (g.index?.count ?? g.getAttribute("position").count), 0);
}

type WheelRange = [number, number] | undefined;
type CarMesh = THREE.Mesh<THREE.BufferGeometry, THREE.Material>;
type Lamp = {
  x: number; y: number; z: number; minX: number; maxX: number; minY: number; maxY: number;
  count: number; cracked: boolean;
};

const wheelAt = (range: WheelRange, i: number) => !!range && i >= range[0] && i < range[1];
type DentRegion = {
  x: number; y: number; z: number; side: boolean;
  x0: number; x1: number; y0: number; y1: number; z0: number; z1: number;
};

function dentRegion(dent: Dent): DentRegion {
  const { x, y, z } = dent, side = isSideDent(dent);
  // Leave room for a follow-up hit close to this one and split only the struck side of the car.
  const width = side ? 0.64 : 0.58, length = side ? doorRadius(1) + 0.14 : 0.58;
  return { x, y, z, side, x0: x - width, x1: x + width, y0: y - 0.49, y1: y + 0.49, z0: z - length, z1: z + length };
}

function nearDent(regions: readonly DentRegion[], minX: number, maxX: number, minY: number, maxY: number, minZ: number, maxZ: number) {
  for (const { x0, x1, y0, y1, z0, z1 } of regions) {
    if (minZ <= z1 && maxZ >= z0 && minX <= x1 && maxX >= x0 && minY <= y1 && maxY >= y0) return true;
  }
  return false;
}

/** Every copy of an edge is split by the same position test, even across flat normals and UV seams. */
function splitEdges(
  local: number[], index: ArrayLike<number>, regions: readonly DentRegion[],
  parents: number[], minLength: number,
) {
  const count = local.length / 3;
  if (!regions.length || count >= MAX_VERTICES) return index;
  const middle = new Map<number, number>();
  const result: number[] = [];
  const threshold = minLength * minLength;
  let lowZ = Infinity, highZ = -Infinity, lowX = Infinity, highX = -Infinity;
  for (const { x0, x1, z0, z1 } of regions) {
    lowX = Math.min(lowX, x0); highX = Math.max(highX, x1);
    lowZ = Math.min(lowZ, z0); highZ = Math.max(highZ, z1);
  }
  const midpoint = (a: number, b: number) => {
    const j = a * 3, k = b * 3;
    const ax = local[j], ay = local[j + 1], az = local[j + 2], bx = local[k], by = local[k + 1], bz = local[k + 2];
    const lengthSq = (ax - bx) ** 2 + (ay - by) ** 2 + (az - bz) ** 2;
    if (lengthSq < threshold || !nearDent(regions, Math.min(ax, bx), Math.max(ax, bx),
      Math.min(ay, by), Math.max(ay, by), Math.min(az, bz), Math.max(az, bz))) return -1;
    const key = Math.min(a, b) * count + Math.max(a, b);
    const existing = middle.get(key);
    if (existing !== undefined) return existing;
    const next = local.length / 3;
    middle.set(key, next);
    parents.push(a, b);
    local.push((ax + bx) * 0.5, (ay + by) * 0.5, (az + bz) * 0.5);
    return next;
  };
  for (let i = 0; i < index.length; i += 3) {
    let a = index[i], b = index[i + 1], c = index[i + 2];
    const ax = local[a * 3], bx = local[b * 3], cx = local[c * 3];
    const az = local[a * 3 + 2], bz = local[b * 3 + 2], cz = local[c * 3 + 2];
    if ((az < lowZ && bz < lowZ && cz < lowZ) || (az > highZ && bz > highZ && cz > highZ)
      || (ax < lowX && bx < lowX && cx < lowX) || (ax > highX && bx > highX && cx > highX)) {
      result.push(a, b, c);
      continue;
    }
    let ab = midpoint(a, b), bc = midpoint(b, c), ca = midpoint(c, a);
    const splits = Number(ab >= 0) + Number(bc >= 0) + Number(ca >= 0);
    if (!splits) result.push(a, b, c);
    else if (splits === 3) result.push(a, ab, ca, ab, b, bc, ca, bc, c, ab, bc, ca);
    else {
      while (ab < 0 || (splits === 2 && bc < 0)) {
        const first = a, firstMid = ab;
        a = b; b = c; c = first;
        ab = bc; bc = ca; ca = firstMid;
      }
      if (splits === 1) result.push(a, ab, c, ab, b, c);
      else result.push(a, ab, c, ab, bc, c, ab, b, bc);
    }
  }
  if (local.length / 3 > MAX_VERTICES) {
    // Keep the earlier pass intact if this entire set of matching splits cannot fit.
    parents.length -= (local.length / 3 - count) * 2;
    local.length = count * 3;
    return index;
  }
  return result;
}

const warmScuff = new THREE.Color("#c9c3bb");
const cracked = new THREE.Color("#4a4f57");

/** Paint over the rendered palette, so the same scuff can lighten a dark bumper or dull a bright panel. */
const crashPaint = `
  if (vCrashRest.w >= -0.01 && crashFade > 0.0) {
    float wear = 0.0;
    float hollow = 0.0;
    for (int i = 0; i < ${MAX_DENTS}; ++i) {
      if (i >= crashHitCount) break;
      vec4 hit = crashHits[i];
      vec3 delta = vCrashRest.xyz - hit.xyz;
      if (dot(delta, delta) > 0.88) continue;
      vec3 plane = crashPlanes[i];
      float along = dot(delta.xz, vec2(plane.y, -plane.x));
      float inward = dot(delta.xz, plane.xy);
      // Striations run along the contact face. Their ends break up where the paint tears.
      float streak = sin(delta.y * 91.0 + along * 8.0 + sin(along * 23.0) * 0.85);
      float nick = sin(delta.y * 51.0 + along * 34.0);
      float run = (along - plane.z * 0.11) / (0.24 + 0.55 * hit.w);
      float width = (delta.y + along * 0.08) / (0.12 + 0.22 * hit.w);
      float thickness = inward / (0.27 + 0.22 * hit.w);
      float scuffPatch = run * run + width * width + thickness * thickness;
      float roughEdge = 1.0 - smoothstep(0.38, 1.04, scuffPatch + streak * 0.14 + nick * 0.07);
      float strength = mix(0.06, 0.60, smoothstep(0.13, 0.33, hit.w));
      wear = max(wear, roughEdge * strength * (0.77 + 0.23 * smoothstep(-0.6, 0.9, streak)));
      hollow = max(hollow, (1.0 - smoothstep(0.0, 0.70, scuffPatch)) * hit.w);
    }
    // (on light paint the scrape shows darker, on dark or bright paint a pale grey)
    float paintLight = smoothstep(0.5, 0.78, dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114)));
    vec3 scuffTone = mix(crashScuff, crashScuff * vec3(0.6, 0.58, 0.55), paintLight);
    diffuseColor.rgb = mix(diffuseColor.rgb, scuffTone * (1.0 - 0.26 * hollow), wear * crashFade);
    diffuseColor.rgb *= 1.0 - 0.16 * hollow * crashFade;
    if (vCrashRest.w > 0.99) {
      int lamp = int(floor(vCrashRest.w + 0.01)) - 1;
      if (crashBroken[lamp] > 0.0) {
        vec4 lens = crashLenses[lamp];
        vec2 local = (vCrashRest.xy - lens.xy) / lens.zw;
        float fracture = local.x - local.y * 0.42 + 0.08 * sin(local.y * 11.0);
        float seam = 1.0 - smoothstep(0.018, 0.075, abs(fracture));
        vec3 glass = mix(crashGlass * (0.65 + 0.35 * step(0.0, fracture)), crashScuff * 0.68, seam);
        diffuseColor.rgb = mix(diffuseColor.rgb, glass, crashFade);
      }
    }
  }`;

function crashPaintUniforms() {
  return {
    hitCount: { value: 0 },
    centers: { value: Array.from({ length: MAX_DENTS }, () => new THREE.Vector4()) },
    planes: { value: Array.from({ length: MAX_DENTS }, () => new THREE.Vector3()) },
    broken: { value: new Float32Array(4) },
    lenses: { value: Array.from({ length: 4 }, () => new THREE.Vector4()) },
    fade: { value: 1 },
  };
}

function createCrashMaterial(source: THREE.Material, paint: ReturnType<typeof crashPaintUniforms>) {
  const material = source.clone();
  material.customProgramCacheKey = () => `crash:${source.customProgramCacheKey()}`;
  material.onBeforeCompile = (shader, renderer) => {
    source.onBeforeCompile(shader, renderer);
    Object.assign(shader.uniforms, {
      crashHits: paint.centers, crashPlanes: paint.planes, crashHitCount: paint.hitCount, crashBroken: paint.broken,
      crashLenses: paint.lenses, crashFade: paint.fade, crashScuff: { value: warmScuff }, crashGlass: { value: cracked },
    });
    shader.vertexShader = `attribute vec4 crashRest; varying vec4 vCrashRest;\n${shader.vertexShader}`
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvCrashRest = crashRest;");
    shader.fragmentShader = `
      varying vec4 vCrashRest;
      uniform vec4 crashHits[${MAX_DENTS}], crashLenses[4];
      uniform vec3 crashPlanes[${MAX_DENTS}], crashScuff, crashGlass;
      uniform int crashHitCount;
      uniform float crashBroken[4], crashFade;
      ${shader.fragmentShader}`.replace("#include <color_fragment>", `#include <color_fragment>\n${crashPaint}`);
  };
  return material;
}

/** Owns the geometry and paint for one damaged car. Each damage pass reads from the original geometry. */
export class CrashGeometry {
  readonly original: THREE.BufferGeometry;
  readonly geometry = new THREE.BufferGeometry();
  readonly lamps: Lamp[] = Array.from({ length: 4 }, () => ({
    x: 0, y: 0, z: 0, minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, count: 0, cracked: false,
  }));
  readonly bounds = new THREE.Box3();
  hanging = false;
  hoodHeight = 0.8;
  private readonly wheels: WheelRange;
  private readonly bodyIndex: ArrayLike<number>;
  private readonly local: number[];
  private readonly inMesh: THREE.Matrix4;
  private readonly transformed: boolean;
  private readonly basePosition: Float32Array;
  private readonly baseNormal: Float32Array;
  private readonly damagedPosition: Float32Array;
  private readonly damagedNormal: Float32Array;
  private readonly moved: Uint8Array;
  private readonly changedNormals: Uint8Array;
  private readonly point = new THREE.Vector3();
  private readonly outline?: CarMesh;
  readonly originalMaterial: THREE.Material;
  private readonly material: THREE.Material;
  private readonly paint = crashPaintUniforms();
  private readonly refined: DentRegion[];

  constructor(readonly mesh: CarMesh, root: THREE.Object3D, dents: readonly Dent[]) {
    this.original = mesh.geometry;
    this.originalMaterial = mesh.material;
    this.refined = dents.map(dentRegion);
    const inCar = new THREE.Matrix4();
    for (let child: THREE.Object3D | null = mesh; child && child !== root; child = child.parent) {
      if (child.matrixAutoUpdate) child.updateMatrix();
      inCar.premultiply(child.matrix);
    }
    this.transformed = !inCar.equals(new THREE.Matrix4());
    this.inMesh = inCar.clone().invert();
    const originalPosition = this.original.getAttribute("position");
    const count = originalPosition.count;
    this.wheels = this.original.userData.crashWheels as WheelRange;
    const local = this.local = Array.from(originalPosition.array);
    const point = this.point;
    const wheelStart = this.wheels?.[0] ?? count, wheelEnd = this.wheels?.[1] ?? count;
    for (let i = 0, j = 0; i < count; i++, j += 3) {
      if (i === wheelStart) { i = wheelEnd; j = i * 3; if (i >= count) break; }
      point.fromArray(local, j);
      if (this.transformed) point.applyMatrix4(inCar).toArray(local, j);
      this.bounds.expandByPoint(point);
    }
    const indices = this.original.index?.array ?? Uint16Array.from({ length: count }, (_, i) => i);
    const parents: number[] = [];
    const indexed = this.original.index !== null;
    let bodyEnd = indices.length;
    // Merged cars place the wheel parts after the body. Their original triangles are copied as a block.
    if (this.wheels) {
      for (let i = 0; i < indices.length; i += 3) {
        if (indices[i] >= wheelStart) { bodyEnd = i; break; }
      }
    }
    const first = splitEdges(local, indices.subarray(0, bodyEnd), this.refined, parents, indexed ? 0.36 : 0.48);
    // Broad door panels need more samples for the bowl, even on an indexed kit car.
    const sideRegions = this.refined.filter((region) => region.side);
    const second = splitEdges(local, first, indexed ? sideRegions : this.refined, parents, indexed ? 0.24 : 0.37);
    const refined = indexed ? second : splitEdges(local, second, sideRegions, parents, 0.24);
    const vertices = local.length / 3;
    for (const name in this.original.attributes) {
      const source = this.original.getAttribute(name);
      const size = source.itemSize, array = new Float32Array(vertices * size);
      array.set(source.array);
      for (let v = count; v < vertices; v++) {
        const j = v * size, q = (v - count) * 2, a = parents[q] * size, b = parents[q + 1] * size;
        for (let i = 0; i < size; i++) array[j + i] = (array[a + i] + array[b + i]) * 0.5;
      }
      const attr = new THREE.BufferAttribute(array, size);
      if (name === "position" || name === "normal") attr.setUsage(THREE.DynamicDrawUsage);
      this.geometry.setAttribute(name, attr);
    }
    const index = new Uint16Array(refined.length + indices.length - bodyEnd);
    index.set(refined);
    index.set(indices.subarray(bodyEnd), refined.length);
    this.bodyIndex = index.subarray(0, refined.length);
    this.geometry.setIndex(new THREE.BufferAttribute(index, 1));
    this.basePosition = (this.geometry.getAttribute("position").array as Float32Array).slice();
    this.baseNormal = (this.geometry.getAttribute("normal").array as Float32Array).slice();
    this.damagedPosition = this.basePosition.slice();
    this.damagedNormal = this.baseNormal.slice();
    this.moved = new Uint8Array(vertices);
    this.changedNormals = new Uint8Array(vertices);
    if (!this.original.boundingSphere) this.original.computeBoundingSphere();
    this.geometry.boundingSphere = this.original.boundingSphere!.clone();
    this.geometry.boundingSphere.radius += 0.3;
    const rest = this.measureLamps();
    this.geometry.setAttribute("crashRest", new THREE.BufferAttribute(rest, 4));
    this.material = createCrashMaterial(this.originalMaterial, this.paint);
    this.outline = mesh.children.find((child): child is CarMesh => (child as CarMesh).geometry === this.original);
    mesh.geometry = this.geometry;
    mesh.material = this.material;
    if (this.outline) this.outline.geometry = this.geometry;
  }

  covers(dent: Dent) {
    const side = isSideDent(dent);
    return this.refined.some((r) => r.side === side && (dent.x - r.x) ** 2 + (dent.y - r.y) ** 2 + (dent.z - r.z) ** 2 < 0.12 ** 2);
  }

  private measureLamps() {
    const { min, max } = this.bounds;
    const local = this.local, rest = new Float32Array(local.length / 3 * 4);
    const uv = this.geometry.getAttribute("uv")?.array;
    const color = this.geometry.getAttribute("color").array;
    for (let i = 0; i < local.length / 3; i++) {
      const j = i * 3, a = i * 4, x = local[j], y = local[j + 1], z = local[j + 2], front = z > 0;
      rest[a] = x; rest[a + 1] = y; rest[a + 2] = z;
      if (wheelAt(this.wheels, i)) { rest[a + 3] = -1; continue; }
      if (z > max.z * 0.7 && y < 1.55) this.hoodHeight = Math.max(this.hoodHeight, y + 0.05);
      if (Math.abs(x) < max.x * 0.28 || Math.abs(z - (front ? max.z : min.z)) > 0.48 || y < 0.48 || y > 1.18) continue;
      if (uv) {
        const col = Math.floor(uv[2 * i] * 16), row = Math.floor(uv[2 * i + 1] * 16);
        if (col !== (front ? 3 : 5) || row < 12) continue;
      } else {
        const r = color[j], g = color[j + 1], b = color[j + 2];
        if (front ? r < 0.65 || g < 0.55 || r < b || g < b : r < 0.36 || g > r * 0.27 || b > r * 0.29) continue;
      }
      const id = (front ? 0 : 2) + Number(x > 0), lamp = this.lamps[id];
      rest[a + 3] = id + 1;
      lamp.minX = Math.min(lamp.minX, x); lamp.maxX = Math.max(lamp.maxX, x);
      lamp.minY = Math.min(lamp.minY, y); lamp.maxY = Math.max(lamp.maxY, y);
      lamp.z = front ? Math.max(lamp.z, z) : Math.min(lamp.z, z);
      lamp.count++;
    }
    for (let i = 0; i < this.lamps.length; i++) {
      const lamp = this.lamps[i], front = i < 2, left = i % 2 !== 0;
      if (lamp.count) {
        this.paint.lenses.value[i].set((lamp.minX + lamp.maxX) * 0.5, (lamp.minY + lamp.maxY) * 0.5,
          Math.max(0.03, lamp.maxX - lamp.minX), Math.max(0.03, lamp.maxY - lamp.minY));
      } else {
        this.paint.lenses.value[i].set((left ? max.x : min.x) * 0.71, 0.72, 0.12, 0.12);
      }
      lamp.z = lamp.count ? lamp.z + (front ? 0.018 : -0.018) : front ? max.z + 0.01 : min.z - 0.01;
    }
    return rest;
  }

  rebuild(dents: readonly Dent[]) {
    const { min, max } = this.bounds;
    const front = this.bumper(dents, "front");
    const rear = this.bumper(dents, "back");
    this.hanging = !!(front || rear);
    this.paint.hitCount.value = dents.length;
    for (let i = 0; i < dents.length; i++) {
      const { x, y, z, k, nx, nz, scrape } = dents[i];
      this.paint.centers.value[i].set(x, y, z, k);
      this.paint.planes.value[i].set(nx, nz, scrape ?? 0);
    }
    let crackedNow = false;
    for (let i = 0; i < this.lamps.length; i++) {
      const lamp = this.lamps[i], lens = this.paint.lenses.value[i];
      const close = lamp.count > 0 && dents.some((hit) => hit.k >= 0.35 && Math.hypot(lens.x - hit.x, (lamp.z - hit.z) * 0.8) < 0.41);
      crackedNow ||= close && !lamp.cracked;
      lamp.cracked = close;
      this.paint.broken.value[i] = Number(close);
    }

    const positions = this.damagedPosition, local = this.local;
    const regions = dents.map(dentRegion);
    positions.set(this.basePosition);
    this.moved.fill(0);
    this.changedNormals.fill(0);
    const wheelStart = this.wheels?.[0] ?? -1, wheelEnd = this.wheels?.[1] ?? -1;
    for (let j = 0, i = 0; j < local.length; j += 3, i++) {
      if (i === wheelStart) { i = wheelEnd; j = i * 3; if (j >= local.length) break; }
      const x = local[j], y = local[j + 1], z = local[j + 2];
      const end = z > 0 ? max.z : min.z, hit = z > 0 ? front : rear;
      const bumper = hit && Math.abs(z - end) < 0.35 && y < 0.53;
      if (!bumper && !nearDent(regions, x, x, y, y, z, z)) continue;
      this.dentPoint(dents, x, y, z);
      if (bumper) {
        const taper = THREE.MathUtils.smoothstep(Math.abs(z), Math.abs(end) - 0.35, Math.abs(end) - 0.14)
          * (1 - THREE.MathUtils.smoothstep(y, 0.42, 0.53));
        const sign = hit.x < 0 ? -1 : 1, pivot = sign < 0 ? max.x : min.x;
        const angle = -sign * 0.23 * taper, span = x - pivot, rise = y - 0.35;
        this.point.y += Math.max(Math.min(0, 0.12 - y), span * Math.sin(angle) + rise * (Math.cos(angle) - 1));
        this.point.x += span * (Math.cos(angle) - 1) - rise * Math.sin(angle);
      }
      if (this.point.x === x && this.point.y === y && this.point.z === z) continue;
      this.moved[i] = 1;
      if (this.transformed) this.point.applyMatrix4(this.inMesh);
      this.point.toArray(positions, j);
    }
    // Anchor the glowing lens on the deformed surface as well as on the undamaged one.
    for (let i = 0; i < this.lamps.length; i++) {
      const lamp = this.lamps[i], lens = this.paint.lenses.value[i];
      this.dentPoint(dents, lens.x + lens.z * (i % 2 ? 0.16 : -0.16), lens.y, lamp.z);
      lamp.x = this.point.x; lamp.y = this.point.y;
      // Keep the measured outer lens plane for the next rebuild.
      this.lampDepth[i] = this.point.z;
    }
    this.recomputeNormals();
    this.show(1);
    return crackedNow;
  }

  readonly lampDepth = new Float32Array(4);

  private dentPoint(dents: readonly Dent[], x: number, y: number, z: number) {
    let dx = 0, depth = 0, dz = 0, door = 0;
    for (const hit of dents) {
      const dent = dentFalloff(hit, x, y, z) * hit.depth;
      if (isSideDent(hit)) door += Math.sign(hit.nx) * dent;
      else { dx += hit.nx * dent; dz += hit.nz * dent; depth += dent; }
    }
    if (!depth) { this.point.set(x + door, y, z); return; }
    const wrinkle = Math.sin(x * 34 + y * 31 - z * 43) * 0.12;
    const crumple = 0.88 + wrinkle;
    this.point.set(x + door + dx * crumple, y + depth * crumple * wrinkle, z + dz * crumple);
  }

  private recomputeNormals() {
    const index = this.bodyIndex, normals = this.damagedNormal, positions = this.damagedPosition;
    const changed = this.changedNormals;
    normals.set(this.baseNormal);
    for (let i = 0; i < index.length; i += 3) {
      const a = index[i], b = index[i + 1], c = index[i + 2];
      if (this.moved[a] || this.moved[b] || this.moved[c]) changed[a] = changed[b] = changed[c] = 1;
    }
    for (let i = 0; i < changed.length; i++) if (changed[i]) normals[i * 3] = normals[i * 3 + 1] = normals[i * 3 + 2] = 0;
    for (let i = 0; i < index.length; i += 3) {
      const a = index[i], b = index[i + 1], c = index[i + 2];
      if (!changed[a] && !changed[b] && !changed[c]) continue;
      const j = a * 3, k = b * 3, l = c * 3;
      const abx = positions[k] - positions[j], aby = positions[k + 1] - positions[j + 1], abz = positions[k + 2] - positions[j + 2];
      const acx = positions[l] - positions[j], acy = positions[l + 1] - positions[j + 1], acz = positions[l + 2] - positions[j + 2];
      const nx = aby * acz - abz * acy, ny = abz * acx - abx * acz, nz = abx * acy - aby * acx;
      if (changed[a]) { normals[j] += nx; normals[j + 1] += ny; normals[j + 2] += nz; }
      if (changed[b]) { normals[k] += nx; normals[k + 1] += ny; normals[k + 2] += nz; }
      if (changed[c]) { normals[l] += nx; normals[l + 1] += ny; normals[l + 2] += nz; }
    }
    for (let i = 0; i < changed.length; i++) if (changed[i]) this.point.fromArray(normals, i * 3).normalize().toArray(normals, i * 3);
  }

  private bumper(dents: readonly Dent[], side: CrashSide) {
    let strongest: Dent | undefined;
    for (const hit of dents) if (hit.side === side && hit.k >= 0.6 && (!strongest || hit.k >= strongest.k)) strongest = hit;
    return strongest;
  }

  show(amount: number) {
    this.paint.fade.value = amount;
    this.blend("position", this.basePosition, this.damagedPosition, amount);
    this.blend("normal", this.baseNormal, this.damagedNormal, amount);
  }

  private blend(name: string, base: Float32Array, damaged: Float32Array, amount: number) {
    const attr = this.geometry.getAttribute(name), array = attr.array as Float32Array;
    if (amount === 1) array.set(damaged);
    else for (let i = 0; i < array.length; i++) array[i] = base[i] + (damaged[i] - base[i]) * amount;
    attr.needsUpdate = true;
  }

  restore() {
    this.mesh.geometry = this.original;
    this.mesh.material = this.originalMaterial;
    if (this.outline) this.outline.geometry = this.original;
    this.geometry.dispose();
    this.material.dispose();
  }
}
