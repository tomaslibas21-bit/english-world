// The shore: where the sand goes under the sea, and wading in. One description of the beach's slope shared by the
// ground's mesh (town.ts), the sea's shader (the foam follows the waterline, the sand shows through the shallows) and
// the player (the floor under the water, how deep it is, where wading stops). Both towns: the colours are each sea's own.
import * as THREE from "three";
import { SEA_Z } from "./world/layout";

/** The sea's surface at rest (the sea mesh's height) and how far its swell lifts and drops it (town.ts's vertex shader). */
export const SEA_LEVEL = -0.25;
/** The sand starts down at `top` (give or take the shoreline's wobble), is `drop` under at the ground's edge, and goes
 *  on down to the wading limit. */
export const SHORE = { top: SEA_Z + 1.9, edge: SEA_Z - 2, drop: 0.56, limit: SEA_Z - 5.4, deep: 0.4 };
/** The slope's length (m): short enough that the sand is `drop` under by the ground's edge wherever the shoreline's
 *  wobble puts its start (the edge of the ground's mesh is then always under water, whatever the swell). */
const RUN = SHORE.top - SHORE.edge - 0.6;
/** The seabed's fall beyond the slope (m per m): `deep` under the surface at the limit. */
const BED = (-SEA_LEVEL + SHORE.deep - SHORE.drop) / (SHORE.top - RUN - SHORE.limit);

/** The shoreline's wobble: how far the slope's start moves up or down the beach along x (m). */
export const shoreWobble = (x: number) => 0.4 * Math.sin(x * 0.09) + 0.2 * Math.sin(x * 0.23 + 1.3);

/** The sand's height at (x, z): 0 up the beach, sloping under the sea, and on down as the seabed. */
export function sandY(x: number, z: number) {
  const t = (SHORE.top + shoreWobble(x) - z) / RUN;
  if (t <= 0) return 0;
  if (t < 1) return -SHORE.drop * t * t * (3 - 2 * t) * (0.5 + 0.5 * t);
  return -SHORE.drop - (t - 1) * RUN * BED;
}

/** Floors built out over the shore (a pier's boardwalk and deck, a terrace on the sand): one walks on them, not on the
 *  sand that slopes away under them. The town lists them as it builds them (town.ts). */
export const DECKS: { x0: number; x1: number; z0: number; z1: number; y?: number }[] = [];

/** Beyond the wading limit the bed falls away to swimming depth (what the sea's shader draws stays `sandY`: the
 *  foam and the shallows look as they did; this is what a swimmer's feet and the seabed under a diver follow): `drop` m
 *  more over the first `run` m, then gently on down to `floor`. */
export const DEEP = { run: 7, drop: 2.2, slope: 0.03, floor: -4.4 };
/** The seabed at (x, z): the sand as far as one wades, then down into deep water. */
export function seaBedY(x: number, z: number) {
  const s = sandY(x, z), d = SHORE.limit - z;
  if (d <= 0) return s;
  const t = Math.min(1, d / DEEP.run);
  return Math.max(DEEP.floor, s - DEEP.drop * t * t * (3 - 2 * t) - DEEP.slope * d);
}

/** Water away from the sea that one can swim in (a cenote): round, `r` across at the surface `y`, its bed going down
 *  from the rim to `depth` m in the middle; `ramp`: where one walks in (a point on its rim: the bed there is a ramp of
 *  steps `rampW` wide). The town lists them as it builds them, like DECKS. */
export interface Pool { x: number; z: number; r: number; y: number; depth: number; ramp?: { x: number; z: number; w: number } }
export interface RectPool {
  bounds: { x0: number; x1: number; z0: number; z1: number };
  y: number;
  bed(x: number, z: number): number;
}
export const POOLS: (Pool | RectPool)[] = [];
/** The pool at (x, z), if any. */
export function poolAt(x: number, z: number): Pool | RectPool | null {
  for (const p of POOLS) {
    if ("bounds" in p) {
      const { x0, x1, z0, z1 } = p.bounds;
      if (x > x0 && x < x1 && z > z0 && z < z1) return p;
    } else if ((x - p.x) ** 2 + (z - p.z) ** 2 < p.r * p.r) return p;
  }
  return null;
}
/** A pool's bed at (x, z) inside it: a step down at the rim, then a bowl. */
export function poolBedY(p: Pool | RectPool, x: number, z: number) {
  if ("bed" in p) return p.bed(x, z);
  const t = Math.min(1, Math.hypot(x - p.x, z - p.z) / p.r), k = 1 - t * t;
  return p.y - 0.45 - (p.depth - 0.45) * k * (2 - k);
}

/** Floors that are not level (the way down into a pool: steps up onto its deck and down into the water): inside its
 *  rectangle, `y(x, z)` is what is underfoot. The town lists them as it builds them, like DECKS. */
export const FLOORS: { x0: number; x1: number; z0: number; z1: number; y(x: number, z: number): number }[] = [];

/** What is underfoot at (x, z) by the water: a deck's boards (as high as they lie, `y`), a pool's steps and its bed,
 *  else the sand and, out past the wading limit, the seabed. */
export function floorY(x: number, z: number) {
  for (const d of DECKS) if (x > d.x0 && x < d.x1 && z > d.z0 && z < d.z1) return d.y ?? 0;
  for (const f of FLOORS) if (x > f.x0 && x < f.x1 && z > f.z0 && z < f.z1) return f.y(x, z);
  if (POOLS.length) { const p = poolAt(x, z); if (p) return poolBedY(p, x, z); }
  return z < SHORE.limit ? seaBedY(x, z) : sandY(x, z);
}

/** The water's surface over (x, z) at time `t`, or null where there is none (dry land, a deck's boards count as the
 *  sea under them): the sea with its swell, a pool's still water. */
export function waterY(x: number, z: number, t: number): number | null {
  if (POOLS.length) { const p = poolAt(x, z); if (p) return p.y; }
  return z < SHORE.top + 1.5 ? SEA_LEVEL + swell(x, z, t) : null;
}

/** The same in the sea's shaders: `float sandY(vec2 p)` (p = world x, z). */
export const SAND_GLSL = `
  float sandY(vec2 p) {
    float t = (${(SHORE.top).toFixed(3)} + 0.4 * sin(p.x * 0.09) + 0.2 * sin(p.x * 0.23 + 1.3) - p.y) / ${RUN.toFixed(3)};
    if (t <= 0.0) return 0.0;
    if (t < 1.0) return -${SHORE.drop.toFixed(3)} * t * t * (3.0 - 2.0 * t) * (0.5 + 0.5 * t);
    return -${SHORE.drop.toFixed(3)} - (t - 1.0) * ${(RUN * BED).toFixed(4)};
  }`;

/** The sea's swell (m) at (x, z) and time `t`, as the sea mesh's vertex shader moves it. */
export const SWELL_GLSL = `sin(w.x*0.08 + uTime*0.9)*0.12 + cos(w.z*0.11 + uTime*0.7)*0.1 + sin(w.x*0.05 - uTime*1.9)*0.045`;
export const swell = (x: number, z: number, t: number) => Math.sin(x * 0.08 + t * 0.9) * 0.12 + Math.cos(z * 0.11 + t * 0.7) * 0.1 + Math.sin(x * 0.05 - t * 1.9) * 0.045;

/** The foam and the see-through shallows for a sea's fragment shader: needs `vW` (the surface's world position) and
 *  `uTime`; `c` is the water's colour so far. The sand shows through where the water is a hand deep, a bright lacy line
 *  runs along the waterline as it moves, and thin foam trails behind it. */
export const SHORE_GLSL = (foam = "vec3(0.985, 0.99, 0.975)", wet = "vec3(0.78, 0.71, 0.56)") => `
    {
      float depth = vW.y - sandY(vW.xz);
      float lace = sin(vW.x * 2.3 + sin(vW.z * 3.1 + uTime * 0.6) * 1.4) * sin(vW.z * 2.9 - uTime * 0.9 + sin(vW.x * 1.7) * 1.2);
      float bub = sin(vW.x * 7.0 + uTime * 1.3) * sin(vW.z * 8.0 - uTime * 1.1);
      c = mix(${wet}, c, smoothstep(0.0, 0.30, depth) * 0.82 + 0.18);
      float line = 1.0 - smoothstep(0.04, 0.12 + 0.05 * lace, depth);
      float wash = (1.0 - smoothstep(0.08, 0.36 + 0.1 * lace, depth)) * (0.5 + 0.5 * smoothstep(-0.5, 0.5, lace + bub * 0.4));
      float far = (1.0 - smoothstep(0.3, 0.8, depth)) * smoothstep(0.45, 0.95, lace * bub + 0.35 * sin(vW.x * 0.6 + uTime * 0.5));
      c = mix(c, ${foam}, clamp(line * 0.97 + wash * 0.8 + far * 0.36, 0.0, 0.97));
    }`;

/** Swimming. With more than `depth` m of water over the bed one floats (back on one's feet under `out`), the chest
 *  `float` m (times one's height) over the feet at the surface; a calm stroke at `speed` m/s, `fast` with Shift or the
 *  stick at its edge; a dive takes one `dive` m under for at most `breath` s. */
export const SWIM = { depth: 0.95, out: 0.8, float: 1.2, speed: 2.5, fast: 3.6, dive: 1.9, breath: 10 };
/** How far out one swims or takes a boat: the bay (m; set from the town's bounds by the town as it is built). */
export const BAY = { x0: -106, x1: 176, z0: SEA_Z - 74 };
/** The bay's soft edge: the part of a step `d` (along one axis, from `v`) that goes out past `lim` fades to nothing
 *  over the last `band` m before it (`out`: −1 when the limit is a lower bound, +1 an upper one). No wall, no bounce. */
export function bayHold(v: number, d: number, lim: number, out: 1 | -1, band = 4) {
  if (d * out <= 0) return d;
  const k = THREE.MathUtils.clamp(((lim - v) * out) / band, 0, 1);
  return d * k * (2 - k);
}

/** The player in the shallows: how deep the water is at their feet, how much it slows them, and where it stops them. */
export class Wading {
  /** The water over the sand at the player's feet now (m; 0 on dry sand). */
  depth = 0;
  /** How much of their pace is left at this depth (1 on dry sand; about half at the limit). */
  static pace(depth: number) { return 1 - 0.5 * THREE.MathUtils.smoothstep(depth, 0.08, SHORE.deep); }
  /** The soft limit for those who don't swim (the audit's walker): the seaward part of a step fades away over the last
   *  metre and a half, and nothing gets past `SHORE.limit`. `dz`: the step along z about to be taken (negative: out to
   *  sea). The player wades on from there into deep water and swims (SWIM). */
  static hold(z: number, dz: number) {
    if (dz >= 0) return dz;
    const k = THREE.MathUtils.clamp((z - SHORE.limit) / 1.5, 0, 1);
    return dz * k * (2 - k);
  }
}

export type CarDropBarrier = (x0: number, z0: number, x1: number, z1: number) => boolean;

/** What the water does round someone wading: rings spreading at their legs and drops thrown up by their steps. Two
 *  small meshes, in the picture only while someone is in the water. */
export class Splashes {
  group = new THREE.Group();
  private ring: THREE.Mesh;
  private ringU = { uT: { value: 0 }, uMove: { value: 0 }, uOpacity: { value: 1 }, uFoam: { value: new THREE.Color("#fbfdf9") } };
  private drops: THREE.Points;
  private pos: Float32Array;
  private vel: Float32Array;
  private life: Float32Array;
  private carKinds?: Uint8Array;
  private carBarrier?: CarDropBarrier;
  private carLive = 0;
  private next = 0;
  private static readonly N = 420;
  private static readonly CAR_MAX = 96;

  constructor() {
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, uniforms: this.ringU,
      vertexShader: "varying vec2 vP; void main(){ vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      // two rings born at the legs, spreading and fading, brighter while moving; a little foam right at the legs
      fragmentShader: `varying vec2 vP; uniform float uT; uniform float uMove; uniform float uOpacity; uniform vec3 uFoam;
        void main(){
          float r = length(vP), a = 0.0;
          for (int i = 0; i < 2; i++) {
            float ph = fract(uT * 0.55 + float(i) * 0.5);
            float rr = 0.32 + ph * 1.05;
            a += (1.0 - smoothstep(0.0, 0.05 + ph * 0.05, abs(r - rr))) * (1.0 - ph) * (1.0 - ph);
          }
          float wob = 0.5 + 0.5 * sin(atan(vP.y, vP.x) * 7.0 + uT * 3.0);
          a = a * (0.45 + 0.45 * uMove) + (1.0 - smoothstep(0.22, 0.4, r)) * (0.35 + 0.4 * uMove) * (0.6 + 0.4 * wob);
          gl_FragColor = vec4(uFoam, clamp(a, 0.0, 0.9) * uOpacity);
        }`,
    });
    this.ring = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2).rotateX(-Math.PI / 2), mat);
    this.ring.name = "water-ring";
    this.ring.visible = false;
    this.ring.renderOrder = 3;
    this.ring.frustumCulled = false;
    const N = Splashes.N;
    this.pos = new Float32Array(N * 3).fill(-999);
    this.vel = new Float32Array(N * 3);
    this.life = new Float32Array(N);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(this.pos, 3));
    g.setDrawRange(0, 0);
    // A rounded bead with a sunlit shoulder. Writing its depth lets the clear pool
    // surface tint submerged drops while airborne spray stays bright.
    const beads = new THREE.PointsMaterial({ color: "#f4fbff", size: 0.11, sizeAttenuation: true });
    beads.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace("#include <color_fragment>", `
        #include <color_fragment>
        vec2 bead = (gl_PointCoord - 0.5) * vec2(2.24, 2.0);
        if (dot(bead, bead) > 1.0) discard;
        diffuseColor.rgb *= mix(vec3(0.38, 0.77, 0.86), vec3(1.0),
          1.0 - smoothstep(0.2, 1.35, length(bead + vec2(0.3, 0.4))));
      `);
    };
    this.drops = new THREE.Points(g, beads);
    this.drops.name = "water-drops";
    this.drops.visible = false;
    this.drops.frustumCulled = false;
    this.group.add(this.ring, this.drops);
    this.group.visible = false;
  }

  copyRing(from: Splashes) {
    this.ring.position.copy(from.ring.position);
    this.ring.scale.copy(from.ring.scale);
    this.ring.visible = from.group.visible && from.ring.visible;
    this.ringU.uT.value = from.ringU.uT.value;
    this.ringU.uMove.value = from.ringU.uMove.value;
    this.ringU.uOpacity.value = from.ringU.uOpacity.value;
    this.group.visible = this.ring.visible;
    this.showDrops(Splashes.N, -1);
  }

  clearDrops() {
    this.life.fill(0);
    this.pos.fill(-999);
    this.carKinds?.fill(0);
    this.carLive = 0;
    this.carBarrier = undefined;
    this.showDrops(Splashes.N, -1);
    this.group.visible = this.ring.visible;
  }

  boatRing(dt: number, time: number, { x, z, heading, pace, slip }: {
    x: number; z: number; heading: number; pace: number; slip: number;
  }, { opacity = 1, offset, match = false }: {
    opacity?: number; offset?: { x: number; z: number }; match?: boolean;
  } = {}) {
    const move = Math.min(1, pace / 6);
    if (match) this.ringU.uMove.value = move;
    this.update(dt, time, { x: x - Math.sin(heading) * 0.6, z: z - Math.cos(heading) * 0.6,
      y: (waterY(x + (offset?.x ?? 0), z + (offset?.z ?? 0), time) ?? SEA_LEVEL) + 0.02 }, move,
      2.6 + Math.min(1.4, Math.abs(slip) * 0.3), opacity);
  }

  /** Drops thrown up at (x, z) from the water's surface `y`, more of them the harder the step (`k` 0–1). */
  burst(x: number, y: number, z: number, dx: number, dz: number, k = 0.6) {
    const n = Math.round(4 + k * 9);
    for (let i = 0; i < n; i++) {
      const j = this.slot(0);
      const a = Math.random() * Math.PI * 2, s = 0.5 + Math.random() * 1.1;
      this.pos[j * 3] = x + Math.cos(a) * 0.12; this.pos[j * 3 + 1] = y + 0.03; this.pos[j * 3 + 2] = z + Math.sin(a) * 0.12;
      this.vel[j * 3] = Math.cos(a) * s + dx * 1.2; this.vel[j * 3 + 1] = (1.6 + Math.random() * 1.9) * (0.6 + 0.6 * k); this.vel[j * 3 + 2] = Math.sin(a) * s + dz * 1.2;
      this.life[j] = 1;
    }
  }

  /** A sheet of spray thrown out sideways along (dx, dz) from (x, z): a boat's side in a slide, its bow slapping
   *  down (`k` 0–1: how much, how far). */
  fan(x: number, y: number, z: number, dx: number, dz: number, k = 0.6) {
    this.throwFan(x, y, z, dx, dz, k, 0);
  }

  carFan(x: number, y: number, z: number, dx: number, dz: number, k: number, barrier?: CarDropBarrier) {
    this.carBarrier = barrier;
    return this.throwFan(x, y, z, dx, dz, k, 1);
  }

  private throwFan(x: number, y: number, z: number, dx: number, dz: number, k: number, kind: number) {
    const n = Math.round(5 + k * 9);
    for (let i = 0; i < n; i++) {
      const j = this.slot(kind);
      if (j < 0) return i;
      const out = (2.2 + Math.random() * 3.6) * (0.6 + 0.6 * k), along = (Math.random() - 0.5) * 1.6;
      this.pos[j * 3] = kind ? x : x - dz * along * 0.4;
      this.pos[j * 3 + 1] = y + 0.05;
      this.pos[j * 3 + 2] = kind ? z : z + dx * along * 0.4;
      this.vel[j * 3] = dx * out - dz * along; this.vel[j * 3 + 1] = (1.8 + Math.random() * 2.6) * (0.6 + 0.6 * k); this.vel[j * 3 + 2] = dz * out + dx * along;
      this.life[j] = 1;
    }
    return n;
  }

  carDrop(x: number, y: number, z: number, vx: number, vz: number, barrier?: CarDropBarrier) {
    this.carBarrier = barrier;
    const j = this.slot(2);
    if (j < 0) return 0;
    const i = j * 3;
    this.pos[i] = x; this.pos[i + 1] = y; this.pos[i + 2] = z;
    this.vel[i] = vx; this.vel[i + 1] = -1.1; this.vel[i + 2] = vz;
    this.life[j] = 1;
    return 1;
  }

  private slot(kind: number) {
    const j = this.next, old = this.carKinds?.[j] ?? 0;
    if (kind && this.carLive >= Splashes.CAR_MAX && !old) return -1;
    this.next = (j + 1) % Splashes.N;
    if (kind || old) {
      this.carKinds ??= new Uint8Array(Splashes.N);
      this.carKinds[j] = kind;
      this.carLive += Number(kind !== 0) - Number(old !== 0);
    }
    return j;
  }

  private retire(j: number, kind: number) {
    this.life[j] = 0;
    this.pos[j * 3 + 1] = -999;
    if (kind) { this.carKinds![j] = 0; this.carLive--; }
  }

  clearCarDrops() {
    this.carBarrier = undefined;
    if (!this.carLive) return;
    let first = Splashes.N, last = -1;
    for (let j = 0; j < Splashes.N; j++) {
      const kind = this.carKinds![j];
      if (kind) this.retire(j, kind);
      else if (this.life[j] > 0) { first = Math.min(first, j); last = j; }
    }
    this.showDrops(first, last);
    this.group.visible = this.drops.visible || this.ring.visible;
  }

  inspectCarDrops() {
    if (!import.meta.env.DEV) return;
    const { start, count } = this.drops.geometry.drawRange, particles = [];
    let totalDrops = 0, drainLive = 0;
    for (let j = 0; j < Splashes.N; j++) {
      if (this.life[j] <= 0) continue;
      totalDrops++;
      const kind = this.carKinds?.[j];
      if (!kind) continue;
      if (kind === 2) drainLive++;
      const i = j * 3;
      particles.push({
        slot: j, kind, x: this.pos[i], y: this.pos[i + 1], z: this.pos[i + 2],
        vx: this.vel[i], vy: this.vel[i + 1], vz: this.vel[i + 2],
      });
    }
    return {
      carDrops: this.carLive, drainLive, particles, totalDrops, capacity: Splashes.N, pointsId: this.drops.uuid,
      pointsVisible: this.carLive > 0 && this.group.visible && this.drops.visible && count > 0,
      pointDrawStart: start, pointDrawCount: count, ringVisible: this.group.visible && this.ring.visible,
    };
  }

  private showDrops(first: number, last: number) {
    const alive = last >= first;
    if (!alive && !this.drops.visible) return;
    (this.drops.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    this.drops.geometry.setDrawRange(alive ? first : 0, alive ? last - first + 1 : 0);
    this.drops.visible = alive;
  }

  /** `at`: where the wader's legs meet the water (null: nobody in it); `move` 0–1: how fast they wade; `size`: how
   *  wide the rings spread (1: a person's; a boat's wake is wider). */
  update(dt: number, t: number, at: { x: number; y: number; z: number } | null, move: number, size = 1, opacity = 1) {
    let first = Splashes.N, last = -1;
    for (let j = 0; j < Splashes.N; j++) {
      if (this.life[j] <= 0) continue;
      const i = j * 3, kind = this.carKinds?.[j] ?? 0;
      const x = this.pos[i], z = this.pos[i + 2];
      this.vel[i + 1] -= 9.5 * dt;
      this.pos[i] += this.vel[i] * dt;
      this.pos[i + 1] += this.vel[i + 1] * dt;
      this.pos[i + 2] += this.vel[i + 2] * dt;
      this.life[j] -= dt * 1.5;
      const px = this.pos[i], py = this.pos[i + 1], pz = this.pos[i + 2], falling = this.vel[i + 1] < 0;
      const landed = kind ? py <= floorY(px, pz) || (falling && py <= (waterY(px, pz, t) ?? -Infinity))
        || this.carBarrier?.(x, z, px, pz) : falling && py < SEA_LEVEL - 0.25;
      if (this.life[j] <= 0 || landed) this.retire(j, kind);
      else { first = Math.min(first, j); last = j; }
    }
    this.showDrops(first, last);
    this.ring.visible = !!at && opacity > 0;
    this.ringU.uOpacity.value = opacity;
    if (at) {
      this.ring.position.set(at.x, at.y + 0.02, at.z);
      // (`size`: a boat's wake is the same rings, wider)
      this.ring.scale.setScalar(size);
      this.ringU.uT.value = t;
      this.ringU.uMove.value += (move - this.ringU.uMove.value) * Math.min(1, dt * 6);
    }
    this.group.visible = this.drops.visible || this.ring.visible;
  }
}
